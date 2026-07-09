import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useEventContext } from "@/contexts/EventContext";
import { useToast } from "@/hooks/use-toast";
import { fetchPr, createPr, updatePr, deletePr, scorePr, saveResume, sendPrEmail } from "@/lib/api";
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
import { MessageSquare, Plus, Trash2, Star, Loader2, ChevronRight, Mail } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const STAGES = [
  "opportunity_found", "angle_identified", "pitch_drafted", "approved_to_send",
  "sent", "journalist_responded", "interview_requested", "coverage_secured", "declined",
];

const STAGE_LABELS: Record<string, string> = {
  opportunity_found: "Opportunity Found", angle_identified: "Angle Identified", pitch_drafted: "Pitch Drafted",
  approved_to_send: "Approved to Send", sent: "Sent", journalist_responded: "Journalist Responded",
  interview_requested: "Interview Requested", coverage_secured: "Coverage Secured", declined: "Declined",
};

export default function PrPipeline() {
  const { selectedEventId } = useEventContext();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ outletName: "", journalistName: "", email: "", topic: "", angle: "", notes: "" });
  const [filterStage, setFilterStage] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { data, refetch } = useQuery({
    queryKey: ["pr", selectedEvent?.id],
    queryFn: () => fetchPr(selectedEvent?.id),
    enabled: !!selectedEvent,
  });

  const items = data?.opportunities || [];
  const filtered = filterStage === "all" ? items : items.filter((i) => i.stage === filterStage);

  useEffect(() => {
    if (selectedEvent) {
      saveResume(selectedEvent.id, "pr-pipeline", "Manage PR pipeline", filterStage);
    }
  }, [selectedEvent, filterStage]);

  const createMutation = useMutation({
    mutationFn: createPr,
    onSuccess: () => { refetch(); setShowForm(false); setForm({ outletName: "", journalistName: "", email: "", topic: "", angle: "", notes: "" }); },
  });

  const scoreMutation = useMutation({
    mutationFn: scorePr,
    onSuccess: () => { refetch(); toast({ title: "Score generated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePr,
    onSuccess: () => refetch(),
  });

  const [sendConfirm, setSendConfirm] = useState<{ id: string; outlet: string; email: string } | null>(null);
  const sendMutation = useMutation({
    mutationFn: sendPrEmail,
    onSuccess: (data) => {
      refetch();
      toast({ title: "PR pitch sent", description: `Sent to ${data.recipient}` });
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
      updatePr(id, { stage: STAGES[idx + 1] }).then(() => refetch());
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="PR Pipeline" intro="Media opportunities from discovery to coverage secured." />

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setFilterStage("all")} className={`px-3 py-1.5 rounded-full text-sm transition-colors ${filterStage === "all" ? "bg-burgundy text-white" : "bg-card text-foreground shadow-soft hover:bg-surface"}`}>All</button>
        {STAGES.map((s) => (
          <button key={s} onClick={() => setFilterStage(s)} className={`px-3 py-1.5 rounded-full text-sm transition-colors ${filterStage === s ? "bg-burgundy text-white" : "bg-card text-foreground shadow-soft hover:bg-surface"}`}>
            {STAGE_LABELS[s]}
          </button>
        ))}
      </div>

      <Button onClick={() => setShowForm(!showForm)} className="gap-2 rounded-full bg-burgundy text-white hover:bg-burgundy/90">
        <Plus className="w-4 h-4" /> Add Opportunity
      </Button>

      {showForm && selectedEvent && (
        <Card className="rounded-2xl shadow-soft border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Outlet name" value={form.outletName} onChange={(e) => setForm({ ...form, outletName: e.target.value })} />
              <Input placeholder="Journalist name" value={form.journalistName} onChange={(e) => setForm({ ...form, journalistName: e.target.value })} />
              <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
              <Input placeholder="Angle" value={form.angle} onChange={(e) => setForm({ ...form, angle: e.target.value })} />
              <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button onClick={() => createMutation.mutate({ ...form, eventId: selectedEvent.id })} disabled={!form.outletName}>
              Save Opportunity
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((item: any) => (
          <Card key={item.id} className="rounded-2xl shadow-soft border-border/60 hover:border-burgundy/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{item.outletName}</h3>
                    <Badge variant="outline">{STAGE_LABELS[item.stage] || item.stage}</Badge>
                    {item.fitScore > 0 && (
                      <span className="flex items-center gap-1 text-xs text-burgundy">
                        <Star className="w-3 h-3 fill-burgundy" /> {item.fitScore}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.journalistName} {item.email && ` · ${item.email}`}</p>
                  <p className="text-sm text-muted-foreground">{item.topic} {item.angle && ` — ${item.angle}`}</p>
                  {item.draftPitch && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                      {item.draftPitch}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => scoreMutation.mutate(item.id)} disabled={scoreMutation.isPending}>
                    {scoreMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />} Score
                  </Button>
                  {item.stage === "approved_to_send" && item.email && (
                    <Button size="sm" variant="default" onClick={() => setSendConfirm({ id: item.id, outlet: item.outletName, email: item.email })} disabled={sendMutation.isPending}>
                      {sendMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3 mr-1" />} Send
                    </Button>
                  )}
                  {item.stage !== "coverage_secured" && item.stage !== "declined" && (
                    <Button size="sm" variant="ghost" onClick={() => advanceStage(item.id, item.stage)} className="gap-1">
                      Advance <ChevronRight className="w-3 h-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-ivory/70">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No PR opportunities yet. Add your first outlet above.</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!sendConfirm} onOpenChange={() => setSendConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send a PR pitch to <strong>{sendConfirm?.outlet}</strong> at {sendConfirm?.email}. This is a real journalist — this action cannot be undone.
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
              Send Pitch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
