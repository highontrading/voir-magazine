'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deleteTag, mergeTags, saveTag } from '@/lib/data/taxonomy';
import { logActivity } from '@/lib/data/site';
import { get } from '@/lib/db';
import { dbError, fail, int, ok, str, type ActionResult } from '@/lib/admin/form';
import { slugify } from '@/lib/utils';

const tagName = async (id: number) => (await get<{ name: string }>('SELECT name FROM tags WHERE id = ?', id))?.name;

export async function saveTagAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const id = int(fd, 'id') || undefined;
  const name = str(fd, 'name', 80);
  if (!name) return fail('Tag name is required.', { name: 'Required' });
  if (await get('SELECT 1 FROM tags WHERE lower(name) = lower(?) AND id != ?', name, id ?? 0))
    return fail(`A tag called “${name}” already exists — merge into it instead.`, { name: 'Already exists' });
  const slug = slugify(str(fd, 'slug', 90));
  if (slug && (await get('SELECT 1 FROM tags WHERE slug = ? AND id != ?', slug, id ?? 0)))
    return fail(`Another tag already uses the slug “${slug}”.`, { slug: 'Already in use' });
  try {
    const tid = await saveTag({ name, slug, description: str(fd, 'description', 500) }, id);
    await logActivity(user.id, id ? 'renamed' : 'created', 'tag', tid, name);
    revalidatePath('/', 'layout');
    return ok(id ? 'Tag updated.' : `Tag “${name}” created.`);
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteTagAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const id = int(fd, 'id');
  const name = await tagName(id);
  if (!name) return fail('Tag not found.');
  await deleteTag(id);
  await logActivity(user.id, 'deleted', 'tag', null, name);
  revalidatePath('/', 'layout');
  return ok(`Deleted “${name}”.`);
}

export async function mergeTagAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const from = int(fd, 'id');
  const into = int(fd, 'into');
  if (!into) return fail('Choose a tag to merge into.');
  if (from === into) return fail('Pick a different tag.');
  const [a, b] = await Promise.all([tagName(from), tagName(into)]);
  if (!a || !b) return fail('Tag not found.');
  await mergeTags(from, into);
  await logActivity(user.id, 'merged', 'tag', into, `${a} → ${b}`);
  revalidatePath('/', 'layout');
  return ok(`Merged “${a}” into “${b}”.`);
}
