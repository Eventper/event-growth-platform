import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/executive";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Palette, Plug, Users, ArrowRight } from "lucide-react";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

const integrations = [
  { name: "Apollo.io", purpose: "Prospect discovery & enrichment", note: "Managed via API key" },
  { name: "OpenRouter (Claude)", purpose: "Strategy, outreach & replies", note: "Opus 4.8 · Sonnet 4.6 · Haiku 4.5" },
  { name: "Email sending", purpose: "Outreach delivery & reply capture", note: "Dedicated sender account" },
];

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Organisation & configuration"
        intro="Your account, brand voice, integrations, and team — the controls behind the growth engine."
      />

      <SectionTitle sub="Who this workspace belongs to.">Organisation</SectionTitle>
      <Card className="mt-4 mb-8">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-surface"><Building2 className="w-5 h-5 text-burgundy" /></div>
            <div>
              <p className="text-[15px] font-bold text-foreground">{user?.name || "Your organisation"}</p>
              <p className="text-[12px] text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Row label="Account" value={user?.email || "—"} />
          <Row label="Plan" value="Growth Intelligence" />
          <Row label="Region" value="United Kingdom" />
        </CardContent>
      </Card>

      <SectionTitle sub="The voice Elizabeth writes in across every message.">Brand voice</SectionTitle>
      <Link href="/ai-communications">
        <Card className="mt-4 mb-8 cursor-pointer hover:shadow-card transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-surface"><Palette className="w-5 h-5 text-burgundy" /></div>
            <div className="flex-1">
              <p className="text-[14px] font-medium text-foreground">Brand themes & tone</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Colours, typography, and the editorial voice used in outreach and presentations. Edit in Communications.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <SectionTitle sub="The services powering discovery, intelligence, and delivery.">Integrations</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 mb-8">
        {integrations.map((it) => (
          <Card key={it.name}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <Plug className="w-4 h-4 text-burgundy" />
                <p className="text-[14px] font-bold text-foreground">{it.name}</p>
              </div>
              <p className="text-[12px] text-muted-foreground leading-snug">{it.purpose}</p>
              <p className="text-[11px] text-muted-foreground mt-2 italic">{it.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle sub="People with access to this workspace.">Team</SectionTitle>
      <Card className="mt-4">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-surface"><Users className="w-5 h-5 text-burgundy" /></div>
          <div>
            <p className="text-[14px] font-medium text-foreground">{user?.name || "You"}</p>
            <p className="text-[12px] text-muted-foreground">Owner · {user?.email}</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
