import DOMPurify from 'dompurify';
import { marked } from 'marked';
import TurndownService from 'turndown';

export const safeHtml = value => {
  const html = DOMPurify.sanitize(value || '', {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'span', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'a'],
  ALLOWED_ATTR: ['style', 'href', 'target', 'rel', 'start', 'class'], FORBID_TAGS: ['img', 'iframe', 'svg'],
  });
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const styles = { color: /^(#[0-9a-f]{3,8}|rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\))$/i, 'font-family': /^(Arial|Georgia|monospace)$/i, 'font-size': /^(12|14|16|18|24|32)px$/, 'text-align': /^(left|center|right|justify)$/ };
  for (const element of doc.querySelectorAll('[style]')) {
    const safe = Object.entries(styles).map(([key, regex]) => { const style = element.style.getPropertyValue(key); return regex.test(style) ? `${key}:${style}` : ''; }).filter(Boolean).join(';');
    if (safe) element.setAttribute('style', safe); else element.removeAttribute('style');
  }
  for (const link of doc.querySelectorAll('a')) { link.setAttribute('target', '_blank'); link.setAttribute('rel', 'noopener noreferrer'); }
  return doc.body.innerHTML;
};
export const toVisual = markdown => safeHtml(marked.parse(markdown || '', { async: false }));
const converter = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
converter.addRule('strike', { filter: ['s', 'del'], replacement: content => `~~${content}~~` });
export const toMarkdown = html => converter.turndown(safeHtml(html));
export function visibleText(note) {
  if (note.format !== 'richtext') return note.content;
  const doc = new DOMParser().parseFromString(safeHtml(note.content), 'text/html');
  return doc.body.textContent || '';
}
