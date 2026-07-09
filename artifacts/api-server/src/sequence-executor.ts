/**
 * Sequence Executor — daily cron at 06:00 UK time
 * ------------------------------------------------
 * Finds active sequences with steps due today, checks suppression,
 * checks for existing replies, and drops draft emails into the
 * pending_outreach_emails approval queue (human still approves each one).
 *
 * No auto-send. Every email requires manual approval click — same as touch 1.
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import { isSuppressed } from "./suppression";
import { draftOutreachEmail } from "./outreach-routes";

// ─── Run one cycle ────────────────────────────────────────────────────────────
export async function runSequenceExecutor(): Promise<{
  checked: number;
  drafted: number;
  skipped: number;
  errors: number;
}> {
  console.log("[SequenceExecutor] Running...");
  let checked = 0, drafted = 0, skipped = 0, errors = 0;

  try {
    // Find all active sequences and their pending touches that are due today
    // scheduled_day is a relative offset from started_at
    const rows = await db.execute(sql`
      SELECT
        sm.id AS msg_id,
        sm.touch_number,
        sm.channel,
        sm.scheduled_day,
        sm.subject,
        sm.body,
        ps.id AS seq_id,
        ps.prospect_id,
        ps.started_at,
        cp.company_name,
        cp.contact_email,
        cp.contact_name,
        cp.contact_title,
        cp.country,
        cp.industry,
        cp.milestone_type,
        cp.milestone_detail,
        cp.location,
        cp.founded_year,
        cp.website
      FROM sequenced_messages sm
      JOIN prospect_sequences ps ON ps.id = sm.sequence_id
      JOIN company_prospects cp ON cp.id = ps.prospect_id
      WHERE sm.status = 'pending'
        AND sm.channel = 'email'
        AND ps.status = 'active'
        AND (ps.paused IS NULL OR ps.paused = FALSE)
        AND ps.started_at IS NOT NULL
        AND DATE(ps.started_at + (sm.scheduled_day || ' days')::INTERVAL) <= CURRENT_DATE
    `);

    const steps = rows.rows as any[];
    console.log(`[SequenceExecutor] Found ${steps.length} steps due`);

    for (const step of steps) {
      checked++;
      try {
        const { prospect_id, contact_email, company_name } = step;

        // 1. Skip if suppressed
        if (contact_email && await isSuppressed(contact_email)) {
          await db.execute(sql`
            UPDATE sequenced_messages SET status = 'skipped', updated_at = NOW()
            WHERE id = ${step.msg_id}
          `).catch(() => {});
          // Cancel sequence
          await db.execute(sql`
            UPDATE prospect_sequences SET status = 'cancelled', paused = TRUE, paused_reason = 'suppressed'
            WHERE id = ${step.seq_id}
          `).catch(() => {});
          console.log(`[SequenceExecutor] Skipped ${company_name} — suppressed`);
          skipped++;
          continue;
        }

        // 2. Skip if prospect has a positive/unclassified reply awaiting review
        const hasActiveReply = await db.execute(sql`
          SELECT id FROM inbound_replies
          WHERE prospect_id = ${prospect_id}
            AND classification IN ('positive', 'unclassified')
            AND actioned = FALSE
          LIMIT 1
        `);
        if ((hasActiveReply.rows as any[]).length > 0) {
          console.log(`[SequenceExecutor] Skipped ${company_name} — has unactioned reply`);
          skipped++;
          continue;
        }

        // 3. Skip if already in pending queue for this prospect+touch
        const alreadyQueued = await db.execute(sql`
          SELECT id FROM pending_outreach_emails
          WHERE prospect_id = ${prospect_id}
            AND sequence_touch = ${step.touch_number}
            AND status IN ('pending', 'sent', 'approved')
          LIMIT 1
        `);
        if ((alreadyQueued.rows as any[]).length > 0) {
          skipped++;
          continue;
        }

        // 4. Generate draft using existing draftOutreachEmail helper,
        //    or fall back to the stored body if AI drafting fails
        let subject = step.subject;
        let body = step.body || `Hi there,\n\nFollowing up on my previous email. I'd love to explore how Event Perfekt can support your upcoming events.\n\nBest,\nTolu`;

        try {
          const prospect = {
            company_name: step.company_name,
            country: step.country,
            industry: step.industry,
            milestone_type: step.milestone_type,
            milestone_detail: step.milestone_detail,
            location: step.location,
            founded_year: step.founded_year,
            website: step.website,
          };

          // Use a named contact
          const { DecisionMaker } = await import("./contact-finder").catch(() => ({ DecisionMaker: null })) as any;
          const contact = {
            name: step.contact_name || "there",
            firstName: (step.contact_name || "there").split(" ")[0],
            lastName: "",
            title: step.contact_title || "Director",
            email: contact_email,
            emailPattern: null,
            emailGrade: null,
            linkedIn: null,
            linkedInSearch: "",
            confidence: "Medium" as any,
            source: "sequence",
            sourceNote: `Follow-up touch ${step.touch_number}`,
            alternativeContacts: [],
          };

          // For touches 2-4, add sequence context to the subject
          if (step.touch_number === 2) {
            subject = subject || `Following up — ${step.company_name}`;
          } else if (step.touch_number === 3) {
            subject = subject || `One more thought — ${step.company_name}`;
          } else if (step.touch_number === 4) {
            subject = subject || `Should I close the file? — ${step.company_name}`;
          }

          // Use AI to regenerate the body for follow-ups
          const OPENAI_KEY =
            process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
            process.env.OPENAI_API_KEY;
          if (OPENAI_KEY && step.touch_number > 1) {
            const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_KEY}`,
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                max_tokens: 200,
                temperature: 0.7,
                messages: [
                  {
                    role: "system",
                    content: `You are writing follow-up email touch ${step.touch_number} of 4 for Event Perfekt, a luxury UK/Nigeria event planning company. 
Touch 2: Light bump — "just checking my email landed". Short, under 60 words.
Touch 3: New angle — mention a specific event type or sector insight. Under 80 words.
Touch 4: Final — "should I close the file?" tone. Under 50 words. Professional, not desperate.
Always open with "Hi [firstName]," and close professionally. Plain text only. No HTML.`,
                  },
                  {
                    role: "user",
                    content: `Write touch ${step.touch_number} for: ${contact.firstName} at ${step.company_name} (${step.industry || "business"} in ${step.location || "UK"}). Milestone: ${step.milestone_type}.`,
                  },
                ],
              }),
              signal: AbortSignal.timeout(15_000),
            });
            const aiData = (await aiRes.json()) as any;
            const aiBody = aiData.choices?.[0]?.message?.content?.trim();
            if (aiBody && aiBody.length > 20) {
              body = aiBody;
            }
          }
        } catch (draftErr: any) {
          console.warn(`[SequenceExecutor] Draft generation warning for touch ${step.touch_number}:`, draftErr.message);
          // Continue with fallback body
        }

        // 5. Look up sender profile
        const senderRows = await db.execute(sql`
          SELECT * FROM sender_profiles WHERE is_default = TRUE LIMIT 1
        `);
        const sender = (senderRows.rows[0] as any) || {
          from_email: "admin@eventperfekt.com",
          sender_name: "Tolu Bally",
          sender_title: "Director",
          company_name: "Event Perfekt",
        };

        // 6. Insert draft into approval queue
        await db.execute(sql`
          INSERT INTO pending_outreach_emails
            (prospect_id, company_name, contact_name, contact_title, to_email,
             from_email, from_name, subject, body, trigger_type, country_group, status, sequence_touch, created_at)
          VALUES
            (${prospect_id}, ${step.company_name}, ${step.contact_name}, ${step.contact_title}, ${contact_email},
             ${sender.from_email}, ${sender.sender_name}, ${subject}, ${body},
             'follow_up', ${step.country || 'UK'}, 'pending', ${step.touch_number}, NOW())
          ON CONFLICT DO NOTHING
        `);

        // 7. Mark sequenced_message as 'drafted'
        await db.execute(sql`
          UPDATE sequenced_messages SET status = 'drafted', updated_at = NOW()
          WHERE id = ${step.msg_id}
        `);

        console.log(`[SequenceExecutor] Drafted touch ${step.touch_number} for ${step.company_name}`);
        drafted++;
      } catch (err: any) {
        console.error(`[SequenceExecutor] Error on step ${step.msg_id}:`, err.message);
        errors++;
      }
    }
  } catch (err: any) {
    console.error("[SequenceExecutor] Fatal error:", err.message);
    errors++;
  }

  console.log(`[SequenceExecutor] Done — ${checked} checked, ${drafted} drafted, ${skipped} skipped, ${errors} errors`);
  return { checked, drafted, skipped, errors };
}

// ─── Schedule at 06:00 UK time daily ─────────────────────────────────────────
export function startSequenceExecutor() {
  function msUntil6amUK(): number {
    const now = new Date();
    // Use Europe/London timezone
    const londonNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
    const target = new Date(londonNow);
    target.setHours(6, 0, 0, 0);
    if (target <= londonNow) target.setDate(target.getDate() + 1);
    return target.getTime() - londonNow.getTime();
  }

  const delay = msUntil6amUK();
  console.log(`[SequenceExecutor] Scheduled — first run in ${Math.round(delay / 60000)} minutes`);

  setTimeout(function fire() {
    runSequenceExecutor().catch(err =>
      console.error("[SequenceExecutor] Run error:", err.message)
    );
    // Reschedule next day
    setTimeout(fire, 24 * 60 * 60 * 1000);
  }, delay);
}
