import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import PlannerLayout from "@/components/PlannerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Search, Star, Mail, Phone, Globe, MapPin, Building2,
  CheckCircle2, XCircle, ShieldAlert, ShieldCheck, Plus,
  ExternalLink, MoreVertical, Filter, Users, TrendingUp, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const vendorCategories = [
  "Venue", "Catering", "Decorator", "Florist", "Photographer", "Videographer",
  "DJ / Entertainment", "MC / Host", "Rental Company", "Security", "Transportation",
  "Printing / Branding", "Gifts / Souvenirs", "Other"
];

const budgetTiers = [
  { value: "budget", label: "Budget" },
  { value: "mid_range", label: "Mid-Range" },
  { value: "premium", label: "Premium" },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  approved:   { label: "Approved",       color: "bg-green-500/20 text-green-300 border-green-500/30",  icon: CheckCircle2 },
  verified:   { label: "Verified",       color: "bg-blue-500/20 text-blue-300 border-blue-500/30",    icon: ShieldCheck },
  pending:    { label: "Pending Review", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", icon: AlertCircle },
  rejected:   { label: "Rejected",       color: "bg-red-500/20 text-red-300 border-red-500/30",       icon: XCircle },
  suspended:  { label: "Suspended",      color: "bg-orange-500/20 text-orange-300 border-orange-500/30", icon: ShieldAlert },
  unverified: { label: "Unverified",     color: "bg-white/10 text-white/50 border-white/20",          icon: AlertCircle },
};

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={cn("w-3 h-3", i <= Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-white/20")} />
      ))}
    </div>
  );
}

function AddVendorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", companyName: "", category: "", service: "", description: "",
    email: "", phone: "", website: "", location: "",
    budgetTier: "mid_range", qualificationStatus: "pending",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/vendors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor Added", description: `${form.name} added to the directory` });
      onClose();
      setForm({ name: "", companyName: "", category: "", service: "", description: "", email: "", phone: "", website: "", location: "", budgetTier: "mid_range", qualificationStatus: "pending" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add vendor", variant: "destructive" }),
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: any) => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A0812] border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">Add New Vendor</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Vendor / Contact Name *</Label>
            <Input {...field("name")} className="bg-white/5 border-white/20 text-white" placeholder="e.g. John Adeyemi" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Company Name</Label>
            <Input {...field("companyName")} className="bg-white/5 border-white/20 text-white" placeholder="e.g. Bloom & Petal Events" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Category *</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {vendorCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Service / Specialty *</Label>
            <Input {...field("service")} className="bg-white/5 border-white/20 text-white" placeholder="e.g. Nigerian catering, floral décor" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Email</Label>
            <Input {...field("email")} type="email" className="bg-white/5 border-white/20 text-white" placeholder="vendor@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Phone *</Label>
            <Input {...field("phone")} className="bg-white/5 border-white/20 text-white" placeholder="+44 7700 000000" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Website</Label>
            <Input {...field("website")} className="bg-white/5 border-white/20 text-white" placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Location</Label>
            <Input {...field("location")} className="bg-white/5 border-white/20 text-white" placeholder="e.g. Lagos, Nigeria" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Budget Tier</Label>
            <Select value={form.budgetTier} onValueChange={v => setForm(f => ({ ...f, budgetTier: v }))}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {budgetTiers.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Initial Status</Label>
            <Select value={form.qualificationStatus} onValueChange={v => setForm(f => ({ ...f, qualificationStatus: v }))}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-white/70 text-xs">Description / Notes</Label>
            <Textarea {...field("description")} className="bg-white/5 border-white/20 text-white resize-none" rows={3} placeholder="Service notes, specialties, or additional information..." />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-white/60 hover:text-white">Cancel</Button>
          <Button
            onClick={() => mutation.mutate({ ...form, status: "pending", contractStatus: "pending" })}
            disabled={!form.name || !form.category || !form.service || !form.phone || mutation.isPending}
            className="bg-[#330311] hover:bg-[#4a0418] text-white border border-white/20"
          >
            {mutation.isPending ? "Adding..." : "Add Vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VendorDetailDialog({ vendor, onClose }: { vendor: any; onClose: () => void }) {
  const { toast } = useToast();
  const status = vendor.qualificationStatus || "unverified";
  const cfg = statusConfig[status] || statusConfig.unverified;

  const approveMutation = useMutation({
    mutationFn: (newStatus: string) => apiRequest("PATCH", `/api/vendors/${vendor.id}`, { qualificationStatus: newStatus }),
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      const labels: Record<string, string> = { approved: "Approved", verified: "Verified", rejected: "Rejected", suspended: "Suspended", pending: "Reset to Pending" };
      toast({ title: `Vendor ${labels[newStatus] || "Updated"}`, description: `${vendor.name} has been ${labels[newStatus]?.toLowerCase() || "updated"}` });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to update vendor", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[#1A0812] border-white/20 text-white max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-white text-lg">{vendor.name}</DialogTitle>
              {vendor.companyName && <p className="text-white/50 text-sm">{vendor.companyName}</p>}
            </div>
            <Badge className={cn("text-[10px] shrink-0 mt-1", cfg.color)}>
              <cfg.icon className="w-3 h-3 mr-1" />{cfg.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-white/20 text-white/70">{vendor.category}</Badge>
            {vendor.budgetTier && (
              <Badge variant="outline" className="border-white/20 text-white/70">
                {budgetTiers.find(t => t.value === vendor.budgetTier)?.label || vendor.budgetTier}
              </Badge>
            )}
            {vendor.service && <Badge variant="outline" className="border-white/20 text-white/70">{vendor.service}</Badge>}
          </div>

          {(vendor.overallRating > 0 || vendor.rating > 0) && (
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-white/50 mb-2">Performance Rating</p>
              <div className="flex items-center gap-3">
                <StarRating value={vendor.overallRating || vendor.rating || 0} />
                <span className="text-white font-semibold">{(vendor.overallRating || vendor.rating || 0).toFixed(1)}</span>
                {vendor.reviewCount > 0 && <span className="text-white/50 text-xs">({vendor.reviewCount} reviews)</span>}
              </div>
              {(vendor.reliabilityRating || vendor.qualityRating) && (
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  {[
                    ["Reliability", vendor.reliabilityRating],
                    ["Quality",     vendor.qualityRating],
                    ["Punctuality", vendor.punctualityRating],
                    ["Communication", vendor.communicationRating],
                    ["Value",       vendor.valueRating],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label as string} className="flex justify-between text-white/60">
                      <span>{label}</span>
                      <span className="font-medium text-white">{Number(val).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 text-sm">
            {vendor.email    && <div className="flex items-center gap-2 text-white/70"><Mail className="w-4 h-4 text-white/40" />{vendor.email}</div>}
            {vendor.phone    && <div className="flex items-center gap-2 text-white/70"><Phone className="w-4 h-4 text-white/40" />{vendor.phone}</div>}
            {vendor.website  && <div className="flex items-center gap-2 text-white/70"><Globe className="w-4 h-4 text-white/40" /><a href={vendor.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{vendor.website}</a></div>}
            {vendor.location && <div className="flex items-center gap-2 text-white/70"><MapPin className="w-4 h-4 text-white/40" />{vendor.location}</div>}
          </div>

          {vendor.description && (
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-white/50 mb-1">Notes</p>
              <p className="text-sm text-white/80">{vendor.description}</p>
            </div>
          )}

          {vendor.serviceDescription && (
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-white/50 mb-1">Service Description</p>
              <p className="text-sm text-white/80">{vendor.serviceDescription}</p>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-white/50 mb-3 font-medium uppercase tracking-wide">Approval Actions</p>
          <div className="grid grid-cols-2 gap-2">
            {status !== "approved" && (
              <Button size="sm" onClick={() => approveMutation.mutate("approved")} disabled={approveMutation.isPending}
                className="bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Approve
              </Button>
            )}
            {status !== "verified" && (
              <Button size="sm" onClick={() => approveMutation.mutate("verified")} disabled={approveMutation.isPending}
                className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />Mark Verified
              </Button>
            )}
            {status !== "rejected" && (
              <Button size="sm" onClick={() => approveMutation.mutate("rejected")} disabled={approveMutation.isPending}
                className="bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30">
                <XCircle className="w-3.5 h-3.5 mr-1.5" />Reject
              </Button>
            )}
            {status !== "suspended" && (
              <Button size="sm" onClick={() => approveMutation.mutate("suspended")} disabled={approveMutation.isPending}
                className="bg-orange-600/20 hover:bg-orange-600/40 text-orange-300 border border-orange-500/30">
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />Suspend
              </Button>
            )}
            {status !== "pending" && (
              <Button size="sm" onClick={() => approveMutation.mutate("pending")} disabled={approveMutation.isPending}
                className="bg-white/5 hover:bg-white/10 text-white/60 border border-white/20">
                Reset to Pending
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function VendorDirectory() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm]           = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus]   = useState("all");
  const [selectedTier, setSelectedTier]       = useState("all");
  const [showAddDialog, setShowAddDialog]     = useState(false);
  const [selectedVendor, setSelectedVendor]   = useState<any>(null);

  const { data: vendors = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/vendors"],
  });

  const filtered = vendors.filter(v => {
    const qs = v.qualificationStatus || "unverified";
    const matchSearch   = !searchTerm || v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || v.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) || v.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === "all" || v.category === selectedCategory;
    const matchStatus   = selectedStatus   === "all" || qs === selectedStatus;
    const matchTier     = selectedTier     === "all" || v.budgetTier === selectedTier;
    return matchSearch && matchCategory && matchStatus && matchTier;
  });

  const stats = {
    total:     vendors.length,
    approved:  vendors.filter(v => (v.qualificationStatus || "unverified") === "approved").length,
    verified:  vendors.filter(v => (v.qualificationStatus || "unverified") === "verified").length,
    pending:   vendors.filter(v => (v.qualificationStatus || "unverified") === "pending").length,
    rejected:  vendors.filter(v => (v.qualificationStatus || "unverified") === "rejected").length,
    suspended: vendors.filter(v => (v.qualificationStatus || "unverified") === "suspended").length,
  };

  return (
    <PlannerLayout>
      <div className="px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Master Vendor Directory</h1>
            <p className="text-white/50 text-sm mt-0.5">Manage vendor approvals, ratings, and qualification status</p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-[#330311] hover:bg-[#4a0418] text-white border border-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />Add Vendor
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "Total",     value: stats.total,     color: "text-white" },
            { label: "Approved",  value: stats.approved,  color: "text-green-400" },
            { label: "Verified",  value: stats.verified,  color: "text-blue-400" },
            { label: "Pending",   value: stats.pending,   color: "text-yellow-400" },
            { label: "Rejected",  value: stats.rejected,  color: "text-red-400" },
            { label: "Suspended", value: stats.suspended, color: "text-orange-400" },
          ].map(s => (
            <Card key={s.label} className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/8 transition-colors"
              onClick={() => setSelectedStatus(s.label.toLowerCase() === "total" ? "all" : s.label.toLowerCase())}>
              <CardContent className="p-3 text-center">
                <div className={cn("text-xl font-bold", s.color)}>{s.value}</div>
                <p className="text-white/50 text-[11px] mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-white/5 border-white/20 text-white placeholder:text-white/30"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {vendorCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedTier} onValueChange={setSelectedTier}>
            <SelectTrigger className="bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Budget Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              {budgetTiers.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        <div className="flex items-center justify-between">
          <p className="text-white/50 text-sm">
            Showing <span className="text-white font-medium">{filtered.length}</span> vendor{filtered.length !== 1 ? "s" : ""}
            {selectedStatus !== "all" && <span> · {statusConfig[selectedStatus]?.label}</span>}
          </p>
          {(selectedCategory !== "all" || selectedStatus !== "all" || selectedTier !== "all" || searchTerm) && (
            <Button variant="ghost" size="sm" className="text-white/50 hover:text-white text-xs h-7"
              onClick={() => { setSearchTerm(""); setSelectedCategory("all"); setSelectedStatus("all"); setSelectedTier("all"); }}>
              Clear filters
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium text-white/60">No vendors found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new vendor</p>
            <Button onClick={() => setShowAddDialog(true)} className="mt-4 bg-[#330311] hover:bg-[#4a0418] text-white border border-white/20">
              <Plus className="w-4 h-4 mr-2" />Add First Vendor
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(vendor => {
              const qs = vendor.qualificationStatus || "unverified";
              const cfg = statusConfig[qs] || statusConfig.unverified;
              const Icon = cfg.icon;
              return (
                <Card
                  key={vendor.id}
                  className="bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20 transition-all cursor-pointer group"
                  onClick={() => setSelectedVendor(vendor)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1 mr-2">
                        <h3 className="font-semibold text-white truncate">{vendor.name}</h3>
                        {vendor.companyName && <p className="text-white/50 text-xs truncate">{vendor.companyName}</p>}
                      </div>
                      <Badge className={cn("text-[10px] shrink-0 flex items-center gap-1", cfg.color)}>
                        <Icon className="w-2.5 h-2.5" />{cfg.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="outline" className="text-[9px] border-white/20 text-white/60 px-1.5">
                        {vendor.category}
                      </Badge>
                      {vendor.budgetTier && (
                        <Badge variant="outline" className={cn("text-[9px] border-white/20 px-1.5",
                          vendor.budgetTier === "premium" ? "text-yellow-400 border-yellow-500/30" :
                          vendor.budgetTier === "mid_range" ? "text-blue-300 border-blue-500/30" : "text-white/60"
                        )}>
                          {budgetTiers.find(t => t.value === vendor.budgetTier)?.label || vendor.budgetTier}
                        </Badge>
                      )}
                    </div>

                    {(vendor.overallRating > 0 || vendor.rating > 0) && (
                      <div className="flex items-center gap-2 mb-3">
                        <StarRating value={vendor.overallRating || vendor.rating || 0} />
                        <span className="text-xs text-white/60">{(vendor.overallRating || vendor.rating || 0).toFixed(1)}</span>
                        {vendor.reviewCount > 0 && <span className="text-white/40 text-xs">({vendor.reviewCount})</span>}
                      </div>
                    )}

                    <div className="space-y-1 text-xs text-white/50">
                      {vendor.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{vendor.email}</span>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 shrink-0" />{vendor.phone}
                        </div>
                      )}
                      {vendor.location && (
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{vendor.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-center text-xs text-white/50">Click to manage & approve</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AddVendorDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
      {selectedVendor && <VendorDetailDialog vendor={selectedVendor} onClose={() => setSelectedVendor(null)} />}
    </PlannerLayout>
  );
}
