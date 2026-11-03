import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublished } from '@/lib/data/articles';
import { listIssues } from '@/lib/data/content';
import { getSettings } from '@/lib/settings';
import { formatDate } from '@/lib/utils';
import { BlockHead } from '@/components/site/BlockHead';
import { Card, toCard } from '@/components/site/Card';
import { Cover } from '@/components/site/Cover';

export const metadata: Metadata = { title: 'The Magazine', description: 'The current issue of Voirtales and the cover archive.' };

export default async function MagazinePage() {
  const [s, issues] = await Promise.all([getSettings(), listIssues()]);
  const current = issues[0];
  const inIssue = current ? await listPublished({ issueId: current.id, limit: 12 }) : [];
  return (
    <div className="page-enter">
      {current ? (
        <section className="band-soft">
          <div className="wrap issue-promo" style={{ padding: '72px var(--gutter)' }}>
            <Link href={`/magazine/${current.slug}`} data-reveal="left">
              <Cover issue={current} logo={s.logoText} />
            </Link>
            <div className="issue-promo__text" data-reveal="right">
              <span className="eyebrow" style={{ color: 'var(--accent)' }}>The Current Issue · {formatDate(current.issue_date, 'month')}</span>
              <h2>{current.title}</h2>
              <p>{current.description}</p>
              <div className="issue-promo__actions">
                <Link href={`/magazine/${current.slug}`} className="btn">Inside the issue</Link>
                <Link href="/subscribe" className="btn btn--accent">{s.subscribe.cta}</Link>
              </div>
              {s.subscribe.offer ? <p className="issue-promo__offer">{s.subscribe.offer}</p> : null}
            </div>
          </div>
        </section>
      ) : null}
      <div className="wrap">
        {inIssue.length ? (
          <section className="block">
            <BlockHead title="In This Issue" href={current ? `/magazine/${current.slug}` : undefined} />
            <div className="grid grid--4">
              {inIssue.map((a) => (
                <Card key={a.id} a={toCard(a)} variant="medium" showDek />
              ))}
            </div>
          </section>
        ) : null}
        <section className="block">
          <BlockHead title="Past Issues" />
          <div className="grid grid--4 grid--keep2">
            {issues.map((i) => (
              <Link key={i.id} href={`/magazine/${i.slug}`} className="card" data-reveal>
                <Cover issue={i} logo={s.logoText} />
                <span className="card__body" style={{ textAlign: 'center', alignItems: 'center' }}>
                  <span className="rubric">{formatDate(i.issue_date, 'month')}</span>
                  <span className="card__title">{i.title}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
