import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Palette, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Plus,
  Home,
  Building,
  TreePine,
  Heart,
  Star,
  Camera,
  Lightbulb,
  Flower,
  Upload,
  Image,
  Trash2
} from "lucide-react";
import { ObjectUploader } from "./ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import type { UploadResult } from "@uppy/core";
import heroImage from "@assets/luxury-wedding-celebration-illuminated-by-chandelier-flame-generated-by-ai_1754251182698.jpg";

interface VenueDetails {
  name: string;
  type: 'indoor' | 'outdoor' | 'hybrid';
  style: 'modern' | 'rustic' | 'elegant' | 'industrial' | 'garden' | 'historic' | 'beach' | 'mountain';
  description: string;
  capacity: number;
  primaryColors: string[];
  accentColors: string[];
  lighting: 'natural' | 'ambient' | 'dramatic' | 'romantic' | 'bright';
  architecture: string;
  specialFeatures: string[];
  restrictions: string;
}

interface ThemeSection {
  id: string;
  category: string;
  title: string;
  description: string;
  colorPalette: string[];
  elements: string[];
  mood: string;
  styleNotes: string;
}

interface MoodBoard {
  id: string;
  name: string;
  primaryTheme: string;
  colorStory: string;
  sections: ThemeSection[];
  inspiration: string[];
  materialSuggestions: string[];
  lightingConcepts: string[];
  overallVision: string;
}

const VENUE_TYPES = [
  { value: 'indoor', label: 'Indoor Venue', icon: Home },
  { value: 'outdoor', label: 'Outdoor Venue', icon: TreePine },
  { value: 'hybrid', label: 'Indoor/Outdoor', icon: Building }
];

const VENUE_STYLES = [
  { value: 'modern', label: 'Modern Contemporary' },
  { value: 'rustic', label: 'Rustic Charm' },
  { value: 'elegant', label: 'Classic Elegant' },
  { value: 'industrial', label: 'Industrial Chic' },
  { value: 'garden', label: 'Garden Paradise' },
  { value: 'historic', label: 'Historic Grandeur' },
  { value: 'beach', label: 'Coastal/Beach' },
  { value: 'mountain', label: 'Mountain Lodge' }
];

const LIGHTING_OPTIONS = [
  { value: 'natural', label: 'Natural Light', description: 'Bright, airy, window-lit spaces' },
  { value: 'ambient', label: 'Ambient Lighting', description: 'Soft, warm, atmospheric lighting' },
  { value: 'dramatic', label: 'Dramatic Lighting', description: 'Bold contrasts, spotlights, mood lighting' },
  { value: 'romantic', label: 'Romantic Lighting', description: 'Candles, soft glows, intimate atmosphere' },
  { value: 'bright', label: 'Bright Lighting', description: 'Well-lit, energetic, vibrant spaces' }
];

const COLOR_SUGGESTIONS = {
  modern: ['#800020', '#FFD700', '#2C3E50', '#ECF0F1'],
  rustic: ['#8B0000', '#DEB887', '#228B22', '#CD853F'],
  elegant: ['#800020', '#FFD700', '#000000', '#FFFFFF'],
  industrial: ['#800020', '#C0C0C0', '#2F4F4F', '#FF6347'],
  garden: ['#8B0000', '#98FB98', '#FFB6C1', '#FFFFFF'],
  historic: ['#800020', '#DAA520', '#2F4F4F', '#F5F5DC'],
  beach: ['#800020', '#F0F8FF', '#F4A460', '#FFFFFF'],
  mountain: ['#8B0000', '#006400', '#2F4F4F', '#F5F5DC']
};

export function VenueThemeGenerator() {
  const [venueDetails, setVenueDetails] = useState<VenueDetails>({
    name: '',
    type: 'indoor',
    style: 'modern',
    description: '',
    capacity: 0,
    primaryColors: [],
    accentColors: [],
    lighting: 'ambient',
    architecture: '',
    specialFeatures: [],
    restrictions: ''
  });

  const [generatedMoodBoard, setGeneratedMoodBoard] = useState<MoodBoard | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newColor, setNewColor] = useState('#800020');
  const [newFeature, setNewFeature] = useState('');
  const [colorType, setColorType] = useState<'primary' | 'accent'>('primary');
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);

  const generateThemeSections = (venue: VenueDetails): ThemeSection[] => {
    const baseColors = COLOR_SUGGESTIONS[venue.style] || COLOR_SUGGESTIONS.modern;
    const combinedColors = [...venue.primaryColors, ...venue.accentColors, ...baseColors].slice(0, 6);

    const sections: ThemeSection[] = [
      {
        id: 'entrance',
        category: 'Entrance & Welcome',
        title: 'Grand Entrance Experience',
        description: `Create a stunning first impression with burgundy elegance`,
        colorPalette: combinedColors.slice(0, 3),
        elements: [
          `${venue.style === 'modern' ? 'Sleek burgundy welcome signage' : venue.style === 'rustic' ? 'Wooden welcome boards with burgundy accents' : 'Elegant burgundy entrance displays'}`,
          `${venue.lighting === 'dramatic' ? 'Dramatic burgundy uplighting' : venue.lighting === 'romantic' ? 'Soft burgundy candle entrance' : 'Warm burgundy welcome lighting'}`,
          `${venue.type === 'outdoor' ? 'Natural archway with burgundy florals' : 'Sophisticated burgundy entrance decor'}`,
          'Professional burgundy greeting area',
          'Guest registration with burgundy styling'
        ],
        mood: venue.lighting === 'romantic' ? 'Warm burgundy elegance' : venue.lighting === 'dramatic' ? 'Bold burgundy impression' : 'Welcoming burgundy sophistication',
        styleNotes: `Complement the ${venue.style} architecture with rich burgundy tones and ${venue.type === 'outdoor' ? 'natural elements' : 'refined indoor styling'}`
      },
      {
        id: 'ceremony',
        category: 'Ceremony Space',
        title: 'Ceremony Focal Point',
        description: 'Design the perfect ceremony backdrop with burgundy sophistication',
        colorPalette: combinedColors.slice(1, 4),
        elements: [
          `${venue.style === 'garden' ? 'Burgundy floral ceremony arch' : venue.style === 'beach' ? 'Burgundy fabric and driftwood backdrop' : 'Elegant burgundy ceremony backdrop'}`,
          `${venue.lighting === 'natural' ? 'Natural light with burgundy accents' : 'Strategic burgundy lighting for ceremony focus'}`,
          `${venue.type === 'outdoor' ? 'Weather-appropriate burgundy seating' : 'Comfortable burgundy indoor seating'}`,
          'Burgundy aisle decoration and petals',
          'Audio-visual setup with burgundy elements'
        ],
        mood: venue.style === 'elegant' ? 'Sophisticated burgundy grandeur' : venue.style === 'modern' ? 'Contemporary burgundy elegance' : 'Beautiful burgundy memories',
        styleNotes: `Enhance the ${venue.architecture} with complementary burgundy design elements`
      },
      {
        id: 'reception',
        category: 'Reception Area',
        title: 'Celebration Space Design',
        description: 'Transform reception into vibrant burgundy celebration',
        colorPalette: combinedColors.slice(2, 5),
        elements: [
          `${venue.style === 'industrial' ? 'Modern burgundy geometric centerpieces' : venue.style === 'rustic' ? 'Natural wood with burgundy accents' : 'Elegant burgundy floral arrangements'}`,
          `${venue.lighting === 'bright' ? 'Energetic burgundy uplighting' : 'Ambient burgundy reception lighting'}`,
          `${venue.capacity > 100 ? 'Multiple burgundy seating zones' : 'Intimate burgundy table arrangements'}`,
          'Dance floor with burgundy lighting effects',
          'Bar area with burgundy styling and decor'
        ],
        mood: venue.style === 'modern' ? 'Chic burgundy sophistication' : venue.style === 'rustic' ? 'Cozy burgundy charm' : 'Festive burgundy elegance',
        styleNotes: `Create flow between ceremony and reception while maintaining ${venue.style} aesthetic with burgundy theme`
      },
      {
        id: 'dining',
        category: 'Dining Experience',
        title: 'Culinary Presentation',
        description: 'Design dining areas with burgundy luxury',
        colorPalette: combinedColors.slice(0, 4),
        elements: [
          `${venue.style === 'elegant' ? 'Fine burgundy china and crystal' : venue.style === 'rustic' ? 'Natural materials with burgundy linens' : 'Contemporary burgundy table settings'}`,
          'Coordinated burgundy linens and napery',
          'Menu presentation with burgundy design',
          'Buffet styling with burgundy accents',
          'Special dietary areas with burgundy coordination'
        ],
        mood: venue.lighting === 'romantic' ? 'Intimate burgundy dining' : 'Comfortable burgundy social atmosphere',
        styleNotes: `Table design should complement ${venue.style} venue with practical burgundy service elements`
      },
      {
        id: 'entertainment',
        category: 'Entertainment Zone',
        title: 'Performance & Activity Areas',
        description: 'Create dynamic burgundy entertainment spaces',
        colorPalette: combinedColors.slice(3, 6),
        elements: [
          `${venue.type === 'outdoor' ? 'Weather-resistant burgundy sound system' : 'Indoor burgundy audio-visual setup'}`,
          'Stage area with burgundy performance lighting',
          'Burgundy photo opportunity backgrounds',
          'Interactive entertainment with burgundy themes',
          'Burgundy lounge areas for conversation'
        ],
        mood: venue.style === 'modern' ? 'Dynamic burgundy energy' : venue.style === 'historic' ? 'Classic burgundy entertainment' : 'Fun burgundy engagement',
        styleNotes: `Entertainment design should work with ${venue.architecture} and burgundy theme without overwhelming the space`
      }
    ];

    return sections;
  };

  const generateMoodBoard = async () => {
    if (!venueDetails.name || !venueDetails.description) {
      return;
    }

    setIsGenerating(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const sections = generateThemeSections(venueDetails);
    
    const moodBoard: MoodBoard = {
      id: `mood-${Date.now()}`,
      name: `${venueDetails.name} Burgundy Theme Concept`,
      primaryTheme: `${venueDetails.style.charAt(0).toUpperCase() + venueDetails.style.slice(1)} ${venueDetails.type.charAt(0).toUpperCase() + venueDetails.type.slice(1)} with Burgundy Elegance`,
      colorStory: `A sophisticated burgundy color palette featuring rich wine tones that complement the ${venueDetails.architecture} architecture and create a ${venueDetails.lighting} atmosphere with luxurious burgundy accents throughout.`,
      sections,
      inspiration: [
        `${venueDetails.style === 'modern' ? 'Contemporary burgundy design magazines' : venueDetails.style === 'rustic' ? 'Country burgundy living inspiration' : 'Classic burgundy design elements'}`,
        `${venueDetails.type === 'outdoor' ? 'Natural burgundy landscape photography' : 'Architectural burgundy interior design'}`,
        `${venueDetails.lighting} burgundy lighting design references`,
        'Burgundy color theory and palette harmony',
        'Seasonal burgundy design considerations'
      ],
      materialSuggestions: [
        `${venueDetails.style === 'industrial' ? 'Metal with burgundy accents' : venueDetails.style === 'rustic' ? 'Natural wood with burgundy stains' : 'Refined burgundy materials and fabrics'}`,
        `${venueDetails.type === 'outdoor' ? 'Weather-resistant burgundy materials' : 'Indoor burgundy luxury finishes'}`,
        'Sustainable burgundy and eco-friendly options',
        'Burgundy texture variety for visual interest',
        'Durable burgundy materials for high-traffic areas'
      ],
      lightingConcepts: [
        `${venueDetails.lighting === 'dramatic' ? 'Bold burgundy contrast lighting with spotlights' : venueDetails.lighting === 'romantic' ? 'Soft burgundy lighting with candles' : 'Balanced burgundy lighting design'}`,
        `${venueDetails.type === 'outdoor' ? 'Burgundy string lights and lanterns' : 'Burgundy chandeliers and ambient lighting'}`,
        'Burgundy accent lighting for key features',
        'Color-changing LED options with burgundy themes',
        'Emergency and safety lighting with burgundy integration'
      ],
      overallVision: `Transform ${venueDetails.name} into a stunning ${venueDetails.style} ${venueDetails.type} venue with sophisticated burgundy elegance that maximizes the ${venueDetails.architecture} while creating an unforgettable ${venueDetails.lighting} atmosphere for up to ${venueDetails.capacity} guests.`
    };

    setGeneratedMoodBoard(moodBoard);
    setIsGenerating(false);
  };

  const addColor = () => {
    const totalColors = venueDetails.primaryColors.length + venueDetails.accentColors.length;
    
    if (newColor && !venueDetails.primaryColors.includes(newColor) && !venueDetails.accentColors.includes(newColor) && totalColors < 6) {
      if (colorType === 'primary' && venueDetails.primaryColors.length < 4) {
        setVenueDetails(prev => ({
          ...prev,
          primaryColors: [...prev.primaryColors, newColor]
        }));
      } else if (colorType === 'accent' && venueDetails.accentColors.length < 4) {
        setVenueDetails(prev => ({
          ...prev,
          accentColors: [...prev.accentColors, newColor]
        }));
      }
      // Generate next suggested color
      const colorVariations = ['#800020', '#8B0000', '#A0522D', '#B22222', '#CD5C5C', '#DC143C'];
      const nextColor = colorVariations.find(c => 
        !venueDetails.primaryColors.includes(c) && 
        !venueDetails.accentColors.includes(c) && 
        c !== newColor
      ) || '#800020';
      setNewColor(nextColor);
    }
  };

  const removeColor = (color: string, type: 'primary' | 'accent') => {
    if (type === 'primary') {
      setVenueDetails(prev => ({
        ...prev,
        primaryColors: prev.primaryColors.filter(c => c !== color)
      }));
    } else {
      setVenueDetails(prev => ({
        ...prev,
        accentColors: prev.accentColors.filter(c => c !== color)
      }));
    }
  };

  const addFeature = () => {
    if (newFeature.trim() && !venueDetails.specialFeatures.includes(newFeature.trim())) {
      setVenueDetails(prev => ({
        ...prev,
        specialFeatures: [...prev.specialFeatures, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (feature: string) => {
    setVenueDetails(prev => ({
      ...prev,
      specialFeatures: prev.specialFeatures.filter(f => f !== feature)
    }));
  };

  const handleImageUpload = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload", {});
      return {
        method: "PUT" as const,
        url: (response as any).uploadURL,
      };
    } catch (error) {
      console.error("Failed to get upload URL:", error);
      throw error;
    }
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedUrls = result.successful.map(file => (file as any).uploadURL).filter(Boolean);
      setInspirationImages(prev => [...prev, ...uploadedUrls]);
    }
  };

  const removeInspirationImage = (index: number) => {
    setInspirationImages(prev => prev.filter((_, i) => i !== index));
  };

  const exportMoodBoard = () => {
    if (generatedMoodBoard) {
      const dataStr = JSON.stringify(generatedMoodBoard, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${generatedMoodBoard.name.replace(/\s+/g, '-').toLowerCase()}-mood-board.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
        <img 
          src={heroImage} 
          alt="Luxury Event Venue" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-red-900/80 to-red-800/60 flex items-center justify-center">
          <div className="text-center text-white space-y-4">
            <h1 className="text-5xl font-bold">Venue Theme Generator</h1>
            <p className="text-xl max-w-2xl">Transform venue descriptions into stunning burgundy-themed mood boards and comprehensive design concepts</p>
            <div className="flex items-center justify-center space-x-6 mt-8">
              <div className="bg-[#330311]/20 rounded-lg p-4 backdrop-blur-sm">
                <Palette className="w-8 h-8 mx-auto mb-2 text-white" />
                <div className="font-semibold text-white">Smart Design</div>
              </div>
              <div className="bg-[#330311]/20 rounded-lg p-4 backdrop-blur-sm">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-white" />
                <div className="font-semibold text-white">Agent-Powered</div>
              </div>
              <div className="bg-[#330311]/20 rounded-lg p-4 backdrop-blur-sm">
                <Download className="w-8 h-8 mx-auto mb-2 text-white" />
                <div className="font-semibold text-white">Export Ready</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Venue Details Form */}
      <Card className="shadow-xl border-red-200">
        <CardHeader className="bg-gradient-to-r from-red-900 to-red-800 text-white rounded-t-lg">
          <CardTitle className="text-2xl flex items-center space-x-3">
            <MapPin className="w-6 h-6" />
            <span>Venue Details & Requirements</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-lg font-semibold text-red-900">Venue Name</Label>
              <Input
                placeholder="e.g., Grand Ballroom, Garden Pavilion"
                value={venueDetails.name}
                onChange={(e) => setVenueDetails(prev => ({ ...prev, name: e.target.value }))}
                className="mt-2 border-red-200 focus:border-red-500"
              />
            </div>
            <div>
              <Label className="text-lg font-semibold text-red-900">Guest Capacity</Label>
              <Input
                type="number"
                placeholder="150"
                value={venueDetails.capacity || ''}
                onChange={(e) => setVenueDetails(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                className="mt-2 border-red-200 focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-lg font-semibold text-red-900">Venue Type</Label>
              <Select value={venueDetails.type} onValueChange={(value: any) => setVenueDetails(prev => ({ ...prev, type: value }))}>
                <SelectTrigger className="mt-2 border-red-200 focus:border-red-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENUE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-lg font-semibold text-red-900">Venue Style</Label>
              <Select value={venueDetails.style} onValueChange={(value: any) => setVenueDetails(prev => ({ ...prev, style: value }))}>
                <SelectTrigger className="mt-2 border-red-200 focus:border-red-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENUE_STYLES.map(style => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-lg font-semibold text-red-900">Venue Description</Label>
            <Textarea
              placeholder="Describe the venue's atmosphere, architecture, unique features, and overall character..."
              value={venueDetails.description}
              onChange={(e) => setVenueDetails(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="mt-2 border-red-200 focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-lg font-semibold text-red-900">Architecture & Structure</Label>
              <Input
                placeholder="e.g., Victorian mansion, modern glass structure, rustic barn"
                value={venueDetails.architecture}
                onChange={(e) => setVenueDetails(prev => ({ ...prev, architecture: e.target.value }))}
                className="mt-2 border-red-200 focus:border-red-500"
              />
            </div>
            <div>
              <Label className="text-lg font-semibold text-red-900">Lighting Atmosphere</Label>
              <Select value={venueDetails.lighting} onValueChange={(value: any) => setVenueDetails(prev => ({ ...prev, lighting: value }))}>
                <SelectTrigger className="mt-2 border-red-200 focus:border-red-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIGHTING_OPTIONS.map(lighting => (
                    <SelectItem key={lighting.value} value={lighting.value}>
                      <div>
                        <div className="font-medium">{lighting.label}</div>
                        <div className="text-xs text-gray-500">{lighting.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Color Palette Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Palette className="w-6 h-6 text-red-800" />
                <h3 className="text-xl font-bold text-red-900">Color Palette for Mood Board</h3>
              </div>
              <div className="text-sm text-red-700">
                {venueDetails.primaryColors.length + venueDetails.accentColors.length}/6 colors
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-red-800 mb-4">
                <strong>Add 3-4 colors to create a rich mood board.</strong> Choose primary colors for main elements and accent colors for highlights.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-lg font-semibold text-red-900">Add Custom Color</Label>
                  <div className="flex space-x-2 mt-2">
                    <Input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="w-20 h-12 p-1 border-red-200"
                    />
                    <Select value={colorType} onValueChange={(value: any) => setColorType(value)}>
                      <SelectTrigger className="w-32 border-red-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary ({venueDetails.primaryColors.length}/4)</SelectItem>
                        <SelectItem value="accent">Accent ({venueDetails.accentColors.length}/4)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={addColor} 
                      disabled={venueDetails.primaryColors.length + venueDetails.accentColors.length >= 6}
                      className="bg-red-800 disabled:bg-gray-400"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-lg font-semibold text-red-900">Quick Color Suggestions</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['#800020', '#8B0000', '#A0522D', '#B22222', '#CD5C5C', '#FFD700', '#2F4F4F', '#FFFFFF'].map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: color }}
                        onClick={() => setNewColor(color)}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Colors Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="font-semibold text-red-900 flex items-center">
                  Primary Colors 
                  <span className="ml-2 text-sm text-red-600">({venueDetails.primaryColors.length}/4)</span>
                </Label>
                <div className="min-h-[60px] bg-burgundy-800/30 rounded-lg border-2 border-burgundy-600 p-3 mt-2">
                  {venueDetails.primaryColors.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {venueDetails.primaryColors.map((color, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer border-red-300 flex items-center"
                          onClick={() => removeColor(color, 'primary')}
                        >
                          <div className="w-4 h-4 rounded-full mr-2 border" style={{ backgroundColor: color }}></div>
                          {color}
                          <span className="ml-1 text-xs">×</span>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm italic">Add primary colors for main design elements</div>
                  )}
                </div>
              </div>
              
              <div>
                <Label className="font-semibold text-red-900 flex items-center">
                  Accent Colors 
                  <span className="ml-2 text-sm text-red-600">({venueDetails.accentColors.length}/4)</span>
                </Label>
                <div className="min-h-[60px] bg-burgundy-800/30 rounded-lg border-2 border-burgundy-600 p-3 mt-2">
                  {venueDetails.accentColors.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {venueDetails.accentColors.map((color, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer border-red-300 flex items-center"
                          onClick={() => removeColor(color, 'accent')}
                        >
                          <div className="w-4 h-4 rounded-full mr-2 border" style={{ backgroundColor: color }}></div>
                          {color}
                          <span className="ml-1 text-xs">×</span>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm italic">Add accent colors for highlights and details</div>
                  )}
                </div>
              </div>
            </div>

            {/* Color Recommendations */}
            {(venueDetails.primaryColors.length + venueDetails.accentColors.length) < 3 && (
              <div className="bg-burgundy-50 border border-burgundy-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-burgundy-800">
                  <Lightbulb className="w-5 h-5" />
                  <span className="font-semibold">Recommendation:</span>
                </div>
                <p className="text-burgundy-700 mt-1">
                  Add at least 3 colors to create a rich, professional mood board. Consider using burgundy as your base with complementary whites and neutrals.
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Inspiration Images Upload Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Camera className="w-6 h-6 text-red-800" />
              <h3 className="text-xl font-bold text-red-900">Inspiration Images</h3>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-red-800 mb-4">
                <strong>Upload inspiration images</strong> to enhance your mood board with visual references for colors, styles, and decor elements.
              </p>
              
              <ObjectUploader
                maxNumberOfFiles={10}
                allowedFileTypes={['image/*']}
                onGetUploadParameters={handleImageUpload}
                onComplete={handleUploadComplete}
                buttonClassName="w-full bg-red-800"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Inspiration Images
              </ObjectUploader>
            </div>

            {/* Display uploaded inspiration images */}
            {inspirationImages.length > 0 && (
              <div>
                <Label className="font-semibold text-red-900 flex items-center">
                  Uploaded Inspiration 
                  <span className="ml-2 text-sm text-red-600">({inspirationImages.length} images)</span>
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  {inspirationImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={url} 
                        alt={`Inspiration ${index + 1}`} 
                        className="w-full h-24 object-cover rounded-lg border-2 border-red-200"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 w-6 h-6 p-0"
                        onClick={() => removeInspirationImage(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Special Features */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Star className="w-6 h-6 text-red-800" />
              <h3 className="text-xl font-bold text-red-900">Special Features</h3>
            </div>
            
            <div>
              <Label className="text-lg font-semibold text-red-900">Add Feature</Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  placeholder="e.g., crystal chandelier, exposed beams, garden views"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                  className="border-red-200 focus:border-red-500"
                />
                <Button onClick={addFeature} className="bg-red-800">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {venueDetails.specialFeatures.map((feature, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer border-red-300"
                  onClick={() => removeFeature(feature)}
                >
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-lg font-semibold text-red-900">Restrictions or Limitations</Label>
            <Textarea
              placeholder="Any restrictions on decorations, sound levels, setup times, etc."
              value={venueDetails.restrictions}
              onChange={(e) => setVenueDetails(prev => ({ ...prev, restrictions: e.target.value }))}
              rows={3}
              className="mt-2 border-red-200 focus:border-red-500"
            />
          </div>

          {/* Generate Button */}
          <div className="pt-6">
            <div className="space-y-4">
              {(venueDetails.primaryColors.length + venueDetails.accentColors.length) >= 3 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-green-800">
                    <Heart className="w-5 h-5" />
                    <span className="font-semibold">Perfect!</span>
                  </div>
                  <p className="text-green-700 mt-1">
                    You have {venueDetails.primaryColors.length + venueDetails.accentColors.length} colors selected - ready to create a beautiful mood board!
                  </p>
                </div>
              )}
              
              <Button
                onClick={generateMoodBoard}
                disabled={!venueDetails.name || !venueDetails.description || isGenerating}
                className="w-full bg-gradient-to-r from-red-900 to-red-800 text-white py-6 text-xl font-semibold shadow-lg"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-6 h-6 mr-3 animate-spin" />
                    Generating Mood Board with {venueDetails.primaryColors.length + venueDetails.accentColors.length} Colors...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 mr-3" />
                    Generate Mood Board with {venueDetails.primaryColors.length + venueDetails.accentColors.length > 0 ? 
                      `${venueDetails.primaryColors.length + venueDetails.accentColors.length} Colors` : 'Burgundy Theme'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Mood Board */}
      {generatedMoodBoard ? (
        <div className="space-y-6">
          {/* Mood Board Header */}
          <Card className="shadow-xl bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-3 text-red-900 text-2xl">
                  <Heart className="w-8 h-8" />
                  <span>{generatedMoodBoard.name}</span>
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={exportMoodBoard}
                  className="border-red-300 text-red-800"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Mood Board
                </Button>
              </div>
              <Badge className="bg-red-100 text-red-800 w-fit text-lg px-4 py-2">
                {generatedMoodBoard.primaryTheme}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-red-800 mb-6 text-lg">{generatedMoodBoard.colorStory}</p>
              <div className="bg-burgundy-800/30 rounded-lg p-6">
                <h4 className="font-bold text-red-900 mb-3 text-xl">Overall Vision</h4>
                <p className="text-red-800">{generatedMoodBoard.overallVision}</p>
              </div>
            </CardContent>
          </Card>

          {/* Theme Sections */}
          <div className="grid gap-6">
            {generatedMoodBoard.sections.map((section) => (
              <Card key={section.id} className="shadow-lg border-red-200">
                <CardHeader className="bg-gradient-to-r from-red-100 to-red-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl text-red-900">{section.title}</CardTitle>
                      <Badge variant="outline" className="text-sm mt-2 border-red-300 text-red-700">
                        {section.category}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      {section.colorPalette.map((color, index) => (
                        <div
                          key={index}
                          className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                          style={{ backgroundColor: color }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-700 mb-6 text-lg">{section.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-red-900 mb-3 flex items-center">
                        <Lightbulb className="w-5 h-5 mr-2" />
                        Design Elements
                      </h4>
                      <ul className="space-y-2">
                        {section.elements.map((element, index) => (
                          <li key={index} className="text-gray-700 flex items-start">
                            <div className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            {element}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-red-900 mb-3 flex items-center">
                        <Camera className="w-5 h-5 mr-2" />
                        Mood & Style
                      </h4>
                      <div className="bg-red-50 rounded-lg p-4 space-y-3">
                        <div>
                          <span className="text-sm font-semibold text-red-700">Mood:</span>
                          <p className="text-red-800">{section.mood}</p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-red-700">Style Notes:</span>
                          <p className="text-red-800">{section.styleNotes}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Inspiration & Materials */}
          <Card className="shadow-xl border-red-200">
            <CardHeader className="bg-gradient-to-r from-red-900 to-red-800 text-white">
              <CardTitle className="flex items-center space-x-3 text-2xl">
                <Flower className="w-8 h-8" />
                <span>Inspiration & Materials Guide</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h4 className="font-bold text-red-900 mb-4 text-lg">Design Inspiration</h4>
                  <ul className="space-y-3">
                    {generatedMoodBoard.inspiration.map((item, index) => (
                      <li key={index} className="text-gray-700 flex items-start">
                        <div className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-bold text-red-900 mb-4 text-lg">Material Suggestions</h4>
                  <ul className="space-y-3">
                    {generatedMoodBoard.materialSuggestions.map((item, index) => (
                      <li key={index} className="text-gray-700 flex items-start">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-bold text-red-900 mb-4 text-lg">Lighting Concepts</h4>
                  <ul className="space-y-3">
                    {generatedMoodBoard.lightingConcepts.map((item, index) => (
                      <li key={index} className="text-gray-700 flex items-start">
                        <div className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="shadow-xl h-96 flex items-center justify-center border-red-200">
          <CardContent className="text-center">
            <Sparkles className="w-20 h-20 text-red-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-red-900 mb-4">Generate Your Burgundy Venue Theme</h3>
            <p className="text-red-700 text-lg">Fill in the venue details above and click generate to create a custom burgundy mood board with comprehensive theme sections</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}