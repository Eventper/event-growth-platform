import { Link } from "wouter";
import { Users, CheckSquare, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Event, User } from "@shared/schema";

interface EventCardProps {
  event: Event & { planner?: User | null; tasks?: any[]; };
}

export default function EventCard({ event }: EventCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "planning": return "bg-burgundy-100 text-burgundy-800";
      case "completed": return "bg-gray-100 text-gray-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatBudget = (budget: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(budget));
  };

  const completedTasks = event.tasks?.filter(task => task.completed).length || 0;
  const totalTasks = event.tasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const plannerInitials = event.planner?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || "?";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/event-dashboard/${event.id}`}>
        <div className="block cursor-pointer">
          <div className="relative h-48">
            {event.heroImage ? (
              <img 
                src={event.heroImage} 
                alt={event.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-burgundy-500 to-burgundy-700 flex items-center justify-center">
                <span className="text-white text-lg font-medium">{event.name}</span>
              </div>
            )}
            <div className="absolute top-4 right-4">
              <Badge className={getStatusColor(event.status)}>
                {event.status}
              </Badge>
            </div>
            <div className="absolute bottom-4 left-4">
              <Badge variant="secondary" className="bg-white bg-opacity-90 text-gray-900">
                {formatDate(event.startDate)}
              </Badge>
            </div>
          </div>
        </div>
      </Link>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{event.name}</h3>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-1">{event.ceremonyVenue || event.receptionVenue || `${event.city}, ${event.country}`}</p>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-burgundy-100 rounded-full flex items-center justify-center">
              <span className="text-burgundy-800 text-xs font-medium">{plannerInitials}</span>
            </div>
            <span className="text-sm text-gray-600">{event.planner?.name || "Unassigned"}</span>
          </div>
          <span className="text-lg font-bold text-burgundy-800">{formatBudget(event.budget)}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <Users className="mr-1 h-4 w-4" />
              {event.guestCount} guests
            </span>
            <span className="flex items-center">
              <CheckSquare className="mr-1 h-4 w-4" />
              {completedTasks}/{totalTasks}
            </span>
          </div>
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                progressPercent === 100 ? 'bg-green-600' : 'bg-burgundy-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
