'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deleteIssue, getIssueById, saveIssue } from '@/lib/data/content';
import { logActivity } from '@/lib/data/site';
import { bool, dbError, fail, int, optInt, ok, str, type ActionResult } from '@/lib/admin/form';

export async function saveIssueAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const id = int(fd, 'id') || undefined;
  const title = str(fd, 'title', 200);
  const month = str(fd, 'issue_month', 7);
  const errors: Record<string, string> = {};
  if (!title) errors.title = 'Title is required.';
  if (!/^\d{4}-\d{2}$/.test(month)) errors.issue_month = 'Choose the issue month.';
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!, errors);
  try {
    const iid = await saveIssue(
      {
        title,
        slug: str(fd, 'slug', 90),
        issue_date: `${month}-01`,
        cover_image: str(fd, 'cover_image', 1000),
        cover_line: str(fd, 'cover_line', 300),
        description: str(fd, 'description', 3000),
        cover_story_id: optInt(fd, 'cover_story_id'),
        published: bool(fd, 'published') ? 1 : 0,
      },
      id,
    );
    await logActivity(user.id, id ? 'updated' : 'created', 'issue', iid, title);
    revalidatePath('/', 'layout');
    return ok(id ? 'Issue saved.' : 'Issue created.', { redirect: '/admin/issues' });
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteIssueAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const i = await getIssueById(int(fd, 'id'));
  if (!i) return fail('Issue not found.');
  await deleteIssue(i.id);
  await logActivity(user.id, 'deleted', 'issue', null, i.title);
  revalidatePath('/', 'layout');
  return ok(`Deleted “${i.title}”.`, { redirect: '/admin/issues' });
}
