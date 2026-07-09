import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PlannerSidebar from "@/components/PlannerSidebar";
import {
  Search, Download, Filter, Clock, User, Shield, Activity,
  ChevronLeft, ChevronRight, FileText, Eye, AlertTriangle,
  RefreshCw, ArrowRight, Calendar, Printer
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";

interface AuditEntry {
  id: string;
  action: string;
  source: string;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  target: string | null;
  targetType: string | null;
  fieldChanged: string | null;
  oldValue: any;
  newValue: any;
  details: Record<string, any>;
  timestamp: string;
}

interface AuditResponse {
  logs: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

function getActionColor(action: string): string {
  const a = action?.toLowerCase() || "";
  if (a.includes("delete") || a.includes("removed")) return "bg-red-500/20 text-red-300 border-red-500/30";
  if (a.includes("create") || a.includes("created") || a.includes("register")) return "bg-green-500/20 text-green-300 border-green-500/30";
  if (a.includes("update") || a.includes("updated") || a.includes("status_changed")) return "bg-blue-500/20 text-blue-300 border-blue-500/30";
  if (a.includes("login") || a.includes("auth")) return "bg-purple-500/20 text-purple-300 border-purple-500/30";
  if (a.includes("view") || a.includes("read")) return "bg-gray-500/20 text-gray-300 border-gray-500/30";
  return "bg-amber-500/20 text-amber-300 border-amber-500/30";
}

function getSourceIcon(source: string) {
  switch (source) {
    case "activity_audit": return <Activity className="w-4 h-4" />;
    case "planner_activity": return <Eye className="w-4 h-4" />;
    case "user_audit": return <Shield className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
}

function getSourceLabel(source: string) {
  switch (source) {
    case "activity_audit": return "Activity Change";
    case "planner_activity": return "Planner Activity";
    case "user_audit": return "User Audit";
    default: return source;
  }
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

function exportCSV(logs: AuditEntry[]) {
  const headers = ["Timestamp", "User", "Email", "Action", "Source", "Target", "Target Type", "Field Changed", "Old Value", "New Value"];
  const rows = logs.map(l => [
    l.timestamp,
    l.userName,
    l.userEmail || "",
    l.action,
    getSourceLabel(l.source),
    l.target || "",
    l.targetType || "",
    l.fieldChanged || "",
    formatValue(l.oldValue),
    formatValue(l.newValue),
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditTrailPage() {
  const [searchUser, setSearchUser] = useState("");
  const [searchAction, setSearchAction] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (searchUser) p.set("user", searchUser);
    if (searchAction) p.set("action", searchAction);
    if (sourceFilter && sourceFilter !== "all") p.set("source", sourceFilter);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    p.set("limit", String(pageSize));
    p.set("offset", String(page * pageSize));
    return p.toString();
  }, [searchUser, searchAction, sourceFilter, dateFrom, dateTo, page]);

  const { data, isLoading, refetch } = useQuery<AuditResponse>({
    queryKey: ["/api/audit-log?" + queryParams],
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const stats = useMemo(() => {
    if (!logs.length) return { total: 0, sources: {} as Record<string, number>, users: 0 };
    const sources: Record<string, number> = {};
    const userSet = new Set<string>();
    for (const l of logs) {
      sources[l.source] = (sources[l.source] || 0) + 1;
      if (l.userId) userSet.add(l.userId);
    }
    return { total, sources, users: userSet.size };
  }, [logs, total]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#16213e] via-[#1a1a2e] to-[#0f3460]">
      <PlannerSidebar />
      <main className="flex-1 lg:ml-60 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white font-['Poppins']">Audit Trail</h1>
              <p className="text-gray-400 mt-1">Comprehensive activity log across the platform</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="border-white/20 text-white hover:bg-white/10">
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
              {logs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => openPrintWindow({
                    title: "Audit Trail",
                    stats: [
                      { label: "Total Entries", value: total },
                      { label: "Unique Users", value: stats.users },
                      { label: "Activity Changes", value: stats.sources["activity_audit"] || 0 },
                      { label: "User Audits", value: stats.sources["user_audit"] || 0 },
                    ],
                    columns: [
                      { header: "Timestamp", key: "timestamp", format: (v: string) => formatTimestamp(v) },
                      { header: "User", key: "userName" },
                      { header: "Action", key: "action" },
                      { header: "Source", key: "source", format: (v: string) => getSourceLabel(v) },
                      { header: "Target", key: "target", format: (v: string | null) => v || "—" },
                      { header: "Field Changed", key: "fieldChanged", format: (v: string | null) => v || "—" },
                    ],
                    rows: logs,
                    orientation: "landscape",
                  })}
                >
                  <Printer className="w-4 h-4 mr-1" /> Print
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => logs.length && exportCSV(logs)} disabled={!logs.length}
                className="border-white/20 text-white hover:bg-white/10">
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20"><FileText className="w-5 h-5 text-blue-400" /></div>
                  <div>
                    <p className="text-xs text-gray-400">Total Entries</p>
                    <p className="text-xl font-bold text-white">{total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20"><Activity className="w-5 h-5 text-green-400" /></div>
                  <div>
                    <p className="text-xs text-gray-400">Activity Changes</p>
                    <p className="text-xl font-bold text-white">{stats.sources["activity_audit"] || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20"><Shield className="w-5 h-5 text-purple-400" /></div>
                  <div>
                    <p className="text-xs text-gray-400">User Audits</p>
                    <p className="text-xl font-bold text-white">{stats.sources["user_audit"] || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20"><User className="w-5 h-5 text-amber-400" /></div>
                  <div>
                    <p className="text-xs text-gray-400">Unique Users</p>
                    <p className="text-xl font-bold text-white">{stats.users}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2"><Filter className="w-4 h-4" /> Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search user..." value={searchUser} onChange={e => { setSearchUser(e.target.value); setPage(0); }}
                    className="pl-9 bg-white/5 border-white/20 text-white placeholder:text-gray-500" />
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search action..." value={searchAction} onChange={e => { setSearchAction(e.target.value); setPage(0); }}
                    className="pl-9 bg-white/5 border-white/20 text-white placeholder:text-gray-500" />
                </div>
                <Select value={sourceFilter} onValueChange={v => { setSourceFilter(v); setPage(0); }}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="activity_audit">Activity Changes</SelectItem>
                    <SelectItem value="planner_activity">Planner Activity</SelectItem>
                    <SelectItem value="user_audit">User Audit</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }}
                    className="pl-9 bg-white/5 border-white/20 text-white" placeholder="From date" />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }}
                    className="pl-9 bg-white/5 border-white/20 text-white" placeholder="To date" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 bg-white/5" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No audit entries found</p>
                  <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or check back later</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {logs.map((entry) => (
                    <div key={entry.id}
                      className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-1.5 rounded-md bg-white/5 text-gray-400 shrink-0">
                          {getSourceIcon(entry.source)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${getActionColor(entry.action)}`}>
                              {entry.action}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-white/20 text-gray-400">
                              {getSourceLabel(entry.source)}
                            </Badge>
                            {entry.targetType && (
                              <span className="text-xs text-gray-500">{entry.targetType}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="text-sm text-white font-medium">{entry.userName}</span>
                            {entry.userEmail && <span className="text-xs text-gray-500">{entry.userEmail}</span>}
                          </div>
                          {entry.fieldChanged && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                              <span>Changed <span className="text-gray-300 font-medium">{entry.fieldChanged}</span></span>
                              {entry.oldValue !== null && entry.newValue !== null && (
                                <>
                                  <span className="text-red-400/70 line-through truncate max-w-[120px]">{formatValue(entry.oldValue)}</span>
                                  <ArrowRight className="w-3 h-3 shrink-0" />
                                  <span className="text-green-400/70 truncate max-w-[120px]">{formatValue(entry.newValue)}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(entry.timestamp)}
                          </div>
                        </div>
                      </div>

                      {expandedId === entry.id && (
                        <div className="mt-3 ml-10 p-3 rounded-lg bg-white/5 border border-white/10 text-xs space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div><span className="text-gray-500">ID:</span> <span className="text-gray-300 font-mono">{entry.id}</span></div>
                            <div><span className="text-gray-500">User ID:</span> <span className="text-gray-300 font-mono">{entry.userId || "—"}</span></div>
                            {entry.target && <div><span className="text-gray-500">Target:</span> <span className="text-gray-300">{entry.target}</span></div>}
                            {entry.targetType && <div><span className="text-gray-500">Target Type:</span> <span className="text-gray-300">{entry.targetType}</span></div>}
                          </div>
                          {entry.oldValue !== null && (
                            <div>
                              <span className="text-gray-500">Old Value:</span>
                              <pre className="mt-1 p-2 rounded bg-black/30 text-red-300/80 overflow-auto max-h-24">{formatValue(entry.oldValue)}</pre>
                            </div>
                          )}
                          {entry.newValue !== null && (
                            <div>
                              <span className="text-gray-500">New Value:</span>
                              <pre className="mt-1 p-2 rounded bg-black/30 text-green-300/80 overflow-auto max-h-24">{formatValue(entry.newValue)}</pre>
                            </div>
                          )}
                          {Object.keys(entry.details).length > 0 && (
                            <div>
                              <span className="text-gray-500">Details:</span>
                              <pre className="mt-1 p-2 rounded bg-black/30 text-gray-300 overflow-auto max-h-24">{JSON.stringify(entry.details, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-white/10">
                  <p className="text-sm text-gray-400">
                    Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}
                      className="border-white/20 text-white hover:bg-white/10">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-400 flex items-center px-2">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                      className="border-white/20 text-white hover:bg-white/10">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {logs.length > 0 && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
                  <div className="space-y-4">
                    {logs.slice(0, 20).map((entry) => {
                      const d = new Date(entry.timestamp);
                      return (
                        <div key={entry.id} className="flex gap-4 ml-1">
                          <div className="relative z-10 w-6 h-6 rounded-full bg-[#16213e] border-2 border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-[#8B1538]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm text-white font-medium">{entry.userName}</span>
                              <Badge variant="outline" className={`text-[10px] ${getActionColor(entry.action)}`}>{entry.action}</Badge>
                            </div>
                            {entry.fieldChanged && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Changed {entry.fieldChanged}{entry.target ? ` on ${entry.targetType}` : ""}
                              </p>
                            )}
                            {!entry.fieldChanged && entry.target && (
                              <p className="text-xs text-gray-400 mt-0.5">{entry.target}</p>
                            )}
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} at {d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}