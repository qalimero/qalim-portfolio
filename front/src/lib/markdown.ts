// src/lib/markdown.ts
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Options pour marked
const markedOptions: marked.MarkedOptions = {
    gfm: true, // GitHub Flavored Markdown
    breaks: true, // Renvoie à la ligne quand il y a un retour à la ligne dans le texte
    mangle: false, // Ne pas masquer les emails
    headerIds: true, // Génère des IDs pour les titres
    headerPrefix: 'heading-', // Préfixe pour les IDs des titres
    langPrefix: 'language-', // Préfixe pour les classes de code
    pedantic: false, // Ne pas suivre les spécifications pedantically
    smartLists: true, // Utilise une numérotation plus "intelligente" pour les listes
    smartypants: true, // Utilise des guillemets "intelligents"
    xhtml: false // Ne pas auto-fermer les balises vides
};

// Configurer marked
marked.setOptions(markedOptions);

// Configurer DOMPurify
const purifyOptions = {
    ALLOWED_TAGS: [
        'a', 'b', 'blockquote', 'br', 'caption', 'code', 'div', 'em',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'nl',
        'ol', 'p', 'pre', 'span', 'strike', 'strong', 'table', 'tbody',
        'td', 'th', 'thead', 'tr', 'u', 'ul'
    ],
    ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
        'style', 'width', 'height', 'data-*'
    ]
};

/**
 * Convertit le Markdown en HTML avec sanitization
 * @param markdown Texte au format Markdown
 * @returns HTML sanitisé
 */
export function renderMarkdown(markdown: string): string {
    if (!markdown) return '';

    // Convertir le Markdown en HTML
    const rawHtml = marked.parse(markdown);

    // Sanitiser le HTML pour prévenir les attaques XSS
    return DOMPurify.sanitize(rawHtml, purifyOptions);
}

/**
 * Crée un extrait à partir du contenu Markdown
 * @param markdown Texte au format Markdown
 * @param length Longueur maximale de l'extrait
 * @returns Texte brut sans formatage
 */
export function createExcerpt(markdown: string, length: number = 150): string {
    if (!markdown) return '';

    // Supprime les balises markdown et HTML
    const text = markdown
        .replace(/#+\s+(.*)/g, '$1') // Titres
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Liens
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Gras
        .replace(/\*([^*]+)\*/g, '$1') // Italique
        .replace(/`([^`]+)`/g, '$1') // Code inline
        .replace(/```[\s\S]*?```/g, '') // Blocs de code
        .replace(/^\s*>\s*(.*)/gm, '$1') // Citations
        .replace(/!\[.*?\]\(.*?\)/g, '') // Images
        .trim();

    // Crée un extrait et ajoute "..." si nécessaire
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + '...';
}