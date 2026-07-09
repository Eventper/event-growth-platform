import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const dbRuntimeState: {
  available: boolean;
  checkedAt: string | null;
  error: string | null;
  degraded: boolean;
} = {
  available: true,
  checkedAt: null,
  error: null,
  degraded: false,
};

const isDbBypassRoute = (pathName: string) => {
  if (pathName === "/api" || pathName === "/api/health" || pathName === "/api/healthz" || pathName === "/healthz") return true;
  if (pathName.startsWith("/api/event-august/")) return true;
  if (pathName.startsWith("/api/growth/auth/")) return true;
  if (pathName.startsWith("/api/growth/outreach/")) return true;
  if (pathName === "/api/ai-comms/health" || pathName === "/api/ai-comms/health/basic") return true;
  if (pathName === "/api/admin/iamher-funnel") return true;
  if (pathName === "/api/flutterwave/webhook") return true;
  if (pathName === "/api/iam-her/summary") return true;
  if (pathName === "/api/event-applications") return true;
  if (pathName === "/api/event-august/contact") return true;
  return false;
};

const app = express();
const server = createServer(app);

app.set("trust proxy", true);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: false,
  })
);
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
app.use(helmet.referrerPolicy({ policy: "strict-origin-when-cross-origin" }));
app.use(helmet.noSniff());
app.use(helmet.xssFilter());

app.use((req: any, res: any, next: any) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.removeHeader("X-Powered-By");
  if (!req.path.startsWith("/api/")) {
    res.setHeader("X-Robots-Tag", "index, follow");
  }
  next();
});

// Public liveness probe — registered before any rate limiter, auth middleware,
// or route registration so deploy/uptime health checks always reach it, never
// hit authentication, and keep working even if downstream route setup throws.
// Dependency-free (no DB) so it reflects process liveness, not readiness.
// It also surfaces the last tender-sweep health (Phase 2, Task 2) from the
// in-memory snapshot on globalThis — no DB call, so the probe stays fast even
// if the database is down. `sweep` is null until the first sweep completes.
const healthHandler = (_req: any, res: any) => {
  const sweep = (globalThis as any).__epTenderSweepHealth || null;
  res.status(200).json({
    status: "ok",
    service: "event-perfekt-api",
    db: {
      available: dbRuntimeState.available,
      degraded: dbRuntimeState.degraded,
      checkedAt: dbRuntimeState.checkedAt,
      error: dbRuntimeState.error,
    },
    sweep: sweep
      ? {
          overall: sweep.overall,
          at: sweep.at,
          trigger: sweep.trigger,
          rawTotal: sweep.rawTotal,
          totalQualifying: sweep.totalQualifying,
          sources: sweep.sources,
          reason: sweep.reason,
        }
      : null,
  });
};
app.get("/api/health", healthHandler);
app.get("/api/healthz", healthHandler);
app.get("/healthz", healthHandler);

// Root API info handler — used by deployer probes and API discovery
app.get("/api", (_req: any, res: any) => {
  res.json({ status: "ok", service: "event-perfekt-api", version: "1.0.0" });
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: (req: any) => req.path === "/health" || req.path === "/healthz",
});
app.use("/api/", apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

const iamherLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again later." },
});
const iamherPaths = [
  "/api/event-august/stories",
  "/api/event-august/contact",
  "/api/event-august/interest",
  "/api/event-august/concierge-request",
  "/api/event-august/partner",
  "/api/event-august/sponsor",
  "/api/event-august/feature",
  "/api/event-august/brochure",
  "/api/event-august/founding-assessment",
  "/api/event-august/table-nominations",
  "/api/event-august/nominate",
  "/api/event-august/room-profile",
  "/api/event-august/payment-attempt",
  "/api/event-august/payment-reference",
];
iamherPaths.forEach((p) => app.use(p, iamherLimiter));

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : [
      "http://localhost:5173",
      "http://localhost:5174",
      ...(process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(",").map((d) => `https://${d.trim()}`) : []),
    ];

app.use((req: any, res: any, next: any) => {
  const origin = req.headers.origin;
  // Exact-match allowlist only. Reflecting an attacker-controlled origin (or "*")
  // together with Allow-Credentials would let any site make authenticated
  // cross-origin requests, so credentials are sent ONLY for an exact match.
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

const { PaymentService } = await import("./payment");

app.post("/api/flutterwave/webhook", express.json(), (req: any, res: any) => {
  const signature = req.headers["verif-hash"] as string;
  if (!PaymentService.verifyWebhookSignature(signature)) {
    return res.status(401).end();
  }
  const payload = req.body;
  logger.info({ event: payload.event, tx_ref: payload.data?.tx_ref }, "Flutterwave webhook received");
  if (payload.event === "charge.completed" && payload.data?.status === "successful") {
    logger.info({ tx_ref: payload.data.tx_ref, currency: payload.data.currency, amount: payload.data.amount }, "Payment successful");
  }
  res.status(200).end();
});

const bodyLimitConfig = { limit: "1gb" };
app.use(express.json(bodyLimitConfig));
app.use(express.urlencoded({ extended: true, ...bodyLimitConfig }));
app.use(express.raw(bodyLimitConfig));

app.use((req: any, res: any, next: any) => {
  if (!req.path.startsWith("/api")) return next();
  if (dbRuntimeState.available) return next();
  if (isDbBypassRoute(req.path)) return next();

  return res.status(503).json({
    error: "Database unavailable. API is running in degraded mode.",
    action: "Start PostgreSQL and restart the API server to re-enable database-backed routes.",
  });
});

async function startServer() {
  try {
    const { checkDatabaseConnection } = await import("./db");
    const dbCheck = await checkDatabaseConnection();
    dbRuntimeState.checkedAt = new Date().toISOString();
    if (dbCheck.ok) {
      dbRuntimeState.available = true;
      dbRuntimeState.error = null;
      dbRuntimeState.degraded = false;
    } else {
      dbRuntimeState.available = false;
      dbRuntimeState.error = dbCheck.message;
      dbRuntimeState.degraded = true;
      logger.warn({ error: dbCheck.message }, "Database unavailable at startup; running in degraded mode");
    }

    const startupInitFailures: Array<{ module: string; error: string }> = [];

    const runInit = async (name: string, init: () => Promise<void> | void) => {
      try {
        await init();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        startupInitFailures.push({ module: name, error: message });
        logger.warn({ module: name, error: message }, "Startup module initialization failed; continuing in degraded mode");
      }
    };

    const listenWithFallback = async (preferredPort: number) => {
      const maxAttempts = 10;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const candidatePort = preferredPort + attempt;
        try {
          await new Promise<void>((resolve, reject) => {
            const onError = (err: NodeJS.ErrnoException) => {
              server.off("listening", onListening);
              reject(err);
            };
            const onListening = () => {
              server.off("error", onError);
              resolve();
            };
            server.once("error", onError);
            server.once("listening", onListening);
            server.listen(candidatePort, "0.0.0.0");
          });

          if (candidatePort !== preferredPort) {
            logger.warn({ requestedPort: preferredPort, boundPort: candidatePort }, "Requested port unavailable; using fallback port");
          }

          return candidatePort;
        } catch (err) {
          const error = err as NodeJS.ErrnoException;
          if (error.code !== "EADDRINUSE") throw error;
          logger.warn({ port: candidatePort }, "Port already in use; trying next port");
        }
      }

      throw new Error(`Unable to bind server after trying ports ${preferredPort}-${preferredPort + maxAttempts - 1}`);
    };

    // Start listening immediately so the deployer's startup health check
    // (GET /api/healthz) gets a 200 response before heavy init blocks us.
    // The health routes are already registered on `app` above.
    const activePort = await listenWithFallback(port);
    logger.info({ port: activePort }, "Event Perfekt platform running");

    if (PaymentService.isConfigured()) {
      logger.info("Flutterwave payment gateway configured");
    } else {
      logger.warn("Flutterwave API keys not set - payment features disabled");
    }

    const { registerEPGlobalRoutes } = await import("./epglobal-routes");
    const { registerGroupPortalRoutes } = await import("./group-portal-routes");
    const { registerClientPortalRoutes } = await import("./client-portal-routes");
    const { registerEPClientOnboardingRoutes } = await import("./ep-client-onboarding-routes");
    const { registerEPClientRoutes } = await import("./ep-client-routes");
    const { startIntelligenceScheduler } = await import("./ep-intelligence-service");
    const { startReplyPoller } = await import("./reply-poller");
    const { startSequenceExecutor } = await import("./sequence-executor");
    const { startGrowthSequenceExecutor } = await import("./growth-sequence-executor");
    const { startGrowthReplyPoller } = await import("./growth-reply-poller");
    const { startCampaignScheduler } = await import("./campaign-scheduler");
    const { registerCampaignRoutes } = await import("./campaign-routes");
    const { registerOutreachRoutes } = await import("./outreach-routes");
    const { startTenderSweeper } = await import("./tender-sweeper");
    const { startDeadlineMailer } = await import("./tender-deadline-mailer");
    const { registerAlliOnboardingFixes } = await import("./alli-onboarding-fixes");
    const { registerAlliModuleRoutes } = await import("./alli-modules-routes");
    const { registerEventAugustRoutes } = await import("./event-august-routes");
    const { registerEventApplicationsRoutes } = await import("./event-applications-routes");
    const { registerCrossSystemRoutes } = await import("./cross-system-routes");
    const { registerBridgeRoutes } = await import("./bridge-routes");
    const { ensurePendingSyncsTable, scheduleSignoffSyncRetries } = await import("./alli-signoff-sync");
    const { bootstrapInvitationTracking, registerInvitationTrackingRoutes } = await import("./invitation-tracking-routes");
    const { startInvitationReminderScheduler } = await import("./invitation-reminder-scheduler");
    const { bootstrapVisitorTracking, registerVisitorTrackingRoutes } = await import("./visitor-tracking-routes");
    const { registerMarketingAgentRoutes } = await import("./marketing-agent-routes");
    const { startVisitorNotificationScheduler } = await import("./visitor-notification-scheduler");
    const { pingIndexNow, startupIndexNowPing, INDEXNOW_DEFAULT_URLS } = await import("./indexnow");
    const { registerRoutes } = await import("./routes/routes");
    const { authenticateToken } = await import("./auth");
    const { setupErrorHandling } = await import("./error-handler");
    const { registerSEOMetaInjector } = await import("./seo-meta-injector");
    const ukTendersRouter = (await import("./uk-tenders-routes")).default;
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const { runTenderSweep } = await import("./tender-sweeper");
    const { sendMail } = await import("./emailService");
    const { registerGrowthPlatformRoutes } = await import("./growth-platform-routes");
    const elizabethWorkflowRouter = (await import("./growth-elizabeth-workflow")).default;
    const outreachAnalyticsRouter = (await import("./growth-outreach-analytics")).default;

    if (dbRuntimeState.available) {
      registerEPGlobalRoutes(app);
      registerGroupPortalRoutes(app);
      registerClientPortalRoutes(app);
      registerEPClientOnboardingRoutes(app);
      registerEPClientRoutes(app);
      startIntelligenceScheduler();
      startReplyPoller();
      startSequenceExecutor();
      startGrowthSequenceExecutor();
      startGrowthReplyPoller();
      registerCampaignRoutes(app, authenticateToken);
      registerOutreachRoutes(app, authenticateToken);
      startCampaignScheduler();
      startTenderSweeper();
      startDeadlineMailer();
      registerAlliOnboardingFixes(app);

      await runInit("alli-modules-routes", () => registerAlliModuleRoutes(app));
      await runInit("event-august-routes", () => registerEventAugustRoutes(app));
      await runInit("event-applications-routes", () => registerEventApplicationsRoutes(app));
      await runInit("cross-system-routes", () => registerCrossSystemRoutes(app));
      await runInit("bridge-routes", () => registerBridgeRoutes(app));
      await runInit("alli-signoff-sync:ensurePendingSyncsTable", () => ensurePendingSyncsTable());
      await runInit("alli-signoff-sync:scheduleSignoffSyncRetries", () => scheduleSignoffSyncRetries());
      await runInit("invitation-tracking:bootstrap", () => bootstrapInvitationTracking());
      registerInvitationTrackingRoutes(app);
      startInvitationReminderScheduler();
      await runInit("visitor-tracking:bootstrap", () => bootstrapVisitorTracking());
      registerVisitorTrackingRoutes(app);
      registerMarketingAgentRoutes(app);
      startVisitorNotificationScheduler();
    } else {
      logger.warn("Skipping DB bootstrap modules because database is unavailable");
      registerGrowthPlatformRoutes(app);

      const degradedStories = [
        {
          id: 0,
          slug: "degraded-story-preview",
          name: "I Am Her",
          display_name: "I Am Her",
          anonymous: true,
          job_title: null,
          generalized_title: "Community Member",
          company: null,
          category: "The Woman Behind the Title",
          title: "Local preview mode",
          story: "The I Am Her platform is running in local degraded mode because the database is unavailable. Core pages still work, and submissions are accepted for smoke checks.",
          photo_url: null,
          featured: false,
          published_at: new Date().toISOString(),
          country: "UK",
          city: "Milton Keynes",
        },
      ];

      const acceptDegradedForm = (path: string, requiredFields: string[] = []) => {
        app.post(path, async (req: any, res: any) => {
          const missing = requiredFields.find((field) => {
            const value = req.body?.[field];
            return typeof value !== "string" || value.trim() === "";
          });
          if (missing) {
            return res.status(400).json({ message: `${missing} is required.` });
          }
          logger.info({ path, degraded: true }, "Accepted I AM HER submission in degraded mode");
          return res.status(200).json({
            ok: true,
            degraded: true,
            id: `degraded-${Date.now()}`,
            message: "Submission received in local degraded mode.",
          });
        });
      };

      // Minimal degraded-mode support for I AM HER dashboard so local UX stays usable.
      app.get("/api/iam-her/summary", (_req: any, res: any) => {
        return res.json({
          co_creators_confirmed: 1,
          corporate_partners_count: 0,
          guest_applications_count: 0,
          tasks_total: 0,
          tasks_overdue: 0,
          next_milestone: "Database unavailable in local mode. Connect Postgres to load live I AM HER data.",
          degraded: true,
        });
      });

      app.get("/api/event-applications", (_req: any, res: any) => {
        return res.json([]);
      });

      app.get("/api/event-august/stories", (_req: any, res: any) => {
        return res.json({ stories: degradedStories, degraded: true });
      });

      app.get("/api/event-august/stories/count", (_req: any, res: any) => {
        return res.json({ count: degradedStories.length, degraded: true });
      });

      app.get("/api/event-august/story/:slug", (req: any, res: any) => {
        const slug = String(req.params?.slug || "");
        const story = degradedStories.find((s) => s.slug === slug) || null;
        return res.json({ story, degraded: true });
      });

      acceptDegradedForm("/api/event-august/interest", ["first_name", "last_name", "email", "role"]);
      acceptDegradedForm("/api/event-august/community", ["full_name", "email"]);
      acceptDegradedForm("/api/event-august/concierge-request", ["name", "email"]);
      acceptDegradedForm("/api/event-august/waiting-list", ["name", "email"]);
      acceptDegradedForm("/api/event-august/brochure", ["name", "email"]);
      acceptDegradedForm("/api/event-august/partner", ["name", "organisation", "email"]);
      acceptDegradedForm("/api/event-august/sponsor", ["name", "brand", "email"]);
      acceptDegradedForm("/api/event-august/feature", ["full_name", "iamher_statement"]);
      acceptDegradedForm("/api/event-august/nominate", ["nominator_name", "nominee_name", "nominee_email"]);

      app.post("/api/event-august/contact", async (req: any, res: any) => {
        const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
        const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
        const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
        if (!name || !email || !message) {
          return res.status(400).json({ message: "Name, email, and message are required." });
        }

        logger.info({ name, email, event: "iam-her", degraded: true }, "Accepted I AM HER contact in degraded mode");
        return res.status(200).json({ ok: true, degraded: true, message: "Message received in local degraded mode." });
      });

      app.get("/api/ai-comms/health", (_req: any, res: any) => {
        return res.status(200).json({
          status: "degraded",
          database: "unavailable",
          apollo: { status: "unknown" },
          email: { status: "unknown" },
          message: "AI communications health is limited in local degraded mode.",
        });
      });

      app.get("/api/growth/outreach/health", (_req: any, res: any) => {
        if (!req.headers.authorization) {
          return res.status(401).json({ message: "Authentication token required" });
        }
        return res.status(200).json({ ok: true, degraded: true, mode: "local" });
      });

      app.get("/api/growth/outreach/senders", (_req: any, res: any) => {
        if (!req.headers.authorization) {
          return res.status(401).json({ message: "Authentication token required" });
        }
        return res.status(200).json({ senders: [], default: null, degraded: true });
      });

      app.get("/api/admin/iamher-funnel", (req: any, res: any) => {
        if (!req.headers.authorization) {
          return res.status(401).json({ message: "Authentication token required" });
        }
        return res.status(200).json({
          summary: {
            visitors: 0,
            cta_clicks: 0,
            cta_rate: 0,
            form_starts: 0,
            form_start_rate: 0,
            submissions: 0,
            conversion_rate: 0,
            submit_errors: 0,
            submit_error_rate: 0,
          },
          daily: [],
          topSources: [],
          topCountries: [],
          topDevices: [],
          generatedAt: new Date().toISOString(),
          degraded: true,
        });
      });
    }
    if (dbRuntimeState.available) {
      const { registerIamherBusinessRoutes } = await import("./iamher-business-routes");
      registerIamherBusinessRoutes(app, authenticateToken);
      const { registerAiCommunicationsRoutes } = await import("./ai-communications-engine");
      registerAiCommunicationsRoutes(app);
      registerGrowthPlatformRoutes(app);
      app.use("/api", elizabethWorkflowRouter);
      app.use("/api", outreachAnalyticsRouter);
      app.use("/api", ukTendersRouter);
    }

    const TENDER_ADMIN_SECRET = "ep-tender-admin-2026";
    function requireAdmin(req: any, res: any, next: any) {
      if (req.headers["x-admin-secret"] === TENDER_ADMIN_SECRET) return next();
      if (!req.user) return res.status(401).json({ message: "Not authenticated" });
      if (!["admin", "planner", "manager"].includes(req.user.role)) return res.status(403).json({ message: "Admin role required" });
      next();
    }

    app.post("/api/admin/tender/sweep-now", requireAdmin, async (_req: any, res: any) => {
      try {
        const start = Date.now();
        const result = await runTenderSweep();
        const elapsed = Math.round((Date.now() - start) / 1000);
        const todayRows = await db.execute(sql`
          SELECT COUNT(*)::int AS cnt FROM saas_tenders
          WHERE updated_at >= NOW() - INTERVAL '2 hours'
        `).catch(() => ({ rows: [{ cnt: 0 }] }));
        const todayCount = (todayRows.rows[0] as any)?.cnt ?? 0;
        res.json({ ...result, elapsed_seconds: elapsed, today_in_db: todayCount });
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    app.post("/api/admin/indexnow/ping", requireAdmin, async (req: any, res: any) => {
      try {
        const urls = Array.isArray(req.body?.urls) && req.body.urls.length > 0 ? req.body.urls : INDEXNOW_DEFAULT_URLS;
        const result = await pingIndexNow(urls);
        res.status(result.ok ? 200 : 502).json(result);
      } catch (err: any) {
        res.status(500).json({ ok: false, message: err?.message || "IndexNow ping failed" });
      }
    });

    if (dbRuntimeState.available) {
      await registerRoutes(app);
    } else {
      logger.warn("Skipping database-backed route registration while in degraded mode");
    }

    app.use("/alli-uploads", (req: any, res: any) => {
      const filename = req.path.slice(1);
      const candidates = [
        path.join(process.cwd(), "uploads", "alli", filename),
        path.join(process.cwd(), "alli-uploads", filename),
      ];
      const filePath = candidates.find((p) => fs.existsSync(p));
      if (!filePath) return res.status(404).json({ message: "File not found" });
      const ext = path.extname(filename).toLowerCase();
      const mime: Record<string, string> = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
      const stat = fs.statSync(filePath);
      res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Content-Disposition", `inline; filename="${path.basename(filename)}"`);
      fs.createReadStream(filePath).pipe(res);
    });

    app.use("/uploads", (req: any, res: any) => {
      const filePath = path.join(process.cwd(), "uploads", req.path.slice(1));
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found" });
      const fd = fs.openSync(filePath, "r");
      const buf = Buffer.alloc(12);
      fs.readSync(fd, buf, 0, 12, 0);
      fs.closeSync(fd);
      let contentType = "application/octet-stream";
      if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) contentType = "video/mp4";
      else if (buf.toString("ascii", 4, 8) === "moov") contentType = "video/quicktime";
      else if (buf[0] === 0xff && buf[1] === 0xd8) contentType = "image/jpeg";
      else if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) contentType = "image/png";
      else if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) contentType = "image/gif";
      else if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) contentType = "image/webp";
      const stat = fs.statSync(filePath);
      const range = req.headers.range;
      if (range && contentType.startsWith("video/")) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunkSize = end - start + 1;
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Length", stat.size);
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Cache-Control", "no-cache");
        fs.createReadStream(filePath).pipe(res);
      }
    });

    app.use("/planner-dashboard", (req: any, res: any, next: any) => {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith("Basic ")) {
        res.set("WWW-Authenticate", 'Basic realm="Event Perfekt Planner"');
        return res.status(401).send("Authentication required");
      }
      try {
        const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
        const [username, password] = decoded.split(":");
        if (username === "eventperfekt" && password === "password") return next();
      } catch {}
      res.set("WWW-Authenticate", 'Basic realm="Event Perfekt Planner"');
      return res.status(401).send("Invalid credentials");
    });

    // Serve Growth Platform frontend locally from the API server process.
    // This keeps /growth-platform/login reachable without a separate web server.
    const growthUiCandidates = [
      path.join(process.cwd(), "..", "growth-platform", "dist", "public"),
      path.join(process.cwd(), "artifacts", "growth-platform", "dist", "public"),
    ];
    const growthUiDir = growthUiCandidates.find((dir) => fs.existsSync(path.join(dir, "index.html")));
    if (growthUiDir) {
      app.use("/growth-platform", express.static(growthUiDir, { index: false }));
      app.get("/growth-platform", (_req: any, res: any) => {
        res.sendFile(path.join(growthUiDir, "index.html"));
      });
      app.get(/^\/growth-platform(?:\/.*)?$/, (_req: any, res: any) => {
        res.sendFile(path.join(growthUiDir, "index.html"));
      });
    } else {
      logger.warn("Growth Platform UI bundle not found; /growth-platform/* will return 404 until it is built.");
    }

    registerSEOMetaInjector(app);
    setupErrorHandling(app);

    if (startupInitFailures.length > 0) {
      logger.warn(
        {
          count: startupInitFailures.length,
          modules: startupInitFailures.map((m) => m.module),
        },
        "Startup completed with partial module initialization",
      );
    }

    if (process.env.NAMECHEAP_EMAIL && process.env.NAMECHEAP_PASSWORD) {
      logger.info(`[Email] Namecheap SMTP — AUTH: ${process.env.NAMECHEAP_EMAIL}`);
    } else if (process.env.GMAIL_APP_PASSWORD) {
      logger.info(`[Email] Gmail SMTP — AUTH: ${process.env.GMAIL_ADDRESS || "admin@eventperfekt.com"}`);
    } else {
      logger.warn("[Email] No email provider configured.");
    }

    if (dbRuntimeState.available) {
      setTimeout(() => autoSeedTenders(db, sql, port), 8000);
    }
    startupIndexNowPing();
  } catch (error) {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  }
}

async function autoSeedTenders(db: any, sql: any, port: number) {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*)::int AS total, MAX(updated_at) AS last_updated FROM saas_tenders
    `);
    const row = (result.rows[0] || {}) as any;
    const total = Number(row.total || 0);
    const lastUpdated = row.last_updated ? new Date(row.last_updated) : null;
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const needsRefresh = total === 0 || !lastUpdated || lastUpdated < sixHoursAgo;
    if (!needsRefresh) {
      logger.info({ total, lastUpdated }, "[TenderSeeder] Skipping — cache fresh");
      return;
    }
    logger.info({ total, lastUpdated }, "[TenderSeeder] Seeding tenders...");
    const baseUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : `http://localhost:${port}`;
    const keywords = "programme delivery event management conference Africa international development PMO consultancy";
    const url = `${baseUrl}/api/saas-tender/finder/search?keywords=${encodeURIComponent(keywords)}&page=1`;
    const resp = await fetch(url, { headers: { "x-seed-request": "true" } });
    if (!resp.ok) {
      logger.error({ status: resp.status }, "[TenderSeeder] Search call failed");
      return;
    }
    const data = await resp.json().catch(() => ({}));
    const count = Array.isArray((data as any)?.results) ? (data as any).results.length : 0;
    logger.info({ count }, "[TenderSeeder] Complete");
  } catch (err: any) {
    logger.error({ err: err?.message }, "[TenderSeeder] Error");
  }
}

startServer();

process.on("SIGTERM", () => { logger.info("SIGTERM received"); process.exit(0); });
process.on("SIGINT", () => { logger.info("SIGINT received"); process.exit(0); });
