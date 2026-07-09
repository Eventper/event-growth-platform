import { useState } from "react";
import { useParams } from "wouter";
import PlannerLayout from "@/components/PlannerLayout";
import { usePageMeta } from "@/hooks/use-page-meta";
import { TaskActionPanel } from "@/components/TaskActionPanel";
import { CheckCircle2 } from "lucide-react";

export default function TaskManagementPage() {
  usePageMeta({ title: "Task Management — Event Perfekt" });
  const { eventId = "" } = useParams();

  return (
    <PlannerLayout>
      <div className="px-4 lg:px-6 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Task Management & Assignments</h1>
            <p className="text-white/60 text-sm">
              Assign tasks to team members and send notifications via email/WhatsApp
            </p>
          </div>
        </div>

        {eventId ? (
          <TaskActionPanel eventId={eventId} />
        ) : (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <p className="text-yellow-200">
              ⚠️ Select an event first to assign tasks
            </p>
          </div>
        )}
      </div>
    </PlannerLayout>
  );
}
