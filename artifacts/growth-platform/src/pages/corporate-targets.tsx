import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useEventContext } from "@/contexts/EventContext";
import { useToast } from "@/hooks/use-toast";
import { fetchCorporateTargets, createCorporateTarget, updateCorporateTarget, deleteCorporateTarget, saveResume } from "@/lib/api";
import { Search, Plus, Trash2, Star, Loader2, Target } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const TAGS = [
  { key: "womenLeadershipProgramme", label: "Women Leadership" },
  { key: "deiInitiative", label: "DEI" },
  { key: "wellbeingPolicy", label: "Wellbeing" },
  { key: "menopausePolicy", label: "Menopause" },
  { key: "financialServices", label: "Finance" },
  { key: "beautyWellness", label: "Beauty/Wellness" },
  { key: "luxuryHospitality", label: "Luxury" },
  { key: "automotive", label: "Automotive" },
  { key: "localRegional", label: "Local" },
];

export default function CorporateTargets() {
  const { selectedEventId } = useEventContext();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ organisationName: "", website: "", sector: "", location: "", notes: "" });
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { data, refetch } = useQuery({
    queryKey: ["corporate-targets", selectedEvent?.id],
    queryFn: () => fetchCorporateTargets(selectedEvent?.id),
    enabled: !!selectedEvent,
  });

  const items = data?.targets || [];
  const filtered = activeTag ? items.filter((i: any) => i[activeTag] === true) : items;

  useEffect(() => {
    if (selectedEvent) {
      saveResume(selectedEvent.id, "corporate-targets", "Browse corporate targets", activeTag);
    }
  }, [selectedEvent, activeTag]);

  const createMutation = useMutation({
    mutationFn: createCorporateTarget,
    onSuccess: () => { refetch(); setShowForm(false); setForm({ organisationName: "", website: "", sector: "", location: "", notes: "" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCorporateTarget,
    onSuccess: () => refetch(),
  });

  const toggleTag = (id: string, tag: string, current: boolean) => {
    updateCorporateTarget(id, { [tag]: !current }).then(() => refetch());
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Corporate Targets" intro="Organisations likely to sponsor or send women to the event." />

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setActiveTag(null)} className={`px-3 py-1.5 rounded-md text-sm ${activeTag === null ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>All</button>
        {TAGS.map((t) => (
          <button key={t.key} onClick={() => setActiveTag(t.key)} className={`px-3 py-1.5 rounded-md text-sm ${activeTag === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <Button onClick={() => setShowForm(!showForm)} className="gap-2">
        <Plus className="w-4 h-4" /> Add Target
      </Button>

      {showForm && selectedEvent && (
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Organisation name" value={form.organisationName} onChange={(e) => setForm({ ...form, organisationName: e.target.value })} />
              <Input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              <Input placeholder="Sector" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
              <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button onClick={() => createMutation.mutate({ ...form, eventId: selectedEvent.id })} disabled={!form.organisationName}>
              Save Target
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((item: any) => (
          <Card key={item.id} className="border-border/60 hover:border-burgundy/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{item.organisationName}</h3>
                    <Badge variant="outline">{item.status}</Badge>
                    {item.fitScore > 0 && (
                      <span className="flex items-center gap-1 text-xs text-burgundy">
                        <Star className="w-3 h-3 fill-burgundy" /> {item.fitScore}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.sector} {item.location && ` · ${item.location}`} {item.website}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {TAGS.map((tag) => (
                      <button
                        key={tag.key}
                        onClick={() => toggleTag(item.id, tag.key, item[tag.key])}
                        className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${item[tag.key] ? "bg-burgundy/20 border-burgundy/40 text-burgundy" : "bg-muted border-border text-muted-foreground"}`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
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
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No corporate targets yet. Add your first target above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
