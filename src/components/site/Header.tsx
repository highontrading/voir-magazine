'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { CloseIcon, MenuIcon, SearchIcon, UserIcon } from './Icons';
import { SocialLinks } from './Social';

type Item = { label: string; url: string; new_tab?: number };
type Sug = { slug: string; title: string; hero_image: string; section_name: string | null; rubric: string };

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const drawerRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const isArticle = pathname.startsWith('/story/');

  useEffect(() => {
    setDrawer(false);
    setSearch(false);
  }, [pathname]);

  // Focus management: remember the opener, move focus into the open dialog, restore it on close.
  useEffect(() => {
    if (drawer || search) {
      if (!openerRef.current) {
        const a = document.activeElement;
        openerRef.current = a instanceof HTMLElement && a !== document.body ? a : null;
      }
      const t = setTimeout(() => {
        if (search) inputRef.current?.focus();
        else drawerCloseRef.current?.focus();
      }, 60);
      return () => clearTimeout(t);
    }
    const opener = openerRef.current;
    openerRef.current = null;
    const a = document.activeElement;
    const lost = !a || a === document.body || drawerRef.current?.contains(a) || searchRef.current?.contains(a);
    if (opener && opener.isConnected && lost) opener.focus();
  }, [drawer, search]);

  useEffect(() => {
    document.body.style.overflow = drawer || search ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawer(false);
        setSearch(false);
      }
      if (e.key === 'Tab' && (drawer || search)) {
        const box = search ? searchRef.current : drawerRef.current;
        if (box) {
          const els = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
          const first = els[0];
          const last = els[els.length - 1];
          const cur = document.activeElement;
          if (!first || !last) {
            e.preventDefault();
          } else if (!box.contains(cur)) {
            e.preventDefault();
            first.focus();
          } else if (e.shiftKey && cur === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && cur === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
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
  // Close a dialog whenever one of its links is followed, even if the pathname does not change.
  const closeOnLink = (close: () => void) => (e: React.MouseEvent) => {
    if (e.target instanceof Element && e.target.closest('a[href]')) close();
  };

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
                <Link
                  href={n.url}
                  className={cn(active(n.url) && 'is-active')}
                  target={n.new_tab ? '_blank' : undefined}
                  rel={n.new_tab ? 'noopener noreferrer' : undefined}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className={cn('stickybar', stuck && 'is-visible')} aria-hidden={!stuck} inert={!stuck}>
        <div className="stickybar__inner">
          <button className="icon-btn" onClick={() => setDrawer(true)} aria-label="Open menu" tabIndex={stuck ? 0 : -1}>
            <MenuIcon />
          </button>
          <Logo text={p.logoText} image={p.logoImage} />
          <nav aria-label="Sections (compact)">
            <ul>
              {p.nav.slice(0, 8).map((n) => (
                <li key={n.url + n.label}>
                  <Link
                    href={n.url}
                    className={cn(active(n.url) && 'is-active')}
                    tabIndex={stuck ? 0 : -1}
                    target={n.new_tab ? '_blank' : undefined}
                    rel={n.new_tab ? 'noopener noreferrer' : undefined}
                  >
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
      <aside
        ref={drawerRef}
        className={cn('drawer', drawer && 'is-open')}
        role="dialog"
        aria-modal="true"
        aria-hidden={!drawer}
        inert={!drawer}
        aria-label="Site menu"
        onClick={closeOnLink(() => setDrawer(false))}
      >
        <div className="drawer__head">
          <Logo text={p.logoText} image={p.logoImage} />
          <button ref={drawerCloseRef} className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>
        <div className="drawer__search">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = new FormData(e.currentTarget).get('q');
              const term = String(v ?? '').trim();
              if (!term) return;
              setDrawer(false);
              router.push(`/search?q=${encodeURIComponent(term)}`);
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
            <Link key={n.url + n.label} href={n.url} target={n.new_tab ? '_blank' : undefined} rel={n.new_tab ? 'noopener noreferrer' : undefined}>
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

      <div
        ref={searchRef}
        className={cn('search-overlay', search && 'is-open')}
        role="dialog"
        aria-modal="true"
        aria-hidden={!search}
        inert={!search}
        aria-label="Search"
        onClick={closeOnLink(() => setSearch(false))}
      >
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
