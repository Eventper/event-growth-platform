import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart, Plus, Trash2, Edit2, Check, X, Lock, Unlock,
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  ChevronDown, ChevronUp, RefreshCw, Download, Printer,
  BarChart2, Palette, Calculator, Target
} from "lucide-react";
import PlannerLayout from "@/components/PlannerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlanCategory {
  id: string;
  name: string;
  color: string;
  percentage: number;
  locked: boolean;
}

interface BudgetPlan {
  totalBudget: number;
  currency: string;
  categories: PlanCategory[];
  savedAt: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const COLOR_PALETTE = [
  "#8B1538","#C9A961","#6B3F5E","#4A7B9D","#2E8B57",
  "#D4526B","#8B6914","#5B4A8A","#B05C3B","#3B6B8A",
  "#557A55","#8B4513","#4682B4","#CD853F","#708090",
  "#A0522D","#2F4F4F","#800080","#008B8B","#B8860B",
];

const DEFAULT_CATEGORIES: PlanCategory[] = [
  { id: "1",  name: "Venue & Facility",      color: "#8B1538", percentage: 25, locked: false },
  { id: "2",  name: "Catering & Food",        color: "#C9A961", percentage: 20, locked: false },
  { id: "3",  name: "Beverages & Bar",        color: "#4A7B9D", percentage: 8,  locked: false },
  { id: "4",  name: "Décor & Styling",        color: "#6B3F5E", percentage: 12, locked: false },
  { id: "5",  name: "Photography & Video",    color: "#2E8B57", percentage: 8,  locked: false },
  { id: "6",  name: "Entertainment & Music",  color: "#D4526B", percentage: 7,  locked: false },
  { id: "7",  name: "Flowers & Floral",       color: "#8B6914", percentage: 4,  locked: false },
  { id: "8",  name: "Stationery & Print",     color: "#5B4A8A", percentage: 2,  locked: false },
  { id: "9",  name: "Transport & Travel",     color: "#B05C3B", percentage: 3,  locked: false },
  { id: "10", name: "Staff & Service",        color: "#3B6B8A", percentage: 4,  locked: false },
  { id: "11", name: "Marketing & PR",         color: "#557A55", percentage: 2,  locked: false },
  { id: "12", name: "Contingency",            color: "#708090", percentage: 5,  locked: false },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£", NGN: "₦", USD: "$", EUR: "€", KES: "KSh",
  AED: "AED", GHS: "GH₵", ZAR: "R",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, sym: string) {
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${sym}${(n / 1_000).toFixed(1)}K`;
  return `${sym}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  if (end - start >= 360) end = start + 359.999;
  const s = polarToCartesian(cx, cy, r, start);
  const e = polarToCartesian(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({
  categories, totalBudget, currency, hoveredId, setHoveredId
}: {
  categories: PlanCategory[];
  totalBudget: number;
  currency: string;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
}) {
  const sym = CURRENCY_SYMBOLS[currency] || "$";
  const size = 260;
  const cx = size / 2, cy = size / 2;
  const outerR = 110, innerR = 70;
  const gap = 1.5;

  let cursor = 0;
  const slices = categories.map(cat => {
    const deg = (cat.percentage / 100) * 360;
    const slice = { cat, start: cursor + gap / 2, end: cursor + deg - gap / 2 };
    cursor += deg;
    return slice;
  });

  const hovered = hoveredId ? categories.find(c => c.id === hoveredId) : null;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map(({ cat, start, end }) => {
          const isHov = hoveredId === cat.id;
          const r = isHov ? outerR + 6 : outerR;
          return (
            <path
              key={cat.id}
              d={arcPath(cx, cy, r, start, end)}
              fill="none"
              stroke={cat.color}
              strokeWidth={isHov ? 42 : 36}
              strokeLinecap="butt"
              style={{ cursor: "pointer", transition: "all 0.15s ease", filter: isHov ? `drop-shadow(0 0 6px ${cat.color}80)` : "none" }}
              onMouseEnter={() => setHoveredId(cat.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
          );
        })}
        {/* Centre text */}
        <text x={cx} y={cy - 14} textAnchor="middle" fontSize="11" fill="#666" fontFamily="Poppins, sans-serif">
          {hovered ? hovered.name.split(" ")[0] : "Total Budget"}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="20" fontWeight="700" fill="#1a0a0f" fontFamily="Poppins, sans-serif">
          {hovered
            ? fmt((hovered.percentage / 100) * totalBudget, sym)
            : fmt(totalBudget, sym)}
        </text>
        <text x={cx} y={cy + 26} textAnchor="middle" fontSize="11" fill="#888" fontFamily="Poppins, sans-serif">
          {hovered ? `${hovered.percentage.toFixed(1)}% allocated` : `${currency} budget`}
        </text>
      </svg>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({
  categories, totalBudget, currency, actualByCategory
}: {
  categories: PlanCategory[];
  totalBudget: number;
  currency: string;
  actualByCategory: Record<string, number>;
}) {
  const sym = CURRENCY_SYMBOLS[currency] || "$";
  const maxVal = Math.max(
    ...categories.map(c => Math.max((c.percentage / 100) * totalBudget, actualByCategory[c.name] || 0))
  ) * 1.1 || 1;

  return (
    <div className="space-y-2">
      {categories.map(cat => {
        const planned = (cat.percentage / 100) * totalBudget;
        const actual = actualByCategory[cat.name] || 0;
        const planW = (planned / maxVal) * 100;
        const actW = (actual / maxVal) * 100;
        const over = actual > planned && planned > 0;
        return (
          <div key={cat.id} className="group">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-gray-600 truncate w-36">{cat.name}</span>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">Plan: {fmt(planned, sym)}</span>
                {actual > 0 && (
                  <span className={over ? "text-red-600 font-medium" : "text-green-700 font-medium"}>
                    Act: {fmt(actual, sym)}
                  </span>
                )}
              </div>
            </div>
            <div className="relative h-4 bg-gray-100 rounded overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full rounded opacity-40"
                style={{ width: `${planW}%`, background: cat.color, transition: "width 0.4s ease" }}
              />
              {actual > 0 && (
                <div
                  className="absolute top-1 left-0 h-2 rounded"
                  style={{ width: `${actW}%`, background: over ? "#dc2626" : cat.color, transition: "width 0.4s ease" }}
                />
              )}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 pt-1 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-gray-400 opacity-40" /> Planned</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-gray-600" /> Actual</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-500" /> Over budget</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BudgetPlannerPage() {
  const { toast } = useToast();

  const { data: events = [] } = useQuery({ queryKey: ["/api/events"], queryFn: api.getEvents });

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [totalBudget, setTotalBudget]         = useState<number>(0);
  const [currency, setCurrency]               = useState<string>("GBP");
  const [categories, setCategories]           = useState<PlanCategory[]>(DEFAULT_CATEGORIES);
  const [hoveredId, setHoveredId]             = useState<string | null>(null);
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [editName, setEditName]               = useState("");
  const [addName, setAddName]                 = useState("");
  const [addColor, setAddColor]               = useState(COLOR_PALETTE[0]);
  const [showAdd, setShowAdd]                 = useState(false);
  const [activeTab, setActiveTab]             = useState<"plan" | "compare">("plan");
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // ── Load/save plan from localStorage ──────────────────────────────────────
  const planKey = selectedEventId ? `budget_plan_${selectedEventId}` : null;

  useEffect(() => {
    if (!planKey) return;
    try {
      const raw = localStorage.getItem(planKey);
      if (raw) {
        const plan: BudgetPlan = JSON.parse(raw);
        setTotalBudget(plan.totalBudget || 0);
        setCurrency(plan.currency || "GBP");
        setCategories(plan.categories || DEFAULT_CATEGORIES);
      } else {
        setCategories(DEFAULT_CATEGORIES);
        setTotalBudget(0);
      }
    } catch { /* ignore */ }
  }, [planKey]);

  const savePlan = () => {
    if (!planKey) return;
    const plan: BudgetPlan = { totalBudget, currency, categories, savedAt: new Date().toISOString() };
    localStorage.setItem(planKey, JSON.stringify(plan));
    toast({ title: "Plan saved", description: "Budget allocation saved for this event." });
  };

  // ── Auto-populate from event ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedEventId) return;
    const ev: any = events.find((e: any) => e.id === selectedEventId);
    if (ev) {
      if (ev.budget && Number(ev.budget) > 0) setTotalBudget(Number(ev.budget));
      if (ev.currency) setCurrency(ev.currency);
    }
  }, [selectedEventId]);

  // ── Fetch actual spend from budget_items ───────────────────────────────────
  const { data: budgetItems = [] } = useQuery<any[]>({
    queryKey: ["/api/events", selectedEventId, "budget"],
    enabled: !!selectedEventId,
  });

  const actualByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of budgetItems) {
      const cat = item.category || "Other";
      map[cat] = (map[cat] || 0) + parseFloat(item.actualCost || item.estimatedCost || "0");
    }
    return map;
  }, [budgetItems]);

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalAllocated   = categories.reduce((s, c) => s + c.percentage, 0);
  const totalActualSpend = Object.values(actualByCategory).reduce((s, v) => s + v, 0);
  const remaining        = totalBudget - totalActualSpend;
  const sym              = CURRENCY_SYMBOLS[currency] || "$";

  // ── Slider change: rebalance unlocked categories ───────────────────────────
  const handleSliderChange = (id: string, newPct: number) => {
    const clamped = Math.min(Math.max(newPct, 0), 100);
    const locked  = categories.filter(c => c.id === id || c.locked);
    const lockedTotal = locked.reduce((s, c) => s + (c.id === id ? clamped : c.percentage), 0);
    const unlocked = categories.filter(c => c.id !== id && !c.locked);
    const freePool = Math.max(100 - lockedTotal, 0);
    const prevUnlockedTotal = unlocked.reduce((s, c) => s + c.percentage, 0);

    const updated = categories.map(c => {
      if (c.id === id) return { ...c, percentage: clamped };
      if (c.locked) return c;
      const share = prevUnlockedTotal > 0 ? c.percentage / prevUnlockedTotal : 1 / unlocked.length;
      return { ...c, percentage: Math.max(parseFloat((share * freePool).toFixed(1)), 0) };
    });
    setCategories(updated);
  };

  const toggleLock = (id: string) =>
    setCategories(prev => prev.map(c => c.id === id ? { ...c, locked: !c.locked } : c));

  const removeCategory = (id: string) => {
    const removed = categories.find(c => c.id === id);
    if (!removed) return;
    const rest    = categories.filter(c => c.id !== id);
    const pool    = 100 - rest.reduce((s, c) => s + c.percentage, 0) + removed.percentage;
    const unlocked = rest.filter(c => !c.locked);
    const prevTotal = unlocked.reduce((s, c) => s + c.percentage, 0) + removed.percentage;
    const updated = rest.map(c => {
      if (c.locked) return c;
      const share = prevTotal > 0 ? (c.percentage / prevTotal) : 1 / unlocked.length;
      return { ...c, percentage: parseFloat((share * (pool + (c.percentage / (prevTotal || 1)) * removed.percentage)).toFixed(1)) };
    });
    setCategories(updated);
  };

  const addCategory = () => {
    if (!addName.trim()) return;
    const unlocked = categories.filter(c => !c.locked);
    const defaultPct = 5;
    const steal = defaultPct / Math.max(unlocked.length, 1);
    const updated: PlanCategory[] = [
      ...categories.map(c => c.locked ? c : { ...c, percentage: parseFloat(Math.max(c.percentage - steal, 0).toFixed(1)) }),
      { id: Date.now().toString(), name: addName.trim(), color: addColor, percentage: defaultPct, locked: false }
    ];
    setCategories(updated);
    setAddName("");
    setShowAdd(false);
    toast({ title: "Category added", description: `"${addName.trim()}" added with 5% allocation.` });
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: editName.trim() } : c));
    setEditingId(null);
  };

  const setColor = (id: string, color: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, color } : c));
    setShowColorPicker(null);
  };

  const resetToDefaults = () => {
    setCategories(DEFAULT_CATEGORIES);
    toast({ title: "Reset", description: "Categories reset to defaults." });
  };

  const normalise = () => {
    const total = categories.reduce((s, c) => s + c.percentage, 0);
    if (total === 0) return;
    setCategories(prev => prev.map(c => ({ ...c, percentage: parseFloat(((c.percentage / total) * 100).toFixed(1)) })));
  };

  // ── Close color picker on outside click ───────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedEvent: any = events.find((e: any) => e.id === selectedEventId);

  return (
    <PlannerLayout>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <PieChart className="w-6 h-6" /> Interactive Budget Planner
          </h1>
          <p className="text-white/60 text-sm">Visually allocate your budget across categories and track actual spend</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={resetToDefaults}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>
          <Button size="sm" className="bg-[#C9A961] text-[#330311] hover:bg-[#b8983f] font-semibold" onClick={savePlan} disabled={!selectedEventId}>
            Save Plan
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 space-y-6">

        {/* ── Event & Budget Setup ──────────────────────────────────────────── */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="w-4 h-4 text-[#8B1538]" />Budget Setup</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm mb-1 block">Event</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger><SelectValue placeholder="Select event…" /></SelectTrigger>
                  <SelectContent>
                    {(events as any[]).map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        <span className="font-medium">{e.name}</span>
                        <span className="text-xs text-gray-400 ml-1">· {e.guestCount} guests</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-1 block">Total Budget</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={totalBudget || ""}
                    onChange={e => setTotalBudget(Number(e.target.value))}
                    placeholder="0"
                    className="flex-1"
                  />
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(CURRENCY_SYMBOLS).map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedEvent && (
                <div className="bg-[#8B1538]/5 border border-[#8B1538]/20 rounded-lg p-3 flex flex-col justify-center">
                  <p className="text-xs text-[#8B1538] font-semibold uppercase tracking-wide">{selectedEvent.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(selectedEvent.startDate).toLocaleDateString()} · {selectedEvent.guestCount} guests · {selectedEvent.type}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Summary Stats ─────────────────────────────────────────────────── */}
        {totalBudget > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Total Budget", value: fmt(totalBudget, sym),
                icon: <DollarSign className="w-4 h-4" />, color: "text-[#8B1538]", bg: "bg-[#8B1538]/5 border-[#8B1538]/20"
              },
              {
                label: "Allocated", value: `${totalAllocated.toFixed(1)}%`,
                sub: fmt((totalAllocated / 100) * totalBudget, sym),
                icon: <Calculator className="w-4 h-4" />,
                color: Math.abs(totalAllocated - 100) < 0.5 ? "text-green-700" : totalAllocated > 100 ? "text-red-600" : "text-amber-600",
                bg: Math.abs(totalAllocated - 100) < 0.5 ? "bg-green-50 border-green-200" : totalAllocated > 100 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
              },
              {
                label: "Actual Spent", value: fmt(totalActualSpend, sym),
                sub: totalBudget > 0 ? `${((totalActualSpend / totalBudget) * 100).toFixed(1)}% of budget` : undefined,
                icon: <BarChart2 className="w-4 h-4" />, color: "text-gray-700", bg: "bg-gray-50 border-gray-200"
              },
              {
                label: remaining >= 0 ? "Remaining" : "Over Budget",
                value: fmt(Math.abs(remaining), sym),
                icon: remaining >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
                color: remaining >= 0 ? "text-green-700" : "text-red-600",
                bg: remaining >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              },
            ].map(stat => (
              <Card key={stat.label} className={`border ${stat.bg}`}>
                <CardContent className="p-4">
                  <div className={`flex items-center gap-1.5 mb-1 ${stat.color}`}>
                    {stat.icon}
                    <span className="text-xs font-medium uppercase tracking-wide">{stat.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  {stat.sub && <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Allocation warning ─────────────────────────────────────────────── */}
        {Math.abs(totalAllocated - 100) > 0.5 && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border ${totalAllocated > 100 ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              {totalAllocated > 100
                ? `Over-allocated by ${(totalAllocated - 100).toFixed(1)}%. Adjust categories or `
                : `Under-allocated by ${(100 - totalAllocated).toFixed(1)}%. `}
            </span>
            <button onClick={normalise} className="underline font-medium">Normalise to 100%</button>
          </div>
        )}

        {/* ── Tabs: Plan / Compare ─────────────────────────────────────────── */}
        <div className="flex gap-2 border-b border-gray-200 pb-0">
          {(["plan", "compare"] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t
                  ? "border-[#8B1538] text-[#8B1538]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "plan" ? "📊 Allocation Plan" : "📈 Planned vs Actual"}
            </button>
          ))}
        </div>

        {/* ══ PLAN TAB ════════════════════════════════════════════════════════ */}
        {activeTab === "plan" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Donut chart */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><PieChart className="w-4 h-4 text-[#8B1538]" />Visual Breakdown</CardTitle></CardHeader>
              <CardContent>
                <DonutChart
                  categories={categories}
                  totalBudget={totalBudget || 1}
                  currency={currency}
                  hoveredId={hoveredId}
                  setHoveredId={setHoveredId}
                />
                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 gap-y-1.5 gap-x-2">
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      className={`flex items-center gap-1.5 text-xs cursor-pointer rounded px-1 py-0.5 transition-colors ${hoveredId === cat.id ? "bg-gray-100" : ""}`}
                      onMouseEnter={() => setHoveredId(cat.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                      <span className="truncate text-gray-600">{cat.name}</span>
                      <span className="ml-auto text-gray-400 flex-shrink-0">{cat.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sliders */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2"><Calculator className="w-4 h-4 text-[#8B1538]" />Category Allocation</span>
                  <button
                    onClick={() => setShowAdd(v => !v)}
                    className="flex items-center gap-1 text-xs text-[#8B1538] hover:text-[#5a0e24] font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Category
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">

                {/* Add category form */}
                {showAdd && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <Input
                      value={addName}
                      onChange={e => setAddName(e.target.value)}
                      placeholder="Category name…"
                      className="flex-1 h-8 text-sm"
                      onKeyDown={e => e.key === "Enter" && addCategory()}
                    />
                    <div className="relative">
                      <button
                        onClick={() => setShowColorPicker(showColorPicker === "new" ? null : "new")}
                        className="w-8 h-8 rounded border border-gray-300 flex-shrink-0"
                        style={{ background: addColor }}
                      />
                      {showColorPicker === "new" && (
                        <div ref={colorPickerRef} className="absolute z-50 right-0 top-9 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1 w-32">
                          {COLOR_PALETTE.map(c => (
                            <button key={c} onClick={() => { setAddColor(c); setShowColorPicker(null); }}
                              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                              style={{ background: c, borderColor: addColor === c ? "#000" : "transparent" }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" className="h-8 bg-[#8B1538] hover:bg-[#5a0e24] text-white" onClick={addCategory}><Check className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowAdd(false)}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                )}

                {/* Category rows */}
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      className={`group rounded-lg border p-2.5 transition-colors ${hoveredId === cat.id ? "border-gray-300 bg-gray-50" : "border-gray-100 bg-white"}`}
                      onMouseEnter={() => setHoveredId(cat.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {/* Color swatch */}
                        <div className="relative">
                          <button
                            onClick={() => setShowColorPicker(showColorPicker === cat.id ? null : cat.id)}
                            className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0 hover:scale-110 transition-transform"
                            style={{ background: cat.color }}
                          />
                          {showColorPicker === cat.id && (
                            <div ref={colorPickerRef} className="absolute z-50 left-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1 w-32">
                              {COLOR_PALETTE.map(c => (
                                <button key={c} onClick={() => setColor(cat.id, c)}
                                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                                  style={{ background: c, borderColor: cat.color === c ? "#000" : "transparent" }}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Name / edit */}
                        {editingId === cat.id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-6 text-xs flex-1" autoFocus onKeyDown={e => e.key === "Enter" && saveEdit(cat.id)} />
                            <button onClick={() => saveEdit(cat.id)} className="text-green-600 hover:text-green-800"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-gray-700 flex-1 truncate">{cat.name}</span>
                        )}

                        {/* Amount */}
                        <span className="text-xs text-gray-500 flex-shrink-0">{fmt((cat.percentage / 100) * (totalBudget || 0), sym)}</span>
                        <span className="text-xs font-semibold w-10 text-right flex-shrink-0">{cat.percentage.toFixed(1)}%</span>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          {editingId !== cat.id && (
                            <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="p-0.5 text-gray-400 hover:text-gray-700">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          <button onClick={() => toggleLock(cat.id)} className={`p-0.5 ${cat.locked ? "text-amber-500" : "text-gray-400 hover:text-amber-500"}`}>
                            {cat.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                          <button onClick={() => removeCategory(cat.id)} className="p-0.5 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Slider */}
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={0.5}
                          value={cat.percentage}
                          disabled={cat.locked}
                          onChange={e => handleSliderChange(cat.id, parseFloat(e.target.value))}
                          className="flex-1 h-1.5 appearance-none rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ accentColor: cat.color }}
                        />
                        {cat.locked && <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      </div>

                      {/* Actual vs planned inline */}
                      {(actualByCategory[cat.name] || 0) > 0 && (
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                          <span>Actual: <span className="font-medium text-gray-700">{fmt(actualByCategory[cat.name], sym)}</span></span>
                          {actualByCategory[cat.name] > (cat.percentage / 100) * totalBudget && totalBudget > 0 && (
                            <Badge className="text-[10px] py-0 px-1.5 bg-red-100 text-red-700 border-red-200">Over</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══ COMPARE TAB ═════════════════════════════════════════════════════ */}
        {activeTab === "compare" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart2 className="w-4 h-4 text-[#8B1538]" />Planned vs Actual Spend</CardTitle></CardHeader>
              <CardContent>
                {totalBudget > 0 ? (
                  <BarChart
                    categories={categories}
                    totalBudget={totalBudget}
                    currency={currency}
                    actualByCategory={actualByCategory}
                  />
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">Set a total budget to see the comparison chart.</p>
                )}
              </CardContent>
            </Card>

            {/* Over/under table */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#8B1538]" />Variance Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {categories.map(cat => {
                    const planned = (cat.percentage / 100) * totalBudget;
                    const actual  = actualByCategory[cat.name] || 0;
                    const variance = planned - actual;
                    if (planned === 0 && actual === 0) return null;
                    return (
                      <div key={cat.id} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                          <span className="text-gray-700 truncate max-w-[120px]">{cat.name}</span>
                        </div>
                        <span className={`font-medium text-xs ${variance >= 0 ? "text-green-700" : "text-red-600"}`}>
                          {variance >= 0 ? "+" : ""}{fmt(variance, sym)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between pt-2 font-semibold border-t border-gray-200 text-sm">
                    <span>Total Variance</span>
                    <span className={remaining >= 0 ? "text-green-700" : "text-red-600"}>
                      {remaining >= 0 ? "+" : ""}{fmt(remaining, sym)}
                    </span>
                  </div>
                </div>
                {totalActualSpend === 0 && (
                  <p className="text-xs text-gray-400 mt-3 text-center">No actual spend logged yet for this event. Add items in Budget Setup to see variance.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Tip ───────────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 bg-[#8B1538]/5 border border-[#8B1538]/15 rounded-lg text-sm text-gray-600">
          <span className="text-[#8B1538] text-base">💡</span>
          <span>
            <strong className="text-[#8B1538]">Tips:</strong> Lock a category (🔒) to keep its percentage fixed while adjusting others.
            Actual spend is pulled from line items entered in <strong>Budget Setup</strong>.
            Click <strong>Save Plan</strong> to keep your allocation for next time.
          </span>
        </div>

      </div>
    </PlannerLayout>
  );
}
