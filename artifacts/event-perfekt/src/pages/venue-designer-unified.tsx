import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { VenueDetailsForm } from "@/components/VenueDetailsForm";
import { FloorPlanCreator } from "@/components/FloorPlanCreator";
import { Venue3DDesigner } from "@/components/Venue3DDesigner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Plus, ChevronDown, ChevronUp, Grid3x3, Box } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Event {
  id: string;
  name: string;
  type: string;
  venue: string;
  guestCount: number;
}

export default function VenueDesignerUnified() {
  const [, setLocation] = useLocation();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"details" | "2d" | "3d">("2d");
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [floorPlanData, setFloorPlanData] = useState<any[]>([]);
  const { toast } = useToast();

  const { data: events = [] } = useQuery({
    queryKey: ['/api/events'],
    queryFn: () => apiRequest("GET", '/api/events').then(r => r.json())
  });

  const selectedEvent = events.find((e: Event) => e.id === selectedEventId);

  const createTestEventMutation = useMutation({
    mutationFn: async () => {
      const eventDate = new Date(Date.now() + 60*24*60*60*1000);
      const endDate = new Date(eventDate.getTime() + 4*60*60*1000);
      return apiRequest("POST", "/api/events", {
        name: `Wedding ${new Date().toLocaleDateString()}`,
        type: "Wedding",
        startDate: eventDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        venue: "Grand Ballroom",
        city: "London",
        country: "UK",
        guestCount: 150,
        budget: "50000",
        currency: "USD",
        theme: "Modern Elegant",
        colors: "#8B1538,#ffffff,#FFFFFF"
      }).then(r => r.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setSelectedEventId(data.id);
      toast({ title: "Test event created!", description: "Event ready to design" });
    }
  });

  const autoLayoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${selectedEventId}/autolayout`, {
        guest_count: selectedEvent?.guestCount || 100
      });
      return res.json();
    },
    onSuccess: (data) => {
      setFloorPlanData(data.elements);
      toast({ title: "Auto-layout generated", description: `${data.info.tables_needed} tables suggested` });
    }
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#8B1538] to-[#6a0f2a] px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setLocation('/planner-dashboard')} className="text-white hover:text-gray-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Venue Designer</h1>
          </div>
          <div className="flex items-center space-x-4">
            {!selectedEvent && (
              <Button onClick={() => createTestEventMutation.mutate()} variant="secondary" size="sm" disabled={createTestEventMutation.isPending}>
                <Plus className="w-4 h-4 mr-1" />
                {createTestEventMutation.isPending ? "Creating..." : "Test Event"}
              </Button>
            )}
            {events.length > 0 && (
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-48 bg-gray-800 border-gray-600">
                  <SelectValue placeholder="Select event..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event: Event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} ({event.guestCount} guests)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Venue Details Section (Collapsible) */}
      <div className="border-b border-gray-700">
        <button
          onClick={() => setDetailsCollapsed(!detailsCollapsed)}
          className="w-full px-6 py-3 flex items-center justify-between bg-gray-900 hover:bg-gray-800 transition"
        >
          <span className="font-semibold flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span>Venue Details</span>
          </span>
          {detailsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        {!detailsCollapsed && (
          <div className="px-6 py-6 bg-black border-t border-gray-800">
            <VenueDetailsForm eventId={selectedEventId} />
          </div>
        )}
      </div>

      {/* Design Workspace */}
      {selectedEvent && (
        <div className="p-6">
          {/* Tab Navigation */}
          <div className="mb-6 flex space-x-2 border-b border-gray-700">
            <button
              onClick={() => setActiveTab("2d")}
              className={`px-4 py-2 flex items-center space-x-2 border-b-2 transition ${
                activeTab === "2d"
                  ? "border-[#8B1538] text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              <span>2D Floor Plan</span>
            </button>
            <button
              onClick={() => setActiveTab("3d")}
              className={`px-4 py-2 flex items-center space-x-2 border-b-2 transition ${
                activeTab === "3d"
                  ? "border-[#8B1538] text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Box className="w-4 h-4" />
              <span>Design with Homestyler</span>
            </button>
          </div>

          {/* 2D Floor Plan Tab */}
          {activeTab === "2d" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">2D Floor Plan Designer</h3>
                <Button onClick={() => autoLayoutMutation.mutate()} variant="outline" disabled={autoLayoutMutation.isPending}>
                  {autoLayoutMutation.isPending ? "Generating..." : "Auto-Layout Tables"}
                </Button>
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded p-6">
                <FloorPlanCreator
                  eventId={selectedEvent.id}
                  venueType={selectedEvent.type}
                  guestCount={selectedEvent.guestCount}
                  onSave={setFloorPlanData}
                />
              </div>
            </div>
          )}

          {/* 3D Homestyler Tab */}
          {activeTab === "3d" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">3D Venue Design with Homestyler</h3>
              <div className="bg-gray-900 border border-gray-700 rounded p-6">
                <Venue3DDesigner
                  eventId={selectedEvent.id}
                  floorPlan={floorPlanData}
                  venueImages={[]}
                />
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {selectedEvent.name} • {selectedEvent.guestCount} guests • {selectedEvent.venue}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline">Export Design</Button>
              <Button className="bg-[#8B1538] hover:bg-[#6a0f2a]">Save Design</Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedEvent && events.length > 0 && (
        <div className="px-6 py-16 text-center">
          <p className="text-gray-400 mb-4">Select an event from the dropdown to start designing</p>
        </div>
      )}

      {events.length === 0 && (
        <div className="px-6 py-16 text-center">
          <p className="text-gray-400 mb-4">No events yet. Create a test event to begin.</p>
        </div>
      )}
    </div>
  );
}
