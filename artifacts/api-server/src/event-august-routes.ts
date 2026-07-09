import { type Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { mirrorInterestToApplications } from "./event-applications-routes";
import multer from "multer";
import path from "path";
import fs from "fs";

const storiesStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = "uploads/stories";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `story-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`);
  },
});
const storiesUpload = multer({
  storage: storiesStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

const ipSubmitCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipSubmitCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipSubmitCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

async function sendEmail(to: string, subject: string, html: string) {
  const { emailService } = await import("./emailService");
  await emailService.sendEmail(to, subject, html);
}

// ── Disposable email blocklist ────────────────────────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
  "throwaway.email", "yopmail.com", "dispostable.com", "getnada.com",
  "sharklasers.com", "fakeinbox.com", "trashmail.com", "maildrop.cc",
  "mailnull.com", "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
  "temp-mail.org", "tempinbox.com", "tempr.email", "discard.email",
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && DISPOSABLE_DOMAINS.has(domain);
}

export async function registerEventAugustRoutes(app: Express) {
  app.use((req, _res, next) => {
    if (req.path.startsWith("/api/event-august/")) {
      console.log(`[IAmHerRoute] ${req.method} ${req.path}`);
    }
    next();
  });
  // ── Migrations ────────────────────────────────────────────────────────────

  // Seed I AM HER profiles if table is empty (idempotent, safe for production)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS iamher_profiles (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT,
      company TEXT,
      approved BOOLEAN NOT NULL DEFAULT true,
      photo_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const profileCount = await db.execute(sql`SELECT COUNT(*)::int as count FROM iamher_profiles`);
  if ((profileCount.rows[0] as any)?.count === 0) {
    await db.execute(sql`
      INSERT INTO iamher_profiles (id, name, title, company, approved, photo_url, created_at) VALUES
      (2, 'Rebecca Morgan', 'Managing Director', 'Morgan Consultancy Group', true, '/images/rebecca-morgan-real.png', '2026-06-14 10:00:00'),
      (3, 'Priya Shah', 'Founder & CEO', 'Shah Digital Consulting', true, '/images/priya-shah-real.png', '2026-06-15 10:00:00'),
      (4, 'Emily Sun', 'Director of Operations', 'Sun & Associates', true, '/images/emily-sun-real.png', '2026-06-16 10:00:00'),
      (5, 'Dr Sarah Jenkins', 'Women''s Health & Menopause Doctor', 'SJ', true, '/images/dr-sarah-jenkins.png', '2026-06-16 12:00:00'),
      (6, 'Esther Emenike-Okorie', 'CEO', 'Shujo Aesthetics', true, '/images/esther-e-white.png', '2026-06-16 14:00:00'),
      (7, 'Lynda Johnson', 'Founder', 'Event Perfekt Global Ltd', true, '/images/lynda-johnson.png', '2026-06-16 16:00:00')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log("[IAmHer] Seeded 6 room profiles");
  }

  // Seed I AM HER stories if table is empty
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS iamher_stories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      anonymous BOOLEAN NOT NULL DEFAULT false,
      job_title TEXT,
      generalized_title TEXT,
      company TEXT,
      email TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT,
      story TEXT NOT NULL,
      consent BOOLEAN NOT NULL DEFAULT true,
      status TEXT NOT NULL DEFAULT 'pending',
      featured BOOLEAN NOT NULL DEFAULT false,
      slug TEXT,
      rejection_note TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      published_at TIMESTAMP WITH TIME ZONE,
      photo_url TEXT,
      photo_consent BOOLEAN NOT NULL DEFAULT false,
      wellbeing_issues TEXT[],
      sought_support TEXT,
      support_providers TEXT[],
      support_testimonial TEXT,
      may_contact BOOLEAN NOT NULL DEFAULT false
    )
  `);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS photo_url TEXT`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS photo_consent BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS wellbeing_issues TEXT[]`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS sought_support TEXT`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS support_providers TEXT[]`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS support_testimonial TEXT`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS may_contact BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS title TEXT`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS website TEXT`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS linkedin TEXT`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS instagram TEXT`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS what_you_do TEXT`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS wish_you_knew TEXT`);

  const storyCount = await db.execute(sql`SELECT COUNT(*)::int as count FROM iamher_stories`);
  if ((storyCount.rows[0] as any)?.count === 0) {
    await db.execute(sql`
      INSERT INTO iamher_stories (id, name, anonymous, job_title, company, email, category, title, story, photo_url, consent, status, featured, slug, published_at, photo_consent, wellbeing_issues, sought_support, support_providers, support_testimonial, may_contact) VALUES
      (1, 'Rebecca Morgan', false, 'Managing Director', 'Morgan Consultancy Group', 'rebecca@morganconsultancy.co.uk', 'The Woman Behind the Title', 'I Forgot I Was Allowed To Be Tired', 'At 41, I had everything I thought I wanted. A growing consultancy. A great team. Two wonderful children. A supportive husband. People would often tell me they admired how much I managed to get done. What they didn''t see was that I was running on empty. Most mornings started before 6am. I''d get the children ready, answer emails in the car, attend meetings all day, then open my laptop again after dinner. I convinced myself it was just a busy season. Then one afternoon, sitting in a client meeting, I completely lost my train of thought. For the first time in my career, I couldn''t find the words. That moment frightened me. Not because of the meeting, but because I realised how exhausted I had become. I wasn''t failing. I was burnt out. Learning to ask for help has been one of the hardest and most important leadership lessons of my life.', '/images/rebecca-morgan-real.png', true, 'approved', false, 'i-am-her-the-woman-behind-the-titl-director-b062yc', '2026-06-14 10:00:00+00', false, ARRAY['Stress or burnout','Sleep challenges','Motherhood or caregiving responsibilities','Workplace challenges']::text[], 'Yes', ARRAY['Counsellor or Therapist','Friend or Family Member']::text[], 'Talking to someone helped me understand that success should not come at the expense of my health.', true),
      (2, 'Priya Shah', false, 'Founder', 'PS Growth Partners', 'priya@psgrowthpartners.co.uk', 'Identity', 'I Looked Successful. I Didn''t Feel Successful.', 'If you had looked at my LinkedIn profile three years ago, you would probably have assumed I was thriving. The business was growing. I was speaking at events. Clients were coming in. Yet every morning I stood in front of the mirror and barely recognised myself. I had lost confidence. I felt tired all the time. My skin changed. My energy changed. My patience changed. I blamed stress. I blamed work. I blamed myself. Eventually I started talking openly about what I was experiencing and discovered I wasn''t alone. The biggest surprise was how many successful women admitted they had been quietly struggling too. For years I thought confidence came from achievements. Now I know confidence starts with understanding yourself and taking care of yourself.', '/images/priya-shah-real.png', true, 'approved', false, 'i-am-her-identity-founder-79spsc', '2026-06-15 14:00:00+00', false, ARRAY['Hormonal changes','Skin health or appearance concerns','Anxiety or low confidence','Sleep challenges']::text[], 'Yes', ARRAY['Women''s Health Specialist','Beauty / Skin Clinic']::text[], 'The support helped me understand that what I was experiencing was real and that there were practical ways to improve how I felt.', true),
      (4, 'Emily Sun', false, 'Director of Operations', 'Sun & Associates', 'charlotte@example.com', 'Leadership', 'Capable Became The Cage', 'For most of my career, being capable was my superpower. I was the person people came to when something was impossible. The one who could fix a crisis, manage a difficult client, and still meet every deadline. By 38, I was running a department of forty people. I had built the team from the ground up. I had the trust of the board. I had the salary I once dreamed of. But I was also quietly unravelling. I told myself that feeling overwhelmed was just part of leadership. That the exhaustion was temporary. That the tension in my shoulders was normal. It was not normal. One evening, after a fourteen-hour day, I sat in my car in the office car park and could not remember how to drive home. Not because I was tired. Because I was empty. I had spent years proving I was capable. I had never stopped to ask whether I was okay. Capable became the cage. And I was the one who had built it.', '/images/emily-sun-real.png', true, 'approved', false, 'i-am-her-leadership-director-emilys', '2026-06-16 10:00:00+00', false, null, 'no', null, null, false)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log("[IAmHer] Seeded 3 stories");
  }

  await db.execute(sql`CREATE TABLE IF NOT EXISTS event_16july_interest (
    id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    source TEXT,
    consent_marketing BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address TEXT,
    email_confirmed BOOLEAN NOT NULL DEFAULT false,
    confirmation_token TEXT,
    work_email TEXT,
    job_title TEXT,
    website TEXT,
    attendance_reason TEXT,
    access_type TEXT,
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_reference TEXT,
    media_consent BOOLEAN NOT NULL DEFAULT false,
    feature_submitted BOOLEAN NOT NULL DEFAULT false,
    whatsapp_group_sent BOOLEAN NOT NULL DEFAULT false
  )`);

  // Add new columns if table already exists
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS work_email TEXT`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS job_title TEXT`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS website TEXT`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS attendance_reason TEXT`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS access_type TEXT`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS payment_method TEXT`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS payment_reference TEXT`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS media_consent BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS feature_submitted BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS whatsapp_group_sent BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS utm_source TEXT`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS utm_medium TEXT`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS utm_campaign TEXT`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS utm_content TEXT`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS referral_source TEXT`);

  // Campaign features table for I Am Her submissions
  await db.execute(sql`CREATE TABLE IF NOT EXISTS event_16july_features (
    id SERIAL PRIMARY KEY,
    interest_id INTEGER REFERENCES event_16july_interest(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    job_title TEXT,
    business TEXT,
    website TEXT,
    iamher_statement TEXT NOT NULL,
    short_bio TEXT,
    photo_url TEXT,
    consent_featured BOOLEAN NOT NULL DEFAULT false,
    consent_photo_rights BOOLEAN NOT NULL DEFAULT false,
    submitted_at TIMESTAMP DEFAULT NOW()
  )`);

  // I Am Her room profiles — created when attendees download their card
  await db.execute(sql`CREATE TABLE IF NOT EXISTS iamher_profiles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT,
    company TEXT,
    approved BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  )`);

  // I Am Her nominations — one woman nominating another
  await db.execute(sql`CREATE TABLE IF NOT EXISTS iamher_nominations (
    id SERIAL PRIMARY KEY,
    nominator_name TEXT NOT NULL,
    nominator_email TEXT NOT NULL,
    nominee_name TEXT NOT NULL,
    nominee_email TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  // I Am Her stories — UGC story wall
  await db.execute(sql`CREATE TABLE IF NOT EXISTS iamher_stories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    anonymous BOOLEAN NOT NULL DEFAULT false,
    job_title TEXT,
    generalized_title TEXT,
    company TEXT,
    email TEXT NOT NULL,
    category TEXT NOT NULL,
    story TEXT NOT NULL,
    photo_url TEXT,
    photo_consent BOOLEAN NOT NULL DEFAULT false,
    consent BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'pending',
    featured BOOLEAN NOT NULL DEFAULT false,
    slug TEXT UNIQUE,
    rejection_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
  )`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS photo_url TEXT`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS photo_consent BOOLEAN NOT NULL DEFAULT false`);

  // Wellbeing & support columns (added 2026-06-15)
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS wellbeing_issues TEXT[]`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS sought_support TEXT`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS support_providers TEXT[]`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS support_testimonial TEXT`);
  await db.execute(sql`ALTER TABLE iamher_stories ADD COLUMN IF NOT EXISTS may_contact BOOLEAN NOT NULL DEFAULT false`);

  // Per-profile image position (added 2026-06-16)
  await db.execute(sql`ALTER TABLE iamher_profiles ADD COLUMN IF NOT EXISTS photo_position TEXT NOT NULL DEFAULT 'center 20%'`);
  await db.execute(sql`UPDATE iamher_profiles SET photo_position = 'center 15%' WHERE id = 4`);
  await db.execute(sql`UPDATE iamher_profiles SET photo_position = 'center 25%' WHERE id = 5`);
  await db.execute(sql`UPDATE iamher_profiles SET photo_position = 'center 15%' WHERE id = 6`);
  await db.execute(sql`UPDATE iamher_profiles SET photo_position = 'center 8%'  WHERE id = 7`);
  // Fix Esther's photo — use card version with dark backdrop (not transparent PNG)
  await db.execute(sql`UPDATE iamher_profiles SET photo_url = '/images/esther-e-card.png' WHERE id = 6 AND photo_url != '/images/esther-e-card.png'`);

  await db.execute(sql`CREATE TABLE IF NOT EXISTS event_16july_partner_enquiries (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    organisation TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    linkedin TEXT,
    message TEXT NOT NULL,
    consent_marketing BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address TEXT
  )`);

  // Add columns to existing tables if they don't exist yet (safe to run after CREATE IF NOT EXISTS)
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS confirmation_token TEXT`);
  await db.execute(sql`ALTER TABLE event_16july_interest ADD COLUMN IF NOT EXISTS linkedin TEXT`);
  await db.execute(sql`ALTER TABLE event_16july_partner_enquiries ADD COLUMN IF NOT EXISTS linkedin TEXT`);

  // ── Product brand partnership enquiries (/iamher/partnership/product-brands) ──
  await db.execute(sql`CREATE TABLE IF NOT EXISTS event_16july_product_brand_enquiries (
    id SERIAL PRIMARY KEY,
    brand_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    product_type TEXT,
    opportunity TEXT,
    message TEXT,
    page TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address TEXT
  )`);

  // ── Brochure request table ────────────────────────────────────────────────
  await db.execute(sql`CREATE TABLE IF NOT EXISTS event_16july_brochure_requests (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    linkedin TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address TEXT,
    brochure_sent BOOLEAN NOT NULL DEFAULT false
  )`);

  await db.execute(sql`CREATE TABLE IF NOT EXISTS event_16july_sponsor_enquiries (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    sponsorship_type TEXT,
    message TEXT NOT NULL,
    consent_marketing BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address TEXT
  )`);

  // ── Waiting list table (About The Movement) ────────────────────────────
  await db.execute(sql`CREATE TABLE IF NOT EXISTS iamher_waiting_list (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    organisation TEXT,
    country TEXT,
    region TEXT,
    interest_type TEXT NOT NULL DEFAULT 'guest',
    reason TEXT,
    consent_marketing BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address TEXT
  )`);

  // ── Community table (Join the Community) ────────────────────────────────
  await db.execute(sql`CREATE TABLE IF NOT EXISTS event_16july_community (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL,
    job_title TEXT NOT NULL,
    website TEXT,
    pain_points TEXT[],
    biggest_challenge TEXT,
    what_seeking TEXT,
    consent_marketing BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address TEXT
  )`);

  // ── Founding partner assessment table ─────────────────────────────────────
  await db.execute(sql`CREATE TABLE IF NOT EXISTS event_16july_founding_assessments (
    id SERIAL PRIMARY KEY,
    partner_enquiry_id INTEGER REFERENCES event_16july_partner_enquiries(id) ON DELETE CASCADE,
    organisation TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    company_website TEXT,
    brand_vision TEXT,
    in_room_moment TEXT,
    framing_preferences TEXT,
    logo_url TEXT,
    brand_guidelines_url TEXT,
    additional_notes TEXT,
    status TEXT NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);

  // ── Corporate table nominations table ─────────────────────────────────────
  await db.execute(sql`CREATE TABLE IF NOT EXISTS event_16july_table_nominations (
    id SERIAL PRIMARY KEY,
    partner_enquiry_id INTEGER REFERENCES event_16july_partner_enquiries(id) ON DELETE CASCADE,
    organisation TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    nominee_1_name TEXT, nominee_1_role TEXT, nominee_1_reason TEXT,
    nominee_2_name TEXT, nominee_2_role TEXT, nominee_2_reason TEXT,
    nominee_3_name TEXT, nominee_3_role TEXT, nominee_3_reason TEXT,
    nominee_4_name TEXT, nominee_4_role TEXT, nominee_4_reason TEXT,
    nominee_5_name TEXT, nominee_5_role TEXT, nominee_5_reason TEXT,
    nominee_6_name TEXT, nominee_6_role TEXT, nominee_6_reason TEXT,
    nominee_7_name TEXT, nominee_7_role TEXT, nominee_7_reason TEXT,
    nominee_8_name TEXT, nominee_8_role TEXT, nominee_8_reason TEXT,
    dietary_requirements TEXT,
    accessibility_needs TEXT,
    status TEXT NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);

  // ── Join Community ────────────────────────────────────────────────────────
  app.post("/api/event-august/community", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      const { full_name, email, company, job_title, website, pain_points, biggest_challenge, what_seeking, consent_marketing } = req.body;

      if (!full_name?.trim() || !email?.trim() || !company?.trim() || !job_title?.trim()) {
        return res.status(400).json({ message: "Please fill in all required fields" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      await db.execute(sql`
        INSERT INTO event_16july_community
          (full_name, email, company, job_title, website, pain_points, biggest_challenge, what_seeking, consent_marketing, ip_address)
        VALUES
          (${full_name.trim()}, ${email.toLowerCase().trim()}, ${company.trim()}, ${job_title.trim()},
           ${website?.trim() || null}, ${pain_points || null}, ${biggest_challenge?.trim() || null},
           ${what_seeking?.trim() || null}, ${!!consent_marketing}, ${ip})
      `);

      const painList = (pain_points || []).join(", ");
      const adminBody = `<div style="font-family:sans-serif;">
        <h3 style="color:#330311;">New Community Member — I Am Her Collective</h3>
        <p><strong>Name:</strong> ${full_name.trim()}</p>
        <p><strong>Email:</strong> ${email.toLowerCase().trim()}</p>
        <p><strong>Company:</strong> ${company.trim()}</p>
        <p><strong>Role:</strong> ${job_title.trim()}</p>
        <p><strong>Website:</strong> ${website?.trim() || "N/A"}</p>
        <p><strong>Pain Points:</strong> ${painList || "None selected"}</p>
        <p><strong>Biggest Challenge:</strong> ${biggest_challenge?.trim() || "N/A"}</p>
        <p><strong>Seeking:</strong> ${what_seeking?.trim() || "N/A"}</p>
        <p style="color:#888;">IP: ${ip} · ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
      </div>`;
      sendEmail("info@eventperfekt.com", `Community Member — ${full_name.trim()} (${company.trim()})`, adminBody).catch(() => {});

      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Public interest count (for social ticker) ─────────────────────────────
  app.get("/api/event-august/interest-count", async (_req, res) => {
    try {
      const result = await db.execute(sql`SELECT COUNT(*) AS total FROM event_16july_interest`);
      const total = parseInt((result.rows[0] as any).total, 10) || 0;
      res.json({ total });
    } catch { res.json({ total: 0 }); }
  });

  // ── Register Interest ──────────────────────────────────────────────────────
  app.post("/api/event-august/interest", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) return res.status(429).json({ message: "Too many submissions. Please try again in a minute." });

      const {
        first_name, last_name, email, role, company, phone, linkedin, source, consent_marketing,
        work_email, job_title, website, attendance_reason, access_type, media_consent,
        utmSource, utmMedium, utmCampaign, utmContent,
        referral_source,
      } = req.body;
      const normalizedCompany = typeof company === "string" && company.trim() ? company.trim() : null;
      const normalizedLinkedin =
        typeof linkedin === "string" && linkedin.trim()
          ? linkedin.trim()
          : (typeof req.body?.social_handle === "string" && req.body.social_handle.trim() ? req.body.social_handle.trim() : null);
      const normalizedAttendanceReason =
        typeof attendance_reason === "string" && attendance_reason.trim()
          ? attendance_reason.trim()
          : (typeof req.body?.why_attend === "string" && req.body.why_attend.trim() ? req.body.why_attend.trim() : null);
      // NOTE: linkedin is intentionally NOT required — the /access form labels it "(optional)".
      // Requiring it here previously caused a silent 400 that blocked paying buyers before checkout.
      if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !role?.trim()) {
        return res.status(400).json({ message: "Please fill in all required fields" });
      }
      if (!consent_marketing) return res.status(400).json({ message: "Please tick the consent box to continue" });

      // Layer 1 — format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email address" });

      // Layer 2 — disposable domain
      if (isDisposableEmail(email)) return res.status(400).json({ message: "Please use a real email address — your formal invitation will be sent here." });

      // Layer 3 — generate confirmation token
      const token = randomUUID();

      await db.execute(sql`
        INSERT INTO event_16july_interest
          (first_name, last_name, email, role, company, phone, linkedin, source, consent_marketing,
           ip_address, email_confirmed, confirmation_token,
           work_email, job_title, website, attendance_reason, access_type, media_consent,
           utm_source, utm_medium, utm_campaign, utm_content, referral_source)
        VALUES
          (${first_name.trim()}, ${last_name.trim()}, ${email.toLowerCase().trim()}, ${role.trim()},
           ${normalizedCompany}, ${phone?.trim() || null}, ${normalizedLinkedin}, ${source?.trim() || null},
           ${!!consent_marketing}, ${ip}, false, ${token},
           ${work_email?.trim() || null}, ${job_title?.trim() || null}, ${website?.trim() || null},
           ${normalizedAttendanceReason}, ${access_type?.trim() || null}, ${!!media_consent},
           ${utmSource || null}, ${utmMedium || null}, ${utmCampaign || null}, ${utmContent || null}, ${referral_source || null})
      `);

      const baseUrl = (process.env.APP_BASE_URL?.trim().replace(/\/$/, "")) || "https://eventperfekt.net";
      const confirmUrl = `${baseUrl}/iamher/confirm?token=${token}`;

      sendEmail(email.toLowerCase().trim(), "Your seat request — An Evening for Her · 30 October 2026", `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0408;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0408;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#1A0A0E;border:1px solid rgba(201,169,97,0.18);" cellpadding="0" cellspacing="0">

      <!-- Header / Crest -->
      <tr><td style="background:#330311;padding:40px 32px;text-align:center;border-bottom:1px solid rgba(201,169,97,0.2);">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(201,169,97,0.1);border:1px solid rgba(201,169,97,0.5);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <span style="color:#C9A961;font-size:22px;font-weight:bold;letter-spacing:0.05em;font-family:Georgia,serif;">EP</span>
        </div>
        <p style="margin:0 0 4px;color:#C9A961;font-size:9px;letter-spacing:0.4em;text-transform:uppercase;font-family:Arial,sans-serif;">CURATED BY EVENT PERFEKT</p>
        <h1 style="margin:10px 0 0;color:#F4ECD8;font-size:22px;font-weight:400;letter-spacing:-0.01em;font-family:Georgia,serif;font-style:italic;">An Evening for Her</h1>
      </td></tr>

      <!-- Gold rule -->
      <tr><td style="height:1px;background:linear-gradient(to right,transparent,#C9A961,transparent);"></td></tr>

      <!-- Body -->
      <tr><td style="padding:44px 40px 36px;">
        <p style="margin:0 0 8px;color:#C9A961;font-size:9px;letter-spacing:0.36em;text-transform:uppercase;font-family:Arial,sans-serif;">Dear ${first_name.trim()},</p>
        <h2 style="margin:0 0 24px;color:#F4ECD8;font-size:26px;font-weight:400;font-style:italic;line-height:1.3;">
          Thank you for requesting your seat.
        </h2>
        <p style="margin:0 0 20px;color:rgba(244,236,216,0.65);font-size:15px;line-height:1.8;font-family:Arial,sans-serif;font-weight:300;">
          We have received your registration for <strong style="color:#F4ECD8;font-weight:400;">Friday 30 October 2026</strong>, Milton Keynes — curated by Event Perfekt.
        </p>
        <p style="margin:0 0 36px;color:rgba(244,236,216,0.65);font-size:15px;line-height:1.8;font-family:Arial,sans-serif;font-weight:300;">
          Please confirm your email address by clicking the button below. Once confirmed, your application enters our review process and your formal acceptance details will follow.
        </p>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 36px;">
          <a href="${confirmUrl}" style="background:#C9A961;color:#1A0A0E;text-decoration:none;padding:16px 40px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;display:inline-block;">
            CONFIRM MY SEAT
          </a>
        </td></tr></table>

        <!-- Divider -->
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="height:1px;background:rgba(201,169,97,0.15);"></td>
        </tr></table>

        <!-- Event details strip -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
          <tr>
            <td style="text-align:center;padding:0 12px;">
              <p style="margin:0 0 4px;color:#C9A961;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;font-family:Arial,sans-serif;">Date</p>
              <p style="margin:0;color:#F4ECD8;font-size:13px;font-family:Arial,sans-serif;">Friday 30 Oct 2026</p>
            </td>
            <td style="width:1px;background:rgba(201,169,97,0.2);"></td>
            <td style="text-align:center;padding:0 12px;">
              <p style="margin:0 0 4px;color:#C9A961;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;font-family:Arial,sans-serif;">Location</p>
              <p style="margin:0;color:#F4ECD8;font-size:13px;font-family:Arial,sans-serif;">Milton Keynes, UK</p>
            </td>
            <td style="width:1px;background:rgba(201,169,97,0.2);"></td>
            <td style="text-align:center;padding:0 12px;">
              <p style="margin:0 0 4px;color:#C9A961;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;font-family:Arial,sans-serif;">Access</p>
              <p style="margin:0;color:#F4ECD8;font-size:13px;font-family:Arial,sans-serif;">By invitation only</p>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="height:1px;background:rgba(201,169,97,0.15);"></td>
        </tr></table>

        <!-- Fallback link -->
        <p style="margin:28px 0 0;color:rgba(244,236,216,0.3);font-size:11px;line-height:1.7;font-family:Arial,sans-serif;">
          If the button doesn't work, copy this link into your browser:<br/>
          <a href="${confirmUrl}" style="color:rgba(201,169,97,0.7);word-break:break-all;">${confirmUrl}</a>
        </p>
        <p style="margin:16px 0 0;color:rgba(244,236,216,0.25);font-size:11px;font-family:Arial,sans-serif;">
          If you didn't submit this request, you can safely ignore this email.
        </p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#330311;padding:24px 32px;text-align:center;border-top:1px solid rgba(201,169,97,0.15);">
        <p style="margin:0 0 4px;color:rgba(255,255,255,0.55);font-size:11px;font-family:Arial,sans-serif;font-style:italic;">…making yours perfekt</p>
        <p style="margin:0;color:rgba(255,255,255,0.3);font-size:10px;font-family:Arial,sans-serif;letter-spacing:0.06em;">
          Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG ·
          <a href="mailto:info@eventperfekt.com" style="color:rgba(201,169,97,0.6);text-decoration:none;">info@eventperfekt.com</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>
      `).catch(() => {});

      // Notify the team of every new application
      const adminBody = `<div style="font-family:sans-serif;"><h3>New Apply / Interest — An Evening for Her (30 Oct 2026)</h3>
        <p><strong>Name:</strong> ${first_name} ${last_name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Role:</strong> ${role}</p>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>LinkedIn:</strong> ${linkedin}</p>
        <p><strong>Source:</strong> ${source}</p>
        <p style="color:#888;">IP: ${ip} · Awaiting email confirmation.</p>
      </div>`;
      sendEmail("info@eventperfekt.com", `Apply — ${first_name} ${last_name} (${company})`, adminBody).catch(() => {});

      // Mirror into the new event_applications review pipeline (Part C)
      mirrorInterestToApplications({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.toLowerCase().trim(),
        role: role.trim(),
        company: company?.trim(),
        phone: phone?.trim(),
        linkedin: linkedin?.trim(),
        source: source?.trim() || "iamher-interest-form",
        consent_marketing: !!consent_marketing,
        ip_address: ip,
      }).catch(() => {});

      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Confirm email token ────────────────────────────────────────────────────
  app.get("/api/event-august/confirm", async (req: any, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") return res.status(400).json({ success: false, message: "Invalid confirmation link." });

      const result = await db.execute(sql`
        SELECT id, email, first_name, last_name, email_confirmed, whatsapp_group_sent FROM event_16july_interest WHERE confirmation_token = ${token} LIMIT 1
      `);

      if (!result.rows.length) return res.status(404).json({ success: false, message: "This confirmation link is invalid or has already been used." });

      const row = result.rows[0] as any;
      if (row.email_confirmed) return res.json({ success: true, alreadyConfirmed: true });

      await db.execute(sql`
        UPDATE event_16july_interest SET email_confirmed = true WHERE confirmation_token = ${token}
      `);

      // Send welcome email with WhatsApp link (only once)
      if (!row.whatsapp_group_sent) {
        const fullName = `${row.first_name || "Guest"} ${row.last_name || ""}`.trim();
        const email = row.email;
        const WHATSAPP_GROUP_LINK = process.env.IAMHER_WHATSAPP_GROUP_LINK || "";
        if (WHATSAPP_GROUP_LINK && email) {
          sendEmail(email, "Welcome to the room — Your private WhatsApp group", `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0408;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0408;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#1A0A0E;border:1px solid rgba(201,169,97,0.18);" cellpadding="0" cellspacing="0">
      <tr><td style="background:#330311;padding:40px 32px;text-align:center;border-bottom:1px solid rgba(201,169,97,0.2);">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(201,169,97,0.1);border:1px solid rgba(201,169,97,0.5);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <span style="color:#C9A961;font-size:22px;font-weight:bold;letter-spacing:0.05em;font-family:Georgia,serif;">EP</span>
        </div>
        <p style="margin:0 0 4px;color:#C9A961;font-size:9px;letter-spacing:0.4em;text-transform:uppercase;font-family:Arial,sans-serif;">CURATED BY EVENT PERFEKT</p>
        <h1 style="margin:10px 0 0;color:#F4ECD8;font-size:22px;font-weight:400;letter-spacing:-0.01em;font-family:Georgia,serif;font-style:italic;">The Woman Who Leads the Room</h1>
      </td></tr>
      <tr><td style="height:1px;background:linear-gradient(to right,transparent,#C9A961,transparent);"></td></tr>
      <tr><td style="padding:44px 40px 36px;">
        <p style="margin:0 0 8px;color:#C9A961;font-size:9px;letter-spacing:0.36em;text-transform:uppercase;font-family:Arial,sans-serif;">Dear ${fullName},</p>
        <h2 style="margin:0 0 24px;color:#F4ECD8;font-size:26px;font-weight:400;font-style:italic;line-height:1.3;">
          Your seat is confirmed.
        </h2>
        <p style="margin:0 0 20px;color:rgba(244,236,216,0.65);font-size:15px;line-height:1.8;font-family:Arial,sans-serif;font-weight:300;">
          Welcome to the private guest circle for <strong style="color:#F4ECD8;font-weight:400;">Friday 30 October 2026</strong>.
        </p>
        <p style="margin:0 0 36px;color:rgba(244,236,216,0.65);font-size:15px;line-height:1.8;font-family:Arial,sans-serif;font-weight:300;">
          This is where you will meet the other women in the room before the evening begins. Introductions, venue updates, and everything in between.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 36px;">
          <a href="${WHATSAPP_GROUP_LINK}" style="background:#25D366;color:#fff;text-decoration:none;padding:16px 40px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;display:inline-block;">
            JOIN THE PRIVATE WHATSAPP GROUP
          </a>
        </td></tr></table>

        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="height:1px;background:rgba(201,169,97,0.15);"></td>
        </tr></table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
          <tr>
            <td style="text-align:center;padding:0 12px;">
              <p style="margin:0 0 4px;color:#C9A961;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;font-family:Arial,sans-serif;">Date</p>
              <p style="margin:0;color:#F4ECD8;font-size:13px;font-family:Arial,sans-serif;">Friday 30 Oct 2026</p>
            </td>
            <td style="width:1px;background:rgba(201,169,97,0.2);"></td>
            <td style="text-align:center;padding:0 12px;">
              <p style="margin:0 0 4px;color:#C9A961;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;font-family:Arial,sans-serif;">Location</p>
              <p style="margin:0;color:#F4ECD8;font-size:13px;font-family:Arial,sans-serif;">Milton Keynes, UK</p>
            </td>
            <td style="width:1px;background:rgba(201,169,97,0.2);"></td>
            <td style="text-align:center;padding:0 12px;">
              <p style="margin:0 0 4px;color:#C9A961;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;font-family:Arial,sans-serif;">Access</p>
              <p style="margin:0;color:#F4ECD8;font-size:13px;font-family:Arial,sans-serif;">By invitation only</p>
            </td>
          </tr>
        </table>

        <p style="margin:28px 0 0;color:rgba(244,236,216,0.3);font-size:11px;line-height:1.7;font-family:Arial,sans-serif;">
          If the button doesn't work, copy this link into your browser:<br/>
          <a href="${WHATSAPP_GROUP_LINK}" style="color:rgba(201,169,97,0.7);word-break:break-all;">${WHATSAPP_GROUP_LINK}</a>
        </p>
        <p style="margin:16px 0 0;color:rgba(244,236,216,0.25);font-size:11px;font-family:Arial,sans-serif;">
          This link is private and intended for confirmed guests only.
        </p>
      </td></tr>
      <tr><td style="background:#330311;padding:24px 32px;text-align:center;border-top:1px solid rgba(201,169,97,0.15);">
        <p style="margin:0 0 4px;color:rgba(255,255,255,0.55);font-size:11px;font-family:Arial,sans-serif;font-style:italic;">…making yours perfekt</p>
        <p style="margin:0;color:rgba(255,255,255,0.3);font-size:10px;font-family:Arial,sans-serif;letter-spacing:0.06em;">
          Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG ·
          <a href="mailto:info@eventperfekt.com" style="color:rgba(201,169,97,0.6);text-decoration:none;">info@eventperfekt.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>
          `).catch(() => {});
          await db.execute(sql`UPDATE event_16july_interest SET whatsapp_group_sent = true WHERE id = ${row.id}`);
        }
      }

      return res.json({ success: true, alreadyConfirmed: false });
    } catch (err: any) { return res.status(500).json({ success: false, message: err.message }); }
  });

  // ── Founding Partner Assessment ─────────────────────────────────────────────
  app.post("/api/event-august/founding-assessment", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) return res.status(429).json({ message: "Too many submissions. Please try again in a minute." });

      const {
        organisation, contact_name, contact_email, contact_phone, company_website,
        brand_vision, in_room_moment, framing_preferences, logo_url, brand_guidelines_url,
        additional_notes,
      } = req.body;

      if (!organisation?.trim() || !contact_name?.trim() || !contact_email?.trim() || !brand_vision?.trim() || !in_room_moment?.trim()) {
        return res.status(400).json({ message: "Please fill in all required fields" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) return res.status(400).json({ message: "Please enter a valid email address" });

      await db.execute(sql`
        INSERT INTO event_16july_founding_assessments (
          organisation, contact_name, contact_email, contact_phone, company_website,
          brand_vision, in_room_moment, framing_preferences, logo_url, brand_guidelines_url,
          additional_notes, status
        ) VALUES (
          ${organisation.trim()}, ${contact_name.trim()}, ${contact_email.toLowerCase().trim()}, ${contact_phone?.trim() || null}, ${company_website?.trim() || null},
          ${brand_vision.trim()}, ${in_room_moment.trim()}, ${framing_preferences?.trim() || null}, ${logo_url?.trim() || null}, ${brand_guidelines_url?.trim() || null},
          ${additional_notes?.trim() || null}, 'submitted'
        )
      `);

      const firstName = contact_name.trim().split(" ")[0];
      sendEmail("adminuk@eventperfekt.com",
        `Founding Partnership Assessment — ${organisation}`,
        `<div style="font-family:sans-serif;"><h3>New Founding Partnership Assessment</h3>
        <p><strong>Organisation:</strong> ${organisation}</p>
        <p><strong>Contact:</strong> ${contact_name}</p>
        <p><strong>Email:</strong> ${contact_email}</p>
        <p><strong>Phone:</strong> ${contact_phone || "Not provided"}</p>
        <p><strong>Website:</strong> ${company_website || "Not provided"}</p>
        <p><strong>Brand Vision:</strong><br/>${brand_vision.replace(/\n/g, "<br/>")}</p>
        <p><strong>In-Room Moment:</strong><br/>${in_room_moment.replace(/\n/g, "<br/>")}</p>
        <p><strong>Framing Preferences:</strong><br/>${framing_preferences?.replace(/\n/g, "<br/>") || "Not provided"}</p>
        <p><strong>Logo URL:</strong> ${logo_url || "Not provided"}</p>
        <p><strong>Brand Guidelines:</strong> ${brand_guidelines_url || "Not provided"}</p>
        <p><strong>Additional Notes:</strong><br/>${additional_notes?.replace(/\n/g, "<br/>") || "Not provided"}</p>
        </div>`
      ).catch(() => {});

      sendEmail(contact_email.toLowerCase().trim(),
        "Thank you — your founding partnership assessment is under review",
        `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.75;">
          <p>Dear ${firstName},</p>
          <p>Thank you for submitting your founding partnership assessment for <strong>The Woman Who Leads the Room</strong> — Friday 30 October 2026, curated by Event Perfekt in Milton Keynes.</p>
          <p>We have received your brand vision and framing preferences. Our team will review your application and be in touch within 48 hours to discuss the partnership details, including your branded moment in the room and next steps.</p>
          <p>Warm regards,</p>
          <p><strong>Tolu Johnson</strong><br/>Director, Event Perfekt Group</p>
        </div>`
      ).catch(() => {});

      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Corporate Table Nominations ──────────────────────────────────────────────
  app.post("/api/event-august/table-nominations", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) return res.status(429).json({ message: "Too many submissions. Please try again in a minute." });

      const {
        organisation, contact_name, contact_email, contact_phone,
        nominees, dietary_requirements, accessibility_needs,
      } = req.body;

      if (!organisation?.trim() || !contact_name?.trim() || !contact_email?.trim()) {
        return res.status(400).json({ message: "Please fill in all required contact fields" });
      }
      if (!Array.isArray(nominees) || nominees.length < 1) {
        return res.status(400).json({ message: "Please nominate at least one woman for the table" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) return res.status(400).json({ message: "Please enter a valid email address" });

      const n = nominees;
      await db.execute(sql`
        INSERT INTO event_16july_table_nominations (
          organisation, contact_name, contact_email, contact_phone,
          nominee_1_name, nominee_1_role, nominee_1_reason,
          nominee_2_name, nominee_2_role, nominee_2_reason,
          nominee_3_name, nominee_3_role, nominee_3_reason,
          nominee_4_name, nominee_4_role, nominee_4_reason,
          nominee_5_name, nominee_5_role, nominee_5_reason,
          nominee_6_name, nominee_6_role, nominee_6_reason,
          nominee_7_name, nominee_7_role, nominee_7_reason,
          nominee_8_name, nominee_8_role, nominee_8_reason,
          dietary_requirements, accessibility_needs, status
        ) VALUES (
          ${organisation.trim()}, ${contact_name.trim()}, ${contact_email.toLowerCase().trim()}, ${contact_phone?.trim() || null},
          ${n[0]?.name || null}, ${n[0]?.role || null}, ${n[0]?.reason || null},
          ${n[1]?.name || null}, ${n[1]?.role || null}, ${n[1]?.reason || null},
          ${n[2]?.name || null}, ${n[2]?.role || null}, ${n[2]?.reason || null},
          ${n[3]?.name || null}, ${n[3]?.role || null}, ${n[3]?.reason || null},
          ${n[4]?.name || null}, ${n[4]?.role || null}, ${n[4]?.reason || null},
          ${n[5]?.name || null}, ${n[5]?.role || null}, ${n[5]?.reason || null},
          ${n[6]?.name || null}, ${n[6]?.role || null}, ${n[6]?.reason || null},
          ${n[7]?.name || null}, ${n[7]?.role || null}, ${n[7]?.reason || null},
          ${dietary_requirements?.trim() || null}, ${accessibility_needs?.trim() || null}, 'submitted'
        )
      `);

      const firstName = contact_name.trim().split(" ")[0];
      const nomineeList = nominees.map((nom: any, i: number) =>
        `<p><strong>Seat ${i+1}:</strong> ${nom.name || "Not named"} — ${nom.role || "Not provided"}<br/>Reason: ${nom.reason || "Not provided"}</p>`
      ).join("");

      sendEmail("adminuk@eventperfekt.com",
        `Corporate Table Nomination — ${organisation}`,
        `<div style="font-family:sans-serif;"><h3>New Corporate Table Nomination</h3>
        <p><strong>Organisation:</strong> ${organisation}</p>
        <p><strong>Contact:</strong> ${contact_name}</p>
        <p><strong>Email:</strong> ${contact_email}</p>
        <p><strong>Phone:</strong> ${contact_phone || "Not provided"}</p>
        <h4>Nominees:</h4>${nomineeList}
        <p><strong>Dietary:</strong> ${dietary_requirements || "Not provided"}</p>
        <p><strong>Accessibility:</strong> ${accessibility_needs || "Not provided"}</p>
        </div>`
      ).catch(() => {});

      sendEmail(contact_email.toLowerCase().trim(),
        "Thank you — your table nomination is under review",
        `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.75;">
          <p>Dear ${firstName},</p>
          <p>Thank you for nominating the women who will represent <strong>${organisation}</strong> at our evening for the woman who leads the room — <strong>Friday 30 October 2026</strong>, curated by Event Perfekt in Milton Keynes.</p>
          <p>We have received all ${nominees.length} nomination(s). Our team will review the table within 48 hours and confirm your corporate table by email, including payment instructions for £2,880 (inc. VAT).</p>
          <p>Warm regards,</p>
          <p><strong>Tolu Johnson</strong><br/>Director, Event Perfekt Group</p>
        </div>`
      ).catch(() => {});

      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Partner Enquiry ────────────────────────────────────────────────────────
  app.post("/api/event-august/partner", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) return res.status(429).json({ message: "Too many submissions. Please try again in a minute." });

      const { name, organisation, role, email, phone, linkedin, message, consent_marketing } = req.body;
      if (!name?.trim() || !organisation?.trim() || !role?.trim() || !email?.trim() || !phone?.trim() || !linkedin?.trim() || !message?.trim()) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (!consent_marketing) return res.status(400).json({ message: "Please tick the consent box to continue" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email address" });
      if (isDisposableEmail(email)) return res.status(400).json({ message: "Please use a real email address — your formal invitation will be sent here." });

      await db.execute(sql`
        INSERT INTO event_16july_partner_enquiries (name, organisation, role, email, phone, linkedin, message, consent_marketing, ip_address)
        VALUES (${name.trim()}, ${organisation.trim()}, ${role.trim()}, ${email.toLowerCase().trim()},
                ${phone.trim()}, ${linkedin.trim()}, ${message.trim()}, ${!!consent_marketing}, ${ip})
      `);

      const firstName = name.trim().split(" ")[0];
      const notifyBody = `<div style="font-family:sans-serif;"><h3>New Partner Enquiry — An Evening for Her (30 Oct 2026)</h3><p><strong>Name:</strong> ${name}</p><p><strong>Organisation:</strong> ${organisation}</p><p><strong>Role:</strong> ${role}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>LinkedIn:</strong> ${linkedin}</p><p><strong>Message:</strong><br/>${message.replace(/\n/g, "<br/>")}</p></div>`;
      sendEmail("adminuk@eventperfekt.com", `Partner enquiry — ${organisation}`, notifyBody).catch(() => {});

      sendEmail(email.toLowerCase().trim(), "Thank you — your partner enquiry is received", `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.75;">
          <p>Dear ${firstName},</p>
          <p>Thank you for reaching out about partnering on our evening for the woman who leads the room — <strong>Friday 30 October 2026</strong>, curated by <strong>Event Perfekt</strong> in Milton Keynes.</p>
          <p>I'll personally be in touch within 48 hours to discuss further.</p>
          <p>Warm regards,</p>
          <p><strong>Tolu Johnson</strong><br/>Director, Event Perfekt Group</p>
        </div>
      `).catch(() => {});

      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Sponsor Enquiry ────────────────────────────────────────────────────────
  app.post("/api/event-august/sponsor", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) return res.status(429).json({ message: "Too many submissions. Please try again in a minute." });

      const { name, brand, role, email, phone, sponsorship_type, message, consent_marketing } = req.body;
      if (!name?.trim() || !brand?.trim() || !role?.trim() || !email?.trim() || !phone?.trim() || !sponsorship_type?.trim() || !message?.trim()) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (!consent_marketing) return res.status(400).json({ message: "Please tick the consent box to continue" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email address" });
      if (isDisposableEmail(email)) return res.status(400).json({ message: "Please use a real email address — your formal invitation will be sent here." });

      await db.execute(sql`
        INSERT INTO event_16july_sponsor_enquiries (name, brand, role, email, phone, sponsorship_type, message, consent_marketing, ip_address)
        VALUES (${name.trim()}, ${brand.trim()}, ${role.trim()}, ${email.toLowerCase().trim()},
                ${phone.trim()}, ${sponsorship_type}, ${message.trim()}, ${!!consent_marketing}, ${ip})
      `);

      const firstName = name.trim().split(" ")[0];
      const notifyBody = `<div style="font-family:sans-serif;"><h3>New Sponsor Enquiry — An Evening for Her (30 Oct 2026)</h3><p><strong>Name:</strong> ${name}</p><p><strong>Brand:</strong> ${brand}</p><p><strong>Role:</strong> ${role}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>Sponsorship type:</strong> ${sponsorship_type}</p><p><strong>Message:</strong><br/>${message.replace(/\n/g, "<br/>")}</p></div>`;
      sendEmail("adminuk@eventperfekt.com", `Sponsor enquiry — ${brand}`, notifyBody).catch(() => {});

      sendEmail(email.toLowerCase().trim(), "Thank you — your sponsor enquiry is received", `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.75;">
          <p>Dear ${firstName},</p>
          <p>Thank you for your interest in sponsoring our evening for the woman who leads the room — <strong>Friday 30 October 2026</strong>, curated by <strong>Event Perfekt</strong> in Milton Keynes.</p>
          <p>I'll personally be in touch within 48 hours with our partnership pack and to discuss further.</p>
          <p>Warm regards,</p>
          <p><strong>Tolu Johnson</strong><br/>Director, Event Perfekt Group</p>
        </div>
      `).catch(() => {});

      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Product brand partnership enquiry (/iamher/partnership/product-brands) ──
  // Frontend posts: { brandName, contactName, email, productType, opportunity, message, page }
  app.post("/api/iamher/partnership-enquiry", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) return res.status(429).json({ message: "Too many submissions. Please try again in a minute." });

      const { brandName, contactName, email, productType, opportunity, message, page } = req.body || {};
      // Lenient on purpose — only the essentials are required so genuine enquiries are never silently rejected.
      if (!brandName?.trim() || !contactName?.trim() || !email?.trim()) {
        return res.status(400).json({ message: "Brand name, your name, and email are required" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email address" });
      if (isDisposableEmail(email)) return res.status(400).json({ message: "Please use a real email address — we'll reply here." });

      await db.execute(sql`
        INSERT INTO event_16july_product_brand_enquiries (brand_name, contact_name, email, product_type, opportunity, message, page, ip_address)
        VALUES (${brandName.trim()}, ${contactName.trim()}, ${email.toLowerCase().trim()},
                ${productType?.trim() || null}, ${opportunity?.trim() || null}, ${message?.trim() || null},
                ${page?.trim() || "product-brands"}, ${ip})
      `);

      const firstName = contactName.trim().split(" ")[0];
      const notifyBody = `<div style="font-family:sans-serif;"><h3>New Product Brand Partnership Enquiry — The Woman Who Leads the Room (30 Oct 2026)</h3><p><strong>Brand:</strong> ${brandName}</p><p><strong>Contact:</strong> ${contactName}</p><p><strong>Email:</strong> ${email}</p><p><strong>Product type:</strong> ${productType || "—"}</p><p><strong>Opportunity:</strong> ${opportunity || "—"}</p><p><strong>Message:</strong><br/>${(message || "—").replace(/\n/g, "<br/>")}</p></div>`;
      sendEmail("adminuk@eventperfekt.com", `Product brand enquiry — ${brandName}`, notifyBody).catch((e) => console.error("[product-brand-enquiry] owner notify failed:", e?.message));

      sendEmail(email.toLowerCase().trim(), "Thank you — your brand partnership enquiry is received", `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.75;">
          <p>Dear ${firstName},</p>
          <p>Thank you for your interest in partnering your brand with <strong>The Woman Who Leads the Room</strong> — our curated evening for 100 women who lead, <strong>Friday 30 October 2026</strong> in Milton Keynes, curated by <strong>Event Perfekt</strong>.</p>
          <p>I'll personally be in touch within 48 hours with our product partnership pack and to discuss how your brand fits the room.</p>
          <p>Warm regards,</p>
          <p><strong>Tolu Johnson</strong><br/>Director, Event Perfekt Group</p>
        </div>
      `).catch((e) => console.error("[product-brand-enquiry] applicant ack failed:", e?.message));

      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── General contact / ask a question ──────────────────────────────────────
  app.post("/api/event-august/contact", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) return res.status(429).json({ message: "Too many submissions. Please try again in a minute." });

      const { name, email, message } = req.body;
      if (!name?.trim() || !email?.trim() || !message?.trim()) {
        return res.status(400).json({ message: "Please fill in all fields" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      // Honeypot check — bots fill this field, humans don't
      const honeypot = req.body.website || "";
      if (honeypot && honeypot.trim() !== "") {
        console.log(`[HONEYPOT] Bot blocked on /api/event-august/contact — name="${name}" email="${email}" honeypot="${honeypot}" ip=${ip}`);
        return res.status(400).json({ message: "Something went wrong. Please try again later." });
      }

      // Notify team
      await sendEmail("info@eventperfekt.com", `Question from ${name.trim()} — I Am Her page`, `
        <div style="font-family:sans-serif;max-width:560px;">
          <h3 style="color:#330311;">New Question — An Evening for Her (iamher page)</h3>
          <p><strong>Name:</strong> ${name.trim()}</p>
          <p><strong>Email:</strong> <a href="mailto:${email.trim()}">${email.trim()}</a></p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left:3px solid #C9A961;margin:0;padding:12px 16px;background:#faf8f6;color:#333;">
            ${message.trim().replace(/\n/g, "<br/>")}
          </blockquote>
          <p style="color:#888;font-size:12px;margin-top:16px;">IP: ${ip}</p>
        </div>
      `);

      // Auto-reply to sender
      sendEmail(email.trim(), "We received your question — Event Perfekt", `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.75;">
          <p>Dear ${name.trim()},</p>
          <p>Thank you for reaching out. We've received your message and will be in touch within 48 hours.</p>
          <p>In the meantime, you can follow us for updates on <em>An Evening for Her</em> — Friday 30 October 2026, Milton Keynes.</p>
          <p>Warm regards,</p>
          <p><strong>The Event Perfekt Team</strong><br/>
          <a href="mailto:info@eventperfekt.com" style="color:#330311;">info@eventperfekt.com</a></p>
        </div>
      `).catch(() => {});

      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Feature submission (I Am Her campaign) ─────────────────────────────────
  app.post("/api/event-august/feature", async (req: any, res) => {
    try {
      const { full_name, job_title, business, website, statement, short_bio, consent_featured, consent_photo_rights } = req.body;
      if (!full_name?.trim() || !statement?.trim() || !consent_featured || !consent_photo_rights) {
        return res.status(400).json({ message: "Please complete all required fields and consent checkboxes" });
      }

      // For now, store without photo URL (file upload can be added later)
      await db.execute(sql`
        INSERT INTO event_16july_features
          (interest_id, full_name, job_title, business, website, iamher_statement, short_bio, consent_featured, consent_photo_rights)
        VALUES
          (NULL, ${full_name.trim()}, ${job_title?.trim() || null}, ${business?.trim() || null}, ${website?.trim() || null},
           ${statement.trim()}, ${short_bio?.trim() || null}, true, true)
      `);

      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Email diagnostic (temp) ────────────────────────────────────────────────
  app.get("/api/event-august/email-test", async (_req, res) => {
    try {
      const { sendMail } = await import("./emailService");
      await sendMail("info@eventperfekt.com", "🧪 Email Test — Event Perfekt", `
        <div style="font-family:sans-serif;padding:24px;">
          <h2 style="color:#330311;">Email delivery confirmed ✅</h2>
          <p>This test was sent at ${new Date().toISOString()} from the Event Perfekt server.</p>
          <p>If you're reading this, SMTP is working correctly.</p>
        </div>
      `);
      res.json({ success: true, message: "Email sent — check info@eventperfekt.com" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message, stack: err.stack?.split("\n").slice(0, 5) });
    }
  });

  // ── Brochure request & auto-send ──────────────────────────────────────────────────
  app.post("/api/event-august/brochure", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      const { name, email, linkedin } = req.body;
      if (!name?.trim() || !email?.trim()) return res.status(400).json({ message: "Please fill in your name and email" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email address" });

      await db.execute(sql`
        INSERT INTO event_16july_brochure_requests (name, email, linkedin, ip_address)
        VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${linkedin?.trim() || null}, ${ip})
      `);

      const { sendMail } = await import("./emailService");
      const fs = await import("fs");
      const path = await import("path");
      const brochurePath = path.join(process.cwd(), "attached_assets", "THE-WOMAN-WHO-LEADS-THE-ROOM-CORPORATE-BROCHURE-27th-MAY-2026_1779916936538.pdf");

      let attachments: any[] = [];
      try {
        if (fs.existsSync(brochurePath)) {
          attachments = [{
            filename: "The Woman Who Leads the Room — Corporate Partnership Overview 2026.pdf",
            path: brochurePath,
          }];
        }
      } catch (_e) {}

      // Email to the requester with brochure attached
      await sendMail(
        email.toLowerCase().trim(),
        "The Woman Who Leads the Room — Corporate Partnership Overview 2026",
        `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0408;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0408;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#1A0A0E;border:1px solid rgba(201,169,97,0.18);" cellpadding="0" cellspacing="0">
      <tr><td style="background:#330311;padding:40px 32px;text-align:center;border-bottom:1px solid rgba(201,169,97,0.2);">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(201,169,97,0.1);border:1px solid rgba(201,169,97,0.5);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <span style="color:#C9A961;font-size:22px;font-weight:bold;letter-spacing:0.05em;font-family:Georgia,serif;">EP</span>
        </div>
        <p style="margin:0 0 4px;color:#C9A961;font-size:9px;letter-spacing:0.4em;text-transform:uppercase;font-family:Arial,sans-serif;">CURATED BY EVENT PERFEKT</p>
        <h1 style="margin:10px 0 0;color:#F4ECD8;font-size:22px;font-weight:400;letter-spacing:-0.01em;font-family:Georgia,serif;font-style:italic;">I Am Her Initiative</h1>
      </td></tr>
      <tr><td style="height:1px;background:linear-gradient(to right,transparent,#C9A961,transparent);"></td></tr>
      <tr><td style="padding:44px 40px 36px;">
        <p style="margin:0 0 8px;color:#C9A961;font-size:9px;letter-spacing:0.36em;text-transform:uppercase;font-family:Arial,sans-serif;">Dear ${name.trim()},</p>
        <h2 style="margin:0 0 24px;color:#F4ECD8;font-size:26px;font-weight:400;font-style:italic;line-height:1.3;">Thank you for your interest.</h2>
        <p style="margin:0 0 20px;color:rgba(244,236,216,0.65);font-size:15px;line-height:1.8;font-family:Arial,sans-serif;font-weight:300;">
          Please find attached the <strong style="color:#F4ECD8;font-weight:400;">Corporate Partnership Overview</strong> for <em>The Woman Who Leads the Room</em>. It contains everything your organisation needs to understand the evening, the partnership opportunities, the media coverage, and the women we bring together.
        </p>
        <p style="margin:0 0 36px;color:rgba(244,236,216,0.65);font-size:15px;line-height:1.8;font-family:Arial,sans-serif;font-weight:300;">
          If you would like to discuss partnership options, reply to this email or contact us at <a href="mailto:info@eventperfekt.com" style="color:#C9A961;text-decoration:none;">info@eventperfekt.com</a>.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="height:1px;background:rgba(201,169,97,0.15);"></td>
        </tr></table>
        <p style="margin:28px 0 0;color:rgba(244,236,216,0.3);font-size:11px;line-height:1.7;font-family:Arial,sans-serif;">
          If you didn't request this brochure, you can safely ignore this email.
        </p>
      </td></tr>
      <tr><td style="background:#330311;padding:24px 32px;text-align:center;border-top:1px solid rgba(201,169,97,0.15);">
        <p style="margin:0 0 4px;color:rgba(255,255,255,0.55);font-size:11px;font-family:Arial,sans-serif;font-style:italic;">...making yours perfekt</p>
        <p style="margin:0;color:rgba(255,255,255,0.3);font-size:10px;font-family:Arial,sans-serif;letter-spacing:0.06em;">
          Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG ·
          <a href="mailto:info@eventperfekt.com" style="color:rgba(201,169,97,0.6);text-decoration:none;">info@eventperfekt.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
        undefined,
        "GB",
        attachments
      );

      // Also notify the team
      sendEmail("info@eventperfekt.com",
        `Brochure request — ${name.trim()} (${email.toLowerCase().trim()})`,
        `<div style="font-family:sans-serif;"><h3>New Brochure Request — I Am Her Initiative</h3>
        <p><strong>Name:</strong> ${name.trim()}</p>
        <p><strong>Email:</strong> ${email.toLowerCase().trim()}</p>
        <p><strong>LinkedIn:</strong> ${linkedin?.trim() || "Not provided"}</p>
        <p><strong>Sent at:</strong> ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
        <p style="color:#888;">IP: ${ip}</p>
        </div>`
      ).catch(() => {});

      return res.json({ success: true, message: "Brochure sent to your email" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Admin endpoints ────────────────────────────────────────────────────────
  const IAMHER_ADMIN_SECRET = "ep-iamher-2026";
  function adminGuard(req: any, res: any, next: any) {
    if (req.headers["x-iamher-secret"] === IAMHER_ADMIN_SECRET) return next();
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (!["admin", "planner", "manager"].includes(req.user.role)) return res.status(403).json({ message: "Admin access required" });
    next();
  }

  app.get("/api/event-august/admin/interest", adminGuard, async (req: any, res) => {
    try {
      const { confirmed } = req.query;
      let rows;
      if (confirmed === "true") {
        rows = await db.execute(sql`SELECT * FROM event_16july_interest WHERE email_confirmed = true ORDER BY created_at DESC`);
      } else if (confirmed === "false") {
        rows = await db.execute(sql`SELECT * FROM event_16july_interest WHERE email_confirmed = false ORDER BY created_at DESC`);
      } else {
        rows = await db.execute(sql`SELECT * FROM event_16july_interest ORDER BY created_at DESC`);
      }
      res.json(rows.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/event-august/admin/interest/:id", adminGuard, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await db.execute(sql`DELETE FROM event_16july_interest WHERE id = ${id}`);
      return res.json({ success: true, message: `Entry ${id} deleted` });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  app.get("/api/event-august/admin/partner", adminGuard, async (_req, res) => {
    try {
      const rows = await db.execute(sql`SELECT * FROM event_16july_partner_enquiries ORDER BY created_at DESC`);
      res.json(rows.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/event-august/admin/product-brand-enquiries", adminGuard, async (_req, res) => {
    try {
      const rows = await db.execute(sql`SELECT * FROM event_16july_product_brand_enquiries ORDER BY created_at DESC`);
      res.json(rows.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/event-august/admin/sponsor", adminGuard, async (_req, res) => {
    try {
      const rows = await db.execute(sql`SELECT * FROM event_16july_sponsor_enquiries ORDER BY created_at DESC`);
      res.json(rows.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Payment attempt notification (public) ─────────────────────────────────────
  app.post("/api/event-august/payment-attempt", async (req: any, res) => {
    try {
      const { email } = req.body;
      if (!email?.trim()) return res.status(400).json({ message: "Email is required" });
      const cleanEmail = email.toLowerCase().trim();

      const rows = await db.execute(sql`SELECT * FROM event_16july_interest WHERE email = ${cleanEmail} LIMIT 1`);
      const guest = rows.rows?.[0];
      const guestName = guest?.first_name ? `${guest.first_name} ${guest.last_name || ""}`.trim() : cleanEmail;

      sendEmail("info@eventperfekt.com", `[I AM HER] Payment attempt — ${guestName}`, `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:480px;background:#fff;border:1px solid #e8e4de;border-radius:8px;" cellpadding="0" cellspacing="0">
      <tr><td style="background:#330311;padding:20px 24px;border-radius:8px 8px 0 0;">
        <p style="margin:0;color:#C9A961;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;">I AM HER</p>
      </td></tr>
      <tr><td style="padding:24px;">
        <p style="margin:0 0 12px;color:#1a1a1a;font-size:15px;"><strong>Payment Attempt</strong></p>
        <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.6;">
          A guest has clicked the Revolut payment link and is attempting to pay.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;border:1px solid #e8e4de;border-radius:4px;">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e8e4de;"><span style="color:#888;font-size:11px;">Name</span><br><span style="color:#1a1a1a;font-size:13px;font-weight:600;">${guestName}</span></td></tr>
          <tr><td style="padding:12px 16px;"><span style="color:#888;font-size:11px;">Email</span><br><span style="color:#1a1a1a;font-size:13px;">${cleanEmail}</span></td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`);

      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Payment reference submission (public) ─────────────────────────────────────
  app.post("/api/event-august/payment-reference", async (req: any, res) => {
    try {
      const { email, reference } = req.body;
      if (!email?.trim() || !reference?.trim()) {
        return res.status(400).json({ message: "Email and reference are required" });
      }
      const cleanEmail = email.toLowerCase().trim();
      const cleanRef = reference.trim();

      // Find the record
      const rows = await db.execute(sql`SELECT * FROM event_16july_interest WHERE email = ${cleanEmail} AND email_confirmed = true LIMIT 1`);
      if (!rows.rows || rows.rows.length === 0) {
        return res.status(404).json({ message: "No confirmed registration found for this email" });
      }

      await db.execute(sql`
        UPDATE event_16july_interest
        SET payment_reference = ${cleanRef}, payment_method = 'revolut', payment_status = 'submitted'
        WHERE email = ${cleanEmail}
      `);

      // Notify admin
      const guestName = rows.rows[0].first_name ? `${rows.rows[0].first_name} ${rows.rows[0].last_name || ""}`.trim() : cleanEmail;
      sendEmail("info@eventperfekt.com", `[I AM HER] Payment submitted — ${guestName}`, `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:480px;background:#fff;border:1px solid #e8e4de;border-radius:8px;" cellpadding="0" cellspacing="0">
      <tr><td style="background:#330311;padding:20px 24px;border-radius:8px 8px 0 0;">
        <p style="margin:0;color:#C9A961;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;">I AM HER</p>
      </td></tr>
      <tr><td style="padding:24px;">
        <p style="margin:0 0 12px;color:#1a1a1a;font-size:15px;"><strong>Payment Submitted</strong></p>
        <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.6;">
          A guest has submitted a Revolut payment reference for review.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;border:1px solid #e8e4de;border-radius:4px;">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e8e4de;"><span style="color:#888;font-size:11px;">Name</span><br><span style="color:#1a1a1a;font-size:13px;font-weight:600;">${guestName}</span></td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e8e4de;"><span style="color:#888;font-size:11px;">Email</span><br><span style="color:#1a1a1a;font-size:13px;">${cleanEmail}</span></td></tr>
          <tr><td style="padding:12px 16px;"><span style="color:#888;font-size:11px;">Revolut Reference</span><br><span style="color:#1a1a1a;font-size:13px;font-weight:600;">${cleanRef}</span></td></tr>
        </table>
        <p style="margin:16px 0 0;color:#888;font-size:12px;">
          <a href="https://eventperfekt.net/admin/iamher" style="color:#330311;font-weight:600;text-decoration:none;">Review in admin panel →</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`);

      // Confirm to guest their reference was received
      const guestFirst = (rows.rows[0].first_name as string) || "there";
      sendEmail(cleanEmail, `[I Am Her] Payment reference received — we're on it`, `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0D0408;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0408;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#1A0A0E;border:1px solid rgba(201,169,97,0.18);" cellpadding="0" cellspacing="0">
      <tr><td style="background:#330311;padding:32px;text-align:center;border-bottom:1px solid rgba(201,169,97,0.2);">
        <p style="margin:0 0 4px;color:#C9A961;font-size:9px;letter-spacing:0.4em;text-transform:uppercase;font-family:Arial,sans-serif;">CURATED BY EVENT PERFEKT</p>
        <h1 style="margin:8px 0 0;color:#F4ECD8;font-size:20px;font-weight:400;font-style:italic;font-family:Georgia,serif;">The Woman Who Leads the Room</h1>
      </td></tr>
      <tr><td style="height:1px;background:linear-gradient(to right,transparent,#C9A961,transparent);"></td></tr>
      <tr><td style="padding:40px;">
        <p style="margin:0 0 8px;color:#C9A961;font-size:9px;letter-spacing:0.36em;text-transform:uppercase;font-family:Arial,sans-serif;">Dear ${guestFirst},</p>
        <h2 style="margin:0 0 20px;color:#F4ECD8;font-size:22px;font-weight:400;font-style:italic;line-height:1.3;">Payment reference received.</h2>
        <p style="margin:0 0 16px;color:rgba(244,236,216,0.65);font-size:15px;line-height:1.8;font-family:Arial,sans-serif;font-weight:300;">
          Thank you — we have your Revolut reference (<strong style="color:#F4ECD8;">${cleanRef}</strong>) and will verify your payment within 1–2 business days.
        </p>
        <p style="margin:0 0 32px;color:rgba(244,236,216,0.65);font-size:15px;line-height:1.8;font-family:Arial,sans-serif;font-weight:300;">
          Once confirmed, your formal invitation and full event details will follow by email. If you have any questions in the meantime, reply to this email or contact <a href="mailto:info@eventperfekt.com" style="color:#C9A961;">info@eventperfekt.com</a>.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(201,169,97,0.15);margin-bottom:32px;">
          <tr><td style="padding:14px 20px;border-bottom:1px solid rgba(201,169,97,0.1);">
            <span style="color:rgba(244,236,216,0.4);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Date</span><br>
            <span style="color:#F4ECD8;font-size:13px;font-family:Arial,sans-serif;">Friday 30 October 2026</span>
          </td></tr>
          <tr><td style="padding:14px 20px;border-bottom:1px solid rgba(201,169,97,0.1);">
            <span style="color:rgba(244,236,216,0.4);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Location</span><br>
            <span style="color:#F4ECD8;font-size:13px;font-family:Arial,sans-serif;">Milton Keynes, UK</span>
          </td></tr>
          <tr><td style="padding:14px 20px;">
            <span style="color:rgba(244,236,216,0.4);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Your Reference</span><br>
            <span style="color:#C9A961;font-size:13px;font-family:Arial,sans-serif;font-weight:600;">${cleanRef}</span>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="background:#330311;padding:20px 32px;text-align:center;border-top:1px solid rgba(201,169,97,0.15);">
        <p style="margin:0 0 4px;color:rgba(255,255,255,0.55);font-size:11px;font-family:Arial,sans-serif;font-style:italic;">…making yours perfekt</p>
        <p style="margin:0;color:rgba(255,255,255,0.3);font-size:10px;font-family:Arial,sans-serif;">Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`).catch(() => {});

      return res.json({ success: true, message: "Payment reference recorded. Your payment will be verified shortly." });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Admin: Confirm payment and send confirmation email ───────────────────────
  app.post("/api/event-august/admin/confirm-payment", adminGuard, async (req: any, res) => {
    try {
      const { email } = req.body;
      if (!email?.trim()) return res.status(400).json({ message: "Email is required" });
      const cleanEmail = email.toLowerCase().trim();

      const rows = await db.execute(sql`SELECT * FROM event_16july_interest WHERE email = ${cleanEmail} LIMIT 1`);
      if (!rows.rows || rows.rows.length === 0) return res.status(404).json({ message: "Guest not found" });

      const guest = rows.rows[0];
      const firstName = guest.first_name || "Guest";

      await db.execute(sql`
        UPDATE event_16july_interest
        SET payment_status = 'confirmed'
        WHERE email = ${cleanEmail}
      `);

      // Send confirmation email
      const baseUrl = (process.env.APP_BASE_URL?.trim().replace(/\/$/, "")) || "https://eventperfekt.net";
      const icsUrl = `${baseUrl}/api/event-august/calendar-invite?token=${guest.confirmation_token || ""}`;
      const inviteUrl = `${baseUrl}/iamher/invite?token=${guest.confirmation_token || ""}`;

      await sendEmail(cleanEmail, "Your Invitation — The Woman Who Leads the Room · 30 October 2026", `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Invitation</title></head>
<body style="margin:0;padding:0;background:#f5efe8;font-family:'Cormorant Garamond',Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(160deg,#f5efe8 0%,#e8ddd4 60%,#d8cfc6 100%);padding:40px 16px;">
  <tr><td align="center">
    <!-- Invitation Card -->
    <table width="100%" style="max-width:500px;background:#fffaf5;border-radius:16px;overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,0.2),0 12px 30px rgba(0,0,0,0.12);" cellpadding="0" cellspacing="0">

      <!-- Top decorative bar -->
      <tr><td style="height:6px;background:linear-gradient(90deg,#5a0e24,#8B1538,#5a0e24);"></td></tr>

      <!-- Card body -->
      <tr><td style="padding:40px 44px 44px;text-align:center;">

        <!-- Host names -->
        <p style="margin:0 0 6px;color:#8B1538;font-size:11px;letter-spacing:0.38em;text-transform:uppercase;font-family:Arial,sans-serif;">EVENT PERFEKT</p>
        <p style="margin:0 0 24px;color:#8B153899;font-size:11px;letter-spacing:0.12em;font-family:Arial,sans-serif;font-style:italic;">cordially invite you to</p>

        <!-- Divider -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td align="center">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:60px;height:1px;background:linear-gradient(90deg,transparent,#8B153850);"></td>
            <td style="padding:0 10px;color:#8B153880;font-size:10px;">&#10022;</td>
            <td style="width:60px;height:1px;background:linear-gradient(90deg,#8B153850,transparent);"></td>
          </tr></table>
        </td></tr></table>

        <!-- Main title -->
        <h1 style="margin:0 0 20px;color:#8B1538;font-size:38px;font-weight:400;line-height:1.18;letter-spacing:-0.01em;font-family:'Cormorant Garamond',Georgia,serif;">The Woman Who Leads the Room</h1>

        <!-- Body text -->
        <p style="margin:0 0 26px;color:#330311cc;font-size:15px;line-height:1.7;font-style:italic;font-family:'Cormorant Garamond',Georgia,serif;">
          You are warmly invited to an exclusive evening celebrating the women who lead, inspire, and transform. A curated gathering of extraordinary women in leadership.
        </p>

        <!-- Personal greeting -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr><td style="background:#faf8f5;border:1px solid #e8e4de;border-radius:8px;padding:16px 20px;text-align:center;">
          <p style="margin:0 0 4px;color:#888;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;font-family:Arial,sans-serif;">Dear ${firstName},</p>
          <p style="margin:0;color:#330311;font-size:14px;font-style:italic;font-family:'Cormorant Garamond',Georgia,serif;">Your place is confirmed. We look forward to welcoming you.</p>
        </td></tr></table>

        <!-- Divider -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td align="center">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:80px;height:1px;background:linear-gradient(90deg,transparent,#8B153830);"></td>
            <td style="padding:0 10px;color:#8B153860;font-size:8px;">&#9670; &#9671; &#9670;</td>
            <td style="width:80px;height:1px;background:linear-gradient(90deg,#8B153830,transparent);"></td>
          </tr></table>
        </td></tr></table>

        <!-- Event details -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr><td style="padding:0 0 10px;border-bottom:1px solid #8B153815;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="color:#8B153880;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">When</td>
              <td style="color:#330311;font-size:14px;font-weight:500;text-align:right;font-family:Arial,sans-serif;">Friday, 30 October 2026</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #8B153815;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="color:#8B153880;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Time</td>
              <td style="color:#330311;font-size:14px;font-weight:500;text-align:right;font-family:Arial,sans-serif;">6:30pm — 10:00pm</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #8B153815;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="color:#8B153880;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Where</td>
              <td style="color:#330311;font-size:14px;font-weight:500;text-align:right;max-width:65%;font-family:Arial,sans-serif;">LaTour Hotel, Milton Keynes</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #8B153815;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="color:#8B153880;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Dress</td>
              <td style="color:#330311;font-size:14px;font-weight:500;text-align:right;font-family:Arial,sans-serif;">Elegant Evening</td>
            </tr></table>
          </td></tr>
        </table>

        <!-- RSVP deadline -->
        <p style="margin:0 0 24px;color:#8B153880;font-size:12px;font-style:italic;font-family:'Cormorant Garamond',Georgia,serif;">Kindly respond by 16 September 2026</p>

        <!-- Add to Calendar -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;"><tr><td align="center">
          <a href="${icsUrl}" style="background:#8B1538;color:#fff;text-decoration:none;padding:14px 32px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;border-radius:50px;display:inline-block;">
            Add to Calendar
          </a>
        </td></tr></table>

        <!-- Stay & Explore nudge -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="background:#faf4ee;border:1px solid #e8ddd4;border-radius:8px;padding:18px 22px;text-align:left;">
          <p style="margin:0 0 4px;color:#8B1538;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Making a weekend of it?</p>
          <p style="margin:0 0 12px;color:#330311cc;font-size:13px;line-height:1.65;font-family:Arial,sans-serif;">Milton Keynes has more to offer than people expect. Bletchley Park, Woburn Safari, Willen Lake, great food — let the EP Concierge plan your stay.</p>
          <a href="${baseUrl}/iamher/stay" style="color:#8B1538;font-size:12px;font-weight:600;font-family:Arial,sans-serif;text-decoration:none;letter-spacing:0.06em;">Stay &amp; Explore Milton Keynes →</a>
        </td></tr></table>

        <!-- Footer note -->
        <p style="margin:12px 0 8px;color:#888;font-size:12px;font-style:italic;font-family:'Cormorant Garamond',Georgia,serif;">
          The exact venue address will be shared with confirmed guests in the week before the event.
        </p>
        <p style="margin:0;color:#aaa;font-size:11px;font-family:Arial,sans-serif;">
          Questions? <a href="mailto:info@eventperfekt.com" style="color:#8B1538;text-decoration:none;">info@eventperfekt.com</a>
        </p>

      </td></tr>

      <!-- Bottom bar -->
      <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#8B153840,transparent);"></td></tr>

      <!-- Footer -->
      <tr><td style="background:#faf8f5;padding:20px 32px;text-align:center;border-top:1px solid #e8e4de;">
        <p style="margin:0;color:#c0b8b0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Powered by Event Perfekt</p>
        <p style="margin:8px 0 0;color:#bbb;font-size:10px;font-family:Arial,sans-serif;">
          Event Perfekt Global Ltd · 20 Wenlock Road, London, N1 7PG
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`);

      return res.json({ success: true, message: "Payment confirmed and guest notified" });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Calendar invite endpoint ──────────────────────────────────────────────
  app.get("/api/event-august/calendar-invite", async (req: any, res) => {
    try {
      const { token } = req.query;
      if (!token) return res.status(400).json({ message: "Token required" });
      const rows = await db.execute(sql`SELECT * FROM event_16july_interest WHERE confirmation_token = ${token} AND payment_status = 'confirmed' LIMIT 1`);
      if (!rows.rows || rows.rows.length === 0) return res.status(404).json({ message: "Not found" });
      const guest = rows.rows[0];
      const firstName = guest.first_name || "Guest";
      const lastName = guest.last_name || "";
      const email = guest.email || "";

      const startDate = new Date("2026-10-30T18:30:00Z");
      const endDate = new Date("2026-10-30T22:00:00Z");
      const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const uid = `${token}@eventperfekt.net`;

      const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Event Perfekt//The Woman Who Leads the Room//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:The Woman Who Leads the Room
DESCRIPTION:An invitation-only evening for women who lead. Curated by Event Perfekt.\n\nDress code: Elegant evening attire.\n\nThe exact venue address will be shared in the week before the event.
LOCATION:LaTour Hotel, Milton Keynes, UK
ORGANIZER;CN=Event Perfekt:mailto:info@eventperfekt.com
ATTENDEE;CN=${firstName} ${lastName}:mailto:${email}
END:VEVENT
END:VCALENDAR`;

      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="the-woman-who-leads-the-room.ics"`);
      return res.send(ics);
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // ── Invite endpoint (token lookup) ──────────────────────────────────────────────
  app.get("/api/event-august/invite", async (req: any, res) => {
    try {
      const { token } = req.query;
      if (!token) return res.status(400).json({ success: false, message: "Token required" });
      const rows = await db.execute(sql`SELECT * FROM event_16july_interest WHERE confirmation_token = ${token} AND payment_status = 'confirmed' LIMIT 1`);
      if (!rows.rows || rows.rows.length === 0) return res.status(404).json({ success: false, message: "Invitation not found" });
      const guest = rows.rows[0];
      return res.json({ success: true, guest });
    } catch (err: any) { return res.status(500).json({ success: false, message: err.message }); }
  });

  // ── Invite viewed ping ─────────────────────────────────────────────────────────────
  app.post("/api/event-august/invite-viewed", async (req: any, res) => {
    try {
      const { token } = req.query;
      if (!token) return res.status(400).json({ success: false, message: "Token required" });
      await db.execute(sql`UPDATE event_16july_interest SET email_confirmed = true, updated_at = NOW() WHERE confirmation_token = ${token}`);
      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ success: false, message: err.message }); }
  });

  // ── RSVP endpoint ─────────────────────────────────────────────────────────────────
  app.post("/api/event-august/rsvp", async (req: any, res) => {
    try {
      const { token, status } = req.body;
      if (!token || !status) return res.status(400).json({ success: false, message: "Token and status required" });
      const rows = await db.execute(sql`SELECT * FROM event_16july_interest WHERE confirmation_token = ${token} AND payment_status = 'confirmed' LIMIT 1`);
      if (!rows.rows || rows.rows.length === 0) return res.status(404).json({ success: false, message: "Guest not found" });
      await db.execute(sql`UPDATE event_16july_interest SET rsvp_status = ${status}, updated_at = NOW() WHERE confirmation_token = ${token}`);
      const guest = rows.rows[0];
      try {
        const { sendEmail } = (await import("./emailService")) as any;
        await sendEmail({
          to: "info@eventperfekt.com",
          subject: `[I Am Her] RSVP Update — ${guest.first_name} ${guest.last_name}`,
          text: `RSVP Update\n\nGuest: ${guest.first_name} ${guest.last_name}\nEmail: ${guest.email}\nStatus: ${status.toUpperCase()}\n\nEvent: The Woman Who Leads the Room\nDate: Friday 30 October 2026`,
        });
      } catch (e) {}
      return res.json({ success: true, message: "RSVP recorded" });
    } catch (err: any) { return res.status(500).json({ success: false, message: err.message }); }
  });

  // ── Elizabeth AI Chat ──────────────────────────────────────────────────────────────
  app.post("/api/event-august/elizabeth", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) return res.status(429).json({ message: "Too many messages. Please try again in a minute." });

      const { messages, page } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "No messages provided" });
      }

      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) return res.status(500).json({ message: "AI service not available" });

      const pageContext = page ? `The user is currently viewing the ${page} page.` : "";

      const systemPrompt = `You are Elizabeth — the knowledgeable, warm, and elegant host of "The Woman Who Leads the Room," an invitation-only evening curated by Event Perfekt on Friday 30 October 2026 in Milton Keynes.

You know everything about this event and can answer any question with confidence and warmth. Here is everything you know:

**THE EVENT**
- Name: The Woman Who Leads the Room
- Date: Friday 30 October 2026
- Venue: Milton Keynes (private address shared with confirmed guests)
- Curator: Event Perfekt Global Ltd
- Tagline: "An invitation-only evening for women who lead in business, in life, and in the rooms they walk into."
- Dress code: Elegant evening attire
- Time: 6:30pm – 10:30pm
- Format: Intimate dinner, curated conversation, recognition moment
- Hostess: Tolu Johnson, Director of Event Perfekt Group

**ACCESS OPTIONS**
- Option A: Paid £300 + VAT (£360 total) — immediate payment via Revolut or bank transfer
- Option B: Complimentary — apply via the "I Am Her" form. Reviewed by the Event Perfekt team. Must attend a quick virtual meet-and-greet.
- All guests receive a digital invitation after confirmation

**MEET THE ROOM**
- A curated gallery of featured women at the event
- Each woman has a portrait, statement, and business name
- Featured guests are selected by the Event Perfekt team
- Guests can apply to be featured via /iamher/feature (only for confirmed guests)

**PARTNERSHIP TIERS**
1. Individual Sponsored Seat — £360 inc VAT. Sponsored by a company for a woman who leads.
2. Corporate Table (8 seats) — £2,880 inc VAT. A full table for 8 nominated women. Requires nomination form before payment.
3. Founding Partnership — £30,000 inc VAT. Premium brand presence, welcome speech, branded gift, photo moment, priority seating. Requires assessment form before payment.
4. Co-branding / Custom Collaboration — Email info@eventperfekt.com. Tailored packages.

Bank details for UK transfers: Event Perfekt Global Ltd, Account 78253411, Sort Code 04-29-09, Currency GBP.

**THE "I AM HER" CAMPAIGN**
- A recognition campaign celebrating women who lead
- Guests can submit their story: name, job title, business, website, "I Am Her" statement, short bio, photo
- Submissions are curated and shared on Event Perfekt channels
- Only confirmed guests can submit

**FAQs YOU CAN ANSWER**
- How do I get a ticket? Request access at /access
- Can I bring a guest? No — each woman must request her own access
- Is there a dress code? Elegant evening attire
- Will there be photography? Yes, professional photography. Guests consent to being photographed
- Dietary requirements? Collected at confirmation
- Parking? Details shared with confirmed guests
- Refunds? Partnership payments are non-refundable; access fees may be transferred
- Can my company sponsor someone? Yes — Individual Sponsored Seat at £360
- What is a Founding Partnership? £30,000 premium partnership with full brand presence
- What is a Corporate Table? 8 seats for nominated women from one organisation at £2,880
- How do I nominate women for a table? Complete the nomination form after enquiry
- How do I apply for founding partnership? Complete the assessment form after enquiry
- Who is Event Perfekt? A UK-Nigeria event planning company. UK office: 20 Wenlock Road, London N1 7PG. Nigeria: 25 Kusenla Street, Lagos
- Contact: info@eventperfekt.com, WhatsApp via button on site (no visible number)

**THINGS TO ALWAYS MENTION WHEN RELEVANT**
- The venue address is private — shared only with confirmed guests after payment or approval
- Dietary requirements are collected at confirmation stage
- Photography is professional; guests consent on registration
- Each woman must request her own access — no plus-ones
- Parking details are shared with confirmed guests

**WHAT TO DO WHEN YOU DON'T KNOW**
If someone asks something you genuinely cannot answer (e.g. a very specific personal or logistical detail not covered above):
- Say: "That's a great question — let me make sure Tolu gets back to you personally on that."
- Then say: "Please drop a message to info@eventperfekt.com with your question and name, and you'll hear back directly."
- Do NOT guess or invent details. Warmly acknowledge and route them.

**TONE**
- Warm, elegant, knowledgeable — like a well-bred hostess who knows every detail
- Use British English
- Be encouraging but not pushy
- Never make up information — if unsure, route to info@eventperfekt.com
- Always sign off with a touch of warmth
${pageContext ? `\nCURRENT PAGE: ${pageContext}` : ""}`;

      const chatMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: chatMessages,
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });

      const data: any = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "AI service error");

      const reply = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that. Please try again or email info@eventperfekt.com.";
      return res.json({ reply });
    } catch (err: any) {
      console.error("[Elizabeth] Error:", err.message);
      return res.status(500).json({ message: err.message || "Something went wrong" });
    }
  });

  // ── I Am Her Source Analytics ─────────────────────────────────────────────
  app.get("/api/event-august/source-analytics", async (_req, res) => {
    try {
      const [visitors, registrations] = await Promise.all([
        db.execute(sql`
          SELECT
            COALESCE(utm_source, 'direct') AS source,
            COALESCE(utm_medium, '') AS medium,
            COALESCE(utm_content, '') AS content,
            COUNT(DISTINCT id) AS visits
          FROM visitor_sessions
          WHERE utm_source IS NOT NULL OR utm_source IS NULL
          GROUP BY utm_source, utm_medium, utm_content
          ORDER BY visits DESC
          LIMIT 30
        `),
        db.execute(sql`
          SELECT
            COALESCE(utm_source, 'direct') AS source,
            COALESCE(utm_medium, '') AS medium,
            COALESCE(utm_content, '') AS content,
            COUNT(*) AS registrations,
            COUNT(CASE WHEN access_type = 'paid' THEN 1 END) AS paid,
            COUNT(CASE WHEN access_type = 'complimentary' THEN 1 END) AS complimentary
          FROM event_16july_interest
          GROUP BY utm_source, utm_medium, utm_content
          ORDER BY registrations DESC
        `),
      ]);
      res.json({ visitors: visitors.rows, registrations: registrations.rows });
    } catch (err: any) {
      console.error("[SourceAnalytics] Error:", err.message);
      res.status(500).json({ visitors: [], registrations: [] });
    }
  });

  // ── I Am Her Room Profiles ────────────────────────────────────────────────

  // Save profile when attendee downloads their card
  app.post("/api/event-august/room-profile", async (req, res) => {
    try {
      const { name, title, company } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Name required" });

      // Upsert by name — avoid duplicates if they download multiple times
      await db.execute(sql`
        INSERT INTO iamher_profiles (name, title, company)
        VALUES (${name.trim()}, ${title?.trim() || null}, ${company?.trim() || null})
        ON CONFLICT DO NOTHING
      `);

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[RoomProfile] Error:", err.message);
      return res.status(500).json({ message: "Could not save profile" });
    }
  });

  // Nominate a woman
  app.post("/api/event-august/nominate", async (req, res) => {
    try {
      const { nominatorName, nominatorEmail, nomineeName, nomineeEmail, message } = req.body;
      if (!nominatorName?.trim() || !nominatorEmail?.trim() || !nomineeName?.trim() || !nomineeEmail?.trim()) {
        return res.status(400).json({ message: "Required fields missing" });
      }

      // Persist nomination
      await db.execute(sql`
        INSERT INTO iamher_nominations (nominator_name, nominator_email, nominee_name, nominee_email, message, created_at)
        VALUES (${nominatorName.trim()}, ${nominatorEmail.trim()}, ${nomineeName.trim()}, ${nomineeEmail.trim()}, ${message?.trim() || null}, NOW())
      `);

      // Send email to nominee
      try {
        const { sendEmail } = (await import("./emailService.js")) as any;
        const personalNote = message?.trim()
          ? `\n\n${nominatorName.split(" ")[0]} added a personal note:\n\n"${message.trim()}"\n`
          : "";
        await sendEmail({
          to: nomineeEmail.trim(),
          subject: `${nominatorName.split(" ")[0]} thinks you belong in the room`,
          html: `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#330311;color:#F4ECD8;padding:48px 40px;">
  <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#C9A961;margin:0 0 32px;">The Woman Who Leads the Room</p>
  <h1 style="font-size:28px;font-weight:400;font-style:italic;color:#F4ECD8;margin:0 0 24px;line-height:1.3;">${nominatorName.split(" ")[0]} thinks you belong in the room.</h1>
  <p style="font-size:14px;color:rgba(244,236,216,0.65);line-height:1.9;margin:0 0 20px;">${nominatorName} has nominated you for <strong style="color:#F4ECD8;">The Woman Who Leads the Room</strong> — an invitation-led gathering of founders, executives, entrepreneurs and professional women on <strong style="color:#F4ECD8;">30 October 2026 in Milton Keynes</strong>.</p>
  ${personalNote ? `<p style="font-size:14px;color:rgba(244,236,216,0.65);line-height:1.9;margin:0 0 20px;padding:16px 20px;border-left:2px solid #C9A961;">${message?.trim()}</p>` : ""}
  <p style="font-size:14px;color:rgba(244,236,216,0.65);line-height:1.9;margin:0 0 36px;">This event is invitation-led. If you'd like to request access, visit the link below.</p>
  <a href="https://eventperfekt.net/access" style="display:inline-block;padding:14px 32px;border:1px solid rgba(201,169,97,0.5);color:#C9A961;text-decoration:none;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;">Request Your Invitation</a>
  <p style="font-size:10px;color:rgba(244,236,216,0.2);margin:40px 0 0;line-height:1.8;">Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG<br>eventperfekt.net/iamher</p>
</div>`,
          entity: "GB",
        });

        // Notify internal team
        await sendEmail({
          to: "info@eventperfekt.com",
          subject: `New nomination: ${nominatorName} → ${nomineeName}`,
          html: `<p>${nominatorName} (${nominatorEmail}) nominated ${nomineeName} (${nomineeEmail}).</p>${message ? `<p>Message: "${message}"</p>` : ""}`,
          entity: "GB",
        });
      } catch (emailErr: any) {
        console.error("[Nominate] Email failed:", emailErr.message);
        // Don't fail the request — nomination is saved
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[Nominate] Error:", err.message);
      return res.status(500).json({ message: "Could not save nomination" });
    }
  });

  // Delete profile
  app.delete("/api/event-august/admin/profile/:id", adminGuard, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await db.execute(sql`DELETE FROM iamher_profiles WHERE id = ${id}`);
      return res.json({ success: true, message: `Profile ${id} deleted` });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });

  // Get all approved profiles for Meet the Room
  app.get("/api/event-august/room-profiles", async (_req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT id, name, title, company, photo_url, photo_position, created_at
        FROM iamher_profiles
        WHERE approved = true
        ORDER BY created_at DESC
      `);
      res.json({ profiles: rows.rows });
    } catch (err: any) {
      console.error("[RoomProfiles] Error:", err.message);
      res.status(500).json({ profiles: [] });
    }
  });

  // ── I AM HER: The Stories Behind the Room ─────────────────────────────────

  function slugifyStr(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  function generalizeJobTitle(title: string): string {
    const t = title.toLowerCase();
    if (t.includes("ceo") || t.includes("chief executive")) return "Chief Executive";
    if (t.includes("founder") || t.includes("co-founder")) return "Founder";
    if (t.includes("director")) return "Director";
    if (t.includes("cfo") || t.includes("chief financial")) return "Finance Leader";
    if (t.includes("coo") || t.includes("operations")) return "Operations Leader";
    if (t.includes("vp") || t.includes("vice president")) return "Senior Executive";
    if (t.includes("manager") || t.includes("head of")) return "Senior Manager";
    if (t.includes("consultant") || t.includes("advisor")) return "Consultant";
    if (t.includes("partner")) return "Partner";
    return "Senior Professional";
  }

  function buildStorySlug(category: string, title: string | null, name: string | null, isAnon: boolean): string {
    const catPart = slugifyStr(category).slice(0, 25);
    const descPart = title
      ? (isAnon ? slugifyStr(generalizeJobTitle(title)).slice(0, 20) : slugifyStr(title.split(" ").slice(0, 2).join(" ")).slice(0, 18))
      : "professional";
    const namePart = name ? slugifyStr(name.split(" ")[0]).slice(0, 12) : "anon";
    const uniquePart = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
    return `i-am-her-${catPart}-${descPart}-${namePart}-${uniquePart}`.slice(0, 110);
  }

  // POST /api/event-august/stories — submit a story (always lands as pending)
  app.post("/api/event-august/stories", storiesUpload.single("photo"), async (req: any, res) => {
    try {
      // Honeypot check — bots fill this field, humans don't
      if (req.body.hp_website && req.body.hp_website.trim() !== "") {
        return res.status(400).json({ message: "Something went wrong. Please try again later." });
      }
      const { name, anonymous, jobTitle, company, email, category, story, consent, photoConsent } = req.body;
      if (!name || !email || !category || !story || !consent) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const isAnon = anonymous === "true" || anonymous === true;
      const genTitle = (isAnon && jobTitle) ? generalizeJobTitle(jobTitle) : null;
      const slug = buildStorySlug(category, jobTitle || null, name, isAnon);
      const photoUrl = req.file ? `/uploads/stories/${req.file.filename}` : null;
      const hasPhotoConsent = photoUrl ? (photoConsent === "true" || photoConsent === true) : false;

      // Wellbeing & support fields (optional)
      const wellbeingIssues = req.body.wellbeingIssues ? (Array.isArray(req.body.wellbeingIssues) ? req.body.wellbeingIssues : [req.body.wellbeingIssues]) : null;
      const soughtSupport = req.body.soughtSupport || null;
      const supportProviders = req.body.supportProviders ? (Array.isArray(req.body.supportProviders) ? req.body.supportProviders : [req.body.supportProviders]) : null;
      const supportTestimonial = req.body.supportTestimonial || null;
      const mayContact = req.body.mayContact === "true" || req.body.mayContact === true;

      // Build proper array SQL for PostgreSQL text[] columns
      const wellbeingSql = wellbeingIssues && wellbeingIssues.length > 0
        ? sql.raw(`ARRAY[${wellbeingIssues.map((v: string) => `'${v.replace(/'/g, "''")}'`).join(",")}]::text[]`)
        : null;
      const supportProvidersSql = supportProviders && supportProviders.length > 0
        ? sql.raw(`ARRAY[${supportProviders.map((v: string) => `'${v.replace(/'/g, "''")}'`).join(",")}]::text[]`)
        : null;

      const title = req.body.title || null;
      const website = req.body.website || null;
      const linkedin = req.body.linkedin || null;
      const instagram = req.body.instagram || null;
      const whatYouDo = req.body.whatYouDo || null;
      const wishYouKnew = req.body.wishYouKnew || null;
      const country = req.body.country || null;
      const city = req.body.city || null;
      await db.execute(sql`
        INSERT INTO iamher_stories
          (name, anonymous, job_title, generalized_title, company, email, category, title, story, photo_url, photo_consent, consent, status, featured, slug,
           wellbeing_issues, sought_support, support_providers, support_testimonial, may_contact,
           website, linkedin, instagram, what_you_do, wish_you_knew, country, city)
        VALUES (
          ${name}, ${isAnon}, ${jobTitle || null}, ${genTitle},
          ${isAnon ? null : (company || null)}, ${email}, ${category}, ${title}, ${story},
          ${photoUrl}, ${hasPhotoConsent}, ${true}, 'pending', false, ${slug},
          ${wellbeingSql}, ${soughtSupport}, ${supportProvidersSql}, ${supportTestimonial}, ${mayContact},
          ${website || null}, ${linkedin || null}, ${instagram || null}, ${whatYouDo || null}, ${wishYouKnew || null},
          ${country || null}, ${city || null}
        )
      `);

      // Send confirmation email to submitter
      sendEmail(email.toLowerCase().trim(), "Thank you for sharing your story — I Am Her",
        `<div style="max-width: 520px; margin: 0 auto; font-family: 'Georgia', serif; color: #330311;">
          <div style="text-align: center; padding: 32px 0 24px; border-bottom: 1px solid #F4ECD8;">
            <p style="font-size: 22px; color: #C9A961; margin: 0; letter-spacing: 0.12em; text-transform: uppercase;">I Am Her</p>
            <p style="font-size: 11px; color: #330311; margin: 8px 0 0; letter-spacing: 0.08em; opacity: 0.6;">The Stories Behind the Room</p>
          </div>
          <div style="padding: 28px 24px;">
            <p style="font-size: 14px; color: #330311; line-height: 1.8; margin: 0 0 18px;">Dear ${name},</p>
            <p style="font-size: 14px; color: #330311; line-height: 1.8; margin: 0 0 18px;">
              Thank you for sharing your story with us. Your submission is now in review and you will hear from the team soon.
            </p>
            <p style="font-size: 14px; color: #330311; line-height: 1.8; margin: 0 0 18px;">
              Every story matters. By stepping forward, you are helping another woman feel less alone.
            </p>
            <p style="font-size: 14px; color: #330311; line-height: 1.8; margin: 0 0 18px;">
              <strong>I Am Her</strong><br/>
              30 October 2026
            </p>
            <p style="font-size: 12px; color: #330311; opacity: 0.5; line-height: 1.6; margin: 0; border-top: 1px solid #F4ECD8; padding-top: 18px;">
              This is an automated confirmation. If you need to update anything, reply to this email and we will update your submission.
            </p>
          </div>
        </div>`
      ).catch(() => {});

      return res.json({ success: true, message: "Story submitted for review" });
    } catch (err: any) {
      console.error("[Stories] Submit error:", err.message);
      return res.status(500).json({ message: "Could not save story" });
    }
  });

  // GET /api/event-august/stories — approved stories for public wall
  app.get("/api/event-august/stories", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const rows = await db.execute(sql`
        SELECT id, name, anonymous, job_title, generalized_title, company, category, title, story, photo_url, featured, slug, published_at
        FROM iamher_stories
        WHERE (status = 'approved' OR status IS NULL)
        ${category ? sql`AND category = ${category}` : sql``}
        ORDER BY featured DESC, published_at DESC
      `);
      const total = await db.execute(sql`SELECT COUNT(*) as count FROM iamher_stories WHERE status = 'approved' OR status IS NULL`);
      res.json({ stories: rows.rows, total: parseInt((total.rows[0] as any).count, 10) });
    } catch (err: any) {
      console.error("[Stories] List error:", err.message);
      res.status(500).json({ stories: [], total: 0 });
    }
  });

  // GET /api/event-august/stories/count — live count for homepage social proof
  app.get("/api/event-august/stories/count", async (_req, res) => {
    try {
      const rows = await db.execute(sql`SELECT COUNT(*) as count FROM iamher_stories WHERE status = 'approved' OR status IS NULL`);
      res.json({ count: parseInt((rows.rows[0] as any).count, 10) });
    } catch (err: any) {
      console.error("[Stories] Count error:", err.message);
      res.status(500).json({ count: 0 });
    }
  });

  // GET /api/event-august/stories/admin-queue — all stories for moderation
  app.get("/api/event-august/stories/admin-queue", async (_req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT id, name, anonymous, job_title, generalized_title, company, email, category, story,
               status, featured, slug, rejection_note, created_at,
               wellbeing_issues, sought_support, support_providers, support_testimonial, may_contact,
               website, linkedin, instagram, what_you_do, wish_you_knew, country, city
        FROM iamher_stories
        ORDER BY
          CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
          created_at DESC
      `);
      res.json({ stories: rows.rows });
    } catch (err: any) {
      console.error("[Stories] Admin queue error:", err.message);
      res.status(500).json({ stories: [] });
    }
  });

  // GET /api/event-august/stories/report — aggregated wellbeing & support reporting
  app.get("/api/event-august/stories/report", async (_req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT wellbeing_issues, sought_support, support_providers, support_testimonial, may_contact
        FROM iamher_stories
      `);
      const issueCounts: Record<string, number> = {};
      const providerCounts: Record<string, number> = {};
      const supportBreakdown = { yes: 0, no: 0, preferNot: 0, total: 0 };
      let testimonialCount = 0;
      let contactableCount = 0;
      rows.rows.forEach((s: any) => {
        s.wellbeing_issues?.forEach((i: string) => { issueCounts[i] = (issueCounts[i] || 0) + 1; });
        s.support_providers?.forEach((p: string) => { providerCounts[p] = (providerCounts[p] || 0) + 1; });
        if (s.sought_support) {
          supportBreakdown.total++;
          if (s.sought_support === "Yes") supportBreakdown.yes++;
          else if (s.sought_support === "No") supportBreakdown.no++;
          else if (s.sought_support === "Prefer not to say") supportBreakdown.preferNot++;
        }
        if (s.support_testimonial && s.support_testimonial.trim()) testimonialCount++;
        if (s.may_contact) contactableCount++;
      });
      res.json({
        issueCounts,
        providerCounts,
        supportBreakdown,
        testimonialCount,
        contactableCount,
        totalStories: rows.rows.length,
      });
    } catch (err: any) {
      console.error("[Stories] Report error:", err.message);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // GET /api/event-august/story/:slug — single story by slug (public)
  app.get("/api/event-august/story/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const rows = await db.execute(sql`
        SELECT id, name, anonymous, job_title, generalized_title, company, category, title, story, photo_url, featured, slug, published_at
        FROM iamher_stories
        WHERE slug = ${slug} AND (status = 'approved' OR status IS NULL)
        LIMIT 1
      `);
      if (!rows.rows.length) return res.status(404).json({ story: null });
      return res.json({ story: rows.rows[0] });
    } catch (err: any) {
      console.error("[Stories] Single story error:", err.message);
      return res.status(500).json({ story: null });
    }
  });

  // PATCH /api/event-august/stories/:id — moderate: status, featured, generalized_title, rejection_note
  app.patch("/api/event-august/stories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { status, featured, generalized_title, rejection_note } = req.body;

      if (status !== undefined) {
        const publishedAt = status === "approved" ? sql`NOW()` : sql`NULL`;
        await db.execute(sql`
          UPDATE iamher_stories
          SET status = ${status},
              published_at = ${publishedAt},
              rejection_note = ${rejection_note ?? null}
          WHERE id = ${id}
        `);
      }
      if (featured !== undefined) {
        await db.execute(sql`UPDATE iamher_stories SET featured = ${featured} WHERE id = ${id}`);
      }
      if (generalized_title !== undefined) {
        await db.execute(sql`UPDATE iamher_stories SET generalized_title = ${generalized_title} WHERE id = ${id}`);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Stories] Moderate error:", err.message);
      res.status(500).json({ message: "Could not update story" });
    }
  });

  // ── EP Concierge — Stay & Explore ─────────────────────────────────────────
  // Bootstrap table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ep_concierge_requests (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      staying_over TEXT,
      nights TEXT,
      who_coming TEXT,
      group_size INTEGER,
      children_ages TEXT,
      help_needed TEXT[],
      best_time_to_call TEXT,
      status TEXT DEFAULT 'new',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});

  app.post("/api/event-august/concierge-request", async (req: any, res) => {
    try {
      const {
        name, phone, email, staying_over, nights,
        who_coming, group_size, children_ages,
        help_needed, best_time_to_call,
      } = req.body;

      // Honeypot check — bots fill this field, humans don't
      if (req.body.website && req.body.website.trim() !== "") {
        return res.status(400).json({ message: "Something went wrong. Please try again later." });
      }

      if (!name?.trim() || !phone?.trim()) {
        return res.status(400).json({ message: "Name and phone number are required" });
      }

      await db.execute(sql`
        INSERT INTO ep_concierge_requests
          (name, phone, email, staying_over, nights, who_coming, group_size, children_ages, help_needed, best_time_to_call)
        VALUES
          (${name.trim()}, ${phone.trim()}, ${email?.trim() || null}, ${staying_over || null},
           ${nights || null}, ${who_coming || null}, ${group_size ? parseInt(group_size) : null},
           ${children_ages?.trim() || null}, ${help_needed?.length ? help_needed : null},
           ${best_time_to_call || null})
      `);

      // Notification to operations team — adminuk, BCC info
      const helpList = Array.isArray(help_needed) && help_needed.length
        ? help_needed.map((h: string) => `<li>${h}</li>`).join("")
        : "<li>Not specified</li>";

      const adminHtml = `<div style="font-family:sans-serif;max-width:580px;">
        <h2 style="color:#330311;">EP Concierge Request — I Am Her Weekend</h2>
        <p><strong>Name:</strong> ${name.trim()}</p>
        <p><strong>Phone / WhatsApp:</strong> ${phone.trim()}</p>
        <p><strong>Email:</strong> ${email?.trim() || "Not provided"}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
        <p><strong>Staying over?</strong> ${staying_over || "Not specified"}</p>
        ${staying_over === "yes" ? `<p><strong>Nights:</strong> ${nights || "Not specified"}</p>` : ""}
        <p><strong>Who's coming:</strong> ${who_coming || "Not specified"}</p>
        <p><strong>Group size:</strong> ${group_size || "Not specified"}</p>
        ${children_ages ? `<p><strong>Children &amp; ages:</strong> ${children_ages}</p>` : ""}
        <p><strong>Best time to call:</strong> ${best_time_to_call || "Any"}</p>
        <p><strong>Help needed:</strong></p><ul>${helpList}</ul>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
        <p style="color:#888;font-size:12px;">Received ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })} · I Am Her Concierge Queue</p>
      </div>`;

      sendEmail("adminuk@eventperfekt.com",
        `EP Concierge request — ${name.trim()} — ${best_time_to_call || "any time"}`,
        adminHtml
      ).catch(() => {});

      // BCC the director
      sendEmail("info@eventperfekt.com",
        `[FYI] EP Concierge request — ${name.trim()}`,
        adminHtml
      ).catch(() => {});

      // Auto-acknowledgement to requester (if email provided)
      if (email?.trim()) {
        await sendEmail(email.trim(),
          "Your EP Concierge request is confirmed — I Am Her, 30 October 2026",
          `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0D0408;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0408;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#1A0A0E;border:1px solid rgba(201,169,97,0.18);" cellpadding="0" cellspacing="0">
      <tr><td style="background:#330311;padding:40px 32px;text-align:center;border-bottom:1px solid rgba(201,169,97,0.2);">
        <p style="margin:0 0 4px;color:#C9A961;font-size:9px;letter-spacing:0.4em;text-transform:uppercase;font-family:Arial,sans-serif;">EP CONCIERGE</p>
        <h1 style="margin:10px 0 0;color:#F4ECD8;font-size:22px;font-weight:400;font-family:Georgia,serif;font-style:italic;">I Am Her — The Weekend</h1>
      </td></tr>
      <tr><td style="height:1px;background:linear-gradient(to right,transparent,#C9A961,transparent);"></td></tr>
      <tr><td style="padding:44px 40px 36px;">
        <p style="margin:0 0 8px;color:#C9A961;font-size:9px;letter-spacing:0.36em;text-transform:uppercase;font-family:Arial,sans-serif;">Dear ${name.trim()},</p>
        <h2 style="margin:0 0 24px;color:#F4ECD8;font-size:24px;font-weight:400;font-style:italic;line-height:1.3;">Your request is with us.</h2>
        <p style="margin:0 0 20px;color:rgba(244,236,216,0.65);font-size:15px;line-height:1.8;font-family:Arial,sans-serif;font-weight:300;">
          Thank you for getting in touch. Your EP Concierge request has been received and we will contact you at your preferred time — <strong style="color:#F4ECD8;">${best_time_to_call || "as soon as possible"}</strong>.
        </p>
        <p style="margin:0 0 36px;color:rgba(244,236,216,0.65);font-size:15px;line-height:1.8;font-family:Arial,sans-serif;font-weight:300;">
          We'll help you plan the perfect Milton Keynes weekend around <em>The Woman Who Leads the Room</em> on 30 October 2026. Any questions in the meantime — reply to this email or reach us at <a href="mailto:info@eventperfekt.com" style="color:#C9A961;text-decoration:none;">info@eventperfekt.com</a>.
        </p>
      </td></tr>
      <tr><td style="background:#330311;padding:24px 32px;text-align:center;border-top:1px solid rgba(201,169,97,0.15);">
        <p style="margin:0 0 4px;color:rgba(255,255,255,0.55);font-size:11px;font-family:Arial,sans-serif;font-style:italic;">...making yours perfekt</p>
        <p style="margin:0;color:rgba(255,255,255,0.3);font-size:10px;font-family:Arial,sans-serif;">Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
        );
      }

      return res.json({ success: true, message: "Your request is with the EP Concierge. We'll be in touch at your preferred time." });
    } catch (err: any) {
      console.error("[Concierge] Error:", err.message);
      return res.status(500).json({ message: "Could not submit request. Please try again." });
    }
  });

  // Admin view of concierge requests
  app.get("/api/event-august/admin/concierge", adminGuard, async (_req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT * FROM ep_concierge_requests ORDER BY created_at DESC LIMIT 200
      `);
      res.json(rows.rows || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update concierge request status
  app.patch("/api/event-august/admin/concierge/:id", adminGuard, async (req: any, res) => {
    try {
      const { status, notes } = req.body;
      await db.execute(sql`
        UPDATE ep_concierge_requests SET status = ${status}, notes = ${notes || null} WHERE id = ${parseInt(req.params.id)}
      `);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GDPR Data Subject Rights (I AM HER) ───────────────────────────────────
  // Rate-limited: 3 requests per 15 minutes per IP
  const rightsLimit = new Map<string, { count: number; resetAt: number }>();
  function checkRightsLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rightsLimit.get(ip);
    if (!entry || now > entry.resetAt) {
      rightsLimit.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
      return true;
    }
    if (entry.count >= 3) return false;
    entry.count++;
    return true;
  }

  // 1. Data Export (portability) — returns all data for a given email
  app.post("/api/event-august/data-rights/export", async (req: any, res) => {
    try {
      const clientIp = req.ip || req.socket?.remoteAddress || "unknown";
      if (!checkRightsLimit(clientIp)) {
        return res.status(429).json({ message: "Too many requests. Please wait 15 minutes and try again." });
      }
      const { email } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Please provide a valid email address." });
      }
      const cleanEmail = email.toLowerCase().trim();

      // Collect data from all relevant tables
      const tables = [
        { name: "iamher_stories", columns: "id, name, anonymous, job_title, company, email, category, title, story, status, featured, consent, photo_consent, wellbeing_issues, sought_support, support_providers, support_testimonial, may_contact, created_at, published_at, rejection_note" },
        { name: "event_16july_interest", columns: "id, first_name, last_name, email, role, company, phone, linkedin, source, consent_marketing, attendance_reason, access_type, media_consent, dietary_requirements, accessibility_needs, payment_status, created_at" },
        { name: "event_16july_partner", columns: "id, name, organisation, role, email, phone, linkedin, message, consent_marketing, status, created_at" },
        { name: "event_16july_sponsor", columns: "id, name, brand, role, email, phone, sponsorship_type, message, consent_marketing, status, created_at" },
        { name: "event_16july_contact", columns: "id, name, email, phone, message, consent_marketing, created_at" },
        { name: "event_16july_feature", columns: "id, name, email, role, company, statement, consent_featured, consent_photo_rights, status, created_at" },
        { name: "event_16july_brochure", columns: "id, name, email, tier, seats, message, consent_marketing, created_at" },
        { name: "event_16july_room_profiles", columns: "id, name, email, role, company, bio, photo_url, status, created_at" },
        { name: "event_16july_nominations", columns: "id, nominator_name, nominator_email, nominee_name, nominee_email, message, status, created_at" },
        { name: "ep_concierge_requests", columns: "id, name, phone, email, staying_over, nights, who_coming, group_size, children_ages, help_needed, best_time_to_call, status, created_at" },
        { name: "event_16july_founding_assessment", columns: "id, organisation, contact_name, contact_email, contact_phone, brand_vision, in_room_moment, framing_preferences, status, created_at" },
        { name: "event_16july_table_nominations", columns: "id, organisation, contact_name, contact_email, contact_phone, dietary_requirements, accessibility_needs, status, created_at" },
      ];

      const result: Record<string, any[]> = {};
      let totalRecords = 0;
      for (const t of tables) {
        const rows = await db.execute(sql`
          SELECT ${sql.raw(t.columns)} FROM ${sql.raw(t.name)} WHERE email = ${cleanEmail} OR contact_email = ${cleanEmail} OR nominator_email = ${cleanEmail} OR nominee_email = ${cleanEmail}
        `).catch(() => ({ rows: [] }));
        const data = rows.rows || [];
        if (data.length > 0) {
          result[t.name] = data;
          totalRecords += data.length;
        }
      }

      return res.json({
        email: cleanEmail,
        totalRecords,
        tables: result,
        requestId: randomUUID(),
        generatedAt: new Date().toISOString(),
        notice: "This export is provided under your right to data portability (UK GDPR Article 20). You may request deletion via the erasure endpoint.",
      });
    } catch (err: any) {
      return res.status(500).json({ message: "Could not export data. Please contact privacy@eventperfekt.com." });
    }
  });

  // 2. Data Erasure (right to be forgotten) — soft delete by anonymising
  app.post("/api/event-august/data-rights/erasure", async (req: any, res) => {
    try {
      const clientIp = req.ip || req.socket?.remoteAddress || "unknown";
      if (!checkRightsLimit(clientIp)) {
        return res.status(429).json({ message: "Too many requests. Please wait 15 minutes and try again." });
      }
      const { email, reason } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Please provide a valid email address." });
      }
      const cleanEmail = email.toLowerCase().trim();
      const erasureToken = `ANON-${randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();

      // Anonymise all tables matching the email
      const tables = [
        "iamher_stories", "event_16july_interest", "event_16july_partner", "event_16july_sponsor",
        "event_16july_contact", "event_16july_feature", "event_16july_brochure",
        "event_16july_room_profiles", "ep_concierge_requests",
      ];
      let totalAnonymised = 0;
      for (const t of tables) {
        const r = await db.execute(sql`
          UPDATE ${sql.raw(t)} SET email = ${erasureToken}, name = 'Anonymised', phone = 'Anonymised', linkedin = 'Anonymised', story = '[Removed at user request]', message = '[Removed at user request]', photo_url = NULL, statement = '[Removed at user request]', bio = '[Removed at user request]', consent_marketing = false, consent_featured = false, consent_photo_rights = false, consent = false, photo_consent = false, wellbeing_issues = NULL, support_providers = NULL, support_testimonial = NULL, may_contact = false
          WHERE email = ${cleanEmail}
        `).catch(() => ({ rowCount: 0 }));
        totalAnonymised += (r as any).rowCount || 0;
      }

      // Anonymise contact_email and nominator_email fields
      const contactTables = [
        { t: "event_16july_founding_assessment", f: "contact_email" },
        { t: "event_16july_table_nominations", f: "contact_email" },
        { t: "event_16july_nominations", f: "nominator_email" },
      ];
      for (const { t, f } of contactTables) {
        const r = await db.execute(sql`
          UPDATE ${sql.raw(t)} SET ${sql.raw(f)} = ${erasureToken}, contact_name = 'Anonymised', contact_phone = 'Anonymised', organisation = 'Anonymised', message = '[Removed at user request]'
          WHERE ${sql.raw(f)} = ${cleanEmail}
        `).catch(() => ({ rowCount: 0 }));
        totalAnonymised += (r as any).rowCount || 0;
      }

      // Log erasure for audit trail
      await db.execute(sql`
        INSERT INTO iamher_erasure_log (email, erasure_token, reason, ip_address, anonymised_count, created_at)
        VALUES (${cleanEmail}, ${erasureToken}, ${reason || 'User request'}, ${clientIp}, ${totalAnonymised}, ${now})
      `).catch(() => {});

      return res.json({
        success: true,
        email: cleanEmail,
        erasureToken,
        anonymisedRecords: totalAnonymised,
        message: "Your data has been anonymised. Identifiable information has been replaced with non-reversible tokens. If you need full confirmation, contact privacy@eventperfekt.com.",
      });
    } catch (err: any) {
      return res.status(500).json({ message: "Could not process erasure. Please contact privacy@eventperfekt.com for assistance." });
    }
  });

  // Create erasure log table (bootstrap)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS iamher_erasure_log (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      erasure_token TEXT NOT NULL,
      reason TEXT,
      ip_address TEXT,
      anonymised_count INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});

  // 3. Admin view of erasure log
  app.get("/api/event-august/admin/erasure-log", adminGuard, async (_req, res) => {
    try {
      const rows = await db.execute(sql`SELECT * FROM iamher_erasure_log ORDER BY created_at DESC LIMIT 100`);
      res.json(rows.rows || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Waiting List (About The Movement) ───────────────────────────────
  app.post("/api/event-august/waiting-list", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) return res.status(429).json({ message: "Too many submissions. Please try again in a minute." });

      const { name, email, organisation, country, region, interest_type, reason, consent_marketing } = req.body;
      if (!name?.trim() || !email?.trim()) {
        return res.status(400).json({ message: "Name and email are required" });
      }
      if (!consent_marketing) return res.status(400).json({ message: "Please tick the consent box to continue" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email address" });
      if (isDisposableEmail(email)) return res.status(400).json({ message: "Please use a real email address." });

      await db.execute(sql`
        INSERT INTO iamher_waiting_list (name, email, organisation, country, region, interest_type, reason, consent_marketing, ip_address)
        VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${organisation?.trim() || null},
                ${country?.trim() || null}, ${region?.trim() || null}, ${interest_type?.trim() || 'guest'},
                ${reason?.trim() || null}, ${!!consent_marketing}, ${ip})
      `);

      const firstName = name.trim().split(" ")[0];
      sendEmail(email.toLowerCase().trim(), "Thank you for joining the waiting list | The Human Behind The Title", `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.75;">
          <p>Dear ${firstName},</p>
          <p>Thank you for your interest in <strong>The Human Behind The Title</strong>.</p>
          <p>You have been added to our waiting list. We will be in touch as soon as opportunities open in your region.</p>
          <p>Warm regards,</p>
          <p><strong>The Event Perfekt Team</strong></p>
        </div>
      `).catch(() => {});

      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ message: err.message }); }
  });
}
