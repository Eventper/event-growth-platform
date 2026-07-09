import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Users, MapPin, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import VendorMeetingBooking from "@/components/VendorMeetingBooking";
import EventTaskCalendar from "@/components/EventTaskCalendar";

interface Event {
  id: string;
  name: string;
  eventDate: string;
  status: string;
  client: {
    name: string;
    email: string;
  };
}

export default function VendorMeetingManagement() {
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Get planner's events
  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ['/api/events'],
  });

  const selectedEvent = events.find((e: Event) => e.id === selectedEventId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/planner-dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Vendor Meeting Management</h1>
                <p className="text-sm text-gray-600">Schedule and manage vendor meetings with calendar integration</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event: Event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{event.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {event.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedEvent && (
                <>
                  <div className="text-sm">
                    <p className="font-medium text-gray-700">Event Date</p>
                    <p className="text-gray-600">{new Date(selectedEvent.eventDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-700">Client</p>
                    <p className="text-gray-600">{selectedEvent.client.name}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedEventId ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Vendor Meeting Booking Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Vendor Meetings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VendorMeetingBooking 
                    eventId={selectedEventId}
                    eventName={selectedEvent?.name || ''}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Event Task Calendar */}
            <div className="space-y-6">
              <EventTaskCalendar 
                eventId={selectedEventId}
                className="sticky top-4"
              />
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Select an Event</h3>
              <p className="text-gray-500 mb-6">
                Choose an event from the dropdown above to start managing vendor meetings and view the calendar
              </p>
              
              {eventsLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
                </div>
              ) : events.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-gray-400">No events found</p>
                  <Link href="/create-event">
                    <Button style={{ backgroundColor: '#8B1538' }}>
                      Create Your First Event
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-gray-400">
                  You have {events.length} active event{events.length !== 1 ? 's' : ''} to choose from
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Stats Footer */}
      {selectedEventId && (
        <div className="bg-white border-t mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-burgundy">
                  {/* This will be populated by the calendar component */}
                  --
                </div>
                <div className="text-sm text-gray-600">Total Meetings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  --
                </div>
                <div className="text-sm text-gray-600">This Week</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  --
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  --
                </div>
                <div className="text-sm text-gray-600">Upcoming</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}