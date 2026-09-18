import sanitizeHtml from 'sanitize-html';

export function cleanRichText(content) {
  return sanitizeHtml(content, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'span', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'a'],
    allowedAttributes: { '*': ['style'], a: ['href', 'target', 'rel'], ol: ['start'], code: ['class'] },
    allowedSchemes: ['http', 'https', 'mailto'], allowProtocolRelative: false,
    allowedStyles: { '*': { color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/], 'font-family': [/^(Arial|Georgia|monospace)$/i], 'font-size': [/^(12|14|16|18|24|32)px$/], 'text-align': [/^(left|center|right|justify)$/] } },
    transformTags: { a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }) }
  });
}
export function prepareContent(note) {
  const content = note.format === 'richtext' ? cleanRichText(note.content) : note.content;
  const plainText = note.format === 'richtext' ? sanitizeHtml(content.replace(/<\/(p|li|h[1-3]|blockquote|pre)>|<br\s*\/?\s*>/gi, '\n'), { allowedTags: [], allowedAttributes: {} }).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ') : content;
  return { ...note, content, plainText };
}
