import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, UserPlus, Upload, Users, Check, X, Clock, HelpCircle,
  Search, Trash2, Edit2, QrCode, CheckCircle, Download, LayoutGrid, Map, Send,
  BarChart3, MessageCircle, Phone, Mail, Globe, Share2, Eye, Copy, Loader2, MapPin,
  Gift, Plane, UtensilsCrossed, Activity, UserCheck, Printer, Plus, Zap, Sparkles
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Guest = {
  id: string;
  eventId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  group: string | null;
  tableAssignment: string | null;
  seatNumber: number | null;
  rsvpStatus: string;
  rsvpDate: string | null;
  rsvpToken: string | null;
  plusOnes: number | null;
  plusOneNames: string | null;
  dietaryRequirements: string | null;
  mealChoice: string | null;
  specialNeeds: string | null;
  notes: string | null;
  invitationSent: boolean;
  checkedIn: boolean;
  checkedInAt: string | null;
};

type GuestStats = {
  total: number;
  totalWithPlusOnes: number;
  accepted: number;
  declined: number;
  pending: number;
  tentative: number;
  checkedIn: number;
  invitationsSent: number;
  groupBreakdown: Record<string, number>;
  dietaryBreakdown: Record<string, number>;
  mealBreakdown: Record<string, number>;
};

type QRCodeEntry = {
  guestId: string;
  guestName: string;
  table: string | null;
  group: string | null;
  rsvpStatus: string;
  qrCode: string;
  rsvpUrl: string;
};

const groupOptions = ["Family", "Friends", "Colleagues", "VIP", "Bride's Side", "Groom's Side", "Corporate", "General"];
const dietaryOptions = ["None", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-Free", "Nut-Free", "Dairy-Free", "Other"];
const tablePresets = ["Table 1", "Table 2", "Table 3", "Table 4", "Table 5", "Table 6", "Table 7", "Table 8", "Table 9", "Table 10", "VIP Table", "High Table", "Head Table"];

export default function GuestManagement() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [tab, setTab] = useState<"list" | "add" | "import" | "stats" | "qrcodes" | "seating" | "dashboard" | "responses" | "plus-ones" | "travel" | "gifts" | "comms" | "catering" | "checkin-analytics">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [selectedQR, setSelectedQR] = useState<QRCodeEntry | null>(null);
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [bulkTable, setBulkTable] = useState("");
  const [autoAssignPerTable, setAutoAssignPerTable] = useState("10");
  const [showAutoAssign, setShowAutoAssign] = useState(false);

  const [newGuest, setNewGuest] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    group: "General", tableAssignment: "", plusOnes: 0,
    dietaryRequirements: "None", specialNeeds: "", notes: ""
  });
  const [contactSearch, setContactSearch] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const contactSearchRef = useRef<HTMLDivElement>(null);

  const [showPlusOneForm, setShowPlusOneForm] = useState(false);
  const [newPlusOne, setNewPlusOne] = useState({ parentGuestId: "", name: "", dietary_requirements: "None", meal_choice: "", special_needs: "" });
  const [editingTravelGuest, setEditingTravelGuest] = useState<string | null>(null);
  const [travelEdits, setTravelEdits] = useState<Record<string, any>>({});
  const [giftInput, setGiftInput] = useState<Record<string, string>>({});
  const [commsChannelFilter, setCommsChannelFilter] = useState("all");

  const [csvText, setCsvText] = useState("");
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [waRecipient, setWaRecipient] = useState<Guest | null>(null);
  const [waMessage, setWaMessage] = useState("");
  const [waBulkOpen, setWaBulkOpen] = useState(false);
  const [waBulkMessage, setWaBulkMessage] = useState("");
  const [waBulkType, setWaBulkType] = useState("general");
  const [digitalInviteOpen, setDigitalInviteOpen] = useState(false);
  const [inviteSubject, setInviteSubject] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvites, setSendingInvites] = useState(false);

  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [segmentType, setSegmentType] = useState<"status" | "table" | "group">("status");
  const [segmentValue, setSegmentValue] = useState("");
  const [segmentChannel, setSegmentChannel] = useState<"email" | "whatsapp" | "sms">("email");
  const [segmentMessage, setSegmentMessage] = useState("");

  const [invPrimaryColor, setInvPrimaryColor] = useState("#330311");
  const [invAccentColor, setInvAccentColor] = useState("#ffffff");
  const [invFontStyle, setInvFontStyle] = useState("serif");
  const [invPattern, setInvPattern] = useState("none");
  const [showCustomizeDesign, setShowCustomizeDesign] = useState(false);

  const { data: guestList = [], isLoading } = useQuery<Guest[]>({
    queryKey: ["/api/events", eventId, "guests"],
  });

  const { data: stats } = useQuery<GuestStats>({
    queryKey: ["/api/events", eventId, "guests", "stats"],
  });

  const { data: event } = useQuery({
    queryKey: ["/api/events", eventId],
  });

  const { data: employeeList = [] } = useQuery<any[]>({
    queryKey: ["/api/employees"],
  });

  // Merged contact list: employees + existing guests from other events for auto-fill
  const contactSuggestions = [
    ...employeeList.map((e: any) => ({
      id: `emp-${e.id}`,
      firstName: e.first_name || "",
      lastName: e.last_name || "",
      email: e.email || "",
      phone: e.phone || "",
      source: "Employee",
      role: e.job_title || e.role || "",
    })),
    ...(guestList as Guest[]).map((g: Guest) => ({
      id: `guest-${g.id}`,
      firstName: g.firstName,
      lastName: g.lastName,
      email: g.email || "",
      phone: g.phone || "",
      source: "Previous Guest",
      role: g.group || "",
    })),
  ];

  const filteredContacts = contactSearch.trim().length > 0
    ? contactSuggestions.filter(c => {
        const q = contactSearch.toLowerCase();
        return `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
          || c.email.toLowerCase().includes(q)
          || c.phone.includes(q);
      }).slice(0, 8)
    : [];

  const autoFillFromContact = (contact: typeof contactSuggestions[0]) => {
    setNewGuest(prev => ({
      ...prev,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
    }));
    setContactSearch(`${contact.firstName} ${contact.lastName}`);
    setShowContactDropdown(false);
  };

  const { data: qrCodes = [], isLoading: qrLoading } = useQuery<QRCodeEntry[]>({
    queryKey: ["/api/events", eventId, "guests", "qrcodes"],
    enabled: tab === "qrcodes",
  });

  const { data: seatingPlan, isLoading: seatingLoading } = useQuery<{
    tables: Record<string, any[]>;
    unassigned: any[];
    floorPlans: any[];
    totalGuests: number;
  }>({
    queryKey: ["/api/events", eventId, "seating-plan"],
    enabled: tab === "seating",
  });

  const { data: plusOnesData = [], isLoading: plusOnesLoading } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "plus-ones"],
    enabled: tab === "plus-ones",
  });

  const { data: travelData, isLoading: travelLoading } = useQuery<any>({
    queryKey: ["/api/events", eventId, "guests", "travel-summary"],
    enabled: tab === "travel",
  });

  const { data: giftsData, isLoading: giftsLoading } = useQuery<any>({
    queryKey: ["/api/events", eventId, "guests", "gifts"],
    enabled: tab === "gifts",
  });

  const { data: commsData = [], isLoading: commsLoading } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "guests", "communications"],
    enabled: tab === "comms",
  });

  const { data: cateringData, isLoading: cateringLoading } = useQuery<any>({
    queryKey: ["/api/events", eventId, "guests", "catering-report"],
    enabled: tab === "catering",
  });

  const { data: checkinData, isLoading: checkinLoading } = useQuery<any>({
    queryKey: ["/api/events", eventId, "guests", "checkin-analytics"],
    enabled: tab === "checkin-analytics",
    refetchInterval: 30000,
  });

  const addPlusOneMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/guests/${data.parentGuestId}/plus-ones`, {
      name: data.name,
      dietary_requirements: data.dietary_requirements,
      meal_choice: data.meal_choice,
      special_needs: data.special_needs,
      event_id: eventId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "plus-ones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests", "stats"] });
      toast({ title: "Plus-One Added" });
      setNewPlusOne({ parentGuestId: "", name: "", dietary_requirements: "None", meal_choice: "", special_needs: "" });
      setShowPlusOneForm(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deletePlusOneMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/plus-ones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "plus-ones"] });
      toast({ title: "Plus-One Removed" });
    },
  });

  const updateTravelMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/guests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests", "travel-summary"] });
      toast({ title: "Travel Info Updated" });
      setEditingTravelGuest(null);
      setTravelEdits({});
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateGiftMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/guests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests", "gifts"] });
      toast({ title: "Gift Updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addGuestMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/events/${eventId}/guests`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests", "stats"] });
      toast({ title: "Guest Added" });
      setNewGuest({ firstName: "", lastName: "", email: "", phone: "", group: "General", tableAssignment: "", plusOnes: 0, dietaryRequirements: "None", specialNeeds: "", notes: "" });
      setTab("list");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const bulkAddMutation = useMutation({
    mutationFn: (guests: any[]) => apiRequest("POST", `/api/events/${eventId}/guests/bulk`, { guests }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests", "stats"] });
      toast({ title: `${Array.isArray(data) ? data.length : 0} Guests Imported` });
      setCsvText("");
      setTab("list");
    },
    onError: (err: any) => toast({ title: "Import Error", description: err.message, variant: "destructive" }),
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: (data: { phone: string; message: string; type?: string }) =>
      apiRequest("POST", "/api/sms/send", {
        recipientPhone: data.phone,
        message: data.message,
        type: data.type || "general",
        eventId: Number(eventId),
      }),
    onSuccess: () => {
      toast({ title: "WhatsApp message sent" });
      setWhatsappOpen(false);
      setWaRecipient(null);
      setWaMessage("");
    },
    onError: (err: any) => toast({ title: "Failed to send", description: err.message, variant: "destructive" }),
  });

  const bulkWhatsAppMutation = useMutation({
    mutationFn: (data: { message: string; type: string }) =>
      apiRequest("POST", "/api/sms/bulk", {
        eventId: Number(eventId),
        message: data.message,
        type: data.type,
      }),
    onSuccess: (data: any) => {
      toast({ title: `Sent to ${data?.sent || 0} guests` });
      setWaBulkOpen(false);
      setWaBulkMessage("");
    },
    onError: (err: any) => toast({ title: "Bulk send failed", description: err.message, variant: "destructive" }),
  });

  const segmentMatchCount = (guestList as Guest[]).filter((g: Guest) => {
    if (segmentType === "status") return g.rsvpStatus === segmentValue;
    if (segmentType === "table") return g.tableAssignment === segmentValue;
    if (segmentType === "group") return g.group === segmentValue;
    return false;
  }).length;

  const sendSegmentMutation = useMutation({
    mutationFn: (data: { segment_type: string; segment_value: string; channel: string; message_template: string }) =>
      apiRequest("POST", `/api/events/${eventId}/guests/send-segment-message`, data),
    onSuccess: (data: any) => {
      toast({ title: "Segment Message Sent", description: `Message sent to ${data?.sent || segmentMatchCount} guests` });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests", "communications"] });
      setSegmentDialogOpen(false);
      setSegmentMessage("");
      setSegmentValue("");
    },
    onError: (err: any) => toast({ title: "Failed to send", description: err.message, variant: "destructive" }),
  });

  const openSendInvitations = () => {
    setLocation(`/event/${eventId}/invitations/send`);
  };

  const guestsWithPhone = (guestList as Guest[]).filter(g => g.phone && g.phone.trim());

  const updateGuestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/guests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests", "stats"] });
      toast({ title: "Guest Updated" });
      setEditingGuest(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteGuestMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/guests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests", "stats"] });
      toast({ title: "Guest Removed" });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/guests/${id}/checkin`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests", "stats"] });
    },
  });

  const bulkAssignTableMutation = useMutation({
    mutationFn: (data: { assignments: { guestId: string; tableAssignment: string }[] }) =>
      apiRequest("POST", `/api/events/${eventId}/guests/bulk-assign-tables`, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "seating-plan"] });
      toast({ title: "Tables Assigned", description: `${data.updated || 0} guests assigned to tables` });
      setSelectedGuests(new Set());
      setBulkTable("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const autoAssignTableMutation = useMutation({
    mutationFn: (data: { perTable: number; onlyUnassigned: boolean }) =>
      apiRequest("POST", `/api/events/${eventId}/guests/auto-assign-tables`, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "seating-plan"] });
      toast({ title: "Auto-Assigned!", description: `${data.assigned || 0} guests spread across ${data.tables || 0} tables (${data.perTable || 10} per table)` });
      setShowAutoAssign(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuests(prev => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);
      return next;
    });
  };

  const selectAllGuests = () => {
    if (selectedGuests.size === filteredGuests.length) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(filteredGuests.map((g: Guest) => g.id)));
    }
  };

  const handleBulkAssign = () => {
    if (!bulkTable.trim() || selectedGuests.size === 0) return;
    const assignments = Array.from(selectedGuests).map(guestId => ({
      guestId,
      tableAssignment: bulkTable.trim(),
    }));
    bulkAssignTableMutation.mutate({ assignments });
  };

  const generateFloorPlanMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/events/${eventId}/guests/generate-floorplan`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "seating-plan"] });
      toast({ title: "Floor Plan Generated", description: "Seating layout created from table assignments" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filteredGuests = guestList.filter((g: Guest) => {
    const matchesSearch = `${g.firstName} ${g.lastName} ${g.email || ""}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || g.rsvpStatus === filterStatus;
    const matchesGroup = filterGroup === "all" || g.group === filterGroup;
    return matchesSearch && matchesStatus && matchesGroup;
  });

  const handleImportCSV = () => {
    const lines = csvText.trim().split("\n");
    if (!csvText.trim()) {
      toast({ title: "Empty CSV", description: "Please paste CSV data (needs header row + at least 1 guest)", variant: "destructive" });
      return;
    }
    if (lines.length < 2) {
      toast({ title: "Invalid CSV format", description: "File must have header row (line 1) + at least 1 guest (line 2+)", variant: "destructive" });
      return;
    }
    const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
    if (headers.length === 0) {
      toast({ title: "Invalid header row", description: "First line must contain column names separated by commas", variant: "destructive" });
      return;
    }
    const firstNameIdx = headers.findIndex(h => h.includes("first") || h === "firstname");
    const lastNameIdx = headers.findIndex(h => h.includes("last") || h === "lastname" || h === "surname");
    const emailIdx = headers.findIndex(h => h.includes("email"));
    const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile"));
    const groupIdx = headers.findIndex(h => h.includes("group") || h.includes("category"));
    const dietaryIdx = headers.findIndex(h => h.includes("diet"));
    const tableIdx = headers.findIndex(h => h.includes("table"));
    const nameIdx = headers.findIndex(h => h === "name" || h === "full name" || h === "fullname");

    if (firstNameIdx < 0 && lastNameIdx < 0 && nameIdx < 0) {
      const detectedCols = headers.join(", ");
      toast({ title: "Missing name column", description: `CSV must have 'First Name', 'Last Name', or 'Name' column. Found columns: ${detectedCols}`, variant: "destructive" });
      return;
    }

    const errors: string[] = [];
    const guests = lines.slice(1).filter(l => l.trim()).map((line, lineNum) => {
      try {
        const cols = line.split(",").map(c => c.trim());
        if (cols.length === 0 || !cols.some(c => c)) {
          const err = `Row ${lineNum + 2}: Empty row`;
          errors.push(err);
          throw new Error(err);
        }
        let firstName = firstNameIdx >= 0 ? cols[firstNameIdx] : "";
        let lastName = lastNameIdx >= 0 ? cols[lastNameIdx] : "";
        if (!firstName && nameIdx >= 0) {
          const parts = (cols[nameIdx] || "").split(" ");
          firstName = parts[0] || "";
          lastName = parts.slice(1).join(" ") || "";
        }
        if (!firstName && !lastName) {
          const err = `Row ${lineNum + 2}: Missing first or last name`;
          errors.push(err);
          throw new Error(err);
        }
        return {
          firstName: firstName || "Guest",
          lastName: lastName || "",
          email: emailIdx >= 0 ? cols[emailIdx] : "",
          phone: phoneIdx >= 0 ? cols[phoneIdx] : "",
          group: groupIdx >= 0 ? cols[groupIdx] : "General",
          dietaryRequirements: dietaryIdx >= 0 ? cols[dietaryIdx] : "None",
          tableAssignment: tableIdx >= 0 ? cols[tableIdx] : "",
        };
      } catch (e: any) {
        return null;
      }
    }).filter(Boolean);

    if (guests.length === 0) {
      const errorMsg = errors.length > 0 ? `Issues found: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? ` +${errors.length - 3} more` : ""}` : "All rows must have at least a first or last name";
      toast({ title: "No valid guests found", description: errorMsg, variant: "destructive" });
      return;
    }
    
    if (errors.length > 0) {
      toast({ title: `Imported with errors`, description: `${guests.length} guests added. Skipped ${errors.length} invalid row(s): ${errors.slice(0, 2).join("; ")}${errors.length > 2 ? `...` : ""}`, variant: "default" });
    } else {
      toast({ title: "Importing...", description: `Adding ${guests.length} guest${guests.length !== 1 ? "s" : ""}` });
    }
    bulkAddMutation.mutate(guests);
  };

  const rsvpStatusIcon = (status: string) => {
    switch (status) {
      case "accepted": return <Check className="w-4 h-4 text-green-600" />;
      case "declined": return <X className="w-4 h-4 text-red-600" />;
      case "tentative": return <HelpCircle className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const rsvpStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-green-100 text-green-800";
      case "declined": return "bg-red-100 text-red-800";
      case "tentative": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const exportGuestsCSV = () => {
    const guestsToExport = filteredGuests.length > 0 ? filteredGuests : (guestList || []);
    if (guestsToExport.length === 0) {
      toast({ title: "No guests to export", variant: "destructive" });
      return;
    }
    const headers = ["First Name", "Last Name", "Email", "Phone", "Group", "RSVP Status", "Plus Ones", "Plus One Names", "Dietary Requirements", "Special Needs", "Table Assignment", "Seat Number", "Invitation Sent", "Checked In", "Notes"];
    const rows = guestsToExport.map((g: Guest) => [
      g.firstName, g.lastName, g.email || "", g.phone || "", g.group || "",
      g.rsvpStatus || "pending", g.plusOnes || 0, g.plusOneNames || "",
      g.dietaryRequirements || "", g.specialNeeds || "",
      g.tableAssignment || "", g.seatNumber || "", g.invitationSent ? "Yes" : "No",
      g.checkedIn ? "Yes" : "No", g.notes || ""
    ]);
    const csvContent = [headers, ...rows].map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `guests_export_${eventId}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported Successfully", description: `${guestsToExport.length} guests exported to CSV` });
  };

  const generateInvitationCard = (qr: QRCodeEntry, customColors?: { primary: string; accent: string; fontStyle: string; pattern: string }): Promise<string> => {
    const primary = customColors?.primary || invPrimaryColor;
    const accent = customColors?.accent || invAccentColor;
    const fontFamily = customColors?.fontStyle === "sans-serif" ? "Arial, Helvetica, sans-serif" : customColors?.fontStyle === "cursive" ? "cursive" : customColors?.fontStyle === "serif" ? "Georgia, serif" : invFontStyle === "sans-serif" ? "Arial, Helvetica, sans-serif" : invFontStyle === "cursive" ? "cursive" : "Georgia, serif";
    const bgPattern = customColors?.pattern || invPattern;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const width = 500;
      const height = 700;
      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      if (bgPattern === "dots") {
        ctx.fillStyle = accent + '15';
        for (let x = 0; x < width; x += 20) {
          for (let y = 0; y < height; y += 20) {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (bgPattern === "geometric") {
        ctx.strokeStyle = accent + '15';
        ctx.lineWidth = 1;
        for (let i = 0; i < width + height; i += 30) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(0, i);
          ctx.stroke();
        }
      } else if (bgPattern === "floral") {
        ctx.fillStyle = accent + '10';
        for (let x = 25; x < width; x += 50) {
          for (let y = 25; y < height; y += 50) {
            for (let p = 0; p < 5; p++) {
              ctx.beginPath();
              ctx.ellipse(x, y, 8, 3, (p * Math.PI) / 5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      ctx.fillStyle = primary;
      ctx.fillRect(0, 0, width, 8);
      ctx.fillRect(0, height - 8, width, 8);
      ctx.fillRect(0, 0, 8, height);
      ctx.fillRect(width - 8, 0, 8, height);

      ctx.fillStyle = primary;
      ctx.fillRect(20, 20, width - 40, 90);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 14px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.fillText('YOU ARE CORDIALLY INVITED', width / 2, 52);
      const eventName = (event as any)?.name || (event as any)?.eventName || 'Event';
      ctx.font = `bold 20px ${fontFamily}`;
      const displayName = eventName.length > 28 ? eventName.substring(0, 28) + '...' : eventName;
      ctx.fillText(displayName, width / 2, 82);

      ctx.fillStyle = accent;
      ctx.fillRect(150, 130, 200, 2);

      ctx.fillStyle = primary;
      ctx.font = `bold 28px ${fontFamily}`;
      ctx.fillText(qr.guestName, width / 2, 175);

      if (qr.table || qr.group) {
        ctx.font = `14px ${fontFamily}`;
        ctx.fillStyle = '#666666';
        let infoY = 200;
        if (qr.table) { ctx.fillText(qr.table, width / 2, infoY); infoY += 20; }
        if (qr.group) { ctx.fillText(qr.group, width / 2, infoY); }
      }

      const qrImg = new Image();
      qrImg.onload = () => {
        const qrSize = 240;
        const qrX = (width - qrSize) / 2;
        const qrY = 230;

        ctx.strokeStyle = primary;
        ctx.lineWidth = 3;
        ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        ctx.fillStyle = '#666666';
        ctx.font = `12px ${fontFamily}`;
        ctx.fillText('Scan to RSVP', width / 2, qrY + qrSize + 25);

        ctx.fillStyle = accent;
        ctx.fillRect(100, 520, 300, 2);

        ctx.fillStyle = primary;
        ctx.font = `12px ${fontFamily}`;
        ctx.fillText('Powered by Event Perfekt', width / 2, 550);

        const statusColors: Record<string, string> = {
          pending: '#f59e0b', accepted: '#22c55e', declined: '#ef4444', tentative: '#3b82f6'
        };
        const statusColor = statusColors[qr.rsvpStatus] || '#9ca3af';
        ctx.fillStyle = statusColor;
        ctx.beginPath();
        ctx.arc(width / 2 - 40, 580, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333333';
        ctx.font = `13px ${fontFamily}`;
        ctx.fillText(`RSVP: ${qr.rsvpStatus.charAt(0).toUpperCase() + qr.rsvpStatus.slice(1)}`, width / 2, 585);

        resolve(canvas.toDataURL('image/png'));
      };
      qrImg.src = qr.qrCode;
    });
  };

  const downloadQRCode = async (qr: QRCodeEntry) => {
    const cardDataUrl = await generateInvitationCard(qr);
    const link = document.createElement('a');
    link.download = `Invitation_${qr.guestName.replace(/\s+/g, '_')}.png`;
    link.href = cardDataUrl;
    link.click();
  };

  const printAllQRCodes = async () => {
    toast({ title: "Generating invitation cards...", description: `Creating ${qrCodes.length} personalized cards` });
    const cards = await Promise.all(qrCodes.map(qr => generateInvitationCard(qr)));
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const eventName = (event as any)?.name || (event as any)?.eventName || 'Event';
    const html = `<!DOCTYPE html><html><head><title>Invitation Cards - ${eventName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        h2 { text-align: center; color: #330311; margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; max-width: 1100px; margin: 0 auto; }
        .card { text-align: center; page-break-inside: avoid; background: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .card img { width: 100%; max-width: 400px; height: auto; border-radius: 4px; }
        @media print {
          body { background: white; padding: 10px; }
          .grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
          .card { box-shadow: none; border: 1px solid #eee; padding: 8px; }
        }
      </style></head><body>
      <h2>Guest Invitation Cards — ${eventName}</h2>
      <div class="grid">${cards.map((cardUrl, i) => `
        <div class="card">
          <img src="${cardUrl}" alt="Invitation for ${qrCodes[i].guestName}" />
        </div>`).join('')}
      </div></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const selectStyle = "w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black text-sm";
  const inputStyle = "bg-white border-gray-300 text-black";
  const labelStyle = "block text-sm font-medium text-white mb-1";

  return (
    <div className="min-h-screen bg-[#330311]">
      <header className="bg-[#2a020d] border-b border-[#4a0a1e] px-3 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation(`/event/${eventId}`)} className="text-white">
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Back to Event</span>
            </Button>
            <h1 className="text-base sm:text-xl font-bold text-white truncate">
              Guest Management {event && typeof event === 'object' && 'name' in event ? `— ${(event as any).name}` : ""}
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap overflow-x-auto">
            <Button size="sm" className="text-xs sm:text-sm whitespace-nowrap bg-[#8B1538] text-white" onClick={openSendInvitations}>
              <Send className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Send Invitations</span><span className="sm:hidden">Send</span>
            </Button>
            <Button size="sm" className={`text-xs sm:text-sm whitespace-nowrap ${tab === "dashboard" ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white"}`} onClick={() => setTab("dashboard")}>
              <BarChart3 className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Dashboard</span><span className="sm:hidden">Dash</span>
            </Button>
            <Button size="sm" className={`text-xs sm:text-sm whitespace-nowrap ${tab === "responses" ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white"}`} onClick={() => setTab("responses")}>
              <MessageCircle className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Responses</span><span className="sm:hidden">Resp</span>
            </Button>
            <Button size="sm" className={`text-xs sm:text-sm whitespace-nowrap ${tab === "add" ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white"}`} onClick={() => setTab("add")}>
              <UserPlus className="w-4 h-4 mr-1" /> Add
            </Button>
            <Button size="sm" className={`text-xs sm:text-sm whitespace-nowrap ${tab === "import" ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white"}`} onClick={() => setTab("import")}>
              <Upload className="w-4 h-4 mr-1" /> Import
            </Button>
            <Button size="sm" className={`text-xs sm:text-sm whitespace-nowrap ${tab === "qrcodes" ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white"}`} onClick={() => setTab("qrcodes")}>
              <QrCode className="w-4 h-4 mr-1" /> QR
            </Button>
            <Button size="sm" className={`text-xs sm:text-sm whitespace-nowrap ${tab === "seating" ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white"}`} onClick={() => setTab("seating")}>
              <Map className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Seating</span><span className="sm:hidden">Seat</span>
            </Button>
            <Button size="sm" className={`text-xs sm:text-sm whitespace-nowrap ${tab === "plus-ones" ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white"}`} onClick={() => setTab("plus-ones")}>
              <UserPlus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Plus-Ones</span><span className="sm:hidden">+1s</span>
            </Button>
            <Button size="sm" className={`text-xs sm:text-sm whitespace-nowrap ${tab === "travel" ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white"}`} onClick={() => setTab("travel")}>
              <Plane className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Travel</span><span className="sm:hidden">Trvl</span>
            </Button>
            <Button size="sm" className={`text-xs sm:text-sm whitespace-nowrap ${tab === "gifts" ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white"}`} onClick={() => setTab("gifts")}>
              <Gift className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Gifts</span><span className="sm:hidden">Gift</span>
            </Button>
            <Button size="sm" className={`text-xs sm:text-sm whitespace-nowrap ${tab === "comms" ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white"}`} onClick={() => setTab("comms")}>
              <Mail className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Comms</span><span className="sm:hidden">Comm</span>
            </Button>
            <Button size="sm" className={`text-xs sm:text-sm whitespace-nowrap ${tab === "catering" ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white"}`} onClick={() => setTab("catering")}>
              <UtensilsCrossed className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Catering</span><span className="sm:hidden">Cater</span>
            </Button>
            <Button size="sm" className={`text-xs sm:text-sm whitespace-nowrap ${tab === "checkin-analytics" ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white"}`} onClick={() => setTab("checkin-analytics")}>
              <Activity className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Check-In Analytics</span><span className="sm:hidden">Check</span>
            </Button>
            <Button size="sm" className="text-xs sm:text-sm whitespace-nowrap bg-[#4a0a1e] text-white" onClick={() => setLocation(`/events/${eventId}/invitations`)}>
              <Send className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Invitations</span><span className="sm:hidden">Invite</span>
            </Button>
            <Button size="sm" className="text-xs sm:text-sm whitespace-nowrap bg-[#4a0a1e] text-white" onClick={() => setLocation(`/events/${eventId}/app-builder`)}>
              <Globe className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Event App</span><span className="sm:hidden">App</span>
            </Button>
            <Button
              size="sm"
              className="text-xs sm:text-sm whitespace-nowrap bg-[#8B1538] text-white hover:bg-[#6d1029]"
              onClick={() => {
                const seatUrl = `https://eventperfekt.net/find-seat/${eventId}`;
                const printWindow = window.open("", "_blank");
                if (!printWindow) return;
                printWindow.document.write(`<!DOCTYPE html><html><head><title>Find Your Seat - QR Poster</title>
                  <style>
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                    body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: white; font-family: 'Poppins', sans-serif; }
                    .poster { width: 600px; text-align: center; padding: 60px 40px; }
                    .logo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 20px; }
                    h1 { font-family: 'Poppins', sans-serif;, cursive; font-size: 52px; color: #330311; margin: 0 0 8px; }
                    .subtitle { font-size: 14px; color: #8B1538; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 30px; }
                    .qr-container { display: inline-block; padding: 20px; border: 3px solid #330311; border-radius: 16px; margin-bottom: 25px; }
                    .qr-container img { width: 280px; height: 280px; }
                    .instructions { font-size: 16px; color: #666; line-height: 1.8; max-width: 400px; margin: 0 auto 20px; }
                    .instructions strong { color: #330311; }
                    .step { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #8B1538; color: white; font-size: 13px; font-weight: 600; margin-right: 8px; }
                    .brand { font-size: 11px; color: #999; margin-top: 30px; }
                    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                  </style></head><body>
                  <div class="poster">
                    <h1>Please Find Your Seat</h1>
                    <div class="subtitle">Scan to view your table</div>
                    <div class="qr-container">
                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(seatUrl)}" alt="QR Code" />
                    </div>
                    <div class="instructions">
                      <div style="margin-bottom:12px;"><span class="step">1</span> <strong>Scan</strong> the QR code with your phone camera</div>
                      <div style="margin-bottom:12px;"><span class="step">2</span> <strong>Type</strong> your name in the search box</div>
                      <div><span class="step">3</span> <strong>Find</strong> your table number instantly</div>
                    </div>
                    <div class="brand">Powered by Event Perfekt — ...making yours perfekt</div>
                  </div>
                </body></html>`);
                printWindow.document.close();
                printWindow.onload = () => printWindow.print();
              }}
            >
              <MapPin className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Find Your Seat QR</span><span className="sm:hidden">Seat QR</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-6">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <Card className="bg-[#2a020d] border-[#4a0a1e]">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-gray-400">Total Guests</p>
              </CardContent>
            </Card>
            <Card className="bg-[#2a020d] border-[#4a0a1e]">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-white">{stats.totalWithPlusOnes}</p>
                <p className="text-xs text-gray-400">With Plus-Ones</p>
              </CardContent>
            </Card>
            <Card className="bg-green-900/30 border-green-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{stats.accepted}</p>
                <p className="text-xs text-green-300">Accepted</p>
              </CardContent>
            </Card>
            <Card className="bg-red-900/30 border-red-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{stats.declined}</p>
                <p className="text-xs text-red-300">Declined</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-900/30 border-yellow-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                <p className="text-xs text-yellow-300">Pending</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-900/30 border-blue-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">{stats.checkedIn}</p>
                <p className="text-xs text-blue-300">Checked In</p>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">RSVP Overview</h3>
                    <BarChart3 className="w-5 h-5 text-gray-400" />
                  </div>
                  {stats && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-green-400">Accepted</span>
                          <span className="text-white">{stats.accepted} ({stats.total ? Math.round(stats.accepted / stats.total * 100) : 0}%)</span>
                        </div>
                        <div className="w-full bg-[#1a0108] rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.total ? (stats.accepted / stats.total * 100) : 0}%` }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-red-400">Declined</span>
                          <span className="text-white">{stats.declined} ({stats.total ? Math.round(stats.declined / stats.total * 100) : 0}%)</span>
                        </div>
                        <div className="w-full bg-[#1a0108] rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: `${stats.total ? (stats.declined / stats.total * 100) : 0}%` }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-yellow-400">Pending</span>
                          <span className="text-white">{stats.pending} ({stats.total ? Math.round(stats.pending / stats.total * 100) : 0}%)</span>
                        </div>
                        <div className="w-full bg-[#1a0108] rounded-full h-2"><div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${stats.total ? (stats.pending / stats.total * 100) : 0}%` }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-blue-400">Tentative</span>
                          <span className="text-white">{stats.tentative} ({stats.total ? Math.round(stats.tentative / stats.total * 100) : 0}%)</span>
                        </div>
                        <div className="w-full bg-[#1a0108] rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stats.total ? (stats.tentative / stats.total * 100) : 0}%` }} /></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Guest Summary</h3>
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                  {stats && (
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-[#4a0a1e]">
                        <span className="text-gray-400 text-sm">Total Guests</span>
                        <span className="text-white font-bold text-lg">{stats.total}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-[#4a0a1e]">
                        <span className="text-gray-400 text-sm">With Plus-Ones</span>
                        <span className="text-white font-bold text-lg">{stats.totalWithPlusOnes}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-[#4a0a1e]">
                        <span className="text-gray-400 text-sm">Checked In</span>
                        <span className="text-white font-bold text-lg">{stats.checkedIn}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-400 text-sm">Invitations Sent</span>
                        <span className="text-white font-bold text-lg">{stats.invitationsSent}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Quick Share</h3>
                    <Globe className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-gray-400 text-xs mb-3">Send event app & invitations to guests worldwide</p>
                  <div className="space-y-2">
                    <Button className="w-full bg-gradient-to-r from-[#8B1538] to-[#330311] text-white font-semibold border border-amber-600/30 shadow-lg" onClick={() => setDigitalInviteOpen(true)}>
                      <Send className="w-4 h-4 mr-2" /> Send Digital Invitations
                    </Button>
                    <Button className="w-full bg-white text-[#330311] font-semibold" onClick={() => window.open(`/event-app/${eventId}`, '_blank')}>
                      <Globe className="w-4 h-4 mr-2" /> Open Event App
                    </Button>
                    <Button className="w-full bg-green-600 text-white" onClick={() => {
                      const appUrl = `https://eventperfekt.net/event-app/${eventId}`;
                      const msg = `You're invited! View all event details here: ${appUrl}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                    }}>
                      <MessageCircle className="w-4 h-4 mr-2" /> Share via WhatsApp
                    </Button>
                    <Button className="w-full bg-blue-600 text-white" onClick={() => {
                      const msg = `You're invited! View event details: https://eventperfekt.net/event-app/${eventId}`;
                      window.open(`sms:?body=${encodeURIComponent(msg)}`, '_blank');
                    }}>
                      <Phone className="w-4 h-4 mr-2" /> Send Text (SMS)
                    </Button>
                    <Button className="w-full bg-purple-600 text-white" onClick={() => {
                      const subject = encodeURIComponent("You're Invited!");
                      const body = encodeURIComponent(`You're invited! View all event details here:\nhttps://eventperfekt.net/event-app/${eventId}`);
                      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                    }}>
                      <Mail className="w-4 h-4 mr-2" /> Send via Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-6">
                    <h3 className="text-white font-semibold mb-4">By Group</h3>
                    <div className="space-y-2">
                      {Object.entries(stats.groupBreakdown || {}).map(([group, count]) => (
                        <div key={group} className="flex justify-between items-center py-2 border-b border-[#4a0a1e] last:border-0">
                          <span className="text-gray-300 text-sm">{group}</span>
                          <span className="text-white font-medium">{count as number}</span>
                        </div>
                      ))}
                      {Object.keys(stats.groupBreakdown || {}).length === 0 && (
                        <p className="text-gray-500 text-sm">No groups assigned</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-6">
                    <h3 className="text-white font-semibold mb-4">Dietary & Meals</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Dietary</p>
                        {Object.entries(stats.dietaryBreakdown || {}).map(([diet, count]) => (
                          <div key={diet} className="flex justify-between py-1">
                            <span className="text-gray-300 text-xs">{diet}</span>
                            <span className="text-white text-xs font-medium">{count as number}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Meals</p>
                        {Object.entries(stats.mealBreakdown || {}).map(([meal, count]) => (
                          <div key={meal} className="flex justify-between py-1">
                            <span className="text-gray-300 text-xs">{meal}</span>
                            <span className="text-white text-xs font-medium">{count as number}</span>
                          </div>
                        ))}
                        {Object.keys(stats.mealBreakdown || {}).length === 0 && (
                          <p className="text-gray-500 text-xs">No meals chosen yet</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {tab === "responses" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">All Guest Responses</h2>
              <p className="text-gray-400 text-sm">{guestList.length} total guests</p>
            </div>

            {[
              { key: "accepted", label: "Accepted", color: "green", icon: <Check className="w-5 h-5" /> },
              { key: "declined", label: "Declined", color: "red", icon: <X className="w-5 h-5" /> },
              { key: "tentative", label: "Maybe / Tentative", color: "yellow", icon: <HelpCircle className="w-5 h-5" /> },
              { key: "pending", label: "Awaiting Response", color: "gray", icon: <Clock className="w-5 h-5" /> },
            ].map(section => {
              const guests = guestList.filter((g: Guest) => g.rsvpStatus === section.key);
              if (guests.length === 0) return null;
              return (
                <Card key={section.key} className={`bg-[#2a020d] border-${section.color}-800/50`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className={`text-${section.color}-400 text-base flex items-center gap-2`}>
                        {section.icon}
                        {section.label} ({guests.length})
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {guests.map((guest: Guest) => (
                        <div key={guest.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1a0108] border border-[#4a0a1e]">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <p className="text-white font-medium text-sm">{guest.firstName} {guest.lastName}</p>
                              {guest.group && guest.group !== "General" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#4a0a1e] text-gray-300">{guest.group}</span>
                              )}
                              {guest.tableAssignment && (
                                <span className="text-[10px] text-gray-500">{guest.tableAssignment}</span>
                              )}
                            </div>
                            <div className="flex gap-4 mt-1 flex-wrap">
                              {guest.email && <span className="text-xs text-gray-400">{guest.email}</span>}
                              {guest.phone && <span className="text-xs text-gray-400">{guest.phone}</span>}
                              {guest.rsvpDate && (
                                <span className="text-xs text-gray-500">
                                  Responded: {new Date(guest.rsvpDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-3 mt-1 flex-wrap">
                              {(guest.plusOnes || 0) > 0 && (
                                <span className="text-xs text-blue-400">+{guest.plusOnes} guest{(guest.plusOnes || 0) > 1 ? 's' : ''}</span>
                              )}
                              {guest.plusOneNames && (
                                <span className="text-xs text-gray-500">{guest.plusOneNames}</span>
                              )}
                              {guest.dietaryRequirements && guest.dietaryRequirements !== "None" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-900/40 text-orange-300">{guest.dietaryRequirements}</span>
                              )}
                              {guest.specialNeeds && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-900/40 text-purple-300">{guest.specialNeeds}</span>
                              )}
                              {guest.checkedIn && (
                                <span className="text-[10px] text-green-400 font-medium">Checked In</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            {guest.phone && (
                              <Button size="sm" variant="ghost" className="text-green-400" title="WhatsApp"
                                onClick={() => {
                                  const msg = `Hi ${guest.firstName}! Just following up on our invitation. We'd love to know if you can make it!`;
                                  const num = guest.phone!.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
                                  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}>
                                <MessageCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {guest.phone && (
                              <Button size="sm" variant="ghost" className="text-blue-400" title="Text/SMS"
                                onClick={() => {
                                  const msg = `Hi ${guest.firstName}! Reminder about our upcoming event. Please let us know if you can attend!`;
                                  window.open(`sms:${guest.phone}?body=${encodeURIComponent(msg)}`, '_blank');
                                }}>
                                <Phone className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {guest.email && (
                              <Button size="sm" variant="ghost" className="text-purple-400" title="Email"
                                onClick={() => {
                                  const subject = encodeURIComponent("Event Reminder");
                                  const body = encodeURIComponent(`Hi ${guest.firstName},\n\nJust a friendly reminder about our upcoming event. We'd love to know if you can make it!\n\nRSVP: https://eventperfekt.net/rsvp/${guest.rsvpToken}`);
                                  window.open(`mailto:${guest.email}?subject=${subject}&body=${body}`, '_blank');
                                }}>
                                <Mail className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white" onClick={() => setEditingGuest(guest)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {tab === "add" && (
          <Card className="bg-[#2a020d] border-[#4a0a1e] mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> Add New Guest
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* ── Auto-Fill Contact Search ────────────────────────────────── */}
              <div className="mb-6 p-4 bg-[#1a0108] border border-[#4a0a1e] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <label className="text-yellow-400 text-sm font-bold uppercase tracking-wide">Quick Auto-Fill</label>
                  <span className="text-gray-400 text-xs">Search employees or existing contacts to auto-fill all fields</span>
                </div>
                <div ref={contactSearchRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={contactSearch}
                      onChange={e => { setContactSearch(e.target.value); setShowContactDropdown(true); }}
                      onFocus={() => setShowContactDropdown(true)}
                      placeholder="Type a name, email or phone to search and auto-fill..."
                      className="pl-9 bg-[#2a020d] border-[#4a0a1e] text-white placeholder:text-gray-500"
                      autoComplete="off"
                    />
                    {contactSearch && (
                      <button onClick={() => { setContactSearch(""); setShowContactDropdown(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {showContactDropdown && filteredContacts.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a0108] border border-[#4a0a1e] rounded-lg shadow-2xl overflow-hidden">
                      {filteredContacts.map(contact => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => autoFillFromContact(contact)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#330311] transition-colors text-left border-b border-[#4a0a1e] last:border-0"
                        >
                          <div className="w-9 h-9 rounded-full bg-[#330311] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {contact.firstName?.[0]}{contact.lastName?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm">{contact.firstName} {contact.lastName}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-400 truncate">
                              {contact.email && <span>{contact.email}</span>}
                              {contact.phone && <span>{contact.phone}</span>}
                            </div>
                          </div>
                          <Badge className={`text-xs flex-shrink-0 ${contact.source === "Employee" ? "bg-blue-900 text-blue-200" : "bg-green-900 text-green-200"}`}>
                            {contact.source}
                          </Badge>
                          <Zap className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                  {showContactDropdown && contactSearch.trim().length > 0 && filteredContacts.length === 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a0108] border border-[#4a0a1e] rounded-lg p-3 text-center text-gray-400 text-sm">
                      No contacts found — fill in manually below
                    </div>
                  )}
                </div>
                {(newGuest.firstName || newGuest.email) && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                    <CheckCircle className="h-3.5 w-3.5" /> Fields auto-filled — review and adjust below if needed
                  </div>
                )}
              </div>

              {/* ── Guest Details Form ─────────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className={labelStyle}>First Name *</label>
                  <Input
                    value={newGuest.firstName}
                    onChange={e => setNewGuest({ ...newGuest, firstName: e.target.value })}
                    className={inputStyle}
                    autoComplete="given-name"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className={labelStyle}>Last Name *</label>
                  <Input
                    value={newGuest.lastName}
                    onChange={e => setNewGuest({ ...newGuest, lastName: e.target.value })}
                    className={inputStyle}
                    autoComplete="family-name"
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <label className={labelStyle}>Email</label>
                  <Input
                    type="email"
                    value={newGuest.email}
                    onChange={e => setNewGuest({ ...newGuest, email: e.target.value })}
                    className={inputStyle}
                    autoComplete="email"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className={labelStyle}>Phone</label>
                  <Input
                    value={newGuest.phone}
                    onChange={e => setNewGuest({ ...newGuest, phone: e.target.value })}
                    className={inputStyle}
                    autoComplete="tel"
                    placeholder="+44 7700 000000"
                  />
                </div>
                <div>
                  <label className={labelStyle}>Group</label>
                  <select value={newGuest.group} onChange={e => setNewGuest({ ...newGuest, group: e.target.value })} className={selectStyle}>
                    {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Table Assignment</label>
                  <Input value={newGuest.tableAssignment} onChange={e => setNewGuest({ ...newGuest, tableAssignment: e.target.value })} placeholder="Table 1" className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Plus Ones</label>
                  <Input type="number" min="0" value={newGuest.plusOnes} onChange={e => setNewGuest({ ...newGuest, plusOnes: parseInt(e.target.value) || 0 })} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Dietary Requirements</label>
                  <select value={newGuest.dietaryRequirements} onChange={e => setNewGuest({ ...newGuest, dietaryRequirements: e.target.value })} className={selectStyle}>
                    {dietaryOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className={labelStyle}>Notes</label>
                <Input value={newGuest.notes} onChange={e => setNewGuest({ ...newGuest, notes: e.target.value })} placeholder="Any additional notes..." className={inputStyle} />
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={() => {
                    addGuestMutation.mutate(newGuest);
                    setContactSearch("");
                    setShowContactDropdown(false);
                  }}
                  disabled={!newGuest.firstName || addGuestMutation.isPending}
                  className="bg-white text-[#330311] font-bold"
                >
                  {addGuestMutation.isPending ? "Adding..." : "Add Guest"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewGuest({ firstName: "", lastName: "", email: "", phone: "", group: "General", tableAssignment: "", plusOnes: 0, dietaryRequirements: "None", specialNeeds: "", notes: "" });
                    setContactSearch("");
                    setShowContactDropdown(false);
                  }}
                  className="text-white border-white/70 hover:bg-white/10 hover:border-white"
                >
                  Clear Form
                </Button>
                <Button variant="outline" onClick={() => setTab("list")} className="text-white border-white/70 hover:bg-white/10 hover:border-white">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "import" && (
          <Card className="bg-[#2a020d] border-[#4a0a1e] mb-6">
            <CardHeader>
              <CardTitle className="text-white">Import Guests from CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm mb-3">
                Paste your guest list below in CSV format. The first row should be headers.
                Supported columns: First Name, Last Name, Email, Phone, Group, Dietary, Table.
                You can also use a single "Name" column which will be split automatically.
              </p>
              <div className="bg-[#1a0108] border border-[#4a0a1e] rounded p-3 mb-3">
                <p className="text-gray-400 text-xs font-mono">Example:</p>
                <p className="text-gray-300 text-xs font-mono">First Name,Last Name,Email,Phone,Group,Dietary,Table</p>
                <p className="text-gray-300 text-xs font-mono">John,Smith,john@email.com,07700123456,Family,None,Table 1</p>
                <p className="text-gray-300 text-xs font-mono">Jane,Doe,jane@email.com,,Friends,Vegetarian,Table 2</p>
              </div>
              <textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder="Paste your CSV data here..."
                rows={8}
                className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black text-sm font-mono"
              />
              <div className="mt-4 flex gap-3">
                <Button onClick={handleImportCSV} disabled={!csvText.trim() || bulkAddMutation.isPending} className="bg-white text-[#330311] font-bold">
                  {bulkAddMutation.isPending ? "Importing..." : "Import Guests"}
                </Button>
                <Button variant="outline" onClick={() => setTab("list")} className="text-white border-white/70 hover:bg-white/10 hover:border-white">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "qrcodes" && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Guest Invitation Cards with QR Code</h2>
                <p className="text-gray-400 text-xs sm:text-sm">Each guest gets a personalized invitation card with their name and unique RSVP QR code</p>
              </div>
              <div className="flex gap-2">
                {qrCodes.length > 0 && (
                  <Button onClick={printAllQRCodes} className="bg-white text-[#330311] font-bold text-xs sm:text-sm">
                    <Download className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Print All Invitation Cards</span><span className="sm:hidden">Print All</span>
                  </Button>
                )}
                <Button variant="outline" onClick={() => setTab("list")} className="text-white border-white/70 hover:bg-white/10 hover:border-white text-xs sm:text-sm">Back</Button>
              </div>
            </div>

            <Card className="bg-[#2a020d] border-[#4a0a1e] mb-4">
              <CardContent className="p-4">
                <button
                  onClick={() => setShowCustomizeDesign(!showCustomizeDesign)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="text-white font-semibold text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Customize Design
                  </span>
                  <span className="text-gray-400 text-xs">{showCustomizeDesign ? "▲ Collapse" : "▼ Expand"}</span>
                </button>
                {showCustomizeDesign && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Primary Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={invPrimaryColor} onChange={e => setInvPrimaryColor(e.target.value)} className="w-8 h-8 rounded border border-[#4a0a1e] cursor-pointer" />
                        <span className="text-white text-xs font-mono">{invPrimaryColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Accent Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={invAccentColor} onChange={e => setInvAccentColor(e.target.value)} className="w-8 h-8 rounded border border-[#4a0a1e] cursor-pointer" />
                        <span className="text-white text-xs font-mono">{invAccentColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Font Style</label>
                      <select value={invFontStyle} onChange={e => setInvFontStyle(e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-[#4a0a1e] bg-[#1a0209] text-white text-sm">
                        <option value="serif">Serif</option>
                        <option value="sans-serif">Sans-Serif</option>
                        <option value="cursive">Script (Cursive)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Background Pattern</label>
                      <select value={invPattern} onChange={e => setInvPattern(e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-[#4a0a1e] bg-[#1a0209] text-white text-sm">
                        <option value="none">None</option>
                        <option value="floral">Subtle Floral</option>
                        <option value="geometric">Geometric</option>
                        <option value="dots">Dots</option>
                      </select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {qrLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                <p className="text-gray-300">Generating QR codes...</p>
              </div>
            ) : qrCodes.length === 0 ? (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="py-12 text-center">
                  <QrCode className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-300 text-lg mb-2">No guests with QR codes yet</p>
                  <p className="text-gray-500 text-sm">Add guests first to generate their RSVP QR codes</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {qrCodes.map((qr) => (
                    <Card key={qr.guestId} className="bg-[#2a020d] border-[#4a0a1e] cursor-pointer" onClick={() => setSelectedQR(qr)}>
                      <CardContent className="p-4 text-center">
                        <img src={qr.qrCode} alt={`QR for ${qr.guestName}`} className="w-32 h-32 mx-auto mb-2" />
                        <p className="text-white font-medium text-sm">{qr.guestName}</p>
                        {qr.table && <p className="text-gray-400 text-xs">{qr.table}</p>}
                        {qr.group && <p className="text-gray-500 text-xs">{qr.group}</p>}
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${rsvpStatusColor(qr.rsvpStatus)}`}>
                          {qr.rsvpStatus.charAt(0).toUpperCase() + qr.rsvpStatus.slice(1)}
                        </span>
                        <div className="mt-2">
                          <Button size="sm" variant="ghost" className="text-blue-400 text-xs" onClick={(e) => { e.stopPropagation(); downloadQRCode(qr); }}>
                            <Download className="w-3 h-3 mr-1" /> Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {selectedQR && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setSelectedQR(null)}>
                <div className="bg-white rounded-xl p-6 max-w-md w-full text-center" onClick={e => e.stopPropagation()}>
                  <PreviewInvitationCard qr={selectedQR} generateCard={generateInvitationCard} />
                  <p className="text-gray-400 text-xs mt-2 break-all">{selectedQR.rsvpUrl}</p>
                  <div className="flex gap-3 justify-center mt-4">
                    <Button onClick={() => downloadQRCode(selectedQR)} className="bg-[#330311] text-white">
                      <Download className="w-4 h-4 mr-1" /> Download Invitation
                    </Button>
                    <Button variant="outline" className="text-black border-gray-300" onClick={() => {
                      navigator.clipboard.writeText(selectedQR.rsvpUrl);
                      toast({ title: "RSVP Link Copied!" });
                    }}>
                      Copy Link
                    </Button>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedQR(null)} className="mt-3 text-gray-500">Close</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "seating" && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Seating Plan & Floor Plan</h2>
                <p className="text-gray-400 text-xs sm:text-sm">View table assignments and auto-generate a floor plan layout</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => generateFloorPlanMutation.mutate()}
                  disabled={generateFloorPlanMutation.isPending}
                  className="bg-white text-[#330311] font-bold text-xs sm:text-sm"
                >
                  <LayoutGrid className="w-4 h-4 mr-1" />
                  {generateFloorPlanMutation.isPending ? "Generating..." : <><span className="hidden sm:inline">Generate Floor Plan</span><span className="sm:hidden">Generate</span></>}
                </Button>
                <Button variant="outline" onClick={() => setTab("list")} className="text-white border-white/70 hover:bg-white/10 hover:border-white text-xs sm:text-sm">Back</Button>
              </div>
            </div>

            {seatingLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                <p className="text-gray-300">Loading seating plan...</p>
              </div>
            ) : seatingPlan ? (
              <div className="space-y-6">
                {seatingPlan.floorPlans && seatingPlan.floorPlans.length > 0 && (
                  <Card className="bg-[#2a020d] border-[#4a0a1e]">
                    <CardHeader>
                      <CardTitle className="text-white text-base">Floor Plan Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-[#1a0108] rounded-lg p-4 min-h-[300px] relative overflow-auto">
                        {(() => {
                          const latestPlan = seatingPlan.floorPlans[seatingPlan.floorPlans.length - 1];
                          const elements = (latestPlan?.planData || latestPlan?.plan_data || []) as any[];
                          if (elements.length === 0) return <p className="text-gray-500 text-center py-12">No tables placed yet</p>;

                          const maxX = Math.max(...elements.map((el: any) => (el.x || 0) + (el.width || 60)));
                          const maxY = Math.max(...elements.map((el: any) => (el.y || 0) + (el.height || 60)));

                          return (
                            <svg viewBox={`0 0 ${maxX + 40} ${maxY + 40}`} className="w-full" style={{ maxHeight: '400px' }}>
                              {elements.map((el: any, idx: number) => (
                                <g key={el.id || idx}>
                                  {el.shape === 'circle' ? (
                                    <circle
                                      cx={(el.x || 0) + (el.width || 60) / 2}
                                      cy={(el.y || 0) + (el.height || 60) / 2}
                                      r={(el.width || 60) / 2}
                                      fill={el.color || '#8B4513'}
                                      fillOpacity={0.3}
                                      stroke={el.color || '#8B4513'}
                                      strokeWidth={2}
                                    />
                                  ) : (
                                    <rect
                                      x={el.x || 0} y={el.y || 0}
                                      width={el.width || 80} height={el.height || 60}
                                      rx={6}
                                      fill={el.color || '#8B4513'}
                                      fillOpacity={0.3}
                                      stroke={el.color || '#8B4513'}
                                      strokeWidth={2}
                                    />
                                  )}
                                  <text
                                    x={(el.x || 0) + (el.width || 60) / 2}
                                    y={(el.y || 0) + (el.height || 60) / 2 - 6}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize={11}
                                    fontWeight="bold"
                                  >
                                    {el.label || `Table ${idx + 1}`}
                                  </text>
                                  <text
                                    x={(el.x || 0) + (el.width || 60) / 2}
                                    y={(el.y || 0) + (el.height || 60) / 2 + 10}
                                    textAnchor="middle"
                                    fill="#ccc"
                                    fontSize={9}
                                  >
                                    {el.capacity || 0} guests
                                  </text>
                                </g>
                              ))}
                            </svg>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(seatingPlan.tables).map(([tableName, guests]) => (
                    <Card key={tableName} className="bg-[#2a020d] border-[#4a0a1e]">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white text-sm">{tableName}</CardTitle>
                          <span className="text-gray-400 text-xs">{guests.length} guest{guests.length !== 1 ? 's' : ''}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-1">
                          {guests.map((g: any) => (
                            <div key={g.id} className="flex items-center justify-between py-1 border-b border-[#4a0a1e] last:border-0">
                              <div className="flex items-center gap-2">
                                {rsvpStatusIcon(g.rsvpStatus)}
                                <span className="text-white text-sm">{g.name}</span>
                                {(g.plusOnes || 0) > 0 && <span className="text-gray-500 text-xs">+{g.plusOnes}</span>}
                              </div>
                              <div className="flex gap-1">
                                {g.dietaryRequirements && g.dietaryRequirements !== "None" && (
                                  <span className="px-1.5 py-0.5 rounded text-xs bg-orange-900/40 text-orange-300">{g.dietaryRequirements}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {seatingPlan.unassigned.length > 0 && (
                  <Card className="bg-[#2a020d] border-yellow-800/50">
                    <CardHeader>
                      <CardTitle className="text-yellow-400 text-sm">Unassigned Guests ({seatingPlan.unassigned.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {seatingPlan.unassigned.map((g: any) => (
                          <div key={g.id} className="flex items-center gap-2 py-1">
                            {rsvpStatusIcon(g.rsvpStatus)}
                            <span className="text-white text-sm">{g.name}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="py-12 text-center">
                  <Map className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-300 text-lg mb-2">No seating data yet</p>
                  <p className="text-gray-500 text-sm">Assign guests to tables, then generate a floor plan layout</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "plus-ones" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Plus-Ones Management</h2>
                <p className="text-gray-400 text-xs sm:text-sm">Track and manage guest plus-ones</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowPlusOneForm(!showPlusOneForm)} className="bg-white text-[#330311] font-bold text-xs sm:text-sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Plus-One
                </Button>
                <Button variant="outline" onClick={() => setTab("list")} className="text-white border-white/70 hover:bg-white/10 hover:border-white text-xs sm:text-sm">Back</Button>
              </div>
            </div>

            {(() => {
              const checkedInCount = plusOnesData.filter((p: any) => p.checked_in).length;
              const dietaryMap: Record<string, number> = {};
              plusOnesData.forEach((p: any) => {
                const d = p.dietary_requirements || "None";
                dietaryMap[d] = (dietaryMap[d] || 0) + 1;
              });
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <Card className="bg-[#2a020d] border-[#4a0a1e]">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-white">{plusOnesData.length}</p>
                      <p className="text-xs text-gray-400">Total Plus-Ones</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-900/30 border-green-800">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-400">{checkedInCount}</p>
                      <p className="text-xs text-green-300">Checked In</p>
                    </CardContent>
                  </Card>
                  {Object.entries(dietaryMap).filter(([k]) => k !== "None").slice(0, 2).map(([diet, count]) => (
                    <Card key={diet} className="bg-orange-900/30 border-orange-800">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-orange-400">{count}</p>
                        <p className="text-xs text-orange-300">{diet}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}

            {showPlusOneForm && (
              <Card className="bg-[#2a020d] border-[#4a0a1e] mb-4">
                <CardContent className="p-4">
                  <h3 className="text-white font-semibold mb-3">Add New Plus-One</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className={labelStyle}>Parent Guest</label>
                      <select value={newPlusOne.parentGuestId} onChange={e => setNewPlusOne({ ...newPlusOne, parentGuestId: e.target.value })} className={selectStyle}>
                        <option value="">Select a guest...</option>
                        {guestList.map((g: Guest) => (
                          <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle}>Name</label>
                      <Input value={newPlusOne.name} onChange={e => setNewPlusOne({ ...newPlusOne, name: e.target.value })} className={inputStyle} placeholder="Plus-one name" />
                    </div>
                    <div>
                      <label className={labelStyle}>Dietary Requirements</label>
                      <select value={newPlusOne.dietary_requirements} onChange={e => setNewPlusOne({ ...newPlusOne, dietary_requirements: e.target.value })} className={selectStyle}>
                        {dietaryOptions.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle}>Meal Choice</label>
                      <Input value={newPlusOne.meal_choice} onChange={e => setNewPlusOne({ ...newPlusOne, meal_choice: e.target.value })} className={inputStyle} placeholder="e.g. Chicken, Fish" />
                    </div>
                    <div>
                      <label className={labelStyle}>Special Needs</label>
                      <Input value={newPlusOne.special_needs} onChange={e => setNewPlusOne({ ...newPlusOne, special_needs: e.target.value })} className={inputStyle} placeholder="Any special requirements" />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button onClick={() => addPlusOneMutation.mutate(newPlusOne)} disabled={!newPlusOne.parentGuestId || !newPlusOne.name || addPlusOneMutation.isPending} className="bg-white text-[#330311] font-bold">
                      {addPlusOneMutation.isPending ? "Adding..." : "Add Plus-One"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowPlusOneForm(false)} className="text-white border-white/70 hover:bg-white/10 hover:border-white">Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {plusOnesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                <p className="text-gray-300">Loading plus-ones...</p>
              </div>
            ) : plusOnesData.length === 0 ? (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="py-12 text-center">
                  <UserPlus className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-300 text-lg mb-2">No plus-ones yet</p>
                  <p className="text-gray-500 text-sm">Add plus-ones for your guests</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#4a0a1e]">
                          <th className="text-left p-3 text-gray-400 font-medium">Plus-One Name</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Parent Guest</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Table</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Dietary</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Meal</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Checked In</th>
                          <th className="text-right p-3 text-gray-400 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plusOnesData.map((po: any) => (
                          <tr key={po.id} className="border-b border-[#4a0a1e] last:border-0">
                            <td className="p-3 text-white font-medium">{po.name}</td>
                            <td className="p-3 text-gray-300">{po.parent_first_name} {po.parent_last_name}</td>
                            <td className="p-3 text-gray-400">{po.parent_table || "—"}</td>
                            <td className="p-3">
                              {po.dietary_requirements && po.dietary_requirements !== "None" ? (
                                <span className="px-2 py-0.5 rounded text-xs bg-orange-900/40 text-orange-300">{po.dietary_requirements}</span>
                              ) : <span className="text-gray-500">—</span>}
                            </td>
                            <td className="p-3 text-gray-300">{po.meal_choice || "—"}</td>
                            <td className="p-3">
                              {po.checked_in ? (
                                <span className="px-2 py-0.5 rounded text-xs bg-green-900/40 text-green-300">Yes</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400">No</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <Button size="sm" variant="ghost" onClick={() => { if (confirm("Remove this plus-one?")) deletePlusOneMutation.mutate(po.id); }} className="text-red-400">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "travel" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Travel & Accommodation</h2>
                <p className="text-gray-400 text-xs sm:text-sm">Track guest travel arrangements and accommodation needs</p>
              </div>
              <Button variant="outline" onClick={() => setTab("list")} className="text-white border-white/70 hover:bg-white/10 hover:border-white text-xs sm:text-sm">Back</Button>
            </div>

            {travelData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-white">{travelData.guests_with_travel_info || 0}</p>
                    <p className="text-xs text-gray-400">With Travel Info</p>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-900/30 border-yellow-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-400">{travelData.needing_transport || 0}</p>
                    <p className="text-xs text-yellow-300">Needing Transport</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-900/30 border-blue-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">{travelData.with_accommodation || 0}</p>
                    <p className="text-xs text-blue-300">With Accommodation</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-white">{travelData.total_guests || 0}</p>
                    <p className="text-xs text-gray-400">Total Guests</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {travelLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                <p className="text-gray-300">Loading travel data...</p>
              </div>
            ) : travelData?.guests?.length > 0 ? (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#4a0a1e]">
                          <th className="text-left p-3 text-gray-400 font-medium">Guest</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Group</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Travel Details</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Accommodation</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Arrival</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Departure</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Transport</th>
                          <th className="text-right p-3 text-gray-400 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {travelData.guests.map((g: any) => (
                          <tr key={g.id} className="border-b border-[#4a0a1e] last:border-0">
                            <td className="p-3 text-white font-medium">{g.firstName} {g.lastName}</td>
                            <td className="p-3 text-gray-400">{g.group || "—"}</td>
                            {editingTravelGuest === g.id ? (
                              <>
                                <td className="p-3"><Input value={travelEdits.travel_details || ""} onChange={e => setTravelEdits({ ...travelEdits, travel_details: e.target.value })} className="bg-white border-gray-300 text-black text-xs h-8" placeholder="Flight/train details" /></td>
                                <td className="p-3"><Input value={travelEdits.accommodation || ""} onChange={e => setTravelEdits({ ...travelEdits, accommodation: e.target.value })} className="bg-white border-gray-300 text-black text-xs h-8" placeholder="Hotel name" /></td>
                                <td className="p-3"><Input type="date" value={travelEdits.arrival_date || ""} onChange={e => setTravelEdits({ ...travelEdits, arrival_date: e.target.value })} className="bg-white border-gray-300 text-black text-xs h-8" /></td>
                                <td className="p-3"><Input type="date" value={travelEdits.departure_date || ""} onChange={e => setTravelEdits({ ...travelEdits, departure_date: e.target.value })} className="bg-white border-gray-300 text-black text-xs h-8" /></td>
                                <td className="p-3">
                                  <select value={travelEdits.transport_needed ? "yes" : "no"} onChange={e => setTravelEdits({ ...travelEdits, transport_needed: e.target.value === "yes" })} className="px-2 py-1 rounded border border-gray-300 bg-white text-black text-xs">
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                  </select>
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex gap-1 justify-end">
                                    <Button size="sm" onClick={() => updateTravelMutation.mutate({ id: g.id, data: travelEdits })} disabled={updateTravelMutation.isPending} className="bg-white text-[#330311] text-xs h-7 px-2">Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setEditingTravelGuest(null); setTravelEdits({}); }} className="text-gray-400 text-xs h-7 px-2">Cancel</Button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 text-gray-300">{g.travel_details || "—"}</td>
                                <td className="p-3 text-gray-300">{g.accommodation || "—"}</td>
                                <td className="p-3 text-gray-400">{g.arrival_date ? new Date(g.arrival_date).toLocaleDateString() : "—"}</td>
                                <td className="p-3 text-gray-400">{g.departure_date ? new Date(g.departure_date).toLocaleDateString() : "—"}</td>
                                <td className="p-3">
                                  {g.transport_needed ? (
                                    <span className="px-2 py-0.5 rounded text-xs bg-yellow-900/40 text-yellow-300">Needed</span>
                                  ) : <span className="text-gray-500">—</span>}
                                </td>
                                <td className="p-3 text-right">
                                  <Button size="sm" variant="ghost" onClick={() => {
                                    setEditingTravelGuest(g.id);
                                    setTravelEdits({
                                      travel_details: g.travel_details || "",
                                      accommodation: g.accommodation || "",
                                      arrival_date: g.arrival_date || "",
                                      departure_date: g.departure_date || "",
                                      transport_needed: g.transport_needed || false,
                                    });
                                  }} className="text-gray-400">
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="py-12 text-center">
                  <Plane className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-300 text-lg mb-2">No travel data yet</p>
                  <p className="text-gray-500 text-sm">Travel info will appear here once guests provide their details</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "gifts" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Gift Registry & Thank-Yous</h2>
                <p className="text-gray-400 text-xs sm:text-sm">Track gifts received and send thank-you notes</p>
              </div>
              <Button variant="outline" onClick={() => setTab("list")} className="text-white border-white/70 hover:bg-white/10 hover:border-white text-xs sm:text-sm">Back</Button>
            </div>

            {giftsData && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-white">{giftsData.total_gifts || 0}</p>
                    <p className="text-xs text-gray-400">Total Gifts</p>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-900/30 border-yellow-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-400">{giftsData.pending_thank_yous || 0}</p>
                    <p className="text-xs text-yellow-300">Pending Thank-Yous</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-900/30 border-green-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{(giftsData.total_gifts || 0) - (giftsData.pending_thank_yous || 0)}</p>
                    <p className="text-xs text-green-300">Thank-Yous Sent</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {giftsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                <p className="text-gray-300">Loading gifts...</p>
              </div>
            ) : giftsData?.all_guests?.length > 0 ? (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#4a0a1e]">
                          <th className="text-left p-3 text-gray-400 font-medium">Guest</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Group</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Gift Description</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Received</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Thank-You</th>
                          <th className="text-right p-3 text-gray-400 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {giftsData.all_guests.map((g: any) => (
                          <tr key={g.id} className="border-b border-[#4a0a1e] last:border-0">
                            <td className="p-3 text-white font-medium">{g.firstName} {g.lastName}</td>
                            <td className="p-3 text-gray-400">{g.group || "—"}</td>
                            <td className="p-3">
                              {g.gift_description ? (
                                <span className="text-gray-300">{g.gift_description}</span>
                              ) : (
                                <div className="flex gap-2 items-center">
                                  <Input
                                    value={giftInput[g.id] || ""}
                                    onChange={e => setGiftInput({ ...giftInput, [g.id]: e.target.value })}
                                    className="bg-white border-gray-300 text-black text-xs h-8 w-40"
                                    placeholder="Enter gift..."
                                  />
                                  <Button size="sm" onClick={() => {
                                    if (giftInput[g.id]?.trim()) {
                                      updateGiftMutation.mutate({ id: g.id, data: { gift_description: giftInput[g.id], gift_received_at: new Date().toISOString() } });
                                      setGiftInput(prev => { const n = { ...prev }; delete n[g.id]; return n; });
                                    }
                                  }} className="bg-white text-[#330311] text-xs h-8 px-2">Add</Button>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-gray-400">{g.gift_received_at ? new Date(g.gift_received_at).toLocaleDateString() : "—"}</td>
                            <td className="p-3">
                              {g.thank_you_sent ? (
                                <span className="px-2 py-0.5 rounded text-xs bg-green-900/40 text-green-300">Sent</span>
                              ) : g.gift_description ? (
                                <Button size="sm" variant="ghost" onClick={() => updateGiftMutation.mutate({ id: g.id, data: { thank_you_sent: true } })} className="text-yellow-400 text-xs">
                                  Mark Sent
                                </Button>
                              ) : <span className="text-gray-500">—</span>}
                            </td>
                            <td className="p-3 text-right">
                              {g.gift_description && (
                                <Button size="sm" variant="ghost" onClick={() => updateGiftMutation.mutate({ id: g.id, data: { gift_description: null, gift_received_at: null, thank_you_sent: false } })} className="text-red-400">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="py-12 text-center">
                  <Gift className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-300 text-lg mb-2">No gift data yet</p>
                  <p className="text-gray-500 text-sm">Gifts will appear here as they are logged</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "comms" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Communications Log</h2>
                <p className="text-gray-400 text-xs sm:text-sm">View all guest communications history</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setLocation(`/email-campaigns?eventId=${eventId}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
                >
                  📧 Send Campaign
                </Button>
                <select value={commsChannelFilter} onChange={e => setCommsChannelFilter(e.target.value)} className="px-3 py-2 rounded-md border border-gray-300 bg-white text-black text-sm">
                  <option value="all">All Channels</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
                <Button variant="outline" onClick={() => setTab("list")} className="text-white border-white/70 hover:bg-white/10 hover:border-white text-xs sm:text-sm">Back</Button>
              </div>
            </div>

            {commsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                <p className="text-gray-300">Loading communications...</p>
              </div>
            ) : (() => {
              const filtered = commsChannelFilter === "all" ? commsData : commsData.filter((c: any) => c.channel === commsChannelFilter);
              const channelIcon = (ch: string) => {
                switch (ch) {
                  case "email": return <Mail className="w-4 h-4 text-blue-400" />;
                  case "whatsapp": return <MessageCircle className="w-4 h-4 text-green-400" />;
                  case "sms": return <Phone className="w-4 h-4 text-purple-400" />;
                  default: return <Mail className="w-4 h-4 text-gray-400" />;
                }
              };
              const statusBadge = (status: string) => {
                switch (status) {
                  case "sent": return "bg-blue-900/40 text-blue-300";
                  case "delivered": return "bg-green-900/40 text-green-300";
                  case "failed": return "bg-red-900/40 text-red-300";
                  default: return "bg-gray-800 text-gray-400";
                }
              };
              return filtered.length === 0 ? (
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="py-12 text-center">
                    <Mail className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-300 text-lg mb-2">No communications yet</p>
                    <p className="text-gray-500 text-sm">Messages sent to guests will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filtered.map((comm: any, idx: number) => (
                    <Card key={idx} className="bg-[#2a020d] border-[#4a0a1e]">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">{channelIcon(comm.channel)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-medium text-sm">{comm.guest_name}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${statusBadge(comm.status)}`}>
                                {comm.status}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs bg-[#4a0a1e] text-gray-300 capitalize">{comm.channel}</span>
                            </div>
                            <p className="text-gray-300 text-sm mt-1 truncate">{comm.message_preview}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span>By: {comm.sent_by}</span>
                              <span>{comm.sent_at ? new Date(comm.sent_at).toLocaleString() : ""}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {tab === "catering" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Catering Report</h2>
                <p className="text-gray-400 text-xs sm:text-sm">Dietary requirements and meal choices breakdown</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (!printWindow || !cateringData) return;
                  const eventName = (event as any)?.name || (event as any)?.eventName || "Event";
                  let html = `<!DOCTYPE html><html><head><title>Catering Report - ${eventName}</title>
                    <style>body{font-family:Arial,sans-serif;margin:20px;color:#333}h1{color:#330311}h2{color:#8B1538;margin-top:30px}
                    .stats{display:flex;gap:20px;margin:20px 0}.stat{background:#f9f9f9;padding:15px 25px;border-radius:8px;text-align:center}
                    .stat .num{font-size:28px;font-weight:bold;color:#330311}.stat .lbl{font-size:12px;color:#666}
                    .section{margin:20px 0}.item{display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #eee}
                    .item .name{font-weight:600}.item .count{color:#8B1538;font-weight:bold}.guests{font-size:12px;color:#888;margin-top:2px}
                    @media print{body{margin:10px}}</style></head><body>
                    <h1>Catering Report — ${eventName}</h1>
                    <p style="color:#666">Generated: ${new Date().toLocaleString()}</p>
                    <div class="stats">
                      <div class="stat"><div class="num">${cateringData.total_covers || 0}</div><div class="lbl">Total Covers</div></div>
                      <div class="stat"><div class="num">${cateringData.total_attending || 0}</div><div class="lbl">Guests</div></div>
                      <div class="stat"><div class="num">${cateringData.total_plus_ones || 0}</div><div class="lbl">Plus-Ones</div></div>
                    </div>`;
                  if (cateringData.dietary_breakdown) {
                    html += `<h2>Dietary Requirements</h2><div class="section">`;
                    Object.entries(cateringData.dietary_breakdown).forEach(([key, val]: [string, any]) => {
                      html += `<div class="item"><div><span class="name">${key}</span><div class="guests">${(val.guests || []).join(", ")}</div></div><span class="count">${val.count}</span></div>`;
                    });
                    html += `</div>`;
                  }
                  if (cateringData.meal_breakdown) {
                    html += `<h2>Meal Choices</h2><div class="section">`;
                    Object.entries(cateringData.meal_breakdown).forEach(([key, val]: [string, any]) => {
                      html += `<div class="item"><div><span class="name">${key}</span><div class="guests">${(val.guests || []).join(", ")}</div></div><span class="count">${val.count}</span></div>`;
                    });
                    html += `</div>`;
                  }
                  html += `</body></html>`;
                  printWindow.document.write(html);
                  printWindow.document.close();
                  setTimeout(() => printWindow.print(), 500);
                }} className="bg-white text-[#330311] font-bold text-xs sm:text-sm">
                  <Printer className="w-4 h-4 mr-1" /> Print Catering Report
                </Button>
                <Button variant="outline" onClick={() => setTab("list")} className="text-white border-white/70 hover:bg-white/10 hover:border-white text-xs sm:text-sm">Back</Button>
              </div>
            </div>

            {cateringData && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-white">{cateringData.total_covers || 0}</p>
                    <p className="text-xs text-gray-400">Total Covers</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-white">{cateringData.total_attending || 0}</p>
                    <p className="text-xs text-gray-400">Guests Attending</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-900/30 border-blue-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">{cateringData.total_plus_ones || 0}</p>
                    <p className="text-xs text-blue-300">Plus-Ones Attending</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {cateringLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                <p className="text-gray-300">Loading catering report...</p>
              </div>
            ) : cateringData ? (
              <div className="space-y-6">
                {cateringData.dietary_breakdown && Object.keys(cateringData.dietary_breakdown).length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Dietary Requirements</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(cateringData.dietary_breakdown).map(([key, val]: [string, any]) => (
                        <Card key={key} className="bg-[#2a020d] border-[#4a0a1e]">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium">{key}</span>
                              <span className="px-2 py-0.5 rounded text-xs bg-orange-900/40 text-orange-300 font-bold">{val.count}</span>
                            </div>
                            <p className="text-gray-400 text-xs">{(val.guests || []).join(", ") || "No guests"}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {cateringData.meal_breakdown && Object.keys(cateringData.meal_breakdown).length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Meal Choices</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(cateringData.meal_breakdown).map(([key, val]: [string, any]) => (
                        <Card key={key} className="bg-[#2a020d] border-[#4a0a1e]">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium">{key}</span>
                              <span className="px-2 py-0.5 rounded text-xs bg-blue-900/40 text-blue-300 font-bold">{val.count}</span>
                            </div>
                            <p className="text-gray-400 text-xs">{(val.guests || []).join(", ") || "No guests"}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {(!cateringData.dietary_breakdown || Object.keys(cateringData.dietary_breakdown).length === 0) && (!cateringData.meal_breakdown || Object.keys(cateringData.meal_breakdown).length === 0) && (
                  <Card className="bg-[#2a020d] border-[#4a0a1e]">
                    <CardContent className="py-12 text-center">
                      <UtensilsCrossed className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-300 text-lg mb-2">No catering data</p>
                      <p className="text-gray-500 text-sm">Add dietary requirements and meal choices to your guest records</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="py-12 text-center">
                  <UtensilsCrossed className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-300 text-lg mb-2">No catering data</p>
                  <p className="text-gray-500 text-sm">Catering report will appear when guests have dietary/meal data</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "checkin-analytics" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Check-In Analytics</h2>
                <p className="text-gray-400 text-xs sm:text-sm">Live check-in tracking — auto-refreshes every 30 seconds</p>
              </div>
              <Button variant="outline" onClick={() => setTab("list")} className="text-white border-white/70 hover:bg-white/10 hover:border-white text-xs sm:text-sm">Back</Button>
            </div>

            {checkinLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                <p className="text-gray-300">Loading check-in analytics...</p>
              </div>
            ) : checkinData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="bg-[#2a020d] border-[#4a0a1e]">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-white">{checkinData.total_expected || 0}</p>
                      <p className="text-xs text-gray-400">Expected</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-900/30 border-green-800">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-green-400">{checkinData.checked_in || 0}</p>
                      <p className="text-xs text-green-300">Checked In</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-900/30 border-yellow-800">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-yellow-400">{checkinData.remaining || 0}</p>
                      <p className="text-xs text-yellow-300">Remaining</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-900/30 border-blue-800">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-blue-400">{checkinData.check_in_rate || 0}%</p>
                      <p className="text-xs text-blue-300">Check-In Rate</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-3">Progress</h3>
                    <div className="w-full bg-[#1a0209] rounded-full h-6 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-600 to-green-400 h-6 rounded-full transition-all duration-500"
                        style={{ width: `${checkinData.total_expected ? Math.min(100, (checkinData.checked_in / checkinData.total_expected) * 100) : 0}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                        {checkinData.checked_in || 0} / {checkinData.total_expected || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {checkinData.timeline && checkinData.timeline.length > 0 && (
                  <Card className="bg-[#2a020d] border-[#4a0a1e]">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Arrival Timeline (15-min slots)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {checkinData.timeline.map((slot: any, idx: number) => {
                          const maxCount = Math.max(...checkinData.timeline.map((s: any) => s.count), 1);
                          return (
                            <div key={idx} className="flex items-center gap-3">
                              <span className="text-gray-400 text-xs w-16 shrink-0">{slot.time}</span>
                              <div className="flex-1 bg-[#1a0209] rounded-full h-5 relative overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-[#8B1538] to-[#330311] h-5 rounded-full transition-all"
                                  style={{ width: `${(slot.count / maxCount) * 100}%` }}
                                />
                              </div>
                              <span className="text-white text-xs font-bold w-8 text-right">{slot.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {checkinData.still_missing && checkinData.still_missing.length > 0 && (
                  <Card className="bg-[#2a020d] border-yellow-800/50">
                    <CardHeader>
                      <CardTitle className="text-yellow-400 text-sm">Still Missing ({checkinData.still_missing.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#4a0a1e]">
                              <th className="text-left p-3 text-gray-400 font-medium">Guest</th>
                              <th className="text-left p-3 text-gray-400 font-medium">Group</th>
                              <th className="text-left p-3 text-gray-400 font-medium">Table</th>
                            </tr>
                          </thead>
                          <tbody>
                            {checkinData.still_missing.map((g: any) => (
                              <tr key={g.id} className="border-b border-[#4a0a1e] last:border-0">
                                <td className="p-3 text-white font-medium">{g.firstName} {g.lastName}</td>
                                <td className="p-3 text-gray-400">{g.group || "—"}</td>
                                <td className="p-3 text-gray-400">{g.tableAssignment || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="py-12 text-center">
                  <Activity className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-300 text-lg mb-2">No check-in data</p>
                  <p className="text-gray-500 text-sm">Check-in analytics will populate as guests check in</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {editingGuest && (
          <Card className="bg-[#2a020d] border-[#4a0a1e] mb-6">
            <CardHeader>
              <CardTitle className="text-white">Edit Guest — {editingGuest.firstName} {editingGuest.lastName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className={labelStyle}>First Name</label>
                  <Input value={editingGuest.firstName} onChange={e => setEditingGuest({ ...editingGuest, firstName: e.target.value })} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Last Name</label>
                  <Input value={editingGuest.lastName} onChange={e => setEditingGuest({ ...editingGuest, lastName: e.target.value })} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Email</label>
                  <Input type="email" value={editingGuest.email || ""} onChange={e => setEditingGuest({ ...editingGuest, email: e.target.value })} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Phone</label>
                  <Input value={editingGuest.phone || ""} onChange={e => setEditingGuest({ ...editingGuest, phone: e.target.value })} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Group</label>
                  <select value={editingGuest.group || "General"} onChange={e => setEditingGuest({ ...editingGuest, group: e.target.value })} className={selectStyle}>
                    {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Table</label>
                  <Input value={editingGuest.tableAssignment || ""} onChange={e => setEditingGuest({ ...editingGuest, tableAssignment: e.target.value })} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>RSVP Status</label>
                  <select value={editingGuest.rsvpStatus} onChange={e => setEditingGuest({ ...editingGuest, rsvpStatus: e.target.value })} className={selectStyle}>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                    <option value="tentative">Tentative</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Plus Ones</label>
                  <Input type="number" min="0" value={editingGuest.plusOnes || 0} onChange={e => setEditingGuest({ ...editingGuest, plusOnes: parseInt(e.target.value) || 0 })} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Dietary</label>
                  <select value={editingGuest.dietaryRequirements || "None"} onChange={e => setEditingGuest({ ...editingGuest, dietaryRequirements: e.target.value })} className={selectStyle}>
                    {dietaryOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Button onClick={() => updateGuestMutation.mutate({ id: editingGuest.id, data: editingGuest })} disabled={updateGuestMutation.isPending} className="bg-white text-[#330311] font-bold">
                  {updateGuestMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setEditingGuest(null)} className="text-white border-white/70 hover:bg-white/10 hover:border-white">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(tab === "list" || tab === "stats") && !editingGuest && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search guests..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-gray-300 text-black"
                />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-md border border-gray-300 bg-white text-black text-sm">
                <option value="all">All RSVP Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="tentative">Tentative</option>
              </select>
              <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="px-3 py-2 rounded-md border border-gray-300 bg-white text-black text-sm">
                <option value="all">All Groups</option>
                {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <Button onClick={exportGuestsCSV} variant="outline" className="text-white border-white/70 hover:bg-white/10 hover:border-white">
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
              {guestsWithPhone.length > 0 && (
                <Button onClick={() => setWaBulkOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                  <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp All ({guestsWithPhone.length})
                </Button>
              )}
              <Button onClick={() => setSegmentDialogOpen(true)} className="bg-[#8B1538] hover:bg-[#6d1029] text-white">
                <Users className="w-4 h-4 mr-1" /> Send to Segment
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                <p className="text-gray-300">Loading guests...</p>
              </div>
            ) : filteredGuests.length === 0 ? (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-300 text-lg mb-2">No guests yet</p>
                  <p className="text-gray-500 text-sm mb-4">Add guests individually or import from a spreadsheet</p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => setTab("add")} className="bg-white text-[#330311]">
                      <UserPlus className="w-4 h-4 mr-1" /> Add Guest
                    </Button>
                    <Button onClick={() => setTab("import")} variant="outline" className="text-white border-white/70 hover:bg-white/10 hover:border-white">
                      <Upload className="w-4 h-4 mr-1" /> Import CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm mb-2">{filteredGuests.length} guest{filteredGuests.length !== 1 ? "s" : ""} shown</p>
                {filteredGuests.map((guest: Guest) => (
                  <Card key={guest.id} className="bg-[#2a020d] border-[#4a0a1e]">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            {rsvpStatusIcon(guest.rsvpStatus)}
                            <div>
                              <p className="text-white font-medium text-sm sm:text-base">{guest.firstName} {guest.lastName}</p>
                              <div className="flex gap-2 sm:gap-3 text-xs text-gray-400 flex-wrap">
                                {guest.email && <span className="truncate max-w-[150px] sm:max-w-none">{guest.email}</span>}
                                {guest.phone && <span>{guest.phone}</span>}
                              </div>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${rsvpStatusColor(guest.rsvpStatus)}`}>
                            {guest.rsvpStatus.charAt(0).toUpperCase() + guest.rsvpStatus.slice(1)}
                          </span>
                          {guest.group && guest.group !== "General" && (
                            <span className="px-2 py-1 rounded-full text-xs bg-[#4a0a1e] text-gray-300">{guest.group}</span>
                          )}
                          {guest.tableAssignment && (
                            <span className="text-xs text-gray-400">{guest.tableAssignment}</span>
                          )}
                          {(guest.plusOnes || 0) > 0 && (
                            <span className="text-xs text-gray-400">+{guest.plusOnes}</span>
                          )}
                          {guest.dietaryRequirements && guest.dietaryRequirements !== "None" && (
                            <span className="px-2 py-1 rounded-full text-xs bg-orange-900/40 text-orange-300">{guest.dietaryRequirements}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          {!guest.checkedIn && guest.rsvpStatus === "accepted" && (
                            <Button size="sm" variant="ghost" onClick={() => checkinMutation.mutate(guest.id)} className="text-green-400" title="Check In">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {guest.checkedIn && (
                            <span className="text-xs text-green-400 font-medium">Checked In</span>
                          )}
                          {guest.rsvpToken && (
                            <Button size="sm" variant="ghost" onClick={() => {
                              navigator.clipboard.writeText(`https://eventperfekt.net/rsvp/${guest.rsvpToken}`);
                              toast({ title: "RSVP Link Copied!" });
                            }} className="text-blue-400" title="Copy RSVP Link">
                              <QrCode className="w-4 h-4" />
                            </Button>
                          )}
                          {guest.phone && (
                            <Button size="sm" variant="ghost" onClick={() => { setWaRecipient(guest); setWaMessage(""); setWhatsappOpen(true); }} className="text-green-400" title="Send WhatsApp">
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setEditingGuest(guest)} className="text-gray-300 hover:text-white" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Remove this guest?")) deleteGuestMutation.mutate(guest.id); }} className="text-red-400 hover:text-red-300" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        <Dialog open={whatsappOpen} onOpenChange={(o) => { setWhatsappOpen(o); if (!o) setWaRecipient(null); }}>
          <DialogContent className="bg-[#1a0508] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-400" />
                WhatsApp {waRecipient?.firstName} {waRecipient?.lastName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-white/40 text-xs">Sending to</p>
                <p className="text-white text-sm font-medium">{waRecipient?.phone}</p>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Message</label>
                <Textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  placeholder={`Hi ${waRecipient?.firstName || ''}, ...`}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 min-h-[100px]"
                />
              </div>
              <Button
                onClick={() => waRecipient?.phone && sendWhatsAppMutation.mutate({ phone: waRecipient.phone, message: waMessage })}
                disabled={!waMessage.trim() || sendWhatsAppMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {sendWhatsAppMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send WhatsApp Message</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={waBulkOpen} onOpenChange={setWaBulkOpen}>
          <DialogContent className="bg-[#1a0508] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-400" />
                WhatsApp All Guests
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-white/40 text-xs">Sending to</p>
                <p className="text-white text-sm font-medium">{guestsWithPhone.length} guests with phone numbers</p>
                {(guestList as Guest[]).length - guestsWithPhone.length > 0 && (
                  <p className="text-amber-400/70 text-xs mt-1">
                    {(guestList as Guest[]).length - guestsWithPhone.length} guest{(guestList as Guest[]).length - guestsWithPhone.length !== 1 ? 's' : ''} without phone numbers will be skipped
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Message Type</label>
                <select value={waBulkType} onChange={e => setWaBulkType(e.target.value)} className="w-full px-3 py-2 rounded-md border border-white/20 bg-white/10 text-white text-sm">
                  <option value="general">General</option>
                  <option value="rsvp_reminder">RSVP Reminder</option>
                  <option value="payment_reminder">Payment Reminder</option>
                  <option value="event_update">Event Update</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Message</label>
                <Textarea
                  value={waBulkMessage}
                  onChange={(e) => setWaBulkMessage(e.target.value)}
                  placeholder="Hi {name}, we're looking forward to seeing you at..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 min-h-[100px]"
                />
                <p className="text-[10px] text-white/30 mt-1">Use {"{name}"} to personalise with each guest's name</p>
              </div>
              <Button
                onClick={() => bulkWhatsAppMutation.mutate({ message: waBulkMessage, type: waBulkType })}
                disabled={!waBulkMessage.trim() || bulkWhatsAppMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {bulkWhatsAppMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending to {guestsWithPhone.length} guests...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send to All {guestsWithPhone.length} Guests</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={segmentDialogOpen} onOpenChange={setSegmentDialogOpen}>
          <DialogContent className="bg-[#1a0508] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#ffffff]" />
                Send to Segment
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-1 block">Segment By</label>
                <select value={segmentType} onChange={e => { setSegmentType(e.target.value as any); setSegmentValue(""); }} className="w-full px-3 py-2 rounded-md border border-white/20 bg-white/10 text-white text-sm">
                  <option value="status">By RSVP Status</option>
                  <option value="table">By Table</option>
                  <option value="group">By Group</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">
                  {segmentType === "status" ? "RSVP Status" : segmentType === "table" ? "Table" : "Group"}
                </label>
                <select value={segmentValue} onChange={e => setSegmentValue(e.target.value)} className="w-full px-3 py-2 rounded-md border border-white/20 bg-white/10 text-white text-sm">
                  <option value="">Select...</option>
                  {segmentType === "status" && (
                    <>
                      <option value="pending">Not Responded</option>
                      <option value="accepted">Accepted</option>
                      <option value="declined">Declined</option>
                      <option value="tentative">Tentative</option>
                    </>
                  )}
                  {segmentType === "table" && tablePresets.map(t => <option key={t} value={t}>{t}</option>)}
                  {segmentType === "group" && groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Channel</label>
                <select value={segmentChannel} onChange={e => setSegmentChannel(e.target.value as any)} className="w-full px-3 py-2 rounded-md border border-white/20 bg-white/10 text-white text-sm">
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Message Template</label>
                <Textarea
                  value={segmentMessage}
                  onChange={e => setSegmentMessage(e.target.value)}
                  placeholder="Hi {first_name}, you are invited to {event_name}. Your table is {table}. We look forward to seeing you!"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 min-h-[100px]"
                />
                <p className="text-[10px] text-white/30 mt-1">Available variables: {"{name}"}, {"{first_name}"}, {"{table}"}, {"{event_name}"}</p>
              </div>
              {segmentValue && (
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-white text-sm font-medium">This will message <span className="text-[#ffffff] font-bold">{segmentMatchCount}</span> guest{segmentMatchCount !== 1 ? "s" : ""}</p>
                </div>
              )}
              <Button
                onClick={() => sendSegmentMutation.mutate({
                  segment_type: segmentType,
                  segment_value: segmentValue,
                  channel: segmentChannel,
                  message_template: segmentMessage,
                })}
                disabled={!segmentValue || !segmentMessage.trim() || segmentMatchCount === 0 || sendSegmentMutation.isPending}
                className="w-full bg-[#8B1538] hover:bg-[#6d1029] text-white"
              >
                {sendSegmentMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send to {segmentMatchCount} Guest{segmentMatchCount !== 1 ? "s" : ""}</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={digitalInviteOpen} onOpenChange={setDigitalInviteOpen}>
          <DialogContent className="bg-[#1a0108] border-[#4a0a1e] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Send className="w-5 h-5 text-[#8B1538]" />
                Send Digital Invitations
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#330311]/50 to-[#8B1538]/30 rounded-lg p-4 border border-amber-600/20">
                <p className="text-amber-300 text-xs font-semibold uppercase tracking-wide mb-1">Premium Digital Invitations</p>
                <p className="text-white/60 text-xs">Beautiful branded email invitations with RSVP buttons will be sent to all guests who have an email address and haven't received an invitation yet.</p>
              </div>
              <div className="bg-[#2a020d] rounded-lg p-4 border border-[#4a0a1e]">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Total guests with email</span>
                  <span className="text-white font-bold">{guestList.filter(g => g.email).length}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Already sent</span>
                  <span className="text-green-400 font-bold">{guestList.filter(g => g.invitationSent).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Will receive now</span>
                  <span className="text-amber-400 font-bold">{guestList.filter(g => g.email && !g.invitationSent).length}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-medium">Subject Line (optional)</label>
                <Input
                  value={inviteSubject}
                  onChange={(e) => setInviteSubject(e.target.value)}
                  placeholder="You're Invited: [Event Name]"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-medium">Personal Message (optional)</label>
                <Textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="We are delighted to invite you to our special occasion..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 min-h-[80px]"
                />
              </div>
              <Button
                onClick={async () => {
                  setSendingInvites(true);
                  try {
                    const result = await apiRequest("POST", `/api/events/${eventId}/guests/send-digital-invitations`, {
                      subject: inviteSubject || undefined,
                      message: inviteMessage || undefined,
                    });
                    toast({ title: "Invitations Sent!", description: `${(result as any).sent} digital invitations sent successfully.` });
                    setDigitalInviteOpen(false);
                    setInviteSubject("");
                    setInviteMessage("");
                    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests", "stats"] });
                  } catch (err) {
                    toast({ title: "Error", description: "Failed to send invitations.", variant: "destructive" });
                  } finally {
                    setSendingInvites(false);
                  }
                }}
                disabled={sendingInvites || guestList.filter(g => g.email && !g.invitationSent).length === 0}
                className="w-full bg-gradient-to-r from-[#8B1538] to-[#330311] hover:from-[#a01d45] hover:to-[#4a0a20] text-white font-semibold border border-amber-600/30"
              >
                {sendingInvites ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending invitations...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send {guestList.filter(g => g.email && !g.invitationSent).length} Digital Invitations</>
                )}
              </Button>
              <div className="mt-4 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/events/${eventId}/invitations/send`)}
                  className="w-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                  data-testid="link-invitation-send-centre"
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Open Send Command Centre — Live Tracking, Auto-Reminders & Premium Flourishes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function PreviewInvitationCard({ qr, generateCard }: { qr: QRCodeEntry; generateCard: (qr: QRCodeEntry) => Promise<string> }) {
  const [cardUrl, setCardUrl] = useState<string | null>(null);

  useEffect(() => {
    generateCard(qr).then(setCardUrl);
  }, [qr.guestId]);

  if (!cardUrl) {
    return (
      <div className="py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#330311] mx-auto mb-2"></div>
        <p className="text-gray-500 text-sm">Generating invitation card...</p>
      </div>
    );
  }

  return <img src={cardUrl} alt={`Invitation for ${qr.guestName}`} className="w-full max-w-[380px] mx-auto rounded-lg shadow-lg" />;
}