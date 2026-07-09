import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ClientOnboardingTracker } from "@/components/ClientOnboardingTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, CheckCircle, Clock, AlertCircle, Plus } from "lucide-react";
import { api } from "@/lib/api";

interface Event {
  id: string;
  name: string;
  type: string;
  date: string;
  venue: string;
  guestCount: number;
  budget: number;
  currency: string;
}

export default function ClientOnboardingPage() {
  const [, setLocation] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ['/api/events'],
    queryFn: () => api.getEvents() as Promise<Event[]>
  });

  const handleUpdateStep = (clientId: string, stepId: string, updates: any) => {
    console.log('Updating step:', { clientId, stepId, updates });
    // Here you would make an API call to update the step
  };

  const handleAddNote = (clientId: string, stepId: string, note: string) => {
    console.log('Adding note:', { clientId, stepId, note });
    // Here you would make an API call to add the note
  };

  const handleContactClient = (clientId: string, method: 'email' | 'phone' | 'message') => {
    console.log('Contacting client:', { clientId, method });
    // Here you would implement the contact functionality
    switch (method) {
      case 'email':
        // Open email client or modal
        break;
      case 'phone':
        // Initiate phone call or show phone number
        break;
      case 'message':
        // Open messaging interface
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => setLocation('/planner-dashboard')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div className="text-2xl font-bold text-gray-900">Client Onboarding</div>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Client Onboarding
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Active Clients</CardTitle>
            <User className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">12</div>
            <p className="text-xs text-blue-700">Currently onboarding</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Completed Steps</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">89</div>
            <p className="text-xs text-green-700">This month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-burgundy-50 to-burgundy-100 border-burgundy-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-burgundy-800">In Progress</CardTitle>
            <Clock className="w-4 h-4 text-burgundy-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-burgundy-900">24</div>
            <p className="text-xs text-burgundy-700">Active tasks</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Urgent Items</CardTitle>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">3</div>
            <p className="text-xs text-red-700">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Overview */}
      <Card className="mb-8 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-emerald-800">
            <User className="w-6 h-6" />
            <span>Client Onboarding Process</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <User className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-emerald-800 mb-2">Initial Contact</h3>
              <p className="text-sm text-emerald-700">
                First consultation and requirement gathering. Set expectations and timeline.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-blue-800 mb-2">Planning Phase</h3>
              <p className="text-sm text-blue-700">
                Budget planning, venue selection, and vendor coordination. Core planning activities.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-purple-800 mb-2">Booking & Coordination</h3>
              <p className="text-sm text-purple-700">
                Vendor bookings, contract management, and detailed coordination.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-burgundy-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-8 h-8 text-burgundy-600" />
              </div>
              <h3 className="font-semibold text-burgundy-800 mb-2">Final Preparations</h3>
              <p className="text-sm text-burgundy-700">
                Final reviews, timeline confirmation, and event day coordination.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Onboarding Tracker */}
      <ClientOnboardingTracker
        onUpdateStep={handleUpdateStep}
        onAddNote={handleAddNote}
        onContactClient={handleContactClient}
      />
    </div>
  );
}