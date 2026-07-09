import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Image, Trash2, Share2, X, ChevronLeft, ChevronRight,
  Upload, FolderPlus, Eye, Download, Copy, Check, Camera, Film,
  MoreVertical, Lock, Globe, Pencil, ZoomIn, Loader2
} from "lucide-react";

interface GalleryAlbum {
  id: number;
  event_id: string | null;
  title: string;
  description: string | null;
  cover_image: string | null;
  is_shared: boolean;
  share_token: string | null;
  created_at: string;
  item_count: number;
  preview_urls: string[];
}

interface GalleryItem {
  id: number;
  album_id: number;
  file_url: string;
  file_type: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

function AlbumCover({ album }: { album: GalleryAlbum }) {
  const previews = album.preview_urls || [];

  if (previews.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#330311]/30 to-[#8B1538]/20">
        <Camera className="w-12 h-12 text-white/20 mb-2" />
        <span className="text-white/30 text-sm">No photos yet</span>
      </div>
    );
  }

  if (previews.length === 1) {
    return <img src={previews[0]} alt={album.title} className="w-full h-full object-cover" />;
  }

  if (previews.length === 2) {
    return (
      <div className="w-full h-full grid grid-cols-2 gap-0.5">
        {previews.slice(0, 2).map((url, i) => (
          <img key={i} src={url} alt="" className="w-full h-full object-cover" />
        ))}
      </div>
    );
  }

  if (previews.length === 3) {
    return (
      <div className="w-full h-full grid grid-cols-2 gap-0.5">
        <img src={previews[0]} alt="" className="w-full h-full object-cover row-span-2" />
        <img src={previews[1]} alt="" className="w-full h-full object-cover" />
        <img src={previews[2]} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="w-full h-full grid grid-cols-2 gap-0.5">
      {previews.slice(0, 4).map((url, i) => (
        <img key={i} src={url} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  );
}

export default function PhotoGallery() {
  const { toast } = useToast();
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [newAlbum, setNewAlbum] = useState({ title: "", description: "", eventId: "" });
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [menuAlbumId, setMenuAlbumId] = useState<number | null>(null);
  const [editAlbum, setEditAlbum] = useState<GalleryAlbum | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: albums = [], isLoading: albumsLoading } = useQuery<GalleryAlbum[]>({
    queryKey: ["/api/gallery-albums"],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<GalleryItem[]>({
    queryKey: ["/api/gallery-albums", selectedAlbum?.id, "items"],
    enabled: !!selectedAlbum,
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const createAlbumMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/gallery-albums", {
      title: newAlbum.title,
      description: newAlbum.description || undefined,
      eventId: newAlbum.eventId || undefined,
    }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery-albums"] });
      setCreateOpen(false);
      setNewAlbum({ title: "", description: "", eventId: "" });
      toast({ title: "Album created — click it to start adding photos!" });
      setSelectedAlbum({ ...data, item_count: 0, preview_urls: [] });
    },
    onError: () => toast({ title: "Failed to create album", variant: "destructive" }),
  });

  const deleteAlbumMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/gallery-albums/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery-albums"] });
      setSelectedAlbum(null);
      setMenuAlbumId(null);
      toast({ title: "Album deleted" });
    },
  });

  const updateAlbumMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PATCH", `/api/gallery-albums/${id}`, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery-albums"] });
      if (selectedAlbum) setSelectedAlbum((prev: any) => prev ? { ...prev, ...data } : prev);
      setEditAlbum(null);
      toast({ title: "Album updated" });
    },
  });

  const toggleShareMutation = useMutation({
    mutationFn: (album: GalleryAlbum) => apiRequest("PATCH", `/api/gallery-albums/${album.id}`, { is_shared: !album.is_shared }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery-albums"] });
      if (selectedAlbum) setSelectedAlbum((prev: any) => prev ? { ...prev, is_shared: data.is_shared } : prev);
      toast({ title: data.is_shared ? "Album is now public — anyone with the link can view it" : "Album is now private" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("file_type", file.type.startsWith("video") ? "video" : "image");
      return apiRequest("POST", `/api/gallery-albums/${selectedAlbum!.id}/items`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery-albums", selectedAlbum?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery-albums"] });
    },
    onError: () => toast({ title: "Upload failed — please try again", variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/gallery-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery-albums", selectedAlbum?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery-albums"] });
      toast({ title: "Photo removed" });
    },
  });

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || !selectedAlbum) return;
    const fileArray = Array.from(files);
    let uploaded = 0;
    fileArray.forEach((file) => {
      uploadMutation.mutate(file, {
        onSuccess: () => {
          uploaded++;
          if (uploaded === fileArray.length) {
            toast({ title: `${fileArray.length} ${fileArray.length === 1 ? "photo" : "photos"} uploaded successfully` });
          }
        },
      });
    });
  }, [selectedAlbum, uploadMutation]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const copyShareLink = () => {
    if (!selectedAlbum?.share_token) return;
    const link = `https://eventperfekt.net/gallery/${selectedAlbum.share_token}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: "Share link copied!" });
  };

  const currentItem = lightboxIndex !== null ? items[lightboxIndex] : null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PlannerSidebar />
      <main className="flex-1 lg:ml-60">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedAlbum && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAlbum(null)}
                  className="text-gray-500 hover:text-gray-800 mr-1"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Albums
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {selectedAlbum ? (
                    <>
                      <Camera className="w-6 h-6 text-[#8B1538]" />
                      {selectedAlbum.title}
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-[#8B1538]" />
                      Photo & Video Gallery
                    </>
                  )}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedAlbum
                    ? `${items.length} ${items.length === 1 ? "item" : "items"}${selectedAlbum.description ? ` · ${selectedAlbum.description}` : ""}`
                    : `${albums.length} ${albums.length === 1 ? "album" : "albums"}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedAlbum ? (
                <>
                  {/* Privacy toggle */}
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                    {selectedAlbum.is_shared ? (
                      <Globe className="w-4 h-4 text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-600">{selectedAlbum.is_shared ? "Public" : "Private"}</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={selectedAlbum.is_shared}
                        onCheckedChange={() => toggleShareMutation.mutate(selectedAlbum)}
                        className="ml-1"
                      />
                      {toggleShareMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                    </div>
                  </div>
                  {selectedAlbum.is_shared && (
                    <Button variant="outline" size="sm" onClick={copyShareLink} className="gap-2">
                      {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      {copiedLink ? "Copied!" : "Copy Link"}
                    </Button>
                  )}
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                    className="bg-[#8B1538] hover:bg-[#6d1029] text-white gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadMutation.isPending ? "Uploading..." : "Add Photos"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </>
              ) : (
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#8B1538] hover:bg-[#6d1029] text-white gap-2">
                      <FolderPlus className="w-4 h-4" />
                      New Album
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-gray-900">Create New Album</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div>
                        <Label className="text-gray-700 font-medium">Album Name *</Label>
                        <Input
                          value={newAlbum.title}
                          onChange={(e) => setNewAlbum({ ...newAlbum, title: e.target.value })}
                          placeholder="e.g. Wedding Ceremony, Venue Shots..."
                          className="mt-1"
                          onKeyDown={(e) => e.key === "Enter" && newAlbum.title && createAlbumMutation.mutate()}
                        />
                      </div>
                      <div>
                        <Label className="text-gray-700 font-medium">Description</Label>
                        <Textarea
                          value={newAlbum.description}
                          onChange={(e) => setNewAlbum({ ...newAlbum, description: e.target.value })}
                          placeholder="Optional description..."
                          className="mt-1 resize-none"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label className="text-gray-700 font-medium">Link to Event</Label>
                        <Select value={newAlbum.eventId} onValueChange={(v) => setNewAlbum({ ...newAlbum, eventId: v === "none" ? "" : v })}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="No event (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No event</SelectItem>
                            {events.map((ev: any) => (
                              <SelectItem key={ev.id} value={ev.id}>{ev.title || ev.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => createAlbumMutation.mutate()}
                        disabled={!newAlbum.title.trim() || createAlbumMutation.isPending}
                        className="w-full bg-[#8B1538] hover:bg-[#6d1029] text-white"
                      >
                        {createAlbumMutation.isPending ? "Creating..." : "Create Album"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">

          {/* ALBUM LIST VIEW */}
          {!selectedAlbum ? (
            albumsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-[4/3] bg-gray-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : albums.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                  <Camera className="w-12 h-12 text-gray-300" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">No albums yet</h2>
                <p className="text-gray-500 mb-8 max-w-sm">
                  Create your first album to start organising event photos and videos. Each album can hold unlimited photos.
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="bg-[#8B1538] hover:bg-[#6d1029] text-white gap-2 px-6 py-3 text-base"
                >
                  <FolderPlus className="w-5 h-5" />
                  Create Your First Album
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {albums.map((album) => (
                  <div
                    key={album.id}
                    className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedAlbum(album)}
                  >
                    {/* Album preview collage */}
                    <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                      <AlbumCover album={album} />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                      {/* Privacy badge */}
                      <div className="absolute top-2 left-2">
                        {album.is_shared ? (
                          <Badge className="bg-green-500 text-white text-xs gap-1">
                            <Globe className="w-3 h-3" />Public
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1 bg-black/40 text-white border-0">
                            <Lock className="w-3 h-3" />Private
                          </Badge>
                        )}
                      </div>
                      {/* Menu button */}
                      <div
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); setMenuAlbumId(menuAlbumId === album.id ? null : album.id); }}
                      >
                        <div className="w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
                          <MoreVertical className="w-4 h-4" />
                        </div>
                        {menuAlbumId === album.id && (
                          <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[140px] py-1"
                            onClick={(e) => e.stopPropagation()}>
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              onClick={() => { setEditAlbum(album); setEditForm({ title: album.title, description: album.description || "" }); setMenuAlbumId(null); }}
                            >
                              <Pencil className="w-3.5 h-3.5" />Rename
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              onClick={() => deleteAlbumMutation.mutate(album.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />Delete Album
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Album info */}
                    <div className="p-3">
                      <h3 className="font-semibold text-gray-900 truncate">{album.title}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-gray-500">
                          {album.item_count} {album.item_count === 1 ? "item" : "items"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(album.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {album.description && (
                        <p className="text-xs text-gray-400 mt-1 truncate">{album.description}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Album card */}
                <div
                  className="aspect-auto bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-[#8B1538] hover:bg-[#8B1538]/5 transition-all cursor-pointer flex flex-col items-center justify-center p-6 min-h-[180px] group"
                  onClick={() => setCreateOpen(true)}
                >
                  <div className="w-12 h-12 bg-gray-100 group-hover:bg-[#8B1538]/10 rounded-full flex items-center justify-center mb-3 transition-colors">
                    <Plus className="w-6 h-6 text-gray-400 group-hover:text-[#8B1538]" />
                  </div>
                  <span className="text-sm font-medium text-gray-500 group-hover:text-[#8B1538] transition-colors">New Album</span>
                </div>
              </div>
            )
          ) : (
            /* ALBUM CONTENT VIEW */
            <div
              className={`min-h-[60vh] transition-colors ${isDragging ? "bg-[#8B1538]/5 ring-2 ring-[#8B1538] ring-dashed rounded-xl" : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {itemsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                /* Empty album — big upload area */
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <label className="cursor-pointer group">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 group-hover:border-[#8B1538] rounded-2xl flex flex-col items-center justify-center transition-colors mb-4 mx-auto group-hover:bg-[#8B1538]/5">
                      <Upload className="w-10 h-10 text-gray-300 group-hover:text-[#8B1538] mb-2 transition-colors" />
                      <span className="text-xs text-gray-400 group-hover:text-[#8B1538]">Drop files here</span>
                    </div>
                  </label>
                  <h3 className="text-xl font-bold text-gray-700 mb-2">This album is empty</h3>
                  <p className="text-gray-400 mb-6 max-w-xs">
                    Drag & drop photos and videos here, or click the button below to browse your files.
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#8B1538] hover:bg-[#6d1029] text-white gap-2 px-6"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Photos & Videos
                  </Button>
                </div>
              ) : (
                <>
                  {/* Drag hint */}
                  {isDragging && (
                    <div className="flex flex-col items-center justify-center py-8 mb-4">
                      <Upload className="w-10 h-10 text-[#8B1538] mb-2" />
                      <p className="text-[#8B1538] font-semibold">Drop to upload</p>
                    </div>
                  )}

                  {/* Photo grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        className="aspect-square rounded-lg overflow-hidden relative group cursor-pointer bg-gray-100"
                        onClick={() => setLightboxIndex(index)}
                      >
                        {item.file_type === "video" ? (
                          <div className="w-full h-full relative">
                            <video src={item.file_url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center">
                                <Film className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img src={item.file_url} alt={item.caption || ""} className="w-full h-full object-cover" />
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <ZoomIn className="w-8 h-8 text-white drop-shadow-lg" />
                        </div>
                        {/* Delete button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteItemMutation.mutate(item.id); }}
                          className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Add more photos tile */}
                    <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-[#8B1538] hover:bg-[#8B1538]/5 transition-all cursor-pointer flex flex-col items-center justify-center group">
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleFileInput}
                      />
                      <Plus className="w-8 h-8 text-gray-300 group-hover:text-[#8B1538] transition-colors" />
                      <span className="text-xs text-gray-400 group-hover:text-[#8B1538] mt-1 transition-colors">Add more</span>
                    </label>
                  </div>

                  <p className="text-center text-sm text-gray-400 mt-6">
                    Drag & drop anywhere on this page to add more photos
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Edit album dialog */}
      {editAlbum && (
        <Dialog open={!!editAlbum} onOpenChange={() => setEditAlbum(null)}>
          <DialogContent className="bg-white max-w-md">
            <DialogHeader>
              <DialogTitle>Rename Album</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Album Name</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="mt-1 resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditAlbum(null)}>Cancel</Button>
                <Button
                  className="flex-1 bg-[#8B1538] hover:bg-[#6d1029] text-white"
                  disabled={!editForm.title.trim() || updateAlbumMutation.isPending}
                  onClick={() => updateAlbumMutation.mutate({ id: editAlbum.id, title: editForm.title, description: editForm.description })}
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && currentItem && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next */}
          {lightboxIndex < items.length - 1 && (
            <button
              className="absolute right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Media */}
          <div className="max-w-5xl max-h-[90vh] flex flex-col items-center px-16" onClick={(e) => e.stopPropagation()}>
            {currentItem.file_type === "video" ? (
              <video src={currentItem.file_url} controls className="max-w-full max-h-[80vh] rounded-lg" />
            ) : (
              <img
                src={currentItem.file_url}
                alt={currentItem.caption || ""}
                className="max-w-full max-h-[80vh] rounded-lg object-contain"
              />
            )}
            {currentItem.caption && (
              <p className="text-white/70 mt-3 text-center text-sm">{currentItem.caption}</p>
            )}
            <div className="flex items-center gap-4 mt-4">
              <a href={currentItem.file_url} download onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 gap-2">
                  <Download className="w-4 h-4" />Download
                </Button>
              </a>
              <span className="text-white/40 text-sm">{lightboxIndex + 1} / {items.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
