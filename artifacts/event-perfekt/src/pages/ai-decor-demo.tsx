import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Zap
} from "lucide-react";

// Import Intelligence Components
import { ColorPaletteGenerator } from "@/components/ColorPaletteGenerator";
import { VenueThemeGenerator } from "@/components/VenueThemeGenerator";
import { FloorPlanCreator } from "@/components/FloorPlanCreator";
import { VenueDesigner3D } from "@/components/VenueDesigner3D";
import { DecorPlanGenerator } from "@/components/DecorPlanGenerator";

export default function AIDecorDemo() {
  const [, setLocation] = useLocation();
  const [activeDemo, setActiveDemo] = useState<string>("overview");
  const [demoProgress, setDemoProgress] = useState<string[]>([]);

  // Mock event data for demo
  const mockEventData = {
    id: "demo-event-001",
    name: "Elegant Anniversary Celebration",
    type: "anniversary",
    guestCount: 150,
    budget: 25000,
    currency: "USD",
    venue: "Grand Ballroom at The Historic Manor",
    theme: "Romantic Elegance",
    colors: ["#800020", "#F5F5DC", "#FFD700", "#2F4F4F"]
  };

  const demoSteps = [
    {
      id: "colors",
      title: "Agent Color Palette Generation",
      description: "Generate harmonious color schemes using advanced color theory algorithms",
      icon: Palette,
      component: ColorPaletteGenerator,
      features: [
        "3-4 color harmony generation",
        "Color theory algorithms (complementary, triadic, analogous)",
        "Mood-based color selection",
        "Export to design tools"
      ]
    },
    {
      id: "themes",
      title: "Venue Theme & Mood Board Creation",
      description: "Agent-powered mood board generation with inspiration image analysis",
      icon: Sparkles,
      component: VenueThemeGenerator,
      features: [
        "Mood board creation",
        "Image upload and analysis",
        "Color extraction from images",
        "Theme suggestion algorithms"
      ]
    },
    {
      id: "floor-plan",
      title: "2D Floor Plan Designer",
      description: "Intelligent 2D floor plan generation with optimal furniture placement",
      icon: Layout,
      component: FloorPlanCreator,
      features: [
        "Automatic layout generation based on guest count",
        "Drag-and-drop furniture placement",
        "Capacity calculations",
        "Traffic flow optimization",
        "Export to PNG/PDF"
      ]
    },
    {
      id: "3d-design",
      title: "3D Venue Visualization",
      description: "Advanced 3D venue design with lighting and material simulation",
      icon: Box,
      component: VenueDesigner3D,
      features: [
        "Real-time 3D rendering",
        "Lighting design simulation",
        "Material and texture selection",
        "360° venue walkthroughs",
        "Camera angle presets"
      ]
    },
    {
      id: "decor-plan",
      title: "Complete Decor Planning",
      description: "Comprehensive decor planning with vendor integration and cost analysis",
      icon: Wand2,
      component: DecorPlanGenerator,
      features: [
        "Item recommendation by category",
        "Vendor marketplace integration",
        "Budget optimization",
        "Cost breakdowns by category",
        "Vendor comparison tools"
      ]
    }
  ];

  const runCompleteDemo = () => {
    setDemoProgress([]);
    demoSteps.forEach((step, index) => {
      setTimeout(() => {
        setDemoProgress(prev => [...prev, step.id]);
        if (index === 0) setActiveDemo(step.id);
      }, index * 1000);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setLocation('/planner-dashboard')}
              className="flex items-center space-x-2 text-red-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-red-900">Agent Decor Suite Demo</h1>
              <p className="text-red-700">Complete Agent-powered event design workflow</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              onClick={runCompleteDemo}
              className="bg-red-600 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Complete Demo
            </Button>
            <Badge variant="outline" className="text-red-700 border-red-300">
              Event Perfekt Agent Suite
            </Badge>
          </div>
        </div>

        {/* Demo Overview */}
        {activeDemo === "overview" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {demoSteps.map((step) => {
              const IconComponent = step.icon;
              const isCompleted = demoProgress.includes(step.id);
              
              return (
                <Card 
                  key={step.id}
                  className={`cursor-pointer transition-all duration-300 ${
                    isCompleted ? 'bg-green-50 border-green-300' : 'bg-white/10 border-red-300'
                  }`}
                  onClick={() => setActiveDemo(step.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <IconComponent className={`w-8 h-8 ${isCompleted ? 'text-green-600' : 'text-red-600'}`} />
                      {isCompleted && <Badge className="bg-green-100 text-green-800">Completed</Badge>}
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{step.description}</p>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-red-700">Key Features:</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {step.features.slice(0, 3).join(" • ")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Demo Content */}
        {activeDemo !== "overview" && (
          <div className="space-y-6">
            {/* Demo Navigation */}
            <Card className="bg-white/10 border-red-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      onClick={() => setActiveDemo("overview")}
                      className="text-red-700"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Overview
                    </Button>
                    <div>
                      <h2 className="text-xl font-bold text-red-900">
                        {demoSteps.find(s => s.id === activeDemo)?.title}
                      </h2>
                      <p className="text-red-700">
                        {demoSteps.find(s => s.id === activeDemo)?.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {demoSteps.map((step) => (
                      <Button
                        key={step.id}
                        variant={activeDemo === step.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveDemo(step.id)}
                        className={activeDemo === step.id ? "bg-red-600 text-white" : "border-red-300 text-red-700"}
                      >
                        {step.title.split(' ')[0]}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Event Context */}
            <Card className="bg-white/20 border-red-300">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Demo Event Context
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold text-red-800">Event Details</h4>
                    <p className="text-sm text-gray-700">{mockEventData.name}</p>
                    <p className="text-sm text-gray-600">{mockEventData.type} • {mockEventData.guestCount} guests</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800">Venue & Budget</h4>
                    <p className="text-sm text-gray-700">{mockEventData.venue}</p>
                    <p className="text-sm text-gray-600">${mockEventData.budget.toLocaleString()} {mockEventData.currency}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800">Theme & Colors</h4>
                    <p className="text-sm text-gray-700">{mockEventData.theme}</p>
                    <div className="flex space-x-1 mt-1">
                      {mockEventData.colors.map((color, index) => (
                        <div
                          key={index}
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Component */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {activeDemo === "colors" && <ColorPaletteGenerator />}
              {activeDemo === "themes" && <VenueThemeGenerator />}
              {activeDemo === "floor-plan" && (
                <FloorPlanCreator
                  eventId={mockEventData.id}
                  venueType="ballroom"
                  guestCount={mockEventData.guestCount}
                />
              )}
              {activeDemo === "3d-design" && (
                <VenueDesigner3D
                  eventId={mockEventData.id}
                  venueType="ballroom"
                  eventTheme={mockEventData.theme}
                  primaryColors={mockEventData.colors}
                />
              )}
              {activeDemo === "decor-plan" && (
                <DecorPlanGenerator
                  eventId={mockEventData.id}
                  eventDetails={{
                    name: mockEventData.name,
                    type: mockEventData.type,
                    guestCount: mockEventData.guestCount,
                    budget: mockEventData.budget,
                    currency: mockEventData.currency,
                    venue: mockEventData.venue,
                    theme: mockEventData.theme,
                    colors: mockEventData.colors
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Intelligence Capabilities Footer */}
        <Card className="bg-gradient-to-r from-red-600 to-red-700 text-white border-0">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold">Event Perfekt Agent-Powered Design Suite</h3>
              <p className="text-red-100 max-w-3xl mx-auto">
                Experience the future of event planning with our comprehensive Agent toolkit. From intelligent color theory 
                to 3D venue visualization, our Agents work alongside professional planners to create extraordinary events.
              </p>
              <div className="flex justify-center space-x-6 text-sm text-red-100">
                <span>• Color Theory Algorithms</span>
                <span>• 2D Floor Planning</span>
                <span>• 3D Visualization</span>
                <span>• Vendor Integration</span>
                <span>• Budget Optimization</span>
              </div>
              <div className="pt-4">
                <Badge className="bg-white text-red-700 font-semibold">
                  Powered by Event Perfekt Global Ltd
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}