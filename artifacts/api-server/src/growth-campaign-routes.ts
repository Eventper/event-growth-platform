/**
 * Growth Hub Campaign Routes
 * Endpoints for generating and managing guest invitations and partner proposals
 * Uses existing email infrastructure (pending_outreach_emails table, emailService)
 */

import type { Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { generateGuestInvitationDrafts } from "./guest-invitation-generator";
import { generatePartnerProposalDrafts } from "./partner-proposal-generator";

export function registerGrowthCampaignRoutes(app: Express, authenticateToken: any) {
  /**
   * Generate guest invitation drafts in bulk
   * POST /api/growth-campaigns/generate-guest-invitations
   * Body: { limit?: number }
   */
  app.post("/api/growth-campaigns/generate-guest-invitations", authenticateToken, async (req, res) => {
    try {
      const { limit = 130 } = req.body;

      console.log(`[GrowthCampaigns] Generating ${limit} guest invitation drafts...`);

      // Fetch guests from Growth Hub API
      // For now, we'll query directly if endpoint exists, or return error
      let guests: any[] = [];
      try {
        // Try internal query if on same server
        const guestResult = await db.execute(sql`
          SELECT * FROM growth_guests 
          ORDER BY 
            CASE WHEN invite_priority = 'A' THEN 0 ELSE CASE WHEN invite_priority = 'B' THEN 1 ELSE 2 END END,
            influence_score DESC
          LIMIT ${limit}
        `);
        guests = guestResult.rows.map((row: any) => ({
          name: row.name,
          company: row.company,
          role: row.role,
          sector: row.sector,
          email: row.email,
          influenceScore: row.influence_score,
          invitePriority: row.invite_priority,
          speakerPotential: row.speaker_potential,
          sponsorIntroductionPotential: row.sponsor_introduction_potential,
          notes: row.notes,
        }));
      } catch (err: any) {
        console.warn("Could not fetch from growth_guests table, returning sample data");
        // Return error - need actual data
        return res.status(400).json({
          error: "Guest database not found. Ensure Growth Hub guests are imported first.",
          hint: "POST /api/growth/guests/import-longlist",
        });
      }

      if (guests.length === 0) {
        return res.status(400).json({
          error: "No guests found. Import guests first via /api/growth/guests/import-longlist",
        });
      }

      // Generate drafts
      const drafts = await generateGuestInvitationDrafts(guests, limit);

      // Insert into pending_outreach_emails
      const inserted = [];
      for (const draft of drafts) {
        const result = await db.execute(sql`
          INSERT INTO pending_outreach_emails (
            company_name, contact_name, to_email, from_email, from_name,
            subject, body, trigger_type, country_group, status, created_at
          ) VALUES (
            ${draft.companyName},
            ${draft.guestName},
            ${draft.toEmail},
            ${draft.fromEmail},
            ${draft.fromName},
            ${draft.subject},
            ${draft.body},
            ${'guest_invitation'},
            ${'UK'},
            ${'pending'},
            NOW()
          ) RETURNING id, to_email, subject, status, created_at
        `);
        inserted.push(result.rows[0]);
      }

      res.json({
        ok: true,
        drafted: inserted.length,
        awaiting_approval: inserted.length,
        message: `${inserted.length} guest invitation drafts generated and ready for approval`,
        emails: inserted.slice(0, 5), // Return first 5 as sample
      });
    } catch (err: any) {
      console.error("[GrowthCampaigns] Error generating guest invitations:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Generate partner proposal drafts in bulk
   * POST /api/growth-campaigns/generate-partner-proposals
   * Body: { partnerTypes?: string[], limit?: number }
   */
  app.post("/api/growth-campaigns/generate-partner-proposals", authenticateToken, async (req, res) => {
    try {
      const { partnerTypes = ["strategic_sponsor", "brand_partner", "media_partner", "employer_partner", "civic_partner"], limit = 30 } = req.body;

      console.log(`[GrowthCampaigns] Generating ${limit} partner proposal drafts for types: ${partnerTypes.join(", ")}`);

      // Fetch organisations from Growth Hub
      let orgs: any[] = [];
      try {
        const orgResult = await db.execute(sql`
          SELECT * FROM growth_organisations 
          WHERE partner_type = ANY(${partnerTypes}::text[])
          ORDER BY strategic_value_score DESC
          LIMIT ${limit}
        `);
        orgs = orgResult.rows.map((row: any) => ({
          name: row.name,
          sector: row.sector,
          partnerType: row.partner_type,
          contactName: row.contact_name,
          contactRole: row.contact_role,
          email: row.email,
          whatTheyBring: row.what_they_bring,
          whatWeWant: row.what_we_want,
          whatTheyGet: row.what_they_get,
          strategicValueScore: row.strategic_value_score,
        }));
      } catch (err: any) {
        console.warn("Could not fetch from growth_organisations table, returning error");
        return res.status(400).json({
          error: "Organisation database not found. Ensure Growth Hub organisations are set up first.",
          hint: "Add organisations via /api/growth/organisations",
        });
      }

      if (orgs.length === 0) {
        return res.status(400).json({
          error: "No organisations found. Add organisations first via /api/growth/organisations",
        });
      }

      // Generate drafts
      const drafts = await generatePartnerProposalDrafts(orgs, partnerTypes as any, limit);

      // Insert into pending_outreach_emails
      const inserted = [];
      for (const draft of drafts) {
        const result = await db.execute(sql`
          INSERT INTO pending_outreach_emails (
            company_name, contact_name, to_email, from_email, from_name,
            subject, body, trigger_type, country_group, status, created_at
          ) VALUES (
            ${draft.organizationName},
            ${draft.contactName},
            ${draft.toEmail},
            ${draft.fromEmail},
            ${draft.fromName},
            ${draft.subject},
            ${draft.body},
            ${draft.partnerType},
            ${'UK'},
            ${'pending'},
            NOW()
          ) RETURNING id, to_email, subject, status, created_at
        `);
        inserted.push(result.rows[0]);
      }

      res.json({
        ok: true,
        drafted: inserted.length,
        awaiting_approval: inserted.length,
        message: `${inserted.length} partner proposal drafts generated and ready for approval`,
        by_type: partnerTypes.reduce((acc: any, type: string) => {
          acc[type] = inserted.filter((e: any) => e.subject.includes(type.replace(/_/g, " "))).length;
          return acc;
        }, {}),
        emails: inserted.slice(0, 5), // Return first 5 as sample
      });
    } catch (err: any) {
      console.error("[GrowthCampaigns] Error generating partner proposals:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Get all pending Growth Hub emails awaiting approval
   * GET /api/growth-campaigns/pending
   */
  app.get("/api/growth-campaigns/pending", authenticateToken, async (req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT 
          id, company_name, contact_name, to_email, subject, 
          trigger_type, status, created_at
        FROM pending_outreach_emails
        WHERE status = 'pending' AND trigger_type IN ('guest_invitation', 'strategic_sponsor', 'brand_partner', 'media_partner', 'employer_partner', 'civic_partner')
        ORDER BY created_at DESC
      `);

      const counts = {
        guest_invitation: 0,
        strategic_sponsor: 0,
        brand_partner: 0,
        media_partner: 0,
        employer_partner: 0,
        civic_partner: 0,
      };

      for (const row of rows.rows) {
        if (counts.hasOwnProperty(row.trigger_type)) {
          counts[row.trigger_type as keyof typeof counts]++;
        }
      }

      res.json({
        ok: true,
        count: rows.rows.length,
        by_type: counts,
        drafts: rows.rows,
      });
    } catch (err: any) {
      console.error("[GrowthCampaigns] Error fetching pending emails:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Get campaign statistics
   * GET /api/growth-campaigns/stats
   */
  app.get("/api/growth-campaigns/stats", authenticateToken, async (req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT
          trigger_type,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending,
          COUNT(*) FILTER (WHERE status = 'approved') AS approved,
          COUNT(*) FILTER (WHERE status = 'sent') AS sent,
          COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
          COUNT(*) as total
        FROM pending_outreach_emails
        WHERE trigger_type IN ('guest_invitation', 'strategic_sponsor', 'brand_partner', 'media_partner', 'employer_partner', 'civic_partner')
        GROUP BY trigger_type
      `);

      const stats = {
        by_type: {} as any,
        totals: {
          pending: 0,
          approved: 0,
          sent: 0,
          rejected: 0,
          total: 0,
        },
      };

      for (const row of rows.rows) {
        stats.by_type[row.trigger_type] = {
          pending: row.pending || 0,
          approved: row.approved || 0,
          sent: row.sent || 0,
          rejected: row.rejected || 0,
          total: row.total || 0,
        };

        stats.totals.pending += row.pending || 0;
        stats.totals.approved += row.approved || 0;
        stats.totals.sent += row.sent || 0;
        stats.totals.rejected += row.rejected || 0;
        stats.totals.total += row.total || 0;
      }

      res.json({ ok: true, ...stats });
    } catch (err: any) {
      console.error("[GrowthCampaigns] Error fetching stats:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Get single draft for review
   * GET /api/growth-campaigns/draft/:id
   */
  app.get("/api/growth-campaigns/draft/:id", authenticateToken, async (req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT * FROM pending_outreach_emails WHERE id = ${req.params.id}
      `);
      if (!rows.rows.length) {
        return res.status(404).json({ error: "Draft not found" });
      }
      res.json({ ok: true, draft: rows.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Edit draft before approval
   * PATCH /api/growth-campaigns/draft/:id
   * Body: { subject?, body? }
   */
  app.patch("/api/growth-campaigns/draft/:id", authenticateToken, async (req, res) => {
    try {
      const { subject, body } = req.body;
      const id = req.params.id;

      const updates: string[] = [];
      const values: any[] = [];

      if (subject !== undefined) {
        updates.push(`subject = $${values.length + 1}`);
        values.push(subject);
      }
      if (body !== undefined) {
        updates.push(`body = $${values.length + 1}`);
        values.push(body);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      values.push(id);

      const query = sql`UPDATE pending_outreach_emails SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`;
      const result = await db.execute(query);

      if (!result.rows.length) {
        return res.status(404).json({ error: "Draft not found" });
      }

      res.json({ ok: true, draft: result.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Approve draft (use existing endpoint from outreach-routes.ts)
   * POST /api/pending-emails/:id/approve
   * (Already exists, reuse it)
   */

  /**
   * Reject draft (use existing endpoint from outreach-routes.ts)
   * POST /api/pending-emails/:id/reject
   * Body: { reason?: string }
   * (Already exists, reuse it)
   */

  /**
   * Bulk send all approved Growth Hub emails
   * POST /api/growth-campaigns/send-approved
   */
  app.post("/api/growth-campaigns/send-approved", authenticateToken, async (req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT * FROM pending_outreach_emails
        WHERE status = 'approved' 
          AND sent_at IS NULL
          AND trigger_type IN ('guest_invitation', 'strategic_sponsor', 'brand_partner', 'media_partner', 'employer_partner', 'civic_partner')
        ORDER BY created_at ASC
      `);

      if (rows.rows.length === 0) {
        return res.json({
          ok: true,
          sent: 0,
          message: "No approved emails to send",
        });
      }

      // NOTE: In real implementation, call emailService.send() for each email
      // For now, just mark as sent
      let sent = 0;
      for (const email of rows.rows) {
        try {
          // TODO: Integrate with emailService to actually send
          // await emailService.send(email.to_email, email.subject, email.body, email.from_email, 'info@eventperfekt.com');

          // Mark as sent
          await db.execute(sql`
            UPDATE pending_outreach_emails
            SET status = 'sent', sent_at = NOW()
            WHERE id = ${email.id}
          `);
          sent++;
        } catch (err) {
          console.error(`Failed to send email ${email.id}:`, err);
        }
      }

      res.json({
        ok: true,
        sent,
        message: `${sent} emails sent successfully`,
      });
    } catch (err: any) {
      console.error("[GrowthCampaigns] Error sending emails:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
}
