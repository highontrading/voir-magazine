'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deleteReader, logActivity, setReaderActive } from '@/lib/data/site';
import { get } from '@/lib/db';
import { fail, int, ok, str, type ActionResult } from '@/lib/admin/form';

export async function setReaderActiveAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('audience.manage');
  const id = int(fd, 'id');
  const r = await get<{ email: string }>('SELECT email FROM readers WHERE id = ?', id);
  if (!r) return fail('Reader not found.');
  const active = str(fd, 'active') === '1';
  await setReaderActive(id, active);
  await logActivity(user.id, active ? 'activated' : 'deactivated', 'reader', id, r.email);
  revalidatePath('/admin/readers');
  return ok(active ? `${r.email} can sign in again.` : `${r.email} deactivated and signed out.`);
}

export async function deleteReaderAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('audience.manage');
  const id = int(fd, 'id');
  const r = await get<{ email: string }>('SELECT email FROM readers WHERE id = ?', id);
  if (!r) return fail('Reader not found.');
  await deleteReader(id);
  await logActivity(user.id, 'deleted', 'reader', null, r.email);
  revalidatePath('/admin/readers');
  return ok(`Deleted the account for ${r.email}.`);
}
