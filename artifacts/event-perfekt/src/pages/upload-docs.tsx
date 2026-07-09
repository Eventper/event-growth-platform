import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from "lucide-react";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

export default function UploadDocs({ token }: { token: string }) {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: request, isLoading, error } = useQuery<any>({
    queryKey: ["/api/upload-docs", token],
    queryFn: () => fetch(`/api/upload-docs/${token}`).then(r => {
      if (!r.ok) throw new Error("Invalid link");
      return r.json();
    }),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error("Please select files");
      const formData = new FormData();
      files.forEach(f => formData.append("files", f));
      const res = await fetch(`/api/upload-docs/${token}`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      setUploaded(true);
      toast({ title: "Documents Uploaded", description: "Thank you! Your documents have been received." });
    },
    onError: (err: Error) => {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#8B1538] animate-spin" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Invalid or Expired Link</h2>
            <p className="text-gray-500">This document upload link is no longer valid. Please contact Event Perfekt for assistance.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (uploaded || request.status === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-green-200">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Documents Received!</h2>
            <p className="text-gray-500 mb-4">Thank you, {request.recipientName}. Your documents have been successfully uploaded and our team has been notified.</p>
            <img src={eventPerfektLogo} alt="Event Perfekt" className="h-10 w-10 rounded-lg mx-auto opacity-60" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-6">
          <img src={eventPerfektLogo} alt="Event Perfekt" className="h-14 w-14 rounded-xl mx-auto mb-3 shadow-md" />
          <h1 className="text-2xl font-bold text-gray-800">Document Upload</h1>
          <p className="text-gray-500 text-sm mt-1 italic">...making yours perfekt</p>
        </div>

        <Card className="border-[#e8e0d8]">
          <CardContent className="p-6 space-y-5">
            <div className="bg-[#faf8f5] rounded-lg p-4 border border-[#e8e0d8]">
              <p className="text-sm text-gray-600">
                Hello <span className="font-semibold text-gray-800">{request.recipientName}</span>,
              </p>
              {request.eventName && (
                <p className="text-sm text-gray-500 mt-1">Event: <span className="font-medium text-gray-700">{request.eventName}</span></p>
              )}
              {request.message && (
                <p className="text-sm text-gray-500 mt-2 italic">"{request.message}"</p>
              )}
            </div>

            {request.requestedDocuments?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#8B1538] uppercase tracking-wider mb-2">Documents Requested:</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {request.requestedDocuments.join(" • ")}
                </p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
              }}
            />

            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-10 rounded-xl border-2 border-dashed border-[#8B1538]/30 hover:border-[#8B1538]/60 bg-[#8B1538]/5 hover:bg-[#8B1538]/10 transition-all flex flex-col items-center justify-center gap-2"
            >
              <Upload className="w-8 h-8 text-[#8B1538]/50" />
              <span className="text-sm font-medium text-gray-600">Click to select files</span>
              <span className="text-xs text-gray-400">PDF, Images, Documents — up to 10 files</span>
            </button>

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">{files.length} file(s) selected:</p>
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-[#8B1538]/50 flex-shrink-0" />
                      <span className="truncate text-gray-700">{f.name}</span>
                      <span className="text-gray-400 text-xs flex-shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button
                      onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={files.length === 0 || uploadMutation.isPending}
              className="w-full bg-[#8B1538] hover:bg-[#a01d45] text-white py-3"
            >
              {uploadMutation.isPending ? "Uploading..." : `Upload ${files.length} Document${files.length !== 1 ? "s" : ""}`}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by Event Perfekt &bull; Your files are securely transmitted
        </p>
      </div>
    </div>
  );
}
