import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import PlannerSidebar from "@/components/PlannerSidebar";
import { useAuth } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  AlertTriangle,
  Percent,
  Layers,
  PieChart,
  Download,
} from "lucide-react";

type PeriodPreset = "this-month" | "this-quarter" | "this-year" | "last-year" | "custom";

interface EventPL {
  eventId: number;
  eventName: string;
  type: string;
  currency: string;
  totalRevenue: number;
  collectedRevenue: number;
  totalCosts: number;
  paidCosts: number;
  vendorPaid: number;
  vendorQuoted: number;
  grossProfit: number;
  margin: number;
}

interface PLReport {
  period: { from: string; to: string };
  events: EventPL[];
  totals: {
    totalRevenue: number;
    collectedRevenue: number;
    totalCosts: number;
    grossProfit: number;
    margin: number;
  };
}

function getDateRange(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const today = fmt(now);

  switch (preset) {
    case "this-month":
      return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case "this-quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { from: fmt(new Date(now.getFullYear(), q * 3, 1)), to: today };
    }
    case "this-year":
      return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: today };
    case "last-year":
      return {
        from: fmt(new Date(now.getFullYear() - 1, 0, 1)),
        to: fmt(new Date(now.getFullYear() - 1, 11, 31)),
      };
    default:
      return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: today };
  }
}

const currency = (val: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

const pct = (val: number) => `${val.toFixed(1)}%`;

export default function ProfitLossPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'admin' || user?.role === 'planner';
  const [preset, setPreset] = useState<PeriodPreset>("this-year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "markup" | "commission">("overview");
  const reportRef = useRef<HTMLDivElement>(null);

  const range = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) return { from: customFrom, to: customTo };
    return getDateRange(preset);
  }, [preset, customFrom, customTo]);

  const { data, isLoading } = useQuery<PLReport>({
    queryKey: ["/api/reports/profit-loss", range.from, range.to],
    queryFn: async () => {
      const res = await fetch(`/api/reports/profit-loss?from=${range.from}&to=${range.to}`);
      if (!res.ok) throw new Error("Failed to fetch P&L report");
      return res.json();
    },
    enabled: isManagement,
  });

  if (!isManagement) {
    return (
      <div className="flex min-h-screen">
        <PlannerSidebar />
        <main className="flex-1 lg:ml-60 p-8 bg-gradient-to-br from-[#330311] to-[#2a0209] min-h-screen flex items-center justify-center">
          <div className="text-center text-white/80">
            <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-white/40" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
            <p>Financial data is only available to key management personnel.</p>
          </div>
        </main>
      </div>
    );
  }

  const sortedEvents = useMemo(() => {
    if (!data?.events) return [];
    return [...data.events].sort((a, b) => sortAsc ? a.grossProfit - b.grossProfit : b.grossProfit - a.grossProfit);
  }, [data?.events, sortAsc]);

  const bestEvent = sortedEvents.length > 0 ? sortedEvents.reduce((a, b) => a.grossProfit > b.grossProfit ? a : b) : null;
  const worstEvent = sortedEvents.length > 0 ? sortedEvents.reduce((a, b) => a.grossProfit < b.grossProfit ? a : b) : null;

  const totals = data?.totals ?? { totalRevenue: 0, collectedRevenue: 0, totalCosts: 0, grossProfit: 0, margin: 0 };
  const outstanding = totals.totalRevenue - totals.collectedRevenue;
  const maxBar = Math.max(totals.totalRevenue, totals.totalCosts, 1);

  const totalVendorCosts = useMemo(() => {
    if (!data?.events) return 0;
    return data.events.reduce((sum, ev) => sum + ev.vendorPaid, 0);
  }, [data?.events]);

  const totalVendorQuoted = useMemo(() => {
    if (!data?.events) return 0;
    return data.events.reduce((sum, ev) => sum + ev.vendorQuoted, 0);
  }, [data?.events]);

  const operationalCosts = totals.totalCosts - totalVendorCosts;

  const markupData = useMemo(() => {
    if (!data?.events) return [];
    return data.events
      .filter(ev => ev.vendorQuoted > 0)
      .map(ev => {
        const markup = ev.totalRevenue > 0 && ev.vendorQuoted > 0
          ? ((ev.totalRevenue - ev.vendorQuoted) / ev.vendorQuoted) * 100
          : 0;
        return { ...ev, markup: Math.round(markup * 10) / 10 };
      })
      .sort((a, b) => b.markup - a.markup);
  }, [data?.events]);

  const commissionData = useMemo(() => {
    if (!data?.events) return [];
    const defaultRate = 15;
    return data.events.map(ev => {
      const commission = ev.totalRevenue * (defaultRate / 100);
      const netAfterCommission = ev.grossProfit - commission;
      return {
        ...ev,
        commissionRate: defaultRate,
        commissionAmount: Math.round(commission),
        netAfterCommission: Math.round(netAfterCommission),
      };
    });
  }, [data?.events]);

  const totalCommission = commissionData.reduce((sum, ev) => sum + ev.commissionAmount, 0);

  const handleExportCSV = () => {
    if (!data?.events) return;
    const headers = ["Event", "Type", "Revenue", "Costs", "Vendor Costs", "Profit", "Margin %"];
    const rows = sortedEvents.map(ev => [
      ev.eventName,
      ev.type,
      ev.totalRevenue,
      ev.totalCosts,
      ev.vendorQuoted,
      ev.grossProfit,
      ev.margin
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pl-report-${range.from}-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const presets: { label: string; value: PeriodPreset }[] = [
    { label: "This Month", value: "this-month" },
    { label: "This Quarter", value: "this-quarter" },
    { label: "This Year", value: "this-year" },
    { label: "Last Year", value: "last-year" },
    { label: "Custom", value: "custom" },
  ];

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: BarChart3 },
    { key: "markup" as const, label: "Markup Analysis", icon: Percent },
    { key: "commission" as const, label: "Commission Tracking", icon: PieChart },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209]">
      <PlannerSidebar />

      <main className="flex-1 lg:ml-60 p-6 print:ml-0 print:p-4" ref={reportRef}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-amber-400" />
              Profit & Loss Report
            </h1>
            <p className="text-white/50 text-sm mt-1">
              {range.from} to {range.to}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors print:hidden"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors print:hidden"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 print:hidden">
          {presets.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                preset === p.value
                  ? "bg-amber-500 text-black"
                  : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
          {preset === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-white/50">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex gap-1 mb-6 print:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/60 text-sm">Total Revenue</span>
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-white">{currency(totals.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-xs">{currency(totals.collectedRevenue)} collected</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/60 text-sm">Total Costs</span>
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-2xl font-bold text-white">{currency(totals.totalCosts)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-red-400 text-xs">{currency(totalVendorCosts)} vendor costs</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/60 text-sm">Gross Profit</span>
                  {totals.grossProfit >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <p className={`text-2xl font-bold ${totals.grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {currency(totals.grossProfit)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {totals.grossProfit >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className={`text-xs ${totals.grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {totals.grossProfit >= 0 ? "profit" : "loss"}
                  </span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/60 text-sm">Profit Margin</span>
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                </div>
                <p className={`text-2xl font-bold ${totals.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {pct(totals.margin)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {totals.margin >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className={`text-xs ${totals.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    margin
                  </span>
                </div>
              </div>
            </div>

            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-amber-400" />
                      Revenue vs Costs
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white/70">Revenue</span>
                          <span className="text-emerald-400 font-medium">{currency(totals.totalRevenue)}</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                            style={{ width: `${(totals.totalRevenue / maxBar) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white/70">Costs</span>
                          <span className="text-red-400 font-medium">{currency(totals.totalCosts)}</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-700"
                            style={{ width: `${(totals.totalCosts / maxBar) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white/70">Profit</span>
                          <span className={`font-medium ${totals.grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {currency(totals.grossProfit)}
                          </span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-6 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              totals.grossProfit >= 0
                                ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                                : "bg-gradient-to-r from-red-600 to-red-400"
                            }`}
                            style={{ width: `${(Math.abs(totals.grossProfit) / maxBar) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-amber-400" />
                      Revenue Breakdown
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white/70">Collected</span>
                          <span className="text-emerald-400 font-medium">{currency(totals.collectedRevenue)}</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                            style={{ width: totals.totalRevenue > 0 ? `${(totals.collectedRevenue / totals.totalRevenue) * 100}%` : "0%" }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white/70">Outstanding</span>
                          <span className="text-amber-400 font-medium">{currency(outstanding)}</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
                            style={{ width: totals.totalRevenue > 0 ? `${(outstanding / totals.totalRevenue) * 100}%` : "0%" }}
                          />
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                        <span className="text-white/50 text-sm">Collection Rate</span>
                        <span className="text-white font-bold text-lg">
                          {totals.totalRevenue > 0 ? pct((totals.collectedRevenue / totals.totalRevenue) * 100) : "0.0%"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
                  <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-400" />
                    Cost Breakdown
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Vendor Payments (final_amount)</p>
                      <p className="text-xl font-bold text-white">{currency(totalVendorCosts)}</p>
                      <p className="text-white/40 text-xs mt-1">
                        {totals.totalCosts > 0 ? pct((totalVendorCosts / totals.totalCosts) * 100) : "0%"} of total costs
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Operational Expenses</p>
                      <p className="text-xl font-bold text-white">{currency(operationalCosts)}</p>
                      <p className="text-white/40 text-xs mt-1">
                        {totals.totalCosts > 0 ? pct((operationalCosts / totals.totalCosts) * 100) : "0%"} of total costs
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Vendor Quoted Total</p>
                      <p className="text-xl font-bold text-white">{currency(totalVendorQuoted)}</p>
                      <p className="text-white/40 text-xs mt-1">
                        {totalVendorQuoted > 0 && totalVendorCosts > 0
                          ? `${totalVendorCosts > totalVendorQuoted ? "+" : ""}${pct(((totalVendorCosts - totalVendorQuoted) / totalVendorQuoted) * 100)} vs quoted`
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {(bestEvent || worstEvent) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {bestEvent && (
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-emerald-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-5 h-5 text-amber-400" />
                          <span className="text-emerald-400 font-semibold text-sm">Best Performing Event</span>
                        </div>
                        <p className="text-white font-bold text-lg">{bestEvent.eventName}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-emerald-400">{currency(bestEvent.grossProfit)} profit</span>
                          <span className="text-white/50">{pct(bestEvent.margin)} margin</span>
                        </div>
                      </div>
                    )}
                    {worstEvent && (
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-red-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                          <span className="text-red-400 font-semibold text-sm">Worst Performing Event</span>
                        </div>
                        <p className="text-white font-bold text-lg">{worstEvent.eventName}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className={worstEvent.grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}>
                            {currency(worstEvent.grossProfit)} {worstEvent.grossProfit >= 0 ? "profit" : "loss"}
                          </span>
                          <span className="text-white/50">{pct(worstEvent.margin)} margin</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                  <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-white font-semibold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-amber-400" />
                      Event P&L Comparison
                    </h2>
                    <button
                      onClick={() => setSortAsc(!sortAsc)}
                      className="text-xs text-white/50 hover:text-white/80 transition-colors print:hidden"
                    >
                      Sort by Profit {sortAsc ? "↑" : "↓"}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-white/50 text-left border-b border-white/10">
                          <th className="px-5 py-3 font-medium">#</th>
                          <th className="px-5 py-3 font-medium">Event</th>
                          <th className="px-5 py-3 font-medium">Type</th>
                          <th className="px-5 py-3 font-medium text-right">Revenue</th>
                          <th className="px-5 py-3 font-medium text-right">Costs</th>
                          <th className="px-5 py-3 font-medium text-right">Vendor Costs</th>
                          <th className="px-5 py-3 font-medium text-right">Profit</th>
                          <th className="px-5 py-3 font-medium text-right">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedEvents.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-5 py-8 text-center text-white/40">
                              No events found for this period
                            </td>
                          </tr>
                        ) : (
                          sortedEvents.map((ev, idx) => {
                            const isBest = bestEvent && ev.eventId === bestEvent.eventId;
                            const isWorst = worstEvent && ev.eventId === worstEvent.eventId;
                            return (
                              <tr
                                key={ev.eventId}
                                className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                                  isBest ? "bg-emerald-500/5" : isWorst ? "bg-red-500/5" : ""
                                }`}
                              >
                                <td className="px-5 py-3 text-white/40 text-xs">{idx + 1}</td>
                                <td className="px-5 py-3 text-white font-medium flex items-center gap-2">
                                  {isBest && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                                  {isWorst && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                                  {ev.eventName}
                                </td>
                                <td className="px-5 py-3 text-white/60 capitalize">{ev.type}</td>
                                <td className="px-5 py-3 text-emerald-400 text-right">{currency(ev.totalRevenue)}</td>
                                <td className="px-5 py-3 text-red-400 text-right">{currency(ev.totalCosts)}</td>
                                <td className="px-5 py-3 text-white/60 text-right">{currency(ev.vendorQuoted)}</td>
                                <td className={`px-5 py-3 font-semibold text-right ${ev.grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  {currency(ev.grossProfit)}
                                </td>
                                <td className={`px-5 py-3 text-right ${ev.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  {pct(ev.margin)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === "markup" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Average Markup</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {markupData.length > 0
                        ? pct(markupData.reduce((s, e) => s + e.markup, 0) / markupData.length)
                        : "N/A"}
                    </p>
                    <p className="text-white/40 text-xs mt-1">across {markupData.length} events with vendor quotes</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Highest Markup</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {markupData.length > 0 ? pct(markupData[0].markup) : "N/A"}
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      {markupData.length > 0 ? markupData[0].eventName : ""}
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Total Markup Value</p>
                    <p className="text-2xl font-bold text-white">
                      {currency(totals.totalRevenue - totalVendorQuoted)}
                    </p>
                    <p className="text-white/40 text-xs mt-1">revenue over vendor quoted costs</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                  <div className="p-5 border-b border-white/10">
                    <h2 className="text-white font-semibold flex items-center gap-2">
                      <Percent className="w-5 h-5 text-amber-400" />
                      Markup by Event
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-white/50 text-left border-b border-white/10">
                          <th className="px-5 py-3 font-medium">Event</th>
                          <th className="px-5 py-3 font-medium text-right">Client Revenue</th>
                          <th className="px-5 py-3 font-medium text-right">Vendor Quoted</th>
                          <th className="px-5 py-3 font-medium text-right">Vendor Final</th>
                          <th className="px-5 py-3 font-medium text-right">Markup Value</th>
                          <th className="px-5 py-3 font-medium text-right">Markup %</th>
                          <th className="px-5 py-3 font-medium text-center">Visual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {markupData.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-5 py-8 text-center text-white/40">
                              No events with vendor quotes found
                            </td>
                          </tr>
                        ) : (
                          markupData.map((ev) => {
                            const markupValue = ev.totalRevenue - ev.vendorQuoted;
                            const maxMarkup = Math.max(...markupData.map(e => Math.abs(e.markup)), 1);
                            return (
                              <tr key={ev.eventId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-5 py-3 text-white font-medium">{ev.eventName}</td>
                                <td className="px-5 py-3 text-emerald-400 text-right">{currency(ev.totalRevenue)}</td>
                                <td className="px-5 py-3 text-white/60 text-right">{currency(ev.vendorQuoted)}</td>
                                <td className="px-5 py-3 text-white/60 text-right">{currency(ev.vendorPaid)}</td>
                                <td className={`px-5 py-3 text-right font-medium ${markupValue >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  {currency(markupValue)}
                                </td>
                                <td className={`px-5 py-3 text-right font-semibold ${ev.markup >= 0 ? "text-amber-400" : "text-red-400"}`}>
                                  {pct(ev.markup)}
                                </td>
                                <td className="px-5 py-3">
                                  <div className="w-24 mx-auto bg-white/5 rounded-full h-3 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${ev.markup >= 0 ? "bg-amber-500" : "bg-red-500"}`}
                                      style={{ width: `${Math.min((Math.abs(ev.markup) / maxMarkup) * 100, 100)}%` }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === "commission" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Total Commission (15%)</p>
                    <p className="text-2xl font-bold text-amber-400">{currency(totalCommission)}</p>
                    <p className="text-white/40 text-xs mt-1">based on total revenue</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Net After Commission</p>
                    <p className={`text-2xl font-bold ${totals.grossProfit - totalCommission >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {currency(totals.grossProfit - totalCommission)}
                    </p>
                    <p className="text-white/40 text-xs mt-1">gross profit less commission</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Effective Margin After Commission</p>
                    <p className={`text-2xl font-bold ${(totals.grossProfit - totalCommission) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {totals.totalRevenue > 0
                        ? pct(((totals.grossProfit - totalCommission) / totals.totalRevenue) * 100)
                        : "0.0%"}
                    </p>
                    <p className="text-white/40 text-xs mt-1">net margin</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                  <div className="p-5 border-b border-white/10">
                    <h2 className="text-white font-semibold flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-amber-400" />
                      Commission by Event
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-white/50 text-left border-b border-white/10">
                          <th className="px-5 py-3 font-medium">Event</th>
                          <th className="px-5 py-3 font-medium text-right">Revenue</th>
                          <th className="px-5 py-3 font-medium text-right">Rate</th>
                          <th className="px-5 py-3 font-medium text-right">Commission</th>
                          <th className="px-5 py-3 font-medium text-right">Gross Profit</th>
                          <th className="px-5 py-3 font-medium text-right">Net After Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissionData.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-8 text-center text-white/40">
                              No events found for this period
                            </td>
                          </tr>
                        ) : (
                          commissionData.map((ev) => (
                            <tr key={ev.eventId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="px-5 py-3 text-white font-medium">{ev.eventName}</td>
                              <td className="px-5 py-3 text-emerald-400 text-right">{currency(ev.totalRevenue)}</td>
                              <td className="px-5 py-3 text-amber-400 text-right">{ev.commissionRate}%</td>
                              <td className="px-5 py-3 text-amber-400 text-right font-medium">{currency(ev.commissionAmount)}</td>
                              <td className={`px-5 py-3 text-right ${ev.grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {currency(ev.grossProfit)}
                              </td>
                              <td className={`px-5 py-3 text-right font-semibold ${ev.netAfterCommission >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {currency(ev.netAfterCommission)}
                              </td>
                            </tr>
                          ))
                        )}
                        {commissionData.length > 0 && (
                          <tr className="border-t-2 border-white/20 bg-white/5">
                            <td className="px-5 py-3 text-white font-bold">TOTALS</td>
                            <td className="px-5 py-3 text-emerald-400 text-right font-bold">{currency(totals.totalRevenue)}</td>
                            <td className="px-5 py-3 text-amber-400 text-right font-bold">15%</td>
                            <td className="px-5 py-3 text-amber-400 text-right font-bold">{currency(totalCommission)}</td>
                            <td className={`px-5 py-3 text-right font-bold ${totals.grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {currency(totals.grossProfit)}
                            </td>
                            <td className={`px-5 py-3 text-right font-bold ${(totals.grossProfit - totalCommission) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {currency(totals.grossProfit - totalCommission)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}