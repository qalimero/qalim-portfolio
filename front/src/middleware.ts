/**
 * Astro middleware with typed context and maintenance mode
 * Provides request logging, performance monitoring, and typed locals
 */
import { defineMiddleware } from 'astro:middleware';
import type { MiddlewareNext } from 'astro';
import { isDevelopment } from './lib/env';

/**
 * Type definition for context.locals
 * Add any shared data you want to pass to your pages here
 */
export interface Locals {
  /** Current request timestamp for performance monitoring */
  requestStartTime: number;
  /** User information if authenticated */
  user?: {
    id: string;
    email: string;
    role: string;
  };
  /** Request metadata */
  requestId: string;
  /** Whether maintenance mode is active */
  maintenanceMode: boolean;
}

/**
 * Declare the Locals interface for Astro
 * This makes context.locals strongly typed throughout your app
 */
declare global {
  namespace App {
    interface Locals extends Locals {}
  }
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Check maintenance mode from environment
const maintenanceMode = import.meta.env.PUBLIC_MAINTENANCE_MODE === 'true';

/**
 * Main middleware handler with typed context
 */
export const onRequest = defineMiddleware(
  async (context, next: MiddlewareNext) => {
    const { url, request, redirect } = context;
    const pathname = url.pathname;
    const method = request.method;
    const isMaintenancePage = pathname === '/maintenance';

    // Add typed data to context.locals
    context.locals.requestStartTime = Date.now();
    context.locals.requestId = generateRequestId();
    context.locals.maintenanceMode = maintenanceMode;

    // Log request in development
    if (isDevelopment()) {
      console.log(`[${context.locals.requestId}] ${method} ${pathname}`);
    }

    // Maintenance mode redirect
    if (maintenanceMode && !isMaintenancePage) {
      console.log(`[${context.locals.requestId}] Redirecting to maintenance page`);
      return redirect('/maintenance');
    }

    // Process the request
    const response = await next();

    // Calculate request duration
    const duration = Date.now() - context.locals.requestStartTime;

    // Log response in development
    if (isDevelopment()) {
      console.log(
        `[${context.locals.requestId}] ${method} ${pathname} - ${response.status} (${duration}ms)`
      );
    }

    // Add performance headers in development
    if (isDevelopment()) {
      response.headers.set('X-Response-Time', `${duration}ms`);
      response.headers.set('X-Request-ID', context.locals.requestId);
    }

    return response;
  }
);
