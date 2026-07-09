import { usePageMeta } from "@/hooks/use-page-meta";

export default function CaseStudyYouth() {
  usePageMeta({
    title: "From Positioned to Fundable. In Six Weeks. | Event Perfekt Global",
    description: "A six-week strategic and operational consultancy engagement repositioning a UK Registered Charity in youth violence prevention — from positioned to fundable.",
    canonical: "https://eventperfekt.net/case-studies/youth",
  });

  const BURGUNDY = "#330311";
  const BG = "#000000";
  const PANEL = "#111111";
  const BORDER = "#222222";

  return (
    <div style={{ background: BG, color: "#ffffff", fontFamily: "'Poppins', sans-serif", minHeight: "100vh" }}>
      {/* NAVIGATION */}
      <nav style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: BURGUNDY,
        zIndex: 50,
        borderBottom: `1px solid ${BORDER}`
      }}>
        <div style={{ maxWidth: "1020px", margin: "0 auto", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        </div>
      </nav>

      {/* HERO */}
      <div style={{
        position: "relative",
        minHeight: "560px",
        display: "flex",
        alignItems: "flex-end",
        overflow: "hidden",
        marginTop: "60px"
      }}>
        <img
          src="https://images.pexels.com/photos/7646818/pexels-photo-7646818.jpeg?w=1600&auto=format&fit=crop&q=80"
          alt="Youth community engagement"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            filter: "brightness(0.28)",
            zIndex: 1
          }}
        />
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
          zIndex: 2
        }}></div>
        <div style={{
          position: "relative",
          zIndex: 3,
          padding: "64px 32px",
          maxWidth: "1020px",
          margin: "0 auto",
          width: "100%"
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", color: BURGUNDY, marginBottom: "20px" }}>
            Our Work in Action <span style={{ color: "#555" }}>/</span> Case Study
          </div>
          <h1 style={{
            fontSize: "clamp(28px, 4vw, 54px)",
            fontWeight: 800,
            letterSpacing: "-1.5px",
            lineHeight: 1.1,
            marginBottom: "20px",
            maxWidth: "800px"
          }}>
            From Positioned to Fundable.<br />
            <span style={{ color: BURGUNDY }}>In Six Weeks.</span>
          </h1>
          <p style={{
            fontSize: "17px",
            color: "#cccccc",
            maxWidth: "640px",
            lineHeight: 1.85
          }}>
            A six-week consultancy engagement repositioning a UK Registered Charity working in youth violence prevention — building the strategic, operational, and funding-readiness architecture required to enter live conversations with statutory commissioners, charitable trusts, and corporate sponsors.
          </p>
        </div>
      </div>

      {/* CLIENT BAR */}
      <div style={{ background: BURGUNDY, padding: "22px 0" }}>
        <div style={{ maxWidth: "1020px", margin: "0 auto", padding: "0 32px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", justifyContent: "space-between" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.5px", margin: 0 }}>Client: UK Registered Charity — Youth Violence Prevention</p>
            <span style={{ fontSize: "12px", fontWeight: 600, opacity: 0.85, letterSpacing: "0.8px" }}>Six-Week Consultancy Engagement &nbsp;|&nbsp; Strategic, Operational, Funding-Ready</span>
          </div>
        </div>
      </div>

      {/* KEY FACTS PANEL */}
      <div style={{ maxWidth: "1020px", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", border: `1px solid ${BORDER}` }}>
          {[
            { label: "Client Sector", value: "Charity — Youth Violence Prevention" },
            { label: "Engagement Length", value: "6 Consecutive Weeks", burgundy: true },
            { label: "Deliverables Produced", value: "29 Documents across 3 Phases" },
            { label: "Geographic Focus", value: "Three South London Boroughs" },
            { label: "EPG Role", value: "Strategic, Operational, Funding-Readiness Consultancy" }
          ].map((item, i) => (
            <div key={i} style={{
              padding: "22px 28px",
              borderRight: i < 4 ? `1px solid ${BORDER}` : "none",
              flex: 1,
              minWidth: "140px"
            }}>
              <span style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "#888888",
                marginBottom: "6px",
                display: "block"
              }}>
                {item.label}
              </span>
              <span style={{
                fontSize: "14px",
                fontWeight: 700,
                color: item.burgundy ? BURGUNDY : "#ffffff"
              }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 1 — THE ENGAGEMENT */}
      <section style={{ padding: "72px 0", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: "1020px", margin: "0 auto", padding: "0 32px" }}>
          <span style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: BURGUNDY,
            marginBottom: "16px",
            display: "block"
          }}>
            The Engagement
          </span>
          <h2 style={{
            fontSize: "clamp(24px, 3vw, 38px)",
            fontWeight: 800,
            letterSpacing: "-0.8px",
            lineHeight: 1.2,
            marginBottom: "20px"
          }}>
            Strong Intent.<br />
            <span style={{ color: BURGUNDY }}>No Operational Backbone.</span>
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "48px",
            alignItems: "start",
            marginTop: "20px"
          }}>
            <div>
              <p style={{ fontSize: "16px", color: "#bbbbbb", maxWidth: "720px", lineHeight: 1.9, marginBottom: "18px" }}>
                A charity can have ten years of community standing, direct access to at-risk young people, and a clear founding mission — and still not be fundable. Without the operational architecture that funders and statutory commissioners look for, intent does not convert into income.
              </p>
              <p style={{ fontSize: "16px", color: "#bbbbbb", maxWidth: "720px", lineHeight: 1.9, marginBottom: "18px" }}>
                That was the position when this client approached Event Perfekt Global. The charity had community standing, founding mission, and direct access to the young people it wanted to serve. What it did not have was a documented operating model, a referral process, a partner network, a safeguarding architecture, or a funding plan.
              </p>
              <p style={{ fontSize: "16px", color: "#bbbbbb", maxWidth: "720px", lineHeight: 1.9, marginBottom: "18px" }}>
                Six weeks. That was the brief. Take the charity from positioned to fundable.
              </p>
            </div>
            <img
              src="https://images.pexels.com/photos/6647037/pexels-photo-6647037.jpeg?w=800&auto=format&fit=crop&q=80"
              alt="Strategic consultancy session"
              style={{
                width: "100%",
                aspectRatio: "4/3",
                objectFit: "cover",
                filter: "brightness(0.8)",
                display: "block"
              }}
            />
          </div>

          {/* Stats row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "2px",
            background: BORDER,
            border: `1px solid ${BORDER}`,
            marginTop: "52px"
          }}>
            {[
              { num: "6", label: "Weeks" },
              { num: "29", label: "Deliverables" },
              { num: "3", label: "Phases" }
            ].map((stat, i) => (
              <div key={i} style={{
                background: PANEL,
                padding: "32px 28px",
                textAlign: "center"
              }}>
                <span style={{
                  fontSize: "clamp(32px, 4vw, 48px)",
                  fontWeight: 900,
                  color: BURGUNDY,
                  letterSpacing: "-2px",
                  lineHeight: 1,
                  marginBottom: "10px",
                  display: "block"
                }}>
                  {stat.num}
                </span>
                <span style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#888888",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px"
                }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2 — WHAT WE DELIVERED */}
      <section style={{ padding: "72px 0", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: "1020px", margin: "0 auto", padding: "0 32px" }}>
          <span style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: BURGUNDY,
            marginBottom: "16px",
            display: "block"
          }}>
            What We Delivered
          </span>
          <h2 style={{
            fontSize: "clamp(24px, 3vw, 38px)",
            fontWeight: 800,
            letterSpacing: "-0.8px",
            lineHeight: 1.2,
            marginBottom: "20px"
          }}>
            Three Phases. Twenty-Nine Documents.<br />
            <span style={{ color: BURGUNDY }}>One Operating Identity.</span>
          </h2>
          <p style={{
            fontSize: "16px",
            color: "#bbbbbb",
            maxWidth: "720px",
            lineHeight: 1.9,
            marginBottom: "18px"
          }}>
            Six weeks of work delivered across three structured phases. Here is what the scope looked like.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2px",
            background: BORDER,
            border: `1px solid ${BORDER}`,
            marginTop: "52px"
          }}>
            {[
              { num: "01", title: "Strategic Definition", desc: "Repositioning the charity from grant-giver to facilitation and navigation service. Audit of operating identity, gap analysis against fundable charities at scale, website and positioning audit with a fourteen-point change list, market entry roadmap, and a documented proof-of-concept case study." },
              { num: "02", title: "Operating Model & Infrastructure", desc: "Formal referral and intake process across five sourcing channels. Partner identification and outreach architecture. Pro bono professional network framework spanning mental health, legal, mentoring, and pathway specialism. Ambassador model. Audience segmentation across six cohorts." },
              { num: "03", title: "Safeguarding Architecture", desc: "Safeguarding and support structure built to Charity Commission and funder due diligence standards. Seven operational annexes: incident logging, three consent forms, personnel onboarding, partner alignment, statutory contact directory, whistleblowing procedure, and data retention schedule with statutory periods seeded against UK GDPR, IICSA, NSPCC, HMRC, and Charities Act bases." },
              { num: "04", title: "Funding Readiness", desc: "Funding model defining revenue mix across statutory commissioning, charitable trusts, corporate sponsorship, and a Sponsor a Young Person scheme. Target funder and commissioner list. Commissioning pitch narrative. Sponsorship framework. Borough shortlist for first commissioning engagement." },
              { num: "05", title: "Partner Network Activation", desc: "Twenty named partner organisations identified, categorised by sector and borough, with role-based contact addresses and engagement rationale. Ninety-day partner engagement sequence with weekly cadence. Outreach templates for cold approach, follow-up, and decline response. Live partner directory with status tracking." },
              { num: "06", title: "Closeout & Handover", desc: "Engagement closeout pack consolidating all deliverables. End of engagement report with phase-by-phase summary. Strategic overview in prose and card formats. Website update brief for the charity's web developer. Calendar-seeded ninety-day partner engagement sequence." }
            ].map((item, i) => (
              <div key={i} style={{
                background: PANEL,
                padding: "36px 32px"
              }}>
                <span style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "2.5px",
                  textTransform: "uppercase",
                  color: BURGUNDY,
                  marginBottom: "16px",
                  display: "block"
                }}>
                  {item.num}
                </span>
                <h3 style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  marginBottom: "12px",
                  lineHeight: 1.3,
                  color: "#ffffff"
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontSize: "14px",
                  color: "#999999",
                  lineHeight: 1.75,
                  margin: 0
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — WHAT THIS PROVES */}
      <section style={{ padding: "72px 0", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: "1020px", margin: "0 auto", padding: "0 32px" }}>
          <span style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: BURGUNDY,
            marginBottom: "16px",
            display: "block"
          }}>
            What This Proves
          </span>
          <h2 style={{
            fontSize: "clamp(24px, 3vw, 38px)",
            fontWeight: 800,
            letterSpacing: "-0.8px",
            lineHeight: 1.2,
            marginBottom: "20px"
          }}>
            Operational Consultancy.<br />
            <span style={{ color: BURGUNDY }}>Not Strategic Theatre.</span>
          </h2>
          <p style={{ fontSize: "16px", color: "#bbbbbb", maxWidth: "720px", lineHeight: 1.9, marginBottom: "18px" }}>
            Many consultancy engagements produce strategy documents that sit on a shelf. This one produced operational infrastructure the charity is using from Day One.
          </p>
          <p style={{ fontSize: "16px", color: "#bbbbbb", maxWidth: "720px", lineHeight: 1.9, marginBottom: "18px" }}>
            Event Perfekt Global's core discipline is event delivery — work that requires real logistics, real timelines, real safeguarding, real partner coordination, and real audience response. The same operational lens that delivers a multi-location 800-guest event delivers a referral process that actually works on Day One. Strategic consultancy without operational grounding produces beautiful documents that never get used; operational consultancy without strategic framing produces busy activity that never moves the organisation forward. We deliver both.
          </p>

          {/* What the client received — checklist */}
          <div style={{
            marginTop: "40px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            background: BORDER,
            border: `1px solid ${BORDER}`
          }}>
            {[
              "A documented operating model — not a concept, a working framework with processes, roles, and decision points.",
              "A formal referral and intake process — tested against five sourcing channels and ready for live use.",
              "A safeguarding architecture — seven annexes built to Charity Commission and funder due diligence standards.",
              "A funding model — revenue mix, target list, commissioning pitch narrative, and sponsorship framework.",
              "A partner network — twenty named organisations with engagement rationale, contact architecture, and a ninety-day activation sequence.",
              "An ambassador and pro bono network — structured, documented, and ready for outreach from Day One."
            ].map((item, i) => (
              <div key={i} style={{
                background: PANEL,
                padding: "28px 36px",
                display: "flex",
                alignItems: "flex-start",
                gap: "20px"
              }}>
                <span style={{
                  color: BURGUNDY,
                  fontSize: "18px",
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: "2px"
                }}>
                  →
                </span>
                <p style={{
                  fontSize: "15px",
                  color: "#cccccc",
                  lineHeight: 1.75,
                  margin: 0
                }}>
                  <strong style={{ color: "#ffffff", fontWeight: 700 }}>{item.split(" — ")[0]}</strong> — {item.split(" — ")[1]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BURGUNDY CALLOUT BOX */}
      <div style={{
        background: BURGUNDY,
        padding: "60px 56px",
        marginTop: "72px"
      }}>
        <div style={{ maxWidth: "1020px", margin: "0 auto", padding: "0 32px" }}>
          <span style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.65)",
            marginBottom: "18px",
            display: "block"
          }}>
            Outcome
          </span>
          <h2 style={{
            fontSize: "clamp(24px, 3.5vw, 40px)",
            fontWeight: 800,
            letterSpacing: "-1px",
            lineHeight: 1.15,
            color: "#ffffff",
            marginBottom: "20px",
            maxWidth: "680px"
          }}>
            From Positioned<br />
            <span style={{ color: "#ffffff" }}>To Fundable. In Six Weeks.</span>
          </h2>
          <p style={{
            fontSize: "17px",
            color: "rgba(255,255,255,0.85)",
            maxWidth: "660px",
            lineHeight: 1.85
          }}>
            Six weeks after this engagement closed, the charity was ready to walk into a meeting with a pan-London statutory body, hold a commissioning conversation with three priority boroughs, send first outreach to twenty named partner organisations, and host its first ambassador convening — with a safeguarding architecture, funding model, and operational discipline that no funder, commissioner, or sponsor would query.
          </p>
          <p style={{
            fontSize: "17px",
            color: "rgba(255,255,255,0.85)",
            maxWidth: "660px",
            lineHeight: 1.85,
            marginTop: "16px"
          }}>
            That is what positioned-to-fundable looks like in six weeks.
          </p>
        </div>
      </div>

      {/* SECTION 4 — WHAT WE BRING */}
      <section style={{ padding: "72px 0", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: "1020px", margin: "0 auto", padding: "0 32px" }}>
          <span style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: BURGUNDY,
            marginBottom: "16px",
            display: "block"
          }}>
            What We Bring
          </span>
          <h2 style={{
            fontSize: "clamp(24px, 3vw, 38px)",
            fontWeight: 800,
            letterSpacing: "-0.8px",
            lineHeight: 1.2,
            marginBottom: "20px"
          }}>
            Event Delivery DNA.<br />
            <span style={{ color: BURGUNDY }}>Applied to Strategy.</span>
          </h2>
          <p style={{ fontSize: "16px", color: "#bbbbbb", maxWidth: "720px", lineHeight: 1.9, marginBottom: "18px" }}>
            Event Perfekt Global is fundamentally an event management group. Our consultancy work — including the engagement described in this case study — exists because clients who came to us for event delivery kept asking us for more: "You understand how we operate. Can you help us think about positioning, partnerships, fundraising, governance?"
          </p>
          <p style={{ fontSize: "16px", color: "#bbbbbb", maxWidth: "720px", lineHeight: 1.9, marginBottom: "18px" }}>
            Operational thinking sharpens strategy. Strategic clarity makes events meaningful rather than performative. The two disciplines reinforce each other — and we can support clients in either, or both.
          </p>

          {/* Two-column capability lists */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "48px",
            marginTop: "40px"
          }}>
            <div>
              <h3 style={{
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: BURGUNDY,
                marginBottom: "20px"
              }}>
                Our Event Capability
              </h3>
              <p style={{ fontSize: "15px", color: "#cccccc", lineHeight: 1.7 }}>
                Fundraising and donor events for charities, including ambassador convenings, supporter receptions, and annual fundraisers. Corporate engagement and partnership events, including launches, networking convenings, and stakeholder briefings. Government and embassy events, including formal receptions, delegations, and stakeholder programmes. Cross-border events across the UK, Nigeria, and wider African markets — with on-the-ground operational capacity in nine-plus African countries under our active UK Government contract. Cultural and community events drawing on deep Nigerian and diaspora cultural knowledge — a differentiator for clients operating across UK and African markets.
              </p>
            </div>
            <div>
              <h3 style={{
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: BURGUNDY,
                marginBottom: "20px"
              }}>
                Our Consultancy Capability
              </h3>
              <p style={{ fontSize: "15px", color: "#cccccc", lineHeight: 1.7 }}>
                Strategic positioning and operating identity reset — typically three to four weeks. Safeguarding architecture and Charity Commission compliance — typically two to three weeks. Funding readiness and go-to-market support — typically four to six weeks. Full strategic-to-commercial repositioning, as delivered in this case study — typically six to eight weeks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — CTA */}
      <section style={{ padding: "90px 0 70px", textAlign: "center" }}>
        <div style={{ maxWidth: "1020px", margin: "0 auto", padding: "0 32px" }}>
          <h2 style={{
            fontSize: "clamp(26px, 3.5vw, 46px)",
            fontWeight: 800,
            letterSpacing: "-1px",
            lineHeight: 1.15,
            marginBottom: "20px"
          }}>
            Event Perfekt Delivers<br />
            <span style={{ color: BURGUNDY }}>Year After Year.</span>
          </h2>
          <p style={{
            fontSize: "17px",
            color: "#999999",
            maxWidth: "560px",
            margin: "0 auto 16px",
            lineHeight: 1.85
          }}>
            Whether your need is event delivery, structural consultancy, or both — we have the structure, the team, and the track record.
          </p>
          <p style={{
            fontSize: "17px",
            color: "#999999",
            maxWidth: "560px",
            margin: "0 auto 16px",
            lineHeight: 1.85
          }}>
            Charities, social enterprises, government, corporates, embassies. UK and Africa. Single events or retained programmes. Strategic resets or operational architecture.
          </p>
          <p style={{
            fontSize: "17px",
            color: "#999999",
            maxWidth: "560px",
            margin: "0 auto 40px",
            lineHeight: 1.85
          }}>
            One conversation tells you whether we're the right partner — or whether we can introduce you to one.
          </p>

          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/consultation-request" style={{
              display: "inline-block",
              background: BURGUNDY,
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              padding: "16px 36px",
              textDecoration: "none",
              transition: "opacity 0.2s",
              cursor: "pointer"
            }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
              Start the Conversation
            </a>
            <a href="/projects-and-programmes" style={{
              display: "inline-block",
              background: "transparent",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              padding: "16px 36px",
              textDecoration: "none",
              border: `1px solid ${BORDER}`,
              transition: "opacity 0.2s",
              cursor: "pointer"
            }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
              ← Back to Projects & Programmes
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <div style={{ padding: "32px 0", textAlign: "center", borderTop: `1px solid ${BORDER}` }}>
        <p style={{ margin: 0, fontSize: "14px", color: "#666666" }}>
          Event Perfekt Global Ltd | 20 Wenlock Road, London N1 7GU | Company No. 15875326 | UK & Africa Programme Delivery
        </p>
      </div>
    </div>
  );
}
