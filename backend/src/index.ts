import type { Core } from '@strapi/strapi';
import { validateEnv } from './lib/env';
import { logger } from './lib/logger';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // Validate environment variables at startup
    try {
      const env = validateEnv();
      logger.info('✓ Environment variables validated successfully', {
        nodeEnv: env.NODE_ENV,
        host: env.HOST,
        port: env.PORT,
        databaseClient: env.DATABASE_CLIENT,
      });
    } catch (error) {
      logger.error('✗ Environment validation failed', { error });
      throw error;
    }

    // Register custom middlewares
    strapi.server.use(async (ctx: any, next: () => Promise<any>) => {
      const start = Date.now();
      
      await next();
      
      // Log all requests
      const duration = Date.now() - start;
      if (!ctx.path.startsWith('/_health')) { // Skip health check logs
        logger.debug('HTTP Request', {
          method: ctx.method,
          path: ctx.path,
          status: ctx.status,
          duration: `${duration}ms`,
        });
      }
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    logger.info('🚀 Strapi application is starting...');
    
    // Register health check routes in bootstrap
    strapi.server.router.get('/_health', async (ctx: any) => {
      const startTime = Date.now();
      try {
        // Check database connectivity
        await strapi.db.connection.raw('SELECT 1');
        const dbHealth = {
          healthy: true,
          responseTime: `${Date.now() - startTime}ms`,
        };
        
        const responseTime = Date.now() - startTime;
        
        ctx.status = 200;
        ctx.body = {
          status: 'healthy',
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
    });

    strapi.server.router.get('/_health/ready', async (ctx: any) => {
      try {
        await strapi.db.connection.raw('SELECT 1');
        ctx.status = 200;
        ctx.body = {
          status: 'ready',
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        ctx.status = 503;
        ctx.body = {
          status: 'not ready',
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    });

    strapi.server.router.get('/_health/live', async (ctx: any) => {
      ctx.status = 200;
      ctx.body = {
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    });
    
    // Log registered routes
    const routes = strapi.server.routes;
    logger.info(`📍 Registered ${routes.length} routes`);
    
    // Log content types
    const contentTypes = Object.keys(strapi.contentTypes);
    logger.info(`📦 Loaded ${contentTypes.length} content types`);
    
    logger.info('✓ Strapi application started successfully');
  },
};
