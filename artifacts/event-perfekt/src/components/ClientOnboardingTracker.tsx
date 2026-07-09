import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  Calendar, 
  FileText, 
  DollarSign, 
  MapPin, 
  Utensils, 
  Camera, 
  Music, 
  Flower, 
  Phone, 
  Mail,
  MessageSquare,
  Filter,
  Search,
  Plus,
  Edit
} from "lucide-react";

interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  category: 'initial' | 'planning' | 'booking' | 'final';
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  dueDate?: string;
  completedDate?: string;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requirements?: string[];
  clientActions?: string[];
  plannerActions?: string[];
  notes?: string;
}

interface ClientOnboarding {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventId: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  startDate: string;
  currentStage: string;
  overallProgress: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  assignedPlanner: string;
  steps: OnboardingStep[];
  lastActivity: string;
  nextMilestone: string;
  estimatedCompletion: string;
}

const DEFAULT_ONBOARDING_STEPS: Omit<OnboardingStep, 'id'>[] = [
  {
    name: "Initial Consultation",
    description: "First meeting to understand client needs and vision",
    category: 'initial',
    status: 'pending',
    priority: 'high',
    clientActions: ["Share event vision and requirements", "Provide guest count estimate", "Discuss budget range"],
    plannerActions: ["Schedule consultation call", "Prepare welcome packet", "Review client questionnaire"]
  },
  {
    name: "Event Details Finalization",
    description: "Confirm all event specifics and requirements",
    category: 'initial',
    status: 'pending',
    priority: 'high',
    clientActions: ["Finalize guest count", "Confirm event date and time", "Select preferred venue type"],
    plannerActions: ["Document all requirements", "Create event timeline", "Set up client portal access"]
  },
  {
    name: "Budget Planning Session",
    description: "Detailed budget breakdown and approval",
    category: 'planning',
    status: 'pending',
    priority: 'medium',
    clientActions: ["Review budget proposal", "Approve budget allocations", "Sign budget agreement"],
    plannerActions: ["Prepare detailed budget breakdown", "Present cost options", "Create payment schedule"]
  },
  {
    name: "Venue Selection",
    description: "Choose and book event venue",
    category: 'planning',
    status: 'pending',
    priority: 'high',
    clientActions: ["Review venue options", "Visit shortlisted venues", "Make final venue decision"],
    plannerActions: ["Research venue options", "Schedule venue tours", "Negotiate venue contracts"]
  },
  {
    name: "Vendor Coordination",
    description: "Select and book key vendors (catering, entertainment, etc.)",
    category: 'booking',
    status: 'pending',
    priority: 'medium',
    clientActions: ["Review vendor proposals", "Attend vendor meetings", "Approve vendor selections"],
    plannerActions: ["Source vendor options", "Coordinate vendor meetings", "Manage vendor contracts"]
  },
  {
    name: "Design & Decor Planning",
    description: "Finalize event design theme and decorative elements",
    category: 'planning',
    status: 'pending',
    priority: 'medium',
    clientActions: ["Review design concepts", "Provide design feedback", "Approve final design"],
    plannerActions: ["Create design concepts", "Source decor items", "Coordinate with design team"]
  },
  {
    name: "Menu Selection",
    description: "Choose catering menu and dietary accommodations",
    category: 'booking',
    status: 'pending',
    priority: 'medium',
    clientActions: ["Review menu options", "Conduct food tasting", "Finalize menu selections"],
    plannerActions: ["Coordinate with caterers", "Schedule food tastings", "Document dietary requirements"]
  },
  {
    name: "Entertainment Booking",
    description: "Select and confirm entertainment options",
    category: 'booking',
    status: 'pending',
    priority: 'low',
    clientActions: ["Review entertainment options", "Approve entertainment selection", "Provide music preferences"],
    plannerActions: ["Source entertainment options", "Coordinate entertainment contracts", "Plan entertainment schedule"]
  },
  {
    name: "Final Details Review",
    description: "Review all arrangements and timeline",
    category: 'final',
    status: 'pending',
    priority: 'high',
    clientActions: ["Review final timeline", "Approve seating arrangements", "Confirm all details"],
    plannerActions: ["Prepare final timeline", "Coordinate final confirmations", "Brief event day team"]
  },
  {
    name: "Event Day Coordination",
    description: "Execute the event and handle day-of coordination",
    category: 'final',
    status: 'pending',
    priority: 'urgent',
    clientActions: ["Arrive on time", "Handle last-minute requests", "Enjoy the event"],
    plannerActions: ["Oversee event setup", "Coordinate vendors", "Manage event timeline"]
  }
];

interface ClientOnboardingTrackerProps {
  clientOnboardings?: ClientOnboarding[];
  onUpdateStep?: (clientId: string, stepId: string, updates: Partial<OnboardingStep>) => void;
  onAddNote?: (clientId: string, stepId: string, note: string) => void;
  onContactClient?: (clientId: string, method: 'email' | 'phone' | 'message') => void;
}

export function ClientOnboardingTracker({ 
  clientOnboardings = [], 
  onUpdateStep, 
  onAddNote, 
  onContactClient 
}: ClientOnboardingTrackerProps) {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');

  // Sample data for demonstration
  const sampleOnboardings: ClientOnboarding[] = [
    {
      id: 'client-1',
      clientName: 'Sarah Johnson',
      clientEmail: 'sarah.johnson@email.com',
      clientPhone: '[PHONE REMOVED]',
      eventId: 'event-1',
      eventName: 'Johnson Wedding',
      eventType: 'Wedding',
      eventDate: '2024-09-15',
      startDate: '2024-02-01',
      currentStage: 'Budget Planning Session',
      overallProgress: 30,
      priority: 'high',
      status: 'active',
      assignedPlanner: 'Emma Wilson',
      lastActivity: '2024-02-05',
      nextMilestone: 'Budget approval by 2024-02-10',
      estimatedCompletion: '2024-08-15',
      steps: DEFAULT_ONBOARDING_STEPS.map((step, index) => ({
        ...step,
        id: `step-${index}`,
        status: index < 3 ? 'completed' : index === 3 ? 'in-progress' : 'pending',
        completedDate: index < 3 ? '2024-02-0' + (index + 2) : undefined,
        dueDate: index === 3 ? '2024-02-10' : undefined
      }))
    },
    {
      id: 'client-2',
      clientName: 'TechCorp Inc.',
      clientEmail: 'events@techcorp.com',
      clientPhone: '[PHONE REMOVED]',
      eventId: 'event-2',
      eventName: 'Annual Conference',
      eventType: 'Corporate',
      eventDate: '2024-06-20',
      startDate: '2024-01-15',
      currentStage: 'Venue Selection',
      overallProgress: 45,
      priority: 'medium',
      status: 'active',
      assignedPlanner: 'Michael Chen',
      lastActivity: '2024-02-04',
      nextMilestone: 'Venue confirmation by 2024-02-08',
      estimatedCompletion: '2024-05-20',
      steps: DEFAULT_ONBOARDING_STEPS.map((step, index) => ({
        ...step,
        id: `step-${index}`,
        status: index < 4 ? 'completed' : index === 4 ? 'in-progress' : 'pending',
        completedDate: index < 4 ? '2024-01-' + (15 + index * 3) : undefined,
        dueDate: index === 4 ? '2024-02-08' : undefined
      }))
    }
  ];

  const activeOnboardings = clientOnboardings.length > 0 ? clientOnboardings : sampleOnboardings;

  const filteredClients = activeOnboardings.filter(client => {
    const matchesSearch = client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.eventName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    const matchesStage = filterStage === 'all' || client.currentStage.toLowerCase().includes(filterStage.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesStage;
  });

  const selectedClientData = selectedClient ? activeOnboardings.find(c => c.id === selectedClient) : null;

  const getStatusIcon = (status: OnboardingStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'blocked':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: OnboardingStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'blocked':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-burgundy-500';
      case 'medium':
        return 'bg-burgundy-800/30';
      default:
        return 'bg-green-500';
    }
  };

  const updateStepStatus = (stepId: string, newStatus: OnboardingStep['status']) => {
    if (selectedClient && onUpdateStep) {
      onUpdateStep(selectedClient, stepId, { 
        status: newStatus,
        completedDate: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : undefined
      });
    }
  };

  const addStepNote = (stepId: string) => {
    if (selectedClient && onAddNote && newNote.trim()) {
      onAddNote(selectedClient, stepId, newNote.trim());
      setNewNote('');
      setEditingStep(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center space-x-3">
            <User className="w-8 h-8" />
            <div>
              <div>Client Onboarding Tracker</div>
              <div className="text-sm font-normal opacity-90">Monitor Client Progress Through Event Planning</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white/20 rounded-lg p-4">
              <User className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">{activeOnboardings.length} Active Clients</div>
              <div className="text-sm opacity-90">Currently onboarding</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <CheckCircle className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">
                {activeOnboardings.reduce((acc, client) => 
                  acc + client.steps.filter(step => step.status === 'completed').length, 0
                )} Completed Steps
              </div>
              <div className="text-sm opacity-90">Across all clients</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <Clock className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">
                {activeOnboardings.reduce((acc, client) => 
                  acc + client.steps.filter(step => step.status === 'in-progress').length, 0
                )} In Progress
              </div>
              <div className="text-sm opacity-90">Active tasks</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">
                {activeOnboardings.filter(client => client.priority === 'urgent' || client.priority === 'high').length} High Priority
              </div>
              <div className="text-sm opacity-90">Need attention</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-1">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Active Clients</span>
              </CardTitle>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStage} onValueChange={setFilterStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      <SelectItem value="initial">Initial</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="booking">Booking</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {filteredClients.map((client) => (
                <Card 
                  key={client.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedClient === client.id ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''
                  }`}
                  onClick={() => setSelectedClient(client.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-sm">{client.clientName}</h3>
                        <p className="text-xs text-gray-600">{client.eventName}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(client.priority)}`}></div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{client.overallProgress}%</span>
                      </div>
                      <Progress value={client.overallProgress} className="h-2" />
                      
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="outline" className="text-xs">
                          {client.eventType}
                        </Badge>
                        <span className="text-gray-500">
                          {new Date(client.eventDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Client Details */}
        <div className="lg:col-span-2">
          {selectedClientData ? (
            <div className="space-y-6">
              {/* Client Info */}
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <User className="w-5 h-5" />
                      <span>{selectedClientData.clientName}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onContactClient?.(selectedClientData.id, 'email')}
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onContactClient?.(selectedClientData.id, 'phone')}
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onContactClient?.(selectedClientData.id, 'message')}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Event: {selectedClientData.eventName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Type: {selectedClientData.eventType}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Planner: {selectedClientData.assignedPlanner}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Overall Progress</span>
                          <span className="font-medium">{selectedClientData.overallProgress}%</span>
                        </div>
                        <Progress value={selectedClientData.overallProgress} className="h-3" />
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Next Milestone: </span>
                        <span className="font-medium">{selectedClientData.nextMilestone}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Onboarding Steps */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Onboarding Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedClientData.steps.map((step, index) => (
                      <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start space-x-3">
                            {getStatusIcon(step.status)}
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm">{step.name}</h3>
                              <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={`text-xs ${getStatusColor(step.status)}`}>
                              {step.status.replace('-', ' ')}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {step.category}
                            </Badge>
                          </div>
                        </div>

                        {step.status !== 'completed' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                            {step.clientActions && step.clientActions.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-gray-700 mb-2">Client Actions:</h4>
                                <ul className="space-y-1">
                                  {step.clientActions.map((action, actionIndex) => (
                                    <li key={actionIndex} className="flex items-start space-x-2">
                                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                      <span className="text-gray-600">{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {step.plannerActions && step.plannerActions.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-gray-700 mb-2">Planner Actions:</h4>
                                <ul className="space-y-1">
                                  {step.plannerActions.map((action, actionIndex) => (
                                    <li key={actionIndex} className="flex items-start space-x-2">
                                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                                      <span className="text-gray-600">{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        <Separator className="my-3" />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {step.status !== 'completed' && (
                              <Select 
                                value={step.status} 
                                onValueChange={(value: any) => updateStepStatus(step.id, value)}
                              >
                                <SelectTrigger className="w-32 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in-progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="blocked">Blocked</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            
                            {step.dueDate && (
                              <Badge variant="outline" className="text-xs">
                                Due: {new Date(step.dueDate).toLocaleDateString()}
                              </Badge>
                            )}
                            
                            {step.completedDate && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                Completed: {new Date(step.completedDate).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingStep(editingStep === step.id ? null : step.id)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Add Note
                          </Button>
                        </div>

                        {editingStep === step.id && (
                          <div className="mt-3 space-y-2">
                            <Textarea
                              placeholder="Add a note about this step..."
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              className="text-sm"
                              rows={2}
                            />
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                onClick={() => addStepNote(step.id)}
                                disabled={!newNote.trim()}
                              >
                                Save Note
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingStep(null);
                                  setNewNote('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="shadow-lg h-96 flex items-center justify-center">
              <CardContent className="text-center">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Select a Client</h3>
                <p className="text-gray-500">Choose a client from the list to view their onboarding progress</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}