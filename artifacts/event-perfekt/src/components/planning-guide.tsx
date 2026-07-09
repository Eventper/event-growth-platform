import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus, Users, CheckSquare, DollarSign, FileText, Building } from "lucide-react";

export default function PlanningGuide() {
  const steps = [
    {
      icon: CalendarPlus,
      title: "Create Event",
      description: "Start by creating a new event with basic details like name, date, venue, and guest count",
      action: "Click 'New Event' button in the header",
      status: "First Step"
    },
    {
      icon: Users,
      title: "Assign Planner",
      description: "Select an event planner from your team to manage the event",
      action: "Choose from available planners in the form",
      status: "Setup"
    },
    {
      icon: CheckSquare,
      title: "Create Checklist",
      description: "Add tasks and to-do items for your event planning process",
      action: "Go to event details > Checklist tab > Add tasks",
      status: "Planning"
    },
    {
      icon: Building,
      title: "Manage Vendors",
      description: "Add vendors like caterers, photographers, florists with contact info and costs",
      action: "Use the Vendors tab to add and track vendor details",
      status: "Coordination"
    },
    {
      icon: DollarSign,
      title: "Track Budget",
      description: "Monitor estimated vs actual costs for different categories",
      action: "Budget tab shows spending breakdown and payment status",
      status: "Financial"
    },
    {
      icon: FileText,
      title: "Manage Contracts",
      description: "Upload and track contracts with vendors and service providers",
      action: "Contracts tab for document management",
      status: "Legal"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "First Step": return "bg-burgundy-100 text-burgundy-800";
      case "Setup": return "bg-blue-100 text-blue-800"; 
      case "Planning": return "bg-burgundy-100 text-burgundy-800";
      case "Coordination": return "bg-green-100 text-green-800";
      case "Financial": return "bg-purple-100 text-purple-800";
      case "Legal": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>📋 How to Plan Events with EventPro</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-8 h-8 bg-burgundy-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-burgundy-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900">{step.title}</h4>
                      <Badge className={getStatusColor(step.status)} variant="secondary">
                        {step.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                <p className="text-xs text-burgundy-600 font-medium">{step.action}</p>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-burgundy-50 rounded-lg">
          <h4 className="font-medium text-burgundy-900 mb-2">Quick Start Tips:</h4>
          <ul className="text-sm text-burgundy-800 space-y-1">
            <li>• Sample events are already loaded - click on any event card to explore</li>
            <li>• Use the sidebar to navigate between Dashboard and Create Event</li>
            <li>• Each event has 5 tabs: Overview, Checklist, Vendors, Budget, Contracts</li>
            <li>• Filter events by status (Active, Planning, Completed) on the dashboard</li>
            <li>• Upload hero images when creating events for better visual organization</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}