import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Users,
  Eye,
  Edit,
  FileText,
  DollarSign,
  Calendar,
  Settings,
  UserPlus,
  Mail,
  Bell,
  Download,
  Upload,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock
} from "lucide-react";

type UserRole = 'client' | 'planner' | 'admin' | 'collaborator';

interface Permission {
  name: string;
  icon: any;
  description: string;
  roles: UserRole[];
}

const PERMISSIONS: Permission[] = [
  {
    name: 'view_own_events',
    icon: Eye,
    description: 'View own events and timeline',
    roles: ['client']
  },
  {
    name: 'view_own_budget',
    icon: DollarSign,
    description: 'View budget tracker',
    roles: ['client']
  },
  {
    name: 'request_changes',
    icon: MessageSquare,
    description: 'Submit change requests',
    roles: ['client']
  },
  {
    name: 'view_assigned_events',
    icon: Calendar,
    description: 'View assigned events',
    roles: ['planner', 'collaborator']
  },
  {
    name: 'edit_assigned_events',
    icon: Edit,
    description: 'Edit event details',
    roles: ['planner']
  },
  {
    name: 'manage_budget',
    icon: DollarSign,
    description: 'Manage event budgets',
    roles: ['planner']
  },
  {
    name: 'add_collaborators',
    icon: UserPlus,
    description: 'Add team collaborators',
    roles: ['planner']
  },
  {
    name: 'view_all_events',
    icon: Shield,
    description: 'Global oversight access',
    roles: ['admin']
  },
  {
    name: 'manage_users',
    icon: Users,
    description: 'User management',
    roles: ['admin']
  },
  {
    name: 'system_settings',
    icon: Settings,
    description: 'System configuration',
    roles: ['admin']
  }
];

export default function AccessControlDemo() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [testScenario, setTestScenario] = useState('view_dashboard');
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState('collaborator');

  const getRolePermissions = (role: UserRole) => {
    return PERMISSIONS.filter(perm => perm.roles.includes(role));
  };

  const testAccess = (action: string, role: UserRole) => {
    const hasPermission = getRolePermissions(role).some(perm => perm.name.includes(action));
    return hasPermission;
  };

  const simulateAction = () => {
    const hasAccess = testAccess(testScenario, selectedRole);
    
    if (hasAccess) {
      toast({
        title: "Access Granted",
        description: `${selectedRole} can perform ${testScenario.replace('_', ' ')}`,
      });
    } else {
      toast({
        title: "Access Denied",
        description: `${selectedRole} cannot perform ${testScenario.replace('_', ' ')}`,
        variant: "destructive"
      });
    }
  };

  const addCollaborator = () => {
    if (!collaboratorEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Collaborator Added",
      description: `${collaboratorEmail} added as ${collaboratorRole} with limited event access`,
    });
    setCollaboratorEmail('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#8B1538' }}>
            Role-Based Access Control Demo
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Comprehensive access management for clients, planners, and administrators
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Role Permissions Overview */}
          <div className="lg:col-span-2">
            <Card className="border-2" style={{ borderColor: '#8B1538' }}>
              <CardHeader style={{ backgroundColor: '#8B1538' }}>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Permissions by Role
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="client" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="client">Client</TabsTrigger>
                    <TabsTrigger value="planner">Planner</TabsTrigger>
                    <TabsTrigger value="admin">Admin</TabsTrigger>
                    <TabsTrigger value="collaborator">Collaborator</TabsTrigger>
                  </TabsList>

                  {(['client', 'planner', 'admin', 'collaborator'] as UserRole[]).map((role) => (
                    <TabsContent key={role} value={role} className="mt-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="outline" className="capitalize">
                            {role}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {getRolePermissions(role).length} permissions
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {getRolePermissions(role).map((permission) => {
                            const Icon = permission.icon;
                            return (
                              <div key={permission.name} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4 text-gray-600" />
                                    <span className="font-medium text-sm">
                                      {permission.name.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {permission.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {role === 'client' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                            <h4 className="font-medium text-blue-800 mb-2">Client Dashboard Features</h4>
                            <p className="text-sm text-blue-700 leading-relaxed">
                              View only their own events and data, live budget tracker with real-time updates, timeline visualization with PDF export, secure file sharing and downloads, change request system, direct planner communication, and a mobile-responsive interface.
                            </p>
                          </div>
                        )}

                        {role === 'planner' && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
                            <h4 className="font-medium text-purple-800 mb-2">Planner Capabilities</h4>
                            <p className="text-sm text-purple-700 leading-relaxed">
                              Access to all assigned events, budget and timeline management, vendor coordination and contracts, adding collaborators such as décor lead and coordinators, file management and sharing, client communication tools, and real-time notifications.
                            </p>
                          </div>
                        )}

                        {role === 'admin' && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                            <h4 className="font-medium text-red-800 mb-2">Admin Powers</h4>
                            <p className="text-sm text-red-700 leading-relaxed">
                              Global oversight across all events, user management and role assignments, system configuration and settings, analytics and reporting, white-label customization, and multi-domain management.
                            </p>
                          </div>
                        )}

                        {role === 'collaborator' && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                            <h4 className="font-medium text-orange-800 mb-2">Collaborator Access</h4>
                            <p className="text-sm text-orange-700 leading-relaxed">
                              Limited access to assigned events only, task management within their scope, file uploads for their deliverables, timeline view for coordination, and team communication tools.
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Access Testing & Collaboration */}
          <div className="space-y-6">
            {/* Access Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Test Access Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Test as Role</Label>
                  <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="planner">Planner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="collaborator">Collaborator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Test Action</Label>
                  <Select value={testScenario} onValueChange={setTestScenario}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view_dashboard">View Dashboard</SelectItem>
                      <SelectItem value="edit_budget">Edit Budget</SelectItem>
                      <SelectItem value="add_collaborator">Add Collaborator</SelectItem>
                      <SelectItem value="view_all_events">View All Events</SelectItem>
                      <SelectItem value="manage_users">Manage Users</SelectItem>
                      <SelectItem value="upload_files">Upload Files</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={simulateAction}
                  className="w-full"
                  style={{ backgroundColor: '#8B1538' }}
                >
                  Test Access
                </Button>
              </CardContent>
            </Card>

            {/* Add Collaborators */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Add Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={collaboratorEmail}
                    onChange={(e) => setCollaboratorEmail(e.target.value)}
                    placeholder="team@example.com"
                  />
                </div>

                <div>
                  <Label>Role</Label>
                  <Select value={collaboratorRole} onValueChange={setCollaboratorRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="collaborator">Collaborator</SelectItem>
                      <SelectItem value="planner">Planner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={addCollaborator}
                  className="w-full"
                  variant="outline"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Team Member
                </Button>

                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                  <strong>Common team roles:</strong>
                  <br />• Décor Lead - manage design elements
                  <br />• Day Coordinator - execution oversight  
                  <br />• Vendor Liaison - supplier management
                </div>
              </CardContent>
            </Card>

            {/* Communication Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Welcome Emails</p>
                    <p className="text-xs text-gray-600">Automated portal login details</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded">
                  <Bell className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Real-time Alerts</p>
                    <p className="text-xs text-gray-600">Milestone & vendor updates</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <MessageSquare className="w-5 h-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Change Requests</p>
                    <p className="text-xs text-gray-600">Client feedback system</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile Responsiveness Notice */}
        <Card className="mt-6 bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h3 className="font-semibold text-green-800 mb-2">Mobile-First Design</h3>
                <p className="text-green-700 text-sm mb-3">
                  The entire Event Perfekt platform is built mobile-responsive with:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-700">
                  <div>• Touch-optimized interface</div>
                  <div>• Responsive breakpoints</div>
                  <div>• Mobile file uploads</div>
                  <div>• Swipe navigation</div>
                  <div>• Tablet-friendly layouts</div>
                  <div>• Progressive web app ready</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* White-label Features */}
        <Card className="mt-6 bg-purple-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <h3 className="font-semibold text-purple-800 mb-2">White-Label Capabilities</h3>
                <p className="text-purple-700 text-sm mb-3">
                  Event Perfekt supports full customization:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-purple-700">
                  <div>• Custom domain (portal.eventperfekt.com)</div>
                  <div>• Brand colors and logos</div>
                  <div>• Email template customization</div>
                  <div>• Custom subdomain routing</div>
                  <div>• Multi-tenant architecture</div>
                  <div>• Regional customization</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}