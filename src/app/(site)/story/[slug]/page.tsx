import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentReader, currentUser } from '@/lib/auth';
import { getArticleBySlugAny, getPublishedBySlug, listPublished, mostPopular, relatedArticles } from '@/lib/data/articles';
import { isSaved } from '@/lib/data/site';
import { getSettings } from '@/lib/settings';
import { cleanHtml, truncateParagraphs, withEndMark } from '@/lib/html';
import type { Article } from '@/lib/types';
import { excerpt, formatDate } from '@/lib/utils';
import { ShareBar, ViewTracker } from '@/components/site/ArticleTools';
import { BlockHead } from '@/components/site/BlockHead';
import { Card, toCard } from '@/components/site/Card';
import { NewsletterBand } from '@/components/site/HomeBlocks';
import { Avatar, Media } from '@/components/site/Media';
import { Popular } from '@/components/site/Popular';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

async function load(slug: string, preview?: string): Promise<{ a: Article | null; isPreview: boolean }> {
  const pub = getPublishedBySlug(slug);
  if (pub) return { a: pub, isPreview: false };
  if (preview && (await currentUser())) return { a: getArticleBySlugAny(slug), isPreview: true };
  return { a: null, isPreview: false };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { a } = await load(slug, (await searchParams).preview);
  if (!a) return { title: 'Story not found' };
  const description = a.seo_description || a.dek || excerpt(a.body, 30);
  return {
    title: a.seo_title || a.title,
    description,
    alternates: { canonical: `/story/${a.slug}` },
    robots: a.allow_index ? undefined : { index: false },
    openGraph: {
      type: 'article',
      title: a.title,
      description,
      images: a.hero_image ? [a.hero_image] : undefined,
      publishedTime: a.published_at ?? undefined,
      authors: a.authors.map((x) => x.name),
      section: a.section_name ?? undefined,
      tags: a.tags?.map((t) => t.name),
    },
  };
}

function Byline({ a }: { a: Article }) {
  if (!a.authors.length) return null;
  return (
    <span className="byline">
      By{' '}
      {a.authors.map((au, i) => (
        <span key={au.id}>
          {i > 0 ? (i === a.authors.length - 1 ? ' and ' : ', ') : ''}
          <Link href={`/contributor/${au.slug}`}>{au.name}</Link>
        </span>
      ))}
    </span>
  );
}

export default async function StoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { a, isPreview } = await load(slug, (await searchParams).preview);
  if (!a) notFound();
  const s = getSettings();
  const reader = s.features.readerAccounts ? await currentReader() : null;
  const saved = reader ? isSaved(reader.id, a.id) : false;
  const related = relatedArticles(a, 4);
  const more = a.section_id ? listPublished({ sectionId: a.section_id, limit: 4, exclude: [a.id, ...related.map((r) => r.id)] }) : [];
  const popular = mostPopular(5, 30, [a.id]);

  const body = cleanHtml(a.body);
  const gated = s.features.paywallTeaser && !reader && a.type === 'feature';
  const { head, truncated } = gated ? truncateParagraphs(body, 4) : { head: body, truncated: false };
  const html = truncated ? head : withEndMark(head);

  const headText = (
    <>
      {a.rubric || a.section_name ? (
        <Link href={a.section_slug ? `/${a.section_slug}` : '#'} className="rubric">
          {a.rubric || a.section_name}
        </Link>
      ) : null}
      <h1 className="article-title">{a.title}</h1>
      {a.dek ? <p className="article-dek">{a.dek}</p> : null}
      <div className="article-meta">
        <Byline a={a} />
        {a.published_at ? <time dateTime={a.published_at}>{formatDate(a.published_at)}</time> : null}
        <span className="byline">{a.reading_time} min read</span>
      </div>
      <ShareBar title={a.title} path={`/story/${a.slug}`} articleId={a.id} saved={saved} accounts={s.features.readerAccounts} />
    </>
  );

  const caption =
    a.hero_caption || a.hero_credit ? (
      <figcaption>
        {a.hero_caption} {a.hero_credit ? <span>{a.hero_credit}</span> : null}
      </figcaption>
    ) : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: a.title,
    description: a.dek,
    image: a.hero_image ? [a.hero_image] : undefined,
    datePublished: a.published_at,
    dateModified: a.updated_at,
    author: a.authors.map((x) => ({ '@type': 'Person', name: x.name, url: `/contributor/${x.slug}` })),
    publisher: { '@type': 'Organization', name: s.siteName },
    articleSection: a.section_name,
  };

  return (
    <article className="page-enter">
      {isPreview ? (
        <div className="announce" style={{ background: '#b45309' }}>
          Preview — this story is <strong>{a.status}</strong> and not visible to readers.{' '}
          <a href={`/admin/articles/${a.id}`}>Back to editor</a>
        </div>
      ) : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      {!isPreview ? <ViewTracker id={a.id} /> : null}

      {a.hero_layout === 'full' && a.hero_image ? (
        <figure className="article-hero article-hero--full" style={{ margin: 0 }}>
          <div className="hero-overlay">
            <Media src={a.hero_image} ratio="none" eager />
            <div className="hero-overlay__text">
              <div className="wrap" style={{ maxWidth: 1060 }}>
                {headText}
              </div>
            </div>
          </div>
          {caption}
        </figure>
      ) : a.hero_layout === 'split' && a.hero_image ? (
        <figure style={{ margin: 0 }}>
          <div className="hero-split">
            <div className="hero-split__text">{headText}</div>
            <Media src={a.hero_image} ratio="none" eager />
          </div>
          {caption}
        </figure>
      ) : (
        <>
          <header className="article-head wrap">{headText}</header>
          {a.hero_image ? (
            <figure className="article-hero">
              <Media src={a.hero_image} ratio="landscape" eager />
              {caption}
            </figure>
          ) : null}
        </>
      )}

      <div className="article-layout">
        <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
        <aside className="article-aside">
          <div className="article-aside__sticky">
            <Popular items={popular} title="Most Popular" rail />
          </div>
        </aside>
      </div>

      {truncated ? (
        <div className="article-foot">
          <div className="paywall">
            <div className="paywall__box">
              <span className="rubric">Subscriber exclusive</span>
              <h3>Keep reading with {s.siteName}.</h3>
              <p>{s.subscribe.text}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/subscribe" className="btn btn--accent">{s.subscribe.cta}</Link>
                <Link href={`/account/sign-in?next=/story/${a.slug}`} className="btn btn--ghost">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="article-foot">
        {a.tags && a.tags.length ? (
          <div className="tag-row">
            <span className="eyebrow">Topics</span>
            {a.tags.map((t) => (
              <Link key={t.id} href={`/tag/${t.slug}`} className="chip">
                {t.name}
              </Link>
            ))}
          </div>
        ) : null}
        {a.authors.map((au) => (
          <div key={au.id} className="author-card">
            <Avatar name={au.name} src={au.photo} size={72} />
            <div>
              <span className="eyebrow">{au.title}</span>
              <h4>
                <Link href={`/contributor/${au.slug}`}>{au.name}</Link>
              </h4>
              <p>{au.bio}</p>
            </div>
          </div>
        ))}
      </div>

      {more.length ? (
        <section className="block wrap">
          <BlockHead title={`More from ${a.section_name}`} href={`/${a.section_slug}`} />
          <div className="grid grid--4">
            {more.map((r) => (
              <Card key={r.id} a={toCard(r)} variant="medium" />
            ))}
          </div>
        </section>
      ) : null}

      <NewsletterBand s={s} />

      {related.length ? (
        <section className="block wrap">
          <BlockHead title={`More Great Stories From ${s.siteName}`} />
          <div className="grid grid--4">
            {related.map((r) => (
              <Card key={r.id} a={toCard(r)} variant="medium" showDek />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
