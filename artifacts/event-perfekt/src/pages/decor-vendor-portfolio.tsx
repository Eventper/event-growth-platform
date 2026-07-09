import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Search,
  Star,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Grid,
  List,
  Building,
  Award
} from "lucide-react";
import type { Vendor } from "@shared/schema";

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

export default function DecorVendorPortfolio() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch decor vendors
  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors/decor"],
    retry: false,
  });

  // Filter vendors
  const filteredVendors = vendors.filter((vendor: Vendor) => {
    const matchesSearch = (vendor.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (vendor.category ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ((vendor as any).specialties || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || vendor.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderStars = (rating: string | null) => {
    const numRating = rating ? parseFloat(rating) : 0;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < numRating ? 'text-white fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-burgundy-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8 text-white">Loading vendor portfolio...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-burgundy-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-white">Decor Vendor Portfolio</h1>
            <p className="text-burgundy-200">Browse our curated network of decor and venue specialists</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="border-burgundy-300"
            >
              {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="border-burgundy-700 bg-burgundy-800">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label className="text-white">Search Vendors</Label>
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
                  <SelectTrigger className="border-burgundy-200">
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
            </div>
          </CardContent>
        </Card>

        {/* Vendor Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-burgundy-700 bg-burgundy-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-burgundy-200">Total Vendors</p>
                  <p className="text-2xl font-bold text-white">{vendors.length}</p>
                </div>
                <Building className="w-8 h-8 text-burgundy-300" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-burgundy-700 bg-burgundy-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-burgundy-200">Available Now</p>
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
                <Award className="w-8 h-8 text-burgundy-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vendors Grid/List */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map((vendor) => (
              <Card key={vendor.id} className="border-burgundy-700 bg-burgundy-800 hover:bg-burgundy-750 hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-white">{vendor.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {decorVendorLabels[vendor.category as keyof typeof decorVendorLabels] || vendor.category}
                      </Badge>
                    </div>
                    <Badge 
                      className={`
                        ${vendor.status === 'confirmed' ? 'bg-green-100 text-green-800' : ''}
                        ${vendor.status === 'pending' ? 'bg-burgundy-100 text-burgundy-800' : ''}
                        ${vendor.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                      `}
                    >
                      {vendor.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(vendor as any).rating && (
                    <div className="flex items-center space-x-1">
                      {renderStars((vendor as any).rating)}
                      <span className="text-sm text-burgundy-200 ml-2">{(vendor as any).rating}</span>
                    </div>
                  )}

                  {(vendor as any).specialties && (
                    <p className="text-sm text-burgundy-200">{(vendor as any).specialties}</p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    {vendor.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-burgundy-300" />
                        <span className="text-burgundy-100">{vendor.phone}</span>
                      </div>
                    )}
                    
                    {vendor.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-burgundy-300" />
                        <span className="text-burgundy-100">{vendor.email}</span>
                      </div>
                    )}
                    
                    {(vendor as any).location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-burgundy-300" />
                        <span className="text-burgundy-100">{(vendor as any).location}</span>
                      </div>
                    )}
                  </div>

                  {(vendor as any).cost && (vendor as any).cost !== "0" && (
                    <div className="text-white font-semibold">
                      Starting at ${(vendor as any).cost}
                    </div>
                  )}
                  
                  {vendor.website && (
                    <Button variant="outline" size="sm" className="w-full border-burgundy-300 text-white hover:bg-burgundy-700">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visit Website
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-burgundy-700 bg-burgundy-800">
            <CardContent className="p-0">
              {filteredVendors.map((vendor, index) => (
                <div key={vendor.id} className={`p-6 ${index !== filteredVendors.length - 1 ? 'border-b border-burgundy-700' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{vendor.name}</h3>
                        <Badge variant="secondary">
                          {decorVendorLabels[vendor.category as keyof typeof decorVendorLabels] || vendor.category}
                        </Badge>
                        <Badge 
                          className={`
                            ${vendor.status === 'confirmed' ? 'bg-green-100 text-green-800' : ''}
                            ${vendor.status === 'pending' ? 'bg-burgundy-100 text-burgundy-800' : ''}
                            ${vendor.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                          `}
                        >
                          {vendor.status}
                        </Badge>
                      </div>
                      
                      {(vendor as any).specialties && (
                        <p className="text-burgundy-200 mb-3">{(vendor as any).specialties}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        {vendor.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="w-4 h-4 text-burgundy-300" />
                            <span className="text-burgundy-100">{vendor.phone}</span>
                          </div>
                        )}
                        
                        {vendor.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="w-4 h-4 text-burgundy-300" />
                            <span className="text-burgundy-100">{vendor.email}</span>
                          </div>
                        )}
                        
                        {(vendor as any).location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4 text-burgundy-300" />
                            <span className="text-burgundy-100">{(vendor as any).location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      {(vendor as any).rating && (
                        <div className="flex items-center space-x-1">
                          {renderStars((vendor as any).rating)}
                          <span className="text-sm text-burgundy-200 ml-1">{(vendor as any).rating}</span>
                        </div>
                      )}

                      {(vendor as any).cost && (vendor as any).cost !== "0" && (
                        <div className="text-white font-semibold">
                          Starting at ${(vendor as any).cost}
                        </div>
                      )}
                      
                      {vendor.website && (
                        <Button variant="outline" size="sm" className="border-burgundy-300 text-white hover:bg-burgundy-700">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Visit
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {filteredVendors.length === 0 && (
          <Card className="border-burgundy-700 bg-burgundy-800">
            <CardContent className="p-12 text-center">
              <div className="space-y-3">
                <Building className="w-12 h-12 text-burgundy-400 mx-auto" />
                <h3 className="text-lg font-semibold text-white">No vendors found</h3>
                <p className="text-burgundy-200">Try adjusting your search criteria or category filter.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}