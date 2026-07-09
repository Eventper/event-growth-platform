import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MapPin } from "lucide-react";

interface VenueDetailsFormProps {
  eventId: string;
  initialData?: any;
  onSave?: (data: any) => void;
}

export function VenueDetailsForm({ eventId, initialData, onSave }: VenueDetailsFormProps) {
  const [formData, setFormData] = useState(initialData || {
    venueName: "Grand Ballroom",
    guestCapacity: "150",
    venueType: "Indoor Venue",
    venueStyle: "Modern Contemporary",
    venueDescription: "Elegant indoor venue with high ceilings and natural light",
    architecture: "Modern glass and steel structure",
    lightingAtmosphere: "Ambient Lighting",
    colorPalette: ["#8B1538", "#ffffff", "#FFFFFF"]
  });

  const [selectedColors, setSelectedColors] = useState<string[]>(["#8B1538", "#ffffff", "#FFFFFF"]);
  const colorOptions = ["#8B1538", "#ffffff", "#FFD700", "#1a0209", "#FFFFFF", "#4A4A4A"];

  const handleColorToggle = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  const handleSave = () => {
    onSave?.({ ...formData, colorPalette: selectedColors });
    alert(`✓ Venue Details Saved!\n\n${formData.venueName}\nCapacity: ${formData.guestCapacity} guests\n\nNext: Select an event to auto-generate the layout →`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-[#8B1538] text-white rounded-t-lg">
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Venue Details & Requirements</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Venue Name & Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-[#8B1538] font-semibold mb-2 block">Venue Name</Label>
              <Input
                placeholder="e.g., Grand Ballroom, Garden Pavilion"
                value={formData.venueName}
                onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                className="border-[#ffffff]"
              />
            </div>
            <div>
              <Label className="text-[#8B1538] font-semibold mb-2 block">Guest Capacity</Label>
              <Input
                type="number"
                placeholder="150"
                value={formData.guestCapacity}
                onChange={(e) => setFormData({ ...formData, guestCapacity: e.target.value })}
                className="border-[#ffffff]"
              />
            </div>
          </div>

          {/* Venue Type & Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-[#8B1538] font-semibold mb-2 block">Venue Type</Label>
              <Select value={formData.venueType} onValueChange={(value) => setFormData({ ...formData, venueType: value })}>
                <SelectTrigger className="border-[#ffffff]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indoor Venue">Indoor Venue</SelectItem>
                  <SelectItem value="Outdoor Venue">Outdoor Venue</SelectItem>
                  <SelectItem value="Garden">Garden</SelectItem>
                  <SelectItem value="Rooftop">Rooftop</SelectItem>
                  <SelectItem value="Beachfront">Beachfront</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#8B1538] font-semibold mb-2 block">Venue Style</Label>
              <Select value={formData.venueStyle} onValueChange={(value) => setFormData({ ...formData, venueStyle: value })}>
                <SelectTrigger className="border-[#ffffff]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Modern Contemporary">Modern Contemporary</SelectItem>
                  <SelectItem value="Classic Elegant">Classic Elegant</SelectItem>
                  <SelectItem value="Rustic">Rustic</SelectItem>
                  <SelectItem value="Minimalist">Minimalist</SelectItem>
                  <SelectItem value="Luxe">Luxe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Venue Description */}
          <div>
            <Label className="text-[#8B1538] font-semibold mb-2 block">Venue Description</Label>
            <Textarea
              placeholder="Describe the venue's atmosphere, architecture, unique features, and overall character..."
              value={formData.venueDescription}
              onChange={(e) => setFormData({ ...formData, venueDescription: e.target.value })}
              className="border-[#ffffff] min-h-32"
            />
          </div>

          {/* Architecture & Lighting */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-[#8B1538] font-semibold mb-2 block">Architecture & Structure</Label>
              <Input
                placeholder="e.g., Victorian mansion, modern glass structure, rustic barn"
                value={formData.architecture}
                onChange={(e) => setFormData({ ...formData, architecture: e.target.value })}
                className="border-[#ffffff]"
              />
            </div>
            <div>
              <Label className="text-[#8B1538] font-semibold mb-2 block">Lighting Atmosphere</Label>
              <Select value={formData.lightingAtmosphere} onValueChange={(value) => setFormData({ ...formData, lightingAtmosphere: value })}>
                <SelectTrigger className="border-[#ffffff]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ambient Lighting">Ambient Lighting</SelectItem>
                  <SelectItem value="Dramatic">Dramatic</SelectItem>
                  <SelectItem value="Warm & Intimate">Warm & Intimate</SelectItem>
                  <SelectItem value="Modern Minimalist">Modern Minimalist</SelectItem>
                  <SelectItem value="Luxury">Luxury</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <Label className="text-[#8B1538] font-semibold mb-3 block">Color Palette for Mood Board</Label>
            <p className="text-sm text-gray-600 mb-3">Add 3-4 colors to create a rich mood board. Choose primary colors for main elements and accents.</p>
            <div className="grid grid-cols-6 gap-3 mb-4">
              {colorOptions.map(color => (
                <button
                  key={color}
                  onClick={() => handleColorToggle(color)}
                  className={`w-12 h-12 rounded border-2 transition ${selectedColors.includes(color) ? "border-black" : "border-gray-300"}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedColors.map(color => (
                <div key={color} className="px-3 py-1 bg-gray-100 rounded border border-gray-300 text-sm">
                  {color}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">{selectedColors.length}/6 colors selected</p>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} className="w-full bg-[#8B1538] hover:bg-[#6a0f2a] text-white">
            Save Venue Details
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
