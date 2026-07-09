import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners, useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PlannerLayout from "@/components/PlannerLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FullScreenModal } from "@/components/ui/full-screen-modal";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COUNTRIES, getCurrencyByCountry, getCountryTier, getEmailToneByCountry } from "@/lib/countries";
import ProspectActivityTimeline from "@/components/ProspectActivityTimeline";
import SequenceManager from "@/components/SequenceManager";
import {
  Search, Plus, Loader2, Trash2, ExternalLink, Save, Star,
  Building2, Calendar, PartyPopper, Rocket, Gift, Globe, MapPin,
  Phone, Mail, ChevronRight, CheckCircle, Clock, UserPlus,
  TrendingUp, Target, Sparkles, Filter, RefreshCw, Download,
  Zap, Send, AlertCircle, ArrowRight, Check, GripVertical,
  Megaphone, Briefcase, Heart, Crown, Utensils, Camera, Music, Palette, Video,
  DollarSign, User, AlertTriangle,
} from "lucide-react";

interface Prospect {
  id?: number;
  company_name: string;
  industry: string | null;
  location: string | null;
  country?: string | null;
  website: string | null;
  milestone_type: string;
  milestone_detail: string | null;
  founded_year: number | null;
  company_age?: number | null;
  anniversary_years: number | null;
  source: string | null;
  source_url?: string | null;
  contact_info: string | null;
  status: string;
  notes: string | null;
  priority: string;
  snippet?: string;
  reason_for_recommendation?: string;
  confidence?: string;
  created_at?: string;
  updated_at?: string;
  // New fields
  estimated_value?: number | null;
  currency?: string | null;
  assigned_to?: number | null;
  last_contacted_at?: string | null;
  contact_name?: string | null;
  contact_title?: string | null;
  contact_email?: string | null;
  contact_linkedin?: string | null;
  contact_confidence?: string | null;
  contact_phone?: string | null;
  campaign_id?: number | null;
  overdue_flagged_at?: string | null;
}

const MILESTONE_TYPES = [
  { value: "anniversary", label: "Anniversary", icon: PartyPopper, color: "text-amber-400" },
  { value: "end_of_year", label: "End of Year / Christmas", icon: Gift, color: "text-red-400" },
  { value: "product_launch", label: "Product Launch / Opening", icon: Rocket, color: "text-blue-400" },
  { value: "celebration", label: "Celebration / Award", icon: Star, color: "text-purple-400" },
  { value: "individual_lead", label: "Individual Lead", icon: User, color: "text-pink-400" },
  { value: "general", label: "General", icon: Building2, color: "text-white/60" },
];

const STATUSES = [
  { value: "new", label: "New", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", headerColor: "border-blue-500/40" },
  { value: "contacted", label: "Contacted", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", headerColor: "border-amber-500/40" },
  { value: "meeting", label: "Meeting Booked", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", headerColor: "border-cyan-500/40" },
  { value: "proposal", label: "Proposal Sent", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", headerColor: "border-emerald-500/40" },
  { value: "negotiation", label: "Negotiation", color: "bg-purple-500/20 text-purple-300 border-purple-500/30", headerColor: "border-purple-500/40" },
  { value: "won", label: "Won", color: "bg-green-500/20 text-green-300 border-green-500/30", headerColor: "border-green-500/40" },
  { value: "lost", label: "Lost", color: "bg-red-500/20 text-red-300 border-red-500/30", headerColor: "border-red-500/40" },
];

const PIPELINE_STAGES = ["new", "contacted", "meeting", "proposal", "negotiation", "won", "lost"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£", NGN: "₦", USD: "$", EUR: "€", AED: "AED", KES: "KSh", GHS: "GH₵", ZAR: "R",
};

function formatCurrency(value: number | null | undefined, currency: string | null | undefined): string {
  if (!value) return "";
  const sym = CURRENCY_SYMBOLS[currency || "GBP"] || currency || "£";
  if (value >= 1000000) return `${sym}${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${sym}${(value / 1000).toFixed(0)}K`;
  return `${sym}${value.toLocaleString()}`;
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function isStale(dateStr: string | null | undefined): boolean {
  if (!dateStr) return true;
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return days > 14;
}

function isHighPriorityAuto(p: Prospect): boolean {
  if (p.estimated_value && p.estimated_value > 50000) return true;
  if (p.last_contacted_at && isStale(p.last_contacted_at) && p.status !== "new") return true;
  const ms = (p.milestone_detail || "").toLowerCase();
  if (ms.includes("this month") || ms.includes("next month")) return true;
  return false;
}

const MARKETING_REGIONS_WITH_CURRENCY = [
  { name: "Nigeria", currency: "₦/USD" },
  { name: "United Kingdom", currency: "£" },
  { name: "Ghana", currency: "GH₵" },
  { name: "South Africa", currency: "ZAR" },
  { name: "Kenya", currency: "KSh" },
  { name: "United States", currency: "$" },
  { name: "Canada", currency: "CAD" },
  { name: "UAE", currency: "AED" },
  { name: "India", currency: "₹" },
  { name: "Europe", currency: "€" },
];

const PRIORITIES = [
  { value: "high", label: "High", color: "text-red-400" },
  { value: "medium", label: "Medium", color: "text-amber-400" },
  { value: "low", label: "Low", color: "text-white/40" },
];

const statusInfo = (s: string) => STATUSES.find(st => st.value === s) || STATUSES[0];
const milestoneInfo = (m: string) => MILESTONE_TYPES.find(mt => mt.value === m) || MILESTONE_TYPES[4];
const priorityInfo = (p: string) => PRIORITIES.find(pr => pr.value === p) || PRIORITIES[1];

function DroppableColumn({ id, isDragTarget, children }: { id: string; isDragTarget: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`bg-[#1a0209]/80 border border-[#4a0a1e] border-t-0 rounded-b-xl p-3 space-y-3 transition-all ${isDragTarget ? 'bg-[#2a020d]/80 border-white/20' : ''}`}
      style={{ minHeight: '300px', maxHeight: '70vh', overflowY: 'auto' }}
    >
      {children}
    </div>
  );
}

function SortableProspectCard({ prospect: p, isDragging, isAutoHigh, stale, planner, onOpen, onEmail, onWhatsApp, onStageChange }: {
  prospect: Prospect;
  isDragging: boolean;
  isAutoHigh: boolean;
  stale: boolean;
  planner?: any;
  onOpen: (p: Prospect) => void;
  onEmail: (e: React.MouseEvent) => void;
  onWhatsApp: (e: React.MouseEvent) => void;
  onStageChange: (v: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: p.id! });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const mi = milestoneInfo(p.milestone_type);
  const MIcon = mi.icon;

  const emailHref = p.contact_email || "";
  const whatsappNumber = (p.contact_info || p.contact_name || p.contact_email || "").replace(/[^\d+]/g, "");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[#2a020d] border rounded-xl p-4 cursor-pointer transition-all group ${stale ? 'border-red-500/30' : 'border-[#4a0a1e]'} hover:border-[#8B1538] hover:shadow-lg hover:shadow-[#8B1538]/10 overflow-hidden`}
      onClick={() => onOpen(p)}
    >
      <div className="flex items-start gap-3 mb-2">
        <button {...attributes} {...listeners} className="mt-1 text-white/40 hover:text-white/70 cursor-grab active:cursor-grabbing flex-shrink-0" onClick={e => e.stopPropagation()}>
          <GripVertical className="w-4 h-4" />
        </button>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#330311]`}>
          <MIcon className={`w-4 h-4 ${mi.color}`} />
        </div>
        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center gap-1 flex-wrap">
            <h4 className="text-sm font-semibold text-white leading-tight break-words">{p.company_name}</h4>
            {(p.priority === "high" || isAutoHigh) && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
          </div>
          {p.contact_name && (
            <p className="text-xs flex items-center gap-1 mt-0.5 min-w-0 flex-wrap">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.contact_confidence === "High" ? "bg-green-400" : p.contact_confidence === "Medium" ? "bg-amber-400" : "bg-white/30"}`} />
              <span className="text-blue-400/80 font-medium break-words">{p.contact_name}</span>
              {p.contact_title && <span className="text-white/40 break-words">· {p.contact_title}</span>}
            </p>
          )}
          {!p.contact_name && p.industry && <p className="text-xs text-white/50 mt-0.5 break-words">{p.industry}</p>}
        </div>
      </div>

      {(p.country || p.location) && (
        <p className="text-xs text-white/40 flex items-center gap-1.5 mb-1 break-words">
          <MapPin className="w-3 h-3 flex-shrink-0" />{p.country || p.location}
        </p>
      )}

      {p.estimated_value && (
        <p className="text-xs text-emerald-400/80 flex items-center gap-1 mb-1">
          <DollarSign className="w-3 h-3" />{formatCurrency(p.estimated_value, p.currency)}
        </p>
      )}

      {p.milestone_detail && <p className="text-xs text-amber-400/70 mt-1.5 break-words line-clamp-3">{p.milestone_detail}</p>}

      {stale && (
        <p className="text-[10px] text-red-400/80 flex items-center gap-1 mt-1.5">
          <AlertTriangle className="w-3 h-3" /> Last contact: {timeAgo(p.last_contacted_at)}
        </p>
      )}
      {!stale && p.last_contacted_at && (
        <p className="text-[10px] text-white/30 mt-1.5">Last contact: {timeAgo(p.last_contacted_at)}</p>
      )}

      {planner && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-5 h-5 rounded-full bg-[#8B1538] flex items-center justify-center">
            <span className="text-[9px] text-white font-bold">{(planner.full_name || planner.email || "?").charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-[10px] text-white/40">{(planner.full_name || planner.email || "").split(" ")[0]}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
        <button
          className="h-7 px-2 text-xs text-white/70 hover:text-white flex items-center gap-1 rounded-lg hover:bg-white/10 disabled:opacity-40"
          onClick={onEmail}
          disabled={!emailHref}
          type="button"
        >
          <Mail className="w-3.5 h-3.5" />
        </button>
        <button
          className="h-7 px-2 text-xs text-[#25D366] flex items-center gap-1 rounded-lg hover:bg-[#25D366]/10 disabled:opacity-40"
          onClick={onWhatsApp}
          disabled={!whatsappNumber}
          type="button"
        >
          <Phone className="w-3.5 h-3.5" />
        </button>
        <Select value={p.status} onValueChange={onStageChange}>
          <SelectTrigger className="h-7 w-8 text-xs bg-transparent border-white/10 text-white/40 p-1 ml-auto rounded-lg" onClick={e => e.stopPropagation()}>
            <ChevronRight className="w-3.5 h-3.5" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ── Discovery Health Panel ───────────────────────────────────────────────────
function DiscoveryHealthPanel() {
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(false);
  const [runningCH, setRunningCH] = useState(false);
  const [runningRSS, setRunningRSS] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const token = localStorage.getItem("token") || localStorage.getItem("tender_token") || "";

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["/api/admin/prospects/quarantine-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/prospects/quarantine-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  async function runVerification() {
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/prospects/run-verification", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({
        title: "Verification Complete",
        description: `${data.verified} verified, ${data.failed} could not be verified out of ${data.batchSize} checked.`,
      });
      refetchStats();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  }

  async function runDiscovery(source: "companies-house" | "funding-rss", setLoading: (v: boolean) => void) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/discovery/${source}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({
        title: source === "companies-house" ? "Companies House Scan Started" : "Funding RSS Scan Started",
        description: data.message || "Running in background. Refresh stats in a minute.",
      });
      setTimeout(() => { refetchStats(); }, 8000);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const s = (stats as any)?.stats;
  const pendingVerification = Number(s?.pending_verification || 0);
  const verificationFailed = Number(s?.verification_failed || 0);
  const active = Number(s?.active || 0);
  const total = Number(s?.total || 0);
  const recentRuns: any[] = (stats as any)?.recent_runs || [];

  return (
    <div className="bg-[#1a0208] border border-[#4a0a1e] rounded-lg mb-4 overflow-hidden">
      {/* Header bar */}
      <div
        className="flex flex-wrap items-center gap-3 p-3 cursor-pointer hover:bg-[#2a020d] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <Sparkles className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
        <span className="text-[#C9A84C] text-sm font-semibold">Discovery Engine</span>
        <div className="flex items-center gap-4 text-xs text-white/60">
          <span className="text-emerald-400 font-semibold">{active}</span>
          <span className="text-white/40">active</span>
          {pendingVerification > 0 && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded text-[10px]">
              {pendingVerification} awaiting verification
            </span>
          )}
          {verificationFailed > 0 && (
            <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded text-[10px]">
              {verificationFailed} failed verification
            </span>
          )}
          <span className="text-white/30">of {total} total</span>
        </div>
        <ChevronRight className={`w-4 h-4 text-white/30 ml-auto transition-transform ${expanded ? "rotate-90" : ""}`} />
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-[#4a0a1e] p-3 space-y-3">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-[#8B1538] hover:bg-[#a01a42] text-white text-xs h-7"
              onClick={() => runDiscovery("companies-house", setRunningCH)}
              disabled={runningCH}
              title="Scan Companies House for UK companies with 5/10/15/20/25/30-year anniversaries"
            >
              {runningCH ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Scanning…</> : <><Building2 className="w-3 h-3 mr-1" /> Companies House Scan</>}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-[#4a0a1e] text-white/70 text-xs h-7 hover:bg-[#2a020d]"
              onClick={() => runDiscovery("funding-rss", setRunningRSS)}
              disabled={runningRSS}
              title="Parse TechCrunch, Tech.eu, Techcabal for freshly funded companies"
            >
              {runningRSS ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Fetching…</> : <><Zap className="w-3 h-3 mr-1" /> Funding RSS Scan</>}
            </Button>
            {pendingVerification > 0 && (
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-black text-xs h-7"
                onClick={runVerification}
                disabled={verifying}
                title="Run RocketReach → Hunter.io waterfall on up to 50 quarantined prospects"
              >
                {verifying ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Verifying…</> : <><RefreshCw className="w-3 h-3 mr-1" /> Run Verification (batch 50)</>}
              </Button>
            )}
          </div>

          {/* Pipeline note */}
          <p className="text-[10px] text-white/40 leading-relaxed">
            All discovered prospects are <span className="text-amber-400">quarantined</span> until verified via the RocketReach waterfall.
            Only verified prospects with real contact emails enter the 7:30 AM morning email queue.
          </p>

          {/* Recent runs */}
          {recentRuns.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-white/40 uppercase tracking-wide">Recent Discovery Runs</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {recentRuns.map((run: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-white/50">
                    <span className="text-white/30 w-20 flex-shrink-0">{new Date(run.ran_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                    <span className="font-mono text-white/60 w-32 flex-shrink-0 truncate">{run.source}</span>
                    <span className="text-emerald-400">{run.candidates_inserted} inserted</span>
                    <span className="text-white/30">/ {run.candidates_found} found</span>
                    {run.geography && <span className="text-white/30">({run.geography.toUpperCase()})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProspectFinder() {
  const { toast } = useToast();
  useLocation();

  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [activeTab, setActiveTab] = useState(() => {
    const t = urlParams.get("tab");
    return ["pipeline", "saved", "outreach", "marketing", "search", "contact-intel", "approval"].includes(t || "")
      ? (t as string)
      : "pipeline";
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMilestone, setFilterMilestone] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["GB", "NG"]);
  const [countrySearchInput, setCountrySearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Prospect[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [autoContactMap, setAutoContactMap] = useState<Record<string, any>>({});
  const [autoContactLoading, setAutoContactLoading] = useState<Record<string, boolean>>({});
  const [searchType, setSearchType] = useState("all");
  const [selectedSources, setSelectedSources] = useState<string[]>(["web"]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);

  const [formName, setFormName] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formMilestone, setFormMilestone] = useState("general");
  const [formDetail, setFormDetail] = useState("");
  const [formFoundedYear, setFormFoundedYear] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formPriority, setFormPriority] = useState("medium");

  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailProspect, setEmailProspect] = useState<Prospect | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState({ subject: "", body: "", to: "", person_in_charge: "", vendor_info: "" });
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  const [outreachRecommendations, setOutreachRecommendations] = useState<any[]>([]);
  const [isLoadingOutreach, setIsLoadingOutreach] = useState(false);
  const [hasLoadedOutreach, setHasLoadedOutreach] = useState(false);
  const [batchEmails, setBatchEmails] = useState<any[]>([]);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [selectedForOutreach, setSelectedForOutreach] = useState<Set<number>>(new Set());
  const [activeBatchEmail, setActiveBatchEmail] = useState<any | null>(null);

  const [marketingServices, setMarketingServices] = useState<string[]>([]);
  const [marketingRegions, setMarketingRegions] = useState<string[]>([]);
  const [marketingTone, setMarketingTone] = useState("professional");
  const [marketingSelectedProspects, setMarketingSelectedProspects] = useState<Set<number>>(new Set());
  const [marketingEmails, setMarketingEmails] = useState<any[]>([]);
  const [isGeneratingMarketing, setIsGeneratingMarketing] = useState(false);
  const [activeMarketingEmail, setActiveMarketingEmail] = useState<any | null>(null);
  const [marketingIncludeVideo, setMarketingIncludeVideo] = useState(false);
  const [verifyingProspectId, setVerifyingProspectId] = useState<number | null>(null);
  const [verifiedProspectContacts, setVerifiedProspectContacts] = useState<Record<number, any>>({});
  const [filterPlanner, setFilterPlanner] = useState("all");

  // DnD state
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Save-to-prospect state (Contact Intel)
  const [showSaveContactDialog, setShowSaveContactDialog] = useState(false);
  const [saveContactResult, setSaveContactResult] = useState<any>(null);
  const [saveContactSearch, setSaveContactSearch] = useState("");
  const [saveContactProspectId, setSaveContactProspectId] = useState<number | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Sequences panel on Outreach tab
  const [showSequencesPanel, setShowSequencesPanel] = useState(false);
  const [sequencePanelProspects, setSequencePanelProspects] = useState<any[]>([]);
  const [isGeneratingSequences, setIsGeneratingSequences] = useState(false);
  const [sequenceApprovedIds, setSequenceApprovedIds] = useState<Set<number>>(new Set());

  // EP-Powered Contact Verification standalone state
  const [contactLookupCompany, setContactLookupCompany] = useState("");
  const [contactLookupWebsite, setContactLookupWebsite] = useState("");
  const [contactLookupContext, setContactLookupContext] = useState("events");
  const [contactLookupResult, setContactLookupResult] = useState<any>(null);
  const [contactLookupHistory, setContactLookupHistory] = useState<any[]>([]);
  const [isContactLookupLoading, setIsContactLookupLoading] = useState(false);

  // Campaign Manager state
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignFormName, setCampaignFormName] = useState("");
  const [campaignFormAudience, setCampaignFormAudience] = useState("");
  const [campaignFormTone, setCampaignFormTone] = useState("professional");
  const [campaignFormApproval, setCampaignFormApproval] = useState("manual");
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isRunningCampaign, setIsRunningCampaign] = useState<number | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  // Approval Queue state
  const [approvalFilter, setApprovalFilter] = useState<"pending" | "approved" | "rejected" | "sent">("pending");
  const [editingEmailId, setEditingEmailId] = useState<number | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState<number | null>(null);
  const [findingContactId, setFindingContactId] = useState<number | null>(null);

  async function runContactLookup() {
    if (!contactLookupCompany.trim()) return;
    setIsContactLookupLoading(true);
    setContactLookupResult(null);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/company-prospects/verify-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ company_name: contactLookupCompany, website: contactLookupWebsite, context: contactLookupContext })
      });
      const data = await res.json();
      if (res.ok) {
        setContactLookupResult(data);
        setContactLookupHistory(prev => [{
          company: contactLookupCompany, website: contactLookupWebsite, result: data, ts: new Date().toISOString()
        }, ...prev.slice(0, 9)]);
        toast({ title: "Contact Found", description: `${data.contact_name} — ${data.confidence} confidence` });
      } else {
        toast({ title: "Lookup Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Contact lookup failed", variant: "destructive" });
    }
    setIsContactLookupLoading(false);
  }

  async function verifyProspectContact(prospect: Prospect) {
    if (!prospect.id) return;
    setVerifyingProspectId(prospect.id);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/company-prospects/verify-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          company_name: prospect.company_name,
          website: prospect.website,
          company_number: (prospect as any).company_number || null,
          current_contact_name: prospect.contact_info?.split(",")[0]?.trim(),
          context: "events"
        })
      });
      const data = await res.json();
      if (res.ok) {
        setVerifiedProspectContacts(prev => ({ ...prev, [prospect.id!]: data }));
        toast({ title: "Contact Verified", description: `Found: ${data.contact_name} (${data.confidence} confidence)` });
      } else {
        toast({ title: "Verification Failed", description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to verify contact", variant: "destructive" });
    }
    setVerifyingProspectId(null);
  }

  const generateEmailMutation = useMutation({
    mutationFn: async (prospect: Prospect) => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch(`/api/company-prospects/${prospect.id}/generate-email`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to generate email");
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedEmail({ 
        subject: data.subject, 
        body: data.body, 
        to: data.email || "", 
        person_in_charge: data.person_in_charge || "",
        vendor_info: data.vendor_registration_info || ""
      });
      setIsGeneratingEmail(false);
      setShowEmailDialog(true);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setIsGeneratingEmail(false);
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      return apiRequest("POST", `/api/company-prospects/${emailProspect?.id}/send-email`, data);
    },
    onSuccess: () => {
      toast({ title: "Email Sent", description: "Your outreach email has been sent to the prospect." });
      setShowEmailDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/company-prospects"] });
    }
  });

  const handleWhatsAppClick = (p: Prospect) => {
    const rawPhone = p.contact_info;
    if (!rawPhone || rawPhone.trim() === "") {
      toast({ title: "No phone number", description: "Add a phone number to this prospect to enable WhatsApp.", variant: "destructive" });
      return;
    }
    const prospectName = p.contact_name || p.company_name;
    const msgText = `Hi ${prospectName}, I hope this message finds you well. I am reaching out from Event Perfekt — we specialise in corporate events, programme delivery, and strategic experiences. I wanted to connect and explore whether there might be an opportunity to work together. Please feel free to reply here at your convenience.`;
    const message = encodeURIComponent(msgText);

    // Normalise phone number — strip all non-digits
    let digits = rawPhone.replace(/\D/g, "");
    // Fix leading zero based on country
    if (digits.startsWith("0")) {
      const country = (p.country || "").toLowerCase();
      if (country.includes("nigeria") || country.includes("ng")) {
        digits = "234" + digits.slice(1);
      } else {
        // Default to UK (+44) for all other prospects with leading zero
        digits = "44" + digits.slice(1);
      }
    }
    window.open(`https://wa.me/${digits}?text=${message}`, "_blank");
  };

  const handleSendEmailClick = (p: Prospect) => {
    setEmailProspect(p);
    setIsGeneratingEmail(true);
    generateEmailMutation.mutate(p);
  };

  const loadAgentOutreach = async () => {
    setIsLoadingOutreach(true);
    setHasLoadedOutreach(true);
    setBatchEmails([]);
    setSelectedForOutreach(new Set());
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/company-prospects/agent-outreach", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        let friendlyMessage = "Agent Outreach is temporarily unavailable — please try again in a moment.";
        try {
          const errBody = await res.json();
          if (errBody && (errBody.message || errBody.error)) {
            friendlyMessage = errBody.message || errBody.error;
          }
        } catch {}
        throw new Error(friendlyMessage);
      }
      const data = await res.json();
      setOutreachRecommendations(data.recommendations || []);
      const allIds = new Set<number>((data.recommendations || []).map((r: any) => r.id));
      setSelectedForOutreach(allIds);
    } catch (err: any) {
      toast({
        title: "Could not reach the Agent service — please try again",
        description: err.message || "Agent Outreach is temporarily unavailable — please try again in a moment.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingOutreach(false);
    }
  };

  useEffect(() => {
    if (activeTab === "outreach" && !hasLoadedOutreach && !isLoadingOutreach) {
      loadAgentOutreach();
    }
  }, [activeTab]);

  // Restore search results from sessionStorage on mount
  useEffect(() => {
    const cached = sessionStorage.getItem("prospect_search_results");
    if (cached) {
      try { setSearchResults(JSON.parse(cached)); } catch (_) {}
    }
  }, []);

  // Persist search results to sessionStorage
  useEffect(() => {
    if (searchResults.length > 0) {
      sessionStorage.setItem("prospect_search_results", JSON.stringify(searchResults));
    }
  }, [searchResults]);

  const generateBatchEmails = async () => {
    const ids = Array.from(selectedForOutreach);
    if (ids.length === 0) {
      toast({ title: "Select prospects", description: "Select at least one prospect to draft emails for.", variant: "destructive" });
      return;
    }
    setIsGeneratingBatch(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/company-prospects/batch-generate-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ prospect_ids: ids })
      });
      if (!res.ok) throw new Error("Failed to generate emails");
      const data = await res.json();
      setBatchEmails(data.emails || []);
      toast({ title: "Emails Ready", description: `${data.emails.length} emails drafted and ready to review.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const sendBatchEmail = async (email: any) => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch(`/api/company-prospects/${email.prospect_id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ subject: email.subject, body: email.body, to: email.to })
      });
      if (!res.ok) throw new Error("Failed to send email");
      toast({ title: "Sent!", description: `Email sent to ${email.company_name}` });
      setBatchEmails(prev => prev.map(e => e.prospect_id === email.prospect_id ? { ...e, sent: true } : e));
      queryClient.invalidateQueries({ queryKey: ["/api/company-prospects"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleOutreachSelection = (id: number) => {
    setSelectedForOutreach(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMarketingService = (service: string) => {
    setMarketingServices(prev => prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]);
  };

  const toggleMarketingRegion = (region: string) => {
    setMarketingRegions(prev => prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]);
  };

  const toggleMarketingProspect = (id: number) => {
    setMarketingSelectedProspects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateMarketingCampaign = async () => {
    if (marketingServices.length === 0) {
      toast({ title: "Select Services", description: "Please select at least one service to market.", variant: "destructive" });
      return;
    }
    const ids = Array.from(marketingSelectedProspects);
    if (ids.length === 0) {
      toast({ title: "Select Prospects", description: "Please select prospects to send marketing to.", variant: "destructive" });
      return;
    }
    setIsGeneratingMarketing(true);
    setMarketingEmails([]);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/company-prospects/marketing-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ prospect_ids: ids, services: marketingServices, regions: marketingRegions, tone: marketingTone, includeVideo: marketingIncludeVideo })
      });
      if (!res.ok) throw new Error("Failed to generate marketing emails");
      const data = await res.json();
      setMarketingEmails(data.emails || []);
      toast({ title: "Campaign Ready", description: `${data.emails?.length || 0} marketing emails drafted!` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsGeneratingMarketing(false);
    }
  };

  const sendMarketingEmail = async (email: any) => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch(`/api/company-prospects/${email.prospect_id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ subject: email.subject, body: email.body, to: email.to })
      });
      if (!res.ok) throw new Error("Failed to send email");
      toast({ title: "Sent!", description: `Marketing email sent to ${email.company_name}` });
      setMarketingEmails(prev => prev.map(e => e.prospect_id === email.prospect_id ? { ...e, sent: true } : e));
      queryClient.invalidateQueries({ queryKey: ["/api/company-prospects"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const { data: campaigns = [], refetch: refetchCampaigns } = useQuery<any[]>({
    queryKey: ["/api/prospect-campaigns"],
    queryFn: async () => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/prospect-campaigns", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: prospects = [], isLoading } = useQuery<Prospect[]>({
    queryKey: ["/api/company-prospects", filterStatus, filterMilestone, filterCountry, selectedCampaignId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterMilestone !== "all") params.set("milestone", filterMilestone);
      if (filterCountry !== "all") params.set("country", filterCountry);
      if (selectedCampaignId) params.set("campaign_id", String(selectedCampaignId));
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch(`/api/company-prospects?${params}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch prospects");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const { data: countryCounts = [] } = useQuery<{ country: string; count: number }[]>({
    queryKey: ["/api/company-prospects/countries"],
    queryFn: async () => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/company-prospects/countries", { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: planners = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/users", { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.filter((u: any) => ["admin", "planner", "manager"].includes(u.role)) : [];
    },
  });

  // Approval Queue queries
  const { data: pendingCount = { count: 0 }, refetch: refetchCount } = useQuery<{ count: number }>({
    queryKey: ["/api/pending-outreach/count"],
    queryFn: async () => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/pending-outreach/count", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    refetchInterval: 60000,
  });

  // ── Suppressions ─────────────────────────────────────────────────────────
  const [suppressionSearch, setSuppressionSearch] = useState("");
  const [addSuppressionEmail, setAddSuppressionEmail] = useState("");
  const [addSuppressionNotes, setAddSuppressionNotes] = useState("");
  const { data: suppressions = [], refetch: refetchSuppressions } = useQuery<any[]>({
    queryKey: ["/api/suppressions", suppressionSearch],
    queryFn: async () => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const url = suppressionSearch ? `/api/suppressions?search=${encodeURIComponent(suppressionSearch)}` : "/api/suppressions";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: true,
  });

  const addSuppressionMutation = useMutation({
    mutationFn: async (data: { email: string; reason: string; notes?: string }) => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/suppressions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add suppression");
      return res.json();
    },
    onSuccess: () => { setAddSuppressionEmail(""); setAddSuppressionNotes(""); refetchSuppressions(); },
  });

  const removeSuppressionMutation = useMutation({
    mutationFn: async (email: string) => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch(`/api/suppressions/${encodeURIComponent(email)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to remove suppression");
      return res.json();
    },
    onSuccess: () => refetchSuppressions(),
  });

  // ── Replies inbox ─────────────────────────────────────────────────────────
  const [replyFilter, setReplyFilter] = useState("all");
  const [isPollPending, setIsPollPending] = useState(false);
  const { data: replies = [], refetch: refetchReplies } = useQuery<any[]>({
    queryKey: ["/api/replies"],
    queryFn: async () => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/replies", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const patchReplyMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; actioned?: boolean; classification?: string; notes?: string }) => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch(`/api/replies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update reply");
      return res.json();
    },
    onSuccess: () => refetchReplies(),
  });

  const pollInbox = async () => {
    setIsPollPending(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      await fetch("/api/replies/poll", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      await refetchReplies();
    } finally { setIsPollPending(false); }
  };

  const { data: pendingEmails = [], refetch: refetchPendingEmails, isLoading: isLoadingPending } = useQuery<any[]>({
    queryKey: ["/api/pending-outreach", approvalFilter, selectedCampaignId],
    queryFn: async () => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const params = new URLSearchParams({ status: approvalFilter });
      if (selectedCampaignId) params.set("campaign_id", String(selectedCampaignId));
      const res = await fetch(`/api/pending-outreach?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: true,
    enabled: activeTab === "approval",
  });

  async function approveEmail(id: number) {
    setApprovingId(id);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch(`/api/pending-outreach/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: data.sent ? "Email sent!" : "Email approved", description: data.sent ? "The email was sent successfully." : data.warning });
        refetchPendingEmails();
        refetchCount();
      } else {
        toast({ title: "Error", description: data.error || "Failed to approve", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  }

  async function rejectEmail(id: number, reason: string) {
    setRejectingId(id);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      await fetch(`/api/pending-outreach/${id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      toast({ title: "Email rejected" });
      refetchPendingEmails();
      refetchCount();
      setShowRejectDialog(null);
      setRejectReason("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRejectingId(null);
    }
  }

  async function saveEmailEdit(id: number) {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      await fetch(`/api/pending-outreach/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, body: editBody }),
      });
      toast({ title: "Saved", description: "Email draft updated." });
      setEditingEmailId(null);
      refetchPendingEmails();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  async function findContactForProspect(prospectId: number) {
    setFindingContactId(prospectId);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch(`/api/company-prospects/${prospectId}/find-contact`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.contactFound) {
        toast({ title: "Contact found!", description: data.emailDrafted ? "Contact found and email drafted." : "Contact found (no email available to draft)." });
        refetchPendingEmails();
        refetchCount();
        queryClient.invalidateQueries({ queryKey: ["/api/company-prospects"] });
      } else {
        toast({ title: "Contact not found", description: "Could not find a decision-maker for this company.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setFindingContactId(null);
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      return apiRequest("POST", "/api/company-prospects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-prospects"] });
      toast({ title: "Prospect Added" });
      resetForm();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      return apiRequest("PATCH", `/api/company-prospects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-prospects"] });
      toast({ title: "Prospect Updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      return apiRequest("DELETE", `/api/company-prospects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-prospects"] });
      toast({ title: "Prospect Removed" });
    },
  });

  const bulkSaveMutation = useMutation({
    mutationFn: (data: any) => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      return apiRequest("POST", "/api/company-prospects/bulk-save", data);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-prospects"] });
      toast({ title: "Prospects Saved", description: `${result.saved} new prospects added` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setShowAddForm(false); setEditingProspect(null);
    setFormName(""); setFormIndustry(""); setFormLocation(""); setFormWebsite("");
    setFormMilestone("general"); setFormDetail(""); setFormFoundedYear("");
    setFormContact(""); setFormNotes(""); setFormPriority("medium");
  };

  const handleSubmitForm = () => {
    if (!formName.trim()) { toast({ title: "Company name required", variant: "destructive" }); return; }
    const data = {
      company_name: formName, industry: formIndustry || null, location: formLocation || null,
      website: formWebsite || null, milestone_type: formMilestone, milestone_detail: formDetail || null,
      founded_year: formFoundedYear ? parseInt(formFoundedYear) : null,
      contact_info: formContact || null, notes: formNotes || null, priority: formPriority,
    };
    if (editingProspect?.id) updateMutation.mutate({ id: editingProspect.id, data });
    else createMutation.mutate(data);
  };

  const openEdit = (p: Prospect) => {
    setEditingProspect(p); setFormName(p.company_name); setFormIndustry(p.industry || "");
    setFormLocation(p.location || ""); setFormWebsite(p.website || "");
    setFormMilestone(p.milestone_type); setFormDetail(p.milestone_detail || "");
    setFormFoundedYear(p.founded_year ? String(p.founded_year) : "");
    setFormContact(p.contact_info || ""); setFormNotes(p.notes || "");
    setFormPriority(p.priority || "medium"); setShowAddForm(true);
  };

  const convertMutation = useMutation({
    mutationFn: (id: number) => {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      return apiRequest("POST", `/api/company-prospects/${id}/convert`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-prospects"] });
      toast({ 
        title: "Success", 
        description: "Prospect converted to event successfully!" 
      });
      window.location.href = `/event-dashboard/${data.eventId}`;
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const autoEnrichContact = async (company_name: string, website: string | null) => {
    const key = company_name;
    if (autoContactMap[key] || autoContactLoading[key]) return;
    setAutoContactLoading(prev => ({ ...prev, [key]: true }));
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/company-prospects/verify-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ company_name, website: website || "", context: "events" }),
      });
      if (res.ok) {
        const data = await res.json();
        setAutoContactMap(prev => ({ ...prev, [key]: data }));
      }
    } catch (_) {}
    finally {
      setAutoContactLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const runSearch = async () => {
    setIsSearching(true);
    setSearchResults([]);
    setAutoContactMap({});
    setAutoContactLoading({});
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/company-prospects/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          search_type: searchType === "all" ? null : searchType,
          countries: selectedCountries,
          sources: selectedSources,
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Search failed");
      }
      
      const result = await res.json();
      const prospects = result.prospects || [];
      setSearchResults(prospects);
      toast({ title: `Found ${result.total} prospects`, description: `${result.queries_run} searches completed` });

      // Auto-enrich contacts in the background — skip for individual leads (contact data pre-populated server-side)
      if (searchType !== "individual_lead") {
        prospects.forEach((p: any, i: number) => {
          setTimeout(() => {
            autoEnrichContact(p.company_name, p.website || null);
          }, i * 1500);
        });
      }
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const saveSelectedResults = (selected: Prospect[]) => {
    if (selected.length === 0) return;
    bulkSaveMutation.mutate({ prospects: selected });
  };

  const filteredProspects = prospects.filter(p =>
    (!searchQuery || p.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.industry || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.location || "").toLowerCase().includes(searchQuery.toLowerCase())) &&
    (filterPlanner === "all" || String(p.assigned_to) === filterPlanner)
  );

  const currentYear = new Date().getFullYear();

  const stats = {
    total: prospects.length,
    newLeads: prospects.filter(p => p.status === "new").length,
    contacted: prospects.filter(p => p.status === "contacted").length,
    meetings: prospects.filter(p => p.status === "meeting").length,
    proposals: prospects.filter(p => p.status === "proposal").length,
    won: prospects.filter(p => p.status === "won").length,
    highPriority: prospects.filter(p => p.priority === "high" || isHighPriorityAuto(p)).length,
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(Number(event.active.id));
  };

  const handleDragOver = (event: any) => {
    const overId = event.over?.id as string;
    if (overId && PIPELINE_STAGES.includes(overId)) {
      setDragOverStage(overId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setDragOverStage(null);
    const { active, over } = event;
    if (!over) return;
    const prospectId = Number(active.id);
    const newStage = String(over.id);
    if (!PIPELINE_STAGES.includes(newStage)) return;
    const prospect = prospects.find(p => p.id === prospectId);
    if (!prospect || prospect.status === newStage) return;
    // Optimistic update via mutation
    updateMutation.mutate({ id: prospectId, data: { status: newStage } });
  };

  // Save contact intel to prospect
  const saveContactToProspect = async (prospectId: number) => {
    if (!saveContactResult || !prospectId) return;
    setIsSavingContact(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch(`/api/company-prospects/${prospectId}/save-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          contact_name: saveContactResult.contact_name,
          contact_title: saveContactResult.contact_title,
          contact_email: saveContactResult.contact_email,
          contact_linkedin: saveContactResult.linkedin_url,
          contact_confidence: saveContactResult.confidence,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/company-prospects"] });
      toast({ title: "Contact saved", description: `Saved to ${updated.company_name}` });
      setShowSaveContactDialog(false);
      setSaveContactResult(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSavingContact(false);
    }
  };

  const createProspectFromContact = async () => {
    const resultData = saveContactResult || contactLookupResult;
    if (!resultData || !contactLookupCompany) return;
    setIsSavingContact(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/company-prospects/from-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          company_name: contactLookupCompany,
          contact_name: resultData.contact_name,
          contact_title: resultData.contact_title,
          contact_email: resultData.contact_email,
          contact_linkedin: resultData.linkedin_url,
          contact_confidence: resultData.confidence,
          website: contactLookupWebsite,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/company-prospects"] });
      toast({ title: "New prospect created", description: `${created.company_name} added to pipeline` });
      setShowSaveContactDialog(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSavingContact(false);
    }
  };

  // Campaign management functions
  const createCampaign = async () => {
    if (!campaignFormName.trim()) { toast({ title: "Campaign name required", variant: "destructive" }); return; }
    setIsCreatingCampaign(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/prospect-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: campaignFormName,
          target_audience: campaignFormAudience || null,
          email_tone: campaignFormTone,
          approval_rule: campaignFormApproval,
          status: "active",
          search_sources: ["web"],
        }),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      const created = await res.json();
      setSelectedCampaignId(created.id);
      setShowCreateCampaign(false);
      setCampaignFormName(""); setCampaignFormAudience("");
      refetchCampaigns();
      toast({ title: "Campaign created!", description: `"${created.name}" is now active` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setIsCreatingCampaign(false); }
  };

  const runCampaignNow = async (id: number) => {
    setIsRunningCampaign(id);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch(`/api/prospect-campaigns/${id}/run-now`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Campaign running", description: `Discovery started for "${data.name || 'campaign'}"` });
        refetchCampaigns();
        queryClient.invalidateQueries({ queryKey: ["/api/company-prospects"] });
      } else {
        toast({ title: "Error", description: data.error || "Could not run campaign", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setIsRunningCampaign(null); }
  };

  const approveAllForCampaign = async () => {
    if (!selectedCampaignId) return;
    setIsApprovingAll(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch(`/api/prospect-campaigns/${selectedCampaignId}/approve-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "All approved!", description: `${data.approved || 0} emails sent, ${data.suppressed || 0} suppressed` });
        refetchPendingEmails();
        refetchCount();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setIsApprovingAll(false); }
  };

  // Generate sequences for selected prospects on Outreach tab
  const generateSequences = async () => {
    const ids = Array.from(selectedForOutreach);
    if (ids.length === 0) {
      toast({ title: "Select prospects", description: "Select at least one prospect first", variant: "destructive" });
      return;
    }
    setIsGeneratingSequences(true);
    // Load sequence data for each selected prospect
    const selected = outreachRecommendations.filter((r: any) => ids.includes(r.id));
    const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
    const enriched = await Promise.all(selected.map(async (rec: any) => {
      try {
        const res = await fetch(`/api/company-prospects/${rec.id}/sequences`, { headers: { Authorization: `Bearer ${token}` } });
        const data = res.ok ? await res.json() : { sequences: [] };
        return { ...rec, sequences: data.sequences || [] };
      } catch { return { ...rec, sequences: [] }; }
    }));
    setSequencePanelProspects(enriched);
    setShowSequencesPanel(true);
    setIsGeneratingSequences(false);
  };

  return (
    <PlannerLayout>
      <header className="bg-gradient-to-r from-[#330311] to-[#1a0209] border-b border-white/10 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B1538] to-[#330311] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Prospect Intelligence</h1>
              <p className="text-white/60 text-sm">Find companies celebrating milestones, anniversaries & events</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" className="bg-[#8B1538] text-white hover:bg-[#6d1029]" onClick={() => { resetForm(); setShowAddForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Prospect
            </Button>
          </div>
        </div>
      </header>

      {/* ── Campaign Manager Bar ─────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-[#1a0209]/60">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setSelectedCampaignId(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                !selectedCampaignId
                  ? "bg-[#8B1538] border-[#8B1538] text-white"
                  : "bg-[#2a020d] border-[#4a0a1e] text-white/50 hover:text-white hover:border-[#8B1538]/50"
              }`}
            >
              <Globe className="w-3 h-3 inline mr-1.5" />All Campaigns
            </button>
            {campaigns.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedCampaignId(prev => prev === c.id ? null : c.id)}
                className={`flex-shrink-0 rounded-lg border transition-all text-left group ${
                  selectedCampaignId === c.id
                    ? "bg-amber-500/15 border-amber-500/50"
                    : "bg-[#2a020d] border-[#4a0a1e] hover:border-amber-500/30"
                }`}
              >
                <div className="px-3 py-1.5 flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.status === 'active' ? 'bg-green-400' : c.status === 'paused' ? 'bg-amber-400' : 'bg-white/25'}`} />
                  <div>
                    <p className={`text-xs font-medium leading-tight ${selectedCampaignId === c.id ? 'text-amber-300' : 'text-white/80'}`}>{c.name}</p>
                    <p className="text-[10px] text-white/30 leading-tight">{c.prospects_found || 0} prospects · {c.pending_emails || 0} pending · {c.emails_sent || 0} sent</p>
                  </div>
                  {selectedCampaignId === c.id && (
                    <button
                      onClick={e => { e.stopPropagation(); runCampaignNow(c.id); }}
                      disabled={isRunningCampaign === c.id}
                      className="ml-1 text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
                      title="Run discovery now"
                    >
                      {isRunningCampaign === c.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Zap className="w-2.5 h-2.5" />}
                      Run
                    </button>
                  )}
                </div>
              </button>
            ))}
            <button
              onClick={() => setShowCreateCampaign(true)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-dashed border-white/20 text-white/35 hover:text-white/70 hover:border-white/35 text-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3 h-3" /> New Campaign
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { val: stats.total, label: "Total Prospects", color: "text-white" },
            { val: stats.newLeads, label: "New Leads", color: "text-blue-400" },
            { val: stats.contacted, label: "Contacted", color: "text-amber-400" },
            { val: stats.meetings, label: "Meetings", color: "text-cyan-400" },
            { val: stats.proposals, label: "Proposals", color: "text-emerald-400" },
            { val: stats.won, label: "Won", color: "text-green-400" },
            { val: stats.highPriority, label: "High Priority", color: "text-red-400" },
          ].map((s, i) => (
            <Card key={i} className="bg-[#2a020d] border-[#4a0a1e]">
              <CardContent className="p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-white/60">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Discovery Health Panel */}
        <DiscoveryHealthPanel />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-[#2a020d] border border-[#4a0a1e]">
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <TrendingUp className="w-4 h-4 mr-2" /> Pipeline
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <Building2 className="w-4 h-4 mr-2" /> All Prospects ({prospects.length})
            </TabsTrigger>
            <TabsTrigger value="outreach" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60"
              onClick={() => { if (outreachRecommendations.length === 0 && !isLoadingOutreach) loadAgentOutreach(); }}>
              <Zap className="w-4 h-4 mr-2" /> Agent Outreach
            </TabsTrigger>
            <TabsTrigger value="marketing" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <Megaphone className="w-4 h-4 mr-2" /> Marketing
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <Search className="w-4 h-4 mr-2" /> Find New Prospects
            </TabsTrigger>
            <TabsTrigger value="contact-intel" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <Target className="w-4 h-4 mr-2" /> Contact Intel
            </TabsTrigger>
            <TabsTrigger value="approval" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60 relative">
              <Mail className="w-4 h-4 mr-2" /> Approval Queue
              {pendingCount.count > 0 && (
                <span className="ml-1.5 bg-amber-500 text-black text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {pendingCount.count}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="suppressions" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <span className="mr-2">🚫</span> Suppressions
              {suppressions.length > 0 && (
                <span className="ml-1.5 bg-red-700 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {suppressions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="replies" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60 relative">
              <span className="mr-2">📥</span> Reply Triage
              {replies.filter((r: any) => !r.actioned && r.classification !== "out_of_office" && r.classification !== "auto_reply").length > 0 && (
                <span className="ml-1.5 bg-green-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {replies.filter((r: any) => !r.actioned && r.classification !== "out_of_office" && r.classification !== "auto_reply").length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-4">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {planners.length > 0 && (
                <Select value={filterPlanner} onValueChange={setFilterPlanner}>
                  <SelectTrigger className="w-[180px] bg-[#2a020d] border-[#4a0a1e] text-white h-8 text-xs"><SelectValue placeholder="All Planners" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Planners</SelectItem>
                    {planners.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <div className="flex rounded-lg border border-[#4a0a1e] overflow-hidden text-xs font-medium">
                {[
                  { value: "all", label: "All" },
                  { value: "UK", label: "🇬🇧 UK" },
                  { value: "Nigeria", label: "🇳🇬 Nigeria" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilterCountry(opt.value)}
                    className={`px-3 py-1.5 transition-colors ${
                      filterCountry === opt.value
                        ? "bg-amber-600 text-white"
                        : "bg-[#2a020d] text-white/50 hover:text-white hover:bg-[#330311]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-white/40 text-xs ml-auto">Drag cards between columns to update stage</p>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4a0a1e #1a0209' }}>
                <div className="flex gap-4" style={{ minWidth: `${STATUSES.length * 260}px` }}>
                  {STATUSES.map(stage => {
                    const stageProspects = filteredProspects.filter(p => p.status === stage.value);
                    const stageValue = stageProspects.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
                    const stageCurrency = stageProspects[0]?.currency || "GBP";
                    const isDragTarget = dragOverStage === stage.value;
                    return (
                      <div key={stage.value} id={stage.value} className={`flex-1 transition-all`} style={{ minWidth: '240px' }}>
                        <div className={`rounded-t-xl px-4 py-3 ${stage.color} border-b-2 ${isDragTarget ? 'ring-2 ring-white/30' : ''} ${stage.headerColor}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wide">{stage.label}</span>
                            <span className="text-xs font-bold bg-black/20 rounded-full w-6 h-6 flex items-center justify-center">{stageProspects.length}</span>
                          </div>
                          {stageValue > 0 && (
                            <p className="text-[10px] text-white/50 mt-1">{formatCurrency(stageValue, stageCurrency)} total</p>
                          )}
                        </div>
                        <SortableContext items={stageProspects.map(p => p.id!)} strategy={verticalListSortingStrategy}>
                          <DroppableColumn id={stage.value} isDragTarget={isDragTarget}>
                            {stageProspects.length === 0 && (
                              <div className={`flex flex-col items-center justify-center py-12 text-white/20 rounded-lg border-2 border-dashed ${isDragTarget ? 'border-white/30 bg-white/5' : 'border-transparent'}`}>
                                <Target className="w-8 h-8 mb-2" />
                                <p className="text-xs italic">{isDragTarget ? 'Drop here' : 'No prospects'}</p>
                              </div>
                            )}
                            {stageProspects.map(p => {
                              const mi = milestoneInfo(p.milestone_type);
                              const MIcon = mi.icon;
                              const isAutoHigh = isHighPriorityAuto(p);
                              const stale = isStale(p.last_contacted_at) && p.status !== "new" && p.status !== "won" && p.status !== "lost";
                              const isDragging = activeDragId === p.id;
                              const planner = planners.find((u: any) => u.id === p.assigned_to);
                              return (
                                <SortableProspectCard
                                  key={p.id}
                                  prospect={p}
                                  isDragging={isDragging}
                                  isAutoHigh={isAutoHigh}
                                  stale={stale}
                                  planner={planner}
                                  onOpen={openEdit}
                                  onEmail={(e) => { e.stopPropagation(); handleSendEmailClick(p); }}
                                  onWhatsApp={(e) => { e.stopPropagation(); handleWhatsAppClick(p); }}
                                  onStageChange={v => updateMutation.mutate({ id: p.id!, data: { status: v } })}
                                />
                              );
                            })}
                          </DroppableColumn>
                        </SortableContext>
                      </div>
                    );
                  })}
                </div>
              </div>
              <DragOverlay>
                {activeDragId ? (() => {
                  const p = prospects.find(p => p.id === activeDragId);
                  if (!p) return null;
                  return (
                    <div className="bg-[#2a020d] border border-[#8B1538] rounded-xl p-4 shadow-2xl opacity-90 rotate-2">
                      <p className="text-white text-sm font-semibold">{p.company_name}</p>
                      <p className="text-white/50 text-xs mt-1">{p.industry}</p>
                    </div>
                  );
                })() : null}
              </DragOverlay>
            </DndContext>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input placeholder="Search prospects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#2a020d] border-[#4a0a1e] text-white placeholder:text-white/40" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px] bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterMilestone} onValueChange={setFilterMilestone}>
                <SelectTrigger className="w-[200px] bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {MILESTONE_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex rounded-lg border border-[#4a0a1e] overflow-hidden text-xs font-medium">
                {[
                  { value: "all", label: "All" },
                  { value: "UK", label: "🇬🇧 UK" },
                  { value: "Nigeria", label: "🇳🇬 Nigeria" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilterCountry(opt.value)}
                    className={`px-3 py-2 transition-colors ${
                      filterCountry === opt.value
                        ? "bg-amber-600 text-white"
                        : "bg-[#2a020d] text-white/50 hover:text-white hover:bg-[#330311]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-white/40 animate-spin" /></div>
            ) : filteredProspects.length === 0 ? (
              <div className="text-center py-20">
                <Sparkles className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white/60 mb-2">{prospects.length === 0 ? "No Prospects Yet" : "No Results"}</h3>
                <p className="text-white/40 mb-4">{prospects.length === 0 ? "Search for companies or add prospects manually" : "Try adjusting your filters"}</p>
                {prospects.length === 0 && (
                  <div className="flex gap-3 justify-center">
                    <Button className="bg-amber-600 text-white hover:bg-amber-700" onClick={() => setActiveTab("search")}>
                      <Search className="w-4 h-4 mr-2" /> Find Prospects
                    </Button>
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => { resetForm(); setShowAddForm(true); }}>
                      <Plus className="w-4 h-4 mr-2" /> Add Manually
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredProspects.map(p => {
                  const mi = milestoneInfo(p.milestone_type);
                  const si = statusInfo(p.status);
                  const pi = priorityInfo(p.priority);
                  const MilestoneIcon = mi.icon;
                  return (
                    <Card key={p.id} className="bg-[#2a020d] border-[#4a0a1e] hover:border-[#8B1538]/50 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#330311]`}>
                            <MilestoneIcon className={`w-5 h-5 ${mi.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-white">{p.company_name}</h3>
                              <Badge className={`text-[10px] ${si.color}`}>{si.label}</Badge>
                              {p.priority === "high" && <Badge className="text-[10px] bg-red-500/20 text-red-300 border-red-500/30">HIGH PRIORITY</Badge>}
                              {p.anniversary_years && <Badge className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30">{p.anniversary_years} years</Badge>}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-white/50 flex-wrap mb-1">
                              {p.industry && <span><Building2 className="w-3 h-3 inline mr-1" />{p.industry}</span>}
                              {(p.country || p.location) && (
                                <span><MapPin className="w-3 h-3 inline mr-1" />{p.country ? `${p.country}${p.location ? `, ${p.location}` : ''}` : p.location}</span>
                              )}
                              {p.founded_year && <span><Calendar className="w-3 h-3 inline mr-1" />Founded {p.founded_year}</span>}
                              {p.milestone_detail && <span className="text-amber-400/70">{p.milestone_detail}</span>}
                            </div>
                            {p.contact_info && <p className="text-xs text-white/40"><Phone className="w-3 h-3 inline mr-1" />{p.contact_info}</p>}
                            {p.notes && <p className="text-xs text-white/40 italic mt-1 truncate max-w-[500px]">{p.notes}</p>}
                            {verifiedProspectContacts[p.id!] && (() => {
                              const vc = verifiedProspectContacts[p.id!];
                              const conf = (vc.confidence || "").toLowerCase();
                              const isHigh = conf === "high";
                              const isMed = conf === "medium";
                              const headerLabel = isHigh ? "EP-VERIFIED CONTACT" : isMed ? "EP AGENT ESTIMATE" : "EP CONTACT ESTIMATE";
                              const headerColor = isHigh ? "text-green-400" : isMed ? "text-amber-400" : "text-red-400";
                              const borderColor = isHigh ? "border-green-500/20 bg-green-950/20" : isMed ? "border-amber-500/20 bg-amber-950/10" : "border-red-500/20 bg-red-950/10";
                              const disclaimer = isHigh
                                ? "Found in public records or company website — treat as reliable, but always confirm before sending."
                                : isMed
                                ? "Email pattern is likely correct. Name & title are inferred and may not be the actual person — verify before outreach."
                                : "Fully estimated. Company may not have a public decision-maker listed. Use with caution.";
                              return (
                                <div className={`mt-2 p-2.5 border rounded text-xs ${borderColor}`}>
                                  <div className={`text-[10px] font-bold tracking-widest uppercase mb-1.5 ${headerColor}`}>{headerLabel}</div>
                                  <div className="grid grid-cols-2 gap-1">
                                    <span className="text-white/50">Name: <span className="text-white font-semibold">{vc.contact_name}</span></span>
                                    <span className="text-white/50">Title: <span className="text-white">{vc.contact_title}</span></span>
                                    <span className="text-white/50">Email: <span className="text-blue-400 font-semibold">{vc.contact_email}</span></span>
                                    {vc.email_pattern && <span className="text-white/50">Pattern: <span className="text-white/70">{vc.email_pattern}</span></span>}
                                  </div>
                                  {vc.linkedin_url && (
                                    <a href={vc.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-400 text-[11px] inline-block mt-1 hover:underline">LinkedIn Profile ↗</a>
                                  )}
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase ${isHigh ? "bg-green-500/20 text-green-400 border border-green-500/30" : isMed ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>{vc.confidence}</span>
                                    {vc.confidence_reason && <span className="text-white/40 text-[11px]">{vc.confidence_reason}</span>}
                                  </div>
                                  <div className={`mt-2 text-[10px] rounded px-2 py-1.5 leading-relaxed ${isHigh ? "bg-green-500/5 text-green-400/70" : isMed ? "bg-amber-500/5 text-amber-400/70" : "bg-red-500/5 text-red-400/70"}`}>
                                    ⚠ {disclaimer}
                                  </div>
                                  {vc.alternative_contacts?.length > 0 && (
                                    <div className="mt-1.5 text-[11px] text-white/40">
                                      Alt: {vc.alternative_contacts.map((a: any, i: number) => (
                                        <span key={i} className="text-white/60">{a.name} ({a.title}) — <span className="text-blue-400">{a.email}</span>{i < vc.alternative_contacts.length - 1 ? " | " : ""}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Select value={p.status} onValueChange={v => updateMutation.mutate({ id: p.id!, data: { status: v } })}>
                              <SelectTrigger className="w-[130px] h-8 text-xs bg-[#330311] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            {updateMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                            {p.website && (
                              <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 h-8 w-8 p-0"
                                onClick={() => window.open(p.website!.startsWith("http") ? p.website! : `https://${p.website}`, "_blank")} title="Visit website">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                            {p.status !== 'won' && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white h-8 text-xs font-bold"
                                  onClick={() => verifyProspectContact(p)}
                                  disabled={verifyingProspectId === p.id}
                                >
                                  {verifyingProspectId === p.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Search className="w-3 h-3 mr-1" />}
                                  {verifiedProspectContacts[p.id!] ? "Re-verify" : "Verify Contact"}
                                </Button>
                                {(p.contact_phone || p.contact_info) && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white h-8 text-xs font-bold"
                                    onClick={() => handleWhatsAppClick(p)}
                                  >
                                    <Phone className="w-3 h-3 mr-1" />
                                    WhatsApp
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-[#8B1538] text-[#8B1538] hover:bg-[#8B1538] hover:text-white h-8 text-xs font-bold"
                                  onClick={() => handleSendEmailClick(p)}
                                  disabled={isGeneratingEmail && emailProspect?.id === p.id}
                                >
                                  {isGeneratingEmail && emailProspect?.id === p.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Mail className="w-3 h-3 mr-1" />}
                                  Contact
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-[#ffffff] text-[#330311] hover:bg-white h-8 text-xs font-bold"
                                  onClick={() => {
                                    if (confirm(`Convert "${p.company_name}" into an active event?`)) {
                                      convertMutation.mutate(p.id!);
                                    }
                                  }}
                                  disabled={convertMutation.isPending}
                                >
                                  {convertMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                                  Add to Event
                                </Button>
                              </div>
                            )}
                            <Button size="sm" variant="ghost" className="text-white/60 hover:text-white h-8 w-8 p-0" onClick={() => openEdit(p)} title="Edit">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                              onClick={() => { if (confirm(`Remove "${p.company_name}"?`)) deleteMutation.mutate(p.id!); }} title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outreach" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" /> Agent Marketing — Agent Outreach
                </h2>
                <p className="text-white/50 text-sm mt-1">Your Agent Marketing analyses your prospects and recommends who to contact right now — with emails ready to send</p>
              </div>
              <Button
                size="sm"
                onClick={loadAgentOutreach}
                disabled={isLoadingOutreach}
                className="bg-[#8B1538] text-white hover:bg-[#6d1029]"
              >
                {isLoadingOutreach ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {isLoadingOutreach ? "Analysing..." : "Refresh Recommendations"}
              </Button>
            </div>

            {isLoadingOutreach && (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-12 flex flex-col items-center justify-center">
                  <div className="relative">
                    <Sparkles className="w-10 h-10 text-amber-400 animate-pulse" />
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                      <div className="w-2 h-2 bg-amber-400 rounded-full absolute -top-1 left-1/2" />
                    </div>
                  </div>
                  <p className="text-white/60 mt-4 text-sm">Your Agent Marketing is analysing your prospects and identifying the best outreach opportunities...</p>
                </CardContent>
              </Card>
            )}

            {!isLoadingOutreach && outreachRecommendations.length === 0 && (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-12 text-center">
                  <Target className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">No prospects available for outreach. Add some prospects first, then come back here.</p>
                </CardContent>
              </Card>
            )}

            {!isLoadingOutreach && outreachRecommendations.length > 0 && (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    onClick={generateSequences}
                    disabled={isGeneratingSequences || selectedForOutreach.size === 0}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold hover:from-amber-600 hover:to-amber-700"
                  >
                    {isGeneratingSequences ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading Sequences...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Generate Sequences ({selectedForOutreach.size})</>
                    )}
                  </Button>
                  <Button
                    onClick={generateBatchEmails}
                    disabled={isGeneratingBatch || selectedForOutreach.size === 0}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 h-9"
                  >
                    {isGeneratingBatch ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Drafting...</>
                    ) : (
                      <><Mail className="w-4 h-4 mr-2" /> Quick Emails</>
                    )}
                  </Button>
                  <span className="text-white/40 text-xs">Generate 4-touch sequences or quick one-off emails</span>
                </div>

                <div className="grid gap-3">
                  {outreachRecommendations.map((rec: any) => {
                    const mi = milestoneInfo(rec.milestone_type);
                    const MIcon = mi.icon;
                    const isSelected = selectedForOutreach.has(rec.id);
                    const hasDraft = batchEmails.find((e: any) => e.prospect_id === rec.id);
                    return (
                      <Card key={rec.id} className={`border transition-all ${isSelected ? 'bg-[#2a020d] border-amber-500/40' : 'bg-[#1a0209] border-[#4a0a1e] opacity-60'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <button
                              onClick={() => toggleOutreachSelection(rec.id)}
                              className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-white/30 hover:border-white/50'}`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-black" />}
                            </button>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#330311]`}>
                              <MIcon className={`w-5 h-5 ${mi.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="text-white font-semibold">{rec.company_name}</h3>
                                  <div className="flex items-center gap-3 mt-0.5 text-xs text-white/50">
                                    {rec.industry && <span>{rec.industry}</span>}
                                    {rec.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{rec.location}</span>}
                                    <Badge className={`text-[10px] ${mi.color.replace('text-', 'bg-').replace('400', '500/20')} ${mi.color} border-0`}>
                                      {mi.label}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isHighPriorityAuto(rec as Prospect) && (
                                    <Badge className="text-[10px] font-bold border-0 bg-orange-500/20 text-orange-300">
                                      ⚡ AUTO HIGH
                                    </Badge>
                                  )}
                                  <Badge className={`text-[10px] font-bold border-0 ${
                                    rec.urgency === 'high' ? 'bg-red-500/20 text-red-300' :
                                    rec.urgency === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                                    'bg-blue-500/20 text-blue-300'
                                  }`}>
                                    {rec.urgency === 'high' ? '🔥 HIGH' : rec.urgency === 'medium' ? '⚡ MEDIUM' : 'LOW'} PRIORITY
                                  </Badge>
                                  <Button size="sm" variant="ghost" className="h-8 text-xs text-blue-400 hover:bg-blue-500/10"
                                    onClick={() => verifyProspectContact(rec as Prospect)}
                                    disabled={verifyingProspectId === rec.id}>
                                    {verifyingProspectId === rec.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Search className="w-3.5 h-3.5 mr-1" />}
                                    {verifiedProspectContacts[rec.id] ? "Re-verify" : "Verify"}
                                  </Button>
                                  {!hasDraft && (
                                    <Button size="sm" variant="ghost" className="h-8 text-xs text-amber-400 hover:bg-amber-500/10"
                                      onClick={() => handleSendEmailClick(rec as Prospect)}>
                                      <Mail className="w-3.5 h-3.5 mr-1" /> Quick Draft
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 p-2.5 bg-black/20 rounded-lg border border-white/5">
                                <p className="text-sm text-white/80">{rec.reason || rec.email_angle}</p>
                                {rec.suggested_subject && (
                                  <p className="text-xs text-amber-400/60 mt-1.5 italic">Suggested subject: "{rec.suggested_subject}"</p>
                                )}
                              </div>

                              {verifiedProspectContacts[rec.id] && (
                                <div className="mt-2 p-2 bg-blue-950/30 border border-blue-500/15 rounded text-xs">
                                  <span className="text-blue-400 font-bold text-[10px] tracking-wider">VERIFIED: </span>
                                  <span className="text-white font-semibold">{verifiedProspectContacts[rec.id].contact_name}</span>
                                  <span className="text-white/40"> — {verifiedProspectContacts[rec.id].contact_title}</span>
                                  <span className="text-blue-400 ml-2">{verifiedProspectContacts[rec.id].contact_email}</span>
                                  <span className={`ml-2 text-[9px] px-1 py-0.5 rounded font-bold ${verifiedProspectContacts[rec.id].confidence === "high" ? "bg-green-500/20 text-green-400" : verifiedProspectContacts[rec.id].confidence === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>{verifiedProspectContacts[rec.id].confidence}</span>
                                </div>
                              )}

                              {hasDraft && (
                                <div className="mt-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                      <Mail className="w-3.5 h-3.5" /> Email Draft Ready
                                    </span>
                                    {hasDraft.sent ? (
                                      <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[10px]">
                                        <CheckCircle className="w-3 h-3 mr-1" /> SENT
                                      </Badge>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <Button size="sm" variant="ghost" className="h-7 text-xs text-white/70 hover:text-white"
                                          onClick={() => setActiveBatchEmail(hasDraft)}>
                                          Edit
                                        </Button>
                                        <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                          onClick={() => sendBatchEmail(hasDraft)}>
                                          <Send className="w-3 h-3 mr-1" /> Send Now
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-1.5 text-xs">
                                    <p className="text-white/60">To: <span className="text-white/80">{hasDraft.to || 'No email found'}</span></p>
                                    <p className="text-white/60">Subject: <span className="text-white/80">{hasDraft.subject}</span></p>
                                    <p className="text-white/60">Role: <span className="text-white/80">{hasDraft.person_in_charge}</span></p>
                                    <p className="text-white/40 mt-2 line-clamp-3 leading-relaxed">{hasDraft.body}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="marketing" className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" /> Service Marketing Campaign
              </h2>
              <p className="text-white/50 text-sm mt-1">Market Event Perfekt's services directly to prospects worldwide. Select services, pick your targets, and your Agent Marketing crafts personalised marketing emails.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" /> Select Services to Promote
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { id: "full_event_planning", label: "Full Event Planning", icon: Crown },
                        { id: "day_coordination", label: "Day Coordination", icon: Calendar },
                        { id: "corporate_events", label: "Corporate Events", icon: Briefcase },
                        { id: "weddings", label: "Weddings", icon: Heart },
                        { id: "catering", label: "Catering Management", icon: Utensils },
                        { id: "decor_design", label: "Decor & Design", icon: Palette },
                        { id: "photography", label: "Photography & Video", icon: Camera },
                        { id: "entertainment", label: "Entertainment", icon: Music },
                        { id: "brand_activations", label: "Brand Activations", icon: Rocket },
                        { id: "conferences", label: "Conferences & Seminars", icon: Building2 },
                        { id: "anniversaries", label: "Anniversaries & Milestones", icon: PartyPopper },
                        { id: "product_launches", label: "Product Launches", icon: Gift },
                      ].map(service => {
                        const SIcon = service.icon;
                        const selected = marketingServices.includes(service.id);
                        return (
                          <button
                            key={service.id}
                            onClick={() => toggleMarketingService(service.id)}
                            className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all text-sm ${
                              selected 
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' 
                                : 'bg-black/20 border-white/10 text-white/50 hover:border-white/20'
                            }`}
                          >
                            <SIcon className={`w-4 h-4 flex-shrink-0 ${selected ? 'text-amber-400' : 'text-white/30'}`} />
                            <span className="text-xs font-medium leading-tight">{service.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-amber-400" /> Target Markets
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {MARKETING_REGIONS_WITH_CURRENCY.map(({ name: region, currency }) => {
                        const selected = marketingRegions.includes(region);
                        return (
                          <button
                            key={region}
                            onClick={() => toggleMarketingRegion(region)}
                            className={`px-3 py-2 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                              selected 
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' 
                                : 'bg-black/20 border-white/10 text-white/40 hover:border-white/20'
                            }`}
                          >
                            {region}
                            <span className={`text-[10px] ${selected ? 'text-emerald-400/80' : 'text-white/25'}`}>{currency}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-white/30 mt-3 italic">Select regions to tailor messaging with correct local currency. Leave empty for general outreach.</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" /> Email Tone
                    </h3>
                    <div className="flex gap-2">
                      {[
                        { id: "professional", label: "Professional & Formal" },
                        { id: "warm", label: "Warm & Inviting" },
                        { id: "luxury", label: "Premium & Exclusive" },
                        { id: "friendly", label: "Friendly & Casual" },
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setMarketingTone(t.id)}
                          className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                            marketingTone === t.id
                              ? 'bg-[#8B1538]/30 border-[#8B1538] text-white'
                              : 'bg-black/20 border-white/10 text-white/40 hover:border-white/20'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Video className="w-4 h-4 text-amber-400" /> Promo Video
                    </h3>
                    <button
                      onClick={() => setMarketingIncludeVideo(!marketingIncludeVideo)}
                      className={`w-full p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        marketingIncludeVideo
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-black/20 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        marketingIncludeVideo ? 'bg-amber-500 border-amber-500' : 'border-white/30'
                      }`}>
                        {marketingIncludeVideo && <Check className="w-3 h-3 text-black" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${marketingIncludeVideo ? 'text-amber-300' : 'text-white/50'}`}>Include Event Perfekt promo video</p>
                        <p className="text-[10px] text-white/30 mt-0.5">Embeds a link to our promotional video in every marketing email</p>
                      </div>
                    </button>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-400" /> Select Prospects ({marketingSelectedProspects.size})
                    </h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4a0a1e #1a0209' }}>
                      {prospects.length === 0 ? (
                        <p className="text-xs text-white/30 text-center py-6">No prospects yet. Add some first.</p>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              if (marketingSelectedProspects.size === prospects.length) {
                                setMarketingSelectedProspects(new Set());
                              } else {
                                setMarketingSelectedProspects(new Set(prospects.filter(p => p.id).map(p => p.id!)));
                              }
                            }}
                            className="text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors mb-1"
                          >
                            {marketingSelectedProspects.size === prospects.length ? 'Deselect All' : 'Select All'}
                          </button>
                          {prospects.map(p => {
                            const isSelected = p.id ? marketingSelectedProspects.has(p.id) : false;
                            return (
                              <button
                                key={p.id}
                                onClick={() => p.id && toggleMarketingProspect(p.id)}
                                className={`w-full p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-all ${
                                  isSelected 
                                    ? 'bg-amber-500/10 border-amber-500/30' 
                                    : 'bg-black/20 border-white/5 hover:border-white/10'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? 'bg-amber-500 border-amber-500' : 'border-white/30'
                                }`}>
                                  {isSelected && <Check className="w-2.5 h-2.5 text-black" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-white font-medium truncate">{p.company_name}</p>
                                  <p className="text-[10px] text-white/30 truncate">{p.industry || 'General'} {p.location ? `· ${p.location}` : ''}</p>
                                </div>
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={generateMarketingCampaign}
                  disabled={isGeneratingMarketing || marketingServices.length === 0 || marketingSelectedProspects.size === 0}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold hover:from-amber-600 hover:to-amber-700 h-12"
                >
                  {isGeneratingMarketing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Crafting Campaign...</>
                  ) : (
                    <><Megaphone className="w-4 h-4 mr-2" /> Generate {marketingSelectedProspects.size} Marketing Emails</>
                  )}
                </Button>
                <p className="text-[10px] text-white/25 text-center">Agent Marketing drafts up to 5 emails at a time in Event Perfekt's brand voice</p>
              </div>
            </div>

            {marketingEmails.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-emerald-400" /> Generated Marketing Emails
                  </h3>
                  <span className="text-xs text-white/40">{marketingEmails.filter(e => e.sent).length}/{marketingEmails.length} sent</span>
                </div>
                <div className="grid gap-4">
                  {marketingEmails.map((email: any, idx: number) => (
                    <Card key={idx} className={`border ${email.sent ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#2a020d] border-[#4a0a1e]'}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-white font-semibold">{email.company_name}</h4>
                            <p className="text-xs text-white/40 mt-0.5">To: {email.to || 'No email found'}</p>
                          </div>
                          {email.sent ? (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[10px]">
                              <CheckCircle className="w-3 h-3 mr-1" /> SENT
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-400 hover:bg-blue-500/10"
                                onClick={() => {
                                  const prospect: Prospect = { company_name: email.company_name, website: email.website, industry: null, location: null, milestone_type: "general", milestone_detail: null, founded_year: null, anniversary_years: null, source: null, source_url: null, contact_info: null, status: "new", notes: null, priority: "medium", id: email.prospect_id };
                                  verifyProspectContact(prospect);
                                }}
                                disabled={verifyingProspectId === email.prospect_id}>
                                {verifyingProspectId === email.prospect_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-white/70 hover:text-white"
                                onClick={() => setActiveMarketingEmail(email)}>
                                Edit
                              </Button>
                              <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                onClick={() => sendMarketingEmail(email)}>
                                <Send className="w-3 h-3 mr-1" /> Send
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="bg-black/20 rounded-lg p-3 space-y-2 text-xs">
                          <p className="text-amber-400/80">Subject: {email.subject}</p>
                          <p className="text-white/50 whitespace-pre-line leading-relaxed line-clamp-4">{email.body}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <Card className="bg-[#2a020d] border-[#4a0a1e]">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" /> Intelligent Prospect Search
                </h3>
                <p className="text-white/50 text-sm mb-4">
                  Search for prospects across the web, Bark.com, and AddToEvent — companies, weddings, charities and parties looking for event services.
                </p>

                {/* Search Sources */}
                <div className="mb-4">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">Search Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "web", label: "🌐 Web Search", desc: "Google-powered prospect discovery" },
                      { key: "bark", label: "🐾 Bark.com", desc: "People posting event service requests" },
                      { key: "addtoevent", label: "📍 AddToEvent", desc: "Live event requests in London & UK" },
                    ].map(s => (
                      <button
                        key={s.key}
                        onClick={() => setSelectedSources(prev =>
                          prev.includes(s.key) ? prev.filter(x => x !== s.key) : [...prev, s.key]
                        )}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                          selectedSources.includes(s.key)
                            ? "bg-amber-600 border-amber-500 text-white"
                            : "bg-[#330311] border-[#4a0a1e] text-white/60 hover:text-white hover:border-white/20"
                        }`}
                        title={s.desc}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger className="w-[230px] bg-[#330311] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types (Comprehensive)</SelectItem>
                      <SelectItem value="anniversary">🎉 Anniversaries & Milestones</SelectItem>
                      <SelectItem value="end_of_year">🎄 End of Year / Christmas</SelectItem>
                      <SelectItem value="product_launch">🚀 Product Launches / Openings</SelectItem>
                      <SelectItem value="celebration">⭐ Celebrations / Awards</SelectItem>
                      <SelectItem value="wedding">💍 Weddings</SelectItem>
                      <SelectItem value="charity">❤️ Charities & Fundraisers</SelectItem>
                      <SelectItem value="party">🎊 Private Parties</SelectItem>
                      <SelectItem value="bark">🐾 Bark Only</SelectItem>
                      <SelectItem value="addtoevent">📍 AddToEvent Only</SelectItem>
                      <SelectItem value="individual_lead">Individual Leads</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Input 
                      placeholder="Search countries..." 
                      value={countrySearchInput} 
                      onChange={(e) => setCountrySearchInput(e.target.value.toUpperCase())}
                      className="bg-[#330311] border-[#4a0a1e] text-white w-[200px]"
                    />
                    {countrySearchInput && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#330311] border border-[#4a0a1e] rounded max-h-48 overflow-y-auto z-10">
                        {COUNTRIES.filter(c => 
                          c.code.includes(countrySearchInput) || 
                          c.name.toUpperCase().includes(countrySearchInput)
                        ).map(country => (
                          <label key={country.code} className="flex items-center gap-2 p-2 hover:bg-[#4a0a1e] text-white text-sm cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={selectedCountries.includes(country.code)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCountries([...selectedCountries, country.code]);
                                } else {
                                  setSelectedCountries(selectedCountries.filter(c => c !== country.code));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            {country.code} - {country.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-white/60 flex items-center gap-1">
                    {selectedCountries.length} {selectedCountries.length === 1 ? "country" : "countries"} selected
                  </div>
                  <Button className="bg-amber-600 text-white hover:bg-amber-700" onClick={runSearch} disabled={isSearching || selectedSources.length === 0}>
                    {isSearching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    {isSearching ? "Searching..." : "Search for Prospects"}
                  </Button>
                </div>

                {/* ── Your Campaigns ───────────────────────────────────────── */}
                <div className="mt-5">
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Megaphone className="w-3.5 h-3.5 text-amber-400" /> Your Campaigns — click a tile to search using its parameters
                  </p>
                  {campaigns.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-[#330311]/30 p-8 text-center">
                      <Megaphone className="w-8 h-8 text-white/20 mx-auto mb-3" />
                      <p className="text-white/50 text-sm font-medium">Create your first campaign to start searching</p>
                      <p className="text-white/30 text-xs mt-1">Go to the Campaign Manager tab and create a campaign — it will appear here as a search tile.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {campaigns.map((camp: any) => {
                        const isActive = selectedCampaignId === camp.id;
                        const locations: any[] = Array.isArray(camp.target_locations) ? camp.target_locations : [];
                        const locationLabel = locations.length > 0
                          ? locations.slice(0, 2).map((l: any) => typeof l === "string" ? l : l.country || l.region || "").filter(Boolean).join(", ") + (locations.length > 2 ? ` +${locations.length - 2}` : "")
                          : "All regions";
                        const sectors: string[] = Array.isArray(camp.target_sectors) ? camp.target_sectors : [];
                        return (
                          <button
                            key={camp.id}
                            type="button"
                            onClick={() => {
                              setSelectedCampaignId(isActive ? null : camp.id);
                              if (!isActive) {
                                const sources: string[] = Array.isArray(camp.search_sources) && camp.search_sources.length > 0
                                  ? camp.search_sources
                                  : ["web"];
                                setSelectedSources(sources);
                                const countryCodes: string[] = locations
                                  .map((l: any) => typeof l === "string" ? l : l.country || "")
                                  .filter(Boolean);
                                if (countryCodes.length > 0) setSelectedCountries(countryCodes);
                                setSearchType("all");
                              }
                            }}
                            className={`rounded-xl p-4 text-left w-full transition-all border group ${
                              isActive
                                ? "bg-amber-600/15 border-amber-500/50 ring-1 ring-amber-500/30"
                                : "bg-[#330311]/50 border-[#4a0a1e] hover:bg-[#330311]/80 hover:border-white/15"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <Megaphone className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isActive ? "text-amber-400" : "text-white/30 group-hover:text-white/50"}`} />
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                camp.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-white/10 text-white/30"
                              }`}>{camp.status}</span>
                            </div>
                            <p className={`text-xs font-semibold leading-snug mb-1 ${isActive ? "text-amber-300" : "text-white"}`}>{camp.name}</p>
                            {sectors.length > 0 && (
                              <p className="text-white/40 text-[10px] leading-tight mb-1 line-clamp-1">{sectors.slice(0, 3).join(" · ")}</p>
                            )}
                            <p className="text-white/30 text-[10px] flex items-center gap-1">
                              <Globe className="w-3 h-3" />{locationLabel}
                            </p>
                            {isActive && (
                              <p className="text-amber-400 text-[10px] mt-2 font-medium">✓ Parameters loaded — click Search</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {isSearching && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
                <p className="text-white/60">
                  {searchType === "individual_lead"
                    ? "Finding individual leads…"
                    : "Searching across the web for prospect companies..."}
                </p>
                <p className="text-white/40 text-sm mt-1">This may take up to 30 seconds</p>
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">{searchResults.length} Prospects Found</h3>
                  <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => saveSelectedResults(searchResults)}
                    disabled={bulkSaveMutation.isPending}>
                    {bulkSaveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save All to Pipeline
                  </Button>
                </div>
                <div className="grid gap-3">
                  {searchResults.map((r: any, i) => {
                    const mi = milestoneInfo(r.milestone_type);
                    const MilestoneIcon = mi.icon;
                    const conf = (r.confidence || "").toLowerCase();
                    const confidenceBadge = conf === "high" ? "bg-green-500/20 text-green-300 border-green-500/30" :
                      conf === "medium" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                      conf === "low" ? "bg-red-500/20 text-red-300 border-red-500/30" : "";
                    const autoContact = autoContactMap[r.company_name];
                    const autoLoading = autoContactLoading[r.company_name];
                    return (
                      <Card key={i} className="bg-[#2a020d] border-[#4a0a1e] hover:border-amber-500/30 transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#330311]">
                              <MilestoneIcon className={`w-5 h-5 ${mi.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-semibold text-white">
                                  {r.milestone_type === "individual_lead" ? (r.contact_name || r.company_name) : r.company_name}
                                </h3>
                                {r.milestone_type === "individual_lead" && (
                                  <Badge className="text-[10px] bg-pink-500/20 text-pink-300 border-pink-500/30">Individual Lead</Badge>
                                )}
                                {r.confidence && (
                                  <Badge className={`text-[10px] ${confidenceBadge}`}>{r.confidence} confidence</Badge>
                                )}
                                {r.priority === "high" && r.milestone_type !== "individual_lead" && <Badge className="text-[10px] bg-red-500/20 text-red-300 border-red-500/30">HIGH PRIORITY</Badge>}
                                {r.source === "Companies House" && <Badge className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30">🏛 Companies House</Badge>}
                                {r.source === "bark" && <Badge className="text-[10px] bg-orange-500/20 text-orange-300 border-orange-500/30">🐾 Bark</Badge>}
                                {r.source === "addtoevent" && <Badge className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30">📍 AddToEvent</Badge>}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-white/50 flex-wrap">
                                {r.milestone_type === "individual_lead" && r.contact_title && (
                                  <span className="text-pink-300/70">{r.contact_title}{r.company_name ? ` · ${r.company_name}` : ""}</span>
                                )}
                                {r.industry && <span><Building2 className="w-3 h-3 inline mr-1" />{r.industry}</span>}
                                {(r.location || r.city) && <span><MapPin className="w-3 h-3 inline mr-1" />{r.city || r.location}</span>}
                                {r.founded_year && r.milestone_type !== "individual_lead" && <span><Calendar className="w-3 h-3 inline mr-1" />Founded {r.founded_year}{r.company_age ? ` (${r.company_age} yrs)` : ''}</span>}
                                {r.milestone_detail && r.milestone_type !== "individual_lead" && <span className="text-amber-400/70">{r.milestone_detail}</span>}
                              </div>
                              {r.reason_for_recommendation && (
                                <p className="text-xs text-white/60 mt-1.5 bg-white/5 rounded px-2 py-1">{r.reason_for_recommendation}</p>
                              )}
                              {!r.reason_for_recommendation && r.snippet && <p className="text-xs text-white/40 mt-1 line-clamp-2">{r.snippet}</p>}
                              {r.source && r.source_url && (
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[10px] text-white/30">Source: {r.source}</span>
                                  <a href={r.source_url} target="_blank" rel="noreferrer"
                                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
                                    onClick={e => e.stopPropagation()}>
                                    View source <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              )}

                              {/* Contact panel */}
                              <div className="mt-3 border-t border-white/5 pt-3">
                                {/* ── Individual lead pre-populated contact ── */}
                                {r.milestone_type === "individual_lead" && (r.contact_name || r.contact_email) && (
                                  <div className="flex items-start gap-3 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.contact_email ? "bg-green-500/20 text-green-400" : "bg-pink-500/20 text-pink-400"}`}>
                                          {r.contact_email ? "I AM HER — VERIFIED" : "I AM HER PROSPECT"}
                                        </span>
                                        <span className="text-[10px] text-white/30">via lead intelligence</span>
                                      </div>
                                      <p className="text-sm font-semibold text-white mt-1">{r.contact_name}</p>
                                      <p className="text-xs text-pink-400/80">{r.contact_title}</p>
                                      {r.contact_email && (
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                          <Mail className="w-3 h-3 text-white/30 flex-shrink-0" />
                                          <span className="text-xs text-white/70 font-mono">{r.contact_email}</span>
                                          {(r as any).email_grade && (
                                            <span className={`text-[9px] px-1 rounded font-bold ${(r as any).email_grade.startsWith("A") ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                                              {(r as any).email_grade}
                                            </span>
                                          )}
                                          <button className="text-[10px] text-white/30 hover:text-white bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors"
                                            onClick={() => { navigator.clipboard.writeText(r.contact_email!); toast({ title: "Email copied" }); }}>
                                            Copy
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex gap-1.5 flex-wrap">
                                      {r.contact_linkedin && (
                                        <a href={r.contact_linkedin} target="_blank" rel="noreferrer"
                                          className="flex items-center gap-1 text-[10px] bg-blue-600/15 text-blue-300 border border-blue-500/20 px-2 py-1 rounded hover:bg-blue-600/25 transition-colors">
                                          <ExternalLink className="w-2.5 h-2.5" /> LinkedIn
                                        </a>
                                      )}
                                      {r.contact_email && (
                                        <a href={`mailto:${r.contact_email}`}
                                          className="flex items-center gap-1 text-[10px] bg-[#8B1538]/20 text-white/60 border border-[#8B1538]/20 px-2 py-1 rounded hover:bg-[#8B1538]/30 transition-colors">
                                          <Mail className="w-2.5 h-2.5" /> Email
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {/* ── Standard auto-enrich panel ── */}
                                {r.milestone_type !== "individual_lead" && autoLoading && (
                                  <div className="flex items-center gap-2 text-xs text-white/40">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Agent finding decision-maker…</span>
                                  </div>
                                )}
                                {r.milestone_type !== "individual_lead" && !autoLoading && autoContact && (
                                  <div className="flex items-start gap-3 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                          autoContact.confidence === "high" ? "bg-green-500/20 text-green-400" :
                                          autoContact.confidence === "medium" ? "bg-amber-500/20 text-amber-400" :
                                          "bg-red-500/20 text-red-400"
                                        }`}>
                                          {autoContact.confidence === "high" ? "EP-VERIFIED CONTACT" :
                                           autoContact.confidence === "medium" ? "EP AGENT ESTIMATE" : "EP CONTACT ESTIMATE"}
                                        </span>
                                        {autoContact.source && (
                                          <span className="text-[10px] text-white/30">via {autoContact.source === "RocketReach" ? "🚀 RocketReach" : autoContact.source === "Website" ? "🌐 Website" : autoContact.source}</span>
                                        )}
                                      </div>
                                      <p className="text-sm font-semibold text-white mt-1">{autoContact.contact_name}</p>
                                      <p className="text-xs text-amber-400/80">{autoContact.contact_title}</p>
                                      {autoContact.contact_email && (
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                          <Mail className="w-3 h-3 text-white/30 flex-shrink-0" />
                                          <span className="text-xs text-white/70 font-mono">{autoContact.contact_email}</span>
                                          {autoContact.email_grade && (
                                            <span className={`text-[9px] px-1 rounded font-bold ${autoContact.email_grade.startsWith("A") ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                                              {autoContact.email_grade}
                                            </span>
                                          )}
                                          <button className="text-[10px] text-white/30 hover:text-white bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors"
                                            onClick={() => { navigator.clipboard.writeText(autoContact.contact_email); toast({ title: "Email copied" }); }}>
                                            Copy
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex gap-1.5 flex-wrap">
                                      {autoContact.linkedin_url && (
                                        <a href={autoContact.linkedin_url} target="_blank" rel="noreferrer"
                                          className="flex items-center gap-1 text-[10px] bg-blue-600/15 text-blue-300 border border-blue-500/20 px-2 py-1 rounded hover:bg-blue-600/25 transition-colors">
                                          <ExternalLink className="w-2.5 h-2.5" /> LinkedIn
                                        </a>
                                      )}
                                      {autoContact.contact_email && (
                                        <a href={`mailto:${autoContact.contact_email}`}
                                          className="flex items-center gap-1 text-[10px] bg-[#8B1538]/20 text-white/60 border border-[#8B1538]/20 px-2 py-1 rounded hover:bg-[#8B1538]/30 transition-colors">
                                          <Mail className="w-2.5 h-2.5" /> Email
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {r.milestone_type !== "individual_lead" && !autoLoading && !autoContact && (
                                  <button
                                    className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors"
                                    onClick={() => autoEnrichContact(r.company_name, r.website || null)}>
                                    <Search className="w-3 h-3" /> Find contact manually
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              {r.website && (
                                <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 h-7 w-7 p-0"
                                  onClick={() => window.open(r.website.startsWith("http") ? r.website : `https://${r.website}`, "_blank")}>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300 h-7 px-2"
                                onClick={() => saveSelectedResults([r])}>
                                <Save className="w-3.5 h-3.5 mr-1" /> <span className="text-xs">Save</span>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {!isSearching && searchResults.length === 0 && (
              <div className="text-center py-12 text-white/40">
                <Target className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p>Click "Search for Prospects" to find companies that may need event services</p>
              </div>
            )}
          </TabsContent>

          {/* EP Agent Contact Intelligence Tab */}
          <TabsContent value="contact-intel" className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" /> EP Agent Contact Intelligence
              </h3>
              <p className="text-white/50 text-sm">Agent finds the real decision-maker at any company — name, title, email, LinkedIn, and confidence level.</p>
            </div>

            {/* Data Source Info Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3 text-center relative">
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Active" />
                <div className="text-lg mb-1">🚀</div>
                <p className="text-violet-300 text-xs font-bold">RocketReach</p>
                <p className="text-white/40 text-[10px] mt-0.5">Verified emails + LinkedIn</p>
                <p className="text-[10px] mt-1 font-semibold text-green-400">● Active</p>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-center relative">
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Active" />
                <div className="text-lg mb-1">🌐</div>
                <p className="text-blue-300 text-xs font-bold">Website Scrape</p>
                <p className="text-white/40 text-[10px] mt-0.5">Reads team/about pages</p>
                <p className="text-[10px] mt-1 font-semibold text-green-400">● Always on</p>
              </div>
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-center relative">
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" title="Needs API key" />
                <div className="text-lg mb-1">🏛</div>
                <p className="text-green-300 text-xs font-bold">Companies House</p>
                <p className="text-white/40 text-[10px] mt-0.5">UK directors (free)</p>
                <p className="text-[10px] mt-1 font-semibold text-amber-400">● Add API key</p>
              </div>
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 text-center relative">
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" title="Optional" />
                <div className="text-lg mb-1">📧</div>
                <p className="text-orange-300 text-xs font-bold">Hunter.io</p>
                <p className="text-white/40 text-[10px] mt-0.5">Domain email search</p>
                <p className="text-[10px] mt-1 font-semibold text-amber-400">● Add API key</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lookup Form */}
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-6 space-y-4">
                  <h4 className="text-white font-semibold">Company Lookup</h4>
                  <div>
                    <Label className="text-white/70 text-xs uppercase tracking-wider">Company Name *</Label>
                    <Input
                      value={contactLookupCompany}
                      onChange={e => setContactLookupCompany(e.target.value)}
                      placeholder="e.g. Unilever, NHS, Barclays, Dangote Group"
                      className="bg-[#330311] border-[#4a0a1e] text-white mt-1"
                      onKeyDown={e => e.key === "Enter" && runContactLookup()}
                    />
                  </div>
                  <div>
                    <Label className="text-white/70 text-xs uppercase tracking-wider">Website (Optional)</Label>
                    <Input
                      value={contactLookupWebsite}
                      onChange={e => setContactLookupWebsite(e.target.value)}
                      placeholder="e.g. unilever.com"
                      className="bg-[#330311] border-[#4a0a1e] text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-white/70 text-xs uppercase tracking-wider">Context</Label>
                    <Select value={contactLookupContext} onValueChange={setContactLookupContext}>
                      <SelectTrigger className="bg-[#330311] border-[#4a0a1e] text-white mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="events">Corporate Events & Celebrations</SelectItem>
                        <SelectItem value="marketing">Marketing & Communications</SelectItem>
                        <SelectItem value="procurement">Procurement & Contracts</SelectItem>
                        <SelectItem value="partnerships">Business Development</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full bg-[#8B1538] hover:bg-[#6d0f2c] text-white"
                    onClick={runContactLookup}
                    disabled={isContactLookupLoading || !contactLookupCompany.trim()}
                  >
                    {isContactLookupLoading
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Researching decision-maker...</>
                      : <><Target className="w-4 h-4 mr-2" /> Find Decision-Maker</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Result Panel */}
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-6">
                  {!contactLookupResult && !isContactLookupLoading && (
                    <div className="text-center py-10 text-white/40">
                      <Target className="w-14 h-14 text-white/20 mx-auto mb-4" />
                      <p className="text-sm">Enter a company name and click "Find Decision-Maker" to get Agent-powered contact intelligence.</p>
                    </div>
                  )}
                  {isContactLookupLoading && (
                    <div className="text-center py-10 text-white/60">
                      <Loader2 className="w-10 h-10 text-amber-400 mx-auto mb-4 animate-spin" />
                      <p className="text-sm">Researching decision-maker...</p>
                    </div>
                  )}
                  {contactLookupResult && !isContactLookupLoading && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-bold text-xs tracking-widest uppercase ${
                          contactLookupResult.confidence === "high" ? "text-green-400" :
                          contactLookupResult.confidence === "medium" ? "text-amber-400" : "text-red-400"
                        }`}>
                          {contactLookupResult.confidence === "high" ? "EP-VERIFIED CONTACT" :
                           contactLookupResult.confidence === "medium" ? "EP AGENT ESTIMATE" : "EP CONTACT ESTIMATE"}
                        </h4>
                        <Badge className={`text-[10px] font-bold uppercase ${
                          contactLookupResult.confidence === "high" ? "bg-green-500/20 text-green-300 border-green-500/30" :
                          contactLookupResult.confidence === "medium" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                          "bg-red-500/20 text-red-300 border-red-500/30"
                        }`}>{contactLookupResult.confidence} confidence</Badge>
                      </div>

                      {/* Disclaimer */}
                      <div className={`text-[11px] rounded-lg px-3 py-2 leading-relaxed ${
                        contactLookupResult.confidence === "high" ? "bg-green-500/5 border border-green-500/15 text-green-400/70" :
                        contactLookupResult.confidence === "medium" ? "bg-amber-500/5 border border-amber-500/15 text-amber-400/70" :
                        "bg-red-500/5 border border-red-500/15 text-red-400/70"
                      }`}>
                        ⚠{" "}
                        {contactLookupResult.confidence === "high"
                          ? "Found in public records — treat as reliable, but always confirm before sending."
                          : contactLookupResult.confidence === "medium"
                          ? "Email pattern is likely correct. Name & title are inferred and may not be the actual person — verify before outreach."
                          : "Fully estimated — no public data found for this company. Use with significant caution."}
                      </div>

                      <div className="bg-[#330311]/60 rounded-lg p-4 space-y-3">
                        <div>
                          <p className="text-white font-bold text-lg">{contactLookupResult.contact_name}</p>
                          <p className="text-amber-400 text-sm">{contactLookupResult.contact_title}</p>
                        </div>

                        {contactLookupResult.contact_email && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Mail className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                            <span className="text-white/90 text-sm font-mono">{contactLookupResult.contact_email}</span>
                            {contactLookupResult.email_grade && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                contactLookupResult.email_grade.startsWith("A") ? "bg-green-500/20 text-green-400" :
                                contactLookupResult.email_grade.startsWith("B") ? "bg-amber-500/20 text-amber-400" :
                                "bg-red-500/20 text-red-400"
                              }`}>Grade {contactLookupResult.email_grade} ✓</span>
                            )}
                            <button
                              className="text-xs text-white/40 hover:text-white bg-white/10 px-2 py-0.5 rounded ml-auto"
                              onClick={() => { navigator.clipboard.writeText(contactLookupResult.contact_email); toast({ title: "Email copied to clipboard" }); }}
                            >Copy</button>
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {contactLookupResult.linkedin_url && (
                            <a href={contactLookupResult.linkedin_url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs bg-blue-600/20 text-blue-300 border border-blue-500/20 px-2.5 py-1.5 rounded-lg hover:bg-blue-600/30 transition-colors">
                              <ExternalLink className="w-3 h-3" />
                              {contactLookupResult.source === "RocketReach" ? "LinkedIn Profile" : "Search LinkedIn"}
                            </a>
                          )}
                          {contactLookupResult.linkedin_search_url && contactLookupResult.linkedin_url !== contactLookupResult.linkedin_search_url && (
                            <a href={contactLookupResult.linkedin_search_url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs bg-white/5 text-white/50 border border-white/10 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                              <Search className="w-3 h-3" /> Search LinkedIn
                            </a>
                          )}
                          {contactLookupResult.contact_email && (
                            <a href={`mailto:${contactLookupResult.contact_email}`}
                              className="flex items-center gap-1.5 text-xs bg-[#8B1538]/30 text-white/70 border border-[#8B1538]/30 px-2.5 py-1.5 rounded-lg hover:bg-[#8B1538]/50 transition-colors">
                              <Mail className="w-3 h-3" /> Send Email
                            </a>
                          )}
                        </div>
                      </div>

                      {contactLookupResult.confidence_reason && (
                        <p className="text-white/40 text-xs italic">ℹ️ {contactLookupResult.confidence_reason}</p>
                      )}

                      {contactLookupResult.alternative_contacts?.length > 0 && (
                        <div>
                          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Alternative Contacts</p>
                          {contactLookupResult.alternative_contacts.map((alt: any, i: number) => (
                            <div key={i} className="text-xs text-white/50 bg-[#330311]/30 rounded p-2 mb-1">
                              {alt.name} · {alt.title}{alt.email && ` · ${alt.email}`}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Data source banner */}
                      {contactLookupResult.source === "RocketReach" && (
                        <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3 text-xs text-violet-300 flex items-start gap-2">
                          <span className="text-base leading-none">🚀</span>
                          <span><strong>RocketReach verified contact</strong> — sourced from a professional contact database with confirmed current employment. Name and contact details are real.</span>
                        </div>
                      )}
                      {contactLookupResult.source === "Website" && (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 flex items-start gap-2">
                          <span className="text-base leading-none">🌐</span>
                          <span><strong>Read from the company's own website</strong>
                            {contactLookupResult.source_url ? <> — <a href={contactLookupResult.source_url} target="_blank" rel="noreferrer" className="underline hover:text-blue-200">{contactLookupResult.source_url}</a></> : ""}. Name and title are real. Email is pattern-constructed.</span>
                        </div>
                      )}
                      {contactLookupResult.source === "Companies House Officers API" && (
                        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-xs text-green-400 flex items-start gap-2">
                          <span className="text-base leading-none">🏛</span>
                          <span><strong>UK Companies House registered director</strong> — a government public record. The name is verified. The email is pattern-constructed from the domain.</span>
                        </div>
                      )}
                      {contactLookupResult.notes && !["Companies House Officers API","Website","RocketReach"].includes(contactLookupResult.source) && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400">
                          💡 {contactLookupResult.notes}
                        </div>
                      )}

                      {/* Save to Prospect buttons */}
                      <div className="pt-2 border-t border-white/10">
                        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Save This Contact</p>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            className="bg-[#8B1538] hover:bg-[#6d0f2c] text-white flex-1"
                            onClick={() => { setSaveContactResult(contactLookupResult); setShowSaveContactDialog(true); setSaveContactSearch(""); }}
                          >
                            <Save className="w-3.5 h-3.5 mr-1.5" /> Save to Existing Prospect
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10"
                            onClick={createProspectFromContact}
                            disabled={isSavingContact}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Create New Prospect
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Lookup History */}
            {contactLookupHistory.length > 0 && (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-4">
                  <h4 className="text-white font-semibold text-sm mb-3">Recent Lookups</h4>
                  <div className="space-y-2">
                    {contactLookupHistory.map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-[#330311]/40 rounded-lg hover:bg-[#330311]/60 cursor-pointer transition-all"
                        onClick={() => { setContactLookupCompany(h.company); setContactLookupWebsite(h.website || ""); setContactLookupResult(h.result); }}>
                        <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4 text-white/30" />
                          <span className="text-white text-sm">{h.company}</span>
                          {h.result?.contact_name && (
                            <span className="text-white/40 text-xs">→ {h.result.contact_name}</span>
                          )}
                        </div>
                        <Badge className={`text-[9px] ${
                          h.result?.confidence === "high" ? "bg-green-500/20 text-green-300" :
                          h.result?.confidence === "medium" ? "bg-amber-500/20 text-amber-300" :
                          "bg-red-500/20 text-red-300"
                        }`}>{h.result?.confidence}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── APPROVAL QUEUE ── */}
          <TabsContent value="approval" className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-amber-400" /> Outreach Approval Queue
                  {selectedCampaignId && (
                    <span className="text-xs font-normal text-amber-400/70 ml-1">
                      — {campaigns.find((c: any) => c.id === selectedCampaignId)?.name || "Campaign"}
                    </span>
                  )}
                </h3>
                <p className="text-white/50 text-sm mt-1">
                  Review Agent-drafted outreach emails before they go out. Approve to send, edit to refine, or reject to skip.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedCampaignId && approvalFilter === "pending" && pendingEmails.length > 0 && (
                  <Button
                    size="sm"
                    onClick={approveAllForCampaign}
                    disabled={isApprovingAll}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    {isApprovingAll ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1.5" />}
                    Approve All ({pendingEmails.length})
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white/70 hover:text-white bg-transparent"
                  onClick={() => { refetchPendingEmails(); refetchCount(); }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
              </div>
            </div>

            {/* Status filter */}
            <div className="flex gap-2 flex-wrap">
              {(["pending", "sent", "approved", "rejected"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setApprovalFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    approvalFilter === s
                      ? "bg-[#8B1538] text-white border-[#8B1538]"
                      : "bg-transparent text-white/50 border-white/20 hover:border-white/40 hover:text-white/80"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  {s === "pending" && pendingCount.count > 0 && (
                    <span className="ml-1.5 bg-amber-500 text-black text-[10px] font-bold rounded-full px-1 py-0.5">
                      {pendingCount.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {isLoadingPending && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#8B1538]" />
                <span className="ml-2 text-white/50">Loading emails...</span>
              </div>
            )}

            {!isLoadingPending && pendingEmails.length === 0 && (
              <div className="text-center py-16">
                <Mail className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 font-medium">No {approvalFilter} emails</p>
                <p className="text-white/25 text-sm mt-1">
                  {approvalFilter === "pending"
                    ? "The Agent will draft emails after the 8am prospect run. You can also trigger contact finding manually from each prospect card."
                    : `No ${approvalFilter} emails found.`}
                </p>
              </div>
            )}

            {!isLoadingPending && pendingEmails.length > 0 && (
              <div className="space-y-4">
                {pendingEmails.map((email: any) => (
                  <Card key={email.id} className="bg-[#160208] border border-[#3a0a1a]">
                    <CardContent className="p-0">
                      {/* Header */}
                      <div className="flex items-start justify-between p-4 border-b border-white/5 gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-white text-sm">{email.company_name}</span>
                            {email.trigger_type && (
                              <Badge className="bg-[#330311] text-amber-400/80 border-0 text-[10px]">
                                {email.trigger_type.replace(/_/g, " ")}
                              </Badge>
                            )}
                            {email.country_group && (
                              <Badge className={`border-0 text-[10px] ${email.country_group === "Nigeria" ? "bg-green-900/40 text-green-300" : "bg-blue-900/40 text-blue-300"}`}>
                                {email.country_group}
                              </Badge>
                            )}
                          </div>
                          {email.contact_name && (
                            <p className="text-white/60 text-xs flex items-center gap-1.5">
                              <User className="w-3 h-3" />
                              <span className="font-medium text-white/80">{email.contact_name}</span>
                              {email.contact_title && <span className="text-white/40">· {email.contact_title}</span>}
                            </p>
                          )}
                          <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1.5">
                            <Mail className="w-3 h-3" />
                            <span>{email.to_email}</span>
                            {email.from_name && <span className="text-white/30">· from {email.from_name}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {email.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-[#8B1538] hover:bg-[#a01842] text-white h-8 text-xs"
                                onClick={() => approveEmail(email.id)}
                                disabled={approvingId === email.id}
                              >
                                {approvingId === email.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                                Approve & Send
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-white/20 text-white/60 hover:text-white bg-transparent h-8 text-xs"
                                onClick={() => {
                                  setEditingEmailId(email.id);
                                  setEditSubject(email.subject);
                                  setEditBody(email.body);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent h-8 text-xs"
                                onClick={() => setShowRejectDialog(email.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {email.status === "sent" && (
                            <Badge className="bg-green-900/40 text-green-300 border-0">
                              <CheckCircle className="w-3 h-3 mr-1" /> Sent
                            </Badge>
                          )}
                          {email.status === "approved" && (
                            <Badge className="bg-blue-900/40 text-blue-300 border-0">
                              <CheckCircle className="w-3 h-3 mr-1" /> Approved
                            </Badge>
                          )}
                          {email.status === "rejected" && (
                            <Badge className="bg-red-900/40 text-red-300 border-0">Rejected</Badge>
                          )}
                        </div>
                      </div>

                      {/* Email preview / edit */}
                      {editingEmailId === email.id ? (
                        <div className="p-4 space-y-3">
                          <div>
                            <Label className="text-white/60 text-xs mb-1 block">Subject</Label>
                            <Input
                              value={editSubject}
                              onChange={e => setEditSubject(e.target.value)}
                              className="bg-black/30 border-white/10 text-white text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-white/60 text-xs mb-1 block">Body</Label>
                            <Textarea
                              value={editBody}
                              onChange={e => setEditBody(e.target.value)}
                              className="bg-black/30 border-white/10 text-white text-sm font-mono leading-relaxed"
                              rows={14}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-[#8B1538] hover:bg-[#a01842] text-white text-xs" onClick={() => saveEmailEdit(email.id)}>
                              <Save className="w-3 h-3 mr-1" /> Save Changes
                            </Button>
                            <Button size="sm" variant="outline" className="border-white/20 text-white/60 bg-transparent text-xs" onClick={() => setEditingEmailId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <p className="text-white/50 text-xs uppercase tracking-wide mb-1 font-medium">Subject</p>
                          <p className="text-white/90 text-sm font-medium mb-3">{email.subject}</p>
                          <p className="text-white/50 text-xs uppercase tracking-wide mb-1 font-medium">Message</p>
                          <pre className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap font-sans bg-black/20 rounded p-3 max-h-48 overflow-y-auto">
                            {email.body}
                          </pre>
                          <p className="text-white/30 text-[10px] mt-2">
                            Drafted {new Date(email.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Reject reason dialog */}
            {showRejectDialog && (
              <Dialog open={true} onOpenChange={() => setShowRejectDialog(null)}>
                <DialogContent className="bg-[#1a0209] border-[#4a0a1e] text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle>Reject Email</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <p className="text-white/60 text-sm">Optionally explain why this email is being rejected:</p>
                    <Textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="e.g. Wrong company, incorrect contact, etc."
                      className="bg-black/30 border-white/10 text-white text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-red-700 hover:bg-red-800 text-white text-xs flex-1"
                        onClick={() => rejectEmail(showRejectDialog, rejectReason)}
                        disabled={rejectingId === showRejectDialog}
                      >
                        {rejectingId === showRejectDialog ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                        Reject Email
                      </Button>
                      <Button size="sm" variant="outline" className="border-white/20 text-white/60 bg-transparent text-xs" onClick={() => setShowRejectDialog(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* ── Suppressions Tab ─────────────────────────────────────────────── */}
          <TabsContent value="suppressions" className="space-y-4">
            <div className="bg-[#1a0209] border border-[#4a0a1e] rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Suppression List</h3>
                <span className="text-sm text-white/50">{suppressions.length} address{suppressions.length !== 1 ? "es" : ""} suppressed</span>
              </div>
              <p className="text-sm text-white/50">
                Emails on this list are permanently blocked from receiving any outreach — including sequence follow-ups and bulk campaigns.
                Addresses are added automatically when a recipient unsubscribes or replies asking to be removed.
              </p>

              {/* Add manual suppression */}
              <div className="bg-[#2a020d] border border-[#4a0a1e] rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Add Email Manually</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    className="flex-1 bg-[#1a0209] border border-[#4a0a1e] text-white rounded px-3 py-1.5 text-sm placeholder-white/30"
                    placeholder="email@company.com"
                    value={addSuppressionEmail}
                    onChange={e => setAddSuppressionEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && addSuppressionEmail) addSuppressionMutation.mutate({ email: addSuppressionEmail, reason: "manual", notes: addSuppressionNotes }); }}
                  />
                  <input
                    type="text"
                    className="w-48 bg-[#1a0209] border border-[#4a0a1e] text-white rounded px-3 py-1.5 text-sm placeholder-white/30"
                    placeholder="Notes (optional)"
                    value={addSuppressionNotes}
                    onChange={e => setAddSuppressionNotes(e.target.value)}
                  />
                  <button
                    onClick={() => { if (addSuppressionEmail) addSuppressionMutation.mutate({ email: addSuppressionEmail, reason: "manual", notes: addSuppressionNotes }); }}
                    disabled={!addSuppressionEmail || addSuppressionMutation.isPending}
                    className="px-3 py-1.5 bg-[#8B1538] text-white rounded text-sm hover:bg-[#a01843] disabled:opacity-50"
                  >
                    {addSuppressionMutation.isPending ? "Adding..." : "Add"}
                  </button>
                </div>
              </div>

              {/* Search */}
              <input
                type="text"
                className="w-full bg-[#2a020d] border border-[#4a0a1e] text-white rounded px-3 py-1.5 text-sm placeholder-white/30"
                placeholder="Search by email or domain..."
                value={suppressionSearch}
                onChange={e => setSuppressionSearch(e.target.value)}
              />

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-white/80">
                  <thead>
                    <tr className="text-white/40 border-b border-[#4a0a1e] text-left">
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4">Reason</th>
                      <th className="pb-2 pr-4">Source</th>
                      <th className="pb-2 pr-4">Added</th>
                      <th className="pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppressions.length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-white/30">No suppressed addresses yet.</td></tr>
                    )}
                    {suppressions.map((s: any) => (
                      <tr key={s.id} className="border-b border-[#2a020d] hover:bg-[#2a020d]/50">
                        <td className="py-2 pr-4 font-mono text-xs">{s.email}</td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            s.reason === "unsubscribe" ? "bg-red-900/60 text-red-300" :
                            s.reason === "bounce" ? "bg-orange-900/60 text-orange-300" :
                            "bg-gray-800 text-gray-300"
                          }`}>{s.reason}</span>
                        </td>
                        <td className="py-2 pr-4 text-white/50 text-xs max-w-[200px] truncate">{s.source}</td>
                        <td className="py-2 pr-4 text-white/40 text-xs whitespace-nowrap">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => { if (confirm(`Remove ${s.email} from suppression list?`)) removeSuppressionMutation.mutate(s.email); }}
                            className="text-xs text-red-400 hover:text-red-200 underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── Reply Triage Tab ─────────────────────────────────────────────── */}
          <TabsContent value="replies" className="space-y-4">
            <div className="bg-[#1a0209] border border-[#4a0a1e] rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-white">Reply Triage Inbox</h3>
                  <p className="text-sm text-white/50 mt-0.5">
                    Inbound replies from outreach contacts, auto-classified.
                    Unsubscribes and positive replies trigger automatic sequence actions.
                  </p>
                </div>
                <button
                  onClick={pollInbox}
                  disabled={isPollPending}
                  className="px-3 py-1.5 bg-[#8B1538] text-white rounded text-sm hover:bg-[#a01843] disabled:opacity-50 flex items-center gap-2"
                >
                  {isPollPending ? "Polling..." : "Poll Inbox Now"}
                </button>
              </div>

              {/* Filter bar */}
              <div className="flex gap-2 flex-wrap">
                {["all", "positive", "not_now", "unsubscribe", "out_of_office", "auto_reply", "unclassified"].map(f => (
                  <button
                    key={f}
                    onClick={() => setReplyFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      replyFilter === f
                        ? "bg-[#8B1538] text-white"
                        : "bg-[#2a020d] text-white/50 hover:text-white"
                    }`}
                  >
                    {f === "all" ? `All (${replies.length})` : f.replace(/_/g, " ")}
                    {f !== "all" && ` (${replies.filter((r: any) => r.classification === f).length})`}
                  </button>
                ))}
              </div>

              {/* Reply cards */}
              <div className="space-y-3">
                {replies
                  .filter((r: any) => replyFilter === "all" || r.classification === replyFilter)
                  .map((r: any) => (
                    <div
                      key={r.id}
                      className={`bg-[#2a020d] border rounded-lg p-3 space-y-2 ${r.actioned ? "border-[#2a020d] opacity-60" : "border-[#4a0a1e]"}`}
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <span className="font-mono text-xs text-white">{r.from_email}</span>
                          {r.company_name && <span className="text-white/40 text-xs ml-2">— {r.company_name}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            r.classification === "positive" ? "bg-green-800/60 text-green-300" :
                            r.classification === "not_now" ? "bg-blue-800/60 text-blue-300" :
                            r.classification === "unsubscribe" ? "bg-red-800/60 text-red-300" :
                            r.classification === "out_of_office" ? "bg-gray-700 text-gray-300" :
                            r.classification === "auto_reply" ? "bg-gray-800 text-gray-400" :
                            "bg-amber-900/60 text-amber-300"
                          }`}>{r.classification?.replace(/_/g, " ")}</span>
                          {r.actioned && <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">Actioned</span>}
                        </div>
                      </div>
                      <p className="text-xs text-white/60 font-medium">{r.subject}</p>
                      {r.body_text && (
                        <p className="text-xs text-white/40 line-clamp-3 whitespace-pre-wrap">{r.body_text.slice(0, 300)}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-[10px] text-white/30">
                          {r.received_at ? new Date(r.received_at).toLocaleString("en-GB") : ""}
                        </span>
                        <div className="ml-auto flex gap-2">
                          {!r.actioned && (
                            <button
                              onClick={() => patchReplyMutation.mutate({ id: r.id, actioned: true })}
                              className="text-xs px-2 py-1 bg-green-900/60 text-green-300 rounded hover:bg-green-800/60"
                            >
                              Mark Actioned
                            </button>
                          )}
                          {r.classification === "unclassified" && (
                            <div className="flex items-center gap-2">
                              <select
                                className="text-xs bg-[#1a0209] border border-[#4a0a1e] text-white rounded px-2 py-1"
                                defaultValue=""
                                onChange={e => { if (e.target.value) patchReplyMutation.mutate({ id: r.id, classification: e.target.value }); }}
                              >
                                <option value="" disabled>Reclassify...</option>
                                <option value="positive">Positive</option>
                                <option value="not_now">Not now</option>
                                <option value="unsubscribe">Unsubscribe</option>
                                <option value="out_of_office">Out of office</option>
                                <option value="auto_reply">Auto reply</option>
                              </select>
                              {patchReplyMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                {replies.filter((r: any) => replyFilter === "all" || r.classification === replyFilter).length === 0 && (
                  <div className="py-10 text-center text-white/30 text-sm">
                    {replyFilter === "all" ? "No replies yet — inbox will be polled automatically every 15 minutes." : `No ${replyFilter.replace(/_/g, " ")} replies.`}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>

      <FullScreenModal open={showAddForm} onClose={resetForm} title={editingProspect ? editingProspect.company_name : "Add Prospect"} dark>
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
          
          {editingProspect ? (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-[#2a020d] border border-[#4a0a1e]">
                <TabsTrigger value="details" className="text-white/70 data-[state=active]:text-white">Details</TabsTrigger>
                <TabsTrigger value="timeline" className="text-white/70 data-[state=active]:text-white">Activity</TabsTrigger>
                <TabsTrigger value="sequences" className="text-white/70 data-[state=active]:text-white">Outreach</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 pt-4">
                <div><Label className="text-white/70">Company Name *</Label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. Acme Technologies Ltd" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-white/70">Industry</Label>
                    <Input value={formIndustry} onChange={e => setFormIndustry(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. Technology" /></div>
                  <div><Label className="text-white/70">Location</Label>
                    <Input value={formLocation} onChange={e => setFormLocation(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. London" /></div>
                </div>
                <div><Label className="text-white/70">Website</Label>
                  <Input value={formWebsite} onChange={e => setFormWebsite(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="https://..." /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-white/70">Milestone Type</Label>
                    <Select value={formMilestone} onValueChange={setFormMilestone}>
                      <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>{MILESTONE_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-white/70">Priority</Label>
                    <Select value={formPriority} onValueChange={setFormPriority}>
                      <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-white/70">Founded Year</Label>
                    <Input type="number" value={formFoundedYear} onChange={e => setFormFoundedYear(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. 2016" /></div>
                  <div><Label className="text-white/70">Milestone Detail</Label>
                    <Input value={formDetail} onChange={e => setFormDetail(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. 10th anniversary" /></div>
                </div>
                <div><Label className="text-white/70">Contact Info</Label>
                  <Input value={formContact} onChange={e => setFormContact(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="Email, phone, or contact name" /></div>
                <div><Label className="text-white/70">Notes</Label>
                  <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" rows={2} placeholder="Additional notes about this prospect..." /></div>
                <Button className="w-full bg-[#8B1538] text-white hover:bg-[#6d1029]" onClick={handleSubmitForm}
                  disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Prospect
                </Button>
              </TabsContent>

              <TabsContent value="timeline" className="pt-4">
                <ProspectActivityTimeline prospectId={editingProspect.id || 0} />
              </TabsContent>

              <TabsContent value="sequences" className="pt-4">
                <SequenceManager prospectId={editingProspect.id || 0} prospectName={editingProspect.company_name} />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <div><Label className="text-white/70">Company Name *</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. Acme Technologies Ltd" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-white/70">Industry</Label>
                  <Input value={formIndustry} onChange={e => setFormIndustry(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. Technology" /></div>
                <div><Label className="text-white/70">Location</Label>
                  <Input value={formLocation} onChange={e => setFormLocation(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. London" /></div>
              </div>
              <div><Label className="text-white/70">Website</Label>
                <Input value={formWebsite} onChange={e => setFormWebsite(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="https://..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-white/70">Milestone Type</Label>
                  <Select value={formMilestone} onValueChange={setFormMilestone}>
                    <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{MILESTONE_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-white/70">Priority</Label>
                  <Select value={formPriority} onValueChange={setFormPriority}>
                    <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-white/70">Founded Year</Label>
                  <Input type="number" value={formFoundedYear} onChange={e => setFormFoundedYear(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. 2016" /></div>
                <div><Label className="text-white/70">Milestone Detail</Label>
                  <Input value={formDetail} onChange={e => setFormDetail(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. 10th anniversary" /></div>
              </div>
              <div><Label className="text-white/70">Contact Info</Label>
                <Input value={formContact} onChange={e => setFormContact(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="Email, phone, or contact name" /></div>
              <div><Label className="text-white/70">Notes</Label>
                <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" rows={2} placeholder="Additional notes about this prospect..." /></div>
              <Button className="w-full bg-[#8B1538] text-white hover:bg-[#6d1029]" onClick={handleSubmitForm}
                disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Prospect
              </Button>
            </div>
          )}
        </div>
      </FullScreenModal>
      <FullScreenModal open={showEmailDialog} onClose={() => setShowEmailDialog(false)} title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "#fbbf24" }}>✉</span> Intelligent Outreach: {emailProspect?.company_name}</span>} dark>
        <div style={{ overflowY: "auto", flex: 1, padding: "24px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="space-y-4 py-4">
            {generatedEmail.person_in_charge && (
              <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg flex items-center gap-3">
                <Target className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Target Contact</p>
                  <p className="text-sm text-white">{generatedEmail.person_in_charge}</p>
                </div>
              </div>
            )}
            
            {generatedEmail.vendor_info && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-center gap-3">
                <Building2 className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Vendor Registration Info</p>
                  <p className="text-sm text-white line-clamp-2">{generatedEmail.vendor_info}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>To</Label>
              <Input 
                value={generatedEmail.to} 
                onChange={e => setGeneratedEmail({...generatedEmail, to: e.target.value})}
                className="bg-[#2a020d] border-[#4a0a1e] text-white" 
                placeholder="email@company.com"
              />
              <p className="text-[10px] text-white/40 italic">Agent Marketing intelligently derived this from the company website.</p>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input 
                value={generatedEmail.subject} 
                onChange={e => setGeneratedEmail({...generatedEmail, subject: e.target.value})}
                className="bg-[#2a020d] border-[#4a0a1e] text-white" 
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea 
                value={generatedEmail.body} 
                onChange={e => setGeneratedEmail({...generatedEmail, body: e.target.value})}
                className="bg-[#2a020d] border-[#4a0a1e] text-white h-64" 
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowEmailDialog(false)} className="text-white/70">Cancel</Button>
            <Button 
              className="bg-[#8B1538] text-white hover:bg-[#6d1029]"
              onClick={() => sendEmailMutation.mutate(generatedEmail)}
              disabled={sendEmailMutation.isPending}
            >
              {sendEmailMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
              Send Outreach
            </Button>
          </div>
        </div>
      </FullScreenModal>

      <FullScreenModal open={!!activeBatchEmail} onClose={() => setActiveBatchEmail(null)} title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "#fbbf24" }}>✉</span> Edit Email: {activeBatchEmail?.company_name}</span>} dark>
        <div style={{ overflowY: "auto", flex: 1, padding: "24px 32px" }}>
          {activeBatchEmail && (
            <div className="space-y-4 py-2">
              {activeBatchEmail.person_in_charge && (
                <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg flex items-center gap-3">
                  <Target className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Target Contact</p>
                    <p className="text-sm text-white">{activeBatchEmail.person_in_charge}</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-white/70">To</Label>
                <Input
                  value={activeBatchEmail.to}
                  onChange={e => setActiveBatchEmail({ ...activeBatchEmail, to: e.target.value })}
                  className="bg-[#2a020d] border-[#4a0a1e] text-white"
                  placeholder="email@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Subject</Label>
                <Input
                  value={activeBatchEmail.subject}
                  onChange={e => setActiveBatchEmail({ ...activeBatchEmail, subject: e.target.value })}
                  className="bg-[#2a020d] border-[#4a0a1e] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Message</Label>
                <Textarea
                  value={activeBatchEmail.body}
                  onChange={e => setActiveBatchEmail({ ...activeBatchEmail, body: e.target.value })}
                  className="bg-[#2a020d] border-[#4a0a1e] text-white h-56"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setActiveBatchEmail(null)} className="text-white/50">Cancel</Button>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                  onClick={() => {
                    setBatchEmails(prev => prev.map(e => e.prospect_id === activeBatchEmail.prospect_id ? activeBatchEmail : e));
                    setActiveBatchEmail(null);
                    toast({ title: "Updated", description: "Email draft updated" });
                  }}
                >
                  <Save className="w-4 h-4 mr-1" /> Save Changes
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    setBatchEmails(prev => prev.map(e => e.prospect_id === activeBatchEmail.prospect_id ? activeBatchEmail : e));
                    sendBatchEmail(activeBatchEmail);
                    setActiveBatchEmail(null);
                  }}
                >
                  <Send className="w-4 h-4 mr-1" /> Save & Send
                </Button>
              </div>
            </div>
          )}
        </div>
      </FullScreenModal>

      <FullScreenModal open={!!activeMarketingEmail} onClose={() => setActiveMarketingEmail(null)} title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "#fbbf24" }}>📢</span> Edit Marketing Email: {activeMarketingEmail?.company_name}</span>} dark>
        <div style={{ overflowY: "auto", flex: 1, padding: "24px 32px" }}>
          {activeMarketingEmail && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-white/70">To</Label>
                <Input
                  value={activeMarketingEmail.to}
                  onChange={e => setActiveMarketingEmail({ ...activeMarketingEmail, to: e.target.value })}
                  className="bg-[#2a020d] border-[#4a0a1e] text-white"
                  placeholder="email@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Subject</Label>
                <Input
                  value={activeMarketingEmail.subject}
                  onChange={e => setActiveMarketingEmail({ ...activeMarketingEmail, subject: e.target.value })}
                  className="bg-[#2a020d] border-[#4a0a1e] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Message</Label>
                <Textarea
                  value={activeMarketingEmail.body}
                  onChange={e => setActiveMarketingEmail({ ...activeMarketingEmail, body: e.target.value })}
                  className="bg-[#2a020d] border-[#4a0a1e] text-white h-56"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setActiveMarketingEmail(null)} className="text-white/50">Cancel</Button>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                  onClick={() => {
                    setMarketingEmails(prev => prev.map(e => e.prospect_id === activeMarketingEmail.prospect_id ? activeMarketingEmail : e));
                    setActiveMarketingEmail(null);
                    toast({ title: "Updated", description: "Marketing email updated" });
                  }}
                >
                  <Save className="w-4 h-4 mr-1" /> Save Changes
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    setMarketingEmails(prev => prev.map(e => e.prospect_id === activeMarketingEmail.prospect_id ? activeMarketingEmail : e));
                    sendMarketingEmail(activeMarketingEmail);
                    setActiveMarketingEmail(null);
                  }}
                >
                  <Send className="w-4 h-4 mr-1" /> Save & Send
                </Button>
              </div>
            </div>
          )}
        </div>
      </FullScreenModal>

      {/* Save Contact to Prospect Dialog */}
      <Dialog open={showSaveContactDialog} onOpenChange={open => { if (!open) { setShowSaveContactDialog(false); setSaveContactResult(null); } }}>
        <DialogContent className="bg-[#1a0209] border-[#4a0a1e] text-white max-w-md">
          <DialogHeader><DialogTitle>Save Contact to Prospect</DialogTitle></DialogHeader>
          {saveContactResult && (
            <div className="space-y-4">
              <div className="bg-[#330311]/60 rounded-lg p-3 text-sm">
                <p className="text-white font-bold">{saveContactResult.contact_name}</p>
                <p className="text-amber-400 text-xs">{saveContactResult.contact_title}</p>
                <p className="text-white/50 text-xs">{saveContactResult.contact_email}</p>
              </div>
              <div>
                <Label className="text-white/70 text-xs uppercase tracking-wider">Search & Select Prospect</Label>
                <Input
                  value={saveContactSearch}
                  onChange={e => setSaveContactSearch(e.target.value)}
                  placeholder="Type company name..."
                  className="bg-[#2a020d] border-[#4a0a1e] text-white mt-1"
                />
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {prospects
                  .filter(p => !saveContactSearch || p.company_name.toLowerCase().includes(saveContactSearch.toLowerCase()))
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => p.id && saveContactToProspect(p.id)}
                      disabled={isSavingContact}
                      className="w-full p-3 rounded-lg border border-[#4a0a1e] bg-[#2a020d] hover:border-[#8B1538] text-left flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{p.company_name}</p>
                        <p className="text-white/40 text-xs">{p.industry || p.location || "No details"}</p>
                      </div>
                      {isSavingContact ? <Loader2 className="w-4 h-4 text-white/40 animate-spin" /> : <ArrowRight className="w-4 h-4 text-white/40" />}
                    </button>
                  ))
                }
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Campaign Dialog ─────────────────────────────────────────── */}
      <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
        <DialogContent className="bg-[#1a0209] border-[#4a0a1e] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> New Prospect Campaign
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Campaign Name *</Label>
              <Input
                placeholder="e.g. Q2 Corporate Events UK"
                value={campaignFormName}
                onChange={e => setCampaignFormName(e.target.value)}
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Target Audience</Label>
              <Textarea
                placeholder="e.g. HR Directors at UK corporates with 200+ employees, planning team events"
                value={campaignFormAudience}
                onChange={e => setCampaignFormAudience(e.target.value)}
                rows={3}
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/70 text-xs mb-1 block">Email Tone</Label>
                <Select value={campaignFormTone} onValueChange={setCampaignFormTone}>
                  <SelectTrigger className="bg-white/5 border-white/15 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0209] border-[#4a0a1e]">
                    <SelectItem value="professional" className="text-white">Professional</SelectItem>
                    <SelectItem value="warm" className="text-white">Warm & Friendly</SelectItem>
                    <SelectItem value="luxury" className="text-white">Luxury / Premium</SelectItem>
                    <SelectItem value="direct" className="text-white">Direct & Concise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-xs mb-1 block">Approval Mode</Label>
                <Select value={campaignFormApproval} onValueChange={setCampaignFormApproval}>
                  <SelectTrigger className="bg-white/5 border-white/15 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0209] border-[#4a0a1e]">
                    <SelectItem value="manual" className="text-white">Manual (review each)</SelectItem>
                    <SelectItem value="auto" className="text-white">Auto-send</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 text-xs text-amber-300/80">
              <strong className="text-amber-300">Daily schedule:</strong> Prospects discovered 7am · Emails queued by 8am · Auto-send or await approval 9am · Summary 6pm
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-white/15 text-white/60 hover:text-white bg-transparent"
                onClick={() => setShowCreateCampaign(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#8B1538] hover:bg-[#a01a42] text-white"
                onClick={createCampaign}
                disabled={isCreatingCampaign}
              >
                {isCreatingCampaign ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sequences Review Panel */}
      {showSequencesPanel && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto p-4 pt-16">
          <div className="bg-[#1a0209] border border-[#4a0a1e] rounded-2xl w-full max-w-4xl shadow-2xl">
            <div className="p-6 border-b border-[#4a0a1e] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" /> Sequence Review Panel
                </h2>
                <p className="text-white/50 text-sm mt-1">{sequencePanelProspects.length} prospects — review and approve 4-touch outreach sequences</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  className="bg-amber-500 text-black font-bold hover:bg-amber-600"
                  onClick={() => {
                    const allIds = new Set(sequencePanelProspects.map((p: any) => p.id));
                    setSequenceApprovedIds(allIds);
                    toast({ title: "All Approved", description: `${sequencePanelProspects.length} sequences approved and will activate on schedule` });
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Approve All
                </Button>
                <Button size="sm" variant="ghost" className="text-white/50" onClick={() => setShowSequencesPanel(false)}>Close</Button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {sequencePanelProspects.map((rec: any) => {
                const isApproved = sequenceApprovedIds.has(rec.id);
                const seq = rec.sequences?.[0];
                const touches = seq?.messages || [];
                const touchLabels = ["Day 0 — Email", "Day 4 — WhatsApp", "Day 9 — Email", "Day 14 — Final Email"];
                return (
                  <Card key={rec.id} className={`border ${isApproved ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[#2a020d] border-[#4a0a1e]'}`}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-white font-bold">{rec.company_name}</h3>
                          <p className="text-white/50 text-xs">{rec.industry} · {rec.location}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isApproved ? (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-0 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Approved
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-300 border-0">Pending</Badge>
                          )}
                          {!isApproved && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                              onClick={() => setSequenceApprovedIds(prev => new Set([...prev, rec.id]))}>
                              <Check className="w-3 h-3 mr-1" /> Approve
                            </Button>
                          )}
                        </div>
                      </div>
                      {touches.length === 0 ? (
                        <div className="text-center py-6 text-white/30">
                          <p className="text-sm">No sequence generated yet.</p>
                          <p className="text-xs mt-1">Change this prospect's status to "Contacted" to auto-generate a 4-touch sequence.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {touches.map((touch: any, ti: number) => (
                            <div key={ti} className="bg-black/20 rounded-lg p-3 border border-white/5">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="text-[10px] bg-[#330311] text-amber-400/80 border-0">{touchLabels[ti] || `Touch ${ti + 1}`}</Badge>
                                <span className="text-[10px] text-white/30 capitalize">{touch.channel}</span>
                              </div>
                              {touch.subject && <p className="text-xs text-white/60 font-medium mb-1">Subject: {touch.subject}</p>}
                              <p className="text-xs text-white/50 leading-relaxed line-clamp-3">{touch.body}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </PlannerLayout>
  );
}
