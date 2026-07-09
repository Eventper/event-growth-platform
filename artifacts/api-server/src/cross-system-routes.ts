// ─────────────────────────────────────────────────────────────────────────────
// CROSS-SYSTEM ROUTES — Master Build Spec Parts A & B (Planning App side)
//
// Part A (Project ↔ Event Auto-Linking) — receiving endpoints called by
//   the Group Portal (Twin Trade Replit) when a project of type 'event_project'
//   is created/updated.
//
// Part B (Team Assignment & Invitation) — propagation endpoints that mirror
//   accepted project assignments onto the linked event team list.
//
// Auth:
//   Bearer token via `Authorization: Bearer <EP_CROSS_SYSTEM_KEY>` header,
//   shared with the Group Portal via Replit Secrets.
// ─────────────────────────────────────────────────────────────────────────────
import { type Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { authenticateToken } from "./auth";
import { notificationService } from "./notificationService";

function requireInternalReviewer(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!["admin", "planner", "manager"].includes(req.user.role)) {
    return res.status(403).json({ message: "Internal staff only" });
  }
  next();
}

function getCrossSystemKey(): string | null {
  const k = process.env.EP_CROSS_SYSTEM_KEY?.trim();
  return k && k.length >= 16 ? k : null;
}

function crossSystemAuth(req: any, res: any, next: any) {
  const expected = getCrossSystemKey();
  if (!expected) {
    return res.status(503).json({
      message: "Cross-system bridge not configured. Set EP_CROSS_SYSTEM_KEY (≥16 chars) in Replit Secrets on both sides.",
    });
  }
  const header = String(req.headers.authorization || "");
  const fallback = String(req.headers["x-alli-sync-key"] || "");
  const provided = (header ? header.replace(/^Bearer\s+/i, "").trim() : fallback.trim());
  if (!provided || provided !== expected) {
    return res.status(401).json({ message: "Invalid or missing cross-system key" });
  }
  next();
}

function getCrossSystemCaller(req: any) {
  return {
    key: String(req.headers.authorization || req.headers["x-alli-sync-key"] || "").replace(/^Bearer\s+/i, "").trim(),
    projectId: String(req.body?.parent_project_id || ""),
  };
}

async function ensureEngagementBacklinkColumns() {
  await db.execute(sql`ALTER TABLE IF EXISTS client_engagements ADD COLUMN IF NOT EXISTS parent_project_id TEXT UNIQUE`);
  await db.execute(sql`ALTER TABLE IF EXISTS client_engagements ADD COLUMN IF NOT EXISTS parent_project_url TEXT`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS client_engagements (
    id TEXT PRIMARY KEY,
    parent_project_id TEXT UNIQUE,
    parent_project_url TEXT,
    name TEXT NOT NULL,
    client TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    contract_value NUMERIC,
    currency TEXT,
    engagement_lead_email TEXT,
    engagement_lead_name TEXT,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS client_engagements_parent_project_id_idx ON client_engagements(parent_project_id)`);
}

async function ensureTenderBacklinkColumns() {
  await db.execute(sql`ALTER TABLE IF EXISTS tenders ADD COLUMN IF NOT EXISTS parent_project_id TEXT UNIQUE`);
  await db.execute(sql`ALTER TABLE IF EXISTS tenders ADD COLUMN IF NOT EXISTS parent_project_url TEXT`);
  await db.execute(sql`ALTER TABLE IF EXISTS tenders ADD COLUMN IF NOT EXISTS name TEXT`);
  await db.execute(sql`ALTER TABLE IF EXISTS tenders ADD COLUMN IF NOT EXISTS client TEXT`);
  await db.execute(sql`ALTER TABLE IF EXISTS tenders ADD COLUMN IF NOT EXISTS tender_authority TEXT`);
  await db.execute(sql`ALTER TABLE IF EXISTS tenders ADD COLUMN IF NOT EXISTS submission_deadline DATE`);
  await db.execute(sql`ALTER TABLE IF EXISTS tenders ADD COLUMN IF NOT EXISTS contract_value NUMERIC`);
  await db.execute(sql`ALTER TABLE IF EXISTS tenders ADD COLUMN IF NOT EXISTS currency TEXT`);
  await db.execute(sql`ALTER TABLE IF EXISTS tenders ADD COLUMN IF NOT EXISTS bid_lead_email TEXT`);
  await db.execute(sql`ALTER TABLE IF EXISTS tenders ADD COLUMN IF NOT EXISTS bid_lead_name TEXT`);
  await db.execute(sql`ALTER TABLE IF EXISTS tenders ADD COLUMN IF NOT EXISTS description TEXT`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS tenders (
    id TEXT PRIMARY KEY,
    parent_project_id TEXT UNIQUE,
    parent_project_url TEXT,
    name TEXT,
    client TEXT,
    tender_authority TEXT,
    submission_deadline DATE,
    contract_value NUMERIC,
    currency TEXT,
    bid_lead_email TEXT,
    bid_lead_name TEXT,
    description TEXT,
    title TEXT NOT NULL,
    buyer TEXT,
    status TEXT DEFAULT 'drafting',
    notes TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS tenders_parent_project_id_idx ON tenders(parent_project_id)`);
}

async function ensureProjectLinkColumns() {
  await db.execute(sql`ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS linked_engagement_id TEXT`);
  await db.execute(sql`ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS linked_tender_id TEXT`);
}

async function ensureCrossSystemTables() {
  await ensureEngagementBacklinkColumns();
  await ensureTenderBacklinkColumns();
  await ensureProjectLinkColumns();
}

export async function registerCrossSystemRoutes(app: Express) {
  await ensureCrossSystemTables();
  // ── Schema ────────────────────────────────────────────────────────────────
  await db.execute(sql`CREATE TABLE IF NOT EXISTS cross_system_event_links (
    id SERIAL PRIMARY KEY,
    parent_project_id TEXT NOT NULL UNIQUE,
    parent_project_name TEXT NOT NULL,
    parent_project_url TEXT,
    event_name TEXT NOT NULL,
    event_date DATE,
    event_type TEXT,
    expected_attendance INTEGER,
    budget_total NUMERIC(12,2),
    budget_currency TEXT DEFAULT 'GBP',
    client_name TEXT,
    country TEXT,
    status TEXT NOT NULL DEFAULT 'planning',
    last_project_payload JSONB,
    last_event_payload JSONB,
    linked_at TIMESTAMP DEFAULT NOW(),
    last_synced_at TIMESTAMP DEFAULT NOW(),
    last_synced_direction TEXT
  )`);

  await db.execute(sql`CREATE TABLE IF NOT EXISTS cross_system_event_team (
    id SERIAL PRIMARY KEY,
    link_id INTEGER NOT NULL REFERENCES cross_system_event_links(id) ON DELETE CASCADE,
    portal_user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    project_role TEXT NOT NULL,
    company_role TEXT,
    permission_tier TEXT,
    country TEXT,
    invited_at TIMESTAMP,
    accepted_at TIMESTAMP,
    declined_at TIMESTAMP,
    removed_at TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pending',
    last_synced_at TIMESTAMP DEFAULT NOW()
  )`);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_xsys_team_link ON cross_system_event_team(link_id)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_xsys_team_link_user ON cross_system_event_team(link_id, portal_user_id)`);

  // Idempotent log of every sync received (audit + future reconciliation)
  await db.execute(sql`CREATE TABLE IF NOT EXISTS cross_system_sync_log (
    id SERIAL PRIMARY KEY,
    parent_project_id TEXT,
    link_id INTEGER,
    direction TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    payload JSONB,
    received_at TIMESTAMP DEFAULT NOW()
  )`);

  // ── Part A.1: receive event creation from a project ──────────────────────
  // POST /api/events/create-from-project   (spec-aligned path)
  app.post("/api/events/create-from-project", crossSystemAuth, async (req: any, res) => {
    try {
      const {
        parent_project_id, parent_project_name, parent_project_url,
        event_name, event_date, event_type, expected_attendance,
        budget_total, budget_currency, client_name, country, status,
      } = req.body || {};

      if (!parent_project_id || !parent_project_name || !event_name) {
        return res.status(400).json({ message: "parent_project_id, parent_project_name and event_name are required" });
      }

      // True DB-level idempotency: single statement with ON CONFLICT — race-safe
      const inserted = await db.execute(sql`
        INSERT INTO cross_system_event_links (
          parent_project_id, parent_project_name, parent_project_url,
          event_name, event_date, event_type, expected_attendance,
          budget_total, budget_currency, client_name, country, status,
          last_project_payload, last_synced_direction
        ) VALUES (
          ${parent_project_id}, ${parent_project_name}, ${parent_project_url || null},
          ${event_name}, ${event_date || null}, ${event_type || null}, ${expected_attendance || null},
          ${budget_total || null}, ${budget_currency || 'GBP'}, ${client_name || null}, ${country || null},
          ${status || 'planning'},
          ${JSON.stringify(req.body)}::jsonb, 'project_to_event'
        )
        ON CONFLICT (parent_project_id) DO UPDATE
          SET last_synced_at = NOW()  -- touch to surface the existing row via RETURNING
        RETURNING id, linked_at, (xmax = 0) AS inserted_now
      `);
      const row: any = inserted.rows[0];

      if (!row.inserted_now) {
        return res.json({ success: true, alreadyLinked: true, event_id: row.id, linked_at: row.linked_at });
      }

      await db.execute(sql`INSERT INTO cross_system_sync_log
        (parent_project_id, link_id, direction, endpoint, payload)
        VALUES (${parent_project_id}, ${row.id}, 'inbound', '/api/events/create-from-project', ${JSON.stringify(req.body)}::jsonb)`);

      return res.json({
        success: true,
        event_id: row.id,
        linked_at: row.linked_at,
        event_url: `https://eventperfekt.com/admin/cross-system/event/${row.id}`,
      });
    } catch (err: any) {
      console.error("[cross-system create-from-project]", err);
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/client-engagements/create-from-project", crossSystemAuth, async (req: any, res) => {
    try {
      const body = req.body || {};
      const { parent_project_id, parent_project_url, name, client, status } = body;
      if (!parent_project_id || !name || !client) {
        return res.status(400).json({ message: "parent_project_id, name and client are required" });
      }
      const existing = await db.execute(sql`SELECT * FROM client_engagements WHERE parent_project_id = ${String(parent_project_id)} LIMIT 1`);
      const engagementUrlBase = "https://eventperfekt.net/client-engagements";
      if (existing.rows.length) {
        const row: any = existing.rows[0];
        const engagementId = String(row.engagement_id || row.id);
        return res.status(200).json({
          engagement_id: engagementId,
          engagement_url: `${engagementUrlBase}/${engagementId}`,
          status: row.status || status || "active",
        });
      }
      const inserted = await db.execute(sql`
        INSERT INTO client_engagements (parent_project_id, parent_project_url, name, client, start_date, end_date, contract_value, currency, engagement_lead_email, engagement_lead_name, description, status)
        VALUES (${String(parent_project_id)}, ${parent_project_url || null}, ${name}, ${client}, ${body.start_date || null}, ${body.end_date || null}, ${body.contract_value || null}, ${body.currency || "GBP"}, ${body.engagement_lead_email || null}, ${body.engagement_lead_name || null}, ${body.description || null}, ${status || "active"})
        RETURNING *
      `);
      const row: any = inserted.rows[0];
      await db.execute(sql`
        UPDATE projects
        SET linked_engagement_id = ${String(row.engagement_id || row.id)},
            updated_at = NOW()
        WHERE id = ${String(parent_project_id)}
      `).catch(() => {});
      try {
        await notificationService.sendNotification({
          userId: "planner-dashboard",
          title: "New client engagement linked",
          message: `${name} was linked from project ${parent_project_id}.`,
          actionUrl: `/client-engagements/${row.engagement_id || row.id}`,
        } as any);
      } catch {}
      return res.status(201).json({
        engagement_id: String(row.engagement_id || row.id),
        engagement_url: `${engagementUrlBase}/${String(row.engagement_id || row.id)}`,
        status: row.status || status || "active",
      });
    } catch (err: any) {
      console.error("[cross-system client-engagements/create-from-project]", err);
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/tenders/create-from-project", crossSystemAuth, async (req: any, res) => {
    try {
      const body = req.body || {};
      const { parent_project_id, parent_project_url, name, client, tender_authority, status } = body;
      if (!parent_project_id || !name || !client) {
        return res.status(400).json({ message: "parent_project_id, name and client are required" });
      }
      const existing = await db.execute(sql`SELECT * FROM tenders WHERE parent_project_id = ${String(parent_project_id)} LIMIT 1`);
      const tenderUrlBase = "https://eventperfekt.net/tenders";
      if (existing.rows.length) {
        const row: any = existing.rows[0];
        const tenderId = String(row.tender_id || row.id);
        return res.status(200).json({
          tender_id: tenderId,
          tender_url: `${tenderUrlBase}/${tenderId}`,
          status: row.status || status || "drafting",
        });
      }
      const inserted = await db.execute(sql`
        INSERT INTO tenders (
          parent_project_id, parent_project_url, name, client, tender_authority, submission_deadline,
          contract_value, currency, bid_lead_email, bid_lead_name, description, title, buyer, status, notes, source_url
        )
        VALUES (
          ${String(parent_project_id)}, ${parent_project_url || null}, ${name}, ${client}, ${tender_authority || null}, ${body.submission_deadline || null},
          ${body.contract_value || null}, ${body.currency || "GBP"}, ${body.bid_lead_email || null}, ${body.bid_lead_name || null}, ${body.description || null},
          ${name}, ${tender_authority || client}, ${status || "drafting"}, ${body.description || null}, ${parent_project_url || null}
        )
        RETURNING *
      `);
      const row: any = inserted.rows[0];
      const tenderId = row.tender_id || row.id;
      await db.execute(sql`
        UPDATE projects
        SET linked_tender_id = ${String(tenderId)},
            updated_at = NOW()
        WHERE id = ${String(parent_project_id)}
      `).catch(() => {});
      await db.execute(sql`
        INSERT INTO tender_bid_sections (tender_id, section_type, section_title, content, word_count)
        VALUES (${tenderId}, 'skeleton', 'Bid Skeleton', ${body.description || `Bid skeleton for ${name}`}, 0)
      `).catch(() => {});
      try {
        await notificationService.sendNotification({
          userId: "planner-dashboard",
          title: "New tender linked",
          message: `${name} was linked from project ${parent_project_id}.`,
          actionUrl: `/tenders/${tenderId}`,
        } as any);
      } catch {}
      return res.status(201).json({
        tender_id: String(row.tender_id || row.id),
        tender_url: `${tenderUrlBase}/${String(row.tender_id || row.id)}`,
        status: row.status || status || "drafting",
      });
    } catch (err: any) {
      console.error("[cross-system tenders/create-from-project]", err);
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/cross-system/backfill-project-links", crossSystemAuth, async (_req: any, res) => {
    try {
      const engagements = await db.execute(sql`
        UPDATE projects p
        SET linked_engagement_id = ce.parent_project_id
        FROM client_engagements ce
        WHERE p.id::text = ce.parent_project_id
          AND (p.linked_engagement_id IS NULL OR p.linked_engagement_id = '')
        RETURNING p.id
      `);
      const tenders = await db.execute(sql`
        UPDATE projects p
        SET linked_tender_id = t.parent_project_id
        FROM tenders t
        WHERE p.id::text = t.parent_project_id
          AND (p.linked_tender_id IS NULL OR p.linked_tender_id = '')
        RETURNING p.id
      `);
      res.json({
        success: true,
        updated_engagement_links: engagements.rows.length,
        updated_tender_links: tenders.rows.length,
      });
    } catch (err: any) {
      console.error("[cross-system backfill-project-links]", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/cross-system/table-check", crossSystemAuth, async (_req: any, res) => {
    try {
      await ensureCrossSystemTables();
      const tables = await db.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('client_engagements', 'tenders')
        ORDER BY table_name
      `);
      res.json({
        tables: (tables.rows as any[]).map(r => r.table_name),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Part A.2: return event-side data to the Group Portal ─────────────────
  app.get("/api/events/:id/project-data", crossSystemAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid event id" });

      const r = await db.execute(sql`SELECT * FROM cross_system_event_links WHERE id = ${id} LIMIT 1`);
      if (!r.rows.length) return res.status(404).json({ message: "Event not found" });
      const link: any = r.rows[0];

      // Application stats (for the project-side dashboard "Linked Event" panel)
      const apps = await db.execute(sql`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE final_status = 'accepted') AS accepted,
          COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL) AS confirmed,
          COUNT(*) FILTER (WHERE final_status = 'pending') AS pending
        FROM event_applications WHERE event_id = ${id} OR event_key = 'iamher-2026-08-06'
      `);
      const stats: any = apps.rows[0] || {};

      const team = await db.execute(sql`SELECT name, project_role, status, country FROM cross_system_event_team WHERE link_id = ${id} ORDER BY id ASC`);

      return res.json({
        event: {
          id: link.id,
          name: link.event_name,
          date: link.event_date,
          status: link.status,
          country: link.country,
          expected_attendance: link.expected_attendance,
          budget_total: link.budget_total,
          budget_currency: link.budget_currency,
          linked_at: link.linked_at,
          last_synced_at: link.last_synced_at,
        },
        applications: {
          total: Number(stats.total || 0),
          accepted: Number(stats.accepted || 0),
          confirmed: Number(stats.confirmed || 0),
          pending: Number(stats.pending || 0),
        },
        team: team.rows,
      });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Part A.3: project → event sync (date, budget, status, etc.) ──────────
  app.patch("/api/events/:id/sync", crossSystemAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid event id" });

      const r = await db.execute(sql`SELECT * FROM cross_system_event_links WHERE id = ${id} LIMIT 1`);
      if (!r.rows.length) return res.status(404).json({ message: "Event not found" });

      const allowed = ["event_name", "event_date", "event_type", "expected_attendance",
                       "budget_total", "budget_currency", "client_name", "country", "status",
                       "parent_project_url"];
      const updates: Record<string, any> = {};
      for (const k of allowed) if (k in req.body) updates[k] = req.body[k];

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No syncable fields provided" });
      }

      // Build dynamic UPDATE safely with parameterized SQL
      const setFragments = Object.entries(updates).map(([k, v]) => sql`${sql.identifier(k)} = ${v}`);
      await db.execute(sql`UPDATE cross_system_event_links SET ${sql.join(setFragments, sql`, `)},
        last_project_payload = ${JSON.stringify(req.body)}::jsonb,
        last_synced_at = NOW(),
        last_synced_direction = 'project_to_event'
        WHERE id = ${id}`);

      await db.execute(sql`INSERT INTO cross_system_sync_log
        (parent_project_id, link_id, direction, endpoint, payload)
        VALUES (${(r.rows[0] as any).parent_project_id}, ${id}, 'inbound', '/api/events/:id/sync', ${JSON.stringify(req.body)}::jsonb)`);

      return res.json({ success: true, synced: Object.keys(updates) });
    } catch (err: any) {
      console.error("[cross-system sync]", err);
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Part B.1: team-sync — propagate project assignments to event ─────────
  app.post("/api/events/:id/team-sync", crossSystemAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid event id" });

      const linkRow = await db.execute(sql`SELECT id FROM cross_system_event_links WHERE id = ${id} LIMIT 1`);
      if (!linkRow.rows.length) return res.status(404).json({ message: "Event not found" });

      const { members } = req.body || {};
      if (!Array.isArray(members)) return res.status(400).json({ message: "Body must include members:[]" });

      const upserted: number[] = [];
      for (const m of members) {
        if (!m.portal_user_id || !m.email || !m.name || !m.project_role) continue;
        const r = await db.execute(sql`
          INSERT INTO cross_system_event_team (
            link_id, portal_user_id, name, email, project_role, company_role,
            permission_tier, country, invited_at, accepted_at, declined_at, removed_at, status, last_synced_at
          ) VALUES (
            ${id}, ${m.portal_user_id}, ${m.name}, ${m.email.toLowerCase()},
            ${m.project_role}, ${m.company_role || null}, ${m.permission_tier || 'internal_staff'},
            ${m.country || null}, ${m.invited_at || null}, ${m.accepted_at || null},
            ${m.declined_at || null}, ${m.removed_at || null}, ${m.status || 'pending'}, NOW()
          )
          ON CONFLICT (link_id, portal_user_id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            project_role = EXCLUDED.project_role,
            company_role = EXCLUDED.company_role,
            permission_tier = EXCLUDED.permission_tier,
            country = EXCLUDED.country,
            invited_at = EXCLUDED.invited_at,
            accepted_at = EXCLUDED.accepted_at,
            declined_at = EXCLUDED.declined_at,
            removed_at = EXCLUDED.removed_at,
            status = EXCLUDED.status,
            last_synced_at = NOW()
          RETURNING id
        `);
        upserted.push((r.rows[0] as any).id);
      }

      await db.execute(sql`INSERT INTO cross_system_sync_log
        (link_id, direction, endpoint, payload)
        VALUES (${id}, 'inbound', '/api/events/:id/team-sync', ${JSON.stringify(req.body)}::jsonb)`);

      return res.json({ success: true, count: upserted.length });
    } catch (err: any) {
      console.error("[cross-system team-sync]", err);
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Read endpoint used by the Planning App's own UI to display the team ──
  // Internal JWT auth + role gate (admin / planner / manager) — protects PII.
  app.get("/api/events/:id/team", authenticateToken, requireInternalReviewer, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid event id" });
      const r = await db.execute(sql`SELECT id, name, email, project_role, company_role,
        permission_tier, country, status, accepted_at, declined_at, removed_at
        FROM cross_system_event_team
        WHERE link_id = ${id} AND removed_at IS NULL
        ORDER BY status DESC, id ASC`);
      return res.json(r.rows);
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // Same gate for the admin diagnostic to generate a key suggestion.
  app.get("/api/cross-system/links", authenticateToken, requireInternalReviewer, async (_req, res) => {
    try {
      const r = await db.execute(sql`SELECT id, parent_project_id, parent_project_name, event_name,
        event_date, status, country, linked_at, last_synced_at FROM cross_system_event_links ORDER BY linked_at DESC`);
      res.json(r.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Health/diagnostic for Group Portal to verify the bridge is up ────────
  app.get("/api/cross-system/ping", crossSystemAuth, (_req, res) => {
    res.json({
      ok: true,
      service: "event-perfekt-planning-app",
      bridge_version: 1,
      time: new Date().toISOString(),
    });
  });

  // ── Generate a key for the Group Portal to copy (admin only, helper) ─────
  app.get("/api/cross-system/generate-key", authenticateToken, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const suggested = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
    return res.json({
      suggested_key: suggested,
      instructions: "Set this as EP_CROSS_SYSTEM_KEY in Replit Secrets on BOTH the Planning App and the Group Portal. This endpoint does not store the value — copy it now.",
      currently_configured: !!getCrossSystemKey(),
    });
  });
}
