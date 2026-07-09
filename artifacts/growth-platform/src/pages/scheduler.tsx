import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, Send, Loader2, X, RotateCcw, OctagonX, Sparkles } from "lucide-react";

const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

interface EventRow { id: string; name: string }
interface SchedItem {
  id: string; prospectId: string; prospectName: string; recipient: string | null;
  category: string | null; sender: string; subject: string | null; sequenceStep: number;
  status: string; scheduledFor: string | null; scheduleApproved: boolean;
  idempotencyKey: string | null; cancelReason: string | null;
}
interface Stopped { prospectId: string; prospectName: string; status: string }
interface ScheduleResp {
  ok: boolean;
  counts: Record<string, number>;
  buckets: {
    scheduled: SchedItem[]; pendingApproval: SchedItem[]; dueToday: SchedItem[]; dueTomorrow: SchedItem[];
    overdue: SchedItem[]; followUpsDue: SchedItem[]; cancelled: SchedItem[]; failed: SchedItem[];
    paused: SchedItem[]; stoppedSequences: Stopped[];
  };
}

const fetchEvents = () => apiGet<EventRow[]>("/api/growth/events");

// datetime-local value (e.g. "2026-07-01T09:00") parses with new Date() server-side.
function askWhen(current?: string | null): string | null {
  const def = current ? new Date(current).toISOString().slice(0, 16) : "";
  const v = window.prompt("New date & time (YYYY-MM-DDTHH:mm), Tue–Thu 08:00–16:00:", def);
  return v && v.trim() ? v.trim() : null;
}

export default function Scheduler() {
  const qc = useQueryClient();
  const { data: events } = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const [eventId, setEventId] = useState<string>("");
  const evId = eventId || events?.[0]?.id || "";
  const [banner, setBanner] = useState<string>("");
  const [cmd, setCmd] = useState<string>("");
  const [preview, setPreview] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["schedule", evId],
    queryFn: () => apiGet<ScheduleResp>(`/api/growth/outreach/schedule?eventId=${evId}`),
    enabled: !!evId,
    refetchInterval: 30_000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["schedule", evId] });
  const ok = (m: string) => { setBanner(m); refresh(); };
  const fail = (e: any) => setBanner(e?.message || "Action failed");

  const sendNow = useMutation({ mutationFn: (id: string) => apiPost(`/api/growth/outreach/${id}/send`, {}), onSuccess: () => ok("Sent."), onError: fail });
  const cancel = useMutation({ mutationFn: (id: string) => apiPost(`/api/growth/outreach/${id}/cancel`, { reason: "Cancelled from scheduler" }), onSuccess: () => ok("Scheduled send cancelled — it will not send."), onError: fail });
  const reschedule = useMutation({ mutationFn: (p: { id: string; when: string }) => apiPost(`/api/growth/outreach/${p.id}/reschedule`, { when: p.when }), onSuccess: () => ok("Rescheduled — only the new time will send."), onError: fail });
  const stopSeq = useMutation({ mutationFn: (pid: string) => apiPost(`/api/growth/prospects/${pid}/stop-sequence`, { reason: "Stopped from scheduler" }), onSuccess: (r: any) => ok(`Sequence stopped — ${r?.cancelled ?? 0} future send(s) cancelled.`), onError: fail });
  const cancelFus = useMutation({ mutationFn: (pid: string) => apiPost(`/api/growth/prospects/${pid}/cancel-followups`, { reason: "Cancelled from scheduler" }), onSuccess: (r: any) => ok(`${r?.cancelled ?? 0} follow-up(s) cancelled. Sent email kept.`), onError: fail });
  const schedule = useMutation({ mutationFn: (p: { id: string; when: string }) => apiPost(`/api/growth/outreach/${p.id}/schedule`, { when: p.when }), onSuccess: () => ok("Scheduled."), onError: fail });

  const parseCmd = useMutation({
    mutationFn: () => apiPost<any>(`/api/growth/elizabeth/schedule-command`, { command: cmd, eventId: evId }),
    onSuccess: (r) => { if (r?.preview) { setPreview(r.preview); setBanner(""); } else { setBanner(r?.message || "Couldn't parse that."); setPreview(null); } },
    onError: fail,
  });

  const confirmPreview = () => {
    if (!preview) return;
    const match = preview.matches?.[0];
    if (preview.action === "cancel" && match) { stopSeq.mutate(match.id); }
    else if (preview.action === "stop_sequence" && match) { stopSeq.mutate(match.id); }
    else if ((preview.action === "schedule" || preview.action === "reschedule") && match && preview.when) {
      // Resolve the prospect's next sendable touch, then schedule it.
      apiGet<ScheduleResp>(`/api/growth/outreach/schedule?eventId=${evId}`).then(() => schedule.mutate({ id: match.id, when: preview.when }));
    }
    setPreview(null);
  };

  const Item = ({ it, showFollowupCancel }: { it: SchedItem; showFollowupCancel?: boolean }) => (
    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 py-2 text-sm">
      <div className="min-w-[180px] flex-1">
        <div className="font-medium">{it.prospectName} <span className="text-neutral-400">· step {it.sequenceStep}</span></div>
        <div className="text-xs text-neutral-500 truncate">{it.subject || "(no subject)"} · {it.recipient || "no email"} · {it.sender}</div>
      </div>
      <div className="text-xs tabular-nums text-neutral-600 w-[150px]">{fmt(it.scheduledFor)}</div>
      <span className={`text-[11px] px-2 py-0.5 rounded-full ${it.status === "scheduled_pending_approval" ? "bg-amber-100 text-amber-800" : it.status === "scheduled" ? "bg-emerald-100 text-emerald-800" : it.status === "cancelled" ? "bg-neutral-200 text-neutral-600" : it.status === "failed" ? "bg-red-100 text-red-700" : "bg-neutral-100 text-neutral-600"}`}>{label(it.status)}</span>
      {["scheduled", "scheduled_pending_approval"].includes(it.status) && (
        <div className="flex items-center gap-1">
          <button title="Send Now" onClick={() => sendNow.mutate(it.id)} className="inline-flex items-center gap-1 rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"><Send className="w-3 h-3" />Send Now</button>
          <button title="Reschedule" onClick={() => { const w = askWhen(it.scheduledFor); if (w) reschedule.mutate({ id: it.id, when: w }); }} className="inline-flex items-center gap-1 rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"><RotateCcw className="w-3 h-3" />Reschedule</button>
          <button title="Cancel Scheduled Send" onClick={() => cancel.mutate(it.id)} className="inline-flex items-center gap-1 rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"><X className="w-3 h-3" />Cancel Scheduled Send</button>
          <button title="Stop Sequence" onClick={() => stopSeq.mutate(it.prospectId)} className="inline-flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"><OctagonX className="w-3 h-3" />Stop Sequence</button>
          {showFollowupCancel && <button title="Cancel Future Follow-ups" onClick={() => cancelFus.mutate(it.prospectId)} className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50">Cancel Follow-ups</button>}
        </div>
      )}
    </div>
  );

  const Section = ({ title, items, followup }: { title: string; items: SchedItem[]; followup?: boolean }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs text-neutral-500">{items.length}</span>
        </div>
        {items.length === 0 ? <p className="text-xs text-neutral-400">Nothing here.</p> : items.map((it) => <Item key={it.id} it={it} showFollowupCancel={followup} />)}
      </CardContent>
    </Card>
  );

  const b = data?.buckets;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Outreach Scheduler" intro="Schedule, cancel, reschedule and stop sends. Scheduled ≠ guaranteed: every send re-checks the gate at send time." />

      <div className="mb-4 flex items-center gap-3">
        <select value={evId} onChange={(e) => setEventId(e.target.value)} className="rounded border border-neutral-300 px-2 py-1 text-sm">
          {events?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <span className="text-xs text-neutral-500">Window: Tue–Thu 09:00–11:30 (preferred) · auto-send guardrail 08:00–16:00, no weekends/bank holidays</span>
      </div>

      {banner && <div className="mb-4 rounded bg-blue-50 px-3 py-2 text-sm text-blue-800">{banner}</div>}

      {/* Elizabeth natural-language scheduling — preview then confirm. */}
      <Card className="mb-5 border-violet-200">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-800"><Sparkles className="w-4 h-4" />Ask Elizabeth to schedule</div>
          <div className="flex gap-2">
            <input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder='e.g. "Schedule the Muddy email for 9am tomorrow"' className="flex-1 rounded border border-neutral-300 px-3 py-1.5 text-sm" onKeyDown={(e) => { if (e.key === "Enter" && cmd.trim()) parseCmd.mutate(); }} />
            <button disabled={!cmd.trim() || parseCmd.isPending} onClick={() => parseCmd.mutate()} className="rounded bg-violet-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">{parseCmd.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Preview"}</button>
          </div>
          {preview && (
            <div className="mt-3 rounded border border-violet-200 bg-violet-50 p-3 text-sm">
              <div className="font-medium">Preview — nothing scheduled yet</div>
              <ul className="mt-1 text-xs text-neutral-700 space-y-0.5">
                <li>Action: <b>{label(preview.action)}</b></li>
                <li>Target: <b>{preview.target}</b> {preview.matches?.length ? `(${preview.matches.length} match)` : "(no match found)"}</li>
                <li>When: <b>{fmt(preview.when)}</b> {preview.outsideWindow && <span className="text-amber-700">⚠ outside safe window</span>}</li>
                {preview.notes && <li>Notes: {preview.notes}</li>}
              </ul>
              <div className="mt-2 flex gap-2">
                <button disabled={!preview.matches?.length} onClick={confirmPreview} className="rounded bg-violet-600 px-3 py-1 text-xs text-white disabled:opacity-50">Confirm schedule</button>
                <button onClick={() => setPreview(null)} className="rounded border border-neutral-300 px-3 py-1 text-xs">Discard</button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? <div className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div> : b && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[["Due today", b.dueToday.length], ["Due tomorrow", b.dueTomorrow.length], ["Overdue", b.overdue.length], ["Pending approval", b.pendingApproval.length], ["Follow-ups due", b.followUpsDue.length], ["Cancelled", b.cancelled.length], ["Failed", b.failed.length], ["Stopped", b.stoppedSequences.length]].map(([t, n]) => (
              <div key={t as string} className="rounded border border-neutral-200 bg-white p-3 text-center"><div className="text-xl font-semibold">{n as number}</div><div className="text-xs text-neutral-500">{t as string}</div></div>
            ))}
          </div>

          <Section title="Pending approval (Elizabeth suggested — confirm to schedule)" items={b.pendingApproval} />
          <Section title="Overdue" items={b.overdue} />
          <Section title="Due today" items={b.dueToday} followup />
          <Section title="Due tomorrow" items={b.dueTomorrow} followup />
          <Section title="Follow-ups due" items={b.followUpsDue} followup />
          <Section title="All scheduled" items={b.scheduled} followup />
          <Section title="Cancelled" items={b.cancelled} />
          <Section title="Failed" items={b.failed} />

          {b.stoppedSequences.length > 0 && (
            <Card className="mb-4"><CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">Stopped sequences</h3>
              {b.stoppedSequences.map((s) => <div key={s.prospectId} className="flex justify-between border-b border-neutral-100 py-1 text-sm"><span>{s.prospectName}</span><span className="text-xs text-neutral-500">{label(s.status)}</span></div>)}
            </CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}
