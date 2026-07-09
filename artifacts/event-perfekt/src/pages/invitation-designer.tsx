import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, Plus, Trash2, Edit2, Eye, Send, Download, Copy,
  Palette, Type, Image, ExternalLink, QrCode, Share2, Check, MessageCircle, Phone, Users,
  Globe, Mail
} from "lucide-react";

type Invitation = {
  id: string;
  eventId: string;
  name: string;
  template: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  headerText: string | null;
  bodyText: string | null;
  footerText: string | null;
  hostNames: string | null;
  venueText: string | null;
  dateText: string | null;
  timeText: string | null;
  dressCode: string | null;
  rsvpDeadline: string | null;
  customImageUrl: string | null;
  canvaDesignUrl: string | null;
  includeQrCode: boolean;
  includeMap: boolean;
  envelopeColor: string;
  linerPattern: string;
  isPublished: boolean;
  sentCount: number;
};

const TEMPLATES = [
  { id: "classic", name: "Classic Elegance", desc: "Timeless formal design", bg: "#fffaf5", text: "#330311", accent: "#8B1538" },
  { id: "modern", name: "Modern Minimal", desc: "Clean and contemporary", bg: "#ffffff", text: "#1a1a1a", accent: "#2d2d2d" },
  { id: "romantic", name: "Romantic Garden", desc: "Soft florals and pastels", bg: "#fdf2f8", text: "#831843", accent: "#be185d" },
  { id: "royal", name: "Royal Gold", desc: "Luxurious gold accents", bg: "#1a0a2e", text: "#ffd700", accent: "#daa520" },
  { id: "botanical", name: "Botanical Green", desc: "Natural greenery theme", bg: "#f0fdf4", text: "#14532d", accent: "#166534" },
  { id: "art-deco", name: "Art Deco", desc: "Gatsby-era glamour", bg: "#0f172a", text: "#f1c40f", accent: "#e67e22" },
  { id: "watercolor", name: "Watercolor Dream", desc: "Artistic and whimsical", bg: "#eff6ff", text: "#1e3a5f", accent: "#3b82f6" },
  { id: "rustic", name: "Rustic Charm", desc: "Warm and earthy tones", bg: "#fef3c7", text: "#78350f", accent: "#b45309" },
  { id: "corporate", name: "Corporate Professional", desc: "Business-ready design", bg: "#f8fafc", text: "#0f172a", accent: "#334155" },
  { id: "tropical", name: "Tropical Paradise", desc: "Vibrant island vibes", bg: "#ecfdf5", text: "#064e3b", accent: "#059669" },
  { id: "burgundy", name: "Event Perfekt Signature", desc: "Our branded burgundy", bg: "#330311", text: "#ffffff", accent: "#8B1538" },
  { id: "midnight", name: "Midnight Blue", desc: "Elegant evening affair", bg: "#0f172a", text: "#e2e8f0", accent: "#6366f1" },
];

const FONTS = [
  "Playfair Display", "Georgia", "Times New Roman", "Garamond",
  "Montserrat", "Helvetica", "Arial", "Futura",
  "Cormorant Garamond", "Lora", "Libre Baskerville", "Merriweather"
];

const ENVELOPE_COLORS = [
  { name: "Burgundy", value: "#330311" },
  { name: "Navy", value: "#0f172a" },
  { name: "Gold", value: "#b8860b" },
  { name: "Ivory", value: "#fffff0" },
  { name: "Blush", value: "#fdf2f8" },
  { name: "Forest", value: "#14532d" },
  { name: "Slate", value: "#334155" },
  { name: "Black", value: "#000000" },
];

const LINER_PATTERNS = ["floral", "geometric", "damask", "solid", "marble", "watercolor", "stars", "botanical"];

const CANVA_CREATE_URL = "https://www.canva.com/design/create?type=invitation";

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

export default function InvitationDesigner() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [view, setView] = useState<"gallery" | "editor" | "preview" | "send">("gallery");
  const [editingInv, setEditingInv] = useState<Invitation | null>(null);
  const [designTab, setDesignTab] = useState<"template" | "text" | "style" | "envelope" | "canva">("template");
  const [showEnvelope, setShowEnvelope] = useState(false);
  const [sendingInv, setSendingInv] = useState<Invitation | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");

  const [form, setForm] = useState({
    name: "My Invitation",
    template: "classic",
    backgroundColor: "#fffaf5",
    textColor: "#330311",
    accentColor: "#8B1538",
    fontFamily: "'Poppins', sans-serif",
    headerText: "You're Invited",
    bodyText: "We request the pleasure of your company",
    footerText: "Kindly respond by",
    hostNames: "",
    venueText: "",
    dateText: "",
    timeText: "",
    dressCode: "",
    rsvpDeadline: "",
    customImageUrl: "",
    canvaDesignUrl: "",
    includeQrCode: true,
    includeMap: false,
    envelopeColor: "#330311",
    linerPattern: "floral",
  });

  const { data: invitations = [], isLoading } = useQuery<Invitation[]>({
    queryKey: ["/api/events", eventId, "invitations"],
  });

  const { data: event } = useQuery({
    queryKey: ["/api/events", eventId],
  });

  const { data: guestList = [] } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "guests"],
    enabled: view === "send",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/events/${eventId}/invitations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "invitations"] });
      toast({ title: "Invitation Created" });
      setView("gallery");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/invitations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "invitations"] });
      toast({ title: "Invitation Updated" });
      setView("gallery");
      setEditingInv(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/invitations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "invitations"] });
      toast({ title: "Invitation Deleted" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/invitations/${id}`, { isPublished: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "invitations"] });
      toast({ title: "Invitation Published ✓" });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || "Failed to publish invitation";
      toast({ title: "Publish Failed", description: message, variant: "destructive" });
    },
  });

  const applyTemplate = (templateId: string) => {
    const t = TEMPLATES.find(t => t.id === templateId);
    if (t) {
      setForm(prev => ({
        ...prev,
        template: t.id,
        backgroundColor: t.bg,
        textColor: t.text,
        accentColor: t.accent,
      }));
    }
  };

  const startEdit = (inv: Invitation) => {
    setEditingInv(inv);
    setForm({
      name: inv.name,
      template: inv.template,
      backgroundColor: inv.backgroundColor || "#fffaf5",
      textColor: inv.textColor || "#330311",
      accentColor: inv.accentColor || "#8B1538",
      fontFamily: "'Poppins', sans-serif",
      headerText: inv.headerText || "You're Invited",
      bodyText: inv.bodyText || "",
      footerText: inv.footerText || "",
      hostNames: inv.hostNames || "",
      venueText: inv.venueText || "",
      dateText: inv.dateText || "",
      timeText: inv.timeText || "",
      dressCode: inv.dressCode || "",
      rsvpDeadline: inv.rsvpDeadline || "",
      customImageUrl: inv.customImageUrl || "",
      canvaDesignUrl: inv.canvaDesignUrl || "",
      includeQrCode: inv.includeQrCode,
      includeMap: inv.includeMap,
      envelopeColor: inv.envelopeColor || "#330311",
      linerPattern: inv.linerPattern || "floral",
    });
    setView("editor");
    setDesignTab("text");
  };

  const startNew = () => {
    setEditingInv(null);
    setForm({
      name: "My Invitation",
      template: "classic",
      backgroundColor: "#fffaf5",
      textColor: "#330311",
      accentColor: "#8B1538",
      fontFamily: "'Poppins', sans-serif",
      headerText: "You're Invited",
      bodyText: "We request the pleasure of your company",
      footerText: "Kindly respond by",
      hostNames: "",
      venueText: "",
      dateText: "",
      timeText: "",
      dressCode: "",
      rsvpDeadline: "",
      customImageUrl: "",
      canvaDesignUrl: "",
      includeQrCode: true,
      includeMap: false,
      envelopeColor: "#330311",
      linerPattern: "floral",
    });
    setView("editor");
    setDesignTab("template");
  };

  const handleSave = () => {
    if (editingInv) {
      updateMutation.mutate({ id: editingInv.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const getInvitationLink = (inv: Invitation) => `https://eventperfekt.net/invitation/${inv.id}`;

  const copyShareLink = (inv: Invitation) => {
    navigator.clipboard.writeText(getInvitationLink(inv));
    toast({ title: "Share link copied!" });
  };

  const buildInvMessage = (inv: Invitation, guestName?: string) => {
    const eventName = event && typeof event === 'object' && 'name' in event ? (event as any).name : "our event";
    const greeting = guestName ? `Hi ${guestName}! ` : '';
    return `${greeting}You're invited to ${eventName}! 🎉\n\n${inv.headerText || "We'd love to have you join us"}\n${inv.dateText ? `📅 ${inv.dateText}` : ""}\n${inv.timeText ? `⏰ ${inv.timeText}` : ""}\n${inv.venueText ? `📍 ${inv.venueText}` : ""}\n\nOpen your invitation here:\n${getInvitationLink(inv)}`;
  };

  const cleanPhone = (phone: string) => phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');

  const sendWhatsAppDirect = (phoneNumber: string, inv: Invitation, customMessage?: string) => {
    const message = customMessage || buildInvMessage(inv);
    const num = cleanPhone(phoneNumber);
    const waUrl = num
      ? `https://wa.me/${num}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const sendSMS = (phoneNumber: string, inv: Invitation, guestName?: string) => {
    const message = buildInvMessage(inv, guestName);
    const smsUrl = phoneNumber
      ? `sms:${phoneNumber}?body=${encodeURIComponent(message)}`
      : `sms:?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
  };

  const sendEmail = (emailAddr: string, inv: Invitation, guestName?: string, rsvpToken?: string) => {
    const subject = encodeURIComponent(inv.headerText || "You're Invited!");
    const link = getInvitationLink(inv);
    const rsvpLink = rsvpToken ? `\nRSVP: https://eventperfekt.net/api/rsvp/${rsvpToken}` : '';
    const body = encodeURIComponent(`${guestName ? `Hi ${guestName},\n\n` : ''}${inv.bodyText || "You're invited!"}\n\nOpen your invitation: ${link}${rsvpLink}`);
    window.open(`mailto:${emailAddr}?subject=${subject}&body=${body}`, '_blank');
  };

  const sendWhatsAppToGuest = (guest: any, inv: Invitation) => {
    if (!guest.phone) {
      toast({ title: "No phone number", description: `${guest.firstName} doesn't have a phone number`, variant: "destructive" });
      return;
    }
    const rsvpUrl = guest.rsvpToken ? `\n\nRSVP here:\nhttps://eventperfekt.net/api/rsvp/${guest.rsvpToken}` : '';
    sendWhatsAppDirect(guest.phone, inv, `${buildInvMessage(inv, guest.firstName)}${rsvpUrl}`);
  };

  const shareViaWhatsApp = (inv: Invitation) => {
    sendWhatsAppDirect("", inv);
  };

  const openSendView = (inv: Invitation) => {
    setSendingInv(inv);
    const eventName = event && typeof event === 'object' && 'name' in event ? (event as any).name : "our event";
    setWhatsappMessage(`You're invited to ${eventName}! 🎉\n\n${inv.headerText || "We'd love to have you join us"}\n${inv.dateText ? `📅 ${inv.dateText}` : ""}\n${inv.venueText ? `📍 ${inv.venueText}` : ""}\n\nOpen your invitation here:\n${getInvitationLink(inv)}`);
    setView("send");
  };

  const getPatternSVG = (pattern: string, color: string) => {
    const lightColor = color + "33";
    switch (pattern) {
      case "floral":
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="20" cy="20" r="3" fill="${lightColor}"/><circle cx="60" cy="20" r="3" fill="${lightColor}"/><circle cx="40" cy="40" r="3" fill="${lightColor}"/><circle cx="20" cy="60" r="3" fill="${lightColor}"/><circle cx="60" cy="60" r="3" fill="${lightColor}"/><path d="M20 17 Q23 20 20 23 Q17 20 20 17Z" fill="${lightColor}"/><path d="M60 17 Q63 20 60 23 Q57 20 60 17Z" fill="${lightColor}"/></svg>`;
      case "geometric":
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><path d="M0 0 L30 0 L0 30Z" fill="${lightColor}"/><path d="M60 0 L60 30 L30 0Z" fill="${lightColor}"/><path d="M0 60 L30 60 L0 30Z" fill="${lightColor}"/><path d="M60 60 L60 30 L30 60Z" fill="${lightColor}"/></svg>`;
      case "damask":
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><ellipse cx="40" cy="40" rx="15" ry="25" fill="none" stroke="${lightColor}" stroke-width="1"/><ellipse cx="40" cy="40" rx="25" ry="15" fill="none" stroke="${lightColor}" stroke-width="1"/></svg>`;
      case "marble":
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 50 Q25 30 50 50 Q75 70 100 50" fill="none" stroke="${lightColor}" stroke-width="2"/><path d="M0 30 Q25 10 50 30 Q75 50 100 30" fill="none" stroke="${lightColor}" stroke-width="1"/></svg>`;
      case "stars":
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><polygon points="30,5 35,20 50,20 38,30 42,45 30,35 18,45 22,30 10,20 25,20" fill="${lightColor}" transform="scale(0.4) translate(30,30)"/></svg>`;
      case "botanical":
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M40 10 Q50 25 40 40 Q30 25 40 10Z" fill="${lightColor}"/><path d="M20 40 Q30 50 20 60 Q10 50 20 40Z" fill="${lightColor}"/><path d="M60 40 Q70 50 60 60 Q50 50 60 40Z" fill="${lightColor}"/></svg>`;
      default:
        return "";
    }
  };

  const selectStyle = "w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black text-sm";
  const inputStyle = "bg-white border-gray-300 text-black";
  const labelStyle = "block text-sm font-medium text-white mb-1";

  const renderInvitationPreview = (data: typeof form, size: "small" | "large" = "large") => {
    const isSmall = size === "small";
    const w = isSmall ? "w-48" : "w-full max-w-md";
    const pad = isSmall ? "p-3" : "p-8";
    const headSize = isSmall ? "text-sm" : "text-2xl";
    const bodySize = isSmall ? "text-[9px]" : "text-sm";
    const subSize = isSmall ? "text-[8px]" : "text-xs";

    if (data.canvaDesignUrl) {
      return (
        <div className={`${w} mx-auto rounded-lg overflow-hidden shadow-lg`}>
          <img src={data.canvaDesignUrl} alt="Custom Canva Design" className="w-full" />
        </div>
      );
    }

    if (data.customImageUrl) {
      return (
        <div className={`${w} mx-auto rounded-lg overflow-hidden shadow-lg relative`}>
          <img src={data.customImageUrl} alt="Custom Design" className="w-full" />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-white text-center font-bold" style={{ fontFamily: data.fontFamily }}>{data.headerText}</p>
          </div>
        </div>
      );
    }

    const borderDecor = data.template === "art-deco"
      ? "border-2 border-double"
      : data.template === "royal"
        ? "border border-yellow-600"
        : "border";

    return (
      <div
        className={`${w} mx-auto rounded-lg shadow-xl overflow-hidden ${borderDecor}`}
        style={{
          backgroundColor: data.backgroundColor,
          color: data.textColor,
          borderColor: data.accentColor,
          fontFamily: data.fontFamily,
        }}
      >
        <div className={pad}>
          {data.template === "art-deco" && (
            <div className="text-center mb-2" style={{ color: data.accentColor }}>
              {isSmall ? "◆ ◇ ◆" : "◆ ◇ ◆ ◇ ◆ ◇ ◆"}
            </div>
          )}
          
          <div className="text-center" style={{ borderBottom: `1px solid ${data.accentColor}30`, paddingBottom: isSmall ? 8 : 16 }}>
            {data.hostNames && (
              <p className={`${subSize} mb-1 uppercase tracking-widest`} style={{ color: data.accentColor }}>
                {data.hostNames}
              </p>
            )}
            {!isSmall && data.hostNames && (
              <p className={`${subSize} mb-2`} style={{ color: data.accentColor + "99" }}>cordially invite you to</p>
            )}
          </div>

          <div className="text-center my-3" style={{ padding: isSmall ? "4px 0" : "12px 0" }}>
            <h2 className={`${headSize} font-bold`} style={{ color: data.accentColor }}>
              {data.headerText || "You're Invited"}
            </h2>
          </div>

          {data.bodyText && (
            <p className={`text-center ${bodySize} my-2 italic`} style={{ color: data.textColor + "cc" }}>
              {data.bodyText}
            </p>
          )}

          <div className="text-center my-3 space-y-1">
            {data.dateText && (
              <p className={`${isSmall ? "text-[10px]" : "text-base"} font-semibold`}>{data.dateText}</p>
            )}
            {data.timeText && (
              <p className={`${subSize}`} style={{ color: data.accentColor }}>{data.timeText}</p>
            )}
            {data.venueText && (
              <p className={`${bodySize} mt-1`}>{data.venueText}</p>
            )}
          </div>

          {data.dressCode && (
            <div className="text-center mt-2" style={{ borderTop: `1px solid ${data.accentColor}30`, paddingTop: 8 }}>
              <p className={`${subSize} uppercase tracking-wide`} style={{ color: data.accentColor }}>
                Dress Code: {data.dressCode}
              </p>
            </div>
          )}

          {data.rsvpDeadline && (
            <div className="text-center mt-2">
              <p className={`${subSize}`} style={{ color: data.textColor + "99" }}>
                {data.footerText || "Kindly respond by"} {data.rsvpDeadline}
              </p>
            </div>
          )}

          {data.includeQrCode && !isSmall && (
            <div className="flex justify-center mt-4">
              <div className="bg-white p-2 rounded" style={{ width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <QrCode className="w-10 h-10" style={{ color: data.accentColor }} />
              </div>
            </div>
          )}

          {data.template === "art-deco" && (
            <div className="text-center mt-3" style={{ color: data.accentColor }}>
              {isSmall ? "◆ ◇ ◆" : "◆ ◇ ◆ ◇ ◆ ◇ ◆"}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEnvelope = (data: typeof form) => {
    const patternSvg = getPatternSVG(data.linerPattern, data.envelopeColor);
    const patternBg = patternSvg
      ? `url("data:image/svg+xml,${encodeURIComponent(patternSvg)}")`
      : "none";

    return (
      <div className="w-full max-w-md mx-auto cursor-pointer" onClick={() => setShowEnvelope(false)}>
        <div
          className="relative rounded-lg shadow-2xl overflow-hidden"
          style={{ backgroundColor: data.envelopeColor, aspectRatio: "5/3" }}
        >
          <div
            className="absolute inset-2 rounded opacity-30"
            style={{ backgroundImage: patternBg, backgroundSize: "80px 80px" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            {(() => {
              const light = isLightColor(data.envelopeColor);
              const textMain = light ? "text-black" : "text-white";
              const textSub = light ? "text-black/70" : "text-white/80";
              const textMuted = light ? "text-black/50" : "text-white/60";
              const dividerBg = light ? "bg-black/30" : "bg-white/40";
              return (
                <div className="text-center">
                  <p className={`${textSub} text-xs uppercase tracking-[0.3em] mb-1`}>You're Invited</p>
                  <div className={`w-16 h-px ${dividerBg} mx-auto mb-2`} />
                  <p className={`${textMain} font-serif text-lg`}>{data.hostNames || "Open to View"}</p>
                  <p className={`${textMuted} text-xs mt-2`}>Click to open</p>
                </div>
              );
            })()}
          </div>
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: "40%",
              background: `linear-gradient(135deg, transparent 48%, ${data.envelopeColor} 48%, ${data.envelopeColor} 52%, transparent 52%)`,
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#330311]">
      <header className="bg-[#2a020d] border-b border-[#4a0a1e] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => {
              if (view !== "gallery") { setView("gallery"); setEditingInv(null); }
              else setLocation(`/events/${eventId}/guests`);
            }} className="text-white">
              <ArrowLeft className="w-4 h-4 mr-1" />
              {view !== "gallery" ? "Back to Gallery" : "Back to Guests"}
            </Button>
            <h1 className="text-xl font-bold text-white">
              Digital Invitations {event && typeof event === 'object' && 'name' in event ? `— ${(event as any).name}` : ""}
            </h1>
          </div>
          {view === "gallery" && (
            <div className="flex gap-2">
              <Button size="sm" onClick={startNew} className="bg-white text-[#330311] font-bold">
                <Plus className="w-4 h-4 mr-1" /> Create Invitation
              </Button>
              <Button size="sm" variant="outline" className="text-white border-white/70 hover:bg-white/10 hover:border-white"
                onClick={() => window.open(CANVA_CREATE_URL, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-1" /> Design in Canva
              </Button>
            </div>
          )}
          {view === "editor" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-white border-white/70 hover:bg-white/10 hover:border-white" onClick={() => setView("preview")}>
                <Eye className="w-4 h-4 mr-1" /> Preview
              </Button>
              <Button size="sm" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-white text-[#330311] font-bold">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Invitation"}
              </Button>
            </div>
          )}
          {view === "preview" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-white border-white/70 hover:bg-white/10 hover:border-white" onClick={() => setView("editor")}>
                <Edit2 className="w-4 h-4 mr-1" /> Edit
              </Button>
              <Button size="sm" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-white text-[#330311] font-bold">
                Save & Close
              </Button>
            </div>
          )}
          {view === "send" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-white border-white/70 hover:bg-white/10 hover:border-white" onClick={() => { setView("gallery"); setSendingInv(null); }}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {view === "gallery" && (
          <>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                <p className="text-gray-300">Loading invitations...</p>
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-16">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto bg-[#4a0a1e] rounded-full flex items-center justify-center mb-4">
                    <Send className="w-10 h-10 text-white/60" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Create Beautiful Digital Invitations</h2>
                  <p className="text-gray-400 max-w-lg mx-auto">
                    Design stunning invitations like Paperless Post. Choose from elegant templates,
                    customise every detail, or create your own design in Canva and import it.
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  <Button onClick={startNew} className="bg-white text-[#330311] font-bold px-6 py-3">
                    <Plus className="w-5 h-5 mr-2" /> Start Designing
                  </Button>
                  <Button variant="outline" className="text-white border-white/70 hover:bg-white/10 hover:border-white px-6 py-3"
                    onClick={() => window.open(CANVA_CREATE_URL, '_blank')}>
                    <ExternalLink className="w-5 h-5 mr-2" /> Open Canva
                  </Button>
                </div>
                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                  {TEMPLATES.slice(0, 4).map(t => (
                    <div
                      key={t.id}
                      className="rounded-lg overflow-hidden shadow cursor-pointer border border-transparent transition-all"
                      style={{ backgroundColor: t.bg }}
                      onClick={() => { applyTemplate(t.id); startNew(); }}
                    >
                      <div className="p-4 text-center" style={{ minHeight: 100 }}>
                        <p className="text-xs font-bold" style={{ color: t.accent }}>You're Invited</p>
                        <p className="text-[8px] mt-1" style={{ color: t.text }}>Preview</p>
                      </div>
                      <div className="bg-black/10 px-2 py-1">
                        <p className="text-[10px] text-center" style={{ color: t.text }}>{t.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {invitations.map(inv => (
                  <Card key={inv.id} className="bg-[#2a020d] border-[#4a0a1e] overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4">
                        {renderInvitationPreview({
                          ...form,
                          ...inv,
                          backgroundColor: inv.backgroundColor || "#fffaf5",
                          textColor: inv.textColor || "#330311",
                          accentColor: inv.accentColor || "#8B1538",
                          fontFamily: "'Poppins', sans-serif",
                          headerText: inv.headerText || "You're Invited",
                          bodyText: inv.bodyText || "",
                          footerText: inv.footerText || "",
                          hostNames: inv.hostNames || "",
                          venueText: inv.venueText || "",
                          dateText: inv.dateText || "",
                          timeText: inv.timeText || "",
                          dressCode: inv.dressCode || "",
                          rsvpDeadline: inv.rsvpDeadline || "",
                          customImageUrl: inv.customImageUrl || "",
                          canvaDesignUrl: inv.canvaDesignUrl || "",
                          envelopeColor: inv.envelopeColor || "#330311",
                          linerPattern: inv.linerPattern || "floral",
                        }, "small")}
                      </div>
                      <div className="p-4 border-t border-[#4a0a1e]">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-white font-semibold text-sm">{inv.name}</h3>
                          <div className="flex items-center gap-1">
                            {inv.isPublished && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-900/40 text-green-400">Published</span>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#4a0a1e] text-gray-300">
                              {TEMPLATES.find(t => t.id === inv.template)?.name || inv.template}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          <Button size="sm" variant="ghost" className="text-blue-400 text-xs" onClick={() => startEdit(inv)}>
                            <Edit2 className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          {!inv.isPublished && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium" onClick={() => publishMutation.mutate(inv.id)} disabled={publishMutation.isPending}>
                              <Check className="w-3 h-3 mr-1" /> {publishMutation.isPending ? "Publishing..." : "Publish"}
                            </Button>
                          )}
                          {inv.isPublished && (
                            <>
                              <Button size="sm" variant="ghost" className="text-green-400 text-xs" onClick={() => shareViaWhatsApp(inv)}>
                                <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                              </Button>
                              <Button size="sm" variant="ghost" className="text-purple-400 text-xs" onClick={() => openSendView(inv)}>
                                <Send className="w-3 h-3 mr-1" /> Send
                              </Button>
                              <Button size="sm" variant="ghost" className="text-cyan-400 text-xs" onClick={() => window.open(`/invitation/${inv.id}`, '_blank')}>
                                <Eye className="w-3 h-3 mr-1" /> View
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="text-red-400 text-xs" onClick={() => {
                            if (confirm("Delete this invitation?")) deleteMutation.mutate(inv.id);
                          }}>
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {view === "editor" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex gap-1 mb-4 flex-wrap">
                {(["template", "text", "style", "envelope", "canva"] as const).map(t => (
                  <Button key={t} size="sm"
                    className={designTab === t ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white"}
                    onClick={() => setDesignTab(t)}
                  >
                    {t === "template" && <Palette className="w-3 h-3 mr-1" />}
                    {t === "text" && <Type className="w-3 h-3 mr-1" />}
                    {t === "style" && <Palette className="w-3 h-3 mr-1" />}
                    {t === "envelope" && <Send className="w-3 h-3 mr-1" />}
                    {t === "canva" && <ExternalLink className="w-3 h-3 mr-1" />}
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Button>
                ))}
              </div>

              {designTab === "template" && (
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardHeader><CardTitle className="text-white text-base">Choose Template</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {TEMPLATES.map(t => (
                        <div
                          key={t.id}
                          className={`rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${form.template === t.id ? "border-white shadow-lg scale-105" : "border-transparent"}`}
                          style={{ backgroundColor: t.bg }}
                          onClick={() => applyTemplate(t.id)}
                        >
                          <div className="p-3 text-center" style={{ minHeight: 70 }}>
                            <p className="text-xs font-bold" style={{ color: t.accent }}>Invited</p>
                            <div className="w-8 h-px mx-auto my-1" style={{ backgroundColor: t.accent + "60" }} />
                            <p className="text-[7px]" style={{ color: t.text }}>{t.desc}</p>
                          </div>
                          <div className="px-2 py-1" style={{ backgroundColor: t.accent + "20" }}>
                            <p className="text-[9px] text-center font-medium" style={{ color: t.text }}>{t.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {designTab === "text" && (
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardHeader><CardTitle className="text-white text-base">Invitation Text</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className={labelStyle}>Invitation Name (for your reference)</label>
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputStyle} />
                    </div>
                    <div>
                      <label className={labelStyle}>Host Name(s)</label>
                      <Input value={form.hostNames} onChange={e => setForm({ ...form, hostNames: e.target.value })} placeholder="Mr & Mrs Smith" className={inputStyle} />
                    </div>
                    <div>
                      <label className={labelStyle}>Main Heading</label>
                      <Input value={form.headerText} onChange={e => setForm({ ...form, headerText: e.target.value })} placeholder="You're Invited" className={inputStyle} />
                    </div>
                    <div>
                      <label className={labelStyle}>Message</label>
                      <textarea
                        value={form.bodyText}
                        onChange={e => setForm({ ...form, bodyText: e.target.value })}
                        placeholder="We request the pleasure of your company..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelStyle}>Date</label>
                        <Input value={form.dateText} onChange={e => setForm({ ...form, dateText: e.target.value })} placeholder="Saturday, 15th March 2026" className={inputStyle} />
                      </div>
                      <div>
                        <label className={labelStyle}>Time</label>
                        <Input value={form.timeText} onChange={e => setForm({ ...form, timeText: e.target.value })} placeholder="4:00 PM" className={inputStyle} />
                      </div>
                    </div>
                    <div>
                      <label className={labelStyle}>Venue</label>
                      <Input value={form.venueText} onChange={e => setForm({ ...form, venueText: e.target.value })} placeholder="The Grand Ballroom, London" className={inputStyle} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelStyle}>Dress Code</label>
                        <Input value={form.dressCode} onChange={e => setForm({ ...form, dressCode: e.target.value })} placeholder="Black Tie" className={inputStyle} />
                      </div>
                      <div>
                        <label className={labelStyle}>RSVP Deadline</label>
                        <Input value={form.rsvpDeadline} onChange={e => setForm({ ...form, rsvpDeadline: e.target.value })} placeholder="1st February 2026" className={inputStyle} />
                      </div>
                    </div>
                    <div>
                      <label className={labelStyle}>Footer Text</label>
                      <Input value={form.footerText} onChange={e => setForm({ ...form, footerText: e.target.value })} placeholder="Kindly respond by" className={inputStyle} />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                        <input type="checkbox" checked={form.includeQrCode} onChange={e => setForm({ ...form, includeQrCode: e.target.checked })}
                          className="w-4 h-4 rounded border-2 border-white" />
                        Include QR Code
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {designTab === "style" && (
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardHeader><CardTitle className="text-white text-base">Style & Colours</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className={labelStyle}>Font</label>
                      <select value={form.fontFamily} onChange={e => setForm({ ...form, fontFamily: e.target.value })} className={selectStyle}>
                        {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={labelStyle}>Background</label>
                        <div className="flex gap-2 items-center">
                          <input type="color" value={form.backgroundColor} onChange={e => setForm({ ...form, backgroundColor: e.target.value })}
                            className="w-10 h-10 rounded cursor-pointer border-0" />
                          <Input value={form.backgroundColor} onChange={e => setForm({ ...form, backgroundColor: e.target.value })} className={`${inputStyle} text-xs`} />
                        </div>
                      </div>
                      <div>
                        <label className={labelStyle}>Text</label>
                        <div className="flex gap-2 items-center">
                          <input type="color" value={form.textColor} onChange={e => setForm({ ...form, textColor: e.target.value })}
                            className="w-10 h-10 rounded cursor-pointer border-0" />
                          <Input value={form.textColor} onChange={e => setForm({ ...form, textColor: e.target.value })} className={`${inputStyle} text-xs`} />
                        </div>
                      </div>
                      <div>
                        <label className={labelStyle}>Accent</label>
                        <div className="flex gap-2 items-center">
                          <input type="color" value={form.accentColor} onChange={e => setForm({ ...form, accentColor: e.target.value })}
                            className="w-10 h-10 rounded cursor-pointer border-0" />
                          <Input value={form.accentColor} onChange={e => setForm({ ...form, accentColor: e.target.value })} className={`${inputStyle} text-xs`} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={labelStyle}>Custom Background Image URL</label>
                      <Input value={form.customImageUrl} onChange={e => setForm({ ...form, customImageUrl: e.target.value })} placeholder="https://..." className={inputStyle} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {designTab === "envelope" && (
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardHeader><CardTitle className="text-white text-base">Envelope Design</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className={labelStyle}>Envelope Colour</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {ENVELOPE_COLORS.map(c => (
                          <div
                            key={c.value}
                            className={`rounded-lg p-3 cursor-pointer text-center transition-all border-2 ${form.envelopeColor === c.value ? "border-white scale-105" : "border-transparent"}`}
                            style={{ backgroundColor: c.value }}
                            onClick={() => setForm({ ...form, envelopeColor: c.value })}
                          >
                            <p className="text-xs" style={{ color: c.value === "#fffff0" || c.value === "#fdf2f8" ? "#333" : "#fff" }}>{c.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={labelStyle}>Liner Pattern</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {LINER_PATTERNS.map(p => (
                          <div
                            key={p}
                            className={`rounded-lg p-3 cursor-pointer text-center border-2 bg-[#1a0108] ${form.linerPattern === p ? "border-white" : "border-[#4a0a1e]"}`}
                            onClick={() => setForm({ ...form, linerPattern: p })}
                          >
                            <p className="text-xs text-white capitalize">{p}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className={labelStyle}>Envelope Preview</label>
                      {renderEnvelope(form)}
                    </div>
                  </CardContent>
                </Card>
              )}

              {designTab === "canva" && (
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardHeader><CardTitle className="text-white text-base">Import from Canva</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-[#1a0108] border border-[#4a0a1e] rounded-lg p-4 text-center">
                      <div className="w-12 h-12 mx-auto bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mb-3">
                        <span className="text-white font-bold text-lg">C</span>
                      </div>
                      <h3 className="text-white font-semibold mb-2">Design with Canva</h3>
                      <p className="text-gray-400 text-sm mb-4">
                        Create a custom invitation design in Canva, then paste the image URL below to use it as your invitation.
                      </p>
                      <Button
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold"
                        onClick={() => window.open(CANVA_CREATE_URL, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" /> Open Canva Designer
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <p className="text-gray-300 text-sm leading-relaxed">After designing in Canva, download your design as a PNG or JPG, upload it to any image hosting service, and then paste the image URL below.</p>
                      <div>
                        <label className={labelStyle}>Canva Design Image URL</label>
                        <Input
                          value={form.canvaDesignUrl}
                          onChange={e => setForm({ ...form, canvaDesignUrl: e.target.value })}
                          placeholder="https://your-image-url.com/design.png"
                          className={inputStyle}
                        />
                      </div>
                      {form.canvaDesignUrl && (
                        <div className="mt-3">
                          <p className="text-white text-sm mb-2">Preview:</p>
                          <img src={form.canvaDesignUrl} alt="Canva design preview" className="w-full rounded-lg shadow" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="sticky top-6">
              <Card className="bg-[#1a0108] border-[#4a0a1e]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-base">Live Preview</CardTitle>
                    <Button size="sm" variant="ghost" className="text-gray-400 text-xs" onClick={() => setShowEnvelope(!showEnvelope)}>
                      <Send className="w-3 h-3 mr-1" /> {showEnvelope ? "Show Card" : "Show Envelope"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showEnvelope ? renderEnvelope(form) : renderInvitationPreview(form)}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {view === "preview" && (
          <div className="max-w-lg mx-auto py-8">
            <div className="mb-8 text-center">
              <p className="text-gray-400 text-sm mb-4">Full-size invitation preview</p>
            </div>
            <div className="mb-8">
              {renderEnvelope(form)}
            </div>
            <div className="mt-8">
              {renderInvitationPreview(form)}
            </div>
          </div>
        )}

        {view === "send" && sendingInv && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 p-4 rounded-lg bg-[#1a0108] border border-[#4a0a1e]">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-white" />
                <h3 className="text-white font-semibold">Share Globally</h3>
              </div>
              <p className="text-gray-400 text-xs">Works with any international phone number — UK (+44), Nigeria (+234), US (+1), and 80+ countries worldwide. Enter the full number with country code.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Card className="bg-[#2a020d] border-[#4a0a1e] mb-6">
                  <CardHeader>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-white" />
                      Send to a Number
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className={labelStyle}>Phone number (with country code)</label>
                      <Input
                        value={whatsappNumber}
                        onChange={e => setWhatsappNumber(e.target.value)}
                        placeholder="e.g. +44 7700 123456, +234 801 234 5678, +1 555 123 4567"
                        className={inputStyle}
                      />
                    </div>
                    <div>
                      <label className={labelStyle}>Custom message</label>
                      <textarea
                        value={whatsappMessage}
                        onChange={e => setWhatsappMessage(e.target.value)}
                        rows={5}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button onClick={() => { if (whatsappNumber) sendWhatsAppDirect(whatsappNumber, sendingInv, whatsappMessage); else shareViaWhatsApp(sendingInv); }}
                        className="bg-green-600 text-white">
                        <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
                      </Button>
                      <Button onClick={() => sendSMS(whatsappNumber, sendingInv)}
                        className="bg-blue-600 text-white">
                        <Phone className="w-4 h-4 mr-1" /> Text/SMS
                      </Button>
                      <Button onClick={() => sendEmail('', sendingInv)}
                        className="bg-purple-600 text-white">
                        <Mail className="w-4 h-4 mr-1" /> Email
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => copyShareLink(sendingInv)} variant="outline" className="text-white border-white/70 hover:bg-white/10 hover:border-white flex-1">
                        <Copy className="w-4 h-4 mr-1" /> Copy Link
                      </Button>
                      <Button onClick={() => window.open(`/invitation/${sendingInv.id}`, '_blank')} variant="outline" className="text-white border-white/70 hover:bg-white/10 hover:border-white flex-1">
                        <Eye className="w-4 h-4 mr-1" /> Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="bg-[#2a020d] border-[#4a0a1e]">
                  <CardHeader>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      Send to Guest List ({guestList.length} guests)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {guestList.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm mb-3">No guests added yet</p>
                        <Button size="sm" onClick={() => setLocation(`/events/${eventId}/guests`)} className="bg-white text-[#330311]">
                          Add Guests
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {guestList.map((guest: any) => (
                          <div key={guest.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1a0108] border border-[#4a0a1e]">
                            <div>
                              <p className="text-white text-sm font-medium">{guest.firstName} {guest.lastName}</p>
                              <div className="flex gap-2 text-xs text-gray-400">
                                {guest.phone && <span>{guest.phone}</span>}
                                {guest.email && <span>{guest.email}</span>}
                              </div>
                              {guest.rsvpStatus && (
                                <span className={`text-[10px] ${guest.rsvpStatus === 'accepted' ? 'text-green-400' : guest.rsvpStatus === 'declined' ? 'text-red-400' : guest.rsvpStatus === 'tentative' ? 'text-yellow-400' : 'text-gray-400'}`}>
                                  RSVP: {guest.rsvpStatus}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {guest.phone && (
                                <Button size="sm" variant="ghost" className="text-green-400 text-xs p-1"
                                  onClick={() => sendWhatsAppToGuest(guest, sendingInv)} title="WhatsApp">
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {guest.phone && (
                                <Button size="sm" variant="ghost" className="text-blue-400 text-xs p-1"
                                  onClick={() => sendSMS(guest.phone, sendingInv, guest.firstName)} title="Text/SMS">
                                  <Phone className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {guest.email && (
                                <Button size="sm" variant="ghost" className="text-purple-400 text-xs p-1"
                                  onClick={() => sendEmail(guest.email, sendingInv, guest.firstName, guest.rsvpToken)} title="Email">
                                  <Mail className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
