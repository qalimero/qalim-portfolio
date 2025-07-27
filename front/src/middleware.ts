import type { MiddlewareHandler } from 'astro';

// On lit la variable d’environnement en mode public
const maintenanceMode = import.meta.env.PUBLIC_MAINTENANCE_MODE === 'true';

export const onRequest: MiddlewareHandler = async ({ redirect, url }, next) => {
    const isMaintenancePage = url.pathname === '/maintenance';

    if (maintenanceMode && !isMaintenancePage) {
        return redirect('/maintenance');
    }

    return next();
};

