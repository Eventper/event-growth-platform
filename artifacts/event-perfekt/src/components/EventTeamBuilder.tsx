import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, Plus, Trash2, UserCheck, Mail, Briefcase,
  Star, Palette, Camera, Building2, ClipboardList,
  DollarSign, Settings, ChevronDown
} from "lucide-react";

const SPECIALIST_ROLES = [
  { value: "guest_manager", label: "Guest Manager", icon: Users, desc: "Guest lists, RSVP, seating, check-in" },
  { value: "day_coordinator", label: "Day Coordinator", icon: ClipboardList, desc: "Event-day schedule, logistics, vendor arrivals" },
  { value: "decorator", label: "Decorator / Stylist", icon: Palette, desc: "Decor concepts, styling, installation" },
  { value: "graphic_designer", label: "Graphic Designer", icon: Star, desc: "Invitations, signage, branding, digital assets" },
  { value: "vendor_coordinator", label: "Vendor Coordinator", icon: Building2, desc: "Vendor sourcing, contracts, communication" },
  { value: "venue_coordinator", label: "Venue Coordinator", icon: Building2, desc: "Venue liaison, logistics, setup" },
  { value: "finance_support", label: "Finance Support", icon: DollarSign, desc: "Invoicing, expense tracking, payments" },
  { value: "operations_support", label: "Operations Support", icon: Settings, desc: "General operations, logistics support" },
  { value: "photographer", label: "Photographer / Videographer", icon: Camera, desc: "Photo and video coverage" },
  { value: "other", label: "Other", icon: UserCheck, desc: "Custom role" },
];

interface EventTeamBuilderProps {
  eventId: string;
}

export function EventTeamBuilder({ eventId }: EventTeamBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [notes, setNotes] = useState("");

  const { data: team = [], isLoading: teamLoading } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "team"],
    queryFn: () => fetch(`/api/events/${eventId}/team`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()),
  });

  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["/api/users/staff"],
  });

  const addMember = useMutation({
    mutationFn: (data: { userId: string; role: string; notes: string }) =>
      fetch(`/api/events/${eventId}/team`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "team"] });
      setAddOpen(false);
      setSelectedUserId("");
      setSelectedRole("");
      setNotes("");
      toast({ title: "Team member added", description: "They will receive an event brief." });
    },
    onError: () => toast({ title: "Failed to add member", variant: "destructive" }),
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) =>
      fetch(`/api/events/${eventId}/team/${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "team"] });
      toast({ title: "Team member removed" });
    },
  });

  const getRoleInfo = (role: string) => SPECIALIST_ROLES.find(r => r.value === role);

  // Filter out staff already on the team
  const alreadyAdded = team.map((m: any) => m.userId);
  const availableStaff = staff.filter((s: any) => !alreadyAdded.includes(s.id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-[#330311]" />
            Event Team
          </CardTitle>
          <Button
            size="sm"
            className="bg-[#330311] hover:bg-[#4a0418] text-white"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Team Member
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Add specialist team members — each gets role-based access to the tools they need.
        </p>
      </CardHeader>
      <CardContent>
        {teamLoading ? (
          <div className="text-center py-6 text-gray-400 text-sm">Loading team...</div>
        ) : team.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-medium text-sm">No team members yet</p>
            <p className="text-gray-400 text-xs mt-1">Add specialists to work on this event</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add First Team Member
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {team.map((member: any) => {
              const roleInfo = getRoleInfo(member.role);
              const RoleIcon = roleInfo?.icon || UserCheck;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#330311]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <RoleIcon className="h-4 w-4 text-[#330311]" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">{member.userName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{roleInfo?.label || member.role}</span>
                        {member.userEmail && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="flex items-center gap-0.5">
                              <Mail className="h-3 w-3" />
                              {member.userEmail}
                            </span>
                          </>
                        )}
                      </div>
                      {member.notes && (
                        <div className="text-xs text-gray-400 mt-0.5 italic">{member.notes}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs bg-[#330311]/10 text-[#330311] border-0">
                      {roleInfo?.label || member.role}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                      onClick={() => removeMember.mutate(member.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Team Member *</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStaff.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">No available staff</div>
                  ) : (
                    availableStaff.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.jobTitle ? `· ${s.jobTitle}` : ''} ({s.role})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Specialist Role *</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select their role on this event..." />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALIST_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div>
                        <div className="font-medium">{r.label}</div>
                        <div className="text-xs text-gray-500">{r.desc}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific instructions for this team member..."
                rows={2}
              />
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
              Adding a team member sends them the event brief and grants them role-based access to the relevant tools.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#330311] hover:bg-[#4a0418] text-white"
              disabled={!selectedUserId || !selectedRole || addMember.isPending}
              onClick={() => addMember.mutate({ userId: selectedUserId, role: selectedRole, notes })}
            >
              {addMember.isPending ? "Adding..." : "Add to Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
