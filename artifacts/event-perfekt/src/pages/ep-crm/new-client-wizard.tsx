// 4-step "Add New Client" wizard with EP Agent SOW generation.
// Steps: 1 Details + Brief + Package, 2 Primary contact, 3 Deliverables, 4 SOW review.

import { useState, useEffect, useMemo } from "react";

const TOKEN_KEY = "token";
const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });
async function api(method: string, url: string, body?: any) {
  const res = await fetch(url, { method, headers: headers(), ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// ── Color tokens ──────────────────────────────────────────────────────────────
const BURGUNDY = "#7B2142";
const BURGUNDY_DARK = "#4A2030";
const BG_DEEP = "#1A0A0E";
const BG_PANEL = "#2A1018";
const GOLD = "#E2C87A";
const GOLD_DIM = "#f59e0b";

// ── Package catalogue with default deliverables ───────────────────────────────
type PackageKey = "A" | "B" | "C" | "Custom";

type PhaseTemplate = {
  phase_number: number;
  phase_name: string;
  timeline: string;
  purpose: string;
  activities: string[];
  deliverables: string[];
  outcome: string;
};

const PHASE_A: PhaseTemplate = {
  phase_number: 1,
  phase_name: "Strategic Foundation",
  timeline: "Weeks 1–2",
  purpose: "Establish positioning, market entry roadmap, and strategic document.",
  activities: ["Organisation review", "Positioning workshop", "Market entry mapping", "Partner identification"],
  deliverables: ["Strategic document", "Positioning statement", "Market entry roadmap", "Partner map"],
  outcome: "Clarity and strategic foundation.",
};
const PHASE_B: PhaseTemplate = {
  phase_number: 2,
  phase_name: "Model Design",
  timeline: "Weeks 3–4",
  purpose: "Design participant pathway, safeguarding, referral process, and funding blueprint.",
  activities: ["Participant pathway design", "Programme framework", "Safeguarding structure", "Referral process", "Funding blueprint"],
  deliverables: ["Programme framework", "Safeguarding policy", "Referral process", "Funding blueprint", "Partner identification list"],
  outcome: "A programme funders can say yes to.",
};
const PHASE_C: PhaseTemplate = {
  phase_number: 3,
  phase_name: "Full Launch",
  timeline: "Weeks 5–6",
  purpose: "Open borough and school doors, identify sponsors, write proposals, open revenue conversations.",
  activities: ["Borough and school outreach", "Sponsor identification", "Proposal writing", "Funding applications", "Partner outreach"],
  deliverables: ["Launch package", "Proposal suite", "Sponsor pipeline", "Funding application set"],
  outcome: "Structure, access, and revenue.",
};

const PACKAGES: Record<
  Exclude<PackageKey, "Custom">,
  { title: string; fullTitle: string; timeline: string; fee: number; outcome: string; bullets: string[]; phases: PhaseTemplate[] }
> = {
  A: {
    title: "Package A",
    fullTitle: "Package A — Strategic Foundation",
    timeline: "2 weeks",
    fee: 1500,
    outcome: "Clarity and strategic foundation",
    bullets: ["Org review", "Positioning", "Market entry roadmap", "Strategic document", "Partner mapping"],
    phases: [PHASE_A],
  },
  B: {
    title: "Package B",
    fullTitle: "Package B — Model Design",
    timeline: "4 weeks",
    fee: 3000,
    outcome: "A programme funders can say yes to",
    bullets: ["Everything in A, plus:", "Participant pathway", "Programme framework", "Safeguarding structure", "Funding blueprint", "Referral process", "Partner identification"],
    phases: [PHASE_A, PHASE_B],
  },
  C: {
    title: "Package C",
    fullTitle: "Package C — Full Launch",
    timeline: "6 weeks",
    fee: 4500,
    outcome: "Structure, access, and revenue",
    bullets: ["Everything in B, plus:", "Borough and school doors opened", "Sponsors identified", "Proposals written", "Go-to-market", "Revenue conversations", "Partner outreach", "Funding applications"],
    phases: [PHASE_A, PHASE_B, PHASE_C],
  },
};

// ── Types ────────────────────────────────────────────────────────────────────
type WizardState = {
  // Step 1
  organisation_name: string;
  engagement_type: string;
  lead_source: string;
  city: string;
  country: string;
  website: string;
  address_line1: string;
  assigned_to: string;
  status: string;
  project_description: string;
  package_selected: PackageKey | "";
  custom_package_description: string;
  fee_amount: number;
  mobilisation_fee: string;
  balance_fee: string;
  start_date: string;
  end_date: string;
  // Step 2
  contact_name: string;
  contact_email: string;
  contact_title: string;
  // Step 3
  deliverables: PhaseTemplate[];
};

const ENGAGEMENT_TYPES = [
  "Full Event Management", "Day Coordination", "Corporate Events", "Wedding Planning",
  "Conference & Summits", "Gala Dinners", "Virtual Events", "Project Consulting",
  "Programme Delivery Consultancy", "Government Programme", "Other",
];
const LEAD_SOURCES = ["Referral", "Website", "LinkedIn", "Email Campaign", "Direct", "Exhibition", "Other"];

const EMPTY: WizardState = {
  organisation_name: "", engagement_type: "", lead_source: "",
  city: "", country: "United Kingdom", website: "", address_line1: "",
  assigned_to: "", status: "lead",
  project_description: "",
  package_selected: "",
  custom_package_description: "",
  fee_amount: 0,
  mobilisation_fee: "50% on signature",
  balance_fee: "50% on final deliverable",
  start_date: "",
  end_date: "",
  contact_name: "", contact_email: "", contact_title: "",
  deliverables: [],
};

// ── Shared bits ──────────────────────────────────────────────────────────────
const field = (): any => ({ width: "100%", background: BG_PANEL, border: `1px solid ${BURGUNDY_DARK}`, borderRadius: 6, color: "#fff", padding: "9px 12px", fontSize: 13, boxSizing: "border-box", fontFamily: "Poppins, sans-serif" });
const lbl = (): any => ({ display: "block", color: "#ccc", fontSize: 12, marginBottom: 5, fontWeight: 500 });
const btn = (bg: string, color = "#fff"): any => ({ background: bg, color, border: "none", borderRadius: 7, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" });

function Input({ label, ...props }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={lbl()}>{label}</label>}
      <input {...props} style={{ ...field(), ...(props.style || {}) }} />
    </div>
  );
}
function Select({ label, children, ...props }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={lbl()}>{label}</label>}
      <select {...props} style={field()}>{children}</select>
    </div>
  );
}
function Textarea({ label, rows = 4, ...props }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={lbl()}>{label}</label>}
      <textarea {...props} rows={rows} style={{ ...field(), resize: "vertical", lineHeight: 1.5 }} />
    </div>
  );
}

// ── Animated loading card ────────────────────────────────────────────────────
function GenerationPanel() {
  const [step, setStep] = useState(0);
  const stages = ["Analysing your brief…", "Writing scope of work…", "Adding commercial terms…", "Finalising document…"];
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, stages.length - 1)), 3500);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 20, color: GOLD, fontWeight: 700, marginBottom: 8 }}>EP Agent is writing your Statement of Work</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 32 }}>This takes about 30 seconds</div>
      <div style={{ width: 96, height: 96, margin: "0 auto 28px", background: BURGUNDY, borderRadius: 16, color: GOLD, fontWeight: 800, fontSize: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 40px ${BURGUNDY}60` }}>
        EP
      </div>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        {stages.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: 6, background: i <= step ? "#1e1240" : "transparent", border: i <= step ? "1px solid #a78bfa40" : "1px solid transparent", borderRadius: 8, color: i <= step ? "#fff" : "#666", fontSize: 13, transition: "all 0.4s" }}>
            <span style={{ width: 18 }}>{i < step ? "✓" : i === step ? "⟳" : "·"}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 1: Details + Brief + Package ────────────────────────────────────────
function Step1({ state, set }: { state: WizardState; set: (s: WizardState) => void }) {
  const selectPackage = (key: PackageKey) => {
    const pkg = key !== "Custom" ? PACKAGES[key] : null;
    set({
      ...state,
      package_selected: key,
      fee_amount: pkg ? pkg.fee : state.fee_amount,
      deliverables: pkg ? pkg.phases.map(p => ({ ...p, activities: [...p.activities], deliverables: [...p.deliverables] })) : state.deliverables,
    });
  };

  return (
    <div>
      <Input label="Organisation Name *" value={state.organisation_name} onChange={(e: any) => set({ ...state, organisation_name: e.target.value })} placeholder="ALLI Foundation" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Select label="Engagement Type" value={state.engagement_type} onChange={(e: any) => set({ ...state, engagement_type: e.target.value })}>
          <option value="">Select service type...</option>
          {ENGAGEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select label="Lead Source" value={state.lead_source} onChange={(e: any) => set({ ...state, lead_source: e.target.value })}>
          <option value="">How did they find us?</option>
          {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="City" value={state.city} onChange={(e: any) => set({ ...state, city: e.target.value })} placeholder="London" />
        <Select label="Country" value={state.country} onChange={(e: any) => set({ ...state, country: e.target.value })}>
          <option value="United Kingdom">United Kingdom</option>
          <option value="Nigeria">Nigeria</option>
          <option value="United States">United States</option>
          <option value="Canada">Canada</option>
          <option value="Other">Other</option>
        </Select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Website" value={state.website} onChange={(e: any) => set({ ...state, website: e.target.value })} placeholder="https://..." />
        <Input label="Address" value={state.address_line1} onChange={(e: any) => set({ ...state, address_line1: e.target.value })} placeholder="Street address" />
      </div>

      {/* Brief capture */}
      <div style={{ marginTop: 8, marginBottom: 18, padding: 16, background: "#2a1f00", border: `1px solid ${GOLD_DIM}55`, borderRadius: 8 }}>
        <label style={{ ...lbl(), color: GOLD, fontWeight: 600 }}>TELL US ABOUT THIS CLIENT *</label>
        <textarea
          rows={6}
          value={state.project_description}
          onChange={e => set({ ...state, project_description: e.target.value })}
          placeholder="Describe this client in plain English. What do they do? What do they need from Event Perfekt? What is their main challenge? What outcome do they want? The more detail you provide here the better EP Agent can write their Statement of Work."
          style={{ ...field(), resize: "vertical", lineHeight: 1.5, background: BG_DEEP }}
        />
        <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
          EP Agent uses this brief to write their Statement of Work. More detail = better SOW.
        </div>
      </div>

      {/* Package cards */}
      <label style={lbl()}>PACKAGE (fees are suggested — all editable)</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
        {(["A", "B", "C"] as const).map(key => {
          const pkg = PACKAGES[key];
          const selected = state.package_selected === key;
          return (
            <div
              key={key}
              onClick={() => selectPackage(key)}
              style={{
                padding: 14, background: selected ? "#1e1240" : BG_PANEL,
                border: `2px solid ${selected ? "#a78bfa" : BURGUNDY_DARK}`,
                borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <div style={{ color: selected ? "#a78bfa" : GOLD, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{pkg.title}</div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{pkg.fullTitle.split("—")[1]?.trim()}</div>
              <div style={{ color: "#888", fontSize: 11, marginBottom: 8 }}>{pkg.timeline} · suggested £{pkg.fee.toLocaleString()}</div>
              <div style={{ color: "#ccc", fontSize: 11, lineHeight: 1.5 }}>
                {pkg.bullets.slice(0, 5).map(b => <div key={b}>· {b}</div>)}
                {pkg.bullets.length > 5 && <div style={{ color: "#888" }}>+ {pkg.bullets.length - 5} more</div>}
              </div>
              <div style={{ color: GOLD, fontSize: 11, fontWeight: 600, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BURGUNDY_DARK}` }}>
                Outcome: {pkg.outcome}
              </div>
            </div>
          );
        })}
      </div>
      <div
        onClick={() => selectPackage("Custom")}
        style={{
          padding: 12, background: state.package_selected === "Custom" ? "#1e1240" : BG_PANEL,
          border: `2px solid ${state.package_selected === "Custom" ? "#a78bfa" : BURGUNDY_DARK}`,
          borderRadius: 10, cursor: "pointer", marginBottom: 14,
        }}
      >
        <div style={{ color: state.package_selected === "Custom" ? "#a78bfa" : GOLD, fontWeight: 700, fontSize: 13 }}>Custom</div>
        <div style={{ color: "#888", fontSize: 11 }}>Define a bespoke engagement with custom fee and deliverables.</div>
      </div>

      {state.package_selected === "Custom" && (
        <Textarea
          label="Custom engagement description"
          rows={3}
          value={state.custom_package_description}
          onChange={(e: any) => set({ ...state, custom_package_description: e.target.value })}
          placeholder="Describe the bespoke engagement scope…"
        />
      )}

      {state.package_selected && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Input label="Fee Amount (£)" type="number" value={state.fee_amount || ""} onChange={(e: any) => set({ ...state, fee_amount: parseFloat(e.target.value) || 0 })} placeholder="4500" />
          <Input label="Start Date" type="date" value={state.start_date} onChange={(e: any) => set({ ...state, start_date: e.target.value })} />
          <Input label="End Date" type="date" value={state.end_date} onChange={(e: any) => set({ ...state, end_date: e.target.value })} />
        </div>
      )}

      {state.package_selected && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Mobilisation" value={state.mobilisation_fee} onChange={(e: any) => set({ ...state, mobilisation_fee: e.target.value })} placeholder="50% on signature" />
          <Input label="Balance" value={state.balance_fee} onChange={(e: any) => set({ ...state, balance_fee: e.target.value })} placeholder="50% on final deliverable" />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Assigned To" value={state.assigned_to} onChange={(e: any) => set({ ...state, assigned_to: e.target.value })} placeholder="Planner name" />
        <Input label="Status" value={state.status} onChange={(e: any) => set({ ...state, status: e.target.value })} placeholder="lead" />
      </div>
    </div>
  );
}

// ── Step 2: Contact ──────────────────────────────────────────────────────────
function Step2({ state, set }: { state: WizardState; set: (s: WizardState) => void }) {
  return (
    <div>
      <p style={{ color: "#aaa", fontSize: 13, marginTop: 0, marginBottom: 18 }}>Primary contact and signatory for this engagement. This person will sign the SOW.</p>
      <Input label="Full Name *" value={state.contact_name} onChange={(e: any) => set({ ...state, contact_name: e.target.value })} placeholder="Kehinde Alli" />
      <Input label="Email *" type="email" value={state.contact_email} onChange={(e: any) => set({ ...state, contact_email: e.target.value })} placeholder="kehinde@allifoundation.org" />
      <Input label="Job Title" value={state.contact_title} onChange={(e: any) => set({ ...state, contact_title: e.target.value })} placeholder="Founder & CEO" />
    </div>
  );
}

// ── Step 3: Deliverables ─────────────────────────────────────────────────────
function Step3({ state, set }: { state: WizardState; set: (s: WizardState) => void }) {
  const updatePhase = (idx: number, patch: Partial<PhaseTemplate>) => {
    const next = [...state.deliverables];
    next[idx] = { ...next[idx], ...patch };
    set({ ...state, deliverables: next });
  };
  const removePhase = (idx: number) => set({ ...state, deliverables: state.deliverables.filter((_, i) => i !== idx) });
  const addPhase = () => set({
    ...state,
    deliverables: [
      ...state.deliverables,
      { phase_number: state.deliverables.length + 1, phase_name: "", timeline: "", purpose: "", activities: [], deliverables: [], outcome: "" },
    ],
  });

  if (!state.deliverables.length) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
        <div style={{ fontSize: 13, marginBottom: 16 }}>No deliverables yet. {state.package_selected && state.package_selected !== "Custom" ? "Select a package in Step 1 to auto-populate." : "Add your first phase."}</div>
        <button onClick={addPhase} style={btn(BURGUNDY)}>+ Add Phase</button>
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: "#aaa", fontSize: 13, marginTop: 0, marginBottom: 18 }}>
        Review and edit each phase. These become the Scope of Work section in the SOW.
      </p>
      {state.deliverables.map((p, idx) => (
        <div key={idx} style={{ padding: 14, marginBottom: 14, background: BG_PANEL, border: `1px solid ${BURGUNDY_DARK}`, borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ color: GOLD, fontSize: 13, fontWeight: 700 }}>Phase {p.phase_number}</div>
            <button onClick={() => removePhase(idx)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>Remove</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
            <Input label="Phase name" value={p.phase_name} onChange={(e: any) => updatePhase(idx, { phase_name: e.target.value })} />
            <Input label="Timeline" value={p.timeline} onChange={(e: any) => updatePhase(idx, { timeline: e.target.value })} placeholder="Weeks 1–2" />
          </div>
          <Textarea label="Purpose" rows={2} value={p.purpose} onChange={(e: any) => updatePhase(idx, { purpose: e.target.value })} />
          <Textarea label="Activities (one per line)" rows={3} value={(p.activities || []).join("\n")} onChange={(e: any) => updatePhase(idx, { activities: e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean) })} />
          <Textarea label="Deliverables (one per line)" rows={3} value={(p.deliverables || []).join("\n")} onChange={(e: any) => updatePhase(idx, { deliverables: e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean) })} />
          <Input label="Outcome" value={p.outcome} onChange={(e: any) => updatePhase(idx, { outcome: e.target.value })} />
        </div>
      ))}
      <button onClick={addPhase} style={btn(BURGUNDY_DARK, GOLD)}>+ Add Phase</button>
    </div>
  );
}

// ── Step 4: SOW generation + review ──────────────────────────────────────────
function Step4({
  state,
  onApproveAndSend,
  onClose,
}: {
  state: WizardState;
  onApproveAndSend: (sowId: number, pdfUrl: string) => Promise<void>;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"generating" | "review" | "error">("generating");
  const [error, setError] = useState("");
  const [sow, setSow] = useState<any>(null);
  const [reviewData, setReviewData] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [sowId, setSowId] = useState<number | null>(null);
  const [showRevise, setShowRevise] = useState(false);
  const [reviseText, setReviseText] = useState("");
  const [revising, setRevising] = useState(false);

  const inputPayload = useMemo(() => ({
    organisation_name: state.organisation_name,
    contact_name: state.contact_name,
    contact_email: state.contact_email,
    engagement_type: state.engagement_type || "Consultancy",
    package_selected: state.package_selected === "Custom"
      ? `Custom — ${state.custom_package_description || ""}`
      : state.package_selected
        ? PACKAGES[state.package_selected as Exclude<PackageKey, "Custom">]?.fullTitle
        : "Custom",
    project_description: state.project_description,
    deliverables: state.deliverables,
    start_date: state.start_date,
    end_date: state.end_date,
    fee_amount: state.fee_amount,
    fee_currency: "GBP",
    mobilisation_fee: state.mobilisation_fee,
    balance_fee: state.balance_fee,
    project_name: state.package_selected === "Custom"
      ? "Custom Engagement"
      : state.package_selected
        ? PACKAGES[state.package_selected as Exclude<PackageKey, "Custom">]?.fullTitle.split("—")[1]?.trim()
        : "Engagement",
  }), [state]);

  async function generate() {
    setStatus("generating");
    setError("");
    try {
      const res = await api("POST", "/api/ep-clients/generate-sow", inputPayload);
      setSow(res.sow_text);
      setReviewData(res.review);
      setPdfUrl(res.pdf_url);
      setPreviewHtml(res.preview_html);
      setSowId(res.id);
      setStatus("review");
    } catch (e: any) {
      setError(e.message);
      setStatus("error");
    }
  }

  async function revise() {
    if (!sowId || !reviseText.trim()) return;
    setRevising(true);
    try {
      const res = await api("POST", `/api/ep-clients/sow/${sowId}/revise`, {
        instruction: reviseText,
        input: inputPayload,
      });
      setSow(res.sow_text);
      setReviewData(res.review);
      setPdfUrl(res.pdf_url);
      setPreviewHtml(res.preview_html);
      setShowRevise(false);
      setReviseText("");
    } catch (e: any) {
      setError(e.message);
    }
    setRevising(false);
  }

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "generating") return <GenerationPanel />;
  if (status === "error") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
        <div style={{ color: "#ef4444", fontSize: 14, marginBottom: 10 }}>SOW generation failed</div>
        <div style={{ color: "#aaa", fontSize: 12, marginBottom: 20 }}>{error}</div>
        <button onClick={generate} style={btn(BURGUNDY)}>Retry</button>
      </div>
    );
  }

  const score = reviewData?.score ?? 70;
  const scoreColor = score >= 85 ? "#22c55e" : score >= 70 ? GOLD_DIM : "#ef4444";

  return (
    <div>
      {score < 70 && (
        <div style={{ background: "#2a1f00", border: `1px solid ${GOLD_DIM}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: GOLD_DIM, fontSize: 13, fontWeight: 600 }}>
          ⚠ EP Agent recommends revising before sending
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "60% 40%", gap: 14 }}>
        {/* Left: preview */}
        <div style={{ background: "#fff", borderRadius: 10, maxHeight: 520, overflow: "auto" }}>
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>

        {/* Right: review */}
        <div style={{ background: BG_PANEL, border: `1px solid ${BURGUNDY_DARK}`, borderRadius: 10, padding: 16, maxHeight: 520, overflow: "auto" }}>
          <div style={{ color: GOLD, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>EP AGENT NOTES</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${BURGUNDY_DARK}` }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", border: `3px solid ${scoreColor}`, display: "flex", alignItems: "center", justifyContent: "center", color: scoreColor, fontWeight: 800, fontSize: 20 }}>{score}</div>
            <div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Quality Score</div>
              <div style={{ color: scoreColor, fontSize: 12, fontWeight: 600 }}>{reviewData?.recommendation || "Review needed"}</div>
            </div>
          </div>

          {!!(reviewData?.strengths?.length) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: "#22c55e", fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>WHAT WORKS WELL</div>
              {reviewData.strengths.map((s: string, i: number) => <div key={i} style={{ color: "#ccc", fontSize: 12, lineHeight: 1.5, marginBottom: 5 }}>· {s}</div>)}
            </div>
          )}

          {!!(reviewData?.improvements?.length) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: GOLD_DIM, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>WHAT COULD BE STRONGER</div>
              {reviewData.improvements.map((s: string, i: number) => <div key={i} style={{ color: "#ccc", fontSize: 12, lineHeight: 1.5, marginBottom: 5 }}>· {s}</div>)}
            </div>
          )}

          {!!(reviewData?.missing?.length) && (
            <div>
              <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>MISSING</div>
              {reviewData.missing.map((s: string, i: number) => <div key={i} style={{ color: "#ccc", fontSize: 12, lineHeight: 1.5, marginBottom: 5 }}>· {s}</div>)}
            </div>
          )}
        </div>
      </div>

      {showRevise && (
        <div style={{ marginTop: 14, padding: 14, background: "#2a1f00", border: `1px solid ${GOLD_DIM}`, borderRadius: 10 }}>
          <div style={{ color: GOLD_DIM, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>ASK EP AGENT TO REVISE</div>
          <textarea
            rows={3}
            value={reviseText}
            onChange={e => setReviseText(e.target.value)}
            placeholder="e.g. Make the deliverables more specific. Add more detail on the methodology. Change the fee structure to milestone payments."
            style={{ ...field(), background: BG_DEEP, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={() => setShowRevise(false)} style={{ ...btn(BG_PANEL, "#ccc"), border: `1px solid ${BURGUNDY_DARK}` }}>Cancel</button>
            <button onClick={revise} disabled={revising || !reviseText.trim()} style={btn(GOLD_DIM, "#000")}>
              {revising ? "Revising…" : "Send Instruction"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BURGUNDY_DARK}` }}>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ ...btn(BG_PANEL, GOLD), border: `1px solid ${BURGUNDY_DARK}`, textDecoration: "none" }}>
            ↗ Open PDF
          </a>
          <button onClick={generate} style={{ ...btn(BG_PANEL, "#888"), border: `1px solid ${BURGUNDY_DARK}` }}>Start Over</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowRevise(true)} style={btn(GOLD_DIM, "#000")}>Ask EP Agent to Revise</button>
          <button
            onClick={() => sowId && onApproveAndSend(sowId, pdfUrl)}
            style={{ ...btn(BURGUNDY), fontWeight: 700 }}
          >
            Approve & Attach
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main wizard component ────────────────────────────────────────────────────
export default function NewClientWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);

  const canAdvance = () => {
    if (step === 1) return !!state.organisation_name.trim() && !!state.project_description.trim() && !!state.package_selected;
    if (step === 2) return !!state.contact_name.trim() && !!state.contact_email.trim();
    if (step === 3) return state.deliverables.length > 0;
    return true;
  };

  async function createClientRecord() {
    setSaving(true);
    setError("");
    try {
      const res = await api("POST", "/api/ep-clients", {
        organisation_name: state.organisation_name,
        engagement_type: state.engagement_type,
        lead_source: state.lead_source,
        city: state.city, country: state.country,
        website: state.website, address_line1: state.address_line1,
        assigned_to: state.assigned_to, status: state.status,
      });
      setCreatedClientId(res.id);
      // best-effort: add contact (endpoint may or may not exist)
      try {
        await api("POST", `/api/ep-clients/${res.id}/contacts`, {
          full_name: state.contact_name,
          email: state.contact_email,
          job_title: state.contact_title,
          is_primary: true,
          is_signatory: true,
        });
      } catch {}
      return res.id as number;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (step === 3 && !createdClientId) {
      try { await createClientRecord(); } catch { return; }
    }
    setStep(step + 1);
  }

  async function approveAndSend(sowId: number, _pdfUrl: string) {
    try {
      await api("POST", `/api/ep-clients/sow/${sowId}/approve`, { client_id: createdClientId });
      if (createdClientId) {
        try { await api("POST", `/api/ep-clients/${createdClientId}/invite-onboarding`, {}); } catch {}
      }
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const titles = ["Client details", "Primary contact", "Scope & deliverables", "Statement of Work"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <div style={{ background: BG_DEEP, border: `1px solid ${BURGUNDY_DARK}`, borderRadius: 14, width: "100%", maxWidth: step === 4 ? 1100 : 680 }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${BURGUNDY_DARK}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: GOLD, fontSize: 16, fontWeight: 700 }}>Add New Client</div>
            <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>Step {step} of 4 — {titles[step - 1]}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", padding: "0 24px", gap: 4, marginTop: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? BURGUNDY : BURGUNDY_DARK, transition: "background 0.3s" }} />
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {error && <div style={{ marginBottom: 14, padding: "10px 14px", background: "#2a0c0c", border: "1px solid #ef4444", borderRadius: 8, color: "#ef4444", fontSize: 12 }}>{error}</div>}
          {step === 1 && <Step1 state={state} set={setState} />}
          {step === 2 && <Step2 state={state} set={setState} />}
          {step === 3 && <Step3 state={state} set={setState} />}
          {step === 4 && <Step4 state={state} onApproveAndSend={approveAndSend} onClose={onClose} />}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${BURGUNDY_DARK}`, display: "flex", justifyContent: "space-between" }}>
            <button
              onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
              style={{ ...btn(BG_PANEL, "#aaa"), border: `1px solid ${BURGUNDY_DARK}` }}
            >
              {step === 1 ? "Cancel" : "← Back"}
            </button>
            <button
              onClick={handleNext}
              disabled={!canAdvance() || saving}
              style={{ ...btn(BURGUNDY), opacity: canAdvance() && !saving ? 1 : 0.5 }}
            >
              {saving ? "Saving…" : step === 3 ? "Generate SOW →" : "Next →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
