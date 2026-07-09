// Paperless-Post-grade invitation tracking + bulk send + live feed
import { type Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { authenticateToken } from "./auth";
import { sendMail } from "./emailService";

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

const INVITE_ROLES = ["admin", "planner", "manager", "staff"];
const INVITE_CONFIG_ROLES = ["admin", "planner", "manager"];

function appBaseUrl(): string {
  const v = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  return v || "https://eventperfekt.net";
}

// ─── Bootstrap: idempotent column adds + new invitation_events table ────────
export async function bootstrapInvitationTracking() {
  await db.execute(sql`ALTER TABLE guests ADD COLUMN IF NOT EXISTS email_delivered_at TIMESTAMP`);
  await db.execute(sql`ALTER TABLE guests ADD COLUMN IF NOT EXISTS email_opened_at TIMESTAMP`);
  await db.execute(sql`ALTER TABLE guests ADD COLUMN IF NOT EXISTS invitation_viewed_at TIMESTAMP`);
  await db.execute(sql`ALTER TABLE guests ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0`);
  await db.execute(sql`ALTER TABLE guests ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMP`);
  await db.execute(sql`ALTER TABLE guests ADD COLUMN IF NOT EXISTS envelope_color_override TEXT`);

  await db.execute(sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS wax_seal_enabled BOOLEAN DEFAULT TRUE`);
  await db.execute(sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS wax_seal_monogram TEXT DEFAULT 'EP'`);
  await db.execute(sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS foil_shimmer_enabled BOOLEAN DEFAULT TRUE`);
  await db.execute(sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS confetti_on_accept BOOLEAN DEFAULT TRUE`);
  await db.execute(sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS auto_reminder_enabled BOOLEAN DEFAULT FALSE`);
  await db.execute(sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS auto_reminder_days_after_send INTEGER DEFAULT 7`);
  await db.execute(sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS auto_reminder_max_count INTEGER DEFAULT 2`);

  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS app_config JSONB`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS invitation_events (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      guest_id VARCHAR NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
      event_id VARCHAR NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      invitation_id VARCHAR,
      type TEXT NOT NULL,
      channel TEXT,
      occurred_at TIMESTAMP DEFAULT NOW(),
      user_agent TEXT,
      ip_address TEXT,
      metadata JSONB
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_invitation_events_event ON invitation_events(event_id, occurred_at DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_invitation_events_guest ON invitation_events(guest_id, occurred_at DESC)`);

  console.log("[InvitationTracking] Tables + columns verified ✓");
}

// ─── Activity logger helper ─────────────────────────────────────────────────
async function logEvent(
  guestId: string,
  eventId: string,
  type: string,
  opts: { channel?: string; userAgent?: string; ipAddress?: string; invitationId?: string; metadata?: any } = {},
) {
  try {
    await db.execute(sql`
      INSERT INTO invitation_events (guest_id, event_id, invitation_id, type, channel, user_agent, ip_address, metadata)
      VALUES (${guestId}, ${eventId}, ${opts.invitationId || null}, ${type}, ${opts.channel || null},
              ${opts.userAgent || null}, ${opts.ipAddress || null}, ${opts.metadata ? JSON.stringify(opts.metadata) : null}::jsonb)
    `);
  } catch (err: any) {
    console.warn("[InvitationTracking] Failed to log event:", err.message);
  }
}

export { logEvent as logInvitationEvent };

// ─── Email composer with tracking pixel ────────────────────────────────────
function buildInvitationEmailHtml(args: {
  guestName: string;
  hostNames: string;
  eventTitle: string;
  dateText: string;
  venueText: string;
  invitationUrl: string;
  rsvpUrl: string;
  trackingPixelUrl: string;
  envelopeColor: string;
  accentColor: string;
}): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${args.eventTitle}</title></head>
<body style="margin:0;padding:0;background:#f4ede4;font-family:Georgia,'Playfair Display',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4ede4;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.15);">
        <tr><td style="background:${args.envelopeColor};padding:32px 24px;text-align:center;">
          <p style="margin:0;color:#E2C87A;font-size:11px;letter-spacing:0.4em;text-transform:uppercase;">Event Perfekt</p>
          <p style="margin:6px 0 0;color:#ffffffcc;font-style:italic;font-size:13px;">...making yours perfekt</p>
        </td></tr>
        <tr><td style="padding:48px 32px 24px;text-align:center;">
          <p style="margin:0 0 8px;color:${args.accentColor};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;">${args.hostNames}</p>
          <p style="margin:0 0 16px;color:#999;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">cordially invite ${args.guestName} to</p>
          <h1 style="margin:0 0 16px;color:${args.accentColor};font-size:32px;font-weight:bold;line-height:1.2;">${args.eventTitle}</h1>
          <div style="width:60px;height:1px;background:${args.accentColor}40;margin:16px auto;"></div>
          <p style="margin:8px 0;color:#330311;font-size:16px;font-weight:600;">${args.dateText}</p>
          <p style="margin:8px 0;color:#666;font-size:13px;">${args.venueText}</p>
        </td></tr>
        <tr><td style="padding:24px 32px 40px;text-align:center;">
          <a href="${args.invitationUrl}" style="display:inline-block;background:${args.accentColor};color:#ffffff;padding:14px 36px;border-radius:6px;text-decoration:none;font-size:14px;letter-spacing:0.15em;text-transform:uppercase;font-weight:600;">Open Your Invitation</a>
          <p style="margin:20px 0 0;font-size:12px;color:#999;">or RSVP directly:</p>
          <p style="margin:8px 0 0;"><a href="${args.rsvpUrl}" style="color:${args.accentColor};font-size:13px;">${args.rsvpUrl}</a></p>
        </td></tr>
        <tr><td style="background:#f9f4ee;padding:20px;text-align:center;border-top:1px solid #e8dfd0;">
          <p style="margin:0;color:#999;font-size:11px;">Powered by <strong style="color:${args.envelopeColor};">Event Perfekt</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  <img src="${args.trackingPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />
</body></html>`;
}

// ─── Shared bulk-send service (used by bulk + per-guest resend) ────────────
export async function sendInvitationsToGuests(args: {
  eventId: string;
  channel?: "email" | "whatsapp" | "both";
  guestIds?: string[];
  mode?: "new" | "pending" | "all";
  invitationId?: string;
}): Promise<{ sent: number; skipped: number; failed: number; total: number; failures: Array<{ guestId: string; reason: string }> }> {
  const channel = args.channel || "email";
  const mode = args.mode || "new";

  const evRes: any = await db.execute(sql`
    SELECT id, name, start_date, ceremony_venue, reception_venue, city, country
    FROM events WHERE id = ${args.eventId}
  `);
  const event = evRes.rows?.[0];
  if (!event) throw new Error("Event not found");
  const eventDate = event.start_date;
  const eventVenue = event.ceremony_venue || event.reception_venue || event.city || "";

  let inv: any = null;
  if (args.invitationId) {
    const r: any = await db.execute(sql`SELECT * FROM invitations WHERE id = ${args.invitationId}`);
    inv = r.rows?.[0];
  } else {
    const r: any = await db.execute(sql`SELECT * FROM invitations WHERE event_id = ${args.eventId} ORDER BY updated_at DESC LIMIT 1`);
    inv = r.rows?.[0];
  }
  const envelopeColor = inv?.envelope_color || "#330311";
  const accentColor = inv?.accent_color || "#8B1538";
  const hostNames = inv?.host_names || "Event Perfekt";

  let guestRows: any;
  if (Array.isArray(args.guestIds) && args.guestIds.length > 0) {
    const placeholders = sql.join(args.guestIds.map((g) => sql`${g}`), sql`, `);
    guestRows = await db.execute(sql`
      SELECT id, first_name, last_name, email, phone, rsvp_token, invitation_sent
      FROM guests WHERE event_id = ${args.eventId} AND id IN (${placeholders})
    `);
  } else if (mode === "pending") {
    guestRows = await db.execute(sql`
      SELECT id, first_name, last_name, email, phone, rsvp_token, invitation_sent
      FROM guests WHERE event_id = ${args.eventId} AND rsvp_status = 'pending'
    `);
  } else if (mode === "all") {
    guestRows = await db.execute(sql`
      SELECT id, first_name, last_name, email, phone, rsvp_token, invitation_sent
      FROM guests WHERE event_id = ${args.eventId}
    `);
  } else {
    guestRows = await db.execute(sql`
      SELECT id, first_name, last_name, email, phone, rsvp_token, invitation_sent
      FROM guests WHERE event_id = ${args.eventId} AND COALESCE(invitation_sent, FALSE) = FALSE
    `);
  }

  const guests = guestRows.rows || [];
  const base = appBaseUrl();
  let sent = 0, skipped = 0, failed = 0;
  const failures: Array<{ guestId: string; reason: string }> = [];

  for (const g of guests) {
    try {
      let token = g.rsvp_token;
      if (!token) {
        token = `rsvp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        await db.execute(sql`UPDATE guests SET rsvp_token = ${token} WHERE id = ${g.id}`);
      }

      if ((channel === "email" || channel === "both") && g.email) {
        const invitationUrl = inv?.id ? `${base}/invitation/${inv.id}?token=${token}` : `${base}/rsvp/${token}`;
        const rsvpUrl = `${base}/rsvp/${token}`;
        const trackingPixelUrl = `${base}/api/invitations/track/${token}.gif`;
        const html = buildInvitationEmailHtml({
          guestName: `${g.first_name} ${g.last_name}`,
          hostNames,
          eventTitle: event.name || "You're Invited",
          dateText: eventDate ? new Date(eventDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "",
          venueText: eventVenue,
          invitationUrl, rsvpUrl, trackingPixelUrl, envelopeColor, accentColor,
        });
        const entity = (event.country === "Nigeria" || event.country === "NG") ? "NG" : "GB";
        await sendMail(g.email, `You're Invited — ${event.name}`, html, undefined, entity);
        await db.execute(sql`
          UPDATE guests SET invitation_sent = TRUE, invitation_sent_at = NOW(), email_delivered_at = NOW()
          WHERE id = ${g.id}
        `);
        await logEvent(g.id, args.eventId, "sent", { channel: "email", invitationId: inv?.id });
        await logEvent(g.id, args.eventId, "delivered", { channel: "email", invitationId: inv?.id });
        sent++;
      } else if ((channel === "whatsapp" || channel === "both") && g.phone) {
        await db.execute(sql`UPDATE guests SET invitation_sent = TRUE, invitation_sent_at = NOW() WHERE id = ${g.id}`);
        await logEvent(g.id, args.eventId, "sent", { channel: "whatsapp", invitationId: inv?.id });
        sent++;
      } else {
        skipped++;
      }
    } catch (err: any) {
      failed++;
      failures.push({ guestId: g.id, reason: err.message });
      await logEvent(g.id, args.eventId, "failed", { channel, metadata: { error: err.message } });
    }
  }

  return { sent, skipped, failed, total: guests.length, failures };
}

// ─── Concurrency lock for the daily reminder run ───────────────────────────
let _reminderLock = false;
export function tryAcquireReminderLock(): boolean {
  if (_reminderLock) return false;
  _reminderLock = true;
  return true;
}
export function releaseReminderLock(): void { _reminderLock = false; }

// ─── Route registration ────────────────────────────────────────────────────
export function registerInvitationTrackingRoutes(app: Express) {
  // ── Public: invitation render data (token-validated, no JWT) ────────────
  app.get("/api/invitation-view/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const token = (req.query.token as string) || "";
      const invRes: any = await db.execute(sql`SELECT * FROM invitations WHERE id = ${id} LIMIT 1`);
      const inv = invRes.rows?.[0];
      if (!inv) return res.status(404).json({ message: "Invitation not found" });

      // Published invitations are always viewable (guest link or planner preview).
      // If the invitation is not published, a valid guest token is required.
      let guest: any = null;
      if (token) {
        const gRes: any = await db.execute(sql`
          SELECT id, event_id, first_name, last_name FROM guests
          WHERE rsvp_token = ${token} AND event_id = ${inv.event_id} LIMIT 1
        `);
        guest = gRes.rows?.[0] || null;
      }

      // Block only when NOT published AND no valid guest token
      if (!inv.is_published && !guest) {
        return res.status(403).json({ message: "Invitation is not published" });
      }

      const evRes: any = await db.execute(sql`
        SELECT id, name, start_date, ceremony_venue, reception_venue, city, country
        FROM events WHERE id = ${inv.event_id} LIMIT 1
      `);
      const event = evRes.rows?.[0] || null;

      // Map snake_case DB columns → camelCase for the frontend
      const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const camelInv: Record<string, any> = {};
      for (const [k, v] of Object.entries(inv)) {
        camelInv[snakeToCamel(k)] = v;
      }

      return res.json({ ...camelInv, event, guest });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Public: 1x1 tracking pixel — idempotent (only logs first open) ───────
  app.get("/api/invitations/track/:token.gif", async (req, res) => {
    const token = req.params.token;
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.end(TRANSPARENT_GIF);

    try {
      const result: any = await db.execute(sql`
        SELECT id, event_id, email_opened_at FROM guests WHERE rsvp_token = ${token} LIMIT 1
      `);
      const row = result.rows?.[0];
      if (!row) return;
      // Only log + stamp on the FIRST open per guest — prevents feed inflation
      // from email-client prefetch / image cache reloads.
      if (!row.email_opened_at) {
        await db.execute(sql`UPDATE guests SET email_opened_at = NOW() WHERE id = ${row.id} AND email_opened_at IS NULL`);
        await logEvent(row.id, row.event_id, "opened", {
          channel: "email",
          userAgent: req.headers["user-agent"] as string,
          ipAddress: (req.ip || req.socket.remoteAddress) as string,
        });
      }
    } catch (err: any) {
      console.warn("[InvitationTracking] Pixel hit failed:", err.message);
    }
  });

  // ── Public: viewed ping — idempotent (only logs first reveal) ────────────
  app.post("/api/invitations/:token/viewed", async (req, res) => {
    try {
      const token = req.params.token;
      const result: any = await db.execute(sql`
        SELECT id, event_id, invitation_viewed_at FROM guests WHERE rsvp_token = ${token} LIMIT 1
      `);
      const row = result.rows?.[0];
      if (!row) return res.status(404).json({ error: "not found" });
      if (!row.invitation_viewed_at) {
        await db.execute(sql`UPDATE guests SET invitation_viewed_at = NOW() WHERE id = ${row.id} AND invitation_viewed_at IS NULL`);
        await logEvent(row.id, row.event_id, "viewed", {
          userAgent: req.headers["user-agent"] as string,
          ipAddress: (req.ip || req.socket.remoteAddress) as string,
        });
      }
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Bulk send invitations ────────────────────────────────────────────────
  app.post("/api/events/:eventId/invitations/send", authenticateToken, async (req: any, res) => {
    try {
      if (!INVITE_ROLES.includes(req.user?.role)) return res.status(403).json({ error: "Forbidden" });
      const { channel, guestIds, mode, invitationId } = req.body || {};
      const summary = await sendInvitationsToGuests({
        eventId: req.params.eventId,
        channel, guestIds, mode, invitationId,
      });
      return res.json(summary);
    } catch (err: any) {
      console.error("[InvitationTracking] Bulk send failed:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Live activity feed ──────────────────────────────────────────────────
  app.get("/api/events/:eventId/invitations/feed", authenticateToken, async (req: any, res) => {
    try {
      if (!INVITE_ROLES.includes(req.user?.role)) return res.status(403).json({ error: "Forbidden" });
      const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 200);
      const result: any = await db.execute(sql`
        SELECT ie.id, ie.type, ie.channel, ie.occurred_at, ie.metadata,
               g.id as guest_id, g.first_name, g.last_name, g.email
        FROM invitation_events ie
        JOIN guests g ON g.id = ie.guest_id
        WHERE ie.event_id = ${req.params.eventId}
        ORDER BY ie.occurred_at DESC
        LIMIT ${limit}
      `);
      return res.json(result.rows || []);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Stats dashboard (role-gated) ────────────────────────────────────────
  app.get("/api/events/:eventId/invitations/stats", authenticateToken, async (req: any, res) => {
    try {
      if (!INVITE_ROLES.includes(req.user?.role)) return res.status(403).json({ error: "Forbidden" });
      const result: any = await db.execute(sql`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE invitation_sent = TRUE)::int as sent,
          COUNT(*) FILTER (WHERE email_delivered_at IS NOT NULL)::int as delivered,
          COUNT(*) FILTER (WHERE email_opened_at IS NOT NULL)::int as opened,
          COUNT(*) FILTER (WHERE invitation_viewed_at IS NOT NULL)::int as viewed,
          COUNT(*) FILTER (WHERE rsvp_status = 'accepted')::int as accepted,
          COUNT(*) FILTER (WHERE rsvp_status = 'declined')::int as declined,
          COUNT(*) FILTER (WHERE rsvp_status = 'pending')::int as pending,
          COUNT(*) FILTER (WHERE reminder_count > 0)::int as reminded
        FROM guests WHERE event_id = ${req.params.eventId}
      `);
      return res.json(result.rows?.[0] || {});
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Update invitation settings (envelope, flourishes, auto-reminder) ────
  app.patch("/api/invitations/:id/settings", authenticateToken, async (req: any, res) => {
    try {
      if (!INVITE_CONFIG_ROLES.includes(req.user?.role)) return res.status(403).json({ error: "Forbidden" });
      const id = req.params.id;
      const allowed = new Set([
        "envelope_color", "liner_pattern",
        "wax_seal_enabled", "wax_seal_monogram",
        "foil_shimmer_enabled", "confetti_on_accept",
        "auto_reminder_enabled", "auto_reminder_days_after_send", "auto_reminder_max_count",
      ]);
      const camelToSnake = (k: string) => k.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
      const setClauses: any[] = [];
      for (const [k, v] of Object.entries(req.body || {})) {
        const col = camelToSnake(k);
        if (!allowed.has(col)) continue;
        setClauses.push(sql`${sql.identifier(col)} = ${v}`);
      }
      if (setClauses.length === 0) return res.json({ ok: true, updated: 0 });
      setClauses.push(sql`updated_at = NOW()`);
      await db.execute(sql`UPDATE invitations SET ${sql.join(setClauses, sql`, `)} WHERE id = ${id}`);
      return res.json({ ok: true, updated: setClauses.length - 1 });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Per-guest manual resend — uses the shared service directly ──────────
  app.post("/api/guests/:guestId/resend-invitation", authenticateToken, async (req: any, res) => {
    try {
      if (!INVITE_ROLES.includes(req.user?.role)) return res.status(403).json({ error: "Forbidden" });
      const r: any = await db.execute(sql`SELECT event_id FROM guests WHERE id = ${req.params.guestId}`);
      const eventId = r.rows?.[0]?.event_id;
      if (!eventId) return res.status(404).json({ error: "Guest not found" });
      const summary = await sendInvitationsToGuests({
        eventId,
        channel: "email",
        guestIds: [req.params.guestId],
      });
      return res.json(summary);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Manual trigger for reminder cron (admin only) ───────────────────────
  app.post("/api/admin/invitations/run-reminders", authenticateToken, async (req: any, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });
      const { runInvitationReminders } = await import("./invitation-reminder-scheduler");
      const summary = await runInvitationReminders();
      return res.json(summary);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  console.log("[InvitationTracking] Routes registered ✓");
}
