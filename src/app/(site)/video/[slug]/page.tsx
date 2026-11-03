import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVideo, listVideos } from '@/lib/data/content';
import { formatDate } from '@/lib/utils';
import { ViewTracker } from '@/components/site/ArticleTools';
import { BlockHead } from '@/components/site/BlockHead';
import { Media } from '@/components/site/Media';
import { VideoPlayer } from '@/components/site/VideoPlayer';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const v = await getVideo((await params).slug);
  return v ? { title: v.title, description: v.description, openGraph: { type: 'video.other', images: v.thumbnail ? [v.thumbnail] : undefined } } : { title: 'Video not found' };
}

export default async function VideoPage({ params }: Props) {
  const v = await getVideo((await params).slug);
  if (!v) notFound();
  const [sameSeries, latest] = await Promise.all([
    v.series ? listVideos({ series: v.series, exclude: v.id, limit: 8 }) : [],
    listVideos({ exclude: v.id, limit: 8 }),
  ]);
  const more = latest.filter((x) => !sameSeries.some((y) => y.id === x.id)).slice(0, 4);
  return (
    <div className="band-dark page-enter" style={{ marginBottom: -72, paddingBottom: 72 }}>
      <ViewTracker id={v.id} kind="video" />
      <div className="wrap" style={{ paddingTop: 40 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <VideoPlayer url={v.video_url} poster={v.thumbnail} title={v.title} />
          <div style={{ padding: '28px 0 8px', maxWidth: 820 }}>
            <Link href="/video" className="rubric">{v.series || 'Video'}</Link>
            <h1 className="display" style={{ fontSize: 'clamp(32px, 4.4vw, 58px)', margin: '12px 0 16px' }}>{v.title}</h1>
            <p style={{ fontSize: 19, lineHeight: 1.55, color: 'rgba(255,255,255,.78)' }}>{v.description}</p>
            <p className="byline" style={{ marginTop: 16, color: 'rgba(255,255,255,.6)' }}>
              {v.section_name ? <Link href={`/${v.section_slug}`} style={{ color: '#fff' }}>{v.section_name}</Link> : null} · {formatDate(v.published_at)} · {v.duration} · {v.views.toLocaleString()} views
            </p>
          </div>
        </div>
        {[['More from ' + v.series, sameSeries], ['Up Next', more]].map(([title, list]) =>
          (list as typeof more).length ? (
            <section key={title as string} className="block" style={{ paddingTop: 48 }}>
              <BlockHead title={title as string} light href="/video" more="All videos" />
              <div className="grid grid--4">
                {(list as typeof more).map((x) => (
                  <Link key={x.id} href={`/video/${x.slug}`} className="card card--small" data-reveal>
                    <Media src={x.thumbnail} ratio="wide" play badge={x.duration} />
                    <span className="card__body">
                      <span className="rubric">{x.series}</span>
                      <span className="card__title">{x.title}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null,
        )}
      </div>
    </div>
  );
}
