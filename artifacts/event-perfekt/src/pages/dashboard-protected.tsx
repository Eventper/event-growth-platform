import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "wouter";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  CheckSquare, 
  MessageSquare, 
  FileText,
  Settings,
  LogOut,
  Plus,
  Clock,
  TrendingUp,
  Heart,
  Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

export default function ProtectedDashboard() {
  const { user, logout, isPlanner, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    setLocation("/");
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  // Mock data for demonstration
  const upcomingEvents = [
    {
      id: "1",
      name: "Sarah & Michael's Wedding",
      date: "2024-09-15",
      status: "Planning",
      type: "Wedding",
      progress: 65
    },
    {
      id: "2", 
      name: "Tech Corp Annual Gala",
      date: "2024-10-02",
      status: "Confirmed",
      type: "Corporate",
      progress: 90
    },
    {
      id: "3",
      name: "Johnson Anniversary",
      date: "2024-09-28",
      status: "Initial",
      type: "Private",
      progress: 25
    }
  ];

  const recentActivities = [
    "Venue confirmed for Sarah & Michael's Wedding",
    "Budget approved for Tech Corp Annual Gala", 
    "New vendor added to Johnson Anniversary",
    "Client contract signed for Peterson Birthday Party",
    "Timeline updated for Martinez Corporate Event"
  ];

  const stats = {
    totalEvents: 12,
    activeEvents: 8,
    completedThisMonth: 4,
    totalRevenue: 75000,
    clientSatisfaction: 98
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: '#330311'}}>
      {/* Header */}
      <header style={{backgroundColor: '#2a0209'}} className="shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={eventPerfektLogo} 
                alt="Event Perfekt Logo" 
                className="h-12 w-auto rounded-lg p-1"
                style={{backgroundColor: '#330311'}}
              />
              <div>
                <h1 className="text-2xl font-bold text-white">Event Perfekt</h1>
                <p className="text-white text-sm">
                  {isAdmin ? "Admin Dashboard" : isPlanner ? "Planner Dashboard" : user?.role === 'staff' ? "Staff Dashboard" : "Client Dashboard"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-white text-right">
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-white/70">{user.email}</p>
                <Badge 
                  variant="secondary" 
                  className="text-xs mt-1"
                  style={{backgroundColor: '#A53B5C', color: 'white'}}
                >
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </div>
              <Button 
                onClick={handleLogout}
                variant="ghost" 
                className="text-white border border-white/50"
                style={{backgroundColor: 'transparent', color: 'white'}}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user.name}!
          </h2>
          <p className="text-white/80 text-lg">
            {isPlanner ? "Manage your events and clients from your professional dashboard" : "Track your event planning progress and communicate with your planner"}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <Button 
                className="w-full" 
                style={{backgroundColor: '#A53B5C', color: 'white'}}
                asChild
              >
                <Link href="/create-event">
                  <Plus className="mr-2 h-4 w-4" />
                  {isPlanner ? "New Event" : "New Request"}
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <Button 
                variant="outline" 
                className="w-full text-white border-white"
                style={{backgroundColor: 'transparent', color: 'white'}}
                asChild
              >
                <Link href="/management-dashboard">
                  <Calendar className="mr-2 h-4 w-4" />
                  Calendar
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <Button 
                variant="outline" 
                className="w-full text-white border-white"
                style={{backgroundColor: 'transparent', color: 'white'}}
                asChild
              >
                <Link href={isPlanner ? "/client-onboarding" : "/client-dashboard"}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {isPlanner ? "Clients" : "Messages"}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <Button 
                variant="outline" 
                className="w-full text-white border-white"
                style={{backgroundColor: 'transparent', color: 'white'}}
                asChild
              >
                <Link href="/planner-dashboard">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards (Planners/Admin Only) */}
        {(isPlanner || isAdmin) && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-white/80 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalEvents}</p>
                    <p className="text-white/70 text-sm">Total Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-white/80 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.activeEvents}</p>
                    <p className="text-white/70 text-sm">Active Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckSquare className="h-8 w-8 text-white/80 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.completedThisMonth}</p>
                    <p className="text-white/70 text-sm">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-white/80 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-white/70 text-sm">Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Heart className="h-8 w-8 text-white/80 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.clientSatisfaction}%</p>
                    <p className="text-white/70 text-sm">Satisfaction</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Events */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-semibold">{event.name}</h3>
                        <Badge 
                          variant="secondary"
                          style={{backgroundColor: '#A53B5C', color: 'white'}}
                        >
                          {event.type}
                        </Badge>
                      </div>
                      <p className="text-white/70 text-sm mb-3">
                        {new Date(event.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-white/70 text-sm mr-2">Progress:</span>
                          <div className="w-20 bg-white/20 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full"
                              style={{backgroundColor: '#A53B5C', width: `${event.progress}%`}}
                            ></div>
                          </div>
                          <span className="text-white/70 text-sm ml-2">{event.progress}%</span>
                        </div>
                        <Badge variant="outline" className="text-white border-white/50">
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Separator className="my-4 bg-white/20" />
                
                <Button 
                  className="w-full" 
                  variant="outline"
                  style={{backgroundColor: 'transparent', color: 'white', borderColor: 'white'}}
                  asChild
                >
                  <Link href="/management-dashboard">
                    View All Events
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-2 h-2 rounded-full mt-2 mr-3" style={{backgroundColor: '#A53B5C'}}></div>
                      <p className="text-white/80 text-sm">{activity}</p>
                    </div>
                  ))}
                </div>
                
                <Separator className="my-4 bg-white/20" />
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-white border-white"
                  style={{backgroundColor: 'transparent', color: 'white'}}
                  asChild
                >
                  <Link href="/management-dashboard">
                    View All Activity
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Quick Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-white"
                    asChild
                  >
                    <Link href="/vendor-management">
                      <Building2 className="mr-2 h-4 w-4" />
                      Vendor Management
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-white"
                    asChild
                  >
                    <Link href="/budget-management">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Budget Tracking
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-white"
                    asChild
                  >
                    <Link href="/project-management">
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Task Management
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-white"
                    asChild
                  >
                    <Link href="/contract-management">
                      <FileText className="mr-2 h-4 w-4" />
                      Contracts & Documents
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feature Showcase */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            {isPlanner ? "Professional Planning Tools" : "Your Event Journey"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6 text-center">
                <Calendar className="h-12 w-12 text-white/80 mx-auto mb-4" />
                <h4 className="text-white font-semibold mb-2">Timeline Management</h4>
                <p className="text-white/70 text-sm">
                  Agent-powered timeline creation and milestone tracking for seamless event execution.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-white/80 mx-auto mb-4" />
                <h4 className="text-white font-semibold mb-2">Vendor Network</h4>
                <p className="text-white/70 text-sm">
                  Access to our curated network of premium vendors and real-time availability.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6 text-center">
                <DollarSign className="h-12 w-12 text-white/80 mx-auto mb-4" />
                <h4 className="text-white font-semibold mb-2">Budget Intelligence</h4>
                <p className="text-white/70 text-sm">
                  Smart budget allocation and real-time cost tracking with predictive insights.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}