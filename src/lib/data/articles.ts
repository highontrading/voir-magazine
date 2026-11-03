import 'server-only';
import { all, get, run, batch, deleteRow, nowIso, type Param, type Stmt } from '../db';
import type { Article, ArticleRow, ArticleStatus, Author, Tag } from '../types';
import { clampInt, htmlText, readingTime, slugify } from '../utils';

const BASE = `
  SELECT a.*, s.name AS section_name, s.slug AS section_slug
  FROM articles a
  LEFT JOIN sections s ON s.id = a.section_id
`;

const PUBLIC = `a.status IN ('published','scheduled') AND a.published_at IS NOT NULL AND a.published_at <= ?`;

type Joined = ArticleRow & { section_name: string | null; section_slug: string | null };

async function hydrate(rows: Joined[], withTags = false): Promise<Article[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => '?').join(',');
  const [authors, tags] = await Promise.all([
    all<Author & { article_id: number }>(
      `SELECT aa.article_id, au.id, au.name, au.slug, au.title, au.photo, au.bio
       FROM article_authors aa JOIN authors au ON au.id = aa.author_id
       WHERE aa.article_id IN (${marks}) ORDER BY aa.position`,
      ...ids,
    ),
    withTags
      ? all<Tag & { article_id: number }>(
          `SELECT at.article_id, t.id, t.name, t.slug FROM article_tags at JOIN tags t ON t.id = at.tag_id
           WHERE at.article_id IN (${marks}) ORDER BY t.name`,
          ...ids,
        )
      : Promise.resolve([] as (Tag & { article_id: number })[]),
  ]);
  return rows.map((r) => ({
    ...r,
    authors: authors
      .filter((a) => a.article_id === r.id)
      .map(({ id, name, slug, title, photo, bio }) => ({ id, name, slug, title, photo, bio })),
    tags: withTags ? tags.filter((t) => t.article_id === r.id).map(({ id, name, slug }) => ({ id, name, slug })) : undefined,
  }));
}

export interface ArticleQuery {
  section?: string;
  sectionId?: number;
  tag?: string;
  author?: string;
  issueId?: number;
  type?: string;
  flag?: 'featured' | 'top_story' | 'editors_pick';
  exclude?: number[];
  limit?: number;
  offset?: number;
  order?: 'recent' | 'popular';
}

function buildWhere(q: ArticleQuery): { where: string; params: Param[] } {
  const parts = [PUBLIC];
  const params: Param[] = [nowIso()];
  if (q.section) {
    parts.push('s.slug = ?');
    params.push(q.section);
  }
  if (q.sectionId) {
    parts.push('a.section_id = ?');
    params.push(q.sectionId);
  }
  if (q.tag) {
    parts.push('a.id IN (SELECT at.article_id FROM article_tags at JOIN tags t ON t.id = at.tag_id WHERE t.slug = ?)');
    params.push(q.tag);
  }
  if (q.author) {
    parts.push('a.id IN (SELECT aa.article_id FROM article_authors aa JOIN authors au ON au.id = aa.author_id WHERE au.slug = ?)');
    params.push(q.author);
  }
  if (q.issueId) {
    parts.push('a.issue_id = ?');
    params.push(q.issueId);
  }
  if (q.type) {
    parts.push('a.type = ?');
    params.push(q.type);
  }
  if (q.flag) parts.push(`a.${q.flag} = 1`);
  if (q.exclude?.length) {
    parts.push(`a.id NOT IN (${q.exclude.map(() => '?').join(',')})`);
    params.push(...q.exclude);
  }
  return { where: parts.join(' AND '), params };
}

export async function listPublished(q: ArticleQuery = {}): Promise<Article[]> {
  const { where, params } = buildWhere(q);
  const order = q.order === 'popular' ? 'a.views DESC, a.published_at DESC' : 'a.published_at DESC';
  const limit = clampInt(q.limit, 12, 0, 5000); // sitemap.ts asks for up to 5000
  const offset = clampInt(q.offset, 0, 0, 1_000_000);
  const rows = await all<Joined>(`${BASE} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, limit, offset);
  return hydrate(rows);
}

export async function countPublished(q: ArticleQuery = {}): Promise<number> {
  const { where, params } = buildWhere(q);
  return (await get<{ n: number }>(`SELECT COUNT(*) AS n FROM articles a LEFT JOIN sections s ON s.id = a.section_id WHERE ${where}`, ...params))!.n;
}

export async function getPublishedBySlug(slug: string): Promise<Article | null> {
  const row = await get<Joined>(`${BASE} WHERE a.slug = ? AND ${PUBLIC}`, slug, nowIso());
  return row ? (await hydrate([row], true))[0]! : null;
}

export async function getArticleBySlugAny(slug: string): Promise<Article | null> {
  const row = await get<Joined>(`${BASE} WHERE a.slug = ?`, slug);
  return row ? (await hydrate([row], true))[0]! : null;
}

export async function getArticleById(id: number): Promise<Article | null> {
  const row = await get<Joined>(`${BASE} WHERE a.id = ?`, id);
  return row ? (await hydrate([row], true))[0]! : null;
}

export async function getArticlesByIds(ids: number[], publicOnly = true): Promise<Article[]> {
  if (!ids.length) return [];
  const marks = ids.map(() => '?').join(',');
  const rows = await (publicOnly
    ? all<Joined>(`${BASE} WHERE a.id IN (${marks}) AND ${PUBLIC}`, ...ids, nowIso())
    : all<Joined>(`${BASE} WHERE a.id IN (${marks})`, ...ids));
  const list = await hydrate(rows);
  return ids.map((id) => list.find((a) => a.id === id)).filter(Boolean) as Article[];
}

/** Most read stories, weighting recent daily views when available. */
export async function mostPopular(limit = 5, days = 30, exclude: number[] = []): Promise<Article[]> {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const ex = exclude.length ? `AND a.id NOT IN (${exclude.map(() => '?').join(',')})` : '';
  const rows = await all<Joined>(
    `${BASE}
     LEFT JOIN (SELECT article_id, SUM(count) AS recent FROM article_views WHERE day >= ? GROUP BY article_id) v ON v.article_id = a.id
     WHERE ${PUBLIC} ${ex}
     ORDER BY COALESCE(v.recent, 0) * 3 + a.views DESC, a.published_at DESC LIMIT ?`,
    since,
    nowIso(),
    ...exclude,
    limit,
  );
  return hydrate(rows);
}

export async function relatedArticles(article: Article, limit = 4): Promise<Article[]> {
  const tagIds = (article.tags ?? []).map((t) => t.id);
  const rows = await all<Joined & { score: number }>(
    `${BASE}
     LEFT JOIN (SELECT article_id, COUNT(*) AS shared FROM article_tags WHERE tag_id IN (${tagIds.length ? tagIds.map(() => '?').join(',') : 'NULL'}) GROUP BY article_id) t ON t.article_id = a.id
     WHERE ${PUBLIC} AND a.id != ?
     ORDER BY COALESCE(t.shared, 0) * 2 + (CASE WHEN a.section_id = ? THEN 1 ELSE 0 END) DESC, a.published_at DESC
     LIMIT ?`,
    ...tagIds,
    nowIso(),
    article.id,
    article.section_id ?? 0,
    limit,
  );
  return hydrate(rows);
}

/** Escape LIKE wildcards; use with `ESCAPE '\\'`. */
function likeTerm(q: string): string {
  return `%${q.replace(/[\\%_]/g, '\\$&')}%`;
}

export async function searchArticles(q: string, limit = 20, offset = 0): Promise<{ items: Article[]; total: number }> {
  const query = q.trim();
  if (!query) return { items: [], total: 0 };
  const now = nowIso();
  const term = likeTerm(query);
  const L = `LIKE ? ESCAPE '\\'`;
  const where = `${PUBLIC} AND (a.title ${L} OR a.dek ${L} OR a.rubric ${L}
    OR a.id IN (SELECT at.article_id FROM article_tags at JOIN tags t ON t.id = at.tag_id WHERE t.name ${L})
    OR a.id IN (SELECT aa.article_id FROM article_authors aa JOIN authors au ON au.id = aa.author_id WHERE au.name ${L})
    OR a.body_text ${L})`;
  const params: Param[] = [now, term, term, term, term, term, term];
  const [count, rows] = await Promise.all([
    get<{ n: number }>(`SELECT COUNT(*) AS n FROM articles a LEFT JOIN sections s ON s.id = a.section_id WHERE ${where}`, ...params),
    all<Joined>(
      `${BASE} WHERE ${where} ORDER BY (CASE WHEN a.title ${L} THEN 0 ELSE 1 END), a.published_at DESC LIMIT ? OFFSET ?`,
      ...params,
      term,
      clampInt(limit, 20, 0, 100),
      clampInt(offset, 0, 0, 1_000_000),
    ),
  ]);
  return { items: await hydrate(rows), total: count!.n };
}

/** Count a read of a live (published, visible) article. Returns false when the article is not public. */
export async function recordView(id: number): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const { changes } = await run(`UPDATE articles SET views = views + 1 WHERE id = ? AND id IN (SELECT a.id FROM articles a WHERE ${PUBLIC})`, id, nowIso());
  if (!changes) return false;
  await run(
    'INSERT INTO article_views (article_id, day, count) VALUES (?, ?, 1) ON CONFLICT(article_id, day) DO UPDATE SET count = count + 1',
    id,
    day,
  );
  return true;
}

/** Flip scheduled stories whose go-live time has passed to "published" so admin filters and pills match the site. */
export async function promoteDueScheduled(): Promise<void> {
  await run("UPDATE articles SET status = 'published' WHERE status = 'scheduled' AND published_at IS NOT NULL AND published_at <= ?", nowIso());
}

/* ------------------------------ admin ------------------------------ */

export interface AdminArticleQuery {
  q?: string;
  status?: string;
  section?: number;
  author?: number;
  createdBy?: number;
  page?: number;
  perPage?: number;
  sort?: 'updated' | 'published' | 'views' | 'title';
}

export async function adminListArticles(q: AdminArticleQuery) {
  await promoteDueScheduled();
  const parts: string[] = ['1=1'];
  const params: Param[] = [];
  if (q.q) {
    parts.push('(a.title LIKE ? OR a.slug LIKE ? OR a.dek LIKE ?)');
    const t = `%${q.q}%`;
    params.push(t, t, t);
  }
  if (q.status) {
    parts.push('a.status = ?');
    params.push(q.status);
  }
  if (q.section) {
    parts.push('a.section_id = ?');
    params.push(q.section);
  }
  if (q.author) {
    parts.push('a.id IN (SELECT article_id FROM article_authors WHERE author_id = ?)');
    params.push(q.author);
  }
  if (q.createdBy) {
    parts.push('a.created_by = ?');
    params.push(q.createdBy);
  }
  const where = parts.join(' AND ');
  const perPage = clampInt(q.perPage, 20, 1, 200);
  const page = clampInt(q.page, 1, 1, 100_000);
  const order =
    q.sort === 'published'
      ? 'a.published_at DESC'
      : q.sort === 'views'
        ? 'a.views DESC'
        : q.sort === 'title'
          ? 'a.title COLLATE NOCASE ASC'
          : 'a.updated_at DESC';
  const [count, rows] = await Promise.all([
    get<{ n: number }>(`SELECT COUNT(*) AS n FROM articles a WHERE ${where}`, ...params),
    all<Joined>(`${BASE} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, perPage, (page - 1) * perPage),
  ]);
  const total = count!.n;
  return { items: await hydrate(rows), total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function statusCounts(createdBy?: number): Promise<Record<ArticleStatus | 'all', number>> {
  await promoteDueScheduled();
  const rows = await (createdBy
    ? all<{ status: ArticleStatus; n: number }>('SELECT status, COUNT(*) AS n FROM articles WHERE created_by = ? GROUP BY status', createdBy)
    : all<{ status: ArticleStatus; n: number }>('SELECT status, COUNT(*) AS n FROM articles GROUP BY status'));
  const out = { all: 0, draft: 0, review: 0, published: 0, scheduled: 0, archived: 0 };
  for (const r of rows) {
    out[r.status] = r.n;
    out.all += r.n;
  }
  return out;
}

export interface ArticleInput {
  title: string;
  slug?: string;
  dek?: string;
  rubric?: string;
  body?: string;
  section_id?: number | null;
  issue_id?: number | null;
  type?: string;
  hero_image?: string;
  hero_caption?: string;
  hero_credit?: string;
  hero_layout?: string;
  status?: ArticleStatus;
  published_at?: string | null;
  featured?: boolean;
  top_story?: boolean;
  editors_pick?: boolean;
  allow_index?: boolean;
  seo_title?: string;
  seo_description?: string;
  authorIds?: number[];
  tagNames?: string[];
  views?: number;
}

export async function uniqueSlug(table: 'articles' | 'videos' | 'pages' | 'issues' | 'authors' | 'sections' | 'tags' | 'podcasts' | 'newsletters', base: string, ignoreId?: number): Promise<string> {
  const root = slugify(base) || 'untitled';
  let slug = root;
  let i = 2;
  while (await get<{ id: number }>(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`, slug, ignoreId ?? 0)) {
    slug = `${root}-${i++}`;
  }
  return slug;
}

/** Slug base for a tag; names with no Latin letters or digits (e.g. "東京") get a stable hashed slug. */
function tagSlugBase(name: string): string {
  const s = slugify(name);
  if (s) return s;
  let h = 0x811c9dc5;
  for (const ch of name.normalize('NFC')) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `tag-${h.toString(36)}`;
}

export async function ensureTags(names: string[]): Promise<number[]> {
  // Repair tags stored with an empty slug by older versions (their /tag/ URL was unreachable).
  for (const t of await all<{ id: number; name: string }>("SELECT id, name FROM tags WHERE slug = ''")) {
    await run('UPDATE tags SET slug = ? WHERE id = ?', await uniqueSlug('tags', tagSlugBase(t.name), t.id), t.id);
  }
  const ids: number[] = [];
  for (const raw of names) {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name) continue;
    // Match an existing tag by name (case-insensitive); never by slug, so distinct names stay distinct.
    const existing =
      (await get<{ id: number }>('SELECT id FROM tags WHERE name = ?', name)) ??
      (await get<{ id: number }>('SELECT id FROM tags WHERE lower(name) = lower(?) ORDER BY id LIMIT 1', name));
    ids.push(existing ? existing.id : (await run('INSERT INTO tags (name, slug) VALUES (?, ?)', name, await uniqueSlug('tags', tagSlugBase(name)))).lastId);
  }
  return [...new Set(ids)];
}

export async function saveArticle(input: ArticleInput, id?: number, userId?: number): Promise<number> {
  const status = input.status ?? 'draft';
  let publishedAt = input.published_at ?? null;
  if ((status === 'published' || status === 'scheduled') && !publishedAt) publishedAt = nowIso();
  const slug = await uniqueSlug('articles', input.slug || input.title, id);
  const tagIds = input.tagNames ? await ensureTags(input.tagNames) : null;
  const values: Param[] = [
    input.title.trim(),
    slug,
    input.dek ?? '',
    input.rubric ?? '',
    input.body ?? '',
    input.section_id ?? null,
    input.issue_id ?? null,
    input.type ?? 'story',
    input.hero_image ?? '',
    input.hero_caption ?? '',
    input.hero_credit ?? '',
    input.hero_layout ?? 'standard',
    status,
    publishedAt,
    input.featured ? 1 : 0,
    input.top_story ? 1 : 0,
    input.editors_pick ? 1 : 0,
    input.allow_index === false ? 0 : 1,
    readingTime(input.body ?? ''),
    input.seo_title ?? '',
    input.seo_description ?? '',
  ];
  // Author / tag links are rewritten in one atomic batch (with the UPDATE when editing).
  const links = (articleId: number): Stmt[] => [
    { sql: 'UPDATE articles SET body_text = ? WHERE id = ?', args: [htmlText(input.body ?? ''), articleId] },
    ...(input.authorIds
      ? [
          { sql: 'DELETE FROM article_authors WHERE article_id = ?', args: [articleId] },
          ...input.authorIds.map((aid, i) => ({ sql: 'INSERT OR IGNORE INTO article_authors (article_id, author_id, position) VALUES (?, ?, ?)', args: [articleId, aid, i] })),
        ]
      : []),
    ...(tagIds
      ? [
          { sql: 'DELETE FROM article_tags WHERE article_id = ?', args: [articleId] },
          ...tagIds.map((tid) => ({ sql: 'INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)', args: [articleId, tid] })),
        ]
      : []),
  ];
  if (id) {
    await batch([
      {
        sql: `UPDATE articles SET title=?, slug=?, dek=?, rubric=?, body=?, section_id=?, issue_id=?, type=?, hero_image=?, hero_caption=?,
         hero_credit=?, hero_layout=?, status=?, published_at=?, featured=?, top_story=?, editors_pick=?, allow_index=?, reading_time=?,
         seo_title=?, seo_description=?, updated_at=? WHERE id=?`,
        args: [...values, nowIso(), id],
      },
      ...links(id),
    ]);
    return id;
  }
  const articleId = (
    await run(
      `INSERT INTO articles (title, slug, dek, rubric, body, section_id, issue_id, type, hero_image, hero_caption, hero_credit,
       hero_layout, status, published_at, featured, top_story, editors_pick, allow_index, reading_time, seo_title, seo_description,
       created_by, views, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ...values,
      userId ?? null,
      input.views ?? 0,
      publishedAt ?? nowIso(),
      nowIso(),
    )
  ).lastId;
  try {
    await batch(links(articleId));
  } catch (e) {
    // Keep creation all-or-nothing: drop the half-created story if its links could not be written.
    await deleteRow('articles', articleId).catch(() => {});
    throw e;
  }
  return articleId;
}

export async function setArticleStatus(ids: number[], status: ArticleStatus): Promise<void> {
  const now = nowIso();
  // "published" means live now: a missing or future date is moved to the present.
  // "scheduled" keeps an existing date (or gets one if missing).
  await batch(
    ids.map((id) => ({
      sql: `UPDATE articles SET status = ?, published_at = CASE
         WHEN ? = 'published' AND (published_at IS NULL OR published_at > ?) THEN ?
         WHEN ? = 'scheduled' AND published_at IS NULL THEN ?
         ELSE published_at END,
       updated_at = ? WHERE id = ?`,
      args: [status, status, now, now, status, now, now, id],
    })),
  );
}

export async function deleteArticles(ids: number[]): Promise<void> {
  for (const id of ids) await deleteRow('articles', id);
}

export async function duplicateArticle(id: number, userId?: number): Promise<number | null> {
  const a = await getArticleById(id);
  if (!a) return null;
  return saveArticle(
    {
      ...a,
      views: 0,
      title: `${a.title} (Copy)`,
      slug: `${a.slug}-copy`,
      status: 'draft',
      published_at: null,
      featured: false,
      top_story: false,
      editors_pick: false,
      allow_index: !!a.allow_index,
      authorIds: a.authors.map((x) => x.id),
      tagNames: (a.tags ?? []).map((t) => t.name),
    },
    undefined,
    userId,
  );
}

/** Lightweight list for pickers (homepage builder, issue cover story, etc.) */
export type ArticleOption = { id: number; title: string; section_name: string | null; published_at: string | null; status: string };

export async function articleOptions(publicOnly = false): Promise<ArticleOption[]> {
  return all<ArticleOption>(
    `SELECT a.id, a.title, s.name AS section_name, a.published_at, a.status FROM articles a LEFT JOIN sections s ON s.id = a.section_id
     ${publicOnly ? `WHERE ${PUBLIC}` : ''} ORDER BY COALESCE(a.published_at, a.created_at) DESC`,
    ...(publicOnly ? [nowIso()] : []),
  );
}

export async function viewsByDay(days = 30): Promise<{ day: string; views: number }[]> {
  const since = new Date(Date.now() - (days - 1) * 864e5);
  const rows = await all<{ day: string; views: number }>(
    'SELECT day, SUM(count) AS views FROM article_views WHERE day >= ? GROUP BY day ORDER BY day',
    since.toISOString().slice(0, 10),
  );
  const out: { day: string; views: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 864e5).toISOString().slice(0, 10);
    out.push({ day: d, views: rows.find((r) => r.day === d)?.views ?? 0 });
  }
  return out;
}
