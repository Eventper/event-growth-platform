import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useEventContext } from "@/contexts/EventContext";
import { useToast } from "@/hooks/use-toast";
import { fetchReferrals, createReferral, updateReferral, saveResume, sendReferralEmail } from "@/lib/api";
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
import { Users, Plus, Mail, Loader2 } from "lucide-react";

const TYPES = [
  { value: "nominate_guest", label: "Nominate another woman" },
  { value: "recommend_sponsor", label: "Recommend a sponsor" },
  { value: "submit_story", label: "Submit a story" },
  { value: "share_event", label: "Share event link" },
  { value: "request_corporate_pack", label: "Request corporate pack" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", converted: "Converted", declined: "Declined", contacted: "Contacted",
};

export default function Referrals() {
  const { selectedEventId } = useEventContext();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ referrerName: "", referrerEmail: "", referralType: "nominate_guest", source: "" });
  const [filterType, setFilterType] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { data, refetch } = useQuery({
    queryKey: ["referrals", selectedEvent?.id],
    queryFn: () => fetchReferrals(selectedEvent?.id),
    enabled: !!selectedEvent,
  });

  const items = data?.referrals || [];
  const filtered = filterType === "all" ? items : items.filter((i) => i.referralType === filterType);

  useEffect(() => {
    if (selectedEvent) {
      saveResume(selectedEvent.id, "referrals", "Manage referrals", filterType);
    }
  }, [selectedEvent, filterType]);

  const createMutation = useMutation({
    mutationFn: createReferral,
    onSuccess: () => { refetch(); setShowForm(false); setForm({ referrerName: "", referrerEmail: "", referralType: "nominate_guest", source: "" }); },
  });

  const updateStatus = (id: string, status: string) => {
    updateReferral(id, { referralStatus: status }).then(() => refetch());
  };

  const [sendConfirm, setSendConfirm] = useState<{ id: string; name: string; email: string } | null>(null);
  const sendMutation = useMutation({
    mutationFn: sendReferralEmail,
    onSuccess: (data) => {
      refetch();
      toast({ title: "Thank-you email sent", description: `Sent to ${data.recipient}` });
      setSendConfirm(null);
    },
    onError: (err: any) => {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
      setSendConfirm(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-ink min-h-[140px] flex items-end">
        <img src={`${import.meta.env.BASE_URL}assets/hero-dashboard.png`} alt="Referrals" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="relative z-10 p-5 w-full">
          <h1 className="text-[28px] font-bold tracking-tight text-ivory font-heading">Referrals</h1>
          <p className="text-[14px] text-ivory/70 mt-1">Track who referred whom and what came of it.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setFilterType("all")} className={`px-3 py-1.5 rounded-md text-sm ${filterType === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>All</button>
        {TYPES.map((t) => (
          <button key={t.value} onClick={() => setFilterType(t.value)} className={`px-3 py-1.5 rounded-md text-sm ${filterType === t.value ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <Button onClick={() => setShowForm(!showForm)} className="gap-2">
        <Plus className="w-4 h-4" /> Add Referral
      </Button>

      {showForm && selectedEvent && (
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Referrer name" value={form.referrerName} onChange={(e) => setForm({ ...form, referrerName: e.target.value })} />
              <Input placeholder="Referrer email" value={form.referrerEmail} onChange={(e) => setForm({ ...form, referrerEmail: e.target.value })} />
              <select value={form.referralType} onChange={(e) => setForm({ ...form, referralType: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <Input placeholder="Source (e.g. event page, email)" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </div>
            <Button onClick={() => createMutation.mutate({ ...form, eventId: selectedEvent.id })} disabled={!form.referrerName}>
              Save Referral
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((item: any) => (
          <Card key={item.id} className="border-border/60 hover:border-gold/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{item.referrerName}</h3>
                    <Badge variant={item.referralStatus === "converted" ? "default" : "outline"}>{STATUS_LABELS[item.referralStatus] || item.referralStatus}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.referrerEmail}</p>
                  <p className="text-sm text-muted-foreground">{TYPES.find((t) => t.value === item.referralType)?.label}</p>
                  {item.source && <p className="text-xs text-muted-foreground">Source: {item.source}</p>}
                </div>
                <div className="flex gap-2">
                  {item.referralStatus === "pending" && item.referrerEmail && (
                    <Button size="sm" variant="default" onClick={() => setSendConfirm({ id: item.id, name: item.referrerName, email: item.referrerEmail })} disabled={sendMutation.isPending}>
                      {sendMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3 mr-1" />} Send
                    </Button>
                  )}
                  {item.referralStatus === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "contacted")}>Contacted</Button>
                  )}
                  {item.referralStatus !== "converted" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "converted")}>Converted</Button>
                  )}
                  {item.referralStatus !== "declined" && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatus(item.id, "declined")}>Declined</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-ivory/70">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No referrals yet. Add your first referral above.</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!sendConfirm} onOpenChange={() => setSendConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send a thank-you email to <strong>{sendConfirm?.name}</strong> at {sendConfirm?.email}. This is a real person — this action cannot be undone.
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
