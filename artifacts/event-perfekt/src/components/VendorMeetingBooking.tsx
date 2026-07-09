import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Plus,
  Video,
  Building,
  Phone,
  Edit,
  Trash,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";

interface Vendor {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  category: string;
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
  attendees: Array<{
    name: string;
    email: string;
    role: string;
    confirmed: boolean;
  }>;
  agenda: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  eventId: string;
  vendorId?: string;
}

interface VendorMeetingBookingProps {
  eventId: string;
  eventName: string;
  onMeetingCreated?: () => void;
}

export default function VendorMeetingBooking({ 
  eventId, 
  eventName, 
  onMeetingCreated 
}: VendorMeetingBookingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [meetingData, setMeetingData] = useState({
    title: '',
    description: '',
    meetingDate: '',
    meetingTime: '',
    duration: 60,
    location: '',
    meetingType: 'planning' as const,
    agenda: ''
  });

  // Get vendors for the event
  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ['/api/vendors'],
  });

  // Get existing meetings for the event
  const { data: meetings = [] } = useQuery<any[]>({
    queryKey: [`/api/events/${eventId}/meetings`],
  });

  // Create meeting mutation
  const createMeeting = useMutation({
    mutationFn: async (meetingPayload: any) => {
      const response = await apiRequest("POST", `/api/events/${eventId}/meetings`, meetingPayload);
      if (!response.ok) throw new Error("Failed to create meeting");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Meeting Scheduled",
        description: "Vendor meeting has been added to your calendar",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/meetings`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/upcoming-deadlines'] });
      setIsOpen(false);
      resetForm();
      onMeetingCreated?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to schedule meeting",
        variant: "destructive",
      });
    },
  });

  // Update meeting status mutation
  const updateMeetingStatus = useMutation({
    mutationFn: async ({ meetingId, status }: { meetingId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/meetings/${meetingId}`, { status });
      if (!response.ok) throw new Error("Failed to update meeting");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/meetings`] });
      toast({
        title: "Meeting Updated",
        description: "Meeting status has been updated",
      });
    },
  });

  const resetForm = () => {
    setMeetingData({
      title: '',
      description: '',
      meetingDate: '',
      meetingTime: '',
      duration: 60,
      location: '',
      meetingType: 'planning',
      agenda: ''
    });
    setSelectedVendor('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVendor || !meetingData.title || !meetingData.meetingDate || !meetingData.meetingTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const selectedVendorData = vendors.find((v: Vendor) => v.id === selectedVendor);
    
    const meetingPayload = {
      ...meetingData,
      title: `${meetingData.title} - ${selectedVendorData?.name}`,
      attendees: [
        {
          name: selectedVendorData?.contactName || selectedVendorData?.name,
          email: selectedVendorData?.email,
          role: 'vendor',
          confirmed: false
        }
      ],
      vendorId: selectedVendor,
      status: 'scheduled'
    };

    createMeeting.mutate(meetingPayload);
  };

  const getMeetingTypeColor = (type: string) => {
    switch (type) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'walkthrough': return 'bg-orange-100 text-orange-800';
      case 'final': return 'bg-green-100 text-green-800';
      case 'follow_up': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLocationIcon = (location: string) => {
    if (location.toLowerCase().includes('zoom') || location.toLowerCase().includes('meet')) {
      return <Video className="w-4 h-4" />;
    }
    if (location.toLowerCase().includes('office') || location.toLowerCase().includes('venue')) {
      return <Building className="w-4 h-4" />;
    }
    if (location.toLowerCase().includes('phone') || location.toLowerCase().includes('call')) {
      return <Phone className="w-4 h-4" />;
    }
    return <MapPin className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Book New Meeting Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            className="w-full" 
            style={{ backgroundColor: '#8B1538' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Book Vendor Meeting
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Vendor Meeting</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vendor Selection */}
              <div className="md:col-span-2">
                <Label>Select Vendor *</Label>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor: Vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{vendor.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {vendor.category}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Meeting Title */}
              <div className="md:col-span-2">
                <Label>Meeting Title *</Label>
                <Input
                  value={meetingData.title}
                  onChange={(e) => setMeetingData({...meetingData, title: e.target.value})}
                  placeholder="e.g., Menu Planning Discussion"
                  required
                />
              </div>

              {/* Meeting Type */}
              <div>
                <Label>Meeting Type</Label>
                <Select 
                  value={meetingData.meetingType} 
                  onValueChange={(value: any) => setMeetingData({...meetingData, meetingType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning Discussion</SelectItem>
                    <SelectItem value="walkthrough">Venue Walkthrough</SelectItem>
                    <SelectItem value="final">Final Confirmation</SelectItem>
                    <SelectItem value="follow_up">Follow-up Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div>
                <Label>Duration (minutes)</Label>
                <Select 
                  value={meetingData.duration.toString()} 
                  onValueChange={(value) => setMeetingData({...meetingData, duration: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={meetingData.meetingDate}
                  onChange={(e) => setMeetingData({...meetingData, meetingDate: e.target.value})}
                  required
                />
              </div>

              {/* Time */}
              <div>
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={meetingData.meetingTime}
                  onChange={(e) => setMeetingData({...meetingData, meetingTime: e.target.value})}
                  required
                />
              </div>

              {/* Location */}
              <div className="md:col-span-2">
                <Label>Location</Label>
                <Input
                  value={meetingData.location}
                  onChange={(e) => setMeetingData({...meetingData, location: e.target.value})}
                  placeholder="e.g., Venue address, Zoom meeting, Office"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={meetingData.description}
                  onChange={(e) => setMeetingData({...meetingData, description: e.target.value})}
                  placeholder="Meeting objectives and key discussion points"
                  rows={3}
                />
              </div>

              {/* Agenda */}
              <div className="md:col-span-2">
                <Label>Agenda</Label>
                <Textarea
                  value={meetingData.agenda}
                  onChange={(e) => setMeetingData({...meetingData, agenda: e.target.value})}
                  placeholder="Meeting agenda items"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={createMeeting.isPending}
                style={{ backgroundColor: '#8B1538' }}
                className="flex-1"
              >
                {createMeeting.isPending ? "Scheduling..." : "Schedule Meeting"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Scheduled Meetings List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Scheduled Vendor Meetings</h3>
        
        {meetings.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No vendor meetings scheduled yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Book your first vendor meeting to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          meetings.map((meeting: Meeting) => {
            const vendor = vendors.find((v: Vendor) => v.id === meeting.vendorId);
            
            return (
              <Card key={meeting.id} className="border-l-4 border-l-burgundy">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{meeting.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(`${meeting.meetingDate}T${meeting.meetingTime}`), 'MMM dd, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {meeting.meetingTime} ({meeting.duration}min)
                        </div>
                        {meeting.location && (
                          <div className="flex items-center gap-1">
                            {getLocationIcon(meeting.location)}
                            <span className="truncate max-w-[120px]">{meeting.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getMeetingTypeColor(meeting.meetingType)}>
                        {meeting.meetingType}
                      </Badge>
                      <Badge variant={
                        meeting.status === 'completed' ? 'default' :
                        meeting.status === 'scheduled' ? 'secondary' : 'destructive'
                      }>
                        {meeting.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {vendor && (
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{vendor.name}</p>
                          <p className="text-sm text-gray-600">{vendor.contactName}</p>
                        </div>
                        <Badge variant="outline">{vendor.category}</Badge>
                      </div>
                    </div>
                  )}

                  {meeting.description && (
                    <div>
                      <p className="text-sm font-medium mb-1">Description:</p>
                      <p className="text-sm text-gray-600">{meeting.description}</p>
                    </div>
                  )}

                  {meeting.agenda && (
                    <div>
                      <p className="text-sm font-medium mb-1">Agenda:</p>
                      <p className="text-sm text-gray-600">{meeting.agenda}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      {meeting.status === 'scheduled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateMeetingStatus.mutate({ 
                            meetingId: meeting.id, 
                            status: 'completed' 
                          })}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}