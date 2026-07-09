import { useState } from "react";
import { useLocation } from "wouter";
import { useEPGlobalAuth } from "@/lib/epglobal-auth";
import { Building2, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EPGlobalLogin() {
  const { login, user } = useEPGlobalAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    setLocation("/epglobal/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/epglobal/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a3a6b] to-[#0d2547] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Building2 className="h-9 w-9 text-[#1a3a6b]" />
          </div>
          <h1 className="text-2xl font-bold text-white">EP Global</h1>
          <p className="text-white/60 text-sm mt-1">Operational Hub</p>
          <p className="text-white/40 text-xs mt-1">Internal Staff Portal — UK</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sign in to your workspace</h2>
          <p className="text-gray-500 text-sm mb-6">Use your EP Global staff credentials</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@epglobal.co.uk"
                required
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a3a6b] hover:bg-[#0d2547] text-white font-semibold py-2.5"
            >
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG
            </p>
            <p className="text-xs text-gray-300 text-center mt-1">
              Demo: admin@epglobal.co.uk · EPGlobal2024!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
