import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BadgeCheck,
  Printer,
  Users,
  QrCode,
  Loader2,
  Tag,
  Eye,
  Download,
} from "lucide-react";

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
  dietaryRequirements: string | null;
  mealChoice: string | null;
  specialNeeds: string | null;
  notes: string | null;
  checkedIn: boolean;
};

type EventItem = {
  id: string;
  name: string;
  type: string;
  date: string;
};

type BadgeTemplate = "simple" | "formal" | "conference";
type BadgeSize = "standard" | "large";
type Orientation = "landscape" | "portrait";

const dietaryIcons: Record<string, string> = {
  vegetarian: "🥬",
  vegan: "🌱",
  halal: "🍖",
  kosher: "✡️",
  "gluten-free": "🌾",
  "nut-free": "🥜",
  "dairy-free": "🥛",
};

function getDietaryIcon(dietary: string | null): string {
  if (!dietary || dietary.toLowerCase() === "none") return "";
  const lower = dietary.toLowerCase();
  for (const [key, icon] of Object.entries(dietaryIcons)) {
    if (lower.includes(key)) return icon;
  }
  return "⚠️";
}

function BadgeCard({
  guest,
  template,
  badgeSize,
  orientation,
  fontSize,
  primaryColor,
  secondaryColor,
  showQR,
}: {
  guest: Guest;
  template: BadgeTemplate;
  badgeSize: BadgeSize;
  orientation: Orientation;
  fontSize: number;
  primaryColor: string;
  secondaryColor: string;
  showQR: boolean;
}) {
  const isVIP = guest.group?.toLowerCase() === "vip";
  const dietIcon = getDietaryIcon(guest.dietaryRequirements);
  const widthPx = badgeSize === "standard" ? (orientation === "landscape" ? 336 : 192) : (orientation === "landscape" ? 384 : 288);
  const heightPx = badgeSize === "standard" ? (orientation === "landscape" ? 192 : 336) : (orientation === "landscape" ? 288 : 384);

  return (
    <div
      className="badge-card inline-block border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white relative"
      style={{
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      <div
        className="h-2"
        style={{ backgroundColor: primaryColor }}
      />

      {isVIP && (
        <div
          className="absolute top-3 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "#D4AF37" }}
        >
          VIP
        </div>
      )}

      <div className="flex flex-col items-center justify-center h-full px-3 pb-2 pt-1" style={{ marginTop: "-8px" }}>
        {template === "conference" && (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mb-1"
            style={{ backgroundColor: primaryColor, fontSize: `${fontSize * 0.9}px` }}
          >
            {guest.firstName[0]}{guest.lastName[0]}
          </div>
        )}

        <p
          className="font-bold text-center leading-tight"
          style={{ fontSize: `${fontSize}px`, color: primaryColor }}
        >
          {guest.firstName} {guest.lastName}
        </p>

        {template === "simple" && guest.tableAssignment && (
          <p className="text-gray-500 mt-1" style={{ fontSize: `${fontSize * 0.65}px` }}>
            {guest.tableAssignment}
          </p>
        )}

        {(template === "formal" || template === "conference") && (
          <>
            {guest.group && guest.group !== "General" && (
              <p style={{ fontSize: `${fontSize * 0.6}px`, color: secondaryColor }} className="mt-1">
                {guest.group}
              </p>
            )}
          </>
        )}

        {template === "conference" && (
          <>
            {guest.tableAssignment && (
              <p className="text-gray-400 mt-0.5" style={{ fontSize: `${fontSize * 0.55}px` }}>
                {guest.tableAssignment}
              </p>
            )}
            {showQR && (
              <div className="mt-1 flex items-center justify-center">
                <QrCode size={orientation === "landscape" ? 40 : 48} className="text-gray-400" />
              </div>
            )}
          </>
        )}

        {dietIcon && (
          <span className="mt-1" style={{ fontSize: `${fontSize * 0.7}px` }} title={guest.dietaryRequirements || ""}>
            {dietIcon}
          </span>
        )}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: secondaryColor }}
      />
    </div>
  );
}

export default function BadgeGenerator() {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [template, setTemplate] = useState<BadgeTemplate>("simple");
  const [badgeSize, setBadgeSize] = useState<BadgeSize>("standard");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [fontSize, setFontSize] = useState(18);
  const [primaryColor, setPrimaryColor] = useState("#330311");
  const [secondaryColor, setSecondaryColor] = useState("#8B1538");
  const [showQR, setShowQR] = useState(true);
  const [filterGroup, setFilterGroup] = useState("all");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: events, isLoading: eventsLoading } = useQuery<EventItem[]>({
    queryKey: ["/api/events"],
  });

  const { data: guests, isLoading: guestsLoading } = useQuery<Guest[]>({
    queryKey: ["/api/events", selectedEventId, "guests"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/events/${selectedEventId}/guests`, {
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load guests");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const filteredGuests = (guests || []).filter((g) => {
    if (filterGroup === "all") return true;
    if (filterGroup === "vip") return g.group?.toLowerCase() === "vip";
    return g.group === filterGroup;
  });

  const groups = Array.from(new Set((guests || []).map((g) => g.group).filter(Boolean))) as string[];

  // Badge colour by guest group
  const getBadgeColor = (group: string | null): string => {
    const g = (group || "").toLowerCase();
    if (g === "vip") return "#D4AF37";
    if (g === "speaker") return "#1E40AF";
    if (g === "staff") return "#166534";
    return "#330311"; // General — dark red (default)
  };

  const handleDownloadPDF = async () => {
    const printContent = printRef.current;
    if (!printContent || filteredGuests.length === 0) return;

    const eventItem = (events || []).find((e) => e.id === selectedEventId);
    const eventName = eventItem?.name || "Event";
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `EventPerfekt-Badges-${eventName.replace(/\s+/g, "-")}-${dateStr}.pdf`;

    // A6 = 105mm × 148mm
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a6" });
    const pageW = 105;
    const pageH = 148;
    const badgeW = (pageW - 15) / 2; // 2 per row with margins
    const badgeH = 60;
    const marginX = 5;
    const marginY = 5;
    const gapX = 5;
    const gapY = 5;

    let col = 0;
    let row = 0;
    let firstPage = true;

    for (let i = 0; i < filteredGuests.length; i++) {
      const guest = filteredGuests[i];
      const x = marginX + col * (badgeW + gapX);
      const y = marginY + row * (badgeH + gapY);

      // Check if we need a new page
      if (y + badgeH > pageH - marginY) {
        pdf.addPage();
        col = 0;
        row = 0;
        firstPage = false;
      }

      // Draw badge background
      const color = getBadgeColor(guest.group);
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      pdf.setFillColor(r, g, b);
      pdf.rect(x, y, badgeW, 3, "F"); // top colour bar

      pdf.setFillColor(255, 255, 255);
      pdf.rect(x, y + 3, badgeW, badgeH - 3, "F"); // white body

      pdf.setDrawColor(200, 200, 200);
      pdf.rect(x, y, badgeW, badgeH, "S"); // border

      // Guest name
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(r, g, b);
      const name = `${guest.firstName} ${guest.lastName}`;
      pdf.text(name, x + badgeW / 2, y + 14, { align: "center" });

      // Group / role
      if (guest.group) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(guest.group, x + badgeW / 2, y + 21, { align: "center" });
      }

      // Table
      if (guest.tableAssignment) {
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Table: ${guest.tableAssignment}`, x + badgeW / 2, y + 27, { align: "center" });
      }

      // Event name
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(r, g, b);
      pdf.text(eventName, x + badgeW / 2, y + badgeH - 6, { align: "center" });

      // Bottom colour bar
      pdf.setFillColor(r, g, b);
      pdf.rect(x, y + badgeH - 3, badgeW, 3, "F");

      col++;
      if (col >= 2) { col = 0; row++; }
    }

    pdf.save(filename);
  };

  const handleDownloadSingleBadge = async (guest: Guest, idx: number) => {
    const badgeEl = printRef.current?.querySelectorAll(".badge-card")[idx] as HTMLElement;
    if (!badgeEl) return;

    const { default: html2canvas } = await import("html2canvas");
    const { default: jsPDF } = await import("jspdf");
    const canvas = await html2canvas(badgeEl, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a6" });
    const pageW = 148;
    const pageH = 105;
    const imgRatio = canvas.width / canvas.height;
    const pdfW = Math.min(pageW - 10, (pageH - 10) * imgRatio);
    const pdfH = pdfW / imgRatio;

    pdf.addImage(imgData, "PNG", (pageW - pdfW) / 2, (pageH - pdfH) / 2, pdfW, pdfH);
    pdf.save(`Badge-${guest.firstName}-${guest.lastName}.pdf`);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const badgeW = badgeSize === "standard" ? (orientation === "landscape" ? 336 : 192) : (orientation === "landscape" ? 384 : 288);
    const badgeH = badgeSize === "standard" ? (orientation === "landscape" ? 192 : 336) : (orientation === "landscape" ? 288 : 384);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Event Badges</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Poppins', 'Segoe UI', sans-serif; }
          .print-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            padding: 12px;
            justify-content: center;
          }
          .badge-card {
            width: ${badgeW}px;
            height: ${badgeH}px;
            border: 1px dashed #ccc;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            background: white;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .badge-card { border: 1px dashed #ccc; }
          }
        </style>
      </head>
      <body>
        <div class="print-grid">
          ${printContent.innerHTML}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#16213e] via-[#1a1a2e] to-[#0f3460]">
      <PlannerSidebar />
      <main className="flex-1 lg:ml-60 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <BadgeCheck className="h-8 w-8 text-[#8B1538]" />
                Badge & Name Tag Generator
              </h1>
              <p className="text-gray-400 mt-1">Generate printable name badges for your event guests</p>
            </div>
            {filteredGuests.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={handleDownloadPDF}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download All Badges (PDF)
                </Button>
                <Button
                  onClick={handlePrint}
                  className="bg-[#8B1538] hover:bg-[#6d1029] text-white gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print ({filteredGuests.length})
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm">Select Event</Label>
                  {eventsLoading ? (
                    <div className="flex items-center gap-2 text-gray-400 mt-1">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                  ) : (
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                        <SelectValue placeholder="Choose event" />
                      </SelectTrigger>
                      <SelectContent>
                        {(events || []).map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label className="text-gray-300 text-sm">Badge Template</Label>
                  <Select value={template} onValueChange={(v) => setTemplate(v as BadgeTemplate)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple (Name + Table)</SelectItem>
                      <SelectItem value="formal">Formal (Name + Title + Group)</SelectItem>
                      <SelectItem value="conference">Conference (Name + Group + QR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 text-sm">Badge Size</Label>
                  <Select value={badgeSize} onValueChange={(v) => setBadgeSize(v as BadgeSize)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (3.5" × 2")</SelectItem>
                      <SelectItem value="large">Large (4" × 3")</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 text-sm">Orientation</Label>
                  <Select value={orientation} onValueChange={(v) => setOrientation(v as Orientation)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Landscape</SelectItem>
                      <SelectItem value="portrait">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 text-sm">Font Size ({fontSize}px)</Label>
                  <Input
                    type="range"
                    min={12}
                    max={28}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300 text-sm">Primary</Label>
                    <Input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 mt-1 cursor-pointer"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Accent</Label>
                    <Input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-10 mt-1 cursor-pointer"
                    />
                  </div>
                </div>

                {template === "conference" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showQR"
                      checked={showQR}
                      onChange={(e) => setShowQR(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="showQR" className="text-gray-300 text-sm cursor-pointer">
                      Show QR Code placeholder
                    </Label>
                  </div>
                )}

                {groups.length > 0 && (
                  <div>
                    <Label className="text-gray-300 text-sm">Filter by Group</Label>
                    <Select value={filterGroup} onValueChange={setFilterGroup}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Groups</SelectItem>
                        <SelectItem value="vip">VIP Only</SelectItem>
                        {groups.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-3 space-y-4">
              {!selectedEventId ? (
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardContent className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Users className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg">Select an event to generate badges</p>
                    <p className="text-sm mt-1">Choose from the settings panel on the left</p>
                  </CardContent>
                </Card>
              ) : guestsLoading ? (
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardContent className="flex items-center justify-center py-20 text-gray-400">
                    <Loader2 className="h-8 w-8 animate-spin mr-3" />
                    Loading guest list...
                  </CardContent>
                </Card>
              ) : filteredGuests.length === 0 ? (
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardContent className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Users className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg">No guests found</p>
                    <p className="text-sm mt-1">Add guests to this event first</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-gray-300">
                      <Eye className="h-5 w-5" />
                      <span className="font-medium">Preview ({filteredGuests.length} badges)</span>
                    </div>
                  </div>

                  <div
                    ref={printRef}
                    className="flex flex-wrap gap-6 justify-center p-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm"
                  >
                    {filteredGuests.map((guest, idx) => (
                      <div key={guest.id} className="flex flex-col items-center gap-2">
                        <BadgeCard
                          guest={guest}
                          template={template}
                          badgeSize={badgeSize}
                          orientation={orientation}
                          fontSize={fontSize}
                          primaryColor={getBadgeColor(guest.group) !== "#330311" ? getBadgeColor(guest.group) : primaryColor}
                          secondaryColor={secondaryColor}
                          showQR={showQR}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white gap-1 text-xs"
                          onClick={() => handleDownloadSingleBadge(guest, idx)}
                        >
                          <Download className="h-3 w-3" /> Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
