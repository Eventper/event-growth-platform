import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useEventContext } from "@/contexts/EventContext";
import { PipelineStep } from "@/components/PipelineStep";
import { apiGet, apiPost, saveResume } from "@/lib/api";

import {
  Send,
  Loader2,
  Wand2,
  CheckCircle,
  Undo2,
  Mail,
  MessageSquare,
  Linkedin,
  FileText,
  Paperclip,
  Star,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  User,
  Building,
  Crown,
  Radio,
  Megaphone,
  Handshake,
  Mic,
  Sparkles,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Clock,
  BarChart3,
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
  email?: string;
  location?: string;
  industry?: string;
}

interface QualityScores {
  personalisation: number;
  clarity: number;
  tone: number;
  length: number;
  relevance: number;
  call_to_action: number;
  overall: number;
  tips: string[];
}

interface AttachmentRec {
  type: string;
  label: string;
  priority: string;
  reason: string;
  available: boolean;
  presentationId: string | null;
}

interface MessageVersion {
  body: string;
  subject: string;
  instruction: string;
  changeSummary: string;
  timestamp: number;
}

const MESSAGE_TYPES = [
  { key: "linkedin_connect", label: "LinkedIn Connection", icon: Linkedin, channel: "linkedin", desc: "Short, warm request" },
  { key: "linkedin_first", label: "LinkedIn First Message", icon: Linkedin, channel: "linkedin", desc: "Initial outreach after connecting" },
  { key: "linkedin_followup", label: "LinkedIn Follow-up", icon: Linkedin, channel: "linkedin", desc: "Gentle nudge" },
  { key: "email_intro", label: "Email Introduction", icon: Mail, channel: "email", desc: "First email outreach" },
  { key: "email_followup", label: "Email Follow-up", icon: Mail, channel: "email", desc: "Polite follow-up email" },
  { key: "sponsor", label: "Sponsor Outreach", icon: Handshake, channel: "email", desc: "Partnership proposal" },
  { key: "vip", label: "VIP Invitation", icon: Crown, channel: "email", desc: "Exclusive invitation" },
  { key: "speaker", label: "Speaker Invitation", icon: Mic, channel: "email", desc: "Stage invitation" },
  { key: "media", label: "Media Outreach", icon: Radio, channel: "email", desc: "Press pitch" },
  { key: "partnership", label: "Partnership Request", icon: Handshake, channel: "email", desc: "Collaboration proposal" },
] as const;

const QUICK_INSTRUCTIONS = [
  "Make this shorter",
  "Make this more premium",
  "Make this less salesy",
  "Add a clearer CTA",
  "Make it stronger for a CEO",
  "Create a sponsor version",
  "Create a VIP guest version",
  "Create a LinkedIn version",
  "Create an email version",
  "Add event date",
  "Remove wellbeing reference",
  "More personal",
  "More professional",
];

function fetchEvents(): Promise<EventRecord[]> {
  return apiGet("/api/growth/events");
}

function fetchProspects(eventId: string): Promise<{ ok: boolean; prospects: Prospect[] }> {
  return apiGet(`/api/growth/events/${eventId}/prospects?type=all`);
}

function generateTemplate(eventId: string, templateType: string, prospectId?: string): Promise<{ ok: boolean; template: { subject: string; body: string; channel: string }; templateType: string }> {
  return apiPost("/api/growth/outreach/templates", { eventId, templateType, prospectId });
}

function refineMessage(body: string, instruction: string, prospect: any, event: any, messageType: string, channel: string): Promise<{ ok: boolean; refined: { body: string; subject: string; change_summary: string }; cost: number }> {
  return apiPost("/api/growth/outreach/refine", { message: body, instruction, prospect, event, messageType, channel });
}

function scoreMessage(body: string, subject: string, channel: string, prospectType: string, messageType: string): Promise<{ ok: boolean; scores: QualityScores; cost: number }> {
  return apiPost("/api/growth/outreach/score", { message: body, subject, channel, prospectType, messageType });
}

function recommendAttachments(prospectType: string, tier: string, eventId: string): Promise<{ ok: boolean; recommendations: AttachmentRec[] }> {
  return apiPost("/api/growth/outreach/recommend-attachments", { prospectType, tier, eventId });
}

function approveMessage(id: string): Promise<{ ok: boolean }> {
  return apiPost(`/api/growth/outreach/${id}/approve`, {});
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-[#4A9E6A]";
  if (score >= 60) return "bg-[#6E2433]";
  if (score >= 40) return "bg-[#D4845A]";
  return "bg-[#C94A4A]";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Weak";
}

export default function OutreachWorkspace() {
  const { selectedEventId } = useEventContext();
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [selectedMessageType, setSelectedMessageType] = useState<string>("email_intro");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [instruction, setInstruction] = useState("");
  const [versions, setVersions] = useState<MessageVersion[]>([]);
  const [scores, setScores] = useState<QualityScores | null>(null);
  const [attachments, setAttachments] = useState<AttachmentRec[]>([]);
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [approved, setApproved] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const instructionRef = useRef<HTMLInputElement>(null);

  const { data: eventsData } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const selectedEvent = eventsData?.find((e: EventRecord) => e.id === selectedEventId) || null;

  const { data: prospectsData } = useQuery({
    queryKey: ["prospects", selectedEventId],
    queryFn: () => (selectedEventId ? fetchProspects(selectedEventId) : Promise.resolve({ ok: true, prospects: [] })),
    enabled: !!selectedEventId,
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      setIsGenerating(true);
      return generateTemplate(selectedEvent!.id, selectedMessageType, selectedProspect?.id);
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      if (data.ok && data.template) {
        setSubject(data.template.subject || "");
        setBody(data.template.body || "");
        setVersions([]);
        setScores(null);
        setApproved(false);
        setSelectedAttachments([]);
        // Auto-score after generation
        scoreMutation.mutate({ body: data.template.body, subject: data.template.subject || "", channel: data.template.channel || "email", prospectType: selectedProspect?.prospectType || "audience", messageType: selectedMessageType });
      }
    },
    onError: () => setIsGenerating(false),
  });

  const refineMutation = useMutation({
    mutationFn: () => {
      const mt = MESSAGE_TYPES.find((m) => m.key === selectedMessageType);
      return refineMessage(
        body,
        instruction,
        selectedProspect,
        selectedEvent ? { name: selectedEvent.name, tone: selectedEvent.strategyPack?.messaging_recommendations?.tone || "professional" } : null,
        selectedMessageType,
        mt?.channel || "email"
      );
    },
    onSuccess: (data) => {
      if (data.ok && data.refined) {
        // Save current version
        setVersions((v) => [
          { body, subject, instruction, changeSummary: data.refined.change_summary || "", timestamp: Date.now() },
          ...v.slice(0, 4),
        ]);
        setBody(data.refined.body || body);
        if (data.refined.subject) setSubject(data.refined.subject);
        setInstruction("");
        // Auto-score the refined version
        const mt = MESSAGE_TYPES.find((m) => m.key === selectedMessageType);
        scoreMutation.mutate({ body: data.refined.body || body, subject: data.refined.subject || subject, channel: mt?.channel || "email", prospectType: selectedProspect?.prospectType || "audience", messageType: selectedMessageType });
      }
    },
  });

  const scoreMutation = useMutation({
    mutationFn: ({ body, subject, channel, prospectType, messageType }: { body: string; subject: string; channel: string; prospectType: string; messageType: string }) =>
      scoreMessage(body, subject, channel, prospectType, messageType),
    onSuccess: (data) => {
      if (data.ok) setScores(data.scores);
    },
  });

  const attachmentsMutation = useMutation({
    mutationFn: () => {
      const tier = selectedEvent?.strategyPack?.positioning_tier || "mid-market";
      return recommendAttachments(selectedProspect?.prospectType || "audience", tier, selectedEvent!.id);
    },
    onSuccess: (data) => {
      if (data.ok) setAttachments(data.recommendations);
    },
  });

  // Save resume state
  useEffect(() => {
    if (selectedEvent?.id) {
      saveResume(selectedEvent.id, "outreach-workspace", `Refining ${selectedMessageType} message`, selectedMessageType);
    }
  }, [selectedEvent?.id, selectedMessageType]);

  const approveMutation = useMutation({
    mutationFn: () => {
      // First, create outreach record in DB
      return apiPost("/api/growth/outreach/generate", {
        prospectId: selectedProspect?.id,
        eventId: selectedEvent?.id,
        message: { subject, body, channel: MESSAGE_TYPES.find((m) => m.key === selectedMessageType)?.channel || "email", messageType: selectedMessageType },
      });
    },
    onSuccess: (data: any) => {
      if (data.ok && data.messages?.length) {
        const msgId = data.messages[0].id;
        // Approve the generated message
        approveMessage(msgId).then(() => {
          setApproved(true);
        });
      }
    },
  });

  const approvedProspects = prospectsData?.prospects?.filter((p: Prospect) => p.status === "approved" || p.status === "approved_for_outreach") || [];
  const mt = MESSAGE_TYPES.find((m) => m.key === selectedMessageType);

  function handleSelectProspect(prospect: Prospect) {
    setSelectedProspect(prospect);
    setSubject("");
    setBody("");
    setVersions([]);
    setScores(null);
    setApproved(false);
    setSelectedAttachments([]);
    attachmentsMutation.mutate();
  }

  function handleUndo(version: MessageVersion) {
    setBody(version.body);
    setSubject(version.subject);
    setVersions((v) => v.filter((x) => x.timestamp !== version.timestamp));
    const mt2 = MESSAGE_TYPES.find((m) => m.key === selectedMessageType);
    scoreMutation.mutate({ body: version.body, subject: version.subject, channel: mt2?.channel || "email", prospectType: selectedProspect?.prospectType || "audience", messageType: selectedMessageType });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && instruction.trim()) {
      e.preventDefault();
      refineMutation.mutate();
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-[#1A1714] min-h-[140px] flex items-end">
        <img src={`${import.meta.env.BASE_URL}assets/hero-outreach.png`} alt="Outreach" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="relative z-10 p-5 w-full flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#EFE9DF] font-heading">Outreach Workspace</h1>
            <p className="text-[14px] text-[#EFE9DF]/70 mt-1">Refine, score, and approve every message. Nothing sends without your say.</p>
          </div>
          {selectedProspect && (
            <div className="flex items-center gap-2 bg-[#EFE9DF]/10 backdrop-blur rounded-lg px-3 py-2">
              <User className="w-4 h-4 text-[#6E2433]" />
              <div>
                <div className="text-[12px] font-medium text-[#EFE9DF]">{selectedProspect.name}</div>
                <div className="text-[10px] text-[#EFE9DF]/60">{selectedProspect.title} · {selectedProspect.company}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Prospect + Message */}
        <div className="lg:col-span-7 space-y-4">
          {/* Prospect Selector */}
          <Card className="border-[#E8E0D5]/60 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-[#1A1714]">
                <User className="w-4 h-4 text-[#6E2433]" />
                SELECT PROSPECT
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEvent ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {approvedProspects.length === 0 && (
                    <p className="text-[12px] text-[#1A1714]">No approved prospects yet. Approve prospects in the Screen page first.</p>
                  )}
                  {approvedProspects.map((p: Prospect) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProspect(p)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        selectedProspect?.id === p.id
                          ? "bg-[#1A1714] text-[#EFE9DF]"
                          : "bg-[#EFE9DF]/40 hover:bg-[#EFE9DF]/60 text-[#1A1714]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedProspect?.id === p.id ? "bg-[#6E2433]" : "bg-[#E8E0D5]"}`}>
                        {p.prospectType === "sponsor" ? <Building className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{p.name}</div>
                        <div className="text-[11px] opacity-70 truncate">{p.title} · {p.company}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] h-5 border-[#6E2433]/40 text-[#1A1714]">
                        {p.prospectType}
                      </Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-[#1A1714]">Select an event from the sidebar to load approved prospects.</p>
              )}
            </CardContent>
          </Card>

          {/* Message Type */}
          {selectedProspect && (
            <Card className="border-[#E8E0D5]/60 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-[#1A1714]">
                  <Sparkles className="w-4 h-4 text-[#6E2433]" />
                  MESSAGE TYPE
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {MESSAGE_TYPES.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setSelectedMessageType(m.key)}
                        className={`text-left px-3 py-2 rounded-lg border transition-all ${
                          selectedMessageType === m.key
                            ? "border-[#6E2433] bg-[#6E2433]/10 text-[#1A1714]"
                            : "border-[#E8E0D5]/60 bg-white hover:border-[#6E2433]/40 text-[#1A1714]"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-medium">{m.label}</span>
                        </div>
                        <div className="text-[10px] opacity-60">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
                <Button
                  className="mt-3 bg-[#1A1714] text-[#EFE9DF] hover:bg-[#1A1714]/90"
                  onClick={() => generateMutation.mutate()}
                  disabled={isGenerating || !selectedProspect}
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                  {isGenerating ? "Generating..." : "Generate Message"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Message Editor */}
          {body && (
            <Card className="border-[#E8E0D5]/60 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-[#1A1714]">
                  <Mail className="w-4 h-4 text-[#6E2433]" />
                  MESSAGE
                  {mt && (
                    <Badge variant="outline" className="text-[10px] h-5 border-[#6E2433]/40">
                      {mt.channel === "email" ? <Mail className="w-3 h-3 mr-1" /> : <Linkedin className="w-3 h-3 mr-1" />}
                      {mt.channel}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mt?.channel === "email" && (
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject line"
                    className="text-[13px] border-[#E8E0D5]"
                  />
                )}
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[200px] text-[13px] border-[#E8E0D5] font-mono leading-relaxed"
                  placeholder="Message body..."
                />

                {/* Refine Bar */}
                <div className="border border-[#E8E0D5] rounded-lg p-3 bg-[#EFE9DF]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Wand2 className="w-4 h-4 text-[#6E2433]" />
                    <span className="text-[12px] font-medium text-[#1A1714]">Refine</span>
                    <span className="text-[10px] text-[#1A1714]">Type an instruction and press Enter</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      ref={instructionRef}
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g. Make this shorter, more premium, less salesy..."
                      className="text-[12px] border-[#E8E0D5] flex-1"
                    />
                    <Button
                      size="sm"
                      className="bg-[#6E2433] text-white hover:bg-[#6E2433]/80"
                      onClick={() => refineMutation.mutate()}
                      disabled={!instruction.trim() || refineMutation.isPending}
                    >
                      {refineMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    </Button>
                  </div>
                  {/* Quick suggestions */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {QUICK_INSTRUCTIONS.map((inst) => (
                      <button
                        key={inst}
                        onClick={() => {
                          setInstruction(inst);
                          instructionRef.current?.focus();
                        }}
                        className="text-[10px] px-2 py-1 rounded-full bg-[#E8E0D5]/40 text-[#1A1714] hover:bg-[#6E2433]/20 transition-colors"
                      >
                        {inst}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Version History */}
                {versions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Undo2 className="w-3.5 h-3.5 text-[#1A1714]" />
                      <span className="text-[11px] text-[#1A1714] font-medium">Version History</span>
                    </div>
                    <div className="space-y-1">
                      {versions.map((v, i) => (
                        <button
                          key={v.timestamp}
                          onClick={() => handleUndo(v)}
                          className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-[#1A1714] hover:bg-[#EFE9DF]/40 transition-colors"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span className="font-medium">v{versions.length - i}</span>
                          <span className="truncate flex-1">{v.instruction}</span>
                          <span className="text-[10px] opacity-60">{v.changeSummary}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approve */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    className="bg-[#4A9E6A] text-white hover:bg-[#4A9E6A]/90"
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending || approved}
                  >
                    {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    {approved ? "Approved" : "Approve & Queue"}
                  </Button>
                  {approved && (
                    <Badge className="bg-[#4A9E6A]/10 text-[#4A9E6A] border-[#4A9E6A]/20">
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      Ready to send
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Quality & Attachments */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quality Score Panel */}
          {scores && (
            <Card className="border-[#E8E0D5]/60 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-[#1A1714]">
                  <BarChart3 className="w-4 h-4 text-[#6E2433]" />
                  QUALITY SCORE
                  <Badge className={`text-[10px] h-5 text-white ${scoreColor(scores.overall)}`}>
                    {scores.overall}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "personalisation", label: "Personalisation" },
                  { key: "clarity", label: "Clarity" },
                  { key: "tone", label: "Tone" },
                  { key: "length", label: "Length" },
                  { key: "relevance", label: "Relevance" },
                  { key: "call_to_action", label: "Call to Action" },
                ].map((dim) => {
                  const score = (scores as any)[dim.key] as number;
                  return (
                    <div key={dim.key} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#1A1714]">{dim.label}</span>
                        <span className="font-medium text-[#1A1714]">{score} <span className="text-[10px] opacity-60">({scoreLabel(score)})</span></span>
                      </div>
                      <div className="h-1.5 bg-[#E8E0D5] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${scoreColor(score)}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  );
                })}

                {/* Overall */}
                <div className="pt-2 border-t border-[#E8E0D5]/40">
                  <div className="flex items-center justify-between text-[12px] font-medium">
                    <span className="text-[#1A1714]">Overall</span>
                    <span className={`${scores.overall >= 60 ? "text-[#4A9E6A]" : scores.overall >= 40 ? "text-[#6E2433]" : "text-[#C94A4A]"}`}>
                      {scores.overall} / 100
                    </span>
                  </div>
                </div>

                {/* Improvement Tips */}
                {scores.tips?.length > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowTips(!showTips)}
                      className="flex items-center gap-1 text-[11px] text-[#1A1714] hover:text-[#1A1714]"
                    >
                      {showTips ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <AlertTriangle className="w-3 h-3 text-[#6E2433]" />
                      {scores.tips.length} improvement {scores.tips.length === 1 ? "tip" : "tips"}
                    </button>
                    {showTips && (
                      <div className="space-y-1">
                        {scores.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px] text-[#1A1714] bg-[#EFE9DF]/30 rounded-md px-2 py-1.5">
                            <Sparkles className="w-3 h-3 text-[#6E2433] mt-0.5 shrink-0" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <Card className="border-[#E8E0D5]/60 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-[#1A1714]">
                  <Paperclip className="w-4 h-4 text-[#6E2433]" />
                  ATTACHMENTS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {attachments.map((rec) => (
                  <div
                    key={rec.type}
                    className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
                      selectedAttachments.includes(rec.type)
                        ? "border-[#6E2433] bg-[#6E2433]/10"
                        : "border-[#E8E0D5]/60 bg-[#EFE9DF]/20"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedAttachments((prev) =>
                          prev.includes(rec.type) ? prev.filter((t) => t !== rec.type) : [...prev, rec.type]
                        );
                      }}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedAttachments.includes(rec.type) ? "bg-[#6E2433]" : "bg-[#E8E0D5]"}`}>
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-medium text-[#1A1714]">{rec.label}</span>
                          <Badge className={`text-[9px] h-4 ${rec.priority === "high" ? "bg-[#C94A4A]/10 text-[#C94A4A]" : "bg-[#6E2433]/10 text-[#6E2433]"}`}>
                            {rec.priority}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-[#1A1714]">{rec.reason}</div>
                        {!rec.available && (
                          <div className="text-[10px] text-[#C94A4A]">Not generated yet — create in Presentation Studio</div>
                        )}
                      </div>
                    </button>
                    {rec.available && (
                      <div className="w-2 h-2 rounded-full bg-[#4A9E6A]" title="Available" />
                    )}
                  </div>
                ))}
                {selectedAttachments.length > 0 && (
                  <div className="text-[11px] text-[#1A1714] pt-1">
                    {selectedAttachments.length} attachment{selectedAttachments.length > 1 ? "s" : ""} selected for this message
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Empty states */}
          {!selectedProspect && (
            <Card className="border-dashed border-[#E8E0D5]/60 bg-[#EFE9DF]/10">
              <CardContent className="p-6 text-center">
                <User className="w-10 h-10 mx-auto mb-2 text-[#6E2433]/40" />
                <p className="text-[12px] text-ivory/70">Select a prospect to start crafting messages.</p>
              </CardContent>
            </Card>
          )}
          {selectedProspect && !body && !isGenerating && (
            <Card className="border-dashed border-[#E8E0D5]/60 bg-[#EFE9DF]/10">
              <CardContent className="p-6 text-center">
                <Wand2 className="w-10 h-10 mx-auto mb-2 text-[#6E2433]/40" />
                <p className="text-[12px] text-ivory/70">Choose a message type and click "Generate Message" to begin.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pipeline Step */}
      <PipelineStep current="outreach-workspace" />
    </div>
  );
}
