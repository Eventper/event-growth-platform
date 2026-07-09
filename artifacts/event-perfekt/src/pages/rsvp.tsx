import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, HelpCircle, Calendar, MapPin, Clock, Shirt, Users, Heart, ExternalLink } from "lucide-react";
import FormHelperBot from "@/components/FormHelperBot";

interface PlusOneEntry {
  name: string;
  dietaryRequirements: string;
  mealChoice: string;
}

const DIETARY_OPTIONS = [
  { value: "", label: "None" },
  { value: "Vegetarian", label: "Vegetarian" },
  { value: "Vegan", label: "Vegan" },
  { value: "Halal", label: "Halal" },
  { value: "Kosher", label: "Kosher" },
  { value: "Gluten-Free", label: "Gluten-Free" },
  { value: "Nut-Free", label: "Nut-Free" },
  { value: "Dairy-Free", label: "Dairy-Free" },
];

const MEAL_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "Standard", label: "Standard" },
  { value: "Vegetarian", label: "Vegetarian" },
  { value: "Vegan", label: "Vegan" },
  { value: "Fish", label: "Fish" },
  { value: "Chicken", label: "Chicken" },
  { value: "Beef", label: "Beef" },
];

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatEventTime(timeStr: string) {
  if (!timeStr) return "";
  if (timeStr.includes(":")) {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  }
  return timeStr;
}

function getMapUrl(venue: string, address: string, city: string, country: string) {
  const parts = [venue, address, city, country].filter(Boolean);
  if (parts.length === 0) return null;
  const query = encodeURIComponent(parts.join(", "));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function getMapEmbedUrl(venue: string, address: string, city: string, country: string) {
  const parts = [venue, address, city, country].filter(Boolean);
  if (parts.length === 0) return null;
  const query = encodeURIComponent(parts.join(", "));
  return `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

export default function RSVPPage() {
  usePageMeta({ title: "RSVP — Event Perfekt" });

  const params = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const isDirect = new URLSearchParams(search).get("direct") === "1";
  const token = params.token || "";
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [response, setResponse] = useState({ rsvpStatus: "", plusOnes: 0, dietaryRequirements: "", mealChoice: "", specialNeeds: "" });
  const [plusOneEntries, setPlusOneEntries] = useState<PlusOneEntry[]>([]);
  const confettiRootRef = useRef<HTMLDivElement | null>(null);

  function fireConfetti() {
    const root = confettiRootRef.current;
    if (!root) return;
    const colors = ["#330311", "#8B1538", "#d4af37", "#E2C87A", "#ffffff", "#ff6b9d"];
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement("div");
      const size = 6 + Math.random() * 8;
      const tx = (Math.random() - 0.5) * 600;
      const ty = -200 - Math.random() * 400;
      const rot = Math.random() * 720;
      piece.style.cssText = `position:fixed;left:50%;top:60%;width:${size}px;height:${size * 0.4}px;background:${colors[i % colors.length]};border-radius:2px;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:transform 1.4s cubic-bezier(.2,.8,.4,1),opacity 1.4s ease-out;opacity:1;`;
      root.appendChild(piece);
      requestAnimationFrame(() => { piece.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rot}deg)`; piece.style.opacity = "0"; });
      setTimeout(() => piece.remove(), 1600);
    }
  }

  useEffect(() => {
    if (!token) {
      setError("Missing RSVP link token");
      setLoading(false);
      return;
    }
    fetch(`/api/rsvp/${token}`)
      .then(res => { if (!res.ok) throw new Error("RSVP link not found"); return res.json(); })
      .then(d => {
        // If guest hasn't come from the invitation view, redirect there for the envelope animation
        if (!isDirect && d.invitationId) {
          setLocation(`/invitation/${d.invitationId}?token=${token}`);
          return;
        }
        setData(d);
        setResponse({ rsvpStatus: d.guest.rsvpStatus || "", plusOnes: d.guest.plusOnes || 0, dietaryRequirements: d.guest.dietaryRequirements || "", mealChoice: d.guest.mealChoice || "", specialNeeds: d.guest.specialNeeds || "" });
        const count = d.guest.plusOnes || 0;
        if (count > 0) setPlusOneEntries(Array.from({ length: count }, () => ({ name: "", dietaryRequirements: "", mealChoice: "" })));
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [token, setLocation]);

  useEffect(() => {
    const currentLength = plusOneEntries.length;
    const targetLength = response.plusOnes;
    if (targetLength > currentLength) {
      setPlusOneEntries([...plusOneEntries, ...Array.from({ length: targetLength - currentLength }, () => ({ name: "", dietaryRequirements: "", mealChoice: "" }))]);
    } else if (targetLength < currentLength) {
      setPlusOneEntries(plusOneEntries.slice(0, targetLength));
    }
  }, [response.plusOnes]);

  const updatePlusOneEntry = (index: number, field: keyof PlusOneEntry, value: string) => {
    const updated = [...plusOneEntries];
    updated[index] = { ...updated[index], [field]: value };
    setPlusOneEntries(updated);
  };

  const handleSubmit = async (status: string) => {
    setSubmitting(true);
    try {
      const plusOneNames = plusOneEntries.map(e => e.name).filter(Boolean).join(", ");
      const plusOneDetails = plusOneEntries.map(e => ({ name: e.name, dietaryRequirements: e.dietaryRequirements, mealChoice: e.mealChoice }));
      const res = await fetch(`/api/rsvp/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...response, rsvpStatus: status, plusOneNames, plusOneDetails }) });
      if (!res.ok) throw new Error("Failed to submit RSVP");
      setSubmitted(true);
      setResponse({ ...response, rsvpStatus: status });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gradient-to-b from-[#330311] via-[#4a0a1e] to-[#330311] flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37] mx-auto mb-4"></div><p className="text-[#d4af37] text-sm tracking-widest uppercase">Loading your invitation...</p></div></div>;
  if (error) return <div className="min-h-screen bg-gradient-to-b from-[#330311] via-[#4a0a1e] to-[#330311] flex items-center justify-center p-6"><Card className="max-w-md w-full bg-white shadow-2xl border-0"><CardContent className="py-12 text-center"><X className="w-12 h-12 text-red-500 mx-auto mb-3" /><h2 className="text-xl font-bold text-gray-800 mb-2">RSVP Not Found</h2><p className="text-gray-600">{error}</p></CardContent></Card></div>;
  if (submitted) return <div className="min-h-screen bg-gradient-to-b from-[#330311] via-[#4a0a1e] to-[#330311] flex items-center justify-center p-6"><Card className="max-w-md w-full bg-white shadow-2xl border-0"><CardContent className="py-12 text-center"><div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-green-600" /></div><h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2><p className="text-gray-600 text-lg">{response.rsvpStatus === "accepted" && "We're looking forward to seeing you!"}{response.rsvpStatus === "declined" && "We're sorry you can't make it. Thank you for letting us know."}{response.rsvpStatus === "tentative" && "We've noted your tentative response. Please update when you can."}</p>{response.rsvpStatus === "accepted" && data?.event && <div className="mt-6 p-4 bg-[#330311]/5 rounded-lg text-left"><p className="text-sm text-gray-600 font-medium mb-2">Event Details:</p><p className="text-sm text-gray-700">{data.event.name}</p>{data.event.startDate && <p className="text-sm text-gray-600">{formatEventDate(data.event.startDate)}</p>}{(data.event.venue || data.event.venueAddress) && <p className="text-sm text-gray-600">{data.event.venue || data.event.venueAddress}</p>}</div>}</CardContent></Card></div>;

  const guest = data?.guest;
  const event = data?.event;
  const venueDisplay = event?.venue || "";
  const addressDisplay = event?.venueAddress || "";
  const locationParts = [event?.city, event?.country].filter(Boolean).join(", ");
  const mapUrl = event ? getMapUrl(venueDisplay, addressDisplay, event.city, event.country) : null;
  const mapEmbedUrl = event ? getMapEmbedUrl(venueDisplay, addressDisplay, event.city, event.country) : null;
  const hasLocationInfo = venueDisplay || addressDisplay || event?.city;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#330311] via-[#4a0a1e] to-[#330311] flex items-center justify-center p-4 md:p-6">
      <div ref={confettiRootRef} className="pointer-events-none fixed inset-0 z-[9999]" aria-hidden="true" />
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center py-6"><div className="inline-block mb-4"><Heart className="w-8 h-8 text-[#d4af37] mx-auto" /></div><h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2 tracking-wide">You're Invited!</h1>{event && <div className="mt-4"><p className="text-2xl md:text-3xl text-[#d4af37] font-serif mb-3">{event.name}</p>{event.eventType && <span className="inline-block px-3 py-1 bg-[#d4af37]/20 text-[#d4af37] text-xs uppercase tracking-widest rounded-full mb-4">{event.eventType}</span>}</div>}<div className="w-24 h-px bg-[#d4af37]/50 mx-auto mt-4" /></div>
        {event && (event.description || event.welcomeMessage) && <Card className="bg-white/95 backdrop-blur shadow-2xl border-0 overflow-hidden"><div className="h-1 bg-gradient-to-r from-[#330311] via-[#d4af37] to-[#330311]" /><CardContent className="py-6 text-center"><p className="text-gray-700 text-lg leading-relaxed italic">"{event.welcomeMessage || event.description}"</p></CardContent></Card>}
        {event && (event.startDate || hasLocationInfo || event.dressCode) && <Card className="bg-white/95 backdrop-blur shadow-2xl border-0 overflow-hidden"><div className="h-1 bg-gradient-to-r from-[#330311] via-[#d4af37] to-[#330311]" /><CardHeader className="pb-2"><CardTitle className="text-[#330311] text-lg font-serif">Event Details</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{event.startDate && <div className="flex items-start gap-3 p-3 bg-[#330311]/5 rounded-lg"><Calendar className="w-5 h-5 text-[#330311] mt-0.5 flex-shrink-0" /><div><p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Date</p><p className="text-gray-800 font-medium">{formatEventDate(event.startDate)}</p>{event.endDate && event.endDate !== event.startDate && <p className="text-gray-600 text-sm">to {formatEventDate(event.endDate)}</p>}</div></div>}{event.startTime && <div className="flex items-start gap-3 p-3 bg-[#330311]/5 rounded-lg"><Clock className="w-5 h-5 text-[#330311] mt-0.5 flex-shrink-0" /><div><p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Time</p><p className="text-gray-800 font-medium">{formatEventTime(event.startTime)}</p></div></div>}{hasLocationInfo && <div className="flex items-start gap-3 p-3 bg-[#330311]/5 rounded-lg"><MapPin className="w-5 h-5 text-[#330311] mt-0.5 flex-shrink-0" /><div><p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Venue</p>{venueDisplay && <p className="text-gray-800 font-medium">{venueDisplay}</p>}{addressDisplay && <p className="text-gray-600 text-sm">{addressDisplay}</p>}{locationParts && <p className="text-gray-600 text-sm">{locationParts}</p>}</div></div>}{event.dressCode && <div className="flex items-start gap-3 p-3 bg-[#330311]/5 rounded-lg"><Shirt className="w-5 h-5 text-[#330311] mt-0.5 flex-shrink-0" /><div><p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dress Code</p><p className="text-gray-800 font-medium">{event.dressCode}</p></div></div>}</div>{hasLocationInfo && mapUrl && <div className="mt-4"><div className="rounded-lg overflow-hidden border border-gray-200">{mapEmbedUrl && <iframe src={mapEmbedUrl} width="100%" height="200" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Event Location Map" className="w-full" />}<a href={mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-50 hover:bg-gray-100 transition-colors text-[#330311] text-sm font-medium"><ExternalLink className="w-4 h-4" />Open in Google Maps</a></div></div>}</CardContent></Card>}
        <Card className="bg-white/95 backdrop-blur shadow-2xl border-0 overflow-hidden"><div className="h-1 bg-gradient-to-r from-[#330311] via-[#d4af37] to-[#330311]" /><CardHeader><CardTitle className="text-[#330311] font-serif text-xl">Dear {guest?.firstName} {guest?.lastName}</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-gray-600">Please let us know if you'll be attending:</p><div className="grid grid-cols-3 gap-3"><Button onClick={() => { if ((data as any)?.invitation?.confetti_on_accept !== false) fireConfetti(); handleSubmit("accepted"); }} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white flex flex-col items-center py-5 h-auto rounded-xl shadow-md transition-all hover:scale-105"><Check className="w-7 h-7 mb-1" /><span className="font-medium">Accept</span></Button><Button onClick={() => handleSubmit("tentative")} disabled={submitting} className="bg-amber-500 hover:bg-amber-600 text-white flex flex-col items-center py-5 h-auto rounded-xl shadow-md transition-all hover:scale-105"><HelpCircle className="w-7 h-7 mb-1" /><span className="font-medium">Maybe</span></Button><Button onClick={() => handleSubmit("declined")} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white flex flex-col items-center py-5 h-auto rounded-xl shadow-md transition-all hover:scale-105"><X className="w-7 h-7 mb-1" /><span className="font-medium">Decline</span></Button></div><div className="border-t pt-5 space-y-4"><div><label className="block text-sm font-medium text-gray-700 mb-1.5"><Users className="w-4 h-4 inline mr-1.5" />Number of Plus Ones</label><input type="number" min="0" max="10" value={response.plusOnes} onChange={e => setResponse({ ...response, plusOnes: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#330311]/20 focus:border-[#330311] outline-none transition-all" /></div>{response.plusOnes > 0 && <div className="space-y-3"><p className="text-sm font-medium text-gray-700">Plus One Details</p>{plusOneEntries.map((entry, index) => (<div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3"><p className="text-xs font-semibold text-[#330311] uppercase tracking-wide">Guest {index + 1}</p><div><label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label><input type="text" value={entry.name} onChange={e => updatePlusOneEntry(index, "name", e.target.value)} placeholder="Enter guest name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#330311]/20 focus:border-[#330311] outline-none transition-all" /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-600 mb-1">Dietary Requirements</label><select value={entry.dietaryRequirements} onChange={e => updatePlusOneEntry(index, "dietaryRequirements", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#330311]/20 focus:border-[#330311] outline-none transition-all">{DIETARY_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></div><div><label className="block text-xs font-medium text-gray-600 mb-1">Meal Preference</label><select value={entry.mealChoice} onChange={e => updatePlusOneEntry(index, "mealChoice", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#330311]/20 focus:border-[#330311] outline-none transition-all">{MEAL_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></div></div></div>))}</div>}<div><label className="block text-sm font-medium text-gray-700 mb-1.5">Your Dietary Requirements</label><select value={response.dietaryRequirements} onChange={e => setResponse({ ...response, dietaryRequirements: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#330311]/20 focus:border-[#330311] outline-none transition-all">{DIETARY_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></div><div><label className="block text-sm font-medium text-gray-700 mb-1.5">Your Meal Preference</label><select value={response.mealChoice} onChange={e => setResponse({ ...response, mealChoice: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#330311]/20 focus:border-[#330311] outline-none transition-all">{MEAL_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></div><div><label className="block text-sm font-medium text-gray-700 mb-1.5">Special Requirements</label><input type="text" value={response.specialNeeds} onChange={e => setResponse({ ...response, specialNeeds: e.target.value })} placeholder="Accessibility needs, allergies, etc." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#330311]/20 focus:border-[#330311] outline-none transition-all" /></div></div></CardContent></Card>
        <p className="text-center text-[#d4af37]/60 text-xs tracking-widest uppercase py-4">Powered by Event Perfekt Global Ltd</p>
      </div>
      <FormHelperBot formContext="rsvp" welcomeMessage="Hi! Need help with your RSVP? I can explain any part of this form." suggestedQuestions={["What are my dietary options?", "Can I bring a plus one?", "Can I change my RSVP later?"]} />
    </div>
  );
}
