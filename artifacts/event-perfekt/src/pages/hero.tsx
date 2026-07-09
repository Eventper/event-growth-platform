import { useState, useEffect } from "react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building,
  Calendar,
  Globe2,
  Landmark,
  FileText,
  Calculator,
  MapPin,
  Search,
  ShieldAlert,
  Users,
  Mic,
  GraduationCap,
  Handshake,
  UserCheck,
  Wallet,
  CreditCard,
  ArrowLeftRight,
  CheckCircle,
  Receipt,
  ShieldCheck,
  FileCheck,
  FolderOpen,
  Lock,
  BookOpen,
  FileBarChart,
  ClipboardCheck,
  TrendingUp,
  Award,
  BarChart3,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";
import heroBg from "@assets/luxury-wedding-celebration-illuminated-by-chandelier-flame-generated-by-ai_1754251182698.jpg";
import heroBgWebp from "@assets/hero-home.webp";
import picture1 from "@assets/stock_images/bg_ballroom.jpg";
import picture2 from "@assets/stock_images/bg_gala.jpg";
import picture3 from "@assets/stock_images/bg_wedding.jpg";
import picture4 from "@assets/stock_images/bg_outdoor.jpg";

function Counter({ value }: { value: string }) {
  const [count, setCount] = useState(0);
  const digits = value.replace(/\D/g, "");
  const target = digits ? parseInt(digits) : NaN;
  const prefix = value.match(/^[^\d]+/)?.[0] || "";
  const suffix = value.replace(/^[^\d]*\d+/, "");

  useEffect(() => {
    if (isNaN(target) || target === 0) return;
    let start = 0;
    const duration = 2000;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target]);

  if (isNaN(target)) return <span>{value}</span>;
  return <span>{prefix}{count}{suffix}</span>;
}

export default function HeroPage() {
  usePageMeta({
    title: "Event Perfekt | Africa Programme Delivery & Financial Operations Partner",
    description: "Delivering complex programmes across Africa. Programme planning, in-country execution, cross-border payments, financial reconciliation, governance and audit-ready reporting for governments, development organisations and international businesses.",
    canonical: "https://eventperfekt.com",
  });

  return (
    <div className="min-h-screen bg-[#1A0A0E]">
      <header className="bg-[#330311]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={eventPerfektLogo} alt="Event Perfekt Logo" className="h-14 w-auto rounded-xl shadow-2xl ring-2 ring-[#ffffff]/50 object-contain" />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
              <Link href="/create-event"><Button variant="ghost" className="text-white font-bold uppercase tracking-widest text-xs sm:text-xs border border-white/40 hover:border-white/70 hover:bg-white/10 px-2 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap">Work With Us</Button></Link>
              <Link href="/staff"><Button className="bg-[#ffffff] hover:bg-white hover:text-[#330311] text-[#330311] font-bold px-3 sm:px-6 py-1.5 sm:py-2 rounded-full transition-all duration-300 uppercase tracking-widest text-xs shadow-lg whitespace-nowrap">Staff Portal</Button></Link>
            </div>
          </div>
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div className="h-[700px] md:h-[850px] relative">
          <picture>
            <source srcSet={heroBgWebp} type="image/webp" />
            <img
              src={heroBg}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading="eager"
              fetchPriority="high"
              width="1920"
              height="850"
              sizes="100vw"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-r from-[#330311]/90 via-[#330311]/40 to-transparent"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex items-center">
            <div className="text-left w-full md:w-2/3">
              <motion.h1 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight drop-shadow-2xl" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: "easeOut" }}>
                Delivering Complex Programmes Across Africa — From Planning to Financial Reconciliation
              </motion.h1>
              <motion.p className="text-lg md:text-xl text-white/90 mb-12 max-w-xl leading-relaxed drop-shadow-xl font-medium" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}>
                We help governments, development organisations, universities and international businesses deliver workshops, conferences, stakeholder engagements and capacity-building programmes across Africa — with local execution, cross-border payments, financial governance and audit-ready reporting.
              </motion.p>
              <motion.div className="flex flex-col sm:flex-row gap-6" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.8 }}>
                <Link href="/create-event"><Button size="lg" className="text-base px-12 py-8 shadow-2xl !bg-[#E2C87A] !text-[#1A0A0E] hover:!bg-[#E2C87A] transition-all duration-300 font-black uppercase tracking-widest border-0 rounded-none">Work With Us<ArrowRight className="w-5 h-5 ml-2" /></Button></Link>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white">
        <div className="relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${picture1})` }}>
          <div className="absolute inset-0 bg-[#330311]/95 backdrop-blur-[2px]"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
            <motion.section className="bg-transparent rounded-2xl p-0 mb-12" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
              <div className="text-center mb-16">
                <h2 className="text-5xl md:text-7xl font-black mb-6 text-white tracking-tighter">BUILT FOR ENVIRONMENTS WHERE FAILURE IS NOT AN OPTION</h2>
                <div className="w-24 h-1 bg-[#ffffff] mx-auto mb-8"></div>
                <p className="text-xl mb-8 max-w-3xl mx-auto leading-relaxed text-white/80 font-medium">We work with government bodies, development organisations, universities, and international businesses who need more than a supplier — they need a delivery partner who owns outcomes, controls finances, and produces audit-ready records.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-20">
                {[
                  { icon: Calendar, number: "15+", label: "Years Experience" },
                  { icon: Globe2, number: "9+", label: "Countries Delivered" },
                  { icon: Building, number: "UK and Africa", label: "Operations" },
                  { icon: Landmark, number: "Gov", label: "UK Government Trusted" },
                ].map((stat, index) => (
                  <motion.div key={index} className="text-center group" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }}>
                    <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 group-hover:border-[#ffffff]/50 transition-all duration-500 group-hover:scale-110"><stat.icon className="h-10 w-10 text-[#ffffff]" /></div>
                    <div className="text-4xl font-black text-white mb-1 tracking-tighter"><Counter value={stat.number} /></div>
                    <div className="text-[#ffffff] text-xs font-bold tracking-[0.2em] uppercase">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
              <div className="text-center">
                <p className="text-white/70 text-sm font-medium max-w-2xl mx-auto">
                  Trusted by the UK Government to support programme delivery across multiple African countries.
                </p>
              </div>
            </motion.section>
          </div>
        </div>

        <div className="relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${picture2})` }}>
          <div className="absolute inset-0 bg-[#1A0A0E]/95"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
            <motion.section className="bg-transparent" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
              <div className="text-center mb-16">
                <h2 id="canvas-section" className="text-5xl md:text-7xl font-black mb-4 text-white tracking-tighter scroll-mt-24">TWO DISCIPLINES. ONE STANDARD OF DELIVERY.</h2>
                <div className="w-24 h-1 bg-[#ffffff] mx-auto mb-8"></div>
                <p className="text-xl text-white/80 font-medium">Programme delivery and strategic events, structured for government buyers, corporates, NGOs, and private clients.</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                {[
                  { title: "Government", desc: "Delivery frameworks, governance, and accountability", icon: Landmark, img: picture2 },
                  { title: "Corporate", desc: "Summits, launches, conferences, and stakeholder events", icon: Building, img: picture1 },
                  { title: "Private", desc: "Weddings, celebrations, university balls, and family occasions", icon: PartyPopper, img: picture3 },
                  { title: "Africa Regional", desc: "Cross-border support and in-country delivery capability", icon: Globe2, img: picture4 },
                ].map((item, idx) => (
                  <Link key={idx} href="/create-event"><div className="relative group aspect-[4/5] bg-white/5 border border-white/10 rounded-none overflow-hidden cursor-pointer"><div className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-110 group-hover:scale-100 grayscale-[0.5] group-hover:grayscale-0" style={{ backgroundImage: `url(${item.img})` }} /><div className="absolute inset-0 bg-gradient-to-t from-[#330311] via-[#330311]/20 to-transparent opacity-90"></div><div className="absolute bottom-0 left-0 right-0 p-8 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500"><item.icon className="w-10 h-10 text-[#ffffff] mb-4" /><h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">{item.title}</h3><p className="text-white/70 text-sm font-medium leading-relaxed">{item.desc}</p></div></div></Link>
                ))}
              </div>
            </motion.section>
          </div>
        </div>

        <div className="relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${picture3})` }}>
          <div className="absolute inset-0 bg-[#330311]/95 backdrop-blur-[2px]"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
            <motion.section className="bg-transparent" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} viewport={{ once: true }}>
              <div className="text-center mb-16">
                <h2 id="services-section" className="text-5xl md:text-7xl font-black mb-4 text-white tracking-tighter scroll-mt-24">THE CLIENT JOURNEY</h2>
                <div className="w-24 h-1 bg-[#ffffff] mx-auto mb-8"></div>
                <p className="text-xl max-w-3xl mx-auto text-white/80 font-medium leading-relaxed">From first planning conversation to final audit sign-off — a structured delivery model built for complex, multi-country programmes.</p>
              </div>
              <div className="space-y-16 mb-20">
                {[
                  {
                    step: "01",
                    title: "Programme Planning",
                    items: [
                      { icon: Calculator, text: "Budget planning" },
                      { icon: MapPin, text: "Venue sourcing" },
                      { icon: Search, text: "Supplier mapping" },
                      { icon: ShieldAlert, text: "Risk assessment" },
                      { icon: FileText, text: "Delivery planning" },
                    ],
                  },
                  {
                    step: "02",
                    title: "Programme Delivery",
                    items: [
                      { icon: Users, text: "Workshops" },
                      { icon: Mic, text: "Conferences" },
                      { icon: GraduationCap, text: "Training programmes" },
                      { icon: Handshake, text: "Stakeholder engagement" },
                      { icon: UserCheck, text: "Delegate management" },
                      { icon: Globe2, text: "In-country coordination" },
                    ],
                  },
                  {
                    step: "03",
                    title: "Financial Operations",
                    items: [
                      { icon: Wallet, text: "Supplier payments" },
                      { icon: CreditCard, text: "Beneficiary / delegate payments" },
                      { icon: ArrowLeftRight, text: "Cross-border payments" },
                      { icon: ArrowLeftRight, text: "FX coordination" },
                      { icon: CheckCircle, text: "Payment approvals" },
                      { icon: Receipt, text: "Financial reconciliation" },
                    ],
                  },
                  {
                    step: "04",
                    title: "Governance & Compliance",
                    items: [
                      { icon: ShieldCheck, text: "Supplier due diligence" },
                      { icon: FileCheck, text: "Vendor verification" },
                      { icon: FolderOpen, text: "Procurement records" },
                      { icon: Lock, text: "Document control" },
                      { icon: BookOpen, text: "Audit trail" },
                      { icon: FileBarChart, text: "Compliance reporting" },
                    ],
                  },
                  {
                    step: "05",
                    title: "Programme Close-Out",
                    items: [
                      { icon: Receipt, text: "Final reconciliation" },
                      { icon: TrendingUp, text: "Delivery reporting" },
                      { icon: FileCheck, text: "Payment evidence" },
                      { icon: Award, text: "Lessons learned" },
                      { icon: ClipboardCheck, text: "Audit support" },
                    ],
                  },
                ].map((phase, phaseIndex) => (
                  <div key={phaseIndex}>
                    <div className="flex items-center gap-4 mb-8">
                      <span className="text-5xl font-black text-white/10">{phase.step}</span>
                      <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter">{phase.title}</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {phase.items.map((item, index) => (
                        <motion.div key={index} className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-start gap-3" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.08 }} viewport={{ once: true }}>
                          <item.icon className="w-5 h-5 text-[#E2C87A] shrink-0 mt-0.5" />
                          <p className="text-white/80 text-sm font-medium">{item.text}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          </div>
        </div>

        <div className="relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${picture4})` }}>
          <div className="absolute inset-0 bg-[#1A0A0E]/95"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
            <motion.section className="bg-transparent" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
              <div className="text-center mb-16">
                <h2 className="text-5xl md:text-7xl font-black mb-4 text-white tracking-tighter">WHY ORGANISATIONS CHOOSE EVENT PERFEKT</h2>
                <div className="w-24 h-1 bg-[#ffffff] mx-auto mb-8"></div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {[
                  { icon: Globe2, title: "One trusted partner across multiple African countries" },
                  { icon: Building, title: "UK oversight with in-country execution" },
                  { icon: Users, title: "Local supplier coordination" },
                  { icon: CreditCard, title: "Cross-border payment support" },
                  { icon: Receipt, title: "Financial reconciliation built into delivery" },
                  { icon: FileCheck, title: "Audit-ready documentation" },
                  { icon: ShieldCheck, title: "Governance and compliance from start to finish" },
                ].map((item, index) => (
                  <motion.div key={index} className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-start gap-4" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }}>
                    <div className="w-10 h-10 rounded-lg bg-[#E2C87A]/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-[#E2C87A]" />
                    </div>
                    <p className="text-white/90 text-sm font-medium leading-relaxed">{item.title}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>
        </div>

        <div className="relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${picture1})` }}>
          <div className="absolute inset-0 bg-[#330311]/95 backdrop-blur-[2px]"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
            <motion.section className="bg-transparent" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} viewport={{ once: true }}>
              <div className="text-center mb-16">
                <h2 className="text-5xl md:text-7xl font-black mb-4 text-white tracking-tighter">POWERED BY THE TWIN TRADE PLATFORM</h2>
                <div className="w-24 h-1 bg-[#ffffff] mx-auto mb-8"></div>
                <p className="text-xl max-w-3xl mx-auto text-white/80 font-medium leading-relaxed">Every programme we deliver is supported by our Twin Trade operating platform, giving clients greater visibility across suppliers, payments, documents, due diligence, reconciliation and audit trails.</p>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 max-w-7xl mx-auto mb-12">
                {[
                  { icon: ShieldCheck, text: "Supplier due diligence" },
                  { icon: ArrowLeftRight, text: "Cross-border payments" },
                  { icon: UserCheck, text: "Beneficiary management" },
                  { icon: Receipt, text: "Financial reconciliation" },
                  { icon: FolderOpen, text: "Document storage" },
                  { icon: BookOpen, text: "Audit trail" },
                  { icon: BarChart3, text: "Project dashboards" },
                ].map((item, index) => (
                  <motion.div key={index} className="bg-white/5 border border-white/10 rounded-xl p-5 text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.08 }} viewport={{ once: true }}>
                    <item.icon className="w-6 h-6 text-[#E2C87A] mx-auto mb-3" />
                    <p className="text-white/80 text-xs font-medium">{item.text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>
        </div>

        <div className="relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${picture4})` }}>
          <div className="absolute inset-0 bg-[#330311]/95 backdrop-blur-[2px]"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
            <motion.section className="bg-transparent" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} viewport={{ once: true }}>
              <div className="text-center mb-20">
                <h2 className="text-5xl md:text-7xl font-black mb-4 text-white tracking-tighter uppercase">HOW WE DELIVER</h2>
                <div className="w-24 h-1 bg-[#ffffff] mx-auto mb-8"></div>
                <p className="text-xl text-white/80 font-medium leading-relaxed">A seven-phase delivery model from planning to audit close-out.</p>
              </div>
              <div className="grid md:grid-cols-7 gap-4 max-w-7xl mx-auto">
                {[
                  { step: "1", title: "Programme planning" },
                  { step: "2", title: "Country readiness" },
                  { step: "3", title: "Supplier due diligence" },
                  { step: "4", title: "Programme delivery" },
                  { step: "5", title: "Payment coordination" },
                  { step: "6", title: "Financial reconciliation" },
                  { step: "7", title: "Audit and close-out" },
                ].map((item, index) => (
                  <motion.div key={index} className="text-center relative" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }}>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-full flex flex-col items-center">
                      <div className="text-3xl font-black text-[#E2C87A] mb-3">{item.step}</div>
                      <p className="text-white/90 text-xs font-bold uppercase tracking-wider leading-relaxed">{item.title}</p>
                    </div>
                    {index < 6 && (
                      <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-px bg-white/20"></div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>
        </div>

        <div className="relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${heroBg})` }}>
          <div className="absolute inset-0 bg-[#330311]/90 backdrop-blur-[2px]"></div>
          <motion.section className="relative z-10 border-y-8 border-[#ffffff] p-20" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
            <div className="text-center">
              <div className="mb-12">
                <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-6">READY TO TALK TO OUR DELIVERY TEAM?</h2>
                <p className="text-2xl text-white/80 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">Whether you have a brief, a budget, or just an idea — we would like to hear from you.</p>
                <div className="flex flex-col sm:flex-row gap-8 justify-center">
                  <Link href="/create-event"><Button size="lg" className="text-xl px-16 py-10 shadow-2xl font-black bg-[#E2C87A] text-[#1A0A0E] hover:bg-[#E2C87A] hover:scale-110 transition-all duration-300 uppercase tracking-widest rounded-none">Submit an Enquiry</Button></Link>
                  <Link href="/projects"><Button size="lg" className="text-xl px-16 py-10 shadow-2xl font-black bg-transparent text-[#E2C87A] border-2 border-[#E2C87A] hover:bg-transparent transition-all duration-300 uppercase tracking-widest rounded-none">View Our Work</Button></Link>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      <footer style={{ backgroundColor: '#1a0610', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center space-x-6 mb-8">
                <img src={eventPerfektLogo} alt="Event Perfekt" className="h-14 w-14 rounded-xl shadow-2xl ring-2 ring-[#ffffff]/50" />
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tighter uppercase">EVENT <span className="text-[#ffffff]">PERFEKT</span></h3>
                  <p className="text-[#ffffff] text-[10px] font-black tracking-[0.3em] uppercase italic">...making yours perfekt</p>
                </div>
              </div>
              <p className="text-white/60 text-sm leading-relaxed font-medium">We are committed to GDPR compliance, data protection, and responsible delivery across all our operations. Event Perfekt Global Ltd is registered in England and Wales. Company No. 15875326.</p>
            </div>

            <div>
              <h4 className="text-[#ffffff] font-black text-[10px] uppercase tracking-[0.3em] mb-8">Our Services</h4>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest leading-relaxed">
                <Link href="/booking-enquiry" className="hover:text-[#ffffff] transition-colors">Corporate Events</Link>
                <span className="text-white/30 mx-2">·</span>
                <Link href="/booking-enquiry" className="hover:text-[#ffffff] transition-colors">Project Planning</Link>
                <span className="text-white/30 mx-2">·</span>
                <Link href="/booking-enquiry" className="hover:text-[#ffffff] transition-colors">Private Events</Link>
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Quick Links</h4>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <span className="text-white/30 mx-2">·</span>
                <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
                <span className="text-white/30 mx-2">·</span>
                <Link href="/projects-and-programmes" className="hover:text-white transition-colors">Projects & Programmes</Link>
                <span className="text-white/30 mx-2">·</span>
                <Link href="/planner-dashboard" className="text-[#ffffff] font-bold hover:text-white transition-colors">Planner Dashboard</Link>
                <span className="text-white/30 mx-2">·</span>
                <Link href="/booking-enquiry" className="hover:text-white transition-colors">Book an Event</Link>
                <span className="text-white/30 mx-2">·</span>
                <Link href="/360-booth-hire-milton-keynes" className="hover:text-white transition-colors">360 Booth Hire</Link>
                <span className="text-white/30 mx-2">·</span>
                <Link href="/vendor-portal" className="hover:text-white transition-colors">Vendor Portal</Link>
                <span className="text-white/30 mx-2">·</span>
                <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <span className="text-white/30 mx-2">·</span>
                <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
              </p>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                <p className="text-sm font-semibold leading-relaxed">
                  <Link href="/create-event" className="hover:text-white transition-colors" style={{ color: '#c9a55a' }}><span>✦</span> Submit an Enquiry</Link>
                  <span className="text-white/30 mx-2">·</span>
                  <Link href="/iamher" className="hover:text-white transition-colors" style={{ color: '#E2C87A' }}><span>✦</span> An Evening for Her · 30 Oct 2026</Link>
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-[#ffffff] font-black text-[10px] uppercase tracking-[0.3em] mb-8">Headquarters</h4>
              <div className="space-y-6">
                <div>
                  <p className="text-[#ffffff] text-[10px] font-black uppercase tracking-wider mb-2">United Kingdom</p>
                  <p className="text-white/60 text-xs font-bold leading-relaxed uppercase tracking-wider">20 Wenlock Road, London, N1 7PG</p>
                </div>
                <div>
                  <p className="text-[#ffffff] text-[10px] font-black uppercase tracking-wider mb-2">Nigeria</p>
                  <p className="text-white/60 text-xs font-bold leading-relaxed uppercase tracking-wider">25 Kusenla Street, Lagos, Nigeria</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} className="pt-8">
            <div className="text-center mb-8">
              <p className="text-[#ffffff] text-sm font-black uppercase tracking-[0.2em] mb-6">Delivering Excellence Globally</p>
              <p className="text-white/60 text-xs leading-relaxed max-w-4xl mx-auto">We are committed to GDPR compliance, data protection, and responsible event delivery across all our operations.</p>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-white/40 text-sm">&copy; {new Date().getFullYear()} Event Perfekt. All rights reserved.</p>
              <a href="https://www.eventperfekt.com" target="_blank" rel="noopener noreferrer" className="text-white/60 text-sm font-medium hover:text-white transition-colors">www.eventperfekt.com</a>
              <div className="flex items-center gap-4"><Link href="/privacy-policy" className="text-white/40 text-xs hover:text-white/70 transition-colors">Privacy</Link><span className="text-white/20">|</span><Link href="/terms-of-service" className="text-white/40 text-xs hover:text-white/70 transition-colors">Terms</Link></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
