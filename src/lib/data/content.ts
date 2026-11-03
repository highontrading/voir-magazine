import 'server-only';
import { all, get, run, nowIso } from '../db';
import type { Episode, Issue, Page, Podcast, Video } from '../types';
import { slugify } from '../utils';
import { uniqueSlug } from './articles';

/* ---------------- magazine issues ---------------- */

export function listIssues(publishedOnly = true): Issue[] {
  return all<Issue>(`SELECT * FROM issues ${publishedOnly ? 'WHERE published = 1' : ''} ORDER BY issue_date DESC`);
}

export function currentIssue(): Issue | null {
  return get<Issue>('SELECT * FROM issues WHERE published = 1 ORDER BY issue_date DESC LIMIT 1') ?? null;
}

export function getIssue(slug: string): Issue | null {
  return get<Issue>('SELECT * FROM issues WHERE slug = ?', slug) ?? null;
}

export function getIssueById(id: number): Issue | null {
  return get<Issue>('SELECT * FROM issues WHERE id = ?', id) ?? null;
}

export type IssueInput = Omit<Issue, 'id' | 'created_at' | 'slug'> & { slug?: string };

export function saveIssue(input: IssueInput, id?: number): number {
  const slug = uniqueSlug('issues', input.slug || input.title, id);
  const vals = [input.title, slug, input.issue_date, input.cover_image, input.cover_line, input.description, input.cover_story_id, input.published] as const;
  if (id) {
    run('UPDATE issues SET title=?, slug=?, issue_date=?, cover_image=?, cover_line=?, description=?, cover_story_id=?, published=? WHERE id=?', ...vals, id);
    return id;
  }
  return run('INSERT INTO issues (title, slug, issue_date, cover_image, cover_line, description, cover_story_id, published) VALUES (?,?,?,?,?,?,?,?)', ...vals).lastId;
}

export function deleteIssue(id: number) {
  run('DELETE FROM issues WHERE id = ?', id);
}

/* ---------------- videos ---------------- */

const VIDEO_BASE = 'SELECT v.*, s.name AS section_name, s.slug AS section_slug FROM videos v LEFT JOIN sections s ON s.id = v.section_id';

export function listVideos(opts: { limit?: number; offset?: number; series?: string; section?: string; all?: boolean; exclude?: number } = {}): Video[] {
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

export function latestVideos(limit = 8): Video[] {
  return all<Video>(`${VIDEO_BASE} WHERE v.status = 'published' AND v.published_at <= ? ORDER BY v.published_at DESC LIMIT ?`, nowIso(), limit);
}

export function videoSeries(): string[] {
  return all<{ series: string }>("SELECT DISTINCT series FROM videos WHERE series != '' AND status = 'published' ORDER BY series").map((r) => r.series);
}

export function getVideo(slug: string, publicOnly = true): Video | null {
  return (
    get<Video>(`${VIDEO_BASE} WHERE v.slug = ? ${publicOnly ? "AND v.status = 'published' AND v.published_at <= ?" : ''}`, slug, ...(publicOnly ? [nowIso()] : [])) ?? null
  );
}

export function getVideoById(id: number): Video | null {
  return get<Video>(`${VIDEO_BASE} WHERE v.id = ?`, id) ?? null;
}

export type VideoInput = Omit<Video, 'id' | 'created_at' | 'section_name' | 'section_slug' | 'views' | 'slug'> & { slug?: string };

export function saveVideo(input: VideoInput, id?: number): number {
  const slug = uniqueSlug('videos', input.slug || input.title, id);
  const published = input.published_at || nowIso();
  const vals = [input.title, slug, input.description, input.section_id, input.series, input.duration, input.video_url, input.thumbnail, input.status, input.featured, published] as const;
  if (id) {
    run('UPDATE videos SET title=?, slug=?, description=?, section_id=?, series=?, duration=?, video_url=?, thumbnail=?, status=?, featured=?, published_at=? WHERE id=?', ...vals, id);
    return id;
  }
  return run('INSERT INTO videos (title, slug, description, section_id, series, duration, video_url, thumbnail, status, featured, published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', ...vals).lastId;
}

export function deleteVideo(id: number) {
  run('DELETE FROM videos WHERE id = ?', id);
}

export function recordVideoView(id: number) {
  run('UPDATE videos SET views = views + 1 WHERE id = ?', id);
}

/* ---------------- podcasts ---------------- */

export function listPodcasts(activeOnly = true): Podcast[] {
  return all<Podcast>(
    `SELECT p.*, (SELECT COUNT(*) FROM episodes e WHERE e.podcast_id = p.id AND e.status = 'published') AS episode_count
     FROM podcasts p ${activeOnly ? 'WHERE p.active = 1' : ''} ORDER BY p.position, p.title`,
  );
}

export function getPodcast(slug: string): Podcast | null {
  return get<Podcast>('SELECT * FROM podcasts WHERE slug = ?', slug) ?? null;
}

export function getPodcastById(id: number): Podcast | null {
  return get<Podcast>('SELECT * FROM podcasts WHERE id = ?', id) ?? null;
}

export type PodcastInput = Omit<Podcast, 'id' | 'created_at' | 'episode_count' | 'slug'> & { slug?: string };

export function savePodcast(input: PodcastInput, id?: number): number {
  const slug = uniqueSlug('podcasts', input.slug || input.title, id);
  const vals = [input.title, slug, input.description, input.host, input.cover_image, input.apple_url, input.spotify_url, input.position, input.active] as const;
  if (id) {
    run('UPDATE podcasts SET title=?, slug=?, description=?, host=?, cover_image=?, apple_url=?, spotify_url=?, position=?, active=? WHERE id=?', ...vals, id);
    return id;
  }
  return run('INSERT INTO podcasts (title, slug, description, host, cover_image, apple_url, spotify_url, position, active) VALUES (?,?,?,?,?,?,?,?,?)', ...vals).lastId;
}

export function deletePodcast(id: number) {
  run('DELETE FROM podcasts WHERE id = ?', id);
}

const EP_BASE = 'SELECT e.*, p.title AS podcast_title, p.slug AS podcast_slug FROM episodes e JOIN podcasts p ON p.id = e.podcast_id';

export function listEpisodes(podcastId?: number, publicOnly = true, limit = 100): Episode[] {
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

export function getEpisode(podcastSlug: string, slug: string): Episode | null {
  return get<Episode>(`${EP_BASE} WHERE p.slug = ? AND e.slug = ?`, podcastSlug, slug) ?? null;
}

export function getEpisodeById(id: number): Episode | null {
  return get<Episode>(`${EP_BASE} WHERE e.id = ?`, id) ?? null;
}

export type EpisodeInput = Omit<Episode, 'id' | 'created_at' | 'podcast_title' | 'podcast_slug' | 'slug'> & { slug?: string };

export function saveEpisode(input: EpisodeInput, id?: number): number {
  let slug = slugify(input.slug || input.title) || 'episode';
  const clash = get<{ id: number }>('SELECT id FROM episodes WHERE podcast_id = ? AND slug = ? AND id != ?', input.podcast_id, slug, id ?? 0);
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;
  const vals = [input.podcast_id, input.title, slug, input.description, input.audio_url, input.duration, input.image, input.status, input.published_at || nowIso()] as const;
  if (id) {
    run('UPDATE episodes SET podcast_id=?, title=?, slug=?, description=?, audio_url=?, duration=?, image=?, status=?, published_at=? WHERE id=?', ...vals, id);
    return id;
  }
  return run('INSERT INTO episodes (podcast_id, title, slug, description, audio_url, duration, image, status, published_at) VALUES (?,?,?,?,?,?,?,?,?)', ...vals).lastId;
}

export function deleteEpisode(id: number) {
  run('DELETE FROM episodes WHERE id = ?', id);
}

/* ---------------- static pages ---------------- */

export function listPages(publishedOnly = false): Page[] {
  return all<Page>(`SELECT * FROM pages ${publishedOnly ? "WHERE status = 'published'" : ''} ORDER BY title`);
}

export function getPage(slug: string, publishedOnly = true): Page | null {
  return get<Page>(`SELECT * FROM pages WHERE slug = ? ${publishedOnly ? "AND status = 'published'" : ''}`, slug) ?? null;
}

export function getPageById(id: number): Page | null {
  return get<Page>('SELECT * FROM pages WHERE id = ?', id) ?? null;
}

export type PageInput = Pick<Page, 'title' | 'intro' | 'body' | 'status' | 'seo_description'> & { slug?: string };

export function savePage(input: PageInput, id?: number): number {
  const slug = uniqueSlug('pages', input.slug || input.title, id);
  if (id) {
    run('UPDATE pages SET title=?, slug=?, intro=?, body=?, status=?, seo_description=?, updated_at=? WHERE id=?', input.title, slug, input.intro, input.body, input.status, input.seo_description, nowIso(), id);
    return id;
  }
  return run('INSERT INTO pages (title, slug, intro, body, status, seo_description) VALUES (?,?,?,?,?,?)', input.title, slug, input.intro, input.body, input.status, input.seo_description).lastId;
}

export function deletePage(id: number) {
  run('DELETE FROM pages WHERE id = ?', id);
}
