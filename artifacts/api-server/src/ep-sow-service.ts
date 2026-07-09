// EP Agent — Statement of Work generator.
// Calls Claude for bespoke SOW + Chief-of-Staff quality review, then renders a
// burgundy-branded PDF via pdfkit and persists to ep_client_signatures.

import { db } from "./db";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";

const BURGUNDY = "#330311";
const BURGUNDY_ACCENT = "#7B2142";
const DARK_GREY = "#333333";
const MID_GREY = "#666666";
const LIGHT_GREY = "#999999";

const SOW_DIR = path.join(process.cwd(), "uploads", "ep-client", "sow");
if (!fs.existsSync(SOW_DIR)) fs.mkdirSync(SOW_DIR, { recursive: true });

// ─── Standard terms — never modified by AI ───────────────────────────────────
export const EP_STANDARD_TERMS = {
  deliverable_acceptance:
    "Each phase will be considered complete upon delivery of agreed outputs. The Client shall review and provide feedback within 5 working days of receipt. If no feedback is received within this period, deliverables will be deemed accepted.",
  ip:
    "All outputs, materials, and documentation produced as part of this engagement shall become the property of the Client upon full payment of agreed fees. Event Perfekt Global Ltd retains the right to reference the engagement for portfolio and case study purposes without disclosing confidential information.",
  confidentiality:
    "Both parties agree to keep all shared information confidential and not disclose it to third parties without prior written consent, except where required by law. This obligation survives termination for three years.",
  termination:
    "Either party may terminate this agreement with 14 days written notice. Fees for work completed up to the date of termination remain payable in full.",
  liability:
    "Event Perfekt Global Ltd will use reasonable endeavours to deliver all agreed outputs. Our total liability for any claim is limited to the total fees paid. We are not liable for indirect or consequential losses.",
  governing_law:
    "These Terms are governed by the laws of England and Wales. Any disputes are subject to the exclusive jurisdiction of the courts of England and Wales.",
  payment_terms:
    "All invoices are payable within 30 days of issue. Late payment may incur interest at 8% above the Bank of England base rate in accordance with the Late Payment of Commercial Debts Act 1998. All fees are exclusive of VAT unless stated otherwise.",
  change_control:
    "Any additional work outside the defined scope will be subject to a separate written agreement. Requests for changes must be submitted in writing. Event Perfekt will provide a written assessment of impact on timeline and cost within 5 working days.",
};

// ─── Types ───────────────────────────────────────────────────────────────────
export type SowDeliverable = {
  phase_number?: number;
  phase_name?: string;
  timeline?: string;
  purpose?: string;
  activities?: string[];
  deliverables?: string[];
  outcome?: string;
};

export type SowInput = {
  organisation_name: string;
  contact_name: string;
  contact_email?: string;
  engagement_type: string;
  package_selected?: string;
  project_description: string;
  deliverables?: SowDeliverable[];
  start_date?: string;
  end_date?: string;
  fee_amount?: number;
  fee_currency?: string;
  mobilisation_fee?: string | number;
  balance_fee?: string | number;
  client_id?: number;
  project_name?: string;
};

export type SowSection = { heading: string; content: string };
export type SowJson = {
  title: string;
  sections: SowSection[];
  generated_at: string;
};

export type SowReview = {
  score: number;
  strengths: string[];
  improvements: string[];
  missing: string[];
  recommendation: "Approve" | "Revise" | "Major revision needed" | string;
};

// ─── EP Agent AI helper ───────────────────────────────────────────────────────
async function claudeAI(systemPrompt: string, userPrompt: string, maxTokens = 6000): Promise<string> {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: userPrompt },
      ],
    }),
  });
  const data = (await response.json()) as any;
  if (data.error) throw new Error(data.error.message || "AI API error");
  return data.choices?.[0]?.message?.content || "";
}

// ─── Table bootstrap ─────────────────────────────────────────────────────────
export async function ensureSignaturesTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ep_client_signatures (
      id SERIAL PRIMARY KEY,
      client_id INTEGER,
      document_type TEXT NOT NULL,
      document_name TEXT NOT NULL,
      generated_content JSONB,
      review JSONB,
      document_url TEXT,
      status TEXT DEFAULT 'draft',
      signed_by TEXT,
      signed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// ─── Deliverable formatting for prompt ───────────────────────────────────────
function formatDeliverablesForPrompt(deliverables: SowDeliverable[] = []): string {
  if (!deliverables.length) return "(no deliverables provided — infer sensible phases from the package selected)";
  return deliverables
    .map((d, i) => {
      const num = d.phase_number ?? i + 1;
      const parts: string[] = [];
      parts.push(`PHASE ${num}: ${d.phase_name || "Untitled phase"}${d.timeline ? ` (${d.timeline})` : ""}`);
      if (d.purpose) parts.push(`Purpose: ${d.purpose}`);
      if (d.activities?.length) parts.push(`Activities:\n- ${d.activities.join("\n- ")}`);
      if (d.deliverables?.length) parts.push(`Deliverables:\n- ${d.deliverables.join("\n- ")}`);
      if (d.outcome) parts.push(`Outcome: ${d.outcome}`);
      return parts.join("\n");
    })
    .join("\n\n");
}

// ─── Generate SOW JSON via Claude ────────────────────────────────────────────
export async function generateSowJson(input: SowInput): Promise<SowJson> {
  const system = `You are EP Agent — a senior consultant at Event Perfekt Global Ltd. You are writing a professional Statement of Work for a new client engagement.

EVENT PERFEKT GLOBAL LTD CONTEXT:
Company No. 15875326
20 Wenlock Road, London, N1 7PG
info@eventperfekt.com
www.eventperfekt.com
Director: Tolu Johnson — Founder and Director
Specialisms: Programme delivery, strategic event management, consultancy, technology platforms

Write in professional consultancy language. Be specific to this client — never generic. Reference their actual situation and needs. The SOW should read as if written specifically for them — because it was.

OUTPUT FORMAT (STRICT):
Return ONLY valid JSON (no markdown code fences, no preamble) in this exact shape:
{
  "title": "Statement of Work — [Organisation] — [Project]",
  "sections": [
    { "heading": "1. Background", "content": "..." },
    { "heading": "2. Objective", "content": "..." },
    { "heading": "3. Scope of Work", "content": "..." },
    { "heading": "4. Methodology", "content": "..." },
    { "heading": "5. Team and Responsibilities", "content": "..." },
    { "heading": "6. Deliverable Acceptance", "content": "..." },
    { "heading": "7. Assumptions", "content": "..." },
    { "heading": "8. Change Control", "content": "..." },
    { "heading": "9. Intellectual Property", "content": "..." },
    { "heading": "10. Confidentiality", "content": "..." },
    { "heading": "11. Commercial Terms", "content": "..." },
    { "heading": "12. Governing Law", "content": "..." }
  ],
  "generated_at": "<ISO8601>"
}

Rules for each section:
1. Background: explain why THIS client needs THIS engagement using the project description. Be specific.
2. Objective: what the engagement will achieve for this client specifically.
3. Scope of Work: list all phases with their deliverables exactly as provided — format each phase with name + timeline + purpose + activities + deliverables + outcome. Use line breaks (\\n) for readability.
4. Methodology: tailor to engagement type (event: venue sourcing/logistics/delivery; consultancy: define/design/enable; government programme: discovery/design/delivery/evaluation).
5. Team and Responsibilities: Event Perfekt responsibilities vs. Client responsibilities, clearly separated.
6. Deliverable Acceptance: use the standard clause provided in commercial terms below — 5 working day review window, deemed accepted if no response.
7. Assumptions: 3–5 specific assumptions tailored to this engagement.
8. Change Control: use the standard clause verbatim.
9. Intellectual Property: use the standard clause verbatim — client owns on full payment.
10. Confidentiality: use the standard clause verbatim — 3 years.
11. Commercial Terms: state the fee, payment structure (mobilisation + balance), 30-day invoice terms, 8% above BoE base rate for late payment.
12. Governing Law: England and Wales.

STANDARD CLAUSES (use verbatim where indicated):
- Deliverable Acceptance: "${EP_STANDARD_TERMS.deliverable_acceptance}"
- IP: "${EP_STANDARD_TERMS.ip}"
- Confidentiality: "${EP_STANDARD_TERMS.confidentiality}"
- Termination: "${EP_STANDARD_TERMS.termination}"
- Liability: "${EP_STANDARD_TERMS.liability}"
- Governing Law: "${EP_STANDARD_TERMS.governing_law}"
- Payment Terms: "${EP_STANDARD_TERMS.payment_terms}"
- Change Control: "${EP_STANDARD_TERMS.change_control}"`;

  const currency = input.fee_currency || "GBP";
  const feeStr = input.fee_amount != null ? `${currency === "GBP" ? "£" : currency + " "}${input.fee_amount.toLocaleString()}` : "TBC";
  const mobStr = input.mobilisation_fee != null ? String(input.mobilisation_fee) : "50% on signature";
  const balStr = input.balance_fee != null ? String(input.balance_fee) : "50% on final deliverable";

  const userPrompt = `CLIENT DETAILS:
Organisation: ${input.organisation_name}
Contact: ${input.contact_name}${input.contact_email ? ` (${input.contact_email})` : ""}
Engagement type: ${input.engagement_type}
Package: ${input.package_selected || "Custom"}
Description of need: ${input.project_description}
Start date: ${input.start_date || "TBC"}
End date: ${input.end_date || "TBC"}
Fee: ${feeStr}
Mobilisation: ${mobStr}
Balance: ${balStr}

DELIVERABLES BY PHASE:
${formatDeliverablesForPrompt(input.deliverables)}

Now write the full Statement of Work as JSON per the schema.`;

  const raw = await claudeAI(system, userPrompt, 6000);
  const json = safeParseJson(raw);
  if (!json || !Array.isArray(json.sections)) {
    throw new Error("EP Agent returned invalid SOW JSON");
  }
  if (!json.generated_at) json.generated_at = new Date().toISOString();
  return json as SowJson;
}

// ─── Chief of Staff auto-review ──────────────────────────────────────────────
export async function reviewSow(sow: SowJson, input: SowInput): Promise<SowReview> {
  const system = `You are EP Agent Chief of Staff reviewing a Statement of Work before it goes to a client. Score this SOW out of 100. Check: Is it specific to this client or generic? Are the deliverables clear and measurable? Is the commercial section complete? Is the language professional? Are there any gaps or risks? What would make this stronger?

Return ONLY valid JSON (no markdown) in this exact shape:
{
  "score": 0-100,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "missing": ["..."],
  "recommendation": "Approve" | "Revise" | "Major revision needed"
}`;

  const userPrompt = `CLIENT: ${input.organisation_name} (${input.contact_name})
ENGAGEMENT: ${input.engagement_type} — ${input.package_selected || "Custom"}
BRIEF: ${input.project_description}

SOW DRAFT (JSON):
${JSON.stringify(sow, null, 2)}

Review this SOW and return the JSON assessment.`;

  const raw = await claudeAI(system, userPrompt, 2000);
  const json = safeParseJson(raw);
  if (!json || typeof json.score !== "number") {
    return {
      score: 70,
      strengths: ["SOW generated"],
      improvements: ["Automated review unavailable — please read carefully before sending"],
      missing: [],
      recommendation: "Revise",
    };
  }
  return json as SowReview;
}

// ─── Revise a section via Claude ─────────────────────────────────────────────
export async function reviseSow(sow: SowJson, instruction: string, input: SowInput): Promise<SowJson> {
  const system = `You are EP Agent revising a Statement of Work per the director's instruction.
Return ONLY the full updated SOW as JSON in the same schema as before. Preserve section numbering and headings. Only change what the instruction asks for.`;
  const userPrompt = `CURRENT SOW:
${JSON.stringify(sow, null, 2)}

CLIENT CONTEXT:
Organisation: ${input.organisation_name}
Engagement: ${input.engagement_type}
Brief: ${input.project_description}

DIRECTOR INSTRUCTION:
${instruction}

Return the revised SOW as JSON.`;
  const raw = await claudeAI(system, userPrompt, 6000);
  const json = safeParseJson(raw);
  if (!json || !Array.isArray(json.sections)) throw new Error("Revision returned invalid JSON");
  json.generated_at = new Date().toISOString();
  return json as SowJson;
}

function safeParseJson(raw: string): any | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try to salvage by extracting the first {...} block
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

// ─── PDF rendering ───────────────────────────────────────────────────────────
function slugify(s: string): string {
  return (s || "client").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

function drawPageHeader(doc: PDFKit.PDFDocument, pageNum: number) {
  if (pageNum === 1) {
    const top = 42;
    // Logo placeholder block (image may not be present at path) — simple burgundy square
    doc.save();
    doc.roundedRect(50, top, 90, 90, 8).fill(BURGUNDY);
    doc.fillColor("#E2C87A").font("Helvetica-Bold").fontSize(32).text("EP", 50, top + 28, { width: 90, align: "center" });
    doc.restore();

    const rightX = 300;
    doc.fillColor(DARK_GREY).font("Helvetica-Bold").fontSize(11).text("Event Perfekt Global Ltd", rightX, top, { width: 250, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor(MID_GREY)
      .text("20 Wenlock Road, London, N1 7PG", rightX, top + 16, { width: 250, align: "right" })
      .text("Company No. 15875326", rightX, top + 30, { width: 250, align: "right" })
      .text("info@eventperfekt.com  www.eventperfekt.com", rightX, top + 44, { width: 250, align: "right" });

    doc.moveTo(50, top + 110).lineTo(545, top + 110).lineWidth(2).strokeColor(BURGUNDY).stroke();
  }
}

function drawPageFooter(doc: PDFKit.PDFDocument, pageNum: number, totalPages: number) {
  const y = doc.page.height - 40;
  doc.save();
  doc.fillColor(LIGHT_GREY).font("Helvetica").fontSize(8)
    .text("Event Perfekt Global Ltd — CONFIDENTIAL", 50, y, { width: 250, align: "left", lineBreak: false });
  doc.text(`Page ${pageNum} of ${totalPages}`, 300, y, { width: 245, align: "right", lineBreak: false });
  doc.restore();
}

export async function renderSowPdf(sow: SowJson, input: SowInput, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 60, left: 50, right: 50 }, bufferPages: true });
      const stream = fs.createWriteStream(outPath);
      doc.pipe(stream);

      // Page 1 header
      drawPageHeader(doc, 1);
      doc.y = 180;

      // Title block
      doc.fillColor(BURGUNDY).font("Helvetica-Bold").fontSize(22).text("STATEMENT OF WORK", { align: "center" });
      doc.moveDown(0.3);
      doc.fillColor(DARK_GREY).font("Helvetica-Bold").fontSize(14).text(input.organisation_name, { align: "center" });
      if (input.project_name || input.package_selected) {
        doc.moveDown(0.2);
        doc.font("Helvetica").fontSize(12).fillColor(MID_GREY)
          .text(input.project_name || input.package_selected || "", { align: "center" });
      }
      doc.moveDown(0.3);
      const today = new Date().toISOString().split("T")[0];
      doc.font("Helvetica").fontSize(10).fillColor(MID_GREY).text(today, { align: "center" });

      doc.moveDown(1.5);
      doc.fontSize(10).fillColor(DARK_GREY)
        .text(`Prepared by: Tolu Johnson, Event Perfekt Global Ltd`, { align: "left" })
        .text(`Prepared for: ${input.contact_name}, ${input.organisation_name}`, { align: "left" });

      doc.moveDown(1.5);

      // Body sections
      for (const section of sow.sections) {
        // Soft page break if low space
        if (doc.y > doc.page.height - 180) doc.addPage();
        doc.font("Helvetica-Bold").fontSize(12).fillColor(BURGUNDY).text(section.heading, { align: "left" });
        doc.moveDown(0.3);
        doc.font("Helvetica").fontSize(10).fillColor(DARK_GREY).text(section.content || "", {
          align: "left",
          lineGap: 3,
          paragraphGap: 6,
        });
        doc.moveDown(0.8);
      }

      // Signature page
      doc.addPage();
      doc.fillColor(BURGUNDY).font("Helvetica-Bold").fontSize(18).text("Agreement and Signatures", { align: "left" });
      doc.moveDown(0.4);
      doc.font("Helvetica").fontSize(10).fillColor(MID_GREY)
        .text("By signing below both parties confirm their agreement to this Statement of Work and the accompanying terms.", { align: "left" });
      doc.moveDown(2);

      const colW = 230;
      const leftX = 50;
      const rightX = 315;
      const startY = doc.y;

      const drawSigBlock = (x: number, y: number, title: string, lines: Array<{ label: string; value: string }>) => {
        doc.font("Helvetica-Bold").fontSize(11).fillColor(BURGUNDY).text(title, x, y, { width: colW });
        let cy = y + 20;
        for (const l of lines) {
          doc.font("Helvetica-Bold").fontSize(9).fillColor(MID_GREY).text(l.label, x, cy, { width: colW });
          doc.font("Helvetica").fontSize(10).fillColor(DARK_GREY).text(l.value || "________________", x, cy + 12, { width: colW });
          cy += 38;
        }
      };

      drawSigBlock(leftX, startY, "Event Perfekt Global Ltd", [
        { label: "NAME", value: "Tolu Johnson" },
        { label: "TITLE", value: "Founder and Director" },
        { label: "SIGNATURE", value: "________________" },
        { label: "DATE", value: "________________" },
      ]);

      drawSigBlock(rightX, startY, input.organisation_name, [
        { label: "NAME", value: input.contact_name },
        { label: "TITLE", value: "________________" },
        { label: "SIGNATURE", value: "________________" },
        { label: "DATE", value: "________________" },
      ]);

      // Page numbers footer
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        drawPageFooter(doc, i + 1, range.count);
      }

      doc.end();
      stream.on("finish", () => resolve());
      stream.on("error", reject);
    } catch (e) {
      reject(e);
    }
  });
}

// ─── HTML preview renderer ───────────────────────────────────────────────────
export function renderSowHtml(sow: SowJson, input: SowInput): string {
  const esc = (s: string) => (s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string)).replace(/\n/g, "<br/>");
  const sectionsHtml = sow.sections
    .map(
      s => `<section style="margin-bottom:22px;">
    <h3 style="color:${BURGUNDY};font-size:14px;font-weight:700;margin:0 0 8px 0;">${esc(s.heading)}</h3>
    <div style="color:${DARK_GREY};font-size:13px;line-height:1.55;">${esc(s.content)}</div>
  </section>`
    )
    .join("\n");
  return `<div style="font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:40px;background:#fff;color:${DARK_GREY};">
  <header style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${BURGUNDY};padding-bottom:18px;margin-bottom:28px;">
    <div style="width:80px;height:80px;background:${BURGUNDY};border-radius:8px;color:#E2C87A;font-weight:800;font-size:28px;text-align:center;line-height:80px;">EP</div>
    <div style="text-align:right;font-size:11px;color:${MID_GREY};">
      <div style="font-weight:700;color:${DARK_GREY};font-size:12px;margin-bottom:4px;">Event Perfekt Global Ltd</div>
      20 Wenlock Road, London, N1 7PG<br/>Company No. 15875326<br/>info@eventperfekt.com · www.eventperfekt.com
    </div>
  </header>
  <h1 style="color:${BURGUNDY};font-size:24px;font-weight:800;margin:0 0 4px 0;text-align:center;">STATEMENT OF WORK</h1>
  <div style="text-align:center;color:${DARK_GREY};font-weight:700;font-size:15px;">${esc(input.organisation_name)}</div>
  <div style="text-align:center;color:${MID_GREY};font-size:12px;margin-top:4px;">${esc(input.project_name || input.package_selected || "")}</div>
  <div style="text-align:center;color:${MID_GREY};font-size:11px;margin:6px 0 18px 0;">${new Date().toISOString().split("T")[0]}</div>
  <div style="font-size:11px;color:${DARK_GREY};margin-bottom:24px;">
    <div>Prepared by: Tolu Johnson, Event Perfekt Global Ltd</div>
    <div>Prepared for: ${esc(input.contact_name)}, ${esc(input.organisation_name)}</div>
  </div>
  ${sectionsHtml}
  <footer style="margin-top:36px;border-top:1px solid #ddd;padding-top:14px;font-size:10px;color:${LIGHT_GREY};text-align:center;">
    Event Perfekt Global Ltd — CONFIDENTIAL
  </footer>
</div>`;
}

// ─── Orchestrator: generate + review + PDF + persist ─────────────────────────
export type GenerateSowResult = {
  id: number;
  sow_text: SowJson;
  pdf_url: string;
  preview_html: string;
  review: SowReview;
};

export async function generateAndPersistSow(input: SowInput): Promise<GenerateSowResult> {
  await ensureSignaturesTable();

  const sow = await generateSowJson(input);
  const review = await reviewSow(sow, input).catch(() => ({
    score: 75,
    strengths: ["SOW generated"],
    improvements: ["Automated review unavailable"],
    missing: [],
    recommendation: "Revise" as const,
  }));

  const ts = Date.now();
  const fileName = `SOW-${slugify(input.organisation_name)}-${ts}.pdf`;
  const outPath = path.join(SOW_DIR, fileName);
  await renderSowPdf(sow, input, outPath);

  const pdfUrl = `/uploads/ep-client/sow/${fileName}`;
  const previewHtml = renderSowHtml(sow, input);
  const today = new Date().toISOString().split("T")[0];
  const documentName = `SOW — ${input.organisation_name} — ${today}`;

  const inserted = await db.execute(sql`
    INSERT INTO ep_client_signatures (client_id, document_type, document_name, generated_content, review, document_url, status)
    VALUES (${input.client_id ?? null}, 'SOW', ${documentName}, ${JSON.stringify(sow)}::jsonb, ${JSON.stringify(review)}::jsonb, ${pdfUrl}, 'draft')
    RETURNING id
  `);
  const id = (inserted.rows[0] as any).id as number;

  return { id, sow_text: sow, pdf_url: pdfUrl, preview_html: previewHtml, review };
}

export async function reviseAndRegenerateSow(
  id: number,
  instruction: string,
  input: SowInput
): Promise<GenerateSowResult> {
  const existing = await db.execute(sql`SELECT generated_content FROM ep_client_signatures WHERE id = ${id} LIMIT 1`);
  if (!existing.rows.length) throw new Error("SOW not found");
  const current = (existing.rows[0] as any).generated_content as SowJson;

  const revised = await reviseSow(current, instruction, input);
  const review = await reviewSow(revised, input).catch(() => ({
    score: 75,
    strengths: [],
    improvements: ["Automated review unavailable"],
    missing: [],
    recommendation: "Revise" as const,
  }));

  const ts = Date.now();
  const fileName = `SOW-${slugify(input.organisation_name)}-${ts}.pdf`;
  const outPath = path.join(SOW_DIR, fileName);
  await renderSowPdf(revised, input, outPath);
  const pdfUrl = `/uploads/ep-client/sow/${fileName}`;
  const previewHtml = renderSowHtml(revised, input);

  await db.execute(sql`
    UPDATE ep_client_signatures
    SET generated_content = ${JSON.stringify(revised)}::jsonb,
        review = ${JSON.stringify(review)}::jsonb,
        document_url = ${pdfUrl},
        updated_at = NOW()
    WHERE id = ${id}
  `);

  return { id, sow_text: revised, pdf_url: pdfUrl, preview_html: previewHtml, review };
}
