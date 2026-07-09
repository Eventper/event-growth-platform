import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  MapPin,
  Video,
  Building,
  Phone
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  eventId: string;
}

interface Meeting {
  id: string;
  title: string;
  description: string;
  meetingDate: string;
  meetingTime: string;
  duration: number;
  location: string;
  meetingType: 'planning' | 'walkthrough' | 'final' | 'follow_up';
  status: 'scheduled' | 'completed' | 'cancelled';
  eventId: string;
  vendorId?: string;
  attendees: Array<{
    name: string;
    email: string;
    role: string;
    confirmed: boolean;
  }>;
}

interface EventTaskCalendarProps {
  eventId: string;
  className?: string;
}

export default function EventTaskCalendar({ eventId, className = "" }: EventTaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get tasks for the event
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: [`/api/events/${eventId}/tasks`],
  });

  // Get meetings for the event
  const { data: meetings = [] } = useQuery<any[]>({
    queryKey: [`/api/events/${eventId}/meetings`],
  });

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  // Get calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get items for a specific date
  const getItemsForDate = (date: Date) => {
    const dayTasks = tasks.filter((task: Task) => 
      isSameDay(new Date(task.dueDate), date)
    );
    
    const dayMeetings = meetings.filter((meeting: Meeting) => 
      isSameDay(new Date(meeting.meetingDate), date)
    );

    return { tasks: dayTasks, meetings: dayMeetings };
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get meeting type color
  const getMeetingTypeColor = (type: string) => {
    switch (type) {
      case 'planning': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'walkthrough': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'final': return 'bg-green-100 text-green-800 border-green-200';
      case 'follow_up': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string, type: 'task' | 'meeting') => {
    if (type === 'task') {
      switch (status) {
        case 'completed': return <CheckCircle className="w-3 h-3 text-green-600" />;
        case 'in_progress': return <Clock className="w-3 h-3 text-yellow-600" />;
        case 'pending': return <AlertCircle className="w-3 h-3 text-red-600" />;
        default: return <Clock className="w-3 h-3 text-gray-600" />;
      }
    } else {
      switch (status) {
        case 'completed': return <CheckCircle className="w-3 h-3 text-green-600" />;
        case 'scheduled': return <Calendar className="w-3 h-3 text-blue-600" />;
        case 'cancelled': return <AlertCircle className="w-3 h-3 text-red-600" />;
        default: return <Calendar className="w-3 h-3 text-gray-600" />;
      }
    }
  };

  // Get location icon for meetings
  const getLocationIcon = (location: string) => {
    if (location.toLowerCase().includes('zoom') || location.toLowerCase().includes('meet')) {
      return <Video className="w-3 h-3" />;
    }
    if (location.toLowerCase().includes('office') || location.toLowerCase().includes('venue')) {
      return <Building className="w-3 h-3" />;
    }
    if (location.toLowerCase().includes('phone') || location.toLowerCase().includes('call')) {
      return <Phone className="w-3 h-3" />;
    }
    return <MapPin className="w-3 h-3" />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Event Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-lg font-semibold min-w-[140px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </h3>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day) => {
              const { tasks: dayTasks, meetings: dayMeetings } = getItemsForDate(day);
              const hasItems = dayTasks.length > 0 || dayMeetings.length > 0;
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    min-h-[80px] p-1 border rounded cursor-pointer transition-colors
                    ${isSelected ? 'bg-burgundy bg-opacity-10 border-burgundy' : 'border-gray-200'}
                    ${hasItems ? 'bg-blue-50' : ''}
                    ${!isCurrentMonth ? 'text-gray-300' : 'hover:bg-gray-50'}
                  `}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(day, 'd')}
                  </div>
                  
                  {/* Task indicators */}
                  <div className="space-y-1">
                    {dayTasks.slice(0, 2).map((task: Task) => (
                      <div 
                        key={task.id}
                        className="text-xs p-1 rounded bg-opacity-80 border truncate"
                        style={{ backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }}
                      >
                        <div className="flex items-center gap-1">
                          {getStatusIcon(task.status, 'task')}
                          <span className="truncate">{task.title}</span>
                        </div>
                      </div>
                    ))}

                    {/* Meeting indicators */}
                    {dayMeetings.slice(0, 2).map((meeting: Meeting) => (
                      <div 
                        key={meeting.id}
                        className={`text-xs p-1 rounded border truncate ${getMeetingTypeColor(meeting.meetingType)}`}
                      >
                        <div className="flex items-center gap-1">
                          {getStatusIcon(meeting.status, 'meeting')}
                          <span className="truncate">{meeting.title}</span>
                        </div>
                      </div>
                    ))}

                    {/* Show indicator for more items */}
                    {(dayTasks.length + dayMeetings.length) > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{(dayTasks.length + dayMeetings.length) - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
              <span>Tasks</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span>Meetings</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-yellow-600" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-600" />
              <span>Pending</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const { tasks: selectedTasks, meetings: selectedMeetings } = getItemsForDate(selectedDate);
              
              if (selectedTasks.length === 0 && selectedMeetings.length === 0) {
                return (
                  <p className="text-gray-500 text-center py-4">
                    No tasks or meetings scheduled for this date
                  </p>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Tasks for selected date */}
                  {selectedTasks.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Tasks ({selectedTasks.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedTasks.map((task: Task) => (
                          <div key={task.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getStatusIcon(task.status, 'task')}
                                  <h5 className="font-medium">{task.title}</h5>
                                  <Badge className={getPriorityColor(task.priority)}>
                                    {task.priority}
                                  </Badge>
                                </div>
                                {task.description && (
                                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                )}
                                <div className="text-xs text-gray-500 mt-2">
                                  Assigned to: {task.assignedTo}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meetings for selected date */}
                  {selectedMeetings.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Meetings ({selectedMeetings.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedMeetings.map((meeting: Meeting) => (
                          <div key={meeting.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getStatusIcon(meeting.status, 'meeting')}
                                  <h5 className="font-medium">{meeting.title}</h5>
                                  <Badge className={getMeetingTypeColor(meeting.meetingType)}>
                                    {meeting.meetingType}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {meeting.meetingTime} ({meeting.duration}min)
                                  </div>
                                  {meeting.location && (
                                    <div className="flex items-center gap-1">
                                      {getLocationIcon(meeting.location)}
                                      <span className="truncate">{meeting.location}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                                  </div>
                                </div>
                                {meeting.description && (
                                  <p className="text-sm text-gray-600 mt-2">{meeting.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}