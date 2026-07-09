import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wand2, 
  Download, 
  ShoppingCart, 
  DollarSign, 
  Package, 
  Image as ImageIcon,
  Star,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";


interface DecorItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  currency: string;
  priceType: 'per_item' | 'per_day' | 'per_event';
  images: string[];
  vendor: {
    id: string;
    name: string;
    contact: string;
    rating: number;
    location: string;
  };
  availability: boolean;
  specifications: {
    dimensions?: string;
    material?: string;
    color?: string;
    style?: string;
  };
}

interface DecorPlan {
  id: string;
  eventId: string;
  theme: string;
  colorPalette: string[];
  totalBudget: number;
  items: {
    category: string;
    items: DecorItem[];
    subtotal: number;
  }[];
  vendors: {
    id: string;
    name: string;
    items: string[];
    total: number;
  }[];
  createdAt: string;
}

interface DecorPlanGeneratorProps {
  eventId: string;
  eventDetails: {
    name: string;
    type: string;
    guestCount: number;
    budget: number;
    currency: string;
    venue: string;
    theme?: string;
    colors?: string[];
  };
}

export function DecorPlanGenerator({ eventId, eventDetails }: DecorPlanGeneratorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("generator");
  const [planPreferences, setPlanPreferences] = useState({
    style: "",
    priority: "budget", // budget, premium, luxury
    categories: [] as string[],
    specialRequests: ""
  });

  // Get existing decor plans
  const { data: decorPlans = [], refetch: refetchPlans } = useQuery<any[]>({
    queryKey: ['/api/decor-plans', eventId],
    retry: false,
  });

  // Get available decor items and vendors
  const { data: decorCatalog = [], isLoading: catalogLoading } = useQuery<any[]>({
    queryKey: ['/api/decor-catalog'],
    retry: false,
  });

  // Generate decor plan mutation
  const generatePlanMutation = useMutation({
    mutationFn: async (preferences: any) => {
      const response = await fetch(`/api/decor-plans/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          eventDetails,
          preferences,
          catalogItems: decorCatalog
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate decor plan');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Decor Plan Generated!",
        description: `Created comprehensive plan with ${data.totalItems} items from ${data.vendorCount} vendors`,
      });
      refetchPlans();
      setActiveTab("plans");
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Unable to generate decor plan. Please try again.",
        variant: "destructive"
      });
    }
  });

  const decorCategories = [
    "Centerpieces", "Linens", "Lighting", "Flowers", "Furniture", 
    "Backdrops", "Tableware", "Draping", "Candles", "Signage"
  ];

  const handleGeneratePlan = () => {
    generatePlanMutation.mutate(planPreferences);
  };

  const exportPlan = (plan: DecorPlan) => {
    const exportData = {
      event: eventDetails.name,
      plan: plan,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decor-plan-${eventDetails.name}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generator">Plan Generator</TabsTrigger>
          <TabsTrigger value="catalog">Item Catalog</TabsTrigger>
          <TabsTrigger value="plans">Generated Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wand2 className="w-6 h-6" />
                <span>Decor Plan Generator</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Generate comprehensive decor plans with real vendor items, pricing, and availability
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Event Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{eventDetails.guestCount}</div>
                  <div className="text-sm text-muted-foreground">Guests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{eventDetails.currency} {eventDetails.budget.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Budget</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary">{eventDetails.type}</div>
                  <div className="text-sm text-muted-foreground">Event Type</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary">{eventDetails.venue}</div>
                  <div className="text-sm text-muted-foreground">Venue</div>
                </div>
              </div>

              {/* Plan Preferences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="style">Decor Style</Label>
                    <Select value={planPreferences.style} onValueChange={(value) => 
                      setPlanPreferences(prev => ({ ...prev, style: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose decor style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="elegant">Elegant & Classic</SelectItem>
                        <SelectItem value="modern">Modern & Minimalist</SelectItem>
                        <SelectItem value="rustic">Rustic & Natural</SelectItem>
                        <SelectItem value="glamorous">Glamorous & Luxe</SelectItem>
                        <SelectItem value="bohemian">Bohemian & Eclectic</SelectItem>
                        <SelectItem value="vintage">Vintage & Retro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Budget Priority</Label>
                    <Select value={planPreferences.priority} onValueChange={(value) => 
                      setPlanPreferences(prev => ({ ...prev, priority: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="budget">Budget-Friendly</SelectItem>
                        <SelectItem value="premium">Premium Quality</SelectItem>
                        <SelectItem value="luxury">Luxury Experience</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Focus Categories</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {decorCategories.map(category => (
                        <div key={category} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={category}
                            checked={planPreferences.categories.includes(category)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPlanPreferences(prev => ({
                                  ...prev,
                                  categories: [...prev.categories, category]
                                }));
                              } else {
                                setPlanPreferences(prev => ({
                                  ...prev,
                                  categories: prev.categories.filter(c => c !== category)
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={category} className="text-sm">{category}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="requests">Special Requests</Label>
                    <Textarea
                      id="requests"
                      placeholder="Any specific requirements, themes, or preferences..."
                      value={planPreferences.specialRequests}
                      onChange={(e) => setPlanPreferences(prev => ({ ...prev, specialRequests: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGeneratePlan}
                disabled={generatePlanMutation.isPending || !planPreferences.style}
                className="w-full"
                size="lg"
              >
                {generatePlanMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating Comprehensive Plan...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Decor Plan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-6 h-6" />
                <span>Decor Item Catalog</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Browse approved decor items from verified rental vendors
              </p>
            </CardHeader>
            <CardContent>
              {catalogLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  <p className="mt-2 text-muted-foreground">Loading catalog...</p>
                </div>
              ) : decorCatalog.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {decorCatalog.map((item: DecorItem) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="aspect-square bg-muted flex items-center justify-center">
                        {item.images.length > 0 ? (
                          <img 
                            src={item.images[0]} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-sm">{item.name}</h3>
                            <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="text-lg font-bold text-primary">
                              {item.currency} {item.price}
                              <span className="text-xs font-normal text-muted-foreground ml-1">
                                /{item.priceType.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 fill-white text-white" />
                              <span className="text-xs">{item.vendor.rating}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{item.vendor.name} • {item.vendor.location}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No catalog items available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add vendors and their items to build your decor catalog
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          {decorPlans.length > 0 ? (
            decorPlans.map((plan: DecorPlan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <ShoppingCart className="w-6 h-6" />
                      <span>{plan.theme} Plan</span>
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportPlan(plan)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Created {new Date(plan.createdAt).toLocaleDateString()}</span>
                    <Badge variant="outline">{plan.items.length} Categories</Badge>
                    <Badge variant="outline">{plan.vendors.length} Vendors</Badge>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold">{eventDetails.currency} {plan.totalBudget.toLocaleString()}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Color Palette */}
                    <div>
                      <h4 className="font-semibold mb-2">Color Palette</h4>
                      <div className="flex space-x-2">
                        {plan.colorPalette.map((color, index) => (
                          <div
                            key={index}
                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Items by Category */}
                    <div>
                      <h4 className="font-semibold mb-3">Decor Items</h4>
                      <div className="space-y-4">
                        {plan.items.map((category, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium">{category.category}</h5>
                              <Badge variant="secondary">
                                {eventDetails.currency} {category.subtotal.toLocaleString()}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {category.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="flex items-center space-x-3 p-2 border rounded">
                                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                    {item.images.length > 0 ? (
                                      <img 
                                        src={item.images[0]} 
                                        alt={item.name}
                                        className="w-full h-full object-cover rounded"
                                      />
                                    ) : (
                                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.vendor.name}</p>
                                    <p className="text-sm font-semibold">{item.currency} {item.price}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Vendor Summary */}
                    <div>
                      <h4 className="font-semibold mb-3">Vendor Summary</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {plan.vendors.map((vendor, index) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <h6 className="font-medium">{vendor.name}</h6>
                              <Badge variant="outline">
                                {eventDetails.currency} {vendor.total.toLocaleString()}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {vendor.items.length} items
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No decor plans generated yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use the Plan Generator to create comprehensive decor plans
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}