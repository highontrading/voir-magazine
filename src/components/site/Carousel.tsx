'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from './Icons';

/** Horizontal scroll-snap carousel with arrow controls. Renders controls into the header slot. */
export function Carousel({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft < 8);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  const go = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className="carousel" role="region" aria-label={label}>
      <div className="carousel__nav" style={{ justifyContent: 'flex-end', marginTop: -12, marginBottom: 18 }}>
        <button className="carousel__btn" onClick={() => go(-1)} disabled={atStart} aria-label="Previous">
          <ArrowLeft />
        </button>
        <button className="carousel__btn" onClick={() => go(1)} disabled={atEnd} aria-label="Next">
          <ArrowRight />
        </button>
      </div>
      <div className="carousel__track" ref={ref}>
        {children}
      </div>
    </div>
  );
}
