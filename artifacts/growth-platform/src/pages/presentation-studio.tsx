import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventContext } from "@/contexts/EventContext";
import { PipelineStep } from "@/components/PipelineStep";
import { apiGet, apiPost, saveResume } from "@/lib/api";

import {
  Presentation,
  Loader2,
  FileText,
  Crown,
  Users,
  Handshake,
  Star,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Download,
} from "lucide-react";

interface EventRecord {
  id: string;
  name: string;
  status: string;
  strategyPack?: any;
}

interface PresentationDoc {
  id: string;
  presentationType: string;
  title: string;
  content: any;
  slides: any[];
  status: string;
  cost: string;
  createdAt: string;
}

interface Slide {
  slideNumber: number;
  title: string;
  body: string;
  type: string;
}

function fetchEvents(): Promise<EventRecord[]> {
  return apiGet("/api/growth/events");
}

function fetchPresentations(eventId: string): Promise<{ ok: boolean; presentations: PresentationDoc[] }> {
  return apiGet(`/api/growth/presentations?eventId=${eventId}`);
}

function generatePresentation(eventId: string, presentationType: string): Promise<{ ok: boolean; presentation: PresentationDoc }> {
  return apiPost("/api/growth/presentations", { eventId, presentationType });
}

const PRESENTATION_TYPES = [
  { id: "sponsor_deck", label: "Sponsor Deck", icon: Crown, desc: "Pitch deck for sponsors and partners" },
  { id: "event_brochure", label: "Event Brochure", icon: FileText, desc: "Full event brochure with agenda" },
  { id: "speaker_pack", label: "Speaker Pack", icon: Users, desc: "Invitation and briefing for speakers" },
  { id: "partnership_proposal", label: "Partnership Proposal", icon: Handshake, desc: "Co-hosting and partnership pitch" },
  { id: "vip_invitation", label: "VIP Invitation", icon: Star, desc: "Premium invitation for VIP guests" },
];

const TYPE_LABELS: Record<string, string> = {
  sponsor_deck: "Sponsor Deck",
  event_brochure: "Event Brochure",
  speaker_pack: "Speaker Pack",
  partnership_proposal: "Partnership Proposal",
  vip_invitation: "VIP Invitation",
};

const TYPE_COLORS: Record<string, string> = {
  sponsor_deck: "bg-[#6E2433]/10 text-[#6E2433]",
  event_brochure: "bg-[#4A8BAE]/10 text-[#4A8BAE]",
  speaker_pack: "bg-[#1A1714]/10 text-[#1A1714]",
  partnership_proposal: "bg-[#8A6B4A]/10 text-[#8A6B4A]",
  vip_invitation: "bg-[#C74A4A]/10 text-[#C74A4A]",
};

function SlidePreview({ slide, index }: { slide: Slide; index: number }) {
  return (
    <div className="border rounded-lg p-4 bg-[#EFE9DF]/40">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold text-[#6E2433] uppercase tracking-wider">Slide {slide.slideNumber}</span>
        <Badge className="text-[10px] h-4 border-0 bg-[#1A1714]/5 text-[#1A1714]/60">{slide.type}</Badge>
      </div>
      <h4 className="text-sm font-semibold text-[#1A1714] mb-2">{slide.title}</h4>
      <div
        className="text-[12px] text-[#1A1714] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: slide.body }}
      />
    </div>
  );
}

function PresentationCard({
  presentation,
  onSelect,
  isSelected,
}: {
  presentation: PresentationDoc;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const slides = (presentation.slides || []) as Slide[];

  const copyToClipboard = () => {
    const text = `${presentation.title}\n\n${slides.map((s) => `Slide ${s.slideNumber}: ${s.title}\n${s.body}`).join("\n\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${isSelected ? "ring-2 ring-[#6E2433]" : "hover:bg-accent/50"}`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`text-[10px] h-5 border-0 ${TYPE_COLORS[presentation.presentationType] || ""}`}>
                {TYPE_LABELS[presentation.presentationType] || presentation.presentationType}
              </Badge>
              {presentation.status === "draft" && (
                <Badge variant="outline" className="text-[10px] h-5">Draft</Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm text-[#1A1714]">{presentation.title}</h3>
            <p className="text-[11px] text-[#1A1714] mt-1">
              {slides.length} slides · Generated {new Date(presentation.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={copyToClipboard}>
              {copied ? <Check className="w-3 h-3 text-[#4A9E6A]" /> : <Copy className="w-3 h-3" />}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onSelect}>
              Preview
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>

        {isSelected && slides.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Presentation className="w-4 h-4 text-[#6E2433]" />
              <span className="text-[12px] font-medium text-[#1A1714]">Slide Preview</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {slides.map((slide, i) => (
                <SlidePreview key={i} slide={slide} index={i} />
              ))}
            </div>
            {presentation.content && (
              <div className="mt-3 pt-3 border-t border-[#6E2433]/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3 h-3 text-[#6E2433]" />
                  <span className="text-[11px] font-medium text-[#1A1714] uppercase tracking-wider">Key Points</span>
                </div>
                <div className="space-y-1">
                  {(presentation.content.key_points || []).map((point: string, i: number) => (
                    <p key={i} className="text-[12px] text-[#1A1714]">• {point}</p>
                  ))}
                </div>
                {(presentation.content.statistics || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {presentation.content.statistics.map((stat: any, i: number) => (
                      <div key={i} className="bg-[#1A1714]/5 rounded-md px-2 py-1">
                        <span className="text-[10px] text-[#1A1714]">{stat.label}</span>
                        <span className="text-[12px] font-bold text-[#1A1714] ml-1">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {presentation.content.call_to_action && (
                  <div className="mt-3 bg-[#6E2433]/10 rounded-md p-2">
                    <p className="text-[12px] font-medium text-[#1A1714]">{presentation.content.call_to_action}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PresentationStudio() {
  const { selectedEventId, setSelectedEventId } = useEventContext();
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedPresentation, setSelectedPresentation] = useState<string | null>(null);

  // Save resume state
  useEffect(() => {
    if (selectedEventId) {
      saveResume(selectedEventId, "presentation-studio", `Creating ${selectedType || "presentation"}`, selectedType);
    }
  }, [selectedEventId, selectedType]);

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const { data: presentationsData, refetch: refetchPresentations } = useQuery({
    queryKey: ["presentations", selectedEventId],
    queryFn: () => (selectedEventId ? fetchPresentations(selectedEventId) : Promise.resolve({ ok: true, presentations: [] })),
    enabled: !!selectedEventId,
  });

  const generateMutation = useMutation({
    mutationFn: ({ eventId, type }: { eventId: string; type: string }) => generatePresentation(eventId, type),
    onSuccess: () => {
      refetchPresentations();
      setSelectedType("");
    },
  });

  const selectedEvent = events?.find((e: EventRecord) => e.id === selectedEventId);
  const presentations = presentationsData?.presentations || [];

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-ink min-h-[140px] flex items-end">
        <img
          src={`${import.meta.env.BASE_URL}assets/hero-intelligence.png`}
          alt="Presentation Studio"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="relative z-10 p-5 w-full">
          <h1 className="text-[28px] font-bold tracking-tight text-ivory font-heading">Presentation Studio</h1>
          <p className="text-[14px] text-ivory/70 mt-1">Generate sponsor decks, event brochures, speaker packs, and VIP invitations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Event selector */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">SELECT EVENT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {events?.map((e: EventRecord) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSelectedEventId(e.id);
                    setSelectedPresentation(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedEventId === e.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{e.name}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {selectedEvent && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">GENERATE</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {PRESENTATION_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isGenerating = generateMutation.isPending && generateMutation.variables?.type === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedType(t.id);
                        generateMutation.mutate({ eventId: selectedEvent.id, type: t.id });
                      }}
                      disabled={generateMutation.isPending}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedType === t.id ? "border-[#6E2433] bg-[#6E2433]/5" : "hover:bg-muted"
                      } ${generateMutation.isPending ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1A1714]/5 flex items-center justify-center">
                          {isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#6E2433]" />
                          ) : (
                            <Icon className="w-4 h-4 text-[#1A1714]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1714]">{t.label}</p>
                          <p className="text-[11px] text-[#1A1714]">{t.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Presentations */}
        <div className="lg:col-span-2 space-y-4">
          {selectedEvent ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ivory">{selectedEvent.name}</h2>
                  <p className="text-[12px] text-ivory/70">{presentations.length} presentations generated</p>
                </div>
              </div>

              {presentations.length === 0 ? (
                <div className="text-center py-12 text-ivory/70">
                  <Presentation className="w-12 h-12 mx-auto mb-3 text-[#6E2433]/40" />
                  <p className="text-ivory">No presentations yet.</p>
                  <p className="text-[12px] text-ivory/60 mt-1">Select a presentation type from the sidebar to generate one.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {presentations.map((p) => (
                    <PresentationCard
                      key={p.id}
                      presentation={p}
                      isSelected={selectedPresentation === p.id}
                      onSelect={() => setSelectedPresentation(selectedPresentation === p.id ? null : p.id)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-ivory/70">
              <Presentation className="w-12 h-12 mx-auto mb-3 text-[#6E2433]/40" />
              <p className="text-ivory">Select an event to view presentations.</p>
              <p className="text-[12px] text-ivory/60 mt-1">Presentations are generated per event using the strategy pack.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Step */}
      <PipelineStep current="presentations" />
    </div>
  );
}
