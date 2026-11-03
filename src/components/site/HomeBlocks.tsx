import Link from 'next/link';
import { getArticleById, getArticlesByIds, listPublished, mostPopular } from '@/lib/data/articles';
import { currentIssue, latestVideos, listPodcasts } from '@/lib/data/content';
import { getSection, getTag } from '@/lib/data/taxonomy';
import type { Article, HomeBlock, SiteSettings } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { BlockHead } from './BlockHead';
import { Card, toCard } from './Card';
import { Carousel } from './Carousel';
import { Cover } from './Cover';
import { NewsletterForm } from './Forms';
import { ArrowRight } from './Icons';
import { Media } from './Media';
import { Popular } from './Popular';

/** Tracks which stories already appeared so homepage blocks don't repeat each other. */
class Used {
  ids = new Set<number>();
  add(list: (Article | null | undefined)[]) {
    for (const a of list) if (a) this.ids.add(a.id);
    return list.filter(Boolean) as Article[];
  }
  get list() {
    return [...this.ids];
  }
}

export function HomePage({ s }: { s: SiteSettings }) {
  const used = new Used();
  return (
    <div className="page-enter">
      {s.homepage.blocks
        .filter((b) => b.enabled)
        .map((b) => (
          <HomeBlockView key={b.id} b={b} s={s} used={used} />
        ))}
    </div>
  );
}

function HomeBlockView({ b, s, used }: { b: HomeBlock; s: SiteSettings; used: Used }) {
  switch (b.type) {
    case 'hero':
      return <HeroBlock s={s} used={used} />;
    case 'latest':
      return <LatestBlock b={b} s={s} used={used} />;
    case 'section':
      return <SectionBlock b={b} used={used} />;
    case 'tag':
      return <TagBlock b={b} used={used} />;
    case 'popular':
      return <PopularBlock b={b} used={used} />;
    case 'video':
      return <VideoBlock b={b} s={s} />;
    case 'magazine':
      return <MagazineBlock b={b} s={s} />;
    case 'newsletter':
      return <NewsletterBand s={s} />;
    case 'podcasts':
      return <PodcastBlock b={b} />;
    case 'editors-picks':
      return <PicksBlock b={b} used={used} />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */

function HeroBlock({ s, used }: { s: SiteSettings; used: Used }) {
  const pinned = s.homepage.heroArticleId ? getArticlesByIds([s.homepage.heroArticleId])[0] : null;
  const lead = pinned ?? listPublished({ flag: 'featured', limit: 1 })[0] ?? listPublished({ limit: 1 })[0];
  if (!lead) return null;
  used.add([lead]);
  const side = listPublished({ limit: 2, exclude: used.list, flag: 'featured' });
  const sideFill = side.length < 2 ? listPublished({ limit: 2 - side.length, exclude: [...used.list, ...side.map((x) => x.id)] }) : [];
  const left = used.add([...side, ...sideFill]);
  const below = used.add(listPublished({ limit: 2, exclude: used.list, flag: 'editors_pick' }));
  const pinnedTop = getArticlesByIds(s.homepage.topStoryIds.filter((id) => !used.ids.has(id)));
  const top = used.add(
    pinnedTop.length >= 5 ? pinnedTop.slice(0, 6) : [...pinnedTop, ...listPublished({ flag: 'top_story', limit: 6 - pinnedTop.length, exclude: [...used.list, ...pinnedTop.map((x) => x.id)] })],
  );
  return (
    <section className="wrap">
      <div className="hero">
        <div className="hero__side">
          {left.map((a, i) => (
            <Card key={a.id} a={toCard(a)} variant="small" ratio={i === 0 ? 'tall' : 'landscape'} showDek />
          ))}
        </div>
        <div className="hero__lead">
          <Card a={toCard(lead)} variant="lead" eager reveal={false} />
          {below.length ? (
            <div className="hero__more">
              {below.map((a) => (
                <Card key={a.id} a={toCard(a)} variant="text" showDek />
              ))}
            </div>
          ) : null}
        </div>
        <aside>
          <h2 className="toplist__title">
            Top Stories <span>●</span>
          </h2>
          <ul className="toplist">
            {top.map((a, i) => (
              <li key={a.id}>
                <Card a={toCard(a)} variant={i === 0 ? 'small' : 'compact'} showByline={i === 0} />
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}

function LatestBlock({ b, s, used }: { b: HomeBlock; s: SiteSettings; used: Used }) {
  const items = used.add(listPublished({ limit: b.limit ?? 8, exclude: used.list }));
  const issue = currentIssue();
  if (!items.length) return null;
  return (
    <section className="block wrap">
      <BlockHead title={b.title || 'The Latest'} href="/archive" more="All stories" />
      <div className="river">
        <div className="river__list">
          {items.map((a) => (
            <Card key={a.id} a={toCard(a)} variant="row" showTime />
          ))}
        </div>
        <aside className="rail">
          <div className="rail__sticky">
            <Popular items={mostPopular(5, 14)} title="Most Read" rail />
            {issue ? (
              <div className="rail-box rail-box--dark" data-reveal>
                <p className="eyebrow" style={{ color: '#ff8a98', fontSize: 11, marginBottom: 12 }}>In the magazine</p>
                <Link href={`/magazine/${issue.slug}`} style={{ display: 'block', width: '62%', margin: '0 auto 20px' }}>
                  <Cover issue={issue} logo={s.logoText} />
                </Link>
                <h3>{issue.title}</h3>
                <p style={{ color: 'rgba(255,255,255,.75)' }}>{issue.cover_line}</p>
                <Link href="/subscribe" className="btn btn--accent btn--block">
                  {s.subscribe.cta}
                </Link>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}

function SectionBlock({ b, used }: { b: HomeBlock; used: Used }) {
  const section = b.ref ? getSection(b.ref) : null;
  if (!section) return null;
  const layout = b.layout || 'grid';
  const want = b.limit ?? (layout === 'mosaic' ? 5 : layout === 'list' ? 8 : 4);
  let items = listPublished({ sectionId: section.id, limit: want, exclude: used.list });
  if (!items.length) items = listPublished({ sectionId: section.id, limit: want });
  if (!items.length) return null;
  used.add(items);
  const title = b.title || section.name;
  const href = `/${section.slug}`;
  const cards = items.map(toCard);

  if (layout === 'feature') {
    const [first, ...rest] = cards;
    return (
      <section className="block wrap">
        <BlockHead title={title} href={href} more={`More ${section.name}`} />
        <div className="feature-split">
          <Card a={first!} variant="overlay" ratio="landscape" />
          <div className="feature-split__list">
            {rest.map((a) => (
              <Card key={a.id} a={a} variant="compact" />
            ))}
          </div>
        </div>
      </section>
    );
  }
  if (layout === 'mosaic') {
    const [c, l1, l2, r1, r2] = cards;
    return (
      <section className="block wrap">
        <BlockHead title={title} href={href} more={`More ${section.name}`} />
        <div className="mosaic">
          <div className="mosaic__col">{[l1, l2].map((a) => a && <Card key={a.id} a={a} variant="small" />)}</div>
          <div className="mosaic__col mosaic__center">
            <Card a={c!} variant="large" ratio="tall" />
          </div>
          <div className="mosaic__col">{[r1, r2].map((a) => a && <Card key={a.id} a={a} variant="small" />)}</div>
        </div>
      </section>
    );
  }
  if (layout === 'list') {
    return (
      <section className="block wrap">
        <BlockHead title={title} href={href} more={`More ${section.name}`} />
        <Carousel label={title}>
          {cards.map((a) => (
            <Card key={a.id} a={a} variant="medium" ratio="tall" reveal={false} />
          ))}
        </Carousel>
      </section>
    );
  }
  return (
    <section className="block wrap">
      <BlockHead title={title} href={href} more={`More ${section.name}`} />
      <div className="grid grid--4">
        {cards.map((a) => (
          <Card key={a.id} a={a} variant="medium" showDek />
        ))}
      </div>
    </section>
  );
}

function TagBlock({ b, used }: { b: HomeBlock; used: Used }) {
  const tag = b.ref ? getTag(b.ref) : null;
  if (!tag) return null;
  const items = used.add(listPublished({ tag: tag.slug, limit: b.limit ?? 4, exclude: used.list }));
  if (!items.length) return null;
  return (
    <section className="block wrap">
      <BlockHead title={b.title || tag.name} href={`/tag/${tag.slug}`} />
      <div className="grid grid--4">
        {items.map((a) => (
          <Card key={a.id} a={toCard(a)} variant="medium" />
        ))}
      </div>
    </section>
  );
}

function PopularBlock({ b, used }: { b: HomeBlock; used: Used }) {
  const items = mostPopular(b.limit ?? 5, 30);
  if (!items.length) return null;
  void used;
  return (
    <section className="block wrap">
      <BlockHead title={b.title || 'Most Popular'} />
      <Popular items={items} />
    </section>
  );
}

function PicksBlock({ b, used }: { b: HomeBlock; used: Used }) {
  let items = listPublished({ flag: 'editors_pick', limit: b.limit ?? 8, exclude: used.list });
  if (items.length < 4) items = listPublished({ flag: 'editors_pick', limit: b.limit ?? 8 });
  if (!items.length) return null;
  used.add(items);
  return (
    <section className="block wrap">
      <BlockHead title={b.title || 'Editors’ Picks'} />
      <Carousel label={b.title || 'Editors’ Picks'}>
        {items.map((a) => (
          <Card key={a.id} a={toCard(a)} variant="overlay" ratio="tall" reveal={false} showByline={false} showDek={false} />
        ))}
      </Carousel>
    </section>
  );
}

function VideoBlock({ b, s }: { b: HomeBlock; s: SiteSettings }) {
  const videos = latestVideos(5);
  if (!videos.length) return null;
  const featured = videos.find((v) => v.featured) ?? videos[0]!;
  const rest = videos.filter((v) => v.id !== featured.id).slice(0, 4);
  return (
    <section className={s.features.darkVideoBand ? 'band-dark block' : 'block'} style={{ marginBottom: 56 }}>
      <div className="wrap">
        <BlockHead title={b.title || 'Watch'} href="/video" more="All videos" light={s.features.darkVideoBand} />
        <div className="video-feature">
          <Link href={`/video/${featured.slug}`} data-reveal="zoom">
            <Media src={featured.thumbnail} ratio="wide" play badge={featured.duration} />
          </Link>
          <div className="video-feature__text" data-reveal="right">
            <span className="rubric">{featured.series || featured.section_name}</span>
            <h3>
              <Link href={`/video/${featured.slug}`}>{featured.title}</Link>
            </h3>
            <p>{featured.description}</p>
            <Link href={`/video/${featured.slug}`} className={s.features.darkVideoBand ? 'btn btn--light' : 'btn'}>
              Watch now <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
          </div>
        </div>
        <div className="grid grid--4 video-row">
          {rest.map((v) => (
            <Link key={v.id} href={`/video/${v.slug}`} className="card card--small" data-reveal>
              <Media src={v.thumbnail} ratio="wide" play badge={v.duration} />
              <span className="card__body">
                <span className="rubric">{v.series}</span>
                <span className="card__title">{v.title}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function MagazineBlock({ b, s }: { b: HomeBlock; s: SiteSettings }) {
  const issue = currentIssue();
  if (!issue) return null;
  const cover = issue.cover_story_id ? getArticleById(issue.cover_story_id) : null;
  return (
    <section className="band-soft block" style={{ marginBottom: 56 }}>
      <div className="wrap issue-promo">
        <Link href={`/magazine/${issue.slug}`} data-reveal="left">
          <Cover issue={issue} logo={s.logoText} />
        </Link>
        <div className="issue-promo__text" data-reveal="right">
          <span className="eyebrow" style={{ color: 'var(--accent)' }}>
            {b.title || 'The Magazine'} · {formatDate(issue.issue_date, 'month')}
          </span>
          <h2>{issue.title}</h2>
          <p>{issue.description}</p>
          <div className="issue-promo__actions">
            {cover && cover.status !== 'draft' ? (
              <Link href={`/story/${cover.slug}`} className="btn">
                Read the cover story
              </Link>
            ) : null}
            <Link href="/subscribe" className="btn btn--accent">
              {s.subscribe.cta}
            </Link>
            <Link href="/magazine" className="btn btn--ghost">
              Browse issues
            </Link>
          </div>
          {s.subscribe.offer ? <p className="issue-promo__offer">{s.subscribe.offer}</p> : null}
        </div>
      </div>
    </section>
  );
}

export function NewsletterBand({ s }: { s: SiteSettings }) {
  return (
    <section className="nl-band" style={{ marginBottom: 56 }}>
      <div className="wrap nl-band__inner">
        <div data-reveal="left">
          <h2>{s.newsletterPromo.headline}</h2>
          <p>{s.newsletterPromo.text}</p>
        </div>
        <div data-reveal="right">
          <NewsletterForm source="newsletter-band" />
          <p className="nl-legal">
            <Link href="/newsletters" style={{ textDecoration: 'underline' }}>
              Browse all newsletters →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function PodcastBlock({ b }: { b: HomeBlock }) {
  const shows = listPodcasts().slice(0, b.limit ?? 3);
  if (!shows.length) return null;
  return (
    <section className="block wrap">
      <BlockHead title={b.title || 'Listen'} href="/podcasts" more="All podcasts" />
      <div className="grid grid--3">
        {shows.map((p) => (
          <Link key={p.id} href={`/podcasts/${p.slug}`} className="pod-card" data-reveal>
            <span className="pod-cover">
              {p.cover_image ? <img src={p.cover_image} alt="" loading="lazy" /> : null}
              <span>{p.title}</span>
            </span>
            <span>
              <span className="rubric">{p.episode_count} episodes</span>
              <h3>{p.title}</h3>
              <p>{p.description.length > 110 ? p.description.slice(0, 110) + '…' : p.description}</p>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
