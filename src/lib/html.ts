import sanitizeHtml from 'sanitize-html';

const EMBED_HOSTS = ['www.youtube-nocookie.com', 'youtube-nocookie.com', 'www.youtube.com', 'youtube.com', 'player.vimeo.com'];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol', 'li',
    'strong', 'b', 'em', 'i', 'u', 's', 'a', 'br', 'hr',
    'figure', 'figcaption', 'img', 'span', 'iframe', 'code', 'pre', 'sup', 'sub',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    iframe: ['src', 'allow', 'allowfullscreen', 'title', 'width', 'height'],
    span: ['class'],
    figure: ['class'],
    p: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'], iframe: ['https'] },
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  allowedIframeHostnames: EMBED_HOSTS,
  allowIframeRelativeUrls: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (tagName, attribs) => {
      if (attribs.target === '_blank') {
        const rel = new Set((attribs.rel ?? '').split(/\s+/).filter(Boolean));
        rel.add('noopener');
        rel.add('noreferrer');
        return { tagName, attribs: { ...attribs, rel: [...rel].join(' ') } };
      }
      return { tagName, attribs };
    },
  },
  // An embed whose src was stripped (wrong host / scheme) is dropped entirely.
  exclusiveFilter: (frame) => frame.tag === 'iframe' && !frame.attribs.src,
};

/** Allowlist sanitizer for CMS-authored HTML (run on save and again before rendering). */
export function cleanHtml(html: string): string {
  return sanitizeHtml(html ?? '', OPTIONS);
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
