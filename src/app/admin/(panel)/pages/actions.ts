'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deletePage, getPageById, savePage } from '@/lib/data/content';
import { logActivity } from '@/lib/data/site';
import { dbError, fail, int, ok, raw, str, type ActionResult } from '@/lib/admin/form';
import { slugify } from '@/lib/utils';
import { cleanHtml } from '@/lib/html';
import { topLevelSlugClash } from '@/lib/admin/reserved';


export async function savePageAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const id = int(fd, 'id') || undefined;
  const title = str(fd, 'title', 200);
  const slug = slugify(str(fd, 'slug', 90) || title);
  const errors: Record<string, string> = {};
  if (!title) errors.title = 'Title is required.';
  const clash = topLevelSlugClash(slug, 'page', id);
  if (clash) errors.slug = clash;
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!, errors);
  const status = str(fd, 'status') === 'draft' ? 'draft' : 'published';
  try {
    const pid = savePage({ title, slug, intro: str(fd, 'intro', 2000), body: cleanHtml(raw(fd, 'body')), status, seo_description: str(fd, 'seo_description', 400) }, id);
    logActivity(user.id, id ? 'updated' : 'created', 'page', pid, title);
    revalidatePath('/', 'layout');
    return ok(id ? 'Page saved.' : 'Page created.', { redirect: id ? undefined : `/admin/pages/${pid}` });
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deletePageAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const pg = getPageById(int(fd, 'id'));
  if (!pg) return fail('Page not found.');
  deletePage(pg.id);
  logActivity(user.id, 'deleted', 'page', null, pg.title);
  revalidatePath('/', 'layout');
  return ok(`Deleted “${pg.title}”.`, { redirect: '/admin/pages' });
}
