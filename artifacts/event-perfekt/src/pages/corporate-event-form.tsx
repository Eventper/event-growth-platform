import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Building, Calendar, Users, MapPin, DollarSign, Upload, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import FormHelperBot from "@/components/FormHelperBot";

export default function CorporateEventForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    // Company Information
    companyName: "",
    contactPerson: "",
    jobTitle: "",
    email: "",
    phone: "",
    website: "",
    
    // Event Details
    eventType: "",
    eventDate: "",
    attendeeCount: "",
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
    needsAVEquipment: false,
    needsBranding: false,
    needsDecor: false,
    needsPhotography: false,
    needsTransportation: false,
    needsAccommodation: false,
    needsVendorCoordination: false,
    
    // Additional Details
    eventDescription: "",
    objectives: "",
    targetAudience: "",
    specialRequests: "",
    
    // Timeline
    flexibleDate: false,
    preferredTime: "",
    
    // Contact Preferences
    preferredContact: "",
    bestTimeToCall: "",
    
    // Company Logo
    companyLogo: null as File | null
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = new FormData();
      payload.append("source", "corporate-form");
      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
          if (value.size > 0) payload.append(key, value);
        } else {
          payload.append(key, String(value));
        }
      });
      const response = await fetch("/api/corporate-events", {
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
        title: "Corporate Event Submitted Successfully!",
        description: "Thank you for choosing Event Perfekt for your corporate event. We'll send you a welcome email shortly and follow up with a detailed proposal within 24 hours.",
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
    if (!formData.companyName.trim()) errors.push("Company Name is required");
    if (!formData.contactPerson.trim()) errors.push("Contact Person is required");
    if (!formData.email.trim()) errors.push("Email Address is required");
    if (!formData.phone.trim()) errors.push("Phone Number is required");
    if (!formData.eventType) errors.push("Event Type is required");
    if (!formData.eventDate) errors.push("Event Date is required");
    if (!formData.attendeeCount.trim()) errors.push("Number of Attendees is required");
    if (!formData.currency) errors.push("Currency is required");
    if (!formData.budget) errors.push("Budget Range is required");
    if (!formData.city.trim()) errors.push("City is required");
    if (!formData.country.trim()) errors.push("Country is required");
    if (!formData.eventDescription.trim()) errors.push("Event Description is required — tell us about your event so we can plan your budget");
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
      setFormData({ ...formData, companyLogo: file });
    }
  };

  const eventTypes = [
    "Conference",
    "Product Launch",
    "Corporate Gala",
    "Team Building",
    "Awards Ceremony",
    "Trade Show",
    "Seminar/Workshop",
    "Board Meeting",
    "Holiday Party",
    "Networking Event",
    "Training Session",
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
        `Under ${symbol}4,000,000`,
        `${symbol}4,000,000 - ${symbol}10,000,000`,
        `${symbol}10,000,000 - ${symbol}20,000,000`,
        `${symbol}20,000,000 - ${symbol}40,000,000`,
        `${symbol}40,000,000 - ${symbol}100,000,000`,
        `${symbol}100,000,000+`
      ];
    } else if (currency === "GBP") {
      return [
        `Under ${symbol}8,000`,
        `${symbol}8,000 - ${symbol}20,000`,
        `${symbol}20,000 - ${symbol}40,000`,
        `${symbol}40,000 - ${symbol}80,000`,
        `${symbol}80,000 - ${symbol}200,000`,
        `${symbol}200,000+`
      ];
    } else {
      return [
        `Under ${symbol}10,000`,
        `${symbol}10,000 - ${symbol}25,000`,
        `${symbol}25,000 - ${symbol}50,000`,
        `${symbol}50,000 - ${symbol}100,000`,
        `${symbol}100,000 - ${symbol}250,000`,
        `${symbol}250,000+`
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
                <p className="text-gray-300 text-sm" style={{color: 'white'}}>Corporate Event Planning</p>
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
          <Building className="h-16 w-16 text-white mx-auto mb-4" style={{color: 'white'}} />
          <h2 className="text-4xl font-bold text-white mb-4" style={{color: 'white'}}>Plan Your Corporate Event</h2>
          <p className="text-xl text-gray-300" style={{color: 'white'}}>
            Let's create an exceptional corporate experience that elevates your brand
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
          {/* Company Information */}
          <Card className="bg-white/10 backdrop-blur-sm border-burgundy-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Briefcase className="mr-2 h-5 w-5 text-white" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-white">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="Your company name"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                    className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-white">Company Website</Label>
                  <Input
                    id="website"
                    placeholder="https://yourcompany.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson" className="text-white">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    placeholder="Full name"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    required
                    className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle" className="text-white">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    placeholder="Event Manager"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    required
                    className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Company phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyLogo" className="text-white">Company Logo (Optional)</Label>
                  <div className="flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-white" />
                    <Input
                      id="companyLogo"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="bg-white/20 border-burgundy-500 text-white file:text-white file:bg-burgundy-700 file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card className="bg-white/10 backdrop-blur-sm border-burgundy-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-white" />
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
                  <Label htmlFor="attendeeCount" className="text-white">Number of Attendees *</Label>
                  <Input
                    id="attendeeCount"
                    type="number"
                    placeholder="100"
                    value={formData.attendeeCount}
                    onChange={(e) => setFormData({ ...formData, attendeeCount: e.target.value })}
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
                    <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                    <SelectItem value="evening">Evening (5PM - 9PM)</SelectItem>
                    <SelectItem value="all-day">Full Day Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Venue Information */}
          <Card className="bg-white/10 backdrop-blur-sm border-burgundy-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <MapPin className="mr-2 h-5 w-5 text-white" />
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
                <Label htmlFor="hasVenue" className="text-white" style={{color: 'white'}}>We already have a venue</Label>
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
                  { key: 'customBackdrops', label: 'Custom Backdrops & Installations' },
                  { key: 'lightingProduction', label: 'Lighting & Technical Production' },
                  { key: 'guestManagement', label: 'Guest List Management' },
                  { key: 'eventStaffing', label: 'Ushers & Event Staffing' },
                  { key: 'luxuryGifting', label: 'Corporate Gifting / Branded Merchandise' },
                  { key: 'securityServices', label: 'Security & Protocol Services' },
                  { key: 'photoboothService', label: 'Photobooth Service' },
                  { key: 'avEquipment', label: 'Audio/Visual Equipment & Technical Support' }
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
              <CardTitle className="text-white">Event Vision & Objectives</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventDescription" className="text-white">Event Description</Label>
                <Textarea
                  id="eventDescription"
                  placeholder="Describe your corporate event, theme, format, and any specific requirements..."
                  value={formData.eventDescription}
                  onChange={(e) => setFormData({ ...formData, eventDescription: e.target.value })}
                  rows={4}
                  className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="objectives" className="text-white">Event Objectives</Label>
                <Textarea
                  id="objectives"
                  placeholder="What are the main goals for this event? (networking, product launch, team building, etc.)"
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  rows={3}
                  className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="targetAudience" className="text-white">Target Audience</Label>
                <Textarea
                  id="targetAudience"
                  placeholder="Who will be attending? (clients, employees, partners, media, etc.)"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  rows={2}
                  className="bg-white/20 border-burgundy-500 text-white placeholder:text-gray-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="specialRequests" className="text-white">Special Requirements</Label>
                <Textarea
                  id="specialRequests"
                  placeholder="Any specific branding requirements, accessibility needs, security considerations, or other important details..."
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
                      <SelectItem value="video">Video Call</SelectItem>
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
                      <SelectItem value="evening">Evening (5PM - 7PM)</SelectItem>
                      <SelectItem value="anytime">Business Hours</SelectItem>
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
              {submitMutation.isPending ? "Submitting..." : "Submit Corporate Event Request"}
            </Button>
            <p className="text-gray-400 text-sm mt-4" style={{color: 'white'}}>
              We'll send you a welcome email immediately and follow up with a detailed corporate event proposal within 24 hours.
            </p>
          </div>
        </form>
      </div>
      <FormHelperBot formContext="corporate-event" welcomeMessage="Hi! I can help you with this corporate event form. Ask me about any section." suggestedQuestions={["What company details do you need?", "What AV equipment options are there?", "Do you handle branding and signage?"]} />
    </div>
  );
}