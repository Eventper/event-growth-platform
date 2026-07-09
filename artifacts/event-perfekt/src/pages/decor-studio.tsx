import { useState, useRef, useCallback, useEffect, useMemo, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Palette, Grid3X3, Trash2, RotateCw, ZoomIn, ZoomOut,
  Save, Undo, Plus, X, Sparkles, Navigation, Box, ExternalLink, RotateCcw, Eye,
  Wand2, Download, Check, AlertCircle, DollarSign, Loader2, Star, ArrowLeft
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Text, Grid, Environment } from "@react-three/drei";
import * as THREE from "three";

type FloorElement = {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  seats?: number;
};

const ELEMENT_LIBRARY = [
  { type: "round_table", label: "Round Table", icon: "⬤", width: 60, height: 60, color: "#8B6F47", seats: 8 },
  { type: "rect_table", label: "Long Table", icon: "▬", width: 100, height: 40, color: "#8B6F47", seats: 10 },
  { type: "square_table", label: "Square Table", icon: "■", width: 50, height: 50, color: "#8B6F47", seats: 4 },
  { type: "head_table", label: "Head Table", icon: "♛", width: 140, height: 35, color: "#6B4226", seats: 12 },
  { type: "stage", label: "Stage", icon: "🎤", width: 160, height: 80, color: "#4A154B" },
  { type: "dance_floor", label: "Dance Floor", icon: "💃", width: 140, height: 140, color: "#1B3A5C" },
  { type: "dj_booth", label: "DJ Booth", icon: "🎵", width: 60, height: 40, color: "#2D1B69" },
  { type: "bar", label: "Bar", icon: "🍸", width: 100, height: 35, color: "#5D3A1A" },
  { type: "buffet", label: "Buffet Station", icon: "🍽", width: 120, height: 40, color: "#3D5A1A" },
  { type: "cake_table", label: "Cake Table", icon: "🎂", width: 50, height: 50, color: "#C4A882" },
  { type: "photo_booth", label: "Photo Booth", icon: "📸", width: 70, height: 70, color: "#8B1538" },
  { type: "gift_table", label: "Gift Table", icon: "🎁", width: 70, height: 40, color: "#B8860B" },
  { type: "entrance", label: "Entrance", icon: "🚪", width: 50, height: 20, color: "#2E8B57" },
  { type: "exit", label: "Exit", icon: "🚪", width: 50, height: 20, color: "#DC143C" },
  { type: "flower_arch", label: "Flower Arch", icon: "🌸", width: 60, height: 20, color: "#FF69B4" },
  { type: "lounge", label: "Lounge Area", icon: "🛋", width: 100, height: 80, color: "#556B2F" },
  { type: "speakers", label: "Speakers", icon: "🔊", width: 30, height: 30, color: "#333333" },
  { type: "restroom", label: "Restroom Sign", icon: "🚻", width: 40, height: 40, color: "#4682B4" },
  { type: "custom", label: "Custom Zone", icon: "✏️", width: 80, height: 60, color: "#708090" },
];

const VENUE_SHAPES = [
  { id: "rectangle", label: "Rectangle Hall" },
  { id: "l_shape", label: "L-Shaped" },
  { id: "round", label: "Round / Tent" },
  { id: "outdoor", label: "Outdoor / Garden" },
];

const PRESET_PALETTES = [
  { name: "Classic Elegance", colors: ["#330311", "#C4A882", "#FAF8F5", "#1B2838", "#FFFFFF"] },
  { name: "Blush Romance", colors: ["#F4C2C2", "#FFB6C1", "#FFF0F5", "#8B4513", "#FFFFFF"] },
  { name: "Garden Fresh", colors: ["#2E8B57", "#90EE90", "#F5FFFA", "#8B6914", "#FFFFFF"] },
  { name: "Royal Navy", colors: ["#1B2838", "#4169E1", "#F0F8FF", "#C4A882", "#FFFFFF"] },
  { name: "Sunset Gold", colors: ["#B8860B", "#FFD700", "#FFF8DC", "#8B4513", "#FFFFFF"] },
  { name: "Tropical Vibes", colors: ["#FF6347", "#FF4500", "#FFDAB9", "#2E8B57", "#FFFFFF"] },
  { name: "Lavender Dream", colors: ["#6A5ACD", "#E6E6FA", "#F8F8FF", "#9370DB", "#FFFFFF"] },
  { name: "Monochrome", colors: ["#000000", "#333333", "#666666", "#CCCCCC", "#FFFFFF"] },
  { name: "Autumn Harvest", colors: ["#8B4513", "#D2691E", "#F4A460", "#2E8B57", "#FFF8DC"] },
  { name: "Icy Blue", colors: ["#4682B4", "#87CEEB", "#F0FFFF", "#708090", "#FFFFFF"] },
];

const DECOR_STYLES = [
  "Classic / Traditional", "Modern Minimalist", "Rustic / Boho", "Glamorous / Luxury",
  "Art Deco", "Tropical", "Industrial Chic", "Vintage", "Mediterranean", "Contemporary African",
  "Garden / Botanical", "Nautical / Coastal", "Fairy Tale / Whimsical", "Cultural / Heritage",
  "Black Tie / Formal", "Outdoor / Natural",
];

const DECOR_THEMES = [
  "Enchanted Garden", "Starry Night", "Old Hollywood", "Masquerade Ball",
  "Great Gatsby", "Winter Wonderland", "Under the Sea", "Parisian Elegance",
  "Royal Court", "Safari Sunset", "Cherry Blossom", "Moroccan Nights",
  "Carnival", "Midnight in Paris", "Tuscan Villa", "Arabian Nights",
];

let nextId = 1;

function FloorPlanDesigner({ eventId }: { eventId: string }) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<FloorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [venueShape, setVenueShape] = useState("rectangle");
  const [showGrid, setShowGrid] = useState(true);
  const [history, setHistory] = useState<FloorElement[][]>([]);
  const [planName, setPlanName] = useState("Main Floor Plan");
  const [saving, setSaving] = useState(false);
  const [dragState, setDragState] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const { data: savedPlans } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "floor-plans"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/floor-plans`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  useEffect(() => {
    if (savedPlans && savedPlans.length > 0) {
      const latest = savedPlans[savedPlans.length - 1];
      if (latest.planData && Array.isArray(latest.planData)) {
        setElements(latest.planData);
        setPlanName(latest.name || "Main Floor Plan");
      }
    }
  }, [savedPlans]);

  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-30), elements.map(e => ({ ...e }))]);
  }, [elements]);

  const addElement = (template: typeof ELEMENT_LIBRARY[0]) => {
    pushHistory();
    const newEl: FloorElement = {
      id: `el_${Date.now()}_${nextId++}`,
      type: template.type,
      label: template.label,
      x: 250 + Math.random() * 200,
      y: 150 + Math.random() * 200,
      width: template.width,
      height: template.height,
      rotation: 0,
      color: template.color,
      seats: template.seats,
    };
    setElements(prev => [...prev, newEl]);
    setSelectedId(newEl.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    pushHistory();
    setElements(prev => prev.filter(e => e.id !== selectedId));
    setSelectedId(null);
  };

  const rotateSelected = () => {
    if (!selectedId) return;
    pushHistory();
    setElements(prev => prev.map(e =>
      e.id === selectedId ? { ...e, rotation: (e.rotation + 45) % 360 } : e
    ));
  };

  const duplicateSelected = () => {
    if (!selectedId) return;
    const el = elements.find(e => e.id === selectedId);
    if (!el) return;
    pushHistory();
    const newEl = { ...el, id: `el_${Date.now()}_${nextId++}`, x: el.x + 30, y: el.y + 30 };
    setElements(prev => [...prev, newEl]);
    setSelectedId(newEl.id);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setElements(prev);
    setSelectedId(null);
  };

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = elements.find(el => el.id === id);
    if (!el) return;
    setSelectedId(id);
    const coords = getCanvasCoords(e.clientX, e.clientY);
    setDragState({
      id,
      offsetX: coords.x - el.x,
      offsetY: coords.y - el.y,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    e.preventDefault();
    const coords = getCanvasCoords(e.clientX, e.clientY);
    let newX = coords.x - dragState.offsetX;
    let newY = coords.y - dragState.offsetY;

    if (showGrid) {
      newX = Math.round(newX / 20) * 20;
      newY = Math.round(newY / 20) * 20;
    }

    newX = Math.max(5, Math.min(780, newX));
    newY = Math.max(5, Math.min(580, newY));

    setElements(prev => prev.map(el =>
      el.id === dragState.id ? { ...el, x: newX, y: newY } : el
    ));
  };

  const handlePointerUp = () => {
    if (dragState) pushHistory();
    setDragState(null);
  };

  const savePlan = async () => {
    setSaving(true);
    try {
      await fetch(`/api/events/${eventId}/floor-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planName,
          venueSection: "main",
          planData: elements,
          capacity: elements.reduce((s, e) => s + (e.seats || 0), 0),
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "floor-plans"] });
      toast({ title: "Floor plan saved", description: `${elements.length} elements saved to database.` });
    } catch {
      toast({ title: "Save failed", description: "Could not save floor plan.", variant: "destructive" });
    }
    setSaving(false);
  };

  const loadPlan = (plan: any) => {
    if (plan.planData && Array.isArray(plan.planData)) {
      pushHistory();
      setElements(plan.planData);
      setPlanName(plan.name || "Floor Plan");
      toast({ title: "Loaded", description: `Loaded "${plan.name}" with ${plan.planData.length} elements.` });
    }
  };

  const clearAll = () => {
    pushHistory();
    setElements([]);
    setSelectedId(null);
  };

  const renderVenueOutline = () => {
    const style = { fill: "none", stroke: "#ddd", strokeWidth: 2, strokeDasharray: "8 4" };
    switch (venueShape) {
      case "l_shape":
        return <path d="M 20 20 L 500 20 L 500 300 L 780 300 L 780 580 L 20 580 Z" {...style} />;
      case "round":
        return <ellipse cx="400" cy="300" rx="370" ry="270" {...style} />;
      case "outdoor":
        return <rect x="20" y="20" width="760" height="560" rx="20" stroke="#90EE90" strokeWidth={2} strokeDasharray="8 4" fill="none" />;
      default:
        return <rect x="20" y="20" width="760" height="560" {...style} />;
    }
  };

  const totalSeats = elements.reduce((s, e) => s + (e.seats || 0), 0);
  const tableCount = elements.filter(e => e.type.includes("table") && !["cake_table", "gift_table"].includes(e.type)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Input
          value={planName}
          onChange={e => setPlanName(e.target.value)}
          className="w-48 bg-white text-gray-900 border-gray-200 text-sm"
          placeholder="Plan name..."
        />
        <Select value={venueShape} onValueChange={setVenueShape}>
          <SelectTrigger className="w-[150px] bg-white text-gray-900 border-gray-200 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VENUE_SHAPES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setShowGrid(!showGrid)} className="text-gray-700 border-gray-200 text-xs">
          <Grid3X3 className="w-3.5 h-3.5 mr-1" /> Grid {showGrid ? "On" : "Off"}
        </Button>
        <Button variant="outline" size="sm" onClick={undo} disabled={history.length === 0} className="text-gray-700 border-gray-200 text-xs">
          <Undo className="w-3.5 h-3.5 mr-1" /> Undo
        </Button>
        {selectedId && (
          <>
            <Button variant="outline" size="sm" onClick={rotateSelected} className="text-gray-700 border-gray-200 text-xs">
              <RotateCw className="w-3.5 h-3.5 mr-1" /> Rotate
            </Button>
            <Button variant="outline" size="sm" onClick={duplicateSelected} className="text-gray-700 border-gray-200 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Duplicate
            </Button>
            <Button variant="outline" size="sm" onClick={deleteSelected} className="text-red-600 border-red-200 hover:bg-red-50 text-xs">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={clearAll} className="text-gray-500 border-gray-200 text-xs">
          Clear All
        </Button>
        <div className="ml-auto">
          <Button size="sm" onClick={savePlan} disabled={saving} className="bg-[#330311] hover:bg-[#4a0418] text-white text-xs">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Save to Database
          </Button>
        </div>
      </div>

      <div className="flex gap-2 text-xs text-gray-500 font-medium">
        <Badge variant="outline" className="text-[10px]">{elements.length} elements</Badge>
        <Badge variant="outline" className="text-[10px]">{tableCount} tables</Badge>
        <Badge variant="outline" className="text-[10px]">{totalSeats} seats</Badge>
      </div>

      <div className="flex gap-4">
        <div className="w-44 flex-shrink-0 space-y-0.5 max-h-[520px] overflow-y-auto pr-1 border-r border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Drag from library</p>
          {ELEMENT_LIBRARY.map(template => (
            <button
              key={template.type}
              onClick={() => addElement(template)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 hover:bg-gray-100 active:bg-gray-200 transition-colors group"
            >
              <span className="text-sm w-5 text-center">{template.icon}</span>
              <span className="text-gray-700 flex-1 truncate">{template.label}</span>
              {template.seats && <span className="text-[9px] text-gray-400 group-hover:text-gray-600">{template.seats}p</span>}
            </button>
          ))}
        </div>

        <div
          ref={containerRef}
          className="flex-1 border-2 border-gray-200 rounded-xl overflow-hidden bg-white relative select-none"
          style={{ aspectRatio: "800/600" }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <svg
            viewBox="0 0 800 600"
            className="w-full h-full"
            onClick={() => setSelectedId(null)}
          >
            <rect width="800" height="600" fill="#FAFAFA" />

            {showGrid && (
              <g opacity="0.08">
                {Array.from({ length: 41 }).map((_, i) => (
                  <line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={600} stroke="#666" strokeWidth={0.5} />
                ))}
                {Array.from({ length: 31 }).map((_, i) => (
                  <line key={`h${i}`} x1={0} y1={i * 20} x2={800} y2={i * 20} stroke="#666" strokeWidth={0.5} />
                ))}
              </g>
            )}

            {renderVenueOutline()}

            {elements.map(el => {
              const isSelected = el.id === selectedId;
              const isDragging = dragState?.id === el.id;
              const isRound = el.type === "round_table" || el.type === "cake_table";

              return (
                <g
                  key={el.id}
                  transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation}, ${el.width / 2}, ${el.height / 2})`}
                  onPointerDown={(e) => handlePointerDown(el.id, e)}
                  style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
                >
                  {isRound ? (
                    <ellipse
                      cx={el.width / 2} cy={el.height / 2}
                      rx={el.width / 2} ry={el.height / 2}
                      fill={el.color}
                      stroke={isSelected ? "#FF6B35" : "rgba(0,0,0,0.15)"}
                      strokeWidth={isSelected ? 3 : 1}
                      opacity={isDragging ? 0.7 : 0.9}
                      filter={isSelected ? "url(#shadow)" : undefined}
                    />
                  ) : (
                    <rect
                      width={el.width} height={el.height}
                      rx={el.type === "dance_floor" ? 6 : el.type === "lounge" ? 10 : 3}
                      fill={el.color}
                      stroke={isSelected ? "#FF6B35" : "rgba(0,0,0,0.15)"}
                      strokeWidth={isSelected ? 3 : 1}
                      opacity={isDragging ? 0.7 : 0.9}
                      filter={isSelected ? "url(#shadow)" : undefined}
                    />
                  )}

                  <text
                    x={el.width / 2} y={el.height / 2 + (el.seats ? -4 : 0)}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize={Math.min(11, el.width / 7)} fontWeight="600"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {el.label.length > 14 ? el.label.slice(0, 12) + ".." : el.label}
                  </text>

                  {el.seats && (
                    <text
                      x={el.width / 2} y={el.height / 2 + 10}
                      textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {el.seats} seats
                    </text>
                  )}

                  {isRound && el.seats && (
                    <>
                      {Array.from({ length: Math.min(el.seats, 12) }).map((_, i) => {
                        const angle = (i / Math.min(el.seats!, 12)) * Math.PI * 2 - Math.PI / 2;
                        const cx = el.width / 2 + Math.cos(angle) * (el.width / 2 + 10);
                        const cy = el.height / 2 + Math.sin(angle) * (el.height / 2 + 10);
                        return <circle key={i} cx={cx} cy={cy} r={4.5} fill={el.color} opacity={0.4} style={{ pointerEvents: "none" }} />;
                      })}
                    </>
                  )}

                  {isSelected && (
                    <>
                      <rect x={-5} y={-5} width={10} height={10} fill="#FF6B35" rx={2} style={{ pointerEvents: "none" }} />
                      <rect x={el.width - 5} y={-5} width={10} height={10} fill="#FF6B35" rx={2} style={{ pointerEvents: "none" }} />
                      <rect x={-5} y={el.height - 5} width={10} height={10} fill="#FF6B35" rx={2} style={{ pointerEvents: "none" }} />
                      <rect x={el.width - 5} y={el.height - 5} width={10} height={10} fill="#FF6B35" rx={2} style={{ pointerEvents: "none" }} />
                    </>
                  )}
                </g>
              );
            })}

            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.3)" />
              </filter>
            </defs>
          </svg>
        </div>
      </div>

      {savedPlans && savedPlans.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Saved Plans</p>
          <div className="flex flex-wrap gap-2">
            {savedPlans.map((plan: any) => (
              <button
                key={plan.id}
                onClick={() => loadPlan(plan)}
                className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg hover:border-[#8B1538] hover:bg-white transition-all text-gray-700"
              >
                <span className="font-medium">{plan.name}</span>
                {plan.capacity && <span className="text-gray-400 ml-1">({plan.capacity} seats)</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center">
        Click element in library to add. Drag elements on canvas to reposition. Click to select, then rotate / duplicate / delete. Saved plans persist to the database.
      </p>
    </div>
  );
}

function ColorPaletteDesigner({ eventId, eventColors, onSaved }: { eventId: string; eventColors: string[]; onSaved: () => void }) {
  const { toast } = useToast();
  const [colors, setColors] = useState<string[]>(eventColors.length > 0 ? eventColors : ["#330311", "#C4A882", "#FFFFFF", "#1B2838", "#FAF8F5"]);
  const [newColor, setNewColor] = useState("#8B1538");
  const [saving, setSaving] = useState(false);

  const addColor = () => {
    if (colors.length >= 8) return;
    setColors(prev => [...prev, newColor]);
  };

  const removeColor = (index: number) => {
    setColors(prev => prev.filter((_, i) => i !== index));
  };

  const applyPreset = (preset: typeof PRESET_PALETTES[0]) => {
    setColors([...preset.colors]);
  };

  const savePalette = async () => {
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/events/${eventId}`, { preferredColors: colors });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Palette saved", description: `${colors.length} colours saved to event.` });
      onSaved();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-semibold text-gray-700 mb-3 block">Your Event Palette</Label>
        <div className="flex flex-wrap gap-3 mb-4">
          {colors.map((color, i) => (
            <div key={i} className="group relative">
              <div
                className="w-16 h-16 rounded-xl shadow-md border-2 border-white cursor-pointer transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
              />
              <button
                onClick={() => removeColor(i)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              <p className="text-[10px] text-gray-500 text-center mt-1 uppercase">{color}</p>
            </div>
          ))}
          {colors.length < 8 && (
            <div className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                className="w-16 h-16 rounded-xl cursor-pointer border-2 border-dashed border-gray-300 bg-transparent"
              />
              <button onClick={addColor} className="text-[10px] text-[#8B1538] font-semibold hover:underline flex items-center gap-0.5">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl h-14" style={{ background: `linear-gradient(to right, ${colors.join(", ")})` }}>
          <span className="text-white text-sm font-medium drop-shadow-lg">Gradient Preview</span>
        </div>

        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={savePalette} disabled={saving} className="bg-[#330311] hover:bg-[#4a0418] text-white">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Save Palette
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold text-gray-700 mb-3 block">Preset Palettes</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {PRESET_PALETTES.map(preset => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="p-3 rounded-xl border border-gray-200 hover:border-[#8B1538] hover:shadow-md transition-all text-left"
            >
              <div className="flex gap-1 mb-2">
                {preset.colors.map((c, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />
                ))}
              </div>
              <p className="text-xs font-medium text-gray-700">{preset.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FloorElement3D({ element, scale, isSelected, onSelect }: { element: FloorElement; scale: number; isSelected?: boolean; onSelect?: () => void }) {
  const x = (element.x - 400) * scale;
  const z = (element.y - 300) * scale;
  const w = element.width * scale;
  const d = element.height * scale;
  const rotation = (element.rotation * Math.PI) / 180;
  const color = element.color;
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const getHeight = () => {
    switch (element.type) {
      case "stage": return 0.6;
      case "dance_floor": return 0.05;
      case "bar": return 1.0;
      case "buffet": return 0.8;
      case "dj_booth": return 1.2;
      case "speakers": return 1.4;
      case "flower_arch": return 2.2;
      case "entrance": case "exit": return 2.5;
      case "restroom": return 0.02;
      case "lounge": return 0.5;
      case "photo_booth": return 2.0;
      default: return 0.75;
    }
  };

  const h = getHeight();
  const isRound = element.type === "round_table" || element.type === "cake_table";
  const isTable = element.type.includes("table") || element.type === "head_table";
  const activeColor = isSelected ? "#ff4444" : hovered ? new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.3).getHexString() : color;

  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      {isRound ? (
        <mesh
          ref={meshRef}
          castShadow
          receiveShadow
          position={[0, h / 2, 0]}
          onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <cylinderGeometry args={[w / 2, w / 2, h, 32]} />
          <meshStandardMaterial color={activeColor} roughness={0.5} metalness={0.15} />
        </mesh>
      ) : element.type === "dance_floor" ? (
        <group>
          <mesh receiveShadow position={[0, h / 2, 0]}
            onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
          >
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={activeColor} roughness={0.2} metalness={0.6} />
          </mesh>
          {Array.from({ length: 4 }).map((_, row) =>
            Array.from({ length: 4 }).map((_, col) => (
              <mesh key={`tile_${row}_${col}`} position={[
                (col - 1.5) * (w / 4), h + 0.001, (row - 1.5) * (d / 4)
              ]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[w / 4.2, d / 4.2]} />
                <meshStandardMaterial
                  color={(row + col) % 2 === 0 ? "#2a4a7a" : "#1B3A5C"}
                  roughness={0.15} metalness={0.7} emissive={(row + col) % 2 === 0 ? "#1a2a4a" : "#0a1a3a"} emissiveIntensity={0.15}
                />
              </mesh>
            ))
          )}
        </group>
      ) : (
        <mesh
          ref={meshRef}
          castShadow
          receiveShadow
          position={[0, h / 2, 0]}
          onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={activeColor} roughness={0.5} metalness={0.15} />
        </mesh>
      )}

      {element.type === "stage" && (
        <group>
          <mesh position={[0, h + 0.02, 0]}>
            <boxGeometry args={[w * 0.95, 0.04, d * 0.95]} />
            <meshStandardMaterial color="#5a1f5f" roughness={0.3} metalness={0.4} />
          </mesh>
          <pointLight position={[0, h + 1.5, 0]} intensity={0.8} color="#e8c4ff" distance={4} />
          {[-1, 0, 1].map(i => (
            <mesh key={`slight_${i}`} position={[i * (w * 0.3), h + 2.0, -d * 0.3]}>
              <cylinderGeometry args={[0.04, 0.08, 0.15, 8]} />
              <meshStandardMaterial color="#333" metalness={0.8} />
            </mesh>
          ))}
        </group>
      )}

      {element.type === "dj_booth" && (
        <group>
          <mesh position={[0, h + 0.15, 0]}>
            <boxGeometry args={[w * 0.6, 0.08, d * 0.4]} />
            <meshStandardMaterial color="#1a0a3a" metalness={0.7} roughness={0.2} />
          </mesh>
          <pointLight position={[0, h + 0.5, 0]} intensity={0.5} color="#7733ff" distance={3} />
        </group>
      )}

      {isTable && element.seats && Array.from({ length: Math.min(element.seats, 16) }).map((_, i) => {
        const count = Math.min(element.seats!, 16);
        if (isRound) {
          const angle = (i / count) * Math.PI * 2;
          const radius = w / 2 + 0.18;
          const chairX = Math.cos(angle) * radius;
          const chairZ = Math.sin(angle) * radius;
          return (
            <group key={i} position={[chairX, 0, chairZ]} rotation={[0, -angle + Math.PI, 0]}>
              <mesh position={[0, 0.22, 0]} castShadow>
                <boxGeometry args={[0.14, 0.04, 0.14]} />
                <meshStandardMaterial color="#6b5b4a" roughness={0.7} />
              </mesh>
              <mesh position={[-0.055, 0.11, 0]} castShadow>
                <boxGeometry args={[0.03, 0.22, 0.03]} />
                <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
              </mesh>
              <mesh position={[0.055, 0.11, 0]} castShadow>
                <boxGeometry args={[0.03, 0.22, 0.03]} />
                <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
              </mesh>
              <mesh position={[-0.055, 0.11, 0.055]} castShadow>
                <boxGeometry args={[0.03, 0.22, 0.03]} />
                <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
              </mesh>
              <mesh position={[0.055, 0.11, 0.055]} castShadow>
                <boxGeometry args={[0.03, 0.22, 0.03]} />
                <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.35, -0.06]} castShadow>
                <boxGeometry args={[0.14, 0.22, 0.02]} />
                <meshStandardMaterial color="#6b5b4a" roughness={0.7} />
              </mesh>
            </group>
          );
        } else {
          const perSide = Math.ceil(count / 2);
          const side = i < perSide ? -1 : 1;
          const idx = i < perSide ? i : i - perSide;
          const spacing = d / (perSide + 1);
          const chairX = side * (w / 2 + 0.18);
          const chairZ = -d / 2 + spacing * (idx + 1);
          return (
            <group key={i} position={[chairX, 0, chairZ]} rotation={[0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
              <mesh position={[0, 0.22, 0]} castShadow>
                <boxGeometry args={[0.14, 0.04, 0.14]} />
                <meshStandardMaterial color="#6b5b4a" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.35, -0.06]} castShadow>
                <boxGeometry args={[0.14, 0.22, 0.02]} />
                <meshStandardMaterial color="#6b5b4a" roughness={0.7} />
              </mesh>
            </group>
          );
        }
      })}

      {element.type === "bar" && (
        <group>
          {[-0.3, 0, 0.3].map((offset, i) => (
            <mesh key={`stool_${i}`} position={[offset * w, 0.3, d / 2 + 0.15]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 0.6, 12]} />
              <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
          {[-0.3, 0, 0.3].map((offset, i) => (
            <mesh key={`top_${i}`} position={[offset * w, 0.62, d / 2 + 0.15]}>
              <cylinderGeometry args={[0.1, 0.1, 0.04, 12]} />
              <meshStandardMaterial color="#444" metalness={0.5} roughness={0.3} />
            </mesh>
          ))}
        </group>
      )}

      {element.type === "flower_arch" && (
        <group>
          <mesh position={[-w / 2 + 0.03, h / 2, 0]} castShadow>
            <boxGeometry args={[0.06, h, 0.06]} />
            <meshStandardMaterial color="#8B6F47" roughness={0.6} />
          </mesh>
          <mesh position={[w / 2 - 0.03, h / 2, 0]} castShadow>
            <boxGeometry args={[0.06, h, 0.06]} />
            <meshStandardMaterial color="#8B6F47" roughness={0.6} />
          </mesh>
          <mesh position={[0, h + 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[w / 2, 0.06, 8, 24, Math.PI]} />
            <meshStandardMaterial color="#FF69B4" roughness={0.4} />
          </mesh>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI;
            const fx = Math.cos(angle) * (w / 2) * 0.95;
            const fy = h + 0.3 + Math.sin(angle) * 0.06;
            return (
              <mesh key={`flower_${i}`} position={[fx, fy, 0]}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshStandardMaterial color={i % 2 === 0 ? "#FFB6C1" : "#FF69B4"} roughness={0.6} />
              </mesh>
            );
          })}
        </group>
      )}

      {(element.type === "entrance" || element.type === "exit") && (
        <group>
          <mesh position={[-w / 2 + 0.03, h / 2, 0]} castShadow>
            <boxGeometry args={[0.06, h, 0.06]} />
            <meshStandardMaterial color="#666" metalness={0.4} />
          </mesh>
          <mesh position={[w / 2 - 0.03, h / 2, 0]} castShadow>
            <boxGeometry args={[0.06, h, 0.06]} />
            <meshStandardMaterial color="#666" metalness={0.4} />
          </mesh>
          <mesh position={[0, h - 0.03, 0]} castShadow>
            <boxGeometry args={[w - 0.06, 0.06, 0.06]} />
            <meshStandardMaterial color="#666" metalness={0.4} />
          </mesh>
        </group>
      )}

      {element.type === "speakers" && (
        <group>
          <mesh position={[0, h * 0.6, 0]} castShadow>
            <boxGeometry args={[w * 0.8, h * 0.6, d * 0.8]} />
            <meshStandardMaterial color="#222" metalness={0.3} roughness={0.7} />
          </mesh>
          <mesh position={[0, h * 0.6, d * 0.41]}>
            <circleGeometry args={[w * 0.25, 16]} />
            <meshStandardMaterial color="#555" metalness={0.6} />
          </mesh>
        </group>
      )}

      <Text
        position={[0, h + (isTable ? 0.6 : 0.3), 0]}
        fontSize={0.12}
        color={isSelected ? "#ff4444" : "#555"}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#fff"
      >
        {element.label}
        {element.seats ? ` (${element.seats})` : ""}
      </Text>

      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(w, d) * 0.7, Math.max(w, d) * 0.75, 32]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

function VenueFloor({ venueShape, scale }: { venueShape: string; scale: number }) {
  const floorW = 800 * scale;
  const floorD = 600 * scale;

  return (
    <group>
      {venueShape === "round" ? (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
            <circleGeometry args={[Math.min(floorW, floorD) / 2, 48]} />
            <meshStandardMaterial color="#f5f0eb" roughness={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <ringGeometry args={[Math.min(floorW, floorD) / 2 - 0.02, Math.min(floorW, floorD) / 2 + 0.02, 48]} />
            <meshStandardMaterial color="#c4a882" roughness={0.6} />
          </mesh>
        </group>
      ) : venueShape === "outdoor" ? (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
            <planeGeometry args={[floorW * 1.3, floorD * 1.3]} />
            <meshStandardMaterial color="#7cba5a" roughness={0.95} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
            <planeGeometry args={[floorW, floorD]} />
            <meshStandardMaterial color="#e8dcc8" roughness={0.85} />
          </mesh>
        </group>
      ) : (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
            <planeGeometry args={[floorW, floorD]} />
            <meshStandardMaterial color="#f5f0eb" roughness={0.85} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
            <planeGeometry args={[floorW - 0.3, floorD - 0.3]} />
            <meshStandardMaterial color="#ece4da" roughness={0.9} />
          </mesh>
        </group>
      )}

      {(venueShape === "rectangle" || venueShape === "l_shape") && (
        <group>
          <mesh position={[0, 1.5, -floorD / 2]} castShadow>
            <boxGeometry args={[floorW, 3, 0.1]} />
            <meshStandardMaterial color="#e8e0d8" transparent opacity={0.35} roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.5, floorD / 2]} castShadow>
            <boxGeometry args={[floorW, 3, 0.1]} />
            <meshStandardMaterial color="#e8e0d8" transparent opacity={0.35} roughness={0.6} />
          </mesh>
          <mesh position={[-floorW / 2, 1.5, 0]} castShadow>
            <boxGeometry args={[0.1, 3, floorD]} />
            <meshStandardMaterial color="#e8e0d8" transparent opacity={0.35} roughness={0.6} />
          </mesh>
          <mesh position={[floorW / 2, 1.5, 0]} castShadow>
            <boxGeometry args={[0.1, 3, floorD]} />
            <meshStandardMaterial color="#e8e0d8" transparent opacity={0.35} roughness={0.6} />
          </mesh>

          <mesh position={[0, 3.0, -floorD / 2 + 0.04]}>
            <boxGeometry args={[floorW * 0.6, 0.04, 0.04]} />
            <meshStandardMaterial color="#c4a882" metalness={0.3} roughness={0.5} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function CameraController() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(5, 7, 9);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

function Scene3D({ elements, venueShape, selectedId, onSelectElement }: { elements: FloorElement[]; venueShape: string; selectedId: string | null; onSelectElement: (id: string | null) => void }) {
  const scale = 1 / 120;

  return (
    <>
      <PerspectiveCamera makeDefault position={[5, 7, 9]} fov={50} />
      <CameraController />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0, 0]}
        enableDamping={true}
        dampingFactor={0.08}
      />

      <color attach="background" args={["#e8e4e0"]} />
      <fog attach="fog" args={["#e8e4e0", 15, 30]} />

      <ambientLight intensity={0.45} />
      <directionalLight
        position={[8, 12, 5]}
        intensity={0.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-5, 8, -3]} intensity={0.25} />
      <hemisphereLight color="#fdfaf7" groundColor="#d4c4b0" intensity={0.5} />
      <pointLight position={[0, 5, 0]} intensity={0.2} color="#fff5e6" />

      <VenueFloor venueShape={venueShape} scale={scale} />

      {elements.map(el => (
        <FloorElement3D
          key={el.id}
          element={el}
          scale={scale}
          isSelected={selectedId === el.id}
          onSelect={() => onSelectElement(selectedId === el.id ? null : el.id)}
        />
      ))}

      <Grid
        args={[20, 20]}
        position={[0, 0.001, 0]}
        cellSize={0.5}
        cellThickness={0.3}
        cellColor="#d0c8c0"
        sectionSize={2}
        sectionThickness={0.6}
        sectionColor="#b8b0a8"
        fadeDistance={15}
        fadeStrength={1.5}
        infiniteGrid={false}
      />
    </>
  );
}

const DEMO_ELEMENTS: FloorElement[] = [
  { id: "demo_1", type: "stage", label: "Main Stage", x: 400, y: 80, width: 180, height: 80, rotation: 0, color: "#4A154B" },
  { id: "demo_2", type: "dance_floor", label: "Dance Floor", x: 400, y: 220, width: 140, height: 120, rotation: 0, color: "#1B3A5C" },
  { id: "demo_3", type: "round_table", label: "Table 1", x: 150, y: 350, width: 55, height: 55, rotation: 0, color: "#8B6F47", seats: 8 },
  { id: "demo_4", type: "round_table", label: "Table 2", x: 300, y: 400, width: 55, height: 55, rotation: 0, color: "#8B6F47", seats: 8 },
  { id: "demo_5", type: "round_table", label: "Table 3", x: 500, y: 400, width: 55, height: 55, rotation: 0, color: "#8B6F47", seats: 8 },
  { id: "demo_6", type: "round_table", label: "Table 4", x: 650, y: 350, width: 55, height: 55, rotation: 0, color: "#8B6F47", seats: 8 },
  { id: "demo_7", type: "head_table", label: "Head Table", x: 400, y: 520, width: 150, height: 35, rotation: 0, color: "#6B4226", seats: 12 },
  { id: "demo_8", type: "bar", label: "Bar", x: 720, y: 120, width: 100, height: 35, rotation: 0, color: "#5D3A1A" },
  { id: "demo_9", type: "dj_booth", label: "DJ Booth", x: 200, y: 100, width: 55, height: 40, rotation: 0, color: "#2D1B69" },
  { id: "demo_10", type: "entrance", label: "Entrance", x: 400, y: 585, width: 60, height: 20, rotation: 0, color: "#2E8B57" },
  { id: "demo_11", type: "flower_arch", label: "Flower Arch", x: 400, y: 555, width: 60, height: 20, rotation: 0, color: "#FF69B4" },
  { id: "demo_12", type: "buffet", label: "Buffet", x: 80, y: 150, width: 100, height: 35, rotation: 0, color: "#3D5A1A" },
  { id: "demo_13", type: "photo_booth", label: "Photo Booth", x: 720, y: 450, width: 65, height: 65, rotation: 0, color: "#8B1538" },
  { id: "demo_14", type: "cake_table", label: "Cake Table", x: 80, y: 500, width: 50, height: 50, rotation: 0, color: "#C4A882" },
];

function ThreeDViewer({ eventId }: { eventId: string }) {
  const [venueShape, setVenueShape] = useState("rectangle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [localElements, setLocalElements] = useState<FloorElement[]>([]);
  const { toast } = useToast();

  const { data: savedPlans, isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "floor-plans"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/floor-plans`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const savedElements: FloorElement[] = useMemo(() => {
    if (savedPlans && savedPlans.length > 0) {
      const latest = savedPlans[savedPlans.length - 1];
      if (latest.planData && Array.isArray(latest.planData)) {
        return latest.planData;
      }
    }
    return [];
  }, [savedPlans]);

  useEffect(() => {
    if (savedElements.length > 0) {
      setLocalElements(savedElements);
      setShowDemo(false);
    }
  }, [savedElements]);

  const displayElements = showDemo ? DEMO_ELEMENTS : localElements;
  const totalSeats = displayElements.reduce((s, e) => s + (e.seats || 0), 0);
  const selectedElement = selectedId ? displayElements.find(e => e.id === selectedId) : null;

  const addElementTo3D = (template: typeof ELEMENT_LIBRARY[0]) => {
    if (showDemo) return;
    const newEl: FloorElement = {
      id: `el3d_${Date.now()}_${nextId++}`,
      type: template.type,
      label: template.label,
      x: 250 + Math.random() * 300,
      y: 150 + Math.random() * 300,
      width: template.width,
      height: template.height,
      rotation: 0,
      color: template.color,
      seats: template.seats,
    };
    setLocalElements(prev => [...prev, newEl]);
    setSelectedId(newEl.id);
  };

  const removeSelected = () => {
    if (!selectedId || showDemo) return;
    setLocalElements(prev => prev.filter(e => e.id !== selectedId));
    setSelectedId(null);
  };

  const save3DPlan = async () => {
    if (showDemo || localElements.length === 0) return;
    try {
      await fetch(`/api/events/${eventId}/floor-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "3D Floor Plan",
          venueSection: "main",
          planData: localElements,
          capacity: totalSeats,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "floor-plans"] });
      toast({ title: "Saved", description: `Floor plan saved with ${localElements.length} elements.` });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <Select value={venueShape} onValueChange={setVenueShape}>
          <SelectTrigger className="w-[160px] bg-white text-gray-900 border-gray-200 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VENUE_SHAPES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Badge variant="outline" className="text-[10px]">{displayElements.length} elements</Badge>
          <Badge variant="outline" className="text-[10px]">{totalSeats} seats</Badge>
          {showDemo && <Badge className="bg-amber-100 text-amber-800 text-[10px]">Demo Mode</Badge>}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {!showDemo && localElements.length > 0 && (
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={save3DPlan}>
              <Save className="w-3 h-3 mr-1" /> Save Plan
            </Button>
          )}
          {selectedId && !showDemo && (
            <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50" onClick={removeSelected}>
              <Trash2 className="w-3 h-3 mr-1" /> Remove
            </Button>
          )}
          <Button
            size="sm"
            variant={showDemo ? "default" : "outline"}
            className={`text-xs h-7 ${showDemo ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
            onClick={() => { setShowDemo(!showDemo); setSelectedId(null); }}
          >
            <Eye className="w-3 h-3 mr-1" /> {showDemo ? "Exit Demo" : "Preview Demo"}
          </Button>
        </div>
      </div>

      {!showDemo && (
        <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <span className="text-[10px] font-semibold text-gray-500 uppercase w-full mb-1">Quick Add Elements</span>
          {ELEMENT_LIBRARY.slice(0, 12).map(template => (
            <button
              key={template.type}
              onClick={() => addElementTo3D(template)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-gray-200 bg-white hover:border-[#8B1538] hover:text-[#8B1538] transition-colors"
            >
              <span>{template.icon}</span>
              <span>{template.label}</span>
            </button>
          ))}
        </div>
      )}

      {displayElements.length === 0 && !plansLoading ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <Box className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No floor plan elements yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Add elements using the quick-add toolbar above, or design in the Floor Plan tab first.</p>
          <Button size="sm" variant="outline" onClick={() => setShowDemo(true)} className="text-xs">
            <Eye className="w-3 h-3 mr-1" /> Preview Demo Scene
          </Button>
        </div>
      ) : plansLoading ? (
        <div className="border-2 border-gray-200 rounded-xl overflow-hidden flex items-center justify-center" style={{ height: "550px", backgroundColor: "#f9fafb" }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B1538] mx-auto mb-3"></div>
            <p className="text-sm text-gray-600 font-medium">Loading 3D visualization...</p>
            <p className="text-xs text-gray-400 mt-1">{displayElements.length > 15 ? "Large floor plan may take a moment" : ""}</p>
          </div>
        </div>
      ) : (
        <div className="border-2 border-gray-200 rounded-xl overflow-hidden" style={{ height: "550px" }}>
          <Canvas shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}>
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}>
              <Scene3D
                elements={displayElements}
                venueShape={venueShape}
                selectedId={selectedId}
                onSelectElement={setSelectedId}
              />
            </Suspense>
          </Canvas>
        </div>
      )}

      {selectedElement && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedElement.color }} />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">{selectedElement.label}</p>
            <p className="text-xs text-gray-500">
              {selectedElement.type.replace(/_/g, " ")}
              {selectedElement.seats ? ` — ${selectedElement.seats} seats` : ""}
              {` — Position: (${Math.round(selectedElement.x)}, ${Math.round(selectedElement.y)})`}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">{selectedElement.type}</Badge>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Click + drag to rotate</span>
        <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Scroll to zoom</span>
        <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> Right-click + drag to pan</span>
        <span className="flex items-center gap-1">Click an element to select it</span>
      </div>

      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B1538] to-[#330311] flex items-center justify-center shrink-0 mt-0.5">
            <ExternalLink className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Need more advanced 3D design?</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Use Homestyler for professional-grade 3D interior design with realistic rendering, furniture libraries, and walkthrough views.
            </p>
            <a
              href="https://www.homestyler.com/int/floorplan"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-[#330311] text-white text-xs font-medium rounded-lg hover:bg-[#4a0418] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Homestyler 3D Designer
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

type MoodBoardItem = {
  title: string;
  description: string;
  tags: string[];
  category: string;
};

type DecorPlanItem = {
  category: string;
  item: string;
  priority: "essential" | "recommended" | "optional";
  description: string;
  colorMatch: number;
  styleMatch: number;
  estimatedCost: number;
  notes: string;
};

type ColorAnalysis = {
  primaryPalette: string[];
  complementaryColors: string[];
  accentColors: string[];
  neutrals: string[];
  avoidColors: string[];
  paletteDescription: string;
};

type AIDecorResult = {
  moodBoard: MoodBoardItem[];
  decorPlan: DecorPlanItem[];
  colorAnalysis: ColorAnalysis;
  styleNotes: string;
};

function AIDecorAgent({ eventId, event }: { eventId: string; event: any }) {
  const { toast } = useToast();
  const [result, setResult] = useState<AIDecorResult | null>(null);
  const [activeTab, setActiveTab] = useState<"analysis" | "moodboard" | "plan">("analysis");

  const eventColors = useMemo(() => {
    const colors: string[] = [];
    if (event?.preferredColors && Array.isArray(event.preferredColors)) {
      colors.push(...event.preferredColors);
    }
    if (colors.length === 0) {
      colors.push("#8B1538", "#FFD700");
    }
    return colors;
  }, [event]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai-decor/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: event?.type || "private",
          eventName: event?.name || "Event",
          colors: eventColors,
          style: event?.decorStyle || "Classic Elegance",
          theme: event?.decorTheme || "Elegant",
          budget: event?.budget || "5000",
          currency: event?.currency || "$",
          guestCount: event?.guestCount || 100,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to generate");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Agent Decor Plan Generated", description: "Your personalised mood board and decor plan are ready." });
    },
    onError: (err: any) => {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    },
  });

  const totalCost = result?.decorPlan?.reduce((s, item) => s + (item.estimatedCost || 0), 0) || 0;
  const essentialCount = result?.decorPlan?.filter(i => i.priority === "essential").length || 0;
  const recommendedCount = result?.decorPlan?.filter(i => i.priority === "recommended").length || 0;
  const optionalCount = result?.decorPlan?.filter(i => i.priority === "optional").length || 0;

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "primary": return "🎨";
      case "accent": return "✨";
      case "texture": return "🧵";
      case "floral": return "🌸";
      case "lighting": return "💡";
      default: return "🎯";
    }
  };

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case "essential": return "bg-red-50 text-red-700 border-red-200";
      case "recommended": return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const exportPlan = () => {
    if (!result) return;
    const lines = [
      `AGENT VENUE DECOR PLAN - ${event?.name || "Event"}`,
      `Generated by Event Perfekt Agent Decor Agent`,
      `${"=".repeat(50)}`,
      "",
      `STYLE NOTES:`,
      result.styleNotes,
      "",
      `COLOR ANALYSIS:`,
      result.colorAnalysis.paletteDescription,
      `Primary: ${result.colorAnalysis.primaryPalette.join(", ")}`,
      `Complementary: ${result.colorAnalysis.complementaryColors.join(", ")}`,
      `Accents: ${result.colorAnalysis.accentColors.join(", ")}`,
      "",
      `DECOR PLAN:`,
      `${"─".repeat(50)}`,
    ];
    result.decorPlan.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.item} (${item.category})`);
      lines.push(`   Priority: ${item.priority} | Cost: ${event?.currency || "$"}${item.estimatedCost}`);
      lines.push(`   Color Match: ${item.colorMatch}% | Style Match: ${item.styleMatch}%`);
      lines.push(`   ${item.description}`);
      lines.push("");
    });
    lines.push(`TOTAL ESTIMATED COST: ${event?.currency || "$"}${totalCost.toLocaleString()}`);
    lines.push(`\n${essentialCount} essential, ${recommendedCount} recommended, ${optionalCount} optional items`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decor-plan-${event?.name || "event"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex gap-1.5">
          {(["analysis", "moodboard", "plan"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab
                  ? "bg-[#330311] text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-[#8B1538]"
              }`}
            >
              {tab === "analysis" ? "Color Analysis" : tab === "moodboard" ? "Mood Board" : "Decor Plan"}
            </button>
          ))}
        </div>
      </div>

      <Card className="border-[#8B1538]/20 bg-gradient-to-br from-white to-[#faf5f7]">
        <CardContent className="pt-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B1538] to-[#330311] flex items-center justify-center shrink-0">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Agent Decor Agent</h4>
              <p className="text-xs text-gray-500 mt-0.5">Intelligent Mood Board & Decor Planning</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Event Colours & Theme</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 uppercase font-medium">Primary Colours (from event form)</span>
                  <div className="flex gap-1.5">
                    {eventColors.map((color, i) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded border border-gray-100">
                        <div className="w-5 h-5 rounded-md border border-gray-200 shadow-inner" style={{ backgroundColor: color }} />
                        <span className="text-[10px] font-mono text-gray-600">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {result?.colorAnalysis && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Auto-Detected Palette</p>
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase mb-1">Complementary</p>
                      <div className="flex gap-1">
                        {result.colorAnalysis.complementaryColors.map((c, i) => (
                          <div key={i} className="w-6 h-6 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: c }} title={c} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase mb-1">Accents</p>
                      <div className="flex gap-1">
                        {result.colorAnalysis.accentColors.map((c, i) => (
                          <div key={i} className="w-6 h-6 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: c }} title={c} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase mb-1">Neutrals</p>
                      <div className="flex gap-1">
                        {result.colorAnalysis.neutrals.map((c, i) => (
                          <div key={i} className="w-6 h-6 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: c }} title={c} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 italic">{result.colorAnalysis.paletteDescription}</p>
                </div>
              )}
            </div>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="w-full bg-gradient-to-r from-[#8B1538] to-[#330311] hover:from-[#a01d45] hover:to-[#4a0418] text-white shadow-md"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Mood Board & Decor Plan...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  {result ? "Regenerate" : "Generate"} Mood Board & Decor Plan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generateMutation.isPending && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="w-5 h-5 border-2 border-[#8B1538] border-t-transparent rounded-full animate-spin" />
            Analysing colours, generating mood board and decor recommendations...
          </div>
          <Progress value={45} className="h-1.5" />
        </div>
      )}

      {result && activeTab === "analysis" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#8B1538]" />
                Color Analysis
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">Smart palette detection</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Primary Palette</p>
                <div className="flex gap-2">
                  {result.colorAnalysis.primaryPalette.map((c, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div className="w-14 h-14 rounded-xl border-2 border-white shadow-md" style={{ backgroundColor: c }} />
                      <span className="text-[10px] font-mono text-gray-500">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Complementary</p>
                <div className="flex gap-2">
                  {result.colorAnalysis.complementaryColors.map((c, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div className="w-14 h-14 rounded-xl border-2 border-white shadow-md" style={{ backgroundColor: c }} />
                      <span className="text-[10px] font-mono text-gray-500">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Accent Colours</p>
                <div className="flex gap-1.5">
                  {result.colorAnalysis.accentColors.map((c, i) => (
                    <div key={i} className="w-10 h-10 rounded-lg border border-white shadow-sm" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Neutrals</p>
                <div className="flex gap-1.5">
                  {result.colorAnalysis.neutrals.map((c, i) => (
                    <div key={i} className="w-10 h-10 rounded-lg border border-white shadow-sm" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
              </div>
            </div>

            {result.colorAnalysis.avoidColors?.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-[10px] font-semibold text-red-500 uppercase mb-2">Colours to Avoid</p>
                <div className="flex gap-1.5">
                  {result.colorAnalysis.avoidColors.map((c, i) => (
                    <div key={i} className="w-8 h-8 rounded-lg border-2 border-red-200 relative" style={{ backgroundColor: c }}>
                      <X className="w-4 h-4 text-red-500 absolute inset-0 m-auto" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-gray-600 italic leading-relaxed p-3 bg-gradient-to-r from-[#faf5f7] to-white rounded-lg border border-[#8B1538]/10">
              {result.styleNotes}
            </p>
          </CardContent>
        </Card>
      )}

      {result && activeTab === "moodboard" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#8B1538]" />
                Agent-Generated Mood Board
              </CardTitle>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={exportPlan}>
                <Download className="w-3 h-3 mr-1" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.moodBoard.map((item, i) => {
                const gradients: Record<string, string> = {
                  primary: "from-[#8B1538]/10 to-[#330311]/5",
                  accent: "from-amber-50 to-yellow-50",
                  texture: "from-stone-50 to-neutral-100",
                  floral: "from-pink-50 to-rose-50",
                  lighting: "from-yellow-50 to-orange-50",
                };
                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border border-gray-100 bg-gradient-to-br ${gradients[item.category] || "from-gray-50 to-white"} hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-sm text-gray-900">{item.title}</h5>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{item.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.map((tag, ti) => (
                            <Badge key={ti} variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-white/60">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {result && activeTab === "plan" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-5 h-5 text-[#8B1538]" />
                Agent Venue Decor Plan
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#330311] text-white text-xs">
                  Estimated Total: {event?.currency || "$"}{totalCost.toLocaleString()}
                </Badge>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={exportPlan}>
                  <Download className="w-3 h-3 mr-1" /> Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {result.decorPlan.map((item, i) => (
                <div key={i} className={`p-4 rounded-xl border ${getPriorityStyle(item.priority)} hover:shadow-sm transition-shadow`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">{item.category}</span>
                      </div>
                      <h5 className="font-semibold text-gray-900">{item.item}</h5>
                      <Badge variant="outline" className={`text-[10px] mt-1 ${
                        item.priority === "essential" ? "border-red-300 text-red-700" :
                        item.priority === "recommended" ? "border-blue-300 text-blue-700" :
                        "border-gray-300 text-gray-600"
                      }`}>
                        {item.priority}
                      </Badge>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">{item.description}</p>

                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500">Color Match:</span>
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#8B1538]" style={{ width: `${item.colorMatch}%` }} />
                          </div>
                          <span className="text-[10px] font-medium text-gray-700">{item.colorMatch}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500">Style Match:</span>
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-amber-500" style={{ width: `${item.styleMatch}%` }} />
                          </div>
                          <span className="text-[10px] font-medium text-gray-700">{item.styleMatch}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gray-900">{event?.currency || "$"}{item.estimatedCost.toLocaleString()}</p>
                      <span className="text-[10px] text-gray-400">estimated</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gradient-to-r from-[#faf5f7] to-white rounded-xl border border-[#8B1538]/10">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Decor Plan Summary</p>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Badge variant="outline" className="border-red-200 text-red-700">{essentialCount} essential</Badge>
                <Badge variant="outline" className="border-blue-200 text-blue-700">{recommendedCount} recommended</Badge>
                <Badge variant="outline" className="border-gray-200 text-gray-600">{optionalCount} optional</Badge>
                <span className="text-gray-400">items</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#8B1538]" />
                <span className="text-lg font-bold text-gray-900">{event?.currency || "$"}{totalCost.toLocaleString()}</span>
                <span className="text-xs text-gray-500">Total Estimated Cost</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DecorStudio({ eventId, event }: { eventId: string; event: any }) {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<"floor_plan" | "palette" | "preferences" | "3d_view" | "ai_agent" | "homestyler">("floor_plan");
  const [decorStyle, setDecorStyle] = useState(event?.decorStyle || "");
  const [decorTheme, setDecorTheme] = useState(event?.decorTheme || "");
  const [colorTheme, setColorTheme] = useState(event?.colorTheme || "");
  const [decorNotes, setDecorNotes] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);

  const savePreferences = async () => {
    setSavingPrefs(true);
    try {
      await apiRequest("PATCH", `/api/events/${eventId}`, { decorStyle, decorTheme, colorTheme });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Preferences saved", description: "Decor style and theme updated." });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
    setSavingPrefs(false);
  };

  const sections = [
    { id: "floor_plan" as const, label: "Floor Plan", icon: <Grid3X3 className="w-4 h-4" /> },
    { id: "3d_view" as const, label: "3D View", icon: <Box className="w-4 h-4" /> },
    { id: "ai_agent" as const, label: "Agent Decor Agent", icon: <Wand2 className="w-4 h-4" /> },
    { id: "homestyler" as const, label: "Homestyler 3D", icon: <ExternalLink className="w-4 h-4" /> },
    { id: "palette" as const, label: "Colour Palette", icon: <Palette className="w-4 h-4" /> },
    { id: "preferences" as const, label: "Style & Theme", icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Decor & Design Studio</h3>
      </div>

      <div className="flex gap-2 mb-4">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSection === s.id
                ? "bg-[#330311] text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:border-[#8B1538] hover:text-[#8B1538]"
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {activeSection === "floor_plan" && (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">Interactive Floor Plan Designer</CardTitle>
            <p className="text-xs text-gray-500">Click elements to add them. Drag to reposition on the canvas. Your layout saves to the database.</p>
          </CardHeader>
          <CardContent>
            <FloorPlanDesigner eventId={eventId} />
          </CardContent>
        </Card>
      )}

      {activeSection === "3d_view" && (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900 flex items-center gap-2">
              <Box className="w-5 h-5 text-[#8B1538]" />
              3D Floor Plan Viewer
            </CardTitle>
            <p className="text-xs text-gray-500">See your floor plan layout in 3D. Rotate, zoom, and pan to explore the venue from any angle.</p>
          </CardHeader>
          <CardContent>
            <ThreeDViewer eventId={eventId} />
          </CardContent>
        </Card>
      )}

      {activeSection === "ai_agent" && (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-[#8B1538]" />
              Agent Decor Agent
            </CardTitle>
            <p className="text-xs text-gray-500">Agent-powered decor recommendations, mood boards, and venue styling plans tailored to your event.</p>
          </CardHeader>
          <CardContent>
            <AIDecorAgent eventId={eventId} event={event} />
          </CardContent>
        </Card>
      )}

      {activeSection === "homestyler" && (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-[#8B1538]" />
              Homestyler 3D Designer
            </CardTitle>
            <p className="text-xs text-gray-500">Professional-grade 3D interior design with realistic rendering, furniture libraries, and walkthrough views.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#330311] to-[#8B1538] p-8 text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-3">Design with Homestyler</h3>
                  <p className="text-white/80 text-sm leading-relaxed mb-6 max-w-lg">
                    Homestyler is a powerful 3D design tool that lets you create photorealistic venue layouts. 
                    Design your event space with drag-and-drop furniture, lighting, materials, and take virtual walkthroughs of your venue.
                  </p>
                  <div className="grid sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                      <div className="text-lg font-bold mb-1">Realistic Rendering</div>
                      <p className="text-xs text-white/70">Photorealistic 3D views of your venue design with real-world lighting and materials</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                      <div className="text-lg font-bold mb-1">Furniture Library</div>
                      <p className="text-xs text-white/70">Thousands of furniture items, decorations, and fixtures to furnish your event space</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                      <div className="text-lg font-bold mb-1">Virtual Walkthrough</div>
                      <p className="text-xs text-white/70">Walk through your venue design in first-person view before the event day</p>
                    </div>
                  </div>
                  <a
                    href="https://www.homestyler.com/int/floorplan"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#330311] font-semibold rounded-lg hover:bg-white/90 transition-colors shadow-lg"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Homestyler 3D Designer
                  </a>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <ArrowLeft className="w-4 h-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">Coming back to Event Perfekt</p>
                    <p className="text-xs text-blue-700 leading-relaxed">Homestyler opens in a new browser tab. When you're done designing, simply close that tab or click back on the Event Perfekt tab in your browser to return here. Your Homestyler project is saved to your Homestyler account automatically.</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Download className="w-4 h-4 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-900 mb-1">Saving & Exporting Your Design</p>
                    <p className="text-xs text-green-700 leading-relaxed mb-2">Homestyler automatically saves your work as you design. To export or share your finished design:</p>
                    <p className="text-xs text-green-700 leading-relaxed">
                      Click the Render button (camera icon) in Homestyler to generate high-quality images of your design. Download the rendered images as JPG/PNG files to your computer. Use the Share button to get a shareable link you can send to clients for review. Go to My Projects in Homestyler to access all your saved designs anytime.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Tip:</strong> Create your floor plan in the Floor Plan tab first, then use Homestyler to bring it to life with realistic 3D rendering. 
                  You can export your Homestyler designs and share them with clients for approval.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">How to use Homestyler for your event:</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-[#8B1538] text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Create a free Homestyler account</p>
                      <p className="text-xs text-gray-500">Sign up at homestyler.com (free), then draw your room layout using their floor plan tools</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-[#8B1538] text-white text-xs flex items-center justify-center font-bold shrink-0">2</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Add furniture and decor</p>
                      <p className="text-xs text-gray-500">Browse the library for tables, chairs, stage elements, and more</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-[#8B1538] text-white text-xs flex items-center justify-center font-bold shrink-0">3</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Apply materials and lighting</p>
                      <p className="text-xs text-gray-500">Set wall colours, floor materials, and lighting to match your theme</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-[#8B1538] text-white text-xs flex items-center justify-center font-bold shrink-0">4</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Render, export and share</p>
                      <p className="text-xs text-gray-500">Click "Render" for photorealistic images, download them, and use "Share" to send a link to your client</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === "palette" && (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">Event Colour Palette</CardTitle>
            <p className="text-xs text-gray-500">Create your colour scheme. Use presets or pick your own colours.</p>
          </CardHeader>
          <CardContent>
            <ColorPaletteDesigner
              eventId={eventId}
              eventColors={event?.preferredColors || []}
              onSaved={() => {}}
            />
          </CardContent>
        </Card>
      )}

      {activeSection === "preferences" && (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">Style & Theme Preferences</CardTitle>
            <p className="text-xs text-gray-500">Set the overall design direction for your event.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Decor Style</Label>
                <Select value={decorStyle} onValueChange={setDecorStyle}>
                  <SelectTrigger className="bg-white text-gray-900 border-gray-200">
                    <SelectValue placeholder="Select a style" />
                  </SelectTrigger>
                  <SelectContent>
                    {DECOR_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Decor Theme</Label>
                <Select value={decorTheme} onValueChange={setDecorTheme}>
                  <SelectTrigger className="bg-white text-gray-900 border-gray-200">
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {DECOR_THEMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Colour Theme Description</Label>
              <Input
                value={colorTheme}
                onChange={e => setColorTheme(e.target.value)}
                placeholder="e.g. Burgundy and Gold, Monochrome Shades of Blue"
                className="bg-white text-gray-900 border-gray-200"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Design Notes</Label>
              <Textarea
                value={decorNotes}
                onChange={e => setDecorNotes(e.target.value)}
                placeholder="Any specific design requests, references, or notes for the decor team..."
                rows={4}
                className="bg-white text-gray-900 border-gray-200"
              />
            </div>

            {(event?.decorStyle || event?.decorTheme || event?.colorTheme) && (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Settings</p>
                <div className="space-y-1 text-sm">
                  {event.decorStyle && <p className="text-gray-700"><span className="font-medium">Style:</span> {event.decorStyle}</p>}
                  {event.decorTheme && <p className="text-gray-700"><span className="font-medium">Theme:</span> {event.decorTheme}</p>}
                  {event.colorTheme && <p className="text-gray-700"><span className="font-medium">Colour:</span> {event.colorTheme}</p>}
                  {event.preferredColors && event.preferredColors.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-medium text-gray-700">Saved Colours:</span>
                      <div className="flex gap-1">
                        {event.preferredColors.map((c: string, i: number) => (
                          <div key={i} className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={savePreferences} disabled={savingPrefs} className="bg-[#330311] hover:bg-[#4a0418] text-white">
                {savingPrefs ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Save className="w-4 h-4 mr-1" />}
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
