/**
 * Tender Document Extractor — Phase 2
 * Parses uploaded tender pack files (PDF, DOCX, etc.) and extracts structured
 * facts using AI. Results are stored in saas_tender_pack_docs and
 * saas_tender_extracted_facts tables.
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import { generateViewUrl, getObject } from "./objectStorage";
import { computeOrgTags, pgTextArray } from "./tender-finder-service";

// ─── Types ─────────────────────────────────────────────────────────────────

export type DocumentType =
  | "itt"
  | "specification"
  | "pricing_schedule"
  | "terms_conditions"
  | "evaluation_criteria"
  | "questions_answers"
  | "response_template"
  | "background_doc"
  | "other";

export type FactType =
  | "deadline"
  | "requirement"
  | "evaluation_criterion"
  | "evaluation_weight"
  | "value"
  | "duration"
  | "lot_structure"
  | "eligibility"
  | "submission_format"
  | "contact"
  | "key_date"
  | "mandatory_pass_fail"
  | "social_value_requirement"
  | "red_flag"
  | "opportunity_signal";

interface ExtractedFact {
  fact_type: FactType;
  fact_label: string;
  fact_value: string;
  fact_metadata: Record<string, any>;
  page_reference: number | null;
  confidence: number;
}

interface ExtractionResult {
  facts: ExtractedFact[];
  summary: string;
  red_flags: string[];
  opportunities: string[];
}

// ─── AI helper (same pattern as saas-tender-routes) ────────────────────────

async function aiCall(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<string> {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No AI API key configured");
  const aiBaseURL = (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${aiBaseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: maxTokens,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: userPrompt },
      ],
    }),
  });
  const data = (await response.json()) as any;
  if (data.error) throw new Error(data.error.message || "AI error");
  return data.choices?.[0]?.message?.content || "";
}

// ─── Document text extraction ───────────────────────────────────────────────

async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return {
      text: result.text || "",
      pageCount: result.total || 0,
    };
  } catch (err: any) {
    console.error("[Extractor] PDF parse error:", err.message);
    return { text: "", pageCount: 0 };
  }
}

async function extractTextFromDocx(buffer: Buffer): Promise<{ text: string }> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value || "" };
  } catch (err: any) {
    console.error("[Extractor] DOCX parse error:", err.message);
    return { text: "" };
  }
}

async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<{ text: string; pageCount: number; wordCount: number }> {
  let text = "";
  let pageCount = 0;

  if (mimeType === "application/pdf") {
    const r = await extractTextFromPdf(buffer);
    text = r.text;
    pageCount = r.pageCount;
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const r = await extractTextFromDocx(buffer);
    text = r.text;
  } else {
    // Plain text, RTF, etc.
    text = buffer.toString("utf-8");
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return { text, pageCount, wordCount };
}

// ─── AI classification ──────────────────────────────────────────────────────

async function classifyDocument(firstChars: string): Promise<DocumentType> {
  const types: DocumentType[] = [
    "itt",
    "specification",
    "pricing_schedule",
    "terms_conditions",
    "evaluation_criteria",
    "questions_answers",
    "response_template",
    "background_doc",
    "other",
  ];
  try {
    const raw = await aiCall(
      "You are classifying procurement documents. Respond with ONLY one of these exact strings, no markdown: " +
        types.join(", "),
      `Classify this document based on its content:\n\n${firstChars.slice(0, 2000)}`
    );
    const cleaned = raw.trim().toLowerCase().replace(/[^a-z_]/g, "") as DocumentType;
    return types.includes(cleaned) ? cleaned : "other";
  } catch {
    return "other";
  }
}

// ─── AI fact extraction ─────────────────────────────────────────────────────

const FACT_EXTRACTION_SYSTEM = `You are a bid compliance analyst working for Event Perfekt Group, a UK consultancy bidding for government and international development contracts.
Your role is to extract EVERY structured fact from tender documents that is relevant to writing a winning bid.
Pay particular attention to RESPONSE GUIDELINES — these tell us how the bid must be written and are mandatory:
- Word / character / page limits (overall AND per question/section). Capture each as a "submission_format" fact with fact_label like "Word limit — Method Statement 1" and put the numeric limit in fact_metadata e.g. {"word_limit": 1000} or {"page_limit": 2} or {"char_limit": 5000}.
- Required formatting (font, font size, line spacing, margins, file format, naming convention) — capture as "submission_format" facts.
- Each question/criterion the response must answer, with its scoring weight — capture as "evaluation_criterion" with fact_metadata {"weight": <number>} where stated.
Return ONLY valid JSON — no markdown, no commentary.`;

const FACT_EXTRACTION_SCHEMA = `{
  "facts": [
    {
      "fact_type": "deadline|requirement|evaluation_criterion|evaluation_weight|value|duration|lot_structure|eligibility|submission_format|contact|key_date|mandatory_pass_fail|social_value_requirement|red_flag|opportunity_signal",
      "fact_label": "human-readable label e.g. 'Submission deadline' or 'Mandatory ISO 27001 certification'",
      "fact_value": "the actual value or description",
      "fact_metadata": { "any extra type-specific fields e.g. weight, scoring_method, pass_mark, lot_number" },
      "page_reference": null or integer page number,
      "confidence": 0-100
    }
  ],
  "summary": "one paragraph plain-English summary of the document",
  "red_flags": ["list of concerning items e.g. unrealistic timelines, ambiguous scope, exclusionary criteria, onerous insurance requirements"],
  "opportunities": ["list of items that play to EP strengths e.g. Africa delivery, programme management, stakeholder engagement, event production"]
}`;

async function extractFacts(text: string, docType: DocumentType): Promise<ExtractionResult> {
  const MAX_CHARS = 50000;
  const chunks: string[] = [];

  if (text.length <= MAX_CHARS) {
    chunks.push(text);
  } else {
    for (let i = 0; i < text.length; i += MAX_CHARS) {
      chunks.push(text.slice(i, i + MAX_CHARS));
    }
  }

  const allFacts: ExtractedFact[] = [];
  const allRedFlags: string[] = [];
  const allOpportunities: string[] = [];
  let combinedSummary = "";

  for (let i = 0; i < chunks.length; i++) {
    const chunkLabel = chunks.length > 1 ? `(Section ${i + 1} of ${chunks.length})` : "";
    const prompt = `Analyse this tender document ${chunkLabel} and extract structured facts. Return ONLY valid JSON matching this exact schema:\n${FACT_EXTRACTION_SCHEMA}\n\nDocument type: ${docType}\n\nDocument content:\n${chunks[i]}`;
    try {
      const raw = await aiCall(FACT_EXTRACTION_SYSTEM, prompt, 4000);
      const jsonStr = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      const parsed = JSON.parse(jsonStr) as ExtractionResult;
      allFacts.push(...(parsed.facts || []));
      allRedFlags.push(...(parsed.red_flags || []));
      allOpportunities.push(...(parsed.opportunities || []));
      if (!combinedSummary && parsed.summary) combinedSummary = parsed.summary;
    } catch (err: any) {
      console.error(`[Extractor] Fact extraction chunk ${i} failed:`, err.message);
    }
  }

  return {
    facts: allFacts,
    summary: combinedSummary,
    red_flags: [...new Set(allRedFlags)],
    opportunities: [...new Set(allOpportunities)],
  };
}

// ─── Main extraction pipeline ───────────────────────────────────────────────

export async function extractTenderDocument(docId: number): Promise<void> {
  let doc: any;
  try {
    const r = await db.execute(sql`SELECT * FROM saas_tender_pack_docs WHERE id = ${docId}`);
    if (r.rows.length === 0) {
      console.error(`[Extractor] Doc ${docId} not found`);
      return;
    }
    doc = r.rows[0] as any;
  } catch (err: any) {
    console.error(`[Extractor] Failed to fetch doc ${docId}:`, err.message);
    return;
  }

  // Mark as processing
  await db.execute(sql`
    UPDATE saas_tender_pack_docs SET extraction_status = 'processing' WHERE id = ${docId}
  `).catch(() => {});

  try {
    // Download the file from object storage
    const fileBuffer = await getObject(doc.storage_key);

    // Extract text
    const { text, pageCount, wordCount } = await extractText(fileBuffer, doc.mime_type);
    if (!text || text.trim().length < 50) {
      throw new Error("Extracted text is empty or too short — file may be scanned/image-only");
    }

    // Store extracted text + counts immediately
    await db.execute(sql`
      UPDATE saas_tender_pack_docs
      SET extracted_text = ${text}, page_count = ${pageCount}, word_count = ${wordCount}
      WHERE id = ${docId}
    `);

    // Classify document type if it's still "other"
    let docType: DocumentType = (doc.document_type as DocumentType) || "other";
    if (docType === "other") {
      docType = await classifyDocument(text);
      await db.execute(sql`UPDATE saas_tender_pack_docs SET document_type = ${docType} WHERE id = ${docId}`);
    }

    // Extract structured facts
    const result = await extractFacts(text, docType);

    // Delete old facts for this doc (retry scenario)
    await db.execute(sql`DELETE FROM saas_tender_extracted_facts WHERE document_id = ${docId}`);

    // Insert new facts
    for (const fact of result.facts) {
      try {
        await db.execute(sql`
          INSERT INTO saas_tender_extracted_facts
            (tender_id, document_id, fact_type, fact_label, fact_value, fact_metadata, page_reference, confidence_score)
          VALUES
            (${doc.tender_id}, ${docId}, ${fact.fact_type}, ${fact.fact_label}, ${fact.fact_value},
             ${JSON.stringify(fact.fact_metadata || {})}::jsonb, ${fact.page_reference}, ${Math.min(100, Math.max(0, fact.confidence || 0))})
        `);
      } catch (err: any) {
        console.error("[Extractor] Failed to insert fact:", err.message, fact);
      }
    }

    // Build extraction_summary JSONB
    const summary = {
      summary: result.summary,
      red_flags: result.red_flags,
      opportunities: result.opportunities,
      fact_count: result.facts.length,
      extracted_at: new Date().toISOString(),
    };

    // Mark doc as extracted
    await db.execute(sql`
      UPDATE saas_tender_pack_docs
      SET extraction_status = 'extracted',
          extracted_at = NOW(),
          extraction_error = NULL,
          extraction_summary = ${JSON.stringify(summary)}::jsonb
      WHERE id = ${docId}
    `);

    // ── Deadline backfill (Piece 2E) ─────────────────────────────────────
    const deadlineFacts = result.facts.filter(
      f => f.fact_type === "deadline" && f.confidence >= 75 && f.fact_value
    );
    if (deadlineFacts.length > 0) {
      // Parse and find the latest high-confidence deadline
      const parsedDates = deadlineFacts
        .map(f => new Date(f.fact_value))
        .filter(d => !isNaN(d.getTime()) && d > new Date());
      if (parsedDates.length > 0) {
        parsedDates.sort((a, b) => b.getTime() - a.getTime());
        const bestDeadline = parsedDates[0].toISOString().split("T")[0];
        await db.execute(sql`
          UPDATE saas_tenders
          SET deadline = ${bestDeadline}
          WHERE id = ${doc.tender_id}
            AND (deadline IS NULL OR deadline < ${bestDeadline}::date)
        `);
      }
    }

    // ── Value backfill ────────────────────────────────────────────────────
    const valueFact = result.facts.find(f => f.fact_type === "value" && f.confidence >= 70);
    if (valueFact) {
      const numericValue = parseFloat(valueFact.fact_value.replace(/[^0-9.]/g, ""));
      if (!isNaN(numericValue) && numericValue > 0) {
        await db.execute(sql`
          UPDATE saas_tenders
          SET value_amount = ${numericValue}, value_text = ${valueFact.fact_value}
          WHERE id = ${doc.tender_id} AND (value_amount IS NULL OR value_amount = 0)
        `);
      }
    }

    // ── Requirements backfill (Piece 2F) ─────────────────────────────────
    const reqFacts = result.facts.filter(
      f => f.fact_type === "requirement" || f.fact_type === "evaluation_criterion" || f.fact_type === "mandatory_pass_fail"
    );
    if (reqFacts.length > 0) {
      // Get the org_id from the tender
      const tenderRow = await db.execute(sql`SELECT org_id FROM saas_tenders WHERE id = ${doc.tender_id}`);
      const orgId = (tenderRow.rows[0] as any)?.org_id;
      if (orgId) {
        let sortOrder = 0;
        for (const rf of reqFacts) {
          const reqType =
            rf.fact_type === "mandatory_pass_fail" ? "mandatory"
            : rf.fact_type === "evaluation_criterion" ? "evaluation"
            : "mandatory";
          try {
            await db.execute(sql`
              INSERT INTO saas_tender_requirements (org_id, tender_id, requirement_type, description, sort_order)
              VALUES (${orgId}, ${doc.tender_id}, ${reqType}, ${rf.fact_label + ": " + rf.fact_value}, ${sortOrder++})
              ON CONFLICT DO NOTHING
            `);
          } catch {}
        }
      }
    }

    // ── Update tender document count ──────────────────────────────────────
    await db.execute(sql`
      UPDATE saas_tenders SET
        documents_uploaded_count = (SELECT COUNT(*) FROM saas_tender_pack_docs WHERE tender_id = ${doc.tender_id} AND deleted_at IS NULL),
        last_document_uploaded_at = NOW()
      WHERE id = ${doc.tender_id}
    `);

    // ── Mark extraction_complete if all docs are done ─────────────────────
    const pendingDocs = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM saas_tender_pack_docs
      WHERE tender_id = ${doc.tender_id}
        AND deleted_at IS NULL
        AND extraction_status NOT IN ('extracted', 'failed')
    `);
    if ((pendingDocs.rows[0] as any)?.cnt == 0) {
      await db.execute(sql`UPDATE saas_tenders SET extraction_complete = TRUE WHERE id = ${doc.tender_id}`);

      // Re-evaluate org tags using richer extracted text
      const tenderRow = await db.execute(sql`
        SELECT title, buyer, description FROM saas_tenders WHERE id = ${doc.tender_id}
      `).catch(() => ({ rows: [] }));
      if (tenderRow.rows.length > 0) {
        const tr = tenderRow.rows[0] as any;
        // Build enriched description: original + all extracted text from pack docs
        const extractedTexts = await db.execute(sql`
          SELECT extracted_text FROM saas_tender_pack_docs
          WHERE tender_id = ${doc.tender_id} AND extracted_text IS NOT NULL AND deleted_at IS NULL
        `).catch(() => ({ rows: [] }));
        const richDesc = [tr.description || "", ...(extractedTexts.rows as any[]).map(r => r.extracted_text || "")]
          .join(" ").slice(0, 8000);
        const tags = computeOrgTags({ title: tr.title, buyer: tr.buyer, description: richDesc });
        await db.execute(sql`
          UPDATE saas_tenders SET
            ep_relevant = ${tags.ep_relevant}, ep_relevance_score = ${tags.ep_relevance_score},
            ep_matched_keywords = ${pgTextArray(tags.ep_matched_keywords)}::text[],
            alli_relevant = ${tags.alli_relevant}, alli_relevance_score = ${tags.alli_relevance_score},
            alli_matched_keywords = ${pgTextArray(tags.alli_matched_keywords)}::text[],
            pmo_relevant = ${tags.pmo_relevant}, pmo_relevance_score = ${tags.pmo_relevance_score},
            pmo_matched_keywords = ${pgTextArray(tags.pmo_matched_keywords)}::text[]
          WHERE id = ${doc.tender_id}
        `).catch(() => {});
        console.log(`[Extractor] Org tags re-evaluated for tender ${doc.tender_id}: EP=${tags.ep_relevant}(${tags.ep_relevance_score}) ALLI=${tags.alli_relevant}(${tags.alli_relevance_score}) PMO=${tags.pmo_relevant}(${tags.pmo_relevance_score})`);
      }
    }

    console.log(`[Extractor] Doc ${docId} extracted: ${result.facts.length} facts, summary=${result.summary?.slice(0, 60)}`);
  } catch (err: any) {
    console.error(`[Extractor] Doc ${docId} failed:`, err.message);
    await db.execute(sql`
      UPDATE saas_tender_pack_docs
      SET extraction_status = 'failed', extraction_error = ${err.message}
      WHERE id = ${docId}
    `).catch(() => {});
  }
}

