'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deleteMessage, getMessage, logActivity, markMessage } from '@/lib/data/site';
import { fail, int, ok, str, type ActionResult } from '@/lib/admin/form';

export async function markMessageAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser('audience.manage');
  const m = await getMessage(int(fd, 'id'));
  if (!m) return fail('Message not found.');
  const read = str(fd, 'read') === '1';
  await markMessage(m.id, read);
  revalidatePath('/admin', 'layout');
  return ok(fd.get('silent') ? undefined : read ? 'Marked as read.' : 'Marked as unread.', { redirect: str(fd, 'back') || undefined });
}

export async function deleteMessageAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('audience.manage');
  const m = await getMessage(int(fd, 'id'));
  if (!m) return fail('Message not found.');
  await deleteMessage(m.id);
  await logActivity(user.id, 'deleted', 'message', null, m.subject || m.email);
  revalidatePath('/admin', 'layout');
  return ok('Message deleted.', { redirect: str(fd, 'back') || '/admin/messages' });
}
