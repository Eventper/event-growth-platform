import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Eye, Loader2 } from "lucide-react";

const CATEGORIES = ["guest_invite", "guest_followup", "sponsor_pitch", "partner_followup", "media_pitch", "media_followup", "hotel_pitch", "civic", "admin_confirmation"];
const MERGE_FIELDS = ["first_name", "company", "title", "personal_reason", "role_angle", "sector_angle", "partnership_type", "specific_ask", "what_they_receive", "contact_route"];
const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface Template { id: string; name: string; category: string; subject: string | null; body: string; includePhone: boolean | null; senderId: string | null; sequenceStep: number | null }
interface EventRow { id: string }
interface Prospect { id: string; name: string }

export default function TemplateBuilder() {
  const qc = useQueryClient();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Template>>({});
  const [previewProspect, setPreviewProspect] = useState<string>("");
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);

  const { data } = useQuery({ queryKey: ["templates"], queryFn: () => apiGet<{ templates: Template[] }>("/api/growth/templates") });
  const templates = data?.templates ?? [];
  const { data: events } = useQuery({ queryKey: ["events"], queryFn: () => apiGet<EventRow[]>("/api/growth/events") });
  const evId = events?.[0]?.id;
  const { data: prospects } = useQuery({
    queryKey: ["tpl-prospects", evId],
    queryFn: () => apiGet<Prospect[]>(`/api/growth/events/${evId}/prospects?type=audience`),
    enabled: !!evId,
  });

  const selected = templates.find((t) => t.id === selectedId) ?? null;
  const current = { ...(selected ?? { name: "", category: "guest_invite", subject: "", body: "", includePhone: false, senderId: "lynda" }), ...draft };

  const create = useMutation({
    mutationFn: () => apiPost<{ template: Template }>("/api/growth/templates", { name: "New template", category: "guest_invite" }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["templates"] }); setSelectedId(r.template.id); setDraft({}); },
  });
  const save = useMutation({
    mutationFn: () => apiPatch(`/api/growth/templates/${selectedId}`, current),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates"] }); setDraft({}); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/growth/templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates"] }); setSelectedId(null); },
  });
  const runPreview = useMutation({
    mutationFn: () => apiGet<{ subject: string; body: string }>(`/api/growth/templates/${selectedId}/preview?prospectId=${previewProspect}`),
    onSuccess: (r) => setPreview({ subject: r.subject, body: r.body }),
  });

  function insertField(f: string) {
    const token = `{{${f}}}`;
    const ta = bodyRef.current;
    const body = current.body || "";
    if (ta && typeof ta.selectionStart === "number") {
      const next = body.slice(0, ta.selectionStart) + token + body.slice(ta.selectionEnd);
      setDraft({ ...draft, body: next });
    } else {
      setDraft({ ...draft, body: body + token });
    }
  }

  return (
    <>
      <PageHeader eyebrow="Communications · Template Builder" title="Email templates"
        intro="Reusable templates with merge fields. The same controlled gate applies — templates draft messages, they don't send."
        actions={
          <button onClick={() => create.mutate()} className="text-[13px] font-medium text-white bg-burgundy hover:bg-burgundy/90 rounded-full px-4 py-2 inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New template
          </button>
        } />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* List */}
        <Card>
          <CardContent className="p-0 divide-y divide-border max-h-[600px] overflow-y-auto">
            {templates.length === 0 && <p className="text-[13px] text-muted-foreground p-5">No templates yet.</p>}
            {templates.map((t) => (
              <button key={t.id} onClick={() => { setSelectedId(t.id); setDraft({}); setPreview(null); }}
                className={"w-full text-left px-4 py-3 transition-colors " + (selectedId === t.id ? "bg-surface" : "hover:bg-surface/60")}>
                <p className="text-[13px] font-medium text-foreground truncate">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">{label(t.category)}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Editor */}
        {selected ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input value={current.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Template name"
                    className="text-[13px] bg-surface border border-border rounded-lg px-3 py-2 text-foreground" />
                  <select value={current.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    className="text-[13px] bg-surface border border-border rounded-lg px-3 py-2 text-foreground">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
                  </select>
                </div>
                <input value={current.subject || ""} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Subject line"
                  className="w-full text-[13px] bg-surface border border-border rounded-lg px-3 py-2 text-foreground" />

                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {MERGE_FIELDS.map((f) => (
                      <button key={f} onClick={() => insertField(f)}
                        className="text-[11px] px-2 py-1 rounded-full bg-muted text-foreground border border-border hover:bg-surface-hover">{`{{${f}}}`}</button>
                    ))}
                  </div>
                  <textarea ref={bodyRef} value={current.body || ""} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={10} placeholder="Email body — click a field above to insert a merge token"
                    className="w-full text-[13px] bg-surface border border-border rounded-lg px-3 py-2 text-foreground font-mono leading-relaxed" />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <select value={current.senderId || "lynda"} onChange={(e) => setDraft({ ...draft, senderId: e.target.value })}
                    className="text-[13px] bg-surface border border-border rounded-lg px-3 py-2 text-foreground">
                    <option value="lynda">Lynda Johnson</option>
                    <option value="admin">Event Perfekt Admin</option>
                  </select>
                  <label className="flex items-center gap-2 text-[13px] text-foreground">
                    <input type="checkbox" checked={!!current.includePhone} onChange={(e) => setDraft({ ...draft, includePhone: e.target.checked })} /> Include phone in signature
                  </label>
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => remove.mutate(selected.id)} className="text-[13px] text-danger inline-flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Delete</button>
                    <button onClick={() => save.mutate()} disabled={save.isPending} className="text-[13px] font-medium text-white bg-burgundy hover:bg-burgundy/90 rounded-full px-4 py-2">
                      {save.isPending ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-burgundy" />
                  <p className="text-[13px] font-bold text-foreground">Live preview</p>
                  <select value={previewProspect} onChange={(e) => setPreviewProspect(e.target.value)}
                    className="text-[12px] bg-surface border border-border rounded-lg px-2 py-1 text-foreground ml-2">
                    <option value="">Pick a prospect…</option>
                    {(prospects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={() => runPreview.mutate()} disabled={!previewProspect || runPreview.isPending}
                    className="text-[12px] font-medium text-burgundy inline-flex items-center gap-1">
                    {runPreview.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Render"}
                  </button>
                </div>
                {preview ? (
                  <div className="rounded-xl bg-surface p-4">
                    <p className="text-[13px] font-bold text-foreground mb-2">{preview.subject}</p>
                    <pre className="text-[13px] text-foreground whitespace-pre-wrap font-sans leading-relaxed">{preview.body}</pre>
                  </div>
                ) : (
                  <p className="text-[12px] text-muted-foreground">Pick a prospect and render to preview with real merge values + signature.</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center text-[13px] text-muted-foreground">Select or create a template.</CardContent></Card>
        )}
      </div>
    </>
  );
}
