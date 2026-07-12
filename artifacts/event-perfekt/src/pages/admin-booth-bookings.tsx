import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import PlannerLayout from "@/components/PlannerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  User,
  MapPin,
  Clock,
  PoundSterling,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  FileText,
  Download,
  CreditCard,
  Banknote,
  Filter,
  ChevronRight,
  Loader2,
  Copy,
  ExternalLink,
  History,
  ChevronDown,
} from "lucide-react";

interface BoothBooking {
  id: string;
  token: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  eventDate: string;
  venue: string;
  eventType?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  duration?: string;
  packageName: string;
  service?: string;
  netAmount?: string;
  hireFee: string;
  vat: string;
  totalDue: string;
  depositDue: string;
  balanceDue: string;
  status: string;
  paymentStatus: string;
  country?: string;
  currency?: string;
  quoteSent: boolean;
  depositPaid: boolean;
  balancePaid: boolean;
  bookingConfirmed: boolean;
  agreementAccepted: boolean;
  adminReviewStatus?: string; // pending, draft, approved, hold, deleted
  reviewEmailType?: string;
  createdBy?: string;
  updatedBy?: string;
  lastActionAt?: string;
  lastActionBy?: string;
  lastActionType?: string;
  createdAt: string;
}

interface BoothInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  serviceType?: string;
  message?: string;
  status: string;
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  performedBy: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  new_enquiry: "bg-blue-100 text-blue-800",
  quote_sent: "bg-purple-100 text-purple-800",
  awaiting_deposit: "bg-amber-100 text-amber-800",
  deposit_paid: "bg-emerald-100 text-emerald-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  new_enquiry: "New Enquiry",
  quote_sent: "Quote Sent",
  awaiting_deposit: "Awaiting Deposit",
  deposit_paid: "Deposit Paid",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function AdminBoothBookings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<Record<string, AuditLogEntry[]>>({});
  const [view, setView] = useState<"bookings" | "inquiries">("bookings");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["/api/booth-bookings"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/booth-bookings", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load bookings");
      return res.json() as Promise<BoothBooking[]>;
    },
  });

  // Query booth inquiries
  const { data: inquiriesData, isLoading: inquiriesLoading } = useQuery({
    queryKey: ["booth-inquiries"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/booth-inquiries?limit=100");
      return res.json();
    },
  });

  const inquiries = inquiriesData?.inquiries || [];

  // Generate quote/invoice draft (sends to info@eventperfekt.com for review)
  const sendQuoteMutation = useMutation({
    mutationFn: async (token: string) => {
      const authToken = localStorage.getItem("token");
      const res = await fetch(`/api/booth-bookings/${token}/send-quote`, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send quote");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booth-bookings"] });
      toast({ title: "Draft generated", description: "Internal review email sent to info@eventperfekt.com. Waiting for admin approval before client receives it." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async (token: string) => {
      const authToken = localStorage.getItem("token");
      const res = await fetch(`/api/booth-bookings/${token}/send-invoice`, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send invoice");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booth-bookings"] });
      toast({ title: "Invoice draft generated", description: "Internal review email sent to info@eventperfekt.com. Waiting for admin approval before client receives it." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Admin approval — sends to client
  const approveSendMutation = useMutation({
    mutationFn: async ({ token, emailType }: { token: string; emailType: string }) => {
      const authToken = localStorage.getItem("token");
      const res = await fetch(`/api/booth-bookings/${token}/approve-send`, {
        method: "POST",
        headers: authToken
          ? { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" }
          : { "Content-Type": "application/json" },
        body: JSON.stringify({ emailType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to approve and send");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/booth-bookings"] });
      toast({ title: "✅ Approved & Sent", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Edit draft — clears draft so it can be regenerated
  const editDraftMutation = useMutation({
    mutationFn: async (token: string) => {
      const authToken = localStorage.getItem("token");
      const res = await fetch(`/api/booth-bookings/${token}/edit-draft`, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to edit draft");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booth-bookings"] });
      toast({ title: "Draft cleared", description: "You can now re-generate the quote or invoice." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Hold draft
  const holdDraftMutation = useMutation({
    mutationFn: async (token: string) => {
      const authToken = localStorage.getItem("token");
      const res = await fetch(`/api/booth-bookings/${token}/hold-draft`, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to hold draft");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booth-bookings"] });
      toast({ title: "Draft held", description: "No email will be sent until admin reactivates it." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Delete draft
  const deleteDraftMutation = useMutation({
    mutationFn: async (token: string) => {
      const authToken = localStorage.getItem("token");
      const res = await fetch(`/api/booth-bookings/${token}/delete-draft`, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete draft");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booth-bookings"] });
      toast({ title: "Draft deleted", description: "No email will be sent." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/booth-bookings/${id}/status`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booth-bookings"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      !search ||
      b.clientName.toLowerCase().includes(search.toLowerCase()) ||
      b.venue.toLowerCase().includes(search.toLowerCase()) ||
      b.eventDate.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyLink = (token: string) => {
    const link = `https://eventperfekt.net/booking-confirmation/${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: "Client link copied to clipboard" });
  };

  return (
    <PlannerLayout>
    <div className="min-h-screen bg-[#f8f5f6]">
      <header className="bg-[#330311] text-white py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Photo Booth Bookings</h1>
            <p className="text-white/70 text-sm mt-1">Manage 360 Booth Hire bookings</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/booth-bookings/calendar")}
              className="text-white hover:bg-white/10"
            >
              <CalendarIcon className="w-4 h-4 mr-1" />
              Calendar
            </Button>
            <Button
              onClick={() => navigate("/admin/booth-bookings/new")}
              className="bg-white text-[#330311] hover:bg-white/90 font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* View Tabs */}
        <div className="flex gap-2 border-b border-gray-300">
          <button
            onClick={() => setView("bookings")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              view === "bookings"
                ? "border-b-2 border-[#C9A84C] text-[#330311]"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setView("inquiries")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              view === "inquiries"
                ? "border-b-2 border-[#C9A84C] text-[#330311]"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Inquiries ({inquiries.length})
          </button>
        </div>

        {view === "bookings" ? (
          <>
        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client, venue, or date..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Bookings" value={bookings.length} />
          <StatCard label="Awaiting Deposit" value={bookings.filter((b) => b.status === "awaiting_deposit").length} />
          <StatCard label="Confirmed" value={bookings.filter((b) => b.status === "confirmed").length} />
          <StatCard label="Completed" value={bookings.filter((b) => b.status === "completed").length} />
        </div>

        {/* Bookings List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#330311]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CalendarIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No bookings found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-sm border overflow-hidden"
              >
                <div className="p-5 flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[b.status] || "bg-gray-100 text-gray-800"}`}>
                        {STATUS_LABELS[b.status] || b.status}
                      </span>
                      {/* Review status badge */}
                      {b.adminReviewStatus === "draft" && (
                        <Badge icon={<FileText className="w-3 h-3" />} text={`Draft ${b.reviewEmailType || ""} (awaiting approval)`} />
                      )}
                      {b.adminReviewStatus === "approved" && (
                        <Badge icon={<CheckCircle className="w-3 h-3" />} text={`Sent to client`} />
                      )}
                      {b.adminReviewStatus === "hold" && (
                        <Badge icon={<Clock className="w-3 h-3" />} text="On hold" />
                      )}
                      {b.adminReviewStatus === "deleted" && (
                        <Badge icon={<XCircle className="w-3 h-3" />} text="Deleted" />
                      )}
                      {b.quoteSent && b.adminReviewStatus !== "draft" && <Badge icon={<Mail className="w-3 h-3" />} text="Quote Sent" />}
                      {b.depositPaid && <Badge icon={<CreditCard className="w-3 h-3" />} text="Deposit Paid" />}
                      {b.balancePaid && <Badge icon={<Banknote className="w-3 h-3" />} text="Balance Paid" />}
                      {b.agreementAccepted && <Badge icon={<CheckCircle className="w-3 h-3" />} text="Agreement Signed" />}
                    </div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#330311]" />
                      {b.clientName}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-gray-400" /> {b.eventDate}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> {b.venue}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" /> {b.eventStartTime || "—"} – {b.eventEndTime || "—"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <PoundSterling className="w-3.5 h-3.5 text-gray-400" /> Total: {b.totalDue}
                      </span>
                    </div>
                    {/* Owner / Last Action line */}
                    {(b.createdBy || b.lastActionBy) && (
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        {b.createdBy && <span>Created by: <strong>{b.createdBy}</strong></span>}
                        {b.lastActionBy && (
                          <span>Last action: <strong>{b.lastActionBy}</strong> — {b.lastActionType?.replace(/_/g, ' ')} — {new Date(b.lastActionAt!).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button size="sm" variant="outline" onClick={() => handleCopyLink(b.token)}>
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy Link
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(`/booking-confirmation/${b.token}`, "_blank")}>
                      <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/admin/booth-bookings/invoice/${b.token}`)}>
                      <FileText className="w-3.5 h-3.5 mr-1" /> Invoice
                    </Button>

                    {/* ── DRAFT GENERATION (no draft exists) ── */}
                    {(!b.adminReviewStatus || b.adminReviewStatus === "pending" || b.adminReviewStatus === "deleted") && (
                      <>
                        {!b.quoteSent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-purple-300 text-purple-700 hover:bg-purple-50"
                            disabled={sendQuoteMutation.isPending}
                            onClick={() => sendQuoteMutation.mutate(b.token)}
                          >
                            {sendQuoteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1" />}
                            Generate Quote Draft
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                          disabled={sendInvoiceMutation.isPending}
                          onClick={() => sendInvoiceMutation.mutate(b.token)}
                        >
                          {sendInvoiceMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1" />}
                          Generate Invoice Draft
                        </Button>
                      </>
                    )}

                    {/* ── ADMIN APPROVAL GATEWAY (draft exists) ── */}
                    {b.adminReviewStatus === "draft" && (
                      <>
                        {/* Approve & Send to Client */}
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={approveSendMutation.isPending}
                          onClick={() => approveSendMutation.mutate({ token: b.token, emailType: b.reviewEmailType || "quote" })}
                        >
                          {approveSendMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                          Approve & Send to Client
                        </Button>
                        {/* Edit Draft */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-300 text-amber-700 hover:bg-amber-50"
                          disabled={editDraftMutation.isPending}
                          onClick={() => editDraftMutation.mutate(b.token)}
                        >
                          {editDraftMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1" />}
                          Edit Draft
                        </Button>
                        {/* Hold Draft */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-300 text-gray-600 hover:bg-gray-50"
                          disabled={holdDraftMutation.isPending}
                          onClick={() => holdDraftMutation.mutate(b.token)}
                        >
                          {holdDraftMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Clock className="w-3.5 h-3.5 mr-1" />}
                          Hold Draft
                        </Button>
                        {/* Delete Draft */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          disabled={deleteDraftMutation.isPending}
                          onClick={() => deleteDraftMutation.mutate(b.token)}
                        >
                          {deleteDraftMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                          Delete Draft
                        </Button>
                      </>
                    )}

                    {/* ── On hold → allow reactivate or delete ── */}
                    {b.adminReviewStatus === "hold" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                          disabled={editDraftMutation.isPending}
                          onClick={() => editDraftMutation.mutate(b.token)}
                        >
                          {editDraftMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1" />}
                          Reactivate & Regenerate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          disabled={deleteDraftMutation.isPending}
                          onClick={() => deleteDraftMutation.mutate(b.token)}
                        >
                          {deleteDraftMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                          Delete Draft
                        </Button>
                      </>
                    )}

                    {/* ── Payment actions ── */}
                    {b.status !== "deposit_paid" && b.status !== "confirmed" && (
                      <Button
                        size="sm"
                        className="bg-[#330311] hover:bg-[#4a041c] text-white"
                        onClick={() =>
                          updateMutation.mutate({
                            id: b.id,
                            updates: { depositPaid: true, status: "deposit_paid", paymentStatus: "deposit_paid" },
                          })
                        }
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1" /> Mark Deposit Paid
                      </Button>
                    )}
                    {!b.balancePaid && b.status === "deposit_paid" && (
                      <Button
                        size="sm"
                        className="bg-[#330311] hover:bg-[#4a041c] text-white"
                        onClick={() =>
                          updateMutation.mutate({
                            id: b.id,
                            updates: { balancePaid: true, status: "confirmed", paymentStatus: "fully_paid", bookingConfirmed: true },
                          })
                        }
                      >
                        <Banknote className="w-3.5 h-3.5 mr-1" /> Mark Balance Paid
                      </Button>
                    )}
                    {/* View History */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-500 hover:text-[#330311]"
                      onClick={async () => {
                        if (expandedAudit === b.token) {
                          setExpandedAudit(null);
                          return;
                        }
                        setExpandedAudit(b.token);
                        if (!auditLogs[b.token]) {
                          try {
                            const res = await fetch(`/api/booth-bookings/${b.token}/audit-log`);
                            const data = await res.json();
                            setAuditLogs(prev => ({ ...prev, [b.token]: Array.isArray(data) ? data : [] }));
                          } catch (e) {
                            setAuditLogs(prev => ({ ...prev, [b.token]: [] }));
                          }
                        }
                      }}
                    >
                      <History className="w-3.5 h-3.5 mr-1" />
                      {expandedAudit === b.token ? 'Hide' : 'History'}
                      <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${expandedAudit === b.token ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                </div>

                {/* Audit Log Panel */}
                {expandedAudit === b.token && (
                  <div className="border-t bg-gray-50 px-5 py-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Action History</h4>
                    {(auditLogs[b.token] || []).length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No actions recorded yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {(auditLogs[b.token] || []).map((log) => (
                          <div key={log.id} className="flex items-start gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-[#330311] mt-1.5 shrink-0" />
                            <div className="flex-1">
                              <p className="text-gray-800">
                                <strong className="text-[#330311]">{log.performedBy}</strong>{' '}
                                {log.action.replace(/_/g, ' ')}
                              </p>
                              {log.details && <p className="text-gray-500 text-xs mt-0.5">{log.details}</p>}
                              {log.oldValue && log.newValue && (
                                <p className="text-gray-400 text-xs mt-0.5">
                                  {log.oldValue} → {log.newValue}
                                </p>
                              )}
                              <p className="text-gray-400 text-xs mt-0.5">
                                {new Date(log.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
          ) : (
            <div className="space-y-6">
              {/* Inquiries Search & Filter */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or email..."
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      <option value="">All Statuses</option>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="quote_sent">Quote Sent</option>
                      <option value="booked">Booked</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {inquiriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#C9A84C]" />
                </div>
              ) : inquiries.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center text-gray-500">
                    <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No booth inquiries yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {inquiries
                    .filter((inq) => {
                      const matchesSearch =
                        !search ||
                        inq.name.toLowerCase().includes(search.toLowerCase()) ||
                        inq.email.toLowerCase().includes(search.toLowerCase());
                      const matchesStatus = !statusFilter || inq.status === statusFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map((inq) => (
                      <motion.div
                        key={inq.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-[#330311]">{inq.name}</h3>
                                  <Badge className="bg-[#C9A84C] text-white text-xs">
                                    {inq.status}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <p className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    {inq.email}
                                  </p>
                                  {inq.phone && (
                                    <p className="flex items-center gap-2">
                                      <Phone className="w-4 h-4" />
                                      {inq.phone}
                                    </p>
                                  )}
                                  {inq.company && (
                                    <p className="flex items-center gap-2">
                                      <User className="w-4 h-4" />
                                      {inq.company}
                                    </p>
                                  )}
                                  {inq.serviceType && (
                                    <p className="text-xs text-gray-500">Service: {inq.serviceType}</p>
                                  )}
                                  <p className="text-xs text-gray-400">
                                    {new Date(inq.created_at).toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/admin/booth-dashboard`)}
                                  className="text-xs"
                                >
                                  View in Dashboard
                                </Button>
                              </div>
                            </div>
                            {inq.message && (
                              <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                                <p className="font-medium text-xs text-gray-500 mb-1">Message:</p>
                                <p className="text-gray-700">{inq.message}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                </div>
              )}
            </div>
          )}
      </main>
    </div>
    </PlannerLayout>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 text-center">
        <p className="text-2xl font-bold text-[#330311]">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
      {icon} {text}
    </span>
  );
}
