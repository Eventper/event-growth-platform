// Compliance Matrix domain routes (win-engine, Phase 3+).
// The matrix is the spine of a winning bid: every ITT requirement is traced from
// the extracted facts → mapped to our evidence → marked Pass / Partial / Gap / Fail.
// Mandatory requirements gate submission (a non-compliant bid scores zero regardless
// of prose quality). This module is deterministic — it builds the matrix from facts
// the document extractor already produced; AI-assisted evidence matching is a later
// (premium/research-tier) layer on top.
//
// Org-scoping: saas_tender_extracted_facts has no org_id, so every endpoint first
// verifies the tender belongs to the caller's org before touching matrix rows.
import type { Express } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { authenticateSaasUser } from "../saas-tender-routes";

// Fact types that represent something the bid must satisfy.
const REQUIREMENT_FACT_TYPES = [
  "requirement",
  "eligibility",
  "evaluation_criterion",
  "submission_format",
  "mandatory_pass_fail",
  "social_value_requirement",
];
// Fact types that are pass/fail gates — miss one and the bid is disqualified.
const MANDATORY_FACT_TYPES = ["mandatory_pass_fail", "eligibility"];

async function assertTenderInOrg(tenderId: string, orgId: number | string): Promise<boolean> {
  const t = await db.execute(sql`SELECT id FROM saas_tenders WHERE id = ${tenderId} AND org_id = ${orgId}`);
  return t.rows.length > 0;
}

export function registerComplianceMatrixRoutes(app: Express) {
  // ─── Build / refresh the matrix from extracted ITT facts (idempotent) ────────
  // Existing rows are preserved (ON CONFLICT DO NOTHING) so manual status/evidence
  // edits survive a rebuild; only genuinely new requirements get appended.
  app.post("/api/saas-tender/compliance-matrix/:tenderId/build", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tenderId } = req.params;
      if (!(await assertTenderInOrg(tenderId, req.saasUser.orgId))) return res.status(404).json({ message: "Tender not found" });

      const facts = await db.execute(sql`
        SELECT id, fact_type, fact_label, fact_value, fact_metadata
        FROM saas_tender_extracted_facts
        WHERE tender_id = ${tenderId}
          AND fact_type = ANY(${REQUIREMENT_FACT_TYPES})
        ORDER BY id
      `);

      let inserted = 0;
      for (const f of facts.rows as any[]) {
        const requirement = (f.fact_value || f.fact_label || "").toString().trim();
        if (!requirement) continue;
        const isMandatory = MANDATORY_FACT_TYPES.includes(f.fact_type);
        const weight = Number(f.fact_metadata?.weight) || null;
        const result = await db.execute(sql`
          INSERT INTO saas_compliance_matrix (org_id, tender_id, fact_id, requirement, requirement_type, is_mandatory, weight)
          VALUES (${req.saasUser.orgId}, ${tenderId}, ${f.id}, ${requirement}, ${f.fact_type}, ${isMandatory}, ${weight})
          ON CONFLICT (tender_id, org_id, requirement) DO NOTHING
          RETURNING id
        `);
        if (result.rows.length) inserted += 1;
      }
      return res.json({ message: `Matrix built — ${inserted} new requirement(s) added`, inserted, scanned: facts.rows.length });
    } catch (error: any) { console.error("[compliance-build]", error?.stack || error); return res.status(500).json({ message: error.message }); }
  });

  // ─── List matrix rows for a tender ───────────────────────────────────────────
  app.get("/api/saas-tender/compliance-matrix/:tenderId", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tenderId } = req.params;
      if (!(await assertTenderInOrg(tenderId, req.saasUser.orgId))) return res.status(404).json({ message: "Tender not found" });
      const result = await db.execute(sql`
        SELECT * FROM saas_compliance_matrix
        WHERE tender_id = ${tenderId} AND org_id = ${req.saasUser.orgId}
        ORDER BY is_mandatory DESC, requirement_type, id
      `);
      return res.json(result.rows);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ─── Submission-readiness summary (the mandatory-gate the bid hinges on) ──────
  app.get("/api/saas-tender/compliance-matrix/:tenderId/summary", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tenderId } = req.params;
      if (!(await assertTenderInOrg(tenderId, req.saasUser.orgId))) return res.status(404).json({ message: "Tender not found" });
      const r = await db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'met')::int AS met,
          COUNT(*) FILTER (WHERE status = 'partial')::int AS partial,
          COUNT(*) FILTER (WHERE status = 'gap')::int AS gap,
          COUNT(*) FILTER (WHERE status = 'fail')::int AS fail,
          COUNT(*) FILTER (WHERE is_mandatory)::int AS mandatory_total,
          COUNT(*) FILTER (WHERE is_mandatory AND status IN ('gap','fail','partial'))::int AS mandatory_open
        FROM saas_compliance_matrix
        WHERE tender_id = ${tenderId} AND org_id = ${req.saasUser.orgId}
      `);
      const row = (r.rows[0] || {}) as any;
      return res.json({ ...row, submit_ready: (row.mandatory_open ?? 0) === 0 && (row.total ?? 0) > 0 });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ─── Update a row (status / evidence / owner / notes) ─────────────────────────
  app.patch("/api/saas-tender/compliance-matrix/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      const d = req.body;
      const result = await db.execute(sql`
        UPDATE saas_compliance_matrix SET
          status                = COALESCE(${d.status ?? null}, status),
          evidence_summary      = COALESCE(${d.evidence_summary ?? null}, evidence_summary),
          evidence_vault_doc_id = COALESCE(${d.evidence_vault_doc_id ?? null}, evidence_vault_doc_id),
          evidence_section_key  = COALESCE(${d.evidence_section_key ?? null}, evidence_section_key),
          owner                 = COALESCE(${d.owner ?? null}, owner),
          notes                 = COALESCE(${d.notes ?? null}, notes),
          updated_at            = NOW()
        WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}
        RETURNING *
      `);
      if (!result.rows.length) return res.status(404).json({ message: "Row not found" });
      return res.json(result.rows[0]);
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ─── Add a manual requirement row (for things the extractor missed) ──────────
  app.post("/api/saas-tender/compliance-matrix/:tenderId", authenticateSaasUser, async (req: any, res) => {
    try {
      const { tenderId } = req.params;
      if (!(await assertTenderInOrg(tenderId, req.saasUser.orgId))) return res.status(404).json({ message: "Tender not found" });
      const d = req.body;
      if (!d.requirement || !d.requirement.trim()) return res.status(400).json({ message: "Requirement text required" });
      const result = await db.execute(sql`
        INSERT INTO saas_compliance_matrix (org_id, tender_id, requirement, requirement_type, is_mandatory, weight, status, owner, notes)
        VALUES (${req.saasUser.orgId}, ${tenderId}, ${d.requirement.trim()}, ${d.requirement_type || "requirement"}, ${!!d.is_mandatory}, ${Number(d.weight) || null}, ${d.status || "gap"}, ${d.owner || null}, ${d.notes || null})
        ON CONFLICT (tender_id, org_id, requirement) DO NOTHING
        RETURNING *
      `);
      return res.json(result.rows[0] || { message: "Requirement already in matrix" });
    } catch (error: any) { return res.status(500).json({ message: error.message }); }
  });

  // ─── Delete a row ─────────────────────────────────────────────────────────────
  app.delete("/api/saas-tender/compliance-matrix/:id", authenticateSaasUser, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM saas_compliance_matrix WHERE id = ${req.params.id} AND org_id = ${req.saasUser.orgId}`);
      res.json({ message: "Deleted" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });
}
