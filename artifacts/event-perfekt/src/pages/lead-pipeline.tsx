import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PlannerLayout from "@/components/PlannerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Calendar,
  DollarSign,
  Globe,
  MoreVertical,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  StickyNote,
  Mail,
  Sparkles,
  Search,
  RefreshCw,
  GripVertical,
  Printer,
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";

interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  event_type: string;
  guest_count: number | null;
  preferred_date: string | null;
  budget_range: string | null;
  country: string | null;
  message: string | null;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
}

const PIPELINE_STAGES = [
  { key: "new", label: "New Enquiry", color: "bg-blue-500/20 border-blue-500/40 text-blue-300" },
  { key: "consultation", label: "Consultation", color: "bg-purple-500/20 border-purple-500/40 text-purple-300" },
  { key: "proposal_sent", label: "Proposal Sent", color: "bg-amber-500/20 border-amber-500/40 text-amber-300" },
  { key: "negotiation", label: "Negotiation", color: "bg-orange-500/20 border-orange-500/40 text-orange-300" },
  { key: "booked", label: "Booked", color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
  { key: "lost", label: "Lost", color: "bg-red-500/20 border-red-500/40 text-red-300" },
];

const eventTypeLabels: Record<string, string> = {
  wedding: "Wedding",
  corporate: "Corporate",
  birthday: "Birthday",
  gala: "Gala",
  conference: "Conference",
  seminar: "Seminar",
  product_launch: "Product Launch",
  other: "Other",
};

function getEventTypeColor(type: string) {
  const colors: Record<string, string> = {
    wedding: "bg-pink-500/20 text-pink-300",
    corporate: "bg-blue-500/20 text-blue-300",
    birthday: "bg-yellow-500/20 text-yellow-300",
    gala: "bg-purple-500/20 text-purple-300",
    conference: "bg-cyan-500/20 text-cyan-300",
    seminar: "bg-teal-500/20 text-teal-300",
    product_launch: "bg-indigo-500/20 text-indigo-300",
  };
  return colors[type] || "bg-gray-500/20 text-gray-300";
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Not set";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function LeadCard({
  enquiry,
  stageIndex,
  onMoveForward,
  onMoveBack,
  onAssign,
  onAddNote,
  onSendEmail,
  onConvert,
  onClick,
}: {
  enquiry: Enquiry;
  stageIndex: number;
  onMoveForward: () => void;
  onMoveBack: () => void;
  onAssign: () => void;
  onAddNote: () => void;
  onSendEmail: () => void;
  onConvert: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className="bg-black/20 border border-white/10 rounded-xl p-3.5 cursor-pointer hover:border-amber-500/40 hover:bg-black/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-white font-medium text-sm truncate flex-1 mr-2">
          {enquiry.name}
        </h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1a0209] border-white/10">
            {stageIndex < PIPELINE_STAGES.length - 2 && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveForward(); }} className="text-white hover:bg-white/10">
                <ArrowRight className="h-4 w-4 mr-2" /> Move Forward
              </DropdownMenuItem>
            )}
            {stageIndex > 0 && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveBack(); }} className="text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" /> Move Back
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssign(); }} className="text-white hover:bg-white/10">
              <UserPlus className="h-4 w-4 mr-2" /> Assign Planner
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddNote(); }} className="text-white hover:bg-white/10">
              <StickyNote className="h-4 w-4 mr-2" /> Add Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSendEmail(); }} className="text-white hover:bg-white/10">
              <Mail className="h-4 w-4 mr-2" /> Send Email
            </DropdownMenuItem>
            {enquiry.status === "booked" && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onConvert(); }} className="text-emerald-400 hover:bg-white/10">
                <Sparkles className="h-4 w-4 mr-2" /> Convert to Event
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Badge className={`${getEventTypeColor(enquiry.event_type)} border-0 text-xs mb-2`}>
        {eventTypeLabels[enquiry.event_type] || enquiry.event_type}
      </Badge>

      <div className="space-y-1 text-xs text-gray-400">
        {enquiry.preferred_date && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(enquiry.preferred_date)}</span>
          </div>
        )}
        {enquiry.guest_count && (
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            <span>{enquiry.guest_count} guests</span>
          </div>
        )}
        {enquiry.budget_range && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3 w-3" />
            <span>{enquiry.budget_range}</span>
          </div>
        )}
        {enquiry.country && (
          <div className="flex items-center gap-1.5">
            <Globe className="h-3 w-3" />
            <span>{enquiry.country}</span>
          </div>
        )}
      </div>

      {enquiry.assigned_to && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-[#8B1538]/40 flex items-center justify-center">
            <span className="text-[10px] text-white font-medium">
              {enquiry.assigned_to.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-gray-400 truncate">{enquiry.assigned_to}</span>
        </div>
      )}

      <div className="mt-2 text-[10px] text-gray-500">
        {formatDate(enquiry.created_at)}
      </div>
    </div>
  );
}

export default function LeadPipeline() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [assignee, setAssignee] = useState("");

  const { data: enquiries = [], isLoading } = useQuery<Enquiry[]>({
    queryKey: ["/api/enquiries"],
  });

  const updateEnquiry = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, string | null> }) => {
      return apiRequest("PATCH", `/api/enquiries/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
    },
  });

  const convertToEvent = useMutation({
    mutationFn: async (enquiryId: string) => {
      return apiRequest("POST", `/api/enquiries/${enquiryId}/convert`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({ title: "Success", description: "Enquiry converted to event successfully!" });
      setConvertDialogOpen(false);
      const eventId = data?.id || data?.eventId;
      if (eventId) {
        navigate(`/event-dashboard/${eventId}`);
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to convert enquiry", variant: "destructive" });
    },
  });

  const filteredEnquiries = enquiries.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.event_type && e.event_type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getEnquiriesByStage = (stageKey: string) =>
    filteredEnquiries.filter((e) => (e.status || "new") === stageKey);

  function handleMoveToStage(enquiry: Enquiry, newStatus: string) {
    updateEnquiry.mutate(
      { id: enquiry.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          const stage = PIPELINE_STAGES.find((s) => s.key === newStatus);
          toast({
            title: "Lead Updated",
            description: `${enquiry.name} moved to ${stage?.label || newStatus}`,
          });
        },
      }
    );
  }

  function handleAssign() {
    if (!selectedEnquiry || !assignee.trim()) return;
    updateEnquiry.mutate(
      { id: selectedEnquiry.id, data: { assigned_to: assignee.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Assigned", description: `Lead assigned to ${assignee}` });
          setAssignDialogOpen(false);
          setAssignee("");
        },
      }
    );
  }

  function handleAddNote() {
    if (!selectedEnquiry || !noteText.trim()) return;
    const existingNotes = selectedEnquiry.notes || "";
    const timestamp = new Date().toLocaleString();
    const updatedNotes = existingNotes
      ? `${existingNotes}\n\n[${timestamp}] ${noteText.trim()}`
      : `[${timestamp}] ${noteText.trim()}`;

    updateEnquiry.mutate(
      { id: selectedEnquiry.id, data: { notes: updatedNotes } },
      {
        onSuccess: () => {
          toast({ title: "Note Added", description: "Note has been saved" });
          setNoteDialogOpen(false);
          setNoteText("");
        },
      }
    );
  }

  function handleSendEmail(enquiry: Enquiry) {
    window.open(`mailto:${enquiry.email}?subject=Re: Your Event Enquiry - Event Perfekt`, "_blank");
  }

  function openDetail(enquiry: Enquiry) {
    setSelectedEnquiry(enquiry);
    setDetailDialogOpen(true);
  }

  const [, navigate] = useLocation();

  return (
    <PlannerLayout>
      <div className="px-4 md:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Lead Pipeline
          </h1>
          <p className="text-white/60 mt-1">
            Track and manage enquiries through your sales pipeline
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search leads by name, email, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          {filteredEnquiries.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-white/40 text-white hover:bg-white/10 hover:border-white/60"
              onClick={() => openPrintWindow({
                title: "Lead Pipeline",
                stats: PIPELINE_STAGES.map(s => ({
                  label: s.label,
                  value: getEnquiriesByStage(s.key).length,
                })),
                columns: [
                  { header: "Name", key: "name" },
                  { header: "Event Type", key: "event_type", format: (v: string) => eventTypeLabels[v] || v },
                  { header: "Budget", key: "budget_range", format: (v: string | null) => v || "N/A" },
                  { header: "Status", key: "status", format: (v: string) => PIPELINE_STAGES.find(s => s.key === v)?.label || v },
                  { header: "Date", key: "created_at", format: (v: string) => formatDate(v) },
                ],
                rows: filteredEnquiries,
                orientation: "landscape",
              })}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] })}
            className="border-white/40 text-white hover:bg-white/10 hover:border-white/60"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 text-[#8B1538] animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4a0a1e #1a0209' }}>
            <div className="flex gap-4" style={{ minWidth: `${PIPELINE_STAGES.length * 280}px` }}>
            {PIPELINE_STAGES.map((stage, stageIndex) => {
              const stageEnquiries = getEnquiriesByStage(stage.key);
              return (
                <div
                  key={stage.key}
                  className="flex-1" style={{ minWidth: '250px' }}
                >
                  <div className={`rounded-t-xl px-4 py-3 border ${stage.color} flex items-center justify-between`}>
                    <h3 className="text-sm font-bold uppercase tracking-wide">{stage.label}</h3>
                    <span className="text-sm font-bold bg-black/20 rounded-full w-7 h-7 flex items-center justify-center">
                      {stageEnquiries.length}
                    </span>
                  </div>

                  <div className="bg-white/5 border border-t-0 border-white/10 rounded-b-xl p-3 space-y-3" style={{ minHeight: '350px', maxHeight: '70vh', overflowY: 'auto' }}>
                    {stageEnquiries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-white/20">
                        <Users className="w-8 h-8 mb-2" />
                        <p className="text-xs italic">No leads in this stage</p>
                      </div>
                    ) : (
                      stageEnquiries.map((enquiry) => (
                        <LeadCard
                          key={enquiry.id}
                          enquiry={enquiry}
                          stageIndex={stageIndex}
                          onClick={() => openDetail(enquiry)}
                          onMoveForward={() => {
                            const nextStage = PIPELINE_STAGES[stageIndex + 1];
                            if (nextStage) handleMoveToStage(enquiry, nextStage.key);
                          }}
                          onMoveBack={() => {
                            const prevStage = PIPELINE_STAGES[stageIndex - 1];
                            if (prevStage) handleMoveToStage(enquiry, prevStage.key);
                          }}
                          onAssign={() => {
                            setSelectedEnquiry(enquiry);
                            setAssignDialogOpen(true);
                          }}
                          onAddNote={() => {
                            setSelectedEnquiry(enquiry);
                            setNoteText("");
                            setNoteDialogOpen(true);
                          }}
                          onSendEmail={() => handleSendEmail(enquiry)}
                          onConvert={() => {
                            setSelectedEnquiry(enquiry);
                            setConvertDialogOpen(true);
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="bg-[#1a0209] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Lead Details</DialogTitle>
            </DialogHeader>
            {selectedEnquiry && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400 block">Name</span>
                    <span className="text-white font-medium">{selectedEnquiry.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Email</span>
                    <span className="text-white">{selectedEnquiry.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Phone</span>
                    <span className="text-white">{selectedEnquiry.phone || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Event Type</span>
                    <Badge className={`${getEventTypeColor(selectedEnquiry.event_type)} border-0`}>
                      {eventTypeLabels[selectedEnquiry.event_type] || selectedEnquiry.event_type}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Guest Count</span>
                    <span className="text-white">{selectedEnquiry.guest_count || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Preferred Date</span>
                    <span className="text-white">{formatDate(selectedEnquiry.preferred_date)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Budget Range</span>
                    <span className="text-white">{selectedEnquiry.budget_range || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Country</span>
                    <span className="text-white">{selectedEnquiry.country || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Status</span>
                    <span className="text-white capitalize">{selectedEnquiry.status?.replace("_", " ")}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Assigned To</span>
                    <span className="text-white">{selectedEnquiry.assigned_to || "Unassigned"}</span>
                  </div>
                </div>

                {selectedEnquiry.message && (
                  <div>
                    <span className="text-gray-400 text-sm block mb-1">Message</span>
                    <p className="text-white text-sm bg-white/5 rounded-lg p-3">{selectedEnquiry.message}</p>
                  </div>
                )}

                {selectedEnquiry.notes && (
                  <div>
                    <span className="text-gray-400 text-sm block mb-1">Notes</span>
                    <pre className="text-white text-sm bg-white/5 rounded-lg p-3 whitespace-pre-wrap font-sans">
                      {selectedEnquiry.notes}
                    </pre>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Select
                    value={selectedEnquiry.status || "new"}
                    onValueChange={(val) => {
                      handleMoveToStage(selectedEnquiry, val);
                      setSelectedEnquiry({ ...selectedEnquiry, status: val });
                    }}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0209] border-white/10">
                      {PIPELINE_STAGES.map((s) => (
                        <SelectItem key={s.key} value={s.key} className="text-white hover:bg-white/10">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailDialogOpen(false);
                      setNoteDialogOpen(true);
                    }}
                    className="border-white/10 text-gray-300"
                  >
                    <StickyNote className="h-4 w-4 mr-1" /> Note
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendEmail(selectedEnquiry)}
                    className="border-white/10 text-gray-300"
                  >
                    <Mail className="h-4 w-4 mr-1" /> Email
                  </Button>
                  {selectedEnquiry.status === "booked" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        setConvertDialogOpen(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Sparkles className="h-4 w-4 mr-1" /> Convert
                    </Button>
                  )}
                </div>

                <div className="text-xs text-gray-500 pt-1">
                  Created: {formatDate(selectedEnquiry.created_at)}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
          <DialogContent className="bg-[#1a0209] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Add Note</DialogTitle>
            </DialogHeader>
            <Textarea
              placeholder="Enter your note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteDialogOpen(false)} className="border-white/10 text-gray-300">
                Cancel
              </Button>
              <Button onClick={handleAddNote} disabled={!noteText.trim() || updateEnquiry.isPending} className="bg-[#8B1538] hover:bg-[#8B1538]/80">
                Save Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="bg-[#1a0209] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Assign Planner</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Enter planner name or email..."
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)} className="border-white/10 text-gray-300">
                Cancel
              </Button>
              <Button onClick={handleAssign} disabled={!assignee.trim() || updateEnquiry.isPending} className="bg-[#8B1538] hover:bg-[#8B1538]/80">
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
          <DialogContent className="bg-[#1a0209] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Convert to Event</DialogTitle>
            </DialogHeader>
            {selectedEnquiry && (
              <div className="space-y-3">
                <p className="text-gray-300 text-sm">
                  This will create a new event from the enquiry data for <strong>{selectedEnquiry.name}</strong>.
                </p>
                <div className="bg-white/5 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Event Type:</span>
                    <span className="text-white">{eventTypeLabels[selectedEnquiry.event_type] || selectedEnquiry.event_type}</span>
                  </div>
                  {selectedEnquiry.preferred_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date:</span>
                      <span className="text-white">{formatDate(selectedEnquiry.preferred_date)}</span>
                    </div>
                  )}
                  {selectedEnquiry.guest_count && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Guests:</span>
                      <span className="text-white">{selectedEnquiry.guest_count}</span>
                    </div>
                  )}
                  {selectedEnquiry.budget_range && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Budget:</span>
                      <span className="text-white">{selectedEnquiry.budget_range}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConvertDialogOpen(false)} className="border-white/10 text-gray-300">
                Cancel
              </Button>
              <Button
                onClick={() => selectedEnquiry && convertToEvent.mutate(selectedEnquiry.id)}
                disabled={convertToEvent.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {convertToEvent.isPending ? "Converting..." : "Convert to Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlannerLayout>
  );
}