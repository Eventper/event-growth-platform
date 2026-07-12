import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import PlannerLayout from "@/components/PlannerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Camera, MoreVertical, ArrowRight, Mail, Phone, MapPin, Calendar } from "lucide-react";

interface BoothInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  serviceType: string;
  message?: string;
  status: string;
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const PIPELINE_STAGES = [
  { key: "new", label: "New Inquiry", color: "bg-blue-500/20 border-blue-500/40 text-blue-300" },
  { key: "contacted", label: "Contacted", color: "bg-purple-500/20 border-purple-500/40 text-purple-300" },
  { key: "quote_sent", label: "Quote Sent", color: "bg-amber-500/20 border-amber-500/40 text-amber-300" },
  { key: "booked", label: "Booked", color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
  { key: "lost", label: "Lost", color: "bg-red-500/20 border-red-500/40 text-red-300" },
];

export default function BoothDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedInquiry, setSelectedInquiry] = useState<BoothInquiry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Protect route: redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  // Show loading while checking auth
  if (!user) {
    return (
      <PlannerLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A84C]" />
        </div>
      </PlannerLayout>
    );
  }

  // Fetch booth inquiries
  const { data: inquiriesData, isLoading, refetch } = useQuery({
    queryKey: ["booth-inquiries"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/booth-inquiries?limit=100");
      return res.json();
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["booth-inquiries-stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/booth-inquiries/stats/summary");
      return res.json();
    },
  });

  // Update inquiry status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ inquiryId, status }: { inquiryId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/booth-inquiries/${inquiryId}`, {
        status,
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booth-inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["booth-inquiries-stats"] });
      toast({ title: "Status updated", description: "Booth inquiry status changed" });
    },
  });

  const inquiries = inquiriesData?.inquiries || [];

  // Group inquiries by status
  const groupedByStatus = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.key] = inquiries.filter(
      (inq: BoothInquiry) =>
        inq.status === stage.key &&
        (filterStatus === "all" || inq.status === filterStatus) &&
        (searchTerm === "" || inq.name.toLowerCase().includes(searchTerm.toLowerCase()) || inq.email.includes(searchTerm))
    );
    return acc;
  }, {} as Record<string, BoothInquiry[]>);

  return (
    <PlannerLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-2">
              <Camera className="w-8 h-8 text-[#C9A84C]" />
              360 Booth Inquiries
            </h1>
            <p className="text-gray-600 mt-1">Manage booth booking inquiries and track through the pipeline</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{stats.total || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">New</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{stats.new_inquiries || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Contacted</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">{stats.contacted || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Quote Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-600">{stats.quote_sent || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Booked</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600">{stats.booked || 0}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex gap-4">
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {PIPELINE_STAGES.map((stage) => (
                <SelectItem key={stage.key} value={stage.key}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kanban Pipeline */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading inquiries...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.key} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">{stage.label}</h2>
                  <Badge variant="outline">{groupedByStatus[stage.key].length}</Badge>
                </div>
                <div className="space-y-3 min-h-96 bg-gray-50 rounded-lg p-3">
                  {groupedByStatus[stage.key].map((inquiry) => (
                    <Card
                      key={inquiry.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedInquiry(inquiry);
                        setIsDialogOpen(true);
                      }}
                    >
                      <CardContent className="p-3">
                        <p className="font-semibold text-sm text-gray-900 mb-1">{inquiry.name}</p>
                        <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                          <Mail size={12} />
                          {inquiry.email}
                        </p>
                        {inquiry.phone && (
                          <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                            <Phone size={12} />
                            {inquiry.phone}
                          </p>
                        )}
                        {inquiry.company && (
                          <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                            <MapPin size={12} />
                            {inquiry.company}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(inquiry.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                  {groupedByStatus[stage.key].length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-400">No inquiries</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inquiry Detail Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Booth Inquiry Details</DialogTitle>
            </DialogHeader>
            {selectedInquiry && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold">{selectedInquiry.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold">{selectedInquiry.email}</p>
                  </div>
                  {selectedInquiry.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-semibold">{selectedInquiry.phone}</p>
                    </div>
                  )}
                  {selectedInquiry.company && (
                    <div>
                      <p className="text-sm text-gray-600">Company</p>
                      <p className="font-semibold">{selectedInquiry.company}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Service Type</p>
                    <p className="font-semibold">{selectedInquiry.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold">{new Date(selectedInquiry.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {selectedInquiry.message && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Message</p>
                    <p className="p-3 bg-gray-50 rounded text-sm">{selectedInquiry.message}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-2">Update Status</p>
                  <Select
                    value={selectedInquiry.status}
                    onValueChange={(newStatus) => {
                      updateStatusMutation.mutate({ inquiryId: selectedInquiry.id, status: newStatus });
                      setSelectedInquiry({ ...selectedInquiry, status: newStatus });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((stage) => (
                        <SelectItem key={stage.key} value={stage.key}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlannerLayout>
  );
}
