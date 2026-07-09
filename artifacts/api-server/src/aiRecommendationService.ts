import { storage } from './storage';
import { CurrencyService } from './currencyService';

export interface VendorRecommendation {
  vendorId: string;
  vendor: any;
  score: number; // 0-100
  reasons: string[];
  category: string;
  estimatedCost: number;
  currency: string;
  availability: 'available' | 'limited' | 'unavailable';
  tags: string[];
}

export interface BudgetRecommendation {
  category: string;
  suggestedAmount: number;
  currency: string;
  reasoning: string;
  priority: 'essential' | 'recommended' | 'optional';
  alternatives: {
    option: string;
    cost: number;
    description: string;
  }[];
}

export interface EventRecommendation {
  type: 'vendor' | 'budget' | 'timeline' | 'service';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: string;
  actionRequired: boolean;
  data: any;
}

class AIRecommendationService {
  private currencyService = new CurrencyService();

  // Main recommendation engine
  async getEventRecommendations(eventId: string): Promise<EventRecommendation[]> {
    const recommendations: EventRecommendation[] = [];
    
    // Get vendor recommendations
    const vendorRecs = await this.getVendorRecommendations(eventId);
    recommendations.push(...vendorRecs.map(rec => ({
      type: 'vendor' as const,
      title: `Recommended: ${rec.vendor.name}`,
      description: `${rec.category} vendor with ${rec.score}% match score`,
      priority: (rec.score > 80 ? 'high' : rec.score > 60 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      estimatedImpact: `Cost: ${rec.currency} ${rec.estimatedCost.toFixed(2)}`,
      actionRequired: rec.score > 85,
      data: rec
    })));

    // Get budget recommendations
    const budgetRecs = await this.getBudgetRecommendations(eventId);
    recommendations.push(...budgetRecs.map(rec => ({
      type: 'budget' as const,
      title: `Budget Optimization: ${rec.category}`,
      description: rec.reasoning,
      priority: (rec.priority === 'essential' ? 'high' : rec.priority === 'recommended' ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      estimatedImpact: `Suggested: ${rec.currency} ${rec.suggestedAmount.toFixed(2)}`,
      actionRequired: rec.priority === 'essential',
      data: rec
    })));

    // Timeline optimization recommendations
    const timelineRecs = await this.getTimelineRecommendations(eventId);
    recommendations.push(...timelineRecs);

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Agent-powered vendor recommendations
  async getVendorRecommendations(eventId: string): Promise<VendorRecommendation[]> {
    const event = await storage.getEvent(eventId);
    if (!event) return [];

    const allVendors = await storage.getAllVendors();
    const eventContracts = await storage.getContractsByEvent(eventId);
    const bookedVendorIds = eventContracts.map(c => c.vendorId).filter(Boolean);

    const recommendations: VendorRecommendation[] = [];

    for (const vendor of allVendors) {
      if (bookedVendorIds.includes(vendor.id)) continue;

      const score = await this.calculateVendorScore(vendor, event);
      const estimatedCost = await this.estimateVendorCost(vendor, event);
      
      if (score > 50) { // Only recommend vendors with >50% match
        recommendations.push({
          vendorId: vendor.id,
          vendor,
          score,
          reasons: this.generateVendorReasons(vendor, event, score),
          category: vendor.category || 'General',
          estimatedCost,
          currency: event.currency,
          availability: this.checkVendorAvailability(vendor, event),
          tags: this.generateVendorTags(vendor, event)
        });
      }
    }

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  // Calculate vendor match score based on event requirements
  private async calculateVendorScore(vendor: any, event: any): Promise<number> {
    let score = 0;
    const factors: { [key: string]: number } = {};

    // Location proximity (30 points)
    if (vendor.location && event.city) {
      const locationMatch = vendor.location.toLowerCase().includes(event.city.toLowerCase()) ||
                           event.city.toLowerCase().includes(vendor.location.toLowerCase());
      factors.location = locationMatch ? 30 : 10;
    } else {
      factors.location = 15; // neutral if no location data
    }

    // Event type compatibility (25 points)
    if (vendor.specialties && Array.isArray(vendor.specialties)) {
      const eventTypeMatch = vendor.specialties.some((specialty: string) => 
        specialty.toLowerCase().includes(event.eventCategory?.toLowerCase() || '') ||
        event.eventCategory?.toLowerCase().includes(specialty.toLowerCase())
      );
      factors.eventType = eventTypeMatch ? 25 : 10;
    } else {
      factors.eventType = 15;
    }

    // Budget compatibility (20 points)
    const eventBudget = parseFloat(event.budget.toString());
    if (vendor.cost && eventBudget > 0) {
      const vendorCost = parseFloat(vendor.cost.toString());
      const budgetRatio = vendorCost / eventBudget;
      
      if (budgetRatio <= 0.15) factors.budget = 20; // Within 15% of budget
      else if (budgetRatio <= 0.25) factors.budget = 15; // Within 25%
      else if (budgetRatio <= 0.4) factors.budget = 10; // Within 40%
      else factors.budget = 5; // Expensive
    } else {
      factors.budget = 12;
    }

    // Rating/reputation (15 points)
    if (vendor.rating) {
      const rating = parseFloat(vendor.rating.toString());
      factors.rating = Math.min(15, (rating / 5) * 15);
    } else {
      factors.rating = 7; // neutral
    }

    // Guest count compatibility (10 points)
    if (vendor.maxCapacity && event.guestCount) {
      const capacityMatch = vendor.maxCapacity >= event.guestCount;
      factors.capacity = capacityMatch ? 10 : 3;
    } else {
      factors.capacity = 6;
    }

    // Sum all factors
    score = Object.values(factors).reduce((sum, val) => sum + val, 0);
    
    return Math.min(100, Math.max(0, score));
  }

  // Generate reasons for vendor recommendation
  private generateVendorReasons(vendor: any, event: any, score: number): string[] {
    const reasons: string[] = [];

    if (vendor.location && event.city && 
        vendor.location.toLowerCase().includes(event.city.toLowerCase())) {
      reasons.push(`Local vendor in ${event.city}`);
    }

    if (vendor.rating && parseFloat(vendor.rating.toString()) >= 4.5) {
      reasons.push(`Highly rated (${vendor.rating}/5 stars)`);
    }

    if (vendor.specialties && Array.isArray(vendor.specialties)) {
      const matchingSpecialty = vendor.specialties.find((s: string) => 
        s.toLowerCase().includes(event.eventCategory?.toLowerCase() || '')
      );
      if (matchingSpecialty) {
        reasons.push(`Specializes in ${matchingSpecialty}`);
      }
    }

    if (score > 85) {
      reasons.push('Excellent match for your event requirements');
    } else if (score > 70) {
      reasons.push('Good fit based on your event criteria');
    }

    return reasons;
  }

  // Estimate vendor cost for the event
  private async estimateVendorCost(vendor: any, event: any): Promise<number> {
    let baseCost = vendor.cost ? parseFloat(vendor.cost.toString()) : 0;
    
    // Adjust for guest count
    if (event.guestCount && event.guestCount > 50) {
      const guestMultiplier = 1 + ((event.guestCount - 50) * 0.01); // 1% per guest over 50
      baseCost *= Math.min(guestMultiplier, 2); // Cap at 2x
    }

    // Adjust for event duration
    if (event.eventDays && event.eventDays > 1) {
      baseCost *= (1 + (event.eventDays - 1) * 0.3); // 30% per additional day
    }

    // Premium for short notice (less than 30 days)
    const eventDate = new Date(event.startDate);
    const daysUntilEvent = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilEvent < 30 && daysUntilEvent > 0) {
      baseCost *= 1.2; // 20% premium for short notice
    }

    return Math.round(baseCost);
  }

  // Check vendor availability
  private checkVendorAvailability(vendor: any, event: any): 'available' | 'limited' | 'unavailable' {
    // This would integrate with vendor calendars in a real implementation
    // For now, simulate based on vendor popularity and event timing
    
    const eventDate = new Date(event.startDate);
    const daysUntilEvent = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilEvent < 7) return 'limited'; // Short notice
    if (vendor.rating && parseFloat(vendor.rating.toString()) > 4.5 && daysUntilEvent < 30) {
      return 'limited'; // Popular vendors book up fast
    }
    
    return 'available';
  }

  // Generate vendor tags
  private generateVendorTags(vendor: any, event: any): string[] {
    const tags: string[] = [];
    
    if (vendor.location && event.city && 
        vendor.location.toLowerCase().includes(event.city.toLowerCase())) {
      tags.push('Local');
    }
    
    if (vendor.rating && parseFloat(vendor.rating.toString()) >= 4.5) {
      tags.push('Top Rated');
    }
    
    const eventBudget = parseFloat(event.budget.toString());
    const vendorCost = vendor.cost ? parseFloat(vendor.cost.toString()) : 0;
    if (vendorCost && eventBudget && vendorCost <= eventBudget * 0.15) {
      tags.push('Budget Friendly');
    }
    
    if (vendor.specialties && Array.isArray(vendor.specialties) && 
        vendor.specialties.some((s: string) => s.toLowerCase().includes('luxury'))) {
      tags.push('Luxury');
    }
    
    return tags;
  }

  // Generate budget recommendations
  async getBudgetRecommendations(eventId: string): Promise<BudgetRecommendation[]> {
    const event = await storage.getEvent(eventId);
    const existingBudgetItems = await storage.getBudgetItemsByEvent(eventId);
    
    if (!event) return [];

    const recommendations: BudgetRecommendation[] = [];
    const eventBudget = parseFloat(event.budget.toString());
    const guestCount = event.guestCount || 50;
    const eventType = event.eventCategory || 'general';

    // Define budget allocation percentages by event type
    const budgetAllocations = this.getBudgetAllocationsByEventType(eventType);
    
    for (const [category, percentage] of Object.entries(budgetAllocations)) {
      const existingItem = existingBudgetItems.find(item => 
        item.category.toLowerCase() === category.toLowerCase()
      );
      
      if (!existingItem) {
        const suggestedAmount = (eventBudget * percentage) / 100;
        const perPersonCost = suggestedAmount / guestCount;
        
        recommendations.push({
          category,
          suggestedAmount,
          currency: event.currency,
          reasoning: `Industry standard allocation: ${percentage}% of budget (${event.currency} ${perPersonCost.toFixed(2)} per guest)`,
          priority: this.getCategoryPriority(category),
          alternatives: this.generateBudgetAlternatives(category, suggestedAmount, event.currency)
        });
      }
    }

    return recommendations;
  }

  // Get budget allocations by event type
  private getBudgetAllocationsByEventType(eventType: string): { [category: string]: number } {
    const allocations: { [eventType: string]: { [category: string]: number } } = {
      'wedding': {
        'Venue': 40,
        'Catering': 30,
        'Photography': 10,
        'Flowers': 8,
        'Music/Entertainment': 7,
        'Transportation': 3,
        'Miscellaneous': 2
      },
      'corporate': {
        'Venue': 35,
        'Catering': 25,
        'AV Equipment': 15,
        'Speakers/Entertainment': 10,
        'Branding/Signage': 8,
        'Transportation': 4,
        'Miscellaneous': 3
      },
      'birthday': {
        'Venue': 30,
        'Catering': 35,
        'Entertainment': 15,
        'Decorations': 10,
        'Photography': 6,
        'Miscellaneous': 4
      },
      'default': {
        'Venue': 35,
        'Catering': 30,
        'Entertainment': 15,
        'Decorations': 10,
        'Photography': 6,
        'Miscellaneous': 4
      }
    };

    return allocations[eventType.toLowerCase()] || allocations.default;
  }

  // Get category priority
  private getCategoryPriority(category: string): 'essential' | 'recommended' | 'optional' {
    const essential = ['venue', 'catering'];
    const recommended = ['photography', 'entertainment', 'music', 'av equipment'];
    
    if (essential.some(cat => category.toLowerCase().includes(cat))) return 'essential';
    if (recommended.some(cat => category.toLowerCase().includes(cat))) return 'recommended';
    return 'optional';
  }

  // Generate budget alternatives
  private generateBudgetAlternatives(category: string, amount: number, currency: string): any[] {
    return [
      {
        option: 'Economy',
        cost: Math.round(amount * 0.7),
        description: 'Basic option with essential features'
      },
      {
        option: 'Premium',
        cost: Math.round(amount * 1.3),
        description: 'Enhanced option with additional features'
      },
      {
        option: 'Luxury',
        cost: Math.round(amount * 1.8),
        description: 'Top-tier option with premium features'
      }
    ];
  }

  // Timeline optimization recommendations
  async getTimelineRecommendations(eventId: string): Promise<EventRecommendation[]> {
    const event = await storage.getEvent(eventId);
    const tasks = await storage.getTasksByEvent(eventId);
    
    if (!event) return [];

    const recommendations: EventRecommendation[] = [];
    const eventDate = new Date(event.startDate);
    const daysUntilEvent = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    // Critical timeline recommendations
    if (daysUntilEvent < 30 && daysUntilEvent > 0) {
      const incompleteTasks = tasks.filter(task => task.status !== 'done');
      
      if (incompleteTasks.length > 0) {
        recommendations.push({
          type: 'timeline',
          title: 'Accelerate Task Completion',
          description: `${incompleteTasks.length} tasks remaining with ${daysUntilEvent} days until event`,
          priority: daysUntilEvent < 14 ? 'critical' : 'high',
          estimatedImpact: 'Ensures on-time event delivery',
          actionRequired: true,
          data: { incompleteTasks: incompleteTasks.length, daysUntilEvent }
        });
      }
    }

    // Task dependency recommendations
    const dependencyRecs = this.analyzeTaskDependencies(tasks, daysUntilEvent);
    recommendations.push(...dependencyRecs);

    return recommendations;
  }

  // Analyze task dependencies and generate recommendations
  private analyzeTaskDependencies(tasks: any[], daysUntilEvent: number): EventRecommendation[] {
    const recommendations: EventRecommendation[] = [];
    
    // Critical path analysis (simplified)
    const criticalTasks = tasks.filter(task => 
      task.title && (
        task.title.toLowerCase().includes('venue') ||
        task.title.toLowerCase().includes('catering') ||
        task.title.toLowerCase().includes('contract')
      )
    );

    const incompleteCritical = criticalTasks.filter(task => task.status !== 'done');
    
    if (incompleteCritical.length > 0 && daysUntilEvent < 60) {
      recommendations.push({
        type: 'timeline',
        title: 'Priority: Critical Path Tasks',
        description: `${incompleteCritical.length} critical tasks need immediate attention`,
        priority: 'high',
        estimatedImpact: 'Prevents timeline delays',
        actionRequired: true,
        data: { criticalTasks: incompleteCritical.map(t => t.title) }
      });
    }

    return recommendations;
  }

  // Get personalized recommendations based on client preferences
  async getPersonalizedRecommendations(eventId: string, clientPreferences?: any): Promise<EventRecommendation[]> {
    const baseRecommendations = await this.getEventRecommendations(eventId);
    
    if (!clientPreferences) return baseRecommendations;

    // Filter and prioritize based on preferences
    return baseRecommendations.map(rec => {
      if (clientPreferences.budgetConscious && rec.type === 'budget') {
        rec.priority = 'high';
      }
      if (clientPreferences.qualityFocused && rec.type === 'vendor') {
        const vendorRec = rec.data as VendorRecommendation;
        if (vendorRec.score > 80) rec.priority = 'high';
      }
      
      return rec;
    });
  }

  // Learning system - track recommendation effectiveness
  async trackRecommendationFeedback(eventId: string, recommendationId: string, feedback: 'accepted' | 'rejected' | 'modified', notes?: string): Promise<void> {
    // In a real implementation, this would store feedback to improve the AI model
    console.log(`Recommendation feedback for event ${eventId}: ${feedback}`, { recommendationId, notes });
    
    // This data could be used to:
    // 1. Improve vendor scoring algorithms
    // 2. Adjust budget allocation recommendations
    // 3. Enhance timeline optimization
    // 4. Personalize future recommendations
  }
}

export const aiRecommendationService = new AIRecommendationService();