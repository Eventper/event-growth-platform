import { type Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { z } from "zod";

// ── Validation ───────────────────────────────────────────────
const CITIES = ["milton-keynes", "manchester", "birmingham", "leeds", "liverpool", "london"] as const;

const submissionSchema = z.object({
  citySlug: z.enum(CITIES).optional().default("milton-keynes"),
  cityDisplay: z.string().max(100).optional().default("Milton Keynes"),
  businessName: z.string().min(1).max(200),
  founderName: z.string().max(200).optional(),
  category: z.enum(["stay", "eat_drink", "enjoy", "invest_relocate"]),
  website: z.string().max(500).optional(),
  instagram: z.string().max(200).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(50).optional(),
  aboutBusiness: z.string().max(2000).optional(),
  whatMakesWorthDiscovering: z.string().max(2000).optional(),
  offerDiscount: z.string().max(1000).optional(),
  interestedPartnership: z.boolean().optional(),
  partnershipValue: z.array(z.string()).optional(),
  imageUrl: z.string().max(1000).optional(),
});

const statusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  reviewNotes: z.string().max(1000).optional(),
});

// ── Rate limiting ─────────────────────────────────────────────
const submitCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  // Evict expired entries so the map can't grow unbounded over time (every IP
  // that ever submits would otherwise stay resident forever).
  if (submitCounts.size > 500) {
    for (const [key, e] of submitCounts) if (now > e.resetAt) submitCounts.delete(key);
  }
  const entry = submitCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    submitCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

// ── Helper: send notification email ──────────────────────────────────
async function sendNotification(submission: any) {
  try {
    const { sendMail } = await import("./emailService");
    const categoryLabels: Record<string, string> = {
      stay: "Stay",
      eat_drink: "Eat & Drink",
      enjoy: "Enjoy",
      invest_relocate: "Invest & Relocate",
    };
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#330311;">New I Am Her Business Submission</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Business:</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${submission.businessName}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Category:</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${categoryLabels[submission.category] || submission.category}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Founder:</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${submission.founderName || "N/A"}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Email:</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${submission.email || "N/A"}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Website:</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${submission.website || "N/A"}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Phone:</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${submission.phone || "N/A"}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Partnership Interest:</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${submission.interestedPartnership ? "Yes" : "No"}</td></tr>
        </table>
        <p style="margin-top:20px;color:#555;">
          <strong>About:</strong><br>${submission.aboutBusiness || "N/A"}
        </p>
        <p style="margin-top:12px;color:#555;">
          <strong>What makes them worth discovering:</strong><br>${submission.whatMakesWorthDiscovering || "N/A"}
        </p>
        <p style="margin-top:12px;color:#555;">
          <strong>Discount / Experience:</strong><br>${submission.offerDiscount || "N/A"}
        </p>
        <div style="margin-top:24px;padding:16px;background:#f8f0f0;border-left:3px solid #330311;">
          <p style="margin:0;font-size:13px;color:#555;">
            Review at: <a href="https://eventperfekt.net/admin/iamher/businesses" style="color:#330311;">Admin Panel</a>
          </p>
        </div>
      </div>
    `;
    await sendMail("info@eventperfekt.com", "New I Am Her Business Submission", html);
  } catch (err: any) {
    console.warn("[iamher-business] Notification email failed:", err.message);
  }
}

// ── Routes ──────────────────────────────────────────────────
async function ensureTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS iamher_business_submissions (
        id SERIAL PRIMARY KEY,
        city_slug TEXT NOT NULL DEFAULT 'milton-keynes',
        city_display TEXT NOT NULL DEFAULT 'Milton Keynes',
        business_name TEXT NOT NULL,
        founder_name TEXT,
        category TEXT NOT NULL,
        website TEXT,
        instagram TEXT,
        email TEXT,
        phone TEXT,
        about_business TEXT,
        what_makes_worth_discovering TEXT,
        offer_discount TEXT,
        interested_partnership BOOLEAN DEFAULT FALSE,
        partnership_value TEXT,
        image_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewed_by TEXT,
        reviewed_at TIMESTAMP,
        review_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_iamher_business_status ON iamher_business_submissions(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_iamher_business_city ON iamher_business_submissions(city_slug)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_iamher_business_category ON iamher_business_submissions(category)`);
  } catch (err: any) {
    console.error("[iamher-business] Table bootstrap failed:", err.message);
  }
}

export function registerIamherBusinessRoutes(app: Express, authenticateToken: any) {
  // Ensure table exists before handling requests
  ensureTable().catch(() => {});

  // POST /api/iamher/business-submission — submit new business
  app.post("/api/iamher/business-submission", async (req: any, res: any) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ message: "Too many submissions. Please wait a minute." });
    }

    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid submission", errors: parsed.error.issues });
    }

    try {
      const data = parsed.data;
      const result = await db.execute(sql`
        INSERT INTO iamher_business_submissions (
          city_slug, city_display, business_name, founder_name, category, website, instagram, email, phone,
          about_business, what_makes_worth_discovering, offer_discount, interested_partnership, partnership_value, image_url
        ) VALUES (
          ${data.citySlug}, ${data.cityDisplay}, ${data.businessName}, ${data.founderName || null}, ${data.category}, ${data.website || null},
          ${data.instagram || null}, ${data.email || null}, ${data.phone || null},
          ${data.aboutBusiness || null}, ${data.whatMakesWorthDiscovering || null},
          ${data.offerDiscount || null}, ${data.interestedPartnership ?? false}, ${data.partnershipValue ? JSON.stringify(data.partnershipValue) : null}, ${data.imageUrl || null}
        ) RETURNING id
      `);
      const id = (result.rows[0] as any)?.id;

      // Send notification
      await sendNotification(data);

      res.status(201).json({ id, message: "Submission received. Thank you." });
    } catch (err: any) {
      console.error("[iamher-business] Submission failed:", err.message);
      res.status(500).json({ message: "Failed to save submission. Please try again." });
    }
  });

  // GET /api/iamher/business-submissions — list approved businesses (public)
  app.get("/api/iamher/business-submissions", async (req: any, res: any) => {
    const category = req.query.category as string | undefined;
    try {
      let query = sql`
        SELECT id, business_name, founder_name, category, website, instagram, email, phone,
          about_business, what_makes_worth_discovering, offer_discount, interested_partnership, image_url,
          created_at
        FROM iamher_business_submissions
        WHERE status = 'approved'
      `;
      if (category && ["stay", "eat_drink", "enjoy", "invest_relocate"].includes(category)) {
        query = sql`
          SELECT id, business_name, founder_name, category, website, instagram, email, phone,
            about_business, what_makes_worth_discovering, offer_discount, interested_partnership, image_url,
            created_at
          FROM iamher_business_submissions
          WHERE status = 'approved' AND category = ${category}
          ORDER BY created_at DESC
        `;
      } else {
        query = sql`
          SELECT id, business_name, founder_name, category, website, instagram, email, phone,
            about_business, what_makes_worth_discovering, offer_discount, interested_partnership, image_url,
            created_at
          FROM iamher_business_submissions
          WHERE status = 'approved'
          ORDER BY created_at DESC
        `;
      }
      const rows = await db.execute(query);
      res.json({ businesses: rows.rows });
    } catch (err: any) {
      console.error("[iamher-business] Fetch failed:", err.message);
      res.status(500).json({ message: "Failed to load businesses." });
    }
  });

  // GET /api/iamher/business-submissions/:id — single business (public, approved only)
  app.get("/api/iamher/business-submissions/:id", async (req: any, res: any) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const rows = await db.execute(sql`
        SELECT id, business_name, founder_name, category, city_display, website, instagram, email, phone,
          about_business, what_makes_worth_discovering, offer_discount, interested_partnership, image_url,
          created_at
        FROM iamher_business_submissions
        WHERE id = ${id} AND status = 'approved'
      `);
      if (rows.rows.length === 0) {
        return res.status(404).json({ message: "Business not found or not yet approved" });
      }
      res.json({ business: rows.rows[0] });
    } catch (err: any) {
      console.error("[iamher-business] Single fetch failed:", err.message);
      res.status(500).json({ message: "Failed to load business." });
    }
  });

  // GET /api/iamher/admin/business-submissions — admin list (all statuses).
  // Distinct /admin path so it is not shadowed by the public /:id route above,
  // and gated by authenticateToken so req.user is populated for the role check.
  app.get("/api/iamher/admin/business-submissions", authenticateToken, async (req: any, res: any) => {
    // Simple auth check — staff only
    if (!req.user || !["admin", "planner", "manager", "staff"].includes(req.user.role)) {
      return res.status(403).json({ message: "Staff access required" });
    }
    try {
      const rows = await db.execute(sql`
        SELECT * FROM iamher_business_submissions
        ORDER BY created_at DESC
      `);
      res.json({ businesses: rows.rows });
    } catch (err: any) {
      console.error("[iamher-business] Admin fetch failed:", err.message);
      res.status(500).json({ message: "Failed to load submissions." });
    }
  });

  // PATCH /api/iamher/business-submissions/:id/status — admin review
  app.patch("/api/iamher/business-submissions/:id/status", authenticateToken, async (req: any, res: any) => {
    if (!req.user || !["admin", "planner", "manager", "staff"].includes(req.user.role)) {
      return res.status(403).json({ message: "Staff access required" });
    }
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid status", errors: parsed.error.issues });
    }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    try {
      await db.execute(sql`
        UPDATE iamher_business_submissions
        SET status = ${parsed.data.status},
          review_notes = ${parsed.data.reviewNotes || null},
          reviewed_by = ${req.user?.email || req.user?.name || "admin"},
          reviewed_at = NOW()
        WHERE id = ${id}
      `);
      res.json({ message: `Status updated to ${parsed.data.status}` });
    } catch (err: any) {
      console.error("[iamher-business] Status update failed:", err.message);
      res.status(500).json({ message: "Failed to update status." });
    }
  });

  // Health check endpoint — distinct path to avoid auth middleware on the route prefix
  app.get("/api/iamher/business-health", async (_req: any, res: any) => {
    try {
      const result = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM iamher_business_submissions`);
      const count = (result.rows[0] as any)?.cnt ?? 0;
      res.json({ status: "ok", totalSubmissions: count });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });
}
