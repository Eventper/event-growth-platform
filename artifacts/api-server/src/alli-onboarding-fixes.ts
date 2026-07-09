import { Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { sendWhatsAppMessage } from "./whatsappService";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "event-perfekt-secret-2024";

const ALLI_PROJECT_REF = "alli-foundation-2024";
const ALLI_PRIMARY_EMAIL = "kalli@allifoundation.org";
const ALLI_CC_EMAILS = ["Kehindeballi@gmail.com", "agboola@jobtrolley.co"];
const PRABHLEEN_EMAIL = "prabhleentak@gmail.com";
const ABRAHAM_EMAIL = "abtaiwo123@gmail.com";

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

// ─── Table bootstrap ──────────────────────────────────────────────────────────
async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS outbound_communications_queue (
      id SERIAL PRIMARY KEY,
      client_id INTEGER,
      contract_id INTEGER,
      to_email VARCHAR(255) NOT NULL,
      cc_emails TEXT,
      from_alias VARCHAR(50) DEFAULT 'info',
      subject TEXT,
      body TEXT,
      context VARCHAR(100),
      reference_id VARCHAR(100) UNIQUE,
      urgency VARCHAR(20) DEFAULT 'normal',
      status VARCHAR(50) DEFAULT 'pending_approval',
      created_at TIMESTAMP DEFAULT NOW(),
      approved_by VARCHAR(255),
      approved_at TIMESTAMP,
      sent_at TIMESTAMP,
      send_error TEXT
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ep_staff_tasks (
      id SERIAL PRIMARY KEY,
      assignee_email VARCHAR(255) NOT NULL,
      project_reference VARCHAR(100),
      client_id INTEGER,
      reference_key VARCHAR(150) UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      priority VARCHAR(20) DEFAULT 'medium',
      due_date TIMESTAMP,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ep_project_finance (
      id SERIAL PRIMARY KEY,
      project_reference VARCHAR(100),
      client_id INTEGER,
      invoice_ref VARCHAR(100) UNIQUE,
      description TEXT,
      amount NUMERIC(12,2),
      currency VARCHAR(10) DEFAULT 'GBP',
      status VARCHAR(50) DEFAULT 'pending',
      issued_date TIMESTAMP,
      paid_date TIMESTAMP,
      payment_method VARCHAR(100),
      recorded_by VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ep_portal_notifications (
      id SERIAL PRIMARY KEY,
      recipient_email VARCHAR(255) NOT NULL,
      title TEXT,
      message TEXT,
      link TEXT,
      read BOOLEAN DEFAULT false,
      reference_key VARCHAR(150),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ep_crm_organisations (
      id SERIAL PRIMARY KEY,
      source_client_id INTEGER UNIQUE,
      organisation VARCHAR(255) NOT NULL,
      charity_number VARCHAR(50),
      website VARCHAR(255),
      engagement_type VARCHAR(100),
      assigned_to VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active_client',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ep_crm_contacts (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER REFERENCES ep_crm_organisations(id) ON DELETE CASCADE,
      full_name VARCHAR(255),
      email VARCHAR(255),
      role VARCHAR(255),
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (organisation_id, email)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ep_agent_weekly_plan_context (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) UNIQUE,
      project_reference VARCHAR(100),
      context_text TEXT,
      project_active BOOLEAN DEFAULT false,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Extra columns on ep_clients
  await db.execute(sql`ALTER TABLE ep_clients ADD COLUMN IF NOT EXISTS finance_lead VARCHAR(255)`).catch(() => {});
  await db.execute(sql`ALTER TABLE ep_clients ADD COLUMN IF NOT EXISTS project_lead VARCHAR(255)`).catch(() => {});
  await db.execute(sql`ALTER TABLE ep_clients ADD COLUMN IF NOT EXISTS project_reference VARCHAR(100)`).catch(() => {});
  await db.execute(sql`ALTER TABLE ep_clients ADD COLUMN IF NOT EXISTS project_active BOOLEAN DEFAULT false`).catch(() => {});

  // Extra columns on client_portal_users for first-login reset
  await db.execute(sql`ALTER TABLE client_portal_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false`).catch(() => {});
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export async function addCrmRecordsForClient(clientId: number): Promise<void> {
  try {
    const c = await db.execute(sql`SELECT * FROM ep_clients WHERE id = ${clientId}`);
    const row = (c.rows[0] as any);
    if (!row) return;
    const existing = await db.execute(sql`SELECT id FROM ep_crm_organisations WHERE source_client_id = ${clientId}`);
    let orgId: number;
    if (existing.rows[0]) {
      orgId = (existing.rows[0] as any).id;
    } else {
      const ins = await db.execute(sql`
        INSERT INTO ep_crm_organisations (source_client_id, organisation, charity_number, website, engagement_type, assigned_to, status)
        VALUES (
          ${clientId}, ${row.organisation_name},
          ${row.company_reg_number || null},
          ${row.website || null},
          ${row.engagement_type || null},
          ${row.assigned_to || 'info@eventperfekt.com'},
          ${row.status === 'active' ? 'active_client' : (row.status || 'prospect')}
        )
        RETURNING id
      `);
      orgId = (ins.rows[0] as any).id;
    }
    // Copy ep_client_contacts to crm_contacts
    const contacts = await db.execute(sql`SELECT * FROM ep_client_contacts WHERE client_id = ${clientId}`).catch(() => ({ rows: [] as any[] }));
    for (const c of (contacts.rows as any[])) {
      await db.execute(sql`
        INSERT INTO ep_crm_contacts (organisation_id, full_name, email, role, is_primary)
        VALUES (${orgId}, ${c.full_name}, ${c.email}, ${c.job_title || null}, ${!!c.is_primary})
        ON CONFLICT (organisation_id, email) DO NOTHING
      `);
    }
  } catch (e: any) {
    console.error("[ALLI] addCrmRecordsForClient error:", e.message);
  }
}

async function getAlliClientId(): Promise<number | null> {
  const r = await db.execute(sql`SELECT id FROM ep_clients WHERE organisation_name = 'ALLI Foundation' LIMIT 1`);
  return r.rows[0] ? (r.rows[0] as any).id : null;
}

async function queueCommunication(opts: {
  clientId?: number | null;
  contractId?: number | null;
  to: string;
  cc?: string[];
  fromAlias?: string;
  subject: string;
  body: string;
  context: string;
  referenceId: string;
  urgency?: string;
}) {
  await db.execute(sql`
    INSERT INTO outbound_communications_queue
      (client_id, contract_id, to_email, cc_emails, from_alias, subject, body, context, reference_id, urgency, status)
    VALUES (
      ${opts.clientId || null}, ${opts.contractId || null},
      ${opts.to}, ${(opts.cc || []).join(", ")},
      ${opts.fromAlias || 'info'}, ${opts.subject}, ${opts.body},
      ${opts.context}, ${opts.referenceId}, ${opts.urgency || 'normal'},
      'pending_approval'
    )
    ON CONFLICT (reference_id) DO NOTHING
  `);
}

export async function triggerCountersignSequence(clientId: number, contractId: number): Promise<void> {
  try {
    // Step 1 — Create client portal account for ALLI primary contact
    const tempPassword = "ALLIPortal2026!";
    const hash = await bcrypt.hash(tempPassword, 10);
    await db.execute(sql`
      INSERT INTO client_portal_users (email, password_hash, full_name, organisation, project_id, must_change_password)
      VALUES (${ALLI_PRIMARY_EMAIL}, ${hash}, 'Kehinde Alli', 'ALLI Foundation', ${ALLI_PROJECT_REF}, true)
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            must_change_password = true,
            organisation = EXCLUDED.organisation,
            project_id = EXCLUDED.project_id
    `);

    // Step 2 — Welcome email (queued for approval)
    const welcomeHtml = brandedEmail(`
      <p>Dear Mr Kehinde and team,</p>
      <p>Thank you for signing the Statement of Work. We are delighted to formally begin this engagement.</p>
      <p>Your client portal is now active. You can use it to track project progress, review and approve deliverables, access all documents, and communicate directly with our team.</p>
      <p><strong>Portal access details:</strong><br/>
        URL: <a href="https://eventperfekt.net/client-portal/login">eventperfekt.net/client-portal/login</a><br/>
        Email: ${ALLI_PRIMARY_EMAIL}<br/>
        Temporary password: ${tempPassword}</p>
      <p>Please change your password on first login.</p>
      <p>Kind regards<br/>Tolu Johnson<br/>Founder and Director<br/>Event Perfekt Global Ltd</p>
    `);
    await queueCommunication({
      clientId, contractId,
      to: ALLI_PRIMARY_EMAIL,
      cc: ALLI_CC_EMAILS,
      subject: "Welcome to Your Event Perfekt Client Portal — ALLI Foundation",
      body: welcomeHtml,
      context: "portal_welcome",
      referenceId: `ALLI-WELCOME-${contractId}`,
    });

    // Step 3 — Kickoff meeting invitation email (queued for approval)
    const kickoffHtml = brandedEmail(`
      <p>Dear Mr Kehinde and team,</p>
      <p>Now that we have completed all formalities we are ready to begin.</p>
      <p>We would like to schedule our Project Kickoff at your earliest convenience.</p>
      <p>The kickoff will cover:</p>
      <ul>
        <li>Introduction to the engagement and our approach</li>
        <li>Review of deliverables and timeline</li>
        <li>Phase 1 priorities</li>
        <li>Communication and working protocols</li>
        <li>Questions and next steps</li>
      </ul>
      <p>Please reply with your preferred date, time, and whether you would prefer an in-person meeting or a call.</p>
      <p>We look forward to getting started.</p>
      <p>Kind regards<br/>Tolu Johnson<br/>Founder and Director<br/>Event Perfekt Global Ltd<br/>info@eventperfekt.com</p>
    `);
    await queueCommunication({
      clientId, contractId,
      to: ALLI_PRIMARY_EMAIL,
      cc: ALLI_CC_EMAILS,
      subject: "ALLI Foundation — Project Kickoff — Event Perfekt Global Ltd",
      body: kickoffHtml,
      context: "kickoff_invitation",
      referenceId: `ALLI-KICKOFF-${contractId}`,
    });

    // Step 4 — Activate project in Group Staff Portal
    await db.execute(sql`
      UPDATE ep_clients SET status = 'active', project_active = true, updated_at = NOW()
      WHERE id = ${clientId}
    `);
    // Notify Prabhleen and Abraham that project is live
    for (const email of [PRABHLEEN_EMAIL, ABRAHAM_EMAIL]) {
      await db.execute(sql`
        INSERT INTO ep_portal_notifications (recipient_email, title, message, link, reference_key)
        VALUES (
          ${email},
          ${'ALLI Foundation project is now LIVE'},
          ${'The Statement of Work has been countersigned. The project is now active in the staff portal. Your Week 1 plan will be generated by EP Agent on Monday.'},
          ${'/portal/eventperfekt/projects'},
          ${`ALLI-ACTIVATED-${contractId}-${email}`}
        )
        ON CONFLICT DO NOTHING
      `).catch(() => {});
    }

    // Step 5 — Flag EP Agent to include ALLI tasks in next Monday weekly plans
    for (const email of [PRABHLEEN_EMAIL, ABRAHAM_EMAIL]) {
      await db.execute(sql`
        INSERT INTO ep_agent_weekly_plan_context (user_email, project_reference, project_active, updated_at)
        VALUES (${email}, ${ALLI_PROJECT_REF}, true, NOW())
        ON CONFLICT (user_email) DO UPDATE
          SET project_reference = EXCLUDED.project_reference,
              project_active = true,
              updated_at = NOW()
      `);
    }

    console.log(`[ALLI] Countersign sequence complete for client ${clientId}, contract ${contractId}`);
  } catch (e: any) {
    console.error("[ALLI] triggerCountersignSequence error:", e.message);
    throw e;
  }
}

function brandedEmail(inner: string): string {
  return `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;line-height:1.55;">
      <div style="background:#3D0B0B;color:#fff;padding:20px 28px;">
        <h2 style="margin:0;font-weight:normal;letter-spacing:1px;">Event Perfekt Global Ltd</h2>
      </div>
      <div style="padding:24px 28px;background:#fff;">${inner}</div>
      <div style="padding:14px 28px;background:#fafafa;color:#888;font-size:11px;border-top:1px solid #eee;">
        Event Perfekt Global Ltd · Company No. 15875326 · 20 Wenlock Road, London, N1 7PG · info@eventperfekt.com · www.eventperfekt.com
      </div>
    </div>
  `;
}

// ─── ALLI one-time seed actions ───────────────────────────────────────────────

async function seedAlliWeek1() {
  const alliId = await getAlliClientId();
  if (!alliId) {
    console.warn("[ALLI] seedAlliWeek1 — ALLI client not found yet");
    return;
  }

  // FIX 3 — Finance/project lead on the ALLI client
  await db.execute(sql`
    UPDATE ep_clients
    SET finance_lead = ${PRABHLEEN_EMAIL},
        project_lead = ${PRABHLEEN_EMAIL},
        project_reference = ${ALLI_PROJECT_REF},
        updated_at = NOW()
    WHERE id = ${alliId}
  `);

  // FIX 2 — CRM organisation + three trustee contacts (ALLI-specific)
  const existingOrg = await db.execute(sql`SELECT id FROM ep_crm_organisations WHERE source_client_id = ${alliId}`);
  let orgId: number;
  if (existingOrg.rows[0]) {
    orgId = (existingOrg.rows[0] as any).id;
    await db.execute(sql`
      UPDATE ep_crm_organisations
      SET organisation = 'ALLI Foundation',
          charity_number = '1182529',
          website = 'allifoundation.org',
          engagement_type = 'Programme Delivery Consultancy',
          assigned_to = 'info@eventperfekt.com',
          status = 'active_client'
      WHERE id = ${orgId}
    `);
  } else {
    const ins = await db.execute(sql`
      INSERT INTO ep_crm_organisations (source_client_id, organisation, charity_number, website, engagement_type, assigned_to, status)
      VALUES (${alliId}, 'ALLI Foundation', '1182529', 'allifoundation.org', 'Programme Delivery Consultancy', 'info@eventperfekt.com', 'active_client')
      RETURNING id
    `);
    orgId = (ins.rows[0] as any).id;
  }
  const contacts = [
    { full: "Kehinde Alli", email: ALLI_PRIMARY_EMAIL, role: "Primary Contact — Trustee and Founder", primary: true },
    { full: "Kehinde Alli", email: "Kehindeballi@gmail.com", role: "Trustee", primary: false },
    { full: "Agboola Afolabi Ogundeyin", email: "agboola@jobtrolley.co", role: "Trustee", primary: false },
  ];
  for (const c of contacts) {
    await db.execute(sql`
      INSERT INTO ep_crm_contacts (organisation_id, full_name, email, role, is_primary)
      VALUES (${orgId}, ${c.full}, ${c.email}, ${c.role}, ${c.primary})
      ON CONFLICT (organisation_id, email) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_primary = EXCLUDED.is_primary
    `);
  }

  // FIX 4 — Abraham research tasks
  const abrahamTasks: Array<{ title: string; priority: string; days: number }> = [
    { title: "Map the UK knife crime and youth violence prevention landscape — key organisations, government bodies, VRUs, charities", priority: "high", days: 7 },
    { title: "Research the government Plan to Halve Knife Crime — Protecting Lives Building Hope — April 2026 — extract all funding streams and contact points", priority: "high", days: 7 },
    { title: "Research all Violence Reduction Units in London — who runs them, what they fund, who to contact", priority: "high", days: 10 },
    { title: "Research Michael Jibowu — full background, current work, Home Office connection — document as ALLI case study proof of concept", priority: "high", days: 7 },
    { title: "Research London borough councils with youth violence prevention budgets — Tower Hamlets, Hackney, Southwark, Lambeth, Lewisham, Haringey, Newham, Brent", priority: "high", days: 10 },
    { title: "Research Young Futures Hubs — which 8 are open, who manages them, how community organisations can get involved", priority: "medium", days: 10 },
    { title: "Research trusts and foundations actively funding knife crime prevention — Henry Smith, Esmée Fairbairn, Comic Relief, Lloyds Bank Foundation, Paul Hamlyn, National Lottery Community Fund", priority: "high", days: 14 },
    { title: "Research corporate sponsors aligned to youth safety and social mobility", priority: "medium", days: 14 },
    { title: "Research delivery organisations who can receive ALLI referrals — mentors, therapists, education providers, youth workers, probation services, gang exit programmes", priority: "high", days: 14 },
    { title: "Compile all research into a structured research briefing document using EP Agent", priority: "high", days: 14 },
  ];
  for (let i = 0; i < abrahamTasks.length; i++) {
    const t = abrahamTasks[i];
    const refKey = `ALLI-ABRAHAM-R${i + 1}`;
    await db.execute(sql`
      INSERT INTO ep_staff_tasks
        (assignee_email, project_reference, client_id, reference_key, title, description, priority, due_date, status)
      VALUES (
        ${ABRAHAM_EMAIL}, ${ALLI_PROJECT_REF}, ${alliId}, ${refKey},
        ${`Research Task ${i + 1}: ${t.title}`},
        ${`Week 1 research task — concurrent with Prabhleen. Due ${t.days} days from start. Use EP Agent Research and Outreach Engine and Intelligence Hub.`},
        ${t.priority},
        ${sql.raw(`NOW() + INTERVAL '${t.days} days'`)},
        'pending'
      )
      ON CONFLICT (reference_key) DO NOTHING
    `);
  }

  // FIX 5 — EP Agent weekly plan context for Prabhleen and Abraham
  const prabhleenContext = `You are planning Prabhleen Tak's week. She is Finance Administration and Bid Support Intern at Event Perfekt Global Ltd. She is Project Lead on ALLI Foundation — Youth Violence Prevention Model Design. Week 1 priorities: organisational review and gap analysis, website and positioning audit, facilitation model audit, key risks identification. She must also track project finance — £3,000 mobilisation received, £1,500 balance due on Phase 3. Use EP Agent Research Engine and Intelligence Hub to support her work. She should ask EP Agent to help draft documents.`;
  const abrahamContext = `You are planning Abraham Taiwo's week. He is Events Nigeria Intern at Event Perfekt Global Ltd. He is Research Support on ALLI Foundation — Youth Violence Prevention Model Design. Week 1 priorities: researching UK knife crime landscape, government Plan to Halve Knife Crime funding streams, Violence Reduction Units, Michael Jibowu background, London borough councils with youth violence budgets. He should use the Research and Outreach Engine and Intelligence Hub. All research findings should be compiled into structured documents using EP Agent.`;
  await db.execute(sql`
    INSERT INTO ep_agent_weekly_plan_context (user_email, project_reference, context_text, project_active)
    VALUES (${PRABHLEEN_EMAIL}, ${ALLI_PROJECT_REF}, ${prabhleenContext}, true)
    ON CONFLICT (user_email) DO UPDATE
      SET context_text = EXCLUDED.context_text,
          project_reference = EXCLUDED.project_reference,
          project_active = true,
          updated_at = NOW()
  `);
  await db.execute(sql`
    INSERT INTO ep_agent_weekly_plan_context (user_email, project_reference, context_text, project_active)
    VALUES (${ABRAHAM_EMAIL}, ${ALLI_PROJECT_REF}, ${abrahamContext}, true)
    ON CONFLICT (user_email) DO UPDATE
      SET context_text = EXCLUDED.context_text,
          project_reference = EXCLUDED.project_reference,
          project_active = true,
          updated_at = NOW()
  `);

  // FIX 6 — Portal notifications + WhatsApp (best-effort)
  const prabhleenNotif = {
    title: "ALLI Foundation — You are Project Lead — Week 1 Starts Wednesday",
    message: "You are the project lead on ALLI Foundation Youth Violence Prevention. Your Week 1 priorities are the organisational review, website audit, and facilitation model audit. You are also tracking project finance. EP Agent will give you a full week plan on Monday. The SOW is being sent to ALLI today for signature.",
    link: "/portal/eventperfekt/projects",
    refKey: "ALLI-NOTIF-PRABHLEEN-WEEK1",
  };
  const abrahamNotif = {
    title: "ALLI Foundation — You are Research Support — Week 1 Starts Wednesday",
    message: "You are supporting ALLI Foundation as Research Lead in Week 1. Your job is to research the UK knife crime landscape, government funding streams, Violence Reduction Units, and London borough councils with youth violence budgets. Use the Research and Outreach Engine and Intelligence Hub. EP Agent will give you a full research plan on Monday.",
    link: "/portal/eventperfekt/projects",
    refKey: "ALLI-NOTIF-ABRAHAM-WEEK1",
  };
  for (const { email, n } of [
    { email: PRABHLEEN_EMAIL, n: prabhleenNotif },
    { email: ABRAHAM_EMAIL, n: abrahamNotif },
  ]) {
    const exists = await db.execute(sql`SELECT id FROM ep_portal_notifications WHERE reference_key = ${n.refKey}`);
    if (!exists.rows[0]) {
      await db.execute(sql`
        INSERT INTO ep_portal_notifications (recipient_email, title, message, link, reference_key)
        VALUES (${email}, ${n.title}, ${n.message}, ${n.link}, ${n.refKey})
      `);
    }
  }

  // WhatsApp best-effort — look up phone number from users table
  await sendWhatsAppIfPhone(PRABHLEEN_EMAIL, "Hi Prabhleen — you are project lead on ALLI Foundation. Week 1 starts Wednesday. Your focus: organisational review, website audit, facilitation model audit, and project finance tracking. EP Agent will send your full week plan Monday morning.");
  await sendWhatsAppIfPhone(ABRAHAM_EMAIL, "Hi Abraham — you are research support on ALLI Foundation. Week 1 starts Wednesday. Your focus: UK knife crime landscape, government funding, VRUs, borough councils. Use the Research Engine. EP Agent sends your plan Monday.");

  // FIX 7 — Finance record for mobilisation payment
  await db.execute(sql`
    INSERT INTO ep_project_finance
      (project_reference, client_id, invoice_ref, description, amount, currency, status, issued_date, paid_date, payment_method, recorded_by, notes)
    VALUES (
      ${ALLI_PROJECT_REF}, ${alliId}, 'EP-INV-2026-ALLI-001',
      'Package C Full Programme Design Structuring and Launch — Mobilisation Fee',
      3000.00, 'GBP', 'paid', NOW(), NOW(),
      'Bank transfer', ${PRABHLEEN_EMAIL},
      'Mobilisation fee received in full. Balance £1,500 payable on Phase 3 completion. Balance invoice EP-INV-2026-ALLI-002 to be raised automatically on Phase 3 completion.'
    )
    ON CONFLICT (invoice_ref) DO NOTHING
  `);

  // FIX 8 — Queue SOW signature email (pending approval)
  const onboardingUrl = await getAlliOnboardingUrl(alliId);
  const sowHtml = brandedEmail(`
    <p>Dear Mr Kehinde and team,</p>
    <p>Please find attached your Statement of Work for the Youth Violence Prevention Facilitation and Referral Model Design engagement with Event Perfekt Global Ltd.</p>
    <p>This covers the full Package C scope across three phases:</p>
    <ul>
      <li><strong>Phase 1</strong> — Strategic Definition — 2 weeks</li>
      <li><strong>Phase 2</strong> — Model Design and Infrastructure — 4 weeks</li>
      <li><strong>Phase 3</strong> — Funding and Commercialisation — 6 weeks</li>
    </ul>
    <p>To complete your onboarding and formally activate the engagement please click the button below to review and sign the Statement of Work electronically. This takes approximately 10 minutes.</p>
    <p>Once signed we will countersign and send you a final copy. Your client portal will then be activated and we can schedule our kickoff meeting.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${onboardingUrl}" style="display:inline-block;background:#3D0B0B;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Review and Sign Statement of Work</a>
    </p>
    <p>If you have any questions before signing please contact us at info@eventperfekt.com or call us directly.</p>
    <p>We look forward to working with you.</p>
    <p>Kind regards<br/>Tolu Johnson<br/>Founder and Director<br/>Event Perfekt Global Ltd<br/>info@eventperfekt.com<br/>www.eventperfekt.com<br/>+44 20 Wenlock Road, London, N1 7PG</p>
  `);
  await queueCommunication({
    clientId: alliId,
    to: ALLI_PRIMARY_EMAIL,
    cc: ALLI_CC_EMAILS,
    fromAlias: "info",
    subject: "Statement of Work — ALLI Foundation — Event Perfekt Global Ltd — For Signature",
    body: sowHtml,
    context: "sow_for_signature",
    referenceId: "ALLI-SOW-SIGNATURE",
    urgency: "high",
  });

  console.log("[ALLI] Week 1 seed complete ✓");
}

async function getAlliOnboardingUrl(alliId: number): Promise<string> {
  try {
    const r = await db.execute(sql`
      SELECT onboarding_token FROM ep_client_onboarding WHERE client_id = ${alliId} ORDER BY id DESC LIMIT 1
    `);
    const token = (r.rows[0] as any)?.onboarding_token;
    if (token) return `https://eventperfekt.net/onboarding/${token}`;
  } catch {}
  return "https://eventperfekt.net/onboarding/alli-foundation";
}

async function sendWhatsAppIfPhone(email: string, message: string) {
  try {
    const r = await db.execute(sql`SELECT phone FROM users WHERE email = ${email} LIMIT 1`).catch(() => ({ rows: [] as any[] }));
    const phone = (r.rows[0] as any)?.phone;
    if (phone) await sendWhatsAppMessage(phone, message);
  } catch {}
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export function registerAlliOnboardingFixes(app: Express) {
  (async () => {
    try {
      await ensureTables();
      await seedAlliWeek1();
    } catch (e: any) {
      console.error("[ALLI] Startup setup error:", e.message);
    }
  })();

  // Director countersigns a partnership/SOW contract → runs onboarding sequence
  app.post("/api/ep-clients/:id/partnerships/:contractId/countersign", authenticateEPStaff, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id, 10);
      const contractId = parseInt(req.params.contractId, 10);
      const signatureData = req.body?.signature_data || null;
      const result = await db.execute(sql`
        UPDATE ep_client_partnership_contracts
        SET ep_countersigned = true,
            ep_countersigned_at = NOW(),
            status = 'countersigned',
            updated_at = NOW()
        WHERE id = ${contractId} AND client_id = ${clientId}
        RETURNING *
      `);
      if (!result.rows[0]) return res.status(404).json({ message: "Contract not found" });
      await triggerCountersignSequence(clientId, contractId);
      return res.json({ ...(result.rows[0] as any), onboarding_triggered: true, signature_captured: !!signatureData });
    } catch (e: any) {
      console.error("[ALLI] countersign error:", e);
      return res.status(500).json({ message: e.message });
    }
  });

  // Outbound queue list (director review)
  app.get("/api/ep-outbound-queue", authenticateEPStaff, async (_req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM outbound_communications_queue ORDER BY urgency DESC, created_at DESC`);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Director approves + sends a queued email
  app.post("/api/ep-outbound-queue/:id/approve", authenticateEPStaff, async (req: any, res) => {
    try {
      const approvedBy = req.epUser?.name || req.epUser?.email || "Director";
      const r = await db.execute(sql`SELECT * FROM outbound_communications_queue WHERE id = ${req.params.id}`);
      const row = r.rows[0] as any;
      if (!row) return res.status(404).json({ message: "Queue item not found" });
      if (row.status === 'sent') return res.status(400).json({ message: "Already sent" });

      let sendError: string | null = null;
      try {
        await sendOutboundEmail(row);
      } catch (e: any) {
        sendError = e.message;
      }
      await db.execute(sql`
        UPDATE outbound_communications_queue
        SET status = ${sendError ? 'send_failed' : 'sent'},
            approved_by = ${approvedBy},
            approved_at = NOW(),
            sent_at = ${sendError ? null : sql`NOW()`},
            send_error = ${sendError}
        WHERE id = ${row.id}
      `);
      return res.json({ success: !sendError, send_error: sendError });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Director rejects/deletes a queued email
  app.delete("/api/ep-outbound-queue/:id", authenticateEPStaff, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM outbound_communications_queue WHERE id = ${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Staff tasks for a user
  app.get("/api/ep-staff-tasks", authenticateEPStaff, async (req: any, res) => {
    try {
      const email = (req.query.email as string) || req.epUser?.email;
      if (!email) return res.json([]);
      const r = await db.execute(sql`
        SELECT * FROM ep_staff_tasks WHERE assignee_email = ${email}
        ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, due_date ASC
      `);
      return res.json(r.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Portal notifications for a user
  app.get("/api/ep-portal-notifications", authenticateEPStaff, async (req: any, res) => {
    try {
      const email = (req.query.email as string) || req.epUser?.email;
      if (!email) return res.json([]);
      const r = await db.execute(sql`SELECT * FROM ep_portal_notifications WHERE recipient_email = ${email} ORDER BY created_at DESC`);
      return res.json(r.rows);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Finance records for a project
  app.get("/api/ep-project-finance/:projectReference", authenticateEPStaff, async (req: any, res) => {
    try {
      const r = await db.execute(sql`
        SELECT * FROM ep_project_finance WHERE project_reference = ${req.params.projectReference} ORDER BY issued_date DESC
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Agent weekly plan context
  app.get("/api/ep-agent/weekly-context/:email", authenticateEPStaff, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM ep_agent_weekly_plan_context WHERE user_email = ${req.params.email}`);
      res.json(r.rows[0] || null);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
}

async function sendOutboundEmail(row: any) {
  const { sendMail } = await import("./emailService");
  const cc = (row.cc_emails || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  try {
    await sendMail(row.to_email, row.subject, row.body);
    if (cc.length) {
      for (const addr of cc) {
        await sendMail(addr, row.subject, row.body).catch(() => {});
      }
    }
  } catch (e: any) {
    console.error(`[ALLI] sendOutboundEmail error: ${e.message}`);
  }
}
