import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";

const PASSWORDS = ["EPGrant2026", "Grantify2026"];
const SESSION_KEY = "grant_app_auth";
const GOLD = "#8B1538";
const BG = "#0A0A0A";
const CARD = "#1A1A1A";
const CARD2 = "#141414";

function Badge({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      display: "inline-block",
      background: GOLD,
      color: "#fff",
      fontSize: "0.65rem",
      fontWeight: 800,
      letterSpacing: "0.2em",
      padding: "6px 14px",
      borderRadius: 3,
      textTransform: "uppercase",
      fontFamily: "'Poppins', sans-serif",
      ...style,
    }}>{children}</span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff", marginBottom: 8, fontFamily: "'Poppins', sans-serif" }}>
      {children}
    </h2>
  );
}

function GoldCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: CARD,
      borderLeft: `4px solid ${GOLD}`,
      borderRadius: 6,
      padding: "24px 28px",
      ...style,
    }}>{children}</div>
  );
}

function DarkCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: CARD, borderRadius: 8, padding: "28px", ...style }}>
      {children}
    </div>
  );
}

function Check({ gold }: { gold?: boolean }) {
  return <span style={{ color: gold ? GOLD : "#22c55e", marginRight: 10, fontWeight: 700 }}>✓</span>;
}

// ─── PASSWORD GATE ────────────────────────────────────────────────────────────

function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = pw.trim();
    if (PASSWORDS.some(pass => pass.toLowerCase() === normalized.toLowerCase())) {
      sessionStorage.setItem(SESSION_KEY, "true");
      onAuth();
    } else {
      setError("Invalid access code. Please contact info@eventperfekt.com");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: BG,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Poppins', sans-serif",
      padding: "40px 20px",
    }}>
      <div style={{ textAlign: "center", maxWidth: 460, width: "100%" }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", letterSpacing: "0.05em" }}>
            Event Perfekt Group
          </div>
        </div>

        {/* Badge */}
        <div style={{ marginBottom: 28 }}>
          <Badge>Confidential — R&D Grant Application</Badge>
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>
          Innovation and R&D Grant Application
        </h1>
        <p style={{ color: "#888", fontSize: "0.9rem", margin: "0 0 40px", lineHeight: 1.6 }}>
          Please enter your access code to view this document
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <input
            type={showPassword ? "text" : "password"}
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Access code"
            autoComplete="off"
            style={{
              width: "100%",
              background: "#111",
              border: "1px solid #333",
              borderRadius: 6,
              padding: "14px 18px",
              color: "#fff",
              fontSize: "1rem",
              fontFamily: "'Poppins', sans-serif",
              outline: "none",
              marginBottom: 16,
              boxSizing: "border-box",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              color: "#bbb",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 16,
              textAlign: "left",
              padding: 0,
            }}
          >
            {showPassword ? "Hide password" : "See password"}
          </button>
          <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: 16, textAlign: "left" }}>
            Passwords are case-insensitive.
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(SESSION_KEY);
              setPw("");
              setError("");
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#888",
              fontSize: "0.75rem",
              cursor: "pointer",
              marginBottom: 16,
              padding: 0,
              textDecoration: "underline",
            }}
          >
            Reset access code
          </button>
          {error && (
            <p style={{ color: "#f87171", fontSize: "0.82rem", marginBottom: 16, textAlign: "left" }}>{error}</p>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              background: GOLD,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "14px",
              fontSize: "0.9rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "'Poppins', sans-serif",
              cursor: "pointer",
            }}
          >
            Access Document
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── MAIN DOCUMENT ────────────────────────────────────────────────────────────

function GrantDocument({ onClear }: { onClear: () => void }) {
  const sec = { maxWidth: 1100, margin: "0 auto", padding: "72px 40px" };
  const dim = { color: "#888", fontSize: "0.85rem" };

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Poppins', sans-serif", color: "#fff" }}>

      {/* TOP BAR */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#0D0D0D",
        borderBottom: "1px solid #222",
        padding: "0 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 48,
      }}>
        <span style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 400, letterSpacing: "0.02em" }}>
          Event Perfekt Global Ltd — R&D Grant Application — April 2026
        </span>
        <span style={{ fontSize: "0.65rem", fontWeight: 800, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Confidential — R&D Grant Application
        </span>
      </div>

      {/* ── SECTION 1: COVER ─────────────────────────────────── */}
      <div style={{ background: "#050505", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ ...sec, textAlign: "center", padding: "100px 40px 80px" }}>
          <div style={{ marginBottom: 28 }}>
            <Badge>UK Registered SME — R&D Grant Application</Badge>
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 800, color: "#fff", margin: "0 0 20px", lineHeight: 1.15 }}>
            Event Perfekt Global Platform Suite
          </h1>
          <p style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "#bbb", maxWidth: 780, margin: "0 auto 32px", lineHeight: 1.7 }}>
            UK technology that opens African markets for UK businesses — creating UK jobs, UK exports, and UK-owned IP in a corridor where the UK is currently losing ground to China and the UAE.
          </p>
          <p style={{ fontSize: "0.8rem", color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Event Perfekt Global Ltd &nbsp;|&nbsp; UK Registered &nbsp;|&nbsp; April 2026
          </p>
        </div>
      </div>

      {/* ── SECTION 2: THE APPLICANT ─────────────────────────── */}
      <div style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <GoldCard>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>The Applicant</p>
            <SectionHeading>About Event Perfekt Global Ltd</SectionHeading>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
              {[
                { title: "UK Registered SME", body: "UK-registered company building UK technology for UK businesses — eligible for R&D grant funding at 70% SME rate." },
                { title: "Active Government Contract", body: "Active UK Government contract delivering Africa programmes across 9+ countries — proves UK delivery capability at institutional level." },
                { title: "Live UK Platforms", body: "Operational UK platforms supporting trade and payment delivery — not a concept, not a prototype." },
                { title: "UK Team and IP", body: "Every component built in the UK, owned by a UK company, serving UK businesses — all IP and revenue returns to the UK." },
              ].map(c => (
                <div key={c.title} style={{ background: CARD2, borderRadius: 6, padding: "20px 22px" }}>
                  <p style={{ fontSize: "0.78rem", fontWeight: 700, color: GOLD, margin: "0 0 8px" }}>{c.title}</p>
                  <p style={{ ...dim, margin: 0, lineHeight: 1.6 }}>{c.body}</p>
                </div>
              ))}
            </div>
            <p style={{ color: "#bbb", fontSize: "0.9rem", lineHeight: 1.7, margin: 0 }}>
              Event Perfekt Global Ltd is the applicant, the contract holder, the platform builder, and the matched funding contributor. Everything in this application is owned and delivered by one UK-registered entity.
            </p>
          </GoldCard>
        </div>
      </div>

      {/* ── SECTION 3: EXECUTIVE SUMMARY ─────────────────────── */}
      <div style={{ background: "#050505", borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Executive Summary</p>
          <SectionHeading>The Investment Case at a Glance</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginTop: 32 }}>
            {[
              { label: "The UK Opportunity", body: "Over 50,000 UK SMEs want to trade with Africa. They cannot do it safely. China, the UAE, and Turkey are filling the gap. This grant funds the UK technology that changes that." },
              { label: "The Funding Ask", body: "R&D grant funding to build the verification engine and compliance automation layer — UK technology that makes African markets accessible to UK businesses at scale." },
              { label: "Why the UK Cannot Wait", body: "DCTS expansion has opened the trade route. UK SMEs have no compliant UK-built tool to use it. Every month without this platform is market share the UK does not recover." },
            ].map(c => (
              <GoldCard key={c.label}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 10px" }}>{c.label}</p>
                <p style={{ color: "#bbb", fontSize: "0.88rem", lineHeight: 1.7, margin: 0 }}>{c.body}</p>
              </GoldCard>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 4: THE PROBLEM ───────────────────────────── */}
      <div style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>The Problem</p>
          <SectionHeading>Three Problems Locking UK Businesses Out of a £36 Billion Market</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginTop: 32 }}>
            {[
              { title: "UK Businesses Cannot Verify African Trade Partners", body: "Existing marketplaces list suppliers. They do not verify them. UK SMEs attempting Africa trade without verified partners face fraud, non-delivery, and reputational damage. No UK commercial product aggregates and cross-references the 11 different African national company registries required to verify counterparties." },
              { title: "UK Businesses Cannot Afford Africa Compliance", body: "KYC AML and sanctions screening for Africa payment corridors takes 3–6 months and costs £10,000–£50,000 per transaction. Existing compliance tools are calibrated for Western market data structures — they fail on African counterparty structures. No automated UK solution handles this." },
              { title: "UK Businesses Cannot Move Money to Africa Compliantly at Scale", body: "Payment rails exist but they move money without verifying the recipient or managing compliance end to end. UK businesses bear the compliance burden themselves. Most cannot. So most do not trade." },
            ].map(c => (
              <DarkCard key={c.title}>
                <div style={{ fontSize: "1.5rem", marginBottom: 14 }}>🔴</div>
                <p style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", margin: "0 0 10px" }}>{c.title}</p>
                <p style={{ ...dim, margin: 0, lineHeight: 1.65 }}>{c.body}</p>
              </DarkCard>
            ))}
          </div>
          <div style={{ marginTop: 32, padding: "20px 28px", background: "#1a0a0a", borderRadius: 6, borderLeft: `4px solid #dc2626` }}>
            <p style={{ fontWeight: 700, color: "#fff", margin: 0, fontSize: "0.95rem" }}>
              No UK platform solves all three together. That is what we are building.
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 5: POLICY ALIGNMENT ──────────────────────── */}
      <div style={{ background: "#050505", borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Policy Alignment</p>
          <SectionHeading>The UK Government Has Created the Opportunity — This Grant Funds the Infrastructure</SectionHeading>

          {/* Timeline */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 32, marginBottom: 40 }}>
            {[
              { date: "Jan 2025", body: "UK Government Africa Consultation — 47 African governments asked what they need from the UK. Top answer: compliant trade infrastructure. This platform is the answer." },
              { date: "Jun 2025", body: "UK Trade Strategy — DCTS expanded. Nigeria duty-free UK access on 85%+ of exports. UK SMEs need a compliant route to trade back. This platform is the route." },
              { date: "Dec 2025", body: "UK New Africa Approach — UK declares moving from donor to investor. Investment requires infrastructure. This is the infrastructure." },
              { date: "2027", body: "UK G20 Presidency — Africa trade at the centre. The UK needs a platform ready before that moment. This platform is ready." },
            ].map(c => (
              <GoldCard key={c.date} style={{ padding: "20px 22px" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 800, color: GOLD, margin: "0 0 8px" }}>{c.date}</p>
                <p style={{ ...dim, margin: 0, lineHeight: 1.6 }}>{c.body}</p>
              </GoldCard>
            ))}
          </div>

          {/* UK Returns */}
          <p style={{ fontWeight: 700, color: "#fff", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>UK Returns</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {[
              { title: "UK Jobs", body: "12+ direct UK roles. 40+ indirect. 20+ paid UK internships annually. All in fintech and international trade." },
              { title: "UK Exports", body: "500 UK SMEs in African markets within 18 months. £36 million in new UK export revenue from this cohort alone." },
              { title: "UK IP", body: "The engine built in the UK owned by a UK company licensed globally. No competitor has built this. The UK owns the market." },
              { title: "UK Strategic Position", body: "China UAE and Turkey are building Africa trade infrastructure now. This grant gives UK businesses a competitive UK-built alternative before the window closes." },
            ].map(c => (
              <DarkCard key={c.title} style={{ padding: "20px 22px" }}>
                <p style={{ fontWeight: 700, color: "#fff", fontSize: "0.82rem", margin: "0 0 8px" }}>{c.title}</p>
                <p style={{ ...dim, margin: 0, lineHeight: 1.6 }}>{c.body}</p>
              </DarkCard>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 6: OUR SOLUTION ──────────────────────────── */}
      <div style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Our Solution</p>
          <SectionHeading>Two Platforms. One Integrated System.</SectionHeading>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginTop: 32 }}>
            {/* Platform */}
            <DarkCard>
              <p style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", margin: "0 0 20px", borderBottom: `1px solid ${GOLD}`, paddingBottom: 12 }}>
                UK Verified Trade Marketplace
              </p>
              {[
                { title: "Intelligence-Powered Partner Verification", body: "UK businesses find and verify African trade partners before any money moves. The engine cross-references African registries, sanctions lists, and behavioural signals — producing a real-time legitimacy score no other UK platform generates." },
                { title: "Real-Time Corridor Intelligence", body: "Live regulatory and market intelligence across 15+ UK-Africa trade routes — helping UK businesses navigate markets they cannot currently access safely." },
                { title: "Secure Deal Rooms", body: "All due diligence, documentation, and UK-Africa trade communications in one protected UK environment. NDA gating, fee enforcement, and intelligence monitoring built in." },
              ].map(f => (
                <div key={f.title} style={{ marginBottom: 18 }}>
                  <p style={{ fontWeight: 700, color: GOLD, fontSize: "0.82rem", margin: "0 0 4px" }}>{f.title}</p>
                  <p style={{ ...dim, margin: 0, lineHeight: 1.6 }}>{f.body}</p>
                </div>
              ))}
            </DarkCard>

            {/* Payment Gateway */}
            <DarkCard>
              <p style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", margin: "0 0 20px", borderBottom: `1px solid ${GOLD}`, paddingBottom: 12 }}>
                UK Compliance Payment Gateway
              </p>
              <p style={{ ...dim, lineHeight: 1.65, marginBottom: 20 }}>
                The payment gateway sits above FCA-regulated payment rails — Flutterwave, Paysend, Remitly, Atlas Currency — and automates the entire compliance layer so UK businesses can move money to Africa without needing a compliance team.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {["KYC Screening", "AML Checks", "Sanctions Verification", "Regulatory Documentation"].map(p => (
                  <span key={p} style={{ background: "#1a0008", border: `1px solid ${GOLD}`, color: GOLD, fontSize: "0.72rem", fontWeight: 600, padding: "5px 12px", borderRadius: 20 }}>{p}</span>
                ))}
              </div>
              <p style={{ fontWeight: 700, color: "#fff", fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>
                One UK-built, FCA-aligned, auditable payment pathway — automated and scalable.
              </p>
            </DarkCard>
          </div>

          {/* Flow diagram */}
          <div style={{ marginTop: 32, background: CARD2, borderRadius: 8, padding: "24px 28px" }}>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#555", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>Platform Flow</p>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              {["UK Business", "Verified Partner", "Deal Room", "Compliance Gateway", "Compliant Payment"].map((step, i, arr) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ background: "#222", border: `1px solid ${GOLD}`, color: "#fff", fontSize: "0.78rem", fontWeight: 600, padding: "8px 16px", borderRadius: 4 }}>{step}</span>
                  {i < arr.length - 1 && <span style={{ color: GOLD, fontWeight: 700 }}>→</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 7: COMPETITIVE LANDSCAPE ─────────────────── */}
      <div style={{ background: "#050505", borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Competitive Landscape</p>
          <SectionHeading>What Exists Today — and Why It Fails UK Businesses</SectionHeading>
          <div style={{ marginTop: 32, borderRadius: 8, overflow: "hidden", border: "1px solid #222" }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 3fr", background: "#111", padding: "14px 20px", gap: 16 }}>
              {["Platform", "Capability", "Gap for UK Businesses"].map(h => (
                <span key={h} style={{ fontSize: "0.7rem", fontWeight: 700, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {[
              { platform: "Verto FX — UK FCA authorised", capability: "Cross-border payments to Africa", gap: "No partner verification. No trade matching. UK business still finds and verifies partner alone." },
              { platform: "Nilos — Africa-based", capability: "Payment routing across Africa corridors", gap: "Not UK-regulated. No partner verification. Serves African businesses not UK SMEs." },
              { platform: "XTransfer — China-based", capability: "Trade payment facilitation", gap: "Not UK-based. No verification. No compliance gateway. China owns this market if UK does not act." },
              { platform: "PAPSS — Pan-African institutional", capability: "Bank-to-bank settlement across 19 countries", gap: "Not accessible to UK SMEs directly. No partner verification. Infrastructure only." },
              { platform: "Alibaba and TradeIndia — Global marketplaces", capability: "Lists suppliers globally", gap: "No Africa-specific verification. No compliance. No payments." },
              { platform: "ComplyAdvantage — UK compliance tool", capability: "Sanctions and AML screening", gap: "Not integrated with trade matching or payment routing. Calibrated for Western data structures — fails on African counterparties." },
            ].map((r, i) => (
              <div key={r.platform} style={{
                display: "grid", gridTemplateColumns: "2fr 2fr 3fr",
                padding: "16px 20px", gap: 16,
                background: i % 2 === 0 ? CARD : CARD2,
                borderTop: "1px solid #222",
              }}>
                <span style={{ color: "#fff", fontSize: "0.82rem", fontWeight: 500 }}>{r.platform}</span>
                <span style={{ color: "#aaa", fontSize: "0.82rem" }}>{r.capability}</span>
                <span style={{ ...dim, lineHeight: 1.55 }}>{r.gap}</span>
              </div>
            ))}
            {/* Our platform — highlighted row */}
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 2fr 3fr",
              padding: "16px 20px", gap: 16,
              background: "#1a0008",
              borderTop: `2px solid ${GOLD}`,
            }}>
              <span style={{ color: GOLD, fontSize: "0.82rem", fontWeight: 800 }}>UK-built platform suite</span>
              <span style={{ color: "#fff", fontSize: "0.82rem", fontWeight: 600 }}>Partner verification + compliance screening + payment routing</span>
              <span style={{ color: "#fff", fontSize: "0.82rem", fontWeight: 600 }}>The only UK platform combining all three for Africa corridors.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 8: INNOVATION CASE ───────────────────────── */}
      <div style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Innovation Case</p>
          <SectionHeading>Why This Is Genuinely New UK Research and Development</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 32 }}>
            {[
              { title: "Integrated UK System — First of Its Kind", body: "No UK platform combines verified trade partner matching, automated compliance screening, and cross-border payment routing for Africa. Three existing UK solutions address these separately. We integrate them. The integration is the UK innovation." },
              { title: "UK-Built Verification Engine", body: "Cross-references 11 African national company registries, sanctions lists, beneficial ownership databases, and behavioural trading signals. The aggregation layer and scoring model do not exist as commercial products anywhere. This is original UK R&D." },
              { title: "UK-Built Automated Compliance Gateway", body: "KYC AML and sanctions screening calibrated specifically for African counterparty data structures — nominee directors, cross-border holding companies, informal ownership. Existing UK tools fail on these structures. This is original investigation." },
              { title: "UK-Built Corridor Intelligence Layer", body: "Live aggregation of regulatory changes and sanctions updates across 11 African territories feeding the verification engine and compliance gateway in real time. No UK commercial data feed covers all 11 territories at this granularity." },
              { title: "UK First-Mover Advantage", body: "12-month lead time to build. Patent application planned. UK financial institutions will license this. The UK builds it first or imports it from China or the UAE later." },
            ].map(c => (
              <GoldCard key={c.title} style={{ padding: "18px 24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span style={{ color: GOLD, fontWeight: 800, fontSize: "1.1rem", flexShrink: 0 }}>✦</span>
                <div>
                  <p style={{ fontWeight: 700, color: "#fff", fontSize: "0.88rem", margin: "0 0 4px" }}>{c.title}</p>
                  <p style={{ ...dim, margin: 0, lineHeight: 1.6 }}>{c.body}</p>
                </div>
              </GoldCard>
            ))}
          </div>
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <Badge>This meets the Innovate UK definition of Industrial Research — original investigation directed towards a specific practical aim.</Badge>
          </div>
        </div>
      </div>

      {/* ── SECTION 9: COMMERCIAL VALIDATION ─────────────────── */}
      <div style={{ background: "#050505", borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Commercial Validation</p>
          <SectionHeading>De-Risked UK R&D — Already Proven at Scale</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 32 }}>
            {[
              { title: "Live UK Government Contract", body: "Active UK Government contract — Africa Regional Support — 9+ African countries — active and ongoing. This is not a startup pitch. This is a UK government-contracted delivery organisation with proven Africa operational capability and institutional accountability." },
              { title: "Live UK Platforms", body: "Operational UK platforms with active UK and West Africa members. UK-Africa trade transactions are being facilitated and revenue generation has commenced." },
              { title: "UK Institutional Track Record", body: "The founding Director brings 15+ years senior delivery across central government and FCA-regulated institutions. This team has delivered at scale. They will deliver again." },
            ].map(c => (
              <DarkCard key={c.title}>
                <p style={{ fontSize: "1.4rem", marginBottom: 12 }}><Check /></p>
                <p style={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem", margin: "0 0 8px" }}>{c.title}</p>
                <p style={{ ...dim, margin: 0, lineHeight: 1.65 }}>{c.body}</p>
              </DarkCard>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 10: ECONOMIC IMPACT ──────────────────────── */}
      <div style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Economic Impact</p>
          <SectionHeading>What the UK Gets Back</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 32 }}>
            {[
              { value: "12+", label: "Direct UK Jobs within 24 months" },
              { value: "40+", label: "Indirect UK supply chain roles" },
              { value: "500", label: "UK SMEs in new export markets within 18 months" },
              { value: "£4.70", label: "UK export value per £1 of grant within 36 months" },
              { value: "11", label: "African territories opened to UK businesses" },
              { value: "20+", label: "Paid UK internships annually — already active" },
            ].map(m => (
              <DarkCard key={m.label} style={{ textAlign: "center", padding: "28px 20px" }}>
                <p style={{ fontSize: "2.2rem", fontWeight: 800, color: GOLD, margin: "0 0 8px", lineHeight: 1 }}>{m.value}</p>
                <p style={{ ...dim, margin: 0, lineHeight: 1.5, fontSize: "0.8rem" }}>{m.label}</p>
              </DarkCard>
            ))}
          </div>
          <div style={{ marginTop: 28, background: "#1a0008", border: `1px solid ${GOLD}`, borderRadius: 6, padding: "20px 28px" }}>
            <p style={{ color: GOLD, fontWeight: 700, fontSize: "0.95rem", margin: 0, textAlign: "center" }}>
              Every £1 of this grant projected to unlock £4.70 in UK export value within 36 months — all generated by UK businesses trading through UK-built infrastructure.
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 10B: TECHNOLOGY READINESS ─────────────────── */}
      <div style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Technology Readiness</p>
          <SectionHeading>Technology Readiness Level Statement</SectionHeading>
          <GoldCard style={{ marginTop: 32 }}>
            <p style={{ color: "#bbb", fontSize: "0.95rem", lineHeight: 1.75, margin: 0 }}>
              <strong style={{ color: "#fff" }}>Current TRL:</strong> 4 — technology validated in lab/controlled environment via active UK Government contract.
              <br />
              <strong style={{ color: "#fff" }}>Target TRL at project end:</strong> 7 — system prototype demonstrated in operational environment.
            </p>
          </GoldCard>
        </div>
      </div>

      {/* ── SECTION 11: PROJECT PLAN ──────────────────────────── */}
      <div style={{ background: "#050505", borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Project Plan</p>
          <SectionHeading>Project Plan — 12 Months of UK R&D</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginTop: 32 }}>
            {[
              { month: "Month 3", body: "Verification engine prototype — UK-built, tested against live UK-Africa partner data." },
              { month: "Month 6", body: "Compliance automation layer live — FCA pathway documented — UK businesses can route Africa payments automatically." },
              { month: "Month 9", body: "Full platform integration across 3 pilot territories with live UK business users processing real transactions." },
              { month: "Month 12", body: "Deployed across 11 territories. Independent technical audit. First UK financial institution licensing conversation initiated." },
            ].map(m => (
              <DarkCard key={m.month}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", border: `2px solid ${GOLD}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16,
                }}>
                  <span style={{ color: GOLD, fontSize: "0.65rem", fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{m.month}</span>
                </div>
                <p style={{ color: "#bbb", fontSize: "0.85rem", margin: 0, lineHeight: 1.65 }}>{m.body}</p>
              </DarkCard>
            ))}
          </div>
          <div style={{ marginTop: 28, padding: "16px 24px", background: CARD, borderRadius: 6, display: "flex", gap: 24, flexWrap: "wrap" }}>
            {["12 months", "Industrial Research", "Matched contribution from Event Perfekt Global Ltd"].map(t => (
              <span key={t} style={{ color: "#aaa", fontSize: "0.82rem" }}>
                <span style={{ color: GOLD, marginRight: 6 }}>✦</span>{t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 12: WORKPLAN ─────────────────────────────── */}
      <div style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Workplan</p>
          <SectionHeading>What the Grant Funds — Four UK R&D Workstreams</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 32 }}>
            {[
              { ws: "UK Platform Engineering", body: "Senior UK development resource building and integrating the verification engine across the platform suite. All work carried out in the UK." },
              { ws: "UK Verification Engine", body: "Original UK research developing the proprietary partner legitimacy scoring algorithm — cross-referencing 11 African national registries from a UK base. No existing commercial equivalent." },
              { ws: "UK Compliance Automation Layer", body: "Original UK investigation building FCA-aligned KYC AML and sanctions screening specifically for Africa corridors — calibrated for African data structures no existing UK tool handles." },
              { ws: "UK Market Validation", body: "UK business pilot across Nigeria, Ghana, and Gambia — testing real UK-Africa transactions through the automated compliance layer and iterating based on UK business user feedback." },
            ].map(w => (
              <GoldCard key={w.ws} style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, minWidth: 220 }}>
                  <p style={{ fontWeight: 700, color: "#fff", fontSize: "0.88rem", margin: 0 }}>{w.ws}</p>
                </div>
                <p style={{ ...dim, margin: 0, lineHeight: 1.65 }}>{w.body}</p>
              </GoldCard>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 13: TEAM ─────────────────────────────────── */}
      <div style={{ background: "#050505", borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>The Team</p>
          <SectionHeading>The UK Team Building This</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginTop: 32 }}>
            {[
              { name: "Tolulope Kumolu-Johnson", role: "Founder and Director", body: "15+ years delivery across UK central government and FCA-regulated institutions. LLB Law. PRINCE2 PMP MSP CSM Lean Six Sigma Prosci. Holds active UK Government contract." },
              { name: "Niel Shrivani", role: "Lead Developer", body: "UK platform architecture and verification engine development. All technical delivery carried out in the UK." },
              { name: "Lara Shodimu", role: "Group Risk", body: "UK-based group risk management. Leads FCA compliance framework design." },
              { name: "Olaolu Elias", role: "GDPR and Legal", body: "UK-based data protection and legal governance ensuring UK GDPR and FCA compliance throughout." },
            ].map(t => (
              <DarkCard key={t.name}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1a0008", border: `1px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <span style={{ color: GOLD, fontWeight: 800, fontSize: "1rem" }}>{t.name[0]}</span>
                </div>
                <p style={{ fontWeight: 700, color: "#fff", fontSize: "0.88rem", margin: "0 0 4px" }}>{t.name}</p>
                <p style={{ color: GOLD, fontSize: "0.75rem", fontWeight: 600, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.role}</p>
                <p style={{ ...dim, margin: 0, lineHeight: 1.65 }}>{t.body}</p>
              </DarkCard>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 14: RISK REGISTER ────────────────────────── */}
      <div style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Risk Register</p>
          <SectionHeading>Risk Register and Mitigation Plan</SectionHeading>
          <div style={{ marginTop: 32, borderRadius: 8, overflow: "hidden", border: "1px solid #222" }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 3fr", background: "#111", padding: "14px 20px", gap: 16 }}>
              {["Risk", "Likelihood", "Impact", "Mitigation"].map(h => (
                <span key={h} style={{ fontSize: "0.7rem", fontWeight: 700, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {[
              { risk: "Regulatory change", likelihood: "Medium", impact: "High", mitigation: "Modular UK compliance architecture. Legal function monitors FCA updates in real time. Rapid reconfiguration without rebuild." },
              { risk: "Engine delays", likelihood: "Low", impact: "High", mitigation: "Phased UK milestones. Month 3 prototype checkpoint. Lead Developer sole focus on engine." },
              { risk: "UK business adoption", likelihood: "Medium", impact: "Medium", mitigation: "Active UK Government contract provides immediate UK institutional user base. UK government credibility accelerates onboarding." },
              { risk: "Key person dependency", likelihood: "Low", impact: "High", mitigation: "Distributed UK team. Documented processes. No single point of failure." },
              { risk: "Payment rail withdrawal", likelihood: "Low", impact: "Medium", mitigation: "Platform sits above four FCA-regulated rails. No single dependency." },
            ].map((r, i) => (
              <div key={r.risk} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 3fr",
                padding: "16px 20px", gap: 16,
                background: i % 2 === 0 ? CARD : CARD2,
                borderTop: "1px solid #222",
              }}>
                <span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 500 }}>{r.risk}</span>
                <span style={{ color: r.likelihood === "Low" ? "#22c55e" : "#f59e0b", fontSize: "0.82rem", fontWeight: 600 }}>{r.likelihood}</span>
                <span style={{ color: r.impact === "High" ? "#f87171" : r.impact === "Medium" ? "#f59e0b" : "#22c55e", fontSize: "0.82rem", fontWeight: 600 }}>{r.impact}</span>
                <span style={{ ...dim, lineHeight: 1.55 }}>{r.mitigation}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 15: COMMERCIALISATION ────────────────────── */}
      <div style={{ background: "#050505", borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Commercialisation</p>
          <SectionHeading>UK Revenue After the Grant</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 32 }}>
            {[
              { title: "UK SME Subscriptions", body: "Tiered UK membership for verified trade matching, corridor intelligence, and deal room access. 500 UK members Year 1. 10,000 UK members Year 3." },
              { title: "UK Business Compliance Fees", body: "Per-transaction fees for UK businesses and institutions routing Africa payments through the payment gateway. Scales with UK transaction volume." },
              { title: "UK Financial Institution Licensing", body: "The engine and compliance layer licensed to UK banks and trade finance institutions. Highest-margin revenue stream. All IP and licensing revenue stays in the UK. Target: first UK licensing agreement within 18 months." },
            ].map(c => (
              <GoldCard key={c.title}>
                <p style={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem", margin: "0 0 10px" }}>{c.title}</p>
                <p style={{ ...dim, margin: 0, lineHeight: 1.65 }}>{c.body}</p>
              </GoldCard>
            ))}
          </div>
          <div style={{ marginTop: 24, padding: "16px 24px", background: CARD, borderRadius: 6 }}>
            <p style={{ color: "#888", fontSize: "0.85rem", margin: 0 }}>
              The engine is corridor-agnostic. Once built for Africa it is replicable for South Asia and Latin America — all from a UK base. The UK builds once and licenses globally.
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 16: WHY FUND THIS ────────────────────────── */}
      <div style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div style={sec}>
          <DarkCard style={{ border: `1px solid ${GOLD}`, padding: "40px 48px" }}>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>Why Fund This</p>
            <SectionHeading>Why Fund This — Not Something Else</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 28 }}>
              {[
                { title: "This is UK technology for UK businesses", body: "Every component built in the UK, owned by a UK company, serving UK businesses, generating UK revenue. The Africa corridor is the market. The UK is the beneficiary." },
                { title: "The competition is not other UK companies — it is China and the UAE", body: "They are building Africa trade infrastructure now. Without this grant UK businesses have no compliant UK-built alternative. That is a gap the UK cannot afford." },
                { title: "Genuine UK innovation with no existing alternative", body: "No UK platform combines partner verification, compliance screening, and payment routing for Africa. Three independent R&D components. Each constitutes original UK research. The integration is a UK first." },
                { title: "De-risked UK R&D", body: "Both platforms are live. The UK government contract is active. The team has delivered at scale. This is scaling proven UK infrastructure — not funding an early-stage concept." },
                { title: "The UK return is measurable", body: "12+ UK jobs. 40+ indirect roles. 20+ paid UK internships. 500 UK SMEs in new export markets. £4.70 UK export value per £1 invested. UK-owned IP licensed globally. All within 36 months." },
                { title: "The timing is now", body: "Three UK Government strategies since December 2024 call for exactly this infrastructure. DCTS expansion has opened the trade route. This grant funds the UK tool that makes it usable before China and the UAE make it unnecessary." },
              ].map(p => (
                <div key={p.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <Check gold />
                  <p style={{ color: "#ddd", fontSize: "0.9rem", lineHeight: 1.65, margin: 0 }}>
                    <strong style={{ color: "#fff" }}>{p.title}:</strong> {p.body}
                  </p>
                </div>
              ))}
            </div>
          </DarkCard>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ background: "#050505", borderTop: "1px solid #1a1a1a", padding: "48px 40px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 24, marginBottom: 32 }}>
            <div>
              <p style={{ fontWeight: 800, color: "#fff", fontSize: "1rem", margin: "0 0 8px" }}>Event Perfekt Global Ltd</p>
              <p style={{ color: "#555", fontSize: "0.82rem", lineHeight: 1.8, margin: 0 }}>
                20 Wenlock Road, London, N1 7PG<br />
                Company No. 15875326<br />
                <a href="mailto:info@eventperfekt.com" style={{ color: "#555", textDecoration: "none" }}>info@eventperfekt.com</a>
                {" | "}
                www.eventperfekt.com
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <Badge>Confidential — R&D Grant Application — April 2026</Badge>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ color: "#444", fontSize: "0.75rem", margin: 0 }}>
              © 2026 Event Perfekt Global Ltd. All rights reserved. &nbsp;|&nbsp; CONFIDENTIAL — R&D GRANT APPLICATION — April 2026
            </p>
            <button
              onClick={onClear}
              style={{
                background: "none", border: "none", color: "#444", fontSize: "0.72rem",
                cursor: "pointer", textDecoration: "underline", fontFamily: "'Poppins', sans-serif",
              }}
            >
              Clear Access
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}

// ─── ROOT EXPORT ──────────────────────────────────────────────────────────────

export default function GrantApplication() {
  usePageMeta({
    title: "R&D Grant Application | Event Perfekt Global Ltd",
    description: "Innovation and R&D Grant Application — Event Perfekt Global Ltd",
  });

  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "true") {
      setAuthenticated(true);
    }
  }, []);

  const handleClear = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <PasswordGate onAuth={() => setAuthenticated(true)} />;
  }

  return <GrantDocument onClear={handleClear} />;
}
