import { Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sendMail as _sendMail } from "./emailService";

const JWT_SECRET = process.env.JWT_SECRET || "event-perfekt-secret-2024";
const PORTAL_JWT_SECRET = JWT_SECRET + "-client-portal";

function authenticateEPStaff(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorised" });
  try { jwt.verify(auth.split(" ")[1], JWT_SECRET); next(); }
  catch { res.status(401).json({ message: "Invalid or expired session" }); }
}

function authenticateClientPortal(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorised" });
  try { const p = jwt.verify(auth.split(" ")[1], PORTAL_JWT_SECRET) as any; req.portalUser = p; next(); }
  catch { res.status(401).json({ message: "Invalid or expired session" }); }
}

const alliUploadDir = path.join(process.cwd(), "uploads", "alli");
if (!fs.existsSync(alliUploadDir)) fs.mkdirSync(alliUploadDir, { recursive: true });
const alliStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, alliUploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`),
});
const alliUpload = multer({ storage: alliStorage, limits: { fileSize: 20 * 1024 * 1024 } });

async function sendEmail(to: string, subject: string, html: string) {
  try { await _sendMail(to, subject, html); }
  catch (e: any) { console.error("[ALLI] Email error:", e.message); }
}

async function ensureAlliTables() {
  // ── MODULE 1 — Young People ──────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_young_people (
      id SERIAL PRIMARY KEY,
      reference_number TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      age INTEGER,
      gender TEXT,
      area TEXT,
      referral_source TEXT,
      referral_date DATE DEFAULT CURRENT_DATE,
      circumstances TEXT,
      referring_person TEXT,
      consent_status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending_consent',
      assigned_to TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`ALTER TABLE alli_young_people ADD COLUMN IF NOT EXISTS notes TEXT`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_consent_documents (
      id SERIAL PRIMARY KEY,
      young_person_id INTEGER REFERENCES alli_young_people(id) ON DELETE CASCADE,
      document_type TEXT,
      file_url TEXT,
      uploaded_by TEXT,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      review_status TEXT DEFAULT 'awaiting_review',
      review_notes TEXT,
      reviewed_by TEXT,
      reviewed_at TIMESTAMP
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_assessments (
      id SERIAL PRIMARY KEY,
      young_person_id INTEGER REFERENCES alli_young_people(id) ON DELETE CASCADE,
      assessment_date DATE,
      assessor TEXT,
      current_situation TEXT,
      risk_level TEXT,
      immediate_needs TEXT,
      longer_term_needs TEXT,
      young_person_goals TEXT,
      recommended_intervention TEXT,
      recommended_partner TEXT,
      outcome TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_assessment_requests (
      id SERIAL PRIMARY KEY,
      young_person_id INTEGER REFERENCES alli_young_people(id) ON DELETE CASCADE,
      requested_date DATE NOT NULL,
      requested_time TIME,
      location_type TEXT DEFAULT 'in_person',
      location_detail TEXT,
      notes TEXT,
      requested_by TEXT,
      requested_by_email TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_interventions (
      id SERIAL PRIMARY KEY,
      young_person_id INTEGER REFERENCES alli_young_people(id) ON DELETE CASCADE,
      partner_id INTEGER,
      intervention_type TEXT,
      start_date DATE,
      review_date DATE,
      funding_source TEXT,
      funding_amount NUMERIC(10,2),
      notes TEXT,
      outcome TEXT DEFAULT 'ongoing',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_intervention_progress (
      id SERIAL PRIMARY KEY,
      intervention_id INTEGER REFERENCES alli_interventions(id) ON DELETE CASCADE,
      note_text TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_intervention_followups (
      id SERIAL PRIMARY KEY,
      intervention_id INTEGER REFERENCES alli_interventions(id) ON DELETE CASCADE,
      follow_up_date DATE NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_case_notes (
      id SERIAL PRIMARY KEY,
      young_person_id INTEGER REFERENCES alli_young_people(id) ON DELETE CASCADE,
      note_text TEXT NOT NULL,
      author TEXT NOT NULL,
      is_ep_only BOOLEAN DEFAULT false,
      superseded_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_case_documents (
      id SERIAL PRIMARY KEY,
      young_person_id INTEGER REFERENCES alli_young_people(id) ON DELETE CASCADE,
      document_type TEXT,
      file_url TEXT,
      file_name TEXT,
      uploaded_by TEXT,
      uploaded_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Migrate existing alli_partners records to new schema (idempotent)
  await db.execute(sql`ALTER TABLE alli_partners ADD COLUMN IF NOT EXISTS owner TEXT DEFAULT 'ALLI Foundation'`);
  await db.execute(sql`ALTER TABLE alli_partners ADD COLUMN IF NOT EXISTS engagement_status TEXT DEFAULT 'Not started'`);
  await db.execute(sql`ALTER TABLE alli_partners ADD COLUMN IF NOT EXISTS date_approached DATE`);
  await db.execute(sql`ALTER TABLE alli_partners ADD COLUMN IF NOT EXISTS date_last_contact DATE`);
  await db.execute(sql`ALTER TABLE alli_partners ADD COLUMN IF NOT EXISTS next_action_date DATE`);
  await db.execute(sql`ALTER TABLE alli_partners ADD COLUMN IF NOT EXISTS next_action TEXT`);
  await db.execute(sql`ALTER TABLE alli_partners ADD COLUMN IF NOT EXISTS description TEXT`);
  await db.execute(sql`ALTER TABLE alli_partners ADD COLUMN IF NOT EXISTS why_engage TEXT`);

  // ── MODULE 2 — Partners ──────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_partners (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      organisation_type TEXT,
      website TEXT,
      primary_contact_name TEXT,
      primary_contact_email TEXT,
      primary_contact_phone TEXT,
      services JSONB DEFAULT '[]'::jsonb,
      areas_covered JSONB DEFAULT '[]'::jsonb,
      capacity INTEGER,
      cost_type TEXT,
      agreement_status TEXT DEFAULT 'informal',
      status TEXT DEFAULT 'active',
      owner TEXT DEFAULT 'ALLI Foundation',
      engagement_status TEXT DEFAULT 'Not started',
      date_approached DATE,
      date_last_contact DATE,
      next_action_date DATE,
      next_action TEXT,
      description TEXT,
      why_engage TEXT,
      notes TEXT,
      last_engagement_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_partner_meetings (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER REFERENCES alli_partners(id) ON DELETE CASCADE,
      meeting_date DATE,
      attendees TEXT,
      notes TEXT,
      actions_agreed TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_partner_documents (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER REFERENCES alli_partners(id) ON DELETE CASCADE,
      document_type TEXT,
      file_url TEXT,
      file_name TEXT,
      uploaded_by TEXT,
      uploaded_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_partner_notes (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER REFERENCES alli_partners(id) ON DELETE CASCADE,
      note_text TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── MODULE 3 — Funders ──────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_funders (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      tier TEXT DEFAULT 'Tier 2',
      grant_range TEXT,
      eligibility TEXT,
      fit_for_alli TEXT,
      route_in TEXT,
      contact TEXT,
      application_url TEXT,
      when_to_apply TEXT,
      owner TEXT DEFAULT 'ALLI Foundation',
      status TEXT DEFAULT 'Not started',
      amount_applied_for NUMERIC(12,2),
      amount_awarded NUMERIC(12,2),
      date_submitted DATE,
      decision_date DATE,
      next_action_date DATE,
      next_action TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_governance_flags (
      id SERIAL PRIMARY KEY,
      flag_name TEXT UNIQUE NOT NULL,
      flag_value BOOLEAN DEFAULT false,
      resolved_by TEXT,
      resolved_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Seed Trustee approval gate flag if missing
  await db.execute(sql`
    INSERT INTO alli_governance_flags (flag_name, flag_value)
    VALUES ('trustee_approval_gate', false)
    ON CONFLICT (flag_name) DO NOTHING
  `);

  // ── MODULE 4 — Events ────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_events (
      id SERIAL PRIMARY KEY,
      event_name TEXT NOT NULL,
      event_type TEXT,
      event_date TIMESTAMP,
      location_name TEXT,
      location_address TEXT,
      lead_person TEXT,
      target_audience TEXT,
      expected_attendance INTEGER,
      status TEXT DEFAULT 'planned',
      description TEXT,
      preparation_notes TEXT,
      resources_needed TEXT,
      budget NUMERIC(10,2),
      outcome_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_event_attendees (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES alli_events(id) ON DELETE CASCADE,
      attendee_type TEXT,
      attendee_ref TEXT,
      name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alli_event_documents (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES alli_events(id) ON DELETE CASCADE,
      document_type TEXT,
      file_url TEXT,
      file_name TEXT,
      uploaded_by TEXT,
      uploaded_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // One-time cleanup of legacy seed rows that were inserted on older boots.
  // Safe to leave in place — only deletes rows matching the exact seeded names + lead.
  await db.execute(sql`
    DELETE FROM alli_events
    WHERE lead_person = 'ALLI Team'
      AND event_name IN (
        'Youth Support Intake',
        'Partner Coordination Meeting',
        'Phase 3 Complete & Sign Off',
        'Community Outreach Session'
      )
  `);

  // Ensure 2 real young people exist for the ALLI Foundation
  const ypCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM alli_young_people`);
  if (parseInt((ypCount.rows[0] as any).cnt || "0") === 0) {
    const ref1 = await nextYPRef();
    const yp1 = await db.execute(sql`
      INSERT INTO alli_young_people (reference_number, first_name, age, gender, area, referral_source, referral_date, circumstances, referring_person, consent_status, priority, status, assigned_to)
      VALUES (${ref1}, ${'Jordan'}, ${16}, ${'male'}, ${'Hackney, London'}, ${'School referral'}, ${'2026-06-08'}, ${'Referred by school counsellor. Housing instability reported. Awaiting full needs assessment and intervention plan.'}, ${'School Counsellor'}, ${'received'}, ${'high'}, ${'assessment_scheduled'}, ${'Kehinde Balli'})
      RETURNING id
    `);
    const ref2 = await nextYPRef();
    const yp2 = await db.execute(sql`
      INSERT INTO alli_young_people (reference_number, first_name, age, gender, area, referral_source, referral_date, circumstances, referring_person, consent_status, priority, status, assigned_to)
      VALUES (${ref2}, ${'Aisha'}, ${14}, ${'female'}, ${'Tower Hamlets, London'}, ${'Social services'}, ${'2026-06-08'}, ${'Referred following family breakdown. Living in temporary accommodation. Requires safeguarding assessment and educational re-engagement.'}, ${'Social Worker'}, ${'received'}, ${'urgent'}, ${'assessment_scheduled'}, ${'Agboola Ogundeyin'})
      RETURNING id
    `);
    // Pre-create assessment requests
    await db.execute(sql`
      INSERT INTO alli_assessment_requests (young_person_id, requested_date, requested_time, location_type, location_detail, notes, requested_by, requested_by_email, status)
      VALUES (${(yp1.rows[0] as any).id}, ${'2026-06-15'}, ${'10:00'}, ${'in_person'}, ${'ALLI Centre, 25 Kusenla Street, Lagos'}, ${'Guardian will accompany. Please bring consent forms.'}, ${'Kehinde Balli'}, ${'kehindeballi@gmail.com'}, ${'pending'})
    `);
    await db.execute(sql`
      INSERT INTO alli_assessment_requests (young_person_id, requested_date, requested_time, location_type, location_detail, notes, requested_by, requested_by_email, status)
      VALUES (${(yp2.rows[0] as any).id}, ${'2026-06-18'}, ${'14:00'}, ${'video_call'}, ${'Zoom — link to be sent by coordinator'}, ${'Social worker requests recorded session for case notes.'}, ${'Agboola Ogundeyin'}, ${'agboola@jobtrolley.co'}, ${'pending'})
    `);
    console.log(`[ALLI] Seeded 2 young people: ${ref1}, ${ref2}`);
  }

  // Seed ALLI Foundation Partner Directory — idempotent by name
  const partnerSeed = [
    { name: "London Violence Reduction Unit (VRU) — Mayor's Office for Policing and Crime", org: "Statutory / Funder", website: "london.gov.uk", contact_name: "VRU Procurement", contact_email: "VRUProcurement@london.gov.uk", phone: null, services: ["Statutory","Funding","Mentoring"], areas: ["Pan-London"], next_date: "2026-06-22", next_action: "Register on VRU partner network per Playbook section 7", description: "Canonical funder, convener, and recogniser of facilitation work in youth violence prevention. £9.4m Home Office allocation 2025/26. Operates MyEnds programme across nine consortiums and funds hospital-based youth work via Catch22/Redthread, St Giles Trust and Oasis.", why_engage: "Partner registration unlocks grant alerts and sector recognition. Foundation's facilitation positioning maps directly to VRU's public health prevention frame." },
    { name: "Safer London", org: "Charity", website: "saferlondon.org.uk", contact_name: "Partnerships", contact_email: "partnerships@saferlondon.org.uk", phone: null, services: ["Statutory","Mentoring","Safeguarding"], areas: ["Pan-London"], next_date: "2026-06-23", next_action: "Submit VESS referring-organisation partner registration", description: "Lead alliance partner on the £15.6m London Children and Young People Violence & Exploitation Support Service (VESS) alongside St Giles Trust, New Horizon Youth Centre, Anna Freud, and the VRU. Takes referrals from any London borough for young people up to 25.", why_engage: "Recognition as a referring organisation gives ALLI a documented connection to a major commissioned service." },
    { name: "St Giles Trust — SOS Project", org: "Charity", website: "stgilestrust.org.uk", contact_name: "General Enquiries", contact_email: "info@stgilestrust.org.uk", phone: null, services: ["Mentoring","Statutory"], areas: ["Pan-London"], next_date: "2026-06-24", next_action: "Send Template 1 cold outreach", description: "London's largest gangs intervention project. Caseworkers embedded in major trauma units, police custody suites, and community settings. Majority of caseworkers are reformed ex-offenders with lived experience.", why_engage: "Brand association strengthens ALLI's positioning. Referral relationship and pro bono mentoring partnership." },
    { name: "Catch22 — Youth Violence Intervention Programme", org: "Charity", website: "catch-22.org.uk", contact_name: "General Enquiries", contact_email: "info@catch-22.org.uk", phone: null, services: ["Mentoring","Employment","Education"], areas: ["Pan-London"], next_date: "2026-06-26", next_action: "Send Template 1 cold outreach", description: "Major delivery partner across London including hospital-based youth work in partnership with Redthread, and county lines intervention work. Operates at scale across the UK.", why_engage: "Pro bono mentoring access for ALLI-referred young people. Pre-crisis facilitation positioning complements Catch22's crisis-stage intervention." },
    { name: "Anna Freud — Mental Health for Children and Young People", org: "Charity", website: "annafreud.org", contact_name: "General Enquiries", contact_email: "info@annafreud.org", phone: null, services: ["Mental Health","Therapy"], areas: ["Pan-London"], next_date: "2026-06-25", next_action: "Send Template 1 cold outreach re pro bono training", description: "VESS alliance partner. National mental health charity for children and young people with deep expertise in trauma-informed practice.", why_engage: "Pro bono training and consultation. Mental health is the single highest-need referral category in ALLI's cohort." },
    { name: "Lambeth Council — Community Safety / Lambeth Made Safer", org: "Council", website: "lambeth.gov.uk", contact_name: "Community Safety", contact_email: "communitysafety@lambeth.gov.uk", phone: null, services: ["Statutory","Safeguarding"], areas: ["Lambeth"], next_date: "2026-07-05", next_action: "Request introductory meeting under Lambeth Made Safer", description: "Council's 10-year public health and anti-racist strategy for tackling violence affecting young people. Violence Affecting Young People Experts-by-Experience Panel running 2026–2027.", why_engage: "Lambeth Made Safer is in active strategy delivery and seeks grassroots partnerships bringing referral pipelines into commissioned services." },
    { name: "Young Lambeth Cooperative", org: "Community", website: "younglambeth.org", contact_name: "General Enquiries", contact_email: "info@younglambeth.org", phone: null, services: ["Mentoring","Education","Employment"], areas: ["Lambeth"], next_date: "2026-07-07", next_action: "Apply for membership", description: "Lambeth's commissioned youth work cooperative. Co-produces youth services across the borough. Recognised VRU community partner.", why_engage: "Membership opens doors with statutory commissioners. ALLI's facilitation frame is distinct from existing co-op members." },
    { name: "Dwaynamics", org: "Community", website: "dwaynamics.com", contact_name: "Pastor Lorraine Jones", contact_email: null, phone: null, services: ["Mentoring","Mental Health"], areas: ["Lambeth"], next_date: "2026-06-28", next_action: "Initiate peer outreach — mutual recognition not referral ask", description: "Founded by Pastor Lorraine Jones following the murder of her son Dwayne in 2014. Works with children from age five upward addressing anxiety, stress, and violence in the community.", why_engage: "A respected peer voice in Lambeth endorsing ALLI carries weight with commissioners and funders." },
    { name: "Lewisham Council — Safer Lewisham Partnership", org: "Council", website: "lewisham.gov.uk", contact_name: "Community Safety", contact_email: "communitysafety@lewisham.gov.uk", phone: null, services: ["Statutory","Safeguarding"], areas: ["Lewisham"], next_date: "2026-07-14", next_action: "Send Template 1 cold outreach to Safer Lewisham", description: "Hosts the local MyEnds consortium and commissions community safety services. Strong public health framing aligned with the VRU model.", why_engage: "MyEnds funding runs to April 2026; Council is in succession-planning mode for what comes next. Recognised facilitation organisations are well-placed for the next cycle." },
    { name: "Power The Fight — Lewisham", org: "Charity", website: "powerthefight.org.uk", contact_name: "General Enquiries", contact_email: "info@powerthefight.org.uk", phone: null, services: ["Therapy","Mental Health","Mentoring"], areas: ["Lewisham"], next_date: "2026-07-16", next_action: "Send Template 1 cold outreach", description: "Empowering communities to end youth violence through trauma-informed therapeutic support, family work, and community advocacy. Lewisham-rooted with national reach.", why_engage: "One of the most visible community-led organisations in the youth violence space and Lewisham-rooted."},
    { name: "XLP", org: "Charity", website: "xlp.org.uk", contact_name: "General Enquiries", contact_email: "info@xlp.org.uk", phone: null, services: ["Mentoring","Education"], areas: ["Lewisham"], next_date: "2026-07-21", next_action: "Send Template 1 cold outreach re mentoring exchange", description: "Long-established London-wide youth mentoring charity (also delivering in Lewisham via Power The Fight). Operates a nationally recognised mentoring model.", why_engage: "Documented capacity and actively building partner relationships across boroughs. Mentoring is one of ALLI's highest-volume referral needs." },
    { name: "Voluntary Action Lewisham", org: "Infrastructure", website: "valewisham.org.uk", contact_name: "General Enquiries", contact_email: "info@valewisham.org.uk", phone: null, services: ["Infrastructure"], areas: ["Lewisham"], next_date: "2026-07-23", next_action: "Apply for membership", description: "Borough-level infrastructure charity supporting Lewisham's voluntary and community sector. Recognised VRU community partner.", why_engage: "Infrastructure charity membership opens doors to commissioners faster than direct cold outreach. Low-cost, high-leverage relationship."},
    { name: "Southwark Council — Community Safety and Enforcement", org: "Council", website: "southwark.gov.uk", contact_name: "Safer Southwark Partnership", contact_email: "safersouthwarkpartnership@southwark.gov.uk", phone: null, services: ["Statutory","Safeguarding"], areas: ["Southwark"], next_date: "2026-07-28", next_action: "Send Template 1 cold outreach to Safer Southwark", description: "Commissions community safety services and hosts the local MyEnds consortium. Strong relationship with St Giles Trust headquartered in Southwark.", why_engage: "Southwark's MyEnds programme ends April 2026 and the Council is planning the next cycle."},
    { name: "Community Southwark", org: "Infrastructure", website: "communitysouthwark.org", contact_name: "General Enquiries", contact_email: "info@communitysouthwark.org", phone: null, services: ["Infrastructure"], areas: ["Southwark"], next_date: "2026-07-30", next_action: "Apply for membership", description: "Southwark's infrastructure charity supporting the local VCS. Hosts the Borough's voluntary sector forum and partners with the Council on commissioning.", why_engage: "Infrastructure charity membership opens doors to commissioning visibility."},
    { name: "Spark 2 Life", org: "Community", website: "spark2life.com", contact_name: "General Enquiries", contact_email: "info@spark2life.com", phone: null, services: ["Mentoring","Employment"], areas: ["Southwark"], next_date: "2026-08-04", next_action: "Initiate peer outreach", description: "Founded by Dez Brown. Works across South London with young people at risk of, or involved in, the criminal justice system. Strong lived-experience leadership.", why_engage: "Established South London voice. Alignment helps ALLI's positioning with Southwark commissioners and South London peer organisations." },
    { name: "LawWorks (Solicitors Pro Bono Group)", org: "Charity", website: "lawworks.org.uk", contact_name: "General Enquiries", contact_email: "info@lawworks.org.uk", phone: null, services: ["Legal"], areas: ["Pan-London"], next_date: "2026-07-05", next_action: "Submit Not-for-Profits Programme application", description: "Leading pro bono charity for solicitors in England and Wales. Brokers pro bono legal advice through a network of more than 100 law firm members. Operates a dedicated Not-for-Profits Programme.", why_engage: "Delivers ongoing pro bono legal advice to ALLI itself (charity law, contracts, employment, data protection) and creates a route to legal advice for referred young people." },
    { name: "TrustLaw — Thomson Reuters Foundation", org: "Charity", website: "thomsonreuters.com", contact_name: "TrustLaw", contact_email: "trust.law@thomsonreuters.com", phone: null, services: ["Legal"], areas: ["Pan-London"], next_date: "2026-07-07", next_action: "Submit membership application", description: "Global pro bono legal service connecting high-impact NGOs with the world's best law firms. Free legal research, advice, and resource development.", why_engage: "Free for eligible NGOs. Well-positioned for charities working on youth and violence themes." },
    { name: "BWW Mind", org: "Charity", website: "bwwmind.org.uk", contact_name: "General Enquiries", contact_email: "info@bwwmind.org.uk", phone: null, services: ["Mental Health","Therapy","Mentoring"], areas: ["Pan-London"], next_date: "2026-07-09", next_action: "Initiate referral partnership conversation", description: "Local Mind delivering mental health support across South London. Strong young people's service: mentoring, coaching, training, social groups. Accepts self-referrals and GP referrals.", why_engage: "Mental health is the largest single referral category from ALLI's cohort. BWW Mind has capacity and a documented young person's offer." },
    { name: "Black Thrive Lambeth (and Lewisham)", org: "Community", website: "blackthrive.org", contact_name: "General Enquiries", contact_email: "info@blackthrive.org", phone: null, services: ["Mental Health","Therapy"], areas: ["Lambeth","Lewisham"], next_date: "2026-08-09", next_action: "Initiate consultation partnership conversation", description: "Place-based partnership tackling inequalities affecting Black people in Lambeth and Lewisham. Significant programme strands on young people's mental health. Trauma-informed practice and community psychology approach.", why_engage: "Alignment is essential for ALLI's credibility with funders who scrutinise demographic appropriateness." },
    { name: "National Pro Bono Centre", org: "Charity", website: "nationalprobonocentre.org.uk", contact_name: "General Enquiries", contact_email: "info@nationalprobonocentre.org.uk", phone: null, services: ["Legal","Infrastructure"], areas: ["National"], next_date: "2026-07-12", next_action: "Register on directory", description: "Coordinating body for pro bono legal services across the UK. Maintains a directory of pro bono organisations and brokers introductions between charities and law firms outside the major networks.", why_engage: "Useful as a back-up route when LawWorks and TrustLaw cannot route a specific case. Free to engage." },
  ];
  let seedIns = 0;
  for (const p of partnerSeed) {
    const exists = await db.execute(sql`SELECT id FROM alli_partners WHERE name = ${p.name} LIMIT 1`);
    if (exists.rows.length > 0) continue;
    await db.execute(sql`
      INSERT INTO alli_partners (name, organisation_type, website, primary_contact_name, primary_contact_email, primary_contact_phone, services, areas_covered, capacity, cost_type, agreement_status, status, owner, engagement_status, date_approached, date_last_contact, next_action_date, next_action, description, why_engage, notes)
      VALUES (${p.name}, ${p.org}, ${p.website}, ${p.contact_name}, ${p.contact_email}, ${p.phone}, ${JSON.stringify(p.services)}, ${JSON.stringify(p.areas)}, ${null}, ${null}, ${"informal"}, ${"active"}, ${"ALLI Foundation"}, ${"Not started"}, ${null}, ${null}, ${p.next_date}, ${p.next_action}, ${p.description || null}, ${p.why_engage || null}, ${null})
    `);
    seedIns++;
  }
  if (seedIns > 0) console.log(`[ALLI] Partner Directory seeded — ${seedIns} new partners added`);

  // Backfill description / why_engage for existing partners that are missing them
  let backfillCount = 0;
  for (const p of partnerSeed) {
    if (!p.description && !p.why_engage) continue;
    const row = await db.execute(sql`SELECT id, description, why_engage FROM alli_partners WHERE name = ${p.name} LIMIT 1`);
    if (!row.rows.length) continue;
    const existing = row.rows[0] as any;
    if (!existing.description || !existing.why_engage) {
      await db.execute(sql`
        UPDATE alli_partners
        SET description = COALESCE(${p.description || null}, description),
            why_engage = COALESCE(${p.why_engage || null}, why_engage),
            updated_at = NOW()
        WHERE id = ${existing.id}
      `);
      backfillCount++;
    }
  }
  if (backfillCount > 0) console.log(`[ALLI] Partner Directory backfilled — ${backfillCount} existing partners updated with descriptions`);

  // Unicode escape cleanup: fix any literal \\uXXXX sequences stored as escaped strings
  const unicodeMap: Record<string, string> = {
    "\\u23f0": "", "\\u2014": "\u2014", "\\u2013": "\u2013", "\\u2026": "\u2026",
    "\\u2018": "'", "\\u2019": "'", "\\u201c": "\"", "\\u201d": "\"", "\\u00a3": "\u00a3",
  };
  const textCols = ["description", "why_engage", "notes", "next_action", "contact_name", "referring_person", "circumstances"];
  for (const col of textCols) {
    try {
      let q = `UPDATE alli_partners SET ${col} = ${col}`;
      for (const [escaped, real] of Object.entries(unicodeMap)) {
        q += `, ${col} = REPLACE(${col}, '${escaped}', '${real}')`;
      }
      q += ` WHERE ${col} LIKE '%\\\\u%'`;
      await db.execute(sql.raw(q));
    } catch { /* column may not exist on all tables */ }
  }
  try {
    let q = `UPDATE alli_young_people SET circumstances = circumstances`;
    for (const [escaped, real] of Object.entries(unicodeMap)) {
      q += `, circumstances = REPLACE(circumstances, '${escaped}', '${real}')`;
    }
    q += ` WHERE circumstances LIKE '%\\\\u%'`;
    await db.execute(sql.raw(q));
  } catch { /* ignore */ }

  // ── Seed ALLI Foundation Funder Directory ─────────────────────────────────────────────────────────
  const funderSeed = [
    { name: "National Lottery Awards for All — England", tier: "Tier 1", grant_range: "£300 to £20,000", eligibility: "Charities, community groups, parish or town councils, health bodies, or schools. Registered charity status not required. Bank account with two-signature requirement. Smaller incomes prioritised.", fit_for_alli: "The single most accessible community grant in England. Funds youth-focused projects regularly. The Foundation's facilitation model is the project.", route_in: "Apply directly online. 16-week assessment-to-payment cycle. Only one Awards for All grant at a time.", contact: "general@tnlcommunityfund.org.uk; 0345 4 10 20 30", application_url: "tnlcommunityfund.org.uk/funding/programmes/national-lottery-awards-for-all-england", when_to_apply: "Apply in the first 30 days. Keystone Tier 1 application.", next_date: "2026-06-28", next_action: "Submit application" },
    { name: "MOPAC London Crime Prevention Fund — Lambeth", tier: "Tier 1", grant_range: "£1,000 to £5,000", eligibility: "Community and voluntary sector organisations operating in Lambeth.", fit_for_alli: "Direct fit. LCPF priorities are knife crime, youth diversion, victim support, community safety.", route_in: "Apply via Lambeth Council website when LCPF window opens.", contact: "communitysafety@lambeth.gov.uk", application_url: "lambeth.gov.uk", when_to_apply: "Apply when Lambeth's LCPF window opens — coordinate with Partner Engagement borough sequence.", next_date: "2026-07-02", next_action: "Submit application" },
    { name: "MOPAC London Crime Prevention Fund — Lewisham", tier: "Tier 1", grant_range: "£1,000 to £5,000", eligibility: "Community and voluntary sector organisations operating in Lewisham.", fit_for_alli: "Direct fit. LCPF priorities are knife crime, youth diversion, victim support, community safety.", route_in: "Apply via Lewisham Council website when LCPF window opens.", contact: "communitysafety@lewisham.gov.uk", application_url: "lewisham.gov.uk", when_to_apply: "Apply when Lewisham's LCPF window opens.", next_date: "2026-07-11", next_action: "Submit application" },
    { name: "MOPAC London Crime Prevention Fund — Southwark", tier: "Tier 1", grant_range: "£1,000 to £5,000", eligibility: "Community and voluntary sector organisations operating in Southwark.", fit_for_alli: "Direct fit. LCPF priorities are knife crime, youth diversion, victim support, community safety.", route_in: "Apply via Southwark Council website when LCPF window opens.", contact: "safersouthwarkpartnership@southwark.gov.uk", application_url: "southwark.gov.uk", when_to_apply: "Apply when Southwark's LCPF window opens.", next_date: "2026-07-18", next_action: "Submit application" },
    { name: "7stars Foundation — Social Impact Grants", tier: "Tier 1", grant_range: "£5,000 per year for two years (total £10,000)", eligibility: "UK registered charities with turnover under £1.5 million. Themes: abuse, addiction, child carers, homelessness (under-18s).", fit_for_alli: "Foundation positioning intersects child carers, abuse, and addiction themes. Apply with the facilitation frame.", route_in: "Bi-annual application deadlines.", contact: "info@the7starsfoundation.co.uk", application_url: "the7starsfoundation.co.uk/apply-for-funding/social-impact", when_to_apply: "Apply at next deadline window.", next_date: "2026-07-09", next_action: "Submit application" },
    { name: "King Charles III Charitable Fund — Small Grants", tier: "Tier 1", grant_range: "Up to £3,000 per year for up to three years (max £9,000)", eligibility: "UK registered nonprofit organisations. Social inclusion and health & wellbeing themes.", fit_for_alli: "Strongest fit under social inclusion and health & wellbeing.", route_in: "Open application periods for specific themes.", contact: "Via website contact form", application_url: "kccf.org.uk/small-grants", when_to_apply: "Apply when next social inclusion or health & wellbeing window opens.", next_date: "2026-07-16", next_action: "Submit application" },
    { name: "National Lottery Reaching Communities — England", tier: "Tier 2", grant_range: "£20,001 to £500,000+. Multi-year. Average £319,000 over 3 years in 2025.", eligibility: "Registered charities, CIOs, CICs with not-for-profit asset lock, statutory bodies.", fit_for_alli: "Strong fit on supporting communities and people facing disadvantage. Multi-year suits the facilitation model.", route_in: "Online application. Initial conversation with Lottery officer recommended. 6-month assessment cycle.", contact: "0345 4 10 20 30", application_url: "tnlcommunityfund.org.uk/funding/funding-programmes/reaching-communities-england", when_to_apply: "Apply after first Tier 1 grant has delivered measurable output — typically Month 4 or 5.", next_date: "2026-09-04", next_action: "Submit application" },
    { name: "London Community Foundation — Stronger Futures 4.0", tier: "Tier 2", grant_range: "£80,000 to £200,000. Up to two years.", eligibility: "Community-led organisations in London with experience working with at-risk youth aged 8 to 18.", fit_for_alli: "The strongest single Tier 2 fit. Mayor's VRU programme — direct match to facilitation positioning.", route_in: "Register for funding alerts via VRU partner network. 4.0 expected to open late 2026.", contact: "VRUProcurement@london.gov.uk", application_url: "londoncf.org.uk", when_to_apply: "Apply when 4.0 opens. Highest probability-weighted value of any in the playbook.", next_date: "2026-09-01", next_action: "Submit application (when round opens)" },
    { name: "UK Youth Fund (Pears Foundation partnership)", tier: "Tier 2", grant_range: "Multi-year unrestricted up to 10% of annual turnover. £10m envelope.", eligibility: "Small youth and outdoor learning organisations. Eligibility based on communities served, not headquarters.", fit_for_alli: "Designed for organisations at the Foundation's stage. Multi-year unrestricted + capacity-building.", route_in: "Two-stage application. Expression of Interest opens annually. Next round expected 2027.", contact: "Via UK Youth website", application_url: "ukyouth.org/uk-youth-fund", when_to_apply: "Register interest now. Apply in next round (likely Spring 2027).", next_date: "2026-09-06", next_action: "Register interest for next round" },
    { name: "Charitable Grants Programme for Offenders and Young People", tier: "Tier 2", grant_range: "Up to £5,000 small grants; main programme uncapped, historically up to £15,000.", eligibility: "UK registered charities and CIOs with income up to £5 million. Local under £100k; UK-wide under £250k.", fit_for_alli: "Direct fit. Themes exactly Foundation's positioning: at-risk youth, employability, reduced reoffending. Matched funding requirement.", route_in: "Online application. Spring 2026 priorities include women and girls aged 11–18 at risk of offending.", contact: "Via Bath & North East Somerset Council Funding Finder route", application_url: "Search \u201cCharitable Grants Programme for Offenders and Young People UK\u201d", when_to_apply: "Apply when next round opens matching audience segmentation.", next_date: "2026-08-07", next_action: "Submit application" },
    { name: "John Lyon's Charity", tier: "Tier 2", grant_range: "Up to £35,000 (refurbishment); programme grants larger.", eligibility: "Charities operating in 9 specific London boroughs (Brent, Camden, Ealing, Hammersmith and Fulham, Harrow, Kensington and Chelsea, Westminster, Barnet, Hounslow). Under £500k turnover prioritised. Under-25s.", fit_for_alli: "Lambeth, Lewisham, Southwark NOT in John Lyon's boroughs. Lower priority unless Foundation extends footprint.", route_in: "Online form. Pre-application conversation recommended.", contact: "info@jlc.london", application_url: "jlc.london", when_to_apply: "Apply only if Foundation extends to a John Lyon's borough in Year 2. Otherwise deprioritise.", next_date: "2026-09-15", next_action: "Deprioritised — Year 2 only if footprint extends" },
    { name: "BBC Children in Need", tier: "Tier 3", grant_range: "£30,000 to £120,000 typical, multi-year.", eligibility: "UK charities, statutory bodies, and not-for-profit organisations supporting children and young people under 18 facing disadvantage.", fit_for_alli: "Strong fit for youth violence prevention and facilitation. Increasingly funds early intervention rather than crisis services.", route_in: "Two-stage application. Annual cycle.", contact: "Via website contact form", application_url: "bbcchildreninneed.co.uk", when_to_apply: "Apply in Month 6–9. Activated after at least one Tier 2 grant in delivery.", next_date: "2026-11-03", next_action: "Submit Expression of Interest" },
    { name: "Comic Relief", tier: "Tier 3", grant_range: "£100,000+ typical for partner organisations. Multi-year strategic.", eligibility: "UK charities and not-for-profit organisations. Themed funding rounds.", fit_for_alli: "Positioning fits Youth and Justice & Equality themes.", route_in: "Themed application rounds.", contact: "grants@comicrelief.com", application_url: "comicrelief.com", when_to_apply: "Apply in Month 9–12.", next_date: "2027-01-12", next_action: "Submit themed application" },
    { name: "Youth Endowment Fund (YEF)", tier: "Tier 3", grant_range: "Variable by programme — historically £30,000 to £10 million. Open Call active.", eligibility: "Organisations in England or Wales working directly with young people aged 10–18 to prevent violence. Must be ready for rigorous evaluation.", fit_for_alli: "The most mission-aligned funder in the UK ecosystem. £200m endowment, ten-year Home Office mandate, exclusively for preventing youth violence.", route_in: "Open Call funding round. YEF funds delivery to evaluate — not delivery alone.", contact: "grants@youthendowmentfund.org.uk", application_url: "youthendowmentfund.org.uk/grants/open-call", when_to_apply: "Apply in Year 2 once delivery data is captured. Case management evidence (D27) required before this application is credible.", next_date: "2027-04-06", next_action: "Submit Open Call application (subject to evaluation readiness)" },
    { name: "City Bridge Foundation — Bridging Divides", tier: "Tier 3", grant_range: "Up to £100,000+. Multi-year.", eligibility: "London-registered charities working to reduce inequality. Operating in one or more London boroughs.", fit_for_alli: "South London geographic positioning is a fit. City Bridge funds youth violence prevention in London.", route_in: "Online application. Themed strands.", contact: "grants@citybridgefoundation.org.uk", application_url: "citybridgefoundation.org.uk", when_to_apply: "Apply when Foundation can show active place-based partnerships with at least two priority boroughs — typically Month 9–12.", next_date: "2027-03-02", next_action: "Submit application" },
  ];
  let funderIns = 0;
  for (const f of funderSeed) {
    const exists = await db.execute(sql`SELECT id FROM alli_funders WHERE name = ${f.name} LIMIT 1`);
    if (exists.rows.length > 0) continue;
    await db.execute(sql`
      INSERT INTO alli_funders (name, tier, grant_range, eligibility, fit_for_alli, route_in, contact, application_url, when_to_apply, owner, status, next_action_date, next_action)
      VALUES (${f.name}, ${f.tier}, ${f.grant_range}, ${f.eligibility}, ${f.fit_for_alli}, ${f.route_in}, ${f.contact}, ${f.application_url}, ${f.when_to_apply}, 'ALLI Foundation', 'Not started', ${f.next_date}, ${f.next_action})
    `);
    funderIns++;
  }
  if (funderIns > 0) console.log(`[ALLI] Funder Directory seeded — ${funderIns} new funders added`);

  // ── Seed funder calendar entries — 21 entries into ep_client_calendar_events ─────────────
  try {
    const alliClient = await db.execute(sql`SELECT id FROM ep_clients WHERE organisation_name = 'ALLI Foundation' LIMIT 1`);
    const clientId = alliClient.rows.length > 0 ? (alliClient.rows[0] as any).id : null;
    if (clientId) {
      const calendarEntries = [
        { date: "2026-06-12", title: "Funder Action: Trustee approval gate resolution checkpoint", action: "Trustee gate before any application fires" },
        { date: "2026-06-28", title: "Funder Action: National Lottery Awards for All — England", action: "Submit application" },
        { date: "2026-07-02", title: "Funder Action: MOPAC LCPF Lambeth", action: "Submit application" },
        { date: "2026-07-04", title: "Funder Action: London Community Foundation Stronger Futures 4.0", action: "Register interest" },
        { date: "2026-07-09", title: "Funder Action: 7stars Foundation Social Impact Grants", action: "Submit application" },
        { date: "2026-07-11", title: "Funder Action: MOPAC LCPF Lewisham", action: "Submit application" },
        { date: "2026-07-16", title: "Funder Action: King Charles III Small Grants", action: "Submit application" },
        { date: "2026-07-18", title: "Funder Action: MOPAC LCPF Southwark", action: "Submit application" },
        { date: "2026-08-07", title: "Funder Action: Charitable Grants Programme for Offenders and Young People", action: "Submit application" },
        { date: "2026-08-09", title: "Funder Action: National Lottery Reaching Communities", action: "Initial conversation with Lottery officer" },
        { date: "2026-09-04", title: "Funder Action: National Lottery Reaching Communities", action: "Submit application" },
        { date: "2026-09-06", title: "Funder Action: UK Youth Fund", action: "Register interest for next round" },
        { date: "2026-09-01", title: "Funder Action: London Community Foundation Stronger Futures 4.0", action: "Submit application (when round opens)" },
        { date: "2026-09-03", title: "Funder Action: BBC Children in Need", action: "Initial conversation with grants team" },
        { date: "2026-10-06", title: "Funder Action: Youth Endowment Fund", action: "Initial conversation with grants team — sound out evaluation readiness" },
        { date: "2026-11-03", title: "Funder Action: BBC Children in Need", action: "Submit Expression of Interest" },
        { date: "2026-12-01", title: "Funder Action: City Bridge Foundation Bridging Divides", action: "Begin conversations" },
        { date: "2027-01-12", title: "Funder Action: Comic Relief", action: "Submit themed application" },
        { date: "2027-03-02", title: "Funder Action: City Bridge Foundation", action: "Submit application" },
        { date: "2027-04-06", title: "Funder Action: Youth Endowment Fund", action: "Submit Open Call application (subject to evaluation readiness)" },
        { date: "2027-05-04", title: "Funder Action: Pipeline review", action: "Assess Tier 1 and Tier 2 conversion rates, plan Year 2 strategy" },
      ];
      let calIns = 0;
      for (const ce of calendarEntries) {
        const exists = await db.execute(sql`
          SELECT id FROM ep_client_calendar_events
          WHERE client_id = ${clientId} AND title = ${ce.title} AND start_date::date = ${ce.date}::date
          LIMIT 1
        `);
        if (exists.rows.length > 0) continue;
        await db.execute(sql`
          INSERT INTO ep_client_calendar_events
            (client_id, title, description, event_type, start_date, end_date, all_day, location, ep_attendees, client_attendees, external_attendees, is_gateway, colour, created_by)
          VALUES (
            ${clientId}, ${ce.title},
            ${`Action per Funder Mini-Playbook. ${ce.action}. Update Funder Directory status on action completion.`},
            'funder_action', ${ce.date}::date + TIME '10:00:00',
            ${ce.date}::date + TIME '11:00:00', false,
            'ALLI Foundation Office / Remote', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
            false, 'gold', 'system'
          )
        `);
        calIns++;
      }
      if (calIns > 0) console.log(`[ALLI] Funder calendar seeded — ${calIns} new entries`);
    }
  } catch (calErr: any) {
    console.error("[ALLI] Funder calendar seed error:", calErr.message);
  }

  console.log("[ALLI Modules] All tables verified ✓");
}

async function nextYPRef(): Promise<string> {
  const r = await db.execute(sql`SELECT COUNT(*) as cnt FROM alli_young_people`);
  const n = parseInt((r.rows[0] as any).cnt || "0") + 1;
  return `YP-ALLI-${String(n).padStart(3, "0")}`;
}

export async function registerAlliModuleRoutes(app: Express) {
  await ensureAlliTables();

  // ══════════════════════════════════════════════════════════════════════════════
  // MODULE 1 — YOUNG PEOPLE — STAFF ROUTES
  // ══════════════════════════════════════════════════════════════════════════════

  app.get("/api/alli/young-people", authenticateEPStaff, async (_req, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM alli_young_people ORDER BY created_at DESC`);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/alli/young-people", authenticateEPStaff, async (req: any, res) => {
    try {
      const { first_name, age, gender, area, referral_source, circumstances, referring_person, consent_status, priority, assigned_to } = req.body;
      if (!first_name?.trim()) return res.status(400).json({ message: "First name required" });
      if (!circumstances || circumstances.length < 50) return res.status(400).json({ message: "Brief circumstances must be at least 50 characters" });
      const ref = await nextYPRef();
      const r = await db.execute(sql`
        INSERT INTO alli_young_people (reference_number, first_name, age, gender, area, referral_source, circumstances, referring_person, consent_status, priority, assigned_to)
        VALUES (${ref}, ${first_name.trim()}, ${age || null}, ${gender || null}, ${area || null}, ${referral_source || null}, ${circumstances}, ${referring_person || null}, ${consent_status || "pending"}, ${priority || "medium"}, ${assigned_to || null})
        RETURNING *
      `);
      await sendEmail("adminuk@eventperfekt.com", `[ALLI] New Referral — ${ref} — ${first_name.trim()}`, `<p>A new referral has been added to the ALLI Foundation case management system.</p><p>Reference: <strong>${ref}</strong></p><p>First name: <strong>${first_name.trim()}</strong></p><p>Priority: ${priority || "medium"}</p>`);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/alli/young-people/:id", authenticateEPStaff, async (req, res) => {
    try {
      const id = req.params.id;
      const yp = await db.execute(sql`SELECT * FROM alli_young_people WHERE id = ${id}`);
      if (!yp.rows.length) return res.status(404).json({ message: "Not found" });
      const [consent, assessment, intervention, notes, docs] = await Promise.all([
        db.execute(sql`SELECT * FROM alli_consent_documents WHERE young_person_id = ${id} ORDER BY uploaded_at DESC`),
        db.execute(sql`SELECT * FROM alli_assessments WHERE young_person_id = ${id} ORDER BY created_at DESC LIMIT 1`),
        db.execute(sql`SELECT * FROM alli_interventions WHERE young_person_id = ${id} ORDER BY created_at DESC LIMIT 1`),
        db.execute(sql`SELECT * FROM alli_case_notes WHERE young_person_id = ${id} ORDER BY created_at DESC`),
        db.execute(sql`SELECT * FROM alli_case_documents WHERE young_person_id = ${id} ORDER BY uploaded_at DESC`),
      ]);
      return res.json({ ...yp.rows[0], consent_docs: consent.rows, assessment: assessment.rows[0] || null, intervention: intervention.rows[0] || null, notes: notes.rows, documents: docs.rows });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/alli/young-people/:id", authenticateEPStaff, async (req, res) => {
    try {
      const id = req.params.id;
      const { status, consent_status, priority, assigned_to, first_name, age, gender, area, referral_source, circumstances, referring_person, notes } = req.body;
      await db.execute(sql`
        UPDATE alli_young_people SET
          status = COALESCE(${status || null}, status),
          consent_status = COALESCE(${consent_status || null}, consent_status),
          priority = COALESCE(${priority || null}, priority),
          assigned_to = COALESCE(${assigned_to || null}, assigned_to),
          first_name = COALESCE(${first_name || null}, first_name),
          age = COALESCE(${age || null}, age),
          gender = COALESCE(${gender || null}, gender),
          area = COALESCE(${area || null}, area),
          referral_source = COALESCE(${referral_source || null}, referral_source),
          circumstances = COALESCE(${circumstances || null}, circumstances),
          referring_person = COALESCE(${referring_person || null}, referring_person),
          updated_at = NOW()
        WHERE id = ${id}
      `);
      const r = await db.execute(sql`SELECT * FROM alli_young_people WHERE id = ${id}`);
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Consent documents — upload
  app.post("/api/alli/young-people/:id/consent", authenticateEPStaff, alliUpload.single("file"), async (req: any, res) => {
    try {
      const id = req.params.id;
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const fileUrl = `/uploads/alli/${req.file.filename}`;
      const { document_type, uploaded_by } = req.body;
      await db.execute(sql`
        INSERT INTO alli_consent_documents (young_person_id, document_type, file_url, uploaded_by, review_status)
        VALUES (${id}, ${document_type || "consent_letter"}, ${fileUrl}, ${uploaded_by || "EP Staff"}, 'awaiting_review')
      `);
      await sendEmail("adminuk@eventperfekt.com", `[ALLI] Consent document uploaded — Case ${id}`, `<p>A consent document has been uploaded for case ID ${id} and is awaiting review.</p>`);
      return res.status(201).json({ message: "Uploaded" });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Consent review
  app.patch("/api/alli/consent/:docId/review", authenticateEPStaff, async (req: any, res) => {
    try {
      const { review_status, review_notes, reviewed_by } = req.body;
      const doc = await db.execute(sql`UPDATE alli_consent_documents SET review_status = ${review_status}, review_notes = ${review_notes || null}, reviewed_by = ${reviewed_by || "EP Staff"}, reviewed_at = NOW() WHERE id = ${req.params.docId} RETURNING *`);
      if (!doc.rows.length) return res.status(404).json({ message: "Document not found" });
      const d = doc.rows[0] as any;
      if (review_status === "accepted") {
        await db.execute(sql`UPDATE alli_young_people SET status = 'assessment_scheduled', consent_status = 'received', updated_at = NOW() WHERE id = ${d.young_person_id}`);
      }
      return res.json(doc.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Assessment
  app.post("/api/alli/young-people/:id/assessment", authenticateEPStaff, async (req, res) => {
    try {
      const id = req.params.id;
      const { assessment_date, assessor, current_situation, risk_level, immediate_needs, longer_term_needs, young_person_goals, recommended_intervention, recommended_partner, outcome } = req.body;
      const r = await db.execute(sql`
        INSERT INTO alli_assessments (young_person_id, assessment_date, assessor, current_situation, risk_level, immediate_needs, longer_term_needs, young_person_goals, recommended_intervention, recommended_partner, outcome)
        VALUES (${id}, ${assessment_date || null}, ${assessor || null}, ${current_situation || null}, ${risk_level || null}, ${immediate_needs || null}, ${longer_term_needs || null}, ${young_person_goals || null}, ${recommended_intervention || null}, ${recommended_partner || null}, ${outcome || null})
        RETURNING *
      `);
      await db.execute(sql`UPDATE alli_young_people SET status = 'assessment_complete', updated_at = NOW() WHERE id = ${id}`);
      await sendEmail("adminuk@eventperfekt.com", `[ALLI] Assessment completed — Case ${id}`, `<p>Assessment for case ${id} has been completed by ${assessor || "EP Team"}.</p><p>Risk level: ${risk_level || "N/A"}</p>`);
      res.status(201).json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/alli/young-people/:id/assessment", authenticateEPStaff, async (req, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM alli_assessments WHERE young_person_id = ${req.params.id} ORDER BY created_at DESC LIMIT 1`);
      res.json(r.rows[0] || null);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Intervention
  app.post("/api/alli/young-people/:id/intervention", authenticateEPStaff, async (req, res) => {
    try {
      const id = req.params.id;
      const { partner_id, intervention_type, start_date, review_date, funding_source, funding_amount, notes, outcome } = req.body;
      const r = await db.execute(sql`
        INSERT INTO alli_interventions (young_person_id, partner_id, intervention_type, start_date, review_date, funding_source, funding_amount, notes, outcome)
        VALUES (${id}, ${partner_id || null}, ${intervention_type || null}, ${start_date || null}, ${review_date || null}, ${funding_source || null}, ${funding_amount || null}, ${notes || null}, ${outcome || "ongoing"})
        RETURNING *
      `);
      await db.execute(sql`UPDATE alli_young_people SET status = 'actively_supported', updated_at = NOW() WHERE id = ${id}`);
      res.status(201).json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/alli/young-people/:id/intervention", authenticateEPStaff, async (req, res) => {
    try {
      const r = await db.execute(sql`SELECT i.*, p.name as partner_name FROM alli_interventions i LEFT JOIN alli_partners p ON p.id = i.partner_id WHERE i.young_person_id = ${req.params.id} ORDER BY i.created_at DESC LIMIT 1`);
      if (!r.rows.length) return res.json(null);
      const intervention = r.rows[0] as any;
      const progress = await db.execute(sql`SELECT * FROM alli_intervention_progress WHERE intervention_id = ${intervention.id} ORDER BY created_at ASC`);
      const followups = await db.execute(sql`SELECT * FROM alli_intervention_followups WHERE intervention_id = ${intervention.id} ORDER BY follow_up_date ASC`);
      return res.json({ ...intervention, progress: progress.rows, followups: followups.rows });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.post("/api/alli/interventions/:id/progress", authenticateEPStaff, async (req, res) => {
    try {
      const { note_text, author } = req.body;
      await db.execute(sql`INSERT INTO alli_intervention_progress (intervention_id, note_text, author) VALUES (${req.params.id}, ${note_text}, ${author || "EP Staff"})`);
      res.json({ message: "Added" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/alli/interventions/:id/followup", authenticateEPStaff, async (req, res) => {
    try {
      const { follow_up_date, note } = req.body;
      await db.execute(sql`INSERT INTO alli_intervention_followups (intervention_id, follow_up_date, note) VALUES (${req.params.id}, ${follow_up_date}, ${note || null})`);
      res.json({ message: "Added" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Case Notes
  app.post("/api/alli/young-people/:id/notes", authenticateEPStaff, async (req, res) => {
    try {
      const { note_text, author, is_ep_only } = req.body;
      if (!note_text?.trim()) return res.status(400).json({ message: "Note text required" });
      const r = await db.execute(sql`INSERT INTO alli_case_notes (young_person_id, note_text, author, is_ep_only) VALUES (${req.params.id}, ${note_text.trim()}, ${author || "EP Staff"}, ${is_ep_only || false}) RETURNING *`);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/alli/young-people/:id/notes", authenticateEPStaff, async (req, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM alli_case_notes WHERE young_person_id = ${req.params.id} ORDER BY created_at DESC`);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Case Documents — upload
  app.post("/api/alli/young-people/:id/documents", authenticateEPStaff, alliUpload.single("file"), async (req: any, res) => {
    try {
      const id = req.params.id;
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const fileUrl = `/uploads/alli/${req.file.filename}`;
      const { document_type, uploaded_by } = req.body;
      await db.execute(sql`INSERT INTO alli_case_documents (young_person_id, document_type, file_url, file_name, uploaded_by) VALUES (${id}, ${document_type || "other"}, ${fileUrl}, ${req.file.originalname}, ${uploaded_by || "EP Staff"})`);
      return res.status(201).json({ message: "Uploaded", url: fileUrl, name: req.file.originalname });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/alli/young-people/:id/documents", authenticateEPStaff, async (req, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM alli_case_documents WHERE young_person_id = ${req.params.id} ORDER BY uploaded_at DESC`);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Stats
  app.get("/api/alli/young-people/stats/summary", authenticateEPStaff, async (_req, res) => {
    try {
      const r = await db.execute(sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending_consent') as pending_consent,
          COUNT(*) FILTER (WHERE status = 'consent_received' OR status = 'assessment_scheduled') as in_assessment,
          COUNT(*) FILTER (WHERE status = 'assessment_complete' OR status = 'matched_to_partner') as matched,
          COUNT(*) FILTER (WHERE status = 'actively_supported') as actively_supported,
          COUNT(*) FILTER (WHERE status = 'case_closed') as closed
        FROM alli_young_people
      `);
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Consent letter template download
  app.get("/api/alli/consent-template/:type", (_req, res) => {
    const { type } = _req.params;
    const isUnder18 = type === "under18";
    const title = isUnder18 ? "Parent / Guardian Consent Letter — Young Person Under 18" : "Young Person Consent Letter — 18 and Over";
    const body = isUnder18 ? `Dear Parent or Guardian,

ALLI Foundation is a UK registered charity (No. 1182529) dedicated to supporting young people affected by knife crime and gang involvement. We have been made aware that your child may benefit from our support and referral services.

We would like your permission to:
• Conduct a brief needs assessment with your child
• Share relevant information with appropriate support organisations
• Connect your child with services that may help them

All information will be handled in strict confidence in accordance with GDPR and data protection legislation. Your child's information will not be shared without your explicit consent except where there is a risk to their safety or the safety of others.

If you consent to ALLI Foundation supporting your child please sign below.

Signature: _______________________________________________
Print name: _______________________________________________
Relationship to child: _______________________________________________
Date: _______________________________________________

For any questions please contact: adminuk@eventperfekt.com
ALLI Foundation — Confidential` : `Dear [Young Person's Name],

ALLI Foundation is a UK registered charity (No. 1182529) dedicated to supporting young people affected by knife crime and gang involvement. We understand you may benefit from our support and referral services.

We would like your permission to:
• Conduct a brief needs assessment with you
• Share relevant information with appropriate support organisations
• Connect you with services that may help you

All information will be handled in strict confidence in accordance with GDPR and data protection legislation. Your information will not be shared without your explicit consent except where there is a risk to your safety or the safety of others.

If you consent to ALLI Foundation supporting you please sign below.

Signature: _______________________________________________
Print name: _______________________________________________
Date: _______________________________________________

For any questions please contact: adminuk@eventperfekt.com
ALLI Foundation — Confidential`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;font-size:13pt;margin:60px;line-height:1.8;color:#000}h1{font-size:16pt;margin-bottom:4px}h3{margin-top:0;color:#333}.header{border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:24px}.footer{margin-top:40px;font-size:10pt;color:#555;border-top:1px solid #ccc;padding-top:10px}</style></head><body><div class="header"><h1>ALLI Foundation</h1><h3>Confidential</h3><h2>${title}</h2></div><pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:12pt">${body}</pre><div class="footer">ALLI Foundation — Charity No. 1182529 — www.allifoundation.org<br>This document is confidential and must be handled in accordance with GDPR requirements.</div></body></html>`;
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", `attachment; filename="alli-consent-${type}.html"`);
    res.send(html);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // MODULE 2 — PARTNERS — STAFF ROUTES
  // ══════════════════════════════════════════════════════════════════════════════

  app.get("/api/alli/partners", authenticateEPStaff, async (_req, res) => {
    try {
      const r = await db.execute(sql`
        SELECT p.*, 
          (SELECT COUNT(*) FROM alli_interventions i WHERE i.partner_id = p.id AND i.outcome = 'ongoing') as caseload
        FROM alli_partners p ORDER BY p.name ASC
      `);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/alli/partners", authenticateEPStaff, async (req, res) => {
    try {
      const { name, organisation_type, website, primary_contact_name, primary_contact_email, primary_contact_phone, services, areas_covered, capacity, cost_type, agreement_status, notes, owner, engagement_status, date_approached, date_last_contact, next_action_date, next_action, description, why_engage } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Partner name required" });
      const r = await db.execute(sql`
        INSERT INTO alli_partners (name, organisation_type, website, primary_contact_name, primary_contact_email, primary_contact_phone, services, areas_covered, capacity, cost_type, agreement_status, notes, owner, engagement_status, date_approached, date_last_contact, next_action_date, next_action, description, why_engage)
        VALUES (${name.trim()}, ${organisation_type || null}, ${website || null}, ${primary_contact_name || null}, ${primary_contact_email || null}, ${primary_contact_phone || null}, ${JSON.stringify(services || [])}, ${JSON.stringify(areas_covered || [])}, ${capacity || null}, ${cost_type || null}, ${agreement_status || "informal"}, ${notes || null}, ${owner || "ALLI Foundation"}, ${engagement_status || "Not started"}, ${date_approached || null}, ${date_last_contact || null}, ${next_action_date || null}, ${next_action || null}, ${description || null}, ${why_engage || null})
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/alli/partners/:id", authenticateEPStaff, async (req, res) => {
    try {
      const id = req.params.id;
      const p = await db.execute(sql`SELECT * FROM alli_partners WHERE id = ${id}`);
      if (!p.rows.length) return res.status(404).json({ message: "Not found" });
      const [meetings, docs, notes, caseload] = await Promise.all([
        db.execute(sql`SELECT * FROM alli_partner_meetings WHERE partner_id = ${id} ORDER BY meeting_date DESC`),
        db.execute(sql`SELECT * FROM alli_partner_documents WHERE partner_id = ${id} ORDER BY uploaded_at DESC`),
        db.execute(sql`SELECT * FROM alli_partner_notes WHERE partner_id = ${id} ORDER BY created_at DESC`),
        db.execute(sql`SELECT yp.reference_number, yp.first_name, yp.status FROM alli_interventions i JOIN alli_young_people yp ON yp.id = i.young_person_id WHERE i.partner_id = ${id} AND i.outcome = 'ongoing'`),
      ]);
      return res.json({ ...p.rows[0], meetings: meetings.rows, documents: docs.rows, notes: notes.rows, caseload: caseload.rows });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/alli/partners/:id", authenticateEPStaff, async (req, res) => {
    try {
      const { name, status, organisation_type, notes, agreement_status, owner, engagement_status, date_approached, date_last_contact, next_action_date, next_action, description, why_engage } = req.body;
      // Auto-stamp notes with date and owner when notes are updated
      let finalNotes = notes || null;
      if (notes?.trim()) {
        const stamp = new Date().toISOString().split("T")[0] + " | " + (owner || "ALLI Foundation");
        finalNotes = `[${stamp}]\n${notes.trim()}`;
      }
      await db.execute(sql`
        UPDATE alli_partners SET
          name = COALESCE(${name || null}, name),
          status = COALESCE(${status || null}, status),
          organisation_type = COALESCE(${organisation_type || null}, organisation_type),
          notes = COALESCE(${finalNotes}, notes),
          agreement_status = COALESCE(${agreement_status || null}, agreement_status),
          owner = COALESCE(${owner || null}, owner),
          engagement_status = COALESCE(${engagement_status || null}, engagement_status),
          date_approached = COALESCE(${date_approached || null}, date_approached),
          date_last_contact = COALESCE(${date_last_contact || null}, date_last_contact),
          next_action_date = COALESCE(${next_action_date || null}, next_action_date),
          next_action = COALESCE(${next_action || null}, next_action),
          description = COALESCE(${description || null}, description),
          why_engage = COALESCE(${why_engage || null}, why_engage),
          updated_at = NOW()
        WHERE id = ${req.params.id}
      `);
      const r = await db.execute(sql`SELECT * FROM alli_partners WHERE id = ${req.params.id}`);
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/alli/partners/:id/meetings", authenticateEPStaff, async (req, res) => {
    try {
      const { meeting_date, attendees, notes, actions_agreed } = req.body;
      const r = await db.execute(sql`INSERT INTO alli_partner_meetings (partner_id, meeting_date, attendees, notes, actions_agreed) VALUES (${req.params.id}, ${meeting_date || null}, ${attendees || null}, ${notes || null}, ${actions_agreed || null}) RETURNING *`);
      await db.execute(sql`UPDATE alli_partners SET last_engagement_date = ${meeting_date || null}, updated_at = NOW() WHERE id = ${req.params.id}`);
      res.status(201).json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/alli/partners/:id/notes", authenticateEPStaff, async (req, res) => {
    try {
      const { note_text, author } = req.body;
      const r = await db.execute(sql`INSERT INTO alli_partner_notes (partner_id, note_text, author) VALUES (${req.params.id}, ${note_text}, ${author || "EP Staff"}) RETURNING *`);
      res.status(201).json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/alli/partners/:id/documents", authenticateEPStaff, alliUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file" });
      const fileUrl = `/uploads/alli/${req.file.filename}`;
      const { document_type, uploaded_by } = req.body;
      await db.execute(sql`INSERT INTO alli_partner_documents (partner_id, document_type, file_url, file_name, uploaded_by) VALUES (${req.params.id}, ${document_type || "other"}, ${fileUrl}, ${req.file.originalname}, ${uploaded_by || "EP Staff"})`);
      return res.status(201).json({ url: fileUrl, name: req.file.originalname });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // MODULE 3 — EVENTS — STAFF ROUTES
  // ══════════════════════════════════════════════════════════════════════════════

  app.get("/api/alli/events", authenticateEPStaff, async (_req, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM alli_events ORDER BY event_date ASC`);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/alli/events", authenticateEPStaff, async (req, res) => {
    try {
      const { event_name, event_type, event_date, location_name, location_address, lead_person, target_audience, expected_attendance, status, description, preparation_notes, resources_needed, budget } = req.body;
      if (!event_name?.trim()) return res.status(400).json({ message: "Event name required" });
      const r = await db.execute(sql`
        INSERT INTO alli_events (event_name, event_type, event_date, location_name, location_address, lead_person, target_audience, expected_attendance, status, description, preparation_notes, resources_needed, budget)
        VALUES (${event_name.trim()}, ${event_type || null}, ${event_date || null}, ${location_name || null}, ${location_address || null}, ${lead_person || null}, ${target_audience || null}, ${expected_attendance || null}, ${status || "planned"}, ${description || null}, ${preparation_notes || null}, ${resources_needed || null}, ${budget || null})
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/alli/events/:id", authenticateEPStaff, async (req, res) => {
    try {
      const id = req.params.id;
      const ev = await db.execute(sql`SELECT * FROM alli_events WHERE id = ${id}`);
      if (!ev.rows.length) return res.status(404).json({ message: "Not found" });
      const [docs, attendees] = await Promise.all([
        db.execute(sql`SELECT * FROM alli_event_documents WHERE event_id = ${id} ORDER BY uploaded_at DESC`),
        db.execute(sql`SELECT * FROM alli_event_attendees WHERE event_id = ${id}`),
      ]);
      return res.json({ ...ev.rows[0], documents: docs.rows, attendees: attendees.rows });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/alli/events/:id", authenticateEPStaff, async (req, res) => {
    try {
      const { status, outcome_notes } = req.body;
      await db.execute(sql`UPDATE alli_events SET status = COALESCE(${status || null}, status), outcome_notes = COALESCE(${outcome_notes || null}, outcome_notes), updated_at = NOW() WHERE id = ${req.params.id}`);
      const r = await db.execute(sql`SELECT * FROM alli_events WHERE id = ${req.params.id}`);
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/alli/events/:id/documents", authenticateEPStaff, alliUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file" });
      const fileUrl = `/uploads/alli/${req.file.filename}`;
      const { document_type, uploaded_by } = req.body;
      await db.execute(sql`INSERT INTO alli_event_documents (event_id, document_type, file_url, file_name, uploaded_by) VALUES (${req.params.id}, ${document_type || "other"}, ${fileUrl}, ${req.file.originalname}, ${uploaded_by || "EP Staff"})`);
      return res.status(201).json({ url: fileUrl, name: req.file.originalname });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // CLIENT PORTAL — ALLI FOUNDATION READ ROUTES
  // ══════════════════════════════════════════════════════════════════════════════

  // Young People — portal view (read + add referral + add note + upload consent)
  app.get("/api/client-portal/alli/young-people", authenticateClientPortal, async (_req, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM alli_young_people ORDER BY created_at DESC`);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/alli/young-people/stats", authenticateClientPortal, async (_req, res) => {
    try {
      const r = await db.execute(sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending_consent') as pending_consent,
          COUNT(*) FILTER (WHERE status IN ('consent_received','assessment_scheduled')) as in_assessment,
          COUNT(*) FILTER (WHERE status IN ('assessment_complete','matched_to_partner')) as matched,
          COUNT(*) FILTER (WHERE status = 'actively_supported') as actively_supported,
          COUNT(*) FILTER (WHERE status = 'case_closed') as closed
        FROM alli_young_people
      `);
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/alli/young-people/:id", authenticateClientPortal, async (req, res) => {
    try {
      const id = req.params.id;
      const yp = await db.execute(sql`SELECT * FROM alli_young_people WHERE id = ${id}`);
      if (!yp.rows.length) return res.status(404).json({ message: "Not found" });
      const [consent, assessment, intervention, notes, docs, reqs] = await Promise.all([
        db.execute(sql`SELECT * FROM alli_consent_documents WHERE young_person_id = ${id} ORDER BY uploaded_at DESC`),
        db.execute(sql`SELECT * FROM alli_assessments WHERE young_person_id = ${id} ORDER BY created_at DESC LIMIT 1`),
        db.execute(sql`SELECT i.*, p.name as partner_name FROM alli_interventions i LEFT JOIN alli_partners p ON p.id = i.partner_id WHERE i.young_person_id = ${id} ORDER BY i.created_at DESC LIMIT 1`),
        db.execute(sql`SELECT * FROM alli_case_notes WHERE young_person_id = ${id} AND is_ep_only = false ORDER BY created_at DESC`),
        db.execute(sql`SELECT * FROM alli_case_documents WHERE young_person_id = ${id} ORDER BY uploaded_at DESC`),
        db.execute(sql`SELECT * FROM alli_assessment_requests WHERE young_person_id = ${id} ORDER BY created_at DESC LIMIT 3`),
      ]);
      return res.json({ ...yp.rows[0], consent_docs: consent.rows, assessment: assessment.rows[0] || null, intervention: intervention.rows[0] || null, notes: notes.rows, documents: docs.rows, assessment_requests: reqs.rows || [] });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Portal: request assessment appointment
  app.post("/api/client-portal/alli/young-people/:id/assessment-request", authenticateClientPortal, async (req: any, res) => {
    try {
      const id = req.params.id;
      const { requested_date, requested_time, location_type, location_detail, notes } = req.body || {};
      if (!requested_date) return res.status(400).json({ message: "Date is required" });
      const r = await db.execute(sql`
        INSERT INTO alli_assessment_requests (young_person_id, requested_date, requested_time, location_type, location_detail, notes, requested_by, requested_by_email, status)
        VALUES (${id}, ${requested_date}, ${requested_time || null}, ${location_type || 'in_person'}, ${location_detail || null}, ${notes || null}, ${req.portalUser?.fullName || "ALLI Trustee"}, ${req.portalUser?.email || ""}, 'pending')
        RETURNING *
      `);
      const yp = await db.execute(sql`SELECT first_name, reference_number FROM alli_young_people WHERE id = ${id}`);
      const name = yp.rows[0]?.first_name || "";
      const ref = yp.rows[0]?.reference_number || "";
      await sendEmail(
        "adminuk@eventperfekt.com",
        `[ALLI Portal] Assessment requested — ${ref} — ${name}`,
        `<p><strong>${req.portalUser?.fullName || "ALLI Trustee"}</strong> has requested an assessment appointment.</p>
        <p>Case: <strong>${ref}</strong> — ${name}</p>
        <p>Preferred date: <strong>${requested_date}</strong> at <strong>${requested_time || "any time"}</strong></p>
        ${notes ? `<p>Notes: ${notes}</p>` : ""}
        <p>Location: ${location_type || "in_person"}${location_detail ? ` — ${location_detail}` : ""}</p>`
      );
      return res.status(201).json({ message: "Assessment request submitted", request: r.rows[0] });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Portal: upload case document (general, not just consent)
  app.post("/api/client-portal/alli/young-people/:id/documents", authenticateClientPortal, alliUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const fileUrl = `/alli-uploads/${req.file.filename}`;
      const { document_type, description } = req.body;
      const r = await db.execute(sql`
        INSERT INTO alli_case_documents (young_person_id, document_type, file_url, file_name, uploaded_by, description)
        VALUES (${req.params.id}, ${document_type || "other"}, ${fileUrl}, ${req.file.originalname}, ${req.portalUser?.fullName || "ALLI Trustee"}, ${description || null})
        RETURNING *
      `);
      await sendEmail(
        "adminuk@eventperfekt.com",
        `[ALLI Portal] Document uploaded — Case ${req.params.id}`,
        `<p><strong>${req.portalUser?.fullName || "ALLI Trustee"}</strong> uploaded a document for case ${req.params.id}.</p><p>File: ${req.file.originalname}</p><p>Type: ${document_type || "other"}</p>`
      );
      return res.status(201).json({ message: "Uploaded", document: r.rows[0] });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Portal: add referral
  app.post("/api/client-portal/alli/young-people", authenticateClientPortal, async (req: any, res) => {
    try {
      const { first_name, age, gender, area, referral_source, circumstances, referring_person, consent_status, priority } = req.body;
      if (!first_name?.trim()) return res.status(400).json({ message: "First name required" });
      if (!circumstances || circumstances.length < 50) return res.status(400).json({ message: "Brief circumstances must be at least 50 characters" });
      const ref = await nextYPRef();
      const r = await db.execute(sql`
        INSERT INTO alli_young_people (reference_number, first_name, age, gender, area, referral_source, circumstances, referring_person, consent_status, priority)
        VALUES (${ref}, ${first_name.trim()}, ${age || null}, ${gender || null}, ${area || null}, ${referral_source || null}, ${circumstances}, ${referring_person || null}, ${consent_status || "pending"}, ${priority || "medium"})
        RETURNING *
      `);
      await sendEmail("adminuk@eventperfekt.com", `[ALLI Portal] New Referral — ${ref} — ${first_name.trim()}`, `<p>A new referral has been added via the ALLI Foundation client portal by ${req.portalUser.fullName}.</p><p>Reference: <strong>${ref}</strong></p>`);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Portal: add case note
  app.post("/api/client-portal/alli/young-people/:id/notes", authenticateClientPortal, async (req: any, res) => {
    try {
      const { note_text } = req.body;
      if (!note_text?.trim()) return res.status(400).json({ message: "Note required" });
      const r = await db.execute(sql`INSERT INTO alli_case_notes (young_person_id, note_text, author, is_ep_only) VALUES (${req.params.id}, ${note_text.trim()}, ${req.portalUser.fullName || "ALLI Trustee"}, false) RETURNING *`);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Portal: PATCH young person (inline editing)
  app.patch("/api/client-portal/alli/young-people/:id", authenticateClientPortal, async (req: any, res) => {
    try {
      const id = req.params.id;
      const { first_name, age, gender, area, referral_source, circumstances, referring_person, consent_status, priority, assigned_to, status, notes, reference_number, referral_date } = req.body;
      let finalNotes = notes ?? null;
      if (notes?.trim()) {
        const stamp = new Date().toISOString().split("T")[0] + " | " + (req.portalUser?.fullName || "ALLI Foundation");
        finalNotes = `[${stamp}]\n${notes.trim()}`;
      }
      await db.execute(sql`
        UPDATE alli_young_people SET
          first_name = COALESCE(${first_name ?? null}, first_name),
          reference_number = COALESCE(${reference_number ?? null}, reference_number),
          age = COALESCE(${age ?? null}, age),
          gender = COALESCE(${gender ?? null}, gender),
          area = COALESCE(${area ?? null}, area),
          referral_source = COALESCE(${referral_source ?? null}, referral_source),
          referral_date = COALESCE(${referral_date ?? null}, referral_date),
          circumstances = COALESCE(${circumstances ?? null}, circumstances),
          referring_person = COALESCE(${referring_person ?? null}, referring_person),
          consent_status = COALESCE(${consent_status ?? null}, consent_status),
          priority = COALESCE(${priority ?? null}, priority),
          assigned_to = COALESCE(${assigned_to ?? null}, assigned_to),
          status = COALESCE(${status ?? null}, status),
          notes = COALESCE(${finalNotes}, notes),
          updated_at = NOW()
        WHERE id = ${id}
      `);
      const r = await db.execute(sql`SELECT * FROM alli_young_people WHERE id = ${id}`);
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Portal: upload consent document
  app.post("/api/client-portal/alli/young-people/:id/consent", authenticateClientPortal, alliUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const fileUrl = `/uploads/alli/${req.file.filename}`;
      const { document_type } = req.body;
      await db.execute(sql`INSERT INTO alli_consent_documents (young_person_id, document_type, file_url, uploaded_by, review_status) VALUES (${req.params.id}, ${document_type || "consent_letter"}, ${fileUrl}, ${req.portalUser.fullName || "ALLI Trustee"}, 'awaiting_review')`);
      await sendEmail("adminuk@eventperfekt.com", `[ALLI Portal] Consent document uploaded — Case ${req.params.id}`, `<p>A consent document has been uploaded by ${req.portalUser.fullName} for case ID ${req.params.id}. Awaiting review.</p>`);
      return res.status(201).json({ message: "Uploaded" });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Partners — portal view
  app.get("/api/client-portal/alli/partners", authenticateClientPortal, async (_req, res) => {
    try {
      const r = await db.execute(sql`
        SELECT p.*,
          (SELECT COUNT(*) FROM alli_interventions i WHERE i.partner_id = p.id AND i.outcome = 'ongoing') as caseload
        FROM alli_partners p ORDER BY p.name ASC
      `);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/alli/partners/:id", authenticateClientPortal, async (req, res) => {
    try {
      const id = req.params.id;
      const p = await db.execute(sql`SELECT * FROM alli_partners WHERE id = ${id}`);
      if (!p.rows.length) return res.status(404).json({ message: "Not found" });
      const [meetings, docs] = await Promise.all([
        db.execute(sql`SELECT * FROM alli_partner_meetings WHERE partner_id = ${id} ORDER BY meeting_date DESC`),
        db.execute(sql`SELECT * FROM alli_partner_documents WHERE partner_id = ${id} ORDER BY uploaded_at DESC`),
      ]);
      return res.json({ ...p.rows[0], meetings: meetings.rows, documents: docs.rows });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Portal: add partner meeting note
  app.post("/api/client-portal/alli/partners/:id/meetings", authenticateClientPortal, async (req: any, res) => {
    try {
      const { meeting_date, attendees, notes, actions_agreed } = req.body;
      const r = await db.execute(sql`INSERT INTO alli_partner_meetings (partner_id, meeting_date, attendees, notes, actions_agreed) VALUES (${req.params.id}, ${meeting_date || null}, ${attendees || null}, ${notes || null}, ${actions_agreed || null}) RETURNING *`);
      res.status(201).json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Portal: upload partner document
  app.post("/api/client-portal/alli/partners/:id/documents", authenticateClientPortal, alliUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file" });
      const fileUrl = `/uploads/alli/${req.file.filename}`;
      await db.execute(sql`INSERT INTO alli_partner_documents (partner_id, document_type, file_url, file_name, uploaded_by) VALUES (${req.params.id}, ${req.body.document_type || "other"}, ${fileUrl}, ${req.file.originalname}, ${req.portalUser.fullName || "ALLI Trustee"})`);
      return res.status(201).json({ url: fileUrl, name: req.file.originalname });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Portal: create new partner
  app.post("/api/client-portal/alli/partners", authenticateClientPortal, async (req: any, res) => {
    try {
      const { name, organisation_type, website, primary_contact_name, primary_contact_email, primary_contact_phone, services, areas_covered, owner, engagement_status, date_approached, date_last_contact, next_action_date, next_action, description, why_engage, notes } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Partner name required" });
      // Reject placeholder emails/phones
      const cleanEmail = primary_contact_email?.trim() || null;
      const cleanPhone = primary_contact_phone?.trim() || null;
      if (cleanEmail && (cleanEmail.includes("example.com") || cleanEmail.includes("@example"))) return res.status(400).json({ message: "Invalid email address" });
      let finalNotes = notes ?? null;
      if (notes?.trim()) {
        const stamp = new Date().toISOString().split("T")[0] + " | " + (req.portalUser?.fullName || "ALLI Foundation");
        finalNotes = `[${stamp}]\n${notes.trim()}`;
      }
      const r = await db.execute(sql`
        INSERT INTO alli_partners (name, organisation_type, website, primary_contact_name, primary_contact_email, primary_contact_phone, services, areas_covered, owner, engagement_status, date_approached, date_last_contact, next_action_date, next_action, description, why_engage, notes)
        VALUES (${name.trim()}, ${organisation_type || null}, ${website || null}, ${primary_contact_name || null}, ${cleanEmail}, ${cleanPhone}, ${JSON.stringify(services || [])}, ${JSON.stringify(areas_covered || [])}, ${owner || "ALLI Foundation"}, ${engagement_status || "Not started"}, ${date_approached || null}, ${date_last_contact || null}, ${next_action_date || null}, ${next_action || null}, ${description || null}, ${why_engage || null}, ${finalNotes})
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Portal: delete partner
  app.delete("/api/client-portal/alli/partners/:id", authenticateClientPortal, async (req, res) => {
    try {
      await db.execute(sql`DELETE FROM alli_partners WHERE id = ${req.params.id}`);
      res.json({ message: "Partner deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Portal: PATCH partner (inline editing)
  app.patch("/api/client-portal/alli/partners/:id", authenticateClientPortal, async (req: any, res) => {
    try {
      const id = req.params.id;
      const {
        name, organisation_type, website, primary_contact_name, primary_contact_email, primary_contact_phone,
        services, areas_covered, status, agreement_status, owner, engagement_status,
        date_approached, date_last_contact, next_action_date, next_action, description, why_engage, notes
      } = req.body;
      let finalNotes = notes ?? null;
      if (notes?.trim()) {
        const stamp = new Date().toISOString().split("T")[0] + " | " + (req.portalUser?.fullName || "ALLI Foundation");
        finalNotes = `[${stamp}]\n${notes.trim()}`;
      }
      await db.execute(sql`
        UPDATE alli_partners SET
          name = COALESCE(${name ?? null}, name),
          organisation_type = COALESCE(${organisation_type ?? null}, organisation_type),
          website = COALESCE(${website ?? null}, website),
          primary_contact_name = COALESCE(${primary_contact_name ?? null}, primary_contact_name),
          primary_contact_email = COALESCE(${primary_contact_email ?? null}, primary_contact_email),
          primary_contact_phone = COALESCE(${primary_contact_phone ?? null}, primary_contact_phone),
          services = COALESCE(${services ? JSON.stringify(services) : null}, services),
          areas_covered = COALESCE(${areas_covered ? JSON.stringify(areas_covered) : null}, areas_covered),
          status = COALESCE(${status ?? null}, status),
          agreement_status = COALESCE(${agreement_status ?? null}, agreement_status),
          owner = COALESCE(${owner ?? null}, owner),
          engagement_status = COALESCE(${engagement_status ?? null}, engagement_status),
          date_approached = COALESCE(${date_approached ?? null}, date_approached),
          date_last_contact = COALESCE(${date_last_contact ?? null}, date_last_contact),
          next_action_date = COALESCE(${next_action_date ?? null}, next_action_date),
          next_action = COALESCE(${next_action ?? null}, next_action),
          description = COALESCE(${description ?? null}, description),
          why_engage = COALESCE(${why_engage ?? null}, why_engage),
          notes = COALESCE(${finalNotes}, notes),
          updated_at = NOW()
        WHERE id = ${id}
      `);
      const r = await db.execute(sql`SELECT p.*, (SELECT COUNT(*) FROM alli_interventions i WHERE i.partner_id = p.id AND i.outcome = 'ongoing') as caseload FROM alli_partners p WHERE p.id = ${id}`);
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Funders — portal view
  app.get("/api/client-portal/alli/funders", authenticateClientPortal, async (_req, res) => {
    try {
      const r = await db.execute(sql`SELECT * FROM alli_funders ORDER BY tier ASC, next_action_date ASC NULLS LAST, name ASC`);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/alli/funders/:id", authenticateClientPortal, async (req, res) => {
    try {
      const id = req.params.id;
      const f = await db.execute(sql`SELECT * FROM alli_funders WHERE id = ${id}`);
      if (!f.rows.length) return res.status(404).json({ message: "Not found" });
      const g = await db.execute(sql`SELECT flag_value FROM alli_governance_flags WHERE flag_name = 'trustee_approval_gate' LIMIT 1`);
      const gateResolved = (g.rows[0] as any)?.flag_value === true;
      return res.json({ ...f.rows[0], trustee_approval_gate: gateResolved });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Portal: create new funder
  app.post("/api/client-portal/alli/funders", authenticateClientPortal, async (req: any, res) => {
    try {
      const { name, tier, grant_range, eligibility, fit_for_alli, route_in, contact, application_url, when_to_apply, owner, status, amount_applied_for, amount_awarded, date_submitted, decision_date, next_action_date, next_action, notes } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Funder name required" });
      if (!tier?.trim()) return res.status(400).json({ message: "Tier required" });
      const cleanContact = contact?.trim() || null;
      if (cleanContact && (cleanContact.includes("example.com") || cleanContact.includes("@example"))) return res.status(400).json({ message: "Invalid contact email" });
      let finalNotes = notes ?? null;
      if (notes?.trim()) {
        const stamp = new Date().toISOString().split("T")[0] + " | " + (req.portalUser?.fullName || "ALLI Foundation");
        finalNotes = `[${stamp}]\n${notes.trim()}`;
      }
      const r = await db.execute(sql`
        INSERT INTO alli_funders (name, tier, grant_range, eligibility, fit_for_alli, route_in, contact, application_url, when_to_apply, owner, status, amount_applied_for, amount_awarded, date_submitted, decision_date, next_action_date, next_action, notes)
        VALUES (${name.trim()}, ${tier || "Tier 2"}, ${grant_range || null}, ${eligibility || null}, ${fit_for_alli || null}, ${route_in || null}, ${cleanContact}, ${application_url || null}, ${when_to_apply || null}, ${owner || "ALLI Foundation"}, ${status || "Not started"}, ${amount_applied_for || null}, ${amount_awarded || null}, ${date_submitted || null}, ${decision_date || null}, ${next_action_date || null}, ${next_action || null}, ${finalNotes})
        RETURNING *
      `);
      return res.status(201).json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Portal: delete funder
  app.delete("/api/client-portal/alli/funders/:id", authenticateClientPortal, async (req, res) => {
    try {
      await db.execute(sql`DELETE FROM alli_funders WHERE id = ${req.params.id}`);
      res.json({ message: "Funder deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Portal: PATCH funder (inline editing) with Trustee approval gate
  app.patch("/api/client-portal/alli/funders/:id", authenticateClientPortal, async (req: any, res) => {
    try {
      const id = req.params.id;
      const {
        name, tier, grant_range, eligibility, fit_for_alli, route_in, contact,
        application_url, when_to_apply, owner, status,
        amount_applied_for, amount_awarded, date_submitted, decision_date,
        next_action_date, next_action, notes
      } = req.body;

      // Trustee approval gate: block status change from "Not started" unless gate resolved
      if (status && status !== "Not started") {
        const g = await db.execute(sql`SELECT flag_value FROM alli_governance_flags WHERE flag_name = 'trustee_approval_gate' LIMIT 1`);
        const gateResolved = (g.rows[0] as any)?.flag_value === true;
        if (!gateResolved) {
          return res.status(403).json({
            message: "Trustee approval gate unresolved — applications blocked. Contact a Trustee to resolve before changing status.",
            trustee_gate: true
          });
        }
      }

      let finalNotes = notes ?? null;
      if (notes?.trim()) {
        const stamp = new Date().toISOString().split("T")[0] + " | " + (req.portalUser?.fullName || "ALLI Foundation");
        finalNotes = `[${stamp}]\n${notes.trim()}`;
      }
      await db.execute(sql`
        UPDATE alli_funders SET
          name = COALESCE(${name ?? null}, name),
          tier = COALESCE(${tier ?? null}, tier),
          grant_range = COALESCE(${grant_range ?? null}, grant_range),
          eligibility = COALESCE(${eligibility ?? null}, eligibility),
          fit_for_alli = COALESCE(${fit_for_alli ?? null}, fit_for_alli),
          route_in = COALESCE(${route_in ?? null}, route_in),
          contact = COALESCE(${contact ?? null}, contact),
          application_url = COALESCE(${application_url ?? null}, application_url),
          when_to_apply = COALESCE(${when_to_apply ?? null}, when_to_apply),
          owner = COALESCE(${owner ?? null}, owner),
          status = COALESCE(${status ?? null}, status),
          amount_applied_for = COALESCE(${amount_applied_for ?? null}, amount_applied_for),
          amount_awarded = COALESCE(${amount_awarded ?? null}, amount_awarded),
          date_submitted = COALESCE(${date_submitted ?? null}, date_submitted),
          decision_date = COALESCE(${decision_date ?? null}, decision_date),
          next_action_date = COALESCE(${next_action_date ?? null}, next_action_date),
          next_action = COALESCE(${next_action ?? null}, next_action),
          notes = COALESCE(${finalNotes}, notes),
          updated_at = NOW()
        WHERE id = ${id}
      `);
      const r = await db.execute(sql`SELECT * FROM alli_funders WHERE id = ${id}`);
      return res.json(r.rows[0]);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Trustee approval gate endpoint (Trustees only)
  app.patch("/api/client-portal/alli/governance/gate", authenticateClientPortal, async (req: any, res) => {
    try {
      const email = req.portalUser?.email;
      const trusteeEmails = ["kehindeballi@gmail.com", "agboola@jobtrolley.co", "contact@allifoundation.org"];
      if (!trusteeEmails.includes(email)) {
        return res.status(403).json({ message: "Only Trustees can resolve the approval gate." });
      }
      const { resolved } = req.body;
      await db.execute(sql`
        UPDATE alli_governance_flags
        SET flag_value = ${resolved === true},
            resolved_by = ${resolved === true ? (req.portalUser?.fullName || email) : null},
            resolved_at = ${resolved === true ? new Date().toISOString() : null},
            updated_at = NOW()
        WHERE flag_name = 'trustee_approval_gate'
      `);
      return res.json({ flag_name: "trustee_approval_gate", resolved: resolved === true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/alli/governance/gate", authenticateClientPortal, async (_req, res) => {
    try {
      const g = await db.execute(sql`SELECT flag_value, resolved_by, resolved_at FROM alli_governance_flags WHERE flag_name = 'trustee_approval_gate' LIMIT 1`);
      if (!g.rows.length) return res.json({ resolved: false });
      const row = g.rows[0] as any;
      return res.json({ resolved: row.flag_value === true, resolved_by: row.resolved_by || null, resolved_at: row.resolved_at || null });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });

  // Events — portal view (real events + synthesised phase-deliverable due dates)
  app.get("/api/client-portal/alli/events", authenticateClientPortal, async (_req, res) => {
    try {
      const real = await db.execute(sql`SELECT * FROM alli_events ORDER BY event_date ASC`);

      // Group ALLI deliverables by phase to surface one calendar marker per phase
      const delivs = await db.execute(sql`
        SELECT phase_number, phase_name, deliverable_name, due_date, status
        FROM client_deliverables
        WHERE project_id = 'alli-foundation-2024' AND due_date IS NOT NULL
        ORDER BY phase_number, id
      `);
      const byPhase = new Map<number, { phase_name: string; due_date: string; items: { name: string; status: string }[] }>();
      for (const row of delivs.rows as any[]) {
        const p = row.phase_number;
        if (!byPhase.has(p)) byPhase.set(p, { phase_name: row.phase_name, due_date: row.due_date, items: [] });
        byPhase.get(p)!.items.push({ name: row.deliverable_name, status: row.status });
      }
      const phaseEvents = [...byPhase.entries()].map(([phase, info]) => {
        const total = info.items.length;
        const done = info.items.filter(i => i.status === "complete" || i.status === "delivered" || i.status === "approved").length;
        const allDone = done === total;
        return {
          id: `phase-${phase}-deliverables`,
          event_name: `${info.phase_name} — Deliverables Due`,
          event_type: "Project Deliverable",
          event_date: info.due_date,
          lead_person: "EP Project Team",
          status: allDone ? "completed" : "planned",
          location_name: "ALLI Foundation Project",
          target_audience: "ALLI Trustees",
          expected_attendance: null,
          description: `${total} deliverables due (${done} complete):\n\n` + info.items.map(i => `• ${i.name}${i.status === "complete" || i.status === "delivered" || i.status === "approved" ? " ✓" : ""}`).join("\n"),
        };
      });

      const combined = [...(real.rows as any[]), ...phaseEvents].sort((a: any, b: any) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );
      res.json(combined);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/client-portal/alli/events/:id", authenticateClientPortal, async (req, res) => {
    try {
      const id = req.params.id;
      const ev = await db.execute(sql`SELECT * FROM alli_events WHERE id = ${id}`);
      if (!ev.rows.length) return res.status(404).json({ message: "Not found" });
      const docs = await db.execute(sql`SELECT * FROM alli_event_documents WHERE event_id = ${id} ORDER BY uploaded_at DESC`);
      return res.json({ ...ev.rows[0], documents: docs.rows });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
  });
}
