// ── Shared AI + spend helpers ──────────────────────────────────────────────
// Single source of truth for OpenRouter calls, model selection, cost pricing,
// and spend logging. Imported by growth-platform-routes.ts, growth-pipeline.ts,
// and elizabeth-orchestrator.ts so there is exactly one implementation.

import { db } from "./db";
import { growthSpendLogs } from "@workspace/db";
import { logger } from "./lib/logger";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";

// Best-in-class Claude tier via OpenRouter (slugs verified against the live
// /models catalogue). Orchestration reasons + calls tools; drafting writes
// strategy / outreach copy; classify is the cheap scoring tier.
export const MODELS = {
  orchestrator: "anthropic/claude-opus-4.8",
  drafting: "anthropic/claude-sonnet-4.6",
  interview: "anthropic/claude-sonnet-4.6",
  classify: "anthropic/claude-haiku-4.5",
} as const;

// Per-token pricing (USD) from the OpenRouter model catalogue. Used so spend
// logs reflect the real model cost rather than a flat rate.
const MODEL_COST: Record<string, { in: number; out: number }> = {
  "anthropic/claude-opus-4.8": { in: 0.000005, out: 0.000025 },
  "anthropic/claude-sonnet-4.6": { in: 0.000003, out: 0.000015 },
  "anthropic/claude-haiku-4.5": { in: 0.000001, out: 0.000005 },
  // legacy / fallbacks still referenced in older logs
  "anthropic/claude-sonnet-4": { in: 0.000003, out: 0.000015 },
  "openai/gpt-4o-mini": { in: 0.00000015, out: 0.0000006 },
};

function priceFor(model: string, usage: any): number {
  const p = MODEL_COST[model];
  const promptTok = usage?.prompt_tokens || 0;
  const completionTok = usage?.completion_tokens || 0;
  if (p) return promptTok * p.in + completionTok * p.out;
  // Unknown model — fall back to the platform's historical flat rate.
  return (promptTok + completionTok) * 0.0000015;
}

export function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY || process.env.Open_router_AI;
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");
  return key;
}

function orHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getOpenRouterKey()}`,
    "HTTP-Referer": `https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}`,
    "X-Title": "Event Growth Platform",
  };
}

// Plain text / JSON completion. Signature preserved from the original
// growth-platform-routes helper so existing callers are unchanged.
export async function callOpenRouter(
  model: string,
  messages: Array<{ role: string; content: string }>,
  opts?: { maxTokens?: number; temperature?: number; jsonMode?: boolean; webSearch?: boolean; webMaxResults?: number }
) {
  const res = await fetch(OPENROUTER_BASE, {
    method: "POST",
    headers: orHeaders(),
    body: JSON.stringify({
      model,
      messages,
      max_tokens: opts?.maxTokens ?? 800,
      temperature: opts?.temperature ?? 0.7,
      ...(opts?.jsonMode && { response_format: { type: "json_object" } }),
      // Real web grounding via OpenRouter's web plugin. Off by default so every
      // existing caller (including I Am Her email generation) is byte-for-byte
      // unchanged; only callers that opt in get live web results + citations.
      ...(opts?.webSearch && { plugins: [{ id: "web", max_results: opts?.webMaxResults ?? 5 }] }),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }
  const data = (await res.json()) as any;
  if (data.error) {
    throw new Error(`OpenRouter API error: ${JSON.stringify(data.error)}`);
  }
  const usage = data.usage || {};
  const cost = priceFor(model, usage);
  const message = data.choices?.[0]?.message || {};
  const content = message.content || "";
  // OpenRouter returns url_citation annotations when the web plugin runs.
  const annotations: Array<{ title?: string; url?: string }> = (message.annotations || [])
    .filter((a: any) => a?.type === "url_citation" && a?.url_citation)
    .map((a: any) => ({ title: a.url_citation.title, url: a.url_citation.url }));
  logger.info({ contentLength: content.length, model, usage, sources: annotations.length }, "OpenRouter response");
  return { content, usage, cost, model, sources: annotations };
}

// Tool-calling completion (OpenAI-compatible). Returns the raw assistant
// message so the orchestrator can read `content` and/or `tool_calls`.
export interface OrToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
export async function callOpenRouterTools(
  model: string,
  messages: any[],
  tools: any[],
  opts?: { maxTokens?: number; temperature?: number; toolChoice?: "auto" | "none" }
): Promise<{ message: any; finishReason: string; usage: any; cost: number }> {
  const res = await fetch(OPENROUTER_BASE, {
    method: "POST",
    headers: orHeaders(),
    body: JSON.stringify({
      model,
      messages,
      tools,
      tool_choice: opts?.toolChoice ?? "auto",
      max_tokens: opts?.maxTokens ?? 1500,
      temperature: opts?.temperature ?? 0.5,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }
  const data = (await res.json()) as any;
  if (data.error) {
    throw new Error(`OpenRouter API error: ${JSON.stringify(data.error)}`);
  }
  const choice = data.choices?.[0] || {};
  const usage = data.usage || {};
  return {
    message: choice.message || { role: "assistant", content: "" },
    finishReason: choice.finish_reason || "stop",
    usage,
    cost: priceFor(model, usage),
  };
}

// Owner-scoped spend log. `ownerId` is optional for backward-compat with the
// existing callers that don't pass it; the orchestrator always passes it so
// autonomous spend is attributable and shows up in the owner's dashboard.
export async function logSpend(
  operation: string,
  model: string,
  cost: number,
  metadata: any,
  vendor = "openrouter",
  ownerId?: string
) {
  await db.insert(growthSpendLogs).values({
    operation,
    vendor,
    cost: cost.toString(),
    model,
    metadata,
    ...(ownerId ? { ownerId } : {}),
  });
}
