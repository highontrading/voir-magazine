import 'server-only';
import { all, get, run, tx, nowIso, type Param } from '../db';
import type { Article, ArticleRow, ArticleStatus, Author, Tag } from '../types';
import { readingTime, slugify } from '../utils';

const BASE = `
  SELECT a.*, s.name AS section_name, s.slug AS section_slug
  FROM articles a
  LEFT JOIN sections s ON s.id = a.section_id
`;

const PUBLIC = `a.status IN ('published','scheduled') AND a.published_at IS NOT NULL AND a.published_at <= ?`;

type Joined = ArticleRow & { section_name: string | null; section_slug: string | null };

function hydrate(rows: Joined[], withTags = false): Article[] {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => '?').join(',');
  const authors = all<Author & { article_id: number }>(
    `SELECT aa.article_id, au.id, au.name, au.slug, au.title, au.photo, au.bio
     FROM article_authors aa JOIN authors au ON au.id = aa.author_id
     WHERE aa.article_id IN (${marks}) ORDER BY aa.position`,
    ...ids,
  );
  const tags = withTags
    ? all<Tag & { article_id: number }>(
        `SELECT at.article_id, t.id, t.name, t.slug FROM article_tags at JOIN tags t ON t.id = at.tag_id
         WHERE at.article_id IN (${marks}) ORDER BY t.name`,
        ...ids,
      )
    : [];
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

export function listPublished(q: ArticleQuery = {}): Article[] {
  const { where, params } = buildWhere(q);
  const order = q.order === 'popular' ? 'a.views DESC, a.published_at DESC' : 'a.published_at DESC';
  const rows = all<Joined>(`${BASE} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, q.limit ?? 12, q.offset ?? 0);
  return hydrate(rows);
}

export function countPublished(q: ArticleQuery = {}): number {
  const { where, params } = buildWhere(q);
  return get<{ n: number }>(`SELECT COUNT(*) AS n FROM articles a LEFT JOIN sections s ON s.id = a.section_id WHERE ${where}`, ...params)!.n;
}

export function getPublishedBySlug(slug: string): Article | null {
  const row = get<Joined>(`${BASE} WHERE a.slug = ? AND ${PUBLIC}`, slug, nowIso());
  return row ? hydrate([row], true)[0]! : null;
}

export function getArticleBySlugAny(slug: string): Article | null {
  const row = get<Joined>(`${BASE} WHERE a.slug = ?`, slug);
  return row ? hydrate([row], true)[0]! : null;
}

export function getArticleById(id: number): Article | null {
  const row = get<Joined>(`${BASE} WHERE a.id = ?`, id);
  return row ? hydrate([row], true)[0]! : null;
}

export function getArticlesByIds(ids: number[], publicOnly = true): Article[] {
  if (!ids.length) return [];
  const marks = ids.map(() => '?').join(',');
  const rows = publicOnly
    ? all<Joined>(`${BASE} WHERE a.id IN (${marks}) AND ${PUBLIC}`, ...ids, nowIso())
    : all<Joined>(`${BASE} WHERE a.id IN (${marks})`, ...ids);
  const list = hydrate(rows);
  return ids.map((id) => list.find((a) => a.id === id)).filter(Boolean) as Article[];
}

/** Most read stories, weighting recent daily views when available. */
export function mostPopular(limit = 5, days = 30, exclude: number[] = []): Article[] {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const ex = exclude.length ? `AND a.id NOT IN (${exclude.map(() => '?').join(',')})` : '';
  const rows = all<Joined>(
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

export function relatedArticles(article: Article, limit = 4): Article[] {
  const tagIds = (article.tags ?? []).map((t) => t.id);
  const rows = all<Joined & { score: number }>(
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

export function searchArticles(q: string, limit = 20, offset = 0): { items: Article[]; total: number } {
  const term = `%${q.trim().replace(/[%_]/g, '')}%`;
  const where = `${PUBLIC} AND (a.title LIKE ? OR a.dek LIKE ? OR a.body LIKE ? OR a.rubric LIKE ?
    OR a.id IN (SELECT at.article_id FROM article_tags at JOIN tags t ON t.id = at.tag_id WHERE t.name LIKE ?)
    OR a.id IN (SELECT aa.article_id FROM article_authors aa JOIN authors au ON au.id = aa.author_id WHERE au.name LIKE ?))`;
  const params: Param[] = [nowIso(), term, term, term, term, term, term];
  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM articles a LEFT JOIN sections s ON s.id = a.section_id WHERE ${where}`, ...params)!.n;
  const rows = all<Joined>(
    `${BASE} WHERE ${where} ORDER BY (CASE WHEN a.title LIKE ? THEN 0 ELSE 1 END), a.published_at DESC LIMIT ? OFFSET ?`,
    ...params,
    term,
    limit,
    offset,
  );
  return { items: hydrate(rows), total };
}

export function recordView(id: number) {
  const day = new Date().toISOString().slice(0, 10);
  run('UPDATE articles SET views = views + 1 WHERE id = ?', id);
  run(
    'INSERT INTO article_views (article_id, day, count) VALUES (?, ?, 1) ON CONFLICT(article_id, day) DO UPDATE SET count = count + 1',
    id,
    day,
  );
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

export function adminListArticles(q: AdminArticleQuery) {
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
  const perPage = q.perPage ?? 20;
  const page = Math.max(1, q.page ?? 1);
  const order =
    q.sort === 'published'
      ? 'a.published_at DESC'
      : q.sort === 'views'
        ? 'a.views DESC'
        : q.sort === 'title'
          ? 'a.title COLLATE NOCASE ASC'
          : 'a.updated_at DESC';
  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM articles a WHERE ${where}`, ...params)!.n;
  const rows = all<Joined>(`${BASE} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, perPage, (page - 1) * perPage);
  return { items: hydrate(rows), total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export function statusCounts(createdBy?: number): Record<ArticleStatus | 'all', number> {
  const rows = createdBy
    ? all<{ status: ArticleStatus; n: number }>('SELECT status, COUNT(*) AS n FROM articles WHERE created_by = ? GROUP BY status', createdBy)
    : all<{ status: ArticleStatus; n: number }>('SELECT status, COUNT(*) AS n FROM articles GROUP BY status');
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

export function uniqueSlug(table: 'articles' | 'videos' | 'pages' | 'issues' | 'authors' | 'sections' | 'tags' | 'podcasts' | 'newsletters', base: string, ignoreId?: number): string {
  const root = slugify(base) || 'untitled';
  let slug = root;
  let i = 2;
  while (get<{ id: number }>(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`, slug, ignoreId ?? 0)) {
    slug = `${root}-${i++}`;
  }
  return slug;
}

export function ensureTags(names: string[]): number[] {
  const ids: number[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const slug = slugify(name);
    const existing = get<{ id: number }>('SELECT id FROM tags WHERE slug = ?', slug);
    ids.push(existing ? existing.id : run('INSERT INTO tags (name, slug) VALUES (?, ?)', name, slug).lastId);
  }
  return [...new Set(ids)];
}

export function saveArticle(input: ArticleInput, id?: number, userId?: number): number {
  return tx(() => {
    const status = input.status ?? 'draft';
    let publishedAt = input.published_at ?? null;
    if ((status === 'published' || status === 'scheduled') && !publishedAt) publishedAt = nowIso();
    const slug = uniqueSlug('articles', input.slug || input.title, id);
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
    let articleId = id;
    if (id) {
      run(
        `UPDATE articles SET title=?, slug=?, dek=?, rubric=?, body=?, section_id=?, issue_id=?, type=?, hero_image=?, hero_caption=?,
         hero_credit=?, hero_layout=?, status=?, published_at=?, featured=?, top_story=?, editors_pick=?, allow_index=?, reading_time=?,
         seo_title=?, seo_description=?, updated_at=? WHERE id=?`,
        ...values,
        nowIso(),
        id,
      );
    } else {
      articleId = run(
        `INSERT INTO articles (title, slug, dek, rubric, body, section_id, issue_id, type, hero_image, hero_caption, hero_credit,
         hero_layout, status, published_at, featured, top_story, editors_pick, allow_index, reading_time, seo_title, seo_description,
         created_by, views, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        ...values,
        userId ?? null,
        input.views ?? 0,
        publishedAt ?? nowIso(),
        nowIso(),
      ).lastId;
    }
    if (input.authorIds) {
      run('DELETE FROM article_authors WHERE article_id = ?', articleId!);
      input.authorIds.forEach((aid, i) => run('INSERT OR IGNORE INTO article_authors (article_id, author_id, position) VALUES (?, ?, ?)', articleId!, aid, i));
    }
    if (input.tagNames) {
      run('DELETE FROM article_tags WHERE article_id = ?', articleId!);
      for (const tid of ensureTags(input.tagNames)) run('INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)', articleId!, tid);
    }
    return articleId!;
  });
}

export function setArticleStatus(ids: number[], status: ArticleStatus) {
  const now = nowIso();
  for (const id of ids) {
    // "published" means live now: a missing or future date is moved to the present.
    // "scheduled" keeps an existing date (or gets one if missing).
    run(
      `UPDATE articles SET status = ?, published_at = CASE
         WHEN ? = 'published' AND (published_at IS NULL OR published_at > ?) THEN ?
         WHEN ? = 'scheduled' AND published_at IS NULL THEN ?
         ELSE published_at END,
       updated_at = ? WHERE id = ?`,
      status,
      status,
      now,
      now,
      status,
      now,
      now,
      id,
    );
  }
}

export function deleteArticles(ids: number[]) {
  for (const id of ids) run('DELETE FROM articles WHERE id = ?', id);
}

export function duplicateArticle(id: number, userId?: number): number | null {
  const a = getArticleById(id);
  if (!a) return null;
  return saveArticle(
    {
      ...a,
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
export function articleOptions(publicOnly = false): { id: number; title: string; section_name: string | null; published_at: string | null; status: string }[] {
  return all(
    `SELECT a.id, a.title, s.name AS section_name, a.published_at, a.status FROM articles a LEFT JOIN sections s ON s.id = a.section_id
     ${publicOnly ? `WHERE ${PUBLIC}` : ''} ORDER BY COALESCE(a.published_at, a.created_at) DESC`,
    ...(publicOnly ? [nowIso()] : []),
  );
}

export function viewsByDay(days = 30): { day: string; views: number }[] {
  const since = new Date(Date.now() - (days - 1) * 864e5);
  const rows = all<{ day: string; views: number }>(
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
