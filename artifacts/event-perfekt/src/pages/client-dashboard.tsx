import { useState } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import EmailStatusBanner from "@/components/EmailStatusBanner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  DollarSign,
  FileText,
  Users,
  Clock,
  AlertCircle,
  Download,
  MessageSquare,
  CheckCircle,
  User,
  Mail,
  Phone,
  TrendingUp,
  Wallet,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  PenTool,
  Building2,
  LayoutDashboard,
  FolderOpen,
  Image,
  Receipt,
  ChevronRight,
  MapPin,
  Eye,
  Send,
  ArrowLeft,
  Star,
  Shield,
  Briefcase,
  FileCheck,
  CreditCard,
  Activity,
  ClipboardList,
  Printer
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

const CURRENCY_OPTIONS = [
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
];

function getCurrencySymbol(code: string): string {
  const found = CURRENCY_OPTIONS.find(c => c.code === code);
  return found ? found.symbol : code;
}

function formatMoney(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    initial: "Discovery",
    discovery: "Discovery",
    planning: "Planning",
    detailed: "Detailed Planning",
    final: "Final Preparations",
    execution: "Execution",
    event_day: "Event Day",
    post_event: "Post-Event",
    completed: "Completed",
  };
  return labels[phase] || phase;
}

function getPhaseIndex(phase: string): number {
  const phases = ["initial", "discovery", "planning", "detailed", "final", "execution", "event_day", "post_event", "completed"];
  const idx = phases.indexOf(phase);
  return idx >= 0 ? idx : 0;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed": return "bg-green-100 text-green-700 border-green-200";
    case "in_progress": case "active": return "bg-blue-100 text-blue-700 border-blue-200";
    case "planning": return "bg-amber-100 text-amber-700 border-amber-200";
    case "on_hold": return "bg-gray-100 text-gray-600 border-gray-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function EventCard({ event, onSelect }: { event: any; onSelect: (id: string) => void }) {
  const currency = event.currency || "NGN";
  const progress = event.progress?.percentage || 0;

  return (
    <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-[#8B1538] group" onClick={() => onSelect(event.id)}>
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg group-hover:text-[#8B1538] transition-colors">{event.name}</h3>
            <p className="text-sm text-gray-500 capitalize">{event.event_category || event.type}</p>
          </div>
          <Badge className={`text-xs capitalize ${getStatusColor(event.status)}`}>
            {event.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#8B1538]" />
            <span>{new Date(event.start_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#8B1538]" />
            <span>{event.guest_count || 0} guests</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#8B1538]" />
            <span>{event.city}, {event.country}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5 text-[#8B1538]" />
            <span>{formatMoney(Number(event.budget || 0), currency)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Progress</span>
            <span className="font-semibold text-[#8B1538]">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{event.progress?.completedTasks || 0} of {event.progress?.totalTasks || 0} tasks done</span>
            <span className="capitalize">{getPhaseLabel(event.current_phase || "planning")}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          {event.planner_name && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-6 h-6 rounded-full bg-[#8B1538]/10 flex items-center justify-center">
                <User className="w-3 h-3 text-[#8B1538]" />
              </div>
              <span>{event.planner_name}</span>
            </div>
          )}
          <Button variant="ghost" size="sm" className="text-[#8B1538] hover:bg-[#8B1538]/10 gap-1">
            View Details <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EventDetailView({ eventId, onBack, portal }: { eventId: string; onBack: () => void; portal: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState("general");
  const [changeRequestText, setChangeRequestText] = useState("");
  const [changeRequestType, setChangeRequestType] = useState("timeline");

  const { data: eventDetails, isLoading } = useQuery({
    queryKey: ['/api/client/events', eventId, 'details'],
    queryFn: () => fetch(`/api/client/events/${eventId}/details`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()),
  });

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      return apiRequest("POST", `/api/events/${eventId}/notes`, noteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/events', eventId, 'details'] });
      setNoteTitle("");
      setNoteContent("");
      setNoteCategory("general");
      toast({ title: "Note Saved", description: "Your note has been saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
    },
  });

  const submitChangeRequest = useMutation({
    mutationFn: async (data: { type: string; description: string }) => {
      return apiRequest("POST", `/api/events/${eventId}/notes`, {
        content: `[CHANGE REQUEST - ${data.type.toUpperCase()}] ${data.description}`,
        title: `Change Request: ${data.type}`,
        section: "change_request",
        tags: ["change_request", data.type],
        isPrivate: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/events', eventId, 'details'] });
      setChangeRequestText("");
      toast({ title: "Request Submitted", description: "Your change request has been sent to your planner." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit request.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-[#8B1538] rounded-full"></div>
      </div>
    );
  }

  if (!eventDetails?.event) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Event not found</p>
        <Button onClick={onBack} variant="outline" className="mt-4">Go Back</Button>
      </div>
    );
  }

  const event = eventDetails.event;
  const tasks = eventDetails.tasks || [];
  const budgetItems = eventDetails.budgetItems || [];
  const invoices = eventDetails.invoices || [];
  const documents = eventDetails.documents || [];
  const contracts = eventDetails.contracts || [];
  const notes = eventDetails.notes || [];
  const vendors = eventDetails.vendors || [];
  const moodBoardItems = eventDetails.moodBoard || [];
  const progress = eventDetails.progress || {};
  const currency = event.currency || "NGN";

  const approveMoodBoardMutation = useMutation({
    mutationFn: async ({ imageId, status }: { imageId: string; status: string }) => {
      return apiRequest("PATCH", `/api/client/mood-board/${imageId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/events', eventId, 'details'] });
      toast({ title: "Updated", description: "Design proposal status updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const totalBudget = budgetItems.reduce((s: number, b: any) => s + Number(b.estimated_cost || 0), 0);
  const totalSpent = budgetItems.reduce((s: number, b: any) => s + Number(b.actual_cost || 0), 0);
  const budgetProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const phases = ["discovery", "planning", "detailed", "final", "execution"];
  const currentPhaseIdx = getPhaseIndex(event.current_phase || "planning");

  return (
    <div>
      <Button onClick={onBack} variant="ghost" className="mb-4 text-gray-600 hover:text-[#8B1538] gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to All Events
      </Button>

      <div className="bg-gradient-to-r from-[#8B1538] to-[#6b102b] text-white rounded-xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-1">{event.name}</h2>
            <p className="text-white/80 capitalize">{event.event_category || event.type}</p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-white/90 text-sm">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(event.start_date).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {event.guest_count || 0} guests</span>
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {event.city}, {event.country}</span>
            </div>
          </div>
          <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end gap-2">
            <Badge variant="secondary" className="capitalize">{event.status}</Badge>
            <div className="text-sm text-white/90">{progress.percentage || 0}% Complete</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2 overflow-x-auto gap-2">
            {phases.map((phase, idx) => (
              <div key={phase} className="flex items-center gap-1 flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${idx <= currentPhaseIdx ? 'bg-white' : 'bg-white/30'}`} />
                <span className={`text-xs whitespace-nowrap ${idx <= currentPhaseIdx ? 'text-white font-medium' : 'text-white/40'}`}>
                  {getPhaseLabel(phase)}
                </span>
              </div>
            ))}
          </div>
          <Progress value={(currentPhaseIdx / (phases.length - 1)) * 100} className="h-1.5 [&>div]:bg-white/80 bg-white/20" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card className="border-l-4 border-l-[#8B1538]">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs sm:text-sm text-gray-500">Total Budget</span>
              <Wallet className="w-4 h-4 text-[#8B1538]" />
            </div>
            <p className="text-xl font-bold">{formatMoney(totalBudget, currency)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs sm:text-sm text-gray-500">Spent</span>
              <TrendingUp className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-xl font-bold">{formatMoney(totalSpent, currency)}</p>
            <p className="text-xs text-gray-400">{Math.round(budgetProgress)}% used</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs sm:text-sm text-gray-500">Tasks</span>
              <ClipboardList className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold">{progress.completedTasks || 0}/{progress.totalTasks || 0}</p>
            <p className="text-xs text-gray-400">{progress.percentage || 0}% complete</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs sm:text-sm text-gray-500">Your Planner</span>
              <User className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-sm font-bold">{event.planner_name || "Not assigned"}</p>
            {event.planner_email && <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" />{event.planner_email}</p>}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto flex-nowrap h-auto">
          <TabsTrigger value="timeline" className="text-xs py-2 whitespace-nowrap min-w-fit">Timeline</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs py-2 whitespace-nowrap min-w-fit">Budget</TabsTrigger>
          <TabsTrigger value="moodboard" className="text-xs py-2 whitespace-nowrap min-w-fit">Mood Board</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs py-2 whitespace-nowrap min-w-fit">Documents</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs py-2 whitespace-nowrap min-w-fit">Invoices</TabsTrigger>
          <TabsTrigger value="vendors" className="text-xs py-2 whitespace-nowrap min-w-fit">Vendors</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs py-2 whitespace-nowrap min-w-fit">Notes</TabsTrigger>
          <TabsTrigger value="requests" className="text-xs py-2 whitespace-nowrap min-w-fit">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-[#8B1538]" />
                Event Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task: any) => (
                    <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0 mt-1">
                        {task.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                         task.status === 'in_progress' ? <Clock className="w-5 h-5 text-blue-500" /> :
                         <AlertCircle className="w-5 h-5 text-gray-300" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-800">{task.task_name}</h4>
                          <Badge variant="outline" className="text-xs capitalize">{task.phase}</Badge>
                        </div>
                        {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          {task.deadline && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(task.deadline).toLocaleDateString()}</span>}
                          <Badge className={`text-xs ${task.status === 'completed' ? 'bg-green-100 text-green-700' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            {task.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No tasks created yet</p>
                  <p className="text-sm text-gray-400 mt-1">Your planner will set up the timeline soon</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="w-5 h-5 text-[#8B1538]" />
                Budget Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {budgetItems.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-2 px-3 font-semibold text-gray-600">Category</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-600">Allocated</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-600">Spent</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-600">Remaining</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetItems.map((item: any, idx: number) => {
                          const allocated = Number(item.estimated_cost || 0);
                          const spent = Number(item.actual_cost || 0);
                          const remaining = allocated - spent;
                          const pct = allocated > 0 ? (spent / allocated) * 100 : 0;
                          return (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium">{item.category || item.description || 'Uncategorized'}</td>
                              <td className="py-2 px-3 text-right">{formatMoney(allocated, currency)}</td>
                              <td className="py-2 px-3 text-right">{formatMoney(spent, currency)}</td>
                              <td className={`py-2 px-3 text-right ${remaining < 0 ? 'text-red-600 font-medium' : ''}`}>
                                {formatMoney(Math.abs(remaining), currency)}{remaining < 0 ? ' over' : ''}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {spent > allocated ? (
                                  <Badge variant="destructive" className="text-xs">Over</Badge>
                                ) : pct > 80 ? (
                                  <Badge className="bg-orange-100 text-orange-700 text-xs">Caution</Badge>
                                ) : pct > 0 ? (
                                  <Badge className="bg-green-100 text-green-700 text-xs">On Track</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Pending</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 bg-gray-50 font-bold">
                          <td className="py-3 px-3">TOTAL</td>
                          <td className="py-3 px-3 text-right">{formatMoney(totalBudget, currency)}</td>
                          <td className="py-3 px-3 text-right">{formatMoney(totalSpent, currency)}</td>
                          <td className={`py-3 px-3 text-right ${totalBudget - totalSpent < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatMoney(Math.abs(totalBudget - totalSpent), currency)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {budgetProgress > 100 ? <Badge variant="destructive" className="text-xs">Over Budget</Badge> :
                             budgetProgress > 80 ? <Badge className="bg-orange-100 text-orange-700 text-xs">Caution</Badge> :
                             <Badge className="bg-green-100 text-green-700 text-xs">On Track</Badge>}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No budget items yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moodboard">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Image className="w-5 h-5 text-[#8B1538]" />
                Mood Board & Design Proposals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {moodBoardItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {moodBoardItems.map((item: any) => (
                    <div key={item.id} className="border rounded-xl overflow-hidden hover:shadow-lg transition-all">
                      <div className="aspect-video bg-gray-100 relative">
                        {item.image_path ? (
                          <img src={item.image_path} alt={item.description || 'Design proposal'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                        {item.approval_status && (
                          <div className="absolute top-2 right-2">
                            <Badge className={
                              item.approval_status === 'approved' ? 'bg-green-500 text-white' :
                              item.approval_status === 'changes_requested' ? 'bg-orange-500 text-white' :
                              'bg-gray-500 text-white'
                            }>
                              {item.approval_status === 'approved' ? 'Approved' :
                               item.approval_status === 'changes_requested' ? 'Changes Requested' :
                               'Pending Review'}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="font-medium text-gray-800 mb-1">{item.description || 'Untitled Design'}</p>
                        <p className="text-xs text-gray-500 capitalize mb-3">{item.category?.replace(/_/g, ' ') || 'Design'}</p>
                        {item.uploaded_at && (
                          <p className="text-xs text-gray-400 mb-3">Shared {new Date(item.uploaded_at).toLocaleDateString()}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveMoodBoardMutation.mutate({ imageId: item.id, status: 'approved' })}
                            disabled={item.approval_status === 'approved' || approveMoodBoardMutation.isPending}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveMoodBoardMutation.mutate({ imageId: item.id, status: 'changes_requested' })}
                            disabled={item.approval_status === 'changes_requested' || approveMoodBoardMutation.isPending}
                            className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50 text-xs"
                          >
                            <AlertCircle className="w-3 h-3 mr-1" /> Request Changes
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">No Design Proposals Yet</h3>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Your planner will share mood boards, color palettes, and design concepts here for your review and approval.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileCheck className="w-5 h-5 text-[#8B1538]" />
                  Contracts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contracts.length > 0 ? (
                  <div className="space-y-3">
                    {contracts.map((contract: any) => (
                      <div key={contract.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#8B1538]/10 rounded-lg flex items-center justify-center">
                            <FileCheck className="w-5 h-5 text-[#8B1538]" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{contract.title || `Contract #${contract.contract_number}`}</p>
                            <p className="text-xs text-gray-500 capitalize">{contract.status} - {new Date(contract.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Badge className={contract.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} variant="outline">
                          {contract.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No contracts yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FolderOpen className="w-5 h-5 text-[#8B1538]" />
                  Shared Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            {doc.file_type?.includes('image') ?
                              <Image className="w-5 h-5 text-blue-500" /> :
                              <FileText className="w-5 h-5 text-blue-500" />
                            }
                          </div>
                          <div>
                            <p className="font-medium text-sm">{doc.name || doc.file_name}</p>
                            <p className="text-xs text-gray-500">{doc.category} - {new Date(doc.created_at || doc.uploaded_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {doc.file_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4" /></a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No shared documents yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="w-5 h-5 text-[#8B1538]" />
                Invoices & Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Invoice #</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Type</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Amount</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Due Date</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv: any) => (
                        <tr key={inv.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium">{inv.invoice_number}</td>
                          <td className="py-2 px-3 capitalize">{inv.type}</td>
                          <td className="py-2 px-3 text-right font-medium">{formatMoney(Number(inv.amount), inv.currency || currency)}</td>
                          <td className="py-2 px-3">{new Date(inv.due_date).toLocaleDateString()}</td>
                          <td className="py-2 px-3 text-center">
                            <Badge className={
                              inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                              inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }>
                              {inv.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No invoices yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="w-5 h-5 text-[#8B1538]" />
                Assigned Vendors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vendors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vendors.map((vendor: any) => (
                    <div key={vendor.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{vendor.business_name || 'Vendor'}</h4>
                          <p className="text-sm text-gray-500 capitalize">{vendor.vendor_category || vendor.role || 'Service provider'}</p>
                          {vendor.vendor_email && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3" /> {vendor.vendor_email}
                            </p>
                          )}
                          <Badge className={
                            vendor.status === 'confirmed' ? 'bg-green-100 text-green-700 mt-2' :
                            vendor.status === 'pending' ? 'bg-amber-100 text-amber-700 mt-2' :
                            'bg-gray-100 text-gray-600 mt-2'
                          }>
                            {vendor.status || 'assigned'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No vendors assigned yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PenTool className="w-5 h-5 text-[#8B1538]" />
                    Add Note
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="note-title">Title</Label>
                    <Input id="note-title" placeholder="Note title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note-category">Category</Label>
                    <Select value={noteCategory} onValueChange={setNoteCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="budget">Budget</SelectItem>
                        <SelectItem value="venue">Venue</SelectItem>
                        <SelectItem value="catering">Catering</SelectItem>
                        <SelectItem value="decor">Decor & Styling</SelectItem>
                        <SelectItem value="guest">Guest List</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="logistics">Logistics</SelectItem>
                        <SelectItem value="idea">Idea</SelectItem>
                        <SelectItem value="concern">Concern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note-content">Note</Label>
                    <Textarea id="note-content" placeholder="Write your thoughts, ideas, or questions..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={5} />
                  </div>
                  <Button
                    onClick={() => {
                      if (!noteContent.trim()) return;
                      createNoteMutation.mutate({
                        title: noteTitle.trim() || `Note - ${new Date().toLocaleDateString()}`,
                        content: noteContent,
                        section: noteCategory,
                        tags: [noteCategory],
                        isPrivate: false,
                      });
                    }}
                    disabled={!noteContent.trim() || createNoteMutation.isPending}
                    className="w-full bg-[#8B1538] hover:bg-[#a01d45] text-white"
                  >
                    {createNoteMutation.isPending ? "Saving..." : "Save Note"}
                  </Button>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">My Notes & Messages</CardTitle>
                    <Badge variant="outline">{notes.length} notes</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {notes.length > 0 ? (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {notes.map((note: any) => (
                        <div key={note.id} className="p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-800">{note.title}</h4>
                            <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-gray-600 text-sm whitespace-pre-wrap">{note.content}</p>
                          {note.section && <Badge variant="secondary" className="text-xs capitalize mt-2">{note.section}</Badge>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <PenTool className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No notes yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Send className="w-5 h-5 text-[#8B1538]" />
                  Submit a Change Request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Request Type</Label>
                  <Select value={changeRequestType} onValueChange={setChangeRequestType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="timeline">Timeline Change</SelectItem>
                      <SelectItem value="budget">Budget Adjustment</SelectItem>
                      <SelectItem value="vendor">Vendor Change</SelectItem>
                      <SelectItem value="scope">Scope Modification</SelectItem>
                      <SelectItem value="venue">Venue Change</SelectItem>
                      <SelectItem value="catering">Catering Change</SelectItem>
                      <SelectItem value="decor">Decor Change</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={changeRequestText}
                    onChange={(e) => setChangeRequestText(e.target.value)}
                    placeholder="Please describe your request in detail..."
                    rows={4}
                  />
                </div>
                <Button
                  onClick={() => submitChangeRequest.mutate({ type: changeRequestType, description: changeRequestText })}
                  disabled={!changeRequestText.trim() || submitChangeRequest.isPending}
                  className="bg-[#8B1538] hover:bg-[#a01d45] text-white"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {submitChangeRequest.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Previous Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {notes.filter((n: any) => n.section === 'change_request').length > 0 ? (
                  <div className="space-y-3">
                    {notes.filter((n: any) => n.section === 'change_request').map((req: any) => (
                      <div key={req.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{req.title}</h4>
                          <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-600">{req.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No change requests yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ClientDashboard() {
  usePageMeta({ title: "Client Dashboard — Event Perfekt" });

  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: portal, isLoading } = useQuery({
    queryKey: ['/api/client/portal'],
    queryFn: () => fetch('/api/client/portal', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-gray-300 border-t-[#8B1538] rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const summary = portal?.summary || {};
  const events = portal?.events || [];
  const allDocuments = portal?.documents || [];
  const allInvoices = portal?.invoices || [];
  const allContracts = portal?.contracts || [];

  const totalPaid = allInvoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  const totalOutstanding = allInvoices.filter((i: any) => i.status !== 'paid').reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

  if (selectedEventId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center gap-3">
            <img src={eventPerfektLogo} alt="Event Perfekt" className="h-8 w-8 rounded-lg" />
            <span className="font-bold text-[#8B1538]">Event Perfekt</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Client Portal</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-3 sm:p-6">
          <EmailStatusBanner />
          <EventDetailView eventId={selectedEventId} onBack={() => setSelectedEventId(null)} portal={portal} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-[#8B1538] via-[#6b102b] to-[#330311] text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <img src={eventPerfektLogo} alt="Event Perfekt" className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl shadow-lg ring-2 ring-white/20" />
              <div>
                <h1 className="text-xl sm:text-3xl font-bold">Welcome to Your Portal</h1>
                <p className="text-white/70 text-sm mt-1">...making yours perfekt</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {events.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => {
                    openPrintWindow({
                      title: "Client Dashboard — Event Overview",
                      subtitle: `Account: ${events[0]?.company_name || events[0]?.client_name || 'Client'}`,
                      stats: [
                        { label: "Total Events", value: summary.totalEvents || 0 },
                        { label: "Active", value: summary.activeEvents || 0 },
                        { label: "Completed", value: summary.completedEvents || 0 },
                        { label: "Total Budget", value: formatMoney(summary.totalBudget || 0, "NGN") },
                        { label: "Outstanding", value: formatMoney(totalOutstanding, "NGN") },
                      ],
                      columns: [
                        { header: "Event Name", key: "name" },
                        { header: "Type", key: "type", format: (v: any, row: any) => row.event_category || v || '-' },
                        { header: "Date", key: "start_date", format: (v: any) => v ? new Date(v).toLocaleDateString() : '-' },
                        { header: "Guests", key: "guest_count", align: "center" },
                        { header: "Budget", key: "budget", align: "right", format: (v: any, row: any) => formatMoney(Number(v || 0), row.currency || 'NGN') },
                        { header: "Status", key: "status" },
                        { header: "Progress", key: "progress", format: (v: any) => `${v?.percentage || 0}%` },
                      ],
                      rows: events,
                      orientation: "landscape",
                    });
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
              )}
              <div className="text-right">
                <p className="text-white/60 text-sm">Corporate Account</p>
                <p className="text-sm font-medium">{events[0]?.company_name || events[0]?.client_name || 'Your Account'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-white/70" />
                <span className="text-xs text-white/70">Total Events</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold">{summary.totalEvents || 0}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-white/70" />
                <span className="text-xs text-white/70">Active</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold">{summary.activeEvents || 0}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-white/70" />
                <span className="text-xs text-white/70">Completed</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold">{summary.completedEvents || 0}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-white/70" />
                <span className="text-xs text-white/70">Total Budget</span>
              </div>
              <p className="text-sm sm:text-lg font-bold">{formatMoney(summary.totalBudget || 0, "NGN")}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-white/70" />
                <span className="text-xs text-white/70">Outstanding</span>
              </div>
              <p className="text-sm sm:text-lg font-bold">{formatMoney(totalOutstanding, "NGN")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto flex-nowrap bg-white shadow-sm border h-auto">
            <TabsTrigger value="overview" className="gap-2 whitespace-nowrap min-w-fit data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-xs sm:text-sm">
              <LayoutDashboard className="w-4 h-4" /> <span className="hidden sm:inline">Overview</span><span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2 whitespace-nowrap min-w-fit data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-xs sm:text-sm">
              <Calendar className="w-4 h-4" /> <span className="hidden sm:inline">My Events</span><span className="sm:hidden">Events</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2 whitespace-nowrap min-w-fit data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-xs sm:text-sm">
              <FolderOpen className="w-4 h-4" /> Docs
            </TabsTrigger>
            <TabsTrigger value="financials" className="gap-2 whitespace-nowrap min-w-fit data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-xs sm:text-sm">
              <Receipt className="w-4 h-4" /> <span className="hidden sm:inline">Financials</span><span className="sm:hidden">$$</span>
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-2 whitespace-nowrap min-w-fit data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-xs sm:text-sm">
              <Image className="w-4 h-4" /> Photos
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2 whitespace-nowrap min-w-fit data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-xs sm:text-sm">
              <FileCheck className="w-4 h-4" /> <span className="hidden sm:inline">Approvals</span><span className="sm:hidden">Approve</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Account Overview</h2>
                <Badge variant="outline" className="text-[#8B1538] border-[#8B1538]">
                  <Shield className="w-3 h-3 mr-1" /> Corporate Account
                </Badge>
              </div>

              {events.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.slice(0, 3).map((event: any) => (
                      <EventCard key={event.id} event={event} onSelect={setSelectedEventId} />
                    ))}
                  </div>
                  {events.length > 3 && (
                    <div className="text-center">
                      <Button variant="outline" onClick={() => setActiveTab("events")} className="text-[#8B1538] border-[#8B1538] hover:bg-[#8B1538]/10">
                        View All {events.length} Events <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-16">
                    <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 mb-2">Welcome to Event Perfekt</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      Your corporate event portal is ready. Once your planner creates events for you,
                      they will appear here with full details, documents, and financial tracking.
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5 text-[#8B1538]" />
                      Recent Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {allDocuments.length > 0 ? (
                      <div className="space-y-3">
                        {allDocuments.slice(0, 5).map((doc: any) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                <FileText className="w-4 h-4 text-blue-500" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{doc.name || doc.file_name}</p>
                                <p className="text-xs text-gray-400">{doc.event_name} - {doc.category}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-6 text-sm">No shared documents yet</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Receipt className="w-5 h-5 text-[#8B1538]" />
                      Recent Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {allInvoices.length > 0 ? (
                      <div className="space-y-3">
                        {allInvoices.slice(0, 5).map((inv: any) => (
                          <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                inv.status === 'paid' ? 'bg-green-50' : inv.status === 'overdue' ? 'bg-red-50' : 'bg-amber-50'
                              }`}>
                                <Receipt className={`w-4 h-4 ${
                                  inv.status === 'paid' ? 'text-green-500' : inv.status === 'overdue' ? 'text-red-500' : 'text-amber-500'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{inv.invoice_number}</p>
                                <p className="text-xs text-gray-400">{inv.event_name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">{formatMoney(Number(inv.amount), inv.currency || "NGN")}</p>
                              <Badge className={`text-xs ${
                                inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                                inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>{inv.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-6 text-sm">No invoices yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">All Events ({events.length})</h2>
              </div>
              {events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event: any) => (
                    <EventCard key={event.id} event={event} onSelect={setSelectedEventId} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-16">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No events yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">All Documents</h2>
                <Badge variant="outline">{allDocuments.length + allContracts.length} items</Badge>
              </div>

              {allContracts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileCheck className="w-5 h-5 text-[#8B1538]" />
                      Contracts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {allContracts.map((contract: any) => (
                        <div key={contract.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#8B1538]/10 rounded-lg flex items-center justify-center">
                              <FileCheck className="w-5 h-5 text-[#8B1538]" />
                            </div>
                            <div>
                              <p className="font-medium">{contract.title || `Contract #${contract.contract_number}`}</p>
                              <p className="text-xs text-gray-500">{contract.event_name} - {new Date(contract.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Badge className={contract.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                            {contract.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FolderOpen className="w-5 h-5 text-[#8B1538]" />
                    Shared Files
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allDocuments.length > 0 ? (
                    <div className="space-y-3">
                      {allDocuments.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                              {doc.file_type?.includes('image') ?
                                <Image className="w-5 h-5 text-blue-500" /> :
                                <FileText className="w-5 h-5 text-blue-500" />
                              }
                            </div>
                            <div>
                              <p className="font-medium">{doc.name || doc.file_name}</p>
                              <p className="text-xs text-gray-500">{doc.event_name} - {doc.category} - {new Date(doc.created_at || doc.uploaded_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {doc.file_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="w-4 h-4 mr-1" /> View
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No shared documents yet</p>
                      <p className="text-sm text-gray-400 mt-1">Your planner will share relevant documents here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financials">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Financial Overview</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <Card className="border-l-4 border-l-[#8B1538]">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm text-gray-500">Total Invoiced</span>
                      <DollarSign className="w-4 h-4 text-[#8B1538]" />
                    </div>
                    <p className="text-lg sm:text-xl font-bold">{formatMoney(summary.totalInvoiced || 0, "NGN")}</p>
                    <p className="text-xs text-gray-400">{allInvoices.length} invoices</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Paid</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-xl font-bold text-green-700">{formatMoney(totalPaid, "NGN")}</p>
                    <p className="text-xs text-gray-400">{allInvoices.filter((i: any) => i.status === 'paid').length} paid</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Outstanding</span>
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-xl font-bold text-amber-700">{formatMoney(totalOutstanding, "NGN")}</p>
                    <p className="text-xs text-gray-400">{allInvoices.filter((i: any) => i.status === 'pending').length} pending</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Overdue</span>
                      <ArrowUpRight className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-xl font-bold text-red-700">
                      {formatMoney(allInvoices.filter((i: any) => i.status === 'overdue').reduce((s: number, i: any) => s + Number(i.amount || 0), 0), "NGN")}
                    </p>
                    <p className="text-xs text-gray-400">{allInvoices.filter((i: any) => i.status === 'overdue').length} overdue</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Receipt className="w-5 h-5 text-[#8B1538]" />
                    All Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allInvoices.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-2 px-3 font-semibold text-gray-600">Invoice #</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-600">Event</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-600">Type</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600">Amount</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-600">Due Date</th>
                            <th className="text-center py-2 px-3 font-semibold text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allInvoices.map((inv: any) => (
                            <tr key={inv.id} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium">{inv.invoice_number}</td>
                              <td className="py-2 px-3">{inv.event_name || 'N/A'}</td>
                              <td className="py-2 px-3 capitalize">{inv.type}</td>
                              <td className="py-2 px-3 text-right font-medium">{formatMoney(Number(inv.amount), inv.currency || "NGN")}</td>
                              <td className="py-2 px-3">{new Date(inv.due_date).toLocaleDateString()}</td>
                              <td className="py-2 px-3 text-center">
                                <Badge className={
                                  inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                                  inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                }>{inv.status}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No invoices yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {events.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <PieChart className="w-5 h-5 text-[#8B1538]" />
                      Budget by Event
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {events.filter((e: any) => e.budget?.totalBudget > 0).map((event: any) => {
                        const budget = event.budget?.totalBudget || 0;
                        const spent = event.budget?.totalSpent || 0;
                        const pct = budget > 0 ? (spent / budget) * 100 : 0;
                        const eventCurrency = event.currency || "NGN";
                        return (
                          <div key={event.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{event.name}</h4>
                              <span className="text-sm text-gray-500">{Math.round(pct)}% spent</span>
                            </div>
                            <Progress value={Math.min(pct, 100)} className={`h-2 mb-2 ${pct > 100 ? '[&>div]:bg-red-500' : pct > 80 ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`} />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Budget: {formatMoney(budget, eventCurrency)}</span>
                              <span>Spent: {formatMoney(spent, eventCurrency)}</span>
                              <span className={spent > budget ? 'text-red-600 font-medium' : ''}>
                                Remaining: {formatMoney(Math.abs(budget - spent), eventCurrency)}
                                {spent > budget ? ' (over)' : ''}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {events.filter((e: any) => e.budget?.totalBudget > 0).length === 0 && (
                        <p className="text-center text-gray-500 py-6">No budget data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="photos">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Photo Gallery</h2>
              </div>

              {(() => {
                const photos = allDocuments.filter((d: any) => d.file_type?.includes('image'));
                if (photos.length > 0) {
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {photos.map((photo: any) => (
                        <Card key={photo.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
                          <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                            {photo.file_url ? (
                              <img src={photo.file_url} alt={photo.name} className="w-full h-full object-cover" />
                            ) : (
                              <Image className="w-12 h-12 text-gray-300" />
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                              <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                          </div>
                          <CardContent className="p-3">
                            <p className="text-sm font-medium truncate">{photo.name}</p>
                            <p className="text-xs text-gray-400">{photo.event_name}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                }
                return (
                  <Card>
                    <CardContent className="text-center py-16">
                      <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-gray-700 mb-2">No Photos Yet</h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Photos and images shared by your event planner will appear here in a beautiful gallery view.
                      </p>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </TabsContent>

          <TabsContent value="approvals">
            <BudgetApprovalTab token={typeof window !== 'undefined' ? localStorage.getItem('token') : null} toast={toast} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}

function BudgetApprovalTab({ token, toast }: { token: string | null; toast: any }) {
  const queryClient = useQueryClient();
  const [queryTexts, setQueryTexts] = useState<Record<string, string>>({});
  const [openQueryId, setOpenQueryId] = useState<string | null>(null);

  const { data: pendingItems = [], isLoading } = useQuery({
    queryKey: ['/api/client/budget/pending'],
    queryFn: () => fetch('/api/client/budget/pending', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()),
  });

  const approveMutation = useMutation({
    mutationFn: (itemId: string) =>
      fetch(`/api/client/budget/${itemId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Budget item approved", description: "The event manager has been notified." });
      queryClient.invalidateQueries({ queryKey: ['/api/client/budget/pending'] });
    },
    onError: () => toast({ title: "Failed to approve", variant: "destructive" }),
  });

  const queryMutation = useMutation({
    mutationFn: ({ itemId, question }: { itemId: string; question: string }) =>
      fetch(`/api/client/budget/${itemId}/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      }).then(r => r.json()),
    onSuccess: (_data: any, vars: any) => {
      toast({ title: "Query sent", description: "Your question has been sent to the event manager." });
      setOpenQueryId(null);
      setQueryTexts((prev: Record<string, string>) => ({ ...prev, [vars.itemId]: "" }));
      queryClient.invalidateQueries({ queryKey: ['/api/client/budget/pending'] });
    },
    onError: () => toast({ title: "Failed to send query", variant: "destructive" }),
  });

  const { data: designItems = [] } = useQuery({
    queryKey: ['/api/client/design/pending'],
    queryFn: () => fetch('/api/client/design/pending', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()),
  });

  const approveDesignMutation = useMutation({
    mutationFn: (decisionId: string) =>
      fetch(`/api/client/design/${decisionId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Design decision approved" });
      queryClient.invalidateQueries({ queryKey: ['/api/client/design/pending'] });
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Approvals</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Banknote className="w-5 h-5 text-[#8B1538]" />
            Budget Items Awaiting Your Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-400 py-4 text-center">Loading...</p>
          ) : (pendingItems as any[]).length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No budget items pending approval</p>
              <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(pendingItems as any[]).map((item: any) => (
                <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{item.category || item.description || 'Budget Item'}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{item.notes || item.vendor || ''}</p>
                      <div className="flex gap-4 mt-2 text-sm text-gray-600">
                        <span>Allocated: <strong>{formatMoney(Number(item.estimated_cost || 0), item.currency || 'GBP')}</strong></span>
                        {item.event_name && <span>Event: <strong>{item.event_name}</strong></span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white gap-1"
                        onClick={() => approveMutation.mutate(item.id)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-500 text-amber-600 hover:bg-amber-50 gap-1"
                        onClick={() => setOpenQueryId(openQueryId === item.id ? null : item.id)}
                      >
                        <MessageSquare className="w-3 h-3" /> Query
                      </Button>
                    </div>
                  </div>
                  {openQueryId === item.id && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Type your question or concern about this budget item..."
                        value={queryTexts[item.id] || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQueryTexts((prev: Record<string, string>) => ({ ...prev, [item.id]: e.target.value }))}
                        className="min-h-[80px] text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-[#8B1538] hover:bg-[#6d1029]"
                          disabled={!queryTexts[item.id]?.trim() || queryMutation.isPending}
                          onClick={() => queryMutation.mutate({ itemId: item.id, question: queryTexts[item.id] })}
                        >
                          Send Query
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setOpenQueryId(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PenTool className="w-5 h-5 text-[#8B1538]" />
            Design Decisions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(designItems as any[]).length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No design decisions pending</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(designItems as any[]).map((item: any) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-800">{item.title}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                      {item.options && <p className="text-xs text-gray-400 mt-1">Options: {item.options}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => approveDesignMutation.mutate(item.id)}
                      >
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-400 text-red-600 hover:bg-red-50">
                        Request Changes
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
