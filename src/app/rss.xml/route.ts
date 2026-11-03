import { listPublished } from '@/lib/data/articles';
import { getSettings } from '@/lib/settings';
import { excerpt } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET(req: Request) {
  const s = getSettings();
  const origin = process.env.SITE_URL || new URL(req.url).origin;
  const section = new URL(req.url).searchParams.get('section') || undefined;
  const items = listPublished({ section, limit: 40 });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${esc(s.siteName)}${section ? ` — ${esc(section)}` : ''}</title>
<link>${origin}</link>
<description>${esc(s.seo.defaultDescription || s.description)}</description>
<language>en-us</language>
<atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml"/>
${items
  .map(
    (a) => `<item>
<title>${esc(a.title)}</title>
<link>${origin}/story/${a.slug}</link>
<guid isPermaLink="true">${origin}/story/${a.slug}</guid>
<pubDate>${new Date(a.published_at!).toUTCString()}</pubDate>
<dc:creator>${esc(a.authors.map((x) => x.name).join(', '))}</dc:creator>
${a.section_name ? `<category>${esc(a.section_name)}</category>` : ''}
<description>${esc(a.dek || excerpt(a.body, 40))}</description>
${a.hero_image ? `<media:content url="${esc(a.hero_image.startsWith('http') ? a.hero_image : origin + a.hero_image)}" medium="image"/>` : ''}
</item>`,
  )
  .join('\n')}
</channel>
</rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
