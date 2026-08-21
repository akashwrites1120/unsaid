/**
 * Shared text helpers used by both client UI and server validation,
 * so word counts are computed identically everywhere.
 */

/**
 * Strip HTML tags and decode the handful of entities TipTap emits, leaving
 * plain text with paragraph breaks preserved as newlines.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Count words in plain text. Whitespace-separated, ignoring empties.
 */
export function countWords(text: string): number {
  const plain = text.includes('<') ? htmlToPlainText(text) : text;
  if (!plain.trim()) return 0;
  return plain.trim().split(/\s+/).filter(Boolean).length;
}
