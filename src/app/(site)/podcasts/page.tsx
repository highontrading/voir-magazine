import type { Metadata } from 'next';
import Link from 'next/link';
import { listEpisodes, listPodcasts } from '@/lib/data/content';
import { formatDate } from '@/lib/utils';
import { BlockHead } from '@/components/site/BlockHead';
import { HeadphonesIcon } from '@/components/site/Icons';

export const metadata: Metadata = { title: 'Podcasts', description: 'Listen to Voirtales podcasts.' };

export default function PodcastsPage() {
  const shows = listPodcasts();
  const latest = listEpisodes(undefined, true, 8);
  return (
    <div className="page-enter">
      <header className="page-head">
        <div className="wrap">
          <h1>Podcasts</h1>
          <p>Stories you can listen to — from the awards race to the royal court.</p>
        </div>
      </header>
      <div className="wrap">
        <div className="grid grid--3">
          {shows.map((p) => (
            <Link key={p.id} href={`/podcasts/${p.slug}`} className="card" data-reveal>
              <span className="pod-cover" style={{ padding: 24 }}>
                {p.cover_image ? <img src={p.cover_image} alt="" loading="lazy" /> : null}
                <span style={{ fontSize: 34 }}>{p.title}</span>
              </span>
              <span className="card__body">
                <span className="rubric">Hosted by {p.host} · {p.episode_count} episodes</span>
                <span className="card__title" style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500 }}>{p.title}</span>
                <span className="card__dek">{p.description}</span>
              </span>
            </Link>
          ))}
        </div>
        {latest.length ? (
          <section className="block">
            <BlockHead title="Latest Episodes" />
            <div className="rule-list">
              {latest.map((e) => (
                <Link key={e.id} href={`/podcasts/${e.podcast_slug}/${e.slug}`} className="archive-row" style={{ gridTemplateColumns: '48px 1fr 160px' }} data-reveal>
                  <HeadphonesIcon style={{ width: 28, height: 28, color: 'var(--accent)' }} />
                  <span>
                    <span className="rubric">{e.podcast_title}</span>
                    <h3>{e.title}</h3>
                  </span>
                  <time>{formatDate(e.published_at, 'short')} · {e.duration}</time>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
