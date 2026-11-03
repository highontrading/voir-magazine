'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deleteNewsletter, deleteSubscriber, getNewsletterById, logActivity, saveNewsletter, subscribeEmail } from '@/lib/data/site';
import { moveRow, nextPosition } from '@/lib/data/admin';
import { get } from '@/lib/db';
import { bool, dbError, EMAIL_RE, fail, ids, int, ok, str, type ActionResult } from '@/lib/admin/form';

export async function saveNewsletterAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('audience.manage');
  const id = int(fd, 'id') || undefined;
  const name = str(fd, 'name', 120);
  if (!name) return fail('Name is required.', { name: 'Required' });
  try {
    const nid = await saveNewsletter(
      {
        name,
        slug: str(fd, 'slug', 90),
        description: str(fd, 'description', 1000),
        frequency: str(fd, 'frequency', 80),
        image: str(fd, 'image', 1000),
        active: bool(fd, 'active') ? 1 : 0,
        position: str(fd, 'position') === '' ? (id ? (await getNewsletterById(id))?.position ?? 0 : await nextPosition('newsletters')) : int(fd, 'position'),
      },
      id,
    );
    await logActivity(user.id, id ? 'updated' : 'created', 'newsletter', nid, name);
    revalidatePath('/', 'layout');
    return ok(id ? 'Newsletter saved.' : 'Newsletter created.', { redirect: '/admin/newsletters' });
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteNewsletterAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('audience.manage');
  const n = await getNewsletterById(int(fd, 'id'));
  if (!n) return fail('Newsletter not found.');
  await deleteNewsletter(n.id);
  await logActivity(user.id, 'deleted', 'newsletter', null, n.name);
  revalidatePath('/', 'layout');
  return ok(`Deleted “${n.name}” and its subscriber list.`, { redirect: '/admin/newsletters' });
}

export async function moveNewsletterAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser('audience.manage');
  if (!(await moveRow('newsletters', int(fd, 'id'), int(fd, 'dir') < 0 ? -1 : 1))) return fail('Can’t move further.');
  revalidatePath('/', 'layout');
  return ok();
}

export async function addSubscriberAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('audience.manage');
  const email = str(fd, 'email', 200).toLowerCase();
  const lists = ids(fd, 'lists');
  if (!EMAIL_RE.test(email)) return fail('Enter a valid email address.', { email: 'Invalid email' });
  if (!lists.length) return fail('Choose at least one newsletter.');
  const added = await subscribeEmail(email, lists, 'admin');
  await logActivity(user.id, 'added', 'subscriber', null, email);
  revalidatePath('/admin/newsletters');
  return added ? ok(`Subscribed ${email} to ${added} list${added === 1 ? '' : 's'}.`) : fail(`${email} is already on the selected lists.`);
}

export async function deleteSubscriberAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('audience.manage');
  const list = ids(fd, 'id');
  if (!list.length) return fail('Nothing selected.');
  for (const id of list) {
    const row = await get<{ email: string }>('SELECT email FROM newsletter_subscribers WHERE id = ?', id);
    await deleteSubscriber(id);
    if (row) await logActivity(user.id, 'removed', 'subscriber', null, row.email);
  }
  revalidatePath('/admin/newsletters');
  return ok(list.length === 1 ? 'Subscriber removed.' : `${list.length} subscribers removed.`);
}
