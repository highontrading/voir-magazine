import 'server-only';
import { get } from '../db';

/** Top-level paths owned by the public site or the app; sections and pages (both served at /{slug}) can't use them. */
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'media', 'story', 'tag', 'contributor', 'search', 'video', 'podcasts', 'magazine', 'newsletters', 'subscribe',
  'account', 'archive', 'contact', 'masthead', 'sitemap', 'rss.xml', 'sitemap.xml', 'robots.txt', 'favicon.ico',
]);

/** Returns an error message when `slug` would clash with a route, a section or a page. */
export function topLevelSlugClash(slug: string, kind: 'section' | 'page', ignoreId?: number): string | null {
  if (RESERVED_SLUGS.has(slug)) return `“/${slug}” is used by the site — choose another slug.`;
  if (kind === 'page' && get('SELECT 1 FROM sections WHERE slug = ?', slug)) return `A section already lives at “/${slug}”.`;
  if (kind === 'section' && get('SELECT 1 FROM pages WHERE slug = ?', slug)) return `A page already lives at “/${slug}”.`;
  if (kind === 'page' && get('SELECT 1 FROM pages WHERE slug = ? AND id != ?', slug, ignoreId ?? 0)) return `Another page already uses “/${slug}”.`;
  if (kind === 'section' && get('SELECT 1 FROM sections WHERE slug = ? AND id != ?', slug, ignoreId ?? 0)) return `Another section already uses “/${slug}”.`;
  return null;
}
