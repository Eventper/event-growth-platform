import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Users, ArrowLeft, ArrowRight, Calendar, MapPin, UserCheck,
  UserX, Clock, HelpCircle, QrCode, LayoutGrid, Send, BarChart3,
  Mail, Utensils, Eye, Download, Plus, Printer
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import { format } from "date-fns";
import PlannerLayout from "@/components/PlannerLayout";

interface Event {
  id: string;
  name: string;
  type: string;
  eventCategory?: string;
  startDate: string;
  endDate: string;
  city?: string;
  country?: string;
  guestCount: number;
  status?: string;
}

interface GuestStats {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
  tentative: number;
  checkedIn?: number;
}

export default function GuestHub() {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "",
    type: "social",
    startDate: "",
    endDate: "",
    guestCount: "50",
    city: "",
    country: "Nigeria",
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: typeof newEvent) => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("type", data.type);
      formData.append("eventCategory", "private");
      formData.append("startDate", data.startDate);
      formData.append("endDate", data.endDate || data.startDate);
      formData.append("guestCount", data.guestCount);
      formData.append("city", data.city);
      formData.append("country", data.country);
      formData.append("budget", "0");
      formData.append("eventDays", "1");
      formData.append("currency", "NGN");
      formData.append("status", "planning");
      const res = await fetch("/api/events", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to create event");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setShowCreateDialog(false);
      setNewEvent({ name: "", type: "social", startDate: "", endDate: "", guestCount: "50", city: "", country: "Nigeria" });
      const eventId = data.id || data.event?.id;
      if (eventId) {
        setSelectedEventId(String(eventId));
        toast({ title: "Event Created!", description: "You can now start adding guests and tracking RSVPs." });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create event. Please try again.", variant: "destructive" });
    },
  });

  const { data: guests = [] } = useQuery<any[]>({
    queryKey: ["/api/events", selectedEventId, "guests"],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const res = await fetch(`/api/events/${selectedEventId}/guests`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const stats: GuestStats = {
    total: guests.length,
    accepted: guests.filter((g: any) => g.rsvpStatus === 'accepted').length,
    declined: guests.filter((g: any) => g.rsvpStatus === 'declined').length,
    pending: guests.filter((g: any) => g.rsvpStatus === 'pending' || !g.rsvpStatus).length,
    tentative: guests.filter((g: any) => g.rsvpStatus === 'tentative').length,
    checkedIn: guests.filter((g: any) => g.checkedIn).length,
  };

  const dietaryBreakdown = guests.reduce((acc: Record<string, number>, g: any) => {
    if (g.dietaryRequirements) {
      acc[g.dietaryRequirements] = (acc[g.dietaryRequirements] || 0) + 1;
    }
    return acc;
  }, {});

  const exportGuestsCSV = () => {
    if (guests.length === 0) return;
    const headers = ["First Name", "Last Name", "Email", "Phone", "Group", "RSVP Status", "Plus Ones", "Plus One Names", "Dietary Requirements", "Meal Choice", "Special Needs", "Table Assignment", "Seat Number", "Invitation Sent", "Checked In", "Notes"];
    const rows = guests.map((g: any) => [
      g.firstName || "", g.lastName || "", g.email || "", g.phone || "", g.group || "",
      g.rsvpStatus || "pending", g.plusOnes || 0, g.plusOneNames || "",
      g.dietaryRequirements || "", g.mealChoice || "", g.specialNeeds || "",
      g.tableAssignment || "", g.seatNumber || "", g.invitationSent ? "Yes" : "No",
      g.checkedIn ? "Yes" : "No", g.notes || ""
    ]);
    const csvContent = [headers, ...rows].map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `guests_export_${selectedEventId}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PlannerLayout>
      <div className="min-h-screen bg-[#f7f2f4]">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-[#330311] via-[#5a0e23] to-[#8B1538] p-6 md:p-8 text-white shadow-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Guest Hub</p>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <UserCheck className="h-8 w-8" />
                  Guest Management
                </h1>
                <p className="max-w-2xl text-sm text-white/75">Select an event to manage guests, RSVPs, seating, dietary needs, and more.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/planner-dashboard")} className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-white text-[#330311] hover:bg-white/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Event
                </Button>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-72 bg-white/10 text-white border-white/30">
                  <SelectValue placeholder="Select an event..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} — {format(new Date(event.startDate), 'MMM d, yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEventId && guests.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                  onClick={() => {
                    openPrintWindow({
                      title: `Guest List — ${selectedEvent?.name || "Event"}`,
                      stats: [
                        { label: "Total Guests", value: stats.total },
                        { label: "Accepted", value: stats.accepted },
                        { label: "Declined", value: stats.declined },
                        { label: "Pending", value: stats.pending },
                        { label: "Tentative", value: stats.tentative },
                      ],
                      columns: [
                        { header: "Name", key: "name" },
                        { header: "Email", key: "email" },
                        { header: "RSVP Status", key: "rsvpStatus", format: (v: any) => v || "pending" },
                        { header: "Table", key: "tableAssignment", format: (v: any) => v || "—" },
                        { header: "Dietary", key: "dietaryRequirements", format: (v: any) => v || "—" },
                      ],
                      rows: guests.map((g: any) => ({
                        name: g.name || g.fullName || `${g.firstName || ""} ${g.lastName || ""}`.trim(),
                        email: g.email || "—",
                        rsvpStatus: g.rsvpStatus,
                        tableAssignment: g.tableAssignment,
                        dietaryRequirements: g.dietaryRequirements,
                      })),
                      orientation: "landscape",
                    });
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              )}
              {selectedEventId && (
                <Button
                  onClick={() => setLocation(`/events/${selectedEventId}/guests`)}
                  className="bg-white text-[#330311] hover:bg-white/90"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Full Guest Manager
                </Button>
              )}
            </div>
          </div>

          {!selectedEventId ? (
            <Card className="border-dashed border-2 border-[#e8d8df] bg-white shadow-sm">
              <CardContent className="py-20 text-center">
                <Users className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                <h2 className="text-2xl font-semibold text-gray-600 mb-3">Select an Event or Create a New One</h2>
                <p className="text-gray-400 max-w-lg mx-auto mb-4">
                  Choose an event from the dropdown above to view and manage its guest list, RSVPs, dietary requirements, seating assignments, and more.
                </p>
                <Button onClick={() => setShowCreateDialog(true)} className="bg-[#8B1538] hover:bg-[#6d102c] text-white mb-8">
                  <Plus className="h-4 w-4 mr-2" /> Create New Event for Guest Tracking
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  {events.slice(0, 3).map((event) => (
                    <Card
                      key={event.id}
                      className="cursor-pointer hover:shadow-md hover:border-[#8B1538] transition-all border-[#e8d8df]"
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      <CardContent className="p-4 text-left">
                        <p className="font-semibold text-gray-900 text-sm truncate">{event.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(event.startDate), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Users className="h-3 w-3" />
                          {event.guestCount} guests expected
                        </p>
                        {event.city && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {event.city}, {event.country}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {selectedEvent && (
                <Card className="bg-gradient-to-r from-[#330311] to-[#8B1538] text-white shadow-lg">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h2 className="text-lg font-bold">{selectedEvent.name}</h2>
                        <div className="flex items-center gap-4 text-sm text-white/70 mt-1">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(selectedEvent.startDate), 'MMM d, yyyy')}</span>
                          {selectedEvent.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedEvent.city}, {selectedEvent.country}</span>}
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{selectedEvent.guestCount} expected</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white">{selectedEvent.type}</Badge>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="border-[#e8d8df] shadow-sm">
                  <CardContent className="pt-6 text-center">
                    <Users className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <p className="text-xs text-gray-500">Total Guests</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500 border-[#e8d8df] shadow-sm">
                  <CardContent className="pt-6 text-center">
                    <UserCheck className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
                    <p className="text-xs text-gray-500">Accepted</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500 border-[#e8d8df] shadow-sm">
                  <CardContent className="pt-6 text-center">
                    <UserX className="h-6 w-6 text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">{stats.declined}</div>
                    <p className="text-xs text-gray-500">Declined</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 border-[#e8d8df] shadow-sm">
                  <CardContent className="pt-6 text-center">
                    <Clock className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
                    <p className="text-xs text-gray-500">Pending</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500 border-[#e8d8df] shadow-sm">
                  <CardContent className="pt-6 text-center">
                    <HelpCircle className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{stats.tentative}</div>
                    <p className="text-xs text-gray-500">Tentative</p>
                  </CardContent>
                </Card>
              </div>

              {Object.keys(dietaryBreakdown).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Utensils className="h-4 w-4 text-[#8B1538]" />
                      Dietary Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(dietaryBreakdown).map(([diet, count]) => (
                        <Badge key={diet} variant="outline" className="text-sm">
                          {diet}: {count as number}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="cursor-pointer hover:shadow-md hover:border-[#8B1538] transition-all" onClick={() => setLocation(`/events/${selectedEventId}/guests`)}>
                  <CardContent className="pt-6 text-center">
                    <LayoutGrid className="h-8 w-8 text-[#8B1538] mx-auto mb-3" />
                    <p className="font-semibold text-sm">Guest List</p>
                    <p className="text-xs text-gray-500 mt-1">View, add, edit & import guests</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md hover:border-[#8B1538] transition-all" onClick={() => setLocation(`/events/${selectedEventId}/guests`)}>
                  <CardContent className="pt-6 text-center">
                    <QrCode className="h-8 w-8 text-[#8B1538] mx-auto mb-3" />
                    <p className="font-semibold text-sm">QR Codes & RSVP</p>
                    <p className="text-xs text-gray-500 mt-1">Generate QR codes for guest RSVPs</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md hover:border-[#8B1538] transition-all" onClick={() => setLocation(`/events/${selectedEventId}/invitations`)}>
                  <CardContent className="pt-6 text-center">
                    <Send className="h-8 w-8 text-[#8B1538] mx-auto mb-3" />
                    <p className="font-semibold text-sm">Digital Invitations</p>
                    <p className="text-xs text-gray-500 mt-1">Design & send event invitations</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md hover:border-[#8B1538] transition-all" onClick={() => setLocation(`/events/${selectedEventId}/guests`)}>
                  <CardContent className="pt-6 text-center">
                    <BarChart3 className="h-8 w-8 text-[#8B1538] mx-auto mb-3" />
                    <p className="font-semibold text-sm">Seating Plan</p>
                    <p className="text-xs text-gray-500 mt-1">Table assignments & floor plan</p>
                  </CardContent>
                </Card>
                <Card className={`cursor-pointer hover:shadow-md hover:border-[#8B1538] transition-all ${guests.length === 0 ? 'opacity-50' : ''}`} onClick={exportGuestsCSV}>
                  <CardContent className="pt-6 text-center">
                    <Download className="h-8 w-8 text-[#8B1538] mx-auto mb-3" />
                    <p className="font-semibold text-sm">Export Guests</p>
                    <p className="text-xs text-gray-500 mt-1">Download guest list as CSV</p>
                  </CardContent>
                </Card>
              </div>

              {guests.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#8B1538]" />
                        Recent Guests
                      </CardTitle>
                      <Button variant="link" size="sm" onClick={() => setLocation(`/events/${selectedEventId}/guests`)} className="text-[#8B1538]">
                        View All <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y">
                      {guests.slice(0, 8).map((guest: any) => (
                        <div key={guest.id} className="py-2 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-medium">
                              {(guest.name || guest.fullName || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{guest.name || guest.fullName}</p>
                              <p className="text-xs text-gray-500">{guest.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {guest.dietaryRequirements && (
                              <Badge variant="outline" className="text-xs">{guest.dietaryRequirements}</Badge>
                            )}
                            <Badge className={
                              guest.rsvpStatus === 'accepted' ? 'bg-green-100 text-green-800' :
                              guest.rsvpStatus === 'declined' ? 'bg-red-100 text-red-800' :
                              guest.rsvpStatus === 'tentative' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }>
                              {guest.rsvpStatus || 'pending'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#8B1538]" />
              Create New Event for Guest Management
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              Quickly set up an event to start managing guests, RSVPs, and tracking.
            </p>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
              <Input
                placeholder="e.g. John & Jane's Wedding"
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <Select value={newEvent.type} onValueChange={(v) => setNewEvent({ ...newEvent, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="social">Social Gathering</SelectItem>
                    <SelectItem value="funeral">Funeral</SelectItem>
                    <SelectItem value="graduation">Graduation</SelectItem>
                    <SelectItem value="baby_shower">Baby Shower</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="anniversary">Anniversary</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Guests</label>
                <Input
                  type="number"
                  placeholder="50"
                  value={newEvent.guestCount}
                  onChange={(e) => setNewEvent({ ...newEvent, guestCount: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Date *</label>
                <Input
                  type="date"
                  value={newEvent.startDate}
                  onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value, endDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <Input
                  type="date"
                  value={newEvent.endDate}
                  onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <Input
                  placeholder="e.g. Lagos"
                  value={newEvent.city}
                  onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <Input
                  placeholder="e.g. Nigeria"
                  value={newEvent.country}
                  onChange={(e) => setNewEvent({ ...newEvent, country: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="text-gray-600 border-gray-300">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!newEvent.name.trim()) {
                    toast({ title: "Event name is required", variant: "destructive" });
                    return;
                  }
                  if (!newEvent.startDate) {
                    toast({ title: "Event date is required", variant: "destructive" });
                    return;
                  }
                  createEventMutation.mutate(newEvent);
                }}
                disabled={createEventMutation.isPending}
                className="bg-[#8B1538] hover:bg-[#6d102c] text-white"
              >
                {createEventMutation.isPending ? "Creating..." : "Create Event & Start Managing Guests"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PlannerLayout>
  );
}