import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, AlertTriangle, TrendingUp } from "lucide-react";

interface ProfitMarginProps {
  eventId: string;
}

export function ProfitMarginIndicator({ eventId }: ProfitMarginProps) {
  const { data: event } = useQuery<any>({
    queryKey: ["/api/events", eventId],
  });

  const { data: budgetData } = useQuery<any>({
    queryKey: ["/api/events", eventId, "budget"],
  });

  if (!event || !budgetData) return null;

  const clientBudget = parseFloat(event.budget || "0");
  const totalVendorCosts = budgetData.items?.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0) || 0;
  const plannerFee = budgetData.plannerFee || 0;
  const companyMargin = clientBudget - totalVendorCosts - plannerFee;
  const marginPercentage = clientBudget > 0 ? Math.round((companyMargin / clientBudget) * 100) : 0;

  const marginHealthy = marginPercentage >= 15; // 15% minimum margin threshold
  const marginWarning = marginPercentage >= 10 && marginPercentage < 15;
  const marginDanger = marginPercentage < 10;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financial Summary
          </CardTitle>
          <div className="text-sm font-semibold flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs ${
              marginHealthy ? "bg-green-100 text-green-700" :
              marginWarning ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }`}>
              {marginPercentage}% margin
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b">
            <span className="text-gray-600">Client Budget</span>
            <span className="font-medium">{event.currency} {clientBudget.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1 border-b text-red-600">
            <span>Vendor Costs</span>
            <span className="font-medium">- {event.currency} {totalVendorCosts.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1 border-b text-orange-600">
            <span>Planner Fee</span>
            <span className="font-medium">- {event.currency} {plannerFee.toLocaleString()}</span>
          </div>
          <div className={`flex justify-between py-1 font-bold text-base ${
            marginHealthy ? "text-green-600" :
            marginWarning ? "text-amber-600" :
            "text-red-600"
          }`}>
            <span>Company Margin</span>
            <span>{event.currency} {companyMargin.toLocaleString()}</span>
          </div>
        </div>

        {/* Warning */}
        {marginWarning && (
          <Alert className="border-amber-300 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-xs">
              Margin below 15% target. Review vendor costs or adjust fees.
            </AlertDescription>
          </Alert>
        )}

        {marginDanger && (
          <Alert className="border-red-300 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 text-xs font-medium">
              Margin critically low. Requires manager approval for vendor selection.
            </AlertDescription>
          </Alert>
        )}

        {marginHealthy && (
          <div className="text-xs text-green-700 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Healthy profit margin</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
