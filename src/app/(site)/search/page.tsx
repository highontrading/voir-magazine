import type { Metadata } from 'next';
import Link from 'next/link';
import { searchArticles } from '@/lib/data/articles';
import { popularTags } from '@/lib/data/taxonomy';
import { Card, toCard } from '@/components/site/Card';
import { SearchIcon } from '@/components/site/Icons';
import { Pager } from '@/components/site/Pager';
import { clampInt } from '@/lib/utils';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };

const PER = 12;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 100);
  const page = clampInt(sp.page, 1, 1, 10_000);
  const [{ items, total }, tags] = await Promise.all([q ? searchArticles(q, PER, (page - 1) * PER) : { items: [], total: 0 }, popularTags(16)]);
  return (
    <div className="wrap page-enter">
      <header className="page-head page-head--left" style={{ borderBottom: 0, marginBottom: 0 }}>
        <form action="/search" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2.5vw, 14px)', borderBottom: '3px solid var(--ink)' }}>
          <SearchIcon style={{ width: 'clamp(24px, 6vw, 34px)', height: 'clamp(24px, 6vw, 34px)', flex: 'none' }} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search Voirtales"
            aria-label="Search"
            style={{ flex: 1, minWidth: 0, width: '100%', border: 0, background: 'transparent', fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 64px)', padding: '10px 0', outline: 'none' }}
          />
          <button className="btn" style={{ flex: 'none' }}>Search</button>
        </form>
        {q ? (
          <p style={{ marginTop: 18, fontStyle: 'normal', fontFamily: 'var(--font-sans)', fontSize: 14 }}>
            {total} result{total === 1 ? '' : 's'} for <strong>“{q}”</strong>
          </p>
        ) : null}
      </header>
      {q && items.length === 0 ? (
        <div className="empty">
          <h2>No results</h2>
          <p>Try a different search, or explore a topic below.</p>
        </div>
      ) : null}
      {items.length ? (
        <div className="rule-list" style={{ marginTop: 24 }}>
          {items.map((a) => (
            <Card key={a.id} a={toCard(a)} variant="row" showTime />
          ))}
        </div>
      ) : null}
      <Pager page={page} pages={Math.ceil(total / PER)} href={(p) => `/search?q=${encodeURIComponent(q)}&page=${p}`} />
      {!items.length ? (
        <section className="block">
          <p className="eyebrow" style={{ marginBottom: 14 }}>Trending topics</p>
          <div className="chips">
            {tags.map((t) => (
              <Link key={t.id} href={`/tag/${t.slug}`} className="chip">
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
