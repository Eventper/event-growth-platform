import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Zap, Plus, Play, Pause, Trash2, Edit, History, Clock,
  Mail, MessageSquare, CheckSquare, AlertTriangle, RefreshCw,
  ArrowRight, Settings, FileText, Copy, Printer, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { openPrintWindow } from "@/lib/printUtils";

type WorkflowRule = {
  id: string;
  eventId: string | null;
  name: string;
  triggerType: string;
  triggerConfig: any;
  actionType: string;
  actionConfig: any;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
};

type WorkflowLog = {
  id: string;
  ruleId: string | null;
  triggeredBy: string | null;
  actionTaken: string | null;
  details: any;
  createdAt: string;
};

const TRIGGER_TYPES = [
  { value: "task_overdue", label: "Task Overdue", icon: AlertTriangle, description: "Fires when a task passes its due date" },
  { value: "task_completed", label: "Task Completed", icon: CheckSquare, description: "Fires when a task is marked complete" },
  { value: "status_changed", label: "Status Changed", icon: RefreshCw, description: "Fires when an item's status changes" },
  { value: "priority_is", label: "Priority Match", icon: AlertTriangle, description: "Fires when priority matches a value" },
  { value: "payment_due", label: "Payment Due", icon: Clock, description: "Fires when a payment is due soon" },
  { value: "guest_rsvp", label: "Guest RSVP", icon: MessageSquare, description: "Fires when a guest RSVPs" },
];

const ACTION_TYPES = [
  { value: "send_email", label: "Send Email", icon: Mail, description: "Send an email notification" },
  { value: "create_task", label: "Create Task", icon: CheckSquare, description: "Create a new task automatically" },
  { value: "notify_team", label: "Notify Team", icon: MessageSquare, description: "Send a team notification" },
  { value: "change_status", label: "Change Status", icon: RefreshCw, description: "Update item status" },
  { value: "assign_to", label: "Assign To", icon: Settings, description: "Assign to a team member" },
  { value: "set_priority", label: "Set Priority", icon: AlertTriangle, description: "Change priority level" },
];

const TEMPLATES = [
  {
    name: "Email when task overdue",
    triggerType: "task_overdue",
    triggerConfig: {},
    actionType: "send_email",
    actionConfig: { subject: "Task Overdue Alert", message: "A task has passed its due date and needs attention." },
  },
  {
    name: "SMS payment reminder",
    triggerType: "payment_due",
    triggerConfig: { daysBefore: 3 },
    actionType: "notify_team",
    actionConfig: { message: "Payment reminder: An invoice is due in 3 days." },
  },
  {
    name: "Create follow-up task after event",
    triggerType: "status_changed",
    triggerConfig: { toStatus: "completed" },
    actionType: "create_task",
    actionConfig: { taskName: "Send post-event thank you emails", phase: "post-event", priority: "medium" },
  },
  {
    name: "Escalate critical tasks",
    triggerType: "priority_is",
    triggerConfig: { priority: "critical" },
    actionType: "notify_team",
    actionConfig: { message: "A critical task requires immediate attention!" },
  },
  {
    name: "Auto-assign RSVP follow-up",
    triggerType: "guest_rsvp",
    triggerConfig: {},
    actionType: "create_task",
    actionConfig: { taskName: "Follow up on guest dietary requirements", phase: "planning", priority: "low", owner: "coordinator" },
  },
];

function getTriggerLabel(type: string) {
  return TRIGGER_TYPES.find(t => t.value === type)?.label || type;
}

function getActionLabel(type: string) {
  return ACTION_TYPES.find(a => a.value === type)?.label || type;
}

function getTriggerIcon(type: string) {
  const t = TRIGGER_TYPES.find(t => t.value === type);
  return t ? t.icon : Zap;
}

function getActionIcon(type: string) {
  const a = ACTION_TYPES.find(a => a.value === type);
  return a ? a.icon : Settings;
}

export default function AutomationPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("rules");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [selectedLogRule, setSelectedLogRule] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formTrigger, setFormTrigger] = useState("");
  const [formAction, setFormAction] = useState("");
  const [formTriggerConfig, setFormTriggerConfig] = useState("{}");
  const [formActionConfig, setFormActionConfig] = useState("{}");

  const { data: rules = [], isLoading: rulesLoading } = useQuery<WorkflowRule[]>({
    queryKey: ["/api/workflow-rules"],
  });

  const { data: allLogs = [], isLoading: logsLoading } = useQuery<WorkflowLog[]>({
    queryKey: ["/api/workflow-rules-log"],
  });

  const { data: ruleLogs = [] } = useQuery<WorkflowLog[]>({
    queryKey: ["/api/workflow-rules", selectedLogRule, "log"],
    enabled: !!selectedLogRule,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/workflow-rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-rules"] });
      toast({ title: "Rule created", description: "Automation rule has been created successfully." });
      resetForm();
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/workflow-rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-rules"] });
      toast({ title: "Rule updated" });
      resetForm();
      setDialogOpen(false);
      setEditingRule(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/workflow-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-rules"] });
      toast({ title: "Rule deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/workflow-rules/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-rules"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFormName("");
    setFormTrigger("");
    setFormAction("");
    setFormTriggerConfig("{}");
    setFormActionConfig("{}");
    setEditingRule(null);
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(rule: WorkflowRule) {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormTrigger(rule.triggerType);
    setFormAction(rule.actionType);
    setFormTriggerConfig(JSON.stringify(rule.triggerConfig || {}, null, 2));
    setFormActionConfig(JSON.stringify(rule.actionConfig || {}, null, 2));
    setDialogOpen(true);
  }

  function applyTemplate(template: typeof TEMPLATES[0]) {
    setFormName(template.name);
    setFormTrigger(template.triggerType);
    setFormAction(template.actionType);
    setFormTriggerConfig(JSON.stringify(template.triggerConfig, null, 2));
    setFormActionConfig(JSON.stringify(template.actionConfig, null, 2));
  }

  function handleSubmit() {
    if (!formName || !formTrigger || !formAction) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    let triggerConfig: any, actionConfig: any;
    try {
      triggerConfig = JSON.parse(formTriggerConfig);
      actionConfig = JSON.parse(formActionConfig);
    } catch {
      toast({ title: "Invalid JSON", description: "Trigger or action configuration is not valid JSON.", variant: "destructive" });
      return;
    }

    const payload = {
      name: formName,
      triggerType: formTrigger,
      triggerConfig,
      actionType: formAction,
      actionConfig,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const displayedLogs = selectedLogRule ? ruleLogs : allLogs;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#16213e] via-[#1a1a2e] to-[#0f3460]">
      <PlannerSidebar />
      <main className="flex-1 lg:ml-60 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Zap className="h-8 w-8 text-amber-400" />
                Automation Workflows
              </h1>
              <p className="text-gray-400 mt-1">Create rules that trigger automatic actions for your events</p>
            </div>
            <div className="flex gap-2">
              {rules.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => openPrintWindow({
                    title: "Automation Workflows",
                    stats: [
                      { label: "Total Rules", value: rules.length },
                      { label: "Active", value: rules.filter(r => r.isActive).length },
                      { label: "Inactive", value: rules.filter(r => !r.isActive).length },
                    ],
                    columns: [
                      { header: "Name", key: "name" },
                      { header: "Trigger", key: "triggerType", format: (v: string) => getTriggerLabel(v) },
                      { header: "Action", key: "actionType", format: (v: string) => getActionLabel(v) },
                      { header: "Status", key: "isActive", format: (v: boolean) => v ? "Active" : "Inactive" },
                      { header: "Created", key: "createdAt", format: (v: string) => v ? format(new Date(v), "MMM d, yyyy") : "—" },
                    ],
                    rows: rules,
                  })}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              )}
              <Button onClick={openCreateDialog} className="bg-[#8B1538] hover:bg-[#6d1029] text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Rule
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/10 border border-white/20">
              <TabsTrigger value="rules" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-gray-300">
                <Settings className="h-4 w-4 mr-2" />
                Rules ({rules.length})
              </TabsTrigger>
              <TabsTrigger value="templates" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-gray-300">
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="logs" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-gray-300">
                <History className="h-4 w-4 mr-2" />
                Execution Log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="space-y-4 mt-4">
              {rulesLoading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400" />
                </div>
              ) : rules.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Zap className="h-16 w-16 text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No automation rules yet</h3>
                    <p className="text-gray-400 mb-6 max-w-md">
                      Create your first automation rule to streamline your event planning workflow.
                      Start from a template or build your own.
                    </p>
                    <div className="flex gap-3">
                      <Button onClick={openCreateDialog} className="bg-[#8B1538] hover:bg-[#6d1029]">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Rule
                      </Button>
                      <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10" onClick={() => setActiveTab("templates")}>
                        Browse Templates
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {rules.map((rule) => {
                    const TriggerIcon = getTriggerIcon(rule.triggerType);
                    const ActionIcon = getActionIcon(rule.actionType);
                    return (
                      <Card key={rule.id} className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                              <Switch
                                checked={rule.isActive}
                                onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, isActive: checked })}
                              />
                              {toggleMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                            </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-white font-semibold truncate">{rule.name}</h3>
                                  <Badge variant={rule.isActive ? "default" : "secondary"} className={rule.isActive ? "bg-emerald-600/80" : "bg-gray-600"}>
                                    {rule.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <TriggerIcon className="h-3.5 w-3.5 text-amber-400" />
                                    {getTriggerLabel(rule.triggerType)}
                                  </span>
                                  <ArrowRight className="h-3.5 w-3.5 text-gray-600" />
                                  <span className="flex items-center gap-1">
                                    <ActionIcon className="h-3.5 w-3.5 text-blue-400" />
                                    {getActionLabel(rule.actionType)}
                                  </span>
                                  {rule.createdAt && (
                                    <>
                                      <span className="text-gray-600">•</span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(rule.createdAt), "MMM d, yyyy")}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-400 hover:text-white hover:bg-white/10"
                                onClick={() => {
                                  setSelectedLogRule(rule.id);
                                  setActiveTab("logs");
                                }}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-400 hover:text-white hover:bg-white/10"
                                onClick={() => openEditDialog(rule)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                                onClick={() => {
                                  if (confirm("Delete this automation rule?")) {
                                    deleteMutation.mutate(rule.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="templates" className="space-y-4 mt-4">
              <p className="text-gray-400">Quick-start with pre-built automation templates. Click to customize and create.</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TEMPLATES.map((template, i) => {
                  const TriggerIcon = getTriggerIcon(template.triggerType);
                  const ActionIcon = getActionIcon(template.actionType);
                  return (
                    <Card key={i} className="bg-white/5 border-white/10 hover:bg-white/[0.08] transition-colors cursor-pointer group">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-400" />
                          {template.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                          <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
                            <TriggerIcon className="h-3 w-3 mr-1" />
                            {getTriggerLabel(template.triggerType)}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-gray-600" />
                          <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
                            <ActionIcon className="h-3 w-3 mr-1" />
                            {getActionLabel(template.actionType)}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-white/20 text-gray-300 hover:bg-[#8B1538] hover:text-white hover:border-[#8B1538]"
                          onClick={() => {
                            applyTemplate(template);
                            setDialogOpen(true);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-2" />
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-semibold">Execution History</h3>
                  {selectedLogRule && (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                      Filtered by rule
                      <button className="ml-2 hover:text-white" onClick={() => setSelectedLogRule(null)}>✕</button>
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-gray-300 hover:bg-white/10"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/workflow-rules-log"] });
                    if (selectedLogRule) queryClient.invalidateQueries({ queryKey: ["/api/workflow-rules", selectedLogRule, "log"] });
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {logsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400" />
                </div>
              ) : displayedLogs.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <History className="h-16 w-16 text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No execution logs</h3>
                    <p className="text-gray-400">When automation rules fire, their execution will be recorded here.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {displayedLogs.map((log) => {
                    const ruleName = rules.find(r => r.id === log.ruleId)?.name;
                    return (
                      <Card key={log.id} className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Play className="h-4 w-4 text-emerald-400" />
                                <span className="text-white font-medium text-sm">{ruleName || "Unknown Rule"}</span>
                              </div>
                              <p className="text-gray-400 text-sm">
                                <span className="text-amber-400">Trigger:</span> {log.triggeredBy || "N/A"}
                              </p>
                              <p className="text-gray-400 text-sm">
                                <span className="text-blue-400">Action:</span> {log.actionTaken || "N/A"}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {log.createdAt ? format(new Date(log.createdAt), "MMM d, yyyy h:mm a") : "—"}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                {editingRule ? "Edit Rule" : "Create Automation Rule"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 mt-2">
              <div>
                <Label className="text-gray-300">Rule Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Email when task overdue"
                  className="bg-white/5 border-white/20 text-white mt-1"
                />
              </div>

              <Separator className="bg-white/10" />

              <div>
                <Label className="text-gray-300 flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Trigger (When...)
                </Label>
                <Select value={formTrigger} onValueChange={setFormTrigger}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Select a trigger" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/20">
                    {TRIGGER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-white hover:bg-white/10">
                        <span className="flex items-center gap-2">
                          <t.icon className="h-4 w-4 text-amber-400" />
                          {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formTrigger && (
                  <p className="text-xs text-gray-500 mt-1">
                    {TRIGGER_TYPES.find(t => t.value === formTrigger)?.description}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-gray-300 text-xs">Trigger Configuration (JSON)</Label>
                <Textarea
                  value={formTriggerConfig}
                  onChange={(e) => setFormTriggerConfig(e.target.value)}
                  className="bg-white/5 border-white/20 text-white font-mono text-xs mt-1"
                  rows={3}
                  placeholder='{"phase": "planning"}'
                />
              </div>

              <Separator className="bg-white/10" />

              <div>
                <Label className="text-gray-300 flex items-center gap-2 mb-2">
                  <Play className="h-4 w-4 text-blue-400" />
                  Action (Then...)
                </Label>
                <Select value={formAction} onValueChange={setFormAction}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Select an action" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/20">
                    {ACTION_TYPES.map((a) => (
                      <SelectItem key={a.value} value={a.value} className="text-white hover:bg-white/10">
                        <span className="flex items-center gap-2">
                          <a.icon className="h-4 w-4 text-blue-400" />
                          {a.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formAction && (
                  <p className="text-xs text-gray-500 mt-1">
                    {ACTION_TYPES.find(a => a.value === formAction)?.description}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-gray-300 text-xs">Action Configuration (JSON)</Label>
                <Textarea
                  value={formActionConfig}
                  onChange={(e) => setFormActionConfig(e.target.value)}
                  className="bg-white/5 border-white/20 text-white font-mono text-xs mt-1"
                  rows={3}
                  placeholder='{"message": "Task needs attention"}'
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-[#8B1538] hover:bg-[#6d1029] text-white"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : editingRule ? (
                    <Edit className="h-4 w-4 mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {editingRule ? "Update Rule" : "Create Rule"}
                </Button>
                <Button
                  variant="outline"
                  className="border-white/20 text-gray-300 hover:bg-white/10"
                  onClick={() => { setDialogOpen(false); resetForm(); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
