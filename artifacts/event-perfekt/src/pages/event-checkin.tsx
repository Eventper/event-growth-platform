import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PlannerSidebar from "@/components/PlannerSidebar";
import {
  QrCode, Search, UserCheck, Users, CheckCircle, XCircle,
  AlertTriangle, Utensils, Star, Camera, Keyboard, RefreshCw,
  ArrowLeft, Download, Clock, Shield, Printer
} from "lucide-react";

type CheckinGuest = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  group: string | null;
  tableAssignment: string | null;
  rsvpStatus: string;
  dietaryRequirements: string | null;
  specialNeeds: string | null;
  plusOnes: number | null;
  checkedIn: boolean;
  checkedInAt: string | null;
};

type CheckinData = {
  event: { id: string; name: string; startDate: string; venue: string } | null;
  guests: CheckinGuest[];
  stats: {
    total: number;
    checkedIn: number;
    accepted: number;
    vip: number;
    vipCheckedIn: number;
  };
};

type EventOption = {
  id: string;
  name: string;
};

export default function EventCheckin({ eventId: propEventId }: { eventId?: string }) {
  const params = useParams<{ eventId?: string }>();
  const initialEventId = propEventId && propEventId !== "select" ? propEventId : (params.eventId || "");
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [searchQuery, setSearchQuery] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [scannerActive, setScannerActive] = useState(false);
  const [lastCheckedIn, setLastCheckedIn] = useState<CheckinGuest | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedGuestQr, setSelectedGuestQr] = useState<{ qrCode: string; guestName: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();

  const eventId = selectedEventId || params.eventId || "";

  const { data: events } = useQuery<EventOption[]>({
    queryKey: ["/api/events"],
  });

  const { data: checkinData, isLoading, refetch } = useQuery<CheckinData>({
    queryKey: ["/api/events", eventId, "guests", "checkin-status"],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}/guests/checkin-status`),
    enabled: !!eventId,
    refetchInterval: 10000,
  });

  const checkinMutation = useMutation({
    mutationFn: ({ guestId, undo }: { guestId: string; undo?: boolean }) =>
      apiRequest("POST", `/api/events/${eventId}/guests/${guestId}/checkin`, { undo }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests", "checkin-status"] });
      if (!data.checkedIn) {
        toast({ title: "Check-in undone", description: `${data.firstName} ${data.lastName} has been unchecked.` });
        return;
      }
      const guest = checkinData?.guests.find(g => g.id === data.id);
      if (guest) setLastCheckedIn({ ...guest, checkedIn: true, checkedInAt: new Date().toISOString() });
      toast({
        title: "Guest Checked In!",
        description: `${data.firstName} ${data.lastName} — Table: ${data.tableAssignment || "N/A"}`,
      });
    },
    onError: () => {
      toast({ title: "Check-in failed", description: "Could not check in guest.", variant: "destructive" });
    },
  });

  const handleManualCheckin = () => {
    if (!manualCode.trim()) return;
    try {
      const payload = JSON.parse(manualCode.trim());
      if (payload.guestId) {
        checkinMutation.mutate({ guestId: payload.guestId });
        setManualCode("");
        return;
      }
    } catch {}
    const guest = checkinData?.guests.find(
      g => `${g.firstName} ${g.lastName}`.toLowerCase() === manualCode.trim().toLowerCase()
        || g.id === manualCode.trim()
    );
    if (guest) {
      checkinMutation.mutate({ guestId: guest.id });
      setManualCode("");
    } else {
      toast({ title: "Guest not found", description: "No matching guest found for that code or name.", variant: "destructive" });
    }
  };

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScannerActive(true);
        scanIntervalRef.current = window.setInterval(() => scanFrame(), 500);
      }
    } catch {
      toast({ title: "Camera access denied", description: "Please allow camera access to scan QR codes.", variant: "destructive" });
    }
  };

  const stopScanner = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScannerActive(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    try {
      const jsQR = (window as any).jsQR;
      if (!jsQR) return;
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        const payload = JSON.parse(code.data);
        if (payload.guestId && payload.eventId === eventId) {
          const guest = checkinData?.guests.find(g => g.id === payload.guestId);
          if (guest && !guest.checkedIn) {
            checkinMutation.mutate({ guestId: payload.guestId });
            stopScanner();
          } else if (guest?.checkedIn) {
            toast({ title: "Already checked in", description: `${guest.firstName} ${guest.lastName} is already checked in.` });
            stopScanner();
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  const viewGuestQr = async (guestId: string) => {
    try {
      const data = await apiRequest("GET", `/api/events/${eventId}/guests/${guestId}/qr`);
      setSelectedGuestQr(data);
      setQrDialogOpen(true);
    } catch {
      toast({ title: "Error", description: "Could not generate QR code.", variant: "destructive" });
    }
  };

  const filteredGuests = checkinData?.guests.filter(g => {
    const name = `${g.firstName} ${g.lastName}`.toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || g.email?.toLowerCase().includes(q) || g.tableAssignment?.toLowerCase().includes(q);
  }) || [];

  const stats = checkinData?.stats || { total: 0, checkedIn: 0, accepted: 0, vip: 0, vipCheckedIn: 0 };
  const checkinPercentage = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

  const handlePrintGuestList = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const eventName = events?.find(e => e.id === eventId)?.name || "Event";
    const rows = filteredGuests.map(g => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${g.firstName} ${g.lastName}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${g.tableAssignment || "-"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${g.group || "General"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${(g as any).dietaryRestrictions || g.dietaryRequirements || "-"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">
          ${g.checkedIn ? "✅ " + (g.checkedInAt ? new Date(g.checkedInAt).toLocaleTimeString() : "Yes") : "⬜"}
        </td>
      </tr>
    `).join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Guest List - ${eventName}</title>
      <style>
        body { font-family: 'Poppins', sans-serif;, Arial, sans-serif; padding: 30px; color: #333; }
        h1 { color: #330311; margin-bottom: 5px; }
        .subtitle { color: #666; margin-bottom: 20px; }
        .stats { display: flex; gap: 30px; margin-bottom: 20px; padding: 15px; background: #f8f8f8; border-radius: 8px; }
        .stat-item { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #330311; }
        .stat-label { font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 10px 8px; background: #330311; color: white; font-size: 13px; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #999; }
        @media print { body { padding: 15px; } }
      </style></head><body>
      <h1>${eventName} — Guest Check-In List</h1>
      <p class="subtitle">Printed: ${new Date().toLocaleString()}</p>
      <div class="stats">
        <div class="stat-item"><div class="stat-value">${stats.total}</div><div class="stat-label">Total Guests</div></div>
        <div class="stat-item"><div class="stat-value">${stats.checkedIn}</div><div class="stat-label">Checked In</div></div>
        <div class="stat-item"><div class="stat-value">${stats.total - stats.checkedIn}</div><div class="stat-label">Remaining</div></div>
        <div class="stat-item"><div class="stat-value">${stats.vip}</div><div class="stat-label">VIP</div></div>
      </div>
      <table><thead><tr>
        <th>Guest Name</th><th>Table</th><th>Group</th><th>Dietary</th><th>Checked In</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">Event Perfekt — ...making yours perfekt</div>
    </body></html>`);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#16213e] via-[#1a1a2e] to-[#0f3460]">
      <PlannerSidebar />
      <main className="flex-1 lg:ml-60 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white font-[Poppins]">
                <QrCode className="inline-block mr-2 h-7 w-7 text-[#8B1538]" />
                Event Check-In
              </h1>
              <p className="text-gray-400 text-sm mt-1">QR code scanner & manual check-in dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              {eventId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintGuestList}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Guest List
                </Button>
              )}
              <Select value={eventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-[250px] bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events?.map((e: EventOption) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()} className="border-white/20 text-white hover:bg-white/10">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!eventId && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h2 className="text-xl text-white mb-2">Select an Event</h2>
                <p className="text-gray-400">Choose an event above to start the check-in process.</p>
              </CardContent>
            </Card>
          )}

          {eventId && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
                  <CardContent className="p-4 text-center">
                    <Users className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                    <div className="text-xs text-gray-400">Total Guests</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-5 w-5 text-green-400 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-green-400">{stats.checkedIn}</div>
                    <div className="text-xs text-gray-400">Checked In</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
                  <CardContent className="p-4 text-center">
                    <Clock className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-yellow-400">{stats.total - stats.checkedIn}</div>
                    <div className="text-xs text-gray-400">Remaining</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
                  <CardContent className="p-4 text-center">
                    <Star className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-purple-400">{stats.vip}</div>
                    <div className="text-xs text-gray-400">VIP Guests</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-lg col-span-2 md:col-span-1">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-[#8B1538]">{checkinPercentage}%</div>
                    <div className="w-full bg-white/10 rounded-full h-2 mt-1">
                      <div
                        className="bg-[#8B1538] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${checkinPercentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Progress</div>
                  </CardContent>
                </Card>
              </div>

              {lastCheckedIn && (
                <Card className="bg-green-900/30 border-green-500/30 backdrop-blur-lg animate-in fade-in slide-in-from-top-2">
                  <CardContent className="p-4 flex items-center gap-4">
                    <CheckCircle className="h-8 w-8 text-green-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-white">
                        {lastCheckedIn.firstName} {lastCheckedIn.lastName}
                      </div>
                      <div className="flex gap-3 text-sm text-gray-300">
                        {lastCheckedIn.tableAssignment && <span>Table: {lastCheckedIn.tableAssignment}</span>}
                        {lastCheckedIn.group && <span>Group: {lastCheckedIn.group}</span>}
                        {lastCheckedIn.dietaryRequirements && (
                          <span className="flex items-center gap-1">
                            <Utensils className="h-3 w-3" /> {lastCheckedIn.dietaryRequirements}
                          </span>
                        )}
                      </div>
                    </div>
                    {lastCheckedIn.group?.toLowerCase() === "vip" && (
                      <Badge className="bg-purple-600 text-white">VIP</Badge>
                    )}
                    {lastCheckedIn.specialNeeds && (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Special Needs
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white/10 border-white/20">
                  <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-gray-300">
                    <Search className="h-4 w-4 mr-2" /> Search & Check-in
                  </TabsTrigger>
                  <TabsTrigger value="scanner" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-gray-300">
                    <Camera className="h-4 w-4 mr-2" /> QR Scanner
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-gray-300">
                    <Keyboard className="h-4 w-4 mr-2" /> Manual Entry
                  </TabsTrigger>
                  <TabsTrigger value="qrcodes" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-gray-300">
                    <QrCode className="h-4 w-4 mr-2" /> QR Codes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-4">
                  <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Search className="h-5 w-5 text-gray-400" />
                        <Input
                          placeholder="Search guest by name, email, or table..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="text-center py-8 text-gray-400">Loading guests...</div>
                      ) : (
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                          {filteredGuests.map(guest => (
                            <div
                              key={guest.id}
                              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                                guest.checkedIn
                                  ? "bg-green-900/20 border border-green-500/20"
                                  : "bg-white/5 border border-white/10 hover:bg-white/10"
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  guest.checkedIn ? "bg-green-600" : "bg-white/10"
                                }`}>
                                  {guest.checkedIn ? (
                                    <CheckCircle className="h-5 w-5 text-white" />
                                  ) : (
                                    <span className="text-white font-semibold text-sm">
                                      {guest.firstName[0]}{guest.lastName[0]}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-white font-medium truncate">
                                    {guest.firstName} {guest.lastName}
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                                    {guest.tableAssignment && <span>Table: {guest.tableAssignment}</span>}
                                    {guest.group && guest.group !== "General" && <span>Group: {guest.group}</span>}
                                    {guest.checkedInAt && (
                                      <span className="text-green-400">
                                        Checked in at {new Date(guest.checkedInAt).toLocaleTimeString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {guest.group?.toLowerCase() === "vip" && (
                                  <Badge className="bg-purple-600 text-white text-xs">VIP</Badge>
                                )}
                                {guest.dietaryRequirements && (
                                  <Badge variant="outline" className="border-orange-500 text-orange-400 text-xs">
                                    <Utensils className="h-3 w-3 mr-1" />
                                    {guest.dietaryRequirements}
                                  </Badge>
                                )}
                                {guest.specialNeeds && (
                                  <Badge variant="outline" className="border-yellow-500 text-yellow-400 text-xs">
                                    <AlertTriangle className="h-3 w-3" />
                                  </Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => viewGuestQr(guest.id)}
                                  className="text-gray-400 hover:text-white"
                                >
                                  <QrCode className="h-4 w-4" />
                                </Button>
                                {guest.checkedIn ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => checkinMutation.mutate({ guestId: guest.id, undo: true })}
                                    disabled={checkinMutation.isPending}
                                    className="border-red-500/50 text-red-400 hover:bg-red-900/20"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" /> Undo
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => checkinMutation.mutate({ guestId: guest.id })}
                                    disabled={checkinMutation.isPending}
                                    className="bg-[#8B1538] hover:bg-[#a01d45] text-white"
                                  >
                                    <UserCheck className="h-4 w-4 mr-1" /> Check In
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          {filteredGuests.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                              {searchQuery ? "No guests match your search." : "No guests found for this event."}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="scanner" className="mt-4">
                  <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Camera className="h-5 w-5 text-[#8B1538]" />
                        QR Code Scanner
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center space-y-4">
                        <div className="relative max-w-md mx-auto bg-black rounded-lg overflow-hidden aspect-square">
                          <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            playsInline
                            muted
                          />
                          <canvas ref={canvasRef} className="hidden" />
                          {!scannerActive && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                              <div className="text-center">
                                <Camera className="h-16 w-16 text-gray-500 mx-auto mb-3" />
                                <p className="text-gray-400 text-sm">Camera preview will appear here</p>
                              </div>
                            </div>
                          )}
                          {scannerActive && (
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute inset-[15%] border-2 border-[#8B1538] rounded-lg" />
                              <div className="absolute top-2 left-2 bg-red-600 w-3 h-3 rounded-full animate-pulse" />
                            </div>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">
                          {scannerActive
                            ? "Point camera at guest's QR code to check them in automatically."
                            : "Note: QR scanning requires the jsQR library. For best results, use manual entry or search."}
                        </p>
                        <div className="flex justify-center gap-3">
                          {scannerActive ? (
                            <Button onClick={stopScanner} variant="destructive">
                              Stop Scanner
                            </Button>
                          ) : (
                            <Button onClick={startScanner} className="bg-[#8B1538] hover:bg-[#a01d45] text-white">
                              <Camera className="h-4 w-4 mr-2" /> Start Scanner
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="manual" className="mt-4">
                  <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Keyboard className="h-5 w-5 text-[#8B1538]" />
                        Manual Code Entry
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-w-md mx-auto space-y-4">
                        <p className="text-gray-400 text-sm">
                          Enter a guest's QR code data, guest ID, or full name to check them in.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder='Paste QR code data or type guest name...'
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleManualCheckin()}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 flex-1"
                          />
                          <Button
                            onClick={handleManualCheckin}
                            disabled={!manualCode.trim() || checkinMutation.isPending}
                            className="bg-[#8B1538] hover:bg-[#a01d45] text-white"
                          >
                            <UserCheck className="h-4 w-4 mr-2" /> Check In
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="qrcodes" className="mt-4">
                  <QRCodeGrid eventId={eventId} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>

        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="bg-[#1a1a2e] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>{selectedGuestQr?.guestName}</DialogTitle>
            </DialogHeader>
            {selectedGuestQr && (
              <div className="text-center space-y-3">
                <img src={selectedGuestQr.qrCode} alt="QR Code" className="mx-auto rounded-lg" />
                <p className="text-gray-400 text-sm">Scan this code at the check-in desk</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function QRCodeGrid({ eventId }: { eventId: string }) {
  const { data: qrCodes, isLoading } = useQuery<Array<{
    guestId: string;
    guestName: string;
    table: string | null;
    group: string | null;
    rsvpStatus: string;
    qrCode: string;
  }>>({
    queryKey: ["/api/events", eventId, "guests", "qrcodes-checkin"],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}/guests/qrcodes-checkin`),
    enabled: !!eventId,
  });

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
        <CardContent className="p-8 text-center text-gray-400">Generating QR codes...</CardContent>
      </Card>
    );
  }

  if (!qrCodes?.length) {
    return (
      <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
        <CardContent className="p-8 text-center text-gray-400">No guests found for this event.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <QrCode className="h-5 w-5 text-[#8B1538]" />
          Guest QR Codes ({qrCodes.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 print:grid-cols-4">
          {qrCodes.map(qr => (
            <div key={qr.guestId} className="bg-white rounded-lg p-3 text-center">
              <img src={qr.qrCode} alt={qr.guestName} className="w-full aspect-square object-contain" />
              <div className="mt-2 text-sm font-medium text-gray-900 truncate">{qr.guestName}</div>
              {qr.table && <div className="text-xs text-gray-500">Table: {qr.table}</div>}
              {qr.group && qr.group !== "General" && (
                <div className="text-xs text-purple-600 font-medium">{qr.group}</div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <Button onClick={() => {
            const printWindow = window.open("", "_blank");
            if (!printWindow) return;
            const cards = qrCodes.map(qr => `
              <div style="display:inline-block;width:180px;text-align:center;padding:12px;border:1px dashed #ccc;border-radius:8px;margin:6px;page-break-inside:avoid;break-inside:avoid;">
                <img src="${qr.qrCode}" style="width:150px;height:150px;" />
                <div style="margin-top:8px;font-weight:600;font-size:13px;">${qr.guestName}</div>
                ${qr.table ? `<div style="font-size:11px;color:#666;">Table: ${qr.table}</div>` : ""}
                ${qr.group && qr.group !== "General" ? `<div style="font-size:11px;color:#8B1538;font-weight:500;">${qr.group}</div>` : ""}
              </div>
            `).join("");
            printWindow.document.write(`<!DOCTYPE html><html><head><title>Guest QR Codes</title>
              <style>
                body { font-family: 'Poppins', sans-serif;, Arial, sans-serif; padding: 20px; text-align: center; }
                h1 { color: #330311; font-size: 20px; margin-bottom: 15px; }
                .footer { margin-top: 20px; font-size: 11px; color: #999; }
                @media print { body { padding: 10px; } }
              </style></head><body>
              <h1>Guest QR Codes</h1>
              <div style="display:flex;flex-wrap:wrap;justify-content:center;">${cards}</div>
              <div class="footer">Event Perfekt — ...making yours perfekt</div>
            </body></html>`);
            printWindow.document.close();
            printWindow.onload = () => printWindow.print();
          }} variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Printer className="h-4 w-4 mr-2" /> Print QR Codes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}