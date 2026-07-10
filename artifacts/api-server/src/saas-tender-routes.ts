import type { Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { format } from "date-fns";
import { searchSamGov } from "./sam-gov";
import { fetchTedEU, fetchBidStats } from "./tender-sources-v2";
import { runTenderSweep } from "./tender-sweeper";
import { runDeadlineMailer } from "./tender-deadline-mailer";
import { sendMail as _sendMail, sendMailNG as _sendMailNG } from "./emailService";
import path from "path";
import fs from "fs";
import multer from "multer";
import { uploadBuffer, generateViewUrl } from "./objectStorage";
import { extractTenderDocument } from "./tender-document-extractor";
import { searchTenders, computeOrgTags, pgTextArray, scoreEpBusinessFit, evaluateRelevance, hasStrategicAnchor, type FinderFilters, type MatchContext } from "./tender-finder-service";
import { EP_PLAYBOOK_CORE } from "./ep-bid-playbook";
import { withConstitution, EP_BID_WRITER, EP_BID_NO_BID, EP_INTEGRITY_CHECKER } from "./ep-tender-prompts";
import { EP_TARGETING_SPEC, EP_EXCLUDE_KEYWORDS } from "./ep-targeting-spec";
import { RELEVANCE_THRESHOLD } from "./tender-discovery-config";
import { AsyncLocalStorage } from "node:async_hooks";
import { checkOrgCeiling, recordAiUsage } from "./ai-usage";

// Per-request org context so the shared claudeAI() helper can enforce the monthly
// spend cap and record usage for ALL 27 call sites without threading orgId through
// each one. Set in authenticateSaasUser (and around the scheduled jobs).
const aiOrgContext = new AsyncLocalStorage<{ orgId: number | string; feature: string }>();
const aiFeatureFromPath = (p: string) => (p || "").replace(/^\/api\/saas-tender\//, "").split("?")[0] || "tender_ai";
// gpt-4o pricing (USD per 1M tokens) for the cost estimate written to saas_ai_usage.
const GPT4O_USD_PER_1M_IN = 2.5, GPT4O_USD_PER_1M_OUT = 10;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// ─── AI provider resolution ───────────────────────────────────────────────────
// Prefer OpenRouter (where the org's credit is — Open_router_AI / OPENROUTER_API_KEY).
// OpenRouter is OpenAI-compatible, so the same /chat/completions call works; it just
// needs a vendor-prefixed model and the referer/title headers. Falls back to the
// direct OpenAI config when no OpenRouter key is set.
function resolveAiProvider(): { key: string | undefined; baseURL: string; model: string; headers: Record<string, string> } {
  const orKey = process.env.OPENROUTER_API_KEY || process.env.Open_router_AI;
  if (orKey) {
    return {
      key: orKey,
      baseURL: "https://openrouter.ai/api/v1",
      model: process.env.TENDER_AI_MODEL || "openai/gpt-4o",
      headers: { "HTTP-Referer": "https://eventperfekt.com", "X-Title": "EventPerfekt Tender" },
    };
  }
  const key = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  return { key, baseURL, model: process.env.TENDER_AI_MODEL || "gpt-4o", headers: {} };
}

// ─── EP Agent AI Helper with Failover ────────────────────────────────────────
// Try primary provider (OpenRouter), fallback to OpenAI if needed (Fix 8: 2026-07-10)
async function claudeAI(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<string> {
  // Enforce the org's monthly AI spend cap before spending anything (no-op if no
  // org context or no cap set). Throws a 402-coded error so over-budget generations
  // are blocked instead of silently spending.
  const aiCtx = aiOrgContext.getStore();
  if (aiCtx?.orgId != null) {
    const state = await checkOrgCeiling(aiCtx.orgId);
    if (!state.allowed) {
      const err: any = new Error(`Monthly AI spend cap reached ($${state.spent.toFixed(2)} of $${state.ceiling}). Raise or clear the cap under AI Usage & Cost.`);
      err.code = "AI_BUDGET_EXCEEDED";
      err.status = 402;
      throw err;
    }
  }
  
  // Try primary provider first, fallback to secondary if it fails
  const providers = [resolveAiProvider()];
  const orKey = process.env.OPENROUTER_API_KEY || process.env.Open_router_AI;
  const oaiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  
  // If primary is OpenRouter, add OpenAI as fallback. If primary is OpenAI, no fallback needed.
  if (orKey && !process.env.OPENROUTER_API_KEY_DISABLED) {
    if (oaiKey) {
      providers.push({
        key: oaiKey,
        baseURL: (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
        model: "gpt-4o",
        headers: {},
      });
    }
  }
  
  let lastError: Error | null = null;
  for (let i = 0; i < providers.length; i++) {
    const ai = providers[i];
    if (!ai.key) continue;
    
    try {
      const response = await fetch(`${ai.baseURL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ai.key}`, ...ai.headers },
        body: JSON.stringify({
          model: ai.model,
          max_tokens: maxTokens,
          messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            { role: "user", content: userPrompt },
          ],
        }),
      });
      const data = await response.json() as any;
      if (data.error) {
        lastError = new Error(data.error.message || "AI API error");
        console.warn(`[AI] Provider ${i} (${ai.baseURL.includes("openrouter") ? "OpenRouter" : "OpenAI"}) failed:`, lastError.message);
        continue; // Try next provider
      }
      
      // Log successful generation with provider info for monitoring
      const providerName = ai.baseURL.includes("openrouter") ? "openrouter" : "openai";
      console.log(`[AI] Generated via ${providerName} (${i === 0 ? "primary" : "fallback"}): ${data.usage?.completion_tokens || 0} tokens`);
      
      // Record spend for the cost dashboard + cap accounting (best-effort; never throws).
      if (aiCtx?.orgId != null && data.usage) {
        const cost = (data.usage.prompt_tokens || 0) / 1_000_000 * GPT4O_USD_PER_1M_IN
          + (data.usage.completion_tokens || 0) / 1_000_000 * GPT4O_USD_PER_1M_OUT;
        await recordAiUsage({ orgId: aiCtx.orgId, feature: aiCtx.feature || "tender_ai", provider: providerName, model: ai.model }, data.usage, cost);
      }
      return data.choices?.[0]?.message?.content || "";
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[AI] Provider ${i} request failed:`, lastError.message);
      if (i < providers.length - 1) {
        console.log(`[AI] Trying fallback provider...`);
      }
    }
  }
  
  // All providers failed
  throw lastError || new Error("No AI providers available");
}

// ─── Multi-turn chat helper (same model/cap/accounting as claudeAI + failover) ──
// Takes a full messages array so Elizabeth can hold a real back-and-forth
// conversation with memory of the thread. Includes AI provider failover (Fix 8).
async function claudeChat(messages: { role: string; content: string }[], maxTokens = 1200): Promise<string> {
  const aiCtx = aiOrgContext.getStore();
  if (aiCtx?.orgId != null) {
    const state = await checkOrgCeiling(aiCtx.orgId);
    if (!state.allowed) {
      const err: any = new Error(`Monthly AI spend cap reached ($${state.spent.toFixed(2)} of $${state.ceiling}). Raise or clear the cap under AI Usage & Cost.`);
      err.code = "AI_BUDGET_EXCEEDED"; err.status = 402; throw err;
    }
  }
  
  // Try primary provider first, fallback to secondary if it fails
  const providers = [resolveAiProvider()];
  const orKey = process.env.OPENROUTER_API_KEY || process.env.Open_router_AI;
  const oaiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  
  if (orKey && !process.env.OPENROUTER_API_KEY_DISABLED) {
    if (oaiKey) {
      providers.push({
        key: oaiKey,
        baseURL: (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
        model: "gpt-4o",
        headers: {},
      });
    }
  }
  
  let lastError: Error | null = null;
  for (let i = 0; i < providers.length; i++) {
    const ai = providers[i];
    if (!ai.key) continue;
    
    try {
      const response = await fetch(`${ai.baseURL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ai.key}`, ...ai.headers },
        body: JSON.stringify({ model: ai.model, max_tokens: maxTokens, messages }),
      });
      const data = await response.json() as any;
      if (data.error) {
        lastError = new Error(data.error.message || "AI API error");
        console.warn(`[Elizabeth] Provider ${i} failed:`, lastError.message);
        continue;
      }
      
      const providerName = ai.baseURL.includes("openrouter") ? "openrouter" : "openai";
      console.log(`[Elizabeth] Chat via ${providerName} (${i === 0 ? "primary" : "fallback"}): ${data.usage?.completion_tokens || 0} tokens`);
      
      if (aiCtx?.orgId != null && data.usage) {
        const cost = (data.usage.prompt_tokens || 0) / 1_000_000 * GPT4O_USD_PER_1M_IN
          + (data.usage.completion_tokens || 0) / 1_000_000 * GPT4O_USD_PER_1M_OUT;
        await recordAiUsage({ orgId: aiCtx.orgId, feature: aiCtx.feature || "elizabeth_chat", provider: providerName, model: ai.model }, data.usage, cost);
      }
      return data.choices?.[0]?.message?.content || "";
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[Elizabeth] Provider ${i} request failed:`, lastError.message);
      if (i < providers.length - 1) console.log(`[Elizabeth] Trying fallback provider...`);
    }
  }
  
  throw lastError || new Error("No AI providers available");
}

// Live Contracts Finder search (free OCDS API) for Elizabeth's "find more" intent.
// Returns live, future-deadline notices only. Soft-fails to [].
async function liveContractsFinderSearch(query: string, limit = 8): Promise<{ title: string; buyer: string; deadline: string; url: string }[]> {
  try {
    const year = new Date().getFullYear();
    const url = `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?queryString=${encodeURIComponent(query)}&stage=tender&output=json&publishedFrom=${year - 1}-01-01&size=40`;
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const now = new Date(); const out: any[] = [];
    for (const r of (data?.releases || [])) {
      const t = r.tender || {}; const dl = t.tenderPeriod?.endDate || "";
      const status = (t.status || "").toLowerCase();
      if (["closed", "cancelled", "complete", "awarded", "unsuccessful", "withdrawn"].includes(status)) continue;
      if (!dl || new Date(dl) <= now) continue;
      const title = (t.title || "").trim();
      // Positive relevance gate — keep only tenders that fit an EP lane (and aren't
      // an anti-target), using the SAME scorer the daily sweep uses. This drops
      // fuzzy keyword-match noise (roof chillers, plant replacement, etc.) that a
      // keyword EXCLUDE list alone can't catch (Targeting Spec §7/§12).
      const desc = (t.description || "");
      const verdict = evaluateRelevance({ title, buyer: (r.buyer?.name) || "", description: desc });
      if (verdict.excluded || !verdict.passes) continue;
      const hay = `${title} ${desc}`.toLowerCase();
      if (EP_EXCLUDE_KEYWORDS.some(k => hay.includes(k))) continue;
      const idParts = (r.id || "").split("-"); const guid = idParts.length >= 5 ? idParts.slice(0, 5).join("-") : (r.id || "");
      out.push({ title, buyer: (r.buyer?.name) || "?", deadline: dl.split("T")[0], url: guid ? `https://www.contractsfinder.service.gov.uk/Notice/${guid}` : "" });
      if (out.length >= limit) break;
    }
    return out;
  } catch { return []; }
}

function buildFallbackProspect(category: string, country: "GB" | "NG", idx: number) {
  const orgs = country === "GB"
    ? ["FCDO", "DEFRA", "CEFAS", "British Council", "NHS England", "World Bank"]
    : ["Federal Ministry of Agriculture", "Lagos State Government", "NGO Alliance", "ECOWAS", "UNDP", "GIZ"];
  const name = orgs[idx % orgs.length];
  return {
    company_name: `${name} ${category} Lead ${idx + 1}`,
    industry: category,
    location: country === "GB" ? "United Kingdom" : "Nigeria",
    country,
    website: "",
    milestone_type: category,
    milestone_detail: `${name} opportunity aligned to project delivery and stakeholder engagement`,
    founded_year: null,
    contact_info: "",
    notes: "Generated from local fallback",
    priority: "High",
  };
}

// ─── Email Routing Helper ────────────────────────────────────────────────────
// All automated emails go to the primary inbox AND the team inboxes so
// Prab, Juliet and Abraham receive every discovery alert and daily briefing.
const EP_TEAM_EMAILS_GB = [
  "adminuk@eventperfekt.com",
  "info@eventperfekt.com",
  "admin@eventperfekt.com",
];
const EP_TEAM_EMAILS_NG = [
  "admin@eventperfekt.com",
  "info@eventperfekt.com",
  "adminuk@eventperfekt.com",
];

async function sendRoutedEmail(entity: "GB" | "NG", subject: string, html: string, orgId?: number) {
  // Recipient override (comma-separated) lets testing/staging point briefings at a
  // safe inbox instead of the hardcoded production team addresses.
  const override = (process.env.TENDER_EMAIL_RECIPIENTS || "").split(",").map(s => s.trim()).filter(Boolean);
  // ONE digest to ONE group alias (Targeting Spec §11) — not three mailboxes.
  // Default to DIGEST_RECIPIENT (a single group alias); set TENDER_EMAIL_RECIPIENTS
  // to a comma-list only if you deliberately want more than one inbox.
  const singleDefault = process.env.DIGEST_RECIPIENT || (entity === "NG" ? EP_TEAM_EMAILS_NG[0] : EP_TEAM_EMAILS_GB[0]);
  const recipients = override.length ? override : [singleDefault];
  // Safety net: never email the real team inboxes from a non-production run unless an
  // explicit override is set. Set TENDER_EMAIL_DRYRUN=true to force-suppress anywhere.
  // This stops smoke/manual tests from spamming live inboxes.
  const dryRun = process.env.TENDER_EMAIL_DRYRUN === "true"
    || (process.env.NODE_ENV !== "production" && override.length === 0);
  if (dryRun) {
    console.log(`[EP Agent][dry-run] Suppressed email "${subject}" → would send to ${recipients.join(", ")} (${html.length} bytes)`);
    if (orgId) {
      await db.execute(sql`INSERT INTO saas_automation_log (org_id, entity, action, result, email_sent) VALUES (${orgId}, ${entity}, ${"email_dryrun"}, ${subject}, false)`).catch(() => {});
    }
    return;
  }
  const primary = recipients[0];
  const ccList = recipients.slice(1);
  try {
    // Build an HTML wrapper that includes all recipients in To/CC visibly
    const fullHtml = html + `<hr style="margin-top:32px;border:none;border-top:1px solid #e2e8f0;"><p style="color:#94a3b8;font-size:11px;">Sent automatically by EP Agent to ${recipients.join(", ")}</p>`;
    if (entity === "NG") {
      await _sendMailNG(primary, subject, fullHtml, ccList);
    } else {
      await _sendMail(primary, subject, fullHtml, ccList);
    }
    if (orgId) {
      await db.execute(sql`INSERT INTO saas_automation_log (org_id, entity, action, result, email_sent) VALUES (${orgId}, ${entity}, ${"email_sent"}, ${subject}, true)`).catch(() => {});
    }
  } catch (err: any) {
    console.error("Email send error:", err.message);
    // Fallback: try each address individually
    for (const addr of recipients.slice(1)) {
      try {
        if (entity === "NG") { await _sendMailNG(addr, subject, html); }
        else { await _sendMail(addr, subject, html); }
      } catch {}
    }
  }
}

function stripHtml(input: string) {
  return String(input || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isAwardNotice(title: string, description: string, noticeType: string) {
  const text = `${title} ${description} ${noticeType}`.toLowerCase();
  return text.includes("contract award") || text.includes("award notice");
}

function isValidDeadline(deadline: string | null | undefined) {
  if (!deadline || deadline === "—") return false;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  const max = new Date();
  max.setMonth(max.getMonth() + 12);
  return d <= max;
}

function safeText(value: any) {
  return stripHtml(String(value ?? ""));
}

function cleanTenderTitle(value: any) {
  const t = safeText(value).replace(/\s+/g, " ").trim();
  return t ? (t.length > 120 ? t.slice(0, 120).trim() : t) : "";
}

function isRelevantGeo(country: string, description: string, title: string) {
  const c = (country || "").toLowerCase();
  const text = `${country || ""} ${description || ""} ${title || ""}`.toLowerCase();
  if (["uk", "united kingdom", "britain", "england", "scotland", "wales", "nigeria"].includes(c)) return "standard";
  if (/africa|sub-saharan|west africa|east africa|southern africa|central africa|regional africa|multi-country africa/.test(text)) return "standard";
  if (/africa|sub-saharan|regional|international|multilateral|global/.test(text)) return "manual";
  return "exclude";
}

// Sectors/keywords that are completely irrelevant to EP — reject before calling Claude
const IRRELEVANT_TITLE_PATTERNS = [
  /roofing|roof work|roof repair|roof replacement/i,
  /flooring|floor works|floor installation/i,
  /pest control/i,
  /school uniform|embroidered badge/i,
  /fire extinguisher|fire alarm/i,
  /boiler replacement|boiler install/i,
  /plumbing|drainage|sewage/i,
  /electrical|wiring|M&E works/i,
  /fencing|play equipment|playground/i,
  /topographic survey/i,
  /coastguard station|rescue station/i,
  /road works|highway|trans-pennine|motorway/i,
  /demolition|refurbishment works|fit.?out works|remodel/i,
  /waste management|waste disposal|refuse/i,
  /veterinary|patient record|homecare/i,
  /salt order|bulk supply|tinned goods|dried foods|pasties/i,
  /malware|cyber skills|phishing/i,
  /prison|HMP/i,
  /floral display|flower|gardening|pruning/i,
  /shipping container/i,
  /catering supply|food supply/i,
  /payroll software|HR software/i,
  /student accommodation|university accommodation/i,
  // Facilities management / building services — no relation to events or programme delivery
  /chiller|air[\s-]?conditioning|\bHVAC\b|ventilation|heating system|cooling system|refrigeration|\bAHU\b/i,
  /building management system|\bBMS\b|access control system|door entry/i,
  /cleaning|janitorial|hygiene service|washroom|consumables/i,
  /grounds maintenance|landscaping|grass cutting|tree (works|surgery)|grounds care/i,
  /lift (maintenance|installation|replacement)|escalator|scaffolding|asbestos|glazing|window replacement/i,
  /security guard|manned guarding|CCTV|alarm monitoring/i,
  /painting|decorating|joinery|brickwork|groundworks|civil works|construction works/i,
  // Staffing / recruitment supply — not a service EP delivers
  /staffing (panel|framework|agency)|agency (staff|worker)|temporary staff|recruitment (agency|framework)|supply teacher|locum|bank staff/i,
];

function isIrrelevantTitle(title: string): boolean {
  return IRRELEVANT_TITLE_PATTERNS.some(pattern => pattern.test(title));
}

function normalizeDiscoveryScore(score: number, title: string, description: string, buyer = "") {
  const text = `${title} ${description}`.trim();
  if (!text || /^\s*$/.test(text)) return 0;
  if (text.length < 20) return Math.min(score, 25);
  // Penalise anything that slipped through with irrelevant keywords
  if (isIrrelevantTitle(title)) return 0;
  // "High-value only" gate: no strategic anchor (recognised buyer or strategic
  // theme) → cap below the qualifying threshold so it never reaches the digest.
  // This is what removes generic local-council / operational notices ("marquees
  // for the Events Department", "first-aid trainer programme") regardless of the
  // AI base score. Mirrors evaluateRelevance's gate for the sweeper path.
  if (!hasStrategicAnchor({ title, buyer, description })) return Math.min(score, 20);

  // ── EP Business Fit Score ──
  // Tightens scoring to EP's actual delivery capability. Any tender that
  // doesn't clearly relate to our services gets a strong penalty.
  const textLower = text.toLowerCase();
  const epSignals = [
    "event", "events", "conference", "summit", "exhibition", "gala", "award", "awards",
    "programme", "programme delivery", "programme management", "stakeholder",
    "engagement", "facilitation", "workshop", "delegate", "capacity building",
    " africa", "nigeria", "ghana", "kenya", "senegal", "mozambique", "zambia",
    "fcdo", "defra", "cefas", "british council", "dcms", "cabinet office",
    "international development", "overseas development", "cross-border",
    "remittance", "financial inclusion", "diaspora", "fintech",
    "pmo", "programme management office", "portfolio", "project management",
    "change management", "transformation", "consultancy", "management consultant",
    "youth", "mentoring", "violence reduction", "safeguarding", "community",
    "vcse", "vcs", "voluntary sector", "charity", "early intervention",
  ];
  const epStrongSignals = [
    "event production", "event management", "conference management", "summit management",
    "programme delivery", "programme management", "stakeholder engagement",
    "capacity building", "international development", "cross-border payments",
    "remittance programme", "diaspora", "fintech africa", "pmo", "portfolio management",
    "change management", "transformation programme", "youth violence", "mentoring",
    "serious youth violence", "violence reduction", "safeguarding", "charity delivery",
  ];
  const hasEpSignal = epSignals.some(s => textLower.includes(s));
  const hasStrongSignal = epStrongSignals.some(s => textLower.includes(s));
  const hasEventSignal = /\b(event|events|conference|summit|exhibition|gala|award ceremony|delegate|venue|hospitality|logistics|production)\b/.test(textLower);

  if (!hasEpSignal && !hasEventSignal) {
    // No EP signal at all — hard penalty unless high base score
    return Math.min(score, 35);
  }
  if (!hasStrongSignal && score >= 60) {
    // Moderate score without strong signal — cap it
    return Math.min(score, 55);
  }
  if (hasStrongSignal) {
    // Strong signal — boost slightly
    return Math.min(100, score + 8);
  }
  return score;
}

// ─── Daily-briefing shared helpers (used by both the manual + scheduled briefing) ─
// A "real" notice link points at a specific tender notice, not a search page or a
// bare portal homepage. Search/portal links are flagged so a curated watch-list lead
// is never mistaken for a live, biddable ITT.
function isRealNoticeUrl(url: string): boolean {
  return /\/Notice\/|ocds-[a-z0-9]|\/procurement\/|contractsfinder\.service\.gov\.uk\/notice/i.test(url)
    && !/\/Search\b|searchTerm=|\?k=/i.test(url);
}
const BRIEFING_PLATFORM_URL = "https://eventperfekt.net/saas-tender-dashboard";
function briefingTenderLink(t: any): string {
  const raw = String(t.source_url || t.external_url || t.url || "").trim();
  const url = raw || BRIEFING_PLATFORM_URL;
  const flag = raw && !isRealNoticeUrl(raw)
    ? ' <span style="color:#94a3b8;font-size:11px;font-weight:400;">(portal — register interest)</span>'
    : "";
  return `<a href="${url}" style="color:#330311;font-weight:600;text-decoration:none;" target="_blank">${safeText(t.title)}</a>${flag}`;
}
function briefingDeadlineLabel(t: any): string {
  return t.deadline ? `⏰ ${fmtDateEmail(t.deadline)}` : "🔄 Rolling — monitor for ITT";
}
// Build the briefing's "next actions" deterministically from the real pipeline —
// what is closing, what is awaiting sign-off, what strong-fit work needs a draft.
// This replaces generic LLM advice ("research the market") with concrete, tender-
// specific actions the user can actually take today.
function buildBriefingActions(opts: { deadlineSoon: any[]; awaitingReview: any[]; strongFit: any[]; watching: any[] }): string[] {
  const actions: string[] = [];
  for (const t of opts.deadlineSoon.slice(0, 5)) {
    actions.push(`<strong>Closing ${fmtDateEmail(t.deadline)}:</strong> progress and submit your bid for “${safeText(t.title)}” (${safeText(t.buyer)}).`);
  }
  if (opts.awaitingReview.length) {
    const titles = Array.from(new Set(opts.awaitingReview.map((s: any) => s.tender_title).filter(Boolean))).slice(0, 3).map(safeText);
    actions.push(`Review and approve ${opts.awaitingReview.length} bid section(s) awaiting sign-off${titles.length ? `: ${titles.join(", ")}` : ""}.`);
  }
  const soonIds = new Set(opts.deadlineSoon.map((t: any) => t.id));
  const liveStrong = opts.strongFit.filter((t: any) => t.deadline && !soonIds.has(t.id)).slice(0, 3);
  for (const t of liveStrong) {
    actions.push(`Start or continue a draft for strong-fit tender “${safeText(t.title)}” (${safeText(t.buyer)}) — closes ${fmtDateEmail(t.deadline)}.`);
  }
  if (actions.length === 0) {
    actions.push("No live deadlines today — monitor the watch-list above for new ITTs and keep your company profile and bid vault current.");
  }
  return actions;
}
function renderBriefingActions(actions: string[]): string {
  return `<ul style="margin:0;padding:0 0 0 18px;line-height:1.7;">${actions.map(a => `<li style="margin:0 0 12px 0;">${a}</li>`).join("")}</ul>`;
}

// Drop awarded/past notices (by title) and de-duplicate by title.
function filterBriefingTenders(rows: any[]): any[] {
  const seen = new Set<string>();
  return rows.filter((t) => {
    const title = String(t.title || "");
    if (!title) return false;
    if (isAwardNotice(title, String(t.description || ""), "")) return false;
    const key = title.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── EP Agent System Prompt ──────────────────────────────────────────────────
// Grounded bid-writer system prompt: the Constitution (§0) + Bid Writer (§3) from the
// installed prompt architecture (ep-tender-prompts.ts), grounded ONLY in the verified
// Bid Playbook core (ep-bid-playbook.ts). Replaces the previous prompt, which opened
// with a fabricated "winning tens of thousands of bids" claim, a wrong registered
// address, and an unverified client list — exactly what the Constitution forbids.
const EP_AGENT_SYSTEM_PROMPT = `${withConstitution(EP_BID_WRITER)}

═══ GROUNDING CONTEXT — the ONLY source of truth about EventPerfekt (cite it; never add to it) ═══
${EP_PLAYBOOK_CORE}`;


// ── Helper: keep saas_org_tender_scores in sync after any saas_tenders upsert ─
async function syncOrgScores(tenderId: number | string): Promise<void> {
  try {
    const t = await db.execute(sql`
      SELECT ep_relevance_score, ep_matched_keywords, alli_relevance_score, alli_matched_keywords, pmo_relevance_score, pmo_matched_keywords
      FROM saas_tenders WHERE id = ${tenderId}
    `);
    if (!t.rows.length) return;
    const r = t.rows[0] as any;
    const upsertOrg = async (org: string, score: number, kw: string[]) => {
      if (!score || score <= 0) return;
      const { pgTextArray } = await import("./tender-finder-service");
      await db.execute(sql`
        INSERT INTO saas_org_tender_scores (tender_id, org_code, score, matched_keywords, scored_at)
        VALUES (${tenderId}, ${org}, ${score}, ${pgTextArray(kw || [])}::text[], NOW())
        ON CONFLICT (tender_id, org_code) DO UPDATE SET score = EXCLUDED.score, matched_keywords = EXCLUDED.matched_keywords, scored_at = NOW()
      `);
    };
    await upsertOrg("EP",   r.ep_relevance_score   || 0, r.ep_matched_keywords   || []);
    await upsertOrg("ALLI", r.alli_relevance_score || 0, r.alli_matched_keywords || []);
    await upsertOrg("PMO",  r.pmo_relevance_score  || 0, r.pmo_matched_keywords  || []);
  } catch { /* non-blocking */ }
}

// ── Helper: parse a JSON object out of an LLM response (tolerates ```json
// fences and surrounding prose). Returns null if nothing parseable is found.
function parseJsonLoose(raw: string): any {
  if (!raw) return null;
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(s); } catch {}
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try { return JSON.parse(s.slice(first, last + 1)); } catch {}
  }
  return null;
}

// ── Helper: live research links for a buyer (images of their past events, news/
// feedback, official notice pages). We surface real search links rather than
// scraping/guessing imagery — the bid writer opens them to do visual due diligence.
function buyerResearchLinks(buyer: string): { label: string; url: string }[] {
  const q = encodeURIComponent(buyer || "");
  if (!buyer) return [];
  return [
    { label: "Past events (image search)", url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(buyer + " event OR conference OR ceremony")}` },
    { label: "News & feedback", url: `https://news.google.com/search?q=${q}` },
    { label: "Website / about", url: `https://www.google.com/search?q=${q}` },
    { label: "Their Contracts Finder notices", url: `https://www.contractsfinder.service.gov.uk/Search?&keywords=${q}` },
    { label: "Their Find a Tender notices", url: `https://www.find-tender.service.gov.uk/Search/Results?Keywords=${q}` },
  ];
}

// ── Helper: fetch images of a buyer's past events via Google Custom Search.
// OPTIONAL & key-gated: only runs when GOOGLE_CSE_KEY + GOOGLE_CSE_ID are set
// (so it costs nothing until the team opts in, and never blocks the deep dive).
// Soft-fails to [] on any error. Free tier = 100 queries/day.
async function fetchBuyerEventImages(buyer: string): Promise<{ url: string; thumb: string; source: string }[]> {
  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!key || !cx || !buyer) return [];
  try {
    const q = encodeURIComponent(`${buyer} event OR conference OR ceremony`);
    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&searchType=image&num=6&safe=active&q=${q}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.items || []).slice(0, 6).map((it: any) => ({
      url: it.link,
      thumb: it.image?.thumbnailLink || it.link,
      source: it.image?.contextLink || it.link,
    })).filter((i: any) => i.url);
  } catch { return []; }
}

// ── Helper: format extracted tender pack facts into AI context block ─────────
async function buildExtractedFactsContext(tenderId: number | string, orgId: number | string): Promise<string> {
  try {
    const rows = await db.execute(sql`
      SELECT fact_type, fact_label, fact_value, confidence_score, verified_by_user
      FROM saas_tender_extracted_facts
      WHERE tender_id = ${tenderId}
      ORDER BY fact_type, confidence_score DESC
    `);
    if (!rows.rows.length) return "";

    const grouped: Record<string, string[]> = {};
    for (const r of rows.rows as any[]) {
      const ft = r.fact_type || "other";
      if (!grouped[ft]) grouped[ft] = [];
      const verifiedMark = r.verified_by_user ? " ✓" : "";
      grouped[ft].push(`  • ${r.fact_label}: ${r.fact_value}${verifiedMark}`);
    }

    const sectionLabels: Record<string, string> = {
      requirement: "REQUIREMENTS",
      evaluation_criterion: "EVALUATION CRITERIA & SCORING",
      evaluation_weight: "SCORING WEIGHTS",
      deadline: "DEADLINES",
      key_date: "KEY DATES",
      value: "CONTRACT VALUE",
      duration: "CONTRACT DURATION",
      lot_structure: "LOT STRUCTURE",
      eligibility: "ELIGIBILITY & MANDATORY CRITERIA",
      mandatory_pass_fail: "MANDATORY PASS/FAIL",
      submission_requirement: "SUBMISSION REQUIREMENTS",
      submission_format: "SUBMISSION FORMAT, WORD LIMITS & FORMATTING (obey these)",
      social_value_requirement: "SOCIAL VALUE REQUIREMENTS",
      contact: "CONTACTS",
    };

    const lines: string[] = ["\n\nTENDER PACK — EXTRACTED INTELLIGENCE (from uploaded ITT documents):"];
    for (const [ft, items] of Object.entries(grouped)) {
      lines.push(`\n${sectionLabels[ft] || ft.toUpperCase()}:`);
      lines.push(...items);
    }
    lines.push("\n(Facts marked ✓ have been verified by the bid team. All others are AI-extracted — treat with appropriate diligence.)");
    return lines.join("\n");
  } catch {
    return "";
  }
}

// ── E1: Citation helpers ──────────────────────────────────────────────────────
// Appended to every generation system prompt so Claude cites its sources inline.
const CITATION_PROMPT_ADDON = `

CITATION REQUIREMENTS — cite every specific fact, figure, or evidence claim you make, inline, immediately after the claim, using these EXACT markers:
- Tender pack documents: [Doc: filename, p. N]
- Bid Vault documents: [Vault: doc-name]
- Learning vault past wins: [Win: tender-name]
- Learning vault past losses: [Loss: tender-name, lesson]
Only cite sources that appear in the context provided to you. Never invent sources.
Example: "We delivered 12 ministerial events across 8 countries [Win: FCDO Conference Production 2023], achieving 98% client satisfaction [Vault: CEFAS Case Study]."`;

// Parse [Doc|Vault|Win|Loss: ...] markers from generated text into structured array
function parseCitations(text: string): Array<{ type: string; source: string; raw_marker: string; page?: string }> {
  const result: Array<{ type: string; source: string; raw_marker: string; page?: string }> = [];
  const regex = /\[(Doc|Vault|Win|Loss): ([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const type = match[1];
    const rawSource = match[2];
    const raw_marker = match[0];
    const pageMatch = rawSource.match(/,\s*p\.?\s*(\d+)/i);
    const page = pageMatch ? pageMatch[1] : undefined;
    const source = pageMatch ? rawSource.replace(/,\s*p\.?\s*\d+/i, "").trim() : rawSource.trim();
    result.push({ type, source, raw_marker, ...(page && { page }) });
  }
  return result;
}

// EP-specific buyer names to search by name for targeted discovery
const EP_TARGET_BUYERS = [
  // UK Government
  "Foreign Commonwealth Development Office",
  "FCDO",
  "Centre for Environment Fisheries and Aquaculture Science",
  "CEFAS",
  "Department for Environment Food and Rural Affairs",
  "DEFRA",
  "UK Health Security Agency",
  "UKHSA",
  "British Council",
  "Greater London Authority",
  "GLA",
  "Cabinet Office",
  "Crown Commercial Service",
  "DCMS",
  "Department for Culture Media and Sport",
  "NHS England",
  "Animal and Plant Health Agency",
  "APHA",
  "Marine Management Organisation",
  "Joint Nature Conservation Committee",
  "JNCC",
  "Home Office",
  "UK Finance",
  "Payment Systems Regulator",
  "Financial Conduct Authority",
  "HM Treasury",
  // International / Multilateral
  "World Bank",
  "International Finance Corporation",
  "IFC",
  "UN Capital Development Fund",
  "UNCDF",
  "International Organisation for Migration",
  "IOM",
  "UNDP",
  "IFAD",
  "Commonwealth Secretariat",
  "African Development Bank",
  "AfDB",
  "GSMA",
  "Gates Foundation",
];

// Known high-value framework/tender opportunities to always monitor.
// Rules: only include entries where a future ITT is genuinely expected.
// Remove anything: expired deadline, already Won, old closed notices, or irrelevant sector.
const EP_PINNED_OPPORTUNITIES = [
  // ─── UK Government Event Management Frameworks ──────────────────────────────
  {
    title: "GLA NYE Event Framework 2026-2029",
    buyer: "Greater London Authority",
    source_url: "https://www.find-tender.service.gov.uk/procurement/ocds-h6vhtk-05248f",
    deadline: "",
    status: "Pinned",
    category: "Event Management Framework",
    country: "GB",
    description: "GLA New Year's Eve Event Framework 2026-2029 — ongoing call-off opportunity for London event delivery across the 3-year framework.",
  },
  {
    title: "FCDO Global Development Delivery Framework",
    buyer: "Foreign Commonwealth Development Office",
    source_url: "https://www.find-tender.service.gov.uk/Notice/003389-2024",
    deadline: "",
    status: "Pinned",
    category: "International Development",
    country: "GB",
    description: "FCDO Global Development Delivery Framework — £1.5B framework for international programme and event delivery. Call-off contracts issued throughout the framework period.",
  },
  // ─── Africa / International Development Programmes ──────────────────────────
  {
    title: "FCDO Nigeria NEST Programme — Phase 2",
    buyer: "Foreign Commonwealth Development Office",
    source_url: "https://www.find-tender.service.gov.uk/Notice/036929-2024",
    deadline: "",
    status: "Pinned",
    category: "Africa / International Event Management",
    country: "GB",
    description: "FCDO Nigeria NEST Programme — stakeholder engagement and programme delivery in Nigeria. Watch for Phase 2 ITT on Find a Tender.",
  },
  {
    title: "UKHSA Pan-Africa Health Logistics — Next Procurement",
    buyer: "UK Health Security Agency",
    source_url: "https://www.find-tender.service.gov.uk/Search/Results?&searchTerm=UKHSA+Africa",
    deadline: "",
    status: "Pinned",
    category: "Africa / International Event Management",
    country: "GB",
    description: "UKHSA regularly procures logistics and events for pan-Africa health programmes (Nigeria, Ethiopia, Zambia). Previous contract closed — watch for next round. Register UKHSA supplier interest now.",
  },
  // ─── Remittance & Financial Inclusion Programmes ────────────────────────────
  {
    title: "FCDO UK-Africa Remittance Corridor Programme",
    buyer: "Foreign Commonwealth Development Office",
    source_url: "https://www.find-tender.service.gov.uk/Search/Results?&searchTerm=remittance",
    deadline: "",
    status: "Pinned",
    category: "Remittance & Cross-Border Payments",
    country: "GB",
    description: "FCDO programme to reduce UK-Africa remittance costs and strengthen diaspora financial corridors. EP is well-positioned to deliver stakeholder events, workshops and corridor analysis. Monitor Find a Tender for live ITT.",
  },
  {
    title: "IOM Cross-Border Mobility & Remittance Programme",
    buyer: "International Organisation for Migration",
    source_url: "https://www.ungm.org/Public/Notice/Search?k=remittance",
    deadline: "",
    status: "Pinned",
    category: "Remittance & Cross-Border Payments",
    country: "GB",
    description: "IOM procures event management and conference logistics for cross-border mobility and remittance programmes across West Africa. Register on UNGM to receive ITTs directly.",
  },
  {
    title: "Commonwealth Secretariat Financial Inclusion Programme",
    buyer: "Commonwealth Secretariat",
    source_url: "https://www.commonwealth-enterprise.com/tenders",
    deadline: "",
    status: "Pinned",
    category: "Remittance & Cross-Border Payments",
    country: "GB",
    description: "Commonwealth Secretariat procures event management and stakeholder consultations for financial inclusion and cross-border payment reform across Commonwealth member states.",
  },
  {
    title: "AfDB Africa Fintech & Remittance Forum Delivery",
    buyer: "African Development Bank",
    source_url: "https://www.afdb.org/en/projects-and-operations/procurement",
    deadline: "",
    status: "Pinned",
    category: "Remittance & Cross-Border Payments",
    country: "NG",
    description: "African Development Bank procures event management and conference logistics for Africa Fintech, remittance, and financial inclusion summits. Strong EP fit given Nigeria delivery capabilities.",
  },
  {
    title: "UNCDF Digital Finance & Mobile Money Africa",
    buyer: "UN Capital Development Fund",
    source_url: "https://procurement.uncdf.org/",
    deadline: "",
    status: "Pinned",
    category: "Financial Inclusion",
    country: "GB",
    description: "UNCDF procures event management and stakeholder workshops for digital finance and mobile money programmes across Sub-Saharan Africa including Nigeria.",
  },
];

const DEFAULT_SEARCH_CONFIGS: Record<"GB" | "NG", { keywords: string[]; categories: string[]; countries: string[]; digest_email: string }> = {
  GB: {
    keywords: [
      // Africa / International delivery — highest priority
      "Africa event management",
      "Africa programme delivery",
      "Africa regional support",
      "international development events",
      "FCDO events",
      "FCDO programme delivery",
      "FCDO Africa",
      "CEFAS Africa",
      "DEFRA Africa",
      "UKHSA Africa",
      "Africa logistics",
      "cross-border programme",
      "ODA programme delivery",
      "overseas event management",
      "UK aid programme",
      // UK event management frameworks — tightened toward FCDO/government language
      "event production framework",
      "event production services",
      "event production government",
      "event management framework",
      "event management services",
      "conference management",
      "conference services framework",
      "government events",
      "government conference management",
      "ministerial conference management",
      "diplomatic events management",
      "high commission events",
      "UK government events framework",
      "venue management",
      "delegate management",
      "summit management",
      "award ceremony management",
      "exhibition management services",
      "workshop facilitation",
      "corporate event management",
      "GREAT campaign events",
      // Programme / project delivery
      "programme delivery",
      "programme management",
      "stakeholder engagement",
      "PMO services",
      "project management services",
      "capacity building",
      // Remittance & cross-border payments
      "remittance",
      "remittance programme",
      "cross-border payments",
      "cross-border remittance",
      "diaspora remittance",
      "UK Africa remittance",
      "remittance corridor",
      "money transfer operator",
      "international money transfer",
      "financial inclusion Africa",
      "mobile money Africa",
      "digital payments Africa",
      "payment systems Africa",
      "GSMA mobile money",
      "fintech Africa",
      "migrant remittance",
      "reducing cost of remittances",
      "payment infrastructure",
      "cross-border financial services",
      "Africa financial corridor",
      "IOM remittance",
      "UNCDF digital finance",
      // Buyers
      "British Council",
      "DCMS",
      "Crown Commercial Service",
      "World Bank Africa",
      "IFC payment",
      "Gates Foundation Africa",
    ],
    categories: [
      "Event Management",
      "Event Management Framework",
      "Africa / International Event Management",
      "Programme Management",
      "International Development",
      "Professional Services",
      "Government Services",
      "Venue & Travel",
      "Logistics",
      "Consultancy",
      "Training and Development",
      "Remittance & Cross-Border Payments",
      "Financial Services / Fintech",
      "Payment Systems",
      "Financial Inclusion",
    ],
    countries: ["United Kingdom"],
    digest_email: "adminuk@eventperfekt.com",
  },
  NG: {
    keywords: [
      "event management Nigeria",
      "conference management Lagos",
      "Africa programme delivery",
      "international development West Africa",
      "stakeholder engagement Africa",
      "government events Nigeria",
      "NGO events Africa",
      "capacity building Africa",
      "programme management Africa",
      "ECOWAS events",
      "UN Africa events",
      "UNDP Nigeria",
      "World Bank Nigeria",
      "African Development Bank events",
      "workshop delivery Africa",
      // Remittance & cross-border Nigeria
      "remittance Nigeria",
      "diaspora remittance Nigeria",
      "cross-border payments Nigeria",
      "fintech Nigeria",
      "mobile money Nigeria",
      "financial inclusion Nigeria",
      "Nigeria remittance corridor",
      "money transfer Nigeria",
      "payment systems Nigeria",
      "CBN remittance",
      "NFIU compliance",
      "international transfer Nigeria",
      "IOM Nigeria",
      "UNCDF Nigeria",
      "Africa remittance conference",
    ],
    categories: [
      "Event Management",
      "Programme Management",
      "International Development",
      "Professional Services",
      "Government Services",
      "Remittance & Cross-Border Payments",
      "Financial Services / Fintech",
      "Logistics",
    ],
    countries: ["Nigeria", "Ghana", "Senegal", "Gambia", "Kenya", "Uganda", "Zambia", "Ethiopia", "Mozambique"],
    digest_email: "admin@eventperfekt.com",
  },
};

export const authenticateSaasUser = (req: any, res: any, next: any) => {
  // Internal seed bypass — allows the autoSeedTenders job (loopback request) to
  // populate saas_tenders without a JWT. Only honoured for loopback callers.
  if (req.headers["x-seed-request"] === "true") {
    const ip = (req.ip || req.socket?.remoteAddress || "").replace("::ffff:", "");
    const isLoopback = ip === "127.0.0.1" || ip === "::1" || ip === "localhost" || ip === "";
    if (isLoopback) {
      (async () => {
        try {
          const r = await db.execute(sql`SELECT id FROM saas_organizations ORDER BY id ASC LIMIT 1`);
          const seedOrgId = (r.rows[0] as any)?.id || 1;
          req.saasUser = { orgId: seedOrgId, userId: 0, system: "saas_tender", seed: true };
          aiOrgContext.run({ orgId: seedOrgId, feature: aiFeatureFromPath(req.path) }, next);
        } catch {
          req.saasUser = { orgId: 1, userId: 0, system: "saas_tender", seed: true };
          aiOrgContext.run({ orgId: 1, feature: aiFeatureFromPath(req.path) }, next);
        }
      })();
      return;
    }
  }
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.sendStatus(403);
    if (decoded.system !== "saas_tender") return res.status(403).json({ message: "Invalid token" });
    req.saasUser = decoded;
    aiOrgContext.run({ orgId: decoded.orgId, feature: aiFeatureFromPath(req.path) }, next);
  });
};

function isRelevantTender(title: string, description: string, keywords: string[]): boolean {
  const text = `${title} ${description}`.toLowerCase();
  if (keywords.length === 0) return true;
  return keywords.some(kw => text.includes(kw.toLowerCase()));
}

export async function registerSaasTenderRoutes(app: Express) {
  // Initialize columns if they don't exist
  try {
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'GB'`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS description TEXT`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS published_date DATE`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS source VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS region VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS match_score INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS external_url TEXT`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS raw_data JSONB`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS alli_relevant BOOLEAN DEFAULT false`);
    // Phase 3: three-lane org tagging
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS ep_relevant BOOLEAN DEFAULT false`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS ep_relevance_score INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS ep_matched_keywords TEXT[] DEFAULT '{}'`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS alli_relevance_score INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS alli_matched_keywords TEXT[] DEFAULT '{}'`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS pmo_relevant BOOLEAN DEFAULT false`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS pmo_relevance_score INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS pmo_matched_keywords TEXT[] DEFAULT '{}'`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
    // Phase 2: document ingestion columns
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS documents_uploaded_count INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS last_document_uploaded_at TIMESTAMP NULL`);
    await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS extraction_complete BOOLEAN DEFAULT FALSE`);
    // Fix: uploaded_by_user_id must be TEXT (saas_users.id is UUID), not INTEGER
    await db.execute(sql`ALTER TABLE saas_tender_pack_docs ALTER COLUMN uploaded_by_user_id TYPE TEXT USING uploaded_by_user_id::TEXT`).catch(() => {});
    // Phase 2: tender pack documents (uploaded files, separate from bid draft documents)
    await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_tender_pack_docs (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL,
      tender_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size_bytes INTEGER DEFAULT 0,
      document_type VARCHAR(50) DEFAULT 'other',
      uploaded_by_user_id TEXT,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP NULL,
      extraction_status VARCHAR(20) DEFAULT 'pending',
      extracted_at TIMESTAMP NULL,
      extraction_error TEXT NULL,
      page_count INTEGER NULL,
      word_count INTEGER NULL,
      extracted_text TEXT NULL,
      extraction_summary JSONB NULL
    )`);
    // Phase 2: extracted facts (one row per fact, links back to source doc)
    await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_tender_extracted_facts (
      id SERIAL PRIMARY KEY,
      tender_id INTEGER NOT NULL,
      document_id INTEGER NULL,
      fact_type VARCHAR(50) NOT NULL,
      fact_label TEXT NOT NULL,
      fact_value TEXT NOT NULL,
      fact_metadata JSONB DEFAULT '{}'::jsonb,
      page_reference INTEGER NULL,
      confidence_score INTEGER DEFAULT 50,
      verified_by_user BOOLEAN DEFAULT FALSE,
      verified_at TIMESTAMP NULL,
      verified_by_user_id INTEGER NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    // De-duplicate before adding unique constraint, then add it idempotently
    try {
      await db.execute(sql`
        DELETE FROM saas_tenders a USING saas_tenders b
        WHERE a.id < b.id AND a.org_id = b.org_id AND a.title = b.title
      `);
      await db.execute(sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'saas_tenders_org_title_unique'
          ) THEN
            ALTER TABLE saas_tenders
            ADD CONSTRAINT saas_tenders_org_title_unique UNIQUE (org_id, title);
          END IF;
        END $$;
      `);
    } catch (e: any) { console.error("[saas_tenders unique]", e.message); }
    await db.execute(sql`ALTER TABLE saas_tender_watchlist ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'GB'`);
    await db.execute(sql`ALTER TABLE saas_portal_registrations ADD COLUMN IF NOT EXISTS email VARCHAR(255)`);
    await db.execute(sql`ALTER TABLE saas_portal_registrations ADD COLUMN IF NOT EXISTS password VARCHAR(255)`);
    await db.execute(sql`ALTER TABLE saas_portal_registrations ADD COLUMN IF NOT EXISTS username VARCHAR(255)`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_proposals (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL,
      tender_id INTEGER,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      share_token VARCHAR(32) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_bid_governance_log (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL,
      tender_id INTEGER,
      section_id INTEGER,
      section_name VARCHAR(255),
      action VARCHAR(50) NOT NULL,
      performed_by VARCHAR(255),
      notes TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_learning_vault (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL,
      tender_name VARCHAR(500) NOT NULL,
      reference VARCHAR(100),
      buyer VARCHAR(500),
      date DATE,
      outcome VARCHAR(20),
      our_score NUMERIC(5,2),
      winner_score NUMERIC(5,2),
      score_breakdown JSONB,
      lessons TEXT,
      applied_count INTEGER DEFAULT 0,
      feedback_text TEXT,
      what_to_do_differently TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_automation_log (
      id SERIAL PRIMARY KEY,
      org_id INTEGER,
      entity VARCHAR(2) DEFAULT 'GB',
      action VARCHAR(100) NOT NULL,
      result TEXT,
      email_sent BOOLEAN DEFAULT false,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_tender_fit_scores (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL,
      tender_id INTEGER,
      tender_ext_id VARCHAR(255),
      score INTEGER,
      recommendation VARCHAR(50),
      priority VARCHAR(20),
      geography_flag BOOLEAN DEFAULT false,
      geography_note TEXT,
      reasoning TEXT,
      scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'`);
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ADD COLUMN IF NOT EXISTS governance_status VARCHAR(50) DEFAULT 'not_submitted'`);
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1`);
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ADD COLUMN IF NOT EXISTS entity VARCHAR(2) DEFAULT 'GB'`);
    await db.execute(sql`ALTER TABLE saas_bid_vault_folders ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'GB'`);
    await db.execute(sql`ALTER TABLE saas_bid_vault_files ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'GB'`);

    // ITT Details capture table — stores private ITT portal fields Prab captures manually
    await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_tender_itt_details (
      id SERIAL PRIMARY KEY,
      tender_id INTEGER NOT NULL UNIQUE,
      org_id INTEGER NOT NULL,
      deadline_eoi DATE,
      clarification_deadline DATE,
      clarification_answers_date DATE,
      site_visit_date DATE,
      submission_portal VARCHAR(200),
      portal_url TEXT,
      portal_login VARCHAR(200),
      named_contacts JSONB DEFAULT '[]',
      lot_structure TEXT,
      bid_bond_required BOOLEAN DEFAULT FALSE,
      bid_bond_amount VARCHAR(100),
      bid_bond_details TEXT,
      itt_notes TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Not-relevant signals table (Fix 3)
    await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_tender_not_relevant (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL,
      tender_id INTEGER NOT NULL,
      reason TEXT,
      marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (org_id, tender_id)
    )`);

    // Action items table
    await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_action_items (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      urgency VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(30) DEFAULT 'pending',
      action_label VARCHAR(100),
      action_url TEXT,
      deadline DATE,
      source VARCHAR(100),
      country VARCHAR(2) DEFAULT 'GB',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    // Seed the known EP action items for all existing orgs
    try {
      const orgsForSeed = await db.execute(sql`SELECT id FROM saas_organizations`);
      const EP_ACTION_SEEDS = [
        {
          title: "CCS Global Travel & Venue Framework RM6408 — SUBMIT APPLICATION",
          description: "Crown Commercial Service framework for travel and venue management. Deadline is 30 April 2026 — only days away. You must submit your Expression of Interest/application immediately to avoid missing this framework opportunity.",
          urgency: "critical",
          action_label: "Open on Find a Tender",
          action_url: "https://www.find-tender.service.gov.uk/Notice/019476-2026",
          deadline: "2026-04-30",
          source: "Crown Commercial Service",
          country: "GB",
        },
        {
          title: "UKHSA Pan-Africa Logistics & Events — Check ITT Status",
          description: "UKHSA Pan-Africa Logistics & Events (Nigeria, Ethiopia, Zambia). Check whether the Invitation to Tender (ITT) has been issued. If ITT is live, begin bid preparation immediately using CEFAS contract as evidence.",
          urgency: "high",
          action_label: "Check Notice on FTS",
          action_url: "https://www.find-tender.service.gov.uk/Notice/033080-2024",
          deadline: null,
          source: "UK Health Security Agency",
          country: "GB",
        },
        {
          title: "GLA NYE Event Framework 2026-2029 — Register on TfL SAP Portal",
          description: "GLA New Year's Eve Event Framework is ongoing. You must register on the TfL SAP Ariba portal to be eligible to receive ITT documents and respond. Register at: https://supplier.ariba.com",
          urgency: "high",
          action_label: "Register on TfL SAP Ariba",
          action_url: "https://supplier.ariba.com",
          deadline: null,
          source: "Greater London Authority",
          country: "GB",
        },
        {
          title: "FCDO Global Development & NEST Programme — Monitor Pipeline Status",
          description: "FCDO Global Development Delivery Framework (£1.5B) and FCDO Nigeria NEST Programme. Monitor both notices for pipeline/ITT updates. Register on FCDO Supplier Portal (https://fcdo.proactisportal.com) to receive updates.",
          urgency: "medium",
          action_label: "Open FCDO Supplier Portal",
          action_url: "https://fcdo.proactisportal.com",
          deadline: null,
          source: "Foreign Commonwealth Development Office",
          country: "GB",
        },
        // ─── Remittance & Cross-Border Actions ───────────────────────────────
        {
          title: "FCDO UK-Africa Remittance Programme — Search & Monitor Live Notices",
          description: "FCDO actively funds programmes to reduce cost of UK-Africa remittances. Search Find a Tender now for 'remittance' and 'diaspora' to catch any live ITTs or Pipeline notices. Set up a saved search alert for 'remittance' on Contracts Finder.",
          urgency: "high",
          action_label: "Search remittance on FTS",
          action_url: "https://www.find-tender.service.gov.uk/Search/Results?&searchTerm=remittance",
          deadline: null,
          source: "FCDO / Contracts Finder",
          country: "GB",
        },
        {
          title: "Register on UNGM (UN Global Marketplace) — IOM & UNCDF Access",
          description: "IOM and UNCDF publish remittance and cross-border payment programme tenders exclusively through UNGM. Registering unlocks direct access to ITTs for programme delivery, stakeholder events, and conference management contracts. Complete registration at supplier.ungm.org",
          urgency: "high",
          action_label: "Register on UNGM",
          action_url: "https://supplier.ungm.org",
          deadline: null,
          source: "IOM / UNCDF",
          country: "GB",
        },
        {
          title: "World Bank eConsultant2 Registration — IFC Africa Payment Contracts",
          description: "IFC and World Bank publish Africa payment system and fintech programme procurements exclusively on eConsultant2. Register your company profile to receive RFP notifications for technical assistance, event management, and stakeholder engagement under payment system reform programmes.",
          urgency: "medium",
          action_label: "Register on eConsultant2",
          action_url: "https://wbgeconsult2.worldbank.org",
          deadline: null,
          source: "World Bank / IFC",
          country: "GB",
        },
        {
          title: "GSMA & AfDB Remittance Events — Monitor for Open Procurement",
          description: "GSMA (Mobile Money) and AfDB regularly procure event management for Africa fintech and remittance summits. Monitor GSMA's supplier portal and AfDB's procurement notices for open events management and conference logistics opportunities.",
          urgency: "medium",
          action_label: "Check AfDB Procurement",
          action_url: "https://www.afdb.org/en/projects-and-operations/procurement",
          deadline: null,
          source: "GSMA / African Development Bank",
          country: "GB",
        },
      ];
      for (const seed of EP_ACTION_SEEDS) {
        for (const org of orgsForSeed.rows as any[]) {
          await db.execute(sql`
            INSERT INTO saas_action_items (org_id, title, description, urgency, status, action_label, action_url, deadline, source, country)
            SELECT ${org.id}, ${seed.title}, ${seed.description}, ${seed.urgency}, 'pending', ${seed.action_label}, ${seed.action_url}, ${seed.deadline || null}, ${seed.source}, ${seed.country}
            WHERE NOT EXISTS (SELECT 1 FROM saas_action_items WHERE org_id = ${org.id} AND title = ${seed.title})
          `).catch(() => {});
        }
      }
    } catch {}
    // Migration: ensure all existing orgs have the correct 10 GB + 10 NG folders
    try {
      const orgs = await db.execute(sql`SELECT id FROM saas_organizations`);
      const gbFolders = ["Company Policies","CVs and Team Profiles","Case Studies","Contracts and Agreements","Certificates and Accreditations","Financial Statements","References and Testimonials","Insurance Documents","Equality and Diversity Policy","Modern Slavery Statement"];
      const ngFolders = ["CAC Registration Documents","Tax Clearance Certificate","Audited Accounts","PENCOM Compliance Certificate","ITF Compliance Certificate","NSITF Compliance Certificate","CVs and Team Profiles","Case Studies","References","Evidence of Similar Jobs"];
      for (const org of orgs.rows as any[]) {
        for (const name of gbFolders) {
          await db.execute(sql`INSERT INTO saas_bid_vault_folders (org_id, name, country) SELECT ${org.id}, ${name}, 'GB' WHERE NOT EXISTS (SELECT 1 FROM saas_bid_vault_folders WHERE org_id = ${org.id} AND name = ${name} AND country = 'GB')`);
        }
        for (const name of ngFolders) {
          await db.execute(sql`INSERT INTO saas_bid_vault_folders (org_id, name, country) SELECT ${org.id}, ${name}, 'NG' WHERE NOT EXISTS (SELECT 1 FROM saas_bid_vault_folders WHERE org_id = ${org.id} AND name = ${name} AND country = 'NG')`);
        }
      }
    } catch (e) { console.error("Vault folder migration:", e); }

    // ── Non-prefixed canonical tables (spec-required names) ─────────────────
    await db.execute(sql`CREATE TABLE IF NOT EXISTS bid_sections (
      id SERIAL PRIMARY KEY,
      tender_id INTEGER,
      entity VARCHAR(2) DEFAULT 'GB',
      section_name VARCHAR(255) NOT NULL,
      content TEXT,
      word_count INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'draft',
      version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS bid_governance_log (
      id SERIAL PRIMARY KEY,
      tender_id INTEGER,
      section_id INTEGER,
      action VARCHAR(50) NOT NULL,
      performed_by VARCHAR(255),
      notes TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS learning_vault (
      id SERIAL PRIMARY KEY,
      tender_name VARCHAR(500) NOT NULL,
      reference VARCHAR(100),
      buyer VARCHAR(500),
      date DATE,
      outcome VARCHAR(20),
      our_score NUMERIC(5,2),
      winner_score NUMERIC(5,2),
      score_breakdown JSONB,
      lessons TEXT,
      applied_count INTEGER DEFAULT 0
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS automation_log (
      id SERIAL PRIMARY KEY,
      entity VARCHAR(2) DEFAULT 'GB',
      action VARCHAR(100) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      result TEXT,
      email_sent BOOLEAN DEFAULT false
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS tender_fit_scores (
      id SERIAL PRIMARY KEY,
      tender_id INTEGER,
      score INTEGER,
      recommendation VARCHAR(50),
      priority VARCHAR(20),
      geography_flag BOOLEAN DEFAULT false,
      geography_note TEXT,
      reasoning TEXT,
      scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    // ── Phase 3 / Piece E: citations, confidence, gaps, evidence ──────────────
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ADD COLUMN IF NOT EXISTS citations JSONB DEFAULT '[]'::jsonb`);
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ADD COLUMN IF NOT EXISTS coverage_score INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ADD COLUMN IF NOT EXISTS evidence_score INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ADD COLUMN IF NOT EXISTS voice_score INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ADD COLUMN IF NOT EXISTS overall_confidence INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ADD COLUMN IF NOT EXISTS weak_points TEXT[] DEFAULT '{}'`);
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ADD COLUMN IF NOT EXISTS last_scored_at TIMESTAMP NULL`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS bid_gaps (
      id SERIAL PRIMARY KEY,
      tender_id INTEGER NOT NULL,
      org_id INTEGER NOT NULL,
      requirement TEXT NOT NULL,
      severity VARCHAR(20) DEFAULT 'medium',
      suggested_section_id INTEGER,
      suggestion TEXT,
      status VARCHAR(20) DEFAULT 'open',
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS bid_section_evidence (
      id SERIAL PRIMARY KEY,
      section_id INTEGER NOT NULL,
      vault_doc_id INTEGER NOT NULL,
      attached_at TIMESTAMP DEFAULT NOW(),
      attached_by TEXT
    )`);
    // ── E5: Learning Loop — extend saas_learning_vault for bid-section lessons ─
    await db.execute(sql`ALTER TABLE saas_learning_vault ADD COLUMN IF NOT EXISTS tender_id INTEGER`);
    await db.execute(sql`ALTER TABLE saas_learning_vault ADD COLUMN IF NOT EXISTS section_id INTEGER`);
    await db.execute(sql`ALTER TABLE saas_learning_vault ADD COLUMN IF NOT EXISTS section_type VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE saas_learning_vault ADD COLUMN IF NOT EXISTS severity VARCHAR(20)`);

    // ── FIX 1: saas_org_tender_scores — normalised org-relevance table ────────
    await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_org_tender_scores (
      id SERIAL PRIMARY KEY,
      tender_id INTEGER NOT NULL REFERENCES saas_tenders(id) ON DELETE CASCADE,
      org_code VARCHAR(10) NOT NULL CHECK (org_code IN ('EP','ALLI','PMO')),
      score INTEGER NOT NULL DEFAULT 0,
      matched_keywords TEXT[] DEFAULT '{}',
      scored_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (tender_id, org_code)
    )`);
    // Backfill from inline columns (idempotent via ON CONFLICT DO UPDATE)
    await db.execute(sql`
      INSERT INTO saas_org_tender_scores (tender_id, org_code, score, matched_keywords, scored_at)
      SELECT id, 'EP', ep_relevance_score, COALESCE(ep_matched_keywords, '{}'), COALESCE(updated_at, NOW())
      FROM saas_tenders WHERE COALESCE(ep_relevance_score, 0) > 0
      ON CONFLICT (tender_id, org_code) DO UPDATE SET score = EXCLUDED.score, matched_keywords = EXCLUDED.matched_keywords
    `).catch(() => {});
    await db.execute(sql`
      INSERT INTO saas_org_tender_scores (tender_id, org_code, score, matched_keywords, scored_at)
      SELECT id, 'ALLI', alli_relevance_score, COALESCE(alli_matched_keywords, '{}'), COALESCE(updated_at, NOW())
      FROM saas_tenders WHERE COALESCE(alli_relevance_score, 0) > 0
      ON CONFLICT (tender_id, org_code) DO UPDATE SET score = EXCLUDED.score, matched_keywords = EXCLUDED.matched_keywords
    `).catch(() => {});
    await db.execute(sql`
      INSERT INTO saas_org_tender_scores (tender_id, org_code, score, matched_keywords, scored_at)
      SELECT id, 'PMO', pmo_relevance_score, COALESCE(pmo_matched_keywords, '{}'), COALESCE(updated_at, NOW())
      FROM saas_tenders WHERE COALESCE(pmo_relevance_score, 0) > 0
      ON CONFLICT (tender_id, org_code) DO UPDATE SET score = EXCLUDED.score, matched_keywords = EXCLUDED.matched_keywords
    `).catch(() => {});

    // ── FIX 2: overall_confidence default NULL — sections never scored must be NULL, not 0 ──
    // Drop the DEFAULT 0 so new rows start as NULL (requires a scored event to get a value)
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ALTER COLUMN overall_confidence DROP DEFAULT`).catch(() => {});
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ALTER COLUMN coverage_score DROP DEFAULT`).catch(() => {});
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ALTER COLUMN evidence_score DROP DEFAULT`).catch(() => {});
    await db.execute(sql`ALTER TABLE saas_tender_bid_sections ALTER COLUMN voice_score DROP DEFAULT`).catch(() => {});
    // Null out any existing rows that have 0-scored columns but have never been scored
    await db.execute(sql`
      UPDATE saas_tender_bid_sections
      SET overall_confidence = NULL, coverage_score = NULL, evidence_score = NULL, voice_score = NULL
      WHERE last_scored_at IS NULL
        AND (overall_confidence IS NOT NULL OR coverage_score IS NOT NULL OR evidence_score IS NOT NULL OR voice_score IS NOT NULL)
    `).catch(() => {});

    // ── Compliance Matrix (Phase: win-engine) — requirements → evidence → status ─
    // One row per ITT requirement (sourced from saas_tender_extracted_facts), mapped
    // to our evidence and a Pass/Gap/Fail status. Mandatory rows gate submission.
    // Org-scoped via tender ownership (the facts table has no org_id of its own).
    await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_compliance_matrix (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL,
      tender_id INTEGER NOT NULL,
      fact_id INTEGER,
      requirement TEXT NOT NULL,
      requirement_type VARCHAR(50),
      is_mandatory BOOLEAN DEFAULT FALSE,
      weight INTEGER,
      status VARCHAR(20) DEFAULT 'gap',
      evidence_summary TEXT,
      evidence_vault_doc_id INTEGER,
      evidence_section_key VARCHAR(100),
      owner VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (tender_id, org_id, requirement)
    )`);

    // ── AI cost telemetry (Phase 3, Task 4) — per-org, per-feature usage log ────
    // One row per model call. Multi-tenant cost visibility + the per-org monthly
    // ceiling that blocks non-critical AI when a heavy org would blow the bill.
    await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_ai_usage (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL,
      feature VARCHAR(80) NOT NULL,
      tier VARCHAR(20),
      provider VARCHAR(40),
      model VARCHAR(120),
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      cost_usd NUMERIC(12,6) DEFAULT 0,
      critical BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_saas_ai_usage_org_month ON saas_ai_usage (org_id, created_at)`);
    // Per-org monthly ceiling (USD). NULL = fall back to the AI_MONTHLY_CEILING_USD env default (or no ceiling).
    await db.execute(sql`ALTER TABLE saas_organizations ADD COLUMN IF NOT EXISTS ai_monthly_ceiling_usd NUMERIC(12,2)`).catch(() => {});

    // Seed Learning Vault with GM BGH lesson if not already present
    const gmCheck = await db.execute(sql`SELECT id FROM saas_learning_vault WHERE reference = 'T25003' AND org_id = 1 LIMIT 1`).catch(() => ({ rows: [] }));
    if (gmCheck.rows.length === 0) {
      await db.execute(sql`INSERT INTO saas_learning_vault (org_id, tender_name, reference, buyer, date, outcome, our_score, winner_score, score_breakdown, lessons) VALUES (
        1, 'GM BGH Event Management Enterprise Festival', 'T25003', 'GM Business Growth Hub — Greater Manchester', '2025-10-01', 'Lost', 86, 88,
        '{"Capability Knowledge and Resource":"20/20","Methodology":"12/15","Case Studies":"10/10","Understanding of GM BGH":"5/5","Social Value":"14/20 — CRITICAL GAP","Value for Money":"10/10","Price":"15/20"}',
        'Social value must include quantitative data — numbers, percentages, measurable outcomes. Case studies must demonstrate local geographic relevance — for Greater Manchester use Manchester examples or explicitly address transfer of learning. Price must be sharper for competitive local authority bids. Buyer understanding must go deeper — demonstrate knowledge of specific economic ecosystem. Diverse social value delivery methods score higher than single method approaches. Winner was Elevate GM Ltd at 88% vs our 86%.'
      )`).catch(() => {});
    }

    // Seed Event Perfekt portal registrations for all orgs
    try {
      const orgs = await db.execute(sql`SELECT id FROM saas_organizations`);
      const portalSeeds = [
        { portal_name: "British Council Arts", portal_url: "https://britishcouncilarts.grantplatform.com/", region: "UK", email: "admin@eventperfekt.com", password: "Password123#" },
        { portal_name: "Bid Stats", portal_url: "https://bidstats.uk/", region: "UK", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "Atamis", portal_url: "https://atamis-1928.my.site.com/s/Welcome", region: "UK", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "Home Office Jaggaer", portal_url: "https://homeoffice.app.jaggaer.com/web/login.html", region: "UK", email: "admin@eventperfekt.com", password: "Password12#", username: "Tolulope Johnson" },
        { portal_name: "LUPC Bravo", portal_url: "https://lupc.bravosolution.co.uk/web/login.shtml", region: "UK", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "In-Tend", portal_url: "https://in-tendhost.co.uk/", region: "UK", email: "admin@eventperfekt.com", password: "Password12$" },
        { portal_name: "Arts Council Funding", portal_url: "https://www.artscouncil.org.uk/funding", region: "UK", email: "admin@eventperfekt.com", password: "Password12#", username: "event perfekt global ltd" },
        { portal_name: "Find a Tender", portal_url: "https://www.find-tender.service.gov.uk/", region: "UK", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "Open UK", portal_url: "https://www.open-uk.org/", region: "UK", email: "admin@eventperfekt.com", password: "Password123#" },
        { portal_name: "Verto FX", portal_url: "https://www.vertofx.com/", region: "International", email: "admin@eventperfekt.com", password: "Password123$" },
        { portal_name: "Panacea Software", portal_url: "https://app.panacea-software.com/growth", region: "UK", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "Contracts Finder", portal_url: "https://www.contractsfinder.service.gov.uk/", region: "UK", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "Upwork", portal_url: "https://www.upwork.com/", region: "International", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "PeoplePerHour", portal_url: "https://www.peopleperhour.com/", region: "International", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "Tenders on Time Nigeria", portal_url: "https://www.tendersontime.com/nigeria-tenders/", region: "Nigeria", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "Hospitality Tenders", portal_url: "https://www.hospitalitytenders.co.uk/", region: "UK", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "Tenderlink Newcastle", portal_url: "https://portal.tenderlink.com/newcastle/", region: "UK", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "ClickUp", portal_url: "https://clickup.com/", region: "International", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "Cabinet Office Supplier Reg", portal_url: "https://supplierregistration.cabinetoffice.gov.uk/", region: "UK", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "UNGM", portal_url: "https://www.ungm.org/", region: "International", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "Tender Base", portal_url: "https://tenderbase.co.uk/", region: "UK", email: "admin@eventperfekt.com", password: "Password12#" },
        { portal_name: "Council of Europe eProcurement", portal_url: "https://eproc.coe.int/home", region: "International", email: "admin@eventperfekt.com", password: "Eventperfekt123#" },
        { portal_name: "Scanmarket eSourcing", portal_url: "https://esourcing.scanmarket.com/", region: "UK", email: "admin@eventperfekt.com", password: "Password123#" },
        { portal_name: "Add to Event", portal_url: "https://addtoevent.co.uk/", region: "UK", email: "admin@eventperfekt.com", password: "Password12#" },
      ];
      for (const org of orgs.rows as any[]) {
        for (const p of portalSeeds) {
          await db.execute(sql`
            INSERT INTO saas_portal_registrations (org_id, portal_name, portal_url, region, email, password, username)
            VALUES (${org.id}, ${p.portal_name}, ${p.portal_url}, ${p.region}, ${p.email}, ${p.password}, ${(p as any).username || null})
            ON CONFLICT (org_id, portal_name) DO NOTHING
          `).catch(() => {});
        }
      }
      console.log("[SaaS Tender] Portal registrations seeded");
    } catch (e) { console.error("Portal seed error:", e); }

    // ── Gap 3: Refresh all existing orgs' keyword search configs with remittance terms ──
    try {
      const REMITTANCE_KEYWORDS = [
        "remittance", "cross-border payments", "diaspora remittance",
        "UK Africa remittance", "remittance corridor", "money transfer operator",
        "international money transfer", "financial inclusion Africa",
        "mobile money Africa", "digital payments Africa", "payment systems Africa",
        "GSMA mobile money", "fintech Africa", "migrant remittance",
        "reducing cost of remittances", "cross-border financial services",
        "IOM remittance", "UNCDF digital finance", "Africa financial corridor",
      ];
      const orgsToUpdate = await db.execute(sql`SELECT id FROM saas_organizations`);
      for (const org of orgsToUpdate.rows as any[]) {
        const existing = await db.execute(sql`SELECT keywords FROM saas_search_config WHERE org_id = ${org.id}`);
        if (existing.rows.length === 0) continue;
        const currentKws: string[] = (existing.rows[0] as any).keywords || [];
        const toAdd = REMITTANCE_KEYWORDS.filter(k => !currentKws.includes(k));
        if (toAdd.length === 0) continue;
        const merged = [...currentKws, ...toAdd];
        await db.execute(sql`UPDATE saas_search_config SET keywords = ${merged} WHERE org_id = ${org.id}`).catch(() => {});
      }
      console.log("[SaaS Tender] Remittance keywords merged into existing org search configs ✓");
    } catch (e) { console.error("Keyword refresh error:", e); }

  } catch (err) {
    console.error("Error initializing columns:", err);
  }

  app.post("/api/saas-tender/auth/register", async (req, res) => {
    try {
      const { name, email, password, companyName } = req.body;
      if (!name || !email || !password || !companyName) return res.status(400).json({ message: "Name, email, password, and company name are required" });
      const existing = await db.execute(sql`SELECT id FROM saas_users WHERE email = ${email.toLowerCase()}`);
      if (existing.rows.length > 0) return res.status(400).json({ message: "Email already registered" });
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const orgResult = await db.execute(sql`
        INSERT INTO saas_organizations (name, slug) VALUES (${companyName}, ${slug}) RETURNING *
      `);
      const org = orgResult.rows[0] as any;
      const hashedPassword = await bcrypt.hash(password, 12);
      const userResult = await db.execute(sql`
        INSERT INTO saas_users (org_id, name, email, password, role, access_level)
        VALUES (${org.id}, ${name}, ${email.toLowerCase()}, ${hashedPassword}, 'admin', 'full')
        RETURNING id, org_id, name, email, role, access_level, created_at
      `);
      const user = userResult.rows[0] as any;

      await db.execute(sql`INSERT INTO saas_company_profile (org_id, company_name) VALUES (${org.id}, ${companyName})`);
      await db.execute(sql`INSERT INTO saas_search_config (org_id, keywords, categories, countries, digest_email) VALUES (${org.id}, '{"event management","conference management","training services"}', '{"Events & Conferences","Training","Programme Management"}', '{"UK"}', ${email.toLowerCase()})`);

      const gbFolders = ["Company Policies","CVs and Team Profiles","Case Studies","Contracts and Agreements","Certificates and Accreditations","Financial Statements","References and Testimonials","Insurance Documents","Equality and Diversity Policy","Modern Slavery Statement"];
      const ngFolders = ["CAC Registration Documents","Tax Clearance Certificate","Audited Accounts","PENCOM Compliance Certificate","ITF Compliance Certificate","NSITF Compliance Certificate","CVs and Team Profiles","Case Studies","References","Evidence of Similar Jobs"];
      for (const folder of gbFolders) {
        await db.execute(sql`INSERT INTO saas_bid_vault_folders (org_id, name, country) VALUES (${org.id}, ${folder}, 'GB')`);
      }
      for (const folder of ngFolders) {
        await db.execute(sql`INSERT INTO saas_bid_vault_folders (org_id, name, country) VALUES (${org.id}, ${folder}, 'NG')`);
      }

      const token = jwt.sign({ userId: user.id, orgId: org.id, email: user.email, role: user.role, accessLevel: user.access_level, system: "saas_tender" }, JWT_SECRET, { expiresIn: "24h" });
      return res.json({ token, user: { ...user, org_name: org.name } });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
      const result = await db.execute(sql`
        SELECT u.*, o.name as org_name FROM saas_users u
        JOIN saas_organizations o ON u.org_id = o.id
        WHERE u.email = ${email.toLowerCase()}
      `);
      if (result.rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });
      const user = result.rows[0] as any;
      if (user.status !== "active") return res.status(403).json({ message: "Account suspended" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });
      const token = jwt.sign({ userId: user.id, orgId: user.org_id, email: user.email, role: user.role, accessLevel: user.access_level, system: "saas_tender" }, JWT_SECRET, { expiresIn: "24h" });
      const { password: _, ...safeUser } = user;
      return res.json({ token, user: safeUser });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/auth/me", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT u.id, u.org_id, u.name, u.email, u.role, u.access_level, u.created_at, o.name as org_name
        FROM saas_users u JOIN saas_organizations o ON u.org_id = o.id
        WHERE u.id = ${req.saasUser.userId}
      `);
      if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
      return res.json(result.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/users", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`SELECT id, name, email, role, access_level, created_at FROM saas_users WHERE org_id = ${req.saasUser.orgId} ORDER BY created_at`);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/users", authenticateSaasUser, async (req: any, res) => {
    try {
      if (req.saasUser.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const { name, email, password, role, access_level } = req.body;
      const hashedPassword = await bcrypt.hash(password, 12);
      const result = await db.execute(sql`
        INSERT INTO saas_users (org_id, name, email, password, role, access_level)
        VALUES (${req.saasUser.orgId}, ${name}, ${email.toLowerCase()}, ${hashedPassword}, ${role || 'user'}, ${access_level || 'standard'})
        RETURNING id, name, email, role, access_level, created_at
      `);
      return res.json(result.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/saas-tender/users/:id/access", authenticateSaasUser, async (req: any, res) => {
    try {
      if (req.saasUser.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const result = await db.execute(sql`UPDATE saas_users SET access_level = ${req.body.access_level} WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId} RETURNING id, name, email, role, access_level`);
      if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
      return res.json(result.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ─── Discovery/Tenders domain routes (Phase 3, Task 1) ──────────────────────
  // Tenders CRUD, watchlist, and the manual sweep trigger now live in
  // ./routes/discovery.ts. Registered here so route ordering is unchanged.
  // Dynamic import avoids a static import cycle (discovery.ts imports the shared
  // authenticateSaasUser from this module).
  const { registerDiscoveryRoutes } = await import("./routes/discovery");
  registerDiscoveryRoutes(app);

  // ─── Bid Writing domain routes (Phase 3, Task 1) ────────────────────────────
  // Bid-section read/update/delete, proposals CRUD, and bid-section evidence now
  // live in ./routes/bid-writing.ts. The AI-entangled bid routes (generate,
  // improve, score, answer-questions, etc.) stay below in this file. Registered
  // here; the moved paths don't overlap any handler in between, so route
  // resolution is unchanged. Dynamic import avoids a static import cycle.
  const { registerBidWritingRoutes } = await import("./routes/bid-writing");
  registerBidWritingRoutes(app);

  // ─── Compliance Matrix routes (win-engine) ──────────────────────────────────
  const { registerComplianceMatrixRoutes } = await import("./routes/compliance-matrix");
  registerComplianceMatrixRoutes(app);

  // ─── Admin / AI-usage routes (Phase 3, Task 4) ──────────────────────────────
  const { registerAdminRoutes } = await import("./routes/admin");
  registerAdminRoutes(app);

  // ─── Quick-Add Tender (from URL or manual) ──────────────────────────────────
  app.post("/api/saas-tender/tenders/quick-add", authenticateSaasUser, async (req: any, res) => {
    const { mode, url, title, buyer, deadline, value_text, value_amount, source_url, summary, notes, country } = req.body;
    const orgId = req.saasUser.orgId;
    const targetCountry = country || "GB";

    let tenderData: {
      title: string;
      buyer: string | null;
      deadline: string | null;
      value_text: string | null;
      value_amount: number | null;
      source_url: string | null;
      description: string | null;
      notes: string | null;
    };

    if (mode === "url") {
      if (!url) return res.status(400).json({ message: "URL is required for URL mode" });
      try {
        // Fetch the page
        const pageRes = await fetch(url, {
          signal: AbortSignal.timeout(15000),
          headers: { "User-Agent": "Mozilla/5.0 (compatible; EventPerfektBot/1.0)" },
        });
        const html = await pageRes.text();
        // Strip HTML tags and compress whitespace
        const rawText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 8000); // cap for AI prompt

        const aiPrompt = `Extract procurement tender details from this web page content. Return ONLY valid JSON (no markdown) with these exact fields:
{
  "title": "tender title",
  "buyer": "buying organisation name",
  "deadline": "YYYY-MM-DD or null",
  "value_text": "contract value as text e.g. £150,000 or null",
  "value_amount": 150000 or null,
  "summary": "2-3 sentence description of what they need",
  "cpv_codes": "any CPV codes mentioned or null"
}

Page URL: ${url}
Page content: ${rawText}`;

        const aiRaw = await claudeAI("", aiPrompt, 1000);
        let extracted: any = {};
        try {
          const jsonStr = aiRaw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
          extracted = JSON.parse(jsonStr);
        } catch {
          // If parse fails, try to extract title at minimum from URL
          extracted.title = url.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Tender from URL";
        }

        tenderData = {
          title: extracted.title || "Tender from URL",
          buyer: extracted.buyer || null,
          deadline: extracted.deadline || null,
          value_text: extracted.value_text || null,
          value_amount: typeof extracted.value_amount === "number" ? extracted.value_amount : null,
          source_url: url,
          description: extracted.summary || null,
          notes: null,
        };
      } catch (err: any) {
        return res.status(500).json({ message: `Failed to fetch URL: ${err.message}` });
      }
    } else {
      // Manual mode
      if (!title) return res.status(400).json({ message: "Title is required" });
      tenderData = {
        title,
        buyer: buyer || null,
        deadline: deadline || null,
        value_text: value_text || null,
        value_amount: value_amount ? parseFloat(String(value_amount).replace(/[^0-9.]/g, "")) : null,
        source_url: source_url || null,
        description: summary || null,
        notes: notes || null,
      };
    }

    try {
      // Calculate match score + org tags
      const { scoreTender } = await import("./tender-finder-service");
      const { EP_DISCOVERY_KEYWORDS } = await import("./tender-sources-v2");
      const ctx = { keywords: EP_DISCOVERY_KEYWORDS, categories: [] };
      const { score } = scoreTender(
        {
          title: tenderData.title,
          description: tenderData.description || "",
          buyer: tenderData.buyer || "",
          value: tenderData.value_amount ?? null,
          deadline: tenderData.deadline ?? null,
          source: "CF" as const,
          status: "Active" as const,
        } as any,
        ctx
      );
      const orgTags = computeOrgTags({
        title: tenderData.title,
        buyer: tenderData.buyer,
        description: tenderData.description,
      });

      const result = await db.execute(sql`
        INSERT INTO saas_tenders
          (org_id, title, buyer, value_text, value_amount, deadline, status, source_url, description,
           notes, country, source, match_score,
           ep_relevant, ep_relevance_score, ep_matched_keywords,
           alli_relevant, alli_relevance_score, alli_matched_keywords,
           pmo_relevant, pmo_relevance_score, pmo_matched_keywords,
           updated_at, created_by)
        VALUES
          (${orgId}, ${tenderData.title}, ${tenderData.buyer}, ${tenderData.value_text},
           ${tenderData.value_amount || 0}, ${tenderData.deadline}, ${"Pinned"},
           ${tenderData.source_url}, ${tenderData.description}, ${tenderData.notes},
           ${targetCountry}, ${"manual_add"}, ${score},
           ${orgTags.ep_relevant}, ${orgTags.ep_relevance_score}, ${pgTextArray(orgTags.ep_matched_keywords)}::text[],
           ${orgTags.alli_relevant}, ${orgTags.alli_relevance_score}, ${pgTextArray(orgTags.alli_matched_keywords)}::text[],
           ${orgTags.pmo_relevant}, ${orgTags.pmo_relevance_score}, ${pgTextArray(orgTags.pmo_matched_keywords)}::text[],
           NOW(), ${req.saasUser.userId || null})
        ON CONFLICT (org_id, title) DO UPDATE SET
          buyer = COALESCE(EXCLUDED.buyer, saas_tenders.buyer),
          deadline = COALESCE(EXCLUDED.deadline, saas_tenders.deadline),
          description = COALESCE(EXCLUDED.description, saas_tenders.description),
          source_url = COALESCE(EXCLUDED.source_url, saas_tenders.source_url),
          match_score = EXCLUDED.match_score,
          ep_relevant = EXCLUDED.ep_relevant,
          ep_relevance_score = EXCLUDED.ep_relevance_score,
          ep_matched_keywords = EXCLUDED.ep_matched_keywords,
          alli_relevant = EXCLUDED.alli_relevant,
          alli_relevance_score = EXCLUDED.alli_relevance_score,
          alli_matched_keywords = EXCLUDED.alli_matched_keywords,
          pmo_relevant = EXCLUDED.pmo_relevant,
          pmo_relevance_score = EXCLUDED.pmo_relevance_score,
          pmo_matched_keywords = EXCLUDED.pmo_matched_keywords,
          updated_at = NOW()
        RETURNING *
      `);

      const savedTender = result.rows[0] as any;
      if (savedTender?.id) syncOrgScores(savedTender.id); // non-blocking
      return res.json({ tender: savedTender, score });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/saas-tender/documents/:tenderId", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`SELECT * FROM saas_tender_documents WHERE tender_id = ${req.params.tenderId} AND org_id = ${req.saasUser.orgId} ORDER BY sort_order`);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/documents", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const result = await db.execute(sql`
        INSERT INTO saas_tender_documents (org_id, tender_id, name, doc_type, section_label, content, status, notes, sort_order)
        VALUES (${req.saasUser.orgId}, ${d.tender_id}, ${d.name}, ${d.doc_type || 'response'}, ${d.section_label || null}, ${d.content || null}, ${d.status || 'draft'}, ${d.notes || null}, ${d.sort_order || 0})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/saas-tender/documents/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const result = await db.execute(sql`
        UPDATE saas_tender_documents SET content = COALESCE(${d.content}, content), status = COALESCE(${d.status}, status), name = COALESCE(${d.name}, name), section_label = COALESCE(${d.section_label}, section_label), notes = COALESCE(${d.notes}, notes), updated_at = NOW()
        WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId} RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/saas-tender/documents/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM saas_tender_documents WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
      res.json({ message: "Deleted" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ─── Phase 2: Tender Pack Upload + Extraction ───────────────────────────────

  const packUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
    fileFilter: (_req, file, cb) => {
      const allowed = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/vnd.oasis.opendocument.text",
        "application/rtf",
        "text/rtf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(null, false); // silently skip — will be noted in response
      }
    },
  });

  // POST /api/saas-tender/tenders/:tender_id/documents — upload multiple files
  app.post(
    "/api/saas-tender/tenders/:tender_id/documents",
    authenticateSaasUser,
    packUpload.array("files", 20),
    async (req: any, res) => {
      const tenderId = parseInt(req.params.tender_id);
      if (isNaN(tenderId)) return res.status(400).json({ message: "Invalid tender ID" });
      const tenderCheck = await db.execute(sql`SELECT id FROM saas_tenders WHERE id = ${tenderId} AND org_id = ${req.saasUser.orgId}`);
      if (tenderCheck.rows.length === 0) return res.status(404).json({ message: "Tender not found" });
      const uploaded: any[] = [];
      const failed: any[] = [];
      for (const file of (req.files as Express.Multer.File[]) || []) {
        try {
          const storageKey = await uploadBuffer(file.buffer, file.mimetype, "tender-pack", file.originalname);
          const inserted = await db.execute(sql`
            INSERT INTO saas_tender_pack_docs
              (org_id, tender_id, filename, storage_key, mime_type, file_size_bytes, uploaded_by_user_id)
            VALUES
              (${req.saasUser.orgId}, ${tenderId}, ${file.originalname}, ${storageKey}, ${file.mimetype}, ${file.size}, ${req.saasUser.userId || null})
            RETURNING id, filename, document_type, extraction_status, uploaded_at
          `);
          const doc = inserted.rows[0] as any;
          uploaded.push(doc);
          // Trigger async extraction — fire and forget
          extractTenderDocument(doc.id).catch(err =>
            console.error(`[Pack] async extraction error for doc ${doc.id}:`, err.message)
          );
        } catch (err: any) {
          failed.push({ filename: file.originalname, error: err.message });
        }
      }
      // Update tender doc count
      await db.execute(sql`
        UPDATE saas_tenders SET
          documents_uploaded_count = (SELECT COUNT(*) FROM saas_tender_pack_docs WHERE tender_id = ${tenderId} AND deleted_at IS NULL),
          last_document_uploaded_at = NOW(),
          extraction_complete = FALSE
        WHERE id = ${tenderId}
      `).catch(() => {});
      return res.json({ uploaded, failed });
    }
  );

  // GET /api/saas-tender/tenders/:tender_id/documents — list with fact counts + signed URL
  app.get("/api/saas-tender/tenders/:tender_id/documents", authenticateSaasUser, async (req: any, res) => {
    try {
      const tenderId = req.params.tender_id;
      const docs = await db.execute(sql`
        SELECT d.*,
          (SELECT COUNT(*) FROM saas_tender_extracted_facts f WHERE f.document_id = d.id) as fact_count
        FROM saas_tender_pack_docs d
        WHERE d.tender_id = ${tenderId} AND d.org_id = ${req.saasUser.orgId} AND d.deleted_at IS NULL
        ORDER BY d.uploaded_at DESC
      `);
      const rows = await Promise.all(
        docs.rows.map(async (row: any) => {
          const viewUrl = row.storage_key ? await generateViewUrl(row.storage_key, 14400).catch(() => null) : null;
          return { ...row, view_url: viewUrl, extracted_text: undefined }; // strip large text
        })
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/saas-tender/tenders/:tender_id/documents/:document_id — soft delete
  app.delete("/api/saas-tender/tenders/:tender_id/documents/:document_id", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id, document_id } = req.params;
      await db.execute(sql`
        UPDATE saas_tender_pack_docs SET deleted_at = NOW()
        WHERE id = ${document_id} AND tender_id = ${tender_id} AND org_id = ${req.saasUser.orgId}
      `);
      await db.execute(sql`
        DELETE FROM saas_tender_extracted_facts WHERE document_id = ${document_id}
      `);
      await db.execute(sql`
        UPDATE saas_tenders SET
          documents_uploaded_count = (SELECT COUNT(*) FROM saas_tender_pack_docs WHERE tender_id = ${tender_id} AND deleted_at IS NULL)
        WHERE id = ${tender_id}
      `);
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PATCH /api/saas-tender/tenders/:tender_id/documents/:document_id/type — reclassify
  app.patch("/api/saas-tender/tenders/:tender_id/documents/:document_id/type", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id, document_id } = req.params;
      const { document_type } = req.body;
      await db.execute(sql`
        UPDATE saas_tender_pack_docs SET document_type = ${document_type}
        WHERE id = ${document_id} AND tender_id = ${tender_id} AND org_id = ${req.saasUser.orgId}
      `);
      res.json({ message: "Updated" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/saas-tender/tenders/:tender_id/documents/:document_id/retry — retry extraction
  app.post("/api/saas-tender/tenders/:tender_id/documents/:document_id/retry", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id, document_id } = req.params;
      const docCheck = await db.execute(sql`
        SELECT id FROM saas_tender_pack_docs WHERE id = ${document_id} AND tender_id = ${tender_id} AND org_id = ${req.saasUser.orgId}
      `);
      if (docCheck.rows.length === 0) return res.status(404).json({ message: "Document not found" });
      await db.execute(sql`
        UPDATE saas_tender_pack_docs SET extraction_status = 'pending', extraction_error = NULL WHERE id = ${document_id}
      `);
      extractTenderDocument(parseInt(document_id)).catch(err =>
        console.error(`[Pack] retry extraction error for doc ${document_id}:`, err.message)
      );
      return res.json({ message: "Extraction queued" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // POST /api/saas-tender/tenders/:tender_id/extraction-complete — manual override
  app.post("/api/saas-tender/tenders/:tender_id/extraction-complete", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id } = req.params;
      await db.execute(sql`UPDATE saas_tenders SET extraction_complete = TRUE WHERE id = ${tender_id} AND org_id = ${req.saasUser.orgId}`);
      res.json({ message: "Marked complete" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/saas-tender/tenders/:tender_id/re-extract-all — re-run all docs
  app.post("/api/saas-tender/tenders/:tender_id/re-extract-all", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id } = req.params;
      const docs = await db.execute(sql`
        SELECT id FROM saas_tender_pack_docs WHERE tender_id = ${tender_id} AND org_id = ${req.saasUser.orgId} AND deleted_at IS NULL
      `);
      await db.execute(sql`UPDATE saas_tenders SET extraction_complete = FALSE WHERE id = ${tender_id}`);
      for (const doc of docs.rows as any[]) {
        await db.execute(sql`UPDATE saas_tender_pack_docs SET extraction_status = 'pending', extraction_error = NULL WHERE id = ${doc.id}`);
        extractTenderDocument(doc.id).catch(() => {});
      }
      res.json({ message: `Re-extracting ${docs.rows.length} documents` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/saas-tender/tenders/:tender_id/facts — list extracted facts
  app.get("/api/saas-tender/tenders/:tender_id/facts", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id } = req.params;
      const facts = await db.execute(sql`
        SELECT f.*, d.filename as doc_filename, d.document_type as doc_type
        FROM saas_tender_extracted_facts f
        LEFT JOIN saas_tender_pack_docs d ON d.id = f.document_id
        WHERE f.tender_id = ${tender_id}
        ORDER BY f.fact_type, f.confidence_score DESC
      `);
      res.json(facts.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PATCH /api/saas-tender/facts/:fact_id — verify or edit a fact
  app.patch("/api/saas-tender/facts/:fact_id", authenticateSaasUser, async (req: any, res) => {
    try {
      const { fact_id } = req.params;
      const { fact_value, fact_label, verified_by_user } = req.body;
      const updates: string[] = [];
      if (fact_value !== undefined) updates.push(`fact_value = '${fact_value.replace(/'/g, "''")}'`);
      if (fact_label !== undefined) updates.push(`fact_label = '${fact_label.replace(/'/g, "''")}'`);
      if (verified_by_user !== undefined) {
        updates.push(`verified_by_user = ${verified_by_user}`);
        if (verified_by_user) {
          updates.push("verified_at = NOW()");
          updates.push(`verified_by_user_id = ${req.saasUser.userId || "NULL"}`);
        }
      }
      if (updates.length === 0) return res.status(400).json({ message: "Nothing to update" });
      await db.execute(sql.raw(`UPDATE saas_tender_extracted_facts SET ${updates.join(", ")} WHERE id = ${fact_id}`));
      const updated = await db.execute(sql`SELECT * FROM saas_tender_extracted_facts WHERE id = ${fact_id}`);
      return res.json(updated.rows[0]);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/saas-tender/facts/:fact_id — delete a fact
  app.delete("/api/saas-tender/facts/:fact_id", authenticateSaasUser, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM saas_tender_extracted_facts WHERE id = ${req.params.fact_id}`);
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── End Phase 2 routes ─────────────────────────────────────────────────────

  // GET /bid-sections/:tenderId → moved to ./routes/bid-writing.ts

  app.post("/api/saas-tender/bid-sections/generate", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id, section_key, section_label } = req.body;
      const tender = await db.execute(sql`SELECT * FROM saas_tenders WHERE id = ${tender_id} AND org_id = ${req.saasUser.orgId}`);
      if (tender.rows.length === 0) return res.status(404).json({ message: "Tender not found" });
      const t = tender.rows[0] as any;
      const profile = await db.execute(sql`SELECT * FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`);
      const p = (profile.rows[0] || {}) as any;

      const vaultDocs = await db.execute(sql`
        SELECT bvf.file_name, bvf.notes, bvfl.name as folder_name
        FROM saas_bid_vault_files bvf LEFT JOIN saas_bid_vault_folders bvfl ON bvf.folder_id = bvfl.id
        WHERE bvf.org_id = ${req.saasUser.orgId} ORDER BY bvfl.name LIMIT 30
      `);
      const vaultContext = (vaultDocs.rows as any[]).map((d: any) => `- [${d.folder_name || "Unfiled"}] ${d.file_name}${d.notes ? `: ${d.notes}` : ""}`).join("\n");

      const bidWritingGuide: Record<string, string[]> = {
        "Executive Summary": ["Align with buyer's strategic plan and objectives", "Highlight unique value proposition and differentiators", "Reference partnerships, proprietary processes, or technology", "Ensure your value proposition gives a good chance of winning"],
        "Company Overview": ["Present company history, structure, and capabilities", "Highlight relevant sector experience and track record", "Reference certifications, accreditations, and awards", "Demonstrate financial stability and organisational capacity"],
        "Methodology & Approach": ["Detail project management and implementation approach", "Set out steps for smooth transition from current solution", "Provide realistic timeline and milestones", "Show commitment to continuous improvement with past examples", "Propose SMART KPIs aligned with buyer's goals"],
        "Social Value": ["Detail approach to social value including policies and initiatives", "Highlight community involvement and positive impact", "Show awards, local job hires, case studies", "Align with Social Value Model (PPN 06/20)", "Describe sustainability approach and carbon footprint reduction", "Outline accessibility and inclusion commitments"],
        "Relevant Experience": ["Demonstrate success in similar projects using STAR format", "Include quantifiable outcomes and testimonials", "Cite innovative solutions from past work", "Highlight relevant awards"],
        "Team & Key Personnel": ["Provide evidence of team expertise in similar contracts", "Reassure adequate resources to deliver", "Outline management of resource conflicts", "Include training commitments and professional development"],
        "Pricing Schedule": ["Provide clear and transparent pricing structure", "Align pricing with budget allowed for tender", "Explain any pricing assumptions or exclusions", "Show breakdown of costs relative to fair market value", "Demonstrate value for money compared to competitors"],
        "Risk Management": ["Describe overall risk management strategy", "Show how you identify, evaluate, prioritise, and mitigate risk", "Clarify personnel with risk management responsibilities", "Include disaster recovery and business continuity plans", "Reference ISO 45001 for health and safety"],
        "Mobilisation Plan": ["Detail steps for smooth transition", "Provide realistic timeline and milestones", "Address TUPE responsibilities if applicable", "Include knowledge transfer programme"],
        "Cover Letter": ["Align with buyer's strategic plan and objectives", "Highlight unique value proposition", "Be concise and compelling", "Reference relevant experience and certifications"],
        "Quality Assurance": ["Show commitment to continuous improvement", "Propose performance metrics and KPIs", "Demonstrate SLA compliance track record", "Reference ISO 9001 quality management"],
        "Health & Safety": ["Describe health and safety management system", "Reference ISO 45001 or equivalent certifications", "Detail risk assessment procedures", "Outline incident reporting and investigation processes"],
        "GDPR & Data Protection": ["Outline controls to protect buyer's data", "Evidence cybersecurity certifications (Cyber Essentials, ISO 27001)", "Show GDPR compliance and DPO arrangements", "Detail disaster recovery and data breach procedures"],
        "Equality, Diversity & Inclusion": ["Detail EDI policies and commitments", "Show diverse workforce statistics and recruitment practices", "Highlight community engagement and accessibility measures", "Reference relevant legislation compliance"],
        "Environmental Policy": ["Describe sustainability and environmental responsibility", "Include Net Zero strategy or carbon reduction plan", "Reference ISO 14001 certification", "Highlight eco-friendly initiatives and waste reduction"],
        "Safeguarding": ["Outline safeguarding policies and procedures", "Detail DBS checking and vetting processes", "Describe training and awareness programmes", "Show compliance with relevant legislation"],
      };
      const guidePrompts = bidWritingGuide[section_label] || [];
      const guideContext = guidePrompts.length > 0 ? `\n\nBid Writing Best Practices for "${section_label}":\n${guidePrompts.map(p => `- ${p}`).join("\n")}` : "";

      // Load learning vault lessons for this org
      // E5: sort by severity × recency so high-severity lessons surface first
      const vaultLessons = await db.execute(sql`
        SELECT lessons, tender_name, outcome, section_type, severity
        FROM saas_learning_vault
        WHERE org_id = ${req.saasUser.orgId} AND lessons IS NOT NULL AND lessons != ''
        ORDER BY
          (CASE WHEN severity = 'high' THEN 3.0 WHEN severity = 'medium' THEN 2.0 ELSE 1.0 END)
          / GREATEST(1, EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)
          DESC,
          created_at DESC
        LIMIT 15
      `).catch(() => ({ rows: [] }));
      const lessonsContext = (vaultLessons.rows as any[]).map(l =>
        `[${l.tender_name}${l.outcome ? ` — ${l.outcome}` : ""}${l.section_type ? ` | ${l.section_type}` : ""}${l.severity === "high" ? " ⚠️ HIGH" : ""}]: ${l.lessons}`
      ).join("\n\n");

      const entityHint = (t.country || "GB") === "NG" ? "Event Perfekt Management Services (Nigeria)" : "Event Perfekt Global Ltd (UK)";
      const tenderPackContext = await buildExtractedFactsContext(tender_id, req.saasUser.orgId);
      const content = await claudeAI(
        EP_AGENT_SYSTEM_PROMPT + CITATION_PROMPT_ADDON,
        `Write the "${section_label}" section for this tender. Entity: ${entityHint}\n\nTender: ${t.title}\nBuyer: ${t.buyer}\nCategory: ${t.category}\nValue: ${t.value_text}\nDeadline: ${t.deadline}\nScoring: ${t.scoring_criteria || "Not specified"}\nWord Limits: ${t.word_limits || "Not specified"}\n\nCompany Profile:\n- Name: ${p.company_name || entityHint}\n- Bio: ${p.bio_summary || ""}\n- Experience: ${p.sector_experience || ""}\n- Insurance PII: ${p.insurance_pii || ""}\n- Insurance PL: ${p.insurance_public_liability || ""}\n- Certifications: ${p.certifications || ""}\n- Policies: ${p.policies || ""}\n\nBid Vault:\n${vaultContext || "No documents yet"}${guideContext}\n\nLearning Vault Lessons (apply these):\n${lessonsContext || "No previous lessons yet"}${tenderPackContext}`,
        2500
      );
      const citations = parseCitations(content);
      const citationsJson = JSON.stringify(citations);
      const existing = await db.execute(sql`SELECT id FROM saas_tender_bid_sections WHERE tender_id = ${tender_id} AND section_key = ${section_key} AND org_id = ${req.saasUser.orgId}`);
      if (existing.rows.length > 0) {
        const result = await db.execute(sql`UPDATE saas_tender_bid_sections SET content = ${content}, word_count = ${content.split(/\s+/).length}, citations = ${citationsJson}::jsonb, updated_at = NOW() WHERE id = ${(existing.rows[0] as any).id} RETURNING *`);
        return res.json(result.rows[0]);
      } else {
        const maxOrder = await db.execute(sql`SELECT COALESCE(MAX(sort_order),0)::int as mx FROM saas_tender_bid_sections WHERE tender_id = ${tender_id} AND org_id = ${req.saasUser.orgId}`);
        const result = await db.execute(sql`
          INSERT INTO saas_tender_bid_sections (org_id, tender_id, section_key, section_label, content, word_count, sort_order, citations)
          VALUES (${req.saasUser.orgId}, ${tender_id}, ${section_key}, ${section_label}, ${content}, ${content.split(/\s+/).length}, ${((maxOrder.rows[0] as any).mx || 0) + 1}, ${citationsJson}::jsonb)
          RETURNING *
        `);
        return res.json(result.rows[0]);
      }
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // PATCH /bid-sections/:id → moved to ./routes/bid-writing.ts
  // DELETE /bid-sections/:id → moved to ./routes/bid-writing.ts

  // ── Improve a bid section ────────────────────────────────────────────────────
  app.post("/api/saas-tender/bid-sections/:id/improve", authenticateSaasUser, async (req: any, res) => {
    try {
      const { content, tender_title, tender_buyer, section_label } = req.body;
      if (!content) return res.status(400).json({ message: "Content required" });
      let profileContext = "";
      try {
        const pr = await db.execute(sql`SELECT * FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`);
        if (pr.rows.length > 0) {
          const p = pr.rows[0] as any;
          profileContext = `Company: ${p.company_name || "Event Perfekt"}\nSectors: ${p.sector_experience || ""}\nBio: ${p.bio_summary || ""}`;
        }
      } catch {}
      // Pull the section's tender_id so we can inject extracted facts
      let improvePackCtx = "";
      try {
        const sec = await db.execute(sql`SELECT tender_id FROM saas_tender_bid_sections WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
        if (sec.rows.length > 0) {
          improvePackCtx = await buildExtractedFactsContext((sec.rows[0] as any).tender_id, req.saasUser.orgId);
        }
      } catch {}
      const improved = await claudeAI(
        EP_AGENT_SYSTEM_PROMPT + `\n\nCOMPANY PROFILE:\n${profileContext}\n\nYou are improving an existing bid section. Strengthen it — add evidence, remove generic statements, use STAR format, align to PPN 06/20 for social value. Do not change the overall structure — improve language, specificity, and evidence density.` + CITATION_PROMPT_ADDON,
        `TENDER: ${tender_title || "Unknown"}\nBUYER: ${tender_buyer || "Unknown"}\nSECTION: ${section_label || "Bid Section"}${improvePackCtx}\n\nIMPROVE this section (make it stronger, more specific, more evidence-based — use the extracted tender intelligence above to align language and evidence precisely):\n\n${content}`,
        2000
      );
      const wordCount = improved.split(/\s+/).filter(Boolean).length;
      const improveCitations = parseCitations(improved);
      const improveCitationsJson = JSON.stringify(improveCitations);
      await db.execute(sql`UPDATE saas_tender_bid_sections SET content = ${improved}, word_count = ${wordCount}, citations = ${improveCitationsJson}::jsonb, updated_at = NOW() WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
      return res.json({ content: improved });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ── EP Agent Review Chat — conversational expert review of a bid section ────
  // The user can chat with EP Agent, ask questions, request changes, and EP
  // Agent will respond with analysis plus an updated version of the section.
  app.post("/api/saas-tender/bid-sections/:id/review-chat", authenticateSaasUser, async (req: any, res) => {
    try {
      const { message, history, tender_title, tender_buyer, tender_description, section_label, content, word_limit } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });

      // Load company profile for context
      let profileContext = "";
      try {
        const pr = await db.execute(sql`SELECT * FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`);
        if (pr.rows.length > 0) {
          const p = pr.rows[0] as any;
          profileContext = `Company: ${p.company_name || "Event Perfekt"}\nSectors: ${p.sector_experience || ""}\nCertifications: ${p.certifications || ""}\nBio: ${p.bio_summary || ""}`;
        }
      } catch {}

      // Pull extracted facts from tender pack for this section
      let reviewPackCtx = "";
      try {
        const sec = await db.execute(sql`SELECT tender_id FROM saas_tender_bid_sections WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
        if (sec.rows.length > 0) {
          reviewPackCtx = await buildExtractedFactsContext((sec.rows[0] as any).tender_id, req.saasUser.orgId);
        }
      } catch {}

      // Build conversation messages including full history
      const systemPrompt = EP_AGENT_SYSTEM_PROMPT + `

COMPANY PROFILE:
${profileContext}
${reviewPackCtx}

YOU ARE IN REVIEW CHAT MODE. You are acting as an expert bid writer reviewing a specific section in real-time conversation.

CURRENT TENDER: ${tender_title || "Unknown"}
BUYER: ${tender_buyer || "Unknown"}
${tender_description ? `TENDER DESCRIPTION: ${tender_description}` : ""}
SECTION BEING REVIEWED: ${section_label || "Bid Section"}
${word_limit ? `WORD LIMIT: ${word_limit} words` : ""}

CURRENT SECTION CONTENT:
${content || "(No content yet — you will be asked to draft it)"}

YOUR ROLE:
- Review the section like a senior bid director would
- Ask clarifying questions if you need more information to make it stronger
- Point out specific weaknesses with actionable fixes
- When asked to make changes, produce the full revised section
- Be direct, specific, and expert — not generic
- Remember all lessons: social value needs quantitative data, local relevance must be explicit, STAR format throughout
- If the user asks a question, answer it as an expert would — then ask what they want to do next
- Format your response with clear sections: [REVIEW] [CHANGES MADE] [UPDATED SECTION] (only include [UPDATED SECTION] when you have revised the content)
- Every message should end with a specific question or action prompt to move the bid forward`;

      // Build OpenAI messages array from history
      const messages: any[] = [{ role: "system", content: systemPrompt }];
      if (Array.isArray(history)) {
        for (const h of history) {
          if (h.role === "user" || h.role === "assistant") {
            messages.push({ role: h.role, content: h.content });
          }
        }
      }
      messages.push({ role: "user", content: message });

      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) return res.status(500).json({ message: "AI not configured" });
      const aiBaseURL2 = (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

      const response = await fetch(`${aiBaseURL2}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "gpt-4o", max_tokens: 2500, messages }),
        signal: AbortSignal.timeout(45000),
      });
      const data = await response.json() as any;
      if (data.error) throw new Error(data.error.message);
      const reply = data.choices?.[0]?.message?.content || "";

      // Extract updated section content if the AI provided a revised version
      let updatedContent: string | null = null;
      const updatedMatch = reply.match(/\[UPDATED SECTION\]([\s\S]+?)(?:\[|$)/i);
      if (updatedMatch) {
        updatedContent = updatedMatch[1].trim();
        // Auto-save the updated content to DB
        const wordCount = (updatedContent ?? "").split(/\s+/).filter(Boolean).length;
        await db.execute(sql`
          UPDATE saas_tender_bid_sections
          SET content = ${updatedContent}, word_count = ${wordCount}, updated_at = NOW()
          WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}
        `).catch(() => {});
      }

      return res.json({ reply, updatedContent });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ── Score all bid sections for a tender ─────────────────────────────────────
  app.post("/api/saas-tender/bid-sections/score", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id, tender_title, tender_buyer, tender_criteria } = req.body;
      if (!tender_id) return res.status(400).json({ message: "tender_id required" });
      const secResult = await db.execute(sql`SELECT * FROM saas_tender_bid_sections WHERE tender_id = ${tender_id} AND org_id = ${req.saasUser.orgId}`);
      const sections = secResult.rows as any[];
      if (sections.length === 0) return res.status(400).json({ message: "No sections to score" });

      const sectionScores: Record<string, any> = {};
      let totalScore = 0;
      const improvements: string[] = [];

      for (const sec of sections) {
        if (!sec.content) continue;
        try {
          const responseText = await claudeAI(
            "You are an expert bid evaluator for UK and Nigeria public sector tenders. Score each bid section on a 0-10 scale. Evaluate: clarity, specificity, evidence, alignment with criteria, and compelling language.",
            `Score this "${sec.section_label}" section (0-10) for tender from ${tender_buyer || "unknown"} (${tender_title || "unknown"}).\nEvaluation criteria: ${tender_criteria || "Quality, specificity, evidence, relevance"}\n\nSection content:\n${sec.content.substring(0, 1000)}\n\nRespond ONLY in this exact format:\n[SCORE: X/10]\n[IMPROVEMENTS: specific feedback here]`,
            400
          );
          const scoreMatch = responseText.match(/\[SCORE:\s*(\d+)/i);
          const improvementsMatch = responseText.match(/\[IMPROVEMENTS:\s*([^\]]+)/i);
          const score = scoreMatch ? Math.min(10, Math.max(0, parseInt(scoreMatch[1]))) : 6;
          sectionScores[sec.section_label] = {
            score,
            feedback: improvementsMatch ? improvementsMatch[1].trim() : "Looks good — keep refining",
          };
          totalScore += score;
          if (score < 7) improvements.push(`${sec.section_label}: ${improvementsMatch ? improvementsMatch[1].trim() : "Needs strengthening"}`);
        } catch {
          sectionScores[sec.section_label] = { score: 0, feedback: "Scoring failed" };
        }
      }

      const count = Object.keys(sectionScores).length;
      const avgScore = count > 0 ? totalScore / count : 0;
      const strengthRating = avgScore >= 8 ? "Strong" : avgScore >= 6 ? "Good" : avgScore >= 4 ? "Fair" : "Needs Work";
      return res.json({
        section_scores: sectionScores,
        average_score: parseFloat(avgScore.toFixed(1)),
        strength_rating: strengthRating,
        weak_sections: improvements.slice(0, 6),
        ready_to_submit: avgScore >= 7,
        sections_scored: count,
      });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ── Answer specific tender questions ────────────────────────────────────────
  app.post("/api/saas-tender/bid-sections/answer-questions", authenticateSaasUser, async (req: any, res) => {
    try {
      const { questions, tender_title, tender_buyer, tender_value, question_index, tender_id } = req.body;
      if (!questions || !questions.trim()) return res.status(400).json({ message: "Questions required" });
      let profileContext = "";
      try {
        const pr = await db.execute(sql`SELECT * FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`);
        if (pr.rows.length > 0) {
          const p = pr.rows[0] as any;
          profileContext = `Company: ${p.company_name || "Event Perfekt"}\nSectors: ${p.sector_experience || ""}\nBio: ${p.bio_summary || ""}\nPast Contracts: ${p.past_contracts || ""}\nCertifications: ${p.certifications || ""}`;
        }
      } catch {}
      const aqPackCtx = tender_id ? await buildExtractedFactsContext(tender_id, req.saasUser.orgId) : "";
      let prompt: string;
      if (question_index !== undefined && question_index !== null) {
        const qLines = questions.split(/\n/).filter((l: string) => l.trim());
        const targetQ = qLines[question_index] || questions;
        prompt = `TENDER: ${tender_title || "Unknown"}\nBUYER: ${tender_buyer || "Unknown"}\nVALUE: ${tender_value || "Not specified"}${aqPackCtx}\n\nALL QUESTIONS (for context):\n${questions}\n\nANSWER THIS SPECIFIC QUESTION:\n${targetQ}\n\nWrite a compelling, detailed answer. If a word limit is mentioned, respect it. Be specific about how the company meets this requirement.`;
      } else {
        prompt = `TENDER: ${tender_title || "Unknown"}\nBUYER: ${tender_buyer || "Unknown"}\nVALUE: ${tender_value || "Not specified"}${aqPackCtx}\n\nTENDER QUESTIONS / ITT REQUIREMENTS:\n${questions}\n\nAnswer EACH question separately with clear headings. For each question:\n- Be specific and evidence-based\n- Use STAR format where relevant\n- Respect any word limits mentioned\n- Show how the company directly meets the requirement`;
      }
      const text = await claudeAI(EP_AGENT_SYSTEM_PROMPT + `\n\nCOMPANY PROFILE:\n${profileContext}\n\nYou are answering SPECIFIC tender/ITT questions. Answer each question exactly as asked with maximum specificity.`, prompt, 3000);
      return res.json({ content: text });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/company-profile", authenticateSaasUser, async (req: any, res) => {
    try {
      let result = await db.execute(sql`SELECT * FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`);
      if (result.rows.length === 0) {
        await db.execute(sql`INSERT INTO saas_company_profile (org_id) VALUES (${req.saasUser.orgId})`);
        result = await db.execute(sql`SELECT * FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`);
      }
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/saas-tender/company-profile", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const fields = Object.entries(d).filter(([k]) => k !== "id" && k !== "org_id" && k !== "created_at").map(([k, v]) => `${k} = '${String(v || "").replace(/'/g, "''")}'`);
      fields.push("updated_at = NOW()");
      await db.execute(sql.raw(`UPDATE saas_company_profile SET ${fields.join(", ")} WHERE org_id = ${req.saasUser.orgId}`));
      const result = await db.execute(sql`SELECT * FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/requirements/:tenderId", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`SELECT * FROM saas_tender_requirements WHERE tender_id = ${req.params.tenderId} AND org_id = ${req.saasUser.orgId} ORDER BY sort_order`);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/requirements/:tenderId/extract", authenticateSaasUser, async (req: any, res) => {
    try {
      const tenderId = parseInt(req.params.tenderId);
      const tender = await db.execute(sql`SELECT * FROM saas_tenders WHERE id = ${tenderId} AND org_id = ${req.saasUser.orgId}`);
      if (tender.rows.length === 0) return res.status(404).json({ message: "Tender not found" });
      const t = tender.rows[0] as any;
      const docs = await db.execute(sql`SELECT name, content, section_label FROM saas_tender_documents WHERE tender_id = ${tenderId} AND org_id = ${req.saasUser.orgId} AND content IS NOT NULL LIMIT 10`);
      const docContext = (docs.rows as any[]).map((d: any) => `[${d.section_label || d.name}]: ${(d.content || "").slice(0, 1000)}`).join("\n\n");
      const profile = await db.execute(sql`SELECT * FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`);
      const p = (profile.rows[0] || {}) as any;

      const content = await claudeAI(
        "You are a bid compliance analyst. Analyse the tender and extract all requirements. Return a JSON array of objects with: requirement_type (mandatory, insurance, certification, document, deadline, evaluation, staffing, financial, technical, compliance), description (clear requirement statement), sort_order (number). Be thorough. Return ONLY valid JSON array, no markdown.",
        `Tender: ${t.title}\nBuyer: ${t.buyer}\nCategory: ${t.category}\nValue: ${t.value_text}\nDeadline: ${t.deadline}\nScoring: ${t.scoring_criteria || "N/A"}\nWord Limits: ${t.word_limits || "N/A"}\n\nCompany:\n- Insurance PII: ${p.insurance_pii || "N/A"}\n- Insurance PL: ${p.insurance_public_liability || "N/A"}\n- Certifications: ${p.certifications || "N/A"}\n\nDocs:\n${docContext || "None"}`,
        3000
      );
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return res.status(500).json({ message: "Failed to parse requirements" });
      const requirements = JSON.parse(jsonMatch[0]);
      await db.execute(sql`DELETE FROM saas_tender_requirements WHERE tender_id = ${tenderId} AND org_id = ${req.saasUser.orgId}`);
      let inserted = 0;
      for (const r of requirements) {
        await db.execute(sql`INSERT INTO saas_tender_requirements (org_id, tender_id, requirement_type, description, sort_order) VALUES (${req.saasUser.orgId}, ${tenderId}, ${r.requirement_type || "mandatory"}, ${r.description}, ${r.sort_order || inserted})`);
        inserted++;
      }
      const result = await db.execute(sql`SELECT * FROM saas_tender_requirements WHERE tender_id = ${tenderId} AND org_id = ${req.saasUser.orgId} ORDER BY sort_order`);
      return res.json({ message: `${inserted} requirements extracted`, requirements: result.rows });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/saas-tender/requirements/:id/toggle", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`UPDATE saas_tender_requirements SET is_met = NOT is_met WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId} RETURNING *`);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/bid-vault/folders", authenticateSaasUser, async (req: any, res) => {
    try {
      const country = (req.query.country as string) || "GB";
      const result = await db.execute(sql`SELECT * FROM saas_bid_vault_folders WHERE org_id = ${req.saasUser.orgId} AND (country = ${country} OR country IS NULL) ORDER BY name`);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/bid-vault/folders", authenticateSaasUser, async (req: any, res) => {
    try {
      const country = req.body.country || "GB";
      const result = await db.execute(sql`INSERT INTO saas_bid_vault_folders (org_id, name, description, parent_id, country) VALUES (${req.saasUser.orgId}, ${req.body.name}, ${req.body.description || null}, ${req.body.parent_id || null}, ${country}) RETURNING *`);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/saas-tender/bid-vault/folders/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM saas_bid_vault_folders WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
      res.json({ message: "Deleted" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/bid-vault/files", authenticateSaasUser, async (req: any, res) => {
    try {
      const folderId = req.query.folder_id;
      const result = folderId
        ? await db.execute(sql`SELECT f.*, fl.name as folder_name FROM saas_bid_vault_files f LEFT JOIN saas_bid_vault_folders fl ON f.folder_id = fl.id WHERE f.org_id = ${req.saasUser.orgId} AND f.folder_id = ${folderId} ORDER BY f.created_at DESC`)
        : await db.execute(sql`SELECT f.*, fl.name as folder_name FROM saas_bid_vault_files f LEFT JOIN saas_bid_vault_folders fl ON f.folder_id = fl.id WHERE f.org_id = ${req.saasUser.orgId} ORDER BY f.created_at DESC`);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/bid-vault/files", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const result = await db.execute(sql`
        INSERT INTO saas_bid_vault_files (org_id, folder_id, file_name, file_url, file_size, file_type, notes, uploaded_by)
        VALUES (${req.saasUser.orgId}, ${d.folder_id || null}, ${d.file_name}, ${d.file_url || ''}, ${d.file_size || 0}, ${d.file_type || null}, ${d.notes || null}, ${d.uploaded_by || req.saasUser.email})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/bid-vault/upload", authenticateSaasUser, async (req: any, res) => {
    try {
      const file = req.files?.file;
      const folderId = req.body.folder_id;
      const country = req.body.country || "GB";
      if (!file) return res.status(400).json({ message: "No file provided" });

      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
      const uploadPath = `uploads/bid-vault/${req.saasUser.orgId}/${fileName}`;
      const uploadDir = path.join(process.cwd(), "uploads/bid-vault", String(req.saasUser.orgId));
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      await file.mv(path.join(uploadDir, fileName));

      const result = await db.execute(sql`
        INSERT INTO saas_bid_vault_files (org_id, folder_id, file_name, file_url, file_size, file_type, uploaded_by, country)
        VALUES (${req.saasUser.orgId}, ${parseInt(folderId) || null}, ${file.name}, ${`/${uploadPath}`}, ${file.size}, ${file.mimetype}, ${req.saasUser.email}, ${country})
        RETURNING *
      `);
      return res.json(result.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/saas-tender/bid-vault/files/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM saas_bid_vault_files WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
      res.json({ message: "Deleted" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/search-config", authenticateSaasUser, async (req: any, res) => {
    try {
      let result = await db.execute(sql`SELECT * FROM saas_search_config WHERE org_id = ${req.saasUser.orgId}`);
      if (result.rows.length === 0) {
        const defaults = DEFAULT_SEARCH_CONFIGS[((req.query.country as string) || "GB") === "NG" ? "NG" : "GB"];
        await db.execute(sql`
          INSERT INTO saas_search_config (org_id, keywords, categories, countries, digest_email, digest_enabled)
          VALUES (${req.saasUser.orgId}, ${defaults.keywords}, ${defaults.categories}, ${defaults.countries}, ${defaults.digest_email}, true)
        `);
        result = await db.execute(sql`SELECT * FROM saas_search_config WHERE org_id = ${req.saasUser.orgId}`);
      }
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/saas-tender/search-config", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const keywords = d.keywords ? `{${d.keywords.map((k: string) => `"${k.replace(/"/g, '\\"')}"`).join(",")}}` : null;
      const categories = d.categories ? `{${d.categories.map((c: string) => `"${c.replace(/"/g, '\\"')}"`).join(",")}}` : null;
      const countries = d.countries ? `{${d.countries.map((c: string) => `"${c.replace(/"/g, '\\"')}"`).join(",")}}` : null;
      await db.execute(sql.raw(`
        UPDATE saas_search_config SET
          ${keywords ? `keywords = '${keywords}',` : ""}
          ${categories ? `categories = '${categories}',` : ""}
          ${countries ? `countries = '${countries}',` : ""}
          digest_email = '${(d.digest_email || "").replace(/'/g, "''")}',
          digest_enabled = ${d.digest_enabled !== false},
          updated_at = NOW()
        WHERE org_id = ${req.saasUser.orgId}
      `));
      const result = await db.execute(sql`SELECT * FROM saas_search_config WHERE org_id = ${req.saasUser.orgId}`);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ─── Tender Finder — unified search (FIX 1–11) ───────────────────────────
  app.get("/api/saas-tender/finder/search", authenticateSaasUser, async (req: any, res) => {
    try {
      const q       = req.query as Record<string, string>;
      const orgId   = req.saasUser.orgId;
      const page     = parseInt(q.page     || "1");
      const pageSize = parseInt(q.page_size || "20");
      const kw       = q.keywords || "";
      const sortBy   = q.sort || "best_match";
      const statusFilter = q.statuses ? q.statuses.split(",").filter(Boolean) : [];
      const buyerFilter  = (q.buyer_name || "").toLowerCase();

      // ── 1. Pull local tenders from DB (always present) ──────────────────────
      const localRes = await db.execute(sql`
        SELECT id, title, buyer, category, status, deadline, value_amount, value_text,
               portal, source_url, country, notes, created_at
        FROM saas_tenders
        WHERE org_id = ${orgId}
        ORDER BY
          CASE WHEN deadline IS NOT NULL AND deadline::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' AND deadline::date > CURRENT_DATE THEN 0 ELSE 1 END,
          CASE WHEN deadline IS NOT NULL AND deadline::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN deadline::date ELSE NULL END ASC NULLS LAST,
          created_at DESC
        LIMIT 200
      `);
      const localTenders = (localRes.rows as any[]);

      // ── 2. Try external Contracts Finder API if keywords provided ────────────
      let externalResults: any[] = [];
      let externalTotal  = 0;
      let cfWarnings: string[] = [];
      let ftsEnabled = false;

      // Build match context from org's profile + search config
      const [profileRes, configRes] = await Promise.all([
        db.execute(sql`SELECT sector_experience, bio_summary FROM saas_company_profile WHERE org_id = ${orgId}`),
        db.execute(sql`SELECT keywords, categories, countries FROM saas_search_config WHERE org_id = ${orgId}`),
      ]);
      const cfg = configRes.rows[0] as any;
      const profile = profileRes.rows[0] as any;

      // Derive fallback keywords from sector_experience if config keywords are empty
      const sectorTokens: string[] = (profile?.sector_experience || "")
        .split(/[,;\n]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length >= 3)
        .slice(0, 8);

      const cfgKeywords: string[] = cfg?.keywords || [];
      const fallbackKeywords: string[] = cfgKeywords.length ? cfgKeywords : sectorTokens;
      const effectiveKeywords = kw || fallbackKeywords.join(" ");

      // Detect country from configured countries array: "NG" or "Nigeria" → NG
      const cfgCountries: string[] = cfg?.countries || [];
      const lowered = cfgCountries.map(c => String(c).toLowerCase());
      const hasNG = lowered.some(c => c === "ng" || c === "nigeria");
      const hasGB = lowered.some(c => c === "gb" || c === "uk" || c === "united kingdom" || c === "great britain");
      const queryCountry = (q.country || "").toUpperCase();
      const countryFilter: "GB" | "NG" | "both" =
        queryCountry === "NG" ? "NG" :
        queryCountry === "GB" ? "GB" :
        queryCountry === "BOTH" ? "both" :
        (hasNG && hasGB) ? "both" :
        hasNG ? "NG" :
        "GB";

      const filters: FinderFilters = {
        keywords:       effectiveKeywords || undefined,
        buyer_name:     q.buyer_name      || undefined,
        cpv_code:       q.cpv_code        || undefined,
        procedure_type: q.procedure_type  || undefined,
        winner:         q.winner          || undefined,
        published_from: q.published_from  || undefined,
        published_to:   q.published_to    || undefined,
        sme_only:       q.sme_only === "true",
        source:         (q.source as any) || "both",
        country:        countryFilter,
        sort:           (q.sort as any)   || "best_match",
        page:           1,
        page_size:      50,   // fetch up to 50 external for merging
      };
      if (q.statuses) filters.statuses = q.statuses.split(",").filter(Boolean) as any;
      if (q.regions)  filters.regions  = q.regions.split(",").filter(Boolean);

      // Extend match keywords with sector tokens when config keywords are empty
      const matchKeywords = cfgKeywords.length ? cfgKeywords : Array.from(new Set([...cfgKeywords, ...sectorTokens]));
      const matchCtx: MatchContext = {
        keywords:   matchKeywords,
        categories: cfg?.categories || [],
        sme:        true,
      };

      try {
        const ext = await searchTenders(filters, matchCtx);
        externalResults = ext.results || [];
        externalTotal   = ext.pagination?.total_results || 0;
        cfWarnings      = ext.warnings || [];
        ftsEnabled      = ext.sources?.fts_enabled || false;
      } catch (extErr: any) {
        cfWarnings.push("Live search temporarily unavailable — showing tracked tenders");
      }

      // ── 2b. Cache external results to saas_tenders (fire-and-forget upsert) ──
      if (externalResults.length) {
        (async () => {
          const CLOSED_STATUSES = new Set(["awarded", "closed", "cancelled", "withdrawn", "unsuccessful", "complete", "awarded to other"]);
          for (const r of externalResults) {
            if (!r.title) continue;
            const title = String(r.title).slice(0, 500);
            // Skip irrelevant sectors before any DB write
            if (isIrrelevantTitle(title)) continue;
            const status = (r.status || "open").toLowerCase();
            // Skip already-closed/awarded contracts
            if (CLOSED_STATUSES.has(status)) continue;
            // Skip past-deadline entries
            const deadlineRaw = r.deadline ? String(r.deadline).slice(0, 10) : null;
            if (deadlineRaw && new Date(deadlineRaw) < new Date()) continue;
            const desc = r.description ? String(r.description).slice(0, 2000) : null;
            const buyer = r.buyer ? String(r.buyer).slice(0, 500) : null;
            const valNum = (typeof r.value === "number" && r.value > 0) ? r.value : null;
            const published = r.published_date ? String(r.published_date).slice(0, 10) : null;
            const deadline = deadlineRaw;
            const source = r.source_label || r.source || "external";
            const region = r.region || null;
            const category = r.category || null;
            const score = typeof r.match_score === "number" ? Math.round(r.match_score) : 0;
            const url = r.url || null;
            const countryCode = (r.source === "NG" || (region || "").toLowerCase().includes("nigeria")) ? "NG" : "GB";
            const orgTags = computeOrgTags({ title, buyer, description: desc, category });
            try {
              const cacheInsert = await db.execute(sql`
                INSERT INTO saas_tenders (
                  org_id, title, description, buyer, value_amount, published_date, deadline,
                  status, source, region, category, match_score, external_url, source_url,
                  raw_data, country,
                  ep_relevant, ep_relevance_score, ep_matched_keywords,
                  alli_relevant, alli_relevance_score, alli_matched_keywords,
                  pmo_relevant, pmo_relevance_score, pmo_matched_keywords,
                  updated_at, created_at
                ) VALUES (
                  ${orgId}, ${title}, ${desc}, ${buyer}, ${valNum}, ${published}, ${deadline},
                  ${status}, ${source}, ${region}, ${category}, ${score}, ${url}, ${url},
                  ${JSON.stringify(r)}::jsonb, ${countryCode},
                  ${orgTags.ep_relevant}, ${orgTags.ep_relevance_score}, ${pgTextArray(orgTags.ep_matched_keywords)}::text[],
                  ${orgTags.alli_relevant}, ${orgTags.alli_relevance_score}, ${pgTextArray(orgTags.alli_matched_keywords)}::text[],
                  ${orgTags.pmo_relevant}, ${orgTags.pmo_relevance_score}, ${pgTextArray(orgTags.pmo_matched_keywords)}::text[],
                  NOW(), NOW()
                )
                ON CONFLICT (org_id, title) DO UPDATE SET
                  match_score = EXCLUDED.match_score,
                  deadline = EXCLUDED.deadline,
                  status = EXCLUDED.status,
                  description = COALESCE(EXCLUDED.description, saas_tenders.description),
                  region = COALESCE(EXCLUDED.region, saas_tenders.region),
                  category = COALESCE(EXCLUDED.category, saas_tenders.category),
                  source = COALESCE(EXCLUDED.source, saas_tenders.source),
                  external_url = COALESCE(EXCLUDED.external_url, saas_tenders.external_url),
                  raw_data = EXCLUDED.raw_data,
                  ep_relevant = EXCLUDED.ep_relevant,
                  ep_relevance_score = EXCLUDED.ep_relevance_score,
                  ep_matched_keywords = EXCLUDED.ep_matched_keywords,
                  alli_relevant = EXCLUDED.alli_relevant,
                  alli_relevance_score = EXCLUDED.alli_relevance_score,
                  alli_matched_keywords = EXCLUDED.alli_matched_keywords,
                  pmo_relevant = EXCLUDED.pmo_relevant,
                  pmo_relevance_score = EXCLUDED.pmo_relevance_score,
                  pmo_matched_keywords = EXCLUDED.pmo_matched_keywords,
                  updated_at = NOW()
                RETURNING id
              `);
              const cid = (cacheInsert.rows[0] as any)?.id;
              if (cid) syncOrgScores(cid); // non-blocking
            } catch (e: any) {
              // silent — cache writes must never break the response
            }
          }
        })().catch(() => {});
      }

      // ── 3. Convert local tenders to normalised finder shape ──────────────────
      const externalIds = new Set(externalResults.map((e: any) => (e.url || e.id || "").toLowerCase()));

      const localNormalised: any[] = localTenders
        .filter(t => {
          // Keyword filter on local
          if (kw) {
            const text = `${t.title} ${t.buyer} ${t.category} ${t.description || ""}`.toLowerCase();
            const words = kw.toLowerCase().split(/\s+/).filter(Boolean);
            if (!words.some(w => text.includes(w))) return false;
          }
          // Buyer filter
          if (buyerFilter && !(`${t.buyer || ""}`.toLowerCase().includes(buyerFilter))) return false;
          // Status filter
          if (statusFilter.length) {
            const mapped = (t.status || "").toLowerCase().replace(/\s+/g, "_");
            if (!statusFilter.some((s: string) => mapped.includes(s))) return false;
          }
          // De-duplicate vs external
          const tUrl = (t.source_url || "").toLowerCase();
          if (tUrl && externalIds.has(tUrl)) return false;
          return true;
        })
        .map(t => {
          const val = t.value_amount ? parseFloat(String(t.value_amount)) : null;
          const statusMap: Record<string, string> = {
            "active": "open", "in progress": "open", "researching": "open",
            "submitted": "closed", "won": "awarded", "lost": "closed",
          };
          const rawStatus = (t.status || "").toLowerCase();
          const normStatus = statusMap[rawStatus] || rawStatus || "open";
          return {
            id:            `local-${t.id}`,
            title:         t.title,
            buyer:         t.buyer || "—",
            value:         val,
            value_estimated: false,
            published_date: t.created_at ? String(t.created_at).split("T")[0] : null,
            deadline:      t.deadline ? String(t.deadline).split("T")[0] : null,
            status:        normStatus,
            source:        "DB",
            source_label:  "Your Pipeline",
            region:        t.country === "NG" ? "Nigeria" : "United Kingdom",
            category:      t.category || "",
            description:   t.notes || "",
            url:           t.source_url || "",
            match_score:   null,
            match_tier:    null,
            procedure_type: null,
            winner:        null,
            award_value:   null,
            award_date:    null,
            sme_suitable:  null,
            _local:        true,
          };
        });

      // ── 4. Merge: external first, then local ─────────────────────────────────
      const merged = [...externalResults, ...localNormalised];

      // ── 5. Sort ──────────────────────────────────────────────────────────────
      if (sortBy === "newest") {
        merged.sort((a, b) => (b.published_date || "").localeCompare(a.published_date || ""));
      } else if (sortBy === "oldest") {
        merged.sort((a, b) => (a.published_date || "").localeCompare(b.published_date || ""));
      } else if (sortBy === "deadline_asc") {
        merged.sort((a, b) => {
          if (!a.deadline) return 1; if (!b.deadline) return -1;
          return a.deadline.localeCompare(b.deadline);
        });
      } else if (sortBy === "deadline_desc") {
        merged.sort((a, b) => {
          if (!a.deadline) return 1; if (!b.deadline) return -1;
          return b.deadline.localeCompare(a.deadline);
        });
      } else if (sortBy === "value_desc") {
        merged.sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
      } else if (sortBy === "value_asc") {
        merged.sort((a, b) => (a.value ?? Infinity) - (b.value ?? Infinity));
      } else {
        // best_match — external (scored) first, then local
        merged.sort((a, b) => {
          const sa = a.match_score ?? -1;
          const sb = b.match_score ?? -1;
          return sb - sa;
        });
      }

      // ── 6. Paginate ──────────────────────────────────────────────────────────
      const total = merged.length + externalTotal;
      const start = (page - 1) * pageSize;
      const paged = merged.slice(start, start + pageSize);

      // ── 7. Build status counts ───────────────────────────────────────────────
      const statusCounts: Record<string, number> = { all: merged.length };
      for (const t of merged) {
        const s = t.status || "unknown";
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      }

      // ── 8. Stats ─────────────────────────────────────────────────────────────
      const values = merged.map((t: any) => t.value).filter((v: any) => v != null && v > 0) as number[];
      const avgVal = values.length ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length) : null;
      const now = Date.now();
      const closingSoon = merged.filter((t: any) => t.deadline && (new Date(t.deadline).getTime() - now) < 7 * 86400 * 1000 && new Date(t.deadline).getTime() > now).length;

      res.json({
        results:       paged,
        status_counts: statusCounts,
        stats: {
          active:        statusCounts["open"]    || 0,
          average_value: avgVal,
          closing_soon:  closingSoon,
        },
        pagination: {
          page,
          page_size:    pageSize,
          total_results: merged.length,
          total_pages:  Math.max(1, Math.ceil(merged.length / pageSize)),
        },
        sources: { fts_enabled: ftsEnabled },
        warnings: cfWarnings,
      });
    } catch (err: any) {
      console.error("[TenderFinder] search error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Buyer procurement history — for competitive intelligence panel
  app.get("/api/saas-tender/finder/buyer-intel", authenticateSaasUser, async (req: any, res) => {
    try {
      const buyer = (req.query.buyer as string) || "";
      if (!buyer) return res.json({ contracts: [], stats: null });

      // Fetch last 2 years of awarded contracts from CF for this buyer
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const from = twoYearsAgo.toISOString().split("T")[0];

      const filters: FinderFilters = {
        buyer_name: buyer,
        statuses: ["awarded"],
        published_from: from,
        source: "cf",
        sort: "newest",
        page_size: 50,
      };
      const [profileRes, configRes] = await Promise.all([
        db.execute(sql`SELECT sector_experience FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`),
        db.execute(sql`SELECT keywords, categories FROM saas_search_config WHERE org_id = ${req.saasUser.orgId}`),
      ]);
      const cfg = configRes.rows[0] as any;
      const ctx: MatchContext = { keywords: cfg?.keywords || [], categories: cfg?.categories || [] };

      const result = await searchTenders(filters, ctx);
      const contracts = result.results;

      // Aggregate stats
      const winners: Record<string, number> = {};
      const cats: Record<string, number> = {};
      let totalValue = 0; let valueCount = 0;
      const renewals: any[] = [];
      const now = Date.now();

      for (const c of contracts) {
        if (c.winner) winners[c.winner] = (winners[c.winner] || 0) + 1;
        if (c.category) cats[c.category] = (cats[c.category] || 0) + 1;
        if (c.award_value) { totalValue += c.award_value; valueCount++; }
        // Contracts ending within 12 months = renewal opportunity
        if (c.deadline) {
          const months = (new Date(c.deadline).getTime() - now) / (1000 * 60 * 60 * 24 * 30);
          if (months > 0 && months <= 12) renewals.push(c);
        }
      }

      const topWinners = Object.entries(winners).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
      const topCats    = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

      return res.json({
        buyer,
        contracts,
        stats: {
          total:          contracts.length,
          average_value:  valueCount ? Math.round(totalValue / valueCount) : null,
          top_winners:    topWinners,
          top_categories: topCats,
        },
        renewals: renewals.slice(0, 5),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/saas-tender/feed/search", authenticateSaasUser, async (req: any, res) => {
    try {
      const configResult = await db.execute(sql`SELECT * FROM saas_search_config WHERE org_id = ${req.saasUser.orgId}`);
      const config = configResult.rows[0] as any;
      const keywords: string[] = config?.keywords || ["event management"];
      const countries: string[] = config?.countries || ["UK"];

      const now = new Date();
      const minDeadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const closedStatuses = ["closed", "cancelled", "complete", "awarded", "unsuccessful", "withdrawn"];
      const seen = new Set<string>();
      const allTenders: any[] = [];

      for (const term of keywords.slice(0, 15)) {
        try {
          const apiUrl = `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?queryString=${encodeURIComponent(term)}&stage=tender&output=json&publishedFrom=${now.getFullYear()}-01-01&size=50`;
          const response = await fetch(apiUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
          if (!response.ok) continue;
          const data = await response.json() as any;
          for (const r of (data?.releases || [])) {
            const tender = r.tender || {};
            const status = (tender.status || "").toLowerCase();
            if (closedStatuses.includes(status)) continue;
            const deadlineStr = tender.tenderPeriod?.endDate || "";
            if (!deadlineStr) continue;
            const deadlineDate = new Date(deadlineStr);
            if (deadlineDate < minDeadline) continue;
            const title = tender.title || "";
            if (seen.has(title)) continue;
            seen.add(title);
            const buyer = r.buyer || {};
            const value = tender.value || tender.minValue || {};
            const idParts = (r.id || "").split("-");
            const noticeGuid = idParts.length >= 5 ? idParts.slice(0, 5).join("-") : r.id || "";
            allTenders.push({
              title, description: (tender.description || "").slice(0, 300),
              buyer: buyer.name || "Not specified",
              value_amount: value.amount || null, value_currency: value.currency || "GBP",
              deadline: deadlineStr.split("T")[0],
              published: r.date ? r.date.split("T")[0] : "",
              source_url: noticeGuid ? `https://www.contractsfinder.service.gov.uk/Notice/${noticeGuid}` : "",
              source: "Contracts Finder", status: "Open",
            });
          }
        } catch {}
      }

      for (const term of keywords.slice(0, 10)) {
        try {
          const apiUrl = `https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?queryString=${encodeURIComponent(term)}&stage=tender&size=30`;
          const response = await fetch(apiUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
          if (!response.ok) continue;
          const data = await response.json() as any;
          const packages = data?.results || data?.releasePackages || data || [];
          for (const pkg of (Array.isArray(packages) ? packages : [])) {
            for (const r of (pkg.releases || [pkg])) {
              const tender = r.tender || {};
              const status = (tender.status || "").toLowerCase();
              if (closedStatuses.includes(status)) continue;
              const deadlineStr = tender.tenderPeriod?.endDate || "";
              if (!deadlineStr) continue;
              if (new Date(deadlineStr) < minDeadline) continue;
              const title = tender.title || "";
              if (seen.has(title)) continue;
              seen.add(title);
              const buyer = r.buyer || {};
              const value = tender.value || {};
              allTenders.push({
                title, description: (tender.description || "").slice(0, 300),
                buyer: buyer.name || "Not specified",
                value_amount: value.amount || null, value_currency: value.currency || "GBP",
                deadline: deadlineStr.split("T")[0],
                published: r.date ? r.date.split("T")[0] : "",
                source_url: r.id ? `https://www.find-tender.service.gov.uk/Notice/${(r.id || "").split("-").slice(0,5).join("-")}` : "",
                source: "Find a Tender", status: "Open",
              });
            }
          }
        } catch {}
      }

      // SAM.gov — US Federal Procurement Portal (requires SAM_GOV_API_KEY env var to enable)
      if (process.env.SAM_GOV_API_KEY) {
        for (const term of keywords.slice(0, 6)) {
          try {
            const samResults = await searchSamGov(term, 20);
            for (const r of samResults) {
              if (seen.has(r.title)) continue;
              seen.add(r.title);
              if (r.deadline && new Date(r.deadline) < minDeadline) continue;
              allTenders.push({
                title: r.title,
                description: r.description,
                buyer: r.buyer,
                value_amount: r.value_amount,
                value_currency: "USD",
                deadline: r.deadline,
                published: r.published,
                source_url: r.source_url,
                source: "SAM.gov",
                status: "Open",
                naics_code: r.naics_code || "",
                set_aside: r.set_aside || "",
                notice_type: r.notice_type || "",
              });
            }
          } catch {}
        }
      }
      // else: SAM.gov skipped — set SAM_GOV_API_KEY to enable US federal procurement

      // TED EU — Tenders Electronic Daily (real API, replaces AI hallucination)
      // UNGM removed: ungm.org/Public/Notice returns HTML not JSON and requires supplier registration
      for (const term of keywords.slice(0, 6)) {
        try {
          const tedResults = await fetchTedEU(term, 15);
          for (const t of tedResults) {
            if (!t.title || seen.has(t.title)) continue;
            seen.add(t.title);
            if (t.deadline && new Date(t.deadline) < minDeadline) continue;
            allTenders.push({ ...t });
          }
        } catch {}
      }

            // UNDP Procurement Notices
      for (const term of keywords.slice(0, 6)) {
        try {
          const undpResponse = await fetch(
            `https://procurement-notices.undp.org/view.cfm?cf=1&SearchString=${encodeURIComponent(term)}&Country=&Category=&SC=0&SO=0&PageSize=15&OutputType=json`,
            { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) }
          );
          if (undpResponse.ok) {
            const text = await undpResponse.text();
            if (!text.includes("404") && !text.includes("File or directory not found")) {
              try {
                const undpData = JSON.parse(text);
                const notices = Array.isArray(undpData) ? undpData : (undpData?.Results || undpData?.ProcurementNoticeList || []);
                for (const n of notices) {
                  const title = n.Title || n.title || "";
                  if (!title || seen.has(title)) continue;
                  seen.add(title);
                  const deadline = n.DeadlineDate || n.Deadline || "";
                  if (deadline) { try { if (new Date(deadline) <= now) continue; } catch {} }
                  const countryName = (n.CountryName || n.Country || "").toLowerCase();
                  allTenders.push({
                    title, description: (n.Description || n.ProcurementType || "").slice(0, 300),
                    buyer: "UNDP",
                    value_amount: null, value_currency: "USD",
                    deadline: deadline ? new Date(deadline).toISOString().split("T")[0] : "",
                    published: n.PublishedDate ? new Date(n.PublishedDate).toISOString().split("T")[0] : "",
                    source_url: n.ID ? `https://procurement-notices.undp.org/view.cfm?notice_id=${n.ID}` : "https://procurement-notices.undp.org",
                    source: "UNDP", status: "Open",
                    country: countryName.includes("nigeria") ? "Nigeria" : "International",
                    location: n.CountryName || n.Country || "",
                  });
                }
              } catch {}
            }
          }
        } catch {}
      }

      // World Bank — Nigeria & Africa procurement
      for (const term of keywords.slice(0, 4)) {
        try {
          const wbResponse = await fetch(
            `https://search.worldbank.org/api/v2/procnotices?format=json&qterm=${encodeURIComponent(term)}&rows=15&srt=score&order=desc&os=0`,
            { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) }
          );
          if (wbResponse.ok) {
            const wbData = await wbResponse.json() as any;
            const notices = wbData?.procnotices || {};
            for (const key of Object.keys(notices)) {
              const n = notices[key];
              if (!n || typeof n !== "object" || !n.notice_text) continue;
              const rawTitle = n.notice_text || "";
              const title = stripHtml(rawTitle).slice(0, 300).trim();
              const noticeType = String(n.notice_type || n.notice_type_desc || "");
              if (!title || seen.has(title) || isAwardNotice(title, rawTitle, noticeType)) continue;
              seen.add(title);
              const deadline = n.deadline_date || n.submission_date || "";
              if (deadline) { try { if (!isValidDeadline(deadline) || new Date(deadline) <= now) continue; } catch {} }
              const countryText = (n.countryshortname || "").toLowerCase();
              allTenders.push({
                title, description: `${noticeType}${n.project_id ? ` — Project: ${n.project_id}` : ""}. ${stripHtml(n.notice_text || "").slice(0, 300)}`,
                buyer: n.borrower || "World Bank",
                value_amount: null, value_currency: "USD",
                deadline: deadline ? deadline.split("T")[0] : "",
                published: n.notice_posted_date ? n.notice_posted_date.split("T")[0] : "",
                source_url: n.id ? `https://projects.worldbank.org/en/projects-operations/procurement-detail/${n.id}` : "https://projects.worldbank.org",
                source: "World Bank", status: "Open",
                country: countryText.includes("nigeria") ? "Nigeria" : "International",
                location: n.countryshortname || "",
              });
            }
          }
        } catch {}
      }

      // AfDB — African Development Bank
      try {
        const afdbResponse = await fetch(
          `https://www.afdb.org/en/documents/procurement-notices?title=${encodeURIComponent(keywords[0] || "programme")}`,
          { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "text/html" }, signal: AbortSignal.timeout(12000) }
        );
        if (afdbResponse.ok) {
          const html = await afdbResponse.text();
          const items = html.split('views-row').slice(1);
          for (const item of items.slice(0, 10)) {
            const linkMatch = item.match(/href="([^"]*)"[^>]*>([^<]+)/);
            if (!linkMatch) continue;
            const path = linkMatch[1] || "";
            const title = (linkMatch[2] || "").trim();
            if (!title || seen.has(title)) continue;
            seen.add(title);
            const url = path.startsWith("http") ? path : `https://www.afdb.org${path}`;
            allTenders.push({
              title, description: "",
              buyer: "African Development Bank",
              value_amount: null, value_currency: "USD",
              deadline: "", published: "",
              source_url: url,
              source: "AfDB", status: "Open",
              country: title.toLowerCase().includes("nigeria") ? "Nigeria" : "Africa",
              location: title.toLowerCase().includes("nigeria") ? "Nigeria" : "Africa",
            });
          }
        }
      } catch {}

      // NGTenders — Nigeria tender aggregator
      for (const term of keywords.slice(0, 4)) {
        try {
          const ngResponse = await fetch(`https://www.ngtenders.com/?s=${encodeURIComponent(term)}`, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "text/html" },
            signal: AbortSignal.timeout(15000),
          });
          if (ngResponse.ok) {
            const html = await ngResponse.text();
            const articles = html.split('<article').slice(1);
            for (const article of articles.slice(0, 15)) {
              const titleMatch = article.match(/class="entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]+)/);
              const dateMatch = article.match(/class="entry-date[^"]*"[^>]*datetime="([^"]*)"[^>]*>([^<]+)/);
              const excerptMatch = article.match(/class="entry-(?:summary|content|excerpt)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p)>/);
              if (!titleMatch) continue;
              const url = titleMatch[1] || "";
              const title = (titleMatch[2] || "").trim();
              if (!title || seen.has(title)) continue;
              seen.add(title);
              const publishDate = dateMatch ? (dateMatch[1] || "").split("T")[0] : "";
              const excerpt = (excerptMatch?.[1] || "").replace(/<[^>]+>/g, "").trim().slice(0, 300);
              allTenders.push({
                title, description: excerpt,
                buyer: "Nigeria Government",
                value_amount: null, value_currency: "NGN",
                deadline: "", published: publishDate,
                source_url: url,
                source: "NGTenders", status: "Open",
                country: "Nigeria", location: "Nigeria",
              });
            }
          }
        } catch {}
      }

      // bidstats.uk — UK contract award intelligence (useful for market intelligence)
      // Devex removed: requires login/paywall, consistently returns empty results
      for (const term of keywords.slice(0, 3)) {
        try {
          const bidResults = await fetchBidStats(term, 10);
          for (const t of bidResults) {
            if (!t.title || seen.has(t.title)) continue;
            seen.add(t.title);
            allTenders.push({ ...t });
          }
        } catch {}
      }

            allTenders.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      res.json({ tenders: allTenders, total: allTenders.length, keywords });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/intelligence", authenticateSaasUser, async (req: any, res) => {
    try {
      const country = req.query.country || "GB";
      const result = await db.execute(sql`SELECT * FROM saas_procurement_intelligence WHERE org_id = ${req.saasUser.orgId} AND (country = ${country} OR country IS NULL) ORDER BY created_at DESC LIMIT 50`);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ─── Manual trigger: run daily tender sweep now (admin testing) ──────────────
  // POST /api/saas-tender/sweep/run-now → moved to ./routes/discovery.ts

  // ─── Manual trigger: send deadline reminders now (admin testing) ─────────────
  app.post("/api/saas-tender/deadline-mailer/run-now", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await runDeadlineMailer();
      res.json(result);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/intelligence/scan", authenticateSaasUser, async (req: any, res) => {
    try {
      const existing = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM saas_procurement_intelligence WHERE org_id = ${req.saasUser.orgId} AND created_at > NOW() - INTERVAL '12 hours'`);
      if ((existing.rows[0] as any).cnt > 0) return res.json({ message: "Feed is up to date", scanned: false });

      const configResult = await db.execute(sql`SELECT * FROM saas_search_config WHERE org_id = ${req.saasUser.orgId}`);
      const config = configResult.rows[0] as any;
      const keywords = (config?.keywords || []).join(", ") || "procurement";
      const countries = (config?.countries || []).join(", ") || "UK";
      const profile = await db.execute(sql`SELECT company_name, sector_experience FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`);
      const p = (profile.rows[0] || {}) as any;

      const content = await claudeAI(
        `You are a procurement intelligence analyst for ${p.company_name || "a company"} (sectors: ${p.sector_experience || keywords}). Generate 10-12 current procurement intelligence items. Return ONLY valid JSON array with: title, summary (2-3 sentences), source, source_url, country, category, item_type (news/framework/funding/tender_alert/compliance/opportunity), published_date (YYYY-MM-DD). Countries focus: ${countries}. Return ONLY valid JSON array, no markdown.`,
        `Generate procurement intelligence for ${new Date().toLocaleDateString("en-GB")}. Focus on: ${keywords}.`,
        4000
      );
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return res.status(500).json({ message: "Parse error" });
      const items = JSON.parse(jsonMatch[0]);
      let inserted = 0;
      for (const item of items) {
        try {
          const exists = await db.execute(sql`SELECT id FROM saas_procurement_intelligence WHERE title = ${item.title} AND org_id = ${req.saasUser.orgId}`);
          if (exists.rows.length === 0) {
            await db.execute(sql`INSERT INTO saas_procurement_intelligence (org_id, title, summary, source, source_url, country, category, item_type, published_date, is_new, ai_generated) VALUES (${req.saasUser.orgId}, ${item.title}, ${item.summary}, ${item.source}, ${item.source_url || ""}, ${item.country || "UK"}, ${item.category || "News"}, ${item.item_type || "news"}, ${item.published_date || new Date().toISOString().split("T")[0]}, true, true)`);
            inserted++;
          }
        } catch {}
      }
      return res.json({ message: `${inserted} new items`, inserted, total: items.length });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/portal-registrations", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`SELECT * FROM saas_portal_registrations WHERE org_id = ${req.saasUser.orgId} ORDER BY portal_name`);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/portal-registrations", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const result = await db.execute(sql`INSERT INTO saas_portal_registrations (org_id, portal_name, portal_url, login_url, region, category, email, password, username) VALUES (${req.saasUser.orgId}, ${d.portal_name}, ${d.portal_url || null}, ${d.login_url || null}, ${d.region || 'UK'}, ${d.category || null}, ${d.email || null}, ${d.password || null}, ${d.username || null}) ON CONFLICT (org_id, portal_name) DO NOTHING RETURNING *`);
      res.json(result.rows[0] || { message: "Already registered" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/saas-tender/portal-registrations/:name", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const result = await db.execute(sql.raw(`
        UPDATE saas_portal_registrations 
        SET email = '${(d.email || "").replace(/'/g, "''")}', 
            password = '${(d.password || "").replace(/'/g, "''")}', 
            username = '${(d.username || "").replace(/'/g, "''")}' 
        WHERE portal_name = '${req.params.name.replace(/'/g, "''")}' 
        AND org_id = ${req.saasUser.orgId} 
        RETURNING *
      `));
      res.json(result.rows[0] || { message: "Not found" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/saas-tender/portal-registrations/:name", authenticateSaasUser, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM saas_portal_registrations WHERE portal_name = ${req.params.name} AND org_id = ${req.saasUser.orgId}`);
      res.json({ message: "Removed" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // Watchlist routes (GET/POST/DELETE) → moved to ./routes/discovery.ts

  // ── Action Items ──────────────────────────────────────────────────────────
  app.get("/api/saas-tender/action-items", authenticateSaasUser, async (req: any, res) => {
    try {
      const country = (req.query.country as string || "GB").toUpperCase();
      const result = await db.execute(sql`
        SELECT * FROM saas_action_items
        WHERE org_id = ${req.saasUser.orgId}
          AND (country = ${country} OR country IS NULL)
          AND status != 'dismissed'
        ORDER BY
          CASE urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
          deadline ASC NULLS LAST,
          created_at ASC
      `);
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/saas-tender/action-items/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      const { status, notes } = req.body || {};
      const result = await db.execute(sql`
        UPDATE saas_action_items
        SET status = ${status || 'done'}, updated_at = NOW()
        WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}
        RETURNING *
      `);
      if (!result.rows.length) return res.status(404).json({ message: "Not found" });
      return res.json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/saas-tender/action-items", authenticateSaasUser, async (req: any, res) => {
    try {
      const { title, description, urgency, action_label, action_url, deadline, source, country } = req.body || {};
      if (!title) return res.status(400).json({ message: "Title required" });
      const result = await db.execute(sql`
        INSERT INTO saas_action_items (org_id, title, description, urgency, action_label, action_url, deadline, source, country)
        VALUES (${req.saasUser.orgId}, ${title}, ${description || null}, ${urgency || 'medium'}, ${action_label || null}, ${action_url || null}, ${deadline || null}, ${source || null}, ${country || 'GB'})
        RETURNING *
      `);
      return res.json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/saas-tender/stats", authenticateSaasUser, async (req: any, res) => {
    try {
      const orgId = req.saasUser.orgId;
      const country = req.query.country || "GB";
      const tenders = await db.execute(sql`SELECT status, COUNT(*)::int as count, COALESCE(SUM(value_amount),0)::float as total_value FROM saas_tenders WHERE org_id = ${orgId} AND (country = ${country} OR country IS NULL) GROUP BY status`);
      const docs = await db.execute(sql`SELECT COUNT(*)::int as count FROM saas_tender_documents WHERE org_id = ${orgId}`);
      const intel = await db.execute(sql`SELECT COUNT(*)::int as count FROM saas_procurement_intelligence WHERE org_id = ${orgId} AND is_new = true`);
      const watchlist = await db.execute(sql`SELECT COUNT(*)::int as count FROM saas_tender_watchlist WHERE org_id = ${orgId}`);

      // Aggregate metrics from saas_tenders (cached external + local)
      const agg = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(status) = 'open')::int AS active_tenders,
          COUNT(*) FILTER (
            WHERE deadline IS NOT NULL
              AND LOWER(status) = 'open'
              AND deadline ~ '^\d{4}-\d{2}-\d{2}'
              AND to_date(substring(deadline FROM 1 FOR 10), 'YYYY-MM-DD')
                    BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
          )::int AS closing_soon,
          ROUND(AVG(value_amount) FILTER (WHERE value_amount IS NOT NULL AND value_amount > 0))::float AS average_value,
          COUNT(*)::int AS total_results,
          MAX(updated_at) AS last_updated
        FROM saas_tenders
        WHERE org_id = ${orgId}
      `);
      const aggRow = (agg.rows[0] || {}) as any;

      const statusCountsRow = await db.execute(sql`
        SELECT LOWER(status) AS status, COUNT(*)::int AS count
        FROM saas_tenders
        WHERE org_id = ${orgId}
        GROUP BY LOWER(status)
      `);
      const status_counts: Record<string, number> = {
        open: 0, awarded: 0, closed: 0, planned: 0, cancelled: 0,
      };
      for (const r of (statusCountsRow.rows as any[])) {
        status_counts[r.status || "unknown"] = r.count;
      }

      res.json({
        // Legacy fields retained for existing callers
        tendersByStatus: tenders.rows,
        totalDocuments: (docs.rows[0] as any).count,
        newIntelligence: (intel.rows[0] as any).count,
        watchlistCount: (watchlist.rows[0] as any).count,
        // New DB-backed finder stats
        active_tenders: aggRow.active_tenders || 0,
        closing_soon: aggRow.closing_soon || 0,
        average_value: aggRow.average_value || null,
        total_results: aggRow.total_results || 0,
        last_updated: aggRow.last_updated || null,
        status_counts,
      });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EP OPPORTUNITY INTELLIGENCE — auto-generate matched tender suggestions
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/saas-tender/opportunities", authenticateSaasUser, async (req: any, res) => {
    try {
      const orgId = req.saasUser.orgId;
      const country = (req.query.country as string) || "GB";

      const profileRes = await db.execute(sql`SELECT * FROM saas_company_profile WHERE org_id = ${orgId}`);
      const profile = (profileRes.rows[0] || {}) as any;

      const existingRes = await db.execute(sql`
        SELECT title FROM saas_tenders WHERE org_id = ${orgId} ORDER BY updated_at DESC LIMIT 20
      `);
      const existingTitles = (existingRes.rows as any[]).map((r: any) => r.title).join(", ");

      const entityHint = country === "NG"
        ? "Event Perfekt Management Services Limited (Nigeria)"
        : "Event Perfekt Global Ltd (UK)";

      const profileContext = profile.company_name
        ? `Company: ${profile.company_name}\nBio: ${profile.bio_summary || ""}\nSectors: ${profile.sector_experience || ""}\nCerts: ${profile.certifications || ""}`
        : `Entity: ${entityHint} — a professional event management and international programme delivery company`;

      const prompt = `You are EP Agent, a specialist bid advisor for ${entityHint}.

Company Profile:
${profileContext}

Event Perfekt's core capabilities:
- Professional event management (conferences, galas, awards ceremonies, corporate events, stakeholder forums)
- Programme and project management for international development
- FCDO/DFID-aligned delivery in Africa (Nigeria, Ghana, Kenya, Sierra Leone, Mozambique, Madagascar)
- Community engagement and stakeholder management
- Remittance and diaspora financial services (TwinPaay brand)
- Capacity building and training delivery
- Logistics coordination
- Social value delivery (PPN 06/20 compliant)
- Youth violence prevention programme delivery
- Grant management and reporting

${existingTitles ? `Already tracking (avoid duplicating): ${existingTitles}` : ""}

Generate EXACTLY 8 specific, realistic tender opportunities that ${entityHint} should pursue RIGHT NOW in April 2026.
Each must be a real contract type, matched to EP's capabilities, and achievable by an SME.

Return a JSON array ONLY (no markdown fences, no explanation), each object with these exact keys:
- title: specific tender title (not generic — include contract type and subject)
- buyer: realistic buyer organisation name
- sector: sector category
- value_range: e.g. "£25,000 - £80,000"
- match_score: integer 70-98
- match_reasons: array of exactly 2 specific reasons EP is a strong match
- action: "search"
- search_query: 2-4 word search query to find this on Contracts Finder or Find a Tender
- urgency: "high" or "medium" or "low"
- deadline_hint: approximate timeframe e.g. "May 2026" or "Q2 2026"`;

      let opportunities: any[] = [];
      try {
        const rawJson = await claudeAI("", prompt, 2000);
        const jsonMatch = rawJson.match(/\[[\s\S]*\]/);
        if (jsonMatch) opportunities = JSON.parse(jsonMatch[0]);
      } catch { /* use fallback */ }

      if (!opportunities.length) {
        opportunities = [
          { title: "Event Management Services — FCDO Annual Stakeholder Conference", buyer: "Foreign Commonwealth & Development Office", sector: "Government / International Development", value_range: "£50,000–£120,000", match_score: 93, match_reasons: ["Core event management capability", "Established FCDO sector knowledge"], action: "search", search_query: "FCDO conference event management", urgency: "high", deadline_hint: "May 2026" },
          { title: "Programme Delivery Support — Nigeria Agricultural Value Chain", buyer: "GIZ Nigeria", sector: "International Development", value_range: "£80,000–£250,000", match_score: 90, match_reasons: ["Nigeria-based operations", "Programme management expertise"], action: "search", search_query: "GIZ Nigeria programme delivery", urgency: "high", deadline_hint: "June 2026" },
          { title: "Youth Violence Reduction Programme — Community Outreach", buyer: "Greater London Authority", sector: "Public Sector / Social", value_range: "£30,000–£90,000", match_score: 88, match_reasons: ["Active youth violence prevention programmes", "Proven community engagement"], action: "search", search_query: "youth violence prevention outreach London", urgency: "medium", deadline_hint: "Q2 2026" },
          { title: "Diaspora Financial Inclusion Advisory Services", buyer: "Money & Pensions Service", sector: "Financial Services / Inclusion", value_range: "£40,000–£100,000", match_score: 85, match_reasons: ["TwinPaay remittance platform expertise", "Diaspora community engagement"], action: "search", search_query: "diaspora remittance financial inclusion advisory", urgency: "medium", deadline_hint: "Q3 2026" },
          { title: "Capacity Building — ECOWAS Trade Facilitation Workshop Series", buyer: "ECOWAS Commission", sector: "International Trade / Capacity", value_range: "£60,000–£180,000", match_score: 87, match_reasons: ["West Africa delivery network", "Training facilitation capability"], action: "search", search_query: "ECOWAS capacity building workshops", urgency: "medium", deadline_hint: "Q2 2026" },
          { title: "Stakeholder Engagement Events — Net Zero Strategy Launch", buyer: "Department for Energy Security", sector: "Government / Environment", value_range: "£25,000–£70,000", match_score: 82, match_reasons: ["Event management for government stakeholder forums", "Social value delivery framework"], action: "search", search_query: "government stakeholder engagement event net zero", urgency: "low", deadline_hint: "Q3 2026" },
          { title: "Programme Management Office — British Council Nigeria", buyer: "British Council", sector: "International Development / Education", value_range: "£100,000–£300,000", match_score: 91, match_reasons: ["Nigeria operations", "PMO and programme management track record"], action: "search", search_query: "British Council Nigeria PMO programme management", urgency: "high", deadline_hint: "May 2026" },
          { title: "Logistics & Events Coordination — CEFAS Fisheries Conference", buyer: "Centre for Environment Fisheries & Aquaculture", sector: "Environment / Science", value_range: "£20,000–£60,000", match_score: 84, match_reasons: ["Established CEFAS relationship (Mozambique/Madagascar)", "Conference logistics expertise"], action: "search", search_query: "CEFAS conference logistics fisheries", urgency: "medium", deadline_hint: "Q2 2026" },
        ];
      }

      res.json({ opportunities, country, generated_at: new Date().toISOString() });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ─── Auto-seed: Background pull of open tenders from UK Contracts Finder ────
  app.post("/api/saas-tender/auto-seed", authenticateSaasUser, async (req: any, res) => {
    try {
      const orgId = req.saasUser.orgId;
      const country = (req.body.country as string) || "GB";
      res.json({ message: "Background seed started" });

      // Fire-and-forget: search top EP-specific keywords and seed pinned opportunities
      // Tightened toward FCDO/DEFRA/programme delivery language to catch frameworks like FCDO Event Production
      const keywords = [
        "event production framework",
        "FCDO event management",
        "FCDO programme delivery",
        "Africa event management",
        "FCDO Africa programme",
        "event management framework government",
        "conference management services",
        "Africa regional support",
        "international development events",
        "CEFAS Africa",
        "stakeholder engagement programme",
        "programme delivery Africa",
        "ministerial conference management",
        "government conference management",
      ];
      (async () => {
        for (const kw of keywords) {
          try {
            const results = await searchTenders({ keywords: kw, page: 1, page_size: 10, sort: "newest" } as any, { orgId } as any);
            const rows = (results as any)?.results || [];
            for (const t of rows.slice(0, 5)) {
              const title = t.title || "";
              if (!title) continue;
              // Skip obviously irrelevant sectors before inserting
              if (isIrrelevantTitle(title)) continue;
              const _tags = computeOrgTags({ title, buyer: t.buyer, description: t.description, category: t.category });
              await db.execute(sql`
                INSERT INTO saas_tenders (org_id, title, buyer, value_text, value_amount, deadline, status, category, portal, source_url, country, description, source, external_url,
                  ep_relevant, ep_relevance_score, ep_matched_keywords,
                  alli_relevant, alli_relevance_score, alli_matched_keywords,
                  pmo_relevant, pmo_relevance_score, pmo_matched_keywords,
                  updated_at)
                VALUES (${orgId}, ${title}, ${t.buyer || ""}, ${t.value_text || ""}, ${t.value_amount || null}, ${t.deadline || null}, ${t.status || "open"}, ${t.category || ""}, ${"Auto-Seeded"}, ${t.source_url || ""}, ${country}, ${t.description || ""}, ${t.source || ""}, ${t.url || ""},
                  ${_tags.ep_relevant}, ${_tags.ep_relevance_score}, ${pgTextArray(_tags.ep_matched_keywords)}::text[],
                  ${_tags.alli_relevant}, ${_tags.alli_relevance_score}, ${pgTextArray(_tags.alli_matched_keywords)}::text[],
                  ${_tags.pmo_relevant}, ${_tags.pmo_relevance_score}, ${pgTextArray(_tags.pmo_matched_keywords)}::text[],
                  NOW())
                ON CONFLICT (org_id, title) DO UPDATE SET
                  updated_at = NOW(), status = EXCLUDED.status,
                  ep_relevant = EXCLUDED.ep_relevant, ep_relevance_score = EXCLUDED.ep_relevance_score, ep_matched_keywords = EXCLUDED.ep_matched_keywords,
                  alli_relevant = EXCLUDED.alli_relevant, alli_relevance_score = EXCLUDED.alli_relevance_score, alli_matched_keywords = EXCLUDED.alli_matched_keywords,
                  pmo_relevant = EXCLUDED.pmo_relevant, pmo_relevance_score = EXCLUDED.pmo_relevance_score, pmo_matched_keywords = EXCLUDED.pmo_matched_keywords
                RETURNING id
              `).then(r => { const aid = (r.rows[0] as any)?.id; if (aid) syncOrgScores(aid); }).catch(() => {});
            }
          } catch { /* non-blocking */ }
        }
        // Seed pinned EP framework opportunities
        for (const opp of EP_PINNED_OPPORTUNITIES) {
          await db.execute(sql`
            INSERT INTO saas_tenders (org_id, title, buyer, deadline, status, category, source_url, country, description, updated_at)
            VALUES (${orgId}, ${opp.title}, ${opp.buyer}, ${opp.deadline || null}, ${opp.status}, ${opp.category}, ${opp.source_url}, ${opp.country}, ${opp.description}, NOW())
            ON CONFLICT (org_id, title) DO UPDATE SET
              buyer = EXCLUDED.buyer,
              status = CASE WHEN saas_tenders.status IN ('Won','Lost','Cancelled','Withdrawn') THEN saas_tenders.status ELSE EXCLUDED.status END,
              source_url = EXCLUDED.source_url,
              updated_at = NOW()
          `).catch(() => {});
        }
      })();
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/ai-advisor", authenticateSaasUser, async (req: any, res) => {
    try {
      const { question, country } = req.body;
      const profile = await db.execute(sql`SELECT * FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`);
      const p = (profile.rows[0] || {}) as any;
      const entityHint = (country || "GB") === "NG"
        ? "Event Perfekt Management Services (Nigeria)"
        : "Event Perfekt Global Ltd (UK)";
      const companyContext = p.company_name
        ? `\n\nCompany context: ${p.company_name} — ${p.bio_summary || ""} | Sectors: ${p.sector_experience || ""} | Certifications: ${p.certifications || ""} | Entity: ${entityHint}`
        : `\n\nEntity: ${entityHint}`;
      const answer = await claudeAI(
        EP_AGENT_SYSTEM_PROMPT,
        question + companyContext,
        2500
      );
      res.json({ content: answer });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE PROTOCOLS
  // ═══════════════════════════════════════════════════════════════════════════

  // GET all 48 protocols merged with org-specific status
  app.get("/api/saas-tender/compliance/protocols", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT p.*, 
          COALESCE(oc.status, 'not_started') as org_status,
          oc.notes as org_notes,
          oc.evidence_url,
          oc.owner,
          oc.target_date,
          oc.completed_at,
          oc.id as org_compliance_id
        FROM saas_compliance_protocols p
        LEFT JOIN saas_org_compliance oc ON oc.protocol_id = p.id AND oc.org_id = ${req.saasUser.orgId}
        ORDER BY p.sort_order
      `);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // UPDATE org status for a specific protocol
  app.patch("/api/saas-tender/compliance/protocols/:protocolId", authenticateSaasUser, async (req: any, res) => {
    try {
      const { status, notes, evidence_url, owner, target_date } = req.body;
      const protocolId = parseInt(req.params.protocolId);
      const existing = await db.execute(sql`SELECT id FROM saas_org_compliance WHERE org_id = ${req.saasUser.orgId} AND protocol_id = ${protocolId}`);
      const completedAt = status === "compliant" ? "NOW()" : "NULL";
      if (existing.rows.length > 0) {
        await db.execute(sql.raw(`
          UPDATE saas_org_compliance SET 
            status = '${status || "not_started"}',
            notes = ${notes ? `'${String(notes).replace(/'/g, "''")}'` : "NULL"},
            evidence_url = ${evidence_url ? `'${String(evidence_url).replace(/'/g, "''")}'` : "NULL"},
            owner = ${owner ? `'${String(owner).replace(/'/g, "''")}'` : "NULL"},
            target_date = ${target_date ? `'${target_date}'` : "NULL"},
            completed_at = ${completedAt},
            updated_at = NOW()
          WHERE org_id = ${req.saasUser.orgId} AND protocol_id = ${protocolId}
        `));
      } else {
        await db.execute(sql.raw(`
          INSERT INTO saas_org_compliance (org_id, protocol_id, status, notes, evidence_url, owner, target_date, completed_at)
          VALUES (${req.saasUser.orgId}, ${protocolId}, '${status || "not_started"}',
            ${notes ? `'${String(notes).replace(/'/g, "''")}'` : "NULL"},
            ${evidence_url ? `'${String(evidence_url).replace(/'/g, "''")}'` : "NULL"},
            ${owner ? `'${String(owner).replace(/'/g, "''")}'` : "NULL"},
            ${target_date ? `'${target_date}'` : "NULL"},
            ${completedAt}
          )
        `));
      }
      const updated = await db.execute(sql`
        SELECT p.*, oc.status as org_status, oc.notes as org_notes, oc.evidence_url, oc.owner, oc.target_date, oc.completed_at, oc.id as org_compliance_id
        FROM saas_compliance_protocols p
        LEFT JOIN saas_org_compliance oc ON oc.protocol_id = p.id AND oc.org_id = ${req.saasUser.orgId}
        WHERE p.id = ${protocolId}
      `);
      res.json(updated.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // GET compliance summary stats
  app.get("/api/saas-tender/compliance/stats", authenticateSaasUser, async (req: any, res) => {
    try {
      const total = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM saas_compliance_protocols`);
      const byStatus = await db.execute(sql`
        SELECT COALESCE(oc.status, 'not_started') as status, COUNT(*)::int as count
        FROM saas_compliance_protocols p
        LEFT JOIN saas_org_compliance oc ON oc.protocol_id = p.id AND oc.org_id = ${req.saasUser.orgId}
        GROUP BY COALESCE(oc.status, 'not_started')
      `);
      const mandatory = await db.execute(sql`
        SELECT COUNT(*)::int as total,
          SUM(CASE WHEN COALESCE(oc.status,'not_started') = 'compliant' THEN 1 ELSE 0 END)::int as done
        FROM saas_compliance_protocols p
        LEFT JOIN saas_org_compliance oc ON oc.protocol_id = p.id AND oc.org_id = ${req.saasUser.orgId}
        WHERE p.badge_type = 'mandatory'
      `);
      res.json({
        total: (total.rows[0] as any).cnt,
        byStatus: byStatus.rows,
        mandatory: mandatory.rows[0],
      });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE DOCUMENT GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  // GET all compliance documents for org
  app.get("/api/saas-tender/compliance/documents", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT d.*, p.name as protocol_name, p.category as protocol_category
        FROM saas_compliance_documents d
        LEFT JOIN saas_compliance_protocols p ON p.id = d.protocol_id
        WHERE d.org_id = ${req.saasUser.orgId}
        ORDER BY d.updated_at DESC
      `);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // POST generate a compliance document using AI
  app.post("/api/saas-tender/compliance/documents/generate", authenticateSaasUser, async (req: any, res) => {
    try {
      const { protocol_id, document_name, document_type } = req.body;
      const profile = await db.execute(sql`SELECT * FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`);
      const p = (profile.rows[0] || {}) as any;
      let protocol: any = null;
      if (protocol_id) {
        const pResult = await db.execute(sql`SELECT * FROM saas_compliance_protocols WHERE id = ${protocol_id}`);
        protocol = pResult.rows[0] || null;
      }

      const docName = document_name || (protocol?.document_template || "Policy Document");
      const docType = document_type || "policy";

      const docPrompts: Record<string, string> = {
        "Anti-Bribery Policy": `Draft a comprehensive Anti-Bribery and Corruption Policy compliant with the UK Bribery Act 2010 for ${p.company_name}. Include: 1) Purpose and scope, 2) Our commitment, 3) What is bribery, 4) Prohibited conduct, 5) Gifts and hospitality, 6) Facilitation payments, 7) Political contributions, 8) Charitable donations, 9) Reporting concerns, 10) Training and communication, 11) Monitoring and review, 12) Consequences of breach. Make it professional, specific to an event management and consultancy company.`,
        "Conflict of Interest Declaration": `Draft a Conflict of Interest Policy and Declaration Form for ${p.company_name} in the context of UK government procurement. Include: 1) Purpose, 2) What constitutes a conflict of interest, 3) Declaration requirements (per-tender), 4) Examples of conflicts (personal relationships, financial interests, previous employment), 5) Management of declared conflicts, 6) A fillable declaration form section with fields for: tender name, declarant name, nature of any conflict, yes/no declaration, signature line. Format as a usable policy document.`,
        "GDPR Privacy Policy": `Draft a UK GDPR-compliant Privacy Policy for ${p.company_name}. Company address: ${p.company_address || "UK"}. Include: 1) Who we are, 2) Data we collect, 3) How we use your data, 4) Legal basis for processing, 5) Data sharing, 6) International transfers, 7) Data retention, 8) Your rights (access, deletion, portability, objection), 9) Cookies, 10) Contact details and DPO, 11) How to complain to ICO. Make it suitable for both a company website and government contract submissions.`,
        "Modern Slavery Statement": `Draft a Modern Slavery and Human Trafficking Statement for ${p.company_name} for financial year ${new Date().getFullYear()}. Include: 1) Organisation structure and supply chains, 2) Policies in relation to slavery and human trafficking, 3) Due diligence processes, 4) Risk assessment, 5) Key performance indicators, 6) Training on modern slavery, 7) Director sign-off statement. Make it compliant with Section 54 of the Modern Slavery Act 2015.`,
        "Quality Management Policy": `Draft a Quality Management Policy for ${p.company_name}, an event management and professional services company. Include: 1) Policy statement and purpose, 2) Scope, 3) Quality objectives, 4) Roles and responsibilities, 5) Customer focus, 6) Continual improvement, 7) Document control, 8) Training and competence, 9) Monitoring and measurement, 10) Review frequency and sign-off. Align with ISO 9001:2015 principles.`,
        "Health & Safety Policy": `Draft a Health & Safety Policy for ${p.company_name}. Include: 1) Statement of intent signed by director, 2) Organisation (who is responsible for what), 3) Arrangements (how we manage H&S): risk assessments, COSHH, fire safety, accident reporting, first aid, manual handling, DSE, contractor management, event-specific risks, 4) Review date. Make it suitable for an event management company working at venues and public events.`,
        "EDI Policy": `Draft a comprehensive Equality, Diversity and Inclusion Policy for ${p.company_name}. Include: 1) Policy statement, 2) Scope and application, 3) The nine protected characteristics, 4) Our commitments (recruitment, pay, promotion, training, working conditions), 5) Responsibilities (board, managers, employees), 6) Reporting discrimination, 7) Reasonable adjustments, 8) Monitoring and review, 9) Training, 10) Grievance and disciplinary implications. Make it compliant with the Equality Act 2010 and suitable for public sector contracts.`,
        "Environmental Policy": `Draft an Environmental Policy for ${p.company_name}, an event management company. Include: 1) Policy statement, 2) Scope, 3) Our environmental commitments (energy, waste, travel, supply chain, events), 4) Objectives and targets, 5) Legal compliance, 6) Roles and responsibilities, 7) Monitoring and reporting, 8) Review frequency. Reference ISO 14001 principles and alignment with the UK government's Net Zero ambitions.`,
        "Carbon Reduction Plan": `Draft a Carbon Reduction Plan for ${p.company_name} aligned with PPN 06/21 requirements. Include: 1) Commitment to net zero by 2050, 2) Current greenhouse gas emissions baseline (estimate for an event management SME), 3) Emission sources: Scope 1 (direct), Scope 2 (energy), Scope 3 (travel, supply chain), 4) Reduction targets and milestones (2025, 2030, 2040, 2050), 5) Measures already implemented, 6) Planned future measures, 7) Offsetting approach, 8) Reporting and review, 9) Director sign-off. Format it as a formal published document.`,
        "Social Value Statement": `Draft a Social Value Statement for ${p.company_name} aligned with the Government's Social Value Model (PPN 06/20). Cover all five themes: 1) COVID-19 recovery (economic recovery, jobs), 2) Tackling economic inequality (employment, supply chain diversity), 3) Fighting climate change (net zero, environmental initiatives), 4) Equal opportunity (reducing inequality, supporting under-represented groups), 5) Wellbeing (improving health, community engagement). For each theme: describe our approach, give specific examples and commitments, and state measurable outcomes. Make it compelling and specific to event management and professional services.`,
        "Business Continuity Plan": `Draft a Business Continuity and Disaster Recovery Plan for ${p.company_name}, an event management and consultancy company. Include: 1) Scope and objectives, 2) Business impact analysis (critical functions, RTOs), 3) Key risks and scenarios (cyber attack, key person loss, venue failure, data breach), 4) Response procedures for each scenario, 5) Communication tree, 6) IT recovery procedures, 7) Data backup and recovery, 8) Supplier and contract continuity, 9) Testing and review schedule, 10) Roles and responsibilities. Make it practical and specific.`,
        "Safeguarding Policy": `Draft a Safeguarding Policy for ${p.company_name}, covering events and services that may involve children and vulnerable adults. Include: 1) Policy statement, 2) Scope, 3) Definitions (child, vulnerable adult, abuse types), 4) Designated Safeguarding Lead (DSL) role, 5) Safer recruitment (DBS checks, references), 6) Recognising signs of abuse, 7) Reporting procedure (internal and to authorities), 8) Record keeping, 9) Training requirements, 10) Working with external organisations, 11) Review. Align with Working Together to Safeguard Children 2018 and Care Act 2014.`,
        "Anti-Fraud Policy": `Draft an Anti-Fraud and Corruption Policy for ${p.company_name}. Include: 1) Purpose and scope, 2) Definition of fraud and corruption, 3) Responsibilities, 4) Prevention measures (internal controls, segregation of duties), 5) Detection mechanisms, 6) Reporting procedure (including anonymous reporting), 7) Investigation process, 8) Disciplinary action, 9) Liaison with law enforcement, 10) Training and awareness, 11) Review. Make it suitable for government contract requirements.`,
        "Supplier Code of Conduct": `Draft a Supplier Code of Conduct for ${p.company_name}. Cover: 1) Introduction and purpose, 2) Legal compliance, 3) Anti-bribery and corruption, 4) Modern slavery and human trafficking, 5) Labour standards and working conditions, 6) Health and safety, 7) Environmental responsibility, 8) Data protection and confidentiality, 9) Conflicts of interest, 10) Reporting concerns and whistleblowing, 11) Consequences of non-compliance. Make it appropriate for a company bidding on UK government contracts.`,
      };

      const systemPrompt = `You are a compliance document specialist writing professional UK government procurement compliance documents for ${p.company_name || "the company"}. Write formal, structured documents with clear headings. Include all required sections. The document should be immediately usable - no placeholders except for specific dates or names that legitimately need completing. Sign-off section at the end with Version, Date, and Approved By fields.`;

      const userPrompt = docPrompts[docName] || `Draft a professional ${docName} for ${p.company_name}. This is for UK government contract compliance. Make it comprehensive, well-structured with numbered sections and headings, and immediately usable. Include policy statement, scope, responsibilities, procedures, and review information.`;

      const content = await claudeAI(systemPrompt, userPrompt, 3000);

      // Get next version number for this document type
      const versionResult = await db.execute(sql`
        SELECT COUNT(*)::int as cnt FROM saas_compliance_documents
        WHERE org_id = ${req.saasUser.orgId} AND document_name = ${docName}
      `);
      const versionNum = ((versionResult.rows[0] as any).cnt || 0) + 1;
      const version = `${versionNum}.0`;
      const today = new Date().toISOString().split("T")[0];
      const reviewDue = new Date();
      reviewDue.setFullYear(reviewDue.getFullYear() + 1);

      // Mark previous versions as superseded
      if (versionNum > 1) {
        await db.execute(sql`
          UPDATE saas_compliance_documents SET status = 'superseded'
          WHERE org_id = ${req.saasUser.orgId} AND document_name = ${docName} AND status != 'superseded'
        `);
      }

      const result = await db.execute(sql`
        INSERT INTO saas_compliance_documents (org_id, protocol_id, document_name, document_type, content, version, status, review_due, created_by)
        VALUES (${req.saasUser.orgId}, ${protocol_id || null}, ${docName}, ${docType}, ${content}, ${version}, 'draft', ${reviewDue.toISOString().split("T")[0]}, ${req.saasUser.email})
        RETURNING *
      `);

      res.json({ ...result.rows[0], generated: true });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // PATCH update document status or content
  app.patch("/api/saas-tender/compliance/documents/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const result = await db.execute(sql`
        UPDATE saas_compliance_documents SET
          content = COALESCE(${d.content}, content),
          status = COALESCE(${d.status}, status),
          approved_by = COALESCE(${d.approved_by}, approved_by),
          approved_at = CASE WHEN ${d.status} = 'approved' THEN NOW() ELSE approved_at END,
          updated_at = NOW()
        WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // DELETE a compliance document
  app.delete("/api/saas-tender/compliance/documents/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM saas_compliance_documents WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
      res.json({ message: "Deleted" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BID SECURITY - COI DECLARATIONS + VERSION LOG
  // ═══════════════════════════════════════════════════════════════════════════

  // GET all bid security records for org
  app.get("/api/saas-tender/bid-security", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id, record_type } = req.query;
      let query = `SELECT bs.*, t.title as tender_title FROM saas_bid_security bs LEFT JOIN saas_tenders t ON t.id = bs.tender_id WHERE bs.org_id = ${req.saasUser.orgId}`;
      if (tender_id) query += ` AND bs.tender_id = ${tender_id}`;
      if (record_type) query += ` AND bs.record_type = '${record_type}'`;
      query += " ORDER BY bs.created_at DESC";
      const result = await db.execute(sql.raw(query));
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // POST create bid security record (COI declaration or bid version)
  app.post("/api/saas-tender/bid-security", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const result = await db.execute(sql`
        INSERT INTO saas_bid_security (org_id, tender_id, record_type, title, content, declared_by, has_conflict, conflict_details, version_number, status)
        VALUES (${req.saasUser.orgId}, ${d.tender_id || null}, ${d.record_type}, ${d.title}, ${d.content || null}, ${d.declared_by || req.saasUser.email}, ${d.has_conflict || false}, ${d.conflict_details || null}, ${d.version_number || null}, ${d.status || 'active'})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // DELETE bid security record
  app.delete("/api/saas-tender/bid-security/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM saas_bid_security WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
      res.json({ message: "Deleted" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TWINPAY REMITTANCE FINDER — Find companies that send money to Africa
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/saas-tender/remittance-search", authenticateSaasUser, async (req: any, res) => {
    try {
      const { region = "All Africa", type = "all" } = req.body;
      const typeFilter = type === "all" ? "corporates, NGOs, government agencies, importers, churches, embassies, and diaspora employers" :
        type === "corporate" ? "corporate companies and multinational businesses" :
        type === "ngo" ? "NGOs, charities, and international development organisations" :
        type === "government" ? "government agencies, embassies, and public sector bodies" :
        type === "church" ? "churches, faith organisations, and religious bodies" : "all types of organisations";

      const rawJson = await claudeAI(
        `You are a TwinPaay business development specialist. Find organisations that actively send money to Africa (remittances, salaries, supplier payments, development grants, church tithes, or diaspora transfers) and would benefit from TwinPaay's cross-border payment services. Return ONLY valid JSON, no markdown.`,
        `Find 12 ${typeFilter} that regularly send money to ${region} and could benefit from TwinPaay's remittance services. Return as JSON: { "companies": [{ "name": "...", "type": "Corporate|NGO|Government|Church|Employer", "headquarters": "City, Country", "africa_operations": "Countries they operate in or send money to", "description": "Brief description", "why_twinpay": "One sentence on why TwinPaay would benefit them", "estimated_volume": "Estimated monthly transfer volume", "website": "website.com", "contact_name": "Name if known", "contact_title": "Title if known", "contact_email": "email if known" }] }`,
        3000
      );
      const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { companies: [] };
      res.json({ companies: data.companies || [] });
    } catch (error: any) {
      console.error("TwinPay search error:", error.message);
      res.status(500).json({ message: "Failed to search for companies" });
    }
  });

  app.post("/api/saas-tender/twinpay-email", authenticateSaasUser, async (req: any, res) => {
    try {
      const { company } = req.body;
      if (!company) return res.status(400).json({ message: "Company required" });

      const rawEmail = await claudeAI(
        `You are writing a professional, concise business development email on behalf of TwinPaay — a trusted cross-border payment and remittance service specialising in transfers to Africa. The email should feel warm, direct, and relevant to the specific recipient. Return ONLY valid JSON, no markdown.`,
        `Write a short, professional email introducing TwinPaay to this organisation:\n\nCompany: ${company.name}\nType: ${company.type}\nOperations: ${company.africa_operations}\nWhy TwinPaay: ${company.why_twinpay}\nContact: ${company.contact_name || "Decision-maker"} — ${company.contact_title || ""}\n\nWrite a compelling 3-paragraph introduction email. Return JSON: { "subject": "...", "body": "..." }`,
        1500
      );
      const emailMatch = rawEmail.match(/\{[\s\S]*\}/);
      const result = emailMatch ? JSON.parse(emailMatch[0]) : { subject: "Introduction", body: rawEmail };
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to generate email" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EP-POWERED CONTACT VERIFICATION — Find real decision-makers
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/saas-tender/contact-verify", authenticateSaasUser, async (req: any, res) => {
    try {
      const { company_name, website, context = "procurement" } = req.body;
      if (!company_name) return res.status(400).json({ message: "Company name is required" });

      const rawContact = await claudeAI(
        `You are an EP Agent Contact Intelligence specialist. Find the REAL decision-maker for procurement, tendering, and contract management at the specified company. Return ONLY valid JSON, no markdown.`,
        `Find the best contact person for:\nCompany: ${company_name}\nWebsite: ${website || "unknown"}\nContext: ${context}\n\nReturn JSON: { "contact_name": "Full Name", "contact_title": "Job Title", "contact_email": "email@domain.com", "linkedin_url": "https://linkedin.com/in/...", "confidence": "high|medium|low", "confidence_reason": "Why you are confident in this", "alternative_contacts": [{ "name": "...", "title": "...", "email": "..." }], "notes": "Useful context about reaching this person" }`,
        1500
      );
      const contactMatch = rawContact.match(/\{[\s\S]*\}/);
      const result = contactMatch ? JSON.parse(contactMatch[0]) : { contact_name: "Unknown", confidence: "low", notes: rawContact };
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to verify contact" });
    }
  });

  // Proposal endpoints (POST/GET/GET :id/PUT :id/GET share/:token) → moved to ./routes/bid-writing.ts

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE ALL 16 SECTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const ALL_16_SECTIONS = [
    { key: "executive_summary", label: "Executive Summary" },
    { key: "company_overview", label: "Company Overview" },
    { key: "methodology", label: "Methodology" },
    { key: "team_experience", label: "Team and Experience" },
    { key: "social_value", label: "Social Value including Environmental Impact" },
    { key: "risk_management", label: "Risk Management" },
    { key: "timeline", label: "Timeline and Implementation" },
    { key: "quality_assurance", label: "Quality Assurance" },
    { key: "innovation", label: "Innovation" },
    { key: "sustainability", label: "Sustainability" },
    { key: "cost_analysis", label: "Cost Analysis" },
    { key: "references", label: "References" },
    { key: "compliance_statement", label: "Compliance Statement" },
    { key: "appendices", label: "Appendices" },
    { key: "cover_letter", label: "Cover Letter" },
    { key: "scoring_criteria_response", label: "Scoring Criteria Response" },
  ];

  // Formatting + guideline-adherence rules appended to every bid-section prompt so
  // the draft reads the way the buyer asked and is easy to evaluate. The extracted
  // ITT/RFI/brief facts (word limits, submission format, scoring weights, questions)
  // are injected above via the tender pack context — these rules tell the writer to
  // OBEY them.
  const BID_FORMATTING_GUIDANCE = [
    "── FORMATTING & GUIDELINE ADHERENCE (follow exactly) ──",
    "1. Obey the tender's own instructions above: answer the stated question(s), in the order asked, against the scoring criteria/weighting. If the ITT/RFI/brief specifies anything (structure, headings, response format), follow it.",
    "2. Word limit: if a word/character/page limit is given for this section, stay within it (aim for 90–100% of the limit — never exceed). End the response with a line `Word count: <n>` (and `(limit <m>)` when a limit is known).",
    "3. Structure for readability and assessor scan-ability: open with a one-line summary, then use clear sub-headings (Markdown `##`/`###`), short paragraphs (2–4 sentences) with white space between them, and bullet points for lists, commitments, evidence and metrics.",
    "4. Be concrete and quantified — name people, contracts, numbers, dates; cite per the rules above. No filler, no repetition.",
  ].join("\n");

  // ── Shared full-ITT writer ───────────────────────────────────────────────
  // Generates ALL 16 bid sections for a tender, grounded in the playbook
  // (EP_AGENT_SYSTEM_PROMPT + citations), the company profile, the learning vault,
  // and the tender's own extracted facts. Used by BOTH the one-click "generate-all"
  // endpoint (Elizabeth / "Auto-Draft Full ITT" button) and the auto-draft-on-
  // qualify discovery path, so a tender that fits the criteria gets the SAME
  // complete ITT whether a human clicks the button or discovery drafts it itself.
  // `governanceStatus` records provenance: 'auto_drafted' for unattended drafts,
  // 'not_submitted' for human-initiated ones.
  async function generateFullBid(
    orgId: number | string,
    t: any,
    governanceStatus: "not_submitted" | "auto_drafted" = "not_submitted",
  ): Promise<any[]> {
    const profile = await db.execute(sql`SELECT * FROM saas_company_profile WHERE org_id = ${orgId}`).catch(() => ({ rows: [] as any[] }));
    const p = (profile.rows[0] || {}) as any;
    // E5: sort by severity × recency so high-severity lessons surface first
    const vaultLessons = await db.execute(sql`
      SELECT lessons, tender_name, outcome, section_type, severity
      FROM saas_learning_vault
      WHERE org_id = ${orgId} AND lessons IS NOT NULL AND lessons != ''
      ORDER BY
        (CASE WHEN severity = 'high' THEN 3.0 WHEN severity = 'medium' THEN 2.0 ELSE 1.0 END)
        / GREATEST(1, EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)
        DESC,
        created_at DESC
      LIMIT 15
    `).catch(() => ({ rows: [] as any[] }));
    const lessonsContext = (vaultLessons.rows as any[]).map((l: any) =>
      `[${l.tender_name}${l.outcome ? ` — ${l.outcome}` : ""}${l.section_type ? ` | ${l.section_type}` : ""}${l.severity === "high" ? " ⚠️ HIGH" : ""}]: ${l.lessons}`
    ).join("\n\n");
    const entity = (t.country || "GB") as "GB" | "NG";
    const entityHint = entity === "NG" ? "Event Perfekt Management Services (Nigeria)" : "Event Perfekt Global Ltd (UK)";

    const tenderPackCtx = await buildExtractedFactsContext(t.id, orgId);
    const results: any[] = [];
    for (const section of ALL_16_SECTIONS) {
      try {
        const content = await claudeAI(
          EP_AGENT_SYSTEM_PROMPT + CITATION_PROMPT_ADDON,
          `Write the "${section.label}" section for this tender. Entity: ${entityHint}\n\nTender: ${t.title}\nBuyer: ${t.buyer}\nCategory: ${t.category || "Not specified"}\nValue: ${t.value_text || "Not specified"}\nDeadline: ${t.deadline}\nScoring: ${t.scoring_criteria || "Not specified"}\nWord Limits: ${t.word_limits || "Not specified"}\nQuestions: ${t.tender_questions || "None"}\n\nCompany: ${p.company_name || entityHint}\nExperience: ${p.sector_experience || ""}\nCertifications: ${p.certifications || ""}\n\nLearning Vault Lessons:\n${lessonsContext || "None yet"}${tenderPackCtx}\n${BID_FORMATTING_GUIDANCE}`,
          2000
        );
        const wordCount = content.split(/\s+/).length;
        const sectionCitationsJson = JSON.stringify(parseCitations(content));
        const existing = await db.execute(sql`SELECT id FROM saas_tender_bid_sections WHERE tender_id = ${t.id} AND section_key = ${section.key} AND org_id = ${orgId}`);
        let saved;
        if (existing.rows.length > 0) {
          const upd = await db.execute(sql`UPDATE saas_tender_bid_sections SET content = ${content}, word_count = ${wordCount}, citations = ${sectionCitationsJson}::jsonb, version = version + 1, governance_status = ${governanceStatus}, updated_at = NOW() WHERE id = ${(existing.rows[0] as any).id} RETURNING *`);
          saved = upd.rows[0];
        } else {
          const ins = await db.execute(sql`INSERT INTO saas_tender_bid_sections (org_id, tender_id, section_key, section_label, content, word_count, sort_order, entity, governance_status, citations) VALUES (${orgId}, ${t.id}, ${section.key}, ${section.label}, ${content}, ${wordCount}, ${ALL_16_SECTIONS.indexOf(section) + 1}, ${entity}, ${governanceStatus}, ${sectionCitationsJson}::jsonb) RETURNING *`);
          saved = ins.rows[0];
        }
        results.push(saved);
      } catch (sErr: any) {
        results.push({ section_key: section.key, section_label: section.label, error: sErr.message });
      }
    }
    return results;
  }

  app.post("/api/saas-tender/bid-sections/generate-all", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id } = req.body;
      const tender = await db.execute(sql`SELECT * FROM saas_tenders WHERE id = ${tender_id} AND org_id = ${req.saasUser.orgId}`);
      if (tender.rows.length === 0) return res.status(404).json({ message: "Tender not found" });
      const results = await generateFullBid(req.saasUser.orgId, tender.rows[0], "not_submitted");
      const ok = results.filter(r => !r.error).length;
      return res.json({ message: `Generated ${ok} of ${results.length} sections`, sections: results });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ── Stage 4: Bid / No-Bid engine ──────────────────────────────────────────
  // Runs the EP_BID_NO_BID qualifier against the Targeting Spec + Playbook evidence
  // + the tender's extracted facts, returning BID / BID_WITH_CONDITIONS / NO_BID
  // with a win-probability band, evidence-fit, warning flags and conditions to close.
  // Persisted on the tender so the dashboard can show the recommendation.
  app.post("/api/saas-tender/bid-no-bid/:tenderId", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tenderId } = req.params;
      const tRes = await db.execute(sql`SELECT * FROM saas_tenders WHERE id = ${tenderId} AND org_id = ${req.saasUser.orgId}`);
      if (!tRes.rows.length) return res.status(404).json({ message: "Tender not found" });
      const t = tRes.rows[0] as any;
      const factsCtx = await buildExtractedFactsContext(tenderId, req.saasUser.orgId);
      const system = `${withConstitution(EP_BID_NO_BID)}\n\n═══ TARGETING SPEC ═══\n${EP_TARGETING_SPEC}\n\n═══ PLAYBOOK EVIDENCE (the ONLY source of truth) ═══\n${EP_PLAYBOOK_CORE}`;
      const user = `Decide bid/no-bid for this tender.\n\nTitle: ${t.title}\nBuyer: ${t.buyer || ""}\nDeadline: ${t.deadline || "unknown"}\nValue: ${t.value_text || t.value_amount || "unknown"}\nCategory: ${t.category || ""}\nCPV: ${t.cpv_codes || ""}\nLane scores: ${JSON.stringify(t.lane_scores || {})}\nDescription: ${(t.description || "").slice(0, 1500)}\nScoring criteria: ${t.scoring_criteria || "Not specified"}${factsCtx}`;
      const raw = await claudeAI(system, user, 1300);
      const parsed = parseJsonLoose(raw) || { recommendation: "UNKNOWN", reasons: ["Could not parse qualifier output"], raw };
      await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS bid_decision TEXT`).catch(() => {});
      await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS win_band TEXT`).catch(() => {});
      await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS bid_decision_json JSONB`).catch(() => {});
      await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS bid_decided_at TIMESTAMP`).catch(() => {});
      await db.execute(sql`
        UPDATE saas_tenders SET bid_decision = ${parsed.recommendation || null}, win_band = ${parsed.win_probability_band || null},
          bid_decision_json = ${JSON.stringify(parsed)}::jsonb, bid_decided_at = NOW()
        WHERE id = ${tenderId} AND org_id = ${req.saasUser.orgId}
      `).catch(() => {});
      return res.json(parsed);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ── Stage 6: Pre-submission Integrity Checker ─────────────────────────────
  // Audits the tender's drafted sections against the Playbook before a bid can be
  // marked "ready": sourcing, no-fabrication, held-vs-in-progress certs, company-vs-
  // personal credentials, locality, completeness. Returns READY / NOT_READY + flags.
  // This is the mandatory safety net before human submission — nothing auto-submits.
  app.post("/api/saas-tender/integrity-check/:tenderId", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tenderId } = req.params;
      const tRes = await db.execute(sql`SELECT * FROM saas_tenders WHERE id = ${tenderId} AND org_id = ${req.saasUser.orgId}`);
      if (!tRes.rows.length) return res.status(404).json({ message: "Tender not found" });
      const t = tRes.rows[0] as any;
      const secs = await db.execute(sql`SELECT section_label, content FROM saas_tender_bid_sections WHERE tender_id = ${tenderId} AND org_id = ${req.saasUser.orgId} AND content IS NOT NULL AND content != '' ORDER BY sort_order NULLS LAST, id`);
      if (!secs.rows.length) return res.status(400).json({ message: "No drafted sections to check — draft the bid first" });
      const draft = (secs.rows as any[]).map(s => `## ${s.section_label}\n${s.content}`).join("\n\n").slice(0, 40000);
      const factsCtx = await buildExtractedFactsContext(tenderId, req.saasUser.orgId);
      const system = `${withConstitution(EP_INTEGRITY_CHECKER)}\n\n═══ PLAYBOOK FACTS (the ONLY source of truth) ═══\n${EP_PLAYBOOK_CORE}`;
      const user = `Audit this drafted bid for "${t.title}" (${t.buyer || ""}).\n\nDRAFTED BID:\n${draft}\n\nTENDER FACTS:${factsCtx}`;
      const raw = await claudeAI(system, user, 1600);
      const parsed = parseJsonLoose(raw) || { overall: "NOT_READY", flags: [{ check: "parse", issue: "Could not parse integrity output", fix: "Re-run the check" }], open_gaps: [] };
      await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS integrity_status TEXT`).catch(() => {});
      await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS integrity_json JSONB`).catch(() => {});
      await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS integrity_checked_at TIMESTAMP`).catch(() => {});
      await db.execute(sql`
        UPDATE saas_tenders SET integrity_status = ${parsed.overall || "NOT_READY"},
          integrity_json = ${JSON.stringify(parsed)}::jsonb, integrity_checked_at = NOW()
        WHERE id = ${tenderId} AND org_id = ${req.saasUser.orgId}
      `).catch(() => {});
      return res.json(parsed);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ── Buyer due diligence — deep dive on the BUYER for a tender ──────────────
  // "Know the buyer" (Playbook §11B): pulls the buyer's REAL recent procurement
  // history from Contracts Finder (their past contracts incl. events, the incumbents
  // who keep winning, categories, typical value, contracts up for renewal), and adds
  // a grounded AI brief on who they are and how EP should position — with [GAP: …]
  // for anything not evidenced. Plus live research links (their past-event images,
  // news/feedback, their notice pages) to inform the bid. Never invents facts.
  app.get("/api/saas-tender/buyer-due-diligence/:tenderId", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tenderId } = req.params;
      const tRes = await db.execute(sql`SELECT * FROM saas_tenders WHERE id = ${tenderId} AND org_id = ${req.saasUser.orgId}`);
      if (!tRes.rows.length) return res.status(404).json({ message: "Tender not found" });
      const t = tRes.rows[0] as any;
      const buyer = (t.buyer || "").trim();
      if (!buyer || buyer === "Not specified") return res.json({ buyer: t.buyer || null, history: [], stats: null, brief: null, links: buyerResearchLinks(buyer) });

      // Real procurement history (last 2 years of awards) from Contracts Finder.
      const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      let contracts: any[] = [];
      try {
        const cfg = (await db.execute(sql`SELECT keywords, categories FROM saas_search_config WHERE org_id = ${req.saasUser.orgId}`)).rows[0] as any;
        const result = await searchTenders(
          { buyer_name: buyer, statuses: ["awarded"], published_from: twoYearsAgo.toISOString().split("T")[0], source: "cf", sort: "newest", page_size: 50 } as FinderFilters,
          { keywords: cfg?.keywords || [], categories: cfg?.categories || [] } as MatchContext,
        );
        contracts = result.results || [];
      } catch (e: any) { console.warn("[BuyerDD] history fetch failed:", e.message); }

      const winners: Record<string, number> = {}; const cats: Record<string, number> = {};
      let totalValue = 0, valueCount = 0; const renewals: any[] = []; const now = Date.now();
      for (const c of contracts) {
        if (c.winner) winners[c.winner] = (winners[c.winner] || 0) + 1;
        if (c.category) cats[c.category] = (cats[c.category] || 0) + 1;
        if (c.award_value) { totalValue += c.award_value; valueCount++; }
        if (c.deadline) { const months = (new Date(c.deadline).getTime() - now) / (1000 * 60 * 60 * 24 * 30); if (months > 0 && months <= 12) renewals.push(c); }
      }
      const stats = {
        total: contracts.length,
        average_value: valueCount ? Math.round(totalValue / valueCount) : null,
        top_winners: Object.entries(winners).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
        top_categories: Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
      };

      // Grounded AI buyer brief (uses only the real history + tender + playbook).
      const histText = contracts.slice(0, 25).map((c: any) => `- ${c.title}${c.winner ? ` → won by ${c.winner}` : ""}${c.award_value ? ` (£${c.award_value})` : ""}${c.category ? ` [${c.category}]` : ""}`).join("\n") || "(no Contracts Finder award history found)";
      const system = `${withConstitution("ROLE: Buyer due-diligence analyst for a bid team. Brief the team on this PUBLIC-SECTOR BUYER so they can write a buyer-aware bid. Ground every claim in the procurement history and tender provided; for anything not evidenced, write \"[GAP: ...]\" — never invent priorities, names or figures.")}\n\n═══ EP CONTEXT (who we are, for positioning) ═══\n${EP_PLAYBOOK_CORE}`;
      const user = `BUYER: ${buyer}\nTHIS TENDER: ${t.title} — deadline ${t.deadline || "?"}, value ${t.value_text || t.value_amount || "?"}, category ${t.category || "?"}\n\nTHEIR RECENT AWARDED CONTRACTS (Contracts Finder, last 2y):\n${histText}\n\nReturn ONLY JSON:\n{\n  "who_they_are": "",\n  "remit_and_priorities": ["" ],\n  "what_they_value_in_bids": ["" ],\n  "incumbent_landscape": "",\n  "past_events_signal": "what their history shows about the events/engagement work they buy",\n  "positioning_for_ep": ["" ],\n  "watch_outs": ["" ],\n  "gaps": ["" ]\n}`;
      let brief: any = null;
      try { brief = parseJsonLoose(await claudeAI(system, user, 1100)); } catch (e: any) { console.warn("[BuyerDD] brief failed:", e.message); }

      // Optional embedded images of the buyer's past events (key-gated; [] if off).
      const images = await fetchBuyerEventImages(buyer);

      return res.json({ buyer, tender_title: t.title, history: contracts.slice(0, 25), stats, renewals: renewals.slice(0, 6), brief, images, links: buyerResearchLinks(buyer) });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ── Elizabeth — conversational assistant ──────────────────────────────────
  // A real back-and-forth chat. Grounded in EP's playbook + the org's live
  // tenders, optionally focused on one tender/buyer. When the user asks to search
  // or "find more", she runs a live Contracts Finder search and discusses the
  // results. Human-in-the-loop: she advises and drafts, never submits.
  app.post("/api/saas-tender/elizabeth/chat", authenticateSaasUser, async (req: any, res) => {
    try {
      const orgId = req.saasUser.orgId;
      const history: { role: string; content: string }[] = Array.isArray(req.body?.messages) ? req.body.messages.slice(-12) : [];
      const tenderId = req.body?.tender_id;
      const last = [...history].reverse().find(m => m.role === "user")?.content || "";
      if (!last.trim()) return res.status(400).json({ message: "Empty message" });

      // Grounding: the org's live tenders (so she can prioritise / compare).
      const liveT = await db.execute(sql`
        SELECT title, buyer, deadline, status, lane_scores FROM saas_tenders
        WHERE org_id = ${orgId} AND deadline IS NOT NULL AND deadline <> '' AND deadline::date >= CURRENT_DATE
          AND LOWER(status) NOT IN ('won','lost','closed','expired','awarded','cancelled','withdrawn','submitted')
        ORDER BY deadline ASC LIMIT 15
      `).catch(() => ({ rows: [] as any[] }));
      const liveList = (liveT.rows as any[]).map(r => `- ${r.title} — ${r.buyer || "?"} (deadline ${r.deadline}, status ${r.status})`).join("\n") || "(no live tenders in the pipeline right now)";

      let focusCtx = "";
      if (tenderId) {
        const tr = await db.execute(sql`SELECT * FROM saas_tenders WHERE id = ${tenderId} AND org_id = ${orgId}`).catch(() => ({ rows: [] as any[] }));
        if (tr.rows.length) {
          const t = tr.rows[0] as any;
          const facts = await buildExtractedFactsContext(tenderId, orgId);
          focusCtx = `\n\nFOCUSED TENDER: ${t.title} — buyer ${t.buyer}, deadline ${t.deadline}, value ${t.value_text || t.value_amount || "?"}, status ${t.status}.${t.bid_decision ? ` Bid decision: ${t.bid_decision} (${t.win_band || "?"}%).` : ""}${facts}`;
        }
      }

      // "Find more" intent → live Contracts Finder search, woven into context.
      let searchResults: any[] = [];
      if (/\b(search|find( me)?|look for|any (new )?(tenders|opportunit)|more (tenders|like)|similar)\b/i.test(last)) {
        const query = last.replace(/\b(search|find me|find|look for|please|can you|any|new|tenders|opportunities|similar|more|like this|for)\b/gi, " ").replace(/\s+/g, " ").trim() || "event management";
        searchResults = await liveContractsFinderSearch(query, 8);
      }
      const searchCtx = searchResults.length
        ? `\n\nLIVE CONTRACTS FINDER RESULTS (you just searched "${searchResults.length} found"): \n${searchResults.map(r => `- ${r.title} — ${r.buyer} (deadline ${r.deadline}) ${r.url}`).join("\n")}\nPresent the most relevant of these to the user and offer to add them.`
        : "";

      const system = `You are Elizabeth, EventPerfekt's tender & bid strategist — warm, sharp, and genuinely conversational, like a trusted colleague. You help the team source, qualify, research buyers, and draft winning bids. Talk naturally; be concise but real; ask a clarifying question when it helps. Use the Targeting Spec to judge fit and the Playbook as the ONLY source of truth about EventPerfekt — never invent a client, number or credential; flag gaps as [GAP: ...]. You advise and draft; a human always reviews and submits.

═══ EP PLAYBOOK (only source of truth about us) ═══
${EP_PLAYBOOK_CORE}

═══ LIVE PIPELINE (this org's current live tenders) ═══
${liveList}${focusCtx}${searchCtx}`;

      const messages = [{ role: "system", content: system }, ...history.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "") }))];
      const reply = await claudeChat(messages, 1100);
      return res.json({ reply: reply || "I couldn't generate a reply just now — try again in a moment.", searched: searchResults.length > 0, results: searchResults });
    } catch (error: any) {
      if (error?.status === 402) return res.status(402).json({ message: error.message });
      return res.status(500).json({ message: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E5: LEARNING LOOP
  // Save a lesson from a low-confidence bid section into saas_learning_vault.
  // The section's overall_confidence drives the severity level.
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/saas-tender/learning-vault/lesson", authenticateSaasUser, async (req: any, res) => {
    try {
      const { lesson_text, tender_id, section_id, section_type, overall_confidence } = req.body;
      if (!lesson_text?.trim()) return res.status(400).json({ message: "lesson_text required" });

      // Derive severity from confidence score (mirror E2 traffic light)
      const severity = (overall_confidence || 0) <= 40 ? "high" : (overall_confidence || 0) <= 70 ? "medium" : "low";

      // Fetch tender name for the vault entry
      let tender_name = "From bid section";
      let buyer = "";
      if (tender_id) {
        const tRes = await db.execute(sql`SELECT title, buyer FROM saas_tenders WHERE id = ${tender_id} AND org_id = ${req.saasUser.orgId}`).catch(() => ({ rows: [] }));
        if (tRes.rows.length) { tender_name = (tRes.rows[0] as any).title || tender_name; buyer = (tRes.rows[0] as any).buyer || ""; }
      }

      const row = await db.execute(sql`
        INSERT INTO saas_learning_vault
          (org_id, tender_name, buyer, lessons, tender_id, section_id, section_type, severity, outcome, created_at, updated_at)
        VALUES
          (${req.saasUser.orgId}, ${tender_name}, ${buyer}, ${lesson_text.trim()}, ${tender_id || null}, ${section_id || null}, ${section_type || null}, ${severity}, 'lesson', NOW(), NOW())
        RETURNING *
      `);
      return res.json(row.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/learning-vault/lessons", authenticateSaasUser, async (req: any, res) => {
    try {
      const { section_type } = req.query;
      let result;
      if (section_type && section_type !== "all") {
        result = await db.execute(sql`
          SELECT * FROM saas_learning_vault
          WHERE org_id = ${req.saasUser.orgId} AND section_type = ${section_type}
          ORDER BY CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC
        `);
      } else {
        result = await db.execute(sql`
          SELECT * FROM saas_learning_vault
          WHERE org_id = ${req.saasUser.orgId} AND section_type IS NOT NULL
          ORDER BY CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC
        `);
      }
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/saas-tender/learning-vault/lessons/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      const { lessons } = req.body;
      const result = await db.execute(sql`
        UPDATE saas_learning_vault SET lessons = ${lessons}, updated_at = NOW()
        WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/saas-tender/learning-vault/lessons/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM saas_learning_vault WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
      res.json({ message: "Deleted" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E2: CONFIDENCE SCORING
  // Second AI pass: score coverage, evidence density, and voice alignment then
  // store the four numeric scores + an array of weak points on the bid section.
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/saas-tender/bid-sections/:id/score-confidence", authenticateSaasUser, async (req: any, res) => {
    try {
      const secRes = await db.execute(sql`
        SELECT s.*, t.title as tender_title, t.buyer, t.scoring_criteria, t.word_limits
        FROM saas_tender_bid_sections s
        LEFT JOIN saas_tenders t ON t.id = s.tender_id
        WHERE s.id = ${req.params.id} AND s.org_id = ${req.saasUser.orgId}
      `);
      if (!secRes.rows.length) return res.status(404).json({ message: "Section not found" });
      const sec = secRes.rows[0] as any;
      if (!sec.content || sec.content.length < 50) return res.status(400).json({ message: "Section content too short to score" });

      const scoringPrompt = `You are a bid quality assessor. Score the following bid section strictly and return ONLY valid JSON — no markdown, no explanation.

TENDER: ${sec.tender_title || "Unknown"}
BUYER: ${sec.buyer || "Unknown"}
SECTION: ${sec.section_label}
SCORING CRITERIA: ${sec.scoring_criteria || "Not specified"}
WORD LIMITS: ${sec.word_limits || "Not specified"}

SECTION CONTENT:
${sec.content.substring(0, 3000)}

Return JSON with this exact shape:
{
  "coverage_score": <0-100 int, how well does the content address all aspects of the section requirement>,
  "evidence_score": <0-100 int, how much specific, quantified evidence is cited — numbers, case studies, certifications>,
  "voice_score": <0-100 int, how buyer-centric, specific, and professionally written the section is>,
  "overall_confidence": <0-100 int, weighted average — coverage 40%, evidence 40%, voice 20%>,
  "weak_points": [<up to 5 short strings, each a specific improvement action>]
}`;

      const raw = await claudeAI("You are a strict JSON-only bid quality assessor. Return only valid JSON.", scoringPrompt, 800);
      let scores: any;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        scores = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        return res.status(422).json({ message: "AI returned invalid JSON", raw });
      }

      const weakPointsArr = Array.isArray(scores.weak_points) ? scores.weak_points : [];
      const weakPointsJson = JSON.stringify(weakPointsArr);
      await db.execute(sql`
        UPDATE saas_tender_bid_sections
        SET coverage_score   = ${Math.min(100, Math.max(0, scores.coverage_score || 0))},
            evidence_score   = ${Math.min(100, Math.max(0, scores.evidence_score || 0))},
            voice_score      = ${Math.min(100, Math.max(0, scores.voice_score || 0))},
            overall_confidence = ${Math.min(100, Math.max(0, scores.overall_confidence || 0))},
            weak_points      = ${weakPointsJson}::jsonb::text[],
            last_scored_at   = NOW()
        WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}
      `);
      return res.json({ coverage_score: scores.coverage_score, evidence_score: scores.evidence_score, voice_score: scores.voice_score, overall_confidence: scores.overall_confidence, weak_points: weakPointsArr });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E3: GAP ANALYSIS
  // After all 16 sections are generated, compare them against the ITT/tender
  // requirements and surface gaps as bid_gaps rows.
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/saas-tender/gaps/analyze", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id } = req.body;
      if (!tender_id) return res.status(400).json({ message: "tender_id required" });

      const tenderRes = await db.execute(sql`SELECT * FROM saas_tenders WHERE id = ${tender_id} AND org_id = ${req.saasUser.orgId}`);
      if (!tenderRes.rows.length) return res.status(404).json({ message: "Tender not found" });
      const t = tenderRes.rows[0] as any;

      const sectionsRes = await db.execute(sql`
        SELECT section_label, content, coverage_score FROM saas_tender_bid_sections
        WHERE tender_id = ${tender_id} AND org_id = ${req.saasUser.orgId}
        ORDER BY sort_order
      `);
      const sectionSummary = (sectionsRes.rows as any[]).map(s => `${s.section_label} (coverage: ${s.coverage_score || 0}%): ${(s.content || "").substring(0, 200)}...`).join("\n\n");

      const tenderPackCtx = await buildExtractedFactsContext(tender_id, req.saasUser.orgId);

      const gapPrompt = `You are a senior bid analyst. Analyse the bid sections below against the tender requirements and identify GAPS — requirements mentioned in the tender that are NOT adequately addressed. Return ONLY valid JSON array, no markdown.

TENDER: ${t.title}
BUYER: ${t.buyer}
CATEGORY: ${t.category}
SCORING CRITERIA: ${t.scoring_criteria || "Not specified"}
TENDER QUESTIONS: ${t.tender_questions || "Not specified"}
${tenderPackCtx}

BID SECTIONS ALREADY WRITTEN:
${sectionSummary || "No sections yet"}

Return a JSON array of gap objects (up to 8):
[
  {
    "requirement": "<specific requirement or question not addressed>",
    "severity": "high|medium|low",
    "suggestion": "<1-2 sentence specific recommendation for how to address this gap>"
  }
]`;

      const raw = await claudeAI("You are a strict JSON-only bid analyst. Return only a valid JSON array.", gapPrompt, 1200);
      let gaps: any[] = [];
      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        gaps = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        if (!Array.isArray(gaps)) gaps = [];
      } catch { gaps = []; }

      await db.execute(sql`DELETE FROM bid_gaps WHERE tender_id = ${tender_id} AND org_id = ${req.saasUser.orgId}`);
      const inserted = [];
      for (const g of gaps.slice(0, 8)) {
        const row = await db.execute(sql`
          INSERT INTO bid_gaps (tender_id, org_id, requirement, severity, suggestion, status)
          VALUES (${tender_id}, ${req.saasUser.orgId}, ${g.requirement || ""}, ${g.severity || "medium"}, ${g.suggestion || ""}, 'open')
          RETURNING *
        `);
        inserted.push(row.rows[0]);
      }
      return res.json({ gaps: inserted, count: inserted.length });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/gaps/:tenderId", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM bid_gaps
        WHERE tender_id = ${req.params.tenderId} AND org_id = ${req.saasUser.orgId}
        ORDER BY CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at
      `);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/saas-tender/gaps/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      const { status } = req.body;
      const result = await db.execute(sql`
        UPDATE bid_gaps SET status = ${status} WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId} RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E4: EVIDENCE PICKER
  // Scan the bid vault for documents relevant to a given bid section and
  // suggest the top matches; allow users to attach vault docs to sections.
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/saas-tender/bid-sections/:id/evidence-suggestions", authenticateSaasUser, async (req: any, res) => {
    try {
      const secRes = await db.execute(sql`SELECT * FROM saas_tender_bid_sections WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
      if (!secRes.rows.length) return res.status(404).json({ message: "Section not found" });
      const sec = secRes.rows[0] as any;

      const vaultFiles = await db.execute(sql`
        SELECT f.id, f.file_name, f.original_name, f.extracted_text, fold.name as folder_name
        FROM saas_bid_vault_files f
        LEFT JOIN saas_bid_vault_folders fold ON fold.id = f.folder_id
        WHERE f.org_id = ${req.saasUser.orgId}
        ORDER BY f.created_at DESC
        LIMIT 40
      `);
      if (!vaultFiles.rows.length) return res.json({ suggestions: [] });

      const vaultSummary = (vaultFiles.rows as any[]).map(f =>
        `ID:${f.id} | "${f.original_name || f.file_name}" (${f.folder_name || "Vault"}) | Preview: ${(f.extracted_text || "").substring(0, 150)}`
      ).join("\n");

      const suggestPrompt = `You are a bid librarian. Match vault documents to the bid section below and return the IDs of the TOP 5 most relevant ones. Return ONLY a valid JSON array of integer IDs, e.g. [12, 7, 3]. No markdown.

BID SECTION: ${sec.section_label}
SECTION CONTENT PREVIEW: ${(sec.content || "").substring(0, 400)}

VAULT DOCUMENTS:
${vaultSummary}`;

      const raw = await claudeAI("You are a strict JSON-only bid librarian. Return only a valid JSON integer array.", suggestPrompt, 200);
      let suggestedIds: number[] = [];
      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        suggestedIds = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        if (!Array.isArray(suggestedIds)) suggestedIds = [];
      } catch { suggestedIds = []; }

      const suggested = (vaultFiles.rows as any[]).filter(f => suggestedIds.includes(Number(f.id)));

      const alreadyAttached = await db.execute(sql`
        SELECT vault_doc_id FROM bid_section_evidence WHERE section_id = ${req.params.id}
      `);
      const attachedIds = (alreadyAttached.rows as any[]).map(r => r.vault_doc_id);

      return res.json({
        suggestions: suggested.map(f => ({ ...f, already_attached: attachedIds.includes(f.id) })),
        all_vault: (vaultFiles.rows as any[]).map(f => ({ ...f, already_attached: attachedIds.includes(f.id) }))
      });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // GET /bid-sections/:id/evidence → moved to ./routes/bid-writing.ts
  // POST /bid-sections/:id/attach-evidence → moved to ./routes/bid-writing.ts
  // DELETE /bid-sections/:sectionId/evidence/:evidenceId → moved to ./routes/bid-writing.ts

  // ═══════════════════════════════════════════════════════════════════════════
  // BID GOVERNANCE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/saas-tender/governance", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT s.*, t.title as tender_title, t.buyer, t.deadline, t.country
        FROM saas_tender_bid_sections s
        LEFT JOIN saas_tenders t ON t.id = s.tender_id
        WHERE s.org_id = ${req.saasUser.orgId}
        AND s.governance_status != 'not_submitted'
        ORDER BY s.updated_at DESC
      `);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/governance/all", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT s.*, t.title as tender_title, t.buyer, t.deadline, t.country
        FROM saas_tender_bid_sections s
        LEFT JOIN saas_tenders t ON t.id = s.tender_id
        WHERE s.org_id = ${req.saasUser.orgId}
        ORDER BY s.updated_at DESC
      `);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/governance/submit/:sectionId", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id } = req.body;
      const result = await db.execute(sql`
        UPDATE saas_tender_bid_sections SET governance_status = 'awaiting_review', updated_at = NOW()
        WHERE id = ${req.params.sectionId} AND org_id = ${req.saasUser.orgId} RETURNING *
      `);
      if (result.rows.length === 0) return res.status(404).json({ message: "Section not found" });
      const s = result.rows[0] as any;
      // Log governance action
      await db.execute(sql`INSERT INTO saas_bid_governance_log (org_id, tender_id, section_id, section_name, action, performed_by) VALUES (${req.saasUser.orgId}, ${s.tender_id}, ${s.id}, ${s.section_label}, 'submitted_for_review', ${req.saasUser.email})`);
      // Send email notification
      const tenderInfo = await db.execute(sql`SELECT title, country, source_url FROM saas_tenders WHERE id = ${s.tender_id}`).catch(() => ({ rows: [] }));
      const t = (tenderInfo.rows[0] as any) || {};
      const entity = (t.country || "GB") as "GB" | "NG";
      const tenderLink = t.source_url ? `<a href="${t.source_url}" style="color:#330311;font-weight:600;text-decoration:none;" target="_blank">${safeText(t.title)}</a>` : safeText(t.title);
      await sendRoutedEmail(entity, `Bid Section Ready for Review: ${s.section_label}`,
        `<h2 style="margin:0 0 12px 0;">Bid Section Submitted for Review</h2><p><strong>Tender:</strong> ${tenderLink}</p><p><strong>Section:</strong> ${s.section_label}</p><p><strong>Word Count:</strong> ${s.word_count}</p><p><strong>Submitted by:</strong> ${req.saasUser.email}</p><p>Please review and approve/reject in the Bid Governance panel.</p>`,
        req.saasUser.orgId);
      return res.json(result.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/governance/action/:sectionId", authenticateSaasUser, async (req: any, res) => {
    try {
      const { action, notes } = req.body;
      if (!["approve", "request_changes", "reject"].includes(action)) return res.status(400).json({ message: "Invalid action" });
      const statusMap: Record<string, string> = { approve: "approved", request_changes: "changes_requested", reject: "rejected" };
      const newStatus = statusMap[action];
      const result = await db.execute(sql`UPDATE saas_tender_bid_sections SET governance_status = 'approved', updated_at = NOW() WHERE id = ${req.params.sectionId} AND org_id = ${req.saasUser.orgId} RETURNING *`);
      if (result.rows.length === 0) return res.status(404).json({ message: "Section not found" });
      const s = result.rows[0] as any;
      await db.execute(sql`INSERT INTO saas_bid_governance_log (org_id, tender_id, section_id, section_name, action, performed_by, notes) VALUES (${req.saasUser.orgId}, ${s.tender_id}, ${s.id}, ${s.section_label}, 'approve', ${req.saasUser.email}, ${notes || null})`);
      // If changes requested, regenerate with feedback
      if (action === "request_changes" && notes) {
        const tRes = await db.execute(sql`SELECT * FROM saas_tenders WHERE id = ${s.tender_id}`).catch(() => ({ rows: [] }));
        const t = (tRes.rows[0] as any) || {};
        const rewritten = await claudeAI(
          EP_AGENT_SYSTEM_PROMPT,
          `Rewrite the "${s.section_label}" bid section incorporating this feedback:\n\nFEEDBACK: ${notes}\n\nOriginal section:\n${s.content}\n\nTender: ${t.title}\nBuyer: ${t.buyer}`,
          2000
        ).catch(() => null);
        if (rewritten) {
          await db.execute(sql`UPDATE saas_tender_bid_sections SET content = ${rewritten}, word_count = ${rewritten.split(/\s+/).length}, governance_status = 'rewritten', version = version + 1, updated_at = NOW() WHERE id = ${s.id}`);
        }
      }
      // Check if all sections approved — send notification
      const allSections = await db.execute(sql`SELECT governance_status FROM saas_tender_bid_sections WHERE tender_id = ${s.tender_id} AND org_id = ${req.saasUser.orgId}`);
      const allApproved = (allSections.rows as any[]).every(r => r.governance_status === "approved");
      if (allApproved) {
        const tRes = await db.execute(sql`SELECT title, country, source_url FROM saas_tenders WHERE id = ${s.tender_id}`).catch(() => ({ rows: [] }));
        const t = (tRes.rows[0] as any) || {};
        const entity = (t.country || "GB") as "GB" | "NG";
        const tenderLink = t.source_url ? `<a href="${t.source_url}" style="color:#330311;font-weight:600;text-decoration:none;" target="_blank">${safeText(t.title)}</a>` : safeText(t.title);
        await sendRoutedEmail(entity, `ALL SECTIONS APPROVED: ${t.title}`,
          `<h2 style="margin:0 0 12px 0;">✅ All Bid Sections Approved</h2><p>All sections for <strong>${tenderLink}</strong> have been approved.</p><p>The complete bid package is ready for submission.</p>`,
          req.saasUser.orgId);
      }
      const fresh = await db.execute(sql`SELECT * FROM saas_tender_bid_sections WHERE id = ${req.params.sectionId}`);
      return res.json(fresh.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/:tenderId/publish", authenticateSaasUser, async (req: any, res) => {
    try {
      const tenderId = req.params.tenderId;
      const tenderResult = await db.execute(sql`
        SELECT id, title, country
        FROM saas_tenders
        WHERE id = ${tenderId} AND org_id = ${req.saasUser.orgId}
        LIMIT 1
      `);
      if (!tenderResult.rows.length) return res.status(404).json({ message: "Tender not found" });

      const updated = await db.execute(sql`
        UPDATE saas_tenders
        SET status = 'Published',
            published_date = COALESCE(published_date, CURRENT_DATE)
        WHERE id = ${tenderId} AND org_id = ${req.saasUser.orgId}
        RETURNING *
      `);

      return res.json(updated.rows[0]);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/saas-tender/governance/log", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`SELECT * FROM saas_bid_governance_log WHERE org_id = ${req.saasUser.orgId} ORDER BY timestamp DESC LIMIT 100`);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARNING VAULT ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/saas-tender/learning-vault", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`SELECT * FROM saas_learning_vault WHERE org_id = ${req.saasUser.orgId} ORDER BY created_at DESC`);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/learning-vault", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const result = await db.execute(sql`
        INSERT INTO saas_learning_vault (org_id, tender_name, reference, buyer, date, outcome, our_score, winner_score, score_breakdown, lessons, feedback_text, what_to_do_differently)
        VALUES (${req.saasUser.orgId}, ${d.tender_name}, ${d.reference || null}, ${d.buyer || null}, ${d.date || null}, ${d.outcome || null}, ${d.our_score || null}, ${d.winner_score || null}, ${d.score_breakdown ? JSON.stringify(d.score_breakdown) : null}, ${d.lessons || null}, ${d.feedback_text || null}, ${d.what_to_do_differently || null})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/saas-tender/learning-vault/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const result = await db.execute(sql`
        UPDATE saas_learning_vault SET
          outcome = COALESCE(${d.outcome}, outcome),
          our_score = COALESCE(${d.our_score}, our_score),
          winner_score = COALESCE(${d.winner_score}, winner_score),
          lessons = COALESCE(${d.lessons}, lessons),
          feedback_text = COALESCE(${d.feedback_text}, feedback_text),
          what_to_do_differently = COALESCE(${d.what_to_do_differently}, what_to_do_differently),
          updated_at = NOW()
        WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId} RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // Set outcome on a submitted tender and create vault entry
  app.post("/api/saas-tender/tenders/:id/outcome", authenticateSaasUser, async (req: any, res) => {
    try {
      const { outcome, our_score, winner_score, feedback_text, what_to_do_differently, score_breakdown } = req.body;
      const t = await db.execute(sql`SELECT * FROM saas_tenders WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
      if (t.rows.length === 0) return res.status(404).json({ message: "Tender not found" });
      const tender = t.rows[0] as any;
      // Update tender status
      const newStatus = outcome === "Won" ? "Won" : outcome === "Lost" ? "Lost" : tender.status;
      await db.execute(sql`UPDATE saas_tenders SET status = ${newStatus}, updated_at = NOW() WHERE id = ${req.params.id}`);
      // Auto-extract lessons from feedback using Claude
      let lessons = feedback_text || "";
      if (feedback_text && outcome === "Lost") {
        try {
          lessons = await claudeAI(
            "You are a bid learning analyst. Extract key lessons from this bid feedback. Return a concise, actionable paragraph of lessons learned that can be applied to future bids.",
            `Tender: ${tender.title}\nBuyer: ${tender.buyer}\nOutcome: ${outcome}\nOur Score: ${our_score}\nWinner Score: ${winner_score}\nFeedback: ${feedback_text}\nWhat we'd do differently: ${what_to_do_differently || "Not specified"}`
          );
        } catch {}
      }
      // Upsert vault entry
      const existing = await db.execute(sql`SELECT id FROM saas_learning_vault WHERE org_id = ${req.saasUser.orgId} AND tender_name = ${tender.title}`);
      let vault;
      if (existing.rows.length > 0) {
        vault = await db.execute(sql`UPDATE saas_learning_vault SET outcome = ${outcome}, our_score = ${our_score || null}, winner_score = ${winner_score || null}, lessons = ${lessons}, feedback_text = ${feedback_text || null}, what_to_do_differently = ${what_to_do_differently || null}, score_breakdown = ${score_breakdown ? JSON.stringify(score_breakdown) : null}, updated_at = NOW() WHERE id = ${(existing.rows[0] as any).id} AND org_id = ${req.saasUser.orgId} RETURNING *`);
      } else {
        vault = await db.execute(sql`INSERT INTO saas_learning_vault (org_id, tender_name, reference, buyer, date, outcome, our_score, winner_score, lessons, feedback_text, what_to_do_differently, score_breakdown) VALUES (${req.saasUser.orgId}, ${tender.title}, ${tender.reference || null}, ${tender.buyer || null}, NOW(), ${outcome}, ${our_score || null}, ${winner_score || null}, ${lessons}, ${feedback_text || null}, ${what_to_do_differently || null}, ${score_breakdown ? JSON.stringify(score_breakdown) : null}) RETURNING *`);
      }
      return res.json({ tender: { id: tender.id, status: newStatus }, vault: vault.rows[0], lessons });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TENDER FIT SCORING
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/saas-tender/score-tender", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id, tender_title, tender_buyer, tender_value, tender_category, tender_location } = req.body;
      const profile = await db.execute(sql`SELECT company_name, sector_experience, bio_summary FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`);
      const p = (profile.rows[0] || {}) as any;
      const config = await db.execute(sql`SELECT keywords, categories FROM saas_search_config WHERE org_id = ${req.saasUser.orgId}`);
      const cfg = (config.rows[0] || {}) as any;
      const vaultLessons = await db.execute(sql`SELECT lessons FROM saas_learning_vault WHERE org_id = ${req.saasUser.orgId} ORDER BY created_at DESC LIMIT 5`).catch(() => ({ rows: [] }));
      const lessons = (vaultLessons.rows as any[]).map((l: any) => l.lessons).join("\n");

      const raw = await claudeAI(
        "You are a tender fit scorer. Analyse the tender against the company profile and return a JSON score. Return ONLY valid JSON, no markdown.",
        `Score this tender for fit:\n\nTender: ${tender_title}\nBuyer: ${tender_buyer}\nValue: ${tender_value}\nCategory: ${tender_category}\nLocation: ${tender_location || "Not specified"}\n\nCompany: ${p.company_name}\nExperience: ${p.sector_experience || ""}\nBio: ${p.bio_summary || ""}\nKeywords: ${(cfg.keywords || []).join(", ")}\n\nLearning Vault Lessons:\n${lessons || "None"}\n\nReturn: { "score": 0-100, "recommendation": "Strong Fit|Good Fit|Marginal Fit|Poor Fit", "priority": "high|medium|low", "geography_flag": true|false, "geography_note": "...", "reasoning": "2-3 sentence explanation" }`,
        1000
      );
      const match = raw.match(/\{[\s\S]*\}/);
      const scored = match ? JSON.parse(match[0]) : { score: 50, recommendation: "Unknown", priority: "medium", geography_flag: false, reasoning: raw };

      if (tender_id) {
        await db.execute(sql`INSERT INTO saas_tender_fit_scores (org_id, tender_id, score, recommendation, priority, geography_flag, geography_note, reasoning) VALUES (${req.saasUser.orgId}, ${tender_id}, ${scored.score}, ${scored.recommendation}, ${scored.priority}, ${scored.geography_flag || false}, ${scored.geography_note || null}, ${scored.reasoning}) ON CONFLICT DO NOTHING`);
      }
      res.json(scored);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/fit-scores", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`SELECT fs.*, t.title as tender_title, t.buyer, t.deadline, t.status FROM saas_tender_fit_scores fs LEFT JOIN saas_tenders t ON t.id = fs.tender_id WHERE fs.org_id = ${req.saasUser.orgId} ORDER BY fs.scored_at DESC LIMIT 50`);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ── Not-relevant signals (Fix 3) ─────────────────────────────────────────
  app.get("/api/saas-tender/not-relevant", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`SELECT tender_id FROM saas_tender_not_relevant WHERE org_id = ${req.saasUser.orgId}`);
      res.json((result.rows as any[]).map((r: any) => r.tender_id));
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/tenders/:id/not-relevant", authenticateSaasUser, async (req: any, res) => {
    try {
      const tenderId = parseInt(req.params.id, 10);
      const { reason } = req.body || {};
      await db.execute(sql`INSERT INTO saas_tender_not_relevant (org_id, tender_id, reason) VALUES (${req.saasUser.orgId}, ${tenderId}, ${reason || null}) ON CONFLICT (org_id, tender_id) DO NOTHING`);
      res.json({ ok: true });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/saas-tender/tenders/:id/not-relevant", authenticateSaasUser, async (req: any, res) => {
    try {
      const tenderId = parseInt(req.params.id, 10);
      await db.execute(sql`DELETE FROM saas_tender_not_relevant WHERE org_id = ${req.saasUser.orgId} AND tender_id = ${tenderId}`);
      res.json({ ok: true });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTOMATION ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/saas-tender/automation/log", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`SELECT * FROM saas_automation_log WHERE org_id = ${req.saasUser.orgId} ORDER BY timestamp DESC LIMIT 100`);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/automation/run-discovery", authenticateSaasUser, async (req: any, res) => {
    try {
      const entity = (req.body.entity || req.query.entity || "GB") as "GB" | "NG";
      const config = await db.execute(sql`SELECT * FROM saas_search_config WHERE org_id = ${req.saasUser.orgId}`);
      const cfg = (config.rows[0] || {}) as any;
      const keywords: string[] = cfg.keywords || ["event management", "conference", "programme management"];
      const profile = await db.execute(sql`SELECT company_name FROM saas_company_profile WHERE org_id = ${req.saasUser.orgId}`);
      const p = (profile.rows[0] || {}) as any;

      // Search Contracts Finder for each keyword
      const seen = new Set<string>();
      const discovered: any[] = [];
      const now = new Date();
      const minDeadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      for (const term of keywords.slice(0, 8)) {
        try {
          const apiUrl = `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?queryString=${encodeURIComponent(term)}&stage=tender&output=json&size=20`;
          const r = await fetch(apiUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
          if (!r.ok) continue;
          const data = await r.json() as any;
          for (const rel of (data?.releases || [])) {
            const tender = rel.tender || {};
            const deadlineStr = tender.tenderPeriod?.endDate || "";
            if (!deadlineStr || new Date(deadlineStr) < minDeadline) continue;
            const title = tender.title || "";
            if (!title || seen.has(title)) continue;
            seen.add(title);
            const buyer = rel.buyer || {};
            // Check if already in pipeline
            const exists = await db.execute(sql`SELECT id FROM saas_tenders WHERE org_id = ${req.saasUser.orgId} AND title = ${title}`);
            if (exists.rows.length > 0) continue;
            const blockText = `${title} ${buyer.name || ""} ${tender.description || ""} ${tender.classification?.description || ""}`.toLowerCase();
            if ([
              "after-school", "after school", "holiday club", "holiday clubs",
              "child friendly", "child-friendly", "child care", "childcare",
              "children's centre", "children centre", "school", "schools",
              "education", "educational", "academy", "academies", "early years",
              "nursery", "nurseries", "temporary accommodation", "supported accommodation",
              "residential care", "foster care", "looked after children", "care leaver",
              "social and emotional support", "emotional support", "support programmes",
              "community programme", "community programmes", "thriving together",
              "mens sheds", "men's sheds", "shared bench", "social support",
              "community support", "wellbeing support", "family support",
              "youth support", "support service", "support services",
              "mental health support", "public health support",
            ].some(term => blockText.includes(term))) continue;
            // Score the tender
            let score = 50;
            try {
              const raw = await claudeAI(
                "You are a tender fit scorer. Return ONLY JSON: {\"score\": 0-100}",
                `Score fit for ${p.company_name || "Event Perfekt"}: Tender "${title}" by "${buyer.name || "Unknown"}". Keywords: ${keywords.join(", ")}`,
                200
              );
              const m = raw.match(/"score"\s*:\s*(\d+)/);
              if (m) score = parseInt(m[1]);
            } catch {}

            // Add to pipeline if score >= 50
            if (score >= 50) {
              const _aiTags = computeOrgTags({ title, buyer: buyer.name, description: tender.description });
              const added = await db.execute(sql`
                INSERT INTO saas_tenders (org_id, title, buyer, deadline, status, category, source_url, country, created_by,
                  ep_relevant, ep_relevance_score, ep_matched_keywords,
                  alli_relevant, alli_relevance_score, alli_matched_keywords,
                  pmo_relevant, pmo_relevance_score, pmo_matched_keywords)
                VALUES (${req.saasUser.orgId}, ${title}, ${buyer.name || "Unknown"}, ${deadlineStr.split("T")[0]}, 'Auto-Discovered', ${tender.classification?.description || "Unknown"}, ${`https://www.contractsfinder.service.gov.uk/Notice/${rel.id || ""}`}, ${entity}, ${req.saasUser.userId},
                  ${_aiTags.ep_relevant}, ${_aiTags.ep_relevance_score}, ${pgTextArray(_aiTags.ep_matched_keywords)}::text[],
                  ${_aiTags.alli_relevant}, ${_aiTags.alli_relevance_score}, ${pgTextArray(_aiTags.alli_matched_keywords)}::text[],
                  ${_aiTags.pmo_relevant}, ${_aiTags.pmo_relevance_score}, ${pgTextArray(_aiTags.pmo_matched_keywords)}::text[])
                RETURNING *
              `).catch(() => ({ rows: [] }));
              if ((added.rows as any[]).length > 0) {
                const newTender = added.rows[0] as any;
                discovered.push({ ...newTender, score });
                // Score >= 75 → auto-generate bid sections skeleton
                if (score >= 75) {
                  await db.execute(sql`UPDATE saas_tenders SET status = 'Auto-High-Score' WHERE id = ${newTender.id}`).catch(() => {});
                  // Fire-and-forget: generate bid sections via Claude
                  claudeAI(
                    EP_AGENT_SYSTEM_PROMPT,
                    `Auto-generate a bid outline for this tender. Return 3-5 section titles as JSON array: ["Section 1", "Section 2", ...]\n\nTender: ${title}\nBuyer: ${buyer.name || "Unknown"}\nKeywords: ${keywords.join(", ")}`,
                    300
                  ).then(async (raw) => {
                    const m = raw.match(/\[[\s\S]*\]/);
                    const sections: string[] = m ? JSON.parse(m[0]) : ["Executive Summary", "Our Approach", "Relevant Experience", "Social Value", "Pricing"];
                    for (const label of sections) {
                      await db.execute(sql`INSERT INTO saas_tender_bid_sections (org_id, tender_id, section_label, content, governance_status, country) VALUES (${req.saasUser.orgId}, ${newTender.id}, ${label}, ${'[Auto-generated — complete this section]'}, 'draft', ${entity})`).catch(() => {});
                    }
                  }).catch(() => {});
                }
              }
            }
          }
        } catch {}
      }

      await db.execute(sql`INSERT INTO saas_automation_log (org_id, entity, action, result) VALUES (${req.saasUser.orgId}, ${entity}, 'discovery_run', ${`Found ${discovered.length} new tenders`})`);

      // Discovery alerts consolidated into the daily digest — no per-run emails.
      // Summary appears in the 07:30 daily digest instead.

      res.json({ message: `Discovery complete: ${discovered.length} new tenders found`, tenders: discovered });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ── Test briefing — seed bypass, sends to adminuk@ using live data ──────────
  app.post("/api/saas-tender/automation/test-briefing", async (req: any, res) => {
    const ip = (req.ip || req.socket?.remoteAddress || "").replace("::ffff:", "");
    const isLoopback = ip === "127.0.0.1" || ip === "::1" || ip === "localhost" || ip === "";
    if (!isLoopback && req.headers["x-seed-request"] !== "true") {
      return res.status(403).json({ message: "Loopback only" });
    }
    try {
      const r = await db.execute(sql`SELECT id FROM saas_organizations ORDER BY id ASC LIMIT 1`);
      req.saasUser = { orgId: (r.rows[0] as any)?.id || 1, userId: 0 };
      req.body = { entity: "GB" };
      return (app as any)._router.handle(Object.assign(req, { method: "POST", url: "/api/saas-tender/automation/morning-briefing" }), res, () => {});
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  app.post("/api/saas-tender/automation/morning-briefing", authenticateSaasUser, async (req: any, res) => {
    try {
      const entity = (req.body.entity || "GB") as "GB" | "NG";
      const country = entity;
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const todayStr = now.toISOString().slice(0, 10);
      const closedStatuses = ['awarded','closed','cancelled','won','lost','unsuccessful','withdrawn','complete'];

      const tenders = await db.execute(sql`
        SELECT * FROM saas_tenders
        WHERE org_id = ${req.saasUser.orgId}
          AND (country = ${country} OR country IS NULL)
          AND (status IS NULL OR LOWER(status) NOT IN (${sql.raw(closedStatuses.map(s => `'${s}'`).join(','))}))
          AND (deadline IS NULL OR deadline >= ${todayStr})
        ORDER BY deadline ASC NULLS LAST
        LIMIT 100
      `);
      // Drop awarded/past notices (by title) and de-duplicate by title — the briefing
      // must only surface live, biddable, relevant opportunities, never awards or dupes.
      const seenBriefTitles = new Set<string>();
      const allTenders = (tenders.rows as any[]).filter(t => {
        const title = String(t.title || "");
        if (!title) return false;
        if (isAwardNotice(title, String(t.description || ""), "")) return false;
        const key = title.toLowerCase().replace(/\s+/g, " ").trim();
        if (seenBriefTitles.has(key)) return false;
        seenBriefTitles.add(key);
        return true;
      });

      const deadlineSoon = allTenders
        .filter(t => t.deadline && new Date(t.deadline) <= in7Days && new Date(t.deadline) >= now)
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      const awaitingReview = await db.execute(sql`SELECT s.*, t.title as tender_title FROM saas_tender_bid_sections s LEFT JOIN saas_tenders t ON t.id = s.tender_id WHERE s.org_id = ${req.saasUser.orgId} AND s.governance_status = 'awaiting_review'`);
      const statusCounts: Record<string, number> = {};
      allTenders.forEach(t => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });
      const scoredTenders = allTenders.map(t => ({ ...t, ep_fit: scoreEpBusinessFit(t) }));
      const strongFitTenders = scoredTenders.filter(t => t.ep_fit >= 4).sort((a, b) => {
        const aD = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
        const bD = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
        return aD - bD;
      });
      const watchingTenders = scoredTenders.filter(t => t.ep_fit >= 2 && t.ep_fit < 4).sort((a, b) => {
        const aD = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
        const bD = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
        return aD - bD;
      });
      const briefableTenders = scoredTenders.filter(t => t.ep_fit >= 2);

      // Concrete next actions, derived from the real pipeline (no generic LLM filler).
      const briefingActions = buildBriefingActions({
        deadlineSoon,
        awaitingReview: awaitingReview.rows as any[],
        strongFit: strongFitTenders,
        watching: watchingTenders,
      });

      const PLATFORM_URL = "https://eventperfekt.net/saas-tender-dashboard";
      // A "real" notice link points at a specific tender notice, not a search page or
      // a bare portal homepage. Search/portal links are flagged so they're not
      // mistaken for a live, biddable ITT.
      const isRealNotice = (url: string) =>
        /\/Notice\/|ocds-[a-z0-9]|\/procurement\/|contractsfinder\.service\.gov\.uk\/notice/i.test(url) && !/\/Search\b|searchTerm=|\?k=/i.test(url);
      const tenderLink = (t: any) => {
        const raw = (t.source_url || t.external_url || t.url || "").trim();
        const url = raw || PLATFORM_URL;
        const flag = raw && !isRealNotice(raw)
          ? ' <span style="color:#94a3b8;font-size:11px;font-weight:400;">(portal — register interest)</span>'
          : "";
        return `<a href="${url}" style="color:#330311;font-weight:600;text-decoration:none;" target="_blank">${safeText(t.title)}</a>${flag}`;
      };
      // Live tenders show a date; curated watch-list leads with no ITT yet are labelled.
      const deadlineLabel = (t: any) => t.deadline ? `⏰ ${fmtDateEmail(t.deadline)}` : "🔄 Rolling — monitor for ITT";

      const html = `
<h2 style="margin:0 0 6px 0;font-size:22px;color:#330311;">☀️ Good Morning — Daily Bid Briefing</h2>
<p style="margin:0 0 18px 0;"><strong>Date:</strong> ${now.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>

<h3 style="color:#330311;border-bottom:2px solid #330311;padding-bottom:6px;margin:0 0 12px 0;">🎯 EP STRONG FIT</h3>
${strongFitTenders.length > 0 ? `<ul style="margin:0 0 16px 20px;padding:0;">${strongFitTenders.map(t => `<li style="margin:0 0 10px 0;">${tenderLink(t)} — ${safeText(t.buyer)} — <strong>Fit: ${t.ep_fit}/5</strong> · ${deadlineLabel(t)}</li>`).join("")}</ul>` : "<p>No strong-fit tenders today.</p>"}

<h3 style="color:#475569;border-bottom:1px solid #cbd5e1;padding-bottom:6px;margin:18px 0 12px 0;">👀 WATCHING (Fit 2–3)</h3>
${watchingTenders.length > 0 ? `<ul style="margin:0 0 16px 20px;padding:0;">${watchingTenders.map(t => `<li style="margin:0 0 8px 0;color:#475569;">${tenderLink(t)} — ${safeText(t.buyer)} · ${deadlineLabel(t)}</li>`).join("")}</ul>` : "<p style=\"color:#94a3b8;\">Nothing in the watching list today.</p>"}

<h3 style="margin:18px 0 12px 0;">📋 Bids Awaiting Review</h3>
${(awaitingReview.rows as any[]).length > 0 ? `<ul>${(awaitingReview.rows as any[]).map((s: any) => `<li>${safeText(s.tender_title)} — ${safeText(s.section_label)}</li>`).join("")}</ul>` : "<p>All sections up to date.</p>"}

<h3 style="margin:18px 0 12px 0;">📊 Pipeline Summary</h3>
<ul>${Object.entries(statusCounts).map(([s, c]) => `<li>${safeText(s)}: ${c}</li>`).join("")}</ul>

<h3 style="margin:18px 0 12px 0;">✅ Today's Actions</h3>
<div style="line-height:1.55;">${renderBriefingActions(briefingActions)}</div>

<p style="margin-top:24px;"><a href="${PLATFORM_URL}" style="display:inline-block;background:#330311;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Open Tender Centre →</a></p>
      `;

      // Preview-only by default. This manual endpoint used to fire a real
      // "[TEST] Daily Briefing" email to live inboxes on every call, which added to
      // the flooding. Pass { "send": true } in the body to actually send it.
      const doSend = req.body?.send === true;
      if (doSend) {
        await sendRoutedEmail(entity, `Daily Briefing — ${now.toLocaleDateString("en-GB")}`, html, req.saasUser.orgId);
        await db.execute(sql`INSERT INTO saas_automation_log (org_id, entity, action, result, email_sent) VALUES (${req.saasUser.orgId}, ${entity}, 'morning_briefing', 'Sent successfully', true)`);
      } else {
        await db.execute(sql`INSERT INTO saas_automation_log (org_id, entity, action, result, email_sent) VALUES (${req.saasUser.orgId}, ${entity}, 'morning_briefing_preview', 'Preview only — no email sent (pass send:true to send)', false)`);
      }
      res.json({
        message: doSend ? "Morning briefing sent" : "Morning briefing preview generated (no email sent — pass send:true to send)",
        stats: {
          pool_queried: allTenders.length,
          fit_ge3: briefableTenders.length,
          in_briefing: briefableTenders.length,
          deadline_soon_7d: deadlineSoon.length,
          awaiting_review: (awaitingReview.rows as any[]).length,
        },
        deadline_fields_note: "Only 'deadline' (submission) exists in DB. 'Deadline to express interest' and 'Deadline for clarification' will always be blank unless manually added to a tender record.",
        sources_note: "Data sources: Contracts Finder (CF) — exposes tenderPeriod.endDate → submission deadline only. Find a Tender (FTS) — exposes tenderPeriod.endDate → submission deadline only. TED EU — exposes deadlineForSubmission → submission deadline only. bidstats.uk — award intelligence only, no deadline. Nigeria sources — submission deadline only. None of the live sources expose express-interest or clarification deadlines.",
      });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ── ITT Details — capture private ITT portal fields ──────────────────────
  app.get("/api/saas-tender/tenders/:id/itt-details", authenticateSaasUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      const row = await db.execute(sql`SELECT * FROM saas_tender_itt_details WHERE tender_id = ${id} AND org_id = ${req.saasUser.orgId}`);
      res.json(row.rows[0] || null);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/saas-tender/tenders/:id/itt-details", authenticateSaasUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      const {
        deadline_eoi, clarification_deadline, clarification_answers_date, site_visit_date,
        submission_portal, portal_url, portal_login, named_contacts, lot_structure,
        bid_bond_required, bid_bond_amount, bid_bond_details, itt_notes,
      } = req.body;
      const contacts = Array.isArray(named_contacts) ? JSON.stringify(named_contacts) : "[]";
      const existing = await db.execute(sql`SELECT id FROM saas_tender_itt_details WHERE tender_id = ${id} AND org_id = ${req.saasUser.orgId}`);
      if (existing.rows.length > 0) {
        await db.execute(sql`UPDATE saas_tender_itt_details SET
          deadline_eoi = ${deadline_eoi || null},
          clarification_deadline = ${clarification_deadline || null},
          clarification_answers_date = ${clarification_answers_date || null},
          site_visit_date = ${site_visit_date || null},
          submission_portal = ${submission_portal || null},
          portal_url = ${portal_url || null},
          portal_login = ${portal_login || null},
          named_contacts = ${contacts}::jsonb,
          lot_structure = ${lot_structure || null},
          bid_bond_required = ${bid_bond_required || false},
          bid_bond_amount = ${bid_bond_amount || null},
          bid_bond_details = ${bid_bond_details || null},
          itt_notes = ${itt_notes || null},
          updated_at = NOW()
        WHERE tender_id = ${id} AND org_id = ${req.saasUser.orgId}`);
      } else {
        await db.execute(sql`INSERT INTO saas_tender_itt_details
          (tender_id, org_id, deadline_eoi, clarification_deadline, clarification_answers_date, site_visit_date,
           submission_portal, portal_url, portal_login, named_contacts, lot_structure,
           bid_bond_required, bid_bond_amount, bid_bond_details, itt_notes)
        VALUES (${id}, ${req.saasUser.orgId}, ${deadline_eoi || null}, ${clarification_deadline || null},
          ${clarification_answers_date || null}, ${site_visit_date || null},
          ${submission_portal || null}, ${portal_url || null}, ${portal_login || null},
          ${contacts}::jsonb, ${lot_structure || null},
          ${bid_bond_required || false}, ${bid_bond_amount || null}, ${bid_bond_details || null},
          ${itt_notes || null})`);
      }
      const updated = await db.execute(sql`SELECT * FROM saas_tender_itt_details WHERE tender_id = ${id} AND org_id = ${req.saasUser.orgId}`);
      res.json(updated.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/saas-tender/automation/deadline-alerts", authenticateSaasUser, async (req: any, res) => {
    try {
      const entity = (req.body.entity || "GB") as "GB" | "NG";
      const now = new Date();
      const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const in1 = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

      const tenders = await db.execute(sql`SELECT * FROM saas_tenders WHERE org_id = ${req.saasUser.orgId} AND status NOT IN ('Won','Lost','Cancelled') AND deadline IS NOT NULL ORDER BY deadline ASC`);
      const alerts: any[] = [];

      for (const t of (tenders.rows as any[])) {
        if (!t.deadline) continue;
        const dl = new Date(t.deadline);
        let urgency = "";
        let alertKey = "";
        if (dl <= in1 && dl >= now) { urgency = "🚨 FINAL ALERT — 1 Day"; alertKey = `deadline_1d_${t.id}`; }
        else if (dl <= in3 && dl >= now) { urgency = "🔴 URGENT — 3 Days"; alertKey = `deadline_3d_${t.id}`; }
        else if (dl <= in7 && dl >= now) { urgency = "🟡 ALERT — 7 Days"; alertKey = `deadline_7d_${t.id}`; }
        if (!urgency) continue;
        // Prevent duplicate: check if this specific alert was already sent today
        const alreadySent = await db.execute(sql`SELECT id FROM saas_automation_log WHERE org_id = ${req.saasUser.orgId} AND action = ${alertKey} AND timestamp >= NOW() - INTERVAL '20 hours' LIMIT 1`).catch(() => ({ rows: [] }));
        if ((alreadySent.rows as any[]).length > 0) continue;
        alerts.push({ ...t, urgency, alertKey });
      }

      if (alerts.length > 0) {
        const SCHED_URL = "https://eventperfekt.net/saas-tender-dashboard";
        const tLink = (a: any) => `<a href="${a.source_url || a.external_url || a.url || SCHED_URL}" style="color:#330311;font-weight:600;text-decoration:none;" target="_blank">${safeText(a.title)}</a>`;
        const html = `<h2 style="margin:0 0 12px 0;">⏰ Deadline Alerts</h2><ul style="margin:0 0 0 20px;padding:0;line-height:1.6;">${alerts.map(a => `<li style="margin:0 0 10px 0;">${a.urgency} — ${tLink(a)} — ${safeText(a.buyer)} — Due: ${fmtDateEmail(a.deadline)}</li>`).join("")}</ul>`;
        await sendRoutedEmail(entity, `Deadline Alerts: ${alerts.length} tenders require attention`, html, req.saasUser.orgId);
        // Log each alert individually to prevent duplicate sends
        for (const a of alerts) {
          await db.execute(sql`INSERT INTO saas_automation_log (org_id, entity, action, result) VALUES (${req.saasUser.orgId}, ${entity}, ${a.alertKey}, ${`Alert sent: ${a.title}`})`).catch(() => {});
        }
      }
      await db.execute(sql`INSERT INTO saas_automation_log (org_id, entity, action, result) VALUES (${req.saasUser.orgId}, ${entity}, 'deadline_alerts', ${`${alerts.length} alerts sent`})`);
      res.json({ message: `${alerts.length} deadline alerts processed`, alerts });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULED JOBS — start automatically when server boots
  // ═══════════════════════════════════════════════════════════════════════════

  // FIX 1 — Auto-discovery every 6 hours across all orgs
  async function runScheduledDiscovery() {
    const timestamp = new Date().toISOString();
    console.log(`[EP Agent] Auto-discovery running — ${timestamp}`);
    try {
      const orgs = await db.execute(sql`SELECT id FROM saas_organizations`);
      for (const org of orgs.rows as any[]) {
        const orgId = org.id;
        try {
          const config = await db.execute(sql`SELECT * FROM saas_search_config WHERE org_id = ${orgId}`);
          const cfg = (config.rows[0] || {}) as any;
          const keywords: string[] = cfg.keywords || ["event management", "conference", "programme management"];
          // Determine entity from org config, fall back to GB
          const entity = ((cfg.country || cfg.entity || "GB") as string).toUpperCase().startsWith("NG") ? "NG" as const : "GB" as const;
          const profile = await db.execute(sql`SELECT company_name FROM saas_company_profile WHERE org_id = ${orgId}`);
          const p = (profile.rows[0] || {}) as any;

          // ── Seed pinned EP opportunities (upsert, never remove) ──────────
          for (const opp of EP_PINNED_OPPORTUNITIES) {
            if (opp.country !== entity && entity !== "GB") continue;
            await db.execute(sql`
              INSERT INTO saas_tenders (org_id, title, buyer, deadline, status, category, source_url, country, description, updated_at)
              VALUES (${orgId}, ${opp.title}, ${opp.buyer}, ${opp.deadline || null}, ${opp.status}, ${opp.category}, ${opp.source_url}, ${opp.country}, ${opp.description}, NOW())
              ON CONFLICT (org_id, title) DO UPDATE SET
                buyer = EXCLUDED.buyer,
                status = CASE WHEN saas_tenders.status IN ('Won','Lost','Cancelled','Withdrawn') THEN saas_tenders.status ELSE EXCLUDED.status END,
                source_url = EXCLUDED.source_url,
                category = EXCLUDED.category,
                updated_at = NOW()
            `).catch(() => {});
          }

          const seen = new Set<string>();
          const discovered: any[] = [];
          const now = new Date();
          const minDeadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
          const closedStatuses = ["closed", "cancelled", "complete", "awarded", "unsuccessful", "withdrawn"];

          // Search Contracts Finder
          for (const term of keywords.slice(0, 8)) {
            try {
              const apiUrl = `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?queryString=${encodeURIComponent(term)}&stage=tender&output=json&size=20`;
              const r = await fetch(apiUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
              if (!r.ok) continue;
              const data = await r.json() as any;
              for (const rel of (data?.releases || [])) {
                const tender = rel.tender || {};
                const deadlineStr = tender.tenderPeriod?.endDate || "";
                if (!deadlineStr || new Date(deadlineStr) < minDeadline) continue;
                const status = (tender.status || "").toLowerCase();
                if (closedStatuses.includes(status)) continue;
                const title = tender.title || "";
                if (!title || seen.has(title)) continue;
                seen.add(title);
                const buyer = rel.buyer || {};
                const exists = await db.execute(sql`SELECT id FROM saas_tenders WHERE org_id = ${orgId} AND title = ${title}`);
                if (exists.rows.length > 0) continue;
                const value = tender.value || tender.minValue || {};
                const idParts = (rel.id || "").split("-");
                const noticeGuid = idParts.length >= 5 ? idParts.slice(0, 5).join("-") : rel.id || "";
                discovered.push({ title, buyer: buyer.name || "Unknown", deadline: deadlineStr.split("T")[0], source: "Contracts Finder", source_url: `https://www.contractsfinder.service.gov.uk/Notice/${noticeGuid}`, value_amount: value.amount || null, description: (tender.description || "").slice(0, 200) });
              }
            } catch {}
          }

          // Search Find a Tender
          for (const term of keywords.slice(0, 6)) {
            try {
              const apiUrl = `https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?queryString=${encodeURIComponent(term)}&stage=tender&size=15`;
              const r = await fetch(apiUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
              if (!r.ok) continue;
              const data = await r.json() as any;
              const packages = data?.results || data?.releasePackages || data || [];
              for (const pkg of (Array.isArray(packages) ? packages : [])) {
                for (const rel of (pkg.releases || [pkg])) {
                  const tender = rel.tender || {};
                  const deadlineStr = tender.tenderPeriod?.endDate || "";
                  if (!deadlineStr || new Date(deadlineStr) < minDeadline) continue;
                  const status = (tender.status || "").toLowerCase();
                  if (closedStatuses.includes(status)) continue;
                  const title = tender.title || "";
                  if (!title || seen.has(title)) continue;
                  seen.add(title);
                  const buyer = rel.buyer || {};
                  const exists = await db.execute(sql`SELECT id FROM saas_tenders WHERE org_id = ${orgId} AND title = ${title}`);
                  if (exists.rows.length > 0) continue;
                  discovered.push({ title, buyer: buyer.name || "Unknown", deadline: deadlineStr.split("T")[0], source: "Find a Tender", source_url: `https://www.find-tender.service.gov.uk/Notice/${(rel.id || "").split("-").slice(0,5).join("-")}`, value_amount: (tender.value || {}).amount || null, description: (tender.description || "").slice(0, 200) });
                }
              }
            } catch {}
          }

          // ── Buyer-targeted searches on Contracts Finder ───────────────
          // Search by specific EP target buyers (FCDO, CEFAS, UKHSA, etc.)
          if (entity === "GB") {
            for (const buyer of EP_TARGET_BUYERS.slice(0, 6)) {
              try {
                const apiUrl = `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?queryString=${encodeURIComponent(buyer)}&stage=tender&output=json&size=20`;
                const r = await fetch(apiUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
                if (!r.ok) continue;
                const data = await r.json() as any;
                for (const rel of (data?.releases || [])) {
                  const tender = rel.tender || {};
                  const deadlineStr = tender.tenderPeriod?.endDate || "";
                  if (!deadlineStr || new Date(deadlineStr) < minDeadline) continue;
                  const status = (tender.status || "").toLowerCase();
                  if (closedStatuses.includes(status)) continue;
                  const title = tender.title || "";
                  if (!title || seen.has(title)) continue;
                  seen.add(title);
                  const buyerObj = rel.buyer || {};
                  const exists = await db.execute(sql`SELECT id FROM saas_tenders WHERE org_id = ${orgId} AND title = ${title}`);
                  if (exists.rows.length > 0) continue;
                  const value = tender.value || tender.minValue || {};
                  const idParts = (rel.id || "").split("-");
                  const noticeGuid = idParts.length >= 5 ? idParts.slice(0, 5).join("-") : rel.id || "";
                  discovered.push({ title, buyer: buyerObj.name || buyer, deadline: deadlineStr.split("T")[0], source: "Contracts Finder (Buyer)", source_url: `https://www.contractsfinder.service.gov.uk/Notice/${noticeGuid}`, value_amount: value.amount || null, description: (tender.description || "").slice(0, 200) });
                }
              } catch {}
            }

            // Also search Find a Tender by buyer for highest-priority buyers
            for (const buyer of ["FCDO", "CEFAS", "UKHSA", "British Council", "DEFRA"].slice(0, 5)) {
              try {
                const apiUrl = `https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?q=${encodeURIComponent(buyer)}&status=active&limit=15`;
                const r = await fetch(apiUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
                if (!r.ok) continue;
                const data = await r.json() as any;
                const packages = data?.results || data?.releasePackages || data || [];
                for (const pkg of (Array.isArray(packages) ? packages : [])) {
                  for (const rel of (pkg.releases || [pkg])) {
                    const tender = rel.tender || {};
                    const deadlineStr = tender.tenderPeriod?.endDate || "";
                    if (!deadlineStr || new Date(deadlineStr) < minDeadline) continue;
                    const status = (tender.status || "").toLowerCase();
                    if (closedStatuses.includes(status)) continue;
                    const title = tender.title || "";
                    if (!title || seen.has(title)) continue;
                    seen.add(title);
                    const buyerObj = rel.buyer || {};
                    const exists = await db.execute(sql`SELECT id FROM saas_tenders WHERE org_id = ${orgId} AND title = ${title}`);
                    if (exists.rows.length > 0) continue;
                    discovered.push({ title, buyer: buyerObj.name || buyer, deadline: deadlineStr.split("T")[0], source: "Find a Tender (Buyer)", source_url: `https://www.find-tender.service.gov.uk/Notice/${(rel.id || "").split("-").slice(0,5).join("-")}`, value_amount: (tender.value || {}).amount || null, description: (tender.description || "").slice(0, 200) });
                  }
                }
              } catch {}
            }
          }

          // Search UNGM
          for (const term of keywords.slice(0, 4)) {
            try {
              const r = await fetch(`https://www.ungm.org/Public/Notice?pageIndex=1&pageSize=10&deadline=true&noticeTypes=0,2,4&keyword=${encodeURIComponent(term)}`, { headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" }, signal: AbortSignal.timeout(10000) });
              if (r.ok) {
                const ct = r.headers.get("content-type") || "";
                if (ct.includes("json")) {
                  const d = await r.json() as any;
                  for (const n of (d?.notices || d?.Notices || [])) {
                    const title = n.Title || n.title || "";
                    if (!title || seen.has(title)) continue;
                    seen.add(title);
                    const deadline = n.Deadline?.slice(0, 10) || "";
                    if (deadline) { try { if (new Date(deadline) <= now) continue; } catch {} }
                    const exists = await db.execute(sql`SELECT id FROM saas_tenders WHERE org_id = ${orgId} AND title = ${title}`);
                    if (exists.rows.length > 0) continue;
                    discovered.push({ title, buyer: n.AgencyName || "UN Agency", deadline, source: "UNGM", source_url: `https://www.ungm.org/Public/Notice/${n.Id || n.id}`, value_amount: null, description: "" });
                  }
                }
              }
            } catch {}
          }

          // Search UNDP
          for (const term of keywords.slice(0, 4)) {
            try {
              const r = await fetch(`https://procurement-notices.undp.org/view.cfm?cf=1&SearchString=${encodeURIComponent(term)}&Country=&Category=&SC=0&SO=0&PageSize=10&OutputType=json`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
              if (r.ok) {
                const text = await r.text();
                if (!text.includes("404")) {
                  try {
                    const d = JSON.parse(text);
                    const notices = Array.isArray(d) ? d : (d?.Results || d?.ProcurementNoticeList || []);
                    for (const n of notices) {
                      const title = n.Title || n.title || "";
                      if (!title || seen.has(title)) continue;
                      seen.add(title);
                      const deadline = n.DeadlineDate || n.Deadline || "";
                      if (deadline) { try { if (new Date(deadline) <= now) continue; } catch {} }
                      const exists = await db.execute(sql`SELECT id FROM saas_tenders WHERE org_id = ${orgId} AND title = ${title}`);
                      if (exists.rows.length > 0) continue;
                      discovered.push({ title, buyer: "UNDP", deadline: deadline ? new Date(deadline).toISOString().split("T")[0] : "", source: "UNDP", source_url: n.ID ? `https://procurement-notices.undp.org/view.cfm?notice_id=${n.ID}` : "", value_amount: null, description: "" });
                    }
                  } catch {}
                }
              }
            } catch {}
          }

          // Search World Bank
          for (const term of keywords.slice(0, 3)) {
            try {
              const r = await fetch(`https://search.worldbank.org/api/v2/procnotices?format=json&qterm=${encodeURIComponent(term)}&rows=10&srt=score&order=desc`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
              if (r.ok) {
                const d = await r.json() as any;
                for (const key of Object.keys(d?.procnotices || {})) {
                  const n = d.procnotices[key];
                  if (!n || typeof n !== "object" || !n.notice_text) continue;
                  const rawTitle = n.project_name || n.notice_name || n.project_title || n.notice_text || "";
                  const title = cleanTenderTitle(rawTitle);
                  const noticeType = String(n.notice_type || n.notice_type_desc || "");
                  if (!title || seen.has(title) || isAwardNotice(title, rawTitle, noticeType)) continue;
                  const geo = isRelevantGeo(n.project_ctry_name || "", stripHtml(n.notice_text || ""), title);
                  if (geo === "exclude") continue;
                  const deadline = n.deadline_date || "";
                  if (!deadline || /^tbc$/i.test(String(deadline).trim())) continue;
                  if (deadline) { try { if (!isValidDeadline(deadline) || new Date(deadline) <= now) continue; } catch {} }
                  const exists = await db.execute(sql`SELECT id FROM saas_tenders WHERE org_id = ${orgId} AND title = ${title}`);
                  if (exists.rows.length > 0) continue;
                  discovered.push({ title, buyer: n.borrower || "World Bank", deadline: deadline ? deadline.split("T")[0] : "", source: "World Bank", source_url: n.id ? `https://projects.worldbank.org/en/projects-operations/procurement-detail/${n.id}` : "", value_amount: null, description: `${noticeType}. ${stripHtml(n.notice_text || "").slice(0, 300)}`, geo_flag: geo });
                  seen.add(title);
                }
              }
            } catch {}
          }

          // Score top discoveries with Claude and auto-add high scorers
          // Pre-filter: drop obviously irrelevant titles before calling Claude
          const filteredDiscovered = discovered.filter(d => !isIrrelevantTitle(d.title));

          const scored: any[] = [];
          const candidates: any[] = [];
          let newlyAdded = 0; // tenders INSERTed this run (not just re-seen/updated)
          for (const d of filteredDiscovered.slice(0, 30)) {
            let score = 50;
            try {
              const raw = await claudeAI(
                "You are a tender fit scorer for Event Perfekt — a UK programme delivery and event management company with an active CEFAS Africa Regional Support contract. Score only on geography fit, buyer relevance, delivery relevance, deadline clarity, and evidence quality. Return ONLY JSON: {\"score\": 0-100}",
                `Score fit: Tender "${d.title}" by "${d.buyer}". Keywords: ${keywords.join(", ")}. Description: ${d.description || ""}`,
                200
              );
              const m = raw.match(/"score"\s*:\s*(\d+)/);
              if (m) score = parseInt(m[1]);
            } catch {}
            score = normalizeDiscoveryScore(score, d.title, d.description || "", d.buyer || "");
            candidates.push({ ...d, score });
            // Fix 1: Store ALL qualifying items (score >= 30) to DB so both the
            // discovery email and the daily digest read from the same source of truth.
            // Items >= 65 are "committed" for Elizabeth's draft cap; items 30-64 are
            // "qualifying" visible in the dashboard but not auto-drafted.
            if (d.geo_flag === "manual" || !d.deadline) continue;
            if (score >= RELEVANCE_THRESHOLD) {
              const added = await db.execute(sql`
                INSERT INTO saas_tenders (org_id, title, buyer, deadline, status, category, source_url, country, description, match_score, updated_at)
                VALUES (${orgId}, ${d.title}, ${d.buyer}, ${d.deadline || null},
                  CASE WHEN ${score} >= 65 THEN 'Auto-Discovered' ELSE 'Qualifying' END,
                  ${d.source}, ${d.source_url || null}, ${entity}, ${d.description || ""}, ${score}, NOW())
                ON CONFLICT (org_id, title) DO UPDATE SET
                  match_score = EXCLUDED.match_score,
                  status = CASE WHEN EXCLUDED.match_score >= 65 THEN 'Auto-Discovered' ELSE 'Qualifying' END,
                  updated_at = NOW()
                RETURNING *, (xmax = 0) AS inserted
              `).catch(() => ({ rows: [] }));
              if ((added.rows as any[]).length > 0) {
                const row = added.rows[0] as any;
                // xmax = 0 means the row was INSERTed; non-zero means ON CONFLICT
                // updated an existing tender. Only true inserts are "genuinely new".
                if (row.inserted === true) newlyAdded++;
                if (score >= 65) {
                  scored.push({ ...row, score, source: d.source, value_amount: d.value_amount, description: d.description });
                }
              }
            }
          }

          await db.execute(sql`INSERT INTO saas_automation_log (org_id, entity, action, result) VALUES (${orgId}, ${entity}, 'scheduled_discovery', ${"Searched 5 sources. Found " + discovered.length + " candidates, previewed " + candidates.length + ", added " + scored.length + " (filtered by geography/deadline)"})`).catch(() => {});

          // ── Elizabeth's daily bid packs — source → qualify → draft (≤3/day) ──
          // After sourcing and qualifying, Elizabeth drafts the FULL ITT for the most
          // relevant new tenders, capped at 3 complete bid packs per org per day. The
          // cap counts drafts already done today (this job runs every 6h, so it must
          // accumulate across runs). Drafts are left as 'auto_drafted' for HUMAN REVIEW
          // — nothing is ever auto-submitted. Uses the same playbook-grounded writer as
          // the one-click button so an auto pack === a hand-clicked pack.
          const DAILY_DRAFT_CAP = 3;
          try {
            const draftedTodayRes = await db.execute(sql`
              SELECT COUNT(*)::int AS n FROM saas_automation_log
              WHERE org_id = ${orgId} AND action = 'auto_draft' AND timestamp::date = CURRENT_DATE
            `).catch(() => ({ rows: [{ n: 0 }] }));
            const draftedToday = Number((draftedTodayRes.rows[0] as any)?.n || 0);
            let remaining = Math.max(0, DAILY_DRAFT_CAP - draftedToday);
            // Most relevant first; only strong, live matches qualify for an auto pack.
            const toDraft = scored
              .filter(s => s.score >= 65 && s.deadline && new Date(s.deadline) > now)
              .sort((a, b) => b.score - a.score)
              .slice(0, remaining);
            for (const t of toDraft) {
              if (remaining <= 0) break;
              try {
                const results = await generateFullBid(orgId, t, "auto_drafted");
                const ok = results.filter((r: any) => !r.error).length;
                remaining--;
                await db.execute(sql`INSERT INTO saas_automation_log (org_id, entity, action, result) VALUES (${orgId}, ${entity}, 'auto_draft', ${`Elizabeth drafted full ITT (${ok}/${results.length} sections, score ${t.score}) for: ${t.title} — awaiting human review`})`).catch(() => {});
              } catch (draftErr: any) {
                console.error(`[EP Agent] Elizabeth auto-draft failed for "${t.title}":`, draftErr.message);
              }
            }
            if (toDraft.length > 0) console.log(`[EP Agent] Elizabeth drafted ${toDraft.length} bid pack(s) for org ${orgId} (${draftedToday} already today, cap ${DAILY_DRAFT_CAP})`);
          } catch (capErr: any) {
            console.error(`[EP Agent] Daily draft cap pass failed for org ${orgId}:`, capErr.message);
          }

          // ── Build clean, readable discovery email ──
          // Fix 1: Source of truth — query the DB for the same qualifying set
          // that the daily digest reads. This guarantees the email and the digest
          // never contradict each other on counts or tender lists.
          const todayStrDB = now.toISOString().slice(0, 10);
          const qualifyingRes = await db.execute(sql`
            SELECT title, buyer, deadline, source_url, match_score, status, source, ocid
            FROM saas_tenders
            WHERE org_id = ${orgId}
              AND updated_at >= NOW() - INTERVAL '24 hours'
              AND LOWER(status) IN ('qualifying', 'auto-discovered')
              AND (deadline IS NULL OR deadline >= ${todayStrDB}::text)
            ORDER BY match_score DESC NULLS LAST, updated_at DESC
            LIMIT 50
          `).catch(() => ({ rows: [] }));
          const qualifyingDB = (qualifyingRes.rows as any[]).map(r => ({
            title: r.title, buyer: r.buyer, deadline: r.deadline, source_url: r.source_url,
            score: Number(r.match_score) || 0, status: r.status, source: r.source, ocid: r.ocid,
          }));

          const committedRes = await db.execute(sql`
            SELECT title, buyer, deadline, source_url, match_score, status, source
            FROM saas_tenders
            WHERE org_id = ${orgId}
              AND updated_at >= NOW() - INTERVAL '24 hours'
              AND LOWER(status) = 'auto-discovered'
              AND (deadline IS NULL OR deadline >= ${todayStrDB}::text)
            ORDER BY match_score DESC NULLS LAST
            LIMIT 50
          `).catch(() => ({ rows: [] }));
          const committedDB = (committedRes.rows as any[]).map(r => ({
            title: r.title, buyer: r.buyer, deadline: r.deadline, source_url: r.source_url,
            score: Number(r.match_score) || 0, status: r.status, source: r.source,
          }));

          // Only email when THIS run genuinely added new tenders — not on every 6h
          // re-scan or restart. The full daily picture still goes out in the 07:30 UK
          // digest, so re-seen tenders no longer generate a fresh alert each run.
          if (newlyAdded > 0 && (qualifyingDB.length > 0 || committedDB.length > 0)) {
            const autoDrafted = committedDB.filter((s: any) => s.score >= 65);
            const candidateRows = qualifyingDB.slice(0, 20).map((d: any) => {
              const scoreColor = d.score >= 65 ? "#166534" : d.score >= 45 ? "#92400e" : d.score >= 25 ? "#475569" : "#991b1b";
              const scoreBg = d.score >= 65 ? "#dcfce7" : d.score >= 45 ? "#fef9c3" : d.score >= 25 ? "#f1f5f9" : "#fee2e2";
              const geoLabel = d.score >= 65 ? "✅ Added to pipeline" : d.score >= 45 ? "🟡 Possible — review" : "⬇ Below fit threshold";
              const geoColor = d.score >= 65 ? "#166534" : d.score >= 45 ? "#92400e" : "#94a3b8";
              return `
                <tr style="background:#fff;">
                  <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;vertical-align:top;">
                    <div style="font-weight:600;color:#1e293b;margin-bottom:4px;">${safeText(d.title)}</div>
                    <div style="color:#64748b;font-size:11px;">${safeText(d.buyer)}</div>
                  </td>
                  <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;vertical-align:top;white-space:nowrap;">${d.deadline || "No deadline"}</td>
                  <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;text-align:center;">
                    <span style="background:${scoreBg};color:${scoreColor};padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700;">${d.score}/100</span>
                  </td>
                  <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;text-align:center;">
                    <span style="color:${geoColor};font-size:11px;font-weight:600;">${geoLabel}</span>
                  </td>
                </tr>`;
            }).join("");

            const committedRows = committedDB.map((d: any, i: number) => `
              <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#fff"};">
                <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                  <a href="${d.source_url || "#"}" style="color:#330311;text-decoration:none;font-weight:700;font-size:13px;">${safeText(d.title)}</a>
                  <div style="color:#64748b;font-size:11px;margin-top:4px;">${safeText(d.buyer)} · ${d.source}</div>
                </td>
                <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#dc2626;font-weight:600;vertical-align:top;white-space:nowrap;">${d.deadline || "TBC"}</td>
                <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;text-align:center;">
                  <span style="background:#dcfce7;color:#166534;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;">${d.score}/100</span>
                </td>
                <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;text-align:center;">
                  ${d.score >= 65 ? '<span style="color:#166534;font-weight:700;font-size:12px;">✅ Drafted</span>' : '<span style="color:#94a3b8;font-size:12px;">–</span>'}
                </td>
              </tr>`).join("");

            const html = `
<div style="font-family:Georgia,serif;max-width:720px;margin:0 auto;color:#1a1a1a;line-height:1.7;">

  <!-- Header -->
  <div style="background:#330311;padding:24px 28px;border-radius:6px 6px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:22px;">🔍 EP Agent — Tender Discovery Report</h1>
    <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">
      ${now.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
    </p>
  </div>

  <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;">

    <!-- Summary Cards -->
    <div style="display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap;">
      <div style="flex:1;min-width:110px;background:#f8f6f3;border-radius:6px;padding:16px;text-align:center;">
        <div style="font-size:26px;font-weight:700;color:#330311;">${qualifyingDB.length}</div>
        <div style="font-size:11px;color:#666;margin-top:4px;">Qualifying Tenders</div>
      </div>
      <div style="flex:1;min-width:110px;background:#f8f6f3;border-radius:6px;padding:16px;text-align:center;">
        <div style="font-size:26px;font-weight:700;color:#c0392b;">${committedDB.length}</div>
        <div style="font-size:11px;color:#666;margin-top:4px;">Committed to Pipeline</div>
      </div>
      <div style="flex:1;min-width:110px;background:#f8f6f3;border-radius:6px;padding:16px;text-align:center;">
        <div style="font-size:26px;font-weight:700;color:#166534;">${autoDrafted.length}</div>
        <div style="font-size:11px;color:#666;margin-top:4px;">Auto-Drafted</div>
      </div>
    </div>

    <!-- Auto-drafted banner -->
    ${autoDrafted.length > 0 ? `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px 20px;margin:0 0 24px 0;">
      <div style="font-size:15px;font-weight:700;color:#166534;margin-bottom:6px;">
        ✍️ ${autoDrafted.length} tender${autoDrafted.length !== 1 ? "s" : ""} auto-drafted
      </div>
      <div style="font-size:13px;color:#475569;">
        Drafted after geography and deadline checks. Open the Tender Command Centre to review and edit.
      </div>
    </div>` : ""}

    <!-- Qualifying tenders (passed the relevance gate) -->
    <h3 style="color:#330311;font-size:16px;margin:0 0 14px 0;padding-bottom:8px;border-bottom:2px solid #330311;">
      Qualifying Tenders
    </h3>
    <p style="color:#64748b;font-size:12px;margin:-4px 0 12px 0;">
      Tenders that passed the relevance gate (score ≥ ${RELEVANCE_THRESHOLD}), scored by EP business fit (events, programme delivery, Africa, PMO, youth). Off-target and sub-threshold notices are filtered out.
    </p>
    <table style="border-collapse:collapse;width:100%;margin-bottom:32px;">
      <thead>
        <tr style="background:#330311;color:#fff;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;">Tender</th>
          <th style="padding:10px 12px;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;white-space:nowrap;">Deadline</th>
          <th style="padding:10px 12px;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;text-align:center;">Score</th>
          <th style="padding:10px 12px;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;text-align:center;">Status</th>
        </tr>
      </thead>
      <tbody>${candidateRows}</tbody>
    </table>

    <!-- Committed to Pipeline -->
    <h3 style="color:#330311;font-size:16px;margin:0 0 14px 0;padding-bottom:8px;border-bottom:2px solid #330311;">
      Committed to Pipeline
    </h3>
    <p style="color:#64748b;font-size:12px;margin:-4px 0 12px 0;">
      Tenders that passed the geography and deadline filters and are now in your active pipeline.
    </p>
    <table style="border-collapse:collapse;width:100%;margin-bottom:28px;">
      <thead>
        <tr style="background:#330311;color:#fff;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;">Tender</th>
          <th style="padding:10px 12px;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;white-space:nowrap;">Deadline</th>
          <th style="padding:10px 12px;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;text-align:center;">Score</th>
          <th style="padding:10px 12px;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;text-align:center;">Draft</th>
        </tr>
      </thead>
      <tbody>${committedRows}</tbody>
    </table>

    <!-- CTA -->
    <div style="background:#f8f6f3;border-radius:8px;padding:18px 20px;text-align:center;">
      <a href="https://eventperfekt.net/saas-tender-dashboard" style="display:inline-block;background:#330311;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;">
        Open Tender Command Centre →
      </a>
      <p style="color:#888;font-size:11px;margin:10px 0 0;">
        Review, edit, and submit bid sections
      </p>
    </div>

  </div>

  <!-- Footer -->
  <div style="padding:20px 28px;text-align:center;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">
      EP Agent · Auto-generated by Event Perfekt · Event Perfekt Global Ltd, 20 Wenlock Road, London N1 7GU
    </p>
  </div>

</div>`;

            await sendRoutedEmail(entity, `🆕 ${newlyAdded} New Qualifying Tender${newlyAdded === 1 ? "" : "s"} — EP Agent Discovery`, html, orgId);
          }
          console.log(`[EP Agent] Auto-discovery org ${orgId}: searched 5 sources, ${discovered.length} candidates, ${scored.length} added`);
        } catch (orgErr: any) {
          console.error(`[EP Agent] Auto-discovery error org ${orgId}:`, orgErr.message);
        }
      }
    } catch (err: any) {
      console.error("[EP Agent] Auto-discovery scheduler error:", err.message);
    }
  }

  // Fixed 6-hour cadence only — NO run on boot. The old boot run meant every Replit
  // restart/redeploy kicked off a fresh discovery + email burst, which was a large
  // part of the inbox flooding. The 07:00 sweep and 07:30 UK digest remain the
  // guaranteed daily cycle regardless of restarts.
  setInterval(runScheduledDiscovery, 6 * 60 * 60 * 1000);
  console.log("[EP Agent] Auto-discovery scheduler started — every 6 hours (no run on boot)");

  // FIX 2 — Morning briefing at 07:00 UK time daily
  async function runScheduledMorningBriefing() {
    try {
      const now = new Date();
      // Robust UK hour/minute extraction using UTC offset for Europe/London
      const ukFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false });
      const parts = ukFormatter.formatToParts(now);
      const ukHour = parts.find(p => p.type === "hour")?.value;
      const ukMinute = parts.find(p => p.type === "minute")?.value;
      const todayUK = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London" }).format(now);
      // Prevent duplicate: check DB for today's briefing log
      const alreadySent = await db.execute(sql`SELECT id FROM saas_automation_log WHERE action = 'scheduled_morning_briefing' AND timestamp >= NOW() - INTERVAL '23 hours' LIMIT 1`).catch(() => ({ rows: [] }));
      if (ukHour !== "07" || ukMinute !== "00" || (alreadySent.rows as any[]).length > 0) return;
      console.log(`[EP Agent] Morning briefing sending — ${now.toISOString()}`);

      const orgs = await db.execute(sql`SELECT id FROM saas_organizations`);
      for (const org of orgs.rows as any[]) {
        const orgId = org.id;
        try {
          for (const entity of ["GB", "NG"] as const) {
            const todayStr = now.toISOString().slice(0, 10);
            const closedStatuses = ['awarded','closed','cancelled','won','lost','unsuccessful','withdrawn','complete'];
            const tenders = await db.execute(sql`
              SELECT * FROM saas_tenders
              WHERE org_id = ${orgId}
                AND (country = ${entity} OR country IS NULL)
                AND (status IS NULL OR LOWER(status) NOT IN (${sql.raw(closedStatuses.map(s => `'${s}'`).join(','))}))
                AND (deadline IS NULL OR deadline >= ${todayStr}::text)
              ORDER BY deadline ASC NULLS LAST LIMIT 100
            `);
            const allTenders = filterBriefingTenders(tenders.rows as any[]);
            if (allTenders.length === 0) continue;

            const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
            const deadlineSoon = allTenders.filter((t: any) => isValidDeadline(t.deadline) && new Date(t.deadline) <= in7Days);
            const deadlineNext = allTenders.filter((t: any) => isValidDeadline(t.deadline) && new Date(t.deadline) > in7Days && new Date(t.deadline) <= in14Days);
            const awaitingReview = await db.execute(sql`SELECT s.*, t.title as tender_title FROM saas_tender_bid_sections s LEFT JOIN saas_tenders t ON t.id = s.tender_id WHERE s.org_id = ${orgId} AND s.governance_status = 'awaiting_review'`);
            const statusCounts: Record<string, number> = {};
            allTenders.forEach((t: any) => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });

            const schedScored = allTenders.map((t: any) => ({ ...t, ep_fit: scoreEpBusinessFit(t) }));
            const schedStrong = schedScored.filter((t: any) => t.ep_fit >= 4).sort((a: any, b: any) => {
              const aD = isValidDeadline(a.deadline) ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
              const bD = isValidDeadline(b.deadline) ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
              return aD - bD;
            });
            const schedWatching = schedScored.filter((t: any) => t.ep_fit >= 2 && t.ep_fit < 4).sort((a: any, b: any) => {
              const aD = isValidDeadline(a.deadline) ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
              const bD = isValidDeadline(b.deadline) ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
              return aD - bD;
            });

            const briefingActions = buildBriefingActions({
              deadlineSoon,
              awaitingReview: awaitingReview.rows as any[],
              strongFit: schedStrong,
              watching: schedWatching,
            });

            const sLink = briefingTenderLink;

            const html = `
<h2 style="margin:0 0 6px 0;font-size:22px;color:#330311;">☀️ Good Morning — Daily Bid Briefing</h2>
<p style="margin:0 0 18px 0;"><strong>Date:</strong> ${now.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>

<h3 style="color:#330311;border-bottom:2px solid #330311;padding-bottom:6px;margin:0 0 12px 0;">🎯 EP STRONG FIT</h3>
${schedStrong.length > 0 ? `<ul style="margin:0 0 16px 20px;padding:0;">${schedStrong.map((t: any) => `<li style="margin:0 0 10px 0;">${sLink(t)} — ${safeText(t.buyer)} — <strong>Fit: ${t.ep_fit}/5</strong> · ${briefingDeadlineLabel(t)}</li>`).join("")}</ul>` : "<p style=\"margin:0 0 16px 0;color:#64748b;\">No strong-fit tenders today.</p>"}

<h3 style="color:#475569;border-bottom:1px solid #cbd5e1;padding-bottom:6px;margin:18px 0 12px 0;">👀 WATCHING (Fit 2–3)</h3>
${schedWatching.length > 0 ? `<ul style="margin:0 0 16px 20px;padding:0;">${schedWatching.map((t: any) => `<li style="margin:0 0 8px 0;color:#475569;">${sLink(t)} — ${safeText(t.buyer)} · ${briefingDeadlineLabel(t)}</li>`).join("")}</ul>` : "<p style=\"margin:0 0 16px 0;color:#94a3b8;\">Nothing in the watching list today.</p>"}

<h3 style="margin:18px 0 12px 0;">📋 Bids Awaiting Review</h3>
${(awaitingReview.rows as any[]).length > 0 ? `<ul style="margin:0 0 16px 20px;padding:0;">${(awaitingReview.rows as any[]).map((s: any) => `<li style="margin:0 0 10px 0;">${safeText(s.tender_title)} — ${safeText(s.section_label)}</li>`).join("")}</ul>` : "<p style=\"margin:0 0 16px 0;\">All sections up to date.</p>"}

<h3 style="margin:18px 0 12px 0;">📊 Pipeline Summary</h3>
<ul style="margin:0 0 18px 20px;padding:0;">${Object.entries(statusCounts).map(([s, c]) => `<li style="margin:0 0 8px 0;">${safeText(s)}: ${c}</li>`).join("")}</ul>

<h3 style="margin:18px 0 12px 0;">✅ Today's Actions</h3>
<div style="margin:0 0 16px 0;line-height:1.6;">${renderBriefingActions(briefingActions)}</div>

<p style="margin-top:24px;"><a href="${BRIEFING_PLATFORM_URL}" style="display:inline-block;background:#330311;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Open Tender Centre →</a></p>`;

            await sendRoutedEmail(entity, `Daily Briefing — ${now.toLocaleDateString("en-GB")}`, html, orgId);
            await db.execute(sql`INSERT INTO saas_automation_log (org_id, entity, action, result, email_sent) VALUES (${orgId}, ${entity}, 'scheduled_morning_briefing', 'Sent at 07:00 UK time', true)`).catch(() => {});
          }
        } catch (orgErr: any) {
          console.error(`[EP Agent] Morning briefing error org ${orgId}:`, orgErr.message);
        }
      }
    } catch (err: any) {
      console.error("[EP Agent] Morning briefing scheduler error:", err.message);
    }
  }

  // MUTED — morning briefing consolidated into the 07:30 daily digest.
  // All tender info (sweep summary, new tenders, deadlines, discovery runs,
  // pipeline stats) is in one email from tender-deadline-mailer.ts.
  // setInterval(runScheduledMorningBriefing, 60 * 1000);
  // console.log("[EP Agent] Morning briefing scheduler started — fires daily at 07:00 UK time");

  // ─── TENDER FINDER CONFIGURATION & SEARCH (Phase 2 SaaS UI) ──────────────────

  // Initialize search config table if not exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS saas_tender_search_config (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL,
      country VARCHAR(2) DEFAULT 'GB',
      keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
      categories TEXT[] DEFAULT ARRAY[]::TEXT[],
      regions TEXT[] DEFAULT ARRAY[]::TEXT[],
      sme_suitable BOOLEAN DEFAULT FALSE,
      procedure_types TEXT[] DEFAULT ARRAY[]::TEXT[],
      date_from DATE,
      date_to DATE,
      digest_email VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(org_id, country)
    )
  `).catch(() => {});

  // ──────────────────────────────────────────────────────────────────────────────
  // POST /api/saas-tender/config — Save or update search configuration
  app.post("/api/saas-tender/config", authenticateSaasUser, async (req: any, res) => {
    try {
      const { country = "GB", keywords = [], categories = [], regions = [], sme_suitable = false, procedure_types = [], date_from, date_to, digest_email } = req.body;
      const orgId = req.saasUser.orgId;

      const existing = await db.execute(sql`SELECT id FROM saas_tender_search_config WHERE org_id = ${orgId} AND country = ${country}`);
      
      if (existing.rows.length > 0) {
        const result = await db.execute(sql`
          UPDATE saas_tender_search_config 
          SET keywords = ${keywords}::TEXT[], 
              categories = ${categories}::TEXT[], 
              regions = ${regions}::TEXT[],
              sme_suitable = ${sme_suitable},
              procedure_types = ${procedure_types}::TEXT[],
              date_from = ${date_from || null},
              date_to = ${date_to || null},
              digest_email = ${digest_email || null},
              updated_at = NOW()
          WHERE org_id = ${orgId} AND country = ${country}
          RETURNING *
        `);
        res.json(result.rows[0]);
      } else {
        const result = await db.execute(sql`
          INSERT INTO saas_tender_search_config 
          (org_id, country, keywords, categories, regions, sme_suitable, procedure_types, date_from, date_to, digest_email)
          VALUES (${orgId}, ${country}, ${keywords}::TEXT[], ${categories}::TEXT[], ${regions}::TEXT[], ${sme_suitable}, ${procedure_types}::TEXT[], ${date_from || null}, ${date_to || null}, ${digest_email || null})
          RETURNING *
        `);
        res.json(result.rows[0]);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // GET /api/saas-tender/config — Get search configuration for org
  app.get("/api/saas-tender/config", authenticateSaasUser, async (req: any, res) => {
    try {
      const { country = "GB" } = req.query;
      const orgId = req.saasUser.orgId;

      let config = await db.execute(sql`SELECT * FROM saas_tender_search_config WHERE org_id = ${orgId} AND country = ${country}`);
      
      if (config.rows.length === 0) {
        // Return pre-loaded defaults for this country
        const defaults = country === "NG" ? {
          country: "NG",
          keywords: ["event management nigeria", "programme delivery africa", "conference management lagos", "government events nigeria", "international development west africa", "NGO events", "stakeholder engagement africa", "delegate management"],
          categories: ["Professional Services", "Event Management", "Programme Management", "International Development", "Government Services"],
          regions: ["Nigeria", "Ghana", "Senegal", "Gambia", "Kenya", "Uganda"],
          digest_email: "admin@eventperfekt.com"
        } : {
          country: "GB",
          keywords: ["programme delivery", "project management", "event management", "conference management", "Africa programme", "international development", "cross-border delivery", "stakeholder engagement", "PMO", "programme support", "government events", "workshop delivery", "delegate management", "logistics management"],
          categories: ["Professional Services", "Programme Management", "Event Management", "Consultancy", "International Development", "Government Services", "Training and Development", "Logistics"],
          regions: ["United Kingdom"],
          digest_email: "adminuk@eventperfekt.com"
        };
        return res.json(defaults);
      }
      res.json(config.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Contracts Finder API Integration
  async function searchContractsFinder(query: string, params: any = {}): Promise<any[]> {
    try {
      const { keywords = [], categories = [], regions = [], procedure_types = [], date_from, date_to, sme_only = false, page = 1, pageSize = 20 } = params;
      const year = new Date().getFullYear();
      
      const q = keywords.length > 0 ? keywords.join(" ") : query;
      const url = new URL("https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search");
      url.searchParams.set("queryString", q);
      url.searchParams.set("stage", "tender");
      url.searchParams.set("output", "json");
      url.searchParams.set("publishedFrom", date_from || `${year - 1}-01-01`);
      url.searchParams.set("publishedTo", date_to || new Date().toISOString().split("T")[0]);
      url.searchParams.set("size", pageSize.toString());
      
      const res = await fetch(url.toString(), { 
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!res.ok) return [];
      const data = await res.json() as any;
      
      const results: any[] = [];
      const now = new Date();
      
      for (const r of (data?.releases || [])) {
        const t = r.tender || {};
        const dl = t.tenderPeriod?.endDate || "";
        const status = (t.status || "").toLowerCase();
        
        // Filter closed tenders
        if (["closed", "cancelled", "complete", "awarded", "unsuccessful", "withdrawn"].includes(status)) continue;
        
        // Filter by deadline
        if (!dl || new Date(dl) <= now) continue;
        
        // Filter by procedure type if specified
        if (procedure_types.length > 0 && !procedure_types.includes(t.procurementMethod || "")) continue;
        
        const title = (t.title || "").trim();
        const desc = (t.description || "");
        
        // Apply relevance filter (same as sweeper)
        const verdict = evaluateRelevance({ title, buyer: (r.buyer?.name) || "", description: desc });
        if (verdict.excluded || !verdict.passes) continue;
        
        const hay = `${title} ${desc}`.toLowerCase();
        if (EP_EXCLUDE_KEYWORDS.some(k => hay.includes(k))) continue;
        
        const idParts = (r.id || "").split("-");
        const guid = idParts.length >= 5 ? idParts.slice(0, 5).join("-") : (r.id || "");
        
        results.push({
          id: r.id,
          title,
          buyer: r.buyer?.name || "Unknown",
          description: desc.substring(0, 200),
          published_date: (r.date || "").split("T")[0],
          deadline: dl.split("T")[0],
          value: t.value?.amount || null,
          value_estimated: (t.value?.amount ? true : false),
          status: status,
          source: "Contracts Finder",
          url: guid ? `https://www.contractsfinder.service.gov.uk/Notice/${guid}` : "",
          cpv_codes: t.classification?.map((c: any) => c.id) || [],
          procedure_type: t.procurementMethod || "Open",
          sme_suitable: false // CF doesn't always provide this
        });
      }
      
      return results;
    } catch (err) {
      console.error("Contracts Finder search error:", err);
      return [];
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Find a Tender API Integration (requires CDP key)
  async function searchFindATender(query: string, params: any = {}): Promise<any[]> {
    try {
      const { keywords = [], regions = [], date_from, date_to, page = 1, pageSize = 20 } = params;
      const cdpKey = process.env.FIND_A_TENDER_CDP_KEY;
      
      if (!cdpKey) return [];
      
      const q = keywords.length > 0 ? keywords.join(" ") : query;
      const url = new URL("https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages");
      url.searchParams.set("q", q);
      url.searchParams.set("published_from", date_from || new Date().toISOString().split("T")[0]);
      if (date_to) url.searchParams.set("published_to", date_to);
      url.searchParams.set("status", "active");
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", pageSize.toString());
      
      const res = await fetch(url.toString(), {
        headers: { "CDP-Api-Key": cdpKey, Accept: "application/json" },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!res.ok) return [];
      const data = await res.json() as any;
      
      const results: any[] = [];
      const now = new Date();
      
      for (const pkg of (data?.releasePackages || [])) {
        for (const r of (pkg.releases || [])) {
          const t = r.tender || {};
          const dl = t.tenderPeriod?.endDate || "";
          
          if (!dl || new Date(dl) <= now) continue;
          
          const title = (t.title || "").trim();
          const desc = (t.description || "");
          
          const verdict = evaluateRelevance({ title, buyer: (r.buyer?.name) || "", description: desc });
          if (verdict.excluded || !verdict.passes) continue;
          
          const hay = `${title} ${desc}`.toLowerCase();
          if (EP_EXCLUDE_KEYWORDS.some(k => hay.includes(k))) continue;
          
          results.push({
            id: r.ocid,
            title,
            buyer: r.buyer?.name || "Unknown",
            description: desc.substring(0, 200),
            published_date: (r.date || "").split("T")[0],
            deadline: dl.split("T")[0],
            value: t.value?.amount || null,
            value_estimated: (t.value?.amount ? true : false),
            status: "active",
            source: "Find a Tender",
            url: `https://www.find-tender.service.gov.uk/Notice/${r.ocid}`,
            cpv_codes: t.classification?.map((c: any) => c.id) || [],
            procedure_type: t.procurementMethod || "Open",
            sme_suitable: t.smeParticipation === "yes"
          });
        }
      }
      
      return results;
    } catch (err) {
      console.error("Find a Tender search error:", err);
      return [];
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // POST /api/saas-tender/search — Combined tender search from multiple sources
  app.post("/api/saas-tender/search", authenticateSaasUser, async (req: any, res) => {
    try {
      const { query = "", country = "GB", filters = {}, sort = "best_match", page = 1, pageSize = 20 } = req.body;
      const orgId = req.saasUser.orgId;

      // Get user's saved config to merge with request filters
      const config = await db.execute(sql`SELECT * FROM saas_tender_search_config WHERE org_id = ${orgId} AND country = ${country}`).catch(() => ({ rows: [] }));
      const savedConfig = config.rows[0] || {};
      
      const searchParams = {
        keywords: filters.keywords || (savedConfig as any).keywords || [],
        categories: filters.categories || (savedConfig as any).categories || [],
        regions: filters.regions || (savedConfig as any).regions || [],
        procedure_types: filters.procedure_types || (savedConfig as any).procedure_types || [],
        sme_only: filters.sme_only || false,
        date_from: filters.date_from || (savedConfig as any).date_from,
        date_to: filters.date_to || (savedConfig as any).date_to,
        page,
        pageSize
      };

      // Search both sources in parallel
      const [cfResults, fatResults] = await Promise.all([
        country === "GB" ? searchContractsFinder(query, searchParams) : Promise.resolve([]),
        country === "GB" ? searchFindATender(query, searchParams) : Promise.resolve([])
      ]);

      // Merge and deduplicate by title + buyer
      const allResults = [...cfResults, ...fatResults];
      const deduped = new Map();
      for (const r of allResults) {
        const key = `${(r.title || "").toLowerCase()}_${(r.buyer || "").toLowerCase()}`;
        if (!deduped.has(key)) {
          deduped.set(key, r);
        }
      }

      let results = Array.from(deduped.values());

      // Apply sorting
      if (sort === "deadline_soonest") {
        results.sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      } else if (sort === "newest") {
        results.sort((a: any, b: any) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
      } else if (sort === "value_high") {
        results.sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
      }

      // Apply match score (using existing scoring logic)
      const scored = results.map((r: any) => ({
        ...r,
        match_score: scoreEpBusinessFit({
          title: r.title,
          description: r.description,
          buyer: r.buyer,
          category: r.cpv_codes?.[0]
        })
      }));

      // Stats
      const stats = {
        total: scored.length,
        open: scored.filter((r: any) => r.status === "open" || r.status === "active").length,
        closing_soon: scored.filter((r: any) => {
          const days = (new Date(r.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          return days <= 7 && days > 0;
        }).length,
        average_value: scored.reduce((acc: number, r: any) => acc + (r.value || 0), 0) / scored.length || 0
      };

      res.json({
        stats,
        results: scored.slice((page - 1) * pageSize, page * pageSize),
        page,
        page_size: pageSize,
        total_pages: Math.ceil(scored.length / pageSize),
        total_results: scored.length
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}

function fmtDateEmail(d: string | null): string {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); } catch { return d; }
}
