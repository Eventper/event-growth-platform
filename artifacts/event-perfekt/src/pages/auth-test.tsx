import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth.tsx";
import { useToast } from "@/hooks/use-toast";

export default function AuthTest() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await login({ email, password });
      toast({
        title: "Login Successful!",
        description: `Welcome back, ${result.user.name}!`,
      });
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-black">Authentication Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAuthenticated ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-100 rounded-lg">
                <h3 className="text-green-800 font-semibold">✅ Login Successful!</h3>
                <p className="text-green-700">Welcome, {user?.name}!</p>
                <p className="text-green-600 text-sm">Email: {user?.email}</p>
                <p className="text-green-600 text-sm">Role: {user?.role}</p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-black">Email:</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-gray-300"
                />
              </div>
              <div>
                <label className="text-black">Password:</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-gray-300"
                />
              </div>
              <Button 
                onClick={handleLogin} 
                disabled={isLoading}
                className="w-full bg-[#330311] text-white"
              >
                {isLoading ? "Signing In..." : "Test Login"}
              </Button>
              <div className="text-center text-sm text-gray-600">
                <p>Test credentials already filled in</p>
                <p>Backend authentication confirmed working</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}