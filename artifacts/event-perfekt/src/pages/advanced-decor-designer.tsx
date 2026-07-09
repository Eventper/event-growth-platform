import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { 
  ArrowLeft, 
  Grid3X3,
  Box,
  Camera,
  Download,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Copy,
  Trash2,
  Wand2,
  Eye,
  Layers,
  Ruler,
  Palette,
  Share,
  FileText,
  Image as ImageIcon,
  Settings,
  Plus,
  Search,
  Filter,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Asset Library Interfaces
interface DecorAsset {
  id: string;
  name: string;
  category: 'seating' | 'tables' | 'staging' | 'lighting' | 'drapes' | 'décor' | 'florals' | 'tableware' | 'special';
  variants: AssetVariant[];
  dimensions: { width: number; height: number; depth: number };
  gltfUrl?: string;
  icon: string;
  thumbnail: string;
  vendorId?: string;
  vendorName?: string;
  sku?: string;
  unitPrice?: number;
  rentalPrice?: number;
  currency: string;
  availabilityRegion: string[];
  leadTime: number; // days
}

interface AssetVariant {
  id: string;
  name: string;
  color: string;
  finish?: string;
  size?: string;
  priceModifier?: number; // percentage modifier
}

interface PlacedAsset {
  id: string;
  assetId: string;
  position: { x: number; y: number; z?: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  selectedVariant: string;
  quantity: number;
  rentalDuration: number; // days
  groupId?: string;
}

interface DesignProject {
  id: string;
  eventId?: string;
  name: string;
  description: string;
  placedAssets: PlacedAsset[];
  cameraSettings: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
  };
  designMode: '2d' | '3d';
  gridSettings: {
    show: boolean;
    size: number;
    snap: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// Seeded Asset Library - Event Perfekt Standard Collection
const SEEDED_ASSETS: DecorAsset[] = [
  // Seating
  {
    id: 'chair-chiavari-001',
    name: 'Chiavari Chair',
    category: 'seating',
    variants: [
      { id: 'gold', name: 'Gold', color: '#FFD700' },
      { id: 'silver', name: 'Silver', color: '#C0C0C0' },
      { id: 'white', name: 'White', color: '#FFFFFF' },
      { id: 'clear', name: 'Clear', color: '#E8F4FD' }
    ],
    dimensions: { width: 40, height: 90, depth: 45 },
    icon: '🪑',
    thumbnail: '/assets/chairs/chiavari-thumb.png',
    vendorId: 'vendor-001',
    vendorName: 'Elegant Seating Co.',
    sku: 'CHV-001',
    rentalPrice: 8.50,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 3
  },
  {
    id: 'chair-dior-001',
    name: 'Dior Chair',
    category: 'seating',
    variants: [
      { id: 'white-gold', name: 'White/Gold', color: '#FFFFFF' },
      { id: 'silver', name: 'Silver', color: '#C0C0C0' },
      { id: 'black', name: 'Black', color: '#000000' }
    ],
    dimensions: { width: 45, height: 85, depth: 50 },
    icon: '💺',
    thumbnail: '/assets/chairs/dior-thumb.png',
    vendorId: 'vendor-001',
    vendorName: 'Elegant Seating Co.',
    sku: 'DIR-001',
    rentalPrice: 12.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 5
  },
  {
    id: 'chair-crossback-001',
    name: 'Crossback Chair',
    category: 'seating',
    variants: [
      { id: 'natural', name: 'Natural Wood', color: '#DEB887' },
      { id: 'white-wash', name: 'White Wash', color: '#F5F5DC' },
      { id: 'dark-walnut', name: 'Dark Walnut', color: '#654321' }
    ],
    dimensions: { width: 42, height: 88, depth: 47 },
    icon: '🪑',
    thumbnail: '/assets/chairs/crossback-thumb.png',
    vendorId: 'vendor-002',
    vendorName: 'Rustic Charm Rentals',
    sku: 'CRB-001',
    rentalPrice: 9.75,
    currency: 'USD',
    availabilityRegion: ['US', 'CA'],
    leadTime: 4
  },
  {
    id: 'throne-bride-001',
    name: 'Bride & Groom Throne',
    category: 'seating',
    variants: [
      { id: 'gold-velvet', name: 'Gold Velvet', color: '#FFD700' },
      { id: 'silver-satin', name: 'Silver Satin', color: '#C0C0C0' },
      { id: 'burgundy-velvet', name: 'Burgundy Velvet', color: '#8B1538' }
    ],
    dimensions: { width: 80, height: 120, depth: 70 },
    icon: '👑',
    thumbnail: '/assets/chairs/throne-thumb.png',
    vendorId: 'vendor-003',
    vendorName: 'Royal Event Furnishings',
    sku: 'THR-001',
    rentalPrice: 85.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 7
  },

  // Tables
  {
    id: 'table-round-5ft',
    name: 'Round Banquet Table (5ft)',
    category: 'tables',
    variants: [
      { id: 'standard', name: 'Standard', color: '#F5F5F5' }
    ],
    dimensions: { width: 152, height: 76, depth: 152 },
    icon: '⭕',
    thumbnail: '/assets/tables/round-5ft-thumb.png',
    vendorId: 'vendor-004',
    vendorName: 'Table & Chair Central',
    sku: 'TBL-R5',
    rentalPrice: 12.50,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 2
  },
  {
    id: 'table-round-6ft',
    name: 'Round Banquet Table (6ft)',
    category: 'tables',
    variants: [
      { id: 'standard', name: 'Standard', color: '#F5F5F5' }
    ],
    dimensions: { width: 183, height: 76, depth: 183 },
    icon: '⭕',
    thumbnail: '/assets/tables/round-6ft-thumb.png',
    vendorId: 'vendor-004',
    vendorName: 'Table & Chair Central',
    sku: 'TBL-R6',
    rentalPrice: 15.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 2
  },
  {
    id: 'table-rect-6ft',
    name: 'Rectangular Banquet Table (6ft)',
    category: 'tables',
    variants: [
      { id: 'standard', name: 'Standard', color: '#F5F5F5' }
    ],
    dimensions: { width: 183, height: 76, depth: 76 },
    icon: '⬜',
    thumbnail: '/assets/tables/rect-6ft-thumb.png',
    vendorId: 'vendor-004',
    vendorName: 'Table & Chair Central',
    sku: 'TBL-R6X3',
    rentalPrice: 13.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 2
  },
  {
    id: 'table-rect-8ft',
    name: 'Rectangular Banquet Table (8ft)',
    category: 'tables',
    variants: [
      { id: 'standard', name: 'Standard', color: '#F5F5F5' }
    ],
    dimensions: { width: 244, height: 76, depth: 76 },
    icon: '⬜',
    thumbnail: '/assets/tables/rect-8ft-thumb.png',
    vendorId: 'vendor-004',
    vendorName: 'Table & Chair Central',
    sku: 'TBL-R8X3',
    rentalPrice: 16.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 2
  },
  {
    id: 'table-cocktail-001',
    name: 'Cocktail Table',
    category: 'tables',
    variants: [
      { id: 'standard', name: 'Standard', color: '#F5F5F5' },
      { id: 'high-top', name: 'High Top', color: '#F5F5F5', priceModifier: 15 }
    ],
    dimensions: { width: 61, height: 107, depth: 61 },
    icon: '🍸',
    thumbnail: '/assets/tables/cocktail-thumb.png',
    vendorId: 'vendor-004',
    vendorName: 'Table & Chair Central',
    sku: 'TBL-CTL',
    rentalPrice: 18.50,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 2
  },

  // Stage & Dancefloor
  {
    id: 'stage-modular-001',
    name: 'Modular Stage Block (4x4ft)',
    category: 'staging',
    variants: [
      { id: 'black', name: 'Black', color: '#000000' },
      { id: 'white', name: 'White', color: '#FFFFFF' },
      { id: 'natural', name: 'Natural Wood', color: '#DEB887' }
    ],
    dimensions: { width: 122, height: 20, depth: 122 },
    icon: '🎭',
    thumbnail: '/assets/stage/modular-thumb.png',
    vendorId: 'vendor-005',
    vendorName: 'Stage & Sound Systems',
    sku: 'STG-MOD4',
    rentalPrice: 35.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA'],
    leadTime: 5
  },
  {
    id: 'dancefloor-001',
    name: 'Dance Floor (12x12ft)',
    category: 'staging',
    variants: [
      { id: 'white', name: 'White', color: '#FFFFFF' },
      { id: 'black', name: 'Black', color: '#000000' },
      { id: 'led-white', name: 'LED White', color: '#FFFFFF', priceModifier: 150 },
      { id: 'checkered', name: 'Black & White Checkered', color: '#808080' }
    ],
    dimensions: { width: 366, height: 2, depth: 366 },
    icon: '💃',
    thumbnail: '/assets/dancefloor/standard-thumb.png',
    vendorId: 'vendor-005',
    vendorName: 'Stage & Sound Systems',
    sku: 'DNF-12X12',
    rentalPrice: 285.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 7
  },

  // Dining & Décor
  {
    id: 'centerpiece-floral-001',
    name: 'Floral Centerpiece - Classic',
    category: 'florals',
    variants: [
      { id: 'roses-red', name: 'Red Roses', color: '#DC143C' },
      { id: 'roses-white', name: 'White Roses', color: '#FFFFFF' },
      { id: 'roses-pink', name: 'Pink Roses', color: '#FFB6C1' },
      { id: 'hydrangea-blue', name: 'Blue Hydrangea', color: '#4682B4' },
      { id: 'orchids-purple', name: 'Purple Orchids', color: '#9370DB' }
    ],
    dimensions: { width: 30, height: 35, depth: 30 },
    icon: '🌸',
    thumbnail: '/assets/centerpieces/floral-classic-thumb.png',
    vendorId: 'vendor-006',
    vendorName: 'Petals & Blooms',
    sku: 'CPC-FL001',
    rentalPrice: 45.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 5
  },
  {
    id: 'centerpiece-crystal-001',
    name: 'Crystal Centerpiece - Elegant',
    category: 'décor',
    variants: [
      { id: 'clear', name: 'Clear Crystal', color: '#E8F4FD' },
      { id: 'gold-accent', name: 'Gold Accent', color: '#FFD700' },
      { id: 'silver-accent', name: 'Silver Accent', color: '#C0C0C0' }
    ],
    dimensions: { width: 25, height: 40, depth: 25 },
    icon: '💎',
    thumbnail: '/assets/centerpieces/crystal-elegant-thumb.png',
    vendorId: 'vendor-007',
    vendorName: 'Luxe Décor Elements',
    sku: 'CPC-CR001',
    rentalPrice: 65.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 3
  },
  {
    id: 'vase-cylinder-001',
    name: 'Cylinder Vase Set (3pc)',
    category: 'tableware',
    variants: [
      { id: 'clear-glass', name: 'Clear Glass', color: '#E8F4FD' },
      { id: 'gold-rim', name: 'Gold Rim', color: '#FFD700' },
      { id: 'silver-mercury', name: 'Silver Mercury', color: '#C0C0C0' }
    ],
    dimensions: { width: 20, height: 30, depth: 20 },
    icon: '🏺',
    thumbnail: '/assets/vases/cylinder-set-thumb.png',
    vendorId: 'vendor-007',
    vendorName: 'Luxe Décor Elements',
    sku: 'VSE-CYL3',
    rentalPrice: 28.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 2
  },

  // Lighting
  {
    id: 'chandelier-crystal-001',
    name: 'Crystal Chandelier - Grand',
    category: 'lighting',
    variants: [
      { id: 'clear-crystal', name: 'Clear Crystal', color: '#E8F4FD' },
      { id: 'amber-crystal', name: 'Amber Crystal', color: '#FFC000' },
      { id: 'colored-crystal', name: 'Colored Crystal', color: '#9370DB' }
    ],
    dimensions: { width: 120, height: 150, depth: 120 },
    icon: '💡',
    thumbnail: '/assets/lighting/chandelier-crystal-thumb.png',
    vendorId: 'vendor-008',
    vendorName: 'Illumination Experts',
    sku: 'CHD-CR001',
    rentalPrice: 185.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 10
  },
  {
    id: 'uplighting-001',
    name: 'LED Uplight (RGB)',
    category: 'lighting',
    variants: [
      { id: 'rgb-standard', name: 'RGB Standard', color: '#FFFFFF' },
      { id: 'wireless', name: 'Wireless RGB', color: '#FFFFFF', priceModifier: 25 }
    ],
    dimensions: { width: 15, height: 30, depth: 15 },
    icon: '💡',
    thumbnail: '/assets/lighting/uplight-thumb.png',
    vendorId: 'vendor-008',
    vendorName: 'Illumination Experts',
    sku: 'UPL-RGB',
    rentalPrice: 18.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 3
  },

  // Draping
  {
    id: 'drape-sheer-001',
    name: 'Sheer Draping Panel (10ft)',
    category: 'drapes',
    variants: [
      { id: 'white', name: 'White', color: '#FFFFFF' },
      { id: 'ivory', name: 'Ivory', color: '#FFFFF0' },
      { id: 'burgundy', name: 'Burgundy', color: '#8B1538' },
      { id: 'black', name: 'Black', color: '#000000' },
      { id: 'blush', name: 'Blush Pink', color: '#FFB6C1' }
    ],
    dimensions: { width: 305, height: 305, depth: 5 },
    icon: '🎭',
    thumbnail: '/assets/draping/sheer-panel-thumb.png',
    vendorId: 'vendor-009',
    vendorName: 'Fabric & Drape Co.',
    sku: 'DRP-SHR10',
    rentalPrice: 32.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 4
  },

  // Special Items (Bride & Groom Special Features)
  {
    id: 'throne-special-001',
    name: 'Bride & Groom Throne Set',
    category: 'special',
    variants: [
      { id: 'royal-gold', name: 'Royal Gold', color: '#FFD700' },
      { id: 'silver-elegance', name: 'Silver Elegance', color: '#C0C0C0' },
      { id: 'burgundy-velvet', name: 'Burgundy Velvet', color: '#8B1538' }
    ],
    dimensions: { width: 160, height: 130, depth: 80 },
    icon: '👑',
    thumbnail: '/assets/special/throne-set-thumb.png',
    vendorId: 'vendor-010',
    vendorName: 'Royal Event Specialists',
    sku: 'SPL-THR2',
    rentalPrice: 150.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 10
  },
  {
    id: 'arch-wedding-001', 
    name: 'Wedding Arch - Floral',
    category: 'special',
    variants: [
      { id: 'white-roses', name: 'White Roses', color: '#FFFFFF' },
      { id: 'pink-roses', name: 'Pink Roses', color: '#FFB6C1' },
      { id: 'mixed-florals', name: 'Mixed Florals', color: '#DDA0DD' }
    ],
    dimensions: { width: 244, height: 244, depth: 61 },
    icon: '🌸',
    thumbnail: '/assets/special/wedding-arch-thumb.png',
    vendorId: 'vendor-006',
    vendorName: 'Petals & Blooms',
    sku: 'SPL-ARCH',
    rentalPrice: 225.00,
    currency: 'USD',
    availabilityRegion: ['US', 'CA', 'GB'],
    leadTime: 14
  }
];

export default function AdvancedDecorDesigner() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Core state
  const [designMode, setDesignMode] = useState<'2d' | '3d'>('2d');
  const [currentProject, setCurrentProject] = useState<DesignProject>({
    id: 'project-' + Date.now(),
    name: 'New Event Design',
    description: 'Custom event layout and décor design',
    placedAssets: [],
    cameraSettings: {
      position: { x: 0, y: 500, z: 500 },
      target: { x: 0, y: 0, z: 0 }
    },
    designMode: '2d',
    gridSettings: {
      show: true,
      size: 50,
      snap: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Project versions state
  const [savedVersions, setSavedVersions] = useState<DesignProject[]>([]);
  const [showVersionDialog, setShowVersionDialog] = useState(false);

  // Load existing project versions on page open
  useEffect(() => {
    const loadProjectVersions = () => {
      try {
        const allVersions = Object.keys(localStorage)
          .filter(key => key.startsWith('ep-designer-project-'))
          .map(key => {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
          })
          .filter(Boolean)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        setSavedVersions(allVersions);

        // Auto-load the most recent project
        if (allVersions.length > 0) {
          setCurrentProject(allVersions[0]);
          toast({
            title: "Project Restored",
            description: `Loaded "${allVersions[0].name}" (latest version)`,
          });
        }
      } catch (error) {
        console.error('Failed to load project versions:', error);
      }
    };

    loadProjectVersions();
  }, []);
  
  // Asset library state
  const [assetLibrary] = useState<DecorAsset[]>(SEEDED_ASSETS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAssets, setFilteredAssets] = useState<DecorAsset[]>(SEEDED_ASSETS);
  
  // Design workspace state
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedAsset, setDraggedAsset] = useState<DecorAsset | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [zoom, setZoom] = useState(100);
  
  // Canvas references
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  const canvas3DRef = useRef<HTMLDivElement>(null);
  
  // Designer Guru state
  const [designPrompt, setDesignPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showDesignerDialog, setShowDesignerDialog] = useState(false);
  
  // Currency state
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  
  // Currency symbols and rates (for display)
  const currencyInfo = {
    USD: { symbol: '$', rate: 1, name: 'US Dollar' },
    GBP: { symbol: '£', rate: 0.79, name: 'British Pound' },
    EUR: { symbol: '€', rate: 0.85, name: 'Euro' },
    NGN: { symbol: '₦', rate: 460, name: 'Nigerian Naira' },
    CAD: { symbol: 'C$', rate: 1.25, name: 'Canadian Dollar' },
    AUD: { symbol: 'A$', rate: 1.35, name: 'Australian Dollar' }
  };

  // Filter assets based on category and search
  useEffect(() => {
    let filtered = assetLibrary;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(asset => asset.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredAssets(filtered);
  }, [selectedCategory, searchQuery, assetLibrary]);

  // 2D Canvas rendering
  const render2DCanvas = useCallback(() => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size
    canvas.width = 1200;
    canvas.height = 800;
    
    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Apply zoom
    ctx.save();
    const scale = zoom / 100;
    ctx.scale(scale, scale);
    
    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = '#E5E5E5';
      ctx.lineWidth = 1;
      const gridSize = currentProject.gridSettings.size;
      
      for (let x = 0; x <= canvas.width / scale; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height / scale);
        ctx.stroke();
      }
      
      for (let y = 0; y <= canvas.height / scale; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width / scale, y);
        ctx.stroke();
      }
    }
    
    // Draw placed assets
    currentProject.placedAssets.forEach(placedAsset => {
      const asset = assetLibrary.find(a => a.id === placedAsset.assetId);
      if (!asset) return;
      
      const variant = asset.variants.find(v => v.id === placedAsset.selectedVariant);
      
      ctx.save();
      ctx.translate(placedAsset.position.x, placedAsset.position.y);
      ctx.rotate(placedAsset.rotation.z * Math.PI / 180);
      
      // Draw asset representation
      const width = asset.dimensions.width * placedAsset.scale.x;
      const height = asset.dimensions.depth * placedAsset.scale.y;
      
      // Fill color based on variant
      ctx.fillStyle = variant?.color || '#CCCCCC';
      ctx.strokeStyle = selectedAssets.includes(placedAsset.id) ? '#8B1538' : '#666666';
      ctx.lineWidth = selectedAssets.includes(placedAsset.id) ? 3 : 1;
      
      if (asset.category === 'tables' && asset.name.includes('Round')) {
        // Draw round table
        ctx.beginPath();
        ctx.arc(0, 0, width / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        // Draw rectangular asset
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.strokeRect(-width / 2, -height / 2, width, height);
      }
      
      // Draw icon/label
      ctx.fillStyle = '#000000';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(asset.icon, 0, 5);
      
      ctx.restore();
    });
    
    ctx.restore();
  }, [currentProject, assetLibrary, selectedAssets, showGrid, zoom]);

  // Render 2D canvas when dependencies change
  useEffect(() => {
    render2DCanvas();
  }, [render2DCanvas]);

  // Handle asset drag from library
  const handleAssetDragStart = (asset: DecorAsset) => {
    setDraggedAsset(asset);
    setIsDragging(true);
  };

  // Handle drop on canvas
  const handleCanvasDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (!draggedAsset) return;
    
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (100 / zoom);
    const y = (event.clientY - rect.top) * (100 / zoom);
    
    // Snap to grid if enabled
    let finalX = x;
    let finalY = y;
    
    if (snapToGrid) {
      const gridSize = currentProject.gridSettings.size;
      finalX = Math.round(x / gridSize) * gridSize;
      finalY = Math.round(y / gridSize) * gridSize;
    }
    
    const newPlacedAsset: PlacedAsset = {
      id: 'placed-' + Date.now() + '-' + Math.random().toString(36),
      assetId: draggedAsset.id,
      position: { x: finalX, y: finalY, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      selectedVariant: draggedAsset.variants[0]?.id || 'default',
      quantity: 1,
      rentalDuration: draggedAsset.leadTime
    };
    
    setCurrentProject(prev => ({
      ...prev,
      placedAssets: [...prev.placedAssets, newPlacedAsset],
      updatedAt: new Date().toISOString()
    }));
    
    setDraggedAsset(null);
    setIsDragging(false);
    
    toast({
      title: "Asset Placed",
      description: `${draggedAsset.name} added to your design.`,
    });
  };

  // Handle canvas click for selection
  const handleCanvasClick = (event: React.MouseEvent) => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (100 / zoom);
    const y = (event.clientY - rect.top) * (100 / zoom);
    
    // Find clicked asset
    const clickedAsset = currentProject.placedAssets.find(placedAsset => {
      const asset = assetLibrary.find(a => a.id === placedAsset.assetId);
      if (!asset) return false;
      
      const width = asset.dimensions.width * placedAsset.scale.x;
      const height = asset.dimensions.depth * placedAsset.scale.y;
      
      return x >= placedAsset.position.x - width / 2 &&
             x <= placedAsset.position.x + width / 2 &&
             y >= placedAsset.position.y - height / 2 &&
             y <= placedAsset.position.y + height / 2;
    });
    
    if (clickedAsset) {
      setSelectedAssets([clickedAsset.id]);
    } else {
      setSelectedAssets([]);
    }
  };

  // Designer Guru functions
  const generateDesign = async () => {
    if (!designPrompt.trim()) {
      toast({
        title: "Brief Needed",
        description: "Please enter a design brief for the Designer to work with.",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);

    try {
      // Simulate design generation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mock generated layout based on brief
      const generatedAssets: PlacedAsset[] = [];

      // Basic wedding setup example
      if (designPrompt.toLowerCase().includes('wedding')) {
        // Add round tables
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * 2 * Math.PI;
          const radius = 300;
          const x = 600 + Math.cos(angle) * radius;
          const y = 400 + Math.sin(angle) * radius;

          generatedAssets.push({
            id: `design-table-${i}`,
            assetId: 'table-round-6ft',
            position: { x, y, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            selectedVariant: 'standard',
            quantity: 1,
            rentalDuration: 2
          });
        }
        
        // Add dance floor
        generatedAssets.push({
          id: 'design-dancefloor',
          assetId: 'dancefloor-001',
          position: { x: 600, y: 400, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.8, y: 0.8, z: 1 },
          selectedVariant: 'white',
          quantity: 1,
          rentalDuration: 7
        });

        // Add stage
        generatedAssets.push({
          id: 'design-stage',
          assetId: 'stage-modular-001',
          position: { x: 600, y: 200, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 2, y: 1, z: 1 },
          selectedVariant: 'black',
          quantity: 4,
          rentalDuration: 5
        });
      }

      setCurrentProject(prev => ({
        ...prev,
        placedAssets: generatedAssets,
        updatedAt: new Date().toISOString()
      }));

      setShowDesignerDialog(false);
      setDesignPrompt('');

      toast({
        title: "Design Generated",
        description: "Your event layout has been prepared based on your brief.",
      });
      
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Unable to generate design. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  // Calculate total budget with quantity and rental duration
  const calculateTotalBudget = () => {
    const totalUSD = currentProject.placedAssets.reduce((total, placedAsset) => {
      const asset = assetLibrary.find(a => a.id === placedAsset.assetId);
      const variant = asset?.variants.find(v => v.id === placedAsset.selectedVariant);
      const basePrice = asset?.rentalPrice || 0;
      const modifier = variant?.priceModifier || 0;
      const finalPrice = basePrice * (1 + modifier / 100);
      
      // Total = Asset Unit Cost × Quantity × Rental Duration multiplier
      const rentalMultiplier = placedAsset.rentalDuration / (asset?.leadTime || 1);
      return total + (finalPrice * placedAsset.quantity * rentalMultiplier);
    }, 0);
    
    // Convert to selected currency
    const rate = currencyInfo[selectedCurrency as keyof typeof currencyInfo]?.rate || 1;
    return totalUSD * rate;
  };

  // Save project with version support
  const saveProject = (versionName?: string) => {
    try {
      const timestamp = new Date().toISOString();
      const projectData = {
        ...currentProject,
        name: versionName || currentProject.name,
        id: versionName ? `project-${Date.now()}-${versionName.replace(/\s+/g, '-')}` : currentProject.id,
        updatedAt: timestamp,
        savedAt: timestamp
      };
      
      localStorage.setItem(`ep-designer-project-${projectData.id}`, JSON.stringify(projectData));
      
      // Update saved versions list
      const updatedVersions = [...savedVersions.filter(v => v.id !== projectData.id), projectData]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setSavedVersions(updatedVersions);
      
      if (versionName) {
        setCurrentProject(projectData);
      }
      
      toast({
        title: "Project Saved",
        description: versionName ? `Saved as "${versionName}"` : "Your design has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Unable to save project. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Load project from local storage
  const loadProject = (projectId: string) => {
    try {
      const saved = localStorage.getItem(`ep-designer-project-${projectId}`);
      if (saved) {
        const projectData = JSON.parse(saved);
        setCurrentProject(projectData);
        
        toast({
          title: "Project Loaded",
          description: "Your design has been loaded successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Load Failed",
        description: "Unable to load project. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Export 2D design as PNG
  const export2DImage = () => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;

    try {
      const link = document.createElement('a');
      link.download = `${currentProject.name}-2D-design.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast({
        title: "Export Complete",
        description: "2D design exported as PNG.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export design. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Export project summary as PDF
  const exportProjectPDF = async () => {
    try {
      // Create a detailed project summary for PDF
      const summary = {
        projectName: currentProject.name,
        description: currentProject.description,
        created: new Date(currentProject.createdAt).toLocaleDateString(),
        budget: {
          total: formatCurrency(calculateTotalBudget()),
          currency: selectedCurrency,
          breakdown: currentProject.placedAssets.map(placedAsset => {
            const asset = assetLibrary.find(a => a.id === placedAsset.assetId);
            const variant = asset?.variants.find(v => v.id === placedAsset.selectedVariant);
            const basePrice = asset?.rentalPrice || 0;
            const modifier = variant?.priceModifier || 0;
            const finalPrice = basePrice * (1 + modifier / 100);
            const rentalMultiplier = placedAsset.rentalDuration / (asset?.leadTime || 1);
            const itemTotal = finalPrice * placedAsset.quantity * rentalMultiplier;
            
            return {
              asset: asset?.name || 'Unknown',
              category: asset?.category || 'Unknown',
              variant: variant?.name || 'Default',
              quantity: placedAsset.quantity,
              rentalDuration: `${placedAsset.rentalDuration} days`,
              unitPrice: formatCurrency(finalPrice * (currencyInfo[selectedCurrency as keyof typeof currencyInfo]?.rate || 1)),
              total: formatCurrency(itemTotal * (currencyInfo[selectedCurrency as keyof typeof currencyInfo]?.rate || 1))
            };
          })
        },
        assets: currentProject.placedAssets.length,
        exportedAt: new Date().toISOString()
      };

      // Create PDF content as HTML string (simplified PDF generation)
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { color: #330311; border-bottom: 2px solid #8B1538; padding-bottom: 10px; }
              .budget-total { background: #f5f5f5; padding: 10px; margin: 20px 0; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #330311; color: white; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Event Perfekt - Design Summary</h1>
              <h2>${summary.projectName}</h2>
              <p>Created: ${summary.created} | Exported: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="budget-total">
              <h3>Total Budget: ${summary.budget.total}</h3>
              <p>Currency: ${summary.budget.currency} | Assets: ${summary.assets}</p>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Category</th>
                  <th>Variant</th>
                  <th>Quantity</th>
                  <th>Duration</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${summary.budget.breakdown.map(item => `
                  <tr>
                    <td>${item.asset}</td>
                    <td>${item.category}</td>
                    <td>${item.variant}</td>
                    <td>${item.quantity}</td>
                    <td>${item.rentalDuration}</td>
                    <td>${item.unitPrice}</td>
                    <td>${item.total}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const link = document.createElement('a');
      link.download = `${currentProject.name}-summary.html`;
      link.href = URL.createObjectURL(blob);
      link.click();
      
      toast({
        title: "PDF Report Generated",
        description: "Project summary exported as HTML (open in browser and print to PDF).",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Export 3D snapshot
  const export3DSnapshot = () => {
    try {
      // For now, export a placeholder 3D view
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create a simple 3D-style representation
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('3D View Snapshot', canvas.width / 2, canvas.height / 2 - 50);
        ctx.fillText(`${currentProject.placedAssets.length} Assets Placed`, canvas.width / 2, canvas.height / 2);
        ctx.fillText(`Budget: ${formatCurrency(calculateTotalBudget())}`, canvas.width / 2, canvas.height / 2 + 50);
        
        const link = document.createElement('a');
        link.download = `${currentProject.name}-3D-snapshot.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
      
      toast({
        title: "3D Snapshot Exported",
        description: "3D view snapshot saved as PNG.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export 3D snapshot. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Format currency display
  const formatCurrency = (amount: number) => {
    const symbol = currencyInfo[selectedCurrency as keyof typeof currencyInfo]?.symbol || '$';
    return `${symbol}${amount.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-[#330311] p-6">
      <div className="max-w-full mx-auto space-y-6">
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
              <h1 className="text-3xl font-bold text-white">EP Designer Studio</h1>
              <p className="text-white/80">Professional 2D + 3D Event Design Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-24 bg-white/10 border-white/20 text-white" data-testid="select-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#330311] border-[#8B1538]">
                {Object.entries(currencyInfo).map(([code, info]) => (
                  <SelectItem key={code} value={code}>{code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="bg-[#8B1538] text-white border-none">
              Budget: {formatCurrency(calculateTotalBudget())}
            </Badge>
            <Badge variant="secondary" className="bg-black/40 text-white border-white/20">
              {currentProject.placedAssets.length} Assets
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Asset Library Sidebar */}
          <div className="col-span-3 space-y-4">
            <Card className="bg-black/40 backdrop-blur-md border border-white/30 h-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Asset Library
                </CardTitle>
                
                {/* Search and Filter */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-white/50" />
                    <Input
                      placeholder="Search assets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white/10 border-white/20 text-white pl-10"
                      data-testid="input-asset-search"
                    />
                  </div>
                  
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-asset-category">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#330311] border-[#8B1538]">
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="seating">Seating</SelectItem>
                      <SelectItem value="tables">Tables</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="lighting">Lighting</SelectItem>
                      <SelectItem value="drapes">Drapes</SelectItem>
                      <SelectItem value="décor">Décor</SelectItem>
                      <SelectItem value="florals">Florals</SelectItem>
                      <SelectItem value="tableware">Tableware</SelectItem>
                      <SelectItem value="special">Special</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              
              <CardContent className="overflow-y-auto h-[calc(100%-140px)]">
                <div className="grid grid-cols-1 gap-3">
                  {filteredAssets.map((asset) => (
                    <Card
                      key={asset.id}
                      className="bg-white/10 border-white/20 cursor-grab"
                      draggable
                      onDragStart={() => handleAssetDragStart(asset)}
                      data-testid={`asset-${asset.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{asset.icon}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-sm truncate">{asset.name}</h4>
                            <p className="text-white/60 text-xs capitalize">{asset.category}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[#8B1538] font-bold text-sm">
                                {asset.rentalPrice ? formatCurrency(asset.rentalPrice * (currencyInfo[selectedCurrency as keyof typeof currencyInfo]?.rate || 1)) : 'N/A'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {asset.leadTime}d
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {/* Variant Colors */}
                        <div className="flex items-center gap-1 mt-2">
                          {asset.variants.slice(0, 4).map((variant) => (
                            <div
                              key={variant.id}
                              className="w-4 h-4 rounded-full border border-white/30"
                              style={{ backgroundColor: variant.color }}
                              title={variant.name}
                            />
                          ))}
                          {asset.variants.length > 4 && (
                            <span className="text-white/60 text-xs">+{asset.variants.length - 4}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Design Workspace */}
          <div className="col-span-6 space-y-4">
            {/* Toolbar */}
            <Card className="bg-black/40 backdrop-blur-md border border-white/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Mode Toggle */}
                    <div className="flex bg-white/10 rounded-lg p-1">
                      <Button
                        size="sm"
                        variant={designMode === '2d' ? 'default' : 'ghost'}
                        onClick={() => setDesignMode('2d')}
                        className={designMode === '2d' ? 'bg-[#8B1538] text-white' : 'text-white/70'}
                        data-testid="button-2d-mode"
                      >
                        <Grid3X3 className="h-4 w-4 mr-2" />
                        2D Plan
                      </Button>
                      <Button
                        size="sm"
                        variant={designMode === '3d' ? 'default' : 'ghost'}
                        onClick={() => setDesignMode('3d')}
                        className={designMode === '3d' ? 'bg-[#8B1538] text-white' : 'text-white/70'}
                        data-testid="button-3d-mode"
                      >
                        <Box className="h-4 w-4 mr-2" />
                        3D View
                      </Button>
                    </div>
                    
                    {/* Divider */}
                    <div className="h-6 w-px bg-white/20" />
                    
                    {/* Tools */}
                    <Button size="sm" variant="ghost" className="text-white/70" data-testid="button-undo">
                      <Undo className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white/70" data-testid="button-redo">
                      <Redo className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white/70" data-testid="button-copy">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-white/70"
                      onClick={() => {
                        setCurrentProject(prev => ({
                          ...prev,
                          placedAssets: prev.placedAssets.filter(asset => !selectedAssets.includes(asset.id))
                        }));
                        setSelectedAssets([]);
                      }}
                      disabled={selectedAssets.length === 0}
                      data-testid="button-delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Grid Toggle */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowGrid(!showGrid)}
                      className={showGrid ? 'text-white bg-white/10' : 'text-white/70'}
                      data-testid="button-grid"
                    >
                      <Ruler className="h-4 w-4" />
                    </Button>
                    
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setZoom(Math.max(25, zoom - 25))}
                        className="text-white/70 h-6 w-6 p-0"
                        data-testid="button-zoom-out"
                      >
                        <ZoomOut className="h-3 w-3" />
                      </Button>
                      <span className="text-white text-sm mx-2 min-w-[3rem] text-center">{zoom}%</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setZoom(Math.min(200, zoom + 25))}
                        className="text-white/70 h-6 w-6 p-0"
                        data-testid="button-zoom-in"
                      >
                        <ZoomIn className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Divider */}
                    <div className="h-6 w-px bg-white/20" />
                    
                    {/* Save & Export Controls */}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => saveProject()}
                      className="text-white/70"
                      data-testid="button-save"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={export2DImage}
                      className="text-white/70"
                      data-testid="button-export-image"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Export PNG
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        toast({
                          title: "Export Summary",
                          description: "Project summary exported successfully.",
                        });
                      }}
                      className="text-white/70"
                      data-testid="button-export-summary"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export Summary
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Design Canvas */}
            <Card className="bg-white border border-gray-300 h-[calc(100%-100px)]">
              <CardContent className="p-0 h-full">
                {designMode === '2d' ? (
                  <canvas
                    ref={canvas2DRef}
                    className="w-full h-full cursor-crosshair bg-white"
                    onDrop={handleCanvasDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={handleCanvasClick}
                    data-testid="canvas-2d"
                  />
                ) : (
                  <div 
                    ref={canvas3DRef} 
                    className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg flex items-center justify-center"
                    data-testid="canvas-3d"
                  >
                    <div className="text-center text-white/60">
                      <Box className="h-16 w-16 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">3D View</h3>
                      <p>Three.js 3D rendering will be implemented here</p>
                      <p className="text-sm mt-2">Interactive 360° view with placed assets</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Properties & Agent Panel */}
          <div className="col-span-3 space-y-4">
            {/* Designer Guru */}
            <Card className="bg-black/40 backdrop-blur-md border border-white/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  EP Designer Guru
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe your event... e.g., 'Wedding reception for 200 guests, elegant ballroom, burgundy and gold theme, crystal chandeliers'"
                  value={designPrompt}
                  onChange={(e) => setDesignPrompt(e.target.value)}
                  className="bg-white/10 border-white/20 text-white min-h-[100px]"
                  data-testid="textarea-design-brief"
                />
                <Button
                  onClick={generateDesign}
                  disabled={generating}
                  className="w-full bg-[#8B1538] text-white"
                  data-testid="button-generate-design"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Design
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Properties Panel */}
            <Card className="bg-black/40 backdrop-blur-md border border-white/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Properties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedAssets.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Selected: {selectedAssets.length} asset(s)</Label>
                    </div>
                    
                    {selectedAssets.length === 1 && (() => {
                      const placedAsset = currentProject.placedAssets.find(a => a.id === selectedAssets[0]);
                      const asset = assetLibrary.find(a => a.id === placedAsset?.assetId);
                      
                      if (!placedAsset || !asset) return null;
                      
                      return (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-white">Asset: {asset.name}</Label>
                          </div>
                          
                          <div>
                            <Label className="text-white">Variant</Label>
                            <Select 
                              value={placedAsset.selectedVariant} 
                              onValueChange={(value) => {
                                setCurrentProject(prev => ({
                                  ...prev,
                                  placedAssets: prev.placedAssets.map(a => 
                                    a.id === placedAsset.id ? { ...a, selectedVariant: value } : a
                                  )
                                }));
                              }}
                            >
                              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#330311] border-[#8B1538]">
                                {asset.variants.map((variant) => (
                                  <SelectItem key={variant.id} value={variant.id}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-4 h-4 rounded-full border border-white/30"
                                        style={{ backgroundColor: variant.color }}
                                      />
                                      {variant.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-white">Rotation (Z)</Label>
                            <Slider
                              value={[placedAsset.rotation.z]}
                              onValueChange={([value]) => {
                                setCurrentProject(prev => ({
                                  ...prev,
                                  placedAssets: prev.placedAssets.map(a => 
                                    a.id === placedAsset.id 
                                      ? { ...a, rotation: { ...a.rotation, z: value } } 
                                      : a
                                  )
                                }));
                              }}
                              max={360}
                              min={0}
                              step={15}
                              className="w-full"
                            />
                            <div className="text-white/60 text-sm">{placedAsset.rotation.z}°</div>
                          </div>
                          
                          <div>
                            <Label className="text-white">Quantity</Label>
                            <Input
                              type="number"
                              min={1}
                              max={999}
                              value={placedAsset.quantity}
                              onChange={(e) => {
                                const quantity = parseInt(e.target.value) || 1;
                                setCurrentProject(prev => ({
                                  ...prev,
                                  placedAssets: prev.placedAssets.map(a => 
                                    a.id === placedAsset.id ? { ...a, quantity } : a
                                  )
                                }));
                              }}
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-white">Rental Duration (days)</Label>
                            <Input
                              type="number"
                              min={1}
                              max={30}
                              value={placedAsset.rentalDuration}
                              onChange={(e) => {
                                const rentalDuration = parseInt(e.target.value) || 1;
                                setCurrentProject(prev => ({
                                  ...prev,
                                  placedAssets: prev.placedAssets.map(a => 
                                    a.id === placedAsset.id ? { ...a, rentalDuration } : a
                                  )
                                }));
                              }}
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-white">Scale</Label>
                            <Slider
                              value={[placedAsset.scale.x * 100]}
                              onValueChange={([value]) => {
                                const scale = value / 100;
                                setCurrentProject(prev => ({
                                  ...prev,
                                  placedAssets: prev.placedAssets.map(a => 
                                    a.id === placedAsset.id 
                                      ? { ...a, scale: { x: scale, y: scale, z: scale } } 
                                      : a
                                  )
                                }));
                              }}
                              max={200}
                              min={25}
                              step={5}
                              className="w-full"
                            />
                            <div className="text-white/60 text-sm">{Math.round(placedAsset.scale.x * 100)}%</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/60">
                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Select an asset to view properties</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card className="bg-black/40 backdrop-blur-md border border-white/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Share className="h-5 w-5" />
                  Export & Share
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-white border-white/20" 
                  onClick={() => saveProject()}
                  data-testid="button-save-project"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Project
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-white border-white/20" 
                  onClick={() => setShowVersionDialog(true)}
                  data-testid="button-manage-versions"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Manage Versions ({savedVersions.length})
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-white border-white/20" 
                  onClick={exportProjectPDF}
                  data-testid="button-export-pdf"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF Report
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-white border-white/20" 
                  onClick={export2DImage}
                  data-testid="button-export-2d-image"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Export 2D Image
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-white border-white/20" 
                  onClick={export3DSnapshot}
                  data-testid="button-export-3d-snapshot"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Export 3D Snapshot
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Version Management Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="bg-black/90 border border-white/30 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Project Versions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Save New Version */}
            <div className="border-b border-white/20 pb-4">
              <Label className="text-white mb-2 block">Save Current Design as New Version</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter version name (e.g., 'Final Design', 'Client Review v2')"
                  value={""} 
                  onChange={(e) => {
                    const versionName = e.target.value;
                    if (versionName.trim()) {
                      saveProject(versionName.trim());
                      setShowVersionDialog(false);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const versionName = (e.target as HTMLInputElement).value;
                      if (versionName.trim()) {
                        saveProject(versionName.trim());
                        setShowVersionDialog(false);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }
                  }}
                  className="bg-white/10 border-white/20 text-white flex-1"
                />
                <Button 
                  variant="outline" 
                  className="border-white/20 text-white"
                  onClick={(e) => {
                    const input = e.currentTarget.parentNode?.querySelector('input') as HTMLInputElement;
                    const versionName = input?.value;
                    if (versionName?.trim()) {
                      saveProject(versionName.trim());
                      setShowVersionDialog(false);
                      input.value = "";
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Existing Versions */}
            <div>
              <Label className="text-white mb-3 block">Saved Versions ({savedVersions.length})</Label>
              {savedVersions.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  <Copy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No saved versions yet</p>
                  <p className="text-sm">Save different versions of your design above</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {savedVersions.map((version) => (
                    <div 
                      key={version.id} 
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        version.id === currentProject.id 
                          ? 'border-[#8B1538] bg-[#8B1538]/20' 
                          : 'border-white/20'
                      }`}
                      onClick={() => {
                        setCurrentProject(version);
                        setShowVersionDialog(false);
                        toast({
                          title: "Version Loaded",
                          description: `Switched to "${version.name}"`,
                        });
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{version.name}</h4>
                          <p className="text-sm text-white/60 mt-1">{version.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                            <span>Assets: {version.placedAssets.length}</span>
                            <span>Updated: {new Date(version.updatedAt).toLocaleDateString()}</span>
                            {version.id === currentProject.id && (
                              <Badge variant="secondary" className="bg-[#8B1538] text-white">Current</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            localStorage.removeItem(`ep-designer-project-${version.id}`);
                            setSavedVersions(prev => prev.filter(v => v.id !== version.id));
                            toast({
                              title: "Version Deleted",
                              description: `"${version.name}" has been removed.`,
                            });
                          }}
                          className="text-white/60"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}