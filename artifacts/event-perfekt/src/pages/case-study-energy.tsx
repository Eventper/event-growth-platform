import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function CaseStudyEnergy() {
  usePageMeta({
    title: "Case Study: Major National Energy Corporation — Nigeria | Event Perfekt Global",
    description: "Five consecutive years delivering large-scale employee and family CSR events for a major national energy corporation across multiple Nigerian locations — 800 guests per location, retained delivery partner.",
    canonical: "https://eventperfekt.net/case-studies/energy",
  });

  return (
    <div style={{ background: '#000000', color: '#ffffff', fontFamily: "'Poppins', sans-serif", minHeight: '100vh' }}>
      {/* NAVIGATION */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: '#258807',
        zIndex: 50,
        borderBottom: '1px solid #222222'
      }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        </div>
      </nav>

      {/* HERO */}
      <div style={{
        position: 'relative',
        minHeight: '560px',
        display: 'flex',
        alignItems: 'flex-end',
        overflow: 'hidden',
        marginTop: '60px'
      }}>
        <img 
          src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1600&auto=format&fit=crop&q=80"
          alt="Large-scale corporate event Nigeria"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'brightness(0.28)',
            zIndex: 1
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
          zIndex: 2
        }}></div>
        <div style={{
          position: 'relative',
          zIndex: 3,
          padding: '64px 32px',
          maxWidth: '1020px',
          margin: '0 auto',
          width: '100%'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#258807', marginBottom: '20px' }}>
            Our Work in Action <span style={{ color: '#555' }}>/</span> Case Study
          </div>
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 54px)',
            fontWeight: 800,
            letterSpacing: '-1.5px',
            lineHeight: 1.1,
            marginBottom: '20px',
            maxWidth: '800px'
          }}>
            Five Years. Multiple Locations.<br />
            <span style={{ color: '#258807' }}>800 Guests. Every Time.</span>
          </h1>
          <p style={{
            fontSize: '17px',
            color: '#cccccc',
            maxWidth: '640px',
            lineHeight: 1.85
          }}>
            A retained delivery partnership with one of Nigeria's most prominent national energy corporations — delivering large-scale employee and family CSR events across multiple locations, year after year.
          </p>
        </div>
      </div>

      {/* CLIENT BAR */}
      <div style={{ background: '#258807', padding: '22px 0' }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px', margin: 0 }}>Client: Major National Energy Corporation — Nigeria</p>
            <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.85, letterSpacing: '0.8px' }}>Retained Partner — 5 Consecutive Years &nbsp;|&nbsp; Multiple Locations</span>
          </div>
        </div>
      </div>

      {/* META STRIP */}
      <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '0 32px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', border: '1px solid #222222' }}>
          {[
            { label: 'Client Sector', value: 'Energy — National Corporation' },
            { label: 'Relationship', value: '5 Consecutive Years', green: true },
            { label: 'Guests Per Location', value: '800' },
            { label: 'Format', value: 'Multi-Location' },
            { label: 'EPG Role', value: 'Full Event Delivery' }
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
                color: '#888888',
                marginBottom: '6px',
                display: 'block'
              }}>
                {item.label}
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: 700,
                color: item.green ? '#258807' : '#ffffff'
              }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* THE RELATIONSHIP */}
      <section style={{ padding: '72px 0', borderBottom: '1px solid #222222' }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '0 32px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#258807',
            marginBottom: '16px',
            display: 'block'
          }}>
            The Relationship
          </span>
          <h2 style={{
            fontSize: 'clamp(24px, 3vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            lineHeight: 1.2,
            marginBottom: '20px'
          }}>
            Not a Supplier.<br />
            <span style={{ color: '#258807' }}>A Retained Delivery Partner.</span>
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '48px',
            alignItems: 'start',
            marginTop: '20px'
          }}>
            <div>
              <p style={{ fontSize: '16px', color: '#bbbbbb', maxWidth: '720px', lineHeight: 1.9, marginBottom: '18px' }}>
                A one-off event contract is easy to win. Winning the same contract five years in a row — for one of Nigeria's most prominent national energy corporations — is something else entirely. It means the delivery was right every single time.
              </p>
              <p style={{ fontSize: '16px', color: '#bbbbbb', maxWidth: '720px', lineHeight: 1.9, marginBottom: '18px' }}>
                For five consecutive years, Event Perfekt Global has been the trusted delivery partner for this corporation's flagship end of year employee and family CSR events. Same client. Same trust. Consistent delivery across multiple Nigerian locations, 800 guests per location, year after year.
              </p>
              <p style={{ fontSize: '16px', color: '#bbbbbb', maxWidth: '720px', lineHeight: 1.9, marginBottom: '18px' }}>
                That is not a track record that can be manufactured. It has to be earned — every year.
              </p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80"
              alt="Corporate event delivery Nigeria"
              style={{
                width: '100%',
                aspectRatio: '4/3',
                objectFit: 'cover',
                filter: 'brightness(0.8)',
                display: 'block'
              }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '2px',
            background: '#222222',
            border: '1px solid #222222',
            marginTop: '52px'
          }}>
            {[
              { num: '5', label: 'Consecutive Years' },
              { num: '800+', label: 'Guests Per Location' },
              { num: 'Multi', label: 'Location Delivery' },
              { num: '2', label: 'Event Types Delivered' }
            ].map((stat, i) => (
              <div key={i} style={{
                background: '#111111',
                padding: '32px 28px',
                textAlign: 'center'
              }}>
                <span style={{
                  fontSize: 'clamp(32px, 4vw, 48px)',
                  fontWeight: 900,
                  color: '#258807',
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
                  color: '#888888',
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
        <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '0 32px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#258807',
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
            Large-Scale Event Delivery.<br />
            <span style={{ color: '#258807' }}>Across Multiple Locations. Multiple Years.</span>
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#bbbbbb',
            maxWidth: '720px',
            lineHeight: 1.9,
            marginBottom: '18px'
          }}>
            Five years of consistent delivery across multiple Nigerian locations. Here is what the scope looked like every single year.
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
              { num: '01', title: 'Event Logistics & Vendor Management', desc: 'Coordination across multiple locations. Venue sourcing, catering, audio-visual, and all logistics managed centrally and deployed locally.' },
              { num: '02', title: 'Guest Experience Design', desc: 'Structured registration, welcome experiences, entertainment programming, and hospitality management for 800+ guests per location.' },
              { num: '03', title: 'CSR Brand Activation', desc: 'Corporate messaging, brand integration, and CSR narrative delivery woven throughout the event experience.' },
              { num: '04', title: 'Production & Technical Delivery', desc: 'Professional sound, lighting, stage setup, and technical coordination to match the scale and professionalism the brand required.' },
              { num: '05', title: 'Staff & Resource Deployment', desc: 'Team deployment, staff training, and on-ground management across multiple simultaneous locations.' },
              { num: '06', title: 'Post-Event Reporting & Insights', desc: 'Comprehensive reporting, photography/videography, attendee metrics, and client debrief for continuous improvement.' }
            ].map((item, i) => (
              <div key={i} style={{
                background: '#111111',
                padding: '36px 32px'
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '2.5px',
                  textTransform: 'uppercase',
                  color: '#258807',
                  marginBottom: '16px',
                  display: 'block'
                }}>
                  {item.num}
                </span>
                <h3 style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  marginBottom: '12px',
                  lineHeight: 1.3,
                  color: '#ffffff'
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#999999',
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

      {/* RETENTION & SCALE */}
      <div style={{
        background: '#258807',
        padding: '60px 56px',
        marginTop: '72px'
      }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '0 32px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.65)',
            marginBottom: '18px',
            display: 'block'
          }}>
            What This Proves
          </span>
          <h2 style={{
            fontSize: 'clamp(24px, 3.5vw, 40px)',
            fontWeight: 800,
            letterSpacing: '-1px',
            lineHeight: 1.15,
            color: '#ffffff',
            marginBottom: '20px',
            maxWidth: '680px'
          }}>
            Five-Year Retention<br />
            <span style={{ color: '#ffffff' }}>Is Earned. Not Lucky.</span>
          </h2>
          <p style={{
            fontSize: '17px',
            color: 'rgba(255,255,255,0.85)',
            maxWidth: '660px',
            lineHeight: 1.85
          }}>
            The same contract, five years in a row, with one of Nigeria's most prominent national corporations, is not a matter of chance. It is evidence of consistent, professional, scalable delivery. Event Perfekt Global did not just deliver events — we delivered the same level of quality, the same attention to detail, and the same client experience year after year across multiple locations.
          </p>
        </div>
      </div>

      {/* CLOSING CTA */}
      <section style={{ padding: '90px 0 70px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '0 32px' }}>
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 46px)',
            fontWeight: 800,
            letterSpacing: '-1px',
            lineHeight: 1.15,
            marginBottom: '20px'
          }}>
            Event Perfekt Delivers<br />
            <span style={{ color: '#258807' }}>At Scale. Year After Year.</span>
          </h2>
          <p style={{
            fontSize: '17px',
            color: '#999999',
            maxWidth: '520px',
            margin: '0 auto 40px',
            lineHeight: 1.85
          }}>
            Your event needs consistent delivery, proven expertise, and the confidence that comes with a track record. We have it.
          </p>
          <a href="/contact" style={{
            display: 'inline-block',
            background: '#258807',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            padding: '16px 36px',
            textDecoration: 'none',
            transition: 'opacity 0.2s',
            cursor: 'pointer'
          }} onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
            Get in Touch
          </a>
        </div>
      </section>

      <div style={{ padding: '32px 0', textAlign: 'center', borderTop: '1px solid #222222' }}>
        <p style={{ margin: 0, fontSize: '14px' }}><a href="/projects-and-programmes" style={{ color: '#258807', textDecoration: 'none' }}>← Back to Programmes</a></p>
      </div>
    </div>
  );
}
