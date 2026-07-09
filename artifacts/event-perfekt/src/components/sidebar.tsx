import { Link, useLocation } from "wouter";
import { Calendar, Home, Plus, Users, BarChart3, ClipboardList, Settings, Building2, Palette, DollarSign, Clock, Star } from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Dashboard", href: "/", active: location === "/" },
    { icon: Plus, label: "Create Event", href: "/create-event", active: location === "/create-event" },
    { icon: BarChart3, label: "Project Management", href: "/project-management", active: location === "/project-management" },
    { icon: Clock, label: "Event Planning", href: "/planner-dashboard", active: location === "/planner-dashboard" },
    { icon: Star, label: "I Am Her", href: "/iam-her", active: location.startsWith("/iam-her") },
  ];

  const designTools = [
    { icon: Palette, label: "Venue Design Studio", href: "/venue-theme-generator", active: location === "/venue-theme-generator" },
  ];

  const managementTools = [
    { icon: DollarSign, label: "Budget Management", href: "/budget-management", active: location === "/budget-management" },
    { icon: Building2, label: "Vendor Management", href: "/vendor-management", active: location === "/vendor-management" },
    { icon: BarChart3, label: "Contract Management", href: "/contract-management", active: location === "/contract-management" },
  ];

  const quickActions = [
    { icon: ClipboardList, label: "Templates", href: "/templates" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 h-screen flex flex-col" style={{color: 'black'}}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-200" style={{color: 'black'}}>
        <div className="flex items-center space-x-3" style={{color: 'black'}}>
          <img 
            src="/assets/3d Logo (1)_1754249114645.jpg" 
            alt="Event Perfekt Logo" 
            className="h-8 w-auto"
          />
          <div style={{color: 'black'}}>
            <h1 className="text-xl font-bold text-burgundy-800">Event Perfekt</h1>
            <p className="text-sm text-contrast-auto" style={{color: 'black'}}>Planning Portal</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="mt-6 flex-1">
        <div className="px-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main</p>
        </div>
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div className={`
                    group flex items-center px-4 py-3 text-sm font-medium rounded-lg cursor-pointer
                    ${item.active 
                      ? "bg-burgundy-50 text-black" 
                      : "text-black"
                    }
                  `}>
                    <Icon className={`mr-3 text-base ${item.active ? "text-burgundy-600" : "text-gray-400"}`} />
                    {item.label}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="px-4 mt-8 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Design Tools</p>
        </div>
        <ul className="space-y-1 px-2">
          {designTools.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div className={`
                    group flex items-center px-4 py-3 text-sm font-medium rounded-lg cursor-pointer
                    ${item.active 
                      ? "bg-burgundy-50 text-black" 
                      : "text-black"
                    }
                  `}>
                    <Icon className={`mr-3 text-base ${item.active ? "text-burgundy-600" : "text-gray-400"}`} />
                    {item.label}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="px-4 mt-8 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Management Tools</p>
        </div>
        <ul className="space-y-1 px-2">
          {managementTools.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div className="text-black group flex items-center px-4 py-3 text-sm font-medium rounded-lg cursor-pointer">
                    <Icon className="text-gray-400 mr-3 text-base" />
                    {item.label}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-burgundy-100 rounded-full flex items-center justify-center">
            <span className="text-burgundy-800 font-medium text-sm">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-contrast-auto">Jane Doe</p>
            <p className="text-xs text-contrast-auto">Event Coordinator</p>
          </div>
          <button className="text-gray-400">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
