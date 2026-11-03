import type { Metadata } from 'next';
import Link from 'next/link';
import { countPublished, listPublished } from '@/lib/data/articles';
import { listSections } from '@/lib/data/taxonomy';
import { formatDate } from '@/lib/utils';
import { Pager } from '@/components/site/Pager';
import { clampInt, cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Archive', description: 'Every story, by month.' };
const PER = 40;

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ page?: string; section?: string }> }) {
  const sp = await searchParams;
  const page = clampInt(sp.page, 1, 1, 10_000);
  const section = sp.section || undefined;
  const [total, items, sections] = await Promise.all([
    countPublished({ section }),
    listPublished({ section, limit: PER, offset: (page - 1) * PER }),
    listSections(),
  ]);
  const groups = new Map<string, typeof items>();
  for (const a of items) {
    const k = formatDate(a.published_at, 'month');
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  return (
    <div className="page-enter">
      <header className="page-head">
        <div className="wrap">
          <h1>Archive</h1>
          <p>{total} stories, newest first.</p>
          <div className="chips">
            <Link href="/archive" className={cn('chip', !section && 'is-active')}>All</Link>
            {sections.map((s) => (
              <Link key={s.id} href={`/archive?section=${s.slug}`} className={cn('chip', section === s.slug && 'is-active')}>
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </header>
      <div className="wrap wrap--mid">
        {[...groups.entries()].map(([month, list]) => (
          <section key={month}>
            <h2 className="archive-month">{month}</h2>
            {list.map((a) => (
              <Link key={a.id} href={`/story/${a.slug}`} className="archive-row">
                <time dateTime={a.published_at ?? ''}>{formatDate(a.published_at, 'short')}</time>
                <span className="rubric">{a.section_name}</span>
                <h3>{a.title}</h3>
              </Link>
            ))}
          </section>
        ))}
        <Pager page={page} pages={Math.ceil(total / PER)} href={(p) => `/archive?page=${p}${section ? `&section=${section}` : ''}`} />
      </div>
    </div>
  );
}
