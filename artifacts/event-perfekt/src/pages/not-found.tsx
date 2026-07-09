import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{backgroundColor: '#330311'}}>
      <Card className="w-full max-w-md mx-4 bg-white/10 backdrop-blur-sm border-white/20">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center justify-center text-center">
            <AlertCircle className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold text-white">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-white/80 text-center">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          
          <div className="mt-6 text-center">
            <Link href="/">
              <Button 
                className="font-semibold"
                style={{backgroundColor: '#A53B5C', color: 'white'}}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
