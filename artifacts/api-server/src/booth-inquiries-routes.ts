// Booth Inquiry Management Routes
import { type Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { logger } from "./lib/logger";
import { authenticateToken } from "./auth";

interface BoothInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  serviceType: string;
  message: string;
  status: "new" | "contacted" | "quote_sent" | "booked" | "lost";
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function boothInquiryRoutes(app: Express) {
  /**
   * Initialize booth_inquiries table
   */
  async function initBoothInquiriesTable() {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS booth_inquiries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          company VARCHAR(255),
          serviceType VARCHAR(50) NOT NULL,
          message TEXT,
          status VARCHAR(50) DEFAULT 'new',
          assigned_to UUID,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_booth_inquiries_email ON booth_inquiries(email)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_booth_inquiries_status ON booth_inquiries(status)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_booth_inquiries_created ON booth_inquiries(created_at DESC)`);
      
      logger.info("✅ booth_inquiries table ready");
    } catch (error) {
      logger.error("Failed to initialize booth_inquiries table:", error);
      throw error;
    }
  }

  /**
   * POST /api/booth-inquiries
   * Create new booth inquiry (called from contact form)
   */
  app.post("/api/booth-inquiries", async (req: any, res) => {
    try {
      const { name, email, phone, company, serviceType, message } = req.body;

      if (!name || !email || !serviceType) {
        return res.status(400).json({
          error: "Missing required fields: name, email, serviceType"
        });
      }

      const inquiryId = await db.execute(sql`
        INSERT INTO booth_inquiries (name, email, phone, company, serviceType, message, status)
        VALUES (${name}, ${email}, ${phone || null}, ${company || null}, ${serviceType}, ${message || null}, 'new')
        RETURNING id
      `);

      const id = (inquiryId.rows[0] as any)?.id;

      logger.info(`📸 New booth inquiry: ${name} (${email}) - ID: ${id}`);

      res.json({
        success: true,
        inquiryId: id,
        message: "Booth inquiry saved successfully"
      });
    } catch (error) {
      logger.error("Failed to create booth inquiry:", error);
      res.status(500).json({ error: "Failed to save booth inquiry" });
    }
  });

  /**
   * GET /api/booth-inquiries
   * List all booth inquiries (requires auth)
   */
  app.get("/api/booth-inquiries", authenticateToken, async (req: any, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      let query = sql`
        SELECT id, name, email, phone, company, serviceType, message, status, assigned_to, notes, created_at, updated_at
        FROM booth_inquiries
      `;

      if (status) {
        query = sql`
          SELECT id, name, email, phone, company, serviceType, message, status, assigned_to, notes, created_at, updated_at
          FROM booth_inquiries
          WHERE status = ${status}
        `;
      }

      query = sql`${query} ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

      const result = await db.execute(query);
      const total = await db.execute(sql`SELECT COUNT(*) as count FROM booth_inquiries`);

      res.json({
        inquiries: result.rows || [],
        total: (total.rows[0] as any)?.count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      logger.error("Failed to fetch booth inquiries:", error);
      res.status(500).json({ error: "Failed to fetch inquiries" });
    }
  });

  /**
   * GET /api/booth-inquiries/:id
   * Get single booth inquiry
   */
  app.get("/api/booth-inquiries/:id", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;

      const result = await db.execute(sql`
        SELECT id, name, email, phone, company, serviceType, message, status, assigned_to, notes, created_at, updated_at
        FROM booth_inquiries
        WHERE id = ${id}
      `);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: "Inquiry not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      logger.error("Failed to fetch booth inquiry:", error);
      res.status(500).json({ error: "Failed to fetch inquiry" });
    }
  });

  /**
   * PATCH /api/booth-inquiries/:id
   * Update booth inquiry status/notes
   */
  app.patch("/api/booth-inquiries/:id", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, notes, assigned_to } = req.body;

      const updates: string[] = [];
      if (status) updates.push(`status = '${status}'`);
      if (notes) updates.push(`notes = '${notes.replace(/'/g, "''")}'`);
      if (assigned_to) updates.push(`assigned_to = '${assigned_to}'`);
      updates.push(`updated_at = NOW()`);

      if (updates.length === 1) { // Only updated_at
        return res.status(400).json({ error: "No fields to update" });
      }

      await db.execute(
        sql.raw(`UPDATE booth_inquiries SET ${updates.join(", ")} WHERE id = '${id}'`)
      );

      logger.info(`Updated booth inquiry ${id}`);

      res.json({ success: true, message: "Inquiry updated" });
    } catch (error) {
      logger.error("Failed to update booth inquiry:", error);
      res.status(500).json({ error: "Failed to update inquiry" });
    }
  });

  /**
   * GET /api/booth-inquiries/stats/summary
   * Analytics summary for booth inquiries
   */
  app.get("/api/booth-inquiries/stats/summary", authenticateToken, async (req: any, res) => {
    try {
      const stats = await db.execute(sql`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'new' THEN 1 END) as new_inquiries,
          COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
          COUNT(CASE WHEN status = 'quote_sent' THEN 1 END) as quote_sent,
          COUNT(CASE WHEN status = 'booked' THEN 1 END) as booked,
          COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost,
          COUNT(DISTINCT DATE(created_at)) as days_active,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as this_week,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as this_month
        FROM booth_inquiries
      `);

      res.json(stats.rows[0] || {});
    } catch (error) {
      logger.error("Failed to fetch booth stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Initialize table on startup
  await initBoothInquiriesTable();
}
