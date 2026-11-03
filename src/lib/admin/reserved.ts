import 'server-only';
import { get } from '../db';

/** Top-level paths owned by the public site or the app; sections and pages (both served at /{slug}) can't use them. */
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'media', 'story', 'tag', 'contributor', 'search', 'video', 'podcasts', 'magazine', 'newsletters', 'subscribe',
  'account', 'archive', 'contact', 'masthead', 'sitemap', 'rss.xml', 'sitemap.xml', 'robots.txt', 'favicon.ico',
]);

/** Reserved routes whose own page reads its copy from the `pages` row with the same slug (getPage('contact') …). */
export const PAGE_BACKED_ROUTES = new Set(['contact', 'masthead']);

/** Returns an error message when `slug` would clash with a route, a section or a page. */
export async function topLevelSlugClash(slug: string, kind: 'section' | 'page', ignoreId?: number): Promise<string | null> {
  if (RESERVED_SLUGS.has(slug) && !(kind === 'page' && PAGE_BACKED_ROUTES.has(slug))) return `“/${slug}” is used by the site — choose another slug.`;
  const [section, page] = await Promise.all([
    get<{ id: number }>('SELECT id FROM sections WHERE slug = ?', slug),
    get<{ id: number }>('SELECT id FROM pages WHERE slug = ?', slug),
  ]);
  if (kind === 'page' && section) return `A section already lives at “/${slug}”.`;
  if (kind === 'section' && page) return `A page already lives at “/${slug}”.`;
  if (kind === 'page' && page && page.id !== (ignoreId ?? 0)) return `Another page already uses “/${slug}”.`;
  if (kind === 'section' && section && section.id !== (ignoreId ?? 0)) return `Another section already uses “/${slug}”.`;
  return null;
}
