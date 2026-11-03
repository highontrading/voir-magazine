'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deleteSection, getSectionById, saveSection } from '@/lib/data/taxonomy';
import { logActivity } from '@/lib/data/site';
import { moveRow, nextPosition } from '@/lib/data/admin';
import { topLevelSlugClash } from '@/lib/admin/reserved';
import { slugify } from '@/lib/utils';
import { bool, dbError, fail, int, ok, str, type ActionResult } from '@/lib/admin/form';

export async function saveSectionAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const id = int(fd, 'id') || undefined;
  const name = str(fd, 'name', 120);
  const color = str(fd, 'color', 7);
  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Name is required.';
  const slug = slugify(str(fd, 'slug', 90) || name);
  const clash = name ? await topLevelSlugClash(slug, 'section', id) : null;
  if (clash) errors.slug = clash;
  if (color && !/^#[0-9a-f]{6}$/i.test(color)) errors.color = 'Use a hex colour like #c8102e.';
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!, errors);
  try {
    const position =
      fd.get('position') === '' || fd.get('position') === null ? (id ? (await getSectionById(id))?.position ?? 0 : await nextPosition('sections')) : int(fd, 'position');
    const saved = await saveSection(
      {
        name,
        slug,
        description: str(fd, 'description', 1000),
        color,
        position,
        in_nav: bool(fd, 'in_nav') ? 1 : 0,
        hero_image: str(fd, 'hero_image', 1000),
        seo_title: str(fd, 'seo_title', 200),
        seo_description: str(fd, 'seo_description', 400),
      },
      id,
    );
    await logActivity(user.id, id ? 'updated' : 'created', 'section', saved, name);
    revalidatePath('/', 'layout');
    return ok(id ? 'Section saved.' : 'Section created.', { redirect: '/admin/sections' });
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteSectionAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const id = int(fd, 'id');
  const s = await getSectionById(id);
  if (!s) return fail('Section not found.');
  await deleteSection(id);
  await logActivity(user.id, 'deleted', 'section', null, s.name);
  revalidatePath('/', 'layout');
  return ok(`Deleted “${s.name}”. Its stories are now unsectioned.`, { redirect: '/admin/sections' });
}

export async function moveSectionAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser('content.manage');
  if (!(await moveRow('sections', int(fd, 'id'), int(fd, 'dir') < 0 ? -1 : 1))) return fail('Can’t move further.');
  revalidatePath('/', 'layout');
  return ok();
}
