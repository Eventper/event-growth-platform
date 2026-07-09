import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, Check } from "lucide-react";

// Project Setup — lets a commercial user configure ANY project's outreach
// (positioning, approved/banned language, sender, CTA, cadence) with no code.
// This is what makes the Outreach Intelligence Module reusable per project.

interface EventRow { id: string; name: string; location?: string | null; outreachConfig?: any }

const linesToArr = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const arrToLines = (a: any) => (Array.isArray(a) ? a.join("\n") : "");
const numsToCsv = (a: any) => (Array.isArray(a) ? a.join(",") : "");
const csvToNums = (s: string) => s.split(",").map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n));

const fetchEvents = () => apiGet<EventRow[]>("/api/growth/events");

function Field({ label, children, hint }: { label: string; children: any; hint?: string }) {
  return (
    <label className="block mb-3">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      {hint && <span className="text-[11px] text-neutral-400 ml-2">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}
const inputCls = "w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm";

export default function ProjectSetup() {
  const qc = useQueryClient();
  const { data: events } = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const [eventId, setEventId] = useState<string>("");
  const evId = eventId || events?.[0]?.id || "";

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", evId],
    queryFn: () => apiGet<EventRow>(`/api/growth/events/${evId}`),
    enabled: !!evId,
  });

  // Local editable form mirrors the project's outreachConfig.
  const [f, setF] = useState<any>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const c = event?.outreachConfig || {};
    setF({
      projectName: c.projectName || event?.name || "",
      brand: c.brand || "",
      projectType: c.projectType || "",
      projectDate: c.projectDate || "",
      projectLocation: c.projectLocation || event?.location || "",
      projectCapacity: c.projectCapacity || "",
      positioning: c.positioning || "",
      audience: arrToLines(c.audience),
      approvedLanguage: arrToLines(c.approvedLanguage),
      bannedLanguage: arrToLines(c.bannedLanguage),
      approvedProofPoints: arrToLines(c.approvedProofPoints),
      ecosystemParagraph: c.ecosystemParagraph || "",
      ecosystemRequiresApproval: c.ecosystemRequiresApproval !== false,
      defaultCta: c.defaultCta || "",
      bannedCtaPhrases: arrToLines(c.bannedCtaPhrases),
      softOptOut: c.softOptOut || "",
      senderName: c.senderProfile?.name || "",
      senderEmail: c.senderProfile?.email || "",
      senderPhone: c.senderProfile?.phone || "",
      signature: c.signature || "",
      websiteUrl: c.websiteUrl || "",
      cadence: numsToCsv(c.cadenceBusinessDays?.default) || "0,2,5",
      capPartner: c.dailyCaps?.partner ?? 5,
      capSponsor: c.dailyCaps?.sponsor ?? 5,
      capMedia: c.dailyCaps?.media ?? 5,
    });
    setSaved(false);
  }, [event?.id]);

  const set = (k: string, v: any) => { setF((p: any) => ({ ...p, [k]: v })); setSaved(false); };

  const save = useMutation({
    mutationFn: () => {
      const outreachConfig = {
        ...(event?.outreachConfig || {}),
        projectName: f.projectName, brand: f.brand, projectType: f.projectType,
        projectDate: f.projectDate, projectLocation: f.projectLocation, projectCapacity: f.projectCapacity,
        positioning: f.positioning,
        audience: linesToArr(f.audience),
        approvedLanguage: linesToArr(f.approvedLanguage),
        bannedLanguage: linesToArr(f.bannedLanguage),
        approvedProofPoints: linesToArr(f.approvedProofPoints),
        ecosystemParagraph: f.ecosystemParagraph,
        ecosystemRequiresApproval: !!f.ecosystemRequiresApproval,
        defaultCta: f.defaultCta,
        bannedCtaPhrases: linesToArr(f.bannedCtaPhrases),
        softOptOut: f.softOptOut,
        senderProfile: { id: "lynda", name: f.senderName, email: f.senderEmail, phone: f.senderPhone },
        signature: f.signature,
        websiteUrl: f.websiteUrl,
        cadenceBusinessDays: { ...(event?.outreachConfig?.cadenceBusinessDays || {}), default: csvToNums(f.cadence) },
        dailyCaps: { ...(event?.outreachConfig?.dailyCaps || {}), partner: Number(f.capPartner), sponsor: Number(f.capSponsor), media: Number(f.capMedia) },
        noMarketingFooter: true,
      };
      return apiPatch(`/api/growth/events/${evId}`, { outreachConfig });
    },
    onSuccess: () => { setSaved(true); qc.invalidateQueries({ queryKey: ["event", evId] }); },
    onError: (e: any) => window.alert(e?.message || "Save failed"),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Project Setup" intro="Configure a project's approved outreach — positioning, language, sender and cadence. The Outreach Intelligence Module uses this; no code changes per project." />

      <div className="mb-4 flex items-center gap-3">
        <select value={evId} onChange={(e) => setEventId(e.target.value)} className="rounded border border-neutral-300 px-2 py-1 text-sm">
          {events?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button disabled={save.isPending || isLoading} onClick={() => save.mutate()} className="ml-auto inline-flex items-center gap-1.5 rounded bg-neutral-900 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved" : "Save project"}
        </button>
      </div>

      {isLoading ? <div className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div> : (
        <div className="space-y-4">
          <Card><CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Project details</h3>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Project name"><input className={inputCls} value={f.projectName || ""} onChange={(e) => set("projectName", e.target.value)} /></Field>
              <Field label="Brand / account"><input className={inputCls} value={f.brand || ""} onChange={(e) => set("brand", e.target.value)} /></Field>
              <Field label="Type"><input className={inputCls} value={f.projectType || ""} onChange={(e) => set("projectType", e.target.value)} /></Field>
              <Field label="Date"><input className={inputCls} value={f.projectDate || ""} onChange={(e) => set("projectDate", e.target.value)} /></Field>
              <Field label="Location"><input className={inputCls} value={f.projectLocation || ""} onChange={(e) => set("projectLocation", e.target.value)} /></Field>
              <Field label="Capacity"><input className={inputCls} value={f.projectCapacity || ""} onChange={(e) => set("projectCapacity", e.target.value)} /></Field>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Positioning & audience</h3>
            <Field label="Positioning"><textarea rows={3} className={inputCls} value={f.positioning || ""} onChange={(e) => set("positioning", e.target.value)} /></Field>
            <Field label="Target audience" hint="one per line"><textarea rows={3} className={inputCls} value={f.audience || ""} onChange={(e) => set("audience", e.target.value)} /></Field>
            <Field label="Approved proof points" hint="one per line"><textarea rows={3} className={inputCls} value={f.approvedProofPoints || ""} onChange={(e) => set("approvedProofPoints", e.target.value)} /></Field>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Language rules</h3>
            <Field label="Approved language" hint="one per line"><textarea rows={4} className={inputCls} value={f.approvedLanguage || ""} onChange={(e) => set("approvedLanguage", e.target.value)} /></Field>
            <Field label="Banned language" hint="one per line — the Email AI must never use these"><textarea rows={4} className={inputCls} value={f.bannedLanguage || ""} onChange={(e) => set("bannedLanguage", e.target.value)} /></Field>
            <Field label="Ecosystem paragraph"><textarea rows={2} className={inputCls} value={f.ecosystemParagraph || ""} onChange={(e) => set("ecosystemParagraph", e.target.value)} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.ecosystemRequiresApproval} onChange={(e) => set("ecosystemRequiresApproval", e.target.checked)} />Ecosystem paragraph requires per-prospect approval before use</label>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">CTA & opt-out</h3>
            <Field label="Default CTA" hint="reply-based — never ask for a call as the main CTA"><input className={inputCls} value={f.defaultCta || ""} onChange={(e) => set("defaultCta", e.target.value)} /></Field>
            <Field label="Banned CTA phrases" hint="one per line"><textarea rows={2} className={inputCls} value={f.bannedCtaPhrases || ""} onChange={(e) => set("bannedCtaPhrases", e.target.value)} /></Field>
            <Field label="Soft opt-out line"><input className={inputCls} value={f.softOptOut || ""} onChange={(e) => set("softOptOut", e.target.value)} /></Field>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Sender</h3>
            <div className="grid grid-cols-3 gap-x-4">
              <Field label="Name"><input className={inputCls} value={f.senderName || ""} onChange={(e) => set("senderName", e.target.value)} /></Field>
              <Field label="Email"><input className={inputCls} value={f.senderEmail || ""} onChange={(e) => set("senderEmail", e.target.value)} /></Field>
              <Field label="Phone"><input className={inputCls} value={f.senderPhone || ""} onChange={(e) => set("senderPhone", e.target.value)} /></Field>
            </div>
            <Field label="Signature"><textarea rows={5} className={inputCls} value={f.signature || ""} onChange={(e) => set("signature", e.target.value)} /></Field>
            <Field label="Website URL"><input className={inputCls} value={f.websiteUrl || ""} onChange={(e) => set("websiteUrl", e.target.value)} /></Field>
            <p className="text-[11px] text-neutral-400">No marketing-style unsubscribe footer is ever added — only the soft opt-out above, where selected.</p>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Cadence & daily caps</h3>
            <div className="grid grid-cols-4 gap-x-4">
              <Field label="Follow-up cadence" hint="business days, e.g. 0,2,5"><input className={inputCls} value={f.cadence || ""} onChange={(e) => set("cadence", e.target.value)} /></Field>
              <Field label="Cap: partner/day"><input type="number" className={inputCls} value={f.capPartner ?? ""} onChange={(e) => set("capPartner", e.target.value)} /></Field>
              <Field label="Cap: sponsor/day"><input type="number" className={inputCls} value={f.capSponsor ?? ""} onChange={(e) => set("capSponsor", e.target.value)} /></Field>
              <Field label="Cap: media/day"><input type="number" className={inputCls} value={f.capMedia ?? ""} onChange={(e) => set("capMedia", e.target.value)} /></Field>
            </div>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}
