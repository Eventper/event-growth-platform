import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import EmailCapturePopup from "@/components/EmailCapturePopup";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useQuery } from "@tanstack/react-query";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ArrowRight, Globe, Shield, Users, Trophy, Building, FileCheck, ChevronDown, Award, Home } from "lucide-react";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";
import luxuryWeddingImage from "@assets/luxury-wedding-celebration-illuminated-by-chandelier-flame-generated-by-ai_1754251182698.jpg";
import youthBoysImage from "@assets/WhatsApp_Image_2026-04-02_at_18.49.52_1775510039478.jpeg";

const HERO_IMAGE = "https://images.pexels.com/photos/6146820/pexels-photo-6146820.jpeg";

const FALLBACK_IMAGES: Record<string, string> = {
  "public-sector":       "https://images.pexels.com/photos/5324960/pexels-photo-5324960.jpeg",
  "education":           "https://images.pexels.com/photos/15371598/pexels-photo-15371598.jpeg",
  "financial-services":  "https://images.pexels.com/photos/6457488/pexels-photo-6457488.jpeg",
  "charity-community":   "https://images.pexels.com/photos/9630217/pexels-photo-9630217.jpeg",
  "corporate-energy":    "https://images.pexels.com/photos/8761520/pexels-photo-8761520.jpeg",
  "remittance":          "https://images.pexels.com/photos/7621140/pexels-photo-7621140.jpeg",
  "funding":             "https://images.pexels.com/photos/1181395/pexels-photo-1181395.jpeg",
  "twinpay":             "https://images.pexels.com/photos/5239806/pexels-photo-5239806.jpeg",
  "twintrade":           "https://images.pexels.com/photos/30709459/pexels-photo-30709459.jpeg",
};

interface CaseStudy {
  title: string;
  summary: string;
  challenge: string;
  approach: string;
  result: string;
  client?: string;
  contract?: string;
}

const CASE_STUDIES: Record<string, CaseStudy> = {
  "public-sector": {
    title: "UK Government Agency – Africa Regional Support Programme",
    client: "UK Government Agency",
    contract: "Active UK Government Contract",
    summary: "A multi-country public sector delivery programme supporting regional operations and stakeholder engagement across 9+ African nations.",
    challenge: "The brief required consistent delivery across different locations, government expectations, and strict governance controls — sanctions compliance, financial reconciliation, and delegate management all had to run in parallel.",
    approach: "We coordinated schedules, stakeholders, logistics, and reporting with a single delivery structure and clear accountability — embedding in-country coordinators in each region and aligning to UK government procurement standards.",
    result: "The programme was delivered with strong visibility, smooth coordination, and reliable compliance handling. Event Perfekt Global Ltd is the sole awarded supplier and the partnership remains active and ongoing.",
  },
  "education": {
    title: "University of Oxford – St Anne's Ball",
    client: "St Anne's College, University of Oxford",
    contract: "St Anne's Ball 2023 — Theme: Neverland — 700 Guests",
    summary: "A premium institutional event delivered with strong attention to detail and guest experience for one of the UK's most prestigious universities.",
    challenge: "The event needed an elegant, fully immersive experience that matched the university's standards and the high expectations of 700 guests — on a fixed date with no margin for delay.",
    approach: "We handled full planning, styling, logistics, and event-day coordination with a polished, discreet delivery style. Venue transformation, entertainment, catering, health and safety, and guest experience were all managed in-house.",
    result: "The evening ran seamlessly and reflected the institution's quality and prestige. Delivered on time, on budget, to full client satisfaction.",
  },
  "financial-services": {
    title: "Cross-Border Payments Pilot (TwinPaay)",
    summary: "A financial coordination case study focused on international payments and cross-border compliance across multiple markets and currencies.",
    challenge: "The project required safe handling of multiple currencies and international vendor transactions — with full audit trails, FCA-aligned controls, and real-time visibility into payment status.",
    approach: "We structured the workflow around payment governance, cross-border compliance checks, and controlled approval stages — applying the same rigour used in our government programme delivery.",
    result: "The pilot demonstrated a practical, replicable model for managing international event payments securely. Now embedded as the TwinPaay platform serving the broader programme network.",
  },
  "charity-community": {
    title: "From Positioned to Fundable. In Six Weeks.",
    client: "UK Registered Charity — Youth Violence Prevention",
    contract: "Six-Week Consultancy Engagement",
    summary: "A strategic and operational consultancy engagement repositioning a UK Registered Charity in youth violence prevention — from positioned to fundable in six weeks.",
    challenge: "The charity had community standing and direct access to at-risk young people, but lacked a documented operating model, referral process, partner network, safeguarding architecture, and funding plan.",
    approach: "We delivered 29 documents across three structured phases: strategic definition, operating model and infrastructure, safeguarding architecture, funding readiness, partner network activation, and closeout handover.",
    result: "Six weeks after closeout, the charity was ready for commissioning conversations with statutory bodies, charitable trusts, and corporate sponsors — with a safeguarding architecture, funding model, and operational discipline no funder would query.",
  },
  "corporate-energy": {
    title: "Major National Energy Corporation – Nigeria",
    client: "Major National Energy Corporation, Nigeria",
    contract: "Retained Delivery Partnership — 5 Years",
    summary: "A long-term retained partnership for large-scale corporate and CSR event delivery across multiple locations in Nigeria.",
    challenge: "The work required consistent, high-standard execution across multiple locations with high operational expectations — including executive conferences, annual corporate events, and government stakeholder engagements.",
    approach: "We delivered planning, logistics, stakeholder coordination, and full event execution under a retained partnership structure — providing continuity of team, process, and quality across each engagement.",
    result: "The partnership provided stable, trusted delivery support across a five-year period — with zero critical incidents and consistent positive stakeholder feedback.",
  },
};

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        setStarted(true);
        let start = 0;
        const duration = 2000;
        const increment = target / (duration / 16);
        const timer = setInterval(() => {
          start += increment;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, started]);

  return <div ref={ref}>{count}{suffix}</div>;
}

export default function ProjectsProgrammes() {
  usePageMeta({
    title: "Projects & Programmes | Event Perfekt Global Ltd",
    description: "Explore Event Perfekt's governance-aligned projects and programmes across the UK, Africa, and Europe.",
    canonical: "https://eventperfekt.net/projects-and-programmes",
  });
  useVisitorTracking("/projects-and-programmes", "Projects & Programmes | Event Perfekt");

  const [activeModal, setActiveModal] = useState<string | null>(null);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const { data: projectImages } = useQuery({
    queryKey: ["/api/projects/main/images"],
    queryFn: async () => { const res = await fetch("/api/projects/main/images"); return res.json(); }
  });
  const { data: clientLogos } = useQuery({
    queryKey: ["/api/client-logos"],
    queryFn: async () => { const res = await fetch("/api/client-logos"); return res.json(); }
  });
  const { data: remittanceImages } = useQuery({
    queryKey: ["/api/projects/remittance/images"],
    queryFn: async () => { const res = await fetch("/api/projects/remittance/images?t=" + Date.now()); return res.json(); },
    staleTime: 0
  });
  const { data: fundingImages } = useQuery({
    queryKey: ["/api/projects/funding/images"],
    queryFn: async () => { const res = await fetch("/api/projects/funding/images?t=" + Date.now()); return res.json(); },
    staleTime: 0
  });
  const { data: twinpaayImages } = useQuery({
    queryKey: ["/api/projects/twinpay/images"],
    queryFn: async () => { const res = await fetch("/api/projects/twinpay/images?t=" + Date.now()); return res.json(); },
    staleTime: 0
  });
  const { data: twinTradeImages } = useQuery({
    queryKey: ["/api/projects/twintrade/images"],
    queryFn: async () => { const res = await fetch("/api/projects/twintrade/images?t=" + Date.now()); return res.json(); },
    staleTime: 0
  });
  const { data: readyToDeliverImages } = useQuery({
    queryKey: ["/api/projects/ready-to-deliver/images"],
    queryFn: async () => { const res = await fetch("/api/projects/ready-to-deliver/images?t=" + Date.now()); return res.json(); },
    staleTime: 0
  });

  const sectors = [
    { id: "public-sector",      name: "PUBLIC SECTOR",        link: "/case-studies/public-sector",   image: "https://images.pexels.com/photos/3116422/pexels-photo-3116422.jpeg?auto=compress&cs=tinysrgb&w=1200" },
    { id: "education",          name: "EDUCATION",             link: "/case-studies/oxford",  image: "https://images.pexels.com/photos/1205651/pexels-photo-1205651.jpeg?auto=compress&cs=tinysrgb&w=1200" },
    { id: "financial-services",  name: "FINANCIAL SERVICES",   link: "/case-studies/twinpay", image: "https://images.pexels.com/photos/6812431/pexels-photo-6812431.jpeg?auto=compress&cs=tinysrgb&w=1200" },
    { id: "charity-community",   name: "CHARITY & COMMUNITY",  link: "/case-studies/youth",   image: "https://images.pexels.com/photos/8858970/pexels-photo-8858970.jpeg?auto=compress&cs=tinysrgb&w=1200" },
    { id: "corporate-energy",    name: "CORPORATE – ENERGY",   link: "/case-studies/energy",  image: "https://images.pexels.com/photos/30324916/pexels-photo-30324916.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  ];

  const activeCaseStudy = activeModal ? CASE_STUDIES[activeModal] : null;

  return (
    <div className="min-h-screen bg-[#1A0A0E] overflow-x-hidden">
      <EmailCapturePopup page="/projects-and-programmes" delayMs={15000} storageKey="ep_pp_email" />
      <motion.header initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="bg-[#330311]/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <img src={eventPerfektLogo} alt="Event Perfekt" className="h-12 w-auto rounded-xl ring-2 ring-white/40 object-contain" />
          <a href="https://www.eventperfekt.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-white/30 text-white px-4 py-2 text-xs uppercase tracking-[0.22em] font-semibold hover:bg-white hover:text-[#330311] transition">
            <Home className="w-3.5 h-3.5" />
            Home Page
          </a>
        </div>
      </motion.header>

      <section ref={heroRef} className="relative w-full bg-black overflow-hidden" style={{ minHeight: "100vh" }}>
        <motion.div className="absolute inset-0" style={{ y: heroY }}>
          <img src={projectImages?.imageUrl || HERO_IMAGE} alt="Event Perfekt Projects & Programmes" className="absolute inset-0 w-full h-full object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A0A0E]/95 via-[#330311]/50 to-[#1A0A0E]/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#1A0A0E]" />
        <motion.div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col justify-center" style={{ minHeight: "100vh", opacity: heroOpacity }}>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="inline-flex items-center gap-2 bg-white text-[#330311] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.3em] mb-8 w-fit shadow-xl">
            <Globe className="w-3 h-3" />
            UK & Africa Programme Delivery
          </motion.div>
          <motion.h1 className="text-5xl md:text-8xl font-black text-white mb-6 leading-[0.95] tracking-tighter" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}>
            Projects
            <br />
            <span className="text-white/80">&</span>
            <br />
            Programmes
          </motion.h1>
          <motion.p className="text-lg md:text-xl text-white/70 mb-12 max-w-xl leading-relaxed" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
            Governance-aligned delivery across the UK, Africa & international markets — with in-country execution and full financial accountability built in.
          </motion.p>
          <motion.div className="flex flex-col sm:flex-row gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.7 }}>
            <a href="/consultation-request" onClick={() => trackFunnelEvent('cta_click', '/projects-programmes', { cta: 'consultation_request' })} className="inline-flex items-center justify-center gap-2 bg-white text-[#330311] hover:bg-[#330311] hover:text-white border-2 border-white font-black uppercase tracking-widest text-sm px-10 py-5 transition-all duration-300 shadow-2xl group">
              Talk to Our Delivery Team
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        </motion.div>
        <motion.div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown className="w-6 h-6 text-white/40" />
          </motion.div>
        </motion.div>
      </section>

      <section className="bg-[#330311] py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { icon: Globe, value: 14, suffix: "+", label: "Countries Served" },
            { icon: Trophy, value: 500, suffix: "+", label: "Events Delivered" },
            { icon: Users, value: 150, suffix: "K+", label: "Stakeholders Engaged" },
            { icon: FileCheck, value: 1, suffix: "", label: "Active UK Gov Contracts" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.1 }} viewport={{ once: true }} className="text-white">
              <div className="bg-white/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-4xl md:text-5xl font-black mb-1"><AnimatedCounter target={stat.value} suffix={stat.suffix} /></div>
              <div className="text-white/60 text-xs uppercase tracking-[0.2em]">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-[#0D0508] py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }} className="border border-white/10 overflow-hidden">
            <div className="bg-[#330311] px-8 py-5 flex items-center gap-3 border-b border-white/10">
              <Award className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <span className="text-yellow-400 text-[10px] font-black uppercase tracking-[0.35em]">Active UK Government Contract — Sole Awarded Supplier</span>
            </div>
            <div className="bg-[#1A0A0E] px-8 py-8">
              <span className="text-white/30 text-[10px] uppercase tracking-[0.4em] block mb-3">Contract Win</span>
              <h3 className="text-3xl font-black text-white tracking-tighter mb-1">UK Government — Africa Regional Support</h3>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-8">Event Perfekt Global Ltd</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/5 mb-8">
                {[
                  { label: "Contracting Authority", value: "UK Government Agency" },
                  { label: "Contract Type", value: "Multi-Country Programme" },
                  { label: "Region", value: "UK, Africa — 9+ Countries" },
                  { label: "Authorised Users", value: "UK Government Agencies" },
                  { label: "Status", value: "Active — Ongoing" },
                ].map((item, i) => (
                  <div key={i} className="bg-[#1A0A0E] px-5 py-4">
                    <span className="text-white/30 text-[10px] uppercase tracking-widest block mb-1">{item.label}</span>
                    <span className="text-white font-bold text-sm">{item.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/50 text-sm leading-relaxed">Event Perfekt Global Ltd is the sole awarded supplier for Africa Regional Support under an active UK Government contract. Covering cross-border programme delivery, in-country coordination, delegate management, financial reconciliation, and stakeholder engagement across 9+ African countries.</p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#0D0508] py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="text-white/30 text-xs uppercase tracking-[0.4em] block mb-4">Portfolio</span>
            <h2 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter">OUR WORK</h2>
            <div className="w-20 h-1 bg-white mx-auto mb-6" />
            <p className="text-white/50 text-lg max-w-2xl mx-auto">Real-world delivery across government, corporate, charity and institutional partners.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sectors.map((sector) => (
              <a key={sector.id} href={sector.link} className="group relative bg-[#1A0A0E] border border-white/10 hover:border-white/30 overflow-hidden flex flex-col transition-colors duration-300 cursor-pointer h-80 no-underline">
                <div className="absolute inset-0 bg-cover bg-top bg-no-repeat" style={{ backgroundImage: `url('${sector.image}')` }} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#1A0A0E]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <h3 className="text-white font-black text-3xl text-center uppercase tracking-tighter leading-tight mb-4">{sector.name}</h3>
                  <span className="text-white text-xs uppercase tracking-widest font-bold bg-white/10 border border-white/20 px-4 py-2">View Case Study →</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {activeCaseStudy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-pointer" onClick={() => setActiveModal(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ duration: 0.2 }} className="w-full max-w-2xl bg-[#1A0A0E] border border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-[#330311] px-6 py-4 flex items-center justify-between border-b border-white/10">
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-[0.35em] mb-1">Case Study</p>
                  <h3 className="text-white font-black text-xl">{activeCaseStudy.title}</h3>
                </div>
                <button onClick={() => setActiveModal(null)} className="text-white/60 hover:text-white">×</button>
              </div>
              <div className="p-6 space-y-5">
                <p className="text-white/70 text-sm leading-relaxed">{activeCaseStudy.summary}</p>
                <div className="grid md:grid-cols-3 gap-px bg-white/5">
                  {[["Challenge", activeCaseStudy.challenge], ["Approach", activeCaseStudy.approach], ["Result", activeCaseStudy.result]].map(([label, text]) => (
                    <div key={label} className="bg-[#0D0508] p-4">
                      <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] mb-2">{label}</p>
                      <p className="text-white/70 text-xs leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="bg-[#1A0A0E] py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/3 left-0 w-96 h-96 bg-[#330311] rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-0 w-96 h-96 bg-[#330311] rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="text-white/30 text-xs uppercase tracking-[0.4em] block mb-4">Capabilities</span>
            <h2 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter">WHAT WE DO</h2>
            <div className="w-20 h-1 bg-white mx-auto" />
          </motion.div>
          <div className="grid md:grid-cols-3 gap-px bg-white/5">
            {[
              { icon: Shield, title: "Government & Public Sector", desc: "UK government contracts including multi-agency programmes across Africa and internationally." },
              { icon: Building, title: "Corporate & CSR Programmes", desc: "Multi-location corporate event programmes with financial governance, vendor management and stakeholder reporting." },
              { icon: Globe, title: "International Coordination", desc: "In-country logistics, cultural alignment, and cross-border compliance for events spanning multiple markets." },
              { icon: FileCheck, title: "Governance & Compliance", desc: "Full audit trails, procurement compliance, contractor management, and regulatory adherence across all jurisdictions." },
              { icon: Users, title: "Stakeholder Management", desc: "Executive-level communication, progress reporting and escalation management across all programme tiers." },
              { icon: Trophy, title: "Full Event Delivery", desc: "Day-of coordination, supplier management, guest experience, and post-event analytics and closure reporting." },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.5, delay: i * 0.08 }} viewport={{ once: true }} className="bg-[#1A0A0E] p-10 group hover:bg-[#330311]/20 transition-all duration-500">
                <div className="bg-white/5 w-12 h-12 rounded-full flex items-center justify-center mb-6 border border-white/10 group-hover:border-white/30 group-hover:bg-white/10 transition-all duration-300">
                  <item.icon className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-white font-black uppercase tracking-wide text-sm mb-3">{item.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed group-hover:text-white/60 transition-colors">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#330311] py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-4xl font-light text-white text-center mb-16 tracking-wide">
            Our Programmes
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { id: "remittance", title: "Remittance & Financial Coordination", desc: "Cross-border payments & compliance", link: "/projects/remittance", image: remittanceImages?.imageUrl || FALLBACK_IMAGES["remittance"] },
              { id: "funding", title: "Programme Funding & Development", desc: "Multi-agency governance", link: "/projects/funding", image: fundingImages?.imageUrl || FALLBACK_IMAGES["funding"] },
            ].map((prog, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: i * 0.2 }} viewport={{ once: true }}>
                <div className="bg-[#1A0A0E] border border-white/10 hover:border-white/30 overflow-hidden h-48 mb-6 relative group">
                  <img src={prog.image} alt={prog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <h3 className="text-white font-black uppercase tracking-wide text-sm mb-2">{prog.title}</h3>
                <p className="text-white/50 text-sm mb-4">{prog.desc}</p>
                <Link href={prog.link}>
                  <a className="inline-block text-white border-b border-white/30 hover:border-white text-xs uppercase tracking-widest font-bold no-underline transition">View Programme →</a>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#1A0A0E] py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }}>
            <h2 className="text-4xl font-black text-white mb-6 tracking-tighter">Twinpaay Platform</h2>
            <p className="text-white/60 text-base leading-relaxed mb-6">Compliance-driven cross-border payments infrastructure enabling secure, auditable international financial transactions.</p>
            <p className="text-white/70 text-sm leading-relaxed mb-8">
              Cross-border payment processing, compliance and audit capabilities, real-time transaction tracking, and multi-currency support.
            </p>
            <Link href="/projects/twinpay">
              <a onClick={() => trackFunnelEvent('cta_click', '/projects-programmes', { cta: 'explore_twinpay' })} className="inline-block bg-white/10 border border-white/20 hover:border-white text-white text-xs uppercase tracking-widest font-black px-6 py-3 no-underline transition">Explore Platform →</a>
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }} className="h-80 rounded flex items-center justify-center border border-white/10 group relative overflow-hidden">
            <img src={twinpaayImages?.imageUrl || FALLBACK_IMAGES["twinpay"]} alt="Twinpaay Platform" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </motion.div>
        </div>
      </section>

      <section className="bg-[#0D0508] py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }} className="h-80 rounded flex items-center justify-center border border-white/10 order-2 md:order-1 group relative overflow-hidden">
            <img src={twinTradeImages?.imageUrl || FALLBACK_IMAGES["twintrade"]} alt="Twin Trade Global" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }} className="order-1 md:order-2">
            <h2 className="text-4xl font-black text-white mb-6 tracking-tighter">Twin Trade Global</h2>
            <p className="text-white/60 text-base leading-relaxed mb-6">Cross-border partnership ecosystem with governance oversight enabling strategic trade partnerships across multiple markets.</p>
            <p className="text-white/70 text-sm leading-relaxed mb-8">
              Strategic partnership framework, cross-border trade coordination, governance and compliance oversight, and network ecosystem management.
            </p>
            <Link href="/projects/twintrade">
              <a onClick={() => trackFunnelEvent('cta_click', '/projects-programmes', { cta: 'explore_twintrade' })} className="inline-block bg-white/10 border border-white/20 hover:border-white text-white text-xs uppercase tracking-widest font-black px-6 py-3 no-underline transition">Explore Network →</a>
            </Link>
          </motion.div>
        </div>
      </section>

      {clientLogos && clientLogos.filter((l: any) => l.logoUrl).length > 0 && (
        <section className="bg-[#0D0508] border-y border-white/10 py-20 overflow-hidden w-full">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center text-2xl md:text-3xl font-black text-white mb-16 tracking-tighter">Trusted By</motion.h2>
          <div className="relative w-full overflow-hidden">
            <div className="flex gap-16 items-center whitespace-nowrap" style={{ animation: "marquee 30s linear infinite", display: "inline-flex", minWidth: "100%" }}>
              {[...clientLogos, ...clientLogos, ...clientLogos].map((logo: any, i: number) =>
                logo.logoUrl ? (
                  <img key={i} src={logo.logoUrl} alt={logo.clientName || "Client"} className="h-12 w-auto object-contain opacity-40 hover:opacity-80 transition grayscale hover:grayscale-0 flex-shrink-0 duration-300" />
                ) : null
              )}
            </div>
          </div>
          <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }`}</style>
        </section>
      )}

      <section className="relative py-36 px-6 overflow-hidden">
        <img src={luxuryWeddingImage} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#330311]/93" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
            {readyToDeliverImages?.imageUrl && (<img src={readyToDeliverImages.imageUrl} alt="Ready to Deliver" className="w-full h-auto mb-12 rounded shadow-2xl" />)}
            <span className="text-white/40 text-xs uppercase tracking-[0.4em] block mb-6">Work With Us</span>
            <h2 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-tight">READY TO<br />DELIVER?</h2>
            <div className="w-20 h-1 bg-white mx-auto mb-8" />
            <p className="text-white/70 text-lg mb-12 font-medium max-w-xl mx-auto leading-relaxed">Whether it's a government programme, corporate CSR, or institutional event — we have the structure, the team, and the track record.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a href="/consultation-request" onClick={() => trackFunnelEvent('cta_click', '/projects-programmes', { cta: 'start_conversation' })} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-flex items-center justify-center gap-2 bg-white text-[#330311] hover:bg-[#330311] hover:text-white border-2 border-white font-black uppercase tracking-widest text-sm px-10 py-5 transition-all duration-300 shadow-2xl group">
                Start the Conversation
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="bg-[#0D0508] border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src={eventPerfektLogo} alt="Event Perfekt" className="h-10 w-auto rounded-lg ring-1 ring-white/20" />
            <div>
              <p className="text-white font-black text-sm uppercase tracking-widest">Event Perfekt Global Ltd</p>
              <p className="text-white/30 text-xs">20 Wenlock Road, London, N1 7PG</p>
              <p className="text-white/30 text-xs">Company No. 15875326</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-white/40 text-xs"><a href="mailto:info@eventperfekt.com" className="hover:text-white transition">info@eventperfekt.com</a></p>
            <p className="text-white/20 text-xs mt-1">© {new Date().getFullYear()} Event Perfekt Global Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
