// Minimal hardening for CMS-authored HTML before rendering it.
export function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
}

/** Splits HTML after the n-th top-level paragraph (used for the paywall teaser). */
export function truncateParagraphs(html: string, n: number): { head: string; truncated: boolean } {
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const next = html.indexOf('</p>', idx);
    if (next === -1) return { head: html, truncated: false };
    idx = next + 4;
  }
  return { head: html.slice(0, idx), truncated: idx < html.trim().length };
}

/** Adds a closing end-mark to the last paragraph of a story. */
export function withEndMark(html: string): string {
  const i = html.lastIndexOf('</p>');
  if (i === -1) return html;
  return html.slice(0, i) + '<span class="end-mark"></span>' + html.slice(i);
}
