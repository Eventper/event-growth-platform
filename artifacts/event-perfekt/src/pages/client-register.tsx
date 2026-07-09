import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Heart, User, Mail, Lock, Globe, CheckCircle, ArrowRight } from "lucide-react";
import FormHelperBot from "@/components/FormHelperBot";

const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany", "France", 
  "Italy", "Spain", "Netherlands", "Switzerland", "Japan", "Singapore", "UAE", "Other"
];

export default function ClientRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: ""
  });

  const registerMutation = useMutation({
    mutationFn: async (data: Omit<typeof formData, "confirmPassword">) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      toast({
        title: "Welcome to Event Perfekt!",
        description: "Your account has been created successfully. Let's start planning your event!",
      });
      
      // Redirect to client dashboard
      setLocation("/client-dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    const { confirmPassword, ...registerData } = formData;
    registerMutation.mutate(registerData);
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-burgundy-900 to-burgundy-800">
      {/* Header */}
      <div className="bg-burgundy-900 text-white py-4">
        <div className="container mx-auto px-4">
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer transition-opacity">
              <Heart className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Event Perfekt</h1>
                <p className="text-sm opacity-90">Create Your Account</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Benefits */}
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl font-bold text-white mb-4">
                  Start Your Event Journey
                </h2>
                <p className="text-lg text-white leading-relaxed">
                  Join thousands of clients who trust Event Perfekt to create their perfect celebrations. 
                  Get personalized planning, expert guidance, and stress-free execution.
                </p>
              </div>

              <div className="grid gap-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-burgundy-100 p-3 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-burgundy-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Personalized Planning</h3>
                    <p className="text-white opacity-90">Dedicated planner matched to your event type and style</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-burgundy-100 p-3 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-burgundy-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Real-Time Updates</h3>
                    <p className="text-white opacity-90">Track every detail through your personal dashboard</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-burgundy-100 p-3 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-burgundy-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Comprehensive Services</h3>
                    <p className="text-white opacity-90">21 specialized services from planning to execution</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-burgundy-100 p-3 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-burgundy-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Global Experience</h3>
                    <p className="text-white opacity-90">International event planning expertise</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border border-burgundy-600 bg-[#1a0206]">
                <h4 className="font-semibold text-white mb-2">What happens next?</h4>
                <p className="text-white text-sm leading-relaxed">
                  Submit your event details through our planning form, receive a personalized quote within 24 hours, accept the proposal and make your secure deposit, get matched with your dedicated event planner, and watch your dream event come to life.
                </p>
              </div>
            </div>

            {/* Right Side - Registration Form */}
            <div className="lg:max-w-md mx-auto w-full">
              <Card className="shadow-2xl border-0 bg-burgundy-800">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-white">
                    Create Your Account
                  </CardTitle>
                  <p className="text-white opacity-90 mt-2">
                    Join Event Perfekt to start planning
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center space-x-2 text-white">
                        <User className="w-4 h-4 text-white" />
                        <span>Full Name</span>
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleInputChange("name")}
                        required
                        className="border-burgundy-200 focus:border-burgundy-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center space-x-2 text-white">
                        <Mail className="w-4 h-4 text-white" />
                        <span>Email Address</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={formData.email}
                        onChange={handleInputChange("email")}
                        required
                        className="border-burgundy-200 focus:border-burgundy-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country" className="flex items-center space-x-2 text-white">
                        <Globe className="w-4 h-4 text-white" />
                        <span>Country</span>
                      </Label>
                      <Select value={formData.country} onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}>
                        <SelectTrigger className="border-burgundy-200 focus:border-burgundy-500">
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map(country => (
                            <SelectItem key={country} value={country}>{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center space-x-2 text-white">
                        <Lock className="w-4 h-4 text-white" />
                        <span>Password</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Create a secure password"
                        value={formData.password}
                        onChange={handleInputChange("password")}
                        required
                        className="border-burgundy-200 focus:border-burgundy-500"
                      />
                      <p className="text-xs text-white opacity-70">Minimum 6 characters</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="flex items-center space-x-2 text-white">
                        <Lock className="w-4 h-4 text-white" />
                        <span>Confirm Password</span>
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange("confirmPassword")}
                        required
                        className="border-burgundy-200 focus:border-burgundy-500"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-burgundy-700 text-white py-3"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        "Creating Account..."
                      ) : (
                        <>
                          Create My Account
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>

                  <Separator />

                  <div className="text-center space-y-4">
                    <p className="text-sm text-white">
                      Already have an account?{" "}
                      <Link href="/client-login" className="text-burgundy-200 font-medium underline">
                        Sign in here
                      </Link>
                    </p>
                  </div>

                  <Alert className="border-gray-600 bg-black">
                    <Heart className="w-4 h-4 text-white" />
                    <AlertDescription className="text-white text-xs">
                      By creating an account, you agree to our privacy policy and terms of service. 
                      We'll never share your information with third parties.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <FormHelperBot formContext="client-register" welcomeMessage="Hi! Creating an account is quick and easy. Ask me if you need help with anything." suggestedQuestions={["Why do I need an account?", "Is my information secure?", "What can I do once registered?"]} />
      <FormHelperBot formContext="client-register" welcomeMessage="Hi! Creating an account is quick and easy. Ask me if you need help with anything." suggestedQuestions={["Why do I need an account?", "Is my information secure?", "What can I do once registered?"]} />
    </div>
  );
}