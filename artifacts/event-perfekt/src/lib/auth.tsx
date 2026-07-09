import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from './queryClient';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'planner' | 'admin' | 'collaborator';
  username?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPlanner: boolean;
  isAdmin: boolean;
  isClient: boolean;
  sessionId: string;
  login: (credentials: { email: string; password: string }) => Promise<{ user: User; token: string }>;
  register: (userData: any) => Promise<{ user: User; token: string }>;
  logout: () => void;
  trackActivity: (action: string, section?: string, details?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>('');

  // Generate session ID on mount
  useEffect(() => {
    const existingSessionId = localStorage.getItem('sessionId');
    if (existingSessionId) {
      setSessionId(existingSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('sessionId', newSessionId);
    }
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        
        // Track login activity
        if (parsedUser.role === 'planner' || parsedUser.role === 'admin') {
          trackActivity('login', 'dashboard');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      // Log login attempt without exposing credentials
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      // apiRequest already returns parsed JSON, so we don't need to call .json() again
      const data = response;
      
      if (!data.token) {
        throw new Error('No token received from server');
      }
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      
      // Track login activity for planners
      if (data.user.role === 'planner' || data.user.role === 'admin') {
        await trackActivity('login', 'dashboard');
      }
      
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      // Log registration attempt without exposing credentials
      const response = await apiRequest("POST", "/api/auth/register", userData);
      // apiRequest already returns parsed JSON, so we don't need to call .json() again
      const data = response;
      
      if (!data.token) {
        throw new Error('No token received from server');
      }
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      
      return data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = () => {
    // Track logout activity for planners
    if (user && (user.role === 'planner' || user.role === 'admin')) {
      trackActivity('logout', 'dashboard').catch(console.error);
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');
    setUser(null);
    
    // Generate new session ID for next login
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    localStorage.setItem('sessionId', newSessionId);
  };

  const trackActivity = async (action: string, section?: string, details?: any) => {
    if (!user || (user.role !== 'planner' && user.role !== 'admin')) return;
    
    try {
      await fetch("/api/activities/recent", {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).catch(() => {});
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isPlanner: user?.role === 'planner' || user?.role === 'admin' || (user as any)?.role === 'staff',
    isAdmin: user?.role === 'admin',
    isClient: user?.role === 'client',
    sessionId,
    login,
    register,
    logout,
    trackActivity
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}