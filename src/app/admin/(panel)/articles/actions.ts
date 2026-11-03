'use server';

import { revalidatePath } from 'next/cache';
import { requireUser, can } from '@/lib/auth';
import type { User, ArticleStatus } from '@/lib/types';
import { deleteArticles, duplicateArticle, getArticleById, saveArticle, setArticleStatus } from '@/lib/data/articles';
import { articleOwner } from '@/lib/data/admin';
import { logActivity } from '@/lib/data/site';
import { dbError, fail, ids, ok, str, type ActionResult } from '@/lib/admin/form';
import { ARTICLE_STATUSES, ARTICLE_TYPES, HERO_LAYOUTS, type ArticlePayload } from '@/lib/admin/article';
import { slugify } from '@/lib/utils';

const LIVE: ArticleStatus[] = ['published', 'scheduled', 'archived'];

function canTouch(user: User, a: { created_by: number | null; status: ArticleStatus }) {
  if (can(user, 'articles.all')) return true;
  return a.created_by === user.id && !LIVE.includes(a.status);
}

export async function saveArticleAction(p: ArticlePayload): Promise<ActionResult> {
  const user = await requireUser();
  const publisher = can(user, 'articles.publish');
  const existing = p.id ? getArticleById(p.id) : null;
  if (p.id && !existing) return fail('This story no longer exists.');
  if (existing && !canTouch(user, existing)) {
    return fail(LIVE.includes(existing.status) ? 'This story is live — ask an editor to make changes.' : 'You can only edit your own stories.');
  }

  const errors: Record<string, string> = {};
  const title = (p.title ?? '').trim();
  if (!title) errors.title = 'A headline is required.';
  if (title.length > 300) errors.title = 'Keep the headline under 300 characters.';
  if (p.slug && !slugify(p.slug)) errors.slug = 'Use letters, numbers and dashes.';
  if (!ARTICLE_STATUSES.includes(p.status)) errors.status = 'Unknown status.';
  if ((p.seo_description ?? '').length > 320) errors.seo_description = 'Keep the description under 320 characters.';

  let status: ArticleStatus = p.status;
  let publishedAt: string | null = p.published_at ? new Date(p.published_at).toISOString() : null;
  if (publishedAt && Number.isNaN(new Date(publishedAt).getTime())) errors.published_at = 'Invalid date.';

  if (!publisher) {
    if (status !== 'draft' && status !== 'review') return fail('Writers can save drafts or submit for review only.');
    publishedAt = existing?.published_at ?? null;
  } else {
    const now = Date.now();
    if (status === 'published' && publishedAt && new Date(publishedAt).getTime() > now + 30_000) status = 'scheduled';
    if (status === 'scheduled') {
      if (!publishedAt) errors.published_at = 'Choose a future date and time to schedule this story.';
      else if (new Date(publishedAt).getTime() <= now) status = 'published';
    }
  }
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!, errors);

  try {
    const id = saveArticle(
      {
        title,
        slug: slugify(p.slug || title),
        dek: (p.dek ?? '').trim(),
        rubric: (p.rubric ?? '').trim(),
        body: p.body ?? '',
        section_id: p.section_id || null,
        issue_id: p.issue_id || null,
        type: ARTICLE_TYPES.includes(p.type) ? p.type : 'story',
        hero_image: (p.hero_image ?? '').trim(),
        hero_caption: (p.hero_caption ?? '').trim(),
        hero_credit: (p.hero_credit ?? '').trim(),
        hero_layout: HERO_LAYOUTS.includes(p.hero_layout) ? p.hero_layout : 'standard',
        status,
        published_at: publishedAt,
        featured: publisher ? !!p.featured : !!existing?.featured,
        top_story: publisher ? !!p.top_story : !!existing?.top_story,
        editors_pick: publisher ? !!p.editors_pick : !!existing?.editors_pick,
        allow_index: p.allow_index !== false,
        seo_title: (p.seo_title ?? '').trim(),
        seo_description: (p.seo_description ?? '').trim(),
        authorIds: (p.authorIds ?? []).filter((n) => Number.isInteger(n) && n > 0),
        tagNames: (p.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 30),
      },
      p.id ?? undefined,
      user.id,
    );
    const saved = getArticleById(id)!;
    const wasLive = existing && (existing.status === 'published' || existing.status === 'scheduled');
    const action = !existing
      ? status === 'published'
        ? 'published'
        : status === 'scheduled'
          ? 'scheduled'
          : status === 'review'
            ? 'submitted for review'
            : 'created'
      : status === 'published' && !wasLive
        ? 'published'
        : status === 'scheduled' && existing.status !== 'scheduled'
          ? 'scheduled'
          : status === 'review' && existing.status !== 'review'
            ? 'submitted for review'
            : 'updated';
    logActivity(user.id, action, 'article', id, title);
    revalidatePath('/', 'layout');
    const msg =
      status === 'published'
        ? existing && wasLive
          ? 'Story updated.'
          : 'Story published.'
        : status === 'scheduled'
          ? `Scheduled for ${new Date(saved.published_at!).toUTCString().replace(':00 GMT', ' UTC')}.`
          : status === 'review'
            ? 'Submitted for review.'
            : status === 'archived'
              ? 'Story archived.'
              : 'Draft saved.';
    return ok(msg, { data: { id, slug: saved.slug, status: saved.status, published_at: saved.published_at, updated_at: saved.updated_at } });
  } catch (e) {
    return fail(dbError(e, 'Could not save the story.'));
  }
}

export async function bulkArticlesAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const intent = str(fd, 'intent');
  const list = ids(fd, 'ids');
  if (!list.length) return fail('Select at least one story.');
  const rows = list.map(articleOwner).filter((r): r is NonNullable<typeof r> => !!r);
  const allowed = rows.filter((r) => canTouch(user, r));
  if (!allowed.length) return fail('You don’t have permission to change the selected stories.');
  const target = allowed.map((r) => r.id);
  const skipped = rows.length - allowed.length;
  const n = target.length;
  const noun = `${n} ${n === 1 ? 'story' : 'stories'}`;
  let msg = '';
  switch (intent) {
    case 'publish':
      if (!can(user, 'articles.publish')) return fail('You can’t publish stories.');
      setArticleStatus(target, 'published');
      msg = `Published ${noun}.`;
      break;
    case 'draft':
      setArticleStatus(target, 'draft');
      msg = `Moved ${noun} to drafts.`;
      break;
    case 'review':
      setArticleStatus(target, 'review');
      msg = `Submitted ${noun} for review.`;
      break;
    case 'archive':
      if (!can(user, 'articles.publish')) return fail('You can’t archive stories.');
      setArticleStatus(target, 'archived');
      msg = `Archived ${noun}.`;
      break;
    case 'delete':
      deleteArticles(target);
      msg = `Deleted ${noun}.`;
      break;
    default:
      return fail('Unknown action.');
  }
  const verb = { publish: 'published', draft: 'moved to draft', review: 'submitted for review', archive: 'archived', delete: 'deleted' }[intent]!;
  for (const r of allowed) logActivity(user.id, verb, 'article', intent === 'delete' ? null : r.id, r.title);
  revalidatePath('/', 'layout');
  return ok(msg + (skipped ? ` ${skipped} skipped (no permission).` : ''), { data: { cleared: true } });
}

export async function deleteArticleAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = Number(fd.get('id'));
  const row = articleOwner(id);
  if (!row) return fail('Story not found.');
  if (!canTouch(user, row)) return fail('You don’t have permission to delete this story.');
  deleteArticles([id]);
  logActivity(user.id, 'deleted', 'article', null, row.title);
  revalidatePath('/', 'layout');
  return ok('Story deleted.', { redirect: str(fd, 'redirect') || undefined });
}

export async function duplicateArticleAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = Number(fd.get('id'));
  const row = articleOwner(id);
  if (!row) return fail('Story not found.');
  if (!can(user, 'articles.all') && row.created_by !== user.id) return fail('You can only duplicate your own stories.');
  const newId = duplicateArticle(id, user.id);
  if (!newId) return fail('Could not duplicate.');
  logActivity(user.id, 'duplicated', 'article', newId, row.title);
  revalidatePath('/admin/articles');
  return ok('Copy created as a draft.', { redirect: `/admin/articles/${newId}` });
}
