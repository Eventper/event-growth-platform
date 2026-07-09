import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Button } from "@/components/ui/button";
import { Calendar, ClipboardList, Truck, Users } from "lucide-react";

export default function GetStarted() {
  usePageMeta({ title: "Get Started — Event Perfekt" });

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#330311] mb-4">Get Started Today</h1>
          <p className="text-gray-600 text-lg">Choose how you'd like to use Event Perfekt</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          
          <div className="border border-gray-200 rounded-xl p-6 text-center">
            <Calendar className="w-10 h-10 mx-auto mb-4 text-[#330311]" />
            <h3 className="text-xl font-bold mb-2 text-[#330311]">Client</h3>
            <p className="text-gray-500 text-sm mb-6">Plan your perfekt event with our team</p>
            <div className="space-y-3">
              <Link href="/create-event">
                <Button className="w-full bg-[#330311] text-white">
                  Create Event
                </Button>
              </Link>
              <Link href="/create-event">
                <Button variant="outline" className="w-full border-[#330311] text-[#330311]">
                  Submit Request
                </Button>
              </Link>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-6 text-center">
            <ClipboardList className="w-10 h-10 mx-auto mb-4 text-[#330311]" />
            <h3 className="text-xl font-bold mb-2 text-[#330311]">Event Planner</h3>
            <p className="text-gray-500 text-sm mb-6">Manage events, vendors and timelines</p>
            <div className="space-y-3">
              <Link href="/planner-dashboard">
                <Button className="w-full bg-[#330311] text-white">
                  Dashboard
                </Button>
              </Link>
              <Link href="/create-event">
                <Button variant="outline" className="w-full border-[#330311] text-[#330311]">
                  Create Event
                </Button>
              </Link>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-6 text-center">
            <Truck className="w-10 h-10 mx-auto mb-4 text-[#330311]" />
            <h3 className="text-xl font-bold mb-2 text-[#330311]">Vendor</h3>
            <p className="text-gray-500 text-sm mb-6">Register services and connect with planners</p>
            <div className="space-y-3">
              <Link href="/vendor-portal">
                <Button className="w-full bg-[#330311] text-white">
                  Vendor Portal
                </Button>
              </Link>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-6 text-center">
            <Users className="w-10 h-10 mx-auto mb-4 text-[#330311]" />
            <h3 className="text-xl font-bold mb-2 text-[#330311]">Staff</h3>
            <p className="text-gray-500 text-sm mb-6">Access your team dashboard and tools</p>
            <div className="space-y-3">
              <Link href="/dashboard">
                <Button className="w-full bg-[#330311] text-white">
                  Staff Dashboard
                </Button>
              </Link>
              <Link href="/management-dashboard">
                <Button variant="outline" className="w-full border-[#330311] text-[#330311]">
                  Event Overview
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}