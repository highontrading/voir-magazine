import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRight } from './Icons';

export function BlockHead({ title, href, more = 'See more', light, center, children }: { title: string; href?: string; more?: string; light?: boolean; center?: boolean; children?: React.ReactNode }) {
  return (
    <header className={cn('block-head', light && 'block-head--light', center && 'block-head--center')} data-reveal="fade">
      <h2 className="block-head__title">{href ? <Link href={href}>{title}</Link> : title}</h2>
      {children}
      {href ? (
        <Link href={href} className="block-head__more">
          {more} <ArrowRight />
        </Link>
      ) : null}
    </header>
  );
}
