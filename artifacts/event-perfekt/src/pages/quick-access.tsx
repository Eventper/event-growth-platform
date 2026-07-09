import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function QuickAccess() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-black">Quick Access Hub</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Link href="/auth-test">
              <Button className="w-full bg-[#330311] text-white">
                🔐 Authentication Test
              </Button>
            </Link>
            
            <Link href="/auth">
              <Button className="w-full bg-[#330311] text-white">
                📝 Main Login Page
              </Button>
            </Link>
            
            <Link href="/debug">
              <Button className="w-full bg-[#330311] text-white">
                🛠️ Simple Debug Page
              </Button>
            </Link>
            
            <Link href="/login-test">
              <Button className="w-full bg-[#330311] text-white">
                🔍 Full Login Test
              </Button>
            </Link>
          </div>
          
          <div className="text-center text-sm text-gray-600 mt-6 p-4 bg-gray-50 rounded">
            <p><strong>Test Credentials:</strong></p>
            <p>Email: test@example.com</p>
            <p>Password: password123</p>
            <p className="mt-2 text-xs">Backend confirmed working ✅</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}