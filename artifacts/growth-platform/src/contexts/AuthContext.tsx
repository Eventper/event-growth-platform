import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiGet, apiPost } from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token on mount
  useEffect(() => {
    const stored = localStorage.getItem("growth-token");
    if (stored) {
      setToken(stored);
      // Verify token
      apiGet<{ ok: boolean; user: User }>("/api/growth/auth/me")
        .then((data) => {
          if (data.ok && data.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem("growth-token");
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem("growth-token");
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiPost<{ ok: boolean; token: string; user: User }>("/api/growth/auth/login", { email, password });
    if (!data.ok) {
      throw new Error("Login failed");
    }
    localStorage.setItem("growth-token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await apiPost<{ ok: boolean; token: string; user: User }>("/api/growth/auth/register", { name, email, password });
    if (!data.ok) {
      throw new Error("Registration failed");
    }
    localStorage.setItem("growth-token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("growth-token");
    setToken(null);
    setUser(null);
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Helper to add auth header to fetch calls
export function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("growth-token");
  const headers = {
    ...(options?.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(url, { ...options, headers });
}
