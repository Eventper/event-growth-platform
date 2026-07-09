import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { epgFetch, useEPGlobalAuth } from "@/lib/epglobal-auth";
import EPGlobalLayout from "@/components/EPGlobalLayout";
import { format, parseISO, isAfter } from "date-fns";
import { Plus, Search, ExternalLink, Edit2, Trash2, MessageSquare, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const priorities = ["low", "medium", "high", "critical"];
const statuses = ["not_started", "in_progress", "waiting", "complete", "overdue"];
const categories = ["finance", "operations", "compliance", "reporting", "admin"];

const priorityBadge: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border border-red-200",
  high: "bg-orange-100 text-orange-800 border border-orange-200",
  medium: "bg-blue-100 text-blue-800 border border-blue-200",
  low: "bg-gray-100 text-gray-600 border border-gray-200",
};
const statusBadge: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  waiting: "bg-yellow-100 text-yellow-700",
  complete: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

const emptyTask = {
  title: "", description: "", assigned_to: "", category: "admin", priority: "medium",
  status: "not_started", due_date: "", quickbooks_link: "", project_co_link: "",
  document_link: "", notes: "",
};

export default function EPGlobalTasks() {
  const { user } = useEPGlobalAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [newNote, setNewNote] = useState("");
  const [form, setForm] = useState(emptyTask);

  const params = new URLSearchParams();
  if (filterStatus) params.set("status", filterStatus);
  if (filterCategory) params.set("category", filterCategory);
  if (filterPriority) params.set("priority", filterPriority);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["/api/epglobal/tasks", filterStatus, filterCategory, filterPriority],
    queryFn: () => epgFetch(`/api/epglobal/tasks?${params}`),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/epglobal/users"],
    queryFn: () => epgFetch("/api/epglobal/users"),
  });

  const { data: taskNotes = [] } = useQuery({
    queryKey: ["/api/epglobal/tasks", expandedTask, "notes"],
    queryFn: () => expandedTask ? epgFetch(`/api/epglobal/tasks/${expandedTask}/notes`) : Promise.resolve([]),
    enabled: !!expandedTask,
  });

  const createTask = useMutation({
    mutationFn: (data: any) => epgFetch("/api/epglobal/tasks", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/tasks"] }); setShowForm(false); setForm(emptyTask); toast({ title: "Task created" }); },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: any) => epgFetch(`/api/epglobal/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/tasks"] }); setEditTask(null); toast({ title: "Task updated" }); },
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => epgFetch(`/api/epglobal/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/tasks"] }); toast({ title: "Task deleted" }); },
  });

  const addNote = useMutation({
    mutationFn: ({ id, content }: any) => epgFetch(`/api/epglobal/tasks/${id}/notes`, { method: "POST", body: JSON.stringify({ content }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/tasks", expandedTask, "notes"] }); setNewNote(""); },
  });

  const filtered = (tasks as any[]).filter((t: any) =>
    !search || t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.assignee_name?.toLowerCase().includes(search.toLowerCase())
  );

  const isOverdue = (date: string) => date && isAfter(new Date(), parseISO(date));

  const TaskForm = ({ onSubmit, initial, onCancel }: any) => {
    const [f, setF] = useState(initial || form);
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h3 className="font-semibold text-gray-900 mb-4">{initial ? "Edit Task" : "New Task"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
            <Input value={f.title} onChange={e => setF({...f, title: e.target.value})} placeholder="Task title" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea value={f.description} onChange={e => setF({...f, description: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#1a3a6b]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Assign To</label>
            <select value={f.assigned_to} onChange={e => setF({...f, assigned_to: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Unassigned</option>
              {(users as any[]).map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
            <Input type="datetime-local" value={f.due_date} onChange={e => setF({...f, due_date: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select value={f.category} onChange={e => setF({...f, category: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none capitalize">
              {categories.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
            <select value={f.priority} onChange={e => setF({...f, priority: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none capitalize">
              {priorities.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={f.status} onChange={e => setF({...f, status: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              {statuses.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">QuickBooks Link</label>
            <Input value={f.quickbooks_link} onChange={e => setF({...f, quickbooks_link: e.target.value})} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project.co Link</label>
            <Input value={f.project_co_link} onChange={e => setF({...f, project_co_link: e.target.value})} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Document Link</label>
            <Input value={f.document_link} onChange={e => setF({...f, document_link: e.target.value})} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <Input value={f.notes} onChange={e => setF({...f, notes: e.target.value})} placeholder="Additional notes..." />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onSubmit(f)} disabled={!f.title} className="bg-[#1a3a6b] text-white">
            {initial ? "Save Changes" : "Create Task"}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  };

  return (
    <EPGlobalLayout title="Tasks" subtitle="Manage and track all team tasks">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none capitalize">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none capitalize">
          <option value="">All Priorities</option>
          {priorities.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        <Button onClick={() => { setShowForm(true); setEditTask(null); }} className="bg-[#1a3a6b] text-white gap-2">
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      {showForm && !editTask && (
        <TaskForm onSubmit={(f: any) => createTask.mutate(f)} onCancel={() => setShowForm(false)} />
      )}

      {/* Task List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1a3a6b] border-t-transparent" /></div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 mb-2">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</p>
          {filtered.map((task: any) => (
            <div key={task.id} className={`bg-white rounded-xl border ${task.priority === "critical" ? "border-red-200" : "border-gray-200"} overflow-hidden`}>
              {editTask?.id === task.id ? (
                <TaskForm
                  initial={{ ...task, due_date: task.due_date ? task.due_date.slice(0, 16) : "", assigned_to: task.assigned_to || "" }}
                  onSubmit={(f: any) => updateTask.mutate({ id: task.id, data: f })}
                  onCancel={() => setEditTask(null)}
                />
              ) : (
                <>
                  <div className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-gray-900">{task.title}</p>
                          <Badge className={`text-xs ${priorityBadge[task.priority]}`}>{task.priority}</Badge>
                          <Badge className={`text-xs ${statusBadge[task.status]}`}>{task.status?.replace("_", " ")}</Badge>
                          <Badge className="text-xs bg-gray-50 text-gray-500 border border-gray-200 capitalize">{task.category}</Badge>
                        </div>
                        {task.description && <p className="text-sm text-gray-500 mb-2">{task.description}</p>}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          {task.owner_name && <span>By {task.owner_name}</span>}
                          {task.assignee_name && <span>→ {task.assignee_name}</span>}
                          {task.due_date && (
                            <span className={isOverdue(task.due_date) && task.status !== "complete" ? "text-red-600 font-semibold" : ""}>
                              {isOverdue(task.due_date) && task.status !== "complete" ? "⚠ Overdue — " : ""}
                              Due {format(parseISO(task.due_date), "d MMM yyyy HH:mm")}
                            </span>
                          )}
                          {task.notes && <span className="italic">"{task.notes}"</span>}
                        </div>
                        <div className="flex gap-2 mt-2">
                          {task.quickbooks_link && <a href={task.quickbooks_link} target="_blank" rel="noreferrer" className="text-xs text-green-600 hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> QuickBooks</a>}
                          {task.project_co_link && <a href={task.project_co_link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Project.co</a>}
                          {task.document_link && <a href={task.document_link} target="_blank" rel="noreferrer" className="text-xs text-gray-600 hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Document</a>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)} className="p-1.5 text-gray-400 hover:text-[#1a3a6b] hover:bg-gray-100 rounded-lg">
                          {expandedTask === task.id ? <ChevronUp className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                        </button>
                        <button onClick={() => { setEditTask(task); setShowForm(false); }} className="p-1.5 text-gray-400 hover:text-[#1a3a6b] hover:bg-gray-100 rounded-lg">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {user?.role === "admin" && (
                          <button onClick={() => { if (confirm("Delete this task?")) deleteTask.mutate(task.id); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedTask === task.id && (
                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Task Notes / History</h4>
                      <div className="space-y-2 mb-3">
                        {(taskNotes as any[]).map((note: any) => (
                          <div key={note.id} className="bg-white rounded-lg p-3 border border-gray-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-700">{note.author_name}</span>
                              <span className="text-xs text-gray-400">{format(parseISO(note.created_at), "d MMM HH:mm")}</span>
                            </div>
                            <p className="text-sm text-gray-600">{note.content}</p>
                          </div>
                        ))}
                        {(taskNotes as any[]).length === 0 && <p className="text-xs text-gray-400">No notes yet</p>}
                      </div>
                      <div className="flex gap-2">
                        <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note..." className="text-sm" />
                        <Button size="sm" onClick={() => { if (newNote.trim()) addNote.mutate({ id: task.id, content: newNote }); }} className="bg-[#1a3a6b] text-white">Add</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400"><p>No tasks found</p></div>}
        </div>
      )}
    </EPGlobalLayout>
  );
}
