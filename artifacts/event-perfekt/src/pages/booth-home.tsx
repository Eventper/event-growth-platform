import { useState, useEffect } from "react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowRight, Camera, Globe, Sparkles, Calendar,
  MapPin, MessageCircle, Phone, ChevronDown,
  Instagram, Facebook, Star,
  PartyPopper, Gift, Smartphone, Plane, Palette,
} from "lucide-react";

const BURGUNDY = "#330311";
const GOLD = "#C9A84C";

/* ── Region selector ───────────────────────── */
function RegionCard({
  flag, title, locations, priceFrom, priceNote, href, whatsapp,
}: {
  flag: string; title: string; locations: string; priceFrom: string; priceNote: string; href: string; whatsapp: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
    >
      <div className="p-8 md:p-10">
        <div className="text-4xl mb-4">{flag}</div>
        <h3 className="text-2xl font-bold text-black mb-2">{title}</h3>
        <p className="text-gray-500 text-sm mb-4">{locations}</p>
        <div className="mb-6">
          <p className="text-sm text-gray-500">From</p>
          <p className="text-3xl font-extrabold" style={{ color: BURGUNDY }}>{priceFrom}</p>
          <p className="text-xs text-gray-400">{priceNote}</p>
        </div>
        <div className="space-y-3">
          <Link href={href}>
            <Button
              className="w-full text-white font-bold py-4 rounded-full text-sm"
              style={{ background: BURGUNDY }}
            >
              View Packages <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full border text-sm font-semibold transition-all hover:bg-gray-50"
            style={{ borderColor: BURGUNDY, color: BURGUNDY }}
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Feature ───────────────────────── */
function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${BURGUNDY}10` }}>
        <Icon size={22} style={{ color: BURGUNDY }} />
      </div>
      <div>
        <h4 className="font-bold text-black text-sm mb-1">{title}</h4>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────── */
export default function BoothHome() {
  usePageSEO({
    title: "360 Photo Booth Hire | Event Perfekt",
    description:
      "Premium 360 photo booth hire for weddings, birthdays, corporate events and private parties across the UK and Nigeria. Instant sharing, professional attendant, stylish setup.",
    url: "https://eventperfekt.net/booth",
    image: "https://eventperfekt.net/assets/360-booth/hero-real-party.png",
    imageAlt: "360 photo booth experience at a luxury event",
    ogType: "website",
    keywords:
      "360 photo booth hire, 360 booth rental, wedding photo booth, birthday photo booth, corporate event booth, photo booth hire UK, photo booth Nigeria, 360 video booth, party entertainment, event photo booth",
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-black font-[Poppins] overflow-x-hidden">
      {/* ── HEADER ───────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/booth">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: BURGUNDY }}>
                <Camera size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight" style={{ color: scrolled ? BURGUNDY : "#fff" }}>
                  EP Booth
                </p>
                <p className={`text-[10px] tracking-wider uppercase ${scrolled ? "text-gray-400" : "text-white/60"}`}>
                  360 Photo Booth Hire
                </p>
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#packages" className={`text-sm font-medium hover:opacity-70 transition-opacity ${scrolled ? "text-black" : "text-white"}`}>
              Packages
            </a>
            <a href="#how-it-works" className={`text-sm font-medium hover:opacity-70 transition-opacity ${scrolled ? "text-black" : "text-white"}`}>
              How It Works
            </a>
            <a href="#contact" className={`text-sm font-medium hover:opacity-70 transition-opacity ${scrolled ? "text-black" : "text-white"}`}>
              Contact
            </a>
            <Link href="/360-booth-hire-milton-keynes">
              <Button className="text-white font-bold px-5 py-2 rounded-full text-xs" style={{ background: BURGUNDY }}>
                UK
              </Button>
            </Link>
            <Link href="/photo-booth-nigeria">
              <Button className="text-white font-bold px-5 py-2 rounded-full text-xs" style={{ background: BURGUNDY }}>
                Nigeria
              </Button>
            </Link>
          </nav>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ color: scrolled ? BURGUNDY : "#fff" }}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 px-4 py-6 space-y-4">
            <a href="#packages" className="block text-sm font-medium text-black" onClick={() => setMenuOpen(false)}>Packages</a>
            <a href="#how-it-works" className="block text-sm font-medium text-black" onClick={() => setMenuOpen(false)}>How It Works</a>
            <a href="#contact" className="block text-sm font-medium text-black" onClick={() => setMenuOpen(false)}>Contact</a>
            <Link href="/360-booth-hire-milton-keynes" className="block text-sm font-medium" style={{ color: BURGUNDY }}>UK Booth</Link>
            <Link href="/photo-booth-nigeria" className="block text-sm font-medium" style={{ color: BURGUNDY }}>Nigeria Booth</Link>
          </div>
        )}
      </header>

      {/* ── HERO ───────────────────────── */}
      <section className="relative w-full min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#1a0a0e] to-[#0A0A0A]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 text-center py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8"
            style={{ borderColor: `${GOLD}40`, color: GOLD }}
          >
            <Sparkles size={14} /> Premium 360 Photo Booth Hire
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6"
          >
            Capture Every Moment
            <br />
            <span style={{ color: GOLD }}>In 360°</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Weddings, birthdays, corporate events, and private parties across the UK and Nigeria.
            Professional attendant, instant sharing, and unforgettable memories.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/360-booth-hire-milton-keynes">
              <Button className="text-white font-bold px-8 py-6 rounded-full text-base shadow-lg hover:shadow-xl transition-all" style={{ background: BURGUNDY }}>
                <Globe size={18} className="mr-2" /> UK Booth
              </Button>
            </Link>
            <Link href="/photo-booth-nigeria">
              <Button className="text-white font-bold px-8 py-6 rounded-full text-base shadow-lg hover:shadow-xl transition-all" style={{ background: BURGUNDY }}>
                <Globe size={18} className="mr-2" /> Nigeria Booth
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16"
          >
            <a href="#packages" className="inline-flex flex-col items-center gap-2 text-white/40 hover:text-white/60 transition-colors">
              <span className="text-xs tracking-widest uppercase">Explore</span>
              <ChevronDown size={20} className="animate-bounce" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── WHY 360 BOOTH ───────────────────────── */}
      <section id="how-it-works" className="py-20 md:py-28 px-4 md:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">Why Choose a 360 Booth?</h2>
            <p className="text-gray-500 max-w-xl mx-auto">A 360 photo booth is the centrepiece of modern event entertainment. Your guests step on, strike a pose, and receive a stunning slow-motion video they share instantly.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Camera, title: "Professional Setup", desc: "Sleek platform, ring light, and HD camera for cinema-quality output." },
              { icon: Sparkles, title: "Instant Sharing", desc: "Guests receive their video via QR code within seconds — no waiting." },
              { icon: Calendar, title: "Any Event", desc: "Weddings, birthdays, corporate launches, proms, graduations, and more." },
              { icon: Star, title: "Custom Overlays", desc: "Branded frames, event hashtags, and personal messages on every video." },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 border border-gray-100"
              >
                <Feature icon={f.icon} title={f.title} desc={f.desc} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REGION SELECTOR ───────────────────────── */}
      <section id="packages" className="py-20 md:py-28 px-4 md:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">Choose Your Region</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              We operate in the United Kingdom and Nigeria with local teams, local pricing, and the same premium experience.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <RegionCard
              flag="🇬🇧"
              title="United Kingdom"
              locations="Milton Keynes, Bedford, Northampton, Luton, London & surrounding areas"
              priceFrom="£395"
              priceNote="2-hour Quick Spin package. VAT and travel calculated separately."
              href="/360-booth-hire-milton-keynes"
              whatsapp="https://wa.me/447984331651"
            />
            <RegionCard
              flag="🇿🇦"
              title="Nigeria"
              locations="Lagos, Abuja, Port Harcourt & major cities"
              priceFrom="₦395,000"
              priceNote="2-hour Quick Spin package. All-inclusive with VAT."
              href="/photo-booth-nigeria"
              whatsapp="https://wa.me/2347042541213"
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────── */}
      <section className="py-20 md:py-28 px-4 md:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">How It Works</h2>
            <p className="text-gray-500 max-w-xl mx-auto">From enquiry to event day in four simple steps.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Enquire", desc: "Fill out the form or WhatsApp us with your event date and venue." },
              { step: "02", title: "Quote", desc: "We send a personalised quote within 24 hours with full pricing breakdown." },
              { step: "03", title: "Confirm", desc: "Accept the quote and pay a holding deposit to secure your date." },
              { step: "04", title: "Enjoy", desc: "We arrive, set up, and your guests have the time of their lives." },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-5xl font-black text-gray-200 mb-4">{s.step}</div>
                <h3 className="text-xl font-bold text-black mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALSO FROM EVENT PERFEKT ───────────────────────── */}
      <section className="py-20 md:py-28 px-4 md:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: BURGUNDY }}>Also from Event Perfekt</p>
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">Beyond the Booth</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">We offer a full suite of private and corporate event services. Combine any of these with your booth booking for a complete experience.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: PartyPopper, title: "Party Planning", desc: "Full event planning from concept to execution. Themed decor, guest management, and seamless logistics.", link: "/create-event" },
              { icon: Gift, title: "Venue Items Hire", desc: "Seasonal decorations, furniture, lighting, and styling pieces to transform any space.", link: "/create-event" },
              { icon: Smartphone, title: "Event Digital Products", desc: "Custom event websites, RSVP management, digital invitations, and interactive guest portals.", link: "/create-event" },
              { icon: Plane, title: "Group Travel", desc: "Private and commercial flight booking, hotel coordination, and group travel management for destination events.", link: "/create-event" },
              { icon: Sparkles, title: "Pampering Services", desc: "Professional massages, beauty treatments, and personal grooming for hosts and guests before or during your event.", link: "/create-event" },
              { icon: Globe, title: "Destination Events", desc: "Transform your celebration into an unforgettable journey. Seamless planning, breathtaking locations, and full in-country support.", link: "/create-event" },
              { icon: Palette, title: "Theme Events & Concepts", desc: "Bespoke themed experiences with custom design, interactive elements, and immersive storytelling.", link: "/create-event" },
              { icon: Camera, title: "Photo Booth Add-ons", desc: "Extra hours, premium overlays, custom props, branded sharing, and multi-booth setups for larger events.", link: "/360-booth-hire-milton-keynes" },
            ].map((svc, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                viewport={{ once: true }}
              >
                <Link href={svc.link}>
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 h-full flex flex-col cursor-pointer">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${BURGUNDY}10` }}>
                      <svc.icon size={22} style={{ color: BURGUNDY }} />
                    </div>
                    <h3 className="font-bold text-black text-sm mb-2">{svc.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed flex-1">{svc.desc}</p>
                    <div className="mt-4 flex items-center gap-1 text-sm font-semibold" style={{ color: BURGUNDY }}>
                      Enquire <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ───────────────────────── */}
      <section id="contact" className="py-20 md:py-28 px-4 md:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">Get In Touch</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Reach out directly via WhatsApp or email. We respond within hours.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-3xl p-8 text-center">
              <div className="text-3xl mb-4">🇬🇧</div>
              <h3 className="text-xl font-bold text-black mb-4">United Kingdom</h3>
              <div className="space-y-3">
                <a href="https://wa.me/447984331651" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: BURGUNDY }}>
                  <MessageCircle size={16} /> WhatsApp: +44 7984 331 651
                </a>
                <a href="tel:+447984331651" className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Phone size={16} /> +44 7984 331 651
                </a>
                <p className="text-sm text-gray-400">Milton Keynes, Bedford, Northampton, London</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-3xl p-8 text-center">
              <div className="text-3xl mb-4">🇿🇦</div>
              <h3 className="text-xl font-bold text-black mb-4">Nigeria</h3>
              <div className="space-y-3">
                <a href="https://wa.me/2347042541213" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: BURGUNDY }}>
                  <MessageCircle size={16} /> WhatsApp: +234 704 254 1213
                </a>
                <a href="tel:+2347042541213" className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Phone size={16} /> +234 704 254 1213
                </a>
                <p className="text-sm text-gray-400">Lagos, Abuja, Port Harcourt</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────── */}
      <footer className="py-16 px-4 md:px-8" style={{ background: "#0A0A0A" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: BURGUNDY }}>
                  <Camera size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">EP Booth</p>
                  <p className="text-white/40 text-[10px] tracking-wider uppercase">360 Photo Booth Hire</p>
                </div>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">
                Premium 360 photo booth experiences for weddings, birthdays, corporate events, and private celebrations across the UK and Nigeria.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4">Services</h4>
              <div className="space-y-2">
                <Link href="/360-booth-hire-milton-keynes" className="block text-white/60 text-sm hover:text-white transition-colors">UK 360 Booth</Link>
                <Link href="/photo-booth-nigeria" className="block text-white/60 text-sm hover:text-white transition-colors">Nigeria 360 Booth</Link>
                <Link href="/360-booth-hire-milton-keynes" className="block text-white/60 text-sm hover:text-white transition-colors">Wedding Booth Hire</Link>
                <Link href="/360-booth-hire-milton-keynes" className="block text-white/60 text-sm hover:text-white transition-colors">Corporate Booth</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4">Contact</h4>
              <div className="space-y-2">
                <a href="mailto:info@eventperfekt.com" className="block text-white/60 text-sm hover:text-white transition-colors">info@eventperfekt.com</a>
                <a href="https://wa.me/447984331651" className="block text-white/60 text-sm hover:text-white transition-colors">UK WhatsApp</a>
                <a href="https://wa.me/2347042541213" className="block text-white/60 text-sm hover:text-white transition-colors">Nigeria WhatsApp</a>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <a href="https://www.instagram.com/eventperfektcom" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">
                  <Instagram size={18} />
                </a>
                <a href="https://www.facebook.com/eventperfekt" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">
                  <Facebook size={18} />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-xs">
              © {new Date().getFullYear()} Event Perfekt. All rights reserved.
            </p>
            <p className="text-white/30 text-xs">
              UK: Event Perfekt Global Ltd · Nigeria: Event Perfekt Management Services Limited
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
