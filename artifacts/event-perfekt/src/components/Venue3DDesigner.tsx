import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Box, 
  Save, 
  RotateCcw, 
  Eye,
  Palette,
  Lightbulb,
  Settings,
  Download,
  Upload,
  Play,
  Pause
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VenueDesign3D {
  id: string;
  name: string;
  style: string;
  colorPalette: string[];
  lighting: {
    ambient: number;
    directional: number;
    color: string;
  };
  furniture: {
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    material: string;
    color: string;
  }[];
  decorElements: {
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    properties: any;
  }[];
}

interface Venue3DDesignerProps {
  eventId: string;
  floorPlan?: any;
  venueImages?: any[];
}

export function Venue3DDesigner({ eventId, floorPlan, venueImages = [] }: Venue3DDesignerProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [designName, setDesignName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("elegant");
  const [viewMode, setViewMode] = useState("3d");
  const [isAnimating, setIsAnimating] = useState(false);
  
  // 3D Scene state
  const [sceneSettings, setSceneSettings] = useState({
    lighting: {
      ambient: 0.4,
      directional: 0.8,
      color: "#ffffff"
    },
    camera: {
      position: { x: 0, y: 5, z: 10 },
      rotation: { x: -0.3, y: 0, z: 0 }
    }
  });

  const [furnitureItems, setFurnitureItems] = useState([
    {
      id: '1',
      type: 'round_table',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: 'wood',
      color: '#8B4513'
    },
    {
      id: '2',
      type: 'chair',
      position: { x: 2, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: 'fabric',
      color: '#800020'
    }
  ]);

  const [decorElements, setDecorElements] = useState<any[]>([
    {
      id: '1',
      type: 'centerpiece',
      position: { x: 0, y: 1, z: 0 },
      properties: {
        style: 'elegant',
        height: 'tall',
        flowers: ['roses', 'peonies'],
        color: '#800020'
      }
    },
    {
      id: '2',
      type: 'lighting',
      position: { x: 0, y: 3, z: 0 },
      properties: {
        type: 'chandelier',
        intensity: 0.8,
        color: '#FFD700',
        size: 'large'
      }
    }
  ]);

  // Get existing 3D designs
  const { data: venueDesigns = [], refetch } = useQuery<any[]>({
    queryKey: ['/api/events', eventId, 'venue-designs'],
    retry: false,
  });

  // Save 3D design mutation
  const saveDesignMutation = useMutation({
    mutationFn: async (designData: any) => {
      const response = await fetch(`/api/events/${eventId}/venue-designs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(designData)
      });

      if (!response.ok) {
        throw new Error('Failed to save 3D design');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "3D Design Saved",
        description: "Your venue design has been saved successfully",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save 3D design. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Initialize 3D scene
  useEffect(() => {
    if (containerRef.current) {
      initializeThreeJS();
    }
  }, []);

  const initializeThreeJS = () => {
    // This would initialize Three.js scene
    // For now, we'll create a visual placeholder
    const container = containerRef.current;
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    // Create a canvas-like visualization
    const canvas = document.createElement('div');
    canvas.style.width = '100%';
    canvas.style.height = '400px';
    canvas.style.background = 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)';
    canvas.style.border = '2px solid #e5e7eb';
    canvas.style.borderRadius = '8px';
    canvas.style.position = 'relative';
    canvas.style.overflow = 'hidden';

    // Add 3D scene representation
    canvas.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
        <div style="font-size: 48px; color: #6b7280; margin-bottom: 16px;">🏛️</div>
        <div style="font-size: 18px; font-weight: 600; color: #374151; margin-bottom: 8px;">3D Venue Designer</div>
        <div style="font-size: 14px; color: #6b7280;">Interactive 3D scene will load here</div>
        <div style="margin-top: 16px;">
          <div style="display: inline-block; width: 60px; height: 60px; background: #8B4513; border-radius: 50%; margin: 0 8px; position: relative;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 10px;">Table</div>
          </div>
          <div style="display: inline-block; width: 20px; height: 20px; background: #800020; border-radius: 4px; margin: 0 4px;"></div>
          <div style="display: inline-block; width: 20px; height: 20px; background: #800020; border-radius: 4px; margin: 0 4px;"></div>
          <div style="display: inline-block; width: 20px; height: 20px; background: #800020; border-radius: 4px; margin: 0 4px;"></div>
        </div>
      </div>
    `;

    container.appendChild(canvas);
  };

  const updateSceneSettings = (settings: any) => {
    setSceneSettings(prev => ({ ...prev, ...settings }));
    // Update 3D scene here
  };

  const addFurnitureItem = (type: string) => {
    const newItem = {
      id: `furniture_${Date.now()}`,
      type,
      position: { x: Math.random() * 4 - 2, y: 0, z: Math.random() * 4 - 2 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: 'wood',
      color: '#8B4513'
    };

    setFurnitureItems(prev => [...prev, newItem]);
  };

  const addDecorElement = (type: string) => {
    const newElement = {
      id: `decor_${Date.now()}`,
      type,
      position: { x: Math.random() * 4 - 2, y: 1, z: Math.random() * 4 - 2 },
      properties: getDefaultDecorProperties(type)
    };

    setDecorElements(prev => [...prev, newElement]);
  };

  const getDefaultDecorProperties = (type: string) => {
    const defaults = {
      centerpiece: {
        style: selectedStyle,
        height: 'medium',
        flowers: ['roses'],
        color: '#800020'
      },
      lighting: {
        type: 'pendant',
        intensity: 0.7,
        color: '#FFD700',
        size: 'medium'
      },
      draping: {
        material: 'chiffon',
        color: '#F5F5DC',
        style: 'flowing'
      },
      backdrop: {
        type: 'floral',
        colors: ['#800020', '#FFD700'],
        style: selectedStyle
      }
    };

    return defaults[type as keyof typeof defaults] || {};
  };

  const saveDesign = () => {
    if (!designName.trim()) {
      toast({
        title: "Design Name Required",
        description: "Please enter a name for your 3D design",
        variant: "destructive"
      });
      return;
    }

    const designData: VenueDesign3D = {
      id: '',
      name: designName,
      style: selectedStyle,
      colorPalette: getColorPalette(selectedStyle),
      lighting: sceneSettings.lighting,
      furniture: furnitureItems,
      decorElements
    };

    saveDesignMutation.mutate(designData);
  };

  const getColorPalette = (style: string): string[] => {
    const palettes = {
      elegant: ["#800020", "#FFD700", "#F5F5DC", "#8B4513"],
      modern: ["#2C3E50", "#E74C3C", "#ECF0F1", "#F39C12"],
      rustic: ["#8B4513", "#F5DEB3", "#228B22", "#CD853F"],
      glamorous: ["#FFD700", "#C0C0C0", "#000000", "#FF69B4"],
      bohemian: ["#8B008B", "#FF8C00", "#32CD32", "#DC143C"],
      vintage: ["#800000", "#F5F5DC", "#DDA0DD", "#708090"]
    };
    
    return palettes[style as keyof typeof palettes] || palettes.elegant;
  };

  const furnitureTypes = [
    { id: 'round_table', label: 'Round Table', icon: '⭕' },
    { id: 'rectangle_table', label: 'Rectangle Table', icon: '⬜' },
    { id: 'chair', label: 'Chair', icon: '🪑' },
    { id: 'lounge_chair', label: 'Lounge Chair', icon: '🛋️' },
    { id: 'bar_table', label: 'Bar Table', icon: '🍸' },
    { id: 'stage', label: 'Stage', icon: '🎭' }
  ];

  const decorTypes = [
    { id: 'centerpiece', label: 'Centerpiece', icon: '💐' },
    { id: 'lighting', label: 'Lighting', icon: '💡' },
    { id: 'draping', label: 'Draping', icon: '🎭' },
    { id: 'backdrop', label: 'Backdrop', icon: '🖼️' },
    { id: 'flower_wall', label: 'Flower Wall', icon: '🌸' },
    { id: 'arch', label: 'Arch', icon: '🌈' }
  ];

  const designStyles = [
    'elegant', 'modern', 'rustic', 'glamorous', 'bohemian', 'vintage'
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="designer">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="designer">3D Designer</TabsTrigger>
          <TabsTrigger value="settings">Scene Settings</TabsTrigger>
          <TabsTrigger value="designs">Saved Designs</TabsTrigger>
        </TabsList>

        <TabsContent value="designer" className="space-y-6">
          {/* Design Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Box className="w-6 h-6" />
                <span>3D Venue Designer</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Design Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="designName">Design Name</Label>
                  <Input
                    id="designName"
                    value={designName}
                    onChange={(e) => setDesignName(e.target.value)}
                    placeholder="Enter design name..."
                  />
                </div>
                <div>
                  <Label htmlFor="style">Design Style</Label>
                  <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {designStyles.map(style => (
                        <SelectItem key={style} value={style}>
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="viewMode">View Mode</Label>
                  <Select value={viewMode} onValueChange={setViewMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3d">3D View</SelectItem>
                      <SelectItem value="top">Top View</SelectItem>
                      <SelectItem value="walkthrough">Walkthrough</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button onClick={saveDesign} disabled={saveDesignMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Design
                </Button>
                <Button variant="outline" onClick={() => setIsAnimating(!isAnimating)}>
                  {isAnimating ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isAnimating ? 'Pause' : 'Animate'}
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 3D Scene and Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 3D Viewport */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>3D Scene</span>
                    <div className="flex space-x-2">
                      <Badge variant="outline">{viewMode}</Badge>
                      <Badge variant="secondary">{selectedStyle}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div ref={containerRef} className="w-full min-h-[400px]">
                    {/* 3D scene will be rendered here */}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tools Panel */}
            <div className="space-y-4">
              {/* Furniture Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Furniture</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {furnitureTypes.map(furniture => (
                      <Button
                        key={furniture.id}
                        variant="outline"
                        size="sm"
                        onClick={() => addFurnitureItem(furniture.id)}
                        className="flex flex-col items-center p-2 h-auto"
                      >
                        <span className="text-lg mb-1">{furniture.icon}</span>
                        <span className="text-xs">{furniture.label}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Decor Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Decor Elements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {decorTypes.map(decor => (
                      <Button
                        key={decor.id}
                        variant="outline"
                        size="sm"
                        onClick={() => addDecorElement(decor.id)}
                        className="flex flex-col items-center p-2 h-auto"
                      >
                        <span className="text-lg mb-1">{decor.icon}</span>
                        <span className="text-xs">{decor.label}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Color Palette */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Palette className="w-4 h-4" />
                    <span>Colors</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    {getColorPalette(selectedStyle).map((color, index) => (
                      <div
                        key={index}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm cursor-pointer"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-6 h-6" />
                <span>Scene Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lighting Controls */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5" />
                  <span>Lighting</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Ambient Light</Label>
                    <Slider
                      value={[sceneSettings.lighting.ambient]}
                      onValueChange={([value]) => 
                        updateSceneSettings({ lighting: { ...sceneSettings.lighting, ambient: value } })
                      }
                      max={1}
                      min={0}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Directional Light</Label>
                    <Slider
                      value={[sceneSettings.lighting.directional]}
                      onValueChange={([value]) => 
                        updateSceneSettings({ lighting: { ...sceneSettings.lighting, directional: value } })
                      }
                      max={1}
                      min={0}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Light Color</Label>
                    <Input
                      type="color"
                      value={sceneSettings.lighting.color}
                      onChange={(e) => 
                        updateSceneSettings({ lighting: { ...sceneSettings.lighting, color: e.target.value } })
                      }
                      className="w-20 h-10 mt-2"
                    />
                  </div>
                </div>
              </div>

              {/* Camera Controls */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>Camera</span>
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>X Position</Label>
                    <Slider
                      value={[sceneSettings.camera.position.x]}
                      onValueChange={([value]) => 
                        updateSceneSettings({ 
                          camera: { 
                            ...sceneSettings.camera, 
                            position: { ...sceneSettings.camera.position, x: value } 
                          } 
                        })
                      }
                      max={10}
                      min={-10}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Y Position</Label>
                    <Slider
                      value={[sceneSettings.camera.position.y]}
                      onValueChange={([value]) => 
                        updateSceneSettings({ 
                          camera: { 
                            ...sceneSettings.camera, 
                            position: { ...sceneSettings.camera.position, y: value } 
                          } 
                        })
                      }
                      max={15}
                      min={1}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Z Position</Label>
                    <Slider
                      value={[sceneSettings.camera.position.z]}
                      onValueChange={([value]) => 
                        updateSceneSettings({ 
                          camera: { 
                            ...sceneSettings.camera, 
                            position: { ...sceneSettings.camera.position, z: value } 
                          } 
                        })
                      }
                      max={15}
                      min={-15}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="designs">
          <Card>
            <CardHeader>
              <CardTitle>Saved 3D Designs</CardTitle>
            </CardHeader>
            <CardContent>
              {venueDesigns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {venueDesigns.map((design: VenueDesign3D) => (
                    <Card key={design.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">{design.name}</CardTitle>
                        <Badge variant="outline">{design.style}</Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-video bg-muted rounded flex items-center justify-center mb-3">
                          <Box className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="flex space-x-1 mb-3">
                          {design.colorPalette?.map((color, index) => (
                            <div
                              key={index}
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex space-x-2">
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
                <p className="text-center text-muted-foreground">No 3D designs saved yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}