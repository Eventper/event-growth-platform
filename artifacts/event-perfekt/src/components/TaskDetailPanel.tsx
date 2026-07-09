import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, CheckCircle, Clock, Link2, MessageSquare, ListTree,
  AlertCircle, ArrowRight, Flag, Send, ChevronDown, ChevronRight, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskDetailPanelProps {
  activityId: string;
  eventId: string;
  allActivities: any[];
}

const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-gray-400",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  on_hold: "bg-amber-500",
  cancelled: "bg-red-400",
};

export default function TaskDetailPanel({ activityId, eventId, allActivities }: TaskDetailPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [depTarget, setDepTarget] = useState("");
  const [activeTab, setActiveTab] = useState("subtasks");

  const { data: subtasks = [] } = useQuery<any[]>({
    queryKey: ["/api/activities", activityId, "subtasks"],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/activities/${activityId}/subtasks`, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : [];
    },
  });

  const { data: comments = [] } = useQuery<any[]>({
    queryKey: ["/api/activities", activityId, "comments"],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/activities/${activityId}/comments`, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : [];
    },
  });

  const { data: dependencies = { dependsOn: [], blocks: [] } } = useQuery<any>({
    queryKey: ["/api/activities", activityId, "dependencies"],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/activities/${activityId}/dependencies`, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : { dependsOn: [], blocks: [] };
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async (taskName: string) => apiRequest("POST", `/api/activities/${activityId}/subtasks`, { taskName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", activityId, "subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities", eventId] });
      setNewSubtask("");
      toast({ title: "Subtask added" });
    },
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/activities/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", activityId, "subtasks"] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => apiRequest("POST", `/api/activities/${activityId}/comments`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", activityId, "comments"] });
      setNewComment("");
      toast({ title: "Comment added" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/task-comments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", activityId, "comments"] });
    },
  });

  const addDependencyMutation = useMutation({
    mutationFn: async (dependsOnId: string) => apiRequest("POST", "/api/task-dependencies", { activityId, dependsOnId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", activityId, "dependencies"] });
      setDepTarget("");
      toast({ title: "Dependency added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeDependencyMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/task-dependencies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", activityId, "dependencies"] });
    },
  });

  const availableForDeps = allActivities.filter((a: any) => a.id !== activityId && !a.subtaskOf);
  const completedSubtasks = subtasks.filter((s: any) => s.status === "completed").length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  return (
    <div className="border-t border-gray-200 mt-3 pt-3">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8">
          <TabsTrigger value="subtasks" className="text-xs h-7 gap-1">
            <ListTree className="w-3 h-3" />Subtasks
            {subtasks.length > 0 && <Badge variant="secondary" className="text-[10px] px-1 h-4">{completedSubtasks}/{subtasks.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="comments" className="text-xs h-7 gap-1">
            <MessageSquare className="w-3 h-3" />Comments
            {comments.length > 0 && <Badge variant="secondary" className="text-[10px] px-1 h-4">{comments.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="dependencies" className="text-xs h-7 gap-1">
            <Link2 className="w-3 h-3" />Dependencies
            {(dependencies.dependsOn.length + dependencies.blocks.length) > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1 h-4">{dependencies.dependsOn.length + dependencies.blocks.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subtasks" className="mt-2">
          {subtasks.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{subtaskProgress}% complete</span>
                <span>{completedSubtasks}/{subtasks.length}</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${subtaskProgress}%` }} />
              </div>
            </div>
          )}
          <div className="space-y-1">
            {subtasks.map((sub: any) => (
              <div key={sub.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 group">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateSubtaskMutation.mutate({ id: sub.id, status: sub.status === "completed" ? "not_started" : "completed" })}
                    disabled={updateSubtaskMutation.isPending}
                    className={cn("w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                      sub.status === "completed" ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-green-400"
                    )}
                  >
                    {sub.status === "completed" && <CheckCircle className="w-3 h-3" />}
                  </button>
                  {updateSubtaskMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                </div>
                <span className={cn("text-sm flex-1", sub.status === "completed" && "line-through text-gray-400")}>{sub.taskName}</span>
                {sub.deadline && (
                  <span className="text-[10px] text-gray-400">{format(new Date(sub.deadline), 'MMM d')}</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add a subtask..."
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSubtask.trim()) createSubtaskMutation.mutate(newSubtask.trim());
              }}
            />
            <Button
              size="sm"
              className="h-8"
              disabled={!newSubtask.trim() || createSubtaskMutation.isPending}
              onClick={() => newSubtask.trim() && createSubtaskMutation.mutate(newSubtask.trim())}
              style={{ backgroundColor: '#330311', color: 'white' }}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="comments" className="mt-2">
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {comments.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">No comments yet. Use @name to mention someone.</p>
            )}
            {comments.map((comment: any) => (
              <div key={comment.id} className="group">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#330311] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {(comment.userName || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{comment.userName}</span>
                      <span className="text-[10px] text-gray-400">
                        {comment.createdAt && format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                      </span>
                      <button
                        onClick={() => deleteCommentMutation.mutate(comment.id)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                      {comment.content.split(/(@\w+(?:\s\w+)?)/g).map((part: string, i: number) =>
                        part.startsWith("@") ? <span key={i} className="text-blue-600 font-medium">{part}</span> : part
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment... use @name to mention"
              className="text-sm min-h-[60px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
                  e.preventDefault();
                  addCommentMutation.mutate(newComment.trim());
                }
              }}
            />
            <Button
              size="sm"
              className="h-8 self-end"
              disabled={!newComment.trim() || addCommentMutation.isPending}
              onClick={() => newComment.trim() && addCommentMutation.mutate(newComment.trim())}
              style={{ backgroundColor: '#330311', color: 'white' }}
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="dependencies" className="mt-2">
          {dependencies.dependsOn.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Blocked by (must finish first)</p>
              <div className="space-y-1">
                {dependencies.dependsOn.map((dep: any) => (
                  <div key={dep.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-red-50 border border-red-200 group">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_COLORS[dep.activity?.status] || "bg-gray-400")} />
                    <span className="text-sm flex-1 truncate">{dep.activity?.taskName}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{dep.activity?.status?.replace("_", " ")}</Badge>
                    <button onClick={() => removeDependencyMutation.mutate(dep.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dependencies.blocks.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Blocking (waiting on this task)</p>
              <div className="space-y-1">
                {dependencies.blocks.map((dep: any) => (
                  <div key={dep.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-amber-50 border border-amber-200">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">{dep.activity?.taskName}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{dep.activity?.status?.replace("_", " ")}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <Select value={depTarget} onValueChange={setDepTarget}>
              <SelectTrigger className="h-8 text-sm flex-1">
                <SelectValue placeholder="Select task this depends on..." />
              </SelectTrigger>
              <SelectContent>
                {availableForDeps.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", STATUS_COLORS[a.status] || "bg-gray-400")} />
                      {a.taskName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8"
              disabled={!depTarget || addDependencyMutation.isPending}
              onClick={() => depTarget && addDependencyMutation.mutate(depTarget)}
              style={{ backgroundColor: '#330311', color: 'white' }}
            >
              <Link2 className="w-3 h-3 mr-1" />Add
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
