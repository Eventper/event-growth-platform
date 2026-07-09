import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import PlannerLayout from "@/components/PlannerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ClipboardList, Users, MapPin, Calendar, DollarSign,
  UserCheck, CheckCircle2, ArrowRight,
  Eye, Inbox, ChevronDown, ChevronRight,
  Star, Layers, Building2, Mail, Phone, Globe,
  Zap, AlertCircle, RefreshCw, ExternalLink,
} from "lucide-react";

const workflowStatusColors: Record<string, string> = {
  new_intake: "bg-amber-100 text-amber-800 border-amber-300",
  assigned: "bg-blue-100 text-blue-800 border-blue-300",
  in_planning: "bg-green-100 text-green-800 border-green-300",
  event_day: "bg-purple-100 text-purple-800 border-purple-300",
  post_event: "bg-slate-100 text-slate-800 border-slate-300",
  closed: "bg-gray-100 text-gray-500 border-gray-300",
};

const workflowStatusLabels: Record<string, string> = {
  new_intake: "New Intake",
  assigned: "Assigned",
  in_planning: "In Planning",
  event_day: "Event Day",
  post_event: "Post-Event",
  closed: "Closed",
};

const enquiryStatusColors: Record<string, string> = {
  new: "bg-amber-100 text-amber-800 border-amber-300",
  reviewing: "bg-blue-100 text-blue-800 border-blue-300",
  approved: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
  converted: "bg-purple-100 text-purple-800 border-purple-300",
};

const priorityBadge: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-300",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-300",
  standard: "bg-gray-50 text-gray-600 border-gray-300",
};

const urgencyIcon: Record<string, any> = {
  urgent: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
  normal: <Clock className="h-3.5 w-3.5 text-yellow-500" />,
  relaxed: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
};

function Clock(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    "corporate-form": "Corporate Form",
    "private-form": "Private Form",
    "simple-form": "Simple Form",
    "full-wizard": "Internal Wizard",
    "internal": "Internal",
    "booking-form": "Booking Form",
  };
  return map[source] || source;
}

export default function ManagerIntake() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queue view: "enquiries" | "events"
  const [activeQueue, setActiveQueue] = useState<"enquiries" | "events">("enquiries");
  const [eventFilter, setEventFilter] = useState<"all" | "new_intake" | "assigned" | "in_planning">("all");
  const [enquiryFilter, setEnquiryFilter] = useState<"all" | "new" | "reviewing" | "approved" | "converted">("all");
  const [search, setSearch] = useState("");

  // Modals
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedPlannerId, setSelectedPlannerId] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignMode, setAssignMode] = useState<"enquiry" | "event">("enquiry");

  // Data
  const { data: enquiries = [], isLoading: enquiriesLoading, refetch: refetchEnquiries } = useQuery<any[]>({
    queryKey: ["/api/cascade/enquiries"],
  });
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery<any[]>({
    queryKey: ["/api/events/intake"],
  });
  const { data: planners = [] } = useQuery<any[]>({
    queryKey: ["/api/users/planners"],
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  // Approve enquiry via cascade (creates event + full setup)
  const approveCascadeMutation = useMutation({
    mutationFn: ({ enquiryId, plannerId, notes }: { enquiryId: number; plannerId: string; notes: string }) =>
      apiRequest("POST", `/api/cascade/approve/${enquiryId}`, { assignedPlannerId: plannerId, notes }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cascade/enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setAssignDialogOpen(false);
      setSelectedItem(null);
      setSelectedPlannerId("");
      setIntakeNotes("");
      toast({
        title: "Enquiry approved & event created!",
        description: "Budget, timeline, tasks and vendor slots have been auto-generated.",
      });
      if (data?.eventId) {
        setLocation(`/event-dashboard/${data.eventId}`);
      }
    },
    onError: (e: any) => toast({ title: "Approval failed", description: e.message, variant: "destructive" }),
  });

  // Reject enquiry
  const rejectMutation = useMutation({
    mutationFn: ({ enquiryId, reason }: { enquiryId: number; reason: string }) =>
      apiRequest("POST", `/api/cascade/reject/${enquiryId}`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cascade/enquiries"] });
      setRejectDialogOpen(false);
      setSelectedItem(null);
      setRejectReason("");
      toast({ title: "Enquiry rejected" });
    },
    onError: () => toast({ title: "Rejection failed", variant: "destructive" }),
  });

  // Assign planner to existing event (internal forms)
  const assignEventMutation = useMutation({
    mutationFn: ({ eventId, plannerId, notes }: { eventId: string; plannerId: string; notes: string }) =>
      apiRequest("PATCH", `/api/events/${eventId}/assign`, { plannerId, intakeNotes: notes, workflowStatus: "assigned" }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events/intake"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setAssignDialogOpen(false);
      setSelectedItem(null);
      setSelectedPlannerId("");
      setIntakeNotes("");
      toast({ title: "Event assigned", description: "The Event Manager has been notified." });
      setLocation(`/event-dashboard/${variables.eventId}`);
    },
    onError: () => toast({ title: "Assignment failed", variant: "destructive" }),
  });

  const workflowMutation = useMutation({
    mutationFn: ({ eventId, workflowStatus }: { eventId: string; workflowStatus: string }) =>
      apiRequest("PATCH", `/api/events/${eventId}/workflow`, { workflowStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events/intake"] });
      toast({ title: "Status updated" });
    },
  });

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredEnquiries = enquiries.filter((e: any) => {
    const matchesStatus = enquiryFilter === "all" || e.status === enquiryFilter;
    const matchesSearch = !search || [e.name, e.email, e.event_type, e.reference, e.client_company].some(
      f => f && f.toLowerCase().includes(search.toLowerCase())
    );
    return matchesStatus && matchesSearch;
  });

  const filteredEvents = events.filter((e: any) => {
    const matchesStatus = eventFilter === "all" || e.workflowStatus === eventFilter;
    const matchesSearch = !search || [e.name, e.city, e.country, e.eventCategory].some(
      f => f && f.toLowerCase().includes(search.toLowerCase())
    );
    return matchesStatus && matchesSearch;
  });

  const enquiryCounts = {
    all: enquiries.length,
    new: enquiries.filter((e: any) => e.status === "new").length,
    reviewing: enquiries.filter((e: any) => e.status === "reviewing").length,
    approved: enquiries.filter((e: any) => e.status === "approved").length,
    converted: enquiries.filter((e: any) => e.status === "converted").length,
  };

  const eventCounts = {
    all: events.length,
    new_intake: events.filter((e: any) => e.workflowStatus === "new_intake").length,
    assigned: events.filter((e: any) => e.workflowStatus === "assigned").length,
    in_planning: events.filter((e: any) => e.workflowStatus === "in_planning").length,
  };

  const handleApproveEnquiry = (enquiry: any) => {
    setSelectedItem(enquiry);
    setAssignMode("enquiry");
    setAssignDialogOpen(true);
  };

  const handleAssignEvent = (event: any) => {
    setSelectedItem(event);
    setAssignMode("event");
    setAssignDialogOpen(true);
  };

  const handleConfirmAssign = () => {
    if (!selectedPlannerId || !selectedItem) return;
    if (assignMode === "enquiry") {
      approveCascadeMutation.mutate({
        enquiryId: selectedItem.id,
        plannerId: selectedPlannerId,
        notes: intakeNotes,
      });
    } else {
      assignEventMutation.mutate({
        eventId: selectedItem.id,
        plannerId: selectedPlannerId,
        notes: intakeNotes,
      });
    }
  };

  const isPending = approveCascadeMutation.isPending || assignEventMutation.isPending;

  return (
    <PlannerLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Event Intake Queue</h1>
            <p className="text-gray-500 mt-1">Review all incoming enquiries and event requests — assign managers to activate full planning</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center min-w-[72px]">
              <div className="text-2xl font-bold text-amber-700">{enquiryCounts.new}</div>
              <div className="text-xs text-amber-600">New Enquiries</div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 text-center min-w-[72px]">
              <div className="text-2xl font-bold text-indigo-700">{eventCounts.new_intake}</div>
              <div className="text-xs text-indigo-600">Events Awaiting</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-center min-w-[72px]">
              <div className="text-2xl font-bold text-green-700">{enquiryCounts.converted + eventCounts.assigned}</div>
              <div className="text-xs text-green-600">Assigned</div>
            </div>
          </div>
        </div>

        {/* Workflow steps */}
        <div className="bg-white border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto">
            {[
              { label: "Enquiry Received", icon: Inbox, color: "text-amber-600" },
              { label: "Manager Reviews", icon: Eye, color: "text-blue-600" },
              { label: "Approve & Assign", icon: UserCheck, color: "text-green-600" },
              { label: "Event Created + Setup", icon: Zap, color: "text-purple-600" },
              { label: "Planning Begins", icon: Layers, color: "text-indigo-600" },
              { label: "Event Day", icon: Star, color: "text-orange-600" },
              { label: "Closed", icon: CheckCircle2, color: "text-gray-500" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-1 whitespace-nowrap">
                <step.icon className={`h-3.5 w-3.5 ${step.color}`} />
                <span className={`font-medium ${step.color}`}>{step.label}</span>
                {i < 6 && <ArrowRight className="h-3 w-3 text-gray-300 mx-0.5" />}
              </div>
            ))}
          </div>
        </div>

        {/* Queue Selector + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-0 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveQueue("enquiries")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeQueue === "enquiries" ? "bg-white text-[#330311] shadow-sm" : "text-gray-600"
              }`}
            >
              <Mail className="h-4 w-4" />
              Enquiries
              {enquiryCounts.new > 0 && (
                <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {enquiryCounts.new}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveQueue("events")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeQueue === "events" ? "bg-white text-[#330311] shadow-sm" : "text-gray-600"
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Internal Events
              {eventCounts.new_intake > 0 && (
                <span className="bg-indigo-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {eventCounts.new_intake}
                </span>
              )}
            </button>
          </div>
          <div className="flex-1">
            <Input
              placeholder="Search by name, email, event type, reference..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchEnquiries(); refetchEvents(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        {/* ─── ENQUIRIES QUEUE ────────────────────────────────────────────── */}
        {activeQueue === "enquiries" && (
          <>
            {/* Status filters */}
            <div className="flex gap-2 flex-wrap">
              {(["all", "new", "reviewing", "approved", "converted"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setEnquiryFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    enquiryFilter === f ? "bg-[#330311] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  {" "}({enquiryCounts[f as keyof typeof enquiryCounts]})
                </button>
              ))}
            </div>

            {enquiriesLoading ? (
              <div className="text-center py-12 text-gray-400">Loading enquiries...</div>
            ) : filteredEnquiries.length === 0 ? (
              <div className="text-center py-16">
                <Mail className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No enquiries in this queue</p>
                <p className="text-gray-400 text-sm mt-1">Client form submissions will appear here automatically</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEnquiries.map((enq: any) => {
                  const isExpanded = expandedId === `enq-${enq.id}`;
                  const services = (() => { try { return JSON.parse(enq.services_required || "[]"); } catch { return []; } })();
                  return (
                    <div key={enq.id} className={`bg-white border rounded-xl overflow-hidden transition-all ${enq.status === "new" ? "border-amber-200 shadow-sm" : ""}`}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Status row */}
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${enquiryStatusColors[enq.status] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
                                {(enq.status || "new").charAt(0).toUpperCase() + (enq.status || "new").slice(1)}
                              </span>
                              {enq.priority && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityBadge[enq.priority] || priorityBadge.standard}`}>
                                  {enq.priority === "high" ? "🔴 High Priority" : enq.priority === "medium" ? "🟡 Medium" : "Standard"}
                                </span>
                              )}
                              {enq.urgency && enq.urgency !== "normal" && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  {urgencyIcon[enq.urgency]}
                                  {enq.urgency === "urgent" ? "URGENT" : "Relaxed timeline"}
                                </span>
                              )}
                              {enq.reference && (
                                <span className="text-xs font-mono text-[#8B1538] bg-[#8B1538]/5 px-2 py-0.5 rounded">
                                  {enq.reference}
                                </span>
                              )}
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                via {sourceLabel(enq.source || "booking-form")}
                              </span>
                            </div>

                            {/* Name + event */}
                            <h3 className="font-semibold text-gray-900 text-base">{enq.name}</h3>
                            {enq.client_company && <p className="text-sm text-gray-500">{enq.client_company}</p>}
                            
                            {/* Meta row */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {enq.event_type || "Event"}
                              </span>
                              {enq.preferred_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {format(new Date(enq.preferred_date), "dd MMM yyyy")}
                                </span>
                              )}
                              {enq.guest_count > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  {enq.guest_count} guests
                                </span>
                              )}
                              {enq.country && (
                                <span className="flex items-center gap-1">
                                  <Globe className="h-3.5 w-3.5" />
                                  {enq.event_location ? `${enq.event_location}, ` : ""}{enq.country}
                                </span>
                              )}
                              {enq.budget && (
                                <span className="flex items-center gap-1 font-medium text-green-700">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  {enq.currency || "GBP"} {enq.budget}
                                </span>
                              )}
                            </div>

                            {/* Contact */}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{enq.email}</span>
                              {enq.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{enq.phone}</span>}
                            </div>

                            {/* Services */}
                            {services.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {services.map((s: string) => (
                                  <span key={s} className="text-xs bg-[#330311]/8 text-[#330311] border border-[#330311]/20 px-2 py-0.5 rounded">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExpandedId(isExpanded ? null : `enq-${enq.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Details
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 ml-1" /> : <ChevronRight className="h-3.5 w-3.5 ml-1" />}
                            </Button>
                            {enq.status === "new" || enq.status === "reviewing" ? (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-[#330311] hover:bg-[#4a0418] text-white"
                                  onClick={() => handleApproveEnquiry(enq)}
                                >
                                  <Zap className="h-3.5 w-3.5 mr-1" />
                                  Approve & Assign
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                  onClick={() => { setSelectedItem(enq); setRejectDialogOpen(true); }}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : enq.status === "converted" && enq.converted_event_id ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-purple-300 text-purple-700"
                                onClick={() => setLocation(`/event-dashboard/${enq.converted_event_id}`)}
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                View Event
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1 text-gray-600">
                              <h4 className="font-medium text-gray-800 mb-2">Enquiry Details</h4>
                              <div><span className="font-medium">Reference:</span> {enq.reference || "—"}</div>
                              <div><span className="font-medium">Source:</span> {sourceLabel(enq.source)}</div>
                              <div><span className="font-medium">Event Type:</span> {enq.event_type || "—"}</div>
                              <div><span className="font-medium">Preferred Date:</span> {enq.preferred_date ? format(new Date(enq.preferred_date), "dd MMM yyyy") : "—"}</div>
                              <div><span className="font-medium">Guests:</span> {enq.guest_count || "—"}</div>
                              <div><span className="font-medium">Budget:</span> {enq.currency} {enq.budget || "—"}</div>
                              <div><span className="font-medium">Country:</span> {enq.country || "—"}</div>
                              <div><span className="font-medium">Has Venue:</span> {enq.has_venue ? `Yes — ${enq.venue_name || "TBC"}` : "No"}</div>
                              <div><span className="font-medium">Preferred Contact:</span> {enq.preferred_contact || "—"}</div>
                              <div><span className="font-medium">Best Time to Call:</span> {enq.best_time_to_contact || "—"}</div>
                            </div>
                            <div className="space-y-1 text-gray-600">
                              <h4 className="font-medium text-gray-800 mb-2">Vision & Requirements</h4>
                              {enq.vision && (
                                <div className="bg-white rounded-lg p-3 border text-gray-700 text-sm italic">
                                  "{enq.vision}"
                                </div>
                              )}
                              {enq.special_requirements && (
                                <div className="mt-2">
                                  <span className="font-medium">Special Requirements:</span>
                                  <p className="text-gray-600 mt-1">{enq.special_requirements}</p>
                                </div>
                              )}
                              {enq.intake_notes && (
                                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-2 text-blue-800 text-xs">
                                  <strong>Manager notes:</strong> {enq.intake_notes}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-xs text-gray-400">Received: {enq.created_at ? format(new Date(enq.created_at), "dd MMM yyyy HH:mm") : "—"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── EVENTS QUEUE (Internal Forms) ───────────────────────────────── */}
        {activeQueue === "events" && (
          <>
            <div className="flex gap-2 flex-wrap">
              {(["all", "new_intake", "assigned", "in_planning"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setEventFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    eventFilter === f ? "bg-[#330311] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {f === "all" ? "All Events" : workflowStatusLabels[f]}
                  {" "}({eventCounts[f as keyof typeof eventCounts] ?? events.length})
                </button>
              ))}
            </div>

            {eventsLoading ? (
              <div className="text-center py-12 text-gray-400">Loading events...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-16">
                <Inbox className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No events in this queue</p>
                <p className="text-gray-400 text-sm mt-1">Events created from the internal wizard will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((event: any) => {
                  const isExpanded = expandedId === `evt-${event.id}`;
                  const services: string[] = [];
                  if (event.needsEndToEndPlanning) services.push("Full Planning");
                  if (event.needsDayCoordination) services.push("Day Coordination");
                  if (event.needsVenueDecoration) services.push("Venue Decor");
                  if (event.needsVenueSearch) services.push("Venue Search");

                  return (
                    <div key={event.id} className="bg-white border rounded-xl overflow-hidden hover:border-[#330311]/30 transition-all">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${workflowStatusColors[event.workflowStatus] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
                                {workflowStatusLabels[event.workflowStatus] || event.workflowStatus}
                              </span>
                              {event.eventCategory && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                                  {event.eventCategory}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 text-base">{event.name}</h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                              {event.startDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {format(new Date(event.startDate), "dd MMM yyyy")}
                                </span>
                              )}
                              {(event.city || event.country) && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {[event.city, event.country].filter(Boolean).join(", ")}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {event.guestCount} guests
                              </span>
                              {(event.budget || event.budgetRange) && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  {event.budgetRange || `${event.currency} ${Number(event.budget).toLocaleString()}`}
                                </span>
                              )}
                            </div>
                            {services.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {services.map(tag => (
                                  <span key={tag} className="text-xs bg-[#330311]/10 text-[#330311] px-2 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExpandedId(isExpanded ? null : `evt-${event.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Details
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 ml-1" /> : <ChevronRight className="h-3.5 w-3.5 ml-1" />}
                            </Button>
                            {event.workflowStatus === "new_intake" && (
                              <Button
                                size="sm"
                                className="bg-[#330311] hover:bg-[#4a0418] text-white"
                                onClick={() => handleAssignEvent(event)}
                              >
                                <UserCheck className="h-3.5 w-3.5 mr-1" />
                                Assign
                              </Button>
                            )}
                            {event.workflowStatus !== "new_intake" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLocation(`/event-dashboard/${event.id}`)}
                              >
                                View Event
                              </Button>
                            )}
                          </div>
                        </div>
                        {event.intakeNotes && (
                          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
                            <span className="font-medium">Manager notes: </span>{event.intakeNotes}
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">Event Details</h4>
                              <div className="space-y-1 text-gray-600">
                                <div><span className="font-medium">Type:</span> {event.type}</div>
                                <div><span className="font-medium">Category:</span> {event.eventCategory || "N/A"}</div>
                                <div><span className="font-medium">Location:</span> {[event.city, event.country].filter(Boolean).join(", ")}</div>
                                <div><span className="font-medium">Currency:</span> {event.currency}</div>
                                <div><span className="font-medium">Guests:</span> {event.guestCount}</div>
                                <div><span className="font-medium">Budget:</span> {event.budgetRange || `${event.currency} ${Number(event.budget || 0).toLocaleString()}`}</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">Services Requested</h4>
                              <div className="space-y-1 text-gray-600">
                                {services.length > 0 ? services.map(t => (
                                  <div key={t} className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                    {t}
                                  </div>
                                )) : <div className="text-gray-400">No specific services selected</div>}
                              </div>
                              <h4 className="font-medium text-gray-700 mb-2 mt-3">Update Workflow Status</h4>
                              <Select
                                value={event.workflowStatus}
                                onValueChange={v => workflowMutation.mutate({ eventId: event.id, workflowStatus: v })}
                              >
                                <SelectTrigger className="w-48 h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new_intake">New Intake</SelectItem>
                                  <SelectItem value="assigned">Assigned</SelectItem>
                                  <SelectItem value="in_planning">In Planning</SelectItem>
                                  <SelectItem value="event_day">Event Day</SelectItem>
                                  <SelectItem value="post_event">Post-Event</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                              {workflowMutation.isPending && <span className="text-xs text-amber-400">Saving...</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2 border-t">
                            <Button size="sm" variant="outline" onClick={() => setLocation(`/event-dashboard/${event.id}`)}>
                              Open Event Dashboard
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Assign / Approve Dialog ─────────────────────────────────────── */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {assignMode === "enquiry" ? (
                  <><Zap className="h-5 w-5 text-[#8B1538]" /> Approve Enquiry & Assign Event Manager</>
                ) : (
                  <><UserCheck className="h-5 w-5 text-[#8B1538]" /> Assign Event Manager</>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div className="bg-gray-50 border rounded-lg p-3 text-sm">
                  <div className="font-semibold text-gray-900">{selectedItem.name || selectedItem.event_type}</div>
                  {assignMode === "enquiry" ? (
                    <>
                      <div className="text-gray-500 mt-0.5">{selectedItem.email} · {selectedItem.event_type}</div>
                      {selectedItem.preferred_date && (
                        <div className="text-gray-500">{format(new Date(selectedItem.preferred_date), "dd MMM yyyy")} · {selectedItem.guest_count} guests</div>
                      )}
                      {assignMode === "enquiry" && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2 text-amber-800 text-xs">
                          <strong>Cascade on approval:</strong> Full event record created · Budget auto-allocated · Timeline & task checklist generated · Vendor slots created · Planner notified
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-500 mt-0.5">
                      {selectedItem.eventCategory} · {[selectedItem.city, selectedItem.country].filter(Boolean).join(", ")} ·{" "}
                      {selectedItem.startDate && format(new Date(selectedItem.startDate), "dd MMM yyyy")}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Assign to Event Manager *</label>
                  <Select value={selectedPlannerId} onValueChange={setSelectedPlannerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a planner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {planners.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.role}){p.jobTitle ? ` · ${p.jobTitle}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Manager Notes (optional)</label>
                  <Textarea
                    value={intakeNotes}
                    onChange={e => setIntakeNotes(e.target.value)}
                    placeholder="Any special instructions, priorities, or context for the Event Manager..."
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-[#330311] hover:bg-[#4a0418] text-white"
                disabled={!selectedPlannerId || isPending}
                onClick={handleConfirmAssign}
              >
                {isPending ? "Processing..." : assignMode === "enquiry" ? "Approve & Launch Event" : "Assign Event Manager"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Reject Dialog ───────────────────────────────────────────────── */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Enquiry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This will mark the enquiry as rejected. Please provide a reason (optional):
              </p>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={rejectMutation.isPending}
                onClick={() => selectedItem && rejectMutation.mutate({ enquiryId: selectedItem.id, reason: rejectReason })}
              >
                {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PlannerLayout>
  );
}
