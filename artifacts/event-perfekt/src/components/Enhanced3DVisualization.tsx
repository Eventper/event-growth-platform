import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Box, 
  Eye, 
  Camera, 
  Download, 
  RotateCcw, 
  Move3D, 
  Lightbulb, 
  Palette,
  Play,
  Pause,
  Settings,
  Maximize,
  Grid3X3,
  Sun,
  Moon,
  Layers
} from "lucide-react";

interface Camera3D {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  fov: number;
}

interface Light3D {
  type: 'ambient' | 'directional' | 'point' | 'spot';
  position: { x: number; y: number; z: number };
  color: string;
  intensity: number;
  castShadow: boolean;
}

interface Object3D {
  id: string;
  type: 'table' | 'chair' | 'stage' | 'decoration' | 'wall' | 'floor';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  material: string;
  texture?: string;
}

interface Scene3D {
  objects: Object3D[];
  lights: Light3D[];
  camera: Camera3D;
  environment: {
    skybox: string;
    fog: { enabled: boolean; color: string; density: number };
    shadows: boolean;
  };
}

interface Enhanced3DVisualizationProps {
  eventTheme?: string;
  primaryColors?: string[];
  guestCount?: number;
  venueType?: string;
}

export function Enhanced3DVisualization({ 
  eventTheme = "Elegant Romance",
  primaryColors = ["#800020", "#F5F5DC", "#FFD700"],
  guestCount = 150,
  venueType = "ballroom"
}: Enhanced3DVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<Scene3D>({
    objects: [],
    lights: [
      {
        type: 'ambient',
        position: { x: 0, y: 10, z: 0 },
        color: '#FFFFFF',
        intensity: 0.3,
        castShadow: false
      },
      {
        type: 'directional',
        position: { x: 5, y: 10, z: 5 },
        color: '#FFF8DC',
        intensity: 0.8,
        castShadow: true
      }
    ],
    camera: {
      position: { x: 0, y: 8, z: 15 },
      rotation: { x: -0.3, y: 0, z: 0 },
      fov: 60
    },
    environment: {
      skybox: 'ballroom',
      fog: { enabled: true, color: '#F5F5DC', density: 0.02 },
      shadows: true
    }
  });

  const [isRotating, setIsRotating] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("romantic-dinner");
  const [renderMode, setRenderMode] = useState<"realistic" | "wireframe" | "materials">("realistic");

  // 3D Scene Presets based on event type and guest count
  const scenePresets = {
    "romantic-dinner": {
      name: "Romantic Dinner Setup",
      description: "Intimate dining arrangement with ambient lighting",
      objects: Array.from({ length: Math.ceil(guestCount / 8) }, (_, i) => ({
        id: `table-${i}`,
        type: 'table' as const,
        position: { 
          x: (i % 5) * 4 - 8, 
          y: 0, 
          z: Math.floor(i / 5) * 4 - 6 
        },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1.2, y: 0.1, z: 1.2 },
        color: primaryColors[0] || '#800020',
        material: 'wood'
      }))
    },
    "cocktail-reception": {
      name: "Cocktail Reception",
      description: "Standing reception with bar areas and lounge seating",
      objects: [
        // Central bar
        {
          id: 'main-bar',
          type: 'stage' as const,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 4, y: 1, z: 1.5 },
          color: '#2F4F4F',
          material: 'marble'
        },
        // Cocktail tables
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `cocktail-table-${i}`,
          type: 'table' as const,
          position: { 
            x: Math.cos(i * Math.PI / 4) * 6, 
            y: 0, 
            z: Math.sin(i * Math.PI / 4) * 6 
          },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.8, y: 1.2, z: 0.8 },
          color: primaryColors[1] || '#F5F5DC',
          material: 'glass'
        }))
      ]
    },
    "conference-setup": {
      name: "Conference Setup",
      description: "Professional theater-style seating with stage",
      objects: [
        // Main stage
        {
          id: 'main-stage',
          type: 'stage' as const,
          position: { x: 0, y: 0.3, z: -8 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 6, y: 0.3, z: 3 },
          color: '#4B0082',
          material: 'wood'
        },
        // Seating rows
        ...Array.from({ length: Math.ceil(guestCount / 15) }, (_, row) =>
          Array.from({ length: 15 }, (_, seat) => ({
            id: `seat-${row}-${seat}`,
            type: 'chair' as const,
            position: { 
              x: (seat - 7) * 0.8, 
              y: 0, 
              z: row * 1.2 + 2 
            },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.4, y: 0.8, z: 0.4 },
            color: '#654321',
            material: 'fabric'
          }))
        ).flat()
      ]
    }
  };

  // Generate intelligent lighting based on theme
  const generateThemeLighting = (theme: string): Light3D[] => {
    const baseLights: Light3D[] = [
      {
        type: 'ambient',
        position: { x: 0, y: 10, z: 0 },
        color: '#FFFFFF',
        intensity: 0.2,
        castShadow: false
      }
    ];

    switch (theme.toLowerCase()) {
      case 'romantic-dinner':
        return [
          ...baseLights,
          {
            type: 'point',
            position: { x: 0, y: 3, z: 0 },
            color: '#FFD700',
            intensity: 0.6,
            castShadow: true
          },
          ...Array.from({ length: 4 }, (_, i) => ({
            type: 'spot' as const,
            position: { 
              x: Math.cos(i * Math.PI / 2) * 8, 
              y: 4, 
              z: Math.sin(i * Math.PI / 2) * 8 
            },
            color: '#FFF8DC',
            intensity: 0.4,
            castShadow: true
          }))
        ];
      
      case 'cocktail-reception':
        return [
          ...baseLights,
          {
            type: 'directional',
            position: { x: 0, y: 8, z: 0 },
            color: primaryColors[2] || '#FFD700',
            intensity: 0.7,
            castShadow: true
          },
          {
            type: 'point',
            position: { x: 0, y: 2, z: 0 },
            color: '#FF69B4',
            intensity: 0.5,
            castShadow: false
          }
        ];
      
      default:
        return [
          ...baseLights,
          {
            type: 'directional',
            position: { x: 5, y: 10, z: 5 },
            color: '#FFFFFF',
            intensity: 0.8,
            castShadow: true
          }
        ];
    }
  };

  // Render 3D scene to canvas (simplified visualization)
  const render3DScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = scene.environment.fog.enabled ? scene.environment.fog.color : '#F0F0F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid (floor)
    ctx.strokeStyle = '#DDDDDD';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let i = 0; i <= canvas.width; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= canvas.height; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Render objects with 3D perspective simulation
    scene.objects.forEach((obj, index) => {
      const screenX = canvas.width / 2 + obj.position.x * 20;
      const screenY = canvas.height / 2 + obj.position.z * 15;
      const depth = Math.max(0.3, 1 - obj.position.y * 0.1);

      ctx.save();
      ctx.globalAlpha = depth;
      
      switch (obj.type) {
        case 'table':
          ctx.fillStyle = obj.color;
          ctx.fillRect(
            screenX - obj.scale.x * 15, 
            screenY - obj.scale.z * 15, 
            obj.scale.x * 30, 
            obj.scale.z * 30
          );
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            screenX - obj.scale.x * 15, 
            screenY - obj.scale.z * 15, 
            obj.scale.x * 30, 
            obj.scale.z * 30
          );
          break;
          
        case 'chair':
          ctx.fillStyle = obj.color;
          ctx.fillRect(
            screenX - obj.scale.x * 8, 
            screenY - obj.scale.z * 8, 
            obj.scale.x * 16, 
            obj.scale.z * 16
          );
          break;
          
        case 'stage':
          ctx.fillStyle = obj.color;
          ctx.fillRect(
            screenX - obj.scale.x * 20, 
            screenY - obj.scale.z * 20, 
            obj.scale.x * 40, 
            obj.scale.z * 40
          );
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.strokeRect(
            screenX - obj.scale.x * 20, 
            screenY - obj.scale.z * 20, 
            obj.scale.x * 40, 
            obj.scale.z * 40
          );
          break;
      }
      
      ctx.restore();
    });

    // Draw lighting effects
    scene.lights.forEach(light => {
      if (light.type === 'point' || light.type === 'spot') {
        const screenX = canvas.width / 2 + light.position.x * 20;
        const screenY = canvas.height / 2 + light.position.z * 15;
        
        const gradient = ctx.createRadialGradient(
          screenX, screenY, 0,
          screenX, screenY, light.intensity * 100
        );
        gradient.addColorStop(0, light.color + '40');
        gradient.addColorStop(1, light.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    });
  };

  // Auto-rotation effect
  useEffect(() => {
    if (!isRotating) return;
    
    const interval = setInterval(() => {
      setScene(prev => ({
        ...prev,
        camera: {
          ...prev.camera,
          rotation: {
            ...prev.camera.rotation,
            y: prev.camera.rotation.y + 0.01
          }
        }
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [isRotating]);

  // Re-render when scene changes
  useEffect(() => {
    render3DScene();
  }, [scene, selectedPreset]);

  // Load preset scene
  const loadPreset = (presetKey: string) => {
    const preset = scenePresets[presetKey as keyof typeof scenePresets];
    if (preset) {
      setScene(prev => ({
        ...prev,
        objects: preset.objects,
        lights: generateThemeLighting(presetKey)
      }));
      setSelectedPreset(presetKey);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-300">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Box className="w-6 h-6 text-red-600" />
              <span className="text-red-900">Enhanced 3D Venue Visualization</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-red-600 text-white">Agent-Powered</Badge>
              <Badge variant="outline" className="border-red-300 text-red-700">
                {scene.objects.length} Objects
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-red-800">Scene Preset</label>
              <Select value={selectedPreset} onValueChange={loadPreset}>
                <SelectTrigger className="border-red-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(scenePresets).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-red-800">Render Mode</label>
              <Select value={renderMode} onValueChange={(value: any) => setRenderMode(value)}>
                <SelectTrigger className="border-red-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realistic">Realistic</SelectItem>
                  <SelectItem value="wireframe">Wireframe</SelectItem>
                  <SelectItem value="materials">Materials</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end space-x-2">
              <Button
                variant={isRotating ? "default" : "outline"}
                size="sm"
                onClick={() => setIsRotating(!isRotating)}
                className={isRotating ? "bg-red-600 text-white" : "border-red-300 text-red-700"}
              >
                {isRotating ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                {isRotating ? "Stop" : "Rotate"}
              </Button>
              <Button variant="outline" size="sm" className="border-red-300 text-red-700">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3D Viewport */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Scene Controls */}
        <Card className="lg:col-span-1 bg-white/50 border-red-200">
          <CardHeader>
            <CardTitle className="text-lg text-red-900">Scene Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera Controls */}
            <div className="space-y-2">
              <h4 className="font-semibold text-red-800 flex items-center">
                <Camera className="w-4 h-4 mr-1" />
                Camera
              </h4>
              <div>
                <label className="text-xs text-gray-600">Field of View</label>
                <Slider
                  value={[scene.camera.fov]}
                  onValueChange={([value]) => 
                    setScene(prev => ({
                      ...prev,
                      camera: { ...prev.camera, fov: value }
                    }))
                  }
                  min={30}
                  max={120}
                  step={5}
                  className="mt-1"
                />
                <span className="text-xs text-gray-500">{scene.camera.fov}°</span>
              </div>
            </div>

            {/* Lighting Controls */}
            <div className="space-y-2">
              <h4 className="font-semibold text-red-800 flex items-center">
                <Lightbulb className="w-4 h-4 mr-1" />
                Lighting
              </h4>
              <div>
                <label className="text-xs text-gray-600">Ambient Intensity</label>
                <Slider
                  value={[scene.lights[0]?.intensity || 0.3]}
                  onValueChange={([value]) => 
                    setScene(prev => ({
                      ...prev,
                      lights: prev.lights.map((light, i) => 
                        i === 0 ? { ...light, intensity: value } : light
                      )
                    }))
                  }
                  min={0}
                  max={1}
                  step={0.1}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Environment */}
            <div className="space-y-2">
              <h4 className="font-semibold text-red-800 flex items-center">
                <Settings className="w-4 h-4 mr-1" />
                Environment
              </h4>
              <div className="flex items-center space-x-2 text-sm">
                <Grid3X3 className="w-4 h-4" />
                <span>Shadows: {scene.environment.shadows ? 'On' : 'Off'}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Eye className="w-4 h-4" />
                <span>Fog: {scene.environment.fog.enabled ? 'On' : 'Off'}</span>
              </div>
            </div>

            {/* Theme Info */}
            <div className="space-y-2 pt-4 border-t border-red-200">
              <h4 className="font-semibold text-red-800">Event Theme</h4>
              <p className="text-sm text-gray-600">{eventTheme}</p>
              <div className="flex space-x-1">
                {primaryColors.map((color, index) => (
                  <div
                    key={index}
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">{guestCount} guests • {venueType}</p>
            </div>
          </CardContent>
        </Card>

        {/* 3D Viewport Canvas */}
        <Card className="lg:col-span-3 bg-white border-red-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-red-600" />
                <span className="text-red-900">3D Venue Preview</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="text-red-700">
                  <Maximize className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-red-700">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg overflow-hidden border-2 border-red-200">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="w-full h-auto cursor-grab active:cursor-grabbing"
              />
            </div>
            
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span>Mode: {renderMode}</span>
                <span>Objects: {scene.objects.length}</span>
                <span>Lights: {scene.lights.length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Move3D className="w-4 h-4" />
                <span>Click and drag to interact</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scene Information */}
      <Card className="bg-gradient-to-r from-red-600 to-red-700 text-white border-0">
        <CardContent className="p-4">
          <div className="text-center">
            <h3 className="font-bold mb-2">Agent-Generated 3D Scene</h3>
            <p className="text-red-100 text-sm">
              Intelligent venue layout optimized for {guestCount} guests with {eventTheme.toLowerCase()} theme
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}