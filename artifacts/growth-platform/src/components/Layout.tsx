import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Crown,
  Newspaper,
  Sparkles,
  Lightbulb,
  Activity,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";
import { useState } from "react";

type SubItem = { label: string; href: string };
type Destination = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  match?: string[];
  children: SubItem[];
};

// Nine destinations. Flat, executive — the workflow steps live as secondary
// tabs inside each destination rather than as their own top-level entries.
const destinations: Destination[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, match: ["/"], children: [] },
  {
    label: "Campaigns",
    href: "/campaign-workspace",
    icon: Calendar,
    children: [
      { label: "Workspace", href: "/campaign-workspace" },
      { label: "Events", href: "/events" },
      { label: "Strategy", href: "/wizard" },
      { label: "Personas", href: "/personas" },
      { label: "Site Builder", href: "/site-builder" },
    ],
  },
  {
    label: "Audience",
    href: "/discovery",
    icon: Users,
    children: [
      { label: "Discovery", href: "/discovery" },
      { label: "Screen", href: "/screen" },
      { label: "Outreach Control", href: "/outreach-control" },
      { label: "Send Outreach", href: "/outreach" },
      { label: "Pipeline", href: "/pipeline" },
    ],
  },
  {
    label: "Sponsors",
    href: "/sponsors",
    icon: Crown,
    children: [
      { label: "Pipeline", href: "/sponsors" },
      { label: "Corporate Targets", href: "/corporate-targets" },
      { label: "Referrals", href: "/referrals" },
      { label: "Commercial", href: "/commercial" },
    ],
  },
  { label: "Media", href: "/pr-pipeline", icon: Newspaper, children: [] },
  {
    label: "Communications",
    href: "/ai-communications",
    icon: Sparkles,
    children: [
      { label: "Outreach Control", href: "/outreach-control" },
      { label: "Outreach Dashboard", href: "/outreach-dashboard" },
      { label: "Template Builder", href: "/template-builder" },
      { label: "Communications", href: "/ai-communications" },
      { label: "Messaging Studio", href: "/messaging-studio" },
      { label: "Outreach Workspace", href: "/outreach-workspace" },
      { label: "Presentation Studio", href: "/presentation-studio" },
    ],
  },
  {
    label: "Growth",
    href: "/growth",
    icon: Lightbulb,
    children: [
      { label: "Intelligence Centre", href: "/growth" },
      { label: "Market Insights", href: "/insights" },
      { label: "Signals", href: "/intelligence" },
      { label: "Learning Engine", href: "/learning-engine" },
    ],
  },
  { label: "Performance", href: "/performance", icon: Activity, children: [] },
  { label: "Settings", href: "/settings", icon: SettingsIcon, match: ["/ai-test"], children: [] },
];

const pathActive = (href: string, loc: string) =>
  loc === href || loc.startsWith(href + "/");

const destActive = (d: Destination, loc: string) =>
  pathActive(d.href, loc) ||
  (d.match?.some((m) => loc === m) ?? false) ||
  d.children.some((c) => pathActive(c.href, loc));

export default function Layout({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const activeDest = destinations.find((d) => destActive(d, loc)) ?? destinations[0];
  const subItems = activeDest.children.length > 1 ? activeDest.children : [];

  return (
    <div className="min-h-screen flex bg-parchment text-ivory">
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-ink text-ivory rounded-md shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-[248px] border-r border-border bg-sidebar text-sidebar-foreground flex flex-col transition-transform",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-ivory" />
            <h1 className="text-[15px] font-bold tracking-tight text-ivory font-heading">
              Event Perfekt Growth Intelligence Hub
            </h1>
          </div>
          <p className="text-[11px] text-sidebar-muted mt-1 leading-relaxed italic font-heading">
            Your executive growth team
          </p>
          <div className="mt-3">
            <WorkspaceSwitcher />
          </div>
        </div>

        {/* Nav — nine flat destinations */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {destinations.map((d) => {
            const isActive = activeDest.href === d.href;
            return (
              <Link
                key={d.href}
                href={d.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all",
                  isActive
                    ? "bg-sidebar-active text-sidebar-active-foreground"
                    : "text-ivory/70 hover:bg-white/5 hover:text-ivory"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-champagne" />
                )}
                <d.icon className={cn("w-[18px] h-[18px]", isActive ? "text-champagne" : "text-ivory/50")} />
                {d.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          {user && (
            <div className="flex items-center gap-2 text-[12px] text-ivory/80">
              <User className="w-4 h-4 text-ivory" />
              <span className="truncate">{user.name || user.email}</span>
            </div>
          )}
          <button
            className="flex items-center gap-2 text-[12px] text-ivory/60 hover:text-ivory transition-colors w-full"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Secondary navigation — the destination's sub-views as calm tabs */}
          {subItems.length > 0 && (
            <div className="mb-7 flex flex-wrap items-center gap-1 border-b border-ivory/10">
              {subItems.map((s) => {
                const active = pathActive(s.href, loc);
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    className={cn(
                      "relative px-3.5 py-2 text-[13px] font-medium transition-colors -mb-px",
                      active
                        ? "text-ivory border-b-2 border-champagne"
                        : "text-ivory/55 hover:text-ivory border-b-2 border-transparent"
                    )}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
