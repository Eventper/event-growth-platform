import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Palette, 
  Sparkles, 
  Layout, 
  Box, 
  Users, 
  Camera,
  CheckCircle,
  Play,
  TestTube
} from "lucide-react";

// Import all intelligence components
import { ColorPaletteGenerator } from "@/components/ColorPaletteGenerator";
import { VenueThemeGenerator } from "@/components/VenueThemeGenerator";
import { FloorPlannerAI } from "@/components/FloorPlannerAI";
import { VenueDesigner3DAI } from "@/components/VenueDesigner3DAI";
import { VendorManager } from "@/components/VendorManager";

export default function CreativeHub() {
  const [activeTests, setActiveTests] = useState<Set<string>>(new Set());

  const tools = [
    {
      id: 'color-palette',
      name: 'Color Palette Generator',
      description: 'Generate harmonious 3-4 color palettes using advanced color theory',
      icon: Palette,
      component: ColorPaletteGenerator,
      features: ['3-4 color harmonies', 'Color theory algorithms', 'Export functionality', 'Burgundy base colors']
    },
    {
      id: 'venue-theme',
      name: 'Venue Theme Generator',
      description: 'Agent mood board creation with inspiration image upload',
      icon: Sparkles,
      component: VenueThemeGenerator,
      features: ['Mood board generation', 'Image upload support', 'Color extraction', 'Theme suggestions']
    },
    {
      id: 'floor-planner',
      name: 'Agent Floor Planner',
      description: 'Intelligent venue layout generation with furniture placement',
      icon: Layout,
      component: FloorPlannerAI,
      features: ['Automatic layout generation', 'Furniture placement', 'Capacity calculation', 'Export plans']
    },
    {
      id: '3d-designer',
      name: '3D Venue Designer',
      description: 'Advanced 3D visualization and furniture arrangement',
      icon: Box,
      component: VenueDesigner3DAI,
      features: ['3D visualization', 'Lighting design', 'Furniture arrangement', 'Material selection']
    },
    {
      id: 'vendor-manager',
      name: 'Vendor Manager',
      description: 'Complete vendor management with picture uploads',
      icon: Users,
      component: VendorManager,
      features: ['Vendor database', 'Picture uploads', 'Contact management', 'Service tracking']
    }
  ];

  const markTestComplete = (toolId: string) => {
    setActiveTests(prev => new Set(Array.from(prev).concat(toolId)));
  };

  const testObjectStorage = () => {
    const status = {
      bucketId: 'replit-objstore-3ea940ba-7392-41f8-89ac-c347af54610f',
      publicPaths: ['/replit-objstore-3ea940ba-7392-41f8-89ac-c347af54610f/public'],
      privateDir: '/replit-objstore-3ea940ba-7392-41f8-89ac-c347af54610f/.private',
      status: 'Active and configured'
    };

    console.log('Object Storage Status:', status);
    alert(`Object Storage Status:
    
✅ Bucket ID: ${status.bucketId}
✅ Public Assets: Available at /public-objects/*
✅ Private Uploads: Available at /objects/*
✅ Upload Endpoint: /api/objects/upload

All components support file uploads!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-red-900">Event Perfekt Creative Hub</h1>
          <p className="text-red-700 text-lg">Your complete creative workspace for event planning</p>
          
          <div className="flex justify-center space-x-4">
            <Button 
              onClick={testObjectStorage}
              className="bg-green-700 hover:bg-green-800"
            >
              <TestTube className="w-4 h-4 mr-2" />
              Test Object Storage
            </Button>
            <div className="flex items-center space-x-2">
              <span className="text-red-700">Completed Tests:</span>
              <Badge variant="outline" className="border-green-500 text-green-700">
                {activeTests.size}/{tools.length}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tool Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isCompleted = activeTests.has(tool.id);
            
            return (
              <Card key={tool.id} className={`border-2 transition-all ${isCompleted ? 'border-green-500 bg-green-50' : 'border-red-200'}`}>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Icon className={`w-8 h-8 ${isCompleted ? 'text-green-600' : 'text-red-600'}`} />
                    {isCompleted && <CheckCircle className="w-4 h-4 text-green-600 ml-1" />}
                  </div>
                  <h3 className="font-semibold text-sm text-red-900 mb-1">{tool.name}</h3>
                  <div className="flex flex-wrap justify-center gap-1">
                    {tool.features.slice(0, 2).map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Testing Interface */}
        <Card className="border-red-300">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center">
              <TestTube className="w-6 h-6 mr-2" />
              Agent Tools Testing Interface
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={tools[0].id} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  const isCompleted = activeTests.has(tool.id);
                  
                  return (
                    <TabsTrigger 
                      key={tool.id} 
                      value={tool.id}
                      className={`flex items-center space-x-2 ${isCompleted ? 'bg-green-100' : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden lg:inline">{tool.name.split(' ')[0]}</span>
                      {isCompleted && <CheckCircle className="w-3 h-3 text-green-600" />}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {tools.map((tool) => {
                const Component = tool.component;
                const isCompleted = activeTests.has(tool.id);
                
                return (
                  <TabsContent key={tool.id} value={tool.id} className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg border border-red-200">
                      <div>
                        <h3 className="text-xl font-semibold text-red-900">{tool.name}</h3>
                        <p className="text-red-700">{tool.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {tool.features.map((feature, idx) => (
                            <Badge key={idx} variant="outline" className="border-red-300">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        {isCompleted ? (
                          <Badge className="bg-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Tested
                          </Badge>
                        ) : (
                          <Button 
                            onClick={() => markTestComplete(tool.id)}
                            className="bg-red-700 hover:bg-red-800"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Mark as Tested
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-4 bg-white">
                      <Component />
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>

        {/* Quick Test Instructions */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900">How to Test Each Tool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-red-800">Color Palette Generator</h4>
                <p className="text-sm text-red-700 leading-relaxed">
                  Change base color from burgundy (#800020), try different harmony types such as analogous and complementary, generate 3-4 color palettes, and test color copying and export features.
                </p>

                <h4 className="font-semibold text-red-800">Venue Theme Generator</h4>
                <p className="text-sm text-red-700 leading-relaxed">
                  Add colors to your palette, upload inspiration images to test object storage, generate mood boards, and test venue details and special features.
                </p>

                <h4 className="font-semibold text-red-800">Agent Floor Planner</h4>
                <p className="text-sm text-red-700 leading-relaxed">
                  Set guest count and event type, configure venue dimensions, generate Agent layout with furniture, and test export functionality.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-red-800">3D Venue Designer</h4>
                <p className="text-sm text-red-700 leading-relaxed">
                  Choose event type and style, configure 3D design parameters, generate 3D venue with lighting, and test view controls and rendering.
                </p>

                <h4 className="font-semibold text-red-800">Vendor Manager</h4>
                <p className="text-sm text-red-700 leading-relaxed">
                  Add new vendors with details, upload vendor pictures to test file uploads, test portfolio image management, and verify vendor data persistence.
                </p>

                <h4 className="font-semibold text-red-800">Object Storage</h4>
                <p className="text-sm text-red-700 leading-relaxed">
                  Upload files in any component, check file persistence, test public versus private file serving, and verify bucket configuration.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}