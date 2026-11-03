import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEpisode, listEpisodes } from '@/lib/data/content';
import { formatDate } from '@/lib/utils';

type Props = { params: Promise<{ slug: string; episode: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, episode } = await params;
  const e = getEpisode(slug, episode);
  return e ? { title: `${e.title} — ${e.podcast_title}`, description: e.description } : { title: 'Episode not found' };
}

export default async function EpisodePage({ params }: Props) {
  const { slug, episode } = await params;
  const e = getEpisode(slug, episode);
  if (!e) notFound();
  const others = listEpisodes(e.podcast_id).filter((x) => x.id !== e.id).slice(0, 5);
  return (
    <div className="wrap wrap--narrow page-enter" style={{ paddingTop: 56 }}>
      <Link href={`/podcasts/${slug}`} className="rubric">{e.podcast_title}</Link>
      <h1 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)', margin: '14px 0 16px' }}>{e.title}</h1>
      <p className="byline">{formatDate(e.published_at)} · {e.duration}</p>
      <div style={{ background: 'var(--night)', padding: 28, margin: '28px 0' }}>
        {e.audio_url ? <audio controls src={e.audio_url} style={{ width: '100%' }} /> : <p style={{ color: '#fff' }}>Audio coming soon.</p>}
      </div>
      <div className="prose"><p>{e.description}</p></div>
      {others.length ? (
        <section className="block">
          <h2 className="block-head__title" style={{ borderTop: '4px solid var(--ink)', paddingTop: 14, marginBottom: 12 }}>More Episodes</h2>
          {others.map((o) => (
            <Link key={o.id} href={`/podcasts/${slug}/${o.slug}`} className="archive-row" style={{ gridTemplateColumns: '1fr 120px' }}>
              <h3>{o.title}</h3>
              <time>{o.duration}</time>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
