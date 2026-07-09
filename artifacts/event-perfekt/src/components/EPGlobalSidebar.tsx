import { useLocation, Link } from "wouter";
import { useEPGlobalAuth } from "@/lib/epglobal-auth";
import { useQuery } from "@tanstack/react-query";
import { epgFetch } from "@/lib/epglobal-auth";
import {
  LayoutDashboard, CheckSquare, Calendar, FileText, CreditCard,
  Activity, Users, ShieldCheck, BarChart3, Bell, LogOut,
  Building2, ExternalLink, Menu, X
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/epglobal/dashboard" },
  { label: "Tasks", icon: CheckSquare, path: "/epglobal/tasks" },
  { label: "Calendar", icon: Calendar, path: "/epglobal/calendar" },
  { label: "Invoices", icon: FileText, path: "/epglobal/invoices" },
  { label: "Payments", icon: CreditCard, path: "/epglobal/payments" },
  { label: "Activities", icon: Activity, path: "/epglobal/activities" },
  { label: "Vendors", icon: Users, path: "/epglobal/vendors" },
  { label: "Compliance", icon: ShieldCheck, path: "/epglobal/compliance" },
  { label: "Reports", icon: BarChart3, path: "/epglobal/reports" },
];

const externalLinks = [
  { label: "QuickBooks", url: "https://quickbooks.intuit.com", color: "text-green-400" },
  { label: "Project.co", url: "https://app.project.co", color: "text-blue-400" },
];

export default function EPGlobalSidebar() {
  const [location] = useLocation();
  const { user, logout } = useEPGlobalAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: alerts = [] } = useQuery({
    queryKey: ["/api/epglobal/alerts"],
    queryFn: () => epgFetch("/api/epglobal/alerts"),
    refetchInterval: 30000,
  });
  const unreadAlerts = (alerts as any[]).filter(a => !a.is_read).length;

  const roleColors: Record<string, string> = {
    admin: "bg-red-900 text-red-200",
    finance: "bg-green-900 text-green-200",
    operations: "bg-blue-900 text-blue-200",
    accountant: "bg-purple-900 text-purple-200",
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
            <Building2 className="h-5 w-5 text-[#1a3a6b]" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">EP Global</p>
            <p className="text-white/50 text-xs">Operational Hub</p>
          </div>
        </div>
      </div>

      {/* User */}
      {user && (
        <div className="px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user.name}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleColors[user.role] || "bg-gray-700 text-gray-200"}`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = location === item.path || location.startsWith(item.path + "/");
          return (
            <Link key={item.path} href={item.path}>
              <div
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  active ? "bg-white text-[#1a3a6b] font-semibold" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
                {item.label === "Alerts" && unreadAlerts > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadAlerts}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        {/* Alerts */}
        <Link href="/epglobal/alerts">
          <div
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
              location === "/epglobal/alerts" ? "bg-white text-[#1a3a6b] font-semibold" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Bell className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">Alerts</span>
            {unreadAlerts > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadAlerts}
              </span>
            )}
          </div>
        </Link>
      </nav>

      {/* External Links */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-white/40 text-xs uppercase font-semibold mb-2 tracking-wide">Integrations</p>
        {externalLinks.map(link => (
          <a key={link.label} href={link.url} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 transition-colors group">
            <ExternalLink className={`h-3.5 w-3.5 ${link.color}`} />
            <span className="text-sm text-white/60 group-hover:text-white">{link.label}</span>
          </a>
        ))}
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-[#1a3a6b] text-white rounded-lg flex items-center justify-center shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-[#1a3a6b] z-50 transform transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-full lg:w-60 bg-[#1a3a6b] border-r border-white/10 z-30">
        <SidebarContent />
      </div>
    </>
  );
}
