import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Star, ThumbsUp, Trophy, BarChart3, Plus, MessageSquare, ArrowUpDown, Printer } from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";

interface Vendor {
  id: string;
  name: string;
  service?: string;
  serviceType?: string;
  companyName?: string;
  eventId?: string;
}

interface VendorRating {
  id: string;
  vendor_id: string;
  event_id: string | null;
  rated_by: string;
  communication: number;
  quality: number;
  punctuality: number;
  value: number;
  overall: string;
  review_text: string | null;
  recommended: boolean;
  created_at: string;
}

interface VendorAggregate {
  total_reviews: number;
  avg_communication: string;
  avg_quality: string;
  avg_punctuality: string;
  avg_value: string;
  avg_overall: string;
  recommend_count: number;
}

interface VendorWithRatings {
  vendor: Vendor;
  aggregate: VendorAggregate | null;
}

function StarRating({ value, onChange, size = "md" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-7 h-7" : "w-5 h-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-500"} ${onChange ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          onClick={() => onChange?.(star)}
        />
      ))}
    </div>
  );
}

function RatingForm({ vendors, events, onClose }: { vendors: Vendor[]; events: any[]; onClose: () => void }) {
  const { toast } = useToast();
  const [vendorId, setVendorId] = useState("");
  const [eventId, setEventId] = useState("");
  const [communication, setCommunication] = useState(3);
  const [quality, setQuality] = useState(3);
  const [punctuality, setPunctuality] = useState(3);
  const [valueStar, setValueStar] = useState(3);
  const [reviewText, setReviewText] = useState("");
  const [recommended, setRecommended] = useState(true);

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/vendor-ratings", data),
    onSuccess: () => {
      toast({ title: "Rating submitted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-ratings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to submit rating", description: err.message, variant: "destructive" });
    },
  });

  const overall = ((communication + quality + punctuality + valueStar) / 4).toFixed(1);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Vendor *</Label>
        <Select value={vendorId} onValueChange={setVendorId}>
          <SelectTrigger className="bg-white/5 border-white/10">
            <SelectValue placeholder="Select vendor" />
          </SelectTrigger>
          <SelectContent>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name} — {v.serviceType || v.service || "General"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Event (optional)</Label>
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger className="bg-white/5 border-white/10">
            <SelectValue placeholder="Select event" />
          </SelectTrigger>
          <SelectContent>
            {events.map((e: any) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Communication", val: communication, set: setCommunication },
          { label: "Quality", val: quality, set: setQuality },
          { label: "Punctuality", val: punctuality, set: setPunctuality },
          { label: "Value for Money", val: valueStar, set: setValueStar },
        ].map(({ label, val, set }) => (
          <div key={label} className="space-y-1">
            <Label className="text-sm text-gray-300">{label}</Label>
            <StarRating value={val} onChange={set} />
          </div>
        ))}
      </div>

      <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
        <p className="text-sm text-gray-400">Overall Score</p>
        <p className="text-2xl font-bold text-yellow-400">{overall}</p>
        <StarRating value={Math.round(parseFloat(overall))} size="lg" />
      </div>

      <div className="space-y-2">
        <Label>Review</Label>
        <Textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience..."
          className="bg-white/5 border-white/10 min-h-[80px]"
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={recommended} onCheckedChange={setRecommended} />
        <Label>Would you recommend this vendor?</Label>
      </div>

      <Button
        className="w-full bg-[#8B1538] hover:bg-[#6d1029]"
        disabled={!vendorId || mutation.isPending}
        onClick={() => mutation.mutate({
          vendor_id: vendorId,
          event_id: eventId || null,
          communication,
          quality,
          punctuality,
          value: valueStar,
          review_text: reviewText || null,
          recommended,
        })}
      >
        {mutation.isPending ? "Submitting..." : "Submit Rating"}
      </Button>
    </div>
  );
}

export default function VendorRatings() {
  const { toast } = useToast();
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<string>("avg_overall");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const { data: allRatings = [], isLoading: ratingsLoading } = useQuery<VendorRating[]>({
    queryKey: ["/api/vendor-ratings"],
  });

  const { data: vendorDetail } = useQuery<{ ratings: VendorRating[]; aggregate: VendorAggregate }>({
    queryKey: ["/api/vendors", selectedVendorId, "ratings"],
    enabled: !!selectedVendorId,
  });

  const vendorAggregates: VendorWithRatings[] = vendors.map((v) => {
    const vRatings = allRatings.filter((r) => r.vendor_id === v.id);
    if (vRatings.length === 0) return { vendor: v, aggregate: null };
    const avg = (field: keyof VendorRating) => {
      const sum = vRatings.reduce((s, r) => s + Number(r[field]), 0);
      return (sum / vRatings.length).toFixed(1);
    };
    return {
      vendor: v,
      aggregate: {
        total_reviews: vRatings.length,
        avg_communication: avg("communication"),
        avg_quality: avg("quality"),
        avg_punctuality: avg("punctuality"),
        avg_value: avg("value"),
        avg_overall: avg("overall"),
        recommend_count: vRatings.filter((r) => r.recommended).length,
      },
    };
  });

  const sortedVendors = [...vendorAggregates].sort((a, b) => {
    const aVal = a.aggregate ? parseFloat((a.aggregate as any)[sortField] || "0") : 0;
    const bVal = b.aggregate ? parseFloat((b.aggregate as any)[sortField] || "0") : 0;
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const isLoading = vendorsLoading || ratingsLoading;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#16213e] via-[#1a1a2e] to-[#0f3460]">
      <PlannerSidebar />
      <main className="flex-1 lg:ml-60 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white font-['Poppins']">Vendor Ratings</h1>
              <p className="text-gray-400 mt-1">Rate and compare vendor performance across events</p>
            </div>
            {sortedVendors.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  openPrintWindow({
                    title: "Vendor Ratings Comparison",
                    stats: [
                      { label: "Total Vendors", value: vendors.length },
                      { label: "Rated Vendors", value: sortedVendors.filter(v => v.aggregate && v.aggregate.total_reviews > 0).length },
                      { label: "Total Reviews", value: allRatings.length },
                    ],
                    columns: [
                      { header: "Vendor", key: "name" },
                      { header: "Service", key: "service" },
                      { header: "Communication", key: "communication" },
                      { header: "Quality", key: "quality" },
                      { header: "Punctuality", key: "punctuality" },
                      { header: "Value", key: "value" },
                      { header: "Overall", key: "overall" },
                      { header: "Reviews", key: "reviews", align: "center" },
                      { header: "Recommend %", key: "recommend", align: "center" },
                    ],
                    rows: sortedVendors.map(({ vendor, aggregate }) => ({
                      name: vendor.name,
                      service: vendor.serviceType || vendor.service || "—",
                      communication: aggregate?.avg_communication || "—",
                      quality: aggregate?.avg_quality || "—",
                      punctuality: aggregate?.avg_punctuality || "—",
                      value: aggregate?.avg_value || "—",
                      overall: aggregate?.avg_overall || "—",
                      reviews: aggregate?.total_reviews || 0,
                      recommend: aggregate && aggregate.total_reviews > 0
                        ? `${Math.round((aggregate.recommend_count / aggregate.total_reviews) * 100)}%`
                        : "—",
                    })),
                    orientation: "landscape",
                  });
                }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#8B1538] hover:bg-[#6d1029] gap-2">
                  <Plus className="w-4 h-4" /> Rate Vendor
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle>Rate a Vendor</DialogTitle>
                </DialogHeader>
                <RatingForm vendors={vendors} events={events} onClose={() => setDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="comparison" className="space-y-4">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="comparison" className="data-[state=active]:bg-[#8B1538]">
                <BarChart3 className="w-4 h-4 mr-2" /> Comparison
              </TabsTrigger>
              <TabsTrigger value="reviews" className="data-[state=active]:bg-[#8B1538]">
                <MessageSquare className="w-4 h-4 mr-2" /> All Reviews
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="data-[state=active]:bg-[#8B1538]">
                <Trophy className="w-4 h-4 mr-2" /> Leaderboard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comparison">
              {isLoading ? (
                <div className="text-center py-12 text-gray-400">Loading vendors...</div>
              ) : vendors.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="py-12 text-center text-gray-400">
                    No vendors found. Add vendors to your events first.
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm text-white">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="text-left p-3 font-medium">Vendor</th>
                        <th className="text-left p-3 font-medium">Service</th>
                        <th className="p-3 font-medium cursor-pointer" onClick={() => toggleSort("avg_communication")}>
                          <div className="flex items-center gap-1 justify-center">Communication <ArrowUpDown className="w-3 h-3" /></div>
                        </th>
                        <th className="p-3 font-medium cursor-pointer" onClick={() => toggleSort("avg_quality")}>
                          <div className="flex items-center gap-1 justify-center">Quality <ArrowUpDown className="w-3 h-3" /></div>
                        </th>
                        <th className="p-3 font-medium cursor-pointer" onClick={() => toggleSort("avg_punctuality")}>
                          <div className="flex items-center gap-1 justify-center">Punctuality <ArrowUpDown className="w-3 h-3" /></div>
                        </th>
                        <th className="p-3 font-medium cursor-pointer" onClick={() => toggleSort("avg_value")}>
                          <div className="flex items-center gap-1 justify-center">Value <ArrowUpDown className="w-3 h-3" /></div>
                        </th>
                        <th className="p-3 font-medium cursor-pointer" onClick={() => toggleSort("avg_overall")}>
                          <div className="flex items-center gap-1 justify-center">Overall <ArrowUpDown className="w-3 h-3" /></div>
                        </th>
                        <th className="p-3 font-medium">Reviews</th>
                        <th className="p-3 font-medium">Recommend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedVendors.map(({ vendor, aggregate }) => (
                        <tr
                          key={vendor.id}
                          className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                          onClick={() => setSelectedVendorId(vendor.id)}
                        >
                          <td className="p-3 font-medium">{vendor.name}</td>
                          <td className="p-3 text-gray-400">{vendor.serviceType || vendor.service || "—"}</td>
                          <td className="p-3 text-center">
                            {aggregate ? (
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {aggregate.avg_communication}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="p-3 text-center">
                            {aggregate ? (
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {aggregate.avg_quality}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="p-3 text-center">
                            {aggregate ? (
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {aggregate.avg_punctuality}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="p-3 text-center">
                            {aggregate ? (
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {aggregate.avg_value}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="p-3 text-center">
                            {aggregate ? (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                <Star className="w-3 h-3 fill-yellow-400 mr-1" />
                                {aggregate.avg_overall}
                              </Badge>
                            ) : (
                              <span className="text-gray-500">No ratings</span>
                            )}
                          </td>
                          <td className="p-3 text-center text-gray-400">{aggregate?.total_reviews || 0}</td>
                          <td className="p-3 text-center">
                            {aggregate && aggregate.total_reviews > 0 ? (
                              <div className="flex items-center justify-center gap-1">
                                <ThumbsUp className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">
                                  {Math.round((aggregate.recommend_count / aggregate.total_reviews) * 100)}%
                                </span>
                              </div>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews">
              {allRatings.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="py-12 text-center text-gray-400">
                    No reviews yet. Rate a vendor to get started.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {allRatings.map((rating) => {
                    const vendor = vendors.find((v) => v.id === rating.vendor_id);
                    const event = events.find((e: any) => e.id === rating.event_id);
                    return (
                      <Card key={rating.id} className="bg-white/5 border-white/10 text-white">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{vendor?.name || "Unknown Vendor"}</CardTitle>
                              {event && <p className="text-sm text-gray-400">{event.name}</p>}
                            </div>
                            <Badge className={rating.recommended ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                              {rating.recommended ? (
                                <><ThumbsUp className="w-3 h-3 mr-1" /> Recommended</>
                              ) : "Not Recommended"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-3">
                            <StarRating value={Math.round(parseFloat(rating.overall))} size="sm" />
                            <span className="text-yellow-400 font-semibold">{rating.overall}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
                            <div>Comm: <span className="text-white">{rating.communication}</span></div>
                            <div>Quality: <span className="text-white">{rating.quality}</span></div>
                            <div>Punct: <span className="text-white">{rating.punctuality}</span></div>
                            <div>Value: <span className="text-white">{rating.value}</span></div>
                          </div>
                          {rating.review_text && (
                            <p className="text-sm text-gray-300 italic">"{rating.review_text}"</p>
                          )}
                          <p className="text-xs text-gray-500">{new Date(rating.created_at).toLocaleDateString()}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="leaderboard">
              {isLoading ? (
                <div className="text-center py-12 text-gray-400">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {sortedVendors
                    .filter((v) => v.aggregate && v.aggregate.total_reviews > 0)
                    .map(({ vendor, aggregate }, index) => (
                      <Card
                        key={vendor.id}
                        className={`bg-white/5 border-white/10 text-white cursor-pointer hover:bg-white/10 transition-colors ${index === 0 ? "ring-2 ring-yellow-500/50" : ""}`}
                        onClick={() => setSelectedVendorId(vendor.id)}
                      >
                        <CardContent className="flex items-center gap-4 py-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                            index === 0 ? "bg-yellow-500 text-black" :
                            index === 1 ? "bg-gray-400 text-black" :
                            index === 2 ? "bg-amber-700 text-white" :
                            "bg-white/10 text-gray-400"
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{vendor.name}</p>
                            <p className="text-sm text-gray-400">{vendor.serviceType || vendor.service || "General"}</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center gap-1">
                              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                              <span className="text-xl font-bold text-yellow-400">{aggregate!.avg_overall}</span>
                            </div>
                            <p className="text-xs text-gray-400">{aggregate!.total_reviews} review{aggregate!.total_reviews !== 1 ? "s" : ""}</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center gap-1 text-green-400">
                              <ThumbsUp className="w-4 h-4" />
                              <span className="font-semibold">
                                {Math.round((aggregate!.recommend_count / aggregate!.total_reviews) * 100)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">recommend</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  {sortedVendors.filter((v) => v.aggregate && v.aggregate.total_reviews > 0).length === 0 && (
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="py-12 text-center text-gray-400">
                        No rated vendors yet. Rate a vendor to see the leaderboard.
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {selectedVendorId && vendorDetail && (
            <Dialog open={!!selectedVendorId} onOpenChange={() => setSelectedVendorId(null)}>
              <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{vendors.find((v) => v.id === selectedVendorId)?.name} — Ratings</DialogTitle>
                </DialogHeader>
                {vendorDetail.aggregate && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Communication", val: vendorDetail.aggregate.avg_communication },
                      { label: "Quality", val: vendorDetail.aggregate.avg_quality },
                      { label: "Punctuality", val: vendorDetail.aggregate.avg_punctuality },
                      { label: "Value", val: vendorDetail.aggregate.avg_value },
                    ].map(({ label, val }) => (
                      <div key={label} className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="text-xl font-bold text-yellow-400">{val}</p>
                        <StarRating value={Math.round(parseFloat(val))} size="sm" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-center py-3 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-sm text-gray-400">Overall</p>
                  <p className="text-3xl font-bold text-yellow-400">{vendorDetail.aggregate?.avg_overall || "—"}</p>
                  <p className="text-sm text-gray-400 mt-1">{vendorDetail.aggregate?.total_reviews || 0} reviews</p>
                </div>
                <div className="space-y-3 mt-2">
                  <h4 className="font-semibold text-sm text-gray-300">Reviews</h4>
                  {vendorDetail.ratings.length === 0 ? (
                    <p className="text-gray-500 text-sm">No reviews yet.</p>
                  ) : vendorDetail.ratings.map((r) => (
                    <div key={r.id} className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <StarRating value={Math.round(parseFloat(r.overall))} size="sm" />
                        <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      {r.review_text && <p className="text-sm text-gray-300">"{r.review_text}"</p>}
                      <div className="flex items-center gap-2">
                        {r.recommended ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                            <ThumbsUp className="w-3 h-3 mr-1" /> Recommended
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Not Recommended</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </main>
    </div>
  );
}
