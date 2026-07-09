import { Express } from "express";
import { db, getConnectionString } from "./db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sendMail as _sendMail } from "./emailService";
import { uploadBuffer, generateViewUrl } from "./objectStorage";
import {
  EP_STANDARD_TERMS,
  ensureSignaturesTable,
  generateAndPersistSow,
  reviseAndRegenerateSow,
  renderSowHtml,
  type SowInput,
} from "./ep-sow-service";

export { EP_STANDARD_TERMS };

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "event-perfekt-secret-2024";
const PORTAL_JWT_SECRET = JWT_SECRET + "-client-portal";
const COLLAB_JWT_SECRET = JWT_SECRET + "-collaborator";

// ─── Auth middlewares ─────────────────────────────────────────────────────────
function authenticateEPStaff(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorised" });
  try {
    const payload = jwt.verify(auth.split(" ")[1], JWT_SECRET) as any;
    req.epUser = payload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session" });
  }
}

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

function authenticateCollaborator(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorised" });
  try {
    const payload = jwt.verify(auth.split(" ")[1], COLLAB_JWT_SECRET) as any;
    req.collaborator = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session" });
  }
}

// ─── Upload setup ─────────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

async function syncClientPortalDocument(clientId: number, doc: any, file: any, versionNumber = 1, versionNotes: string | null = null, isNewVersion = false, precomputedFileUrl?: string) {
  const fileUrl = precomputedFileUrl || `/uploads/ep-client/${(file as any).filename || "unknown"}`;
  if (isNewVersion) {
    await db.execute(sql`
      UPDATE client_portal_documents
      SET document_name = ${doc.document_name},
          document_category = ${doc.document_category},
          document_subcategory = ${doc.document_subcategory},
          document_type = ${doc.document_type},
          shared_with_client = ${!!doc.shared_with_client},
          file_url = ${fileUrl},
          file_name = ${file.originalname},
          file_size = ${file.size},
          updated_at = NOW()
      WHERE source_document_id = ${doc.id}
    `).catch(() => {});
  } else {
    await db.execute(sql`
      INSERT INTO client_portal_documents (
        project_id, document_name, document_category, document_subcategory, document_type,
        current_version, uploaded_by, uploaded_by_type, shared_with_client, file_url, file_name, file_size, source_document_id
      ) VALUES (
        ${doc.project_id || "alli-foundation-2024"},
        ${doc.document_name},
        ${doc.document_category || "Client Uploads"},
        ${doc.document_subcategory || null},
        ${doc.document_type || null},
        ${versionNumber},
        ${doc.uploaded_by || "EP Team"},
        'ep_team',
        ${!!doc.shared_with_client},
        ${fileUrl},
        ${file.originalname},
        ${file.size},
        ${doc.id}
      )
      ON CONFLICT (source_document_id) DO UPDATE SET
        document_name = EXCLUDED.document_name,
        document_category = EXCLUDED.document_category,
        document_subcategory = EXCLUDED.document_subcategory,
        document_type = EXCLUDED.document_type,
        current_version = EXCLUDED.current_version,
        uploaded_by = EXCLUDED.uploaded_by,
        uploaded_by_type = EXCLUDED.uploaded_by_type,
        shared_with_client = EXCLUDED.shared_with_client,
        file_url = EXCLUDED.file_url,
        file_name = EXCLUDED.file_name,
        file_size = EXCLUDED.file_size,
        updated_at = NOW()
    `).catch(() => {});
  }
}

// ─── EP Agent AI helper ───────────────────────────────────────────────────────
async function claudeAI(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<string> {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: userPrompt },
      ],
    }),
  });
  const data = await response.json() as any;
  if (data.error) throw new Error(data.error.message || "AI API error");
  return data.choices?.[0]?.message?.content || "";
}

// ─── Email helper ─────────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  try {
    await _sendMail(to, subject, html);
  } catch (e: any) {
    console.error("[EPClient] Email error:", e.message);
  }
}

// ─── Client ID resolution ─────────────────────────────────────────────────────
async function getOrCreateAlliClientId(): Promise<number> {
  const existing = await db.execute(sql`SELECT id FROM ep_clients WHERE organisation_name = 'ALLI Foundation' LIMIT 1`);
  if (existing.rows.length > 0) return (existing.rows[0] as any).id as number;
  const inserted = await db.execute(sql`
    INSERT INTO ep_clients (organisation_name, company_reg_number, country, engagement_type, status, website)
    VALUES ('ALLI Foundation', '1182529', 'United Kingdom', 'Charity Programme Design', 'active', 'https://allifoundation.org')
    RETURNING id
  `);
  return (inserted.rows[0] as any).id as number;
}

async function clientIdForPortalUser(portalUser: any): Promise<number | null> {
  if (!portalUser) return null;
  // Try by organisation name first
  if (portalUser.organisation) {
    const r = await db.execute(sql`SELECT id FROM ep_clients WHERE organisation_name = ${portalUser.organisation} LIMIT 1`);
    if (r.rows.length > 0) return (r.rows[0] as any).id as number;
  }
  // Fallback: ALLI by projectId
  if (portalUser.projectId === "alli-foundation-2024" || portalUser.project_id === "alli-foundation-2024") {
    return await getOrCreateAlliClientId();
  }
  return null;
}

// ─── Ensure tables and seed ───────────────────────────────────────────────────
async function ensureTablesAndSeed() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_client_document_versions (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        document_name VARCHAR(255),
        document_category VARCHAR(100),
        document_subcategory VARCHAR(100),
        document_type VARCHAR(100),
        current_version INTEGER DEFAULT 1,
        uploaded_by VARCHAR(255),
        uploaded_by_type VARCHAR(50),
        shared_with_client BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_client_document_files (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES ep_client_document_versions(id) ON DELETE CASCADE,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        version_number INTEGER DEFAULT 1,
        file_url TEXT,
        file_name VARCHAR(255),
        file_size INTEGER,
        file_type VARCHAR(50),
        version_notes TEXT,
        uploaded_by VARCHAR(255),
        uploaded_by_type VARCHAR(50),
        is_current BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_client_collaborators (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        invited_by VARCHAR(255),
        invited_by_type VARCHAR(50),
        full_name VARCHAR(255),
        email VARCHAR(255),
        organisation VARCHAR(255),
        role VARCHAR(100),
        access_level VARCHAR(50) DEFAULT 'view',
        access_token VARCHAR(100) UNIQUE,
        status VARCHAR(50) DEFAULT 'invited',
        can_upload BOOLEAN DEFAULT false,
        can_comment BOOLEAN DEFAULT true,
        document_access JSONB DEFAULT '[]'::jsonb,
        invited_at TIMESTAMP DEFAULT NOW(),
        accepted_at TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_client_collaborator_sessions (
        id SERIAL PRIMARY KEY,
        collaborator_id INTEGER REFERENCES ep_client_collaborators(id) ON DELETE CASCADE,
        token VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_client_partnership_contracts (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        partner_name VARCHAR(255),
        partner_organisation VARCHAR(255),
        partner_email VARCHAR(255),
        contract_type VARCHAR(100),
        contract_title VARCHAR(255),
        document_url TEXT,
        document_text TEXT,
        brief TEXT,
        drafted_by VARCHAR(50) DEFAULT 'ep_agent',
        status VARCHAR(50) DEFAULT 'draft',
        client_signed BOOLEAN DEFAULT false,
        client_signed_at TIMESTAMP,
        client_signature_data TEXT,
        partner_signed BOOLEAN DEFAULT false,
        partner_signed_at TIMESTAMP,
        partner_signature_data TEXT,
        ep_countersigned BOOLEAN DEFAULT false,
        ep_countersigned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_client_email_log (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        direction VARCHAR(20),
        from_email VARCHAR(255),
        to_email VARCHAR(255),
        to_name VARCHAR(255),
        subject TEXT,
        body TEXT,
        sent_at TIMESTAMP DEFAULT NOW(),
        opened_at TIMESTAMP,
        replied_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'sent',
        category VARCHAR(100),
        related_deliverable VARCHAR(255),
        visible_to_client BOOLEAN DEFAULT true
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_client_calendar_events (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        title VARCHAR(255),
        description TEXT,
        event_type VARCHAR(100),
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        all_day BOOLEAN DEFAULT false,
        location VARCHAR(255),
        video_link TEXT,
        ep_attendees JSONB DEFAULT '[]'::jsonb,
        client_attendees JSONB DEFAULT '[]'::jsonb,
        external_attendees JSONB DEFAULT '[]'::jsonb,
        client_response VARCHAR(50) DEFAULT 'pending',
        client_responded_at TIMESTAMP,
        phase_number INTEGER,
        is_gateway BOOLEAN DEFAULT false,
        gateway_type VARCHAR(100),
        colour VARCHAR(20) DEFAULT 'burgundy',
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gateway_meetings (
        id SERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        phase_number INTEGER NOT NULL,
        gateway_type TEXT NOT NULL,
        meeting_date TIMESTAMP,
        location TEXT,
        meeting_link TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gateway_meeting_slots (
        id SERIAL PRIMARY KEY,
        gateway_meeting_id INTEGER REFERENCES gateway_meetings(id) ON DELETE CASCADE,
        slot_label TEXT NOT NULL,
        slot_date TIMESTAMP NOT NULL,
        is_selected BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gateway_meeting_responses (
        id SERIAL PRIMARY KEY,
        gateway_meeting_id INTEGER REFERENCES gateway_meetings(id) ON DELETE CASCADE,
        responder_name TEXT NOT NULL,
        responder_email TEXT NOT NULL,
        response_status TEXT NOT NULL,
        selected_slot_id INTEGER REFERENCES gateway_meeting_slots(id) ON DELETE SET NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_document_comments (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES ep_client_document_versions(id) ON DELETE CASCADE,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        commenter_email VARCHAR(255),
        commenter_name VARCHAR(255),
        commenter_type VARCHAR(50),
        comment TEXT,
        version_number INTEGER,
        resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // ── Document chat messages (per-document thread) ──────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_doc_chat_messages (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES ep_client_document_versions(id) ON DELETE CASCADE,
        client_id INTEGER REFERENCES ep_clients(id),
        sender_type VARCHAR(50) NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        message TEXT,
        attachment_url TEXT,
        attachment_name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // ── Extend document versions table with workflow columns ──────────────
    await db.execute(sql`ALTER TABLE ep_client_document_versions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'UNREAD'`);
    await db.execute(sql`ALTER TABLE ep_client_document_versions ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT false`);
    await db.execute(sql`ALTER TABLE ep_client_document_versions ADD COLUMN IF NOT EXISTS signed_by VARCHAR(255)`);
    await db.execute(sql`ALTER TABLE ep_client_document_versions ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP`);
    await db.execute(sql`ALTER TABLE ep_client_document_versions ADD COLUMN IF NOT EXISTS signature_text TEXT`);
    await db.execute(sql`ALTER TABLE ep_client_document_versions ADD COLUMN IF NOT EXISTS read_by VARCHAR(255)`);
    await db.execute(sql`ALTER TABLE ep_client_document_versions ADD COLUMN IF NOT EXISTS read_at TIMESTAMP`);
    await db.execute(sql`ALTER TABLE ep_client_document_versions ADD COLUMN IF NOT EXISTS rejection_type VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE ep_client_document_versions ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);

    // ── Intelligence / Research / Progress / Health / Proposals / Videos / Notifications ──
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_intelligence_articles (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        title VARCHAR(500),
        summary TEXT,
        full_content TEXT,
        source_name VARCHAR(255),
        source_url TEXT,
        author VARCHAR(255),
        published_at TIMESTAMP,
        fetched_at TIMESTAMP DEFAULT NOW(),
        category VARCHAR(100),
        tags JSONB DEFAULT '[]'::jsonb,
        relevance_score INTEGER,
        saved_by JSONB DEFAULT '[]'::jsonb,
        is_featured BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_research_sessions (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        project_name VARCHAR(255),
        session_title VARCHAR(255),
        started_by VARCHAR(255),
        started_by_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        messages JSONB DEFAULT '[]'::jsonb,
        research_output TEXT,
        document_generated BOOLEAN DEFAULT false,
        document_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_progress_reports (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        report_week DATE,
        completed_this_week JSONB DEFAULT '[]'::jsonb,
        in_progress JSONB DEFAULT '[]'::jsonb,
        coming_next_week JSONB DEFAULT '[]'::jsonb,
        client_actions_needed JSONB DEFAULT '[]'::jsonb,
        overall_status VARCHAR(50),
        rag_status VARCHAR(20),
        narrative TEXT,
        generated_by VARCHAR(50) DEFAULT 'ep_agent',
        approved_by VARCHAR(255),
        sent_to_client BOOLEAN DEFAULT false,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_client_health_scores (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        score INTEGER,
        last_login TIMESTAMP,
        documents_reviewed INTEGER DEFAULT 0,
        messages_sent INTEGER DEFAULT 0,
        approvals_given INTEGER DEFAULT 0,
        meetings_attended INTEGER DEFAULT 0,
        sentiment VARCHAR(50) DEFAULT 'positive',
        sentiment_trend VARCHAR(50) DEFAULT 'stable',
        flags JSONB DEFAULT '[]'::jsonb,
        calculated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_proposals (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        proposal_title VARCHAR(255),
        proposal_type VARCHAR(100),
        target_funder VARCHAR(255),
        target_amount VARCHAR(100),
        brief TEXT,
        generated_content TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        document_url TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_portal_videos (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        title VARCHAR(255),
        description TEXT,
        video_url TEXT,
        thumbnail_url TEXT,
        video_type VARCHAR(100),
        category VARCHAR(100),
        source VARCHAR(255),
        duration_seconds INTEGER,
        uploaded_by VARCHAR(255),
        uploaded_by_type VARCHAR(50),
        is_featured BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_client_notifications (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        recipient_email VARCHAR(255),
        type VARCHAR(100),
        title VARCHAR(255),
        message TEXT,
        link VARCHAR(500),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_deliverable_dependencies (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        deliverable_id INTEGER,
        depends_on_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ep_meeting_notes (
        id SERIAL PRIMARY KEY,
        calendar_event_id INTEGER REFERENCES ep_client_calendar_events(id) ON DELETE CASCADE,
        client_id INTEGER REFERENCES ep_clients(id) ON DELETE CASCADE,
        raw_notes TEXT,
        generated_summary TEXT,
        action_items JSONB DEFAULT '[]'::jsonb,
        approved_by VARCHAR(255),
        shared_with_client BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed ALLI ep_clients record and initial docs/calendar
    const alliId = await getOrCreateAlliClientId();
    await seedAlliInitialDocuments(alliId);
    await seedAlliCalendar(alliId);
    await seedAlliIntelligence(alliId);
    await seedAlliVideos(alliId);
    console.log(`[EPClient] Tables + seed verified ✓ (ALLI id = ${alliId})`);
  } catch (e: any) {
    console.error("[EPClient] Startup seed error:", e.message);
  }
}

async function seedAlliInitialDocuments(clientId: number) {
  const existing = await db.execute(sql`SELECT COUNT(*) AS cnt FROM ep_client_document_versions WHERE client_id = ${clientId}`);
  if (parseInt((existing.rows[0] as any).cnt, 10) > 0) return;
  const seeds = [
    { name: "Statement of Work — ALLI Foundation — April 2026", cat: "Legal", sub: "Contracts", type: "SOW" },
    { name: "Event Perfekt Terms and Conditions — April 2026", cat: "Legal", sub: "Terms", type: "Terms and Conditions" },
    { name: "Data Processing Agreement — April 2026", cat: "Legal", sub: "GDPR", type: "DPA" },
  ];
  for (const s of seeds) {
    await db.execute(sql`
      INSERT INTO ep_client_document_versions
        (client_id, document_name, document_category, document_subcategory, document_type, current_version, uploaded_by, uploaded_by_type, shared_with_client)
      VALUES (${clientId}, ${s.name}, ${s.cat}, ${s.sub}, ${s.type}, 1, 'info@eventperfekt.com', 'ep_team', true)
    `);
  }
}

async function seedAlliCalendar(clientId: number) {
  const existing = await db.execute(sql`SELECT COUNT(*) AS cnt FROM ep_client_calendar_events WHERE client_id = ${clientId}`);
  if (parseInt((existing.rows[0] as any).cnt, 10) > 0) return;
  const events: Array<{ title: string; type: string; days: number; time?: string; desc: string; epAtt?: string[]; clientAtt?: string[]; gw?: boolean; gwType?: string; phase?: number; colour?: string; allDay?: boolean }> = [
    { title: "Project Kickoff Meeting", type: "meeting", days: 3, time: "10:00", desc: "Introduction to engagement, SOW review, Phase 1 planning, communication protocols, timeline confirmation", epAtt: ["info@eventperfekt.com", "prabhleentak@gmail.com"], clientAtt: ["hello@allifoundation.org"], gw: true, gwType: "kickoff", colour: "burgundy" },
    { title: "Phase 1 Review Meeting", type: "meeting", days: 13, time: "10:00", desc: "Walk through all Phase 1 deliverables together. Discuss Phase 2 plan.", epAtt: ["info@eventperfekt.com", "prabhleentak@gmail.com"], colour: "burgundy" },
    { title: "Phase 1 Completion Gateway — Strategic Definition", type: "gateway", days: 14, desc: "Review and sign-off of all Phase 1 deliverables. Client approval required before Phase 2 begins.", gw: true, gwType: "phase_completion", phase: 1, colour: "gold", allDay: true },
    { title: "Mid-Point Check-In", type: "meeting", days: 21, time: "10:00", desc: "Informal check-in on progress. Raise any issues or questions. Confirm Phase 3 priorities.", epAtt: ["prabhleentak@gmail.com"], colour: "navy" },
    { title: "I Am Her Planning Session", type: "meeting", days: 98, time: "10:00", desc: "ALLI planning session for the I Am Her event on Friday 30 October 2026. Review guest list, co-creator actions, partner outreach, and delivery plan.", epAtt: ["info@eventperfekt.com", "prabhleentak@gmail.com"], clientAtt: ["hello@allifoundation.org"], colour: "burgundy" },
    { title: "Phase 2 Review Meeting", type: "meeting", days: 27, time: "10:00", desc: "Walk through all Phase 2 deliverables. Present operating model. Discuss Phase 3 funding strategy.", epAtt: ["info@eventperfekt.com", "prabhleentak@gmail.com"], colour: "burgundy" },
    { title: "Phase 2 Completion Gateway — Model Design", type: "gateway", days: 28, desc: "Review and sign-off of all Phase 2 deliverables. Client approval required before Phase 3 begins.", gw: true, gwType: "phase_completion", phase: 2, colour: "gold", allDay: true },
    { title: "Final Presentation and Handover", type: "meeting", days: 41, time: "10:00", desc: "Present all deliverables. Walk through the funded operating model. Handover all documentation. Discuss next steps and ongoing support options.", epAtt: ["info@eventperfekt.com", "prabhleentak@gmail.com"], colour: "burgundy" },
    { title: "Phase 3 Completion Gateway — Funding and Commercialisation", type: "gateway", days: 42, desc: "Final deliverable review and sign-off. Balance invoice triggered on completion.", gw: true, gwType: "phase_completion", phase: 3, colour: "gold", allDay: true },
    { title: "Balance Invoice Due", type: "payment_reminder", days: 42, desc: "Balance of engagement fee due on Phase 3 completion.", colour: "green", allDay: true },
  ];
  for (const e of events) {
    const startSql = e.time
      ? `(DATE_TRUNC('day', NOW() + INTERVAL '${e.days} days') + TIME '${e.time}:00')`
      : `(NOW() + INTERVAL '${e.days} days')`;
    await db.execute(sql`
      INSERT INTO ep_client_calendar_events
        (client_id, title, description, event_type, start_date, all_day, ep_attendees, client_attendees, is_gateway, gateway_type, phase_number, colour, created_by)
      VALUES (
        ${clientId}, ${e.title}, ${e.desc}, ${e.type},
        ${sql.raw(startSql)},
        ${e.allDay || false},
        ${JSON.stringify(e.epAtt || [])}::jsonb,
        ${JSON.stringify(e.clientAtt || [])}::jsonb,
        ${e.gw || false}, ${e.gwType || null}, ${e.phase || null},
        ${e.colour || "burgundy"}, 'system'
      )
    `);
  }
  const interviewSeeds = [
    {
      title: "Young Person 1 Interview — Case Formalisation",
      description: "Facilitated by Mr. Agboola Ogundeyin using D10 (intake), D17B (consent), and D17A (safeguarding) templates from the Case Management Templates folder. Coordinator captures the case file live. Post-interview: completed case file uploaded for safeguarding sign-off.",
      start_date: "2026-05-28T11:00:00.000Z",
      end_date: "2026-05-28T12:00:00.000Z",
      ep_attendees: ["Mr. Agboola Ogundeyin (DSL)", "Prab (Coordinator)"],
    },
    {
      title: "Young Person 2 Interview — Case Formalisation",
      description: "Same format as YP1 — facilitated using D10 + D17B + D17A templates, Coordinator captures live. Post-interview: case file uploaded for safeguarding sign-off.",
      start_date: "2026-05-30T11:00:00.000Z",
      end_date: "2026-05-30T12:00:00.000Z",
      ep_attendees: ["Mr. Agboola Ogundeyin (DSL)", "Prab (Coordinator)"],
    },
  ];
  for (const interview of interviewSeeds) {
    await db.execute(sql`
      INSERT INTO ep_client_calendar_events
        (client_id, title, description, event_type, start_date, end_date, all_day, location, video_link, ep_attendees, client_attendees, external_attendees, is_gateway, gateway_type, colour, created_by)
      VALUES (
        ${clientId},
        ${interview.title},
        ${interview.description},
        'meeting',
        ${interview.start_date},
        ${interview.end_date},
        false,
        'Zoom or in-person',
        null,
        ${JSON.stringify(interview.ep_attendees)}::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        false,
        null,
        'burgundy',
        'system'
      )
      ON CONFLICT DO NOTHING
    `);
  }
  // Deliverable due-date events — from client_deliverables
  const delivs = await db.execute(sql`
    SELECT deliverable_name, phase_number, due_date
    FROM client_deliverables
    WHERE project_id = 'alli-foundation-2024'
  `).catch(() => ({ rows: [] as any[] }));
  for (const d of (delivs.rows as any[])) {
    if (!d.due_date) continue;
    await db.execute(sql`
      INSERT INTO ep_client_calendar_events
        (client_id, title, description, event_type, start_date, all_day, phase_number, colour, created_by)
      VALUES (
        ${clientId},
        ${"Due — " + d.deliverable_name},
        ${"Deliverable due date: " + d.deliverable_name},
        'deliverable_due',
        ${d.due_date},
        true,
        ${d.phase_number || null},
        'amber',
        'system'
      )
    `);
  }
}

// ─── Intelligence + Videos seeding ────────────────────────────────────────────
async function seedAlliIntelligence(clientId: number) {
  const existing = await db.execute(sql`SELECT COUNT(*) AS cnt FROM ep_intelligence_articles WHERE client_id = ${clientId}`);
  if (parseInt((existing.rows[0] as any).cnt, 10) > 0) return;
  const seeds = [
    {
      title: "Government Launches Plan to Halve Knife Crime — Protecting Lives, Building Hope",
      summary: "The UK government launched its Plan to Halve Knife Crime on 7 April 2026. Key measures include £66.6m for Violence Reduction Units, £70m for 50 Young Futures Hubs, £26m Knife Crime Concentrations Fund, and Young Futures Panels bringing together police, children's services, and community organisations to identify vulnerable children early.",
      source_name: "UK Home Office",
      source_url: "https://www.gov.uk/government/publications/protecting-lives-building-hope-a-plan-to-halve-knife-crime",
      category: "Policy",
      tags: ["government", "funding", "VRU", "Young Futures Hubs", "knife crime plan"],
      relevance_score: 100,
      is_featured: true,
      published_at: new Date("2026-04-07"),
      author: "UK Home Office",
    },
    {
      title: "From Prison to Purpose — Home Office Features Michael Jibowu as Case Study for Plan to Halve Knife Crime",
      summary: "The Home Office's LinkedIn post on 8 April 2026 featured Michael Jibowu — a former gang member from Kent who stabbed a rival and was jailed at 20. Three years on, he is a public speaker and mentor supporting the government plan, and serves as ALLI Foundation's proof of concept for structured pathways out of gang involvement.",
      source_name: "UK Home Office (LinkedIn)",
      source_url: "https://www.linkedin.com/company/home-office",
      category: "Case Study",
      tags: ["Michael Jibowu", "mentor", "case study", "Home Office", "ALLI Foundation"],
      relevance_score: 100,
      is_featured: true,
      published_at: new Date("2026-04-08"),
      author: "UK Home Office",
    },
    {
      title: "Young Futures Hubs — First 8 Locations Announced",
      summary: "Young Futures Hubs to open in Birmingham, Brighton, Bristol, Durham, Leeds, Manchester, Nottingham, and Tower Hamlets. Funded at £70m, the multi-agency hubs bring together police, children's services, schools, and community organisations to identify vulnerable children early and refer to support — aligned directly with ALLI's Find, Assess, Match, Follow Up model.",
      source_name: "UK Home Office",
      source_url: "https://www.gov.uk/government/news/young-futures-hubs-locations",
      category: "Policy",
      tags: ["Young Futures Hubs", "locations", "multi-agency", "funding"],
      relevance_score: 95,
      is_featured: false,
      published_at: new Date("2026-04-07"),
      author: "Home Office",
    },
    {
      title: "Youth Endowment Fund — New Evidence on What Works in Knife Crime Prevention",
      summary: "Latest YEF evidence review identifies structured mentoring, cognitive-behavioural interventions, and multi-agency triage as the highest-impact approaches for reducing youth violence. Directly relevant to ALLI's referral model.",
      source_name: "Youth Endowment Fund",
      source_url: "https://youthendowmentfund.org.uk/",
      category: "Research",
      tags: ["YEF", "evidence", "mentoring", "what works"],
      relevance_score: 90,
      is_featured: false,
      published_at: new Date("2026-03-20"),
      author: "Youth Endowment Fund",
    },
    {
      title: "£26m Knife Crime Concentrations Fund — Funding Opportunity for Local Programmes",
      summary: "The Home Office opened applications for the £26m Knife Crime Concentrations Fund, targeting areas with the highest knife crime prevalence. Eligible organisations include registered charities delivering early intervention in England and Wales.",
      source_name: "UK Home Office",
      source_url: "https://www.gov.uk/government/publications/knife-crime-concentrations-fund",
      category: "Funding",
      tags: ["funding", "Home Office", "grant", "deadline"],
      relevance_score: 95,
      is_featured: false,
      published_at: new Date("2026-04-09"),
      author: "UK Home Office",
    },
  ];
  for (const a of seeds) {
    await db.execute(sql`
      INSERT INTO ep_intelligence_articles
        (client_id, title, summary, source_name, source_url, author, published_at, category, tags, relevance_score, is_featured)
      VALUES (
        ${clientId}, ${a.title}, ${a.summary}, ${a.source_name}, ${a.source_url}, ${a.author},
        ${a.published_at as any}, ${a.category}, ${JSON.stringify(a.tags)}::jsonb,
        ${a.relevance_score}, ${a.is_featured}
      )
    `);
  }
}

async function seedAlliVideos(clientId: number) {
  const existing = await db.execute(sql`SELECT COUNT(*) AS cnt FROM ep_portal_videos WHERE client_id = ${clientId}`);
  if (parseInt((existing.rows[0] as any).cnt, 10) > 0) return;
  const seeds = [
    {
      title: "Michael Jibowu — From Prison to Purpose (Home Office)",
      description: "The Home Office featured Michael Jibowu on 8 April 2026 as a case study supporting the government Plan to Halve Knife Crime. Michael was a former gang member who stabbed a teenager and was jailed. Three years later he is a public speaker and mentor working with youth groups nationally.",
      video_url: "https://www.youtube.com/results?search_query=Michael+Jibowu+Home+Office+knife+crime",
      thumbnail_url: "https://i.ytimg.com/vi/default/hqdefault.jpg",
      video_type: "external_youtube",
      category: "Case Study",
      source: "UK Home Office",
      is_featured: true,
    },
    {
      title: "Home Office Plan to Halve Knife Crime — Launch",
      description: "Launch coverage of the Plan to Halve Knife Crime: Protecting Lives, Building Hope — April 2026.",
      video_url: "https://www.youtube.com/results?search_query=Home+Office+Plan+to+Halve+Knife+Crime+2026",
      thumbnail_url: "https://i.ytimg.com/vi/default/hqdefault.jpg",
      video_type: "external_youtube",
      category: "Policy Briefing",
      source: "UK Home Office",
      is_featured: false,
    },
    {
      title: "Young Futures Hubs — Launch Overview",
      description: "Overview of the Young Futures Hubs programme and the first eight launch locations.",
      video_url: "https://www.youtube.com/results?search_query=Young+Futures+Hubs+launch",
      thumbnail_url: "https://i.ytimg.com/vi/default/hqdefault.jpg",
      video_type: "external_youtube",
      category: "Policy Briefing",
      source: "UK Government",
      is_featured: false,
    },
    {
      title: "Violence Reduction Units — Case Studies",
      description: "Case studies from VRUs across England showing the real-world impact of the public-health approach to violence.",
      video_url: "https://www.youtube.com/results?search_query=Violence+Reduction+Unit+case+study+UK",
      thumbnail_url: "https://i.ytimg.com/vi/default/hqdefault.jpg",
      video_type: "external_youtube",
      category: "Case Study",
      source: "Violence Reduction Units",
      is_featured: false,
    },
  ];
  for (const v of seeds) {
    await db.execute(sql`
      INSERT INTO ep_portal_videos
        (client_id, title, description, video_url, thumbnail_url, video_type, category, source, uploaded_by, uploaded_by_type, is_featured)
      VALUES (
        ${clientId}, ${v.title}, ${v.description}, ${v.video_url}, ${v.thumbnail_url}, ${v.video_type},
        ${v.category}, ${v.source}, 'system', 'ep_team', ${v.is_featured}
      )
    `);
  }
}

// ─── EP Agent intelligence system prompt ─────────────────────────────────────
const EP_AGENT_INTEL_PROMPT = `You are EP Agent — an expert intelligence analyst specialising in UK knife crime policy, youth violence prevention, and early intervention. You are working with ALLI Foundation and Event Perfekt Global Ltd.

ALLI FOUNDATION
Charity No. 1182529. Chair: Taiwo Babatunde Alli. Founded 2019 by Kehinde Alli.
Mission: Find young people affected by knife crime and gang involvement. Assess their needs. Match and refer them to specialist support. Follow up.
Proof of concept: Michael Jibowu — featured by UK Home Office 8 April 2026 as case study for Plan to Halve Knife Crime. Former gang member who stabbed a teenager and was jailed. Now a public speaker and mentor supporting the government plan.
Contact: hello@allifoundation.org

MICHAEL JIBOWU — LATEST
On 8 April 2026 the UK Home Office published a LinkedIn post featuring Michael Jibowu. He was a former warrior who trained to die on the streets. At 20 he was in deadly gang wars in Kent. He stabbed a teenage rival gang member in the neck three times and was jailed. His victim survived. Three years later he is a public speaker and mentor working with youth groups nationally and supporting the Home Office Plan to Halve Knife Crime. His story is ALLI Foundation's proof of concept — structured support creating repeatable pathways.

UK KNIFE CRIME POLICY — APRIL 2026
Plan to Halve Knife Crime — Protecting Lives, Building Hope — launched 7 April 2026.
Key funding: £66.6m VRUs, £70m 50 Young Futures Hubs, £26m Knife Crime Concentrations Fund, £15m MoJ Turnaround Programme, £34m+ County Lines Programme, £1.75m Knife Crime Coordination Centre, £1.2m Safety in and Around Schools.
Young Futures Hubs: first 8 open in Birmingham, Brighton, Bristol, Durham, Leeds, Manchester, Nottingham, Tower Hamlets.
Young Futures Panels: multi-agency panels — police, children's services, schools, community organisations — identify vulnerable children early and refer to support. Exactly what ALLI does.
Framework: Support, Stop, Police, End.

You can help with:
- Latest knife crime news and policy
- Statistics and research findings
- Funding opportunities and deadlines
- How to approach specific funders or VRUs
- What language to use in funding applications
- Michael Jibowu's story and significance
- ALLI Foundation strategy and positioning
- Drafting research summaries and briefings
- Finding specific organisations and contacts

Always be specific, current, and actionable.`;

// ─── Register routes ──────────────────────────────────────────────────────────
export function registerEPClientRoutes(app: Express) {
  ensureTablesAndSeed().catch(e => console.error("[EPClient] Seed failed:", e.message));

  // ═════════════════════════════════════════════════════════════════════════════
  // DOCUMENT ROUTES
  // ═════════════════════════════════════════════════════════════════════════════

  // Client upload
  app.post("/api/ep-client-portal/documents/upload", authenticateClientPortal, upload.single("file"), async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const file = req.file;
      if (!file) return res.status(400).json({ message: "File required" });
      const { document_name, document_category, document_subcategory, document_type, description } = req.body;
      const name = document_name || file.originalname;
      const fileUrl = await uploadBuffer(file.buffer, file.mimetype, "ep-client", file.originalname);
      const uploadedBy = req.portalUser.email || "client";

      const doc = await db.execute(sql`
        INSERT INTO ep_client_document_versions
          (client_id, document_name, document_category, document_subcategory, document_type, current_version, uploaded_by, uploaded_by_type, shared_with_client)
        VALUES (${clientId}, ${name}, ${document_category || "Client Uploads"}, ${document_subcategory || null}, ${document_type || null}, 1, ${uploadedBy}, 'client', true)
        RETURNING *
      `);
      const docId = (doc.rows[0] as any).id;
      await db.execute(sql`
        INSERT INTO ep_client_document_files
          (document_id, client_id, version_number, file_url, file_name, file_size, file_type, version_notes, uploaded_by, uploaded_by_type, is_current)
        VALUES (${docId}, ${clientId}, 1, ${fileUrl}, ${file.originalname}, ${file.size}, ${file.mimetype}, ${description || null}, ${uploadedBy}, 'client', true)
      `);
      // Notify EP team
      sendEmail("info@eventperfekt.com", `📄 ${req.portalUser.organisation || "Client"} uploaded a document`, `
        <p><strong>${req.portalUser.fullName || "Client"}</strong> uploaded <strong>${name}</strong> to the ALLI Foundation portal.</p>
        <p>Category: ${document_category || "Client Uploads"}</p>
      `).catch(() => {});
      return res.status(201).json(doc.rows[0]);
    } catch (e: any) {
      console.error("POST /documents/upload error:", e);
      return res.status(500).json({ message: e.message });
    }
  });

  // Client list
  app.get("/api/ep-client-portal/documents", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const result = await db.execute(sql`
        SELECT d.*,
          (SELECT row_to_json(f.*) FROM ep_client_document_files f WHERE f.document_id = d.id AND f.is_current = true LIMIT 1) AS current_file,
          (SELECT COUNT(*) FROM ep_client_document_files f WHERE f.document_id = d.id) AS version_count,
          (SELECT COUNT(*) FROM ep_document_comments c WHERE c.document_id = d.id AND c.resolved = false) AS open_comments
        FROM ep_client_document_versions d
        WHERE d.client_id = ${clientId} AND (d.shared_with_client = true OR d.uploaded_by_type = 'client')
        ORDER BY d.created_at DESC
      `);
      const rows = await Promise.all((result.rows as any[]).map(async (row) => {
        if (row.current_file?.file_url?.startsWith("/objects/")) {
          const signed = await generateViewUrl(row.current_file.file_url).catch(() => null);
          if (signed) row = { ...row, current_file: { ...row.current_file, file_url: signed } };
        }
        return row;
      }));
      return res.json(rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Client versions
  app.get("/api/ep-client-portal/documents/:id/versions", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const result = await db.execute(sql`
        SELECT * FROM ep_client_document_files
        WHERE document_id = ${req.params.id} AND client_id = ${clientId}
        ORDER BY version_number DESC
      `);
      return res.json(result.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Client add comment
  app.post("/api/ep-client-portal/documents/:id/comment", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const { comment, version_number } = req.body;
      if (!comment) return res.status(400).json({ message: "Comment required" });
      const result = await db.execute(sql`
        INSERT INTO ep_document_comments
          (document_id, client_id, commenter_email, commenter_name, commenter_type, comment, version_number)
        VALUES (${req.params.id}, ${clientId}, ${req.portalUser.email}, ${req.portalUser.fullName}, 'client', ${comment}, ${version_number || null})
        RETURNING *
      `);
      sendEmail("info@eventperfekt.com", `💬 New comment on ${req.portalUser.organisation || "client"} document`, `<p><strong>${req.portalUser.fullName}</strong> commented:</p><blockquote>${comment}</blockquote>`).catch(() => {});
      return res.status(201).json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Client list comments
  app.get("/api/ep-client-portal/documents/:id/comments", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const result = await db.execute(sql`
        SELECT * FROM ep_document_comments
        WHERE document_id = ${req.params.id} AND client_id = ${clientId}
        ORDER BY created_at DESC
      `);
      return res.json(result.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ── Mark document as read (auto-called when viewer opens) ──────────────
  app.patch("/api/ep-client-portal/documents/:id/mark-read", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const result = await db.execute(sql`
        UPDATE ep_client_document_versions
        SET read_by = ${req.portalUser.fullName}, read_at = NOW(),
            status = CASE WHEN status = 'UNREAD' THEN 'READ' ELSE status END
        WHERE id = ${req.params.id} AND client_id = ${clientId}
        RETURNING *
      `);
      if (!result.rows.length) return res.status(404).json({ message: "Document not found" });
      return res.json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ── Sign document ─────────────────────────────────────────────────────
  app.post("/api/ep-client-portal/documents/:id/sign", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const { signatureText, fullName } = req.body || {};
      const signerName = fullName || req.portalUser.fullName || "Client";
      const sigText = signatureText || signerName;
      const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

      const result = await db.execute(sql`
        UPDATE ep_client_document_versions
        SET is_signed = true, signed_by = ${signerName}, signed_at = NOW(),
            signature_text = ${sigText}, status = 'SIGNED'
        WHERE id = ${req.params.id} AND client_id = ${clientId}
        RETURNING *
      `);
      if (!result.rows.length) return res.status(404).json({ message: "Document not found" });
      const doc = result.rows[0] as any;

      // Email EP team
      sendEmail(
        "adminuk@eventperfekt.com",
        `ALLI Foundation — Document Signed — ${doc.document_name}`,
        `<p>Kehinde Alli has signed <strong>${doc.document_name}</strong> on ${today}.</p><p>Signature: <em>${sigText}</em></p><p>View in portal: <a href="https://eventperfekt.net/client-portal/documents">Open Documents</a></p>`
      ).catch(() => {});

      return res.json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ── Reject / Request changes ──────────────────────────────────────────
  app.post("/api/ep-client-portal/documents/:id/reject", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const { rejectionType, rejectionReason } = req.body || {};
      if (!rejectionReason?.trim() || rejectionReason.trim().length < 20) {
        return res.status(400).json({ message: "Please provide at least 20 characters of detail" });
      }

      const result = await db.execute(sql`
        UPDATE ep_client_document_versions
        SET status = 'CHANGES_REQUESTED', rejection_type = ${rejectionType || "Request Edit"},
            rejection_reason = ${rejectionReason.trim()}
        WHERE id = ${req.params.id} AND client_id = ${clientId}
        RETURNING *
      `);
      if (!result.rows.length) return res.status(404).json({ message: "Document not found" });
      const doc = result.rows[0] as any;
      const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

      // Auto-post to chat thread
      await db.execute(sql`
        INSERT INTO ep_doc_chat_messages (document_id, client_id, sender_type, sender_name, message)
        VALUES (${req.params.id}, ${clientId}, 'client', ${req.portalUser.fullName},
                ${`[Changes Requested — ${rejectionType || "Request Edit"}]\n${rejectionReason.trim()}`})
      `);

      // Email EP team
      sendEmail(
        "adminuk@eventperfekt.com",
        `ALLI Foundation — Changes Requested — ${doc.document_name}`,
        `<p>Kehinde Alli has requested changes to <strong>${doc.document_name}</strong>.</p><p><strong>Reason:</strong> ${rejectionType || "Request Edit"}</p><p><strong>Details:</strong> ${rejectionReason.trim()}</p><p>Respond in portal chat: <a href="https://eventperfekt.net/client-portal/documents">Open Documents</a></p>`
      ).catch(() => {});

      return res.json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ── Document chat — get messages ──────────────────────────────────────
  app.get("/api/ep-client-portal/documents/:id/chat", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const result = await db.execute(sql`
        SELECT * FROM ep_doc_chat_messages
        WHERE document_id = ${req.params.id} AND client_id = ${clientId}
        ORDER BY created_at ASC
      `);
      return res.json(result.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ── Document chat — send message ──────────────────────────────────────
  app.post("/api/ep-client-portal/documents/:id/chat", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const { message } = req.body || {};
      if (!message?.trim()) return res.status(400).json({ message: "Message cannot be empty" });

      const docResult = await db.execute(sql`SELECT document_name FROM ep_client_document_versions WHERE id = ${req.params.id} AND client_id = ${clientId}`);
      if (!docResult.rows.length) return res.status(404).json({ message: "Document not found" });
      const doc = docResult.rows[0] as any;

      const inserted = await db.execute(sql`
        INSERT INTO ep_doc_chat_messages (document_id, client_id, sender_type, sender_name, message)
        VALUES (${req.params.id}, ${clientId}, 'client', ${req.portalUser.fullName}, ${message.trim()})
        RETURNING *
      `);

      sendEmail(
        "adminuk@eventperfekt.com",
        `ALLI Foundation — Document Query — ${doc.document_name}`,
        `<p><strong>${req.portalUser.fullName}</strong> sent a message about <strong>${doc.document_name}</strong>:</p><blockquote>${message.trim()}</blockquote><p><a href="https://eventperfekt.net/client-portal/documents">View Documents</a></p>`
      ).catch(() => {});

      return res.status(201).json(inserted.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ── Document chat — attach revised version via chat ───────────────────
  app.post("/api/ep-client-portal/documents/:id/chat/attachment", authenticateClientPortal, upload.single("file"), async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const file = req.file;
      if (!file) return res.status(400).json({ message: "File required" });
      const fileUrl = await uploadBuffer(file.buffer, file.mimetype, "ep-client", file.originalname);
      const { message } = req.body || {};

      const inserted = await db.execute(sql`
        INSERT INTO ep_doc_chat_messages (document_id, client_id, sender_type, sender_name, message, attachment_url, attachment_name)
        VALUES (${req.params.id}, ${clientId}, 'client', ${req.portalUser.fullName},
                ${message?.trim() || "Uploaded a revised document"}, ${fileUrl}, ${file.originalname})
        RETURNING *
      `);
      return res.status(201).json(inserted.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ── Admin: EP team reply in document chat ─────────────────────────────
  app.post("/api/ep-clients/:clientId/documents/:id/chat", authenticateEPStaff, async (req: any, res) => {
    try {
      const { message } = req.body || {};
      if (!message?.trim()) return res.status(400).json({ message: "Message cannot be empty" });
      const senderName = req.epUser?.name || req.epUser?.email || "Event Perfekt Team";

      const docResult = await db.execute(sql`SELECT document_name FROM ep_client_document_versions WHERE id = ${req.params.id} AND client_id = ${req.params.clientId}`);
      if (!docResult.rows.length) return res.status(404).json({ message: "Document not found" });
      const doc = docResult.rows[0] as any;

      const inserted = await db.execute(sql`
        INSERT INTO ep_doc_chat_messages (document_id, client_id, sender_type, sender_name, message)
        VALUES (${req.params.id}, ${req.params.clientId}, 'ep_team', ${senderName}, ${message.trim()})
        RETURNING *
      `);

      // Notify client
      const portalUser = await db.execute(sql`
        SELECT email, full_name FROM client_portal_users WHERE project_id = 'alli-foundation-2024' AND organisation ILIKE '%ALLI%' LIMIT 1
      `).catch(() => ({ rows: [] }));
      if ((portalUser as any).rows.length) {
        const client = (portalUser as any).rows[0] as any;
        sendEmail(
          client.email,
          `Event Perfekt has responded — ${doc.document_name}`,
          `<p>Dear ${client.full_name},</p><p>Event Perfekt has responded to your query on <strong>${doc.document_name}</strong>.</p><p>Log in to view: <a href="https://eventperfekt.net/client-portal/documents">Open Documents</a></p>`
        ).catch(() => {});
      }

      return res.status(201).json(inserted.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ── Admin: EP team uploads revised version via chat ───────────────────
  app.post("/api/ep-clients/:clientId/documents/:id/new-version-chat", authenticateEPStaff, upload.single("file"), async (req: any, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "File required" });
      const uploadedBy = req.epUser?.name || req.epUser?.email || "EP Team";
      const fileUrl = await uploadBuffer(file.buffer, file.mimetype, "ep-client", file.originalname);
      const { version_notes } = req.body;

      // Create new version
      await db.execute(sql`UPDATE ep_client_document_files SET is_current = false WHERE document_id = ${req.params.id}`);
      const v = await db.execute(sql`SELECT COALESCE(MAX(version_number), 0) + 1 AS next FROM ep_client_document_files WHERE document_id = ${req.params.id}`);
      const nextVersion = (v.rows[0] as any).next;
      await db.execute(sql`
        INSERT INTO ep_client_document_files (document_id, client_id, version_number, file_url, file_name, file_size, file_type, version_notes, uploaded_by, uploaded_by_type, is_current)
        VALUES (${req.params.id}, ${req.params.clientId}, ${nextVersion}, ${fileUrl}, ${file.originalname}, ${file.size}, ${file.mimetype}, ${version_notes || null}, ${uploadedBy}, 'ep_team', true)
      `);
      await db.execute(sql`
        UPDATE ep_client_document_versions SET current_version = ${nextVersion}, status = 'UNREAD', is_signed = false, signed_by = null, signed_at = null, signature_text = null, rejection_type = null, rejection_reason = null
        WHERE id = ${req.params.id} RETURNING *
      `);

      // Post to chat
      await db.execute(sql`
        INSERT INTO ep_doc_chat_messages (document_id, client_id, sender_type, sender_name, message, attachment_url, attachment_name)
        VALUES (${req.params.id}, ${req.params.clientId}, 'ep_team', ${uploadedBy},
                ${`A revised version (v${nextVersion}) of this document has been uploaded. Please review and sign.`},
                ${fileUrl}, ${file.originalname})
      `);

      // Notify client
      const docResult = await db.execute(sql`SELECT document_name FROM ep_client_document_versions WHERE id = ${req.params.id}`);
      const docName = (docResult.rows[0] as any)?.document_name || "Document";
      const portalUser = await db.execute(sql`SELECT email, full_name FROM client_portal_users WHERE organisation ILIKE '%ALLI%' LIMIT 1`).catch(() => ({ rows: [] }));
      if ((portalUser as any).rows.length) {
        const client = (portalUser as any).rows[0] as any;
        sendEmail(
          "info@eventperfekt.com",
          `[PENDING APPROVAL] Revised document uploaded — ${docName} for ${client.full_name}`,
          `<p>Dear ${client.full_name},</p><p>A revised version of <strong>${docName}</strong> (v${nextVersion}) has been uploaded. Please review and sign.</p><p><a href="https://eventperfekt.net/client-portal/documents">Open Documents</a></p>`
        ).catch(() => {});
      }

      return res.json({ success: true, version_number: nextVersion });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // STAFF document upload
  app.post("/api/ep-clients/:id/documents/upload", authenticateEPStaff, upload.single("file"), async (req: any, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "File required" });
      const { document_name, document_category, document_subcategory, document_type, shared_with_client, version_notes } = req.body;
      const uploadedBy = req.epUser?.name || req.epUser?.email || "EP Team";
      const fileUrl = await uploadBuffer(file.buffer, file.mimetype, "ep-client", file.originalname);
      const doc = await db.execute(sql`
        INSERT INTO ep_client_document_versions
          (client_id, document_name, document_category, document_subcategory, document_type, current_version, uploaded_by, uploaded_by_type, shared_with_client)
        VALUES (${req.params.id}, ${document_name || file.originalname}, ${document_category || null}, ${document_subcategory || null}, ${document_type || null}, 1, ${uploadedBy}, 'ep_team', ${shared_with_client === 'true' || shared_with_client === true})
        RETURNING *
      `);
      const docId = (doc.rows[0] as any).id;
      await db.execute(sql`
        INSERT INTO ep_client_document_files
          (document_id, client_id, version_number, file_url, file_name, file_size, file_type, version_notes, uploaded_by, uploaded_by_type, is_current)
        VALUES (${docId}, ${req.params.id}, 1, ${fileUrl}, ${file.originalname}, ${file.size}, ${file.mimetype}, ${version_notes || null}, ${uploadedBy}, 'ep_team', true)
      `);
      await syncClientPortalDocument(Number(req.params.id), doc.rows[0], file, 1, version_notes || null, false, fileUrl);
      return res.status(201).json(doc.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // STAFF new version
  app.post("/api/ep-clients/:id/documents/:docId/new-version", authenticateEPStaff, upload.single("file"), async (req: any, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "File required" });
      const { version_notes } = req.body;
      const uploadedBy = req.epUser?.name || req.epUser?.email || "EP Team";
      const fileUrl = await uploadBuffer(file.buffer, file.mimetype, "ep-client", file.originalname);
      // Unset current
      await db.execute(sql`UPDATE ep_client_document_files SET is_current = false WHERE document_id = ${req.params.docId}`);
      // Find next version number
      const v = await db.execute(sql`SELECT COALESCE(MAX(version_number), 0) + 1 AS next FROM ep_client_document_files WHERE document_id = ${req.params.docId}`);
      const nextVersion = (v.rows[0] as any).next;
      await db.execute(sql`
        INSERT INTO ep_client_document_files
          (document_id, client_id, version_number, file_url, file_name, file_size, file_type, version_notes, uploaded_by, uploaded_by_type, is_current)
        VALUES (${req.params.docId}, ${req.params.id}, ${nextVersion}, ${fileUrl}, ${file.originalname}, ${file.size}, ${file.mimetype}, ${version_notes || null}, ${uploadedBy}, 'ep_team', true)
      `);
      await db.execute(sql`UPDATE ep_client_document_versions SET current_version = ${nextVersion} WHERE id = ${req.params.docId}`);
      const docRow = await db.execute(sql`SELECT * FROM ep_client_document_versions WHERE id = ${req.params.docId} LIMIT 1`);
      if (docRow.rows[0]) await syncClientPortalDocument(Number(req.params.id), docRow.rows[0], file, nextVersion, version_notes || null, true, fileUrl);
      return res.json({ success: true, version_number: nextVersion });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // STAFF share toggle
  app.patch("/api/ep-clients/:id/documents/:docId/share", authenticateEPStaff, async (req: any, res) => {
    try {
      const { shared_with_client } = req.body;
      const result = await db.execute(sql`
        UPDATE ep_client_document_versions SET shared_with_client = ${!!shared_with_client}
        WHERE id = ${req.params.docId} AND client_id = ${req.params.id} RETURNING *
      `);
      return res.json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // STAFF list
  app.get("/api/ep-clients/:id/documents", authenticateEPStaff, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT d.*,
          (SELECT row_to_json(f.*) FROM ep_client_document_files f WHERE f.document_id = d.id AND f.is_current = true LIMIT 1) AS current_file,
          (SELECT COUNT(*) FROM ep_client_document_files f WHERE f.document_id = d.id) AS version_count,
          (SELECT COUNT(*) FROM ep_document_comments c WHERE c.document_id = d.id) AS comment_count
        FROM ep_client_document_versions d
        WHERE d.client_id = ${req.params.id}
        ORDER BY d.created_at DESC
      `);
      const rows = await Promise.all((result.rows as any[]).map(async (row) => {
        if (row.current_file?.file_url?.startsWith("/objects/")) {
          const signed = await generateViewUrl(row.current_file.file_url).catch(() => null);
          if (signed) row = { ...row, current_file: { ...row.current_file, file_url: signed } };
        }
        return row;
      }));
      return res.json(rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // COLLABORATION ROUTES
  // ═════════════════════════════════════════════════════════════════════════════

  async function createCollaboratorInvite(clientId: number, body: any, invitedBy: string, invitedByType: "ep_team" | "client") {
    const { full_name, email, organisation, role, access_level, can_upload, can_comment, document_access, expiry_days } = body;
    const token = crypto.randomBytes(32).toString("hex");
    const expires = expiry_days && expiry_days !== "none" ? sql`NOW() + (${parseInt(expiry_days, 10)}::int || ' days')::interval` : sql`NULL`;
    const result = await db.execute(sql`
      INSERT INTO ep_client_collaborators
        (client_id, invited_by, invited_by_type, full_name, email, organisation, role, access_level, access_token, status, can_upload, can_comment, document_access, expires_at)
      VALUES (
        ${clientId}, ${invitedBy}, ${invitedByType}, ${full_name}, ${email}, ${organisation || null},
        ${role || null}, ${access_level || "view"}, ${token}, 'invited',
        ${!!can_upload}, ${can_comment !== false}, ${JSON.stringify(document_access || [])}::jsonb,
        ${expires}
      ) RETURNING *
    `);
    return result.rows[0] as any;
  }

  // STAFF invite
  app.post("/api/ep-clients/:id/collaborators/invite", authenticateEPStaff, async (req: any, res) => {
    try {
      const invitedBy = req.epUser?.name || req.epUser?.email || "EP Team";
      const collab = await createCollaboratorInvite(parseInt(req.params.id, 10), req.body, invitedBy, "ep_team");
      const prodDomain = process.env.PRODUCTION_DOMAIN || "eventperfekt.net";
      const acceptUrl = `https://${prodDomain}/collaborator/accept/${collab.access_token}`;
      sendEmail(collab.email, `You have been invited to view the ALLI Foundation project — Event Perfekt Global Ltd`, `
        <div style="font-family:sans-serif;max-width:500px;">
          <h2 style="color:#3D0B0B;">You're invited</h2>
          <p><strong>${invitedBy}</strong> has invited you to view the ALLI Foundation project portal.</p>
          <p><a href="${acceptUrl}" style="display:inline-block;background:#3D0B0B;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Accept Invitation</a></p>
          <p style="color:#999;font-size:11px;">Event Perfekt Global Ltd · London, UK</p>
        </div>
      `).catch(() => {});
      return res.status(201).json(collab);
    } catch (e: any) {
      console.error("invite error:", e);
      return res.status(500).json({ message: e.message });
    }
  });

  // STAFF list
  app.get("/api/ep-clients/:id/collaborators", authenticateEPStaff, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM ep_client_collaborators WHERE client_id = ${req.params.id} ORDER BY invited_at DESC`);
      return res.json(r.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // STAFF update
  app.patch("/api/ep-clients/:id/collaborators/:collabId", authenticateEPStaff, async (req: any, res) => {
    try {
      const fields = ["access_level", "can_upload", "can_comment", "document_access", "status", "role"];
      const updates: string[] = [];
      const params: any[] = [];
      let idx = 1;
      for (const f of fields) {
        if (req.body[f] !== undefined) {
          if (f === "document_access") {
            updates.push(`${f} = $${idx++}::jsonb`);
            params.push(JSON.stringify(req.body[f]));
          } else {
            updates.push(`${f} = $${idx++}`);
            params.push(req.body[f]);
          }
        }
      }
      if (!updates.length) return res.status(400).json({ message: "Nothing to update" });
      params.push(req.params.collabId);
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      const result = await pool.query(`UPDATE ep_client_collaborators SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`, params);
      await pool.end();
      return res.json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // STAFF delete
  app.delete("/api/ep-clients/:id/collaborators/:collabId", authenticateEPStaff, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM ep_client_collaborators WHERE id = ${req.params.collabId}`);
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // CLIENT invite
  app.post("/api/ep-client-portal/collaborators/invite", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const invitedBy = req.portalUser.fullName || req.portalUser.email || "Client";
      const collab = await createCollaboratorInvite(clientId, req.body, invitedBy, "client");
      const prodDomain = process.env.PRODUCTION_DOMAIN || "eventperfekt.net";
      const acceptUrl = `https://${prodDomain}/collaborator/accept/${collab.access_token}`;
      // GATED — collaborator invite held at info@eventperfekt.com for approval
      sendEmail("info@eventperfekt.com", `[PENDING APPROVAL] Collaborator Invite — ${collab.full_name} (${collab.email})`, `
        <div style="font-family:sans-serif;max-width:500px;">
          <h2 style="color:#3D0B0B;">Collaborator Invitation — Pending Approval</h2>
          <p><strong>Intended recipient:</strong> ${collab.full_name} &lt;${collab.email}&gt;</p>
          <p><strong>Role:</strong> ${collab.role || "collaborator"}</p>
          <p><strong>Invited by:</strong> ${invitedBy}</p>
          <p><a href="${acceptUrl}" style="display:inline-block;background:#3D0B0B;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Accept Invitation</a></p>
        </div>
      `).catch(() => {});
      // Notify EP team
      sendEmail("info@eventperfekt.com", `🤝 ${req.portalUser.organisation} invited a collaborator`, `<p><strong>${invitedBy}</strong> invited <strong>${collab.full_name}</strong> (${collab.email}) as ${collab.role || "collaborator"}.</p>`).catch(() => {});
      return res.status(201).json(collab);
    } catch (e: any) {
      console.error("client invite error:", e);
      return res.status(500).json({ message: e.message });
    }
  });

  // CLIENT list
  app.get("/api/ep-client-portal/collaborators", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const r = await db.execute(sql`SELECT * FROM ep_client_collaborators WHERE client_id = ${clientId} ORDER BY invited_at DESC`);
      return res.json(r.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // COLLAB accept (GET — verify token, return collaborator info)
  app.get("/api/ep-collaborator/accept/:token", async (req, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM ep_client_collaborators WHERE access_token = ${req.params.token}`);
      if (!r.rows[0]) return res.status(404).json({ message: "Invalid or expired invitation" });
      const c = r.rows[0] as any;
      if (c.expires_at && new Date(c.expires_at) < new Date()) return res.status(410).json({ message: "Invitation expired" });
      if (c.status === "invited") {
        await db.execute(sql`UPDATE ep_client_collaborators SET status = 'accepted', accepted_at = NOW() WHERE id = ${c.id}`);
        const client = await db.execute(sql`SELECT organisation_name FROM ep_clients WHERE id = ${c.client_id}`);
        const orgName = (client.rows[0] as any)?.organisation_name || "the project";
        // Notify inviter
        const inviterEmail = c.invited_by_type === "ep_team" ? "info@eventperfekt.com" : null;
        if (inviterEmail) {
          sendEmail(inviterEmail, `✓ ${c.full_name} accepted their invitation`, `<p><strong>${c.full_name}</strong> (${c.email}) has accepted their invitation to view ${orgName}.</p>`).catch(() => {});
        }
      }
      return res.json({ collaborator: c });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // COLLAB login (exchange access token for session token)
  app.post("/api/ep-collaborator/login", async (req, res) => {
    try {
      const { access_token } = req.body || {};
      if (!access_token) return res.status(400).json({ message: "Token required" });
      const r = await db.execute(sql`SELECT * FROM ep_client_collaborators WHERE access_token = ${access_token}`);
      if (!r.rows[0]) return res.status(401).json({ message: "Invalid token" });
      const c = r.rows[0] as any;
      if (c.expires_at && new Date(c.expires_at) < new Date()) return res.status(410).json({ message: "Invitation expired" });
      // Mark accepted if still invited
      if (c.status === "invited") {
        await db.execute(sql`UPDATE ep_client_collaborators SET status = 'accepted', accepted_at = NOW() WHERE id = ${c.id}`);
      }
      const sessionToken = jwt.sign({ collaboratorId: c.id, clientId: c.client_id, email: c.email, name: c.full_name, system: "collaborator" }, COLLAB_JWT_SECRET, { expiresIn: "30d" });
      await db.execute(sql`
        INSERT INTO ep_client_collaborator_sessions (collaborator_id, token, expires_at)
        VALUES (${c.id}, ${sessionToken}, NOW() + INTERVAL '30 days')
      `);
      return res.json({ token: sessionToken, collaborator: c });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // COLLAB portal view
  app.get("/api/ep-collaborator/portal", authenticateCollaborator, async (req: any, res) => {
    try {
      const c = await db.execute(sql`SELECT * FROM ep_client_collaborators WHERE id = ${req.collaborator.collaboratorId}`);
      if (!c.rows[0]) return res.status(404).json({ message: "Not found" });
      const collab = c.rows[0] as any;
      const client = await db.execute(sql`SELECT id, organisation_name FROM ep_clients WHERE id = ${collab.client_id}`);
      const docs = await db.execute(sql`
        SELECT d.*, (SELECT row_to_json(f.*) FROM ep_client_document_files f WHERE f.document_id = d.id AND f.is_current = true LIMIT 1) AS current_file
        FROM ep_client_document_versions d
        WHERE d.client_id = ${collab.client_id} AND d.shared_with_client = true
        ORDER BY d.created_at DESC
      `);
      const events = await db.execute(sql`SELECT * FROM ep_client_calendar_events WHERE client_id = ${collab.client_id} ORDER BY start_date ASC LIMIT 20`);
      const deliverables = await db.execute(sql`SELECT * FROM client_deliverables WHERE project_id = 'alli-foundation-2024' ORDER BY phase_number, id`).catch(() => ({ rows: [] }));
      return res.json({
        collaborator: collab,
        client: client.rows[0],
        documents: docs.rows,
        events: events.rows,
        deliverables: deliverables.rows,
      });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PARTNERSHIP CONTRACT ROUTES
  // ═════════════════════════════════════════════════════════════════════════════

  // EP AGENT DRAFT
  app.post("/api/ep-clients/:id/partnerships/draft", authenticateEPStaff, async (req: any, res) => {
    try {
      const { partner_name, partner_organisation, contract_type, brief, partner_email } = req.body;
      if (!partner_name || !partner_organisation || !contract_type || !brief) {
        return res.status(400).json({ message: "partner_name, partner_organisation, contract_type and brief are required" });
      }
      const systemPrompt = `You are EP Agent — a senior legal drafting professional with expertise in charity law, partnership agreements, and UK non-profit sector contracts. You are drafting a partnership document for Event Perfekt Global Ltd on behalf of their client ALLI Foundation — Charity No. 1182529.

ALLI Foundation is a youth violence prevention charity that finds young people affected by knife crime, assesses their needs, and refers them to specialist support organisations. Event Perfekt Global Ltd — Company No. 15875326 — is designing ALLI's operating model.

The partnership brief is: ${brief}
Contract type: ${contract_type}
Partner: ${partner_name} at ${partner_organisation}

Draft a professional ${contract_type} that:
1. Is appropriate for a UK charity partnership
2. Clearly defines the roles and responsibilities of both parties
3. Includes appropriate data protection clauses referencing UK GDPR
4. Includes confidentiality provisions
5. Includes a clear purpose and scope
6. Includes duration and termination provisions
7. Is written in plain English — professional but accessible
8. Follows standard UK charity sector conventions

Format with clear numbered sections and subsections.
Include signature blocks for both parties.

Return the full contract text.`;

      const userPrompt = `Please draft the ${contract_type} now. Brief: ${brief}. Partner: ${partner_name} at ${partner_organisation}.`;
      const contractText = await claudeAI(systemPrompt, userPrompt, 6000);
      const title = `${contract_type} — ${partner_organisation} — ${new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;
      const saved = await db.execute(sql`
        INSERT INTO ep_client_partnership_contracts
          (client_id, partner_name, partner_organisation, partner_email, contract_type, contract_title, document_text, brief, drafted_by, status)
        VALUES (${req.params.id}, ${partner_name}, ${partner_organisation}, ${partner_email || null}, ${contract_type}, ${title}, ${contractText}, ${brief}, 'ep_agent', 'draft')
        RETURNING *
      `);
      // Create document record
      const docResult = await db.execute(sql`
        INSERT INTO ep_client_document_versions
          (client_id, document_name, document_category, document_subcategory, document_type, uploaded_by, uploaded_by_type, shared_with_client)
        VALUES (${req.params.id}, ${title}, 'Legal', 'Partnership Contracts', ${contract_type}, 'EP Agent', 'ep_team', false)
        RETURNING id
      `);
      return res.status(201).json({ ...(saved.rows[0] as any), document_id: (docResult.rows[0] as any).id });
    } catch (e: any) {
      console.error("partnership draft error:", e);
      return res.status(500).json({ message: e.message });
    }
  });

  // Upload existing contract
  app.post("/api/ep-clients/:id/partnerships/upload", authenticateEPStaff, upload.single("file"), async (req: any, res) => {
    try {
      const { partner_name, partner_organisation, contract_type, partner_email, contract_title } = req.body;
      const file = req.file;
      const docUrl = file ? await uploadBuffer(file.buffer, file.mimetype, "ep-client", file.originalname) : null;
      const title = contract_title || `${contract_type} — ${partner_organisation}`;
      const r = await db.execute(sql`
        INSERT INTO ep_client_partnership_contracts
          (client_id, partner_name, partner_organisation, partner_email, contract_type, contract_title, document_url, drafted_by, status)
        VALUES (${req.params.id}, ${partner_name}, ${partner_organisation}, ${partner_email || null}, ${contract_type}, ${title}, ${docUrl}, 'uploaded', 'draft')
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // List
  app.get("/api/ep-clients/:id/partnerships", authenticateEPStaff, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM ep_client_partnership_contracts WHERE client_id = ${req.params.id} ORDER BY created_at DESC`);
      return res.json(r.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Update
  app.patch("/api/ep-clients/:id/partnerships/:contractId", authenticateEPStaff, async (req: any, res) => {
    try {
      const fields = ["partner_name", "partner_organisation", "partner_email", "contract_type", "contract_title", "document_text", "document_url", "status", "brief"];
      const updates: string[] = [];
      const params: any[] = [];
      let idx = 1;
      for (const f of fields) {
        if (req.body[f] !== undefined) { updates.push(`${f} = $${idx++}`); params.push(req.body[f]); }
      }
      if (!updates.length) return res.status(400).json({ message: "Nothing to update" });
      updates.push("updated_at = NOW()");
      params.push(req.params.contractId);
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: getConnectionString() });
      const result = await pool.query(`UPDATE ep_client_partnership_contracts SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`, params);
      await pool.end();
      return res.json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Send to partner
  app.post("/api/ep-clients/:id/partnerships/:contractId/send-to-partner", authenticateEPStaff, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM ep_client_partnership_contracts WHERE id = ${req.params.contractId}`);
      if (!r.rows[0]) return res.status(404).json({ message: "Contract not found" });
      const c = r.rows[0] as any;
      if (!c.partner_email) return res.status(400).json({ message: "Partner email not set" });
      await db.execute(sql`UPDATE ep_client_partnership_contracts SET status = 'sent_to_partner', updated_at = NOW() WHERE id = ${c.id}`);
      // GATED — partner email held at info@eventperfekt.com for approval
      sendEmail("info@eventperfekt.com", `[PENDING APPROVAL] Partnership Agreement — ${c.contract_title} for ${c.partner_name} (${c.partner_email})`, `
        <div style="font-family:sans-serif;max-width:520px;">
          <h2 style="color:#3D0B0B;">Partnership Agreement — Pending Approval</h2>
          <p><strong>Intended recipient:</strong> ${c.partner_name} &lt;${c.partner_email}&gt;</p>
          <p><strong>Contract:</strong> ${c.contract_title}</p>
          <pre style="background:#fafafa;border:1px solid #eee;padding:16px;font-family:Georgia,serif;white-space:pre-wrap;">${(c.document_text || "").slice(0, 800)}...</pre>
          <p>Approve to send to partner, or discard to cancel.</p>
        </div>
      `).catch(() => {});
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Client sign
  app.post("/api/ep-client-portal/partnerships/:contractId/sign", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const { signature_data } = req.body;
      if (!signature_data) return res.status(400).json({ message: "Signature required" });
      const r = await db.execute(sql`
        UPDATE ep_client_partnership_contracts
        SET client_signed = true, client_signed_at = NOW(), client_signature_data = ${signature_data}, status = 'signed_by_client', updated_at = NOW()
        WHERE id = ${req.params.contractId} AND client_id = ${clientId}
        RETURNING *
      `);
      if (!r.rows[0]) return res.status(404).json({ message: "Contract not found" });
      sendEmail("info@eventperfekt.com", `✍ ${req.portalUser.organisation} signed partnership contract`, `<p><strong>${req.portalUser.fullName}</strong> signed <strong>${(r.rows[0] as any).contract_title}</strong>.</p>`).catch(() => {});
      return res.json(r.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Client list
  app.get("/api/ep-client-portal/partnerships", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const r = await db.execute(sql`SELECT * FROM ep_client_partnership_contracts WHERE client_id = ${clientId} ORDER BY created_at DESC`);
      return res.json(r.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // EMAIL LOG ROUTES
  // ═════════════════════════════════════════════════════════════════════════════

  app.post("/api/ep-clients/:id/emails/log", authenticateEPStaff, async (req: any, res) => {
    try {
      const { direction, from_email, to_email, to_name, subject, body, category, related_deliverable, visible_to_client } = req.body;
      const r = await db.execute(sql`
        INSERT INTO ep_client_email_log
          (client_id, direction, from_email, to_email, to_name, subject, body, category, related_deliverable, visible_to_client, status)
        VALUES (
          ${req.params.id}, ${direction || "outbound"}, ${from_email || null}, ${to_email || null}, ${to_name || null},
          ${subject || null}, ${body || null}, ${category || "general"}, ${related_deliverable || null},
          ${visible_to_client !== false}, 'sent'
        )
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/ep-clients/:id/emails", authenticateEPStaff, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM ep_client_email_log WHERE client_id = ${req.params.id} ORDER BY sent_at DESC`);
      return res.json(r.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/ep-client-portal/emails", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const r = await db.execute(sql`
        SELECT * FROM ep_client_email_log
        WHERE client_id = ${clientId} AND visible_to_client = true
        ORDER BY sent_at DESC
      `);
      return res.json(r.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CALENDAR ROUTES
  // ═════════════════════════════════════════════════════════════════════════════

  app.post("/api/ep-clients/:id/calendar/event", authenticateEPStaff, async (req: any, res) => {
    try {
      const { title, description, event_type, start_date, end_date, all_day, location, video_link, ep_attendees, client_attendees, external_attendees, phase_number, is_gateway, gateway_type, colour } = req.body;
      const createdBy = req.epUser?.name || req.epUser?.email || "EP Team";
      const r = await db.execute(sql`
        INSERT INTO ep_client_calendar_events
          (client_id, title, description, event_type, start_date, end_date, all_day, location, video_link, ep_attendees, client_attendees, external_attendees, phase_number, is_gateway, gateway_type, colour, created_by)
        VALUES (
          ${req.params.id}, ${title}, ${description || null}, ${event_type || "meeting"}, ${start_date}, ${end_date || null},
          ${!!all_day}, ${location || null}, ${video_link || null},
          ${JSON.stringify(ep_attendees || [])}::jsonb,
          ${JSON.stringify(client_attendees || [])}::jsonb,
          ${JSON.stringify(external_attendees || [])}::jsonb,
          ${phase_number || null}, ${!!is_gateway}, ${gateway_type || null}, ${colour || "burgundy"}, ${createdBy}
        )
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/ep-clients/:id/calendar", authenticateEPStaff, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM ep_client_calendar_events WHERE client_id = ${req.params.id} ORDER BY start_date ASC`);
      return res.json(r.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/ep-client-portal/calendar/:eventId/respond", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const { response } = req.body;
      if (!["accepted", "declined"].includes(response)) return res.status(400).json({ message: "Invalid response" });
      const r = await db.execute(sql`
        UPDATE ep_client_calendar_events
        SET client_response = ${response}, client_responded_at = NOW()
        WHERE id = ${req.params.eventId} AND client_id = ${clientId}
        RETURNING *
      `);
      if (!r.rows[0]) return res.status(404).json({ message: "Event not found" });
      sendEmail("info@eventperfekt.com", `📅 ${req.portalUser.organisation} ${response} a meeting`, `<p><strong>${req.portalUser.fullName}</strong> ${response} the event: <strong>${(r.rows[0] as any).title}</strong>.</p>`).catch(() => {});
      return res.json(r.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/ep-client-portal/calendar", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const r = await db.execute(sql`SELECT * FROM ep_client_calendar_events WHERE client_id = ${clientId} ORDER BY start_date ASC`);
      return res.json(r.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // HELPER — activity feed for client portal home widget
  // ═════════════════════════════════════════════════════════════════════════════
  app.get("/api/ep-client-portal/activity", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json({ documents: [], events: [] });
      const docs = await db.execute(sql`
        SELECT id, document_name, document_category, uploaded_by, uploaded_by_type, created_at, shared_with_client
        FROM ep_client_document_versions
        WHERE client_id = ${clientId} AND (shared_with_client = true OR uploaded_by_type = 'client')
        ORDER BY created_at DESC LIMIT 5
      `);
      const events = await db.execute(sql`
        SELECT id, title, event_type, start_date, all_day, is_gateway, colour, client_response
        FROM ep_client_calendar_events
        WHERE client_id = ${clientId} AND start_date >= NOW()
        ORDER BY start_date ASC LIMIT 3
      `);
      return res.json({ documents: docs.rows, events: events.rows });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // INTELLIGENCE HUB
  // ═════════════════════════════════════════════════════════════════════════════
  app.get("/api/ep-client-portal/intelligence", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const category = req.query.category as string | undefined;
      const r = category && category !== "All"
        ? await db.execute(sql`SELECT * FROM ep_intelligence_articles WHERE client_id = ${clientId} AND category = ${category} ORDER BY is_featured DESC, published_at DESC NULLS LAST`)
        : await db.execute(sql`SELECT * FROM ep_intelligence_articles WHERE client_id = ${clientId} ORDER BY is_featured DESC, published_at DESC NULLS LAST`);
      return res.json(r.rows);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/ep-client-portal/intelligence/latest", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const r = await db.execute(sql`SELECT * FROM ep_intelligence_articles WHERE client_id = ${clientId} ORDER BY published_at DESC NULLS LAST LIMIT 10`);
      return res.json(r.rows);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/ep-client-portal/intelligence/saved", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const email = req.portalUser.email;
      const r = await db.execute(sql`
        SELECT * FROM ep_intelligence_articles
        WHERE client_id = ${clientId} AND saved_by @> ${JSON.stringify([email])}::jsonb
        ORDER BY published_at DESC NULLS LAST
      `);
      return res.json(r.rows);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/ep-client-portal/intelligence/:id/save", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const userEmail = req.portalUser.email;
      const cur = await db.execute(sql`SELECT saved_by FROM ep_intelligence_articles WHERE id = ${req.params.id} AND client_id = ${clientId}`);
      if (!cur.rows[0]) return res.status(404).json({ message: "Article not found" });
      const saved: string[] = Array.isArray((cur.rows[0] as any).saved_by) ? (cur.rows[0] as any).saved_by : [];
      const idx = saved.indexOf(userEmail);
      if (idx >= 0) saved.splice(idx, 1); else saved.push(userEmail);
      await db.execute(sql`UPDATE ep_intelligence_articles SET saved_by = ${JSON.stringify(saved)}::jsonb WHERE id = ${req.params.id}`);
      return res.json({ saved: idx < 0 });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/ep-intelligence/fetch", authenticateEPStaff, async (_req: any, res) => {
    try {
      const mod = await import("./ep-intelligence-service");
      const result = await mod.runIntelligenceFetch().catch((e: any) => ({ ok: false, error: e.message }));
      return res.json(result);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // LIVE RESEARCH SESSION
  // ═════════════════════════════════════════════════════════════════════════════
  app.get("/api/ep-client-portal/research", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const r = await db.execute(sql`SELECT id, session_title, status, started_by, started_by_type, created_at, updated_at FROM ep_research_sessions WHERE client_id = ${clientId} ORDER BY updated_at DESC`);
      return res.json(r.rows);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/ep-client-portal/research/start", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const { session_title, project_name } = req.body;
      const r = await db.execute(sql`
        INSERT INTO ep_research_sessions (client_id, project_name, session_title, started_by, started_by_type, status, messages)
        VALUES (${clientId}, ${project_name || "ALLI Foundation"}, ${session_title || "New research session"}, ${req.portalUser.email}, 'client', 'active', '[]'::jsonb)
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/ep-client-portal/research/:id", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const r = await db.execute(sql`SELECT * FROM ep_research_sessions WHERE id = ${req.params.id} AND client_id = ${clientId}`);
      if (!r.rows[0]) return res.status(404).json({ message: "Session not found" });
      return res.json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/ep-client-portal/research/:id/message", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });
      const sess = await db.execute(sql`SELECT * FROM ep_research_sessions WHERE id = ${req.params.id} AND client_id = ${clientId}`);
      if (!sess.rows[0]) return res.status(404).json({ message: "Session not found" });
      const current: any[] = Array.isArray((sess.rows[0] as any).messages) ? (sess.rows[0] as any).messages : [];
      current.push({ role: "user", content: message, at: new Date().toISOString(), author: req.portalUser.fullName || req.portalUser.email });

      const history = current.map((m: any) => `${m.role === "user" ? "USER" : "EP AGENT"}: ${m.content}`).join("\n\n");
      const saved = await db.execute(sql`
        SELECT title, summary FROM ep_intelligence_articles
        WHERE client_id = ${clientId} AND saved_by @> ${JSON.stringify([req.portalUser.email])}::jsonb
        LIMIT 10
      `);
      const savedBlock = saved.rows.length > 0
        ? "\n\nSAVED ARTICLES (context):\n" + (saved.rows as any[]).map((a: any) => `• ${a.title} — ${a.summary}`).join("\n")
        : "";
      let answer = "";
      try {
        answer = await claudeAI(EP_AGENT_INTEL_PROMPT + savedBlock, history, 3000);
      } catch (aiErr: any) {
        answer = `(EP Agent is offline — ${aiErr.message}). Your question has been logged.`;
      }
      current.push({ role: "assistant", content: answer, at: new Date().toISOString(), author: "EP Agent" });
      await db.execute(sql`UPDATE ep_research_sessions SET messages = ${JSON.stringify(current)}::jsonb, updated_at = NOW() WHERE id = ${req.params.id}`);
      return res.json({ messages: current, answer });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/ep-client-portal/research/:id/generate-document", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const sess = await db.execute(sql`SELECT * FROM ep_research_sessions WHERE id = ${req.params.id} AND client_id = ${clientId}`);
      if (!sess.rows[0]) return res.status(404).json({ message: "Session not found" });
      const msgs: any[] = Array.isArray((sess.rows[0] as any).messages) ? (sess.rows[0] as any).messages : [];
      if (msgs.length === 0) return res.status(400).json({ message: "No messages in session" });
      const transcript = msgs.map((m: any) => `${m.role === "user" ? "USER" : "EP AGENT"}: ${m.content}`).join("\n\n");
      const systemPrompt = `${EP_AGENT_INTEL_PROMPT}\n\nYou are compiling a research session into a formal document. Output structured markdown with: Title, Executive Summary, Key Findings, Evidence Base, Recommendations, Sources. Be specific and citable.`;
      let doc = "";
      try {
        doc = await claudeAI(systemPrompt, `Compile this research session into a structured document:\n\n${transcript}`, 5000);
      } catch (e: any) {
        doc = `# Research Session — ${(sess.rows[0] as any).session_title}\n\n(EP Agent offline: ${e.message})\n\n## Transcript\n\n${transcript}`;
      }
      const docName = `Research Brief — ${(sess.rows[0] as any).session_title}`;
      const docRow = await db.execute(sql`
        INSERT INTO ep_client_document_versions
          (client_id, document_name, document_category, document_subcategory, document_type, current_version, uploaded_by, uploaded_by_type, shared_with_client)
        VALUES (${clientId}, ${docName}, 'Research', 'Intelligence Briefs', 'Research Brief', 1, ${req.portalUser.email}, 'ep_agent', true)
        RETURNING id
      `);
      const docId = (docRow.rows[0] as any).id;
      const fileName = `research-brief-${docId}-${Date.now()}.md`;
      const fileUrl = await uploadBuffer(Buffer.from(doc), "text/markdown", "ep-client", fileName);
      await db.execute(sql`
        INSERT INTO ep_client_document_files
          (document_id, client_id, version_number, file_url, file_name, file_size, file_type, uploaded_by, uploaded_by_type, is_current)
        VALUES (${docId}, ${clientId}, 1, ${fileUrl}, ${fileName}, ${Buffer.byteLength(doc)}, 'text/markdown', ${req.portalUser.email}, 'ep_agent', true)
      `);
      await db.execute(sql`UPDATE ep_research_sessions SET document_generated = true, document_url = ${fileUrl}, research_output = ${doc}, updated_at = NOW() WHERE id = ${req.params.id}`);
      return res.json({ document_url: fileUrl, document_id: docId, document: doc });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PROGRESS REPORTS
  // ═════════════════════════════════════════════════════════════════════════════
  app.get("/api/ep-client-portal/progress-reports", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const r = await db.execute(sql`SELECT * FROM ep_progress_reports WHERE client_id = ${clientId} AND sent_to_client = true ORDER BY report_week DESC`);
      return res.json(r.rows);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/ep-clients/:id/progress-reports", authenticateEPStaff, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM ep_progress_reports WHERE client_id = ${req.params.id} ORDER BY report_week DESC`);
      return res.json(r.rows);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/ep-clients/:id/progress-reports/generate", authenticateEPStaff, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id, 10);
      const cli = await db.execute(sql`SELECT organisation_name FROM ep_clients WHERE id = ${clientId}`);
      const orgName = (cli.rows[0] as any)?.organisation_name;
      const projectId = orgName === "ALLI Foundation" ? "alli-foundation-2024" : null;

      let completed: any[] = [], inProgress: any[] = [], comingNext: any[] = [], actionsNeeded: any[] = [];
      if (projectId) {
        const delivs = await db.execute(sql`SELECT * FROM client_deliverables WHERE project_id = ${projectId}`).catch(() => ({ rows: [] as any[] }));
        const now = Date.now();
        const weekAgo = now - 7 * 86400000;
        const weekAhead = now + 7 * 86400000;
        for (const d of delivs.rows as any[]) {
          const status = String(d.status || "").toLowerCase();
          if (status === "complete" || status === "delivered" || status === "approved") {
            const updated = d.updated_at ? new Date(d.updated_at).getTime() : 0;
            if (updated >= weekAgo) completed.push({ name: d.deliverable_name, phase: d.phase_number });
          } else if (status === "in_progress" || status === "in progress") {
            inProgress.push({ name: d.deliverable_name, phase: d.phase_number });
          }
          if (d.due_date) {
            const due = new Date(d.due_date).getTime();
            if (due >= now && due <= weekAhead && status !== "complete" && status !== "delivered" && status !== "approved") {
              comingNext.push({ name: d.deliverable_name, phase: d.phase_number, due_date: d.due_date });
            }
          }
          if ((status === "delivered" || status === "approved") && !d.client_approved) {
            actionsNeeded.push({ name: d.deliverable_name, action: "Review and approve" });
          }
        }
      }

      const narrative = await claudeAI(
        `You are EP Agent Chief of Staff writing a weekly progress report for ${orgName || "the client"} from Event Perfekt Global Ltd. Write a professional, warm progress report that celebrates what was completed, gives confidence about what is in progress, clearly states what is coming next week, and calls out any actions the client needs to take. Be specific — name the actual deliverables. Keep under 400 words. Use professional but warm language. End with a positive note about the overall trajectory. Output clean HTML (no <html>/<body> wrappers, just inner content with <h2>, <p>, <ul>, <strong>).`,
        `COMPLETED THIS WEEK:\n${JSON.stringify(completed)}\n\nIN PROGRESS:\n${JSON.stringify(inProgress)}\n\nCOMING NEXT WEEK:\n${JSON.stringify(comingNext)}\n\nCLIENT ACTIONS NEEDED:\n${JSON.stringify(actionsNeeded)}`,
        2500
      ).catch((e: any) => `<p>(EP Agent offline — ${e.message})</p><p>Manual progress report required.</p>`);

      const completionBase = completed.length + inProgress.length + comingNext.length;
      const progressPercent = completionBase > 0 ? Math.min(100, Math.round(((completed.length + (inProgress.length * 0.5)) / completionBase) * 100)) : 0;
      const rag = actionsNeeded.length > 2 ? "amber" : "green";
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const r = await db.execute(sql`
        INSERT INTO ep_progress_reports
          (client_id, report_week, completed_this_week, in_progress, coming_next_week, client_actions_needed, overall_status, rag_status, narrative, generated_by)
        VALUES (
          ${clientId}, ${weekStart.toISOString().slice(0, 10)},
          ${JSON.stringify(completed)}::jsonb, ${JSON.stringify(inProgress)}::jsonb,
          ${JSON.stringify(comingNext)}::jsonb, ${JSON.stringify(actionsNeeded)}::jsonb,
          ${progressPercent >= 70 ? "on_track" : progressPercent >= 40 ? "watch" : "at_risk"}, ${rag}, ${narrative}, 'ep_agent'
        )
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) {
      console.error("generate progress report error:", e);
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/ep-clients/:id/progress-reports/:reportId/approve", authenticateEPStaff, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id, 10);
      const r = await db.execute(sql`
        UPDATE ep_progress_reports
        SET approved_by = ${req.epUser.email || "ep_team"}, sent_to_client = true, sent_at = NOW()
        WHERE id = ${req.params.reportId} AND client_id = ${clientId}
        RETURNING *
      `);
      if (!r.rows[0]) return res.status(404).json({ message: "Report not found" });
      const cli = await db.execute(sql`SELECT organisation_name FROM ep_clients WHERE id = ${clientId}`);
      const orgName = (cli.rows[0] as any)?.organisation_name;
      const projectId = orgName === "ALLI Foundation" ? "alli-foundation-2024" : null;
      if (projectId) {
        const pu = await db.execute(sql`SELECT email, full_name FROM client_portal_users WHERE project_id = ${projectId} LIMIT 1`).catch(() => ({ rows: [] as any[] }));
        const pUser = (pu.rows[0] as any);
        if (pUser?.email) {
          sendEmail(pUser.email, `📊 Weekly Progress Report — Event Perfekt Global Ltd`,
            `<div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
              <h1 style="color:#3D0B0B;">Weekly Progress Report</h1>
              ${(r.rows[0] as any).narrative || ""}
              <p style="margin-top:24px;"><a href="https://www.eventperfekt.com/client-portal/progress-reports" style="background:#3D0B0B;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">View in Portal</a></p>
            </div>`
          ).catch(() => {});
          await db.execute(sql`
            INSERT INTO ep_client_notifications (client_id, recipient_email, type, title, message, link)
            VALUES (${clientId}, ${pUser.email}, 'progress_report', 'Weekly progress report ready', 'Your weekly progress report from Event Perfekt has arrived.', '/client-portal/progress-reports')
          `).catch(() => {});
        }
      }
      return res.json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CLIENT HEALTH SCORE
  // ═════════════════════════════════════════════════════════════════════════════
  app.get("/api/ep-clients/:id/health-score", authenticateEPStaff, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM ep_client_health_scores WHERE client_id = ${req.params.id} ORDER BY calculated_at DESC LIMIT 1`);
      return res.json(r.rows[0] || null);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/ep-clients/:id/health-score/calculate", authenticateEPStaff, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id, 10);
      const cli = await db.execute(sql`SELECT organisation_name FROM ep_clients WHERE id = ${clientId}`);
      const orgName = (cli.rows[0] as any)?.organisation_name;
      const projectId = orgName === "ALLI Foundation" ? "alli-foundation-2024" : null;

      let lastLogin: Date | null = null;
      if (projectId) {
        const lu = await db.execute(sql`SELECT last_login FROM client_portal_users WHERE project_id = ${projectId} ORDER BY last_login DESC NULLS LAST LIMIT 1`).catch(() => ({ rows: [] as any[] }));
        lastLogin = (lu.rows[0] as any)?.last_login ? new Date((lu.rows[0] as any).last_login) : null;
      }
      const daysSinceLogin = lastLogin ? Math.floor((Date.now() - lastLogin.getTime()) / 86400000) : 999;
      let score = 0;
      if (daysSinceLogin <= 7) score += 20;
      else if (daysSinceLogin <= 14) score += 10;

      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const docReviews = await db.execute(sql`SELECT COUNT(*) AS cnt FROM ep_document_comments WHERE client_id = ${clientId} AND commenter_type = 'client' AND created_at >= ${weekAgo as any}`);
      const docs = Math.min(parseInt((docReviews.rows[0] as any).cnt, 10) * 5, 20);
      score += docs;

      let approvalsCount = 0;
      if (projectId) {
        const ap = await db.execute(sql`SELECT COUNT(*) AS cnt FROM client_deliverables WHERE project_id = ${projectId} AND client_approved = true`).catch(() => ({ rows: [{ cnt: 0 } as any] }));
        approvalsCount = parseInt((ap.rows[0] as any).cnt, 10);
      }
      score += Math.min(approvalsCount * 10, 20);

      let msgCount = 0;
      if (projectId) {
        const m = await db.execute(sql`SELECT COUNT(*) AS cnt FROM client_portal_messages WHERE project_id = ${projectId} AND sender_type = 'client' AND created_at >= ${weekAgo as any}`).catch(() => ({ rows: [{ cnt: 0 } as any] }));
        msgCount = parseInt((m.rows[0] as any).cnt, 10);
      }
      score += Math.min(msgCount * 5, 10);

      const mt = await db.execute(sql`SELECT COUNT(*) AS cnt FROM ep_client_calendar_events WHERE client_id = ${clientId} AND client_response = 'accepted' AND start_date <= NOW()`);
      const mtCount = parseInt((mt.rows[0] as any).cnt, 10);
      score += Math.min(mtCount * 15, 15);

      let outstanding = 0;
      if (projectId) {
        const oa = await db.execute(sql`SELECT COUNT(*) AS cnt FROM client_deliverables WHERE project_id = ${projectId} AND status = 'delivered' AND (client_approved IS NULL OR client_approved = false)`).catch(() => ({ rows: [{ cnt: 0 } as any] }));
        outstanding = parseInt((oa.rows[0] as any).cnt, 10);
      }
      score -= outstanding * 5;
      score = Math.max(0, Math.min(100, score));

      let sentiment = "positive";
      if (projectId) {
        const lastMsgs = await db.execute(sql`SELECT content FROM client_portal_messages WHERE project_id = ${projectId} AND sender_type = 'client' ORDER BY created_at DESC LIMIT 5`).catch(() => ({ rows: [] as any[] }));
        if (lastMsgs.rows.length > 0) {
          try {
            const ans = await claudeAI(
              "You rate client message sentiment. Reply with ONE WORD only: Positive, Neutral, Concerned, or Frustrated.",
              (lastMsgs.rows as any[]).map((row: any) => row.content).join("\n---\n"),
              20
            );
            sentiment = (ans.trim().replace(/[^a-zA-Z]/g, "").toLowerCase() || "positive");
          } catch {}
        }
      }

      const flags: string[] = [];
      if (daysSinceLogin > 14) flags.push("No login in over 14 days");
      if (outstanding > 2) flags.push(`${outstanding} outstanding client actions`);
      if (sentiment === "frustrated" || sentiment === "concerned") flags.push(`Sentiment: ${sentiment}`);

      const r = await db.execute(sql`
        INSERT INTO ep_client_health_scores
          (client_id, score, last_login, documents_reviewed, messages_sent, approvals_given, meetings_attended, sentiment, sentiment_trend, flags)
        VALUES (
          ${clientId}, ${score}, ${(lastLogin as any) || null},
          ${Math.floor(docs / 5)}, ${msgCount}, ${approvalsCount}, ${mtCount},
          ${sentiment}, 'stable', ${JSON.stringify(flags)}::jsonb
        )
        RETURNING *
      `);

      if (score < 60 || sentiment === "frustrated" || sentiment === "concerned") {
        sendEmail("info@eventperfekt.com", `⚠ Client Health Alert — ${orgName || "Client"}`,
          `<p>${orgName} engagement health score has dropped to <strong>${score}</strong>.</p>
           <p>Last login: ${lastLogin ? lastLogin.toLocaleDateString("en-GB") : "unknown"}. Sentiment: ${sentiment}. ${outstanding} outstanding actions.</p>
           <p>Flags: ${flags.join(", ") || "none"}.</p>
           <p>Consider reaching out directly.</p>`
        ).catch(() => {});
      }
      return res.json(r.rows[0]);
    } catch (e: any) {
      console.error("health-score calculate error:", e);
      return res.status(500).json({ message: e.message });
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PROPOSALS
  // ═════════════════════════════════════════════════════════════════════════════
  app.get("/api/ep-client-portal/proposals", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const r = await db.execute(sql`SELECT * FROM ep_proposals WHERE client_id = ${clientId} ORDER BY created_at DESC`);
      return res.json(r.rows);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/ep-clients/:id/proposals", authenticateEPStaff, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM ep_proposals WHERE client_id = ${req.params.id} ORDER BY created_at DESC`);
      return res.json(r.rows);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/ep-client-portal/proposals/request", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      const { proposal_title, proposal_type, target_funder, target_amount, brief } = req.body;
      const r = await db.execute(sql`
        INSERT INTO ep_proposals
          (client_id, proposal_title, proposal_type, target_funder, target_amount, brief, status, created_by)
        VALUES (${clientId}, ${proposal_title}, ${proposal_type}, ${target_funder || null}, ${target_amount || null}, ${brief || null}, 'requested', ${req.portalUser.email})
        RETURNING *
      `);
      sendEmail("info@eventperfekt.com", `📝 Proposal requested — ${req.portalUser.organisation}`,
        `<p>${req.portalUser.fullName} requested a proposal: <strong>${proposal_title}</strong> — ${proposal_type} — ${target_funder || ""} ${target_amount || ""}</p>
         <p>Brief: ${brief || "(none)"}</p>`).catch(() => {});
      return res.status(201).json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/ep-clients/:id/proposals/generate", authenticateEPStaff, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id, 10);
      const { proposal_title, proposal_type, target_funder, target_amount, brief } = req.body;
      const cli = await db.execute(sql`SELECT organisation_name FROM ep_clients WHERE id = ${clientId}`);
      const orgName = (cli.rows[0] as any)?.organisation_name || "Client";
      const projectId = orgName === "ALLI Foundation" ? "alli-foundation-2024" : null;

      let delivContext = "";
      if (projectId) {
        const delivs = await db.execute(sql`SELECT deliverable_name, phase_number, status FROM client_deliverables WHERE project_id = ${projectId} AND status IN ('complete', 'delivered') LIMIT 20`).catch(() => ({ rows: [] as any[] }));
        delivContext = (delivs.rows as any[]).map((d: any) => `• Phase ${d.phase_number}: ${d.deliverable_name}`).join("\n");
      }
      const savedArts = await db.execute(sql`SELECT title, summary FROM ep_intelligence_articles WHERE client_id = ${clientId} ORDER BY relevance_score DESC LIMIT 8`);
      const evidence = (savedArts.rows as any[]).map((a: any) => `• ${a.title} — ${a.summary}`).join("\n");

      const systemPrompt = `You are EP Agent — an expert funding proposal writer specialising in UK charity and community sector proposals. You are writing a ${proposal_type} for ${orgName} — Charity No. 1182529 — targeting ${target_funder || "a funder"} for ${target_amount || "TBD"}.

${EP_AGENT_INTEL_PROMPT}

COMPLETED DELIVERABLES TO USE AS SOURCE MATERIAL:
${delivContext || "(none available)"}

EVIDENCE BASE FROM RESEARCH:
${evidence || "(none saved)"}

Write a compelling funding proposal that:
1. Opens with impact — a specific story or statistic
2. Clearly defines the problem ALLI addresses
3. Explains ALLI's unique facilitation model — Find, Assess, Match, Follow Up
4. References Michael Jibowu as proof of concept
5. Aligns with the funder's specific priorities
6. Includes a clear theory of change
7. States specifically what the funding will enable
8. Includes an outcomes framework
9. References the government Plan to Halve Knife Crime as policy alignment
10. Ends with a compelling call to action

Format professionally with clear section headings in markdown.`;

      let content = "";
      try {
        content = await claudeAI(systemPrompt, `Proposal brief: ${brief || "(none)"}\n\nGenerate the full proposal now.`, 6000);
      } catch (e: any) {
        content = `# ${proposal_title}\n\n(EP Agent offline: ${e.message})\n\nBrief: ${brief}`;
      }

      const r = await db.execute(sql`
        INSERT INTO ep_proposals
          (client_id, proposal_title, proposal_type, target_funder, target_amount, brief, generated_content, status, created_by)
        VALUES (
          ${clientId}, ${proposal_title}, ${proposal_type}, ${target_funder || null}, ${target_amount || null},
          ${brief || null}, ${content}, 'draft', ${req.epUser.email || "ep_agent"}
        )
        RETURNING *
      `);
      const propId = (r.rows[0] as any).id;
      const fileName = `proposal-${propId}-${Date.now()}.md`;
      const fileUrl = await uploadBuffer(Buffer.from(content), "text/markdown", "ep-client", fileName);
      const docRow = await db.execute(sql`
        INSERT INTO ep_client_document_versions
          (client_id, document_name, document_category, document_subcategory, document_type, current_version, uploaded_by, uploaded_by_type, shared_with_client)
        VALUES (${clientId}, ${proposal_title}, 'Proposals', ${target_funder || "General"}, ${proposal_type}, 1, ${req.epUser.email || "ep_agent"}, 'ep_agent', false)
        RETURNING id
      `);
      await db.execute(sql`
        INSERT INTO ep_client_document_files
          (document_id, client_id, version_number, file_url, file_name, file_size, file_type, uploaded_by, uploaded_by_type, is_current)
        VALUES (${(docRow.rows[0] as any).id}, ${clientId}, 1, ${fileUrl}, ${fileName}, ${Buffer.byteLength(content)}, 'text/markdown', ${req.epUser.email || "ep_agent"}, 'ep_agent', true)
      `);
      await db.execute(sql`UPDATE ep_proposals SET document_url = ${fileUrl} WHERE id = ${propId}`);
      return res.status(201).json({ ...(r.rows[0] as any), document_url: fileUrl });
    } catch (e: any) {
      console.error("proposal generate error:", e);
      return res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/ep-clients/:id/proposals/:propId", authenticateEPStaff, async (req: any, res) => {
    try {
      const { proposal_title, generated_content, status, target_funder, target_amount } = req.body;
      const r = await db.execute(sql`
        UPDATE ep_proposals
        SET proposal_title = COALESCE(${proposal_title || null}, proposal_title),
            generated_content = COALESCE(${generated_content || null}, generated_content),
            status = COALESCE(${status || null}, status),
            target_funder = COALESCE(${target_funder || null}, target_funder),
            target_amount = COALESCE(${target_amount || null}, target_amount),
            updated_at = NOW()
        WHERE id = ${req.params.propId} AND client_id = ${req.params.id}
        RETURNING *
      `);
      if (!r.rows[0]) return res.status(404).json({ message: "Proposal not found" });
      return res.json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // VIDEOS
  // ═════════════════════════════════════════════════════════════════════════════
  app.get("/api/ep-client-portal/videos", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const r = await db.execute(sql`SELECT * FROM ep_portal_videos WHERE client_id = ${clientId} ORDER BY is_featured DESC, created_at DESC`);
      return res.json(r.rows);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/ep-clients/:id/videos", authenticateEPStaff, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM ep_portal_videos WHERE client_id = ${req.params.id} ORDER BY is_featured DESC, created_at DESC`);
      return res.json(r.rows);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/ep-clients/:id/videos/upload", authenticateEPStaff, upload.single("file"), async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id, 10);
      const { title, description, category, video_url, video_type, thumbnail_url, is_featured } = req.body;
      let finalVideoUrl = video_url;
      let finalType = video_type || "external_youtube";
      if (req.file) {
        finalVideoUrl = await uploadBuffer(req.file.buffer, req.file.mimetype, "ep-client", req.file.originalname);
        finalType = "uploaded";
      }
      if (!finalVideoUrl) return res.status(400).json({ message: "Video file or URL required" });
      const r = await db.execute(sql`
        INSERT INTO ep_portal_videos
          (client_id, title, description, video_url, thumbnail_url, video_type, category, source, uploaded_by, uploaded_by_type, is_featured)
        VALUES (
          ${clientId}, ${title}, ${description || null}, ${finalVideoUrl},
          ${thumbnail_url || null}, ${finalType}, ${category || "Other"}, 'EP Team',
          ${req.epUser.email || "ep_team"}, 'ep_team', ${is_featured === "true" || is_featured === true}
        )
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) {
      console.error("video upload error:", e);
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/ep-client-portal/videos/:id/view", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      await db.execute(sql`UPDATE ep_portal_videos SET view_count = view_count + 1 WHERE id = ${req.params.id} AND client_id = ${clientId}`);
      return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/ep-clients/:id/videos/:videoId", authenticateEPStaff, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM ep_portal_videos WHERE id = ${req.params.videoId} AND client_id = ${req.params.id}`);
      return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═════════════════════════════════════════════════════════════════════════════
  app.get("/api/ep-client-portal/notifications", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.json([]);
      const r = await db.execute(sql`
        SELECT * FROM ep_client_notifications
        WHERE client_id = ${clientId} AND (recipient_email = ${req.portalUser.email} OR recipient_email IS NULL)
        ORDER BY created_at DESC LIMIT 50
      `);
      return res.json(r.rows);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/ep-client-portal/notifications/mark-all-read", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      await db.execute(sql`UPDATE ep_client_notifications SET is_read = true WHERE client_id = ${clientId} AND (recipient_email = ${req.portalUser.email} OR recipient_email IS NULL)`);
      return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/ep-client-portal/notifications/:id/read", authenticateClientPortal, async (req: any, res) => {
    try {
      const clientId = await clientIdForPortalUser(req.portalUser);
      if (!clientId) return res.status(404).json({ message: "Client not found" });
      await db.execute(sql`UPDATE ep_client_notifications SET is_read = true WHERE id = ${req.params.id} AND client_id = ${clientId}`);
      return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SOW (STATEMENT OF WORK) ROUTES — EP Agent
  // ═════════════════════════════════════════════════════════════════════════════
  ensureSignaturesTable().catch(e => console.error("[EPClient] SOW table ensure failed:", e.message));

  // Generate a new SOW. Auth: EP staff.
  app.post("/api/ep-clients/generate-sow", authenticateEPStaff, async (req: any, res) => {
    try {
      const body = req.body as SowInput;
      if (!body?.organisation_name || !body?.contact_name || !body?.project_description) {
        return res.status(400).json({ message: "organisation_name, contact_name and project_description are required" });
      }
      const result = await generateAndPersistSow(body);
      return res.json(result);
    } catch (e: any) {
      console.error("[SOW] generate error:", e);
      return res.status(500).json({ message: e.message || "SOW generation failed" });
    }
  });

  // Revise an existing SOW with a director's instruction.
  app.post("/api/ep-clients/sow/:id/revise", authenticateEPStaff, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { instruction, input } = req.body as { instruction: string; input: SowInput };
      if (!instruction || !input) return res.status(400).json({ message: "instruction and input required" });
      const result = await reviseAndRegenerateSow(id, instruction, input);
      return res.json(result);
    } catch (e: any) {
      console.error("[SOW] revise error:", e);
      return res.status(500).json({ message: e.message || "SOW revision failed" });
    }
  });

  // List SOWs for a client.
  app.get("/api/ep-clients/:clientId/sow", authenticateEPStaff, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const rows = await db.execute(sql`
        SELECT id, client_id, document_type, document_name, document_url, status, review, created_at, updated_at
        FROM ep_client_signatures
        WHERE client_id = ${clientId} AND document_type = 'SOW'
        ORDER BY created_at DESC
      `);
      return res.json(rows.rows);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Fetch full SOW (for review panel / preview HTML).
  app.get("/api/ep-clients/sow/:id", authenticateEPStaff, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const rows = await db.execute(sql`SELECT * FROM ep_client_signatures WHERE id = ${id} LIMIT 1`);
      if (!rows.rows.length) return res.status(404).json({ message: "SOW not found" });
      const row = rows.rows[0] as any;
      const sow = row.generated_content;
      const sowInput: SowInput = {
        organisation_name: sow?.title?.match(/—\s*(.+?)\s*—/)?.[1] || "Client",
        contact_name: row.signed_by || "Client Contact",
        engagement_type: "",
        project_description: "",
      };
      return res.json({
        ...row,
        preview_html: sow ? renderSowHtml(sow, sowInput) : null,
      });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Approve + attach SOW to a client's onboarding record.
  app.post("/api/ep-clients/sow/:id/approve", authenticateEPStaff, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { client_id } = req.body || {};
      await db.execute(sql`
        UPDATE ep_client_signatures
        SET status = 'approved', client_id = COALESCE(client_id, ${client_id ?? null}), updated_at = NOW()
        WHERE id = ${id}
      `);
      return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Expose standard terms to client for display.
  app.get("/api/ep-clients/standard-terms", authenticateEPStaff, (_req, res) => {
    return res.json(EP_STANDARD_TERMS);
  });

  // Retroactively generate ALLI Foundation SOW.
  app.post("/api/ep-clients/alli/seed-sow", authenticateEPStaff, async (_req: any, res) => {
    try {
      const clientId = await getOrCreateAlliClientId();
      const input: SowInput = {
        organisation_name: "ALLI Foundation",
        contact_name: "Kehinde Alli",
        engagement_type: "Programme Delivery Consultancy",
        package_selected: "Package C — Full Programme Design, Structuring and Launch",
        project_description:
          "ALLI Foundation is a UK registered charity (Charity No. 1182529) that supports young people aged 16–21 affected by knife crime and gang involvement. They find young people at risk, assess their needs, and need to build a structured facilitation and coordination model. Event Perfekt has been commissioned to design their operating model across three phases and position them for institutional funding including VRUs, borough councils, and trusts. Michael Jibowu — featured by the Home Office April 2026 — is their proof of concept.",
        start_date: "2026-04-13",
        end_date: "2026-05-25",
        fee_amount: 4500,
        fee_currency: "GBP",
        mobilisation_fee: "£3,000 already received on signature",
        balance_fee: "£1,500 on Phase 3 completion",
        client_id: clientId,
        project_name: "Full Programme Design, Structuring and Launch",
        deliverables: [
          {
            phase_number: 1,
            phase_name: "Strategic Foundation",
            timeline: "Weeks 1–2",
            purpose: "Establish ALLI's positioning, market entry roadmap, and strategic document.",
            activities: ["Organisation review", "Positioning workshop", "Market entry mapping", "Partner identification"],
            deliverables: ["Strategic document", "Positioning statement", "Market entry roadmap", "Initial partner map"],
            outcome: "Clarity and strategic foundation ALLI can build on.",
          },
          {
            phase_number: 2,
            phase_name: "Model Design",
            timeline: "Weeks 3–4",
            purpose: "Design the participant pathway, safeguarding structure, and funding blueprint.",
            activities: ["Participant pathway design", "Safeguarding structure", "Referral process design", "Funding blueprint"],
            deliverables: ["Programme framework", "Safeguarding policy", "Referral process", "Funding blueprint", "Partner identification list"],
            outcome: "A programme funders can say yes to.",
          },
          {
            phase_number: 3,
            phase_name: "Full Launch",
            timeline: "Weeks 5–6",
            purpose: "Open borough and school doors, identify sponsors, write proposals, open revenue conversations.",
            activities: ["Borough and school outreach", "Sponsor identification", "Proposal writing", "Funding applications", "Partner outreach"],
            deliverables: ["Launch package", "Proposal suite", "Sponsor pipeline", "Funding application set"],
            outcome: "Structure, access, and revenue in place.",
          },
        ],
      };

      const result = await generateAndPersistSow(input);

      // Attach as document record on client
      await db.execute(sql`
        UPDATE ep_client_signatures
        SET client_id = ${clientId}, status = 'approved', updated_at = NOW()
        WHERE id = ${result.id}
      `);

      return res.json({ ok: true, client_id: clientId, ...result });
    } catch (e: any) {
      console.error("[SOW] ALLI seed error:", e);
      return res.status(500).json({ message: e.message || "ALLI SOW seed failed" });
    }
  });
}
