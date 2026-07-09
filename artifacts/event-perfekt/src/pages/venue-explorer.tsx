import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VenueMap } from '@/components/VenueMap';

export default function VenueExplorer() {
  const [, setLocation] = useLocation();
  const [selectedVenue, setSelectedVenue] = useState<any>(null);

  const handleVenueSelect = (venue: any) => {
    setSelectedVenue(venue);
  };

  const handleBackToEvents = () => {
    if (selectedVenue) {
      // Pass selected venue data back to event creation
      setLocation('/create-event?venue=' + encodeURIComponent(JSON.stringify(selectedVenue)));
    } else {
      setLocation('/create-event');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-burgundy-50 to-burgundy-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-burgundy-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToEvents}
                className="text-burgundy-600 hover:text-burgundy-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Event Planning
              </Button>
              <div className="flex items-center space-x-3">
                <img
                  src="/assets/3d_Logo_1772145137902.jpg"
                  alt="Event Perfekt Logo"
                  className="h-10 w-auto"
                />
                <span className="text-xl font-semibold text-black">Event Perfekt</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-black font-medium">Venue Explorer</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-burgundy-800 mb-2">Find Your Perfekt Venue</h1>
          <p className="text-gray-600">
            Explore venues on our interactive map. Click on markers to view details and amenities.
          </p>
          {selectedVenue && (
            <div className="mt-4 p-4 bg-burgundy-50 rounded-lg border border-burgundy-200">
              <p className="text-burgundy-800 font-medium">
                Selected: <span className="font-bold">{selectedVenue.name}</span>
              </p>
              <p className="text-sm text-burgundy-600 mt-1">
                {selectedVenue.address} • Capacity: {selectedVenue.capacity} guests • {selectedVenue.price}
              </p>
            </div>
          )}
        </div>

        <VenueMap onVenueSelect={handleVenueSelect} />
      </div>
    </div>
  );
}