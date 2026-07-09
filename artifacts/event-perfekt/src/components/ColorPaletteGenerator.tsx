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
  Palette, 
  Sparkles, 
  RefreshCw, 
  Download, 
  Copy, 
  Plus,
  Trash2,
  Eye,
  Heart,
  Star,
  Shuffle,
  Settings,
  Lightbulb,
  Zap
} from "lucide-react";

interface ColorInfo {
  hex: string;
  name: string;
  role: 'primary' | 'secondary' | 'accent' | 'neutral';
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
}

interface GeneratedPalette {
  id: string;
  name: string;
  description: string;
  colors: ColorInfo[];
  mood: string;
  style: string;
  season: string;
  usage: string[];
  harmony: string;
}

interface PaletteParams {
  baseColor: string;
  eventType: string;
  mood: string;
  season: string;
  style: string;
  colorCount: number;
  harmony: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'tetradic' | 'split-complementary';
  brightness: number;
  saturation: number;
  temperature: 'warm' | 'cool' | 'neutral';
}

export function ColorPaletteGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPalettes, setGeneratedPalettes] = useState<GeneratedPalette[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<GeneratedPalette | null>(null);
  const [paletteParams, setPaletteParams] = useState<PaletteParams>({
    baseColor: '#800020',
    eventType: 'wedding',
    mood: 'romantic',
    season: 'any',
    style: 'elegant',
    colorCount: 4,
    harmony: 'analogous',
    brightness: 50,
    saturation: 70,
    temperature: 'warm'
  });

  // Color harmony calculations
  const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  const hslToHex = (h: number, s: number, l: number): string => {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hue2rgb(p, q, h + 1/3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1/3);

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return "#" + toHex(r) + toHex(g) + toHex(b);
  };

  const generateHarmoniousColors = (baseHsl: { h: number; s: number; l: number }, harmony: string, count: number): ColorInfo[] => {
    const colors: ColorInfo[] = [];
    const { h, s, l } = baseHsl;

    // Adjust saturation and lightness based on params
    const adjustedS = Math.min(100, Math.max(0, s * (paletteParams.saturation / 100)));
    const adjustedL = Math.min(100, Math.max(0, l * (paletteParams.brightness / 100)));

    switch (harmony) {
      case 'monochromatic':
        for (let i = 0; i < count; i++) {
          const lightness = Math.max(10, Math.min(90, adjustedL + (i - count/2) * 20));
          const saturation = Math.max(20, Math.min(90, adjustedS + (i % 2) * 20));
          colors.push(createColorInfo(hslToHex(h, saturation, lightness), i === 0 ? 'primary' : i === 1 ? 'secondary' : i === 2 ? 'accent' : 'neutral'));
        }
        break;

      case 'analogous':
        for (let i = 0; i < count; i++) {
          const hue = (h + (i * 30) - 30) % 360;
          const lightness = adjustedL + (i % 2) * 15;
          colors.push(createColorInfo(hslToHex(hue, adjustedS, lightness), i === 0 ? 'primary' : i === 1 ? 'secondary' : i === 2 ? 'accent' : 'neutral'));
        }
        break;

      case 'complementary':
        colors.push(createColorInfo(hslToHex(h, adjustedS, adjustedL), 'primary'));
        colors.push(createColorInfo(hslToHex((h + 180) % 360, adjustedS, adjustedL), 'secondary'));
        if (count > 2) {
          colors.push(createColorInfo(hslToHex(h, adjustedS * 0.3, adjustedL + 30), 'accent'));
        }
        if (count > 3) {
          colors.push(createColorInfo(hslToHex((h + 180) % 360, adjustedS * 0.3, adjustedL + 30), 'neutral'));
        }
        break;

      case 'triadic':
        for (let i = 0; i < Math.min(count, 3); i++) {
          const hue = (h + i * 120) % 360;
          colors.push(createColorInfo(hslToHex(hue, adjustedS, adjustedL), i === 0 ? 'primary' : i === 1 ? 'secondary' : 'accent'));
        }
        if (count > 3) {
          colors.push(createColorInfo(hslToHex(h, adjustedS * 0.2, adjustedL + 40), 'neutral'));
        }
        break;

      case 'tetradic':
        const hues = [h, (h + 90) % 360, (h + 180) % 360, (h + 270) % 360];
        for (let i = 0; i < Math.min(count, 4); i++) {
          colors.push(createColorInfo(hslToHex(hues[i], adjustedS, adjustedL), i === 0 ? 'primary' : i === 1 ? 'secondary' : i === 2 ? 'accent' : 'neutral'));
        }
        break;

      case 'split-complementary':
        colors.push(createColorInfo(hslToHex(h, adjustedS, adjustedL), 'primary'));
        colors.push(createColorInfo(hslToHex((h + 150) % 360, adjustedS, adjustedL), 'secondary'));
        colors.push(createColorInfo(hslToHex((h + 210) % 360, adjustedS, adjustedL), 'accent'));
        if (count > 3) {
          colors.push(createColorInfo(hslToHex(h, adjustedS * 0.2, adjustedL + 35), 'neutral'));
        }
        break;
    }

    return colors.slice(0, count);
  };

  const createColorInfo = (hex: string, role: ColorInfo['role']): ColorInfo => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const hsl = hexToHsl(hex);

    // Generate color names based on hue
    const colorNames: { [key: number]: string } = {
      0: 'Crimson', 30: 'Amber', 60: 'Gold', 120: 'Emerald', 180: 'Azure', 240: 'Sapphire', 300: 'Amethyst'
    };
    
    let closestHue = 0;
    let minDifference = 360;
    
    Object.keys(colorNames).forEach(hueStr => {
      const hue = parseInt(hueStr);
      const difference = Math.abs(hsl.h - hue);
      if (difference < minDifference) {
        minDifference = difference;
        closestHue = hue;
      }
    });

    const baseName = colorNames[closestHue] || 'Burgundy';
    const lightness = hsl.l > 70 ? 'Light ' : hsl.l < 30 ? 'Deep ' : '';
    const saturation = hsl.s > 80 ? 'Vibrant ' : hsl.s < 30 ? 'Muted ' : '';

    return {
      hex,
      name: `${saturation}${lightness}${baseName}`,
      role,
      rgb: { r, g, b },
      hsl
    };
  };

  const generateColorPalettes = async () => {
    setIsGenerating(true);

    const baseHsl = hexToHsl(paletteParams.baseColor);
    const colors = generateHarmoniousColors(baseHsl, paletteParams.harmony, paletteParams.colorCount);

    // Generate multiple palette variations
    const palettes: GeneratedPalette[] = [];

    // Main palette
    palettes.push({
      id: `palette-${Date.now()}`,
      name: `${paletteParams.eventType.charAt(0).toUpperCase() + paletteParams.eventType.slice(1)} ${paletteParams.harmony} Palette`,
      description: `A ${paletteParams.mood} ${paletteParams.harmony} color scheme perfect for ${paletteParams.eventType} events`,
      colors,
      mood: paletteParams.mood,
      style: paletteParams.style,
      season: paletteParams.season,
      usage: ['decor', 'floral', 'linens', 'lighting'],
      harmony: paletteParams.harmony
    });

    // Lighter variation
    const lighterColors = colors.map(color => ({
      ...color,
      hex: hslToHex(color.hsl.h, color.hsl.s * 0.8, Math.min(90, color.hsl.l * 1.3)),
      name: `Light ${color.name}`
    }));

    palettes.push({
      id: `palette-light-${Date.now()}`,
      name: `Light ${paletteParams.harmony} Variation`,
      description: `A softer, lighter interpretation with enhanced brightness`,
      colors: lighterColors,
      mood: paletteParams.mood,
      style: paletteParams.style,
      season: paletteParams.season,
      usage: ['ceremony', 'daytime', 'outdoor'],
      harmony: paletteParams.harmony
    });

    // Darker/richer variation
    const richerColors = colors.map(color => ({
      ...color,
      hex: hslToHex(color.hsl.h, Math.min(100, color.hsl.s * 1.2), Math.max(15, color.hsl.l * 0.7)),
      name: `Rich ${color.name}`
    }));

    palettes.push({
      id: `palette-rich-${Date.now()}`,
      name: `Rich ${paletteParams.harmony} Variation`,
      description: `A deeper, more luxurious interpretation with enhanced saturation`,
      colors: richerColors,
      mood: paletteParams.mood,
      style: paletteParams.style,
      season: paletteParams.season,
      usage: ['evening', 'formal', 'luxury'],
      harmony: paletteParams.harmony
    });

    setTimeout(() => {
      setGeneratedPalettes(palettes);
      setSelectedPalette(palettes[0]);
      setIsGenerating(false);
    }, 1500);
  };

  const copyColorToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
  };

  const exportPalette = (palette: GeneratedPalette) => {
    const dataStr = JSON.stringify(palette, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${palette.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-red-900">Color Palette Generator</h2>
          <p className="text-red-700">Create harmonious 3-4 color palettes with Agent-powered color theory</p>
        </div>
        {selectedPalette && (
          <Button onClick={() => exportPalette(selectedPalette)} className="bg-red-800 hover:bg-red-900">
            <Download className="w-4 h-4 mr-2" />
            Export Palette
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Palette Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Base Color</Label>
                <div className="flex space-x-2 mt-2">
                  <Input
                    type="color"
                    value={paletteParams.baseColor}
                    onChange={(e) => setPaletteParams(prev => ({ ...prev, baseColor: e.target.value }))}
                    className="w-16 h-10 border-red-200"
                  />
                  <Input
                    value={paletteParams.baseColor}
                    onChange={(e) => setPaletteParams(prev => ({ ...prev, baseColor: e.target.value }))}
                    className="flex-1 border-red-200"
                    placeholder="#800020"
                  />
                </div>
              </div>

              <div>
                <Label>Color Count (3-4 recommended)</Label>
                <Select value={paletteParams.colorCount.toString()} onValueChange={(value) => setPaletteParams(prev => ({ ...prev, colorCount: parseInt(value) }))}>
                  <SelectTrigger className="border-red-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Colors</SelectItem>
                    <SelectItem value="4">4 Colors</SelectItem>
                    <SelectItem value="5">5 Colors</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Color Harmony</Label>
                <Select value={paletteParams.harmony} onValueChange={(value: any) => setPaletteParams(prev => ({ ...prev, harmony: value }))}>
                  <SelectTrigger className="border-red-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="analogous">Analogous</SelectItem>
                    <SelectItem value="complementary">Complementary</SelectItem>
                    <SelectItem value="triadic">Triadic</SelectItem>
                    <SelectItem value="monochromatic">Monochromatic</SelectItem>
                    <SelectItem value="split-complementary">Split Complementary</SelectItem>
                    <SelectItem value="tetradic">Tetradic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Event Type</Label>
                  <Select value={paletteParams.eventType} onValueChange={(value) => setPaletteParams(prev => ({ ...prev, eventType: value }))}>
                    <SelectTrigger className="border-red-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="gala">Gala</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mood</Label>
                  <Select value={paletteParams.mood} onValueChange={(value) => setPaletteParams(prev => ({ ...prev, mood: value }))}>
                    <SelectTrigger className="border-red-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="romantic">Romantic</SelectItem>
                      <SelectItem value="elegant">Elegant</SelectItem>
                      <SelectItem value="vibrant">Vibrant</SelectItem>
                      <SelectItem value="sophisticated">Sophisticated</SelectItem>
                      <SelectItem value="rustic">Rustic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Brightness: {paletteParams.brightness}%</Label>
                <Slider
                  value={[paletteParams.brightness]}
                  onValueChange={(value) => setPaletteParams(prev => ({ ...prev, brightness: value[0] }))}
                  min={20}
                  max={90}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Saturation: {paletteParams.saturation}%</Label>
                <Slider
                  value={[paletteParams.saturation]}
                  onValueChange={(value) => setPaletteParams(prev => ({ ...prev, saturation: value[0] }))}
                  min={30}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>

              <Button 
                onClick={generateColorPalettes}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating Palettes...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Color Palettes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Generated Palettes */}
        <div className="lg:col-span-3">
          {generatedPalettes.length > 0 ? (
            <div className="space-y-6">
              {/* Palette Selection */}
              <div className="flex space-x-4 overflow-x-auto pb-2">
                {generatedPalettes.map((palette) => (
                  <Button
                    key={palette.id}
                    variant={selectedPalette?.id === palette.id ? "default" : "outline"}
                    className="flex-shrink-0"
                    onClick={() => setSelectedPalette(palette)}
                  >
                    {palette.name}
                  </Button>
                ))}
              </div>

              {/* Selected Palette Display */}
              {selectedPalette && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-900 flex items-center justify-between">
                      <div className="flex items-center">
                        <Palette className="w-5 h-5 mr-2" />
                        {selectedPalette.name}
                      </div>
                      <Badge variant="outline">{selectedPalette.harmony}</Badge>
                    </CardTitle>
                    <p className="text-red-700">{selectedPalette.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Color Swatches */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedPalette.colors.map((color, index) => (
                        <div key={index} className="space-y-2">
                          <div 
                            className="w-full h-24 rounded-lg border-2 border-gray-300 cursor-pointer relative group"
                            style={{ backgroundColor: color.hex }}
                            onClick={() => copyColorToClipboard(color.hex)}
                            title="Click to copy hex code"
                          >
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                              <Copy className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-sm text-red-900">{color.name}</div>
                            <div className="text-xs text-red-700 font-mono">{color.hex}</div>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {color.role}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Color Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-red-900 mb-3">Usage Recommendations</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPalette.usage.map((use, index) => (
                            <Badge key={index} variant="outline" className="border-red-300">
                              {use}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-red-900 mb-3">Palette Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-red-700">Mood:</span>
                            <span className="text-red-900 font-medium">{selectedPalette.mood}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-700">Style:</span>
                            <span className="text-red-900 font-medium">{selectedPalette.style}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-700">Color Count:</span>
                            <span className="text-red-900 font-medium">{selectedPalette.colors.length} colors</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Color Codes */}
                    <div>
                      <h4 className="font-semibold text-red-900 mb-3">Color Codes</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedPalette.colors.map((color, index) => (
                          <div key={index} className="bg-red-50 p-3 rounded-lg border border-red-200">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-8 h-8 rounded border border-gray-300"
                                style={{ backgroundColor: color.hex }}
                              />
                              <div className="flex-1">
                                <div className="font-medium text-red-900">{color.name}</div>
                                <div className="text-xs space-y-1">
                                  <div className="font-mono">HEX: {color.hex}</div>
                                  <div className="font-mono">RGB: {color.rgb.r}, {color.rgb.g}, {color.rgb.b}</div>
                                  <div className="font-mono">HSL: {Math.round(color.hsl.h)}°, {Math.round(color.hsl.s)}%, {Math.round(color.hsl.l)}%</div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyColorToClipboard(color.hex)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="border-red-200">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="w-16 h-16 text-white mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2" style={{color: 'white !important'}}>Color Palette Generator</h3>
                <p className="text-center text-white max-w-md" style={{color: 'white !important'}}>
                  Configure your color preferences and generate harmonious 3-4 color palettes using advanced color theory. 
                  Perfect for creating cohesive event design schemes.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}