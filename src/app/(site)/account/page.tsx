import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentReader } from '@/lib/auth';
import { getArticlesByIds } from '@/lib/data/articles';
import { listNewsletters, readerNewsletterIds, readerSubscription, savedArticleIds } from '@/lib/data/site';
import { cn, formatDate } from '@/lib/utils';
import { signOutAction } from '../actions';
import { Card, toCard } from '@/components/site/Card';
import { NewsletterPrefsForm, ProfileForm } from '@/components/site/Forms';

export const metadata: Metadata = { title: 'My Account', robots: { index: false } };

const TABS = [
  ['saved', 'Saved Stories'],
  ['newsletters', 'Newsletters'],
  ['subscription', 'Subscription'],
  ['profile', 'Profile'],
] as const;

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string; welcome?: string }> }) {
  const reader = await currentReader();
  if (!reader) redirect('/account/sign-in?next=/account');
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : 'saved';
  const [saved, sub, newsletters, selected] = await Promise.all([
    tab === 'saved' ? savedArticleIds(reader.id).then((ids) => getArticlesByIds(ids)) : [],
    readerSubscription(reader.id, reader.email),
    tab === 'newsletters' ? listNewsletters() : [],
    tab === 'newsletters' ? readerNewsletterIds(reader.email) : [],
  ]);
  return (
    <div className="wrap page-enter">
      <header className="page-head page-head--left" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', borderBottom: 0, marginBottom: 0 }}>
        <div>
          <span className="eyebrow" style={{ color: 'var(--accent)' }}>{sp.welcome ? 'Welcome to Voirtales' : 'My Account'}</span>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 80px)', marginTop: 8 }}>{reader.name}</h1>
          <p style={{ fontStyle: 'normal', fontFamily: 'var(--font-sans)', fontSize: 14, marginTop: 8 }}>
            {reader.email} · Member since {formatDate(reader.created_at, 'month')}
          </p>
        </div>
        <form action={signOutAction}>
          <button className="btn btn--ghost btn--sm">Sign out</button>
        </form>
      </header>
      <nav className="tabs">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/account?tab=${k}`} className={cn(tab === k && 'is-active')}>
            {l}
          </Link>
        ))}
      </nav>
      {tab === 'saved' ? (
        saved.length ? (
          <div className="grid grid--4">
            {saved.map((a) => (
              <Card key={a.id} a={toCard(a)} variant="medium" />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>No saved stories yet</h2>
            <p>Tap the bookmark icon on any story to save it here.</p>
          </div>
        )
      ) : null}
      {tab === 'newsletters' ? <NewsletterPrefsForm items={newsletters} selected={selected} /> : null}
      {tab === 'subscription' ? (
        sub ? (
          <div className="rail-box" style={{ maxWidth: 560 }}>
            <span className="rubric">{sub.status}</span>
            <h3 style={{ marginTop: 8 }}>{sub.plan_name ?? 'Subscription'}</h3>
            <p className="muted" style={{ fontFamily: 'var(--font-sans)', fontSize: 14 }}>Started {formatDate(sub.created_at)}</p>
            {sub.address ? <p style={{ marginTop: 12 }}>Delivering to {sub.address}, {sub.city} {sub.postal_code}, {sub.country}</p> : null}
          </div>
        ) : (
          <div className="empty">
            <h2>You’re not subscribed yet</h2>
            <p style={{ marginBottom: 20 }}>Get unlimited access and the print magazine.</p>
            <Link href="/subscribe" className="btn btn--accent">See plans</Link>
          </div>
        )
      ) : null}
      {tab === 'profile' ? <ProfileForm name={reader.name} email={reader.email} /> : null}
    </div>
  );
}
