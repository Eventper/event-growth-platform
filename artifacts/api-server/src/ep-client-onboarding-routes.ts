import { Express } from "express";
import { db, getConnectionString } from "./db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { addCrmRecordsForClient } from "./alli-onboarding-fixes";

const JWT_SECRET = process.env.SESSION_SECRET || "event-perfekt-secret-2024";

function authenticateToken(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorised" });
  try {
    const payload = jwt.verify(auth.split(" ")[1], JWT_SECRET) as any;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function registerEPClientOnboardingRoutes(app: Express) {

  // ─── EP CLIENTS CRUD ──────────────────────────────────────────────────────

  app.get("/api/ep-clients", authenticateToken, async (req: any, res) => {
    try {
      const { status, search } = req.query as any;
      let query = `
        SELECT c.*,
          (SELECT COUNT(*) FROM ep_client_contacts cc WHERE cc.client_id = c.id) AS contact_count,
          (SELECT json_agg(json_build_object(
            'id', cc.id, 'full_name', cc.full_name, 'email', cc.email,
            'job_title', cc.job_title, 'phone', cc.phone,
            'is_primary', cc.is_primary, 'is_signatory', cc.is_signatory
          )) FROM ep_client_contacts cc WHERE cc.client_id = c.id AND cc.is_primary = true) AS primary_contacts,
          (SELECT row_to_json(o) FROM ep_client_onboarding o WHERE o.client_id = c.id ORDER BY o.id DESC LIMIT 1) AS onboarding
        FROM ep_clients c
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIdx = 1;
      if (status) { query += ` AND c.status = $${paramIdx++}`; params.push(status); }
      if (search) {
        query += ` AND (c.organisation_name ILIKE $${paramIdx} OR c.city ILIKE $${paramIdx} OR c.engagement_type ILIKE $${paramIdx})`;
        params.push(`%${search}%`); paramIdx++;
      }
      query += ` ORDER BY c.created_at DESC`;
      const rows = await db.execute(sql.raw(query.replace(/\$(\d+)/g, (_, n) => `$${n}`)));
      // Use pg raw query
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      const result = await pool.query(query, params);
      await pool.end();
      return res.json(result.rows);
    } catch (e: any) {
      console.error("GET /api/ep-clients error:", e);
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/ep-clients/:id", authenticateToken, async (req: any, res) => {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      const [client, contacts, onboarding, notes] = await Promise.all([
        pool.query("SELECT * FROM ep_clients WHERE id = $1", [req.params.id]),
        pool.query("SELECT * FROM ep_client_contacts WHERE client_id = $1 ORDER BY is_primary DESC, id ASC", [req.params.id]),
        pool.query("SELECT * FROM ep_client_onboarding WHERE client_id = $1 ORDER BY id DESC LIMIT 1", [req.params.id]),
        pool.query("SELECT * FROM ep_client_notes WHERE client_id = $1 ORDER BY created_at DESC", [req.params.id]),
      ]);
      await pool.end();
      if (!client.rows[0]) return res.status(404).json({ message: "Client not found" });
      return res.json({
        ...client.rows[0],
        contacts: contacts.rows,
        onboarding: onboarding.rows[0] || null,
        notes: notes.rows,
      });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/ep-clients", authenticateToken, async (req: any, res) => {
    try {
      const {
        organisation_name, company_reg_number, vat_number,
        address_line1, address_line2, city, postcode, country,
        website, engagement_type, lead_source, assigned_to, status,
        logo_url,
      } = req.body;
      if (!organisation_name) return res.status(400).json({ message: "organisation_name is required" });
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      const result = await pool.query(`
        INSERT INTO ep_clients (organisation_name, company_reg_number, vat_number,
          address_line1, address_line2, city, postcode, country, website,
          engagement_type, lead_source, assigned_to, status, logo_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *
      `, [organisation_name, company_reg_number||null, vat_number||null,
          address_line1||null, address_line2||null, city||null, postcode||null,
          country||'United Kingdom', website||null, engagement_type||null,
          lead_source||null, assigned_to||null, status||'lead', logo_url||null]);
      await pool.end();
      const newClient = result.rows[0];
      addCrmRecordsForClient(newClient.id).catch((err: any) => console.error("[EPClients] CRM auto-create error:", err.message));
      return res.status(201).json(newClient);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/ep-clients/:id", authenticateToken, async (req: any, res) => {
    try {
      const fields = ['organisation_name','company_reg_number','companies_house_verified',
        'vat_number','address_line1','address_line2','city','postcode','country',
        'logo_url','website','engagement_type','lead_source','assigned_to','status'];
      const updates: string[] = [];
      const params: any[] = [];
      let idx = 1;
      for (const f of fields) {
        if (req.body[f] !== undefined) { updates.push(`${f} = $${idx++}`); params.push(req.body[f]); }
      }
      if (!updates.length) return res.status(400).json({ message: "Nothing to update" });
      updates.push(`updated_at = NOW()`);
      params.push(req.params.id);
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      const result = await pool.query(`UPDATE ep_clients SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
      await pool.end();
      if (!result.rows[0]) return res.status(404).json({ message: "Client not found" });
      return res.json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/ep-clients/:id", authenticateToken, async (req: any, res) => {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      await pool.query("DELETE FROM ep_clients WHERE id = $1", [req.params.id]);
      await pool.end();
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ─── CONTACTS ─────────────────────────────────────────────────────────────

  app.post("/api/ep-clients/:id/contacts", authenticateToken, async (req: any, res) => {
    try {
      const { full_name, job_title, email, phone, is_primary, is_signatory } = req.body;
      if (!full_name || !email) return res.status(400).json({ message: "full_name and email required" });
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      if (is_primary) await pool.query("UPDATE ep_client_contacts SET is_primary=false WHERE client_id=$1", [req.params.id]);
      const result = await pool.query(`
        INSERT INTO ep_client_contacts (client_id, full_name, job_title, email, phone, is_primary, is_signatory)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
      `, [req.params.id, full_name, job_title||null, email, phone||null, is_primary||false, is_signatory||false]);
      await pool.end();
      return res.status(201).json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/ep-client-contacts/:contactId", authenticateToken, async (req: any, res) => {
    try {
      const fields = ['full_name','job_title','email','phone','is_primary','is_signatory'];
      const updates: string[] = [];
      const params: any[] = [];
      let idx = 1;
      for (const f of fields) {
        if (req.body[f] !== undefined) { updates.push(`${f} = $${idx++}`); params.push(req.body[f]); }
      }
      if (!updates.length) return res.status(400).json({ message: "Nothing to update" });
      params.push(req.params.contactId);
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      const result = await pool.query(`UPDATE ep_client_contacts SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
      await pool.end();
      return res.json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/ep-client-contacts/:contactId", authenticateToken, async (req: any, res) => {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      await pool.query("DELETE FROM ep_client_contacts WHERE id = $1", [req.params.contactId]);
      await pool.end();
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ─── NOTES ────────────────────────────────────────────────────────────────

  app.post("/api/ep-clients/:id/notes", authenticateToken, async (req: any, res) => {
    try {
      const { note, note_type } = req.body;
      if (!note) return res.status(400).json({ message: "note is required" });
      const createdBy = req.user?.name || req.user?.email || "EP Team";
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      const result = await pool.query(`
        INSERT INTO ep_client_notes (client_id, note, note_type, created_by)
        VALUES ($1,$2,$3,$4) RETURNING *
      `, [req.params.id, note, note_type||'note', createdBy]);
      await pool.end();
      return res.status(201).json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/ep-client-notes/:noteId", authenticateToken, async (req: any, res) => {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      await pool.query("DELETE FROM ep_client_notes WHERE id = $1", [req.params.noteId]);
      await pool.end();
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ─── ONBOARDING INVITE ────────────────────────────────────────────────────

  app.post("/api/ep-clients/:id/invite-onboarding", authenticateToken, async (req: any, res) => {
    try {
      const clientId = req.params.id;
      const token = crypto.randomBytes(32).toString("hex");
      const invitedBy = req.user?.name || req.user?.email || "EP Team";
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      // Upsert onboarding record
      await pool.query(`
        INSERT INTO ep_client_onboarding (client_id, onboarding_token, status, invited_by, invited_at)
        VALUES ($1, $2, 'invited', $3, NOW())
        ON CONFLICT (onboarding_token) DO NOTHING
      `, [clientId, token, invitedBy]);
      // Update client status to 'onboarding' if it's still 'lead'
      await pool.query("UPDATE ep_clients SET status = 'onboarding', updated_at = NOW() WHERE id = $1 AND status = 'lead'", [clientId]);
      await pool.end();
      const prodDomain = process.env.PRODUCTION_DOMAIN || "eventperfekt.net";
      const onboardingUrl = `https://${prodDomain}/onboarding/${token}`;
      return res.json({ token, onboarding_url: onboardingUrl });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ─── PUBLIC ONBOARDING WIZARD ─────────────────────────────────────────────

  app.get("/api/onboarding/:token", async (req, res) => {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      const result = await pool.query(`
        SELECT o.*, c.organisation_name, c.address_line1, c.address_line2,
               c.city, c.postcode, c.country, c.website, c.vat_number,
               c.company_reg_number, c.logo_url,
               (SELECT json_agg(json_build_object(
                 'id', cc.id, 'full_name', cc.full_name, 'email', cc.email,
                 'job_title', cc.job_title, 'phone', cc.phone,
                 'is_primary', cc.is_primary
               )) FROM ep_client_contacts cc WHERE cc.client_id = c.id) AS contacts
        FROM ep_client_onboarding o
        JOIN ep_clients c ON c.id = o.client_id
        WHERE o.onboarding_token = $1
      `, [req.params.token]);
      await pool.end();
      if (!result.rows[0]) return res.status(404).json({ message: "Invalid or expired onboarding link" });
      if (result.rows[0].status === 'completed') return res.json({ ...result.rows[0], already_completed: true });
      return res.json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/onboarding/:token/step", async (req, res) => {
    try {
      const { step, data } = req.body;
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });

      // Find the onboarding record
      const existing = await pool.query("SELECT * FROM ep_client_onboarding WHERE onboarding_token = $1", [req.params.token]);
      if (!existing.rows[0]) { await pool.end(); return res.status(404).json({ message: "Token not found" }); }
      const ob = existing.rows[0];

      let updateFields: string[] = ["step_completed = GREATEST(step_completed, $1)", "status = 'in_progress'"];
      const params: any[] = [step];
      let idx = 2;

      if (step === 1 && data) {
        // Update company details
        await pool.query(`
          UPDATE ep_clients SET
            organisation_name = COALESCE($1, organisation_name),
            address_line1 = COALESCE($2, address_line1),
            address_line2 = COALESCE($3, address_line2),
            city = COALESCE($4, city),
            postcode = COALESCE($5, postcode),
            country = COALESCE($6, country),
            website = COALESCE($7, website),
            vat_number = COALESCE($8, vat_number),
            company_reg_number = COALESCE($9, company_reg_number),
            updated_at = NOW()
          WHERE id = $10
        `, [data.organisation_name||null, data.address_line1||null, data.address_line2||null,
            data.city||null, data.postcode||null, data.country||null, data.website||null,
            data.vat_number||null, data.company_reg_number||null, ob.client_id]);
        updateFields.push(`company_details_confirmed = true`);
      }

      if (step === 2 && data?.services_selected) {
        updateFields.push(`services_selected = $${idx}::jsonb`);
        params.push(JSON.stringify(data.services_selected)); idx++;
      }

      if (step === 3 && data?.event_requirements) {
        updateFields.push(`event_requirements = $${idx}::jsonb`);
        params.push(JSON.stringify(data.event_requirements)); idx++;
      }

      params.push(req.params.token);
      await pool.query(`UPDATE ep_client_onboarding SET ${updateFields.join(', ')} WHERE onboarding_token = $${idx}`, params);
      await pool.end();
      return res.json({ success: true, step });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/onboarding/:token/complete", async (req, res) => {
    try {
      const { agreement_signed, primary_contact } = req.body;
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });

      const existing = await pool.query("SELECT * FROM ep_client_onboarding WHERE onboarding_token = $1", [req.params.token]);
      if (!existing.rows[0]) { await pool.end(); return res.status(404).json({ message: "Token not found" }); }
      const ob = existing.rows[0];

      await pool.query(`
        UPDATE ep_client_onboarding SET
          status = 'completed', step_completed = 4,
          agreement_signed = $1,
          agreement_signed_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END,
          completed_at = NOW()
        WHERE onboarding_token = $2
      `, [agreement_signed || false, req.params.token]);

      // Update client status to 'active' on completion
      await pool.query("UPDATE ep_clients SET status = 'active', updated_at = NOW() WHERE id = $1", [ob.client_id]);

      // If primary contact provided, upsert it
      if (primary_contact?.full_name && primary_contact?.email) {
        await pool.query(`
          INSERT INTO ep_client_contacts (client_id, full_name, job_title, email, phone, is_primary, is_signatory)
          VALUES ($1,$2,$3,$4,$5,true,true)
          ON CONFLICT DO NOTHING
        `, [ob.client_id, primary_contact.full_name, primary_contact.job_title||null,
            primary_contact.email, primary_contact.phone||null]);
      }

      // Add a note
      await pool.query(`
        INSERT INTO ep_client_notes (client_id, note, note_type, created_by)
        VALUES ($1, 'Client completed onboarding', 'system', 'System')
      `, [ob.client_id]);

      await pool.end();
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ─── STATS ────────────────────────────────────────────────────────────────

  app.get("/api/ep-clients-stats", authenticateToken, async (req: any, res) => {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      const result = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status='lead') AS leads,
          COUNT(*) FILTER (WHERE status='proposal_sent') AS proposals,
          COUNT(*) FILTER (WHERE status='contracted') AS contracted,
          COUNT(*) FILTER (WHERE status='onboarding') AS onboarding,
          COUNT(*) FILTER (WHERE status='active') AS active,
          COUNT(*) FILTER (WHERE status='completed') AS completed,
          COUNT(*) AS total
        FROM ep_clients
      `);
      await pool.end();
      return res.json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });
}
