import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Box,
  Eye,
  Move3D,
  RotateCcw,
  Palette,
  Lightbulb,
  Camera,
  Download,
  Upload,
  RefreshCw,
  Maximize,
  Settings,
  Layers,
  Grid3X3,
  Sun,
  Moon
} from "lucide-react";

interface VenueObject3D {
  id: string;
  type: 'table' | 'chair' | 'stage' | 'wall' | 'pillar' | 'decoration' | 'lighting' | 'floor' | 'ceiling';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  material: 'wood' | 'metal' | 'fabric' | 'glass' | 'marble' | 'concrete';
  texture?: string;
  visible: boolean;
}

interface LightingSetup {
  ambient: { color: string; intensity: number };
  directional: { color: string; intensity: number; position: { x: number; y: number; z: number } };
  spots: Array<{ position: { x: number; y: number; z: number }; color: string; intensity: number; target: { x: number; y: number; z: number } }>;
}

interface VenueDesigner3DProps {
  eventId?: string;
  venueType?: string;
  eventTheme?: string;
  primaryColors?: string[];
  onSave?: (design: { objects: VenueObject3D[]; lighting: LightingSetup; camera: any }) => void;
}

const OBJECT_TYPES = [
  { type: 'table', label: 'Round Table', color: '#8B4513', defaultScale: { x: 1, y: 0.1, z: 1 } },
  { type: 'chair', label: 'Chair', color: '#654321', defaultScale: { x: 0.4, y: 0.8, z: 0.4 } },
  { type: 'stage', label: 'Stage Platform', color: '#4B0082', defaultScale: { x: 3, y: 0.3, z: 2 } },
  { type: 'wall', label: 'Wall Panel', color: '#F5F5DC', defaultScale: { x: 3, y: 2.5, z: 0.1 } },
  { type: 'pillar', label: 'Column', color: '#D3D3D3', defaultScale: { x: 0.3, y: 3, z: 0.3 } },
  { type: 'decoration', label: 'Decoration', color: '#FF69B4', defaultScale: { x: 0.5, y: 0.5, z: 0.5 } },
  { type: 'lighting', label: 'Light Fixture', color: '#FFD700', defaultScale: { x: 0.2, y: 0.2, z: 0.2 } },
];

const MATERIALS = [
  { value: 'wood', label: 'Wood', color: '#8B4513' },
  { value: 'metal', label: 'Metal', color: '#C0C0C0' },
  { value: 'fabric', label: 'Fabric', color: '#F0E68C' },
  { value: 'glass', label: 'Glass', color: '#E0FFFF' },
  { value: 'marble', label: 'Marble', color: '#F8F8FF' },
  { value: 'concrete', label: 'Concrete', color: '#696969' },
];

const LIGHTING_PRESETS = {
  romantic: {
    ambient: { color: '#FFE4E1', intensity: 0.3 },
    directional: { color: '#FFB6C1', intensity: 0.5, position: { x: 5, y: 10, z: 5 } },
    spots: [
      { position: { x: 0, y: 5, z: 0 }, color: '#FF69B4', intensity: 0.8, target: { x: 0, y: 0, z: 0 } }
    ]
  },
  corporate: {
    ambient: { color: '#F8F8FF', intensity: 0.5 },
    directional: { color: '#FFFFFF', intensity: 0.8, position: { x: 10, y: 15, z: 10 } },
    spots: [
      { position: { x: -5, y: 8, z: -5 }, color: '#FFFFFF', intensity: 1.0, target: { x: 0, y: 0, z: 0 } },
      { position: { x: 5, y: 8, z: 5 }, color: '#FFFFFF', intensity: 1.0, target: { x: 0, y: 0, z: 0 } }
    ]
  },
  dramatic: {
    ambient: { color: '#191970', intensity: 0.2 },
    directional: { color: '#4169E1', intensity: 0.6, position: { x: 0, y: 20, z: 0 } },
    spots: [
      { position: { x: 0, y: 10, z: -10 }, color: '#8A2BE2', intensity: 1.2, target: { x: 0, y: 0, z: 0 } }
    ]
  }
};

export function VenueDesigner3D({ eventId, venueType, eventTheme, primaryColors = [], onSave }: VenueDesigner3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [objects, setObjects] = useState<VenueObject3D[]>([]);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [cameraPosition, setCameraPosition] = useState({ x: 10, y: 10, z: 10 });
  const [cameraTarget, setCameraTarget] = useState({ x: 0, y: 0, z: 0 });
  const [lighting, setLighting] = useState<LightingSetup>(LIGHTING_PRESETS.corporate);
  const [showWireframe, setShowWireframe] = useState(false);
  const [renderMode, setRenderMode] = useState<'realistic' | 'wireframe' | 'x-ray'>('realistic');
  const [isRendering, setIsRendering] = useState(false);

  // Simple 3D viewport simulation (in a real app, you'd use Three.js or similar)
  useEffect(() => {
    render3DScene();
  }, [objects, selectedObject, lighting, cameraPosition, renderMode]);

  const render3DScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRendering(true);

    // Clear canvas with background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, lighting.ambient.color);
    gradient.addColorStop(1, '#f0f0f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);

    // Simulate 3D projection and draw objects
    objects.forEach(obj => {
      if (!obj.visible) return;
      
      // Simple isometric projection
      const screenX = canvas.width / 2 + (obj.position.x - obj.position.z) * 20;
      const screenY = canvas.height / 2 + (obj.position.y + (obj.position.x + obj.position.z) * 0.5) * 20;
      
      drawObject3D(ctx, obj, screenX, screenY);
    });

    setIsRendering(false);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    const gridSize = 40;
    const centerX = width / 2;
    const centerY = height / 2;

    // Draw isometric grid
    for (let i = -10; i <= 10; i++) {
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(centerX - 200, centerY + i * gridSize);
      ctx.lineTo(centerX + 200, centerY + i * gridSize);
      ctx.stroke();

      // Diagonal lines (left)
      ctx.beginPath();
      ctx.moveTo(centerX + i * gridSize * 0.866, centerY - 200);
      ctx.lineTo(centerX + i * gridSize * 0.866, centerY + 200);
      ctx.stroke();

      // Diagonal lines (right)
      ctx.beginPath();
      ctx.moveTo(centerX - i * gridSize * 0.866, centerY - 200);
      ctx.lineTo(centerX - i * gridSize * 0.866, centerY + 200);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  };

  const drawObject3D = (ctx: CanvasRenderingContext2D, obj: VenueObject3D, x: number, y: number) => {
    ctx.save();

    // Apply selection highlight
    if (selectedObject === obj.id) {
      ctx.shadowColor = '#FF6B6B';
      ctx.shadowBlur = 10;
    }

    const size = 30 * obj.scale.x;
    const height = 20 * obj.scale.y;

    if (renderMode === 'wireframe') {
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - size/2, y - size/2, size, size);
      // Draw height lines
      ctx.beginPath();
      ctx.moveTo(x - size/2, y - size/2);
      ctx.lineTo(x - size/2, y - size/2 - height);
      ctx.moveTo(x + size/2, y - size/2);
      ctx.lineTo(x + size/2, y - size/2 - height);
      ctx.moveTo(x - size/2, y + size/2);
      ctx.lineTo(x - size/2, y + size/2 - height);
      ctx.moveTo(x + size/2, y + size/2);
      ctx.lineTo(x + size/2, y + size/2 - height);
      ctx.stroke();
    } else {
      // Draw 3D-looking box
      ctx.fillStyle = obj.color;
      
      // Top face
      ctx.beginPath();
      ctx.moveTo(x - size/2, y - size/2 - height);
      ctx.lineTo(x, y - size/2 - height - size/4);
      ctx.lineTo(x + size/2, y - size/2 - height);
      ctx.lineTo(x, y + size/2 - height - size/4);
      ctx.closePath();
      ctx.fill();

      // Front face
      ctx.fillStyle = adjustBrightness(obj.color, -20);
      ctx.fillRect(x - size/2, y - size/2 - height, size, height);

      // Side face
      ctx.fillStyle = adjustBrightness(obj.color, -40);
      ctx.beginPath();
      ctx.moveTo(x + size/2, y - size/2 - height);
      ctx.lineTo(x + size/2 + size/4, y - size/4 - height);
      ctx.lineTo(x + size/2 + size/4, y + size/4);
      ctx.lineTo(x + size/2, y + size/2);
      ctx.closePath();
      ctx.fill();
    }

    // Draw label
    if (obj.type) {
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(OBJECT_TYPES.find(t => t.type === obj.type)?.label || obj.type, x, y + size/2 + 15);
    }

    ctx.restore();
  };

  const adjustBrightness = (color: string, amount: number): string => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * amount);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  const addObject = (objectType: string) => {
    const objectConfig = OBJECT_TYPES.find(t => t.type === objectType);
    if (!objectConfig) return;

    const newObject: VenueObject3D = {
      id: `object-${Date.now()}`,
      type: objectType as any,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: objectConfig.defaultScale,
      color: objectConfig.color,
      material: 'wood',
      visible: true
    };

    setObjects(prev => [...prev, newObject]);
    setSelectedObject(newObject.id);
  };

  const generateTemplateLayout = () => {
    const templates = {
      wedding: [
        { type: 'stage', position: { x: 0, y: 0, z: -5 } },
        { type: 'table', position: { x: -3, y: 0, z: 0 } },
        { type: 'table', position: { x: 3, y: 0, z: 0 } },
        { type: 'table', position: { x: -3, y: 0, z: 3 } },
        { type: 'table', position: { x: 3, y: 0, z: 3 } },
        { type: 'decoration', position: { x: 0, y: 1, z: 5 } },
      ],
      corporate: [
        { type: 'stage', position: { x: 0, y: 0, z: -4 } },
        { type: 'chair', position: { x: -2, y: 0, z: 0 } },
        { type: 'chair', position: { x: 0, y: 0, z: 0 } },
        { type: 'chair', position: { x: 2, y: 0, z: 0 } },
        { type: 'chair', position: { x: -2, y: 0, z: 2 } },
        { type: 'chair', position: { x: 0, y: 0, z: 2 } },
        { type: 'chair', position: { x: 2, y: 0, z: 2 } },
      ]
    };

    const templateType = venueType?.toLowerCase().includes('wedding') ? 'wedding' : 'corporate';
    const template = templates[templateType] || templates.corporate;

    const templateObjects = template.map((item, index) => {
      const objectConfig = OBJECT_TYPES.find(t => t.type === item.type);
      return {
        id: `template-${index}`,
        type: item.type as any,
        position: item.position,
        rotation: { x: 0, y: 0, z: 0 },
        scale: objectConfig?.defaultScale || { x: 1, y: 1, z: 1 },
        color: objectConfig?.color || '#888',
        material: 'wood' as const,
        visible: true
      };
    });

    setObjects(templateObjects);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Simple hit detection (in a real 3D app, you'd use proper ray casting)
    const clickedObject = objects.find(obj => {
      const screenX = canvas.width / 2 + (obj.position.x - obj.position.z) * 20;
      const screenY = canvas.height / 2 + (obj.position.y + (obj.position.x + obj.position.z) * 0.5) * 20;
      const size = 30 * obj.scale.x;
      
      return x >= screenX - size/2 && x <= screenX + size/2 &&
             y >= screenY - size/2 && y <= screenY + size/2;
    });

    if (clickedObject) {
      setSelectedObject(clickedObject.id);
    } else {
      if (selectedTool !== 'select') {
        addObject(selectedTool);
      } else {
        setSelectedObject(null);
      }
    }
  };

  const applyLightingPreset = (presetName: keyof typeof LIGHTING_PRESETS) => {
    setLighting(LIGHTING_PRESETS[presetName]);
  };

  const exportDesign = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `3d-venue-design-${eventId || 'design'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const selectedObjectData = objects.find(obj => obj.id === selectedObject);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center space-x-3">
            <Box className="w-8 h-8" />
            <div>
              <div>3D Venue Designer</div>
              <div className="text-sm font-normal opacity-90">Interactive 3D Space Planning</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white/20 rounded-lg p-4">
              <Box className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">3D Objects</div>
              <div className="text-sm opacity-90">Drag & position</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <Lightbulb className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">Lighting</div>
              <div className="text-sm opacity-90">Realistic ambience</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <Eye className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">Multi-View</div>
              <div className="text-sm opacity-90">Different angles</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <Camera className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">Export</div>
              <div className="text-sm opacity-90">Share designs</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Tools Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Object Tools */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Box className="w-5 h-5" />
                <span>3D Objects</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={selectedTool === 'select' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTool('select')}
                >
                  <Move3D className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateTemplateLayout}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                {OBJECT_TYPES.map((objectType) => (
                  <Button
                    key={objectType.type}
                    variant={selectedTool === objectType.type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTool(objectType.type)}
                    className="w-full justify-start"
                  >
                    <Box className="w-4 h-4 mr-2" />
                    {objectType.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lighting Controls */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5" />
                <span>Lighting</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyLightingPreset('romantic')}
                  className="w-full"
                >
                  <Sun className="w-4 h-4 mr-2" />
                  Romantic
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyLightingPreset('corporate')}
                  className="w-full"
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Corporate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyLightingPreset('dramatic')}
                  className="w-full"
                >
                  <Moon className="w-4 h-4 mr-2" />
                  Dramatic
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* View Controls */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>View</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Render Mode</Label>
                <Select value={renderMode} onValueChange={(value: any) => setRenderMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realistic">Realistic</SelectItem>
                    <SelectItem value="wireframe">Wireframe</SelectItem>
                    <SelectItem value="x-ray">X-Ray</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={exportDesign}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Design
              </Button>
            </CardContent>
          </Card>

          {/* Object Properties */}
          {selectedObjectData && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Object Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Material</Label>
                  <Select 
                    value={selectedObjectData.material} 
                    onValueChange={(value: any) => {
                      setObjects(prev => prev.map(obj => 
                        obj.id === selectedObject 
                          ? { ...obj, material: value }
                          : obj
                      ));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIALS.map(material => (
                        <SelectItem key={material.value} value={material.value}>
                          {material.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Color</Label>
                  <Input
                    type="color"
                    value={selectedObjectData.color}
                    onChange={(e) => {
                      setObjects(prev => prev.map(obj => 
                        obj.id === selectedObject 
                          ? { ...obj, color: e.target.value }
                          : obj
                      ));
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Scale</Label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <Label>X</Label>
                      <Slider
                        value={[selectedObjectData.scale.x]}
                        onValueChange={([value]) => {
                          setObjects(prev => prev.map(obj => 
                            obj.id === selectedObject 
                              ? { ...obj, scale: { ...obj.scale, x: value } }
                              : obj
                          ));
                        }}
                        min={0.1}
                        max={3}
                        step={0.1}
                      />
                    </div>
                    <div>
                      <Label>Y</Label>
                      <Slider
                        value={[selectedObjectData.scale.y]}
                        onValueChange={([value]) => {
                          setObjects(prev => prev.map(obj => 
                            obj.id === selectedObject 
                              ? { ...obj, scale: { ...obj.scale, y: value } }
                              : obj
                          ));
                        }}
                        min={0.1}
                        max={3}
                        step={0.1}
                      />
                    </div>
                    <div>
                      <Label>Z</Label>
                      <Slider
                        value={[selectedObjectData.scale.z]}
                        onValueChange={([value]) => {
                          setObjects(prev => prev.map(obj => 
                            obj.id === selectedObject 
                              ? { ...obj, scale: { ...obj.scale, z: value } }
                              : obj
                          ));
                        }}
                        min={0.1}
                        max={3}
                        step={0.1}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setObjects(prev => prev.filter(obj => obj.id !== selectedObject));
                    setSelectedObject(null);
                  }}
                  className="w-full"
                >
                  <Box className="w-4 h-4 mr-2" />
                  Delete Object
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 3D Viewport */}
        <div className="lg:col-span-3">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Box className="w-5 h-5" />
                  <span>3D Viewport</span>
                  {isRendering && (
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                  )}
                </CardTitle>
                <div className="flex items-center space-x-4 text-sm text-white" style={{color: 'white !important'}}>
                  <Badge variant="outline">
                    {objects.length} objects
                  </Badge>
                  <Badge variant={renderMode === 'realistic' ? 'default' : 'outline'}>
                    {renderMode}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-gradient-to-b from-blue-50 to-gray-100">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="cursor-crosshair w-full"
                  onClick={handleCanvasClick}
                />
              </div>
              
              <div className="mt-4 text-sm text-white" style={{color: 'white !important'}}>
                <p><strong>3D Venue Designer Instructions:</strong></p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Select object types from the left panel and click in the viewport to add them</li>
                  <li>Click on objects to select and modify their properties (material, color, scale)</li>
                  <li>Use lighting presets to create different moods and atmospheres</li>
                  <li>Switch between render modes to see wireframes or x-ray views</li>
                  <li>Generate template layouts based on your event type</li>
                  <li>Export your 3D design as an image to share with clients</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}