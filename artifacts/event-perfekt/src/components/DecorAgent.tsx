import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Sparkles, Camera, Download, RefreshCw, Heart, Star, Wand2, Lightbulb, Flower } from "lucide-react";

interface MoodBoardItem {
  id: string;
  type: 'color' | 'texture' | 'style' | 'element';
  name: string;
  description: string;
  color?: string;
  imageUrl?: string;
  tags: string[];
}

interface DecorSuggestion {
  id: string;
  category: string;
  item: string;
  description: string;
  priority: 'essential' | 'recommended' | 'optional';
  estimatedCost: number;
  colorMatch: number;
  styleMatch: number;
}

interface DecorAgentProps {
  eventId: string;
  eventType: string;
  primaryColors: string[];
  secondaryColors?: string[];
  theme?: string;
  venue?: string;
  guestCount?: number;
  budget?: number;
  onMoodBoardGenerated?: (moodBoard: MoodBoardItem[]) => void;
  onDecorPlanGenerated?: (decorPlan: DecorSuggestion[]) => void;
}

const COLOR_PALETTES = {
  'burgundy-white': {
    primary: ['#800020', '#FFFFFF'],
    secondary: ['#B22222', '#F5F5F5', '#8B0000'],
    accent: ['#FFFFFF', '#F8F8FF', '#2F2F2F'],
    name: 'Burgundy & White'
  },
  'burgundy-accent': {
    primary: ['#800020', '#FFFFFF'],
    secondary: ['#B22222', '#F0F0F0', '#DC143C'],
    accent: ['#FFFFFF', '#F5F5DC', '#2F4F4F'],
    name: 'Burgundy & Accent'
  },
  'navy-silver': {
    primary: ['#000080', '#C0C0C0'],
    secondary: ['#191970', '#708090', '#4169E1'],
    accent: ['#FFFFFF', '#F8F8FF', '#2F4F4F'],
    name: 'Navy & Silver'
  },
  'blush-champagne': {
    primary: ['#FFC0CB', '#F7E7CE'],
    secondary: ['#FFB6C1', '#DDD6C0', '#F0E68C'],
    accent: ['#FFFFFF', '#FFF8DC', '#8B7D6B'],
    name: 'Blush & Champagne'
  }
};

const DECOR_CATEGORIES = [
  'Centerpieces',
  'Lighting',
  'Linens & Fabrics',
  'Floral Arrangements',
  'Backdrop & Staging',
  'Table Settings',
  'Ceremony Decor',
  'Reception Decor',
  'Entrance & Welcome',
  'Dance Floor & Entertainment'
];

export function DecorAgent({
  eventId,
  eventType,
  primaryColors,
  secondaryColors = [],
  theme,
  venue,
  guestCount,
  budget,
  onMoodBoardGenerated,
  onDecorPlanGenerated
}: DecorAgentProps) {
  const [moodBoard, setMoodBoard] = useState<MoodBoardItem[]>([]);
  const [decorSuggestions, setDecorSuggestions] = useState<DecorSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [colorInput, setColorInput] = useState('');
  const [customTheme, setCustomTheme] = useState(theme || '');
  const [selectedPalette, setSelectedPalette] = useState<string>('');
  const [showMoodBoard, setShowMoodBoard] = useState(false);
  const [showDecorPlan, setShowDecorPlan] = useState(false);

  // Auto-detect color palette from client input
  useEffect(() => {
    if (primaryColors.length > 0) {
      const colorStr = primaryColors.join(' ').toLowerCase();
      if (colorStr.includes('burgundy') && colorStr.includes('white')) {
        setSelectedPalette('burgundy-white');
      } else if (colorStr.includes('burgundy')) {
        setSelectedPalette('burgundy-accent');
      } else if (colorStr.includes('navy') && colorStr.includes('silver')) {
        setSelectedPalette('navy-silver');
      } else if (colorStr.includes('blush') || colorStr.includes('pink')) {
        setSelectedPalette('blush-champagne');
      }
      generateMoodBoard();
    }
  }, [primaryColors]);

  const generateMoodBoard = async () => {
    setIsGenerating(true);
    
    // Simulate mood board generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const palette = selectedPalette ? COLOR_PALETTES[selectedPalette as keyof typeof COLOR_PALETTES] : null;
    const colors = palette ? [...palette.primary, ...palette.secondary] : primaryColors;
    
    const generatedMoodBoard: MoodBoardItem[] = [
      // Color swatches
      ...colors.slice(0, 5).map((color, index) => ({
        id: `color-${index}`,
        type: 'color' as const,
        name: `Primary Color ${index + 1}`,
        description: `Main event color`,
        color: color,
        tags: ['primary', 'base']
      })),
      
      // Style elements based on event type
      {
        id: 'style-1',
        type: 'style',
        name: eventType === 'wedding' ? 'Romantic Elegance' : 'Corporate Sophistication',
        description: eventType === 'wedding' ? 'Soft, romantic styling with elegant touches' : 'Clean, professional aesthetic with modern elements',
        tags: [eventType, 'elegant', 'sophisticated']
      },
      
      // Texture suggestions
      {
        id: 'texture-1',
        type: 'texture',
        name: 'Metallic Accents',
        description: 'Gold/silver metallic elements for luxury feel',
        tags: ['metallic', 'luxury', 'accent']
      },
      
      {
        id: 'texture-2',
        type: 'texture',
        name: 'Soft Fabrics',
        description: 'Silk, chiffon, or satin textures',
        tags: ['fabric', 'soft', 'elegant']
      },
      
      // Floral elements
      {
        id: 'element-1',
        type: 'element',
        name: 'Floral Arrangements',
        description: `${palette?.name || 'Custom'} themed flower arrangements`,
        tags: ['floral', 'natural', 'centerpiece']
      }
    ];
    
    setMoodBoard(generatedMoodBoard);
    setShowMoodBoard(true);
    onMoodBoardGenerated?.(generatedMoodBoard);
    
    // Auto-generate decor plan
    generateDecorPlan(generatedMoodBoard);
    setIsGenerating(false);
  };

  const generateDecorPlan = (moodBoardData: MoodBoardItem[]) => {
    const suggestions: DecorSuggestion[] = [
      // Centerpieces
      {
        id: 'center-1',
        category: 'Centerpieces',
        item: `${selectedPalette ? COLOR_PALETTES[selectedPalette as keyof typeof COLOR_PALETTES].name : 'Custom'} Floral Centerpieces`,
        description: 'Elegant floral arrangements matching color palette',
        priority: 'essential',
        estimatedCost: 150,
        colorMatch: 95,
        styleMatch: 90
      },
      
      // Lighting
      {
        id: 'light-1',
        category: 'Lighting',
        item: 'Warm Ambient Lighting',
        description: 'String lights and uplighting in complementary colors',
        priority: 'essential',
        estimatedCost: 300,
        colorMatch: 85,
        styleMatch: 95
      },
      
      // Linens
      {
        id: 'linen-1',
        category: 'Linens & Fabrics',
        item: 'Color-Coordinated Table Linens',
        description: 'Table runners and napkins in primary colors',
        priority: 'recommended',
        estimatedCost: 200,
        colorMatch: 100,
        styleMatch: 80
      },
      
      // Backdrop
      {
        id: 'backdrop-1',
        category: 'Backdrop & Staging',
        item: 'Photo Backdrop',
        description: 'Elegant backdrop incorporating event colors and theme',
        priority: 'recommended',
        estimatedCost: 250,
        colorMatch: 90,
        styleMatch: 85
      },
      
      // Additional suggestions based on event type
      ...(eventType === 'wedding' ? [
        {
          id: 'wedding-1',
          category: 'Ceremony Decor',
          item: 'Altar Arrangements',
          description: 'Beautiful floral arrangements for ceremony altar',
          priority: 'essential' as const,
          estimatedCost: 300,
          colorMatch: 95,
          styleMatch: 100
        }
      ] : [
        {
          id: 'corporate-1',
          category: 'Reception Decor',
          item: 'Corporate Branding Elements',
          description: 'Subtle branding integration with color scheme',
          priority: 'recommended' as const,
          estimatedCost: 180,
          colorMatch: 85,
          styleMatch: 90
        }
      ])
    ];
    
    setDecorSuggestions(suggestions);
    setShowDecorPlan(true);
    onDecorPlanGenerated?.(suggestions);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'essential': return 'bg-red-100 text-red-800 border-red-200';
      case 'recommended': return 'bg-burgundy-100 text-burgundy-800 border-burgundy-200';
      case 'optional': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const totalDecorCost = decorSuggestions.reduce((sum, item) => sum + item.estimatedCost, 0);

  return (
    <div className="space-y-6">
      {/* Decor Agent Header */}
      <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center space-x-3">
            <Wand2 className="w-8 h-8" />
            <div>
              <div>Agent Decor Agent</div>
              <div className="text-sm font-normal opacity-90">Intelligent Mood Board & Decor Planning</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-white/20 rounded-lg p-4">
              <Palette className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">Color Analysis</div>
              <div className="text-sm opacity-90">Smart palette detection</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <Sparkles className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">Mood Board</div>
              <div className="text-sm opacity-90">Auto-generated designs</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <Lightbulb className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">Decor Plan</div>
              <div className="text-sm opacity-90">Intelligent suggestions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Input & Generation */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Event Colors & Theme</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Primary Colors (from event form)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {primaryColors.map((color, index) => (
                  <Badge key={index} className="bg-purple-100 text-purple-800">
                    {color}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Auto-Detected Palette</Label>
              {selectedPalette && (
                <div className="mt-2">
                  <Badge className="bg-green-100 text-green-800">
                    {COLOR_PALETTES[selectedPalette as keyof typeof COLOR_PALETTES].name}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={generateMoodBoard}
              disabled={isGenerating || primaryColors.length === 0}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Mood Board & Decor Plan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Mood Board */}
      {showMoodBoard && (
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Camera className="w-6 h-6" />
                <span>Agent-Generated Mood Board</span>
              </div>
              <Button variant="outline" size="sm" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {moodBoard.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                  {item.type === 'color' && (
                    <div
                      className="w-full h-20 rounded-lg mb-3 border-2 border-gray-200"
                      style={{ backgroundColor: item.color }}
                    ></div>
                  )}
                  {item.type !== 'color' && (
                    <div className="w-full h-20 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                      {item.type === 'style' && <Star className="w-8 h-8 text-gray-400" />}
                      {item.type === 'texture' && <Sparkles className="w-8 h-8 text-gray-400" />}
                      {item.type === 'element' && <Flower className="w-8 h-8 text-gray-400" />}
                    </div>
                  )}
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Decor Plan */}
      {showDecorPlan && (
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-6 h-6" />
                <span>Agent Venue Decor Plan</span>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">Estimated Total</div>
                <div className="text-lg font-bold">${totalDecorCost.toLocaleString()}</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {DECOR_CATEGORIES.map((category) => {
                const categoryItems = decorSuggestions.filter(item => item.category === category);
                if (categoryItems.length === 0) return null;
                
                return (
                  <div key={category} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-lg mb-3 text-gray-900">{category}</h4>
                    <div className="space-y-3">
                      {categoryItems.map((suggestion) => (
                        <div key={suggestion.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h5 className="font-medium text-gray-900">{suggestion.item}</h5>
                                <Badge className={getPriorityColor(suggestion.priority)}>
                                  {suggestion.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                              <div className="flex items-center space-x-4 text-xs">
                                <div className="flex items-center space-x-1">
                                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                  <span>Color Match: {suggestion.colorMatch}%</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <span>Style Match: {suggestion.styleMatch}%</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                ${suggestion.estimatedCost}
                              </div>
                              <div className="text-xs text-gray-500">estimated</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-green-800">Decor Plan Summary</h4>
                  <p className="text-sm text-green-700">
                    {decorSuggestions.filter(s => s.priority === 'essential').length} essential items, 
                    {decorSuggestions.filter(s => s.priority === 'recommended').length} recommended items
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-800">${totalDecorCost.toLocaleString()}</div>
                  <div className="text-sm text-green-600">Total Estimated Cost</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}