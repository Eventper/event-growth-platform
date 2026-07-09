import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useEventContext } from "@/contexts/EventContext";
import { useToast } from "@/hooks/use-toast";
import {
  fetchSponsors, createSponsor, updateSponsor, deleteSponsor, scoreSponsor, saveResume,
  sendSponsorEmail, apiGet,
} from "@/lib/api";
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
  Crown, Plus, Trash2, Star, Loader2, ChevronRight, Mail,
} from "lucide-react";

const STAGES = [
  "discovered", "qualified", "decision_maker_found", "outreach_drafted",
  "approved_to_contact", "contacted", "meeting_booked", "proposal_sent",
  "negotiation", "confirmed", "declined",
];

const STAGE_LABELS: Record<string, string> = {
  discovered: "Discovered", qualified: "Qualified", decision_maker_found: "Decision Maker Found",
  outreach_drafted: "Outreach Drafted", approved_to_contact: "Approved to Contact",
  contacted: "Contacted", meeting_booked: "Meeting Booked", proposal_sent: "Proposal Sent",
  negotiation: "Negotiation", confirmed: "Confirmed", declined: "Declined",
};

export default function Sponsors() {
  const { selectedEventId, setSelectedEventId } = useEventContext();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    organisationName: "", sector: "", website: "", contactName: "", contactTitle: "",
    email: "", linkedIn: "", deiAlignment: "", womenLeadershipRelevance: "",
    brandPrestigeLevel: "", estimatedPotential: "", notes: "",
  });
  const [filterStage, setFilterStage] = useState<string>("all");

  const { data: eventsData } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiGet<Array<{ id: string; name: string }>>("/api/growth/events"),
  });
  const events = eventsData ?? [];
  const evId = selectedEventId || events[0]?.id || "";

  const { data, refetch } = useQuery({
    queryKey: ["sponsors", evId],
    queryFn: () => fetchSponsors(evId),
    enabled: !!evId,
  });

  const sponsors = data?.sponsors || [];
  const filtered = filterStage === "all" ? sponsors : sponsors.filter((s) => s.stage === filterStage);

  useEffect(() => {
    if (evId) {
      saveResume(evId, "sponsors", "Manage sponsor pipeline", filterStage);
    }
  }, [evId, filterStage]);

  const createMutation = useMutation({
    mutationFn: createSponsor,
    onSuccess: () => { refetch(); setShowForm(false); setForm({ organisationName: "", sector: "", website: "", contactName: "", contactTitle: "", email: "", linkedIn: "", deiAlignment: "", womenLeadershipRelevance: "", brandPrestigeLevel: "", estimatedPotential: "", notes: "" }); },
  });

  const scoreMutation = useMutation({
    mutationFn: scoreSponsor,
    onSuccess: () => { refetch(); toast({ title: "Score generated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSponsor,
    onSuccess: () => refetch(),
  });

  const [sendConfirm, setSendConfirm] = useState<{ id: string; name: string; email: string } | null>(null);
  const sendMutation = useMutation({
    mutationFn: sendSponsorEmail,
    onSuccess: (data) => {
      refetch();
      toast({ title: "Email sent", description: `Sent to ${data.recipient}` });
      setSendConfirm(null);
    },
    onError: (err: any) => {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
      setSendConfirm(null);
    },
  });

  const advanceStage = (id: string, current: string) => {
    const idx = STAGES.indexOf(current);
    if (idx < STAGES.length - 1 && STAGES[idx + 1] !== "declined") {
      updateSponsor(id, { stage: STAGES[idx + 1] }).then(() => refetch());
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-ink min-h-[140px] flex items-end">
        <img src={`${import.meta.env.BASE_URL}assets/hero-dashboard.png`} alt="Sponsors" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="relative z-10 p-5 w-full">
          <h1 className="text-[28px] font-bold tracking-tight text-ivory font-heading">Sponsors</h1>
          <p className="text-[14px] text-ivory/70 mt-1">Sponsor pipeline — 11 stages from discovery to confirmed.</p>
        </div>
      </div>

      {events.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Event:</span>
          <select
            value={evId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="text-sm bg-card text-card-foreground border border-border rounded-lg px-3 py-2"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setFilterStage("all")} className={`px-3 py-1.5 rounded-md text-sm ${filterStage === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>All</button>
        {STAGES.map((s) => (
          <button key={s} onClick={() => setFilterStage(s)} className={`px-3 py-1.5 rounded-md text-sm capitalize ${filterStage === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
            {STAGE_LABELS[s]}
          </button>
        ))}
      </div>

      <Button onClick={() => setShowForm(!showForm)} className="gap-2">
        <Plus className="w-4 h-4" /> Add Sponsor
      </Button>

      {showForm && evId && (
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Organisation name" value={form.organisationName} onChange={(e) => setForm({ ...form, organisationName: e.target.value })} />
              <Input placeholder="Sector" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
              <Input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              <Input placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              <Input placeholder="Contact title" value={form.contactTitle} onChange={(e) => setForm({ ...form, contactTitle: e.target.value })} />
              <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="LinkedIn" value={form.linkedIn} onChange={(e) => setForm({ ...form, linkedIn: e.target.value })} />
              <Input placeholder="DEI / CSR alignment" value={form.deiAlignment} onChange={(e) => setForm({ ...form, deiAlignment: e.target.value })} />
              <Input placeholder="Women leadership relevance" value={form.womenLeadershipRelevance} onChange={(e) => setForm({ ...form, womenLeadershipRelevance: e.target.value })} />
              <Input placeholder="Brand prestige level" value={form.brandPrestigeLevel} onChange={(e) => setForm({ ...form, brandPrestigeLevel: e.target.value })} />
              <Input placeholder="Estimated potential" value={form.estimatedPotential} onChange={(e) => setForm({ ...form, estimatedPotential: e.target.value })} />
              <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button onClick={() => createMutation.mutate({ ...form, eventId: evId })} disabled={!form.organisationName}>
              Save Sponsor
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((s: any) => (
          <Card key={s.id} className="border-border/60 hover:border-gold/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{s.organisationName}</h3>
                    <Badge variant="outline" className="capitalize">{STAGE_LABELS[s.stage] || s.stage}</Badge>
                    {s.fitScore > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gold">
                        <Star className="w-3 h-3 fill-gold" /> {s.fitScore}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{s.sector} {s.website && ` · ${s.website}`}</p>
                  <p className="text-sm text-muted-foreground">{s.contactName} {s.contactTitle && ` — ${s.contactTitle}`} {s.email}</p>
                  {s.deiAlignment && <p className="text-xs text-muted-foreground mt-1">DEI: {s.deiAlignment}</p>}
                  {s.estimatedPotential && <p className="text-xs text-muted-foreground">Potential: {s.estimatedPotential}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => scoreMutation.mutate(s.id)} disabled={scoreMutation.isPending}>
                    {scoreMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />} Score
                  </Button>
                  {s.stage === "approved_to_contact" && s.email && (
                    <Button size="sm" variant="default" onClick={() => setSendConfirm({ id: s.id, name: s.organisationName, email: s.email })} disabled={sendMutation.isPending}>
                      {sendMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3 mr-1" />} Send
                    </Button>
                  )}
                  {s.stage !== "confirmed" && s.stage !== "declined" && (
                    <Button size="sm" variant="ghost" onClick={() => advanceStage(s.id, s.stage)} className="gap-1">
                      Advance <ChevronRight className="w-3 h-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-ivory/70">
            <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No sponsors yet. Add your first sponsor above.</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!sendConfirm} onOpenChange={() => setSendConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send a partnership email to <strong>{sendConfirm?.name}</strong> at {sendConfirm?.email}. This is a real person — this action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSendConfirm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sendConfirm) {
                  sendMutation.mutate(sendConfirm.id);
                }
              }}
            >
              Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
