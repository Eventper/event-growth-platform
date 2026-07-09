import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, Plus, Edit, Trash2, CheckSquare, MoreHorizontal, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import FileUpload from "@/components/file-upload";
import { api } from "@/lib/api";
import ActivityPlanner from "@/components/ActivityPlanner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, vendorUsers, insertBudgetItemSchema } from "@shared/schema";
import { z } from "zod";
// drizzle-zod produces Zod v4 schemas, so build extensions with the v4 `z`
// to match the v4 ZodObject shape expected by `.extend()`.
import { z as z4 } from "zod/v4";

const taskFormSchema = insertTaskSchema.extend({
  dueDate: z4.string().optional(),
}).omit({ eventId: true });

const vendorFormSchema = z.any();
const budgetFormSchema = insertBudgetItemSchema.omit({ eventId: true });

export default function EventDetails() {
  const [, params] = useRoute("/events/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const eventId = params?.id;

  // Redirect to the full event dashboard — the canonical URL for event management
  useEffect(() => {
    if (eventId) {
      setLocation(`/event-dashboard/${eventId}`, { replace: true });
    }
  }, [eventId]);

  const { data: event, isLoading } = useQuery({
    queryKey: ["/api/events", eventId],
    queryFn: () => api.getEvent(eventId!),
    enabled: !!eventId,
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => api.createTask(eventId!, data),
    onSuccess: () => {
      toast({ title: "Task created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: (data: any) => api.createVendor(eventId!, data),
    onSuccess: () => {
      toast({ title: "Vendor added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
    },
  });

  const createBudgetItemMutation = useMutation({
    mutationFn: (data: any) => api.createBudgetItem(eventId!, data),
    onSuccess: () => {
      toast({ title: "Budget item added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-burgundy-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Event not found</h2>
            <p className="text-gray-600 mb-4">The event you're looking for doesn't exist.</p>
            <Button onClick={() => setLocation("/")}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatBudget = (budget: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(budget));
  };

  const completedTasks = event.tasks?.filter((task: any) => task.completed).length || 0;
  const totalTasks = event.tasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalBudgetUsed = event.budgetItems?.reduce((sum: number, item: any) => 
    sum + parseFloat(item.actualCost || '0'), 0) || 0;
  const budgetUsedPercent = parseFloat(event.budget) > 0 ? 
    Math.round((totalBudgetUsed / parseFloat(event.budget)) * 100) : 0;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-contrast-auto">{event.name}</h2>
                <p className="text-sm text-contrast-auto mt-1">{event.venue} • {formatDate(event.date)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={`
                ${event.status === 'active' ? 'bg-green-800 text-white' : ''}
                ${event.status === 'planning' ? 'bg-burgundy-800 text-white' : ''}
                ${event.status === 'completed' ? 'bg-gray-800 text-white' : ''}
              `}>
                {event.status}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setLocation(`/events/${event.id}/closure`)}>
                <Shield className="h-4 w-4 mr-2" />
                Event Closure
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLocation(`/events/${event.id}/reports`)}>
                <FileText className="h-4 w-4 mr-2" />
                Reports
              </Button>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="flex w-full overflow-x-auto flex-nowrap h-auto gap-1 p-1">
                <TabsTrigger value="overview" className="flex-shrink-0 text-xs sm:text-sm">Overview</TabsTrigger>
                <TabsTrigger value="activities" className="flex-shrink-0 text-xs sm:text-sm">Activities</TabsTrigger>
                <TabsTrigger value="checklist" className="flex-shrink-0 text-xs sm:text-sm">Checklist</TabsTrigger>
                <TabsTrigger value="vendors" className="flex-shrink-0 text-xs sm:text-sm">Vendors</TabsTrigger>
                <TabsTrigger value="budget" className="flex-shrink-0 text-xs sm:text-sm">Budget</TabsTrigger>
                <TabsTrigger value="contracts" className="flex-shrink-0 text-xs sm:text-sm">Contracts</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Hero Image */}
                {event.heroImage && (
                  <div className="relative h-64 rounded-xl overflow-hidden">
                    <img 
                      src={event.heroImage} 
                      alt={event.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Event Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Event Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Calendar className="text-burgundy-600 h-5 w-5" />
                        <span className="text-gray-700">{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <MapPin className="text-burgundy-600 h-5 w-5" />
                        <span className="text-gray-700">{event.venue}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Users className="text-burgundy-600 h-5 w-5" />
                        <span className="text-gray-700">{event.guestCount} guests expected</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <DollarSign className="text-burgundy-600 h-5 w-5" />
                        <span className="text-gray-700">{formatBudget(event.budget)} budget</span>
                      </div>
                      {event.planner && (
                        <div className="flex items-center space-x-3">
                          <div className="w-5 h-5 bg-burgundy-100 rounded-full flex items-center justify-center">
                            <span className="text-burgundy-800 text-xs font-medium">
                              {event.planner.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          </div>
                          <span className="text-gray-700">{event.planner.name} (Lead Planner)</span>
                        </div>
                      )}
                      {event.description && (
                        <div className="pt-2">
                          <p className="text-gray-600">{event.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Progress Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Progress Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">Tasks Completed</span>
                          <span className="text-sm font-medium text-gray-900">{completedTasks}/{totalTasks}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-burgundy-600 h-2 rounded-full" 
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">Budget Used</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatBudget(totalBudgetUsed.toString())} / {formatBudget(event.budget)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gold-500 h-2 rounded-full" 
                            style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activities" className="space-y-6">
                <ActivityPlanner 
                  eventId={eventId!} 
                  eventType={event.eventType || 'wedding'} 
                />
              </TabsContent>

              <TabsContent value="checklist" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Event Checklist</h3>
                  <TaskDialog eventId={eventId!} onSubmit={createTaskMutation.mutate} />
                </div>
                
                <Card>
                  <CardContent className="p-0">
                    {event.tasks?.length > 0 ? (
                      <div className="divide-y">
                        {event.tasks.map((task: any) => (
                          <div key={task.id} className="p-4 flex items-center space-x-3">
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={(checked) => 
                                updateTaskMutation.mutate({ 
                                  id: task.id, 
                                  data: { completed: checked } 
                                })
                              }
                            />
                            <div className="flex-1">
                              <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-sm text-gray-600">{task.description}</p>
                              )}
                              {task.dueDate && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Due: {formatDate(task.dueDate)}
                                </p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No tasks added yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vendors" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Vendors</h3>
                  <VendorDialog eventId={eventId!} onSubmit={createVendorMutation.mutate} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {event.vendors?.map((vendor: any) => (
                    <Card key={vendor.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{vendor.name}</h4>
                          <Badge variant="secondary">{vendor.category}</Badge>
                        </div>
                        {vendor.contact && (
                          <p className="text-sm text-gray-600 mb-2">{vendor.contact}</p>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-burgundy-800">
                            {formatBudget(vendor.cost || '0')}
                          </span>
                          <Badge className={`
                            ${vendor.status === 'confirmed' ? 'bg-green-100 text-green-800' : ''}
                            ${vendor.status === 'pending' ? 'bg-burgundy-100 text-burgundy-800' : ''}
                            ${vendor.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                          `}>
                            {vendor.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-500">No vendors added yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="budget" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Budget Breakdown</h3>
                  <BudgetDialog eventId={eventId!} onSubmit={createBudgetItemMutation.mutate} />
                </div>
                
                <Card>
                  <CardContent className="p-0">
                    {event.budgetItems?.length > 0 ? (
                      <div className="divide-y">
                        {event.budgetItems.map((item: any) => (
                          <div key={item.id} className="p-4 flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">{item.item}</p>
                              <p className="text-sm text-gray-600">{item.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {formatBudget(item.actualCost || item.estimatedCost)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Est: {formatBudget(item.estimatedCost)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No budget items added yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contracts" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Contracts</h3>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contract
                  </Button>
                </div>
                
                <Card>
                  <CardContent className="p-0">
                    {event.contracts?.length > 0 ? (
                      <div className="divide-y">
                        {event.contracts.map((contract: any) => (
                          <div key={contract.id} className="p-4 flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">{contract.title}</p>
                              {contract.signedDate && (
                                <p className="text-sm text-gray-600">
                                  Signed: {formatDate(contract.signedDate)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge className={`
                                ${contract.status === 'signed' ? 'bg-green-100 text-green-800' : ''}
                                ${contract.status === 'pending' ? 'bg-burgundy-100 text-burgundy-800' : ''}
                                ${contract.status === 'expired' ? 'bg-red-100 text-red-800' : ''}
                              `}>
                                {contract.status}
                              </Badge>
                              {contract.filePath && (
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-gray-500">No contracts added yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

// Task Dialog Component
function TaskDialog({ eventId, onSubmit }: { eventId: string; onSubmit: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm({
    // Cast: schema is Zod v4, but @hookform/resolvers 3.10 is typed against Zod v3.
    // Runtime is compatible (resolver only calls .parse); narrow cast bridges the type gap.
    resolver: zodResolver(taskFormSchema as unknown as z.ZodTypeAny),
    defaultValues: {
      title: "",
      description: "",
      completed: false,
      dueDate: "",
      assignedTo: "",
    },
  });

  const handleSubmit = (data: any) => {
    onSubmit(data);
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Send invitations" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Task details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Task</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Vendor Dialog Component
function VendorDialog({ eventId, onSubmit }: { eventId: string; onSubmit: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      category: "",
      contact: "",
      email: "",
      phone: "",
      cost: "",
      status: "pending",
    },
  });

  const handleSubmit = (data: any) => {
    onSubmit(data);
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Vendor</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Delicious Catering" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="Catering" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@catering.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="5000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Vendor</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Budget Dialog Component
function BudgetDialog({ eventId, onSubmit }: { eventId: string; onSubmit: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm({
    // Cast: schema is Zod v4, but @hookform/resolvers 3.10 is typed against Zod v3.
    // Runtime is compatible (resolver only calls .parse); narrow cast bridges the type gap.
    resolver: zodResolver(budgetFormSchema as unknown as z.ZodTypeAny),
    defaultValues: {
      category: "",
      item: "",
      estimatedCost: "",
      actualCost: "",
      paid: false,
    },
  });

  const handleSubmit = (data: any) => {
    onSubmit(data);
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Budget Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Budget Item</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="Catering" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="item"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item</FormLabel>
                    <FormControl>
                      <Input placeholder="Wedding dinner" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Cost</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="5000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="actualCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Cost</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="4800" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Item</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
