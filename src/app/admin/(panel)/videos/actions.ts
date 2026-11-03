'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deleteVideo, getVideoById, saveVideo } from '@/lib/data/content';
import { logActivity } from '@/lib/data/site';
import { bool, dbError, fail, int, isoOrNull, isUrlish, optInt, ok, str, type ActionResult } from '@/lib/admin/form';

export async function saveVideoAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const id = int(fd, 'id') || undefined;
  const title = str(fd, 'title', 300);
  const url = str(fd, 'video_url', 1000);
  const duration = str(fd, 'duration', 12);
  const errors: Record<string, string> = {};
  if (!title) errors.title = 'Title is required.';
  if (!url) errors.video_url = 'Add a video URL or upload a file.';
  else if (!isUrlish(url)) errors.video_url = 'Video URL should start with https:// or /media/.';
  if (duration && !/^\d{1,3}:\d{2}(:\d{2})?$/.test(duration)) errors.duration = 'Use mm:ss or h:mm:ss.';
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!, errors);
  const status = str(fd, 'status') === 'draft' ? 'draft' : 'published';
  try {
    const vid = saveVideo(
      {
        title,
        slug: str(fd, 'slug', 90),
        description: str(fd, 'description', 4000),
        section_id: optInt(fd, 'section_id'),
        series: str(fd, 'series', 120),
        duration,
        video_url: url,
        thumbnail: str(fd, 'thumbnail', 1000),
        status,
        featured: bool(fd, 'featured') ? 1 : 0,
        published_at: isoOrNull(str(fd, 'published_at')),
      },
      id,
    );
    logActivity(user.id, id ? 'updated' : status === 'published' ? 'published' : 'created', 'video', vid, title);
    revalidatePath('/', 'layout');
    return ok(id ? 'Video saved.' : 'Video added.', { redirect: '/admin/videos' });
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteVideoAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const v = getVideoById(int(fd, 'id'));
  if (!v) return fail('Video not found.');
  deleteVideo(v.id);
  logActivity(user.id, 'deleted', 'video', null, v.title);
  revalidatePath('/', 'layout');
  return ok(`Deleted “${v.title}”.`, { redirect: '/admin/videos' });
}
