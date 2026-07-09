import { Link } from "wouter";
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, Heart, Building2, Star, CheckCircle } from "lucide-react";

export default function Welcome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-burgundy-900 via-burgundy-800 to-burgundy-900">
      {/* Header */}
      <header className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <img
            src="/assets/3d_Logo_1772145137902.jpg"
            alt="Event Perfekt Logo"
            className="h-10 w-auto"
          />
          <span className="text-2xl font-bold text-white">Event Perfekt</span>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="border-white/70 text-white hover:bg-white hover:text-burgundy-900 hover:border-white">
            Dashboard
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
            Perfekt Events,<br />
            <span className="text-burgundy-300">Perfektly Planned</span>
          </h1>
          <p className="text-xl text-burgundy-100 max-w-2xl mx-auto">
            From intimate celebrations to corporate galas, Event Perfekt brings your vision to life with comprehensive planning, vendor management, and seamless execution.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/create-event">
              <Button size="lg" className="bg-burgundy-600 hover:bg-burgundy-700 text-white font-semibold px-8 py-4">
                Start Planning Your Event
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="border-white/70 text-white hover:bg-white hover:text-burgundy-900 hover:border-white px-8 py-4">
                View All Events
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <Card className="bg-white/10 backdrop-blur-md border-burgundy-600">
            <CardHeader>
              <Heart className="w-8 h-8 text-white mb-2" />
              <CardTitle className="text-white">Private Events</CardTitle>
              <CardDescription className="text-burgundy-100">
                Weddings, birthdays, anniversaries, and personal celebrations
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-md border-burgundy-600">
            <CardHeader>
              <Building2 className="w-8 h-8 text-white mb-2" />
              <CardTitle className="text-white">Corporate Events</CardTitle>
              <CardDescription className="text-burgundy-100">
                Conferences, retreats, launches, and professional gatherings
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-md border-burgundy-600">
            <CardHeader>
              <Users className="w-8 h-8 text-white mb-2" />
              <CardTitle className="text-white">Vendor Network</CardTitle>
              <CardDescription className="text-burgundy-100">
                Curated vendors, contract management, and seamless coordination
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-md border-burgundy-600">
            <CardHeader>
              <CalendarDays className="w-8 h-8 text-white mb-2" />
              <CardTitle className="text-white">Full Service</CardTitle>
              <CardDescription className="text-burgundy-100">
                Budget tracking, document management, and automated workflows
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-12">Why Choose Event Perfekt?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <CheckCircle className="w-12 h-12 text-white mx-auto" />
              <h3 className="text-xl font-semibold text-white">Automated Workflows</h3>
              <p className="text-burgundy-100">
                From client onboarding to contract generation and invoicing, everything happens automatically
              </p>
            </div>
            <div className="space-y-4">
              <CheckCircle className="w-12 h-12 text-white mx-auto" />
              <h3 className="text-xl font-semibold text-white">Global Support</h3>
              <p className="text-burgundy-100">
                Multi-currency support with Nigeria and UK prioritized, plus comprehensive country options
              </p>
            </div>
            <div className="space-y-4">
              <CheckCircle className="w-12 h-12 text-white mx-auto" />
              <h3 className="text-xl font-semibold text-white">Complete Management</h3>
              <p className="text-burgundy-100">
                Budgets, vendors, documents, tasks, and client portals all in one place
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-burgundy-700 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gold-500 rounded flex items-center justify-center">
                <Star className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold">Event Perfekt</span>
            </div>
            <p className="text-burgundy-200 text-sm">
              © 2024 Event Perfekt. Perfekt events, perfektly planned.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}