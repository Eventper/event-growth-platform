import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Grid,
  Box, 
  Camera, 
  Download,
  Upload,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCw,
  Trash2,
  Plus,
  FileImage,
  X,
  Link2,
  Calculator,
  Edit,
  DollarSign,
  Square,
  Circle,
  Triangle,
  Users,
  Music,
  Lightbulb,
  Flower,
  Sparkles,
  Eye,
  MousePointer,
  StickyNote,
  Share2,
  FileText,
  Bot
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Asset types and interfaces
interface Asset {
  id: string;
  category: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z?: number;
  width: number;
  height: number;
  depth?: number;
  rotation: number;
  color: string;
  material?: string;
  cost: number;
  quantity: number;
  notes?: string;
}

interface FloorplanElement {
  id: string;
  type: 'rectangle' | 'polygon' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Array<{x: number, y: number}>;
  color: string;
  isRoom?: boolean;
}

interface BudgetItem {
  category: string;
  items: Array<{name: string, cost: number, quantity: number}>;
  total: number;
}

const ASSET_CATEGORIES = {
  seating: {
    name: "Seating",
    items: [
      { name: "Chiavari Chair - Gold", type: "chair", cost: 8.50, width: 40, height: 40, depth: 45 },
      { name: "Chiavari Chair - Silver", type: "chair", cost: 8.50, width: 40, height: 40, depth: 45 },
      { name: "Chiavari Chair - Burgundy", type: "chair", cost: 9.00, width: 40, height: 40, depth: 45 },
      { name: "Dior Chair - White", type: "chair", cost: 12.00, width: 45, height: 45, depth: 50 },
      { name: "Banquet Chair", type: "chair", cost: 6.50, width: 45, height: 45, depth: 50 },
      { name: "Lounge Sofa - 3 Seater", type: "sofa", cost: 85.00, width: 180, height: 80, depth: 90 },
      { name: "Cocktail Stool", type: "stool", cost: 7.50, width: 35, height: 35, depth: 35 }
    ]
  },
  tables: {
    name: "Tables",
    items: [
      { name: "Round Table - 60in", type: "table", cost: 18.00, width: 152, height: 152, depth: 75 },
      { name: "Round Table - 72in", type: "table", cost: 22.00, width: 183, height: 183, depth: 75 },
      { name: "Rectangular Table - 8ft", type: "table", cost: 20.00, width: 244, height: 76, depth: 75 },
      { name: "Cocktail Table - High", type: "table", cost: 15.00, width: 61, height: 61, depth: 110 },
      { name: "Sweetheart Table", type: "table", cost: 35.00, width: 122, height: 76, depth: 75 },
      { name: "Cake Table", type: "table", cost: 25.00, width: 91, height: 91, depth: 75 }
    ]
  },
  decor: {
    name: "Décor",
    items: [
      { name: "Tall Centerpiece", type: "centerpiece", cost: 75.00, width: 30, height: 30, depth: 60 },
      { name: "Low Centerpiece", type: "centerpiece", cost: 45.00, width: 40, height: 40, depth: 25 },
      { name: "Rose Arrangement", type: "flowers", cost: 65.00, width: 35, height: 35, depth: 30 },
      { name: "Vase - Crystal", type: "vase", cost: 15.00, width: 20, height: 20, depth: 25 },
      { name: "Candles - Pillar Set", type: "candles", cost: 12.00, width: 15, height: 15, depth: 20 },
      { name: "Charger Plate - Gold", type: "tableware", cost: 3.50, width: 33, height: 33, depth: 2 },
      { name: "Table Number", type: "signage", cost: 8.00, width: 10, height: 15, depth: 5 }
    ]
  },
  lighting: {
    name: "Lighting",
    items: [
      { name: "Crystal Chandelier", type: "chandelier", cost: 150.00, width: 100, height: 100, depth: 80 },
      { name: "Uplight - LED", type: "uplight", cost: 25.00, width: 20, height: 20, depth: 120 },
      { name: "Spotlight", type: "spotlight", cost: 35.00, width: 25, height: 25, depth: 30 },
      { name: "Fairy Lights - Strand", type: "fairy_lights", cost: 15.00, width: 1, height: 1, depth: 1 },
      { name: "Table Candles", type: "candles", cost: 8.00, width: 10, height: 10, depth: 15 },
      { name: "String Light Canopy", type: "canopy", cost: 85.00, width: 300, height: 300, depth: 20 }
    ]
  },
  drapes: {
    name: "Drapes & Fabrics",
    items: [
      { name: "Ceiling Drape - White", type: "drape", cost: 120.00, width: 300, height: 20, depth: 300 },
      { name: "Backdrop Drape", type: "backdrop", cost: 75.00, width: 300, height: 240, depth: 10 },
      { name: "Wall Drape", type: "drape", cost: 65.00, width: 300, height: 240, depth: 5 },
      { name: "Stage Skirt", type: "skirt", cost: 45.00, width: 400, height: 60, depth: 10 },
      { name: "Table Linen - Burgundy", type: "linen", cost: 18.00, width: 183, height: 183, depth: 2 },
      { name: "Chair Sash", type: "sash", cost: 4.50, width: 20, height: 200, depth: 1 }
    ]
  },
  staging: {
    name: "Staging",
    items: [
      { name: "Dance Floor - 12x12ft", type: "dance_floor", cost: 200.00, width: 366, height: 366, depth: 5 },
      { name: "Stage Platform", type: "platform", cost: 150.00, width: 244, height: 122, depth: 30 },
      { name: "DJ Booth", type: "dj_booth", cost: 125.00, width: 183, height: 122, depth: 75 },
      { name: "Runway", type: "runway", cost: 180.00, width: 600, height: 122, depth: 20 },
      { name: "Photo Booth Area", type: "photo_booth", cost: 85.00, width: 183, height: 183, depth: 30 },
      { name: "Bar Setup", type: "bar", cost: 165.00, width: 244, height: 61, depth: 90 }
    ]
  }
};

const COLORS = [
  { name: "Burgundy", value: "#330311", primary: true },
  { name: "White", value: "#FFFFFF" },
  { name: "Gold", value: "#FFD700" },
  { name: "Silver", value: "#C0C0C0" },
  { name: "Black", value: "#000000" },
  { name: "Ivory", value: "#FFFFF0" },
  { name: "Rose Gold", value: "#E8B4B8" },
  { name: "Navy", value: "#000080" },
  { name: "Emerald", value: "#50C878" },
  { name: "Blush", value: "#DE5D83" }
];

const CURRENCIES = [
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" }
];

export default function ComprehensiveVenueDesigner() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [selectedTool, setSelectedTool] = useState<'select' | 'rectangle' | 'polygon' | 'circle'>('select');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [floorplanElements, setFloorplanElements] = useState<FloorplanElement[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('seating');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize] = useState(20);
  const [zoom, setZoom] = useState(1);
  const [currency, setCurrency] = useState<string>('GBP');
  const [showBudgetPanel, setShowBudgetPanel] = useState(true);
  const [showAssetLibrary, setShowAssetLibrary] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  // Canvas drawing setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid if enabled
    if (snapToGrid) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    // Draw floorplan elements
    floorplanElements.forEach(element => {
      drawFloorplanElement(ctx, element);
    });

    // Draw assets
    assets.forEach(asset => {
      drawAsset(ctx, asset);
    });

    // Highlight selected asset
    if (selectedAsset) {
      drawAssetHighlight(ctx, selectedAsset);
    }
  }, [assets, floorplanElements, selectedAsset, snapToGrid, zoom]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawFloorplanElement = (ctx: CanvasRenderingContext2D, element: FloorplanElement) => {
    ctx.fillStyle = element.color;
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;

    switch (element.type) {
      case 'rectangle':
        ctx.fillRect(element.x, element.y, element.width, element.height);
        ctx.strokeRect(element.x, element.y, element.width, element.height);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(element.x + element.width/2, element.y + element.height/2, element.width/2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        break;
      case 'polygon':
        if (element.points && element.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          element.points.slice(1).forEach(point => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        break;
    }
  };

  const drawAsset = (ctx: CanvasRenderingContext2D, asset: Asset) => {
    ctx.save();
    ctx.translate(asset.x + asset.width/2, asset.y + asset.height/2);
    ctx.rotate((asset.rotation * Math.PI) / 180);
    ctx.translate(-asset.width/2, -asset.height/2);

    // Draw asset representation
    ctx.fillStyle = asset.color;
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;

    if (asset.type === 'table') {
      // Round table
      if (asset.name.includes('Round')) {
        ctx.beginPath();
        ctx.arc(asset.width/2, asset.height/2, asset.width/2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        // Rectangular table
        ctx.fillRect(0, 0, asset.width, asset.height);
        ctx.strokeRect(0, 0, asset.width, asset.height);
      }
    } else if (asset.type === 'chair') {
      // Draw chair as circle
      ctx.beginPath();
      ctx.arc(asset.width/2, asset.height/2, asset.width/2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else {
      // Default rectangle for other assets
      ctx.fillRect(0, 0, asset.width, asset.height);
      ctx.strokeRect(0, 0, asset.width, asset.height);
    }

    // Draw asset label
    ctx.fillStyle = '#000000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(asset.name.split(' ')[0], asset.width/2, asset.height/2);

    // Draw quantity badge if > 1
    if (asset.quantity > 1) {
      ctx.fillStyle = '#330311';
      ctx.fillRect(asset.width - 15, 0, 15, 15);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '8px Arial';
      ctx.fillText(asset.quantity.toString(), asset.width - 7.5, 10);
    }

    ctx.restore();
  };

  const drawAssetHighlight = (ctx: CanvasRenderingContext2D, asset: Asset) => {
    ctx.strokeStyle = '#330311';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(asset.x - 2, asset.y - 2, asset.width + 4, asset.height + 4);
    ctx.setLineDash([]);
  };

  const addAsset = (categoryKey: string, itemIndex: number) => {
    const category = ASSET_CATEGORIES[categoryKey as keyof typeof ASSET_CATEGORIES];
    const item = category.items[itemIndex];
    
    const newAsset: Asset = {
      id: Date.now().toString(),
      category: categoryKey,
      name: item.name,
      type: item.type,
      x: 100,
      y: 100,
      width: item.width,
      height: item.height,
      depth: item.depth,
      rotation: 0,
      color: COLORS[0].value,
      cost: item.cost,
      quantity: 1
    };

    setAssets(prev => [...prev, newAsset]);
    setSelectedAsset(newAsset);
  };

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    setAssets(prev => prev.map(asset => 
      asset.id === id ? { ...asset, ...updates } : asset
    ));
    if (selectedAsset && selectedAsset.id === id) {
      setSelectedAsset(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteAsset = (id: string) => {
    setAssets(prev => prev.filter(asset => asset.id !== id));
    if (selectedAsset && selectedAsset.id === id) {
      setSelectedAsset(null);
    }
  };

  const calculateBudget = (): BudgetItem[] => {
    const budgetByCategory: {[key: string]: BudgetItem} = {};
    
    Object.keys(ASSET_CATEGORIES).forEach(categoryKey => {
      const category = ASSET_CATEGORIES[categoryKey as keyof typeof ASSET_CATEGORIES];
      budgetByCategory[categoryKey] = {
        category: category.name,
        items: [],
        total: 0
      };
    });

    assets.forEach(asset => {
      const categoryBudget = budgetByCategory[asset.category];
      if (categoryBudget) {
        const existingItem = categoryBudget.items.find(item => item.name === asset.name);
        if (existingItem) {
          existingItem.quantity += asset.quantity;
        } else {
          categoryBudget.items.push({
            name: asset.name,
            cost: asset.cost,
            quantity: asset.quantity
          });
        }
        categoryBudget.total += asset.cost * asset.quantity;
      }
    });

    return Object.values(budgetByCategory).filter(cat => cat.items.length > 0);
  };

  const getTotalBudget = () => {
    return assets.reduce((total, asset) => total + (asset.cost * asset.quantity), 0);
  };

  const formatCurrency = (amount: number) => {
    const curr = CURRENCIES.find(c => c.code === currency);
    return `${curr?.symbol}${amount.toFixed(2)}`;
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    toast({
      title: "EP Designer Guru",
      description: "Analyzing your request and generating design...",
    });

    // Simulate processing
    setTimeout(() => {
      // Mock response - in real implementation, this would call an intelligence service
      const mockAssets: Asset[] = [
        {
          id: Date.now().toString() + '1',
          category: 'tables',
          name: 'Round Table - 60in',
          type: 'table',
          x: 200,
          y: 200,
          width: 152,
          height: 152,
          rotation: 0,
          color: '#FFFFFF',
          cost: 18.00,
          quantity: 8
        },
        {
          id: Date.now().toString() + '2',
          category: 'seating',
          name: 'Chiavari Chair - Gold',
          type: 'chair',
          x: 300,
          y: 300,
          width: 40,
          height: 40,
          rotation: 0,
          color: '#FFD700',
          cost: 8.50,
          quantity: 80
        }
      ];

      setAssets(prev => [...prev, ...mockAssets]);
      toast({
        title: "Design Generated!",
        description: "Your designed layout has been created based on your requirements.",
      });
      setAiPrompt("");
    }, 2000);
  };

  const exportToPDF = () => {
    toast({
      title: "Exporting Design",
      description: "Generating PDF with 2D layout, asset list, and costs...",
    });
    // Implementation would generate actual PDF
  };

  const generateShareLink = () => {
    const shareId = Date.now().toString();
    toast({
      title: "Share Link Created",
      description: `Share link: venue-design/${shareId} - Copied to clipboard!`,
    });
    // Implementation would generate actual shareable link
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Decor Agent
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Comprehensive Venue Designer</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}>
              {viewMode === '2d' ? <Box className="w-4 h-4 mr-2" /> : <Grid className="w-4 h-4 mr-2" />}
              {viewMode === '2d' ? '3D View' : '2D View'}
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={generateShareLink}>
              <Share2 className="w-4 h-4 mr-2" />
              Share Link
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Asset Library Panel */}
        {showAssetLibrary && (
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Asset Library</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAssetLibrary(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSET_CATEGORIES).map(([key, category]) => (
                    <SelectItem key={key} value={key}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 space-y-2">
              {ASSET_CATEGORIES[selectedCategory as keyof typeof ASSET_CATEGORIES]?.items.map((item, index) => (
                <Card key={index} className="p-3 cursor-pointer border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                      <p className="text-xs text-gray-500">{formatCurrency(item.cost)}</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => addAsset(selectedCategory, index)}
                      className="bg-burgundy-600 text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant={selectedTool === 'select' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTool('select')}
                >
                  <MousePointer className="w-4 h-4" />
                </Button>
                <Button
                  variant={selectedTool === 'rectangle' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTool('rectangle')}
                >
                  <Square className="w-4 h-4" />
                </Button>
                <Button
                  variant={selectedTool === 'polygon' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTool('polygon')}
                >
                  <Triangle className="w-4 h-4" />
                </Button>
                <Button
                  variant={selectedTool === 'circle' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTool('circle')}
                >
                  <Circle className="w-4 h-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="outline" size="sm">
                  <Undo className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Redo className="w-4 h-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="outline" size="sm" onClick={() => setZoom(prev => Math.max(0.25, prev - 0.25))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="sm" onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant={snapToGrid ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSnapToGrid(!snapToGrid)}
                >
                  <Grid className="w-4 h-4 mr-2" />
                  Snap to Grid
                </Button>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Plan
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden bg-gray-100">
            <canvas
              ref={canvasRef}
              width={1200}
              height={800}
              className="absolute inset-0 cursor-crosshair"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
              onClick={(e) => {
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) return;
                
                const x = (e.clientX - rect.left) / zoom;
                const y = (e.clientY - rect.top) / zoom;
                
                // Handle tool actions
                if (selectedTool === 'rectangle') {
                  const newElement: FloorplanElement = {
                    id: Date.now().toString(),
                    type: 'rectangle',
                    x: snapToGrid ? Math.round(x / gridSize) * gridSize : x,
                    y: snapToGrid ? Math.round(y / gridSize) * gridSize : y,
                    width: 100,
                    height: 100,
                    color: '#F3F4F6'
                  };
                  setFloorplanElements(prev => [...prev, newElement]);
                }
              }}
            />

            {/* 3D View Overlay */}
            {viewMode === '3d' && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                  <Box className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">3D Visualization Mode</h3>
                  <p className="text-gray-400 mb-4">Navigate your design in immersive 3D</p>
                  <div className="flex space-x-2 justify-center">
                    <Button variant="outline" size="sm">
                      <Camera className="w-4 h-4 mr-2" />
                      Walkthrough
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Bird's Eye
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Properties & Budget */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <Tabs defaultValue="properties" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="ai">Agent Guru</TabsTrigger>
            </TabsList>

            {/* Properties Tab */}
            <TabsContent value="properties" className="p-4 space-y-4">
              {selectedAsset ? (
                <>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">{selectedAsset.name}</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <Label>Position</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            value={selectedAsset.x}
                            onChange={(e) => updateAsset(selectedAsset.id, { x: Number(e.target.value) })}
                            placeholder="X"
                          />
                          <Input
                            type="number"
                            value={selectedAsset.y}
                            onChange={(e) => updateAsset(selectedAsset.id, { y: Number(e.target.value) })}
                            placeholder="Y"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Size</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            value={selectedAsset.width}
                            onChange={(e) => updateAsset(selectedAsset.id, { width: Number(e.target.value) })}
                            placeholder="Width"
                          />
                          <Input
                            type="number"
                            value={selectedAsset.height}
                            onChange={(e) => updateAsset(selectedAsset.id, { height: Number(e.target.value) })}
                            placeholder="Height"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Rotation</Label>
                        <Input
                          type="number"
                          min="0"
                          max="360"
                          value={selectedAsset.rotation}
                          onChange={(e) => updateAsset(selectedAsset.id, { rotation: Number(e.target.value) })}
                        />
                      </div>

                      <div>
                        <Label>Color</Label>
                        <div className="grid grid-cols-5 gap-2 mt-2">
                          {COLORS.map((color) => (
                            <button
                              key={color.value}
                              className={`w-8 h-8 rounded border-2 ${selectedAsset.color === color.value ? 'border-gray-900' : 'border-gray-300'}`}
                              style={{ backgroundColor: color.value }}
                              onClick={() => updateAsset(selectedAsset.id, { color: color.value })}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={selectedAsset.quantity}
                          onChange={(e) => updateAsset(selectedAsset.id, { quantity: Number(e.target.value) })}
                        />
                      </div>

                      <div>
                        <Label>Cost per Unit ({currency})</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={selectedAsset.cost}
                          onChange={(e) => updateAsset(selectedAsset.id, { cost: Number(e.target.value) })}
                        />
                      </div>

                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={selectedAsset.notes || ''}
                          onChange={(e) => updateAsset(selectedAsset.id, { notes: e.target.value })}
                          placeholder="Add notes for this asset..."
                          rows={3}
                        />
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteAsset(selectedAsset.id)}
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Asset
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <MousePointer className="w-8 h-8 mx-auto mb-2" />
                  <p>Select an asset to edit properties</p>
                </div>
              )}
            </TabsContent>

            {/* Budget Tab */}
            <TabsContent value="budget" className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Budget Overview</h4>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((curr) => (
                        <SelectItem key={curr.code} value={curr.code}>
                          {curr.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Card className="border-burgundy-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-burgundy-700">
                        {formatCurrency(getTotalBudget())}
                      </div>
                      <div className="text-sm text-gray-600">Total Budget</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  {calculateBudget().map((categoryBudget) => (
                    <Card key={categoryBudget.category} className="border-gray-200">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">{categoryBudget.category}</h5>
                          <span className="font-semibold text-burgundy-600">
                            {formatCurrency(categoryBudget.total)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {categoryBudget.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm text-gray-600">
                              <span>{item.name} × {item.quantity}</span>
                              <span>{formatCurrency(item.cost * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Agent Tab */}
            <TabsContent value="ai" className="p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center mb-3">
                    <Bot className="w-5 h-5 mr-2 text-burgundy-600" />
                    EP Designer Guru
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Describe your event and let the Agent generate the perfect layout
                  </p>
                </div>

                <div className="space-y-3">
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Design a 100-guest wedding with round tables, gold Chiavari chairs, chandelier lighting, burgundy & white theme..."
                    rows={4}
                  />
                  <Button 
                    onClick={handleAIGenerate}
                    className="w-full bg-burgundy-600 text-white"
                    disabled={!aiPrompt.trim()}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Design
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h5 className="font-medium text-gray-900">Quick Templates</h5>
                  {[
                    "Elegant wedding for 150 guests with burgundy theme",
                    "Corporate gala with modern staging and uplighting",
                    "Intimate birthday party with lounge seating",
                    "Garden wedding with natural lighting"
                  ].map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => setAiPrompt(template)}
                    >
                      {template}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}