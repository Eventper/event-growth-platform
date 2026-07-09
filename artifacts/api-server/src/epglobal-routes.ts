import { Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET || "epglobal-hub-secret-2024";

function authenticateEPGlobal(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorised" });
  try {
    const payload = jwt.verify(auth.split(" ")[1], JWT_SECRET) as any;
    req.epUser = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

function adminOnly(req: any, res: any, next: any) {
  if (req.epUser?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}

export function registerEPGlobalRoutes(app: Express) {

  // ── AUTH ─────────────────────────────────────────────────────────────────

  app.post("/api/epglobal/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      const r = await db.execute(sql`SELECT * FROM epglobal_users WHERE email = ${email.toLowerCase()} AND status = 'active'`);
      const user = r.rows[0] as any;
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });
      const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "8h" });
      return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department } });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/epglobal/auth/me", authenticateEPGlobal, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT id, name, email, role, department, status, created_at FROM epglobal_users WHERE id = ${req.epUser.userId}`);
      res.json(r.rows[0] || {});
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/epglobal/users", authenticateEPGlobal, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT id, name, email, role, department, status FROM epglobal_users ORDER BY name`);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/epglobal/users", authenticateEPGlobal, adminOnly, async (req: any, res) => {
    try {
      const { name, email, password, role, department } = req.body;
      const hash = await bcrypt.hash(password || "EPGlobal2024!", 12);
      const r = await db.execute(sql`
        INSERT INTO epglobal_users (name, email, password, role, department)
        VALUES (${name}, ${email.toLowerCase()}, ${hash}, ${role || 'operations'}, ${department || null})
        RETURNING id, name, email, role, department, status
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── DASHBOARD ─────────────────────────────────────────────────────────────

  app.get("/api/epglobal/dashboard", authenticateEPGlobal, async (req: any, res) => {
    try {
      const userId = req.epUser.userId;
      const role = req.epUser.role;
      const isAdmin = role === "admin";

      const taskFilter = isAdmin ? sql`` : sql`AND (owner_id = ${userId} OR assigned_to = ${userId})`;

      const [tasks, overdueCount, todayDue, invoices, alerts, calendar, compliance] = await Promise.all([
        db.execute(sql`
          SELECT t.*, 
                 ou.name as owner_name,
                 au.name as assignee_name
          FROM epglobal_tasks t
          LEFT JOIN epglobal_users ou ON ou.id = t.owner_id
          LEFT JOIN epglobal_users au ON au.id = t.assigned_to
          WHERE t.status != 'complete'
          ${taskFilter}
          ORDER BY t.due_date ASC NULLS LAST
          LIMIT 10
        `),
        db.execute(sql`
          SELECT COUNT(*) as count FROM epglobal_tasks
          WHERE status = 'overdue' OR (due_date < NOW() AND status NOT IN ('complete'))
          ${taskFilter}
        `),
        db.execute(sql`
          SELECT COUNT(*) as count FROM epglobal_tasks
          WHERE due_date::date = CURRENT_DATE AND status NOT IN ('complete')
          ${taskFilter}
        `),
        db.execute(sql`
          SELECT * FROM epglobal_invoices ORDER BY created_at DESC LIMIT 5
        `),
        db.execute(sql`
          SELECT * FROM epglobal_alerts WHERE user_id = ${userId} AND is_read = FALSE ORDER BY created_at DESC LIMIT 10
        `),
        db.execute(sql`
          SELECT * FROM epglobal_calendar
          WHERE start_date >= NOW() AND start_date <= NOW() + INTERVAL '14 days'
          ORDER BY start_date ASC LIMIT 8
        `),
        db.execute(sql`
          SELECT * FROM epglobal_compliance
          WHERE status != 'complete' AND deadline <= NOW() + INTERVAL '30 days'
          ORDER BY deadline ASC LIMIT 5
        `),
      ]);

      const totalOpen = (tasks.rows as any[]).length;
      const overdue = Number((overdueCount.rows[0] as any)?.count || 0);
      const dueToday = Number((todayDue.rows[0] as any)?.count || 0);

      const invRows = invoices.rows as any[];
      const totalInvoiced = invRows.reduce((s, i) => s + Number(i.amount || 0), 0);
      const totalOverdueInv = invRows.filter(i => i.status === "overdue").reduce((s, i) => s + Number(i.amount || 0), 0);

      res.json({
        stats: { totalOpen, overdue, dueToday, totalInvoiced, totalOverdueInv },
        recentTasks: tasks.rows,
        recentInvoices: invoices.rows,
        alerts: alerts.rows,
        upcomingCalendar: calendar.rows,
        upcomingCompliance: compliance.rows,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── TASKS ─────────────────────────────────────────────────────────────────

  app.get("/api/epglobal/tasks", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { status, category, priority, assignee } = req.query;
      let q = sql`
        SELECT t.*,
               ou.name as owner_name,
               au.name as assignee_name
        FROM epglobal_tasks t
        LEFT JOIN epglobal_users ou ON ou.id = t.owner_id
        LEFT JOIN epglobal_users au ON au.id = t.assigned_to
        WHERE 1=1
      `;
      if (status) q = sql`${q} AND t.status = ${status}`;
      if (category) q = sql`${q} AND t.category = ${category}`;
      if (priority) q = sql`${q} AND t.priority = ${priority}`;
      if (assignee) q = sql`${q} AND t.assigned_to = ${Number(assignee)}`;
      q = sql`${q} ORDER BY CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.due_date ASC NULLS LAST`;
      const r = await db.execute(q);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/epglobal/tasks", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { title, description, assigned_to, category, priority, status, due_date, quickbooks_link, project_co_link, document_link, notes, related_record_type, related_record_id } = req.body;
      const r = await db.execute(sql`
        INSERT INTO epglobal_tasks (title, description, owner_id, assigned_to, category, priority, status, due_date, quickbooks_link, project_co_link, document_link, notes, related_record_type, related_record_id)
        VALUES (${title}, ${description || null}, ${req.epUser.userId}, ${assigned_to || null}, ${category || 'admin'}, ${priority || 'medium'}, ${status || 'not_started'}, ${due_date || null}, ${quickbooks_link || null}, ${project_co_link || null}, ${document_link || null}, ${notes || null}, ${related_record_type || null}, ${related_record_id || null})
        RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/epglobal/tasks/:id", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { title, description, assigned_to, category, priority, status, due_date, quickbooks_link, project_co_link, document_link, notes } = req.body;
      const r = await db.execute(sql`
        UPDATE epglobal_tasks SET
          title = COALESCE(${title || null}, title),
          description = COALESCE(${description || null}, description),
          assigned_to = COALESCE(${assigned_to || null}, assigned_to),
          category = COALESCE(${category || null}, category),
          priority = COALESCE(${priority || null}, priority),
          status = COALESCE(${status || null}, status),
          due_date = COALESCE(${due_date || null}, due_date),
          quickbooks_link = COALESCE(${quickbooks_link || null}, quickbooks_link),
          project_co_link = COALESCE(${project_co_link || null}, project_co_link),
          document_link = COALESCE(${document_link || null}, document_link),
          notes = COALESCE(${notes || null}, notes),
          updated_at = NOW()
        WHERE id = ${req.params.id}
        RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/epglobal/tasks/:id", authenticateEPGlobal, adminOnly, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM epglobal_tasks WHERE id = ${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/epglobal/tasks/:id/notes", authenticateEPGlobal, async (req: any, res) => {
    try {
      const r = await db.execute(sql`
        SELECT n.*, u.name as author_name FROM epglobal_task_notes n
        LEFT JOIN epglobal_users u ON u.id = n.author_id
        WHERE n.task_id = ${req.params.id} ORDER BY n.created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/epglobal/tasks/:id/notes", authenticateEPGlobal, async (req: any, res) => {
    try {
      const r = await db.execute(sql`
        INSERT INTO epglobal_task_notes (task_id, author_id, content) VALUES (${req.params.id}, ${req.epUser.userId}, ${req.body.content})
        RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── CALENDAR ──────────────────────────────────────────────────────────────

  app.get("/api/epglobal/calendar", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { from, to } = req.query;
      const r = await db.execute(sql`
        SELECT c.*, u.name as owner_name FROM epglobal_calendar c
        LEFT JOIN epglobal_users u ON u.id = c.owner_id
        WHERE (${from || null}::timestamp IS NULL OR c.start_date >= ${from || null}::timestamp)
          AND (${to || null}::timestamp IS NULL OR c.start_date <= ${to || null}::timestamp)
        ORDER BY c.start_date ASC
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/epglobal/calendar", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { title, description, item_type, start_date, end_date, all_day, location } = req.body;
      const r = await db.execute(sql`
        INSERT INTO epglobal_calendar (title, description, item_type, start_date, end_date, all_day, owner_id, location)
        VALUES (${title}, ${description || null}, ${item_type || 'meeting'}, ${start_date}, ${end_date || null}, ${all_day || false}, ${req.epUser.userId}, ${location || null})
        RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/epglobal/calendar/seed-iam-her", authenticateEPGlobal, async (req: any, res) => {
    try {
      const title = "I Am Her — Friday 30 October 2026";
      const existing = await db.execute(sql`
        SELECT id FROM epglobal_calendar
        WHERE title = ${title}
        LIMIT 1
      `);
      if ((existing.rows as any[]).length > 0) {
        return res.json({ ok: true, created: false, id: (existing.rows[0] as any).id });
      }
      const r = await db.execute(sql`
        INSERT INTO epglobal_calendar (title, description, item_type, start_date, end_date, all_day, owner_id, location)
        VALUES (
          ${title},
          ${"I Am Her planning event for Friday 30 October 2026"},
          ${"meeting"},
          ${"2026-10-30T18:30:00.000Z"},
          ${"2026-10-30T23:00:00.000Z"},
          ${false},
          ${req.epUser.userId},
          ${"Milton Keynes"}
        )
        RETURNING *
      `);
      return res.json({ ok: true, created: true, event: r.rows[0] });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/epglobal/calendar/:id", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { title, description, item_type, start_date, end_date, all_day, location } = req.body;
      const r = await db.execute(sql`
        UPDATE epglobal_calendar SET
          title = COALESCE(${title || null}, title),
          description = COALESCE(${description || null}, description),
          item_type = COALESCE(${item_type || null}, item_type),
          start_date = COALESCE(${start_date || null}::timestamp, start_date),
          end_date = COALESCE(${end_date || null}::timestamp, end_date),
          location = COALESCE(${location || null}, location)
        WHERE id = ${req.params.id} RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/epglobal/calendar/:id", authenticateEPGlobal, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM epglobal_calendar WHERE id = ${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── INVOICES ──────────────────────────────────────────────────────────────

  app.get("/api/epglobal/invoices", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { status } = req.query;
      let q = sql`
        SELECT i.*, u.name as owner_name FROM epglobal_invoices i
        LEFT JOIN epglobal_users u ON u.id = i.owner_id WHERE 1=1
      `;
      if (status) q = sql`${q} AND i.status = ${status}`;
      q = sql`${q} ORDER BY i.created_at DESC`;
      const r = await db.execute(q);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/epglobal/invoices", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { invoice_number, client, project_programme, country, amount, currency, due_date, status, quickbooks_url, project_co_url, document_link, notes } = req.body;
      const r = await db.execute(sql`
        INSERT INTO epglobal_invoices (invoice_number, client, project_programme, country, amount, currency, due_date, status, owner_id, quickbooks_url, project_co_url, document_link, notes)
        VALUES (${invoice_number}, ${client}, ${project_programme || null}, ${country || 'UK'}, ${amount || 0}, ${currency || 'GBP'}, ${due_date || null}, ${status || 'pending'}, ${req.epUser.userId}, ${quickbooks_url || null}, ${project_co_url || null}, ${document_link || null}, ${notes || null})
        RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/epglobal/invoices/:id", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { client, project_programme, amount, currency, due_date, status, quickbooks_url, project_co_url, document_link, notes } = req.body;
      const r = await db.execute(sql`
        UPDATE epglobal_invoices SET
          client = COALESCE(${client || null}, client),
          project_programme = COALESCE(${project_programme || null}, project_programme),
          amount = COALESCE(${amount || null}, amount),
          currency = COALESCE(${currency || null}, currency),
          due_date = COALESCE(${due_date || null}::timestamp, due_date),
          status = COALESCE(${status || null}, status),
          quickbooks_url = COALESCE(${quickbooks_url || null}, quickbooks_url),
          project_co_url = COALESCE(${project_co_url || null}, project_co_url),
          document_link = COALESCE(${document_link || null}, document_link),
          notes = COALESCE(${notes || null}, notes),
          updated_at = NOW()
        WHERE id = ${req.params.id} RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/epglobal/invoices/:id", authenticateEPGlobal, adminOnly, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM epglobal_invoices WHERE id = ${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── PAYMENTS ──────────────────────────────────────────────────────────────

  app.get("/api/epglobal/payments", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { status } = req.query;
      let q = sql`
        SELECT p.*, u.name as owner_name FROM epglobal_payments p
        LEFT JOIN epglobal_users u ON u.id = p.owner_id WHERE 1=1
      `;
      if (status) q = sql`${q} AND p.status = ${status}`;
      q = sql`${q} ORDER BY p.created_at DESC`;
      const r = await db.execute(q);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/epglobal/payments", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { payment_reference, recipient, country, amount, currency, payment_method, status, proof_link, quickbooks_url, project_co_url, notes, payment_date } = req.body;
      const r = await db.execute(sql`
        INSERT INTO epglobal_payments (payment_reference, recipient, country, amount, currency, payment_method, status, proof_link, quickbooks_url, project_co_url, owner_id, notes, payment_date)
        VALUES (${payment_reference}, ${recipient}, ${country || 'UK'}, ${amount || 0}, ${currency || 'GBP'}, ${payment_method || null}, ${status || 'pending'}, ${proof_link || null}, ${quickbooks_url || null}, ${project_co_url || null}, ${req.epUser.userId}, ${notes || null}, ${payment_date || null})
        RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/epglobal/payments/:id", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { status, proof_link, quickbooks_url, notes, payment_date } = req.body;
      const r = await db.execute(sql`
        UPDATE epglobal_payments SET
          status = COALESCE(${status || null}, status),
          proof_link = COALESCE(${proof_link || null}, proof_link),
          quickbooks_url = COALESCE(${quickbooks_url || null}, quickbooks_url),
          notes = COALESCE(${notes || null}, notes),
          payment_date = COALESCE(${payment_date || null}::timestamp, payment_date),
          updated_at = NOW()
        WHERE id = ${req.params.id} RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── ACTIVITIES ────────────────────────────────────────────────────────────

  app.get("/api/epglobal/activities", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { status } = req.query;
      let q = sql`
        SELECT a.*, u.name as owner_name FROM epglobal_activities a
        LEFT JOIN epglobal_users u ON u.id = a.owner_id WHERE 1=1
      `;
      if (status) q = sql`${q} AND a.status = ${status}`;
      q = sql`${q} ORDER BY a.deadline ASC NULLS LAST`;
      const r = await db.execute(q);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/epglobal/activities", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { name, project_programme, country, deadline, owner_id, status, project_co_url, finance_status, notes } = req.body;
      const r = await db.execute(sql`
        INSERT INTO epglobal_activities (name, project_programme, country, deadline, owner_id, status, project_co_url, finance_status, notes)
        VALUES (${name}, ${project_programme || null}, ${country || 'UK'}, ${deadline || null}, ${owner_id || req.epUser.userId}, ${status || 'active'}, ${project_co_url || null}, ${finance_status || null}, ${notes || null})
        RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/epglobal/activities/:id", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { name, status, finance_status, project_co_url, notes } = req.body;
      const r = await db.execute(sql`
        UPDATE epglobal_activities SET
          name = COALESCE(${name || null}, name),
          status = COALESCE(${status || null}, status),
          finance_status = COALESCE(${finance_status || null}, finance_status),
          project_co_url = COALESCE(${project_co_url || null}, project_co_url),
          notes = COALESCE(${notes || null}, notes),
          updated_at = NOW()
        WHERE id = ${req.params.id} RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── VENDORS ───────────────────────────────────────────────────────────────

  app.get("/api/epglobal/vendors", authenticateEPGlobal, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM epglobal_vendors ORDER BY name`);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/epglobal/vendors", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { name, vendor_type, country, contact_name, contact_email, contact_phone, status, project_co_url, notes } = req.body;
      const r = await db.execute(sql`
        INSERT INTO epglobal_vendors (name, vendor_type, country, contact_name, contact_email, contact_phone, status, project_co_url, notes)
        VALUES (${name}, ${vendor_type || null}, ${country || 'UK'}, ${contact_name || null}, ${contact_email || null}, ${contact_phone || null}, ${status || 'active'}, ${project_co_url || null}, ${notes || null})
        RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/epglobal/vendors/:id", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { name, vendor_type, contact_name, contact_email, contact_phone, status, project_co_url, notes } = req.body;
      const r = await db.execute(sql`
        UPDATE epglobal_vendors SET
          name = COALESCE(${name || null}, name),
          vendor_type = COALESCE(${vendor_type || null}, vendor_type),
          contact_name = COALESCE(${contact_name || null}, contact_name),
          contact_email = COALESCE(${contact_email || null}, contact_email),
          contact_phone = COALESCE(${contact_phone || null}, contact_phone),
          status = COALESCE(${status || null}, status),
          project_co_url = COALESCE(${project_co_url || null}, project_co_url),
          notes = COALESCE(${notes || null}, notes),
          updated_at = NOW()
        WHERE id = ${req.params.id} RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── COMPLIANCE ────────────────────────────────────────────────────────────

  app.get("/api/epglobal/compliance", authenticateEPGlobal, async (req: any, res) => {
    try {
      const r = await db.execute(sql`
        SELECT c.*, u.name as owner_name FROM epglobal_compliance c
        LEFT JOIN epglobal_users u ON u.id = c.owner_id
        ORDER BY c.deadline ASC NULLS LAST
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/epglobal/compliance", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { item_name, category, deadline, owner_id, status, document_link, notes } = req.body;
      const r = await db.execute(sql`
        INSERT INTO epglobal_compliance (item_name, category, deadline, owner_id, status, document_link, notes)
        VALUES (${item_name}, ${category || null}, ${deadline || null}, ${owner_id || req.epUser.userId}, ${status || 'pending'}, ${document_link || null}, ${notes || null})
        RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/epglobal/compliance/:id", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { status, document_link, notes } = req.body;
      const r = await db.execute(sql`
        UPDATE epglobal_compliance SET
          status = COALESCE(${status || null}, status),
          document_link = COALESCE(${document_link || null}, document_link),
          notes = COALESCE(${notes || null}, notes),
          updated_at = NOW()
        WHERE id = ${req.params.id} RETURNING *
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── ALERTS ────────────────────────────────────────────────────────────────

  app.get("/api/epglobal/alerts", authenticateEPGlobal, async (req: any, res) => {
    try {
      const r = await db.execute(sql`
        SELECT * FROM epglobal_alerts WHERE user_id = ${req.epUser.userId} ORDER BY created_at DESC LIMIT 20
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/epglobal/alerts/:id/read", authenticateEPGlobal, async (req: any, res) => {
    try {
      await db.execute(sql`UPDATE epglobal_alerts SET is_read = TRUE WHERE id = ${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/epglobal/alerts/read-all", authenticateEPGlobal, async (req: any, res) => {
    try {
      await db.execute(sql`UPDATE epglobal_alerts SET is_read = TRUE WHERE user_id = ${req.epUser.userId}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── REPORTS ───────────────────────────────────────────────────────────────

  app.get("/api/epglobal/reports/tasks", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { status, category, from, to } = req.query;
      let q = sql`
        SELECT t.*, ou.name as owner_name, au.name as assignee_name
        FROM epglobal_tasks t
        LEFT JOIN epglobal_users ou ON ou.id = t.owner_id
        LEFT JOIN epglobal_users au ON au.id = t.assigned_to
        WHERE 1=1
      `;
      if (status) q = sql`${q} AND t.status = ${status}`;
      if (category) q = sql`${q} AND t.category = ${category}`;
      if (from) q = sql`${q} AND t.due_date >= ${from}::timestamp`;
      if (to) q = sql`${q} AND t.due_date <= ${to}::timestamp`;
      q = sql`${q} ORDER BY t.due_date ASC NULLS LAST`;
      const r = await db.execute(q);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/epglobal/reports/invoices", authenticateEPGlobal, async (req: any, res) => {
    try {
      const { status } = req.query;
      let q = sql`SELECT i.*, u.name as owner_name FROM epglobal_invoices i LEFT JOIN epglobal_users u ON u.id = i.owner_id WHERE 1=1`;
      if (status) q = sql`${q} AND i.status = ${status}`;
      q = sql`${q} ORDER BY i.due_date ASC`;
      const r = await db.execute(q);
      const rows = r.rows as any[];
      const summary = {
        total: rows.reduce((s, i) => s + Number(i.amount || 0), 0),
        paid: rows.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount || 0), 0),
        overdue: rows.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount || 0), 0),
        pending: rows.filter(i => i.status === 'pending' || i.status === 'sent').reduce((s, i) => s + Number(i.amount || 0), 0),
      };
      res.json({ invoices: rows, summary });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/epglobal/reports/summary", authenticateEPGlobal, async (req: any, res) => {
    try {
      const [tasks, invoices, payments, compliance, activities] = await Promise.all([
        db.execute(sql`SELECT status, COUNT(*) as count FROM epglobal_tasks GROUP BY status`),
        db.execute(sql`SELECT status, COUNT(*) as count, SUM(amount) as total FROM epglobal_invoices GROUP BY status`),
        db.execute(sql`SELECT status, COUNT(*) as count, SUM(amount) as total FROM epglobal_payments GROUP BY status`),
        db.execute(sql`SELECT status, COUNT(*) as count FROM epglobal_compliance GROUP BY status`),
        db.execute(sql`SELECT status, COUNT(*) as count FROM epglobal_activities GROUP BY status`),
      ]);
      res.json({
        tasks: tasks.rows,
        invoices: invoices.rows,
        payments: payments.rows,
        compliance: compliance.rows,
        activities: activities.rows,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
}
