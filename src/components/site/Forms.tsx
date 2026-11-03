'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import {
  contactAction,
  newsletterPrefsAction,
  profileAction,
  registerAction,
  signInAction,
  subscribeNewsletterAction,
  subscribePlanAction,
  type FormState,
} from '@/app/(site)/actions';
import { cn } from '@/lib/utils';

function Msg({ s }: { s: FormState }) {
  if (s.error) return <p className="form-msg form-msg--err" role="alert">{s.error}</p>;
  if (s.message) return <p className="form-msg form-msg--ok" role="status">{s.message}</p>;
  return null;
}

export function NewsletterForm({ source = 'website', newsletterIds = [], cta = 'Sign up', legal = true, dark }: { source?: string; newsletterIds?: number[]; cta?: string; legal?: boolean; dark?: boolean }) {
  const [state, action, pending] = useActionState(subscribeNewsletterAction, {});
  return (
    <form action={action}>
      {state.ok ? (
        <Msg s={state} />
      ) : (
        <>
          <div className="nl-form">
            <input type="hidden" name="source" value={source} />
            {newsletterIds.map((id) => (
              <input key={id} type="hidden" name="nl" value={id} />
            ))}
            <label className="sr-only" htmlFor={`nl-${source}`}>Email address</label>
            <input id={`nl-${source}`} className="input" type="email" name="email" placeholder="Your email address" required defaultValue={state.values?.email} />
            <button className={cn('btn', dark ? 'btn--accent' : '')} disabled={pending}>
              {pending ? 'Signing up…' : cta}
            </button>
          </div>
          <Msg s={state} />
          {legal ? (
            <p className="nl-legal">
              By signing up, you agree to our <Link href="/user-agreement">User Agreement</Link> and <Link href="/privacy-policy">Privacy Policy</Link>.
            </p>
          ) : null}
        </>
      )}
    </form>
  );
}

export function NewsletterPicker({ items }: { items: { id: number; name: string; description: string; frequency: string; image: string }[] }) {
  const [sel, setSel] = useState<number[]>(items.slice(0, 1).map((i) => i.id));
  const [state, action, pending] = useActionState(subscribeNewsletterAction, {});
  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <form action={action}>
      <div className="grid grid--3">
        {items.map((n) => (
          <label key={n.id} className={cn('nl-card', sel.includes(n.id) && 'is-selected')} data-reveal>
            <span className="media media--landscape">{n.image ? <img src={n.image} alt="" loading="lazy" /> : null}</span>
            <span className="nl-card__body">
              <span className="eyebrow" style={{ color: 'var(--accent)', fontSize: 11 }}>{n.frequency}</span>
              <h3>{n.name}</h3>
              <p>{n.description}</p>
              <span className="check">
                <input type="checkbox" name="nl" value={n.id} checked={sel.includes(n.id)} onChange={() => toggle(n.id)} />
                {sel.includes(n.id) ? 'Selected' : 'Select'}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className="nl-sticky">
        <div className="nl-sticky__inner">
          <strong style={{ fontFamily: 'var(--font-sans)', fontSize: 14 }}>
            {sel.length} newsletter{sel.length === 1 ? '' : 's'} selected
          </strong>
          <input type="hidden" name="source" value="newsletters-page" />
          <input className="input" style={{ flex: 1, minWidth: 220 }} type="email" name="email" placeholder="Your email address" required aria-label="Email address" defaultValue={state.values?.email} />
          <button className="btn btn--accent" disabled={pending || !sel.length}>
            {pending ? 'Subscribing…' : 'Subscribe'}
          </button>
        </div>
        <div style={{ marginTop: state.error || state.message ? 12 : 0 }}>
          <Msg s={state} />
        </div>
      </div>
    </form>
  );
}

export function ContactForm({ topics }: { topics: [string, string][] }) {
  const [state, action, pending] = useActionState(contactAction, {});
  if (state.ok) return <Msg s={state} />;
  return (
    <form action={action}>
      <Msg s={state} />
      <div className="grid grid--2" style={{ gap: '0 20px' }}>
        <div className="field">
          <label htmlFor="c-name">Name</label>
          <input id="c-name" className="input" name="name" required defaultValue={state.values?.name} />
        </div>
        <div className="field">
          <label htmlFor="c-email">Email</label>
          <input id="c-email" className="input" type="email" name="email" required defaultValue={state.values?.email} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-topic">Topic</label>
        {/* React applies a select's defaultValue only on mount, and resets the form after the action,
            so key on the returned topic to remount with it and keep the user's choice after an error. */}
        <select key={state.values?.topic ?? ''} id="c-topic" className="input" name="topic" defaultValue={state.values?.topic}>
          {topics.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="c-subject">Subject</label>
        <input id="c-subject" className="input" name="subject" defaultValue={state.values?.subject} />
      </div>
      <div className="field">
        <label htmlFor="c-body">Message</label>
        <textarea id="c-body" className="input" name="body" required minLength={10} defaultValue={state.values?.body} />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: -9999 }} aria-hidden />
      <button className="btn btn--accent" disabled={pending}>{pending ? 'Sending…' : 'Send message'}</button>
    </form>
  );
}

type PlanLite = { id: number; name: string; price: string; interval: string; description: string; features: string[]; badge: string; highlighted: number };

export function SubscribeFlow({ plans, defaultEmail, defaultName }: { plans: PlanLite[]; defaultEmail?: string; defaultName?: string }) {
  const [plan, setPlan] = useState<number | null>(null);
  const [state, action, pending] = useActionState(subscribePlanAction, {});
  const chosen = plans.find((p) => p.id === plan);
  if (state.ok)
    return (
      <div className="auth-card" style={{ maxWidth: 640, textAlign: 'center' }}>
        <span className="kicker-rule" />
        <h1>Thank you.</h1>
        <Msg s={state} />
        <Link className="btn" href="/">Start reading</Link>
      </div>
    );
  return (
    <>
      <div className="plans">
        {plans.map((p) => (
          <div key={p.id} className={cn('plan', p.highlighted && 'is-highlighted', plan === p.id && 'is-selected')} data-reveal>
            {p.badge ? <span className="plan__badge">{p.badge}</span> : null}
            <h3>{p.name}</h3>
            <div className="plan__price">
              {p.price} <small>/ {p.interval}</small>
            </div>
            <p style={{ fontSize: 16, color: '#444' }}>{p.description}</p>
            <ul>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              className={cn('btn btn--block', p.highlighted ? 'btn--accent' : '')}
              onClick={() => {
                setPlan(p.id);
                setTimeout(() => document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              }}
            >
              {plan === p.id ? 'Selected' : `Choose ${p.name}`}
            </button>
          </div>
        ))}
      </div>
      {chosen ? (
        <form action={action} id="checkout" className="auth-card" style={{ maxWidth: 720, scrollMarginTop: 90 }}>
          <h1 style={{ fontSize: 34 }}>Complete your order</h1>
          <p>
            {chosen.name} · {chosen.price}/{chosen.interval}
          </p>
          <Msg s={state} />
          <input type="hidden" name="plan" value={chosen.id} />
          <div className="grid grid--2" style={{ gap: '0 20px' }}>
            <div className="field">
              <label htmlFor="s-name">Full name</label>
              <input id="s-name" className="input" name="name" defaultValue={state.values?.name ?? defaultName} required />
            </div>
            <div className="field">
              <label htmlFor="s-email">Email</label>
              <input id="s-email" className="input" type="email" name="email" defaultValue={state.values?.email ?? defaultEmail} required />
            </div>
          </div>
          {chosen.name.toLowerCase().includes('digital') && !chosen.name.toLowerCase().includes('print') ? null : (
            <>
              <div className="field">
                <label htmlFor="s-address">Delivery address</label>
                <input id="s-address" className="input" name="address" defaultValue={state.values?.address} />
              </div>
              <div className="grid grid--3" style={{ gap: '0 20px' }}>
                <div className="field">
                  <label htmlFor="s-city">City</label>
                  <input id="s-city" className="input" name="city" defaultValue={state.values?.city} />
                </div>
                <div className="field">
                  <label htmlFor="s-postal">Postal code</label>
                  <input id="s-postal" className="input" name="postal_code" defaultValue={state.values?.postal_code} />
                </div>
                <div className="field">
                  <label htmlFor="s-country">Country</label>
                  <input id="s-country" className="input" name="country" defaultValue={state.values?.country ?? 'United States'} />
                </div>
              </div>
            </>
          )}
          <button className="btn btn--accent btn--block" disabled={pending}>
            {pending ? 'Processing…' : `Subscribe for ${chosen.price}`}
          </button>
          <p className="nl-legal" style={{ color: 'var(--muted)', textAlign: 'center' }}>
            Demo checkout — no payment is taken. Your request appears in the admin panel under Subscriptions.
          </p>
        </form>
      ) : null}
    </>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, {});
  return (
    <form action={action}>
      <Msg s={state} />
      <input type="hidden" name="next" value={next ?? ''} />
      <div className="field">
        <label htmlFor="si-email">Email</label>
        <input id="si-email" className="input" type="email" name="email" required autoComplete="email" defaultValue={state.values?.email} />
      </div>
      <div className="field">
        <label htmlFor="si-pw">Password</label>
        <input id="si-pw" className="input" type="password" name="password" required autoComplete="current-password" />
      </div>
      <button className="btn btn--block" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, {});
  return (
    <form action={action}>
      <Msg s={state} />
      <div className="field">
        <label htmlFor="r-name">Name</label>
        <input id="r-name" className="input" name="name" required autoComplete="name" defaultValue={state.values?.name} />
      </div>
      <div className="field">
        <label htmlFor="r-email">Email</label>
        <input id="r-email" className="input" type="email" name="email" required autoComplete="email" defaultValue={state.values?.email} />
      </div>
      <div className="field">
        <label htmlFor="r-pw">Password</label>
        <input id="r-pw" className="input" type="password" name="password" required minLength={8} autoComplete="new-password" />
      </div>
      <label className="check" style={{ marginBottom: 20 }}>
        <input type="checkbox" name="daily" defaultChecked={state.values ? state.values.daily === 'on' : true} /> Send me the Voirtales Daily newsletter
      </label>
      <button className="btn btn--accent btn--block" disabled={pending}>{pending ? 'Creating account…' : 'Create account'}</button>
    </form>
  );
}

export function NewsletterPrefsForm({ items, selected }: { items: { id: number; name: string; frequency: string; description: string }[]; selected: number[] }) {
  const [state, action, pending] = useActionState(newsletterPrefsAction, {});
  // The form resets after each save; reset to what was just submitted, not the first render's props.
  const current = state.selected ?? selected;
  return (
    <form action={action}>
      <Msg s={state} />
      <div className="rule-list" style={{ marginBottom: 24 }}>
        {items.map((n) => (
          <label key={n.id} className="check" style={{ fontSize: 16 }}>
            <input type="checkbox" name="nl" value={n.id} defaultChecked={current.includes(n.id)} />
            <span>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{n.name}</strong>
              <span className="muted" style={{ display: 'block', fontSize: 14 }}>
                {n.frequency} — {n.description}
              </span>
            </span>
          </label>
        ))}
      </div>
      <button className="btn" disabled={pending}>{pending ? 'Saving…' : 'Save preferences'}</button>
    </form>
  );
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(profileAction, {});
  return (
    <form action={action} style={{ maxWidth: 520 }}>
      <Msg s={state} />
      <div className="field">
        <label htmlFor="p-name">Name</label>
        <input id="p-name" className="input" name="name" defaultValue={state.values?.name ?? name} required />
      </div>
      <div className="field">
        <label>Email</label>
        <input className="input" value={email} disabled readOnly />
      </div>
      <div className="field">
        <label htmlFor="p-current">Current password (required to change your password)</label>
        <input id="p-current" className="input" type="password" name="current" autoComplete="current-password" />
      </div>
      <div className="field">
        <label htmlFor="p-pw">New password (optional)</label>
        <input id="p-pw" className="input" type="password" name="password" minLength={8} autoComplete="new-password" />
      </div>
      <button className="btn" disabled={pending}>{pending ? 'Saving…' : 'Save profile'}</button>
    </form>
  );
}
