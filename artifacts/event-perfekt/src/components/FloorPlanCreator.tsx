import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Square, 
  Circle, 
  Triangle, 
  Move, 
  RotateCw, 
  Trash2, 
  Download, 
  Upload, 
  Undo, 
  Redo, 
  Grid, 
  Ruler,
  Users,
  Utensils,
  Music,
  Flower,
  Camera,
  Lightbulb,
  Armchair,
  TreePine,
  Gift,
  Mic,
  FileText,
  Printer
} from "lucide-react";

interface FloorPlanElement {
  id: string;
  type: 'table' | 'stage' | 'bar' | 'entrance' | 'restroom' | 'dance-floor' | 'photo-booth' | 'buffet' | 'seating' | 'decoration' | 'lighting' | 'custom';
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

interface FloorPlanCreatorProps {
  eventId?: string;
  venueType?: string;
  guestCount?: number;
  onSave?: (floorPlan: FloorPlanElement[]) => void;
}

const ELEMENT_TYPES = [
  { type: 'table', icon: Utensils, label: 'Table', color: '#8B4513', defaultSize: { width: 60, height: 60 } },
  { type: 'stage', icon: Music, label: 'Stage', color: '#4B0082', defaultSize: { width: 100, height: 60 } },
  { type: 'bar', icon: Users, label: 'Bar', color: '#2F4F4F', defaultSize: { width: 80, height: 40 } },
  { type: 'entrance', icon: Square, label: 'Entrance', color: '#228B22', defaultSize: { width: 40, height: 60 } },
  { type: 'dance-floor', icon: Circle, label: 'Dance Floor', color: '#FF6347', defaultSize: { width: 80, height: 80 } },
  { type: 'photo-booth', icon: Camera, label: 'Photo Booth', color: '#FF1493', defaultSize: { width: 50, height: 50 } },
  { type: 'buffet', icon: Gift, label: 'Buffet', color: '#DAA520', defaultSize: { width: 120, height: 40 } },
  { type: 'seating', icon: Armchair, label: 'Seating Area', color: '#708090', defaultSize: { width: 80, height: 60 } },
  { type: 'decoration', icon: Flower, label: 'Decoration', color: '#FF69B4', defaultSize: { width: 30, height: 30 } },
  { type: 'lighting', icon: Lightbulb, label: 'Lighting', color: '#FFD700', defaultSize: { width: 20, height: 20 } },
];

export function FloorPlanCreator({ eventId, venueType, guestCount, onSave }: FloorPlanCreatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<FloorPlanElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [undoStack, setUndoStack] = useState<FloorPlanElement[][]>([]);
  const [redoStack, setRedoStack] = useState<FloorPlanElement[][]>([]);

  useEffect(() => {
    drawCanvas();
  }, [elements, selectedElement, showGrid, scale]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#E5E5E5';
      ctx.lineWidth = 1;
      const gridSize = 20 * scale;
      
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw elements
    elements.forEach(element => {
      ctx.save();
      
      // Apply transformations
      ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.translate(-element.width / 2, -element.height / 2);

      // Set styles
      ctx.fillStyle = element.color;
      ctx.strokeStyle = selectedElement === element.id ? '#FF6B6B' : '#333';
      ctx.lineWidth = selectedElement === element.id ? 3 : 1;

      // Draw shape
      if (element.shape === 'rectangle') {
        ctx.fillRect(0, 0, element.width, element.height);
        ctx.strokeRect(0, 0, element.width, element.height);
      } else if (element.shape === 'circle') {
        const radius = Math.min(element.width, element.height) / 2;
        ctx.beginPath();
        ctx.arc(element.width / 2, element.height / 2, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (element.shape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(element.width / 2, 0);
        ctx.lineTo(0, element.height);
        ctx.lineTo(element.width, element.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Draw label
      if (element.label) {
        ctx.fillStyle = '#FFF';
        ctx.font = `${12 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(element.label, element.width / 2, element.height / 2);
      }

      ctx.restore();
    });
  };

  const addElement = (elementType: string) => {
    const elementConfig = ELEMENT_TYPES.find(t => t.type === elementType);
    if (!elementConfig) return;

    const newElement: FloorPlanElement = {
      id: `element-${Date.now()}`,
      type: elementType as any,
      shape: 'rectangle',
      x: 100,
      y: 100,
      width: elementConfig.defaultSize.width,
      height: elementConfig.defaultSize.height,
      rotation: 0,
      color: elementConfig.color,
      label: elementConfig.label,
      capacity: elementType === 'table' ? 8 : undefined
    };

    saveToUndoStack();
    setElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked element
    const clickedElement = elements.find(element => {
      return x >= element.x && x <= element.x + element.width &&
             y >= element.y && y <= element.y + element.height;
    });

    if (clickedElement) {
      setSelectedElement(clickedElement.id);
      setIsDragging(true);
      setDragOffset({
        x: x - clickedElement.x,
        y: y - clickedElement.y
      });
    } else {
      if (selectedTool !== 'select') {
        addElement(selectedTool);
      } else {
        setSelectedElement(null);
      }
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedElement) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setElements(prev => prev.map(element => 
      element.id === selectedElement
        ? { ...element, x: x - dragOffset.x, y: y - dragOffset.y }
        : element
    ));
  };

  const handleCanvasMouseUp = () => {
    if (isDragging) {
      saveToUndoStack();
    }
    setIsDragging(false);
  };

  const saveToUndoStack = () => {
    setUndoStack(prev => [...prev.slice(-19), [...elements]]);
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [elements, ...prev.slice(0, 19)]);
      setElements(previousState);
      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[0];
      setUndoStack(prev => [...prev, elements]);
      setElements(nextState);
      setRedoStack(prev => prev.slice(1));
    }
  };

  const deleteSelected = () => {
    if (selectedElement) {
      saveToUndoStack();
      setElements(prev => prev.filter(el => el.id !== selectedElement));
      setSelectedElement(null);
    }
  };

  const rotateSelected = () => {
    if (selectedElement) {
      saveToUndoStack();
      setElements(prev => prev.map(el => 
        el.id === selectedElement 
          ? { ...el, rotation: (el.rotation + 45) % 360 }
          : el
      ));
    }
  };

  const generateTemplate = () => {
    const templates = {
      wedding: [
        { type: 'stage', x: 350, y: 50 },
        { type: 'dance-floor', x: 320, y: 150 },
        { type: 'table', x: 100, y: 200 },
        { type: 'table', x: 200, y: 200 },
        { type: 'table', x: 500, y: 200 },
        { type: 'table', x: 600, y: 200 },
        { type: 'buffet', x: 50, y: 400 },
        { type: 'bar', x: 600, y: 400 },
        { type: 'photo-booth', x: 700, y: 100 },
      ],
      corporate: [
        { type: 'stage', x: 300, y: 50 },
        { type: 'seating', x: 100, y: 150 },
        { type: 'seating', x: 250, y: 150 },
        { type: 'seating', x: 400, y: 150 },
        { type: 'seating', x: 550, y: 150 },
        { type: 'buffet', x: 200, y: 350 },
        { type: 'bar', x: 500, y: 350 },
      ]
    };

    const templateType = venueType?.toLowerCase().includes('wedding') ? 'wedding' : 'corporate';
    const template = templates[templateType] || templates.corporate;

    const templateElements = template.map((item, index) => {
      const elementConfig = ELEMENT_TYPES.find(t => t.type === item.type);
      return {
        id: `template-${index}`,
        type: item.type as any,
        shape: 'rectangle' as const,
        x: item.x,
        y: item.y,
        width: elementConfig?.defaultSize.width || 60,
        height: elementConfig?.defaultSize.height || 60,
        rotation: 0,
        color: elementConfig?.color || '#888',
        label: elementConfig?.label || item.type,
        capacity: item.type === 'table' ? 8 : undefined
      };
    });

    saveToUndoStack();
    setElements(templateElements);
  };

  const exportFloorPlan = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `floor-plan-${eventId || 'design'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const exportFloorPlanToPDF = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Dynamic import
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape for floor plans
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      
      // Header
      pdf.setFillColor(139, 21, 56);
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Event Perfekt', 20, 17);
      
      pdf.setFontSize(12);
      pdf.text('Floor Plan Design', pageWidth - 20, 17, { align: 'right' });
      
      pdf.setTextColor(0, 0, 0);
      let yPos = 40;
      
      // Event Details
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Floor Plan Overview', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      if (eventId) pdf.text(`Event ID: ${eventId}`, 20, yPos), yPos += 8;
      if (venueType) pdf.text(`Venue Type: ${venueType}`, 20, yPos), yPos += 8;
      if (guestCount) pdf.text(`Guest Count: ${guestCount}`, 20, yPos), yPos += 8;
      pdf.text(`Total Seating Capacity: ${totalCapacity}`, 20, yPos);
      pdf.text(`Elements Count: ${elements.length}`, 150, yPos);
      yPos += 15;
      
      // Floor Plan Image
      const canvasDataUrl = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(canvasDataUrl, 'PNG', 20, yPos, imgWidth, Math.min(imgHeight, pageHeight - yPos - 40));
      
      // Element Legend (if space allows)
      if (yPos + imgHeight + 20 < pageHeight - 60) {
        yPos += imgHeight + 20;
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Element Details', 20, yPos);
        yPos += 10;
        
        const elementsByType = elements.reduce((acc, el) => {
          if (!acc[el.type]) acc[el.type] = [];
          acc[el.type].push(el);
          return acc;
        }, {} as Record<string, FloorPlanElement[]>);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        Object.entries(elementsByType).forEach(([type, items]) => {
          if (yPos > pageHeight - 20) return;
          pdf.text(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${items.length} items`, 20, yPos);
          yPos += 6;
        });
      }
      
      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Generated by Event Perfekt - ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      pdf.save(`Floor_Plan_${eventId || 'Design'}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    }
  };

  const selectedElementData = elements.find(el => el.id === selectedElement);
  const totalCapacity = elements.reduce((sum, el) => sum + (el.capacity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center space-x-3">
            <Grid className="w-8 h-8" />
            <div>
              <div>Floor Plan Creator</div>
              <div className="text-sm font-normal opacity-90">Interactive Venue Layout Designer</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-white/20 rounded-lg p-4">
              <Ruler className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">Precise Layout</div>
              <div className="text-sm opacity-90">Drag & drop elements</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <Users className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">Capacity Planning</div>
              <div className="text-sm opacity-90">Optimize guest seating</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <Download className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">Export Design</div>
              <div className="text-sm opacity-90">Share with clients</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Tools Panel */}
        <div className="lg:col-span-1">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Square className="w-5 h-5" />
                <span>Tools & Elements</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Action Tools */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Actions</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedTool === 'select' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTool('select')}
                    className="flex items-center justify-center"
                  >
                    <Move className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGrid(!showGrid)}
                    className={showGrid ? 'bg-blue-50' : ''}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={undo}
                    disabled={undoStack.length === 0}
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={redo}
                    disabled={redoStack.length === 0}
                  >
                    <Redo className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Element Types */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Add Elements</Label>
                <div className="space-y-2">
                  {ELEMENT_TYPES.map((elementType) => {
                    const Icon = elementType.icon;
                    return (
                      <Button
                        key={elementType.type}
                        variant={selectedTool === elementType.type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTool(elementType.type)}
                        className="w-full justify-start"
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {elementType.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Quick Actions */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Quick Actions</Label>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateTemplate}
                    className="w-full"
                  >
                    <Grid className="w-4 h-4 mr-2" />
                    Generate Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportFloorPlan}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export PNG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportFloorPlanToPDF}
                    className="w-full bg-burgundy-50 hover:bg-burgundy-100 text-burgundy-700 border-burgundy-200"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Element Properties */}
          {selectedElementData && (
            <Card className="mt-4 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Element Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={selectedElementData.label}
                    onChange={(e) => {
                      setElements(prev => prev.map(el => 
                        el.id === selectedElement 
                          ? { ...el, label: e.target.value }
                          : el
                      ));
                    }}
                  />
                </div>

                {selectedElementData.type === 'table' && (
                  <div>
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      value={selectedElementData.capacity || 8}
                      onChange={(e) => {
                        setElements(prev => prev.map(el => 
                          el.id === selectedElement 
                            ? { ...el, capacity: parseInt(e.target.value) || 8 }
                            : el
                        ));
                      }}
                    />
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={rotateSelected}
                    className="flex-1"
                  >
                    <RotateCw className="w-4 h-4 mr-1" />
                    Rotate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteSelected}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Canvas Area */}
        <div className="lg:col-span-3">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Ruler className="w-5 h-5" />
                  <span>Floor Plan Canvas</span>
                </CardTitle>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>Total Capacity: {totalCapacity}</span>
                  </div>
                  <Badge variant="outline">
                    {elements.length} elements
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  className="cursor-crosshair"
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Instructions:</strong></p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Select an element type from the left panel, then click on the canvas to add it</li>
                  <li>Click and drag elements to move them around</li>
                  <li>Click on an element to select it and view/edit its properties</li>
                  <li>Use "Generate Template" to create a starter layout based on your event type</li>
                  <li>Export your design as a PNG image to share with clients</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}