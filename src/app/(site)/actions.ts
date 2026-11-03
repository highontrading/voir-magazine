'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { currentReader, loginReader, logoutReader, registerReader, verifyPassword } from '@/lib/auth';
import { get } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import {
  createMessage,
  createSubscription,
  getPlan,
  setReaderNewsletters,
  subscribeEmail,
  toggleSaved,
  updateReaderProfile,
} from '@/lib/data/site';

export interface FormState {
  ok?: boolean;
  error?: string;
  message?: string;
  /** What the user submitted, echoed back on error so the reset form keeps their input (never passwords). */
  values?: Record<string, string>;
  /** Newsletter ids the reader is now subscribed to (NewsletterPrefsForm). */
  selected?: number[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const pick = (fd: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? '')]));

/**
 * Same-origin path to send a reader to after sign-in. Anything that could resolve to another
 * origin (protocol-relative, backslashes, control characters, absolute URLs) falls back.
 */
function safeNext(next: string, fallback = '/account'): string {
  if (!next.startsWith('/') || /[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  const base = 'http://voirtales.invalid';
  try {
    const u = new URL(next, base);
    const path = u.pathname + u.search + u.hash;
    return u.origin === base && path.startsWith('/') && !path.startsWith('//') ? path : fallback;
  } catch {
    return fallback;
  }
}

export async function subscribeNewsletterAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email');
  if (!EMAIL.test(email)) return { error: 'Please enter a valid email address.', values: { email } };
  const ids = fd.getAll('nl').map(Number).filter(Boolean);
  const added = await subscribeEmail(email, ids, str(fd, 'source') || 'website');
  return {
    ok: true,
    message: added > 0 ? 'You’re on the list. Watch your inbox for our next edition.' : 'You’re already subscribed — thanks for reading!',
  };
}

export async function contactAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, 'name');
  const email = str(fd, 'email');
  const body = str(fd, 'body');
  if (!name || !EMAIL.test(email) || body.length < 10)
    return { error: 'Please fill in your name, a valid email and a message (10+ characters).', values: pick(fd, ['name', 'email', 'topic', 'subject', 'body']) };
  if (str(fd, 'website')) return { ok: true, message: 'Thank you!' }; // honeypot
  await createMessage({ name, email, subject: str(fd, 'subject').slice(0, 200), topic: str(fd, 'topic') || 'general', body: body.slice(0, 8000) });
  return { ok: true, message: 'Thank you — your message has been sent to our editors. We read everything.' };
}

export async function subscribePlanAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const plan = await getPlan(Number(fd.get('plan')));
  const name = str(fd, 'name');
  const email = str(fd, 'email');
  const values = pick(fd, ['name', 'email', 'address', 'city', 'country', 'postal_code']);
  if (!plan || !plan.active) return { error: 'Please choose a plan.', values };
  if (!name || !EMAIL.test(email)) return { error: 'Please enter your name and a valid email.', values };
  const reader = await currentReader();
  await createSubscription({
    plan_id: plan.id,
    reader_id: reader?.id ?? null,
    name,
    email,
    address: str(fd, 'address'),
    city: str(fd, 'city'),
    country: str(fd, 'country'),
    postal_code: str(fd, 'postal_code'),
  });
  return { ok: true, message: `Welcome to Voirtales! Your ${plan.name} subscription request has been received. A confirmation has been sent to ${email}.` };
}

const accountsOff = async () => !(await getSettings()).features.readerAccounts;
const OFF: FormState = { error: 'Reader accounts are currently unavailable.' };

export async function signInAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (await accountsOff()) return OFF;
  const r = await loginReader(str(fd, 'email'), String(fd.get('password') ?? ''));
  if (!r) return { error: 'That email and password combination is not correct.', values: { email: str(fd, 'email') } };
  redirect(safeNext(str(fd, 'next')));
}

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (await accountsOff()) return OFF;
  const name = str(fd, 'name');
  const email = str(fd, 'email');
  const password = String(fd.get('password') ?? '');
  const values = { name, email, daily: fd.get('daily') ? 'on' : '' };
  if (!name) return { error: 'Please enter your name.', values };
  if (!EMAIL.test(email)) return { error: 'Please enter a valid email address.', values };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.', values };
  const r = await registerReader(name, email, password);
  if ('error' in r) return { error: r.error, values };
  if (fd.get('daily')) await subscribeEmail(email, [], 'register');
  redirect('/account?welcome=1');
}

export async function signOutAction() {
  await logoutReader();
  redirect('/');
}

export async function toggleSaveAction(articleId: number): Promise<{ saved?: boolean; needsLogin?: boolean }> {
  if (await accountsOff()) return {};
  const reader = await currentReader();
  if (!reader) return { needsLogin: true };
  const saved = await toggleSaved(reader.id, articleId);
  revalidatePath('/account');
  return { saved };
}

export async function newsletterPrefsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (await accountsOff()) return OFF;
  const ids = fd.getAll('nl').map(Number).filter(Boolean);
  const reader = await currentReader();
  if (!reader) return { error: 'Please sign in again.', selected: ids };
  await setReaderNewsletters(reader.email, ids);
  revalidatePath('/account');
  return { ok: true, message: 'Your newsletter preferences have been updated.', selected: ids };
}

export async function profileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (await accountsOff()) return OFF;
  const reader = await currentReader();
  if (!reader) return { error: 'Please sign in again.' };
  const name = str(fd, 'name');
  const pw = String(fd.get('password') ?? '');
  const values = { name };
  if (!name) return { error: 'Name cannot be empty.', values };
  if (pw) {
    if (pw.length < 8) return { error: 'New password must be at least 8 characters.', values };
    const row = await get<{ password_hash: string }>('SELECT password_hash FROM readers WHERE id = ?', reader.id);
    if (!row || !verifyPassword(String(fd.get('current') ?? ''), row.password_hash))
      return { error: 'Your current password is incorrect.', values };
  }
  await updateReaderProfile(reader.id, name, pw || undefined);
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Profile saved.' };
}
