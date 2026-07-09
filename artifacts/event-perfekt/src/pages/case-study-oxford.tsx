import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

export default function CaseStudyOxford() {
  usePageMeta({
    title: "Case Study: St. Anne's College Oxford — St. Anne's Ball 2023 | Event Perfekt Global",
    description: "Event Perfekt Global delivered end-to-end event theme styling for St. Anne's Ball 2023 at St. Anne's College, University of Oxford — 700 guests, Neverland theme, full concept and delivery.",
    canonical: "https://eventperfekt.net/case-studies/oxford",
  });

  return (
    <div className="bg-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* NAV */}
      <nav className="bg-black border-b border-[#222222] sticky top-0 z-50">
        <div className="max-w-[1020px] mx-auto px-8 py-4 flex justify-between items-center">
          <Link href="/projects-and-programmes">
            <a style={{ fontSize: "14px", fontWeight: 300, color: "white" }} className="hover:text-gray-300 transition">Back to Programmes</a>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <div style={{
        position: 'relative',
        minHeight: '560px',
        display: 'flex',
        alignItems: 'flex-end',
        overflow: 'hidden'
      }}>
        <img
          src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1600&auto=format&fit=crop&q=80"
          alt="Oxford University grand ball venue"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 40%',
            filter: 'brightness(0.3)'
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)'
        }} />
        <div style={{
          position: 'relative',
          zIndex: 2,
          padding: '64px 32px',
          maxWidth: '1020px',
          margin: '0 auto',
          width: '100%'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
            color: '#ffffff',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            Our Work in Action <span style={{ color: '#ffffff' }}>/</span> Case Study
          </div>
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 54px)',
            fontWeight: 800,
            letterSpacing: '-1.5px',
            lineHeight: 1.1,
            marginBottom: '20px',
            maxWidth: '800px'
          }}>
            St. Anne's College, Oxford.<br />
            <span style={{ color: '#ffffff' }}>700 Guests. One Night. Neverland.</span>
          </h1>
          <p style={{
            fontSize: '17px',
            color: '#cccccc',
            maxWidth: '620px',
            lineHeight: 1.85
          }}>
            Full end-to-end event theme styling and concept delivery for St. Anne's Ball 2023 — one of Oxford University's most anticipated annual events, delivered by Event Perfekt to brief, on time, and to a standard that matched the institution.
          </p>
        </div>
      </div>

      {/* CLIENT BAR */}
      <div style={{ background: '#330311', padding: '22px 0' }}>
        <div className="max-w-[1020px] mx-auto px-8">
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
            justifyContent: 'space-between'
          }}>
            <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px', margin: 0 }}>
              Client: St. Anne's College, University of Oxford
            </p>
            <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.85, letterSpacing: '0.8px' }}>
              Event: St. Anne's Ball 2023 &nbsp;|&nbsp; 11th March 2023 &nbsp;|&nbsp; Oxford
            </span>
          </div>
        </div>
      </div>

      {/* META STRIP */}
      <div className="max-w-[1020px] mx-auto px-8">
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          border: '1px solid #222222',
          borderTop: 'none'
        }}>
          {[
            { label: 'Client', value: 'St. Anne\'s College, Oxford' },
            { label: 'Event', value: 'St. Anne\'s Ball 2023' },
            { label: 'Theme', value: 'Neverland', highlight: true },
            { label: 'Guests', value: '700' },
            { label: 'EPG Role', value: 'Concept & Theme Delivery' }
          ].map((item, i) => (
            <div key={i} style={{
              padding: '22px 28px',
              borderRight: i < 4 ? '1px solid #222222' : 'none',
              flex: 1,
              minWidth: '140px'
            }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#ffffff',
                marginBottom: '6px',
                display: 'block'
              }}>
                {item.label}
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: 700,
                color: item.highlight ? '#ffffff' : '#ffffff'
              }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* THE BRIEF SECTION */}
      <section style={{ padding: '72px 0', borderBottom: '1px solid #222222' }}>
        <div className="max-w-[1020px] mx-auto px-8">
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#ffffff',
            marginBottom: '16px',
            display: 'block'
          }}>
            The Brief
          </span>
          <h2 style={{
            fontSize: 'clamp(24px, 3vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            lineHeight: 1.2,
            marginBottom: '20px'
          }}>
            An Oxford Ball.<br />
            <span style={{ color: '#ffffff' }}>Nothing Less Than Exceptional.</span>
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '48px',
            alignItems: 'start',
            marginTop: '20px'
          }}>
            <div>
              <p style={{
                fontSize: '16px',
                color: '#ffffff',
                maxWidth: '720px',
                lineHeight: 1.9,
                marginBottom: '18px'
              }}>
                St. Anne's College Oxford commissioned Event Perfekt to design and deliver the complete theme styling for St. Anne's Ball 2023 — a flagship annual event held on the grounds of one of the University of Oxford's most distinguished colleges.
              </p>
              <p style={{
                fontSize: '16px',
                color: '#ffffff',
                maxWidth: '720px',
                lineHeight: 1.9,
                marginBottom: '18px'
              }}>
                The brief was a full Neverland concept — immersive, theatrical, and worthy of the venue. 700 guests. A seven-hour event running from 7:00pm through to 2:00am. Every detail of the environment — the theming, the atmosphere, the visual execution — was our responsibility to plan, build, and deliver.
              </p>
              <p style={{
                fontSize: '16px',
                color: '#ffffff',
                maxWidth: '720px',
                lineHeight: 1.9,
                marginBottom: '18px'
              }}>
                This was not a logistics exercise. It was creative and operational delivery at the highest level — with the full weight of an Oxford institution's expectations attached.
              </p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&auto=format&fit=crop&q=80"
              alt="Grand event venue styling"
              style={{
                width: '100%',
                aspectRatio: '4/3',
                objectFit: 'cover',
                filter: 'brightness(0.8)',
                display: 'block'
              }}
            />
          </div>

          {/* STAT ROW */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '2px',
            background: '#222222',
            border: '1px solid #222222',
            marginTop: '52px'
          }}>
            {[
              { num: '700', label: 'Guests' },
              { num: '7', label: 'Hours of Live Event' },
              { num: '1', label: 'Theme. Fully Realised.' },
              { num: 'Oxford', label: 'University Venue' }
            ].map((stat, i) => (
              <div key={i} style={{
                background: '#111111',
                padding: '32px 28px',
                textAlign: 'center'
              }}>
                <span style={{
                  fontSize: 'clamp(32px, 4vw, 48px)',
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-2px',
                  lineHeight: 1,
                  marginBottom: '10px',
                  display: 'block'
                }}>
                  {stat.num}
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px'
                }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE DELIVERED */}
      <section style={{ padding: '72px 0', borderBottom: '1px solid #222222' }}>
        <div className="max-w-[1020px] mx-auto px-8">
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#ffffff',
            marginBottom: '16px',
            display: 'block'
          }}>
            What We Delivered
          </span>
          <h2 style={{
            fontSize: 'clamp(24px, 3vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            lineHeight: 1.2,
            marginBottom: '20px'
          }}>
            Concept to Completion.<br />
            <span style={{ color: '#ffffff' }}>Every Stage Owned by Us.</span>
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#ffffff',
            maxWidth: '720px',
            lineHeight: 1.9,
            marginBottom: '18px'
          }}>
            Our contract covered the full scope of event theme styling — from initial concept development through to on-the-night delivery. Everything visible to those 700 guests was planned, sourced, built, and installed by our team.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2px',
            background: '#222222',
            border: '1px solid #222222',
            marginTop: '52px'
          }}>
            {[
              { num: '01', title: 'Theme Design & Creative Direction', desc: 'Full creative development of the Neverland concept — translating the theme into a cohesive visual and atmospheric environment that worked across the entire venue at scale.' },
              { num: '02', title: 'Event Styling Plan & Production Schedule', desc: 'Detailed planning and production scheduling agreed with St. Anne\'s College — covering access windows, installation sequencing, supplier coordination, and a clear delivery timeline leading to the 7:00pm start.' },
              { num: '03', title: 'Props, Materials & Supplier Management', desc: 'Sourcing and procurement of all theming materials, props, and styling elements. Every item selected to deliver the immersive Neverland environment the brief required.' },
              { num: '04', title: 'Full On-Site Build & Styling', desc: 'Complete on-site installation — carried out within the access window granted by the college, built to brief, and ready for doors to open at 7:00pm. Styled across all event spaces.' },
              { num: '05', title: 'On-the-Night Execution', desc: 'Live event oversight throughout the evening — ensuring the environment held, the theme was maintained, and the experience delivered for 700 guests across the full seven-hour event.' },
              { num: '06', title: 'Breakdown & Site Reinstatement', desc: 'Full breakdown of all theming and styling elements following the event — leaving the venue in the condition required by the college. Clean, professional, and complete.' }
            ].map((card, i) => (
              <div key={i} style={{
                background: '#111111',
                padding: '36px 32px'
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '2.5px',
                  textTransform: 'uppercase',
                  color: '#ffffff',
                  marginBottom: '16px',
                  display: 'block'
                }}>
                  {card.num}
                </span>
                <h3 style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  marginBottom: '12px',
                  lineHeight: 1.3
                }}>
                  {card.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#ffffff',
                  lineHeight: 1.75,
                  margin: 0
                }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMAGE ROW */}
      <div className="max-w-[1020px] mx-auto px-8">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2px',
          background: '#222222',
          margin: '52px 0 0'
        }}>
          {[
            'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=600&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=600&auto=format&fit=crop&q=80'
          ].map((url, i) => (
            <img
              key={i}
              src={url}
              alt={i === 0 ? 'Event theme styling installation' : i === 1 ? 'Grand ball event decoration' : 'Oxford event evening atmosphere'}
              style={{
                width: '100%',
                aspectRatio: '4/3',
                objectFit: 'cover',
                filter: 'brightness(0.75)',
                display: 'block'
              }}
            />
          ))}
        </div>
      </div>

      {/* THEME CALLOUT */}
      <div className="max-w-[1020px] mx-auto px-8">
        <div style={{
          background: '#111111',
          borderLeft: '4px solid #330311',
          padding: '56px 52px',
          marginTop: '72px'
        }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#ffffff',
            marginBottom: '16px',
            display: 'block'
          }}>
            The Neverland Theme
          </span>
          <h2 style={{
            fontSize: 'clamp(22px, 3vw, 36px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            lineHeight: 1.2,
            marginBottom: '20px'
          }}>
            Immersive. Theatrical.<br />
            <span style={{ color: '#ffffff' }}>Delivered at Oxford Standard.</span>
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#ffffff',
            maxWidth: '700px',
            lineHeight: 1.9,
            marginBottom: '16px'
          }}>
            Neverland as a theme demands more than decoration. It demands an environment — one where guests step out of the everyday and into something that feels completely transformed. At a venue like St. Anne's College, that bar is higher still.
          </p>
          <p style={{
            fontSize: '16px',
            color: '#ffffff',
            maxWidth: '700px',
            lineHeight: 1.9,
            marginBottom: '0'
          }}>
            We designed and built an event environment that met that expectation. Every space considered. Every detail deliberate. The kind of execution that reflects well not just on the event — but on the institution hosting it.
          </p>
        </div>
      </div>

      {/* PROOF LIST */}
      <section style={{ padding: '72px 0', borderBottom: '1px solid #222222' }}>
        <div className="max-w-[1020px] mx-auto px-8">
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#ffffff',
            marginBottom: '16px',
            display: 'block'
          }}>
            What This Demonstrates
          </span>
          <h2 style={{
            fontSize: 'clamp(24px, 3vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            lineHeight: 1.2,
            marginBottom: '20px'
          }}>
            Why This Engagement Matters<br />
            <span style={{ color: '#ffffff' }}>to Our Track Record</span>
          </h2>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            background: '#222222',
            border: '1px solid #222222',
            marginTop: '44px'
          }}>
            {[
              { title: 'We operate at institutional level', desc: 'St. Anne\'s College is a University of Oxford institution. The standards expected and the scrutiny applied are not comparable to a standard corporate event brief.' },
              { title: 'We deliver at scale', desc: '700 guests, a seven-hour event, full venue theming. This is large-format delivery, not boutique event management.' },
              { title: 'We own the full scope', desc: 'Concept, planning, sourcing, installation, live delivery, and breakdown. No handoffs. No gaps. One team, one accountability.' },
              { title: 'We work within complex venue environments', desc: 'Oxford college venues have strict access, compliance, and reinstatement requirements. We navigated all of them without issue.' },
              { title: 'Creative and operational delivery are not separate for us', desc: 'The Neverland concept was ours, and so was every step of the execution. That integration is what makes the difference between a themed event and an immersive one.' }
            ].map((item, i) => (
              <div key={i} style={{
                background: '#111111',
                padding: '26px 36px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px'
              }}>
                <span style={{
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  →
                </span>
                <p style={{
                  fontSize: '15px',
                  color: '#ffffff',
                  lineHeight: 1.75,
                  margin: 0,
                  maxWidth: 'none'
                }}>
                  <strong style={{ color: '#ffffff', fontWeight: 700 }}>{item.title}</strong> — {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '90px 0 70px', textAlign: 'center', borderBottom: '1px solid #222222' }}>
        <div className="max-w-[1020px] mx-auto px-8">
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 46px)',
            fontWeight: 800,
            letterSpacing: '-1px',
            lineHeight: 1.15,
            marginBottom: '20px'
          }}>
            Planning an Event That<br />
            <span style={{ color: '#ffffff' }}>Has to Be Right?</span>
          </h2>
          <p style={{
            fontSize: '17px',
            color: '#999999',
            maxWidth: '520px',
            margin: '0 auto 40px',
            lineHeight: 1.85
          }}>
            Whether it is a large-scale institutional event, a high-profile corporate occasion, or a flagship community programme — we deliver to the standard the moment demands.
          </p>
          <Link href="/">
            <a style={{
              display: 'inline-block',
              background: '#330311',
              color: '#ffffff',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              padding: '16px 36px',
              textDecoration: 'none',
              transition: 'opacity 0.2s',
              border: 'none',
              cursor: 'pointer'
            }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
              Talk to Our Events Team
            </a>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: '#000000',
        color: '#ffffff',
        padding: '12px 0',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div className="max-w-[1020px] mx-auto px-8 text-center" style={{
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.4)',
          fontWeight: 300
        }}>
          <p>&copy; 2026 Event Perfekt Global Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
