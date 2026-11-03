'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deleteUser, emailTaken, getUser, logActivity, saveUser } from '@/lib/data/site';
import { adminCount } from '@/lib/data/admin';
import { bool, dbError, EMAIL_RE, fail, int, ok, str, type ActionResult } from '@/lib/admin/form';
import type { Role } from '@/lib/types';

export async function saveUserAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireUser('users.manage');
  const id = int(fd, 'id') || undefined;
  const existing = id ? getUser(id) : null;
  if (id && !existing) return fail('User not found.');
  const name = str(fd, 'name', 120);
  const email = str(fd, 'email', 200).toLowerCase();
  const role = str(fd, 'role') as Role;
  let active = bool(fd, 'active');
  const password = String(fd.get('password') ?? '');
  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Name is required.';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  else if (emailTaken('users', email, id ?? 0)) errors.email = 'Another user already has this email.';
  if (!['admin', 'editor', 'writer'].includes(role)) errors.role = 'Choose a role.';
  if (!id && password.length < 8) errors.password = 'Set a password of at least 8 characters.';
  if (id && password && password.length < 8) errors.password = 'Passwords need at least 8 characters.';
  if (existing && existing.id === me.id) {
    if (role !== existing.role) errors.role = 'You can’t change your own role.';
    if (!active) errors.active = 'You can’t deactivate yourself.';
    active = true;
  }
  if (existing?.role === 'admin' && existing.active && (role !== 'admin' || !active) && adminCount() <= 1) errors.role = 'At least one active admin is required.';
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!, errors);
  try {
    const uid = saveUser({ name, email, role, active, password: password || undefined, avatar: existing ? (str(fd, 'avatar', 1000) || undefined) : str(fd, 'avatar', 1000) || undefined }, id);
    logActivity(me.id, id ? 'updated' : 'created', 'user', uid, `${name} (${role})`);
    revalidatePath('/admin', 'layout');
    return ok(id ? 'User saved.' : `Invited ${name} as ${role}.`, { redirect: '/admin/users' });
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteUserAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireUser('users.manage');
  const u = getUser(int(fd, 'id'));
  if (!u) return fail('User not found.');
  if (u.id === me.id) return fail('You can’t delete your own account.');
  if (u.role === 'admin' && u.active && adminCount() <= 1) return fail('At least one active admin is required.');
  deleteUser(u.id);
  logActivity(me.id, 'deleted', 'user', null, u.name);
  revalidatePath('/admin', 'layout');
  return ok(`Deleted ${u.name}. Their stories are kept.`, { redirect: '/admin/users' });
}
