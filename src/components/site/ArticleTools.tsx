'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toggleSaveAction } from '@/app/(site)/actions';
import { cn } from '@/lib/utils';
import { BookmarkIcon, FacebookLogo, LinkedInLogo, LinkIcon, MailIcon, XLogo } from './Icons';

export function ShareBar({ title, path, articleId, saved: initialSaved, accounts }: { title: string; path: string; articleId: number; saved: boolean; accounts: boolean }) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();
  const router = useRouter();
  useEffect(() => setUrl(window.location.origin + path), [path]);
  const enc = encodeURIComponent;
  const share = (href: string) => window.open(href, '_blank', 'noopener,noreferrer,width=640,height=560');
  return (
    <div className="article-tools">
      <button className="share-btn" aria-label="Share on X" onClick={() => share(`https://x.com/intent/post?url=${enc(url)}&text=${enc(title)}`)}>
        <XLogo />
      </button>
      <button className="share-btn" aria-label="Share on Facebook" onClick={() => share(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`)}>
        <FacebookLogo />
      </button>
      <button className="share-btn" aria-label="Share on LinkedIn" onClick={() => share(`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`)}>
        <LinkedInLogo />
      </button>
      <a className="share-btn" aria-label="Share by email" href={`mailto:?subject=${enc(title)}&body=${enc(url)}`}>
        <MailIcon />
      </a>
      <button
        className="share-btn"
        aria-label="Copy link"
        onClick={() => {
          navigator.clipboard?.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          });
        }}
      >
        <LinkIcon />
        {copied ? <span className="share-btn__tip">Link copied</span> : null}
      </button>
      {accounts ? (
        <button
          className={cn('share-btn', saved && 'is-on')}
          aria-label={saved ? 'Remove from saved stories' : 'Save story'}
          aria-pressed={saved}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await toggleSaveAction(articleId);
              if (r.needsLogin) router.push(`/account/sign-in?next=${enc(path)}`);
              else setSaved(!!r.saved);
            })
          }
        >
          <BookmarkIcon filled={saved} />
        </button>
      ) : null}
    </div>
  );
}

export function ViewTracker({ id, kind = 'article' }: { id: number; kind?: 'article' | 'video' }) {
  useEffect(() => {
    const key = `vt-viewed-${kind}-${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    fetch('/api/views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, kind }), keepalive: true }).catch(() => {});
  }, [id, kind]);
  return null;
}
