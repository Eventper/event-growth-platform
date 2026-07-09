import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Calendar,
  DollarSign,
  FileText,
  Users,
  Clock,
  AlertCircle,
  Download,
  Upload,
  MessageSquare,
  CheckCircle,
  User,
  Mail,
  Phone,
  UserPlus,
  Bell,
  Settings,
  Edit,
  Trash,
  Eye,
  Plus,
  Filter,
  Search,
  MoreVertical
} from "lucide-react";

interface Event {
  id: string;
  name: string;
  eventDate: string;
  guestCount: number;
  budget: string;
  currency: string;
  status: string;
  progress: number;
  client: {
    name: string;
    email: string;
    phone: string;
  };
  collaborators: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    assignedTasks: number;
  }>;
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo: string;
  priority: 'low' | 'medium' | 'high';
  eventId: string;
}

interface ChangeRequest {
  id: string;
  eventId: string;
  clientName: string;
  type: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function PlannerDashboardEnhanced() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [newCollaboratorRole, setNewCollaboratorRole] = useState('collaborator');
  const [filterStatus, setFilterStatus] = useState('all');

  // Get planner's events
  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ['/api/events'],
  });

  // Get tasks for all events
  const { data: allTasks = [] } = useQuery({
    queryKey: ['/api/tasks/upcoming-deadlines'],
    queryFn: () => fetch('/api/tasks/upcoming-deadlines', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.ok ? r.json() : []),
  });

  // Change requests placeholder
  const changeRequests: any[] = [];

  // Get notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: () => fetch('/api/notifications', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.ok ? r.json() : []),
  });

  // Add collaborator mutation
  const addCollaborator = useMutation({
    mutationFn: async (data: { eventId: string; email: string; role: string }) => {
      const response = await apiRequest("POST", `/api/events/${data.eventId}/collaborators`, {
        email: data.email,
        role: data.role,
        permissions: ['view_assigned_events', 'edit_assigned_tasks']
      });
      if (!response.ok) throw new Error("Failed to add collaborator");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Team Member Added",
        description: "Collaborator has been added and notified via email.",
      });
      setNewCollaboratorEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add team member.",
        variant: "destructive"
      });
    }
  });

  // Approve/reject change request mutation
  const handleChangeRequest = useMutation({
    mutationFn: async (data: { requestId: string; action: 'approve' | 'reject'; response?: string }) => {
      const response = await apiRequest("PATCH", `/api/notes/${data.requestId}`, {
        content: `[${data.action.toUpperCase()}] ${data.response || ''}`,
      });
      if (!response.ok) throw new Error("Failed to process change request");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Change Request Processed",
        description: "Client has been notified of your decision.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    }
  });

  // Generate contract mutation
  const generateContract = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest("POST", `/api/events/${eventId}/generate-contract`, {});
      if (!response.ok) throw new Error("Failed to generate contract");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Contract Generated",
        description: "Digital contract is ready for client signature.",
      });
      // Open contract for review
      window.open(data.contractUrl, '_blank');
    }
  });

  // Send milestone update
  const sendMilestoneUpdate = useMutation({
    mutationFn: async (data: { eventId: string; milestone: string; details: string }) => {
      const response = await apiRequest("POST", "/api/notifications/milestone", data);
      if (!response.ok) throw new Error("Failed to send update");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Milestone Update Sent",
        description: "Client has been notified of the progress.",
      });
    }
  });

  // Filter events by status
  const filteredEvents = events.filter((event: Event) => 
    filterStatus === 'all' || event.status === filterStatus
  );

  // Get overdue tasks
  const overdueTasks = allTasks.filter((task: Task) => 
    new Date(task.dueDate) < new Date() && task.status !== 'completed'
  );

  // Get pending change requests
  const pendingRequests = changeRequests.filter((req: ChangeRequest) => req.status === 'pending');

  if (eventsLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-[#8B1538] rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-Optimized Header */}
      <div className="bg-[#8B1538] text-white p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">Planner Dashboard</h1>
              <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-white/90 text-sm lg:text-base">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{events.length} Events</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{overdueTasks.length} Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>{pendingRequests.length} Requests</span>
                </div>
              </div>
            </div>

            {/* Actions and Filter */}
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 lg:items-center">
              <Link href="/vendor-meetings">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Vendor Meetings
                </Button>
              </Link>
              <div className="lg:w-48">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-white text-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Mobile-First Alert Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {overdueTasks.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">Overdue Tasks</p>
                    <p className="text-sm text-red-600">{overdueTasks.length} tasks need attention</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {pendingRequests.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800">Change Requests</p>
                    <p className="text-sm text-yellow-600">{pendingRequests.length} pending review</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Today's Tasks</p>
                  <p className="text-sm text-green-600">
                    {allTasks.filter((t: Task) => new Date(t.dueDate).toDateString() === new Date().toDateString()).length} scheduled
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Mobile Responsive Tabs */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="events" className="text-xs lg:text-sm">Events</TabsTrigger>
            <TabsTrigger value="requests" className="text-xs lg:text-sm">Requests</TabsTrigger>
            <TabsTrigger value="team" className="text-xs lg:text-sm lg:block hidden">Team</TabsTrigger>
            <TabsTrigger value="files" className="text-xs lg:text-sm lg:block hidden">Files</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs lg:text-sm lg:block hidden">Updates</TabsTrigger>
          </TabsList>

          {/* Events Tab - Mobile Optimized */}
          <TabsContent value="events">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {filteredEvents.map((event: Event) => (
                <Card key={event.id} className="border-2 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{event.name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(event.eventDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={
                        event.status === 'completed' ? 'default' :
                        event.status === 'active' ? 'secondary' : 'outline'
                      }>
                        {event.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Event Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Guests:</span>
                        <span>{event.guestCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Budget:</span>
                        <span>{event.currency} {Number(event.budget).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{Math.round(event.progress)}%</span>
                      </div>
                      <Progress value={event.progress} />
                    </div>

                    {/* Client Info */}
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-medium text-sm">{event.client.name}</p>
                      <p className="text-xs text-gray-600">{event.client.email}</p>
                    </div>

                    {/* Collaborators */}
                    {event.collaborators && event.collaborators.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Team ({event.collaborators.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {event.collaborators.slice(0, 3).map((collab) => (
                            <Badge key={collab.id} variant="outline" className="text-xs">
                              {collab.name.split(' ')[0]}
                            </Badge>
                          ))}
                          {event.collaborators.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{event.collaborators.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedEvent(event.id)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm"
                        style={{ backgroundColor: '#8B1538' }}
                        onClick={() => generateContract.mutate(event.id)}
                        disabled={generateContract.isPending}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Contract
                      </Button>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-3 gap-1">
                      <Button size="sm" variant="ghost" className="text-xs">
                        <MessageSquare className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs">
                        <UserPlus className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs">
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Change Requests Tab */}
          <TabsContent value="requests">
            <div className="space-y-4">
              {pendingRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No Pending Requests</h3>
                    <p className="text-gray-500">All change requests have been processed.</p>
                  </CardContent>
                </Card>
              ) : (
                pendingRequests.map((request: ChangeRequest) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2">
                        <div>
                          <CardTitle className="text-lg capitalize">
                            {request.type.replace('_', ' ')} Request
                          </CardTitle>
                          <p className="text-sm text-gray-600">
                            From {request.clientName} • {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary">Pending Review</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded">
                        <p className="text-sm">{request.description}</p>
                      </div>
                      
                      <div className="flex flex-col lg:flex-row gap-2">
                        <Button
                          onClick={() => handleChangeRequest.mutate({ 
                            requestId: request.id, 
                            action: 'approve' 
                          })}
                          disabled={handleChangeRequest.isPending}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleChangeRequest.mutate({ 
                            requestId: request.id, 
                            action: 'reject' 
                          })}
                          disabled={handleChangeRequest.isPending}
                          variant="outline"
                          size="sm"
                        >
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Respond
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Team Management Tab */}
          <TabsContent value="team">
            <div className="space-y-6">
              {/* Add Team Member */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Add Team Member
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>Event</Label>
                      <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event" />
                        </SelectTrigger>
                        <SelectContent>
                          {events.map((event: Event) => (
                            <SelectItem key={event.id} value={event.id}>
                              {event.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        value={newCollaboratorEmail}
                        onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                        placeholder="team@example.com"
                      />
                    </div>
                    
                    <div>
                      <Label>Role</Label>
                      <Select value={newCollaboratorRole} onValueChange={setNewCollaboratorRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="collaborator">Collaborator</SelectItem>
                          <SelectItem value="decor_lead">Décor Lead</SelectItem>
                          <SelectItem value="day_coordinator">Day Coordinator</SelectItem>
                          <SelectItem value="vendor_liaison">Vendor Liaison</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => addCollaborator.mutate({
                      eventId: selectedEvent,
                      email: newCollaboratorEmail,
                      role: newCollaboratorRole
                    })}
                    disabled={!selectedEvent || !newCollaboratorEmail || addCollaborator.isPending}
                    className="bg-[#8B1538] hover:bg-[#7A1230]"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Team Member
                  </Button>
                </CardContent>
              </Card>

              {/* Team Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {events.map((event: Event) => 
                  event.collaborators && event.collaborators.length > 0 && (
                    <Card key={event.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{event.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {event.collaborators.map((collab) => (
                            <div key={collab.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <div>
                                <p className="font-medium text-sm">{collab.name}</p>
                                <p className="text-xs text-gray-600">{collab.email}</p>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {collab.role.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">{collab.assignedTasks}</p>
                                <p className="text-xs text-gray-600">tasks</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle>File Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Secure File System</h3>
                  <p className="text-gray-500 mb-4">
                    Upload and manage files with automatic organization and client access control.
                  </p>
                  <Button style={{ backgroundColor: '#8B1538' }}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Real-time Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No notifications yet</p>
                  ) : (
                    notifications.map((notification: any) => (
                      <div key={notification.id} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-2 h-2 bg-[#8B1538] rounded-full"></div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{notification.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}