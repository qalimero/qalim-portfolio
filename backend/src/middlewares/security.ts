/**
 * Security middleware for Strapi
 * Implements rate limiting, CORS, and other security best practices
 */
import type { Context, Next } from 'koa';
import rateLimit from 'koa-ratelimit';
import { env } from '../lib/env';
import { logger, loggers } from '../lib/logger';

/**
 * Rate limiting store (in-memory)
 * For production, consider using Redis
 */
const rateLimitStore = new Map();

/**
 * Rate limiting middleware
 * Prevents brute force and DDoS attacks
 */
export const rateLimiter = rateLimit({
  driver: 'memory',
  db: rateLimitStore,
  duration: env.RATE_LIMIT_DURATION, // milliseconds
  errorMessage: 'Too many requests, please try again later.',
  id: (ctx: Context) => ctx.ip,
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total',
  },
  max: env.RATE_LIMIT_MAX,
  disableHeader: false,
  whitelist: (ctx: Context) => {
    // Whitelist local development
    return ctx.ip === '127.0.0.1' || ctx.ip === '::1';
  },
  blacklist: () => {
    // Add IP blacklist logic here if needed
    return false;
  },
});

/**
 * Security headers middleware
 * Adds essential security headers
 */
export const securityHeaders = async (ctx: Context, next: Next) => {
  // Add security headers
  ctx.set('X-Content-Type-Options', 'nosniff');
  ctx.set('X-Frame-Options', 'DENY');
  ctx.set('X-XSS-Protection', '1; mode=block');
  ctx.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove Strapi header for security by obscurity
  ctx.remove('X-Powered-By');
  
  await next();
};

/**
 * Request validation middleware
 * Validates common request properties
 */
export const validateRequest = async (ctx: Context, next: Next) => {
  // Validate content-type for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(ctx.method)) {
    const contentType = ctx.get('content-type');
    
    if (!contentType) {
      loggers.security('Missing Content-Type header', {
        method: ctx.method,
        path: ctx.path,
        ip: ctx.ip,
      });
    }
  }

  // Validate request size (prevent huge payloads)
  const contentLength = ctx.get('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    loggers.security('Request too large', {
      size: contentLength,
      path: ctx.path,
      ip: ctx.ip,
    });
    ctx.throw(413, 'Request entity too large');
  }

  await next();
};

/**
 * API key validation middleware (optional)
 * Uncomment and customize if you need API key authentication
 */
export const validateApiKey = async (ctx: Context, next: Next) => {
  // Skip for admin panel and certain routes
  if (ctx.path.startsWith('/admin') || ctx.path.startsWith('/_health')) {
    return next();
  }

  const apiKey = ctx.get('x-api-key');
  
  // In development, allow requests without API key
  if (env.NODE_ENV === 'development' && !apiKey) {
    return next();
  }

  // Add your API key validation logic here
  // For now, just log the attempt
  if (!apiKey) {
    loggers.security('Missing API key', {
      path: ctx.path,
      ip: ctx.ip,
    });
  }

  await next();
};

/**
 * Error handling middleware
 * Catches and logs errors properly
 */
export const errorHandler = async (ctx: Context, next: Next) => {
  try {
    await next();
  } catch (error: any) {
    const status = error.status || error.statusCode || 500;
    const message = error.message || 'Internal server error';

    // Log error
    logger.error('Request Error', {
      status,
      message,
      path: ctx.path,
      method: ctx.method,
      ip: ctx.ip,
      stack: error.stack,
    });

    // Don't expose internal errors in production
    ctx.status = status;
    ctx.body = {
      error: {
        status,
        message: status === 500 && env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : message,
      },
    };
  }
};
