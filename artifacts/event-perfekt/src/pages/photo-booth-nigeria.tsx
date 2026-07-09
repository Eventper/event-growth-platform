import { useState, useEffect, useRef } from "react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  Mail, MessageCircle, CheckCircle, Infinity, Share2, Sparkles,
  UserCheck, Palette, Calendar, ChevronDown, ChevronUp, Star,
  MapPin, Clock, Users, Heart, Baby, GraduationCap, Building2,
  Megaphone, PartyPopper, Camera, X, ArrowRight,
} from "lucide-react";

import heroParty from "@assets/360-booth/hero-real-party.png";
import heroPartyWebp from "@assets/360-booth/hero-real-party.webp";

const BURGUNDY = "#330311";
const GOLD = "#C9A84C";

/* helpers */
function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}
function FadeIn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useInView(0.1);
  return (
    <div ref={ref} className={className}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: "easeOut" }}>
        {children}
      </motion.div>
    </div>
  );
}
function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return <section id={id} className={`py-16 md:py-24 px-4 md:px-8 ${className || ""}`}>{children}</section>;
}

export default function PhotoBoothNigeria() {
  usePageSEO({
    title: "360 Photo Booth Hire Nigeria | Lagos, Abuja, Port Harcourt | Event Perfekt",
    description:
      "Premium 360 photo booth hire in Lagos, Abuja, Port Harcourt and across Nigeria. Weddings, birthdays, corporate events. Instant sharing, professional attendant, stylish setup.",
    url: "https://eventperfekt.net/photo-booth-nigeria",
    image: "https://eventperfekt.net/assets/360-booth/hero-real-party.png",
    imageAlt: "Guests enjoying a 360 photo booth experience at a Nigerian celebration — professional booth setup",
    ogType: "product",
    keywords:
      "360 photo booth Nigeria, photo booth hire Lagos, 360 booth Abuja, photo booth Port Harcourt, wedding photo booth Nigeria, birthday photo booth Lagos, corporate event booth Nigeria, 360 video booth hire, party entertainment Nigeria, event photo booth",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "Event Perfekt Management Services Limited",
        alternateName: "Event Perfekt Nigeria — 360 Photo Booth Hire",
        description: "Premium 360 photo booth hire across Nigeria. Weddings, birthdays, corporate events. Instant sharing, professional attendant, stylish setup.",
        url: "https://eventperfekt.net/photo-booth-nigeria",
        email: "info@eventperfekt.com",
        image: "https://eventperfekt.net/assets/360-booth/hero-real-party.png",
        priceRange: "₦₦",
        serviceType: "360 Photo Booth Rental",
        address: {
          "@type": "PostalAddress",
          streetAddress: "25 Kusenla Street",
          addressLocality: "Lagos",
          addressCountry: "NG",
        },
        areaServed: [
          { "@type": "City", name: "Lagos" },
          { "@type": "City", name: "Abuja" },
          { "@type": "City", name: "Port Harcourt" },
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "360 Booth Hire Packages Nigeria",
          itemListElement: [
            { "@type": "Offer", name: "Quick Spin", description: "2-hour 360 booth hire with attendant", price: "395000.00", priceCurrency: "NGN", availability: "https://schema.org/InStock", url: "https://eventperfekt.net/photo-booth-nigeria#packages" },
            { "@type": "Offer", name: "Signature Experience", description: "3-hour 360 booth hire with custom overlay", price: "495000.00", priceCurrency: "NGN", availability: "https://schema.org/InStock", url: "https://eventperfekt.net/photo-booth-nigeria#packages" },
            { "@type": "Offer", name: "Luxe Event Experience", description: "4-hour 360 booth hire with premium setup", price: "695000.00", priceCurrency: "NGN", availability: "https://schema.org/InStock", url: "https://eventperfekt.net/photo-booth-nigeria#packages" },
          ],
        },
        sameAs: [
          "https://www.instagram.com/eventperfektcom",
          "https://www.facebook.com/eventperfekt",
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How much does 360 booth hire cost in Nigeria?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Our packages range from ₦395,000 to ₦695,000 depending on duration and features. All prices include VAT (7.5%), professional attendant, setup, and pack down.",
            },
          },
          {
            "@type": "Question",
            name: "Do you travel outside Lagos?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes — we cover Abuja, Port Harcourt, and major cities across Nigeria. Travel outside Lagos may incur a small additional charge.",
            },
          },
          {
            "@type": "Question",
            name: "Can I hire for weddings and birthdays?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Absolutely. Weddings, birthdays, baby showers, proms, graduation parties, and private celebrations are our specialty.",
            },
          },
        ],
      },
    ],
  });

  useVisitorTracking("/photo-booth-nigeria", "360 Photo Booth Hire Nigeria | Event Perfekt");

  const [form, setForm] = useState({
    name: "", email: "", phone: "", eventDate: "", venue: "",
    eventType: "", guestCount: "", packageInterest: "", message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) return;
    setSubmitting(true);
    trackFunnelEvent('form_complete', '/photo-booth-nigeria', { package: form.packageInterest || undefined });
    try {
      const payload = {
        name: form.name, email: form.email, company: form.venue || null, phone: form.phone,
        serviceType: "photo-booth-nigeria",
        message: `Event Date: ${form.eventDate}\nVenue: ${form.venue}\nEvent Type: ${form.eventType}\nGuest Count: ${form.guestCount}\nPackage Interest: ${form.packageInterest}\n\n${form.message}`,
      };
      const res = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        trackFunnelEvent('submit_success', '/photo-booth-nigeria', { package: form.packageInterest || undefined });
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 6000);
        setForm({ name: "", email: "", phone: "", eventDate: "", venue: "", eventType: "", guestCount: "", packageInterest: "", message: "" });
      }
    } catch {}
    setSubmitting(false);
  };

  const formStarted = useRef(false);
  const onFormFieldChange = () => {
    if (!formStarted.current) {
      formStarted.current = true;
      trackFunnelEvent('form_start', '/photo-booth-nigeria', { package: form.packageInterest || undefined });
    }
  };

  const faqs = [
    { q: "How much does 360 booth hire cost in Nigeria?", a: "Our packages range from ₦395,000 to ₦695,000 depending on duration and features. All prices include VAT (7.5%), professional attendant, setup, and pack down." },
    { q: "Do you travel outside Lagos?", a: "Yes — we cover Abuja, Port Harcourt, and major cities across Nigeria. Travel outside Lagos may incur a small additional charge." },
    { q: "Can I hire for weddings and birthdays?", a: "Absolutely. Weddings, birthdays, baby showers, proms, graduation parties, and private celebrations are our specialty." },
    { q: "Do you provide corporate branding?", a: "Yes. Our Corporate & Brand Activation package includes fully branded overlays, custom props, and logo integration into every shared video." },
    { q: "What is the security deposit?", a: "A ₦75,000 refundable security deposit covers equipment protection. Returned within 48 hours after the event if no issues arise." },
    { q: "How do I pay?", a: "Bank transfer to our GTBank account (Event Perfekt Management Services Limited, 0740436407) or cash on event day." },
  ];

  return (
    <div className="min-h-screen bg-white text-black font-[Poppins] overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: BURGUNDY }}>Event Perfekt</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#330311] text-white">NG</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button onClick={() => { trackFunnelEvent('cta_click', '/photo-booth-nigeria', { cta: 'nav_packages' }); scrollToId("packages"); }} className="hover:text-[#330311] transition-colors">Packages</button>
            <button onClick={() => { trackFunnelEvent('cta_click', '/photo-booth-nigeria', { cta: 'nav_book_now' }); scrollToId("booking-form"); }} className="hover:text-[#330311] transition-colors">Book Now</button>
            <button onClick={() => scrollToId("faq")} className="hover:text-[#330311] transition-colors">FAQ</button>
          </div>
          <Button onClick={() => { trackFunnelEvent('cta_click', '/photo-booth-nigeria', { cta: 'nav_enquire' }); scrollToId("booking-form"); }} className="text-white text-sm rounded-full px-5 py-2" style={{ background: BURGUNDY }}>
            Enquire
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 px-4 md:px-8" style={{ background: BURGUNDY }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-14">
            <div className="flex-1 text-center md:text-left">
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-white/70 text-sm mb-3 tracking-wide uppercase">
                360 Photo Booth Hire — Nigeria
              </motion.p>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
                Capture Every Moment in <span style={{ color: GOLD }}>360°</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-white/80 text-base md:text-lg mb-6 leading-relaxed">
                Premium 360 booth hire for weddings, birthdays, corporate events & brand activations across Lagos, Abuja & Port Harcourt. Instant social sharing included.
              </motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Button onClick={() => { trackFunnelEvent('cta_click', '/photo-booth-nigeria', { cta: 'hero_check_availability' }); scrollToId("booking-form"); }} className="text-white font-bold px-8 py-6 text-base rounded-full shadow-lg" style={{ background: BURGUNDY, border: `2px solid ${GOLD}` }}>
                  Check Availability <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button onClick={() => { trackFunnelEvent('cta_click', '/photo-booth-nigeria', { cta: 'hero_get_quote' }); scrollToId("packages"); }} variant="outline" className="border-white text-white font-bold px-8 py-6 text-base rounded-full hover:bg-white hover:text-black transition-all">
                  Get A Quote
                </Button>
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-white/50 text-sm mt-4 flex items-center gap-2 justify-center md:justify-start">
                <CheckCircle size={14} /> Prices include VAT | Travel within Lagos included
              </motion.p>
            </div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="flex-1 w-full max-w-md md:max-w-lg">
              <picture>
                <source srcSet={heroPartyWebp} type="image/webp" />
                <img src={heroParty} alt="Guests enjoying a 360 photo booth experience in Nigeria" className="w-full rounded-3xl object-contain drop-shadow-[0_20px_60px_rgba(201,168,76,0.25)]" loading="eager" fetchPriority="high" width="600" height="600" sizes="(max-width: 768px) 100vw, 500px" />
              </picture>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Book */}
      <Section className="bg-white">
        <FadeIn>
          <div className="max-w-5xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">More Than a Booth. A Full Experience.</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Every 360 booth hire includes premium service from setup to pack down.</p>
          </div>
        </FadeIn>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {[
            { icon: Infinity, label: "Unlimited 360 videos", bg: "#3D1B1B", accent: "#E8A87C" },
            { icon: Share2, label: "Instant social sharing", bg: "#1B2E3D", accent: "#7FB3D5" },
            { icon: Sparkles, label: "Premium overlays", bg: "#2E1B3D", accent: "#D4A5F5" },
            { icon: UserCheck, label: "Professional attendant", bg: "#1B3D2E", accent: "#A8D5BA" },
            { icon: Palette, label: "Stylish setup", bg: "#3D2E1B", accent: "#E8C897" },
            { icon: Calendar, label: "Weddings, birthdays & corporate", bg: "#1B1B3D", accent: "#B8A1E0" },
          ].map((f, i) => (
            <FadeIn key={i}>
              <div className="rounded-2xl p-5 md:p-6 text-center transition-all duration-300 hover:scale-[1.04] hover:shadow-xl cursor-default" style={{ background: f.bg }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${f.accent}25` }}>
                  <f.icon size={22} style={{ color: f.accent }} />
                </div>
                <p className="text-sm md:text-base font-semibold text-white">{f.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* Packages */}
      <Section id="packages" className="bg-gray-50">
        <FadeIn>
          <div className="max-w-5xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-3">Packages</h2>
            <p className="text-gray-600">Three premium options to match your event.</p>
          </div>
        </FadeIn>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {/* Quick Spin */}
          <FadeIn className="h-full">
            <div className="rounded-2xl p-6 md:p-8 h-full flex flex-col relative overflow-hidden bg-white border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-black mb-1">Quick Spin</h3>
              <p className="text-3xl font-extrabold mb-1" style={{ color: BURGUNDY }}>₦395,000</p>
              <p className="text-sm text-gray-500 mb-4">VAT included. Travel within Lagos included.</p>
              <p className="text-sm text-gray-700 flex-1 leading-relaxed">
                2 hours with a booth attendant, unlimited 360 videos, a basic event overlay, and full setup and pack down.
              </p>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 font-medium">₦75,000 refundable security deposit for private bookings.</p>
              </div>
              <Button onClick={() => { trackFunnelEvent('cta_click', '/photo-booth-nigeria', { cta: 'package_quick_spin', package: 'Quick Spin' }); setForm({ ...form, packageInterest: "Quick Spin — ₦395,000" }); scrollToId("booking-form"); }} variant="outline" className="mt-4 w-full font-bold rounded-full border-2 hover:bg-[#330311] hover:text-white hover:border-[#330311] transition-all" style={{ borderColor: BURGUNDY, color: BURGUNDY }}>
                Check Availability
              </Button>
            </div>
          </FadeIn>
          {/* Signature */}
          <FadeIn className="h-full">
            <div className="rounded-2xl p-6 md:p-8 h-full flex flex-col relative overflow-hidden bg-white border-2 shadow-md" style={{ borderColor: BURGUNDY }}>
              <div className="absolute top-4 right-4 bg-[#330311] text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
              <h3 className="text-xl font-bold text-black mb-1">Signature Experience</h3>
              <p className="text-3xl font-extrabold mb-1" style={{ color: BURGUNDY }}>₦495,000</p>
              <p className="text-sm text-gray-500 mb-4">VAT included. Travel within Lagos included.</p>
              <p className="text-sm text-gray-700 flex-1 leading-relaxed">
                3 hours with a booth attendant, unlimited 360 videos, a custom event overlay, props and accessories, and instant sharing.
              </p>
              <Button onClick={() => { trackFunnelEvent('cta_click', '/photo-booth-nigeria', { cta: 'package_signature', package: 'Signature Experience' }); setForm({ ...form, packageInterest: "Signature Experience — ₦495,000" }); scrollToId("booking-form"); }} className="mt-4 w-full text-white font-bold rounded-full py-3" style={{ background: BURGUNDY }}>
                Check Availability
              </Button>
            </div>
          </FadeIn>
          {/* Luxe */}
          <FadeIn className="h-full">
            <div className="rounded-2xl p-6 md:p-8 h-full flex flex-col relative overflow-hidden bg-white border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-black mb-1">Luxe Event Experience</h3>
              <p className="text-3xl font-extrabold mb-1" style={{ color: BURGUNDY }}>₦695,000</p>
              <p className="text-sm text-gray-500 mb-4">VAT included. Premium setup & extended coverage.</p>
              <p className="text-sm text-gray-700 flex-1 leading-relaxed">
                4 hours with a booth attendant, unlimited 360 videos, a premium overlay design, props, accessories and backdrop, instant sharing, and extended coverage.
              </p>
              <Button onClick={() => { trackFunnelEvent('cta_click', '/photo-booth-nigeria', { cta: 'package_luxe', package: 'Luxe Event Experience' }); setForm({ ...form, packageInterest: "Luxe Event — ₦695,000" }); scrollToId("booking-form"); }} variant="outline" className="mt-4 w-full font-bold rounded-full border-2 hover:bg-[#330311] hover:text-white hover:border-[#330311] transition-all" style={{ borderColor: BURGUNDY, color: BURGUNDY }}>
                Check Availability
              </Button>
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* Perfect For */}
      <Section className="bg-white">
        <FadeIn>
          <div className="max-w-5xl mx-auto text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-3">Perfect For</h2>
            <p className="text-gray-600">Every celebration deserves a 360 moment.</p>
          </div>
        </FadeIn>
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Heart, label: "Weddings", bg: "#4A0E2E", accent: "#C9A84C" },
            { icon: PartyPopper, label: "Birthday parties", bg: "#1B2A4A", accent: "#F5C842" },
            { icon: Baby, label: "Baby showers", bg: "#2D4A3E", accent: "#A8D5BA" },
            { icon: Star, label: "Proms", bg: "#3D1B4A", accent: "#D4A5F5" },
            { icon: Building2, label: "Corporate events", bg: "#1E2D3D", accent: "#7FB3D5" },
            { icon: Megaphone, label: "Brand activations", bg: "#4A2E1B", accent: "#E8A87C" },
            { icon: GraduationCap, label: "Graduation parties", bg: "#1B3D4A", accent: "#7ED6DF" },
            { icon: Camera, label: "Private celebrations", bg: "#2E1B4A", accent: "#B8A1E0" },
          ].map((t, i) => (
            <FadeIn key={i}>
              <div className="rounded-2xl p-5 text-center transition-all duration-300 hover:scale-[1.04] hover:shadow-xl cursor-default" style={{ background: t.bg }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${t.accent}25` }}>
                  <t.icon size={24} style={{ color: t.accent }} />
                </div>
                <p className="text-sm font-semibold text-white tracking-wide">{t.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* Corporate */}
      <Section className="bg-white">
        <FadeIn>
          <div className="max-w-5xl mx-auto">
            <div className="bg-gray-50 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="flex-1">
                <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">Corporate & Brand Activations</h2>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Branded 360 booth experiences for launches, office parties, staff events, awards nights and brand activations. Custom overlays, logo integration, and instant social sharing.
                </p>
                <Button onClick={() => { trackFunnelEvent('cta_click', '/photo-booth-nigeria', { cta: 'corporate_quote' }); scrollToId("booking-form"); }} className="text-white font-bold px-6 py-3 rounded-full" style={{ background: BURGUNDY }}>
                  Enquire for Corporate
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* More Services */}
      <Section className="bg-white">
        <FadeIn>
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-lg text-gray-700 mb-4">
              Find out more about our services beyond photobooth
            </p>
            <a
              href="https://eventperfekt.net"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-bold text-lg px-8 py-4 rounded-full border-2 transition-all hover:scale-105"
              style={{ color: BURGUNDY, borderColor: BURGUNDY }}
            >
              Click here <ArrowRight size={18} />
            </a>
          </div>
        </FadeIn>
      </Section>

      {/* Booking Form */}
      <Section id="booking-form" className="bg-gray-50">
        <FadeIn>
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
              <h2 className="text-2xl md:text-3xl font-bold text-black mb-2 text-center">Check Availability</h2>
              <p className="text-gray-500 text-sm text-center mb-6">Tell us about your event and we’ll get back to you within 24 hours.</p>
              {submitted && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-green-800">Enquiry Sent!</h3>
                  <p className="text-sm text-green-700">We’ll be in touch within 24 hours.</p>
                </motion.div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Full Name *" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); onFormFieldChange(); }} required className="rounded-xl h-12" />
                  <Input type="email" placeholder="Email *" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); onFormFieldChange(); }} required className="rounded-xl h-12" />
                </div>
                <Input type="tel" placeholder="Phone *" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); onFormFieldChange(); }} required className="rounded-xl h-12" />
                <div className="grid md:grid-cols-2 gap-4">
                  <Input type="date" value={form.eventDate} onChange={(e) => { setForm({ ...form, eventDate: e.target.value }); onFormFieldChange(); }} className="rounded-xl h-12" />
                  <Input placeholder="Venue / Location" value={form.venue} onChange={(e) => { setForm({ ...form, venue: e.target.value }); onFormFieldChange(); }} className="rounded-xl h-12" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Select value={form.eventType} onValueChange={(v) => { setForm({ ...form, eventType: v }); onFormFieldChange(); }}>
                    <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Event type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Wedding">Wedding</SelectItem>
                      <SelectItem value="Birthday">Birthday</SelectItem>
                      <SelectItem value="Corporate">Corporate</SelectItem>
                      <SelectItem value="Private party">Private party</SelectItem>
                      <SelectItem value="Brand activation">Brand activation</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={form.guestCount} onValueChange={(v) => { setForm({ ...form, guestCount: v }); onFormFieldChange(); }}>
                    <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Guest count" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Under 50">Under 50</SelectItem>
                      <SelectItem value="50–100">50 – 100</SelectItem>
                      <SelectItem value="100–200">100 – 200</SelectItem>
                      <SelectItem value="200–500">200 – 500</SelectItem>
                      <SelectItem value="500+">500+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Select value={form.packageInterest} onValueChange={(v) => { setForm({ ...form, packageInterest: v }); onFormFieldChange(); }}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Package interested in" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quick Spin — ₦395,000">Quick Spin — ₦395,000</SelectItem>
                    <SelectItem value="Signature Experience — ₦495,000">Signature Experience — ₦495,000</SelectItem>
                    <SelectItem value="Luxe Event — ₦695,000">Luxe Event — ₦695,000</SelectItem>
                    <SelectItem value="Corporate — from ₦850,000">Corporate — from ₦850,000</SelectItem>
                    <SelectItem value="Not sure — help me choose">Not sure — help me choose</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Message (optional)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="rounded-xl min-h-[100px]" />
                <Button type="submit" disabled={submitting} className="w-full text-white font-bold py-6 text-base rounded-full" style={{ background: BURGUNDY }}>
                  {submitting ? "Sending..." : "Check Availability"}
                </Button>
                <p className="text-xs text-gray-400 text-center">Travel outside Lagos may incur an additional charge.</p>
              </form>
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="bg-white">
        <FadeIn>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-10 text-center">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors">
                    <span className="font-semibold text-black text-sm md:text-base pr-4">{faq.q}</span>
                    {openFaq === i ? <ChevronUp size={20} className="shrink-0" /> : <ChevronDown size={20} className="shrink-0" />}
                  </button>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">
                      {faq.a}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-8" style={{ background: BURGUNDY }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-white/60 text-sm mb-2">Event Perfekt Management Services Limited</p>
          <p className="text-white/40 text-xs">25 Kusenla Street, Lagos, Nigeria</p>
          <p className="text-white/40 text-xs mt-1">info@eventperfekt.com</p>
          <div className="flex justify-center gap-6 mt-6">
            <a href="mailto:info@eventperfekt.com" className="flex items-center gap-2 text-white/70 text-sm hover:text-white transition-colors"><Mail size={16} /> Email us</a>
            <a href="https://wa.me/2347042541213" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/70 text-sm hover:text-white transition-colors"><MessageCircle size={16} /> WhatsApp</a>
          </div>
          <p className="text-white/30 text-xs mt-8">© {new Date().getFullYear()} Event Perfekt Management Services Limited. All rights reserved.</p>
        </div>
      </footer>

      {/* Sticky Mobile CTA */}
      {showSticky && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
            <Button onClick={() => scrollToId("packages")} className="flex-1 text-white font-bold py-3 rounded-full text-sm" style={{ background: BURGUNDY }}>Check Availability</Button>
            <a href="https://wa.me/2347042541213" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${BURGUNDY}15` }}>
              <MessageCircle size={18} style={{ color: BURGUNDY }} />
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
