'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deleteAuthor, getAuthorById, saveAuthor } from '@/lib/data/taxonomy';
import { logActivity } from '@/lib/data/site';
import { moveRow, nextPosition } from '@/lib/data/admin';
import { bool, dbError, EMAIL_RE, fail, int, isUrlish, ok, str, type ActionResult } from '@/lib/admin/form';

export async function saveAuthorAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const id = int(fd, 'id') || undefined;
  const name = str(fd, 'name', 120);
  const email = str(fd, 'email', 200);
  const website = str(fd, 'website', 300);
  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Name is required.';
  if (email && !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (website && !isUrlish(website)) errors.website = 'Website should start with https://';
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!, errors);
  const handle = (v: string) => v.replace(/^@/, '').replace(/^https?:\/\/(www\.)?(x|twitter|instagram)\.com\//i, '').replace(/\/$/, '');
  try {
    const aid = saveAuthor(
      {
        name,
        slug: str(fd, 'slug', 90),
        title: str(fd, 'title', 160),
        bio: str(fd, 'bio', 3000),
        photo: str(fd, 'photo', 1000),
        email,
        twitter: handle(str(fd, 'twitter', 100)),
        instagram: handle(str(fd, 'instagram', 100)),
        website,
        on_masthead: bool(fd, 'on_masthead') ? 1 : 0,
        position: str(fd, 'position') === '' ? (id ? getAuthorById(id)?.position ?? 0 : nextPosition('authors')) : int(fd, 'position'),
      },
      id,
    );
    logActivity(user.id, id ? 'updated' : 'created', 'author', aid, name);
    revalidatePath('/', 'layout');
    return ok(id ? 'Contributor saved.' : 'Contributor added.', { redirect: '/admin/authors' });
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteAuthorAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const a = getAuthorById(int(fd, 'id'));
  if (!a) return fail('Contributor not found.');
  deleteAuthor(a.id);
  logActivity(user.id, 'deleted', 'author', null, a.name);
  revalidatePath('/', 'layout');
  return ok(`Removed ${a.name}.`, { redirect: '/admin/authors' });
}

export async function moveAuthorAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser('content.manage');
  if (!moveRow('authors', int(fd, 'id'), int(fd, 'dir') < 0 ? -1 : 1)) return fail('Can’t move further.');
  revalidatePath('/', 'layout');
  return ok();
}
