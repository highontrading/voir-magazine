import type { MetadataRoute } from 'next';
import { listPublished } from '@/lib/data/articles';
import { listIssues, listPages, listPodcasts, listVideos } from '@/lib/data/content';
import { listAuthors, listSections } from '@/lib/data/taxonomy';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.SITE_URL || 'http://localhost:3000';
  const u = (p: string, lastModified?: string | null, priority = 0.6): MetadataRoute.Sitemap[number] => ({
    url: base + p,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    priority,
  });
  return [
    u('/', null, 1),
    ...['/video', '/podcasts', '/magazine', '/newsletters', '/subscribe', '/archive', '/masthead', '/contact'].map((p) => u(p, null, 0.7)),
    ...listSections().map((s) => u(`/${s.slug}`, null, 0.9)),
    ...listPublished({ limit: 5000 }).filter((a) => a.allow_index).map((a) => u(`/story/${a.slug}`, a.updated_at, 0.8)),
    ...listVideos({ limit: 1000 }).map((v) => u(`/video/${v.slug}`, v.published_at)),
    ...listIssues().map((i) => u(`/magazine/${i.slug}`, i.issue_date)),
    ...listPodcasts().map((p) => u(`/podcasts/${p.slug}`)),
    ...listAuthors().map((a) => u(`/contributor/${a.slug}`, null, 0.4)),
    ...listPages(true).map((p) => u(`/${p.slug}`, p.updated_at, 0.3)),
  ];
}
