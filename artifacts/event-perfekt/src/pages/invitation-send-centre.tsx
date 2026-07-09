import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Mail, MessageCircle, Eye, MousePointerClick, Check, X, Clock, RefreshCw, Sparkles, Bell, Loader2 } from "lucide-react";
import PlannerLayout from "@/components/PlannerLayout";

const CHANNELS = [
  { value: "email", label: "Email only", icon: Mail },
  { value: "whatsapp", label: "WhatsApp only", icon: MessageCircle },
  { value: "both", label: "Email + WhatsApp", icon: Send },
];

const SEGMENTS = [
  { value: "new", label: "New guests only (not yet sent)" },
  { value: "pending", label: "All pending RSVPs" },
  { value: "all", label: "Everyone in the guest list" },
];

const ENVELOPE_COLOURS = [
  { value: "#330311", label: "EP Burgundy" },
  { value: "#1A0A0E", label: "Midnight" },
  { value: "#2C1810", label: "Mahogany" },
  { value: "#0D2818", label: "Forest" },
  { value: "#0A1F3D", label: "Navy" },
  { value: "#3D2914", label: "Cognac" },
  { value: "#FFFFFF", label: "Ivory" },
  { value: "#F4ECE0", label: "Cream" },
];

const LINER_PATTERNS = [
  { value: "floral", label: "Floral" },
  { value: "geometric", label: "Geometric" },
  { value: "marble", label: "Marble" },
  { value: "damask", label: "Damask" },
  { value: "plain", label: "Plain" },
];

function StatusPill({ guest }: { guest: any }) {
  if (guest.rsvp_status === "accepted") return <Badge className="bg-green-600 text-white">Accepted</Badge>;
  if (guest.rsvp_status === "declined") return <Badge className="bg-red-500 text-white">Declined</Badge>;
  if (guest.invitation_viewed_at) return <Badge className="bg-purple-600 text-white">Viewed</Badge>;
  if (guest.email_opened_at) return <Badge className="bg-blue-500 text-white">Opened</Badge>;
  if (guest.invitation_sent) return <Badge className="bg-amber-500 text-white">Sent</Badge>;
  return <Badge variant="outline">Not sent</Badge>;
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const EVENT_ICON: Record<string, any> = {
  sent: Send, delivered: Check, opened: Eye, viewed: MousePointerClick,
  rsvp_accepted: Check, rsvp_declined: X, reminder_sent: Bell, failed: X,
};

const EVENT_COLOUR: Record<string, string> = {
  sent: "text-amber-500", delivered: "text-blue-400", opened: "text-blue-500",
  viewed: "text-purple-500", rsvp_accepted: "text-green-600", rsvp_declined: "text-red-500",
  reminder_sent: "text-yellow-600", failed: "text-red-600",
};

export default function InvitationSendCentre() {
  const { eventId } = useParams<{ eventId: string }>();
  const { toast } = useToast();

  const [channel, setChannel] = useState<string>("email");
  const [segment, setSegment] = useState<string>("new");

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/events", eventId, "invitations/stats"],
    refetchInterval: 10000,
  });

  const { data: feed = [] } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "invitations/feed"],
    refetchInterval: 10000,
  });

  const { data: guests = [] } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "guests"],
    refetchInterval: 15000,
  });

  const { data: invitations = [] } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "invitations"],
  });

  const inv = invitations[0] || {};

  const sendMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/events/${eventId}/invitations/send`, {
        channel,
        mode: segment,
        invitationId: inv?.id,
      });
    },
    onSuccess: async (res: any) => {
      const data = await res.json();
      toast({
        title: "Invitations sent",
        description: `Sent: ${data.sent} · Skipped: ${data.skipped} · Failed: ${data.failed}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "invitations/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "invitations/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
    },
    onError: (err: any) => toast({ title: "Send failed", description: err.message, variant: "destructive" }),
  });

  const settingsMutation = useMutation({
    mutationFn: async (patch: any) => apiRequest("PATCH", `/api/invitations/${inv.id}/settings`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "invitations"] });
      toast({ title: "Settings saved" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (guestId: string) => apiRequest("POST", `/api/guests/${guestId}/resend-invitation`, {}),
    onSuccess: () => {
      toast({ title: "Invitation resent" });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
    },
  });

  const eligibleCount = (() => {
    if (segment === "all") return guests.length;
    if (segment === "pending") return guests.filter((g: any) => g.rsvpStatus === "pending").length;
    return guests.filter((g: any) => !g.invitationSent).length;
  })();

  return (
    <PlannerLayout>
      <div className="min-h-screen bg-[#f7f2f4]">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-[#330311] via-[#5a0e23] to-[#8B1538] p-6 md:p-8 text-white shadow-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Invitation Hub</p>
                <h1 className="text-3xl font-bold">Invitation Send Centre</h1>
                <p className="max-w-2xl text-sm text-white/75">Bulk-send beautiful animated invitations and watch responses come in live.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => window.history.back()}>
                  Back
                </Button>
                <Button className="bg-white text-[#330311] hover:bg-white/90" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || eligibleCount === 0}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Now
                </Button>
              </div>
            </div>
          </div>

          <Card className="border-[#e8d8df] shadow-sm">
            <CardContent className="p-5 md:p-6 grid gap-4 lg:grid-cols-3">
              {[
                {
                  title: "What gets sent",
                  text: "A branded invitation email, WhatsApp message, or both. Email includes the invite link, RSVP link, and tracking pixel.",
                },
                {
                  title: "Who gets it",
                  text: "The selected guest segment: new guests, all pending RSVPs, or everyone on the guest list.",
                },
                {
                  title: "End-to-end flow",
                  text: "You press Send → server emails guests → opens are tracked → they view the invite → RSVP updates the dashboard.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-[#f0e1e6] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B1538]">{item.title}</p>
                  <p className="mt-2 text-sm text-[#5f4d56]">{item.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {[
            { label: "Total", value: stats?.total ?? 0, color: "text-gray-700" },
            { label: "Sent", value: stats?.sent ?? 0, color: "text-amber-600" },
            { label: "Opened", value: stats?.opened ?? 0, color: "text-blue-600" },
            { label: "Viewed", value: stats?.viewed ?? 0, color: "text-purple-600" },
            { label: "Accepted", value: stats?.accepted ?? 0, color: "text-green-600" },
            { label: "Declined", value: stats?.declined ?? 0, color: "text-red-500" },
            { label: "Pending", value: stats?.pending ?? 0, color: "text-gray-500" },
          ].map((s) => (
            <Card key={s.label} className="border-[#e8d8df] shadow-sm">
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Send controls */}
          <Card className="lg:col-span-2 border-[#e8d8df] shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#330311]">
                <Send className="w-5 h-5" /> Send Invitations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Channel</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                  {CHANNELS.map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.value}
                        onClick={() => setChannel(c.value)}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition ${channel === c.value ? "border-[#8B1538] bg-[#fef2f5]" : "border-gray-200 bg-white hover:border-gray-300"}`}
                      >
                        <Icon className="w-4 h-4 text-[#330311]" />
                        <span className="text-sm font-medium">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Who to send to</Label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">{eligibleCount} guest{eligibleCount === 1 ? "" : "s"} will receive this send.</p>
              </div>

              <Button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || eligibleCount === 0}
                className="w-full bg-[#8B1538] hover:bg-[#6e1029] text-white py-6 text-base"
                size="lg"
              >
                {sendMutation.isPending ? (
                  <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Sending {eligibleCount}…</>
                ) : (
                  <><Send className="w-5 h-5 mr-2" /> Send to {eligibleCount} guest{eligibleCount === 1 ? "" : "s"}</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Live activity feed */}
          <Card className="border-[#e8d8df] shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#330311]">
                <Sparkles className="w-5 h-5" /> Live Activity
                <span className="ml-auto h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {feed.length === 0 && <p className="text-sm text-gray-400 italic text-center py-8">No activity yet — send your first invitation to see responses come in live.</p>}
                {feed.map((e: any) => {
                  const Icon = EVENT_ICON[e.type] || Send;
                  return (
                    <div key={e.id} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50">
                      <Icon className={`w-4 h-4 mt-0.5 ${EVENT_COLOUR[e.type] || "text-gray-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">
                          <span className="font-medium">{e.first_name} {e.last_name}</span>
                          <span className="text-gray-500"> · {e.type.replace(/_/g, " ")}</span>
                        </p>
                        <p className="text-xs text-gray-400">{timeAgo(e.occurred_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-[#e8d8df] shadow-sm">
          <CardContent className="p-5 md:p-6">
            <p className="text-sm font-semibold text-[#330311]">What happens after Send</p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              {[
                "Guests receive the invite by email and/or WhatsApp.",
                "The email includes a tracked invite link and RSVP link.",
                "When they open or view it, the Live Activity feed updates.",
                "When they RSVP, their status changes in Guest Tracking.",
              ].map((step, index) => (
                <div key={step} className="rounded-2xl bg-[#fbf7f8] p-4">
                  <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#8B1538] text-xs font-bold text-white">{index + 1}</div>
                  <p className="text-sm text-[#5f4d56]">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settings: envelope + flourishes + auto-reminder */}
        {inv?.id && (
          <Card className="border-[#e8d8df] shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#330311]">Invitation Style & Auto-Reminder</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Envelope colour</Label>
                    {settingsMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-2 max-w-[280px]">
                    {ENVELOPE_COLOURS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => settingsMutation.mutate({ envelopeColor: c.value })}
                        className={`h-10 rounded border-2 ${inv.envelope_color === c.value ? "border-[#8B1538] ring-2 ring-[#8B1538]/30" : "border-gray-200"}`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Liner pattern</Label>
                    {settingsMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                  </div>
                  <Select value={inv.liner_pattern || "floral"} onValueChange={(v) => settingsMutation.mutate({ linerPattern: v })}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LINER_PATTERNS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Wax seal break animation</Label>
                  <div className="flex items-center gap-2">
                    <Switch checked={!!inv.wax_seal_enabled} onCheckedChange={(v) => settingsMutation.mutate({ waxSealEnabled: v })} />
                    {settingsMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Foil shimmer on card</Label>
                  <div className="flex items-center gap-2">
                    <Switch checked={!!inv.foil_shimmer_enabled} onCheckedChange={(v) => settingsMutation.mutate({ foilShimmerEnabled: v })} />
                    {settingsMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Confetti on RSVP accept</Label>
                  <div className="flex items-center gap-2">
                    <Switch checked={!!inv.confetti_on_accept} onCheckedChange={(v) => settingsMutation.mutate({ confettiOnAccept: v })} />
                    {settingsMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Bell className="w-4 h-4" /> Automatic RSVP reminders</Label>
                  <div className="flex items-center gap-2">
                    <Switch checked={!!inv.auto_reminder_enabled} onCheckedChange={(v) => settingsMutation.mutate({ autoReminderEnabled: v })} />
                    {settingsMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Send reminder after (days from invitation)</Label>
                    {settingsMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    defaultValue={inv.auto_reminder_days_after_send || 7}
                    onBlur={(e) => settingsMutation.mutate({ autoReminderDaysAfterSend: parseInt(e.target.value, 10) })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Maximum reminders per guest</Label>
                    {settingsMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={inv.auto_reminder_max_count || 2}
                    onBlur={(e) => settingsMutation.mutate({ autoReminderMaxCount: parseInt(e.target.value, 10) })}
                    className="mt-2"
                  />
                </div>
                <p className="text-xs text-gray-500 italic">Reminders run automatically every morning at 09:00 UK. Guests who've replied are skipped.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Per-guest table */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-[#330311]">Guest Tracking</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">Guest</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Sent</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Opened</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Reminders</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((g: any) => (
                    <tr key={g.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{g.firstName} {g.lastName}</td>
                      <td className="px-4 py-3 text-gray-500">{g.email || "—"}</td>
                      <td className="px-4 py-3"><StatusPill guest={{
                        rsvp_status: g.rsvpStatus,
                        invitation_sent: g.invitationSent,
                        email_opened_at: g.emailOpenedAt,
                        invitation_viewed_at: g.invitationViewedAt,
                      }} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                        {g.invitationSentAt ? new Date(g.invitationSentAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                        {g.emailOpenedAt ? timeAgo(g.emailOpenedAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{g.reminderCount || 0}</td>
                      <td className="px-4 py-3 text-right">
                        {g.email && (
                          <Button size="sm" variant="ghost" onClick={() => resendMutation.mutate(g.id)} disabled={resendMutation.isPending}>
                            <RefreshCw className="w-3 h-3 mr-1" /> Resend
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {guests.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-gray-400 italic py-12">No guests yet. Add some on the Guest List page first.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </PlannerLayout>
  );
}
