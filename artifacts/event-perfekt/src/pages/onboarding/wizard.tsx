import { useState, useEffect } from "react";
import { useParams } from "wouter";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

async function apiFetch(method: string, url: string, body?: any) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

const SERVICES = [
  "Full Event Management","Day Coordination","Corporate Events","Wedding Planning",
  "Conference & Summit","Gala Dinner","Virtual / Hybrid Event","Product Launch",
  "Award Ceremony","Team Building","Private Celebration","Other",
];

const EVENT_SIZES = ["Under 50","50–100","100–250","250–500","500+","Not decided yet"];
const BUDGETS = ["Under £5,000","£5,000–£15,000","£15,000–£50,000","£50,000–£100,000","£100,000+","To be discussed"];
const TIMELINES = ["Within 1 month","1–3 months","3–6 months","6–12 months","Over 12 months","Ongoing"];

function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        background: done ? "#22c55e" : active ? "#7B2142" : "rgba(255,255,255,0.1)",
        border: `2px solid ${done ? "#22c55e" : active ? "#E2C87A" : "rgba(255,255,255,0.2)"}`,
        color: done || active ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
        {done ? "✓" : n}
      </div>
      <div style={{ fontSize: 11, color: done ? "#22c55e" : active ? "#E2C87A" : "rgba(255,255,255,0.4)", textAlign: "center" }}>{label}</div>
    </div>
  );
}

function Input({ label, required, ...props }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", color: "rgba(255,255,255,0.8)", fontSize: 13, marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#E2C87A" }}> *</span>}
      </label>
      <input {...props} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 8, color: "#fff", padding: "10px 14px", fontSize: 14, boxSizing: "border-box",
        outline: "none", ...props.style }}
        onFocus={e => e.target.style.borderColor = "#E2C87A"}
        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"} />
    </div>
  );
}

function Select({ label, children, required, ...props }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", color: "rgba(255,255,255,0.8)", fontSize: 13, marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#E2C87A" }}> *</span>}
      </label>
      <select {...props} style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 8, color: "#fff", padding: "10px 14px", fontSize: 14, boxSizing: "border-box" }}>
        {children}
      </select>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: any) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", marginBottom: 10 }}>
      <div onClick={onChange} style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
        background: checked ? "#7B2142" : "transparent", border: `2px solid ${checked ? "#E2C87A" : "rgba(255,255,255,0.3)"}`,
        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>
        {checked ? "✓" : ""}
      </div>
      <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.5 }}>{label}</span>
    </label>
  );
}

export default function OnboardingWizard() {
  const params = useParams() as any;
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Step 1 — Company Details
  const [s1, setS1] = useState({
    organisation_name: "", address_line1: "", address_line2: "", city: "", postcode: "",
    country: "United Kingdom", website: "", vat_number: "", company_reg_number: "",
  });

  // Step 2 — Services
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [otherService, setOtherService] = useState("");

  // Step 3 — Event Brief
  const [s3, setS3] = useState({
    event_name: "", event_date_preference: "", event_size: "", budget_range: "",
    timeline: "", venue_preference: "", additional_notes: "",
  });

  // Step 4 — Contact & Agreement
  const [s4, setS4] = useState({
    full_name: "", job_title: "", email: "", phone: "",
    agree_terms: false, agree_data: false, agree_contact: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const d = await apiFetch("GET", `/api/onboarding/${token}`);
        setData(d);
        if (d.already_completed) { setCompleted(true); setLoading(false); return; }
        // Pre-fill step 1
        setS1({
          organisation_name: d.organisation_name || "",
          address_line1: d.address_line1 || "",
          address_line2: d.address_line2 || "",
          city: d.city || "",
          postcode: d.postcode || "",
          country: d.country || "United Kingdom",
          website: d.website || "",
          vat_number: d.vat_number || "",
          company_reg_number: d.company_reg_number || "",
        });
        // Resume from where left off
        if (d.step_completed > 0) setStep(Math.min(d.step_completed + 1, 4));
        if (d.services_selected) setSelectedServices(d.services_selected);
        if (d.event_requirements) setS3({ ...s3, ...d.event_requirements });
        // Pre-fill contact if exists
        const primary = d.contacts?.find((c: any) => c.is_primary);
        if (primary) setS4(sv => ({ ...sv, full_name: primary.full_name || "", email: primary.email || "", job_title: primary.job_title || "", phone: primary.phone || "" }));
      } catch (e: any) { setError(e.message); }
      setLoading(false);
    })();
  }, [token]);

  async function saveStep(stepNum: number, stepData: any) {
    setSubmitting(true);
    try {
      await apiFetch("PATCH", `/api/onboarding/${token}/step`, { step: stepNum, data: stepData });
      setStep(stepNum + 1);
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  }

  async function completeOnboarding() {
    if (!s4.agree_terms || !s4.agree_data) return alert("Please accept the required agreements to continue.");
    if (!s4.full_name || !s4.email) return alert("Your name and email are required.");
    setSubmitting(true);
    try {
      await apiFetch("POST", `/api/onboarding/${token}/complete`, {
        agreement_signed: true,
        primary_contact: { full_name: s4.full_name, job_title: s4.job_title, email: s4.email, phone: s4.phone },
      });
      setCompleted(true);
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  }

  function toggleService(s: string) {
    setSelectedServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  const S = {
    page: { minHeight: "100vh", background: "linear-gradient(135deg, #3D0B0B 0%, #1A0A0E 50%, #0d0608 100%)", fontFamily: "'Poppins', sans-serif", color: "#fff", padding: "32px 16px" },
    card: { maxWidth: 640, margin: "0 auto", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "36px 40px" },
    btn: { background: "#7B2142", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", minWidth: 120 },
    btnGhost: { background: "transparent", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "12px 24px", fontSize: 14, cursor: "pointer" },
  };

  if (loading) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <img src={logoPath} alt="Event Perfekt" style={{ height: 60, marginBottom: 20, borderRadius: 8 }} />
        <div style={{ color: "#E2C87A", fontSize: 16 }}>Loading your onboarding...</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={S.card}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ color: "#E2C87A", marginBottom: 8 }}>Link Not Found</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{error}</p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>This link may have expired or been used already. Contact <a href="mailto:info@eventperfekt.com" style={{ color: "#E2C87A" }}>info@eventperfekt.com</a> for help.</p>
        </div>
      </div>
    </div>
  );

  if (completed) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={S.card}>
        <div style={{ textAlign: "center" }}>
          <img src={logoPath} alt="Event Perfekt" style={{ height: 56, marginBottom: 24, borderRadius: 8 }} />
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#22c55e20", border: "2px solid #22c55e",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32 }}>✓</div>
          <h2 style={{ color: "#E2C87A", fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Onboarding Complete!</h2>
          <p style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 8 }}>
            Thank you, {s4.full_name || data?.organisation_name}. Your onboarding has been submitted successfully.
          </p>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.6 }}>
            A member of the Event Perfekt team will be in touch shortly to schedule your consultation call and discuss next steps.
          </p>
          <div style={{ marginTop: 28, padding: 20, background: "rgba(226,200,122,0.08)", border: "1px solid rgba(226,200,122,0.2)", borderRadius: 10 }}>
            <div style={{ color: "#E2C87A", fontSize: 13, marginBottom: 4 }}>Need to get in touch?</div>
            <a href="mailto:info@eventperfekt.com" style={{ color: "#fff", fontSize: 14 }}>info@eventperfekt.com</a>
          </div>
          <div style={{ marginTop: 24, color: "rgba(255,255,255,0.3)", fontSize: 12, fontStyle: "italic" }}>...making yours perfekt</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <img src={logoPath} alt="Event Perfekt" style={{ height: 52, borderRadius: 8 }} />
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 6, fontStyle: "italic" }}>...making yours perfekt</div>
      </div>

      <div style={S.card}>
        {/* Progress Steps */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 36, position: "relative" }}>
          <div style={{ position: "absolute", top: 18, left: "calc(10% + 18px)", right: "calc(10% + 18px)",
            height: 2, background: "rgba(255,255,255,0.1)", zIndex: 0 }} />
          <Step n={1} label="Company Details" active={step === 1} done={step > 1} />
          <Step n={2} label="Services" active={step === 2} done={step > 2} />
          <Step n={3} label="Event Brief" active={step === 3} done={step > 3} />
          <Step n={4} label="Sign Off" active={step === 4} done={false} />
        </div>

        {/* Welcome Banner (Step 1 only) */}
        {step === 1 && (
          <div style={{ background: "rgba(226,200,122,0.08)", border: "1px solid rgba(226,200,122,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
            <div style={{ color: "#E2C87A", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Welcome, {data?.organisation_name}!</div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.6 }}>
              We're excited to start working with you. This short onboarding form helps us understand your organisation and event requirements so we can deliver an exceptional service from day one.
            </div>
          </div>
        )}

        {/* ─── STEP 1: Company Details ────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Confirm Your Organisation Details</h2>
            <Input label="Organisation Name" required value={s1.organisation_name} onChange={(e: any) => setS1({ ...s1, organisation_name: e.target.value })} placeholder="Company Ltd" />
            <Input label="Address Line 1" value={s1.address_line1} onChange={(e: any) => setS1({ ...s1, address_line1: e.target.value })} placeholder="Street address" />
            <Input label="Address Line 2" value={s1.address_line2} onChange={(e: any) => setS1({ ...s1, address_line2: e.target.value })} placeholder="Floor, building, district" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Input label="City" value={s1.city} onChange={(e: any) => setS1({ ...s1, city: e.target.value })} placeholder="London" />
              <Input label="Postcode" value={s1.postcode} onChange={(e: any) => setS1({ ...s1, postcode: e.target.value })} placeholder="SW1A 1AA" />
            </div>
            <Select label="Country" value={s1.country} onChange={(e: any) => setS1({ ...s1, country: e.target.value })}>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Nigeria">Nigeria</option>
              <option value="United States">United States</option>
              <option value="Canada">Canada</option>
              <option value="Other">Other</option>
            </Select>
            <Input label="Website" value={s1.website} onChange={(e: any) => setS1({ ...s1, website: e.target.value })} placeholder="https://yourcompany.com" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Input label="Company Reg No." value={s1.company_reg_number} onChange={(e: any) => setS1({ ...s1, company_reg_number: e.target.value })} placeholder="12345678" />
              <Input label="VAT Number (optional)" value={s1.vat_number} onChange={(e: any) => setS1({ ...s1, vat_number: e.target.value })} placeholder="GB 123456789" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button style={S.btn} disabled={submitting || !s1.organisation_name.trim()}
                onClick={() => saveStep(1, s1)}>
                {submitting ? "Saving..." : "Next →"}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Services ───────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>What services are you interested in?</h2>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 24 }}>Select all that apply. This helps us assign the right team to your account.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {SERVICES.map(s => (
                <div key={s} onClick={() => toggleService(s)}
                  style={{ padding: "12px 16px", borderRadius: 8, cursor: "pointer",
                    background: selectedServices.includes(s) ? "rgba(123,33,66,0.4)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selectedServices.includes(s) ? "#E2C87A" : "rgba(255,255,255,0.1)"}`,
                    transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                      background: selectedServices.includes(s) ? "#7B2142" : "transparent",
                      border: `2px solid ${selectedServices.includes(s) ? "#E2C87A" : "rgba(255,255,255,0.25)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10 }}>
                      {selectedServices.includes(s) ? "✓" : ""}
                    </div>
                    <span style={{ fontSize: 13, color: selectedServices.includes(s) ? "#fff" : "rgba(255,255,255,0.7)" }}>{s}</span>
                  </div>
                </div>
              ))}
            </div>
            {selectedServices.includes("Other") && (
              <Input label="Please specify" value={otherService} onChange={(e: any) => setOtherService(e.target.value)} placeholder="Describe the service you need" />
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <button style={S.btnGhost} onClick={() => setStep(1)}>← Back</button>
              <button style={{ ...S.btn, opacity: selectedServices.length === 0 ? 0.5 : 1 }}
                disabled={submitting || selectedServices.length === 0}
                onClick={() => saveStep(2, { services_selected: selectedServices.includes("Other") ? [...selectedServices.filter(s => s !== "Other"), otherService].filter(Boolean) : selectedServices })}>
                {submitting ? "Saving..." : "Next →"}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Event Brief ────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Tell us about your event</h2>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 24 }}>These details help us prepare for your consultation and create a personalised proposal.</p>
            <Input label="Event Name / Working Title" value={s3.event_name} onChange={(e: any) => setS3({ ...s3, event_name: e.target.value })} placeholder="e.g. Annual Company Conference 2026" />
            <Input label="Preferred Date or Period" value={s3.event_date_preference} onChange={(e: any) => setS3({ ...s3, event_date_preference: e.target.value })} placeholder="e.g. June 2026 or 12 Sept 2026" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Select label="Expected Guest Numbers" value={s3.event_size} onChange={(e: any) => setS3({ ...s3, event_size: e.target.value })}>
                <option value="">Select range...</option>
                {EVENT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Select label="Budget Range" value={s3.budget_range} onChange={(e: any) => setS3({ ...s3, budget_range: e.target.value })}>
                <option value="">Select range...</option>
                {BUDGETS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <Select label="Timeline to Event" value={s3.timeline} onChange={(e: any) => setS3({ ...s3, timeline: e.target.value })}>
              <option value="">How soon?</option>
              {TIMELINES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Input label="Venue Preference (if any)" value={s3.venue_preference} onChange={(e: any) => setS3({ ...s3, venue_preference: e.target.value })} placeholder="e.g. London hotel, outdoor, virtual, no preference" />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.8)", fontSize: 13, marginBottom: 6 }}>Any additional information for our team?</label>
              <textarea value={s3.additional_notes} onChange={(e: any) => setS3({ ...s3, additional_notes: e.target.value })}
                placeholder="Special requirements, themes, branding notes, dietary needs, accessibility requirements..."
                rows={4} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8, color: "#fff", padding: "10px 14px", fontSize: 14, boxSizing: "border-box",
                  resize: "vertical", outline: "none", fontFamily: "Poppins, sans-serif" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <button style={S.btnGhost} onClick={() => setStep(2)}>← Back</button>
              <button style={S.btn} disabled={submitting}
                onClick={() => saveStep(3, { event_requirements: s3 })}>
                {submitting ? "Saving..." : "Next →"}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Sign Off ───────────────────────────────────────── */}
        {step === 4 && (
          <div>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Almost there — your details & agreement</h2>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 24 }}>Confirm your contact details as the primary point of contact for this engagement.</p>
            <Input label="Your Full Name" required value={s4.full_name} onChange={(e: any) => setS4({ ...s4, full_name: e.target.value })} placeholder="Jane Smith" />
            <Input label="Your Job Title" value={s4.job_title} onChange={(e: any) => setS4({ ...s4, job_title: e.target.value })} placeholder="Director of Events" />
            <Input label="Email Address" required type="email" value={s4.email} onChange={(e: any) => setS4({ ...s4, email: e.target.value })} placeholder="jane@company.com" />
            <Input label="Phone Number" value={s4.phone} onChange={(e: any) => setS4({ ...s4, phone: e.target.value })} placeholder="+44 7700 000000" />
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
              <div style={{ color: "#E2C87A", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Agreements</div>
              <Checkbox
                label="I confirm the information provided is accurate and I am authorised to enter into an engagement with Event Perfekt on behalf of my organisation."
                checked={s4.agree_terms}
                onChange={() => setS4(v => ({ ...v, agree_terms: !v.agree_terms }))}
              />
              <Checkbox
                label={<>I consent to Event Perfekt processing my personal data in accordance with their <a href="/privacy-policy" target="_blank" style={{ color: "#E2C87A" }}>Privacy Policy</a> and applicable data protection legislation (UK GDPR / NDPR).</>}
                checked={s4.agree_data}
                onChange={() => setS4(v => ({ ...v, agree_data: !v.agree_data }))}
              />
              <Checkbox
                label="I am happy for Event Perfekt to contact me regarding my event planning requirements and relevant updates."
                checked={s4.agree_contact}
                onChange={() => setS4(v => ({ ...v, agree_contact: !v.agree_contact }))}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <button style={S.btnGhost} onClick={() => setStep(3)}>← Back</button>
              <button style={{ ...S.btn, opacity: (!s4.agree_terms || !s4.agree_data || !s4.full_name || !s4.email) ? 0.5 : 1 }}
                disabled={submitting || !s4.agree_terms || !s4.agree_data || !s4.full_name || !s4.email}
                onClick={completeOnboarding}>
                {submitting ? "Submitting..." : "Complete Onboarding ✓"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: 28, color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
        Event Perfekt Management Services Limited | Event Perfekt Global Ltd
        <br />© {new Date().getFullYear()} Event Perfekt. All rights reserved.
      </div>
    </div>
  );
}
