import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Copy, Star, FileText, Plus, Trash2, Eye, Download, Calendar, Sparkles, Users, DollarSign, ListChecks, ArrowRight, Printer } from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";

interface TemplateData {
  budgetItems?: any[];
  activities?: any[];
  vendorTypes?: any[];
  serviceNeeds?: any;
  eventType?: string;
  eventCategory?: string;
  currency?: string;
}

interface EventTemplate {
  id: string;
  name: string;
  description: string;
  event_type: string;
  template_data: TemplateData;
  created_by: string;
  is_default: boolean;
  created_at: string;
}

interface Event {
  id: number;
  name: string;
  event_type?: string;
}

export default function EventTemplatesPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [saveFromEventOpen, setSaveFromEventOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EventTemplate | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newEventType, setNewEventType] = useState("private");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [fromEventName, setFromEventName] = useState("");
  const [fromEventDescription, setFromEventDescription] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: templates = [], isLoading } = useQuery<EventTemplate[]>({
    queryKey: ["/api/event-templates"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; eventType: string; templateData: TemplateData }) =>
      apiRequest("POST", "/api/event-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/event-templates"] });
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setNewEventType("private");
      toast({ title: "Template created successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveFromEventMutation = useMutation({
    mutationFn: ({ eventId, name, description }: { eventId: string; name: string; description: string }) =>
      apiRequest("POST", `/api/event-templates/from-event/${eventId}`, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/event-templates"] });
      setSaveFromEventOpen(false);
      setSelectedEventId("");
      setFromEventName("");
      setFromEventDescription("");
      toast({ title: "Template saved from event successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/event-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/event-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleUseTemplate = (template: EventTemplate) => {
    localStorage.setItem("eventTemplate", JSON.stringify(template.template_data));
    localStorage.setItem("eventTemplateName", template.name);
    toast({
      title: "Template loaded!",
      description: `"${template.name}" is ready. Navigating to create event...`,
    });
    setPreviewTemplate(null);
    navigate("/create-event");
  };

  const getItemCounts = (data: TemplateData) => ({
    budget: data?.budgetItems?.length || 0,
    activities: data?.activities?.length || 0,
    vendors: data?.vendorTypes?.length || 0,
  });

  const defaultTemplates = templates.filter((t) => t.is_default);
  const customTemplates = templates.filter((t) => !t.is_default);
  const filteredTemplates =
    activeTab === "default" ? defaultTemplates : activeTab === "custom" ? customTemplates : templates;

  const totalBudgetValue = (data: TemplateData) => {
    if (!data?.budgetItems) return 0;
    return data.budgetItems.reduce((sum: number, item: any) => sum + (parseFloat(item.estimated_cost) || 0), 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209]">
      <PlannerSidebar />
      <main className="lg:ml-60 p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="w-8 h-8" />
              Event Templates
            </h1>
            <p className="text-white/60 mt-1">Manage and reuse event templates to speed up event creation</p>
          </div>
          <div className="flex gap-3">
            {templates.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  openPrintWindow({
                    title: "Event Templates",
                    stats: [
                      { label: "Total Templates", value: templates.length },
                      { label: "Built-in", value: defaultTemplates.length },
                      { label: "Custom", value: customTemplates.length },
                    ],
                    columns: [
                      { header: "Name", key: "name" },
                      { header: "Type", key: "event_type" },
                      { header: "Description", key: "description", format: (v: string) => v || "—" },
                      { header: "Default", key: "is_default", format: (v: boolean) => v ? "Yes" : "No" },
                      { header: "Budget Items", key: "template_data", format: (v: TemplateData) => String(v?.budgetItems?.length || 0) },
                      { header: "Activities", key: "template_data", format: (v: TemplateData) => String(v?.activities?.length || 0) },
                      { header: "Created", key: "created_at", format: (v: string) => new Date(v).toLocaleDateString() },
                    ],
                    rows: filteredTemplates,
                  });
                }}
              >
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
            )}
            <Dialog open={saveFromEventOpen} onOpenChange={setSaveFromEventOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Download className="w-4 h-4 mr-2" />
                  Save from Event
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a0508] border-white/20 text-white">
                <DialogHeader>
                  <DialogTitle>Save Template from Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Select Event</label>
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Choose an event" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a0508] border-white/20">
                        {events.map((event) => (
                          <SelectItem key={event.id} value={String(event.id)} className="text-white">
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Template Name</label>
                    <Input
                      value={fromEventName}
                      onChange={(e) => setFromEventName(e.target.value)}
                      placeholder="Enter template name"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Description</label>
                    <Input
                      value={fromEventDescription}
                      onChange={(e) => setFromEventDescription(e.target.value)}
                      placeholder="Enter description"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>
                  <Button
                    onClick={() => saveFromEventMutation.mutate({ eventId: selectedEventId, name: fromEventName, description: fromEventDescription })}
                    disabled={!selectedEventId || !fromEventName || saveFromEventMutation.isPending}
                    className="w-full bg-[#330311] hover:bg-[#4a0518]"
                  >
                    {saveFromEventMutation.isPending ? "Saving..." : "Save as Template"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#330311] hover:bg-[#4a0518] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a0508] border-white/20 text-white">
                <DialogHeader>
                  <DialogTitle>Create New Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Name</label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Template name"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Description</label>
                    <Input
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Template description"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Event Type</label>
                    <Select value={newEventType} onValueChange={setNewEventType}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a0508] border-white/20">
                        <SelectItem value="private" className="text-white">Private</SelectItem>
                        <SelectItem value="corporate" className="text-white">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => createMutation.mutate({ name: newName, description: newDescription, eventType: newEventType, templateData: { budgetItems: [], activities: [], vendorTypes: [], serviceNeeds: {} } })}
                    disabled={!newName || createMutation.isPending}
                    className="w-full bg-[#330311] hover:bg-[#4a0518]"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Template"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Total Templates</p>
                <p className="text-white text-xl font-bold">{templates.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Built-in Starters</p>
                <p className="text-white text-xl font-bold">{defaultTemplates.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Custom Templates</p>
                <p className="text-white text-xl font-bold">{customTemplates.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Events Available</p>
                <p className="text-white text-xl font-bold">{events.length}</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white/10 border border-white/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#330311] data-[state=active]:text-white text-white/60">
              All ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="default" className="data-[state=active]:bg-[#330311] data-[state=active]:text-white text-white/60">
              Built-in ({defaultTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="custom" className="data-[state=active]:bg-[#330311] data-[state=active]:text-white text-white/60">
              Custom ({customTemplates.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 animate-pulse h-48" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg">No templates found</p>
            <p className="text-white/40 text-sm mt-1">
              {activeTab === "custom" ? "Save an event as a template or create a new one" : "No templates available"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const counts = getItemCounts(template.template_data || {});
              const budgetTotal = totalBudgetValue(template.template_data || {});
              return (
                <div
                  key={template.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/30 transition-all cursor-pointer group"
                  onClick={() => setPreviewTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {template.is_default && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                      <h3 className="text-white font-semibold text-lg leading-tight">{template.name}</h3>
                    </div>
                    <Badge variant="outline" className="text-white/70 border-white/20 text-xs capitalize shrink-0">
                      {template.event_type}
                    </Badge>
                  </div>
                  <p className="text-white/50 text-sm mb-4 line-clamp-2">{template.description || "No description"}</p>

                  <div className="grid grid-cols-3 gap-2 mb-4 min-w-0">
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <DollarSign className="w-3.5 h-3.5 text-green-400 mx-auto mb-1" />
                      <p className="text-white/80 text-xs font-semibold">{counts.budget}</p>
                      <p className="text-white/40 text-[10px]">Budget</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <ListChecks className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                      <p className="text-white/80 text-xs font-semibold">{counts.activities}</p>
                      <p className="text-white/40 text-[10px]">Activities</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Users className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
                      <p className="text-white/80 text-xs font-semibold">{counts.vendors}</p>
                      <p className="text-white/40 text-[10px]">Vendors</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/30 text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(template.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setPreviewTemplate(template)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400/80 hover:text-green-400 hover:bg-white/10" onClick={() => handleUseTemplate(template)}>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                      {!template.is_default && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/60 hover:text-red-400 hover:bg-white/10" onClick={() => deleteMutation.mutate(template.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
          <DialogContent className="bg-[#1a0508] border-white/20 text-white max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewTemplate?.is_default && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                {previewTemplate?.name}
              </DialogTitle>
            </DialogHeader>
            {previewTemplate && (
              <div className="space-y-4 mt-2">
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-white/70 border-white/20 capitalize">{previewTemplate.event_type}</Badge>
                  {previewTemplate.is_default && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Starter Template</Badge>}
                </div>
                <p className="text-white/60 text-sm">{previewTemplate.description || "No description"}</p>

                {previewTemplate.template_data?.budgetItems && previewTemplate.template_data.budgetItems.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-white/80 text-sm font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      Budget Categories ({previewTemplate.template_data.budgetItems.length})
                    </h4>
                    <div className="space-y-2">
                      {previewTemplate.template_data.budgetItems.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-white/70">{item.category}{item.subcategory ? ` - ${item.subcategory}` : ''}</span>
                          {item.estimated_cost && (
                            <span className="text-green-400/80 text-xs font-medium">
                              {Number(item.estimated_cost).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-white/10 mt-3 pt-2 flex justify-between">
                      <span className="text-white/50 text-xs">Estimated Total</span>
                      <span className="text-green-400 text-sm font-bold">
                        {totalBudgetValue(previewTemplate.template_data).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {previewTemplate.template_data?.activities && previewTemplate.template_data.activities.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-white/80 text-sm font-semibold mb-3 flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-blue-400" />
                      Activities ({previewTemplate.template_data.activities.length})
                    </h4>
                    <div className="space-y-1.5">
                      {previewTemplate.template_data.activities.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-white/70">{item.name || item.title || `Activity ${i + 1}`}</span>
                          {item.priority && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                              item.priority === 'high' ? 'text-red-400 border-red-400/30' :
                              item.priority === 'medium' ? 'text-yellow-400 border-yellow-400/30' :
                              'text-white/40 border-white/15'
                            }`}>
                              {item.priority}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewTemplate.template_data?.vendorTypes && previewTemplate.template_data.vendorTypes.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-white/80 text-sm font-semibold mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      Vendor Types ({previewTemplate.template_data.vendorTypes.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {previewTemplate.template_data.vendorTypes.map((item: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-white/60 border-white/15 text-xs">
                          {typeof item === "string" ? item : item.service_type || item.type || item.name || `Vendor ${i + 1}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button onClick={() => handleUseTemplate(previewTemplate)} className="flex-1 bg-[#330311] hover:bg-[#4a0518]">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Use This Template
                  </Button>
                  {!previewTemplate.is_default && (
                    <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => { deleteMutation.mutate(previewTemplate.id); setPreviewTemplate(null); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
