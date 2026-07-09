// ── Elizabeth — autonomous agentic growth operator ─────────────────────────
// An OpenRouter tool-calling loop on Claude Opus 4.8. Elizabeth reasons,
// converses, challenges, and runs the pipeline (strategy → discovery → scoring
// → enrichment → outreach drafting) from a single prompt, narrating as she goes
// and stopping ONLY at the email-approval gate (drafts land in the existing
// /outreach pending queue — there is deliberately no send tool here).
//
// Memory: every run persists its transcript + step timeline to
// growth_orchestrator_runs, and the compact "next action" to growth_resume_state,
// so Elizabeth remembers where she left off and reminds the user on return.

import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  growthEvents,
  growthProspects,
  growthProspectScores,
  growthOutreach,
  growthSpendLogs,
  growthOrchestratorRuns,
  growthResumeState,
} from "@workspace/db";
import { logger } from "./lib/logger";
import { callOpenRouterTools, logSpend, MODELS } from "./ai-shared";
import { recallMemory, upsertMemory, scopeChain, type MemoryScope } from "./memory-service";
import { getAgent, type AgentDef } from "./agents-registry";
import {
  conductMarketScan,
  generateStrategy,
  saveStrategyPack,
  searchAndStoreProspects,
  enrichProspect,
  scoreProspect,
  generateReasonedOutreach,
} from "./growth-pipeline";

// Hard per-run safety ceiling on paid Apollo enrichment (1 credit ≈ 1 verified
// contact). Elizabeth narrates spend but cannot exceed this without pausing.
const RUN_CREDIT_CAP = 15;
const MAX_ITERATIONS = 18; // backstop against runaway loops

type Step = { tool: string; label: string; status: "done" | "error"; detail: string; at: string };

// ── Run record helpers ──────────────────────────────────────────────────────
export async function createRun(
  ownerId: string,
  opts: { messages: any[]; eventId?: string; title?: string; agentId?: string }
) {
  const [run] = await db
    .insert(growthOrchestratorRuns)
    .values({
      ownerId,
      agentId: getAgent(opts.agentId).id, // validate/normalise
      eventId: opts.eventId || null,
      title: opts.title || null,
      status: "running",
      messages: opts.messages,
      steps: [],
    })
    .returning();
  return run;
}

async function loadRun(runId: string, ownerId: string) {
  const [run] = await db
    .select()
    .from(growthOrchestratorRuns)
    .where(and(eq(growthOrchestratorRuns.id, runId), eq(growthOrchestratorRuns.ownerId, ownerId)));
  return run || null;
}

async function patchRun(runId: string, patch: Record<string, any>) {
  await db
    .update(growthOrchestratorRuns)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(growthOrchestratorRuns.id, runId));
}

export async function replyToRun(runId: string, ownerId: string, userMessage: string) {
  const run = await loadRun(runId, ownerId);
  if (!run) throw new Error("Run not found");
  const messages = [...((run.messages as any[]) || []), { role: "user", content: userMessage }];
  await patchRun(runId, { messages, status: "running", pendingQuestion: null });
  // fire-and-forget; caller returns immediately
  runOrchestrator(runId, ownerId).catch((err) =>
    logger.error({ err: err.message, runId }, "Elizabeth run (resumed) failed")
  );
}

// Owner-scoped count of pending email drafts (growthOutreach has no ownerId, so
// scope via the owner's events). Avoids leaking other tenants' draft counts.
async function countPendingDrafts(ownerId: string): Promise<number> {
  const evs = await db.select({ id: growthEvents.id }).from(growthEvents).where(eq(growthEvents.ownerId, ownerId));
  const ids = evs.map((e) => e.id);
  if (!ids.length) return 0;
  const [row] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(growthOutreach)
    .where(and(eq(growthOutreach.status, "pending"), inArray(growthOutreach.eventId, ids)));
  return row?.c || 0;
}

// ── Memory: what Elizabeth recalls when a run starts ─────────────────────────
async function buildMemoryRecap(ownerId: string, eventId?: string | null, runId?: string | null): Promise<string> {
  const resume = await db
    .select()
    .from(growthResumeState)
    .where(eq(growthResumeState.ownerId, ownerId))
    .orderBy(desc(growthResumeState.lastAt))
    .limit(3);
  const pending = await countPendingDrafts(ownerId);
  // Hierarchical institutional memory: account → event → this conversation.
  const chain = scopeChain(ownerId, { eventId: eventId || undefined, conversationId: runId || undefined });
  const institutional = await recallMemory(ownerId, chain);

  const lines: string[] = [];
  if (institutional) lines.push(institutional);
  if (resume.length) {
    lines.push("\nWHERE YOU LEFT OFF (your memory of prior sessions):");
    for (const r of resume) lines.push(`- ${r.page}${r.step ? "/" + r.step : ""}: ${r.action}`);
  }
  if (pending) lines.push(`There are ${pending} drafted email(s) still awaiting approval in the outreach queue.`);
  return lines.length ? lines.join("\n") : "No prior activity on record — this looks like a fresh start.";
}

// Upsert the compact "next action" memory for an event.
async function rememberNextAction(ownerId: string, eventId: string | null, page: string, step: string, action: string) {
  if (!eventId) return;
  const existing = await db
    .select()
    .from(growthResumeState)
    .where(and(eq(growthResumeState.ownerId, ownerId), eq(growthResumeState.eventId, eventId)));
  if (existing.length) {
    await db
      .update(growthResumeState)
      .set({ page, step, action, lastAt: new Date() })
      .where(eq(growthResumeState.id, existing[0].id));
  } else {
    await db.insert(growthResumeState).values({ ownerId, eventId, page, step, action });
  }
}

// ── Tool schemas (OpenAI-compatible function calling) ────────────────────────
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_pipeline_status",
      description:
        "Read the current state of the owner's pipeline: their events, prospect counts by status, how many are scored/enriched, pending email drafts, and spend. Call this FIRST when asked to act or to answer a question about the pipeline.",
      parameters: {
        type: "object",
        properties: { eventId: { type: "string", description: "Optional: focus on one event." } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_strategy",
      description:
        "Generate and save the strategy pack for an event (audience/sponsor/media personas, exclusion rules, messaging, pricing). Runs a market scan then synthesises. Skips if the event already has a strategy pack unless force=true.",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "string" },
          audience: { type: "string", description: "Who the event is for, if known from the conversation." },
          positioningTier: { type: "string", description: "mass-market | mid-market | premium, if known." },
          force: { type: "boolean" },
        },
        required: ["eventId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discover_prospects",
      description:
        "Search Apollo for prospects matching the event's strategy-pack personas and store new ones (free — no enrichment credits). Returns how many were found/stored.",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "string" },
          prospectType: { type: "string", enum: ["audience", "sponsor"], description: "Default audience." },
        },
        required: ["eventId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "score_prospects",
      description:
        "Score the event's un-scored prospects against the strategy persona (0-100). Returns the score distribution. Caps at 30 prospects per call.",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "string" },
          prospectType: { type: "string", enum: ["audience", "sponsor"] },
        },
        required: ["eventId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "enrich_top_prospects",
      description:
        "Enrich the top-N highest-scored, not-yet-enriched prospects to get verified email/phone. PAID: 1 Apollo credit each. Hard cap of " +
        RUN_CREDIT_CAP +
        " credits per run; the tool clamps topN to the remaining budget and tells you if it capped. Narrate the spend to the user.",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "string" },
          topN: { type: "number", description: "How many to enrich (default 12)." },
        },
        required: ["eventId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_outreach",
      description:
        "For the top enriched prospects, draft a personalised 4-touch outreach sequence into the PENDING approval queue. Nothing sends — the human approves and sends each email in the /outreach page. Returns how many drafts were queued.",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "string" },
          topN: { type: "number", description: "How many prospects to draft for (default 12)." },
        },
        required: ["eventId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ask_user",
      description:
        "Pause and ask the user a clarifying question, or surface a challenge/decision (e.g. an instruction conflicts with the strategy, or spend would exceed the cap). Use this instead of guessing when you are genuinely blocked.",
      parameters: {
        type: "object",
        properties: { question: { type: "string" } },
        required: ["question"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remember",
      description:
        "Save a durable fact, preference, or learning to institutional memory so you (and the platform) recall it in future sessions. Choose the right scope: 'global' for account-wide preferences (e.g. house style, always-exclude sectors), 'event' for facts about the current event, 'conversation' for notes local to this run. Use a stable `key` for single-valued preferences (e.g. key='preferred_tone') so it updates rather than duplicates.",
      parameters: {
        type: "object",
        properties: {
          scope: { type: "string", enum: ["global", "event", "conversation"] },
          content: { type: "string", description: "The fact/preference/learning to remember." },
          key: { type: "string", description: "Optional stable key for single-valued preferences." },
          kind: { type: "string", enum: ["fact", "preference", "learning", "style"] },
        },
        required: ["scope", "content"],
      },
    },
  },
];

// ── Tool executors ───────────────────────────────────────────────────────────
async function ownsEvent(ownerId: string, eventId: string) {
  const [ev] = await db.select().from(growthEvents).where(eq(growthEvents.id, eventId));
  if (!ev) throw new Error("Event not found");
  if (ev.ownerId && ev.ownerId !== ownerId) throw new Error("Access denied to this event");
  return ev;
}

// latest score per prospect (max score row)
async function latestScores(prospectIds: string[]): Promise<Map<string, number>> {
  if (!prospectIds.length) return new Map();
  const rows = await db
    .select()
    .from(growthProspectScores)
    .where(inArray(growthProspectScores.prospectId, prospectIds));
  const m = new Map<string, number>();
  for (const r of rows) {
    const prev = m.get(r.prospectId!) ?? -1;
    if ((r.score ?? 0) > prev) m.set(r.prospectId!, r.score ?? 0);
  }
  return m;
}

async function execTool(
  name: string,
  args: any,
  ctx: { ownerId: string; runId: string; creditsUsedRef: { v: number }; eventIdRef: { v: string | null } }
): Promise<any> {
  const { ownerId } = ctx;
  switch (name) {
    case "get_pipeline_status": {
      const evs = await db.select().from(growthEvents).where(eq(growthEvents.ownerId, ownerId));
      const eventId = args.eventId || ctx.eventIdRef.v;
      const focus = eventId ? evs.find((e) => e.id === eventId) : null;
      const prospects = eventId
        ? await db.select().from(growthProspects).where(eq(growthProspects.eventId, eventId))
        : await db.select().from(growthProspects).where(eq(growthProspects.ownerId, ownerId));
      const byStatus: Record<string, number> = {};
      let enriched = 0;
      for (const p of prospects) {
        byStatus[p.status || "new"] = (byStatus[p.status || "new"] || 0) + 1;
        if (p.enriched) enriched++;
      }
      const scores = await latestScores(prospects.map((p) => p.id));
      const pendingDrafts = await countPendingDrafts(ownerId);
      const [spend] = await db
        .select({ total: sql<number>`COALESCE(SUM(cost),0)::decimal` })
        .from(growthSpendLogs)
        .where(eq(growthSpendLogs.ownerId, ownerId));
      return {
        events: evs.map((e) => ({ id: e.id, name: e.name, status: e.status, hasStrategyPack: !!e.strategyPack })),
        focusEvent: focus
          ? { id: focus.id, name: focus.name, hasStrategyPack: !!focus.strategyPack, tier: (focus.strategyPack as any)?.positioning_tier }
          : null,
        prospects: { total: prospects.length, byStatus, scored: scores.size, enriched },
        pendingEmailDrafts: pendingDrafts,
        totalSpendUsd: Number(spend?.total || 0),
        runCreditsUsed: ctx.creditsUsedRef.v,
        runCreditCap: RUN_CREDIT_CAP,
      };
    }

    case "run_strategy": {
      const ev = await ownsEvent(ownerId, args.eventId);
      ctx.eventIdRef.v = ev.id;
      if (ev.strategyPack && !args.force) {
        return { skipped: true, reason: "Event already has a strategy pack.", tier: (ev.strategyPack as any)?.positioning_tier };
      }
      const interviewData = {
        event_name: ev.name,
        event_type: ev.type,
        location: ev.location || "UK",
        target_audience: args.audience || ev.description || "",
        positioning_tier: args.positioningTier || "",
      };
      const scan = await conductMarketScan(
        { eventType: ev.type, location: ev.location || "UK", audience: interviewData.target_audience, positioningTier: args.positioningTier },
        ownerId
      );
      const strat = await generateStrategy(ev.id, { interviewData, marketScan: scan.result }, ownerId);
      await saveStrategyPack(ev.id, ownerId, strat.result, true);
      const pack = strat.result || {};
      return {
        saved: true,
        tier: pack.positioning_tier,
        audiencePersonas: (pack.audience_personas || []).length,
        sponsorPersonas: (pack.sponsor_personas || []).length,
        tagline: pack.messaging_recommendations?.tagline,
        opportunityScore: pack.market_opportunity_score,
      };
    }

    case "discover_prospects": {
      const ev = await ownsEvent(ownerId, args.eventId);
      ctx.eventIdRef.v = ev.id;
      const out = await searchAndStoreProspects(ev.id, args.prospectType || "audience", ownerId);
      return { found: out.found, stored: out.stored, skipped: out.skipped, excluded: out.excluded };
    }

    case "score_prospects": {
      const ev = await ownsEvent(ownerId, args.eventId);
      ctx.eventIdRef.v = ev.id;
      const conds: any[] = [eq(growthProspects.eventId, ev.id), eq(growthProspects.status, "new")];
      if (args.prospectType) conds.push(eq(growthProspects.prospectType, args.prospectType));
      const candidates = await db.select().from(growthProspects).where(and(...conds));
      const already = await latestScores(candidates.map((p) => p.id));
      const todo = candidates.filter((p) => !already.has(p.id)).slice(0, 30);
      const scored: number[] = [];
      for (const p of todo) {
        try {
          const { score } = await scoreProspect(p.id, ownerId);
          scored.push(score.score ?? 0);
        } catch (e: any) {
          logger.warn({ err: e.message, prospectId: p.id }, "score failed in orchestrator");
        }
      }
      scored.sort((a, b) => b - a);
      return {
        scoredNow: scored.length,
        top: scored.slice(0, 5),
        median: scored.length ? scored[Math.floor(scored.length / 2)] : null,
      };
    }

    case "enrich_top_prospects": {
      const ev = await ownsEvent(ownerId, args.eventId);
      ctx.eventIdRef.v = ev.id;
      const remaining = RUN_CREDIT_CAP - ctx.creditsUsedRef.v;
      if (remaining <= 0) {
        return { enriched: 0, capped: true, reason: `Per-run credit cap of ${RUN_CREDIT_CAP} reached. Ask the user before spending more.` };
      }
      const want = Math.max(1, Math.floor(args.topN ?? 12));
      const limit = Math.min(want, remaining);
      const prospects = await db
        .select()
        .from(growthProspects)
        .where(and(eq(growthProspects.eventId, ev.id), eq(growthProspects.enriched, false)));
      const scores = await latestScores(prospects.map((p) => p.id));
      const ranked = prospects
        .map((p) => ({ p, s: scores.get(p.id) ?? 0 }))
        .sort((a, b) => b.s - a.s)
        .slice(0, limit);
      let enriched = 0;
      let withEmail = 0;
      for (const { p } of ranked) {
        try {
          const r = await enrichProspect(p.id, ownerId);
          enriched++;
          ctx.creditsUsedRef.v += r.creditsUsed;
          if (r.prospect?.email) withEmail++;
        } catch (e: any) {
          logger.warn({ err: e.message, prospectId: p.id }, "enrich failed in orchestrator");
        }
      }
      await patchRun(ctx.runId, { creditsUsed: ctx.creditsUsedRef.v });
      return {
        enriched,
        withVerifiedEmail: withEmail,
        creditsUsedThisRun: ctx.creditsUsedRef.v,
        capped: want > limit,
        note: want > limit ? `Requested ${want} but clamped to ${limit} to stay within the ${RUN_CREDIT_CAP}-credit cap.` : undefined,
      };
    }

    case "draft_outreach": {
      const ev = await ownsEvent(ownerId, args.eventId);
      ctx.eventIdRef.v = ev.id;
      const topN = Math.max(1, Math.floor(args.topN ?? 12));
      // prefer enriched (have email); fall back to highest-scored
      const prospects = await db.select().from(growthProspects).where(eq(growthProspects.eventId, ev.id));
      const scores = await latestScores(prospects.map((p) => p.id));
      const ranked = prospects
        .filter((p) => p.status !== "rejected")
        .map((p) => ({ p, s: scores.get(p.id) ?? 0, enriched: !!p.enriched }))
        .sort((a, b) => Number(b.enriched) - Number(a.enriched) || b.s - a.s)
        .slice(0, topN);
      let drafted = 0;
      let queuedMessages = 0;
      for (const { p } of ranked) {
        try {
          if (!["approved", "approved_for_outreach"].includes(p.status || "")) {
            await db.update(growthProspects).set({ status: "approved_for_outreach" }).where(eq(growthProspects.id, p.id));
          }
          const out = await generateReasonedOutreach({ prospectId: p.id, eventId: ev.id }, ownerId);
          drafted++;
          queuedMessages += out.count;
        } catch (e: any) {
          logger.warn({ err: e.message, prospectId: p.id }, "draft_outreach failed in orchestrator");
        }
      }
      return {
        prospectsDrafted: drafted,
        emailsQueuedForApproval: queuedMessages,
        nextStep: "All drafts are in the PENDING approval queue at /outreach. The user reviews and sends each one — nothing has been sent.",
      };
    }

    case "remember": {
      const scope = (args.scope || "global") as MemoryScope;
      const scopeId =
        scope === "event"
          ? args.eventId || ctx.eventIdRef.v
          : scope === "conversation"
          ? ctx.runId
          : ownerId; // global
      if (!scopeId) return { error: `No ${scope} in context to attach the memory to.` };
      await upsertMemory({
        ownerId,
        scope,
        scopeId,
        content: args.content,
        kind: args.kind || "fact",
        key: args.key,
        source: "elizabeth",
        weight: scope === "global" ? 2 : 1,
      });
      return { remembered: true, scope, key: args.key || null };
    }

    case "ask_user":
      // handled by the loop (sets awaiting_input); should not reach here
      return { paused: true };

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
const TOOL_BRIEF: Record<string, string> = {
  get_pipeline_status: "read the live pipeline/CRM (events, prospects, scores, drafts, spend).",
  run_strategy: "build & save an event's strategy pack.",
  discover_prospects: "search Apollo for matching people (free).",
  score_prospects: "score prospects against the strategy (0-100).",
  enrich_top_prospects: "get verified emails for the best prospects (PAID — Apollo credits).",
  draft_outreach: "write personalised outreach into the approval queue.",
  remember: "save a durable fact/preference/learning to institutional memory.",
  ask_user: "pause to ask a question or raise a challenge.",
};

function systemPrompt(agent: AgentDef, memoryRecap: string): string {
  const caps = agent.tools.map((t) => `- ${t} — ${TOOL_BRIEF[t] || ""}`).join("\n");
  const ptHint = agent.defaultProspectType
    ? `\n- Your focus is the ${agent.defaultProspectType.toUpperCase()} track — default discovery and scoring to prospectType "${agent.defaultProspectType}".`
    : "";
  return `${agent.persona} You are not a brochure or a help widget — you reason, plan, converse, challenge bad instructions, and DO the work by calling tools.

YOUR ROLE: ${agent.title}. ${agent.approach}${ptHint}

YOUR KPIs (optimise for these): ${agent.kpis.join("; ")}.

WHAT YOU CAN DO (via tools):
${caps}

HOW YOU WORK:
1. When asked to ACT, first call get_pipeline_status to ground yourself, then state a short plan (1-3 lines) and the expected spend, then execute.
2. NARRATE as you go in warm, concise prose between tool calls — what you just did and what's next.
3. CHALLENGE: if an instruction conflicts with the strategy, wastes credits, or falls outside your remit, say so and propose the better path (and suggest the right agent if it belongs to another). Use ask_user when you genuinely need a decision.
4. ANSWER questions directly from get_pipeline_status data. Don't run paid steps just to answer a question.

THE ONE HUMAN GATE — EMAIL APPROVAL:
- You DRAFT outreach into a PENDING queue. You CANNOT and MUST NOT send anything — there is no send tool. The user reviews and sends each email themselves at /outreach. Always end an outreach run by pointing them there.

SPEND GUARDRAIL:
- Per run: discover up to ~30, score all, enrich only the TOP ~12 by score. Hard ceiling of ${RUN_CREDIT_CAP} Apollo credits per run. Narrate spend. If the user wants more than the cap, use ask_user first; they can also tell you to do fewer/more mid-conversation.

RULES (always):
- GDPR/PECR: every email has an opt-out; honour suppression. Individuals → LinkedIn, corporates → email. Never name prospects externally until commercials are signed.
- Remember and remind: you have persistent, hierarchical memory across sessions (account → event → conversation), shown below. When a session starts, briefly remind the user where things stand and the single best next action. When you learn a durable preference or fact, call the remember tool at the right scope so it informs every future session.

${memoryRecap}

When you have finished a task or are waiting on the user, give a final prose message (no tool call) summarising what you did and the next action.`;
}

// ── The loop ─────────────────────────────────────────────────────────────────
export async function runOrchestrator(runId: string, ownerId: string): Promise<void> {
  const run = await loadRun(runId, ownerId);
  if (!run) throw new Error("Run not found");

  const agent = getAgent(run.agentId);
  const agentTools = TOOLS.filter((t) => (agent.tools as string[]).includes(t.function.name));
  const memoryRecap = await buildMemoryRecap(ownerId, run.eventId, runId);
  const sys = { role: "system", content: systemPrompt(agent, memoryRecap) };
  let messages: any[] = [...((run.messages as any[]) || [])];
  let steps: Step[] = [...((run.steps as any[]) || [])];
  const creditsUsedRef = { v: run.creditsUsed || 0 };
  const eventIdRef = { v: run.eventId || null };

  try {
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const { message, finishReason, usage, cost } = await callOpenRouterTools(
        MODELS.orchestrator,
        [sys, ...messages],
        agentTools,
        { maxTokens: 1800, temperature: 0.4 }
      );
      await logSpend("elizabeth_orchestrate", MODELS.orchestrator, cost, { runId, usage, iter }, "openrouter", ownerId);

      // record the assistant turn (content and/or tool_calls)
      messages.push(message);

      const toolCalls = message.tool_calls || [];
      if (!toolCalls.length || finishReason === "stop") {
        // final prose turn — done
        await patchRun(runId, { messages, steps, status: "done", creditsUsed: creditsUsedRef.v });
        await persistMemoryFromRun(ownerId, eventIdRef.v);
        return;
      }

      // execute each requested tool
      let paused = false;
      for (const tc of toolCalls) {
        const fnName = tc.function?.name;
        let parsedArgs: any = {};
        try {
          parsedArgs = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          parsedArgs = {};
        }

        if (fnName === "ask_user") {
          const question = parsedArgs.question || "Could you clarify how you'd like me to proceed?";
          messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ paused: true }) });
          steps.push({ tool: "ask_user", label: "Waiting for you", status: "done", detail: question, at: new Date().toISOString() });
          await patchRun(runId, { messages, steps, status: "awaiting_input", pendingQuestion: question, creditsUsed: creditsUsedRef.v });
          paused = true;
          break;
        }

        let result: any;
        let stepStatus: "done" | "error" = "done";
        try {
          result = await execTool(fnName, parsedArgs, { ownerId, runId, creditsUsedRef, eventIdRef });
        } catch (e: any) {
          stepStatus = "error";
          result = { error: e.message };
        }
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
        steps.push({ tool: fnName, label: labelFor(fnName, parsedArgs), status: stepStatus, detail: summarise(fnName, result), at: new Date().toISOString() });
        // persist incremental progress so the frontend poll sees it live
        await patchRun(runId, { messages, steps, creditsUsed: creditsUsedRef.v });
      }
      if (paused) return;
    }
    // hit iteration cap
    await patchRun(runId, { messages, steps, status: "done", creditsUsed: creditsUsedRef.v });
    await persistMemoryFromRun(ownerId, eventIdRef.v);
  } catch (err: any) {
    logger.error({ err: err.message, runId }, "Elizabeth orchestrator loop error");
    await patchRun(runId, { messages, steps, status: "error", error: err.message, creditsUsed: creditsUsedRef.v });
  }
}

function labelFor(fn: string, args: any): string {
  switch (fn) {
    case "get_pipeline_status": return "Reading pipeline";
    case "run_strategy": return "Building strategy";
    case "discover_prospects": return `Discovering ${args.prospectType || "audience"}`;
    case "score_prospects": return "Scoring prospects";
    case "enrich_top_prospects": return `Enriching top ${args.topN ?? 12}`;
    case "draft_outreach": return "Drafting outreach";
    case "remember": return "Noting to memory";
    default: return fn;
  }
}

function summarise(fn: string, r: any): string {
  if (r?.error) return `Error: ${r.error}`;
  switch (fn) {
    case "get_pipeline_status":
      return `${r.events?.length ?? 0} events, ${r.prospects?.total ?? 0} prospects, ${r.pendingEmailDrafts ?? 0} drafts pending`;
    case "run_strategy":
      return r.skipped ? "Strategy already existed" : `Saved — ${r.tier || "tier set"}, ${r.audiencePersonas || 0} audience personas`;
    case "discover_prospects":
      return `Found ${r.found}, stored ${r.stored} new`;
    case "score_prospects":
      return `Scored ${r.scoredNow} (top ${(r.top || []).join(", ")})`;
    case "enrich_top_prospects":
      return `Enriched ${r.enriched} (${r.withVerifiedEmail} with email), ${r.creditsUsedThisRun} credits used`;
    case "draft_outreach":
      return `${r.emailsQueuedForApproval} emails queued for ${r.prospectsDrafted} prospects`;
    case "remember":
      return r.remembered ? `Saved to ${r.scope} memory` : "Nothing saved";
    default:
      return JSON.stringify(r).slice(0, 120);
  }
}

// After a run ends, record the single best next action as durable memory.
async function persistMemoryFromRun(ownerId: string, eventId: string | null) {
  const pending = await countPendingDrafts(ownerId);
  if (pending) {
    await rememberNextAction(ownerId, eventId, "outreach", "queue", `Review and send ${pending} drafted email(s) awaiting approval.`);
  }
}

// ── Read API for the frontend ─────────────────────────────────────────────────
export async function getRunForOwner(runId: string, ownerId: string) {
  const run = await loadRun(runId, ownerId);
  if (!run) return null;
  // surface only the user/assistant prose turns for display (skip tool plumbing)
  const transcript = ((run.messages as any[]) || [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content }));
  return {
    id: run.id,
    agentId: run.agentId,
    status: run.status,
    steps: run.steps,
    transcript,
    pendingQuestion: run.pendingQuestion,
    creditsUsed: run.creditsUsed,
    error: run.error,
  };
}

// Memory recap for the widget to show on open ("where you left off").
export async function getElizabethMemory(ownerId: string) {
  const resume = await db
    .select()
    .from(growthResumeState)
    .where(eq(growthResumeState.ownerId, ownerId))
    .orderBy(desc(growthResumeState.lastAt))
    .limit(5);
  const [latestRun] = await db
    .select()
    .from(growthOrchestratorRuns)
    .where(eq(growthOrchestratorRuns.ownerId, ownerId))
    .orderBy(desc(growthOrchestratorRuns.updatedAt))
    .limit(1);
  const pending = await countPendingDrafts(ownerId);
  return {
    resume: resume.map((r) => ({ eventId: r.eventId, page: r.page, step: r.step, action: r.action, lastAt: r.lastAt })),
    latestRun: latestRun ? { id: latestRun.id, status: latestRun.status, title: latestRun.title, updatedAt: latestRun.updatedAt } : null,
    pendingEmailDrafts: pending,
  };
}
