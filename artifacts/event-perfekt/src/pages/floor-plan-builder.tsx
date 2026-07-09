import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Grid3x3, RotateCw, Trash2, Copy, Download,
  Save, Undo2, Redo2, ZoomIn, ZoomOut, Layers, Settings2,
  ChevronDown, ChevronRight, Plus, Minus, Move,
} from "lucide-react";

/* ─────────────────────────── TYPES ─────────────────────────── */
type Shape = "rect" | "circle" | "crescent" | "oval" | "hexagon";

interface FPElement {
  id: string;
  type: string;
  shape: Shape;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  label: string;
  color: string;
  textColor: string;
  capacity?: number;
  chairs?: number;
  fontSize?: number;
  locked?: boolean;
}

interface Preset { name: string; elements: Omit<FPElement, "id">[]; }

/* ─────────────────────────── ELEMENT CATALOGUE ─────────────────────────── */
interface ElementDef { type: string; label: string; shape: Shape; w: number; h: number; color: string; textColor: string; capacity?: number; chairs?: number; category: string; emoji: string; }

const ELEMENTS: ElementDef[] = [
  // Tables
  { type: "round-4",       label: "Round 4",    shape: "circle",  w: 60,  h: 60,  color: "#c8a97a", textColor: "#1a1a1a", capacity: 4,  chairs: 4,  category: "Tables", emoji: "⭕" },
  { type: "round-6",       label: "Round 6",    shape: "circle",  w: 72,  h: 72,  color: "#c8a97a", textColor: "#1a1a1a", capacity: 6,  chairs: 6,  category: "Tables", emoji: "⭕" },
  { type: "round-8",       label: "Round 8",    shape: "circle",  w: 84,  h: 84,  color: "#c8a97a", textColor: "#1a1a1a", capacity: 8,  chairs: 8,  category: "Tables", emoji: "⭕" },
  { type: "round-10",      label: "Round 10",   shape: "circle",  w: 96,  h: 96,  color: "#c8a97a", textColor: "#1a1a1a", capacity: 10, chairs: 10, category: "Tables", emoji: "⭕" },
  { type: "round-12",      label: "Round 12",   shape: "circle",  w: 108, h: 108, color: "#c8a97a", textColor: "#1a1a1a", capacity: 12, chairs: 12, category: "Tables", emoji: "⭕" },
  { type: "rect-2",        label: "Rect 2",     shape: "rect",    w: 50,  h: 35,  color: "#9e7c55", textColor: "#fff",    capacity: 2,  chairs: 2,  category: "Tables", emoji: "⬜" },
  { type: "rect-4",        label: "Rect 4",     shape: "rect",    w: 80,  h: 40,  color: "#9e7c55", textColor: "#fff",    capacity: 4,  chairs: 4,  category: "Tables", emoji: "⬜" },
  { type: "rect-6",        label: "Rect 6",     shape: "rect",    w: 110, h: 40,  color: "#9e7c55", textColor: "#fff",    capacity: 6,  chairs: 6,  category: "Tables", emoji: "⬜" },
  { type: "rect-8",        label: "Rect 8",     shape: "rect",    w: 140, h: 40,  color: "#9e7c55", textColor: "#fff",    capacity: 8,  chairs: 8,  category: "Tables", emoji: "⬜" },
  { type: "banquet-long",  label: "Banquet",    shape: "rect",    w: 180, h: 40,  color: "#9e7c55", textColor: "#fff",    capacity: 10, chairs: 10, category: "Tables", emoji: "⬛" },
  { type: "crescent",      label: "Crescent",   shape: "crescent",w: 80,  h: 50,  color: "#b8956a", textColor: "#1a1a1a", capacity: 5,  chairs: 5,  category: "Tables", emoji: "🌙" },
  { type: "cocktail",      label: "Cocktail",   shape: "circle",  w: 36,  h: 36,  color: "#6b8fa3", textColor: "#fff",    capacity: 4,  chairs: 0,  category: "Tables", emoji: "🍹" },
  // Stage & Entertainment
  { type: "stage",         label: "Stage",      shape: "rect",    w: 200, h: 80,  color: "#3d2b6b", textColor: "#fff",    category: "Stage & AV", emoji: "🎭" },
  { type: "dance-floor",   label: "Dance Floor", shape: "rect",   w: 160, h: 120, color: "#e8d5ff", textColor: "#3d2b6b", category: "Stage & AV", emoji: "💃" },
  { type: "podium",        label: "Podium",     shape: "rect",    w: 50,  h: 50,  color: "#4a3728", textColor: "#fff",    category: "Stage & AV", emoji: "🎤" },
  { type: "screen",        label: "Screen/Projector", shape: "rect", w: 120, h: 20, color: "#2c2c2c", textColor: "#fff", category: "Stage & AV", emoji: "📽️" },
  { type: "dj-booth",      label: "DJ Booth",   shape: "rect",    w: 80,  h: 50,  color: "#1a1a2e", textColor: "#fff",    category: "Stage & AV", emoji: "🎧" },
  // Food & Beverage
  { type: "bar",           label: "Bar",        shape: "rect",    w: 120, h: 40,  color: "#2d4a22", textColor: "#fff",    category: "Food & Beverage", emoji: "🍸" },
  { type: "buffet",        label: "Buffet",     shape: "rect",    w: 160, h: 40,  color: "#8b4513", textColor: "#fff",    category: "Food & Beverage", emoji: "🍽️" },
  { type: "cake-table",    label: "Cake Table", shape: "circle",  w: 50,  h: 50,  color: "#ffb6c1", textColor: "#333",    category: "Food & Beverage", emoji: "🎂" },
  { type: "serving",       label: "Serving Station", shape: "rect", w: 80, h: 30, color: "#cd853f", textColor: "#fff",   category: "Food & Beverage", emoji: "🥘" },
  // Room Features
  { type: "entrance",      label: "Entrance",   shape: "rect",    w: 50,  h: 20,  color: "#228b22", textColor: "#fff",    category: "Room Features", emoji: "🚪" },
  { type: "exit",          label: "Exit",       shape: "rect",    w: 50,  h: 20,  color: "#dc143c", textColor: "#fff",    category: "Room Features", emoji: "🚪" },
  { type: "reg-desk",      label: "Reg. Desk",  shape: "rect",    w: 100, h: 40,  color: "#1a3a6b", textColor: "#fff",    category: "Room Features", emoji: "📋" },
  { type: "pillar",        label: "Pillar",     shape: "circle",  w: 24,  h: 24,  color: "#808080", textColor: "#fff",    category: "Room Features", emoji: "🏛️" },
  { type: "wall",          label: "Wall/Divider", shape: "rect",  w: 150, h: 10,  color: "#555",    textColor: "#fff",    category: "Room Features", emoji: "🧱" },
  // Decor
  { type: "plant",         label: "Plant",      shape: "circle",  w: 30,  h: 30,  color: "#2d8a2d", textColor: "#fff",    category: "Decor", emoji: "🪴" },
  { type: "flowers",       label: "Flowers",    shape: "circle",  w: 25,  h: 25,  color: "#ff69b4", textColor: "#fff",    category: "Decor", emoji: "💐" },
  { type: "photo-booth",   label: "Photo Booth", shape: "rect",   w: 70,  h: 70,  color: "#ff1493", textColor: "#fff",    category: "Decor", emoji: "📷" },
  { type: "gift-table",    label: "Gift Table", shape: "rect",    w: 80,  h: 35,  color: "#9370db", textColor: "#fff",    category: "Decor", emoji: "🎁" },
  // Chairs
  { type: "chair",         label: "Chair",      shape: "rect",    w: 20,  h: 20,  color: "#999",    textColor: "#fff",    capacity: 1, chairs: 1, category: "Seating", emoji: "🪑" },
  { type: "chair-row",     label: "Chair Row",  shape: "rect",    w: 120, h: 22,  color: "#888",    textColor: "#fff",    capacity: 6, chairs: 6, category: "Seating", emoji: "🪑🪑🪑" },
];

const CATEGORIES = [...new Set(ELEMENTS.map(e => e.category))];

/* ─────────────────────────── LAYOUT PRESETS ─────────────────────────── */
function makeId() { return Math.random().toString(36).slice(2, 9); }

const PRESETS: Preset[] = [
  {
    name: "Banquet",
    elements: (() => {
      const els: Omit<FPElement,"id">[] = [];
      // 8 round tables of 8 arranged in 2 rows of 4
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
          els.push({ type:"round-8", label:`T${row*4+col+1}`, shape:"circle", x:80+col*160, y:120+row*200, w:84, h:84, rotation:0, color:"#c8a97a", textColor:"#1a1a1a", capacity:8, chairs:8, fontSize:11 });
        }
      }
      els.push({ type:"stage", label:"Stage", shape:"rect", x:60, y:480, w:560, h:70, rotation:0, color:"#3d2b6b", textColor:"#fff", fontSize:14 });
      els.push({ type:"reg-desk", label:"Reg. Desk", shape:"rect", x:20, y:10, w:100, h:40, rotation:0, color:"#1a3a6b", textColor:"#fff", fontSize:12 });
      els.push({ type:"bar", label:"Bar", shape:"rect", x:540, y:10, w:120, h:40, rotation:0, color:"#2d4a22", textColor:"#fff", fontSize:12 });
      return els;
    })(),
  },
  {
    name: "Theater",
    elements: (() => {
      const els: Omit<FPElement,"id">[] = [];
      // 6 rows of 6 chairs
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          els.push({ type:"chair", label:"", shape:"rect", x:60+col*90, y:60+row*70, w:60, h:40, rotation:0, color:"#888", textColor:"#fff", capacity:1, chairs:1, fontSize:10 });
        }
      }
      els.push({ type:"stage", label:"Stage", shape:"rect", x:40, y:530, w:620, h:70, rotation:0, color:"#3d2b6b", textColor:"#fff", fontSize:14 });
      els.push({ type:"podium", label:"Podium", shape:"rect", x:320, y:492, w:60, h:40, rotation:0, color:"#4a3728", textColor:"#fff", fontSize:11 });
      return els;
    })(),
  },
  {
    name: "Cocktail Reception",
    elements: (() => {
      const els: Omit<FPElement,"id">[] = [];
      const positions = [[100,120],[280,100],[460,120],[160,300],[350,290],[520,300],[80,460],[240,480],[420,460],[580,440]];
      positions.forEach(([x,y],i) => {
        els.push({ type:"cocktail", label:`C${i+1}`, shape:"circle", x, y, w:36, h:36, rotation:0, color:"#6b8fa3", textColor:"#fff", capacity:4, chairs:0, fontSize:9 });
      });
      els.push({ type:"bar", label:"Bar", shape:"rect", x:60, y:10, w:160, h:45, rotation:0, color:"#2d4a22", textColor:"#fff", fontSize:12 });
      els.push({ type:"buffet", label:"Buffet", shape:"rect", x:420, y:10, w:200, h:40, rotation:0, color:"#8b4513", textColor:"#fff", fontSize:12 });
      els.push({ type:"dance-floor", label:"Dance Floor", shape:"rect", x:200, y:200, w:240, h:160, rotation:0, color:"#e8d5ff", textColor:"#3d2b6b", fontSize:13 });
      return els;
    })(),
  },
  {
    name: "Classroom",
    elements: (() => {
      const els: Omit<FPElement,"id">[] = [];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          els.push({ type:"rect-2", label:`R${row+1}-${col+1}`, shape:"rect", x:60+col*200, y:60+row*90, w:140, h:50, rotation:0, color:"#9e7c55", textColor:"#fff", capacity:2, chairs:2, fontSize:9 });
        }
      }
      els.push({ type:"stage", label:"Stage", shape:"rect", x:60, y:540, w:580, h:50, rotation:0, color:"#3d2b6b", textColor:"#fff", fontSize:13 });
      els.push({ type:"screen", label:"Screen", shape:"rect", x:180, y:510, w:360, h:20, rotation:0, color:"#2c2c2c", textColor:"#fff", fontSize:10 });
      els.push({ type:"podium", label:"Podium", shape:"rect", x:320, y:480, w:60, h:40, rotation:0, color:"#4a3728", textColor:"#fff", fontSize:10 });
      return els;
    })(),
  },
  {
    name: "U-Shape",
    elements: (() => {
      const els: Omit<FPElement,"id">[] = [];
      // Bottom horizontal
      for (let i = 0; i < 5; i++) {
        els.push({ type:"rect-2", label:`B${i+1}`, shape:"rect", x:60+i*110, y:420, w:80, h:40, rotation:0, color:"#9e7c55", textColor:"#fff", capacity:2, chairs:2, fontSize:9 });
      }
      // Left vertical
      for (let i = 0; i < 4; i++) {
        els.push({ type:"rect-2", label:`L${i+1}`, shape:"rect", x:60, y:60+i*90, w:80, h:40, rotation:0, color:"#9e7c55", textColor:"#fff", capacity:2, chairs:2, fontSize:9 });
      }
      // Right vertical
      for (let i = 0; i < 4; i++) {
        els.push({ type:"rect-2", label:`R${i+1}`, shape:"rect", x:560, y:60+i*90, w:80, h:40, rotation:0, color:"#9e7c55", textColor:"#fff", capacity:2, chairs:2, fontSize:9 });
      }
      els.push({ type:"screen", label:"Screen", shape:"rect", x:220, y:30, w:280, h:20, rotation:0, color:"#2c2c2c", textColor:"#fff", fontSize:10 });
      els.push({ type:"podium", label:"Podium", shape:"rect", x:320, y:55, w:60, h:40, rotation:0, color:"#4a3728", textColor:"#fff", fontSize:10 });
      return els;
    })(),
  },
  {
    name: "Boardroom",
    elements: (() => {
      const els: Omit<FPElement,"id">[] = [];
      els.push({ type:"banquet-long", label:"Boardroom Table", shape:"rect", x:60, y:220, w:580, h:120, rotation:0, color:"#4a3728", textColor:"#fff", capacity:20, chairs:20, fontSize:13 });
      // Chairs around
      for (let i = 0; i < 8; i++) {
        els.push({ type:"chair", label:"", shape:"rect", x:80+i*70, y:195, w:40, h:22, rotation:0, color:"#888", textColor:"#fff", capacity:1, chairs:1, fontSize:8 });
      }
      for (let i = 0; i < 8; i++) {
        els.push({ type:"chair", label:"", shape:"rect", x:80+i*70, y:348, w:40, h:22, rotation:0, color:"#888", textColor:"#fff", capacity:1, chairs:1, fontSize:8 });
      }
      els.push({ type:"screen", label:"Screen", shape:"rect", x:220, y:30, w:280, h:20, rotation:0, color:"#2c2c2c", textColor:"#fff", fontSize:10 });
      return els;
    })(),
  },
];

/* ─────────────────────────── HELPERS ─────────────────────────── */
function snapToGrid(v: number, grid: number, snap: boolean) {
  return snap ? Math.round(v / grid) * grid : v;
}

function drawChairs(el: FPElement): { cx: number; cy: number }[] {
  if (!el.chairs || el.chairs === 0 || el.type === "cocktail") return [];
  const chairs: { cx: number; cy: number }[] = [];
  const pad = 14;
  if (el.shape === "circle") {
    const r = el.w / 2 + pad;
    for (let i = 0; i < el.chairs; i++) {
      const angle = (2 * Math.PI * i) / el.chairs - Math.PI / 2;
      chairs.push({ cx: el.w / 2 + r * Math.cos(angle), cy: el.h / 2 + r * Math.sin(angle) });
    }
  } else if (el.chairs > 0 && el.type !== "chair" && el.type !== "chair-row") {
    const perSide = Math.ceil(el.chairs / 2);
    for (let i = 0; i < perSide && chairs.length < el.chairs; i++) {
      chairs.push({ cx: (i + 1) * el.w / (perSide + 1), cy: -pad });
      if (chairs.length < el.chairs) {
        chairs.push({ cx: (i + 1) * el.w / (perSide + 1), cy: el.h + pad });
      }
    }
  }
  return chairs;
}

/* ─────────────────────────── SVG ELEMENT RENDERER ─────────────────────────── */
function FPElementSVG({ el, selected, onSelect, onPointerDown }: {
  el: FPElement; selected: boolean;
  onSelect: () => void; onPointerDown: (e: React.PointerEvent) => void;
}) {
  const chairs = drawChairs(el);
  const cx = el.w / 2;
  const cy = el.h / 2;
  const fontSize = el.fontSize || 11;

  const renderShape = () => {
    if (el.shape === "circle") {
      return <ellipse cx={cx} cy={cy} rx={el.w/2} ry={el.h/2} fill={el.color} stroke={selected ? "#f97316" : "#666"} strokeWidth={selected ? 2.5 : 1} />;
    } else if (el.shape === "crescent") {
      const d = `M${cx-el.w/2},${cy} Q${cx},${cy-el.h*0.8} ${cx+el.w/2},${cy} Q${cx},${el.h*0.2} ${cx-el.w/2},${cy}`;
      return <path d={d} fill={el.color} stroke={selected ? "#f97316" : "#666"} strokeWidth={selected ? 2.5 : 1} />;
    } else {
      return <rect x={0} y={0} width={el.w} height={el.h} rx={3} fill={el.color} stroke={selected ? "#f97316" : "#666"} strokeWidth={selected ? 2.5 : 1} />;
    }
  };

  return (
    <g
      transform={`translate(${el.x},${el.y}) rotate(${el.rotation},${cx},${cy})`}
      style={{ cursor: el.locked ? "not-allowed" : "move", userSelect: "none" }}
      onPointerDown={onPointerDown}
      onClick={onSelect}
    >
      {/* Chairs */}
      {chairs.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={7} fill="#bbb" stroke="#888" strokeWidth={0.5} />
      ))}

      {/* Main shape */}
      {renderShape()}

      {/* Label */}
      {el.label && (
        <text
          x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fill={el.textColor || "#fff"} fontSize={fontSize} fontWeight="600"
          style={{ pointerEvents: "none" }}
        >
          {el.label}
        </text>
      )}

      {/* Capacity badge */}
      {el.capacity && (
        <text
          x={cx} y={cy + fontSize + 2} textAnchor="middle" dominantBaseline="middle"
          fill={el.textColor || "#fff"} fontSize={fontSize - 2} opacity={0.75}
          style={{ pointerEvents: "none" }}
        >
          {el.chairs ? `${el.chairs} pax` : `${el.capacity} pax`}
        </text>
      )}

      {/* Selection handles */}
      {selected && (
        <>
          <rect x={-4} y={-4} width={8} height={8} fill="#f97316" rx={1} />
          <rect x={el.w-4} y={-4} width={8} height={8} fill="#f97316" rx={1} />
          <rect x={-4} y={el.h-4} width={8} height={8} fill="#f97316" rx={1} />
          <rect x={el.w-4} y={el.h-4} width={8} height={8} fill="#f97316" rx={1} />
          {/* Rotation handle */}
          <circle cx={cx} cy={-20} r={6} fill="#f97316" stroke="white" strokeWidth={1.5} style={{ cursor: "crosshair" }} />
          <line x1={cx} y1={-14} x2={cx} y2={0} stroke="#f97316" strokeWidth={1.5} />
        </>
      )}
    </g>
  );
}

/* ─────────────────────────── MAIN PAGE ─────────────────────────── */
export default function FloorPlanBuilder() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const eventId = params.get("eventId") || "";
  const { toast } = useToast();
  const qc = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);

  /* State */
  const [elements, setElements] = useState<FPElement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<FPElement[][]>([]);
  const [redoStack, setRedoStack] = useState<FPElement[][]>([]);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize] = useState(20);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [planName, setPlanName] = useState("Floor Plan 1");
  const [roomW, setRoomW] = useState(800);
  const [roomH, setRoomH] = useState(600);
  const [activeCategory, setActiveCategory] = useState("Tables");
  const [showPresets, setShowPresets] = useState(false);

  /* Drag state */
  const dragging = useRef<{ id: string; startX: number; startY: number; elStartX: number; elStartY: number } | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  /* Derived */
  const selectedEl = elements.find(e => e.id === selected);
  const totalCapacity = elements.reduce((s, e) => s + (e.chairs || e.capacity || 0), 0);
  const tableCount = elements.filter(e => e.type.startsWith("round") || e.type.startsWith("rect") || e.type === "banquet-long" || e.type === "crescent" || e.type === "cocktail").length;

  /* Fetch saved plans for this event */
  const { data: savedPlans = [] } = useQuery({
    queryKey: ["/api/floor-plans", eventId],
    queryFn: () => apiRequest("GET", `/api/floor-plans?eventId=${eventId}`).then(r => r.json()),
    enabled: !!eventId,
  });

  /* ─── History helpers ─── */
  const snapshot = useCallback((prev: FPElement[]) => {
    setUndoStack(u => [...u.slice(-30), prev]);
    setRedoStack([]);
  }, []);

  const undo = () => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, elements]);
    setElements(prev);
    setUndoStack(u => u.slice(0, -1));
  };

  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, elements]);
    setElements(next);
    setRedoStack(r => r.slice(0, -1));
  };

  /* ─── Add element ─── */
  const addElement = (def: ElementDef) => {
    snapshot(elements);
    const newEl: FPElement = {
      id: makeId(), type: def.type, shape: def.shape,
      x: snapToGrid(200, gridSize, snapEnabled) + Math.random() * 40,
      y: snapToGrid(200, gridSize, snapEnabled) + Math.random() * 40,
      w: def.w, h: def.h, rotation: 0,
      label: def.label, color: def.color, textColor: def.textColor,
      capacity: def.capacity, chairs: def.chairs, fontSize: 11,
    };
    setElements(prev => [...prev, newEl]);
    setSelected(newEl.id);
  };

  /* ─── Load preset ─── */
  const loadPreset = (preset: Preset) => {
    snapshot(elements);
    setElements(preset.elements.map(e => ({ ...e, id: makeId() })));
    setSelected(null);
    setShowPresets(false);
    toast({ title: `Loaded "${preset.name}" preset` });
  };

  /* ─── Delete / Duplicate ─── */
  const deleteSelected = () => {
    if (!selected) return;
    snapshot(elements);
    setElements(prev => prev.filter(e => e.id !== selected));
    setSelected(null);
  };

  const duplicateSelected = () => {
    if (!selectedEl) return;
    snapshot(elements);
    const copy: FPElement = { ...selectedEl, id: makeId(), x: selectedEl.x + 30, y: selectedEl.y + 30 };
    setElements(prev => [...prev, copy]);
    setSelected(copy.id);
  };

  /* ─── Pointer events for dragging ─── */
  const handleSVGPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      setSelected(null);
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    }
  };

  const handleElementPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (elements.find(el => el.id === id)?.locked) return;
    const svgRect = svgRef.current!.getBoundingClientRect();
    const el = elements.find(el => el.id === id)!;
    dragging.current = {
      id, startX: e.clientX, startY: e.clientY,
      elStartX: el.x, elStartY: el.y,
    };
    setSelected(id);
    snapshot(elements);
    (svgRef.current as SVGSVGElement).setPointerCapture(e.pointerId);
  };

  const handleSVGPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning.current) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
      return;
    }
    if (!dragging.current) return;
    const dx = (e.clientX - dragging.current.startX) / zoom;
    const dy = (e.clientY - dragging.current.startY) / zoom;
    const newX = snapToGrid(dragging.current.elStartX + dx, gridSize, snapEnabled);
    const newY = snapToGrid(dragging.current.elStartY + dy, gridSize, snapEnabled);
    setElements(prev => prev.map(el => el.id === dragging.current!.id ? { ...el, x: newX, y: newY } : el));
  };

  const handleSVGPointerUp = () => {
    dragging.current = null;
    isPanning.current = false;
  };

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
      if (e.key === "Delete" || e.key === "Backspace") { if (selected) deleteSelected(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); duplicateSelected(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, elements, undoStack, redoStack]);

  /* ─── Update selected element property ─── */
  const updateEl = (patch: Partial<FPElement>) => {
    setElements(prev => prev.map(e => e.id === selected ? { ...e, ...patch } : e));
  };

  /* ─── Rotate ─── */
  const rotateSelected = (deg: number) => {
    if (!selectedEl) return;
    snapshot(elements);
    updateEl({ rotation: (selectedEl.rotation + deg + 360) % 360 });
  };

  /* ─── Bring to front / send to back ─── */
  const bringToFront = () => {
    if (!selected) return;
    snapshot(elements);
    setElements(prev => {
      const idx = prev.findIndex(e => e.id === selected);
      const newArr = [...prev];
      newArr.push(newArr.splice(idx, 1)[0]);
      return newArr;
    });
  };

  const sendToBack = () => {
    if (!selected) return;
    snapshot(elements);
    setElements(prev => {
      const idx = prev.findIndex(e => e.id === selected);
      const newArr = [...prev];
      newArr.unshift(newArr.splice(idx, 1)[0]);
      return newArr;
    });
  };

  /* ─── Export as PNG ─── */
  const exportPNG = async () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    canvas.width = roomW + 80;
    canvas.height = roomH + 80;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
    img.onload = () => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = `${planName.replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    toast({ title: "Exported as PNG" });
  };

  /* ─── Save plan ─── */
  const savePlan = async () => {
    if (!eventId) {
      localStorage.setItem("epfp_plan", JSON.stringify({ name: planName, elements, roomW, roomH }));
      toast({ title: "Plan saved to browser storage" });
      return;
    }
    try {
      await apiRequest("POST", "/api/floor-plans", {
        eventId, name: planName, elements: JSON.stringify(elements), roomWidth: roomW, roomHeight: roomH,
      });
      qc.invalidateQueries({ queryKey: ["/api/floor-plans", eventId] });
      toast({ title: "Floor plan saved!" });
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
  };

  /* ─── Load from localStorage on mount ─── */
  useEffect(() => {
    if (!eventId) {
      const saved = localStorage.getItem("epfp_plan");
      if (saved) {
        try {
          const d = JSON.parse(saved);
          setPlanName(d.name || "Floor Plan 1");
          setElements(d.elements || []);
          setRoomW(d.roomW || 800);
          setRoomH(d.roomH || 600);
        } catch {}
      }
    }
  }, []);

  /* ─── Grid lines ─── */
  const gridLines = () => {
    if (!showGrid) return null;
    const lines = [];
    for (let x = 0; x <= roomW; x += gridSize) {
      lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={roomH} stroke="#e5e7eb" strokeWidth={0.5} />);
    }
    for (let y = 0; y <= roomH; y += gridSize) {
      lines.push(<line key={`h${y}`} x1={0} y1={y} x2={roomW} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />);
    }
    return <g>{lines}</g>;
  };

  const categoryEls = ELEMENTS.filter(e => e.category === activeCategory);

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* ─── TOP BAR ─── */}
      <div className="flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-2 z-20 shrink-0">
        <button onClick={() => setLocation(eventId ? `/event-dashboard?id=${eventId}` : "/venue-designer")} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-5 w-px bg-gray-200" />
        <Input
          value={planName}
          onChange={e => setPlanName(e.target.value)}
          className="text-sm font-semibold border-0 shadow-none bg-transparent w-44 h-7 px-1 focus:ring-1 focus:ring-gray-300 rounded"
        />
        <div className="h-5 w-px bg-gray-200" />

        {/* Undo/Redo */}
        <button onClick={undo} disabled={!undoStack.length} title="Undo (Ctrl+Z)" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 disabled:opacity-30 transition-colors">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={redo} disabled={!redoStack.length} title="Redo (Ctrl+Y)" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 disabled:opacity-30 transition-colors">
          <Redo2 className="h-4 w-4" />
        </button>

        <div className="h-5 w-px bg-gray-200" />

        {/* Grid / Snap */}
        <button onClick={() => setShowGrid(g => !g)} title="Toggle Grid" className={`p-1.5 rounded transition-colors ${showGrid ? "bg-[#1a3a6b]/10 text-[#1a3a6b]" : "text-gray-400 hover:bg-gray-100"}`}>
          <Grid3x3 className="h-4 w-4" />
        </button>
        <button onClick={() => setSnapEnabled(s => !s)} title="Toggle Snap" className={`p-1.5 rounded transition-colors text-xs font-bold ${snapEnabled ? "bg-[#1a3a6b]/10 text-[#1a3a6b]" : "text-gray-400 hover:bg-gray-100"}`}>
          SNAP
        </button>

        <div className="h-5 w-px bg-gray-200" />

        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"><ZoomOut className="h-4 w-4" /></button>
        <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom*100)}%</span>
        <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"><ZoomIn className="h-4 w-4" /></button>
        <button onClick={() => { setZoom(1); setPan({x:0,y:0}); }} className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100">Reset</button>

        <div className="h-5 w-px bg-gray-200" />

        {/* Presets */}
        <div className="relative">
          <button onClick={() => setShowPresets(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors">
            <Layers className="h-3.5 w-3.5" /> Presets {showPresets ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
          {showPresets && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[180px] py-1">
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => loadPreset(p)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 hover:text-[#1a3a6b]">
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <span><strong>{tableCount}</strong> tables</span>
            <span>·</span>
            <span><strong className={totalCapacity > 0 ? "text-green-600" : "text-gray-400"}>{totalCapacity}</strong> capacity</span>
            <span>·</span>
            <span><strong>{elements.length}</strong> elements</span>
          </div>

          <Button variant="outline" size="sm" onClick={exportPNG} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={savePlan} className="bg-[#1a3a6b] text-white gap-1.5 hover:bg-[#0d2547]">
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>

      {/* ─── MAIN LAYOUT ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── LEFT PALETTE ─── */}
        <div className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
          {/* Category tabs */}
          <div className="flex flex-col border-b border-gray-100">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`text-left px-4 py-2 text-xs font-semibold transition-colors ${activeCategory === cat ? "bg-[#1a3a6b] text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Element list */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {categoryEls.map(def => (
                <button
                  key={def.type}
                  onClick={() => addElement(def)}
                  draggable={false}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{def.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 group-hover:text-[#1a3a6b] truncate">{def.label}</p>
                      {def.chairs ? (
                        <p className="text-xs text-gray-400">{def.chairs} seats</p>
                      ) : null}
                    </div>
                    <Plus className="h-3 w-3 text-gray-300 group-hover:text-[#1a3a6b] ml-auto flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Room dimensions */}
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wide">Room Size</p>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-xs text-gray-400">W (px)</label>
                <Input value={roomW} onChange={e => setRoomW(Number(e.target.value) || 800)} className="h-7 text-xs px-2" type="number" min={400} max={2000} />
              </div>
              <div>
                <label className="text-xs text-gray-400">H (px)</label>
                <Input value={roomH} onChange={e => setRoomH(Number(e.target.value) || 600)} className="h-7 text-xs px-2" type="number" min={300} max={2000} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── SVG CANVAS ─── */}
        <div
          className="flex-1 overflow-hidden bg-gray-200"
          style={{ position: "relative" }}
        >
          <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              style={{ display: "block" }}
              onPointerDown={handleSVGPointerDown}
              onPointerMove={handleSVGPointerMove}
              onPointerUp={handleSVGPointerUp}
            >
              {/* Pan + Zoom group */}
              <g transform={`translate(${pan.x + 40},${pan.y + 40}) scale(${zoom})`}>
                {/* Room boundary */}
                <rect x={0} y={0} width={roomW} height={roomH} fill="white" stroke="#1a3a6b" strokeWidth={2} rx={4} />

                {/* Grid */}
                <g clipPath="url(#room-clip)">
                  {gridLines()}
                </g>
                <defs>
                  <clipPath id="room-clip">
                    <rect x={0} y={0} width={roomW} height={roomH} />
                  </clipPath>
                </defs>

                {/* Room label */}
                <text x={roomW/2} y={-12} textAnchor="middle" fill="#9ca3af" fontSize={12} fontWeight="500">
                  {planName} · {roomW}×{roomH}px
                </text>

                {/* Elements */}
                {elements.map(el => (
                  <FPElementSVG
                    key={el.id} el={el}
                    selected={selected === el.id}
                    onSelect={() => setSelected(el.id)}
                    onPointerDown={e => handleElementPointerDown(e, el.id)}
                  />
                ))}
              </g>
            </svg>

            {/* Empty state */}
            {elements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-5xl mb-3">🏛️</div>
                  <p className="text-gray-500 font-medium">Start building your floor plan</p>
                  <p className="text-gray-400 text-sm mt-1">Add elements from the left panel or load a preset</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT PROPERTIES PANEL ─── */}
        <div className="w-60 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
          {selectedEl ? (
            <div className="flex-1 overflow-y-auto">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-[#1a3a6b] uppercase tracking-wide">Properties</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedEl.label || selectedEl.type}</p>
              </div>

              <div className="p-4 space-y-4">
                {/* Label */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                  <Input value={selectedEl.label} onChange={e => updateEl({ label: e.target.value })} className="h-8 text-sm" />
                </div>

                {/* Position */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400">X</label>
                      <Input type="number" value={Math.round(selectedEl.x)} onChange={e => updateEl({ x: Number(e.target.value) })} className="h-7 text-xs px-2" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Y</label>
                      <Input type="number" value={Math.round(selectedEl.y)} onChange={e => updateEl({ y: Number(e.target.value) })} className="h-7 text-xs px-2" />
                    </div>
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400">W</label>
                      <Input type="number" value={Math.round(selectedEl.w)} onChange={e => updateEl({ w: Number(e.target.value) })} className="h-7 text-xs px-2" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">H</label>
                      <Input type="number" value={Math.round(selectedEl.h)} onChange={e => updateEl({ h: Number(e.target.value) })} className="h-7 text-xs px-2" />
                    </div>
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Rotation</label>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={selectedEl.rotation} onChange={e => updateEl({ rotation: Number(e.target.value) % 360 })} className="h-7 text-xs px-2 flex-1" />
                    <button onClick={() => rotateSelected(-45)} className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600">
                      <RotateCw className="h-3.5 w-3.5 scale-x-[-1]" />
                    </button>
                    <button onClick={() => rotateSelected(45)} className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600">
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fill Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={selectedEl.color} onChange={e => updateEl({ color: e.target.value })} className="w-9 h-8 border border-gray-200 rounded cursor-pointer" />
                    <Input value={selectedEl.color} onChange={e => updateEl({ color: e.target.value })} className="h-8 text-xs flex-1" />
                  </div>
                </div>

                {/* Capacity */}
                {selectedEl.chairs !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Seats / Capacity</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateEl({ chairs: Math.max(0, (selectedEl.chairs || 0) - 1), capacity: Math.max(0, (selectedEl.capacity || 0) - 1) })} className="p-1.5 rounded bg-gray-100 hover:bg-gray-200"><Minus className="h-3 w-3" /></button>
                      <span className="text-sm font-bold text-gray-800 w-8 text-center">{selectedEl.chairs || 0}</span>
                      <button onClick={() => updateEl({ chairs: (selectedEl.chairs || 0) + 1, capacity: (selectedEl.capacity || 0) + 1 })} className="p-1.5 rounded bg-gray-100 hover:bg-gray-200"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                )}

                {/* Font size */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Label Size</label>
                  <Input type="number" value={selectedEl.fontSize || 11} onChange={e => updateEl({ fontSize: Number(e.target.value) })} className="h-7 text-xs px-2" min={6} max={24} />
                </div>

                {/* Layering */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={bringToFront} className="text-xs py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium">Bring Front</button>
                  <button onClick={sendToBack} className="text-xs py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium">Send Back</button>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={duplicateSelected} className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition-colors">
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  <button onClick={deleteSelected} className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Summary */}
              <div className="px-4 py-4 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-[#1a3a6b] uppercase tracking-wide mb-3">Layout Summary</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Total Elements</span>
                    <Badge className="bg-gray-100 text-gray-700 text-xs">{elements.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Tables</span>
                    <Badge className="bg-amber-100 text-amber-700 text-xs">{tableCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Total Capacity</span>
                    <Badge className={`text-xs ${totalCapacity > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{totalCapacity} pax</Badge>
                  </div>
                </div>
              </div>

              {/* Capacity breakdown */}
              {elements.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wide">Element List</p>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {elements.map((el, i) => (
                      <button key={el.id} onClick={() => setSelected(el.id)} className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-gray-50 transition-colors ${selected === el.id ? "bg-blue-50 text-[#1a3a6b]" : "text-gray-600"}`}>
                        <span className="font-mono text-gray-300">{String(i+1).padStart(2,"0")}</span>
                        <span className="flex-1 truncate font-medium">{el.label || el.type}</span>
                        {el.chairs ? <span className="text-gray-400">{el.chairs}p</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Help */}
              <div className="mt-auto px-4 py-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wide">Shortcuts</p>
                <div className="space-y-1 text-xs text-gray-400">
                  <div className="flex justify-between"><span>Undo</span><span className="font-mono bg-gray-100 px-1 rounded">Ctrl+Z</span></div>
                  <div className="flex justify-between"><span>Redo</span><span className="font-mono bg-gray-100 px-1 rounded">Ctrl+Y</span></div>
                  <div className="flex justify-between"><span>Duplicate</span><span className="font-mono bg-gray-100 px-1 rounded">Ctrl+D</span></div>
                  <div className="flex justify-between"><span>Delete</span><span className="font-mono bg-gray-100 px-1 rounded">Del</span></div>
                  <div className="flex justify-between"><span>Pan</span><span className="text-gray-400">Drag canvas</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
