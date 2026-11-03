'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp } from './Icons';

/** Scroll-reveal animations, back-to-top button and parallax, driven by data attributes. */
export function Effects({ reveal, backToTop }: { reveal: boolean; backToTop: boolean }) {
  const pathname = usePathname();
  const [top, setTop] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (!reveal || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      root.classList.remove('reveal-on');
      return;
    }
    root.classList.add('reveal-on');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const scan = () => {
      document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el, i) => {
        const parent = el.parentElement;
        // stagger siblings in grids
        if (parent && !(el as HTMLElement).style.getPropertyValue('--d')) {
          const idx = Array.prototype.indexOf.call(parent.children, el);
          (el as HTMLElement).style.setProperty('--d', `${Math.min(idx, 5) * 0.07}s`);
        }
        io.observe(el);
        void i;
      });
    };
    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname, reveal]);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
    const onScroll = () => {
      setTop(window.scrollY > 900);
      for (const el of els) {
        const speed = Number(el.dataset.parallax) || 0.15;
        const rect = el.parentElement!.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
        el.style.transform = `translate3d(0, ${(rect.top * -speed).toFixed(1)}px, 0) scale(1.12)`;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  if (!backToTop) return null;
  return (
    <button
      className={cn('to-top', top && 'is-visible')}
      aria-hidden={!top}
      inert={!top}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">
      <ArrowUp />
    </button>
  );
}

export function Announcement({ text, link, linkLabel }: { text: string; link: string; linkLabel: string }) {
  const [hidden, setHidden] = useState(false);
  const key = `vt-ann-${text.length}-${text.slice(0, 12)}`;
  useEffect(() => {
    try {
      if (sessionStorage.getItem(key)) setHidden(true);
    } catch {}
  }, [key]);
  if (hidden) return null;
  return (
    <div className="announce" role="region" aria-label="Announcement">
      {text}
      {link ? <a href={link}>{linkLabel || 'Learn more'}</a> : null}
      <button
        className="announce__close"
        aria-label="Dismiss announcement"
        onClick={() => {
          setHidden(true);
          try {
            sessionStorage.setItem(key, '1');
          } catch {}
        }}
      >
        ×
      </button>
    </div>
  );
}

export function CookieBanner({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem('vt-cookies')) setShow(true);
    } catch {}
  }, []);
  if (!show) return null;
  const choose = (v: string) => {
    try {
      localStorage.setItem('vt-cookies', v);
    } catch {}
    setShow(false);
  };
  return (
    <div className="cookie" role="dialog" aria-label="Cookie consent">
      <p>
        {text} <a href="/cookie-policy">Cookie Policy</a>
      </p>
      <div className="cookie__actions">
        <button className="btn btn--ghost btn--sm" onClick={() => choose('essential')}>
          Essential only
        </button>
        <button className="btn btn--sm" onClick={() => choose('all')}>
          Accept all
        </button>
      </div>
    </div>
  );
}
