import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Clock, Plus, Filter, Calendar, BarChart3, Eye, Save, Trash2, Edit3, Repeat, ChevronDown, ChevronRight, Flag, Link2, ListTree, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ActivityTemplate, SavedActivityView } from '@shared/schema';
import TaskDetailPanel from './TaskDetailPanel';

interface ActivityPlannerProps {
  eventId: string;
  eventType?: string;
}

/**
 * Runtime shape of an activity as returned by /api/events/:id/activities and
 * accepted by the activity create/update endpoints. This is intentionally a
 * superset of the Drizzle `activities` select type: the planner API exposes the
 * full planning model (phase, owner, priority, recurrence, sub-tasks, ...) which
 * is not reflected in the shared DB schema. Typed locally so the component is
 * checked against what it actually reads/writes rather than the stale select shape.
 */
interface PlannerActivity {
  id: number;
  eventId: string;
  taskName: string;
  description: string | null;
  status: string;
  phase: string;
  priority: string;
  owner: string | null;
  deadline: string | Date | null;
  subtaskOf: number | null;
  isMilestone: boolean | null;
  recurrenceType: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

const PHASES = [
  { value: 'planning', label: 'Planning Phase', color: 'bg-blue-500' },
  { value: 'design', label: 'Design Phase', color: 'bg-purple-500' },
  { value: 'vendor_coordination', label: 'Vendor Coordination', color: 'bg-orange-500' },
  { value: 'pre_event', label: 'Pre-Event Phase', color: 'bg-yellow-500' },
  { value: 'execution', label: 'Event Execution', color: 'bg-green-500' },
  { value: 'post_event', label: 'Post-Event Phase', color: 'bg-gray-500' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-600' },
  { value: 'in_progress', label: 'In Progress', icon: AlertCircle, color: 'text-blue-600' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-600' },
  { value: 'blocked', label: 'Blocked', icon: AlertCircle, color: 'text-red-600' },
];

export default function ActivityPlanner({ eventId, eventType = 'wedding' }: ActivityPlannerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<PlannerActivity | null>(null);
  const [newActivity, setNewActivity] = useState<Partial<PlannerActivity>>({});
  const [viewName, setViewName] = useState('');
  const [expandedActivityId, setExpandedActivityId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Queries
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<PlannerActivity[]>({
    queryKey: [`/api/events/${eventId}/activities`],
  });

  const { data: templates = [] } = useQuery({
    queryKey: [`/api/activity-templates`],
  });

  const { data: phaseSignoffs = [] } = useQuery<Array<{ phase: string }>>({
    queryKey: [`/api/events/${eventId}/phase-signoffs`],
  });

  const { data: savedViews = [] } = useQuery({
    queryKey: [`/api/saved-activity-views`],
  });

  // Mutations
  const createActivityMutation = useMutation({
    mutationFn: (data: Partial<PlannerActivity>) => apiRequest('POST', '/api/activities', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/activities`] });
      setIsCreateModalOpen(false);
      setNewActivity({});
      toast({ title: 'Activity created successfully' });
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<PlannerActivity>) =>
      apiRequest('PATCH', `/api/activities/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/activities`] });
      setEditingActivity(null);
      toast({ title: 'Activity updated successfully' });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/activities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/activities`] });
      toast({ title: 'Activity deleted successfully' });
    },
  });

  const instantiateActivitiesMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/events/${eventId}/instantiate-activities`, { eventType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/activities`] });
      toast({ title: 'Default activities created successfully' });
    },
  });

  const createPhaseSignoffMutation = useMutation({
    mutationFn: (data: { eventId: string; phase: string; notes?: string }) =>
      apiRequest('POST', '/api/phase-signoffs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/phase-signoffs`] });
      toast({ title: 'Phase signed off successfully' });
    },
  });

  const saveViewMutation = useMutation({
    mutationFn: (data: { name: string; viewConfig: any }) =>
      apiRequest('POST', '/api/saved-activity-views', {
        name: data.name,
        eventId,
        viewType: 'filtered',
        viewConfig: data.viewConfig,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/saved-activity-views`] });
      setViewName('');
      toast({ title: 'View saved successfully' });
    },
  });

  // Computed values
  const filteredActivities = activities.filter((activity: PlannerActivity) => {
    if (filterPhase !== 'all' && activity.phase !== filterPhase) return false;
    if (filterStatus !== 'all' && activity.status !== filterStatus) return false;
    return true;
  });

  const phaseProgress = PHASES.map(phase => {
    const phaseActivities = activities.filter((a: PlannerActivity) => a.phase === phase.value);
    const completed = phaseActivities.filter((a: PlannerActivity) => a.status === 'completed').length;
    const total = phaseActivities.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isSignedOff = phaseSignoffs.some((s) => s.phase === phase.value);
    
    return {
      ...phase,
      completed,
      total,
      percentage,
      isSignedOff,
    };
  });

  const overallProgress = activities.length > 0 ? 
    Math.round((activities.filter((a: PlannerActivity) => a.status === 'completed').length / activities.length) * 100) : 0;

  const handleCreateActivity = () => {
    createActivityMutation.mutate({
      ...newActivity,
      eventId,
      status: 'pending',
    });
  };

  const handleUpdateActivity = (id: number, updates: Partial<PlannerActivity>) => {
    updateActivityMutation.mutate({ id, ...updates });
  };

  const handleInstantiateActivities = () => {
    instantiateActivitiesMutation.mutate();
  };

  const handlePhaseSignoff = (phase: string) => {
    createPhaseSignoffMutation.mutate({
      eventId,
      phase,
      notes: `Phase ${phase} completed and signed off`,
    });
  };

  const handleSaveView = () => {
    if (!viewName.trim()) {
      toast({ title: 'Error', description: 'Please enter a view name', variant: 'destructive' });
      return;
    }

    saveViewMutation.mutate({
      name: viewName,
      viewConfig: {
        filterPhase,
        filterStatus,
        activeTab,
      },
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activity Planner</h2>
          <p className="text-gray-600">Manage and track event planning activities</p>
        </div>
        
        <div className="flex items-center gap-3">
          {activities.length === 0 && (
            <Button 
              onClick={handleInstantiateActivities}
              disabled={instantiateActivitiesMutation.isPending}
              className="bg-[#330311] text-white"
              data-testid="button-instantiate-activities"
            >
              Create Default Activities
            </Button>
          )}
          
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#330311] text-white"
            data-testid="button-create-activity"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Activity
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card data-testid="card-progress-overview">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span>Event Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" data-testid="progress-overall" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {phaseProgress.map(phase => (
              <div key={phase.value} className="p-4 border rounded-lg" data-testid={`phase-progress-${phase.value}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${phase.color}`} />
                    <span className="font-medium text-sm">{phase.label}</span>
                  </div>
                  {phase.isSignedOff && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Signed Off
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  {phase.completed} of {phase.total} completed
                </div>
                <Progress value={phase.percentage} className="h-1" />
                
                {phase.percentage === 100 && !phase.isSignedOff && phase.total > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 text-xs"
                    onClick={() => handlePhaseSignoff(phase.value)}
                    disabled={createPhaseSignoffMutation.isPending}
                    data-testid={`button-signoff-${phase.value}`}
                  >
                    Sign Off Phase
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="by-phase" data-testid="tab-by-phase">By Phase</TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <Filter className="w-4 h-4 text-gray-600" />
          
          <Select value={filterPhase} onValueChange={setFilterPhase}>
            <SelectTrigger className="w-48" data-testid="select-filter-phase">
              <SelectValue placeholder="Filter by phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              {PHASES.map(phase => (
                <SelectItem key={phase.value} value={phase.value}>
                  {phase.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48" data-testid="select-filter-status">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS_OPTIONS.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            <Input
              placeholder="View name"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              className="w-32"
              data-testid="input-view-name"
            />
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleSaveView}
              disabled={saveViewMutation.isPending}
              data-testid="button-save-view"
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-4">
          {activitiesLoading ? (
            <div className="text-center py-8">Loading activities...</div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No activities found. {activities.length === 0 ? 'Create default activities to get started.' : 'Try adjusting your filters.'}
            </div>
          ) : (
            <div className="grid gap-4" data-testid="activities-list">
              {filteredActivities.map((activity: PlannerActivity) => {
                const phase = PHASES.find(p => p.value === activity.phase);
                const status = STATUS_OPTIONS.find(s => s.value === activity.status);
                const StatusIcon = status?.icon || Clock;

                return (
                  <Card key={activity.id} className="" data-testid={`activity-card-${activity.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => setExpandedActivityId(expandedActivityId === activity.id ? null : activity.id)}
                              className="text-gray-400 hover:text-gray-600 -ml-1"
                            >
                              {expandedActivityId === activity.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <StatusIcon className={`w-4 h-4 ${status?.color}`} />
                            {activity.isMilestone && (
                              <Flag className="w-4 h-4 text-amber-500" aria-label="Milestone" />
                            )}
                            <h4 className="font-medium text-gray-900">{activity.taskName}</h4>
                            {activity.recurrenceType && activity.recurrenceType !== 'none' && (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 gap-1"><Repeat className="w-3 h-3" />{activity.recurrenceType}</Badge>
                            )}
                            {activity.priority === 'critical' && (
                              <Badge variant="destructive" className="text-xs">Critical</Badge>
                            )}
                          </div>
                          
                          {activity.description && (
                            <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {phase && (
                              <span className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${phase.color}`} />
                                {phase.label}
                              </span>
                            )}
                            {activity.owner && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {activity.owner}
                              </span>
                            )}
                            {activity.deadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(activity.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Select 
                            value={activity.status} 
                            onValueChange={(newStatus) => handleUpdateActivity(activity.id, { status: newStatus })}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-activity-status-${activity.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(status => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingActivity(activity)}
                            data-testid={`button-edit-activity-${activity.id}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteActivityMutation.mutate(activity.id)}
                            disabled={deleteActivityMutation.isPending}
                            data-testid={`button-delete-activity-${activity.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {expandedActivityId === activity.id && !activity.subtaskOf && (
                        <TaskDetailPanel
                          // TaskDetailPanel types activityId as string, but the planner API
                          // uses numeric activity ids and TaskDetailPanel compares them
                          // numerically against allActivities ids, so the numeric id must be
                          // passed through unchanged. Bridge the stale prop type here.
                          activityId={activity.id as unknown as string}
                          eventId={eventId}
                          allActivities={activities.filter((a: PlannerActivity) => !a.subtaskOf)}
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-phase" className="space-y-6">
          {PHASES.map(phase => {
            const phaseActivities = filteredActivities.filter((a: PlannerActivity) => a.phase === phase.value);
            if (phaseActivities.length === 0) return null;

            return (
              <Card key={phase.value} data-testid={`phase-section-${phase.value}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${phase.color}`} />
                    {phase.label}
                    <Badge variant="outline">{phaseActivities.length} activities</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {phaseActivities.map((activity: PlannerActivity) => {
                    const status = STATUS_OPTIONS.find(s => s.value === activity.status);
                    const StatusIcon = status?.icon || Clock;

                    return (
                      <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`phase-activity-${activity.id}`}>
                        <div className="flex items-center gap-3">
                          <StatusIcon className={`w-4 h-4 ${status?.color}`} />
                          <div>
                            <div className="font-medium">{activity.taskName}</div>
                            {activity.owner && (
                              <div className="text-xs text-gray-500">Owner: {activity.owner}</div>
                            )}
                          </div>
                        </div>
                        
                        <Checkbox
                          checked={activity.status === 'completed'}
                          onCheckedChange={(checked) => 
                            handleUpdateActivity(activity.id, { 
                              status: checked ? 'completed' : 'pending' 
                            })
                          }
                          data-testid={`checkbox-activity-${activity.id}`}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-gray-500">
                Timeline view coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-gray-500">
                Analytics view coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Activity Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-create-activity">
          <DialogHeader>
            <DialogTitle>Create New Activity</DialogTitle>
            <DialogDescription>Add a new activity to your event plan</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="activity-name">Activity Name</Label>
              <Input
                id="activity-name"
                value={newActivity.taskName || ''}
                onChange={(e) => setNewActivity({ ...newActivity, taskName: e.target.value })}
                placeholder="Enter activity name"
                data-testid="input-activity-name"
              />
            </div>
            
            <div>
              <Label htmlFor="activity-phase">Phase</Label>
              <Select value={newActivity.phase || ''} onValueChange={(value) => setNewActivity({ ...newActivity, phase: value })}>
                <SelectTrigger data-testid="select-activity-phase">
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  {PHASES.map(phase => (
                    <SelectItem key={phase.value} value={phase.value}>
                      {phase.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="activity-description">Description (Optional)</Label>
              <Textarea
                id="activity-description"
                value={newActivity.description || ''}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                placeholder="Enter activity description"
                rows={3}
                data-testid="textarea-activity-description"
              />
            </div>
            
            <div>
              <Label htmlFor="activity-priority">Priority</Label>
              <Select value={newActivity.priority || 'medium'} onValueChange={(value) => setNewActivity({ ...newActivity, priority: value })}>
                <SelectTrigger data-testid="select-activity-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="activity-owner">Activity Owner</Label>
              <Select value={newActivity.owner || 'planner'} onValueChange={(value) => setNewActivity({ ...newActivity, owner: value })}>
                <SelectTrigger data-testid="select-activity-owner">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planner">Planner</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={newActivity.isMilestone || false}
                onCheckedChange={(checked) => setNewActivity({ ...newActivity, isMilestone: !!checked })}
              />
              <Label className="flex items-center gap-2 cursor-pointer"><Flag className="w-4 h-4 text-amber-500" />Mark as Milestone</Label>
            </div>

            <Separator />

            <div>
              <Label className="flex items-center gap-2"><Repeat className="w-4 h-4" />Recurrence (Optional)</Label>
              <Select value={newActivity.recurrenceType || 'none'} onValueChange={(value) => setNewActivity({ ...newActivity, recurrenceType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="No recurrence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No recurrence</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newActivity.recurrenceType && newActivity.recurrenceType !== 'none' && (
              <div>
                <Label>Deadline (Start Date for Recurrence)</Label>
                <Input
                  type="date"
                  value={newActivity.deadline ? new Date(newActivity.deadline).toISOString().split('T')[0] : ''}
                  onChange={(e) => setNewActivity({ ...newActivity, deadline: new Date(e.target.value) })}
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateActivity}
              disabled={!newActivity.taskName || !newActivity.phase || createActivityMutation.isPending}
              className="bg-[#330311] text-white"
              data-testid="button-confirm-create"
            >
              Create Activity
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}