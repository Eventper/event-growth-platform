import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { VenueDetailsForm } from "@/components/VenueDetailsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Event {
  id: string;
  name: string;
  type: string;
  date: string;
  venue: string;
  guestCount: number;
}

export default function VenueDesigner() {
  const [, setLocation] = useLocation();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
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
      toast({ title: "Test event created!", description: "Select it from the dropdown to design" });
    }
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl bg-black min-h-screen">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="ghost" onClick={() => setLocation('/planner-dashboard')} className="flex items-center space-x-2 text-white hover:text-gray-300">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        <h1 className="text-3xl font-bold text-white">Venue Designer</h1>
      </div>

      {/* Workflow Steps */}
      <Card className="mb-8 bg-gradient-to-r from-[#8B1538] to-[#6a0f2a]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-[#8B1538] font-bold">1</div>
              <div><p className="font-semibold">Venue Details</p></div>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${selectedEventId ? "bg-white text-[#8B1538]" : "bg-gray-700"} font-bold`}>2</div>
              <div><p className="font-semibold">Select Event</p></div>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${selectedEvent ? "bg-white text-[#8B1538]" : "bg-gray-700"} font-bold`}>3</div>
              <div><p className="font-semibold">Design</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Venue Details */}
      <VenueDetailsForm eventId={selectedEventId} />

      {/* Step 2: Event Selection */}
      <Card className="mb-8 mt-8 bg-gray-900 border-gray-700">
        <CardHeader className="bg-indigo-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Select Event</span>
            </div>
            <Button onClick={() => createTestEventMutation.mutate()} variant="secondary" size="sm" disabled={createTestEventMutation.isPending}>
              <Plus className="w-4 h-4 mr-1" />
              {createTestEventMutation.isPending ? "Creating..." : "Test Event"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white mb-4">No events yet. Click "Test Event" to create one.</p>
            </div>
          ) : (
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an event..." />
              </SelectTrigger>
              <SelectContent>
                {events.map((event: Event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name} • {event.guestCount} guests • {event.venue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedEvent && (
            <div className="mt-4 p-4 bg-green-900 border border-green-600 rounded">
              <p className="text-sm text-white"><strong>Selected:</strong> {selectedEvent.name} ({selectedEvent.guestCount} guests)</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Design Message */}
      {selectedEvent && (
        <Card className="mb-8 bg-blue-900 border-blue-600">
          <CardContent className="p-6">
            <p className="text-white">✓ Ready to design! Floor plan and 3D design tools coming next.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
