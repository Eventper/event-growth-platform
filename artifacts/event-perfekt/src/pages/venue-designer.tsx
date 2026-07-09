import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FloorPlanCreator } from "@/components/FloorPlanCreator";
import { VenueDesigner3D } from "@/components/VenueDesigner3D";
import { VenueDetailsForm } from "@/components/VenueDetailsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Grid, Eye, Layers, Ruler, Box, Save, Zap, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Event {
  id: string;
  name: string;
  type: string;
  date: string;
  venue: string;
  guestCount: number;
  budget: number;
  currency: string;
  colors?: string;
  theme?: string;
}

export default function VenueDesignerPage() {
  const [, setLocation] = useLocation();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"floor-plan" | "3d-design">("floor-plan");
  const [floorPlanData, setFloorPlanData] = useState<any[]>([]);
  const [design3DData, setDesign3DData] = useState<any>({});
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery({
    queryKey: ['/api/events'],
    queryFn: () => fetch('/api/events', { credentials: 'include' }).then(r => r.json()) as Promise<Event[]>
  });

  const { data: selectedEvent } = useQuery({
    queryKey: ['/api/events', selectedEventId],
    queryFn: () => selectedEventId ? fetch(`/api/events/${selectedEventId}`, { credentials: 'include' }).then(r => r.json()) as Promise<Event> : null,
    enabled: !!selectedEventId
  });

  const { data: savedDesigns = [] } = useQuery<any[]>({
    queryKey: ['/api/events', selectedEventId, 'designs'],
    enabled: !!selectedEventId,
  });

  const saveDesignMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", `/api/events/${selectedEventId}/designs`, {
        name: name || `Design ${new Date().toLocaleDateString()}`,
        placed_assets: activeTab === "floor-plan" ? floorPlanData : design3DData,
        design_mode: activeTab === "floor-plan" ? "2d" : "3d"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'designs'] });
      toast({ title: "Design saved successfully" });
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

  const createTestEventMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/events", {
        name: `Wedding ${new Date().toLocaleDateString()}`,
        type: "Wedding",
        date: new Date(Date.now() + 60*24*60*60*1000).toISOString(),
        venue: "Grand Ballroom",
        guestCount: 150,
        budget: 50000,
        currency: "USD",
        theme: "Modern Elegant",
        colors: "#8B1538,#ffffff,#FFFFFF"
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setSelectedEventId(data.id);
      toast({ title: "Test event created!", description: "Event loaded and ready to design" });
    }
  });

  const parseEventColors = (colorsString?: string): string[] => {
    if (!colorsString) return [];
    return colorsString.split(',').map(color => color.trim()).filter(Boolean);
  };

  const handleFloorPlanSave = (floorPlan: any[]) => {
    setFloorPlanData(floorPlan);
  };

  const handle3DDesignSave = (design: any) => {
    setDesign3DData(design);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Workflow Steps */}
      <Card className="mb-8 bg-gradient-to-r from-[#8B1538] to-[#6a0f2a]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${true ? "bg-white text-[#8B1538]" : "bg-gray-700"} font-bold`}>1</div>
              <div>
                <p className="font-semibold">Venue Details</p>
                <p className="text-xs text-gray-200">Fill venue info & colors</p>
              </div>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${selectedEventId ? "bg-white text-[#8B1538]" : "bg-gray-700"} font-bold`}>2</div>
              <div>
                <p className="font-semibold">Select Event</p>
                <p className="text-xs text-gray-200">Pick event to design</p>
              </div>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${selectedEvent ? "bg-white text-[#8B1538]" : "bg-gray-700"} font-bold`}>3</div>
              <div>
                <p className="font-semibold">Design Layout</p>
                <p className="text-xs text-gray-200">2D/3D floor plan</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center space-x-4 mb-8">
        <Button
          variant="ghost"
          onClick={() => setLocation('/planner-dashboard')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Button>
        <div className="text-2xl font-bold text-gray-900">Venue Designer</div>
      </div>

      {/* Event Selection */}
      <Card className="mb-8 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-6 h-6" />
              <span>Select Event for Venue Design</span>
            </div>
            {!events || events.length === 0 && (
              <Button onClick={() => createTestEventMutation.mutate()} variant="secondary" size="sm" disabled={createTestEventMutation.isPending}>
                {createTestEventMutation.isPending ? "Creating..." : "Create Test Event"}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {!events || events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No events found. Create a test event to get started.</p>
              <Button onClick={() => createTestEventMutation.mutate()} variant="default" disabled={createTestEventMutation.isPending}>
                {createTestEventMutation.isPending ? "Creating..." : "Create Test Event"}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose Event
                </label>
              <Select value={selectedEventId} onValueChange={(eventId) => {
                setSelectedEventId(eventId);
                setFloorPlanData([]);
                setTimeout(() => {
                  const event = events?.find(e => e.id === eventId);
                  if (event?.guestCount) {
                    autoLayoutMutation.mutate();
                  }
                }, 100);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an event for venue design" />
                </SelectTrigger>
                <SelectContent>
                  {events?.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{event.name}</span>
                        <span className="text-xs text-gray-500 ml-4">
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEvent && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-black mb-2">Event Details</h3>
                <div className="space-y-1 text-sm text-black">
                  <div><span className="font-medium">Type:</span> {selectedEvent.type}</div>
                  <div><span className="font-medium">Venue:</span> {selectedEvent.venue}</div>
                  <div><span className="font-medium">Guests:</span> {selectedEvent.guestCount}</div>
                  <div><span className="font-medium">Budget:</span> {selectedEvent.currency} {selectedEvent.budget?.toLocaleString()}</div>
                  {selectedEvent.colors && (
                    <div><span className="font-medium">Colors:</span> {selectedEvent.colors}</div>
                  )}
                  {selectedEvent.theme && (
                    <div><span className="font-medium">Theme:</span> {selectedEvent.theme}</div>
                  )}
                </div>
              </div>
            )}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Design Tools & Actions */}
      {selectedEvent && (
        <Card className="mb-8 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-black">
              <div className="flex items-center space-x-2">
                <Grid className="w-6 h-6 text-black" />
                <span>Design & Layout</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={() => autoLayoutMutation.mutate()} variant="outline" size="sm" disabled={autoLayoutMutation.isPending}>
                  <Zap className="w-4 h-4 mr-2" />
                  {autoLayoutMutation.isPending ? "Generating..." : "Auto-Layout"}
                </Button>
                <Button onClick={() => saveDesignMutation.mutate("")} variant="default" size="sm" disabled={saveDesignMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {saveDesignMutation.isPending ? "Saving..." : "Save Design"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {savedDesigns.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-black mb-2">Saved Designs:</p>
                <div className="flex flex-wrap gap-2">
                  {savedDesigns.map((design: any) => (
                    <div key={design.id} className="bg-white px-3 py-1 rounded border border-gray-300 text-sm text-black">
                      {design.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Design Tools Overview */}
      {!selectedEvent && (
        <Card className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-black">
              <Eye className="w-6 h-6" />
              <span>Professional Venue Design Tools</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Grid className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="font-semibold text-black mb-2">2D Floor Plan Creator</h3>
                <p className="text-sm text-black">
                  Create detailed floor plans with drag-and-drop elements. Perfect for layout planning, 
                  capacity optimization, and client presentations. Includes tables, stages, bars, and more.
                </p>
                <p className="text-xs text-black mt-3 leading-relaxed">
                  Interactive drag-and-drop interface, automatic capacity calculations, professional export options, and template generation by event type.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Box className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="font-semibold text-black mb-2">3D Venue Designer</h3>
                <p className="text-sm text-black">
                  Design immersive 3D venue layouts with realistic lighting and materials. 
                  Perfect for visualization, client presentations, and detailed space planning.
                </p>
                <p className="text-xs text-black mt-3 leading-relaxed">
                  Real-time 3D visualization, multiple lighting presets, material and texture options, and multiple render modes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Design Interface */}
      {/* Always show Venue Details Form */}
      <div className="mt-8">
        <VenueDetailsForm eventId={selectedEventId} />
      </div>

      {selectedEvent && (
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="space-y-6 mt-8">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="floor-plan" className="flex items-center space-x-2">
              <Grid className="w-4 h-4" />
              <span>2D Floor Plan</span>
            </TabsTrigger>
            <TabsTrigger value="3d-design" className="flex items-center space-x-2">
              <Box className="w-4 h-4" />
              <span>3D Designer</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="floor-plan" className="space-y-6">
            <FloorPlanCreator
              eventId={selectedEvent.id}
              venueType={selectedEvent.type}
              guestCount={selectedEvent.guestCount}
              onSave={handleFloorPlanSave}
            />
          </TabsContent>

          <TabsContent value="3d-design" className="space-y-6">
            <VenueDesigner3D
              eventId={selectedEvent.id}
              venueType={selectedEvent.type}
              eventTheme={selectedEvent.theme}
              primaryColors={parseEventColors(selectedEvent.colors)}
              onSave={handle3DDesignSave}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}