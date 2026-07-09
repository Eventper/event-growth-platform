import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PlannerSidebar from "@/components/PlannerSidebar";
import {
  FileText, Plus, Eye, Send, Edit, Trash2, CheckCircle, XCircle, Clock,
  Calendar, Users, MapPin, Banknote, ChevronRight, ArrowLeft, Download,
  Printer, Sparkles, Building2, FileCheck, AlertCircle, Image, Upload,
  X, Camera, GalleryHorizontalEnd, Star, Crown, Palette, Mail,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

function getCurrencySymbol(code: string): string {
  const symbols: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€", ZAR: "R", GHS: "GH₵", KES: "KSh", CAD: "CA$", AUD: "A$", AED: "AED", INR: "₹" };
  return symbols[code] || code;
}

function formatMoney(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "draft": return <Badge className="bg-gray-100 text-gray-700">Draft</Badge>;
    case "sent": return <Badge className="bg-blue-100 text-blue-700">Sent</Badge>;
    case "accepted": return <Badge className="bg-green-100 text-green-700">Accepted</Badge>;
    case "rejected": return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function parseProposalSections(content: string) {
  if (!content) return [];
  const lines = content.split('\n');
  const sections: { heading: string; body: string[] }[] = [];
  let current: { heading: string; body: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('===') || trimmed.startsWith('---')) continue;
    if (trimmed.match(/^[A-Z][A-Z\s&/,.'()-]+$/) && trimmed.length > 3 && trimmed.length < 80) {
      if (current) sections.push(current);
      current = { heading: trimmed, body: [] };
    } else if (current) {
      current.body.push(line);
    } else {
      if (!sections.length) {
        current = { heading: "", body: [line] };
      }
    }
  }
  if (current) sections.push(current);
  return sections;
}

function PremiumProposalView({ proposal, heroImage, galleryImages }: { proposal: any; heroImage: string | null; galleryImages: string[] }) {
  const currency = proposal.currency || proposal.event_currency || "NGN";
  const sections = parseProposalSections(proposal.content || "");

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
      {heroImage ? (
        <div className="relative h-80 overflow-hidden">
          <img src={heroImage} alt="Event Hero" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#330311]/90 via-[#330311]/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-10">
            <img src={eventPerfektLogo} alt="Event Perfekt" className="h-14 w-14 rounded-xl mb-4 border-2 border-white/30 shadow-lg" />
            <h1 className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
              {proposal.title || "Event Proposal"}
            </h1>
            <p className="text-white/70 mt-1 text-sm italic">...making yours perfekt</p>
          </div>
        </div>
      ) : (
        <div className="relative h-64 bg-gradient-to-br from-[#330311] via-[#8B1538] to-[#4a0a20] overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 w-64 h-64 rounded-full border border-white/20" />
            <div className="absolute bottom-0 left-20 w-96 h-96 rounded-full border border-white/10" />
            <div className="absolute top-20 left-1/3 w-32 h-32 rounded-full border border-white/15" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-10">
            <img src={eventPerfektLogo} alt="Event Perfekt" className="h-14 w-14 rounded-xl mb-4 border-2 border-white/30 shadow-lg" />
            <h1 className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
              {proposal.title || "Event Proposal"}
            </h1>
            <p className="text-white/70 mt-1 text-sm italic">...making yours perfekt</p>
          </div>
        </div>
      )}

      <div className="bg-[#faf8f5] px-10 py-6 border-b border-[#e8e0d8]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {proposal.event_name && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8B1538]/60 mb-1">Event</p>
              <p className="text-sm font-medium text-gray-800">{proposal.event_name}</p>
            </div>
          )}
          {(proposal.company_name || proposal.client_name) && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8B1538]/60 mb-1">Client</p>
              <p className="text-sm font-medium text-gray-800">{proposal.company_name || proposal.client_name}</p>
            </div>
          )}
          {proposal.total_amount && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8B1538]/60 mb-1">Investment</p>
              <p className="text-sm font-bold text-[#8B1538]">{formatMoney(Number(proposal.total_amount), currency)}</p>
            </div>
          )}
          {proposal.valid_until && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8B1538]/60 mb-1">Valid Until</p>
              <p className="text-sm font-medium text-gray-800">{new Date(proposal.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-10 py-8">
        {sections.length > 0 ? (
          <div className="space-y-8">
            {sections.map((section, idx) => (
              <div key={idx}>
                {section.heading && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-[2px] bg-[#8B1538]" />
                    <h2 className="text-lg font-bold text-[#330311] uppercase tracking-wider" style={{ fontFamily: "Poppins, sans-serif" }}>
                      {section.heading}
                    </h2>
                  </div>
                )}
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap pl-11">
                  {section.body.join('\n').trim()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
            {proposal.content || "No content yet."}
          </pre>
        )}
      </div>

      {galleryImages && galleryImages.length > 0 && (
        <div className="px-10 py-8 bg-[#faf8f5] border-t border-[#e8e0d8]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-[2px] bg-[#8B1538]" />
            <h2 className="text-lg font-bold text-[#330311] uppercase tracking-wider" style={{ fontFamily: "Poppins, sans-serif" }}>
              Visual Inspiration
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImages.map((img: string, idx: number) => (
              <div key={idx} className="aspect-[4/3] rounded-xl overflow-hidden shadow-md border border-[#e8e0d8]">
                <img src={img} alt={`Inspiration ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-10 py-8 bg-gradient-to-r from-[#330311] to-[#8B1538] text-center">
        <img src={eventPerfektLogo} alt="Event Perfekt" className="h-10 w-10 rounded-lg mx-auto mb-3 border border-white/20" />
        <p className="text-white/90 text-sm font-medium">Event Perfekt</p>
        <p className="text-white/50 text-xs mt-1 italic">...making yours perfekt</p>
        <div className="mt-4 flex items-center justify-center gap-6 text-white/40 text-[10px]">
          <span>www.eventperfekt.com</span>
          <span>•</span>
          <span>admin@eventperfekt.com</span>
        </div>
      </div>
    </div>
  );
}

function ProposalDetail({ proposal: initialProposal, onBack }: { proposal: any; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(initialProposal.content || "");
  const [editTitle, setEditTitle] = useState(initialProposal.title || "");
  const [activeTab, setActiveTab] = useState("preview");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailName, setEmailName] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { data: proposal } = useQuery({
    queryKey: ['/api/proposals', initialProposal.id],
    queryFn: () => fetch(`/api/proposals/${initialProposal.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()),
    initialData: initialProposal,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/proposals/${proposal.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals', proposal.id] });
      setIsEditing(false);
      toast({ title: "Proposal Updated", description: "Changes saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update proposal.", variant: "destructive" });
    },
  });

  const heroUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('heroImage', file);
      const res = await fetch(`/api/proposals/${proposal.id}/upload-hero`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals', proposal.id] });
      toast({ title: "Hero Image Updated", description: "Your proposal hero banner has been set." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload hero image.", variant: "destructive" });
    },
  });

  const galleryUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('galleryImage', file);
      const res = await fetch(`/api/proposals/${proposal.id}/upload-gallery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals', proposal.id] });
      toast({ title: "Image Added", description: "Gallery image added to proposal." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload gallery image.", variant: "destructive" });
    },
  });

  const removeGalleryMutation = useMutation({
    mutationFn: async (index: number) => {
      const res = await fetch(`/api/proposals/${proposal.id}/gallery/${index}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals', proposal.id] });
      toast({ title: "Image Removed" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("PATCH", `/api/proposals/${proposal.id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals', proposal.id] });
      toast({ title: "Status Updated" });
    },
  });

  const removeHeroMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/proposals/${proposal.id}`, { heroImage: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals', proposal.id] });
      toast({ title: "Hero Image Removed" });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { recipientEmail: string; recipientName: string; personalMessage: string }) => {
      return apiRequest("POST", `/api/proposals/${proposal.id}/send-email`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals', proposal.id] });
      setShowEmailDialog(false);
      setEmailTo("");
      setEmailName("");
      setEmailMessage("");
      toast({ title: "Proposal Sent!", description: `Proposal emailed successfully.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send proposal email. Check email configuration.", variant: "destructive" });
    },
  });

  const handleDownload = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const galleryHtml = (proposal.gallery_images || []).length > 0 ? `
      <div style="page-break-before: always; padding: 40px 0;">
        <h2 style="color: #8B1538; font-family: 'Poppins', sans-serif;, Georgia, serif; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 30px; font-size: 16px;">
          <span style="display: inline-block; width: 30px; height: 2px; background: #8B1538; vertical-align: middle; margin-right: 12px;"></span>
          Visual Inspiration
        </h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          ${(proposal.gallery_images || []).map((img: string) => `
            <div style="aspect-ratio: 4/3; overflow: hidden; border-radius: 8px; border: 1px solid #e8e0d8;">
              <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    printWindow.document.write(`
      <html><head><title>${proposal.title || 'Proposal'} - Download</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Poppins', sans-serif; color: #333; }
          .hero { position: relative; height: 300px; overflow: hidden; ${proposal.hero_image ? `background-image: url('${proposal.hero_image}'); background-size: cover; background-position: center;` : 'background: linear-gradient(135deg, #330311, #8B1538, #4a0a20);'} }
          .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(51,3,17,0.9), rgba(51,3,17,0.3), transparent); }
          .hero-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 40px 60px; color: white; }
          .hero-content h1 { font-family: 'Poppins', sans-serif;, serif; font-size: 28px; letter-spacing: 1px; }
          .hero-content .tagline { font-size: 12px; color: rgba(255,255,255,0.6); font-style: italic; margin-top: 4px; }
          .meta-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 24px 60px; background: #faf8f5; border-bottom: 1px solid #e8e0d8; }
          .meta-bar .label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: rgba(139,21,56,0.5); margin-bottom: 4px; }
          .meta-bar .value { font-size: 13px; font-weight: 500; color: #333; }
          .content { padding: 40px 60px; }
          .section { margin-bottom: 30px; }
          .section h2 { font-family: 'Poppins', sans-serif;, serif; font-size: 16px; text-transform: uppercase; letter-spacing: 3px; color: #330311; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
          .section h2::before { content: ''; display: inline-block; width: 30px; height: 2px; background: #8B1538; }
          .section-body { font-size: 13px; line-height: 1.8; color: #555; white-space: pre-wrap; padding-left: 42px; }
          .footer { text-align: center; padding: 30px 60px; background: linear-gradient(to right, #330311, #8B1538); color: white; }
          .footer .name { font-size: 14px; font-weight: 500; }
          .footer .tagline { font-size: 11px; color: rgba(255,255,255,0.5); font-style: italic; margin-top: 2px; }
          .footer .links { margin-top: 12px; font-size: 10px; color: rgba(255,255,255,0.35); }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head><body>
        <div class="hero"><div class="hero-overlay"></div><div class="hero-content">
          <h1>${proposal.title || 'Event Proposal'}</h1><div class="tagline">...making yours perfekt</div>
        </div></div>
        <div class="meta-bar">
          ${proposal.event_name ? `<div><div class="label">Event</div><div class="value">${proposal.event_name}</div></div>` : ''}
          ${proposal.company_name || proposal.client_name ? `<div><div class="label">Client</div><div class="value">${proposal.company_name || proposal.client_name}</div></div>` : ''}
          ${proposal.total_amount ? `<div><div class="label">Investment</div><div class="value" style="color:#8B1538;font-weight:700;">${formatMoney(Number(proposal.total_amount), proposal.currency || proposal.event_currency || 'NGN')}</div></div>` : ''}
          ${proposal.valid_until ? `<div><div class="label">Valid Until</div><div class="value">${new Date(proposal.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>` : ''}
        </div>
        <div class="content">
          ${parseProposalSections(proposal.content || '').map((s: any) => `
            <div class="section">
              ${s.heading ? `<h2>${s.heading}</h2>` : ''}
              <div class="section-body">${s.body.join('\n').trim()}</div>
            </div>
          `).join('')}
        </div>
        ${galleryHtml}
        <div class="footer">
          <div class="name">Event Perfekt</div>
          <div class="tagline">...making yours perfekt</div>
          <div class="links">www.eventperfekt.com &bull; admin@eventperfekt.com</div>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    toast({ title: "Download Ready", description: "Use your browser's Save as PDF option (Ctrl/Cmd+P → Save as PDF) to download." });
    setTimeout(() => printWindow.print(), 500);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const galleryHtml = (proposal.gallery_images || []).length > 0 ? `
      <div style="page-break-before: always; padding: 40px 0;">
        <h2 style="color: #8B1538; font-family: 'Poppins', sans-serif;, Georgia, serif; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 30px; font-size: 16px;">
          <span style="display: inline-block; width: 30px; height: 2px; background: #8B1538; vertical-align: middle; margin-right: 12px;"></span>
          Visual Inspiration
        </h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          ${(proposal.gallery_images || []).map((img: string) => `
            <div style="aspect-ratio: 4/3; overflow: hidden; border-radius: 8px; border: 1px solid #e8e0d8;">
              <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>${proposal.title || 'Proposal'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Poppins', sans-serif; color: #333; }
            .hero { position: relative; height: 300px; overflow: hidden; ${proposal.hero_image ? `background-image: url('${proposal.hero_image}'); background-size: cover; background-position: center;` : 'background: linear-gradient(135deg, #330311, #8B1538, #4a0a20);'} }
            .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(51,3,17,0.9), rgba(51,3,17,0.3), transparent); }
            .hero-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 40px 60px; color: white; }
            .hero-content h1 { font-family: 'Poppins', sans-serif;, serif; font-size: 28px; letter-spacing: 1px; }
            .hero-content .tagline { font-size: 12px; color: rgba(255,255,255,0.6); font-style: italic; margin-top: 4px; }
            .meta-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 24px 60px; background: #faf8f5; border-bottom: 1px solid #e8e0d8; }
            .meta-bar .label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: rgba(139,21,56,0.5); margin-bottom: 4px; }
            .meta-bar .value { font-size: 13px; font-weight: 500; color: #333; }
            .content { padding: 40px 60px; }
            .section { margin-bottom: 30px; }
            .section h2 { font-family: 'Poppins', sans-serif;, serif; font-size: 16px; text-transform: uppercase; letter-spacing: 3px; color: #330311; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
            .section h2::before { content: ''; display: inline-block; width: 30px; height: 2px; background: #8B1538; }
            .section-body { font-size: 13px; line-height: 1.8; color: #555; white-space: pre-wrap; padding-left: 42px; }
            .footer { text-align: center; padding: 30px 60px; background: linear-gradient(to right, #330311, #8B1538); color: white; }
            .footer .name { font-size: 14px; font-weight: 500; }
            .footer .tagline { font-size: 11px; color: rgba(255,255,255,0.5); font-style: italic; margin-top: 2px; }
            .footer .links { margin-top: 12px; font-size: 10px; color: rgba(255,255,255,0.35); }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .hero { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="hero">
            <div class="hero-overlay"></div>
            <div class="hero-content">
              <h1>${proposal.title || 'Event Proposal'}</h1>
              <div class="tagline">...making yours perfekt</div>
            </div>
          </div>
          <div class="meta-bar">
            ${proposal.event_name ? `<div><div class="label">Event</div><div class="value">${proposal.event_name}</div></div>` : ''}
            ${proposal.company_name || proposal.client_name ? `<div><div class="label">Client</div><div class="value">${proposal.company_name || proposal.client_name}</div></div>` : ''}
            ${proposal.total_amount ? `<div><div class="label">Investment</div><div class="value" style="color:#8B1538;font-weight:700;">${formatMoney(Number(proposal.total_amount), proposal.currency || proposal.event_currency || 'NGN')}</div></div>` : ''}
            ${proposal.valid_until ? `<div><div class="label">Valid Until</div><div class="value">${new Date(proposal.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>` : ''}
          </div>
          <div class="content">
            ${parseProposalSections(proposal.content || '').map(s => `
              <div class="section">
                ${s.heading ? `<h2>${s.heading}</h2>` : ''}
                <div class="section-body">${s.body.join('\n').trim()}</div>
              </div>
            `).join('')}
          </div>
          ${galleryHtml}
          <div class="footer">
            <div class="name">Event Perfekt</div>
            <div class="tagline">...making yours perfekt</div>
            <div class="links">www.eventperfekt.com &bull; admin@eventperfekt.com</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const currency = proposal.currency || proposal.event_currency || "NGN";
  const heroImg = proposal.hero_image || null;
  const galleryImgs = proposal.gallery_images || [];

  return (
    <div>
      <input type="file" ref={heroInputRef} accept="image/*" className="hidden" onChange={(e) => {
        if (e.target.files?.[0]) heroUploadMutation.mutate(e.target.files[0]);
        e.target.value = '';
      }} />
      <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={(e) => {
        if (e.target.files?.[0]) galleryUploadMutation.mutate(e.target.files[0]);
        e.target.value = '';
      }} />

      <Button onClick={onBack} variant="ghost" className="mb-4 text-gray-400 hover:text-white gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Proposals
      </Button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Premium Proposal</span>
          </div>
          <h2 className="text-2xl font-bold text-white">{proposal.title || "Untitled Proposal"}</h2>
          <div className="flex items-center gap-3 mt-2">
            {getStatusBadge(proposal.status)}
            {proposal.event_name && <span className="text-white/60 text-sm">for {proposal.event_name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
                setActiveTab("preview");
              } else {
                setIsEditing(true);
                setEditTitle(proposal.title || "");
                setEditContent(proposal.content || "");
                setActiveTab("edit");
              }
            }}
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Edit className="w-4 h-4 mr-1" /> {isEditing ? "Cancel Edit" : "Edit"}
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
            <Download className="w-4 h-4 mr-1" /> Download PDF
          </Button>
          <Button onClick={() => setShowEmailDialog(true)} size="sm" className="bg-[#8B1538] hover:bg-[#a01d45] text-white">
            <Mail className="w-4 h-4 mr-1" /> Send via Email
          </Button>
          {proposal.status === 'draft' && (
            <Button onClick={() => statusMutation.mutate('sent')} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="w-4 h-4 mr-1" /> Mark as Sent
            </Button>
          )}
          {proposal.status === 'sent' && (
            <>
              <Button onClick={() => statusMutation.mutate('accepted')} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="w-4 h-4 mr-1" /> Accepted
              </Button>
              <Button onClick={() => statusMutation.mutate('rejected')} size="sm" variant="outline" className="border-red-400 text-red-400 hover:bg-red-900/20">
                <XCircle className="w-4 h-4 mr-1" /> Rejected
              </Button>
            </>
          )}
          {(proposal.status === 'rejected' || proposal.status === 'accepted') && (
            <Button onClick={() => statusMutation.mutate('draft')} size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
              Reset to Draft
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="preview" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
            <Eye className="w-4 h-4 mr-1.5" /> Preview
          </TabsTrigger>
          <TabsTrigger value="images" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
            <Image className="w-4 h-4 mr-1.5" /> Images
            {(heroImg || galleryImgs.length > 0) && (
              <span className="ml-1.5 text-[10px] bg-amber-400/20 text-amber-300 px-1.5 rounded-full">{(heroImg ? 1 : 0) + galleryImgs.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="edit" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
            <Edit className="w-4 h-4 mr-1.5" /> Edit Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <PremiumProposalView proposal={proposal} heroImage={heroImg} galleryImages={galleryImgs} />
        </TabsContent>

        <TabsContent value="images">
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#8B1538]" />
                  Hero Banner Image
                </CardTitle>
                <p className="text-white/40 text-xs">The hero image appears as a full-width banner at the top of the proposal. Use a stunning venue photo, decor shot, or mood board image.</p>
              </CardHeader>
              <CardContent>
                {heroImg ? (
                  <div className="relative group">
                    <div className="aspect-[21/9] rounded-xl overflow-hidden border border-white/10">
                      <img src={heroImg} alt="Hero" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" onClick={() => heroInputRef.current?.click()} className="bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm">
                        <Upload className="w-3.5 h-3.5 mr-1" /> Replace
                      </Button>
                      <Button size="sm" onClick={() => removeHeroMutation.mutate()} variant="destructive" className="bg-red-600/80 hover:bg-red-600 backdrop-blur-sm">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => heroInputRef.current?.click()}
                    className="w-full aspect-[21/9] rounded-xl border-2 border-dashed border-white/20 hover:border-[#8B1538]/50 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-3 group"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#8B1538]/10 flex items-center justify-center group-hover:bg-[#8B1538]/20 transition-colors">
                      <Upload className="w-7 h-7 text-[#8B1538]/50 group-hover:text-[#8B1538]" />
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-sm font-medium">Upload Hero Banner</p>
                      <p className="text-white/30 text-xs mt-1">Recommended: 1920×800px or wider</p>
                    </div>
                  </button>
                )}
                {heroUploadMutation.isPending && (
                  <div className="mt-3 flex items-center gap-2 text-amber-400 text-sm">
                    <div className="animate-spin w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full" />
                    Uploading hero image...
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <GalleryHorizontalEnd className="w-5 h-5 text-[#8B1538]" />
                      Inspiration Gallery
                      {galleryImgs.length > 0 && (
                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/50">{galleryImgs.length} images</span>
                      )}
                    </CardTitle>
                    <p className="text-white/40 text-xs mt-1">Add venue photos, decor inspiration, mood boards, or any visuals to enhance the proposal.</p>
                  </div>
                  <Button onClick={() => galleryInputRef.current?.click()} size="sm" className="bg-[#8B1538] hover:bg-[#a01d45] text-white">
                    <Plus className="w-4 h-4 mr-1" /> Add Image
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {galleryImgs.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {galleryImgs.map((img: string, idx: number) => (
                      <div key={idx} className="relative group">
                        <div className="aspect-[4/3] rounded-xl overflow-hidden border border-white/10">
                          <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                        <button
                          onClick={() => removeGalleryMutation.mutate(idx)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      className="aspect-[4/3] rounded-xl border-2 border-dashed border-white/20 hover:border-[#8B1538]/50 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2"
                    >
                      <Plus className="w-6 h-6 text-white/30" />
                      <span className="text-white/40 text-xs">Add More</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full py-16 rounded-xl border-2 border-dashed border-white/20 hover:border-[#8B1538]/50 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-3 group"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#8B1538]/10 flex items-center justify-center group-hover:bg-[#8B1538]/20 transition-colors">
                      <Palette className="w-6 h-6 text-[#8B1538]/50 group-hover:text-[#8B1538]" />
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-sm font-medium">Add Inspiration Images</p>
                      <p className="text-white/30 text-xs mt-1">Venue photos, decor ideas, mood boards, colour palettes</p>
                    </div>
                  </button>
                )}
                {galleryUploadMutation.isPending && (
                  <div className="mt-3 flex items-center gap-2 text-amber-400 text-sm">
                    <div className="animate-spin w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full" />
                    Adding image to gallery...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="edit">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#8B1538]" />
                Edit Proposal Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Proposal Title</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Total Amount</Label>
                    <Input
                      type="number"
                      defaultValue={proposal.total_amount || ""}
                      onBlur={(e) => {
                        if (e.target.value !== String(proposal.total_amount || "")) {
                          updateMutation.mutate({ totalAmount: e.target.value ? Number(e.target.value) : null });
                        }
                      }}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Enter proposal amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Valid Until</Label>
                    <Input
                      type="date"
                      defaultValue={proposal.valid_until ? new Date(proposal.valid_until).toISOString().split('T')[0] : ""}
                      onBlur={(e) => {
                        if (e.target.value) {
                          updateMutation.mutate({ validUntil: e.target.value });
                        }
                      }}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Content</Label>
                  <p className="text-white/30 text-xs">Use ALL CAPS lines as section headings. They will be styled as premium section dividers in the preview.</p>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={30}
                    className="bg-white/10 border-white/20 text-white font-mono text-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => updateMutation.mutate({ title: editTitle, content: editContent })}
                    disabled={updateMutation.isPending}
                    className="bg-[#8B1538] hover:bg-[#a01d45] text-white"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    onClick={() => setActiveTab("preview")}
                    variant="ghost"
                    className="text-white/50 hover:text-white"
                  >
                    Back to Preview
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="bg-[#1a0508] border-[#330311] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#8B1538]" />
              Send Proposal via Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Recipient Email *</Label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="client@example.com"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Recipient Name</Label>
              <Input
                value={emailName}
                onChange={(e) => setEmailName(e.target.value)}
                placeholder="John Smith"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Personal Message (optional)</Label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="We're excited to present this proposal for your upcoming event..."
                rows={3}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <p className="text-white/30 text-xs">The proposal will be sent as a beautifully formatted HTML email with all content, images, and branding included.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowEmailDialog(false)} className="text-white/50 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!emailTo) {
                  toast({ title: "Email Required", description: "Please enter a recipient email address.", variant: "destructive" });
                  return;
                }
                sendEmailMutation.mutate({ recipientEmail: emailTo, recipientName: emailName, personalMessage: emailMessage });
              }}
              disabled={sendEmailMutation.isPending || !emailTo}
              className="bg-[#8B1538] hover:bg-[#a01d45] text-white"
            >
              {sendEmailMutation.isPending ? "Sending..." : "Send Proposal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProposalBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const { data: proposals = [], isLoading: proposalsLoading } = useQuery<any[]>({
    queryKey: ['/api/proposals'],
    queryFn: () => fetch('/api/proposals', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()),
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ['/api/events'],
  });

  const generateMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return apiRequest("POST", `/api/proposals/generate/${eventId}`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      toast({ title: "Proposal Generated!", description: "A premium proposal has been created. Add hero images and gallery photos to make it shine." });
      setSelectedProposal(data);
      setSelectedEventId("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate proposal.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/proposals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      toast({ title: "Deleted", description: "Proposal removed." });
    },
  });

  const draftCount = (proposals as any[]).filter(p => p.status === 'draft').length;
  const sentCount = (proposals as any[]).filter(p => p.status === 'sent').length;
  const acceptedCount = (proposals as any[]).filter(p => p.status === 'accepted').length;

  return (
    <div className="min-h-screen">
      <PlannerSidebar />
      <main className="lg:ml-60 p-6 overflow-y-auto">
        {selectedProposal ? (
          <ProposalDetail proposal={selectedProposal} onBack={() => setSelectedProposal(null)} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Premium</span>
                </div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <FileText className="w-8 h-8 text-[#8B1538]" />
                  Proposal Builder
                </h1>
                <p className="text-white/60 mt-1">Create stunning visual proposals with hero images and photo galleries</p>
              </div>
            </div>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Generate New Proposal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="text-white/70">Select an Event</Label>
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Choose an event to generate proposal from..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(events as any[]).map((event: any) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.name} — {event.eventCategory || event.type} ({event.city}, {event.country})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      if (!selectedEventId) {
                        toast({ title: "Select an Event", description: "Please choose an event first.", variant: "destructive" });
                        return;
                      }
                      generateMutation.mutate(selectedEventId);
                    }}
                    disabled={!selectedEventId || generateMutation.isPending}
                    className="bg-[#8B1538] hover:bg-[#a01d45] text-white px-6"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {generateMutation.isPending ? "Generating..." : "Generate Proposal"}
                  </Button>
                </div>
                <p className="text-white/40 text-xs mt-3">
                  Proposals are auto-generated with premium styling. After generation, upload a hero banner and inspiration gallery photos to create a truly impressive presentation.
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">Total Proposals</span>
                    <FileText className="w-4 h-4 text-white/30" />
                  </div>
                  <p className="text-2xl font-bold text-white">{(proposals as any[]).length}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">Drafts</span>
                    <Edit className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{draftCount}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">Sent</span>
                    <Send className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{sentCount}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">Accepted</span>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-green-400">{acceptedCount}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="bg-white/5 border border-white/10">
                <TabsTrigger value="all" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
                  All ({(proposals as any[]).length})
                </TabsTrigger>
                <TabsTrigger value="draft" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
                  Drafts ({draftCount})
                </TabsTrigger>
                <TabsTrigger value="sent" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
                  Sent ({sentCount})
                </TabsTrigger>
                <TabsTrigger value="accepted" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
                  Accepted ({acceptedCount})
                </TabsTrigger>
              </TabsList>

              {["all", "draft", "sent", "accepted"].map(tab => (
                <TabsContent key={tab} value={tab}>
                  <div className="space-y-3">
                    {proposalsLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-[#8B1538] rounded-full mx-auto"></div>
                        <p className="text-white/40 mt-3">Loading proposals...</p>
                      </div>
                    ) : (
                      <>
                        {(proposals as any[])
                          .filter(p => tab === 'all' || p.status === tab)
                          .map((proposal: any) => (
                            <Card
                              key={proposal.id}
                              className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group overflow-hidden"
                              onClick={() => setSelectedProposal(proposal)}
                            >
                              <CardContent className="p-0">
                                <div className="flex">
                                  {proposal.hero_image && (
                                    <div className="w-32 h-24 flex-shrink-0">
                                      <img src={proposal.hero_image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  <div className="flex-1 p-5">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                          {proposal.hero_image && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                                          <h3 className="font-bold text-white group-hover:text-[#8B1538] transition-colors">
                                            {proposal.title || "Untitled Proposal"}
                                          </h3>
                                          {getStatusBadge(proposal.status)}
                                          {(proposal.gallery_images?.length > 0) && (
                                            <span className="text-[10px] text-amber-400/60 flex items-center gap-1">
                                              <Image className="w-3 h-3" /> {proposal.gallery_images.length}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-white/50">
                                          {proposal.event_name && (
                                            <span className="flex items-center gap-1">
                                              <Calendar className="w-3.5 h-3.5" /> {proposal.event_name}
                                            </span>
                                          )}
                                          {(proposal.company_name || proposal.client_name) && (
                                            <span className="flex items-center gap-1">
                                              <Building2 className="w-3.5 h-3.5" /> {proposal.company_name || proposal.client_name}
                                            </span>
                                          )}
                                          {proposal.total_amount && (
                                            <span className="flex items-center gap-1">
                                              <Banknote className="w-3.5 h-3.5" />
                                              {formatMoney(Number(proposal.total_amount), proposal.currency || proposal.event_currency || "NGN")}
                                            </span>
                                          )}
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(proposal.created_at).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm("Delete this proposal?")) deleteMutation.mutate(proposal.id);
                                          }}
                                          className="text-white/30 hover:text-red-400 hover:bg-red-900/20"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        {(proposals as any[]).filter(p => tab === 'all' || p.status === tab).length === 0 && (
                          <Card className="bg-white/5 border-white/10">
                            <CardContent className="text-center py-16">
                              <Crown className="w-12 h-12 text-amber-400/20 mx-auto mb-4" />
                              <h3 className="text-lg font-bold text-white/60 mb-2">
                                {tab === 'all' ? 'No Proposals Yet' : `No ${tab} proposals`}
                              </h3>
                              <p className="text-white/40 max-w-md mx-auto">
                                Generate a premium proposal from an event above. Add hero banners and inspiration photos to create a truly memorable presentation.
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
