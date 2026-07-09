import { Router } from "express";
import crypto from "crypto";
import { db } from "./db";
import { eq, sql, and, desc, inArray } from "drizzle-orm";
import { growthEvents, growthProspects, growthCampaigns, growthSpendLogs, growthProspectScores, growthOutreach, growthSuppressions, growthReplies, growthPipelineEntries, growthInboundLeads, growthEventTargets, growthMarketInsights, growthPresentations, growthLearningInsights, growthUserPreferences, growthResumeState, growthSponsors, growthSponsorScores, growthPrOpportunities, growthPrScores, growthReferrals, growthCorporateTargets, growthLeadScores, users } from "@workspace/db";
import { growthClients, growthCommsCampaigns, growthCommunications, growthCommunicationAnalytics } from "@workspace/db";
import { growthEmailTemplates } from "@workspace/db";
import { logger } from "./lib/logger";
import { apolloSearch, apolloEnrich } from "./apollo-source";
import { isSuppressed } from "./suppression";
import { AuthService } from "./auth";
import { authenticateToken } from "./auth";
import { sendMail } from "./emailService";
import { resolveSender, renderSignature, shouldIncludePhone, appendSignoff, SENDERS, PROSPECT_CATEGORIES, PROSPECT_STATUSES, DAILY_SEND_CAPS, followupOffsetBusinessDays, projectCadenceOffset, addBusinessDays, buildIdempotencyKey, buildStaggerSlots, staggerMinutesFor, nextPreferredSlot, isWithinSendWindow, OUTREACH_STATUSES } from "./growth-outreach-config";
import { evaluateSendGate, dailyCapReached, writeAudit } from "./growth-send-gate";
import { normalizeOutreachText, findOutreachContentIssues } from "./outreach-format";
import { generateGuestDraft, researchGuest } from "./growth-guest";
import { growthOutreachAudit } from "@workspace/db";
import { callOpenRouter, logSpend, getOpenRouterKey, MODELS } from "./ai-shared";
import {
  conductInterview,
  conductMarketScan,
  generateStrategy,
  saveStrategyPack,
  searchAndStoreProspects,
  enrichProspect,
  scoreProspect,
  generateOutreach,
} from "./growth-pipeline";
import {
  createRun,
  runOrchestrator,
  replyToRun,
  getRunForOwner,
  getElizabethMemory,
} from "./elizabeth-orchestrator";
import { listAgents } from "./agents-registry";
import { buildEmailHtml as buildThemedEmailHtml, BRAND_PRESETS, resolveSmartCta } from "./email-design-system";

const router = Router();

function isDbUnavailableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err || "");
  return /ECONNREFUSED|connect|database|Failed query/i.test(message);
}

function buildLocalDevUser(email = "demo@growth-platform.local") {
  return {
    id: "local-dev-user",
    email,
    username: email,
    name: "Local Demo User",
    role: "client",
    password: "",
  } as any;
}

// ── Growth Auth (Part 1: Real User Accounts) ──────────────────────────────
router.post("/growth/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email?.trim() || !password?.trim() || !name?.trim()) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }
    const existing = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const hashed = await AuthService.hashPassword(password.trim());
    const [user] = await db.insert(users).values({
      email: email.trim().toLowerCase(),
      password: hashed,
      name: name.trim(),
      username: email.trim().toLowerCase(),
      role: "client",
    }).returning();
    const token = AuthService.generateToken(user);
    return res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err: any) {
    logger.error({ err: err.message }, "Growth registration failed");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const found = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
    if (found.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = found[0];
    const valid = await AuthService.verifyPassword(password.trim(), user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = AuthService.generateToken(user);
    return res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err: any) {
    logger.error({ err: err.message }, "Growth login failed");
    if (isDbUnavailableError(err)) {
      const fallbackEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : undefined;
      const fallbackUser = buildLocalDevUser(fallbackEmail);
      const token = AuthService.generateToken(fallbackUser);
      return res.status(200).json({
        ok: true,
        token,
        degraded: true,
        user: { id: fallbackUser.id, name: fallbackUser.name, email: fallbackUser.email },
        warning: "Database unavailable. Using local degraded auth session.",
      });
    }
    return res.status(500).json({ error: err.message });
  }
});

router.get("/growth/auth/me", authenticateToken, async (req: any, res) => {
  try {
    const found = await db.select().from(users).where(eq(users.id, req.user.userId));
    if (found.length === 0) {
      return res.json({
        ok: true,
        degraded: true,
        user: {
          id: req.user.userId,
          name: req.user.username || "Local User",
          email: req.user.email,
          role: req.user.role || "client",
        },
      });
    }
    const user = found[0];
    return res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    if (isDbUnavailableError(err)) {
      return res.json({
        ok: true,
        degraded: true,
        user: {
          id: req.user.userId,
          name: req.user.username || "Local User",
          email: req.user.email,
          role: req.user.role || "client",
        },
      });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ── Password Reset ────────────────────────────────────────
router.post("/growth/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: "Email is required" });
    const found = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
    if (found.length === 0) return res.json({ ok: true, message: "If an account exists, a reset link has been sent." });
    const user = found[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour
    await db.execute(sql`INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (${user.id}, ${token}, ${expiresAt})`);
    const resetUrl = `${req.headers.origin || "https://eventperfekt.com"}/growth-platform/reset-password?token=${token}`;
    const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#330311">Reset your password</h2>
      <p>Click the link below to reset your Growth Intelligence password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#330311;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">Reset Password</a>
      <p style="color:#666;font-size:12px">If you did not request this, ignore this email.</p>
    </div>`;
    await sendMail(user.email, "Reset your Growth Intelligence password", html);
    return res.json({ ok: true, message: "If an account exists, a reset link has been sent." });
  } catch (err: any) {
    logger.error({ err: err.message }, "Password reset request failed");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token?.trim() || !password?.trim()) return res.status(400).json({ error: "Token and password are required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    const result = await db.execute(sql`SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE token = ${token}`);
    const rows = (result as any).rows || (result as any)[0] || [];
    const row = rows[0];
    if (!row) return res.status(400).json({ error: "Invalid or expired token" });
    const userId = row.user_id as string;
    const expiresAt = row.expires_at ? new Date(row.expires_at as string) : null;
    const usedAt = row.used_at ? new Date(row.used_at as string) : null;
    if (usedAt) return res.status(400).json({ error: "Token already used" });
    if (expiresAt && expiresAt < new Date()) return res.status(400).json({ error: "Token expired" });
    const hashed = await AuthService.hashPassword(password.trim());
    await db.execute(sql`UPDATE users SET password = ${hashed} WHERE id = ${userId}`);
    await db.execute(sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE token = ${token}`);
    return res.json({ ok: true, message: "Password reset successfully. You can now log in." });
  } catch (err: any) {
    logger.error({ err: err.message }, "Password reset failed");
    return res.status(500).json({ error: err.message });
  }
});

// ── Demo Account ────────────────────────────────────────
router.post("/growth/auth/demo", async (req, res) => {
  try {
    const demoEmail = `demo-${Date.now()}@growth-platform.local`;
    const demoPassword = `DemoPass123!`;
    const hashed = await AuthService.hashPassword(demoPassword);
    const [user] = await db.insert(users).values({
      email: demoEmail,
      password: hashed,
      name: "Demo User",
      username: demoEmail,
      role: "client",
    }).returning();

    // Seed a sample event for the demo user
    const [event] = await db.insert(growthEvents).values({
      name: "Demo Event — I Am Her September 2026",
      description: "A luxury wellbeing evening for accomplished women leaders.",
      location: "Milton Keynes",
      type: "general",
      status: "strategy_ready",
      ownerId: user.id,
    }).returning();

    // Seed sample prospects
    await db.insert(growthProspects).values([
      {
        eventId: event.id,
        ownerId: user.id,
        prospectType: "audience",
        name: "Sarah Williams",
        title: "CEO",
        email: "sarah@techventures.com",
        company: "Tech Ventures Ltd",
        companySize: "50-200",
        industry: "Technology",
        location: "London, UK",
        source: "manual",
        confidenceLevel: "high",
        verified: true,
      },
      {
        eventId: event.id,
        ownerId: user.id,
        prospectType: "audience",
        name: "Amanda Chen",
        title: "Managing Director",
        email: "amanda@greenfield.co.uk",
        company: "Greenfield Consulting",
        companySize: "10-50",
        industry: "Consulting",
        location: "Manchester, UK",
        source: "manual",
        confidenceLevel: "high",
        verified: true,
      },
      {
        eventId: event.id,
        ownerId: user.id,
        prospectType: "sponsor",
        name: "Victoria Hayes",
        title: "Head of Partnerships",
        email: "v.hayes@luxuryhotels.com",
        company: "Luxury Hotels Group",
        companySize: "500+",
        industry: "Hospitality",
        location: "Birmingham, UK",
        source: "manual",
        confidenceLevel: "medium",
        verified: false,
      },
      {
        eventId: event.id,
        ownerId: user.id,
        prospectType: "audience",
        name: "Rachel Okafor",
        title: "Founder",
        email: "rachel@wellnessstudio.co",
        company: "Wellness Studio Co",
        companySize: "10-50",
        industry: "Health & Wellness",
        location: "Bristol, UK",
        source: "manual",
        confidenceLevel: "high",
        verified: true,
      },
    ]);

    const token = AuthService.generateToken(user);
    return res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email }, demoPassword, event: { id: event.id, name: event.name } });
  } catch (err: any) {
    logger.error({ err: err.message }, "Demo account creation failed");
    if (isDbUnavailableError(err)) {
      const fallbackUser = buildLocalDevUser();
      const token = AuthService.generateToken(fallbackUser);
      return res.json({
        ok: true,
        degraded: true,
        token,
        user: { id: fallbackUser.id, name: fallbackUser.name, email: fallbackUser.email },
        event: { id: "local-dev-event", name: "Local Demo Event" },
        warning: "Database unavailable. Using local demo mode.",
      });
    }
    return res.status(500).json({ error: err.message });
  }
});

// OpenRouter helpers, model config, and spend logging now live in ./ai-shared
// (imported above) so routes, the pipeline, and the orchestrator share one copy.

// ── Email HTML builder ─────────────────────────────────────────────────────
// Delegates to the branded modular design system. Picks a theme from the event's
// positioning tier and renders the AI-written body cleanly — no hardcoded brand,
// no date/venue/price info-dump (which the email redesign explicitly removed).
// Clean, personal letter-style email — Poppins, generous whitespace, real
// bullet lists where the body uses "-", "*" or "•". Reads like a note from
// Lynda, not a marketing blast. (Poppins renders where the client supports web
// fonts; falls back to a clean sans stack elsewhere.)
function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function bodyToHtml(body: string): string {
  // Global readability pass first: sentence capitals, bullet capitals, clean
  // spacing — applied here so EVERY rendered outreach email is formatted the same
  // regardless of where its body came from (template, DB, AI, hand-pasted).
  const lines = normalizeOutreachText(body).replace(/\r/g, "").split("\n");
  let html = "";
  let para: string[] = [];
  let bullets: string[] = [];
  const flushPara = () => {
    if (para.length) { html += `<p style="margin:0 0 16px;line-height:1.6;">${para.map(esc).join("<br>")}</p>`; para = []; }
  };
  const flushBullets = () => {
    if (bullets.length) {
      html += `<ul style="margin:0 0 18px 22px;padding:0;">${bullets.map((b) => `<li style="margin:0 0 7px;line-height:1.55;">${esc(b)}</li>`).join("")}</ul>`;
      bullets = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushBullets(); flushPara(); continue; }
    const m = line.match(/^[-*•]\s+(.*)$/);
    if (m) { flushPara(); bullets.push(m[1]); }
    else { flushBullets(); para.push(line); }
  }
  flushBullets();
  flushPara();
  return html;
}
/** Renders an email that reads like a direct personal letter from Lynda.
 *  No marketing-style unsubscribe footer. No "manage preferences" language.
 *  The body should already contain any needed human opt-out line ("not relevant" replies).
 *  The visible footer is a minimal brand line only. */
function buildEmailHtml(subject: string, body: string, _event?: any, opts?: { plain?: boolean }): string {
  const inner = bodyToHtml(body);
  // PLAIN by default — every outreach email (guest, partner, sponsor, media) reads
  // as a personal email straight from Lynda's desk: white background, black text,
  // normal spacing, no branded card, no coloured backdrop, no footer strip. The
  // branded card is only used if a caller explicitly opts out of plain.
  if (opts?.plain !== false) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(subject || "")}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:600px;margin:0 auto;padding:24px 20px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.6;color:#000000;background:#ffffff;">
${inner}
</div>
</body></html>`;
  }
  // Branded card (opt-in only via { plain: false }).
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<title>${esc(subject || "")}</title></head>
<body style="margin:0;padding:0;background:#330311;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#330311;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;">
<tr><td style="padding:34px 38px;font-family:'Poppins','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#1A1714;">
${inner}
</td></tr></table>
</td></tr></table>
</body></html>`;
}

// ── Health check ──────────────────────────────────────────────────────────
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "growth-platform" });
});

// ── Auth middleware for ALL protected growth routes ──────────────────────
// All routes below this line require a valid JWT token
router.use((req: any, res: any, next: any) => {
  // Only guard this router's own routes. It is mounted at "/api" (not
  // "/api/growth"), so without this prefix check the catch-all would 401
  // every other /api/* route registered after it (tender SaaS, etc.).
  if (!req.path.startsWith("/growth")) return next();
  // Skip auth endpoints (already handled above)
  if (req.path.startsWith("/growth/auth/")) return next();
  authenticateToken(req, res, next);
});

// ── Growth Events CRUD ────────────────────────────────────────────────────
router.get("/growth/events", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const events = await db.select().from(growthEvents).where(eq(growthEvents.ownerId, ownerId)).orderBy(growthEvents.createdAt);
    return res.json(events);
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list growth events");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/events", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { name, description, type, status, startDate, endDate } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });
    const [event] = await db.insert(growthEvents).values({
      name: name.trim(),
      description: description || null,
      type: type || "general",
      status: status || "draft",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      ownerId, // auto-set from logged-in user
    }).returning();
    return res.status(201).json(event);
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create growth event");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/growth/events/:id", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const [event] = await db.select().from(growthEvents).where(eq(growthEvents.id, req.params.id));
    if (!event) return res.status(404).json({ error: "Not found" });
    if (event.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    return res.json(event);
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get growth event");
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/growth/events/:id", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { name, description, type, status, startDate, endDate, location, outreachConfig } = req.body;
    // A project is editable by its owner, or if it has no owner yet (legacy /
    // unclaimed projects) — in which case editing claims it for this user, so the
    // module is usable per commercial account without manual ownership fixes.
    const [current] = await db.select({ ownerId: growthEvents.ownerId }).from(growthEvents).where(eq(growthEvents.id, req.params.id));
    if (!current) return res.status(404).json({ error: "Not found" });
    if (current.ownerId && current.ownerId !== ownerId) return res.status(403).json({ error: "Not your project" });
    const claimOwner = current.ownerId ? {} : { ownerId };
    const [event] = await db.update(growthEvents).set({
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(type !== undefined && { type }),
      ...(status !== undefined && { status }),
      ...(location !== undefined && { location: location || null }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(outreachConfig !== undefined && { outreachConfig }),
      ...claimOwner,
      updatedAt: new Date(),
    }).where(eq(growthEvents.id, req.params.id)).returning();
    if (!event) return res.status(404).json({ error: "Not found" });
    return res.json(event);
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to update growth event");
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/growth/events/:id", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const [event] = await db.delete(growthEvents)
      .where(and(eq(growthEvents.id, req.params.id), eq(growthEvents.ownerId, ownerId)))
      .returning();
    if (!event) return res.status(404).json({ error: "Not found" });
    return res.status(204).end();
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to delete growth event");
    return res.status(500).json({ error: err.message });
  }
});

// ── Growth Dashboard ────────────────────────────────────────────────────────
router.get("/growth/dashboard", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const [events] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthEvents).where(eq(growthEvents.ownerId, ownerId));
    const [prospects] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthProspects).where(eq(growthProspects.ownerId, ownerId));
    const [campaigns] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthCampaigns).where(eq(growthCampaigns.ownerId, ownerId));
    const [spend] = await db.select({ total: sql<number>`COALESCE(SUM(cost), 0)::decimal` }).from(growthSpendLogs).where(eq(growthSpendLogs.ownerId, ownerId));

    // Get recent events with progress
    const recentEvents = await db.select({
      id: growthEvents.id,
      name: growthEvents.name,
      status: growthEvents.status,
      startDate: growthEvents.startDate,
      strategyPack: growthEvents.strategyPack,
    }).from(growthEvents).where(eq(growthEvents.ownerId, ownerId)).orderBy(desc(growthEvents.createdAt)).limit(5);

    const eventIds = recentEvents.map((e) => e.id);
    const prospectCounts = eventIds.length > 0
      ? await db.select({ eventId: growthProspects.eventId, count: sql<number>`COUNT(*)::int` })
          .from(growthProspects)
          .where(inArray(growthProspects.eventId, eventIds))
          .groupBy(growthProspects.eventId)
      : [];

    const pipelineCounts = eventIds.length > 0
      ? await db.select({ eventId: growthPipelineEntries.eventId, count: sql<number>`COUNT(*)::int` })
          .from(growthPipelineEntries)
          .where(inArray(growthPipelineEntries.eventId, eventIds))
          .groupBy(growthPipelineEntries.eventId)
      : [];

    const enrichedEvents = recentEvents.map((e) => {
      const pCount = prospectCounts.find((c) => c.eventId === e.id)?.count ?? 0;
      const plCount = pipelineCounts.find((c) => c.eventId === e.id)?.count ?? 0;
      return { ...e, prospectCount: pCount, pipelineCount: plCount };
    });

    return res.json({
      totalEvents: events.count || 0,
      totalProspects: prospects.count || 0,
      totalCampaigns: campaigns.count || 0,
      totalSpend: Number(spend.total || 0),
      status: "ok",
      version: "0.0.1",
      recentEvents: enrichedEvents,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get dashboard");
    return res.status(500).json({ error: err.message });
  }
});

// ── AI Test ───────────────────────────────────────────────────────────────
router.post("/ai/test", async (req, res) => {
  const ownerId = req.user?.userId;
  if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
  const start = Date.now();
  try {
    const { prompt = "Say hello and confirm you are working." } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.Open_router_AI;
    if (!apiKey) {
      return res.status(400).json({ error: "OPENROUTER_API_KEY not configured" });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": `https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}`,
        "X-Title": "Event Growth Platform",
      },
      body: JSON.stringify({
        model: MODELS.classify,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error({ status: response.status, body: text }, "OpenRouter error");
      return res.status(500).json({ error: `OpenRouter responded with ${response.status}` });
    }

    const data = await response.json() as any;
    const choice = data.choices?.[0];
    const usage = data.usage || {};
    const cost = ((usage.prompt_tokens || 0) + (usage.completion_tokens || 0)) * 0.0000015;

    // Log spend
    await db.insert(growthSpendLogs).values({
      operation: "ai_test",
      vendor: "openrouter",
      cost: cost.toString(),
      model: MODELS.classify,
      metadata: { prompt, tokens: usage },
    });

    return res.json({
      ok: true,
      response: choice?.message?.content || "No response",
      model: MODELS.classify,
      usage: {
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
      },
      cost,
      latency_ms: Date.now() - start,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "AI test failed");
    return res.status(500).json({
      ok: false,
      error: err.message,
      latency_ms: Date.now() - start,
    });
  }
});

// ── Wizard Interview ──────────────────────────────────────────────────────
// Claude interviews the user, asking follow-up questions to fill gaps in the
// plain-language goal.  Returns structured data that can be used downstream.
router.post("/growth/wizard/interview", async (req, res) => {
  const start = Date.now();
  try {
    const { messages = [], eventId, goal } = req.body;
    const ownerId = req.user?.userId;
    const { result, cost, model } = await conductInterview(ownerId, { messages, eventId, goal });
    return res.json({ ok: true, result, latency_ms: Date.now() - start, cost, model });
  } catch (err: any) {
    logger.error({ err: err.message }, "Wizard interview failed");
    return res.status(500).json({ ok: false, error: err.message, latency_ms: Date.now() - start });
  }
});

// ── Wizard Market Scan ───────────────────────────────────────────────────
// Research-capable model scans the market for the event type / audience / location.
router.post("/growth/wizard/market-scan", async (req, res) => {
  const start = Date.now();
  try {
    const { eventType, location, audience, capacity, positioningTier } = req.body;
    const ownerId = req.user?.userId;
    const { result, cost, model } = await conductMarketScan({ eventType, location, audience, capacity, positioningTier }, ownerId);
    return res.json({ ok: true, result, latency_ms: Date.now() - start, cost, model });
  } catch (err: any) {
    logger.error({ err: err.message }, "Wizard market scan failed");
    return res.status(500).json({ ok: false, error: err.message, latency_ms: Date.now() - start });
  }
});

// ── Strategy Pack CRUD ────────────────────────────────────────────────────
router.get("/growth/events/:id/strategy-pack", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const [event] = await db.select().from(growthEvents).where(eq(growthEvents.id, req.params.id));
    if (event && event.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    if (!event) return res.status(404).json({ error: "Not found" });
    return res.json({
      ok: true,
      strategyPack: event.strategyPack,
      status: event.status,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get strategy pack");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/events/:id/strategy-pack", async (req, res) => {
  try {
    const { strategyPack, approved } = req.body;
    const ownerId = req.user?.userId;
    const event = await saveStrategyPack(req.params.id, ownerId, strategyPack, approved);
    if (!event) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, event, status: event.status, preferencesSaved: !!(approved && ownerId) });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to save strategy pack");
    return res.status(500).json({ error: err.message });
  }
});

// ── Strategy Pack Generation (combines interview + market scan) ──────────
router.post("/growth/events/:id/generate-strategy", async (req, res) => {
  const start = Date.now();
  try {
    const { interviewData, marketScan } = req.body;
    const ownerId = req.user?.userId;
    const { result, cost, model } = await generateStrategy(req.params.id, { interviewData, marketScan }, ownerId);
    return res.json({ ok: true, result, latency_ms: Date.now() - start, cost, model });
  } catch (err: any) {
    logger.error({ err: err.message }, "Generate strategy failed");
    return res.status(500).json({ ok: false, error: err.message, latency_ms: Date.now() - start });
  }
});

// ── Prospect Discovery — Apollo Search & Enrich —──────────────────────────────────
// Search is free (no enrichment credits). Enrichment only on explicit selection.
// buildSearchParams / dedup / store logic now live in ./growth-pipeline.

// Search prospects from strategy pack
router.post("/growth/events/:id/prospects/search", async (req, res) => {
  const start = Date.now();
  try {
    const ownerId = req.user?.userId;
    const { prospectType = "audience" } = req.body;
    const out = await searchAndStoreProspects(req.params.id, prospectType, ownerId);
    return res.json({ ok: true, ...out, latency_ms: Date.now() - start });
  } catch (err: any) {
    logger.error({ err: err.message }, "Prospect search failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Explicit enrichment — only when a human selects a prospect
router.post("/growth/prospects/:id/enrich", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { prospect, creditsUsed } = await enrichProspect(req.params.id, ownerId);
    return res.json({ ok: true, prospect, creditsUsed });
  } catch (err: any) {
    logger.error({ err: err.message }, "Prospect enrichment failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// List prospects for an event
router.get("/growth/events/:id/prospects", async (req, res) => {
  try {
    const { type, enriched } = req.query;
    const conditions: any[] = [eq(growthProspects.eventId, req.params.id)];
    if (type) conditions.push(eq(growthProspects.prospectType, type as string));
    if (enriched === "true") conditions.push(eq(growthProspects.enriched, true));
    if (enriched === "false") conditions.push(eq(growthProspects.enriched, false));

    const prospects = await db.select().from(growthProspects)
      .where(and(...conditions))
      .orderBy(desc(growthProspects.createdAt));

    // Fetch scores for each prospect
    const prospectIds = prospects.map(p => p.id);
    const scores = prospectIds.length > 0
      ? await db.select().from(growthProspectScores)
          .where(inArray(growthProspectScores.prospectId, prospectIds))
      : [];

    const scoresByProspectId = new Map(scores.map(s => [s.prospectId, s]));

    const enrichedProspects = prospects.map(p => {
      const score = scoresByProspectId.get(p.id);
      return {
        ...p,
        score: score?.score ?? undefined,
        scoreReasons: score?.reasons ?? undefined,
      };
    });

    return res.json({ ok: true, prospects: enrichedProspects });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list prospects");
    return res.status(500).json({ error: err.message });
  }
});

// Delete a prospect
router.delete("/growth/prospects/:id", async (req, res) => {
  try {
    const [prospect] = await db.delete(growthProspects).where(eq(growthProspects.id, req.params.id)).returning();
    if (!prospect) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, deleted: prospect.id });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to delete prospect");
    return res.status(500).json({ error: err.message });
  }
});

// Get total enrichment credits used for an event
router.get("/growth/events/:id/enrichment-credits", async (req, res) => {
  try {
    const result = await db.select({
      total: sql<number>`COALESCE(SUM(${growthProspects.enrichmentCost}), 0)`,
      count: sql<number>`COUNT(*)`,
    }).from(growthProspects).where(
      and(eq(growthProspects.eventId, req.params.id), eq(growthProspects.enriched, true))
    );

    return res.json({
      ok: true,
      creditsUsed: Number(result[0]?.total || 0),
      enrichedCount: Number(result[0]?.count || 0),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get enrichment credits");
    return res.status(500).json({ error: err.message });
  }
});

// ── Phase 3: Scoring, Screening & Outreach Generation ──────────────────────────
// HUMAN GATE: nothing sends without approval. No auto-send anywhere.

// 1. SCORE a prospect against the strategy pack persona
router.post("/growth/prospects/:id/score", async (req, res) => {
  const start = Date.now();
  try {
    const ownerId = req.user?.userId;
    const { score, cost } = await scoreProspect(req.params.id, ownerId);
    return res.json({ ok: true, score, latency_ms: Date.now() - start, cost });
  } catch (err: any) {
    logger.error({ err: err.message }, "Prospect scoring failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 1b. RELATIONSHIP INTELLIGENCE: explain why a prospect is recommended
router.post("/growth/prospects/:id/relationship-intelligence", async (req, res) => {
  const start = Date.now();
  try {
    const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, req.params.id));
    if (!prospect) return res.status(404).json({ error: "Prospect not found" });

    const [event] = await db.select().from(growthEvents).where(eq(growthEvents.id, prospect.eventId!));
    if (!event || !event.strategyPack) return res.status(400).json({ error: "No strategy pack for this event" });

    const pack = event.strategyPack as any;
    const personas = prospect.prospectType === "sponsor" ? pack.sponsor_personas : pack.audience_personas;

    const systemPrompt = `You are a relationship intelligence analyst. Explain why this prospect is recommended (or not recommended) for the event.

Return ONLY JSON:
{
  "fit_score": "high|medium|low",
  "fit_reason": "string (one sentence)",
  "signals": [
    { "type": "location|industry|seniority|company_size|engagement", "label": "string", "value": "positive|negative|neutral" }
  ],
  "engagement_insights": "string (what would make them respond)",
  "recommended_approach": "string (how to reach them)",
  "priority": "high|medium|low"
}

Be specific. Use their actual title, company, and industry. Do not use generic phrases like "great fit" without explanation.`;

    const prompt = `EVENT: ${event.name}
Persona: ${JSON.stringify(personas?.[0] || {}, null, 2)}

PROSPECT:
Name: ${prospect.name}
Title: ${prospect.title}
Company: ${prospect.company}
Location: ${prospect.location}
Industry: ${prospect.industry}
Company size: ${prospect.companySize}

Why is this prospect recommended?`;

    const { content, usage, cost, model } = await callOpenRouter(
      MODELS.drafting,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      { maxTokens: 1000, temperature: 0.3, jsonMode: true }
    );

    await logSpend("relationship_intelligence", model, cost, { prospectId: prospect.id, eventId: event.id, usage });

    let intelligence: any;
    try {
      intelligence = JSON.parse(content.replace(/^```json\s*/, "").replace(/\s*```$/, ""));
    } catch {
      intelligence = {
        fit_score: "medium",
        fit_reason: "Could not generate intelligence",
        signals: [],
        engagement_insights: "",
        recommended_approach: "",
        priority: "medium",
      };
    }

    return res.json({
      ok: true,
      intelligence,
      latency_ms: Date.now() - start,
      cost,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Relationship intelligence failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 2. HUMAN SCREEN: approve or reject a prospect
router.post("/growth/prospects/:id/approve", async (req, res) => {
  try {
    const [prospect] = await db.update(growthProspects)
      .set({ status: "approved_for_outreach" })
      .where(eq(growthProspects.id, req.params.id))
      .returning();
    if (!prospect) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, prospect });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to approve prospect");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/prospects/:id/reject", async (req, res) => {
  try {
    const [prospect] = await db.update(growthProspects)
      .set({ status: "rejected" })
      .where(eq(growthProspects.id, req.params.id))
      .returning();
    if (!prospect) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, prospect });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to reject prospect");
    return res.status(500).json({ error: err.message });
  }
});

// 3. OUTREACH GENERATION: generate 4-touch cadence for an approved prospect
// Only generates. Nothing sends. All messages land in pending queue.
// GUEST RESEARCH AI — propose guest-intelligence locked fields from existing data.
// Recommends only; never sets approval, so the send gate still requires Lynda's
// sign-off. Lynda reviews the proposal, edits if needed, then approves to lock.
router.post("/growth/guest/:id/research", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const result = await researchGuest({ prospectId: req.params.id, eventId: req.body?.eventId, force: !!req.body?.force }, ownerId);
    return res.json(result);
  } catch (err: any) {
    logger.error({ err: err.message }, "guest research failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GUEST EMAIL AI — assemble a guest invitation strictly from the approved master
// template + locked guest-intelligence fields. Never sends; drops a draft into the
// 'pending' approval queue. Returns a stop-condition status when research/approval
// is incomplete ("Missing guest intelligence — human approval needed").
router.post("/growth/guest/:id/generate", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const result = await generateGuestDraft({ prospectId: req.params.id, eventId: req.body?.eventId }, ownerId);
    // Attach the EXACT HTML the guest will receive so the preview and the sent
    // email are identical — plain personal email, Lynda's signature, no branded
    // card. (Cold guest first-touch: phone off, per the signature rules.)
    if (result.generated && result.body) {
      const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, req.params.id));
      const evId = req.body?.eventId || prospect?.eventId || null;
      let event: any = null;
      if (evId) { const [ev] = await db.select().from(growthEvents).where(eq(growthEvents.id, evId)); event = ev || null; }
      const bodyWithSig = appendSignoff(result.body, "lynda", shouldIncludePhone("guest", 1));
      const previewHtml = buildEmailHtml(result.subject || "", bodyWithSig, event, { plain: true });
      return res.json({ ...result, previewHtml });
    }
    return res.json(result);
  } catch (err: any) {
    logger.error({ err: err.message }, "guest invitation generation failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/growth/outreach/generate", async (req, res) => {
  const start = Date.now();
  try {
    const { prospectId, eventId } = req.body;
    if (!prospectId || !eventId) return res.status(400).json({ error: "prospectId and eventId required" });
    const ownerId = req.user?.userId;
    const { messages, count, cost } = await generateOutreach({ prospectId, eventId }, ownerId);
    return res.json({ ok: true, messages, count, latency_ms: Date.now() - start, cost });
  } catch (err: any) {
    logger.error({ err: err.message }, "Outreach generation failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 3a-preview. EMAIL AI — Workflow 2: generate a PREVIEW only from approved
// locked fields. Hard stop conditions; no browsing, no invention, no send.
// Returns the structured output: subject, body, ask, benefits, risk flags, status.
router.post("/growth/outreach/preview", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { prospectId, eventId } = req.body;
    if (!prospectId || !eventId) return res.status(400).json({ error: "prospectId and eventId required" });

    const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, prospectId));
    if (!prospect) return res.status(404).json({ error: "Prospect not found" });

    // ── STOP CONDITIONS — refuse to generate when approved locked data is missing.
    const isDNC = prospect.status === "do_not_contact" || prospect.category === "do_not_contact";
    if (isDNC) {
      return res.json({ ok: true, generated: false, status: "Do not generate", reason: "Prospect is marked Do Not Contact" });
    }
    const missing: string[] = [];
    if (!prospect.whyThem) missing.push("prospect_reason");
    if (!prospect.specificAsk) missing.push("specific_ask");
    if (!prospect.whatTheyReceive) missing.push("what_they_receive");
    const contactVerified = !!prospect.emailVerified && !!prospect.contactRouteVerified;
    const approved = ["approved_for_outreach", "approved"].includes(prospect.status || "");
    if (missing.length > 0 || !contactVerified || !approved) {
      const reasons = [
        ...missing.map((m) => `${m} missing`),
        !contactVerified ? "contact not verified" : null,
        !approved ? "status not Approved for Outreach" : null,
      ].filter(Boolean);
      return res.json({ ok: true, generated: false, status: "Missing required data", reason: `Missing required data — human approval needed: ${reasons.join(", ")}` });
    }

    // Clear stale pending drafts so re-previewing doesn't pile up duplicates.
    await db.delete(growthOutreach).where(and(eq(growthOutreach.prospectId, prospectId), eq(growthOutreach.status, "pending")));

    // Email AI assembles from approved locked fields (no invention, no browsing).
    const { messages } = await generateOutreach({ prospectId, eventId }, ownerId);
    const first = messages[0];

    // Risk flags — scan generated copy for the project's banned language / banned
    // CTA phrases and obviously weak content the human should check before sending.
    const [ev] = await db.select({ outreachConfig: growthEvents.outreachConfig }).from(growthEvents).where(eq(growthEvents.id, eventId));
    const cfg: any = ev?.outreachConfig || null;
    const banned = [...(cfg?.bannedLanguage || []), ...(cfg?.bannedCtaPhrases || [])];
    const hay = `${first?.subject || ""}\n${first?.body || ""}`.toLowerCase();
    const riskFlags: string[] = [];
    for (const b of banned) { if (b && hay.includes(String(b).toLowerCase())) riskFlags.push(`Uses banned language: "${b}"`); }
    if ((first?.body || "").length < 200) riskFlags.push("Body looks short — review for completeness");

    const status = riskFlags.length > 0 ? "Needs human approval" : "Ready for review";
    return res.json({
      ok: true,
      generated: true,
      status,
      preview: {
        subject: first?.subject || "",
        body: first?.body || "",
        ask: prospect.specificAsk,
        benefits: prospect.whatTheyReceive,
        riskFlags,
      },
      draftId: first?.id || null,
      touches: messages.length,
      note: "Preview only — nothing has been sent. Approve the draft to enable send.",
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "outreach preview failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 3b. MESSAGING STUDIO: generate specific message templates
router.post("/growth/outreach/templates", async (req, res) => {
  const start = Date.now();
  try {
    const { eventId, templateType, prospectId } = req.body;
    if (!eventId || !templateType) return res.status(400).json({ error: "eventId and templateType required" });

    const [event] = await db.select().from(growthEvents).where(eq(growthEvents.id, eventId));
    if (!event || !event.strategyPack) return res.status(400).json({ error: "No strategy pack" });

    const pack = event.strategyPack as any;
    const tier = pack.positioning_tier || "mid-market";

    let prospect: any = null;
    if (prospectId) {
      const [p] = await db.select().from(growthProspects).where(eq(growthProspects.id, prospectId));
      prospect = p;
    }

    const systemPrompt = `You are a senior outreach writer. Write a ${templateType} for a ${tier} event.

TIER RULES:
- Premium: restrained, elevated, specific. No generic empowerment clichés. Concrete value.
- Mid-market: value-led, professional.
- Mass-market: urgent, scarcity-driven.

OUTPUT: JSON object with { "subject": "...", "body": "...", "channel": "email|linkedin" }

RULES:
1. Personalise from prospect data if available — never invent facts.
2. Use the event's tone from the strategy pack.
3. Do NOT include any opt-out, "not relevant", or unsubscribe line — end the message at the sign-off.
4. Keep LinkedIn messages shorter (under 300 chars).
5. Return ONLY the JSON object.`;

    const prompt = `EVENT: ${event.name}
Tier: ${tier}
Tagline: ${pack.messaging_recommendations?.tagline || ""}
Tone: ${pack.messaging_recommendations?.tone || "professional"}
Ticket: ${pack.pricing_recommendations?.ticket_price || ""}

TEMPLATE TYPE: ${templateType}

${prospect ? `PROSPECT:
Name: ${prospect.name}
Title: ${prospect.title}
Company: ${prospect.company}
Location: ${prospect.location}
Industry: ${prospect.industry}` : "No specific prospect — write a template that can be personalised later."}

Write ONE ${templateType} message.

Do not include any opt-out or "not relevant" line — end the message at the sign-off.`;

    const { content, usage, cost, model } = await callOpenRouter(
      MODELS.drafting,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      { maxTokens: 1200, temperature: 0.6, jsonMode: true }
    );

    await logSpend("template_generate", model, cost, { eventId, templateType, prospectId, usage });

    let template: any;
    try {
      template = JSON.parse(content.replace(/^```json\s*/, "").replace(/\s*```$/, ""));
    } catch {
      template = { subject: "Error", body: "Could not generate template", channel: "email" };
    }

    return res.json({
      ok: true,
      template,
      templateType,
      latency_ms: Date.now() - start,
      cost,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Template generation failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 3d. AI OUTREACH WORKSPACE: refine a message with AI
router.post("/growth/outreach/refine", async (req, res) => {
  const start = Date.now();
  try {
    const { message, instruction, prospect, event, messageType, channel } = req.body;
    if (!message || !instruction) return res.status(400).json({ error: "message and instruction required" });

    const systemPrompt = `You are a senior outreach editor. Rewrite the message based ONLY on the user's instruction.

RULES:
1. Keep the original intent and personalisation.
2. Follow the instruction precisely — but don't make the message worse.
3. Maintain the same tone (from the strategy pack).
4. If the instruction says "shorter" — reduce by 20-40%.
5. If the instruction says "longer" — add depth, not fluff.
6. If the instruction says "more premium" — elevate vocabulary, remove clichés.
7. If the instruction says "less salesy" — remove urgency, add curiosity.
8. If the instruction says "stronger CTA" — make the ask clearer and more specific.
9. Do NOT include any opt-out, "not relevant", or unsubscribe line — end the message at the sign-off.
10. Keep LinkedIn under 300 chars if LinkedIn.

OUTPUT: JSON with { "body": "rewritten message", "subject": "rewritten subject (if email)", "change_summary": "brief description of what changed" }`;

    const prompt = `CURRENT MESSAGE:
${message}

${prospect ? `PROSPECT:
Name: ${prospect.name}
Title: ${prospect.title}
Company: ${prospect.company}` : ""}

${event ? `EVENT: ${event.name}
Tone: ${event.tone || "professional"}` : ""}

MESSAGE TYPE: ${messageType || "outreach"}
CHANNEL: ${channel || "email"}

INSTRUCTION: ${instruction}

Rewrite the message following the instruction. Return only JSON.`;

    const { content, usage, cost, model } = await callOpenRouter(
      MODELS.drafting,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      { maxTokens: 1200, temperature: 0.5, jsonMode: true }
    );

    await logSpend("outreach_refine", model, cost, { instruction, channel, messageLength: message.length, usage });

    let result: any;
    try {
      result = JSON.parse(content.replace(/^```json\s*/, "").replace(/\s*```$/, ""));
    } catch {
      result = { body: message, subject: "", change_summary: "Could not apply changes. Original message preserved." };
    }

    return res.json({
      ok: true,
      refined: result,
      latency_ms: Date.now() - start,
      cost,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Outreach refinement failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 3e. AI OUTREACH WORKSPACE: score a message on 7 dimensions
router.post("/growth/outreach/score", async (req, res) => {
  const start = Date.now();
  try {
    const { message, subject, channel, prospectType, messageType } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    const systemPrompt = `You are a message quality analyst. Score the outreach message on 7 dimensions and suggest improvements.

Score each dimension 0-100. Be honest — low scores are fine if the message is weak.

OUTPUT: JSON with {
  "personalisation": 0-100,
  "clarity": 0-100,
  "tone": 0-100,
  "length": 0-100,
  "relevance": 0-100,
  "call_to_action": 0-100,
  "overall": 0-100,
  "tips": ["specific improvement tip 1", "tip 2", ...]
}`;

    const prompt = `MESSAGE:
${subject ? `Subject: ${subject}\n` : ""}Body: ${message}

CHANNEL: ${channel || "email"}
PROSPECT TYPE: ${prospectType || "general"}
MESSAGE TYPE: ${messageType || "outreach"}

Score the message and provide 2-3 specific improvement tips.`;

    const { content, usage, cost, model } = await callOpenRouter(
      MODELS.classify,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      { maxTokens: 1000, temperature: 0.2, jsonMode: true }
    );

    await logSpend("outreach_score", model, cost, { channel, prospectType, messageLength: message.length, usage });

    let scores: any;
    try {
      scores = JSON.parse(content.replace(/^```json\s*/, "").replace(/\s*```$/, ""));
    } catch {
      scores = {
        personalisation: 50, clarity: 50, tone: 50, length: 50, relevance: 50, call_to_action: 50, overall: 50,
        tips: ["Could not score message. Please review manually."],
      };
    }

    return res.json({
      ok: true,
      scores,
      latency_ms: Date.now() - start,
      cost,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Outreach scoring failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 3f. AI OUTREACH WORKSPACE: recommend attachments for a prospect type
router.post("/growth/outreach/recommend-attachments", async (req, res) => {
  try {
    const { prospectType, tier, eventId } = req.body;
    if (!prospectType) return res.status(400).json({ error: "prospectType required" });

    const recommendations = {
      sponsor: [
        { type: "sponsor_deck", label: "Sponsor Deck", priority: "high", reason: "Sponsors expect a structured pitch deck" },
        { type: "event_brochure", label: "Event Brochure", priority: "medium", reason: "Shows event scale and audience profile" },
        { type: "partnership_proposal", label: "Partnership Proposal", priority: "medium", reason: "For partnership-tier discussions" },
      ],
      audience: [
        { type: "event_brochure", label: "Event Brochure", priority: "high", reason: "Prospects want to see what the event is" },
        { type: "vip_invitation", label: "VIP Invitation", priority: "low", reason: "Only if this is a VIP segment" },
      ],
      media: [
        { type: "media_pack", label: "Media Pack", priority: "high", reason: "Journalists need story angles and press assets" },
        { type: "event_brochure", label: "Event Brochure", priority: "medium", reason: "Context on the event" },
      ],
      speaker: [
        { type: "speaker_pack", label: "Speaker Pack", priority: "high", reason: "Speakers need to know the stage and audience" },
        { type: "event_brochure", label: "Event Brochure", priority: "medium", reason: "Context for the speaker's talk" },
      ],
      partner: [
        { type: "partnership_proposal", label: "Partnership Proposal", priority: "high", reason: "Partners need commercial terms" },
        { type: "event_brochure", label: "Event Brochure", priority: "medium", reason: "Shows event credibility" },
      ],
      vip: [
        { type: "vip_invitation", label: "VIP Invitation", priority: "high", reason: "VIP guests expect a dedicated invitation" },
        { type: "event_brochure", label: "Event Brochure", priority: "low", reason: "Optional context" },
      ],
    };

    const list = (recommendations as any)[prospectType] || recommendations.audience;

    // If eventId provided, check which presentations already exist
    let existing: any[] = [];
    if (eventId) {
      existing = await db.select()
        .from(growthPresentations)
        .where(eq(growthPresentations.eventId, eventId));
    }

    const enriched = list.map((rec: any) => {
      const found = existing.find((e: any) => e.presentationType === rec.type);
      return {
        ...rec,
        available: !!found,
        presentationId: found?.id || null,
      };
    });

    return res.json({
      ok: true,
      recommendations: enriched,
      prospectType,
      tier: tier || "mid-market",
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Attachment recommendations failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 3c. PRESENTATION STUDIO: generate presentation documents
router.post("/growth/presentations", async (req, res) => {
  const start = Date.now();
  try {
    const { eventId, presentationType } = req.body;
    if (!eventId || !presentationType) return res.status(400).json({ error: "eventId and presentationType required" });

    const [event] = await db.select().from(growthEvents).where(eq(growthEvents.id, eventId));
    if (!event || !event.strategyPack) return res.status(400).json({ error: "No strategy pack" });

    const pack = event.strategyPack as any;
    const tier = pack.positioning_tier || "mid-market";

    const typeLabels: Record<string, string> = {
      sponsor_deck: "Sponsor Pitch Deck",
      event_brochure: "Event Brochure",
      speaker_pack: "Speaker Pack",
      partnership_proposal: "Partnership Proposal",
      vip_invitation: "VIP Invitation Pack",
    };

    const systemPrompt = `You are a senior presentation designer and copywriter. Generate a ${typeLabels[presentationType]} for a ${tier} event.

TIER RULES:
- Premium: restrained, elevated, specific. No generic empowerment clichés. Concrete value.
- Mid-market: value-led, professional.
- Mass-market: urgent, scarcity-driven.

OUTPUT: JSON object with:
{
  "title": "string",
  "slides": [
    {
      "slideNumber": 1,
      "title": "string",
      "body": "string (HTML allowed, keep concise)",
      "type": "title|content|stats|quote|cta"
    }
  ],
  "content": {
    "headline": "string",
    "subheadline": "string",
    "key_points": ["string"],
    "statistics": [
      { "label": "string", "value": "string" }
    ],
    "testimonials": [
      { "quote": "string", "author": "string" }
    ],
    "call_to_action": "string"
  }
}

Return ONLY the JSON object.`;

    const prompt = `EVENT: ${event.name}
Tier: ${tier}
Tagline: ${pack.messaging_recommendations?.tagline || ""}
Tone: ${pack.messaging_recommendations?.tone || "professional"}
Ticket price: ${pack.pricing_recommendations?.ticket_price || "TBD"}
Target audience: ${pack.target_audience?.description || ""}

PRESENTATION TYPE: ${typeLabels[presentationType]}

${pack.audience_personas ? `Personas: ${JSON.stringify(pack.audience_personas.slice(0, 2), null, 2)}` : ""}

Generate a compelling ${typeLabels[presentationType]} with 5-7 slides.`;

    const { content, usage, cost, model } = await callOpenRouter(
      MODELS.drafting,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      { maxTokens: 2500, temperature: 0.5, jsonMode: true }
    );

    await logSpend("presentation_generate", model, cost, { eventId, presentationType, usage });

    let result: any;
    try {
      result = JSON.parse(content.replace(/^```json\s*/, "").replace(/\s*```$/, ""));
    } catch {
      result = {
        title: typeLabels[presentationType],
        slides: [{ slideNumber: 1, title: "Error", body: "Could not generate presentation", type: "title" }],
        content: { headline: "Error", subheadline: "Generation failed", key_points: [], statistics: [], testimonials: [], call_to_action: "" },
      };
    }

    // Store the presentation
    const [presentation] = await db.insert(growthPresentations).values({
      eventId,
      presentationType,
      title: result.title || typeLabels[presentationType],
      content: result.content || result,
      slides: result.slides || [],
      html: null,
      status: "draft",
      cost: String(cost || 0),
      generatedBy: model,
    }).returning();

    return res.json({
      ok: true,
      presentation: {
        ...presentation,
        cost: Number(cost),
      },
      latency_ms: Date.now() - start,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Presentation generation failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// List presentations for an event
router.get("/growth/presentations", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: "eventId required" });

    const presentations = await db.select()
      .from(growthPresentations)
      .where(eq(growthPresentations.eventId, eventId as string))
      .orderBy(desc(growthPresentations.createdAt));

    return res.json({ ok: true, presentations });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list presentations");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Get single presentation
router.get("/growth/presentations/:id", async (req, res) => {
  try {
    const [presentation] = await db.select()
      .from(growthPresentations)
      .where(eq(growthPresentations.id, req.params.id));
    if (!presentation) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, presentation });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get presentation");
    return res.status(500).json({ error: err.message });
  }
});

// 4. APPROVAL QUEUE: list pending messages
router.get("/growth/outreach/queue", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { eventId, status } = req.query;
    const conditions: any[] = [];
    if (eventId) conditions.push(eq(growthOutreach.eventId, eventId as string));
    if (status) conditions.push(eq(growthOutreach.status, status as string));
    else conditions.push(eq(growthOutreach.status, "pending"));

    const messages = await db.select()
      .from(growthOutreach)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(growthOutreach.createdAt));

    // Fetch prospect details for each message
    const prospectIds = [...new Set(messages.map(m => m.prospectId).filter(Boolean))] as string[];
    const prospects = prospectIds.length > 0
      ? await db.select({ id: growthProspects.id, name: growthProspects.name, title: growthProspects.title, company: growthProspects.company })
          .from(growthProspects)
          .where(inArray(growthProspects.id, prospectIds))
      : [];
    const prospectsById = new Map(prospects.map(p => [p.id, p]));

    const enrichedMessages = messages.map(m => {
      const p = prospectsById.get(m.prospectId!);
      return {
        ...m,
        prospectName: p?.name ?? "Unknown",
        prospectTitle: p?.title ?? "",
        prospectCompany: p?.company ?? "",
      };
    });

    return res.json({ ok: true, messages: enrichedMessages });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list outreach queue");
    return res.status(500).json({ error: err.message });
  }
});

// Approve a message to send
router.post("/growth/outreach/:id/approve", async (req, res) => {
  try {
    const [msg] = await db.update(growthOutreach)
      .set({ status: "approved", approvedAt: new Date() })
      .where(eq(growthOutreach.id, req.params.id))
      .returning();
    if (!msg) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, message: msg });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to approve outreach");
    return res.status(500).json({ error: err.message });
  }
});

// Reject a message
router.post("/growth/outreach/:id/reject", async (req, res) => {
  try {
    const [msg] = await db.update(growthOutreach)
      .set({ status: "rejected" })
      .where(eq(growthOutreach.id, req.params.id))
      .returning();
    if (!msg) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, message: msg });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to reject outreach");
    return res.status(500).json({ error: err.message });
  }
});

// 5. SEND — HARD GATE: only if status is "approved"
router.post("/growth/outreach/:id/send", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const [msg] = await db.select().from(growthOutreach).where(eq(growthOutreach.id, req.params.id));
    if (!msg) return res.status(404).json({ error: "Not found" });
    // Manual "Send Now" works for an approved message OR a row already scheduled
    // (the scheduler hands control back to the human). Pending-approval and
    // terminal states are not sendable here.
    if (!["approved", "scheduled"].includes(msg.status)) {
      return res.status(400).json({ error: "Message must be approved (or scheduled) before sending" });
    }

    const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, msg.prospectId!));
    if (!prospect) return res.status(404).json({ error: "Prospect not found" });

    // FULL SEND GATE — re-checked here at send time, identical to the scheduler's
    // check. "scheduled does not mean guaranteed send": the gate runs again now.
    const actor = (req as any).user?.email || ownerId;
    const gate = await evaluateSendGate(msg, prospect);
    if (!gate.ok) {
      await writeAudit({ action: "blocked", outreachId: msg.id, prospectId: prospect.id, campaignId: msg.campaignId, sequenceStep: msg.sequencePosition, actor, reason: gate.failures.join(", ") });
      return res.status(400).json({ error: `Send blocked — gate not met: ${gate.failures.join(", ")}` });
    }

    // DAILY SEND CAP per category (guest 20 / sponsor 5 / media 5 / hotel 3 …).
    const { reached, cap } = await dailyCapReached(prospect.category);
    if (reached) {
      await writeAudit({ action: "blocked", outreachId: msg.id, prospectId: prospect.id, campaignId: msg.campaignId, sequenceStep: msg.sequencePosition, actor, reason: `daily cap reached (${prospect.category} ${cap}/day)` });
      return res.status(429).json({ error: `Daily send cap reached for ${prospect.category} (${cap}/day). Try again tomorrow.` });
    }

    // HUMAN GATE: nothing auto-sends. ATOMIC SEND-CLAIM (idempotency lock): flip
    // the current sendable status -> sent in one guarded update. Only one request
    // can win this transition, so the same step can never send twice — even under
    // a double-click, a Send-Now racing the cron, or two scheduler passes.
    const senderForMsg = msg.senderEmail || resolveSender(req.body?.senderId).id;
    const idemKey = msg.idempotencyKey || buildIdempotencyKey(prospect.id, msg.campaignId, msg.sequencePosition);
    const [updated] = await db.update(growthOutreach)
      .set({ status: "sent", sentAt: new Date(), senderEmail: senderForMsg, idempotencyKey: idemKey })
      .where(and(eq(growthOutreach.id, req.params.id), eq(growthOutreach.status, msg.status)))
      .returning();
    if (!updated) {
      return res.status(409).json({ error: "Already sent (duplicate send prevented) — this step has already gone out." });
    }
    await writeAudit({ action: "sent", outreachId: msg.id, prospectId: prospect.id, campaignId: msg.campaignId, sequenceStep: msg.sequencePosition, actor, idempotencyKey: idemKey, metadata: { path: "manual", sender: senderForMsg } });

    // Send real email
    if (prospect?.email) {
      try {
        let event: any = null;
        if (msg.eventId) {
          const events = await db.select().from(growthEvents).where(eq(growthEvents.id, msg.eventId));
          event = events[0] ?? null;
        }
        // All outreach is a plain personal email from Lynda with exactly ONE
        // sign-off. appendSignoff strips any sign-off already in the body and adds
        // a single "Warm regards," + signature (phone only where the rules allow).
        const sender = resolveSender(msg.senderEmail);
        const includePhone = shouldIncludePhone(prospect.category, msg.sequencePosition);
        const bodyWithSig = appendSignoff(msg.body, sender.id, includePhone);
        const html = buildEmailHtml(msg.subject || "", bodyWithSig, event, { plain: true });
        await sendMail(
          prospect.email,
          msg.subject || "I Am Her — Invitation",
          html,
          undefined,
          "GB",
          undefined,
          undefined,
          { name: sender.name, email: sender.email }
        );
        // Do not log the recipient's email address (PII) in spend metadata.
        await logSpend("email_send", "nodemailer", 0, { eventId: msg.eventId, prospectId: msg.prospectId, channel: msg.channel });
      } catch (err: any) {
        logger.error({ err: err.message }, "Email send failed");
      }
    }

    // On the first touch, schedule the follow-up cadence (EP sequence model):
    // sibling pending touches become "scheduled" at +5-day intervals and are
    // sent by the growth sequence executor unless the prospect replies/bounces.
    if (msg.sequencePosition === 1 && msg.prospectId) {
      const siblings = await db.select().from(growthOutreach)
        .where(and(eq(growthOutreach.prospectId, msg.prospectId), eq(growthOutreach.status, "pending")));
      // Prefer the project's per-category cadence (outreachConfig.cadenceBusinessDays);
      // falls back to the global brisk default 0 -> 2 -> 5.
      let projectCfg: any = null;
      if (msg.eventId) {
        const [ev] = await db.select({ outreachConfig: growthEvents.outreachConfig }).from(growthEvents).where(eq(growthEvents.id, msg.eventId));
        projectCfg = ev?.outreachConfig || null;
      }
      for (const s of siblings) {
        if (s.sequencePosition > 1) {
          // Business-day cadence (skips weekends): project override or global default.
          const offsetBd = projectCadenceOffset(projectCfg, prospect.category, s.sequencePosition);
          const due = addBusinessDays(new Date(), offsetBd);
          const sKey = s.idempotencyKey || buildIdempotencyKey(prospect.id, s.campaignId ?? msg.campaignId, s.sequencePosition);
          await db.update(growthOutreach)
            .set({ status: "scheduled", scheduledFor: due, senderEmail: senderForMsg, idempotencyKey: sKey, scheduleApproved: true, scheduledBy: actor })
            .where(eq(growthOutreach.id, s.id));
          await writeAudit({ action: "scheduled", outreachId: s.id, prospectId: prospect.id, campaignId: s.campaignId ?? msg.campaignId, sequenceStep: s.sequencePosition, actor, newScheduledFor: due, idempotencyKey: sKey, metadata: { auto: "followup_cadence" } });
        }
      }
      await db.update(growthProspects).set({ status: "in_sequence" }).where(eq(growthProspects.id, msg.prospectId));
    }

    // Auto-advance pipeline to "contacted" on send
    if (msg.prospectId && msg.eventId) {
      try {
        const existing = await db.select().from(growthPipelineEntries)
          .where(
            and(
              eq(growthPipelineEntries.eventId, msg.eventId),
              eq(growthPipelineEntries.prospectId, msg.prospectId),
              eq(growthPipelineEntries.pipelineType, "audience")
            )
          )
          .limit(1);
        if (existing.length > 0) {
          const entry = existing[0];
          const idx = AUDIENCE_STAGES.indexOf(entry.stage);
          if (idx >= 0 && idx < AUDIENCE_STAGES.indexOf("contacted")) {
            await db.update(growthPipelineEntries)
              .set({ stage: "contacted", movedBy: "system", updatedAt: new Date() })
              .where(eq(growthPipelineEntries.id, entry.id));
          }
        } else {
          await db.insert(growthPipelineEntries).values({
            eventId: msg.eventId,
            prospectId: msg.prospectId,
            pipelineType: "audience",
            stage: "contacted",
            movedBy: "system",
          });
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, "Pipeline auto-advance on send failed (non-critical)");
      }
    }

    return res.json({
      ok: true,
      message: updated,
      sent: true,
      note: "This is the HARD GATE. In production, this would call an email provider.",
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to send outreach");
    return res.status(500).json({ error: err.message });
  }
});

// ── Scheduler: schedule / cancel / reschedule / stop / cancel follow-ups ─────
// The real rule: scheduled ≠ guaranteed send. Every send re-checks the gate at
// send time (shared evaluateSendGate). These endpoints only move rows between
// scheduler states and write the audit trail; the actual send still goes
// through the gated /send path or the cron executor.

const SCHEDULABLE = ["pending", "approved", "scheduled", "scheduled_pending_approval", "paused"];
const CANCELLABLE = ["pending", "approved", "scheduled", "scheduled_pending_approval", "paused"];

function parseWhen(when: any): Date | null {
  if (!when || when === "next") return nextPreferredSlot(new Date());
  const d = new Date(when);
  return isNaN(d.getTime()) ? null : d;
}

// 1. Schedule a single approved email — Send later (date/time/sender). Pass
//    requireApproval:true for the Elizabeth flow (scheduled_pending_approval).
router.post("/growth/outreach/:id/schedule", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const actor = (req as any).user?.email || ownerId;
    const { when, senderId, requireApproval, override } = req.body || {};

    const [msg] = await db.select().from(growthOutreach).where(eq(growthOutreach.id, req.params.id));
    if (!msg) return res.status(404).json({ error: "Not found" });
    if (!SCHEDULABLE.includes(msg.status)) {
      return res.status(400).json({ error: `Cannot schedule a ${msg.status} message` });
    }
    const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, msg.prospectId!));
    if (!prospect) return res.status(404).json({ error: "Prospect not found" });

    const scheduledFor = parseWhen(when);
    if (!scheduledFor) return res.status(400).json({ error: "Invalid 'when' datetime" });
    if (scheduledFor.getTime() <= Date.now()) return res.status(400).json({ error: "Scheduled time must be in the future" });
    const outsideWindow = !isWithinSendWindow(scheduledFor);
    if (outsideWindow && !override) {
      return res.status(400).json({ error: "Outside the safe send window (Tue–Thu 08:00–16:00, no weekends/bank holidays). Pass override:true to force.", outsideWindow: true });
    }

    const sender = msg.senderEmail || resolveSender(senderId).id;
    const idemKey = msg.idempotencyKey || buildIdempotencyKey(prospect.id, msg.campaignId, msg.sequencePosition);
    const status = requireApproval ? "scheduled_pending_approval" : "scheduled";
    const [updated] = await db.update(growthOutreach)
      .set({ status, scheduledFor, senderEmail: sender, idempotencyKey: idemKey, scheduledBy: actor, scheduleApproved: !requireApproval, canceledAt: null, cancelReason: null })
      .where(and(eq(growthOutreach.id, msg.id), inArray(growthOutreach.status, SCHEDULABLE)))
      .returning();
    if (!updated) return res.status(409).json({ error: "State changed — could not schedule" });
    await writeAudit({ action: requireApproval ? "schedule_pending_approval" : "scheduled", outreachId: msg.id, prospectId: prospect.id, campaignId: msg.campaignId, sequenceStep: msg.sequencePosition, actor, oldScheduledFor: msg.scheduledFor, newScheduledFor: scheduledFor, idempotencyKey: idemKey, metadata: { outsideWindow } });
    return res.json({ ok: true, message: updated, scheduledFor, outsideWindow });
  } catch (err: any) {
    logger.error({ err: err.message }, "schedule failed");
    return res.status(500).json({ error: err.message });
  }
});

// 1b. Confirm a pending-approval schedule (Elizabeth preview → Lynda confirms).
router.post("/growth/outreach/:id/confirm-schedule", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const actor = (req as any).user?.email || ownerId;
    const [updated] = await db.update(growthOutreach)
      .set({ status: "scheduled", scheduleApproved: true })
      .where(and(eq(growthOutreach.id, req.params.id), eq(growthOutreach.status, "scheduled_pending_approval")))
      .returning();
    if (!updated) return res.status(409).json({ error: "Nothing pending approval to confirm" });
    await writeAudit({ action: "scheduled", outreachId: updated.id, prospectId: updated.prospectId, campaignId: updated.campaignId, sequenceStep: updated.sequencePosition, actor, newScheduledFor: updated.scheduledFor, idempotencyKey: updated.idempotencyKey, metadata: { confirmedFrom: "pending_approval" } });
    return res.json({ ok: true, message: updated });
  } catch (err: any) {
    logger.error({ err: err.message }, "confirm-schedule failed");
    return res.status(500).json({ error: err.message });
  }
});

// 2. Cancel Scheduled Send — only before it sends. Never "unsend".
router.post("/growth/outreach/:id/cancel", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const actor = (req as any).user?.email || ownerId;
    const reason = req.body?.reason || "Cancelled scheduled send";
    const [msg] = await db.select().from(growthOutreach).where(eq(growthOutreach.id, req.params.id));
    if (!msg) return res.status(404).json({ error: "Not found" });
    if (msg.status === "sent") return res.status(400).json({ error: "Already sent — a sent email cannot be unsent. Use Stop Sequence to halt future follow-ups." });
    if (msg.status === "cancelled") return res.json({ ok: true, message: msg, alreadyCancelled: true });
    const [updated] = await db.update(growthOutreach)
      .set({ status: "cancelled", canceledAt: new Date(), cancelReason: reason })
      .where(and(eq(growthOutreach.id, msg.id), inArray(growthOutreach.status, CANCELLABLE)))
      .returning();
    if (!updated) return res.status(409).json({ error: "State changed — could not cancel (it may have just sent)" });
    await writeAudit({ action: "cancelled", outreachId: msg.id, prospectId: msg.prospectId, campaignId: msg.campaignId, sequenceStep: msg.sequencePosition, actor, oldScheduledFor: msg.scheduledFor, reason });
    return res.json({ ok: true, message: updated });
  } catch (err: any) {
    logger.error({ err: err.message }, "cancel failed");
    return res.status(500).json({ error: err.message });
  }
});

// 3. Reschedule — change the date/time before it sends.
router.post("/growth/outreach/:id/reschedule", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const actor = (req as any).user?.email || ownerId;
    const { when, override } = req.body || {};
    const [msg] = await db.select().from(growthOutreach).where(eq(growthOutreach.id, req.params.id));
    if (!msg) return res.status(404).json({ error: "Not found" });
    if (msg.status === "sent") return res.status(400).json({ error: "Already sent — cannot reschedule a sent email" });
    if (!["scheduled", "scheduled_pending_approval"].includes(msg.status)) {
      return res.status(400).json({ error: "Only a scheduled email can be rescheduled" });
    }
    const newTime = parseWhen(when);
    if (!newTime || when === "next") return res.status(400).json({ error: "A target 'when' datetime is required" });
    if (newTime.getTime() <= Date.now()) return res.status(400).json({ error: "New time must be in the future" });
    if (!isWithinSendWindow(newTime) && !override) {
      return res.status(400).json({ error: "Outside the safe send window. Pass override:true to force.", outsideWindow: true });
    }
    const [updated] = await db.update(growthOutreach)
      .set({ scheduledFor: newTime })
      .where(and(eq(growthOutreach.id, msg.id), inArray(growthOutreach.status, ["scheduled", "scheduled_pending_approval"])))
      .returning();
    if (!updated) return res.status(409).json({ error: "State changed — could not reschedule" });
    await writeAudit({ action: "rescheduled", outreachId: msg.id, prospectId: msg.prospectId, campaignId: msg.campaignId, sequenceStep: msg.sequencePosition, actor, oldScheduledFor: msg.scheduledFor, newScheduledFor: newTime });
    return res.json({ ok: true, message: updated, oldScheduledFor: msg.scheduledFor, newScheduledFor: newTime });
  } catch (err: any) {
    logger.error({ err: err.message }, "reschedule failed");
    return res.status(500).json({ error: err.message });
  }
});

// 4. Stop Sequence — cancel ALL future emails/follow-ups for a prospect. Keeps
//    sent records. Optionally marks Do Not Contact (+ suppression).
router.post("/growth/prospects/:id/stop-sequence", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const actor = (req as any).user?.email || ownerId;
    const { reason, markDoNotContact } = req.body || {};
    const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, req.params.id));
    if (!prospect) return res.status(404).json({ error: "Prospect not found" });

    const rows = await db.select().from(growthOutreach)
      .where(and(eq(growthOutreach.prospectId, prospect.id), inArray(growthOutreach.status, CANCELLABLE)));
    let cancelled = 0;
    for (const r of rows) {
      const [u] = await db.update(growthOutreach)
        .set({ status: "cancelled", canceledAt: new Date(), cancelReason: reason || "Stop sequence" })
        .where(and(eq(growthOutreach.id, r.id), inArray(growthOutreach.status, CANCELLABLE)))
        .returning();
      if (u) { cancelled++; await writeAudit({ action: "cancelled", outreachId: r.id, prospectId: prospect.id, campaignId: r.campaignId, sequenceStep: r.sequencePosition, actor, oldScheduledFor: r.scheduledFor, reason: reason || "Stop sequence" }); }
    }
    const newStatus = markDoNotContact ? "do_not_contact" : "declined";
    await db.update(growthProspects).set({ status: newStatus }).where(eq(growthProspects.id, prospect.id));
    if (markDoNotContact && prospect.email) {
      try {
        const exists = await db.select({ id: growthSuppressions.id }).from(growthSuppressions).where(eq(growthSuppressions.email, prospect.email));
        if (exists.length === 0) await db.insert(growthSuppressions).values({ email: prospect.email, reason: "human" });
      } catch { /* non-critical */ }
    }
    await writeAudit({ action: "stop_sequence", prospectId: prospect.id, actor, reason: reason || null, metadata: { cancelled, newStatus, markDoNotContact: !!markDoNotContact } });
    return res.json({ ok: true, cancelled, prospectStatus: newStatus });
  } catch (err: any) {
    logger.error({ err: err.message }, "stop-sequence failed");
    return res.status(500).json({ error: err.message });
  }
});

// 5. Cancel Future Follow-ups — keep the sent Email 1, cancel FU1 + Final.
router.post("/growth/prospects/:id/cancel-followups", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const actor = (req as any).user?.email || ownerId;
    const reason = req.body?.reason || "Cancel future follow-ups";
    const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, req.params.id));
    if (!prospect) return res.status(404).json({ error: "Prospect not found" });
    const rows = await db.select().from(growthOutreach)
      .where(and(eq(growthOutreach.prospectId, prospect.id), inArray(growthOutreach.status, CANCELLABLE)));
    let cancelled = 0;
    for (const r of rows) {
      if ((r.sequencePosition || 1) <= 1) continue; // keep Email 1
      const [u] = await db.update(growthOutreach)
        .set({ status: "cancelled", canceledAt: new Date(), cancelReason: reason })
        .where(and(eq(growthOutreach.id, r.id), inArray(growthOutreach.status, CANCELLABLE)))
        .returning();
      if (u) { cancelled++; await writeAudit({ action: "cancel_followups", outreachId: r.id, prospectId: prospect.id, campaignId: r.campaignId, sequenceStep: r.sequencePosition, actor, oldScheduledFor: r.scheduledFor, reason }); }
    }
    return res.json({ ok: true, cancelled });
  } catch (err: any) {
    logger.error({ err: err.message }, "cancel-followups failed");
    return res.status(500).json({ error: err.message });
  }
});

// 6. Batch schedule — stagger by default (per-category gap), inside the window.
router.post("/growth/outreach/batch-schedule", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const actor = (req as any).user?.email || ownerId;
    const { ids, start, stagger = true, requireApproval = false, override = false } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids[] required" });
    const startDate = start ? new Date(start) : nextPreferredSlot(new Date());
    if (isNaN(startDate.getTime())) return res.status(400).json({ error: "Invalid start datetime" });

    const msgs = await db.select().from(growthOutreach).where(inArray(growthOutreach.id, ids));
    const prospectIds = [...new Set(msgs.map((m) => m.prospectId).filter(Boolean))] as string[];
    const prospects = prospectIds.length
      ? await db.select().from(growthProspects).where(inArray(growthProspects.id, prospectIds))
      : [];
    const catById = new Map(prospects.map((p) => [p.id, p.category]));
    const categories = prospects.map((p) => p.category);
    const gap = stagger ? Math.max(...categories.map(staggerMinutesFor), staggerMinutesFor(null)) : 0;
    const slots = stagger ? buildStaggerSlots(startDate, msgs.length, gap) : msgs.map(() => startDate);
    if (!override && slots.some((s) => !isWithinSendWindow(s))) {
      return res.status(400).json({ error: "Some staggered slots fall outside the safe send window. Pass override:true or pick a window start.", outsideWindow: true });
    }

    const batchId = crypto.randomUUID();
    const status = requireApproval ? "scheduled_pending_approval" : "scheduled";
    const results: any[] = [];
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      if (["sent", "cancelled"].includes(m.status)) { results.push({ id: m.id, skipped: m.status }); continue; }
      const slot = slots[i];
      const idemKey = m.idempotencyKey || buildIdempotencyKey(m.prospectId!, m.campaignId, m.sequencePosition);
      const [u] = await db.update(growthOutreach)
        .set({ status, scheduledFor: slot, idempotencyKey: idemKey, scheduledBy: actor, scheduleApproved: !requireApproval, staggerGroup: batchId, canceledAt: null, cancelReason: null })
        .where(and(eq(growthOutreach.id, m.id), inArray(growthOutreach.status, SCHEDULABLE)))
        .returning();
      if (!u) { results.push({ id: m.id, skipped: "state_changed" }); continue; }
      await writeAudit({ action: requireApproval ? "schedule_pending_approval" : "scheduled", outreachId: m.id, prospectId: m.prospectId, campaignId: m.campaignId, sequenceStep: m.sequencePosition, actor, oldScheduledFor: m.scheduledFor, newScheduledFor: slot, idempotencyKey: idemKey, metadata: { batch: batchId, stagger, gap, category: catById.get(m.prospectId!) } });
      results.push({ id: m.id, scheduledFor: slot });
    }
    return res.json({ ok: true, batchId, stagger, gapMinutes: gap, scheduled: results.filter((r) => r.scheduledFor).length, results });
  } catch (err: any) {
    logger.error({ err: err.message }, "batch-schedule failed");
    return res.status(500).json({ error: err.message });
  }
});

// 7. Scheduler view — buckets for Outreach Control.
router.get("/growth/outreach/schedule", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const eventId = (req.query.eventId as string) || null;
    const base = eventId ? await db.select().from(growthOutreach).where(eq(growthOutreach.eventId, eventId))
                         : await db.select().from(growthOutreach);
    const pIds = [...new Set(base.map((m) => m.prospectId).filter(Boolean))] as string[];
    const prospects = pIds.length ? await db.select().from(growthProspects).where(inArray(growthProspects.id, pIds)) : [];
    const pById = new Map(prospects.map((p) => [p.id, p]));

    const now = new Date();
    const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
    const endTomorrow = new Date(endToday); endTomorrow.setDate(endTomorrow.getDate() + 1);
    const enrich = (m: any) => {
      const p = pById.get(m.prospectId);
      return {
        id: m.id, prospectId: m.prospectId, prospectName: p?.name || "—", recipient: p?.email || null,
        category: p?.category || null, sender: m.senderEmail || "lynda", subject: m.subject,
        sequenceStep: m.sequencePosition, status: m.status, scheduledFor: m.scheduledFor,
        scheduleApproved: m.scheduleApproved, idempotencyKey: m.idempotencyKey, cancelReason: m.cancelReason,
      };
    };
    const isScheduled = (m: any) => ["scheduled", "scheduled_pending_approval"].includes(m.status);
    const scheduled = base.filter(isScheduled);
    const buckets = {
      scheduled: scheduled.map(enrich),
      pendingApproval: base.filter((m) => m.status === "scheduled_pending_approval").map(enrich),
      dueToday: scheduled.filter((m) => m.scheduledFor && new Date(m.scheduledFor) <= endToday).map(enrich),
      dueTomorrow: scheduled.filter((m) => m.scheduledFor && new Date(m.scheduledFor) > endToday && new Date(m.scheduledFor) <= endTomorrow).map(enrich),
      overdue: scheduled.filter((m) => m.scheduledFor && new Date(m.scheduledFor) < now).map(enrich),
      followUpsDue: scheduled.filter((m) => (m.sequencePosition || 1) > 1 && m.scheduledFor && new Date(m.scheduledFor) <= now).map(enrich),
      cancelled: base.filter((m) => m.status === "cancelled").map(enrich),
      failed: base.filter((m) => m.status === "failed").map(enrich),
      paused: base.filter((m) => m.status === "paused").map(enrich),
      stoppedSequences: prospects.filter((p) => ["declined", "do_not_contact"].includes(p.status || "")).map((p) => ({ prospectId: p.id, prospectName: p.name, status: p.status })),
    };
    return res.json({ ok: true, counts: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, (v as any[]).length])), buckets });
  } catch (err: any) {
    logger.error({ err: err.message }, "schedule view failed");
    return res.status(500).json({ error: err.message });
  }
});

// 8. Audit trail (most-recent first), optionally filtered by prospect.
router.get("/growth/outreach/audit", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const prospectId = req.query.prospectId as string | undefined;
    const rows = prospectId
      ? await db.select().from(growthOutreachAudit).where(eq(growthOutreachAudit.prospectId, prospectId)).orderBy(desc(growthOutreachAudit.createdAt)).limit(200)
      : await db.select().from(growthOutreachAudit).orderBy(desc(growthOutreachAudit.createdAt)).limit(200);
    return res.json({ ok: true, audit: rows });
  } catch (err: any) {
    logger.error({ err: err.message }, "audit view failed");
    return res.status(500).json({ error: err.message });
  }
});

// 9. Elizabeth scheduling — parse a natural-language command into a structured
//    PREVIEW only. Nothing is scheduled until Lynda confirms via the schedule /
//    reschedule / cancel endpoints. Flow: command → preview → confirm.
router.post("/growth/elizabeth/schedule-command", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { command, eventId } = req.body || {};
    if (!command || typeof command !== "string") return res.status(400).json({ error: "command required" });

    const nowIso = new Date().toISOString();
    const sys = `You convert a UK event team's natural-language scheduling request into JSON. Today is ${nowIso} (Europe/London).
Return ONLY JSON: {"action":"schedule|reschedule|cancel|stop_sequence|unknown","target":"<prospect name, company, or batch label>","isBatch":boolean,"when":"<ISO 8601 or null>","timezone":"Europe/London","step":<1-3 or null>,"sender":"lynda|admin|null","notes":"<short>"}.
Resolve relative times (e.g. "9am tomorrow", "Monday 10am", "Friday 9:30am") to absolute ISO using today's date. If no time given for a day, use 09:00. Never invent a prospect; copy the name/label as written.`;
    let parsed: any = null;
    try {
      const { content } = await callOpenRouter(MODELS.classify, [
        { role: "system", content: sys },
        { role: "user", content: command },
      ], { temperature: 0, maxTokens: 300, jsonMode: true });
      const m = String(content).match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch (e: any) {
      logger.warn({ err: e.message }, "elizabeth schedule parse failed");
    }
    if (!parsed || parsed.action === "unknown") {
      return res.json({ ok: false, needsClarification: true, message: "I couldn't parse that scheduling request. Try e.g. 'Schedule the Muddy email for 9am tomorrow.'", parsed });
    }

    // Best-effort resolve the target prospect(s) by name/company for the preview.
    let matches: any[] = [];
    if (parsed.target) {
      const q = `%${String(parsed.target).toLowerCase()}%`;
      matches = await db.select({ id: growthProspects.id, name: growthProspects.name, company: growthProspects.company, email: growthProspects.email, category: growthProspects.category, status: growthProspects.status })
        .from(growthProspects)
        .where(and(
          eventId ? eq(growthProspects.eventId, eventId) : sql`true`,
          sql`(lower(${growthProspects.name}) like ${q} or lower(coalesce(${growthProspects.company}, '')) like ${q})`,
        ))
        .limit(10);
    }
    const when = parsed.when ? new Date(parsed.when) : null;
    const outsideWindow = when ? !isWithinSendWindow(when) : false;

    // PREVIEW ONLY — no DB writes. The UI shows this and calls the schedule
    // endpoint on confirmation (requireApproval already satisfied by the human).
    return res.json({
      ok: true,
      preview: {
        action: parsed.action,
        target: parsed.target,
        isBatch: !!parsed.isBatch,
        when: when && !isNaN(when.getTime()) ? when.toISOString() : null,
        timezone: parsed.timezone || "Europe/London",
        step: parsed.step ?? null,
        sender: parsed.sender ?? "lynda",
        notes: parsed.notes || "",
        outsideWindow,
        matches,
        requiresConfirmation: true,
      },
      message: "Preview only — confirm to schedule. Nothing has been scheduled yet.",
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "elizabeth schedule-command failed");
    return res.status(500).json({ error: err.message });
  }
});

// ── Outreach module: senders, verification, CSV import ──────────────────────

// Sender profiles for the dropdown (Lynda default / Admin).
router.get("/growth/outreach/senders", async (_req, res) => {
  return res.json({
    ok: true,
    senders: Object.values(SENDERS).map((s) => ({ id: s.id, name: s.name, email: s.email, isDefault: s.isDefault })),
    categories: PROSPECT_CATEGORIES,
    statuses: PROSPECT_STATUSES,
  });
});

// Update prospect outreach fields — category, status, the spec fields, and the
// verification flags. This is how a prospect is moved toward "approved_for_outreach".
router.patch("/growth/prospects/:id", async (req, res) => {
  try {
    const b: Record<string, any> = req.body ?? {};
    const allowed: string[] = [
      "category", "status", "website", "linkedinUrl", "sector", "fitScore",
      "whyThem", "roomContribution", "attendanceLikelihood", "partnershipType",
      "specificAsk", "whatTheyReceive", "redFlags", "emailVerified",
      "contactRouteVerified", "contactSource", "verificationNotes", "approvedBy",
      "name", "title", "email", "company", "location",
    ];
    const update: Record<string, any> = {};
    for (const k of allowed) if (k in b) update[k] = b[k];
    if (update.category && !(PROSPECT_CATEGORIES as readonly string[]).includes(update.category)) {
      return res.status(400).json({ error: `Invalid category. One of: ${PROSPECT_CATEGORIES.join(", ")}` });
    }
    if (update.status && !(PROSPECT_STATUSES as readonly string[]).includes(update.status)) {
      return res.status(400).json({ error: `Invalid status. One of: ${PROSPECT_STATUSES.join(", ")}` });
    }
    if (Object.keys(update).length === 0) return res.status(400).json({ error: "No valid fields to update" });
    const [prospect] = await db.update(growthProspects).set(update).where(eq(growthProspects.id, req.params.id)).returning();
    if (!prospect) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, prospect });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to update prospect");
    return res.status(500).json({ error: err.message });
  }
});

// CSV import — frontend parses the file and posts mapped rows as JSON. Nothing
// auto-enters outreach: every imported record starts at "new"/"research_needed".
router.post("/growth/prospects/import", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { eventId, rows, category } = req.body ?? {};
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No rows to import" });
    if (rows.length > 1000) return res.status(400).json({ error: "Import limited to 1000 rows per batch" });
    const cat = (PROSPECT_CATEGORIES as readonly string[]).includes(category) ? category : null;
    let imported = 0, skipped = 0;
    for (const r of rows) {
      const name = (r.name || r.Name || r.full_name || `${r.first_name ?? ""} ${r.last_name ?? ""}`).trim();
      if (!name) { skipped++; continue; }
      await db.insert(growthProspects).values({
        eventId: eventId || null,
        ownerId: ownerId || null,
        prospectType: cat === "sponsor" ? "sponsor" : "audience",
        category: cat,
        name,
        title: r.title || r.Title || null,
        email: r.email || r.Email || null,
        company: r.company || r.Company || r.organization || null,
        location: r.location || r.Location || r.city || null,
        sector: r.sector || r.Sector || r.industry || null,
        website: r.website || r.Website || null,
        linkedinUrl: r.linkedin || r.linkedinUrl || r.LinkedIn || null,
        source: r.source || "import",
        contactSource: r.source || "csv_import",
        status: "research_needed", // never auto-enters outreach
        emailVerified: false,
        contactRouteVerified: false,
      });
      imported++;
    }
    return res.json({ ok: true, imported, skipped, message: `Imported ${imported} prospect(s) as Research Needed. None entered outreach.` });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to import prospects");
    return res.status(500).json({ error: err.message });
  }
});

// Sequence import — ingest fully-formed partner sequences (subject + 3 touches +
// timing + verification + approval) as ONE clean structured payload, so there is
// no manual copy-paste. Each row creates a verified/approved prospect plus its
// Email 1 (approved, ready for the manual send click) and the two follow-ups
// (pending — they auto-schedule +5/+10 days when Email 1 is sent). Nothing sends:
// the manual /send click per item is still the only send path. Signatures are NOT
// baked into bodies — the send path appends Lynda's signature (phone-on for
// partners) automatically, so importing a clean body avoids a double signature.
router.post("/growth/outreach/import-sequences", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { eventId, sequences } = req.body ?? {};
    if (!Array.isArray(sequences) || sequences.length === 0) {
      return res.status(400).json({ error: "No sequences to import" });
    }
    if (sequences.length > 50) return res.status(400).json({ error: "Import limited to 50 sequences per batch" });
    const results: any[] = [];
    for (const s of sequences) {
      const category = (PROSPECT_CATEGORIES as readonly string[]).includes(s.category) ? s.category : null;
      if (!s.recipientEmail || !s.partnerName) { results.push({ partner: s.partnerName || "?", skipped: "missing name/email" }); continue; }
      const isDNC = s.doNotContact === true || s.doNotContact === "Yes";
      const [p] = await db.insert(growthProspects).values({
        eventId: eventId || null,
        ownerId: ownerId || null,
        prospectType: category === "sponsor" ? "sponsor" : "audience",
        category,
        name: s.recipientName || s.partnerName,
        email: s.recipientEmail,
        company: s.partnerName,
        source: "import",
        contactSource: s.contactRoute || "approved_workbook",
        verificationNotes: s.notes || null,
        // These four set the gate. The import payload IS Lynda's explicit sign-off;
        // the manual per-item send click is still required afterwards.
        status: isDNC ? "do_not_contact" : (s.status || "approved_for_outreach"),
        emailVerified: isDNC ? false : (s.emailVerified !== false),
        contactRouteVerified: isDNC ? false : (s.contactRouteVerified !== false),
        approvedBy: isDNC ? null : (s.approvedBy || "Lynda"),
      }).returning();
      const touches = [
        { pos: 1, subject: s.subject, body: s.email1, status: "approved" },
        { pos: 2, subject: s.followup1Subject || `Re: ${s.subject || ""}`, body: s.followup1, status: "pending" },
        { pos: 3, subject: s.finalSubject || `Re: ${s.subject || ""}`, body: s.finalFollowup, status: "pending" },
      ];
      let created = 0;
      for (const t of touches) {
        if (!t.body) continue;
        await db.insert(growthOutreach).values({
          prospectId: p.id, eventId: eventId || null, sequencePosition: t.pos,
          channel: "email", subject: t.subject || null, body: t.body, status: t.status,
          senderEmail: "lynda",
        });
        created++;
      }
      results.push({ partner: s.partnerName, prospectId: p.id, touches: created, status: p.status });
    }
    return res.json({
      ok: true,
      imported: results.filter((r) => r.prospectId).length,
      results,
      message: "Imported as Approved for Outreach — Pending Send. Nothing has been sent; each item still needs a manual send click.",
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to import sequences");
    return res.status(500).json({ error: err.message });
  }
});

// ── Phase 2: Outreach dashboard counts ──────────────────────────────────────
router.get("/growth/outreach/dashboard", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const prospects = ownerId
      ? await db.select().from(growthProspects).where(eq(growthProspects.ownerId, ownerId))
      : await db.select().from(growthProspects);
    const pIds = prospects.map((p) => p.id);
    const outreach = pIds.length
      ? await db.select().from(growthOutreach).where(inArray(growthOutreach.prospectId, pIds))
      : [];
    const oIds = outreach.map((o) => o.id);
    const replies = oIds.length
      ? await db.select().from(growthReplies).where(inArray(growthReplies.outreachId, oIds))
      : [];
    const now = new Date();
    const isDNC = (p: any) => p.status === "do_not_contact" || p.category === "do_not_contact";

    const counts = {
      totalProspects: prospects.length,
      verified: prospects.filter((p) => p.emailVerified).length,
      approvedForOutreach: prospects.filter((p) => p.status === "approved_for_outreach").length,
      emailsSent: outreach.filter((o) => o.status === "sent").length,
      replies: replies.length,
      interested: prospects.filter((p) => p.status === "interested").length + replies.filter((r) => r.classification === "interested").length,
      declines: prospects.filter((p) => p.status === "declined").length + replies.filter((r) => r.classification === "declined").length,
      followUpsDue: outreach.filter((o) => o.status === "scheduled" && o.scheduledFor && new Date(o.scheduledFor) <= now).length,
      bounces: outreach.filter((o) => o.bounced || o.status === "bounced").length,
      doNotContact: prospects.filter(isDNC).length,
    };

    const cats = ["guest", "sponsor", "media", "hotel", "civic", "introducer"];
    const perCategory = cats.map((cat) => {
      const inCat = prospects.filter((p) => p.category === cat);
      return {
        category: cat,
        total: inCat.length,
        new: inCat.filter((p) => p.status === "new" || p.status === "research_needed").length,
        approved: inCat.filter((p) => p.status === "approved_for_outreach").length,
        inSequence: inCat.filter((p) => p.status === "in_sequence").length,
        replied: inCat.filter((p) => p.status === "replied" || p.status === "interested").length,
      };
    });

    return res.json({ ok: true, counts, perCategory });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to load outreach dashboard");
    return res.status(500).json({ error: err.message });
  }
});

// ── Phase 3: campaign health, analytics, Elizabeth suggestions ──────────────
// Shared owner+event scoped fetch of prospects / outreach / replies.
async function loadOutreachData(ownerId: string | undefined, eventId?: string) {
  let prospects = ownerId
    ? await db.select().from(growthProspects).where(eq(growthProspects.ownerId, ownerId))
    : await db.select().from(growthProspects);
  if (eventId) prospects = prospects.filter((p) => p.eventId === eventId);
  const pIds = prospects.map((p) => p.id);
  const outreach = pIds.length
    ? await db.select().from(growthOutreach).where(inArray(growthOutreach.prospectId, pIds))
    : [];
  const oIds = outreach.map((o) => o.id);
  const replies = oIds.length
    ? await db.select().from(growthReplies).where(inArray(growthReplies.outreachId, oIds))
    : [];
  return { prospects, outreach, replies };
}

// Campaign health — 0-100 from real counts only (no invented numbers).
router.get("/growth/outreach/health", async (req, res) => {
  try {
    const { prospects, outreach, replies } = await loadOutreachData(req.user?.userId, req.query.eventId as string | undefined);
    const total = prospects.length;
    const denom = total || 1;
    const approved = prospects.filter((p) => ["approved_for_outreach", "in_sequence", "replied", "interested"].includes(p.status)).length;
    const sendable = prospects.filter((p) => p.emailVerified && p.approvedBy).length;
    const sent = outreach.filter((o) => o.status === "sent").length;
    const replyCount = replies.length;
    const interested = replies.filter((r) => r.classification === "interested").length + prospects.filter((p) => p.status === "interested").length;
    const bounces = outreach.filter((o) => o.bounced || o.status === "bounced").length;
    const dnc = prospects.filter((p) => p.status === "do_not_contact" || p.category === "do_not_contact").length;

    const approvedRate = approved / denom;
    const sendThrough = sendable > 0 ? Math.min(sent / sendable, 1) : 0;
    const replyRate = sent > 0 ? replyCount / sent : 0;
    const interestedRate = replyCount > 0 ? interested / replyCount : 0;
    const penalty = (bounces + dnc) / denom;
    let score = Math.round(100 * (0.30 * approvedRate + 0.25 * sendThrough + 0.25 * Math.min(replyRate * 2, 1) + 0.20 * interestedRate) - 20 * penalty);
    score = Math.max(0, Math.min(100, total === 0 ? 0 : score));
    const band = score >= 75 ? "Strong" : score >= 45 ? "Building" : "Early";
    const factors = [
      { label: "Approved for outreach", value: `${approved}/${total}` },
      { label: "Send-through", value: sendable > 0 ? `${sent}/${sendable}` : "—" },
      { label: "Reply rate", value: sent > 0 ? `${Math.round(replyRate * 100)}%` : "—" },
      { label: "Interested", value: replyCount > 0 ? `${interested}/${replyCount}` : "—" },
      { label: "Bounces / DNC", value: `${bounces + dnc}` },
    ];
    return res.json({ ok: true, score, band, factors });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to compute outreach health");
    return res.status(500).json({ error: err.message });
  }
});

// Analytics — reply rate by category + performance by subject. No open tracking.
router.get("/growth/outreach/analytics", async (req, res) => {
  try {
    const { prospects, outreach, replies } = await loadOutreachData(req.user?.userId, req.query.eventId as string | undefined);
    const catById: Record<string, string | null> = Object.fromEntries(prospects.map((p) => [p.id, p.category]));
    const repliedOutreach = new Set(replies.map((r) => r.outreachId).filter(Boolean) as string[]);
    const sentOutreach = outreach.filter((o) => o.status === "sent");

    const cats = ["guest", "sponsor", "media", "hotel", "civic", "introducer"];
    const replyRateByCategory = cats.map((cat) => {
      const co = sentOutreach.filter((o) => catById[o.prospectId || ""] === cat);
      const sent = co.length;
      const reps = co.filter((o) => repliedOutreach.has(o.id)).length;
      return { category: cat, sent, replies: reps, replyRate: sent > 0 ? Math.round((reps / sent) * 100) : 0 };
    });

    const bySubject: Record<string, { subject: string; sent: number; replies: number }> = {};
    for (const o of sentOutreach) {
      const s = o.subject || "(no subject)";
      (bySubject[s] ||= { subject: s, sent: 0, replies: 0 }).sent++;
      if (repliedOutreach.has(o.id)) bySubject[s].replies++;
    }
    const performanceBySubject = Object.values(bySubject)
      .map((x) => ({ ...x, replyRate: x.sent > 0 ? Math.round((x.replies / x.sent) * 100) : 0 }))
      .sort((a, b) => b.sent - a.sent)
      .slice(0, 10);

    return res.json({
      ok: true,
      note: "Open tracking is not collected (no pixel) — reply rate only.",
      replyRateByCategory,
      performanceBySubject,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to compute outreach analytics");
    return res.status(500).json({ error: err.message });
  }
});

// Elizabeth handoff suggestions — ranked next actions derived from real state.
router.get("/growth/outreach/suggestions", async (req, res) => {
  try {
    const { prospects, outreach, replies } = await loadOutreachData(req.user?.userId, req.query.eventId as string | undefined);
    const now = Date.now();
    const suggestions: Array<{ title: string; detail: string; prompt: string }> = [];

    const needAction = replies.filter((r) => ["manual_follow_up", "needs_call", "send_information"].includes(r.classification)).length;
    if (needAction > 0) suggestions.push({
      title: `${needAction} repl${needAction > 1 ? "ies" : "y"} need a human decision`,
      detail: "Classified as needs-call, send-info, or manual follow-up.",
      prompt: "Help me work through the replies that need a manual decision and draft responses for my approval.",
    });

    const dueNow = outreach.filter((o) => o.status === "scheduled" && o.scheduledFor && new Date(o.scheduledFor).getTime() <= now).length;
    if (dueNow > 0) suggestions.push({
      title: `${dueNow} follow-up${dueNow > 1 ? "s" : ""} due now`,
      detail: "Scheduled touches ready to send, subject to the gate.",
      prompt: "Which follow-ups are due now, and are their prospects still eligible to send?",
    });

    const stuck = prospects.filter((p) => p.status === "research_needed" && p.createdAt && (now - new Date(p.createdAt).getTime()) > 7 * 86400000).length;
    if (stuck > 0) suggestions.push({
      title: `${stuck} prospect${stuck > 1 ? "s" : ""} stuck in Research Needed`,
      detail: "No movement for over 7 days.",
      prompt: "Help me research and verify the prospects stuck in Research Needed.",
    });

    const sentProspectIds = new Set(outreach.filter((o) => o.status === "sent").map((o) => o.prospectId));
    const approvedNotSent = prospects.filter((p) => p.status === "approved_for_outreach" && !sentProspectIds.has(p.id)).length;
    if (approvedNotSent > 0) suggestions.push({
      title: `${approvedNotSent} approved, not yet sent`,
      detail: "Cleared the verification gate but no email has gone out.",
      prompt: "Draft the first outreach for the prospects approved but not yet contacted, for my approval.",
    });

    return res.json({ ok: true, suggestions });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to compute outreach suggestions");
    return res.status(500).json({ error: err.message });
  }
});

// ── Phase 2: Email template builder + merge fields ──────────────────────────
function renderTemplate(text: string, p: any): string {
  const first = (p?.name || "").trim().split(/\s+/)[0] || "there";
  const map: Record<string, string> = {
    first_name: first,
    company: p?.company || "your organisation",
    title: p?.title || "",
    personal_reason: p?.whyThem || "",
    role_angle: p?.title ? `as ${p.title}` : "in your role",
    sector_angle: p?.sector || p?.industry || "your sector",
    partnership_type: p?.partnershipType || "",
    specific_ask: p?.specificAsk || "",
    what_they_receive: p?.whatTheyReceive || "",
    contact_route: p?.contactSource || "",
  };
  return (text || "").replace(/\{\{(\w+)\}\}/g, (_m, k) => (k in map ? map[k] : `{{${k}}}`));
}

router.get("/growth/templates", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const rows = ownerId
      ? await db.select().from(growthEmailTemplates).where(eq(growthEmailTemplates.ownerId, ownerId)).orderBy(desc(growthEmailTemplates.updatedAt))
      : await db.select().from(growthEmailTemplates).orderBy(desc(growthEmailTemplates.updatedAt));
    return res.json({ ok: true, templates: rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/templates", async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.name) return res.status(400).json({ error: "Name required" });
    const [tpl] = await db.insert(growthEmailTemplates).values({
      ownerId: req.user?.userId || null,
      name: b.name,
      category: b.category || "guest_invite",
      subject: b.subject || "",
      body: b.body || "",
      includePhone: !!b.includePhone,
      senderId: b.senderId || "lynda",
      sequenceStep: b.sequenceStep || 1,
    }).returning();
    return res.json({ ok: true, template: tpl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/growth/templates/:id", async (req, res) => {
  try {
    const b = req.body ?? {};
    const update: Record<string, any> = { updatedAt: new Date() };
    for (const k of ["name", "category", "subject", "body", "includePhone", "senderId", "sequenceStep"]) {
      if (k in b) update[k] = b[k];
    }
    const [tpl] = await db.update(growthEmailTemplates).set(update).where(eq(growthEmailTemplates.id, req.params.id)).returning();
    if (!tpl) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, template: tpl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/growth/templates/:id", async (req, res) => {
  try {
    await db.delete(growthEmailTemplates).where(eq(growthEmailTemplates.id, req.params.id));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/growth/templates/:id/preview", async (req, res) => {
  try {
    const [tpl] = await db.select().from(growthEmailTemplates).where(eq(growthEmailTemplates.id, req.params.id));
    if (!tpl) return res.status(404).json({ error: "Template not found" });
    let prospect: any = null;
    if (req.query.prospectId) {
      const [p] = await db.select().from(growthProspects).where(eq(growthProspects.id, String(req.query.prospectId)));
      prospect = p ?? null;
    }
    const subject = renderTemplate(tpl.subject || "", prospect);
    let body = renderTemplate(tpl.body || "", prospect);
    const sig = renderSignature(tpl.senderId, !!tpl.includePhone);
    body = `${body}\n\n—\n${sig}`;
    return res.json({ ok: true, subject, body, sender: resolveSender(tpl.senderId) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. SUPPRESSION
router.get("/growth/suppressions", async (req, res) => {
  try {
    const { email } = req.query;
    const conditions: any[] = [];
    if (email) conditions.push(eq(growthSuppressions.email, email as string));

    const list = await db.select().from(growthSuppressions)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0] || sql`TRUE`)
      .orderBy(desc(growthSuppressions.createdAt));

    return res.json({ ok: true, suppressions: list });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list suppressions");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/suppressions", async (req, res) => {
  try {
    const { email, phone, reason = "unsubscribe" } = req.body;
    const [suppression] = await db.insert(growthSuppressions).values({
      email,
      phone,
      reason,
    }).returning();
    return res.json({ ok: true, suppression });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to add suppression");
    return res.status(500).json({ error: err.message });
  }
});

// 7. REPLY HANDLING
router.post("/growth/replies", async (req, res) => {
  try {
    const { outreachId, content } = req.body;
    if (!outreachId || !content) return res.status(400).json({ error: "outreachId and content required" });

    // Classify reply with AI
    const systemPrompt = `Classify this reply into one of: positive, not_now, unsubscribe, out_of_office, auto_reply.
Return ONLY: {"classification": "..."}`;

    const { content: aiResponse } = await callOpenRouter(
      MODELS.classify,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Reply: "${content}"` },
      ],
      { maxTokens: 100, temperature: 0.2 }
    );

    let classification = "auto_reply";
    try {
      const parsed = JSON.parse(aiResponse.replace(/^```json\s*/, "").replace(/\s*```$/, ""));
      classification = parsed.classification;
    } catch {
      // Fallback: keyword detection
      const lower = content.toLowerCase();
      if (lower.includes("unsubscribe") || lower.includes("stop") || lower.includes("remove me")) classification = "unsubscribe";
      else if (lower.includes("interested") || lower.includes("yes") || lower.includes("keen")) classification = "positive";
      else if (lower.includes("not now") || lower.includes("later") || lower.includes("not interested")) classification = "not_now";
      else if (lower.includes("out of office") || lower.includes("ooo")) classification = "out_of_office";
    }

    // Store reply
    const [reply] = await db.insert(growthReplies).values({
      outreachId,
      content,
      classification,
    }).returning();

    // Handle by classification
    if (classification === "unsubscribe") {
      // Add to suppression
      const [outreach] = await db.select().from(growthOutreach).where(eq(growthOutreach.id, outreachId));
      if (outreach?.prospectId) {
        const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, outreach.prospectId));
        if (prospect?.email) {
          await db.insert(growthSuppressions).values({
            email: prospect.email,
            reason: "unsubscribe",
          });
        }
      }
      // Pause all future messages for this prospect
      await db.update(growthOutreach)
        .set({ status: "paused" })
        .where(and(eq(growthOutreach.prospectId, outreach?.prospectId || ""), eq(growthOutreach.status, "pending")));
    } else if (classification === "positive") {
      // Pause and flag for human
      await db.update(growthOutreach)
        .set({ status: "positive" })
        .where(eq(growthOutreach.id, outreachId));
      // Auto-advance pipeline to "interested"
      try {
        const [outreach] = await db.select().from(growthOutreach).where(eq(growthOutreach.id, outreachId));
        if (outreach?.prospectId && outreach?.eventId) {
          const existing = await db.select().from(growthPipelineEntries)
            .where(
              and(
                eq(growthPipelineEntries.eventId, outreach.eventId),
                eq(growthPipelineEntries.prospectId, outreach.prospectId),
                eq(growthPipelineEntries.pipelineType, "audience")
              )
            )
            .limit(1);
          if (existing.length > 0) {
            const entry = existing[0];
            const idx = AUDIENCE_STAGES.indexOf(entry.stage);
            const interestedIdx = AUDIENCE_STAGES.indexOf("interested");
            if (idx >= 0 && idx < interestedIdx) {
              await db.update(growthPipelineEntries)
                .set({ stage: "interested", movedBy: "system", updatedAt: new Date() })
                .where(eq(growthPipelineEntries.id, entry.id));
            }
          } else {
            await db.insert(growthPipelineEntries).values({
              eventId: outreach.eventId,
              prospectId: outreach.prospectId,
              pipelineType: "audience",
              stage: "interested",
              movedBy: "system",
            });
          }
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, "Pipeline auto-advance on positive reply failed (non-critical)");
      }
    } else if (classification === "not_now") {
      // Pause with re-engage date
      await db.update(growthOutreach)
        .set({ status: "paused" })
        .where(eq(growthOutreach.id, outreachId));
    }

    return res.json({ ok: true, reply, classification, action: classification === "unsubscribe" ? "suppressed" : classification === "positive" ? "flagged_for_human" : "paused" });
  } catch (err: any) {
    logger.error({ err: err.message }, "Reply handling failed");
    return res.status(500).json({ error: err.message });
  }
});

// Get replies for an outreach
router.get("/growth/outreach/:id/replies", async (req, res) => {
  try {
    const replies = await db.select().from(growthReplies).where(eq(growthReplies.outreachId, req.params.id)).orderBy(desc(growthReplies.createdAt));
    return res.json({ ok: true, replies });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get replies");
    return res.status(500).json({ error: err.message });
  }
});

// ── PHASE 4: Pipelines, Dashboard & Inbound API ──────────────────────────────────

// Stage definitions
const AUDIENCE_STAGES = ["identified", "contacted", "interested", "applied", "paid", "attending"];
const SPONSOR_STAGES = ["identified", "contacted", "meeting_booked", "proposal_sent", "negotiating", "confirmed"];

function getStages(type: string): string[] {
  return type === "sponsor" ? SPONSOR_STAGES : AUDIENCE_STAGES;
}

function nextStage(type: string, stage: string): string | null {
  const stages = getStages(type);
  const idx = stages.indexOf(stage);
  return idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : null;
}

function prevStage(type: string, stage: string): string | null {
  const stages = getStages(type);
  const idx = stages.indexOf(stage);
  return idx > 0 ? stages[idx - 1] : null;
}

// Bot detection
function isBot(userAgent?: string): boolean {
  if (!userAgent) return true;
  const ua = userAgent.toLowerCase();
  const botPatterns = [
    "bot", "crawl", "spider", "googlebot", "bingbot", "yandex",
    "curl", "wget", "python-requests", "httpie", "postman", "insomnia",
    "headless", "phantom", "puppeteer", "playwright", "selenium",
  ];
  return botPatterns.some((p) => ua.includes(p));
}

// Hash IP for privacy
function hashIp(ip?: string): string | null {
  if (!ip) return null;
  return ip.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0).toString(16);
}

// ── 1. Pipeline routes ─────────────────────────────────────────────

router.get("/growth/events/:id/pipeline", async (req, res) => {
  try {
    const type = (req.query.type as string) || "audience";
    const entries = await db.select().from(growthPipelineEntries)
      .where(
        and(
          eq(growthPipelineEntries.eventId, req.params.id),
          eq(growthPipelineEntries.pipelineType, type)
        )
      )
      .orderBy(desc(growthPipelineEntries.updatedAt));

    // Get prospect names
    const prospectIds = entries.map((e) => e.prospectId).filter(Boolean) as string[];
    const prospects = prospectIds.length > 0
      ? await db.select({ id: growthProspects.id, name: growthProspects.name, title: growthProspects.title, company: growthProspects.company, email: growthProspects.email })
          .from(growthProspects)
          .where(inArray(growthProspects.id, prospectIds))
      : [];
    const prospectsById = new Map(prospects.map((p) => [p.id, p]));

    const enriched = entries.map((e) => {
      const p = prospectsById.get(e.prospectId || "");
      return { ...e, prospectName: p?.name ?? "", prospectTitle: p?.title ?? "", prospectCompany: p?.company ?? "", prospectEmail: p?.email ?? "" };
    });

    // Stage counts
    const stages = getStages(type);
    const counts: Record<string, number> = {};
    for (const s of stages) counts[s] = 0;
    for (const e of entries) counts[e.stage] = (counts[e.stage] || 0) + 1;

    return res.json({ ok: true, entries: enriched, counts, stages, type });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list pipeline");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/events/:id/pipeline", async (req, res) => {
  try {
    const { prospectId, pipelineType, stage, notes } = req.body;
    if (!pipelineType || !stage) return res.status(400).json({ error: "pipelineType and stage required" });
    if (!getStages(pipelineType).includes(stage)) return res.status(400).json({ error: "Invalid stage" });

    const [entry] = await db.insert(growthPipelineEntries).values({
      eventId: req.params.id,
      prospectId,
      pipelineType,
      stage,
      movedBy: "human",
      notes,
    }).returning();

    return res.json({ ok: true, entry });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create pipeline entry");
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/growth/pipeline/:id/stage", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { stage } = req.body;
    if (!stage) return res.status(400).json({ error: "stage required" });

    const [entry] = await db.update(growthPipelineEntries)
      .set({ stage, movedBy: "human", updatedAt: new Date() })
      .where(eq(growthPipelineEntries.id, req.params.id))
      .returning();

    if (!entry) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, entry });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to move pipeline stage");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/pipeline/:id/advance", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const [entry] = await db.select().from(growthPipelineEntries).where(eq(growthPipelineEntries.id, req.params.id));
    if (!entry) return res.status(404).json({ error: "Not found" });

    const next = nextStage(entry.pipelineType, entry.stage);
    if (!next) return res.status(400).json({ error: "Already at final stage" });

    const [updated] = await db.update(growthPipelineEntries)
      .set({ stage: next, movedBy: "human", updatedAt: new Date() })
      .where(eq(growthPipelineEntries.id, req.params.id))
      .returning();

    return res.json({ ok: true, entry: updated });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to advance pipeline stage");
    return res.status(500).json({ error: err.message });
  }
});

// ── 2. Event targets ──────────────────────────────────────────────

router.get("/growth/events/:id/targets", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const targets = await db.select().from(growthEventTargets).where(eq(growthEventTargets.eventId, req.params.id));
    return res.json({ ok: true, targets });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get event targets");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/events/:id/targets", async (req, res) => {
  try {
    const { targetType, targetValue, breakEven } = req.body;
    // Upsert: delete existing of same type, insert new
    await db.delete(growthEventTargets).where(
      and(eq(growthEventTargets.eventId, req.params.id), eq(growthEventTargets.targetType, targetType || "paid_guests"))
    );
    const [target] = await db.insert(growthEventTargets).values({
      eventId: req.params.id,
      targetType: targetType || "paid_guests",
      targetValue: targetValue ?? 0,
      breakEven: breakEven ?? 0,
    }).returning();
    return res.json({ ok: true, target });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to set event targets");
    return res.status(500).json({ error: err.message });
  }
});

// ── 3. Inbound API (secured with EP_CROSS_SYSTEM_KEY) ──────────────

const CROSS_SYSTEM_KEY = process.env.EP_CROSS_SYSTEM_KEY;

function verifyInboundKey(req: any, res: any): boolean {
  const key = req.headers["x-ep-key"] || req.headers["X-EP-Key"];
  if (!key || !CROSS_SYSTEM_KEY || key !== CROSS_SYSTEM_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

async function handleInbound(req: any, res: any, leadType: string, initialStage: string) {
  if (!verifyInboundKey(req, res)) return;

  const eventId = req.params.eventId;
  const { name, email, phone, company, message, payload } = req.body;
  const userAgent = req.headers["user-agent"] || "";
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
  const bot = isBot(userAgent);

  try {
    // Find or create prospect
    let prospectId: string | null = null;
    if (email) {
      const existing = await db.select().from(growthProspects)
        .where(and(eq(growthProspects.eventId, eventId), eq(growthProspects.email, email)))
        .limit(1);
      if (existing.length > 0) {
        prospectId = existing[0].id;
      }
    }
    if (!prospectId) {
      const [prospect] = await db.insert(growthProspects).values({
        eventId,
        prospectType: leadType.includes("sponsor") || leadType === "partner_enquiry" ? "sponsor" : "audience",
        name: name || "",
        email: email || "",
        phone: phone || "",
        company: company || "",
        source: "website",
        status: "new",
      }).returning();
      prospectId = prospect.id;
    }

    // Create pipeline entry
    const [entry] = await db.insert(growthPipelineEntries).values({
      eventId,
      prospectId,
      pipelineType: leadType.includes("sponsor") || leadType === "partner_enquiry" ? "sponsor" : "audience",
      stage: initialStage,
      movedBy: "system",
      notes: message,
    }).returning();

    // Create inbound lead record
    const [lead] = await db.insert(growthInboundLeads).values({
      eventId,
      source: "website",
      leadType,
      name: name || "",
      email: email || "",
      phone: phone || "",
      company: company || "",
      message: message || "",
      payload: payload || {},
      pipelineEntryId: entry.id,
      isBot: bot,
      userAgent,
      ipHash: hashIp(ip as string),
    }).returning();

    return res.json({ ok: true, lead, pipelineEntryId: entry.id, prospectId });
  } catch (err: any) {
    logger.error({ err: err.message }, "Inbound lead failed");
    return res.status(500).json({ error: err.message });
  }
}

router.post("/growth/inbound/:eventId/registration", (req, res) => handleInbound(req, res, "registration", "applied"));
router.post("/growth/inbound/:eventId/application", (req, res) => handleInbound(req, res, "application", "applied"));
router.post("/growth/inbound/:eventId/story", (req, res) => handleInbound(req, res, "story", "interested"));
router.post("/growth/inbound/:eventId/sponsor-enquiry", (req, res) => handleInbound(req, res, "sponsor_enquiry", "interested"));
router.post("/growth/inbound/:eventId/partner-enquiry", (req, res) => handleInbound(req, res, "partner_enquiry", "interested"));
router.post("/growth/inbound/:eventId/payment", (req, res) => handleInbound(req, res, "payment", "paid"));

// ── 4. Intelligence dashboard data ─────────────────────────────────

router.get("/growth/events/:id/intelligence", async (req, res) => {
  try {
    const eventId = req.params.id;

    // Pipeline stage counts
    const pipelineEntries = await db.select().from(growthPipelineEntries)
      .where(eq(growthPipelineEntries.eventId, eventId));

    const audienceCounts: Record<string, number> = {};
    const sponsorCounts: Record<string, number> = {};
    for (const e of pipelineEntries) {
      if (e.pipelineType === "audience") {
        audienceCounts[e.stage] = (audienceCounts[e.stage] || 0) + 1;
      } else {
        sponsorCounts[e.stage] = (sponsorCounts[e.stage] || 0) + 1;
      }
    }

    // Paid count
    const paidCount = audienceCounts["paid"] || 0;

    // Targets
    const targets = await db.select().from(growthEventTargets).where(eq(growthEventTargets.eventId, eventId));
    const paidTarget = targets.find((t) => t.targetType === "paid_guests");

    // Inbound leads (bot-excluded)
    const allInbound = await db.select().from(growthInboundLeads)
      .where(eq(growthInboundLeads.eventId, eventId))
      .orderBy(desc(growthInboundLeads.createdAt))
      .limit(20);
    const humanInbound = allInbound.filter((l) => !l.isBot);
    const botInbound = allInbound.filter((l) => l.isBot);

    // Spend — scoped to THIS event. Spend is attributed via metadata.eventId
    // (the growth_spend_logs table has no eventId column and owner_id is mostly
    // unset, so metadata is the only reliable per-event key). Without this filter
    // every event's page showed the platform-wide total.
    const spend = await db.select({
      total: sql<number>`COALESCE(SUM(${growthSpendLogs.cost}), 0)`,
      count: sql<number>`COUNT(*)`,
    }).from(growthSpendLogs)
      .where(sql`${growthSpendLogs.metadata}->>'eventId' = ${eventId}`);

    // Total prospects
    const prospectCount = await db.select({ count: sql<number>`COUNT(*)` }).from(growthProspects)
      .where(eq(growthProspects.eventId, eventId));

    return res.json({
      ok: true,
      eventId,
      pipeline: {
        audience: {
          stages: AUDIENCE_STAGES,
          counts: audienceCounts,
          total: pipelineEntries.filter((e) => e.pipelineType === "audience").length,
        },
        sponsor: {
          stages: SPONSOR_STAGES,
          counts: sponsorCounts,
          total: pipelineEntries.filter((e) => e.pipelineType === "sponsor").length,
        },
      },
      target: {
        paid: paidCount,
        target: paidTarget?.targetValue ?? 0,
        breakEven: paidTarget?.breakEven ?? 0,
        progress_pct: paidTarget?.targetValue ? Math.round((paidCount / paidTarget.targetValue) * 100) : 0,
      },
      inbound: {
        total: allInbound.length,
        human: humanInbound.length,
        bots: botInbound.length,
        recent: humanInbound.slice(0, 10),
      },
      spend: {
        total: Number(spend[0]?.total || 0),
        operations: Number(spend[0]?.count || 0),
      },
      prospects: {
        total: Number(prospectCount[0]?.count || 0),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get intelligence");
    return res.status(500).json({ error: err.message });
  }
});

// ── 4b. Elizabeth Growth Coach — proactive alerts & recommendations ──

router.get("/growth/events/:id/elizabeth-coach", async (req, res) => {
  try {
    const eventId = req.params.id;
    const [event] = await db.select().from(growthEvents).where(eq(growthEvents.id, eventId));
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Pipeline data
    const pipelineEntries = await db.select().from(growthPipelineEntries)
      .where(eq(growthPipelineEntries.eventId, eventId));

    const audienceTotal = pipelineEntries.filter((e) => e.pipelineType === "audience").length;
    const sponsorTotal = pipelineEntries.filter((e) => e.pipelineType === "sponsor").length;
    const paidCount = pipelineEntries.filter((e) => e.pipelineType === "audience" && e.stage === "paid").length;

    const targets = await db.select().from(growthEventTargets).where(eq(growthEventTargets.eventId, eventId));
    const paidTarget = targets.find((t) => t.targetType === "paid_guests");
    const targetValue = paidTarget?.targetValue ?? 0;

    // Prospect data
    const allProspects = await db.select().from(growthProspects)
      .where(eq(growthProspects.eventId, eventId));
    const approvedProspects = allProspects.filter((p) => p.status === "approved");
    const pendingProspects = allProspects.filter((p) => p.status === "new");

    // Outreach data
    const outreachMessages = await db.select().from(growthOutreach)
      .where(eq(growthOutreach.eventId, eventId));
    const approvedMessages = outreachMessages.filter((o) => o.status === "approved");
    const sentMessages = outreachMessages.filter((o) => o.status === "sent");
    const repliedMessages = outreachMessages.filter((o) => o.status === "replied");
    // Get reply data from growthReplies table
    const replyData = await db.select().from(growthReplies)
      .where(inArray(growthReplies.outreachId, outreachMessages.map(o => o.id)));
    const positiveReplies = replyData.filter((r) => r.classification === "positive");

    // Spend data
    const spend = await db.select({
      total: sql<number>`COALESCE(SUM(${growthSpendLogs.cost}), 0)`,
      count: sql<number>`COUNT(*)`,
    }).from(growthSpendLogs).where(eq(growthSpendLogs.operation, "prospect_search"));

    // Inbound
    const inbound = await db.select().from(growthInboundLeads)
      .where(eq(growthInboundLeads.eventId, eventId));
    const recentInbound = inbound.filter((l) => l.createdAt && Date.now() - new Date(l.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000);

    // Build alerts
    const alerts: Array<{ type: "warning" | "info" | "success"; message: string; action: string }> = [];

    if (targetValue > 0 && paidCount < targetValue * 0.3 && audienceTotal > 0) {
      alerts.push({
        type: "warning",
        message: `Ticket sales are at ${Math.round((paidCount / targetValue) * 100)}% of target. Only ${paidCount} of ${targetValue} paid guests.`,
        action: "Run Discovery to find more audience prospects.",
      });
    }

    if (approvedProspects.length > 0 && approvedMessages.length === 0) {
      alerts.push({
        type: "info",
        message: `You have ${approvedProspects.length} approved prospects but no outreach messages generated yet.`,
        action: "Go to Outreach to generate messages for approved prospects.",
      });
    }

    if (sentMessages.length > 0 && repliedMessages.length === 0) {
      alerts.push({
        type: "warning",
        message: `Sent ${sentMessages.length} messages but no replies yet.`,
        action: "Review message copy — consider testing a different hook.",
      });
    }

    if (positiveReplies.length > 0) {
      alerts.push({
        type: "success",
        message: `${positiveReplies.length} positive replies! Top performer: ${positiveReplies[0]?.content?.substring(0, 40) || "reply"}...`,
        action: "Double down on this message pattern. Use it as a template.",
      });
    }

    if (sponsorTotal === 0 && allProspects.some((p) => p.prospectType === "sponsor")) {
      alerts.push({
        type: "info",
        message: "You have sponsor prospects but no sponsor pipeline activity.",
        action: "Move approved sponsors to the Pipeline and start outreach.",
      });
    }

    if (recentInbound.length > 0) {
      alerts.push({
        type: "success",
        message: `${recentInbound.length} inbound leads this week.`,
        action: "Review inbound leads in the Pipeline and respond quickly.",
      });
    }

    // Recommendations
    const recommendations: Array<{ area: string; suggestion: string; priority: string }> = [];

    if (pendingProspects.length > 20) {
      recommendations.push({
        area: "Screening",
        suggestion: `You have ${pendingProspects.length} unscreened prospects. Review them to find high-fit targets.`,
        priority: "high",
      });
    }

    if (approvedMessages.length > 0 && sentMessages.length < approvedMessages.length * 0.5) {
      recommendations.push({
        area: "Outreach",
        suggestion: `Only ${sentMessages.length} of ${approvedMessages.length} approved messages sent. Accelerate sending to maintain momentum.`,
        priority: "high",
      });
    }

    if (spend[0]?.count && Number(spend[0].count) > 10) {
      recommendations.push({
        area: "Efficiency",
        suggestion: "Consider refining your personas — high search volume but low conversion may indicate targeting is too broad.",
        priority: "medium",
      });
    }

    if (positiveReplies.length > 0 && sentMessages.length > 0) {
      const replyRate = (positiveReplies.length / sentMessages.length) * 100;
      if (replyRate > 15) {
        recommendations.push({
          area: "Messaging",
          suggestion: `Your reply rate is ${replyRate.toFixed(1)}% — above average. This message pattern is working.`,
          priority: "low",
        });
      } else if (replyRate < 5) {
        recommendations.push({
          area: "Messaging",
          suggestion: `Reply rate is ${replyRate.toFixed(1)}% — below average. Test a different subject line or opening hook.`,
          priority: "high",
        });
      }
    }

    // Next steps
    const nextSteps: string[] = [];
    if (pendingProspects.length > 0) nextSteps.push("Screen new prospects");
    if (approvedProspects.length > 0 && approvedMessages.length === 0) nextSteps.push("Generate outreach messages");
    if (approvedMessages.length > sentMessages.length) nextSteps.push("Send approved outreach");
    if (paidCount < targetValue * 0.5) nextSteps.push("Focus on audience conversion");
    if (sponsorTotal === 0) nextSteps.push("Build sponsor pipeline");
    if (recentInbound.length > 0) nextSteps.push("Respond to inbound leads");
    if (nextSteps.length === 0) nextSteps.push("All caught up. Check back tomorrow.");

    return res.json({
      ok: true,
      eventId,
      eventName: event.name,
      alerts,
      recommendations,
      nextSteps,
      summary: {
        pipelineTotal: audienceTotal + sponsorTotal,
        paidCount,
        targetValue,
        approvedProspects: approvedProspects.length,
        sentMessages: sentMessages.length,
        replyRate: sentMessages.length > 0 ? (repliedMessages.length / sentMessages.length) * 100 : 0,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Elizabeth coach failed");
    return res.status(500).json({ error: err.message });
  }
});

// ── 5. Market Intelligence ─────────────────────────────────────────────

router.post("/growth/market-intelligence", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

    const { query, eventId } = req.body;
    if (!query?.trim()) return res.status(400).json({ error: "Query is required" });

    // Only attach to an event the caller actually owns; otherwise leave unlinked.
    let scopedEventId: string | null = null;
    if (eventId) {
      const [ev] = await db
        .select({ id: growthEvents.id })
        .from(growthEvents)
        .where(and(eq(growthEvents.id, eventId), eq(growthEvents.ownerId, ownerId)))
        .limit(1);
      scopedEventId = ev?.id ?? null;
    }

    const systemPrompt = `You are a market intelligence analyst. Use the live web search results provided to research the following event market query, then produce a structured JSON report.

ACCURACY RULES — these are mandatory:
- Base every competitor, price, sponsor and trend on the web search results. Do NOT invent events, organisations, dates or prices.
- If you cannot find a real-world fact, omit it or set the field to "unknown" / an empty array. Never fabricate to fill the schema.
- Prefer fewer, verified items over many guessed ones.
- demandScore MUST be an integer on a 0-100 scale (0 = no demand, 100 = extremely high demand).

Produce JSON with exactly these keys:
- competitorEvents: array of { name, date, location, audience, price, description }
- pricingBenchmarks: array of { eventType, priceRange, location, note }
- sponsorActivity: array of { company, sector, activity, relevance }
- audienceTrends: array of { trend, evidence, opportunity }
- marketOpportunity: { summary, demandScore (integer 0-100), recommendedPrice, recommendedCapacity, risks, opportunities }
- confidence: "high" | "medium" | "low" — how well the web results supported this report

Return ONLY the JSON object, no markdown.

Query: ${query}`;

    const { content, usage, cost, model, sources } = await callOpenRouter(
      MODELS.drafting,
      [{ role: "system", content: systemPrompt }, { role: "user", content: query }],
      { maxTokens: 2000, temperature: 0.2, jsonMode: true, webSearch: true, webMaxResults: 6 }
    );
    await logSpend("market_intelligence", model, cost, { query, tokens: usage, sources: sources.length }, "openrouter", ownerId);

    let report: any;
    try {
      report = JSON.parse(content);
    } catch {
      // Strict parse only — never persist malformed AI output as if it were real data.
      return res.status(500).json({ error: "Failed to parse market intelligence report" });
    }

    // Enforce the 0-100 demand-score scale rather than trusting the model.
    const rawScore = Number(report.marketOpportunity?.demandScore);
    const demandScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0;

    const [insight] = await db.insert(growthMarketInsights).values({
      ownerId,
      eventId: scopedEventId,
      query: query.trim(),
      reportType: "market_opportunity",
      competitorEvents: report.competitorEvents || null,
      pricingBenchmarks: report.pricingBenchmarks || null,
      sponsorActivity: report.sponsorActivity || null,
      audienceTrends: report.audienceTrends || null,
      marketOpportunity: report.marketOpportunity || null,
      sources: sources.length ? sources : null,
      demandScore,
    }).returning();

    return res.status(201).json({ ok: true, insight });
  } catch (err: any) {
    logger.error({ err: err.message }, "Market intelligence failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/growth/market-intelligence", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const insights = await db
      .select()
      .from(growthMarketInsights)
      .where(eq(growthMarketInsights.ownerId, ownerId))
      .orderBy(desc(growthMarketInsights.generatedAt));
    return res.json({ ok: true, insights });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list market insights");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/growth/market-intelligence/:id", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const [insight] = await db.select().from(growthMarketInsights).where(eq(growthMarketInsights.id, req.params.id)).limit(1);
    // Treat "not yours" as 404 so ids can't be probed across accounts.
    if (!insight || (insight.ownerId && insight.ownerId !== ownerId)) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, insight });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get market insight");
    return res.status(500).json({ error: err.message });
  }
});

// ── 6. Elizabeth — in-platform guide ───────────────────────────────────────

const ipCounts = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

router.post("/growth/elizabeth", async (req: any, res) => {
  try {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    if (!checkRate(ip)) return res.status(429).json({ error: "Rate limited. Please wait a minute." });

    const { messages, page } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "No messages provided" });
    }

    const pageContext = page ? `The user is currently viewing the ${page} page.` : "";

    const systemPrompt = `You are Elizabeth — the warm, knowledgeable, and elegant guide for the Growth Intelligence Platform.

You help users navigate the platform, understand the process, and take the right next steps. You are NOT an AI assistant — you are a named guide persona. You never use the word "AI" in your replies.

**PLATFORM OVERVIEW**
The Growth Intelligence Platform helps event organisers fill rooms and secure sponsors. It has these phases:

1. **Strategy** (Wizard) — Define your event: name, description, audience, location, pricing tier. The platform generates a strategy pack with audience personas, sponsor profiles, messaging, and pricing benchmarks.

2. **Discovery** — Find the right people for your event. Use the Discovery tool to search for prospects based on the strategy pack. The platform shows you who to target.

3. **Screen** — Review and score prospects. The platform scores each prospect against the strategy. You approve or reject. Only approved prospects move to outreach.

4. **Outreach** — Generate personalised messages for approved prospects. The platform creates a 4-touch sequence. You review and approve each message before it sends.

5. **Pipeline** — Track prospects through stages: Identified → Contacted → Interested → Applied → Paid → Attending (for audience). Sponsor pipeline: Identified → Contacted → Meeting Booked → Proposal Sent → Negotiating → Confirmed.

6. **Intelligence** — Real-time dashboard showing progress to target, inbound leads, pipeline stage counts, and spend.

7. **Website Integration** — The public event site (e.g. eventperfekt.net) POSTs enquiries directly into the platform via secure API. Registrations, applications, sponsor enquiries, and payments all appear in the pipeline automatically.

**KEY RULES**
- Every outreach message is human-approved before sending. Nothing auto-sends.
- Suppression honoured: stop on reply, bounce, "not relevant", "do not contact", or any negative signal. Suppression list maintained.
- Prospects are never named externally until commercials are signed.
- The platform uses on-demand runs, not automatic schedules.
- Individual prospects → LinkedIn. Corporate prospects → email.

**HELP YOU CAN PROVIDE**
- "What should I do next?" → Tell them their current phase and next step.
- "How does scoring work?" → Explain the scoring criteria and what happens after.
- "What is the pipeline?" → Explain the stages and how prospects move through.
- "How do I generate outreach?" → Explain the approval gate and send process.
- "What is the wizard?" → Explain the strategy pack and what it produces.
- "How do I connect my website?" → Explain the inbound API and EP_CROSS_SYSTEM_KEY.

${pageContext}

Respond warmly, concisely, and always in a helpful tone. Never mention "AI" or "artificial intelligence" — you are Elizabeth, the platform guide.`;

    // Elizabeth runs on the platform's Claude engine via the shared OpenRouter
    // helper, so her voice matches the rest of the platform and her spend is
    // logged centrally with accurate per-model pricing.
    const { content, cost, model } = await callOpenRouter(
      MODELS.drafting,
      [
        { role: "system", content: systemPrompt },
        ...messages.slice(-8),
      ],
      { maxTokens: 400, temperature: 0.7 }
    );

    const reply = content || "I'm sorry, I didn't understand. Could you rephrase?";

    await logSpend("elizabeth_chat", model, cost, { page }, "openrouter");

    return res.json({ ok: true, reply });
  } catch (err: any) {
    logger.error({ err: err.message }, "Elizabeth chat failed");
    return res.status(500).json({ error: err.message });
  }
});

// ── 5b. Agent marketplace + autonomous agents (authed, tool-calling) ─────────
// Agents are configs over the shared tool catalog + comms-core. The marketplace
// lists them; a run is started against a chosen agentId and polled for progress.

// Marketplace: list available agents (built-in catalogue).
router.get("/growth/agents", async (req: any, res) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ error: "Unauthorized" });
    const agents = listAgents().map((a) => ({
      id: a.id,
      name: a.name,
      title: a.title,
      tagline: a.tagline,
      description: a.description,
      kpis: a.kpis,
      accent: a.accent,
      icon: a.icon,
    }));
    return res.json({ ok: true, agents });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Elizabeth/agents run the pipeline end-to-end from a prompt, stopping only at
// the email-approval gate. Runs execute in the background; the client polls.

// Start a run: kicks off the orchestrator in the background, returns the runId.
router.post("/growth/elizabeth/run", async (req: any, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { messages, message, eventId, title, agentId } = req.body;
    let convo: any[] = Array.isArray(messages) ? messages : [];
    if (!convo.length && typeof message === "string" && message.trim()) {
      convo = [{ role: "user", content: message.trim() }];
    }
    // keep only role/content user/assistant turns from the client
    convo = convo
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }));
    if (!convo.length) return res.status(400).json({ error: "No message provided" });

    const run = await createRun(ownerId, { messages: convo, eventId, agentId, title: title || convo[convo.length - 1].content.slice(0, 80) });
    // fire-and-forget — the orchestrator persists progress to the run record
    runOrchestrator(run.id, ownerId).catch((err) =>
      logger.error({ err: err.message, runId: run.id }, "Elizabeth run failed")
    );
    return res.json({ ok: true, runId: run.id });
  } catch (err: any) {
    logger.error({ err: err.message }, "Elizabeth run start failed");
    return res.status(500).json({ error: err.message });
  }
});

// Poll a run's progress.
router.get("/growth/elizabeth/run/:id", async (req: any, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const run = await getRunForOwner(req.params.id, ownerId);
    if (!run) return res.status(404).json({ error: "Run not found" });
    return res.json({ ok: true, ...run });
  } catch (err: any) {
    logger.error({ err: err.message }, "Elizabeth run fetch failed");
    return res.status(500).json({ error: err.message });
  }
});

// Answer Elizabeth's clarifying question / give a follow-up instruction; resumes the run.
router.post("/growth/elizabeth/run/:id/reply", async (req: any, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { message } = req.body;
    if (typeof message !== "string" || !message.trim()) return res.status(400).json({ error: "Message required" });
    await replyToRun(req.params.id, ownerId, message.trim());
    return res.json({ ok: true, runId: req.params.id });
  } catch (err: any) {
    logger.error({ err: err.message }, "Elizabeth reply failed");
    return res.status(500).json({ error: err.message });
  }
});

// Elizabeth's memory — what she recalls on open ("where you left off").
router.get("/growth/elizabeth/memory", async (req: any, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const memory = await getElizabethMemory(ownerId);
    return res.json({ ok: true, ...memory });
  } catch (err: any) {
    logger.error({ err: err.message }, "Elizabeth memory fetch failed");
    return res.status(500).json({ error: err.message });
  }
});

// ── 6. Site Builder ──────────────────────────────────────────

router.post("/growth/events/:id/site-builder", async (req, res) => {
  try {
    const event = await db.select().from(growthEvents).where(eq(growthEvents.id, req.params.id)).limit(1);
    if (!event || event.length === 0) return res.status(404).json({ error: "Event not found" });
    const e = event[0];
    const pack = e.strategyPack as any;

    const siteHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    :root { --ink: #330311; --gold: #C9A961; --ivory: #F4ECD8; --warm: #8A7B6F; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Poppins', sans-serif; background: var(--ink); color: var(--ivory); min-height: 100vh; }
    .container { max-width: 720px; margin: 0 auto; padding: 60px 24px; }
    h1 { font-size: 2.5rem; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    .subtitle { font-size: 1rem; color: var(--warm); margin-bottom: 2rem; font-family: 'Inter', sans-serif; }
    .tier { display: inline-block; padding: 4px 12px; border-radius: 4px; background: var(--gold); color: var(--ink); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 1.5rem; }
    .date { font-size: 0.875rem; color: var(--warm); margin-bottom: 2rem; }
    .message { font-size: 1.125rem; line-height: 1.7; margin-bottom: 2rem; color: var(--ivory); }
    .form { background: rgba(244,236,216,0.04); border: 1px solid rgba(201,169,97,0.15); border-radius: 12px; padding: 32px; }
    .form h2 { font-size: 1.25rem; margin-bottom: 1rem; }
    .form p { font-size: 0.875rem; color: var(--warm); margin-bottom: 1.5rem; }
    .field { margin-bottom: 1rem; }
    label { display: block; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--warm); margin-bottom: 0.5rem; }
    input, select, textarea { width: 100%; padding: 12px; background: rgba(244,236,216,0.06); border: 1px solid rgba(201,169,97,0.15); border-radius: 6px; color: var(--ivory); font-family: 'Inter', sans-serif; font-size: 0.875rem; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: var(--gold); }
    button { background: var(--gold); color: var(--ink); border: none; padding: 14px 32px; border-radius: 6px; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: opacity 0.2s; width: 100%; }
    button:hover { opacity: 0.9; }
    .footer { text-align: center; margin-top: 3rem; font-size: 0.75rem; color: var(--warm); }
    .success { display: none; padding: 20px; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); border-radius: 8px; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="tier">${pack?.event_tier || "Premium"}</div>
    <h1>${e.name}</h1>
    <p class="subtitle">${e.description || "An invitation-only evening curated for those who lead."}</p>
    <p class="date">${e.location || "Location TBD"} · ${e.startDate ? new Date(e.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Date TBD"}</p>
    <p class="message">${pack?.messaging?.hero_message || "Join us for an intimate evening of curated conversation, recognition, and connection."}</p>

    <div class="form">
      <h2>Request Your Place</h2>
      <p>Submit your details and our team will be in touch to confirm your place.</p>
      <form id="captureForm">
        <div class="field">
          <label>Name</label>
          <input type="text" name="name" required>
        </div>
        <div class="field">
          <label>Email</label>
          <input type="email" name="email" required>
        </div>
        <div class="field">
          <label>Phone</label>
          <input type="tel" name="phone">
        </div>
        <div class="field">
          <label>Company</label>
          <input type="text" name="company">
        </div>
        <div class="field">
          <label>Interest Type</label>
          <select name="interest">
            <option value="attending">I want to attend</option>
            <option value="sponsorship">Sponsorship enquiry</option>
            <option value="partner">Partnership enquiry</option>
          </select>
        </div>
        <div class="field">
          <label>Message</label>
          <textarea name="message" rows="3" placeholder="Tell us why you want to be part of this..."></textarea>
        </div>
        <button type="submit">Submit Request</button>
      </form>
      <div class="success" id="success">
        <p style="color: #4ade80; font-size: 0.875rem; text-align: center;">Thank you. Your request has been received and our team will be in touch.</p>
      </div>
    </div>

    <div class="footer">
      <p>Curated by Event Perfekt · enquiries@eventperfekt.com</p>
    </div>
  </div>
  <script>
    const form = document.getElementById('captureForm');
    const success = document.getElementById('success');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const leadType = data.interest === 'sponsorship' ? 'sponsor_enquiry' :
        data.interest === 'partner' ? 'partner_enquiry' : 'registration';
      try {
        await fetch('/api/growth/inbound/${req.params.id}/' + leadType, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.name, email: data.email, phone: data.phone, company: data.company, message: data.message })
        });
      } catch(err) {}
      form.style.display = 'none';
      success.style.display = 'block';
    });
  </script>
</body>
</html>`;

    return res.json({
      ok: true,
      eventId: req.params.id,
      siteHtml,
      previewUrl: null,
      note: "Copy the HTML and deploy it to your web host. The form submits to the Growth Platform inbound API.",
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Site builder failed");
    return res.status(500).json({ error: err.message });
  }
});

// 10. LEARNING ENGINE: analyse campaign performance and generate insights
router.post("/growth/learning/:eventId", async (req, res) => {
  const start = Date.now();
  try {
    const eventId = req.params.eventId;
    const [event] = await db.select().from(growthEvents).where(eq(growthEvents.id, eventId));
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Gather data for analysis
    const messages = await db.select().from(growthOutreach).where(eq(growthOutreach.eventId, eventId));
    const prospects = await db.select().from(growthProspects).where(eq(growthProspects.eventId, eventId));
    const replies = await db.select().from(growthReplies);
    const scores = await db.select().from(growthProspectScores).where(eq(growthProspectScores.prospectId, sql`ANY(${prospects.map(p => p.id)})`));
    const pipeline = await db.select().from(growthPipelineEntries).where(eq(growthPipelineEntries.eventId, eventId));

    // Build reply data mapped to messages
    const messageIds = messages.map(m => m.id).filter(Boolean) as string[];
    const messageReplies = replies.filter(r => r.outreachId && messageIds.includes(r.outreachId));

    const stats = {
      total_messages: messages.length,
      sent: messages.filter(m => m.status === "sent").length,
      approved: messages.filter(m => m.status === "approved").length,
      pending: messages.filter(m => m.status === "pending").length,
      positive_replies: messageReplies.filter(r => r.classification === "positive").length,
      not_now_replies: messageReplies.filter(r => r.classification === "not_now").length,
      unsubscribes: messageReplies.filter(r => r.classification === "unsubscribe").length,
      total_replies: messageReplies.length,
      total_prospects: prospects.length,
      approved_prospects: prospects.filter(p => p.status === "approved").length,
      pipeline_entries: pipeline.length,
      avg_score: scores.length > 0 ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0,
    };

    const systemPrompt = `You are a growth analytics analyst. Analyse campaign performance and generate actionable insights.

Return ONLY JSON array of insights:
[
  {
    "insight_type": "message_pattern|channel_performance|persona_fit|timing|sector|overall",
    "insight": "string (one clear actionable insight)",
    "evidence": ["string"],
    "confidence": 0-100,
    "recommendation": "string"
  }
]

Rules:
- Be specific. Use actual numbers.
- Don't state the obvious.
- Focus on what WORKED and what DIDN'T.
- If there's little data, say so and suggest what to try next.`;

    const prompt = `EVENT: ${event.name}

PERFORMANCE DATA:
${JSON.stringify(stats, null, 2)}

MESSAGE BREAKDOWN:
${messages.map(m => `- ${m.channel}: ${m.status} (touch ${m.sequencePosition})`).join("\n")}

REPLY BREAKDOWN:
${messageReplies.map(r => `- ${r.classification}: "${r.content.substring(0, 60)}..."`).join("\n") || "No replies yet"}

PROSPECT SECTORS:
${[...new Set(prospects.map(p => p.industry).filter(Boolean))].join(", ") || "No sector data"}

Generate 3-5 learning insights from this data.`;

    const { content, usage, cost, model } = await callOpenRouter(
      MODELS.classify,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      { maxTokens: 2000, temperature: 0.4, jsonMode: true }
    );

    await logSpend("learning_insights", model, cost, { eventId, usage });

    let insights: any[];
    try {
      insights = JSON.parse(content.replace(/^```json\s*/, "").replace(/\s*```$/, ""));
      if (!Array.isArray(insights)) insights = [insights];
    } catch {
      insights = [{
        insight_type: "overall",
        insight: "Could not generate learning insights from current data.",
        evidence: [],
        confidence: 0,
        recommendation: "Collect more campaign data (outreach, replies, pipeline) before learning insights can be generated.",
      }];
    }

    // Store insights
    const stored = [];
    for (const insight of insights) {
      const [record] = await db.insert(growthLearningInsights).values({
        eventId,
        insightType: insight.insight_type || "overall",
        insight: insight.insight || "",
        evidence: insight.evidence || [],
        confidence: insight.confidence || 50,
        applied: false,
      }).returning();
      stored.push(record);
    }

    return res.json({
      ok: true,
      insights: stored,
      stats,
      latency_ms: Date.now() - start,
      cost,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Learning insights failed");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// List learning insights for an event
router.get("/growth/learning", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: "eventId required" });

    const insights = await db.select()
      .from(growthLearningInsights)
      .where(eq(growthLearningInsights.eventId, eventId as string))
      .orderBy(desc(growthLearningInsights.createdAt));

    return res.json({ ok: true, insights });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list learning insights");
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── User Preferences (Part 3: No re-prompting) ────────────────────
router.get("/growth/preferences/:ownerId", async (req, res) => {
  try {
    const prefs = await db.select().from(growthUserPreferences).where(eq(growthUserPreferences.ownerId, req.params.ownerId));
    if (prefs.length === 0) {
      return res.json({ ok: true, preferences: null });
    }
    return res.json({ ok: true, preferences: prefs[0] });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get preferences");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/preferences/:ownerId", async (req, res) => {
  try {
    const { tier, houseStyle, excludedIndustries, customRules } = req.body;
    const existing = await db.select().from(growthUserPreferences).where(eq(growthUserPreferences.ownerId, req.params.ownerId));
    const values = {
      tier: tier || undefined,
      houseStyle: houseStyle ? JSON.stringify(houseStyle) : undefined,
      excludedIndustries: excludedIndustries ? JSON.stringify(excludedIndustries) : undefined,
      customRules: customRules || undefined,
      updatedAt: new Date(),
    };
    if (existing.length > 0) {
      const [updated] = await db.update(growthUserPreferences).set(values).where(eq(growthUserPreferences.ownerId, req.params.ownerId)).returning();
      return res.json({ ok: true, preferences: updated });
    }
    const [created] = await db.insert(growthUserPreferences).values({
      ownerId: req.params.ownerId,
      ...values,
      createdAt: new Date(),
    }).returning();
    return res.json({ ok: true, preferences: created });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to save preferences");
    return res.status(500).json({ error: err.message });
  }
});


// ── Resume State (Part 2: Continuity) ─────────────────────────────────────
router.post("/growth/resume", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { eventId, page, step, action } = req.body;
    if (!eventId || !page || !action) {
      return res.status(400).json({ error: "Missing eventId, page, or action" });
    }
    const existing = await db.select().from(growthResumeState)
      .where(and(eq(growthResumeState.ownerId, ownerId), eq(growthResumeState.eventId, eventId)));
    if (existing.length > 0) {
      const [updated] = await db.update(growthResumeState)
        .set({ page, step: step || null, action, lastAt: new Date() })
        .where(and(eq(growthResumeState.ownerId, ownerId), eq(growthResumeState.eventId, eventId)))
        .returning();
      return res.json({ ok: true, state: updated });
    }
    const [created] = await db.insert(growthResumeState).values({
      ownerId, eventId, page, step: step || null, action, lastAt: new Date(),
    }).returning();
    return res.json({ ok: true, state: created });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to save resume state");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/growth/resume", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { eventId } = req.query;
    if (eventId) {
      const [state] = await db.select().from(growthResumeState)
        .where(and(eq(growthResumeState.ownerId, ownerId), eq(growthResumeState.eventId, eventId as string)));
      return res.json({ ok: true, state: state || null });
    }
    const states = await db.select().from(growthResumeState)
      .where(eq(growthResumeState.ownerId, ownerId))
      .orderBy(desc(growthResumeState.lastAt));
    const eventIds = states.map((s) => s.eventId);
    const eventNames = eventIds.length > 0
      ? await db.select({ id: growthEvents.id, name: growthEvents.name }).from(growthEvents).where(inArray(growthEvents.id, eventIds))
      : [];
    const enriched = states.map((s) => ({
      ...s,
      eventName: eventNames.find((e) => e.id === s.eventId)?.name || "Unknown",
    }));
    return res.json({ ok: true, states: enriched });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get resume state");
    return res.status(500).json({ error: err.message });
  }
});

// ── Challenge Endpoint (Part 3: Intelligent Guidance) ─────────────────────
router.post("/growth/challenge", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { eventId, field, value } = req.body;
    if (!field || !value) return res.status(400).json({ error: "Missing field or value" });
    const [event] = await db.select().from(growthEvents).where(eq(growthEvents.id, eventId));
    if (event && event.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    const tier = (event?.strategyPack as any)?.tier || "mid-market";

    const challenges: { trigger: string; check: (v: any) => boolean; suggestion: string; reasoning: string }[] = [
      {
        trigger: "pricing",
        check: (v) => typeof v === "number" && ((tier === "premium" && v < 150) || (tier === "mid-market" && v < 30) || (tier === "mass-market" && v < 10)),
        suggestion: "Consider pricing that better reflects your tier positioning.",
        reasoning: "\u00a390 may undersell a premium offering; comparable events at this tier price at \u00a3300+. Lower prices can signal lower quality.",
      },
      {
        trigger: "tone",
        check: (v) => typeof v === "string" && /casual|laid.?back|chill/i.test(v) && (tier === "premium"),
        suggestion: "Consider a more refined tone for premium positioning.",
        reasoning: "Premium sponsors expect polished, confident communication. A casual tone may signal inexperience.",
      },
      {
        trigger: "targeting",
        check: (v) => typeof v === "string" && /everyone|all|anyone|general/i.test(v),
        suggestion: "Define a tighter audience niche.",
        reasoning: "Mass targeting dilutes message effectiveness. Focus on a specific persona improves conversion and perceived exclusivity.",
      },
    ];

    const match = challenges.find((c) => c.trigger === field && c.check(value));
    if (match) {
      return res.json({
        ok: true,
        challenge: true,
        suggestion: match.suggestion,
        reasoning: match.reasoning,
        current: value,
      });
    }
    return res.json({ ok: true, challenge: false });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to evaluate challenge");
    return res.status(500).json({ error: err.message });
  }
});

// ── Sponsor Pipeline ──────────────────────────────────────────────────────────

router.get("/growth/sponsors", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { eventId } = req.query;
    const list = eventId
      ? await db.select().from(growthSponsors).where(and(eq(growthSponsors.ownerId, ownerId), eq(growthSponsors.eventId, eventId as string))).orderBy(desc(growthSponsors.fitScore))
      : await db.select().from(growthSponsors).where(eq(growthSponsors.ownerId, ownerId)).orderBy(desc(growthSponsors.updatedAt));
    return res.json({ ok: true, sponsors: list });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list sponsors");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/sponsors", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const data = { ...req.body, ownerId };
    const [sponsor] = await db.insert(growthSponsors).values(data).returning();
    return res.json({ ok: true, sponsor });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create sponsor");
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/growth/sponsors/:id", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { id } = req.params;
    const [existing] = await db.select().from(growthSponsors).where(eq(growthSponsors.id, id));
    if (!existing || existing.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    const [updated] = await db.update(growthSponsors).set(req.body).where(eq(growthSponsors.id, id)).returning();
    return res.json({ ok: true, sponsor: updated });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to update sponsor");
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/growth/sponsors/:id", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { id } = req.params;
    const [existing] = await db.select().from(growthSponsors).where(eq(growthSponsors.id, id));
    if (!existing || existing.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    await db.delete(growthSponsors).where(eq(growthSponsors.id, id));
    return res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to delete sponsor");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/sponsors/:id/score", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { id } = req.params;
    const [sponsor] = await db.select().from(growthSponsors).where(eq(growthSponsors.id, id));
    if (!sponsor || sponsor.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });

    const prompt = `You are a sponsorship intelligence analyst for a premium women's leadership event.
    Event: ${sponsor.organisationName}.
    Score this sponsor out of 100 for 6 dimensions. Return JSON: { score, womenFocus, csrDeiWellbeing, luxuryFit, localRelevance, previousSponsorship, brandPrestige, likelihood, reasons: string[] }.
    `;
    const { content } = await callOpenRouter(MODELS.drafting, [{ role: "user", content: prompt }], { jsonMode: true });
    const result = JSON.parse(content);
    await db.insert(growthSponsorScores).values({
      sponsorId: id,
      score: result.score,
      womenFocus: result.womenFocus,
      csrDeiWellbeing: result.csrDeiWellbeing,
      luxuryFit: result.luxuryFit,
      localRelevance: result.localRelevance,
      previousSponsorship: result.previousSponsorship,
      brandPrestige: result.brandPrestige,
      likelihood: result.likelihood,
      reasons: result.reasons,
    });
    await db.update(growthSponsors).set({ fitScore: result.score }).where(eq(growthSponsors.id, id));
    return res.json({ ok: true, score: result });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to score sponsor");
    return res.status(500).json({ error: err.message });
  }
});

// ── PR Pipeline ────────────────────────────────────────────────────────────────

router.get("/growth/pr", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { eventId } = req.query;
    const list = eventId
      ? await db.select().from(growthPrOpportunities).where(and(eq(growthPrOpportunities.ownerId, ownerId), eq(growthPrOpportunities.eventId, eventId as string))).orderBy(desc(growthPrOpportunities.fitScore))
      : await db.select().from(growthPrOpportunities).where(eq(growthPrOpportunities.ownerId, ownerId)).orderBy(desc(growthPrOpportunities.updatedAt));
    return res.json({ ok: true, opportunities: list });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list PR");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/pr", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const data = { ...req.body, ownerId };
    const [opportunity] = await db.insert(growthPrOpportunities).values(data).returning();
    return res.json({ ok: true, opportunity });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create PR opportunity");
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/growth/pr/:id", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { id } = req.params;
    const [existing] = await db.select().from(growthPrOpportunities).where(eq(growthPrOpportunities.id, id));
    if (!existing || existing.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    const [updated] = await db.update(growthPrOpportunities).set(req.body).where(eq(growthPrOpportunities.id, id)).returning();
    return res.json({ ok: true, opportunity: updated });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to update PR");
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/growth/pr/:id", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { id } = req.params;
    const [existing] = await db.select().from(growthPrOpportunities).where(eq(growthPrOpportunities.id, id));
    if (!existing || existing.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    await db.delete(growthPrOpportunities).where(eq(growthPrOpportunities.id, id));
    return res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to delete PR");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/pr/:id/score", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { id } = req.params;
    const [pr] = await db.select().from(growthPrOpportunities).where(eq(growthPrOpportunities.id, id));
    if (!pr || pr.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });

    const prompt = `You are a PR strategist for a premium women's leadership event. Outlet: ${pr.outletName}. Journalist: ${pr.journalistName}. Topic: ${pr.topic}. Angle: ${pr.angle}. Score this PR opportunity out of 100 for 6 dimensions. Return JSON: { score, outletRelevance, journalistFit, humanInterest, womenLeadership, localFit, likelihood, reasons: string[] }.`;
    const { content } = await callOpenRouter(MODELS.drafting, [{ role: "user", content: prompt }], { jsonMode: true });
    const result = JSON.parse(content);
    await db.insert(growthPrScores).values({
      prOpportunityId: id,
      score: result.score,
      outletRelevance: result.outletRelevance,
      journalistFit: result.journalistFit,
      humanInterest: result.humanInterest,
      womenLeadership: result.womenLeadership,
      localFit: result.localFit,
      likelihood: result.likelihood,
      reasons: result.reasons,
    });
    await db.update(growthPrOpportunities).set({ fitScore: result.score }).where(eq(growthPrOpportunities.id, id));
    return res.json({ ok: true, score: result });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to score PR");
    return res.status(500).json({ error: err.message });
  }
});

// ── Referrals ────────────────────────────────────────────────────────────────

router.get("/growth/referrals", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { eventId } = req.query;
    const list = eventId
      ? await db.select().from(growthReferrals).where(and(eq(growthReferrals.ownerId, ownerId), eq(growthReferrals.eventId, eventId as string))).orderBy(desc(growthReferrals.createdAt))
      : await db.select().from(growthReferrals).where(eq(growthReferrals.ownerId, ownerId)).orderBy(desc(growthReferrals.createdAt));
    return res.json({ ok: true, referrals: list });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list referrals");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/referrals", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const data = { ...req.body, ownerId };
    const [referral] = await db.insert(growthReferrals).values(data).returning();
    return res.json({ ok: true, referral });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create referral");
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/growth/referrals/:id", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { id } = req.params;
    const [existing] = await db.select().from(growthReferrals).where(eq(growthReferrals.id, id));
    if (!existing || existing.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    const [updated] = await db.update(growthReferrals).set(req.body).where(eq(growthReferrals.id, id)).returning();
    return res.json({ ok: true, referral: updated });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to update referral");
    return res.status(500).json({ error: err.message });
  }
});

// ── Corporate Targets ───────────────────────────────────────────────────────

router.get("/growth/corporate-targets", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { eventId } = req.query;
    const list = eventId
      ? await db.select().from(growthCorporateTargets).where(and(eq(growthCorporateTargets.ownerId, ownerId), eq(growthCorporateTargets.eventId, eventId as string))).orderBy(desc(growthCorporateTargets.fitScore))
      : await db.select().from(growthCorporateTargets).where(eq(growthCorporateTargets.ownerId, ownerId)).orderBy(desc(growthCorporateTargets.updatedAt));
    return res.json({ ok: true, targets: list });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list corporate targets");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/growth/corporate-targets", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const data = { ...req.body, ownerId };
    const [target] = await db.insert(growthCorporateTargets).values(data).returning();
    return res.json({ ok: true, target });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create corporate target");
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/growth/corporate-targets/:id", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { id } = req.params;
    const [existing] = await db.select().from(growthCorporateTargets).where(eq(growthCorporateTargets.id, id));
    if (!existing || existing.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    const [updated] = await db.update(growthCorporateTargets).set(req.body).where(eq(growthCorporateTargets.id, id)).returning();
    return res.json({ ok: true, target: updated });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to update corporate target");
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/growth/corporate-targets/:id", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { id } = req.params;
    const [existing] = await db.select().from(growthCorporateTargets).where(eq(growthCorporateTargets.id, id));
    if (!existing || existing.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    await db.delete(growthCorporateTargets).where(eq(growthCorporateTargets.id, id));
    return res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to delete corporate target");
    return res.status(500).json({ error: err.message });
  }
});

// ── Commercial Dashboard ────────────────────────────────────────────────────

router.get("/growth/commercial/:eventId", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { eventId } = req.params;
    const [event] = await db.select().from(growthEvents).where(eq(growthEvents.id, eventId));
    if (!event || event.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });

    const [prospectsCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthProspects).where(eq(growthProspects.eventId, eventId));
    const [applicationsCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthPipelineEntries).where(and(eq(growthPipelineEntries.eventId, eventId), eq(growthPipelineEntries.stage, "applied")));
    const [approvedCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthPipelineEntries).where(and(eq(growthPipelineEntries.eventId, eventId), eq(growthPipelineEntries.stage, "paid")));
    const [sponsorsCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthSponsors).where(eq(growthSponsors.eventId, eventId));
    const [meetingsCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthSponsors).where(and(eq(growthSponsors.eventId, eventId), eq(growthSponsors.stage, "meeting_booked")));
    const [proposalsCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthSponsors).where(and(eq(growthSponsors.eventId, eventId), eq(growthSponsors.stage, "proposal_sent")));
    const [prCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthPrOpportunities).where(eq(growthPrOpportunities.eventId, eventId));
    const [prSent] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthPrOpportunities).where(and(eq(growthPrOpportunities.eventId, eventId), eq(growthPrOpportunities.stage, "sent")));
    const [prCoverage] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthPrOpportunities).where(and(eq(growthPrOpportunities.eventId, eventId), eq(growthPrOpportunities.stage, "coverage_secured")));
    const [referralsCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthReferrals).where(eq(growthReferrals.eventId, eventId));
    const [corporateCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(growthCorporateTargets).where(eq(growthCorporateTargets.eventId, eventId));

    return res.json({
      ok: true,
      eventId,
      eventName: event.name,
      guests: {
        prospects: prospectsCount?.count ?? 0,
        applications: applicationsCount?.count ?? 0,
        approved: approvedCount?.count ?? 0,
        revenue: (approvedCount?.count ?? 0) * 360,
      },
      sponsors: {
        prospects: sponsorsCount?.count ?? 0,
        meetings: meetingsCount?.count ?? 0,
        proposals: proposalsCount?.count ?? 0,
      },
      pr: {
        opportunities: prCount?.count ?? 0,
        sent: prSent?.count ?? 0,
        coverage: prCoverage?.count ?? 0,
      },
      referrals: referralsCount?.count ?? 0,
      corporateTargets: corporateCount?.count ?? 0,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get commercial dashboard");
    return res.status(500).json({ error: err.message });
  }
});

// ── Message Generation ──────────────────────────────────────────────────────────

router.post("/growth/generate-message", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
    const { eventId, messageType, recipient, context } = req.body;
    if (!eventId || !messageType || !recipient) return res.status(400).json({ error: "Missing eventId, messageType, or recipient" });
    const [event] = await db.select().from(growthEvents).where(eq(growthEvents.id, eventId));
    if (!event || event.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });

    const validTypes = ["guest_invitation", "sponsor_intro", "corporate_partnership", "pr_pitch", "follow_up", "thank_you", "meeting_booking"];
    if (!validTypes.includes(messageType)) return res.status(400).json({ error: "Invalid message type" });

    const eventDetails = `Event: ${event.name}. Date: ${event.startDate ? new Date(event.startDate).toDateString() : "TBC"}. Venue: ${event.location || "TBC"}. Ticket: £360. Positioning: premium women's leadership. Capacity: ~60.`;

    const typePrompts: Record<string, string> = {
      guest_invitation: `Write a premium, warm, non-generic invitation email to ${recipient.name}. ${eventDetails}. Include: why this event matters for her, what she will gain, clear next step to register. Keep it under 200 words. Tone: confident, elegant, personal.`,
      sponsor_intro: `Write a concise, premium introduction email to ${recipient.contactName || recipient.name} at ${recipient.organisationName}. ${eventDetails}. Explain why their brand and the event are a natural fit. Request a brief conversation. Under 180 words. Tone: confident, respectful, exclusive.`,
      corporate_partnership: `Write a corporate partnership pitch to ${recipient.organisationName}. ${eventDetails}. Highlight their women/DEI/wellbeing initiatives as the connection. Propose a tailored partnership. Under 200 words. Tone: strategic, premium, concise.`,
      pr_pitch: `Write a PR pitch to ${recipient.journalistName || "the editor"} at ${recipient.outletName}. ${eventDetails}. Highlight the human-interest angle. Request coverage or interview. Under 160 words. Tone: compelling, concise, newsworthy.`,
      follow_up: `Write a warm follow-up email to ${recipient.name}. Reference previous contact. ${eventDetails}. Re-engage with a fresh reason. Under 120 words. Tone: personal, not pushy.`,
      thank_you: `Write a premium thank-you email to ${recipient.name}. ${eventDetails}. Express genuine gratitude. Under 100 words. Tone: warm, elegant.`,
      meeting_booking: `Write a meeting request email to ${recipient.contactName || recipient.name}. ${eventDetails}. Propose a brief call to discuss their involvement. Under 120 words. Tone: professional, premium.`,
    };

    const prompt = typePrompts[messageType];
    const { content, cost } = await callOpenRouter(MODELS.drafting, [{ role: "user", content: prompt }], { maxTokens: 400, temperature: 0.65 });
    await logSpend("message_generation", MODELS.drafting, cost, { eventId, messageType, recipientName: recipient.name || recipient.contactName || recipient.organisationName });
    return res.json({ ok: true, message: content, messageType, eventId });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to generate message");
    return res.status(500).json({ error: err.message });
  }
});

// ── Sponsor Send ─────────────────────────────────────────────────────
router.post("/growth/sponsors/:id/send", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { id } = req.params;
    const [sponsor] = await db.select().from(growthSponsors).where(eq(growthSponsors.id, id));
    if (!sponsor || sponsor.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    if (!sponsor.email) return res.status(400).json({ error: "Sponsor has no email" });

    // HARDWIRED single-send guard — atomically claim this sponsor by moving it
    // out of a pre-contact stage into "contacted" in ONE guarded update. Only the
    // first request wins the transition; a double-click, a refresh-resubmit, a
    // second tab, or a retry all match zero rows and get a 409, so the AI draft +
    // email below run at most once. (Mirrors the outreach /send status->sent claim.)
    const SPONSOR_PRE_CONTACT = ["discovered", "qualified", "decision_maker_found", "outreach_drafted", "approved_to_contact"];
    const prevStage = sponsor.stage;
    const [claimed] = await db.update(growthSponsors)
      .set({ stage: "contacted", updatedAt: new Date() })
      .where(and(eq(growthSponsors.id, id), inArray(growthSponsors.stage, SPONSOR_PRE_CONTACT)))
      .returning();
    if (!claimed) {
      return res.status(409).json({ error: "Already contacted (duplicate send prevented) — this sponsor has already been emailed." });
    }

    const [event] = sponsor.eventId ? await db.select().from(growthEvents).where(eq(growthEvents.id, sponsor.eventId)) : [null];
    try {

    // Use AI Communications Engine for SaaS-grade generation
    let comm: any = null;
    const pack = event?.strategyPack as any || {};
    const client = {
      id: sponsor.eventId || sponsor.id,
      name: event?.name || "Sponsorship Opportunity",
      brandVoice: pack.messaging_recommendations?.tone || "professional",
      approvedPhrases: pack.key_messaging || [],
      bannedPhrases: ["We are hosting", "Don't miss out"],
      preferredTone: "senior",
      sector: pack.sector || "general",
      brandPositioning: pack.positioning_tier || "premium",
      commercialRules: { pricingVisible: false, defaultCta: "learn_more" }
    };
    const campaign = {
      id: sponsor.eventId || sponsor.id,
      name: `${event?.name || "Sponsorship"} Partnership Outreach`,
      objective: "sponsor_acquisition",
      keyMessages: pack.key_messaging || ["partnership", "brand alignment", "leadership"],
      storyAngles: [{ angle: "sponsorship", description: "brand partnership", priority: "high" }],
      cta: "request_pack",
      tone: "senior",
      exclusions: ["no_pricing"]
    };
    const recipient = {
      name: sponsor.contactName || "Partner",
      email: sponsor.email,
      title: sponsor.contactTitle,
      company: sponsor.organisationName,
      sector: sponsor.sector
    };
    const intelligence = {
      who: sponsor.contactName || "Partner",
      objective: "sponsor_acquisition",
      strongestAngle: "Brand partnership and leadership positioning",
      whyCare: "Their brand and objectives align with this sponsorship initiative",
      whatFeel: "Respected and valued",
      whatDoNext: "Learn more about partnership opportunities",
      exclusions: ["no_pricing"],
      persona: "Sponsorship Consultant",
      cta: "request_pack"
    };

    const systemPrompt = `You are a Sponsorship Consultant. You write proposals that make value visible, not vague.
BRAND: ${client.name}. SECTOR: ${client.sector}. POSITIONING: ${client.brandPositioning}.
APPROVED PHRASES: ${(client.approvedPhrases || []).join(", ")}. BANNED PHRASES: ${(client.bannedPhrases || []).join(", ")}.
OBJECTIVE: ${intelligence.objective}. ANGLE: ${intelligence.strongestAngle}. CTA: ${intelligence.cta}. EXCLUSIONS: ${intelligence.exclusions.join(", ")}.
MUST MAKE CLEAR: the audience, the value, the fit, the specific opportunity, the partner benefits, and why early founding involvement matters.
FORMAT: Short paragraphs. Start every sentence with a capital letter. Use bullet points when listing 3+ benefits or details, each bullet starting with a capital letter. Plain email, one sign-off only, no marketing footer, no unsubscribe line, no unresolved placeholders.
RULES: No generic. No weak leads. Soft CTA. Max 200 words. No pricing.`;

    const userPrompt = `Write a sponsor_pitch to ${recipient.name} at ${recipient.company}. Title: ${recipient.title || "Director"}. Sector: ${recipient.sector || "general"}.
Return ONLY subject + body, separated by a blank line.`;

    const { content } = await callOpenRouter(MODELS.drafting, [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], { maxTokens: 500, temperature: 0.65 });
    const lines = content.trim().split("\n");
    const subject = lines[0].replace(/^Subject:?\s*/i, "").trim();
    const body = normalizeOutreachText(lines.slice(1).join("\n").trim());
    // This route bypasses the send gate, so enforce the global outreach rules here.
    const issues = findOutreachContentIssues(subject, body, { category: "sponsor" });
    if (issues.length) return res.status(422).json({ error: "Generated email failed outreach checks", issues });
    const html = buildEmailHtml(subject, body, event);

    await sendMail(sponsor.email, subject, html);
    await logSpend("email_sponsor", "openrouter", 0, { eventId: sponsor.eventId, sponsorId: id, recipient: sponsor.email }, "openrouter");
    return res.json({ ok: true, sent: true, recipient: sponsor.email, subject, body });
    } catch (sendErr: any) {
      // Send/draft failed after the claim — release it so a genuine retry can resend.
      await db.update(growthSponsors).set({ stage: prevStage, updatedAt: new Date() }).where(eq(growthSponsors.id, id));
      throw sendErr;
    }
  } catch (err: any) {
    logger.error({ err: err.message }, "Sponsor email send failed");
    return res.status(500).json({ error: err.message });
  }
});

// ── PR Send ──────────────────────────────────────────────────────────
router.post("/growth/pr/:id/send", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { id } = req.params;
    const [pr] = await db.select().from(growthPrOpportunities).where(eq(growthPrOpportunities.id, id));
    if (!pr || pr.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    if (!pr.email) return res.status(400).json({ error: "PR contact has no email" });

    // HARDWIRED single-send guard — atomically claim by moving the PR opportunity
    // out of a pre-send stage into "sent" in ONE guarded update. Duplicate clicks /
    // refresh / retries match zero rows and get a 409, so the pitch sends once.
    const PR_PRE_SEND = ["opportunity_found", "angle_identified", "pitch_drafted", "approved_to_send"];
    const prevStage = pr.stage;
    const [claimed] = await db.update(growthPrOpportunities)
      .set({ stage: "sent" })
      .where(and(eq(growthPrOpportunities.id, id), inArray(growthPrOpportunities.stage, PR_PRE_SEND)))
      .returning();
    if (!claimed) {
      return res.status(409).json({ error: "Already sent (duplicate send prevented) — this PR contact has already been pitched." });
    }

    const [event] = pr.eventId ? await db.select().from(growthEvents).where(eq(growthEvents.id, pr.eventId)) : [null];
    const pack = event?.strategyPack as any || {};
    try {

    const systemPrompt = `You are a PR Consultant. Write a media pitch that journalists respond to.
EVENT: ${event?.name || "Leadership Event"}. ANGLE: ${pr.angle || "leadership"}.
APPROVED PHRASES: ${(pack.key_messaging || []).join(", ")}. BANNED: "We are hosting", "Don't miss out".
MUST MAKE CLEAR: the story angle, the national-calibre audience, Dr Sarah Jenkins' expert credibility, Esther Emenike-Okorie's expert credibility, the I Am Her editorial angle, Milton Keynes as the host city, and a clear press-pack or interview next step.
FORMAT: Short paragraphs. Start every sentence with a capital letter. Use bullet points when listing 3+ details, each bullet starting with a capital letter. Plain email, one sign-off only, no marketing footer, no unsubscribe line, no unresolved placeholders.
RULES: No generic. Lead with story. Soft CTA. Max 160 words. No pricing.`;

    const userPrompt = `Write a pr_pitch to ${pr.journalistName || "Editor"} at ${pr.outletName || "Publication"}.
TOPIC: ${pr.topic}. Angle: ${pr.angle || "leadership"}.
Return ONLY subject + body, separated by a blank line.`;

    const { content } = await callOpenRouter(MODELS.drafting, [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], { maxTokens: 500, temperature: 0.65 });
    const lines = content.trim().split("\n");
    const subject = lines[0].replace(/^Subject:?\s*/i, "").trim();
    const body = normalizeOutreachText(lines.slice(1).join("\n").trim());
    // This route bypasses the send gate, so enforce the global outreach rules here.
    const issues = findOutreachContentIssues(subject, body, { category: "media" });
    if (issues.length) return res.status(422).json({ error: "Generated email failed outreach checks", issues });
    const html = buildEmailHtml(subject, body, event);

    await sendMail(pr.email, subject, html);
    await logSpend("email_pr", "openrouter", 0, { eventId: pr.eventId, prId: id, recipient: pr.email }, "openrouter");
    return res.json({ ok: true, sent: true, recipient: pr.email, subject, body });
    } catch (sendErr: any) {
      // Send/draft failed after the claim — release it so a genuine retry can resend.
      await db.update(growthPrOpportunities).set({ stage: prevStage }).where(eq(growthPrOpportunities.id, id));
      throw sendErr;
    }
  } catch (err: any) {
    logger.error({ err: err.message }, "PR email send failed");
    return res.status(500).json({ error: err.message });
  }
});

// ── Referral Send ───────────────────────────────────────────────────────
router.post("/growth/referrals/:id/send", async (req, res) => {
  try {
    const ownerId = req.user?.userId;
    const { id } = req.params;
    const [referral] = await db.select().from(growthReferrals).where(eq(growthReferrals.id, id));
    if (!referral || referral.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    if (!referral.referrerEmail) return res.status(400).json({ error: "Referrer has no email" });

    // HARDWIRED single-send guard — atomically claim by moving referral_status
    // pending -> contacted in ONE guarded update. Duplicate clicks / refresh /
    // retries match zero rows and get a 409, so the thank-you sends once.
    const prevReferralStatus = referral.referralStatus;
    const [claimed] = await db.update(growthReferrals)
      .set({ referralStatus: "contacted", updatedAt: new Date() })
      .where(and(eq(growthReferrals.id, id), eq(growthReferrals.referralStatus, "pending")))
      .returning();
    if (!claimed) {
      return res.status(409).json({ error: "Already sent (duplicate send prevented) — this referrer has already been emailed." });
    }

    const [event] = referral.eventId ? await db.select().from(growthEvents).where(eq(growthEvents.id, referral.eventId)) : [null];
    const pack = event?.strategyPack as any || {};
    try {

    const systemPrompt = `You are a Community Engagement Specialist. Write a warm, personal thank-you email.
EVENT: ${event?.name || "Our Event"}. TONE: warm, genuine, not corporate.
BANNED: "We are hosting", "Don't miss out".
RULES: No generic. Personal. Max 120 words. No pricing.`;

    const userPrompt = `Write a thank_you email to ${referral.referrerName}.
They referred someone to ${event?.name || "our event"}. Express genuine gratitude.
Return ONLY subject + body, separated by a blank line.`;

    const { content } = await callOpenRouter(MODELS.drafting, [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], { maxTokens: 500, temperature: 0.65 });
    const lines = content.trim().split("\n");
    const subject = lines[0].replace(/^Subject:?\s*/i, "").trim();
    const body = normalizeOutreachText(lines.slice(1).join("\n").trim());
    // This route bypasses the send gate, so enforce the global outreach rules here.
    const issues = findOutreachContentIssues(subject, body, { category: "introducer" });
    if (issues.length) return res.status(422).json({ error: "Generated email failed outreach checks", issues });
    const html = buildEmailHtml(subject, body, event);

    await sendMail(referral.referrerEmail, subject, html);
    await logSpend("email_referral", "openrouter", 0, { eventId: referral.eventId, referralId: id, recipient: referral.referrerEmail }, "openrouter");
    return res.json({ ok: true, sent: true, recipient: referral.referrerEmail, subject, body });
    } catch (sendErr: any) {
      // Send/draft failed after the claim — release it so a genuine retry can resend.
      await db.update(growthReferrals).set({ referralStatus: prevReferralStatus, updatedAt: new Date() }).where(eq(growthReferrals.id, id));
      throw sendErr;
    }
  } catch (err: any) {
    logger.error({ err: err.message }, "Referral email send failed");
    return res.status(500).json({ error: err.message });
  }
});

export function registerGrowthPlatformRoutes(app: any) {
  app.use("/api", router);
}
