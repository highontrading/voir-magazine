'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { currentReader, loginReader, logoutReader, registerReader } from '@/lib/auth';
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
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

export async function subscribeNewsletterAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email');
  if (!EMAIL.test(email)) return { error: 'Please enter a valid email address.' };
  const ids = fd.getAll('nl').map(Number).filter(Boolean);
  const added = subscribeEmail(email, ids, str(fd, 'source') || 'website');
  return {
    ok: true,
    message: added > 0 ? 'You’re on the list. Watch your inbox for our next edition.' : 'You’re already subscribed — thanks for reading!',
  };
}

export async function contactAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, 'name');
  const email = str(fd, 'email');
  const body = str(fd, 'body');
  if (!name || !EMAIL.test(email) || body.length < 10) return { error: 'Please fill in your name, a valid email and a message (10+ characters).' };
  if (str(fd, 'website')) return { ok: true, message: 'Thank you!' }; // honeypot
  createMessage({ name, email, subject: str(fd, 'subject').slice(0, 200), topic: str(fd, 'topic') || 'general', body: body.slice(0, 8000) });
  return { ok: true, message: 'Thank you — your message has been sent to our editors. We read everything.' };
}

export async function subscribePlanAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const plan = getPlan(Number(fd.get('plan')));
  const name = str(fd, 'name');
  const email = str(fd, 'email');
  if (!plan || !plan.active) return { error: 'Please choose a plan.' };
  if (!name || !EMAIL.test(email)) return { error: 'Please enter your name and a valid email.' };
  const reader = await currentReader();
  createSubscription({
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

export async function signInAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const r = await loginReader(str(fd, 'email'), String(fd.get('password') ?? ''));
  if (!r) return { error: 'That email and password combination is not correct.' };
  const next = str(fd, 'next');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/account');
}

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, 'name');
  const email = str(fd, 'email');
  const password = String(fd.get('password') ?? '');
  if (!name) return { error: 'Please enter your name.' };
  if (!EMAIL.test(email)) return { error: 'Please enter a valid email address.' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  const r = await registerReader(name, email, password);
  if ('error' in r) return { error: r.error };
  if (fd.get('daily')) subscribeEmail(email, [], 'register');
  redirect('/account?welcome=1');
}

export async function signOutAction() {
  await logoutReader();
  redirect('/');
}

export async function toggleSaveAction(articleId: number): Promise<{ saved?: boolean; needsLogin?: boolean }> {
  const reader = await currentReader();
  if (!reader) return { needsLogin: true };
  const saved = toggleSaved(reader.id, articleId);
  revalidatePath('/account');
  return { saved };
}

export async function newsletterPrefsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const reader = await currentReader();
  if (!reader) return { error: 'Please sign in again.' };
  setReaderNewsletters(reader.email, fd.getAll('nl').map(Number).filter(Boolean));
  return { ok: true, message: 'Your newsletter preferences have been updated.' };
}

export async function profileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const reader = await currentReader();
  if (!reader) return { error: 'Please sign in again.' };
  const name = str(fd, 'name');
  const pw = String(fd.get('password') ?? '');
  if (!name) return { error: 'Name cannot be empty.' };
  if (pw && pw.length < 8) return { error: 'New password must be at least 8 characters.' };
  updateReaderProfile(reader.id, name, pw || undefined);
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Profile saved.' };
}
