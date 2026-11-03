import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublished } from '@/lib/data/articles';
import { listIssues, listPages, listPodcasts } from '@/lib/data/content';
import { listAuthors, listSections, popularTags } from '@/lib/data/taxonomy';

export const metadata: Metadata = { title: 'Sitemap' };

export default async function SitemapPage() {
  const [sections, recent, issues, podcasts, authors, tags, pages] = await Promise.all([
    listSections(),
    listPublished({ limit: 15 }),
    listIssues(),
    listPodcasts(),
    listAuthors(),
    popularTags(30),
    listPages(true),
  ]);
  const groups: [string, [string, string][]][] = [
    ['Sections', sections.map((s) => [s.name, `/${s.slug}`])],
    ['Explore', [['Video', '/video'], ['Podcasts', '/podcasts'], ['The Magazine', '/magazine'], ['Newsletters', '/newsletters'], ['Archive', '/archive'], ['Subscribe', '/subscribe'], ['Search', '/search']]],
    ['Recent Stories', recent.map((a) => [a.title, `/story/${a.slug}`])],
    ['Magazine Issues', issues.map((i) => [i.title, `/magazine/${i.slug}`])],
    ['Podcasts', podcasts.map((p) => [p.title, `/podcasts/${p.slug}`])],
    ['Contributors', authors.map((a) => [a.name, `/contributor/${a.slug}`])],
    ['Topics', tags.map((t) => [t.name, `/tag/${t.slug}`])],
    ['About', [...pages.map((p) => [p.title, `/${p.slug}`] as [string, string])]],
  ];
  return (
    <div className="page-enter">
      <header className="page-head">
        <div className="wrap">
          <h1>Sitemap</h1>
        </div>
      </header>
      <div className="wrap sitemap-cols">
        {groups.map(([title, links]) => (
          <section key={title}>
            <h2>{title}</h2>
            <ul>
              {links.map(([l, h]) => (
                <li key={h}>
                  <Link href={h}>{l}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
