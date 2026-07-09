import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { 
  Box, 
  Sparkles, 
  RefreshCw, 
  Download, 
  Lightbulb, 
  Palette, 
  Sofa, 
  Play,
  RotateCcw,
  Save,
  Eye,
  Camera,
  Settings,
  Maximize2,
  Package,
  FileText,
  Printer
} from "lucide-react";

interface FurnitureItem {
  id: string;
  type: 'chair' | 'table' | 'sofa' | 'stage' | 'bar' | 'decorative' | 'lighting';
  name: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
  color: string;
  material: string;
  style: string;
  vendorId?: string;
}

interface LightingSetup {
  ambientLight: number;
  accent: { x: number; y: number; intensity: number; color: string }[];
  spotlights: { x: number; y: number; z: number; direction: number; color: string }[];
  uplighting: string;
}

interface VenueDesign {
  id: string;
  name: string;
  style: string;
  colorPalette: string[];
  furnitureItems: FurnitureItem[];
  lightingPlan: LightingSetup;
  decorElements: any[];
  floorMaterial: string;
  wallTreatment: string;
  ceilingTreatment: string;
}

export function VenueDesigner3DAI() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDesign, setCurrentDesign] = useState<VenueDesign | null>(null);
  const [designParams, setDesignParams] = useState({
    eventType: 'wedding',
    style: 'elegant',
    colorScheme: 'burgundy_white',
    capacity: 100,
    atmosphere: 'romantic',
    budget: 'medium',
    specialRequests: '',
    furnitureStyle: 'classic',
    lightingMood: 'warm',
    hasLiveMusic: false,
    requiresStaging: false,
    includeLounge: true
  });

  const [viewSettings, setViewSettings] = useState({
    camera: { x: 0, y: 10, z: 15 },
    rotation: { x: -30, y: 0, z: 0 },
    zoom: 1,
    showWireframe: false,
    showLighting: true,
    renderQuality: 'medium'
  });

  const generate3DDesign = async () => {
    setIsGenerating(true);
    
    // Simulate 3D venue design generation
    const mockFurniture: FurnitureItem[] = [];
    let itemId = 1;

    // Generate furniture based on style and requirements
    const baseColors = designParams.colorScheme === 'burgundy_white' 
      ? ['#800020', '#FFFFFF', '#2F4F4F', '#F5F5DC']
      : ['#2C3E50', '#ECF0F1', '#E74C3C', '#F39C12'];

    // Add ceremony seating if wedding
    if (designParams.eventType === 'wedding') {
      // Ceremony chairs
      for (let row = 0; row < 6; row++) {
        for (let seat = 0; seat < 8; seat++) {
          mockFurniture.push({
            id: `chair-${itemId++}`,
            type: 'chair',
            name: 'Ceremony Chair',
            x: -6 + seat * 1.5,
            y: 0,
            z: -8 + row * 1.2,
            rotation: 0,
            scale: 1,
            color: baseColors[0],
            material: designParams.furnitureStyle === 'classic' ? 'mahogany' : 'modern_fabric',
            style: designParams.furnitureStyle,
          });
        }
      }
    }

    // Add reception tables
    const tablesNeeded = Math.ceil(designParams.capacity / 8);
    for (let i = 0; i < tablesNeeded; i++) {
      const angle = (i / tablesNeeded) * Math.PI * 2;
      const radius = 8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Round table
      mockFurniture.push({
        id: `table-${itemId++}`,
        type: 'table',
        name: `Reception Table ${i + 1}`,
        x,
        y: 0,
        z,
        rotation: 0,
        scale: 1,
        color: baseColors[3],
        material: 'linen',
        style: designParams.furnitureStyle,
      });

      // Chairs around table
      for (let j = 0; j < 8; j++) {
        const chairAngle = (j / 8) * Math.PI * 2;
        const chairRadius = 2.5;
        mockFurniture.push({
          id: `chair-${itemId++}`,
          type: 'chair',
          name: `Chair ${j + 1}`,
          x: x + Math.cos(chairAngle) * chairRadius,
          y: 0,
          z: z + Math.sin(chairAngle) * chairRadius,
          rotation: (chairAngle * 180) / Math.PI + 180,
          scale: 1,
          color: baseColors[0],
          material: designParams.furnitureStyle === 'classic' ? 'velvet' : 'modern_fabric',
          style: designParams.furnitureStyle,
        });
      }
    }

    // Add lounge area if requested
    if (designParams.includeLounge) {
      mockFurniture.push({
        id: `sofa-${itemId++}`,
        type: 'sofa',
        name: 'Lounge Sofa',
        x: -12,
        y: 0,
        z: 8,
        rotation: 45,
        scale: 1.2,
        color: baseColors[1],
        material: 'luxury_fabric',
        style: designParams.furnitureStyle,
      });
    }

    // Add staging if required
    if (designParams.requiresStaging) {
      mockFurniture.push({
        id: `stage-${itemId++}`,
        type: 'stage',
        name: 'Performance Stage',
        x: 0,
        y: 0.5,
        z: -12,
        rotation: 0,
        scale: 1,
        color: baseColors[2],
        material: 'wood',
        style: 'modern',
      });
    }

    // Generate lighting setup
    const lightingPlan: LightingSetup = {
      ambientLight: designParams.lightingMood === 'warm' ? 0.4 : 0.6,
      accent: [
        { x: 0, y: 0, intensity: 0.8, color: baseColors[1] },
        { x: 10, y: 0, intensity: 0.6, color: baseColors[0] },
        { x: -10, y: 0, intensity: 0.6, color: baseColors[0] },
      ],
      spotlights: [
        { x: 0, y: 8, z: -12, direction: -90, color: '#FFFFFF' },
        { x: 5, y: 6, z: 0, direction: -45, color: baseColors[1] },
        { x: -5, y: 6, z: 0, direction: -45, color: baseColors[1] },
      ],
      uplighting: baseColors[0]
    };

    const generatedDesign: VenueDesign = {
      id: `design-${Date.now()}`,
      name: `${designParams.eventType} ${designParams.style} Design`,
      style: designParams.style,
      colorPalette: baseColors,
      furnitureItems: mockFurniture,
      lightingPlan,
      decorElements: [],
      floorMaterial: 'hardwood',
      wallTreatment: 'fabric_draping',
      ceilingTreatment: 'string_lights'
    };

    setTimeout(() => {
      setCurrentDesign(generatedDesign);
      setIsGenerating(false);
    }, 3000);
  };

  const export3DDesign = () => {
    if (!currentDesign) return;
    
    const dataStr = JSON.stringify(currentDesign, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentDesign.name.replace(/\s+/g, '_')}_3D.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    if (!currentDesign) return;

    try {
      // Dynamic import to reduce bundle size
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      
      // Add Event Perfekt header
      pdf.setFillColor(139, 21, 56); // Burgundy color
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Event Perfekt', 20, 17);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('3D Venue Design Report', pageWidth - 20, 17, { align: 'right' });
      
      // Reset text color for content
      pdf.setTextColor(0, 0, 0);
      
      let yPos = 40;
      
      // Design Overview
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Design Overview', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Design Name: ${currentDesign.name}`, 20, yPos);
      yPos += 8;
      pdf.text(`Style: ${currentDesign.style}`, 20, yPos);
      yPos += 8;
      pdf.text(`Floor Material: ${currentDesign.floorMaterial}`, 20, yPos);
      yPos += 8;
      pdf.text(`Wall Treatment: ${currentDesign.wallTreatment}`, 20, yPos);
      yPos += 8;
      pdf.text(`Ceiling Treatment: ${currentDesign.ceilingTreatment}`, 20, yPos);
      yPos += 15;
      
      // Color Palette
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Color Palette', 20, yPos);
      yPos += 10;
      
      currentDesign.colorPalette.forEach((color, index) => {
        // Convert hex to RGB for PDF
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        pdf.setFillColor(r, g, b);
        pdf.rect(20 + (index * 25), yPos - 5, 20, 8, 'F');
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(8);
        pdf.text(color, 20 + (index * 25), yPos + 12);
      });
      yPos += 25;
      
      // Furniture Inventory
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Furniture Inventory', 20, yPos);
      yPos += 15;
      
      // Group furniture by type
      const furnitureByType = currentDesign.furnitureItems.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item);
        return acc;
      }, {} as Record<string, FurnitureItem[]>);
      
      Object.entries(furnitureByType).forEach(([type, items]) => {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${type.charAt(0).toUpperCase() + type.slice(1)}s (${items.length})`, 25, yPos);
        yPos += 8;
        
        pdf.setFont('helvetica', 'normal');
        items.forEach((item) => {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 30;
          }
          
          pdf.text(`• ${item.name} - ${item.style} (${item.material})`, 30, yPos);
          yPos += 6;
        });
        yPos += 5;
      });
      
      // Lighting Plan
      if (yPos > pageHeight - 60) {
        pdf.addPage();
        yPos = 30;
      }
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Lighting Plan', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Ambient Light Level: ${Math.round(currentDesign.lightingPlan.ambientLight * 100)}%`, 25, yPos);
      yPos += 8;
      pdf.text(`Accent Lights: ${currentDesign.lightingPlan.accent.length} fixtures`, 25, yPos);
      yPos += 8;
      pdf.text(`Spotlights: ${currentDesign.lightingPlan.spotlights.length} fixtures`, 25, yPos);
      yPos += 8;
      pdf.text(`Uplighting Color: ${currentDesign.lightingPlan.uplighting}`, 25, yPos);
      yPos += 15;
      
      // Footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Generated by Event Perfekt - Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text(new Date().toLocaleDateString(), pageWidth - 20, pageHeight - 10, { align: 'right' });
      }
      
      // Save the PDF
      pdf.save(`${currentDesign.name.replace(/\s+/g, '_')}_Design_Report.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-red-900">3D Venue Designer</h2>
          <p className="text-red-700">Create stunning 3D venue designs with Agent-powered furniture placement</p>
        </div>
        {currentDesign && (
          <div className="flex space-x-2">
            <Button onClick={export3DDesign} variant="outline" className="border-red-300">
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={exportToPDF} className="bg-burgundy-600 hover:bg-burgundy-700 text-white">
              <FileText className="w-4 h-4 mr-2" />
              Export PDF Report
            </Button>
            <Button className="bg-red-800 hover:bg-red-900">
              <Camera className="w-4 h-4 mr-2" />
              Generate Render
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Design Configuration */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Design Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Event Type</Label>
                <Select value={designParams.eventType} onValueChange={(value) => setDesignParams(prev => ({ ...prev, eventType: value }))}>
                  <SelectTrigger className="border-red-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="corporate">Corporate Event</SelectItem>
                    <SelectItem value="birthday">Birthday Party</SelectItem>
                    <SelectItem value="gala">Gala Dinner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Design Style</Label>
                <Select value={designParams.style} onValueChange={(value) => setDesignParams(prev => ({ ...prev, style: value }))}>
                  <SelectTrigger className="border-red-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elegant">Classic Elegant</SelectItem>
                    <SelectItem value="modern">Modern Chic</SelectItem>
                    <SelectItem value="rustic">Rustic Charm</SelectItem>
                    <SelectItem value="luxury">Ultra Luxury</SelectItem>
                    <SelectItem value="minimalist">Minimalist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Color Scheme</Label>
                <Select value={designParams.colorScheme} onValueChange={(value) => setDesignParams(prev => ({ ...prev, colorScheme: value }))}>
                  <SelectTrigger className="border-red-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="burgundy_white">Burgundy & White</SelectItem>
                    <SelectItem value="navy_silver">Navy & Silver</SelectItem>
                    <SelectItem value="blush_rose">Blush & Rose Gold</SelectItem>
                    <SelectItem value="emerald_white">Emerald & White</SelectItem>
                    <SelectItem value="monochrome">Black & White</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Guest Capacity</Label>
                <Input
                  type="number"
                  value={designParams.capacity}
                  onChange={(e) => setDesignParams(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                  className="border-red-200"
                />
              </div>

              <div>
                <Label>Atmosphere</Label>
                <Select value={designParams.atmosphere} onValueChange={(value) => setDesignParams(prev => ({ ...prev, atmosphere: value }))}>
                  <SelectTrigger className="border-red-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="romantic">Romantic</SelectItem>
                    <SelectItem value="energetic">Energetic</SelectItem>
                    <SelectItem value="sophisticated">Sophisticated</SelectItem>
                    <SelectItem value="intimate">Intimate</SelectItem>
                    <SelectItem value="grand">Grand & Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Special Features</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'hasLiveMusic', label: 'Live Music Stage' },
                    { key: 'requiresStaging', label: 'Performance Area' },
                    { key: 'includeLounge', label: 'Lounge Seating' }
                  ].map(({ key, label }) => (
                    <Badge
                      key={key}
                      variant={designParams[key as keyof typeof designParams] ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setDesignParams(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Special Requests</Label>
                <Textarea
                  value={designParams.specialRequests}
                  onChange={(e) => setDesignParams(prev => ({ ...prev, specialRequests: e.target.value }))}
                  placeholder="Any specific design requirements..."
                  className="border-red-200"
                  rows={3}
                />
              </div>

              <Button 
                onClick={generate3DDesign}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating 3D Design...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate 3D Venue Design
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* View Controls */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                View Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Camera Zoom</Label>
                <Slider
                  value={[viewSettings.zoom]}
                  onValueChange={(value) => setViewSettings(prev => ({ ...prev, zoom: value[0] }))}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Render Quality</Label>
                <Select value={viewSettings.renderQuality} onValueChange={(value) => setViewSettings(prev => ({ ...prev, renderQuality: value }))}>
                  <SelectTrigger className="border-red-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Fast)</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High (Detailed)</SelectItem>
                    <SelectItem value="ultra">Ultra (Photorealistic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Display Options</Label>
                <div className="flex flex-col space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={viewSettings.showWireframe}
                      onChange={(e) => setViewSettings(prev => ({ ...prev, showWireframe: e.target.checked }))}
                      className="rounded border-red-300"
                    />
                    <span className="text-sm">Show Wireframe</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={viewSettings.showLighting}
                      onChange={(e) => setViewSettings(prev => ({ ...prev, showLighting: e.target.checked }))}
                      className="rounded border-red-300"
                    />
                    <span className="text-sm">Dynamic Lighting</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3D Visualization */}
        <div className="lg:col-span-3">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center justify-between">
                <div className="flex items-center">
                  <Box className="w-5 h-5 mr-2" />
                  {currentDesign ? currentDesign.name : "3D Venue Preview"}
                </div>
                {currentDesign && (
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Package className="w-4 h-4" />
                      <span>{currentDesign.furnitureItems.length} items</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Lightbulb className="w-4 h-4" />
                      <span>{currentDesign.lightingPlan.spotlights.length} lights</span>
                    </div>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-b from-blue-100 to-gray-100 rounded-lg p-4 min-h-[500px] border-2 border-dashed border-gray-300 relative overflow-hidden">
                {currentDesign ? (
                  <div className="relative h-full">
                    {/* 3D Scene Simulation */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-800 via-gray-600 to-blue-200 rounded-lg">
                      {/* Floor */}
                      <div 
                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-burgundy-100 to-burgundy-200 rounded-lg shadow-lg"
                        style={{ 
                          width: '80%', 
                          height: '60%',
                          perspective: '1000px',
                          transformStyle: 'preserve-3d',
                          transform: `rotateX(60deg) scale(${viewSettings.zoom})`
                        }}
                      >
                        {/* Furniture Items Visualization */}
                        {currentDesign.furnitureItems.slice(0, 20).map((item, index) => (
                          <div
                            key={item.id}
                            className="absolute rounded shadow-md border"
                            style={{
                              left: `${50 + (item.x / 20) * 30}%`,
                              top: `${50 + (item.z / 20) * 30}%`,
                              width: item.type === 'table' ? '20px' : item.type === 'sofa' ? '25px' : '8px',
                              height: item.type === 'table' ? '20px' : item.type === 'sofa' ? '15px' : '8px',
                              backgroundColor: item.color,
                              transform: `rotateZ(${item.rotation}deg) scale(${item.scale})`,
                              zIndex: item.type === 'chair' ? 1 : 2
                            }}
                            title={`${item.name} (${item.material})`}
                          />
                        ))}

                        {/* Lighting Effects */}
                        {viewSettings.showLighting && currentDesign.lightingPlan.accent.map((light, index) => (
                          <div
                            key={`light-${index}`}
                            className="absolute rounded-full opacity-30"
                            style={{
                              left: `${50 + (light.x / 20) * 30}%`,
                              top: `${50 + (light.y / 20) * 30}%`,
                              width: '40px',
                              height: '40px',
                              backgroundColor: light.color,
                              filter: 'blur(10px)',
                              animation: 'pulse 2s infinite'
                            }}
                          />
                        ))}
                      </div>

                      {/* 3D Grid Lines */}
                      <div className="absolute inset-0 opacity-20">
                        <svg width="100%" height="100%">
                          <defs>
                            <pattern id="3dgrid" width="30" height="30" patternUnits="userSpaceOnUse">
                              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#333" strokeWidth="1"/>
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill="url(#3dgrid)" />
                        </svg>
                      </div>

                      {/* Camera Position Indicator */}
                      <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded text-xs">
                        Camera: {viewSettings.camera.x}, {viewSettings.camera.y}, {viewSettings.camera.z}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Box className="w-20 h-20 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">3D Venue Designer</h3>
                    <p className="text-center max-w-md">
                      Configure your event parameters and generate a stunning 3D venue design with Agent-powered furniture placement and lighting optimization.
                    </p>
                  </div>
                )}
              </div>

              {currentDesign && (
                <div className="mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="font-semibold text-red-900">Furniture</div>
                      <div className="text-red-700">{currentDesign.furnitureItems.length} pieces</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="font-semibold text-red-900">Style</div>
                      <div className="text-red-700">{currentDesign.style}</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="font-semibold text-red-900">Colors</div>
                      <div className="flex space-x-1">
                        {currentDesign.colorPalette.slice(0, 3).map((color, i) => (
                          <div key={i} className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="font-semibold text-red-900">Lighting</div>
                      <div className="text-red-700">{currentDesign.lightingPlan.spotlights.length} spots</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="font-semibold text-red-900">Materials</div>
                      <div className="text-red-700">{currentDesign.floorMaterial}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}