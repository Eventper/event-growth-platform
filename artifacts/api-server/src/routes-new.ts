import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { DatabaseStorage } from "./storage-database";
import { AuthService, authenticateToken, requireRole } from "./auth";
import { EmailService } from "./email";
import { PaymentService } from "./payment";
import {
  insertPrivateEventSubmissionSchema,
  insertCorporateEventSubmissionSchema,
  insertVendorSchema,
  insertTaskSchema,
  insertBudgetItemSchema,
  users,
  clients,
  events
} from "@workspace/db";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// insertUserSchema/insertClientSchema/insertEventSchema are not exported from
// @workspace/db, so reconstruct them here from the exported tables using the
// same drizzle-zod pattern lib/db uses to derive its Insert* types. A single
// cast on createInsertSchema bypasses a drizzle-orm version skew (lib/db 0.45.x
// vs the drizzle-zod build) that otherwise rejects the table type at compile
// time; runtime schema generation/validation is unaffected.
const buildInsertSchema = createInsertSchema as any;
const insertUserSchema = buildInsertSchema(users);
const insertClientSchema = buildInsertSchema(clients);
const insertEventSchema = buildInsertSchema(events);

// Initialize storage
const storage = new DatabaseStorage();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // ============================================================================
  // AUTHENTICATION ROUTES
  // ============================================================================
  
  // User registration
  app.post('/api/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Hash password
      const hashedPassword = await AuthService.hashPassword(userData.password);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Generate token
      const token = AuthService.generateToken(user);

      // Send welcome email
      await EmailService.sendWelcomeEmail(user.email, user.name);

      return res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(400).json({ message: 'Registration failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // User login
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await AuthService.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = AuthService.generateToken(user);

      return res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Login failed' });
    }
  });

  // Get current user
  app.get('/api/me', authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser((req as any).user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      });
    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({ message: 'Failed to get user' });
    }
  });

  // ============================================================================
  // EVENT SUBMISSION ROUTES (Public)
  // ============================================================================

  // Submit private event
  app.post('/api/submit-private-event', async (req, res) => {
    try {
      const submissionData = insertPrivateEventSubmissionSchema.parse(req.body);
      
      const submission = await storage.createPrivateEventSubmission(submissionData);

      // Send confirmation email
      await EmailService.sendEventSubmissionConfirmation(
        submissionData.email!,
        'private'
      );

      res.status(201).json({
        message: 'Private event submission received successfully',
        submissionId: submission.id
      });
    } catch (error) {
      console.error('Private event submission error:', error);
      res.status(400).json({ 
        message: 'Failed to submit private event', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Submit corporate event
  app.post('/api/submit-corporate-event', async (req, res) => {
    try {
      const submissionData = insertCorporateEventSubmissionSchema.parse(req.body);
      
      const submission = await storage.createCorporateEventSubmission(submissionData);

      // Send confirmation email
      await EmailService.sendEventSubmissionConfirmation(
        submissionData.email!,
        'corporate'
      );

      res.status(201).json({
        message: 'Corporate event submission received successfully',
        submissionId: submission.id
      });
    } catch (error) {
      console.error('Corporate event submission error:', error);
      res.status(400).json({ 
        message: 'Failed to submit corporate event', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // ============================================================================
  // CLIENT MANAGEMENT ROUTES (Protected)
  // ============================================================================

  // Get all clients (planners only)
  app.get('/api/clients', authenticateToken, requireRole(['planner', 'admin']), async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({ message: 'Failed to get clients' });
    }
  });

  // Create client (planners only)
  app.post('/api/clients', authenticateToken, requireRole(['planner', 'admin']), async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error('Create client error:', error);
      res.status(400).json({ message: 'Failed to create client' });
    }
  });

  // ============================================================================
  // EVENT MANAGEMENT ROUTES (Protected)
  // ============================================================================

  // Get all events
  app.get('/api/events', authenticateToken, async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ message: 'Failed to get events' });
    }
  });

  // Get single event
  app.get('/api/events/:id', authenticateToken, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      return res.json(event);
    } catch (error) {
      console.error('Get event error:', error);
      return res.status(500).json({ message: 'Failed to get event' });
    }
  });

  // Create event (planners only)
  app.post('/api/events', authenticateToken, requireRole(['planner', 'admin']), async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error('Create event error:', error);
      res.status(400).json({ message: 'Failed to create event' });
    }
  });

  // Update event (planners only)
  app.put('/api/events/:id', authenticateToken, requireRole(['planner', 'admin']), async (req, res) => {
    try {
      const eventData = insertEventSchema.partial().parse(req.body);
      const event = await storage.updateEvent(req.params.id, eventData);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      return res.json(event);
    } catch (error) {
      console.error('Update event error:', error);
      return res.status(400).json({ message: 'Failed to update event' });
    }
  });

  // Delete event (admin only)
  app.delete('/api/events/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const success = await storage.deleteEvent(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Event not found' });
      }
      return res.json({ message: 'Event deleted successfully' });
    } catch (error) {
      console.error('Delete event error:', error);
      return res.status(500).json({ message: 'Failed to delete event' });
    }
  });

  // ============================================================================
  // VENDOR MANAGEMENT ROUTES (Protected)
  // ============================================================================

  // Get vendors for event
  app.get('/api/events/:eventId/vendors', authenticateToken, async (req, res) => {
    try {
      const vendors = await storage.getVendorsByEventId(req.params.eventId);
      res.json(vendors);
    } catch (error) {
      console.error('Get vendors error:', error);
      res.status(500).json({ message: 'Failed to get vendors' });
    }
  });

  // Add vendor to event
  app.post('/api/events/:eventId/vendors', authenticateToken, requireRole(['planner', 'admin']), async (req, res) => {
    try {
      const vendorData = insertVendorSchema.parse({
        ...req.body,
        eventId: req.params.eventId
      });
      const vendor = await storage.createVendor(vendorData);
      res.status(201).json(vendor);
    } catch (error) {
      console.error('Create vendor error:', error);
      res.status(400).json({ message: 'Failed to create vendor' });
    }
  });

  // ============================================================================
  // TASK MANAGEMENT ROUTES (Protected)
  // ============================================================================

  // Get tasks for event
  app.get('/api/events/:eventId/tasks', authenticateToken, async (req, res) => {
    try {
      const tasks = await storage.getTasksByEventId(req.params.eventId);
      res.json(tasks);
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({ message: 'Failed to get tasks' });
    }
  });

  // Create task
  app.post('/api/events/:eventId/tasks', authenticateToken, requireRole(['planner', 'admin']), async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        eventId: req.params.eventId
      });
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      console.error('Create task error:', error);
      res.status(400).json({ message: 'Failed to create task' });
    }
  });

  // ============================================================================
  // BUDGET MANAGEMENT ROUTES (Protected)
  // ============================================================================

  // Get budget items for event
  app.get('/api/events/:eventId/budget', authenticateToken, async (req, res) => {
    try {
      const budgetItems = await storage.getBudgetItemsByEventId(req.params.eventId);
      res.json(budgetItems);
    } catch (error) {
      console.error('Get budget error:', error);
      res.status(500).json({ message: 'Failed to get budget items' });
    }
  });

  // Create budget item
  app.post('/api/events/:eventId/budget', authenticateToken, requireRole(['planner', 'admin']), async (req, res) => {
    try {
      const budgetData = insertBudgetItemSchema.parse({
        ...req.body,
        eventId: req.params.eventId
      });
      const budgetItem = await storage.createBudgetItem(budgetData);
      res.status(201).json(budgetItem);
    } catch (error) {
      console.error('Create budget item error:', error);
      res.status(400).json({ message: 'Failed to create budget item' });
    }
  });

  // ============================================================================
  // PAYMENT ROUTES (Protected)
  // ============================================================================

  // Create payment intent
  app.post('/api/create-payment-intent', authenticateToken, async (req, res) => {
    try {
      const { amount, currency = 'usd' } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Valid amount is required' });
      }

      const paymentIntent = await (PaymentService as any).createPaymentIntent(amount, currency);
      return res.json(paymentIntent);
    } catch (error) {
      console.error('Payment intent error:', error);
      return res.status(500).json({ message: 'Failed to create payment intent' });
    }
  });

  // Confirm payment
  app.post('/api/confirm-payment', authenticateToken, async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: 'Payment intent ID is required' });
      }

      const success = await (PaymentService as any).confirmPayment(paymentIntentId);
      return res.json({ success });
    } catch (error) {
      console.error('Payment confirmation error:', error);
      return res.status(500).json({ message: 'Failed to confirm payment' });
    }
  });

  // ============================================================================
  // FILE UPLOAD ROUTES (Protected)
  // ============================================================================

  // Upload file
  app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // In a real implementation, you'd upload to cloud storage
      // For now, return the local file path
      return res.json({
        message: 'File uploaded successfully',
        filePath: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error('File upload error:', error);
      return res.status(500).json({ message: 'Failed to upload file' });
    }
  });

  // ============================================================================
  // DECOR VENDOR ROUTES (Protected)
  // ============================================================================

  // Get all decor vendors
  app.get('/api/decor-vendors', authenticateToken, async (req, res) => {
    try {
      const vendors = await storage.getAllDecorVendors();
      res.json(vendors);
    } catch (error) {
      console.error('Get decor vendors error:', error);
      res.status(500).json({ message: 'Failed to get decor vendors' });
    }
  });

  // Add decor vendor (planners only)
  app.post('/api/decor-vendors', authenticateToken, requireRole(['planner', 'admin']), async (req, res) => {
    try {
      const vendorData = req.body; // Using any for now due to schema complexity
      const vendor = await storage.createDecorVendor(vendorData);
      res.status(201).json(vendor);
    } catch (error) {
      console.error('Create decor vendor error:', error);
      res.status(400).json({ message: 'Failed to create decor vendor' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}