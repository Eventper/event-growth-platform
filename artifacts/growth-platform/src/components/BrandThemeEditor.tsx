import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, X } from "lucide-react";
import type { BrandThemeDto } from "@/lib/aiCommsApi";

const DEFAULT_THEME: BrandThemeDto = {
  name: "New Theme",
  primaryColor: "#4B1E2F",
  secondaryColor: "#6E2A3F",
  accentColor: "#6E2433",
  backgroundColor: "#FBF7F0",
  surfaceColor: "#FFFFFF",
  textColor: "#1A1714",
  mutedTextColor: "#6E655C",
  fontHeading: "Georgia, 'Times New Roman', serif",
  fontBody: "'Helvetica Neue', Arial, sans-serif",
  borderRadius: 4,
  logoUrl: "",
  logoPlacement: "center",
  buttonStyle: "pill",
  emailWidth: 600,
  headerStyle: "hero",
  footerStyle: "branded",
  heroImageUrl: "",
  photographyStyle: "editorial",
};

const FONT_OPTIONS = [
  { label: "Serif — Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Serif — Playfair feel", value: "'Playfair Display', Georgia, serif" },
  { label: "Sans — Helvetica", value: "'Helvetica Neue', Arial, sans-serif" },
  { label: "Sans — Inter", value: "'Inter', 'Helvetica Neue', Arial, sans-serif" },
  { label: "Sans — Poppins", value: "'Poppins', 'Helvetica Neue', Arial, sans-serif" },
];

function readableOn(bg: string): string {
  const c = (bg || "#000").replace("#", "");
  if (c.length < 6) return "#fff";
  const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#1A1A1A" : "#FFFFFF";
}

/** Compact client-side preview mirroring the server design system (visual fidelity, not byte-identical). */
export function buildPreviewHtml(t: BrandThemeDto): string {
  const radius = t.buttonStyle === "pill" ? 999 : t.borderRadius;
  const btnBg = t.buttonStyle === "outline" ? "transparent" : t.accentColor;
  const btnFg = t.buttonStyle === "outline" ? t.accentColor : readableOn(t.accentColor);
  const btnBorder = t.buttonStyle === "outline" ? `2px solid ${t.accentColor}` : "none";
  const align = t.logoPlacement === "none" ? "center" : t.logoPlacement;
  const headerBg = t.headerStyle === "banner" ? t.primaryColor : "transparent";
  const headerFg = t.headerStyle === "banner" ? readableOn(t.primaryColor) : t.mutedTextColor;
  const footerBranded = t.footerStyle === "branded";
  const footerBg = footerBranded ? t.primaryColor : t.surfaceColor;
  const footerFg = footerBranded ? readableOn(t.primaryColor) : t.mutedTextColor;
  const logo = t.logoUrl
    ? `<img src="${t.logoUrl}" height="32" style="max-height:32px;" />`
    : `<span style="font-family:${t.fontHeading};font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${headerFg};">${t.name}</span>`;
  const hero = (t.headerStyle === "hero" && t.heroImageUrl)
    ? `<img src="${t.heroImageUrl}" style="display:block;width:100%;height:auto;" />` : "";
  const cta = t.buttonStyle === "minimal"
    ? `<a href="#" style="font-family:${t.fontBody};font-weight:600;color:${t.accentColor};text-decoration:none;">Explore Partnership &rarr;</a>`
    : `<a href="#" style="display:inline-block;padding:14px 32px;border:${btnBorder};border-radius:${radius}px;background:${btnBg};color:${btnFg};font-family:${t.fontBody};font-weight:600;font-size:15px;text-decoration:none;">Explore Partnership</a>`;

  return `<!DOCTYPE html><html><body style="margin:0;background:${t.backgroundColor};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${t.backgroundColor};"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="${t.emailWidth}" cellpadding="0" cellspacing="0" style="width:100%;max-width:${t.emailWidth}px;background:${t.surfaceColor};border-radius:${t.borderRadius}px;overflow:hidden;">
      <tr><td><table width="100%" style="background:${headerBg};"><tr><td align="${align}" style="padding:22px 32px;">${logo}</td></tr></table></td></tr>
      ${hero ? `<tr><td>${hero}</td></tr>` : ""}
      <tr><td style="padding:32px 40px 0;"><h1 style="margin:0;font-family:${t.fontHeading};font-size:28px;line-height:1.2;color:${t.primaryColor};">The Women Who Quietly Rethink Success</h1></td></tr>
      <tr><td style="padding:18px 40px 0;"><p style="margin:0;font-family:${t.fontBody};font-size:17px;line-height:1.6;color:${t.textColor};">There is a conversation happening among the people you most admire — and it rarely happens in public.</p></td></tr>
      <tr><td style="padding:18px 40px 0;"><p style="margin:0 0 14px;font-family:${t.fontBody};font-size:15px;line-height:1.7;color:${t.textColor};">We thought of you because of the room you would bring with you, not the seat you would take in it.</p></td></tr>
      <tr><td style="padding:26px 40px 4px;">${cta}</td></tr>
      <tr><td style="padding:30px 40px 8px;"><p style="margin:0;font-family:${t.fontBody};font-size:14px;color:${t.textColor};"><b>Esther</b><br/><span style="color:${t.mutedTextColor};">Founder</span></p></td></tr>
      <tr><td><table width="100%" style="background:${footerBg};margin-top:24px;"><tr><td align="center" style="padding:22px;"><p style="margin:0;font-family:${t.fontBody};font-size:12px;color:${footerFg};">${t.name} &middot; <a href="#" style="color:${t.accentColor};text-decoration:none;">unsubscribe</a></p></td></tr></table></td></tr>
    </table>
  </td></tr></table>
  </body></html>`;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 rounded border border-border cursor-pointer bg-transparent p-0.5"
          aria-label={label}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-xs font-mono" />
      </div>
    </div>
  );
}

interface Props {
  initial?: Partial<BrandThemeDto> & { id?: string };
  clientId?: string;
  saving?: boolean;
  onSave: (theme: BrandThemeDto, id?: string) => void;
  onCancel?: () => void;
}

export default function BrandThemeEditor({ initial, clientId, saving, onSave, onCancel }: Props) {
  const [theme, setTheme] = useState<BrandThemeDto>({ ...DEFAULT_THEME, ...initial });
  const set = (patch: Partial<BrandThemeDto>) => setTheme((prev) => ({ ...prev, ...patch }));
  const previewHtml = useMemo(() => buildPreviewHtml(theme), [theme]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{initial?.id ? "Edit Theme" : "New Brand Theme"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Theme name</Label>
            <Input value={theme.name} onChange={(e) => set({ name: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Primary" value={theme.primaryColor} onChange={(v) => set({ primaryColor: v })} />
            <ColorField label="Secondary" value={theme.secondaryColor} onChange={(v) => set({ secondaryColor: v })} />
            <ColorField label="Accent (CTA)" value={theme.accentColor} onChange={(v) => set({ accentColor: v })} />
            <ColorField label="Background" value={theme.backgroundColor} onChange={(v) => set({ backgroundColor: v })} />
            <ColorField label="Surface" value={theme.surfaceColor} onChange={(v) => set({ surfaceColor: v })} />
            <ColorField label="Text" value={theme.textColor} onChange={(v) => set({ textColor: v })} />
            <ColorField label="Muted text" value={theme.mutedTextColor} onChange={(v) => set({ mutedTextColor: v })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Heading font</Label>
              <Select value={theme.fontHeading} onValueChange={(v) => set({ fontHeading: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Body font</Label>
              <Select value={theme.fontBody} onValueChange={(v) => set({ fontBody: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Button style</Label>
              <Select value={theme.buttonStyle} onValueChange={(v) => set({ buttonStyle: v as BrandThemeDto["buttonStyle"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["solid", "outline", "pill", "minimal"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Logo placement</Label>
              <Select value={theme.logoPlacement} onValueChange={(v) => set({ logoPlacement: v as BrandThemeDto["logoPlacement"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["left", "center", "right", "none"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Header style</Label>
              <Select value={theme.headerStyle} onValueChange={(v) => set({ headerStyle: v as BrandThemeDto["headerStyle"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["minimal", "banner", "logo_only", "hero"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Footer style</Label>
              <Select value={theme.footerStyle} onValueChange={(v) => set({ footerStyle: v as BrandThemeDto["footerStyle"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["minimal", "standard", "branded"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Border radius — {theme.borderRadius}px</Label>
            <Slider value={[theme.borderRadius]} min={0} max={28} step={1} onValueChange={([v]) => set({ borderRadius: v })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email width — {theme.emailWidth}px</Label>
            <Slider value={[theme.emailWidth]} min={480} max={680} step={10} onValueChange={([v]) => set({ emailWidth: v })} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Logo URL</Label>
            <Input value={theme.logoUrl || ""} onChange={(e) => set({ logoUrl: e.target.value })} placeholder="https://…/logo.png" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hero image URL (used when header style = hero)</Label>
            <Input value={theme.heroImageUrl || ""} onChange={(e) => set({ heroImageUrl: e.target.value })} placeholder="https://…/hero.jpg" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={() => onSave(theme, initial?.id)} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {initial?.id ? "Save changes" : "Create theme"}
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2" /> Cancel</Button>
            )}
          </div>
          {clientId === undefined && (
            <p className="text-xs text-muted-foreground">Tip: select a client first to save this theme against them.</p>
          )}
        </CardContent>
      </Card>

      {/* Live preview */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Live preview</CardTitle></CardHeader>
        <CardContent>
          <iframe
            title="theme-preview"
            srcDoc={previewHtml}
            sandbox=""
            className="w-full rounded-md border border-border bg-white"
            style={{ height: 560 }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
