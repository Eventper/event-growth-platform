import { useState, useEffect } from "react";
import { Calendar, Clock, Users, MapPin, DollarSign, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, differenceInWeeks, addDays, isBefore, isAfter } from "date-fns";

interface PlannerTask {
  id: string;
  title: string;
  description: string;
  phase: '6plus' | '3to6' | '0to3' | 'final';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'client' | 'vendor' | 'venue' | 'logistics' | 'admin';
  estimatedHours: number;
  dependencies?: string[];
  clientVisible?: boolean;
  dueWeeksBefore: number;
}

interface TimelinePhase {
  id: string;
  title: string;
  timeframe: string;
  description: string;
  color: string;
  tasks: PlannerTask[];
}

interface PlannerTimelineProps {
  eventDate: Date;
  eventType: 'private' | 'corporate';
  eventCategory?: string;
  guestCount: number;
  budget: number;
  complexity: 'simple' | 'moderate' | 'complex';
  onTaskUpdate?: (taskId: string, completed: boolean) => void;
}

export function PlannerTimeline({
  eventDate,
  eventType,
  eventCategory,
  guestCount,
  budget,
  complexity,
  onTaskUpdate
}: PlannerTimelineProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [activePhase, setActivePhase] = useState<string>('');

  const weeksUntilEvent = Math.max(0, differenceInWeeks(eventDate, new Date()));
  const daysUntilEvent = Math.max(0, differenceInDays(eventDate, new Date()));

  // Base planner tasks template
  const basePlannerTasks: PlannerTask[] = [
    // 6+ Months Phase
    {
      id: 'initial-consultation',
      title: 'Initial Client Consultation',
      description: 'Meet with client to understand vision, requirements, and establish timeline',
      phase: '6plus',
      priority: 'critical',
      category: 'client',
      estimatedHours: 2,
      clientVisible: true,
      dueWeeksBefore: 26
    },
    {
      id: 'budget-planning',
      title: 'Budget Breakdown & Allocation',
      description: 'Create detailed budget spreadsheet with category allocations and contingency planning',
      phase: '6plus',
      priority: 'critical',
      category: 'admin',
      estimatedHours: 3,
      clientVisible: false,
      dueWeeksBefore: 25
    },
    {
      id: 'venue-research',
      title: 'Venue Research & Site Visits',
      description: 'Research and schedule site visits for potential venues matching client requirements',
      phase: '6plus',
      priority: 'critical',
      category: 'venue',
      estimatedHours: 8,
      clientVisible: true,
      dueWeeksBefore: 24
    },
    {
      id: 'vendor-research',
      title: 'Key Vendor Research',
      description: 'Research and compile list of preferred vendors (catering, photography, florals)',
      phase: '6plus',
      priority: 'high',
      category: 'vendor',
      estimatedHours: 6,
      clientVisible: false,
      dueWeeksBefore: 22
    },

    // 3-6 Months Phase
    {
      id: 'venue-booking',
      title: 'Secure Venue Contracts',
      description: 'Finalize venue selection and execute contracts with deposits',
      phase: '3to6',
      priority: 'critical',
      category: 'venue',
      estimatedHours: 4,
      dependencies: ['venue-research'],
      clientVisible: true,
      dueWeeksBefore: 20
    },
    {
      id: 'key-vendor-booking',
      title: 'Book Primary Vendors',
      description: 'Secure contracts for catering, photography, and entertainment',
      phase: '3to6',
      priority: 'critical',
      category: 'vendor',
      estimatedHours: 6,
      dependencies: ['vendor-research'],
      clientVisible: true,
      dueWeeksBefore: 18
    },
    {
      id: 'design-planning',
      title: 'Design & Theme Development',
      description: 'Finalize color schemes, floral designs, and overall aesthetic direction',
      phase: '3to6',
      priority: 'high',
      category: 'client',
      estimatedHours: 4,
      clientVisible: true,
      dueWeeksBefore: 16
    },
    {
      id: 'invitation-design',
      title: 'Invitation Design & Ordering',
      description: 'Design invitations and coordinate printing/digital distribution',
      phase: '3to6',
      priority: 'high',
      category: 'logistics',
      estimatedHours: 3,
      clientVisible: true,
      dueWeeksBefore: 14
    },

    // 0-3 Months Phase
    {
      id: 'final-vendor-coordination',
      title: 'Vendor Coordination Meetings',
      description: 'Conduct final meetings with all vendors to confirm details and timeline',
      phase: '0to3',
      priority: 'critical',
      category: 'vendor',
      estimatedHours: 4,
      dependencies: ['key-vendor-booking'],
      clientVisible: false,
      dueWeeksBefore: 6
    },
    {
      id: 'guest-management',
      title: 'RSVP Management & Seating',
      description: 'Track RSVPs, manage guest list changes, create seating arrangements',
      phase: '0to3',
      priority: 'high',
      category: 'logistics',
      estimatedHours: 5,
      dependencies: ['invitation-design'],
      clientVisible: true,
      dueWeeksBefore: 4
    },
    {
      id: 'logistics-coordination',
      title: 'Transportation & Accommodation',
      description: 'Coordinate guest transportation, parking, and accommodation needs',
      phase: '0to3',
      priority: 'medium',
      category: 'logistics',
      estimatedHours: 3,
      clientVisible: false,
      dueWeeksBefore: 3
    },

    // Final Phase (Final Month)
    {
      id: 'final-timeline',
      title: 'Create Day-of Timeline',
      description: 'Develop minute-by-minute timeline for event day coordination',
      phase: 'final',
      priority: 'critical',
      category: 'admin',
      estimatedHours: 4,
      clientVisible: false,
      dueWeeksBefore: 2
    },
    {
      id: 'final-confirmations',
      title: 'Final Vendor Confirmations',
      description: 'Confirm all vendor arrival times, setup requirements, and contact information',
      phase: 'final',
      priority: 'critical',
      category: 'vendor',
      estimatedHours: 2,
      dependencies: ['final-vendor-coordination'],
      clientVisible: false,
      dueWeeksBefore: 1
    },
    {
      id: 'emergency-kit',
      title: 'Prepare Emergency Kit',
      description: 'Assemble day-of emergency supplies and backup contact list',
      phase: 'final',
      priority: 'high',
      category: 'admin',
      estimatedHours: 1,
      clientVisible: false,
      dueWeeksBefore: 1
    }
  ];

  // Add event-specific tasks
  const getEventSpecificTasks = (): PlannerTask[] => {
    const additionalTasks: PlannerTask[] = [];

    if (eventType === 'private') {
      if (eventCategory === 'Wedding') {
        additionalTasks.push(
          {
            id: 'officiant-coordination',
            title: 'Officiant Coordination',
            description: 'Coordinate with officiant for ceremony details and rehearsal planning',
            phase: '3to6',
            priority: 'critical',
            category: 'vendor',
            estimatedHours: 2,
            clientVisible: true,
            dueWeeksBefore: 12
          },
          {
            id: 'bridal-party-coordination',
            title: 'Bridal Party Coordination',
            description: 'Coordinate with bridal party for fittings, rehearsal, and day-of responsibilities',
            phase: '0to3',
            priority: 'high',
            category: 'client',
            estimatedHours: 3,
            clientVisible: true,
            dueWeeksBefore: 8
          },
          {
            id: 'rehearsal-planning',
            title: 'Wedding Rehearsal Planning',
            description: 'Plan and coordinate wedding rehearsal and rehearsal dinner',
            phase: 'final',
            priority: 'critical',
            category: 'logistics',
            estimatedHours: 3,
            dependencies: ['officiant-coordination'],
            clientVisible: true,
            dueWeeksBefore: 1
          }
        );
      }
    } else if (eventType === 'corporate') {
      additionalTasks.push(
        {
          id: 'av-coordination',
          title: 'AV & Tech Setup Coordination',
          description: 'Coordinate sound, lighting, projection, and live streaming requirements',
          phase: '3to6',
          priority: 'critical',
          category: 'vendor',
          estimatedHours: 4,
          clientVisible: false,
          dueWeeksBefore: 16
        },
        {
          id: 'speaker-management',
          title: 'Speaker & Content Management',
          description: 'Coordinate with speakers, manage presentations, and tech rehearsals',
          phase: '0to3',
          priority: 'critical',
          category: 'client',
          estimatedHours: 6,
          dependencies: ['av-coordination'],
          clientVisible: true,
          dueWeeksBefore: 4
        },
        {
          id: 'branding-materials',
          title: 'Corporate Branding & Materials',
          description: 'Coordinate branded signage, swag, and marketing materials production',
          phase: '0to3',
          priority: 'high',
          category: 'logistics',
          estimatedHours: 3,
          clientVisible: false,
          dueWeeksBefore: 6
        }
      );
    }

    // Add complexity-based tasks
    if (complexity === 'complex' || guestCount > 200) {
      additionalTasks.push(
        {
          id: 'security-planning',
          title: 'Security & Crowd Management',
          description: 'Coordinate security personnel and crowd management protocols',
          phase: '0to3',
          priority: 'high',
          category: 'logistics',
          estimatedHours: 2,
          clientVisible: false,
          dueWeeksBefore: 4
        },
        {
          id: 'vendor-management-system',
          title: 'Vendor Management Platform',
          description: 'Set up digital platform for vendor coordination and timeline sharing',
          phase: '6plus',
          priority: 'medium',
          category: 'admin',
          estimatedHours: 2,
          clientVisible: false,
          dueWeeksBefore: 20
        }
      );
    }

    return additionalTasks;
  };

  const allTasks = [...basePlannerTasks, ...getEventSpecificTasks()];

  // Organize tasks by phases
  const phases: TimelinePhase[] = [
    {
      id: '6plus',
      title: '6+ Months Before',
      timeframe: 'Foundation Phase',
      description: 'Initial planning, venue securing, and vendor research',
      color: 'bg-blue-500',
      tasks: allTasks.filter(task => task.phase === '6plus')
    },
    {
      id: '3to6',
      title: '3-6 Months Before', 
      timeframe: 'Development Phase',
      description: 'Vendor booking, design finalization, and logistics planning',
      color: 'bg-purple-500',
      tasks: allTasks.filter(task => task.phase === '3to6')
    },
    {
      id: '0to3',
      title: '0-3 Months Before',
      timeframe: 'Execution Phase', 
      description: 'Final coordination, guest management, and detail confirmation',
      color: 'bg-burgundy-500',
      tasks: allTasks.filter(task => task.phase === '0to3')
    },
    {
      id: 'final',
      title: 'Final Month',
      timeframe: 'Completion Phase',
      description: 'Day-of preparation and final confirmations',
      color: 'bg-red-500',
      tasks: allTasks.filter(task => task.phase === 'final')
    }
  ];

  // Determine current active phase
  useEffect(() => {
    if (weeksUntilEvent >= 26) setActivePhase('6plus');
    else if (weeksUntilEvent >= 12) setActivePhase('3to6');
    else if (weeksUntilEvent >= 4) setActivePhase('0to3');
    else setActivePhase('final');
  }, [weeksUntilEvent]);

  const toggleTask = (taskId: string) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);
    onTaskUpdate?.(taskId, newCompleted.has(taskId));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-burgundy-200 text-burgundy-900 border-burgundy-300';
      case 'medium': return 'bg-burgundy-100 text-burgundy-800 border-burgundy-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'client': return <Users className="w-4 h-4" />;
      case 'vendor': return <MapPin className="w-4 h-4" />;
      case 'venue': return <MapPin className="w-4 h-4" />;
      case 'logistics': return <Calendar className="w-4 h-4" />;
      case 'admin': return <Clock className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getTaskStatus = (task: PlannerTask) => {
    const taskDueDate = addDays(eventDate, -task.dueWeeksBefore * 7);
    const isOverdue = isBefore(taskDueDate, new Date()) && !completedTasks.has(task.id);
    const isDueSoon = isBefore(taskDueDate, addDays(new Date(), 7)) && !completedTasks.has(task.id);
    
    return { isOverdue, isDueSoon, dueDate: taskDueDate };
  };

  return (
    <div className="bg-burgundy-800 rounded-lg p-6 border border-burgundy-700">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Planner Timeline</h3>
            <p className="text-burgundy-200 text-sm">
              {daysUntilEvent} days until event • Current phase: {phases.find(p => p.id === activePhase)?.title}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{weeksUntilEvent}</div>
            <div className="text-xs text-burgundy-200">weeks to go</div>
          </div>
        </div>

        {/* Timeline Progress */}
        <div className="flex items-center space-x-2 mb-6">
          {phases.map((phase, index) => (
            <div key={phase.id} className="flex items-center flex-1">
              <div className={cn(
                "flex-1 h-2 rounded-full",
                phase.id === activePhase ? 'bg-white' : 
                index < phases.findIndex(p => p.id === activePhase) ? 'bg-burgundy-400' : 'bg-burgundy-600'
              )} />
              {index < phases.length - 1 && <ArrowRight className="w-4 h-4 text-burgundy-400 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Phase Cards */}
      <div className="space-y-6">
        {phases.map((phase) => {
          const phaseCompletedTasks = phase.tasks.filter(task => completedTasks.has(task.id)).length;
          const totalPhaseTasks = phase.tasks.length;
          const phaseProgress = totalPhaseTasks > 0 ? (phaseCompletedTasks / totalPhaseTasks) * 100 : 0;

          return (
            <Card key={phase.id} className={cn(
              "border-2 transition-all duration-200",
              phase.id === activePhase 
                ? "border-white bg-burgundy-700 shadow-lg" 
                : "border-burgundy-600 bg-burgundy-800"
            )}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-lg">{phase.title}</CardTitle>
                    <p className="text-burgundy-200 text-sm">{phase.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {phaseCompletedTasks}/{totalPhaseTasks} completed
                    </div>
                    <div className="w-24 bg-burgundy-600 rounded-full h-2 mt-1">
                      <div 
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${phaseProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {phase.tasks.map((task) => {
                    const { isOverdue, isDueSoon, dueDate } = getTaskStatus(task);
                    const isCompleted = completedTasks.has(task.id);

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200",
                          isCompleted 
                            ? "bg-burgundy-900/50 border-burgundy-600" 
                            : "bg-burgundy-600 border-burgundy-500 hover:bg-burgundy-500",
                          isOverdue && !isCompleted && "border-red-400 bg-red-900/20"
                        )}
                      >
                        <button
                          onClick={() => toggleTask(task.id)}
                          className="flex-shrink-0 mt-1"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-burgundy-400 rounded-full hover:border-white" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className={cn(
                                "font-medium text-sm",
                                isCompleted ? "text-burgundy-300 line-through" : "text-white"
                              )}>
                                {task.title}
                              </h4>
                              <p className={cn(
                                "text-xs mt-1",
                                isCompleted ? "text-burgundy-400" : "text-burgundy-200"
                              )}>
                                {task.description}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              {isOverdue && !isCompleted && (
                                <AlertCircle className="w-4 h-4 text-red-400" />
                              )}
                              <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                                {task.priority}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-4 text-burgundy-300">
                              <div className="flex items-center space-x-1">
                                {getCategoryIcon(task.category)}
                                <span>{task.category}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{task.estimatedHours}h</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>Due: {format(dueDate, 'MMM d')}</span>
                              </div>
                            </div>
                            {task.clientVisible && (
                              <Badge variant="outline" className="text-xs border-white text-white">
                                Client Visible
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="bg-burgundy-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {allTasks.filter(t => completedTasks.has(t.id)).length}
          </div>
          <div className="text-xs text-burgundy-200">Completed Tasks</div>
        </div>
        <div className="bg-burgundy-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {allTasks.filter(t => getTaskStatus(t).isOverdue).length}
          </div>
          <div className="text-xs text-burgundy-200">Overdue Tasks</div>
        </div>
        <div className="bg-burgundy-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {allTasks.reduce((sum, t) => sum + t.estimatedHours, 0)}
          </div>
          <div className="text-xs text-burgundy-200">Total Hours</div>
        </div>
        <div className="bg-burgundy-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {Math.round((allTasks.filter(t => completedTasks.has(t.id)).length / allTasks.length) * 100)}%
          </div>
          <div className="text-xs text-burgundy-200">Overall Progress</div>
        </div>
      </div>
    </div>
  );
}