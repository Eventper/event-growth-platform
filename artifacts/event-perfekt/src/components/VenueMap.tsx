import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, Filter, Star, Phone, Globe, Navigation, ZoomIn, ZoomOut, Maximize2, Move, RotateCcw, Layers, Heart, ExternalLink, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Sample venue data - in production this would come from an API
const venues = [
  {
    id: 1,
    name: "Grand Ballroom Hotel",
    type: "Hotel",
    capacity: 500,
    rating: 4.8,
    price: "$150-300/hour",
    location: { lat: 37.7749, lng: -122.4194 },
    address: "123 Market St, San Francisco, CA",
    website: "grandballroom.com",
    amenities: ["Parking", "Catering", "AV Equipment", "WiFi"],
    description: "Elegant ballroom perfect for weddings and corporate events",
    image: "/api/placeholder/300/200"
  },
  {
    id: 2,
    name: "Riverside Garden Venue",
    type: "Outdoor",
    capacity: 200,
    rating: 4.6,
    price: "$80-150/hour",
    location: { lat: 37.7849, lng: -122.4094 },
    address: "456 River Rd, San Francisco, CA",
    website: "riversidegarden.com",
    amenities: ["Garden", "Outdoor Ceremony", "Catering Kitchen", "Parking"],
    description: "Beautiful riverside garden venue for intimate celebrations",
    image: "/api/placeholder/300/200"
  },
  {
    id: 3,
    name: "Downtown Convention Center",
    type: "Convention Center",
    capacity: 1000,
    rating: 4.5,
    price: "$200-500/hour",
    location: { lat: 37.7649, lng: -122.4294 },
    address: "789 Convention Blvd, San Francisco, CA",
    website: "dtconvention.com",
    amenities: ["Large Space", "AV Equipment", "Catering", "Parking", "Security"],
    description: "Modern convention center ideal for large corporate events",
    image: "/api/placeholder/300/200"
  },
  {
    id: 4,
    name: "Historic Manor House",
    type: "Historic",
    capacity: 150,
    rating: 4.9,
    price: "$120-250/hour",
    location: { lat: 37.7549, lng: -122.4394 },
    address: "321 Heritage Ave, San Francisco, CA",
    website: "historicmanor.com",
    amenities: ["Historic Charm", "Gardens", "Bridal Suite", "Catering"],
    description: "Charming historic manor with beautiful architecture and gardens",
    image: "/api/placeholder/300/200"
  }
];

interface VenueMapProps {
  onVenueSelect?: (venue: any) => void;
  selectedVenueId?: number;
}

export function VenueMap({ onVenueSelect, selectedVenueId }: VenueMapProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCapacity, setFilterCapacity] = useState('all');
  const [filterDistance, setFilterDistance] = useState('all');
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [mapView, setMapView] = useState<'satellite' | 'terrain' | 'street'>('terrain');
  const [bookmarkedVenues, setBookmarkedVenues] = useState<number[]>([]);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Calculate distance between two coordinates (simplified)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venue.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || venue.type === filterType;
    const matchesCapacity = filterCapacity === 'all' || 
                           (filterCapacity === 'small' && venue.capacity <= 100) ||
                           (filterCapacity === 'medium' && venue.capacity > 100 && venue.capacity <= 300) ||
                           (filterCapacity === 'large' && venue.capacity > 300);
    
    const distance = calculateDistance(mapCenter.lat, mapCenter.lng, venue.location.lat, venue.location.lng);
    const matchesDistance = filterDistance === 'all' ||
                           (filterDistance === 'near' && distance <= 5) ||
                           (filterDistance === 'medium' && distance > 5 && distance <= 15) ||
                           (filterDistance === 'far' && distance > 15);
    
    const matchesBookmark = !showBookmarkedOnly || bookmarkedVenues.includes(venue.id);
    
    return matchesSearch && matchesType && matchesCapacity && matchesDistance && matchesBookmark;
  });

  const handleVenueClick = (venue: any) => {
    setSelectedVenue(venue);
    setMapCenter(venue.location);
    onVenueSelect?.(venue);
  };

  const toggleBookmark = (venueId: number) => {
    setBookmarkedVenues(prev => 
      prev.includes(venueId) 
        ? prev.filter(id => id !== venueId)
        : [...prev, venueId]
    );
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.3, 4));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.3, 0.3));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setMapOffset({ x: 0, y: 0 });
    setMapCenter({ lat: 37.7749, lng: -122.4194 });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleMapViewChange = (view: 'satellite' | 'terrain' | 'street') => {
    setMapView(view);
  };

  // Enhanced pan functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsPanning(true);
      setPanStart({ x: e.clientX - mapOffset.x, y: e.clientY - mapOffset.y });
      e.preventDefault();
    }
  }, [mapOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const newOffset = {
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      };
      setMapOffset(newOffset);
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(prev => Math.max(0.3, Math.min(4, prev + delta)));
  }, []);

  useEffect(() => {
    if (selectedVenueId) {
      const venue = venues.find(v => v.id === selectedVenueId);
      if (venue) {
        handleVenueClick(venue);
      }
    }
  }, [selectedVenueId]);

  return (
    <div className={`bg-white rounded-lg shadow-lg ${isFullscreen ? 'fixed inset-4 z-50' : 'h-[600px]'}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-burgundy-800">Explore Venues</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="text-burgundy-600 border-burgundy-300"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search venues or locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Venue Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Hotel">Hotel</SelectItem>
              <SelectItem value="Outdoor">Outdoor</SelectItem>
              <SelectItem value="Convention Center">Convention</SelectItem>
              <SelectItem value="Historic">Historic</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterCapacity} onValueChange={setFilterCapacity}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Capacity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sizes</SelectItem>
              <SelectItem value="small">1-100 guests</SelectItem>
              <SelectItem value="medium">101-300 guests</SelectItem>
              <SelectItem value="large">300+ guests</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterDistance} onValueChange={setFilterDistance}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Distance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Distances</SelectItem>
              <SelectItem value="near">Within 5km</SelectItem>
              <SelectItem value="medium">5-15km</SelectItem>
              <SelectItem value="far">15km+</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={showBookmarkedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
            className={showBookmarkedOnly ? "bg-burgundy-600 hover:bg-burgundy-700" : "border-burgundy-300"}
          >
            <Star className={`w-4 h-4 mr-1 ${showBookmarkedOnly ? 'fill-current' : ''}`} />
            Bookmarked ({bookmarkedVenues.length})
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100%-120px)]">
        {/* Map Area */}
        <div className="flex-1 relative bg-gradient-to-br from-blue-50 to-green-50 overflow-hidden">
          <div
            ref={mapRef}
            className={`w-full h-full relative select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{
              transform: `scale(${zoomLevel}) translate(${mapOffset.x / zoomLevel}px, ${mapOffset.y / zoomLevel}px)`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.3s ease'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* Map Background */}
            <div className={`absolute inset-0 ${
              mapView === 'satellite' ? 'bg-gradient-to-br from-slate-800 to-slate-600' :
              mapView === 'terrain' ? 'bg-gradient-to-br from-green-100 to-blue-100' :
              'bg-gradient-to-br from-gray-100 to-gray-200'
            }`}>
              {/* Dynamic grid lines based on zoom and view */}
              <div className={`absolute inset-0 ${
                mapView === 'satellite' ? 'opacity-10' : 'opacity-20'
              }`}>
                {[...Array(Math.floor(20 * zoomLevel))].map((_, i) => (
                  <div 
                    key={`h-${i}`} 
                    className={`absolute w-full h-px ${
                      mapView === 'satellite' ? 'bg-white' : 'bg-gray-400'
                    }`} 
                    style={{ top: `${i * (5 / zoomLevel)}%` }} 
                  />
                ))}
                {[...Array(Math.floor(20 * zoomLevel))].map((_, i) => (
                  <div 
                    key={`v-${i}`} 
                    className={`absolute h-full w-px ${
                      mapView === 'satellite' ? 'bg-white' : 'bg-gray-400'
                    }`} 
                    style={{ left: `${i * (5 / zoomLevel)}%` }} 
                  />
                ))}
              </div>

              {/* Enhanced terrain features for terrain view */}
              {mapView === 'terrain' && (
                <div className="absolute inset-0">
                  {/* Rivers */}
                  <div className="absolute w-full h-2 bg-blue-300 opacity-50" style={{ top: '45%', transform: 'rotate(-15deg)' }} />
                  <div className="absolute w-full h-1 bg-blue-400 opacity-40" style={{ top: '60%', transform: 'rotate(25deg)' }} />
                  
                  {/* Parks/Green areas */}
                  <div className="absolute w-32 h-32 bg-green-300 opacity-30 rounded-full" style={{ top: '20%', left: '15%' }} />
                  <div className="absolute w-24 h-24 bg-green-400 opacity-25 rounded-full" style={{ top: '70%', right: '20%' }} />
                  
                  {/* Roads */}
                  <div className="absolute w-full h-px bg-gray-500 opacity-40" style={{ top: '30%' }} />
                  <div className="absolute h-full w-px bg-gray-500 opacity-40" style={{ left: '50%' }} />
                  <div className="absolute w-full h-px bg-gray-500 opacity-40" style={{ top: '70%' }} />
                  <div className="absolute h-full w-px bg-gray-500 opacity-40" style={{ left: '25%' }} />
                  <div className="absolute h-full w-px bg-gray-500 opacity-40" style={{ left: '75%' }} />
                </div>
              )}

              {/* Street view details */}
              {mapView === 'street' && zoomLevel > 1.5 && (
                <div className="absolute inset-0">
                  {/* Buildings */}
                  <div className="absolute w-8 h-12 bg-gray-400 opacity-60" style={{ top: '25%', left: '20%' }} />
                  <div className="absolute w-12 h-8 bg-gray-500 opacity-60" style={{ top: '45%', left: '60%' }} />
                  <div className="absolute w-6 h-10 bg-gray-400 opacity-60" style={{ top: '65%', left: '35%' }} />
                  <div className="absolute w-10 h-6 bg-gray-500 opacity-60" style={{ top: '30%', right: '25%' }} />
                </div>
              )}
              
              {/* Venue Markers */}
              {filteredVenues.map((venue) => {
                const x = ((venue.location.lng + 122.4194) / 0.05) * 100;
                const y = ((37.7849 - venue.location.lat) / 0.03) * 100;
                
                return (
                  <div
                    key={venue.id}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${
                      selectedVenue?.id === venue.id ? 'scale-125 z-20' : 'hover:scale-110 z-10'
                    }`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    onClick={() => handleVenueClick(venue)}
                  >
                    <div className={`relative ${selectedVenue?.id === venue.id ? 'animate-pulse' : ''}`}>
                      <MapPin className={`w-8 h-8 ${selectedVenue?.id === venue.id ? 'text-burgundy-600' : 'text-burgundy-500'} drop-shadow-lg`} />
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow-md text-xs font-medium whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                        {venue.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Enhanced Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {/* Zoom Controls */}
            <div className="flex flex-col gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                className="h-8 w-8 p-0 hover:bg-burgundy-100"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <div className="px-2 py-1 text-xs font-medium text-center min-w-[60px] text-gray-600">
                {Math.round(zoomLevel * 100)}%
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                className="h-8 w-8 p-0 hover:bg-burgundy-100"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </div>

            {/* View Controls */}
            <div className="flex flex-col gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetView}
                className="h-8 w-8 p-0 hover:bg-burgundy-100"
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPanning(!isPanning)}
                className={`h-8 w-8 p-0 hover:bg-burgundy-100 ${isPanning ? 'bg-burgundy-200' : ''}`}
                title="Pan Mode"
              >
                <Move className="w-4 h-4" />
              </Button>
            </div>

            {/* Map View Selector */}
            <div className="flex flex-col gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMapViewChange('terrain')}
                className={`h-8 w-8 p-0 hover:bg-burgundy-100 ${mapView === 'terrain' ? 'bg-burgundy-200' : ''}`}
                title="Terrain View"
              >
                <Layers className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMapViewChange('satellite')}
                className={`h-8 w-8 p-0 hover:bg-burgundy-100 ${mapView === 'satellite' ? 'bg-burgundy-200' : ''}`}
                title="Satellite View"
              >
                <Globe className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMapViewChange('street')}
                className={`h-8 w-8 p-0 hover:bg-burgundy-100 ${mapView === 'street' ? 'bg-burgundy-200' : ''}`}
                title="Street View"
              >
                <Navigation className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Map Info Overlay */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
            <div className="text-sm font-medium text-burgundy-800 mb-1">Map Controls</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• Scroll to zoom in/out</div>
              <div>• Click and drag to pan around</div>
              <div>• Click markers for venue details</div>
              <div>• Use controls to change map view</div>
            </div>
          </div>
        </div>

        {/* Venue Details Panel */}
        <div className="w-80 border-l border-gray-200 overflow-y-auto">
          {selectedVenue ? (
            <div className="p-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-burgundy-800">{selectedVenue.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{selectedVenue.type}</Badge>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-white text-white" />
                          <span className="text-sm font-medium">{selectedVenue.rating}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {Math.round(calculateDistance(mapCenter.lat, mapCenter.lng, selectedVenue.location.lat, selectedVenue.location.lng) * 10) / 10}km away
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBookmark(selectedVenue.id)}
                      className="ml-2"
                    >
                      <Heart className={`w-4 h-4 ${bookmarkedVenues.includes(selectedVenue.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                    <span className="text-gray-500">Venue Image</span>
                  </div>
                  
                  <p className="text-sm text-gray-600">{selectedVenue.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-burgundy-500" />
                      <span>{selectedVenue.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-burgundy-500" />
                      <span>{selectedVenue.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-burgundy-500" />
                      <span>{selectedVenue.website}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-burgundy-800 mb-2">Details</h4>
                    <div className="text-sm space-y-1">
                      <div>Capacity: <span className="font-medium">{selectedVenue.capacity} guests</span></div>
                      <div>Price: <span className="font-medium">{selectedVenue.price}</span></div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-burgundy-800 mb-2">Amenities</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedVenue.amenities.map((amenity: string) => (
                        <Badge key={amenity} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-burgundy-600 hover:bg-burgundy-700"
                      onClick={() => onVenueSelect?.(selectedVenue)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Select Venue
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`https://${selectedVenue.website}`, '_blank')}
                      className="border-burgundy-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Click on a venue marker to view details</p>
              <p className="text-sm mt-2">Found {filteredVenues.length} venues</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}