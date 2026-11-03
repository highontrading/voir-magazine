'use server';

import { redirect } from 'next/navigation';
import { loginAdmin, loginLocked, logoutAdmin } from '@/lib/auth';
import { fail, str, type ActionResult } from '@/lib/admin/form';

/** Only same-origin paths inside /admin are allowed as the post-login destination. */
function safeAdminPath(next: string): string {
  // Reject protocol-relative URLs, backslashes (browsers treat "/\evil.com" as "//evil.com") and control chars.
  if (!next.startsWith('/') || next.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(next)) return '/admin';
  const base = 'http://voirtales.invalid';
  let url: URL;
  try {
    url = new URL(next, base);
  } catch {
    return '/admin';
  }
  if (url.origin !== base) return '/admin';
  if (url.pathname !== '/admin' && !url.pathname.startsWith('/admin/')) return '/admin';
  return url.pathname + url.search + url.hash;
}

export async function loginAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = str(fd, 'email', 200);
  const password = String(fd.get('password') ?? '');
  if (!email || !password) return fail('Enter your email and password.');
  if (await loginLocked('admin', email)) return fail('Too many failed sign-in attempts. Please wait 15 minutes and try again.');
  const user = await loginAdmin(email, password);
  if (!user) return fail('Invalid email or password.', { password: 'Invalid email or password.' });
  redirect(safeAdminPath(str(fd, 'next')));
}

export async function logoutAction() {
  await logoutAdmin();
  redirect('/admin/login');
}
