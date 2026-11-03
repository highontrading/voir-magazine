import type { Metadata } from 'next';
import Link from 'next/link';
import { listVideos, videoSeries } from '@/lib/data/content';
import { BlockHead } from '@/components/site/BlockHead';
import { Carousel } from '@/components/site/Carousel';
import { ArrowRight } from '@/components/site/Icons';
import { Media } from '@/components/site/Media';
import { VideoPlayer } from '@/components/site/VideoPlayer';
import type { Video } from '@/lib/types';

export const metadata: Metadata = { title: 'Video', description: 'Series, interviews and behind-the-scenes films from Voirtales.' };

function VideoCard({ v }: { v: Video }) {
  return (
    <Link href={`/video/${v.slug}`} className="card card--small">
      <Media src={v.thumbnail} ratio="wide" play badge={v.duration} />
      <span className="card__body">
        <span className="rubric">{v.series || v.section_name}</span>
        <span className="card__title">{v.title}</span>
      </span>
    </Link>
  );
}

export default function VideoHub() {
  const all = listVideos({ limit: 100 });
  const featured = all[0];
  const series = videoSeries();
  return (
    <div className="band-dark page-enter" style={{ marginBottom: -72, paddingBottom: 72 }}>
      <div className="wrap">
        <header className="page-head page-head--dark" style={{ marginBottom: 32 }}>
          <h1>Video</h1>
          <p>Iconic conversations, cinematic series and front-row access.</p>
        </header>
        {featured ? (
          <div className="video-feature" style={{ marginBottom: 64 }}>
            <VideoPlayer url={featured.video_url} poster={featured.thumbnail} title={featured.title} />
            <div className="video-feature__text">
              <span className="rubric">{featured.series}</span>
              <h3>{featured.title}</h3>
              <p>{featured.description}</p>
              <Link href={`/video/${featured.slug}`} className="btn btn--outline-light">
                Watch & details <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="empty"><h2 style={{ color: '#fff' }}>No videos yet</h2></div>
        )}
        {series.map((s) => {
          const vids = all.filter((v) => v.series === s);
          if (!vids.length) return null;
          return (
            <section key={s} className="block" style={{ paddingTop: 0 }}>
              <BlockHead title={s} light />
              <Carousel label={s}>
                {vids.map((v) => (
                  <VideoCard key={v.id} v={v} />
                ))}
              </Carousel>
            </section>
          );
        })}
        <section className="block" style={{ paddingTop: 0 }}>
          <BlockHead title="All Videos" light />
          <div className="grid grid--4">
            {all.map((v) => (
              <div key={v.id} data-reveal>
                <VideoCard v={v} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
