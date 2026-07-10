import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { AlertCircle, CheckCircle2, Clock, Users, Building2, Handshake } from "lucide-react";

export default function OperationsTimeline() {
  const [, setLocation] = useLocation();

  // Fetch today's actions
  const { data: actionsData, isLoading: actionsLoading } = useQuery({
    queryKey: ["/api/growth/today-actions"],
    queryFn: async () => {
      const res = await fetch("/api/growth/today-actions");
      if (!res.ok) throw new Error("Failed to fetch actions");
      return res.json();
    },
  });

  // Fetch activity timeline
  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ["/api/growth/activity-timeline"],
    queryFn: async () => {
      const res = await fetch("/api/growth/activity-timeline");
      if (!res.ok) throw new Error("Failed to fetch timeline");
      return res.json();
    },
  });

  const actions = actionsData?.actions || [];
  const timeline = timelineData?.timeline || [];

  if (actionsLoading || timelineLoading) {
    return <div className="p-8 text-center">Loading operations dashboard...</div>;
  }

  const getIcon = (priority: string) => {
    if (priority === "urgent") return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (priority === "high") return <Clock className="w-5 h-5 text-orange-500" />;
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  const getTypeIcon = (type: string) => {
    if (type === "guest") return <Users className="w-4 h-4" />;
    if (type === "organisation") return <Building2 className="w-4 h-4" />;
    return <Handshake className="w-4 h-4" />;
  };

  const getActivityColor = (type: string) => {
    if (type.includes("confirmed") || type.includes("committed")) return "bg-green-100";
    if (type.includes("invited") || type.includes("contacted")) return "bg-blue-100";
    if (type.includes("added")) return "bg-gray-100";
    return "bg-yellow-100";
  };

  const getActivityIcon = (type: string) => {
    if (type.includes("confirmed") || type.includes("committed") || type.includes("paid"))
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    return <Clock className="w-5 h-5 text-blue-600" />;
  };

  // Group timeline by date
  const groupedTimeline: Record<string, any[]> = {};
  for (const entry of timeline) {
    const date = new Date(entry.timestamp).toDateString();
    if (!groupedTimeline[date]) groupedTimeline[date] = [];
    groupedTimeline[date].push(entry);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Operations Dashboard</h1>
          <p className="text-lg text-gray-600">Today's actions and activity timeline</p>
        </div>

        {/* Today's Actions */}
        <Card className="mb-8 border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              📋 Today's Actions
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {actions.length} task{actions.length !== 1 ? "s" : ""} to complete today
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {actions.length === 0 ? (
                <p className="text-gray-500 italic">No actions for today. Check back later.</p>
              ) : (
                actions.map((action: any, idx: number) => (
                  <div
                    key={action.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      action.priority === "urgent"
                        ? "border-red-500 bg-white"
                        : action.priority === "high"
                          ? "border-orange-500 bg-white"
                          : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getIcon(action.priority)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-gray-900">{action.action}</p>
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100">
                            {idx + 1}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{action.reason}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          {getTypeIcon(action.relatedTo.type)}
                          <span>{action.relatedTo.name}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (action.relatedTo.type === "guest") {
                            setLocation("/guest-intelligence");
                          } else if (action.relatedTo.type === "organisation") {
                            setLocation("/organisation-database");
                          } else {
                            setLocation("/partner-database");
                          }
                        }}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
              📅 Activity Timeline
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">Recent actions across guests, organisations, and partners</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {Object.entries(groupedTimeline).map(([date, entries]) => (
                <div key={date}>
                  {/* Date Header */}
                  <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">
                    {new Date(date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>

                  {/* Entries for this date */}
                  <div className="space-y-3 ml-4 border-l-2 border-gray-200 pl-4">
                    {entries.map((entry: any) => (
                      <div
                        key={entry.id}
                        className={`p-3 rounded-lg ${getActivityColor(entry.type)}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getActivityIcon(entry.type)}</div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{entry.title}</p>
                            <p className="text-sm text-gray-700 mt-1">{entry.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {getTypeIcon(entry.relatedTo.type)}
                              <span className="text-xs text-gray-600">{entry.relatedTo.name}</span>
                              <span className="text-xs text-gray-400">
                                {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {timeline.length === 0 && (
              <p className="text-center text-gray-500 italic py-8">No activity yet. Start inviting women and contacting partners!</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Navigation */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            size="lg"
            className="h-14"
            onClick={() => setLocation("/guest-intelligence")}
          >
            <Users className="w-5 h-5 mr-2" />
            Manage Guests
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14"
            onClick={() => setLocation("/organisation-database")}
          >
            <Building2 className="w-5 h-5 mr-2" />
            Manage Organisations
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14"
            onClick={() => setLocation("/partner-database")}
          >
            <Handshake className="w-5 h-5 mr-2" />
            Manage Partners
          </Button>
        </div>
      </div>
    </div>
  );
}
