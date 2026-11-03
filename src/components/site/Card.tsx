import Link from 'next/link';
import { cn, joinNames, timeAgo } from '@/lib/utils';
import { Media, type Ratio } from './Media';

/** The subset of an article that cards need (also returned by /api/articles). */
export interface CardData {
  id: number;
  slug: string;
  title: string;
  dek: string;
  rubric: string;
  hero_image: string;
  published_at: string | null;
  section_name: string | null;
  section_slug: string | null;
  type?: string;
  authors: { name: string; slug: string }[];
}

export type CardVariant = 'lead' | 'large' | 'medium' | 'small' | 'row' | 'compact' | 'text' | 'overlay';

export function Card({
  a,
  variant = 'medium',
  ratio,
  showDek,
  showByline = true,
  showRubric = true,
  showTime,
  eager,
  reveal = true,
  delay,
  className,
}: {
  a: CardData;
  variant?: CardVariant;
  ratio?: Ratio;
  showDek?: boolean;
  showByline?: boolean;
  showRubric?: boolean;
  showTime?: boolean;
  eager?: boolean;
  reveal?: boolean;
  delay?: number;
  className?: string;
}) {
  const href = `/story/${a.slug}`;
  const label = a.rubric || a.section_name;
  const labelHref = a.section_slug ? `/${a.section_slug}` : href;
  const dek = showDek ?? ['lead', 'large', 'row', 'overlay'].includes(variant);
  const r: Ratio =
    ratio ?? (variant === 'compact' ? 'square' : variant === 'overlay' ? 'tall' : variant === 'lead' ? 'landscape' : 'landscape');
  const Title = variant === 'lead' ? 'h2' : 'h3';
  return (
    <article
      className={cn('card', `card--${variant}`, className)}
      data-reveal={reveal ? '' : undefined}
      style={delay ? ({ '--d': `${delay}s` } as React.CSSProperties) : undefined}
    >
      {variant !== 'text' && (
        <Link href={href} className="card__media-link" tabIndex={-1} aria-hidden>
          <Media src={a.hero_image} alt="" ratio={r} eager={eager} className={variant === 'lead' ? 'kenburns' : undefined} play={a.type === 'video'} />
        </Link>
      )}
      <div className="card__body">
        {showRubric && label ? (
          <Link href={labelHref} className="rubric">
            {label}
          </Link>
        ) : null}
        <Title className="card__title">
          <Link href={href}>{a.title}</Link>
        </Title>
        {dek && a.dek ? <p className="card__dek">{a.dek}</p> : null}
        {showByline && a.authors.length > 0 ? (
          <p className="byline">
            By{' '}
            {a.authors.map((au, i) => (
              <span key={au.slug}>
                {i > 0 ? (i === a.authors.length - 1 ? ' and ' : ', ') : ''}
                <Link href={`/contributor/${au.slug}`}>{au.name}</Link>
              </span>
            ))}
          </p>
        ) : null}
        {showTime && a.published_at ? <p className="card__meta">{timeAgo(a.published_at)}</p> : null}
      </div>
    </article>
  );
}

export function bylineText(a: CardData) {
  return joinNames(a.authors.map((x) => x.name));
}

export function toCard(a: CardData): CardData {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    dek: a.dek,
    rubric: a.rubric,
    hero_image: a.hero_image,
    published_at: a.published_at,
    section_name: a.section_name,
    section_slug: a.section_slug,
    type: a.type,
    authors: a.authors.map((x) => ({ name: x.name, slug: x.slug })),
  };
}
