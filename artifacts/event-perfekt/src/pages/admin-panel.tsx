import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import PlannerSidebar from "@/components/PlannerSidebar";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Users,
  UserPlus,
  UserMinus,
  Search,
  Trash2,
  Edit,
  ShieldAlert,
  Crown,
  Briefcase,
  Calendar,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  UserCog,
  FolderKey,
  History,
  AlertTriangle,
  Plus,
  Mail,
  Phone,
  Building,
  User,
  ShieldCheck,
  ClipboardList,
  Printer,
  Loader2,
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  department?: string;
  job_title?: string;
  status?: string;
  last_login?: string;
  created_at?: string;
}

interface AdminEvent {
  id: string;
  name: string;
  type?: string;
  status?: string;
  planner_id?: string;
  planner_name?: string;
  planner_email?: string;
  start_date?: string;
}

interface StaffAssignment {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  role: string;
  status: string;
  name?: string;
}

interface AccessLog {
  id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
}

interface PermissionsMatrix {
  roles: string[];
  permissions: Record<string, Record<string, string[]>>;
}

const ROLE_CONFIG: Record<string, { label: string; description: string; color: string; icon: any }> = {
  admin: { label: "Account Owner", description: "Full access to all settings, projects, and admin controls", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: Crown },
  planner: { label: "Manager / Planner", description: "Can manage assigned events, invite users, access financials", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: Briefcase },
  staff: { label: "Team Member", description: "Access only to events they are assigned to", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: User },
  collaborator: { label: "Contractor", description: "External freelancer — sees only assigned projects", color: "bg-purple-500/20 text-purple-300 border-purple-500/30", icon: UserCog },
  client: { label: "Client", description: "External client — sees own events and client dashboard only", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", icon: Eye },
};

const PERMISSION_LABELS: Record<string, string> = {
  create: "Create",
  read_all: "View All",
  read_assigned: "View Assigned",
  read_own: "View Own",
  update: "Edit",
  update_assigned: "Edit Assigned",
  update_assigned_limited: "Limited Edit",
  delete: "Delete",
  assign_planner: "Assign Planner",
  assign_staff: "Assign Staff",
  change_role: "Change Roles",
  reset_password: "Reset Passwords",
  suspend: "Suspend Users",
  invoicing: "Invoicing",
  profit_loss: "Profit & Loss",
  financial_dashboard: "Financial Dashboard",
  analytics: "Analytics",
  view_own_invoices: "View Own Invoices",
  manage: "Manage",
  approve: "Approve",
  verify: "Verify",
  view: "View Only",
  access_logs: "Access Logs",
  settings: "System Settings",
  admin_panel: "Admin Panel",
};

const CATEGORY_LABELS: Record<string, { label: string; icon: any }> = {
  events: { label: "Events & Projects", icon: Calendar },
  users: { label: "Identity Management", icon: Users },
  financials: { label: "Financial Access", icon: Briefcase },
  vendors: { label: "Vendor Management", icon: Building },
  system: { label: "System Administration", icon: Shield },
};

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin" || user?.role === "planner";

  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventSearch, setEventSearch] = useState("");

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("staff");
  const [createPhone, setCreatePhone] = useState("");
  const [createDept, setCreateDept] = useState("");
  const [createJobTitle, setCreateJobTitle] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");

  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [staffDialogEvent, setStaffDialogEvent] = useState<AdminEvent | null>(null);

  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<AdminEvent[]>({
    queryKey: ["/api/admin/events"],
    enabled: isAdmin,
  });

  const { data: eventStaff = [] } = useQuery<StaffAssignment[]>({
    queryKey: ["/api/admin/events", staffDialogEvent?.id, "staff"],
    enabled: !!staffDialogEvent,
  });

  const { data: accessLogs = [] } = useQuery<AccessLog[]>({
    queryKey: ["/api/admin/access-logs"],
    enabled: isAdmin,
  });

  const { data: permissionsMatrix } = useQuery<PermissionsMatrix>({
    queryKey: ["/api/admin/permissions"],
    enabled: isAdmin,
  });

  const planners = users.filter((u) => u.role === "planner" || u.role === "admin");
  const assignableUsers = users.filter((u) => u.role === "staff" || u.role === "collaborator" || u.role === "planner");

  const createUserMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/access-logs"] });
      setCreateUserOpen(false);
      setCreateName(""); setCreateEmail(""); setCreatePassword(""); setCreateRole("staff");
      setCreatePhone(""); setCreateDept(""); setCreateJobTitle("");
      toast({ title: "User created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create user", description: err.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiRequest("PATCH", `/api/admin/users/${id}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/access-logs"] });
      toast({ title: "Role updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update role", description: err.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; phone?: string; department?: string; jobTitle?: string }) =>
      apiRequest("PATCH", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/access-logs"] });
      setEditDialogOpen(false);
      toast({ title: "User updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/users/${id}/toggle-status`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/access-logs"] });
      toast({ title: "User status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to toggle status", description: err.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      apiRequest("POST", `/api/admin/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/access-logs"] });
      setResetPasswordOpen(false);
      setNewPassword("");
      toast({ title: "Password reset successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to reset password", description: err.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/access-logs"] });
      setDeleteConfirmId(null);
      toast({ title: "User deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete user", description: err.message, variant: "destructive" });
    },
  });

  const assignPlannerMutation = useMutation({
    mutationFn: ({ eventId, plannerId }: { eventId: string; plannerId: string }) =>
      apiRequest("PATCH", `/api/admin/events/${eventId}/assign`, { plannerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/access-logs"] });
      toast({ title: "Planner assigned" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to assign planner", description: err.message, variant: "destructive" });
    },
  });

  const assignStaffMutation = useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
      apiRequest("POST", `/api/admin/events/${eventId}/assign-staff`, { userId }),
    onSuccess: () => {
      if (staffDialogEvent) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events", staffDialogEvent.id, "staff"] });
      }
      toast({ title: "Team member assigned" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to assign", description: err.message, variant: "destructive" });
    },
  });

  const removeStaffMutation = useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
      apiRequest("DELETE", `/api/admin/events/${eventId}/unassign-staff/${userId}`),
    onSuccess: () => {
      if (staffDialogEvent) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events", staffDialogEvent.id, "staff"] });
      }
      toast({ title: "Team member removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to remove", description: err.message, variant: "destructive" });
    },
  });

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = statusFilter === "all" || (u.status || 'active') === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, userSearch, roleFilter, statusFilter]);

  const filteredEvents = useMemo(() => {
    return events.filter((e: any) => e.name?.toLowerCase().includes(eventSearch.toLowerCase()));
  }, [events, eventSearch]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen">
        <PlannerSidebar />
        <main className="flex-1 lg:ml-60 p-8 bg-gradient-to-br from-[#330311] to-[#2a0209] min-h-screen flex items-center justify-center">
          <div className="text-center text-white/80">
            <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-white/40" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
            <p>This panel is only accessible to account owners and planners.</p>
          </div>
        </main>
      </div>
    );
  }

  const stats = {
    total: users.length,
    active: users.filter(u => (u.status || 'active') === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    admins: users.filter(u => u.role === 'admin').length,
    planners: users.filter(u => u.role === 'planner').length,
    staff: users.filter(u => u.role === 'staff').length,
    collaborators: users.filter(u => u.role === 'collaborator').length,
    clients: users.filter(u => u.role === 'client').length,
    unassignedEvents: events.filter((e: any) => !e.planner_id && !e.planner_name).length,
  };

  const getRoleBadge = (role: string) => ROLE_CONFIG[role]?.color || "bg-gray-500/20 text-gray-300 border-gray-500/30";
  const getRoleLabel = (role: string) => ROLE_CONFIG[role]?.label || role;

  const getStatusBadge = (status: string) => {
    if (status === 'suspended') return "bg-red-500/20 text-red-300 border-red-500/30";
    return "bg-green-500/20 text-green-300 border-green-500/30";
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      create_user: { label: "Created User", color: "text-emerald-400" },
      update_user: { label: "Updated User", color: "text-blue-400" },
      delete_user: { label: "Deleted User", color: "text-red-400" },
      reset_password: { label: "Reset Password", color: "text-amber-400" },
      suspend_user: { label: "Suspended User", color: "text-red-400" },
      activate_user: { label: "Activated User", color: "text-emerald-400" },
    };
    return labels[action] || { label: action, color: "text-white/60" };
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209]">
      <PlannerSidebar />
      <main className="lg:ml-60 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-7 h-7 text-amber-400" />
              Identity & Access Management
            </h1>
            <p className="text-white/50 text-sm mt-1">Manage user identities, roles, permissions, and project access</p>
          </div>
          <div className="flex gap-2">
            {filteredUsers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => openPrintWindow({
                  title: "Identity & Access Management — Users",
                  stats: [
                    { label: "Total Users", value: stats.total },
                    { label: "Active", value: stats.active },
                    { label: "Suspended", value: stats.suspended },
                    { label: "Admins", value: stats.admins },
                    { label: "Planners", value: stats.planners },
                  ],
                  columns: [
                    { header: "Name", key: "name" },
                    { header: "Email", key: "email" },
                    { header: "Role", key: "role", format: (v: string) => getRoleLabel(v) },
                    { header: "Status", key: "status", format: (v: string) => (v || "active").charAt(0).toUpperCase() + (v || "active").slice(1) },
                    { header: "Last Login", key: "last_login", format: (v: string) => formatDate(v) },
                  ],
                  rows: filteredUsers,
                  orientation: "landscape",
                })}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            )}
            <Button onClick={() => setCreateUserOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-medium gap-2">
              <UserPlus className="w-4 h-4" />
              Create User
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <Users className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-white/50 text-xs">Total Users</p>
            <p className="text-white text-xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
            <p className="text-white/50 text-xs">Active</p>
            <p className="text-white text-xl font-bold">{stats.active}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <XCircle className="w-5 h-5 text-red-400 mb-2" />
            <p className="text-white/50 text-xs">Suspended</p>
            <p className="text-white text-xl font-bold">{stats.suspended}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <Crown className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-white/50 text-xs">Owners / Admins</p>
            <p className="text-white text-xl font-bold">{stats.admins}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <Briefcase className="w-5 h-5 text-emerald-400 mb-2" />
            <p className="text-white/50 text-xs">Planners</p>
            <p className="text-white text-xl font-bold">{stats.planners}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <AlertTriangle className="w-5 h-5 text-orange-400 mb-2" />
            <p className="text-white/50 text-xs">Unassigned Events</p>
            <p className="text-white text-xl font-bold">{stats.unassignedEvents}</p>
          </div>
        </div>

        <Tabs defaultValue="identity" className="space-y-6">
          <TabsList className="bg-white/10 border border-white/10 flex-wrap h-auto p-1">
            <TabsTrigger value="identity" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white gap-2">
              <UserCog className="w-4 h-4" />
              Identity Management
            </TabsTrigger>
            <TabsTrigger value="access" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white gap-2">
              <FolderKey className="w-4 h-4" />
              Access Management
            </TabsTrigger>
            <TabsTrigger value="permissions" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white gap-2">
              <ShieldCheck className="w-4 h-4" />
              Permissions Matrix
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white gap-2">
              <History className="w-4 h-4" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          {/* ===== IDENTITY MANAGEMENT ===== */}
          <TabsContent value="identity" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input placeholder="Search by name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/40" />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-44 bg-white/10 border-white/10 text-white">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Account Owner</SelectItem>
                  <SelectItem value="planner">Manager / Planner</SelectItem>
                  <SelectItem value="staff">Team Member</SelectItem>
                  <SelectItem value="collaborator">Contractor</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-white/10 border-white/10 text-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              {usersLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">User</th>
                        <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">Role</th>
                        <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider hidden lg:table-cell">Department</th>
                        <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">Status</th>
                        <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider hidden lg:table-cell">Last Login</th>
                        <th className="text-right text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const RoleIcon = ROLE_CONFIG[u.role]?.icon || User;
                        return (
                          <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                  <RoleIcon className="w-4 h-4 text-white/60" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-medium truncate">{u.name}</p>
                                  <p className="text-white/40 text-xs truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Select value={u.role} onValueChange={(v) => updateRoleMutation.mutate({ id: u.id, role: v })}>
                                  <SelectTrigger className="w-40 h-8 bg-transparent border-white/10 text-xs p-1">
                                    <Badge className={`${getRoleBadge(u.role)} border text-xs`}>{getRoleLabel(u.role)}</Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Account Owner</SelectItem>
                                    <SelectItem value="planner">Manager / Planner</SelectItem>
                                    <SelectItem value="staff">Team Member</SelectItem>
                                    <SelectItem value="collaborator">Contractor</SelectItem>
                                    <SelectItem value="client">Client</SelectItem>
                                  </SelectContent>
                                </Select>
                                {updateRoleMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                              </div>
                            </td>
                            <td className="py-3 px-4 hidden lg:table-cell">
                              <div className="min-w-0">
                                <p className="text-white/70 text-xs truncate">{u.department || "—"}</p>
                                <p className="text-white/40 text-xs truncate">{u.job_title || ""}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={`${getStatusBadge(u.status || 'active')} border text-xs`}>
                                {(u.status || 'active') === 'active' ? 'Active' : 'Suspended'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 hidden lg:table-cell">
                              <span className="text-white/40 text-xs">{u.last_login ? formatDateTime(u.last_login) : "Never"}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10" title="Edit Profile" onClick={() => {
                                  setEditingUser(u);
                                  setEditName(u.name);
                                  setEditPhone(u.phone || "");
                                  setEditDepartment(u.department || "");
                                  setEditJobTitle(u.job_title || "");
                                  setEditDialogOpen(true);
                                }}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white/40 hover:text-amber-400 hover:bg-amber-500/10" title="Reset Password" onClick={() => {
                                  setResetUser(u);
                                  setNewPassword("");
                                  setResetPasswordOpen(true);
                                }}>
                                  <Key className="w-4 h-4" />
                                </Button>
                                {u.id !== user?.id && (
                                  <div className="flex items-center gap-1">
                                    <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 hover:bg-white/10 ${(u.status || 'active') === 'active' ? 'text-white/40 hover:text-orange-400' : 'text-orange-400 hover:text-emerald-400'}`}
                                      title={(u.status || 'active') === 'active' ? 'Suspend User' : 'Activate User'}
                                      onClick={() => toggleStatusMutation.mutate(u.id)}
                                      disabled={toggleStatusMutation.isPending}>
                                      {(u.status || 'active') === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                    </Button>
                                    {toggleStatusMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                                  </div>
                                )}
                                {u.id !== user?.id && (
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10" title="Delete User" onClick={() => { setDeleteConfirmId(u.id); setDeleteConfirmName(u.name); }}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-white/30">No users match your filters</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== ACCESS MANAGEMENT (Event Assignments) ===== */}
          <TabsContent value="access" className="space-y-4">
            <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-2">
              <h3 className="text-white/80 font-medium text-sm mb-1 flex items-center gap-2">
                <FolderKey className="w-4 h-4 text-amber-400" />
                Project Access Rules
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="flex items-start gap-2">
                  <Crown className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white/70 text-xs font-medium">Account Owners</p>
                    <p className="text-white/40 text-xs">See all projects automatically</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white/70 text-xs font-medium">Managers / Planners</p>
                    <p className="text-white/40 text-xs">See only projects assigned to them</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <UserCog className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white/70 text-xs font-medium">Team / Contractors</p>
                    <p className="text-white/40 text-xs">See only projects they are assigned to</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input placeholder="Search events..." value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/40" />
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              {eventsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">Event / Project</th>
                        <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider hidden sm:table-cell">Type</th>
                        <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">Assigned Manager</th>
                        <th className="text-right text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">Team Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((evt: any) => (
                        <tr key={evt.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <p className="text-white font-medium">{evt.name}</p>
                            <p className="text-white/40 text-xs">{evt.start_date ? formatDate(evt.start_date) : "No date set"}</p>
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <Badge className="bg-white/10 text-white/70 border border-white/10 text-xs capitalize">{evt.type || "—"}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Select onValueChange={(v) => assignPlannerMutation.mutate({ eventId: evt.id, plannerId: v })} value={evt.planner_id || undefined}>
                                <SelectTrigger className="w-48 h-9 bg-white/5 border-white/10 text-xs">
                                  {evt.planner_name ? (
                                    <span className="text-emerald-400 flex items-center gap-1">
                                      <Briefcase className="w-3 h-3" />
                                      {evt.planner_name}
                                    </span>
                                  ) : (
                                    <span className="text-red-400 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      Unassigned
                                    </span>
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  {planners.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name} ({getRoleLabel(p.role)})</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            {assignPlannerMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 text-xs gap-1" onClick={() => setStaffDialogEvent(evt)}>
                              <Users className="w-4 h-4" />
                              Manage Team
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {filteredEvents.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-white/30">No events found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== PERMISSIONS MATRIX ===== */}
          <TabsContent value="permissions" className="space-y-4">
            <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-2">
              <h3 className="text-white/80 font-medium text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Role-Based Permissions Reference
              </h3>
              <p className="text-white/40 text-xs mt-1">This matrix shows what each role can access across the platform. Changing a user's role instantly updates their permissions.</p>
            </div>

            {permissionsMatrix && Object.entries(CATEGORY_LABELS).map(([catKey, catInfo]) => {
              const CatIcon = catInfo.icon;
              return (
                <div key={catKey} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                    <h4 className="text-white/80 font-medium text-sm flex items-center gap-2">
                      <CatIcon className="w-4 h-4 text-amber-400" />
                      {catInfo.label}
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-white/50 font-medium py-2 px-4 w-48">Permission</th>
                          {permissionsMatrix.roles.map(role => (
                            <th key={role} className="text-center text-white/50 font-medium py-2 px-3">
                              <Badge className={`${getRoleBadge(role)} border text-[10px]`}>{getRoleLabel(role)}</Badge>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const allPerms = new Set<string>();
                          permissionsMatrix.roles.forEach(role => {
                            const rolePerms = permissionsMatrix.permissions[role]?.[catKey] || [];
                            rolePerms.forEach(p => allPerms.add(p));
                          });
                          return Array.from(allPerms).map(perm => (
                            <tr key={perm} className="border-b border-white/5">
                              <td className="py-2 px-4 text-white/70">{PERMISSION_LABELS[perm] || perm}</td>
                              {permissionsMatrix.roles.map(role => {
                                const has = (permissionsMatrix.permissions[role]?.[catKey] || []).includes(perm);
                                return (
                                  <td key={role} className="py-2 px-3 text-center">
                                    {has ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <XCircle className="w-4 h-4 text-white/10 mx-auto" />}
                                  </td>
                                );
                              })}
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* ===== AUDIT LOG ===== */}
          <TabsContent value="logs" className="space-y-4">
            <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-2">
              <h3 className="text-white/80 font-medium text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Identity & Access Audit Trail
              </h3>
              <p className="text-white/40 text-xs mt-1">All user management actions are logged here for compliance and security review.</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              {accessLogs.length === 0 ? (
                <div className="py-12 text-center text-white/30">
                  <History className="w-10 h-10 mx-auto mb-2 text-white/10" />
                  <p>No audit log entries yet</p>
                  <p className="text-xs mt-1">Actions like creating users, changing roles, and resetting passwords will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">Time</th>
                        <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">Performed By</th>
                        <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">Action</th>
                        <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessLogs.map((log) => {
                        const action = getActionLabel(log.action);
                        return (
                          <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 text-white/40 text-xs whitespace-nowrap">
                              <Clock className="w-3 h-3 inline-block mr-1" />
                              {formatDateTime(log.created_at)}
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-white/80 text-xs font-medium">{log.user_name || "System"}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-xs font-medium ${action.color}`}>{action.label}</span>
                            </td>
                            <td className="py-3 px-4 text-white/50 text-xs max-w-xs truncate" title={log.details}>
                              {log.details || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* === CREATE USER DIALOG === */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="bg-[#1a0508] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-400" />
              Create New User
            </DialogTitle>
            <DialogDescription className="text-white/40">Add a new team member, contractor, or client to the platform.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Full Name *</Label>
                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} className="bg-white/10 border-white/10 text-white mt-1" placeholder="John Doe" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Email Address *</Label>
                <Input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="bg-white/10 border-white/10 text-white mt-1" placeholder="john@company.com" type="email" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Password *</Label>
                <div className="relative">
                  <Input value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} className="bg-white/10 border-white/10 text-white mt-1 pr-10" placeholder="Min 6 characters" type={showCreatePassword ? "text" : "password"} />
                  <button type="button" onClick={() => setShowCreatePassword(!showCreatePassword)} className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-white/40 hover:text-white">
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-white/60 text-xs">Role *</Label>
                <Select value={createRole} onValueChange={setCreateRole}>
                  <SelectTrigger className="bg-white/10 border-white/10 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Account Owner</SelectItem>
                    <SelectItem value="planner">Manager / Planner</SelectItem>
                    <SelectItem value="staff">Team Member</SelectItem>
                    <SelectItem value="collaborator">Contractor</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-white/50 text-xs flex items-center gap-1">
                {(() => { const cfg = ROLE_CONFIG[createRole]; const Icon = cfg?.icon || User; return <><Icon className="w-3 h-3" />{cfg?.description || ""}</>; })()}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Phone</Label>
                <Input value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} className="bg-white/10 border-white/10 text-white mt-1" placeholder="+234..." />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Department</Label>
                <Input value={createDept} onChange={(e) => setCreateDept(e.target.value)} className="bg-white/10 border-white/10 text-white mt-1" placeholder="Operations" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Job Title</Label>
                <Input value={createJobTitle} onChange={(e) => setCreateJobTitle(e.target.value)} className="bg-white/10 border-white/10 text-white mt-1" placeholder="Coordinator" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateUserOpen(false)} className="text-white/60">Cancel</Button>
            <Button onClick={() => createUserMutation.mutate({ name: createName, email: createEmail, password: createPassword, role: createRole, phone: createPhone || undefined, department: createDept || undefined, jobTitle: createJobTitle || undefined })}
              disabled={createUserMutation.isPending || !createName || !createEmail || !createPassword}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium">
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === EDIT USER DIALOG === */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[#1a0508] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-amber-400" />
              Edit User Profile
            </DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white/40" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{editingUser.email}</p>
                  <Badge className={`${getRoleBadge(editingUser.role)} border text-xs mt-1`}>{getRoleLabel(editingUser.role)}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/60 text-xs">Full Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-white/10 border-white/10 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-white/60 text-xs">Phone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="bg-white/10 border-white/10 text-white mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/60 text-xs">Department</Label>
                  <Input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} className="bg-white/10 border-white/10 text-white mt-1" placeholder="e.g. Operations" />
                </div>
                <div>
                  <Label className="text-white/60 text-xs">Job Title</Label>
                  <Input value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} className="bg-white/10 border-white/10 text-white mt-1" placeholder="e.g. Event Coordinator" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-white/60">Cancel</Button>
            <Button onClick={() => { if (editingUser) updateUserMutation.mutate({ id: editingUser.id, name: editName, phone: editPhone, department: editDepartment, jobTitle: editJobTitle }); }}
              disabled={updateUserMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-black">
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === RESET PASSWORD DIALOG === */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="bg-[#1a0508] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Key className="w-5 h-5" />
              Reset Password
            </DialogTitle>
          </DialogHeader>
          {resetUser && (
            <div className="space-y-4">
              <p className="text-white/60 text-sm">Set a new password for <strong className="text-white">{resetUser.name}</strong> ({resetUser.email})</p>
              <div>
                <Label className="text-white/60 text-xs">New Password</Label>
                <div className="relative">
                  <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-white/10 border-white/10 text-white mt-1 pr-10" placeholder="Min 6 characters" type={showResetPassword ? "text" : "password"} />
                  <button type="button" onClick={() => setShowResetPassword(!showResetPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-white/40 hover:text-white">
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetPasswordOpen(false)} className="text-white/60">Cancel</Button>
            <Button onClick={() => { if (resetUser) resetPasswordMutation.mutate({ id: resetUser.id, newPassword }); }}
              disabled={resetPasswordMutation.isPending || newPassword.length < 6} className="bg-amber-500 hover:bg-amber-600 text-black">
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === DELETE CONFIRM DIALOG === */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-[#1a0508] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Delete User
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/70">Are you sure you want to permanently delete <strong className="text-white">{deleteConfirmName}</strong>? This will remove their account, assigned events, and all related data. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="text-white/60">Cancel</Button>
            <Button onClick={() => { if (deleteConfirmId) deleteUserMutation.mutate(deleteConfirmId); }}
              disabled={deleteUserMutation.isPending} className="bg-red-500 hover:bg-red-600 text-white">
              {deleteUserMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === MANAGE TEAM ACCESS DIALOG === */}
      <Dialog open={staffDialogEvent !== null} onOpenChange={() => setStaffDialogEvent(null)}>
        <DialogContent className="bg-[#1a0508] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Team Access — {staffDialogEvent?.name}
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Manage who has access to this project. Team members and contractors can only see projects they are assigned to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/60 text-xs mb-2 block">Add Team Member</Label>
              <div className="flex items-center gap-2">
                <Select onValueChange={(v) => { if (staffDialogEvent) assignStaffMutation.mutate({ eventId: staffDialogEvent.id, userId: v }); }}>
                  <SelectTrigger className="bg-white/10 border-white/10 text-white flex-1">
                    <SelectValue placeholder="Select a team member or contractor..." />
                  </SelectTrigger>
                <SelectContent>
                  {assignableUsers.filter(u => !eventStaff.some(s => s.user_id === u.id)).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        {s.name}
                        <Badge className={`${getRoleBadge(s.role)} border text-[10px] ml-1`}>{getRoleLabel(s.role)}</Badge>
                      </span>
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
                {assignStaffMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
              </div>
            </div>
            <div>
              <Label className="text-white/60 text-xs mb-2 block">Current Team ({eventStaff.length})</Label>
              {eventStaff.length === 0 ? (
                <div className="text-center py-6 text-white/30 bg-white/5 rounded-lg border border-white/10">
                  <UserMinus className="w-8 h-8 mx-auto mb-2 text-white/10" />
                  <p className="text-xs">No team members assigned yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {eventStaff.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 text-white/50" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-medium truncate">{s.user_name || s.name}</p>
                          <p className="text-white/40 text-[10px] truncate">{s.user_email}</p>
                        </div>
                        <Badge className={`${getRoleBadge(s.user_role || 'staff')} border text-[10px] flex-shrink-0`}>{getRoleLabel(s.user_role || 'staff')}</Badge>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                        onClick={() => { if (staffDialogEvent) removeStaffMutation.mutate({ eventId: staffDialogEvent.id, userId: s.user_id }); }}>
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}