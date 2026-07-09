import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import PlannerLayout from "@/components/PlannerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Upload, Download, Trash2, FileText, Image, FileSpreadsheet,
  FolderOpen, Search, Filter, File, Eye, Calendar, User, HardDrive,
  FolderArchive, Camera, Receipt, FileCheck, Briefcase, Printer
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import type { Event, Artifact } from "@shared/schema";

// The /api/artifacts endpoint returns file-metadata fields that are not part of
// the shared Drizzle `artifacts` table type. Extend the base row locally so the
// component can consume them with accurate types instead of the bare select type.
interface ArtifactRow extends Artifact {
  originalName: string;
  mimeType: string | null;
  fileSize: number | null;
  tags: string | null;
}

const CATEGORIES = [
  { value: "reports", label: "Reports", icon: FileText, color: "bg-blue-900/30 text-blue-300" },
  { value: "photos", label: "Photos & Media", icon: Camera, color: "bg-purple-900/30 text-purple-300" },
  { value: "budgets", label: "Budgets & Financials", icon: Receipt, color: "bg-green-900/30 text-green-300" },
  { value: "contracts", label: "Contracts & Agreements", icon: FileCheck, color: "bg-amber-900/30 text-amber-300" },
  { value: "documents", label: "General Documents", icon: Briefcase, color: "bg-gray-700/30 text-gray-300" },
  { value: "floorplans", label: "Floor Plans & Layouts", icon: FolderArchive, color: "bg-teal-900/30 text-teal-300" },
];

function getCategoryInfo(cat: string) {
  return CATEGORIES.find(c => c.value === cat) || CATEGORIES[4];
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return FileSpreadsheet;
  if (mimeType.includes("pdf")) return FileText;
  return File;
}

export default function ArtifactsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadEventId, setUploadEventId] = useState("");
  const [uploadCategory, setUploadCategory] = useState("documents");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewArtifact, setPreviewArtifact] = useState<ArtifactRow | null>(null);

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: artifacts = [], isLoading } = useQuery<ArtifactRow[]>({
    queryKey: ["/api/artifacts"],
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile || !uploadEventId) throw new Error("File and event are required");
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("category", uploadCategory);
      if (uploadDescription) formData.append("description", uploadDescription);
      if (uploadTags) formData.append("tags", uploadTags);
      return apiRequest("POST", `/api/events/${uploadEventId}/artifacts`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artifacts"] });
      setUploadDialogOpen(false);
      resetUploadForm();
      toast({ title: "File uploaded successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/artifacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artifacts"] });
      toast({ title: "File deleted" });
    },
  });

  function resetUploadForm() {
    setUploadFile(null);
    setUploadEventId("");
    setUploadCategory("documents");
    setUploadDescription("");
    setUploadTags("");
  }

  function handleDownload(artifact: ArtifactRow) {
    const token = localStorage.getItem("token");
    const url = `/api/artifacts/${artifact.id}/download`;
    const a = document.createElement("a");
    a.href = url;
    a.download = artifact.originalName;
    if (token) {
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          a.href = blobUrl;
          a.click();
          URL.revokeObjectURL(blobUrl);
        });
    } else {
      a.click();
    }
  }

  const filteredArtifacts = artifacts.filter(a => {
    if (selectedEventId !== "all" && a.eventId !== selectedEventId) return false;
    if (selectedCategory !== "all" && a.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.originalName.toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q) ||
        (a.tags || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categoryCounts = CATEGORIES.map(c => ({
    ...c,
    count: artifacts.filter(a => a.category === c.value).length,
  }));

  const totalSize = artifacts.reduce((sum, a) => sum + (a.fileSize || 0), 0);

  return (
    <PlannerLayout><div className="min-h-screen text-white">
      <div className="px-6 py-4"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-white">Project Filing & Artifacts</h1><p className="text-white/70 text-sm">Upload, organise and manage all event files in one place</p></div><div className="flex gap-2">{artifacts.length > 0 && (<Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={() => { openPrintWindow({ title: "Project Filing & Artifacts", stats: [ { label: "Total Files", value: artifacts.length }, { label: "Total Storage", value: formatFileSize(totalSize) }, { label: "Photos & Media", value: artifacts.filter(a => a.category === "photos").length }, { label: "Contracts", value: artifacts.filter(a => a.category === "contracts").length }, ], columns: [ { header: "File Name", key: "originalName" }, { header: "Category", key: "category", format: (v: string) => getCategoryInfo(v).label }, { header: "Event", key: "eventId", format: (_: any, row: any) => events.find(e => e.id === row.eventId)?.name || "Unknown" }, { header: "Size", key: "fileSize", format: (v: number) => formatFileSize(v) }, { header: "Uploaded", key: "createdAt", format: (v: string) => formatDate(v) }, ], rows: artifacts, }); }}><Printer className="w-4 h-4 mr-2" /> Print</Button>)}<Button className="bg-white text-[#330311] font-semibold" onClick={() => setUploadDialogOpen(true)}><Upload className="w-4 h-4 mr-2" /> Upload File</Button></div></div></div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#16213e] border-gray-700">
            <CardContent className="p-4 flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-[#8B1538]" />
              <div>
                <p className="text-2xl font-bold text-white">{artifacts.length}</p>
                <p className="text-gray-400 text-sm">Total Files</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#16213e] border-gray-700">
            <CardContent className="p-4 flex items-center gap-3">
              <HardDrive className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{formatFileSize(totalSize)}</p>
                <p className="text-gray-400 text-sm">Total Storage</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#16213e] border-gray-700">
            <CardContent className="p-4 flex items-center gap-3">
              <Camera className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">{artifacts.filter(a => a.category === "photos").length}</p>
                <p className="text-gray-400 text-sm">Photos & Media</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#16213e] border-gray-700">
            <CardContent className="p-4 flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{artifacts.filter(a => a.category === "contracts").length}</p>
                <p className="text-gray-400 text-sm">Contracts</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search files by name, description, or tags..."
              className="pl-10 bg-[#16213e] border-gray-700 text-white"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-[220px] bg-[#16213e] border-gray-700 text-white">
              <SelectValue placeholder="Filter by event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map(ev => (
                <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[220px] bg-[#16213e] border-gray-700 text-white">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {categoryCounts.map(c => {
            const Icon = c.icon;
            return (
              <button
                key={c.value}
                onClick={() => setSelectedCategory(selectedCategory === c.value ? "all" : c.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedCategory === c.value
                    ? "bg-[#330311] border-[#8B1538] text-white"
                    : "bg-[#16213e] border-gray-700 text-gray-300"
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-lg font-bold">{c.count}</p>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Loading files...</div>
        ) : filteredArtifacts.length === 0 ? (
          <Card className="bg-[#16213e] border-gray-700">
            <CardContent className="py-16 text-center">
              <FolderOpen className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">No files found</p>
              <p className="text-gray-500 text-sm mt-1">Upload your first file to get started</p>
              <Button
                className="mt-4 bg-[#330311] text-white"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" /> Upload File
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_120px] gap-4 px-4 py-2 text-gray-400 text-xs uppercase tracking-wide font-medium">
              <span>File Name</span>
              <span>Category</span>
              <span>Event</span>
              <span>Uploaded</span>
              <span className="text-right">Actions</span>
            </div>
            {filteredArtifacts.map(artifact => {
              const catInfo = getCategoryInfo(artifact.category);
              const FileIcon = getFileIcon(artifact.mimeType);
              const eventName = events.find(e => e.id === artifact.eventId)?.name || "Unknown Event";
              return (
                <Card key={artifact.id} className="bg-[#16213e] border-gray-700">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_120px] gap-4 px-4 py-3 items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">{artifact.originalName}</p>
                          <p className="text-gray-500 text-xs">{formatFileSize(artifact.fileSize)}</p>
                          {artifact.description && (
                            <p className="text-gray-400 text-xs truncate mt-0.5">{artifact.description}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Badge className={catInfo.color}>{catInfo.label}</Badge>
                      </div>
                      <div className="text-gray-300 text-sm truncate">{eventName}</div>
                      <div className="text-gray-400 text-sm">{formatDate(artifact.createdAt as any)}</div>
                      <div className="flex justify-end gap-1">
                        {artifact.mimeType?.startsWith("image/") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-300 hover:text-white h-8 w-8 p-0"
                            onClick={() => setPreviewArtifact(artifact)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-300 hover:text-white h-8 w-8 p-0"
                          onClick={() => handleDownload(artifact)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                          onClick={() => {
                            if (confirm("Delete this file permanently?")) {
                              deleteMutation.mutate(artifact.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="bg-[#16213e] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Upload File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-gray-300">Event *</Label>
              <Select value={uploadEventId} onValueChange={setUploadEventId}>
                <SelectTrigger className="bg-[#1a1a2e] border-gray-600 text-white mt-1">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(ev => (
                    <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="bg-[#1a1a2e] border-gray-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">File *</Label>
              <Input
                type="file"
                className="bg-[#1a1a2e] border-gray-600 text-white mt-1 file:text-white file:bg-[#330311] file:border-0 file:rounded file:px-3 file:py-1 file:mr-3"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label className="text-gray-300">Description (optional)</Label>
              <Textarea
                className="bg-[#1a1a2e] border-gray-600 text-white mt-1"
                placeholder="Add a brief description..."
                value={uploadDescription}
                onChange={e => setUploadDescription(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-gray-300">Tags (optional)</Label>
              <Input
                className="bg-[#1a1a2e] border-gray-600 text-white mt-1"
                placeholder="e.g. invoice, vendor, venue"
                value={uploadTags}
                onChange={e => setUploadTags(e.target.value)}
              />
            </div>
            <Button
              className="w-full bg-[#330311] text-white font-semibold"
              onClick={() => uploadMutation.mutate()}
              disabled={!uploadFile || !uploadEventId || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload File"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewArtifact} onOpenChange={() => setPreviewArtifact(null)}>
        <DialogContent className="bg-[#16213e] border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{previewArtifact?.originalName}</DialogTitle>
          </DialogHeader>
          {previewArtifact && (
            <div className="mt-2">
              <img
                src={`/api/artifacts/${previewArtifact.id}/download`}
                alt={previewArtifact.originalName}
                className="max-w-full rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div></PlannerLayout>
  );
}
