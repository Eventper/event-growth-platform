import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Send, CheckCircle, Mail, MessageCircle } from "lucide-react";

interface TaskAssignmentProps {
  eventId: string;
  onTaskAssigned?: () => void;
}

export function TaskActionPanel({ eventId, onTaskAssigned }: TaskAssignmentProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [notifyVia, setNotifyVia] = useState("email"); // email, whatsapp, both

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["/api/users/staff"],
    queryFn: async () => {
      const res = await fetch("/api/users/staff", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return res.ok ? res.json() : [];
    },
  });

  // Fetch existing tasks
  const { data: tasks = [] } = useQuery({
    queryKey: [`/api/events/${eventId}/tasks`],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/tasks`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return res.ok ? res.json() : [];
    },
  });

  // Assign task mutation
  const assignTaskMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !assignTo || !dueDate) {
        throw new Error("Title, assignee, and due date are required");
      }

      return apiRequest("POST", `/api/events/${eventId}/tasks/assign`, {
        title,
        description,
        assigned_to: assignTo,
        due_date: dueDate,
        priority,
        notify_via: notifyVia,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Task Assigned!",
        description: `Task sent to ${
          teamMembers.find((m: any) => m.id === assignTo)?.name
        } via ${notifyVia}`,
      });
      setTitle("");
      setDescription("");
      setAssignTo("");
      setDueDate("");
      setPriority("medium");
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/tasks`] });
      onTaskAssigned?.();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Failed to assign task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Task Assignment Form */}
      <Card className="bg-white/10 border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🎯 Assign Task to Team Member</h3>

        <div className="space-y-4">
          {/* Task Title */}
          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">Task Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Confirm final headcount, Set up decorations..."
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the task..."
              className="bg-white/5 border-white/10 text-white min-h-20"
            />
          </div>

          {/* Assign To */}
          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">Assign To *</label>
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member: any) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} {member.phone ? `(${member.phone})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">Due Date *</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🟢 Low</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="high">🔴 High</SelectItem>
                <SelectItem value="urgent">⛔ Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notification Method */}
          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              📢 Notify Via
            </label>
            <div className="flex gap-2">
              <Button
                onClick={() => setNotifyVia("email")}
                variant={notifyVia === "email" ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email
              </Button>
              <Button
                onClick={() => setNotifyVia("whatsapp")}
                variant={notifyVia === "whatsapp" ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
              <Button
                onClick={() => setNotifyVia("both")}
                variant={notifyVia === "both" ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Both
              </Button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={() => assignTaskMutation.mutate()}
            disabled={assignTaskMutation.isPending || !title || !assignTo || !dueDate}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {assignTaskMutation.isPending ? (
              "Sending..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Assign & Notify
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Existing Tasks */}
      {tasks.length > 0 && (
        <Card className="bg-white/10 border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📋 Event Tasks ({tasks.length})</h3>

          <div className="space-y-3">
            {tasks.map((task: any) => (
              <div key={task.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-white">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-white/60 mt-1">{task.description}</p>
                    )}
                    <div className="flex gap-2 mt-2 text-xs">
                      <span className="text-blue-400">
                        👤 {task.assigned_to_name || "Unassigned"}
                      </span>
                      <span className="text-orange-400">📅 {task.due_date || "No date"}</span>
                      <span
                        className={
                          task.priority === "urgent"
                            ? "text-red-400"
                            : task.priority === "high"
                            ? "text-orange-400"
                            : "text-white/60"
                        }
                      >
                        {task.priority === "urgent"
                          ? "⛔"
                          : task.priority === "high"
                          ? "🔴"
                          : "🟡"}{" "}
                        {task.priority}
                      </span>
                      <span className="text-green-400">✓ {task.status || "todo"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
