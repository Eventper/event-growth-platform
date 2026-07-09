import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Users, Crown, Save, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginSectionEditor() {
  const { toast } = useToast();
  
  const [config, setConfig] = useState({
    sectionTitle: "Already working with Event Perfekt?",
    clientPortal: {
      title: "Client Portal",
      description: "Track your event progress, view proposals, approve vendors, and communicate with your planner",
      buttonText: "Access My Event",
      url: "/client-login"
    },
    plannerSuite: {
      title: "Planner Suite", 
      description: "Manage events, access Agent tools, coordinate vendors, and deliver exceptional experiences",
      buttonText: "Open Dashboard",
      url: "/planner-login"
    },
    styling: {
      backgroundColor: "#8B1538",
      hoverColor: "#6B1027",
      textColor: "#ffffff",
      borderRadius: "8px",
      padding: "16px 32px",
      fontSize: "18px"
    }
  });

  const [previewMode, setPreviewMode] = useState(false);

  const handleConfigChange = (section: string, field: string, value: string) => {
    setConfig(prev => {
      const sectionData = prev[section as keyof typeof prev];
      if (typeof sectionData === 'object' && sectionData !== null) {
        return {
          ...prev,
          [section]: {
            ...sectionData,
            [field]: value
          }
        };
      }
      return prev;
    });
  };

  const handleStylingChange = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      styling: {
        ...prev.styling,
        [field]: value
      }
    }));
  };

  const generateCode = () => {
    return `
<div className="mt-12 pt-8 bg-black/40 backdrop-blur-md rounded-xl border border-white/30 p-8" style={{ position: 'relative', zIndex: 10 }}>
  <h3 className="text-white font-bold text-2xl mb-6 text-center">${config.sectionTitle}</h3>
  <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
    {/* Client Portal */}
    <Card className="bg-white/90 backdrop-blur-sm border-2 border-burgundy-200 transition-colors shadow-2xl">
      <CardContent className="p-8 text-center">
        <Users className="w-12 h-12 text-burgundy-600 mx-auto mb-4" />
        <h4 className="text-burgundy-800 font-bold text-xl mb-3">${config.clientPortal.title}</h4>
        <p className="text-gray-700 text-base mb-6 leading-relaxed">
          ${config.clientPortal.description}
        </p>
        <a 
          href="${config.clientPortal.url}" 
          className="w-full text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 shadow-lg flex items-center justify-between"
          style={{ 
            backgroundColor: '${config.styling.backgroundColor}',
            fontSize: '${config.styling.fontSize}',
            borderRadius: '${config.styling.borderRadius}',
            padding: '${config.styling.padding}',
            textDecoration: 'none',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '${config.styling.hoverColor}'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '${config.styling.backgroundColor}'}
        >
          <span>${config.clientPortal.buttonText}</span>
          <ArrowRight className="w-5 h-5" style={{ color: '${config.styling.textColor}' }} />
        </a>
      </CardContent>
    </Card>

    {/* Planner Suite */}
    <Card className="bg-white/90 backdrop-blur-sm border-2 border-burgundy-200 transition-colors shadow-2xl">
      <CardContent className="p-8 text-center">
        <Crown className="w-12 h-12 text-burgundy-600 mx-auto mb-4" />
        <h4 className="text-burgundy-800 font-bold text-xl mb-3">${config.plannerSuite.title}</h4>
        <p className="text-gray-700 text-base mb-6 leading-relaxed">
          ${config.plannerSuite.description}
        </p>
        <a 
          href="${config.plannerSuite.url}" 
          className="w-full text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 shadow-lg flex items-center justify-between"
          style={{ 
            backgroundColor: '${config.styling.backgroundColor}',
            fontSize: '${config.styling.fontSize}',
            borderRadius: '${config.styling.borderRadius}',
            padding: '${config.styling.padding}',
            textDecoration: 'none',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '${config.styling.hoverColor}'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '${config.styling.backgroundColor}'}
        >
          <span>${config.plannerSuite.buttonText}</span>
          <ArrowRight className="w-5 h-5" style={{ color: '${config.styling.textColor}' }} />
        </a>
      </CardContent>
    </Card>
  </div>
</div>
    `.trim();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateCode());
    toast({
      title: "Code Copied!",
      description: "The login section code has been copied to your clipboard.",
    });
  };

  const PreviewSection = () => (
    <div className="mt-12 pt-8 bg-black/40 backdrop-blur-md rounded-xl border border-white/30 p-8">
      <h3 className="text-white font-bold text-2xl mb-6 text-center">{config.sectionTitle}</h3>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Client Portal */}
        <Card className="bg-white/90 backdrop-blur-sm border-2 border-burgundy-200 transition-colors shadow-2xl">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-burgundy-600 mx-auto mb-4" />
            <h4 className="text-burgundy-800 font-bold text-xl mb-3">{config.clientPortal.title}</h4>
            <p className="text-gray-700 text-base mb-6 leading-relaxed">
              {config.clientPortal.description}
            </p>
            <div 
              className="w-full text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 shadow-lg flex items-center justify-between cursor-pointer"
              style={{ 
                backgroundColor: config.styling.backgroundColor,
                fontSize: config.styling.fontSize,
                borderRadius: config.styling.borderRadius,
                padding: config.styling.padding
              }}
            >
              <span>{config.clientPortal.buttonText}</span>
              <ArrowRight className="w-5 h-5" style={{ color: config.styling.textColor }} />
            </div>
          </CardContent>
        </Card>

        {/* Planner Suite */}
        <Card className="bg-white/90 backdrop-blur-sm border-2 border-burgundy-200 transition-colors shadow-2xl">
          <CardContent className="p-8 text-center">
            <Crown className="w-12 h-12 text-burgundy-600 mx-auto mb-4" />
            <h4 className="text-burgundy-800 font-bold text-xl mb-3">{config.plannerSuite.title}</h4>
            <p className="text-gray-700 text-base mb-6 leading-relaxed">
              {config.plannerSuite.description}
            </p>
            <div 
              className="w-full text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 shadow-lg flex items-center justify-between cursor-pointer"
              style={{ 
                backgroundColor: config.styling.backgroundColor,
                fontSize: config.styling.fontSize,
                borderRadius: config.styling.borderRadius,
                padding: config.styling.padding
              }}
            >
              <span>{config.plannerSuite.buttonText}</span>
              <ArrowRight className="w-5 h-5" style={{ color: config.styling.textColor }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Login Section Editor</h1>
          <p className="text-white/80">Customize the login section text, styling, and behavior</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Editor Panel */}
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Section Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sectionTitle" className="text-white">Section Title</Label>
                  <Input
                    id="sectionTitle"
                    value={config.sectionTitle}
                    onChange={(e) => setConfig(prev => ({ ...prev, sectionTitle: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Client Portal</Label>
                    <Input
                      placeholder="Title"
                      value={config.clientPortal.title}
                      onChange={(e) => handleConfigChange('clientPortal', 'title', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mb-2"
                    />
                    <Textarea
                      placeholder="Description"
                      value={config.clientPortal.description}
                      onChange={(e) => handleConfigChange('clientPortal', 'description', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mb-2"
                      rows={3}
                    />
                    <Input
                      placeholder="Button Text"
                      value={config.clientPortal.buttonText}
                      onChange={(e) => handleConfigChange('clientPortal', 'buttonText', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mb-2"
                    />
                    <Input
                      placeholder="Button URL"
                      value={config.clientPortal.url}
                      onChange={(e) => handleConfigChange('clientPortal', 'url', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Planner Suite</Label>
                    <Input
                      placeholder="Title"
                      value={config.plannerSuite.title}
                      onChange={(e) => handleConfigChange('plannerSuite', 'title', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mb-2"
                    />
                    <Textarea
                      placeholder="Description"
                      value={config.plannerSuite.description}
                      onChange={(e) => handleConfigChange('plannerSuite', 'description', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mb-2"
                      rows={3}
                    />
                    <Input
                      placeholder="Button Text"
                      value={config.plannerSuite.buttonText}
                      onChange={(e) => handleConfigChange('plannerSuite', 'buttonText', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mb-2"
                    />
                    <Input
                      placeholder="Button URL"
                      value={config.plannerSuite.url}
                      onChange={(e) => handleConfigChange('plannerSuite', 'url', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Button Styling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Background Color</Label>
                    <Input
                      type="color"
                      value={config.styling.backgroundColor}
                      onChange={(e) => handleStylingChange('backgroundColor', e.target.value)}
                      className="bg-white/10 border-white/20 h-12"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Hover Color</Label>
                    <Input
                      type="color"
                      value={config.styling.hoverColor}
                      onChange={(e) => handleStylingChange('hoverColor', e.target.value)}
                      className="bg-white/10 border-white/20 h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Text Color</Label>
                    <Input
                      type="color"
                      value={config.styling.textColor}
                      onChange={(e) => handleStylingChange('textColor', e.target.value)}
                      className="bg-white/10 border-white/20 h-12"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Font Size</Label>
                    <Input
                      value={config.styling.fontSize}
                      onChange={(e) => handleStylingChange('fontSize', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="18px"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Border Radius</Label>
                    <Input
                      value={config.styling.borderRadius}
                      onChange={(e) => handleStylingChange('borderRadius', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="8px"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Padding</Label>
                    <Input
                      value={config.styling.padding}
                      onChange={(e) => handleStylingChange('padding', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="16px 32px"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                onClick={() => setPreviewMode(!previewMode)}
                className="flex-1 bg-white/20 text-white"
              >
                <Eye className="w-4 h-4 mr-2" />
                {previewMode ? 'Edit Mode' : 'Preview Mode'}
              </Button>
              <Button
                onClick={copyToClipboard}
                className="flex-1 bg-green-600 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 rounded-lg p-6">
            <h3 className="text-white text-xl font-bold mb-6">Live Preview</h3>
            <PreviewSection />
          </div>
        </div>

        {/* Generated Code Display */}
        {!previewMode && (
          <Card className="mt-8 bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Generated Code</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-black/50 text-green-400 p-4 rounded text-sm overflow-x-auto">
                {generateCode()}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}