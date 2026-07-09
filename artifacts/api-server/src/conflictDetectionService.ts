import { storage } from './storage';
import { notificationService } from './notificationService';
import { format, isSameDay, isAfter, isBefore, differenceInDays } from 'date-fns';

export interface Conflict {
  id: string;
  type: 'double_booking' | 'overdue_task' | 'budget_exceeded' | 'vendor_unavailable' | 'timeline_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  eventId: string;
  title: string;
  description: string;
  affectedResources: string[];
  suggestedActions: string[];
  detectedAt: Date;
  resolvedAt?: Date;
  autoResolvable: boolean;
}

export interface RiskAlert {
  eventId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    timelineRisk: number; // 0-100
    budgetRisk: number; // 0-100
    vendorRisk: number; // 0-100
    taskCompletionRisk: number; // 0-100
  };
  overallScore: number;
  recommendations: string[];
}

class ConflictDetectionService {
  private conflicts = new Map<string, Conflict[]>();

  // Main conflict detection runner
  async detectAllConflicts(eventId?: string): Promise<Conflict[]> {
    const events = eventId ? [await storage.getEvent(eventId)] : await storage.getAllEvents();
    const allConflicts: Conflict[] = [];

    for (const event of events.filter((e): e is NonNullable<typeof e> => Boolean(e))) {
      const eventConflicts = await this.detectEventConflicts(event.id);
      allConflicts.push(...eventConflicts);
    }

    return allConflicts;
  }

  // Detect conflicts for a specific event
  async detectEventConflicts(eventId: string): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Check for double bookings
    conflicts.push(...await this.detectDoubleBookings(eventId));
    
    // Check for overdue tasks
    conflicts.push(...await this.detectOverdueTasks(eventId));
    
    // Check for budget issues
    conflicts.push(...await this.detectBudgetConflicts(eventId));
    
    // Check for vendor availability conflicts
    conflicts.push(...await this.detectVendorConflicts(eventId));
    
    // Check for timeline risks
    conflicts.push(...await this.detectTimelineRisks(eventId));

    // Store conflicts
    this.conflicts.set(eventId, conflicts);

    // Send notifications for critical conflicts
    await this.notifyCriticalConflicts(eventId, conflicts);

    return conflicts;
  }

  // Detect double bookings (venues, vendors, planners)
  private async detectDoubleBookings(eventId: string): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const event = await storage.getEvent(eventId);
    if (!event) return conflicts;

    // Check venue double bookings
    const allEvents = await storage.getAllEvents();
    const sameVenueEvents = allEvents.filter(e => 
      e.id !== eventId && 
      (e.ceremonyVenue === event.ceremonyVenue || 
       e.receptionVenue === event.receptionVenue) &&
      isSameDay(new Date(e.startDate), new Date(event.startDate))
    );

    if (sameVenueEvents.length > 0) {
      conflicts.push({
        id: `venue-conflict-${eventId}`,
        type: 'double_booking',
        severity: 'high',
        eventId,
        title: 'Venue Double Booking Detected',
        description: `Venue conflict with ${sameVenueEvents.length} other event(s) on ${format(new Date(event.startDate), 'MMM dd, yyyy')}`,
        affectedResources: [event.ceremonyVenue, event.receptionVenue].filter(Boolean) as string[],
        suggestedActions: [
          'Contact venue to confirm availability',
          'Consider alternative venues',
          'Adjust event timing if possible'
        ],
        detectedAt: new Date(),
        autoResolvable: false
      });
    }

    // Check planner double bookings
    const samePlannerEvents = allEvents.filter(e => 
      e.id !== eventId && 
      e.plannerId === event.plannerId &&
      isSameDay(new Date(e.startDate), new Date(event.startDate))
    );

    if (samePlannerEvents.length > 0) {
      conflicts.push({
        id: `planner-conflict-${eventId}`,
        type: 'double_booking',
        severity: 'medium',
        eventId,
        title: 'Planner Schedule Conflict',
        description: `Planner has ${samePlannerEvents.length} other event(s) scheduled for the same day`,
        affectedResources: [`planner-${event.plannerId}`],
        suggestedActions: [
          'Assign backup planner for day-of coordination',
          'Schedule detailed pre-event briefings',
          'Consider delegating specific tasks to team members'
        ],
        detectedAt: new Date(),
        autoResolvable: false
      });
    }

    return conflicts;
  }

  // Detect overdue tasks
  private async detectOverdueTasks(eventId: string): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const tasks = await storage.getTasksByEvent(eventId);
    const now = new Date();

    const overdueTasks = tasks.filter(task => 
      task.dueDate && 
      isAfter(now, new Date(task.dueDate)) && 
      task.status !== 'done'
    );

    if (overdueTasks.length > 0) {
      const criticalOverdue = overdueTasks.filter(task => 
        differenceInDays(now, new Date(task.dueDate!)) > 7
      );

      conflicts.push({
        id: `overdue-tasks-${eventId}`,
        type: 'overdue_task',
        severity: criticalOverdue.length > 0 ? 'critical' : 'high',
        eventId,
        title: `${overdueTasks.length} Overdue Task(s)`,
        description: `Tasks overdue: ${overdueTasks.map(t => t.title).join(', ')}`,
        affectedResources: overdueTasks.map(t => `task-${t.id}`),
        suggestedActions: [
          'Review and reassign critical tasks',
          'Adjust task deadlines if possible',
          'Escalate to event planner immediately',
          'Consider additional resources'
        ],
        detectedAt: new Date(),
        autoResolvable: false
      });
    }

    return conflicts;
  }

  // Detect budget conflicts
  private async detectBudgetConflicts(eventId: string): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const event = await storage.getEvent(eventId);
    const budgetItems = await storage.getBudgetItemsByEvent(eventId);
    
    if (!event || !budgetItems.length) return conflicts;

    const totalEstimated = budgetItems.reduce((sum, item) => 
      sum + parseFloat(item.estimatedCost.toString()), 0
    );
    const totalActual = budgetItems.reduce((sum, item) => 
      sum + parseFloat(item.actualCost?.toString() || '0'), 0
    );
    const eventBudget = parseFloat(event.budget.toString());

    // Budget exceeded
    if (totalActual > eventBudget) {
      conflicts.push({
        id: `budget-exceeded-${eventId}`,
        type: 'budget_exceeded',
        severity: 'critical',
        eventId,
        title: 'Budget Exceeded',
        description: `Actual costs ($${totalActual.toFixed(2)}) exceed approved budget ($${eventBudget.toFixed(2)}) by $${(totalActual - eventBudget).toFixed(2)}`,
        affectedResources: ['budget'],
        suggestedActions: [
          'Review and approve additional budget',
          'Identify cost reduction opportunities',
          'Renegotiate vendor contracts',
          'Client approval required for overages'
        ],
        detectedAt: new Date(),
        autoResolvable: false
      });
    }

    // Budget projected to exceed
    else if (totalEstimated > eventBudget * 1.1) { // 10% buffer
      conflicts.push({
        id: `budget-risk-${eventId}`,
        type: 'budget_exceeded',
        severity: 'medium',
        eventId,
        title: 'Budget Risk Detected',
        description: `Estimated costs ($${totalEstimated.toFixed(2)}) may exceed budget ($${eventBudget.toFixed(2)})`,
        affectedResources: ['budget'],
        suggestedActions: [
          'Review vendor quotes for accuracy',
          'Consider alternative options for high-cost items',
          'Discuss budget adjustments with client',
          'Implement cost monitoring alerts'
        ],
        detectedAt: new Date(),
        autoResolvable: false
      });
    }

    return conflicts;
  }

  // Detect vendor availability conflicts
  private async detectVendorConflicts(eventId: string): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const contracts = await storage.getContractsByEvent(eventId);
    
    const unconfirmedContracts = contracts.filter(contract => 
      contract.status === 'sent' && 
      contract.sentDate &&
      differenceInDays(new Date(), new Date(contract.sentDate)) > 7
    );

    if (unconfirmedContracts.length > 0) {
      conflicts.push({
        id: `vendor-unconfirmed-${eventId}`,
        type: 'vendor_unavailable',
        severity: 'medium',
        eventId,
        title: 'Unconfirmed Vendor Contracts',
        description: `${unconfirmedContracts.length} vendor contract(s) pending confirmation for over 7 days`,
        affectedResources: unconfirmedContracts.map(c => `contract-${c.id}`),
        suggestedActions: [
          'Follow up with vendors immediately',
          'Prepare backup vendor options',
          'Set contract response deadlines',
          'Consider alternative vendors'
        ],
        detectedAt: new Date(),
        autoResolvable: false
      });
    }

    return conflicts;
  }

  // Detect timeline risks
  private async detectTimelineRisks(eventId: string): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const event = await storage.getEvent(eventId);
    const tasks = await storage.getTasksByEvent(eventId);
    
    if (!event) return conflicts;

    const eventDate = new Date(event.startDate);
    const daysUntilEvent = differenceInDays(eventDate, new Date());
    
    // Critical timeline - less than 30 days
    if (daysUntilEvent < 30 && daysUntilEvent > 0) {
      const incompleteTasks = tasks.filter(task => task.status !== 'done').length;
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? (totalTasks - incompleteTasks) / totalTasks : 1;

      if (completionRate < 0.8) { // Less than 80% complete
        conflicts.push({
          id: `timeline-risk-${eventId}`,
          type: 'timeline_risk',
          severity: daysUntilEvent < 14 ? 'critical' : 'high',
          eventId,
          title: 'Timeline Risk Alert',
          description: `Only ${daysUntilEvent} days until event with ${incompleteTasks} incomplete tasks (${Math.round(completionRate * 100)}% complete)`,
          affectedResources: ['timeline'],
          suggestedActions: [
            'Prioritize critical path tasks',
            'Assign additional resources',
            'Daily progress check-ins',
            'Consider task delegation or outsourcing'
          ],
          detectedAt: new Date(),
          autoResolvable: false
        });
      }
    }

    return conflicts;
  }

  // Calculate overall risk assessment
  async calculateRiskLevel(eventId: string): Promise<RiskAlert> {
    const conflicts = await this.detectEventConflicts(eventId);
    const event = await storage.getEvent(eventId);
    const tasks = await storage.getTasksByEvent(eventId);
    const budgetItems = await storage.getBudgetItemsByEvent(eventId);

    // Timeline risk calculation
    const eventDate = new Date(event?.startDate || new Date());
    const daysUntilEvent = Math.max(0, differenceInDays(eventDate, new Date()));
    const incompleteTasks = tasks.filter(task => task.status !== 'done').length;
    const taskCompletionRate = tasks.length > 0 ? (tasks.length - incompleteTasks) / tasks.length : 1;
    
    let timelineRisk = 0;
    if (daysUntilEvent < 7) timelineRisk = 90;
    else if (daysUntilEvent < 14) timelineRisk = 70;
    else if (daysUntilEvent < 30) timelineRisk = 50;
    else timelineRisk = 20;
    
    timelineRisk *= (1 - taskCompletionRate);

    // Budget risk calculation
    const eventBudget = parseFloat(event?.budget.toString() || '0');
    const actualSpend = budgetItems.reduce((sum, item) => sum + parseFloat(item.actualCost?.toString() || '0'), 0);
    const budgetRisk = eventBudget > 0 ? Math.min(100, (actualSpend / eventBudget) * 100) : 0;

    // Vendor risk calculation
    const contracts = await storage.getContractsByEvent(eventId);
    const unconfirmedContracts = contracts.filter(c => c.status !== 'signed').length;
    const vendorRisk = contracts.length > 0 ? (unconfirmedContracts / contracts.length) * 100 : 0;

    // Task completion risk
    const taskCompletionRisk = (1 - taskCompletionRate) * 100;

    // Overall risk score
    const overallScore = Math.round(
      (timelineRisk * 0.3 + budgetRisk * 0.25 + vendorRisk * 0.25 + taskCompletionRisk * 0.2)
    );

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (overallScore >= 80) riskLevel = 'critical';
    else if (overallScore >= 60) riskLevel = 'high';
    else if (overallScore >= 30) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      eventId,
      riskLevel,
      factors: {
        timelineRisk: Math.round(timelineRisk),
        budgetRisk: Math.round(budgetRisk),
        vendorRisk: Math.round(vendorRisk),
        taskCompletionRisk: Math.round(taskCompletionRisk)
      },
      overallScore,
      recommendations: this.generateRecommendations(conflicts, riskLevel)
    };
  }

  // Generate recommendations based on conflicts and risk level
  private generateRecommendations(conflicts: Conflict[], riskLevel: string): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('Immediate intervention required - escalate to senior management');
      recommendations.push('Consider emergency resources and budget adjustments');
    }

    const conflictTypes = [...new Set(conflicts.map(c => c.type))];
    
    if (conflictTypes.includes('double_booking')) {
      recommendations.push('Resolve venue and vendor conflicts immediately');
    }
    if (conflictTypes.includes('overdue_task')) {
      recommendations.push('Reassign overdue tasks and adjust timeline');
    }
    if (conflictTypes.includes('budget_exceeded')) {
      recommendations.push('Review budget with client and approve overages');
    }
    if (conflictTypes.includes('timeline_risk')) {
      recommendations.push('Accelerate critical path tasks and add resources');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring - maintain current planning pace');
    }

    return recommendations;
  }

  // Send notifications for critical conflicts
  private async notifyCriticalConflicts(eventId: string, conflicts: Conflict[]): Promise<void> {
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    
    for (const conflict of criticalConflicts) {
      const event = await storage.getEvent(eventId);
      if (!event) continue;

      // Notify planner
      if (event.plannerId) {
        await notificationService.sendNotification({
          userId: event.plannerId,
          eventId,
          type: 'timeline_update',
          title: `Critical Alert: ${conflict.title}`,
          message: conflict.description,
          actionUrl: `/events/${eventId}?tab=risks`
        });
      }

      // Notify client for budget issues
      if (conflict.type === 'budget_exceeded' && event.clientId) {
        await notificationService.sendNotification({
          userId: event.clientId,
          eventId,
          type: 'budget_change',
          title: 'Budget Alert',
          message: `Your event budget requires attention: ${conflict.description}`,
          actionUrl: `/event-timeline?eventId=${eventId}&tab=budget`
        });
      }
    }
  }

  // Get conflicts for an event
  async getEventConflicts(eventId: string): Promise<Conflict[]> {
    return this.conflicts.get(eventId) || [];
  }

  // Mark conflict as resolved
  async resolveConflict(eventId: string, conflictId: string): Promise<boolean> {
    const conflicts = this.conflicts.get(eventId) || [];
    const conflict = conflicts.find(c => c.id === conflictId);
    
    if (conflict) {
      conflict.resolvedAt = new Date();
      return true;
    }
    
    return false;
  }

  // Auto-run conflict detection (called by scheduler)
  async runScheduledDetection(): Promise<void> {
    console.log('Running scheduled conflict detection...');
    const allConflicts = await this.detectAllConflicts();
    console.log(`Detected ${allConflicts.length} total conflicts across all events`);
  }
}

export const conflictDetectionService = new ConflictDetectionService();