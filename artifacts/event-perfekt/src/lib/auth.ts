import { apiRequest } from './queryClient';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  message: string;
}

export interface RegisterData {
  username?: string;
  email: string;
  name: string;
  password: string;
  role?: string;
  country?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

class AuthManager {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await apiRequest('POST', '/api/auth/register', data);
    
    if (response.token && response.user) {
      this.setAuth(response.token, response.user);
    }
    
    return response;
  }

  async login(data: LoginData): Promise<LoginResponse> {
    const response = await apiRequest('POST', '/api/auth/login', data);
    
    if (response.token && response.user) {
      this.setAuth(response.token, response.user);
    }
    
    return response;
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.token) {
      return null;
    }

    try {
      const user = await apiRequest('GET', '/api/me');
      this.user = user;
      return user;
    } catch (error) {
      // Token might be invalid
      this.logout();
      throw error;
    }
  }

  logout(): void {
    if (typeof window !== 'undefined' && this.token) {
      fetch('/api/staff-sessions/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      }).catch(() => {});
      fetch('/api/task-timers/stop', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Auto-stopped on logout' }),
      }).catch(() => {});
    }
    this.token = null;
    this.user = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  hasRole(roles: string | string[]): boolean {
    if (!this.user) return false;
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(this.user.role);
  }

  isPlanner(): boolean {
    return this.hasRole(['planner', 'admin']);
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  private setAuth(token: string, user: User): void {
    this.token = token;
    this.user = user;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      fetch('/api/staff-sessions/login', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      }).catch(() => {});
    }
  }
}

export const authManager = new AuthManager();

// Hook for React components
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState<User | null>(authManager.getUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (authManager.isAuthenticated()) {
        try {
          const currentUser = await authManager.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (data: LoginData) => {
    const response = await authManager.login(data);
    setUser(response.user);
    
    // Generate session ID for activity tracking
    if (response.user && (response.user.role === 'planner' || response.user.role === 'admin')) {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sessionId', sessionId);
      
      // Track login activity
      await trackActivity('login', 'dashboard', { loginTime: new Date().toISOString() });
    }
    
    return response;
  };

  const register = async (data: RegisterData) => {
    const response = await authManager.register(data);
    setUser(response.user);
    return response;
  };

  const logout = () => {
    // Track logout activity
    if (user && (user.role === 'planner' || user.role === 'admin')) {
      trackActivity('logout', 'dashboard').catch(console.error);
    }
    
    authManager.logout();
    setUser(null);
    localStorage.removeItem('sessionId');
  };

  // Activity tracking function
  const trackActivity = async (action: string, section?: string, details?: any) => {
    if (!user || (user.role !== 'planner' && user.role !== 'admin')) return;
    
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) return;
    
    try {
      await fetch("/api/activities/recent", {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).catch(() => {});
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isPlanner: authManager.isPlanner(),
    isAdmin: authManager.isAdmin(),
    isClient: user?.role === 'client',
    hasRole: authManager.hasRole.bind(authManager),
    sessionId: localStorage.getItem('sessionId') || '',
    login,
    register,
    logout,
    trackActivity
  };
}