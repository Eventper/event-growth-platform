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
import { Link } from "wouter";
import {
  Mail,
  MessageCircle,
  CheckCircle,
  Infinity,
  Share2,
  Sparkles,
  UserCheck,
  Palette,
  Calendar,
  ChevronDown,
  ChevronUp,
  Star,
  MapPin,
  Clock,
  Users,
  Heart,
  Baby,
  GraduationCap,
  Building2,
  Megaphone,
  PartyPopper,
  Camera,
  X,
  ArrowRight,
  Plane,
  Smartphone,
  Gift,
  Globe,
} from "lucide-react";

import heroParty from "@assets/360-booth/hero-real-party.png";
import heroPartyWebp from "@assets/360-booth/hero-real-party.webp";

const BURGUNDY = "#330311";
const GOLD = "#C9A84C";

/* ───────────────────────── helpers ───────────────────────── */

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ───────────────────────── FAQ ───────────────────────── */

const faqs = [
  {
    q: "How much does 360 booth hire cost?",
    a: "Our 360 booth packages start from £395 for a 2-hour Quick Spin package. The Signature Experience is £495 for 3 hours, and the Luxe Event Experience is £695 for 4 hours. VAT and travel are calculated separately in your personalised quote. Every package includes setup, pack down, and a professional booth attendant.",
  },
  {
    q: "Do prices include VAT?",
    a: "Our quoted prices are exclusive of VAT and travel, which are calculated separately based on your event location. Every personalised quote shows a clear breakdown: Service Fee, VAT, Travel, and Refundable Holding Deposit. No hidden fees — you see exactly what you pay.",
  },
  {
    q: "How long can I hire the booth for?",
    a: "We offer 2-hour, 3-hour, and 4-hour packages. Need longer? Contact us for a custom quote — we can accommodate full-day events and multi-day brand activations.",
  },
  {
    q: "Do you travel outside our area?",
    a: "Yes — we cover Bedford, Northampton, Luton, Buckinghamshire, and surrounding areas. Travel may incur a small additional charge depending on distance. Just let us know your venue when you enquire.",
  },
  {
    q: "Is a booth attendant included?",
    a: "Absolutely. Every package includes a professional booth attendant who manages the setup, guides your guests, ensures smooth operation, and helps with instant sharing throughout your event.",
  },
  {
    q: "Can I hire for weddings and birthdays?",
    a: "Yes — weddings, birthdays, baby showers, proms, graduation parties, and private celebrations are our specialty. We tailor the overlay and props to match your theme.",
  },
  {
    q: "Do you provide corporate branding?",
    a: "Yes. Our Corporate & Brand Activation package includes fully branded overlays, custom props, and logo integration into every shared video. Perfect for product launches, office parties, awards nights, and brand activations. From £850. VAT and travel calculated separately.",
  },
];

/* ───────────────────────── Section wrapper ───────────────────────── */

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`py-16 md:py-24 px-4 md:px-8 ${className}`}>{children}</section>;
}

function FadeIn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useInView(0.1);
  return (
    <div ref={ref} className={className}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function BoothHireLanding() {
  usePageSEO({
    title: "360 Booth Hire UK | 360 Photo Booth Rental | Event Perfekt",
    description:
      "Premium 360 booth hire for weddings, birthdays, private parties and corporate events. Instant sharing, stylish setup and booth attendant included.",
    url: "https://eventperfekt.net/360-booth-hire-milton-keynes",
    image: "https://eventperfekt.net/assets/360-booth/hero-real-party.png",
    imageAlt: "Guests enjoying a 360 photo booth experience at a luxury event — real party energy with professional booth setup",
    ogType: "product",
    keywords:
      "360 booth hire UK, 360 photo booth rental, wedding 360 booth, birthday photo booth hire, corporate event booth rental, 360 spinning booth hire UK, event photo booth, party entertainment, video booth rental, 360 camera booth hire",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "Event Perfekt Global Ltd",
        alternateName: "Event Perfekt — 360 Booth Hire",
        description: "Premium 360 booth hire for weddings, birthdays, private parties and corporate events.",
        url: "https://eventperfekt.net/360-booth-hire-milton-keynes",
        email: "info@eventperfekt.com",
        image: "https://eventperfekt.net/assets/360-booth/hero-real-party.png",
        priceRange: "££",
        serviceType: "360 Photo Booth Rental",
        address: {
          "@type": "PostalAddress",
          streetAddress: "20 Wenlock Road",
          addressLocality: "London",
          postalCode: "N1 7PG",
          addressCountry: "GB",
        },
        areaServed: [
          { "@type": "Country", name: "United Kingdom" },
          { "@type": "City", name: "Milton Keynes" },
          { "@type": "City", name: "Bedford" },
          { "@type": "City", name: "Northampton" },
          { "@type": "City", name: "Luton" },
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "360 Booth Hire Packages",
          itemListElement: [
            { "@type": "Offer", name: "Quick Spin", description: "2-hour 360 booth hire with attendant, unlimited videos, basic overlay", price: "395.00", priceCurrency: "GBP", availability: "https://schema.org/InStock", url: "https://eventperfekt.net/360-booth-hire-milton-keynes#packages" },
            { "@type": "Offer", name: "Signature Experience", description: "3-hour 360 booth hire with custom overlay, props, instant sharing", price: "495.00", priceCurrency: "GBP", availability: "https://schema.org/InStock", url: "https://eventperfekt.net/360-booth-hire-milton-keynes#packages" },
            { "@type": "Offer", name: "Luxe Event Experience", description: "4-hour 360 booth hire with premium setup and extended coverage", price: "695.00", priceCurrency: "GBP", availability: "https://schema.org/InStock", url: "https://eventperfekt.net/360-booth-hire-milton-keynes#packages" },
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
            name: "How much does 360 booth hire cost?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Our 360 booth packages start from £395 for a 2-hour Quick Spin package. The Signature Experience is £495 for 3 hours, and the Luxe Event Experience is £695 for 4 hours. VAT and travel are calculated separately in your personalised quote. Every package includes setup, pack down, and a professional booth attendant.",
            },
          },
          {
            "@type": "Question",
            name: "Do you travel outside the area?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes — we cover Bedford, Northampton, Luton, Buckinghamshire, and surrounding areas. Travel may incur a small additional charge depending on distance. Just let us know your venue when you enquire.",
            },
          },
          {
            "@type": "Question",
            name: "Can I hire for weddings and birthdays?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes — weddings, birthdays, baby showers, proms, graduation parties, and private celebrations are our specialty. We tailor the overlay and props to match your theme.",
            },
          },
        ],
      },
    ],
  });

  useVisitorTracking("/360-booth-hire-milton-keynes", "360 Booth Hire UK | Event Perfekt");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    eventDate: "",
    venue: "",
    eventType: "",
    guestCount: "",
    packageInterest: "",
    message: "",
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
    trackFunnelEvent('form_complete', '/360-booth-hire-milton-keynes', { package: form.packageInterest || undefined });
    try {
      const payload = {
        name: form.name,
        email: form.email,
        company: form.venue || null,
        phone: form.phone,
        serviceType: "360-booth-hire",
        message: `Event Date: ${form.eventDate}\nVenue: ${form.venue}\nEvent Type: ${form.eventType}\nGuest Count: ${form.guestCount}\nPackage Interest: ${form.packageInterest}\n\n${form.message}`,
      };
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        trackFunnelEvent('submit_success', '/360-booth-hire-milton-keynes', { package: form.packageInterest || undefined });
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 6000);
        setForm({
          name: "", email: "", phone: "", eventDate: "", venue: "",
          eventType: "", guestCount: "", packageInterest: "", message: "",
        });
      }
    } catch {}
    setSubmitting(false);
  };

  const formStarted = useRef(false);
  const onFormFieldChange = () => {
    if (!formStarted.current) {
      formStarted.current = true;
      trackFunnelEvent('form_start', '/360-booth-hire-milton-keynes', { package: form.packageInterest || undefined });
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-[Poppins] overflow-x-hidden">
      {/* ── HERO ───────────────────────── */}
      <section className="relative w-full min-h-[92vh] md:min-h-[85vh] flex items-center bg-[#0A0A0A]">
        <div className="relative z-10 w-full px-4 md:px-8">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Text */}
            <div className="flex-1 text-center md:text-left pt-8 md:pt-0">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4"
              >
                360 Booth Hire{" "}
                <span style={{ color: GOLD }}>Event Perfekt</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-lg md:text-xl text-white/80 font-medium max-w-xl mb-8 leading-relaxed"
              >
                Premium 360 video experiences for weddings, birthdays, private parties and corporate events.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start"
              >
                <Button
                  onClick={() => { trackFunnelEvent('cta_click', '/360-booth-hire-milton-keynes', { cta: 'hero_check_availability' }); scrollToId("booking-form"); }}
                  className="text-white font-bold px-8 py-6 text-base rounded-full shadow-lg hover:shadow-xl transition-all"
                  style={{ background: BURGUNDY }}
                >
                  Check Availability <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button
                  onClick={() => { trackFunnelEvent('cta_click', '/360-booth-hire-milton-keynes', { cta: 'hero_get_quote' }); scrollToId("packages"); }}
                  variant="outline"
                  className="border-white text-white font-bold px-8 py-6 text-base rounded-full hover:bg-white hover:text-black transition-all"
                >
                  Get A Quote
                </Button>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-white/50 text-sm mt-4 flex items-center gap-2 justify-center md:justify-start"
              >
                <CheckCircle size={14} /> Prices exclude VAT and travel
              </motion.p>
            </div>
            {/* Product image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex-1 w-full max-w-md md:max-w-lg"
            >
              <picture>
                <source srcSet={heroPartyWebp} type="image/webp" />
                <img
                  src={heroParty}
                  alt="Guests enjoying a 360 photo booth experience at a luxury event — real party energy with professional booth setup"
                  className="w-full rounded-3xl object-contain drop-shadow-[0_20px_60px_rgba(201,168,76,0.25)]"
                  loading="eager"
                  fetchPriority="high"
                  width="600"
                  height="600"
                  sizes="(max-width: 768px) 100vw, 500px"
                />
              </picture>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── WHY BOOK US ───────────────────────── */}
      <Section className="bg-white">
        <FadeIn>
          <div className="max-w-5xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              More Than a Booth. A Full Experience.
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Every 360 booth hire includes premium service from setup to pack down — so you can focus on celebrating.
            </p>
          </div>
        </FadeIn>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {[
            { icon: Infinity, label: "Unlimited 360 videos", bg: "#3D1B1B", accent: "#E8A87C" },
            { icon: Share2, label: "Instant social sharing", bg: "#1B2E3D", accent: "#7FB3D5" },
            { icon: Sparkles, label: "Premium overlays", bg: "#2E1B3D", accent: "#D4A5F5" },
            { icon: UserCheck, label: "Professional booth attendant", bg: "#1B3D2E", accent: "#A8D5BA" },
            { icon: Palette, label: "Stylish setup", bg: "#3D2E1B", accent: "#E8C897" },
            { icon: Calendar, label: "Weddings, birthdays & corporate events", bg: "#1B1B3D", accent: "#B8A1E0" },
          ].map((f, i) => (
            <FadeIn key={i}>
              <div
                className="rounded-2xl p-5 md:p-6 text-center transition-all duration-300 hover:scale-[1.04] hover:shadow-xl cursor-default"
                style={{ background: f.bg }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${f.accent}25` }}
                >
                  <f.icon size={22} style={{ color: f.accent }} />
                </div>
                <p className="text-sm md:text-base font-semibold text-white">{f.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ── PACKAGES ───────────────────────── */}
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
              <p className="text-3xl font-extrabold mb-1" style={{ color: BURGUNDY }}>£395</p>
              <p className="text-sm text-gray-500 mb-4">VAT and travel charged separately where applicable.</p>
              <p className="text-sm text-gray-700 flex-1 leading-relaxed">
                2 hours with a booth attendant, unlimited 360 videos, a basic event overlay, and full setup and pack down.
              </p>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 font-medium">£150 refundable holding deposit required for private event bookings.</p>
                <p className="text-[11px] text-gray-400 mt-1">Returned within 48 hours after the event subject to no damage, misuse, theft, loss or excessive cleaning requirements.</p>
              </div>
              <Button
                onClick={() => { trackFunnelEvent('cta_click', '/360-booth-hire-milton-keynes', { cta: 'package_quick_spin', package: 'Quick Spin' }); setForm({ ...form, packageInterest: "Quick Spin — £395" }); scrollToId("booking-form"); }}
                variant="outline"
                className="mt-4 w-full font-bold rounded-full border-2 hover:bg-[#330311] hover:text-white hover:border-[#330311] transition-all"
                style={{ borderColor: BURGUNDY, color: BURGUNDY }}
              >
                Check Availability
              </Button>
            </div>
          </FadeIn>

          {/* Signature — MOST POPULAR */}
          <FadeIn className="h-full">
            <div className="rounded-2xl p-6 md:p-8 h-full flex flex-col relative bg-white border-2 shadow-md" style={{ borderColor: BURGUNDY }}>
              <div className="self-center -mt-9 mb-3 px-4 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider" style={{ background: BURGUNDY }}>
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-black mb-1">Signature Experience</h3>
              <p className="text-3xl font-extrabold mb-1" style={{ color: BURGUNDY }}>£495</p>
              <p className="text-sm text-gray-500 mb-4">VAT and travel charged separately where applicable.</p>
              <p className="text-sm text-gray-700 flex-1 leading-relaxed">
                3 hours with unlimited 360 videos, a custom event overlay, props, instant sharing, a dedicated booth attendant, and full setup and pack down.
              </p>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 font-medium">£150 refundable holding deposit required for private event bookings.</p>
                <p className="text-[11px] text-gray-400 mt-1">Returned within 48 hours after the event subject to no damage, misuse, theft, loss or excessive cleaning requirements.</p>
              </div>
              <Button
                onClick={() => { trackFunnelEvent('cta_click', '/360-booth-hire-milton-keynes', { cta: 'package_signature', package: 'Signature Experience' }); setForm({ ...form, packageInterest: "Signature Experience — £495" }); scrollToId("booking-form"); }}
                className="mt-4 w-full font-bold rounded-full text-white"
                style={{ background: BURGUNDY }}
              >
                Secure My Date
              </Button>
            </div>
          </FadeIn>

          {/* Luxe */}
          <FadeIn className="h-full">
            <div className="rounded-2xl p-6 md:p-8 h-full flex flex-col relative overflow-hidden bg-white border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-black mb-1">Luxe Event Experience</h3>
              <p className="text-3xl font-extrabold mb-1" style={{ color: BURGUNDY }}>£695</p>
              <p className="text-sm text-gray-500 mb-4">VAT and travel charged separately where applicable.</p>
              <p className="text-sm text-gray-700 flex-1 leading-relaxed">
                4 hours with unlimited 360 videos, a premium event overlay, props, premium setup, a dedicated booth attendant, and full setup and pack down.
              </p>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 font-medium">£150 refundable holding deposit required for private event bookings.</p>
                <p className="text-[11px] text-gray-400 mt-1">Returned within 48 hours after the event subject to no damage, misuse, theft, loss or excessive cleaning requirements.</p>
              </div>
              <Button
                onClick={() => { trackFunnelEvent('cta_click', '/360-booth-hire-milton-keynes', { cta: 'package_luxe', package: 'Luxe Event Experience' }); setForm({ ...form, packageInterest: "Luxe Event Experience — £695" }); scrollToId("booking-form"); }}
                variant="outline"
                className="mt-4 w-full font-bold rounded-full border-2 hover:bg-[#330311] hover:text-white hover:border-[#330311] transition-all"
                style={{ borderColor: BURGUNDY, color: BURGUNDY }}
              >
                Check Availability
              </Button>
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* ── PERFECT FOR ───────────────────────── */}
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
              <div
                className="rounded-2xl p-5 text-center transition-all duration-300 hover:scale-[1.04] hover:shadow-xl cursor-default"
                style={{ background: t.bg }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${t.accent}25` }}
                >
                  <t.icon size={24} style={{ color: t.accent }} />
                </div>
                <p className="text-sm font-semibold text-white tracking-wide">{t.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ── CORPORATE ───────────────────────── */}
      <Section className="bg-white">
        <FadeIn>
          <div className="max-w-5xl mx-auto">
            <div className="bg-gray-50 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="flex-1">
                <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
                  Corporate & Brand Activations
                </h2>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Branded 360 booth experiences for launches, office parties, staff events, awards nights and brand activations. Custom overlays, logo integration, and instant social sharing — every video becomes a brand impression.
                </p>
                <p className="text-2xl font-extrabold mb-6" style={{ color: BURGUNDY }}>
                  From £850 <span className="text-base font-normal text-gray-500">VAT and travel calculated separately</span>
                </p>
                <Button
                  onClick={() => { trackFunnelEvent('cta_click', '/360-booth-hire-milton-keynes', { cta: 'corporate_quote' }); scrollToId("booking-form"); }}
                  className="text-white font-bold px-8 py-6 text-base rounded-full"
                  style={{ background: BURGUNDY }}
                >
                  Request Corporate Quote
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* ── ALSO FROM EVENT PERFEKT ───────────────────────── */}
      <Section className="bg-gray-50">
        <FadeIn>
          <div className="max-w-6xl mx-auto text-center mb-12">
            <p className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: BURGUNDY }}>Also from Event Perfekt</p>
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">Beyond the Booth</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">We offer a full suite of private and corporate event services. Combine any of these with your booth booking for a complete experience.</p>
          </div>
        </FadeIn>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: PartyPopper, title: "Party Planning", desc: "Full event planning from concept to execution. Themed decor, guest management, and seamless logistics.", link: "/create-event" },
            { icon: Gift, title: "Venue Items Hire", desc: "Seasonal decorations, furniture, lighting, and styling pieces to transform any space.", link: "/create-event" },
            { icon: Smartphone, title: "Event Digital Products", desc: "Custom event websites, RSVP management, digital invitations, and interactive guest portals.", link: "/create-event" },
            { icon: Plane, title: "Group Travel", desc: "Private and commercial flight booking, hotel coordination, and group travel management for destination events.", link: "/create-event" },
            { icon: Sparkles, title: "Pampering Services", desc: "Professional massages, beauty treatments, and personal grooming for hosts and guests before or during your event.", link: "/create-event" },
            { icon: Globe, title: "Destination Events", desc: "Transform your celebration into an unforgettable journey. Seamless planning, breathtaking locations, and full in-country support.", link: "/create-event" },
            { icon: Palette, title: "Theme Events & Concepts", desc: "Bespoke themed experiences with custom design, interactive elements, and immersive storytelling.", link: "/create-event" },
            { icon: Camera, title: "Photo Booth Add-ons", desc: "Extra hours, premium overlays, custom props, branded sharing, and multi-booth setups for larger events.", link: "#booking-form" },
          ].map((svc, i) => (
            <FadeIn key={i}>
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
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ── BOOKING FORM ───────────────────────── */}
      <Section id="booking-form" className="bg-gray-50">
        <FadeIn>
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100">
              <h2 className="text-2xl md:text-3xl font-bold text-black mb-2 text-center">
                Check Availability
              </h2>
              <p className="text-gray-500 text-center text-sm mb-8">
                Tell us about your event and we will confirm availability within 24 hours.
              </p>

              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle size={48} style={{ color: BURGUNDY }} className="mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-black mb-2">Enquiry Sent</h3>
                  <p className="text-gray-600">We will be in touch within 24 hours to confirm availability and next steps.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Full name *"
                      value={form.name}
                      onChange={(e) => { setForm({ ...form, name: e.target.value }); onFormFieldChange(); }}
                      required
                      className="rounded-xl h-12"
                    />
                    <Input
                      type="email"
                      placeholder="Email *"
                      value={form.email}
                      onChange={(e) => { setForm({ ...form, email: e.target.value }); onFormFieldChange(); }}
                      required
                      className="rounded-xl h-12"
                    />
                  </div>
                  <Input
                    type="tel"
                    placeholder="Phone *"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    className="rounded-xl h-12"
                  />
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      type="date"
                      placeholder="Event date"
                      value={form.eventDate}
                      onChange={(e) => { setForm({ ...form, eventDate: e.target.value }); onFormFieldChange(); }}
                      className="rounded-xl h-12"
                    />
                    <Input
                      placeholder="Venue / Location"
                      value={form.venue}
                      onChange={(e) => { setForm({ ...form, venue: e.target.value }); onFormFieldChange(); }}
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Select
                      value={form.eventType}
                      onValueChange={(v) => { setForm({ ...form, eventType: v }); onFormFieldChange(); }}
                    >
                      <SelectTrigger className="rounded-xl h-12">
                        <SelectValue placeholder="Event type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Wedding">Wedding</SelectItem>
                        <SelectItem value="Birthday">Birthday</SelectItem>
                        <SelectItem value="Corporate">Corporate</SelectItem>
                        <SelectItem value="Private party">Private party</SelectItem>
                        <SelectItem value="Brand activation">Brand activation</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={form.guestCount}
                      onValueChange={(v) => { setForm({ ...form, guestCount: v }); onFormFieldChange(); }}
                    >
                      <SelectTrigger className="rounded-xl h-12">
                        <SelectValue placeholder="Guest count" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Under 50">Under 50</SelectItem>
                        <SelectItem value="50–100">50 – 100</SelectItem>
                        <SelectItem value="100–200">100 – 200</SelectItem>
                        <SelectItem value="200–500">200 – 500</SelectItem>
                        <SelectItem value="500+">500+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Select
                    value={form.packageInterest}
                    onValueChange={(v) => { setForm({ ...form, packageInterest: v }); onFormFieldChange(); }}
                  >
                    <SelectTrigger className="rounded-xl h-12">
                      <SelectValue placeholder="Package interested in" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Quick Spin — £395">Quick Spin — £395</SelectItem>
                      <SelectItem value="Signature Experience — £495">Signature Experience — £495</SelectItem>
                      <SelectItem value="Luxe Event Experience — £695">Luxe Event Experience — £695</SelectItem>
                      <SelectItem value="Corporate & Brand Activation — from £850">Corporate &amp; Brand Activation — from £850</SelectItem>
                      <SelectItem value="Not sure — help me choose">Not sure — help me choose</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Message (optional) — tell us anything else about your event"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="rounded-xl min-h-[100px]"
                  />
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full text-white font-bold py-6 text-base rounded-full"
                    style={{ background: BURGUNDY }}
                  >
                    {submitting ? "Sending..." : "Check Availability"}
                  </Button>
                  <p className="text-xs text-gray-400 text-center">
                    Travel outside the area may incur an additional charge.
                  </p>
                </form>
              )}
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* ── FAQ ───────────────────────── */}
      <Section className="bg-white">
        <FadeIn>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-10 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-black text-sm md:text-base pr-4">{faq.q}</span>
                    {openFaq === i ? <ChevronUp size={20} className="shrink-0" /> : <ChevronDown size={20} className="shrink-0" />}
                  </button>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="px-5 pb-5 text-gray-600 text-sm leading-relaxed"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* ── FOOTER ───────────────────────── */}
      <footer className="py-12 px-4 md:px-8" style={{ background: BURGUNDY }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-white/60 text-sm mb-2">Event Perfekt Global Ltd</p>
          <p className="text-white/40 text-xs">20 Wenlock Road, London, N1 7PG</p>
          <p className="text-white/40 text-xs mt-1">info@eventperfekt.com</p>
          <div className="flex justify-center gap-6 mt-6">
            <a href="mailto:info@eventperfekt.com" className="flex items-center gap-2 text-white/70 text-sm hover:text-white transition-colors">
              <Mail size={16} /> Email us
            </a>
            <a href="https://wa.me/447984331651" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/70 text-sm hover:text-white transition-colors">
              <MessageCircle size={16} /> WhatsApp
            </a>
          </div>
          <p className="text-white/30 text-xs mt-8">
            &copy; {new Date().getFullYear()} Event Perfekt Global Ltd. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ── STICKY MOBILE CTA ───────────────────────── */}
      {showSticky && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        >
          <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
            <Button
              onClick={() => scrollToId("packages")}
              className="flex-1 text-white font-bold py-3 rounded-full text-sm"
              style={{ background: BURGUNDY }}
            >
              Check Availability
            </Button>
            <a
              href="https://wa.me/447984331651"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `${BURGUNDY}15` }}
            >
              <MessageCircle size={18} style={{ color: BURGUNDY }} />
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
