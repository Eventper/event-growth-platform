import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, CalendarDays, Clock, User, Briefcase, AlertCircle,
  CheckCircle2, XCircle, PlayCircle, ChevronDown, ChevronUp,
  MessageSquare, MapPin, Building2, DollarSign, FileText
} from "lucide-react";
import EventResourceManager from "@/components/EventResourceManager";

function MyAssignments() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");

  const { data: assignments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/my-assignments"],
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, resolutionNotes }: { id: string; status: string; resolutionNotes?: string }) => {
      return apiRequest("PATCH", `/api/my-assignments/${id}/status`, { status, resolutionNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-assignments"] });
      toast({ title: "Assignment updated", description: "Status has been updated successfully." });
      setExpandedId(null);
    },
    onError: () => {
      toast({ title: "Update failed", description: "Could not update the assignment.", variant: "destructive" });
    },
  });

  const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
    pending: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
    confirmed: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: PlayCircle },
    completed: { color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
    cancelled: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
  };

  const upcoming = assignments.filter((a) => a.status !== "cancelled" && a.status !== "completed");
  const past = assignments.filter((a) => a.status === "completed" || a.status === "cancelled");

  const formatCurrency = (amount: string, currency: string) => {
    const symbol = currency === "NGN" ? "₦" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
    return `${symbol}${parseFloat(amount).toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch { return dateStr; }
  };

  const renderCard = (a: any, isPast = false) => {
    const config = statusConfig[a.status] || statusConfig.pending;
    const StatusIcon = config.icon;
    const isExpanded = expandedId === a.id;

    return (
      <Card
        key={a.id}
        className={`transition-all duration-200 border ${isPast ? "opacity-70 border-gray-200" : "border-l-4 border-l-[#8B1538] shadow-sm hover:shadow-md"}`}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{a.role}</h3>
                <Badge className={`${config.bg} ${config.color} border text-[10px] sm:text-xs px-1.5 py-0 flex items-center gap-1`}>
                  <StatusIcon className="w-3 h-3" />
                  {a.status}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-[#8B1538] font-medium truncate">{a.eventName}</p>
            </div>
            {a.ratePerUnit && (
              <div className="text-right shrink-0">
                <p className="text-xs sm:text-sm font-bold text-gray-800">
                  {formatCurrency(a.ratePerUnit, a.currency || "GBP")}
                </p>
                <p className="text-[9px] sm:text-[10px] text-gray-400">per {a.ratePeriod || "event"}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 text-[11px] sm:text-xs text-gray-500">
            {a.startDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3 shrink-0" />
                {formatDate(a.startDate)}{a.endDate ? ` – ${formatDate(a.endDate)}` : ""}
              </span>
            )}
            {a.shift && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0" />
                {a.shift}
              </span>
            )}
            {a.eventPhase && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {a.eventPhase}
              </span>
            )}
            {a.company && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 shrink-0" />
                {a.company}
              </span>
            )}
          </div>

          {a.notes && (
            <p className="text-[11px] sm:text-xs text-gray-400 mt-2 italic line-clamp-2">{a.notes}</p>
          )}

          {a.resolutionNotes && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-[11px] sm:text-xs text-gray-600">
              <span className="font-medium">Resolution:</span> {a.resolutionNotes}
            </div>
          )}

          {a.completedAt && (
            <p className="text-[10px] text-gray-400 mt-1">
              Completed: {formatDate(a.completedAt)}
            </p>
          )}

          {!isPast && (
            <div className="mt-3">
              <button
                onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : a.id); }}
                className="w-full flex items-center justify-center gap-1 text-[11px] sm:text-xs text-gray-500 hover:text-gray-700 py-1 border-t border-gray-100 pt-2"
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {isExpanded ? "Hide actions" : "Update status"}
              </button>

              {isExpanded && (
                <div className="mt-2 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-2">
                    {a.status === "pending" && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
                        disabled={statusMutation.isPending}
                        onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: a.id, status: "confirmed" }); }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm
                      </Button>
                    )}
                    {(a.status === "pending" || a.status === "confirmed") && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white text-xs h-9"
                        disabled={statusMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          statusMutation.mutate({
                            id: a.id,
                            status: "completed",
                            resolutionNotes: resolutionText[a.id] || undefined,
                          });
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                      </Button>
                    )}
                    {a.status !== "cancelled" && a.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 text-xs h-9"
                        disabled={statusMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          statusMutation.mutate({
                            id: a.id,
                            status: "cancelled",
                            resolutionNotes: resolutionText[a.id] || undefined,
                          });
                        }}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9"
                      onClick={(e) => { e.stopPropagation(); setLocation(`/events/${a.eventId}/resources`); }}
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" /> View Event
                    </Button>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">
                      <MessageSquare className="w-3 h-3 inline mr-1" />
                      Resolution / Notes (optional)
                    </label>
                    <Textarea
                      placeholder="Add notes about this assignment..."
                      value={resolutionText[a.id] || ""}
                      onChange={(e) => setResolutionText({ ...resolutionText, [a.id]: e.target.value })}
                      className="text-sm min-h-[60px] resize-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/planner-dashboard")}
          className="mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Assignments</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage your event assignments</p>
        </div>

        <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 border shadow-sm">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === "active"
                ? "bg-[#8B1538] text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
            Active ({upcoming.length})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === "past"
                ? "bg-gray-700 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
            Past ({past.length})
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-600">No Assignments Yet</h3>
              <p className="text-gray-400 mt-1 text-xs sm:text-sm">
                You haven't been assigned to any events.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeTab === "active" ? (
              upcoming.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No active assignments right now</p>
                  </CardContent>
                </Card>
              ) : (
                upcoming.map((a: any) => renderCard(a))
              )
            ) : (
              past.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No completed or cancelled assignments</p>
                  </CardContent>
                </Card>
              ) : (
                past.map((a: any) => renderCard(a, true))
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventResources() {
  const params = useParams<{ eventId: string }>();
  const [, setLocation] = useLocation();

  if (!params.eventId) {
    return <MyAssignments />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation(`/event-dashboard/${params.eventId}`)}
          className="mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Event
        </Button>
        <EventResourceManager eventId={params.eventId} />
      </div>
    </div>
  );
}
