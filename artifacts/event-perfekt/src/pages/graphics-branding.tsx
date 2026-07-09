import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PenTool, Plus, Image, FileText, Search, Trash2, Pencil,
  CheckCircle, Clock, AlertCircle, ExternalLink, Palette, Type,
  Monitor, Printer, BarChart3, Filter, Eye, ArrowLeft, Download,
  Upload, StickyNote, Ruler, MapPin, Save, X, FileDown, FileUp,
  Clipboard
} from "lucide-react";
import PlannerLayout from "@/components/PlannerLayout";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const DESIGN_TYPES = [
  "Logo",
  "Banner",
  "Invitation Card",
  "Programme / Order of Events",
  "Menu Card",
  "Place Card / Name Tag",
  "Signage",
  "Social Media Graphics",
  "Backdrop Design",
  "Flyer / Leaflet",
  "Certificate",
  "Badge / Lanyard",
  "Table Number",
  "Thank You Card",
  "Photo Booth Props",
  "Branded Stationery",
  "Email Template",
  "Event Website Graphics",
  "Roll-Up Banner",
  "Stage Branding",
  "Vehicle Wrap",
  "Merchandise Design",
  "Dance Floor Design",
  "External Branding",
  "Entrance / Gate Branding",
  "Ceiling / Canopy Design",
  "Aisle Design",
  "Photo Wall / Media Wall",
  "Cake Table Design",
  "Gift Table Design",
  "VIP Lounge Branding",
  "Bar / Cocktail Station Branding",
  "Directional / Wayfinding Signs",
  "Other",
];

const DESIGN_STATUSES = [
  { value: "briefed", label: "Briefed", color: "bg-gray-100 text-gray-800", icon: FileText },
  { value: "in_design", label: "In Design", color: "bg-blue-100 text-blue-800", icon: PenTool },
  { value: "review", label: "Under Review", color: "bg-purple-100 text-purple-800", icon: Eye },
  { value: "revision", label: "Revision", color: "bg-amber-100 text-amber-800", icon: AlertCircle },
  { value: "approved", label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  { value: "sent_to_print", label: "Sent to Print", color: "bg-indigo-100 text-indigo-800", icon: Printer },
  { value: "printed", label: "Printed", color: "bg-teal-100 text-teal-800", icon: Printer },
  { value: "delivered", label: "Delivered", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
];

const PRINT_SPECS = [
  "Digital Only",
  "A0 (841 x 1189mm)",
  "A1 (594 x 841mm)",
  "A2 (420 x 594mm)",
  "A3 (297 x 420mm)",
  "A4 (210 x 297mm)",
  "A5 (148 x 210mm)",
  "A6 (105 x 148mm)",
  "DL (99 x 210mm)",
  "Business Card (85 x 55mm)",
  "Custom Size",
  "Social Media (1080x1080)",
  "Social Media Story (1080x1920)",
  "Facebook Cover (820x312)",
  "Roll-Up (850 x 2000mm)",
  "Backdrop (3m x 2m)",
];

const NOTE_TYPES = [
  { value: "measurements", label: "Measurements", icon: Ruler, color: "bg-blue-100 text-blue-800" },
  { value: "site_recce", label: "Site Recce", icon: MapPin, color: "bg-green-100 text-green-800" },
  { value: "brand_guidelines", label: "Brand Guidelines", icon: Palette, color: "bg-purple-100 text-purple-800" },
  { value: "colour_codes", label: "Colour Codes", icon: Palette, color: "bg-pink-100 text-pink-800" },
  { value: "print_specs", label: "Print Specs", icon: Printer, color: "bg-amber-100 text-amber-800" },
  { value: "general", label: "General", icon: StickyNote, color: "bg-gray-100 text-gray-800" },
];

interface DesignAsset {
  id: string;
  eventId: string;
  name: string;
  description: string;
  designType: string;
  status: string;
  designer: string;
  designerContact: string;
  printSpec: string;
  quantity: number;
  unitCost: number;
  currency: string;
  totalCost: number;
  dueDate: string;
  notes: string;
  revisionCount: number;
  externalLink: string;
  createdAt: string;
}

interface DesignNote {
  id: string;
  eventId: string;
  title: string;
  content: string;
  noteType: string;
  createdAt: string;
}

export default function GraphicsBranding() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<DesignAsset | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEvent, setFilterEvent] = useState("all");
  const [showNotes, setShowNotes] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const { data: assets = [], isLoading } = useQuery<DesignAsset[]>({
    queryKey: ["/api/design-assets", filterEvent],
    queryFn: async () => {
      const url = filterEvent !== "all" ? `/api/design-assets?eventId=${filterEvent}` : "/api/design-assets";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/design-assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/design-assets"] });
      toast({ title: "Design asset deleted" });
    },
  });

  const filtered = assets.filter((a) => {
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase()) && !a.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterType !== "all" && a.designType !== filterType) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  const totalBudget = filtered.reduce((s, a) => s + (a.totalCost || 0), 0);
  const approvedCount = filtered.filter((a) => ["approved", "sent_to_print", "printed", "delivered"].includes(a.status)).length;
  const inProgressCount = filtered.filter((a) => ["in_design", "review", "revision"].includes(a.status)).length;

  const getStatusBadge = (status: string) => {
    const s = DESIGN_STATUSES.find((ds) => ds.value === status);
    return <Badge className={s?.color || "bg-gray-100 text-gray-800"}>{s?.label || status}</Badge>;
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const handleExportCSV = () => {
    const dataToExport = filtered.length > 0 ? filtered : assets;
    if (dataToExport.length === 0) {
      toast({ title: "Nothing to export", description: "No design assets to export", variant: "destructive" });
      return;
    }
    const headers = ["Name", "Design Type", "Status", "Designer", "Print Spec", "Quantity", "Unit Cost", "Currency", "Total Cost", "Due Date", "External Link", "Revisions", "Description", "Notes"];
    const rows = dataToExport.map((a) => [
      a.name, a.designType, a.status, a.designer, a.printSpec,
      a.quantity, a.unitCost, a.currency, a.totalCost,
      a.dueDate ? format(new Date(a.dueDate), "yyyy-MM-dd") : "",
      a.externalLink, a.revisionCount, `"${(a.description || "").replace(/"/g, '""')}"`,
      `"${(a.notes || "").replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `design-assets-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${dataToExport.length} design assets exported to CSV` });
  };

  const handleExportJSON = () => {
    const dataToExport = filtered.length > 0 ? filtered : assets;
    if (dataToExport.length === 0) {
      toast({ title: "Nothing to export", description: "No design assets to export", variant: "destructive" });
      return;
    }
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `design-assets-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${dataToExport.length} design assets exported to JSON` });
  };

  const importMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const results = [];
      for (const item of items) {
        const result = await apiRequest("POST", "/api/design-assets", {
          eventId: item.eventId || item.event_id,
          name: item.name,
          description: item.description || "",
          designType: item.designType || item.design_type || "Other",
          status: item.status || "briefed",
          designer: item.designer || "",
          designerContact: item.designerContact || item.designer_contact || "",
          printSpec: item.printSpec || item.print_spec || "Digital Only",
          quantity: Number(item.quantity) || 0,
          unitCost: Number(item.unitCost || item.unit_cost) || 0,
          currency: item.currency || "NGN",
          totalCost: Number(item.totalCost || item.total_cost) || 0,
          dueDate: item.dueDate || item.due_date || null,
          notes: item.notes || "",
          revisionCount: Number(item.revisionCount || item.revision_count) || 0,
          externalLink: item.externalLink || item.external_link || "",
        });
        results.push(result);
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/design-assets"] });
      toast({ title: "Import complete", description: `${results.length} design assets imported successfully` });
      setShowImport(false);
    },
    onError: () => {
      toast({ title: "Import failed", description: "Some items could not be imported", variant: "destructive" });
    },
  });

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const items = Array.isArray(data) ? data : [data];
        const valid = items.filter((i: any) => i.name && (i.eventId || i.event_id));
        if (valid.length === 0) {
          toast({ title: "Invalid file", description: "JSON must contain design assets with 'name' and 'eventId' fields", variant: "destructive" });
          return;
        }
        importMutation.mutate(valid);
      } catch {
        toast({ title: "Parse error", description: "Could not read the JSON file. Please check the format.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  return (
    <PlannerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <PenTool className="w-7 h-7 text-[#8B1538]" />
              Graphics & Branding
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage event design assets, branding materials, print collateral, and digital graphics</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowNotes(!showNotes)} className="text-gray-700 border-gray-300">
              <StickyNote className="w-4 h-4 mr-2" /> Design Notes
            </Button>
            <Button variant="outline" onClick={() => setShowImport(true)} className="text-gray-700 border-gray-300">
              <FileUp className="w-4 h-4 mr-2" /> Import
            </Button>
            <Button variant="outline" onClick={handleExportCSV} className="text-gray-700 border-gray-300">
              <FileDown className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button onClick={() => setShowCreate(true)} className="bg-[#8B1538] hover:bg-[#6d1029] text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Design Asset
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Image className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
                <p className="text-xs text-gray-500">Design Assets</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <PenTool className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{inProgressCount}</p>
                <p className="text-xs text-gray-500">In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
                <p className="text-xs text-gray-500">Approved/Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{fmt(totalBudget)}</p>
                <p className="text-xs text-gray-500">Design Budget</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gradient-to-r from-[#330311] to-[#8B1538] rounded-xl p-5 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-semibold text-lg mb-1">Design Tools</h3>
              <p className="text-white/70 text-sm">Open these tools in a new tab to design. Come back here to track your assets.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <a href="https://www.canva.com" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors border border-white/20">
                <Palette className="w-4 h-4" /> Canva
              </a>
              <a href="https://www.figma.com" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors border border-white/20">
                <PenTool className="w-4 h-4" /> Figma
              </a>
              <a href="https://www.adobe.com/express" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors border border-white/20">
                <Image className="w-4 h-4" /> Adobe Express
              </a>
              <a href="https://designer.microsoft.com" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors border border-white/20">
                <Monitor className="w-4 h-4" /> Microsoft Designer
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <ArrowLeft className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Coming back after designing</p>
                <p className="text-xs text-blue-700 leading-relaxed">All design tools open in a new browser tab. When you're done, simply close that tab or switch back to your Event Perfekt tab. Your designs are saved in each tool's own account (Canva, Figma, etc.).</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                <Download className="w-4 h-4 text-green-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900 mb-1">Import & Export Designs</p>
                <p className="text-xs text-green-700 leading-relaxed">Paste the link to your finished design in the "External Link" field when creating an asset. Export all your design tracking data as CSV or JSON using the export buttons above.</p>
              </div>
            </div>
          </div>
        </div>

        {showNotes && <DesignNotesSection events={events} filterEvent={filterEvent} />}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search designs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-300 text-gray-900"
            />
          </div>
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger className="w-[180px] bg-white border-gray-300 text-gray-900">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] bg-white border-gray-300 text-gray-900">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DESIGN_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] bg-white border-gray-300 text-gray-900">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {DESIGN_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-gray-900 text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-[#8B1538]" />
                Design Assets ({filtered.length})
              </span>
              <Button variant="ghost" size="sm" onClick={handleExportJSON} className="text-gray-400 hover:text-gray-600 text-xs h-7">
                <FileDown className="w-3 h-3 mr-1" /> JSON
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-[#8B1538] border-t-transparent rounded-full mx-auto" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <PenTool className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No design assets found</p>
                <p className="text-gray-400 text-sm mt-1">Add your event graphics, banners, invitations, and branding materials</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((asset) => (
                  <div key={asset.id} className="p-4 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-900">{asset.name}</span>
                          {getStatusBadge(asset.status)}
                          <Badge variant="outline" className="text-xs text-gray-600">{asset.designType}</Badge>
                          {asset.revisionCount > 0 && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                              {asset.revisionCount} revision{asset.revisionCount > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        {asset.description && (
                          <p className="text-sm text-gray-500 mb-1 line-clamp-1">{asset.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                          {asset.designer && <span className="flex items-center gap-1"><PenTool className="w-3 h-3" /> {asset.designer}</span>}
                          {asset.printSpec && <span className="flex items-center gap-1"><Printer className="w-3 h-3" /> {asset.printSpec}</span>}
                          {asset.quantity > 0 && <span>Qty: {asset.quantity}</span>}
                          {asset.totalCost > 0 && <span>{asset.currency || "NGN"} {fmt(asset.totalCost)}</span>}
                          {asset.dueDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {format(new Date(asset.dueDate), "MMM d, yyyy")}</span>}
                          {asset.externalLink && (
                            <a href={asset.externalLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> View Design
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(asset)} className="h-8 text-blue-600 border-blue-200">
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { if (confirm("Delete this design asset?")) deleteMutation.mutate(asset.id); }}
                          className="h-8 text-red-600 border-red-200"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {showCreate && (
          <DesignAssetDialog
            events={events}
            onClose={() => setShowCreate(false)}
            mode="create"
          />
        )}

        {editingItem && (
          <DesignAssetDialog
            events={events}
            item={editingItem}
            onClose={() => setEditingItem(null)}
            mode="edit"
          />
        )}

        {showImport && (
          <ImportDialog
            events={events}
            onClose={() => setShowImport(false)}
            onImport={importMutation.mutate}
            isPending={importMutation.isPending}
          />
        )}
      </div>
    </PlannerLayout>
  );
}

function DesignNotesSection({ events, filterEvent }: { events: any[]; filterEvent: string }) {
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newNoteType, setNewNoteType] = useState("general");
  const [newEventId, setNewEventId] = useState(filterEvent !== "all" ? filterEvent : "");
  const [editingNote, setEditingNote] = useState<DesignNote | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const eventIdForQuery = filterEvent !== "all" ? filterEvent : undefined;
  const { data: notes = [], isLoading } = useQuery<DesignNote[]>({
    queryKey: ["/api/design-notes", filterEvent],
    queryFn: async () => {
      const url = eventIdForQuery ? `/api/design-notes?eventId=${eventIdForQuery}` : "/api/design-notes";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/design-notes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/design-notes"] });
      setNewTitle("");
      setNewContent("");
      setNewNoteType("general");
      toast({ title: "Note saved" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save note", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PATCH", `/api/design-notes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/design-notes"] });
      setEditingNote(null);
      toast({ title: "Note updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/design-notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/design-notes"] });
      toast({ title: "Note deleted" });
    },
  });

  const getNoteTypeInfo = (type: string) => NOTE_TYPES.find((t) => t.value === type) || NOTE_TYPES[5];

  const handleAddNote = () => {
    const eventToUse = newEventId || (filterEvent !== "all" ? filterEvent : "");
    if (!newTitle.trim() || !eventToUse) {
      toast({ title: "Missing info", description: "Please provide a title and select an event", variant: "destructive" });
      return;
    }
    createMutation.mutate({ eventId: eventToUse, title: newTitle, content: newContent, noteType: newNoteType });
  };

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="pb-3 border-b border-gray-100">
        <CardTitle className="text-gray-900 text-base flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-[#8B1538]" />
          Design Notes — Measurements, Site Recce, Brand Guidelines
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">Keep notes on venue measurements, site visit details, colour codes, print specifications, and brand guidelines per event</p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {filterEvent === "all" && (
                <div>
                  <Label className="text-gray-700 text-xs">Event</Label>
                  <Select value={newEventId} onValueChange={setNewEventId}>
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900 mt-1 h-9"><SelectValue placeholder="Select event" /></SelectTrigger>
                    <SelectContent>
                      {events.map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-gray-700 text-xs">Note Type</Label>
                <Select value={newNoteType} onValueChange={setNewNoteType}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900 mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-700 text-xs">Title</Label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Venue wall dimensions" className="bg-white border-gray-300 text-gray-900 mt-1 h-9" />
              </div>
            </div>
            <div>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Enter measurements, notes from site visit, colour references (#HEX codes), print specs, brand font names, etc..."
                className="bg-white border-gray-300 text-gray-900"
                rows={3}
              />
            </div>
            <Button onClick={handleAddNote} disabled={createMutation.isPending} size="sm" className="bg-[#8B1538] hover:bg-[#6d1029] text-white">
              {createMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-6">
              <div className="animate-spin w-6 h-6 border-2 border-[#8B1538] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <StickyNote className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No design notes yet. Add measurements, site recce details, or brand guidelines above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => {
                const typeInfo = getNoteTypeInfo(note.noteType);
                const TypeIcon = typeInfo.icon;
                if (editingNote?.id === note.id) {
                  return (
                    <EditNoteInline
                      key={note.id}
                      note={editingNote}
                      onSave={(data) => updateMutation.mutate({ id: note.id, ...data })}
                      onCancel={() => setEditingNote(null)}
                      isPending={updateMutation.isPending}
                    />
                  );
                }
                return (
                  <div key={note.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeInfo.color}`}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{note.title}</span>
                            <Badge className={`text-[10px] ${typeInfo.color}`}>{typeInfo.label}</Badge>
                            {note.createdAt && (
                              <span className="text-[10px] text-gray-400">{format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}</span>
                            )}
                          </div>
                          {note.content && (
                            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => setEditingNote(note)} className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600">
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this note?")) deleteMutation.mutate(note.id); }} className="h-7 w-7 p-0 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EditNoteInline({ note, onSave, onCancel, isPending }: { note: DesignNote; onSave: (data: any) => void; onCancel: () => void; isPending: boolean }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [noteType, setNoteType] = useState(note.noteType);

  return (
    <div className="border-2 border-blue-200 rounded-lg p-3 bg-blue-50/50 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white border-gray-300 text-gray-900 h-8 text-sm" />
        <Select value={noteType} onValueChange={setNoteType}>
          <SelectTrigger className="bg-white border-gray-300 text-gray-900 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {NOTE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="bg-white border-gray-300 text-gray-900 text-sm" rows={3} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave({ title, content, noteType })} disabled={isPending} className="bg-[#8B1538] hover:bg-[#6d1029] text-white h-7 text-xs">
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-7 text-xs text-gray-600">Cancel</Button>
      </div>
    </div>
  );
}

function ImportDialog({ events, onClose, onImport, isPending }: { events: any[]; onClose: () => void; onImport: (items: any[]) => void; isPending: boolean }) {
  const [importEventId, setImportEventId] = useState("");
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState<"file" | "link" | "paste">("link");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (importMode === "link") {
      if (!importText.trim() || !importEventId) {
        toast({ title: "Missing fields", description: "Please paste the design link and select an event", variant: "destructive" });
        return;
      }
      const urlDomain = (() => { try { return new URL(importText).hostname; } catch { return ""; } })();
      const toolName = urlDomain.includes("canva") ? "Canva" : urlDomain.includes("figma") ? "Figma" : urlDomain.includes("adobe") ? "Adobe Express" : urlDomain.includes("microsoft") ? "Microsoft Designer" : "External";
      onImport([{
        eventId: importEventId,
        name: `Imported from ${toolName}`,
        description: `Design imported from ${importText}`,
        designType: "Other",
        status: "in_design",
        externalLink: importText,
      }]);
      return;
    }

    try {
      let data;
      if (importMode === "paste" || importMode === "file") {
        data = JSON.parse(importText);
      }
      const items = Array.isArray(data) ? data : [data];
      const withEvent = items.map((item: any) => ({
        ...item,
        eventId: item.eventId || item.event_id || importEventId,
      }));
      const valid = withEvent.filter((i: any) => i.name && i.eventId);
      if (valid.length === 0) {
        toast({ title: "No valid items", description: "Each item needs at least a 'name' and 'eventId'", variant: "destructive" });
        return;
      }
      onImport(valid);
    } catch {
      toast({ title: "Invalid format", description: "Could not parse the data. Check the format and try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <FileUp className="w-5 h-5 text-[#8B1538]" />
            Import Design
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={importMode === "link" ? "default" : "outline"} size="sm" onClick={() => setImportMode("link")}
              className={importMode === "link" ? "bg-[#8B1538] text-white" : "text-gray-700"}>
              <ExternalLink className="w-3 h-3 mr-1" /> From Link
            </Button>
            <Button variant={importMode === "file" ? "default" : "outline"} size="sm" onClick={() => setImportMode("file")}
              className={importMode === "file" ? "bg-[#8B1538] text-white" : "text-gray-700"}>
              <Upload className="w-3 h-3 mr-1" /> From File
            </Button>
            <Button variant={importMode === "paste" ? "default" : "outline"} size="sm" onClick={() => setImportMode("paste")}
              className={importMode === "paste" ? "bg-[#8B1538] text-white" : "text-gray-700"}>
              <Clipboard className="w-3 h-3 mr-1" /> Paste JSON
            </Button>
          </div>

          <div>
            <Label className="text-gray-700 text-sm">Event *</Label>
            <Select value={importEventId} onValueChange={setImportEventId}>
              <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>
                {events.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {importMode === "link" && (
            <div>
              <Label className="text-gray-700 text-sm">Design Link (Canva, Figma, Adobe Express, etc.)</Label>
              <Input value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="https://www.canva.com/design/..." className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
              <p className="text-[11px] text-gray-400 mt-1">Paste the share link from your design tool. This creates a tracked asset with the link attached.</p>
            </div>
          )}

          {importMode === "file" && (
            <div>
              <Label className="text-gray-700 text-sm">Upload JSON File</Label>
              <Input type="file" accept=".json" onChange={handleFileSelect} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
              <p className="text-[11px] text-gray-400 mt-1">Upload a previously exported JSON file to re-import design assets.</p>
              {importText && <p className="text-xs text-green-600 mt-1">File loaded. Click Import to continue.</p>}
            </div>
          )}

          {importMode === "paste" && (
            <div>
              <Label className="text-gray-700 text-sm">Paste JSON Data</Label>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={'[\n  { "name": "Invitation Card", "designType": "Invitation Card", "status": "briefed" }\n]'}
                className="bg-gray-50 border-gray-300 text-gray-900 mt-1 font-mono text-xs"
                rows={6}
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleImport} disabled={isPending || !importEventId} className="flex-1 bg-[#8B1538] hover:bg-[#6d1029] text-white">
              {isPending ? "Importing..." : "Import"}
            </Button>
            <Button variant="outline" onClick={onClose} className="text-gray-700">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DesignAssetDialog({ events, item, onClose, mode }: { events: any[]; item?: DesignAsset; onClose: () => void; mode: "create" | "edit" }) {
  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const [designType, setDesignType] = useState(item?.designType || "Invitation Card");
  const [status, setStatus] = useState(item?.status || "briefed");
  const [designer, setDesigner] = useState(item?.designer || "");
  const [designerContact, setDesignerContact] = useState(item?.designerContact || "");
  const [printSpec, setPrintSpec] = useState(item?.printSpec || "Digital Only");
  const [quantity, setQuantity] = useState(item?.quantity || 0);
  const [unitCost, setUnitCost] = useState(item?.unitCost || 0);
  const [currency, setCurrency] = useState(item?.currency || "NGN");
  const [dueDate, setDueDate] = useState(item?.dueDate ? format(new Date(item.dueDate), "yyyy-MM-dd") : "");
  const [notes, setNotes] = useState(item?.notes || "");
  const [revisionCount, setRevisionCount] = useState(item?.revisionCount || 0);
  const [externalLink, setExternalLink] = useState(item?.externalLink || "");
  const [eventId, setEventId] = useState(item?.eventId || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const totalCost = quantity * unitCost;

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (mode === "edit" && item) {
        return apiRequest("PATCH", `/api/design-assets/${item.id}`, data);
      }
      return apiRequest("POST", "/api/design-assets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/design-assets"] });
      toast({ title: mode === "edit" ? "Design asset updated" : "Design asset created" });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save design asset", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!name || !eventId) {
      toast({ title: "Missing fields", description: "Please provide a name and select an event", variant: "destructive" });
      return;
    }
    mutation.mutate({
      eventId,
      name,
      description,
      designType,
      status,
      designer,
      designerContact,
      printSpec,
      quantity,
      unitCost,
      currency,
      totalCost,
      dueDate: dueDate || null,
      notes,
      revisionCount,
      externalLink,
    });
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <PenTool className="w-5 h-5 text-[#8B1538]" />
            {mode === "edit" ? "Edit Design Asset" : "Add Design Asset"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-700 text-sm">Event *</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>
                {events.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Asset Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wedding Invitation Design" className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Design Type</Label>
              <Select value={designType} onValueChange={setDesignType}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESIGN_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-gray-700 text-sm">Description / Brief</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Design brief, requirements, colour specifications, fonts to use..." className="bg-gray-50 border-gray-300 text-gray-900 mt-1" rows={3} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESIGN_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Print / Size Spec</Label>
              <Select value={printSpec} onValueChange={setPrintSpec}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRINT_SPECS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Revisions</Label>
              <Input type="number" value={revisionCount} onChange={(e) => setRevisionCount(Number(e.target.value))} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" min={0} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Designer / Agency</Label>
              <Input value={designer} onChange={(e) => setDesigner(e.target.value)} placeholder="Designer name or agency" className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Designer Contact</Label>
              <Input value={designerContact} onChange={(e) => setDesignerContact(e.target.value)} placeholder="Phone or email" className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Print Quantity</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Unit Cost</Label>
              <Input type="number" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">NGN (₦)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GHS">GHS (₵)</SelectItem>
                  <SelectItem value="KES">KES (KSh)</SelectItem>
                  <SelectItem value="ZAR">ZAR (R)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Total Cost</Label>
              <div className="mt-1 h-10 px-3 flex items-center bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-900">
                {currency} {fmt(totalCost)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-700 text-sm">External Link (Canva, Figma, etc.)</Label>
              <Input value={externalLink} onChange={(e) => setExternalLink(e.target.value)} placeholder="https://..." className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-gray-700 text-sm">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes, feedback from client, colour codes, font names..." className="bg-gray-50 border-gray-300 text-gray-900 mt-1" rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={mutation.isPending} className="flex-1 bg-[#8B1538] hover:bg-[#6d1029] text-white">
              {mutation.isPending ? "Saving..." : mode === "edit" ? "Update Design Asset" : "Add Design Asset"}
            </Button>
            <Button variant="outline" onClick={onClose} className="text-gray-700">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
