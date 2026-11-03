import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { get, run, nowIso } from './db';
import type { Reader, Role, User } from './types';

const ADMIN_COOKIE = 'vt_admin';
const READER_COOKIE = 'vt_reader';
const SESSION_DAYS = 14;

/* ---------------- passwords ---------------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(hash, 'hex');
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

/* ---------------- sessions ---------------- */

async function createSession(kind: 'admin' | 'reader', subjectId: number) {
  const id = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  run('INSERT INTO sessions (id, kind, subject_id, expires_at) VALUES (?, ?, ?, ?)', id, kind, subjectId, expires.toISOString());
  const jar = await cookies();
  jar.set(kind === 'admin' ? ADMIN_COOKIE : READER_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1',
    path: '/',
    expires,
  });
}

async function readSession(kind: 'admin' | 'reader'): Promise<number | null> {
  const jar = await cookies();
  const id = jar.get(kind === 'admin' ? ADMIN_COOKIE : READER_COOKIE)?.value;
  if (!id) return null;
  const s = get<{ subject_id: number; expires_at: string }>(
    'SELECT subject_id, expires_at FROM sessions WHERE id = ? AND kind = ?',
    id,
    kind,
  );
  if (!s || s.expires_at < nowIso()) return null;
  return s.subject_id;
}

async function destroySession(kind: 'admin' | 'reader') {
  const jar = await cookies();
  const name = kind === 'admin' ? ADMIN_COOKIE : READER_COOKIE;
  const id = jar.get(name)?.value;
  if (id) run('DELETE FROM sessions WHERE id = ?', id);
  jar.delete(name);
}

/* ---------------- admin users ---------------- */

const USER_COLS = 'id, name, email, role, avatar, active, last_login, created_at';

export async function loginAdmin(email: string, password: string): Promise<User | null> {
  const row = get<User & { password_hash: string }>(
    `SELECT ${USER_COLS}, password_hash FROM users WHERE email = ? AND active = 1`,
    email.trim(),
  );
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  run('UPDATE users SET last_login = ? WHERE id = ?', nowIso(), row.id);
  run("DELETE FROM sessions WHERE expires_at < ?", nowIso());
  await createSession('admin', row.id);
  const { password_hash: _ph, ...user } = row;
  return user;
}

export async function logoutAdmin() {
  await destroySession('admin');
}

export async function currentUser(): Promise<User | null> {
  const id = await readSession('admin');
  if (!id) return null;
  return get<User>(`SELECT ${USER_COLS} FROM users WHERE id = ? AND active = 1`, id) ?? null;
}

/** Use at the top of every admin page / action. Redirects to login when signed out. */
export async function requireUser(perm?: Permission): Promise<User> {
  const user = await currentUser();
  if (!user) redirect('/admin/login');
  if (perm && !can(user, perm)) redirect('/admin?denied=1');
  return user;
}

export type Permission =
  | 'articles.publish'   // publish / schedule / feature
  | 'articles.all'       // edit anyone's articles
  | 'content.manage'     // sections, tags, authors, issues, video, podcasts, pages
  | 'site.layout'        // homepage builder & navigation
  | 'audience.manage'    // newsletters, subscribers, subscriptions, readers, messages
  | 'settings.manage'    // site settings
  | 'users.manage';      // admin users

const MATRIX: Record<Role, Permission[]> = {
  admin: ['articles.publish', 'articles.all', 'content.manage', 'site.layout', 'audience.manage', 'settings.manage', 'users.manage'],
  editor: ['articles.publish', 'articles.all', 'content.manage', 'site.layout', 'audience.manage'],
  writer: [],
};

export function can(user: Pick<User, 'role'> | null | undefined, perm: Permission): boolean {
  if (!user) return false;
  return MATRIX[user.role]?.includes(perm) ?? false;
}

/* ---------------- readers (public accounts) ---------------- */

export async function registerReader(name: string, email: string, password: string): Promise<Reader | { error: string }> {
  const exists = get<{ id: number }>('SELECT id FROM readers WHERE email = ?', email.trim());
  if (exists) return { error: 'An account with this email already exists.' };
  const { lastId } = run('INSERT INTO readers (name, email, password_hash) VALUES (?, ?, ?)', name.trim(), email.trim(), hashPassword(password));
  await createSession('reader', lastId);
  return get<Reader>('SELECT id, name, email, active, created_at FROM readers WHERE id = ?', lastId)!;
}

export async function loginReader(email: string, password: string): Promise<Reader | null> {
  const row = get<Reader & { password_hash: string }>(
    'SELECT id, name, email, active, created_at, password_hash FROM readers WHERE email = ? AND active = 1',
    email.trim(),
  );
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  await createSession('reader', row.id);
  const { password_hash: _ph, ...reader } = row;
  return reader;
}

export async function logoutReader() {
  await destroySession('reader');
}

export async function currentReader(): Promise<Reader | null> {
  const id = await readSession('reader');
  if (!id) return null;
  return get<Reader>('SELECT id, name, email, active, created_at FROM readers WHERE id = ? AND active = 1', id) ?? null;
}
