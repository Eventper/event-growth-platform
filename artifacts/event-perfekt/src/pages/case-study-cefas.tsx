import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function CaseStudyPublicSector() {
  usePageMeta({
    title: "Case Study: UK Government Africa Regional Support | Event Perfekt Global",
    description: "Event Perfekt Global holds an active UK Government contract delivering regional support programmes across Africa with full governance and compliance oversight.",
    canonical: "https://eventperfekt.net/case-studies/public-sector",
  });

  return (
    <div className="bg-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* NAV */}
      <nav className="bg-black border-b border-[#222222] sticky top-0 z-50">
        <div className="max-w-[1020px] mx-auto px-8 py-4 flex justify-between items-center">
        </div>
      </nav>

      {/* HERO IMAGE HEADER */}
      <div style={{
        position: 'relative',
        minHeight: '520px',
        display: 'flex',
        alignItems: 'flex-end',
        overflow: 'hidden'
      }}>
        <img
          src="https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&auto=format&fit=crop&q=80"
          alt="Africa coastline marine environment"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'brightness(0.35)'
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)'
        }} />
        <div style={{
          position: 'relative',
          zIndex: 2,
          padding: '60px 32px',
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
            fontSize: 'clamp(28px, 4vw, 52px)',
            fontWeight: 800,
            letterSpacing: '-1.5px',
            lineHeight: 1.1,
            marginBottom: '20px',
            maxWidth: '780px'
          }}>
            UK Government Contract.<br />
            <span style={{ color: '#ffffff' }}>Africa. Delivered.</span>
          </h1>
          <p style={{
            fontSize: '17px',
            color: '#cccccc',
            maxWidth: '640px',
            lineHeight: 1.85
          }}>
            Event Perfekt Global holds the awarded government contract for Africa Regional Support — delivering event logistics, in-country execution, financial governance, and local supplier coordination across the African region on behalf of a UK Government agency.
          </p>
        </div>
      </div>

      {/* CONTRACT BADGE */}
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
              Active UK Government Contract — Provision of Africa Regional Support Requirements
            </p>
            <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, letterSpacing: '1px' }}>
              Awarded Supplier: Event Perfekt Global Ltd
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
            { label: 'Contracting Authority', value: 'UK Government Agency' },
            { label: 'Sector', value: 'Environment & Fisheries' },
            { label: 'Region', value: 'Africa — Multi-Country' },
            { label: 'Source', value: 'Find a Tender Service' }
          ].map((item, i) => (
            <div key={i} style={{
              padding: '22px 28px',
              borderRight: i < 3 ? '1px solid #222222' : 'none',
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
                color: '#ffffff'
              }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* THE CONTRACT SECTION */}
      <div style={{ padding: '72px 0', borderBottom: '1px solid #222222' }}>
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
            The Contract
          </span>
          <h2 style={{
            fontSize: 'clamp(24px, 3vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            lineHeight: 1.2,
            marginBottom: '20px'
          }}>
            Why <span style={{ color: '#ffffff' }}>Event Perfekt</span> was awarded the contract
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#ffffff',
            maxWidth: '720px',
            lineHeight: 1.9,
            marginBottom: '18px'
          }}>
            A UK Government agency needed a trusted partner capable of delivering complex, multi-stakeholder programmes across Africa with uncompromising governance standards.
          </p>
          <p style={{
            fontSize: '16px',
            color: '#ffffff',
            maxWidth: '720px',
            lineHeight: 1.9,
            marginBottom: '18px'
          }}>
            Event Perfekt Global won the competitive tender because we demonstrated:
          </p>

          {/* SCOPE CARDS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2px',
            background: '#222222',
            border: '1px solid #222222',
            marginTop: '48px'
          }}>
            {[
              { num: '01', title: 'Proven Track Record', desc: 'Delivery of international programmes across emerging markets with strict compliance requirements.' },
              { num: '02', title: 'Governance Excellence', desc: 'Multi-currency, audit-ready financial systems and risk management protocols.' },
              { num: '03', title: 'Local Execution', desc: 'In-country teams across Africa with government liaison and supplier management expertise.' },
              { num: '04', title: 'Stakeholder Alignment', desc: 'Seamless coordination between UK government entities, regional partners, and institutional stakeholders.' }
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
      </div>

      {/* COUNTRIES SECTION */}
      <div style={{ padding: '72px 0', borderBottom: '1px solid #222222' }}>
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
            In-Country Execution
          </span>
          <h2 style={{
            fontSize: 'clamp(24px, 3vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            lineHeight: 1.2,
            marginBottom: '20px'
          }}>
            Coverage across <span style={{ color: '#ffffff' }}>9+ African Markets</span>
          </h2>

          {/* Country images */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2px',
            background: '#222222',
            margin: '40px 0 36px'
          }}>
            {[
              'https://images.unsplash.com/photo-1516426122078-8023e06e5cea?w=600&auto=format&fit=crop&q=80',
              'https://images.unsplash.com/photo-1571727227653-d0e98b4f5e00?w=600&auto=format&fit=crop&q=80',
              'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&auto=format&fit=crop&q=80'
            ].map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Country ${i + 1}`}
                style={{
                  width: '100%',
                  aspectRatio: '16/10',
                  objectFit: 'cover',
                  filter: 'brightness(0.7)',
                  display: 'block'
                }}
              />
            ))}
          </div>

          {/* Country tags */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            {['Nigeria', 'Ghana', 'Kenya', 'Uganda', 'Tanzania', 'South Africa', 'Ethiopia', 'Egypt', 'Senegal'].map((country, i) => (
              <div key={i} style={{
                background: i === 0 ? '#330311' : '#111111',
                border: i === 0 ? '1px solid #330311' : '1px solid #222222',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                padding: '10px 20px'
              }}>
                {country}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PROGRAMMES SECTION */}
      <div style={{ background: '#111111', padding: '72px 0', borderBottom: '1px solid #222222' }}>
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
            Programmes Supported
          </span>
          <h2 style={{
            fontSize: 'clamp(24px, 3vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            lineHeight: 1.2,
            marginBottom: '20px'
          }}>
            Wide government <span style={{ color: '#ffffff' }}>stakeholder family</span>
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginTop: '44px'
          }}>
            {[
              { tag: 'Primary Agency', title: 'UK Government Agency', desc: 'Primary contracting authority for the Africa Regional Support programme.' },
              { tag: 'Parent Ministry', title: 'UK Government Ministry', desc: 'Parent ministry overseeing all regional programmes and governance frameworks.' },
              { tag: 'Health Agency', title: 'Animal & Plant Health Agency', desc: 'Veterinary and phytosanitary oversight across the programme.' },
              { tag: 'Marine Org', title: 'Marine Management Organisation', desc: 'Marine resource management and licensing coordination.' },
              { tag: 'Nature Committee', title: 'Joint Nature Conservation Committee', desc: 'Protected species and habitat protection coordination.' },
              { tag: 'Diplomatic Office', title: 'Foreign, Commonwealth & Development Office', desc: 'Diplomatic coordination and cultural affairs liaison.' }
            ].map((prog, i) => (
              <div key={i} style={{
                border: '1px solid #222222',
                padding: '32px',
                background: '#000000'
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: '#ffffff',
                  marginBottom: '14px',
                  display: 'block'
                }}>
                  {prog.tag}
                </span>
                <h3 style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  marginBottom: '12px',
                  lineHeight: 1.3
                }}>
                  {prog.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#ffffff',
                  lineHeight: 1.75
                }}>
                  {prog.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FINANCIAL GOVERNANCE */}
      <div style={{ padding: '72px 0', borderBottom: '1px solid #222222' }}>
        <div className="max-w-[1020px] mx-auto px-8">
          <div style={{
            borderLeft: '4px solid #330311',
            background: '#111111',
            padding: '56px 52px',
            marginTop: '0'
          }}>
            <h2 style={{
              fontSize: 'clamp(22px, 3vw, 34px)',
              fontWeight: 800,
              letterSpacing: '-0.8px',
              lineHeight: 1.2,
              marginBottom: '20px'
            }}>
              <span style={{ color: '#ffffff' }}>Financial Governance</span> at its core
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#ffffff',
              maxWidth: '680px',
              lineHeight: 1.9,
              marginBottom: '16px'
            }}>
              Government contracts demand absolute precision in financial controls. Our systems deliver:
            </p>

            <div style={{
              marginTop: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              background: '#222222',
              border: '1px solid #222222'
            }}>
              {[
                'Real-time multi-currency transaction reporting with exchange rate hedging',
                'Audit-ready trails: every expenditure classified, cost-coded, and governance-approved',
                'Segregation of duties: approval chains, signatory limits, conflict protocols',
                'Quarterly financial statements certified by external auditors',
                'Compliance dashboards visible to UK Government agencies and audit teams in real-time'
              ].map((item, i) => (
                <div key={i} style={{
                  background: '#000000',
                  padding: '22px 28px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px'
                }}>
                  <span style={{
                    color: '#ffffff',
                    fontWeight: 800,
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    ➜
                  </span>
                  <p style={{
                    fontSize: '14px',
                    color: '#ffffff',
                    lineHeight: 1.7,
                    margin: 0,
                    maxWidth: 'none'
                  }}>
                    <strong style={{ color: '#ffffff' }}>{item.split(':')[0]}:</strong> {item.split(':')[1]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AUTHORISED USERS */}
      <div style={{ padding: '72px 0', borderBottom: '1px solid #222222' }}>
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
            Authorised Users
          </span>
          <h2 style={{
            fontSize: 'clamp(24px, 3vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            lineHeight: 1.2,
            marginBottom: '20px'
          }}>
            Stakeholder <span style={{ color: '#ffffff' }}>access hierarchy</span>
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2px',
            background: '#222222',
            border: '1px solid #222222',
            marginTop: '44px'
          }}>
            {[
              { abbr: 'EPG', name: 'Event Perfekt Global' },
              { abbr: 'CAO', name: 'Central Audit Office' },
              { abbr: 'AGENCY', name: 'Government Agency Management Team' },
              { abbr: 'FC', name: 'Finance Controller' }
            ].map((user, i) => (
              <div key={i} style={{
                background: '#111111',
                padding: '28px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#ffffff',
                  marginBottom: '8px',
                  letterSpacing: '-0.5px'
                }}>
                  {user.abbr}
                </div>
                <p style={{
                  fontSize: '12px',
                  color: '#ffffff',
                  lineHeight: 1.5,
                  margin: 0,
                  maxWidth: 'none'
                }}>
                  {user.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PROOF SECTION */}
      <div style={{ padding: '72px 0', borderBottom: '1px solid #222222' }}>
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
            What this says about us
          </span>
          <h2 style={{
            fontSize: 'clamp(24px, 3vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            lineHeight: 1.2,
            marginBottom: '20px'
          }}>
            Why UK Government <span style={{ color: '#ffffff' }}>trusts Event Perfekt</span>
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
              'We are pre-qualified suppliers on multiple UK government frameworks — meaning we have passed rigorous vetting, compliance audits, and suitability assessments.',
              'Our team includes former government officials, compliance specialists, and international development experts who understand the policy context and governance landscape.',
              'We hold security clearances and operate under Public Contracts Regulations with transparent, auditable processes at every stage.',
              'UK Government agencies have confidence that their contracts, funding, and stakeholder relationships are in the safest hands in the industry.'
            ].map((item, i) => (
              <div key={i} style={{
                background: '#111111',
                padding: '28px 36px',
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
                  ✓
                </span>
                <p style={{
                  fontSize: '15px',
                  color: '#ffffff',
                  lineHeight: 1.75,
                  margin: 0,
                  maxWidth: 'none'
                }}>
                  <strong style={{ color: '#ffffff', fontWeight: 700 }}>Government trust: </strong>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '90px 0 70px', textAlign: 'center', borderBottom: '1px solid #222222' }}>
        <div className="max-w-[1020px] mx-auto px-8">
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 46px)',
            fontWeight: 800,
            letterSpacing: '-1px',
            lineHeight: 1.15,
            marginBottom: '20px'
          }}>
            Ready for <span style={{ color: '#ffffff' }}>Mission-Critical Delivery?</span>
          </h2>
          <p style={{
            fontSize: '17px',
            color: '#999999',
            maxWidth: '520px',
            margin: '0 auto 40px',
            lineHeight: 1.85
          }}>
            Learn how Event Perfekt can handle your most complex, high-stakes programmes with the governance and compliance your stakeholders demand.
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
              Discover Our Services
            </a>
          </Link>
        </div>
      </div>

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
