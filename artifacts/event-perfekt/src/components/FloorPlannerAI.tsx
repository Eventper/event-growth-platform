import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Layout, 
  Sparkles, 
  RefreshCw, 
  Download, 
  Ruler, 
  Users, 
  Grid, 
  RotateCcw,
  Save,
  Eye,
  Settings,
  Maximize2
} from "lucide-react";

interface VenueDimensions {
  length: number;
  width: number;
  height: number;
  shape: 'rectangle' | 'square' | 'circle' | 'l-shape' | 'u-shape' | 'irregular';
}

interface FloorPlanElement {
  id: string;
  type: 'table' | 'chair' | 'stage' | 'dance_floor' | 'bar' | 'entrance' | 'buffet' | 'photo_booth';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity?: number;
  color: string;
  label: string;
}

interface FloorPlanData {
  id: string;
  name: string;
  venueSection: string;
  dimensions: VenueDimensions;
  elements: FloorPlanElement[];
  totalCapacity: number;
  aiGenerated: boolean;
}

export function FloorPlannerAI() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<FloorPlanData | null>(null);
  const [planRequirements, setPlanRequirements] = useState({
    guestCount: 50,
    eventType: 'wedding',
    venueSection: 'reception',
    style: 'traditional',
    specialRequirements: '',
    hasStage: false,
    hasDanceFloor: true,
    hasBar: true,
    hasBuffet: false,
    tableStyle: 'round',
    preferredLayout: 'clustered'
  });

  const [dimensions, setDimensions] = useState<VenueDimensions>({
    length: 30,
    width: 20,
    height: 12,
    shape: 'rectangle'
  });

  const generateFloorPlan = async () => {
    setIsGenerating(true);
    
    // Simulate floor plan generation
    const mockElements: FloorPlanElement[] = [];
    let elementId = 1;

    // Add entrance
    mockElements.push({
      id: `entrance-${elementId++}`,
      type: 'entrance',
      x: dimensions.width / 2 - 2,
      y: 0,
      width: 4,
      height: 2,
      rotation: 0,
      color: '#800020',
      label: 'Main Entrance'
    });

    // Add dance floor if requested
    if (planRequirements.hasDanceFloor) {
      mockElements.push({
        id: `dance-${elementId++}`,
        type: 'dance_floor',
        x: dimensions.width / 2 - 4,
        y: dimensions.length / 2 - 3,
        width: 8,
        height: 6,
        rotation: 0,
        color: '#FFD700',
        label: 'Dance Floor'
      });
    }

    // Add stage if requested
    if (planRequirements.hasStage) {
      mockElements.push({
        id: `stage-${elementId++}`,
        type: 'stage',
        x: dimensions.width - 6,
        y: dimensions.length / 2 - 2,
        width: 6,
        height: 4,
        rotation: 0,
        color: '#2F4F4F',
        label: 'Performance Stage'
      });
    }

    // Add bar if requested
    if (planRequirements.hasBar) {
      mockElements.push({
        id: `bar-${elementId++}`,
        type: 'bar',
        x: 0,
        y: dimensions.length - 8,
        width: 8,
        height: 3,
        rotation: 0,
        color: '#8B0000',
        label: 'Bar Area'
      });
    }

    // Add buffet if requested
    if (planRequirements.hasBuffet) {
      mockElements.push({
        id: `buffet-${elementId++}`,
        type: 'buffet',
        x: 0,
        y: 2,
        width: 6,
        height: 2,
        rotation: 0,
        color: '#A0522D',
        label: 'Buffet Station'
      });
    }

    // Calculate tables needed based on guest count
    const seatsPerTable = planRequirements.tableStyle === 'round' ? 8 : 6;
    const tablesNeeded = Math.ceil(planRequirements.guestCount / seatsPerTable);
    const tableSize = planRequirements.tableStyle === 'round' ? 5 : 4;

    // Add tables in clusters or rows based on preferred layout
    for (let i = 0; i < tablesNeeded; i++) {
      let x, y;
      if (planRequirements.preferredLayout === 'clustered') {
        const cluster = Math.floor(i / 4);
        const posInCluster = i % 4;
        x = 2 + (cluster % 2) * 12 + (posInCluster % 2) * (tableSize + 2);
        y = 4 + Math.floor(cluster / 2) * 10 + Math.floor(posInCluster / 2) * (tableSize + 2);
      } else {
        x = 2 + (i % 4) * (tableSize + 2);
        y = 4 + Math.floor(i / 4) * (tableSize + 2);
      }

      mockElements.push({
        id: `table-${elementId++}`,
        type: 'table',
        x: Math.min(x, dimensions.width - tableSize),
        y: Math.min(y, dimensions.length - tableSize),
        width: tableSize,
        height: tableSize,
        rotation: 0,
        capacity: seatsPerTable,
        color: '#CD5C5C',
        label: `Table ${i + 1}`
      });
    }

    const generatedPlan: FloorPlanData = {
      id: `plan-${Date.now()}`,
      name: `${planRequirements.eventType} ${planRequirements.venueSection} Layout`,
      venueSection: planRequirements.venueSection,
      dimensions,
      elements: mockElements,
      totalCapacity: tablesNeeded * seatsPerTable,
      aiGenerated: true
    };

    setTimeout(() => {
      setCurrentPlan(generatedPlan);
      setIsGenerating(false);
    }, 2000);
  };

  const exportFloorPlan = () => {
    if (!currentPlan) return;
    
    const dataStr = JSON.stringify(currentPlan, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentPlan.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-red-900">Agent Floor Planner</h2>
          <p className="text-red-700">Generate optimal venue layouts with intelligent furniture placement</p>
        </div>
        {currentPlan && (
          <Button onClick={exportFloorPlan} className="bg-red-800 hover:bg-red-900">
            <Download className="w-4 h-4 mr-2" />
            Export Plan
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Event Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Guest Count</Label>
                  <Input
                    type="number"
                    value={planRequirements.guestCount}
                    onChange={(e) => setPlanRequirements(prev => ({ ...prev, guestCount: parseInt(e.target.value) || 0 }))}
                    className="border-red-200"
                  />
                </div>
                <div>
                  <Label>Event Type</Label>
                  <Select value={planRequirements.eventType} onValueChange={(value) => setPlanRequirements(prev => ({ ...prev, eventType: value }))}>
                    <SelectTrigger className="border-red-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="corporate">Corporate Event</SelectItem>
                      <SelectItem value="birthday">Birthday Party</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Venue Section</Label>
                  <Select value={planRequirements.venueSection} onValueChange={(value) => setPlanRequirements(prev => ({ ...prev, venueSection: value }))}>
                    <SelectTrigger className="border-red-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ceremony">Ceremony</SelectItem>
                      <SelectItem value="reception">Reception</SelectItem>
                      <SelectItem value="cocktail">Cocktail Hour</SelectItem>
                      <SelectItem value="conference">Conference Room</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Table Style</Label>
                  <Select value={planRequirements.tableStyle} onValueChange={(value) => setPlanRequirements(prev => ({ ...prev, tableStyle: value }))}>
                    <SelectTrigger className="border-red-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round">Round Tables</SelectItem>
                      <SelectItem value="rectangular">Rectangular Tables</SelectItem>
                      <SelectItem value="mixed">Mixed Styles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Layout Preference</Label>
                <Select value={planRequirements.preferredLayout} onValueChange={(value) => setPlanRequirements(prev => ({ ...prev, preferredLayout: value }))}>
                  <SelectTrigger className="border-red-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clustered">Clustered Groups</SelectItem>
                    <SelectItem value="linear">Linear Arrangement</SelectItem>
                    <SelectItem value="u-shape">U-Shape Formation</SelectItem>
                    <SelectItem value="theater">Theater Style</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Additional Features</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'hasStage', label: 'Performance Stage' },
                    { key: 'hasDanceFloor', label: 'Dance Floor' },
                    { key: 'hasBar', label: 'Bar Area' },
                    { key: 'hasBuffet', label: 'Buffet Station' }
                  ].map(({ key, label }) => (
                    <Badge
                      key={key}
                      variant={planRequirements[key as keyof typeof planRequirements] ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setPlanRequirements(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Special Requirements</Label>
                <Textarea
                  value={planRequirements.specialRequirements}
                  onChange={(e) => setPlanRequirements(prev => ({ ...prev, specialRequirements: e.target.value }))}
                  placeholder="Any specific layout requirements..."
                  className="border-red-200"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center">
                <Ruler className="w-5 h-5 mr-2" />
                Venue Dimensions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Length (ft)</Label>
                  <Input
                    type="number"
                    value={dimensions.length}
                    onChange={(e) => setDimensions(prev => ({ ...prev, length: parseInt(e.target.value) || 0 }))}
                    className="border-red-200"
                  />
                </div>
                <div>
                  <Label>Width (ft)</Label>
                  <Input
                    type="number"
                    value={dimensions.width}
                    onChange={(e) => setDimensions(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))}
                    className="border-red-200"
                  />
                </div>
              </div>

              <div>
                <Label>Room Shape</Label>
                <Select value={dimensions.shape} onValueChange={(value: any) => setDimensions(prev => ({ ...prev, shape: value }))}>
                  <SelectTrigger className="border-red-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rectangle">Rectangle</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="l-shape">L-Shape</SelectItem>
                    <SelectItem value="u-shape">U-Shape</SelectItem>
                    <SelectItem value="irregular">Irregular</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={generateFloorPlan}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating Agent Layout...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Agent Floor Plan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Floor Plan Visualization */}
        <div className="lg:col-span-2">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center justify-between">
                <div className="flex items-center">
                  <Layout className="w-5 h-5 mr-2" />
                  {currentPlan ? currentPlan.name : "Floor Plan Preview"}
                </div>
                {currentPlan && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span>Capacity: {currentPlan.totalCapacity}</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 min-h-[400px] border-2 border-dashed border-gray-300 relative overflow-hidden">
                {currentPlan ? (
                  <div 
                    className="relative bg-white border border-gray-400"
                    style={{
                      width: `${Math.min(dimensions.width * 10, 500)}px`,
                      height: `${Math.min(dimensions.length * 10, 400)}px`,
                      margin: 'auto'
                    }}
                  >
                    {/* Render floor plan elements */}
                    {currentPlan.elements.map((element) => (
                      <div
                        key={element.id}
                        className="absolute border-2 border-gray-600 flex items-center justify-center text-xs font-semibold text-white rounded shadow-sm"
                        style={{
                          left: `${(element.x / dimensions.width) * 100}%`,
                          top: `${(element.y / dimensions.length) * 100}%`,
                          width: `${(element.width / dimensions.width) * 100}%`,
                          height: `${(element.height / dimensions.length) * 100}%`,
                          backgroundColor: element.color,
                          transform: `rotate(${element.rotation}deg)`
                        }}
                        title={`${element.label}${element.capacity ? ` (${element.capacity} seats)` : ''}`}
                      >
                        <span className="truncate px-1">{element.label}</span>
                      </div>
                    ))}
                    
                    {/* Grid overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      <svg width="100%" height="100%" className="opacity-20">
                        <defs>
                          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ccc" strokeWidth="1"/>
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-white" style={{color: 'white !important'}}>
                    <Layout className="w-16 h-16 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Agent Floor Plan Generator</h3>
                    <p className="text-center max-w-md">
                      Configure your event requirements and venue dimensions, then generate an optimized floor plan with intelligent furniture placement.
                    </p>
                  </div>
                )}
              </div>

              {currentPlan && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="font-semibold text-red-900">Total Tables</div>
                    <div className="text-red-700">{currentPlan.elements.filter(e => e.type === 'table').length}</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="font-semibold text-red-900">Capacity</div>
                    <div className="text-red-700">{currentPlan.totalCapacity} guests</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="font-semibold text-red-900">Features</div>
                    <div className="text-red-700">{currentPlan.elements.filter(e => e.type !== 'table').length} special</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="font-semibold text-red-900">Layout</div>
                    <div className="text-red-700">{planRequirements.preferredLayout}</div>
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