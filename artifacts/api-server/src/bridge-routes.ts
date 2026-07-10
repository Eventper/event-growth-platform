import { Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { emailService } from "./emailService";

const BRIDGE_SECRET = process.env.EP_BRIDGE_SECRET || "";

function roleLandingPath(role: string): string {
  switch (role) {
    case "director": return "/planner-dashboard";
    case "country_manager_uk": return "/uk-dashboard";
    case "country_manager_nigeria":
    case "admin":
    case "lagos_client_manager":
    case "head_events_manager":
    case "alli_operations": return "/nigeria-dashboard";
    case "operations_manager":
    case "decor_lead": return "/decor-inventory";
    case "day_coordinator": return "/run-sheet";
    case "guest_manager": return "/guest-management";
    case "finance": return "/invoicing";
    default: return "/planner-dashboard";
  }
}

// Maps the target_tool value embedded in the bridge JWT to a Planning App route.
// The Group Portal tile passes target_tool when calling /api/group-portal/bridge/launch.
// If the tool is recognised, we land there directly regardless of role.
// Unknown tools fall back to the role-based landing path.
function targetToolLanding(targetTool: string | undefined, role: string): string {
  const t = (targetTool || "").toLowerCase().trim();

  // Tender Centre — lands on the EP-branded Tender Manager (tender-dashboard.tsx)
  // which self-redirects to /tender-manager (TenderLogin) if no tender_token present
  if (["tenders", "tender", "tender-centre", "tender-center", "saas-tender",
       "saas-tender-dashboard", "tender-dashboard", "tender-manager",
       "ep-tender", "ep-tenders"].includes(t)) {
    return "/tender-dashboard";
  }

  // Prospect Finder
  if (["prospect-finder", "prospect", "prospects", "prospect-finder-tool",
       "prospectfinder", "ep-prospect-finder", "prospect finder"].includes(t)) {
    return "/prospect-finder";
  }

  // UK Dashboard
  if (["uk-dashboard", "uk-events", "uk-dashboard"].includes(t)) {
    return "/uk-dashboard";
  }

  // Nigeria Dashboard
  if (["nigeria-dashboard", "nigeria-events", "nigeria-dashboard"].includes(t)) {
    return "/nigeria-dashboard";
  }

  // Event Management (general)
  if (["event-management", "events", "event-tools", "event-tools-dashboard",
       "event-planning", "planner", "planner-dashboard"].includes(t)) {
    return "/planner-dashboard";
  }

  // RAID Register / risk tracking
  if (["raid", "raid-register", "raid-registers", "risk-register", "risk-registers"].includes(t)) {
    return "/client-portal/home";
  }

  // Decor Inventory
  if (["decor", "decor-inventory", "decorinventory", "inventory"].includes(t)) {
    return "/decor-inventory";
  }

  // Run Sheet / Event Day
  if (["run-sheet", "runsheet", "event-day", "event-day-command"].includes(t)) {
    return "/run-sheet";
  }

  // Guest Management
  if (["guests", "guest-management", "guestmanagement"].includes(t)) {
    return "/guest-management";
  }

  // Invoicing / Finance
  if (["invoicing", "invoices", "finance", "financial"].includes(t)) {
    return "/invoicing";
  }

  // Onboarding / Training
  if (["onboarding", "onboarding-portal", "training", "training-portal"].includes(t)) {
    return "/onboarding-portal";
  }

  // AI Research
  if (["ai-research", "research", "ai-assistant"].includes(t)) {
    return "/ai-research";
  }

  // Budget / Financial Dashboard
  if (["budget", "budget-management", "financial-dashboard"].includes(t)) {
    return "/financial-dashboard";
  }

  // Fall back to role-based landing if tool not recognised
  return roleLandingPath(role);
}

async function bootstrapBridgeTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bridge_nonces (
      nonce TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      redeemed_at TIMESTAMPTZ,
      redeemed BOOLEAN DEFAULT FALSE
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bridge_audit_log (
      id BIGSERIAL PRIMARY KEY,
      ts TIMESTAMPTZ DEFAULT NOW(),
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      scope_granted JSONB,
      target_tool TEXT,
      source_tile TEXT,
      redemption_status TEXT NOT NULL,
      nonce TEXT,
      token_kind TEXT
    )
  `);
}

async function buildBridgeWeeklySummary(): Promise<{
  totalLaunches: number;
  byRole: Record<string, number>;
  securitySignals: { expired: number; invalid: number; replay: number };
  topTools: Array<{ tool: string; count: number }>;
}> {
  const since = `NOW() - INTERVAL '7 days'`;

  const launchRows = await db.execute(sql`
    SELECT role, target_tool, redemption_status
    FROM bridge_audit_log
    WHERE ts >= NOW() - INTERVAL '7 days'
      AND token_kind = 'redeem'
  `).catch(() => ({ rows: [] }));

  const rows = launchRows.rows as any[];
  const successful = rows.filter(r => r.redemption_status === "success");
  const byRole: Record<string, number> = {};
  const toolCounts: Record<string, number> = {};
  let expired = 0, invalid = 0, replay = 0;

  for (const r of rows) {
    if (r.redemption_status === "expired") expired++;
    else if (r.redemption_status === "invalid") invalid++;
    else if (r.redemption_status === "replay_attempt") replay++;
  }
  for (const r of successful) {
    byRole[r.role] = (byRole[r.role] || 0) + 1;
    const tool = r.target_tool || "unknown";
    toolCounts[tool] = (toolCounts[tool] || 0) + 1;
  }

  const topTools = Object.entries(toolCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tool, count]) => ({ tool, count }));

  return {
    totalLaunches: successful.length,
    byRole,
    securitySignals: { expired, invalid, replay },
    topTools,
  };
}

async function sendBridgeWeeklyDigest() {
  try {
    const summary = await buildBridgeWeeklySummary();
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const roleRows = Object.entries(summary.byRole)
      .sort(([, a], [, b]) => b - a)
      .map(([role, count]) => `<tr><td style="padding:8px;border:1px solid #e2e8f0;">${role}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;">${count}</td></tr>`)
      .join("") || `<tr><td colspan="2" style="padding:8px;border:1px solid #e2e8f0;color:#888;">No launches this week</td></tr>`;

    const toolRows = summary.topTools.length > 0
      ? summary.topTools.map(({ tool, count }) => `<tr><td style="padding:8px;border:1px solid #e2e8f0;">${tool}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;">${count}</td></tr>`).join("")
      : `<tr><td colspan="2" style="padding:8px;border:1px solid #e2e8f0;color:#888;">No data yet</td></tr>`;

    const { expired, invalid, replay } = summary.securitySignals;
    const securityFlag = (expired + invalid + replay) > 0
      ? `<div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;margin-bottom:20px;">
          <strong>⚠️ Security Signals:</strong> ${expired} expired · ${invalid} invalid · ${replay} replay attempt${replay !== 1 ? "s" : ""}
        </div>`
      : `<div style="background:#d1fae5;border-left:4px solid #059669;padding:12px 16px;border-radius:6px;margin-bottom:20px;">
          ✅ No security signals this week — no expired, invalid or replayed tokens.
        </div>`;

    const html = `
<div style="font-family:Georgia,serif;max-width:640px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
  <div style="background:#330311;padding:20px 28px;border-radius:6px 6px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;">🔗 Bridge Weekly Digest</h1>
    <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;">${dateStr} · Last 7 days</p>
  </div>
  <div style="background:#fff;padding:24px 28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;">

    <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
      <div style="flex:1;min-width:100px;background:#f8f6f3;border-radius:6px;padding:16px;text-align:center;">
        <div style="font-size:32px;font-weight:bold;color:#330311;">${summary.totalLaunches}</div>
        <div style="font-size:12px;color:#888;margin-top:4px;">Successful Launches</div>
      </div>
      <div style="flex:1;min-width:100px;background:#f8f6f3;border-radius:6px;padding:16px;text-align:center;">
        <div style="font-size:32px;font-weight:bold;color:#330311;">${Object.keys(summary.byRole).length}</div>
        <div style="font-size:12px;color:#888;margin-top:4px;">Distinct Roles</div>
      </div>
      <div style="flex:1;min-width:100px;background:${(expired + invalid + replay) > 0 ? '#fff3cd' : '#f8f6f3'};border-radius:6px;padding:16px;text-align:center;">
        <div style="font-size:32px;font-weight:bold;color:${(expired + invalid + replay) > 0 ? '#b45309' : '#330311'};">${expired + invalid + replay}</div>
        <div style="font-size:12px;color:#888;margin-top:4px;">Security Signals</div>
      </div>
    </div>

    ${securityFlag}

    <h3 style="color:#330311;border-left:4px solid #330311;padding-left:10px;margin-top:0;">Launches by Role</h3>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:24px;">
      <tr style="background:#f8f6f3;">
        <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Role</th>
        <th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Launches</th>
      </tr>
      ${roleRows}
    </table>

    <h3 style="color:#330311;border-left:4px solid #330311;padding-left:10px;">Top 5 Tools via Bridge</h3>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:24px;">
      <tr style="background:#f8f6f3;">
        <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Target Tool</th>
        <th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Uses</th>
      </tr>
      ${toolRows}
    </table>

    <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">
      Bridge audit log: <code>GET /api/bridge/audit</code> (Director / Admin token required) · 
      EP Bridge · Event Perfekt Global Ltd, 20 Wenlock Road, London N1 7PG
    </p>
  </div>
</div>`;

    const BRIDGE_DIGEST_ENABLED = process.env.BRIDGE_DIGEST_ENABLED !== "false";  // Default ON
    const BRIDGE_DIGEST_EMAIL = process.env.BRIDGE_DIGEST_EMAIL || "adminuk@eventperfekt.com";
    
    if (BRIDGE_DIGEST_ENABLED) {
      await emailService.sendEmail(BRIDGE_DIGEST_EMAIL, `Bridge Weekly Digest — ${now.toLocaleDateString("en-GB")}`, html);
      console.log(`[Bridge] Weekly digest sent to ${BRIDGE_DIGEST_EMAIL}`);
    }
    console.log("[Bridge] Weekly digest sent");
  } catch (err: any) {
    console.error("[Bridge] Weekly digest error:", err.message);
  }
}

function startBridgeWeeklyDigest() {
  let lastSentDate = "";
  setInterval(() => {
    const now = new Date();
    const dayUTC = now.getUTCDay();       // 1 = Monday
    const hourUTC = now.getUTCHours();    // 9
    const minuteUTC = now.getUTCMinutes();
    const todayKey = now.toISOString().slice(0, 10);
    if (dayUTC === 1 && hourUTC === 9 && minuteUTC < 5 && lastSentDate !== todayKey) {
      lastSentDate = todayKey;
      sendBridgeWeeklyDigest();
    }
  }, 60 * 1000);
  console.log("[Bridge] Weekly digest scheduler started — fires Monday 09:00 UTC");
}

export async function registerBridgeRoutes(app: Express) {
  await bootstrapBridgeTables();
  startBridgeWeeklyDigest();

  app.post("/api/bridge/redeem", async (req: any, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "No token provided" });
    if (!BRIDGE_SECRET) return res.status(503).json({ message: "Bridge not configured" });

    let payload: any;
    try {
      payload = jwt.verify(token, BRIDGE_SECRET, { algorithms: ["HS256"] }) as any;
    } catch (e: any) {
      await db.execute(sql`
        INSERT INTO bridge_audit_log (user_id, role, scope_granted, target_tool, source_tile, redemption_status, nonce, token_kind)
        VALUES ('unknown', 'unknown', '[]'::jsonb, 'unknown', 'unknown', ${e.name === "TokenExpiredError" ? "expired" : "invalid"}, null, 'redeem')
      `).catch(() => {});
      return res.status(401).json({
        message: e.name === "TokenExpiredError"
          ? "Session expired — please click the tile on the Group Portal again to get a fresh link."
          : "Invalid bridge token.",
        expired: e.name === "TokenExpiredError",
      });
    }

    const { user_id, role, nonce, scope, source_tile, target_tool, email: bridgeEmail, name: bridgeName } = payload;

    const nonceCheck = await db.execute(sql`
      SELECT redeemed FROM bridge_nonces WHERE nonce = ${nonce}
    `);

    if (nonceCheck.rows.length > 0) {
      const row = nonceCheck.rows[0] as any;
      if (row.redeemed) {
        await db.execute(sql`
          INSERT INTO bridge_audit_log (user_id, role, scope_granted, target_tool, source_tile, redemption_status, nonce, token_kind)
          VALUES (${user_id}, ${role}, ${JSON.stringify(scope || [])}::jsonb, ${target_tool || ''}, ${source_tile || ''}, 'replay_attempt', ${nonce}, 'redeem')
        `).catch(() => {});
        return res.status(401).json({ message: "Token already used — please click the tile again.", expired: false });
      }
    }

    await db.execute(sql`
      INSERT INTO bridge_nonces (nonce, redeemed, redeemed_at)
      VALUES (${nonce}, TRUE, NOW())
      ON CONFLICT (nonce) DO UPDATE SET redeemed = TRUE, redeemed_at = NOW()
    `);

    await db.execute(sql`
      INSERT INTO bridge_audit_log (user_id, role, scope_granted, target_tool, source_tile, redemption_status, nonce, token_kind)
      VALUES (${user_id}, ${role}, ${JSON.stringify(scope || [])}::jsonb, ${target_tool || ''}, ${source_tile || ''}, 'success', ${nonce}, 'redeem')
    `);

    const landing = targetToolLanding(target_tool, role);

    // Issue a short-lived Planning App session JWT so bridge users can access
    // tools that require localStorage "token" (e.g. Prospect Finder, Planner Dashboard).
    const PLANNING_JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    const resolvedEmail = bridgeEmail || `${user_id}@bridge.eventperfekt.com`;
    const resolvedName  = bridgeName  || user_id;
    const sessionToken = jwt.sign(
      { userId: user_id, email: resolvedEmail, role, name: resolvedName, bridge: true },
      PLANNING_JWT_SECRET,
      { expiresIn: "8h" }
    );

    const sessionUser = { id: user_id, email: resolvedEmail, name: resolvedName, role };

    console.log(`[Bridge] Redeem OK — user=${user_id} (${resolvedEmail}) role=${role} target_tool=${target_tool || "none"} → landing=${landing}`);
    return res.json({ landing, role, scope: scope || [], target_tool: target_tool || null, session_token: sessionToken, session_user: sessionUser });
  });

  app.get("/api/bridge/audit", async (req: any, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Auth required" });
    try {
      const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
      const user = jwt.verify(token, JWT_SECRET) as any;
      if (!["admin", "director", "manager"].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
    } catch {
      return res.status(401).json({ message: "Invalid token" });
    }
    const rows = await db.execute(sql`
      SELECT id, ts, user_id, role, scope_granted, target_tool, source_tile, redemption_status, nonce, token_kind
      FROM bridge_audit_log
      ORDER BY ts DESC
      LIMIT 200
    `);
    return res.json(rows.rows);
  });

  app.get("/api/bridge/weekly-summary", async (req: any, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Auth required" });
    try {
      const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
      const user = jwt.verify(token, JWT_SECRET) as any;
      if (!["admin", "director", "manager"].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
    } catch {
      return res.status(401).json({ message: "Invalid token" });
    }
    try {
      const summary = await buildBridgeWeeklySummary();
      return res.json(summary);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });
}
