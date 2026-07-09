export interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'planner' | 'admin' | 'collaborator';
}

export class AuthService {
  static getToken(): string | null {
    return localStorage.getItem('token');
  }

  static getUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      // Ensure user has required properties
      if (!user || !user.id || !user.email) {
        this.logout(); // Clear invalid user data
        return null;
      }
      
      // Set default role if missing
      if (!user.role) {
        user.role = 'client';
      }
      
      return user;
    } catch (error) {
      console.error('Error parsing user data:', error);
      this.logout(); // Clear corrupted user data
      return null;
    }
  }

  static isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  static isClient(): boolean {
    const user = this.getUser();
    return user?.role === 'client';
  }

  static isPlanner(): boolean {
    const user = this.getUser();
    return user?.role === 'planner';
  }

  static isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'admin';
  }

  static getDefaultDashboard(role?: string): string {
    const user = this.getUser();
    const userRole = role || user?.role || 'client'; // Default to client if no role found
    
    switch (userRole) {
      case 'client':
        return '/client-dashboard';
      case 'planner':
      case 'admin':
      case 'collaborator':
        return '/planner-dashboard';
      default:
        return '/';
    }
  }

  static logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }

  static redirectToDashboard(): void {
    const dashboard = this.getDefaultDashboard();
    window.location.href = dashboard;
  }
}