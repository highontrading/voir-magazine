import 'server-only';
import { all, deleteRow, get, run, nowIso } from '../db';
import type { Episode, Issue, Page, Podcast, Video } from '../types';
import { slugify } from '../utils';
import { uniqueSlug } from './articles';

/* ---------------- magazine issues ---------------- */

export async function listIssues(publishedOnly = true): Promise<Issue[]> {
  return all<Issue>(`SELECT * FROM issues ${publishedOnly ? 'WHERE published = 1' : ''} ORDER BY issue_date DESC`);
}

export async function currentIssue(): Promise<Issue | null> {
  return (await get<Issue>('SELECT * FROM issues WHERE published = 1 ORDER BY issue_date DESC LIMIT 1')) ?? null;
}

export async function getIssue(slug: string): Promise<Issue | null> {
  return (await get<Issue>('SELECT * FROM issues WHERE slug = ?', slug)) ?? null;
}

export async function getIssueById(id: number): Promise<Issue | null> {
  return (await get<Issue>('SELECT * FROM issues WHERE id = ?', id)) ?? null;
}

export type IssueInput = Omit<Issue, 'id' | 'created_at' | 'slug'> & { slug?: string };

export async function saveIssue(input: IssueInput, id?: number): Promise<number> {
  const slug = await uniqueSlug('issues', input.slug || input.title, id);
  const vals = [input.title, slug, input.issue_date, input.cover_image, input.cover_line, input.description, input.cover_story_id, input.published] as const;
  if (id) {
    await run('UPDATE issues SET title=?, slug=?, issue_date=?, cover_image=?, cover_line=?, description=?, cover_story_id=?, published=? WHERE id=?', ...vals, id);
    return id;
  }
  return (await run('INSERT INTO issues (title, slug, issue_date, cover_image, cover_line, description, cover_story_id, published) VALUES (?,?,?,?,?,?,?,?)', ...vals)).lastId;
}

export async function deleteIssue(id: number): Promise<void> {
  await deleteRow('issues', id);
}

/* ---------------- videos ---------------- */

const VIDEO_BASE = 'SELECT v.*, s.name AS section_name, s.slug AS section_slug FROM videos v LEFT JOIN sections s ON s.id = v.section_id';

export async function listVideos(opts: { limit?: number; offset?: number; series?: string; section?: string; all?: boolean; exclude?: number } = {}): Promise<Video[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (!opts.all) {
    where.push("v.status = 'published' AND v.published_at <= ?");
    params.push(nowIso());
  }
  if (opts.series) {
    where.push('v.series = ?');
    params.push(opts.series);
  }
  if (opts.section) {
    where.push('s.slug = ?');
    params.push(opts.section);
  }
  if (opts.exclude) {
    where.push('v.id != ?');
    params.push(opts.exclude);
  }
  return all<Video>(
    `${VIDEO_BASE} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY v.featured DESC, v.published_at DESC LIMIT ? OFFSET ?`,
    ...params,
    opts.limit ?? 50,
    opts.offset ?? 0,
  );
}

export async function latestVideos(limit = 8): Promise<Video[]> {
  return all<Video>(`${VIDEO_BASE} WHERE v.status = 'published' AND v.published_at <= ? ORDER BY v.published_at DESC LIMIT ?`, nowIso(), limit);
}

export async function videoSeries(): Promise<string[]> {
  return (await all<{ series: string }>("SELECT DISTINCT series FROM videos WHERE series != '' AND status = 'published' ORDER BY series")).map((r) => r.series);
}

export async function getVideo(slug: string, publicOnly = true): Promise<Video | null> {
  return (
    (await get<Video>(`${VIDEO_BASE} WHERE v.slug = ? ${publicOnly ? "AND v.status = 'published' AND v.published_at <= ?" : ''}`, slug, ...(publicOnly ? [nowIso()] : []))) ?? null
  );
}

export async function getVideoById(id: number): Promise<Video | null> {
  return (await get<Video>(`${VIDEO_BASE} WHERE v.id = ?`, id)) ?? null;
}

export type VideoInput = Omit<Video, 'id' | 'created_at' | 'section_name' | 'section_slug' | 'views' | 'slug'> & { slug?: string };

export async function saveVideo(input: VideoInput, id?: number): Promise<number> {
  const slug = await uniqueSlug('videos', input.slug || input.title, id);
  const published = input.published_at || nowIso();
  const vals = [input.title, slug, input.description, input.section_id, input.series, input.duration, input.video_url, input.thumbnail, input.status, input.featured, published] as const;
  if (id) {
    await run('UPDATE videos SET title=?, slug=?, description=?, section_id=?, series=?, duration=?, video_url=?, thumbnail=?, status=?, featured=?, published_at=? WHERE id=?', ...vals, id);
    return id;
  }
  return (await run('INSERT INTO videos (title, slug, description, section_id, series, duration, video_url, thumbnail, status, featured, published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', ...vals)).lastId;
}

export async function deleteVideo(id: number): Promise<void> {
  await deleteRow('videos', id);
}

export async function recordVideoView(id: number): Promise<void> {
  await run('UPDATE videos SET views = views + 1 WHERE id = ?', id);
}

/* ---------------- podcasts ---------------- */

export async function listPodcasts(activeOnly = true): Promise<Podcast[]> {
  return all<Podcast>(
    `SELECT p.*, (SELECT COUNT(*) FROM episodes e WHERE e.podcast_id = p.id AND e.status = 'published' AND e.published_at <= ?) AS episode_count
     FROM podcasts p ${activeOnly ? 'WHERE p.active = 1' : ''} ORDER BY p.position, p.title`,
    nowIso(),
  );
}

export async function getPodcast(slug: string): Promise<Podcast | null> {
  return (await get<Podcast>('SELECT * FROM podcasts WHERE slug = ?', slug)) ?? null;
}

export async function getPodcastById(id: number): Promise<Podcast | null> {
  return (await get<Podcast>('SELECT * FROM podcasts WHERE id = ?', id)) ?? null;
}

export type PodcastInput = Omit<Podcast, 'id' | 'created_at' | 'episode_count' | 'slug'> & { slug?: string };

export async function savePodcast(input: PodcastInput, id?: number): Promise<number> {
  const slug = await uniqueSlug('podcasts', input.slug || input.title, id);
  const vals = [input.title, slug, input.description, input.host, input.cover_image, input.apple_url, input.spotify_url, input.position, input.active] as const;
  if (id) {
    await run('UPDATE podcasts SET title=?, slug=?, description=?, host=?, cover_image=?, apple_url=?, spotify_url=?, position=?, active=? WHERE id=?', ...vals, id);
    return id;
  }
  return (await run('INSERT INTO podcasts (title, slug, description, host, cover_image, apple_url, spotify_url, position, active) VALUES (?,?,?,?,?,?,?,?,?)', ...vals)).lastId;
}

export async function deletePodcast(id: number): Promise<void> {
  await deleteRow('podcasts', id);
}

const EP_BASE = 'SELECT e.*, p.title AS podcast_title, p.slug AS podcast_slug FROM episodes e JOIN podcasts p ON p.id = e.podcast_id';

export async function listEpisodes(podcastId?: number, publicOnly = true, limit = 100): Promise<Episode[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (podcastId) {
    where.push('e.podcast_id = ?');
    params.push(podcastId);
  }
  if (publicOnly) {
    where.push("e.status = 'published' AND e.published_at <= ? AND p.active = 1");
    params.push(nowIso());
  }
  return all<Episode>(`${EP_BASE} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY e.published_at DESC LIMIT ?`, ...params, limit);
}

/** Public lookup: only released episodes (published, publish date reached) of active shows. */
export async function getEpisode(podcastSlug: string, slug: string, publicOnly = true): Promise<Episode | null> {
  return (
    (await get<Episode>(
      `${EP_BASE} WHERE p.slug = ? AND e.slug = ? ${publicOnly ? "AND e.status = 'published' AND e.published_at <= ? AND p.active = 1" : ''}`,
      podcastSlug,
      slug,
      ...(publicOnly ? [nowIso()] : []),
    )) ?? null
  );
}

export async function getEpisodeById(id: number): Promise<Episode | null> {
  return (await get<Episode>(`${EP_BASE} WHERE e.id = ?`, id)) ?? null;
}

export type EpisodeInput = Omit<Episode, 'id' | 'created_at' | 'podcast_title' | 'podcast_slug' | 'slug'> & { slug?: string };

export async function saveEpisode(input: EpisodeInput, id?: number): Promise<number> {
  let slug = slugify(input.slug || input.title) || 'episode';
  const clash = await get<{ id: number }>('SELECT id FROM episodes WHERE podcast_id = ? AND slug = ? AND id != ?', input.podcast_id, slug, id ?? 0);
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;
  const vals = [input.podcast_id, input.title, slug, input.description, input.audio_url, input.duration, input.image, input.status, input.published_at || nowIso()] as const;
  if (id) {
    await run('UPDATE episodes SET podcast_id=?, title=?, slug=?, description=?, audio_url=?, duration=?, image=?, status=?, published_at=? WHERE id=?', ...vals, id);
    return id;
  }
  return (await run('INSERT INTO episodes (podcast_id, title, slug, description, audio_url, duration, image, status, published_at) VALUES (?,?,?,?,?,?,?,?,?)', ...vals)).lastId;
}

export async function deleteEpisode(id: number): Promise<void> {
  await deleteRow('episodes', id);
}

/* ---------------- static pages ---------------- */

export async function listPages(publishedOnly = false): Promise<Page[]> {
  return all<Page>(`SELECT * FROM pages ${publishedOnly ? "WHERE status = 'published'" : ''} ORDER BY title`);
}

export async function getPage(slug: string, publishedOnly = true): Promise<Page | null> {
  return (await get<Page>(`SELECT * FROM pages WHERE slug = ? ${publishedOnly ? "AND status = 'published'" : ''}`, slug)) ?? null;
}

export async function getPageById(id: number): Promise<Page | null> {
  return (await get<Page>('SELECT * FROM pages WHERE id = ?', id)) ?? null;
}

export type PageInput = Pick<Page, 'title' | 'intro' | 'body' | 'status' | 'seo_description'> & { slug?: string };

export async function savePage(input: PageInput, id?: number): Promise<number> {
  const slug = await uniqueSlug('pages', input.slug || input.title, id);
  if (id) {
    await run('UPDATE pages SET title=?, slug=?, intro=?, body=?, status=?, seo_description=?, updated_at=? WHERE id=?', input.title, slug, input.intro, input.body, input.status, input.seo_description, nowIso(), id);
    return id;
  }
  return (await run('INSERT INTO pages (title, slug, intro, body, status, seo_description) VALUES (?,?,?,?,?,?)', input.title, slug, input.intro, input.body, input.status, input.seo_description)).lastId;
}

export async function deletePage(id: number): Promise<void> {
  await deleteRow('pages', id);
}
