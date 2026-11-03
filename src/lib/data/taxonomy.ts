import 'server-only';
import { all, get, run, batch, deleteRow, nowIso, type Stmt } from '../db';
import { getSettings, saveSettings } from '../settings';
import type { Author, Section, Tag } from '../types';
import { uniqueSlug } from './articles';

const PUB = `a.status IN ('published','scheduled') AND a.published_at IS NOT NULL AND a.published_at <= ?`;

/* ---------------- links to sections & tags ---------------- */

type RefKind = 'section' | 'tag';
const basePath = (kind: RefKind, slug: string) => (kind === 'section' ? `/${slug}` : `/tag/${slug}`);

/** The part of `url` after `base` when it points at `base` (or a sub-path / query / hash of it), else null. */
function urlRest(url: string, base: string): string | null {
  if (url === base) return '';
  if (url.startsWith(base) && '/?#'.includes(url[base.length]!)) return url.slice(base.length);
  return null;
}

/**
 * Keep menus and homepage blocks pointing at a section or tag after its slug changes (`to` = new slug)
 * or it is deleted (`to` = null). On rename, nav_items URLs and block refs are rewritten; on delete, nav
 * items that link to it and homepage blocks built on it are removed.
 *
 * navRefStatements() returns the nav_items writes so callers can batch them with their own change;
 * retargetRefs() applies those and then updates the homepage blocks.
 */
async function navRefStatements(kind: RefKind, from: string, to: string | null): Promise<Stmt[]> {
  if (!from || from === to) return [];
  const base = basePath(kind, from);
  const stmts: Stmt[] = [];
  for (const n of await all<{ id: number; url: string }>('SELECT id, url FROM nav_items')) {
    const rest = urlRest(n.url, base);
    if (rest === null) continue;
    if (to === null) stmts.push({ sql: 'DELETE FROM nav_items WHERE id = ?', args: [n.id] });
    else stmts.push({ sql: 'UPDATE nav_items SET url = ? WHERE id = ?', args: [basePath(kind, to) + rest, n.id] });
  }
  return stmts;
}

async function retargetHomepage(kind: RefKind, from: string, to: string | null) {
  if (!from || from === to) return;
  const hp = (await getSettings()).homepage;
  if (!hp.blocks.some((b) => b.type === kind && b.ref === from)) return;
  const blocks =
    to === null
      ? hp.blocks.filter((b) => !(b.type === kind && b.ref === from))
      : hp.blocks.map((b) => (b.type === kind && b.ref === from ? { ...b, ref: to } : b));
  await saveSettings({ homepage: { ...hp, blocks } });
}

async function retargetRefs(kind: RefKind, from: string, to: string | null) {
  await batch(await navRefStatements(kind, from, to));
  await retargetHomepage(kind, from, to);
}

/* ---------------- sections ---------------- */

export async function listSections(navOnly = false): Promise<Section[]> {
  return all<Section>(
    `SELECT s.*, (SELECT COUNT(*) FROM articles a WHERE a.section_id = s.id AND ${PUB}) AS article_count
     FROM sections s ${navOnly ? 'WHERE s.in_nav = 1' : ''} ORDER BY s.position, s.name`,
    nowIso(),
  );
}

export async function getSection(slug: string): Promise<Section | null> {
  return (await get<Section>('SELECT * FROM sections WHERE slug = ?', slug)) ?? null;
}

export async function getSectionById(id: number): Promise<Section | null> {
  return (await get<Section>('SELECT * FROM sections WHERE id = ?', id)) ?? null;
}

export type SectionInput = Omit<Section, 'id' | 'created_at' | 'article_count' | 'slug'> & { slug?: string };

export async function saveSection(input: SectionInput, id?: number): Promise<number> {
  const slug = await uniqueSlug('sections', input.slug || input.name, id);
  const vals = [input.name, slug, input.description, input.color, input.position, input.in_nav, input.hero_image, input.seo_title, input.seo_description] as const;
  if (id) {
    const old = (await getSectionById(id))?.slug;
    await batch([
      { sql: 'UPDATE sections SET name=?, slug=?, description=?, color=?, position=?, in_nav=?, hero_image=?, seo_title=?, seo_description=? WHERE id=?', args: [...vals, id] },
      ...(old ? await navRefStatements('section', old, slug) : []),
    ]);
    if (old) await retargetHomepage('section', old, slug);
    return id;
  }
  return (await run('INSERT INTO sections (name, slug, description, color, position, in_nav, hero_image, seo_title, seo_description) VALUES (?,?,?,?,?,?,?,?,?)', ...vals)).lastId;
}

export async function deleteSection(id: number): Promise<void> {
  const old = (await getSectionById(id))?.slug;
  await deleteRow('sections', id);
  if (old) await retargetRefs('section', old, null);
}

/* ---------------- tags ---------------- */

export async function listTags(): Promise<Tag[]> {
  return all<Tag>(
    `SELECT t.*, (SELECT COUNT(*) FROM article_tags at JOIN articles a ON a.id = at.article_id WHERE at.tag_id = t.id AND ${PUB}) AS article_count
     FROM tags t ORDER BY t.name COLLATE NOCASE`,
    nowIso(),
  );
}

export async function popularTags(limit = 20): Promise<Tag[]> {
  return (await listTags())
    .filter((t) => (t.article_count ?? 0) > 0)
    .sort((a, b) => (b.article_count ?? 0) - (a.article_count ?? 0))
    .slice(0, limit);
}

export async function getTag(slug: string): Promise<Tag | null> {
  return (await get<Tag>('SELECT * FROM tags WHERE slug = ?', slug)) ?? null;
}

const tagSlug = async (id: number) => (await get<{ slug: string }>('SELECT slug FROM tags WHERE id = ?', id))?.slug;

export async function saveTag(input: { name: string; slug?: string; description?: string }, id?: number): Promise<number> {
  const slug = await uniqueSlug('tags', input.slug || input.name, id);
  if (id) {
    const old = await tagSlug(id);
    await batch([
      { sql: 'UPDATE tags SET name=?, slug=?, description=? WHERE id=?', args: [input.name, slug, input.description ?? '', id] },
      ...(old ? await navRefStatements('tag', old, slug) : []),
    ]);
    if (old) await retargetHomepage('tag', old, slug);
    return id;
  }
  return (await run('INSERT INTO tags (name, slug, description) VALUES (?,?,?)', input.name, slug, input.description ?? '')).lastId;
}

export async function deleteTag(id: number): Promise<void> {
  const old = await tagSlug(id);
  await deleteRow('tags', id);
  if (old) await retargetRefs('tag', old, null);
}

export async function mergeTags(fromId: number, intoId: number): Promise<void> {
  const [from, into] = await Promise.all([tagSlug(fromId), tagSlug(intoId)]);
  await run('INSERT OR IGNORE INTO article_tags (article_id, tag_id) SELECT article_id, ? FROM article_tags WHERE tag_id = ?', intoId, fromId);
  await deleteRow('tags', fromId);
  if (from) await retargetRefs('tag', from, into ?? null);
}

/* ---------------- authors ---------------- */

export async function listAuthors(): Promise<Author[]> {
  return all<Author>(
    `SELECT au.*, (SELECT COUNT(*) FROM article_authors aa JOIN articles a ON a.id = aa.article_id WHERE aa.author_id = au.id AND ${PUB}) AS article_count
     FROM authors au ORDER BY au.position, au.name`,
    nowIso(),
  );
}

export async function getAuthor(slug: string): Promise<Author | null> {
  return (await get<Author>('SELECT * FROM authors WHERE slug = ?', slug)) ?? null;
}

export async function getAuthorById(id: number): Promise<Author | null> {
  return (await get<Author>('SELECT * FROM authors WHERE id = ?', id)) ?? null;
}

export type AuthorInput = Omit<Author, 'id' | 'created_at' | 'article_count' | 'slug'> & { slug?: string };

export async function saveAuthor(input: AuthorInput, id?: number): Promise<number> {
  const slug = await uniqueSlug('authors', input.slug || input.name, id);
  const vals = [
    input.name,
    slug,
    input.title,
    input.bio,
    input.photo,
    input.email,
    input.twitter,
    input.instagram,
    input.website,
    input.on_masthead,
    input.position,
  ] as const;
  if (id) {
    await run('UPDATE authors SET name=?, slug=?, title=?, bio=?, photo=?, email=?, twitter=?, instagram=?, website=?, on_masthead=?, position=? WHERE id=?', ...vals, id);
    return id;
  }
  return (await run('INSERT INTO authors (name, slug, title, bio, photo, email, twitter, instagram, website, on_masthead, position) VALUES (?,?,?,?,?,?,?,?,?,?,?)', ...vals)).lastId;
}

export async function deleteAuthor(id: number): Promise<void> {
  await deleteRow('authors', id);
}

export async function sectionTags(sectionId: number, limit = 8): Promise<Tag[]> {
  return all<Tag>(
    `SELECT t.*, COUNT(*) AS article_count FROM tags t
     JOIN article_tags at ON at.tag_id = t.id JOIN articles a ON a.id = at.article_id
     WHERE a.section_id = ? AND ${PUB} GROUP BY t.id ORDER BY article_count DESC, t.name LIMIT ?`,
    sectionId,
    nowIso(),
    limit,
  );
}
