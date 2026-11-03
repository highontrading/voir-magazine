'use server';

import { redirect } from 'next/navigation';
import { loginAdmin, logoutAdmin } from '@/lib/auth';
import { fail, str, type ActionResult } from '@/lib/admin/form';

export async function loginAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = str(fd, 'email', 200);
  const password = String(fd.get('password') ?? '');
  if (!email || !password) return fail('Enter your email and password.');
  const user = await loginAdmin(email, password);
  if (!user) return fail('Invalid email or password.', { password: 'Invalid email or password.' });
  const next = str(fd, 'next');
  redirect(next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin');
}

export async function logoutAction() {
  await logoutAdmin();
  redirect('/admin/login');
}
