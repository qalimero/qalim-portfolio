import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { getStrapiMedia } from '../api/strapi';

// Extension de marked pour les plugins
const imageRenderer = {
    name: 'image',
    level: 'inline',
    renderer(token) {
        const { href, text, title } = token;
        const strapiImage = href.startsWith('/uploads/') ? getStrapiMedia(href) : href;
        const titleAttr = title ? ` title="${title}"` : '';
        const altText = text || '';

        return `<img src="${strapiImage}" alt="${altText}" loading="lazy" class="markdown-image"${titleAttr} />`;
    }
};

const linkRenderer = {
    name: 'link',
    level: 'inline',
    renderer(token) {
        const { href, text, title } = token;
        const titleAttr = title ? ` title="${title}"` : '';
        const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
        const externalAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';

        return `<a href="${href}"${titleAttr}${externalAttrs}>${text}</a>`;
    }
};

// Configuration de marked
marked.use({
    gfm: true,
    breaks: true,
    renderer: {
        image: imageRenderer.renderer,
        link: linkRenderer.renderer
    },
    // Support pour la coloration syntaxique
    highlight(code, language) {
        try {
            // Vous pouvez intégrer ici une bibliothèque de coloration syntaxique comme Prism.js
            return code;
        } catch (e) {
            return code;
        }
    }
});

// Options de sécurité pour DOMPurify
const purifyOptions = {
    ALLOWED_TAGS: [
        'a', 'b', 'blockquote', 'br', 'caption', 'code', 'div', 'em',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li',
        'ol', 'p', 'pre', 'span', 'strong', 'table', 'tbody', 'thead',
        'td', 'th', 'tr', 'ul'
    ],
    ALLOWED_ATTR: [
        'alt', 'class', 'href', 'id', 'loading', 'src', 'style',
        'target', 'title', 'rel', 'width', 'height'
    ],
    ALLOW_DATA_ATTR: true
};

/**
 * Parse le Markdown et le convertit en HTML sécurisé
 */
export function renderMarkdown(content: string): string {
    if (!content) return '';

    // Convertir le Markdown en HTML
    const rawHtml = marked.parse(content);

    // Nettoyer le HTML pour éviter les attaques XSS
    return DOMPurify.sanitize(rawHtml, purifyOptions);
}

/**
 * Crée un extrait à partir du contenu Markdown
 */
export function createExcerpt(markdown: string, length: number = 160): string {
    if (!markdown) return '';

    // Supprimer les balises Markdown courantes
    const text = markdown
        .replace(/#+\s+(.*)/g, '$1') // Titres
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Liens
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Gras
        .replace(/\*([^*]+)\*/g, '$1') // Italique
        .replace(/`([^`]+)`/g, '$1') // Code inline
        .replace(/```[\s\S]*?```/g, '') // Blocs de code
        .replace(/>\s*(.*)/g, '$1') // Citations
        .replace(/!\[.*?\]\(.*?\)/g, '') // Images
        .replace(/\n+/g, ' ') // Sauts de ligne
        .trim();

    // Tronquer à la longueur spécifiée
    if (text.length <= length) return text;

    // Tronquer au dernier espace pour éviter de couper un mot
    const truncated = text.substring(0, length).trim();
    const lastSpace = truncated.lastIndexOf(' ');

    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}