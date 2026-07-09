// ── Outreach Analytics Dashboard: Elizabeth Funnel Performance ────────────────
// Mirrors I Am Her funnel tracking but for Growth Platform outreach campaigns.
// Tracks: Imported → Enriched → Approved → Sent → Replied → Interested
//
// Tables used:
//   - growthProspects: status tracking (new, approved_for_outreach, in_sequence, replied, interested)
//   - growthOutreach: email send tracking (pending, sent, bounced)
//   - growthReplies: reply classification (interested, declined, needs_call, etc)
//   - growthProspectScores: fit scoring
//   - growthCommunicationAnalytics: detailed email performance (opens, clicks, bounces)

import { Router } from "express";
import { db } from "./db";
import { eq, and, desc, sql, inArray, isNotNull, lte, gte } from "drizzle-orm";
import {
  growthProspects,
  growthOutreach,
  growthReplies,
  growthProspectScores,
  growthCommunications,
  growthCommunicationAnalytics,
  growthEvents,
} from "@workspace/db";
import { logger } from "./lib/logger";
import { authenticateToken } from "./auth";

const router = Router();

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/growth/outreach/funnel-analytics
// Comprehensive funnel from import through conversion
// ──────────────────────────────────────────────────────────────────────────────

router.get("/growth/outreach/funnel-analytics", authenticateToken, async (req, res) => {
  try {
    const { eventId, startDate, endDate, category } = req.query;
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Auth required" });

    // Build date range filter
    const dateFilter = [];
    if (startDate) dateFilter.push(gte(growthProspects.createdAt, new Date(startDate as string)));
    if (endDate) dateFilter.push(lte(growthProspects.createdAt, new Date(endDate as string)));

    // Base query: owner's prospects
    let prospectWhere: any = eq(growthProspects.ownerId, ownerId);
    if (eventId) prospectWhere = and(prospectWhere, eq(growthProspects.eventId, eventId as string));
    if (category) prospectWhere = and(prospectWhere, eq(growthProspects.category, category as string));
    if (dateFilter.length > 0) prospectWhere = and(prospectWhere, ...dateFilter);

    // ── Funnel metrics ────────────────────────────────────────────────────────────
    const allProspects = await db.select().from(growthProspects).where(prospectWhere);

    const funnelMetrics = {
      // Stage 1: Imported
      imported: allProspects.length,

      // Stage 2: Enriched (has apolloEnrichedAt or enrichmentData)
      enriched: allProspects.filter((p) => p.enrichedAt || p.enrichmentData).length,

      // Stage 3: Scored (has a score record)
      scored: 0,

      // Stage 4: Approved for outreach
      approvedForOutreach: allProspects.filter((p) => p.status === "approved_for_outreach").length,

      // Stage 5: In sequence (outreach sent)
      inSequence: allProspects.filter((p) => p.status === "in_sequence").length,

      // Stage 6: Replied (has reply records)
      replied: 0,

      // Stage 7: Interested
      interested: allProspects.filter((p) => p.status === "interested").length,

      // Drop-offs
      declined: allProspects.filter((p) => p.status === "declined").length,
      doNotContact: allProspects.filter((p) => p.status === "do_not_contact").length,
    };

    // Count scores
    if (allProspects.length > 0) {
      const scores = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(growthProspectScores)
        .where(inArray(growthProspectScores.prospectId, allProspects.map((p) => p.id)));
      funnelMetrics.scored = scores[0]?.count || 0;
    }

    // Count replies
    const prospectIds = allProspects.map((p) => p.id);
    if (prospectIds.length > 0) {
      const outreachIds = (
        await db
          .select({ id: growthOutreach.id })
          .from(growthOutreach)
          .where(inArray(growthOutreach.prospectId, prospectIds))
      ).map((o) => o.id);

      if (outreachIds.length > 0) {
        const replyCount = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(growthReplies)
          .where(inArray(growthReplies.outreachId, outreachIds));
        funnelMetrics.replied = replyCount[0]?.count || 0;
      }
    }

    // ── Conversion rates (as percentages) ──────────────────────────────────────────
    const conversionRates = {
      importToEnriched:
        funnelMetrics.imported > 0
          ? Math.round((funnelMetrics.enriched / funnelMetrics.imported) * 100)
          : 0,
      importToApproved:
        funnelMetrics.imported > 0
          ? Math.round((funnelMetrics.approvedForOutreach / funnelMetrics.imported) * 100)
          : 0,
      importToReplied:
        funnelMetrics.imported > 0 ? Math.round((funnelMetrics.replied / funnelMetrics.imported) * 100) : 0,
      importToInterested:
        funnelMetrics.imported > 0 ? Math.round((funnelMetrics.interested / funnelMetrics.imported) * 100) : 0,
      sentToReplyRate:
        funnelMetrics.inSequence > 0
          ? Math.round((funnelMetrics.replied / funnelMetrics.inSequence) * 100)
          : 0,
      replyToInterestRate:
        funnelMetrics.replied > 0 ? Math.round((funnelMetrics.interested / funnelMetrics.replied) * 100) : 0,
    };

    // ── Email performance (from growthOutreach table) ─────────────────────────────
    const emailPerformance = await getEmailPerformance(prospectIds);

    // ── Reply classification breakdown ────────────────────────────────────────────
    const replyClassifications = await getReplyClassifications(prospectIds);

    // ── Per-category breakdown ────────────────────────────────────────────────────
    const perCategory = await getCategoryBreakdown(ownerId, eventId as string | undefined);

    // ── Top performing segments ──────────────────────────────────────────────────
    const topSegments = await getTopPerformingSegments(ownerId, eventId as string | undefined);

    return res.json({
      ok: true,
      period: { startDate, endDate },
      funnelMetrics,
      conversionRates,
      emailPerformance,
      replyClassifications,
      perCategory,
      topSegments,
      timestamp: new Date(),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to compute funnel analytics");
    return res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/growth/outreach/analytics-dashboard
// UI-friendly dashboard view with critical metrics, insights, and health checks
// ──────────────────────────────────────────────────────────────────────────────

router.get("/growth/outreach/analytics-dashboard", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.query;
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Auth required" });

    // Fetch all funnel data
    let prospectWhere: any = eq(growthProspects.ownerId, ownerId);
    if (eventId) prospectWhere = and(prospectWhere, eq(growthProspects.eventId, eventId as string));

    const allProspects = await db.select().from(growthProspects).where(prospectWhere);
    const prospectIds = allProspects.map((p) => p.id);

    // ── CARD 1: Pipeline Overview ────────────────────────────────────────────────
    const pipelineCard = {
      title: "Pipeline Overview",
      metrics: [
        {
          label: "Total Imported",
          value: allProspects.length,
          detail: "contacts in pipeline",
        },
        {
          label: "Approved for Outreach",
          value: allProspects.filter((p) => p.status === "approved_for_outreach").length,
          detail: "ready to send",
        },
        {
          label: "Emails Sent",
          value: (
            await db
              .select({ count: sql<number>`COUNT(*)::int` })
              .from(growthOutreach)
              .where(inArray(growthOutreach.prospectId, prospectIds))
          )[0]?.count || 0,
          detail: "outreach emails",
        },
      ],
    };

    // ── CARD 2: Response Metrics ─────────────────────────────────────────────────
    const outreachIds = (
      await db
        .select({ id: growthOutreach.id })
        .from(growthOutreach)
        .where(inArray(growthOutreach.prospectId, prospectIds))
    ).map((o) => o.id);

    const replies = outreachIds.length
      ? await db.select().from(growthReplies).where(inArray(growthReplies.outreachId, outreachIds))
      : [];

    const responseCard = {
      title: "Response Metrics",
      metrics: [
        {
          label: "Total Replies",
          value: replies.length,
          detail: `from emails sent`,
          rate: pipelineCard.metrics[2].value > 0 ? Math.round((replies.length / pipelineCard.metrics[2].value) * 100) : 0,
        },
        {
          label: "Interested",
          value: replies.filter((r) => r.classification === "interested").length,
          detail: "expressed interest",
        },
        {
          label: "Declined",
          value: replies.filter((r) => r.classification === "declined").length,
          detail: "opted out",
        },
        {
          label: "Needs Follow-up",
          value: replies.filter((r) =>
            ["needs_call", "manual_follow_up", "send_information"].includes(r.classification || "")
          ).length,
          detail: "manual review needed",
        },
      ],
    };

    // ── CARD 3: Critical Insights ────────────────────────────────────────────────
    const insights: Array<{ type: "success" | "warning" | "error" | "info"; message: string; action?: string }> = [];

    const approvalRate =
      allProspects.length > 0 ? (pipelineCard.metrics[1].value / allProspects.length) * 100 : 0;
    if (approvalRate < 30) {
      insights.push({
        type: "warning",
        message: `Low approval rate (${Math.round(approvalRate)}%) — many prospects not ready for outreach`,
        action: "Review enrichment data and scoring thresholds",
      });
    }

    const replyRate = pipelineCard.metrics[2].value > 0 ? (replies.length / pipelineCard.metrics[2].value) * 100 : 0;
    if (replyRate < 5) {
      insights.push({
        type: "warning",
        message: `Low reply rate (${Math.round(replyRate)}%) — check email templates or targeting`,
        action: "Run A/B test on subject lines",
      });
    }

    const interestRate =
      replies.length > 0 ? (replies.filter((r) => r.classification === "interested").length / replies.length) * 100 : 0;
    if (interestRate > 20) {
      insights.push({
        type: "success",
        message: `Strong interest rate (${Math.round(interestRate)}%) — quality targeting working well`,
      });
    }

    const declineRate = replies.length > 0 ? (replies.filter((r) => r.classification === "declined").length / replies.length) * 100 : 0;
    if (declineRate > 30) {
      insights.push({
        type: "error",
        message: `High decline rate (${Math.round(declineRate)}%) — messaging may not resonate`,
        action: "Review positioning and value prop in email template",
      });
    }

    // ── CARD 4: Category Performance ──────────────────────────────────────────────
    const categories = ["guest", "sponsor", "media", "hotel", "civic", "introducer"];
    const categoryPerformance = await Promise.all(
      categories.map(async (cat) => {
        const catProspects = allProspects.filter((p) => p.category === cat);
        const catApproved = catProspects.filter((p) => p.status === "approved_for_outreach").length;
        const catOutreach = (
          await db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(growthOutreach)
            .where(inArray(growthOutreach.prospectId, catProspects.map((p) => p.id)))
        )[0]?.count || 0;

        return {
          category: cat,
          total: catProspects.length,
          approved: catApproved,
          sent: catOutreach,
          approvalRate: catProspects.length > 0 ? Math.round((catApproved / catProspects.length) * 100) : 0,
        };
      })
    );

    const categoryCard = {
      title: "Performance by Category",
      data: categoryPerformance.filter((c) => c.total > 0),
    };

    // ── CARD 5: Health Check ─────────────────────────────────────────────────────
    const healthCheck = {
      title: "System Health",
      status: "healthy" as "healthy" | "degraded" | "unhealthy",
      checks: [
        {
          name: "Pipeline flow",
          status: approvalRate > 30 ? "ok" : "warning",
          message: `Approval rate: ${Math.round(approvalRate)}%`,
        },
        {
          name: "Email delivery",
          status: replyRate > 2 ? "ok" : "warning",
          message: `Reply rate: ${Math.round(replyRate)}%`,
        },
        {
          name: "Data quality",
          status: allProspects.filter((p) => !p.enrichedAt).length < allProspects.length * 0.3 ? "ok" : "warning",
          message: `Enriched: ${allProspects.filter((p) => p.enrichedAt).length}/${allProspects.length}`,
        },
      ],
    };

    // Determine overall health
    if (healthCheck.checks.every((c) => c.status === "ok")) healthCheck.status = "healthy";
    else if (healthCheck.checks.some((c) => c.status === "error")) healthCheck.status = "unhealthy";
    else healthCheck.status = "degraded";

    return res.json({
      ok: true,
      dashboard: {
        pipelineCard,
        responseCard,
        insights,
        categoryCard,
        healthCheck,
      },
      timestamp: new Date(),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to load analytics dashboard");
    return res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

async function getEmailPerformance(prospectIds: string[]) {
  if (prospectIds.length === 0) return { sent: 0, bounced: 0, delivered: 0, unopened: 0 };

  const outreach = await db
    .select()
    .from(growthOutreach)
    .where(inArray(growthOutreach.prospectId, prospectIds));

  const communications = await db
    .select()
    .from(growthCommunications)
    .where(inArray(growthCommunications.prospectId, prospectIds));

  const analytics = await db
    .select()
    .from(growthCommunicationAnalytics)
    .where(inArray(growthCommunicationAnalytics.communicationId, communications.map((c) => c.id)));

  return {
    sent: outreach.filter((o) => o.status === "sent").length,
    bounced: outreach.filter((o) => o.bounced).length,
    delivered: communications.filter((c) => c.deliveryStatus === "delivered").length,
    unopened: communications.length - analytics.filter((a) => a.openedAt).length,
    opens: analytics.filter((a) => a.openedAt).length,
    clicks: analytics.filter((a) => a.clickedAt).length,
  };
}

async function getReplyClassifications(prospectIds: string[]) {
  if (prospectIds.length === 0) {
    return {
      interested: 0,
      declined: 0,
      needsCall: 0,
      sendInfo: 0,
      autoReply: 0,
      other: 0,
    };
  }

  const outreachIds = (
    await db
      .select({ id: growthOutreach.id })
      .from(growthOutreach)
      .where(inArray(growthOutreach.prospectId, prospectIds))
  ).map((o) => o.id);

  if (outreachIds.length === 0) {
    return { interested: 0, declined: 0, needsCall: 0, sendInfo: 0, autoReply: 0, other: 0 };
  }

  const replies = await db.select().from(growthReplies).where(inArray(growthReplies.outreachId, outreachIds));

  return {
    interested: replies.filter((r) => r.classification === "interested").length,
    declined: replies.filter((r) => r.classification === "declined").length,
    needsCall: replies.filter((r) => r.classification === "needs_call").length,
    sendInfo: replies.filter((r) => r.classification === "send_information").length,
    autoReply: replies.filter((r) => r.classification === "auto_reply").length,
    other: replies.filter((r) => !["interested", "declined", "needs_call", "send_information", "auto_reply"].includes(r.classification || "")).length,
  };
}

async function getCategoryBreakdown(ownerId: string, eventId?: string) {
  const categories = ["guest", "sponsor", "media", "hotel", "civic", "introducer"];
  let where: any = eq(growthProspects.ownerId, ownerId);
  if (eventId) where = and(where, eq(growthProspects.eventId, eventId));

  return Promise.all(
    categories.map(async (cat) => {
      const prospects = await db
        .select()
        .from(growthProspects)
        .where(and(where, eq(growthProspects.category, cat)));

      return {
        category: cat,
        total: prospects.length,
        approved: prospects.filter((p) => p.status === "approved_for_outreach").length,
        enriched: prospects.filter((p) => p.enrichedAt).length,
        interested: prospects.filter((p) => p.status === "interested").length,
      };
    })
  );
}

async function getTopPerformingSegments(ownerId: string, eventId?: string) {
  let where: any = eq(growthProspects.ownerId, ownerId);
  if (eventId) where = and(where, eq(growthProspects.eventId, eventId));

  const prospects = await db.select().from(growthProspects).where(where);

  // Group by industry/company and calculate metrics
  const byIndustry = new Map<string, { total: number; interested: number; approved: number }>();

  for (const p of prospects) {
    const key = p.industry || "Unknown";
    const entry = byIndustry.get(key) || { total: 0, interested: 0, approved: 0 };
    entry.total++;
    if (p.status === "interested") entry.interested++;
    if (p.status === "approved_for_outreach") entry.approved++;
    byIndustry.set(key, entry);
  }

  // Sort by conversion rate
  const sorted = Array.from(byIndustry.entries())
    .map(([industry, data]) => ({
      segment: industry,
      total: data.total,
      interested: data.interested,
      approved: data.approved,
      conversionRate: Math.round((data.interested / data.total) * 100),
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 5);

  return sorted;
}

export default router;
