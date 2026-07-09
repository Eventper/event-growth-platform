import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, Image as ImageIcon, X, Camera, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VenueImage {
  id: string;
  imagePath: string;
  description: string;
  category: string;
  uploadedAt: string;
}

interface VenueUploaderProps {
  eventId: string;
  onImageUploaded?: (image: VenueImage) => void;
}

export function VenueUploader({ eventId, onImageUploaded }: VenueUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageDescription, setImageDescription] = useState("");
  const [imageCategory, setImageCategory] = useState("venue_overview");

  // Get existing venue images
  const { data: venueImages = [], refetch } = useQuery<any[]>({
    queryKey: ['/api/events', eventId, 'venue-images'],
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', imageDescription);
      formData.append('category', imageCategory);

      const response = await fetch(`/api/events/${eventId}/venue-images`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload venue image');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Venue Image Uploaded",
        description: "Image uploaded successfully and ready for 3D design",
      });
      refetch();
      onImageUploaded?.(data);
      setImageDescription("");
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload venue image. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
    }
  };

  const categories = [
    { value: "venue_overview", label: "Venue Overview" },
    { value: "ceremony_space", label: "Ceremony Space" },
    { value: "reception_area", label: "Reception Area" },
    { value: "entrance", label: "Entrance/Lobby" },
    { value: "outdoor_space", label: "Outdoor Space" },
    { value: "detail_shots", label: "Detail Shots" }
  ];

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-6 h-6" />
            <span>Upload Venue Images</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload venue photos for 3D design and floor planning reference
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image Category Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Image Category</Label>
              <select 
                id="category"
                value={imageCategory}
                onChange={(e) => setImageCategory(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="description">Image Description</Label>
              <Input
                id="description"
                value={imageDescription}
                onChange={(e) => setImageDescription(e.target.value)}
                placeholder="Describe this venue area..."
              />
            </div>
          </div>

          {/* Drag and Drop Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            
            {uploading ? (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Uploading venue image...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-lg font-medium">Drop venue images here</p>
                  <p className="text-sm text-muted-foreground">or click to browse files</p>
                </div>
                <Button variant="outline" size="sm">
                  Choose Files
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Images Gallery */}
      {venueImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ImageIcon className="w-6 h-6" />
              <span>Venue Image Gallery</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {venueImages.map((image: VenueImage) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={image.imagePath}
                      alt={image.description}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      {categories.find(c => c.value === image.category)?.label}
                    </Badge>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg">
                    <p className="text-white text-xs truncate">{image.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}