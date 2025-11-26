/**
 * Health check routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/_health',
      handler: 'health.index',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/_health/ready',
      handler: 'health.ready',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/_health/live',
      handler: 'health.live',
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
};
