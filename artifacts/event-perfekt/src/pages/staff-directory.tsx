import PlannerLayout from "@/components/PlannerLayout";
import { usePageMeta } from "@/hooks/use-page-meta";
import { StaffDirectory } from "@/components/StaffDirectory";
import { Users } from "lucide-react";

export default function StaffDirectoryPage() {
  usePageMeta({ title: "Staff Directory — Event Perfekt" });

  return (
    <PlannerLayout>
      <div className="px-4 lg:px-6 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Staff Directory</h1>
            <p className="text-white/60 text-sm">Quick access to staff phone numbers and contact info</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <StaffDirectory />
        </div>
      </div>
    </PlannerLayout>
  );
}
