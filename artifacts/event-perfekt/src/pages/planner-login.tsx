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
import { 
  Briefcase, 
  Calendar, 
  Settings, 
  ArrowRight, 
  Mail, 
  Lock, 
  Shield,
  Users,
  BarChart3,
  Palette
} from "lucide-react";

export default function PlannerLogin() {
  usePageMeta({ title: "Planner Login — Event Perfekt" });

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
      if (data.user.role === 'client') {
        // Redirect clients to client portal
        setLocation("/client-dashboard");
        toast({
          title: "Redirected",
          description: "Welcome back! Redirecting to client portal.",
        });
      } else if (['planner', 'admin', 'collaborator'].includes(data.user.role)) {
        toast({
          title: "Welcome back!",
          description: "Access granted to Event Perfekt planner suite.",
        });
        setLocation("/planner-dashboard");
      } else {
        toast({
          title: "Access Denied",
          description: "This portal is for planners and administrators only.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Access Denied",
        description: error.message || "Please verify your planner credentials.",
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-burgundy-900">
      {/* Header */}
      <div className="bg-slate-900 text-white py-4 border-b border-slate-700">
        <div className="container mx-auto px-4">
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <Briefcase className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Event Perfekt</h1>
                <p className="text-sm opacity-90">Professional Planner Suite</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Professional Features */}
            <div className="space-y-8 text-white">
              <div>
                <h2 className="text-4xl font-bold mb-4">
                  Professional Event Planning Suite
                </h2>
                <p className="text-lg text-slate-300 leading-relaxed">
                  Access advanced planning tools, client management systems, and 
                  comprehensive event orchestration capabilities.
                </p>
              </div>

              <div className="grid gap-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-slate-700 p-3 rounded-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Dynamic Timeline Management</h3>
                    <p className="text-slate-300">4-view timeline system with Agent-powered task generation</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-slate-700 p-3 rounded-lg">
                    <Palette className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">3D Venue Designer</h3>
                    <p className="text-slate-300">Agent-powered venue design with furniture placement</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-slate-700 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Budget & Vendor Management</h3>
                    <p className="text-slate-300">Complete financial tracking and vendor portfolios</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-slate-700 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Client Collaboration</h3>
                    <p className="text-slate-300">Real-time progress sharing and approval workflows</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                <h4 className="font-semibold text-white mb-2 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Secure Professional Access
                </h4>
                <p className="text-slate-300 text-sm">
                  Advanced role-based permissions with encrypted client data protection 
                  and audit-ready compliance features.
                </p>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="lg:max-w-md mx-auto w-full">
              <Card className="shadow-2xl border-slate-200 bg-white/95 backdrop-blur">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-slate-900 flex items-center justify-center space-x-2">
                    <Shield className="w-6 h-6" />
                    <span>Planner Access</span>
                  </CardTitle>
                  <p className="text-slate-600 mt-2">
                    Secure login to professional suite
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center space-x-2 text-slate-700">
                        <Mail className="w-4 h-4" />
                        <span>Professional Email</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="planner@eventperfekt.com"
                        value={formData.email}
                        onChange={handleInputChange("email")}
                        required
                        className="border-slate-300 focus:border-slate-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center space-x-2 text-slate-700">
                        <Lock className="w-4 h-4" />
                        <span>Secure Password</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your secure password"
                        value={formData.password}
                        onChange={handleInputChange("password")}
                        required
                        className="border-slate-300 focus:border-slate-500"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        "Authenticating..."
                      ) : (
                        <>
                          Access Planner Suite
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>

                  <Separator />

                  <div className="text-center space-y-4">
                    <div className="text-xs text-slate-500 space-y-2">
                      <div>
                        <Link href="/forgot-password" className="hover:text-slate-700">
                          Reset password
                        </Link>
                        {" • "}
                        <Link href="/admin-login" className="hover:text-slate-700">
                          Admin portal
                        </Link>
                      </div>
                    </div>
                  </div>

                  <Alert className="border-slate-200 bg-slate-50">
                    <Settings className="w-4 h-4 text-slate-700" />
                    <AlertDescription className="text-slate-800">
                      <strong>Need planner access?</strong> Contact your system administrator 
                      or email{" "}
                      <a href="mailto:admin@eventperfekt.com" className="underline hover:no-underline">
                        admin@eventperfekt.com
                      </a>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Professional Links */}
              <div className="mt-6 text-center space-y-2">
                <p className="text-sm text-slate-300">Other portals:</p>
                <div className="flex justify-center space-x-4">
                  <Link href="/client-login" className="text-sm text-slate-300 hover:text-white">
                    Client Portal
                  </Link>
                  <span className="text-slate-500">•</span>
                  <Link href="/admin-login" className="text-sm text-slate-300 hover:text-white">
                    Admin Access
                  </Link>
                  <span className="text-slate-500">•</span>
                  <Link href="/" className="text-sm text-slate-300 hover:text-white">
                    Public Site
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