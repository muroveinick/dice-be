import { Request, Response, NextFunction } from 'express';
import { ApiError, HttpStatus, createErrorResponse } from '../utils/errorUtils.js';

/**
 * Global error handling middleware
 * Catches all errors and returns standardized responses
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Handle ApiError instances with proper status codes
  if (err instanceof ApiError) {
    console.log('Error:', JSON.stringify(err));
    return res.status(err.statusCode).json(err.toResponse());
  }

  // Handle Mongoose validation errors (convert to 400)
  if (err.name === 'ValidationError') {
    return res.status(HttpStatus.BAD_REQUEST).json(
      createErrorResponse('Validation error', 'VALIDATION_ERROR', err)
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(HttpStatus.UNAUTHORIZED).json(
      createErrorResponse('Invalid token', 'INVALID_TOKEN')
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(HttpStatus.UNAUTHORIZED).json(
      createErrorResponse('Token expired', 'TOKEN_EXPIRED')
    );
  }

  // Default to 500 internal server error
  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
    createErrorResponse('Internal server error', 'INTERNAL_ERROR')
  );
};

/**
 * Async route handler wrapper to automatically catch and forward errors
 * to the error handling middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
