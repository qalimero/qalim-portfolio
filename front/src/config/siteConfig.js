// src/config/siteConfig.ts

// Configuration globale du site
const siteConfig = {
    // Mode maintenance - Mettez à false quand le site est prêt
    maintenanceMode: true,

    // Date de lancement prévue
    launchDate: new Date('2025-05-01'),

    // Informations générales du site
    siteName: 'Mon Site',
    siteDescription: 'Description de mon site',

    // URLs des réseaux sociaux
    socialLinks: [
        { platform: 'twitter', url: 'https://twitter.com/monsite' },
        { platform: 'instagram', url: 'https://instagram.com/monsite' },
        { platform: 'linkedin', url: 'https://linkedin.com/company/monsite' }
    ],

    // Contact
    contactEmail: 'contact@monsite.com'
};

export default siteConfig;