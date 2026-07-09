import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Search, Filter, MapPin, Users, Star, ChevronRight, X, Building2,
  Wifi, Car, Utensils, Monitor, Accessibility, Trees, Sun, Hotel,
  Phone, Mail, Globe, CheckCircle, Clock, BarChart3, FileText,
  SlidersHorizontal, Grid3X3, List, ArrowUpDown, GitCompare,
  Send, Eye, Maximize2, ChevronDown, ChevronUp, Badge, Award,
  CalendarDays, DollarSign, Layers, LayoutGrid, Columns, Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

type Venue = {
  id: number; name: string; type: string; city: string; country: string;
  address: string; postcode?: string; region?: string;
  capacity_seated?: number; capacity_standing?: number; capacity_theater?: number;
  capacity_classroom?: number; capacity_banquet?: number; capacity_ushape?: number;
  price_range?: string; day_delegate_rate?: string; room_hire_from?: string; currency?: string;
  description?: string; short_description?: string;
  amenities?: string[]; rooms?: any[]; images?: string[]; thumbnail_url?: string;
  website_url?: string; contact_email?: string; contact_phone?: string; contact_name?: string;
  rating?: string; review_count?: number; accreditations?: string[];
  parking?: boolean; parking_spaces?: number; accommodation?: boolean; accommodation_rooms?: number;
  catering_inhouse?: boolean; catering_external?: boolean;
  av_equipment?: boolean; wifi?: boolean; disabled_access?: boolean;
  outdoor_space?: boolean; natural_light?: boolean;
  nearest_station?: string; distance_station?: string;
  nearest_airport?: string; distance_airport?: string;
  tags?: string[]; featured?: boolean;
};

const VENUE_TYPES = [
  { value: "hotel", label: "Hotel" }, { value: "conference_centre", label: "Conference Centre" },
  { value: "unique", label: "Unique Venue" }, { value: "manor", label: "Manor / Estate" },
  { value: "banquet_hall", label: "Banquet Hall" }, { value: "rooftop", label: "Rooftop" },
  { value: "outdoor", label: "Outdoor" }, { value: "museum", label: "Museum / Gallery" },
];
const PRICE_RANGES = [
  { value: "budget", label: "Budget" }, { value: "moderate", label: "Moderate" },
  { value: "premium", label: "Premium" }, { value: "luxury", label: "Luxury" },
];
const AMENITY_FILTERS = [
  { key: "wifi", label: "WiFi", icon: Wifi },
  { key: "parking", label: "Parking", icon: Car },
  { key: "catering_inhouse", label: "In-house Catering", icon: Utensils },
  { key: "av_equipment", label: "AV Equipment", icon: Monitor },
  { key: "disabled_access", label: "Disabled Access", icon: Accessibility },
  { key: "outdoor_space", label: "Outdoor Space", icon: Trees },
  { key: "natural_light", label: "Natural Light", icon: Sun },
  { key: "accommodation", label: "Accommodation", icon: Hotel },
];
const PRICE_COLOR: Record<string, string> = {
  budget: "bg-green-100 text-green-800", moderate: "bg-blue-100 text-blue-800",
  premium: "bg-purple-100 text-purple-800", luxury: "bg-amber-100 text-amber-800",
};

function parseJsonField(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return []; } }
  return [];
}

function StarRating({ rating }: { rating?: string }) {
  const r = parseFloat(rating || "0");
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(r) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
      ))}
      <span className="text-xs text-gray-600 ml-0.5">{rating}</span>
    </div>
  );
}

function VenueCard({ venue, onView, onRfp, compareList, onCompare }: {
  venue: Venue; onView: (v: Venue) => void; onRfp: (v: Venue) => void;
  compareList: number[]; onCompare: (id: number) => void;
}) {
  const amenities = parseJsonField(venue.amenities);
  const tags = parseJsonField(venue.tags);
  const inCompare = compareList.includes(venue.id);

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 bg-white">
      <div className="relative h-52 overflow-hidden bg-gray-100">
        {venue.thumbnail_url ? (
          <img src={venue.thumbnail_url} alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#330311] to-[#6b0a27]">
            <Building2 className="h-16 w-16 text-white/30" />
          </div>
        )}
        {venue.featured && (
          <div className="absolute top-3 left-3">
            <span className="bg-[#330311] text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Award className="h-3 w-3" /> Featured
            </span>
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-1.5">
          {venue.price_range && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PRICE_COLOR[venue.price_range] || "bg-gray-100 text-gray-700"}`}>
              {venue.price_range}
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
          <div className="bg-white/90 backdrop-blur rounded-lg px-2.5 py-1.5">
            <StarRating rating={venue.rating} />
            {venue.review_count ? <p className="text-xs text-gray-500">{venue.review_count} reviews</p> : null}
          </div>
          <button
            onClick={() => onCompare(venue.id)}
            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              inCompare ? "bg-[#330311] text-white" : "bg-white/90 backdrop-blur text-gray-700 hover:bg-[#330311] hover:text-white"
            }`}
          >
            {inCompare ? "✓ Compare" : "+ Compare"}
          </button>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="mb-2">
          <span className="text-xs font-medium text-[#330311] uppercase tracking-wide">
            {VENUE_TYPES.find(t => t.value === venue.type)?.label || venue.type}
          </span>
          <h3 className="font-bold text-gray-900 text-lg leading-tight mt-0.5">{venue.name}</h3>
          <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{venue.city}, {venue.country}</span>
            {venue.region && <span className="text-gray-400">· {venue.region}</span>}
          </div>
        </div>
        {venue.short_description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{venue.short_description}</p>
        )}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {venue.capacity_seated && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Users className="h-3.5 w-3.5 text-[#330311]" />
              <span>{venue.capacity_seated.toLocaleString()} seated</span>
            </div>
          )}
          {venue.capacity_standing && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Users className="h-3.5 w-3.5 text-gray-400" />
              <span>{venue.capacity_standing.toLocaleString()} standing</span>
            </div>
          )}
          {venue.day_delegate_rate && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 col-span-2">
              <DollarSign className="h-3.5 w-3.5 text-green-600" />
              <span>DDR from {venue.day_delegate_rate} pp</span>
            </div>
          )}
          {venue.room_hire_from && !venue.day_delegate_rate && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 col-span-2">
              <DollarSign className="h-3.5 w-3.5 text-green-600" />
              <span>Room hire from {venue.room_hire_from}</span>
            </div>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {venue.wifi && <span className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full"><Wifi className="h-3 w-3" />WiFi</span>}
          {venue.parking && <span className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full"><Car className="h-3 w-3" />Parking</span>}
          {venue.catering_inhouse && <span className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full"><Utensils className="h-3 w-3" />Catering</span>}
          {venue.av_equipment && <span className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full"><Monitor className="h-3 w-3" />AV</span>}
          {venue.accommodation && <span className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full"><Hotel className="h-3 w-3" />Rooms</span>}
          {venue.outdoor_space && <span className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full"><Trees className="h-3 w-3" />Outdoor</span>}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onView(venue)} variant="outline"
            className="flex-1 border-[#330311] text-[#330311] hover:bg-[#330311] hover:text-white text-sm h-9">
            <Eye className="h-3.5 w-3.5 mr-1.5" /> View Venue
          </Button>
          <Button onClick={() => onRfp(venue)}
            className="flex-1 bg-[#330311] hover:bg-[#5a0820] text-white text-sm h-9">
            <Send className="h-3.5 w-3.5 mr-1.5" /> Send RFP
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function VenueProfileModal({ venue, onClose, onRfp }: { venue: Venue; onClose: () => void; onRfp: (v: Venue) => void }) {
  const [activeTab, setActiveTab] = useState("overview");
  const amenities = parseJsonField(venue.amenities);
  const rooms = parseJsonField(venue.rooms);
  const accreditations = parseJsonField(venue.accreditations);
  const tags = parseJsonField(venue.tags);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="relative h-72 overflow-hidden">
          {venue.thumbnail_url ? (
            <img src={venue.thumbnail_url} alt={venue.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#330311] to-[#6b0a27]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/90 rounded-full p-1.5 hover:bg-white">
            <X className="h-4 w-4 text-gray-700" />
          </button>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-white/80 text-sm font-medium uppercase tracking-wide">
                  {VENUE_TYPES.find(t => t.value === venue.type)?.label || venue.type}
                </span>
                <h2 className="text-white text-3xl font-bold mt-1">{venue.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-white/80" />
                  <span className="text-white/80 text-sm">{venue.address ? `${venue.address}, ` : ""}{venue.city}, {venue.country}</span>
                </div>
              </div>
              <div className="text-right">
                <StarRating rating={venue.rating} />
                {venue.review_count && <p className="text-white/70 text-xs mt-0.5">{venue.review_count} reviews</p>}
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[calc(90vh-288px)]">
          <div className="p-6">
            <div className="flex gap-3 mb-6 flex-wrap">
              {venue.capacity_seated && (
                <div className="bg-gray-50 border rounded-xl px-4 py-3 text-center min-w-[100px]">
                  <p className="text-2xl font-bold text-[#330311]">{venue.capacity_seated.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Seated</p>
                </div>
              )}
              {venue.capacity_standing && (
                <div className="bg-gray-50 border rounded-xl px-4 py-3 text-center min-w-[100px]">
                  <p className="text-2xl font-bold text-[#330311]">{venue.capacity_standing.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Standing</p>
                </div>
              )}
              {venue.capacity_theater && (
                <div className="bg-gray-50 border rounded-xl px-4 py-3 text-center min-w-[100px]">
                  <p className="text-2xl font-bold text-[#330311]">{venue.capacity_theater.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Theatre</p>
                </div>
              )}
              {venue.capacity_banquet && (
                <div className="bg-gray-50 border rounded-xl px-4 py-3 text-center min-w-[100px]">
                  <p className="text-2xl font-bold text-[#330311]">{venue.capacity_banquet.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Banquet</p>
                </div>
              )}
              {venue.day_delegate_rate && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center min-w-[120px]">
                  <p className="text-lg font-bold text-green-700">{venue.day_delegate_rate}</p>
                  <p className="text-xs text-green-600">DDR per person</p>
                </div>
              )}
              {venue.room_hire_from && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center min-w-[120px]">
                  <p className="text-lg font-bold text-blue-700">{venue.room_hire_from}</p>
                  <p className="text-xs text-blue-600">Room hire from</p>
                </div>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start border-b bg-transparent rounded-none h-auto pb-0 mb-4">
                {["overview","rooms","amenities","location","contact"].map(tab => (
                  <TabsTrigger key={tab} value={tab}
                    className="capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-[#330311] data-[state=active]:text-[#330311] data-[state=active]:bg-transparent text-gray-600">
                    {tab === "amenities" ? "Facilities" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="mt-0">
                {venue.description && <p className="text-gray-700 leading-relaxed mb-4">{venue.description}</p>}
                {!venue.description && venue.short_description && <p className="text-gray-700 leading-relaxed mb-4">{venue.short_description}</p>}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t: string) => <BadgeUI key={t} variant="secondary" className="text-xs">{t}</BadgeUI>)}
                  </div>
                )}
                {accreditations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Accreditations</h4>
                    <div className="flex flex-wrap gap-2">
                      {accreditations.map((a: string) => (
                        <span key={a} className="flex items-center gap-1 text-sm bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full">
                          <Award className="h-3.5 w-3.5" /> {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rooms" className="mt-0">
                {rooms.length > 0 ? (
                  <div className="space-y-3">
                    {rooms.map((room: any, i: number) => (
                      <div key={i} className="border rounded-xl p-4 hover:border-[#330311]/30 hover:bg-[#330311]/5 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{room.name}</h4>
                          <div className="text-right">
                            <p className="font-bold text-[#330311]">{room.capacity?.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">max capacity</p>
                          </div>
                        </div>
                        {room.size_sqm && <p className="text-sm text-gray-500 mb-2">Floor area: {room.size_sqm} m²</p>}
                        {room.setup_options?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {room.setup_options.map((s: string) => (
                              <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Layers className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>Room details not available. Contact the venue for a full room list.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="amenities" className="mt-0">
                <div className="grid grid-cols-2 gap-3">
                  {AMENITY_FILTERS.map(({ key, label, icon: Icon }) => {
                    const has = (venue as any)[key];
                    return (
                      <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border ${has ? "border-green-200 bg-green-50" : "border-gray-100 bg-gray-50 opacity-50"}`}>
                        <div className={`rounded-full p-1.5 ${has ? "bg-green-100" : "bg-gray-200"}`}>
                          <Icon className={`h-4 w-4 ${has ? "text-green-700" : "text-gray-400"}`} />
                        </div>
                        <span className={`text-sm font-medium ${has ? "text-green-800" : "text-gray-400 line-through"}`}>{label}</span>
                        {has && <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />}
                      </div>
                    );
                  })}
                </div>
                {amenities.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-800 mb-3">All Facilities</h4>
                    <div className="flex flex-wrap gap-2">
                      {amenities.map((a: string) => (
                        <span key={a} className="flex items-center gap-1 text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                          <CheckCircle className="h-3 w-3 text-[#330311]" /> {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {venue.parking && venue.parking_spaces && (
                  <p className="text-sm text-gray-600 mt-3"><Car className="h-4 w-4 inline mr-1" /> {venue.parking_spaces} parking spaces available</p>
                )}
                {venue.accommodation && venue.accommodation_rooms && (
                  <p className="text-sm text-gray-600 mt-1"><Hotel className="h-4 w-4 inline mr-1" /> {venue.accommodation_rooms} accommodation rooms available</p>
                )}
              </TabsContent>

              <TabsContent value="location" className="mt-0">
                <div className="space-y-4">
                  {venue.address && (
                    <div className="flex gap-3 items-start">
                      <MapPin className="h-5 w-5 text-[#330311] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-800">Address</p>
                        <p className="text-gray-600">{venue.address}{venue.postcode ? `, ${venue.postcode}` : ""}</p>
                      </div>
                    </div>
                  )}
                  {venue.nearest_station && (
                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold mt-0.5 flex-shrink-0">T</div>
                      <div>
                        <p className="font-medium text-gray-800">Nearest Station</p>
                        <p className="text-gray-600">{venue.nearest_station}{venue.distance_station ? ` — ${venue.distance_station}` : ""}</p>
                      </div>
                    </div>
                  )}
                  {venue.nearest_airport && (
                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold mt-0.5 flex-shrink-0">✈</div>
                      <div>
                        <p className="font-medium text-gray-800">Nearest Airport</p>
                        <p className="text-gray-600">{venue.nearest_airport}{venue.distance_airport ? ` — ${venue.distance_airport}` : ""}</p>
                      </div>
                    </div>
                  )}
                  {venue.website_url && (
                    <a href={venue.website_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#330311] hover:underline mt-2">
                      <Globe className="h-4 w-4" /> Visit website
                    </a>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="contact" className="mt-0">
                <div className="space-y-3">
                  {venue.contact_name && (
                    <div className="flex gap-3 items-center p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-[#330311] rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {venue.contact_name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{venue.contact_name}</p>
                        <p className="text-sm text-gray-500">Events Coordinator</p>
                      </div>
                    </div>
                  )}
                  {venue.contact_email && (
                    <a href={`mailto:${venue.contact_email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
                      <Mail className="h-5 w-5 text-[#330311]" />
                      <span className="text-gray-700">{venue.contact_email}</span>
                    </a>
                  )}
                  {venue.contact_phone && (
                    <a href={`tel:${venue.contact_phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
                      <Phone className="h-5 w-5 text-[#330311]" />
                      <span className="text-gray-700">{venue.contact_phone}</span>
                    </a>
                  )}
                  {!venue.contact_email && !venue.contact_phone && (
                    <div className="text-center py-8 text-gray-400">
                      <Mail className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Use the RFP form below to request full contact details.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-4 border-t flex gap-3">
              <Button onClick={() => onRfp(venue)} className="flex-1 bg-[#330311] hover:bg-[#5a0820] text-white">
                <Send className="h-4 w-4 mr-2" /> Send RFP to {venue.name}
              </Button>
              {venue.website_url && (
                <a href={venue.website_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-[#330311] text-[#330311]">
                    <Globe className="h-4 w-4 mr-2" /> Website
                  </Button>
                </a>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function RfpModal({ venue, onClose }: { venue: Venue; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    event_name: "", event_date: "", event_end_date: "",
    guest_count: "", setup_required: "Banquet", catering_required: false,
    accommodation_required: false, budget: "", message: "", contact_email: "",
  });
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [approverId, setApproverId] = useState("");
  const [approvalComments, setApprovalComments] = useState("");
  
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const rfp = await apiRequest("POST", "/api/venue-rfps", data);
      if (requiresApproval && approverId) {
        const budgetImpact = parseFloat(form.budget || "0");
        await apiRequest("POST", "/api/venue-approvals", {
          rfp_id: rfp.id,
          approver_id: approverId,
          approval_type: budgetImpact > 50000 ? "director" : "manager",
          comments: approvalComments,
          budget_impact: budgetImpact,
        });
      }
      return rfp;
    },
    onSuccess: () => {
      const msg = requiresApproval ? `RFP submitted for approval to ${venue.name}` : `RFP sent to ${venue.name}`;
      toast({ title: "RFP Submitted!", description: msg });
      queryClient.invalidateQueries({ queryKey: ["/api/venue-rfps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/venue-approvals"] });
      onClose();
    },
    onError: () => toast({ title: "Failed to send RFP", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.event_name || !form.event_date) {
      toast({ title: "Please fill in event name and date", variant: "destructive" }); return;
    }
    mutation.mutate({ ...form, venue_id: venue.id, venue_name: venue.name, currency: venue.currency || "GBP" });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#330311]">Send RFP to {venue.name}</DialogTitle>
          <DialogDescription>{venue.city}, {venue.country} · Capacity: {venue.capacity_seated?.toLocaleString()} seated</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-gray-700">Event Name *</Label>
            <Input value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))}
              placeholder="e.g. Annual Gala Dinner 2026" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-700">Event Date *</Label>
              <Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-gray-700">End Date</Label>
              <Input type="date" value={form.event_end_date} onChange={e => setForm(f => ({ ...f, event_end_date: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-700">Expected Guests</Label>
              <Input type="number" value={form.guest_count} onChange={e => setForm(f => ({ ...f, guest_count: e.target.value }))} placeholder="150" className="mt-1" />
            </div>
            <div>
              <Label className="text-gray-700">Budget ({venue.currency || "GBP"})</Label>
              <Input value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="25,000" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-gray-700">Room Setup</Label>
            <Select value={form.setup_required} onValueChange={v => setForm(f => ({ ...f, setup_required: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Banquet","Theatre","Classroom","Cocktail Reception","U-Shape","Boardroom","Cabaret","Exhibition"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="catering" checked={form.catering_required}
                onCheckedChange={v => setForm(f => ({ ...f, catering_required: !!v }))} />
              <Label htmlFor="catering" className="text-sm text-gray-700">Catering required</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="accom" checked={form.accommodation_required}
                onCheckedChange={v => setForm(f => ({ ...f, accommodation_required: !!v }))} />
              <Label htmlFor="accom" className="text-sm text-gray-700">Accommodation needed</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="approval" checked={requiresApproval}
                onCheckedChange={v => setRequiresApproval(!!v)} />
              <Label htmlFor="approval" className="text-sm text-gray-700">Requires manager approval before sending</Label>
            </div>
          </div>
          {requiresApproval && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-800 mb-2">⚠ Approval Workflow Enabled</p>
              <p className="text-xs text-amber-700 mb-3">This RFP will be held for approval before being sent to the venue. Budget impact will trigger appropriate approval levels.</p>
              <div>
                <Label className="text-gray-700 text-sm">Assign to approver (manager/director)</Label>
                <Input type="email" value={approverId} onChange={e => setApproverId(e.target.value)}
                  placeholder="approver@eventperfekt.com" className="mt-1 mb-2" />
              </div>
              <div>
                <Label className="text-gray-700 text-sm">Internal approval notes</Label>
                <Textarea value={approvalComments} onChange={e => setApprovalComments(e.target.value)}
                  placeholder="Explain budget, venue choice rationale, etc. for approver review"
                  rows={3} className="mt-1" />
              </div>
            </div>
          )}
          <div>
            <Label className="text-gray-700">Your Contact Email</Label>
            <Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
              placeholder="you@eventperfekt.com" className="mt-1" />
          </div>
          <div>
            <Label className="text-gray-700">Additional Requirements / Message</Label>
            <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Describe your event in more detail, any special requirements, preferred rooms, AV needs, décor, etc."
              rows={4} className="mt-1" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}
              className="flex-1 bg-[#330311] hover:bg-[#5a0820] text-white">
              {mutation.isPending ? "Sending..." : "Send RFP"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CompareModal({ venues, onClose, onRfp }: { venues: Venue[]; onClose: () => void; onRfp: (v: Venue) => void }) {
  const rows = [
    { label: "Location", fn: (v: Venue) => `${v.city}, ${v.country}` },
    { label: "Type", fn: (v: Venue) => VENUE_TYPES.find(t => t.value === v.type)?.label || v.type },
    { label: "Price Range", fn: (v: Venue) => v.price_range ? v.price_range.charAt(0).toUpperCase() + v.price_range.slice(1) : "—" },
    { label: "DDR per person", fn: (v: Venue) => v.day_delegate_rate || "—" },
    { label: "Room hire from", fn: (v: Venue) => v.room_hire_from || "—" },
    { label: "Seated capacity", fn: (v: Venue) => v.capacity_seated?.toLocaleString() || "—" },
    { label: "Standing capacity", fn: (v: Venue) => v.capacity_standing?.toLocaleString() || "—" },
    { label: "Theatre capacity", fn: (v: Venue) => v.capacity_theater?.toLocaleString() || "—" },
    { label: "Banquet capacity", fn: (v: Venue) => v.capacity_banquet?.toLocaleString() || "—" },
    { label: "Rating", fn: (v: Venue) => v.rating ? `${v.rating} ★` : "—" },
    { label: "WiFi", fn: (v: Venue) => v.wifi ? "✓" : "✗" },
    { label: "Parking", fn: (v: Venue) => v.parking ? `✓${v.parking_spaces ? ` (${v.parking_spaces} spaces)` : ""}` : "✗" },
    { label: "In-house Catering", fn: (v: Venue) => v.catering_inhouse ? "✓" : "✗" },
    { label: "AV Equipment", fn: (v: Venue) => v.av_equipment ? "✓" : "✗" },
    { label: "Accommodation", fn: (v: Venue) => v.accommodation ? `✓${v.accommodation_rooms ? ` (${v.accommodation_rooms} rooms)` : ""}` : "✗" },
    { label: "Outdoor Space", fn: (v: Venue) => v.outdoor_space ? "✓" : "✗" },
    { label: "Disabled Access", fn: (v: Venue) => v.disabled_access ? "✓" : "✗" },
    { label: "Nearest Station", fn: (v: Venue) => v.nearest_station ? `${v.nearest_station}${v.distance_station ? ` (${v.distance_station})` : ""}` : "—" },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-[#330311] flex items-center gap-2">
            <GitCompare className="h-5 w-5" /> Venue Comparison
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6">
            <div className={`grid gap-4 mb-6`} style={{ gridTemplateColumns: `180px repeat(${venues.length}, 1fr)` }}>
              <div />
              {venues.map(v => (
                <div key={v.id} className="text-center">
                  <div className="h-32 rounded-xl overflow-hidden mb-3 bg-gray-100">
                    {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.name} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full bg-gradient-to-br from-[#330311] to-[#6b0a27]" />}
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">{v.name}</h3>
                  <StarRating rating={v.rating} />
                </div>
              ))}
            </div>
            <table className="w-full text-sm">
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="py-2.5 px-3 font-medium text-gray-600 w-44">{row.label}</td>
                    {venues.map(v => {
                      const val = row.fn(v);
                      const isCheck = val === "✓" || val?.startsWith("✓");
                      const isCross = val === "✗";
                      return (
                        <td key={v.id} className={`py-2.5 px-3 text-center ${isCheck ? "text-green-700 font-medium" : isCross ? "text-red-400" : "text-gray-700"}`}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={`grid gap-4 mt-6`} style={{ gridTemplateColumns: `180px repeat(${venues.length}, 1fr)` }}>
              <div />
              {venues.map(v => (
                <Button key={v.id} onClick={() => { onRfp(v); onClose(); }}
                  className="w-full bg-[#330311] hover:bg-[#5a0820] text-white text-sm">
                  <Send className="h-3.5 w-3.5 mr-1.5" /> RFP to {v.name.split(" ")[0]}
                </Button>
              ))}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function RfpDashboard() {
  const { data: rfps = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/venue-rfps"] });
  const STATUS_COLOR: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    responded: "bg-blue-100 text-blue-800 border-blue-200",
    accepted: "bg-green-100 text-green-800 border-green-200",
    declined: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-4">My RFPs ({rfps.length})</h3>
      {isLoading ? <p className="text-gray-500">Loading...</p> : rfps.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No RFPs sent yet</p>
          <p className="text-sm">Search venues and click "Send RFP" to request proposals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rfps.map((rfp: any) => (
            <div key={rfp.id} className="border rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{rfp.venue_name}</h4>
                  <p className="text-sm text-gray-500">{rfp.event_name}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_COLOR[rfp.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {rfp.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mt-2">
                {rfp.event_date && <div className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {rfp.event_date}</div>}
                {rfp.guest_count && <div className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {rfp.guest_count} guests</div>}
                {rfp.budget && <div className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {rfp.budget}</div>}
              </div>
              {rfp.response_message && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Venue Response</p>
                  <p className="text-sm text-blue-800">{rfp.response_message}</p>
                  {rfp.quoted_price && <p className="text-sm font-bold text-blue-900 mt-1">Quoted: {rfp.quoted_price}</p>}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Sent {rfp.created_at ? new Date(rfp.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "recently"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VenueSourcing() {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [venueType, setVenueType] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [minCapacity, setMinCapacity] = useState(0);
  const [amenityFilters, setAmenityFilters] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"directory" | "rfps">("directory");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [rfpVenue, setRfpVenue] = useState<Venue | null>(null);
  const [compareList, setCompareList] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data: allVenues = [], isLoading } = useQuery<Venue[]>({ queryKey: ["/api/venues"] });

  const filtered = useMemo(() => {
    let v = [...allVenues];
    if (search) { const s = search.toLowerCase(); v = v.filter(x => x.name.toLowerCase().includes(s) || x.city.toLowerCase().includes(s) || x.description?.toLowerCase().includes(s) || x.short_description?.toLowerCase().includes(s)); }
    if (country !== "all") v = v.filter(x => x.country.toLowerCase() === country.toLowerCase());
    if (venueType !== "all") v = v.filter(x => x.type === venueType);
    if (priceRange !== "all") v = v.filter(x => x.price_range === priceRange);
    if (minCapacity > 0) v = v.filter(x => (x.capacity_seated || 0) >= minCapacity);
    if (amenityFilters.length > 0) v = v.filter(x => amenityFilters.every(f => (x as any)[f]));
    return v;
  }, [allVenues, search, country, venueType, priceRange, minCapacity, amenityFilters]);

  const toggleCompare = (id: number) => {
    setCompareList(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  };
  const toggleAmenity = (key: string) => {
    setAmenityFilters(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  };
  const compareVenues = allVenues.filter(v => compareList.includes(v.id));
  const activeFilterCount = [country !== "all", venueType !== "all", priceRange !== "all", minCapacity > 0, amenityFilters.length > 0].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#330311] text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
                <ChevronRight className="h-4 w-4" />
                <span>Venue Sourcing</span>
              </div>
              <h1 className="text-3xl font-bold">Venue Sourcing</h1>
              <p className="text-white/70 mt-1">Discover, compare, and book the perfect venue for your event</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setActiveTab("rfps")}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 bg-transparent">
                <FileText className="h-4 w-4 mr-2" /> My RFPs
              </Button>
              <Link href="/floor-plan-builder">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent">
                  <Layers className="h-4 w-4 mr-2" /> Floor Plan Builder
                </Button>
              </Link>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search venues by name, city or keyword..."
              className="pl-12 pr-4 py-3 text-base bg-white border-0 text-gray-900 h-12 rounded-xl shadow-sm"
            />
          </div>

          {/* Quick filters */}
          <div className="flex gap-3 mt-4 flex-wrap">
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white w-36 h-9 text-sm">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                <SelectItem value="Nigeria">🇳🇬 Nigeria</SelectItem>
              </SelectContent>
            </Select>
            <Select value={venueType} onValueChange={setVenueType}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white w-40 h-9 text-sm">
                <SelectValue placeholder="Venue Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {VENUE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white w-36 h-9 text-sm">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Budgets</SelectItem>
                {PRICE_RANGES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className={`border-white/20 text-white h-9 text-sm ${showFilters ? "bg-white/20" : "bg-white/10"} hover:bg-white/20`}>
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              More Filters {activeFilterCount > 0 && <span className="ml-1 bg-white text-[#330311] rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">{activeFilterCount}</span>}
            </Button>
          </div>
        </div>
      </div>

      {/* Extended filters panel */}
      {showFilters && (
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Minimum Seated Capacity: {minCapacity > 0 ? minCapacity.toLocaleString() : "Any"}
                </Label>
                <Slider value={[minCapacity]} onValueChange={([v]) => setMinCapacity(v)}
                  min={0} max={3000} step={50} className="w-full" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Any</span><span>500</span><span>1,000</span><span>2,000</span><span>3,000+</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">Required Facilities</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {AMENITY_FILTERS.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => toggleAmenity(key)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border transition-colors ${
                        amenityFilters.includes(key) ? "bg-[#330311] text-white border-[#330311]" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[#330311]"
                      }`}>
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setMinCapacity(0); setAmenityFilters([]); setCountry("all"); setVenueType("all"); setPriceRange("all"); }}
                  className="text-gray-500 hover:text-gray-900 text-xs">
                  <X className="h-3 w-3 mr-1" /> Clear all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-white border shadow-sm">
              <TabsTrigger value="directory" className="data-[state=active]:bg-[#330311] data-[state=active]:text-white">
                <LayoutGrid className="h-4 w-4 mr-2" /> Venue Directory
              </TabsTrigger>
              <TabsTrigger value="rfps" className="data-[state=active]:bg-[#330311] data-[state=active]:text-white">
                <FileText className="h-4 w-4 mr-2" /> My RFPs
              </TabsTrigger>
            </TabsList>

            {activeTab === "directory" && (
              <div className="flex items-center gap-3">
                {compareList.length > 0 && (
                  <Button onClick={() => setShowCompare(true)}
                    className="bg-[#330311] hover:bg-[#5a0820] text-white text-sm h-9">
                    <GitCompare className="h-4 w-4 mr-2" /> Compare ({compareList.length})
                  </Button>
                )}
                <span className="text-sm text-gray-500">{filtered.length} venue{filtered.length !== 1 ? "s" : ""}</span>
                <div className="flex gap-1 border rounded-lg p-0.5 bg-white">
                  <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-gray-100" : ""}`}>
                    <Grid3X3 className="h-4 w-4 text-gray-600" />
                  </button>
                  <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-gray-100" : ""}`}>
                    <List className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <TabsContent value="directory" className="mt-0">
            {isLoading ? (
              <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl h-72 animate-pulse border" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Building2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-semibold text-gray-500 mb-2">No venues found</h3>
                <p>Try adjusting your search or filters</p>
                <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setCountry("all"); setVenueType("all"); setPriceRange("all"); setMinCapacity(0); setAmenityFilters([]); }}>
                  Clear all filters
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map(v => (
                  <VenueCard key={v.id} venue={v} onView={setSelectedVenue} onRfp={setRfpVenue}
                    compareList={compareList} onCompare={toggleCompare} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map(v => (
                  <Card key={v.id} className="overflow-hidden hover:shadow-md transition-shadow bg-white border">
                    <div className="flex">
                      <div className="w-52 h-36 flex-shrink-0 overflow-hidden bg-gray-100">
                        {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.name} className="w-full h-full object-cover" /> :
                          <div className="w-full h-full bg-gradient-to-br from-[#330311] to-[#6b0a27]" />}
                      </div>
                      <div className="flex-1 p-4 flex gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <span className="text-xs text-[#330311] font-medium uppercase">{VENUE_TYPES.find(t => t.value === v.type)?.label || v.type}</span>
                              <h3 className="font-bold text-gray-900 text-lg">{v.name}</h3>
                              <div className="flex items-center gap-1 text-gray-500 text-sm"><MapPin className="h-3.5 w-3.5" />{v.city}, {v.country}</div>
                            </div>
                            <StarRating rating={v.rating} />
                          </div>
                          {v.short_description && <p className="text-sm text-gray-600 line-clamp-2 mt-1">{v.short_description}</p>}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            {v.capacity_seated && <span><Users className="h-3.5 w-3.5 inline mr-0.5 text-[#330311]" />{v.capacity_seated.toLocaleString()} seated</span>}
                            {v.day_delegate_rate && <span><DollarSign className="h-3.5 w-3.5 inline mr-0.5 text-green-600" />DDR {v.day_delegate_rate}</span>}
                            {v.price_range && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PRICE_COLOR[v.price_range]}`}>{v.price_range}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 justify-center">
                          <Button onClick={() => setSelectedVenue(v)} variant="outline" size="sm" className="border-[#330311] text-[#330311] hover:bg-[#330311] hover:text-white text-xs w-28">
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                          <Button onClick={() => setRfpVenue(v)} size="sm" className="bg-[#330311] hover:bg-[#5a0820] text-white text-xs w-28">
                            <Send className="h-3.5 w-3.5 mr-1" /> Send RFP
                          </Button>
                          <button onClick={() => toggleCompare(v.id)}
                            className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${compareList.includes(v.id) ? "bg-[#330311] text-white border-[#330311]" : "border-gray-200 text-gray-600 hover:border-[#330311]"}`}>
                            {compareList.includes(v.id) ? "✓ Compare" : "+ Compare"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rfps" className="mt-0">
            <div className="max-w-2xl">
              <RfpDashboard />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {selectedVenue && <VenueProfileModal venue={selectedVenue} onClose={() => setSelectedVenue(null)} onRfp={v => { setSelectedVenue(null); setRfpVenue(v); }} />}
      {rfpVenue && <RfpModal venue={rfpVenue} onClose={() => setRfpVenue(null)} />}
      {showCompare && compareVenues.length > 1 && <CompareModal venues={compareVenues} onClose={() => setShowCompare(false)} onRfp={setRfpVenue} />}
    </div>
  );
}
