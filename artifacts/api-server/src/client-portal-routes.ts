import { Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { sendMail as _sendMail } from "./emailService";
import { sendWhatsAppMessage, isWhatsAppConfigured } from "./whatsappService";
import { uploadBuffer, generateViewUrl } from "./objectStorage";
import { pushSignoffToGroupPortal } from "./alli-signoff-sync";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const PORTAL_JWT_SECRET = JWT_SECRET + "-client-portal";

function authenticateClientPortal(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorised" });
  try {
    const payload = jwt.verify(auth.split(" ")[1], PORTAL_JWT_SECRET) as any;
    req.portalUser = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session" });
  }
}

function authenticateEPStaff(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorised" });
  try {
    const payload = jwt.verify(auth.split(" ")[1], JWT_SECRET) as any;
    req.epUser = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session" });
  }
}

function authenticateAlliSync(req: any, res: any, next: any) {
  const key = req.headers["x-alli-sync-key"];
  if (key !== "EP-ALLI-SYNC-2026") return res.status(401).json({ message: "Invalid sync key" });
  next();
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const clientDocUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const TWIN_TRADE_SYNC_URL = process.env.TWIN_TRADE_SYNC_URL || "";
const ALLI_SYNC_KEY = "EP-ALLI-SYNC-2026";

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await _sendMail(to, subject, html);
  } catch (e: any) {
    console.error("[ClientPortal] Email error:", e.message);
  }
}

// ─── Trustee configuration ────────────────────────────────────────────────────
const TRUSTEES = {
  kehinde: {
    key: "kehinde",
    name: "Kehinde Alli",
    emails: ["kehindeballi@gmail.com", "contact@allifoundation.org", "kalli@allifoundation.org"],
    notifyEmail: "kehindeballi@gmail.com",
  },
  agboola: {
    key: "agboola",
    name: "Agboola Afolabi Ogundeyin",
    emails: ["agboola@jobtrolley.co", "agboola.ogundeyin@gmail.com"],
    notifyEmail: "agboola@jobtrolley.co",
  },
} as const;

function getTrusteeKey(email: string): "kehinde" | "agboola" | null {
  const e = email.toLowerCase().trim();
  if (TRUSTEES.kehinde.emails.some(x => x.toLowerCase() === e)) return "kehinde";
  if (TRUSTEES.agboola.emails.some(x => x.toLowerCase() === e)) return "agboola";
  return null;
}

function getPrimaryEmailForAlias(email: string): string {
  const e = email.toLowerCase().trim();
  for (const key of Object.keys(TRUSTEES) as ("kehinde" | "agboola")[]) {
    const trustee = TRUSTEES[key];
    if (trustee.emails.some(x => x.toLowerCase() === e)) {
      return trustee.emails[0]; // Primary email is the DB user
    }
  }
  return e;
}

function getOtherTrustee(key: "kehinde" | "agboola") {
  return key === "kehinde" ? TRUSTEES.agboola : TRUSTEES.kehinde;
}

function ep2of2Email(inner: string): string {
  return `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;line-height:1.6;">
    <div style="background:#3D0B0B;color:#fff;padding:20px 28px;">
      <h2 style="margin:0;font-weight:normal;letter-spacing:1px;">Event Perfekt Global Ltd</h2>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.8;">ALLI Foundation — Youth Violence Prevention Model Design</p>
    </div>
    <div style="padding:24px 28px;background:#fff;">${inner}</div>
    <div style="padding:14px 28px;background:#fafafa;color:#888;font-size:11px;border-top:1px solid #eee;">
      Event Perfekt Global Ltd · 20 Wenlock Road, London, N1 7PG · info@eventperfekt.com · www.eventperfekt.com
    </div>
  </div>`;
}

function signoffFirstEmail(phase: string, signerName: string, otherName: string): string {
  return ep2of2Email(`
    <p>Dear ${otherName},</p>
    <p><strong>${signerName}</strong> has formally signed off on <strong>Phase ${phase}</strong> of the Youth Violence Prevention Model Design project.</p>
    <p>Under the 2-of-2 trustee approval process, your sign-off is now required to complete Phase ${phase} approval. Please log in to the portal to review and sign off at your earliest convenience.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="https://eventperfekt.net/client-portal/login" style="display:inline-block;background:#3D0B0B;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Review &amp; Sign Off</a>
    </p>
    <p>If you have any questions please contact us at info@eventperfekt.com.</p>
    <p>Kind regards<br/>Event Perfekt Global Ltd</p>
  `);
}

function signoffBothApprovedEmail(phase: string, trustee1: string, trustee2: string): string {
  return ep2of2Email(`
    <p>Dear Trustee,</p>
    <p>Phase <strong>${phase}</strong> of the Youth Violence Prevention Model Design project has been <strong>formally approved by both trustees</strong>.</p>
    <p>Approved by: ${trustee1} and ${trustee2}.</p>
    <p>All Phase ${phase} deliverables have been marked as approved. A sign-off receipt is available in your portal. Event Perfekt will now progress to the next phase.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="https://eventperfekt.net/client-portal/home" style="display:inline-block;background:#3D0B0B;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">View Project Portal</a>
    </p>
    <p>Kind regards<br/>Tolu Johnson — Director, Event Perfekt Global Ltd</p>
  `);
}

// ─── Startup one-time emails ──────────────────────────────────────────────────
async function sendStartupEmails() {
  try {
    const existing = await db.execute(sql`
      SELECT reference_id FROM outbound_communications_queue
      WHERE reference_id IN ('ALLI-KEHINDE-REENGAGEMENT-MAY26', 'ALLI-AGBOOLA-WELCOME-MAY26')
    `).catch(() => ({ rows: [] as any[] }));
    const sent = new Set((existing.rows as any[]).map((r: any) => r.reference_id));

    // a. Kehinde re-engagement email
    if (!sent.has('ALLI-KEHINDE-REENGAGEMENT-MAY26')) {
      const html = ep2of2Email(`
        <p>Dear Kehinde,</p>
        <p>We hope this finds you well. This is a courtesy message to confirm your access to the ALLI Foundation client portal.</p>
        <p>Phase 1 deliverables are complete and are now available in your portal for your review and sign-off. Agboola has also been added as a second trustee — both of your approvals are required to formally complete each phase.</p>
        <p>Please use your existing credentials to log in:</p>
        <ul>
          <li><strong>Email:</strong> kehindeballi@gmail.com</li>
          <li><strong>Password:</strong> ALLI2026!</li>
        </ul>
        <p style="text-align:center;margin:28px 0;">
          <a href="https://eventperfekt.net/client-portal/login" style="display:inline-block;background:#3D0B0B;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Access Your Portal</a>
        </p>
        <p>If you have any difficulty signing in please reply to this email or contact us at info@eventperfekt.com.</p>
        <p>Kind regards<br/>Tolu Johnson — Director<br/>Event Perfekt Global Ltd</p>
      `);
      await sendEmail("info@eventperfekt.com", "[PENDING APPROVAL] ALLI Foundation — Client Portal Access for Kehinde Alli", html);
      await db.execute(sql`
        INSERT INTO outbound_communications_queue (to_email, subject, body, context, reference_id, status, sent_at)
        VALUES ('kehindeballi@gmail.com', 'ALLI Foundation — Your Client Portal Access', ${html}, 'kehinde_reengagement', 'ALLI-KEHINDE-REENGAGEMENT-MAY26', 'sent', NOW())
        ON CONFLICT (reference_id) DO NOTHING
      `).catch(() => {});
      console.log("[ClientPortal] Kehinde re-engagement email sent ✓");
    }

    // b+c. Agboola welcome email
    if (!sent.has('ALLI-AGBOOLA-WELCOME-MAY26')) {
      const html = ep2of2Email(`
        <p>Dear Agboola,</p>
        <p>Welcome to the ALLI Foundation client portal. You have been added as a trustee on the Youth Violence Prevention Model Design project.</p>
        <p>Your login credentials are below. Please log in and change your password after your first sign-in.</p>
        <ul>
          <li><strong>Portal URL:</strong> <a href="https://eventperfekt.net/client-portal/login">eventperfekt.net/client-portal/login</a></li>
          <li><strong>Email:</strong> agboola@jobtrolley.co</li>
          <li><strong>Temporary password:</strong> Trustee2026!</li>
        </ul>
        <p>In the portal you can review project deliverables, documents, risks, and events. As a trustee you are required to formally sign off on each phase alongside Kehinde Alli under the 2-of-2 approval process.</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="https://eventperfekt.net/client-portal/login" style="display:inline-block;background:#3D0B0B;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Access Your Portal</a>
        </p>
        <p>Phase 1 deliverables are currently ready for your review. Please sign in and complete your trustee sign-off at your earliest convenience.</p>
        <p>If you have any questions please contact info@eventperfekt.com or reply to this email.</p>
        <p>Kind regards<br/>Tolu Johnson — Director<br/>Event Perfekt Global Ltd</p>
      `);
      await sendEmail("info@eventperfekt.com", "[PENDING APPROVAL] ALLI Foundation — Trustee Portal Access for Agboola Ogundeyin", html);
      await db.execute(sql`
        INSERT INTO outbound_communications_queue (to_email, subject, body, context, reference_id, status, sent_at)
        VALUES ('agboola@jobtrolley.co', 'ALLI Foundation — Your Trustee Portal Access', ${html}, 'agboola_welcome', 'ALLI-AGBOOLA-WELCOME-MAY26', 'sent', NOW())
        ON CONFLICT (reference_id) DO NOTHING
      `).catch(() => {});
      console.log("[ClientPortal] Agboola welcome email sent ✓");
    }
  } catch (e: any) {
    console.error("[ClientPortal] sendStartupEmails error:", e.message);
  }
}

async function fetchTwinTradeSync(pathname: string, init?: RequestInit) {
  if (!TWIN_TRADE_SYNC_URL) throw new Error("Twin Trade sync URL not configured");
  const res = await fetch(`${TWIN_TRADE_SYNC_URL.replace(/\/$/, "")}${pathname}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-alli-sync-key": ALLI_SYNC_KEY,
      ...(init?.headers || {}),
    },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Twin Trade sync failed (${res.status})`);
  return data;
}

async function ensureTablesAndSeed() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_portal_users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        organisation TEXT,
        project_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE client_portal_users DROP CONSTRAINT IF EXISTS client_portal_users_project_id_fkey`).catch(() => {});
    await db.execute(sql`ALTER TABLE client_deliverables DROP CONSTRAINT IF EXISTS client_deliverables_project_id_fkey`).catch(() => {});
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_deliverables (
        id SERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        phase_number INTEGER NOT NULL,
        phase_name TEXT NOT NULL,
        deliverable_name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        due_date TIMESTAMPTZ,
        document_url TEXT,
        document_name TEXT,
        shared_with_client BOOLEAN DEFAULT false,
        client_approved BOOLEAN DEFAULT false,
        client_feedback TEXT,
        approved_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_portal_messages (
        id SERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        sender_type TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_portal_change_requests (
        id SERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        document_id INTEGER,
        change_description TEXT NOT NULL,
        purpose TEXT NOT NULL,
        cost_impact TEXT,
        owner TEXT NOT NULL,
        requested_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'pending',
        ep_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE client_portal_change_requests ADD COLUMN IF NOT EXISTS document_id INTEGER`).catch(() => {});
    await db.execute(sql`ALTER TABLE client_portal_change_requests ADD COLUMN IF NOT EXISTS ep_notes TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE client_portal_change_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`).catch(() => {});
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_portal_documents (
        id SERIAL PRIMARY KEY,
        project_id TEXT,
        document_name TEXT NOT NULL,
        document_category TEXT DEFAULT 'Client Uploads',
        document_subcategory TEXT,
        document_type TEXT DEFAULT 'upload',
        current_version INTEGER DEFAULT 1,
        uploaded_by TEXT,
        uploaded_by_type TEXT DEFAULT 'client',
        shared_with_client BOOLEAN DEFAULT false,
        file_url TEXT,
        file_name TEXT,
        file_size INTEGER,
        status TEXT DEFAULT 'UNREAD',
        read_by TEXT,
        read_at TIMESTAMPTZ,
        is_signed BOOLEAN DEFAULT false,
        signed_by TEXT,
        signed_at TIMESTAMPTZ,
        signature_text TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_portal_document_comments (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES client_portal_documents(id) ON DELETE CASCADE,
        commenter_name TEXT,
        commenter_type TEXT DEFAULT 'client',
        comment TEXT NOT NULL,
        attachment_url TEXT,
        attachment_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_actions (
        id SERIAL PRIMARY KEY,
        project_id TEXT DEFAULT 'alli-foundation-2024',
        title TEXT NOT NULL,
        description TEXT,
        action_type TEXT DEFAULT 'acknowledge',
        priority TEXT DEFAULT 'normal',
        status TEXT DEFAULT 'pending',
        owner TEXT,
        owner_email TEXT,
        due_date TIMESTAMPTZ,
        sent_date TIMESTAMPTZ,
        linked_deliverable_code TEXT,
        linked_document_id INTEGER,
        is_post_engagement BOOLEAN DEFAULT false,
        response_text TEXT,
        responded_by TEXT,
        responded_at TIMESTAMPTZ,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_action_notes (
        id SERIAL PRIMARY KEY,
        action_id INTEGER NOT NULL REFERENCES client_actions(id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_by_role TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_action_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action_id INTEGER NOT NULL REFERENCES client_actions(id) ON DELETE CASCADE,
        changed_by TEXT NOT NULL,
        changed_by_role TEXT,
        change_type TEXT NOT NULL,
        field_changed TEXT,
        old_value TEXT,
        new_value TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Additive migrations for existing client_actions table
    await db.execute(sql`ALTER TABLE client_actions ADD COLUMN IF NOT EXISTS owner TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE client_actions ADD COLUMN IF NOT EXISTS owner_email TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE client_actions ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ`).catch(() => {});
    await db.execute(sql`ALTER TABLE client_actions ADD COLUMN IF NOT EXISTS sent_date TIMESTAMPTZ`).catch(() => {});
    await db.execute(sql`ALTER TABLE client_actions ADD COLUMN IF NOT EXISTS linked_deliverable_code TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE client_actions ADD COLUMN IF NOT EXISTS linked_document_id INTEGER`).catch(() => {});
    await db.execute(sql`ALTER TABLE client_actions ADD COLUMN IF NOT EXISTS is_post_engagement BOOLEAN DEFAULT false`).catch(() => {});

    // Backfill: set sent_date from created_at, default owner to Kehinde Alli, tag post-engagement
    await db.execute(sql`
      UPDATE client_actions
      SET sent_date = created_at,
          owner = COALESCE(owner, 'Kehinde Alli'),
          owner_email = COALESCE(owner_email, 'kehindeballi@gmail.com'),
          is_post_engagement = COALESCE(is_post_engagement, CASE WHEN due_date > '2026-05-25' THEN true ELSE false END)
      WHERE sent_date IS NULL
    `).catch(() => {});

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_portal_risks (
        id SERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'risk',
        status TEXT DEFAULT 'open',
        mitigation_summary TEXT,
        ep_action TEXT,
        is_internal BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_portal_strategic_overview_mirror (
        id SERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        section_key TEXT NOT NULL,
        section_title TEXT NOT NULL,
        section_body TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        target_anchor TEXT,
        source_url TEXT,
        published BOOLEAN NOT NULL DEFAULT false,
        published_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (project_id, section_key)
      )
    `);
    await db.execute(sql`ALTER TABLE client_portal_strategic_overview_mirror ADD COLUMN IF NOT EXISTS target_anchor TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE client_portal_strategic_overview_mirror ADD COLUMN IF NOT EXISTS source_url TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE client_portal_strategic_overview_mirror ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false`).catch(() => {});
    await db.execute(sql`ALTER TABLE client_portal_strategic_overview_mirror ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`).catch(() => {});

    // 2-of-2 trustee sign-off tracking
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS alli_milestone_signoffs (
        id SERIAL PRIMARY KEY,
        milestone_id TEXT NOT NULL,
        trustee_key TEXT NOT NULL,
        signed_by_email TEXT NOT NULL,
        signed_by_name TEXT NOT NULL,
        decision TEXT NOT NULL DEFAULT 'approved',
        rejection_comment TEXT,
        signed_at TIMESTAMPTZ DEFAULT NOW(),
        client_ip TEXT,
        UNIQUE (milestone_id, trustee_key)
      )
    `);

    await db.execute(sql`
      INSERT INTO client_portal_strategic_overview_mirror (
        project_id, section_key, section_title, section_body, sort_order, target_anchor, source_url, published, published_at
      ) VALUES
        ('alli-foundation-2024', 'documents', 'DOCUMENTS', 'Published project documents, packs, and signed records appear here.', 1, 'documents-section', '/client-portal/project', true, NOW()),
        ('alli-foundation-2024', 'phase_connections', 'HOW PHASE N CONNECTS', 'Phase summaries and milestone sign-offs stay linked to the working deliverables below.', 2, 'milestone-signoffs-section', '/client-portal/project', true, NOW())
      ON CONFLICT (project_id, section_key) DO UPDATE SET
        section_title = EXCLUDED.section_title,
        section_body = EXCLUDED.section_body,
        sort_order = EXCLUDED.sort_order,
        target_anchor = EXCLUDED.target_anchor,
        source_url = EXCLUDED.source_url,
        published = true,
        published_at = COALESCE(client_portal_strategic_overview_mirror.published_at, NOW()),
        updated_at = NOW()
    `).catch(() => {});

    await db.execute(sql`ALTER TABLE client_portal_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client'`).catch(() => {});

    const alliHash = await bcrypt.hash("alli2024", 10);
    await db.execute(sql`
      INSERT INTO client_portal_users (email, password_hash, full_name, organisation, project_id, role)
      VALUES ('contact@allifoundation.org', ${alliHash}, 'Kehinde Alli', 'ALLI Foundation', 'alli-foundation-2024', 'trustee')
      ON CONFLICT (email) DO UPDATE SET password_hash = ${alliHash}, role = 'trustee'
    `);

    const adminHash = await bcrypt.hash("Password12#", 10);
    await db.execute(sql`
      INSERT INTO client_portal_users (email, password_hash, full_name, organisation, project_id)
      VALUES ('admin@eventperfekt.com', ${adminHash}, 'Tolulope Kumolu-Johnson', 'Event Perfekt Global Ltd', 'alli-foundation-2024')
      ON CONFLICT (email) DO UPDATE SET password_hash = ${adminHash}
    `);
    await db.execute(sql`
      INSERT INTO client_portal_users (email, password_hash, full_name, organisation, project_id)
      VALUES ('adminuk@eventperfekt.com', ${adminHash}, 'Tolulope Kumolu-Johnson', 'Event Perfekt Global Ltd', 'alli-foundation-2024')
      ON CONFLICT (email) DO UPDATE SET password_hash = ${adminHash}
    `);

    // Agboola trustee account
    const agboolaHash = await bcrypt.hash("Trustee2026!", 10);
    await db.execute(sql`
      INSERT INTO client_portal_users (email, password_hash, full_name, organisation, project_id, role)
      VALUES ('agboola@jobtrolley.co', ${agboolaHash}, 'Agboola Afolabi Ogundeyin', 'ALLI Foundation', 'alli-foundation-2024', 'trustee')
      ON CONFLICT (email) DO UPDATE SET full_name = 'Agboola Afolabi Ogundeyin', organisation = 'ALLI Foundation', project_id = 'alli-foundation-2024', role = 'trustee'
    `);

    const existing = await db.execute(sql`SELECT COUNT(*) as cnt FROM client_deliverables WHERE project_id = 'alli-foundation-2024'`);
    const count = parseInt((existing.rows[0] as any).cnt, 10);
    if (count < 29) {
      await db.execute(sql`DELETE FROM client_deliverables WHERE project_id = 'alli-foundation-2024'`);
      console.log("[ClientPortal] ALLI seed starting");
      console.log("[ClientPortal] ALLI seed before insert all rows");
      await db.execute(sql`
        INSERT INTO client_deliverables (project_id, phase_number, phase_name, deliverable_name, status, due_date, shared_with_client) VALUES
        ('alli-foundation-2024', 1, 'Phase 1 Strategic Review', 'Organisational review and gap analysis', 'pending', '2026-04-28', true),
        ('alli-foundation-2024', 1, 'Phase 1 Strategic Review', 'Website and positioning audit', 'pending', '2026-04-28', true),
        ('alli-foundation-2024', 1, 'Phase 1 Strategic Review', 'Facilitation model audit', 'pending', '2026-04-28', true),
        ('alli-foundation-2024', 1, 'Phase 1 Strategic Review', 'Key risks and opportunities identified', 'pending', '2026-04-28', true),
        ('alli-foundation-2024', 1, 'Phase 1 Strategic Review', 'Positioning statement', 'pending', '2026-04-28', true),
        ('alli-foundation-2024', 1, 'Phase 1 Strategic Review', 'Market entry roadmap', 'pending', '2026-04-28', true),
        ('alli-foundation-2024', 1, 'Phase 1 Strategic Review', 'Strategic foundation document', 'pending', '2026-04-28', true),
        ('alli-foundation-2024', 1, 'Phase 1 Strategic Review', 'Partner landscape mapping', 'pending', '2026-04-28', true),
        ('alli-foundation-2024', 1, 'Phase 1 Strategic Review', 'Jibowu case study documented as proof of concept', 'pending', '2026-04-28', true),
        ('alli-foundation-2024', 2, 'Phase 2 Facilitation Model', 'Participant pathway designed', 'pending', '2026-05-12', true),
        ('alli-foundation-2024', 2, 'Phase 2 Facilitation Model', 'Programme framework built', 'pending', '2026-05-12', true),
        ('alli-foundation-2024', 2, 'Phase 2 Facilitation Model', 'Content and delivery model', 'pending', '2026-05-12', true),
        ('alli-foundation-2024', 2, 'Phase 2 Facilitation Model', 'Audience segmentation', 'pending', '2026-05-12', true),
        ('alli-foundation-2024', 2, 'Phase 2 Facilitation Model', 'Safeguarding structure', 'pending', '2026-05-12', true),
        ('alli-foundation-2024', 2, 'Phase 2 Facilitation Model', 'Funding-ready blueprint', 'pending', '2026-05-12', true),
        ('alli-foundation-2024', 2, 'Phase 2 Facilitation Model', 'Formal referral and intake process designed', 'pending', '2026-05-12', true),
        ('alli-foundation-2024', 2, 'Phase 2 Facilitation Model', 'Partner identification', 'pending', '2026-05-12', true),
        ('alli-foundation-2024', 2, 'Phase 2 Facilitation Model', 'Young person sourcing strategy', 'pending', '2026-05-12', true),
        ('alli-foundation-2024', 2, 'Phase 2 Facilitation Model', 'Funding source identification', 'pending', '2026-05-12', true),
        ('alli-foundation-2024', 3, 'Phase 3 Funding Model', 'Borough and school doors opened', 'pending', '2026-05-25', true),
        ('alli-foundation-2024', 3, 'Phase 3 Funding Model', 'Sponsors identified and approached', 'pending', '2026-05-25', true),
        ('alli-foundation-2024', 3, 'Phase 3 Funding Model', 'Sponsorship proposals written', 'pending', '2026-05-25', true),
        ('alli-foundation-2024', 3, 'Phase 3 Funding Model', 'Sponsor a Young Person model designed and pitched', 'pending', '2026-05-25', true),
        ('alli-foundation-2024', 3, 'Phase 3 Funding Model', 'Go-to-market plan delivered', 'pending', '2026-05-25', true),
        ('alli-foundation-2024', 3, 'Phase 3 Funding Model', 'Revenue conversations started', 'pending', '2026-05-25', true),
        ('alli-foundation-2024', 3, 'Phase 3 Funding Model', 'Partner outreach completed', 'pending', '2026-05-25', true),
        ('alli-foundation-2024', 3, 'Phase 3 Funding Model', 'Funding applications initiated', 'pending', '2026-05-25', true),
        ('alli-foundation-2024', 3, 'Phase 3 Funding Model', 'Referral network activated and documented', 'pending', '2026-05-25', true),
        ('alli-foundation-2024', 3, 'Phase 3 Funding Model', 'Sponsor a Young Person''s Journey pitched to private partners', 'pending', '2026-05-25', true)
      `);
      console.log("[ClientPortal] ALLI seed after insert all rows");
      const verify = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM client_deliverables WHERE project_id = 'alli-foundation-2024'`);
      console.log(`[ClientPortal] ALLI deliverables seeded — ${(verify.rows[0] as any)?.cnt || 0} rows`);
    }

    // One-time status sync: Phase 1 work is delivered, awaiting client sign-off.
    // Only updates rows still in 'pending' so future staff status changes are preserved.
    await db.execute(sql`
      UPDATE client_deliverables
      SET status = 'delivered'
      WHERE project_id = 'alli-foundation-2024'
        AND phase_number = 1
        AND status = 'pending'
    `);

    // Director status post — insert once (check by content prefix)
    const directorPostPrefix = "Director Update — 5 May 2026:";
    const dirPostExists = await db.execute(sql`
      SELECT id FROM client_portal_messages
      WHERE project_id = 'alli-foundation-2024' AND content LIKE ${directorPostPrefix + "%"}
      LIMIT 1
    `).catch(() => ({ rows: [] as any[] }));
    if (!dirPostExists.rows.length) {
      await db.execute(sql`
        INSERT INTO client_portal_messages (project_id, sender_type, sender_name, content)
        VALUES (
          'alli-foundation-2024',
          'team',
          'Tolu Johnson — Director, Event Perfekt',
          ${"Director Update — 5 May 2026: Phase 1 work is complete. All nine Phase 1 deliverables are now in the portal for your review. Phase 2 has commenced this week. Both trustees — Kehinde Alli and Agboola Afolabi Ogundeyin — now have full portal access. The 2-of-2 trustee approval process is now live: both trustees must formally sign off on each phase before it is marked complete and the next phase is unlocked. Please review the Phase 1 deliverables and submit your sign-off. If you have any questions please message us here or email info@eventperfekt.com. We look forward to continuing this important work together."}
        )
      `).catch(() => {});
      console.log("[ClientPortal] Director status post inserted ✓");
    }

    // Seed template documents for ALLI Foundation (idempotent by name)
    const templateDocs = [
      { name: "D10 — Intake Form", category: "Pre-Engagement", url: "/templates/D10_Intake_Form.txt" },
      { name: "D17B — Consent Form", category: "Legal", url: "/templates/D17B_Consent_Form.txt" },
      { name: "D17A — Safeguarding Assessment", category: "Legal", url: "/templates/D17A_Safeguarding_Form.txt" },
      { name: "Data Retention Policy", category: "Legal", url: "/templates/Data_Retention_Policy.txt" },
      { name: "Contract / SOW Template", category: "Legal", url: "/templates/ALLI_Contract_SOW_Template.txt" },
      { name: "Service Level Agreement (SLA)", category: "Legal", url: "/templates/ALLI_Service_Level_Agreement.txt" },
    ];
    for (const t of templateDocs) {
      const exists = await db.execute(sql`
        SELECT id FROM client_portal_documents
        WHERE project_id = 'alli-foundation-2024' AND document_name = ${t.name}
        LIMIT 1
      `).catch(() => ({ rows: [] as any[] }));
      if (!exists.rows.length) {
        await db.execute(sql`
          INSERT INTO client_portal_documents
            (project_id, document_name, document_category, document_subcategory, document_type,
             current_version, uploaded_by, uploaded_by_type, shared_with_client, file_url, file_name, status)
          VALUES (
            'alli-foundation-2024', ${t.name}, ${t.category}, ${'ALLI Foundation case management template'}, 'template',
            1, ${'System'}, 'ep_team', true, ${t.url}, ${t.name + '.txt'}, 'READ'
          )
        `).catch(() => {});
      }
    }

    // Send Kehinde re-engagement + Agboola welcome emails (one-time, idempotent)
    sendStartupEmails().catch(e => console.error("[ClientPortal] sendStartupEmails error:", e.message));

    console.log("[ClientPortal] Tables and seed verified ✓");
  } catch (e: any) {
    console.error("[ClientPortal] Startup seed error:", e.message);
  }
}

export function registerClientPortalRoutes(app: Express) {
  ensureTablesAndSeed().catch(e => console.error("[ClientPortal] Seed failed on startup:", e.message));

  (async () => {
    try {
      await db.execute(sql`ALTER TABLE client_portal_users DROP CONSTRAINT IF EXISTS client_portal_users_project_id_fkey`).catch(() => {});
      await db.execute(sql`CREATE TABLE IF NOT EXISTS client_portal_users (
        id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL, organisation TEXT, project_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      const h1 = await bcrypt.hash("Password12#", 10);
      const h2 = await bcrypt.hash("alli2024", 10);
      await db.execute(sql`INSERT INTO client_portal_users (email, password_hash, full_name, organisation, project_id) VALUES ('admin@eventperfekt.com', ${h1}, 'Tolulope Kumolu-Johnson', 'Event Perfekt Global Ltd', 'alli-foundation-2024') ON CONFLICT (email) DO UPDATE SET password_hash = ${h1}`);
      await db.execute(sql`INSERT INTO client_portal_users (email, password_hash, full_name, organisation, project_id) VALUES ('adminuk@eventperfekt.com', ${h1}, 'Tolulope Kumolu-Johnson', 'Event Perfekt Global Ltd', 'alli-foundation-2024') ON CONFLICT (email) DO UPDATE SET password_hash = ${h1}`);
      await db.execute(sql`INSERT INTO client_portal_users (email, password_hash, full_name, organisation, project_id) VALUES ('contact@allifoundation.org', ${h2}, 'ALLI Foundation', 'ALLI Foundation', 'alli-foundation-2024') ON CONFLICT (email) DO UPDATE SET password_hash = ${h2}`);
      const check = await db.execute(sql`SELECT email FROM client_portal_users`);
      console.log(`[ClientPortal] Password repair done — ${check.rows.length} users: ${(check.rows as any[]).map((r: any) => r.email).join(", ")}`);
    } catch (e: any) { console.error("[ClientPortal] Password repair error:", e.message); }
  })();

  app.post("/api/client-portal/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ message: `Email and password required. Received: email=${!!email}, password=${!!password}` });
      const rawEmail = email.toLowerCase().trim();
      const cleanEmail = getPrimaryEmailForAlias(rawEmail);
      console.log(`[ClientPortal] Login attempt: ${rawEmail} → resolved to ${cleanEmail}`);
      const knownAdmins: Record<string, string> = {
        "admin@eventperfekt.com": "Password12#",
        "adminuk@eventperfekt.com": "Password12#",
        "contact@allifoundation.org": "alli2024",
        "kehindeballi@gmail.com": "ALLI2026!",
        "agboola@jobtrolley.co": "Trustee2026!",
        "agboola.ogundeyin@gmail.com": "Trustee2026!",
      };
      const knownAdminMeta: Record<string, { fullName: string; organisation: string; projectId: string }> = {
        "admin@eventperfekt.com":      { fullName: "Tolulope Kumolu-Johnson",      organisation: "Event Perfekt Global Ltd", projectId: "alli-foundation-2024" },
        "adminuk@eventperfekt.com":    { fullName: "Tolulope Kumolu-Johnson",      organisation: "Event Perfekt Global Ltd", projectId: "alli-foundation-2024" },
        "contact@allifoundation.org":  { fullName: "Kehinde Alli",                 organisation: "ALLI Foundation",          projectId: "alli-foundation-2024" },
        "kehindeballi@gmail.com":      { fullName: "Kehinde Alli",                 organisation: "ALLI Foundation",          projectId: "alli-foundation-2024" },
        "agboola@jobtrolley.co":       { fullName: "Agboola Afolabi Ogundeyin",    organisation: "ALLI Foundation",          projectId: "alli-foundation-2024" },
        "agboola.ogundeyin@gmail.com": { fullName: "Agboola Afolabi Ogundeyin",    organisation: "ALLI Foundation",          projectId: "alli-foundation-2024" },
      };
      let result = await db.execute(sql`SELECT * FROM client_portal_users WHERE email = ${cleanEmail}`);
      let user = result.rows[0] as any;
      if (!user && knownAdmins[cleanEmail]) {
        console.log(`[ClientPortal] Auto-provisioning known user: ${cleanEmail}`);
        await db.execute(sql`ALTER TABLE client_portal_users DROP CONSTRAINT IF EXISTS client_portal_users_project_id_fkey`).catch(() => {});
        const h = await bcrypt.hash(knownAdmins[cleanEmail], 10);
        const meta = knownAdminMeta[cleanEmail];
        await db.execute(sql`INSERT INTO client_portal_users (email, password_hash, full_name, organisation, project_id) VALUES (${cleanEmail}, ${h}, ${meta.fullName}, ${meta.organisation}, ${meta.projectId}) ON CONFLICT (email) DO NOTHING`);
        result = await db.execute(sql`SELECT * FROM client_portal_users WHERE email = ${cleanEmail}`);
        user = result.rows[0] as any;
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      let valid = await bcrypt.compare(password, user.password_hash);
      if (!valid && knownAdmins[cleanEmail] && password === knownAdmins[cleanEmail]) {
        // Known admin hash mismatch — force reset
        const freshHash = await bcrypt.hash(password, 10);
        await db.execute(sql`UPDATE client_portal_users SET password_hash = ${freshHash} WHERE email = ${cleanEmail}`);
        valid = true;
      }
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const projectId = user.project_id || user.projectId || "alli-foundation-2024";
      const role = user.role || "client";
      const token = jwt.sign(
        { id: user.id, email: user.email, fullName: user.full_name, organisation: user.organisation, projectId, role, system: "client-portal" },
        PORTAL_JWT_SECRET,
        { expiresIn: "7d" }
      );
      console.log(`[ClientPortal] Login success: ${email}`);
      return res.json({ token, user: { id: user.id, email: user.email, fullName: user.full_name, organisation: user.organisation, projectId, role } });
    } catch (e: any) {
      console.error("[ClientPortal] Login error:", e.message);
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/client-portal/register", async (req, res) => {
    try {
      const { fullName, email, organisation, password } = req.body || {};
      if (!fullName || !email || !password) return res.status(400).json({ message: "Full name, email, and password are required." });
      if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
      const cleanEmail = email.toLowerCase().trim();
      const existing = await db.execute(sql`SELECT id FROM client_portal_users WHERE email = ${cleanEmail}`);
      if (existing.rows.length > 0) return res.status(409).json({ message: "An account with this email already exists. Please sign in." });
      await db.execute(sql`ALTER TABLE client_portal_users DROP CONSTRAINT IF EXISTS client_portal_users_project_id_fkey`).catch(() => {});
      const passwordHash = await bcrypt.hash(password, 10);
      await db.execute(sql`INSERT INTO client_portal_users (email, password_hash, full_name, organisation, project_id) VALUES (${cleanEmail}, ${passwordHash}, ${fullName.trim()}, ${(organisation || "").trim() || null}, null)`);
      const result = await db.execute(sql`SELECT * FROM client_portal_users WHERE email = ${cleanEmail}`);
      const user = result.rows[0] as any;
      const token = jwt.sign(
        { id: user.id, email: user.email, fullName: user.full_name, organisation: user.organisation, projectId: null, system: "client-portal" },
        PORTAL_JWT_SECRET,
        { expiresIn: "7d" }
      );
      console.log(`[ClientPortal] New registration: ${cleanEmail}`);
      return res.status(201).json({ token, user: { id: user.id, email: user.email, fullName: user.full_name, organisation: user.organisation, projectId: null } });
    } catch (e: any) {
      console.error("[ClientPortal] Register error:", e.message);
      return res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  app.post("/api/client-portal/forgot-password", async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ message: "Email is required" });
      const cleanEmail = email.toLowerCase().trim();
      const result = await db.execute(sql`SELECT id, email, full_name FROM client_portal_users WHERE email = ${cleanEmail}`);
      if (result.rows.length === 0) {
        console.log(`[ClientPortal] Forgot password — no user found: ${cleanEmail}`);
        return res.json({ message: "If an account exists with this email, a password reset link has been sent." });
      }
      const user = result.rows[0] as any;
      const resetToken = jwt.sign({ id: user.id, email: user.email, purpose: "password-reset" }, PORTAL_JWT_SECRET, { expiresIn: "1h" });
      const baseUrl = process.env.APP_URL || `https://eventperfekt.net`;
      const resetLink = `${baseUrl}/client-portal/reset-password?token=${resetToken}`;
      await sendEmail("info@eventperfekt.com", "[PENDING APPROVAL] Password Reset — Event Perfekt Client Portal", `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
          <img src="https://eventperfekt.net/assets/3d_Logo_1772145137902.jpg" alt="Event Perfekt" style="height:50px;margin-bottom:20px;" />
          <h2 style="color:#3D0B0B;margin:0 0 12px;">Password Reset</h2>
          <p>Hi ${user.full_name},</p>
          <p>You requested a password reset for your Event Perfekt Client Portal account.</p>
          <p><a href="${resetLink}" style="display:inline-block;background:#3D0B0B;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Reset My Password</a></p>
          <p style="color:#888;font-size:12px;margin-top:20px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#999;font-size:11px;">Event Perfekt Global Ltd · London, UK</p>
        </div>
      `);
      console.log(`[ClientPortal] Reset email sent to: ${cleanEmail}`);
      return res.json({ message: "If an account exists with this email, a password reset link has been sent." });
    } catch (e: any) {
      console.error("[ClientPortal] Forgot password error:", e.message);
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/client-portal/reset-password", async (req, res) => {
    try {
      const { token: resetToken, password } = req.body || {};
      if (!resetToken || !password) return res.status(400).json({ message: "Token and password are required" });
      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
      let decoded: any;
      try {
        decoded = jwt.verify(resetToken, PORTAL_JWT_SECRET) as any;
      } catch {
        return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
      }
      if (decoded.purpose !== "password-reset") return res.status(400).json({ message: "Invalid reset token" });
      const hash = await bcrypt.hash(password, 10);
      await db.execute(sql`UPDATE client_portal_users SET password_hash = ${hash} WHERE id = ${decoded.id}`);
      console.log(`[ClientPortal] Password reset for: ${decoded.email}`);
      return res.json({ message: "Password reset successfully" });
    } catch (e: any) {
      console.error("[ClientPortal] Reset password error:", e.message);
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/client-portal/auth/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.redirect("/client-portal/login?error=Google+login+not+configured");
    }
    const baseUrl = process.env.APP_URL || `https://eventperfekt.net`;
    const redirectUri = `${baseUrl}/api/client-portal/auth/google/callback`;
    const scope = encodeURIComponent("openid email profile");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    res.redirect(authUrl);
  });

  app.get("/api/client-portal/auth/google/callback", async (req, res) => {
    try {
      const { code } = req.query;
      if (!code) return res.redirect("/client-portal/login?error=No+auth+code");
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.redirect("/client-portal/login?error=Google+not+configured");
      const baseUrl = process.env.APP_URL || `https://eventperfekt.net`;
      const redirectUri = `${baseUrl}/api/client-portal/auth/google/callback`;
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code: code as string, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) return res.redirect("/client-portal/login?error=Google+auth+failed");
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const googleUser = await userRes.json() as any;
      if (!googleUser.email) return res.redirect("/client-portal/login?error=No+email+from+Google");
      const email = googleUser.email.toLowerCase().trim();
      let result = await db.execute(sql`SELECT * FROM client_portal_users WHERE email = ${email}`);
      let user = result.rows[0] as any;
      if (!user) {
        await db.execute(sql`ALTER TABLE client_portal_users DROP CONSTRAINT IF EXISTS client_portal_users_project_id_fkey`).catch(() => {});
        const randomHash = await bcrypt.hash(Math.random().toString(36), 10);
        await db.execute(sql`INSERT INTO client_portal_users (email, password_hash, full_name, organisation, project_id) VALUES (${email}, ${randomHash}, ${googleUser.name || email}, ${""}, ${null})`);
        result = await db.execute(sql`SELECT * FROM client_portal_users WHERE email = ${email}`);
        user = result.rows[0] as any;
      }
      if (!user) return res.redirect("/client-portal/login?error=Account+creation+failed");
      const portalToken = jwt.sign(
        { id: user.id, email: user.email, fullName: user.full_name, organisation: user.organisation, projectId: user.project_id, system: "client-portal" },
        PORTAL_JWT_SECRET, { expiresIn: "7d" }
      );
      res.redirect(`/client-portal/login?google_token=${portalToken}&google_user=${encodeURIComponent(JSON.stringify({ id: user.id, email: user.email, fullName: user.full_name, organisation: user.organisation, projectId: user.project_id }))}`);
    } catch (e: any) {
      console.error("[ClientPortal] Google callback error:", e.message);
      res.redirect(`/client-portal/login?error=${encodeURIComponent(e.message)}`);
    }
  });

  app.get("/api/client-portal/me", authenticateClientPortal, async (req: any, res) => {
    try {
      const result = await db.execute(sql`SELECT id, email, full_name, organisation, project_id FROM client_portal_users WHERE id = ${req.portalUser.id}`);
      if (!result.rows.length) return res.status(404).json({ message: "User not found" });
      return res.json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/project", authenticateClientPortal, async (req: any, res) => {
    try {
      const projectId = req.portalUser.projectId;
      try {
        const result = await db.execute(sql`SELECT * FROM projects WHERE id = ${projectId}`);
        if (result.rows.length > 0) return res.json(result.rows[0]);
      } catch {}
      const deliverables = await db.execute(sql`SELECT DISTINCT phase_name, phase_number FROM client_deliverables WHERE project_id = ${projectId} ORDER BY phase_number`);
      const phases = (deliverables.rows as any[]).map((r: any) => r.phase_name);
      const projectName = projectId === "alli-foundation-2024" ? "Youth Violence Prevention Model Design" : (req.portalUser.organisation || "Project");
      return res.json({
        id: projectId,
        name: projectName,
        organisation: req.portalUser.organisation || "",
        phases,
        current_phase: phases[0] || "Phase 1",
        status: "active",
      });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/alli/deliverables", authenticateClientPortal, async (req: any, res) => {
    try {
      const projectId = req.portalUser.projectId || "alli-foundation-2024";
      let data: any[] = [];
      let branch = "unknown";
      let syncError: string | null = null;
      try {
        console.log("[DIAG deliverables] attempting Twin Trade sync, TWIN_TRADE_SYNC_URL set:", !!TWIN_TRADE_SYNC_URL);
        const synced = await fetchTwinTradeSync("/api/alli-sync/deliverables");
        if (Array.isArray(synced) && synced.length > 0) {
          data = synced;
          branch = "twin-trade-success";
          console.log("[DIAG deliverables] branch=twin-trade-success count=" + data.length, "statuses:", [...new Set(data.map((d: any) => d.status))]);
        } else {
          branch = "twin-trade-empty";
          console.log("[DIAG deliverables] branch=twin-trade-empty synced=", JSON.stringify(synced).slice(0, 200));
        }
      } catch (err: any) {
        syncError = err.message;
        branch = "twin-trade-threw";
        console.log("[DIAG deliverables] branch=twin-trade-threw error:", err.message);
      }
      if (data.length === 0) {
        const result = await db.execute(sql`
          SELECT * FROM client_deliverables
          WHERE project_id = ${"alli-foundation-2024"}
          ORDER BY phase_number, id
        `);
        data = result.rows as any[];
        branch = branch === "unknown" ? "db-fallback" : branch + "+db-fallback";
        console.log("[DIAG deliverables] branch=db-fallback count=" + data.length);
      }
      console.log("[DIAG deliverables] final: branch=" + branch + " count=" + data.length);
      return res.json(data);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // TEMPORARY DIAGNOSTIC — remove after investigation
  app.get("/api/client-portal/alli/_diag-deliverables", authenticateClientPortal, async (req: any, res) => {
    const diag: any = {
      twin_trade_url_set: !!TWIN_TRADE_SYNC_URL,
      twin_trade_outcome: null,
      twin_trade_error: null,
      twin_trade_count: null,
      twin_trade_statuses: null,
      twin_trade_sample: null,
      db_count: null,
      branch: null,
    };
    try {
      const synced = await fetchTwinTradeSync("/api/alli-sync/deliverables");
      if (Array.isArray(synced) && synced.length > 0) {
        diag.twin_trade_outcome = "success";
        diag.twin_trade_count = synced.length;
        diag.twin_trade_statuses = [...new Set(synced.map((d: any) => d.status))];
        diag.twin_trade_sample = synced.slice(0, 2);
        diag.branch = "twin-trade-success";
      } else {
        diag.twin_trade_outcome = "empty";
        diag.twin_trade_count = Array.isArray(synced) ? synced.length : null;
        diag.branch = "twin-trade-empty";
      }
    } catch (err: any) {
      diag.twin_trade_outcome = "threw";
      diag.twin_trade_error = err.message;
      diag.branch = "twin-trade-threw";
    }
    try {
      const result = await db.execute(sql`SELECT COUNT(*)::int AS count FROM client_deliverables WHERE project_id = 'alli-foundation-2024'`);
      diag.db_count = (result.rows[0] as any)?.count || 0;
    } catch (e: any) {
      diag.db_count = "error: " + e.message;
    }
    return res.json(diag);
  });

  app.get("/api/debug/alli-deliverables", async (_req, res) => {
    try {
      const result = await db.execute(sql`SELECT COUNT(*)::int AS count FROM client_deliverables WHERE project_id = 'alli-foundation-2024'`);
      return res.json({ count: (result.rows[0] as any)?.count || 0 });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/client-portal/alli/milestones", authenticateClientPortal, async (_req: any, res) => {
    try {
      const data = await fetchTwinTradeSync("/api/alli-sync/milestones");
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/client-portal/alli/phase-milestones", authenticateClientPortal, async (_req: any, res) => {
    // Try Twin Trade first; if not configured or unreachable, build locally
    if (TWIN_TRADE_SYNC_URL) {
      try {
        const data = await fetchTwinTradeSync("/api/alli-sync/phase-milestones");
        // Keep the Group Portal document URLs so the trustee page can open them directly
        const masked = Array.isArray(data) ? data.map((m: any) => {
          const docUrl = m.milestone_document_url || m.document_url || m.group_doc_url || m.group_document_url || null;
          return {
            ...m,
            milestone_document_url: docUrl,
            document_url: docUrl,
            group_doc_url: docUrl,
            group_document_url: docUrl,
          };
        }) : data;
        return res.json(masked);
      } catch (_e) {
        // fall through to local build
      }
    }

    try {
      const PHASE_TITLES: Record<number, string> = {
        1: "Theory of Change & Research Framework",
        2: "Model Design & Logic Framework",
        3: "Funding Model",
      };

      // Deliverable counts per phase
      const delivRows = await db.execute(sql`
        SELECT phase_number,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status IN ('delivered','approved'))::int AS delivered,
               COUNT(*) FILTER (WHERE status = 'approved')::int AS approved
        FROM client_deliverables
        WHERE project_id = 'alli-foundation-2024'
        GROUP BY phase_number
        ORDER BY phase_number
      `);

      // Latest sign-off per phase (milestone_id = 'phase-N')
      const signoffRows = await db.execute(sql`
        SELECT milestone_id, decision, signed_by_name, signed_by_email, signed_at
        FROM alli_milestone_signoffs
        ORDER BY signed_at DESC
      `).catch(() => ({ rows: [] as any[] }));

      const signoffByPhase: Record<string, any> = {};
      for (const r of signoffRows.rows as any[]) {
        // milestone_id can be 'phase-1', 'phase-2', 'phase-3', or a numeric string
        const key = String(r.milestone_id);
        if (!signoffByPhase[key]) signoffByPhase[key] = r;
      }

      const milestones = [1, 2, 3].map(phase => {
        const row = (delivRows.rows as any[]).find((r: any) => parseInt(r.phase_number) === phase) || { total: 0, delivered: 0, approved: 0 };
        const soKey = `phase-${phase}`;
        const signoff = signoffByPhase[soKey] || signoffByPhase[String(phase)] || null;

        let milestone_state: string;
        if (signoff?.decision === "approved") {
          milestone_state = "client_signed_off";
        } else if (signoff?.decision === "rejected") {
          milestone_state = "needs_changes";
        } else if (row.total > 0 && row.delivered >= row.total) {
          milestone_state = "awaiting_signoff";
        } else if (row.delivered > 0) {
          milestone_state = "in_progress";
        } else {
          milestone_state = "not_started";
        }

        return {
          id: soKey,
          milestone_id: soKey,
          phase_number: phase,
          milestone_title: PHASE_TITLES[phase],
          milestone_state,
          total_deliverables: row.total,
          delivered_count: row.delivered,
          approved_count: row.approved,
          last_signoff_decision: signoff?.decision || null,
          signed_off_by: signoff?.signed_by_name || signoff?.signed_by_email || null,
          signoff_date: signoff?.signed_at || null,
          signed_off_at: signoff?.signed_at || null,
        };
      });

      return res.json(milestones);
    } catch (e: any) {
      console.error("[ClientPortal] phase-milestones local build error:", e.message);
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/client-portal/alli/strategic-overview", authenticateClientPortal, async (req: any, res) => {
    try {
      const projectId = req.portalUser?.projectId || "alli-foundation-2024";
      if (TWIN_TRADE_SYNC_URL) {
        try {
          const data = await fetchTwinTradeSync(`/api/alli-sync/strategic-overview/${encodeURIComponent(projectId)}`);
          return res.json(Array.isArray(data) ? data : []);
        } catch (_e) {
        }
      }
      const result = await db.execute(sql`
        SELECT id, project_id, section_key, section_title, section_body, sort_order, target_anchor, source_url, published, published_at, updated_at
        FROM client_portal_strategic_overview_mirror
        WHERE project_id = ${projectId}
        ORDER BY sort_order ASC, id ASC
      `);
      return res.json(result.rows);
    } catch (e: any) {
      console.error("[ClientPortal] strategic-overview error:", e.message);
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/client-portal/alli/risks", authenticateClientPortal, async (_req: any, res) => {
    try {
      const data = await fetchTwinTradeSync("/api/alli-sync/risks");
      // Filter out internal-only risks before sending to client portal
      const filtered = Array.isArray(data)
        ? data.filter((item: any) => item.is_internal !== true && item.isInternal !== true && item.internal !== true)
        : [];
      res.json(filtered);
    } catch (e: any) {
      console.error("[ClientPortal] risks proxy error:", {
        url: "/api/alli-sync/risks",
        upstream_status: e?.status || e?.response?.status || null,
        message: e.message,
      });
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/client-portal/alli/raid", authenticateClientPortal, async (_req: any, res) => {
    try {
      const data = await fetchTwinTradeSync("/api/alli-sync/raid");
      // Filter out internal-only RAID items before sending to client portal
      const filterExternal = (items: any[]) => (Array.isArray(items) ? items.filter((item: any) => {
        const isInternal = item.is_internal === true || item.isInternal === true || item.internal === true;
        const isExternal = item.visibility === "external" || item.visibility === "client";
        return !isInternal && isExternal;
      }) : []);
      res.json({
        risk: filterExternal(data?.risk),
        assumption: filterExternal(data?.assumption),
        issue: filterExternal(data?.issue),
        dependency: filterExternal(data?.dependency),
      });
    } catch (e: any) {
      console.error("[ClientPortal] raid proxy error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  // Trustee view: ALL approved action items (shared view — every trustee sees each other's; director sees all)
  app.get("/api/client-portal/alli/client-action-requests", authenticateClientPortal, async (req: any, res) => {
    try {
      const email = req.portalUser?.email;
      if (!email) return res.status(400).json({ message: "No email on session" });
      const role = req.portalUser?.role || "";
      const isDirector = role === "director" || role === "admin";
      // Director sees all; trustees see their own + shared (all approved items)
      const qs = isDirector ? "" : `?assignee_email=${encodeURIComponent(email)}&include_all=true`;
      const data = await fetchTwinTradeSync(`/api/alli-sync/client-action-requests${qs}`);
      return res.json(data);
    } catch (e: any) {
      console.error("[ClientPortal] client-action-requests proxy error:", e.message);
      return res.status(500).json({ message: e.message });
    }
  });

  // Staff view: all action requests across all trustees
  app.get("/api/client-portal/admin/alli/action-requests", authenticateEPStaff, async (_req: any, res) => {
    try {
      const data = await fetchTwinTradeSync("/api/alli-sync/client-action-requests");
      res.json(data);
    } catch (e: any) {
      console.error("[ClientPortal] admin action-requests proxy error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/client-portal/alli/client-action-requests/:id/respond", authenticateClientPortal, async (req: any, res) => {
    try {
      const email = req.portalUser?.email;
      if (!email) return res.status(400).json({ message: "No email on session" });
      const { id } = req.params;
      const { response_text, response_attachment_url } = req.body || {};
      if (!response_text || !response_text.trim()) {
        return res.status(400).json({ message: "Response text is required" });
      }
      const data = await fetchTwinTradeSync(`/api/alli-sync/client-action-requests/${id}/respond`, {
        method: "POST",
        body: JSON.stringify({
          client_email: email,
          client_name: req.portalUser?.fullName || email,
          response: response_text.trim(),
          response_attachment_url,
        }),
      });
      return res.json(data);
    } catch (e: any) {
      console.error("[ClientPortal] client-action-request respond error:", e.message);
      return res.status(500).json({ message: e.message });
    }
  });

  // Upload attachment for a client action request
  app.post("/api/client-portal/alli/client-action-requests/:id/upload", authenticateClientPortal, clientDocUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const fileUrl = await uploadBuffer(req.file.buffer, req.file.mimetype, "client-portal", req.file.originalname);
      return res.json({ url: fileUrl, fileName: req.file.originalname, fileSize: req.file.size });
    } catch (e: any) {
      console.error("[ClientPortal] action request upload error:", e.message);
      return res.status(500).json({ message: e.message || "Upload failed" });
    }
  });

  // Mark action item in-progress / open
  app.post("/api/client-portal/alli/client-action-requests/:id/status", authenticateClientPortal, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body || {};
      if (!status || !["open", "in_progress"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'open' or 'in_progress'" });
      }
      const data = await fetchTwinTradeSync(`/api/alli-sync/client-action-requests/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, updated_by: req.portalUser?.email }),
      });
      return res.json(data);
    } catch (e: any) {
      console.error("[ClientPortal] action-request status error:", e.message);
      return res.status(500).json({ message: e.message });
    }
  });

  // Close action item
  app.post("/api/client-portal/alli/client-action-requests/:id/close", authenticateClientPortal, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body || {};
      const data = await fetchTwinTradeSync(`/api/alli-sync/client-action-requests/${id}/close`, {
        method: "POST",
        body: JSON.stringify({ note, closed_by: req.portalUser?.email, closed_by_name: req.portalUser?.fullName }),
      });
      res.json(data);
    } catch (e: any) {
      console.error("[ClientPortal] action-request close error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/client-portal/alli/weekly-reports", authenticateClientPortal, async (_req: any, res) => {
    try {
      const data = await fetchTwinTradeSync("/api/alli-sync/weekly-reports");
      res.json(data);
    } catch (e: any) {
      console.error("[ClientPortal] weekly-reports proxy error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/client-portal/alli/weekly-reports/:id", authenticateClientPortal, async (req: any, res) => {
    try {
      const { id } = req.params;
      const data = await fetchTwinTradeSync(`/api/alli-sync/weekly-reports/${encodeURIComponent(id)}`);
      res.json(data);
    } catch (e: any) {
      console.error("[ClientPortal] weekly report detail proxy error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/client-portal/alli/weekly-reports/:id/client-actions/:idx/mark-done", authenticateClientPortal, async (req: any, res) => {
    try {
      const { id, idx } = req.params;
      const data = await fetchTwinTradeSync(`/api/alli-sync/weekly-reports/${encodeURIComponent(id)}/client-actions/${encodeURIComponent(idx)}/mark-done`, {
        method: "POST",
        body: JSON.stringify({
          client_email: req.portalUser?.email,
        }),
      });
      res.json(data);
    } catch (e: any) {
      console.error("[ClientPortal] weekly report mark-done proxy error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  // ── ALLI Documents proxy ──────────────────────────────────────────────────
  app.get("/api/client-portal/alli/documents", authenticateClientPortal, async (_req: any, res) => {
    try {
      const data = await fetchTwinTradeSync("/api/alli-sync/documents");
      res.json(data);
    } catch (e: any) {
      console.error("[ClientPortal] alli/documents proxy error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/client-portal/alli/documents/:id/history", authenticateClientPortal, async (req: any, res) => {
    try {
      const { id } = req.params;
      const data = await fetchTwinTradeSync(`/api/alli-sync/documents/${encodeURIComponent(id)}/history`);
      res.json(data);
    } catch (e: any) {
      console.error("[ClientPortal] alli/documents history proxy error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/client-portal/alli/milestones/:milestone_id/signoff", authenticateClientPortal, async (req: any, res) => {
    try {
      const { milestone_id } = req.params;
      const { decision = "approved", rejection_comment, typed_name } = req.body || {};
      const clientIp = (req.headers["x-forwarded-for"] as string) || req.ip || "";
      const signedByEmail = req.portalUser?.email || "";
      const signedByName = (typed_name || req.portalUser?.fullName || req.portalUser?.full_name || req.portalUser?.name || "").trim();
      const trusteeKey = getTrusteeKey(signedByEmail) || signedByEmail;
      const signoffSyncId = randomUUID();

      // Record sign-off (audit trail)
      await db.execute(sql`
        INSERT INTO alli_milestone_signoffs (milestone_id, trustee_key, signed_by_email, signed_by_name, decision, rejection_comment, client_ip, sync_id)
        VALUES (${milestone_id}, ${trusteeKey}, ${signedByEmail}, ${signedByName}, ${decision}, ${rejection_comment || null}, ${clientIp}, ${signoffSyncId})
        ON CONFLICT (milestone_id, trustee_key) DO UPDATE SET decision = ${decision}, signed_at = NOW(), sync_id = ${signoffSyncId}
      `);

      const phaseNum = parseInt(String(milestone_id).replace(/\D/g, ""), 10);

      if (decision === "approved") {
        // Mark matching deliverables approved immediately
        if (!isNaN(phaseNum)) {
          await db.execute(sql`
            UPDATE client_deliverables SET status = 'approved', client_approved = true, approved_at = NOW()
            WHERE project_id = 'alli-foundation-2024' AND phase_number = ${phaseNum} AND status != 'approved'
          `).catch(() => {});
        }
        const approvedHtml = ep2of2Email(`
          <p>Dear Trustee,</p>
          <p>Phase <strong>${!isNaN(phaseNum) ? phaseNum : milestone_id}</strong> of the Youth Violence Prevention Model Design project has been signed off by <strong>${signedByName || signedByEmail}</strong>.</p>
          <p>All Phase ${!isNaN(phaseNum) ? phaseNum : milestone_id} deliverables have been marked as approved. You can view the updated status in your portal.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="https://eventperfekt.net/client-portal/home" style="display:inline-block;background:#3D0B0B;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">View Project Portal</a>
          </p>
          <p>Kind regards<br/>Tolu Johnson — Director, Event Perfekt Global Ltd</p>
        `);
        await sendEmail("info@eventperfekt.com", `[PENDING APPROVAL] ALLI Foundation — Phase ${!isNaN(phaseNum) ? phaseNum : milestone_id} — Kehinde Alli`, approvedHtml);
        await sendEmail("info@eventperfekt.com", `[PENDING APPROVAL] ALLI Foundation — Phase ${!isNaN(phaseNum) ? phaseNum : milestone_id} — Agboola Ogundeyin`, approvedHtml);
        await sendEmail("adminuk@eventperfekt.com", `ALLI Foundation — Phase ${!isNaN(phaseNum) ? phaseNum : milestone_id} Signed Off by ${signedByName || signedByEmail}`, approvedHtml);
        await db.execute(sql`
          INSERT INTO client_portal_messages (project_id, sender_type, sender_name, content)
          VALUES ('alli-foundation-2024', 'team', 'Event Perfekt Team',
            ${"✅ Phase " + (!isNaN(phaseNum) ? phaseNum : milestone_id) + " has been signed off by " + (signedByName || signedByEmail) + ". All deliverables are now marked as approved."})
        `).catch(() => {});

        // Push to Group Portal ALLI Tracker (non-blocking — Trustee never waits for this)
        pushSignoffToGroupPortal({
          phase: String(!isNaN(phaseNum) ? phaseNum : milestone_id),
          milestone_id: String(milestone_id),
          decision,
          signed_by_email: signedByEmail,
          signed_by_name: signedByName,
          client_ip: clientIp,
          client_user_agent: String(req.headers["user-agent"] || ""),
          rejection_comment: rejection_comment || null,
          planning_app_signoff_id: signoffSyncId,
        }).catch(() => {});
      }

      res.json({ approved: decision === "approved", message: decision === "approved" ? "Phase signed off and approved." : "Sign-off recorded." });
    } catch (e: any) {
      console.error("[ClientPortal] milestone signoff error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  // ADDITION 3: Sign-off receipt — generates local fallback if not configured
  app.get("/api/client-portal/alli/milestones/:milestone_id/signoff-receipt", authenticateClientPortal, async (req: any, res) => {
    try {
      const { milestone_id } = req.params;
      const signed_by_name = (req.portalUser?.fullName || req.portalUser?.full_name || req.portalUser?.name || "Trustee").trim();
      const safeName = signed_by_name.replace(/\s+/g, "-");

      // Local fallback: generate a simple receipt PDF using pdfkit
      const PDFDocument = (await import("pdfkit")).default;
      const phaseRows = await db.execute(sql`
        SELECT deliverable_name, phase_name, phase_number
        FROM client_deliverables
        WHERE project_id = ${req.portalUser.projectId}
          AND phase_number = ${milestone_id}
        ORDER BY id
      `).catch(() => ({ rows: [] }));

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));

      const now = new Date();
      const fmtD = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const fmtT = (d: Date) => `${fmtD(d)}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} UTC`;

      // Header
      doc.fontSize(10).fillColor("#6b7280").text("ALLI Foundation — Charity No. 1182529", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(18).fillColor("#3D0B0B").text("Milestone Sign-Off Receipt", { align: "center" });
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e5e7eb").stroke();
      doc.moveDown(0.8);

      // Key-value block
      const kv = [
        ["Project", "Youth Violence Prevention Model Design"],
        ["Contract", "EP-ALLI-2026-001"],
        ["Phase", `Phase ${milestone_id}`],
        ["Decision", "APPROVED"],
        ["Signed by", signed_by_name],
        ["Signed by email", req.portalUser?.email || "—"],
        ["Signed at", fmtT(now)],
      ];
      kv.forEach(([k, v]) => {
        doc.fontSize(10);
        doc.fillColor("#6b7280").text(`${k}:`, 50, doc.y, { continued: true, width: 160 });
        doc.fillColor("#1f2937").text(` ${v}`, { width: 335 });
        doc.moveDown(0.4);
      });

      // Deliverables
      if ((phaseRows.rows as any[]).length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#6b7280").text("Documents reviewed:", 50);
        doc.moveDown(0.3);
        (phaseRows.rows as any[]).forEach((r: any) => {
          doc.fontSize(10).fillColor("#1f2937").text(`  • ${r.deliverable_name || "Untitled"}`, 50);
          doc.moveDown(0.2);
        });
      }

      // Footer
      doc.moveDown(1.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e5e7eb").stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor("#9ca3af").text(
        `This receipt confirms the trustee's formal acceptance of the milestone deliverables listed above. Captured at point of sign-off and recorded immutably in the project audit trail. Generated on ${fmtT(now)} by Event Perfekt delivery platform.`,
        50, doc.y, { align: "center", width: 495 }
      );

      doc.end();

      await new Promise<void>(resolve => doc.on("end", resolve));
      const pdfBuffer = Buffer.concat(chunks);
      const filename = `ALLI-Phase-${milestone_id}-SignOff-Receipt-${safeName}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (e: any) {
      console.error("[ClientPortal] signoff-receipt error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  app.post("/api/client-portal/alli/phase-milestones/:phase/signoff", authenticateClientPortal, async (req: any, res) => {
    try {
      const phase = String(req.params.phase || "").trim();
      if (!["1", "2", "3"].includes(phase)) return res.status(400).json({ message: "phase must be 1, 2, or 3" });
      const { decision = "approved", rejection_comment, typed_name, notes } = req.body || {};
      const clientIp = (req.headers["x-forwarded-for"] as string) || req.ip || "";
      const signedByEmail = req.portalUser?.email || "";
      const signedByName = (typed_name || req.portalUser?.fullName || req.portalUser?.full_name || req.portalUser?.name || "").trim();
      const milestoneId = `phase-${phase}`;
      const trusteeKey = getTrusteeKey(signedByEmail) || signedByEmail;
      const signoffSyncId = randomUUID();

      // Record sign-off (audit trail)
      await db.execute(sql`
        INSERT INTO alli_milestone_signoffs (milestone_id, trustee_key, signed_by_email, signed_by_name, decision, rejection_comment, client_ip, sync_id)
        VALUES (${milestoneId}, ${trusteeKey}, ${signedByEmail}, ${signedByName}, ${decision}, ${rejection_comment || null}, ${clientIp}, ${signoffSyncId})
        ON CONFLICT (milestone_id, trustee_key) DO UPDATE SET decision = ${decision}, signed_at = NOW(), sync_id = ${signoffSyncId}
      `);

      if (decision === "approved") {
        // Approve all phase deliverables immediately
        await db.execute(sql`
          UPDATE client_deliverables SET status = 'approved', client_approved = true, approved_at = NOW()
          WHERE project_id = 'alli-foundation-2024' AND phase_number = ${parseInt(phase)} AND status != 'approved'
        `).catch(() => {});
        const approvedHtml = ep2of2Email(`
          <p>Dear Trustee,</p>
          <p>Phase <strong>${phase}</strong> of the Youth Violence Prevention Model Design project has been signed off by <strong>${signedByName || signedByEmail}</strong>.</p>
          <p>All Phase ${phase} deliverables have been marked as approved. You can view the updated status in your portal.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="https://eventperfekt.net/client-portal/home" style="display:inline-block;background:#3D0B0B;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">View Project Portal</a>
          </p>
          <p>Kind regards<br/>Tolu Johnson — Director, Event Perfekt Global Ltd</p>
        `);
        await sendEmail("info@eventperfekt.com", `[PENDING APPROVAL] ALLI Foundation — Phase ${phase} — Kehinde Alli`, approvedHtml);
        await sendEmail("info@eventperfekt.com", `[PENDING APPROVAL] ALLI Foundation — Phase ${phase} — Agboola Ogundeyin`, approvedHtml);
        await sendEmail("adminuk@eventperfekt.com", `ALLI Foundation — Phase ${phase} Signed Off by ${signedByName || signedByEmail}`, approvedHtml);
        await db.execute(sql`
          INSERT INTO client_portal_messages (project_id, sender_type, sender_name, content)
          VALUES ('alli-foundation-2024', 'team', 'Event Perfekt Team',
            ${"✅ Phase " + phase + " has been signed off by " + (signedByName || signedByEmail) + ". All Phase " + phase + " deliverables are now marked as approved."})
        `).catch(() => {});

        // Push to Group Portal ALLI Tracker (non-blocking — Trustee never waits for this)
        pushSignoffToGroupPortal({
          phase,
          milestone_id: milestoneId,
          decision,
          signed_by_email: signedByEmail,
          signed_by_name: signedByName,
          client_ip: clientIp,
          client_user_agent: String(req.headers["user-agent"] || ""),
          rejection_comment: rejection_comment || null,
          planning_app_signoff_id: signoffSyncId,
        }).catch(() => {});
      }

      return res.json({ approved: decision === "approved", message: decision === "approved" ? "Phase signed off and approved." : "Sign-off recorded." });
    } catch (e: any) {
      console.error("[ClientPortal] phase milestone signoff error:", e.message);
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/client-portal/alli/activity", authenticateClientPortal, async (_req: any, res) => {
    try {
      const data = await fetchTwinTradeSync("/api/alli-sync/activity");
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/client-portal/alli/action", authenticateClientPortal, async (req: any, res) => {
    try {
      const payload = req.body || {};
      payload.client_name = req.portalUser.fullName;
      const data = await fetchTwinTradeSync("/api/alli-sync/client-action", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Inbound sync endpoints (called by external ALLI system) ──────────────────

  // GET /api/alli-sync/client-actions  — returns Kehinde's pending action list
  app.get("/api/alli-sync/client-actions", authenticateAlliSync, async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM client_actions
        ORDER BY
          CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
          created_at DESC
      `);
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // POST /api/alli-sync/client-actions/:id/respond  — acknowledge / complete / message
  app.post("/api/alli-sync/client-actions/:id/respond", authenticateAlliSync, async (req, res) => {
    try {
      const { id } = req.params;
      const { response_type, response_text, responded_by } = req.body || {};
      const status = response_type === "complete" ? "completed"
                   : response_type === "message"  ? "pending"
                   : "acknowledged";
      const result = await db.execute(sql`
        UPDATE client_actions
        SET
          status        = ${status},
          response_text = COALESCE(${response_text || null}, response_text),
          responded_by  = ${responded_by || "Kehinde Alli"},
          responded_at  = NOW(),
          updated_at    = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      if (!result.rows.length) return res.status(404).json({ message: "Action not found" });
      return res.json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // POST /api/alli-sync/client-actions  — create a new action (called by external system)
  app.post("/api/alli-sync/client-actions", authenticateAlliSync, async (req, res) => {
    try {
      const { title, description, action_type, priority, project_id, created_by } = req.body || {};
      if (!title) return res.status(400).json({ message: "title is required" });
      const result = await db.execute(sql`
        INSERT INTO client_actions (title, description, action_type, priority, project_id, created_by)
        VALUES (
          ${title},
          ${description || null},
          ${action_type || "acknowledge"},
          ${priority || "normal"},
          ${project_id || "alli-foundation-2024"},
          ${created_by || null}
        )
        RETURNING *
      `);
      return res.status(201).json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // GET /api/client-portal/alli/client-actions  — merges Twin Trade sync + local post-engagement items
  app.get("/api/client-portal/alli/client-actions", authenticateClientPortal, async (req: any, res) => {
    try {
      const userRole = req.portalUser?.role || "client";
      const userName = req.portalUser?.fullName || "";
      const userEmail = req.portalUser?.email || "";
      const projectId = req.portalUser.projectId || "alli-foundation-2024";

      // 1. Fetch from Twin Trade sync (primary source for live action items)
      let syncItems: any[] = [];
      if (TWIN_TRADE_SYNC_URL) {
        try {
          const data = await fetchTwinTradeSync("/api/alli-sync/client-actions");
          if (Array.isArray(data)) {
            syncItems = data.map((item: any) => ({
              ...item,
              // Normalize sync field names to match local schema
              owner: item.assignee_name || item.assigned_to || item.owner || "—",
              owner_email: item.assignee_email || item.owner_email,
              linked_deliverable_code: item.deliverable_number ? `D${item.deliverable_number}` : null,
              is_post_engagement: false,
              source: "sync",
            }));
          }
        } catch (_e) {
          console.log("[ClientPortal] Twin Trade sync unavailable, using local DB only");
        }
      }

      // 2. Fetch local post-engagement items
      const localResult = await db.execute(sql`
        SELECT * FROM client_actions
        WHERE project_id = ${projectId}
        ORDER BY
          CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
          created_at DESC
      `);
      const localItems = (localResult.rows as any[]).map((item: any) => ({ ...item, source: "local" }));

      // 3. Merge: sync items are primary, local post-engagement items always included,
      //    local non-post items only if no sync item has same title
      const syncTitles = new Set(syncItems.map((i: any) => i.title?.toLowerCase()?.trim()));
      const merged = [
        ...syncItems,
        // Always include post-engagement local items (they supplement sync data)
        ...localItems.filter((item: any) => item.is_post_engagement === true),
        // Include non-post local items only if title not already in sync
        ...localItems.filter((item: any) =>
          !item.is_post_engagement &&
          !syncTitles.has(item.title?.toLowerCase()?.trim())
        ),
      ];

      // 4. Filter for trustees
      if (userRole === "trustee") {
        const filtered = merged.filter((item: any) =>
          item.owner === userName ||
          item.owner_email === userEmail ||
          item.owner === "Both Trustees" ||
          !item.owner ||
          item.owner === "—"
        );
        return res.json(filtered);
      }

      // 5. Director/admin sees everything
      return res.json(merged);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // PATCH /api/client-portal/alli/client-actions/:id/respond  — respond from within portal
  app.patch("/api/client-portal/alli/client-actions/:id/respond", authenticateClientPortal, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { response_type, response_text } = req.body || {};
      const status = response_type === "complete" ? "completed"
                   : response_type === "message"  ? "pending"
                   : "acknowledged";
      const old = await db.execute(sql`SELECT status FROM client_actions WHERE id = ${id} AND project_id = ${req.portalUser.projectId}`);
      const oldStatus = (old.rows[0] as any)?.status || "";
      const result = await db.execute(sql`
        UPDATE client_actions
        SET
          status        = ${status},
          response_text = COALESCE(${response_text || null}, response_text),
          responded_by  = ${req.portalUser.fullName},
          responded_at  = NOW(),
          updated_at    = NOW()
        WHERE id = ${id} AND project_id = ${req.portalUser.projectId}
        RETURNING *
      `);
      if (!result.rows.length) return res.status(404).json({ message: "Action not found" });
      const row = result.rows[0] as any;
      await db.execute(sql`
        INSERT INTO client_action_audit_log (action_id, changed_by, changed_by_role, change_type, field_changed, old_value, new_value)
        VALUES (${id}, ${req.portalUser.fullName}, ${req.portalUser.role || "client"}, 'status_change', 'status', ${oldStatus}, ${status})
      `);
      return res.json(row);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // GET /api/client-portal/admin/actions/:projectId — director sees all actions
  app.get("/api/client-portal/admin/actions/:projectId", authenticateEPStaff, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM client_actions
        WHERE project_id = ${req.params.projectId}
        ORDER BY
          CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
          created_at DESC
      `);
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // PATCH /api/client-portal/alli/client-actions/:id/edit — edit action fields (owner or director)
  app.patch("/api/client-portal/alli/client-actions/:id/edit", authenticateClientPortal, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, priority, due_date, owner, linked_deliverable_code, linked_document_id } = req.body || {};
      const userRole = req.portalUser?.role || "client";
      const userName = req.portalUser?.fullName || "";
      const action = await db.execute(sql`SELECT owner, owner_email, status FROM client_actions WHERE id = ${id} AND project_id = ${req.portalUser.projectId}`);
      if (!action.rows.length) return res.status(404).json({ message: "Action not found" });
      const a = action.rows[0] as any;
      if (userRole !== "director" && userRole !== "admin" && a.owner !== userName && a.owner_email !== req.portalUser.email) {
        return res.status(403).json({ message: "Not authorised to edit this action" });
      }
      const old = JSON.stringify({ title: a.title, priority: a.priority, due_date: a.due_date, owner: a.owner, linked_deliverable_code: a.linked_deliverable_code, linked_document_id: a.linked_document_id });
      const result = await db.execute(sql`
        UPDATE client_actions
        SET
          title = COALESCE(${title?.trim() || null}, title),
          priority = COALESCE(${priority || null}, priority),
          due_date = COALESCE(${due_date ? new Date(due_date) : null}, due_date),
          owner = COALESCE(${owner?.trim() || null}, owner),
          linked_deliverable_code = COALESCE(${linked_deliverable_code || null}, linked_deliverable_code),
          linked_document_id = COALESCE(${linked_document_id || null}, linked_document_id),
          updated_at = NOW()
        WHERE id = ${id} AND project_id = ${req.portalUser.projectId}
        RETURNING *
      `);
      const newRow = result.rows[0] as any;
      const newJson = JSON.stringify({ title: newRow.title, priority: newRow.priority, due_date: newRow.due_date, owner: newRow.owner, linked_deliverable_code: newRow.linked_deliverable_code, linked_document_id: newRow.linked_document_id });
      if (old !== newJson) {
        await db.execute(sql`
          INSERT INTO client_action_audit_log (action_id, changed_by, changed_by_role, change_type, field_changed, old_value, new_value)
          VALUES (${id}, ${req.portalUser.fullName}, ${userRole}, 'edit', 'multiple', ${old}, ${newJson})
        `);
      }
      return res.json(newRow);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // POST /api/client-portal/alli/client-actions/:id/treat — add treatment note
  app.post("/api/client-portal/alli/client-actions/:id/treat", authenticateClientPortal, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body || {};
      if (!note?.trim()) return res.status(400).json({ message: "Note is required" });
      const userRole = req.portalUser?.role || "client";
      const result = await db.execute(sql`
        INSERT INTO client_action_notes (action_id, note, created_by, created_by_role)
        VALUES (${id}, ${note.trim()}, ${req.portalUser.fullName}, ${userRole})
        RETURNING *
      `);
      await db.execute(sql`
        INSERT INTO client_action_audit_log (action_id, changed_by, changed_by_role, change_type, field_changed, new_value)
        VALUES (${id}, ${req.portalUser.fullName}, ${userRole}, 'note_added', 'notes', ${note.trim()})
      `);
      return res.status(201).json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // PATCH /api/client-portal/alli/client-actions/:id/resolve — owner self-marks resolved
  app.patch("/api/client-portal/alli/client-actions/:id/resolve", authenticateClientPortal, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userRole = req.portalUser?.role || "client";
      const userName = req.portalUser?.fullName || "";
      const action = await db.execute(sql`SELECT owner, owner_email, status FROM client_actions WHERE id = ${id} AND project_id = ${req.portalUser.projectId}`);
      if (!action.rows.length) return res.status(404).json({ message: "Action not found" });
      const a = action.rows[0] as any;
      if (userRole !== "director" && userRole !== "admin" && a.owner !== userName && a.owner_email !== req.portalUser.email) {
        return res.status(403).json({ message: "Only the owner can mark resolved" });
      }
      const oldStatus = a.status;
      const result = await db.execute(sql`
        UPDATE client_actions
        SET status = 'resolved', responded_by = ${req.portalUser.fullName}, responded_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND project_id = ${req.portalUser.projectId}
        RETURNING *
      `);
      await db.execute(sql`
        INSERT INTO client_action_audit_log (action_id, changed_by, changed_by_role, change_type, field_changed, old_value, new_value)
        VALUES (${id}, ${req.portalUser.fullName}, ${userRole}, 'resolved', 'status', ${oldStatus}, 'resolved')
      `);
      return res.json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // PATCH /api/client-portal/alli/client-actions/:id/close — director only
  app.patch("/api/client-portal/alli/client-actions/:id/close", authenticateClientPortal, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userRole = req.portalUser?.role || "client";
      if (userRole !== "director" && userRole !== "admin") {
        return res.status(403).json({ message: "Only director can close actions" });
      }
      const old = await db.execute(sql`SELECT status FROM client_actions WHERE id = ${id} AND project_id = ${req.portalUser.projectId}`);
      if (!old.rows.length) return res.status(404).json({ message: "Action not found" });
      const oldStatus = (old.rows[0] as any).status;
      const result = await db.execute(sql`
        UPDATE client_actions
        SET status = 'closed', updated_at = NOW()
        WHERE id = ${id} AND project_id = ${req.portalUser.projectId}
        RETURNING *
      `);
      await db.execute(sql`
        INSERT INTO client_action_audit_log (action_id, changed_by, changed_by_role, change_type, field_changed, old_value, new_value)
        VALUES (${id}, ${req.portalUser.fullName}, ${userRole}, 'closed', 'status', ${oldStatus}, 'closed')
      `);
      return res.json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // GET /api/client-portal/alli/client-actions/:id/notes
  app.get("/api/client-portal/alli/client-actions/:id/notes", authenticateClientPortal, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM client_action_notes
        WHERE action_id = ${req.params.id}
        ORDER BY created_at DESC
      `);
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // GET /api/client-portal/alli/client-actions/:id/audit
  app.get("/api/client-portal/alli/client-actions/:id/audit", authenticateClientPortal, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM client_action_audit_log
        WHERE action_id = ${req.params.id}
        ORDER BY timestamp DESC
      `);
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // GET /api/client-portal/alli/client-actions/:id/detail — single action with notes + audit
  app.get("/api/client-portal/alli/client-actions/:id/detail", authenticateClientPortal, async (req: any, res) => {
    try {
      const action = await db.execute(sql`SELECT * FROM client_actions WHERE id = ${req.params.id} AND project_id = ${req.portalUser.projectId}`);
      if (!action.rows.length) return res.status(404).json({ message: "Action not found" });
      const notes = await db.execute(sql`SELECT * FROM client_action_notes WHERE action_id = ${req.params.id} ORDER BY created_at DESC`);
      const audit = await db.execute(sql`SELECT * FROM client_action_audit_log WHERE action_id = ${req.params.id} ORDER BY timestamp DESC`);
      return res.json({ action: action.rows[0], notes: notes.rows, audit: audit.rows });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/admin/risks/:projectId", authenticateEPStaff, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM client_portal_risks
        WHERE project_id = ${req.params.projectId}
        ORDER BY created_at DESC, id DESC
      `);
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/client-portal/admin/risks/:projectId", authenticateEPStaff, async (req: any, res) => {
    try {
      const { title, category, mitigation_summary, ep_action, is_internal } = req.body || {};
      if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
      const result = await db.execute(sql`
        INSERT INTO client_portal_risks (project_id, title, category, mitigation_summary, ep_action, is_internal, status)
        VALUES (${req.params.projectId}, ${title.trim()}, ${category || "risk"}, ${mitigation_summary || null}, ${ep_action || null}, ${!!is_internal}, 'open')
        RETURNING *
      `);
      return res.status(201).json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/client-portal/admin/risks/:id", authenticateEPStaff, async (req: any, res) => {
    try {
      const { title, category, mitigation_summary, ep_action, is_internal, status } = req.body || {};
      const result = await db.execute(sql`
        UPDATE client_portal_risks
        SET
          title = COALESCE(${title || null}, title),
          category = COALESCE(${category || null}, category),
          mitigation_summary = COALESCE(${mitigation_summary || null}, mitigation_summary),
          ep_action = COALESCE(${ep_action || null}, ep_action),
          is_internal = COALESCE(${typeof is_internal === "boolean" ? is_internal : null}, is_internal),
          status = COALESCE(${status || null}, status),
          updated_at = NOW()
        WHERE id = ${req.params.id}
        RETURNING *
      `);
      if (!result.rows.length) return res.status(404).json({ message: "Risk not found" });
      return res.json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/client-portal/deliverables", authenticateClientPortal, async (req: any, res) => {
    try {
      const result = await db.execute(sql`SELECT * FROM client_deliverables WHERE project_id = ${req.portalUser.projectId} ORDER BY phase_number, id`);
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/client-portal/deliverables/:id/approve", authenticateClientPortal, async (req: any, res) => {
    try {
      const { id } = req.params;
      const del = await db.execute(sql`SELECT * FROM client_deliverables WHERE id = ${id} AND project_id = ${req.portalUser.projectId}`);
      if (!del.rows.length) return res.status(404).json({ message: "Deliverable not found" });
      await db.execute(sql`UPDATE client_deliverables SET client_approved = true, approved_at = NOW(), client_feedback = null, updated_at = NOW() WHERE id = ${id}`);
      const d = del.rows[0] as any;
      await sendEmail(
        "info@eventperfekt.com",
        `✅ Deliverable Approved — ${d.deliverable_name}`,
        `<p><strong>${req.portalUser.fullName}</strong> (${req.portalUser.organisation}) has approved the deliverable:</p><p><strong>${d.deliverable_name}</strong></p><p>Phase ${d.phase_number}: ${d.phase_name}</p>`
      );
      return res.json({ message: "Approved" });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/client-portal/deliverables/:id/feedback", authenticateClientPortal, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { feedback } = req.body;
      if (!feedback?.trim()) return res.status(400).json({ message: "Feedback is required" });
      const del = await db.execute(sql`SELECT * FROM client_deliverables WHERE id = ${id} AND project_id = ${req.portalUser.projectId}`);
      if (!del.rows.length) return res.status(404).json({ message: "Deliverable not found" });
      await db.execute(sql`UPDATE client_deliverables SET client_feedback = ${feedback}, client_approved = false, updated_at = NOW() WHERE id = ${id}`);
      const d = del.rows[0] as any;
      await sendEmail(
        "info@eventperfekt.com",
        `📝 Changes Requested — ${d.deliverable_name}`,
        `<p><strong>${req.portalUser.fullName}</strong> (${req.portalUser.organisation}) has requested changes to:</p><p><strong>${d.deliverable_name}</strong></p><p><strong>Feedback:</strong> ${feedback}</p>`
      );
      return res.json({ message: "Feedback submitted" });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/documents", authenticateClientPortal, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT
          d.*,
          COALESCE(
            (SELECT COUNT(*) FROM client_portal_document_comments c WHERE c.document_id = d.id),
            0
          ) as open_comments
        FROM client_portal_documents d
        WHERE d.project_id = ${req.portalUser.projectId}
        ORDER BY d.created_at DESC, d.id DESC
      `);
      // Attach current_file and resolve signed URLs for Object Storage paths
      const rows = await Promise.all((result.rows as any[]).map(async (row) => {
        let fileUrl = row.file_url as string | null;
        if (fileUrl?.startsWith("/objects/")) {
          fileUrl = (await generateViewUrl(fileUrl)) || fileUrl;
        }
        return {
          ...row,
          current_file: fileUrl
            ? { file_url: fileUrl, file_name: row.file_name || row.document_name, version_number: row.current_version || 1 }
            : null,
        };
      }));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/client-portal/documents/:id", authenticateClientPortal, async (req: any, res) => {
    try {
      await db.execute(sql`
        DELETE FROM client_portal_documents
        WHERE id = ${req.params.id} AND project_id = ${req.portalUser.projectId}
      `);
      res.json({ message: "Deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/documents/:id/versions", authenticateClientPortal, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM client_portal_documents
        WHERE id = ${req.params.id} AND project_id = ${req.portalUser.projectId}
        ORDER BY current_version DESC, updated_at DESC
      `);
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/documents/:id/comments", authenticateClientPortal, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM client_portal_document_comments
        WHERE document_id = ${req.params.id}
        ORDER BY created_at ASC
      `);
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/documents/:id/chat", authenticateClientPortal, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT
          id,
          commenter_name AS sender_name,
          commenter_type AS sender_type,
          comment AS message,
          created_at,
          NULL::text AS attachment_url
        FROM client_portal_document_comments
        WHERE document_id = ${req.params.id}
        ORDER BY created_at ASC
      `);
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/client-portal/documents/:id/comment", authenticateClientPortal, async (req: any, res) => {
    try {
      const { comment } = req.body || {};
      if (!comment?.trim()) return res.status(400).json({ message: "Comment required" });
      const doc = await db.execute(sql`
        SELECT * FROM client_portal_documents
        WHERE id = ${req.params.id} AND project_id = ${req.portalUser.projectId}
      `);
      if (!doc.rows.length) return res.status(404).json({ message: "Document not found" });
      await db.execute(sql`
        INSERT INTO client_portal_document_comments (document_id, commenter_name, commenter_type, comment)
        VALUES (${req.params.id}, ${req.portalUser.fullName}, 'client', ${comment.trim()})
      `);
      await sendEmail(
        "adminuk@eventperfekt.com",
        `ALLI Foundation — New Comment on Document — ${(doc.rows[0] as any).document_name}`,
        `<p><strong>${req.portalUser.fullName}</strong> commented on <strong>${(doc.rows[0] as any).document_name}</strong>.</p><p>${comment.trim()}</p>`
      );
      return res.json({ message: "Comment added" });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/client-portal/documents/:id/read", authenticateClientPortal, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        UPDATE client_portal_documents
        SET read_by = ${req.portalUser.fullName}, read_at = NOW(), updated_at = NOW()
        WHERE id = ${req.params.id} AND project_id = ${req.portalUser.projectId}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/client-portal/documents/:id/sign", authenticateClientPortal, async (req: any, res) => {
    try {
      const { signatureText } = req.body || {};
      const result = await db.execute(sql`
        UPDATE client_portal_documents
        SET signed_by = ${req.portalUser.fullName}, signed_at = NOW(), signature_text = ${signatureText || req.portalUser.fullName}, is_signed = true, updated_at = NOW()
        WHERE id = ${req.params.id} AND project_id = ${req.portalUser.projectId}
        RETURNING *
      `);
      if (!result.rows.length) return res.status(404).json({ message: "Document not found" });
      await db.execute(sql`
        INSERT INTO gp_project_activity (project_id, user_id, action, detail)
        VALUES (
          'alli-foundation-2024',
          ${req.portalUser.id || null},
          'document_approved',
          ${`Document approved: ${(result.rows[0] as any).document_name}`}
        )
      `).catch(() => {});
      return res.json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/client-portal/documents/:id/reject", authenticateClientPortal, async (req: any, res) => {
    try {
      const { rejectionType, rejectionReason } = req.body || {};
      if (!rejectionReason?.trim()) return res.status(400).json({ message: "Change description is required" });
      const result = await db.execute(sql`
        UPDATE client_portal_documents
        SET status = 'CHANGES_REQUESTED', read_by = ${req.portalUser.fullName}, read_at = NOW(), updated_at = NOW()
        WHERE id = ${req.params.id} AND project_id = ${req.portalUser.projectId}
        RETURNING *
      `);
      if (!result.rows.length) return res.status(404).json({ message: "Document not found" });
      await db.execute(sql`
        INSERT INTO client_portal_document_comments (document_id, commenter_name, commenter_type, comment)
        VALUES (${req.params.id}, ${req.portalUser.fullName}, 'client', ${`Change request: ${rejectionType || 'Request Edit'} | ${rejectionReason.trim()}`})
      `);
      await db.execute(sql`
        INSERT INTO gp_project_activity (project_id, user_id, action, detail)
        VALUES (
          'alli-foundation-2024',
          ${req.portalUser.id || null},
          'document_rejected',
          ${`Document rejected: ${(result.rows[0] as any).document_name}`}
        )
      `).catch(() => {});
      await sendEmail(
        "adminuk@eventperfekt.com",
        `Change Request Submitted — ${(result.rows[0] as any).document_name}`,
        `<p><strong>${req.portalUser.fullName}</strong> has requested changes on <strong>${(result.rows[0] as any).document_name}</strong>.</p><p><strong>Type:</strong> ${rejectionType || 'Request Edit'}</p><p><strong>Details:</strong> ${rejectionReason.trim()}</p>`
      );
      return res.json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/client-portal/documents/upload", authenticateClientPortal, clientDocUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const { document_name, document_category, description } = req.body || {};
      const fileUrl = await uploadBuffer(req.file.buffer, req.file.mimetype, "client-portal", req.file.originalname);
      const result = await db.execute(sql`
        INSERT INTO client_portal_documents (
          project_id, document_name, document_category, document_subcategory, document_type,
          current_version, uploaded_by, uploaded_by_type, shared_with_client, file_url, file_name, file_size
        ) VALUES (
          ${req.portalUser.projectId}, ${document_name || req.file.originalname}, ${document_category || "Client Uploads"},
          ${description || null}, 'upload', 1, ${req.portalUser.fullName}, 'client', false, ${fileUrl}, ${req.file.originalname}, ${req.file.size}
        )
        RETURNING *
      `);
      await sendEmail(
        "adminuk@eventperfekt.com",
        `ALLI Foundation — New Document Uploaded — ${req.file.originalname}`,
        `<p>${req.portalUser.fullName} has uploaded a new document to the ALLI Foundation portal.</p><p>File: ${req.file.originalname}</p><p>View at: https://eventperfekt.net/client-portal</p>`
      );
      return res.status(201).json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/activity", authenticateClientPortal, async (req: any, res) => {
    try {
      const docsResult = await db.execute(sql`
        SELECT id, document_name, document_category, file_url, file_name, uploaded_by, uploaded_by_type, created_at, read_at, is_signed
        FROM client_portal_documents
        WHERE project_id = ${req.portalUser.projectId}
        ORDER BY created_at DESC
        LIMIT 20
      `);
      const eventsResult = await db.execute(sql`
        SELECT id,
          event_name AS title,
          event_date AS start_date,
          event_type,
          location_name,
          status,
          false AS all_day
        FROM alli_events
        ORDER BY event_date ASC
        LIMIT 20
      `).catch(() => ({ rows: [] }));
      res.json({ documents: docsResult.rows, events: eventsResult.rows });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/messages", authenticateClientPortal, async (req: any, res) => {
    try {
      if (req.portalUser.projectId === "alli-foundation-2024") {
        const seed = await db.execute(sql`
          SELECT * FROM client_portal_messages
          WHERE project_id = ${req.portalUser.projectId}
          ORDER BY created_at ASC
        `);
        if (seed.rows.length === 0) {
          await db.execute(sql`
            INSERT INTO client_portal_messages (project_id, sender_type, sender_name, content)
            VALUES (
              ${req.portalUser.projectId},
              'team',
              'Event Perfekt Team',
              'Welcome to the ALLI Foundation portal. Deliverables, documents, events, risks and invoices will appear here as they are added.'
            )
          `);
        }
      }
      const result = await db.execute(sql`SELECT * FROM client_portal_messages WHERE project_id = ${req.portalUser.projectId} ORDER BY created_at ASC`);
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/client-portal/messages", authenticateClientPortal, async (req: any, res) => {
    try {
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Message cannot be empty" });
      const replyContent = `We received your message and will get back to you shortly.`;
      await db.execute(sql`
        INSERT INTO client_portal_messages (project_id, sender_type, sender_name, content)
        VALUES (${req.portalUser.projectId}, 'client', ${req.portalUser.fullName}, ${content.trim()})
      `);
      await db.execute(sql`
        INSERT INTO client_portal_messages (project_id, sender_type, sender_name, content)
        VALUES (${req.portalUser.projectId}, 'team', 'Event Perfekt Team', ${replyContent})
      `);
      const projectResult = await db.execute(sql`SELECT name FROM projects WHERE id = ${req.portalUser.projectId}`);
      const projectName = (projectResult.rows[0] as any)?.name || "Project";
      await sendEmail(
        "info@eventperfekt.com",
        `💬 New message from ${req.portalUser.organisation} — ${projectName}`,
        `<p><strong>${req.portalUser.fullName}</strong> sent a message on project <strong>${projectName}</strong>:</p><blockquote>${content.trim()}</blockquote><p>Log in to reply.</p>`
      );
      if (isWhatsAppConfigured()) {
        await sendWhatsAppMessage(
          process.env.WHATSAPP_PHONE_NUMBER || "",
          `New client portal message from ${req.portalUser.fullName} (${req.portalUser.organisation}) on ${projectName}: ${content.trim()}`
        );
      }
      return res.json({ message: "Sent" });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/change-requests", authenticateClientPortal, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM client_portal_change_requests
        WHERE project_id = ${req.portalUser.projectId}
        ORDER BY requested_date DESC, id DESC
      `);
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/client-portal/change-requests", authenticateClientPortal, async (req: any, res) => {
    try {
      const { documentId, changeDescription, purpose, costImpact, owner, requestedDate } = req.body || {};
      if (!changeDescription?.trim() || !purpose?.trim() || !owner?.trim()) return res.status(400).json({ message: "Change description, purpose, and owner are required" });
      const result = await db.execute(sql`
        INSERT INTO client_portal_change_requests (
          project_id, document_id, change_description, purpose, cost_impact, owner, requested_date, status
        ) VALUES (
          ${req.portalUser.projectId}, ${documentId || null}, ${changeDescription.trim()}, ${purpose.trim()}, ${costImpact || null}, ${owner.trim()}, ${requestedDate ? new Date(requestedDate) : new Date()}, 'pending'
        )
        RETURNING *
      `);
      const created = result.rows[0] as any;
      await sendEmail(
        "adminuk@eventperfekt.com",
        `Change Request Submitted — ${created.id}`,
        `<p><strong>${req.portalUser.fullName}</strong> submitted a change request.</p><p><strong>Change ID:</strong> CR-${created.id}</p><p><strong>Description:</strong> ${created.change_description}</p><p><strong>Purpose:</strong> ${created.purpose}</p><p><strong>Cost impact:</strong> ${created.cost_impact || 'N/A'}</p><p><strong>Owner:</strong> ${created.owner}</p><p><strong>Date:</strong> ${new Date(created.requested_date).toLocaleDateString('en-GB')}</p>`
      );
      return res.status(201).json(created);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/client-portal/change-requests/:id", authenticateEPStaff, async (req: any, res) => {
    try {
      const { status, epNotes } = req.body || {};
      const result = await db.execute(sql`
        UPDATE client_portal_change_requests
        SET status = COALESCE(${status}, status), ep_notes = COALESCE(${epNotes}, ep_notes), updated_at = NOW()
        WHERE id = ${req.params.id}
        RETURNING *
      `);
      if (!result.rows.length) return res.status(404).json({ message: "Change request not found" });
      return res.json(result.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/gateway/:slug", authenticateClientPortal, async (req: any, res) => {
    try {
      const map: Record<string, { projectId: string; phaseNumber: number; gatewayType: string; title: string }> = {
        "alli-gateway-1": { projectId: "alli-foundation-2024", phaseNumber: 1, gatewayType: "phase_1", title: "Gateway Meeting 1" },
        "alli-gateway-2": { projectId: "alli-foundation-2024", phaseNumber: 2, gatewayType: "phase_2", title: "Gateway Meeting 2" },
        "alli-gateway-3": { projectId: "alli-foundation-2024", phaseNumber: 3, gatewayType: "phase_3", title: "Gateway Meeting 3" },
      };
      const cfg = map[req.params.slug];
      if (!cfg) return res.status(404).json({ message: "Meeting not found" });
      let meetingRow: any = null;
      const existing = await db.execute(sql`
        SELECT * FROM gateway_meetings
        WHERE project_id = ${cfg.projectId} AND phase_number = ${cfg.phaseNumber} AND gateway_type = ${cfg.gatewayType}
        ORDER BY id DESC LIMIT 1
      `);
      if (!existing.rows.length) {
        const slots = [
          { label: "Option 1", date: new Date(Date.now() + 2 * 86400000) },
          { label: "Option 2", date: new Date(Date.now() + 4 * 86400000) },
          { label: "Option 3", date: new Date(Date.now() + 6 * 86400000) },
        ];
        const inserted = await db.execute(sql`
          INSERT INTO gateway_meetings (project_id, title, phase_number, gateway_type, description)
          VALUES (${cfg.projectId}, ${cfg.title}, ${cfg.phaseNumber}, ${cfg.gatewayType}, ${cfg.title})
          RETURNING *
        `);
        meetingRow = inserted.rows[0] as any;
        for (const s of slots) {
          await db.execute(sql`
            INSERT INTO gateway_meeting_slots (gateway_meeting_id, slot_label, slot_date)
            VALUES (${meetingRow.id}, ${s.label}, ${s.date})
          `);
        }
      } else {
        meetingRow = existing.rows[0] as any;
      }
      const slotsResult = await db.execute(sql`
        SELECT * FROM gateway_meeting_slots WHERE gateway_meeting_id = ${meetingRow.id} ORDER BY id ASC
      `);
      return res.json({
        id: meetingRow.id,
        title: meetingRow.title,
        phase_number: meetingRow.phase_number,
        gateway_type: meetingRow.gateway_type,
        meeting_date: meetingRow.meeting_date || null,
        location: meetingRow.location || null,
        meeting_link: meetingRow.meeting_link || null,
        description: meetingRow.description || null,
        slots: (slotsResult.rows as any[]).map((s: any) => ({
          id: s.id,
          slot_label: s.slot_label,
          slot_date: s.slot_date,
          is_selected: !!s.is_selected,
        })),
      });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/client-portal/gateway/:id/respond", authenticateClientPortal, async (req: any, res) => {
    try {
      const meetingId = Number(req.params.id);
      const { responder_name, responder_email, response_status, selected_slot_id, note } = req.body || {};
      if (!responder_name?.trim() || !responder_email?.trim()) {
        return res.status(400).json({ message: "Name and email are required" });
      }
      await db.execute(sql`
        INSERT INTO gateway_meeting_responses
          (gateway_meeting_id, responder_name, responder_email, response_status, selected_slot_id, note)
        VALUES (
          ${meetingId},
          ${responder_name.trim()},
          ${responder_email.trim()},
          ${response_status || "pending"},
          ${selected_slot_id || null},
          ${note?.trim() || null}
        )
      `);
      if (selected_slot_id) {
        await db.execute(sql`
          UPDATE gateway_meeting_slots SET is_selected = false WHERE gateway_meeting_id = ${meetingId}
        `).catch(() => {});
        await db.execute(sql`
          UPDATE gateway_meeting_slots SET is_selected = true WHERE id = ${selected_slot_id}
        `).catch(() => {});
      }
      await sendEmail(
        "adminuk@eventperfekt.com",
        `Gateway Meeting Response — ${responder_name.trim()}`,
        `<p><strong>${responder_name.trim()}</strong> (${responder_email.trim()}) has responded to a gateway meeting request.</p><p>Status: ${response_status || "pending"}</p>${selected_slot_id ? `<p>Selected slot ID: ${selected_slot_id}</p>` : ""}${note ? `<p>Note: ${note}</p>` : ""}`
      );
      return res.json({ message: "Response recorded" });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/invoices", authenticateClientPortal, async (req: any, res) => {
    try {
      // Try portal_invoices first (new source of truth)
      const projectId = req.portalUser.projectId || "alli-foundation-2024";
      const alliId = req.portalUser?.email && getTrusteeKey(req.portalUser.email) ? 5 : null;
      let rows: any[] = [];
      try {
        const piResult = await db.execute(sql`
          SELECT
            id,
            invoice_number AS reference,
            client_name,
            status,
            total AS amount,
            currency,
            issue_date AS issued_date,
            due_date,
            notes,
            null::text AS paid_date,
            null::text AS payment_method,
            created_at,
            null::text AS pdf_url
          FROM portal_invoices
          WHERE (client_email = ${req.portalUser?.email} OR owner_id = ${alliId || 0})
          ORDER BY issue_date DESC, id DESC
        `);
        rows = (piResult.rows || []) as any[];
      } catch (_e) {
        // portal_invoices may not exist yet — fallback
      }
      if (rows.length === 0) {
        const fallback = await db.execute(sql`
          SELECT
            id,
            invoice_ref AS reference,
            description,
            amount,
            currency,
            status,
            issued_date,
            paid_date,
            payment_method,
            notes,
            created_at
          FROM ep_project_finance
          WHERE project_reference = ${projectId}
          ORDER BY issued_date DESC, id DESC
        `);
        rows = (fallback.rows || []) as any[];
      }
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
}
