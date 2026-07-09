import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Sparkles, Globe, Plus, Trash2, ChevronDown, ChevronUp,
  Eye, Save, ArrowLeft, Clock, MessageSquare, Star, HelpCircle,
  Shirt, FileText, Palette, Loader2, CheckCircle2
} from "lucide-react";

const SUGGESTED_PROMPTS = [
  "Build a luxury evening event app for 100 professional women attending a networking dinner",
  "Create a corporate conference app with a formal tone, clear schedule and FAQs",
  "Build a wedding guest app with a romantic feel, ceremony details and RSVP",
  "Generate a celebration birthday event app with a fun, glamorous vibe",
];

const THEME_PRESETS = [
  { label: "Burgundy", value: "#330311" },
  { label: "Champagne Gold", value: "#B8860B" },
  { label: "Midnight Navy", value: "#1B2838" },
  { label: "Soft Rose", value: "#A0525A" },
  { label: "Slate", value: "#2C3E50" },
];

type ProgrammeItem = { time: string; title: string; description: string; icon: string };
type FaqItem = { question: string; answer: string };

type AppConfig = {
  welcomeMessage: string;
  programme: ProgrammeItem[];
  highlights: string[];
  faqs: FaqItem[];
  dressCodeDescription: string;
  themeColor: string;
  customNote: string;
};

const DEFAULT_CONFIG: AppConfig = {
  welcomeMessage: "",
  programme: [],
  highlights: [],
  faqs: [],
  dressCodeDescription: "",
  themeColor: "#330311",
  customNote: "",
};

function SectionCard({ icon, title, children, defaultOpen = true }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className="text-[#330311]">{icon}</span>
          <span className="font-semibold text-gray-800 text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-gray-50">{children}</div>}
    </div>
  );
}

export default function EventAppBuilder() {
  const { eventId } = useParams<{ eventId: string }>();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [generated, setGenerated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rsvpEnabled, setRsvpEnabled] = useState(true);
  const [showGuestCount, setShowGuestCount] = useState(false);
  const [eventWebsiteEnabled, setEventWebsiteEnabled] = useState(true);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const { data: event } = useQuery<any>({
    queryKey: ["/api/events", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!eventId,
  });

  useEffect(() => {
    if (event) {
      setRsvpEnabled(event.rsvpEnabled !== false);
      setShowGuestCount(event.showGuestCount === true);
      setEventWebsiteEnabled(event.eventWebsiteEnabled !== false);
      if (event.appConfig) {
        setConfig({ ...DEFAULT_CONFIG, ...event.appConfig });
        setGenerated(true);
      }
    }
  }, [event]);

  const generateMutation = useMutation({
    mutationFn: async (p: string) => {
      const res = await fetch(`/api/event-app/${eventId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: p }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<AppConfig>;
    },
    onSuccess: (data) => {
      setConfig(data);
      setGenerated(true);
      setSaved(false);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/event-app/${eventId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appConfig: config, rsvpEnabled, showGuestCount, eventWebsiteEnabled }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const updateProgramme = (i: number, field: keyof ProgrammeItem, val: string) => {
    setConfig(c => {
      const p = [...c.programme];
      p[i] = { ...p[i], [field]: val };
      return { ...c, programme: p };
    });
  };

  const addProgramme = () => setConfig(c => ({
    ...c,
    programme: [...c.programme, { time: "", title: "", description: "", icon: "✨" }],
  }));

  const removeProgramme = (i: number) => setConfig(c => ({
    ...c,
    programme: c.programme.filter((_, idx) => idx !== i),
  }));

  const updateHighlight = (i: number, val: string) => setConfig(c => {
    const h = [...c.highlights];
    h[i] = val;
    return { ...c, highlights: h };
  });

  const addHighlight = () => setConfig(c => ({ ...c, highlights: [...c.highlights, ""] }));
  const removeHighlight = (i: number) => setConfig(c => ({
    ...c, highlights: c.highlights.filter((_, idx) => idx !== i),
  }));

  const updateFaq = (i: number, field: keyof FaqItem, val: string) => {
    setConfig(c => {
      const f = [...c.faqs];
      f[i] = { ...f[i], [field]: val };
      return { ...c, faqs: f };
    });
  };

  const addFaq = () => setConfig(c => ({
    ...c, faqs: [...c.faqs, { question: "", answer: "" }],
  }));

  const removeFaq = (i: number) => setConfig(c => ({
    ...c, faqs: c.faqs.filter((_, idx) => idx !== i),
  }));

  const isGenerating = generateMutation.isPending;
  const isSaving = saveMutation.isPending;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="bg-[#330311] text-white px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setLocation(`/events/${eventId}/guests`)} className="text-white/70 hover:text-white transition-colors flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-white/60 text-xs tracking-widest uppercase">Event App Builder</p>
              <h1 className="font-semibold text-base truncate">{event?.name || "Loading…"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="border-white/30 text-white bg-transparent hover:bg-white/10 text-xs"
              onClick={() => window.open(`/event-app/${eventId}`, "_blank")}
            >
              <Eye className="w-4 h-4 mr-1" /> Preview App
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Intelligence Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#330311] to-[#5a0a1e] px-6 py-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">App Builder</p>
                <p className="text-white/60 text-xs">Describe what you want — the agent reads your event data and builds everything</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <Textarea
              ref={promptRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. Build me a luxury evening event app for the I Am Her event — 100 professional women, champagne gold theme, formal dress code, include a detailed programme and FAQs…"
              className="min-h-[100px] text-sm border-gray-200 resize-none focus:border-[#330311] focus:ring-[#330311]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setPrompt(s); promptRef.current?.focus(); }}
                  className="text-xs text-[#330311] bg-[#33031108] hover:bg-[#33031115] border border-[#33031122] rounded-full px-3 py-1 transition-colors"
                >
                  {s.length > 55 ? s.slice(0, 55) + "…" : s}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button
                className="bg-[#330311] text-white hover:bg-[#4a0a1e] gap-2"
                onClick={() => generateMutation.mutate(prompt)}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate</>
                )}
              </Button>
              {generated && !isGenerating && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> App content generated — edit below then save
                </p>
              )}
              {generateMutation.isError && (
                <p className="text-xs text-red-500">Generation failed. Try again.</p>
              )}
            </div>
          </div>
        </div>

        {/* Editable Sections */}
        {generated && (
          <div className="space-y-4">

            {/* Welcome Message */}
            <SectionCard icon={<MessageSquare className="w-4 h-4" />} title="Welcome Message">
              <Textarea
                value={config.welcomeMessage}
                onChange={e => setConfig(c => ({ ...c, welcomeMessage: e.target.value }))}
                className="min-h-[90px] text-sm border-gray-200 resize-none"
                placeholder="A warm welcome message shown at the top of the event app…"
              />
            </SectionCard>

            {/* Programme */}
            <SectionCard icon={<Clock className="w-4 h-4" />} title="Programme / Schedule">
              <div className="space-y-3">
                {config.programme.map((item, i) => (
                  <div key={i} className="grid grid-cols-[60px_1fr_1fr_32px] gap-2 items-start">
                    <Input
                      value={item.icon}
                      onChange={e => updateProgramme(i, "icon", e.target.value)}
                      className="text-center text-lg border-gray-200 px-1"
                      placeholder="✨"
                    />
                    <Input
                      value={item.time}
                      onChange={e => updateProgramme(i, "time", e.target.value)}
                      className="text-sm border-gray-200"
                      placeholder="18:30"
                    />
                    <Input
                      value={item.title}
                      onChange={e => updateProgramme(i, "title", e.target.value)}
                      className="text-sm border-gray-200"
                      placeholder="Arrival & Welcome Drinks"
                    />
                    <button onClick={() => removeProgramme(i)} className="text-red-400 hover:text-red-600 mt-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {item.description !== undefined && (
                      <div className="col-span-4">
                        <Input
                          value={item.description}
                          onChange={e => updateProgramme(i, "description", e.target.value)}
                          className="text-xs border-gray-100 text-gray-500"
                          placeholder="Optional short description…"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={addProgramme}
                  className="flex items-center gap-1.5 text-xs text-[#330311] hover:underline mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add item
                </button>
              </div>
            </SectionCard>

            {/* Highlights */}
            <SectionCard icon={<Star className="w-4 h-4" />} title="Event Highlights">
              <div className="space-y-2">
                {config.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={h}
                      onChange={e => updateHighlight(i, e.target.value)}
                      className="text-sm border-gray-200"
                      placeholder="Highlight…"
                    />
                    <button onClick={() => removeHighlight(i)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={addHighlight} className="flex items-center gap-1.5 text-xs text-[#330311] hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add highlight
                </button>
              </div>
            </SectionCard>

            {/* FAQs */}
            <SectionCard icon={<HelpCircle className="w-4 h-4" />} title="FAQs">
              <div className="space-y-4">
                {config.faqs.map((f, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={f.question}
                        onChange={e => updateFaq(i, "question", e.target.value)}
                        className="text-sm border-gray-200 font-medium"
                        placeholder="Question?"
                      />
                      <button onClick={() => removeFaq(i)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <Textarea
                      value={f.answer}
                      onChange={e => updateFaq(i, "answer", e.target.value)}
                      className="text-sm border-gray-100 text-gray-600 min-h-[60px] resize-none"
                      placeholder="Answer…"
                    />
                  </div>
                ))}
                <button onClick={addFaq} className="flex items-center gap-1.5 text-xs text-[#330311] hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add FAQ
                </button>
              </div>
            </SectionCard>

            {/* Dress Code */}
            <SectionCard icon={<Shirt className="w-4 h-4" />} title="Dress Code">
              <Textarea
                value={config.dressCodeDescription}
                onChange={e => setConfig(c => ({ ...c, dressCodeDescription: e.target.value }))}
                className="min-h-[70px] text-sm border-gray-200 resize-none"
                placeholder="Describe the expected dress code for guests…"
              />
            </SectionCard>

            {/* Custom Note */}
            <SectionCard icon={<FileText className="w-4 h-4" />} title="Custom Note to Guests" defaultOpen={false}>
              <Textarea
                value={config.customNote}
                onChange={e => setConfig(c => ({ ...c, customNote: e.target.value }))}
                className="min-h-[70px] text-sm border-gray-200 resize-none"
                placeholder="Any additional message or special instructions for your guests…"
              />
            </SectionCard>

            {/* Theme Colour */}
            <SectionCard icon={<Palette className="w-4 h-4" />} title="Accent Colour" defaultOpen={false}>
              <div className="flex flex-wrap gap-3 items-center">
                {THEME_PRESETS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setConfig(c => ({ ...c, themeColor: p.value }))}
                    className="flex items-center gap-2 text-xs rounded-full border px-3 py-1.5 transition-all"
                    style={{
                      borderColor: config.themeColor === p.value ? p.value : "#e5e7eb",
                      background: config.themeColor === p.value ? p.value + "15" : "transparent",
                      color: config.themeColor === p.value ? p.value : "#374151",
                    }}
                  >
                    <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: p.value }} />
                    {p.label}
                  </button>
                ))}
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs text-gray-400">Custom:</span>
                  <input
                    type="color"
                    value={config.themeColor}
                    onChange={e => setConfig(c => ({ ...c, themeColor: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#330311]" /> App Settings
              </h3>
              <div className="space-y-4">
                {[
                  { label: "RSVP enabled", sub: "Guests can submit their RSVP through the app", value: rsvpEnabled, set: setRsvpEnabled },
                  { label: "Show guest count", sub: "Display total confirmed attendees on the app", value: showGuestCount, set: setShowGuestCount },
                  { label: "Event app visible", sub: "App is publicly accessible via its link", value: eventWebsiteEnabled, set: setEventWebsiteEnabled },
                ].map(({ label, sub, value, set }) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{label}</p>
                      <p className="text-xs text-gray-400">{sub}</p>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={set}
                      className="data-[state=checked]:bg-[#330311]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3 pb-8">
              <Button
                className="bg-[#330311] text-white hover:bg-[#4a0a1e] gap-2"
                onClick={() => saveMutation.mutate()}
                disabled={isSaving}
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : saved ? (
                  <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                ) : (
                  <><Save className="w-4 h-4" /> Save & Publish</>
                )}
              </Button>
              <Button
                variant="outline"
                className="border-[#330311] text-[#330311] hover:bg-[#33031108] gap-2"
                onClick={() => window.open(`/event-app/${eventId}`, "_blank")}
              >
                <Eye className="w-4 h-4" /> View Live App
              </Button>
              {saveMutation.isError && (
                <p className="text-xs text-red-500">Failed to save. Please try again.</p>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!generated && !isGenerating && (
          <div className="text-center py-16 text-gray-400">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Describe your event app above and hit <strong>Generate</strong></p>
            <p className="text-xs mt-1 opacity-70">The agent reads your event details and builds all sections automatically</p>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-16 text-[#330311]">
            <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin opacity-50" />
            <p className="text-sm font-medium">Building your event app…</p>
            <p className="text-xs mt-1 text-gray-400">Reading event data and generating content</p>
          </div>
        )}
      </div>
    </div>
  );
}
