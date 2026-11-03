import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPodcast, listEpisodes } from '@/lib/data/content';
import { formatDate } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getPodcast((await params).slug);
  return p && p.active ? { title: p.title, description: p.description } : { title: 'Podcast not found' };
}

export default async function ShowPage({ params }: Props) {
  const p = getPodcast((await params).slug);
  if (!p || !p.active) notFound();
  const eps = listEpisodes(p.id);
  return (
    <div className="page-enter">
      <section className="band-dark">
        <div className="wrap issue-promo" style={{ padding: '64px var(--gutter)' }}>
          <span className="pod-cover" style={{ padding: 28, width: '100%' }}>
            {p.cover_image ? <img src={p.cover_image} alt="" /> : null}
            <span style={{ fontSize: 40 }}>{p.title}</span>
          </span>
          <div className="issue-promo__text">
            <span className="rubric">Podcast · Hosted by {p.host}</span>
            <h2 style={{ color: '#fff' }}>{p.title}</h2>
            <p style={{ color: 'rgba(255,255,255,.78)' }}>{p.description}</p>
            <div className="issue-promo__actions">
              {p.apple_url ? <a className="btn btn--light" href={p.apple_url} target="_blank" rel="noopener noreferrer">Apple Podcasts</a> : null}
              {p.spotify_url ? <a className="btn btn--outline-light" href={p.spotify_url} target="_blank" rel="noopener noreferrer">Spotify</a> : null}
            </div>
          </div>
        </div>
      </section>
      <div className="wrap wrap--mid" style={{ paddingTop: 48 }}>
        <h2 className="block-head__title" style={{ borderTop: '4px solid var(--ink)', paddingTop: 14, marginBottom: 12 }}>All Episodes</h2>
        {eps.map((e, i) => (
          <article key={e.id} style={{ padding: '28px 0', borderBottom: '1px solid var(--line)' }} data-reveal>
            <p className="byline">Episode {eps.length - i} · {formatDate(e.published_at)} · {e.duration}</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 30, margin: '8px 0 10px', lineHeight: 1.1 }}>
              <Link href={`/podcasts/${p.slug}/${e.slug}`}>{e.title}</Link>
            </h3>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: '#444', marginBottom: 16 }}>{e.description}</p>
            {e.audio_url ? <audio controls preload="none" src={e.audio_url} style={{ width: '100%' }} /> : null}
          </article>
        ))}
        {!eps.length ? <div className="empty"><h2>Episodes coming soon</h2></div> : null}
      </div>
    </div>
  );
}
