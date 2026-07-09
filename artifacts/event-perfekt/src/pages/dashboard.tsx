import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Users, 
  MapPin, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  FileText,
  Mail,
  Phone,
  ChevronRight,
  Star,
  AlertTriangle
} from "lucide-react";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

const upcomingEvents = [
  {
    id: 1,
    name: "Corporate Annual Gala 2025",
    date: "March 30, 2025",
    venue: "Grand Ballroom, Downtown Hotel",
    guests: 250,
    budget: "$75,000",
    status: "planning",
    progress: 25,
    planner: "Sarah Johnson",
    nextMilestone: "Vendor Selection"
  },
  {
    id: 2,
    name: "Johnson Wedding",
    date: "June 15, 2025",
    venue: "Oceanview Gardens",
    guests: 150,
    budget: "$45,000",
    status: "confirmed",
    progress: 60,
    planner: "Michael Chen",
    nextMilestone: "Final Menu Tasting"
  },
  {
    id: 3,
    name: "Tech Summit 2025",
    date: "September 20, 2025",
    venue: "Convention Center",
    guests: 500,
    budget: "$120,000",
    status: "initial",
    progress: 10,
    planner: "Emily Rodriguez",
    nextMilestone: "Venue Confirmation"
  }
];

const recentActivities = [
  {
    id: 1,
    event: "Corporate Annual Gala 2025",
    activity: "Venue contract signed",
    time: "2 hours ago",
    type: "milestone"
  },
  {
    id: 2,
    event: "Johnson Wedding",
    activity: "Menu tasting scheduled",
    time: "5 hours ago",
    type: "task"
  },
  {
    id: 3,
    event: "Tech Summit 2025",
    activity: "Initial planning meeting completed",
    time: "1 day ago",
    type: "meeting"
  },
  {
    id: 4,
    event: "Corporate Annual Gala 2025",
    activity: "Budget approved by client",
    time: "2 days ago",
    type: "approval"
  }
];

const statusColors: Record<string, string> = {
  planning: "bg-burgundy-800 text-white",
  confirmed: "bg-green-800 text-white",
  initial: "bg-blue-800 text-white"
};

const activityIcons: Record<string, any> = {
  milestone: CheckCircle,
  task: Clock,
  meeting: Users,
  approval: CreditCard
};

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-burgundy-900 via-burgundy-800 to-burgundy-900">
      {/* Header */}
      <header className="border-b border-burgundy-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img
              src={eventPerfektLogo}
              alt="Event Perfekt"
              className="h-12 w-auto rounded-lg bg-white p-1"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">Event Perfekt</h1>
              <p className="text-gray-300 text-sm">Planner Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className="bg-white text-burgundy-900">
              <Users className="w-4 h-4 mr-2" />
              3 Active Events
            </Badge>
            <Link href="/">
              <Button variant="ghost" className="text-white">
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Welcome back, Sarah!</h2>
          <p className="text-xl text-gray-300">Here's what's happening with your events today.</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Active Events", value: "3", icon: Calendar, color: "text-blue-400" },
            { label: "Total Guests", value: "900", icon: Users, color: "text-green-400" },
            { label: "This Month Revenue", value: "$240K", icon: TrendingUp, color: "text-white" },
            { label: "Pending Tasks", value: "12", icon: Clock, color: "text-red-400" }
          ].map((stat, index) => (
            <Card key={index} className="bg-white/10 backdrop-blur-sm border-burgundy-600">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">{stat.label}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upcoming Events */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-white">Upcoming Events</h3>
              <Button variant="ghost" className="text-white">
                View All
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="bg-white/10 backdrop-blur-sm border-burgundy-600">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-xl font-semibold text-white">{event.name}</h4>
                          <Badge className={statusColors[event.status]}>
                            {event.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-gray-300 text-sm">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {event.date}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            {event.venue}
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            {event.guests} guests
                          </div>
                          <div className="flex items-center">
                            <CreditCard className="w-4 h-4 mr-2" />
                            {event.budget}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{event.progress}%</div>
                        <div className="text-gray-300 text-sm">Complete</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-300">
                        <span className="font-medium">Next: </span>
                        {event.nextMilestone}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" className="text-white">
                          <FileText className="w-4 h-4 mr-2" />
                          Details
                        </Button>
                        <Link href="/event-timeline">
                          <Button size="sm" className="bg-white text-burgundy-900">
                            <Calendar className="w-4 h-4 mr-2" />
                            Timeline
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="space-y-8">
            {/* Recent Activity */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
              <Card className="bg-white/10 backdrop-blur-sm border-burgundy-600">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {recentActivities.map((activity) => {
                      const ActivityIcon = activityIcons[activity.type];
                      return (
                        <div key={activity.id} className="flex items-start space-x-3">
                          <div className="bg-white/20 p-2 rounded-full">
                            <ActivityIcon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{activity.event}</p>
                            <p className="text-gray-300 text-sm">{activity.activity}</p>
                            <p className="text-gray-400 text-xs">{activity.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button variant="ghost" className="w-full mt-4 text-white">
                    View All Activity
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button className="w-full bg-white text-burgundy-900 justify-start">
                  <Calendar className="w-4 h-4 mr-3" />
                  Create New Event
                </Button>
                <Button variant="outline" className="w-full border-white/50 text-white hover:bg-white/10 hover:border-white justify-start">
                  <Users className="w-4 h-4 mr-3" />
                  Manage Clients
                </Button>
                <Button variant="outline" className="w-full border-white/50 text-white hover:bg-white/10 hover:border-white justify-start">
                  <FileText className="w-4 h-4 mr-3" />
                  Generate Reports
                </Button>
                <Link href="/event-timeline">
                  <Button variant="outline" className="w-full border-white/50 text-white hover:bg-white/10 hover:border-white justify-start">
                    <TrendingUp className="w-4 h-4 mr-3" />
                    View Timeline Demo
                  </Button>
                </Link>
              </div>
            </div>

            {/* Alerts */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Alerts</h3>
              <Card className="bg-white/10 backdrop-blur-sm border-burgundy-600">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-sm font-medium">Menu tasting deadline approaching</p>
                      <p className="text-gray-300 text-sm">Johnson Wedding - Due in 3 days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Contact Footer */}
        <div className="mt-16 text-center">
          <div className="flex items-center justify-center space-x-6 text-gray-300 mb-4">
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              <span>admin@eventperfekt.com</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            © 2025 Event Perfekt. Professional Event Planning Services.
          </p>
        </div>
      </div>
    </div>
  );
}