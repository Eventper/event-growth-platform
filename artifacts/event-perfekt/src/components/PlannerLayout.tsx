import PlannerSidebar from "./PlannerSidebar";

interface PlannerLayoutProps {
  children: React.ReactNode;
}

export default function PlannerLayout({ children }: PlannerLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209]">
      <PlannerSidebar />
      <div className="lg:pl-60 min-h-screen transition-all duration-300 px-3 sm:px-6 pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  );
}
