/**
 * Campaign Scheduler — autonomous daily operation
 * ------------------------------------------------
 * 07:00 UK time — runs all active campaigns: discover → verify → dedup → draft → queue
 * 09:00 UK time — auto-sends emails for campaigns with approval_rule = 'auto'
 * 18:00 UK time — sends daily summary to info@eventperfekt.com
 *
 * Email Configuration (2026-07-10 FIX):
 * Now configurable via environment variables to prevent flooding.
 * Set in .env to route different email types to different recipients.
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import { findDecisionMaker } from "./contact-finder";
import { draftOutreachEmail } from "./outreach-routes";
import { addSuppression, isSuppressed } from "./suppression";
import { emailService } from "./emailService";

// ── Email Recipients (configurable per type to prevent flooding) ──────────────
// Set these in .env to route different notifications to different team members
const CAMPAIGN_APPROVAL_EMAIL = process.env.CAMPAIGN_APPROVAL_EMAIL || "info@eventperfekt.com";  // Campaign approvals
const DAILY_SUMMARY_EMAIL = process.env.DAILY_SUMMARY_EMAIL || "info@eventperfekt.com";        // Daily intelligence summary
const MORNING_BRIEF_EMAIL = process.env.MORNING_BRIEF_EMAIL || "info@eventperfekt.com";        // Good morning prospects
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "info@eventperfekt.com";                     // Legacy fallback

// ── Feature Flags (enable/disable specific email types) ──────────────────────
const DAILY_SUMMARY_ENABLED = process.env.DAILY_SUMMARY_ENABLED !== "false";     // Default ON
const MORNING_BRIEF_ENABLED = process.env.MORNING_BRIEF_ENABLED !== "false";     // Default ON
const CAMPAIGN_AUTO_SEND = process.env.CAMPAIGN_AUTO_SEND === "true";            // Default OFF (manual approval)
const CAMPAIGN_APPROVAL_NOTIFY = process.env.CAMPAIGN_APPROVAL_NOTIFY !== "false"; // Default ON

function ukNow(): Date {
  return new Date(new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }));
}

function isBusinessHours(): boolean {
  const now = ukNow();
  const day = now.getDay();
  const hour = now.getHours();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
}

// ─── Step 1: Prospect discovery using campaign parameters ─────────────────
async function discoverProspects(campaign: any): Promise<any[]> {
  const sources = (campaign.search_sources as string[]) || ["web"];
  const sectors = (campaign.target_sectors as string[]) || [];
  const locations = campaign.target_locations || [];
  const jobTitles = (campaign.target_job_titles as string[]) || [];
  const tone = campaign.email_tone || "professional";

  const results: any[] = [];

  try {
    if (sources.includes("web")) {
      const locationStr = Array.isArray(locations)
        ? locations.map((l: any) => (typeof l === "string" ? l : `${l.city || ""} ${l.country || ""}`.trim())).join(", ")
        : "";

      const query = [
        sectors.length ? sectors.slice(0, 3).join(" OR ") : "company",
        jobTitles.length ? `"${jobTitles[0]}"` : "",
        locationStr ? `site:linkedin.com OR ${locationStr}` : "",
        campaign.target_audience || "",
      ].filter(Boolean).join(" ").slice(0, 250);

      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (apiKey) {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 800,
            messages: [
              {
                role: "system",
                content: `You are a B2B prospect finder. Return ONLY a JSON array of prospect objects. Each object: { company_name, industry, location, country, website, contact_title_likely, reason }. No markdown, no explanation.`,
              },
              {
                role: "user",
                content: `Find 8 real companies matching this campaign:
Campaign: ${campaign.name}
Audience: ${campaign.target_audience || "any business"}
Sectors: ${sectors.join(", ") || "any"}
Job titles we target: ${jobTitles.join(", ") || "any decision maker"}
Locations: ${locationStr || "UK"}
Exclude: ${(campaign.exclude_locations as string[] || []).join(", ") || "none"}

Return 8 specific, real company names with their details as JSON array.`,
              },
            ],
          }),
        });
        const data = await resp.json() as any;
        const text = data.choices?.[0]?.message?.content?.trim() || "[]";
        const parsed = JSON.parse(text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim());
        if (Array.isArray(parsed)) {
          results.push(...parsed.map(p => ({
            ...p,
            milestone_type: "general",
            source: "AI Discovery",
            campaign_id: campaign.id,
          })));
        }
      }
    }

    if (sources.includes("companies_house")) {
      const currentYear = new Date().getFullYear();
      const routesModule = (await import("./routes").catch(() => ({ runCompaniesHouseSearch: null }))) as any;
      const runCompaniesHouseSearch = routesModule.runCompaniesHouseSearch;
      if (typeof runCompaniesHouseSearch === "function") {
        const chResults = await (runCompaniesHouseSearch as any)({ year: currentYear - 10 });
        if (Array.isArray(chResults)) {
          results.push(...chResults.slice(0, 5).map(p => ({ ...p, campaign_id: campaign.id })));
        }
      }
    }
  } catch (err: any) {
    console.error(`[CampaignScheduler] Discovery error for campaign ${campaign.id}:`, err.message);
  }

  return results;
}

// ─── Step 2 & 3: Verify contact + dedup ──────────────────────────────────
async function verifyAndDedup(prospect: any, campaign: any): Promise<{ saved: boolean; prospectId?: number }> {
  try {
    const existing = await db.execute(sql`
      SELECT id FROM company_prospects
      WHERE campaign_id = ${campaign.id}
        AND (
          LOWER(company_name) = LOWER(${prospect.company_name})
          OR (website IS NOT NULL AND website = ${prospect.website ?? null})
        )
      LIMIT 1
    `);
    if (existing.rows.length > 0) return { saved: false };

    const contact = await findDecisionMaker(
      prospect.company_name,
      prospect.website || null,
      prospect.country || null,
      null
    );

    if (!contact.email || contact.confidence === "Low") {
      await db.execute(sql`
        INSERT INTO company_prospects (
          company_name, industry, location, country, website,
          milestone_type, source, campaign_id, quarantined,
          verification_failed_at, status, created_at, updated_at
        ) VALUES (
          ${prospect.company_name}, ${prospect.industry ?? null},
          ${prospect.location ?? null}, ${prospect.country ?? null},
          ${prospect.website ?? null}, ${prospect.milestone_type || "general"},
          ${prospect.source || "AI Discovery"}, ${campaign.id}, TRUE,
          NOW(), 'new', NOW(), NOW()
        )
      `);
      return { saved: false };
    }

    const insertRes = await db.execute(sql`
      INSERT INTO company_prospects (
        company_name, industry, location, country, website,
        milestone_type, source, campaign_id, quarantined,
        contact_name, contact_title, contact_email, contact_linkedin,
        contact_source, contact_confidence, contact_found_at,
        status, priority, created_at, updated_at
      ) VALUES (
        ${prospect.company_name}, ${prospect.industry ?? null},
        ${prospect.location ?? null}, ${prospect.country ?? null},
        ${prospect.website ?? null}, ${prospect.milestone_type || "general"},
        ${prospect.source || "AI Discovery"}, ${campaign.id}, FALSE,
        ${contact.name}, ${contact.title}, ${contact.email},
        ${contact.linkedIn ?? null}, ${contact.source}, ${contact.confidence},
        NOW(), 'new', 'medium', NOW(), NOW()
      ) RETURNING id
    `);
    const prospectId = (insertRes.rows[0] as any)?.id;
    return { saved: true, prospectId };
  } catch (err: any) {
    console.error(`[CampaignScheduler] verifyAndDedup error:`, err.message);
    return { saved: false };
  }
}

// ─── Step 4: Draft personalised email for prospect ────────────────────────
async function draftEmail(prospectId: number, campaign: any): Promise<boolean> {
  try {
    const pRes = await db.execute(sql`SELECT * FROM company_prospects WHERE id = ${prospectId}`);
    const prospect = pRes.rows[0] as any;
    if (!prospect || !prospect.contact_email) return false;
    if (await isSuppressed(prospect.contact_email)) return false;

    const alreadyDrafted = await db.execute(sql`
      SELECT id FROM pending_outreach_emails
      WHERE prospect_id = ${prospectId} AND status IN ('pending','sent','approved')
      LIMIT 1
    `);
    if (alreadyDrafted.rows.length > 0) return false;

    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    let subject = `Partnership opportunity — ${prospect.company_name}`;
    let body = `Dear ${prospect.contact_name || "there"},\n\nI wanted to reach out to introduce Event Perfekt and explore how we might support ${prospect.company_name} with event planning and management services.\n\n${campaign.target_audience ? `We specialise in serving ${campaign.target_audience}.` : "We deliver exceptional events across the UK and Nigeria."}\n\nWould you be open to a brief call to explore further?\n\nWarm regards,\nEvent Perfekt Team`;

    if (apiKey) {
      try {
        const toneMap: Record<string, string> = {
          professional: "professional and formal",
          warm: "warm and inviting",
          luxury: "premium and exclusive",
          friendly: "friendly and casual",
          personal: "personal and intimate",
        };
        const toneName = toneMap[campaign.email_tone] || "professional";

        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 500,
            messages: [
              {
                role: "system",
                content: `You are an expert B2B outreach copywriter for Event Perfekt, a premium event planning company. Write emails in a ${toneName} tone. Return JSON with keys "subject" and "body" only. Body should be plain text, 4-6 paragraphs, no bullet points.`,
              },
              {
                role: "user",
                content: `Write a personalised outreach email for:
Recipient: ${prospect.contact_name || "Decision Maker"}, ${prospect.contact_title || "Director"} at ${prospect.company_name}
Company sector: ${prospect.industry || "business services"}
Location: ${prospect.location || "UK"}
Campaign: ${campaign.name}
Campaign audience: ${campaign.target_audience || "businesses"}
Services to mention: ${campaign.description || "full event planning, corporate events, team celebrations"}
Tone: ${toneName}

Make it specific to their sector and role. Do not mention you are AI.`,
              },
            ],
          }),
        });
        const data = await resp.json() as any;
        const txt = data.choices?.[0]?.message?.content?.trim() || "{}";
        const parsed = JSON.parse(txt.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim());
        if (parsed.subject) subject = parsed.subject;
        if (parsed.body) body = parsed.body;
      } catch {}
    }

    const senderProfileRes = await db.execute(sql`SELECT * FROM sender_profiles WHERE is_default = TRUE LIMIT 1`);
    const sender = senderProfileRes.rows[0] as any;
    const fromEmail = sender?.from_email || "adminuk@eventperfekt.com";
    const fromName = sender?.sender_name || "Event Perfekt";

    await db.execute(sql`
      INSERT INTO pending_outreach_emails (
        prospect_id, company_name, contact_name, contact_title,
        to_email, from_email, from_name, subject, body,
        trigger_type, country_group, campaign_id, status, created_at
      ) VALUES (
        ${prospectId}, ${prospect.company_name}, ${prospect.contact_name ?? null},
        ${prospect.contact_title ?? null}, ${prospect.contact_email},
        ${fromEmail}, ${fromName}, ${subject}, ${body},
        'campaign', ${prospect.country || "UK"}, ${campaign.id},
        'pending', NOW()
      )
    `);
    return true;
  } catch (err: any) {
    console.error(`[CampaignScheduler] draftEmail error for prospect ${prospectId}:`, err.message);
    return false;
  }
}

// ─── Step 5+6: Auto-send for campaigns with approval_rule = 'auto' ────────
// Note: Only executes if CAMPAIGN_AUTO_SEND env var is true. By default, campaigns
// require manual approval (CAMPAIGN_AUTO_SEND=false) to prevent email flooding.
// Set CAMPAIGN_AUTO_SEND=true only after you've configured email recipients.
export async function autoSendPendingEmails(): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  
  if (!CAMPAIGN_AUTO_SEND) {
    console.log("[CampaignScheduler] Auto-send disabled (CAMPAIGN_AUTO_SEND=false). Campaigns require manual approval.");
    return { sent: 0, failed: 0 };
  }
  
  try {
    const pending = await db.execute(sql`
      SELECT poe.*, epc.approval_rule
      FROM pending_outreach_emails poe
      JOIN ep_prospect_campaigns epc ON epc.id = poe.campaign_id
      WHERE poe.status = 'pending'
        AND epc.approval_rule = 'auto'
        AND epc.status = 'active'
      ORDER BY poe.created_at ASC
    `);

    const { approveAndSendEmail } = await import("./outreach-routes");
    for (const email of pending.rows as any[]) {
      try {
        await approveAndSendEmail(Number(email.id), null);
        sent++;
      } catch {
        failed++;
      }
    }
    if (sent > 0) console.log(`[CampaignScheduler] Auto-sent ${sent} emails`);
  } catch (err: any) {
    console.error("[CampaignScheduler] Auto-send error:", err.message);
  }
  return { sent, failed };
}

// ─── Step 7+8: Handle positive reply notifications ────────────────────────
export async function sendPositiveReplyNotification(reply: any, prospectName: string, companyName: string, campaignName: string): Promise<void> {
  try {
    const subject = `Positive Reply — ${prospectName || companyName} — ${campaignName}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:#330311;color:white;padding:24px 28px;">
          <h1 style="margin:0;font-size:20px;">Event Perfekt — Positive Reply</h1>
          <p style="margin:6px 0 0;opacity:0.8;font-size:13px;">${campaignName}</p>
        </div>
        <div style="padding:28px;background:#fff;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="margin:0;font-weight:600;color:#166534;font-size:15px;">✅ Positive reply received</p>
          </div>
          <table style="width:100%;font-size:14px;margin-bottom:20px;">
            <tr><td style="color:#666;padding:4px 0;width:140px;">Contact:</td><td style="font-weight:600;">${prospectName || "Unknown"}</td></tr>
            <tr><td style="color:#666;padding:4px 0;">Company:</td><td style="font-weight:600;">${companyName}</td></tr>
            <tr><td style="color:#666;padding:4px 0;">Campaign:</td><td>${campaignName}</td></tr>
            <tr><td style="color:#666;padding:4px 0;">From:</td><td style="font-family:monospace;">${reply.from_email}</td></tr>
            <tr><td style="color:#666;padding:4px 0;">Subject:</td><td>${reply.subject || "—"}</td></tr>
          </table>
          <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 8px;font-weight:600;color:#333;">Reply content:</p>
            <p style="margin:0;color:#555;line-height:1.7;white-space:pre-wrap;">${(reply.body_text || "").slice(0, 1000)}</p>
          </div>
          <a href="https://eventperfekt.net/prospect-finder?tab=replies"
             style="background:#8B1538;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;">
            View in Prospect Intelligence
          </a>
        </div>
      </div>`;
    if (CAMPAIGN_APPROVAL_NOTIFY) {
      await emailService.sendEmail(CAMPAIGN_APPROVAL_EMAIL, subject, html);
      console.log(`[CampaignScheduler] Positive reply notification sent to ${CAMPAIGN_APPROVAL_EMAIL}`);
    }
  } catch (err: any) {
    console.error("[CampaignScheduler] Positive reply notification error:", err.message);
  }
}

// ─── Step 9: Daily 6pm summary ────────────────────────────────────────────
async function sendDailySummary(): Promise<void> {
  try {
    const campaigns = await db.execute(sql`
      SELECT c.*,
        COUNT(DISTINCT cp.id) FILTER (WHERE cp.created_at >= CURRENT_DATE AND cp.campaign_id = c.id) AS today_prospects,
        COUNT(DISTINCT poe.id) FILTER (WHERE poe.created_at >= CURRENT_DATE AND poe.campaign_id = c.id) AS today_drafted,
        COUNT(DISTINCT poe.id) FILTER (WHERE poe.sent_at >= CURRENT_DATE AND poe.campaign_id = c.id AND poe.status = 'sent') AS today_sent,
        COUNT(DISTINCT ir.id) FILTER (WHERE ir.received_at >= CURRENT_DATE AND ir.campaign_id = c.id) AS today_replies,
        COUNT(DISTINCT ir.id) FILTER (WHERE ir.received_at >= CURRENT_DATE AND ir.campaign_id = c.id AND ir.classification = 'positive') AS today_positive,
        COUNT(DISTINCT poe2.id) FILTER (WHERE poe2.campaign_id = c.id AND poe2.status = 'pending') AS pending_approval
      FROM ep_prospect_campaigns c
      LEFT JOIN company_prospects cp ON cp.campaign_id = c.id
      LEFT JOIN pending_outreach_emails poe ON poe.campaign_id = c.id
      LEFT JOIN pending_outreach_emails poe2 ON poe2.campaign_id = c.id
      LEFT JOIN inbound_replies ir ON ir.campaign_id = c.id
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY c.name
    `);

    const rows = campaigns.rows as any[];
    if (!rows.length) return;

    const totalProspects = rows.reduce((s, r) => s + Number(r.today_prospects || 0), 0);
    const totalSent = rows.reduce((s, r) => s + Number(r.today_sent || 0), 0);
    const totalPositive = rows.reduce((s, r) => s + Number(r.today_positive || 0), 0);
    const totalPending = rows.reduce((s, r) => s + Number(r.pending_approval || 0), 0);

    const campaignRows = rows.map(r => `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:10px 12px;font-weight:600;">${r.name}</td>
        <td style="padding:10px 12px;text-align:center;">${r.today_prospects || 0}</td>
        <td style="padding:10px 12px;text-align:center;">${r.today_drafted || 0}</td>
        <td style="padding:10px 12px;text-align:center;">${r.today_sent || 0}</td>
        <td style="padding:10px 12px;text-align:center;">${r.today_replies || 0}</td>
        <td style="padding:10px 12px;text-align:center;color:${Number(r.today_positive) > 0 ? "#166534" : "#666"};font-weight:${Number(r.today_positive) > 0 ? "700" : "400"};">${r.today_positive || 0}</td>
        <td style="padding:10px 12px;text-align:center;color:${Number(r.pending_approval) > 0 ? "#92400e" : "#666"};">${r.pending_approval || 0}</td>
      </tr>`).join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
        <div style="background:#330311;color:white;padding:24px 28px;">
          <h1 style="margin:0;font-size:20px;">Event Perfekt — Daily Summary</h1>
          <p style="margin:6px 0 0;opacity:0.8;font-size:13px;">${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div style="padding:28px;background:#fff;">
          <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
            ${[
              { label: "New Prospects", value: totalProspects, color: "#330311" },
              { label: "Emails Sent", value: totalSent, color: "#1d4ed8" },
              { label: "Positive Replies", value: totalPositive, color: "#166534" },
              { label: "Awaiting Approval", value: totalPending, color: totalPending > 0 ? "#92400e" : "#666" },
            ].map(s => `
              <div style="flex:1;min-width:120px;background:#f8f8f8;border-radius:8px;padding:14px;text-align:center;">
                <div style="font-size:26px;font-weight:700;color:${s.color};">${s.value}</div>
                <div style="color:#666;font-size:12px;margin-top:4px;">${s.label}</div>
              </div>`).join("")}
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f0f0f0;">
                <th style="padding:10px 12px;text-align:left;">Campaign</th>
                <th style="padding:10px 12px;text-align:center;">Prospects</th>
                <th style="padding:10px 12px;text-align:center;">Drafted</th>
                <th style="padding:10px 12px;text-align:center;">Sent</th>
                <th style="padding:10px 12px;text-align:center;">Replies</th>
                <th style="padding:10px 12px;text-align:center;">Positive</th>
                <th style="padding:10px 12px;text-align:center;">Pending</th>
              </tr>
            </thead>
            <tbody>${campaignRows}</tbody>
          </table>
          ${totalPending > 0 ? `
          <div style="margin-top:20px;background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:14px;">
            <p style="margin:0;font-weight:600;color:#713f12;">⚠ ${totalPending} email${totalPending !== 1 ? "s" : ""} waiting for approval</p>
          </div>` : ""}
          <div style="margin-top:24px;text-align:center;">
            <a href="https://eventperfekt.net/prospect-finder?tab=approval"
               style="background:#8B1538;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;">
              Review Approval Queue
            </a>
          </div>
        </div>
      </div>`;

    if (DAILY_SUMMARY_ENABLED) {
      await emailService.sendEmail(DAILY_SUMMARY_EMAIL, `EP Prospect Intelligence — Daily Summary ${new Date().toLocaleDateString("en-GB")}`, html);
      console.log(`[CampaignScheduler] Daily summary sent to ${DAILY_SUMMARY_EMAIL}`);
    }
  } catch (err: any) {
    console.error("[CampaignScheduler] Daily summary error:", err.message);
  }
}

// ─── Full campaign cycle (Steps 1–5) ─────────────────────────────────────
export async function runCampaignCycle(campaign: any): Promise<{
  prospectsAdded: number;
  emailsDrafted: number;
}> {
  console.log(`[CampaignScheduler] Running campaign: ${campaign.name} (id=${campaign.id})`);
  let prospectsAdded = 0;
  let emailsDrafted = 0;

  try {
    const discovered = await discoverProspects(campaign);

    for (const prospect of discovered) {
      const { saved, prospectId } = await verifyAndDedup(prospect, campaign);
      if (saved && prospectId) {
        prospectsAdded++;
        const drafted = await draftEmail(prospectId, campaign);
        if (drafted) emailsDrafted++;
      }
    }

    await db.execute(sql`
      UPDATE ep_prospect_campaigns
      SET last_run_at = NOW(), updated_at = NOW()
      WHERE id = ${campaign.id}
    `);

    console.log(`[CampaignScheduler] Campaign ${campaign.name}: +${prospectsAdded} prospects, ${emailsDrafted} emails drafted`);
  } catch (err: any) {
    console.error(`[CampaignScheduler] Campaign cycle error for ${campaign.name}:`, err.message);
  }

  return { prospectsAdded, emailsDrafted };
}

// ─── Run all active campaigns ─────────────────────────────────────────────
async function runAllActiveCampaigns(): Promise<void> {
  console.log("[CampaignScheduler] 7am run — processing all active campaigns...");
  try {
    const campaigns = await db.execute(sql`
      SELECT * FROM ep_prospect_campaigns WHERE status = 'active'
    `);

    let totalProspects = 0;
    let totalDrafted = 0;

    for (const campaign of campaigns.rows as any[]) {
      const { prospectsAdded, emailsDrafted } = await runCampaignCycle(campaign);
      totalProspects += prospectsAdded;
      totalDrafted += emailsDrafted;
    }

    await sendMorningBriefingEmail(totalProspects, totalDrafted, campaigns.rows as any[]);
  } catch (err: any) {
    console.error("[CampaignScheduler] Error running all campaigns:", err.message);
  }
}

async function sendMorningBriefingEmail(totalProspects: number, totalDrafted: number, campaigns: any[]): Promise<void> {
  try {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:#330311;color:white;padding:24px 28px;">
          <h1 style="margin:0;font-size:20px;">Event Perfekt — Morning Briefing</h1>
          <p style="margin:6px 0 0;opacity:0.8;font-size:13px;">Prospect Intelligence — ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div style="padding:28px;background:#fff;">
          <p>Good morning,</p>
          <p>Your prospect campaigns ran this morning. Here is what was found:</p>
          <div style="display:flex;gap:16px;margin:20px 0;">
            <div style="flex:1;background:#f8f8f8;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#330311;">${totalProspects}</div>
              <div style="color:#666;font-size:13px;">New Prospects</div>
            </div>
            <div style="flex:1;background:#f8f8f8;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#330311;">${campaigns.length}</div>
              <div style="color:#666;font-size:13px;">Campaigns Run</div>
            </div>
            <div style="flex:1;background:#f8f8f8;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#330311;">${totalDrafted}</div>
              <div style="color:#666;font-size:13px;">Emails Ready</div>
            </div>
          </div>
          <div style="margin:24px 0;text-align:center;">
            <a href="https://eventperfekt.net/prospect-finder?tab=approval"
               style="background:#8B1538;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;">
              Review &amp; Approve Emails
            </a>
          </div>
        </div>
      </div>`;
    if (MORNING_BRIEF_ENABLED) {
      await emailService.sendEmail(MORNING_BRIEF_EMAIL, `Good morning — ${totalProspects} new prospects found today`, html);
      console.log(`[CampaignScheduler] Morning brief sent to ${MORNING_BRIEF_EMAIL}`);
    }
  } catch (err: any) {
    console.error("[CampaignScheduler] Morning briefing error:", err.message);
  }
}

// ─── Scheduler with precise UK time crons ────────────────────────────────
function scheduleAt(targetHour: number, targetMinute: number, fn: () => void, label: string): void {
  const tick = () => {
    const now = ukNow();
    const h = now.getHours();
    const m = now.getMinutes();
    if (h === targetHour && m === targetMinute) {
      console.log(`[CampaignScheduler] Firing ${label}`);
      fn();
    }
  };
  setInterval(tick, 60 * 1000);
  console.log(`[CampaignScheduler] Scheduled ${label} at ${String(targetHour).padStart(2, "0")}:${String(targetMinute).padStart(2, "0")} UK time`);
}

export function startCampaignScheduler(): void {
  scheduleAt(7, 0, () => runAllActiveCampaigns(), "7am prospect discovery");
  scheduleAt(9, 0, () => {
    if (isBusinessHours()) autoSendPendingEmails();
  }, "9am auto-send");
  scheduleAt(18, 0, () => sendDailySummary(), "6pm daily summary");
  console.log("[CampaignScheduler] Started — 7am discovery, 9am auto-send, 6pm summary");
}
