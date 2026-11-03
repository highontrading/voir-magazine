'use server';

import { revalidatePath } from 'next/cache';
import { requireUser, can } from '@/lib/auth';
import { deleteMediaRow, getMedia, logActivity, updateMedia } from '@/lib/data/site';
import { mediaUsage } from '@/lib/data/admin';
import { removeUploadFile } from '@/lib/uploads';
import { fail, int, ok, str, type ActionResult } from '@/lib/admin/form';

export async function updateMediaAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const m = await getMedia(int(fd, 'id'));
  if (!m) return fail('File not found.');
  if (!can(user, 'content.manage') && m.uploaded_by !== user.id) return fail('You can only edit files you uploaded.');
  await updateMedia(m.id, str(fd, 'alt', 500), str(fd, 'credit', 300));
  await logActivity(user.id, 'updated', 'media', m.id, m.original_name);
  revalidatePath('/admin/media');
  return ok('Details saved.');
}

export async function deleteMediaAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const m = await getMedia(int(fd, 'id'));
  if (!m) return fail('File not found.');
  if (!can(user, 'content.manage') && m.uploaded_by !== user.id) return fail('You can only delete files you uploaded.');
  await deleteMediaRow(m.id);
  await removeUploadFile(m.url.startsWith('/media/') ? m.filename : m.url);
  await logActivity(user.id, 'deleted', 'media', null, m.original_name);
  revalidatePath('/admin/media');
  return ok(`Deleted ${m.original_name}.`);
}

export async function mediaUsageAction(id: number): Promise<number> {
  await requireUser();
  const m = await getMedia(id);
  return m ? mediaUsage(m.url) : 0;
}
