import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { errorResponse } from '../utils/response.js';

export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, req, res, next) {
  logger.error(`Error processing request: ${err.message}`, err, {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return errorResponse(res, 'Validation error', 400, 'VALIDATION_ERROR', formattedErrors);
  }

  // Prisma unique constraint errors (P2002)
  if (err.code === 'P2002') {
    const fields = err.meta?.target ? err.meta.target : 'field';
    return errorResponse(res, `A record with this ${fields} already exists`, 409, 'CONFLICT');
  }

  // Prisma record not found (P2025)
  if (err.code === 'P2025') {
    return errorResponse(res, 'Requested record was not found', 404, 'NOT_FOUND');
  }

  // Custom AppError
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err.code, err.details);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid authentication token', 401, 'UNAUTHORIZED');
  }
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Authentication token has expired', 401, 'TOKEN_EXPIRED');
  }

  // Fallback 500
  const isDev = process.env.NODE_ENV === 'development';
  return errorResponse(
    res,
    isDev ? err.message : 'An unexpected internal error occurred',
    500,
    'INTERNAL_SERVER_ERROR'
  );
}
