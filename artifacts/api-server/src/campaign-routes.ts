import type { Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

async function bootstrapCampaignTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_prospect_campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        target_audience TEXT,
        target_job_titles TEXT[] DEFAULT '{}',
        target_sectors TEXT[] DEFAULT '{}',
        target_locations JSONB DEFAULT '[]'::jsonb,
        exclude_locations TEXT[] DEFAULT '{}',
        search_sources TEXT[] DEFAULT '{web}',
        search_frequency VARCHAR(50) DEFAULT 'daily',
        search_day_of_week INTEGER DEFAULT 1,
        search_time VARCHAR(10) DEFAULT '07:00',
        email_tone VARCHAR(50) DEFAULT 'professional',
        approval_rule VARCHAR(50) DEFAULT 'manual',
        status VARCHAR(30) DEFAULT 'active',
        campaign_type VARCHAR(50),
        partner_type VARCHAR(50),
        source_database VARCHAR(50),
        source_filter JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE company_prospects ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES ep_prospect_campaigns(id) ON DELETE SET NULL`);
    await db.execute(sql`ALTER TABLE pending_outreach_emails ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES ep_prospect_campaigns(id) ON DELETE SET NULL`);
    // Add new columns if they don't exist
    await db.execute(sql`ALTER TABLE ep_prospect_campaigns ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50)`);
    await db.execute(sql`ALTER TABLE ep_prospect_campaigns ADD COLUMN IF NOT EXISTS partner_type VARCHAR(50)`);
    await db.execute(sql`ALTER TABLE ep_prospect_campaigns ADD COLUMN IF NOT EXISTS source_database VARCHAR(50)`);
    await db.execute(sql`ALTER TABLE ep_prospect_campaigns ADD COLUMN IF NOT EXISTS source_filter JSONB`);
    console.log("[CampaignRoutes] Tables bootstrapped ✓");
  } catch (err: any) {
    console.error("[CampaignRoutes] Bootstrap error:", err.message);
  }
}

export function registerCampaignRoutes(app: Express, authenticateToken: any) {
  bootstrapCampaignTables();

  // ── List all campaigns ──────────────────────────────────────────────────
  app.get("/api/prospect-campaigns", authenticateToken, async (_req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT
          c.*,
          COUNT(DISTINCT cp.id) FILTER (WHERE cp.campaign_id = c.id) AS prospects_found,
          COUNT(DISTINCT poe.id) FILTER (WHERE poe.campaign_id = c.id AND poe.status = 'sent') AS emails_sent,
          COUNT(DISTINCT poe.id) FILTER (WHERE poe.campaign_id = c.id AND poe.status = 'pending') AS pending_emails
        FROM ep_prospect_campaigns c
        LEFT JOIN company_prospects cp ON cp.campaign_id = c.id
        LEFT JOIN pending_outreach_emails poe ON poe.campaign_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `);
      res.json(rows.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Get single campaign ─────────────────────────────────────────────────
  app.get("/api/prospect-campaigns/:id", authenticateToken, async (req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT * FROM ep_prospect_campaigns WHERE id = ${req.params.id}
      `);
      if (!rows.rows.length) return res.status(404).json({ error: "Not found" });
      return res.json(rows.rows[0]);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Create campaign ─────────────────────────────────────────────────────
  app.post("/api/prospect-campaigns", authenticateToken, async (req, res) => {
    try {
      const {
        name, description, target_audience,
        target_job_titles = [], target_sectors = [],
        target_locations = [], exclude_locations = [],
        search_sources = ["web"],
        search_frequency = "daily",
        search_day_of_week = 1,
        search_time = "07:00",
        email_tone = "professional",
        approval_rule = "manual",
        status = "active",
      } = req.body;

      if (!name) return res.status(400).json({ error: "Campaign name is required" });

      const result = await db.execute(sql`
        INSERT INTO ep_prospect_campaigns (
          name, description, target_audience,
          target_job_titles, target_sectors,
          target_locations, exclude_locations,
          search_sources, search_frequency,
          search_day_of_week, search_time,
          email_tone, approval_rule, status,
          created_at, updated_at
        ) VALUES (
          ${name}, ${description ?? null}, ${target_audience ?? null},
          ${target_job_titles || []}::text[], ${target_sectors || []}::text[],
          ${JSON.stringify(target_locations || [])}::jsonb, ${exclude_locations || []}::text[],
          ${search_sources || ["web"]}::text[], ${search_frequency},
          ${search_day_of_week}, ${search_time},
          ${email_tone}, ${approval_rule}, ${status},
          NOW(), NOW()
        ) RETURNING *
      `);
      return res.status(201).json(result.rows[0]);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Update campaign ─────────────────────────────────────────────────────
  app.patch("/api/prospect-campaigns/:id", authenticateToken, async (req, res) => {
    try {
      const {
        name, description, target_audience,
        target_job_titles, target_sectors,
        target_locations, exclude_locations,
        search_sources, search_frequency,
        search_day_of_week, search_time,
        email_tone, approval_rule, status,
      } = req.body;

      await db.execute(sql`
        UPDATE ep_prospect_campaigns SET
          name = COALESCE(${name ?? null}, name),
          description = COALESCE(${description ?? null}, description),
          target_audience = COALESCE(${target_audience ?? null}, target_audience),
          target_job_titles = COALESCE(${target_job_titles ? `${JSON.stringify(target_job_titles)}` : null}::text[], target_job_titles),
          target_sectors = COALESCE(${target_sectors ? `${JSON.stringify(target_sectors)}` : null}::text[], target_sectors),
          target_locations = COALESCE(${target_locations ? `${JSON.stringify(target_locations)}` : null}::jsonb, target_locations),
          exclude_locations = COALESCE(${exclude_locations ? `${JSON.stringify(exclude_locations)}` : null}::text[], exclude_locations),
          search_sources = COALESCE(${search_sources ? `${JSON.stringify(search_sources)}` : null}::text[], search_sources),
          search_frequency = COALESCE(${search_frequency ?? null}, search_frequency),
          search_day_of_week = COALESCE(${search_day_of_week ?? null}, search_day_of_week),
          search_time = COALESCE(${search_time ?? null}, search_time),
          email_tone = COALESCE(${email_tone ?? null}, email_tone),
          approval_rule = COALESCE(${approval_rule ?? null}, approval_rule),
          status = COALESCE(${status ?? null}, status),
          updated_at = NOW()
        WHERE id = ${req.params.id}
      `);
      const updated = await db.execute(sql`SELECT * FROM ep_prospect_campaigns WHERE id = ${req.params.id}`);
      res.json(updated.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Delete campaign ─────────────────────────────────────────────────────
  app.delete("/api/prospect-campaigns/:id", authenticateToken, async (req, res) => {
    try {
      await db.execute(sql`DELETE FROM ep_prospect_campaigns WHERE id = ${req.params.id}`);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Campaign stats ──────────────────────────────────────────────────────
  app.get("/api/prospect-campaigns/:id/stats", authenticateToken, async (req, res) => {
    try {
      const stats = await db.execute(sql`
        SELECT
          COUNT(DISTINCT cp.id) AS prospects_found,
          COUNT(DISTINCT cp.id) FILTER (WHERE cp.status = 'won') AS won,
          COUNT(DISTINCT poe.id) FILTER (WHERE poe.status = 'sent') AS emails_sent,
          COUNT(DISTINCT poe.id) FILTER (WHERE poe.status = 'pending') AS pending_emails,
          COALESCE((SELECT COUNT(*) FROM inbound_replies ir WHERE ir.prospect_id IN (SELECT id FROM company_prospects WHERE campaign_id = c.id)), 0) AS replies_received
        FROM ep_prospect_campaigns c
        LEFT JOIN company_prospects cp ON cp.campaign_id = c.id
        LEFT JOIN pending_outreach_emails poe ON poe.campaign_id = c.id
        WHERE c.id = ${req.params.id}
        GROUP BY c.id
      `);
      res.json(stats.rows[0] || {});
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Trigger manual campaign run ─────────────────────────────────────────
  app.post("/api/prospect-campaigns/:id/run", authenticateToken, async (req, res) => {
    try {
      const campRes = await db.execute(sql`SELECT * FROM ep_prospect_campaigns WHERE id = ${req.params.id}`);
      const campaign = campRes.rows[0] as any;
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      res.json({ ok: true, message: "Campaign run triggered. Results will appear in 1-2 minutes." });

      const { runCampaignCycle } = await import("./campaign-scheduler");
      runCampaignCycle(campaign).catch(err =>
        console.error(`[CampaignRunner] Error running campaign ${campaign.id}:`, err.message)
      );
      return;
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Manual run-now alias (used by UI) ──────────────────────────────────
  app.post("/api/prospect-campaigns/:id/run-now", authenticateToken, async (req, res) => {
    try {
      const campRes = await db.execute(sql`SELECT * FROM ep_prospect_campaigns WHERE id = ${req.params.id}`);
      const campaign = campRes.rows[0] as any;
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      res.json({ ok: true, name: campaign.name, message: "Campaign run triggered" });

      const { runCampaignCycle } = await import("./campaign-scheduler");
      runCampaignCycle(campaign).catch((err: any) =>
        console.error(`[CampaignRunner] Error running campaign ${campaign.id}:`, err.message)
      );
      return;
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Approve all emails for campaign ────────────────────────────────────
  app.post("/api/prospect-campaigns/:id/approve-all", authenticateToken, async (req: any, res) => {
    try {
      const pending = await db.execute(sql`
        SELECT * FROM pending_outreach_emails
        WHERE campaign_id = ${req.params.id} AND status = 'pending'
        ORDER BY created_at ASC
      `);

      const { approveAndSendEmail } = await import("./outreach-routes");
      let approved = 0, failed = 0, suppressed = 0;

      for (const email of pending.rows as any[]) {
        try {
          const result = await approveAndSendEmail(Number(email.id), req.user?.id ?? null);
          if (result.sent) approved++;
          else if (result.suppressed) suppressed++;
          else failed++;
        } catch {
          failed++;
        }
      }

      res.json({ ok: true, approved, suppressed, failed });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/prospect-campaigns/:id", authenticateToken, async (req, res) => {
    try {
      await db.execute(sql`DELETE FROM ep_prospect_campaigns WHERE id = ${req.params.id}`);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
