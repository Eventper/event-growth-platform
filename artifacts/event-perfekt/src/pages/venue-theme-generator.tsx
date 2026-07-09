import { useState } from "react";
import { useLocation } from "wouter";
import { VenueThemeGenerator } from "@/components/VenueThemeGenerator";
import { DecorAgent } from "@/components/DecorAgent";
import { FloorPlanDesigner } from "@/components/FloorPlanDesigner";
import PlannerLayout from "@/components/PlannerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Palette, Bot, Grid, Building2, ExternalLink, ArrowLeft, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VenueDesignStudio() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("themes");

  const tabs = [
    { id: "themes", label: "Venue Themes", icon: Palette, description: "Generate and customize event themes" },
    { id: "ai-decor", label: "Agent Decor Agent", icon: Bot, description: "Agent-powered decor recommendations" },
    { id: "floor-plan", label: "Floor Plan Designer", icon: Grid, description: "Create 2D venue layouts" },
    { id: "homestyler", label: "Homestyler 3D", icon: ExternalLink, description: "Professional 3D venue design with realistic rendering and walkthroughs" },
    { id: "vendor-portfolio", label: "Decor Vendors", icon: Building2, description: "Browse decor vendor portfolios" },
  ];

  const renderActiveContent = () => {
    switch (activeTab) {
      case "themes":
        return <VenueThemeGenerator />;
      case "ai-decor":
        return <DecorAgent eventId="demo-event" eventType="private" primaryColors={["#8B1538", "#FFD700"]} />;
      case "floor-plan":
        return <FloorPlanDesigner eventId="demo-event" />;
      case "homestyler":
        return (
          <div className="p-6 space-y-6">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#330311] to-[#8B1538] p-8 text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-3">Design with Homestyler</h3>
                <p className="text-white/80 text-sm leading-relaxed mb-6 max-w-lg">
                  Homestyler is a powerful 3D design tool that lets you create photorealistic venue layouts. 
                  Design your event space with drag-and-drop furniture, lighting, materials, and take virtual walkthroughs of your venue.
                </p>
                <div className="grid sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-lg font-bold mb-1">Realistic Rendering</div>
                    <p className="text-xs text-white/70">Photorealistic 3D views of your venue with real-world lighting and materials</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-lg font-bold mb-1">Furniture Library</div>
                    <p className="text-xs text-white/70">Thousands of items — tables, chairs, stage elements, and fixtures</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-lg font-bold mb-1">Virtual Walkthrough</div>
                    <p className="text-xs text-white/70">Walk through your design in first-person view before the event</p>
                  </div>
                </div>
                <a
                  href="https://www.homestyler.com/int/floorplan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#330311] font-semibold rounded-lg hover:bg-white/90 transition-colors shadow-lg"
                >
                  <ExternalLink className="w-4 h-4" /> Open Homestyler 3D Designer
                </a>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowLeft className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">Coming back to Event Perfekt</p>
                  <p className="text-xs text-blue-700 leading-relaxed">Homestyler opens in a new browser tab. When you're done designing, simply close that tab or click back on the Event Perfekt tab in your browser to return here. Your Homestyler project is saved to your Homestyler account automatically.</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Download className="w-4 h-4 text-green-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-900 mb-1">Saving & Exporting Your Design</p>
                  <p className="text-xs text-green-700 leading-relaxed mb-2">Homestyler automatically saves your work as you design. To export or share your finished design:</p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Click the Render button (camera icon) in Homestyler to generate high-quality images of your design. Download the rendered images as JPG/PNG files to your computer. Use the Share button to get a shareable link you can send to clients for review. Go to My Projects in Homestyler to access all your saved designs anytime.
                  </p>
                </div>
              </div>
            </div>

            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <p className="text-sm text-amber-800">
                  <strong>Tip:</strong> Create your floor plan in the Floor Plan Designer tab first, then use Homestyler to bring it to life with realistic 3D rendering. 
                  Export your Homestyler designs and share them with clients for approval.
                </p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">How to use Homestyler for your event:</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="w-6 h-6 rounded-full bg-[#8B1538] text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Create a free Homestyler account</p>
                    <p className="text-xs text-gray-500">Sign up at homestyler.com (free), then draw your room layout using their floor plan tools</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="w-6 h-6 rounded-full bg-[#8B1538] text-white text-xs flex items-center justify-center font-bold shrink-0">2</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Add furniture and decor</p>
                    <p className="text-xs text-gray-500">Browse the library for tables, chairs, stage elements, and more</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="w-6 h-6 rounded-full bg-[#8B1538] text-white text-xs flex items-center justify-center font-bold shrink-0">3</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Apply materials and lighting</p>
                    <p className="text-xs text-gray-500">Set wall colours, floor materials, and lighting to match your theme</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="w-6 h-6 rounded-full bg-[#8B1538] text-white text-xs flex items-center justify-center font-bold shrink-0">4</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Render, export and share</p>
                    <p className="text-xs text-gray-500">Click "Render" for photorealistic images, download them, and use "Share" to send a link to your client</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "vendor-portfolio":
        return (
          <div className="p-6">
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Decor Vendor Portfolio</h3>
              <p className="text-gray-500 mb-4">Browse and manage your preferred decor vendors</p>
              <Button onClick={() => setLocation('/decor-vendor-portfolio')} style={{ backgroundColor: '#330311', color: 'white' }}>
                View Full Portfolio
              </Button>
            </div>
          </div>
        );
      default:
        return <VenueThemeGenerator />;
    }
  };

  return (
    <PlannerLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Venue Design Studio</h1>
          <p className="text-white/60">Complete design suite for venue planning and décor</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200 bg-white rounded-t-lg">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    data-testid={`tab-${tab.id}`}
                    className={cn(
                      "py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2",
                      activeTab === tab.id
                        ? "border-burgundy-500 text-burgundy-600"
                        : "border-transparent text-gray-500"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Tab Description */}
          <div className="bg-white px-6 py-3 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm">
          {renderActiveContent()}
        </div>
      </div>
    </PlannerLayout>
  );
}