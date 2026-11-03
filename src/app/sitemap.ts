import type { MetadataRoute } from 'next';
import { listPublished } from '@/lib/data/articles';
import { listIssues, listPages, listPodcasts, listVideos } from '@/lib/data/content';
import { listAuthors, listSections } from '@/lib/data/taxonomy';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL || 'http://localhost:3000';
  const u = (p: string, lastModified?: string | null, priority = 0.6): MetadataRoute.Sitemap[number] => ({
    url: base + p,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    priority,
  });
  const [sections, articles, videos, issues, podcasts, authors, pages] = await Promise.all([
    listSections(),
    listPublished({ limit: 5000 }),
    listVideos({ limit: 1000 }),
    listIssues(),
    listPodcasts(),
    listAuthors(),
    listPages(true),
  ]);
  return [
    u('/', null, 1),
    ...['/video', '/podcasts', '/magazine', '/newsletters', '/subscribe', '/archive', '/masthead', '/contact'].map((p) => u(p, null, 0.7)),
    ...sections.map((s) => u(`/${s.slug}`, null, 0.9)),
    ...articles.filter((a) => a.allow_index).map((a) => u(`/story/${a.slug}`, a.updated_at, 0.8)),
    ...videos.map((v) => u(`/video/${v.slug}`, v.published_at)),
    ...issues.map((i) => u(`/magazine/${i.slug}`, i.issue_date)),
    ...podcasts.map((p) => u(`/podcasts/${p.slug}`)),
    ...authors.map((a) => u(`/contributor/${a.slug}`, null, 0.4)),
    ...pages.map((p) => u(`/${p.slug}`, p.updated_at, 0.3)),
  ];
}
