import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PlannerLayout from "@/components/PlannerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Star,
  StarOff,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Camera,
  Edit,
  Trash2,
  ExternalLink,
  Building,
  Award,
  Clock,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Download,
  Upload,
  Printer
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import type { Vendor } from "@shared/schema";

const vendorFormSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  category: z.string().min(1, "Category is required"),
  service: z.string().min(1, "Service is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  specialties: z.string().optional(),
  cost: z.string().optional(),
  rating: z.string().optional(),
  location: z.string().optional(),
  portfolioImages: z.array(z.string()).optional(),
  status: z.string().default("pending"),
  isoStandards: z.array(z.string()).optional(),
  isDecorVendor: z.boolean().default(true),
});

type VendorFormData = z.infer<typeof vendorFormSchema>;

const decorVendorCategories = [
  "florals", "furniture", "draping", "lighting", "marquees", "decor"
];

const decorVendorLabels = {
  "florals": "Florals & Arrangements",
  "furniture": "Furniture & Chair Rentals", 
  "draping": "Draping & Linens",
  "lighting": "Lighting & Ambiance",
  "marquees": "Marquees & Tents",
  "decor": "Decor & Props"
};

const priceRanges = [
  "Budget ($)", "Mid-range ($$)", "Premium ($$$)", "Luxury ($$$$)"
];

export default function VendorManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch decor vendors
  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors/decor"],
    retry: false,
  });

  // Add vendor mutation
  const addVendorMutation = useMutation({
    mutationFn: async (data: VendorFormData) => {
      return await apiRequest("/api/vendors", "POST", { 
        ...data, 
        portfolioImages: uploadingImages,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors/decor"] });
      setIsAddDialogOpen(false);
      setUploadingImages([]);
      toast({
        title: "Success",
        description: "Decor vendor added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to add vendor",
        variant: "destructive",
      });
    },
  });

  // Update vendor mutation
  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VendorFormData> }) => {
      return await apiRequest(`/api/vendors/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors/decor"] });
      setEditingVendor(null);
      toast({
        title: "Success",
        description: "Vendor updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update vendor",
        variant: "destructive",
      });
    },
  });

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/vendors/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors/decor"] });
      toast({
        title: "Success", 
        description: "Vendor deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete vendor",
        variant: "destructive",
      });
    },
  });

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      category: "",
      service: "",
      phone: "",
      email: "",
      website: "",
      description: "",
      specialties: "",
      cost: "",
      rating: "",
      location: "",
      portfolioImages: [],
      status: "pending",
      isDecorVendor: true,
    },
  });

  // Handle image uploads
  const handleImageUpload = async () => {
    try {
      const response = await apiRequest("/api/objects/upload", "POST");
      return {
        method: "PUT" as const,
        url: response.uploadURL,
      };
    } catch (error) {
      console.error("Error getting upload URL:", error);
      throw error;
    }
  };

  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const newImageUrls = result.successful.map((file: any) => file.uploadURL);
      setUploadingImages(prev => [...prev, ...newImageUrls]);
    }
  };

  // Filter and sort vendors
  const filteredVendors = vendors
    .filter((vendor: Vendor) => {
      const matchesSearch = (vendor.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (vendor.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (vendor.service || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || vendor.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a: Vendor, b: Vendor) => {
      let aValue = a[sortBy as keyof Vendor] || "";
      let bValue = b[sortBy as keyof Vendor] || "";
      
      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();
      
      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const onSubmit = (data: VendorFormData) => {
    if (editingVendor) {
      updateVendorMutation.mutate({ id: editingVendor.id, data });
    } else {
      addVendorMutation.mutate(data);
    }
  };

  const startEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    const v = vendor as any;
    form.reset({
      name: v.name,
      category: v.category,
      service: v.service,
      phone: v.phone,
      email: v.email || "",
      website: v.website || "",
      description: v.description || "",
      specialties: v.specialties || "",
      cost: v.cost || "",
      rating: v.rating || "",
      location: v.location || "",
      portfolioImages: v.portfolioImages || [],
      status: v.status,
      isDecorVendor: v.isDecorVendor || true,
    });
  };

  const resetForm = () => {
    form.reset();
    setEditingVendor(null);
    setUploadingImages([]);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-white fill-current' : 'text-burgundy-400'}`}
      />
    ));
  };

  return (
    <PlannerLayout><div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-white">Decor Vendor Portfolio</h1>
            <p className="text-burgundy-200">Manage your decor and venue vendor partners</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {filteredVendors.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  openPrintWindow({
                    title: "Decor Vendor Portfolio",
                    stats: [
                      { label: "Total Vendors", value: vendors.length },
                      { label: "Available", value: vendors.filter((v: Vendor) => v.status === 'confirmed').length },
                      { label: "Categories", value: new Set(vendors.map((v: Vendor) => v.category)).size },
                    ],
                    columns: [
                      { header: "Name", key: "name" },
                      { header: "Category", key: "category" },
                      { header: "Service", key: "service" },
                      { header: "Phone", key: "phone" },
                      { header: "Email", key: "email" },
                      { header: "Status", key: "status" },
                    ],
                    rows: filteredVendors.map((v: Vendor) => ({
                      name: v.name,
                      category: v.category,
                      service: v.service || "—",
                      phone: v.phone || "—",
                      email: v.email || "—",
                      status: v.status || "—",
                    })),
                    orientation: "landscape",
                  });
                }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="border-burgundy-300 text-white hover:bg-burgundy-700"
            >
              {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </Button>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-burgundy-800 hover:bg-burgundy-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vendor
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="border-burgundy-700 bg-burgundy-800">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label className="text-white">Search Decor Vendors</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, category, or specialties..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-burgundy-200"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-white">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="border-red-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {decorVendorCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {decorVendorLabels[category as keyof typeof decorVendorLabels]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-white">Sort By</Label>
                <div className="flex space-x-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="border-red-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="cost">Price</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="border-red-300"
                  >
                    {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-burgundy-700 bg-burgundy-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-burgundy-200">Total Vendors</p>
                  <p className="text-2xl font-bold text-white">{vendors.length}</p>
                </div>
                <Users className="w-8 h-8 text-burgundy-300" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-burgundy-700 bg-burgundy-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-burgundy-200">Available Vendors</p>
                  <p className="text-2xl font-bold text-white">
                    {vendors.filter((v: Vendor) => v.status === 'confirmed').length}
                  </p>
                </div>
                <Star className="w-8 h-8 text-white" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-burgundy-700 bg-burgundy-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-burgundy-200">Categories</p>
                  <p className="text-2xl font-bold text-white">
                    {new Set(vendors.map((v: Vendor) => v.category)).size}
                  </p>
                </div>
                <Building className="w-8 h-8 text-burgundy-300" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-burgundy-700 bg-burgundy-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-burgundy-200">Avg Rating</p>
                  <p className="text-2xl font-bold text-white">
                    {vendors.length > 0 
                      ? (vendors.reduce((sum: number, v: Vendor) => sum + ((v as any).rating || 0), 0) / vendors.length).toFixed(1)
                      : "0.0"
                    }
                  </p>
                </div>
                <Award className="w-8 h-8 text-burgundy-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vendors List/Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-white mt-4">Loading vendors...</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <Card className="border-burgundy-700 bg-burgundy-800">
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-burgundy-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Vendors Found</h3>
              <p className="text-burgundy-200 mb-4">
                {searchTerm || selectedCategory !== "all" 
                  ? "No vendors match your search criteria"
                  : "Start building your vendor network by adding vendors"
                }
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="bg-burgundy-700 hover:bg-burgundy-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Vendor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-4"
          }>
            {filteredVendors.map((vendor: Vendor) => (
              <Card key={vendor.id} className="border-burgundy-700 bg-burgundy-800 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">{vendor.name}</h3>
                        {(vendor as any).isPreferred && (
                          <Badge className="bg-burgundy-100 text-burgundy-800 border-yellow-300">
                            <Star className="w-3 h-3 mr-1" />
                            Preferred
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="border-burgundy-300 text-burgundy-200 mb-2">
                        {vendor.category}
                      </Badge>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(vendor)}
                        className="text-burgundy-300 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteVendorMutation.mutate(vendor.id)}
                        className="text-burgundy-300 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {(vendor as any).rating && (
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="flex space-x-1">
                        {renderStars((vendor as any).rating)}
                      </div>
                      <span className="text-sm text-burgundy-200">({(vendor as any).rating}/5)</span>
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-burgundy-200">
                      <Mail className="w-4 h-4 mr-2 text-burgundy-300" />
                      {vendor.email}
                    </div>
                    <div className="flex items-center text-burgundy-200">
                      <Phone className="w-4 h-4 mr-2 text-burgundy-300" />
                      {vendor.phone}
                    </div>
                    {(vendor as any).location && (
                      <div className="flex items-center text-burgundy-200">
                        <MapPin className="w-4 h-4 mr-2 text-burgundy-300" />
                        {(vendor as any).location}
                      </div>
                    )}
                    {(vendor as any).cost && (
                      <div className="flex items-center text-burgundy-200">
                        <DollarSign className="w-4 h-4 mr-2 text-burgundy-300" />
                        {(vendor as any).cost}
                      </div>
                    )}
                  </div>

                  {(vendor as any).description && (
                    <p className="text-sm text-burgundy-200 mt-3 line-clamp-2">
                      {(vendor as any).description}
                    </p>
                  )}

                  {vendor.service && (
                    <div className="mt-3">
                      <p className="text-xs text-burgundy-200 font-medium mb-1">Services:</p>
                      <p className="text-sm text-burgundy-100 line-clamp-2">{vendor.service}</p>
                    </div>
                  )}

                  {vendor.portfolioImages && vendor.portfolioImages.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-burgundy-200 font-medium mb-2">Portfolio:</p>
                      <div className="flex space-x-2 overflow-x-auto">
                        {vendor.portfolioImages.slice(0, 4).map((image, idx) => (
                          <img
                            key={idx}
                            src={image}
                            alt={`${vendor.name} portfolio ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded border"
                          />
                        ))}
                        {vendor.portfolioImages.length > 4 && (
                          <div className="w-16 h-16 bg-burgundy-700 rounded border border-burgundy-600 flex items-center justify-center text-xs text-burgundy-300">
                            +{vendor.portfolioImages.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {vendor.website && (
                    <div className="mt-3 pt-3 border-t border-burgundy-700">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-burgundy-300 text-white hover:bg-burgundy-700"
                        onClick={() => window.open(vendor.website ?? undefined, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Visit Website
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Vendor Dialog */}
        <Dialog open={isAddDialogOpen || !!editingVendor} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingVendor(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-burgundy-900">
                {editingVendor ? "Edit Vendor" : "Add New Vendor"}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor Name *</FormLabel>
                        <FormControl>
                          <Input {...field} className="border-red-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-red-200">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {decorVendorCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {decorVendorLabels[category as keyof typeof decorVendorLabels]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} className="border-red-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl>
                          <Input {...field} className="border-red-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input type="url" {...field} className="border-red-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="service"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., florals, furniture_rentals" className="border-burgundy-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Cost</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Starting price" className="border-burgundy-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="City, State" className="border-burgundy-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} className="border-red-200" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="border-red-200" rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Services Offered</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="border-red-200" rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating (1-5)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className="border-red-200">
                              <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <SelectItem key={rating} value={rating.toString()}>
                                {rating} Star{rating > 1 ? 's' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isDecorVendor"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 pt-8">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={!!field.value}
                            onChange={field.onChange}
                            className="rounded border-red-300"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Mark as Preferred Vendor
                        </FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Portfolio Images Upload */}
                <div className="space-y-4">
                  <Label>Portfolio Images</Label>
                  <ObjectUploader
                    maxNumberOfFiles={10}
                    maxFileSize={10485760}
                    onGetUploadParameters={handleImageUpload}
                    onComplete={handleUploadComplete}
                    buttonClassName="w-full border-burgundy-300 text-burgundy-700 hover:bg-burgundy-50"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Camera className="w-4 h-4" />
                      <span>Upload Portfolio Images</span>
                    </div>
                  </ObjectUploader>
                  
                  {uploadingImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {uploadingImages.map((image, idx) => (
                        <img
                          key={idx}
                          src={image}
                          alt={`Upload ${idx + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="specialties"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="border-red-200" rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingVendor(null);
                      resetForm();
                    }}
                    className="border-red-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addVendorMutation.isPending || updateVendorMutation.isPending}
                    className="bg-red-800 hover:bg-red-900"
                  >
                    {editingVendor ? "Update Vendor" : "Add Vendor"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div></PlannerLayout>
  );
}