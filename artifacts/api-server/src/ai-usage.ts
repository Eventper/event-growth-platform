// AI cost telemetry (Phase 3, Task 4).
// Records every model call to saas_ai_usage (per org, per feature) and enforces a
// configurable monthly cost ceiling so one heavy tenant can't silently blow the
// whole bill. Telemetry failures never block an AI call — recording is best-effort.
import { db } from "./db";
import { sql } from "drizzle-orm";

export interface AiUsageContext {
  orgId: number | string;
  feature: string;            // e.g. "bid_generate", "doc_extract", "buyer_research"
  tier?: string;              // fast | premium | research
  provider?: string;          // modelfarm | openrouter
  model?: string;
  critical?: boolean;         // critical calls bypass the ceiling block
}

function tokensFrom(usage: any): { prompt: number; completion: number } {
  return {
    prompt: usage?.prompt_tokens ?? usage?.promptTokens ?? usage?.input_tokens ?? 0,
    completion: usage?.completion_tokens ?? usage?.completionTokens ?? usage?.output_tokens ?? 0,
  };
}

// Record one model call. Never throws — telemetry must not break a feature.
export async function recordAiUsage(ctx: AiUsageContext, usage: any, cost: number): Promise<void> {
  try {
    const { prompt, completion } = tokensFrom(usage);
    await db.execute(sql`
      INSERT INTO saas_ai_usage (org_id, feature, tier, provider, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, critical)
      VALUES (${ctx.orgId}, ${ctx.feature}, ${ctx.tier ?? null}, ${ctx.provider ?? null}, ${ctx.model ?? null},
              ${prompt}, ${completion}, ${prompt + completion}, ${cost || 0}, ${!!ctx.critical})
    `);
  } catch (err: any) {
    // Swallow — a telemetry write failure must never fail the user-facing AI call.
    console.error("[ai-usage] record failed:", err?.message);
  }
}

// Month-to-date AI spend for an org (USD).
export async function getOrgMonthlyCost(orgId: number | string): Promise<number> {
  const r = await db.execute(sql`
    SELECT COALESCE(SUM(cost_usd), 0)::float AS total
    FROM saas_ai_usage
    WHERE org_id = ${orgId} AND created_at >= date_trunc('month', NOW())
  `);
  return Number((r.rows[0] as any)?.total || 0);
}

// Resolve the org's ceiling: explicit per-org value, else the env default, else none.
export async function getOrgCeiling(orgId: number | string): Promise<number | null> {
  const envDefault = process.env.AI_MONTHLY_CEILING_USD ? Number(process.env.AI_MONTHLY_CEILING_USD) : null;
  try {
    const r = await db.execute(sql`SELECT ai_monthly_ceiling_usd FROM saas_organizations WHERE id = ${orgId}`);
    const v = (r.rows[0] as any)?.ai_monthly_ceiling_usd;
    if (v !== null && v !== undefined) return Number(v);
  } catch { /* column may not exist yet on first boot */ }
  return envDefault;
}

export interface CeilingState { allowed: boolean; spent: number; ceiling: number | null }

// Should this call be allowed? Critical calls and orgs with no ceiling always pass.
export async function checkOrgCeiling(orgId: number | string, critical = false): Promise<CeilingState> {
  const ceiling = await getOrgCeiling(orgId);
  if (ceiling === null || critical) return { allowed: true, spent: 0, ceiling };
  const spent = await getOrgMonthlyCost(orgId);
  return { allowed: spent < ceiling, spent, ceiling };
}
