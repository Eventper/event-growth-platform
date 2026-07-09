import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";

interface ReadinessProps {
  eventId: string;
}

export function EventReadinessIndicator({ eventId }: ReadinessProps) {
  const { data: event } = useQuery<any>({
    queryKey: ["/api/events", eventId],
  });

  const { data: team = [] } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "team"],
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "tasks"],
  });

  const { data: budgetData } = useQuery<any>({
    queryKey: ["/api/events", eventId, "budget"],
  });

  const { data: guests = [] } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "guests"],
  });

  if (!event) return null;

  // Calculate readiness scores
  const checks = {
    planning: event.timelineProgress ? Math.min(event.timelineProgress, 100) : 0,
    team: team.length > 0 ? 100 : 0,
    budget: event.budget ? 100 : 0,
    guests: guests.length > 0 ? Math.min((guests.length / (event.guestCount || 1)) * 100, 100) : 0,
    vendors: event.vendorCount ? 100 : 0,
    tasks: tasks.length > 0 && tasks.filter((t: any) => t.status === "done").length > 0
      ? Math.min(
          (tasks.filter((t: any) => t.status === "done").length / tasks.length) * 100,
          100
        )
      : 0,
  };

  const overallScore = Math.round(Object.values(checks).reduce((a: number, b: number) => a + b, 0) / Object.keys(checks).length);

  const statusColor = overallScore >= 80 ? "bg-green-50 border-green-200" :
    overallScore >= 60 ? "bg-yellow-50 border-yellow-200" :
    "bg-red-50 border-red-200";

  const statusIcon = overallScore >= 80 ? CheckCircle2 :
    overallScore >= 60 ? AlertTriangle :
    AlertCircle;

  const StatusIcon = statusIcon;

  return (
    <Card className={statusColor}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${
              overallScore >= 80 ? "text-green-600" :
              overallScore >= 60 ? "text-amber-600" :
              "text-red-600"
            }`} />
            Event Readiness
          </CardTitle>
          <div className="text-2xl font-bold">{overallScore}%</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Progress value={overallScore} className="h-2" />
          <div className="text-xs text-gray-500">
            {overallScore >= 80 ? "✓ Ready to proceed" :
             overallScore >= 60 ? "⚠ Needs attention" :
             "🔴 At risk"}
          </div>
        </div>

        {/* Individual checks */}
        <div className="grid grid-cols-2 gap-2 text-sm pt-2">
          {[
            { label: "Planning", value: checks.planning },
            { label: "Team", value: checks.team },
            { label: "Budget", value: checks.budget },
            { label: "Guests", value: checks.guests },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-2 py-1 bg-white/50 rounded border">
              <span className="text-gray-600">{item.label}</span>
              <span className={`font-medium text-xs ${
                item.value >= 80 ? "text-green-600" :
                item.value >= 50 ? "text-amber-600" :
                "text-red-600"
              }`}>
                {Math.round(item.value)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
