'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { CloseIcon, MenuIcon, SearchIcon, UserIcon } from './Icons';
import { SocialLinks } from './Social';

type Item = { label: string; url: string; new_tab?: number };
type Sug = { slug: string; title: string; hero_image: string; section_name: string | null; rubric: string };

export interface HeaderProps {
  logoText: string;
  logoImage: string;
  tagline: string;
  nav: Item[];
  extra: Item[];
  sections: { name: string; slug: string }[];
  social: Record<string, string>;
  subscribeCta: string;
  readerName: string | null;
  accounts: boolean;
  progress: boolean;
  trending: { name: string; slug: string }[];
}

function Logo({ text, image }: { text: string; image: string }) {
  return (
    <Link href="/" className="logo" aria-label={`${text} home`}>
      {image ? <img src={image} alt={text} /> : text}
    </Link>
  );
}

export function Header(p: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [q, setQ] = useState('');
  const [sug, setSug] = useState<Sug[]>([]);
  const mastRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isArticle = pathname.startsWith('/story/');

  useEffect(() => {
    setDrawer(false);
    setSearch(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawer || search ? 'hidden' : '';
    if (search) setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawer(false);
        setSearch(false);
      }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer, search]);

  useEffect(() => {
    const onScroll = () => {
      const h = mastRef.current?.offsetHeight ?? 160;
      setStuck(window.scrollY > h + 40);
      if (barRef.current && isArticle && p.progress) {
        const doc = document.documentElement;
        const pct = Math.min(100, (window.scrollY / Math.max(1, doc.scrollHeight - window.innerHeight)) * 100);
        barRef.current.style.width = `${pct}%`;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isArticle, p.progress]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSug([]);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((d) => setSug(d.items ?? []))
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setSearch(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const active = (url: string) => url !== '/' && (pathname === url || pathname.startsWith(url + '/'));
  const accountHref = p.readerName ? '/account' : '/account/sign-in';

  return (
    <>
      <header className="masthead" ref={mastRef}>
        <div className="masthead__top">
          <div className="masthead__left">
            <button className="icon-btn" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer}>
              <MenuIcon /> <span className="label">Menu</span>
            </button>
            <button className="icon-btn" onClick={() => setSearch(true)} aria-label="Search">
              <SearchIcon />
            </button>
          </div>
          <div>
            <Logo text={p.logoText} image={p.logoImage} />
            {p.tagline ? <div className="masthead__tagline">{p.tagline}</div> : null}
          </div>
          <div className="masthead__right">
            {p.accounts ? (
              <Link href={accountHref} className="signin-link">
                {p.readerName ? `Hi, ${p.readerName.split(' ')[0]}` : 'Sign In'}
              </Link>
            ) : null}
            <Link href="/subscribe" className="btn btn--accent btn--sm">
              {p.subscribeCta}
            </Link>
          </div>
        </div>
        <nav className="mainnav" aria-label="Sections">
          <ul>
            {p.nav.map((n) => (
              <li key={n.url + n.label}>
                <Link href={n.url} className={cn(active(n.url) && 'is-active')} target={n.new_tab ? '_blank' : undefined}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className={cn('stickybar', stuck && 'is-visible')} aria-hidden={!stuck}>
        <div className="stickybar__inner">
          <button className="icon-btn" onClick={() => setDrawer(true)} aria-label="Open menu" tabIndex={stuck ? 0 : -1}>
            <MenuIcon />
          </button>
          <Logo text={p.logoText} image={p.logoImage} />
          <nav aria-label="Sections (compact)">
            <ul>
              {p.nav.slice(0, 8).map((n) => (
                <li key={n.url + n.label}>
                  <Link href={n.url} className={cn(active(n.url) && 'is-active')} tabIndex={stuck ? 0 : -1}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <button className="icon-btn" onClick={() => setSearch(true)} aria-label="Search" tabIndex={stuck ? 0 : -1}>
            <SearchIcon />
          </button>
          <Link href="/subscribe" className="btn btn--accent btn--sm" tabIndex={stuck ? 0 : -1}>
            {p.subscribeCta}
          </Link>
        </div>
        {isArticle && p.progress ? <div className="progress" ref={barRef} /> : null}
      </div>

      <div className={cn('drawer-backdrop', drawer && 'is-open')} onClick={() => setDrawer(false)} />
      <aside className={cn('drawer', drawer && 'is-open')} aria-hidden={!drawer} aria-label="Site menu">
        <div className="drawer__head">
          <Logo text={p.logoText} image={p.logoImage} />
          <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>
        <div className="drawer__search">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = new FormData(e.currentTarget).get('q');
              if (v) router.push(`/search?q=${encodeURIComponent(String(v))}`);
            }}
          >
            <input name="q" placeholder="Search Voirtales" aria-label="Search" />
            <button className="icon-btn" aria-label="Submit search">
              <SearchIcon />
            </button>
          </form>
        </div>
        <nav className="drawer__sections">
          {p.sections.map((s) => (
            <Link key={s.slug} href={`/${s.slug}`}>
              {s.name} <span>→</span>
            </Link>
          ))}
          <Link href="/video">
            Video <span>→</span>
          </Link>
          <Link href="/podcasts">
            Podcasts <span>→</span>
          </Link>
          <Link href="/magazine">
            The Magazine <span>→</span>
          </Link>
        </nav>
        <div className="drawer__links">
          {p.extra.map((n) => (
            <Link key={n.url + n.label} href={n.url}>
              {n.label}
            </Link>
          ))}
          {p.accounts ? (
            <Link href={accountHref}>
              <UserIcon style={{ width: 14, height: 14, display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
              {p.readerName ? 'My Account' : 'Sign In'}
            </Link>
          ) : null}
        </div>
        <div className="drawer__cta">
          <p>Get unlimited access to every story.</p>
          <Link href="/subscribe" className="btn btn--accent">
            {p.subscribeCta}
          </Link>
        </div>
        <div className="social" style={{ padding: '0 24px 24px' }}>
          <SocialLinks social={p.social} />
        </div>
      </aside>

      <div className={cn('search-overlay', search && 'is-open')} role="dialog" aria-modal="true" aria-hidden={!search} aria-label="Search">
        <button className="icon-btn search-overlay__close" onClick={() => setSearch(false)} aria-label="Close search">
          <CloseIcon style={{ width: 30, height: 30 }} />
        </button>
        <div className="search-overlay__form">
          <form onSubmit={submit}>
            <SearchIcon style={{ width: 34, height: 34, flex: 'none' }} />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search query" />
          </form>
        </div>
        <div className="search-overlay__results">
          {sug.length > 0 ? (
            <>
              {sug.map((s) => (
                <Link key={s.slug} href={`/story/${s.slug}`} className="search-suggest" onClick={() => setSearch(false)}>
                  <span className="media media--landscape">{s.hero_image ? <img src={s.hero_image} alt="" /> : null}</span>
                  <span>
                    <span className="rubric">{s.rubric || s.section_name}</span>
                    <h4>{s.title}</h4>
                  </span>
                </Link>
              ))}
              <p style={{ marginTop: 20 }}>
                <button className="btn btn--ghost btn--sm" onClick={submit as unknown as React.MouseEventHandler}>
                  See all results for “{q}”
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow" style={{ marginBottom: 14 }}>
                Trending topics
              </p>
              <div className="chips">
                {p.trending.map((t) => (
                  <Link key={t.slug} href={`/tag/${t.slug}`} className="chip" onClick={() => setSearch(false)}>
                    {t.name}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
