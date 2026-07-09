import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Users, Utensils, Star, Heart, Sparkles } from "lucide-react";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

type SeatInfo = {
  id: string;
  firstName: string;
  lastName: string;
  tableAssignment: string;
  seatNumber?: string;
  group?: string;
  dietaryRestrictions?: string;
  mealChoice?: string;
  plusOnes?: number;
  plusOneNames?: string;
};

type EventInfo = {
  name: string;
  date?: string;
  venue?: string;
  guests: SeatInfo[];
};

export default function FindYourSeat({ eventId }: { eventId: string }) {
  usePageMeta({ title: "Find Your Seat — Event Perfekt" });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<SeatInfo | null>(null);
  const [showResult, setShowResult] = useState(false);

  const { data, isLoading, error } = useQuery<EventInfo>({
    queryKey: ["/api/events", eventId, "find-seat"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/find-seat`);
      if (!res.ok) throw new Error("Event not found");
      return res.json();
    },
  });

  const matchingGuests = searchQuery.trim().length >= 2
    ? (data?.guests || []).filter(g => {
        const fullName = `${g.firstName} ${g.lastName}`.toLowerCase();
        const q = searchQuery.toLowerCase().trim();
        return fullName.includes(q) || g.firstName.toLowerCase().includes(q) || g.lastName.toLowerCase().includes(q);
      })
    : [];

  const handleSelectGuest = (guest: SeatInfo) => {
    setSelectedGuest(guest);
    setShowResult(true);
    setSearchQuery("");
  };

  const handleReset = () => {
    setSelectedGuest(null);
    setShowResult(false);
    setSearchQuery("");
  };

  useEffect(() => {
    if (showResult) {
      const timer = setTimeout(() => {
        handleReset();
      }, 30000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [showResult]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fdf6f0] via-white to-[#f8ece3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1538] mx-auto mb-4" />
          <p className="text-[#330311]/60">Loading seating information...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fdf6f0] via-white to-[#f8ece3] flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-[#8B1538]/20">
          <CardContent className="p-8 text-center">
            <img src={logoPath} alt="Event Perfekt" className="w-16 h-16 rounded-full mx-auto mb-4 object-cover" />
            <h2 className="text-xl font-semibold text-[#330311] mb-2">Seating Chart Not Available</h2>
            <p className="text-[#330311]/60">This event's seating chart is not currently available. Please check with your event planner.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResult && selectedGuest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fdf6f0] via-white to-[#f8ece3] flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8">
            <Sparkles className="w-12 h-12 text-[#8B1538] mx-auto mb-2 animate-pulse" />
            <p className="text-[#330311]/60 text-sm uppercase tracking-widest font-medium">Welcome</p>
          </div>

          <Card className="border-[#8B1538]/20 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#330311] to-[#8B1538] p-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white font-['Poppins']">
                {selectedGuest.firstName} {selectedGuest.lastName}
              </h2>
              {selectedGuest.group && selectedGuest.group !== "General" && (
                <Badge className="mt-2 bg-white/20 text-white border-white/30">
                  {selectedGuest.group === "VIP" && <Star className="w-3 h-3 mr-1" />}
                  {selectedGuest.group}
                </Badge>
              )}
            </div>

            <CardContent className="p-8 space-y-6">
              <div className="bg-[#8B1538]/5 rounded-2xl p-8 border border-[#8B1538]/10">
                <p className="text-[#330311]/50 text-sm uppercase tracking-wider mb-2">Your Table</p>
                <p className="text-6xl md:text-7xl font-bold text-[#8B1538] font-['Poppins']">
                  {selectedGuest.tableAssignment || "TBA"}
                </p>
                {selectedGuest.seatNumber && (
                  <p className="text-[#330311]/60 mt-2">Seat {selectedGuest.seatNumber}</p>
                )}
              </div>

              {(selectedGuest.mealChoice || selectedGuest.dietaryRestrictions) && (
                <div className="flex flex-wrap gap-3 justify-center">
                  {selectedGuest.mealChoice && (
                    <div className="flex items-center gap-2 text-sm text-[#330311]/70 bg-amber-50 px-4 py-2 rounded-full border border-amber-200">
                      <Utensils className="w-4 h-4 text-amber-600" />
                      {selectedGuest.mealChoice}
                    </div>
                  )}
                  {selectedGuest.dietaryRestrictions && (
                    <div className="flex items-center gap-2 text-sm text-[#330311]/70 bg-green-50 px-4 py-2 rounded-full border border-green-200">
                      <Heart className="w-4 h-4 text-green-600" />
                      {selectedGuest.dietaryRestrictions}
                    </div>
                  )}
                </div>
              )}

              {selectedGuest.plusOnes && selectedGuest.plusOnes > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-[#330311]/60">
                  <Users className="w-4 h-4" />
                  <span>+{selectedGuest.plusOnes} guest{selectedGuest.plusOnes > 1 ? "s" : ""}</span>
                  {selectedGuest.plusOneNames && (
                    <span className="text-[#330311]/40">({selectedGuest.plusOneNames})</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleReset}
            variant="outline"
            className="mt-8 border-[#8B1538]/30 text-[#8B1538] hover:bg-[#8B1538]/5"
          >
            <Search className="w-4 h-4 mr-2" />
            Search Another Guest
          </Button>

          <p className="text-[#330311]/30 text-xs mt-6">This screen will reset automatically</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf6f0] via-white to-[#f8ece3] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <img
          src={logoPath}
          alt="Event Perfekt"
          className="w-20 h-20 rounded-full mx-auto mb-4 object-cover shadow-lg border-2 border-[#8B1538]/20"
        />

        <h1 className="text-3xl md:text-4xl font-bold text-[#330311] font-['Poppins'] mb-1">
          Please Find Your Seat
        </h1>

        {data.name && (
          <p className="text-[#8B1538] font-medium text-lg mb-1">{data.name}</p>
        )}

        {(data.date || data.venue) && (
          <div className="flex items-center justify-center gap-3 text-[#330311]/50 text-sm mb-8">
            {data.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {data.venue}
              </span>
            )}
            {data.date && <span>{new Date(data.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>}
          </div>
        )}

        <Card className="border-[#8B1538]/10 shadow-xl">
          <CardContent className="p-6">
            <p className="text-[#330311]/60 text-sm mb-4">
              Type your name below to find your table
            </p>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B1538]/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter your name..."
                className="pl-12 h-14 text-lg border-[#8B1538]/20 focus:border-[#8B1538] focus:ring-[#8B1538]/20 rounded-xl bg-white"
                autoFocus
                autoComplete="off"
              />
            </div>

            {searchQuery.trim().length >= 2 && (
              <div className="mt-4 max-h-60 overflow-y-auto">
                {matchingGuests.length === 0 ? (
                  <p className="text-[#330311]/40 text-sm py-4">
                    No guests found matching "{searchQuery}". Please try again.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {matchingGuests.map((guest) => (
                      <button
                        key={guest.id}
                        onClick={() => handleSelectGuest(guest)}
                        className="w-full text-left p-4 rounded-xl border border-[#8B1538]/10 hover:border-[#8B1538]/30 hover:bg-[#8B1538]/5 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-[#330311] group-hover:text-[#8B1538] transition-colors">
                              {guest.firstName} {guest.lastName}
                            </p>
                            {guest.group && guest.group !== "General" && (
                              <p className="text-xs text-[#330311]/40 mt-0.5">{guest.group}</p>
                            )}
                          </div>
                          {guest.tableAssignment && (
                            <Badge variant="outline" className="border-[#8B1538]/20 text-[#8B1538] text-xs">
                              Table {guest.tableAssignment}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {searchQuery.trim().length < 2 && searchQuery.trim().length > 0 && (
              <p className="text-[#330311]/40 text-xs mt-3">Keep typing to search...</p>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 flex items-center justify-center gap-2 text-[#330311]/20 text-xs">
          <img src={logoPath} alt="" className="w-4 h-4 rounded-full object-cover opacity-40" />
          <span>Powered by Event Perfekt</span>
        </div>
      </div>
    </div>
  );
}
