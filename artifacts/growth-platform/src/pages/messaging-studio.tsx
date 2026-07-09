import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventContext } from "@/contexts/EventContext";
import { PipelineStep } from "@/components/PipelineStep";
import { PageHeader } from "@/components/PageHeader";
import { apiGet, apiPost, saveResume } from "@/lib/api";
import {
  Send,
  Loader2,
  Mail,
  MessageSquare,
  Linkedin,
  Star,
  Crown,
  Radio,
  FileText,
  Copy,
  Check,
  ArrowRight,
  ChevronRight,
  UserCheck,
  Sparkles,
} from "lucide-react";

interface EventRecord {
  id: string;
  name: string;
  status: string;
  strategyPack?: any;
}

interface Prospect {
  id: string;
  name: string;
  title: string;
  company: string;
  prospectType: string;
  status: string;
}

function fetchEvents(): Promise<EventRecord[]> {
  return apiGet("/api/growth/events");
}

function fetchProspects(eventId: string): Promise<{ ok: boolean; prospects: Prospect[] }> {
  return apiGet(`/api/growth/events/${eventId}/prospects?type=all`);
}

function generateTemplate(eventId: string, templateType: string, prospectId?: string): Promise<{ ok: boolean; template: any; templateType: string }> {
  return apiPost("/api/growth/outreach/templates", { eventId, templateType, prospectId });
}

const TEMPLATES = [
  {
    id: "linkedin_connection",
    label: "LinkedIn Connection",
    icon: Linkedin,
    description: "First touch LinkedIn connection request",
  },
  {
    id: "linkedin_message",
    label: "LinkedIn First Message",
    icon: MessageSquare,
    description: "Initial LinkedIn DM after connecting",
  },
  {
    id: "email_outreach",
    label: "Email Outreach",
    icon: Mail,
    description: "Cold email to corporate prospects",
  },
  {
    id: "follow_up",
    label: "Follow-up",
    icon: ArrowRight,
    description: "Gentle follow-up after no reply",
  },
  {
    id: "sponsor_pitch",
    label: "Sponsor Pitch",
    icon: Star,
    description: "Sponsorship proposal email",
  },
  {
    id: "vip_invitation",
    label: "VIP Invitation",
    icon: Crown,
    description: "Exclusive invitation for high-value guests",
  },
  {
    id: "speaker_invitation",
    label: "Speaker Invitation",
    icon: Sparkles,
    description: "Invite someone to speak or panel",
  },
  {
    id: "media_pitch",
    label: "Media Pitch",
    icon: Radio,
    description: "Pitch to journalists, bloggers, podcasters",
  },
  {
    id: "partnership_proposal",
    label: "Partnership Proposal",
    icon: FileText,
    description: "Strategic partnership outreach",
  },
];

export default function MessagingStudio() {
  const { selectedEventId, setSelectedEventId } = useEventContext();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(selectedEventId);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<string>("");
  const [generatedTemplate, setGeneratedTemplate] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");

  // Save resume state
  useEffect(() => {
    if (selectedEvent) {
      saveResume(selectedEvent, "messaging-studio", `Generating ${selectedTemplate || "template"}`, selectedTemplate);
    }
  }, [selectedEvent, selectedTemplate]);

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const { data: prospectsData } = useQuery({
    queryKey: ["prospects", selectedEvent],
    queryFn: () => (selectedEvent ? fetchProspects(selectedEvent) : Promise.resolve({ ok: true, prospects: [] })),
    enabled: !!selectedEvent,
  });

  const templateMutation = useMutation({
    mutationFn: () => generateTemplate(selectedEvent!, selectedTemplate!, selectedProspect || undefined),
    onSuccess: (data) => {
      if (data.ok) setGeneratedTemplate(data);
    },
  });

  const event = events?.find((e: EventRecord) => e.id === selectedEvent);
  const prospects = prospectsData?.prospects || [];
  const approvedProspects = prospects.filter((p) => p.status === "approved" || p.status === "approved_for_outreach");

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Messaging Studio" intro="Generate tailored outreach for every channel and audience type." />

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
                    setSelectedEvent(e.id);
                    setSelectedEventId(e.id);
                    setSelectedTemplate(null);
                    setGeneratedTemplate(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedEvent === e.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
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
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#6E2433]" />
                  APPROVED PROSPECTS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {approvedProspects.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">No approved prospects yet. Go to Screen to approve.</p>
                ) : (
                  <>
                    <select
                      value={selectedProspect}
                      onChange={(e) => setSelectedProspect(e.target.value)}
                      className="w-full text-[13px] px-2 py-2 rounded-md border border-[#E8E0D5] bg-white"
                    >
                      <option value="">No specific prospect (template mode)</option>
                      {approvedProspects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.title} @ {p.company}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedProspect ? "Personalised for this prospect" : "Generic template — personalise later"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedEvent && (
            <div className="text-center py-12 text-[13px] text-ivory/70">
              <Send className="w-10 h-10 mx-auto mb-3 text-champagne/50" />
              <p className="font-medium text-ivory">Select an event to start messaging</p>
              <p className="mt-1">Choose an event with a strategy pack to generate tailored messages.</p>
            </div>
          )}

          {selectedEvent && !event?.strategyPack && (
            <div className="text-center py-12 text-[13px] text-ivory/70">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-champagne/50" />
              <p className="font-medium text-ivory">No strategy pack found</p>
              <p className="mt-1">Run the Wizard for this event to generate messaging templates.</p>
            </div>
          )}

          {selectedEvent && event?.strategyPack && (
            <>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="generated">Generated</TabsTrigger>
                </TabsList>

                <TabsContent value="templates" className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {TEMPLATES.map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setSelectedTemplate(t.id);
                            setGeneratedTemplate(null);
                            templateMutation.mutate();
                            setActiveTab("generated");
                          }}
                          className={`text-left p-4 rounded-lg border transition-all ${
                            selectedTemplate === t.id
                              ? "bg-[#6E2433]/10 border-[#6E2433]/40"
                              : "bg-white border-[#E8E0D5] hover:border-[#6E2433]/40"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#EFE9DF] flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-[#6E2433]" />
                            </div>
                            <div>
                              <div className="text-[13px] font-medium text-[#1A1714]">{t.label}</div>
                              <div className="text-[11px] text-[#1A1714] mt-0.5">{t.description}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="generated">
                  {templateMutation.isPending && (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-champagne" />
                      <p className="text-[13px] text-ivory/70 mt-2">Generating message...</p>
                    </div>
                  )}

                  {generatedTemplate && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#6E2433]" />
                          GENERATED: {generatedTemplate.templateType}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {generatedTemplate.template?.subject && (
                          <div>
                            <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Subject</label>
                            <div className="text-[14px] font-medium text-[#1A1714] mt-1">
                              {generatedTemplate.template.subject}
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Message</label>
                          <Textarea
                            value={generatedTemplate.template?.body || ""}
                            readOnly
                            className="min-h-[200px] text-[13px] bg-[#EFE9DF]/50 mt-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[11px]">
                            {generatedTemplate.template?.channel === "linkedin" ? (
                              <Linkedin className="w-3 h-3 mr-1" />
                            ) : (
                              <Mail className="w-3 h-3 mr-1" />
                            )}
                            {generatedTemplate.template?.channel}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[11px] h-7"
                            onClick={() => copyToClipboard(
                              `${generatedTemplate.template?.subject || ""}\n\n${generatedTemplate.template?.body || ""}`
                            )}
                          >
                            {copied ? (
                              <>
                                <Check className="w-3 h-3 mr-1 text-[#4A9E6A]" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          This template is generated but not saved. Use it as a draft, edit it, or copy to your outreach tool.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {!generatedTemplate && !templateMutation.isPending && (
                    <div className="text-center py-8 text-[13px] text-ivory/70">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-champagne/50" />
                      Select a template type from the Templates tab to generate a message.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* Pipeline Step */}
      <PipelineStep current="messaging" />
    </div>
  );
}
