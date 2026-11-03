import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticlesByIds, listPublished } from '@/lib/data/articles';
import { getIssue, listIssues } from '@/lib/data/content';
import { getSettings } from '@/lib/settings';
import { formatDate } from '@/lib/utils';
import { BlockHead } from '@/components/site/BlockHead';
import { Card, toCard } from '@/components/site/Card';
import { Cover } from '@/components/site/Cover';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const i = await getIssue((await params).slug);
  return i && i.published ? { title: `${i.title} — ${formatDate(i.issue_date, 'month')}`, description: i.description } : { title: 'Issue not found' };
}

export default async function IssuePage({ params }: Props) {
  const issue = await getIssue((await params).slug);
  if (!issue || !issue.published) notFound();
  const [s, cover, issues] = await Promise.all([
    getSettings(),
    issue.cover_story_id ? getArticlesByIds([issue.cover_story_id]).then((r) => r[0]) : null,
    listIssues(),
  ]);
  const stories = await listPublished({ issueId: issue.id, limit: 30, exclude: cover ? [cover.id] : [] });
  const others = issues.filter((i) => i.id !== issue.id).slice(0, 4);
  return (
    <div className="page-enter">
      <section className="band-soft">
        <div className="wrap issue-promo" style={{ padding: '64px var(--gutter)' }}>
          <Cover issue={issue} logo={s.logoText} />
          <div className="issue-promo__text">
            <span className="eyebrow" style={{ color: 'var(--accent)' }}>{formatDate(issue.issue_date, 'month')}</span>
            <h2>{issue.title}</h2>
            <p>{issue.description}</p>
            <div className="issue-promo__actions">
              {cover ? <Link href={`/story/${cover.slug}`} className="btn">Read the cover story</Link> : null}
              <Link href="/subscribe" className="btn btn--accent">{s.subscribe.cta}</Link>
            </div>
          </div>
        </div>
      </section>
      <div className="wrap">
        {cover ? (
          <section className="block">
            <BlockHead title="Cover Story" />
            <Card a={toCard(cover)} variant="row" />
          </section>
        ) : null}
        {stories.length ? (
          <section className="block">
            <BlockHead title="Also in This Issue" />
            <div className="grid grid--3">
              {stories.map((a) => (
                <Card key={a.id} a={toCard(a)} variant="medium" showDek />
              ))}
            </div>
          </section>
        ) : null}
        {others.length ? (
          <section className="block">
            <BlockHead title="More Issues" href="/magazine" more="All issues" />
            <div className="grid grid--4 grid--keep2">
              {others.map((i) => (
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
        ) : null}
      </div>
    </div>
  );
}
