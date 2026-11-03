// Shared helpers for admin server actions (FormData parsing + result shape).
// Safe to import from client components for the ActionResult type.

export interface ActionResult {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Client navigates here after showing the toast. */
  redirect?: string;
  /** Monotonic stamp so identical consecutive results still trigger effects. */
  at?: number;
  data?: Record<string, unknown>;
}

export function ok(message?: string, extra: Partial<ActionResult> = {}): ActionResult {
  return { ok: true, message, at: Date.now(), ...extra };
}

export function fail(message: string, errors?: Record<string, string>): ActionResult {
  return { ok: false, message, errors, at: Date.now() };
}

export function str(fd: FormData, key: string, max = 100_000): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export function raw(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

export function int(fd: FormData, key: string, fallback = 0): number {
  const n = parseInt(str(fd, key), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function optInt(fd: FormData, key: string): number | null {
  const n = parseInt(str(fd, key), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === 'on' || v === '1' || v === 'true';
}

export function ids(fd: FormData, key: string): number[] {
  return fd
    .getAll(key)
    .map((v) => parseInt(String(v), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function isoOrNull(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isUrlish(v: string): boolean {
  return !v || /^(https?:\/\/|\/|mailto:|tel:|#)/i.test(v);
}

/** Converts a SQLite constraint error into a friendly message. */
export function dbError(e: unknown, fallback = 'Something went wrong.'): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/UNIQUE constraint failed: [\w.]*\.?(email)/i.test(msg)) return 'That email address is already in use.';
  if (/UNIQUE constraint failed: [\w.]*\.?(slug)/i.test(msg)) return 'That slug is already taken.';
  if (/UNIQUE constraint/i.test(msg)) return 'A record with these details already exists.';
  return fallback + (process.env.NODE_ENV !== 'production' ? ` (${msg})` : '');
}
