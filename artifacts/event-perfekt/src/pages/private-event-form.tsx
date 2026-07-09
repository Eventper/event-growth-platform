import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Heart, Calendar, Users, MapPin, DollarSign, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import FormHelperBot from "@/components/FormHelperBot";

export default function PrivateEventForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    // Contact Information
    fullName: "",
    email: "",
    phone: "",
    
    // Event Details
    eventType: "",
    eventDate: "",
    guestCount: "",
    budget: "",
    
    // Venue Information
    hasVenue: false,
    venueName: "",
    venueAddress: "",
    
    // Location
    city: "",
    country: "",
    currency: "USD", // Default currency
    
    // Services Needed
    needsCatering: false,
    needsDecor: false,
    needsPhotography: false,
    needsEntertainment: false,
    needsTransportation: false,
    needsFlowers: false,
    
    // Additional Details
    eventDescription: "",
    specialRequests: "",
    inspiration: "",
    
    // Timeline
    flexibleDate: false,
    preferredTime: "",
    
    // Contact Preferences
    preferredContact: "",
    bestTimeToCall: "",
    
    // Inspiration Image
    inspirationImage: null as File | null
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = new FormData();
      payload.append("source", "private-form");
      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
          if (value.size > 0) payload.append(key, value);
        } else {
          payload.append(key, String(value));
        }
      });
      const response = await fetch("/api/private-events", {
        method: "POST",
        body: payload,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Submission failed");
      }
      return response.json();
    },
    onSuccess: (result: any) => {
      if (result?.reference) {
        localStorage.setItem("lastEnquiryRef", result.reference);
      }
      toast({
        title: "Private Event Submitted Successfully!",
        description: "Thank you for choosing Event Perfekt for your special celebration. We'll send you a welcome email shortly and follow up with a detailed proposal within 24 hours.",
      });
      setLocation("/submission-success");
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateForm = (): string[] => {
    const errors: string[] = [];
    if (!formData.fullName.trim()) errors.push("Full Name is required");
    if (!formData.email.trim()) errors.push("Email Address is required");
    if (!formData.phone.trim()) errors.push("Phone Number is required");
    if (!formData.eventType) errors.push("Event Type is required");
    if (!formData.eventDate) errors.push("Event Date is required");
    if (!formData.guestCount.trim()) errors.push("Number of Guests is required");
    if (!formData.currency) errors.push("Currency is required");
    if (!formData.budget) errors.push("Budget Range is required");
    if (!formData.city.trim()) errors.push("City is required");
    if (!formData.country.trim()) errors.push("Country is required");
    if (!formData.eventDescription.trim()) errors.push("Event Description is required — tell us about your vision so we can plan your budget");
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Please complete all required fields",
        description: errors.join(", "),
        variant: "destructive",
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationErrors([]);
    submitMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, inspirationImage: file });
    }
  };

  const eventTypes = [
    "Wedding",
    "Birthday Party",
    "Anniversary",
    "Baby Shower",
    "Bridal Shower",
    "Graduation Party",
    "Engagement Party",
    "Housewarming",
    "Holiday Party",
    "Reunion",
    "Memorial Service",
    "Other"
  ];

  const currencies = [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" }
  ];

  const getBudgetRanges = (currency: string) => {
    const curr = currencies.find(c => c.code === currency) || currencies[0];
    const symbol = curr.symbol;
    
    if (currency === "NGN") {
      return [
        `Under ${symbol}2,000,000`,
        `${symbol}2,000,000 - ${symbol}4,000,000`,
        `${symbol}4,000,000 - ${symbol}10,000,000`,
        `${symbol}10,000,000 - ${symbol}20,000,000`,
        `${symbol}20,000,000 - ${symbol}40,000,000`,
        `${symbol}40,000,000+`
      ];
    } else if (currency === "GBP") {
      return [
        `Under ${symbol}4,000`,
        `${symbol}4,000 - ${symbol}8,000`,
        `${symbol}8,000 - ${symbol}20,000`,
        `${symbol}20,000 - ${symbol}40,000`,
        `${symbol}40,000 - ${symbol}80,000`,
        `${symbol}80,000+`
      ];
    } else {
      return [
        `Under ${symbol}5,000`,
        `${symbol}5,000 - ${symbol}10,000`,
        `${symbol}10,000 - ${symbol}25,000`,
        `${symbol}25,000 - ${symbol}50,000`,
        `${symbol}50,000 - ${symbol}100,000`,
        `${symbol}100,000+`
      ];
    }
  };

  return (
    <div className="min-h-screen bg-burgundy-900" style={{color: 'white'}}>
      {/* Header */}
      <header className="bg-burgundy-800 shadow-lg" style={{color: 'white'}}>
        <div className="max-w-7xl mx-auto px-6 py-4" style={{color: 'white'}}>
          <div className="flex items-center justify-between" style={{color: 'white'}}>
            <div className="flex items-center space-x-4" style={{color: 'white'}}>
              <img
                src="/assets/3d_Logo_1772145137902.jpg"
                alt="Event Perfekt Logo"
                className="h-12 w-auto"
              />
              <div style={{color: 'white'}}>
                <h1 className="text-2xl font-bold text-white" style={{color: 'white'}}>Event Perfekt</h1>
                <p className="text-gold-300 text-sm" style={{color: 'white'}}>Private Event Planning</p>
              </div>
            </div>
            <Link href="/about">
              <Button variant="ghost" className="text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to About
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12" style={{color: 'white'}}>
        <div className="text-center mb-12" style={{color: 'white'}}>
          <Heart className="h-16 w-16 text-gold-400 mx-auto mb-4" style={{color: 'white'}} />
          <h2 className="text-4xl font-bold text-white mb-4" style={{color: 'white'}}>Plan Your Private Event</h2>
          <p className="text-xl text-gray-300" style={{color: 'white'}}>
            Let's create unforgettable memories for your special celebration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8" style={{color: 'white'}}>
          {validationErrors.length > 0 && (
            <Card className="bg-red-900/50 border-red-500">
              <CardContent className="pt-6">
                <h3 className="text-white font-bold mb-2">Please fix the following:</h3>
                <p className="text-red-200 text-sm leading-relaxed">
                  {validationErrors.join(" • ")}
                </p>
              </CardContent>
            </Card>
          )}
          {/* Contact Information */}
          <Card className="bg-white/10 backdrop-blur-sm border-burgundy-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center" style={{color: 'white'}}>
                <Users className="mr-2 h-5 w-5 text-white" style={{color: 'white'}} />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4" style={{color: 'white'}}>
              <div className="grid md:grid-cols-3 gap-4" style={{color: 'white'}}>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-white" style={{color: 'white'}}>Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Your full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white" style={{color: 'white'}}>Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white" style={{color: 'white'}}>Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Your phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card className="bg-white/10 backdrop-blur-sm border-burgundy-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center" style={{color: 'white'}}>
                <Calendar className="mr-2 h-5 w-5 text-white" style={{color: 'white'}} />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventType" className="text-white">Event Type *</Label>
                  <Select value={formData.eventType} onValueChange={(value) => setFormData({ ...formData, eventType: value })}>
                    <SelectTrigger className="bg-white/20 border-burgundy-500 text-white">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventDate" className="text-white">Preferred Date *</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    required
                    className="bg-white/20 border-burgundy-500 text-white"
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guestCount" className="text-white">Number of Guests *</Label>
                  <Input
                    id="guestCount"
                    type="number"
                    placeholder="50"
                    value={formData.guestCount}
                    onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
                    required
                    className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-white">Currency *</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value, budget: "" })}>
                    <SelectTrigger className="bg-white/20 border-burgundy-500 text-white">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-white">Budget Range *</Label>
                <Select 
                  value={formData.budget} 
                  onValueChange={(value) => setFormData({ ...formData, budget: value })}
                  disabled={!formData.currency}
                >
                  <SelectTrigger className="bg-white/20 border-burgundy-500 text-white">
                    <SelectValue placeholder={formData.currency ? "Select budget range" : "Please select currency first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getBudgetRanges(formData.currency).map((range) => (
                      <SelectItem key={range} value={range}>{range}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2" style={{color: 'white'}}>
                <Checkbox
                  id="flexibleDate"
                  checked={formData.flexibleDate}
                  onCheckedChange={(checked) => setFormData({ ...formData, flexibleDate: checked as boolean })}
                  style={{color: 'white'}}
                />
                <Label htmlFor="flexibleDate" className="text-white" style={{color: 'white'}}>I'm flexible with the date</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredTime" className="text-white">Preferred Time of Day</Label>
                <Select value={formData.preferredTime} onValueChange={(value) => setFormData({ ...formData, preferredTime: value })}>
                  <SelectTrigger className="bg-white/20 border-burgundy-500 text-white">
                    <SelectValue placeholder="Select preferred time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (9AM - 12PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                    <SelectItem value="evening">Evening (5PM - 9PM)</SelectItem>
                    <SelectItem value="night">Night (9PM - Late)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Venue Information */}
          <Card className="bg-white/10 backdrop-blur-sm border-burgundy-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <MapPin className="mr-2 h-5 w-5 text-gold-400" />
                Venue & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2" style={{color: 'white'}}>
                <Checkbox
                  id="hasVenue"
                  checked={formData.hasVenue}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasVenue: checked as boolean })}
                  style={{color: 'white'}}
                />
                <Label htmlFor="hasVenue" className="text-white" style={{color: 'white'}}>I already have a venue</Label>
              </div>
              
              {formData.hasVenue && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="venueName" className="text-white">Venue Name</Label>
                    <Input
                      id="venueName"
                      placeholder="Venue name"
                      value={formData.venueName}
                      onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                      className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venueAddress" className="text-white">Venue Address</Label>
                    <Input
                      id="venueAddress"
                      placeholder="Full venue address"
                      value={formData.venueAddress}
                      onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                      className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                    />
                  </div>
                </div>
              )}
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-white">City *</Label>
                  <Input
                    id="city"
                    placeholder="Event city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-white">Country *</Label>
                  <Input
                    id="country"
                    placeholder="Country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                    className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Needed */}
          <Card className="bg-white/10 backdrop-blur-sm border-burgundy-600">
            <CardHeader>
              <CardTitle className="text-white">Services Needed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { key: 'fullEventPlanning', label: 'Full Event Planning (End-to-end planning support)' },
                  { key: 'dayCoordination', label: 'Day Coordination Only (For those who already have a planner)' },
                  { key: 'venueSourcing', label: 'Venue Sourcing' },
                  { key: 'venueStylist', label: 'Venue Stylist Only (For clients who have décor but want a professional to style and set up the venue)' },
                  { key: 'needsCatering', label: 'Catering & Food Service' },
                  { key: 'needsDecor', label: 'Decor & Styling' },
                  { key: 'needsPhotography', label: 'Photography/Videography' },
                  { key: 'needsEntertainment', label: 'Entertainment & Music (DJ, MC, Live Band, Performers)' },
                  { key: 'needsTransportation', label: 'Transportation (VIP cars, guest shuttles)' },
                  { key: 'needsFlowers', label: 'Flowers & Arrangements' },
                  { key: 'cakeDesign', label: 'Cake & Dessert Styling' },
                  { key: 'customBackdrops', label: 'Custom Backdrops & Installations' },
                  { key: 'lightingProduction', label: 'Lighting & Technical Production' },
                  { key: 'guestManagement', label: 'Guest List Management' },
                  { key: 'eventStaffing', label: 'Ushers & Event Staffing' },
                  { key: 'proposalPlanning', label: 'Proposal Planning / Surprise Events' },
                  { key: 'luxuryGifting', label: 'Luxury Gifting / Souvenir Design' },
                  { key: 'securityServices', label: 'Security & Protocol Services' },
                  { key: 'religiousCoordination', label: 'Religious/Traditional Ceremony Coordination' },
                  { key: 'photoboothService', label: 'Photobooth Service' }
                ].map((service) => (
                  <div key={service.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={service.key}
                      checked={formData[service.key as keyof typeof formData] as boolean}
                      onCheckedChange={(checked) => setFormData({ ...formData, [service.key]: checked })}
                      className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#330311]"
                    />
                    <Label htmlFor={service.key} className="text-white">{service.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Event Description */}
          <Card className="bg-white/10 backdrop-blur-sm border-burgundy-600">
            <CardHeader>
              <CardTitle className="text-white">Tell Us About Your Vision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventDescription" className="text-white">Event Description</Label>
                <Textarea
                  id="eventDescription"
                  placeholder="Describe your event, theme, style preferences, or any specific details..."
                  value={formData.eventDescription}
                  onChange={(e) => setFormData({ ...formData, eventDescription: e.target.value })}
                  rows={4}
                  className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="inspiration" className="text-white">Inspiration & Ideas</Label>
                <Textarea
                  id="inspiration"
                  placeholder="Share any inspiration, Pinterest boards, or specific ideas you have in mind..."
                  value={formData.inspiration}
                  onChange={(e) => setFormData({ ...formData, inspiration: e.target.value })}
                  rows={3}
                  className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="inspirationImage" className="text-white">Inspiration Image (Optional)</Label>
                <div className="flex items-center space-x-2">
                  <Camera className="h-5 w-5 text-gold-400" />
                  <Input
                    id="inspirationImage"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="bg-white/20 border-burgundy-500 text-white file:text-white file:bg-burgundy-700 file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="specialRequests" className="text-white">Special Requests</Label>
                <Textarea
                  id="specialRequests"
                  placeholder="Any special requirements, dietary restrictions, accessibility needs, or other important details..."
                  value={formData.specialRequests}
                  onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                  rows={3}
                  className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Preferences */}
          <Card className="bg-white/10 backdrop-blur-sm border-burgundy-600" style={{color: 'white'}}>
            <CardHeader style={{color: 'white'}}>
              <CardTitle className="text-white" style={{color: 'white'}}>Contact Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4" style={{color: 'white'}}>
              <div className="grid md:grid-cols-2 gap-4" style={{color: 'white'}}>
                <div className="space-y-2" style={{color: 'white'}}>
                  <Label htmlFor="preferredContact" className="text-white" style={{color: 'white'}}>Preferred Contact Method</Label>
                  <Select value={formData.preferredContact} onValueChange={(value) => setFormData({ ...formData, preferredContact: value })}>
                    <SelectTrigger className="bg-white/20 border-burgundy-500 text-white">
                      <SelectValue placeholder="Select preferred method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="text">Text Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2" style={{color: 'white'}}>
                  <Label htmlFor="bestTimeToCall" className="text-white" style={{color: 'white'}}>Best Time to Contact</Label>
                  <Select value={formData.bestTimeToCall} onValueChange={(value) => setFormData({ ...formData, bestTimeToCall: value })}>
                    <SelectTrigger className="bg-white/20 border-burgundy-500 text-white">
                      <SelectValue placeholder="Select best time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (9AM - 12PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                      <SelectItem value="evening">Evening (5PM - 8PM)</SelectItem>
                      <SelectItem value="anytime">Anytime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="text-center">
            <Button
              type="submit"
              size="lg"
              className="bg-white font-semibold px-12 py-4"
              style={{backgroundColor: 'white', color: '#330311'}}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Private Event Request"}
            </Button>
            <p className="text-gray-400 text-sm mt-4" style={{color: 'white'}}>
              We'll send you a welcome email immediately and follow up with a detailed proposal within 24 hours.
            </p>
          </div>
        </form>
      </div>
      <FormHelperBot formContext="private-event" welcomeMessage="Hi! Planning a private celebration? I can help you fill out this form. Just ask!" suggestedQuestions={["What theme options are available?", "Do you cater for dietary requirements?", "Can I add cultural or religious elements?"]} />
    </div>
  );
}