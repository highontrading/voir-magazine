import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { countPublished, listPublished } from '@/lib/data/articles';
import { getTag, popularTags } from '@/lib/data/taxonomy';
import { Card, toCard } from '@/components/site/Card';
import { LoadMore } from '@/components/site/LoadMore';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = getTag((await params).slug);
  return t ? { title: t.name, description: t.description || `The latest stories about ${t.name}.` } : { title: 'Topic not found' };
}

export default async function TagPage({ params }: Props) {
  const tag = getTag((await params).slug);
  if (!tag) notFound();
  const total = countPublished({ tag: tag.slug });
  const items = listPublished({ tag: tag.slug, limit: 12 });
  const others = popularTags(14).filter((t) => t.id !== tag.id);
  const [lead, ...rest] = items;
  return (
    <div className="page-enter">
      <header className="page-head">
        <div className="wrap">
          <span className="eyebrow" style={{ color: 'var(--accent)' }}>Topic</span>
          <h1 style={{ fontSize: 'clamp(44px, 7vw, 100px)', marginTop: 10 }}>{tag.name}</h1>
          <p>{tag.description || `${total} ${total === 1 ? 'story' : 'stories'} from the Voirtales archive.`}</p>
        </div>
      </header>
      <div className="wrap">
        {lead ? (
          <div className="section-top" style={{ gridTemplateColumns: '1fr' }}>
            <Card a={toCard(lead)} variant="row" eager />
          </div>
        ) : (
          <div className="empty">
            <h2>No stories yet</h2>
          </div>
        )}
        <div className="grid grid--4">
          {rest.map((a) => (
            <Card key={a.id} a={toCard(a)} variant="medium" />
          ))}
        </div>
        <LoadMore query={{ tag: tag.slug }} start={12} total={total} />
        {others.length ? (
          <section className="block">
            <p className="eyebrow" style={{ marginBottom: 14 }}>Explore more topics</p>
            <div className="chips">
              {others.map((t) => (
                <Link key={t.id} href={`/tag/${t.slug}`} className="chip">
                  {t.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
