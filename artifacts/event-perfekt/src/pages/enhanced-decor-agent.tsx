import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Palette, 
  Sparkles, 
  Layout, 
  Box, 
  Camera, 
  Download,
  Play,
  Wand2,
  Eye,
  Settings,
  Zap,
  RefreshCw,
  Star,
  Heart,
  Upload,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize,
  Move,
  RotateCw,
  Trash2,
  Grid,
  Users,
  Music,
  Square,
  Circle,
  Triangle,
  Plus,
  FileImage,
  X,
  Link2,
  Calculator,
  Edit,
  DollarSign,
  Building2,
  Ruler
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ComprehensiveVenueDesigner from "@/components/ComprehensiveVenueDesigner";

// Interfaces for data types
interface DecorVendor {
  id: string;
  name: string;
  category: string;
  email: string;
  website?: string;
  companyWebsite?: string;
  address?: string;
  description?: string;
  priceRange?: string;
  rating?: number;
  itemImages: VendorItemImage[];
  costBreakdown: VendorCostItem[];
  totalBudget: number;
  createdAt?: string;
}

interface VendorItemImage {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  description: string;
  category: string;
}

interface VendorCostItem {
  id: string;
  itemName: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  category: string;
}
interface FloorPlanElement {
  id: string;
  type: 'table' | 'chair' | 'stage' | 'bar' | 'dance-floor' | 'entrance' | 'buffet' | 'decoration';
  shape: 'rectangle' | 'circle' | 'triangle';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  label: string;
  capacity?: number;
}

interface Object3D {
  id: string;
  type: 'table' | 'chair' | 'stage' | 'wall' | 'decoration' | 'lighting';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  material: string;
}

interface VenueImage {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  description: string;
}

export default function EnhancedDecorAgent() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("colors");
  const { toast } = useToast();
  
  // State for all tabs
  const [generatedColors, setGeneratedColors] = useState<string[]>([]);
  const [generatedThemes, setGeneratedThemes] = useState<any[]>([]);
  const [decorPlans, setDecorPlans] = useState<any[]>([]);
  const [floorPlanElements, setFloorPlanElements] = useState<FloorPlanElement[]>([]);
  const [objects3D, setObjects3D] = useState<Object3D[]>([]);
  const [venueImages, setVenueImages] = useState<VenueImage[]>([]);
  const [decorVendors, setDecorVendors] = useState<DecorVendor[]>([]);
  
  // Vendor management state
  const [showAddVendorDialog, setShowAddVendorDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [newVendor, setNewVendor] = useState({
    name: '',
    category: '',
    email: '',
    website: '',
    companyWebsite: '',
    description: '',
    priceRange: ''
  });
  const [newCostItem, setNewCostItem] = useState({
    itemName: '',
    description: '',
    category: '',
    quantity: 1,
    unitCost: 0
  });
  
  // 2D Editor state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [undoStack, setUndoStack] = useState<FloorPlanElement[][]>([]);
  const [redoStack, setRedoStack] = useState<FloorPlanElement[][]>([]);
  
  // 3D Designer state
  const [camera3D, setCamera3D] = useState({
    position: { x: 0, y: 5, z: 10 },
    rotation: { x: -0.3, y: 0, z: 0 }
  });
  const [lighting3D, setLighting3D] = useState({
    ambient: { color: "#ffffff", intensity: 0.4 },
    directional: { color: "#ffffff", intensity: 0.8, position: { x: 10, y: 10, z: 5 } }
  });
  const [selected3DObject, setSelected3DObject] = useState<string | null>(null);
  
  // File upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock event data for demo
  const eventData = {
    id: "demo-event-123",
    name: "Elegant Anniversary Celebration",
    type: "anniversary",
    guestCount: 150,
    budget: 25000,
    venue: "Grand Ballroom",
    theme: "Romantic Elegance"
  };

  // Element types for 2D designer
  const ELEMENT_TYPES = [
    { type: 'table', label: 'Round Table', color: '#8B4513', icon: Circle, defaultSize: { width: 60, height: 60 } },
    { type: 'chair', label: 'Chair', color: '#654321', icon: Square, defaultSize: { width: 20, height: 20 } },
    { type: 'stage', label: 'Stage', color: '#4B0082', icon: Triangle, defaultSize: { width: 100, height: 60 } },
    { type: 'bar', label: 'Bar', color: '#2F4F4F', icon: Square, defaultSize: { width: 80, height: 40 } },
    { type: 'dance-floor', label: 'Dance Floor', color: '#FF6347', icon: Circle, defaultSize: { width: 80, height: 80 } },
    { type: 'entrance', label: 'Entrance', color: '#228B22', icon: Square, defaultSize: { width: 40, height: 60 } },
    { type: 'buffet', label: 'Buffet', color: '#DAA520', icon: Square, defaultSize: { width: 120, height: 40 } },
    { type: 'decoration', label: 'Decoration', color: '#FF69B4', icon: Star, defaultSize: { width: 30, height: 30 } }
  ];

  // Object types for 3D designer
  const OBJECT_3D_TYPES = [
    { type: 'table', label: 'Round Table', color: '#8B4513', defaultScale: { x: 1, y: 0.1, z: 1 } },
    { type: 'chair', label: 'Chair', color: '#654321', defaultScale: { x: 0.4, y: 0.8, z: 0.4 } },
    { type: 'stage', label: 'Stage', color: '#4B0082', defaultScale: { x: 3, y: 0.3, z: 2 } },
    { type: 'wall', label: 'Wall', color: '#F5F5DC', defaultScale: { x: 3, y: 2.5, z: 0.1 } },
    { type: 'decoration', label: 'Decoration', color: '#FF69B4', defaultScale: { x: 0.5, y: 0.5, z: 0.5 } },
    { type: 'lighting', label: 'Light', color: '#FFD700', defaultScale: { x: 0.2, y: 0.2, z: 0.2 } }
  ];

  // Generate burgundy-based color palettes
  const generateColorPalette = () => {
    const burgundyPalettes = [
      ["#800020", "#F5F5DC", "#FFD700", "#2F4F4F"],
      ["#8B0000", "#FFF8DC", "#DAA520", "#4B0082"],
      ["#722F37", "#F0E68C", "#B8860B", "#483D8B"],
      ["#800020", "#FFFACD", "#CD853F", "#6A5ACD"],
      ["#330311", "#F8F8FF", "#C0C0C0", "#4169E1"],
      ["#8B1538", "#FFFAF0", "#DDA0DD", "#2E8B57"]
    ];
    
    const randomPalette = burgundyPalettes[Math.floor(Math.random() * burgundyPalettes.length)];
    setGeneratedColors(randomPalette);
    
    toast({
      title: "Color Palette Generated",
      description: "New color palette ready for your event design",
    });
  };

  // Generate venue themes
  const generateVenueThemes = () => {
    const themes = [
      {
        id: '1',
        name: 'Romantic Elegance',
        description: 'Soft lighting, flowing fabrics, and warm burgundy accents',
        colors: ['#8B1538', '#F8F8FF', '#DDA0DD'],
        style: 'elegant',
        mood: 'romantic'
      },
      {
        id: '2',
        name: 'Modern Sophistication',
        description: 'Clean lines, geometric patterns, and rich burgundy tones',
        colors: ['#330311', '#C0C0C0', '#4169E1'],
        style: 'modern',
        mood: 'sophisticated'
      },
      {
        id: '3',
        name: 'Garden Romance',
        description: 'Natural elements with burgundy florals and gold accents',
        colors: ['#800020', '#F5F5DC', '#FFD700'],
        style: 'garden',
        mood: 'romantic'
      }
    ];
    
    setGeneratedThemes(themes);
    
    toast({
      title: "Venue Themes Generated",
      description: "Creative themes ready for your venue design",
    });
  };

  // Generate decor plans
  const generateDecorPlans = () => {
    const plans = [
      {
        id: '1',
        name: 'Grand Celebration Plan',
        description: 'Complete decor package with centerpieces, lighting, and linens',
        budget: '$8,500',
        items: ['Centerpieces', 'Table Linens', 'Ambient Lighting', 'Floral Arrangements'],
        theme: 'Romantic Elegance'
      },
      {
        id: '2',
        name: 'Essential Elegance Plan',
        description: 'Core decor elements for sophisticated styling',
        budget: '$5,200',
        items: ['Basic Centerpieces', 'Uplighting', 'Ceremony Arch'],
        theme: 'Modern Sophistication'
      }
    ];
    
    setDecorPlans(plans);
    
    toast({
      title: "Decor Plans Generated",
      description: "Comprehensive decor plans created for your event",
    });
  };

  // Helper functions for 2D Floor Plan
  const addElement = (type: string) => {
    const elementType = ELEMENT_TYPES.find(et => et.type === type);
    if (!elementType) return;

    // Save current state to undo stack
    setUndoStack(prev => [...prev, floorPlanElements]);
    setRedoStack([]);

    const newElement: FloorPlanElement = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      shape: type === 'table' || type === 'dance-floor' ? 'circle' : 'rectangle',
      x: 100,
      y: 100,
      width: elementType.defaultSize.width,
      height: elementType.defaultSize.height,
      rotation: 0,
      color: elementType.color,
      label: elementType.label,
      capacity: type === 'table' ? 8 : undefined
    };

    setFloorPlanElements(prev => [...prev, newElement]);
  };

  const deleteElement = (id: string) => {
    setUndoStack(prev => [...prev, floorPlanElements]);
    setRedoStack([]);
    setFloorPlanElements(prev => prev.filter(el => el.id !== id));
    setSelectedElement(null);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [floorPlanElements, ...prev]);
    setUndoStack(prev => prev.slice(0, -1));
    setFloorPlanElements(previousState);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    
    const nextState = redoStack[0];
    setUndoStack(prev => [...prev, floorPlanElements]);
    setRedoStack(prev => prev.slice(1));
    setFloorPlanElements(nextState);
  };

  const exportFloorPlan = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create download link
    const link = document.createElement('a');
    link.download = `floor-plan-${eventData.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL();
    link.click();

    toast({
      title: "Floor Plan Exported",
      description: "Floor plan saved as PNG image",
    });
  };

  // Helper functions for 3D Designer
  const add3DObject = (type: string) => {
    const objectType = OBJECT_3D_TYPES.find(ot => ot.type === type);
    if (!objectType) return;

    const newObject: Object3D = {
      id: `${type}-3d-${Date.now()}`,
      type: type as any,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: objectType.defaultScale,
      color: objectType.color,
      material: 'wood'
    };

    setObjects3D(prev => [...prev, newObject]);
  };

  const delete3DObject = (id: string) => {
    setObjects3D(prev => prev.filter(obj => obj.id !== id));
    setSelected3DObject(null);
  };

  const reset3DCamera = () => {
    setCamera3D({
      position: { x: 0, y: 5, z: 10 },
      rotation: { x: -0.3, y: 0, z: 0 }
    });
  };

  const snapshot3D = () => {
    // In a real implementation, this would capture the 3D scene
    toast({
      title: "3D Snapshot Captured",
      description: "Scene snapshot saved for decor plan attachment",
    });
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        // In real implementation, upload to server
        const mockImage: VenueImage = {
          id: `img-${Date.now()}-${Math.random()}`,
          filename: `${Date.now()}-${file.name}`,
          originalName: file.name,
          filePath: URL.createObjectURL(file), // Mock path
          description: ''
        };
        
        setVenueImages(prev => [...prev, mockImage]);
      }

      toast({
        title: "Images Uploaded",
        description: `${files.length} image(s) uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteVenueImage = (id: string) => {
    setVenueImages(prev => prev.filter(img => img.id !== id));
  };

  // Generate floor plan elements
  const generateFloorPlan = () => {
    const tables = Math.ceil(eventData.guestCount / 8);
    const elements: FloorPlanElement[] = [];
    
    // Add tables in grid pattern
    for (let i = 0; i < tables; i++) {
      elements.push({
        id: `table-${i}`,
        type: 'table',
        shape: 'circle',
        x: (i % 5) * 120 + 100,
        y: Math.floor(i / 5) * 100 + 100,
        width: 60,
        height: 60,
        rotation: 0,
        color: '#8B4513',
        label: `Table ${i + 1}`,
        capacity: 8
      });
    }
    
    // Add stage
    elements.push({
      id: 'stage',
      type: 'stage',
      shape: 'rectangle',
      x: 350,
      y: 50,
      width: 100,
      height: 60,
      rotation: 0,
      color: '#4B0082',
      label: 'Main Stage'
    });
    
    // Add dance floor
    elements.push({
      id: 'dance-floor',
      type: 'dance-floor',
      shape: 'circle',
      x: 350,
      y: 150,
      width: 80,
      height: 80,
      rotation: 0,
      color: '#FF6347',
      label: 'Dance Floor'
    });

    setFloorPlanElements(elements);
    
    toast({
      title: "Floor Plan Generated",
      description: "Automatic layout created based on guest count",
    });
  };

  // Canvas drawing effect for 2D floor plan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw floor plan elements
    floorPlanElements.forEach(element => {
      ctx.save();
      
      // Translate to element position
      ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
      ctx.rotate((element.rotation * Math.PI) / 180);
      
      // Set fill color
      ctx.fillStyle = element.color;
      ctx.strokeStyle = selectedElement === element.id ? '#330311' : '#000000';
      ctx.lineWidth = selectedElement === element.id ? 3 : 1;
      
      // Draw shape
      if (element.shape === 'circle') {
        ctx.beginPath();
        ctx.ellipse(0, 0, element.width / 2, element.height / 2, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(-element.width / 2, -element.height / 2, element.width, element.height);
        ctx.strokeRect(-element.width / 2, -element.height / 2, element.width, element.height);
      }
      
      // Draw label
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(element.label, 0, 4);
      
      ctx.restore();
    });
  }, [floorPlanElements, selectedElement, showGrid]);

  // Canvas click handler for element selection
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked element
    const clickedElement = floorPlanElements.find(element => {
      return x >= element.x && x <= element.x + element.width &&
             y >= element.y && y <= element.y + element.height;
    });

    setSelectedElement(clickedElement ? clickedElement.id : null);
  };

  // Vendor Management functions
  const addVendor = () => {
    if (!newVendor.name || !newVendor.category || !newVendor.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in vendor name, category, and email.",
        variant: "destructive"
      });
      return;
    }

    const vendor: DecorVendor = {
      id: Math.random().toString(36),
      name: newVendor.name,
      category: newVendor.category,
      email: newVendor.email,
      website: newVendor.website,
      companyWebsite: newVendor.companyWebsite,
      description: newVendor.description,
      priceRange: newVendor.priceRange,
      itemImages: [],
      costBreakdown: [],
      totalBudget: 0,
      createdAt: new Date().toISOString()
    };

    setDecorVendors(prev => [...prev, vendor]);
    setNewVendor({
      name: '',
      category: '',
      email: '',
      website: '',
      companyWebsite: '',
      description: '',
      priceRange: ''
    });
    setShowAddVendorDialog(false);

    toast({
      title: "Vendor Added",
      description: `${vendor.name} has been added to your vendor database.`,
    });
  };

  const deleteVendor = (vendorId: string) => {
    setDecorVendors(prev => prev.filter(v => v.id !== vendorId));
    toast({
      title: "Vendor Removed",
      description: "Vendor has been removed from your database.",
    });
  };

  const addCostItem = () => {
    if (!selectedVendorId || !newCostItem.itemName || !newCostItem.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in item name and category.",
        variant: "destructive"
      });
      return;
    }

    const costItem: VendorCostItem = {
      id: Math.random().toString(36),
      itemName: newCostItem.itemName,
      description: newCostItem.description,
      category: newCostItem.category,
      quantity: newCostItem.quantity,
      unitCost: newCostItem.unitCost,
      totalCost: newCostItem.quantity * newCostItem.unitCost
    };

    setDecorVendors(prev => prev.map(vendor => {
      if (vendor.id === selectedVendorId) {
        const updatedCostBreakdown = [...vendor.costBreakdown, costItem];
        const newTotalBudget = updatedCostBreakdown.reduce((sum, item) => sum + item.totalCost, 0);
        return {
          ...vendor,
          costBreakdown: updatedCostBreakdown,
          totalBudget: newTotalBudget
        };
      }
      return vendor;
    }));

    setNewCostItem({
      itemName: '',
      description: '',
      category: '',
      quantity: 1,
      unitCost: 0
    });
    setShowAddItemDialog(false);

    toast({
      title: "Cost Item Added",
      description: `${costItem.itemName} has been added to vendor's cost breakdown.`,
    });
  };

  const deleteCostItem = (vendorId: string, itemId: string) => {
    setDecorVendors(prev => prev.map(vendor => {
      if (vendor.id === vendorId) {
        const updatedCostBreakdown = vendor.costBreakdown.filter(item => item.id !== itemId);
        const newTotalBudget = updatedCostBreakdown.reduce((sum, item) => sum + item.totalCost, 0);
        return {
          ...vendor,
          costBreakdown: updatedCostBreakdown,
          totalBudget: newTotalBudget
        };
      }
      return vendor;
    }));

    toast({
      title: "Cost Item Removed",
      description: "Item has been removed from vendor's cost breakdown.",
    });
  };

  const getTotalDecorBudget = () => {
    return decorVendors.reduce((total, vendor) => total + vendor.totalBudget, 0);
  };

  // Venue image management functions  
  const handleVenueImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const newImage: VenueImage = {
              id: Math.random().toString(36),
              filename: file.name,
              originalName: file.name,
              filePath: e.target?.result as string,
              description: ''
            };
            setVenueImages(prev => [...prev, newImage]);
          };
          reader.readAsDataURL(file);
        }
      });
      
      toast({
        title: "Images Uploaded",
        description: `${files.length} image(s) uploaded successfully to your venue gallery.`,
      });
    }
  };

  // Note: deleteVenueImage function is defined earlier at line 448

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/planner-dashboard")}
              className="text-white"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Decor Agent</h1>
              <p className="text-white/80">Agent-Powered Event Design Suite</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-[#8B1538] text-white border-none">
            {eventData.name}
          </Badge>
        </div>

        {/* Enhanced Tab Navigation - All Six Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-black/40 backdrop-blur-md border border-white/20 p-1 gap-1 h-auto">
            <TabsTrigger 
              value="colors" 
              className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/70 px-3 py-2 text-sm font-medium whitespace-nowrap"
              data-testid="tab-colors"
            >
              <Palette className="h-4 w-4 mr-2" />
              Color Palettes
            </TabsTrigger>
            <TabsTrigger 
              value="themes" 
              className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/70 px-3 py-2 text-sm font-medium whitespace-nowrap"
              data-testid="tab-themes"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Venue Themes
            </TabsTrigger>
            <TabsTrigger 
              value="plans" 
              className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/70 px-3 py-2 text-sm font-medium whitespace-nowrap"
              data-testid="tab-plans"
            >
              <Layout className="h-4 w-4 mr-2" />
              Decor Plans
            </TabsTrigger>
            <TabsTrigger 
              value="comprehensive-designer" 
              className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/70 px-3 py-2 text-sm font-medium whitespace-nowrap"
              data-testid="tab-comprehensive-designer"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Venue Generator
            </TabsTrigger>
            <TabsTrigger 
              value="2d-plan" 
              className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/70 px-3 py-2 text-sm font-medium whitespace-nowrap"
              data-testid="tab-2d-plan"
            >
              <Grid className="h-4 w-4 mr-2" />
              2D Floor Plan
            </TabsTrigger>
            <TabsTrigger 
              value="3d-designer" 
              className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/70 px-3 py-2 text-sm font-medium whitespace-nowrap"
              data-testid="tab-3d-designer"
            >
              <Box className="h-4 w-4 mr-2" />
              3D Designer
            </TabsTrigger>
            <TabsTrigger 
              value="vendor-management" 
              className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/70 px-3 py-2 text-sm font-medium whitespace-nowrap"
              data-testid="tab-vendor-management"
            >
              <Users className="h-4 w-4 mr-2" />
              Vendor Management
            </TabsTrigger>
          </TabsList>

          {/* Color Palettes Tab */}
          <TabsContent value="colors" className="space-y-6">
            <Card className="bg-black/40 backdrop-blur-md border border-white/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Palette className="h-5 w-5 text-[#8B1538]" />
                  Agent Color Palette Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <Button 
                    onClick={generateColorPalette}
                    className="bg-[#8B1538] text-white"
                    data-testid="button-generate-colors"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Palette
                  </Button>
                </div>
                
                {generatedColors.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-white font-semibold">Generated Color Palette:</h3>
                    <div className="flex gap-4">
                      {generatedColors.map((color, index) => (
                        <div key={index} className="text-center">
                          <div 
                            className="w-20 h-20 rounded-lg border-2 border-white/30 mb-2"
                            style={{ backgroundColor: color }}
                          />
                          <p className="text-white text-sm font-mono">{color}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Venue Themes Tab */}
          <TabsContent value="themes" className="space-y-6">
            <Card className="bg-black/40 backdrop-blur-md border border-white/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#8B1538]" />
                  Agent Venue Theme Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <Button 
                    onClick={generateVenueThemes}
                    className="bg-[#8B1538] text-white"
                    data-testid="button-generate-themes"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Themes
                  </Button>
                </div>
                
                {generatedThemes.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {generatedThemes.map((theme) => (
                      <Card key={theme.id} className="bg-white/10 border-white/20">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-white text-lg">{theme.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-white/80 text-sm">{theme.description}</p>
                          <div className="flex gap-2">
                            {theme.colors.map((color: string, index: number) => (
                              <div
                                key={index}
                                className="w-6 h-6 rounded border border-white/30"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {theme.style}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {theme.mood}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Decor Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <Card className="bg-black/40 backdrop-blur-md border border-white/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Layout className="h-5 w-5 text-[#8B1538]" />
                  Comprehensive Decor Plans
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <Button 
                    onClick={generateDecorPlans}
                    className="bg-[#8B1538] text-white"
                    data-testid="button-generate-plans"
                  >
                    <Layout className="h-4 w-4 mr-2" />
                    Generate Plans
                  </Button>
                </div>
                
                {decorPlans.length > 0 && (
                  <div className="space-y-4">
                    {decorPlans.map((plan) => (
                      <Card key={plan.id} className="bg-white/10 border-white/20">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-white">{plan.name}</CardTitle>
                            <Badge variant="secondary" className="bg-green-600 text-white">
                              {plan.budget}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-white/80">{plan.description}</p>
                          <div className="space-y-2">
                            <h4 className="text-white font-medium">Included Items:</h4>
                            <div className="flex flex-wrap gap-2">
                              {plan.items.map((item: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-white border-white/30">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" className="bg-[#8B1538] text-white">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button size="sm" variant="outline" className="text-white border-white/30">
                              <Download className="h-4 w-4 mr-2" />
                              Export Plan
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2D Floor Plan Tab */}
          <TabsContent value="2d-plan" className="space-y-6">
            <Card className="bg-black/40 backdrop-blur-md border border-white/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Grid className="h-5 w-5 text-[#8B1538]" />
                  2D Floor Plan Designer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Toolbar */}
                <div className="flex flex-wrap gap-2 p-4 bg-white/10 rounded-lg border border-white/20">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={undo}
                      disabled={undoStack.length === 0}
                      className="text-white border-white/30"
                      data-testid="button-undo"
                    >
                      <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={redo}
                      disabled={redoStack.length === 0}
                      className="text-white border-white/30"
                      data-testid="button-redo"
                    >
                      <Redo className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
                      className="text-white border-white/30"
                      data-testid="button-zoom-in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
                      className="text-white border-white/30"
                      data-testid="button-zoom-out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setZoom(1)}
                      className="text-white border-white/30"
                      data-testid="button-fit-screen"
                    >
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={exportFloorPlan}
                      className="bg-[#8B1538] text-white"
                      data-testid="button-export-floor-plan"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export PNG
                    </Button>
                    <Button
                      size="sm"
                      onClick={generateFloorPlan}
                      className="bg-green-600 text-white"
                      data-testid="button-generate-floor-plan"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Auto Generate
                    </Button>
                  </div>
                </div>

                {/* Element Palette */}
                <div className="space-y-3">
                  <h3 className="text-white font-medium">Add Elements:</h3>
                  <div className="flex flex-wrap gap-2">
                    {ELEMENT_TYPES.map((elementType) => (
                      <Button
                        key={elementType.type}
                        size="sm"
                        variant="outline"
                        onClick={() => addElement(elementType.type)}
                        className="text-white border-white/30"
                        data-testid={`button-add-${elementType.type}`}
                      >
                        <elementType.icon className="h-4 w-4 mr-2" />
                        {elementType.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Canvas Area */}
                <div className="relative border border-white/30 rounded-lg overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    onClick={handleCanvasClick}
                    className="block cursor-crosshair"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                  />
                </div>

                {/* Properties Panel */}
                {selectedElement && (
                  <Card className="bg-white/10 border-white/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-lg">Element Properties</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white">Selected: {selectedElement}</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteElement(selectedElement)}
                          data-testid="button-delete-element"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {floorPlanElements.length === 0 && (
                  <Card className="bg-white/10 border-white/20">
                    <CardContent className="text-center py-8">
                      <Grid className="h-12 w-12 mx-auto text-white/50 mb-4" />
                      <h3 className="text-white font-medium mb-2">Start Your Floor Plan</h3>
                      <p className="text-white/70 text-sm mb-4">
                        Add elements to create your venue layout, or use Auto Generate for a starter template.
                      </p>
                      <Button
                        onClick={generateFloorPlan}
                        className="bg-[#8B1538] text-white"
                        data-testid="button-start-floor-plan"
                      >
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate Template
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3D Designer Tab */}
          <TabsContent value="3d-designer" className="space-y-6">
            <Card className="bg-black/40 backdrop-blur-md border border-white/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Box className="h-5 w-5 text-[#8B1538]" />
                  3D Venue Designer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 3D Controls */}
                <div className="flex flex-wrap gap-2 p-4 bg-white/10 rounded-lg border border-white/20">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={reset3DCamera}
                      className="text-white border-white/30"
                      data-testid="button-reset-camera"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset Camera
                    </Button>
                    <Button
                      size="sm"
                      onClick={snapshot3D}
                      className="bg-[#8B1538] text-white"
                      data-testid="button-snapshot-3d"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Snapshot PNG
                    </Button>
                  </div>
                </div>

                {/* 3D Object Palette */}
                <div className="space-y-3">
                  <h3 className="text-white font-medium">Add 3D Objects:</h3>
                  <div className="flex flex-wrap gap-2">
                    {OBJECT_3D_TYPES.map((objectType) => (
                      <Button
                        key={objectType.type}
                        size="sm"
                        variant="outline"
                        onClick={() => add3DObject(objectType.type)}
                        className="text-white border-white/30"
                        data-testid={`button-add-3d-${objectType.type}`}
                      >
                        <Box className="h-4 w-4 mr-2" />
                        {objectType.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 3D Viewport */}
                <div className="h-96 bg-gradient-to-b from-blue-900 to-blue-600 border border-white/30 rounded-lg relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Box className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-medium mb-2">3D Venue Designer</h3>
                      <p className="text-white/70">Add objects and design your 3D venue layout</p>
                    </div>
                  </div>
                  
                  {/* 3D Objects Display */}
                  <div className="absolute bottom-4 left-4 space-y-2">
                    {objects3D.map((obj) => (
                      <div
                        key={obj.id}
                        className={`p-2 bg-black/40 backdrop-blur-md rounded border ${
                          selected3DObject === obj.id ? 'border-[#8B1538]' : 'border-white/30'
                        } cursor-pointer`}
                        onClick={() => setSelected3DObject(obj.id)}
                        data-testid={`object-3d-${obj.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: obj.color }}
                          />
                          <span className="text-white text-sm">{obj.type}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              delete3DObject(obj.id);
                            }}
                            className="h-6 w-6 p-0 text-white"
                            data-testid={`button-delete-3d-${obj.id}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {objects3D.length === 0 && (
                  <Card className="bg-white/10 border-white/20">
                    <CardContent className="text-center py-8">
                      <Box className="h-12 w-12 mx-auto text-white/50 mb-4" />
                      <h3 className="text-white font-medium mb-2">Start Your 3D Design</h3>
                      <p className="text-white/70 text-sm mb-4">
                        Add 3D objects to create your venue design. Use orbit controls to navigate the scene.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Venue Upload Tab */}
          <TabsContent value="venue-upload" className="space-y-6">
            <Card className="bg-black/40 backdrop-blur-md border border-white/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Upload className="h-5 w-5 text-[#8B1538]" />
                  Venue Reference Images
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Area */}
                <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="h-12 w-12 mx-auto text-white/50 mb-4" />
                  <h3 className="text-white font-medium mb-2">Upload Venue Images</h3>
                  <p className="text-white/70 text-sm mb-4">
                    Upload reference images for 2D and 3D designers to use
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-[#8B1538] text-white"
                    data-testid="button-upload-images"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Images
                      </>
                    )}
                  </Button>
                </div>

                {/* Image Gallery */}
                {venueImages.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-white font-medium">Uploaded Images:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {venueImages.map((image) => (
                        <Card key={image.id} className="bg-white/10 border-white/20 overflow-hidden">
                          <div className="aspect-square relative">
                            <img
                              src={image.filePath}
                              alt={image.originalName}
                              className="w-full h-full object-cover"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteVenueImage(image.id)}
                              className="absolute top-2 right-2 h-6 w-6 p-0"
                              data-testid={`button-delete-image-${image.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="p-3">
                            <p className="text-white text-sm truncate" title={image.originalName}>
                              {image.originalName}
                            </p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {venueImages.length === 0 && (
                  <Card className="bg-white/10 border-white/20">
                    <CardContent className="text-center py-8">
                      <FileImage className="h-12 w-12 mx-auto text-white/50 mb-4" />
                      <h3 className="text-white font-medium mb-2">No Images Uploaded</h3>
                      <p className="text-white/70 text-sm">
                        Upload venue photos to help with 2D and 3D design planning
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendor Management Tab */}
          <TabsContent value="vendor-management" className="space-y-6">
            <Card className="bg-black/40 backdrop-blur-md border border-white/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="h-6 w-6" />
                      Decor Vendor Management
                    </CardTitle>
                    <p className="text-white/70 mt-2">
                      Manage decor vendors, track item costs, and calculate total decor budgets
                    </p>
                  </div>
                  <Dialog open={showAddVendorDialog} onOpenChange={setShowAddVendorDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#8B1538] text-white" data-testid="button-add-vendor">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Vendor
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#330311] border-[#8B1538] text-white">
                      <DialogHeader>
                        <DialogTitle className="text-white">Add New Decor Vendor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="vendor-name" className="text-white">Vendor Name *</Label>
                            <Input
                              id="vendor-name"
                              value={newVendor.name}
                              onChange={(e) => setNewVendor(prev => ({ ...prev, name: e.target.value }))}
                              className="bg-white/10 border-white/20 text-white"
                              placeholder="Enter vendor name"
                              data-testid="input-vendor-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="vendor-category" className="text-white">Category *</Label>
                            <Select value={newVendor.category} onValueChange={(value) => setNewVendor(prev => ({ ...prev, category: value }))}>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-vendor-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#330311] border-[#8B1538]">
                                <SelectItem value="florals">Florals</SelectItem>
                                <SelectItem value="furniture">Furniture</SelectItem>
                                <SelectItem value="lighting">Lighting</SelectItem>
                                <SelectItem value="linens">Linens</SelectItem>
                                <SelectItem value="centerpieces">Centerpieces</SelectItem>
                                <SelectItem value="draping">Draping</SelectItem>
                                <SelectItem value="props">Props & Decor</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="vendor-email" className="text-white">Email *</Label>
                            <Input
                              id="vendor-email"
                              type="email"
                              value={newVendor.email}
                              onChange={(e) => setNewVendor(prev => ({ ...prev, email: e.target.value }))}
                              className="bg-white/10 border-white/20 text-white"
                              placeholder="vendor@example.com"
                              data-testid="input-vendor-email"
                            />
                          </div>
                          <div>
                            <Label htmlFor="vendor-price-range" className="text-white">Price Range</Label>
                            <Select value={newVendor.priceRange} onValueChange={(value) => setNewVendor(prev => ({ ...prev, priceRange: value }))}>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-price-range">
                                <SelectValue placeholder="Select price range" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#330311] border-[#8B1538]">
                                <SelectItem value="budget">Budget ($)</SelectItem>
                                <SelectItem value="mid-range">Mid-Range ($$)</SelectItem>
                                <SelectItem value="premium">Premium ($$$)</SelectItem>
                                <SelectItem value="luxury">Luxury ($$$$)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="vendor-website" className="text-white">Website</Label>
                            <Input
                              id="vendor-website"
                              value={newVendor.website}
                              onChange={(e) => setNewVendor(prev => ({ ...prev, website: e.target.value }))}
                              className="bg-white/10 border-white/20 text-white"
                              placeholder="https://vendor-website.com"
                              data-testid="input-vendor-website"
                            />
                          </div>
                          <div>
                            <Label htmlFor="vendor-company-website" className="text-white">Company Website</Label>
                            <Input
                              id="vendor-company-website"
                              value={newVendor.companyWebsite}
                              onChange={(e) => setNewVendor(prev => ({ ...prev, companyWebsite: e.target.value }))}
                              className="bg-white/10 border-white/20 text-white"
                              placeholder="https://company.com"
                              data-testid="input-company-website"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="vendor-description" className="text-white">Description</Label>
                          <Textarea
                            id="vendor-description"
                            value={newVendor.description}
                            onChange={(e) => setNewVendor(prev => ({ ...prev, description: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white"
                            placeholder="Brief description of vendor services and specialties"
                            data-testid="textarea-vendor-description"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setShowAddVendorDialog(false)} data-testid="button-cancel-vendor">
                            Cancel
                          </Button>
                          <Button onClick={addVendor} className="bg-[#8B1538] text-white" data-testid="button-save-vendor">
                            Add Vendor
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Total Budget Summary */}
                <Card className="bg-[#8B1538]/20 border-[#8B1538]/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-white" />
                        <span className="text-white font-medium">Total Decor Budget</span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        ${getTotalDecorBudget().toFixed(2)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Vendors List */}
                {decorVendors.length > 0 ? (
                  <div className="grid gap-6">
                    {decorVendors.map((vendor) => (
                      <Card key={vendor.id} className="bg-white/10 border-white/20">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-white flex items-center gap-2">
                                {vendor.name}
                                <Badge variant="secondary" className="bg-[#8B1538] text-white">
                                  {vendor.category}
                                </Badge>
                              </CardTitle>
                              <div className="flex items-center gap-4 mt-2 text-sm text-white/70">
                                <span>{vendor.email}</span>
                                {vendor.website && (
                                  <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-white/70">
                                    <Link2 className="h-3 w-3" />
                                    Website
                                  </a>
                                )}
                                {vendor.companyWebsite && (
                                  <a href={vendor.companyWebsite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-white/70">
                                    <Link2 className="h-3 w-3" />
                                    Company
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-lg font-bold text-white">${vendor.totalBudget.toFixed(2)}</div>
                                <div className="text-sm text-white/70">{vendor.costBreakdown.length} items</div>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteVendor(vendor.id)}
                                data-testid={`button-delete-vendor-${vendor.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {vendor.description && (
                            <p className="text-white/80">{vendor.description}</p>
                          )}
                          
                          {/* Cost Breakdown */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-white font-medium">Cost Breakdown</h4>
                              <Dialog open={showAddItemDialog && selectedVendorId === vendor.id} onOpenChange={(open) => {
                                setShowAddItemDialog(open);
                                if (open) setSelectedVendorId(vendor.id);
                              }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" className="bg-[#8B1538] text-white" data-testid={`button-add-item-${vendor.id}`}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Item
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#330311] border-[#8B1538] text-white">
                                  <DialogHeader>
                                    <DialogTitle className="text-white">Add Cost Item - {vendor.name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor="item-name" className="text-white">Item Name *</Label>
                                        <Input
                                          id="item-name"
                                          value={newCostItem.itemName}
                                          onChange={(e) => setNewCostItem(prev => ({ ...prev, itemName: e.target.value }))}
                                          className="bg-white/10 border-white/20 text-white"
                                          placeholder="Enter item name"
                                          data-testid="input-item-name"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="item-category" className="text-white">Category *</Label>
                                        <Select value={newCostItem.category} onValueChange={(value) => setNewCostItem(prev => ({ ...prev, category: value }))}>
                                          <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-item-category">
                                            <SelectValue placeholder="Select category" />
                                          </SelectTrigger>
                                          <SelectContent className="bg-[#330311] border-[#8B1538]">
                                            <SelectItem value="florals">Florals</SelectItem>
                                            <SelectItem value="furniture">Furniture</SelectItem>
                                            <SelectItem value="lighting">Lighting</SelectItem>
                                            <SelectItem value="linens">Linens</SelectItem>
                                            <SelectItem value="centerpieces">Centerpieces</SelectItem>
                                            <SelectItem value="draping">Draping</SelectItem>
                                            <SelectItem value="props">Props & Decor</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                      <div>
                                        <Label htmlFor="item-quantity" className="text-white">Quantity</Label>
                                        <Input
                                          id="item-quantity"
                                          type="number"
                                          min="1"
                                          value={newCostItem.quantity}
                                          onChange={(e) => setNewCostItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                          className="bg-white/10 border-white/20 text-white"
                                          data-testid="input-item-quantity"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="item-unit-cost" className="text-white">Unit Cost ($)</Label>
                                        <Input
                                          id="item-unit-cost"
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={newCostItem.unitCost}
                                          onChange={(e) => setNewCostItem(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                                          className="bg-white/10 border-white/20 text-white"
                                          data-testid="input-unit-cost"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-white">Total Cost</Label>
                                        <div className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white">
                                          ${(newCostItem.quantity * newCostItem.unitCost).toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <Label htmlFor="item-description" className="text-white">Description</Label>
                                      <Textarea
                                        id="item-description"
                                        value={newCostItem.description}
                                        onChange={(e) => setNewCostItem(prev => ({ ...prev, description: e.target.value }))}
                                        className="bg-white/10 border-white/20 text-white"
                                        placeholder="Item description or specifications"
                                        data-testid="textarea-item-description"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4">
                                      <Button variant="outline" onClick={() => setShowAddItemDialog(false)} data-testid="button-cancel-item">
                                        Cancel
                                      </Button>
                                      <Button onClick={addCostItem} className="bg-[#8B1538] text-white" data-testid="button-save-item">
                                        Add Item
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                            
                            {vendor.costBreakdown.length > 0 ? (
                              <div className="space-y-2">
                                {vendor.costBreakdown.map((item) => (
                                  <div key={item.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-white font-medium">{item.itemName}</span>
                                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                                      </div>
                                      {item.description && (
                                        <p className="text-white/70 text-sm mt-1">{item.description}</p>
                                      )}
                                      <div className="flex items-center gap-4 text-sm text-white/60 mt-1">
                                        <span>Qty: {item.quantity}</span>
                                        <span>Unit: ${item.unitCost.toFixed(2)}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-right">
                                        <div className="text-white font-bold">${item.totalCost.toFixed(2)}</div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => deleteCostItem(vendor.id, item.id)}
                                        data-testid={`button-delete-item-${item.id}`}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-white/60">
                                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No cost items added yet</p>
                                <p className="text-sm">Add items to track vendor costs</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-white/10 border-white/20">
                    <CardContent className="text-center py-12">
                      <Users className="h-16 w-16 mx-auto text-white/50 mb-4" />
                      <h3 className="text-white text-xl font-semibold mb-2">No Vendors Added</h3>
                      <p className="text-white/70 mb-6">
                        Start building your decor vendor database to track costs and manage your event budget
                      </p>
                      <Button 
                        className="bg-[#8B1538] text-white"
                        onClick={() => setShowAddVendorDialog(true)}
                        data-testid="button-add-first-vendor"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Vendor
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comprehensive Venue Designer Tab */}
          <TabsContent value="comprehensive-designer" className="space-y-6">
            <div className="bg-white rounded-lg overflow-hidden shadow-xl">
              <ComprehensiveVenueDesigner />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}