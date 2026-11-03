'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deletePlan, deleteSubscription, getPlan, logActivity, savePlan, updateSubscription } from '@/lib/data/site';
import { moveRow, nextPosition } from '@/lib/data/admin';
import { get } from '@/lib/db';
import { bool, dbError, fail, int, ok, str, type ActionResult } from '@/lib/admin/form';
import type { Subscription } from '@/lib/types';

export async function savePlanAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('audience.manage');
  const id = int(fd, 'id') || undefined;
  const name = str(fd, 'name', 120);
  const price = str(fd, 'price', 40);
  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Name is required.';
  if (!price) errors.price = 'Price is required, e.g. $1 or $49.99.';
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!, errors);
  const features = str(fd, 'features', 5000)
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 20);
  try {
    const pid = await savePlan(
      {
        name,
        price,
        interval: str(fd, 'interval', 30) || 'year',
        description: str(fd, 'description', 1000),
        features: JSON.stringify(features),
        badge: str(fd, 'badge', 40),
        highlighted: bool(fd, 'highlighted') ? 1 : 0,
        active: bool(fd, 'active') ? 1 : 0,
        position: str(fd, 'position') === '' ? (id ? (await getPlan(id))?.position ?? 0 : await nextPosition('plans')) : int(fd, 'position'),
      },
      id,
    );
    await logActivity(user.id, id ? 'updated' : 'created', 'plan', pid, name);
    revalidatePath('/', 'layout');
    return ok(id ? 'Plan saved.' : 'Plan created.', { redirect: '/admin/subscriptions?tab=plans' });
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deletePlanAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('audience.manage');
  const p = await getPlan(int(fd, 'id'));
  if (!p) return fail('Plan not found.');
  await deletePlan(p.id);
  await logActivity(user.id, 'deleted', 'plan', null, p.name);
  revalidatePath('/', 'layout');
  return ok(`Deleted the “${p.name}” plan.`, { redirect: '/admin/subscriptions?tab=plans' });
}

export async function movePlanAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser('audience.manage');
  if (!(await moveRow('plans', int(fd, 'id'), int(fd, 'dir') < 0 ? -1 : 1))) return fail('Can’t move further.');
  revalidatePath('/', 'layout');
  return ok();
}

export async function updateOrderAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('audience.manage');
  const id = int(fd, 'id');
  const row = await get<{ name: string; status: string }>('SELECT name, status FROM subscriptions WHERE id = ?', id);
  if (!row) return fail('Order not found.');
  const status = str(fd, 'status') as Subscription['status'];
  if (!['pending', 'active', 'cancelled'].includes(status)) return fail('Invalid status.');
  await updateSubscription(id, status, str(fd, 'notes', 4000));
  await logActivity(user.id, status !== row.status ? `marked ${status}` : 'updated', 'subscription', id, row.name);
  revalidatePath('/admin/subscriptions');
  return ok('Subscription updated.');
}

export async function deleteOrderAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('audience.manage');
  const id = int(fd, 'id');
  const row = await get<{ name: string }>('SELECT name FROM subscriptions WHERE id = ?', id);
  if (!row) return fail('Order not found.');
  await deleteSubscription(id);
  await logActivity(user.id, 'deleted', 'subscription', null, row.name);
  revalidatePath('/admin/subscriptions');
  return ok('Subscription deleted.');
}
