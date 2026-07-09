import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import {
  Calendar, Clock, MapPin, Users, Heart,
  ChevronDown, ArrowRight, Send, Plus, Minus, CheckCircle2, PartyPopper, Utensils, Navigation, Mail
} from "lucide-react";

type AppConfig = {
  welcomeMessage?: string;
  programme?: Array<{ time: string; title: string; description?: string; icon?: string }>;
  highlights?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  dressCodeDescription?: string;
  themeColor?: string;
  customNote?: string;
};

type EventApp = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  eventCategory: string | null;
  startDate: string | null;
  endDate: string | null;
  eventDays: number | null;
  country: string | null;
  city: string | null;
  currency: string | null;
  ceremonyVenue: string | null;
  ceremonyAddress: string | null;
  ceremonyDate: string | null;
  receptionVenue: string | null;
  receptionAddress: string | null;
  receptionDate: string | null;
  afterPartyVenue: string | null;
  afterPartyAddress: string | null;
  afterPartyDate: string | null;
  guestCount: number | null;
  colorTheme: string | null;
  decorStyle: string | null;
  heroImage: string | null;
  companyLogo: string | null;
  status: string | null;
  rsvpEnabled: boolean;
  showGuestCount: boolean;
  eventWebsiteEnabled: boolean;
  rsvpStats: {
    total: number;
    accepted: number;
    declined: number;
    pending: number;
    tentative: number;
  };
  appConfig?: AppConfig | null;
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

function formatDateShort(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch { return null; }
}

function getCountdown(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds, passed: false };
  } catch { return null; }
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeInSection({ children, className = "", delay = 0, direction = "up" }: { children: React.ReactNode; className?: string; delay?: number; direction?: "up" | "left" | "right" }) {
  const { ref, visible } = useInView();
  const transforms: Record<string, string> = {
    up: "translateY(40px)",
    left: "translateX(-40px)",
    right: "translateX(40px)",
  };
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate(0)" : transforms[direction],
        transition: `opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function Ornament({ color = "#C4A882" }: { color?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 my-6">
      <div className="w-16 sm:w-24 h-px" style={{ background: `linear-gradient(to right, transparent, ${color}50)` }} />
      <svg width="16" height="16" viewBox="0 0 16 16" style={{ color }}>
        <path d="M8 0 L9.5 6.5 L16 8 L9.5 9.5 L8 16 L6.5 9.5 L0 8 L6.5 6.5 Z" fill="currentColor" opacity="0.4" />
      </svg>
      <div className="w-16 sm:w-24 h-px" style={{ background: `linear-gradient(to left, transparent, ${color}50)` }} />
    </div>
  );
}

function FaqItem({ question, answer, palette, delay }: { question: string; answer: string; palette: any; delay?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <FadeInSection delay={delay || 0}>
      <div
        className="rounded-2xl overflow-hidden cursor-pointer"
        style={{ border: `1px solid ${palette.border}`, backgroundColor: palette.bg }}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center justify-between px-5 py-4 gap-3">
          <p className="font-sans-elegant text-sm font-medium" style={{ color: palette.text }}>{question}</p>
          <span className="flex-shrink-0 text-lg" style={{ color: palette.accent }}>{open ? "−" : "+"}</span>
        </div>
        {open && (
          <div className="px-5 pb-5 pt-0">
            <p className="font-body text-base leading-relaxed" style={{ color: palette.muted }}>{answer}</p>
          </div>
        )}
      </div>
    </FadeInSection>
  );
}

function openMaps(venue: string | null, city?: string | null, country?: string | null) {
  if (!venue) return;
  const q = encodeURIComponent(`${venue}${city ? `, ${city}` : ""}${country ? `, ${country}` : ""}`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
}

export default function EventAppPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId || "";
  const [countdown, setCountdown] = useState<any>(null);
  const [rsvpForm, setRsvpForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    rsvpStatus: "accepted" as string,
    plusOnes: 0, plusOneNames: "",
    dietaryRequirements: "", mealChoice: "", specialNeeds: "",
  });
  const [rsvpStep, setRsvpStep] = useState<"form" | "details" | "success">("form");
  const [showRsvpForm, setShowRsvpForm] = useState(false);

  const { data: event, isLoading, error } = useQuery<EventApp>({
    queryKey: ["/api/event-app", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/event-app/${eventId}`);
      if (!res.ok) throw new Error("Event not found");
      return res.json();
    },
    enabled: !!eventId,
  });

  useEffect(() => {
    if (!event?.startDate) return;
    const update = () => setCountdown(getCountdown(event.startDate));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [event?.startDate]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const rsvpMutation = useMutation({
    mutationFn: async (data: typeof rsvpForm) => {
      const res = await fetch(`/api/event-app/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit RSVP");
      return res.json();
    },
    onSuccess: () => {
      setRsvpStep("success");
      queryClient.invalidateQueries({ queryKey: ["/api/event-app", eventId] });
    },
  });

  const handleRsvpSubmit = () => {
    if (!rsvpForm.firstName || !rsvpForm.lastName || !rsvpForm.email) return;
    if (rsvpStep === "form") {
      setRsvpStep("details");
      return;
    }
    rsvpMutation.mutate(rsvpForm);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#C4A882] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-[#8A7D6B] text-sm tracking-[0.2em] uppercase font-light">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Ornament />
          <h2 className="text-2xl text-[#3D3328] mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>Event Not Found</h2>
          <p className="text-[#8A7D6B] text-sm leading-relaxed">This event may have been removed or the link is no longer active.</p>
          <Ornament />
        </div>
      </div>
    );
  }

  if (!event.eventWebsiteEnabled) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Ornament />
          <h2 className="text-3xl text-[#3D3328] mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
            {event.name}
          </h2>
          <div className="w-16 h-px bg-[#C4A882] mx-auto mb-4" />
          <p className="text-[#8A7D6B] text-sm leading-relaxed mb-6">
            The event website is not currently available. Please contact the event organiser for more details.
          </p>
          <Ornament />
        </div>
      </div>
    );
  }

  const isWedding = event.eventCategory?.toLowerCase()?.includes("wedding");
  const isCorporate = event.eventCategory?.toLowerCase()?.includes("corporate") || event.eventCategory?.toLowerCase()?.includes("conference");

  const palette = isCorporate
    ? { bg: "#F5F5F0", hero: "#1B2838", accent: "#B8860B", text: "#2C3E50", muted: "#7F8C8D", card: "#FFFFFF", border: "#E8E5E0" }
    : { bg: "#FAF8F5", hero: "#3D3328", accent: "#C4A882", text: "#3D3328", muted: "#8A7D6B", card: "#FFFFFF", border: "#E8E0D4" };

  const venues = [
    { label: isWedding ? "The Ceremony" : "Main Event", venue: event.ceremonyVenue, address: event.ceremonyAddress, date: event.ceremonyDate, icon: isWedding ? "💒" : "✨" },
    { label: isWedding ? "The Reception" : "Reception", venue: event.receptionVenue, address: event.receptionAddress, date: event.receptionDate, icon: isWedding ? "🥂" : "🎉" },
    { label: isWedding ? "The After Party" : "After Party", venue: event.afterPartyVenue, address: event.afterPartyAddress, date: event.afterPartyDate, icon: "🎶" },
  ].filter(v => v.venue);

  return (
    <div className="min-h-screen" style={{ backgroundColor: palette.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        .font-display { font-family: 'Poppins', sans-serif; }
        .font-body { font-family: 'Poppins', sans-serif; }
        .font-sans-elegant { font-family: 'Poppins', sans-serif;, system-ui, sans-serif; }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">

        <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ backgroundColor: palette.card, boxShadow: "0 25px 80px rgba(0,0,0,0.12)" }}>

          <div className="relative" style={{ backgroundColor: palette.hero, minHeight: event.heroImage ? '420px' : '320px' }}>
            {event.heroImage ? (
              <>
                <img src={event.heroImage} alt={event.name} className="w-full h-full object-cover absolute inset-0" style={{ minHeight: '420px' }} />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 30%, ${palette.hero}90 70%, ${palette.hero})` }} />
              </>
            ) : (
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 30% 20%, ${palette.accent}20, transparent 60%), radial-gradient(ellipse at 70% 80%, ${palette.accent}10, transparent 50%)` }}>
                <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
                  <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="20" cy="20" r="1" fill="white" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#dots)" />
                </svg>
              </div>
            )}

            <div className="relative z-10 flex flex-col items-center justify-end h-full px-6 pb-10 pt-20" style={{ minHeight: event.heroImage ? '420px' : '320px' }}>
              <FadeInSection delay={0.1}>
                <p className="font-sans-elegant text-white/50 text-xs sm:text-sm tracking-[0.3em] uppercase text-center mb-3 font-medium">
                  {event.eventCategory || event.type || "You are cordially invited"}
                </p>
              </FadeInSection>

              {event.description && !isWedding && (
                <FadeInSection delay={0.2}>
                  <p className="font-body text-white/50 text-sm sm:text-base italic text-center max-w-md leading-relaxed mb-2">
                    {event.description.length > 120 ? event.description.slice(0, 120) + "..." : event.description}
                  </p>
                </FadeInSection>
              )}

              <FadeInSection delay={0.3}>
                <Ornament color="rgba(255,255,255,0.25)" />
              </FadeInSection>

              <FadeInSection delay={0.4}>
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white font-medium leading-[1.15] tracking-tight text-center mb-3">
                  {event.name}
                </h1>
              </FadeInSection>

              {isWedding && event.description && (
                <FadeInSection delay={0.5}>
                  <p className="font-body text-white/50 text-base sm:text-lg italic text-center max-w-md leading-relaxed mb-2">
                    {event.description.length > 120 ? event.description.slice(0, 120) + "..." : event.description}
                  </p>
                </FadeInSection>
              )}

              <FadeInSection delay={0.6}>
                <Ornament color="rgba(255,255,255,0.25)" />
              </FadeInSection>

              {event.startDate && (
                <FadeInSection delay={0.7}>
                  <p className="font-sans-elegant text-white/60 text-xs tracking-[0.2em] uppercase text-center">
                    {formatDate(event.startDate)}
                  </p>
                  {(event.ceremonyVenue || event.receptionVenue) && (
                    <p className="font-body text-white/50 text-sm text-center mt-2">
                      {event.ceremonyVenue || event.receptionVenue}
                    </p>
                  )}
                  {(event.ceremonyAddress || event.receptionAddress) && (
                    <p className="font-body text-white/40 text-sm text-center mt-0.5">
                      {event.ceremonyAddress || event.receptionAddress}
                    </p>
                  )}
                  {event.city && (
                    <p className="font-sans-elegant text-white/40 text-xs tracking-[0.15em] text-center mt-1 flex items-center justify-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      {event.city}{event.country ? `, ${event.country}` : ""}
                    </p>
                  )}
                </FadeInSection>
              )}
            </div>
          </div>

          {countdown && !countdown.passed && (
            <div className="px-6 py-10 sm:py-14 text-center" style={{ backgroundColor: palette.bg, borderBottom: `1px solid ${palette.border}` }}>
              <FadeInSection>
                <p className="font-sans-elegant text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-8" style={{ color: palette.muted }}>
                  Counting down
                </p>
                <div className="grid grid-cols-4 gap-4 sm:gap-8 max-w-md mx-auto">
                  {[
                    { value: countdown.days, label: "Days" },
                    { value: countdown.hours, label: "Hours" },
                    { value: countdown.minutes, label: "Minutes" },
                    { value: countdown.seconds, label: "Seconds" },
                  ].map(unit => (
                    <div key={unit.label}>
                      <div className="font-display text-3xl sm:text-5xl font-light" style={{ color: palette.text }}>
                        {String(unit.value).padStart(2, "0")}
                      </div>
                      <div className="font-sans-elegant text-[9px] sm:text-[10px] tracking-[0.25em] uppercase mt-2" style={{ color: palette.muted }}>
                        {unit.label}
                      </div>
                    </div>
                  ))}
                </div>
              </FadeInSection>
            </div>
          )}

          {event.description && (
            <div className="px-6 sm:px-10 py-10 sm:py-14 text-center" style={{ borderBottom: `1px solid ${palette.border}` }}>
              <FadeInSection>
                <p className="font-sans-elegant text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-5" style={{ color: palette.accent }}>
                  {isWedding ? "Our Story" : "About This Event"}
                </p>
                <p className="font-body text-lg sm:text-xl leading-relaxed" style={{ color: palette.text }}>
                  {event.description}
                </p>
                <Ornament color={palette.accent} />
              </FadeInSection>
            </div>
          )}

          <div className="px-6 sm:px-10 py-10 sm:py-14" style={{ borderBottom: `1px solid ${palette.border}` }}>
            <FadeInSection>
              <p className="font-sans-elegant text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-2 text-center" style={{ color: palette.accent }}>
                {isWedding ? "When & Where" : "Event Details"}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl text-center mb-10" style={{ color: palette.text }}>
                Join Us
              </h2>
            </FadeInSection>

            <div className="space-y-5">
              {event.startDate && (
                <FadeInSection delay={0.1} direction="left">
                  <div className="flex items-start gap-4 p-5 rounded-2xl" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${palette.accent}15` }}>
                      <Calendar className="w-5 h-5" style={{ color: palette.accent }} />
                    </div>
                    <div>
                      <p className="font-sans-elegant text-[10px] tracking-[0.2em] uppercase mb-1" style={{ color: palette.muted }}>Date</p>
                      <p className="font-display text-base" style={{ color: palette.text }}>{formatDate(event.startDate)}</p>
                      {event.endDate && event.endDate !== event.startDate && (
                        <p className="font-body text-sm mt-0.5" style={{ color: palette.muted }}>to {formatDateShort(event.endDate)}</p>
                      )}
                      {formatTime(event.startDate) && (
                        <p className="font-sans-elegant text-xs mt-1" style={{ color: palette.muted }}>
                          <Clock className="w-3 h-3 inline mr-1" />{formatTime(event.startDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </FadeInSection>
              )}

              {(event.ceremonyVenue || event.receptionVenue) && (
                <FadeInSection delay={0.2} direction="right">
                  <div className="p-5 rounded-2xl" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}>
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${palette.accent}15` }}>
                        <MapPin className="w-5 h-5" style={{ color: palette.accent }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-sans-elegant text-[10px] tracking-[0.2em] uppercase mb-1" style={{ color: palette.muted }}>Venue</p>
                        <p className="font-display text-base" style={{ color: palette.text }}>{event.ceremonyVenue || event.receptionVenue}</p>
                        {event.city && (
                          <p className="font-body text-sm mt-0.5" style={{ color: palette.muted }}>
                            {event.city}{event.country ? `, ${event.country}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => openMaps(event.ceremonyVenue || event.receptionVenue, event.city, event.country)}
                      className="mt-3 ml-[60px] font-sans-elegant text-xs tracking-[0.1em] uppercase flex items-center gap-2 transition-opacity hover:opacity-70"
                      style={{ color: palette.accent }}
                    >
                      <Navigation className="w-3.5 h-3.5" /> Get Directions <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </FadeInSection>
              )}

              {event.decorStyle && (
                <FadeInSection delay={0.3} direction="left">
                  <div className="flex items-start gap-4 p-5 rounded-2xl" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${palette.accent}15` }}>
                      <Heart className="w-5 h-5" style={{ color: palette.accent }} />
                    </div>
                    <div>
                      <p className="font-sans-elegant text-[10px] tracking-[0.2em] uppercase mb-1" style={{ color: palette.muted }}>Theme & Style</p>
                      <p className="font-display text-base" style={{ color: palette.text }}>{event.decorStyle}</p>
                      {event.colorTheme && <p className="font-body text-sm mt-0.5" style={{ color: palette.muted }}>Colour: {event.colorTheme}</p>}
                    </div>
                  </div>
                </FadeInSection>
              )}
            </div>
          </div>

          {venues.length > 0 && (
            <div className="px-6 sm:px-10 py-10 sm:py-14" style={{ borderBottom: `1px solid ${palette.border}` }}>
              <FadeInSection>
                <p className="font-sans-elegant text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-2 text-center" style={{ color: palette.accent }}>
                  Order of Events
                </p>
                <h2 className="font-display text-2xl sm:text-3xl text-center mb-10" style={{ color: palette.text }}>
                  {isWedding ? "The Celebration" : "Schedule"}
                </h2>
              </FadeInSection>

              {venues.length === 1 ? (
                <FadeInSection delay={0.1} direction="up">
                  <div className="p-6 rounded-2xl" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}>
                    <div className="text-center">
                      <p className="font-sans-elegant text-[10px] tracking-[0.25em] uppercase font-semibold mb-3" style={{ color: palette.accent }}>{venues[0].label}{formatTime(venues[0].date) && ` — ${formatTime(venues[0].date)}`}</p>
                    </div>
                    <h3 className="font-display text-xl mb-2" style={{ color: palette.text }}>{venues[0].venue}</h3>
                    {venues[0].address && (
                      <p className="font-body text-sm leading-relaxed mb-1" style={{ color: palette.text }}>
                        {venues[0].address}
                      </p>
                    )}
                    <p className="font-body text-sm" style={{ color: palette.muted }}>
                      {event.city}{event.country ? `, ${event.country}` : ""}
                    </p>
                    {venues[0].date && (
                      <p className="font-sans-elegant text-xs mt-2" style={{ color: palette.muted }}>
                        {formatDateShort(venues[0].date)}
                      </p>
                    )}
                    {event.colorTheme && (
                      <p className="font-sans-elegant text-xs mt-2" style={{ color: palette.accent }}>
                        Colour of the Day: {event.colorTheme}
                      </p>
                    )}
                    <button
                      onClick={() => openMaps(venues[0].address || venues[0].venue, event.city, event.country)}
                      className="mt-4 font-sans-elegant text-[10px] tracking-[0.15em] uppercase flex items-center gap-1.5"
                      style={{ color: palette.accent }}
                    >
                      <Navigation className="w-3 h-3" /> Get Directions
                    </button>
                  </div>
                </FadeInSection>
              ) : (
                <div className={`grid gap-5 ${venues.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {venues.map((v, i) => (
                    <FadeInSection key={i} delay={i * 0.15} direction={i % 2 === 0 ? "left" : "right"}>
                      <div className="p-5 rounded-2xl h-full" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}>
                        <p className="font-sans-elegant text-[10px] tracking-[0.25em] uppercase font-semibold mb-3" style={{ color: palette.accent }}>
                          {v.label}{formatTime(v.date) && ` — ${formatTime(v.date)}`}
                        </p>
                        <h3 className="font-display text-lg mb-2" style={{ color: palette.text }}>{v.venue}</h3>
                        {v.address && (
                          <p className="font-body text-sm leading-relaxed mb-1" style={{ color: palette.text }}>
                            {v.address}
                          </p>
                        )}
                        <p className="font-body text-sm" style={{ color: palette.muted }}>
                          {event.city}{event.country ? `, ${event.country}` : ""}
                        </p>
                        {v.date && (
                          <p className="font-sans-elegant text-xs mt-2" style={{ color: palette.muted }}>
                            {formatDateShort(v.date)}
                          </p>
                        )}
                        {event.colorTheme && (
                          <p className="font-sans-elegant text-xs mt-2" style={{ color: palette.accent }}>
                            Colour of the Day: {event.colorTheme}
                          </p>
                        )}
                        <button
                          onClick={() => openMaps(v.address || v.venue, event.city, event.country)}
                          className="mt-3 font-sans-elegant text-[10px] tracking-[0.15em] uppercase flex items-center gap-1.5"
                          style={{ color: palette.accent }}
                        >
                          <Navigation className="w-3 h-3" /> Get Directions
                        </button>
                      </div>
                    </FadeInSection>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Generated: Welcome Message ── */}
          {event.appConfig?.welcomeMessage && (
            <div className="px-6 sm:px-10 py-10 sm:py-14 text-center" style={{ borderBottom: `1px solid ${palette.border}`, background: `linear-gradient(135deg, ${palette.accent}08, transparent)` }}>
              <FadeInSection>
                <p className="font-sans-elegant text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-4" style={{ color: palette.accent }}>Welcome</p>
                <p className="font-body text-xl sm:text-2xl leading-relaxed max-w-lg mx-auto" style={{ color: palette.text }}>
                  {event.appConfig.welcomeMessage}
                </p>
                <Ornament color={palette.accent} />
              </FadeInSection>
            </div>
          )}

          {/* ── Generated: Highlights ── */}
          {event.appConfig?.highlights && event.appConfig.highlights.length > 0 && (
            <div className="px-6 sm:px-10 py-10 sm:py-14" style={{ borderBottom: `1px solid ${palette.border}` }}>
              <FadeInSection>
                <p className="font-sans-elegant text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-2 text-center" style={{ color: palette.accent }}>What to Expect</p>
                <h2 className="font-display text-2xl sm:text-3xl text-center mb-10" style={{ color: palette.text }}>Evening Highlights</h2>
              </FadeInSection>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {event.appConfig.highlights.map((h, i) => (
                  <FadeInSection key={i} delay={i * 0.1} direction={i % 2 === 0 ? "left" : "right"}>
                    <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${palette.accent}20` }}>
                        <span className="text-xs" style={{ color: palette.accent }}>✦</span>
                      </div>
                      <p className="font-body text-base leading-snug" style={{ color: palette.text }}>{h}</p>
                    </div>
                  </FadeInSection>
                ))}
              </div>
            </div>
          )}

          {/* ── Generated: Programme ── */}
          {event.appConfig?.programme && event.appConfig.programme.length > 0 && (
            <div className="px-6 sm:px-10 py-10 sm:py-14" style={{ borderBottom: `1px solid ${palette.border}` }}>
              <FadeInSection>
                <p className="font-sans-elegant text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-2 text-center" style={{ color: palette.accent }}>Programme</p>
                <h2 className="font-display text-2xl sm:text-3xl text-center mb-10" style={{ color: palette.text }}>Order of Events</h2>
              </FadeInSection>
              <div className="relative max-w-md mx-auto">
                <div className="absolute left-[22px] top-0 bottom-0 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${palette.accent}40, transparent)` }} />
                <div className="space-y-6">
                  {event.appConfig.programme.map((item, i) => (
                    <FadeInSection key={i} delay={i * 0.1} direction="left">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-lg" style={{ backgroundColor: palette.card, border: `2px solid ${palette.accent}40` }}>
                          {item.icon || "✨"}
                        </div>
                        <div className="flex-1 pb-2">
                          <p className="font-sans-elegant text-[10px] tracking-[0.2em] uppercase mb-0.5" style={{ color: palette.accent }}>{item.time}</p>
                          <p className="font-display text-base" style={{ color: palette.text }}>{item.title}</p>
                          {item.description && (
                            <p className="font-body text-sm mt-0.5 leading-snug" style={{ color: palette.muted }}>{item.description}</p>
                          )}
                        </div>
                      </div>
                    </FadeInSection>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Generated: Dress Code ── */}
          {event.appConfig?.dressCodeDescription && (
            <div className="px-6 sm:px-10 py-10 sm:py-14 text-center" style={{ borderBottom: `1px solid ${palette.border}` }}>
              <FadeInSection>
                <p className="font-sans-elegant text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-2" style={{ color: palette.accent }}>Dress Code</p>
                <h2 className="font-display text-2xl sm:text-3xl mb-5" style={{ color: palette.text }}>What to Wear</h2>
                <p className="font-body text-lg leading-relaxed max-w-md mx-auto" style={{ color: palette.muted }}>
                  {event.appConfig.dressCodeDescription}
                </p>
              </FadeInSection>
            </div>
          )}

          {/* ── Generated: FAQs ── */}
          {event.appConfig?.faqs && event.appConfig.faqs.length > 0 && (
            <div className="px-6 sm:px-10 py-10 sm:py-14" style={{ borderBottom: `1px solid ${palette.border}` }}>
              <FadeInSection>
                <p className="font-sans-elegant text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-2 text-center" style={{ color: palette.accent }}>Need to Know</p>
                <h2 className="font-display text-2xl sm:text-3xl text-center mb-10" style={{ color: palette.text }}>FAQs</h2>
              </FadeInSection>
              <div className="space-y-3 max-w-lg mx-auto">
                {event.appConfig.faqs.map((faq, i) => (
                  <FaqItem key={i} question={faq.question} answer={faq.answer} palette={palette} delay={i * 0.08} />
                ))}
              </div>
            </div>
          )}

          {/* ── Generated: Custom Note ── */}
          {event.appConfig?.customNote && (
            <div className="px-6 sm:px-10 py-10 sm:py-14 text-center" style={{ borderBottom: `1px solid ${palette.border}`, background: `${palette.accent}06` }}>
              <FadeInSection>
                <Ornament color={palette.accent} />
                <p className="font-body text-lg sm:text-xl leading-relaxed max-w-lg mx-auto italic" style={{ color: palette.text }}>
                  "{event.appConfig.customNote}"
                </p>
                <Ornament color={palette.accent} />
              </FadeInSection>
            </div>
          )}

          {event.rsvpEnabled && (
            <div id="rsvp" className="px-6 sm:px-10 py-10 sm:py-14" style={{ borderBottom: `1px solid ${palette.border}` }}>
              <FadeInSection>
                <p className="font-sans-elegant text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-2 text-center" style={{ color: palette.accent }}>
                  Your Response
                </p>
                <h2 className="font-display text-2xl sm:text-3xl text-center mb-3" style={{ color: palette.text }}>
                  RSVP
                </h2>
                <p className="font-body text-base text-center mb-10" style={{ color: palette.muted }}>
                  {isWedding ? "Kindly let us know if you can celebrate with us" : isCorporate ? "Please confirm your attendance" : "Let us know if you can make it"}
                </p>
              </FadeInSection>

              {!showRsvpForm && rsvpStep !== "success" && (
                <FadeInSection delay={0.1} className="text-center">
                  <button
                    onClick={() => setShowRsvpForm(true)}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-sans-elegant text-sm tracking-[0.1em] uppercase transition-all hover:opacity-90"
                    style={{ backgroundColor: palette.text, color: palette.bg }}
                  >
                    <Send className="w-4 h-4" />
                    {isWedding ? "Reply to Invitation" : "RSVP Now"}
                  </button>
                </FadeInSection>
              )}

              {showRsvpForm && rsvpStep !== "success" && (
                <FadeInSection delay={0.05}>
                  <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}>
                    <div className="p-2 flex" style={{ backgroundColor: `${palette.accent}10` }}>
                      {["form", "details"].map((step, i) => (
                        <div key={step} className="flex-1 text-center py-2">
                          <div className="flex items-center justify-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-sans-elegant font-medium"
                              style={{
                                backgroundColor: rsvpStep === step || (step === "form" && rsvpStep === "details") ? palette.accent : `${palette.accent}30`,
                                color: rsvpStep === step || (step === "form" && rsvpStep === "details") ? "#fff" : palette.muted,
                              }}
                            >
                              {step === "form" && rsvpStep === "details" ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                            </div>
                            <span className="font-sans-elegant text-[10px] tracking-[0.1em] uppercase" style={{ color: palette.muted }}>
                              {step === "form" ? "Your Info" : "Preferences"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 sm:p-8">
                      {rsvpStep === "form" && (
                        <div className="space-y-5">
                          <div className="text-center mb-6">
                            <p className="font-display text-xl" style={{ color: palette.text }}>
                              {isWedding ? "Will you be joining us?" : "Confirm your attendance"}
                            </p>
                          </div>

                          <div className="flex gap-3">
                            {[
                              { value: "accepted", label: isWedding ? "Joyfully Accept" : "Yes, I'll attend", icon: <Heart className="w-4 h-4" /> },
                              { value: "tentative", label: "Maybe", icon: <Clock className="w-4 h-4" /> },
                              { value: "declined", label: isWedding ? "Regretfully Decline" : "Can't make it", icon: <Mail className="w-4 h-4" /> },
                            ].map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setRsvpForm({ ...rsvpForm, rsvpStatus: opt.value })}
                                className="flex-1 p-3 rounded-xl text-center transition-all"
                                style={{
                                  backgroundColor: rsvpForm.rsvpStatus === opt.value ? `${palette.accent}15` : "transparent",
                                  border: `2px solid ${rsvpForm.rsvpStatus === opt.value ? palette.accent : palette.border}`,
                                }}
                              >
                                <span className="block mb-1" style={{ color: rsvpForm.rsvpStatus === opt.value ? palette.accent : palette.muted }}>{opt.icon}</span>
                                <span className="font-sans-elegant text-[9px] tracking-[0.05em] uppercase block" style={{ color: rsvpForm.rsvpStatus === opt.value ? palette.text : palette.muted }}>{opt.label}</span>
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="font-sans-elegant text-[10px] tracking-[0.15em] uppercase block mb-1.5" style={{ color: palette.muted }}>First Name *</label>
                              <input
                                value={rsvpForm.firstName}
                                onChange={e => setRsvpForm({ ...rsvpForm, firstName: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl font-body text-base outline-none"
                                style={{ border: `1px solid ${palette.border}`, color: palette.text, backgroundColor: palette.card }}
                                placeholder="First name"
                              />
                            </div>
                            <div>
                              <label className="font-sans-elegant text-[10px] tracking-[0.15em] uppercase block mb-1.5" style={{ color: palette.muted }}>Last Name *</label>
                              <input
                                value={rsvpForm.lastName}
                                onChange={e => setRsvpForm({ ...rsvpForm, lastName: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl font-body text-base outline-none"
                                style={{ border: `1px solid ${palette.border}`, color: palette.text, backgroundColor: palette.card }}
                                placeholder="Last name"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="font-sans-elegant text-[10px] tracking-[0.15em] uppercase block mb-1.5" style={{ color: palette.muted }}>Email Address *</label>
                            <input
                              type="email"
                              value={rsvpForm.email}
                              onChange={e => setRsvpForm({ ...rsvpForm, email: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl font-body text-base outline-none"
                              style={{ border: `1px solid ${palette.border}`, color: palette.text, backgroundColor: palette.card }}
                              placeholder="your@email.com"
                            />
                          </div>

                          <div>
                            <label className="font-sans-elegant text-[10px] tracking-[0.15em] uppercase block mb-1.5" style={{ color: palette.muted }}>Phone (Optional)</label>
                            <input
                              type="tel"
                              value={rsvpForm.phone}
                              onChange={e => setRsvpForm({ ...rsvpForm, phone: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl font-body text-base outline-none"
                              style={{ border: `1px solid ${palette.border}`, color: palette.text, backgroundColor: palette.card }}
                              placeholder="+234 800 000 0000"
                            />
                          </div>

                          <button
                            onClick={handleRsvpSubmit}
                            disabled={!rsvpForm.firstName || !rsvpForm.lastName || !rsvpForm.email}
                            className="w-full py-3.5 rounded-xl font-sans-elegant text-sm tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                            style={{ backgroundColor: palette.text, color: palette.bg }}
                          >
                            Continue <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {rsvpStep === "details" && (
                        <div className="space-y-5">
                          <div className="text-center mb-4">
                            <p className="font-display text-xl" style={{ color: palette.text }}>
                              {rsvpForm.rsvpStatus === "declined" ? "We'll miss you" : "A Few More Details"}
                            </p>
                            <p className="font-sans-elegant text-xs mt-1" style={{ color: palette.muted }}>
                              {rsvpForm.rsvpStatus === "declined" ? "Thank you for letting us know" : "Help us prepare for your arrival"}
                            </p>
                          </div>

                          {rsvpForm.rsvpStatus !== "declined" && (
                            <>
                              <div>
                                <label className="font-sans-elegant text-[10px] tracking-[0.15em] uppercase block mb-2" style={{ color: palette.muted }}>
                                  <Users className="w-3 h-3 inline mr-1" /> Additional Guests
                                </label>
                                <div className="flex items-center gap-4 justify-center">
                                  <button onClick={() => setRsvpForm({ ...rsvpForm, plusOnes: Math.max(0, rsvpForm.plusOnes - 1) })} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ border: `1px solid ${palette.border}` }}>
                                    <Minus className="w-4 h-4" style={{ color: palette.muted }} />
                                  </button>
                                  <span className="font-display text-3xl w-12 text-center" style={{ color: palette.text }}>{rsvpForm.plusOnes}</span>
                                  <button onClick={() => setRsvpForm({ ...rsvpForm, plusOnes: rsvpForm.plusOnes + 1 })} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ border: `1px solid ${palette.border}` }}>
                                    <Plus className="w-4 h-4" style={{ color: palette.muted }} />
                                  </button>
                                </div>
                                {rsvpForm.plusOnes > 0 && (
                                  <div className="mt-3">
                                    <input
                                      value={rsvpForm.plusOneNames}
                                      onChange={e => setRsvpForm({ ...rsvpForm, plusOneNames: e.target.value })}
                                      className="w-full px-4 py-3 rounded-xl font-body text-sm outline-none"
                                      style={{ border: `1px solid ${palette.border}`, color: palette.text, backgroundColor: palette.card }}
                                      placeholder="Guest names (comma separated)"
                                    />
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="font-sans-elegant text-[10px] tracking-[0.15em] uppercase block mb-2" style={{ color: palette.muted }}>
                                  <Utensils className="w-3 h-3 inline mr-1" /> Dietary Requirements
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {["None", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-Free", "Dairy-Free", "Other"].map(diet => (
                                    <button
                                      key={diet}
                                      onClick={() => setRsvpForm({ ...rsvpForm, dietaryRequirements: rsvpForm.dietaryRequirements === diet ? "" : diet })}
                                      className="px-3 py-1.5 rounded-full font-sans-elegant text-[10px] tracking-[0.05em] uppercase"
                                      style={{
                                        backgroundColor: rsvpForm.dietaryRequirements === diet ? `${palette.accent}15` : "transparent",
                                        border: `1px solid ${rsvpForm.dietaryRequirements === diet ? palette.accent : palette.border}`,
                                        color: rsvpForm.dietaryRequirements === diet ? palette.text : palette.muted,
                                      }}
                                    >
                                      {diet}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="font-sans-elegant text-[10px] tracking-[0.15em] uppercase block mb-1.5" style={{ color: palette.muted }}>Meal Preference</label>
                                <div className="flex gap-2">
                                  {(isWedding ? ["Fish", "Chicken", "Beef", "Vegetarian", "Vegan"] : ["Standard", "Vegetarian", "Vegan"]).map(meal => (
                                    <button
                                      key={meal}
                                      onClick={() => setRsvpForm({ ...rsvpForm, mealChoice: rsvpForm.mealChoice === meal ? "" : meal })}
                                      className="flex-1 py-2.5 rounded-xl font-sans-elegant text-[10px] tracking-[0.05em] uppercase text-center"
                                      style={{
                                        backgroundColor: rsvpForm.mealChoice === meal ? `${palette.accent}15` : "transparent",
                                        border: `1px solid ${rsvpForm.mealChoice === meal ? palette.accent : palette.border}`,
                                        color: rsvpForm.mealChoice === meal ? palette.text : palette.muted,
                                      }}
                                    >
                                      {meal}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}

                          <div>
                            <label className="font-sans-elegant text-[10px] tracking-[0.15em] uppercase block mb-1.5" style={{ color: palette.muted }}>Special Requirements or Message</label>
                            <textarea
                              value={rsvpForm.specialNeeds}
                              onChange={e => setRsvpForm({ ...rsvpForm, specialNeeds: e.target.value })}
                              rows={3}
                              className="w-full px-4 py-3 rounded-xl font-body text-sm outline-none resize-none"
                              style={{ border: `1px solid ${palette.border}`, color: palette.text, backgroundColor: palette.card }}
                              placeholder={isWedding ? "Any message for the couple..." : "Anything we should know..."}
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => setRsvpStep("form")}
                              className="flex-1 py-3.5 rounded-xl font-sans-elegant text-sm tracking-[0.1em] uppercase"
                              style={{ border: `1px solid ${palette.border}`, color: palette.muted }}
                            >
                              Back
                            </button>
                            <button
                              onClick={handleRsvpSubmit}
                              disabled={rsvpMutation.isPending}
                              className="flex-[2] py-3.5 rounded-xl font-sans-elegant text-sm tracking-[0.1em] uppercase flex items-center justify-center gap-2 disabled:opacity-60"
                              style={{ backgroundColor: palette.text, color: palette.bg }}
                            >
                              {rsvpMutation.isPending ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Send className="w-4 h-4" />
                                  {rsvpForm.rsvpStatus === "accepted" ? "Confirm Attendance" : rsvpForm.rsvpStatus === "declined" ? "Send Regrets" : "Submit Response"}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </FadeInSection>
              )}

              {rsvpStep === "success" && (
                <FadeInSection className="text-center">
                  <div className="rounded-2xl p-10" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: rsvpForm.rsvpStatus === "accepted" ? "#4CAF5015" : `${palette.accent}15` }}>
                      {rsvpForm.rsvpStatus === "accepted" ? (
                        <PartyPopper className="w-10 h-10" style={{ color: "#4CAF50" }} />
                      ) : rsvpForm.rsvpStatus === "declined" ? (
                        <Heart className="w-10 h-10" style={{ color: palette.accent }} />
                      ) : (
                        <CheckCircle2 className="w-10 h-10" style={{ color: palette.accent }} />
                      )}
                    </div>
                    <h3 className="font-display text-2xl mb-3" style={{ color: palette.text }}>
                      {rsvpForm.rsvpStatus === "accepted"
                        ? (isWedding ? "We can't wait to celebrate with you!" : "You're confirmed!")
                        : rsvpForm.rsvpStatus === "declined"
                          ? (isWedding ? "We'll miss you" : "Sorry you can't make it")
                          : "Response Recorded"}
                    </h3>
                    <p className="font-body text-base mb-2" style={{ color: palette.muted }}>
                      Thank you, {rsvpForm.firstName}. Your response has been recorded.
                    </p>
                    {rsvpForm.rsvpStatus === "accepted" && rsvpForm.plusOnes > 0 && (
                      <p className="font-sans-elegant text-xs" style={{ color: palette.muted }}>
                        Party of {1 + rsvpForm.plusOnes} confirmed
                      </p>
                    )}
                    <Ornament color={palette.accent} />
                    <button
                      onClick={() => { setShowRsvpForm(false); setRsvpStep("form"); setRsvpForm({ firstName: "", lastName: "", email: "", phone: "", rsvpStatus: "accepted", plusOnes: 0, plusOneNames: "", dietaryRequirements: "", mealChoice: "", specialNeeds: "" }); }}
                      className="mt-4 font-sans-elegant text-[10px] tracking-[0.15em] uppercase"
                      style={{ color: palette.accent }}
                    >
                      Submit another response
                    </button>
                  </div>
                </FadeInSection>
              )}
            </div>
          )}

          <div className="px-6 sm:px-10 py-12 sm:py-16 text-center">
            <FadeInSection>
              <Ornament color={palette.accent} />
              <p className="font-display text-xl sm:text-2xl mb-4" style={{ color: palette.text }}>
                {isWedding ? "We can't wait to celebrate with you" : "We look forward to seeing you"}
              </p>
              {event.startDate && (
                <p className="font-sans-elegant text-xs tracking-[0.15em] uppercase mb-2" style={{ color: palette.muted }}>
                  {formatDate(event.startDate)}
                </p>
              )}
              {event.city && (
                <p className="font-sans-elegant text-xs" style={{ color: palette.muted }}>
                  {event.city}{event.country ? `, ${event.country}` : ""}
                </p>
              )}
              <Ornament color={palette.accent} />
            </FadeInSection>
          </div>
        </div>

        <div className="text-center mt-8 mb-4">
          <p className="font-sans-elegant text-[9px] tracking-[0.2em] uppercase" style={{ color: `${palette.muted}80` }}>
            Crafted with care by Event Perfekt
          </p>
        </div>
      </div>

      {event.rsvpEnabled && (
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden" style={{ backgroundColor: `${palette.card}F0`, borderTop: `1px solid ${palette.border}`, backdropFilter: "blur(12px)" }}>
          <div className="flex justify-center py-3 px-4">
            <button
              onClick={() => scrollToSection("rsvp")}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full font-sans-elegant text-xs tracking-[0.1em] uppercase"
              style={{ backgroundColor: palette.text, color: palette.bg }}
            >
              <Heart className="w-4 h-4" /> RSVP
            </button>
          </div>
        </div>
      )}

      {event.rsvpEnabled && <div className="h-16 sm:hidden" />}
    </div>
  );
}
