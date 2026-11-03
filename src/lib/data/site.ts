import 'server-only';
import { all, batch, deleteRow, get, run, nowIso } from '../db';
import { hashPassword, revokeSessions } from '../auth';
import type { Activity, Media, Message, MenuName, NavItem, Newsletter, Plan, Reader, Role, Subscriber, Subscription, User } from '../types';
import { uniqueSlug } from './articles';

/* ---------------- navigation ---------------- */

export async function listNav(menu: MenuName): Promise<NavItem[]> {
  return all<NavItem>('SELECT * FROM nav_items WHERE menu = ? ORDER BY position, id', menu);
}

export async function allNav(): Promise<NavItem[]> {
  return all<NavItem>('SELECT * FROM nav_items ORDER BY menu, position, id');
}

/** Replace a whole menu with the given ordered items. */
export async function replaceMenu(menu: MenuName, items: { label: string; url: string; new_tab?: boolean }[]): Promise<void> {
  await batch([
    { sql: 'DELETE FROM nav_items WHERE menu = ?', args: [menu] },
    ...items.flatMap((it, i) =>
      !it.label.trim() || !it.url.trim()
        ? []
        : [{ sql: 'INSERT INTO nav_items (menu, label, url, position, new_tab) VALUES (?,?,?,?,?)', args: [menu, it.label.trim(), it.url.trim(), i, it.new_tab ? 1 : 0] }],
    ),
  ]);
}

/* ---------------- newsletters ---------------- */

export async function listNewsletters(activeOnly = true): Promise<Newsletter[]> {
  return all<Newsletter>(
    `SELECT n.*, (SELECT COUNT(*) FROM newsletter_subscribers ns WHERE ns.newsletter_id = n.id) AS subscriber_count
     FROM newsletters n ${activeOnly ? 'WHERE n.active = 1' : ''} ORDER BY n.position, n.name`,
  );
}

export async function getNewsletterById(id: number): Promise<Newsletter | null> {
  return (await get<Newsletter>('SELECT * FROM newsletters WHERE id = ?', id)) ?? null;
}

export type NewsletterInput = Omit<Newsletter, 'id' | 'subscriber_count' | 'slug'> & { slug?: string };

export async function saveNewsletter(input: NewsletterInput, id?: number): Promise<number> {
  const slug = await uniqueSlug('newsletters', input.slug || input.name, id);
  const vals = [input.name, slug, input.description, input.frequency, input.image, input.active, input.position] as const;
  if (id) {
    await run('UPDATE newsletters SET name=?, slug=?, description=?, frequency=?, image=?, active=?, position=? WHERE id=?', ...vals, id);
    return id;
  }
  return (await run('INSERT INTO newsletters (name, slug, description, frequency, image, active, position) VALUES (?,?,?,?,?,?,?)', ...vals)).lastId;
}

export async function deleteNewsletter(id: number): Promise<void> {
  await deleteRow('newsletters', id);
}

export async function subscribeEmail(email: string, newsletterIds: number[], source = 'website'): Promise<number> {
  let added = 0;
  const ids = newsletterIds.length ? newsletterIds : (await listNewsletters()).slice(0, 1).map((n) => n.id);
  for (const id of ids) {
    added += (await run('INSERT OR IGNORE INTO newsletter_subscribers (email, newsletter_id, source) VALUES (?,?,?)', email.trim().toLowerCase(), id, source)).changes;
  }
  return added;
}

export async function listSubscribers(opts: { newsletterId?: number; q?: string; limit?: number; offset?: number } = {}): Promise<{ items: Subscriber[]; total: number }> {
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
  const [count, items] = await Promise.all([
    get<{ n: number }>(`SELECT COUNT(*) AS n FROM newsletter_subscribers ns WHERE ${w}`, ...params),
    all<Subscriber>(
      `SELECT ns.*, n.name AS newsletter_name FROM newsletter_subscribers ns JOIN newsletters n ON n.id = ns.newsletter_id
       WHERE ${w} ORDER BY ns.created_at DESC LIMIT ? OFFSET ?`,
      ...params,
      opts.limit ?? 50,
      opts.offset ?? 0,
    ),
  ]);
  return { items, total: count!.n };
}

export async function deleteSubscriber(id: number): Promise<void> {
  await deleteRow('newsletter_subscribers', id);
}

export async function readerNewsletterIds(email: string): Promise<number[]> {
  return (await all<{ newsletter_id: number }>('SELECT newsletter_id FROM newsletter_subscribers WHERE email = ?', email.toLowerCase())).map((r) => r.newsletter_id);
}

export async function setReaderNewsletters(email: string, ids: number[]): Promise<void> {
  await batch([
    { sql: 'DELETE FROM newsletter_subscribers WHERE email = ?', args: [email.toLowerCase()] },
    ...ids.map((id) => ({ sql: 'INSERT OR IGNORE INTO newsletter_subscribers (email, newsletter_id, source) VALUES (?,?,?)', args: [email.toLowerCase(), id, 'account'] })),
  ]);
}

/* ---------------- plans & subscriptions ---------------- */

export async function listPlans(activeOnly = true): Promise<Plan[]> {
  return all<Plan>(`SELECT * FROM plans ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY position, id`);
}

export async function getPlan(id: number): Promise<Plan | null> {
  return (await get<Plan>('SELECT * FROM plans WHERE id = ?', id)) ?? null;
}

export type PlanInput = Omit<Plan, 'id'>;

export async function savePlan(input: PlanInput, id?: number): Promise<number> {
  const vals = [input.name, input.price, input.interval, input.description, input.features, input.badge, input.highlighted, input.active, input.position] as const;
  if (id) {
    await run('UPDATE plans SET name=?, price=?, interval=?, description=?, features=?, badge=?, highlighted=?, active=?, position=? WHERE id=?', ...vals, id);
    return id;
  }
  return (await run('INSERT INTO plans (name, price, interval, description, features, badge, highlighted, active, position) VALUES (?,?,?,?,?,?,?,?,?)', ...vals)).lastId;
}

export async function deletePlan(id: number): Promise<void> {
  await deleteRow('plans', id);
}

export async function createSubscription(input: Omit<Subscription, 'id' | 'created_at' | 'status' | 'notes' | 'plan_name'>): Promise<number> {
  const { lastId } = await run(
    'INSERT INTO subscriptions (plan_id, reader_id, name, email, address, city, country, postal_code) VALUES (?,?,?,?,?,?,?,?)',
    input.plan_id,
    input.reader_id,
    input.name,
    input.email,
    input.address,
    input.city,
    input.country,
    input.postal_code,
  );
  return lastId;
}

export async function listSubscriptions(status?: string): Promise<Subscription[]> {
  return all<Subscription>(
    `SELECT su.*, p.name AS plan_name FROM subscriptions su LEFT JOIN plans p ON p.id = su.plan_id
     ${status ? 'WHERE su.status = ?' : ''} ORDER BY su.created_at DESC`,
    ...(status ? [status] : []),
  );
}

export async function updateSubscription(id: number, status: Subscription['status'], notes: string): Promise<void> {
  await run('UPDATE subscriptions SET status = ?, notes = ? WHERE id = ?', status, notes, id);
}

export async function deleteSubscription(id: number): Promise<void> {
  await deleteRow('subscriptions', id);
}

export async function readerSubscription(readerId: number, email: string): Promise<Subscription | null> {
  return (
    (await get<Subscription>(
      `SELECT su.*, p.name AS plan_name FROM subscriptions su LEFT JOIN plans p ON p.id = su.plan_id
       WHERE (su.reader_id = ? OR su.email = ?) AND su.status != 'cancelled' ORDER BY su.created_at DESC LIMIT 1`,
      readerId,
      email,
    )) ?? null
  );
}

/* ---------------- readers ---------------- */

export async function listReaders(q?: string): Promise<Reader[]> {
  return all<Reader>(
    `SELECT r.id, r.name, r.email, r.active, r.created_at, (SELECT COUNT(*) FROM saved_articles s WHERE s.reader_id = r.id) AS saved_count
     FROM readers r ${q ? 'WHERE r.name LIKE ? OR r.email LIKE ?' : ''} ORDER BY r.created_at DESC`,
    ...(q ? [`%${q}%`, `%${q}%`] : []),
  );
}

export async function setReaderActive(id: number, active: boolean): Promise<void> {
  await run('UPDATE readers SET active = ? WHERE id = ?', active ? 1 : 0, id);
  if (!active) await run("DELETE FROM sessions WHERE kind = 'reader' AND subject_id = ?", id);
}

export async function deleteReader(id: number): Promise<void> {
  await run("DELETE FROM sessions WHERE kind = 'reader' AND subject_id = ?", id);
  await deleteRow('readers', id);
}

/** Changing the password ends the reader's other sessions; await the result to be sure they are gone and the current session has been renewed. */
export async function updateReaderProfile(id: number, name: string, password?: string): Promise<void> {
  await run('UPDATE readers SET name = ? WHERE id = ?', name, id);
  if (password) {
    await run('UPDATE readers SET password_hash = ? WHERE id = ?', hashPassword(password), id);
    await revokeSessions('reader', id);
  }
}

export async function toggleSaved(readerId: number, articleId: number): Promise<boolean> {
  // Delete-or-insert without a prior read, so double clicks can't race into a primary-key error.
  const { changes } = await run('DELETE FROM saved_articles WHERE reader_id = ? AND article_id = ?', readerId, articleId);
  if (changes) return false;
  await run('INSERT OR IGNORE INTO saved_articles (reader_id, article_id) VALUES (?, ?)', readerId, articleId);
  return true;
}

export async function isSaved(readerId: number, articleId: number): Promise<boolean> {
  return !!(await get('SELECT 1 FROM saved_articles WHERE reader_id = ? AND article_id = ?', readerId, articleId));
}

export async function savedArticleIds(readerId: number): Promise<number[]> {
  return (await all<{ article_id: number }>('SELECT article_id FROM saved_articles WHERE reader_id = ? ORDER BY created_at DESC', readerId)).map((r) => r.article_id);
}

/* ---------------- messages ---------------- */

export async function createMessage(m: Pick<Message, 'name' | 'email' | 'subject' | 'topic' | 'body'>): Promise<number> {
  return (await run('INSERT INTO messages (name, email, subject, topic, body) VALUES (?,?,?,?,?)', m.name, m.email, m.subject, m.topic, m.body)).lastId;
}

export async function listMessages(filter?: 'unread'): Promise<Message[]> {
  return all<Message>(`SELECT * FROM messages ${filter === 'unread' ? 'WHERE read = 0' : ''} ORDER BY created_at DESC`);
}

export async function getMessage(id: number): Promise<Message | null> {
  return (await get<Message>('SELECT * FROM messages WHERE id = ?', id)) ?? null;
}

export async function markMessage(id: number, read: boolean): Promise<void> {
  await run('UPDATE messages SET read = ? WHERE id = ?', read ? 1 : 0, id);
}

export async function deleteMessage(id: number): Promise<void> {
  await deleteRow('messages', id);
}

/* ---------------- media library ---------------- */

export async function listMedia(q?: string, limit = 200): Promise<Media[]> {
  return all<Media>(
    `SELECT * FROM media ${q ? 'WHERE original_name LIKE ? OR alt LIKE ?' : ''} ORDER BY created_at DESC LIMIT ?`,
    ...(q ? [`%${q}%`, `%${q}%`] : []),
    limit,
  );
}

export async function getMedia(id: number): Promise<Media | null> {
  return (await get<Media>('SELECT * FROM media WHERE id = ?', id)) ?? null;
}

export async function insertMedia(m: Omit<Media, 'id' | 'created_at'>): Promise<number> {
  const { lastId } = await run(
    'INSERT INTO media (filename, url, original_name, mime, size, alt, credit, uploaded_by) VALUES (?,?,?,?,?,?,?,?)',
    m.filename,
    m.url,
    m.original_name,
    m.mime,
    m.size,
    m.alt,
    m.credit,
    m.uploaded_by,
  );
  return lastId;
}

export async function updateMedia(id: number, alt: string, credit: string): Promise<void> {
  await run('UPDATE media SET alt = ?, credit = ? WHERE id = ?', alt, credit, id);
}

export async function deleteMediaRow(id: number): Promise<void> {
  await deleteRow('media', id);
}

/* ---------------- admin users ---------------- */

export async function listUsers(): Promise<User[]> {
  return all<User>('SELECT id, name, email, role, avatar, active, last_login, created_at FROM users ORDER BY created_at');
}

export async function getUser(id: number): Promise<User | null> {
  return (await get<User>('SELECT id, name, email, role, avatar, active, last_login, created_at FROM users WHERE id = ?', id)) ?? null;
}

export async function saveUser(input: { name: string; email: string; role: Role; active: boolean; password?: string; avatar?: string }, id?: number): Promise<number> {
  if (id) {
    await batch([
      { sql: 'UPDATE users SET name=?, email=?, role=?, active=?, avatar=? WHERE id=?', args: [input.name, input.email, input.role, input.active ? 1 : 0, input.avatar ?? null, id] },
      ...(input.password ? [{ sql: 'UPDATE users SET password_hash = ? WHERE id = ?', args: [hashPassword(input.password), id] }] : []),
      // A new password (or deactivation) ends every session; self-service callers renew their own via renewSession().
      ...(input.password || !input.active ? [{ sql: "DELETE FROM sessions WHERE kind = 'admin' AND subject_id = ?", args: [id] }] : []),
    ]);
    return id;
  }
  const { lastId } = await run(
    'INSERT INTO users (name, email, role, active, avatar, password_hash) VALUES (?,?,?,?,?,?)',
    input.name,
    input.email,
    input.role,
    input.active ? 1 : 0,
    input.avatar ?? null,
    hashPassword(input.password || Math.random().toString(36)),
  );
  return lastId;
}

export async function deleteUser(id: number): Promise<void> {
  await run("DELETE FROM sessions WHERE kind = 'admin' AND subject_id = ?", id);
  await deleteRow('users', id);
}

export async function emailTaken(table: 'users' | 'readers', email: string, ignoreId = 0): Promise<boolean> {
  return !!(await get(`SELECT 1 FROM ${table} WHERE email = ? AND id != ?`, email.trim(), ignoreId));
}

/* ---------------- activity log ---------------- */

export async function logActivity(userId: number | null, action: string, entity: string, entityId: number | null, label = ''): Promise<void> {
  await run('INSERT INTO activity_log (user_id, action, entity, entity_id, label) VALUES (?,?,?,?,?)', userId, action, entity, entityId, label);
}

/** Logs several activity rows in one round trip. */
export async function logActivities(rows: { userId: number | null; action: string; entity: string; entityId: number | null; label?: string }[]): Promise<void> {
  await batch(
    rows.map((r) => ({
      sql: 'INSERT INTO activity_log (user_id, action, entity, entity_id, label) VALUES (?,?,?,?,?)',
      args: [r.userId, r.action, r.entity, r.entityId, r.label ?? ''],
    })),
  );
}

export async function mediaCount(): Promise<number> {
  return (await get<{ n: number }>('SELECT COUNT(*) AS n FROM media'))?.n ?? 0;
}

export async function recentActivity(limit = 20): Promise<Activity[]> {
  return all<Activity>(
    `SELECT l.*, u.name AS user_name FROM activity_log l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.id DESC LIMIT ?`,
    limit,
  );
}

/* ---------------- dashboard stats ---------------- */

export async function dashboardStats() {
  const n = async (sql: string, ...p: (string | number)[]) => (await get<{ n: number }>(sql, ...p))!.n;
  const [
    published,
    drafts,
    inReview,
    scheduled,
    totalViews,
    views7,
    subscribers,
    subscriptions,
    pendingSubscriptions,
    readers,
    unreadMessages,
    videos,
    episodes,
    media,
  ] = await Promise.all([
    n("SELECT COUNT(*) AS n FROM articles WHERE status IN ('published','scheduled') AND published_at <= ?", nowIso()),
    n("SELECT COUNT(*) AS n FROM articles WHERE status = 'draft'"),
    n("SELECT COUNT(*) AS n FROM articles WHERE status = 'review'"),
    n("SELECT COUNT(*) AS n FROM articles WHERE status = 'scheduled' AND published_at > ?", nowIso()),
    n('SELECT COALESCE(SUM(views),0) AS n FROM articles'),
    n('SELECT COALESCE(SUM(count),0) AS n FROM article_views WHERE day >= ?', new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)),
    n('SELECT COUNT(DISTINCT email) AS n FROM newsletter_subscribers'),
    n("SELECT COUNT(*) AS n FROM subscriptions WHERE status != 'cancelled'"),
    n("SELECT COUNT(*) AS n FROM subscriptions WHERE status = 'pending'"),
    n('SELECT COUNT(*) AS n FROM readers'),
    n('SELECT COUNT(*) AS n FROM messages WHERE read = 0'),
    n('SELECT COUNT(*) AS n FROM videos'),
    n('SELECT COUNT(*) AS n FROM episodes'),
    n('SELECT COUNT(*) AS n FROM media'),
  ]);
  return { published, drafts, inReview, scheduled, totalViews, views7, subscribers, subscriptions, pendingSubscriptions, readers, unreadMessages, videos, episodes, media };
}
