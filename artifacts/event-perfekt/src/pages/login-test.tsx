import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginTest() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const testDirectLogin = async () => {
    setIsLoading(true);
    setResult("Testing login...");
    
    try {
      console.log("Direct API test - Starting");
      
      // Direct fetch to API
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      
      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log("Response data:", data);
      
      if (response.ok && data.token) {
        setResult("✅ LOGIN SUCCESS!\n" + JSON.stringify(data, null, 2));
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        setResult("❌ LOGIN FAILED:\n" + JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error("Login test error:", error);
      setResult("❌ ERROR:\n" + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const testAuthContext = async () => {
    setIsLoading(true);
    setResult("Testing auth context...");
    
    try {
      const { useAuth } = await import("@/lib/auth.tsx");
      const auth = useAuth();
      
      console.log("Auth context:", auth);
      const loginResult = await auth.login({ email, password });
      console.log("Auth login result:", loginResult);
      
      setResult("✅ AUTH CONTEXT SUCCESS!\n" + JSON.stringify(loginResult, null, 2));
    } catch (error) {
      console.error("Auth context error:", error);
      setResult("❌ AUTH CONTEXT ERROR:\n" + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Login Debug Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label>Email:</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="debug@test.com"
            />
          </div>
          <div>
            <label>Password:</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="test123"
            />
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={testDirectLogin} 
              disabled={isLoading}
              className="w-full"
              data-testid="button-test-direct"
            >
              Test Direct API Login
            </Button>
            
            <Button 
              onClick={testAuthContext} 
              disabled={isLoading}
              className="w-full"
              variant="secondary"
              data-testid="button-test-auth"
            >
              Test Auth Context Login
            </Button>
          </div>
          
          {result && (
            <div className="bg-gray-100 p-3 rounded-md">
              <pre className="text-xs whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}