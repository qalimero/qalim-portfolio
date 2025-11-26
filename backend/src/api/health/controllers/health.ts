/**
 * Health check controller
 */
import type { Context } from 'koa';

export default {
  /**
   * General health check
   * Returns overall system health
   */
  async index(ctx: Context) {
    const startTime = Date.now();
    
    try {
      // Check database connectivity
      const dbHealth = await checkDatabase();
      
      const responseTime = Date.now() - startTime;
      
      ctx.status = dbHealth.healthy ? 200 : 503;
      ctx.body = {
        status: dbHealth.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: `${responseTime}ms`,
        environment: process.env.NODE_ENV,
        services: {
          database: dbHealth,
        },
      };
    } catch (error: any) {
      ctx.status = 503;
      ctx.body = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  /**
   * Readiness probe
   * Checks if the app is ready to serve traffic
   */
  async ready(ctx: Context) {
    try {
      // Check if database is ready
      const dbHealth = await checkDatabase();
      
      if (dbHealth.healthy) {
        ctx.status = 200;
        ctx.body = {
          status: 'ready',
          timestamp: new Date().toISOString(),
        };
      } else {
        ctx.status = 503;
        ctx.body = {
          status: 'not ready',
          reason: 'Database not available',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error: any) {
      ctx.status = 503;
      ctx.body = {
        status: 'not ready',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Liveness probe
   * Checks if the app is alive (basic check)
   */
  async live(ctx: Context) {
    ctx.status = 200;
    ctx.body = {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  },
};

/**
 * Check database health
 */
async function checkDatabase(): Promise<{ healthy: boolean; responseTime?: string; error?: string }> {
  const start = Date.now();
  
  try {
    // Try a simple query to check DB connectivity
    await strapi.db.connection.raw('SELECT 1');
    
    return {
      healthy: true,
      responseTime: `${Date.now() - start}ms`,
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message,
    };
  }
}
