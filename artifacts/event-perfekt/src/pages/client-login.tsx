import { useState } from "react";
import { Link, useLocation } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AuthService } from "@/lib/authService";
import { Calendar, Heart, Sparkles, ArrowRight, Mail, Lock } from "lucide-react";

export default function ClientLogin() {
  usePageMeta({ title: "Client Login — Event Perfekt" });

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const loginMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Verify role and redirect appropriately
      if (data.user.role !== 'client') {
        // Redirect non-clients to their appropriate dashboard
        const dashboard = AuthService.getDefaultDashboard(data.user.role);
        setLocation(dashboard);
        toast({
          title: "Redirected",
          description: `Welcome back! Redirecting to ${data.user.role} dashboard.`,
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You've successfully logged into your Event Perfekt client portal.",
        });
        setLocation("/client-dashboard");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-burgundy-50 to-white">
      {/* Header */}
      <div className="bg-burgundy-900 text-white py-4">
        <div className="container mx-auto px-4">
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <Heart className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Event Perfekt</h1>
                <p className="text-sm opacity-90">Client Portal</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Branding */}
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl font-bold text-burgundy-900 mb-4">
                  Welcome Back to Your Event Journey
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Access your personalized event planning portal to track progress, 
                  communicate with your planner, and watch your dream event come to life.
                </p>
              </div>

              <div className="grid gap-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-burgundy-100 p-3 rounded-lg">
                    <Calendar className="w-6 h-6 text-burgundy-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-burgundy-900 mb-1">Track Your Timeline</h3>
                    <p className="text-gray-600">Monitor planning progress and upcoming milestones</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-burgundy-100 p-3 rounded-lg">
                    <Sparkles className="w-6 h-6 text-burgundy-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-burgundy-900 mb-1">Design Collaboration</h3>
                    <p className="text-gray-600">Review and approve venue designs and décor choices</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-burgundy-100 p-3 rounded-lg">
                    <Heart className="w-6 h-6 text-burgundy-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-burgundy-900 mb-1">Your Dream Event</h3>
                    <p className="text-gray-600">Real-time updates on budget, vendors, and arrangements</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="lg:max-w-md mx-auto w-full">
              <Card className="shadow-2xl border-0">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-burgundy-900">
                    Client Login
                  </CardTitle>
                  <p className="text-gray-600 mt-2">
                    Sign in to access your event dashboard
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
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
                      <Label htmlFor="password" className="flex items-center space-x-2">
                        <Lock className="w-4 h-4" />
                        <span>Password</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange("password")}
                        required
                        className="border-burgundy-200 focus:border-burgundy-500"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-burgundy-700 hover:bg-burgundy-800 text-white py-3"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        "Signing In..."
                      ) : (
                        <>
                          Sign In to Portal
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>

                  <Separator />

                  <div className="text-center space-y-4">
                    <p className="text-sm text-gray-600">
                      New to Event Perfekt?{" "}
                      <Link href="/client-register" className="text-burgundy-700 hover:text-burgundy-800 font-medium">
                        Create an account
                      </Link>
                    </p>
                    
                    <div className="text-xs text-gray-500">
                      <Link href="/forgot-password" className="hover:text-burgundy-700">
                        Forgot your password?
                      </Link>
                    </div>
                  </div>

                  <Alert className="border-burgundy-200 bg-burgundy-50">
                    <Heart className="w-4 h-4 text-burgundy-700" />
                    <AlertDescription className="text-burgundy-800">
                      <strong>Planning an event?</strong> Start with our{" "}
                      <Link href="/create-event" className="underline hover:no-underline">
                        event planning form
                      </Link>{" "}
                      to get a personalized quote.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Quick Links */}
              <div className="mt-6 text-center space-y-2">
                <p className="text-sm text-gray-600">Quick access:</p>
                <div className="flex justify-center space-x-4">
                  <Link href="/about" className="text-sm text-burgundy-700 hover:text-burgundy-800">
                    About Us
                  </Link>
                  <span className="text-gray-400">•</span>
                  <Link href="/create-event" className="text-sm text-burgundy-700 hover:text-burgundy-800">
                    Plan Event
                  </Link>
                  <span className="text-gray-400">•</span>
                  <Link href="/planner-login" className="text-sm text-burgundy-700 hover:text-burgundy-800">
                    Planner Portal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}