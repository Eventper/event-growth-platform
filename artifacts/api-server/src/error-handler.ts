import type { Express, Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler middleware
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = error;

  // Log error details
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // Don't leak sensitive information in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorResponse: any = {
    success: false,
    message: message || 'Internal server error',
    timestamp: new Date().toISOString(),
    path: req.path
  };

  if (isDevelopment) {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const setupErrorHandling = (app: Express) => {
  // 404 handler (only for API routes, let Vite handle frontend)
  app.use('/api', notFoundHandler);
  
  // NOTE: Global error handler removed - Vite must handle all non-API routes
  // Only API 404s are caught above; everything else falls through to Vite
};