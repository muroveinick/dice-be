/**
 * Error utility functions for standardized API error responses
 */

import { ErrorResponse } from "@shared/interfaces.js";

// HTTP Status codes with common descriptions
export enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  PAYMENT_REQUIRED = 402,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  SERVICE_UNAVAILABLE = 503,
}

// Standard error response type

/**
 * Create a standard error response object
 */
export const createErrorResponse = (message: string, code?: string, details?: any): ErrorResponse => {
  return {
    status: "error",
    message,
    ...(code && { code }),
    ...(details && { details }),
  };
};

/**
 * HTTP error class for API responses
 */
export class ApiError extends Error {
  statusCode: HttpStatus;
  code?: string;
  details?: any;

  constructor(statusCode: HttpStatus, message: string, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, code?: string, details?: any) {
    return new ApiError(HttpStatus.BAD_REQUEST, message, code, details);
  }

  static unauthorized(message: string, code?: string, details?: any) {
    return new ApiError(HttpStatus.UNAUTHORIZED, message, code, details);
  }

  static forbidden(message: string, code?: string, details?: any) {
    return new ApiError(HttpStatus.FORBIDDEN, message, code, details);
  }

  static notFound(message: string, code?: string, details?: any) {
    return new ApiError(HttpStatus.NOT_FOUND, message, code, details);
  }

  static conflict(message: string, code?: string, details?: any) {
    return new ApiError(HttpStatus.CONFLICT, message, code, details);
  }

  static internal(message: string, code?: string, details?: any) {
    return new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, message || "Internal server error", code, details);
  }

  /**
   * Convert the error to a response object
   */
  toResponse(): ErrorResponse {
    console.log(this.message, this.code, this.details, this.statusCode);
    const r = createErrorResponse(this.message, this.code, this.details);
    return r;
  }
}
