import 'server-only';
import { all, batch, get, nowIso, type Param } from '../db';
import type { Activity, ArticleStatus, Media, Message, Subscriber, Tag } from '../types';

/* Extra read queries used only by the admin panel. */

export async function activityPage(page = 1, perPage = 30, opts: { entity?: string; userId?: number } = {}) {
  const where: string[] = ['1=1'];
  const params: Param[] = [];
  if (opts.entity) {
    where.push('l.entity = ?');
    params.push(opts.entity);
  }
  if (opts.userId) {
    where.push('l.user_id = ?');
    params.push(opts.userId);
  }
  const w = where.join(' AND ');
  const [countRow, items] = await Promise.all([
    get<{ n: number }>(`SELECT COUNT(*) AS n FROM activity_log l WHERE ${w}`, ...params),
    all<Activity>(
      `SELECT l.*, u.name AS user_name FROM activity_log l LEFT JOIN users u ON u.id = l.user_id WHERE ${w} ORDER BY l.id DESC LIMIT ? OFFSET ?`,
      ...params,
      perPage,
      (page - 1) * perPage,
    ),
  ]);
  const total = countRow!.n;
  return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function activityEntities(): Promise<string[]> {
  return (await all<{ entity: string }>('SELECT DISTINCT entity FROM activity_log ORDER BY entity')).map((r) => r.entity);
}

export async function unreadMessageCount(): Promise<number> {
  return (await get<{ n: number }>('SELECT COUNT(*) AS n FROM messages WHERE read = 0'))!.n;
}

export async function messagesPage(opts: { unread?: boolean; q?: string; page?: number; perPage?: number }) {
  const where: string[] = ['1=1'];
  const params: Param[] = [];
  if (opts.unread) where.push('read = 0');
  if (opts.q) {
    where.push('(name LIKE ? OR email LIKE ? OR subject LIKE ? OR body LIKE ?)');
    const t = `%${opts.q}%`;
    params.push(t, t, t, t);
  }
  const w = where.join(' AND ');
  const perPage = opts.perPage ?? 25;
  const page = Math.max(1, opts.page ?? 1);
  const [countRow, items] = await Promise.all([
    get<{ n: number }>(`SELECT COUNT(*) AS n FROM messages WHERE ${w}`, ...params),
    all<Message>(`SELECT * FROM messages WHERE ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`, ...params, perPage, (page - 1) * perPage),
  ]);
  const total = countRow!.n;
  return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export interface QueueItem {
  id: number;
  title: string;
  status: ArticleStatus;
  updated_at: string;
  published_at: string | null;
  views: number;
  section_name: string | null;
  creator_name: string | null;
}

const QUEUE_BASE = `SELECT a.id, a.title, a.status, a.updated_at, a.published_at, a.views, s.name AS section_name, u.name AS creator_name
  FROM articles a LEFT JOIN sections s ON s.id = a.section_id LEFT JOIN users u ON u.id = a.created_by`;

export async function articleQueue(statuses: ArticleStatus[], limit = 8, createdBy?: number): Promise<QueueItem[]> {
  const marks = statuses.map(() => '?').join(',');
  return all<QueueItem>(
    `${QUEUE_BASE} WHERE a.status IN (${marks}) ${createdBy ? 'AND a.created_by = ?' : ''} ORDER BY (a.status = 'review') DESC, a.updated_at DESC LIMIT ?`,
    ...statuses,
    ...(createdBy ? [createdBy] : []),
    limit,
  );
}

export async function scheduledArticles(limit = 8): Promise<QueueItem[]> {
  return all<QueueItem>(`${QUEUE_BASE} WHERE a.published_at > ? AND a.status IN ('scheduled','published') ORDER BY a.published_at ASC LIMIT ?`, nowIso(), limit);
}

export async function topArticles(limit = 8, days = 30): Promise<(QueueItem & { recent: number })[]> {
  const since = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10);
  return all<QueueItem & { recent: number }>(
    `SELECT a.id, a.title, a.status, a.updated_at, a.published_at, a.views, s.name AS section_name, NULL AS creator_name,
       COALESCE((SELECT SUM(count) FROM article_views v WHERE v.article_id = a.id AND v.day >= ?), 0) AS recent
     FROM articles a LEFT JOIN sections s ON s.id = a.section_id
     WHERE a.status IN ('published','scheduled') AND a.published_at <= ?
     ORDER BY recent DESC, a.views DESC LIMIT ?`,
    since,
    nowIso(),
    limit,
  );
}

/** Tags with counts across all article statuses (admin view). */
export async function adminTags(q?: string): Promise<(Tag & { total_count: number })[]> {
  return all<Tag & { total_count: number }>(
    `SELECT t.*, (SELECT COUNT(*) FROM article_tags at WHERE at.tag_id = t.id) AS total_count,
       (SELECT COUNT(*) FROM article_tags at JOIN articles a ON a.id = at.article_id
        WHERE at.tag_id = t.id AND a.status IN ('published','scheduled') AND a.published_at <= ?) AS article_count
     FROM tags t ${q ? 'WHERE t.name LIKE ? OR t.slug LIKE ?' : ''} ORDER BY t.name COLLATE NOCASE`,
    nowIso(),
    ...(q ? [`%${q}%`, `%${q}%`] : []),
  );
}

export async function tagNames(): Promise<string[]> {
  return (await all<{ name: string }>('SELECT name FROM tags ORDER BY name COLLATE NOCASE')).map((r) => r.name);
}

export async function mediaPage(opts: { q?: string; kind?: string; page?: number; perPage?: number }) {
  const where: string[] = ['1=1'];
  const params: Param[] = [];
  if (opts.q) {
    where.push('(original_name LIKE ? OR alt LIKE ? OR credit LIKE ?)');
    const t = `%${opts.q}%`;
    params.push(t, t, t);
  }
  if (opts.kind === 'image' || opts.kind === 'video' || opts.kind === 'audio') {
    where.push('mime LIKE ?');
    params.push(`${opts.kind}/%`);
  } else if (opts.kind === 'document') {
    where.push("mime NOT LIKE 'image/%' AND mime NOT LIKE 'video/%' AND mime NOT LIKE 'audio/%'");
  }
  const w = where.join(' AND ');
  const perPage = opts.perPage ?? 60;
  const page = Math.max(1, opts.page ?? 1);
  const [countRow, items] = await Promise.all([
    get<{ n: number }>(`SELECT COUNT(*) AS n FROM media WHERE ${w}`, ...params),
    all<Media>(`SELECT * FROM media WHERE ${w} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, ...params, perPage, (page - 1) * perPage),
  ]);
  const total = countRow!.n;
  return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

/**
 * How many records reference a media URL. Covers every field the admin can fill from the media library:
 * article heroes and bodies, issue covers, author photos, video files/thumbnails, podcast covers, episode
 * images/audio, section heroes, newsletter images, page bodies, user avatars and any settings value
 * (logoImage, seo.ogImage …, stored as JSON).
 */
export async function mediaUsage(url: string): Promise<number> {
  if (!url) return 0;
  return (await get<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM articles WHERE hero_image = ?1 OR instr(body, ?1) > 0)
          + (SELECT COUNT(*) FROM authors WHERE photo = ?1)
          + (SELECT COUNT(*) FROM issues WHERE cover_image = ?1)
          + (SELECT COUNT(*) FROM videos WHERE thumbnail = ?1 OR video_url = ?1)
          + (SELECT COUNT(*) FROM podcasts WHERE cover_image = ?1)
          + (SELECT COUNT(*) FROM episodes WHERE image = ?1 OR audio_url = ?1)
          + (SELECT COUNT(*) FROM sections WHERE hero_image = ?1)
          + (SELECT COUNT(*) FROM newsletters WHERE image = ?1)
          + (SELECT COUNT(*) FROM pages WHERE instr(body, ?1) > 0)
          + (SELECT COUNT(*) FROM users WHERE avatar = ?1)
          + (SELECT COUNT(*) FROM settings WHERE instr(value, ?1) > 0) AS n`,
    url,
  ))!.n;
}

export async function allSubscribers(newsletterId?: number, q?: string): Promise<Subscriber[]> {
  const where: string[] = ['1=1'];
  const params: Param[] = [];
  if (newsletterId) {
    where.push('ns.newsletter_id = ?');
    params.push(newsletterId);
  }
  if (q) {
    where.push('ns.email LIKE ?');
    params.push(`%${q}%`);
  }
  return all<Subscriber>(
    `SELECT ns.*, n.name AS newsletter_name FROM newsletter_subscribers ns JOIN newsletters n ON n.id = ns.newsletter_id
     WHERE ${where.join(' AND ')} ORDER BY ns.created_at DESC`,
    ...params,
  );
}

export async function articleOwner(id: number): Promise<{ id: number; created_by: number | null; status: ArticleStatus; title: string; slug: string } | null> {
  return (await get<{ id: number; created_by: number | null; status: ArticleStatus; title: string; slug: string }>('SELECT id, created_by, status, title, slug FROM articles WHERE id = ?', id)) ?? null;
}

export async function userPasswordHash(id: number): Promise<string | null> {
  return (await get<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', id))?.password_hash ?? null;
}

export async function adminCount(): Promise<number> {
  return (await get<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1"))!.n;
}

export async function subscriptionCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = { all: 0, pending: 0, active: 0, cancelled: 0 };
  for (const r of await all<{ status: string; n: number }>('SELECT status, COUNT(*) AS n FROM subscriptions GROUP BY status')) {
    out[r.status] = r.n;
    out.all += r.n;
  }
  return out;
}

export async function episodeCountsByPodcast(): Promise<Record<number, number>> {
  const out: Record<number, number> = {};
  for (const r of await all<{ podcast_id: number; n: number }>('SELECT podcast_id, COUNT(*) AS n FROM episodes GROUP BY podcast_id')) out[r.podcast_id] = r.n;
  return out;
}

export async function sectionArticleTotals(): Promise<Record<number, number>> {
  const out: Record<number, number> = {};
  for (const r of await all<{ section_id: number; n: number }>('SELECT section_id, COUNT(*) AS n FROM articles WHERE section_id IS NOT NULL GROUP BY section_id')) out[r.section_id] = r.n;
  return out;
}

export async function authorArticleTotals(): Promise<Record<number, number>> {
  const out: Record<number, number> = {};
  for (const r of await all<{ author_id: number; n: number }>('SELECT author_id, COUNT(*) AS n FROM article_authors GROUP BY author_id')) out[r.author_id] = r.n;
  return out;
}

/** Persist an explicit ordering (position = index) for sortable tables. */
export async function setPositions(table: 'sections' | 'authors' | 'podcasts' | 'newsletters' | 'plans', orderedIds: number[]): Promise<void> {
  await batch(orderedIds.map((id, i) => ({ sql: `UPDATE ${table} SET position = ? WHERE id = ?`, args: [i, id] })));
}

/** Move one row up/down within an ordered table; returns false if it can't move. */
export async function moveRow(table: 'sections' | 'authors' | 'podcasts' | 'newsletters' | 'plans', id: number, dir: -1 | 1): Promise<boolean> {
  const order = table === 'plans' ? 'position, id' : table === 'podcasts' ? 'position, title' : 'position, name';
  const list = (await all<{ id: number }>(`SELECT id FROM ${table} ORDER BY ${order}`)).map((r) => r.id);
  const i = list.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return false;
  [list[i], list[j]] = [list[j]!, list[i]!];
  await setPositions(table, list);
  return true;
}

export async function nextPosition(table: 'sections' | 'authors' | 'podcasts' | 'newsletters' | 'plans'): Promise<number> {
  return ((await get<{ n: number | null }>(`SELECT MAX(position) AS n FROM ${table}`))?.n ?? -1) + 1;
}

