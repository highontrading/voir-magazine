import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { countPublished, listPublished } from '@/lib/data/articles';
import { getPage, listVideos } from '@/lib/data/content';
import { getSection, sectionTags } from '@/lib/data/taxonomy';
import { cleanHtml } from '@/lib/html';
import { BlockHead } from '@/components/site/BlockHead';
import { Card, toCard } from '@/components/site/Card';
import { LoadMore } from '@/components/site/LoadMore';
import { Media } from '@/components/site/Media';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [section, page] = await Promise.all([getSection(slug), getPage(slug)]);
  if (section) return { title: section.seo_title || section.name, description: section.seo_description || section.description, alternates: { canonical: `/${slug}` } };
  if (page) return { title: page.title, description: page.seo_description || page.intro };
  return { title: 'Not found' };
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params;
  const [section, page] = await Promise.all([getSection(slug), getPage(slug)]);
  if (section)
    return (
      <SectionView
        id={section.id}
        slug={section.slug}
        name={section.name}
        description={section.description}
        heroImage={section.hero_image}
        color={section.color}
      />
    );
  if (!page) notFound();
  return (
    <div className="page-enter">
      <header className="page-head">
        <div className="wrap">
          <span className="kicker-rule" />
          <h1 style={{ fontSize: 'clamp(44px, 7vw, 96px)' }}>{page.title}</h1>
          {page.intro ? <p>{page.intro}</p> : null}
        </div>
      </header>
      <div className="wrap wrap--narrow">
        <div className="prose" dangerouslySetInnerHTML={{ __html: cleanHtml(page.body) }} />
      </div>
    </div>
  );
}

/** Only accept plain hex colours so a stored value can never break out of the style attribute. */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

async function SectionView({
  id,
  slug,
  name,
  description,
  heroImage,
  color,
}: {
  id: number;
  slug: string;
  name: string;
  description: string;
  heroImage?: string | null;
  color?: string | null;
}) {
  const accent = color && HEX.test(color.trim()) ? color.trim() : null;
  const [total, items, tags, videos] = await Promise.all([
    countPublished({ sectionId: id }),
    listPublished({ sectionId: id, limit: 15 }),
    sectionTags(id),
    listVideos({ section: slug, limit: 4 }),
  ]);
  const [lead, s1, s2, ...rest] = items;
  return (
    <div className="page-enter" style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}>
      {heroImage ? (
        <figure className="section-hero media" style={{ margin: 0, height: 'clamp(220px, 32vw, 460px)' }}>
          <img src={heroImage} alt="" loading="eager" decoding="async" fetchPriority="high" />
        </figure>
      ) : null}
      <header className="page-head" style={accent ? { borderBottom: '3px solid var(--accent)' } : undefined}>
        <div className="wrap">
          {accent ? <span className="kicker-rule" /> : null}
          <h1>{name}</h1>
          {description ? <p>{description}</p> : null}
          {tags.length ? (
            <div className="chips">
              {tags.map((t) => (
                <Link key={t.id} href={`/tag/${t.slug}`} className="chip">
                  {t.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </header>
      <div className="wrap">
        {!lead ? (
          <div className="empty">
            <h2>Stories are on their way.</h2>
            <p>Nothing has been published in {name} yet.</p>
          </div>
        ) : (
          <>
            <div className="section-top">
              <Card a={toCard(lead)} variant="large" eager reveal={false} />
              <div className="section-top__side">
                {[s1, s2].map((a) => (a ? <Card key={a.id} a={toCard(a)} variant="small" showDek /> : null))}
              </div>
            </div>
            {rest.length ? (
              <section className="block" style={{ paddingTop: 0 }}>
                <BlockHead title={`Latest in ${name}`} />
                <div className="grid grid--4">
                  {rest.slice(0, 4).map((a) => (
                    <Card key={a.id} a={toCard(a)} variant="medium" showDek />
                  ))}
                </div>
              </section>
            ) : null}
            {videos.length ? (
              <section className="band-dark block" style={{ margin: '0 calc(var(--gutter) * -1) 56px', padding: '56px var(--gutter)' }}>
                <BlockHead title={`${name} Video`} href="/video" more="All videos" light />
                <div className="grid grid--4">
                  {videos.map((v) => (
                    <Link key={v.id} href={`/video/${v.slug}`} className="card card--small" data-reveal>
                      <Media src={v.thumbnail} ratio="wide" play badge={v.duration} />
                      <span className="card__body">
                        <span className="rubric">{v.series}</span>
                        <span className="card__title">{v.title}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
            {rest.length > 4 ? (
              <section className="block" style={{ paddingTop: 0 }}>
                <BlockHead title="More Stories" />
                <div className="grid grid--4">
                  {rest.slice(4).map((a) => (
                    <Card key={a.id} a={toCard(a)} variant="medium" />
                  ))}
                </div>
                <LoadMore query={{ section: slug }} start={15} total={total} />
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
