import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Download, Upload, FileSpreadsheet, Calculator, Printer } from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import PlannerLayout from "@/components/PlannerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BudgetManager } from "@/components/BudgetManager";
import { ExcelImporter } from "@/components/ExcelImporter";
import { api } from "@/lib/api";

export default function BudgetManagement() {
  const [, setLocation] = useLocation();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [showImporter, setShowImporter] = useState(false);
  const [importedBudgetData, setImportedBudgetData] = useState<any[]>([]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/events"],
    queryFn: api.getEvents,
  });

  const { data: selectedEvent } = useQuery<any>({
    queryKey: ["/api/events", selectedEventId],
    enabled: !!selectedEventId
  });

  const handleImportComplete = (data: any[]) => {
    setImportedBudgetData(data);
    setShowImporter(false);
  };

  if (isLoading) {
    return (
      <PlannerLayout><div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1538] mx-auto mb-4"></div>
          <p className="text-lg">Loading budget management...</p>
        </div>
      </div></PlannerLayout>
    );
  }

  return (
    <PlannerLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Comprehensive Event Costing</h1>
          <p className="text-white/60 text-sm">Thorough budget and costing for every aspect of your event — nothing missed</p>
        </div>
        {events.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              openPrintWindow({
                title: "Event Budget & Costing Overview",
                stats: [
                  { label: "Total Events", value: events.length },
                ],
                columns: [
                  { header: "Event", key: "name" },
                  { header: "Date", key: "date" },
                  { header: "Guests", key: "guests", align: "center" },
                  { header: "Budget", key: "budget", align: "right" },
                  { header: "Type", key: "type" },
                ],
                rows: events.map((event: any) => ({
                  name: event.name,
                  date: new Date(event.startDate).toLocaleDateString(),
                  guests: event.guestCount,
                  budget: `${event.currency || "NGN"} ${Number(event.budget).toLocaleString()}`,
                  type: `${event.type || ""} ${event.eventCategory ? "• " + event.eventCategory : ""}`.trim(),
                })),
              });
            }}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-[#8B1538]" />
              <span>Event Budget & Costing</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2">Select Event</label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event to cost" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event: any) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{event.name}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(event.startDate).toLocaleDateString()} • {event.guestCount} guests
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowImporter(true)} disabled={!selectedEventId}>
                  <Upload className="w-4 h-4 mr-2" /> Import
                </Button>
              </div>
            </div>

            {selectedEvent && (
              <div className="mt-4 p-4 bg-[#8B1538]/5 rounded-lg border border-[#8B1538]/20">
                <h3 className="font-semibold text-[#8B1538] mb-2">{selectedEvent.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="font-medium">Date:</span> {new Date(selectedEvent.startDate).toLocaleDateString()}</div>
                  <div><span className="font-medium">Guests:</span> {selectedEvent.guestCount}</div>
                  <div><span className="font-medium">Budget:</span> {selectedEvent.currency} {Number(selectedEvent.budget).toLocaleString()}</div>
                  <div><span className="font-medium">Type:</span> {selectedEvent.type} • {selectedEvent.eventCategory}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {showImporter && (
          <ExcelImporter onImport={handleImportComplete} onCancel={() => setShowImporter(false)} />
        )}

        {selectedEvent && !showImporter && (
          <BudgetManager
            eventId={selectedEvent.id}
            totalBudget={Number(selectedEvent.budget)}
            currency={selectedEvent.currency}
            eventType={selectedEvent.type || selectedEvent.eventCategory}
            guestCount={selectedEvent.guestCount}
          />
        )}

        {!selectedEventId && (
          <Card>
            <CardContent className="text-center py-12">
              <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Select an Event to Start Costing</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Choose an event from the dropdown above to create a comprehensive budget. 
                Our system covers 23 categories with 500+ subcategories so nothing gets missed.
              </p>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">23 Budget Categories</h4>
                  <p className="text-sm text-gray-600">From venue to contingency, every expense category covered</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Qty × Unit Cost</h4>
                  <p className="text-sm text-gray-600">Per person, per hour, per day, flat rate and more unit types</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Staff Costs Included</h4>
                  <p className="text-sm text-gray-600">Approved internal team costs automatically flow into the budget</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PlannerLayout>
  );
}
