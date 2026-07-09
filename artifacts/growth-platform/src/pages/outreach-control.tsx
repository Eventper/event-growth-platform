import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, ShieldCheck, Upload, Send, Loader2 } from "lucide-react";

const CATEGORIES = ["guest", "sponsor", "media", "hotel", "civic", "introducer", "do_not_contact"];
const STATUSES = ["new", "research_needed", "verified", "approved_for_outreach", "in_sequence", "replied", "interested", "declined", "follow_up_needed", "send_information", "needs_call", "do_not_contact"];
const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface EventRow { id: string; name: string }
interface Prospect {
  id: string; name: string; email: string | null; company: string | null; title: string | null;
  category: string | null; status: string;
  emailVerified: boolean | null; contactRouteVerified: boolean | null;
  contactSource: string | null; verificationNotes: string | null; approvedBy: string | null;
  whyThem: string | null; specificAsk: string | null; whatTheyReceive: string | null;
}
interface Sender { id: string; name: string; email: string; isDefault: boolean }

const fetchEvents = () => apiGet<EventRow[]>("/api/growth/events");
const fetchSenders = () => apiGet<{ senders: Sender[] }>("/api/growth/outreach/senders");

export default function OutreachControl() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: events } = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const { data: sendersData } = useQuery({ queryKey: ["senders"], queryFn: fetchSenders });
  const [eventId, setEventId] = useState<string>("");
  const evId = eventId || events?.[0]?.id || "";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sender, setSender] = useState<string>("lynda");
  const [importMsg, setImportMsg] = useState<string>("");

  const { data: prospects } = useQuery({
    queryKey: ["control-prospects", evId],
    queryFn: () => apiGet<Prospect[]>(`/api/growth/events/${evId}/prospects?type=audience`),
    enabled: !!evId,
  });

  const selected = prospects?.find((p) => p.id === selectedId) ?? null;

  const [preview, setPreview] = useState<any>(null);
  const genPreview = useMutation({
    mutationFn: () => apiPost<any>("/api/growth/outreach/preview", { prospectId: selectedId, eventId: evId }),
    onSuccess: (r) => setPreview(r),
    onError: (e: any) => setPreview({ ok: false, generated: false, status: "Error", reason: e?.message || "Preview failed" }),
  });

  const save = useMutation({
    mutationFn: (patch: Partial<Prospect>) => apiPatch(`/api/growth/prospects/${selectedId}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["control-prospects", evId] }),
  });

  const importCsv = useMutation({
    mutationFn: (rows: any[]) => apiPost<{ imported: number; skipped: number; message: string }>("/api/growth/prospects/import", { eventId: evId, rows, category: "guest" }),
    onSuccess: (r) => { setImportMsg(r.message); qc.invalidateQueries({ queryKey: ["control-prospects", evId] }); },
  });

  const importSequences = useMutation({
    mutationFn: (sequences: any[]) => apiPost<{ imported: number; message: string }>("/api/growth/outreach/import-sequences", { eventId: evId, sequences }),
    onSuccess: (r) => { setImportMsg(r.message); qc.invalidateQueries({ queryKey: ["control-prospects", evId] }); },
    onError: (e: any) => setImportMsg(e?.message || "Sequence import failed"),
  });

  function onSeqFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const seqs = Array.isArray(parsed) ? parsed : parsed.sequences;
        if (!Array.isArray(seqs)) { setImportMsg("JSON must be an array of sequences (or { sequences: [...] })."); return; }
        importSequences.mutate(seqs);
      } catch {
        setImportMsg("Could not parse JSON file.");
      }
    };
    reader.readAsText(file);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { setImportMsg("CSV needs a header row and at least one record."); return; }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const rows = lines.slice(1).map((line) => {
        const cells = line.split(",");
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = (cells[i] ?? "").trim(); });
        return row;
      });
      importCsv.mutate(rows);
    };
    reader.readAsText(file);
  }

  // The hard gate — mirrors the backend rule exactly.
  const gate = selected ? [
    { label: "Email Verified", ok: !!selected.emailVerified },
    { label: "Contact Route Verified", ok: !!selected.contactRouteVerified },
    { label: "Approved by Lynda", ok: !!selected.approvedBy },
    { label: "Status = Approved for Outreach", ok: selected.status === "approved_for_outreach" },
  ] : [];
  const gateOpen = gate.length > 0 && gate.every((g) => g.ok);

  return (
    <>
      <PageHeader eyebrow="Communications · Outreach Control"
        title="Verify, approve & send"
        intro="The control layer for invitation-led outreach. Nothing sends until the contact is verified and Lynda approves — enforced in the backend." />

      {/* Import + sender row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select value={evId} onChange={(e) => { setEventId(e.target.value); setSelectedId(null); }}
          className="text-[13px] bg-card text-card-foreground border border-border rounded-lg px-3 py-2">
          {events?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <label className="text-[13px] font-medium inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card text-card-foreground border border-border cursor-pointer hover:shadow-soft">
          <Upload className="w-4 h-4 text-burgundy" /> Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={onFile} />
        </label>
        <label className="text-[13px] font-medium inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card text-card-foreground border border-border cursor-pointer hover:shadow-soft">
          <Upload className="w-4 h-4 text-champagne" /> Import Sequences (JSON)
          <input type="file" accept=".json,application/json" className="hidden" onChange={onSeqFile} />
        </label>
        {importCsv.isPending && <Loader2 className="w-4 h-4 animate-spin text-ivory/70" />}
        {importMsg && <span className="text-[12px] text-ivory/70">{importMsg}</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Prospect list */}
        <Card>
          <CardContent className="p-0 divide-y divide-border max-h-[600px] overflow-y-auto">
            {(prospects ?? []).length === 0 && <p className="text-[13px] text-muted-foreground p-5">No prospects. Import a CSV or run Discovery.</p>}
            {(prospects ?? []).map((p) => (
              <button key={p.id} onClick={() => { setSelectedId(p.id); setPreview(null); }}
                className={"w-full text-left px-4 py-3 transition-colors " + (selectedId === p.id ? "bg-surface" : "hover:bg-surface/60")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-foreground truncate">{p.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">{label(p.category || "—")}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-muted-foreground truncate">{p.company || p.email || "—"}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-foreground">{label(p.status)}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Verification panel */}
        {selected ? (
          <Card>
            <CardContent className="p-6 space-y-5">
              <div>
                <h2 className="font-heading text-[18px] text-foreground">{selected.name}</h2>
                <p className="text-[12px] text-muted-foreground">{selected.title} {selected.company && `· ${selected.company}`} {selected.email && `· ${selected.email}`}</p>
              </div>

              {/* Category + status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Category</p>
                  <select value={selected.category || ""} onChange={(e) => save.mutate({ category: e.target.value })}
                    className="w-full text-[13px] bg-surface border border-border rounded-lg px-2.5 py-2 text-foreground">
                    <option value="">—</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Status</p>
                  <select value={selected.status} onChange={(e) => save.mutate({ status: e.target.value })}
                    className="w-full text-[13px] bg-surface border border-border rounded-lg px-2.5 py-2 text-foreground">
                    {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                  </select>
                </div>
              </div>

              {/* Verification checklist */}
              <div className="rounded-xl border border-border p-4 space-y-3">
                <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-burgundy" /> Verification</p>
                <label className="flex items-center gap-2 text-[13px] text-foreground">
                  <input type="checkbox" checked={!!selected.emailVerified} onChange={(e) => save.mutate({ emailVerified: e.target.checked })} /> Email verified
                </label>
                <label className="flex items-center gap-2 text-[13px] text-foreground">
                  <input type="checkbox" checked={!!selected.contactRouteVerified} onChange={(e) => save.mutate({ contactRouteVerified: e.target.checked })} /> Contact route verified
                </label>
                <input defaultValue={selected.contactSource || ""} placeholder="Source of contact" onBlur={(e) => save.mutate({ contactSource: e.target.value })}
                  className="w-full text-[13px] bg-surface border border-border rounded-lg px-2.5 py-2 text-foreground placeholder:text-muted-foreground" />
                <input defaultValue={selected.approvedBy || ""} placeholder="Approved by (e.g. Lynda)" onBlur={(e) => save.mutate({ approvedBy: e.target.value })}
                  className="w-full text-[13px] bg-surface border border-border rounded-lg px-2.5 py-2 text-foreground placeholder:text-muted-foreground" />
                <textarea defaultValue={selected.verificationNotes || ""} placeholder="Verification notes" onBlur={(e) => save.mutate({ verificationNotes: e.target.value })}
                  className="w-full text-[13px] bg-surface border border-border rounded-lg px-2.5 py-2 text-foreground placeholder:text-muted-foreground" rows={2} />
              </div>

              {/* Gate status */}
              <div className={"rounded-xl p-4 " + (gateOpen ? "bg-success/10" : "bg-surface")}>
                <p className="text-[12px] font-semibold text-foreground mb-2">Send gate {gateOpen ? "— open" : "— blocked"}</p>
                <ul className="space-y-1.5">
                  {gate.map((g) => (
                    <li key={g.label} className="flex items-center gap-2 text-[13px]">
                      {g.ok ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                      <span className={g.ok ? "text-foreground" : "text-muted-foreground"}>{g.label}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 mt-3">
                  <select value={sender} onChange={(e) => setSender(e.target.value)}
                    className="text-[13px] bg-card border border-border rounded-lg px-2.5 py-2 text-foreground">
                    {(sendersData?.senders ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} — {s.email}</option>)}
                  </select>
                  <button disabled={!gateOpen} onClick={() => setLocation("/outreach")}
                    title={gateOpen ? "Open the Outreach queue to generate & send" : "Resolve the gate items above first"}
                    className={"inline-flex items-center gap-1.5 text-[13px] font-medium rounded-full px-4 py-2 transition-colors " +
                      (gateOpen ? "text-white bg-burgundy hover:bg-burgundy/90" : "text-muted-foreground bg-muted cursor-not-allowed")}>
                    <Send className="w-3.5 h-3.5" /> {gateOpen ? "Go to send" : "Gate blocked"}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">Generate & send the message from the Outreach queue once the gate is open. Default sender is Lynda.</p>
              </div>

              {/* Email AI — structured preview (Workflow 2). No send. */}
              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-foreground">Email AI — Preview</p>
                  <button onClick={() => genPreview.mutate()} disabled={genPreview.isPending}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3.5 py-1.5 bg-foreground text-background hover:opacity-90 disabled:opacity-50">
                    {genPreview.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {genPreview.isPending ? "Generating…" : "Generate Preview"}
                  </button>
                </div>
                {preview && (
                  <div className="text-[13px] space-y-2.5">
                    <span className={"inline-block text-[11px] px-2 py-0.5 rounded-full " +
                      (preview.status === "Ready for review" ? "bg-success/15 text-success"
                        : preview.status === "Needs human approval" ? "bg-champagne/20 text-foreground"
                        : preview.status === "Do not generate" ? "bg-destructive/15 text-destructive"
                        : "bg-muted text-foreground")}>{preview.status}</span>
                    {!preview.generated ? (
                      <p className="text-[12px] text-muted-foreground">{preview.reason}</p>
                    ) : (
                      <>
                        <div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Subject</p><p>{preview.preview.subject}</p></div>
                        <div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Body</p><pre className="whitespace-pre-wrap font-sans text-[13px] text-foreground">{preview.preview.body}</pre></div>
                        <div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Partner-specific ask</p><p>{preview.preview.ask}</p></div>
                        <div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Partner-specific benefits</p><pre className="whitespace-pre-wrap font-sans text-[13px] text-foreground">{preview.preview.benefits}</pre></div>
                        {preview.preview.riskFlags?.length > 0 && (
                          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">Risk flags</p>
                            <ul className="list-disc ml-4 text-[12px] text-destructive">{preview.preview.riskFlags.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></div>
                        )}
                        <p className="text-[11px] text-muted-foreground">{preview.note} Approve it in the Outreach queue to enable send.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="p-8 text-center text-[13px] text-muted-foreground">Select a prospect to verify and approve.</CardContent></Card>
        )}
      </div>
    </>
  );
}
