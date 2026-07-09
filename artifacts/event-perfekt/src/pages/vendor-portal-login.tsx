import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  FileText, 
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registrationSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactPersonName: z.string().min(2, "Contact person name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
  companyAddress: z.string().min(10, "Please provide a complete address"),
  businessType: z.string().min(1, "Please select your business type"),
  yearsInBusiness: z.string().min(1, "Years in business is required"),
  servicesOffered: z.array(z.string()).min(1, "Please select at least one service"),
  serviceAreas: z.array(z.string()).min(1, "Please select at least one service area"),
  agreeToTerms: z.boolean().refine((val) => val === true, "You must agree to terms and conditions"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegistrationForm = z.infer<typeof registrationSchema>;

const businessTypes = [
  // Traditional Event Services
  "Catering Services",
  "Event Decoration & Styling",
  "Photography & Videography", 
  "Entertainment & Performers",
  "Floral Design",
  "Wedding Planning Services",
  "Event Coordination & Planning",
  
  // Professional Services
  "Legal Services & Contracts",
  "Financial Services & Accounting",
  "GDPR/Data Protection (DPIA) Services",
  "Business Consulting",
  "Event Insurance Services",
  "Risk Management & Compliance",
  
  // Technical & Production
  "Audio Visual Equipment",
  "Technology & IT Support",
  "Live Streaming & Production",
  "Lighting Design & Installation",
  
  // Safety & Security
  "Security Services",
  "Health & Safety Services",
  "First Aid & Medical Services",
  "Fire Safety & Emergency Services",
  
  // Logistics & Operations
  "Transportation Services",
  "Equipment Rental & Hire",
  "Cleaning & Maintenance Services",
  "Venue Management",
  
  // Specialized Event Types
  "Corporate Event Services",
  "Conference & Meeting Services",
  "Exhibition & Trade Show Services",
  "Festival & Outdoor Event Services",
  
  // Creative & Marketing
  "Event Marketing & Promotion",
  "Signage & Branding Services",
  
  "Other"
];

const serviceCategories = {
  "Traditional Event Services": [
    "Catering Services",
    "Event Decoration & Styling", 
    "Photography & Videography",
    "Entertainment & Performers",
    "Floral Design & Arrangements",
    "Venue Management & Setup",
    "Event Coordination & Planning",
    "Wedding Planning Services",
    "Bar Services & Beverages",
    "Gift & Welcome Bag Services"
  ],
  "Professional Services": [
    "Legal Services & Contracts",
    "Financial Services & Accounting",
    "GDPR/Data Protection (DPIA) Services", 
    "Business Consulting",
    "Event Insurance Services",
    "Risk Management & Compliance",
    "Corporate Governance",
    "Regulatory Compliance",
    "Tax Advisory Services",
    "Intellectual Property Services"
  ],
  "Technical & Production Services": [
    "Audio/Visual Equipment",
    "Technology & IT Support",
    "Live Streaming & Production",
    "Lighting Design & Installation",
    "Sound Engineering",
    "Event Tech Solutions",
    "Digital Registration Systems",
    "Event Apps & Platforms",
    "Broadcasting & Media",
    "Technical Project Management"
  ],
  "Safety & Security Services": [
    "Security Services",
    "Health & Safety Services",
    "First Aid & Medical Services",
    "Fire Safety & Emergency Services",
    "Crowd Control & Management",
    "VIP Protection Services",
    "Emergency Response Planning",
    "Safety Auditing & Assessment",
    "Risk Assessment Services",
    "Crisis Management"
  ],
  "Logistics & Operations": [
    "Transportation Services",
    "Equipment Rental & Hire",
    "Cleaning & Maintenance",
    "Waste Management & Recycling",
    "Storage & Warehousing",
    "Guest Registration & Check-in",
    "Event Staffing & Personnel",
    "Furniture & Staging",
    "Load-in/Load-out Services",
    "Site Management"
  ],
  "Specialized Event Types": [
    "Corporate Event Services", 
    "Conference & Meeting Services",
    "Exhibition & Trade Show Services",
    "Festival & Outdoor Event Services",
    "Sporting Events Management",
    "Cultural & Arts Events",
    "Charity & Fundraising Events",
    "Government & Political Events",
    "Medical & Scientific Conferences",
    "Educational & Training Events"
  ],
  "Creative & Marketing": [
    "Event Marketing & Promotion",
    "Signage & Branding",
    "Translation & Interpretation",
    "Content Creation & Media",
    "Graphic Design Services",
    "Social Media Management",
    "Public Relations",
    "Brand Activation",
    "Experiential Marketing",
    "Digital Marketing"
  ]
};

const serviceAreas = [
  "United Kingdom",
  "Nigeria", 
  "United States",
  "Canada",
  "Australia",
  "South Africa",
  "Ghana",
  "Kenya",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "UAE",
  "India",
  "Singapore",
  "Hong Kong",
  "New Zealand",
  "Ireland",
  "Scotland",
  "Wales",
  "Northern Ireland",
  "England - London",
  "England - Manchester", 
  "England - Birmingham",
  "England - Leeds",
  "England - Liverpool",
  "Nigeria - Lagos",
  "Nigeria - Abuja",
  "Nigeria - Port Harcourt",
  "Nigeria - Kano",
  "USA - New York",
  "USA - California",
  "USA - Texas", 
  "USA - Florida",
  "USA - Illinois",
  "Multiple Countries",
  "Global/Worldwide",
  "Other"
];

export default function VendorPortalLogin() {
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const { toast } = useToast();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const registrationForm = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/vendor-portal/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("vendorToken", data.token);
      localStorage.setItem("vendorUser", JSON.stringify(data.user));
      toast({
        title: "Login Successful",
        description: "Welcome to the Vendor Portal",
      });
      window.location.href = "/vendor-dashboard";
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  const registrationMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      const response = await apiRequest("POST", "/api/vendor-portal/register", {
        ...data,
        servicesOffered: selectedServices,
        serviceAreas: selectedAreas,
        yearsInBusiness: parseInt(data.yearsInBusiness),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful",
        description: "Your account has been created. Please check your email for verification.",
      });
      setActiveTab("login");
      registrationForm.reset();
      setSelectedServices([]);
      setSelectedAreas([]);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const handleServiceToggle = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const handleAreaToggle = (area: string) => {
    setSelectedAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4" data-testid="text-vendor-portal-title">
            Event Perfekt Vendor Portal
          </h1>
          <p className="text-gray-300 text-lg">
            Join our network of trusted event suppliers and grow your business
          </p>
        </div>

        <Card className="bg-white shadow-2xl">
          <CardHeader className="bg-[#330311] text-white text-center py-8">
            <CardTitle className="text-2xl">Supplier Access Portal</CardTitle>
            <CardDescription className="text-gray-300">
              Login to manage your vendor profile, agreements, and compliance documentation
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none">
                <TabsTrigger 
                  value="login" 
                  className="py-4 text-base"
                  data-testid="tab-vendor-login"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Vendor Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="py-4 text-base"
                  data-testid="tab-vendor-register"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Join Network
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="p-8">
                <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="login-email" className="text-sm font-medium">
                        Company Email Address
                      </Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="company@example.com"
                          className="pl-10"
                          data-testid="input-vendor-email"
                          {...loginForm.register("email")}
                        />
                      </div>
                      {loginForm.formState.errors.email && (
                        <p className="text-red-600 text-sm mt-1">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="login-password" className="text-sm font-medium">
                        Password
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="pr-10"
                          data-testid="input-vendor-password"
                          {...loginForm.register("password")}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-3 h-4 w-4 text-gray-400"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-red-600 text-sm mt-1">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#330311] hover:bg-[#4a0418] text-white py-3"
                    disabled={loginMutation.isPending}
                    data-testid="button-vendor-login"
                  >
                    {loginMutation.isPending ? "Signing In..." : "Access Vendor Portal"}
                  </Button>

                  <div className="text-center">
                    <Link href="/vendor-portal/forgot-password">
                      <Button variant="link" className="text-[#330311]">
                        Forgot your password?
                      </Button>
                    </Link>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register" className="p-8">
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Join Our Vendor Network</h3>
                  <p className="text-blue-700 text-sm">
                    Register your business to access event opportunities, manage contracts, and grow your revenue through Event Perfekt's network.
                  </p>
                </div>

                <form onSubmit={registrationForm.handleSubmit((data) => registrationMutation.mutate(data))} className="space-y-6">
                  {/* Company Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName" className="text-sm font-medium">
                        Company Name *
                      </Label>
                      <div className="relative mt-1">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="companyName"
                          placeholder="Your Company Ltd"
                          className="pl-10"
                          data-testid="input-company-name"
                          {...registrationForm.register("companyName")}
                        />
                      </div>
                      {registrationForm.formState.errors.companyName && (
                        <p className="text-red-600 text-xs mt-1">{registrationForm.formState.errors.companyName.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="contactPersonName" className="text-sm font-medium">
                        Contact Person *
                      </Label>
                      <Input
                        id="contactPersonName"
                        placeholder="John Smith"
                        data-testid="input-contact-person"
                        {...registrationForm.register("contactPersonName")}
                      />
                      {registrationForm.formState.errors.contactPersonName && (
                        <p className="text-red-600 text-xs mt-1">{registrationForm.formState.errors.contactPersonName.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="reg-email" className="text-sm font-medium">
                        Business Email *
                      </Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="contact@yourcompany.com"
                          className="pl-10"
                          data-testid="input-register-email"
                          {...registrationForm.register("email")}
                        />
                      </div>
                      {registrationForm.formState.errors.email && (
                        <p className="text-red-600 text-xs mt-1">{registrationForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium">
                        Phone Number *
                      </Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          placeholder="+44 20 7123 4567"
                          className="pl-10"
                          data-testid="input-phone"
                          {...registrationForm.register("phone")}
                        />
                      </div>
                      {registrationForm.formState.errors.phone && (
                        <p className="text-red-600 text-xs mt-1">{registrationForm.formState.errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="reg-password" className="text-sm font-medium">
                        Password *
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="reg-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Minimum 8 characters"
                          className="pr-10"
                          data-testid="input-register-password"
                          {...registrationForm.register("password")}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-3 h-4 w-4 text-gray-400"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                      {registrationForm.formState.errors.password && (
                        <p className="text-red-600 text-xs mt-1">{registrationForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">
                        Confirm Password *
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          className="pr-10"
                          data-testid="input-confirm-password"
                          {...registrationForm.register("confirmPassword")}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-3 h-4 w-4 text-gray-400"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                      {registrationForm.formState.errors.confirmPassword && (
                        <p className="text-red-600 text-xs mt-1">{registrationForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <Label htmlFor="companyAddress" className="text-sm font-medium">
                      Company Address *
                    </Label>
                    <div className="relative mt-1">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Textarea
                        id="companyAddress"
                        placeholder="Full business address including postcode"
                        className="pl-10 min-h-[80px]"
                        data-testid="input-address"
                        {...registrationForm.register("companyAddress")}
                      />
                    </div>
                    {registrationForm.formState.errors.companyAddress && (
                      <p className="text-red-600 text-xs mt-1">{registrationForm.formState.errors.companyAddress.message}</p>
                    )}
                  </div>

                  {/* Business Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="businessType" className="text-sm font-medium">
                        Business Type *
                      </Label>
                      <Select onValueChange={(value) => registrationForm.setValue("businessType", value)}>
                        <SelectTrigger className="mt-1" data-testid="select-business-type">
                          <SelectValue placeholder="Select your business type" />
                        </SelectTrigger>
                        <SelectContent>
                          {businessTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {registrationForm.formState.errors.businessType && (
                        <p className="text-red-600 text-xs mt-1">{registrationForm.formState.errors.businessType.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="yearsInBusiness" className="text-sm font-medium">
                        Years in Business *
                      </Label>
                      <div className="relative mt-1">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="yearsInBusiness"
                          type="number"
                          placeholder="5"
                          className="pl-10"
                          data-testid="input-years-business"
                          {...registrationForm.register("yearsInBusiness")}
                        />
                      </div>
                      {registrationForm.formState.errors.yearsInBusiness && (
                        <p className="text-red-600 text-xs mt-1">{registrationForm.formState.errors.yearsInBusiness.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Services Offered */}
                  <div>
                    <Label className="text-sm font-medium mb-4 block">
                      Services Offered * (Select all that apply)
                    </Label>
                    <div className="space-y-6">
                      {Object.entries(serviceCategories).map(([category, services]) => (
                        <div key={category} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-[#330311] mb-3 text-base">
                            {category}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {services.map((service) => (
                              <div key={service} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`service-${service}`}
                                  checked={selectedServices.includes(service)}
                                  onCheckedChange={() => handleServiceToggle(service)}
                                  data-testid={`checkbox-service-${service.toLowerCase().replace(/\s+/g, '-')}`}
                                />
                                <Label htmlFor={`service-${service}`} className="text-sm">
                                  {service}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedServices.length === 0 && registrationForm.formState.errors.servicesOffered && (
                      <p className="text-red-600 text-xs mt-1">Please select at least one service</p>
                    )}
                  </div>

                  {/* Service Areas */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">
                      Service Areas * (Select all areas you serve)
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {serviceAreas.map((area) => (
                        <div key={area} className="flex items-center space-x-2">
                          <Checkbox
                            id={`area-${area}`}
                            checked={selectedAreas.includes(area)}
                            onCheckedChange={() => handleAreaToggle(area)}
                            data-testid={`checkbox-area-${area.toLowerCase()}`}
                          />
                          <Label htmlFor={`area-${area}`} className="text-sm">
                            {area}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {selectedAreas.length === 0 && registrationForm.formState.errors.serviceAreas && (
                      <p className="text-red-600 text-xs mt-1">Please select at least one service area</p>
                    )}
                  </div>

                  {/* Terms and Conditions */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="agreeToTerms"
                        {...registrationForm.register("agreeToTerms")}
                        data-testid="checkbox-terms"
                      />
                      <div>
                        <Label htmlFor="agreeToTerms" className="text-sm">
                          I agree to the <Link href="/vendor-terms" className="text-[#330311] underline">Terms and Conditions</Link> and <Link href="/vendor-privacy" className="text-[#330311] underline">Privacy Policy</Link>
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          By registering, you agree to provide accurate information and comply with our vendor requirements.
                        </p>
                      </div>
                    </div>
                    {registrationForm.formState.errors.agreeToTerms && (
                      <p className="text-red-600 text-xs mt-2">{registrationForm.formState.errors.agreeToTerms.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#330311] hover:bg-[#4a0418] text-white py-3"
                    disabled={registrationMutation.isPending}
                    data-testid="button-vendor-register"
                  >
                    {registrationMutation.isPending ? "Creating Account..." : "Join Vendor Network"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-gray-300 mb-4">
            Need help or have questions about becoming a vendor?
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/vendor-support">
              <Button variant="outline" className="text-white border-white hover:bg-white hover:text-[#330311]">
                Contact Support
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="text-white border-white hover:bg-white hover:text-[#330311]">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}