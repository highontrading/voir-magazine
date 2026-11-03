'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { deleteEpisode, deletePodcast, getEpisodeById, getPodcastById, saveEpisode, savePodcast } from '@/lib/data/content';
import { logActivity } from '@/lib/data/site';
import { moveRow, nextPosition } from '@/lib/data/admin';
import { bool, dbError, fail, int, isoOrNull, isUrlish, ok, str, type ActionResult } from '@/lib/admin/form';

export async function savePodcastAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const id = int(fd, 'id') || undefined;
  const title = str(fd, 'title', 200);
  const apple = str(fd, 'apple_url', 500);
  const spotify = str(fd, 'spotify_url', 500);
  const errors: Record<string, string> = {};
  if (!title) errors.title = 'Show title is required.';
  if (!isUrlish(apple)) errors.apple_url = 'Use a full https:// link.';
  if (!isUrlish(spotify)) errors.spotify_url = 'Use a full https:// link.';
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!, errors);
  try {
    const position = str(fd, 'position') === '' ? (id ? (await getPodcastById(id))?.position ?? 0 : await nextPosition('podcasts')) : int(fd, 'position');
    const pid = await savePodcast(
      {
        title,
        slug: str(fd, 'slug', 90),
        description: str(fd, 'description', 3000),
        host: str(fd, 'host', 200),
        cover_image: str(fd, 'cover_image', 1000),
        apple_url: apple,
        spotify_url: spotify,
        position,
        active: bool(fd, 'active') ? 1 : 0,
      },
      id,
    );
    await logActivity(user.id, id ? 'updated' : 'created', 'podcast', pid, title);
    revalidatePath('/', 'layout');
    return ok(id ? 'Show saved.' : 'Show created — now add episodes.', { redirect: id ? undefined : `/admin/podcasts/${pid}` });
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deletePodcastAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const p = await getPodcastById(int(fd, 'id'));
  if (!p) return fail('Show not found.');
  await deletePodcast(p.id);
  await logActivity(user.id, 'deleted', 'podcast', null, p.title);
  revalidatePath('/', 'layout');
  return ok(`Deleted “${p.title}” and its episodes.`, { redirect: '/admin/podcasts' });
}

export async function movePodcastAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser('content.manage');
  if (!(await moveRow('podcasts', int(fd, 'id'), int(fd, 'dir') < 0 ? -1 : 1))) return fail('Can’t move further.');
  revalidatePath('/', 'layout');
  return ok();
}

export async function saveEpisodeAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const id = int(fd, 'id') || undefined;
  const podcastId = int(fd, 'podcast_id');
  if (!(await getPodcastById(podcastId))) return fail('Show not found.');
  const title = str(fd, 'title', 300);
  const audio = str(fd, 'audio_url', 1000);
  const duration = str(fd, 'duration', 12);
  const errors: Record<string, string> = {};
  if (!title) errors.title = 'Episode title is required.';
  if (!audio) errors.audio_url = 'Add an audio URL or upload an mp3.';
  else if (!isUrlish(audio)) errors.audio_url = 'Audio URL should start with https:// or /media/.';
  if (duration && !/^\d{1,3}:\d{2}(:\d{2})?$/.test(duration)) errors.duration = 'Use mm:ss or h:mm:ss.';
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!, errors);
  const status = str(fd, 'status') === 'draft' ? 'draft' : 'published';
  try {
    const eid = await saveEpisode(
      {
        podcast_id: podcastId,
        title,
        slug: str(fd, 'slug', 90),
        description: str(fd, 'description', 5000),
        audio_url: audio,
        duration,
        image: str(fd, 'image', 1000),
        status,
        published_at: isoOrNull(str(fd, 'published_at')),
      },
      id,
    );
    await logActivity(user.id, id ? 'updated' : status === 'published' ? 'published' : 'created', 'episode', eid, title);
    revalidatePath('/', 'layout');
    return ok(id ? 'Episode saved.' : 'Episode added.', { redirect: `/admin/podcasts/${podcastId}` });
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteEpisodeAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser('content.manage');
  const e = await getEpisodeById(int(fd, 'id'));
  if (!e) return fail('Episode not found.');
  await deleteEpisode(e.id);
  await logActivity(user.id, 'deleted', 'episode', null, e.title);
  revalidatePath('/', 'layout');
  return ok(`Deleted “${e.title}”.`, { redirect: `/admin/podcasts/${e.podcast_id}` });
}
