import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Heart, Building2, Mail, Lock, User, MapPin, Calendar, Phone, Briefcase, FileSearch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

export default function LoginUnified() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, register } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "client",
    country: "",
    phone: "",
    department: "",
    jobTitle: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await login({
        email: loginData.email,
        password: loginData.password,
      });

      toast({
        title: "Login Successful",
        description: "Welcome back to Event Perfekt!",
      });

      if (response.user.role === "planner" || response.user.role === "admin") {
        setLocation("/planner-dashboard");
      } else {
        setLocation("/client-dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Registration Failed",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (registerData.password.length < 6) {
      toast({
        title: "Registration Failed",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name: registerData.name,
        email: registerData.email,
        username: registerData.username || registerData.email,
        password: registerData.password,
        role: registerData.role,
        country: registerData.country,
        phone: registerData.phone,
        department: registerData.department,
        jobTitle: registerData.jobTitle,
      });

      toast({
        title: "Registration Successful",
        description: "Welcome to Event Perfekt! You're now logged in.",
      });

      if (registerData.role === "planner") {
        setLocation("/planner-dashboard");
      } else {
        setLocation("/client-dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again with different details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const countries = [
    "Nigeria", "United Kingdom", "United States", "Canada", "Australia", "South Africa",
    "Ghana", "Kenya", "Uganda", "Tanzania", "Rwanda", "Ethiopia", "Egypt", "Morocco", "Tunisia",
    "Senegal", "Côte d'Ivoire", "Burkina Faso", "Mali", "Cameroon", "Angola", "Mozambique",
    "Zambia", "Zimbabwe", "Botswana", "Namibia", "Germany", "France", "Italy", "Spain", 
    "Netherlands", "Belgium", "Switzerland", "Austria", "Sweden", "Norway", "Denmark", 
    "Finland", "Ireland", "New Zealand", "India", "China", "Japan", "South Korea", "Singapore", 
    "Hong Kong", "Malaysia", "Thailand", "Philippines", "Indonesia", "Vietnam", "Bangladesh",
    "Pakistan", "Sri Lanka", "UAE", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman",
    "Brazil", "Mexico", "Argentina", "Chile", "Colombia", "Peru", "Venezuela", "Jamaica",
    "Trinidad and Tobago", "Barbados", "Other"
  ];

  return (
    <div className="min-h-screen" style={{backgroundColor: '#330311'}}>
      {/* Header */}
      <header style={{backgroundColor: '#2a0209'}} className="shadow-lg">
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
              <Button variant="ghost" className="text-white border border-white/50" style={{backgroundColor: 'transparent', color: 'white'}}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-4">Access Event Perfekt</h2>
          <p className="text-xl text-white/80">
            Sign in to your account or create a new one to get started
          </p>
        </div>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-0">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5">
                <TabsTrigger value="login" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
                  Create Account
                </TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login" className="p-6">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-white flex items-center">
                        <Mail className="mr-2 h-4 w-4" />
                        Email Address
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                        data-testid="input-login-email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-white flex items-center">
                        <Lock className="mr-2 h-4 w-4" />
                        Password
                      </Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                        data-testid="input-login-password"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full font-semibold text-lg py-3"
                    disabled={isLoading}
                    style={{backgroundColor: '#A53B5C', color: 'white'}}
                    data-testid="button-login-submit"
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>

                  <div className="text-center">
                    <Link href="/forgot-password" className="text-white/80 underline text-sm">
                      Forgot your password?
                    </Link>
                  </div>
                </form>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register" className="p-6">
                {/* Role Selection */}
                <div className="mb-8">
                  <h3 className="text-white text-lg font-semibold mb-4 text-center">Select Your Account Type</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => setRegisterData({ ...registerData, role: 'client' })}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        registerData.role === 'client'
                          ? 'border-white bg-white/20 text-white'
                          : 'border-white/30 bg-white/10 text-white/70'
                      }`}
                      data-testid="button-role-client"
                    >
                      <Heart className="h-6 w-6 mx-auto mb-2" />
                      <h4 className="font-semibold text-sm">Client</h4>
                      <p className="text-xs mt-1">Planning events</p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setRegisterData({ ...registerData, role: 'planner' })}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        registerData.role === 'planner'
                          ? 'border-white bg-white/20 text-white'
                          : 'border-white/30 bg-white/10 text-white/70'
                      }`}
                      data-testid="button-role-planner"
                    >
                      <Calendar className="h-6 w-6 mx-auto mb-2" />
                      <h4 className="font-semibold text-sm">Event Planner</h4>
                      <p className="text-xs mt-1">Professional planning</p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setRegisterData({ ...registerData, role: 'vendor' })}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        registerData.role === 'vendor'
                          ? 'border-white bg-white/20 text-white'
                          : 'border-white/30 bg-white/10 text-white/70'
                      }`}
                      data-testid="button-role-vendor"
                    >
                      <Building2 className="h-6 w-6 mx-auto mb-2" />
                      <h4 className="font-semibold text-sm">Vendor</h4>
                      <p className="text-xs mt-1">Event services</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegisterData({ ...registerData, role: 'staff' })}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        registerData.role === 'staff'
                          ? 'border-white bg-white/20 text-white'
                          : 'border-white/30 bg-white/10 text-white/70'
                      }`}
                      data-testid="button-role-staff"
                    >
                      <User className="h-6 w-6 mx-auto mb-2" />
                      <h4 className="font-semibold text-sm">Staff</h4>
                      <p className="text-xs mt-1">Team member</p>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name" className="text-white flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Full Name
                      </Label>
                      <Input
                        id="register-name"
                        placeholder="John Doe"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        required
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                        data-testid="input-register-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-white flex items-center">
                        <Mail className="mr-2 h-4 w-4" />
                        Email Address
                      </Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                        data-testid="input-register-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-username" className="text-white">Username (optional)</Label>
                    <Input
                      id="register-username"
                      placeholder="johndoe"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                      data-testid="input-register-username"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-white flex items-center">
                        <Lock className="mr-2 h-4 w-4" />
                        Password
                      </Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                        minLength={6}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                        data-testid="input-register-password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm" className="text-white flex items-center">
                        <Lock className="mr-2 h-4 w-4" />
                        Confirm Password
                      </Label>
                      <Input
                        id="register-confirm"
                        type="password"
                        placeholder="Repeat password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        required
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                        data-testid="input-register-confirm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white flex items-center">
                      <MapPin className="mr-2 h-4 w-4" />
                      Country *
                    </Label>
                    <Select value={registerData.country} onValueChange={(value) => setRegisterData({ ...registerData, country: value })}>
                      <SelectTrigger className="bg-white/20 border-white/30 text-white" data-testid="select-register-country">
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {registerData.role === 'staff' && (
                    <div className="border border-white/20 rounded-lg p-4 space-y-4 bg-white/5">
                      <p className="text-white/60 text-xs uppercase tracking-wider font-semibold">Staff Details</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white flex items-center">
                            <Phone className="mr-2 h-4 w-4" />
                            Phone Number
                          </Label>
                          <Input
                            placeholder="+44 7700 900000"
                            value={registerData.phone}
                            onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                            className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white flex items-center">
                            <Briefcase className="mr-2 h-4 w-4" />
                            Job Title
                          </Label>
                          <Input
                            placeholder="e.g. Event Coordinator"
                            value={registerData.jobTitle}
                            onChange={(e) => setRegisterData({ ...registerData, jobTitle: e.target.value })}
                            className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white flex items-center">
                          <Building2 className="mr-2 h-4 w-4" />
                          Department
                        </Label>
                        <Select value={registerData.department} onValueChange={(value) => setRegisterData({ ...registerData, department: value })}>
                          <SelectTrigger className="bg-white/20 border-white/30 text-white">
                            <SelectValue placeholder="Select your department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planning">Planning & Coordination</SelectItem>
                            <SelectItem value="design">Design & Creative</SelectItem>
                            <SelectItem value="vendor_relations">Vendor Relations</SelectItem>
                            <SelectItem value="client_services">Client Services</SelectItem>
                            <SelectItem value="operations">Operations</SelectItem>
                            <SelectItem value="marketing">Marketing & Sales</SelectItem>
                            <SelectItem value="finance">Finance & Admin</SelectItem>
                            <SelectItem value="management">Management</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full font-semibold text-lg py-3"
                    disabled={isLoading}
                    style={{backgroundColor: '#A53B5C', color: 'white'}}
                    data-testid="button-register-submit"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>

                  <p className="text-center text-white/70 text-sm">
                    By creating an account, you agree to our <a href="/terms-of-service" target="_blank" className="text-[#8B1538] hover:underline">Terms of Service</a> and <a href="/privacy-policy" target="_blank" className="text-[#8B1538] hover:underline">Privacy Policy</a>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Additional Options */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center justify-center space-x-6">
            <Link href="/about" className="text-white/80 underline flex items-center">
              <Heart className="mr-1 h-4 w-4" />
              Learn About Event Perfekt
            </Link>
            <a href="mailto:support@eventperfekt.com" className="text-white/80 underline flex items-center">
              <Mail className="mr-1 h-4 w-4" />
              Contact Support
            </a>
            <Link href="/auth-test" className="text-white/80 underline flex items-center">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Auth Test Page
            </Link>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <h3 className="text-white font-semibold mb-2">Professional Planners</h3>
            <p className="text-white/80 text-sm">
              Join our network of expert event planners. Create a planner account to access our comprehensive planning tools, vendor network, and client management system.
            </p>
          </div>

          <Link href="/saas-tender">
            <div className="bg-gradient-to-r from-[#1A0A0E] to-[#2A1018] backdrop-blur-sm rounded-lg p-5 border border-[#ffffff]/40 cursor-pointer hover:border-[#ffffff]/80 transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-[#ffffff]/20 flex items-center justify-center">
                    <FileSearch className="h-5 w-5 text-[#ffffff]" />
                  </div>
                  <div>
                    <h3 className="text-[#ffffff] font-bold text-lg">Tender Command Centre</h3>
                    <p className="text-white/60 text-sm">Bid management, procurement intelligence & tender tracking</p>
                  </div>
                </div>
                <ArrowLeft className="h-5 w-5 text-[#ffffff] rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}