// Daily cron — fires gentle RSVP reminders for events with auto-reminder enabled
import { db } from "./db";
import { sql } from "drizzle-orm";
import { sendMail } from "./emailService";
import { logInvitationEvent, tryAcquireReminderLock, releaseReminderLock } from "./invitation-tracking-routes";

function appBaseUrl(): string {
  const v = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  return v || "https://eventperfekt.net";
}

function reminderHtml(args: {
  guestName: string;
  hostNames: string;
  eventTitle: string;
  dateText: string;
  rsvpUrl: string;
  trackingPixelUrl: string;
  accentColor: string;
}): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4ede4;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#330311;padding:24px;text-align:center;">
          <p style="margin:0;color:#E2C87A;font-size:11px;letter-spacing:0.4em;text-transform:uppercase;">Event Perfekt</p>
        </td></tr>
        <tr><td style="padding:36px 32px;text-align:center;">
          <p style="margin:0 0 12px;color:${args.accentColor};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;">A gentle reminder</p>
          <h2 style="margin:0 0 16px;color:#330311;font-size:22px;">${args.guestName}, we'd love to know if you can join us</h2>
          <p style="margin:0 0 24px;color:#666;font-size:14px;line-height:1.6;">
            ${args.hostNames} are looking forward to celebrating with you at <strong>${args.eventTitle}</strong>${args.dateText ? ` on <strong>${args.dateText}</strong>` : ""}.
            A simple yes or no helps us prepare the perfect evening.
          </p>
          <a href="${args.rsvpUrl}" style="display:inline-block;background:${args.accentColor};color:#ffffff;padding:14px 36px;border-radius:6px;text-decoration:none;font-size:14px;letter-spacing:0.15em;text-transform:uppercase;font-weight:600;">RSVP Now</a>
        </td></tr>
        <tr><td style="background:#f9f4ee;padding:16px;text-align:center;">
          <p style="margin:0;color:#999;font-size:11px;">Powered by <strong>Event Perfekt</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  <img src="${args.trackingPixelUrl}" width="1" height="1" alt="" />
</body></html>`;
}

export async function runInvitationReminders(): Promise<{ scanned: number; reminded: number; skipped: number; failed: number; locked?: boolean }> {
  let scanned = 0, reminded = 0, skipped = 0, failed = 0;
  // Prevent overlapping runs (e.g. manual admin trigger while daily run is in flight)
  if (!tryAcquireReminderLock()) {
    console.log("[InvitationReminders] Skipped — another run is in progress");
    return { scanned, reminded, skipped, failed, locked: true };
  }
  try {
    // Find all invitations with auto-reminder enabled
    const invRes: any = await db.execute(sql`
      SELECT id, event_id, host_names, accent_color, auto_reminder_days_after_send, auto_reminder_max_count
      FROM invitations WHERE auto_reminder_enabled = TRUE
    `);
    for (const inv of invRes.rows || []) {
      const evRes: any = await db.execute(sql`SELECT name, start_date AS event_date, country FROM events WHERE id = ${inv.event_id}`);
      const event = evRes.rows?.[0];
      if (!event) continue;

      const daysAfter = inv.auto_reminder_days_after_send || 7;
      const maxCount = inv.auto_reminder_max_count || 2;

      const guestRows: any = await db.execute(sql`
        SELECT id, first_name, last_name, email, rsvp_token, reminder_count, last_reminder_at, invitation_sent_at
        FROM guests
        WHERE event_id = ${inv.event_id}
          AND rsvp_status = 'pending'
          AND email IS NOT NULL
          AND invitation_sent = TRUE
          AND COALESCE(reminder_count, 0) < ${maxCount}
          AND invitation_sent_at < NOW() - (${daysAfter} || ' days')::interval
          AND (last_reminder_at IS NULL OR last_reminder_at < NOW() - (${daysAfter} || ' days')::interval)
      `);

      const base = appBaseUrl();
      for (const g of guestRows.rows || []) {
        scanned++;
        try {
          const rsvpUrl = `${base}/rsvp/${g.rsvp_token}`;
          const trackingPixelUrl = `${base}/api/invitations/track/${g.rsvp_token}.gif`;
          const html = reminderHtml({
            guestName: g.first_name,
            hostNames: inv.host_names || "Your hosts",
            eventTitle: event.name,
            dateText: event.event_date ? new Date(event.event_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "",
            rsvpUrl,
            trackingPixelUrl,
            accentColor: inv.accent_color || "#8B1538",
          });
          const entity = (event.country === "Nigeria" || event.country === "NG") ? "NG" : "GB";
          await sendMail(g.email, `Reminder: ${event.name} — we hope you can join us`, html, undefined, entity);
          await db.execute(sql`
            UPDATE guests SET reminder_sent = TRUE, last_reminder_at = NOW(),
                              reminder_count = COALESCE(reminder_count, 0) + 1
            WHERE id = ${g.id}
          `);
          await logInvitationEvent(g.id, inv.event_id, "reminder_sent", { channel: "email", invitationId: inv.id });
          reminded++;
        } catch (err: any) {
          failed++;
          await logInvitationEvent(g.id, inv.event_id, "failed", { channel: "email", metadata: { stage: "reminder", error: err.message } });
        }
      }
    }
    if (scanned > 0) {
      console.log(`[InvitationReminders] Scan complete — scanned=${scanned} reminded=${reminded} failed=${failed}`);
    }
    return { scanned, reminded, skipped, failed };
  } catch (err: any) {
    console.error("[InvitationReminders] Fatal:", err.message);
    return { scanned, reminded, skipped, failed };
  } finally {
    releaseReminderLock();
  }
}

export function startInvitationReminderScheduler() {
  // Run daily at 09:00 UK time
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(9, 0, 0, 0); // 09:00 UTC ≈ 09:00 UK in winter, 10:00 BST in summer — close enough for reminders
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const ms = next.getTime() - now.getTime();
    setTimeout(async () => {
      await runInvitationReminders();
      scheduleNext();
    }, ms);
    const mins = Math.round(ms / 60000);
    console.log(`[InvitationReminders] Next run in ${mins} min (at ${next.toISOString()})`);
  };
  scheduleNext();
}
