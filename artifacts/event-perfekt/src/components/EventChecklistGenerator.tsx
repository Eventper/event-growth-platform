import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Calendar, Users, MapPin, DollarSign, Star, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addWeeks, addDays, isAfter, isBefore } from "date-fns";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'planning' | 'venue' | 'vendors' | 'logistics' | 'final';
  priority: 'high' | 'medium' | 'low';
  dueDate: Date;
  completed: boolean;
  dependencies?: string[];
  estimatedTime: string;
}

interface EventChecklistGeneratorProps {
  eventType: 'private' | 'corporate';
  eventCategory?: string;
  eventDate: Date;
  guestCount: number;
  budget: number;
  services: {
    needsVenue?: boolean;
    needsDecor?: boolean;
    needsCatering?: boolean;
    needsPhotography?: boolean;
    needsEntertainment?: boolean;
    needsTransport?: boolean;
  };
  onChecklistGenerated?: (checklist: ChecklistItem[]) => void;
}

export function EventChecklistGenerator({
  eventType,
  eventCategory,
  eventDate,
  guestCount,
  budget,
  services,
  onChecklistGenerated
}: EventChecklistGeneratorProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'planning' | 'venue' | 'vendors' | 'logistics' | 'final'>('all');
  const [showCompleted, setShowCompleted] = useState(true);

  useEffect(() => {
    generateChecklist();
  }, [eventType, eventCategory, eventDate, guestCount, budget, services]);

  const generateChecklist = () => {
    setLoading(true);
    
    const baseChecklist: Omit<ChecklistItem, 'id' | 'dueDate'>[] = [
      // Planning Phase (8-12 weeks before)
      {
        title: "Create Event Vision & Theme",
        description: "Define the overall concept, theme, and visual direction for your event",
        category: 'planning',
        priority: 'high',
        completed: false,
        estimatedTime: "2-3 hours"
      },
      {
        title: "Set Final Budget Breakdown",
        description: "Allocate budget across all categories: venue, catering, decor, entertainment, etc.",
        category: 'planning',
        priority: 'high',
        completed: false,
        estimatedTime: "1-2 hours"
      },
      {
        title: "Create Guest List",
        description: "Finalize attendee list and collect contact information",
        category: 'planning',
        priority: 'high',
        completed: false,
        estimatedTime: "2-4 hours"
      },
      
      // Venue & Location (6-10 weeks before)
      {
        title: "Secure Primary Venue",
        description: "Book and confirm main event location with signed contract",
        category: 'venue',
        priority: 'high',
        completed: false,
        dependencies: ["Create Event Vision & Theme"],
        estimatedTime: "4-6 hours"
      },
      {
        title: "Venue Site Visit & Planning",
        description: "Conduct detailed site inspection and create floor plans",
        category: 'venue',
        priority: 'medium',
        completed: false,
        dependencies: ["Secure Primary Venue"],
        estimatedTime: "2-3 hours"
      },
      
      // Vendor Management (4-8 weeks before)
      {
        title: "Book Catering Services",
        description: "Select menu, confirm dietary requirements, and finalize catering contract",
        category: 'vendors',
        priority: 'high',
        completed: false,
        estimatedTime: "3-4 hours"
      },
      {
        title: "Hire Photography/Videography",
        description: "Select photographer/videographer and confirm coverage details",
        category: 'vendors',
        priority: 'medium',
        completed: false,
        estimatedTime: "2-3 hours"
      },
      {
        title: "Book Entertainment",
        description: "Secure musicians, DJ, or entertainment acts with contracts",
        category: 'vendors',
        priority: 'medium',
        completed: false,
        estimatedTime: "2-4 hours"
      },
      
      // Logistics (2-4 weeks before)
      {
        title: "Send Invitations",
        description: "Distribute invitations and track RSVPs",
        category: 'logistics',
        priority: 'high',
        completed: false,
        dependencies: ["Create Guest List"],
        estimatedTime: "2-3 hours"
      },
      {
        title: "Arrange Transportation",
        description: "Coordinate guest transportation and parking arrangements",
        category: 'logistics',
        priority: 'medium',
        completed: false,
        estimatedTime: "1-2 hours"
      },
      {
        title: "Order Decorations & Flowers",
        description: "Finalize decor elements, floral arrangements, and styling details",
        category: 'logistics',
        priority: 'medium',
        completed: false,
        dependencies: ["Create Event Vision & Theme"],
        estimatedTime: "3-4 hours"
      },
      
      // Final Preparations (1 week before)
      {
        title: "Final Headcount Confirmation",
        description: "Confirm final guest numbers with all vendors",
        category: 'final',
        priority: 'high',
        completed: false,
        dependencies: ["Send Invitations"],
        estimatedTime: "1 hour"
      },
      {
        title: "Create Day-of Timeline",
        description: "Develop detailed minute-by-minute schedule for event day",
        category: 'final',
        priority: 'high',
        completed: false,
        estimatedTime: "2-3 hours"
      },
      {
        title: "Prepare Emergency Kit",
        description: "Assemble emergency supplies and backup plans",
        category: 'final',
        priority: 'medium',
        completed: false,
        estimatedTime: "1 hour"
      }
    ];

    // Add event-type specific items
    if (eventType === 'private') {
      if (eventCategory === 'Wedding') {
        baseChecklist.push(
          {
            title: "Book Officiant",
            description: "Secure ceremony officiant and discuss ceremony details",
            category: 'vendors',
            priority: 'high',
            completed: false,
            estimatedTime: "2 hours"
          },
          {
            title: "Marriage License",
            description: "Obtain marriage license from local authorities",
            category: 'logistics',
            priority: 'high',
            completed: false,
            estimatedTime: "2 hours"
          },
          {
            title: "Wedding Rehearsal",
            description: "Coordinate and conduct wedding ceremony rehearsal",
            category: 'final',
            priority: 'high',
            completed: false,
            estimatedTime: "2 hours"
          }
        );
      }
    } else if (eventType === 'corporate') {
      baseChecklist.push(
        {
          title: "AV Equipment Setup",
          description: "Arrange sound system, projectors, and presentation equipment",
          category: 'logistics',
          priority: 'high',
          completed: false,
          estimatedTime: "2-3 hours"
        },
        {
          title: "Speaker Coordination",
          description: "Confirm speakers, presentations, and technical requirements",
          category: 'vendors',
          priority: 'high',
          completed: false,
          estimatedTime: "3-4 hours"
        },
        {
          title: "Brand Materials",
          description: "Prepare branded signage, swag, and marketing materials",
          category: 'logistics',
          priority: 'medium',
          completed: false,
          estimatedTime: "4-5 hours"
        }
      );
    }

    // Generate due dates based on event date
    const checklistWithDates: ChecklistItem[] = baseChecklist.map((item, index) => {
      let dueDate: Date;
      
      switch (item.category) {
        case 'planning':
          dueDate = addWeeks(eventDate, -10); // 10 weeks before
          break;
        case 'venue':
          dueDate = addWeeks(eventDate, -8); // 8 weeks before
          break;
        case 'vendors':
          dueDate = addWeeks(eventDate, -6); // 6 weeks before
          break;
        case 'logistics':
          dueDate = addWeeks(eventDate, -3); // 3 weeks before
          break;
        case 'final':
          dueDate = addWeeks(eventDate, -1); // 1 week before
          break;
        default:
          dueDate = addWeeks(eventDate, -4);
      }

      return {
        ...item,
        id: `${item.category}-${index}`,
        dueDate: addDays(dueDate, index * 2) // Spread tasks within category
      };
    });

    // Sort by due date
    const sortedChecklist = checklistWithDates.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    
    setChecklist(sortedChecklist);
    onChecklistGenerated?.(sortedChecklist);
    setLoading(false);
  };

  const toggleItemCompletion = (itemId: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  };

  const filteredChecklist = checklist.filter(item => {
    if (filter !== 'all' && item.category !== filter) return false;
    if (!showCompleted && item.completed) return false;
    return true;
  });

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-white';
      case 'low': return 'text-green-400';
      default: return 'text-white';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'planning': return <Star className="w-4 h-4" />;
      case 'venue': return <MapPin className="w-4 h-4" />;
      case 'vendors': return <Users className="w-4 h-4" />;
      case 'logistics': return <Calendar className="w-4 h-4" />;
      case 'final': return <Clock className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const isOverdue = (dueDate: Date) => isBefore(dueDate, new Date());
  const isDueSoon = (dueDate: Date) => {
    const threeDaysFromNow = addDays(new Date(), 3);
    return isAfter(dueDate, new Date()) && isBefore(dueDate, threeDaysFromNow);
  };

  if (loading) {
    return (
      <div className="bg-burgundy-800 rounded-lg p-6 border border-burgundy-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Generating your personalized event checklist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-burgundy-800 rounded-lg p-6 border border-burgundy-700">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Event Planning Checklist</h3>
          <div className="text-sm text-burgundy-200">
            {completedCount} of {totalCount} tasks completed
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-burgundy-700 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-white to-gray-100 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="text-sm text-burgundy-200 mb-4">
          {Math.round(progressPercentage)}% complete
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(['all', 'planning', 'venue', 'vendors', 'logistics', 'final'] as const).map(category => (
            <Button
              key={category}
              variant={filter === category ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(category)}
              className={cn(
                "text-xs",
                filter === category 
                  ? "bg-white text-burgundy-900 hover:bg-gray-100" 
                  : "border-burgundy-600 text-burgundy-200 hover:bg-burgundy-700"
              )}
            >
              {category === 'all' ? 'All Tasks' : category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className="border-burgundy-600 text-burgundy-200 hover:bg-burgundy-700 text-xs ml-2"
          >
            {showCompleted ? 'Hide' : 'Show'} Completed
          </Button>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredChecklist.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start space-x-3 p-4 rounded-lg border transition-all duration-200",
              item.completed 
                ? "bg-burgundy-900/50 border-burgundy-600" 
                : "bg-burgundy-700 border-burgundy-600 hover:bg-burgundy-600"
            )}
          >
            <button
              onClick={() => toggleItemCompletion(item.id)}
              className="flex-shrink-0 mt-1"
            >
              {item.completed ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : (
                <Circle className="w-5 h-5 text-burgundy-400 hover:text-white" />
              )}
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    {getCategoryIcon(item.category)}
                    <h4 className={cn(
                      "font-medium",
                      item.completed ? "text-burgundy-300 line-through" : "text-white"
                    )}>
                      {item.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        getPriorityColor(item.priority),
                        "border-current"
                      )}
                    >
                      {item.priority}
                    </Badge>
                  </div>
                  
                  <p className={cn(
                    "text-sm mb-2",
                    item.completed ? "text-burgundy-400" : "text-burgundy-200"
                  )}>
                    {item.description}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-burgundy-300">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>Due: {format(item.dueDate, 'MMM d, yyyy')}</span>
                      {isOverdue(item.dueDate) && !item.completed && (
                        <AlertTriangle className="w-3 h-3 text-red-400 ml-1" />
                      )}
                      {isDueSoon(item.dueDate) && !item.completed && (
                        <Clock className="w-3 h-3 text-white ml-1" />
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{item.estimatedTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredChecklist.length === 0 && (
        <div className="text-center py-8">
          <p className="text-burgundy-300">No tasks match your current filter.</p>
        </div>
      )}
    </div>
  );
}