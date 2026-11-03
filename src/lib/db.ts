import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA, SCHEMA_VERSION } from './schema';
import { htmlText } from './utils';
import { seedStatements } from './seed';

/*
 * Storage drivers
 * ---------------
 * - remote:    a libSQL / Turso database (set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN). Use this on
 *              Vercel and any serverless host: data is shared by every instance and persists.
 * - local:     a SQLite file via Node's built-in node:sqlite (default for `npm run dev` / VPS / Docker).
 * - ephemeral: local SQLite in /tmp. Chosen automatically on Vercel when no remote database is
 *              configured, so the site still boots — but each instance has its own short-lived copy.
 *
 * Every helper below is async so the same data layer works with all three.
 */

export type Param = string | number | null | bigint | Uint8Array;
export type Stmt = { sql: string; args?: Param[] };
export type StorageMode = 'remote' | 'local' | 'ephemeral';

const REMOTE_URL = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || '';
const REMOTE_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || undefined;
const ON_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);

export const STORAGE_MODE: StorageMode = REMOTE_URL ? 'remote' : ON_SERVERLESS && !process.env.DATA_DIR ? 'ephemeral' : 'local';

/** True on hosts whose app directory is read-only (Vercel, Lambda, Netlify). */
export const READ_ONLY_FS = ON_SERVERLESS && !process.env.DATA_DIR;

export const DATA_DIR = process.env.DATA_DIR || (ON_SERVERLESS ? '/tmp/voirtales' : path.join(process.cwd(), 'data'));
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'voirtales.db');

type Row = Record<string, unknown>;

interface Driver {
  query(sql: string, args: Param[]): Promise<Row[]>;
  run(sql: string, args: Param[]): Promise<{ changes: number; lastId: number }>;
  /** Runs all statements atomically (one transaction). */
  batch(stmts: Stmt[]): Promise<void>;
  /** Runs a multi-statement SQL script (schema). */
  script(sql: string): Promise<void>;
}

/* ---------------- node:sqlite (local / ephemeral) ---------------- */

async function localDriver(): Promise<Driver> {
  const { DatabaseSync } = await import('node:sqlite');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
  // node:sqlite rows have a null prototype; copy into plain objects so they can cross into Client Components.
  const plain = (r: object) => ({ ...r }) as Row;
  return {
    async query(sql, args) {
      return (db.prepare(sql).all(...args) as object[]).map(plain);
    },
    async run(sql, args) {
      const r = db.prepare(sql).run(...args);
      return { changes: Number(r.changes), lastId: Number(r.lastInsertRowid) };
    },
    async batch(stmts) {
      // Synchronous from BEGIN to COMMIT, so no other request can interleave.
      db.exec('BEGIN');
      try {
        for (const s of stmts) db.prepare(s.sql).run(...(s.args ?? []));
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    async script(sql) {
      db.exec(sql);
    },
  };
}

/* ---------------- libSQL / Turso (remote) ---------------- */

async function remoteDriver(): Promise<Driver> {
  const { createClient } = await import('@libsql/client');
  const client = createClient({ url: REMOTE_URL, authToken: REMOTE_TOKEN, intMode: 'number' });
  const toRows = (rs: { columns: string[]; rows: ArrayLike<unknown>[] }): Row[] =>
    rs.rows.map((r) => {
      const o: Row = {};
      rs.columns.forEach((c, i) => {
        const v = (r as unknown as Row)[c] ?? (r as ArrayLike<unknown>)[i];
        o[c] = typeof v === 'bigint' ? Number(v) : v;
      });
      return o;
    });
  const norm = (args: Param[]) => args.map((a) => (a === undefined ? null : a)) as never[];
  return {
    async query(sql, args) {
      return toRows(await client.execute({ sql, args: norm(args) }));
    },
    async run(sql, args) {
      const r = await client.execute({ sql, args: norm(args) });
      return { changes: r.rowsAffected, lastId: Number(r.lastInsertRowid ?? 0) };
    },
    async batch(stmts) {
      if (!stmts.length) return;
      await client.batch(
        stmts.map((s) => ({ sql: s.sql, args: norm(s.args ?? []) })),
        'write',
      );
    },
    async script(sql) {
      await client.executeMultiple(sql);
    },
  };
}

/* ---------------- bootstrap (schema + first-run seed) ---------------- */

type G = typeof globalThis & { __voirDriver?: Promise<Driver> };
const g = globalThis as G;

/** Adds columns introduced after the first release (CREATE TABLE IF NOT EXISTS never alters tables). */
async function migrate(d: Driver) {
  const cols = await d.query("SELECT name FROM pragma_table_info('articles')", []);
  if (!cols.some((c) => c.name === 'body_text')) {
    await d.run("ALTER TABLE articles ADD COLUMN body_text TEXT NOT NULL DEFAULT ''", []);
  }
}

/** Fills articles.body_text (plain text used by search) for rows that don't have it yet. */
async function backfillBodyText(d: Driver) {
  const rows = await d.query("SELECT id, body FROM articles WHERE body_text = '' AND body != ''", []);
  for (let i = 0; i < rows.length; i += 200) {
    await d.batch(
      rows.slice(i, i + 200).map((r) => ({ sql: 'UPDATE articles SET body_text = ? WHERE id = ?', args: [htmlText(r.body), Number(r.id)] })),
    );
  }
}

async function boot(): Promise<Driver> {
  const d = STORAGE_MODE === 'remote' ? await remoteDriver() : await localDriver();
  // The full schema script (and its one-off fixups) only runs when the stored version differs,
  // so serverless cold starts against an up-to-date database cost a single query.
  let version: unknown = null;
  try {
    version = (await d.query("SELECT value FROM _meta WHERE key = 'schema_version'", []))[0]?.value ?? null;
  } catch {
    /* fresh database: _meta does not exist yet */
  }
  if (version !== SCHEMA_VERSION) {
    await d.script(SCHEMA);
    await migrate(d);
  }
  const [{ n }] = (await d.query('SELECT COUNT(*) AS n FROM users', [])) as { n: number }[];
  if (Number(n) === 0) {
    try {
      await d.batch(seedStatements());
    } catch (e) {
      // Another instance may have seeded at the same moment (unique constraint) — that's fine.
      const [{ n: again }] = (await d.query('SELECT COUNT(*) AS n FROM users', [])) as { n: number }[];
      if (Number(again) === 0) throw e;
    }
  }
  if (version !== SCHEMA_VERSION || Number(n) === 0) {
    await backfillBodyText(d);
    await d.run("INSERT INTO _meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [SCHEMA_VERSION]);
  }
  return d;
}

function driver(): Promise<Driver> {
  if (!g.__voirDriver) {
    g.__voirDriver = boot().catch((e) => {
      g.__voirDriver = undefined; // allow a retry on the next request
      throw e;
    });
  }
  return g.__voirDriver;
}

/* ---------------- query helpers ---------------- */

export async function all<T>(sql: string, ...params: Param[]): Promise<T[]> {
  return (await (await driver()).query(sql, params)) as T[];
}

export async function get<T>(sql: string, ...params: Param[]): Promise<T | undefined> {
  const rows = await (await driver()).query(sql, params);
  return (rows[0] as T | undefined) ?? undefined;
}

export async function run(sql: string, ...params: Param[]): Promise<{ changes: number; lastId: number }> {
  return (await driver()).run(sql, params);
}

/** Executes several write statements atomically. */
export async function batch(stmts: Stmt[]): Promise<void> {
  return (await driver()).batch(stmts);
}

/*
 * Foreign-key actions are applied explicitly (not via PRAGMA foreign_keys) because remote libSQL
 * connections do not reliably keep that pragma between requests.
 */
const REFS: Record<string, { cascade: [table: string, col: string][]; setNull: [table: string, col: string][] }> = {
  articles: {
    cascade: [['article_authors', 'article_id'], ['article_tags', 'article_id'], ['article_views', 'article_id'], ['saved_articles', 'article_id']],
    setNull: [],
  },
  sections: { cascade: [], setNull: [['articles', 'section_id'], ['videos', 'section_id']] },
  issues: { cascade: [], setNull: [['articles', 'issue_id']] },
  authors: { cascade: [['article_authors', 'author_id']], setNull: [] },
  tags: { cascade: [['article_tags', 'tag_id']], setNull: [] },
  podcasts: { cascade: [['episodes', 'podcast_id']], setNull: [] },
  newsletters: { cascade: [['newsletter_subscribers', 'newsletter_id']], setNull: [] },
  plans: { cascade: [], setNull: [['subscriptions', 'plan_id']] },
  readers: { cascade: [['saved_articles', 'reader_id']], setNull: [['subscriptions', 'reader_id']] },
  users: { cascade: [], setNull: [['articles', 'created_by'], ['media', 'uploaded_by'], ['activity_log', 'user_id']] },
};

/** Deletes a row by id together with its dependent rows (cascade / set null), atomically. */
export async function deleteRow(table: keyof typeof REFS | 'videos' | 'episodes' | 'pages' | 'messages' | 'media' | 'subscriptions' | 'newsletter_subscribers' | 'nav_items', id: number): Promise<void> {
  const refs = REFS[table] ?? { cascade: [], setNull: [] };
  await batch([
    ...refs.cascade.map(([t, c]) => ({ sql: `DELETE FROM ${t} WHERE ${c} = ?`, args: [id] })),
    ...refs.setNull.map(([t, c]) => ({ sql: `UPDATE ${t} SET ${c} = NULL WHERE ${c} = ?`, args: [id] })),
    { sql: `DELETE FROM ${table} WHERE id = ?`, args: [id] },
  ]);
}

export const nowIso = () => new Date().toISOString();
