import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, Clock, Users, Timer, Activity, Wifi, WifiOff,
  Play, Square, CalendarDays, TrendingUp, User, BarChart3
} from "lucide-react";

export default function StaffTimeMonitoring() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [period, setPeriod] = useState("week");
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "tasks" | "live">("overview");
  const [timerTask, setTimerTask] = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/staff-monitoring", period],
    queryFn: () => fetch(`/api/staff-monitoring?period=${period}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: activeTimer } = useQuery<any>({
    queryKey: ["/api/task-timers/active"],
    refetchInterval: 10000,
  });

  const startTimer = useMutation({
    mutationFn: () => apiRequest("POST", "/api/task-timers/start", { taskTitle: timerTask || "General Work" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-timers/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff-monitoring"] });
      setTimerTask("");
      toast({ title: "Timer started" });
    },
  });

  const stopTimer = useMutation({
    mutationFn: () => apiRequest("POST", "/api/task-timers/stop", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-timers/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff-monitoring"] });
      toast({ title: "Timer stopped" });
    },
  });

  const formatMins = (mins: number) => {
    if (!mins || mins < 1) return "< 1 min";
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return d; }
  };

  const onlineNow = data?.onlineNow || [];
  const sessionSummary = data?.sessionSummary || [];
  const sessions = data?.sessions || [];
  const taskTimers = data?.taskTimers || [];
  const taskTimerByUser = data?.taskTimerByUser || [];
  const activeTimers = data?.activeTimers || [];

  const totalOnlineHours = sessionSummary.reduce((acc: number, s: any) => acc + Number(s.total_minutes || 0), 0) / 60;
  const totalTaskHours = taskTimerByUser.reduce((acc: number, s: any) => acc + Number(s.total_task_minutes || 0), 0) / 60;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/planner-dashboard")} className="mb-3">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Staff Time Monitoring</h1>
            <p className="text-xs sm:text-sm text-gray-500">Track online time and task durations</p>
          </div>
          <div className="flex gap-1 bg-white rounded-lg p-1 border shadow-sm">
            {[
              { key: "today", label: "Today" },
              { key: "week", label: "7 Days" },
              { key: "month", label: "30 Days" },
            ].map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  period === p.key ? "bg-[#8B1538] text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {activeTimer && (
          <Card className="mb-4 border-green-300 bg-green-50">
            <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-800">Timer Running:</span>
                <span className="text-sm text-green-700">{activeTimer.task_title}</span>
                <span className="text-xs text-green-600">
                  (started {formatDate(activeTimer.started_at)})
                </span>
              </div>
              <Button size="sm" variant="outline" className="border-red-300 text-red-600 text-xs" onClick={() => stopTimer.mutate()}>
                <Square className="w-3 h-3 mr-1" /> Stop
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="mb-4">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="What are you working on?"
                value={timerTask}
                onChange={(e) => setTimerTask(e.target.value)}
                className="flex-1 text-sm"
                onKeyDown={(e) => e.key === "Enter" && !activeTimer && startTimer.mutate()}
              />
              {activeTimer ? (
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => stopTimer.mutate()} disabled={stopTimer.isPending}>
                  <Square className="w-4 h-4 mr-1" /> Stop Timer
                </Button>
              ) : (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => startTimer.mutate()} disabled={startTimer.isPending}>
                  <Play className="w-4 h-4 mr-1" /> Start Timer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 border shadow-sm overflow-x-auto">
          {[
            { key: "overview", label: "Overview", icon: BarChart3 },
            { key: "live", label: `Live (${onlineNow.length})`, icon: Wifi },
            { key: "sessions", label: "Sessions", icon: Clock },
            { key: "tasks", label: "Task Time", icon: Timer },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 min-w-fit whitespace-nowrap py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                activeTab === tab.key
                  ? "bg-[#8B1538] text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Wifi className="w-5 h-5 text-green-500 mx-auto mb-1" />
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{onlineNow.length}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Online Now</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{sessionSummary.length}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Active Staff</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Clock className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{totalOnlineHours.toFixed(1)}h</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Total Online</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Timer className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{totalTaskHours.toFixed(1)}h</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Task Time</p>
                    </CardContent>
                  </Card>
                </div>

                {activeTimers.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-500" />
                        Currently Working ({activeTimers.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
                      <div className="space-y-2">
                        {activeTimers.map((t: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
                              <span className="text-sm font-medium text-gray-800 truncate">{t.user_name}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-gray-600 truncate max-w-[120px] sm:max-w-none">{t.task_title}</p>
                              <p className="text-[10px] text-gray-400">since {formatDate(t.started_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#8B1538]" />
                      Staff Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
                    {sessionSummary.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No session data for this period</p>
                    ) : (
                      <div className="space-y-2">
                        {sessionSummary.map((s: any, i: number) => {
                          const taskData = taskTimerByUser.find((t: any) => t.user_id === s.user_id);
                          const isOnline = onlineNow.some((o: any) => o.user_id === s.user_id);
                          return (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-gray-50 rounded-lg border gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{s.user_name}</p>
                                  <p className="text-[10px] text-gray-400 capitalize">{s.user_role}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatMins(Number(s.total_minutes))} online
                                </Badge>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                  {s.total_sessions} sessions
                                </Badge>
                                {taskData && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                    <Timer className="w-3 h-3 mr-1" />
                                    {formatMins(Number(taskData.total_task_minutes))} on tasks
                                  </Badge>
                                )}
                                <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                                  avg {formatMins(Number(s.avg_session_minutes))}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "live" && (
              <div className="space-y-3">
                {onlineNow.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <WifiOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No staff online right now</p>
                    </CardContent>
                  </Card>
                ) : (
                  onlineNow.map((u: any, i: number) => {
                    const timer = activeTimers.find((t: any) => t.user_id === u.user_id);
                    return (
                      <Card key={i} className="border-l-4 border-l-green-500">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <User className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">{u.user_name}</p>
                                <p className="text-[10px] text-gray-400 capitalize">{u.user_role}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-green-100 text-green-700 border border-green-200 text-[10px]">
                                <Wifi className="w-3 h-3 mr-1" /> Online
                              </Badge>
                              <p className="text-[10px] text-gray-400 mt-1">
                                Last seen {formatDate(u.last_seen)}
                              </p>
                            </div>
                          </div>
                          {timer && (
                            <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700 flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              Working on: <strong>{timer.task_title}</strong>
                              <span className="text-green-500 ml-1">(since {formatDate(timer.started_at)})</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "sessions" && (
              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No login sessions found for this period</p>
                    </CardContent>
                  </Card>
                ) : (
                  sessions.map((s: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="w-4 h-4 text-gray-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{s.user_name}</p>
                              <p className="text-[10px] text-gray-400 capitalize">{s.user_role}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
                            <span className="flex items-center gap-1 text-gray-500">
                              <CalendarDays className="w-3 h-3" />
                              {formatDate(s.login_at)}
                            </span>
                            {s.logout_at ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {formatMins(Number(s.duration_minutes))}
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 border border-green-200">
                                Still online
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="space-y-4">
                {taskTimerByUser.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
                      <CardTitle className="text-sm">Task Time by Person</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
                      <div className="space-y-2">
                        {taskTimerByUser.map((t: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{t.user_name}</p>
                              <p className="text-[10px] text-gray-400">{t.tasks_timed} tasks timed</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-[#8B1538]">{formatMins(Number(t.total_task_minutes))}</p>
                              <p className="text-[10px] text-gray-400">avg {formatMins(Number(t.avg_task_minutes))}/task</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
                    <CardTitle className="text-sm">Recent Task Timers</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
                    {taskTimers.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No task timers recorded yet. Use the timer above to start tracking.</p>
                    ) : (
                      <div className="space-y-2">
                        {taskTimers.map((t: any, i: number) => (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-gray-50 rounded border gap-1">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{t.task_title}</p>
                              <div className="flex flex-wrap gap-2 text-[10px] text-gray-400">
                                <span>{t.user_name}</span>
                                {t.event_name && <span>| {t.event_name}</span>}
                                <span>| {formatDate(t.started_at)}</span>
                              </div>
                              {t.notes && <p className="text-[10px] text-gray-500 italic mt-0.5">{t.notes}</p>}
                            </div>
                            <div className="shrink-0">
                              {t.stopped_at ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                  {formatMins(Number(t.duration_minutes))}
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-700 border border-green-200 text-[10px]">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1" />
                                  Running
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
