/**
 * Type declarations for koa-ratelimit
 */
declare module 'koa-ratelimit' {
  import { Middleware, Context } from 'koa';

  interface RateLimitOptions {
    driver?: 'memory' | 'redis';
    db?: Map<any, any> | any;
    duration?: number;
    errorMessage?: string;
    id?: (ctx: Context) => string;
    headers?: {
      remaining?: string;
      reset?: string;
      total?: string;
    };
    max?: number;
    disableHeader?: boolean;
    whitelist?: (ctx: Context) => boolean;
    blacklist?: (ctx: Context) => boolean;
  }

  function rateLimit(options: RateLimitOptions): Middleware;
  
  export = rateLimit;
}
