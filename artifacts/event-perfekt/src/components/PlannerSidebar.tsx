import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Plus,
  ClipboardList,
  DollarSign,
  Building,
  Palette,
  FileText,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  FileSignature,
  FolderOpen,
  Gavel,
  Users,
  User,
  Sparkles,
  UserCheck,
  Receipt,
  Circle,
  CheckCircle,
  Gift,
  PenTool,
  Calendar,
  Bell,
  GanttChart,
  TrendingUp,
  MessageSquare,
  FileBox,
  Copy,
  Shield,
  Ticket,
  Wallet,
  Layers,
  PieChart,
  Brush,
  Send,
  Archive,
  FolderKanban,
  CreditCard,
  Target,
  QrCode,
  BadgeCheck,
  Vote,
  ListChecks,
  ClipboardCheck,
  Star,
  Image,
  Zap,
  Mail,
  Camera,
  ScrollText,
  Printer,
  ReceiptText,
  GraduationCap,
  Briefcase,
  Package,
  ClipboardCopy,
  Clock,
  Megaphone,
  Search,
  BookOpen,
  MapPin,
  LayoutTemplate,
  Inbox,
  Home,
  FileEdit,
  PhoneCall,
  PlayCircle,
  XCircle,
  Banknote,
  Database,
  GitBranch,
  Contact,
  ChartBar,
  UserCog,
  Eye,
  Radio,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

type NavItem = {
  label: string;
  icon?: any;
  path?: string;
  roles?: string[];
  children?: NavItem[];
  isSection?: boolean;
  comingSoon?: boolean;
};

const navItems: NavItem[] = [
  // ── DASHBOARD ──────────────────────────────────────────
  { label: "DASHBOARD", isSection: true },
  { label: "My Assignments", icon: ClipboardCopy, path: "/planner-dashboard" },
  { label: "Upcoming Events", icon: Calendar, path: "/planner-dashboard?tab=upcoming" },
  { label: "Calendar", icon: Calendar, path: "/calendar" },
  { label: "Notifications", icon: Bell, path: "/reminders" },
  { label: "Onboarding & Training", icon: GraduationCap, path: "/onboarding" },

  // ── MARKETING & SALES ─────────────────────────────────
  { label: "MARKETING & SALES", isSection: true, roles: ["admin", "planner", "manager"] },

  {
    label: "Prospecting",
    icon: Search,
    roles: ["admin", "planner", "manager"],
    children: [
      { label: "Prospect Finder", icon: Target, path: "/prospect-finder" },
      { label: "Prospect Database", icon: Database, path: "/prospect-finder", comingSoon: true },
      { label: "Referral Tracking", icon: GitBranch, path: "/prospect-finder", comingSoon: true },
    ],
  },

  {
    label: "Lead Management",
    icon: TrendingUp,
    roles: ["admin", "planner", "manager"],
    children: [
      { label: "Lead Pipeline", icon: Target, path: "/lead-pipeline" },
      { label: "Website Enquiries", icon: BookOpen, path: "/booking-enquiry" },
      { label: "Contact Management", icon: Contact, path: "/lead-pipeline", comingSoon: true },
    ],
  },


  // ── EVENT INTAKE ───────────────────────────────────────
  { label: "EVENT INTAKE", isSection: true },
  { label: "Create Event", icon: Plus, path: "/create-event", roles: ["admin", "planner", "manager"] },
  { label: "Event Intake Queue", icon: Inbox, path: "/manager-intake", roles: ["admin", "manager"] },

  // ── MANAGER CONTROL ────────────────────────────────────
  { label: "MANAGER CONTROL", isSection: true, roles: ["admin", "manager"] },
  { label: "Manager Review", icon: Eye, path: "/manager-intake", roles: ["admin", "manager"] },
  { label: "Budget Setup", icon: DollarSign, path: "/budget-management", roles: ["admin", "manager"] },
  { label: "Budget Planner", icon: PieChart, path: "/budget-planner", roles: ["admin", "manager"] },
  { label: "Financial Review", icon: TrendingUp, path: "/financial-dashboard", roles: ["admin", "manager"] },
  { label: "Assign Event Manager", icon: UserCog, path: "/manager-intake", roles: ["admin", "manager"] },

  // ── EVENT WORKSPACE ────────────────────────────────────
  { label: "EVENT WORKSPACE", isSection: true },

  {
    label: "Pre-Planning",
    icon: Layers,
    children: [
      { label: "Proposals", icon: FileText, path: "/proposals" },
      { label: "Contracts", icon: FileSignature, path: "/contract-management" },
      { label: "Client Brief", icon: FolderOpen, path: "/project-portal" },
      { label: "Initial Budget", icon: DollarSign, path: "/budget-management" },
      { label: "Venue Sourcing", icon: MapPin, path: "/venue-sourcing" },
    ],
  },

  {
    label: "Planning",
    icon: ClipboardList,
    children: [
      { label: "Projects", icon: FolderKanban, path: "/project-management" },
      { label: "Budget Planning", icon: Wallet, path: "/budget-management" },
      { label: "Vendor Management", icon: Building, path: "/vendor-management" },
      { label: "Guest Management", icon: UserCheck, path: "/guest-hub" },
      { label: "Run Sheet", icon: ClipboardCheck, path: "/run-sheet" },
      { label: "Decor Inventory", icon: Package, path: "/decor-inventory" },
      { label: "Task Management", icon: CheckCircle, path: "/task-management" },
      { label: "Event Templates", icon: LayoutTemplate, path: "/event-templates" },
      { label: "Staff Directory", icon: Users, path: "/staff-directory" },
      { label: "Calendar", icon: Calendar, path: "/calendar" },
      { label: "Timeline / Gantt", icon: GanttChart, path: "/timeline" },
      { label: "Reminders", icon: Bell, path: "/reminders" },
    ],
  },

  {
    label: "Design & Experience",
    icon: Palette,
    children: [
      { label: "Design Studio", icon: Palette, path: "/venue-theme-generator" },
      { label: "Themes & Style", icon: Sparkles, path: "/venue-theme-generator?tab=themes" },
      { label: "Agent Decor Agent", icon: Sparkles, path: "/venue-theme-generator?tab=ai-decor" },
      { label: "3D Designer", icon: Brush, path: "/venue-theme-generator?tab=homestyler" },
      { label: "Floor Plan", icon: LayoutTemplate, path: "/floor-plan-builder" },
      { label: "Graphics & Branding", icon: PenTool, path: "/graphics-branding" },
      { label: "Souvenirs & Gifts", icon: Gift, path: "/souvenirs-gifts" },
    ],
  },
  { label: "DECOR & WAREHOUSE", isSection: true },
  { label: "Decor Inventory", icon: Package, path: "/decor-inventory" },

  {
    label: "Communication",
    icon: MessageSquare,
    children: [
      { label: "Creative Director", icon: Sparkles, path: "/ai-research" },
      { label: "WhatsApp / SMS", icon: MessageSquare, path: "/sms-center" },
      { label: "Invitations", icon: Mail, path: "/email-campaigns" },
      { label: "Email Campaigns", icon: Send, path: "/email-campaigns" },
    ],
  },

  // ── EVENT DAY ──────────────────────────────────────────
  { label: "EVENT DAY", isSection: true },
  { label: "Command Centre", icon: Radio, path: "/event-day-command" },
  { label: "Run Sheet", icon: ClipboardCheck, path: "/run-sheet" },
  { label: "Guest Check-in (QR)", icon: QrCode, path: "/event-day-command" },
  { label: "Badge Generator", icon: BadgeCheck, path: "/badge-generator" },
  { label: "Live Polling / Q&A", icon: Vote, path: "/live-polling" },
  { label: "Print Materials", icon: Printer, path: "/print-materials" },

  // ── POST-EVENT ─────────────────────────────────────────
  { label: "POST-EVENT", isSection: true },
  { label: "Post-Event Analytics", icon: TrendingUp, path: "/post-event-hub" },
  { label: "Analytics & Reports", icon: BarChart3, path: "/management-dashboard" },
  { label: "Guest Surveys", icon: ClipboardCheck, path: "/survey-builder" },
  { label: "Vendor Ratings", icon: Star, path: "/vendor-ratings" },
  { label: "Photo Gallery", icon: Image, path: "/photo-gallery" },
  { label: "Event Closure", icon: CheckCircle, path: "/post-event-hub" },

  // ── CLIENT PORTAL ──────────────────────────────────────
  { label: "CLIENT PORTAL", isSection: true, roles: ["client"] },
  { label: "My Event", icon: Calendar, path: "/client-dashboard", roles: ["client"] },
  { label: "Event Updates", icon: Bell, path: "/client-dashboard?tab=updates", roles: ["client"] },
  { label: "Approvals", icon: CheckCircle, path: "/client-dashboard?tab=approvals", roles: ["client"] },
  { label: "Guest Management", icon: Users, path: "/guest-hub", roles: ["client"] },
  { label: "Documents", icon: FileBox, path: "/documents", roles: ["client"] },
  { label: "Payments", icon: Wallet, path: "/payment-plans", roles: ["client"] },
  { label: "Messages", icon: MessageSquare, path: "/client-portal/messages", roles: ["client"] },

  // ── BUSINESS & ADMIN ───────────────────────────────────
  { label: "BUSINESS & ADMIN", isSection: true, roles: ["admin", "planner", "manager"] },
  { label: "Photo Booth Bookings", icon: Camera, path: "/admin/booth-bookings", roles: ["admin", "planner", "manager"] },
  { label: "Vendor Directory", icon: Building, path: "/vendor-directory", roles: ["admin", "manager"] },
  { label: "Create Invoice", icon: Receipt, path: "/invoicing", roles: ["admin", "planner", "manager"] },
  { label: "Payment Plans", icon: CreditCard, path: "/payment-plans", roles: ["admin", "planner", "manager"] },
  { label: "Expense Tracker", icon: ReceiptText, path: "/expense-tracker", roles: ["admin", "planner", "manager"] },
  { label: "Profit & Loss", icon: Banknote, path: "/profit-loss", roles: ["admin", "planner", "manager"] },
  { label: "Employees", icon: Briefcase, path: "/employees", roles: ["admin", "manager"] },
  { label: "Onboarding & Training", icon: GraduationCap, path: "/onboarding" },
  { label: "Time Monitoring", icon: Clock, path: "/staff-time-monitoring", roles: ["admin", "manager"] },
  { label: "Issue Tickets", icon: Ticket, path: "/tickets" },
  { label: "Automation", icon: Zap, path: "/automation", roles: ["admin"] },
  { label: "Audit Trail", icon: ScrollText, path: "/audit-trail", roles: ["admin"] },
  { label: "Documents", icon: FileBox, path: "/documents" },
  { label: "Admin Panel", icon: Shield, path: "/admin", roles: ["admin"] },
  { label: "Client CRM", icon: Contact, path: "/ep-crm", roles: ["admin", "planner", "manager"] },
  { label: "Tender Centre", icon: Gavel, path: "/saas-tender-dashboard", roles: ["admin", "planner", "manager"] },
  { label: "Creative Director", icon: Sparkles, path: "/admin/marketing-agent", roles: ["admin", "planner", "manager"] },
  { label: "Visitor Analytics", icon: TrendingUp, path: "/admin/visitor-analytics", roles: ["admin", "planner", "manager"] },
];

export default function PlannerSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    const path = window.location.pathname;
    for (const item of navItems) {
      if (item.children) {
        const match = item.children.some(child => child.path && path.startsWith(child.path.split("?")[0]));
        if (match) initial.add(item.label);
      }
    }
    return initial;
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const sendHeartbeat = () => {
      fetch('/api/presence/heartbeat', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    const handleBeforeUnload = () => {
      fetch('/api/presence/offline', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { clearInterval(interval); window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, []);

  const { data: onlineUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/presence/online"],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/presence/online', { headers: { Authorization: `Bearer ${token || ''}` } });
      return res.ok ? res.json() : [];
    },
    refetchInterval: 15000,
  });

  const handleLogout = () => {
    const token = localStorage.getItem('token');
    if (token) fetch('/api/presence/offline', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }).catch(() => {});
    logout();
    setLocation("/");
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'planner': return 'text-green-400';
      case 'admin': return 'text-amber-400';
      case 'staff': return 'text-blue-400';
      case 'client': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isItemVisible = (item: NavItem): boolean => {
    if (!item.roles) return true;
    const userRole = user?.role;
    if (!userRole) return true;
    return item.roles.includes(userRole);
  };

  const isChildActive = (item: NavItem): boolean => {
    if (item.children) {
      return item.children.some(child => {
        if (child.path) {
          const cleanPath = child.path.split("?")[0];
          return location === cleanPath || location.startsWith(cleanPath);
        }
        return false;
      });
    }
    return false;
  };

  const renderNavItem = (item: NavItem) => {
    if (!isItemVisible(item)) return null;

    // Section header
    if (item.isSection) {
      if (collapsed) return null;
      return (
        <div key={item.label} className="px-4 pt-5 pb-1.5">
          <span className="text-[10px] font-bold tracking-[0.12em] text-white/30 uppercase">
            {item.label}
          </span>
        </div>
      );
    }

    // Group with children
    if (item.children) {
      const expanded = expandedGroups.has(item.label);
      const childActive = isChildActive(item);

      return (
        <div key={item.label}>
          <button
            onClick={() => {
              if (collapsed) {
                const firstChild = item.children?.[0];
                if (firstChild?.path) {
                  setLocation(firstChild.path.split("?")[0]);
                  setMobileOpen(false);
                }
              } else {
                toggleGroup(item.label);
              }
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
              childActive
                ? "bg-[#330311]/70 text-white font-semibold"
                : "text-white/70 hover:bg-[#330311]/50 hover:text-white"
            )}
            title={collapsed ? item.label : undefined}
          >
            {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
            {!collapsed && (
              <>
                <span className="truncate flex-1 text-left text-sm">{item.label}</span>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200",
                  expanded ? "rotate-0" : "-rotate-90"
                )} />
              </>
            )}
          </button>
          {!collapsed && expanded && (
            <div className="bg-black/20 border-l border-white/5 ml-4">
              {item.children.map((child, childIdx) => {
                if (!isItemVisible(child)) return null;
                if (!child.path) return null;
                const cleanPath = child.path.split("?")[0];
                const isActive = !child.comingSoon && (location === cleanPath || (cleanPath !== "/" && location.startsWith(cleanPath)));
                return (
                  <button
                    key={`${item.label}-${child.label}-${childIdx}`}
                    onClick={() => { setLocation(child.path!); setMobileOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 pl-5 pr-4 py-2 text-xs transition-colors",
                      isActive
                        ? "bg-[#330311] text-white font-semibold border-r-2 border-white/60"
                        : "text-white/55 hover:bg-[#330311]/40 hover:text-white"
                    )}
                  >
                    {child.icon && <child.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                    <span className="truncate">{child.label}</span>
                    {child.comingSoon && (
                      <span className="ml-auto text-[8px] font-semibold tracking-wide uppercase bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Direct link
    if (!item.path) return null;
    const cleanPath = item.path.split("?")[0];
    const isActive = location === cleanPath || (cleanPath !== "/" && cleanPath !== "/planner-dashboard" && location.startsWith(cleanPath));

    return (
      <button
        key={item.path}
        onClick={() => { setLocation(item.path!); setMobileOpen(false); }}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
          isActive
            ? "bg-[#330311] text-white font-semibold border-r-2 border-white/60"
            : "text-white/70 hover:bg-[#330311]/50 hover:text-white"
        )}
        title={collapsed ? item.label : undefined}
      >
        {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
        {!collapsed && <span className="truncate text-sm">{item.label}</span>}
      </button>
    );
  };

  return (
    <>
      {/* Mobile top navigation bar — visible on all pages that use the sidebar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#1a0508] border-b border-[#330311]/50 z-50 flex items-center gap-3 px-4 shadow-lg">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <img src={eventPerfektLogo} alt="Event Perfekt" className="h-8 w-8 rounded-lg flex-shrink-0 object-cover" />
        <span className="text-white font-bold text-sm flex-1 truncate">Event Perfekt</span>
        {user && <span className="mobile-nav-title text-white/50 text-xs truncate max-w-[90px]">{user.name?.split(' ')[0]}</span>}
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-40 bg-[#1a0508] border-r border-[#330311]/50 flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center gap-3 p-4 border-b border-[#330311]/30", collapsed && "justify-center")}>
          <img src={eventPerfektLogo} alt="Event Perfekt" className="h-9 w-9 rounded-lg flex-shrink-0 shadow-md ring-1 ring-white/10" />
          {!collapsed && <span className="text-white font-bold text-sm truncate">Event Perfekt</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {navItems.map((item, i) => <div key={item.label + i}>{renderNavItem(item)}</div>)}
        </nav>

        {/* Online users */}
        {!collapsed && onlineUsers.length > 0 && (
          <div className="border-t border-[#330311]/30 px-3 py-2">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2 px-1">Online Now</p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {onlineUsers.map((u: any) => (
                <div key={u.user_id} className="flex items-center gap-2 px-1 py-1">
                  <Circle className={cn("w-2 h-2 fill-current shrink-0", getRoleBadgeColor(u.user_role))} />
                  <span className="text-white/80 text-xs truncate">{u.user_name}</span>
                  <span className="text-white/30 text-[9px] shrink-0 capitalize">{u.user_role}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {collapsed && onlineUsers.length > 0 && (
          <div className="border-t border-[#330311]/30 py-2 flex flex-col items-center" title={`${onlineUsers.length} online`}>
            <div className="relative">
              <Users className="w-4 h-4 text-white/50" />
              <span className="absolute -top-1 -right-1 bg-green-500 text-[8px] text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">{onlineUsers.length}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#330311]/30 p-3">
          {user && !collapsed && (
            <div className="text-white/50 text-xs mb-2 truncate px-1">{user.name}</div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-[#330311]/50 rounded-lg transition-colors"
            title={collapsed ? "Log Out" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center gap-3 px-3 py-2 mt-1 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
