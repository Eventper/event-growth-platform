import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, DollarSign, MapPin, Clock, CheckCircle, AlertCircle, Settings, BarChart, MessageSquare, FileText, ClipboardList, Mail, Send, History, Filter, Plus, BookOpen, Lightbulb, Tag, ArrowRight, UserPlus, Shield, Eye, Pencil, Crown, Trash2, RotateCw, UserCheck, UserX, Upload, LayoutTemplate, Image as ImageIcon, BarChart3, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import DecorStudio from "./decor-studio";
import GuestManagement from "./guest-management";
import { EventTeamBuilder } from "@/components/EventTeamBuilder";
import { EventReadinessIndicator } from "@/components/EventReadinessIndicator";
import { ProfitMarginIndicator } from "@/components/ProfitMarginIndicator";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

interface Event {
  id: string;
  name: string;
  type: string;
  eventCategory: string;
  startDate: string;
  endDate: string;
  guestCount: number;
  budget: string;
  currency: string;
  status: string;
  city: string;
  country: string;
  plannerId: string;
  parentEventId?: string;
  weddingScope?: string;
  workflowStatus?: string;
  planningMode?: string;
  clientContactOnDay?: string;
  coordinationScope?: string;
  setupTime?: string;
  [key: string]: any;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  eventId: string;
  phase: string;
}

interface BudgetItem {
  id: string;
  category: string;
  description: string;
  estimatedCost: string;
  actualCost: string;
  status: string;
  eventId: string;
}

function VendorCardWithDocuments({ vendor, eventId }: { vendor: any; eventId: string }) {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const { data: documents = [], isLoading: docsLoading } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "vendors", vendor.id, "documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !selectedDocType) return;
      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("documentType", selectedDocType);
      formData.append("documentName", selectedFile.name);
      const response = await fetch(`/api/events/${eventId}/vendors/${vendor.id}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "vendors", vendor.id, "documents"] });
      setShowUpload(false);
      setSelectedFile(null);
      setSelectedDocType("");
      toast({ title: "Document uploaded", description: "The document has been uploaded successfully." });
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Failed to upload document.", variant: "destructive" });
    },
  });

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "verified": return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case "rejected": return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const docTypeLabels: Record<string, string> = {
    company_registration: "Company Registration",
    insurance: "Insurance",
    vat_certificate: "VAT Certificate",
    portfolio: "Portfolio",
    license: "License",
    certificate: "Certificate",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{vendor.name}</CardTitle>
        <CardDescription>{vendor.category}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm">{vendor.contactPerson}</p>
          <p className="text-sm text-gray-600">{vendor.email}</p>
          <p className="text-sm text-gray-600">{vendor.phone}</p>
          <Badge variant="outline">{vendor.status || "Active"}</Badge>
        </div>

        <div className="mt-4 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowUpload(!showUpload)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>

          {showUpload && (
            <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg border">
              <div>
                <Label className="text-xs">Document Type</Label>
                <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_registration">Company Registration</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="vat_certificate">VAT Certificate</SelectItem>
                    <SelectItem value="portfolio">Portfolio</SelectItem>
                    <SelectItem value="license">License</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">File</Label>
                <Input
                  type="file"
                  className="mt-1"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button
                size="sm"
                className="w-full bg-[#330311] hover:bg-[#4a0418] text-white"
                disabled={!selectedFile || !selectedDocType || uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          )}
        </div>

        {documents.length > 0 && (
          <div className="mt-3 border-t pt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Documents</p>
            {documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.documentName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {docTypeLabels[doc.documentType] || doc.documentType}
                    </Badge>
                    {doc.uploadDate && (
                      <span className="text-gray-400">
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-2">
                  {getVerificationBadge(doc.verificationStatus)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CATALOGUE — every service EP can attach to an event
// ─────────────────────────────────────────────────────────────────────────────
const SERVICE_CATALOGUE = [
  {
    key: "guest_management",
    name: "Guest Management",
    icon: "👥",
    category: "People",
    description: "Invitations, RSVP tracking, digital send, seating plan, check-in & badges",
    pricingModel: "per_head",
    defaultUnitPrice: 15,
    linkLabel: "Open Guest Management",
    linkPath: (eventId: string) => `/events/${eventId}/guests`,
    secondaryLink: { label: "Send Invitations", path: (id: string) => `/events/${id}/invitations` },
  },
  {
    key: "event_coordination",
    name: "Full Event Coordination",
    icon: "🎯",
    category: "Coordination",
    description: "Full day-of coordination — EP runs the event from setup to close",
    pricingModel: "flat_fee",
    defaultUnitPrice: 1200,
    linkLabel: "View Run Sheet",
    linkPath: (eventId: string) => `/run-sheet?eventId=${eventId}`,
  },
  {
    key: "decor_styling",
    name: "Decoration & Styling",
    icon: "🌸",
    category: "Creative",
    description: "Full décor design, sourcing, setup and breakdown — bespoke to your theme",
    pricingModel: "package",
    defaultUnitPrice: 0,
    linkLabel: "Decor Studio",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}#decor`,
  },
  {
    key: "decor_coordinator",
    name: "Décor Coordinator",
    icon: "🎨",
    category: "Coordination",
    description: "Dedicated décor lead on the day — oversees setup, suppliers & styling team",
    pricingModel: "flat_fee",
    defaultUnitPrice: 450,
    linkLabel: "Assign Staff",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}`,
  },
  {
    key: "ushers",
    name: "Ushers / Front of House",
    icon: "🤵",
    category: "People",
    description: "Professional ushers for guest arrival, seating, and programme distribution",
    pricingModel: "per_head",
    defaultUnitPrice: 180,
    linkLabel: "Assign Staff",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}`,
  },
  {
    key: "catering",
    name: "Catering & Food",
    icon: "🍽️",
    category: "Food & Drink",
    description: "Full catering service — starter, main, dessert with dietary options per guest",
    pricingModel: "per_head",
    defaultUnitPrice: 65,
    linkLabel: "Manage Vendors",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}`,
  },
  {
    key: "drinks_reception",
    name: "Drinks Reception / Bar",
    icon: "🥂",
    category: "Food & Drink",
    description: "Welcome drinks, cocktail hour, bar package, or full bar service",
    pricingModel: "per_head",
    defaultUnitPrice: 30,
    linkLabel: "Manage Vendors",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}`,
  },
  {
    key: "entertainment",
    name: "Entertainment",
    icon: "🎤",
    category: "Entertainment",
    description: "DJ, live band, performers, comedian, spoken word, or custom act",
    pricingModel: "flat_fee",
    defaultUnitPrice: 800,
    linkLabel: "Manage Vendors",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}`,
  },
  {
    key: "photography",
    name: "Photography",
    icon: "📸",
    category: "Media",
    description: "Professional event photography — full coverage, edited gallery delivered digitally",
    pricingModel: "package",
    defaultUnitPrice: 950,
    linkLabel: "Photo Gallery",
    linkPath: (eventId: string) => `/photo-gallery?eventId=${eventId}`,
  },
  {
    key: "videography",
    name: "Videography",
    icon: "🎬",
    category: "Media",
    description: "Full event film — highlight reel + full footage, colour graded and delivered",
    pricingModel: "package",
    defaultUnitPrice: 1200,
    linkLabel: "Manage Vendors",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}`,
  },
  {
    key: "florals",
    name: "Florals & Floral Design",
    icon: "💐",
    category: "Creative",
    description: "Bespoke floral arrangements — centrepieces, arch, table runners, bouquets",
    pricingModel: "quote",
    defaultUnitPrice: 0,
    linkLabel: "Decor Studio",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}`,
  },
  {
    key: "sound_lighting",
    name: "Sound & Lighting",
    icon: "💡",
    category: "Technical",
    description: "PA system, uplighting, pin-spot, LED, event technical production",
    pricingModel: "package",
    defaultUnitPrice: 600,
    linkLabel: "Manage Vendors",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}`,
  },
  {
    key: "mc_host",
    name: "MC / Host",
    icon: "🎙️",
    category: "Entertainment",
    description: "Professional MC or host to run the programme and keep energy high",
    pricingModel: "flat_fee",
    defaultUnitPrice: 500,
    linkLabel: "Manage Vendors",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}`,
  },
  {
    key: "security",
    name: "Security",
    icon: "🛡️",
    category: "Safety",
    description: "Licensed security officers — crowd management, access control, VIP protection",
    pricingModel: "hourly",
    defaultUnitPrice: 28,
    linkLabel: "Assign Staff",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}`,
  },
  {
    key: "cake_desserts",
    name: "Cake & Desserts",
    icon: "🎂",
    category: "Food & Drink",
    description: "Bespoke event cake, dessert table, or sweet station",
    pricingModel: "quote",
    defaultUnitPrice: 0,
    linkLabel: "Manage Vendors",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}`,
  },
  {
    key: "transport",
    name: "Transport & Logistics",
    icon: "🚌",
    category: "Logistics",
    description: "Guest shuttle, VIP transfers, equipment logistics, venue access coordination",
    pricingModel: "quote",
    defaultUnitPrice: 0,
    linkLabel: "Manage Vendors",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}`,
  },
  {
    key: "printing_stationery",
    name: "Printing & Stationery",
    icon: "📄",
    category: "Collateral",
    description: "Programmes, menus, place cards, table plans, signage — designed and printed",
    pricingModel: "flat_fee",
    defaultUnitPrice: 200,
    linkLabel: "Manage Vendors",
    linkPath: (eventId: string) => `/event-dashboard/${eventId}`,
  },
  {
    key: "event_app",
    name: "Guest Event App",
    icon: "📱",
    category: "Technology",
    description: "Branded digital event app for guests — schedule, polling, Q&A, find-your-seat",
    pricingModel: "flat_fee",
    defaultUnitPrice: 350,
    linkLabel: "Build Event App",
    linkPath: (eventId: string) => `/events/${eventId}/app-builder`,
  },
];

const CATEGORY_COLOURS: Record<string, string> = {
  People: "bg-blue-50 text-blue-700 border-blue-200",
  Coordination: "bg-purple-50 text-purple-700 border-purple-200",
  Creative: "bg-pink-50 text-pink-700 border-pink-200",
  "Food & Drink": "bg-orange-50 text-orange-700 border-orange-200",
  Entertainment: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Media: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Technical: "bg-slate-50 text-slate-700 border-slate-200",
  Safety: "bg-red-50 text-red-700 border-red-200",
  Logistics: "bg-teal-50 text-teal-700 border-teal-200",
  Collateral: "bg-amber-50 text-amber-700 border-amber-200",
  Technology: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

const PRICING_LABELS: Record<string, string> = {
  per_head: "Per Head",
  flat_fee: "Flat Fee",
  package: "Package",
  hourly: "Per Hour",
  quote: "Quote Required",
};

function EventServicesTab({ eventId, event }: { eventId: string; event: any }) {
  const { toast } = useToast();
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("All");
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [form, setForm] = useState<{
    pricingModel: string; unitPrice: string; quantity: string; notes: string; assignedTo: string; status: string; currency: string;
  }>({ pricingModel: "flat_fee", unitPrice: "0", quantity: "1", notes: "", assignedTo: "", status: "quoted", currency: event?.currency || "GBP" });

  const { data: services = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "services"],
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/events/${eventId}/services`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "services"] }); setAddingKey(null); toast({ title: "Service added" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/events/${eventId}/services/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "services"] }); setEditingId(null); toast({ title: "Updated" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/events/${eventId}/services/${id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "services"] }); toast({ title: "Service removed" }); },
  });

  const currency = event?.currency || "GBP";
  const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : "£";

  const activeKeys = new Set(services.map((s: any) => s.serviceKey));
  const totalConfirmed = services
    .filter((s: any) => s.status === "confirmed")
    .reduce((sum: number, s: any) => sum + parseFloat(s.totalPrice || "0"), 0);
  const totalQuoted = services
    .filter((s: any) => s.status === "quoted")
    .reduce((sum: number, s: any) => sum + parseFloat(s.totalPrice || "0"), 0);

  const categories = ["All", ...Array.from(new Set(SERVICE_CATALOGUE.map(s => s.category)))];
  const filteredCatalogue = filterCat === "All"
    ? SERVICE_CATALOGUE
    : SERVICE_CATALOGUE.filter(s => s.category === filterCat);

  function openAdd(cat: typeof SERVICE_CATALOGUE[0]) {
    setAddingKey(cat.key);
    setShowCatalogue(false);
    const guestCount = event?.guestCount || 1;
    const qty = ["per_head", "hourly"].includes(cat.pricingModel) ? guestCount : 1;
    const total = parseFloat((cat.defaultUnitPrice * qty).toFixed(2));
    setForm({
      pricingModel: cat.pricingModel,
      unitPrice: String(cat.defaultUnitPrice),
      quantity: String(qty),
      notes: "",
      assignedTo: "",
      status: "quoted",
      currency,
    });
  }

  function openEdit(svc: any) {
    setEditingId(svc.id);
    setForm({
      pricingModel: svc.pricingModel,
      unitPrice: String(svc.unitPrice || "0"),
      quantity: String(svc.quantity || "1"),
      notes: svc.notes || "",
      assignedTo: svc.assignedTo || "",
      status: svc.status,
      currency: svc.currency || currency,
    });
  }

  function computedTotal() {
    const u = parseFloat(form.unitPrice || "0");
    const q = parseInt(form.quantity || "1");
    if (form.pricingModel === "quote") return 0;
    return parseFloat((u * q).toFixed(2));
  }

  function handleSaveNew() {
    const cat = SERVICE_CATALOGUE.find(c => c.key === addingKey)!;
    addMutation.mutate({
      serviceKey: cat.key,
      serviceName: cat.name,
      pricingModel: form.pricingModel,
      unitPrice: form.unitPrice,
      quantity: parseInt(form.quantity),
      totalPrice: String(computedTotal()),
      currency: form.currency,
      notes: form.notes,
      assignedTo: form.assignedTo,
      status: form.status,
    });
  }

  function handleSaveEdit() {
    updateMutation.mutate({
      id: editingId!,
      data: {
        pricingModel: form.pricingModel,
        unitPrice: form.unitPrice,
        quantity: parseInt(form.quantity),
        totalPrice: String(computedTotal()),
        currency: form.currency,
        notes: form.notes,
        assignedTo: form.assignedTo,
        status: form.status,
      },
    });
  }

  const statusColour: Record<string, string> = {
    quoted: "bg-amber-100 text-amber-800",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#330311]" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Event Services
          </h2>
          <p className="text-sm text-muted-foreground">Add and price each service EP is providing for this event</p>
        </div>
        <Button onClick={() => setShowCatalogue(true)} className="bg-[#330311] hover:bg-[#4a0418] text-white gap-2">
          <Plus className="w-4 h-4" /> Add Service
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-[#33031120]">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Services Booked</p>
            <p className="text-2xl font-bold text-[#330311]">{services.length}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-green-700 uppercase tracking-wider mb-1">Confirmed Value</p>
            <p className="text-2xl font-bold text-green-800">{symbol}{totalConfirmed.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-amber-700 uppercase tracking-wider mb-1">Quoted (Pending)</p>
            <p className="text-2xl font-bold text-amber-800">{symbol}{totalQuoted.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-blue-700 uppercase tracking-wider mb-1">Total Pipeline</p>
            <p className="text-2xl font-bold text-blue-800">{symbol}{(totalConfirmed + totalQuoted).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active services */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading services…</div>
      ) : services.length === 0 ? (
        <Card className="border-dashed border-2 border-[#33031130]">
          <CardContent className="py-16 text-center">
            <p className="text-4xl mb-3">🛎️</p>
            <p className="text-[#330311] font-semibold mb-1">No services added yet</p>
            <p className="text-sm text-muted-foreground mb-4">Click "Add Service" to attach Guest Management, Decoration, Catering, Entertainment and more — each with its own pricing.</p>
            <Button onClick={() => setShowCatalogue(true)} className="bg-[#330311] text-white">Browse Services</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map((svc: any) => {
            const cat = SERVICE_CATALOGUE.find(c => c.key === svc.serviceKey);
            const isEditing = editingId === svc.id;
            return (
              <Card key={svc.id} className="border-[#33031115] shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{cat?.icon || "🛎️"}</span>
                      <div>
                        <CardTitle className="text-sm font-semibold text-[#330311]">{svc.serviceName}</CardTitle>
                        {cat && <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColour[svc.status] || "bg-gray-100 text-gray-700"}`}>
                      {svc.status.charAt(0).toUpperCase() + svc.status.slice(1)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {isEditing ? (
                    <div className="space-y-2 border-t pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Status</label>
                          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full text-xs border rounded px-2 py-1.5 mt-0.5">
                            <option value="quoted">Quoted</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Pricing</label>
                          <select value={form.pricingModel} onChange={e => setForm(f => ({ ...f, pricingModel: e.target.value }))} className="w-full text-xs border rounded px-2 py-1.5 mt-0.5">
                            {Object.entries(PRICING_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                      </div>
                      {form.pricingModel !== "quote" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground">Unit Price ({symbol})</label>
                            <input type="number" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Qty</label>
                            <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-muted-foreground">Assigned To</label>
                        <input type="text" placeholder="Staff member name" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Notes</label>
                        <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full text-xs border rounded px-2 py-1.5 mt-0.5 resize-none" />
                      </div>
                      {form.pricingModel !== "quote" && (
                        <p className="text-xs font-semibold text-[#330311]">Total: {symbol}{computedTotal().toLocaleString()}</p>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending} className="bg-[#330311] text-white text-xs h-7 flex-1">Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="text-xs h-7 flex-1">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-center border rounded-lg p-2 bg-gray-50">
                        <div>
                          <p className="text-xs text-muted-foreground">{PRICING_LABELS[svc.pricingModel] || "—"}</p>
                          <p className="text-sm font-semibold text-[#330311]">
                            {svc.pricingModel === "quote" ? "TBC" : `${symbol}${parseFloat(svc.unitPrice || "0").toLocaleString()}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Qty</p>
                          <p className="text-sm font-semibold">{svc.quantity || 1}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-sm font-bold text-[#330311]">
                            {svc.pricingModel === "quote" ? "TBC" : `${symbol}${parseFloat(svc.totalPrice || "0").toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                      {svc.assignedTo && (
                        <p className="text-xs text-muted-foreground">👤 {svc.assignedTo}</p>
                      )}
                      {svc.notes && (
                        <p className="text-xs text-muted-foreground italic">{svc.notes}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {cat && (
                          <Link href={cat.linkPath(eventId)}>
                            <Button size="sm" variant="outline" className="text-xs h-7 border-[#33031130] text-[#330311]">
                              {cat.linkLabel} →
                            </Button>
                          </Link>
                        )}
                        {cat?.secondaryLink && (
                          <Link href={cat.secondaryLink.path(eventId)}>
                            <Button size="sm" variant="ghost" className="text-xs h-7 text-[#8B1538]">
                              {cat.secondaryLink.label}
                            </Button>
                          </Link>
                        )}
                        <button onClick={() => openEdit(svc)} className="text-xs text-muted-foreground hover:text-[#330311] ml-auto">Edit</button>
                        <button onClick={() => removeMutation.mutate(svc.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── ADD SERVICE DIALOGUE ── */}
      {addingKey && (() => {
        const cat = SERVICE_CATALOGUE.find(c => c.key === addingKey)!;
        return (
          <Dialog open onOpenChange={() => setAddingKey(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-[#330311]">{cat.icon} Add — {cat.name}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground -mt-2">{cat.description}</p>
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full text-sm border rounded px-2 py-2 mt-1">
                      <option value="quoted">Quoted</option>
                      <option value="confirmed">Confirmed</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Pricing Model</Label>
                    <select value={form.pricingModel} onChange={e => setForm(f => ({ ...f, pricingModel: e.target.value }))} className="w-full text-sm border rounded px-2 py-2 mt-1">
                      {Object.entries(PRICING_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
                {form.pricingModel !== "quote" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Unit Price ({symbol})</Label>
                      <input type="number" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} className="w-full text-sm border rounded px-2 py-2 mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">
                        {form.pricingModel === "per_head" ? "No. of Guests" : form.pricingModel === "hourly" ? "Hours" : "Qty"}
                      </Label>
                      <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-full text-sm border rounded px-2 py-2 mt-1" />
                    </div>
                  </div>
                )}
                {form.pricingModel !== "quote" && (
                  <div className="bg-[#33031108] rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Estimated Total</p>
                    <p className="text-xl font-bold text-[#330311]">{symbol}{computedTotal().toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Assigned To (optional)</Label>
                  <input type="text" placeholder="e.g. Adaeze, Prab…" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} className="w-full text-sm border rounded px-2 py-2 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Notes (optional)</Label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full text-sm border rounded px-2 py-2 mt-1 resize-none" placeholder="Any specific details…" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSaveNew} disabled={addMutation.isPending} className="flex-1 bg-[#330311] text-white">
                    {addMutation.isPending ? "Adding…" : "Add to Event"}
                  </Button>
                  <Button variant="outline" onClick={() => setAddingKey(null)} className="flex-1">Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ── SERVICE CATALOGUE BROWSER ── */}
      {showCatalogue && (
        <Dialog open onOpenChange={() => setShowCatalogue(false)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#330311]">🛎️ Service Catalogue</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground -mt-2">Select a service to add to this event. Each can be priced individually.</p>

            {/* Category filter */}
            <div className="flex gap-2 flex-wrap pt-1">
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterCat === cat ? "bg-[#330311] text-white border-[#330311]" : "border-gray-200 text-gray-600 hover:border-[#330311]"}`}>
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {filteredCatalogue.map(cat => {
                const alreadyAdded = activeKeys.has(cat.key);
                return (
                  <div key={cat.key} className={`border rounded-xl p-3 flex gap-3 items-start transition-all ${alreadyAdded ? "opacity-50" : "hover:border-[#330311] hover:shadow-sm cursor-pointer"}`}
                    onClick={() => !alreadyAdded && openAdd(cat)}>
                    <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#330311]">{cat.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${CATEGORY_COLOURS[cat.category] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                          {cat.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cat.description}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-[#8B1538] font-medium">
                          {cat.pricingModel === "quote" ? "Quote Required" : `From ${symbol}${cat.defaultUnitPrice.toLocaleString()} ${PRICING_LABELS[cat.pricingModel]}`}
                        </span>
                        {alreadyAdded ? (
                          <span className="text-xs text-green-600 font-medium">✓ Added</span>
                        ) : (
                          <span className="text-xs text-[#330311] font-medium">+ Add →</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const BG      = "#3D0B0B";
const GOLD    = "#C9A84C";
const SURFACE = "#ffffff";
const BORDER  = "#e5e7eb";

const portalCard = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16,
  padding: 24, boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.04)", ...extra,
});

export default function EventDashboard() {
  usePageMeta({ title: "Event Dashboard — Event Perfekt" });
  const { toast } = useToast();

  const [match, params] = useRoute("/event-dashboard/:eventId");
  const eventId = params?.eventId;
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/event", eventId],
    enabled: !!eventId,
  });

  const { data: budgetItems = [], isLoading: budgetLoading } = useQuery<BudgetItem[]>({
    queryKey: ["/api/budget/event", eventId],
    enabled: !!eventId,
  });

  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ["/api/vendors/event", eventId],
    enabled: !!eventId,
  });

  const typedEvent = event as Event | undefined;
  const isParentWedding = typedEvent?.weddingScope === 'parent';
  const isChildScope = !!typedEvent?.parentEventId;

  const { data: linkedScopes = [] } = useQuery<Event[]>({
    queryKey: ["/api/events", eventId, "scopes"],
    enabled: !!eventId && isParentWedding,
  });

  if (eventLoading) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.7)" }}>
          <div style={{ width: 48, height: 48, border: `3px solid ${GOLD}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 14, fontWeight: 600 }}>Loading event…</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...portalCard(), textAlign: "center", padding: "48px 40px", maxWidth: 400 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: BG, marginBottom: 8 }}>Event Not Found</h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>The event you're looking for doesn't exist.</p>
          <Link href="/planner-dashboard">
            <Button style={{ background: BG, color: "#fff", borderRadius: 999, fontWeight: 700 }}>← Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const completedTasks = tasks.filter((task: Task) => task.status === "completed").length;
  const totalTasks = tasks.length;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const totalBudget = parseFloat(event.budget || "0");
  const spentBudget = budgetItems.reduce((sum: number, item: BudgetItem) => 
    sum + parseFloat(item.actualCost || item.estimatedCost || "0"), 0);
  const budgetProgress = totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0;

  const urgentTasks = tasks.filter((task: Task) => 
    task.priority === "urgent" && task.status !== "completed"
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "active": return "bg-blue-100 text-blue-800";
      case "planning": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-blue-100 text-blue-800";
      case "low": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const workflowLabel: Record<string, string> = {
    new_intake: "🟡 New Intake", assigned: "🔵 Assigned", in_planning: "🟢 In Planning",
    event_day: "🟣 Event Day", post_event: "⚫ Post-Event", closed: "✅ Closed",
  };
  const weddingScopeLabel: Record<string, string> = {
    traditional: "Traditional Engagement", "church wedding": "Church Wedding",
    reception: "Reception (Party)", "after party": "After Party",
  };
  const isValidDate = (d: string) => d && !isNaN(new Date(d).getTime());
  const startDisplay = isValidDate(event.startDate)
    ? new Date(event.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "Date TBC";
  const daysUntil = isValidDate(event.startDate)
    ? Math.ceil((new Date(event.startDate).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "'Poppins', sans-serif" }}>

      {/* ── STICKY WHITE HEADER ── */}
      <header style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          {/* Left: logo + breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <Link href="/planner-dashboard">
              <img src={eventPerfektLogo} alt="Event Perfekt" style={{ height: 36, borderRadius: 10, cursor: "pointer", objectFit: "contain" }} />
            </Link>
            <div style={{ fontSize: 12, color: "#9ca3af", display: "flex", alignItems: "center", gap: 6 }}>
              <Link href="/planner-dashboard"><span style={{ cursor: "pointer", color: "#6b7280" }}>Dashboard</span></Link>
              <span>›</span>
              <span style={{ color: "#1f2937", fontWeight: 700, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.name}</span>
            </div>
          </div>
          {/* Right: action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Link href={`/events/${eventId}/guests`}>
              <button style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, cursor: "pointer", color: "#374151" }}>
                <Users size={13} /> Guests
              </button>
            </Link>
            <Link href={`/events/${eventId}/invitations`}>
              <button style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, cursor: "pointer", color: "#374151" }}>
                <Mail size={13} /> Invitations
              </button>
            </Link>
            <Link href={`/floor-plan-builder?eventId=${eventId}`}>
              <button style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, cursor: "pointer", color: "#374151" }}>
                <LayoutTemplate size={13} /> Floor Plan
              </button>
            </Link>
            <Link href={`/events/${eventId}/reports`}>
              <button style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, cursor: "pointer", color: "#374151" }}>
                <FileText size={13} /> Reports
              </button>
            </Link>
            <Link href={`/event-app/${eventId}`}>
              <button style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, cursor: "pointer", color: "#374151" }}>
                <ArrowRight size={13} /> Event App
              </button>
            </Link>
            {event.workflowStatus !== "event_day" && event.workflowStatus !== "post_event" && event.workflowStatus !== "closed" && (
              <button
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 999, border: "none", background: "#16a34a", color: "#fff", cursor: "pointer" }}
                onClick={() => { apiRequest("PATCH", `/api/events/${eventId}/workflow`, { workflowStatus: "event_day" }); setLocation("/event-day-command"); }}
              >
                🔴 Go Live
              </button>
            )}
            <Link href="/planner-dashboard" data-testid="button-back-dashboard">
              <button style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 999, border: "none", background: BG, color: "#fff", cursor: "pointer" }}>
                ← Dashboard
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── BURGUNDY HERO ── */}
      <div style={{ background: "linear-gradient(135deg, #3D0B0B 0%, #5a1015 60%, #3D0B0B 100%)", padding: "36px 24px 32px", borderBottom: "1px solid rgba(201,168,76,0.25)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          {/* Badge row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}55`, color: GOLD, borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "4px 12px" }}>
              {event.type}
            </span>
            {event.status && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "4px 12px" }}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
            )}
            {(event as any).workflowStatus && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "4px 12px" }}>
                {workflowLabel[(event as any).workflowStatus] || (event as any).workflowStatus}
              </span>
            )}
            {typedEvent?.weddingScope && typedEvent.weddingScope !== "parent" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.4)", color: "#c4b5fd", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "4px 12px" }}>
                {weddingScopeLabel[typedEvent.weddingScope] || typedEvent.weddingScope}
              </span>
            )}
            {isParentWedding && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "4px 12px" }}>
                Wedding Group · {linkedScopes.length} scopes
              </span>
            )}
          </div>
          {/* Event name */}
          <h1 data-testid="text-event-name" style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, color: "#fff", margin: "0 0 16px", lineHeight: 1.15, fontFamily: "Poppins, sans-serif" }}>
            {event.name}
          </h1>
          {/* Meta row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 500 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Calendar size={14} style={{ color: GOLD }} /> {startDisplay}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><MapPin size={14} style={{ color: GOLD }} /> {[event.city, event.country].filter(Boolean).join(", ") || "Location TBC"}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Users size={14} style={{ color: GOLD }} /> {event.guestCount ? `${event.guestCount} guests` : "Guests TBC"}</span>
            {daysUntil !== null && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Clock size={14} style={{ color: GOLD }} />
                {daysUntil > 0 ? `${daysUntil} days away` : daysUntil === 0 ? "Today!" : `${Math.abs(daysUntil)} days ago`}
              </span>
            )}
            {event.budget && parseFloat(event.budget) > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><DollarSign size={14} style={{ color: GOLD }} /> {event.currency} {parseFloat(event.budget).toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px 60px" }}>
        {isParentWedding && linkedScopes.length > 0 && (
          <div className="mb-6">
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-xl">💒</span> Wedding Planning Scopes
                </CardTitle>
                <CardDescription>Each scope is a separate plannable event with its own budget, vendors, and timeline. Different planners can manage different scopes.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {linkedScopes.map((scope) => {
                    const scopeLabel = scope.weddingScope === 'traditional' ? 'Traditional Engagement'
                      : scope.weddingScope === 'church wedding' ? 'Church Wedding'
                      : scope.weddingScope === 'reception' ? 'Reception (Party)'
                      : scope.weddingScope === 'after party' ? 'After Party'
                      : scope.weddingScope || 'Scope';
                    return (
                      <Link key={scope.id} href={`/event-dashboard/${scope.id}`}>
                        <div className="border border-purple-200 bg-white rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="bg-purple-100 text-purple-800 text-xs">{scopeLabel}</Badge>
                            <Badge className={scope.status === 'planning' ? 'bg-yellow-100 text-yellow-800' : scope.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>{scope.status}</Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">{scope.name}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>{scope.city}</span>
                            <span>{scope.guestCount} guests</span>
                            <span>{scope.currency} {parseFloat(scope.budget).toLocaleString()}</span>
                          </div>
                          {scope.startDate && (
                            <p className="text-xs text-gray-400 mt-1">{new Date(scope.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {isChildScope && (
          <div className="mb-4">
            <Link href={`/event-dashboard/${typedEvent?.parentEventId}`}>
              <Button variant="outline" size="sm" className="text-purple-700 border-purple-200 hover:bg-purple-50">
                ← Back to Wedding Group Overview
              </Button>
            </Link>
          </div>
        )}

        {/* ── PORTAL-STYLE STAT CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
          {/* Tasks */}
          <div style={{ ...portalCard({ borderTop: `3px solid #16a34a`, padding: "20px 22px" }) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Task Progress</div>
                <div data-testid="text-task-progress" style={{ fontSize: 32, fontWeight: 900, color: "#16a34a", lineHeight: 1 }}>{completedTasks}<span style={{ fontSize: 18, color: "#9ca3af", fontWeight: 600 }}>/{totalTasks}</span></div>
                <div style={{ marginTop: 10, height: 6, background: "#e5e7eb", borderRadius: 9999 }}>
                  <div style={{ height: 6, background: "#16a34a", borderRadius: 9999, width: `${taskProgress}%`, transition: "width 0.4s" }} />
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>{Math.round(taskProgress)}% completed</div>
              </div>
              <span style={{ fontSize: 22, opacity: 0.6 }}>✅</span>
            </div>
          </div>
          {/* Budget */}
          <div style={{ ...portalCard({ borderTop: `3px solid #2563eb`, padding: "20px 22px" }) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Budget Used</div>
                <div data-testid="text-budget-spent" style={{ fontSize: 26, fontWeight: 900, color: "#2563eb", lineHeight: 1 }}>{event.currency} {spentBudget.toLocaleString()}</div>
                <div style={{ marginTop: 10, height: 6, background: "#e5e7eb", borderRadius: 9999 }}>
                  <div style={{ height: 6, background: budgetProgress > 90 ? "#dc2626" : "#2563eb", borderRadius: 9999, width: `${Math.min(budgetProgress, 100)}%`, transition: "width 0.4s" }} />
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>of {event.currency} {parseFloat(event.budget || "0").toLocaleString()} ({Math.round(budgetProgress)}%)</div>
              </div>
              <span style={{ fontSize: 22, opacity: 0.6 }}>💰</span>
            </div>
          </div>
          {/* Days */}
          <div style={{ ...portalCard({ borderTop: `3px solid ${GOLD}`, padding: "20px 22px" }) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Days Until Event</div>
                <div data-testid="text-days-until" style={{ fontSize: 32, fontWeight: 900, color: GOLD, lineHeight: 1 }}>
                  {daysUntil !== null ? (daysUntil > 0 ? daysUntil : daysUntil === 0 ? "Today" : "Past") : "—"}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>{startDisplay}</div>
              </div>
              <span style={{ fontSize: 22, opacity: 0.6 }}>📅</span>
            </div>
          </div>
          {/* Urgent */}
          <div style={{ ...portalCard({ borderTop: `3px solid ${urgentTasks.length > 0 ? "#dc2626" : "#9ca3af"}`, padding: "20px 22px" }) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Urgent Items</div>
                <div data-testid="text-urgent-tasks" style={{ fontSize: 32, fontWeight: 900, color: urgentTasks.length > 0 ? "#dc2626" : "#9ca3af", lineHeight: 1 }}>{urgentTasks.length}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>{urgentTasks.length > 0 ? "Require immediate attention" : "All clear"}</div>
              </div>
              <span style={{ fontSize: 22, opacity: 0.6 }}>🚨</span>
            </div>
          </div>
          {/* Vendors */}
          <div style={{ ...portalCard({ borderTop: `3px solid #7c3aed`, padding: "20px 22px" }) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Vendors Booked</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#7c3aed", lineHeight: 1 }}>{vendors.length}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                  {vendors.filter((v: any) => v.status === "confirmed" || v.verificationStatus === "verified").length} confirmed
                </div>
              </div>
              <span style={{ fontSize: 22, opacity: 0.6 }}>🤝</span>
            </div>
          </div>
        </div>

        {event.planningMode === "day_coordination" && (
          <div className="bg-gradient-to-r from-[#FFF8E7] to-[#FEF3C7] border border-[#ffffff]/40 rounded-lg p-4 mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-[#330311] rounded-full p-2">
                <UserCheck className="w-5 h-5 text-[#ffffff]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#330311] text-sm">Day Coordination Only</h3>
                <p className="text-[#330311]/70 text-xs">This is a standalone day coordination service. The client has planned the event — EP manages execution on the day.</p>
              </div>
              <div className="text-right text-xs space-y-1">
                {event.clientContactOnDay && <p className="text-[#330311]"><strong>Client Contact:</strong> {event.clientContactOnDay}</p>}
                {event.coordinationScope && <p className="text-[#330311]/70"><strong>Scope:</strong> {event.coordinationScope}</p>}
                {event.setupTime && <p className="text-[#330311]/70"><strong>EP Arrival:</strong> {event.setupTime}</p>}
              </div>
            </div>
            {event.existingVendors && (
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-[#330311] font-medium">View Vendor Details</summary>
                <pre className="mt-2 bg-white/60 rounded p-2 text-[#330311]/80 whitespace-pre-wrap">{event.existingVendors}</pre>
              </details>
            )}
            {event.existingTimeline && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-[#330311] font-medium">View Client's Timeline</summary>
                <pre className="mt-2 bg-white/60 rounded p-2 text-[#330311]/80 whitespace-pre-wrap">{event.existingTimeline}</pre>
              </details>
            )}
          </div>
        )}

        {/* ── PORTAL-STYLE TAB BAR ── */}
        {(() => {
          const TABS = [
            { value: "overview",     label: "📊 Overview",    group: "main" },
            { value: "tasks",        label: "📋 Tasks",        group: "planning" },
            { value: "budget",       label: "💰 Budget",       group: "planning" },
            { value: "vendors",      label: "🤝 Vendors",      group: "planning" },
            { value: "staff",        label: "👥 Staff",        group: "planning" },
            { value: "timeline",     label: "📅 Timeline",     group: "planning" },
            { value: "guests",       label: "🎟 Guests",       group: "planning" },
            { value: "services",     label: "🛎️ Services",     group: "planning" },
            { value: "decor",        label: "🎨 Creative",     group: "planning" },
            { value: "team",         label: "🏢 Team",         group: "ops" },
            { value: "planning-log", label: "📝 Log",          group: "ops" },
            { value: "analytics",    label: "📈 Post-Event",   group: "ops" },
            { value: "contracts",    label: "💼 Contracts",    group: "admin" },
            { value: "invoicing",    label: "📄 Invoicing",    group: "admin" },
            { value: "documents",    label: "📁 Documents",    group: "admin" },
            { value: "chat",         label: "💬 Chat",         group: "admin" },
          ];
          return (
            <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, marginBottom: 24, overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
              <div style={{ display: "flex", padding: "0 4px", minWidth: "max-content" }}>
                {TABS.map((tab, i) => {
                  const prevGroup = i > 0 ? TABS[i - 1].group : tab.group;
                  const showDiv = i > 0 && prevGroup !== tab.group;
                  return (
                    <div key={tab.value} style={{ display: "flex", alignItems: "center" }}>
                      {showDiv && <span style={{ width: 1, height: 20, background: "#e5e7eb", margin: "0 4px", alignSelf: "center" }} />}
                      <button
                        data-testid={`tab-${tab.value}`}
                        onClick={() => setActiveTab(tab.value)}
                        style={{
                          display: "block", padding: "14px 16px", fontSize: 13, fontWeight: 700,
                          whiteSpace: "nowrap", cursor: "pointer", border: "none", background: "transparent",
                          color: activeTab === tab.value ? BG : "#6b7280",
                          borderBottom: activeTab === tab.value ? `2px solid ${GOLD}` : "2px solid transparent",
                          transition: "color 0.15s",
                        }}
                      >
                        {tab.label}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
          <TabsList className="hidden" />

          {/* ── OVERVIEW TAB ── */}
          <TabsContent value="overview" className="space-y-4">
            {/* Enhanced Planner Banner */}
            <Link href={`/event-planner/${eventId}`}>
              <div className="flex items-center justify-between bg-gradient-to-r from-[#330311] to-[#8B1538] rounded-xl px-5 py-4 cursor-pointer hover:opacity-90 transition-opacity group">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    <ClipboardList className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Enhanced Planner</p>
                    <p className="text-white/60 text-xs">Auto-generated phase-by-phase planning checklist for this event</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/80 group-hover:text-white transition-colors">
                  <span className="text-xs font-medium hidden sm:block">Open Planner</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            <Link href={`/events/${eventId}/post-event`}>
              <div className="flex items-center justify-between bg-gradient-to-r from-[#1a0508] to-[#330311] rounded-xl px-5 py-4 cursor-pointer hover:opacity-90 transition-opacity group">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Post-Event Analytics & Feedback</p>
                    <p className="text-white/60 text-xs">Collect survey responses, ratings, and close-out insights</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/80 group-hover:text-white transition-colors">
                  <span className="text-xs font-medium hidden sm:block">Open Analytics</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            {/* Event Status & Financial Monitoring */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EventReadinessIndicator eventId={eventId!} />
              <ProfitMarginIndicator eventId={eventId!} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quick Links: Pre-Event */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-800">📋 Pre-Event Planning</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "Manage Tasks", tab: "tasks" },
                    { label: "Set Budget", tab: "budget" },
                    { label: "Book Vendors", tab: "vendors" },
                    { label: "Assign Staff", tab: "staff" },
                    { label: "Build Timeline", tab: "timeline" },
                    { label: "Decor & Creative", tab: "decor" },
                  ].map(item => (
                    <button
                      key={item.tab}
                      onClick={() => setActiveTab(item.tab)}
                      className="w-full text-left text-sm text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3" /> {item.label}
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Links: Event Day */}
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-amber-800">🎯 Event Day</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "Run Sheet", path: `/run-sheet?eventId=${eventId}` },
                    { label: "Guest Check-in (QR)", path: `/checkin/${eventId}` },
                    { label: "Guest Management", path: `/events/${eventId}/guests` },
                    { label: "Live Polling", path: `/live-polling?eventId=${eventId}` },
                    { label: "Badge Generator", path: `/badge-generator?eventId=${eventId}` },
                    { label: "Floor Plan", path: `/floor-plan-builder?eventId=${eventId}` },
                  ].map(item => (
                    <Link key={item.path} href={item.path}>
                      <div className="text-sm text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1 cursor-pointer">
                        <ArrowRight className="w-3 h-3" /> {item.label}
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Links: Post-Event */}
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-green-800">✅ Post-Event</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "View Analytics", tab: "analytics" },
                    { label: "Event Reports", path: `/events/${eventId}/reports` },
                    { label: "Guest Surveys", path: `/survey-builder?eventId=${eventId}` },
                    { label: "Rate Vendors", path: `/vendor-ratings?eventId=${eventId}` },
                    { label: "Photo Gallery", path: `/photo-gallery?eventId=${eventId}` },
                    { label: "Event Closure", path: `/events/${eventId}/closure` },
                  ].map(item => (
                    item.tab ? (
                      <button
                        key={item.tab}
                        onClick={() => setActiveTab(item.tab!)}
                        className="w-full text-left text-sm text-green-700 hover:text-green-900 hover:underline flex items-center gap-1"
                      >
                        <ArrowRight className="w-3 h-3" /> {item.label}
                      </button>
                    ) : (
                      <Link key={item.path} href={item.path!}>
                        <div className="text-sm text-green-700 hover:text-green-900 hover:underline flex items-center gap-1 cursor-pointer">
                          <ArrowRight className="w-3 h-3" /> {item.label}
                        </div>
                      </Link>
                    )
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Event details summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Event Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-muted-foreground text-xs">Type</p><p className="font-medium capitalize">{event.type?.replace(/_/g, ' ')}</p></div>
                  <div><p className="text-muted-foreground text-xs">Location</p><p className="font-medium">{event.city}, {event.country}</p></div>
                  <div><p className="text-muted-foreground text-xs">Guests</p><p className="font-medium">{event.guestCount}</p></div>
                  <div><p className="text-muted-foreground text-xs">Budget</p><p className="font-medium">{event.currency} {Number(event.budget).toLocaleString()}</p></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Task Management</h3>
              <Link href={`/event-checklist?eventId=${eventId}`}>
                <Button className="bg-[#330311] hover:bg-[#4a0418] text-white" data-testid="button-manage-tasks">
                  Manage Tasks
                </Button>
              </Link>
            </div>

            {urgentTasks.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Urgent Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {urgentTasks.slice(0, 3).map((task: Task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div>
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-gray-600">{task.description}</p>
                        <p className="text-xs text-red-600">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                      </div>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["Planning", "Design", "Vendor Coordination"].map((phase) => {
                const phaseTasks = tasks.filter((task: Task) => task.phase === phase);
                const completedPhase = phaseTasks.filter((task: Task) => task.status === "completed").length;
                
                return (
                  <Card key={phase}>
                    <CardHeader>
                      <CardTitle className="text-base">{phase}</CardTitle>
                      <CardDescription>
                        {completedPhase}/{phaseTasks.length} completed
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {phaseTasks.slice(0, 4).map((task: Task) => (
                        <div key={task.id} className="flex items-center gap-3 p-2 rounded border">
                          <div className={`w-2 h-2 rounded-full ${
                            task.status === "completed" ? "bg-green-500" : 
                            task.status === "in-progress" ? "bg-blue-500" : "bg-gray-300"
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{task.title}</p>
                            <p className="text-xs text-gray-600">{task.status}</p>
                          </div>
                        </div>
                      ))}
                      {phaseTasks.length > 4 && (
                        <p className="text-xs text-gray-500">
                          +{phaseTasks.length - 4} more tasks
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="budget" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Budget Overview</h3>
              <div className="flex gap-2">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setLocation(`/expense-tracker?eventId=${eventId}`)}
                >
                  + Add Expense
                </Button>
                <Link href={`/budget-management/${eventId}`}>
                  <Button className="bg-[#330311] hover:bg-[#4a0418] text-white" data-testid="button-manage-budget">
                    Manage Budget
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Budget Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {budgetItems.slice(0, 6).map((item: BudgetItem) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.category}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {event.currency} {parseFloat(item.actualCost || item.estimatedCost || "0").toLocaleString()}
                        </p>
                        <Badge variant={item.status === "confirmed" ? "default" : "secondary"}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Budget:</span>
                    <span className="font-semibold">
                      {event.currency} {parseFloat(event.budget).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Spent/Allocated:</span>
                    <span className="font-semibold">
                      {event.currency} {spentBudget.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining:</span>
                    <span className={`font-semibold ${(totalBudget - spentBudget) < 0 ? "text-red-600" : "text-green-600"}`}>
                      {event.currency} {(totalBudget - spentBudget).toLocaleString()}
                    </span>
                  </div>
                  <Progress value={budgetProgress} className="mt-4" />
                  <p className="text-sm text-center text-gray-600">
                    {Math.round(budgetProgress)}% of budget used
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vendor Coordination</h3>
              <Link href="/vendor-management">
                <Button className="bg-[#330311] hover:bg-[#4a0418] text-white" data-testid="button-manage-vendors">
                  Manage Vendors
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendors.slice(0, 6).map((vendor: any) => (
                <VendorCardWithDocuments key={vendor.id} vendor={vendor} eventId={eventId!} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="staff" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Staff & Resources</h3>
              <Link href={`/events/${eventId}/resources`}>
                <Button className="bg-[#330311] hover:bg-[#4a0418] text-white">
                  Full Staff Manager
                </Button>
              </Link>
            </div>
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h4 className="font-medium mb-2">Manage Event Staff</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Allocate ushers, coordinators, security, decorators, bouncers, cleaners, guest managers and all event support staff.
                </p>
                <Link href={`/events/${eventId}/resources`}>
                  <Button className="bg-[#330311] hover:bg-[#4a0418] text-white">
                    Open Staff Manager
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Event Timeline</h3>
              <Link href={`/event-checklist?eventId=${eventId}`}>
                <Button className="bg-[#330311] hover:bg-[#4a0418] text-white" data-testid="button-view-timeline">
                  Manage Full Timeline
                </Button>
              </Link>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks
                    .filter((task: Task) => task.status !== "completed")
                    .sort((a: Task, b: Task) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .slice(0, 5)
                    .length > 0 ? (
                      tasks
                        .filter((task: Task) => task.status !== "completed")
                        .sort((a: Task, b: Task) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                        .slice(0, 5)
                        .map((task: Task) => (
                          <div key={task.id} className="flex items-center gap-4 p-3 border rounded">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <div className="flex-1">
                              <h4 className="font-medium">{task.title}</h4>
                              <p className="text-sm text-gray-600">{task.phase}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {new Date(task.dueDate).toLocaleDateString()}
                              </p>
                              <Badge className={getPriorityColor(task.priority)} variant="outline">
                                {task.priority}
                              </Badge>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">No upcoming milestones</p>
                        <p className="text-xs mt-1">Add tasks to see them on the timeline.</p>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guests" className="space-y-4">
            <GuestManagement />
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <EventServicesTab eventId={eventId!} event={event} />
          </TabsContent>

          <TabsContent value="decor" className="space-y-4">
            <DecorStudio eventId={eventId!} event={event} />
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            {/* Workflow Status & Ownership Banner */}
            {(event as any)?.workflowStatus === 'assigned' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-blue-900">This event has been assigned to you</div>
                  <div className="text-sm text-blue-700 mt-1">
                    Review the event brief, then accept ownership to start building your team and planning.
                  </div>
                </div>
                <Button
                  className="bg-blue-700 hover:bg-blue-800 text-white ml-4 flex-shrink-0"
                  onClick={async () => {
                    try {
                      await fetch(`/api/events/${eventId}/accept`, {
                        method: 'PATCH',
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                      });
                      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId] });
                      toast({ title: 'Ownership accepted!', description: 'You are now the Event Manager for this event.' });
                    } catch {
                      toast({ title: 'Failed to accept', variant: 'destructive' });
                    }
                  }}
                >
                  ✓ Accept Ownership
                </Button>
              </div>
            )}

            {/* Event Team Builder */}
            <EventTeamBuilder eventId={eventId!} />

            {/* Co-planning (existing) */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Co-Planning Collaborators</h4>
              <CoplanningTab eventId={eventId!} eventName={event?.name || ''} />
            </div>
          </TabsContent>

          <TabsContent value="planning-log" className="space-y-4">
            <PlanningLogTab eventId={eventId!} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Post-Event Analytics & Feedback</h3>
              <div className="flex gap-2">
                <Link href={`/events/${eventId}/post-event`}>
                  <Button className="bg-[#8B1538] hover:bg-[#a01a42] text-white">
                    Post-Event Hub
                  </Button>
                </Link>
                <Link href={`/events/${eventId}/analytics`}>
                  <Button className="bg-[#330311] hover:bg-[#4a0418] text-white">
                    Full Analytics
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="py-8 text-center">
                  <BarChart className="w-12 h-12 text-[#8B1538] mx-auto mb-3" />
                  <h4 className="font-medium mb-2">Performance Analytics</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    View attendance rates, budget variance, task completion, and vendor performance metrics.
                  </p>
                  <Link href={`/events/${eventId}/analytics`}>
                    <Button variant="outline" className="border-[#330311] text-[#330311]">
                      View Analytics
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-8 text-center">
                  <MessageSquare className="w-12 h-12 text-[#8B1538] mx-auto mb-3" />
                  <h4 className="font-medium mb-2">Feedback Collection</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Collect and manage feedback from guests, clients, vendors, and staff with NPS scores.
                  </p>
                  <Link href={`/events/${eventId}/analytics`}>
                    <Button variant="outline" className="border-[#330311] text-[#330311]">
                      Collect Feedback
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="w-12 h-12 text-[#8B1538] mx-auto mb-3" />
                  <h4 className="font-medium mb-2">Reports & Export</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Generate printable analytics reports, export feedback data to CSV, and share results.
                  </p>
                  <Link href={`/events/${eventId}/reports`}>
                    <Button variant="outline" className="border-[#330311] text-[#330311]">
                      View Reports
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            <ActivitySummarySection eventId={eventId!} />
          </TabsContent>

          {/* ── CONTRACTS TAB ── */}
          <TabsContent value="contracts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💼 Contracts & Agreements
                </CardTitle>
                <CardDescription>Manage client, vendor, and venue contracts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Client Contract</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-gray-600">
                      <p className="mb-3">Main event planning agreement with client terms, scope, and deliverables.</p>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => setLocation(`/contract-management?eventId=${eventId}`)}>Manage</Button>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Vendor Contracts</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-gray-600">
                      <p className="mb-3">Service agreements with all event vendors (catering, decor, etc.)</p>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => setLocation(`/contract-management?eventId=${eventId}`)}>Manage</Button>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Venue Contract</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-gray-600">
                      <p className="mb-3">Venue rental agreement with terms, rates, and policies.</p>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => setLocation(`/contract-management?eventId=${eventId}`)}>Manage</Button>
                    </CardContent>
                  </Card>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                  <p className="font-medium mb-2">📋 Contract Features</p>
                  <p className="text-xs leading-relaxed">
                    Auto-generated contracts from event data, digital signature capture, status tracking from Draft through Sent and Signed to Completed, revision history and amendments, and document repository integration.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── INVOICING TAB ── */}
          <TabsContent value="invoicing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📄 Invoicing & Payments
                </CardTitle>
                <CardDescription>Manage invoices, payments, and financial records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-purple-200 bg-purple-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Client Invoice</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-2xl font-bold text-purple-900">{event.currency} {Number(event.budget || 0).toLocaleString()}</div>
                      <p className="text-xs text-gray-600">Total contract value</p>
                      <Button size="sm" variant="outline" className="w-full">View Invoice</Button>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Vendor Invoices</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-2xl font-bold text-green-900">{vendors.length}</div>
                      <p className="text-xs text-gray-600">Vendor payment agreements</p>
                      <Button size="sm" variant="outline" className="w-full">Manage</Button>
                    </CardContent>
                  </Card>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-900">
                  <p className="font-medium mb-2">💳 Payment Features</p>
                  <p className="text-xs leading-relaxed">
                    Multi-currency invoicing in NGN, GBP, and USD, payment plans and milestones, public payment pages via Flutterwave, invoice templates with branding, and profit margin tracking.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <EventDocumentsTab eventId={eventId!} />
          </TabsContent>

          <TabsContent value="chat" className="space-y-4">
            <PlanningChatTab eventId={eventId!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
function ActivitySummarySection({ eventId }: { eventId: string }) {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const { toast } = useToast();

  const { data: summary, isLoading } = useQuery<any>({
    queryKey: ['/api/events', eventId, 'activity-summary'],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/activity-summary`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const sendSummaryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/events/${eventId}/send-activity-summary`, {
        to: emailTo,
        subject: `Activity Summary Report - ${summary?.eventName || 'Event'}`,
      });
    },
    onSuccess: () => {
      toast({ title: "Report Sent", description: `Activity summary emailed to ${emailTo}` });
      setShowEmailDialog(false);
      setEmailTo('');
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send report.", variant: "destructive" });
    },
  });

  if (isLoading) return <div className="text-center py-4 text-gray-500">Loading activity summary...</div>;
  if (!summary) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#330311]" />
            <CardTitle>Activity Summary Report</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="border-[#330311] text-[#330311]"
            >
              <FileText className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button
              size="sm"
              onClick={() => setShowEmailDialog(true)}
              className="bg-[#330311] text-white hover:bg-[#4a0519]"
            >
              <Mail className="h-4 w-4 mr-1" /> Email Report
            </Button>
          </div>
        </div>
        <CardDescription>
          Auto-generated summary of what each person has done on this event
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[#330311]">{summary.totalTasks}</div>
            <div className="text-xs text-gray-500">Total Tasks</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.completedTasks}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.totalVendors}</div>
            <div className="text-xs text-gray-500">Vendors</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{summary.totalContracts}</div>
            <div className="text-xs text-gray-500">Contracts</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{summary.totalBudgetItems}</div>
            <div className="text-xs text-gray-500">Budget Items</div>
          </div>
        </div>

        {summary.persons && summary.persons.length > 0 ? (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Person Activity Breakdown</h4>
            {summary.persons.map((person: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-gray-900">{person.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">{person.role}</Badge>
                  </div>
                  {person.taskCount > 0 && (
                    <span className="text-sm text-gray-500">
                      {person.completedTasks}/{person.taskCount} tasks done
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed ml-4">
                  {person.activities.slice(0, 8).map((act: any) => act.action).join(" • ")}
                  {person.activities.length > 8 && <span className="text-gray-400 italic"> • and {person.activities.length - 8} more activities</span>}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No activity recorded yet for this event.</p>
        )}
      </CardContent>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="bg-white text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Email Activity Summary
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Recipient Email</Label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="recipient@example.com"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
              <Button
                onClick={() => sendSummaryMutation.mutate()}
                disabled={!emailTo || sendSummaryMutation.isPending}
                className="bg-[#330311] text-white"
              >
                {sendSummaryMutation.isPending ? 'Sending...' : 'Send Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PlanningLogTab({ eventId }: { eventId: string }) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDecisionsOnly, setShowDecisionsOnly] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const { toast } = useToast();

  const { data: planningLog = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/events', eventId, 'planning-log', categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      const res = await fetch(`/api/events/${eventId}/planning-log?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: decisionLog = [] } = useQuery<any[]>({
    queryKey: ['/api/events', eventId, 'decision-log'],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/decision-log`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showDecisionsOnly,
  });

  const addEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/events/${eventId}/planning-log`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'planning-log'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'decision-log'] });
      toast({ title: "Entry Added", description: "Planning log entry added successfully." });
      setShowAddEntry(false);
    },
  });

  const displayLog = showDecisionsOnly ? decisionLog : planningLog;

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'task', label: 'Tasks' },
    { value: 'vendor', label: 'Vendors' },
    { value: 'budget', label: 'Budget' },
    { value: 'contract', label: 'Contracts' },
    { value: 'guest', label: 'Guests' },
    { value: 'design', label: 'Design & Decor' },
    { value: 'timeline', label: 'Timeline' },
    { value: 'staff', label: 'Staff' },
    { value: 'general', label: 'General' },
    { value: 'decision', label: 'Decisions' },
  ];

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'task': return <CheckCircle className="h-4 w-4" />;
      case 'vendor': return <Users className="h-4 w-4" />;
      case 'budget': return <DollarSign className="h-4 w-4" />;
      case 'contract': return <FileText className="h-4 w-4" />;
      case 'guest': return <Users className="h-4 w-4" />;
      case 'design': return <Settings className="h-4 w-4" />;
      case 'timeline': return <Clock className="h-4 w-4" />;
      case 'staff': return <Users className="h-4 w-4" />;
      default: return <History className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'task': return 'bg-blue-100 text-blue-800';
      case 'vendor': return 'bg-purple-100 text-purple-800';
      case 'budget': return 'bg-green-100 text-green-800';
      case 'contract': return 'bg-orange-100 text-orange-800';
      case 'guest': return 'bg-pink-100 text-pink-800';
      case 'design': return 'bg-indigo-100 text-indigo-800';
      case 'timeline': return 'bg-cyan-100 text-cyan-800';
      case 'staff': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'low': return 'bg-gray-50 text-gray-500 border-gray-100';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const stats = {
    total: planningLog.length,
    decisions: planningLog.filter((l: any) => l.decisionType).length,
    today: planningLog.filter((l: any) => {
      const d = new Date(l.timestamp);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
    highPriority: planningLog.filter((l: any) => l.priority === 'high' || l.priority === 'critical').length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-[#330311]" />
            Change Log & Decision Log
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Complete audit trail of all changes and decisions made during event planning
          </p>
        </div>
        <Button
          onClick={() => setShowAddEntry(true)}
          className="bg-[#330311] text-white hover:bg-[#4a0519]"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Entry
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-[#330311]">{stats.total}</div>
            <div className="text-xs text-gray-500">Total Entries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.decisions}</div>
            <div className="text-xs text-gray-500">Decisions Made</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
            <div className="text-xs text-gray-500">Today's Activity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.highPriority}</div>
            <div className="text-xs text-gray-500">High Priority</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant={showDecisionsOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowDecisionsOnly(!showDecisionsOnly)}
          className={showDecisionsOnly ? "bg-amber-600 text-white hover:bg-amber-700" : "border-amber-300 text-amber-700"}
        >
          <Lightbulb className="h-4 w-4 mr-1" />
          Decisions Only
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading planning log...</div>
      ) : displayLog.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No entries yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Changes and decisions will be automatically logged as you plan the event.
              You can also add manual entries.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayLog.map((entry: any) => (
            <Card key={entry.id} className={`border-l-4 ${
              entry.priority === 'critical' ? 'border-l-red-500' :
              entry.priority === 'high' ? 'border-l-orange-500' :
              entry.decisionType ? 'border-l-amber-500' :
              'border-l-gray-300'
            }`}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${getCategoryColor(entry.category)}`}>
                      {getCategoryIcon(entry.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={getCategoryColor(entry.category)}>
                          {entry.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {entry.action}
                        </Badge>
                        {entry.priority && entry.priority !== 'normal' && (
                          <Badge className={getPriorityColor(entry.priority)}>
                            {entry.priority}
                          </Badge>
                        )}
                        {entry.decisionType && (
                          <Badge className="bg-amber-100 text-amber-800">
                            <Lightbulb className="h-3 w-3 mr-1" />
                            Decision
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{entry.description}</p>
                      {entry.entityName && (
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">{entry.entityType}:</span> {entry.entityName}
                        </p>
                      )}
                      {entry.decisionRationale && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                          <p className="text-xs text-amber-800">
                            <Lightbulb className="h-3 w-3 inline mr-1" />
                            <strong>Decision:</strong> {entry.decisionRationale}
                          </p>
                        </div>
                      )}
                      {entry.impact && (
                        <p className="text-xs text-gray-600 mt-1 italic">
                          Impact: {entry.impact}
                        </p>
                      )}
                      {entry.fieldsChanged && entry.fieldsChanged.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {entry.fieldsChanged.map((fc: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs border-gray-200">
                              {fc.field}{fc.newValue !== undefined ? `: ${fc.newValue}` : ''}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {entry.tags.map((tag: string, i: number) => (
                            <span key={i} className="text-xs text-gray-400 flex items-center gap-0.5">
                              <Tag className="h-2.5 w-2.5" />{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-xs text-gray-400">
                      {format(new Date(entry.timestamp), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(entry.timestamp), 'h:mm a')}
                    </p>
                    {entry.changedByName && (
                      <p className="text-xs text-gray-500 mt-1 font-medium">{entry.changedByName}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
        <DialogContent className="bg-white text-black max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#330311]" />
              Add Planning Log Entry
            </DialogTitle>
          </DialogHeader>
          <AddPlanningLogForm
            eventId={eventId}
            onSubmit={(data) => addEntryMutation.mutate(data)}
            isLoading={addEntryMutation.isPending}
            onClose={() => setShowAddEntry(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddPlanningLogForm({ eventId, onSubmit, isLoading, onClose }: {
  eventId: string;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  onClose: () => void;
}) {
  const [category, setCategory] = useState('general');
  const [description, setDescription] = useState('');
  const [decisionType, setDecisionType] = useState('');
  const [decisionRationale, setDecisionRationale] = useState('');
  const [impact, setImpact] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isDecision, setIsDecision] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit({
      category,
      action: isDecision ? 'decision_made' : 'manual_entry',
      description: description.trim(),
      changedByName: 'Planner',
      decisionType: isDecision ? (decisionType || 'planning_decision') : undefined,
      decisionRationale: isDecision ? decisionRationale : undefined,
      impact: impact || undefined,
      priority,
      tags: [category, isDecision ? 'decision' : 'manual'],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="task">Task</SelectItem>
            <SelectItem value="vendor">Vendor</SelectItem>
            <SelectItem value="budget">Budget</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="guest">Guest</SelectItem>
            <SelectItem value="design">Design & Decor</SelectItem>
            <SelectItem value="timeline">Timeline</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened or what was decided?"
          rows={3}
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label>Priority</Label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is-decision"
          checked={isDecision}
          onChange={(e) => setIsDecision(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="is-decision" className="text-sm text-gray-700 font-medium">
          This is a decision (will appear in Decision Log)
        </label>
      </div>

      {isDecision && (
        <>
          <div>
            <Label>Decision Type</Label>
            <Select value={decisionType} onValueChange={setDecisionType}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning_decision">Planning Decision</SelectItem>
                <SelectItem value="vendor_selected">Vendor Selection</SelectItem>
                <SelectItem value="vendor_rejected">Vendor Rejected</SelectItem>
                <SelectItem value="budget_approved">Budget Approved</SelectItem>
                <SelectItem value="budget_revised">Budget Revised</SelectItem>
                <SelectItem value="design_approved">Design Approved</SelectItem>
                <SelectItem value="menu_selected">Menu Selected</SelectItem>
                <SelectItem value="venue_confirmed">Venue Confirmed</SelectItem>
                <SelectItem value="scope_change">Scope Change</SelectItem>
                <SelectItem value="timeline_adjusted">Timeline Adjusted</SelectItem>
                <SelectItem value="client_request">Client Request</SelectItem>
                <SelectItem value="risk_mitigation">Risk Mitigation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rationale / Reasoning</Label>
            <Textarea
              value={decisionRationale}
              onChange={(e) => setDecisionRationale(e.target.value)}
              placeholder="Why was this decision made?"
              rows={2}
              className="mt-1"
            />
          </div>
        </>
      )}

      <div>
        <Label>Impact (optional)</Label>
        <Input
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
          placeholder="What is the impact of this change/decision?"
          className="mt-1"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          disabled={!description.trim() || isLoading}
          className="bg-[#330311] text-white hover:bg-[#4a0519]"
        >
          {isLoading ? 'Adding...' : 'Add Entry'}
        </Button>
      </div>
    </form>
  );
}

interface Collaborator {
  id: string;
  eventId: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  invitedByName: string | null;
  inviteToken: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

function CoplanningTab({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviteMessage, setInviteMessage] = useState('');
  const { toast } = useToast();

  const { data: collaborators = [], isLoading } = useQuery<Collaborator[]>({
    queryKey: ['/api/events', eventId, 'collaborators'],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/collaborators`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/events/${eventId}/collaborators`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'collaborators'] });
      toast({ title: "Invitation Sent", description: `Co-planning invitation sent to ${inviteEmail}` });
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('editor');
      setInviteMessage('');
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message || "Could not send invitation", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (collabId: string) => {
      return apiRequest('DELETE', `/api/events/${eventId}/collaborators/${collabId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'collaborators'] });
      toast({ title: "Removed", description: "Collaborator removed from this event" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (collabId: string) => {
      return apiRequest('POST', `/api/events/${eventId}/collaborators/${collabId}/resend`);
    },
    onSuccess: () => {
      toast({ title: "Resent", description: "Invitation email resent successfully" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ collabId, role }: { collabId: string; role: string }) => {
      return apiRequest('PATCH', `/api/events/${eventId}/collaborators/${collabId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'collaborators'] });
      toast({ title: "Updated", description: "Role updated successfully" });
    },
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate({
      email: inviteEmail.trim(),
      name: inviteName.trim() || undefined,
      role: inviteRole,
      message: inviteMessage.trim() || undefined,
      invitedByName: 'Planner',
    });
  };

  const accepted = collaborators.filter(c => c.status === 'accepted');
  const pending = collaborators.filter(c => c.status === 'pending');

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'co_planner': return <Crown className="h-4 w-4" />;
      case 'editor': return <Pencil className="h-4 w-4" />;
      case 'viewer': return <Eye className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'co_planner': return 'Co-Planner';
      case 'editor': return 'Editor';
      case 'viewer': return 'Viewer';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-[#8B1538]" />
            Co-Planning Team
          </h3>
          <p className="text-sm text-gray-500 mt-1">Invite colleagues to view, edit, and collaborate on this event</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)} className="bg-[#330311] text-white hover:bg-[#4a0519]">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Co-Planner
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-[#8B1538]">{collaborators.length}</div>
            <p className="text-sm text-gray-500 mt-1">Total Team Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{accepted.length}</div>
            <p className="text-sm text-gray-500 mt-1">Active Co-Planners</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-amber-600">{pending.length}</div>
            <p className="text-sm text-gray-500 mt-1">Pending Invitations</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[#8B1538] border-t-transparent rounded-full" />
        </div>
      ) : collaborators.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-600 mb-2">No team members yet</h4>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Invite colleagues to co-plan this event. They'll be able to view and edit tasks, vendors, budgets, and more.
            </p>
            <Button onClick={() => setShowInviteDialog(true)} className="bg-[#330311] text-white hover:bg-[#4a0519]">
              <UserPlus className="h-4 w-4 mr-2" />
              Send First Invitation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accepted.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                Active Team Members ({accepted.length})
              </h4>
              <div className="space-y-2">
                {accepted.map(collab => (
                  <Card key={collab.id} className="border-l-4 border-l-green-500">
                    <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
                          {(collab.name || collab.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{collab.name || collab.email}</p>
                          <p className="text-sm text-gray-500 truncate">{collab.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                          {getRoleIcon(collab.role)}
                          {getRoleLabel(collab.role)}
                        </Badge>
                        {collab.acceptedAt && (
                          <span className="text-xs text-gray-400">
                            Joined {format(new Date(collab.acceptedAt), 'MMM d, yyyy')}
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <Select
                            value={collab.role}
                            onValueChange={(val) => updateRoleMutation.mutate({ collabId: collab.id, role: val })}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="co_planner">Co-Planner</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          {updateRoleMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMutation.mutate(collab.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pending.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Pending Invitations ({pending.length})
              </h4>
              <div className="space-y-2">
                {pending.map(collab => (
                  <Card key={collab.id} className="border-l-4 border-l-amber-400 bg-amber-50/30">
                    <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                          {(collab.name || collab.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{collab.name || collab.email}</p>
                          <p className="text-sm text-gray-500 truncate">{collab.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Badge variant="outline" className="border-amber-400 text-amber-700 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                        <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
                          {getRoleIcon(collab.role)}
                          {getRoleLabel(collab.role)}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          Invited {format(new Date(collab.createdAt), 'MMM d')}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendMutation.mutate(collab.id)}
                          disabled={resendMutation.isPending}
                          className="text-xs"
                        >
                          <RotateCw className="h-3 w-3 mr-1" />
                          Resend
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMutation.mutate(collab.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Permission Levels</p>
              <div className="mt-2 space-y-1 text-xs text-blue-700">
                <p><strong>Co-Planner</strong> — Full access: create, edit, delete tasks, vendors, budget, guests, contracts</p>
                <p><strong>Editor</strong> — Can view and edit all event details, but cannot delete or manage contracts</p>
                <p><strong>Viewer</strong> — Read-only access to all event information and progress</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#8B1538]" />
              Invite Co-Planner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Name (optional)</Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Jane Smith"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Permission Level</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="co_planner">
                    Co-Planner — Full access (create, edit, delete)
                  </SelectItem>
                  <SelectItem value="editor">
                    Editor — Can view and edit
                  </SelectItem>
                  <SelectItem value="viewer">
                    Viewer — Read-only access
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Personal Message (optional)</Label>
              <Textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Hey! I'd love your help planning this event..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="bg-gray-50 border rounded-lg p-3">
              <p className="text-xs text-gray-600">
                An invitation email will be sent to <strong>{inviteEmail || 'the email you enter'}</strong> with a link to join as a co-planner for <strong>"{eventName}"</strong>.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                className="bg-[#330311] text-white hover:bg-[#4a0519]"
              >
                {inviteMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const DOC_CATEGORIES = [
  { value: "brief",          label: "Client Brief",        color: "bg-blue-900/40 text-blue-300 border-blue-700/30" },
  { value: "proposal",       label: "Proposal Sent",       color: "bg-purple-900/40 text-purple-300 border-purple-700/30" },
  { value: "client_enquiry", label: "Client Enquiry",      color: "bg-amber-900/40 text-amber-300 border-amber-700/30" },
  { value: "contracts",      label: "Contract",            color: "bg-rose-900/40 text-rose-300 border-rose-700/30" },
  { value: "invoices",       label: "Invoice",             color: "bg-green-900/40 text-green-300 border-green-700/30" },
  { value: "vendor_docs",    label: "Vendor Doc",          color: "bg-cyan-900/40 text-cyan-300 border-cyan-700/30" },
  { value: "floor_plans",    label: "Floor Plan",          color: "bg-teal-900/40 text-teal-300 border-teal-700/30" },
  { value: "photos",         label: "Photo / Image",       color: "bg-pink-900/40 text-pink-300 border-pink-700/30" },
  { value: "miscellaneous",  label: "Other",               color: "bg-gray-700/40 text-gray-300 border-gray-600/30" },
];

function fmtBytes(b: number | null | undefined) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function EventDocumentsTab({ eventId }: { eventId: string }) {
  const { toast } = useToast();
  const [showUpload, setShowUpload] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState("brief");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/documents", eventId],
    queryFn: () =>
      fetch(`/api/documents?eventId=${eventId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }).then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/documents/${id}`),
    onSuccess: () => { refetch(); toast({ title: "Document deleted" }); },
  });

  const handleUpload = async () => {
    if (!docFile && !docName) { toast({ title: "Please select a file", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("eventId", eventId);
      fd.append("name", docName || (docFile?.name ?? "Untitled"));
      fd.append("category", docCategory);
      if (docFile) fd.append("file", docFile);
      const token = localStorage.getItem("token") || "";
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      toast({ title: "Document uploaded successfully" });
      setShowUpload(false);
      setDocName(""); setDocCategory("brief"); setDocFile(null);
      refetch();
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const filtered = filterCat === "all" ? docs : docs.filter((d: any) => d.category === filterCat);
  const catMeta = (cat: string) => DOC_CATEGORIES.find((c) => c.value === cat) ?? DOC_CATEGORIES[DOC_CATEGORIES.length - 1];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">Event Documents</h3>
          <p className="text-sm text-gray-500">Briefs, proposals, enquiries and all files for this event</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="bg-[#8B1538] hover:bg-[#6d1029] text-white gap-2">
          <Upload className="h-4 w-4" /> Upload Document
        </Button>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCat("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterCat === "all" ? "bg-[#8B1538] text-white border-[#8B1538]" : "bg-white text-gray-600 border-gray-200 hover:border-[#8B1538]"}`}
        >
          All ({docs.length})
        </button>
        {DOC_CATEGORIES.map((c) => {
          const count = docs.filter((d: any) => d.category === c.value).length;
          if (count === 0) return null;
          return (
            <button
              key={c.value}
              onClick={() => setFilterCat(c.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterCat === c.value ? "bg-[#8B1538] text-white border-[#8B1538]" : "bg-white text-gray-600 border-gray-200 hover:border-[#8B1538]"}`}
            >
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading documents…</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium mb-1">No documents yet</p>
            <p className="text-gray-400 text-sm mb-4">Upload briefs, proposals, enquiries and any files related to this event</p>
            <Button onClick={() => setShowUpload(true)} variant="outline" className="border-[#8B1538] text-[#8B1538]">
              <Upload className="h-4 w-4 mr-2" /> Upload First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc: any) => {
            const meta = catMeta(doc.category);
            const isImage = doc.file_type?.startsWith("image/");
            return (
              <Card key={doc.id} className="border border-gray-200 hover:border-[#8B1538]/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {isImage ? <ImageIcon className="h-5 w-5 text-gray-500" /> : <FileText className="h-5 w-5 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 truncate">{doc.name || doc.file_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${meta.color}`}>{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        {doc.file_size ? <span>{fmtBytes(doc.file_size)}</span> : null}
                        {doc.created_at ? <span>{new Date(doc.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span> : null}
                        {doc.uploaded_by ? <span>by {doc.uploaded_by}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#8B1538] hover:underline font-medium px-2 py-1 rounded border border-[#8B1538]/30 hover:bg-[#8B1538]/5"
                        >
                          <Eye className="h-3 w-3" /> View
                        </a>
                      )}
                      <button
                        onClick={() => { if (confirm("Delete this document?")) deleteMutation.mutate(doc.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#8B1538]" /> Upload Event Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-medium mb-1 block">Document Type *</Label>
              <Select value={docCategory} onValueChange={setDocCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">Document Name</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Initial Brief – Smiths Wedding, Proposal v2"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">File *</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-[#8B1538]/50 transition-colors">
                <input
                  type="file"
                  id="doc-file-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                />
                <label htmlFor="doc-file-upload" className="cursor-pointer">
                  {docFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                      <FileText className="h-4 w-4 text-[#8B1538]" />
                      <span className="font-medium">{docFile.name}</span>
                      <span className="text-gray-400">({fmtBytes(docFile.size)})</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">Click to select a file</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Image — max 20MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-[#8B1538] hover:bg-[#6d1029] text-white"
                onClick={handleUpload}
                disabled={uploading || (!docFile && !docName)}
              >
                {uploading ? "Uploading…" : "Upload Document"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanningChatTab({ eventId }: { eventId: string }) {
  const [messageText, setMessageText] = useState('');
  const [noteType, setNoteType] = useState('general');
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: notes = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/events', eventId, 'notes'],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/notes`);
      if (!res.ok) throw new Error('Failed to fetch notes');
      return res.json();
    },
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/events/${eventId}/notes`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'notes'] });
      setMessageText('');
      toast({ title: "Note sent", description: "Planning note added successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message || "Could not send note", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest('DELETE', `/api/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'notes'] });
      toast({ title: "Deleted", description: "Note removed" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMutation.mutate({
      eventId,
      title: "Planning note",
      content: messageText.trim(),
      noteType,
      createdBy: "planner",
      isPrivate: true,
    });
  };

  const getNoteTypeStyle = (type: string) => {
    switch (type) {
      case 'important': return { border: 'border-l-red-500', badge: 'bg-red-100 text-red-800', bg: 'bg-red-50' };
      case 'meeting': return { border: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-800', bg: 'bg-blue-50' };
      case 'follow_up': return { border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-800', bg: 'bg-amber-50' };
      default: return { border: 'border-l-gray-300', badge: 'bg-gray-100 text-gray-800', bg: 'bg-white' };
    }
  };

  const getNoteTypeLabel = (type: string) => {
    switch (type) {
      case 'important': return 'Important';
      case 'meeting': return 'Meeting';
      case 'follow_up': return 'Follow-up';
      default: return 'General';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-col overflow-hidden" style={{ height: '500px' }}>
        <div className="shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B1538] to-[#330311] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Planning Chat</p>
            </div>
          </div>
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger className="w-[120px] h-7 text-xs border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="follow_up">Follow-up</SelectItem>
              <SelectItem value="important">Important</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col" style={{ background: '#f5f5f5' }}>
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin w-6 h-6 border-2 border-[#8B1538] border-t-transparent rounded-full" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-3">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">No planning notes yet</p>
              <p className="text-xs text-gray-400 mt-1">Start a conversation about this event</p>
            </div>
          ) : (
            <>
              <div className="flex-1" />
              {notes.map((note: any, idx: number) => {
                const style = getNoteTypeStyle(note.noteType);
                const prevNote = idx > 0 ? notes[idx - 1] : null;
                const sameSender = prevNote && prevNote.createdBy === note.createdBy;
                return (
                  <div key={note.id} className={cn("flex group items-end gap-1 justify-start", sameSender ? "mt-0.5" : "mt-3")}>
                    {!sameSender && (
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-0.5",
                        note.noteType === 'important' ? 'bg-gradient-to-br from-red-400 to-red-600' :
                        note.noteType === 'meeting' ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                        note.noteType === 'follow_up' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                        'bg-gradient-to-br from-gray-400 to-gray-500'
                      )}>
                        {(note.createdBy || 'P').charAt(0).toUpperCase()}
                      </div>
                    )}
                    {sameSender && <div className="w-7 shrink-0" />}
                    <div className={cn(
                      "max-w-[80%] px-3 py-1.5 text-[13px] leading-relaxed rounded-2xl rounded-bl-md shadow-sm border",
                      note.noteType === 'important' ? 'bg-red-50 border-red-200' :
                      note.noteType === 'meeting' ? 'bg-blue-50 border-blue-200' :
                      note.noteType === 'follow_up' ? 'bg-amber-50 border-amber-200' :
                      'bg-white border-gray-100'
                    )}>
                      {!sameSender && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[11px] font-semibold text-gray-700">{note.createdBy || 'Planner'}</span>
                          <Badge className={cn("text-[9px] px-1.5 py-0 h-4", style.badge)}>{getNoteTypeLabel(note.noteType)}</Badge>
                        </div>
                      )}
                      <p className="text-gray-800 whitespace-pre-wrap break-words">{note.content}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-none">
                        {note.createdAt ? format(new Date(note.createdAt), 'MMM d, h:mm a') : ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(note.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 h-5 w-5 p-0 shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        <div className="shrink-0 border-t border-gray-200 px-3 py-2 bg-white">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Aa"
              className="flex-1 bg-gray-100 border-0 text-gray-900 placeholder:text-gray-400 h-9 rounded-full px-4 text-sm focus-visible:ring-1 focus-visible:ring-[#8B1538]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={!messageText.trim() || sendMutation.isPending}
              size="sm"
              className={cn(
                "rounded-full h-9 w-9 p-0 transition-colors",
                messageText.trim() ? "bg-[#8B1538] hover:bg-[#6d1029] text-white" : "bg-gray-100 text-gray-400"
              )}
            >
              {sendMutation.isPending ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
