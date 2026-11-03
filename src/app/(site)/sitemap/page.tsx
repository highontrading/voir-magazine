import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublished } from '@/lib/data/articles';
import { listIssues, listPages, listPodcasts } from '@/lib/data/content';
import { listAuthors, listSections, popularTags } from '@/lib/data/taxonomy';

export const metadata: Metadata = { title: 'Sitemap' };

export default function SitemapPage() {
  const groups: [string, [string, string][]][] = [
    ['Sections', listSections().map((s) => [s.name, `/${s.slug}`])],
    ['Explore', [['Video', '/video'], ['Podcasts', '/podcasts'], ['The Magazine', '/magazine'], ['Newsletters', '/newsletters'], ['Archive', '/archive'], ['Subscribe', '/subscribe'], ['Search', '/search']]],
    ['Recent Stories', listPublished({ limit: 15 }).map((a) => [a.title, `/story/${a.slug}`])],
    ['Magazine Issues', listIssues().map((i) => [i.title, `/magazine/${i.slug}`])],
    ['Podcasts', listPodcasts().map((p) => [p.title, `/podcasts/${p.slug}`])],
    ['Contributors', listAuthors().map((a) => [a.name, `/contributor/${a.slug}`])],
    ['Topics', popularTags(30).map((t) => [t.name, `/tag/${t.slug}`])],
    ['About', [...listPages(true).map((p) => [p.title, `/${p.slug}`] as [string, string])]],
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
