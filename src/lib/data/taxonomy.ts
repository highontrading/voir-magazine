import 'server-only';
import { all, get, run, nowIso } from '../db';
import type { Author, Section, Tag } from '../types';
import { uniqueSlug } from './articles';

const PUB = `a.status IN ('published','scheduled') AND a.published_at IS NOT NULL AND a.published_at <= ?`;

/* ---------------- sections ---------------- */

export function listSections(navOnly = false): Section[] {
  return all<Section>(
    `SELECT s.*, (SELECT COUNT(*) FROM articles a WHERE a.section_id = s.id AND ${PUB}) AS article_count
     FROM sections s ${navOnly ? 'WHERE s.in_nav = 1' : ''} ORDER BY s.position, s.name`,
    nowIso(),
  );
}

export function getSection(slug: string): Section | null {
  return get<Section>('SELECT * FROM sections WHERE slug = ?', slug) ?? null;
}

export function getSectionById(id: number): Section | null {
  return get<Section>('SELECT * FROM sections WHERE id = ?', id) ?? null;
}

export type SectionInput = Omit<Section, 'id' | 'created_at' | 'article_count' | 'slug'> & { slug?: string };

export function saveSection(input: SectionInput, id?: number): number {
  const slug = uniqueSlug('sections', input.slug || input.name, id);
  const vals = [input.name, slug, input.description, input.color, input.position, input.in_nav, input.hero_image, input.seo_title, input.seo_description] as const;
  if (id) {
    run('UPDATE sections SET name=?, slug=?, description=?, color=?, position=?, in_nav=?, hero_image=?, seo_title=?, seo_description=? WHERE id=?', ...vals, id);
    return id;
  }
  return run('INSERT INTO sections (name, slug, description, color, position, in_nav, hero_image, seo_title, seo_description) VALUES (?,?,?,?,?,?,?,?,?)', ...vals).lastId;
}

export function deleteSection(id: number) {
  run('DELETE FROM sections WHERE id = ?', id);
}

/* ---------------- tags ---------------- */

export function listTags(): Tag[] {
  return all<Tag>(
    `SELECT t.*, (SELECT COUNT(*) FROM article_tags at JOIN articles a ON a.id = at.article_id WHERE at.tag_id = t.id AND ${PUB}) AS article_count
     FROM tags t ORDER BY t.name COLLATE NOCASE`,
    nowIso(),
  );
}

export function popularTags(limit = 20): Tag[] {
  return listTags()
    .filter((t) => (t.article_count ?? 0) > 0)
    .sort((a, b) => (b.article_count ?? 0) - (a.article_count ?? 0))
    .slice(0, limit);
}

export function getTag(slug: string): Tag | null {
  return get<Tag>('SELECT * FROM tags WHERE slug = ?', slug) ?? null;
}

export function saveTag(input: { name: string; slug?: string; description?: string }, id?: number): number {
  const slug = uniqueSlug('tags', input.slug || input.name, id);
  if (id) {
    run('UPDATE tags SET name=?, slug=?, description=? WHERE id=?', input.name, slug, input.description ?? '', id);
    return id;
  }
  return run('INSERT INTO tags (name, slug, description) VALUES (?,?,?)', input.name, slug, input.description ?? '').lastId;
}

export function deleteTag(id: number) {
  run('DELETE FROM tags WHERE id = ?', id);
}

export function mergeTags(fromId: number, intoId: number) {
  run('INSERT OR IGNORE INTO article_tags (article_id, tag_id) SELECT article_id, ? FROM article_tags WHERE tag_id = ?', intoId, fromId);
  run('DELETE FROM tags WHERE id = ?', fromId);
}

/* ---------------- authors ---------------- */

export function listAuthors(): Author[] {
  return all<Author>(
    `SELECT au.*, (SELECT COUNT(*) FROM article_authors aa JOIN articles a ON a.id = aa.article_id WHERE aa.author_id = au.id AND ${PUB}) AS article_count
     FROM authors au ORDER BY au.position, au.name`,
    nowIso(),
  );
}

export function getAuthor(slug: string): Author | null {
  return get<Author>('SELECT * FROM authors WHERE slug = ?', slug) ?? null;
}

export function getAuthorById(id: number): Author | null {
  return get<Author>('SELECT * FROM authors WHERE id = ?', id) ?? null;
}

export type AuthorInput = Omit<Author, 'id' | 'created_at' | 'article_count' | 'slug'> & { slug?: string };

export function saveAuthor(input: AuthorInput, id?: number): number {
  const slug = uniqueSlug('authors', input.slug || input.name, id);
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
    run('UPDATE authors SET name=?, slug=?, title=?, bio=?, photo=?, email=?, twitter=?, instagram=?, website=?, on_masthead=?, position=? WHERE id=?', ...vals, id);
    return id;
  }
  return run('INSERT INTO authors (name, slug, title, bio, photo, email, twitter, instagram, website, on_masthead, position) VALUES (?,?,?,?,?,?,?,?,?,?,?)', ...vals).lastId;
}

export function deleteAuthor(id: number) {
  run('DELETE FROM authors WHERE id = ?', id);
}

export function sectionTags(sectionId: number, limit = 8): Tag[] {
  return all<Tag>(
    `SELECT t.*, COUNT(*) AS article_count FROM tags t
     JOIN article_tags at ON at.tag_id = t.id JOIN articles a ON a.id = at.article_id
     WHERE a.section_id = ? AND ${PUB} GROUP BY t.id ORDER BY article_count DESC, t.name LIMIT ?`,
    sectionId,
    nowIso(),
    limit,
  );
}
