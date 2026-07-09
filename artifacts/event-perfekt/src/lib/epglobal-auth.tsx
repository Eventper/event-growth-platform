import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface EPGlobalUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "finance" | "operations" | "accountant";
  department?: string;
}

interface EPGlobalAuthCtx {
  user: EPGlobalUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const Ctx = createContext<EPGlobalAuthCtx>({} as EPGlobalAuthCtx);

export function EPGlobalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<EPGlobalUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("epglobal_token");
    if (t) {
      setToken(t);
      fetch("/api/epglobal/auth/me", { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.json())
        .then(u => { if (u.id) setUser(u); else localStorage.removeItem("epglobal_token"); })
        .catch(() => localStorage.removeItem("epglobal_token"))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const r = await fetch("/api/epglobal/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "Login failed");
    localStorage.setItem("epglobal_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("epglobal_token");
    setToken(null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, token, login, logout, isLoading }}>{children}</Ctx.Provider>;
}

export function useEPGlobalAuth() {
  return useContext(Ctx);
}

export async function epgFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("epglobal_token");
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}
