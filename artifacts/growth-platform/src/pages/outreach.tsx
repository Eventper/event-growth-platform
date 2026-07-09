import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineStep } from "@/components/PipelineStep";
import { PageHeader } from "@/components/PageHeader";
import { TrustPanel, scoreColor, type TrustReport } from "@/components/TrustPanel";
import { Link } from "wouter";
import { apiGet, apiPost, saveResume } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  AlertTriangle,
  Shield,
  Reply,
  Ban,
  Zap,
  ChevronDown,
  ChevronRight,
  Wand2,
  Sparkles,
} from "lucide-react";

interface OutreachMessage {
  id: string;
  subject: string | null;
  body: string;
  channel: string;
  status: string;
  sequencePosition: number;
  prospectId: string;
  prospectName?: string;
  prospectTitle?: string;
  prospectCompany?: string;
  generatedAt: string;
  approvedAt: string | null;
  sentAt: string | null;
  metadata?: {
    trust?: TrustReport;
    reasoning?: string;
    themeName?: string;
    personaUsed?: string | null;
    [k: string]: any;
  } | null;
}

interface EventRecord {
  id: string;
  name: string;
  status: string;
  strategyPack: any | null;
}

interface Prospect {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  prospectType: string;
  status: string;
  individualOrCorporate: string | null;
  enriched: boolean | null;
}

function fetchEvents(): Promise<EventRecord[]> {
  return apiGet("/api/growth/events");
}

function fetchProspects(eventId: string): Promise<{ ok: boolean; prospects: Prospect[] }> {
  return apiGet(`/api/growth/events/${eventId}/prospects?type=audience`);
}

function fetchQueue(eventId: string, status?: string): Promise<{ ok: boolean; messages: OutreachMessage[] }> {
  const url = new URL(`/api/growth/outreach/queue`, window.location.origin);
  if (eventId) url.searchParams.set("eventId", eventId);
  if (status) url.searchParams.set("status", status);
  return apiGet(url.toString());
}

function generateOutreach(prospectId: string, eventId: string): Promise<{ ok: boolean; messages: OutreachMessage[]; cost: number }> {
  return apiPost("/api/growth/outreach/generate", { prospectId, eventId });
}

function approveMessage(id: string): Promise<{ ok: boolean; message: OutreachMessage }> {
  return apiPost(`/api/growth/outreach/${id}/approve`, {});
}

function rejectMessage(id: string): Promise<{ ok: boolean; message: OutreachMessage }> {
  return apiPost(`/api/growth/outreach/${id}/reject`, {});
}

function sendMessage(id: string): Promise<{ ok: boolean; message: OutreachMessage; sent: boolean }> {
  return apiPost(`/api/growth/outreach/${id}/send`, {});
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function MessageCard({
  message,
  onApprove,
  onReject,
  onSend,
  onSchedule,
  isApproving,
  isRejecting,
  isSending,
}: {
  message: OutreachMessage;
  onApprove: () => void;
  onReject: () => void;
  onSend: () => void;
  onSchedule: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isSending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showTrust, setShowTrust] = useState(false);
  const trust = message.metadata?.trust;

  return (
    <div className="rounded-2xl bg-card text-card-foreground shadow-soft p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">
              Touch {message.sequencePosition} — {message.prospectName}
            </h3>
            <Badge variant={message.status === "pending" ? "outline" : message.status === "approved" ? "default" : message.status === "sent" ? "default" : "destructive"} className="text-xs h-5">
              {message.status}
            </Badge>
            <Badge variant="outline" className="text-xs h-5">
              {message.channel === "email" ? <Mail className="w-3 h-3 mr-1" /> : <MessageSquare className="w-3 h-3 mr-1" />}
              {message.channel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {message.prospectTitle}
            {message.prospectCompany && ` · ${message.prospectCompany}`}
          </p>
          {message.subject && (
            <p className="text-sm font-medium mt-1">{message.subject}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {message.status === "pending" && (
            <>
              <Button size="sm" variant="default" className="h-7 text-xs" onClick={onApprove} disabled={isApproving}>
                <CheckCircle className="w-3 h-3 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={onReject} disabled={isRejecting}>
                <XCircle className="w-3 h-3 mr-1" />
                Reject
              </Button>
            </>
          )}
          {message.status === "approved" && (
            <>
              <Link href="/outreach-workspace">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Wand2 className="w-3 h-3 mr-1" />
                  Refine
                </Button>
              </Link>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSchedule} title="Schedule for later">
                <Send className="w-3 h-3 mr-1" />
                Schedule
              </Button>
              <Button size="sm" variant="default" className="h-7 text-xs" onClick={onSend} disabled={isSending}>
                {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                Send now
              </Button>
            </>
          )}
          {(message.status === "scheduled" || message.status === "scheduled_pending_approval") && (
            <Link href="/scheduler">
              <Badge variant="outline" className="text-xs h-5 cursor-pointer">
                <Send className="w-3 h-3 mr-1" />
                {message.status === "scheduled" ? "Scheduled" : "Pending approval"}
              </Badge>
            </Link>
          )}
          {message.status === "sent" && (
            <Badge variant="default" className="text-xs h-5">
              <Send className="w-3 h-3 mr-1" />
              Sent
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {expanded ? "Hide" : "Show"} message
        </button>
        {trust && (
          <button
            onClick={() => setShowTrust(!showTrust)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="w-3 h-3" />
            {showTrust ? "Hide" : "Why this email"}
            {trust.scorecard && (
              <span className="ml-1 font-semibold" style={{ color: scoreColor(trust.scorecard.overall) }}>
                {trust.scorecard.overall}
              </span>
            )}
          </button>
        )}
      </div>

      {showTrust && trust && (
        <div className="mt-3 pt-3 border-t">
          <TrustPanel trust={trust} />
        </div>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t">
          <Textarea
            value={message.body}
            readOnly
            className="min-h-[120px] text-sm bg-muted"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Generated: {formatDateTime(message.generatedAt)}
            {message.approvedAt && ` · Approved: ${formatDateTime(message.approvedAt)}`}
            {message.sentAt && ` · Sent: ${formatDateTime(message.sentAt)}`}
          </p>
        </div>
      )}
    </div>
  );
}

export default function OutreachPage() {
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [activeTab, setActiveTab] = useState<string>("queue");
  const [selectedProspect, setSelectedProspect] = useState<string>("");
  // Part 4: Send confirmation dialog state (HARD STOP)
  const [sendConfirm, setSendConfirm] = useState<{ id: string; prospectName: string; channel: string } | null>(null);

  // Save resume state
  useEffect(() => {
    if (selectedEvent?.id) {
      const actionMap: Record<string, string> = {
        queue: "Reviewing outreach queue",
        generate: "Generating messages",
        approved: "Viewing approved messages",
        sent: "Viewing sent messages",
      };
      saveResume(selectedEvent.id, "outreach", actionMap[activeTab] || activeTab, activeTab);
    }
  }, [selectedEvent?.id, activeTab]);

  const { data: events, error: eventsError } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const { data: prospectsData, error: prospectsError } = useQuery({
    queryKey: ["prospects", selectedEvent?.id],
    queryFn: () => (selectedEvent ? fetchProspects(selectedEvent.id) : Promise.resolve({ ok: true, prospects: [] })),
    enabled: !!selectedEvent,
  });

  const { data: queueData, error: queueError, refetch: refetchQueue } = useQuery({
    queryKey: ["outreach-queue", selectedEvent?.id, activeTab],
    queryFn: () => (selectedEvent ? fetchQueue(selectedEvent.id, activeTab === "queue" ? "pending" : activeTab) : Promise.resolve({ ok: true, messages: [] })),
    enabled: !!selectedEvent,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateOutreach(selectedProspect, selectedEvent!.id),
    onSuccess: () => {
      refetchQueue();
      setSelectedProspect("");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveMessage(id),
    onSuccess: () => refetchQueue(),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectMessage(id),
    onSuccess: () => refetchQueue(),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendMessage(id),
    onSuccess: () => refetchQueue(),
  });

  const scheduleMutation = useMutation({
    mutationFn: (p: { id: string; when: string }) => apiPost(`/api/growth/outreach/${p.id}/schedule`, { when: p.when }),
    onSuccess: () => refetchQueue(),
    onError: (e: any) => window.alert(e?.message || "Could not schedule"),
  });

  function promptSchedule(id: string) {
    const v = window.prompt("Schedule for later — date & time (YYYY-MM-DDTHH:mm). Tue–Thu 08:00–16:00. Leave blank for the next Tue–Thu 09:00 slot:", "");
    if (v === null) return; // cancelled
    scheduleMutation.mutate({ id, when: v.trim() || "next" });
  }

  const safeEvents = Array.isArray(events) ? events : [];
  const safeProspects = Array.isArray(prospectsData?.prospects) ? prospectsData.prospects : [];
  const safeMessages = Array.isArray(queueData?.messages) ? queueData.messages : [];
  const approvedProspects = safeProspects.filter((p) => p.status === "approved" || p.status === "approved_for_outreach");
  const messages = safeMessages;
  const loadError = eventsError || prospectsError || queueError;

  return (
    <div className="space-y-6">
      <PageHeader title="Outreach" intro="Generate, approve, and send outreach. Nothing sends without human approval." />

      {loadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {loadError instanceof Error ? loadError.message : "Unable to load outreach data right now."}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Event selector */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">SELECT EVENT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {safeEvents.map((e: EventRecord) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSelectedEvent(e);
                    setSelectedProspect("");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedEvent?.id === e.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{e.name}</span>
                    <Badge variant="outline" className="text-xs h-5 ml-2">{e.status}</Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Generate */}
          {selectedEvent && approvedProspects.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Generate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  className="w-full text-sm border rounded-md px-2 py-2 bg-background"
                  value={selectedProspect}
                  onChange={(e) => setSelectedProspect(e.target.value)}
                >
                  <option value="">Select approved prospect</option>
                  {approvedProspects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.title}
                    </option>
                  ))}
                </select>
                <Button
                  className="w-full"
                  disabled={!selectedProspect || generateMutation.isPending}
                  onClick={() => generateMutation.mutate()}
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Generate 4-touch sequence
                </Button>
                {generateMutation.isSuccess && (
                  <p className="text-xs text-green-600">
                    {generateMutation.data?.messages?.length} messages generated
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Hard gate info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Safety Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <Ban className="w-3 h-3 text-destructive" />
                No auto-send. Everything requires approval.
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3 h-3" />
                Corporate → email. Individual → LinkedIn.
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3" />
                All emails include opt-out.
              </p>
              <p className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />
                Suppressed contacts blocked.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Queue */}
        <div className="lg:col-span-2 space-y-4">
          {selectedEvent ? (
            <>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="queue">Pending</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="sent">Sent</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>
              </Tabs>

              {messages.length === 0 ? (
                <div className="text-center py-12 text-ivory/70">
                  <img src={`${import.meta.env.BASE_URL}assets/empty-data.png`} alt="No messages" className="w-24 h-24 mx-auto mb-3 rounded-lg object-cover opacity-80" />
                  <p>No messages in this queue.</p>
                  {activeTab === "queue" && approvedProspects.length === 0 && (
                    <p className="text-sm mt-2">Approve prospects in the Screen tab first.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m) => (
                    <MessageCard
                      key={m.id}
                      message={m}
                      onApprove={() => approveMutation.mutate(m.id)}
                      onReject={() => rejectMutation.mutate(m.id)}
                      onSend={() => setSendConfirm({ id: m.id, prospectName: m.prospectName || "Unknown prospect", channel: m.channel })}
                      onSchedule={() => promptSchedule(m.id)}
                      isApproving={approveMutation.isPending && approveMutation.variables === m.id}
                      isRejecting={rejectMutation.isPending && rejectMutation.variables === m.id}
                      isSending={sendMutation.isPending && sendMutation.variables === m.id}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-ivory/70">
              <img src={`${import.meta.env.BASE_URL}assets/empty-data.png`} alt="Select event" className="w-24 h-24 mx-auto mb-3 rounded-lg object-cover opacity-80" />
              <p>Select an event to view the outreach queue.</p>
            </div>
          )}
        </div>
      </div>

      {/* Part 4: Send Confirmation Dialog (HARD STOP) */}
      <AlertDialog open={!!sendConfirm} onOpenChange={() => setSendConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send a {sendConfirm?.channel} message to <strong>{sendConfirm?.prospectName}</strong>. This is a real person — this action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sendConfirm) {
                  sendMutation.mutate(sendConfirm.id);
                  setSendConfirm(null);
                }
              }}
            >
              Confirm & Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pipeline Step */}
      <PipelineStep current="outreach" />
    </div>
  );
}
