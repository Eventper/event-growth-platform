import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Grid, 
  Save, 
  Download, 
  RotateCcw, 
  Square,
  Circle,
  Users,
  Utensils,
  Music,
  Flower,
  Car,
  Move,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FloorPlanItem {
  id: string;
  type: 'table' | 'chair' | 'stage' | 'bar' | 'dance_floor' | 'buffet' | 'decor' | 'entrance';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  color?: string;
  capacity?: number;
}

interface FloorPlan {
  id: string;
  name: string;
  venueSection: string;
  planData: {
    items: FloorPlanItem[];
    dimensions: { width: number; height: number };
    scale: number;
  };
  capacity: number;
}

interface FloorPlanDesignerProps {
  eventId: string;
  venueImages?: any[];
}

export function FloorPlanDesigner({ eventId, venueImages = [] }: FloorPlanDesignerProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize] = useState({ width: 800, height: 600 });
  const [selectedTool, setSelectedTool] = useState<string>('move');
  const [floorPlanItems, setFloorPlanItems] = useState<FloorPlanItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FloorPlanItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [planName, setPlanName] = useState("");
  const [venueSection, setVenueSection] = useState("reception");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Get existing floor plans
  const { data: floorPlans = [], refetch } = useQuery<any[]>({
    queryKey: ['/api/events', eventId, 'floor-plans'],
    retry: false,
  });

  // Save floor plan mutation
  const saveFloorPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const response = await fetch(`/api/events/${eventId}/floor-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData)
      });

      if (!response.ok) {
        throw new Error('Failed to save floor plan');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Floor Plan Saved",
        description: "Your floor plan has been saved successfully",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save floor plan. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Drawing and interaction logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw background image if selected
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);
        ctx.globalAlpha = 1.0;
        drawItems(ctx);
      };
      img.src = backgroundImage;
    } else {
      // Draw grid
      drawGrid(ctx);
      drawItems(ctx);
    }
  }, [floorPlanItems, selectedItem, backgroundImage]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const gridSize = 20;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= canvasSize.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= canvasSize.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }
  };

  const drawItems = (ctx: CanvasRenderingContext2D) => {
    floorPlanItems.forEach(item => {
      ctx.save();
      
      // Move to item position and rotate
      ctx.translate(item.x + item.width/2, item.y + item.height/2);
      ctx.rotate(item.rotation * Math.PI / 180);
      ctx.translate(-item.width/2, -item.height/2);

      // Set style based on item type and selection
      const isSelected = selectedItem?.id === item.id;
      ctx.fillStyle = isSelected ? '#3b82f6' : (item.color || getItemColor(item.type));
      ctx.strokeStyle = isSelected ? '#1d4ed8' : '#374151';
      ctx.lineWidth = isSelected ? 3 : 1;

      // Draw shape based on type
      if (item.type === 'table') {
        if (item.width === item.height) {
          // Round table
          ctx.beginPath();
          ctx.arc(item.width/2, item.height/2, item.width/2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        } else {
          // Rectangular table
          ctx.fillRect(0, 0, item.width, item.height);
          ctx.strokeRect(0, 0, item.width, item.height);
        }
      } else if (item.type === 'chair') {
        ctx.fillRect(0, 0, item.width, item.height);
        ctx.strokeRect(0, 0, item.width, item.height);
      } else if (item.type === 'stage') {
        ctx.fillRect(0, 0, item.width, item.height);
        ctx.strokeRect(0, 0, item.width, item.height);
        // Add stage pattern
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        for (let i = 0; i < item.width; i += 20) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, item.height);
          ctx.stroke();
        }
      } else {
        // Default rectangle
        ctx.fillRect(0, 0, item.width, item.height);
        ctx.strokeRect(0, 0, item.width, item.height);
      }

      // Draw label
      if (item.label) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, item.width/2, item.height/2 + 4);
      }

      ctx.restore();
    });
  };

  const getItemColor = (type: string): string => {
    const colors = {
      table: '#8B4513',
      chair: '#D2691E',
      stage: '#4B0082',
      bar: '#2F4F4F',
      dance_floor: '#FFD700',
      buffet: '#228B22',
      decor: '#DC143C',
      entrance: '#696969'
    };
    return colors[type as keyof typeof colors] || '#808080';
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === 'move') {
      // Select item
      const clickedItem = floorPlanItems.find(item => 
        x >= item.x && x <= item.x + item.width &&
        y >= item.y && y <= item.y + item.height
      );
      setSelectedItem(clickedItem || null);
    } else {
      // Add new item
      addItem(x, y, selectedTool);
    }
  };

  const addItem = (x: number, y: number, type: string) => {
    const newItem: FloorPlanItem = {
      id: `item_${Date.now()}`,
      type: type as any,
      x: Math.max(0, x - 25),
      y: Math.max(0, y - 25),
      width: getDefaultSize(type).width,
      height: getDefaultSize(type).height,
      rotation: 0,
      label: getDefaultLabel(type),
      capacity: getDefaultCapacity(type)
    };

    setFloorPlanItems(prev => [...prev, newItem]);
    setSelectedItem(newItem);
  };

  const getDefaultSize = (type: string) => {
    const sizes = {
      table: { width: 80, height: 80 },
      chair: { width: 20, height: 20 },
      stage: { width: 120, height: 60 },
      bar: { width: 100, height: 40 },
      dance_floor: { width: 150, height: 150 },
      buffet: { width: 80, height: 40 },
      decor: { width: 30, height: 30 },
      entrance: { width: 60, height: 20 }
    };
    return sizes[type as keyof typeof sizes] || { width: 50, height: 50 };
  };

  const getDefaultLabel = (type: string): string => {
    const labels = {
      table: 'Table',
      chair: 'Chair',
      stage: 'Stage',
      bar: 'Bar',
      dance_floor: 'Dance Floor',
      buffet: 'Buffet',
      decor: 'Decor',
      entrance: 'Entrance'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getDefaultCapacity = (type: string): number => {
    const capacities = {
      table: 8,
      chair: 1,
      stage: 0,
      bar: 0,
      dance_floor: 50,
      buffet: 0,
      decor: 0,
      entrance: 0
    };
    return capacities[type as keyof typeof capacities] || 0;
  };

  const deleteSelectedItem = () => {
    if (selectedItem) {
      setFloorPlanItems(prev => prev.filter(item => item.id !== selectedItem.id));
      setSelectedItem(null);
    }
  };

  const updateSelectedItem = (updates: Partial<FloorPlanItem>) => {
    if (selectedItem) {
      const updatedItem = { ...selectedItem, ...updates };
      setFloorPlanItems(prev => 
        prev.map(item => item.id === selectedItem.id ? updatedItem : item)
      );
      setSelectedItem(updatedItem);
    }
  };

  const savePlan = () => {
    if (!planName.trim()) {
      toast({
        title: "Plan Name Required",
        description: "Please enter a name for your floor plan",
        variant: "destructive"
      });
      return;
    }

    const totalCapacity = floorPlanItems.reduce((sum, item) => sum + (item.capacity || 0), 0);

    saveFloorPlanMutation.mutate({
      name: planName,
      venueSection,
      planData: {
        items: floorPlanItems,
        dimensions: canvasSize,
        scale: 1
      },
      capacity: totalCapacity
    });
  };

  const clearPlan = () => {
    setFloorPlanItems([]);
    setSelectedItem(null);
  };

  const furnitureTools = [
    { id: 'move', icon: Move, label: 'Move/Select' },
    { id: 'table', icon: Square, label: 'Table' },
    { id: 'chair', icon: Circle, label: 'Chair' },
    { id: 'stage', icon: Music, label: 'Stage' },
    { id: 'bar', icon: Utensils, label: 'Bar' },
    { id: 'dance_floor', icon: Users, label: 'Dance Floor' },
    { id: 'buffet', icon: Utensils, label: 'Buffet' },
    { id: 'decor', icon: Flower, label: 'Decor' },
    { id: 'entrance', icon: Car, label: 'Entrance' }
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="designer">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="designer">Floor Plan Designer</TabsTrigger>
          <TabsTrigger value="plans">Saved Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="designer" className="space-y-6">
          {/* Designer Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Grid className="w-6 h-6" />
                <span>2D Floor Plan Designer</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plan Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="planName">Plan Name</Label>
                  <Input
                    id="planName"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Enter plan name..."
                  />
                </div>
                <div>
                  <Label htmlFor="venueSection">Venue Section</Label>
                  <Select value={venueSection} onValueChange={setVenueSection}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ceremony">Ceremony</SelectItem>
                      <SelectItem value="reception">Reception</SelectItem>
                      <SelectItem value="cocktail">Cocktail Hour</SelectItem>
                      <SelectItem value="entire_venue">Entire Venue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="background">Background Image</Label>
                  <Select 
                    value={backgroundImage || "none"} 
                    onValueChange={(value) => setBackgroundImage(value === "none" ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Grid Only</SelectItem>
                      {venueImages.map((img, index) => (
                        <SelectItem key={index} value={img.imagePath}>
                          {img.description || `Image ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Furniture Tools */}
              <div>
                <Label>Furniture & Layout Tools</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {furnitureTools.map(tool => {
                    const Icon = tool.icon;
                    return (
                      <Button
                        key={tool.id}
                        variant={selectedTool === tool.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTool(tool.id)}
                        className="flex items-center space-x-1"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tool.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button onClick={savePlan} disabled={saveFloorPlanMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Plan
                </Button>
                <Button variant="outline" onClick={clearPlan}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                {selectedItem && (
                  <Button variant="destructive" onClick={deleteSelectedItem}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Canvas and Properties */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Canvas */}
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="p-4">
                  <canvas
                    ref={canvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    onClick={handleCanvasClick}
                    className="border border-gray-300 cursor-crosshair w-full max-w-full"
                    style={{ aspectRatio: `${canvasSize.width}/${canvasSize.height}` }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Properties Panel */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Item Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedItem ? (
                    <>
                      <div>
                        <Label>Label</Label>
                        <Input
                          value={selectedItem.label || ""}
                          onChange={(e) => updateSelectedItem({ label: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Width</Label>
                          <Input
                            type="number"
                            value={selectedItem.width}
                            onChange={(e) => updateSelectedItem({ width: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Height</Label>
                          <Input
                            type="number"
                            value={selectedItem.height}
                            onChange={(e) => updateSelectedItem({ height: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Rotation (degrees)</Label>
                        <Input
                          type="number"
                          value={selectedItem.rotation}
                          onChange={(e) => updateSelectedItem({ rotation: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      {selectedItem.type === 'table' && (
                        <div>
                          <Label>Seating Capacity</Label>
                          <Input
                            type="number"
                            value={selectedItem.capacity || 0}
                            onChange={(e) => updateSelectedItem({ capacity: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select an item to edit its properties
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Plan Summary */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Plan Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Items:</span>
                      <Badge variant="secondary">{floorPlanItems.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Capacity:</span>
                      <Badge variant="secondary">
                        {floorPlanItems.reduce((sum, item) => sum + (item.capacity || 0), 0)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Tables:</span>
                      <Badge variant="secondary">
                        {floorPlanItems.filter(item => item.type === 'table').length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Saved Floor Plans</CardTitle>
            </CardHeader>
            <CardContent>
              {floorPlans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {floorPlans.map((plan: FloorPlan) => (
                    <Card key={plan.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <div className="flex space-x-2">
                          <Badge variant="outline">{plan.venueSection}</Badge>
                          <Badge variant="secondary">{plan.capacity} guests</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-video bg-muted rounded flex items-center justify-center">
                          <Grid className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="mt-2 flex space-x-2">
                          <Button size="sm" variant="outline">Load</Button>
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">No floor plans saved yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}