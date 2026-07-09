import { useState, useEffect } from "react";

const STORAGE_KEY = "ep_portal_cookie_consent";
const BURGUNDY = "#3D0B0B";
const GOLD = "#C9A84C";

type Policy = "privacy" | "cookies" | "terms" | null;

function PolicyModal({ type, onClose }: { type: Policy; onClose: () => void }) {
  if (!type) return null;

  const content: Record<NonNullable<Policy>, { title: string; body: React.ReactNode }> = {
    privacy: {
      title: "Privacy Policy",
      body: (
        <>
          <p><strong>Last updated: April 2026</strong></p>
          <p>Event Perfekt Global Ltd ("we", "us") operates this client portal. This policy explains how we collect and use your personal data.</p>
          <h4>What we collect</h4>
          <ul>
            <li>Your name, email address and organisation when you register</li>
            <li>Project activity, messages, approvals and document interactions within the portal</li>
            <li>Technical data (IP address, browser type) for security and performance</li>
          </ul>
          <h4>How we use it</h4>
          <ul>
            <li>To provide and manage your access to the client portal</li>
            <li>To share project updates, documents and invoices with you</li>
            <li>To communicate with you about your project</li>
            <li>To send you information about our services, offers and products we think may be of interest to you</li>
            <li>To meet our legal and contractual obligations</li>
          </ul>
          <h4>Marketing</h4>
          <p>With your consent, we may use your contact details to send you news, updates and promotional information about Event Perfekt's services and products. You can opt out of marketing communications at any time by contacting us at <strong>info@eventperfekt.com</strong> or clicking "unsubscribe" in any email we send you. Opting out of marketing will not affect your access to the portal or the delivery of your project.</p>
          <h4>Legal basis</h4>
          <p>We process your data under contract (to deliver our services to you), legitimate interests (portal security, service improvement and direct marketing to existing clients), and consent (where required for marketing communications).</p>
          <h4>Retention</h4>
          <p>We retain your data for the duration of your project engagement and up to 6 years thereafter for legal and financial record-keeping.</p>
          <h4>Your rights</h4>
          <p>Under UK GDPR you have the right to access, correct, or delete your data, and to object to processing. Contact us at <strong>info@eventperfekt.com</strong>.</p>
          <h4>Contact</h4>
          <p>Event Perfekt Global Ltd, 20 Wenlock Road, London, N1 7PG<br />Email: info@eventperfekt.com</p>
        </>
      ),
    },
    cookies: {
      title: "Cookie Policy",
      body: (
        <>
          <p><strong>Last updated: April 2026</strong></p>
          <p>This portal uses cookies and similar technologies to function correctly and improve your experience.</p>
          <h4>Essential cookies</h4>
          <p>These are strictly necessary for the portal to work. They manage your login session and security tokens. You cannot opt out of these.</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 8 }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ padding: "6px 10px", textAlign: "left", border: "1px solid #e5e7eb" }}>Cookie</th>
                <th style={{ padding: "6px 10px", textAlign: "left", border: "1px solid #e5e7eb" }}>Purpose</th>
                <th style={{ padding: "6px 10px", textAlign: "left", border: "1px solid #e5e7eb" }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "6px 10px", border: "1px solid #e5e7eb" }}>ep_portal_token</td>
                <td style={{ padding: "6px 10px", border: "1px solid #e5e7eb" }}>Keeps you logged in</td>
                <td style={{ padding: "6px 10px", border: "1px solid #e5e7eb" }}>7 days</td>
              </tr>
              <tr>
                <td style={{ padding: "6px 10px", border: "1px solid #e5e7eb" }}>ep_portal_cookie_consent</td>
                <td style={{ padding: "6px 10px", border: "1px solid #e5e7eb" }}>Remembers your cookie choice</td>
                <td style={{ padding: "6px 10px", border: "1px solid #e5e7eb" }}>1 year</td>
              </tr>
            </tbody>
          </table>
          <h4 style={{ marginTop: 16 }}>Analytics &amp; optional cookies</h4>
          <p>We do not currently use any analytics or advertising cookies on this portal.</p>
          <h4>Managing cookies</h4>
          <p>You can delete cookies at any time through your browser settings. Deleting essential cookies will log you out of the portal.</p>
        </>
      ),
    },
    terms: {
      title: "Terms of Use",
      body: (
        <>
          <p><strong>Last updated: April 2026</strong></p>
          <p>By accessing this client portal you agree to these terms.</p>
          <h4>Access</h4>
          <p>This portal is for authorised clients of Event Perfekt Global Ltd only. Your login credentials are personal and must not be shared.</p>
          <h4>Acceptable use</h4>
          <ul>
            <li>Do not attempt to access areas of the portal you are not authorised for</li>
            <li>Do not use the portal to upload harmful, illegal or offensive content</li>
            <li>Do not reverse-engineer or attempt to extract underlying data or systems</li>
          </ul>
          <h4>Intellectual property</h4>
          <p>All materials shared through this portal (documents, designs, reports) remain the property of Event Perfekt Global Ltd or their respective owners unless otherwise agreed in your contract.</p>
          <h4>Availability</h4>
          <p>We aim to keep the portal available at all times but cannot guarantee uninterrupted access. We are not liable for any loss caused by downtime.</p>
          <h4>Governing law</h4>
          <p>These terms are governed by English law. Any disputes are subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          <h4>Contact</h4>
          <p>Event Perfekt Global Ltd, 20 Wenlock Road, London, N1 7PG<br />Email: info@eventperfekt.com</p>
        </>
      ),
    },
  };

  const { title, body } = content[type];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 14, maxWidth: 640, width: "100%",
        maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
      }} onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: BURGUNDY, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Event Perfekt Global Ltd</div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1f2937" }}>{title}</h2>
          </div>
          <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>×</button>
        </div>
        {/* Modal body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
          <style>{`
            .ep-policy h4 { font-size: 14px; font-weight: 700; color: #1f2937; margin: 16px 0 6px; }
            .ep-policy p, .ep-policy li { margin: 0 0 8px; }
            .ep-policy ul { padding-left: 18px; }
          `}</style>
          <div className="ep-policy">{body}</div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>
          <button onClick={onClose} style={{ background: BURGUNDY, color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

export function PolicyLinks({ light = false }: { light?: boolean }) {
  const [open, setOpen] = useState<Policy>(null);
  const color = light ? "rgba(255,255,255,0.5)" : "#9ca3af";
  const linkColor = light ? GOLD : BURGUNDY;

  return (
    <>
      <PolicyModal type={open} onClose={() => setOpen(null)} />
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", fontSize: 11 }}>
        {([["privacy","Privacy Policy"],["cookies","Cookie Policy"],["terms","Terms of Use"]] as [Policy, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setOpen(key)}
            style={{ background: "none", border: "none", color: linkColor, fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "inherit", textDecoration: "underline", opacity: 0.8 }}>
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState<Policy>(null);

  useEffect(() => {
    const choice = localStorage.getItem(STORAGE_KEY);
    if (!choice) setVisible(true);
  }, []);

  const accept = (type: "all" | "essential") => {
    localStorage.setItem(STORAGE_KEY, type);
    setVisible(false);
  };

  if (!visible) return <PolicyModal type={open} onClose={() => setOpen(null)} />;

  return (
    <>
      <PolicyModal type={open} onClose={() => setOpen(null)} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9000,
        background: "#fff", borderTop: `3px solid ${BURGUNDY}`,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
        padding: "18px 24px",
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        fontFamily: "'Poppins', sans-serif",
      }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#1f2937" }}>🍪 Cookie &amp; Privacy Notice</p>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
            We use essential cookies to keep you signed in and operate this portal securely. Your data is processed in line with our{" "}
            <button onClick={() => setOpen("privacy")} style={{ background: "none", border: "none", color: BURGUNDY, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit", textDecoration: "underline" }}>Privacy Policy</button>
            {" "}and{" "}
            <button onClick={() => setOpen("cookies")} style={{ background: "none", border: "none", color: BURGUNDY, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit", textDecoration: "underline" }}>Cookie Policy</button>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={() => accept("essential")}
            style={{ padding: "9px 18px", background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Essential Only
          </button>
          <button onClick={() => accept("all")}
            style={{ padding: "9px 18px", background: BURGUNDY, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Accept All
          </button>
        </div>
      </div>
    </>
  );
}
