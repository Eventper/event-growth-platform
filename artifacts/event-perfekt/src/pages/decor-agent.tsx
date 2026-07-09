import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Palette, Wand2, Sparkles, Camera, Download } from "lucide-react";
import { ColorPaletteGenerator } from "@/components/ColorPaletteGenerator";
import { VenueThemeGenerator } from "@/components/VenueThemeGenerator";
import { DecorPlanGenerator } from "@/components/DecorPlanGenerator";
import { VenueUploader } from "@/components/VenueUploader";
import { FloorPlanDesigner } from "@/components/FloorPlanDesigner";
import { Venue3DDesigner } from "@/components/Venue3DDesigner";

interface Event {
  id: string;
  name: string;
  type: string;
  startDate: string;
  receptionVenue?: string;
  guestCount: number;
  budget: string;
  currency: string;
  eventCategory?: string;
  description?: string;
}

export default function DecorAgentPage() {
  const [, setLocation] = useLocation();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"colors" | "themes" | "plans">("colors");

  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/events'],
    retry: false,
  });

  const selectedEvent = events.find((event: Event) => event.id === selectedEventId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setLocation('/planner-dashboard')}
              className="flex items-center space-x-2 text-red-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
            <h1 className="text-3xl font-bold text-red-900">Decor Agent</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={activeTab === "colors" ? "default" : "outline"}
              onClick={() => setActiveTab("colors")}
              className={activeTab === "colors" ? "bg-red-800" : "border-red-300 text-red-700"}
            >
              <Palette className="w-4 h-4 mr-2" />
              Color Palettes
            </Button>
            <Button
              variant={activeTab === "themes" ? "default" : "outline"}
              onClick={() => setActiveTab("themes")}
              className={activeTab === "themes" ? "bg-red-800" : "border-red-300 text-red-700"}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Venue Themes
            </Button>
            <Button
              variant={activeTab === "plans" ? "default" : "outline"}
              onClick={() => setActiveTab("plans")}
              className={activeTab === "plans" ? "bg-red-800" : "border-red-300 text-red-700"}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Decor Plans
            </Button>
          </div>
        </div>

        {/* Event Selection */}
        <Card className="border-red-200">
          <CardHeader className="bg-gradient-to-r from-red-800 to-red-900 text-white">
            <CardTitle className="flex items-center space-x-2">
              <Wand2 className="w-6 h-6" />
              <span>Event Decor Planning Studio</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-red-800 mb-2">
                  Select Event for Decor Planning
                </label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="w-full border-red-200">
                    <SelectValue placeholder="Choose an event to design decorations" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event: Event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{event.name}</span>
                          <span className="text-xs text-gray-500 ml-4">
                            {event.eventCategory} • {event.guestCount} guests
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEvent && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h3 className="font-semibold text-red-900 mb-3">Event Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-red-700">Type:</span>
                      <span className="font-medium text-red-900">{selectedEvent.eventCategory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Venue:</span>
                      <span className="font-medium text-red-900">{selectedEvent.receptionVenue || 'TBD'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Guests:</span>
                      <span className="font-medium text-red-900">{selectedEvent.guestCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Budget:</span>
                      <span className="font-medium text-red-900">{selectedEvent.currency} {parseInt(selectedEvent.budget).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Date:</span>
                      <span className="font-medium text-red-900">
                        {new Date(selectedEvent.startDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Decor Tools Section */}
        {selectedEvent ? (
          <div className="space-y-6">
            {activeTab === "colors" && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-900 flex items-center space-x-2">
                    <Palette className="w-6 h-6" />
                    <span>Color Palette Generator for {selectedEvent.name}</span>
                  </CardTitle>
                  <p className="text-red-700 text-sm">
                    Generate harmonious color palettes based on your event theme and requirements
                  </p>
                </CardHeader>
                <CardContent>
                  <ColorPaletteGenerator />
                </CardContent>
              </Card>
            )}

            {activeTab === "themes" && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-900 flex items-center space-x-2">
                    <Camera className="w-6 h-6" />
                    <span>Venue Theme Generator for {selectedEvent.name}</span>
                  </CardTitle>
                  <p className="text-red-700 text-sm">
                    Create mood boards and venue themes with inspiration image uploads
                  </p>
                </CardHeader>
                <CardContent>
                  <VenueThemeGenerator />
                </CardContent>
              </Card>
            )}

            {activeTab === "plans" && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-900 flex items-center space-x-2">
                    <Wand2 className="w-6 h-6" />
                    <span>Comprehensive Decor Planning for {selectedEvent.name}</span>
                  </CardTitle>
                  <p className="text-red-700 text-sm">
                    Generate complete decor plans with real vendor items, pricing, and availability
                  </p>
                </CardHeader>
                <CardContent>
                  <DecorPlanGenerator 
                    eventId={selectedEvent.id}
                    eventDetails={{
                      name: selectedEvent.name,
                      type: selectedEvent.eventCategory || selectedEvent.type,
                      guestCount: selectedEvent.guestCount,
                      budget: parseInt(selectedEvent.budget),
                      currency: selectedEvent.currency,
                      venue: selectedEvent.receptionVenue || 'TBD',
                      theme: selectedEvent.description,
                      colors: []
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Venue Upload Tab */}
            {(activeTab as string) === "venue" && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-900 flex items-center space-x-2">
                    <Camera className="w-6 h-6" />
                    <span>Venue Image Upload for {selectedEvent.name}</span>
                  </CardTitle>
                  <p className="text-red-700 text-sm">
                    Upload venue photos for 3D design and floor planning reference
                  </p>
                </CardHeader>
                <CardContent>
                  <VenueUploader 
                    eventId={selectedEvent.id}
                    onImageUploaded={(image) => {
                      console.log('Image uploaded:', image);
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* 2D Floor Plan Tab */}
            {(activeTab as string) === "floorplan" && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-900 flex items-center space-x-2">
                    <Wand2 className="w-6 h-6" />
                    <span>2D Floor Plan Designer for {selectedEvent.name}</span>
                  </CardTitle>
                  <p className="text-red-700 text-sm">
                    Design interactive floor plans with drag-and-drop decor furniture
                  </p>
                </CardHeader>
                <CardContent>
                  <FloorPlanDesigner 
                    eventId={selectedEvent.id}
                    venueImages={[]}
                  />
                </CardContent>
              </Card>
            )}

            {/* 3D Designer Tab */}
            {(activeTab as string) === "3ddesign" && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-900 flex items-center space-x-2">
                    <Sparkles className="w-6 h-6" />
                    <span>3D Venue Designer for {selectedEvent.name}</span>
                  </CardTitle>
                  <p className="text-red-700 text-sm">
                    Create immersive 3D venue designs with furniture placement and lighting
                  </p>
                </CardHeader>
                <CardContent>
                  <Venue3DDesigner 
                    eventId={selectedEvent.id}
                    venueImages={[]}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-800">
                <Sparkles className="w-6 h-6" />
                <span>Decor Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Palette className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="font-semibold text-red-800 mb-2">Smart Color Palettes</h3>
                    <p className="text-sm text-red-700">
                      Generate 3-4 color harmonious palettes using advanced color theory algorithms. 
                      Perfect for creating cohesive event themes.
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-burgundy-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Camera className="w-8 h-8 text-burgundy-600" />
                    </div>
                    <h3 className="font-semibold text-burgundy-800 mb-2">Inspiration Upload</h3>
                    <p className="text-sm text-burgundy-700">
                      Upload inspiration images and extract colors and themes to create 
                      personalized mood boards for your event.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="text-center">
                    <div className="bg-pink-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-pink-600" />
                    </div>
                    <h3 className="font-semibold text-pink-800 mb-2">Venue Theme Creation</h3>
                    <p className="text-sm text-pink-700">
                      Generated venue themes that match your event type, guest count, 
                      and budget requirements for perfect coordination.
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Download className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-purple-800 mb-2">Export & Share</h3>
                    <p className="text-sm text-purple-700">
                      Export color palettes and mood boards to share with clients and vendors. 
                      Professional presentation-ready formats.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                  <p className="text-red-800 font-medium mb-2">Ready to Start Planning?</p>
                  <p className="text-red-700 text-sm">
                    Select an event above to begin creating beautiful color palettes and venue themes 
                    with our advanced decor planning tools.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => setLocation('/ai-tools-test')}
                className="border-red-300 text-red-700"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Creative Hub
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation('/venue-designer')}
                className="border-red-300 text-red-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                3D Venue Designer
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation('/vendor-management')}
                className="border-red-300 text-red-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                Vendor Portfolio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}