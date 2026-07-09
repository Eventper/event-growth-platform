import { useEffect, useState } from "react";
import PortalLayout from "./layout";
import { portalFetch } from "@/lib/client-portal-auth";

const BURGUNDY = "#3D0B0B";

const STATUS_COLOUR: Record<string, { bg: string; fg: string }> = {
  requested: { bg: "#eff6ff", fg: "#2563eb" },
  draft: { bg: "#fef3c7", fg: "#d97706" },
  submitted: { bg: "#e0e7ff", fg: "#6366f1" },
  approved: { bg: "#d1fae5", fg: "#059669" },
  rejected: { bg: "#fee2e2", fg: "#dc2626" },
};

export default function Proposals() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState({ proposal_title: "", proposal_type: "Grant Application", target_funder: "", target_amount: "", brief: "" });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const r = await portalFetch("GET", "/api/client-portal/proposals").catch(() => []);
    setProposals(Array.isArray(r) ? r : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function requestProposal() {
    if (!form.proposal_title || !form.proposal_type) { alert("Title and type are required"); return; }
    setSubmitting(true);
    try {
      await portalFetch("POST", "/api/client-portal/proposals/request", form);
      setShowRequest(false);
      setForm({ proposal_title: "", proposal_type: "Grant Application", target_funder: "", target_amount: "", brief: "" });
      load();
    } catch (e: any) {
      alert(e.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>Proposals</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: 0 }}>Grant applications, funding proposals, and partnership pitches — drafted by EP Agent.</p>
        </div>
        <button onClick={() => setShowRequest(true)} style={{ background: BURGUNDY, color: "#fff", border: "none", borderRadius: 6, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>+ Request Proposal</button>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: "center", color: "#fff" }}>Loading...</div> : proposals.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>📝</div>
          <p style={{ color: "#666", marginBottom: 16 }}>No proposals yet. Request a new one — EP Agent will draft it using the latest intelligence and your engagement context.</p>
          <button onClick={() => setShowRequest(true)} style={{ background: BURGUNDY, color: "#fff", border: "none", borderRadius: 6, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Request your first proposal</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {proposals.map(p => {
            const s = STATUS_COLOUR[p.status] || STATUS_COLOUR.draft;
            return (
              <div key={p.id} style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a0a0e", margin: "0 0 6px" }}>{p.proposal_title}</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "#666" }}>
                      <span>{p.proposal_type}</span>
                      {p.target_funder && <><span>·</span><span>{p.target_funder}</span></>}
                      {p.target_amount && <><span>·</span><span style={{ fontWeight: 700, color: BURGUNDY }}>{p.target_amount}</span></>}
                    </div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Created {new Date(p.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.fg, padding: "4px 10px", borderRadius: 100, textTransform: "uppercase" }}>{p.status}</span>
                    {p.generated_content && <button onClick={() => setViewing(p)} style={{ background: "none", border: "1px solid " + BURGUNDY, color: BURGUNDY, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>View Draft</button>}
                    {p.document_url && <a href={p.document_url} download style={{ fontSize: 11, color: BURGUNDY, fontWeight: 600 }}>⬇ Download</a>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showRequest && (
        <div onClick={() => setShowRequest(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, padding: 24, maxWidth: 560, width: "100%" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: "#1a0a0e" }}>Request a Proposal</h2>
            <p style={{ color: "#666", fontSize: 12, marginBottom: 18 }}>EP Agent will draft this using your engagement deliverables and saved intelligence as source material.</p>
            {[
              { key: "proposal_title", label: "Proposal Title", placeholder: "e.g. Knife Crime Concentrations Fund — ALLI Foundation" },
              { key: "target_funder", label: "Target Funder", placeholder: "e.g. Home Office, National Lottery, YEF" },
              { key: "target_amount", label: "Target Amount", placeholder: "e.g. £250,000 over 2 years" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#1a0a0e", display: "block", marginBottom: 4 }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ width: "100%", padding: "9px 11px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#1a0a0e", display: "block", marginBottom: 4 }}>Proposal Type</label>
              <select value={form.proposal_type} onChange={e => setForm({ ...form, proposal_type: e.target.value })} style={{ width: "100%", padding: "9px 11px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, boxSizing: "border-box", background: "#fff" }}>
                {["Grant Application", "Expression of Interest", "Commissioning Pitch", "Partnership Pitch", "Sponsorship Proposal", "Funding Bid"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#1a0a0e", display: "block", marginBottom: 4 }}>Brief / Context</label>
              <textarea value={form.brief} onChange={e => setForm({ ...form, brief: e.target.value })} placeholder="Tell EP Agent what this proposal needs to cover, deadline, specific requirements, funder priorities..." rows={5} style={{ width: "100%", padding: "9px 11px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "Poppins, sans-serif" }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowRequest(false)} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#374151", borderRadius: 6, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={requestProposal} disabled={submitting} style={{ background: BURGUNDY, color: "#fff", border: "none", borderRadius: 6, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.6 : 1 }}>{submitting ? "Submitting..." : "Submit Request"}</button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div onClick={() => setViewing(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, padding: 24, maxWidth: 900, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a0a0e" }}>{viewing.proposal_title}</h2>
              <button onClick={() => setViewing(null)} style={{ background: "none", border: "none", fontSize: 22, color: "#888", cursor: "pointer" }}>×</button>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'Poppins', sans-serif", fontSize: 13, color: "#333", lineHeight: 1.7, background: "#fafafa", padding: 20, borderRadius: 8, border: "1px solid #f0ebe6" }}>{viewing.generated_content || "(Draft pending — EP Agent will complete this shortly.)"}</pre>
            {viewing.document_url && <div style={{ marginTop: 14 }}><a href={viewing.document_url} download style={{ background: BURGUNDY, color: "#fff", padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>⬇ Download</a></div>}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
