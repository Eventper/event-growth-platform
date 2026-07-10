// Analytics and funnel tracking routes
import { type Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { logger } from "./lib/logger";

interface FunnelData {
  platformPageViews: number;
  boothCtaClicks: number;
  contactFormSubmits: number;
  boothInquiries: number;
  platformInquiries: number;
  topCtaButtons: { [key: string]: number };
  conversionRate: number;
}

export default function analyticsRoutes(app: Express) {
  /**
   * GET /api/analytics/funnel
   * Returns aggregated funnel metrics for booth inquiry conversion
   */
  app.get("/api/analytics/funnel", async (req, res) => {
    try {
      // Get platform page views (visits to /iamher/platform)
      const platformViews = await db.execute(
        sql`
          SELECT COUNT(*) as count FROM visitor_tracking 
          WHERE page_url LIKE '%/iamher/platform%' 
          AND created_at > NOW() - INTERVAL 30 DAY
        `
      );
      const platformPageViews = platformViews.rows[0]?.count || 0;

      // Get booth CTA clicks
      const boothCtaEvents = await db.execute(
        sql`
          SELECT COUNT(*) as count FROM visitor_tracking 
          WHERE event_type = 'cta_click' 
          AND event_data LIKE '%booth%'
          AND created_at > NOW() - INTERVAL 30 DAY
        `
      );
      const boothCtaClicks = boothCtaEvents.rows[0]?.count || 0;

      // Get contact form submissions
      const contactSubmits = await db.execute(
        sql`
          SELECT COUNT(*) as count FROM visitor_tracking 
          WHERE event_type = 'contact_form_submit'
          AND created_at > NOW() - INTERVAL 30 DAY
        `
      );
      const contactFormSubmits = contactSubmits.rows[0]?.count || 0;

      // Get booth inquiries (inquiryType='booth-inquiry' in contact_form_submit)
      const boothInqs = await db.execute(
        sql`
          SELECT COUNT(*) as count FROM visitor_tracking 
          WHERE event_type = 'contact_form_submit' 
          AND event_data LIKE '%booth-inquiry%'
          AND created_at > NOW() - INTERVAL 30 DAY
        `
      );
      const boothInquiries = boothInqs.rows[0]?.count || 0;

      // Get platform inquiries
      const platformInqs = await db.execute(
        sql`
          SELECT COUNT(*) as count FROM visitor_tracking 
          WHERE event_type = 'contact_form_submit' 
          AND event_data LIKE '%platform-inquiry%'
          AND created_at > NOW() - INTERVAL 30 DAY
        `
      );
      const platformInquiries = platformInqs.rows[0]?.count || 0;

      // Get top converting CTAs
      const topCtas = await db.execute(
        sql`
          SELECT 
            JSON_EXTRACT(event_data, '$.cta') as cta,
            COUNT(*) as count
          FROM visitor_tracking 
          WHERE event_type = 'cta_click'
          AND created_at > NOW() - INTERVAL 30 DAY
          GROUP BY JSON_EXTRACT(event_data, '$.cta')
          ORDER BY count DESC
          LIMIT 10
        `
      );

      const topCtaButtons: { [key: string]: number } = {};
      topCtas.rows?.forEach((row: any) => {
        if (row.cta) {
          topCtaButtons[row.cta] = row.count || 0;
        }
      });

      // Calculate conversion rates
      const platformToBoothRate = platformPageViews > 0 ? (boothCtaClicks / platformPageViews) * 100 : 0;
      const contactToBoothRate = contactFormSubmits > 0 ? (boothInquiries / contactFormSubmits) * 100 : 0;
      const overallConversionRate = platformPageViews > 0 ? (boothInquiries / platformPageViews) * 100 : 0;

      const funnelData: FunnelData = {
        platformPageViews,
        boothCtaClicks,
        contactFormSubmits,
        boothInquiries,
        platformInquiries,
        topCtaButtons,
        conversionRate: overallConversionRate,
      };

      res.json(funnelData);
    } catch (error) {
      logger.error("Error fetching funnel analytics:", error);
      res.status(500).json({
        error: "Failed to fetch analytics",
        platformPageViews: 0,
        boothCtaClicks: 0,
        contactFormSubmits: 0,
        boothInquiries: 0,
        platformInquiries: 0,
        topCtaButtons: {},
        conversionRate: 0,
      });
    }
  });

  /**
   * GET /api/analytics/contact-routing
   * Returns contact inquiry breakdown for email routing decisions
   */
  app.get("/api/analytics/contact-routing", async (req, res) => {
    try {
      const result = await db.execute(
        sql`
          SELECT 
            JSON_EXTRACT(event_data, '$.inquiryType') as inquiryType,
            JSON_EXTRACT(event_data, '$.serviceType') as serviceType,
            COUNT(*) as count
          FROM visitor_tracking 
          WHERE event_type = 'contact_form_submit'
          AND created_at > NOW() - INTERVAL 30 DAY
          GROUP BY 
            JSON_EXTRACT(event_data, '$.inquiryType'),
            JSON_EXTRACT(event_data, '$.serviceType')
          ORDER BY count DESC
        `
      );

      const routing = {
        boothInquiries: 0,
        platformInquiries: 0,
        generalInquiries: 0,
        breakdown: [] as any[],
      };

      result.rows?.forEach((row: any) => {
        const type = row.inquiryType || "general";
        const count = row.count || 0;

        if (type === "booth-inquiry") {
          routing.boothInquiries += count;
        } else if (type === "platform-inquiry") {
          routing.platformInquiries += count;
        } else {
          routing.generalInquiries += count;
        }

        routing.breakdown.push({
          inquiryType: type,
          serviceType: row.serviceType,
          count,
        });
      });

      res.json(routing);
    } catch (error) {
      logger.error("Error fetching contact routing data:", error);
      res.status(500).json({
        boothInquiries: 0,
        platformInquiries: 0,
        generalInquiries: 0,
        breakdown: [],
      });
    }
  });
}
