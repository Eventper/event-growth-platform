import { storage } from './storage';
import { notificationService } from './notificationService';

export interface EventReview {
  id: string;
  eventId: string;
  reviewerId: string;
  reviewerType: 'client' | 'planner';
  targetId: string; // planner ID when client reviews, client ID when planner reviews
  targetType: 'planner' | 'client';
  rating: number; // 1-5 stars
  title: string;
  review: string;
  categories: {
    communication: number;
    professionalism: number;
    creativity: number;
    timelyDelivery: number;
    valueForMoney: number;
  };
  wouldRecommend: boolean;
  isPublic: boolean;
  isVerified: boolean;
  helpfulVotes: number;
  createdAt: Date;
  response?: {
    text: string;
    respondedAt: Date;
    respondedBy: string;
  };
}

export interface FeedbackMetrics {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { [rating: number]: number };
  categoryAverages: {
    communication: number;
    professionalism: number;
    creativity: number;
    timelyDelivery: number;
    valueForMoney: number;
  };
  recommendationRate: number;
  recentTrend: 'improving' | 'stable' | 'declining';
}

class FeedbackService {
  private reviews = new Map<string, EventReview[]>();
  private nextId = 1;

  // Submit a review
  async submitReview(review: Omit<EventReview, 'id' | 'createdAt' | 'helpfulVotes' | 'isVerified'>): Promise<EventReview> {
    const newReview: EventReview = {
      id: `review-${this.nextId++}`,
      ...review,
      helpfulVotes: 0,
      isVerified: await this.verifyReviewEligibility(review.eventId, review.reviewerId),
      createdAt: new Date()
    };

    // Store review
    const eventReviews = this.reviews.get(review.eventId) || [];
    eventReviews.push(newReview);
    this.reviews.set(review.eventId, eventReviews);

    // Send notification to the target person
    await this.notifyNewReview(newReview);

    return newReview;
  }

  // Verify if reviewer is eligible to review (was actually part of the event)
  private async verifyReviewEligibility(eventId: string, reviewerId: string): Promise<boolean> {
    const event = await storage.getEvent(eventId);
    if (!event) return false;

    // Check if reviewer was the client or planner for this event
    return event.clientId === reviewerId || event.plannerId === reviewerId;
  }

  // Get reviews for a specific target (planner or client)
  async getReviewsForTarget(targetId: string, targetType: 'planner' | 'client', includePrivate = false): Promise<EventReview[]> {
    const allReviews: EventReview[] = [];
    
    for (const eventReviews of this.reviews.values()) {
      const targetReviews = eventReviews.filter(review => 
        review.targetId === targetId && 
        review.targetType === targetType &&
        (includePrivate || review.isPublic)
      );
      allReviews.push(...targetReviews);
    }

    return allReviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Get reviews for a specific event
  async getEventReviews(eventId: string): Promise<EventReview[]> {
    return this.reviews.get(eventId) || [];
  }

  // Calculate feedback metrics for a target
  async getFeedbackMetrics(targetId: string, targetType: 'planner' | 'client'): Promise<FeedbackMetrics> {
    const reviews = await this.getReviewsForTarget(targetId, targetType, false);
    const verifiedReviews = reviews.filter(r => r.isVerified);

    if (verifiedReviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {},
        categoryAverages: {
          communication: 0,
          professionalism: 0,
          creativity: 0,
          timelyDelivery: 0,
          valueForMoney: 0
        },
        recommendationRate: 0,
        recentTrend: 'stable'
      };
    }

    // Calculate averages
    const totalRating = verifiedReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / verifiedReviews.length;

    // Rating distribution
    const ratingDistribution: { [rating: number]: number } = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = verifiedReviews.filter(r => r.rating === i).length;
    }

    // Category averages
    const categoryAverages = {
      communication: verifiedReviews.reduce((sum, r) => sum + r.categories.communication, 0) / verifiedReviews.length,
      professionalism: verifiedReviews.reduce((sum, r) => sum + r.categories.professionalism, 0) / verifiedReviews.length,
      creativity: verifiedReviews.reduce((sum, r) => sum + r.categories.creativity, 0) / verifiedReviews.length,
      timelyDelivery: verifiedReviews.reduce((sum, r) => sum + r.categories.timelyDelivery, 0) / verifiedReviews.length,
      valueForMoney: verifiedReviews.reduce((sum, r) => sum + r.categories.valueForMoney, 0) / verifiedReviews.length
    };

    // Recommendation rate
    const recommendCount = verifiedReviews.filter(r => r.wouldRecommend).length;
    const recommendationRate = (recommendCount / verifiedReviews.length) * 100;

    // Recent trend (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentReviews = verifiedReviews.filter(r => r.createdAt >= thirtyDaysAgo);
    const previousReviews = verifiedReviews.filter(r => r.createdAt >= sixtyDaysAgo && r.createdAt < thirtyDaysAgo);

    let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
    
    if (recentReviews.length > 0 && previousReviews.length > 0) {
      const recentAvg = recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length;
      const previousAvg = previousReviews.reduce((sum, r) => sum + r.rating, 0) / previousReviews.length;
      
      if (recentAvg > previousAvg + 0.2) recentTrend = 'improving';
      else if (recentAvg < previousAvg - 0.2) recentTrend = 'declining';
    }

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: verifiedReviews.length,
      ratingDistribution,
      categoryAverages: {
        communication: Math.round(categoryAverages.communication * 10) / 10,
        professionalism: Math.round(categoryAverages.professionalism * 10) / 10,
        creativity: Math.round(categoryAverages.creativity * 10) / 10,
        timelyDelivery: Math.round(categoryAverages.timelyDelivery * 10) / 10,
        valueForMoney: Math.round(categoryAverages.valueForMoney * 10) / 10
      },
      recommendationRate: Math.round(recommendationRate),
      recentTrend
    };
  }

  // Respond to a review
  async respondToReview(reviewId: string, responseText: string, responderId: string): Promise<boolean> {
    for (const eventReviews of this.reviews.values()) {
      const review = eventReviews.find(r => r.id === reviewId);
      if (review && review.targetId === responderId) {
        review.response = {
          text: responseText,
          respondedAt: new Date(),
          respondedBy: responderId
        };

        // Notify the original reviewer
        await notificationService.sendNotification({
          userId: review.reviewerId,
          eventId: review.eventId,
          type: 'timeline_update',
          title: 'Response to Your Review',
          message: `Your review has received a response: "${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}"`,
          actionUrl: `/reviews/${reviewId}`
        });

        return true;
      }
    }
    return false;
  }

  // Vote on review helpfulness
  async voteHelpful(reviewId: string, voterId: string): Promise<boolean> {
    for (const eventReviews of this.reviews.values()) {
      const review = eventReviews.find(r => r.id === reviewId);
      if (review) {
        // In a real implementation, track who voted to prevent duplicate votes
        review.helpfulVotes++;
        return true;
      }
    }
    return false;
  }

  // Get top-rated planners
  async getTopRatedPlanners(limit = 10): Promise<Array<{ plannerId: string; metrics: FeedbackMetrics }>> {
    const plannerIds = await storage.getAllPlannerIds();
    const plannerRatings: Array<{ plannerId: string; metrics: FeedbackMetrics }> = [];

    for (const plannerId of plannerIds) {
      const metrics = await this.getFeedbackMetrics(plannerId, 'planner');
      if (metrics.totalReviews >= 3) { // Only include planners with at least 3 reviews
        plannerRatings.push({ plannerId, metrics });
      }
    }

    return plannerRatings
      .sort((a, b) => {
        // Sort by average rating, then by total reviews
        if (b.metrics.averageRating !== a.metrics.averageRating) {
          return b.metrics.averageRating - a.metrics.averageRating;
        }
        return b.metrics.totalReviews - a.metrics.totalReviews;
      })
      .slice(0, limit);
  }

  // Generate review request for completed events
  async generateReviewRequest(eventId: string): Promise<void> {
    const event = await storage.getEvent(eventId);
    if (!event) return;

    const eventDate = new Date(event.startDate);
    const now = new Date();
    const daysSinceEvent = Math.ceil((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));

    // Send review request 3 days after event
    if (daysSinceEvent === 3) {
      // Request client to review planner
      if (event.clientId && event.plannerId) {
        await notificationService.sendNotification({
          userId: event.clientId,
          eventId,
          type: 'timeline_update',
          title: 'How was your event experience?',
          message: `We'd love to hear about your experience with ${event.name}. Your feedback helps us maintain our high standards.`,
          actionUrl: `/review/planner/${event.plannerId}?eventId=${eventId}`
        });

        // Request planner to review client (internal feedback)
        await notificationService.sendNotification({
          userId: event.plannerId,
          eventId,
          type: 'timeline_update',
          title: 'Client Feedback Request',
          message: `Please provide feedback about working with the client for ${event.name}.`,
          actionUrl: `/review/client/${event.clientId}?eventId=${eventId}`
        });
      }
    }
  }

  // Send notification for new review
  private async notifyNewReview(review: EventReview): Promise<void> {
    const reviewerName = await this.getUserName(review.reviewerId);
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

    await notificationService.sendNotification({
      userId: review.targetId,
      eventId: review.eventId,
      type: 'timeline_update',
      title: 'New Review Received',
      message: `${reviewerName} left a ${review.rating}-star review: "${review.title}" ${stars}`,
      actionUrl: `/reviews/${review.id}`
    });
  }

  // Helper to get user name
  private async getUserName(userId: string): Promise<string> {
    const user = await storage.getUser(userId);
    return user?.name || 'Someone';
  }

  // Flag inappropriate review
  async flagReview(reviewId: string, reason: string, flaggedBy: string): Promise<boolean> {
    // In a real implementation, this would be stored and reviewed by moderators
    console.log(`Review ${reviewId} flagged by ${flaggedBy} for: ${reason}`);
    return true;
  }

  // Get review insights for business analytics
  async getReviewInsights(): Promise<{
    totalReviews: number;
    averageRating: number;
    satisfactionRate: number;
    topIssues: string[];
    topPraises: string[];
  }> {
    const allReviews: EventReview[] = [];
    for (const eventReviews of this.reviews.values()) {
      allReviews.push(...eventReviews.filter(r => r.isVerified));
    }

    if (allReviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        satisfactionRate: 0,
        topIssues: [],
        topPraises: []
      };
    }

    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / allReviews.length;
    const satisfiedReviews = allReviews.filter(r => r.rating >= 4).length;
    const satisfactionRate = (satisfiedReviews / allReviews.length) * 100;

    // Extract common keywords from reviews (simplified)
    const lowRatingReviews = allReviews.filter(r => r.rating <= 2);
    const highRatingReviews = allReviews.filter(r => r.rating >= 4);

    const topIssues = this.extractKeywords(lowRatingReviews.map(r => r.review));
    const topPraises = this.extractKeywords(highRatingReviews.map(r => r.review));

    return {
      totalReviews: allReviews.length,
      averageRating: Math.round(averageRating * 10) / 10,
      satisfactionRate: Math.round(satisfactionRate),
      topIssues: topIssues.slice(0, 5),
      topPraises: topPraises.slice(0, 5)
    };
  }

  // Simple keyword extraction (in production, use NLP libraries)
  private extractKeywords(texts: string[]): string[] {
    const allWords = texts.join(' ').toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordCount: { [word: string]: number } = {};
    allWords.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }
}

export const feedbackService = new FeedbackService();