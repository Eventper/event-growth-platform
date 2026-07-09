import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, FileText, Download, Printer, BarChart3, Users, DollarSign,
  CheckCircle, Clock, AlertTriangle, TrendingUp, TrendingDown, Shield,
  ClipboardList, Truck, Building, Calendar, MapPin, Globe, Check, X,
  ChevronDown, ChevronUp, FileCheck, FileWarning, Briefcase, UserCheck,
  Upload, FolderOpen, Send, ThumbsUp, MessageSquare, Lock, RotateCcw,
  Plus, Trash2, Eye, PaperclipIcon, Star, FileUp, History, ChevronRight
} from "lucide-react";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

type ReportType = "pre-event" | "post-event" | "closure" | "gateway" | "financial" | "vendor" | "guest-manifest";

const REPORT_TYPES: { key: ReportType; label: string; description: string; icon: any; hasLessonsLearned: boolean }[] = [
  { key: "pre-event", label: "Pre-Event Report", description: "Readiness assessment, task completion, vendor status, and risk analysis before the event", icon: ClipboardList, hasLessonsLearned: false },
  { key: "post-event", label: "Post-Event Report", description: "Attendance analysis, budget reconciliation, and performance review after the event", icon: FileCheck, hasLessonsLearned: true },
  { key: "closure", label: "Event Closure Report", description: "Complete event wrap-up with financial settlement, vendor payments, and final reconciliation", icon: Shield, hasLessonsLearned: true },
  { key: "gateway", label: "Gateway Report", description: "Guest arrival tracking, check-in status, seating allocation, and door management data", icon: UserCheck, hasLessonsLearned: false },
  { key: "financial", label: "Financial Report", description: "Detailed budget vs actual analysis, payment tracking, category breakdown, and variance report", icon: DollarSign, hasLessonsLearned: false },
  { key: "vendor", label: "Vendor Report", description: "Vendor coordination status, contract tracking, payment summary, and service delivery", icon: Truck, hasLessonsLearned: true },
  { key: "guest-manifest", label: "Guest Manifest", description: "Complete guest list with RSVP status, dietary requirements, seating, and contact information", icon: Users, hasLessonsLearned: false },
];

const FORM_TEMPLATES: Record<ReportType, { key: string; label: string; type: "textarea" | "text" | "select" | "number"; required?: boolean; options?: string[]; placeholder?: string }[]> = {
  "pre-event": [
    { key: "readiness_status", label: "Overall Readiness Status", type: "select", required: true, options: ["Green — On Track", "Amber — Some Concerns", "Red — Critical Issues"] },
    { key: "outstanding_actions", label: "Outstanding Actions / Items Not Yet Complete", type: "textarea", required: true, placeholder: "List any tasks, bookings, or approvals still outstanding..." },
    { key: "vendor_readiness", label: "Vendor Readiness Summary", type: "textarea", required: true, placeholder: "Status of all confirmed vendors — have they confirmed logistics, arrival times, etc.?" },
    { key: "key_risks", label: "Key Risks", type: "textarea", required: true, placeholder: "What risks have been identified and what mitigations are in place?" },
    { key: "team_briefing", label: "Team Briefing Status", type: "textarea", placeholder: "Has the event day team been briefed? Any concerns raised?" },
    { key: "client_notes", label: "Client / Stakeholder Notes", type: "textarea", placeholder: "Any last-minute client requests or changes?" },
    { key: "additional_notes", label: "Additional Notes", type: "textarea", placeholder: "Anything else the line manager should know before the event..." },
  ],
  "post-event": [
    { key: "event_overview", label: "Event Overview", type: "textarea", required: true, placeholder: "Brief summary of how the event went overall..." },
    { key: "expected_attendance", label: "Expected Attendance", type: "number", required: true },
    { key: "actual_attendance", label: "Actual Attendance", type: "number", required: true },
    { key: "what_went_well", label: "What Went Well", type: "textarea", required: true, placeholder: "Key successes — logistics, vendor delivery, guest experience, team performance..." },
    { key: "what_could_improve", label: "What Could Be Improved", type: "textarea", required: true, placeholder: "Honest assessment of what didn't go as planned and why..." },
    { key: "lessons_learned", label: "Lessons Learned ★", type: "textarea", required: true, placeholder: "REQUIRED: What would you do differently next time? Specific, actionable insights..." },
    { key: "action_items", label: "Action Items for Next Event", type: "textarea", placeholder: "Concrete steps to take based on lessons learned..." },
    { key: "client_feedback", label: "Client Feedback / Satisfaction", type: "textarea", placeholder: "Any feedback received from the client or guests..." },
    { key: "budget_notes", label: "Budget Reconciliation Notes", type: "textarea", placeholder: "Any significant budget variances to flag..." },
  ],
  "closure": [
    { key: "financial_summary", label: "Financial Settlement Summary", type: "textarea", required: true, placeholder: "Summary of all final costs, payments made, and outstanding balances..." },
    { key: "outstanding_payments", label: "Outstanding Payments / Actions", type: "textarea", placeholder: "Any invoices still to be received, payments pending, or credits to chase..." },
    { key: "vendor_settlement", label: "Vendor Settlement Status", type: "select", required: true, options: ["All Settled", "Mostly Settled — Minor Items Outstanding", "Partially Settled — Significant Items Outstanding"] },
    { key: "vendor_settlement_notes", label: "Vendor Settlement Notes", type: "textarea", placeholder: "Details of any unsettled vendor accounts..." },
    { key: "client_feedback", label: "Client Feedback", type: "textarea", placeholder: "Final client comments, satisfaction rating, testimonial..." },
    { key: "lessons_learned", label: "Lessons Learned ★", type: "textarea", required: true, placeholder: "REQUIRED: Key takeaways from this event for future reference..." },
    { key: "improvements", label: "Process Improvements Recommended", type: "textarea", placeholder: "Any changes to our processes, templates, or suppliers recommended..." },
    { key: "signoff_notes", label: "Sign-off Notes", type: "textarea", placeholder: "Final notes for the closure file. Confirm all deliverables completed." },
  ],
  "gateway": [
    { key: "expected_arrivals", label: "Expected Arrivals", type: "number", required: true },
    { key: "actual_arrivals", label: "Actual Arrivals", type: "number", required: true },
    { key: "checkin_method", label: "Check-in Method Used", type: "select", options: ["QR Code Scan", "Name List", "Mixed (QR + Manual)", "Manual Only"] },
    { key: "checkin_issues", label: "Check-in Issues / Delays", type: "textarea", placeholder: "Any problems with the check-in process? Queues, technical issues, no-shows..." },
    { key: "seating_notes", label: "Seating / Table Allocation Notes", type: "textarea", placeholder: "Any last-minute seating changes, unallocated guests, VIP moves..." },
    { key: "door_management", label: "Door Management Notes", type: "textarea", placeholder: "How was the flow managed? Bottlenecks, security, accreditation issues..." },
    { key: "vip_handling", label: "VIP / Special Guest Handling", type: "textarea", placeholder: "How were VIP guests greeted and managed on arrival?" },
    { key: "incidents", label: "Incidents / Escalations", type: "textarea", placeholder: "Any security, safety, or conduct incidents at the entrance..." },
    { key: "general_notes", label: "General Notes", type: "textarea", placeholder: "Any other observations from the gateway/entrance team..." },
  ],
  "financial": [
    { key: "overview", label: "Budget vs Actual Overview", type: "textarea", required: true, placeholder: "High-level summary of budget performance..." },
    { key: "key_variances", label: "Key Variances", type: "textarea", required: true, placeholder: "List items that came in over or under budget with reasons..." },
    { key: "outstanding_payments", label: "Outstanding Payments", type: "textarea", placeholder: "Invoices not yet received or paid, deposits to settle..." },
    { key: "financial_risks", label: "Financial Risks", type: "textarea", placeholder: "Any disputed invoices, potential claims, or unexpected costs..." },
    { key: "reconciliation_notes", label: "Reconciliation Notes", type: "textarea", placeholder: "Notes on how final figures were reconciled..." },
    { key: "recommendations", label: "Recommendations", type: "textarea", placeholder: "Budget planning improvements for future events..." },
  ],
  "vendor": [
    { key: "overall_performance", label: "Overall Vendor Performance Rating", type: "select", required: true, options: ["Excellent — All Delivered to Standard", "Good — Minor Issues, Resolved", "Satisfactory — Some Concerns", "Poor — Significant Failures"] },
    { key: "performance_summary", label: "Vendor Performance Summary", type: "textarea", required: true, placeholder: "Summary of how vendors collectively performed..." },
    { key: "best_performers", label: "Best Performing Vendors", type: "textarea", placeholder: "Name the vendors who excelled and why..." },
    { key: "concerns", label: "Concerns / Issues", type: "textarea", placeholder: "Any vendor that failed to deliver, was late, or caused problems..." },
    { key: "contract_notes", label: "Contract / Payment Status Notes", type: "textarea", placeholder: "Any contracts not yet signed, payments outstanding, or disputes..." },
    { key: "lessons_learned", label: "Lessons Learned ★", type: "textarea", required: true, placeholder: "REQUIRED: What would you change about your vendor selection or management process?" },
    { key: "recommendations", label: "Recommendations for Future Events", type: "textarea", placeholder: "Vendors to re-book, avoid, or renegotiate with..." },
  ],
  "guest-manifest": [
    { key: "special_requirements", label: "Special Requirements — How Handled", type: "textarea", placeholder: "Dietary requirements, accessibility needs, VIP arrangements..." },
    { key: "seating_notes", label: "Seating Arrangement Notes", type: "textarea", placeholder: "Final seating summary, any last-minute changes..." },
    { key: "guest_experience", label: "Guest Experience Observations", type: "textarea", placeholder: "Overall guest experience notes from the team on the day..." },
    { key: "issues", label: "Issues / Incidents", type: "textarea", placeholder: "Any guest complaints, no-shows, uninvited guests..." },
    { key: "general_notes", label: "General Notes", type: "textarea", placeholder: "Any other notes about the guest list or management..." },
  ],
};

function fmtCurrency(amount: number, currency: string) {
  const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", NGN: "₦", CAD: "C$", AUD: "A$" };
  return `${symbols[currency] || currency + " "}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
}
function fmtDateTime(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return d; }
}
function fmtPct(n: number, total: number) { return total > 0 ? `${Math.round(n / total * 100)}%` : "0%"; }

function StatusBadge({ status, color }: { status: string; color: string }) {
  const colors: Record<string, string> = {
    green: "bg-green-900/40 text-green-400",
    red: "bg-red-900/40 text-red-400",
    yellow: "bg-yellow-900/40 text-yellow-400",
    blue: "bg-blue-900/40 text-blue-400",
    gray: "bg-gray-800/40 text-gray-400",
    purple: "bg-purple-900/40 text-purple-400",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[color] || colors.gray}`}>{status}</span>;
}

function SubmissionStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-gray-700/60 text-gray-300" },
    submitted: { label: "Submitted", cls: "bg-blue-900/50 text-blue-300" },
    approved: { label: "Approved", cls: "bg-green-900/50 text-green-300" },
    queried: { label: "Query Raised", cls: "bg-yellow-900/50 text-yellow-300" },
    closed: { label: "Closed", cls: "bg-purple-900/50 text-purple-300" },
  };
  const c = cfg[status] || cfg.draft;
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${c.cls}`}>{c.label}</span>;
}

type PanelTab = "form" | "upload" | "documents" | "history";

function ReportSubmissionPanel({
  eventId, reportType, reportLabel, onClose
}: {
  eventId: string; reportType: ReportType; reportLabel: string; onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = localStorage.getItem("token") || localStorage.getItem("staff_token") || sessionStorage.getItem("token") || "";
  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || localStorage.getItem("staff_user") || "{}"); } catch { return {}; } })();
  const isManager = user?.role === "admin" || user?.role === "director" || user?.role === "manager";

  const [tab, setTab] = useState<PanelTab>("form");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [managerNotes, setManagerNotes] = useState("");
  const [queryText, setQueryText] = useState("");
  const [activeSubmissionId, setActiveSubmissionId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docUploadRef = useRef<HTMLInputElement>(null);

  const fields = FORM_TEMPLATES[reportType] || [];
  const hasLessons = REPORT_TYPES.find(r => r.key === reportType)?.hasLessonsLearned;

  const { data: submissions = [], refetch: refetchSubmissions } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "report-submissions", reportType],
    queryFn: async () => {
      const r = await fetch(`/api/events/${eventId}/report-submissions?report_type=${reportType}`, { headers: { Authorization: `Bearer ${token}` } });
      return r.json();
    },
  });

  const { data: docs = [], refetch: refetchDocs } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "report-docs", reportType],
    queryFn: async () => {
      const r = await fetch(`/api/events/${eventId}/report-docs?report_type=${reportType}`, { headers: { Authorization: `Bearer ${token}` } });
      return r.json();
    },
  });

  const latestSub = submissions[0] || null;
  const activeSub = activeSubmissionId ? submissions.find(s => s.id === activeSubmissionId) : latestSub;

  const { data: approvalLog = [] } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "report-submissions", activeSub?.id, "log"],
    queryFn: async () => {
      if (!activeSub?.id) return [];
      const r = await fetch(`/api/events/${eventId}/report-submissions/${activeSub.id}/log`, { headers: { Authorization: `Bearer ${token}` } });
      return r.json();
    },
    enabled: !!activeSub?.id,
  });

  const createSubmission = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/events/${eventId}/report-submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ report_type: reportType, mode: "form", form_data: formData }),
      });
      return r.json();
    },
    onSuccess: (data) => {
      setActiveSubmissionId(data.id);
      refetchSubmissions();
      toast({ title: "Draft saved" });
    },
  });

  const saveForm = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/events/${eventId}/report-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ form_data: formData }),
      });
    },
    onSuccess: () => { refetchSubmissions(); toast({ title: "Draft saved" }); },
  });

  const submitForReview = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/events/${eventId}/report-submissions/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      return r.json();
    },
    onSuccess: () => {
      refetchSubmissions();
      qc.invalidateQueries({ queryKey: ["/api/events", eventId, "report-submissions/summary"] });
      toast({ title: "Report submitted", description: "Your line manager has been notified" });
    },
  });

  const approve = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/events/${eventId}/report-submissions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: managerNotes }),
      });
    },
    onSuccess: () => { refetchSubmissions(); setManagerNotes(""); toast({ title: "Report approved ✓" }); },
  });

  const query = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/events/${eventId}/report-submissions/${id}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: queryText }),
      });
    },
    onSuccess: () => { refetchSubmissions(); setQueryText(""); toast({ title: "Query sent to submitter" }); },
  });

  const closeReport = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/events/${eventId}/report-submissions/${id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: managerNotes }),
      });
    },
    onSuccess: () => { refetchSubmissions(); setManagerNotes(""); toast({ title: "Report closed" }); },
  });

  const reopen = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/events/${eventId}/report-submissions/${id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => { refetchSubmissions(); toast({ title: "Report reopened for editing" }); },
  });

  const handleFileUpload = async (file: File, submissionId?: number) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("report_type", reportType);
    if (submissionId) fd.append("submission_id", String(submissionId));
    try {
      const r = await fetch(`/api/events/${eventId}/report-docs`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (r.ok) {
        refetchDocs();
        qc.invalidateQueries({ queryKey: ["/api/events", eventId, "report-submissions/summary"] });
        toast({ title: "Document uploaded" });
      } else {
        toast({ title: "Upload failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload error", variant: "destructive" });
    }
  };

  const deleteDoc = async (docId: number) => {
    await fetch(`/api/events/${eventId}/report-docs/${docId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    refetchDocs();
    toast({ title: "Document removed" });
  };

  const handleSaveOrCreate = async () => {
    if (activeSub) {
      await saveForm.mutateAsync(activeSub.id);
    } else {
      await createSubmission.mutateAsync();
    }
  };

  const canSubmit = () => {
    if (!activeSub || activeSub.status === "submitted" || activeSub.status === "approved" || activeSub.status === "closed") return false;
    const required = fields.filter(f => f.required);
    return required.every(f => (activeSub.form_data?.[f.key] || formData[f.key] || "").trim().length > 0);
  };

  const getFieldValue = (key: string) => formData[key] !== undefined ? formData[key] : (activeSub?.form_data?.[key] || "");
  const setField = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));
  const isReadonly = activeSub?.status === "submitted" || activeSub?.status === "approved" || activeSub?.status === "closed";

  const logActionColor: Record<string, string> = {
    submitted: "text-blue-400",
    approved: "text-green-400",
    queried: "text-yellow-400",
    closed: "text-purple-400",
    reopened: "text-gray-400",
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl h-full bg-[#1a0108] border-l border-[#4a0a1e] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#4a0a1e] flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">{reportLabel}</h2>
            <p className="text-gray-400 text-xs mt-0.5">Report submission &amp; approval</p>
          </div>
          <div className="flex items-center gap-3">
            {activeSub && <SubmissionStatusBadge status={activeSub.status} />}
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#4a0a1e] flex-shrink-0">
          {([
            { id: "form" as PanelTab, label: "Template Form", icon: FileText },
            { id: "upload" as PanelTab, label: "Upload", icon: Upload },
            { id: "documents" as PanelTab, label: `Documents${docs.length ? ` (${docs.length})` : ""}`, icon: FolderOpen },
            { id: "history" as PanelTab, label: "History", icon: History },
          ] as { id: PanelTab; label: string; icon: any }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-white text-white"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Manager action banner (if submitted & isManager) */}
          {activeSub?.status === "submitted" && isManager && (
            <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-4">
              <p className="text-blue-300 text-sm font-semibold mb-3 flex items-center gap-2">
                <ThumbsUp className="w-4 h-4" /> Manager Review Required
              </p>
              <p className="text-gray-400 text-xs mb-3">
                Submitted by <strong className="text-white">{activeSub.submitted_by}</strong> on {fmtDateTime(activeSub.submitted_at)}
              </p>
              <div className="space-y-3">
                <textarea
                  value={managerNotes}
                  onChange={e => setManagerNotes(e.target.value)}
                  placeholder="Optional notes / comments..."
                  rows={2}
                  className="w-full bg-[#330311] border border-[#4a0a1e] rounded-lg px-3 py-2 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-white/20"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className="bg-green-700 hover:bg-green-600 text-white text-xs" onClick={() => approve.mutate(activeSub.id)}>
                    <ThumbsUp className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" className="bg-yellow-700 hover:bg-yellow-600 text-white text-xs" onClick={() => {
                    if (!queryText.trim()) { toast({ title: "Please enter your query first", variant: "destructive" }); return; }
                    query.mutate(activeSub.id);
                  }}>
                    <MessageSquare className="w-3.5 h-3.5 mr-1" /> Query
                  </Button>
                  <Button size="sm" className="bg-purple-800 hover:bg-purple-700 text-white text-xs" onClick={() => closeReport.mutate(activeSub.id)}>
                    <Lock className="w-3.5 h-3.5 mr-1" /> Close Report
                  </Button>
                </div>
                <textarea
                  value={queryText}
                  onChange={e => setQueryText(e.target.value)}
                  placeholder="Enter your query here (used if you click Query)..."
                  rows={2}
                  className="w-full bg-[#330311] border border-[#4a0a1e] rounded-lg px-3 py-2 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-white/20"
                />
              </div>
            </div>
          )}

          {/* Query banner for submitter */}
          {activeSub?.status === "queried" && !isManager && (
            <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-4">
              <p className="text-yellow-300 text-sm font-semibold flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4" /> Query from Line Manager
              </p>
              <p className="text-white text-sm">{activeSub.manager_notes || "Please review and update your report."}</p>
              <p className="text-gray-500 text-xs mt-1">by {activeSub.manager_action_by} · {fmtDateTime(activeSub.manager_action_at)}</p>
              <Button size="sm" className="mt-3 bg-[#4a0a1e] text-white text-xs" onClick={() => reopen.mutate(activeSub.id)}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reopen &amp; Edit
              </Button>
            </div>
          )}

          {/* Approved / Closed banner */}
          {(activeSub?.status === "approved" || activeSub?.status === "closed") && (
            <div className={`border rounded-lg p-4 ${activeSub.status === "approved" ? "bg-green-900/20 border-green-700/40" : "bg-purple-900/20 border-purple-700/40"}`}>
              <p className={`text-sm font-semibold flex items-center gap-2 ${activeSub.status === "approved" ? "text-green-300" : "text-purple-300"}`}>
                {activeSub.status === "approved" ? <ThumbsUp className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                Report {activeSub.status === "approved" ? "Approved" : "Closed"}
              </p>
              {activeSub.manager_notes && <p className="text-white text-xs mt-1">{activeSub.manager_notes}</p>}
              <p className="text-gray-500 text-xs mt-1">by {activeSub.manager_action_by} · {fmtDateTime(activeSub.manager_action_at)}</p>
            </div>
          )}

          {/* FORM TAB */}
          {tab === "form" && (
            <div className="space-y-4">
              {hasLessons && (
                <div className="bg-[#330311]/60 border border-[#4a0a1e] rounded-lg p-3 flex items-start gap-2">
                  <Star className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-300/80 text-xs">This report requires a <strong>Lessons Learned</strong> section before it can be submitted.</p>
                </div>
              )}

              {fields.map(field => (
                <div key={field.key}>
                  <label className="text-gray-300 text-xs font-medium mb-1.5 flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-red-400 text-xs">*</span>}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={getFieldValue(field.key)}
                      onChange={e => setField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={field.key === "lessons_learned" ? 5 : 3}
                      disabled={isReadonly}
                      className={`w-full bg-[#330311] border rounded-lg px-3 py-2 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-white/20 resize-none ${
                        field.key === "lessons_learned" ? "border-yellow-800/60" : "border-[#4a0a1e]"
                      } ${isReadonly ? "opacity-60 cursor-not-allowed" : ""}`}
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={getFieldValue(field.key)}
                      onChange={e => setField(field.key, e.target.value)}
                      disabled={isReadonly}
                      className={`w-full bg-[#330311] border border-[#4a0a1e] rounded-lg px-3 py-2 text-white text-xs focus:outline-none ${isReadonly ? "opacity-60" : ""}`}
                    >
                      <option value="">Select...</option>
                      {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={getFieldValue(field.key)}
                      onChange={e => setField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={isReadonly}
                      className={`w-full bg-[#330311] border border-[#4a0a1e] rounded-lg px-3 py-2 text-white text-xs placeholder:text-gray-600 focus:outline-none ${isReadonly ? "opacity-60" : ""}`}
                    />
                  )}
                </div>
              ))}

              {!isReadonly && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="bg-[#4a0a1e] text-white text-xs" onClick={handleSaveOrCreate}>
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    {activeSub ? "Save Draft" : "Create Draft"}
                  </Button>
                  {activeSub && (
                    <Button
                      size="sm"
                      className="bg-[#330311] border border-white/20 text-white text-xs hover:bg-white/10"
                      disabled={!canSubmit()}
                      onClick={() => submitForReview.mutate(activeSub.id)}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Submit to Line Manager
                    </Button>
                  )}
                </div>
              )}

              {activeSub && !isReadonly && !canSubmit() && (
                <p className="text-gray-500 text-xs">Complete all required fields (*) before submitting.</p>
              )}

              {/* Previous submissions */}
              {submissions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#4a0a1e]">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Submission History</p>
                  {submissions.map((s: any) => (
                    <div
                      key={s.id}
                      onClick={() => setActiveSubmissionId(s.id === activeSubmissionId ? null : s.id)}
                      className={`flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                        s.id === (activeSub?.id) ? "bg-[#330311]/80 border border-[#4a0a1e]" : "bg-[#2a020d] hover:bg-[#330311]/40"
                      }`}
                    >
                      <div>
                        <p className="text-white text-xs font-medium">Submission #{s.id}</p>
                        <p className="text-gray-500 text-[10px]">{fmtDateTime(s.created_at)} · by {s.submitted_by}</p>
                      </div>
                      <SubmissionStatusBadge status={s.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* UPLOAD TAB */}
          {tab === "upload" && (
            <div className="space-y-4">
              <p className="text-gray-400 text-xs">
                Upload a completed report document (PDF, Word, Excel, etc.). Uploaded files are stored in the Document Folder.
              </p>

              <div
                className="border-2 border-dashed border-[#4a0a1e] hover:border-white/20 rounded-xl p-8 text-center cursor-pointer transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-white/30"); }}
                onDragLeave={e => e.currentTarget.classList.remove("border-white/30")}
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-white/30");
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileUpload(file, activeSub?.id);
                }}
              >
                <FileUp className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-white text-sm font-medium">Drop file here or click to browse</p>
                <p className="text-gray-500 text-xs mt-1">PDF, Word, Excel, PNG, JPG — max 25MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, activeSub?.id); }}
                />
              </div>

              {!activeSub && (
                <p className="text-yellow-400/70 text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Create a form draft first to link documents to a submission, or upload here to the document folder only.
                </p>
              )}

              {activeSub && activeSub.status === "draft" && (
                <Button
                  size="sm"
                  className="bg-[#330311] border border-white/20 text-white text-xs hover:bg-white/10"
                  onClick={() => submitForReview.mutate(activeSub.id)}
                >
                  <Send className="w-3.5 h-3.5 mr-1" /> Submit this report for review
                </Button>
              )}
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {tab === "documents" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-xs">{docs.length} document{docs.length !== 1 ? "s" : ""} in folder</p>
                <Button
                  size="sm"
                  className="bg-[#4a0a1e] text-white text-xs"
                  onClick={() => docUploadRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5 mr-1" /> Add Document
                </Button>
                <input
                  ref={docUploadRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, activeSub?.id); e.target.value = ""; }}
                />
              </div>

              {docs.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No documents yet</p>
                  <p className="text-gray-600 text-xs mt-1">Upload files using the Upload tab or the button above</p>
                </div>
              ) : (
                docs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-[#2a020d] rounded-lg border border-[#4a0a1e]">
                    <div className="w-8 h-8 rounded-lg bg-[#4a0a1e] flex items-center justify-center flex-shrink-0">
                      <PaperclipIcon className="w-4 h-4 text-white/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{doc.original_name}</p>
                      <p className="text-gray-500 text-[10px]">{doc.uploaded_by} · {fmtDateTime(doc.uploaded_at)}</p>
                      {doc.file_size && <p className="text-gray-600 text-[10px]">{(doc.file_size / 1024).toFixed(0)} KB</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <a
                        href={`/uploads/${doc.filename}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-400 hover:text-white transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => deleteDoc(doc.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {tab === "history" && (
            <div className="space-y-3">
              {approvalLog.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No activity yet</p>
                  <p className="text-gray-600 text-xs mt-1">Submit the report to start the approval workflow</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-[#4a0a1e]" />
                  {approvalLog.map((entry: any) => (
                    <div key={entry.id} className="relative flex gap-4 pl-8 pb-5 last:pb-0">
                      <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-[#330311] border-2 border-[#4a0a1e]" />
                      <div className="flex-1 bg-[#2a020d] rounded-lg p-3 border border-[#4a0a1e]">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold capitalize ${logActionColor[entry.action] || "text-gray-400"}`}>
                            {entry.action}
                          </span>
                          <span className="text-gray-600 text-[10px]">{fmtDateTime(entry.created_at)}</span>
                        </div>
                        <p className="text-gray-400 text-xs">{entry.actor}</p>
                        {entry.notes && <p className="text-white text-xs mt-1">{entry.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventReportsPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [submissionPanel, setSubmissionPanel] = useState<ReportType | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const token = localStorage.getItem("token") || localStorage.getItem("staff_token") || sessionStorage.getItem("token") || "";

  const { data: report, isLoading } = useQuery({
    queryKey: ["/api/events", eventId, "report", selectedReport],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/report/${selectedReport}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to generate report");
      return res.json();
    },
    enabled: !!selectedReport && !!eventId,
  });

  const { data: summary } = useQuery<{ submissions: any[]; docCounts: Record<string, number> }>({
    queryKey: ["/api/events", eventId, "report-submissions/summary"],
    queryFn: async () => {
      const r = await fetch(`/api/events/${eventId}/report-submissions/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return r.json();
    },
    enabled: !!eventId,
  });

  const getSubmissionSummary = (key: ReportType) => summary?.submissions?.find((s: any) => s.report_type === key);
  const getDocCount = (key: ReportType) => summary?.docCounts?.[key] || 0;

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  const isExpanded = (key: string) => expandedSections[key] !== false;

  const printReport = () => window.print();

  const downloadCSV = () => {
    if (!report) return;
    let csv = "";
    const e = report.event;
    if (selectedReport === "guest-manifest" || selectedReport === "gateway") {
      csv = "Name,Group,RSVP Status,Checked In,Table,Plus Ones,Dietary,Meal\n";
      (report.guests || []).forEach((g: any) => {
        csv += `"${g.name}","${g.group || ''}","${g.rsvpStatus}","${g.checkedIn ? 'Yes' : 'No'}","${g.tableAssignment || ''}","${g.plusOnes || 0}","${g.dietary || ''}","${g.meal || ''}"\n`;
      });
    } else if (selectedReport === "financial" || selectedReport === "closure") {
      csv = "Item,Category,Estimated,Actual,Paid,Status\n";
      (report.budgetItems || []).forEach((b: any) => {
        csv += `"${b.name}","${b.category || ''}","${b.estimated || 0}","${b.actual || 0}","${b.paid || 0}","${b.isPaid ? 'Paid' : 'Unpaid'}"\n`;
      });
    } else if (selectedReport === "vendor") {
      csv = "Company,Service,Quoted,Final,Deposit,Payment Status,Contract\n";
      (report.vendors || []).forEach((v: any) => {
        csv += `"${v.company || ''}","${v.service || ''}","${v.quoted || 0}","${v.final || 0}","${v.deposit || 0}","${v.paymentStatus || ''}","${v.contractStatus || ''}"\n`;
      });
    } else {
      csv = `Event Report: ${e.name}\nType: ${selectedReport}\nGenerated: ${fmtDate(report.generatedAt)}\n\n`;
      csv += `Guests Total,${report.guestStats.total}\nGuests Accepted,${report.guestStats.accepted}\n`;
      csv += `Budget Estimated,${report.budgetStats.totalEstimated}\nBudget Actual,${report.budgetStats.totalActual}\n`;
      csv += `Tasks Total,${report.taskStats.total}\nTasks Completed,${report.taskStats.completed}\n`;
      csv += `Vendors Total,${report.vendorStats.total}\nVendors Confirmed,${report.vendorStats.confirmed}\n`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${e.name.replace(/\s+/g, '_')}_${selectedReport}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report downloaded" });
  };

  const SectionHeader = ({ title, sectionKey, icon: Icon, count }: { title: string; sectionKey: string; icon: any; count?: number }) => (
    <button onClick={() => toggleSection(sectionKey)} className="w-full flex items-center justify-between py-3 text-left">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-white/60" />
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        {count !== undefined && <span className="text-gray-500 text-xs">({count})</span>}
      </div>
      {isExpanded(sectionKey) ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
    </button>
  );

  const StatBox = ({ label, value, sub, color = "white" }: { label: string; value: string | number; sub?: string; color?: string }) => (
    <div className="bg-[#1a0108] rounded-lg p-4 border border-[#4a0a1e]">
      <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-${color} font-bold text-xl`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );

  // Report type selection screen
  if (!selectedReport) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209] p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <header className="flex items-center gap-3 mb-8">
              <Button variant="ghost" className="text-white p-2" onClick={() => setLocation(`/events/${eventId}`)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">Event Reports</h1>
                <p className="text-gray-400 text-sm">View live data, submit reports for approval, and manage documents</p>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REPORT_TYPES.map(rt => {
                const sub = getSubmissionSummary(rt.key);
                const docCount = getDocCount(rt.key);
                const latestStatus = sub ? (parseInt(sub.submitted) > 0 ? "submitted" : parseInt(sub.approved) > 0 ? "approved" : parseInt(sub.queried) > 0 ? "queried" : "draft") : null;

                return (
                  <Card key={rt.key} className="bg-[#2a020d] border-[#4a0a1e] transition-all hover:border-white/10">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-11 h-11 rounded-xl bg-[#4a0a1e] flex items-center justify-center flex-shrink-0">
                          <rt.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-white font-semibold text-sm">{rt.label}</h3>
                            {rt.hasLessonsLearned && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-400">Lessons Required</span>
                            )}
                          </div>
                          <p className="text-gray-400 text-xs leading-relaxed mt-0.5">{rt.description}</p>
                        </div>
                      </div>

                      {/* Status & doc counts */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {latestStatus && <SubmissionStatusBadge status={latestStatus} />}
                        {docCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-[#4a0a1e] text-gray-400 flex items-center gap-1">
                            <PaperclipIcon className="w-3 h-3" /> {docCount} doc{docCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        {sub && parseInt(sub.total) > 0 && (
                          <span className="text-gray-600 text-[10px]">{sub.total} submission{parseInt(sub.total) !== 1 ? "s" : ""}</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-[#4a0a1e] hover:bg-[#5a0a2e] text-white text-xs"
                          onClick={() => setSelectedReport(rt.key)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Live Data
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-[#330311] border border-[#4a0a1e] hover:bg-[#4a0a1e] text-white text-xs"
                          onClick={() => setSubmissionPanel(rt.key)}
                        >
                          <Send className="w-3.5 h-3.5 mr-1" /> Submit Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {submissionPanel && (
          <ReportSubmissionPanel
            eventId={eventId}
            reportType={submissionPanel}
            reportLabel={REPORT_TYPES.find(r => r.key === submissionPanel)?.label || "Report"}
            onClose={() => setSubmissionPanel(null)}
          />
        )}
      </>
    );
  }

  const reportMeta = REPORT_TYPES.find(r => r.key === selectedReport)!;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209] p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <header className="flex items-center justify-between mb-6 print:hidden">
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="text-white p-2" onClick={() => setSelectedReport(null)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-white">{reportMeta.label}</h1>
                <p className="text-gray-400 text-xs">{report?.event?.name || "Loading..."}</p>
              </div>
            </div>
            {report && (
              <div className="flex gap-2">
                <Button size="sm" className="bg-[#4a0a1e] text-white text-xs" onClick={() => setSubmissionPanel(selectedReport)}>
                  <Send className="w-3.5 h-3.5 mr-1" /> Submit Report
                </Button>
                <Button size="sm" className="bg-[#4a0a1e] text-white" onClick={downloadCSV}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
                <Button size="sm" className="bg-[#4a0a1e] text-white" onClick={printReport}>
                  <Printer className="w-4 h-4 mr-1" /> Print
                </Button>
              </div>
            )}
          </header>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Generating report...</p>
              </div>
            </div>
          )}

          {report && (
            <div className="space-y-4" id="report-content">
              <Card className="bg-[#2a020d] border-[#4a0a1e] print:border print:border-gray-300 print:bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#4a0a1e] print:border-gray-300">
                    <div className="flex items-center gap-3">
                      <img src={eventPerfektLogo} alt="Event Perfekt" className="h-10 w-10 rounded-xl shadow-md ring-1 ring-white/10 print:ring-gray-200 print:shadow-none" />
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-widest print:text-gray-500">Event Perfekt</p>
                        <h2 className="text-white text-lg font-bold mt-1 print:text-black">{reportMeta.label}</h2>
                        <p className="text-gray-400 text-sm mt-0.5 print:text-gray-600">{report.event.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs">Generated</p>
                      <p className="text-white text-sm print:text-black">{fmtDate(report.generatedAt)}</p>
                      <p className="text-gray-500 text-xs mt-1">{report.event.type} | {report.event.category || "General"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-gray-500 text-[10px] uppercase">Status</p>
                      <StatusBadge status={report.event.status || "planning"} color={report.event.status === "completed" ? "green" : report.event.status === "active" ? "blue" : "yellow"} />
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-[10px] uppercase">Date</p>
                      <p className="text-white text-xs print:text-black">{fmtDate(report.event.startDate)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-[10px] uppercase">Location</p>
                      <p className="text-white text-xs print:text-black">{report.event.city || "—"}, {report.event.country || "—"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-[10px] uppercase">Budget</p>
                      <p className="text-white text-xs print:text-black">{report.event.budget ? fmtCurrency(parseFloat(report.event.budget), report.event.currency) : "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {(selectedReport === "pre-event" || selectedReport === "post-event" || selectedReport === "closure") && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatBox label="Total Guests" value={report.guestStats.total} sub={`${report.guestStats.accepted} confirmed`} />
                    <StatBox label="Tasks" value={`${report.taskStats.completionRate}%`} sub={`${report.taskStats.completed}/${report.taskStats.total} done`} />
                    <StatBox label="Budget Spent" value={fmtCurrency(report.budgetStats.totalActual, report.event.currency)} sub={`of ${fmtCurrency(report.budgetStats.totalEstimated, report.event.currency)} estimated`} />
                    <StatBox label="Vendors" value={report.vendorStats.total} sub={`${report.vendorStats.confirmed} confirmed`} />
                  </div>

                  <Card className="bg-[#2a020d] border-[#4a0a1e]">
                    <CardContent className="p-5">
                      <SectionHeader title="Guest Analysis" sectionKey="guests" icon={Users} count={report.guestStats.total} />
                      {isExpanded("guests") && (
                        <div className="space-y-4 pt-2">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-green-900/20 rounded-lg p-3 text-center"><p className="text-green-400 font-bold text-lg">{report.guestStats.accepted}</p><p className="text-green-400/60 text-[10px] uppercase">Accepted</p></div>
                            <div className="bg-red-900/20 rounded-lg p-3 text-center"><p className="text-red-400 font-bold text-lg">{report.guestStats.declined}</p><p className="text-red-400/60 text-[10px] uppercase">Declined</p></div>
                            <div className="bg-yellow-900/20 rounded-lg p-3 text-center"><p className="text-yellow-400 font-bold text-lg">{report.guestStats.pending}</p><p className="text-yellow-400/60 text-[10px] uppercase">Pending</p></div>
                            <div className="bg-blue-900/20 rounded-lg p-3 text-center"><p className="text-blue-400 font-bold text-lg">{report.guestStats.tentative}</p><p className="text-blue-400/60 text-[10px] uppercase">Tentative</p></div>
                            <div className="bg-purple-900/20 rounded-lg p-3 text-center"><p className="text-purple-400 font-bold text-lg">{report.guestStats.totalWithPlusOnes}</p><p className="text-purple-400/60 text-[10px] uppercase">Total + Plus Ones</p></div>
                          </div>
                          {selectedReport !== "pre-event" && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-[#1a0108] rounded-lg p-3">
                                <p className="text-gray-500 text-xs mb-2 uppercase">By Group</p>
                                {Object.entries(report.guestStats.groupBreakdown).map(([g, c]) => (
                                  <div key={g} className="flex justify-between py-1 border-b border-[#4a0a1e] last:border-0">
                                    <span className="text-gray-300 text-xs">{g}</span>
                                    <span className="text-white text-xs font-medium">{c as number}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="bg-[#1a0108] rounded-lg p-3">
                                <p className="text-gray-500 text-xs mb-2 uppercase">Dietary Requirements</p>
                                {Object.entries(report.guestStats.dietaryBreakdown).map(([d, c]) => (
                                  <div key={d} className="flex justify-between py-1 border-b border-[#4a0a1e] last:border-0">
                                    <span className="text-gray-300 text-xs">{d}</span>
                                    <span className="text-white text-xs font-medium">{c as number}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-[#2a020d] border-[#4a0a1e]">
                    <CardContent className="p-5">
                      <SectionHeader title="Task Completion" sectionKey="tasks" icon={CheckCircle} count={report.taskStats.total} />
                      {isExpanded("tasks") && (
                        <div className="space-y-3 pt-2">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-green-900/20 rounded-lg p-3 text-center"><p className="text-green-400 font-bold text-lg">{report.taskStats.completed}</p><p className="text-green-400/60 text-[10px] uppercase">Completed</p></div>
                            <div className="bg-blue-900/20 rounded-lg p-3 text-center"><p className="text-blue-400 font-bold text-lg">{report.taskStats.inProgress}</p><p className="text-blue-400/60 text-[10px] uppercase">In Progress</p></div>
                            <div className="bg-gray-800/40 rounded-lg p-3 text-center"><p className="text-gray-400 font-bold text-lg">{report.taskStats.todo}</p><p className="text-gray-400/60 text-[10px] uppercase">To Do</p></div>
                            <div className="bg-red-900/20 rounded-lg p-3 text-center"><p className="text-red-400 font-bold text-lg">{report.taskStats.overdue}</p><p className="text-red-400/60 text-[10px] uppercase">Overdue</p></div>
                          </div>
                          <div className="bg-[#1a0108] rounded-lg p-3">
                            <div className="flex justify-between mb-2"><span className="text-gray-400 text-xs">Completion Rate</span><span className="text-white text-xs font-bold">{report.taskStats.completionRate}%</span></div>
                            <div className="w-full bg-[#330311] rounded-full h-3">
                              <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${report.taskStats.completionRate}%` }} />
                            </div>
                            {report.taskStats.overdue > 0 && (
                              <div className="flex items-center gap-2 mt-3 text-red-400">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-xs font-medium">{report.taskStats.overdue} overdue task{report.taskStats.overdue > 1 ? "s" : ""} need attention</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {(selectedReport === "financial" || selectedReport === "closure" || selectedReport === "pre-event" || selectedReport === "post-event") && (
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-5">
                    <SectionHeader title="Financial Summary" sectionKey="budget" icon={DollarSign} />
                    {isExpanded("budget") && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <StatBox label="Estimated Budget" value={fmtCurrency(report.budgetStats.totalEstimated, report.event.currency)} />
                          <StatBox label="Actual Spend" value={fmtCurrency(report.budgetStats.totalActual, report.event.currency)} sub={report.budgetStats.totalActual > report.budgetStats.totalEstimated ? "Over budget" : "Within budget"} />
                          <StatBox label="Total Paid" value={fmtCurrency(report.budgetStats.totalPaid, report.event.currency)} sub={`${report.budgetStats.paidCount} of ${report.budgetStats.itemCount} items paid`} />
                        </div>

                        {report.budgetStats.totalEstimated > 0 && (
                          <div className="bg-[#1a0108] rounded-lg p-4">
                            <div className="flex justify-between mb-2">
                              <span className="text-gray-400 text-xs">Budget Variance</span>
                              <span className={`text-xs font-bold ${report.budgetStats.totalActual > report.budgetStats.totalEstimated ? "text-red-400" : "text-green-400"}`}>
                                {report.budgetStats.totalActual > report.budgetStats.totalEstimated
                                  ? <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {fmtCurrency(report.budgetStats.totalActual - report.budgetStats.totalEstimated, report.event.currency)} over</span>
                                  : <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> {fmtCurrency(report.budgetStats.totalEstimated - report.budgetStats.totalActual, report.event.currency)} under</span>}
                              </span>
                            </div>
                            <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-[#330311]">
                              <div className="bg-green-500 rounded-l-full" style={{ width: `${Math.min(100, report.budgetStats.totalPaid / Math.max(1, report.budgetStats.totalEstimated) * 100)}%` }} />
                              <div className="bg-yellow-500" style={{ width: `${Math.min(100, (report.budgetStats.totalActual - report.budgetStats.totalPaid) / Math.max(1, report.budgetStats.totalEstimated) * 100)}%` }} />
                            </div>
                            <div className="flex gap-4 mt-2">
                              <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2 h-2 rounded bg-green-500 inline-block" /> Paid</span>
                              <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2 h-2 rounded bg-yellow-500 inline-block" /> Unpaid</span>
                            </div>
                          </div>
                        )}

                        <div className="bg-[#1a0108] rounded-lg p-3">
                          <p className="text-gray-500 text-xs uppercase mb-2">By Category</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500 uppercase text-[10px] border-b border-[#4a0a1e]">
                                  <th className="text-left py-2 pr-2">Category</th>
                                  <th className="text-right py-2 px-2">Items</th>
                                  <th className="text-right py-2 px-2">Estimated</th>
                                  <th className="text-right py-2 px-2">Actual</th>
                                  <th className="text-right py-2 pl-2">Paid</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(report.budgetStats.categoryBreakdown).map(([cat, data]: [string, any]) => (
                                  <tr key={cat} className="border-b border-[#4a0a1e]/50 last:border-0">
                                    <td className="text-gray-300 py-2 pr-2">{cat}</td>
                                    <td className="text-white text-right py-2 px-2">{data.count}</td>
                                    <td className="text-white text-right py-2 px-2">{fmtCurrency(data.estimated, report.event.currency)}</td>
                                    <td className={`text-right py-2 px-2 ${data.actual > data.estimated ? "text-red-400" : "text-white"}`}>{fmtCurrency(data.actual, report.event.currency)}</td>
                                    <td className="text-green-400 text-right py-2 pl-2">{fmtCurrency(data.paid, report.event.currency)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 border-[#4a0a1e] font-bold">
                                  <td className="text-white py-2">Total</td>
                                  <td className="text-white text-right py-2 px-2">{report.budgetStats.itemCount}</td>
                                  <td className="text-white text-right py-2 px-2">{fmtCurrency(report.budgetStats.totalEstimated, report.event.currency)}</td>
                                  <td className="text-white text-right py-2 px-2">{fmtCurrency(report.budgetStats.totalActual, report.event.currency)}</td>
                                  <td className="text-green-400 text-right py-2">{fmtCurrency(report.budgetStats.totalPaid, report.event.currency)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {(selectedReport === "financial" || selectedReport === "closure") && report.budgetItems && (
                          <div className="bg-[#1a0108] rounded-lg p-3">
                            <p className="text-gray-500 text-xs uppercase mb-2">All Budget Items</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500 uppercase text-[10px] border-b border-[#4a0a1e]">
                                    <th className="text-left py-2">Item</th>
                                    <th className="text-left py-2">Category</th>
                                    <th className="text-right py-2">Estimated</th>
                                    <th className="text-right py-2">Actual</th>
                                    <th className="text-right py-2">Paid</th>
                                    <th className="text-center py-2">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {report.budgetItems.map((b: any, i: number) => (
                                    <tr key={i} className="border-b border-[#4a0a1e]/50 last:border-0">
                                      <td className="text-gray-300 py-2">{b.name}</td>
                                      <td className="text-gray-400 py-2">{b.category}</td>
                                      <td className="text-white text-right py-2">{fmtCurrency(parseFloat(b.estimated || 0), report.event.currency)}</td>
                                      <td className="text-white text-right py-2">{fmtCurrency(parseFloat(b.actual || 0), report.event.currency)}</td>
                                      <td className="text-white text-right py-2">{fmtCurrency(parseFloat(b.paid || 0), report.event.currency)}</td>
                                      <td className="text-center py-2">{b.isPaid ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <Clock className="w-4 h-4 text-yellow-400 mx-auto" />}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {report.budgetStats.overBudgetItems.length > 0 && (
                          <div className="bg-red-900/10 rounded-lg p-3 border border-red-900/30">
                            <p className="text-red-400 text-xs font-semibold mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Over-Budget Items</p>
                            {report.budgetStats.overBudgetItems.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between py-1.5 border-b border-red-900/20 last:border-0">
                                <span className="text-gray-300 text-xs">{item.name} <span className="text-gray-500">({item.category})</span></span>
                                <span className="text-red-400 text-xs font-medium">+{fmtCurrency(item.variance, report.event.currency)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {(selectedReport === "vendor" || selectedReport === "closure" || selectedReport === "post-event") && (
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-5">
                    <SectionHeader title="Vendor Summary" sectionKey="vendors" icon={Truck} count={report.vendorStats.total} />
                    {isExpanded("vendors") && (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <StatBox label="Total Vendors" value={report.vendorStats.total} />
                          <StatBox label="Confirmed" value={report.vendorStats.confirmed} />
                          <StatBox label="Total Quoted" value={fmtCurrency(report.vendorStats.totalQuoted, report.event.currency)} />
                          <StatBox label="Total Deposits" value={fmtCurrency(report.vendorStats.totalDeposit, report.event.currency)} />
                        </div>
                        {Object.keys(report.vendorStats.serviceTypes).length > 0 && (
                          <div className="bg-[#1a0108] rounded-lg p-3">
                            <p className="text-gray-500 text-xs uppercase mb-2">By Service Type</p>
                            {Object.entries(report.vendorStats.serviceTypes).map(([type, count]) => (
                              <div key={type} className="flex justify-between py-1.5 border-b border-[#4a0a1e]/50 last:border-0">
                                <span className="text-gray-300 text-xs">{type}</span>
                                <span className="text-white text-xs font-medium">{count as number}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {report.vendors && (
                          <div className="bg-[#1a0108] rounded-lg p-3">
                            <p className="text-gray-500 text-xs uppercase mb-2">All Vendors</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500 uppercase text-[10px] border-b border-[#4a0a1e]">
                                    <th className="text-left py-2">Company</th><th className="text-left py-2">Service</th>
                                    <th className="text-right py-2">Quoted</th><th className="text-right py-2">Final</th>
                                    <th className="text-center py-2">Contract</th><th className="text-center py-2">Payment</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {report.vendors.map((v: any, i: number) => (
                                    <tr key={i} className="border-b border-[#4a0a1e]/50 last:border-0">
                                      <td className="text-gray-300 py-2">{v.company || "—"}</td>
                                      <td className="text-gray-400 py-2">{v.service || "—"}</td>
                                      <td className="text-white text-right py-2">{v.quoted ? fmtCurrency(parseFloat(v.quoted), report.event.currency) : "—"}</td>
                                      <td className="text-white text-right py-2">{v.final ? fmtCurrency(parseFloat(v.final), report.event.currency) : "—"}</td>
                                      <td className="text-center py-2"><StatusBadge status={v.contractStatus || "pending"} color={v.contractStatus === "signed" || v.contractStatus === "confirmed" ? "green" : "yellow"} /></td>
                                      <td className="text-center py-2"><StatusBadge status={v.paymentStatus || "pending"} color={v.paymentStatus === "paid" ? "green" : v.paymentStatus === "partial" ? "yellow" : "gray"} /></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {(selectedReport === "gateway" || selectedReport === "guest-manifest") && (
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-5">
                    <SectionHeader title={selectedReport === "gateway" ? "Gateway / Check-in Report" : "Guest Manifest"} sectionKey="guestlist" icon={UserCheck} count={report.guestStats.total} />
                    {isExpanded("guestlist") && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <StatBox label="Total" value={report.guestStats.total} />
                          <StatBox label="Checked In" value={report.guestStats.checkedIn} sub={fmtPct(report.guestStats.checkedIn, report.guestStats.total)} />
                          <StatBox label="Accepted" value={report.guestStats.accepted} />
                          <StatBox label="Tables" value={report.guestStats.tablesUsed} />
                          <StatBox label="Plus Ones" value={report.guestStats.totalWithPlusOnes - report.guestStats.total} />
                        </div>
                        {report.guests && (
                          <div className="bg-[#1a0108] rounded-lg p-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500 uppercase text-[10px] border-b border-[#4a0a1e]">
                                    <th className="text-left py-2">Name</th><th className="text-left py-2">Group</th>
                                    <th className="text-center py-2">RSVP</th>
                                    {selectedReport === "gateway" && <th className="text-center py-2">In</th>}
                                    <th className="text-left py-2">Table</th><th className="text-center py-2">+1</th>
                                    <th className="text-left py-2">Dietary</th><th className="text-left py-2">Meal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {report.guests.map((g: any, i: number) => (
                                    <tr key={i} className="border-b border-[#4a0a1e]/50 last:border-0">
                                      <td className="text-white py-2 font-medium">{g.name}</td>
                                      <td className="text-gray-400 py-2">{g.group || "—"}</td>
                                      <td className="text-center py-2"><StatusBadge status={g.rsvpStatus} color={g.rsvpStatus === "accepted" ? "green" : g.rsvpStatus === "declined" ? "red" : g.rsvpStatus === "tentative" ? "yellow" : "gray"} /></td>
                                      {selectedReport === "gateway" && <td className="text-center py-2">{g.checkedIn ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-gray-600 mx-auto" />}</td>}
                                      <td className="text-gray-300 py-2">{g.tableAssignment || "—"}</td>
                                      <td className="text-white text-center py-2">{g.plusOnes || 0}</td>
                                      <td className="text-gray-400 py-2">{g.dietary || "—"}</td>
                                      <td className="text-gray-400 py-2">{g.meal || "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {selectedReport === "closure" && (
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-5">
                    <SectionHeader title="Event Closure Checklist" sectionKey="closure" icon={Shield} />
                    {isExpanded("closure") && (
                      <div className="space-y-2 pt-2">
                        {[
                          { label: "All tasks completed", done: report.taskStats.completionRate === 100 },
                          { label: "All vendor payments settled", done: report.budgetStats.unpaidCount === 0 },
                          { label: "All vendors contracted", done: report.vendorStats.pending === 0 },
                          { label: "Guest check-in complete", done: report.guestStats.checkedIn >= report.guestStats.accepted },
                          { label: "Contract signed", done: report.event.contractSigned },
                          { label: "Deposit received", done: report.event.depositPaid },
                          { label: "Budget within estimate", done: report.budgetStats.totalActual <= report.budgetStats.totalEstimated },
                          { label: "All RSVPs received", done: report.guestStats.pending === 0 },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#1a0108] border border-[#4a0a1e]">
                            {item.done
                              ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                              : <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />}
                            <span className={`text-sm ${item.done ? "text-white" : "text-yellow-300"}`}>{item.label}</span>
                            {item.done ? <Check className="w-4 h-4 text-green-400 ml-auto" /> : <span className="text-yellow-400 text-xs ml-auto">Pending</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {submissionPanel && (
        <ReportSubmissionPanel
          eventId={eventId}
          reportType={submissionPanel}
          reportLabel={REPORT_TYPES.find(r => r.key === submissionPanel)?.label || "Report"}
          onClose={() => setSubmissionPanel(null)}
        />
      )}
    </>
  );
}
