import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost } from "@/lib/api";
import { Mail, Lock, User, ArrowLeft, KeyRound, Play, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";

const BURGUNDY = "#330311";
const GOLD = "#C9A961";

export default function LoginPage() {
  const { login, register, user } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("token") ? "reset" : "login";
    }
    return "login";
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        setLocation("/dashboard");
      } else if (mode === "register") {
        await register(name, email, password);
        setLocation("/dashboard");
      } else if (mode === "forgot") {
        const data = await apiPost<{ ok: boolean; error?: string }>("/api/growth/auth/forgot-password", { email });
        if (!data.ok) throw new Error(data.error || "Failed to send reset link");
        setSuccess("If an account exists, a reset link has been sent to your email.");
      } else if (mode === "reset") {
        const token = new URLSearchParams(window.location.search).get("token");
        if (!token) throw new Error("Reset token missing from URL");
        const data = await apiPost<{ ok: boolean; error?: string }>("/api/growth/auth/reset-password", { token, password });
        if (!data.ok) throw new Error(data.error || "Reset failed");
        setSuccess("Password reset successfully. You can now log in.");
        setTimeout(() => setMode("login"), 2000);
      }
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await apiPost<{ ok: boolean; token?: string; error?: string }>("/api/growth/auth/demo", {});
      if (!data.ok) throw new Error(data.error || "Demo creation failed");
      if (!data.token) throw new Error("Demo token missing");
      localStorage.setItem("growth-token", data.token);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Demo creation failed");
    } finally {
      setLoading(false);
    }
  };

  const titleText = mode === "login" ? "Event Perfekt Growth Intelligence Hub" : mode === "register" ? "Create account" : mode === "forgot" ? "Reset password" : "New password";
  const subtitleText = mode === "login" ? "Sign in to your account" : mode === "register" ? "Create your account" : mode === "forgot" ? "Enter your email to receive a reset link" : "Enter your new password";
  const submitText = mode === "login" ? "Sign in" : mode === "register" ? "Create Account" : mode === "forgot" ? "Send Reset Link" : "Reset Password";

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BURGUNDY }}>
      <div className="w-full max-w-sm bg-white rounded-lg p-8 shadow-2xl">
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center mb-4"
            style={{ background: "#1A1714" }}
          >
            <span className="text-sm font-bold tracking-wider" style={{ color: GOLD }}>EP</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#1A1714" }}>
            {titleText}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>{subtitleText}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: "#1A1714" }}>Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4" style={{ color: "#9CA3AF" }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: "#E5E7EB", background: "#F9FAFB", color: "#1A1714" }}
                  required
                />
              </div>
            </div>
          )}
          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: "#1A1714" }}>Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4" style={{ color: "#9CA3AF" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@eventperfekt.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: "#E5E7EB", background: "#F9FAFB", color: "#1A1714" }}
                  required
                />
              </div>
            </div>
          )}
          {(mode === "login" || mode === "register" || mode === "reset") && (
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: "#1A1714" }}>
                {mode === "reset" ? "New Password" : "Password"}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4" style={{ color: "#9CA3AF" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: "#E5E7EB", background: "#F9FAFB", color: "#1A1714" }}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" style={{ color: "#9CA3AF" }} />
                  ) : (
                    <Eye className="w-4 h-4" style={{ color: "#9CA3AF" }} />
                  )}
                </button>
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: BURGUNDY }}
          >
            {loading ? "Processing..." : submitText}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center text-sm space-y-2">
          {mode === "login" && (
            <>
              <div>
                <button
                  className="font-medium hover:underline"
                  style={{ color: BURGUNDY }}
                  onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                >
                  Forgot your password?
                </button>
              </div>
              <div className="text-xs" style={{ color: "#6B7280" }}>
                Contact your administrator to reset your password
              </div>
              <div className="pt-2 border-t border-gray-200 mt-3 space-y-2">
                <div>
                  No account?{" "}
                  <button
                    className="font-medium hover:underline"
                    style={{ color: BURGUNDY }}
                    onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
                  >
                    Create one
                  </button>
                </div>
                <div>
                  <button
                    onClick={handleDemo}
                    disabled={loading}
                    className="font-medium hover:underline inline-flex items-center gap-1"
                    style={{ color: BURGUNDY }}
                  >
                    <Play className="w-3 h-3" /> Try Demo Account
                  </button>
                </div>
              </div>
            </>
          )}
          {mode === "register" && (
            <div>
              Already have an account?{" "}
              <button
                className="font-medium hover:underline"
                style={{ color: BURGUNDY }}
                onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              >
                Sign in
              </button>
            </div>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <div>
              <button
                className="font-medium hover:underline inline-flex items-center gap-1"
                style={{ color: BURGUNDY }}
                onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              >
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
