import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

export interface AuthenticatedUser {
  id: string;
  role: 'client' | 'planner' | 'admin' | 'collaborator';
  permissions: string[];
  assignedEvents?: string[];
  clientId?: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser;
    }
  }
}

// Role-based permissions
const ROLE_PERMISSIONS = {
  client: [
    'view_own_events',
    'view_own_budget',
    'view_own_timeline',
    'view_own_files',
    'upload_files',
    'request_changes',
    'view_assigned_planner'
  ],
  planner: [
    'view_assigned_events',
    'edit_assigned_events',
    'manage_budget',
    'manage_timeline',
    'manage_vendors',
    'upload_files',
    'generate_contracts',
    'add_collaborators',
    'view_all_files',
    'manage_tasks'
  ],
  admin: [
    'view_all_events',
    'edit_all_events',
    'manage_all_budgets',
    'manage_all_timelines',
    'manage_all_vendors',
    'manage_users',
    'system_settings',
    'view_analytics',
    'manage_contracts',
    'global_oversight'
  ],
  collaborator: [
    'view_assigned_events',
    'edit_assigned_tasks',
    'upload_files',
    'view_assigned_timeline'
  ]
};

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract user from session or JWT token
    const userId = (req as any).session?.userId || req.headers.authorization;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get user details from storage
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid user' });
    }

    // Set authenticated user with permissions
    req.authenticatedUser = {
      id: user.id,
      role: user.role as any,
      permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [],
      assignedEvents: (user as any).assignedEvents || [],
      clientId: (user as any).clientId
    };

    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Authentication failed' });
  }
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authenticatedUser) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!req.authenticatedUser.permissions.includes(permission)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    return next();
  };
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authenticatedUser) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.authenticatedUser.role)) {
      return res.status(403).json({ message: 'Insufficient role permissions' });
    }

    return next();
  };
};

// Check if user can access specific event
export const canAccessEvent = async (userId: string, eventId: string, action: string = 'view'): Promise<boolean> => {
  const user = await storage.getUser(userId);
  if (!user) return false;

  const userRole = user.role;
  
  // Admins can access everything
  if (userRole === 'admin') return true;

  // Get event details
  const event = await storage.getEvent(eventId);
  if (!event) return false;

  // Clients can only access their own events
  if (userRole === 'client') {
    return event.clientId === (user as any).clientId;
  }

  // Planners can access assigned events
  if (userRole === 'planner') {
    return event.plannerId === userId || ((user as any).assignedEvents && (user as any).assignedEvents.includes(eventId));
  }

  // Collaborators can access events they're assigned to
  if (userRole === 'collaborator') {
    return (user as any).assignedEvents && (user as any).assignedEvents.includes(eventId);
  }

  return false;
};

// Event access middleware
export const requireEventAccess = (action: string = 'view') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const eventId = req.params.eventId || req.params.id;
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID required' });
    }

    if (!req.authenticatedUser) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const hasAccess = await canAccessEvent(req.authenticatedUser.id, String(eventId), action);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this event' });
    }

    return next();
  };
};