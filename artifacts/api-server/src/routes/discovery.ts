// Discovery / Tenders domain routes (Phase 3, Task 1 — backend decomposition).
// Extracted verbatim from saas-tender-routes.ts. These handlers are fully
// self-contained: they use only db/sql, the shared auth middleware, and
// runTenderSweep — no function-scope closures from the monolith.
//
// Mounted by registerSaasTenderRoutes() via registerDiscoveryRoutes(app), which
// preserves the original registration order. The AI-entangled discovery routes
// (quick-add, finder/search, finder/buyer-intel, feed/search, search-config) stay
// in the monolith until their shared helpers are lifted into a shared module —
// that's the next incremental backend pass.
import type { Express } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { runTenderSweep } from "../tender-sweeper";
import { authenticateSaasUser } from "../saas-tender-routes";

export function registerDiscoveryRoutes(app: Express) {
  // ─── Tenders CRUD ──────────────────────────────────────────────────────────
  app.get("/api/saas-tender/tenders", authenticateSaasUser, async (req: any, res) => {
    try {
      const country = req.query.country || "GB";
      const showAll = req.query.show_all === "true";

      // LIVE-ONLY default view (product rule): the portal shows only live, open
      // opportunities — every tender MUST have a future deadline, and Won/Lost/
      // Awarded/Closed/Expired/etc. are excluded. Past-deadline and no-deadline
      // rows are retained in the DB (for history) but never surface here.
      // Pass ?show_all=true for the archive/reporting view (everything).
      const result = showAll
        ? await db.execute(sql`
            SELECT * FROM saas_tenders
            WHERE org_id = ${req.saasUser.orgId}
              AND (country = ${country} OR country IS NULL)
            ORDER BY
              CASE WHEN deadline IS NOT NULL AND deadline != '' THEN 0 ELSE 1 END,
              deadline ASC NULLS LAST,
              updated_at DESC
          `)
        : await db.execute(sql`
            SELECT * FROM saas_tenders
            WHERE org_id = ${req.saasUser.orgId}
              AND (country = ${country} OR country IS NULL)
              AND LOWER(status) NOT IN ('won', 'lost', 'closed', 'no bid', 'declined', 'awarded to other', 'awarded', 'cancelled', 'withdrawn', 'unsuccessful', 'expired', 'submitted')
              AND deadline IS NOT NULL
              AND deadline <> ''
              AND deadline::date >= CURRENT_DATE
            ORDER BY deadline ASC, updated_at DESC
          `);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/tenders", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const result = await db.execute(sql`
        INSERT INTO saas_tenders (org_id, title, buyer, value_text, value_amount, deadline, status, category, portal, notes, source_url, cpv_codes, scoring_criteria, word_limits, tender_questions, contract_end_date, country, created_by)
        VALUES (${req.saasUser.orgId}, ${d.title}, ${d.buyer || null}, ${d.value_text || null}, ${d.value_amount || 0}, ${d.deadline || null}, ${d.status || 'Researching'}, ${d.category || null}, ${d.portal || null}, ${d.notes || null}, ${d.source_url || null}, ${d.cpv_codes || null}, ${d.scoring_criteria || null}, ${d.word_limits || null}, ${d.tender_questions || null}, ${d.contract_end_date || null}, ${d.country || 'GB'}, ${req.saasUser.userId})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/saas-tender/tenders/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      // Parameterised dynamic UPDATE — every value is bound, never string-interpolated,
      // so user-supplied tender fields can't break out of the query (was sql.raw + manual
      // quote-escaping). Same column semantics as before (text → '' when blank, amount → 0).
      const sets: any[] = [];
      if (d.title !== undefined) sets.push(sql`title = ${d.title}`);
      if (d.buyer !== undefined) sets.push(sql`buyer = ${d.buyer || ""}`);
      if (d.value_text !== undefined) sets.push(sql`value_text = ${d.value_text || ""}`);
      if (d.value_amount !== undefined) sets.push(sql`value_amount = ${d.value_amount || 0}`);
      if (d.deadline !== undefined) sets.push(sql`deadline = ${d.deadline || ""}`);
      if (d.status !== undefined) sets.push(sql`status = ${d.status}`);
      if (d.category !== undefined) sets.push(sql`category = ${d.category || ""}`);
      if (d.portal !== undefined) sets.push(sql`portal = ${d.portal || ""}`);
      if (d.notes !== undefined) sets.push(sql`notes = ${d.notes || ""}`);
      if (d.source_url !== undefined) sets.push(sql`source_url = ${d.source_url || ""}`);
      if (d.cpv_codes !== undefined) sets.push(sql`cpv_codes = ${d.cpv_codes || ""}`);
      if (d.scoring_criteria !== undefined) sets.push(sql`scoring_criteria = ${d.scoring_criteria || ""}`);
      if (d.word_limits !== undefined) sets.push(sql`word_limits = ${d.word_limits || ""}`);
      if (d.tender_questions !== undefined) sets.push(sql`tender_questions = ${d.tender_questions || ""}`);
      if (d.contract_end_date !== undefined) sets.push(sql`contract_end_date = ${d.contract_end_date || ""}`);
      if (d.country !== undefined) sets.push(sql`country = ${d.country}`);
      if (sets.length === 0) return res.status(400).json({ message: "No fields to update" });
      sets.push(sql`updated_at = NOW()`);
      const result = await db.execute(sql`
        UPDATE saas_tenders SET ${sql.join(sets, sql`, `)}
        WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}
        RETURNING *
      `);
      return res.json(result.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/saas-tender/tenders/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM saas_tenders WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
      res.json({ message: "Deleted" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ─── Manual sweep trigger ────────────────────────────────────────────────────
  app.post("/api/saas-tender/sweep/run-now", authenticateSaasUser, async (req: any, res) => {
    try {
      res.json({ message: "Tender sweep started in background — check dashboard in ~60 seconds for new results" });
      runTenderSweep().catch(e => console.error("[SweepTrigger] Error:", e.message));
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ─── Watchlist ───────────────────────────────────────────────────────────────
  app.get("/api/saas-tender/watchlist", authenticateSaasUser, async (req: any, res) => {
    try {
      const country = req.query.country || "GB";
      const result = await db.execute(sql`SELECT * FROM saas_tender_watchlist WHERE org_id = ${req.saasUser.orgId} AND user_id = ${req.saasUser.userId} AND (country = ${country} OR country IS NULL) ORDER BY added_at DESC`);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/watchlist", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`INSERT INTO saas_tender_watchlist (org_id, user_id, tender_ext_id, notes, country) VALUES (${req.saasUser.orgId}, ${req.saasUser.userId}, ${req.body.tender_ext_id}, ${req.body.notes || null}, ${req.body.country || 'GB'}) ON CONFLICT DO NOTHING RETURNING *`);
      res.json(result.rows[0] || { message: "Already watchlisted" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/saas-tender/watchlist/:extId", authenticateSaasUser, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM saas_tender_watchlist WHERE tender_ext_id = ${req.params.extId} AND user_id = ${req.saasUser.userId} AND org_id = ${req.saasUser.orgId}`);
      res.json({ message: "Removed" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });
}
