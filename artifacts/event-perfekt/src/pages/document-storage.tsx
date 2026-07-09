import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Image,
  Upload,
  Trash2,
  Share2,
  Eye,
  FolderOpen,
  Grid,
  List,
  Search,
  File,
  Mail,
  Plus,
  RefreshCw,
  Send,
  X,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Printer,
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";

interface Document {
  id: string | number;
  event_id: string | number;
  name: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category: string;
  uploaded_by: string;
  shared_with_client: boolean;
  created_at: string;
}

interface DocumentRequest {
  id: number;
  event_id: string | number | null;
  recipient_name: string;
  recipient_email: string;
  recipient_type: string;
  subject: string;
  message: string;
  requested_documents: string[];
  status: string;
  upload_token: string;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  event_name?: string;
  uploaded_files?: Array<{ name: string; url: string; size: number }>;
}

interface Event {
  id: string;
  name: string;
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "contracts", label: "Contracts" },
  { value: "invoices", label: "Invoices" },
  { value: "photos", label: "Photos" },
  { value: "floor_plans", label: "Floor Plans" },
  { value: "vendor_docs", label: "Vendor Docs" },
  { value: "branding", label: "Branding" },
  { value: "miscellaneous", label: "Miscellaneous" },
];

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getFileIcon(fileType: string | null | undefined) {
  if (!fileType) return File;
  if (fileType.startsWith("image/") || fileType.includes("image")) return Image;
  if (
    fileType.includes("pdf") ||
    fileType.includes("doc") ||
    fileType.includes("text")
  )
    return FileText;
  return File;
}

function getCategoryBadgeColor(category: string) {
  switch (category) {
    case "contracts":
      return "bg-amber-900/40 text-amber-300 border-amber-700/30";
    case "invoices":
      return "bg-green-900/40 text-green-300 border-green-700/30";
    case "photos":
      return "bg-purple-900/40 text-purple-300 border-purple-700/30";
    case "floor_plans":
      return "bg-teal-900/40 text-teal-300 border-teal-700/30";
    case "vendor_docs":
      return "bg-blue-900/40 text-blue-300 border-blue-700/30";
    case "branding":
      return "bg-pink-900/40 text-pink-300 border-pink-700/30";
    default:
      return "bg-gray-700/40 text-gray-300 border-gray-600/30";
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return { icon: CheckCircle2, className: "bg-green-900/40 text-green-300 border-green-700/30", label: "Completed" };
    case "sent":
      return { icon: Send, className: "bg-blue-900/40 text-blue-300 border-blue-700/30", label: "Sent" };
    case "pending":
    default:
      return { icon: Clock, className: "bg-amber-900/40 text-amber-300 border-amber-700/30", label: "Pending" };
  }
}

function DocumentsTab({
  events,
  documents,
  isLoading,
  selectedCategory,
  setSelectedCategory,
  selectedEventId,
  setSelectedEventId,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  setUploadDialogOpen,
  toggleShareMutation,
  deleteMutation,
}: {
  events: Event[];
  documents: Document[];
  isLoading: boolean;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedEventId: string;
  setSelectedEventId: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  viewMode: "list" | "grid";
  setViewMode: (v: "list" | "grid") => void;
  setUploadDialogOpen: (v: boolean) => void;
  toggleShareMutation: any;
  deleteMutation: any;
}) {
  const filteredDocuments = documents.filter((doc) => {
    if (selectedCategory !== "all" && doc.category !== selectedCategory)
      return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        doc.name?.toLowerCase().includes(q) ||
        doc.file_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalFiles = documents.length;
  const sharedCount = documents.filter((d) => d.shared_with_client).length;
  const contractsCount = documents.filter(
    (d) => d.category === "contracts"
  ).length;
  const photosCount = documents.filter((d) => d.category === "photos").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/10 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-white/70" />
            <div>
              <p className="text-2xl font-bold text-white">{totalFiles}</p>
              <p className="text-white/50 text-sm">Total Files</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Share2 className="w-8 h-8 text-white/70" />
            <div>
              <p className="text-2xl font-bold text-white">{sharedCount}</p>
              <p className="text-white/50 text-sm">Shared with Client</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-white/70" />
            <div>
              <p className="text-2xl font-bold text-white">
                {contractsCount}
              </p>
              <p className="text-white/50 text-sm">Contracts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Image className="w-8 h-8 text-white/70" />
            <div>
              <p className="text-2xl font-bold text-white">{photosCount}</p>
              <p className="text-white/50 text-sm">Photos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search documents..."
            className="pl-10 bg-white/10 backdrop-blur-sm border-white/10 text-white placeholder:text-white/40"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger className="w-[200px] bg-white/10 backdrop-blur-sm border-white/10 text-white">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {events.map((ev) => (
              <SelectItem key={ev.id} value={String(ev.id)}>
                {ev.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex bg-white/10 backdrop-blur-sm rounded-md border border-white/10">
          <Button
            variant="ghost"
            size="sm"
            className={`px-3 ${viewMode === "list" ? "text-white bg-white/20" : "text-white/50"}`}
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`px-3 ${viewMode === "grid" ? "text-white bg-white/20" : "text-white/50"}`}
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant="ghost"
            size="sm"
            className={`text-sm rounded-full px-4 ${
              selectedCategory === cat.value
                ? "bg-white/20 text-white border border-white/30"
                : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
            }`}
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
            {cat.value !== "all" && (
              <span className="ml-1.5 text-xs opacity-60">
                {documents.filter((d) => d.category === cat.value).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-white/50">
          Loading documents...
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card className="bg-white/10 backdrop-blur-sm border-white/10">
          <CardContent className="py-16 text-center">
            <FolderOpen className="w-16 h-16 mx-auto text-white/20 mb-4" />
            <p className="text-white/60 text-lg">No documents found</p>
            <p className="text-white/40 text-sm mt-1">
              Upload your first document to get started
            </p>
            <Button
              className="mt-4 bg-white text-[#330311] font-semibold hover:bg-white/90"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" /> Upload Document
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          <div className="grid grid-cols-[2fr_1fr_100px_100px_120px] gap-4 px-4 py-2 text-white/40 text-xs uppercase tracking-wide font-medium">
            <span>Name</span>
            <span>Category</span>
            <span>Size</span>
            <span>Date</span>
            <span className="text-right">Actions</span>
          </div>
          {filteredDocuments.map((doc) => {
            const IconComponent = getFileIcon(doc.file_type);
            const catLabel =
              CATEGORIES.find((c) => c.value === doc.category)?.label ||
              doc.category;
            return (
              <Card
                key={doc.id}
                className="bg-white/10 backdrop-blur-sm border-white/10"
              >
                <CardContent className="p-0">
                  <div className="grid grid-cols-[2fr_1fr_100px_100px_120px] gap-4 px-4 py-3 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <IconComponent className="w-5 h-5 text-white/50 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">
                          {doc.name || doc.file_name}
                        </p>
                        <p className="text-white/40 text-xs truncate">
                          {doc.file_name}
                        </p>
                      </div>
                      {doc.shared_with_client && (
                        <Badge className="bg-green-900/40 text-green-300 border-green-700/30 text-xs flex-shrink-0">
                          Shared
                        </Badge>
                      )}
                    </div>
                    <div>
                      <Badge className={getCategoryBadgeColor(doc.category)}>
                        {catLabel}
                      </Badge>
                    </div>
                    <div className="text-white/60 text-sm">
                      {formatFileSize(doc.file_size)}
                    </div>
                    <div className="text-white/50 text-sm">
                      {formatDate(doc.created_at)}
                    </div>
                    <div className="flex justify-end gap-1">
                      {doc.file_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white/50 hover:text-white h-8 w-8 p-0"
                          onClick={() => window.open(doc.file_url, "_blank")}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 ${doc.shared_with_client ? "text-green-400 hover:text-green-300" : "text-white/50 hover:text-white"}`}
                        onClick={() => toggleShareMutation.mutate(doc)}
                        title={
                          doc.shared_with_client
                            ? "Unshare with client"
                            : "Share with client"
                        }
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                        onClick={() => {
                          if (confirm("Delete this document?")) {
                            deleteMutation.mutate(doc.id);
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
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => {
            const IconComponent = getFileIcon(doc.file_type);
            const catLabel =
              CATEGORIES.find((c) => c.value === doc.category)?.label ||
              doc.category;
            return (
              <Card
                key={doc.id}
                className="bg-white/10 backdrop-blur-sm border-white/10 hover:bg-white/15 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-white/60" />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 ${doc.shared_with_client ? "text-green-400" : "text-white/40"}`}
                        onClick={() => toggleShareMutation.mutate(doc)}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 h-7 w-7 p-0"
                        onClick={() => {
                          if (confirm("Delete this document?")) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-white font-medium text-sm truncate">
                    {doc.name || doc.file_name}
                  </p>
                  <p className="text-white/40 text-xs truncate mt-0.5">
                    {doc.file_name}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge
                      className={`text-xs ${getCategoryBadgeColor(doc.category)}`}
                    >
                      {catLabel}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-white/40">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                  {doc.shared_with_client && (
                    <div className="mt-2">
                      <Badge className="bg-green-900/40 text-green-300 border-green-700/30 text-xs">
                        Shared
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RequestsTab({ events }: { events: Event[] }) {
  const { toast } = useToast();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [viewUploadsId, setViewUploadsId] = useState<number | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientType, setRecipientType] = useState("client");
  const [requestEventId, setRequestEventId] = useState("");
  const [requestSubject, setRequestSubject] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestedDocs, setRequestedDocs] = useState<string[]>([""]);

  const { data: requests = [], isLoading } = useQuery<DocumentRequest[]>({
    queryKey: ["/api/document-requests"],
  });

  const createRequestMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/document-requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-requests"] });
      setRequestDialogOpen(false);
      resetRequestForm();
      toast({ title: "Document request created successfully" });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to create request",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/document-requests/${id}/resend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-requests"] });
      toast({ title: "Request resent successfully" });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to resend",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/document-requests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-requests"] });
      toast({ title: "Request deleted" });
    },
  });

  function resetRequestForm() {
    setRecipientName("");
    setRecipientEmail("");
    setRecipientType("client");
    setRequestEventId("");
    setRequestSubject("");
    setRequestMessage("");
    setRequestedDocs([""]);
  }

  function handleAddDocField() {
    setRequestedDocs([...requestedDocs, ""]);
  }

  function handleRemoveDocField(index: number) {
    setRequestedDocs(requestedDocs.filter((_, i) => i !== index));
  }

  function handleDocFieldChange(index: number, value: string) {
    const updated = [...requestedDocs];
    updated[index] = value;
    setRequestedDocs(updated);
  }

  function handleSubmitRequest() {
    const filteredDocs = requestedDocs.filter((d) => d.trim() !== "");
    if (!recipientName || !recipientEmail || filteredDocs.length === 0) {
      toast({
        title: "Missing fields",
        description: "Please fill in recipient name, email, and at least one document name",
        variant: "destructive",
      });
      return;
    }
    createRequestMutation.mutate({
      recipientName,
      recipientEmail,
      recipientType,
      eventId: requestEventId || null,
      subject: requestSubject || "Document Request from Event Perfekt",
      message: requestMessage || "Please upload the requested documents using the link provided.",
      requestedDocuments: filteredDocs,
    });
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const sentCount = requests.filter((r) => r.status === "sent").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;

  const viewingRequest = viewUploadsId
    ? requests.find((r) => r.id === viewUploadsId)
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/10 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Inbox className="w-8 h-8 text-white/70" />
            <div>
              <p className="text-2xl font-bold text-white">{requests.length}</p>
              <p className="text-white/50 text-sm">Total Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-400/70" />
            <div>
              <p className="text-2xl font-bold text-white">{pendingCount}</p>
              <p className="text-white/50 text-sm">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Send className="w-8 h-8 text-blue-400/70" />
            <div>
              <p className="text-2xl font-bold text-white">{sentCount}</p>
              <p className="text-white/50 text-sm">Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-400/70" />
            <div>
              <p className="text-2xl font-bold text-white">{completedCount}</p>
              <p className="text-white/50 text-sm">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-white text-[#330311] font-semibold hover:bg-white/90"
          onClick={() => setRequestDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> New Document Request
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-white/50">
          Loading requests...
        </div>
      ) : requests.length === 0 ? (
        <Card className="bg-white/10 backdrop-blur-sm border-white/10">
          <CardContent className="py-16 text-center">
            <Mail className="w-16 h-16 mx-auto text-white/20 mb-4" />
            <p className="text-white/60 text-lg">No document requests yet</p>
            <p className="text-white/40 text-sm mt-1">
              Request documents from clients, vendors, or team members
            </p>
            <Button
              className="mt-4 bg-white text-[#330311] font-semibold hover:bg-white/90"
              onClick={() => setRequestDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Create Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_100px_100px_120px] gap-4 px-4 py-2 text-white/40 text-xs uppercase tracking-wide font-medium">
            <span>Recipient</span>
            <span>Event</span>
            <span>Documents</span>
            <span>Status</span>
            <span>Date</span>
            <span className="text-right">Actions</span>
          </div>
          {requests.map((req) => {
            const statusInfo = getStatusBadge(req.status);
            const StatusIcon = statusInfo.icon;
            const docNames = Array.isArray(req.requested_documents)
              ? req.requested_documents
              : [];
            return (
              <Card
                key={req.id}
                className="bg-white/10 backdrop-blur-sm border-white/10"
              >
                <CardContent className="p-0">
                  <div className="grid grid-cols-[1.5fr_1fr_1fr_100px_100px_120px] gap-4 px-4 py-3 items-center">
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {req.recipient_name}
                      </p>
                      <p className="text-white/40 text-xs truncate">
                        {req.recipient_email}
                      </p>
                    </div>
                    <div className="text-white/60 text-sm truncate">
                      {req.event_name || "—"}
                    </div>
                    <div className="text-white/60 text-sm">
                      {docNames.length} document{docNames.length !== 1 ? "s" : ""}
                      {docNames.length > 0 && (
                        <p className="text-white/30 text-xs truncate">
                          {docNames.join(", ")}
                        </p>
                      )}
                    </div>
                    <div>
                      <Badge className={statusInfo.className}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="text-white/50 text-sm">
                      {formatDate(req.sent_at || req.created_at)}
                    </div>
                    <div className="flex justify-end gap-1">
                      {req.status === "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white/50 hover:text-white h-8 w-8 p-0"
                          onClick={() => setViewUploadsId(req.id)}
                          title="View uploads"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {req.status !== "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:text-blue-300 h-8 w-8 p-0"
                          onClick={() => resendMutation.mutate(req.id)}
                          disabled={resendMutation.isPending}
                          title="Resend request"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                        onClick={() => {
                          if (confirm("Delete this request?")) {
                            deleteRequestMutation.mutate(req.id);
                          }
                        }}
                        title="Delete request"
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

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="bg-[#2a0209] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">
              New Document Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/70">Recipient Name *</Label>
                <Input
                  className="bg-white/10 border-white/10 text-white mt-1 placeholder:text-white/30"
                  placeholder="John Doe"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-white/70">Email *</Label>
                <Input
                  className="bg-white/10 border-white/10 text-white mt-1 placeholder:text-white/30"
                  placeholder="john@example.com"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/70">Recipient Type</Label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger className="bg-white/10 border-white/10 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="team">Team Member</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Event</Label>
                <Select value={requestEventId} onValueChange={setRequestEventId}>
                  <SelectTrigger className="bg-white/10 border-white/10 text-white mt-1">
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Event</SelectItem>
                    {events.map((ev) => (
                      <SelectItem key={ev.id} value={String(ev.id)}>
                        {ev.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-white/70">Subject</Label>
              <Input
                className="bg-white/10 border-white/10 text-white mt-1 placeholder:text-white/30"
                placeholder="Document Request from Event Perfekt"
                value={requestSubject}
                onChange={(e) => setRequestSubject(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-white/70">Message</Label>
              <Textarea
                className="bg-white/10 border-white/10 text-white mt-1 placeholder:text-white/30 min-h-[80px]"
                placeholder="Please upload the requested documents..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white/70">Requested Documents *</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white h-7 px-2"
                  onClick={handleAddDocField}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {requestedDocs.map((docName, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      className="bg-white/10 border-white/10 text-white placeholder:text-white/30"
                      placeholder={`e.g. ID Card, Marriage Certificate, Invoice #${index + 1}`}
                      value={docName}
                      onChange={(e) =>
                        handleDocFieldChange(index, e.target.value)
                      }
                    />
                    {requestedDocs.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 h-10 w-10 p-0 flex-shrink-0"
                        onClick={() => handleRemoveDocField(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <Button
              className="w-full bg-white text-[#330311] font-semibold hover:bg-white/90"
              onClick={handleSubmitRequest}
              disabled={createRequestMutation.isPending}
            >
              {createRequestMutation.isPending
                ? "Creating..."
                : "Send Document Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={viewUploadsId !== null}
        onOpenChange={(open) => {
          if (!open) setViewUploadsId(null);
        }}
      >
        <DialogContent className="bg-[#2a0209] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">
              Uploaded Files
            </DialogTitle>
          </DialogHeader>
          {viewingRequest ? (
            <div className="space-y-3 mt-2">
              <div className="text-white/60 text-sm">
                <p>
                  From: <span className="text-white">{viewingRequest.recipient_name}</span>
                </p>
                <p>
                  Completed: <span className="text-white">{formatDate(viewingRequest.completed_at)}</span>
                </p>
              </div>
              {viewingRequest.uploaded_files &&
              viewingRequest.uploaded_files.length > 0 ? (
                <div className="space-y-2">
                  {viewingRequest.uploaded_files.map((file, idx) => (
                    <Card
                      key={idx}
                      className="bg-white/10 backdrop-blur-sm border-white/10"
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="w-4 h-4 text-white/50 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-white text-sm truncate">
                              {file.name}
                            </p>
                            <p className="text-white/40 text-xs">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        {file.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/50 hover:text-white h-8 w-8 p-0"
                            onClick={() => window.open(file.url, "_blank")}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-10 h-10 mx-auto text-white/20 mb-2" />
                  <p className="text-white/50 text-sm">
                    No uploaded files found for this request
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DocumentStorage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("documents");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("miscellaneous");
  const [uploadEventId, setUploadEventId] = useState("");
  const [uploadFile, setUploadFile] = useState<globalThis.File | null>(null);

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const documentQueryKey =
    selectedEventId !== "all"
      ? ["/api/documents", { eventId: selectedEventId }]
      : ["/api/documents"];

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: documentQueryKey,
    queryFn: async () => {
      const url =
        selectedEventId !== "all"
          ? `/api/documents?eventId=${selectedEventId}`
          : "/api/documents";
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(url, { headers, credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error("File is required");
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName || uploadFile.name);
      formData.append("category", uploadCategory);
      if (uploadEventId) formData.append("eventId", uploadEventId);
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/documents", {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setUploadDialogOpen(false);
      setUploadName("");
      setUploadCategory("miscellaneous");
      setUploadEventId("");
      setUploadFile(null);
      toast({ title: "Document uploaded successfully" });
    },
    onError: (err: Error) => {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const toggleShareMutation = useMutation({
    mutationFn: (doc: Document) =>
      apiRequest("PATCH", `/api/documents/${doc.id}`, {
        sharedWithClient: !doc.shared_with_client,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Sharing status updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) =>
      apiRequest("DELETE", `/api/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document deleted" });
    },
  });

  return (
    <div className="flex min-h-screen">
      <PlannerSidebar />
      <main className="flex-1 lg:ml-60 min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209]">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Document Storage</h1>
              <p className="text-white/60 text-sm mt-1">
                Central hub for all your event documents
              </p>
            </div>
            <div className="flex gap-2">
              {documents.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => {
                    openPrintWindow({
                      title: "Document Storage",
                      stats: [
                        { label: "Total Files", value: documents.length },
                        { label: "Shared", value: documents.filter((d) => d.shared_with_client).length },
                        { label: "Contracts", value: documents.filter((d) => d.category === "contracts").length },
                        { label: "Photos", value: documents.filter((d) => d.category === "photos").length },
                      ],
                      columns: [
                        { header: "Name", key: "name" },
                        { header: "File Name", key: "file_name" },
                        { header: "Category", key: "category" },
                        { header: "Size", key: "file_size", format: (v) => formatFileSize(v) },
                        { header: "Shared", key: "shared_with_client", format: (v) => v ? "Yes" : "No" },
                        { header: "Uploaded", key: "created_at", format: (v) => formatDate(v) },
                      ],
                      rows: documents,
                    });
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
              )}
              {activeTab === "documents" && (
                <Button
                  className="bg-white text-[#330311] font-semibold hover:bg-white/90"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload Document
                </Button>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/10 border border-white/10">
              <TabsTrigger
                value="documents"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger
                value="requests"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                <Mail className="w-4 h-4 mr-2" />
                Requests
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="mt-6">
              <DocumentsTab
                events={events}
                documents={documents}
                isLoading={isLoading}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedEventId={selectedEventId}
                setSelectedEventId={setSelectedEventId}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                viewMode={viewMode}
                setViewMode={setViewMode}
                setUploadDialogOpen={setUploadDialogOpen}
                toggleShareMutation={toggleShareMutation}
                deleteMutation={deleteMutation}
              />
            </TabsContent>

            <TabsContent value="requests" className="mt-6">
              <RequestsTab events={events} />
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="bg-[#2a0209] border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-lg">
                Upload Document
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-white/70">File *</Label>
                <Input
                  type="file"
                  className="bg-white/10 border-white/10 text-white mt-1 file:text-white file:bg-[#330311] file:border-0 file:rounded file:px-3 file:py-1 file:mr-3"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <Label className="text-white/70">Document Name</Label>
                <Input
                  className="bg-white/10 border-white/10 text-white mt-1 placeholder:text-white/30"
                  placeholder="Enter document name..."
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-white/70">Category</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger className="bg-white/10 border-white/10 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Event</Label>
                <Select value={uploadEventId} onValueChange={setUploadEventId}>
                  <SelectTrigger className="bg-white/10 border-white/10 text-white mt-1">
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((ev) => (
                      <SelectItem key={ev.id} value={String(ev.id)}>
                        {ev.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-white text-[#330311] font-semibold hover:bg-white/90"
                onClick={() => uploadMutation.mutate()}
                disabled={!uploadFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}