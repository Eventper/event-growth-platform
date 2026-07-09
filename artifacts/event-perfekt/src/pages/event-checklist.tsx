import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, MapPin, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventChecklistGenerator } from "@/components/EventChecklistGenerator";
import { format } from "date-fns";

export default function EventChecklist() {
  const [, setLocation] = useLocation();
  const [eventId, setEventId] = useState<string>("");

  // Get event ID from URL params (if accessing directly)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('eventId');
    if (id) {
      setEventId(id);
    }
  }, []);

  const { data: event, isLoading } = useQuery<any>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-burgundy-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white 400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your event checklist...</p>
        </div>
      </div>
    );
  }

  if (!event && eventId) {
    return (
      <div className="min-h-screen bg-burgundy-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Event Not Found</h2>
          <p className="text-burgundy-200 mb-6">The event you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => setLocation('/dashboard')} className="bg-white text-black hover:bg-gray-100">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-burgundy-900">
      {/* Header */}
      <header className="bg-burgundy-800 shadow-sm border-b border-burgundy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/dashboard')}
                className="text-white hover:text-burgundy-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <img
                  src="/assets/3d_Logo_1772145137902.jpg"
                  alt="Event Perfekt Logo"
                  className="h-10 w-auto"
                />
                <span className="text-xl font-semibold text-white">Event Perfekt</span>
              </div>
            </div>
            <div className="text-white">
              <span className="text-sm text-burgundy-200">Event Planning Checklist</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Summary */}
        {event && (
          <Card className="bg-burgundy-800 border-burgundy-700 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl text-white">{event.name}</CardTitle>
              <p className="text-burgundy-200">{event.description}</p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2 text-burgundy-200">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{format(new Date(event.startDate), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center space-x-2 text-burgundy-200">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{event.city}, {event.country}</span>
                </div>
                <div className="flex items-center space-x-2 text-burgundy-200">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{event.guestCount} guests</span>
                </div>
                <div className="flex items-center space-x-2 text-burgundy-200">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">{event.currency} {Number(event.budget).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Standalone Checklist */}
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Event Planning Checklist</h1>
            <p className="text-burgundy-200">
              Your personalized step-by-step guide to planning the perfect event. Track your progress and never miss an important detail.
            </p>
          </div>

          {event ? (
            <EventChecklistGenerator
              eventType={event.type as 'private' | 'corporate'}
              eventCategory={event.eventCategory || ''}
              eventDate={new Date(event.startDate)}
              guestCount={event.guestCount}
              budget={Number(event.budget)}
              services={{
                needsVenue: event.needsVenueSearch,
                needsDecor: event.needsVenueDecoration,
                needsCatering: true,
                needsPhotography: true,
                needsEntertainment: event.type === 'private',
                needsTransport: event.guestCount > 50
              }}
              onChecklistGenerated={(checklist) => {
                console.log('Generated checklist for event:', event.id, checklist);
              }}
            />
          ) : (
            // Demo checklist for direct access
            <EventChecklistGenerator
              eventType="private"
              eventCategory="Wedding"
              eventDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)} // 90 days from now
              guestCount={100}
              budget={50000}
              services={{
                needsVenue: true,
                needsDecor: true,
                needsCatering: true,
                needsPhotography: true,
                needsEntertainment: true,
                needsTransport: false
              }}
              onChecklistGenerated={(checklist) => {
                console.log('Generated demo checklist:', checklist);
              }}
            />
          )}
        </div>

        {/* Planning Tips */}
        <Card className="bg-burgundy-800 border-burgundy-700">
          <CardHeader>
            <CardTitle className="text-xl text-white">Planning Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-white mb-2">Start Early</h4>
                <p className="text-burgundy-200 text-sm">
                  Begin planning 3-6 months in advance for private events, 6-12 months for large corporate events.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Stay Organized</h4>
                <p className="text-burgundy-200 text-sm">
                  Use this checklist to track progress and keep all important information in one place.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Book Key Vendors First</h4>
                <p className="text-burgundy-200 text-sm">
                  Secure your venue, catering, and photography early as these are often the most in-demand services.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Have a Backup Plan</h4>
                <p className="text-burgundy-200 text-sm">
                  Prepare alternatives for outdoor venues, key vendors, and critical timeline items.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}