'use server';

import { revalidatePath } from 'next/cache';
import { requireUser, verifyPassword } from '@/lib/auth';
import { emailTaken, logActivity, saveUser } from '@/lib/data/site';
import { userPasswordHash } from '@/lib/data/admin';
import { EMAIL_RE, fail, ok, str, type ActionResult } from '@/lib/admin/form';

export async function saveProfileAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const name = str(fd, 'name', 120);
  const email = str(fd, 'email', 200).toLowerCase();
  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Name is required.';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  else if (emailTaken('users', email, me.id)) errors.email = 'Another user already has this email.';
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!, errors);
  saveUser({ name, email, role: me.role, active: true, avatar: str(fd, 'avatar', 1000) || undefined }, me.id);
  logActivity(me.id, 'updated', 'profile', me.id, name);
  revalidatePath('/admin', 'layout');
  return ok('Profile saved.');
}

export async function changePasswordAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const current = String(fd.get('current') ?? '');
  const next = String(fd.get('next') ?? '');
  const confirm = String(fd.get('confirm') ?? '');
  const hash = userPasswordHash(me.id);
  if (!hash || !verifyPassword(current, hash)) return fail('Your current password is incorrect.', { current: 'Incorrect password' });
  if (next.length < 8) return fail('New password must be at least 8 characters.', { next: 'At least 8 characters' });
  if (next !== confirm) return fail('The new passwords don’t match.', { confirm: 'Doesn’t match' });
  if (next === current) return fail('Choose a password different from the current one.', { next: 'Same as current' });
  saveUser({ name: me.name, email: me.email, role: me.role, active: true, avatar: me.avatar ?? undefined, password: next }, me.id);
  logActivity(me.id, 'changed password', 'profile', me.id, me.name);
  return ok('Password changed.');
}
