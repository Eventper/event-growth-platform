import { useState, useEffect } from "react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Mail, 
  Calendar, 
  Clock, 
  Phone,
  Star,
  ArrowRight,
  Home
} from "lucide-react";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

export default function SubmissionSuccess() {
  usePageMeta({ title: "Enquiry Submitted — Event Perfekt" });
  const [enquiryRef, setEnquiryRef] = useState<string | null>(null);

  useEffect(() => {
    const ref = localStorage.getItem("lastEnquiryRef");
    if (ref) {
      setEnquiryRef(ref);
      localStorage.removeItem("lastEnquiryRef");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900">
      {/* Header */}
      <header className="bg-burgundy-800/50 backdrop-blur-sm border-b border-burgundy-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={eventPerfektLogo} 
                alt="Event Perfekt Logo" 
                className="h-12 w-12 rounded-xl shadow-lg ring-1 ring-white/10"
              />
              <div>
                <h1 className="text-2xl font-bold text-white">Event Perfekt</h1>
                <p className="text-white/70 text-sm italic">...making yours perfekt</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="ghost" className="text-white">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Success Message */}
        <div className="text-center mb-16">
          <div className="bg-green-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="h-12 w-12 text-green-400" />
          </div>
          
          <Badge className="bg-green-100 text-green-800 border-green-300 mb-6 text-lg px-4 py-2">
            <CheckCircle className="w-5 h-5 mr-2" />
            Submission Successful!
          </Badge>

          {enquiryRef && (
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 mb-8 inline-block">
              <p className="text-white/70 text-sm mb-1 uppercase tracking-wider">Your Enquiry Reference</p>
              <p className="text-white text-3xl font-bold tracking-widest font-mono">{enquiryRef}</p>
              <p className="text-white/60 text-xs mt-1">Please keep this for your records</p>
            </div>
          )}
          
          <h1 className="text-5xl font-bold text-white mb-6">
            Thank You for Choosing Event Perfekt!
          </h1>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Your event submission has been received successfully. Our team is already reviewing your details 
            and preparing a customized proposal for your perfect celebration.
          </p>
        </div>

        {/* What Happens Next */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">What Happens Next?</h2>
            <p className="text-xl text-gray-300">
              Here's your personalized event planning timeline
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                icon: Mail,
                title: "Welcome Email",
                description: "Check your inbox for a welcome email with your submission details",
                time: "Within 5 minutes"
              },
              {
                step: "2",
                icon: Star,
                title: "Detailed Proposal",
                description: "Receive a comprehensive event proposal with pricing and timeline",
                time: "Within 24 hours"
              },
              {
                step: "3",
                icon: Calendar,
                title: "Schedule & Deposit",
                description: "Accept your proposal, pay deposit, and schedule your onboarding call",
                time: "At your convenience"
              },
              {
                step: "4",
                icon: CheckCircle,
                title: "Planning Begins",
                description: "Meet your dedicated planner and start creating your perfect event",
                time: "After deposit approval"
              }
            ].map((step, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-sm border-burgundy-600 text-center">
                <CardContent className="p-6">
                  <div className="bg-white text-burgundy-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                    {step.step}
                  </div>
                  <step.icon className="h-8 w-8 text-white mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-300 text-sm mb-3">{step.description}</p>
                  <Badge variant="secondary" className="bg-burgundy-700 text-white text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {step.time}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Important Information */}
        <div className="mb-16">
          <Card className="bg-white border-gray-300">
            <CardContent className="p-8">
              <div className="text-center">
                <Mail className="h-12 w-12 text-burgundy-900 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-burgundy-900 mb-4">Important Reminders</h3>
                
                <div className="grid md:grid-cols-2 gap-6 text-left">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-burgundy-800">Check Your Email</h4>
                    <p className="text-burgundy-700">
                      We've sent a confirmation email with your submission details. 
                      If you don't see it, please check your spam folder.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-burgundy-800">Response Time</h4>
                    <p className="text-burgundy-700">
                      Our team will respond with a detailed proposal within 24 hours. 
                      For urgent requests, call us directly.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-burgundy-800">Questions?</h4>
                    <p className="text-burgundy-700">
                      Contact us anytime at <strong>admin@eventperfekt.com</strong> 
                      or <strong>[PHONE REMOVED]</strong>
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-burgundy-800">Next Steps</h4>
                    <p className="text-burgundy-700">
                      Once you approve your proposal and pay the deposit, 
                      we'll schedule your personalized onboarding call.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Testimonials */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">What Our Clients Say</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                event: "Wedding Reception",
                quote: "Event Perfekt made our dream wedding a reality. Every detail was perfect!"
              },
              {
                name: "Michael Chen",
                event: "Corporate Gala",
                quote: "Professional, organized, and exceeded all our expectations. Highly recommend!"
              },
              {
                name: "Lisa Rodriguez",
                event: "Birthday Celebration",
                quote: "They handled everything so we could just enjoy the moment. Amazing service!"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-sm border-burgundy-600">
                <CardContent className="p-6">
                  <div className="flex mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-white fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-300 italic mb-4">"{testimonial.quote}"</p>
                  <div className="text-white font-semibold">{testimonial.name}</div>
                  <div className="text-gray-300 text-sm">{testimonial.event}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="bg-gradient-to-r from-burgundy-800 to-burgundy-700 border-burgundy-600">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-white mb-4">Ready for More?</h2>
              <p className="text-xl text-gray-300 mb-6">
                While you wait for your proposal, explore our other services or learn more about our process.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/about">
                  <Button size="lg" className="bg-white text-burgundy-900 font-semibold">
                    Learn About Our Services
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/">
                  <Button size="lg" variant="outline" className="border-2 border-white text-white font-semibold" style={{backgroundColor: 'transparent', color: 'white', borderColor: 'white'}}>
                    Back to Home
                  </Button>
                </Link>
              </div>
              
              <div className="mt-8 pt-6 border-t border-burgundy-600">
                <div className="flex items-center justify-center space-x-6 text-gray-300">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-white" />
                    <span>[PHONE REMOVED]</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-white" />
                    <span>admin@eventperfekt.com</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  Available Monday - Friday, 9AM - 6PM
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}