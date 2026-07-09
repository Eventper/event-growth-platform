// Bid Writing domain routes (Phase 3, Task 1 — backend decomposition).
// Extracted verbatim from saas-tender-routes.ts. These handlers are fully
// self-contained: they use only db/sql and the shared auth middleware — no
// function-scope closures or AI helpers from the monolith.
//
// One deliberate, non-verbatim change: the two bid-section-evidence routes
// (GET .../evidence and DELETE .../evidence/:evidenceId) gained an org_id guard
// the originals lacked — the move preserved a cross-org read/delete path, which
// the Phase 3 org-scoping guardrail forbids. Same-org behaviour is unchanged.
//
// Mounted by registerSaasTenderRoutes() via registerBidWritingRoutes(app),
// right after the discovery mount. The AI-entangled bid routes (generate,
// generate-all, improve, review-chat, score, score-confidence, answer-questions,
// evidence-suggestions) stay in the monolith until their shared AI helpers are
// lifted into llmService — that's Phase 3, Task 3. No route-ordering change:
// the moved paths have no overlap with any handler registered between their old
// positions and this mount point.
import type { Express } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { authenticateSaasUser } from "../saas-tender-routes";

export function registerBidWritingRoutes(app: Express) {
  // ─── Bid sections: read / update / delete (DB-only; generate/improve/score
  //     stay in the monolith because they call AI helpers) ──────────────────────
  app.get("/api/saas-tender/bid-sections/:tenderId", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`SELECT * FROM saas_tender_bid_sections WHERE tender_id = ${req.params.tenderId} AND org_id = ${req.saasUser.orgId} ORDER BY sort_order`);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/saas-tender/bid-sections/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const result = await db.execute(sql`
        UPDATE saas_tender_bid_sections SET content = COALESCE(${d.content}, content), status = COALESCE(${d.status}, status), updated_at = NOW()
        WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId} RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/saas-tender/bid-sections/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM saas_tender_bid_sections WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
      res.json({ message: "Deleted" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ─── Proposals ───────────────────────────────────────────────────────────────
  app.post("/api/saas-tender/proposals", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tender_id, title, content } = req.body;
      if (!title || !content) return res.status(400).json({ message: "Title and content are required" });
      const share_token = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      const result = await db.execute(sql`
        INSERT INTO saas_proposals (org_id, tender_id, title, content, share_token)
        VALUES (${req.saasUser.orgId}, ${tender_id || null}, ${title}, ${content}, ${share_token})
        RETURNING *
      `);
      return res.json(result.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/proposals", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM saas_proposals WHERE org_id = ${req.saasUser.orgId} ORDER BY created_at DESC
      `);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/proposals/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM saas_proposals WHERE id = ${parseInt(req.params.id)} AND org_id = ${req.saasUser.orgId}
      `);
      if (result.rows.length === 0) return res.status(404).json({ message: "Proposal not found" });
      return res.json(result.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.put("/api/saas-tender/proposals/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      const { title, content } = req.body;
      const result = await db.execute(sql`
        UPDATE saas_proposals SET title = ${title}, content = ${content}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${parseInt(req.params.id)} AND org_id = ${req.saasUser.orgId}
        RETURNING *
      `);
      if (result.rows.length === 0) return res.status(404).json({ message: "Proposal not found" });
      return res.json(result.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.get("/api/saas-tender/proposals/share/:token", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT id, title, content, created_at FROM saas_proposals WHERE share_token = ${req.params.token}
      `);
      if (result.rows.length === 0) return res.status(404).json({ message: "Proposal not found" });
      return res.json(result.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ─── Bid-section evidence (pin/unpin vault docs to a section) ─────────────────
  // Org-scoped via a JOIN on saas_tender_bid_sections.org_id — closes a cross-org
  // read path the verbatim extraction preserved (the sibling attach route already
  // guards this way). No change for same-org callers (Phase 3 org-scoping guardrail).
  app.get("/api/saas-tender/bid-sections/:id/evidence", authenticateSaasUser, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT e.*, f.original_name, f.file_name, fold.name as folder_name
        FROM bid_section_evidence e
        JOIN saas_tender_bid_sections s ON s.id = e.section_id AND s.org_id = ${req.saasUser.orgId}
        JOIN saas_bid_vault_files f ON f.id = e.vault_doc_id
        LEFT JOIN saas_bid_vault_folders fold ON fold.id = f.folder_id
        WHERE e.section_id = ${req.params.id}
        ORDER BY e.attached_at DESC
      `);
      res.json(result.rows);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/saas-tender/bid-sections/:id/attach-evidence", authenticateSaasUser, async (req: any, res) => {
    try {
      const { vault_doc_id } = req.body;
      if (!vault_doc_id) return res.status(400).json({ message: "vault_doc_id required" });
      const secCheck = await db.execute(sql`SELECT id FROM saas_tender_bid_sections WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
      if (!secCheck.rows.length) return res.status(404).json({ message: "Section not found" });
      const existing = await db.execute(sql`SELECT id FROM bid_section_evidence WHERE section_id = ${req.params.id} AND vault_doc_id = ${vault_doc_id}`);
      if (existing.rows.length) return res.json({ message: "Already attached" });
      const row = await db.execute(sql`
        INSERT INTO bid_section_evidence (section_id, vault_doc_id, attached_by)
        VALUES (${req.params.id}, ${vault_doc_id}, ${req.saasUser?.email || "user"})
        RETURNING *
      `);
      return res.json(row.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/saas-tender/bid-sections/:sectionId/evidence/:evidenceId", authenticateSaasUser, async (req: any, res) => {
    try {
      // Org-scoped: only delete when the parent section belongs to the caller's org.
      await db.execute(sql`
        DELETE FROM bid_section_evidence
        WHERE id = ${req.params.evidenceId}
          AND section_id IN (
            SELECT id FROM saas_tender_bid_sections
            WHERE id = ${req.params.sectionId} AND org_id = ${req.saasUser.orgId}
          )
      `);
      res.json({ message: "Removed" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });
}
