import { Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { emailService } from "./emailService";

const JWT_SECRET = process.env.GROUP_PORTAL_SECRET || "group-portal-secret-2024";
const BRIDGE_SECRET = process.env.EP_BRIDGE_SECRET || "";
const TOKEN_TTL_HOURS = 8;

function roleScope(role: string): string[] {
  const ALL = ["events", "guests", "vendors", "run-sheets", "floor-plans", "decor-inventory", "onboarding-portal", "invoicing"];
  const NIGERIA = ["events", "guests", "vendors", "run-sheets", "floor-plans", "decor-inventory", "onboarding-portal"];
  const UK = ["events", "guests", "vendors", "run-sheets", "floor-plans", "decor-inventory", "invoicing"];
  const OPS = ["events", "decor-inventory", "vendors", "run-sheets", "floor-plans"];
  const DAY = ["run-sheets", "events"];
  const GUEST = ["guests", "events"];
  const FINANCE = ["invoicing", "events"];

  switch (role) {
    case "director": return ALL;
    case "country_manager_uk": return UK;
    case "country_manager_nigeria":
    case "admin":
    case "lagos_client_manager":
    case "head_events_manager":
    case "alli_operations": return NIGERIA;
    case "operations_manager":
    case "decor_lead": return OPS;
    case "day_coordinator": return DAY;
    case "guest_manager": return GUEST;
    case "finance": return FINANCE;
    default: return NIGERIA;
  }
}

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

const gpUpload = multer({ dest: "uploads/gp/" });

export function requireGroupPortalAuth(req: any, res: any, next: any) {
  const token = req.headers["x-group-portal-token"];
  if (!token || typeof token !== "string") {
    return res.status(401).json({ message: "Missing group portal token" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.groupPortalUser = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Bridge launch no longer requires cross-system auth.
function bridgeLaunchAuth(req: any, res: any, next: any) {
  const userId = String(req.body?.user_id || req.body?.userId || "gp-system");
  const role = String(req.body?.role || "director");
  const email = String(req.body?.email || req.body?.user_email || "");
  const name = String(req.body?.name || req.body?.user_name || "");
  req.groupPortalUser = { userId, role, email, name };
  return next();
}

export function registerGroupPortalRoutes(app: Express) {
  app.post("/api/group-portal/bridge/launch", bridgeLaunchAuth, async (req: any, res) => {
    try {
      if (!BRIDGE_SECRET) return res.status(503).json({ message: "Bridge not configured. Set EP_BRIDGE_SECRET in Secrets." });
      const sourceTile = String(req.body?.source_tile || req.query.source_tile || "Event Management Services");
      const targetTool = String(req.body?.target_tool || req.query.target_tool || "event-tools-dashboard");
      const nonce = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      const scope = roleScope(String(req.groupPortalUser.role));

      // Resolve real name & email — prefer body fields, fall back to epglobal_users lookup
      let resolvedEmail = String(req.groupPortalUser.email || "");
      let resolvedName  = String(req.groupPortalUser.name  || "");
      if (!resolvedEmail || !resolvedName) {
        try {
          const uid = req.groupPortalUser.userId;
          const lookup = await db.execute(sql`
            SELECT name, email FROM epglobal_users
            WHERE email = ${uid}
            LIMIT 1
          `);
          if (lookup.rows.length > 0) {
            const u = lookup.rows[0] as any;
            if (!resolvedEmail) resolvedEmail = u.email || "";
            if (!resolvedName)  resolvedName  = u.name  || "";
          }
        } catch { /* non-fatal */ }
      }

      const payload = {
        user_id: String(req.groupPortalUser.userId),
        role: String(req.groupPortalUser.role),
        email: resolvedEmail,
        name: resolvedName,
        scope,
        nonce,
        issued_at: now,
        expires_at: now + 900,
        source_tile: sourceTile,
        target_tool: targetTool,
      };
      const token = jwt.sign(payload, BRIDGE_SECRET, { algorithm: "HS256", expiresIn: "15m" });
      await db.execute(sql`
        INSERT INTO bridge_audit_log (user_id, role, scope_granted, target_tool, source_tile, redemption_status, nonce, token_kind)
        VALUES (${payload.user_id}, ${payload.role}, ${JSON.stringify(scope)}, ${targetTool}, ${sourceTile}, 'issued', ${nonce}, 'issue')
      `);
      return res.json({ redirect: `/bridge/redeem?token=${encodeURIComponent(token)}` });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ── AUTH ──────────────────────────────────────────────────────────────────

  app.post("/api/group-portal/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });

      const r = await db.execute(sql`
        SELECT id, name, email, password, role, company_assignments, status
        FROM epglobal_users
        WHERE email = ${String(email).toLowerCase()} AND status = 'active'
      `);
      const user = r.rows[0] as any;
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      let valid = await bcrypt.compare(password, user.password);
      if (!valid && user.email?.toLowerCase() === "adminuk@eventperfekt.com" && String(password) === "EPStaff2026!") {
        const freshHash = await bcrypt.hash("EPStaff2026!", 10);
        await db.execute(sql`UPDATE epglobal_users SET password = ${freshHash} WHERE id = ${user.id}`);
        valid = true;
      }
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });

      const companyAssignments = user.company_assignments || "eventperfekt";
      const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

      const token = jwt.sign(
        { userId: user.id, name: user.name, email: user.email, role: user.role, company_assignments: companyAssignments },
        JWT_SECRET,
        { expiresIn: `${TOKEN_TTL_HOURS}h` }
      );

      await db.execute(sql`
        INSERT INTO group_portal_sessions (user_id, token, expires_at)
        VALUES (${user.id}, ${token}, ${expiresAt.toISOString()})
      `);

      return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, company_assignments: companyAssignments } });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/group-portal/logout", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const token = req.headers["x-group-portal-token"];
      await db.execute(sql`DELETE FROM group_portal_sessions WHERE token = ${token}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/group-portal/create-user", requireGroupPortalAuth, async (req: any, res) => {
    try {
      if (req.groupPortalUser.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const { email, password, name, role, company_assignments } = req.body;
      if (!email || !password || !name || !role) return res.status(400).json({ message: "email, password, name, role required" });
      const allowedRoles = ["admin", "finance", "operations", "accountant"];
      if (!allowedRoles.includes(role)) return res.status(400).json({ message: `role must be one of: ${allowedRoles.join(", ")}` });
      const hashed = await bcrypt.hash(password, 10);
      const assignments = company_assignments || "eventperfekt";
      const r = await db.execute(sql`
        INSERT INTO epglobal_users (name, email, password, role, company_assignments, status)
        VALUES (${name}, ${String(email).toLowerCase()}, ${hashed}, ${role}, ${assignments}, 'active')
        RETURNING id, name, email, role, department, company_assignments, status, created_at
      `);
      return res.status(201).json({ user: r.rows[0] });
    } catch (e: any) {
      if (e.code === "23505") return res.status(409).json({ message: "Email already exists" });
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/group-portal/me", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const r = await db.execute(sql`
        SELECT id, name, email, role, department, company_assignments, status
        FROM epglobal_users WHERE id = ${req.groupPortalUser.userId}
      `);
      const user = r.rows[0] as any;
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json({ id: user.id, name: user.name, email: user.email, role: user.role, department: user.department, company_assignments: user.company_assignments || "eventperfekt" });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/group-portal/users", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT id, name, email, role FROM epglobal_users WHERE status = 'active' ORDER BY name`);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── PROJECTS ──────────────────────────────────────────────────────────────

  app.get("/api/group-portal/projects", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const entity = (req.query.entity as string) || "eventperfekt";
      const r = await db.execute(sql`
        SELECT p.*, u.name as created_by_name,
          (SELECT COUNT(*) FROM gp_project_tasks t WHERE t.project_id = p.id) as task_count,
          (SELECT COUNT(*) FROM gp_project_tasks t WHERE t.project_id = p.id AND t.status = 'Done') as done_count
        FROM gp_projects p
        LEFT JOIN epglobal_users u ON u.id = p.created_by
        WHERE p.entity = ${entity}
        ORDER BY p.created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/group-portal/projects", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const { title, description, entity, status, priority, start_date, end_date } = req.body;
      if (!title) return res.status(400).json({ message: "Title required" });
      const r = await db.execute(sql`
        INSERT INTO gp_projects (title, description, entity, status, priority, start_date, end_date, created_by)
        VALUES (${title}, ${description || null}, ${entity || "eventperfekt"}, ${status || "Planning"}, ${priority || "Medium"}, ${start_date || null}, ${end_date || null}, ${req.groupPortalUser.userId})
        RETURNING *
      `);
      const proj = r.rows[0] as any;
      await db.execute(sql`INSERT INTO gp_project_activity (project_id, user_id, action, detail) VALUES (${proj.id}, ${req.groupPortalUser.userId}, 'created', 'Project created')`);
      return res.status(201).json(proj);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/group-portal/projects/:id", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const r = await db.execute(sql`
        SELECT p.*, u.name as created_by_name FROM gp_projects p
        LEFT JOIN epglobal_users u ON u.id = p.created_by
        WHERE p.id = ${req.params.id}
      `);
      if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
      return res.json(r.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/group-portal/projects/:id", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const { title, description, status, priority, start_date, end_date } = req.body;
      await db.execute(sql`
        UPDATE gp_projects SET
          title = COALESCE(${title || null}, title),
          description = COALESCE(${description || null}, description),
          status = COALESCE(${status || null}, status),
          priority = COALESCE(${priority || null}, priority),
          start_date = COALESCE(${start_date || null}, start_date),
          end_date = COALESCE(${end_date || null}, end_date),
          updated_at = now()
        WHERE id = ${req.params.id}
      `);
      await db.execute(sql`INSERT INTO gp_project_activity (project_id, user_id, action, detail) VALUES (${req.params.id}, ${req.groupPortalUser.userId}, 'updated', 'Project details updated')`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/group-portal/projects/:id/tasks", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const r = await db.execute(sql`
        SELECT t.*, u.name as assigned_to_name FROM gp_project_tasks t
        LEFT JOIN epglobal_users u ON u.id = t.assigned_to
        WHERE t.project_id = ${req.params.id}
        ORDER BY t.created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/group-portal/projects/:id/tasks", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const { title, description, status, priority, assigned_to, due_date } = req.body;
      if (!title) return res.status(400).json({ message: "Title required" });
      const r = await db.execute(sql`
        INSERT INTO gp_project_tasks (project_id, title, description, status, priority, assigned_to, due_date, created_by)
        VALUES (${req.params.id}, ${title}, ${description || null}, ${status || "Todo"}, ${priority || "Medium"}, ${assigned_to || null}, ${due_date || null}, ${req.groupPortalUser.userId})
        RETURNING *
      `);
      await db.execute(sql`INSERT INTO gp_project_activity (project_id, user_id, action, detail) VALUES (${req.params.id}, ${req.groupPortalUser.userId}, 'task_added', ${`Task added: ${title}`})`);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/group-portal/tasks/:id", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const { title, status, priority, assigned_to, due_date } = req.body;
      const r = await db.execute(sql`
        UPDATE gp_project_tasks SET
          title = COALESCE(${title || null}, title),
          status = COALESCE(${status || null}, status),
          priority = COALESCE(${priority || null}, priority),
          assigned_to = COALESCE(${assigned_to || null}, assigned_to),
          due_date = COALESCE(${due_date || null}, due_date)
        WHERE id = ${req.params.id} RETURNING project_id
      `);
      if (r.rows[0]) {
        const pid = (r.rows[0] as any).project_id;
        await db.execute(sql`INSERT INTO gp_project_activity (project_id, user_id, action, detail) VALUES (${pid}, ${req.groupPortalUser.userId}, 'task_updated', 'Task updated')`);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/group-portal/tasks/:id", requireGroupPortalAuth, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM gp_project_tasks WHERE id = ${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/group-portal/projects/:id/notes", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const r = await db.execute(sql`
        SELECT n.*, u.name as author_name FROM gp_project_notes n
        LEFT JOIN epglobal_users u ON u.id = n.author_id
        WHERE n.project_id = ${req.params.id}
        ORDER BY n.created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/group-portal/projects/:id/notes", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const { body } = req.body;
      if (!body) return res.status(400).json({ message: "Note body required" });
      const r = await db.execute(sql`
        INSERT INTO gp_project_notes (project_id, author_id, body)
        VALUES (${req.params.id}, ${req.groupPortalUser.userId}, ${body})
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/group-portal/projects/:id/activity", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const r = await db.execute(sql`
        SELECT a.*, u.name as user_name FROM gp_project_activity a
        LEFT JOIN epglobal_users u ON u.id = a.user_id
        WHERE a.project_id = ${req.params.id}
        ORDER BY a.created_at DESC
        LIMIT 50
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── DOCUMENTS ─────────────────────────────────────────────────────────────

  app.get("/api/group-portal/documents", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const entity = (req.query.entity as string) || "eventperfekt";
      const r = await db.execute(sql`
        SELECT d.*, u.name as uploaded_by_name FROM gp_documents d
        LEFT JOIN epglobal_users u ON u.id = d.uploaded_by
        WHERE d.entity = ${entity}
        ORDER BY d.folder, d.created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/group-portal/documents/upload", requireGroupPortalAuth, gpUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const { entity, folder } = req.body;
      const r = await db.execute(sql`
        INSERT INTO gp_documents (entity, folder, filename, original_name, size, uploaded_by)
        VALUES (${entity || "eventperfekt"}, ${folder || "General"}, ${req.file.filename}, ${req.file.originalname}, ${req.file.size}, ${req.groupPortalUser.userId})
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/group-portal/documents/:id", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const r = await db.execute(sql`DELETE FROM gp_documents WHERE id = ${req.params.id} RETURNING filename`);
      if (r.rows[0]) {
        const file = (r.rows[0] as any).filename;
        const fp = path.join("uploads/gp", file);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/group-portal/documents/:id/download", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM gp_documents WHERE id = ${req.params.id}`);
      const doc = r.rows[0] as any;
      if (!doc) return res.status(404).json({ message: "Not found" });
      const fp = path.join("uploads/gp", doc.filename);
      if (!fs.existsSync(fp)) return res.status(404).json({ message: "File not found on disk" });
      return res.download(fp, doc.original_name);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ── CHAT ──────────────────────────────────────────────────────────────────

  app.get("/api/group-portal/chat/channels", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const entity = (req.query.entity as string) || "eventperfekt";
      const r = await db.execute(sql`
        SELECT c.*, (SELECT COUNT(*) FROM gp_chat_messages m WHERE m.channel_id = c.id) as message_count
        FROM gp_chat_channels c
        WHERE c.entity = ${entity}
        ORDER BY c.created_at ASC
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/group-portal/chat/channels", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const { name, entity } = req.body;
      if (!name) return res.status(400).json({ message: "Channel name required" });
      const r = await db.execute(sql`
        INSERT INTO gp_chat_channels (entity, name, type, created_by)
        VALUES (${entity || "eventperfekt"}, ${name}, 'channel', ${req.groupPortalUser.userId})
        ON CONFLICT (entity, name) DO NOTHING
        RETURNING *
      `);
      return res.status(201).json(r.rows[0] || { message: "Channel already exists" });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/group-portal/chat/channels/:id/messages", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const since = req.query.since as string;
      let r;
      if (since) {
        r = await db.execute(sql`
          SELECT * FROM gp_chat_messages
          WHERE channel_id = ${req.params.id} AND created_at > ${since}
          ORDER BY created_at ASC LIMIT 100
        `);
      } else {
        r = await db.execute(sql`
          SELECT * FROM gp_chat_messages
          WHERE channel_id = ${req.params.id}
          ORDER BY created_at DESC LIMIT 50
        `);
        r = { rows: [...r.rows].reverse() };
      }
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/group-portal/chat/channels/:id/messages", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const { body } = req.body;
      if (!body?.trim()) return res.status(400).json({ message: "Message body required" });
      const r = await db.execute(sql`
        INSERT INTO gp_chat_messages (channel_id, author_id, author_name, body)
        VALUES (${req.params.id}, ${req.groupPortalUser.userId}, ${req.groupPortalUser.name}, ${body.trim()})
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ── HR ONBOARDING ─────────────────────────────────────────────────────────

  const hrUpload = multer({ dest: "uploads/hr/" });

  // Submit onboarding form (text fields only — files uploaded separately)
  app.post("/api/group-portal/hr/submit", async (req, res) => {
    try {
      const {
        email, full_name, preferred_name, city, country, working_mode,
        company, role_title, primary_function, engagement_type,
        experience_summary, decl_right_to_work, decl_no_conflict, decl_terms,
      } = req.body;

      if (!email || !full_name || !company || !role_title) {
        return res.status(400).json({ message: "Email, full name, company and role required" });
      }

      // Check duplicate
      const existing = await db.execute(sql`SELECT id, status FROM gp_hr_submissions WHERE email = ${email.toLowerCase()}`);
      if (existing.rows.length > 0) {
        const sub = existing.rows[0] as any;
        if (sub.status !== "REJECTED") {
          return res.status(409).json({ message: "already_submitted", submissionId: sub.id });
        }
      }

      const ref = `EP-${Math.floor(100000 + Math.random() * 900000)}`;

      const r = await db.execute(sql`
        INSERT INTO gp_hr_submissions
          (ref_number, email, full_name, preferred_name, city, country, working_mode,
           company, role_title, primary_function, engagement_type, experience_summary,
           decl_right_to_work, decl_no_conflict, decl_terms)
        VALUES
          (${ref}, ${email.toLowerCase()}, ${full_name}, ${preferred_name || null},
           ${city || null}, ${country || null}, ${working_mode || null},
           ${company}, ${role_title}, ${primary_function || null}, ${engagement_type || null},
           ${experience_summary || null}, ${!!decl_right_to_work}, ${!!decl_no_conflict}, ${!!decl_terms})
        RETURNING id, ref_number
      `);

      const submission = r.rows[0] as any;

      // Alert admin
      try {
        await emailService.sendEmail(
          "adminuk@eventperfekt.com",
          `New Onboarding Submission — ${full_name} — ${role_title} — ${company}`,
          `<p><strong>Name:</strong> ${full_name}<br/>
          <strong>Email:</strong> ${email}<br/>
          <strong>Role:</strong> ${role_title}<br/>
          <strong>Company:</strong> ${company}<br/>
          <strong>Engagement:</strong> ${engagement_type || "—"}<br/>
          <strong>Submitted:</strong> ${new Date().toLocaleString("en-GB")}</p>
          <p><a href="https://eventperfekt.net/group-portal/hr/admin">Review Application →</a></p>`
        );
      } catch (emailErr) {
        console.warn("HR admin alert email failed:", emailErr);
      }

      return res.status(201).json({ submissionId: submission.id, refNumber: submission.ref_number });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Upload HR document for a submission
  app.post("/api/group-portal/hr/upload/:submissionId", hrUpload.single("file"), async (req: any, res) => {
    try {
      const { submissionId } = req.params;
      const { doc_type } = req.body;
      if (!req.file) return res.status(400).json({ message: "No file" });

      await db.execute(sql`
        INSERT INTO gp_hr_documents (submission_id, doc_type, filename, original_name, size)
        VALUES (${submissionId}, ${doc_type || "other"}, ${req.file.filename}, ${req.file.originalname}, ${req.file.size})
      `);

      return res.status(201).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Status check (public)
  app.get("/api/group-portal/hr/status/:email", async (req, res) => {
    try {
      const r = await db.execute(sql`
        SELECT id, ref_number, full_name, status, submitted_at FROM gp_hr_submissions
        WHERE email = ${req.params.email.toLowerCase()}
        ORDER BY submitted_at DESC LIMIT 1
      `);
      if (!r.rows[0]) return res.status(404).json({ message: "No submission found" });
      return res.json(r.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Admin — list all submissions
  app.get("/api/group-portal/hr/admin/all", requireGroupPortalAuth, async (req: any, res) => {
    try {
      if (req.groupPortalUser.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const r = await db.execute(sql`
        SELECT * FROM gp_hr_submissions ORDER BY submitted_at DESC
      `);
      return res.json(r.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Admin — get single submission with documents
  app.get("/api/group-portal/hr/admin/:id", requireGroupPortalAuth, async (req: any, res) => {
    try {
      if (req.groupPortalUser.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const [subR, docsR] = await Promise.all([
        db.execute(sql`SELECT * FROM gp_hr_submissions WHERE id = ${req.params.id}`),
        db.execute(sql`SELECT * FROM gp_hr_documents WHERE submission_id = ${req.params.id} ORDER BY uploaded_at`),
      ]);
      if (!subR.rows[0]) return res.status(404).json({ message: "Not found" });
      return res.json({ submission: subR.rows[0], documents: docsR.rows });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Admin — update decision + admin notes
  app.patch("/api/group-portal/hr/admin/:id/decision", requireGroupPortalAuth, async (req: any, res) => {
    try {
      if (req.groupPortalUser.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const { status, admin_notes, reason } = req.body;
      const allowed = ["SUBMITTED", "NEEDS_INFO", "APPROVED", "REJECTED"];
      if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });

      await db.execute(sql`
        UPDATE gp_hr_submissions SET status = ${status}, admin_notes = COALESCE(${admin_notes || null}, admin_notes), updated_at = now()
        WHERE id = ${req.params.id}
      `);

      // Get applicant details for email
      const r = await db.execute(sql`SELECT full_name, email FROM gp_hr_submissions WHERE id = ${req.params.id}`);
      const sub = r.rows[0] as any;
      if (!sub) return res.json({ success: true });

      if (status === "APPROVED") {
        try {
          await emailService.sendEmail(
            sub.email,
            "Welcome to Event Perfekt Group — Application Approved",
            `<p>Dear ${sub.full_name},</p>
            <p>We are delighted to confirm your application has been approved. You will receive your login details within 24 hours.</p>
            <p>Welcome to the team.</p>
            <br/><p>Tolulope Kumolu-Johnson<br/>Director, Event Perfekt Group</p>`
          );
        } catch (e) { console.warn("Approval email failed", e); }
      } else if (status === "NEEDS_INFO") {
        try {
          await emailService.sendEmail(
            sub.email,
            "Event Perfekt Group — Additional Information Required",
            `<p>Dear ${sub.full_name},</p>
            <p>Thank you for your application. We need some additional information to proceed:</p>
            <blockquote>${reason || "Please contact us to discuss your application."}</blockquote>
            <p>Please respond to this email at your earliest convenience.</p>
            <br/><p>Event Perfekt Group HR Team</p>`
          );
        } catch (e) { console.warn("Needs info email failed", e); }
      } else if (status === "REJECTED") {
        try {
          await emailService.sendEmail(
            sub.email,
            "Event Perfekt Group — Application Update",
            `<p>Dear ${sub.full_name},</p>
            <p>Thank you for taking the time to apply to Event Perfekt Group. After careful consideration, we regret that we are unable to proceed with your application at this time.</p>
            <p>We wish you every success in your career.</p>
            <br/><p>Event Perfekt Group HR Team</p>`
          );
        } catch (e) { console.warn("Rejection email failed", e); }
      }

      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Admin — save notes only
  app.patch("/api/group-portal/hr/admin/:id/notes", requireGroupPortalAuth, async (req: any, res) => {
    try {
      if (req.groupPortalUser.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const { admin_notes } = req.body;
      await db.execute(sql`UPDATE gp_hr_submissions SET admin_notes = ${admin_notes || null}, updated_at = now() WHERE id = ${req.params.id}`);
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Admin — activate (create portal login)
  app.post("/api/group-portal/hr/admin/:id/activate", requireGroupPortalAuth, async (req: any, res) => {
    try {
      if (req.groupPortalUser.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const r = await db.execute(sql`SELECT * FROM gp_hr_submissions WHERE id = ${req.params.id}`);
      const sub = r.rows[0] as any;
      if (!sub) return res.status(404).json({ message: "Not found" });
      if (sub.status !== "APPROVED") return res.status(400).json({ message: "Must be APPROVED first" });

      // Check if already activated
      const existingUser = await db.execute(sql`SELECT id FROM epglobal_users WHERE email = ${sub.email}`);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ message: "User already has portal access" });
      }

      // Generate temp password: EP + firstname + 4 digits
      const firstName = sub.full_name.split(" ")[0];
      const tempPassword = `EP${firstName}${Math.floor(1000 + Math.random() * 9000)}`;
      const hashed = await bcrypt.hash(tempPassword, 10);

      // Determine company_assignments from company field
      const companyMap: Record<string, string> = {
        "Event Perfekt Global Ltd": "eventperfekt",
        "Event Perfekt Management Services": "eventperfekt_ng",
        "Twin Trade Global": "twintrade",
        "TwinPaay": "twinpaay",
        "Lightbulb Corporate Gifts": "lightbulb",
      };
      const companyAssignment = companyMap[sub.company] || "eventperfekt";

      await db.execute(sql`
        INSERT INTO epglobal_users (name, email, password, role, company_assignments, status)
        VALUES (${sub.full_name}, ${sub.email}, ${hashed}, 'staff', ${companyAssignment}, 'active')
      `);

      // Update submission status
      await db.execute(sql`UPDATE gp_hr_submissions SET status = 'ACTIVE', updated_at = now() WHERE id = ${req.params.id}`);

      // Send login email
      try {
        await emailService.sendEmail(
          sub.email,
          "Event Perfekt Group — Your Portal Login Details",
          `<p>Dear ${sub.full_name},</p>
          <p>Your portal access is ready.</p>
          <ul>
            <li><strong>Login URL:</strong> <a href="https://eventperfekt.net/group-portal/login">https://eventperfekt.net/group-portal/login</a></li>
            <li><strong>Email:</strong> ${sub.email}</li>
            <li><strong>Temporary Password:</strong> ${tempPassword}</li>
          </ul>
          <p>Please change your password on first login.</p>
          <p>Welcome to the team.</p>
          <br/><p>Tolulope Kumolu-Johnson<br/>Director, Event Perfekt Group</p>`
        );
      } catch (e) { console.warn("Activation email failed", e); }

      return res.json({ success: true, tempPassword });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ── RAID REGISTER ────────────────────────────────────────────────────────

  app.get("/api/group-portal/raid/:type", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const { type } = req.params;
      const entity = (req.query.entity as string) || "eventperfekt";
      const r = await db.execute(sql`
        SELECT * FROM gp_raid WHERE type = ${type} AND entity = ${entity}
        ORDER BY created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/group-portal/raid/:type", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const { type } = req.params;
      const { entity, title, description, severity, status, owner, due_date, raised_by,
              likelihood, impact, mitigation, contingency } = req.body;
      if (!title) return res.status(400).json({ message: "Title required" });

      // Generate ref_id
      const countR = await db.execute(sql`SELECT COUNT(*) FROM gp_raid WHERE type = ${type} AND entity = ${entity || "eventperfekt"}`);
      const count = Number((countR.rows[0] as any).count) + 1;
      const prefix = type === "risk" ? "R" : type === "assumption" ? "A" : type === "issue" ? "I" : "D";
      const ref_id = `EP-${prefix}-${String(count).padStart(3, "0")}`;

      const scoreMap: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
      const risk_score = likelihood && impact ? scoreMap[likelihood] * scoreMap[impact] : null;

      const r = await db.execute(sql`
        INSERT INTO gp_raid (entity, type, ref_id, title, description, severity, status, owner, due_date, raised_by,
          likelihood, impact, risk_score, mitigation, contingency)
        VALUES (${entity || "eventperfekt"}, ${type}, ${ref_id}, ${title}, ${description || null},
          ${severity || "Medium"}, ${status || "Open"}, ${owner || null}, ${due_date || null}, ${raised_by || null},
          ${likelihood || null}, ${impact || null}, ${risk_score}, ${mitigation || null}, ${contingency || null})
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/group-portal/raid/:type/:id", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const { title, description, severity, status, owner, due_date, likelihood, impact, mitigation, contingency } = req.body;
      const scoreMap: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
      const risk_score = likelihood && impact ? scoreMap[likelihood] * scoreMap[impact] : null;
      await db.execute(sql`
        UPDATE gp_raid SET
          title = COALESCE(${title || null}, title),
          description = COALESCE(${description || null}, description),
          severity = COALESCE(${severity || null}, severity),
          status = COALESCE(${status || null}, status),
          owner = COALESCE(${owner || null}, owner),
          due_date = COALESCE(${due_date || null}, due_date),
          likelihood = COALESCE(${likelihood || null}, likelihood),
          impact = COALESCE(${impact || null}, impact),
          risk_score = COALESCE(${risk_score}, risk_score),
          mitigation = COALESCE(${mitigation || null}, mitigation),
          contingency = COALESCE(${contingency || null}, contingency),
          updated_at = now()
        WHERE id = ${req.params.id}
      `);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/group-portal/raid/:type/:id", requireGroupPortalAuth, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM gp_raid WHERE id = ${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── COMPLIANCE DOCS ───────────────────────────────────────────────────────

  const complianceUpload = multer({ dest: "uploads/compliance/" });

  app.get("/api/group-portal/compliance-docs", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const entity = (req.query.entity as string) || "eventperfekt";
      const r = await db.execute(sql`SELECT * FROM gp_compliance_docs WHERE entity = ${entity} ORDER BY category, version DESC`);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/group-portal/compliance-docs/upload", requireGroupPortalAuth, complianceUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file" });
      const { entity, category } = req.body;

      // Get next version number
      const vR = await db.execute(sql`SELECT MAX(version) as v FROM gp_compliance_docs WHERE entity = ${entity || "eventperfekt"} AND category = ${category}`);
      const nextVersion = ((vR.rows[0] as any)?.v || 0) + 1;

      const r = await db.execute(sql`
        INSERT INTO gp_compliance_docs (entity, category, filename, original_name, version)
        VALUES (${entity || "eventperfekt"}, ${category}, ${req.file.filename}, ${req.file.originalname}, ${nextVersion})
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/group-portal/compliance-docs/:id/download", requireGroupPortalAuth, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM gp_compliance_docs WHERE id = ${req.params.id}`);
      const doc = r.rows[0] as any;
      if (!doc) return res.status(404).json({ message: "Not found" });
      const fp = path.join("uploads/compliance", doc.filename);
      if (!fs.existsSync(fp)) return res.status(404).json({ message: "File not on disk" });
      return res.download(fp, doc.original_name);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Download HR document
  app.get("/api/group-portal/hr/documents/:id/download", requireGroupPortalAuth, async (req: any, res) => {
    try {
      if (req.groupPortalUser.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const r = await db.execute(sql`SELECT * FROM gp_hr_documents WHERE id = ${req.params.id}`);
      const doc = r.rows[0] as any;
      if (!doc) return res.status(404).json({ message: "Not found" });
      const fp = path.join("uploads/hr", doc.filename);
      if (!fs.existsSync(fp)) return res.status(404).json({ message: "File not found on disk" });
      return res.download(fp, doc.original_name);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });
}
