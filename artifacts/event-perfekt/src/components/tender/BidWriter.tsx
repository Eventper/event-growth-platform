// Bid Writing view — tender selector, RFP input, ITT question answering, the 16
// bid-section drafting/scoring grid, the full-proposal builder, plus the
// Save-Lesson and Evidence-Picker modals. Extracted verbatim from
// saas-tender-dashboard.tsx's renderBidWriter() (Phase 3, Task 1). Behaviour is
// identical; the dashboard still owns the state and passes it in as props.
import { useState } from "react";
import {
  btn, card, input, label, BLUE, GOLD, BORDER, fmtDate,
  BID_SECTIONS, API, saasApiRequest, governanceStatusColor, governanceBadge,
  countWords, wordCountLabel, POPPINS_STACK,
} from "./ui";
import BidProse from "./BidProse";

export interface BidWriterProps {
  // state
  tenders: any[];
  selectedTenderForBid: any;
  tenderSections: any[];
  extractedFacts: any[];
  generatingAll16: boolean;
  scoringBid: boolean;
  generatingBid: boolean;
  tenderDetailsInput: string;
  questionsInput: string;
  answeringQuestions: boolean;
  questionsAnswer: string;
  analyzingGaps: boolean;
  showGapsPanel: boolean;
  bidGaps: any[];
  dismissedGaps: any[];
  sectionAttachedEvidence: Record<string, any[]>;
  generating: string | null;
  expandedWeakPoints: number | null;
  improvingSection: number | null;
  scoringConfidence: number | null;
  chatSection: any;
  chatHistory: any[];
  chatLoading: boolean;
  chatInput: string;
  proposalTitle: string;
  proposalContent: string;
  savingProposal: boolean;
  shareLink: string;
  showLessonModal: boolean;
  lessonModalSection: any;
  lessonForm: any;
  savingLesson: boolean;
  evidencePickerSection: any;
  loadingEvidence: boolean;
  evidenceSuggestions: any[];
  allVaultDocs: any[];
  attachingEvidence: number | null;
  // setters
  setSelectedTenderForBid: (v: any) => void;
  setSelectedTender: (v: any) => void;
  setTenderDetailsInput: (v: string) => void;
  setExtractedFacts: (v: any[]) => void;
  setPackDocs: (v: any[]) => void;
  setTenderSections: (v: any) => void;
  setQuestionsInput: (v: string) => void;
  setShowGapsPanel: (v: boolean) => void;
  setExpandedWeakPoints: (v: number | null) => void;
  setGovernanceActionModal: (v: any) => void;
  setActiveTab: (v: string) => void;
  setChatInput: (v: string) => void;
  setProposalTitle: (v: string) => void;
  setProposalContent: (v: string) => void;
  setShowLessonModal: (v: boolean) => void;
  setLessonForm: (updater: any) => void;
  setEvidencePickerSection: (v: any) => void;
  // handlers
  generateAll16Sections: () => void;
  scoreBid: () => void;
  generateBidWithAI: () => void;
  answerQuestions: () => void;
  showToast: (msg: string) => void;
  analyzeGaps: () => void;
  dismissGap: (id: any) => void;
  generateSection: (key: string, label: string) => void;
  openLessonModal: (section: any) => void;
  improveSection: (section: any) => void;
  scoreConfidence: (section: any) => void;
  openEvidencePicker: (section: any) => void;
  openChat: (section: any) => void;
  openSubmitModal: (section: any) => void;
  removeAttachedEvidence: (sectionId: any, evidenceId: any) => void;
  sendChatMessage: () => void;
  saveProposal: () => void;
  formatProposal: () => void;
  exportProposalAsPDF: () => void;
  copyShareLink: () => void;
  saveLessonFromSection: () => void;
  attachEvidence: (docId: any) => void;
}

export default function BidWriter(props: BidWriterProps) {
  const {
    tenders, selectedTenderForBid, tenderSections, extractedFacts, generatingAll16,
    scoringBid, generatingBid, tenderDetailsInput, questionsInput, answeringQuestions,
    questionsAnswer, analyzingGaps, showGapsPanel, bidGaps, dismissedGaps,
    sectionAttachedEvidence, generating, expandedWeakPoints, improvingSection,
    scoringConfidence, chatSection, chatHistory, chatLoading, chatInput, proposalTitle,
    proposalContent, savingProposal, shareLink, showLessonModal, lessonModalSection,
    lessonForm, savingLesson, evidencePickerSection, loadingEvidence, evidenceSuggestions,
    allVaultDocs, attachingEvidence,
    setSelectedTenderForBid, setSelectedTender, setTenderDetailsInput, setExtractedFacts,
    setPackDocs, setTenderSections, setQuestionsInput, setShowGapsPanel, setExpandedWeakPoints,
    setGovernanceActionModal, setActiveTab, setChatInput, setProposalTitle, setProposalContent,
    setShowLessonModal, setLessonForm, setEvidencePickerSection,
    generateAll16Sections, scoreBid, generateBidWithAI, answerQuestions, showToast,
    analyzeGaps, dismissGap, generateSection, openLessonModal, improveSection, scoreConfidence,
    openEvidencePicker, openChat, openSubmitModal, removeAttachedEvidence, sendChatMessage,
    saveProposal, formatProposal, exportProposalAsPDF, copyShareLink, saveLessonFromSection,
    attachEvidence,
  } = props;

  const [previewSection, setPreviewSection] = useState<number | null>(null);
  // Stage 4 (Bid/No-Bid) + Stage 6 (Integrity) results, run on demand for the selected tender.
  const [bidDecision, setBidDecision] = useState<any>(null);
  const [runningDecision, setRunningDecision] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<any>(null);
  const [runningIntegrity, setRunningIntegrity] = useState(false);

  const runBidNoBid = async () => {
    if (!tender) return;
    setRunningDecision(true); setBidDecision(null);
    try { setBidDecision(await saasApiRequest("POST", `${API}/bid-no-bid/${tender.id}`, {})); }
    catch (e: any) { showToast(e.message || "Bid/No-Bid failed"); }
    finally { setRunningDecision(false); }
  };
  const runIntegrityCheck = async () => {
    if (!tender) return;
    setRunningIntegrity(true); setIntegrityResult(null);
    try { setIntegrityResult(await saasApiRequest("POST", `${API}/integrity-check/${tender.id}`, {})); }
    catch (e: any) { showToast(e.message || "Integrity check failed"); }
    finally { setRunningIntegrity(false); }
  };

  const sectionMap: Record<string, any> = {};
  (tenderSections || []).forEach((s: any) => { sectionMap[s.section_key] = s; });
  const tender = selectedTenderForBid;

  // Response guidelines pulled from the uploaded ITT/RFI/brief — word limits,
  // formatting and scoring. Shown so the writer can see (and the draft can obey)
  // exactly what the tender asks for. A best-effort overall word limit is parsed
  // for the per-section word-count "n / limit" readout.
  const guidelineFacts = (extractedFacts || []).filter((f: any) =>
    ["submission_format", "evaluation_criterion", "evaluation_weight"].includes(f.fact_type));
  const wordLimit: number | null = (() => {
    for (const f of (extractedFacts || [])) {
      if (f.fact_type !== "submission_format") continue;
      const meta = f.fact_metadata || {};
      const m = Number(meta.word_limit) || 0;
      if (m > 0) return m;
      const txt = `${f.fact_label || ""} ${f.fact_value || ""}`;
      const wm = txt.match(/([\d,]{2,6})\s*words?/i);
      if (wm) return parseInt(wm[1].replace(/,/g, ""));
    }
    return null;
  })();
  return (
    <>
    <div style={{ display: "grid", gap: 24 }}>
      {/* Tender Selector */}
      <div style={{ ...card(), borderLeft: `4px solid ${BLUE}`, padding: 16 }}>
        <h2 style={{ color: "#fff", margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>📋 Select Tender from Pipeline</h2>
        <p style={{ color: "#94a3b8", margin: "0 0 12px", fontSize: 12 }}>Choose a tender to draft and manage all 16 bid sections</p>
        <select value={tender?.id || ""} onChange={async e => {
          const t = tenders.find(tn => tn.id === parseInt(e.target.value));
          setSelectedTenderForBid(t || null);
          setSelectedTender(t || null);
          setTenderDetailsInput("");
          setExtractedFacts([]);
          setPackDocs([]);
          if (t) {
            saasApiRequest("GET", `${API}/bid-sections/${t.id}`).then(secs => setTenderSections(secs)).catch(() => {});
            // Load tender pack facts so bid writer can use them
            try {
              const [pd, facts] = await Promise.all([
                saasApiRequest("GET", `${API}/tenders/${t.id}/documents`),
                saasApiRequest("GET", `${API}/tenders/${t.id}/facts`),
              ]);
              setPackDocs(Array.isArray(pd) ? pd : []);
              setExtractedFacts(Array.isArray(facts) ? facts : []);
            } catch {}
          }
        }} style={{ ...input(), cursor: "pointer", marginBottom: 8 }}>
          <option value="">Choose a tender from pipeline...</option>
          {tenders.map((t: any) => <option key={t.id} value={t.id}>{t.title} ({t.status})</option>)}
        </select>
        {tender && (
          <div style={{ padding: 12, background: "rgba(59,130,246,0.08)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#60a5fa", fontSize: 13, fontWeight: 600 }}>{tender.title}</div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{tender.buyer} · Deadline: {fmtDate(tender.deadline)} · {tender.country || "GB"}</div>
              {extractedFacts.length > 0 && (
                <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "2px 8px", fontSize: 11, color: "#10b981" }}>
                  🧠 {extractedFacts.length} facts from tender pack · intelligence is using them
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={generateAll16Sections} disabled={generatingAll16} style={{ ...btn(GOLD), color: "#000", fontWeight: 700, whiteSpace: "nowrap" }}>
                {generatingAll16 ? "⏳ Generating All 16..." : "✨ Generate All 16 Sections"}
              </button>
              <button onClick={scoreBid} disabled={scoringBid} style={{ ...btn("#6366f1"), color: "#fff", whiteSpace: "nowrap", fontWeight: 700 }}>
                {scoringBid ? "⏳ Scoring..." : "⭐ Score Bid"}
              </button>
              <button onClick={generateBidWithAI} disabled={generatingBid} style={{ ...btn("rgba(255,255,255,0.1)"), color: "#94a3b8", whiteSpace: "nowrap" }}>
                {generatingBid ? "Generating..." : "📝 Full Proposal"}
              </button>
              <button onClick={runBidNoBid} disabled={runningDecision} style={{ ...btn("rgba(16,185,129,0.15)"), color: "#34d399", border: "1px solid rgba(16,185,129,0.4)", whiteSpace: "nowrap", fontWeight: 700 }}>
                {runningDecision ? "⏳ Deciding..." : "⚖️ Bid / No-Bid"}
              </button>
              <button onClick={runIntegrityCheck} disabled={runningIntegrity} style={{ ...btn("rgba(239,68,68,0.12)"), color: "#f87171", border: "1px solid rgba(239,68,68,0.35)", whiteSpace: "nowrap", fontWeight: 700 }}>
                {runningIntegrity ? "⏳ Auditing..." : "🛡 Integrity Check"}
              </button>
            </div>
          </div>
        )}

        {/* Stage 4 — Bid/No-Bid recommendation */}
        {tender && bidDecision && (() => {
          const rec = String(bidDecision.recommendation || "UNKNOWN");
          const c = rec === "BID" ? "#10b981" : rec === "NO_BID" ? "#ef4444" : "#f59e0b";
          return (
            <div style={{ marginTop: 12, padding: 14, background: `${c}10`, border: `1px solid ${c}40`, borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: c }}>{rec.replace(/_/g, " ")}</span>
                {bidDecision.win_probability_band && <span style={{ fontSize: 11, color: "#94a3b8" }}>Win probability: <b style={{ color: "#e2e8f0" }}>{bidDecision.win_probability_band}%</b></span>}
              </div>
              {Array.isArray(bidDecision.reasons) && bidDecision.reasons.length > 0 && (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#cbd5e1", fontSize: 12, lineHeight: 1.6 }}>
                  {bidDecision.reasons.slice(0, 6).map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              )}
              {bidDecision.evidence_fit?.missing?.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#fca5a5" }}>Missing evidence: {bidDecision.evidence_fit.missing.join(" · ")}</div>
              )}
              {Array.isArray(bidDecision.conditions_to_close) && bidDecision.conditions_to_close.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#fcd34d" }}>To close: {bidDecision.conditions_to_close.join(" · ")}</div>
              )}
            </div>
          );
        })()}

        {/* Stage 6 — Integrity check verdict */}
        {tender && integrityResult && (() => {
          const ready = String(integrityResult.overall) === "READY";
          const c = ready ? "#10b981" : "#ef4444";
          const flags = Array.isArray(integrityResult.flags) ? integrityResult.flags : [];
          return (
            <div style={{ marginTop: 12, padding: 14, background: `${c}10`, border: `1px solid ${c}40`, borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: c }}>{ready ? "🛡 READY for submission" : "🛡 NOT READY — fix before submitting"}</div>
              {flags.length > 0 && (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {flags.slice(0, 12).map((f: any, i: number) => (
                    <div key={i} style={{ fontSize: 11, color: "#e2e8f0", padding: "6px 8px", background: "rgba(0,0,0,0.2)", borderRadius: 6, borderLeft: "3px solid #ef4444" }}>
                      <b style={{ color: "#fca5a5" }}>{f.check}:</b> {f.issue}{f.fix ? <span style={{ color: "#94a3b8" }}> — fix: {f.fix}</span> : null}
                    </div>
                  ))}
                </div>
              )}
              {Array.isArray(integrityResult.open_gaps) && integrityResult.open_gaps.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#fcd34d" }}>Open gaps: {integrityResult.open_gaps.join(" · ")}</div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Submission guidelines extracted from the ITT/RFI/brief */}
      {tender && guidelineFacts.length > 0 && (
        <div style={{ ...card(), borderLeft: `4px solid ${GOLD}`, padding: 16, fontFamily: POPPINS_STACK }}>
          <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>📐 Submission Guidelines (from the tender)</h2>
          <p style={{ color: "#94a3b8", margin: "0 0 12px", fontSize: 12 }}>Word limits, formatting and scoring extracted from the uploaded ITT/RFI/brief — the draft is written to obey these.</p>
          <div style={{ display: "grid", gap: 6 }}>
            {guidelineFacts.slice(0, 24).map((f: any, i: number) => {
              const isFmt = f.fact_type === "submission_format";
              const c = isFmt ? GOLD : "#a78bfa";
              return (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: `1px solid ${c}25` }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: c, background: `${c}1f`, borderRadius: 10, padding: "2px 7px", whiteSpace: "nowrap", flexShrink: 0, marginTop: 1 }}>
                    {isFmt ? "FORMAT" : "SCORING"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{f.fact_label}</div>
                    {f.fact_value && <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 1 }}>{f.fact_value}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RFP Input */}
      <div style={{ ...card(), padding: 16 }}>
        <h2 style={{ color: "#fff", margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>📝 RFP Details</h2>
        <p style={{ color: "#94a3b8", margin: "0 0 12px", fontSize: 12 }}>Paste tender brief to enrich section generation</p>
        <textarea value={tenderDetailsInput} onChange={e => setTenderDetailsInput(e.target.value)} style={{ ...input(), minHeight: 80 }} placeholder="Paste RFP requirements, scoring criteria, word limits, tender questions..." />

        {/* Answer Questions */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>❓ Answer ITT Questions</div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>Paste specific tender questions — EP Agent answers each one individually</div>
            </div>
            <button onClick={answerQuestions} disabled={answeringQuestions || !questionsInput.trim()} style={{ ...btn(GOLD), color: "#000", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
              {answeringQuestions ? "⏳ Answering..." : "✨ Answer Questions"}
            </button>
          </div>
          <textarea value={questionsInput} onChange={e => setQuestionsInput(e.target.value)} style={{ ...input(), minHeight: 70 }} placeholder="Q1: Describe your experience in event management...\nQ2: How will you meet our social value requirements?..." />
          {questionsAnswer && (
            <div style={{ marginTop: 12, padding: 14, background: "rgba(16,185,129,0.06)", border: `1px solid rgba(16,185,129,0.2)`, borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "#10b981", fontSize: 12, fontWeight: 700 }}>✓ Questions Answered</span>
                <button onClick={() => { navigator.clipboard.writeText(questionsAnswer); showToast("Copied"); }} style={{ ...btn("transparent"), color: "#10b981", fontSize: 11, padding: "4px 8px" }}>Copy</button>
              </div>
              <pre style={{ color: "#e2e8f0", fontSize: 12, whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.6 }}>{questionsAnswer}</pre>
            </div>
          )}
        </div>
      </div>

      {/* 16 Bid Sections */}
      <div style={{ ...card(), padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>📂 16 Bid Sections</h2>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: 12 }}>EP Agent drafts each section. Submit to Governance for review & approval before submission.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* E3: Analyze Gaps button */}
            {tender && (tenderSections || []).length > 0 && (
              <button onClick={analyzeGaps} disabled={analyzingGaps}
                style={{ ...btn(analyzingGaps ? "#374151" : "rgba(239,68,68,0.15)"), color: "#f87171", fontSize: 11, padding: "6px 12px", border: "1px solid rgba(239,68,68,0.3)" }}>
                {analyzingGaps ? "⏳ Analyzing..." : "🔍 Analyze Gaps"}
              </button>
            )}
            {tender && (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {(tenderSections || []).filter((s: any) => s.governance_status === "approved").length}/{BID_SECTIONS.length} approved
              </div>
            )}
          </div>
        </div>

        {/* E3: Gap analysis results panel */}
        {showGapsPanel && bidGaps.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: "#f87171", fontSize: 12, fontWeight: 700 }}>🔍 Gap Analysis — {bidGaps.filter(g => !dismissedGaps.includes(g.id)).length} open gaps</span>
              <button onClick={() => setShowGapsPanel(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {bidGaps.filter(g => !dismissedGaps.includes(g.id)).map((gap: any) => {
                const sevColor = gap.severity === "high" ? "#ef4444" : gap.severity === "medium" ? "#f59e0b" : "#94a3b8";
                return (
                  <div key={gap.id} style={{ padding: "8px 10px", background: "rgba(0,0,0,0.2)", borderRadius: 6, borderLeft: `3px solid ${sevColor}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 10, background: `${sevColor}20`, color: sevColor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{gap.severity?.toUpperCase()}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{gap.requirement}</div>
                      {gap.suggestion && <div style={{ color: "#94a3b8", fontSize: 10 }}>{gap.suggestion}</div>}
                    </div>
                    <button onClick={() => dismissGap(gap.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 11, flexShrink: 0, marginTop: 1 }}>✓ Resolve</button>
                  </div>
                );
              })}
              {bidGaps.filter(g => !dismissedGaps.includes(g.id)).length === 0 && (
                <div style={{ color: "#10b981", fontSize: 11, textAlign: "center", padding: "8px 0" }}>✓ All gaps resolved</div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {BID_SECTIONS.map((sec, i) => {
            const existing = sectionMap[sec.key];
            const status = existing?.governance_status || "not_submitted";
            const hasContent = !!existing?.content;
            const conf = existing?.overall_confidence ?? null;
            const isScored = !!existing?.last_scored_at;
            const confNum = conf ?? 0;
            const confColor = confNum >= 71 ? "#10b981" : confNum >= 41 ? "#f59e0b" : (conf !== null || isScored) ? "#ef4444" : "#475569";
            const confLabel = confNum >= 71 ? "Strong" : confNum >= 41 ? "Moderate" : (conf !== null || isScored) ? "Weak" : "Unscored";
            const citations: any[] = Array.isArray(existing?.citations) ? existing.citations : [];
            const weakPoints: string[] = Array.isArray(existing?.weak_points) ? existing.weak_points : [];
            const attachedDocs = sectionAttachedEvidence[existing?.id] || [];
            return (
              <div key={sec.key} style={{ border: `1px solid ${hasContent ? (isScored ? `${confColor}40` : "rgba(59,130,246,0.3)") : BORDER}`, borderRadius: 10, padding: 14, background: hasContent ? "rgba(59,130,246,0.04)" : "transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ color: "#475569", fontSize: 11, fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
                      <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{sec.label}</span>
                      {hasContent && (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: `${governanceStatusColor(status)}20`, color: governanceStatusColor(status), fontWeight: 600 }}>
                          {governanceBadge(status)}
                        </span>
                      )}
                      {/* E2: Confidence traffic light */}
                      {hasContent && isScored && (
                        <span title={`Coverage: ${existing.coverage_score}% | Evidence: ${existing.evidence_score}% | Voice: ${existing.voice_score}%`}
                          style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: `${confColor}20`, color: confColor, fontWeight: 700, cursor: "default", display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: confColor, display: "inline-block" }} />
                          {confLabel} {confNum}%
                        </span>
                      )}
                      {hasContent && (() => {
                        const n = countWords(existing.content);
                        const over = wordLimit ? n > wordLimit : false;
                        return <span style={{ fontSize: 10, color: over ? "#f87171" : "#475569", fontWeight: over ? 700 : 400 }} title={over ? "Over the tender's word limit" : ""}>{wordCountLabel(existing.content, wordLimit)}{over ? " ⚠" : ""}</span>;
                      })()}
                      {/* E1: Citation count chip */}
                      {citations.length > 0 && (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(99,102,241,0.15)", color: "#818cf8", fontWeight: 600 }}>
                          📎 {citations.length} citation{citations.length > 1 ? "s" : ""}
                        </span>
                      )}
                      {/* E4: Attached evidence count */}
                      {attachedDocs.length > 0 && (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 600 }}>
                          🗂 {attachedDocs.length} evidence
                        </span>
                      )}
                    </div>
                    {hasContent && (
                      <div style={{ color: "#64748b", fontSize: 11, marginLeft: 28, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {existing.content.slice(0, 200)}...
                      </div>
                    )}
                    {/* E2: Weak points panel */}
                    {hasContent && isScored && weakPoints.length > 0 && (
                      <div style={{ marginTop: 6, marginLeft: 28 }}>
                        <button onClick={() => setExpandedWeakPoints(expandedWeakPoints === existing.id ? null : existing.id)}
                          style={{ background: "none", border: "none", color: "#f59e0b", fontSize: 10, cursor: "pointer", padding: 0, fontWeight: 600 }}>
                          {expandedWeakPoints === existing.id ? "▲ Hide weak points" : `▼ ${weakPoints.length} weak point${weakPoints.length > 1 ? "s" : ""} to fix`}
                        </button>
                        {expandedWeakPoints === existing.id && (
                          <>
                            <p style={{ color: "#fbbf24", fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
                              {weakPoints.join(" · ")}
                            </p>
                            {/* E5: Save lesson button — only for red-scored sections */}
                            {confNum <= 40 && (
                              <button onClick={() => openLessonModal(existing)}
                                style={{ marginTop: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, color: "#f87171", fontSize: 10, padding: "5px 12px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                                🧠 Save lesson for future bids
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button onClick={() => generateSection(sec.key, sec.label)} disabled={generating === sec.key || generatingAll16} style={{ ...btn(generating === sec.key ? "#374151" : BLUE), color: "#fff", fontSize: 11, padding: "6px 12px" }}>
                      {generating === sec.key ? "..." : hasContent ? "Regenerate" : "Draft"}
                    </button>
                    {hasContent && (
                      <button onClick={() => improveSection(existing)} disabled={improvingSection === existing?.id} style={{ ...btn(improvingSection === existing?.id ? "#374151" : "#10b981"), color: "#fff", fontSize: 11, padding: "6px 12px" }}>
                        {improvingSection === existing?.id ? "⏳ Improving..." : "↑ Improve"}
                      </button>
                    )}
                    {/* E2: Score confidence button */}
                    {hasContent && (
                      <button onClick={() => scoreConfidence(existing)} disabled={scoringConfidence === existing.id}
                        style={{ ...btn(scoringConfidence === existing.id ? "#374151" : isScored ? `${confColor}30` : "rgba(255,255,255,0.06)"), color: isScored ? confColor : "#94a3b8", fontSize: 11, padding: "6px 12px", border: `1px solid ${isScored ? `${confColor}50` : BORDER}` }}>
                        {scoringConfidence === existing.id ? "⏳ Scoring..." : "◎ Score"}
                      </button>
                    )}
                    {/* E4: Evidence picker button */}
                    {hasContent && (
                      <button onClick={() => openEvidencePicker(existing)}
                        style={{ ...btn("rgba(245,158,11,0.1)"), color: "#f59e0b", fontSize: 11, padding: "6px 12px", border: "1px solid rgba(245,158,11,0.3)" }}>
                        🗂 Evidence
                      </button>
                    )}
                    {hasContent && (
                      <button onClick={() => setPreviewSection(previewSection === existing.id ? null : existing.id)} style={{ ...btn(previewSection === existing.id ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.06)"), color: previewSection === existing.id ? GOLD : "#94a3b8", fontSize: 11, padding: "6px 12px", border: `1px solid ${previewSection === existing.id ? "rgba(245,158,11,0.4)" : BORDER}` }}>
                        {previewSection === existing.id ? "✎ Edit" : "👁 Preview"}
                      </button>
                    )}
                    {hasContent && (
                      <button onClick={() => openChat(existing)} style={{ ...btn("rgba(124,58,237,0.15)"), color: "#a78bfa", fontSize: 11, padding: "6px 12px", border: "1px solid rgba(124,58,237,0.4)" }}>
                        💬 Review with EP Agent
                      </button>
                    )}
                    {hasContent && status === "not_submitted" && (
                      <button onClick={() => existing && openSubmitModal(existing)} style={{ ...btn("#6366f1"), color: "#fff", fontSize: 11, padding: "6px 12px" }}>
                        Submit →
                      </button>
                    )}
                    {hasContent && status === "awaiting_review" && (
                      <button onClick={() => { setGovernanceActionModal(existing); setActiveTab("governance"); }} style={{ ...btn("#f59e0b"), color: "#000", fontSize: 11, padding: "6px 12px" }}>
                        Review
                      </button>
                    )}
                    {hasContent && status === "approved" && (
                      <span style={{ fontSize: 11, color: "#10b981", padding: "6px 12px", fontWeight: 700 }}>✓ Approved</span>
                    )}
                  </div>
                </div>
                {hasContent && (
                  <div style={{ marginTop: 10, marginLeft: 28 }}>
                    {previewSection === existing.id ? (
                      <div style={{ padding: "14px 18px", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8 }}>
                        <BidProse content={existing.content} />
                      </div>
                    ) : (
                      <textarea defaultValue={existing.content} onBlur={async e => {
                        if (e.target.value !== existing.content) {
                          try {
                            await saasApiRequest("PATCH", `${API}/bid-sections/${existing.id}`, { content: e.target.value });
                            const secs = await saasApiRequest("GET", `${API}/bid-sections/${tender?.id}`);
                            setTenderSections(secs);
                          } catch {}
                        }
                      }} style={{ ...input(), minHeight: 100, fontSize: 14, fontFamily: POPPINS_STACK, lineHeight: 1.6 }} />
                    )}
                    {/* E1: Citations panel */}
                    {citations.length > 0 && (
                      <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(99,102,241,0.08)", borderRadius: 6, border: "1px solid rgba(99,102,241,0.2)" }}>
                        <div style={{ fontSize: 10, color: "#818cf8", fontWeight: 700, marginBottom: 5 }}>📎 Citations ({citations.length})</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {citations.map((c: any, ci: number) => {
                            const chipColor = c.type === "Doc" ? "#60a5fa" : c.type === "Vault" ? "#a78bfa" : c.type === "Win" ? "#34d399" : "#f87171";
                            const chipBg = c.type === "Doc" ? "rgba(96,165,250,0.1)" : c.type === "Vault" ? "rgba(167,139,250,0.1)" : c.type === "Win" ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)";
                            return (
                              <span key={ci} title={c.raw_marker}
                                style={{ fontSize: 10, padding: "2px 7px", borderRadius: 12, background: chipBg, color: chipColor, border: `1px solid ${chipColor}30`, cursor: "default" }}>
                                [{c.type}] {c.source}{c.page ? ` p.${c.page}` : ""}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* E4: Attached evidence list */}
                    {attachedDocs.length > 0 && (
                      <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(245,158,11,0.06)", borderRadius: 6, border: "1px solid rgba(245,158,11,0.2)" }}>
                        <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>🗂 Pinned Evidence</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {attachedDocs.map((e: any) => (
                            <span key={e.id} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 12, background: "rgba(245,158,11,0.1)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", gap: 4 }}>
                              {e.original_name || e.file_name}
                              <button onClick={() => removeAttachedEvidence(existing.id, e.id)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0, fontSize: 10, lineHeight: 1 }}>✕</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* EP Agent Review Chat Panel */}
                {false && chatSection?.id === existing?.id && (
                  <div style={{ display: "none" }}>

                    {/* Chat messages */}
                    <div style={{ maxHeight: 380, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                      {chatHistory.length === 0 && (
                        <div style={{ color: "#6b7280", fontSize: 12, fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                          Start by asking EP Agent to review this section, or type a specific request.<br />
                          <span style={{ color: "#7c3aed", cursor: "pointer" }} onClick={() => { setChatInput("Please review this section and tell me what needs improving"); }}>
                            → "Please review this section and tell me what needs improving"
                          </span>
                        </div>
                      )}
                      {chatHistory.map((msg, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                          <div style={{
                            maxWidth: "85%",
                            padding: "10px 14px",
                            borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                            background: msg.role === "user" ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${msg.role === "user" ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`,
                            color: "#e2e8f0",
                            fontSize: 12,
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                          }}>
                            {msg.role === "assistant" && (
                              <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, marginBottom: 6 }}>🤖 EP Agent</div>
                            )}
                            {msg.content}
                            {msg.role === "assistant" && msg.content.includes("[UPDATED SECTION]") && (
                              <div style={{ marginTop: 8, padding: "4px 10px", background: "rgba(16,185,129,0.15)", borderRadius: 6, fontSize: 10, color: "#10b981", fontWeight: 700 }}>
                                ✓ Section updated automatically — scroll up to see changes
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div style={{ display: "flex", justifyContent: "flex-start" }}>
                          <div style={{ padding: "10px 14px", borderRadius: "12px 12px 12px 2px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280", fontSize: 12 }}>
                            <span style={{ animation: "pulse 1.5s infinite" }}>EP Agent is reviewing...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick prompts */}
                    <div style={{ padding: "8px 14px", display: "flex", gap: 6, flexWrap: "wrap" as const, borderTop: "1px solid rgba(124,58,237,0.15)" }}>
                      {[
                        "Review and score this section",
                        "Strengthen the social value with numbers",
                        "Add more CEFAS evidence",
                        "Make it more specific to this buyer",
                        "Rewrite in STAR format",
                      ].map(prompt => (
                        <button key={prompt} onClick={() => setChatInput(prompt)} style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa", fontSize: 10, padding: "4px 10px", borderRadius: 99, cursor: "pointer" }}>
                          {prompt}
                        </button>
                      ))}
                    </div>

                    {/* Input area */}
                    <div style={{ padding: "10px 14px", display: "flex", gap: 8, borderTop: "1px solid rgba(124,58,237,0.15)" }}>
                      <textarea
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                        placeholder="Ask EP Agent to review, improve, or change anything... (Enter to send)"
                        style={{ ...input(), flex: 1, minHeight: 40, maxHeight: 100, fontSize: 12, resize: "none" as const }}
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={chatLoading || !chatInput.trim()}
                        style={{ ...btn("#7c3aed"), color: "#fff", fontWeight: 700, fontSize: 13, padding: "0 16px", alignSelf: "flex-end", height: 40, flexShrink: 0, opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}
                      >
                        {chatLoading ? "⏳" : "Send"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Proposal Builder */}
      <div style={{ ...card(), borderLeft: `4px solid ${GOLD}`, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>💼 Full Proposal Writer</h2>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: 12 }}>Compile and export your full proposal — share via link or export PDF</p>
          </div>
          <button onClick={saveProposal} disabled={savingProposal || !proposalTitle || !proposalContent} style={{ ...btn(GOLD), color: "#000", fontWeight: 700, fontSize: 12 }}>
            {savingProposal ? "Saving..." : "💾 Save Proposal"}
          </button>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={label()}>PROPOSAL TITLE</label>
            <input value={proposalTitle} onChange={e => setProposalTitle(e.target.value)} style={input()} placeholder="e.g., Event Planning Services Proposal" />
          </div>
          <div>
            <label style={label()}>PROPOSAL CONTENT</label>
            <textarea value={proposalContent} onChange={e => setProposalContent(e.target.value)} style={{ ...input(), minHeight: 200 }} placeholder="Compile your approved sections here, or generate a full proposal with EP Agent" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <button onClick={formatProposal} style={{ ...btn("#6366f1"), color: "#fff", fontWeight: 600 }}>📄 Format</button>
            <button onClick={exportProposalAsPDF} style={{ ...btn("rgba(255,255,255,0.1)"), color: "#94a3b8" }}>⬇️ Export PDF</button>
            <button onClick={copyShareLink} style={{ ...btn("rgba(255,255,255,0.1)"), color: "#94a3b8" }}>{shareLink ? "✓ Copied" : "🔗 Share"}</button>
          </div>
        </div>
      </div>
    </div>

    {/* ── E5: Save Lesson Modal ────────────────────────────────────────────── */}
    {showLessonModal && lessonModalSection && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: "#1e293b", borderRadius: 12, width: "100%", maxWidth: 500, border: "1px solid rgba(239,68,68,0.35)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#f87171", fontWeight: 700, fontSize: 14 }}>🧠 What did you learn from this gap?</div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>Section: {lessonModalSection.section_label} · Confidence: {lessonModalSection.overall_confidence}%</div>
            </div>
            <button onClick={() => setShowLessonModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
          <div style={{ padding: 20, display: "grid", gap: 14 }}>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>LESSON DESCRIPTION</label>
              <textarea
                value={lessonForm.lesson_text}
                onChange={e => setLessonForm((f: any) => ({ ...f, lesson_text: e.target.value }))}
                rows={4}
                placeholder={`e.g. "Lost on social value because we didn't quantify Year 1-3 outcomes. Always include numbered targets in ${lessonModalSection.section_label} sections."`}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e2e8f0", fontSize: 12, padding: "10px 12px", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>SECTION TYPE TAG</label>
              <select
                value={lessonForm.section_type}
                onChange={e => setLessonForm((f: any) => ({ ...f, section_type: e.target.value }))}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e2e8f0", fontSize: 12, padding: "9px 12px" }}>
                <option value="">Select section type...</option>
                {["Social Value", "Technical", "Methodology", "Pricing / Cost", "Team & Experience", "Risk Management", "Quality Assurance", "Health & Safety", "Sustainability", "GDPR & Data", "Innovation", "Cover Letter", "Executive Summary", "References", "Compliance", "Other"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowLessonModal(false)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#94a3b8", fontSize: 12, padding: "8px 16px", cursor: "pointer" }}>Cancel</button>
              <button onClick={saveLessonFromSection} disabled={savingLesson || !lessonForm.lesson_text.trim()}
                style={{ background: "#ef4444", border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700, padding: "8px 20px", cursor: "pointer", opacity: savingLesson || !lessonForm.lesson_text.trim() ? 0.5 : 1 }}>
                {savingLesson ? "Saving..." : "Save Lesson"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ── E4: Evidence Picker Modal ─────────────────────────────────────────── */}
    {evidencePickerSection && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: "#1e293b", borderRadius: 12, width: "100%", maxWidth: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", border: "1px solid rgba(245,158,11,0.3)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 14 }}>🗂 Evidence Picker</div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{evidencePickerSection.section_label}</div>
            </div>
            <button onClick={() => setEvidencePickerSection(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {loadingEvidence ? (
              <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "30px 0" }}>⏳ Scanning bid vault for relevant documents...</div>
            ) : (
              <>
                {evidenceSuggestions.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>✨ Suggested Evidence</div>
                    {evidenceSuggestions.map((doc: any) => (
                      <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", marginBottom: 4, background: "rgba(245,158,11,0.08)", borderRadius: 6, border: "1px solid rgba(245,158,11,0.2)" }}>
                        <div style={{ flex: 1, overflow: "hidden" }}>
                          <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.original_name || doc.file_name}</div>
                          {doc.folder_name && <div style={{ color: "#64748b", fontSize: 10 }}>📁 {doc.folder_name}</div>}
                        </div>
                        {doc.already_attached ? (
                          <span style={{ color: "#10b981", fontSize: 10, fontWeight: 700, marginLeft: 8, flexShrink: 0 }}>✓ Attached</span>
                        ) : (
                          <button onClick={() => attachEvidence(doc.id)} disabled={attachingEvidence === doc.id}
                            style={{ ...btn("#f59e0b"), color: "#000", fontSize: 10, padding: "4px 10px", marginLeft: 8, flexShrink: 0, fontWeight: 700 }}>
                            {attachingEvidence === doc.id ? "..." : "Attach"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {allVaultDocs.length > 0 && (
                  <div>
                    <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 8, paddingTop: evidenceSuggestions.length ? 8 : 0, borderTop: evidenceSuggestions.length ? "1px solid rgba(255,255,255,0.06)" : "none" }}>All Vault Documents</div>
                    {allVaultDocs.filter(d => !evidenceSuggestions.find((s: any) => s.id === d.id)).map((doc: any) => (
                      <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", marginBottom: 3, background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ flex: 1, overflow: "hidden" }}>
                          <div style={{ color: "#cbd5e1", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.original_name || doc.file_name}</div>
                          {doc.folder_name && <div style={{ color: "#475569", fontSize: 10 }}>📁 {doc.folder_name}</div>}
                        </div>
                        {doc.already_attached ? (
                          <span style={{ color: "#10b981", fontSize: 10, fontWeight: 700, marginLeft: 8, flexShrink: 0 }}>✓ Attached</span>
                        ) : (
                          <button onClick={() => attachEvidence(doc.id)} disabled={attachingEvidence === doc.id}
                            style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, color: "#94a3b8", fontSize: 10, padding: "3px 8px", cursor: "pointer", marginLeft: 8, flexShrink: 0 }}>
                            {attachingEvidence === doc.id ? "..." : "+ Attach"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!loadingEvidence && allVaultDocs.length === 0 && (
                  <div style={{ color: "#64748b", fontSize: 12, textAlign: "center", padding: "30px 0" }}>No documents found in the Bid Vault. Upload documents to the Bid Vault to attach them here.</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
