import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ObjectUploader } from "./ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Store, Phone, Mail, Star, Upload, Image, Trash2, Edit } from "lucide-react";
import type { Vendor, InsertVendor } from "@shared/schema";
import type { UploadResult } from "@uppy/core";

interface VendorManagerProps {
  eventId?: string;
}

export function VendorManager({ eventId }: VendorManagerProps) {
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [newVendor, setNewVendor] = useState<{
    name: string;
    email: string;
    serviceType?: string;
    status: string;
    cost?: string;
    description?: string;
    portfolioImages?: string[];
    service?: string;
    category?: string;
    profileImage?: string;
    phone?: string;
    furnitureTypes?: string[];
  }>({
    name: "",
    email: "",
    serviceType: "",
    status: "pending",
    cost: "0",
    description: "",
    portfolioImages: [],
  });

  const queryClient = useQueryClient();

  // Query vendors
  const { data: vendors = [], isLoading } = useQuery<any[]>({
    queryKey: eventId ? ["/api/vendors", eventId] : ["/api/vendors"],
    enabled: true,
  });

  // Add vendor mutation
  const addVendorMutation = useMutation({
    mutationFn: async (vendor: InsertVendor) => {
      return await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendor),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsAddingVendor(false);
      resetForm();
    },
  });

  // Update vendor mutation
  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, vendor }: { id: string; vendor: Partial<Vendor> }) => {
      return await fetch(`/api/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendor),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setEditingVendor(null);
      resetForm();
    },
  });

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: async (id: string) => {
      return await fetch(`/api/vendors/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
    },
  });

  const resetForm = () => {
    setNewVendor({
      service: "",
      category: "",
      name: "",
      phone: "",
      email: "",
      description: "",
      cost: "0",
      status: "pending",
      portfolioImages: [],
      furnitureTypes: [],
    });
  };

  const handleSubmit = () => {
    if (editingVendor) {
      updateVendorMutation.mutate({ id: editingVendor.id, vendor: newVendor });
    } else {
      const vendorData = { ...newVendor, eventId } as InsertVendor;
      addVendorMutation.mutate(vendorData);
    }
  };

  const handleImageUpload = async () => {
    try {
      const response = await fetch("/api/objects/upload", { method: "POST" });
      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error("Failed to get upload URL:", error);
      throw error;
    }
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedUrls = result.successful.map(file => file.uploadURL);
      if (newVendor.category === "furniture") {
        setNewVendor(prev => ({
          ...prev,
          portfolioImages: [...(prev.portfolioImages || []), ...uploadedUrls] as string[]
        }));
      } else {
        setNewVendor(prev => ({
          ...prev,
          profileImage: uploadedUrls[0]
        }));
      }
    }
  };

  const removePortfolioImage = (index: number) => {
    setNewVendor(prev => ({
      ...prev,
      portfolioImages: (prev.portfolioImages || []).filter((_, i) => i !== index) as string[]
    }));
  };

  const categories = [
    "furniture", "decor", "lighting", "floral", "catering", 
    "photography", "entertainment", "transportation", "other"
  ];

  const furnitureTypes = [
    "tables", "chairs", "sofas", "staging", "bars", "lounge_furniture",
    "ceremony_decor", "lighting_fixtures", "outdoor_furniture"
  ];

  if (isLoading) {
    return <div className="text-center p-8">Loading vendors...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-red-900">Vendor Management</h2>
          <p className="text-red-700">Manage furniture vendors and suppliers with portfolio uploads</p>
        </div>
        <Dialog open={isAddingVendor} onOpenChange={setIsAddingVendor}>
          <DialogTrigger asChild>
            <Button className="bg-red-800 hover:bg-red-900">
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Vendor Name</Label>
                  <Input
                    value={newVendor.name}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter vendor name"
                  />
                </div>
                <div>
                  <Label>Service Type</Label>
                  <Select value={newVendor.serviceType} onValueChange={(value) => setNewVendor(prev => ({ ...prev, serviceType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="vendor@example.com"
                  />
                </div>
                <div>
                  <Label>Estimated Cost</Label>
                  <Input
                    type="number"
                    value={newVendor.cost}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, cost: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={newVendor.description}
                  onChange={(e) => setNewVendor(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the vendor's services and specialties"
                  rows={3}
                />
              </div>



              {/* Image Upload Section */}
              <div className="space-y-4">
                <div>
                  <Label>Profile Image</Label>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    allowedFileTypes={['image/*']}
                    onGetUploadParameters={handleImageUpload}
                    onComplete={handleUploadComplete}
                    buttonClassName="w-full mt-2"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Profile Image
                  </ObjectUploader>
                  {newVendor.profileImage && (
                    <div className="mt-2">
                      <img 
                        src={newVendor.profileImage} 
                        alt="Profile" 
                        className="w-20 h-20 object-cover rounded"
                      />
                    </div>
                  )}
                </div>

                {newVendor.category === "furniture" && (
                  <div>
                    <Label>Portfolio Images</Label>
                    <ObjectUploader
                      maxNumberOfFiles={10}
                      allowedFileTypes={['image/*']}
                      onGetUploadParameters={handleImageUpload}
                      onComplete={handleUploadComplete}
                      buttonClassName="w-full mt-2"
                    >
                      <Image className="w-4 h-4 mr-2" />
                      Upload Portfolio Images
                    </ObjectUploader>
                    {newVendor.portfolioImages && newVendor.portfolioImages.length > 0 && (
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {newVendor.portfolioImages.map((url, index) => (
                          <div key={index} className="relative">
                            <img 
                              src={url} 
                              alt={`Portfolio ${index + 1}`} 
                              className="w-20 h-20 object-cover rounded"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute -top-2 -right-2 w-6 h-6 p-0"
                              onClick={() => removePortfolioImage(index)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setIsAddingVendor(false);
                  setEditingVendor(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={addVendorMutation.isPending || updateVendorMutation.isPending}
                  className="bg-red-800 hover:bg-red-900"
                >
                  {addVendorMutation.isPending || updateVendorMutation.isPending ? "Saving..." : 
                   editingVendor ? "Update Vendor" : "Add Vendor"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor: Vendor) => (
          <Card key={vendor.id} className="border-red-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  {vendor.profileImage ? (
                    <img 
                      src={vendor.profileImage} 
                      alt={vendor.name ?? undefined}
                      className="w-12 h-12 object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <Store className="w-6 h-6 text-red-600" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg text-red-900">{vendor.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {vendor.category}
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingVendor(vendor);
                      setNewVendor(vendor as any);
                      setIsAddingVendor(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteVendorMutation.mutate(vendor.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{vendor.serviceType}</p>
                {(vendor as any).description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{(vendor as any).description}</p>
                )}
                
                <div className="flex items-center space-x-4 text-sm">
                  {vendor.email && (
                    <div className="flex items-center space-x-1">
                      <Mail className="w-3 h-3 text-red-600" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  )}
                </div>



                {vendor.profileImage && (
                  <div className="mt-3">
                    <img 
                      src={vendor.profileImage} 
                      alt="Profile" 
                      className="w-16 h-16 object-cover rounded"
                    />
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-semibold text-red-800">
                    ${(vendor as any).cost || 0}
                  </span>
                  <Badge variant={vendor.status === "confirmed" ? "default" : "secondary"}>
                    {vendor.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {vendors.length === 0 && (
        <div className="text-center py-12">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">No vendors added yet</h3>
          <p className="text-gray-500">Add furniture vendors to manage your event suppliers</p>
        </div>
      )}
    </div>
  );
}