import { cn } from '@/lib/utils';
import { PlayIcon } from './Icons';

export type Ratio = 'landscape' | 'wide' | 'square' | 'portrait' | 'tall' | 'none';

export function Media({
  src,
  alt = '',
  ratio = 'landscape',
  className,
  eager,
  play,
  badge,
}: {
  src?: string | null;
  alt?: string;
  ratio?: Ratio;
  className?: string;
  eager?: boolean;
  play?: boolean;
  badge?: string;
}) {
  return (
    <span className={cn('media', ratio !== 'none' && `media--${ratio}`, className)}>
      {src ? <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : undefined} /> : null}
      {play ? (
        <span className="media__play">
          <PlayIcon />
        </span>
      ) : null}
      {badge ? <span className="media__badge">{badge}</span> : null}
    </span>
  );
}

export function Avatar({ name, src, size = 56 }: { name: string; src?: string | null; size?: number }) {
  const ini = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {src ? <img src={src} alt={name} loading="lazy" /> : ini}
    </span>
  );
}
