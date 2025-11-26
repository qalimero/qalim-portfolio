/**
 * Rich text utilities for converting Strapi rich text blocks to HTML
 */

interface RichTextBlock {
  type: string;
  children?: RichTextBlock[];
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  url?: string;
}

/**
 * Converts Strapi rich text blocks to HTML
 * @param blocks - Array of Strapi rich text blocks
 * @returns HTML string
 */
export function richTextToHtml(blocks: RichTextBlock[]): string {
  if (!blocks || blocks.length === 0) {
    return '';
  }

  return blocks.map(block => blockToHtml(block)).join('');
}

/**
 * Converts a single block to HTML
 */
function blockToHtml(block: RichTextBlock): string {
  const { type, children, text } = block;

  switch (type) {
    case 'paragraph':
      return `<p>${children ? children.map(child => blockToHtml(child)).join('') : ''}</p>`;

    case 'heading':
      // Strapi uses level attribute, default to h2
      return `<h2>${children ? children.map(child => blockToHtml(child)).join('') : ''}</h2>`;

    case 'list':
      // Determine if ordered or unordered (Strapi uses format attribute)
      const tag = (block as any).format === 'ordered' ? 'ol' : 'ul';
      return `<${tag}>${children ? children.map(child => blockToHtml(child)).join('') : ''}</${tag}>`;

    case 'list-item':
      return `<li>${children ? children.map(child => blockToHtml(child)).join('') : ''}</li>`;

    case 'link':
      return `<a href="${block.url || '#'}" target="_blank" rel="noopener noreferrer">${children ? children.map(child => blockToHtml(child)).join('') : ''}</a>`;

    case 'text':
      let html = text || '';

      // Apply text formatting
      if (block.bold) {
        html = `<strong>${html}</strong>`;
      }
      if (block.italic) {
        html = `<em>${html}</em>`;
      }
      if (block.underline) {
        html = `<u>${html}</u>`;
      }

      return html;

    case 'quote':
      return `<blockquote>${children ? children.map(child => blockToHtml(child)).join('') : ''}</blockquote>`;

    case 'code':
      return `<code>${children ? children.map(child => blockToHtml(child)).join('') : text || ''}</code>`;

    default:
      // For unknown types, try to render children
      if (children) {
        return children.map(child => blockToHtml(child)).join('');
      }
      return text || '';
  }
}

/**
 * Strips HTML tags from rich text (for plain text extraction)
 */
export function richTextToPlainText(blocks: RichTextBlock[]): string {
  const html = richTextToHtml(blocks);
  return html.replace(/<[^>]*>/g, '');
}
