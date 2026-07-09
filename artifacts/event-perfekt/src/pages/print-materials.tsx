import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Printer,
  CreditCard,
  Hash,
  UtensilsCrossed,
  ArrowRight,
  ListOrdered,
  Loader2,
} from "lucide-react";
import PlannerLayout from "@/components/PlannerLayout";

interface Guest {
  id: number;
  name: string;
  tableNumber?: string | number;
  dietaryRestrictions?: string;
  mealChoice?: string;
  category?: string;
}

interface EventData {
  id: number;
  name: string;
  date?: string;
  venue?: string;
}

const FONT_OPTIONS = [
  { value: "Poppins", label: "Poppins" },
  { value: "Georgia", label: "Georgia (Serif)" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Great Vibes", label: "Great Vibes (Script)" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond" },
  { value: "Lora", label: "Lora" },
];

const BORDER_STYLES = [
  { value: "none", label: "None" },
  { value: "solid", label: "Solid" },
  { value: "double", label: "Double" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];

const DEFAULT_SIGNS = [
  "Reception →",
  "Ceremony →",
  "Restrooms →",
  "Parking →",
  "Photo Booth →",
  "Bar →",
  "Dance Floor →",
  "Exit →",
];

export default function PrintMaterials() {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("place-cards");
  const [fontFamily, setFontFamily] = useState("Poppins");
  const [primaryColor, setPrimaryColor] = useState("#8B1538");
  const [secondaryColor, setSecondaryColor] = useState("#16213e");
  const [borderStyle, setBorderStyle] = useState("double");
  const [menuItems, setMenuItems] = useState<string>(
    "Starter: Butternut Squash Soup (V)\nMain: Grilled Salmon with Asparagus\nMain (V): Wild Mushroom Risotto (V)\nDessert: Chocolate Fondant\nDessert (GF): Fresh Fruit Platter (GF)"
  );
  const [programItems, setProgramItems] = useState<string>(
    "4:00 PM — Guest Arrival & Welcome Drinks\n4:30 PM — Ceremony Begins\n5:00 PM — Cocktail Hour\n6:00 PM — Dinner Service\n7:30 PM — Speeches & Toasts\n8:00 PM — First Dance\n8:30 PM — Party & Dancing\n11:00 PM — Send Off"
  );
  const [selectedSigns, setSelectedSigns] = useState<string[]>(DEFAULT_SIGNS.slice(0, 4));
  const [customSign, setCustomSign] = useState("");
  const [tableCount, setTableCount] = useState(10);

  const { data: events = [], isLoading: eventsLoading } = useQuery<EventData[]>({
    queryKey: ["/api/events"],
  });

  const { data: guests = [], isLoading: guestsLoading } = useQuery<Guest[]>({
    queryKey: ["/api/events", selectedEventId, "guests"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${selectedEventId}/guests`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const handlePrint = () => {
    window.print();
  };

  const addCustomSign = () => {
    if (customSign.trim()) {
      setSelectedSigns([...selectedSigns, customSign.trim()]);
      setCustomSign("");
    }
  };

  const removeSign = (index: number) => {
    setSelectedSigns(selectedSigns.filter((_, i) => i !== index));
  };

  const toggleDefaultSign = (sign: string) => {
    if (selectedSigns.includes(sign)) {
      setSelectedSigns(selectedSigns.filter((s) => s !== sign));
    } else {
      setSelectedSigns([...selectedSigns, sign]);
    }
  };

  const selectedEvent = events.find((e: any) => String(e.id) === selectedEventId);

  return (
    <PlannerLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print { display: none !important; }
          .print-page-break { page-break-after: always; }
          .print-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="p-6 space-y-6 no-print">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white font-['Poppins']">
              Print Materials Generator
            </h1>
            <p className="text-white/60 mt-1">
              Generate elegant printable materials for your events
            </p>
          </div>
          <Button
            onClick={handlePrint}
            className="bg-[#8B1538] hover:bg-[#6d1029] text-white"
            disabled={!selectedEventId && activeTab !== "signage" && activeTab !== "table-numbers"}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Materials
          </Button>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label className="text-white/70">Select Event</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Choose event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(events as any[]).map((event: any) => (
                      <SelectItem key={event.id} value={String(event.id)}>
                        {event.name || event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Font</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 p-1 bg-white/10 border-white/20 cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white/70">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-12 h-10 p-1 bg-white/10 border-white/20 cursor-pointer"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white/70">Border Style</Label>
                <Select value={borderStyle} onValueChange={setBorderStyle}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BORDER_STYLES.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/10 border border-white/20">
            <TabsTrigger value="place-cards" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <CreditCard className="w-4 h-4 mr-2" />
              Place Cards
            </TabsTrigger>
            <TabsTrigger value="table-numbers" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <Hash className="w-4 h-4 mr-2" />
              Table Numbers
            </TabsTrigger>
            <TabsTrigger value="menu-cards" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Menu Cards
            </TabsTrigger>
            <TabsTrigger value="signage" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <ArrowRight className="w-4 h-4 mr-2" />
              Signage
            </TabsTrigger>
            <TabsTrigger value="program" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <ListOrdered className="w-4 h-4 mr-2" />
              Program Card
            </TabsTrigger>
          </TabsList>

          <TabsContent value="place-cards" className="mt-6">
            <PlaceCardsConfig />
          </TabsContent>
          <TabsContent value="table-numbers" className="mt-6">
            <TableNumbersConfig
              tableCount={tableCount}
              setTableCount={setTableCount}
            />
          </TabsContent>
          <TabsContent value="menu-cards" className="mt-6">
            <MenuCardsConfig menuItems={menuItems} setMenuItems={setMenuItems} />
          </TabsContent>
          <TabsContent value="signage" className="mt-6">
            <SignageConfig
              selectedSigns={selectedSigns}
              toggleDefaultSign={toggleDefaultSign}
              customSign={customSign}
              setCustomSign={setCustomSign}
              addCustomSign={addCustomSign}
              removeSign={removeSign}
            />
          </TabsContent>
          <TabsContent value="program" className="mt-6">
            <ProgramConfig programItems={programItems} setProgramItems={setProgramItems} />
          </TabsContent>
        </Tabs>
      </div>

      {eventsLoading || guestsLoading ? (
        <div className="flex items-center justify-center p-12 no-print">
          <Loader2 className="w-8 h-8 animate-spin text-white/60" />
        </div>
      ) : null}

      <div className="print-area p-6">
        {activeTab === "place-cards" && (
          <PlaceCardsPrint
            guests={guests}
            fontFamily={fontFamily}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            borderStyle={borderStyle}
            eventName={selectedEvent?.name || ""}
          />
        )}
        {activeTab === "table-numbers" && (
          <TableNumbersPrint
            tableCount={tableCount}
            fontFamily={fontFamily}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            borderStyle={borderStyle}
            eventName={selectedEvent?.name || ""}
          />
        )}
        {activeTab === "menu-cards" && (
          <MenuCardsPrint
            menuItems={menuItems}
            fontFamily={fontFamily}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            borderStyle={borderStyle}
            eventName={selectedEvent?.name || ""}
          />
        )}
        {activeTab === "signage" && (
          <SignagePrint
            signs={selectedSigns}
            fontFamily={fontFamily}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            borderStyle={borderStyle}
            eventName={selectedEvent?.name || ""}
          />
        )}
        {activeTab === "program" && (
          <ProgramPrint
            programItems={programItems}
            fontFamily={fontFamily}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            borderStyle={borderStyle}
            eventName={selectedEvent?.name || ""}
            eventDate={selectedEvent?.date || ""}
            eventVenue={selectedEvent?.venue || ""}
          />
        )}
      </div>
    </PlannerLayout>
  );
}

function PlaceCardsConfig() {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Place Cards
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-white/60">
          Place cards will be generated automatically from your guest list. Each card displays
          the guest's name and table number in an elegant design. Select an event above to load guests.
        </p>
        <p className="text-white/40 text-sm mt-2">
          Dietary indicators: (V) Vegetarian, (VG) Vegan, (GF) Gluten Free, (H) Halal, (K) Kosher
        </p>
      </CardContent>
    </Card>
  );
}

function TableNumbersConfig({
  tableCount,
  setTableCount,
}: {
  tableCount: number;
  setTableCount: (n: number) => void;
}) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Table Numbers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-xs">
          <Label className="text-white/70">Number of Tables</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={tableCount}
            onChange={(e) => setTableCount(parseInt(e.target.value) || 1)}
            className="bg-white/10 border-white/20 text-white"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MenuCardsConfig({
  menuItems,
  setMenuItems,
}: {
  menuItems: string;
  setMenuItems: (s: string) => void;
}) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5" />
          Menu Cards
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Label className="text-white/70">Menu Items (one per line, use "Category: Item" format)</Label>
        <Textarea
          value={menuItems}
          onChange={(e) => setMenuItems(e.target.value)}
          rows={8}
          className="bg-white/10 border-white/20 text-white mt-2 font-mono"
          placeholder="Starter: Butternut Squash Soup (V)&#10;Main: Grilled Salmon"
        />
        <p className="text-white/40 text-sm mt-2">
          Add dietary tags in parentheses: (V) Vegetarian, (VG) Vegan, (GF) Gluten Free
        </p>
      </CardContent>
    </Card>
  );
}

function SignageConfig({
  selectedSigns,
  toggleDefaultSign,
  customSign,
  setCustomSign,
  addCustomSign,
  removeSign,
}: {
  selectedSigns: string[];
  toggleDefaultSign: (s: string) => void;
  customSign: string;
  setCustomSign: (s: string) => void;
  addCustomSign: () => void;
  removeSign: (i: number) => void;
}) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ArrowRight className="w-5 h-5" />
          Directional Signage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-white/70 mb-2 block">Quick Add Signs</Label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_SIGNS.map((sign) => (
              <Button
                key={sign}
                variant={selectedSigns.includes(sign) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleDefaultSign(sign)}
                className={
                  selectedSigns.includes(sign)
                    ? "bg-[#8B1538] hover:bg-[#6d1029] text-white"
                    : "border-white/20 text-white/60 hover:text-white"
                }
              >
                {sign}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white/70">Add Custom Sign</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={customSign}
              onChange={(e) => setCustomSign(e.target.value)}
              placeholder="e.g., VIP Lounge →"
              className="bg-white/10 border-white/20 text-white"
              onKeyDown={(e) => e.key === "Enter" && addCustomSign()}
            />
            <Button onClick={addCustomSign} className="bg-[#8B1538] hover:bg-[#6d1029]">
              Add
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-white/70 mb-2 block">Selected Signs ({selectedSigns.length})</Label>
          <div className="space-y-1">
            {selectedSigns.map((sign, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 rounded px-3 py-2">
                <span className="text-white">{sign}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSign(i)}
                  className="text-white/40 hover:text-red-400 h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgramConfig({
  programItems,
  setProgramItems,
}: {
  programItems: string;
  setProgramItems: (s: string) => void;
}) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ListOrdered className="w-5 h-5" />
          Program / Order of Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Label className="text-white/70">Program Items (one per line, use "Time — Activity" format)</Label>
        <Textarea
          value={programItems}
          onChange={(e) => setProgramItems(e.target.value)}
          rows={10}
          className="bg-white/10 border-white/20 text-white mt-2 font-mono"
          placeholder="4:00 PM — Guest Arrival"
        />
      </CardContent>
    </Card>
  );
}

function getDietaryIcon(text?: string): string {
  if (!text) return "";
  const lower = text.toLowerCase();
  const icons: string[] = [];
  if (lower.includes("vegetarian") || lower.includes("veg")) icons.push("🌱");
  if (lower.includes("vegan")) icons.push("🌿");
  if (lower.includes("gluten") || lower.includes("gf")) icons.push("🌾");
  if (lower.includes("halal")) icons.push("☪");
  if (lower.includes("kosher")) icons.push("✡");
  if (lower.includes("nut")) icons.push("🥜");
  return icons.join(" ");
}

function PlaceCardsPrint({
  guests,
  fontFamily,
  primaryColor,
  secondaryColor,
  borderStyle,
  eventName,
}: {
  guests: Guest[];
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  borderStyle: string;
  eventName: string;
}) {
  if (!guests.length) {
    return (
      <div className="text-center text-white/40 py-12 no-print">
        <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>No guests found. Select an event with guests to generate place cards.</p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-6"
      style={{ fontFamily }}
    >
      {guests.map((guest, i) => (
        <div
          key={guest.id || i}
          className="print-card flex flex-col items-center justify-center p-8 bg-white rounded-lg"
          style={{
            minHeight: "180px",
            border: borderStyle !== "none" ? `3px ${borderStyle} ${primaryColor}` : "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div
            className="w-16 mb-3"
            style={{ borderTop: `2px solid ${primaryColor}` }}
          />
          <h2
            className="text-2xl font-semibold text-center"
            style={{ color: secondaryColor }}
          >
            {guest.name}
          </h2>
          {guest.tableNumber && (
            <p className="text-sm mt-2 uppercase tracking-widest" style={{ color: primaryColor }}>
              Table {guest.tableNumber}
            </p>
          )}
          {guest.dietaryRestrictions && (
            <p className="text-xs mt-1 text-gray-500">
              {getDietaryIcon(guest.dietaryRestrictions)} {guest.dietaryRestrictions}
            </p>
          )}
          <div
            className="w-16 mt-3"
            style={{ borderTop: `2px solid ${primaryColor}` }}
          />
        </div>
      ))}
    </div>
  );
}

function TableNumbersPrint({
  tableCount,
  fontFamily,
  primaryColor,
  secondaryColor,
  borderStyle,
  eventName,
}: {
  tableCount: number;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  borderStyle: string;
  eventName: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-8" style={{ fontFamily }}>
      {Array.from({ length: tableCount }, (_, i) => i + 1).map((num) => (
        <div
          key={num}
          className="print-card print-page-break flex flex-col items-center justify-center p-12 bg-white rounded-lg"
          style={{
            minHeight: "300px",
            border: borderStyle !== "none" ? `4px ${borderStyle} ${primaryColor}` : "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <p
            className="text-sm uppercase tracking-[0.3em] mb-4"
            style={{ color: primaryColor }}
          >
            Table
          </p>
          <h1
            className="text-8xl font-bold"
            style={{ color: secondaryColor }}
          >
            {num}
          </h1>
          {eventName && (
            <p className="text-xs mt-6 uppercase tracking-widest text-gray-400">
              {eventName}
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <div className="w-8" style={{ borderTop: `2px solid ${primaryColor}` }} />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor, marginTop: "-3px" }} />
            <div className="w-8" style={{ borderTop: `2px solid ${primaryColor}` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuCardsPrint({
  menuItems,
  fontFamily,
  primaryColor,
  secondaryColor,
  borderStyle,
  eventName,
}: {
  menuItems: string;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  borderStyle: string;
  eventName: string;
}) {
  const lines = menuItems.split("\n").filter((l) => l.trim());
  const parsed = lines.map((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx > -1) {
      return {
        category: line.slice(0, colonIdx).trim(),
        item: line.slice(colonIdx + 1).trim(),
      };
    }
    return { category: "", item: line.trim() };
  });

  const grouped: Record<string, string[]> = {};
  parsed.forEach(({ category, item }) => {
    const key = category || "Menu";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  return (
    <div className="flex justify-center" style={{ fontFamily }}>
      <div
        className="print-card bg-white rounded-lg p-10 max-w-md w-full text-center"
        style={{
          border: borderStyle !== "none" ? `3px ${borderStyle} ${primaryColor}` : "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          minHeight: "500px",
        }}
      >
        <div className="flex justify-center mb-4">
          <div className="flex gap-2 items-center">
            <div className="w-12" style={{ borderTop: `2px solid ${primaryColor}` }} />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor, marginTop: "-1px" }} />
            <div className="w-12" style={{ borderTop: `2px solid ${primaryColor}` }} />
          </div>
        </div>

        <h2
          className="text-sm uppercase tracking-[0.3em] mb-1"
          style={{ color: primaryColor }}
        >
          Menu
        </h2>
        {eventName && (
          <p className="text-xs text-gray-400 mb-6">{eventName}</p>
        )}

        {Object.entries(grouped).map(([category, items], idx) => (
          <div key={idx} className="mb-6">
            <h3
              className="text-xs uppercase tracking-[0.2em] mb-2 font-semibold"
              style={{ color: primaryColor }}
            >
              {category}
            </h3>
            {items.map((item, j) => {
              const hasDietary = /\((V|VG|GF|H|K)\)/i.test(item);
              return (
                <p
                  key={j}
                  className="text-sm mb-1"
                  style={{ color: secondaryColor }}
                >
                  {item}
                  {hasDietary && (
                    <span className="text-xs text-gray-400 ml-1">
                      {getDietaryIcon(item)}
                    </span>
                  )}
                </p>
              );
            })}
          </div>
        ))}

        <div className="flex justify-center mt-6">
          <div className="flex gap-2 items-center">
            <div className="w-12" style={{ borderTop: `2px solid ${primaryColor}` }} />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor, marginTop: "-1px" }} />
            <div className="w-12" style={{ borderTop: `2px solid ${primaryColor}` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SignagePrint({
  signs,
  fontFamily,
  primaryColor,
  secondaryColor,
  borderStyle,
  eventName,
}: {
  signs: string[];
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  borderStyle: string;
  eventName: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-8" style={{ fontFamily }}>
      {signs.map((sign, i) => (
        <div
          key={i}
          className="print-card print-page-break flex flex-col items-center justify-center p-16 bg-white rounded-lg"
          style={{
            minHeight: "300px",
            border: borderStyle !== "none" ? `4px ${borderStyle} ${primaryColor}` : "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <h1
            className="text-5xl font-bold text-center"
            style={{ color: secondaryColor }}
          >
            {sign}
          </h1>
          {eventName && (
            <p className="text-sm mt-8 uppercase tracking-widest text-gray-400">
              {eventName}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function ProgramPrint({
  programItems,
  fontFamily,
  primaryColor,
  secondaryColor,
  borderStyle,
  eventName,
  eventDate,
  eventVenue,
}: {
  programItems: string;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  borderStyle: string;
  eventName: string;
  eventDate: string;
  eventVenue: string;
}) {
  const lines = programItems.split("\n").filter((l) => l.trim());
  const parsed = lines.map((line) => {
    const dashIdx = line.indexOf("—");
    const hyphenIdx = line.indexOf("-");
    const splitIdx = dashIdx > -1 ? dashIdx : hyphenIdx;
    if (splitIdx > -1) {
      return {
        time: line.slice(0, splitIdx).trim(),
        activity: line.slice(splitIdx + 1).trim(),
      };
    }
    return { time: "", activity: line.trim() };
  });

  return (
    <div className="flex justify-center" style={{ fontFamily }}>
      <div
        className="print-card bg-white rounded-lg p-10 max-w-lg w-full"
        style={{
          border: borderStyle !== "none" ? `3px ${borderStyle} ${primaryColor}` : "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          minHeight: "600px",
        }}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex gap-2 items-center">
              <div className="w-12" style={{ borderTop: `2px solid ${primaryColor}` }} />
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor, marginTop: "-1px" }} />
              <div className="w-12" style={{ borderTop: `2px solid ${primaryColor}` }} />
            </div>
          </div>
          <h2
            className="text-sm uppercase tracking-[0.3em] mb-1"
            style={{ color: primaryColor }}
          >
            Order of Events
          </h2>
          {eventName && (
            <h1
              className="text-2xl font-bold mt-2"
              style={{ color: secondaryColor }}
            >
              {eventName}
            </h1>
          )}
          {(eventDate || eventVenue) && (
            <p className="text-xs text-gray-400 mt-1">
              {eventDate && new Date(eventDate).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {eventDate && eventVenue && " • "}
              {eventVenue}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {parsed.map((item, i) => (
            <div key={i} className="flex items-start gap-4">
              {item.time && (
                <span
                  className="text-sm font-semibold whitespace-nowrap min-w-[80px] text-right"
                  style={{ color: primaryColor }}
                >
                  {item.time}
                </span>
              )}
              <div
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-sm" style={{ color: secondaryColor }}>
                {item.activity}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <div className="flex gap-2 items-center">
            <div className="w-12" style={{ borderTop: `2px solid ${primaryColor}` }} />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor, marginTop: "-1px" }} />
            <div className="w-12" style={{ borderTop: `2px solid ${primaryColor}` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
