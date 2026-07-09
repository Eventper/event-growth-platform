import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import PlannerSidebar from "@/components/PlannerSidebar";
import {
  FolderKanban, Plus, Search, Calendar, MapPin, Banknote, Clock,
  ChevronRight, ArrowLeft, Edit, Trash2, CheckCircle, Circle,
  AlertCircle, BarChart3, Target, FileText, MessageSquare,
  Flag, Milestone, Users, Building2, Loader2, X, Check,
  ListTodo, CircleDot, Briefcase, Printer,
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "branding", label: "Branding & Design" },
  { value: "marketing", label: "Marketing Campaign" },
  { value: "venue_setup", label: "Venue Setup" },
  { value: "content_creation", label: "Content Creation" },
  { value: "procurement", label: "Procurement" },
  { value: "consultation", label: "Consultation" },
  { value: "production", label: "Production" },
  { value: "logistics", label: "Logistics" },
  { value: "training", label: "Training & Development" },
  { value: "other", label: "Other" },
];

const CURRENCIES = [
  { value: "NGN", label: "NGN (₦)" }, { value: "GBP", label: "GBP (£)" },
  { value: "USD", label: "USD ($)" }, { value: "EUR", label: "EUR (€)" },
  { value: "ZAR", label: "ZAR (R)" }, { value: "GHS", label: "GHS (GH₵)" },
  { value: "KES", label: "KES (KSh)" }, { value: "CAD", label: "CAD (CA$)" },
];

function getCurrencySymbol(code: string): string {
  const s: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€", ZAR: "R", GHS: "GH₵", KES: "KSh", CAD: "CA$", AUD: "A$", AED: "AED", INR: "₹" };
  return s[code] || code;
}

function formatMoney(amount: number, c: string) {
  return `${getCurrencySymbol(c)}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    planning: { bg: "bg-blue-100", text: "text-blue-700", label: "Planning" },
    active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
    on_hold: { bg: "bg-yellow-100", text: "text-yellow-700", label: "On Hold" },
    completed: { bg: "bg-gray-100", text: "text-gray-700", label: "Completed" },
    cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
  };
  const s = map[status] || { bg: "bg-gray-100", text: "text-gray-700", label: status };
  return <Badge className={`${s.bg} ${s.text}`}>{s.label}</Badge>;
}

function getPriorityBadge(priority: string) {
  const map: Record<string, { color: string; label: string }> = {
    low: { color: "text-gray-400", label: "Low" },
    medium: { color: "text-blue-400", label: "Medium" },
    high: { color: "text-amber-400", label: "High" },
    urgent: { color: "text-red-400", label: "Urgent" },
  };
  const p = map[priority] || { color: "text-gray-400", label: priority };
  return <span className={`text-xs font-medium flex items-center gap-1 ${p.color}`}><Flag className="w-3 h-3" />{p.label}</span>;
}

function ProjectDashboard({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", dueDate: "" });
  const [newMilestone, setNewMilestone] = useState({ title: "", description: "", dueDate: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  const { data: project, isLoading } = useQuery<any>({
    queryKey: ['/api/projects', projectId],
    queryFn: () => fetch(`/api/projects/${projectId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', projectId, 'tasks'],
    queryFn: () => fetch(`/api/projects/${projectId}/tasks`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
  });

  const { data: milestones = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', projectId, 'milestones'],
    queryFn: () => fetch(`/api/projects/${projectId}/milestones`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
  });

  const { data: notes = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', projectId, 'notes'],
    queryFn: () => fetch(`/api/projects/${projectId}/notes`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/projects/${projectId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsEditing(false);
      toast({ title: "Project Updated" });
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${projectId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      setShowAddTask(false);
      setNewTask({ title: "", description: "", priority: "medium", dueDate: "" });
      toast({ title: "Task Added" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) => apiRequest("PATCH", `/api/projects/${projectId}/tasks/${taskId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => apiRequest("DELETE", `/api/projects/${projectId}/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      toast({ title: "Task Deleted" });
    },
  });

  const addMilestoneMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${projectId}/milestones`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'milestones'] });
      setShowAddMilestone(false);
      setNewMilestone({ title: "", description: "", dueDate: "" });
      toast({ title: "Milestone Added" });
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: ({ milestoneId, data }: { milestoneId: string; data: any }) => apiRequest("PATCH", `/api/projects/${projectId}/milestones/${milestoneId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'milestones'] }),
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: (milestoneId: string) => apiRequest("DELETE", `/api/projects/${projectId}/milestones/${milestoneId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'milestones'] });
      toast({ title: "Milestone Deleted" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => apiRequest("POST", `/api/projects/${projectId}/notes`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] });
      setNewNote("");
      toast({ title: "Note Added" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => apiRequest("DELETE", `/api/projects/${projectId}/notes/${noteId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] }),
  });

  if (isLoading || !project) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B1538] mx-auto" />
        <p className="text-white/40 mt-3">Loading project...</p>
      </div>
    );
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const pendingTasks = tasks.filter((t: any) => t.status === 'pending').length;
  const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length;
  const overdueTasks = tasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length;
  const completedMilestones = milestones.filter((m: any) => m.status === 'completed').length;

  return (
    <div>
      <Button onClick={onBack} variant="ghost" className="mb-4 text-gray-400 hover:text-white gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-white">{project.name}</h2>
            {getStatusBadge(project.status)}
            {getPriorityBadge(project.priority)}
          </div>
          {project.description && <p className="text-white/50 text-sm mt-1 max-w-2xl">{project.description}</p>}
          <div className="flex items-center gap-4 mt-2 text-white/40 text-xs">
            {project.category && <span className="capitalize">{CATEGORIES.find(c => c.value === project.category)?.label || project.category}</span>}
            {project.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.city}, {project.country}</span>}
            {project.client_name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{project.company_name || project.client_name}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
            <a href="https://www.eventperfekt.com" target="_blank" rel="noopener noreferrer">Home</a>
          </Button>
          <Button onClick={() => { setEditForm({ ...project }); setIsEditing(true); }} variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
            <Edit className="w-4 h-4 mr-1" /> Edit
          </Button>
          <div className="flex items-center gap-2">
            <Select value={project.status} onValueChange={(val) => updateProjectMutation.mutate({ status: val })}>
              <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {updateProjectMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{taskProgress}%</p>
            <p className="text-xs text-white/40">Progress</p>
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
              <div className="bg-[#8B1538] h-1.5 rounded-full transition-all" style={{ width: `${taskProgress}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{completedTasks}/{totalTasks}</p>
            <p className="text-xs text-white/40">Tasks Done</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{overdueTasks}</p>
            <p className="text-xs text-white/40">Overdue</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{completedMilestones}/{milestones.length}</p>
            <p className="text-xs text-white/40">Milestones</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{formatMoney(Number(project.budget || 0), project.currency)}</p>
            <p className="text-xs text-white/40">Budget</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
            <BarChart3 className="w-4 h-4 mr-1.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
            <ListTodo className="w-4 h-4 mr-1.5" /> Tasks ({totalTasks})
          </TabsTrigger>
          <TabsTrigger value="milestones" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
            <Milestone className="w-4 h-4 mr-1.5" /> Milestones ({milestones.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
            <MessageSquare className="w-4 h-4 mr-1.5" /> Notes ({notes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-white text-sm">Project Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-white/50">Category</span><span className="text-white">{CATEGORIES.find(c => c.value === project.category)?.label || project.category}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Status</span>{getStatusBadge(project.status)}</div>
                <div className="flex justify-between"><span className="text-white/50">Priority</span>{getPriorityBadge(project.priority)}</div>
                {project.start_date && <div className="flex justify-between"><span className="text-white/50">Start Date</span><span className="text-white">{new Date(project.start_date).toLocaleDateString()}</span></div>}
                {project.end_date && <div className="flex justify-between"><span className="text-white/50">End Date</span><span className="text-white">{new Date(project.end_date).toLocaleDateString()}</span></div>}
                <div className="flex justify-between"><span className="text-white/50">Budget</span><span className="text-white font-medium">{formatMoney(Number(project.budget || 0), project.currency)}</span></div>
                {project.city && <div className="flex justify-between"><span className="text-white/50">Location</span><span className="text-white">{project.city}, {project.country}</span></div>}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-white text-sm">Task Breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50 flex items-center gap-2"><Circle className="w-3 h-3 text-gray-400" /> Pending</span>
                  <span className="text-white font-medium">{pendingTasks}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50 flex items-center gap-2"><CircleDot className="w-3 h-3 text-blue-400" /> In Progress</span>
                  <span className="text-white font-medium">{inProgressTasks}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50 flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-400" /> Completed</span>
                  <span className="text-white font-medium">{completedTasks}</span>
                </div>
                {overdueTasks > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-red-400 flex items-center gap-2"><AlertCircle className="w-3 h-3" /> Overdue</span>
                    <span className="text-red-400 font-medium">{overdueTasks}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/10">
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-gradient-to-r from-[#8B1538] to-green-500 h-2 rounded-full transition-all" style={{ width: `${taskProgress}%` }} />
                  </div>
                  <p className="text-white/30 text-xs mt-1 text-right">{taskProgress}% complete</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {project.notes && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-white text-sm">Project Notes</CardTitle></CardHeader>
              <CardContent><p className="text-white/70 text-sm whitespace-pre-wrap">{project.notes}</p></CardContent>
            </Card>
          )}

          {milestones.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-white text-sm">Milestone Timeline</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {milestones.map((m: any, idx: number) => (
                    <div key={m.id} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full border-2 ${m.status === 'completed' ? 'bg-green-500 border-green-500' : 'bg-transparent border-white/30'}`}>
                          {m.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {idx < milestones.length - 1 && <div className="w-0.5 h-8 bg-white/10 mt-1" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className={`text-sm font-medium ${m.status === 'completed' ? 'text-green-400 line-through' : 'text-white'}`}>{m.title}</p>
                        {m.due_date && <p className="text-xs text-white/40">{new Date(m.due_date).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-medium">Project Tasks</h3>
            <Button onClick={() => setShowAddTask(true)} size="sm" className="bg-[#8B1538] hover:bg-[#a01d45] text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="text-center py-12">
                <ListTodo className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">No tasks yet. Add your first task to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tasks.map((task: any) => (
                <Card key={task.id} className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateTaskMutation.mutate({
                          taskId: task.id,
                          data: { status: task.status === 'completed' ? 'pending' : 'completed' }
                        })}
                        className="flex-shrink-0"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : task.status === 'in_progress' ? (
                          <CircleDot className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-white/30 hover:text-white/60" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-white/40 line-through' : 'text-white'}`}>
                          {task.title}
                        </p>
                        {task.description && <p className="text-xs text-white/30 mt-0.5 truncate">{task.description}</p>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {task.due_date && (
                          <span className={`text-xs flex items-center gap-1 ${new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-red-400' : 'text-white/40'}`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {getPriorityBadge(task.priority)}
                        <div className="flex items-center gap-2">
                          <Select value={task.status} onValueChange={(val) => updateTaskMutation.mutate({ taskId: task.id, data: { status: val } })}>
                            <SelectTrigger className="w-[110px] h-7 bg-white/5 border-white/10 text-white text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          {updateTaskMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this task?")) deleteTaskMutation.mutate(task.id); }} className="text-white/20 hover:text-red-400 p-1 h-auto">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
            <DialogContent className="bg-[#1a0108] border-[#4a0a1e] text-white">
              <DialogHeader><DialogTitle className="text-white">Add Task</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Title</Label>
                  <Input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Description</Label>
                  <Textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="bg-white/10 border-white/20 text-white" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Priority</Label>
                    <Select value={newTask.priority} onValueChange={val => setNewTask({ ...newTask, priority: val })}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Due Date</Label>
                    <Input type="date" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                  </div>
                </div>
                <Button onClick={() => { if (!newTask.title.trim()) return; addTaskMutation.mutate(newTask); }} disabled={addTaskMutation.isPending} className="w-full bg-[#8B1538] hover:bg-[#a01d45] text-white">
                  {addTaskMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-medium">Milestones</h3>
            <Button onClick={() => setShowAddMilestone(true)} size="sm" className="bg-[#8B1538] hover:bg-[#a01d45] text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Milestone
            </Button>
          </div>

          {milestones.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="text-center py-12">
                <Target className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">No milestones set. Add key dates and deliverables.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {milestones.map((m: any) => (
                <Card key={m.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateMilestoneMutation.mutate({ milestoneId: m.id, data: { status: m.status === 'completed' ? 'pending' : 'completed' } })}>
                          {m.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <Target className="w-5 h-5 text-amber-400" />
                          )}
                        </button>
                        <div>
                          <p className={`text-sm font-medium ${m.status === 'completed' ? 'text-green-400/70 line-through' : 'text-white'}`}>{m.title}</p>
                          {m.description && <p className="text-xs text-white/30">{m.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {m.due_date && (
                          <span className="text-xs text-white/40 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(m.due_date).toLocaleDateString()}
                          </span>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this milestone?")) deleteMilestoneMutation.mutate(m.id); }} className="text-white/20 hover:text-red-400 p-1 h-auto">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={showAddMilestone} onOpenChange={setShowAddMilestone}>
            <DialogContent className="bg-[#1a0108] border-[#4a0a1e] text-white">
              <DialogHeader><DialogTitle className="text-white">Add Milestone</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Title</Label>
                  <Input value={newMilestone.title} onChange={e => setNewMilestone({ ...newMilestone, title: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Description</Label>
                  <Textarea value={newMilestone.description} onChange={e => setNewMilestone({ ...newMilestone, description: e.target.value })} className="bg-white/10 border-white/20 text-white" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Due Date</Label>
                  <Input type="date" value={newMilestone.dueDate} onChange={e => setNewMilestone({ ...newMilestone, dueDate: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
                <Button onClick={() => { if (!newMilestone.title.trim()) return; addMilestoneMutation.mutate(newMilestone); }} disabled={addMilestoneMutation.isPending} className="w-full bg-[#8B1538] hover:bg-[#a01d45] text-white">
                  {addMilestoneMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Milestone
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4 mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note, update, or observation..."
                  className="bg-white/10 border-white/20 text-white flex-1"
                  rows={2}
                />
                <Button
                  onClick={() => { if (newNote.trim()) addNoteMutation.mutate(newNote.trim()); }}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                  className="bg-[#8B1538] hover:bg-[#a01d45] text-white self-end"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {notes.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="text-center py-12">
                <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">No notes yet. Add updates, observations, or meeting minutes.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notes.map((note: any) => (
                <Card key={note.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-white/80 text-sm whitespace-pre-wrap">{note.content}</p>
                        <p className="text-white/30 text-xs mt-2">
                          {note.author_name || "Unknown"} · {new Date(note.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteNoteMutation.mutate(note.id)} className="text-white/20 hover:text-red-400 p-1 h-auto ml-2">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="bg-[#1a0108] border-[#4a0a1e] text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white">Edit Project</DialogTitle></DialogHeader>
          {editForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/70">Name</Label>
                <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-white/10 border-white/20 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Description</Label>
                <Textarea value={editForm.description || ""} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="bg-white/10 border-white/20 text-white" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Category</Label>
                  <Select value={editForm.category} onValueChange={val => setEditForm({ ...editForm, category: val })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Priority</Label>
                  <Select value={editForm.priority} onValueChange={val => setEditForm({ ...editForm, priority: val })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Start Date</Label>
                  <Input type="date" value={editForm.start_date ? new Date(editForm.start_date).toISOString().split('T')[0] : ""} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">End Date</Label>
                  <Input type="date" value={editForm.end_date ? new Date(editForm.end_date).toISOString().split('T')[0] : ""} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Budget</Label>
                  <Input type="number" value={editForm.budget || ""} onChange={e => setEditForm({ ...editForm, budget: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Currency</Label>
                  <Select value={editForm.currency} onValueChange={val => setEditForm({ ...editForm, currency: val })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">City</Label>
                  <Input value={editForm.city || ""} onChange={e => setEditForm({ ...editForm, city: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Country</Label>
                  <Input value={editForm.country || ""} onChange={e => setEditForm({ ...editForm, country: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Notes</Label>
                <Textarea value={editForm.notes || ""} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="bg-white/10 border-white/20 text-white" rows={3} />
              </div>
              <Button
                onClick={() => updateProjectMutation.mutate({
                  name: editForm.name, description: editForm.description, category: editForm.category,
                  priority: editForm.priority, startDate: editForm.start_date, endDate: editForm.end_date,
                  budget: editForm.budget, currency: editForm.currency, city: editForm.city, country: editForm.country, notes: editForm.notes,
                })}
                disabled={updateProjectMutation.isPending}
                className="w-full bg-[#8B1538] hover:bg-[#a01d45] text-white"
              >
                {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProjectPortal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [newProject, setNewProject] = useState({
    name: "", description: "", category: "general", priority: "medium",
    startDate: "", endDate: "", budget: "", currency: "NGN", country: "Nigeria", city: "", notes: "",
  });

  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/projects'],
    queryFn: () => fetch('/api/projects', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ['/api/events'],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/projects", data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setShowCreateDialog(false);
      setNewProject({ name: "", description: "", category: "general", priority: "medium", startDate: "", endDate: "", budget: "", currency: "NGN", country: "Nigeria", city: "", notes: "" });
      toast({ title: "Project Created", description: `"${data.name}" has been created.` });
      setSelectedProjectId(data.id);
    },
    onError: () => toast({ title: "Error", description: "Failed to create project.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({ title: "Deleted", description: "Project removed." });
    },
  });

  const filtered = projects.filter((p: any) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p: any) => p.status === 'active').length;
  const totalEvents = events.length;

  return (
    <div className="min-h-screen">
      <PlannerSidebar />
      <main className="lg:ml-60 p-6 overflow-y-auto">
        {selectedProjectId ? (
          <ProjectDashboard projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <FolderKanban className="w-8 h-8 text-[#8B1538]" />
                  Project Portal
                </h1>
                <p className="text-white/60 mt-1">Manage events and projects in one place</p>
              </div>
              <div className="flex items-center gap-2">
                {(projects.length > 0 || events.length > 0) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={() => {
                      const allItems = [
                        ...projects.map((p: any) => ({
                          name: p.name,
                          type: "Project",
                          category: CATEGORIES.find(c => c.value === p.category)?.label || p.category,
                          status: p.status,
                          priority: p.priority,
                          budget: p.budget ? formatMoney(Number(p.budget), p.currency) : '-',
                          date: new Date(p.created_at).toLocaleDateString(),
                        })),
                        ...(events as any[]).map((e: any) => ({
                          name: e.name,
                          type: "Event",
                          category: e.eventCategory || e.type || '-',
                          status: e.status || 'active',
                          priority: '-',
                          budget: e.budget ? formatMoney(Number(e.budget), e.currency || 'NGN') : '-',
                          date: e.startDate ? new Date(e.startDate).toLocaleDateString() : '-',
                        })),
                      ];
                      openPrintWindow({
                        title: "Project Portal — All Projects & Events",
                        stats: [
                          { label: "Events", value: totalEvents },
                          { label: "Projects", value: totalProjects },
                          { label: "Active Projects", value: activeProjects },
                          { label: "Total Work", value: totalEvents + totalProjects },
                        ],
                        columns: [
                          { header: "Name", key: "name" },
                          { header: "Type", key: "type" },
                          { header: "Category", key: "category" },
                          { header: "Status", key: "status" },
                          { header: "Priority", key: "priority" },
                          { header: "Budget", key: "budget", align: "right" },
                          { header: "Date", key: "date" },
                        ],
                        rows: allItems,
                        orientation: "landscape",
                      });
                    }}
                  >
                    <Printer className="w-4 h-4 mr-2" /> Print
                  </Button>
                )}
                <Button onClick={() => setShowCreateDialog(true)} className="bg-[#8B1538] hover:bg-[#a01d45] text-white">
                  <Plus className="w-4 h-4 mr-2" /> New Project
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">Events</span>
                    <Calendar className="w-4 h-4 text-[#8B1538]" />
                  </div>
                  <p className="text-2xl font-bold text-white">{totalEvents}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">Projects</span>
                    <Briefcase className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{totalProjects}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">Active Projects</span>
                    <CircleDot className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-green-400">{activeProjects}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">Total Work</span>
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-bold text-amber-400">{totalEvents + totalProjects}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="projects" className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList className="bg-white/5 border border-white/10">
                  <TabsTrigger value="projects" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
                    <Briefcase className="w-4 h-4 mr-1.5" /> Projects ({totalProjects})
                  </TabsTrigger>
                  <TabsTrigger value="events" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
                    <Calendar className="w-4 h-4 mr-1.5" /> Events ({totalEvents})
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="pl-9 bg-white/10 border-white/20 text-white w-[200px]"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[130px] bg-white/10 border-white/20 text-white text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="projects">
                {isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#8B1538] mx-auto" />
                    <p className="text-white/40 mt-3">Loading projects...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="text-center py-16">
                      <FolderKanban className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-white/60 mb-2">No Projects Yet</h3>
                      <p className="text-white/40 max-w-md mx-auto mb-4">Create your first project to start managing non-event work like branding, marketing, or procurement.</p>
                      <Button onClick={() => setShowCreateDialog(true)} className="bg-[#8B1538] hover:bg-[#a01d45] text-white">
                        <Plus className="w-4 h-4 mr-2" /> Create Project
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((project: any) => (
                      <Card
                        key={project.id}
                        className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                        onClick={() => setSelectedProjectId(project.id)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Briefcase className="w-4 h-4 text-[#8B1538]" />
                                <h3 className="font-bold text-white group-hover:text-[#8B1538] transition-colors">{project.name}</h3>
                                {getStatusBadge(project.status)}
                                {getPriorityBadge(project.priority)}
                              </div>
                              {project.description && <p className="text-white/40 text-xs mb-2 max-w-xl truncate">{project.description}</p>}
                              <div className="flex items-center gap-4 text-xs text-white/40">
                                <span className="capitalize">{CATEGORIES.find(c => c.value === project.category)?.label || project.category}</span>
                                {project.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.city}</span>}
                                {project.budget && Number(project.budget) > 0 && (
                                  <span className="flex items-center gap-1"><Banknote className="w-3 h-3" />{formatMoney(Number(project.budget), project.currency)}</span>
                                )}
                                {(project.company_name || project.client_name) && (
                                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{project.company_name || project.client_name}</span>
                                )}
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(project.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); if (confirm("Delete this project?")) deleteMutation.mutate(project.id); }} className="text-white/20 hover:text-red-400">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="events">
                <div className="space-y-3">
                  {events.length === 0 ? (
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="text-center py-12">
                        <Calendar className="w-10 h-10 text-white/20 mx-auto mb-3" />
                        <p className="text-white/50">No events yet. Create your first event from the sidebar.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    events
                      .filter((e: any) => !searchQuery || e.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((event: any) => (
                        <Card
                          key={event.id}
                          className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                          onClick={() => window.location.href = `/event-dashboard/${event.id}`}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Calendar className="w-4 h-4 text-amber-400" />
                                  <h3 className="font-bold text-white group-hover:text-[#8B1538] transition-colors">{event.name}</h3>
                                  <Badge className="bg-amber-100 text-amber-700">Event</Badge>
                                  {event.status && <Badge className="bg-blue-100 text-blue-700 capitalize">{event.status}</Badge>}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-white/40">
                                  {event.eventCategory && <span className="capitalize">{event.eventCategory}</span>}
                                  {event.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.city}, {event.country}</span>}
                                  {event.startDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(event.startDate).toLocaleDateString()}</span>}
                                  {event.guestCount && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.guestCount} guests</span>}
                                  {event.budget && Number(event.budget) > 0 && (
                                    <span className="flex items-center gap-1"><Banknote className="w-3 h-3" />{formatMoney(Number(event.budget), event.currency || "NGN")}</span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-[#1a0108] border-[#4a0a1e] text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#8B1538]" />
                Create New Project
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/70">Project Name *</Label>
                <Input value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} placeholder="e.g. Brand Refresh Campaign" className="bg-white/10 border-white/20 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Description</Label>
                <Textarea value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} placeholder="What is this project about?" className="bg-white/10 border-white/20 text-white" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Category</Label>
                  <Select value={newProject.category} onValueChange={val => setNewProject({ ...newProject, category: val })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Priority</Label>
                  <Select value={newProject.priority} onValueChange={val => setNewProject({ ...newProject, priority: val })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Start Date</Label>
                  <Input type="date" value={newProject.startDate} onChange={e => setNewProject({ ...newProject, startDate: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">End Date</Label>
                  <Input type="date" value={newProject.endDate} onChange={e => setNewProject({ ...newProject, endDate: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Budget</Label>
                  <Input type="number" value={newProject.budget} onChange={e => setNewProject({ ...newProject, budget: e.target.value })} placeholder="0.00" className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Currency</Label>
                  <Select value={newProject.currency} onValueChange={val => setNewProject({ ...newProject, currency: val })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">City</Label>
                  <Input value={newProject.city} onChange={e => setNewProject({ ...newProject, city: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Country</Label>
                  <Input value={newProject.country} onChange={e => setNewProject({ ...newProject, country: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>
              <Button
                onClick={() => { if (!newProject.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; } createMutation.mutate(newProject); }}
                disabled={createMutation.isPending}
                className="w-full bg-[#8B1538] hover:bg-[#a01d45] text-white"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
