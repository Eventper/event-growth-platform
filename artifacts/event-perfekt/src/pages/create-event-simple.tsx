import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Building2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import luxuryWeddingImage from "@assets/luxury-wedding-celebration-illuminated-by-chandelier-flame-generated-by-ai_1754251182698.jpg";
import corporateEventImage from "@assets/generated_images/diverse_corporate_conference.svg";

export default function CreateEventSimple() {
  const [, setLocation] = useLocation();
  const [eventType, setEventType] = useState<'private' | 'corporate' | ''>('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/')}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-2xl font-bold" style={{ color: '#330311' }}>
              Plan Your Event
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: '#330311' }}>
            What Type of Event Are You Planning?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose your event type to get started with our comprehensive planning process
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Private Events Card */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
              eventType === 'private' ? 'ring-2 ring-[#330311]' : ''
            }`}
            onClick={() => setEventType('private')}
          >
            <CardHeader className="p-0">
              <div className="aspect-video relative overflow-hidden rounded-t-lg">
                <img 
                  src={luxuryWeddingImage} 
                  alt="Elegant private celebration"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-4 left-4 text-white">
                  <Heart className="w-8 h-8 mb-2" />
                  <h3 className="text-2xl font-bold">Private Events</h3>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">
                Celebrate life's special moments with intimate gatherings, weddings, birthdays, anniversaries, and family celebrations.
              </p>
              <div className="text-sm text-gray-500">
                • Weddings & Engagements
                • Birthday Celebrations
                • Anniversaries
                • Family Reunions
                • Personal Milestones
              </div>
            </CardContent>
          </Card>

          {/* Corporate Events Card */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
              eventType === 'corporate' ? 'ring-2 ring-[#330311]' : ''
            }`}
            onClick={() => setEventType('corporate')}
          >
            <CardHeader className="p-0">
              <div className="aspect-video relative overflow-hidden rounded-t-lg">
                <img 
                  src={corporateEventImage} 
                  alt="Professional corporate conference"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-4 left-4 text-white">
                  <Building2 className="w-8 h-8 mb-2" />
                  <h3 className="text-2xl font-bold">Corporate Events</h3>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">
                Professional business events, conferences, product launches, team building, and corporate celebrations.
              </p>
              <div className="text-sm text-gray-500">
                • Conferences & Seminars
                • Product Launches
                • Team Building Events
                • Awards Ceremonies
                • Corporate Parties
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        {eventType && (
          <div className="text-center">
            <Button 
              size="lg"
              style={{ 
                backgroundColor: '#330311',
                color: 'white',
                WebkitTextFillColor: 'white'
              }}
              className="px-8 py-3 text-lg font-semibold"
              onClick={() => setLocation('/event-details')}
            >
              Continue with {eventType === 'private' ? 'Private' : 'Corporate'} Event
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}