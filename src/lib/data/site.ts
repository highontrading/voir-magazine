import 'server-only';
import { all, get, run, nowIso } from '../db';
import { hashPassword, revokeSessions } from '../auth';
import type { Activity, Media, Message, MenuName, NavItem, Newsletter, Plan, Reader, Role, Subscriber, Subscription, User } from '../types';
import { uniqueSlug } from './articles';

/* ---------------- navigation ---------------- */

export function listNav(menu: MenuName): NavItem[] {
  return all<NavItem>('SELECT * FROM nav_items WHERE menu = ? ORDER BY position, id', menu);
}

export function allNav(): NavItem[] {
  return all<NavItem>('SELECT * FROM nav_items ORDER BY menu, position, id');
}

/** Replace a whole menu with the given ordered items. */
export function replaceMenu(menu: MenuName, items: { label: string; url: string; new_tab?: boolean }[]) {
  run('DELETE FROM nav_items WHERE menu = ?', menu);
  items.forEach((it, i) => {
    if (!it.label.trim() || !it.url.trim()) return;
    run('INSERT INTO nav_items (menu, label, url, position, new_tab) VALUES (?,?,?,?,?)', menu, it.label.trim(), it.url.trim(), i, it.new_tab ? 1 : 0);
  });
}

/* ---------------- newsletters ---------------- */

export function listNewsletters(activeOnly = true): Newsletter[] {
  return all<Newsletter>(
    `SELECT n.*, (SELECT COUNT(*) FROM newsletter_subscribers ns WHERE ns.newsletter_id = n.id) AS subscriber_count
     FROM newsletters n ${activeOnly ? 'WHERE n.active = 1' : ''} ORDER BY n.position, n.name`,
  );
}

export function getNewsletterById(id: number): Newsletter | null {
  return get<Newsletter>('SELECT * FROM newsletters WHERE id = ?', id) ?? null;
}

export type NewsletterInput = Omit<Newsletter, 'id' | 'subscriber_count' | 'slug'> & { slug?: string };

export function saveNewsletter(input: NewsletterInput, id?: number): number {
  const slug = uniqueSlug('newsletters', input.slug || input.name, id);
  const vals = [input.name, slug, input.description, input.frequency, input.image, input.active, input.position] as const;
  if (id) {
    run('UPDATE newsletters SET name=?, slug=?, description=?, frequency=?, image=?, active=?, position=? WHERE id=?', ...vals, id);
    return id;
  }
  return run('INSERT INTO newsletters (name, slug, description, frequency, image, active, position) VALUES (?,?,?,?,?,?,?)', ...vals).lastId;
}

export function deleteNewsletter(id: number) {
  run('DELETE FROM newsletters WHERE id = ?', id);
}

export function subscribeEmail(email: string, newsletterIds: number[], source = 'website'): number {
  let added = 0;
  const ids = newsletterIds.length ? newsletterIds : listNewsletters().slice(0, 1).map((n) => n.id);
  for (const id of ids) {
    added += run('INSERT OR IGNORE INTO newsletter_subscribers (email, newsletter_id, source) VALUES (?,?,?)', email.trim().toLowerCase(), id, source).changes;
  }
  return added;
}

export function listSubscribers(opts: { newsletterId?: number; q?: string; limit?: number; offset?: number } = {}): { items: Subscriber[]; total: number } {
  const where: string[] = ['1=1'];
  const params: (string | number)[] = [];
  if (opts.newsletterId) {
    where.push('ns.newsletter_id = ?');
    params.push(opts.newsletterId);
  }
  if (opts.q) {
    where.push('ns.email LIKE ?');
    params.push(`%${opts.q}%`);
  }
  const w = where.join(' AND ');
  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM newsletter_subscribers ns WHERE ${w}`, ...params)!.n;
  const items = all<Subscriber>(
    `SELECT ns.*, n.name AS newsletter_name FROM newsletter_subscribers ns JOIN newsletters n ON n.id = ns.newsletter_id
     WHERE ${w} ORDER BY ns.created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    opts.limit ?? 50,
    opts.offset ?? 0,
  );
  return { items, total };
}

export function deleteSubscriber(id: number) {
  run('DELETE FROM newsletter_subscribers WHERE id = ?', id);
}

export function readerNewsletterIds(email: string): number[] {
  return all<{ newsletter_id: number }>('SELECT newsletter_id FROM newsletter_subscribers WHERE email = ?', email.toLowerCase()).map((r) => r.newsletter_id);
}

export function setReaderNewsletters(email: string, ids: number[]) {
  run('DELETE FROM newsletter_subscribers WHERE email = ?', email.toLowerCase());
  for (const id of ids) run('INSERT OR IGNORE INTO newsletter_subscribers (email, newsletter_id, source) VALUES (?,?,?)', email.toLowerCase(), id, 'account');
}

/* ---------------- plans & subscriptions ---------------- */

export function listPlans(activeOnly = true): Plan[] {
  return all<Plan>(`SELECT * FROM plans ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY position, id`);
}

export function getPlan(id: number): Plan | null {
  return get<Plan>('SELECT * FROM plans WHERE id = ?', id) ?? null;
}

export type PlanInput = Omit<Plan, 'id'>;

export function savePlan(input: PlanInput, id?: number): number {
  const vals = [input.name, input.price, input.interval, input.description, input.features, input.badge, input.highlighted, input.active, input.position] as const;
  if (id) {
    run('UPDATE plans SET name=?, price=?, interval=?, description=?, features=?, badge=?, highlighted=?, active=?, position=? WHERE id=?', ...vals, id);
    return id;
  }
  return run('INSERT INTO plans (name, price, interval, description, features, badge, highlighted, active, position) VALUES (?,?,?,?,?,?,?,?,?)', ...vals).lastId;
}

export function deletePlan(id: number) {
  run('DELETE FROM plans WHERE id = ?', id);
}

export function createSubscription(input: Omit<Subscription, 'id' | 'created_at' | 'status' | 'notes' | 'plan_name'>): number {
  return run(
    'INSERT INTO subscriptions (plan_id, reader_id, name, email, address, city, country, postal_code) VALUES (?,?,?,?,?,?,?,?)',
    input.plan_id,
    input.reader_id,
    input.name,
    input.email,
    input.address,
    input.city,
    input.country,
    input.postal_code,
  ).lastId;
}

export function listSubscriptions(status?: string): Subscription[] {
  return all<Subscription>(
    `SELECT su.*, p.name AS plan_name FROM subscriptions su LEFT JOIN plans p ON p.id = su.plan_id
     ${status ? 'WHERE su.status = ?' : ''} ORDER BY su.created_at DESC`,
    ...(status ? [status] : []),
  );
}

export function updateSubscription(id: number, status: Subscription['status'], notes: string) {
  run('UPDATE subscriptions SET status = ?, notes = ? WHERE id = ?', status, notes, id);
}

export function deleteSubscription(id: number) {
  run('DELETE FROM subscriptions WHERE id = ?', id);
}

export function readerSubscription(readerId: number, email: string): Subscription | null {
  return (
    get<Subscription>(
      `SELECT su.*, p.name AS plan_name FROM subscriptions su LEFT JOIN plans p ON p.id = su.plan_id
       WHERE (su.reader_id = ? OR su.email = ?) AND su.status != 'cancelled' ORDER BY su.created_at DESC LIMIT 1`,
      readerId,
      email,
    ) ?? null
  );
}

/* ---------------- readers ---------------- */

export function listReaders(q?: string): Reader[] {
  return all<Reader>(
    `SELECT r.id, r.name, r.email, r.active, r.created_at, (SELECT COUNT(*) FROM saved_articles s WHERE s.reader_id = r.id) AS saved_count
     FROM readers r ${q ? 'WHERE r.name LIKE ? OR r.email LIKE ?' : ''} ORDER BY r.created_at DESC`,
    ...(q ? [`%${q}%`, `%${q}%`] : []),
  );
}

export function setReaderActive(id: number, active: boolean) {
  run('UPDATE readers SET active = ? WHERE id = ?', active ? 1 : 0, id);
  if (!active) run("DELETE FROM sessions WHERE kind = 'reader' AND subject_id = ?", id);
}

export function deleteReader(id: number) {
  run("DELETE FROM sessions WHERE kind = 'reader' AND subject_id = ?", id);
  run('DELETE FROM readers WHERE id = ?', id);
}

/** Changing the password ends the reader's other sessions (deleted synchronously); await the result to be sure the current session has been renewed. */
export async function updateReaderProfile(id: number, name: string, password?: string): Promise<void> {
  run('UPDATE readers SET name = ? WHERE id = ?', name, id);
  if (password) {
    run('UPDATE readers SET password_hash = ? WHERE id = ?', hashPassword(password), id);
    await revokeSessions('reader', id);
  }
}

export function toggleSaved(readerId: number, articleId: number): boolean {
  const exists = get('SELECT 1 FROM saved_articles WHERE reader_id = ? AND article_id = ?', readerId, articleId);
  if (exists) {
    run('DELETE FROM saved_articles WHERE reader_id = ? AND article_id = ?', readerId, articleId);
    return false;
  }
  run('INSERT INTO saved_articles (reader_id, article_id) VALUES (?, ?)', readerId, articleId);
  return true;
}

export function isSaved(readerId: number, articleId: number): boolean {
  return !!get('SELECT 1 FROM saved_articles WHERE reader_id = ? AND article_id = ?', readerId, articleId);
}

export function savedArticleIds(readerId: number): number[] {
  return all<{ article_id: number }>('SELECT article_id FROM saved_articles WHERE reader_id = ? ORDER BY created_at DESC', readerId).map((r) => r.article_id);
}

/* ---------------- messages ---------------- */

export function createMessage(m: Pick<Message, 'name' | 'email' | 'subject' | 'topic' | 'body'>) {
  return run('INSERT INTO messages (name, email, subject, topic, body) VALUES (?,?,?,?,?)', m.name, m.email, m.subject, m.topic, m.body).lastId;
}

export function listMessages(filter?: 'unread'): Message[] {
  return all<Message>(`SELECT * FROM messages ${filter === 'unread' ? 'WHERE read = 0' : ''} ORDER BY created_at DESC`);
}

export function getMessage(id: number): Message | null {
  return get<Message>('SELECT * FROM messages WHERE id = ?', id) ?? null;
}

export function markMessage(id: number, read: boolean) {
  run('UPDATE messages SET read = ? WHERE id = ?', read ? 1 : 0, id);
}

export function deleteMessage(id: number) {
  run('DELETE FROM messages WHERE id = ?', id);
}

/* ---------------- media library ---------------- */

export function listMedia(q?: string, limit = 200): Media[] {
  return all<Media>(
    `SELECT * FROM media ${q ? 'WHERE original_name LIKE ? OR alt LIKE ?' : ''} ORDER BY created_at DESC LIMIT ?`,
    ...(q ? [`%${q}%`, `%${q}%`] : []),
    limit,
  );
}

export function getMedia(id: number): Media | null {
  return get<Media>('SELECT * FROM media WHERE id = ?', id) ?? null;
}

export function insertMedia(m: Omit<Media, 'id' | 'created_at'>): number {
  return run(
    'INSERT INTO media (filename, url, original_name, mime, size, alt, credit, uploaded_by) VALUES (?,?,?,?,?,?,?,?)',
    m.filename,
    m.url,
    m.original_name,
    m.mime,
    m.size,
    m.alt,
    m.credit,
    m.uploaded_by,
  ).lastId;
}

export function updateMedia(id: number, alt: string, credit: string) {
  run('UPDATE media SET alt = ?, credit = ? WHERE id = ?', alt, credit, id);
}

export function deleteMediaRow(id: number) {
  run('DELETE FROM media WHERE id = ?', id);
}

/* ---------------- admin users ---------------- */

export function listUsers(): User[] {
  return all<User>('SELECT id, name, email, role, avatar, active, last_login, created_at FROM users ORDER BY created_at');
}

export function getUser(id: number): User | null {
  return get<User>('SELECT id, name, email, role, avatar, active, last_login, created_at FROM users WHERE id = ?', id) ?? null;
}

export function saveUser(input: { name: string; email: string; role: Role; active: boolean; password?: string; avatar?: string }, id?: number): number {
  if (id) {
    run('UPDATE users SET name=?, email=?, role=?, active=?, avatar=? WHERE id=?', input.name, input.email, input.role, input.active ? 1 : 0, input.avatar ?? null, id);
    if (input.password) run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(input.password), id);
    // A new password (or deactivation) ends every session; self-service callers renew their own via renewSession().
    if (input.password || !input.active) run("DELETE FROM sessions WHERE kind = 'admin' AND subject_id = ?", id);
    return id;
  }
  return run(
    'INSERT INTO users (name, email, role, active, avatar, password_hash) VALUES (?,?,?,?,?,?)',
    input.name,
    input.email,
    input.role,
    input.active ? 1 : 0,
    input.avatar ?? null,
    hashPassword(input.password || Math.random().toString(36)),
  ).lastId;
}

export function deleteUser(id: number) {
  run("DELETE FROM sessions WHERE kind = 'admin' AND subject_id = ?", id);
  run('DELETE FROM users WHERE id = ?', id);
}

export function emailTaken(table: 'users' | 'readers', email: string, ignoreId = 0): boolean {
  return !!get(`SELECT 1 FROM ${table} WHERE email = ? AND id != ?`, email.trim(), ignoreId);
}

/* ---------------- activity log ---------------- */

export function logActivity(userId: number | null, action: string, entity: string, entityId: number | null, label = '') {
  run('INSERT INTO activity_log (user_id, action, entity, entity_id, label) VALUES (?,?,?,?,?)', userId, action, entity, entityId, label);
}

export function recentActivity(limit = 20): Activity[] {
  return all<Activity>(
    `SELECT l.*, u.name AS user_name FROM activity_log l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.id DESC LIMIT ?`,
    limit,
  );
}

/* ---------------- dashboard stats ---------------- */

export function dashboardStats() {
  const n = (sql: string, ...p: (string | number)[]) => get<{ n: number }>(sql, ...p)!.n;
  return {
    published: n("SELECT COUNT(*) AS n FROM articles WHERE status IN ('published','scheduled') AND published_at <= ?", nowIso()),
    drafts: n("SELECT COUNT(*) AS n FROM articles WHERE status = 'draft'"),
    inReview: n("SELECT COUNT(*) AS n FROM articles WHERE status = 'review'"),
    scheduled: n("SELECT COUNT(*) AS n FROM articles WHERE status = 'scheduled' AND published_at > ?", nowIso()),
    totalViews: n('SELECT COALESCE(SUM(views),0) AS n FROM articles'),
    views7: n('SELECT COALESCE(SUM(count),0) AS n FROM article_views WHERE day >= ?', new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)),
    subscribers: n('SELECT COUNT(DISTINCT email) AS n FROM newsletter_subscribers'),
    subscriptions: n("SELECT COUNT(*) AS n FROM subscriptions WHERE status != 'cancelled'"),
    pendingSubscriptions: n("SELECT COUNT(*) AS n FROM subscriptions WHERE status = 'pending'"),
    readers: n('SELECT COUNT(*) AS n FROM readers'),
    unreadMessages: n('SELECT COUNT(*) AS n FROM messages WHERE read = 0'),
    videos: n('SELECT COUNT(*) AS n FROM videos'),
    episodes: n('SELECT COUNT(*) AS n FROM episodes'),
    media: n('SELECT COUNT(*) AS n FROM media'),
  };
}
