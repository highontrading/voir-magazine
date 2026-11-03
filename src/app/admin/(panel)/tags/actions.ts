'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deleteTag, mergeTags, saveTag } from '@/lib/data/taxonomy';
import { logActivity } from '@/lib/data/site';
import { get } from '@/lib/db';
import { dbError, fail, int, ok, str, type ActionResult } from '@/lib/admin/form';

const tagName = (id: number) => get<{ name: string }>('SELECT name FROM tags WHERE id = ?', id)?.name;

export async function saveTagAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const id = int(fd, 'id') || undefined;
  const name = str(fd, 'name', 80);
  if (!name) return fail('Tag name is required.', { name: 'Required' });
  if (!id && get('SELECT 1 FROM tags WHERE lower(name) = lower(?)', name)) return fail(`A tag called “${name}” already exists.`);
  try {
    const tid = saveTag({ name, slug: str(fd, 'slug', 90), description: str(fd, 'description', 500) }, id);
    logActivity(user.id, id ? 'renamed' : 'created', 'tag', tid, name);
    revalidatePath('/', 'layout');
    return ok(id ? 'Tag updated.' : `Tag “${name}” created.`);
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteTagAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const id = int(fd, 'id');
  const name = tagName(id);
  if (!name) return fail('Tag not found.');
  deleteTag(id);
  logActivity(user.id, 'deleted', 'tag', null, name);
  revalidatePath('/', 'layout');
  return ok(`Deleted “${name}”.`);
}

export async function mergeTagAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const from = int(fd, 'id');
  const into = int(fd, 'into');
  if (!into) return fail('Choose a tag to merge into.');
  if (from === into) return fail('Pick a different tag.');
  const a = tagName(from);
  const b = tagName(into);
  if (!a || !b) return fail('Tag not found.');
  mergeTags(from, into);
  logActivity(user.id, 'merged', 'tag', into, `${a} → ${b}`);
  revalidatePath('/', 'layout');
  return ok(`Merged “${a}” into “${b}”.`);
}
