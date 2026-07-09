import { ReactNode } from "react";
import { useLocation } from "wouter";
import EPGlobalSidebar from "./EPGlobalSidebar";
import { useEPGlobalAuth } from "@/lib/epglobal-auth";

interface Props { children: ReactNode; title?: string; subtitle?: string; }

export default function EPGlobalLayout({ children, title, subtitle }: Props) {
  const { user } = useEPGlobalAuth();
  const [, setLocation] = useLocation();

  if (!user) {
    setLocation("/epglobal/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex">
      <EPGlobalSidebar />
      <main className="flex-1 lg:ml-60 min-h-screen pt-14 lg:pt-0">
        {title && (
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <h1 className="text-xl font-bold text-black">{title}</h1>
            {subtitle && <p className="text-sm text-black mt-0.5">{subtitle}</p>}
          </div>
        )}
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
