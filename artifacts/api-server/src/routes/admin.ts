// Admin / settings domain routes (Phase 3, Task 1 decomposition + Task 4).
// Currently surfaces the per-org AI usage total + per-feature breakdown for the
// admin/settings view. Org-scoped via authenticateSaasUser.
import type { Express } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { authenticateSaasUser } from "../saas-tender-routes";
import { getOrgMonthlyCost, getOrgCeiling } from "../ai-usage";

export function registerAdminRoutes(app: Express) {
  // ─── AI usage summary for the current org (month-to-date) ────────────────────
  app.get("/api/saas-tender/admin/ai-usage", authenticateSaasUser, async (req: any, res) => {
    try {
      const orgId = req.saasUser.orgId;
      const [spent, ceiling, byFeature] = await Promise.all([
        getOrgMonthlyCost(orgId),
        getOrgCeiling(orgId),
        db.execute(sql`
          SELECT feature,
                 COUNT(*)::int AS calls,
                 COALESCE(SUM(total_tokens), 0)::int AS tokens,
                 COALESCE(SUM(cost_usd), 0)::float AS cost
          FROM saas_ai_usage
          WHERE org_id = ${orgId} AND created_at >= date_trunc('month', NOW())
          GROUP BY feature
          ORDER BY cost DESC
        `),
      ]);
      return res.json({
        month_to_date_cost: spent,
        ceiling,
        blocked: ceiling != null && spent >= ceiling,
        by_feature: byFeature.rows,
      });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ─── Set / clear this org's monthly AI ceiling (USD; null clears) ─────────────
  app.put("/api/saas-tender/admin/ai-ceiling", authenticateSaasUser, async (req: any, res) => {
    try {
      const ceiling = req.body?.ceiling_usd;
      const value = ceiling === null || ceiling === undefined || ceiling === "" ? null : Number(ceiling);
      if (value !== null && (isNaN(value) || value < 0)) return res.status(400).json({ message: "ceiling_usd must be a non-negative number or null" });
      await db.execute(sql`UPDATE saas_organizations SET ai_monthly_ceiling_usd = ${value} WHERE id = ${req.saasUser.orgId}`);
      return res.json({ message: "Ceiling updated", ceiling_usd: value });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });
}
