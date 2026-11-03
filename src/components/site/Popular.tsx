import Link from 'next/link';
import type { Article } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Media } from './Media';

export function Popular({ items, title, rail }: { items: Article[]; title?: string; rail?: boolean }) {
  if (!items.length) return null;
  return (
    <div>
      {title ? <h2 className="toplist__title">{title}</h2> : null}
      <ol className={cn('popular', rail && 'popular--rail')} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((a, i) => (
          <li key={a.id} data-reveal>
            <Link href={`/story/${a.slug}`} className="popular__item">
              <span className="popular__num">{i + 1}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!rail ? <Media src={a.hero_image} ratio="landscape" /> : null}
                <span className="rubric">{a.rubric || a.section_name}</span>
                <h3>{a.title}</h3>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
