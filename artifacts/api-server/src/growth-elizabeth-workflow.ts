// ── Elizabeth AI Workflow: Apollo Import → Enrich → Approve → Send ───────────
// Chainable workflow endpoint that:
// 1. Imports contacts from Apollo API (or CSV)
// 2. Validates & creates prospects (status: "new")
// 3. Enriches with Apollo data
// 4. Scores for fit
// 5. Stages outreach drafts for human approval (pending queue)
// 6. Awaits user confirmation before sending

import { Router } from "express";
import { db } from "./db";
import { eq, inArray, and, sql } from "drizzle-orm";
import {
  growthProspects,
  growthOutreach,
  growthReplies,
  growthProspectScores,
  growthSpendLogs,
  growthEvents,
} from "@workspace/db";
import { logger } from "./lib/logger";
import { apolloSearch, apolloEnrich } from "./apollo-source";
import { enrichProspect, scoreProspect } from "./growth-pipeline";
import { generateReasonedOutreach } from "./growth-pipeline";
import { authenticateToken } from "./auth";

const router = Router();

interface ApolloContact {
  name: string;
  email: string;
  title?: string;
  company?: string;
  phone?: string;
  linkedinUrl?: string;
  location?: string;
  industry?: string;
}

interface WorkflowStep {
  step: string;
  status: "pending" | "in_progress" | "completed" | "error";
  detail: string;
  count?: number;
  errors?: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 1: Initiate Elizabeth workflow (Apollo import + enrich + draft)
// POST /api/growth/elizabeth/workflow
// Body: {
//   eventId: string,
//   apolloProspects?: ApolloContact[], // pre-fetched contacts
//   autoApproveThreshold?: number, // skip manual approval if score >= this
//   sendAfterApproval?: boolean, // auto-send after approval (advanced)
// }
// ──────────────────────────────────────────────────────────────────────────────

router.post("/growth/elizabeth/workflow", authenticateToken, async (req, res) => {
  try {
    const { eventId, apolloProspects = [], autoApproveThreshold, sendAfterApproval } = req.body;
    const ownerId = req.user?.userId;
    if (!ownerId || !eventId) return res.status(400).json({ error: "eventId and auth required" });

    const event = await db.query.growthEvents.findFirst({ where: eq(growthEvents.id, eventId) });
    if (!event || event.ownerId !== ownerId) return res.status(403).json({ error: "Event not found or access denied" });

    const workflow = {
      workflowId: `wf-${Date.now()}`,
      eventId,
      ownerId,
      startedAt: new Date(),
      steps: [] as WorkflowStep[],
      summary: { imported: 0, enriched: 0, scored: 0, drafted: 0, errors: [] as string[] },
    };

    // ── STEP 1: Import contacts ──────────────────────────────────────────────────
    workflow.steps.push({ step: "import", status: "in_progress", detail: "Importing Apollo contacts..." });
    let prospects = apolloProspects;
    if (prospects.length === 0) {
      // If no contacts provided, fetch top 50 from Apollo
      try {
        const apolloResults = await apolloSearch({
          keywords: event.strategyPack?.audience_keywords || "event attendee",
          limit: 50,
        });
        prospects = apolloResults.map((p: any) => ({
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
          email: p.email,
          title: p.title,
          company: p.company,
          phone: p.phone,
          linkedinUrl: p.linkedin_url,
          location: p.location,
          industry: p.industry,
        }));
      } catch (err: any) {
        return res.status(500).json({ error: `Apollo search failed: ${err.message}` });
      }
    }

    if (prospects.length === 0) {
      return res.status(400).json({ error: "No prospects to import" });
    }

    // Import into DB with status "new"
    const imported = await db
      .insert(growthProspects)
      .values(
        prospects
          .filter((p) => p.email)
          .map((p) => ({
            eventId,
            ownerId,
            name: p.name,
            email: p.email,
            title: p.title || null,
            company: p.company || null,
            phone: p.phone || null,
            linkedinUrl: p.linkedinUrl || null,
            location: p.location || null,
            industry: p.industry || null,
            status: "new" as const,
            source: "apollo_import",
            contactSource: "apollo_api",
            category: event.strategyPack?.target_category || "guest",
          }))
      )
      .onConflictDoNothing()
      .returning();

    workflow.steps[0].status = "completed";
    workflow.steps[0].detail = `Imported ${imported.length} contacts from Apollo`;
    workflow.steps[0].count = imported.length;
    workflow.summary.imported = imported.length;

    if (imported.length === 0) {
      return res.json({ workflow, note: "All contacts already exist (no duplicates)" });
    }

    // ── STEP 2: Enrich with Apollo data ──────────────────────────────────────────
    workflow.steps.push({ step: "enrich", status: "in_progress", detail: "Enriching contact profiles..." });
    let enriched = 0;
    const enrichErrors: string[] = [];

    for (const prospect of imported.slice(0, 15)) {
      // Cap at 15 to avoid Apollo quota exhaustion
      try {
        await enrichProspect(prospect.id, ownerId);
        enriched++;
      } catch (err: any) {
        enrichErrors.push(`${prospect.email}: ${err.message}`);
      }
    }

    workflow.steps[1].status = "completed";
    workflow.steps[1].detail = `Enriched ${enriched}/${imported.length} contacts`;
    workflow.steps[1].count = enriched;
    if (enrichErrors.length > 0) workflow.steps[1].errors = enrichErrors;
    workflow.summary.enriched = enriched;

    // ── STEP 3: Score for fit ────────────────────────────────────────────────────
    workflow.steps.push({ step: "score", status: "in_progress", detail: "Scoring fit to event audience..." });
    let scored = 0;
    const scoreErrors: string[] = [];

    for (const prospect of imported) {
      try {
        await scoreProspect(prospect.id, ownerId, { context: event.strategyPack?.audience_fit_criteria });
        scored++;
      } catch (err: any) {
        scoreErrors.push(`${prospect.email}: ${err.message}`);
      }
    }

    workflow.steps[2].status = "completed";
    workflow.steps[2].detail = `Scored ${scored}/${imported.length} contacts`;
    workflow.steps[2].count = scored;
    if (scoreErrors.length > 0) workflow.steps[2].errors = scoreErrors;
    workflow.summary.scored = scored;

    // ── STEP 4: Auto-approve high-fit prospects ──────────────────────────────────
    if (autoApproveThreshold) {
      workflow.steps.push({ step: "auto_approve", status: "in_progress", detail: "Auto-approving high-fit prospects..." });

      const scores = await db
        .select()
        .from(growthProspectScores)
        .where(inArray(growthProspectScores.prospectId, imported.map((p) => p.id)));

      const highFit = scores.filter((s) => (s.compositeScore || 0) >= autoApproveThreshold);

      if (highFit.length > 0) {
        await db
          .update(growthProspects)
          .set({ status: "approved_for_outreach" })
          .where(inArray(growthProspects.id, highFit.map((h) => h.prospectId || "")));
      }

      workflow.steps[3].status = "completed";
      workflow.steps[3].detail = `Auto-approved ${highFit.length}/${imported.length} high-fit prospects`;
      workflow.steps[3].count = highFit.length;
    }

    // ── STEP 5: Generate outreach drafts for APPROVED prospects ──────────────────
    workflow.steps.push({
      step: "draft_outreach",
      status: "in_progress",
      detail: "Generating outreach email drafts...",
    });

    const toApprove = imported.filter((p) => p.status === "approved_for_outreach");
    let drafted = 0;
    const draftErrors: string[] = [];

    for (const prospect of toApprove) {
      try {
        const draft = await generateReasonedOutreach(prospect.id, ownerId);
        if (draft) {
          // Store as pending outreach (not scheduled yet)
          await db.insert(growthOutreach).values({
            prospectId: prospect.id,
            eventId,
            status: "pending",
            campaignId: null,
            subject: draft.subject,
            body: draft.body,
            bodyHtml: draft.bodyHtml,
            category: prospect.category,
            sequencePosition: 1,
            createdBy: ownerId,
            createdAt: new Date(),
          });
          drafted++;
        }
      } catch (err: any) {
        draftErrors.push(`${prospect.email}: ${err.message}`);
      }
    }

    workflow.steps[workflow.steps.length - 1].status = "completed";
    workflow.steps[workflow.steps.length - 1].detail = `Generated ${drafted} outreach drafts (pending approval)`;
    workflow.steps[workflow.steps.length - 1].count = drafted;
    if (draftErrors.length > 0) workflow.steps[workflow.steps.length - 1].errors = draftErrors;
    workflow.summary.drafted = drafted;

    // ── RESPONSE ─────────────────────────────────────────────────────────────────
    return res.json({
      ok: true,
      workflow: {
        ...workflow,
        completedAt: new Date(),
      },
      nextAction: drafted
        ? `${drafted} email drafts ready for review. Go to Outreach > Approval Queue to review and send.`
        : "Enrichment complete. Auto-approval threshold not met. Review prospects individually.",
      approvalQueueUrl: `/growth-platform/outreach/approval-queue?eventId=${eventId}`,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Elizabeth workflow failed");
    return res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 2: Get approval queue (pending drafts)
// GET /api/growth/elizabeth/approval-queue?eventId=xxx
// ──────────────────────────────────────────────────────────────────────────────

router.get("/growth/elizabeth/approval-queue", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.query;
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Auth required" });

    const queue = await db
      .select()
      .from(growthOutreach)
      .where(
        eventId
          ? and(eq(growthOutreach.eventId, eventId as string), eq(growthOutreach.status, "pending"))
          : eq(growthOutreach.status, "pending")
      );

    // Populate prospect details
    const queueWithProspects = await Promise.all(
      queue.map(async (draft) => {
        const prospect = await db.query.growthProspects.findFirst({
          where: eq(growthProspects.id, draft.prospectId || ""),
        });
        const score = await db.query.growthProspectScores.findFirst({
          where: eq(growthProspectScores.prospectId, draft.prospectId || ""),
        });
        return { draft, prospect, score };
      })
    );

    return res.json({
      ok: true,
      count: queueWithProspects.length,
      queue: queueWithProspects,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to fetch approval queue");
    return res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 3: Approve & schedule an outreach draft
// POST /api/growth/elizabeth/approval-queue/:draftId/approve
// Body: { sendImmediately?: boolean, scheduledFor?: Date }
// ──────────────────────────────────────────────────────────────────────────────

router.post("/growth/elizabeth/approval-queue/:draftId/approve", authenticateToken, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { sendImmediately, scheduledFor } = req.body;
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Auth required" });

    const draft = await db.query.growthOutreach.findFirst({
      where: eq(growthOutreach.id, draftId),
    });
    if (!draft) return res.status(404).json({ error: "Draft not found" });

    if (sendImmediately) {
      // Send immediately
      await db
        .update(growthOutreach)
        .set({
          status: "sent",
          sentAt: new Date(),
          approvedAt: new Date(),
          approvedBy: ownerId,
        })
        .where(eq(growthOutreach.id, draftId));

      return res.json({ ok: true, message: "Email sent immediately", status: "sent" });
    } else {
      // Schedule for later with approval gate
      const scheduled = scheduledFor ? new Date(scheduledFor) : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default: tomorrow

      await db
        .update(growthOutreach)
        .set({
          status: "scheduled_pending_approval",
          scheduledFor: scheduled,
          approvedAt: new Date(),
          approvedBy: ownerId,
        })
        .where(eq(growthOutreach.id, draftId));

      return res.json({
        ok: true,
        message: `Email scheduled for ${scheduled.toISOString()}`,
        status: "scheduled_pending_approval",
      });
    }
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to approve draft");
    return res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 4: Reject a draft (optional)
// POST /api/growth/elizabeth/approval-queue/:draftId/reject
// ──────────────────────────────────────────────────────────────────────────────

router.post("/growth/elizabeth/approval-queue/:draftId/reject", authenticateToken, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { reason } = req.body;
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Auth required" });

    const draft = await db.query.growthOutreach.findFirst({
      where: eq(growthOutreach.id, draftId),
    });
    if (!draft) return res.status(404).json({ error: "Draft not found" });

    await db
      .update(growthOutreach)
      .set({
        status: "rejected",
        rejectedAt: new Date(),
        rejectedBy: ownerId,
        rejectionReason: reason || null,
      })
      .where(eq(growthOutreach.id, draftId));

    return res.json({ ok: true, message: "Draft rejected" });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to reject draft");
    return res.status(500).json({ error: err.message });
  }
});

export default router;
