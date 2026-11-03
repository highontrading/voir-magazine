import 'server-only';
import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { all, get, run, nowIso } from './db';
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

/** A throwaway hash so failed lookups cost the same scrypt work as a wrong password. */
const DUMMY_HASH = ['scrypt', crypto.randomBytes(16).toString('hex'), '0'.repeat(128)].join('$');
function verifyAgainstDummy(password: string): false {
  verifyPassword(password, DUMMY_HASH);
  return false;
}

/* ---------------- login throttling ---------------- */

const MAX_FAILURES = 5; // per email + client IP
// Per-email backstop from any IP. Its lockout is deliberately short so a stranger who knows a
// staff email cannot keep the real owner out for long, while brute force stays slow.
const MAX_EMAIL_FAILURES = 25;
const FAILURE_WINDOW_MS = 15 * 60_000;
const LOCKOUT_MS = 15 * 60_000;
const EMAIL_LOCKOUT_MS = 60_000;

type Attempt = { count: number; first: number; lockedUntil: number };
type ThrottleKey = { key: string; max: number; lockMs: number };
const g = globalThis as unknown as { __vtLoginAttempts?: Map<string, Attempt> };
const attempts = (g.__vtLoginAttempts ??= new Map<string, Attempt>());

async function throttleKeys(kind: 'admin' | 'reader', email: string): Promise<ThrottleKey[]> {
  let ip = 'unknown';
  try {
    const h = await headers();
    // Use the right-most hop: it is the one appended by our own proxy (or the socket address
    // Next fills in), whereas left-most entries are supplied by the client.
    const hops = (h.get('x-forwarded-for') ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    ip = hops[hops.length - 1] || h.get('x-real-ip')?.trim() || 'unknown';
  } catch {
    /* outside a request */
  }
  const account = `${kind}|${email.trim().toLowerCase()}`;
  return [
    { key: `${account}|${ip}`, max: MAX_FAILURES, lockMs: LOCKOUT_MS },
    { key: account, max: MAX_EMAIL_FAILURES, lockMs: EMAIL_LOCKOUT_MS },
  ];
}

function isLocked(keys: ThrottleKey[]): boolean {
  const now = Date.now();
  return keys.some(({ key }) => (attempts.get(key)?.lockedUntil ?? 0) > now);
}

function recordFailure(keys: ThrottleKey[]) {
  const now = Date.now();
  if (attempts.size > 10_000) {
    for (const [k, v] of attempts) if (v.lockedUntil <= now && now - v.first > FAILURE_WINDOW_MS) attempts.delete(k);
  }
  for (const { key, max, lockMs } of keys) {
    let a = attempts.get(key);
    if (!a || now - a.first > FAILURE_WINDOW_MS) a = { count: 0, first: now, lockedUntil: 0 };
    a.count += 1;
    if (a.count >= max) {
      a.lockedUntil = now + lockMs;
      a.count = 0;
      a.first = now;
    }
    attempts.set(key, a);
  }
}

function clearFailures(keys: ThrottleKey[]) {
  for (const { key } of keys) attempts.delete(key);
}

/** True while too many failed sign-ins for this email are locking it out. */
export async function loginLocked(kind: 'admin' | 'reader', email: string): Promise<boolean> {
  return isLocked(await throttleKeys(kind, email));
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

/**
 * Ends every session of a subject (call after a password change or reset). If the current
 * request was signed in with one of those sessions, a fresh session is issued so the person
 * making a self-service change stays signed in. The sessions are deleted synchronously, before
 * this function first awaits.
 */
export async function revokeSessions(kind: 'admin' | 'reader', subjectId: number): Promise<void> {
  const ids = all<{ id: string }>('SELECT id FROM sessions WHERE kind = ? AND subject_id = ?', kind, subjectId).map((r) => r.id);
  run('DELETE FROM sessions WHERE kind = ? AND subject_id = ?', kind, subjectId);
  let current: string | undefined;
  try {
    current = (await cookies()).get(kind === 'admin' ? ADMIN_COOKIE : READER_COOKIE)?.value;
  } catch {
    return; // outside a request: nothing to keep
  }
  if (current && ids.includes(current)) await createSession(kind, subjectId);
}

/** Issues a fresh session (and cookie) for the signed-in subject, e.g. after their own password change ended all their sessions. */
export async function renewSession(kind: 'admin' | 'reader', subjectId: number): Promise<void> {
  await createSession(kind, subjectId);
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
  const keys = await throttleKeys('admin', email);
  if (isLocked(keys)) return null;
  const row = get<User & { password_hash: string }>(
    `SELECT ${USER_COLS}, password_hash FROM users WHERE email = ? AND active = 1`,
    email.trim(),
  );
  const valid = row ? verifyPassword(password, row.password_hash) : verifyAgainstDummy(password);
  if (!row || !valid) {
    recordFailure(keys);
    return null;
  }
  clearFailures(keys);
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
  const keys = await throttleKeys('reader', email);
  if (isLocked(keys)) return null;
  const row = get<Reader & { password_hash: string }>(
    'SELECT id, name, email, active, created_at, password_hash FROM readers WHERE email = ? AND active = 1',
    email.trim(),
  );
  const valid = row ? verifyPassword(password, row.password_hash) : verifyAgainstDummy(password);
  if (!row || !valid) {
    recordFailure(keys);
    return null;
  }
  clearFailures(keys);
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
