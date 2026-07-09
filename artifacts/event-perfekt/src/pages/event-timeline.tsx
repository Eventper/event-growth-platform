import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DynamicEventTimeline } from "@/components/DynamicEventTimeline";
import { 
  Calendar, 
  ArrowLeft,
  Clock,
  Users,
  MapPin,
  DollarSign,
  Star,
  CheckCircle,
  AlertCircle,
  Palette,
  CreditCard,
  Mail,
  FileText,
  Utensils,
  Music,
  Camera,
  Phone,
  CheckCircle2
} from "lucide-react";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

const timelinePhases = [
  {
    id: 1,
    title: "Initial Planning",
    period: "6+ Months Before",
    color: "bg-burgundy-900",
    completedColor: "bg-green-600",
    tasks: [
      { id: 1, title: "Event Concept Development", status: "completed", dueDate: "2024-09-15", assignee: "Sarah Johnson" },
      { id: 2, title: "Budget Planning & Allocation", status: "completed", dueDate: "2024-09-20", assignee: "Michael Chen" },
      { id: 3, title: "Venue Research & Selection", status: "completed", dueDate: "2024-10-01", assignee: "Emily Rodriguez" },
      { id: 4, title: "Save the Date Distribution", status: "in-progress", dueDate: "2024-10-15", assignee: "Sarah Johnson" }
    ]
  },
  {
    id: 2,
    title: "Detailed Planning",
    period: "3-6 Months Before",
    color: "bg-burgundy-800",
    completedColor: "bg-green-600",
    tasks: [
      { id: 5, title: "Vendor Selection & Contracts", status: "in-progress", dueDate: "2024-11-01", assignee: "Michael Chen" },
      { id: 6, title: "Menu Planning & Tasting", status: "pending", dueDate: "2024-11-15", assignee: "Emily Rodriguez" },
      { id: 7, title: "Entertainment Booking", status: "pending", dueDate: "2024-11-20", assignee: "Sarah Johnson" },
      { id: 8, title: "Photography & Videography", status: "pending", dueDate: "2024-12-01", assignee: "Michael Chen" }
    ]
  },
  {
    id: 3,
    title: "Final Preparations",
    period: "0-3 Months Before",
    color: "bg-burgundy-700",
    completedColor: "bg-green-600",
    tasks: [
      { id: 9, title: "Guest List Finalization", status: "pending", dueDate: "2025-01-15", assignee: "Emily Rodriguez" },
      { id: 10, title: "Decor & Theme Finalization", status: "pending", dueDate: "2025-02-01", assignee: "Sarah Johnson" },
      { id: 11, title: "Final Vendor Confirmations", status: "pending", dueDate: "2025-02-15", assignee: "Michael Chen" },
      { id: 12, title: "Timeline & Day-of Coordination", status: "pending", dueDate: "2025-03-01", assignee: "Emily Rodriguez" }
    ]
  },
  {
    id: 4,
    title: "Event Execution",
    period: "Final Month",
    color: "bg-burgundy-600",
    completedColor: "bg-green-600",
    tasks: [
      { id: 13, title: "Final Headcount & Seating", status: "pending", dueDate: "2025-03-15", assignee: "Sarah Johnson" },
      { id: 14, title: "Rehearsal Coordination", status: "pending", dueDate: "2025-03-28", assignee: "Michael Chen" },
      { id: 15, title: "Day-of Event Management", status: "pending", dueDate: "2025-03-30", assignee: "All Team" },
      { id: 16, title: "Post-Event Follow-up", status: "pending", dueDate: "2025-04-05", assignee: "Emily Rodriguez" }
    ]
  }
];

const statusIcons: Record<string, any> = {
  completed: CheckCircle,
  'in-progress': Clock,
  pending: AlertCircle
};

const statusColors: Record<string, string> = {
  completed: "text-green-500",
  'in-progress': "text-contrast-light",
  pending: "text-contrast-auto"
};

const categoryIcons: Record<string, any> = {
  "Event Concept Development": Palette,
  "Budget Planning & Allocation": CreditCard,
  "Venue Research & Selection": MapPin,
  "Save the Date Distribution": Mail,
  "Vendor Selection & Contracts": FileText,
  "Menu Planning & Tasting": Utensils,
  "Entertainment Booking": Music,
  "Photography & Videography": Camera,
  "Guest List Finalization": Users,
  "Decor & Theme Finalization": Palette,
  "Final Vendor Confirmations": CheckCircle,
  "Timeline & Day-of Coordination": Calendar,
  "Final Headcount & Seating": Users,
  "Rehearsal Coordination": Clock,
  "Day-of Event Management": Calendar,
  "Post-Event Follow-up": Phone
};

// Sample event data for demonstration
const sampleEventData = {
  id: 'sample-event-1',
  name: 'Corporate Annual Gala',
  date: new Date('2025-06-15'),
  type: 'corporate' as const,
  category: 'gala',
  guestCount: 250,
  budget: 75000,
  complexity: 'complex' as const,
  currentPhase: 'detailed'
};

export default function EventTimeline() {
  const [selectedEvent, setSelectedEvent] = useState(sampleEventData);
  const [activeTab, setActiveTab] = useState('timeline');

  const handleTaskUpdate = (taskId: string, status: string) => {
    console.log('Task updated:', taskId, status);
    // Here you would typically update the task in your backend
  };

  const handleMilestoneUpdate = (milestoneId: string, status: string) => {
    console.log('Milestone updated:', milestoneId, status);
    // Here you would typically update the milestone in your backend
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-burgundy-900 via-burgundy-800 to-burgundy-900">
      {/* Header */}
      <header className="border-b border-burgundy-700 bg-burgundy-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={eventPerfektLogo} 
                alt="Event Perfekt Logo" 
                className="h-12 w-auto rounded-lg bg-white p-1"
              />
              <div>
                <h1 className="text-2xl font-bold text-white">Event Perfekt</h1>
                <p className="text-white text-sm">Planning Portal</p>
              </div>
            </div>
            <Link href="/planner-dashboard">
              <Button variant="ghost" className="text-white hover:bg-burgundy-700">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Dynamic Event Timeline Component */}
      <DynamicEventTimeline
        eventId={selectedEvent.id}
        eventDate={selectedEvent.date}
        eventType={selectedEvent.type}
        eventCategory={selectedEvent.category}
        guestCount={selectedEvent.guestCount}
        budget={selectedEvent.budget}
        complexity={selectedEvent.complexity}
        currentPhase={selectedEvent.currentPhase}
        onTaskUpdate={handleTaskUpdate}
        onMilestoneUpdate={handleMilestoneUpdate}
      />
    </div>
  );
}
