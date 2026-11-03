// Shared, isomorphic helpers (safe in server and client components).

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerpt(html: string, words = 32): string {
  const parts = stripHtml(html).split(' ');
  return parts.length <= words ? parts.join(' ') : parts.slice(0, words).join(' ') + '…';
}

export function readingTime(html: string): number {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Parse a stored timestamp. SQLite's datetime('now') writes UTC as "YYYY-MM-DD HH:MM:SS" with no
 * zone marker, which JS would read as local time; treat such values (and bare dates) as UTC.
 */
export function parseDate(value: string | null | undefined): Date {
  if (!value) return new Date(NaN);
  const s = value.trim();
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?))?$/.exec(s);
  if (m) return new Date(m[2] ? `${m[1]}T${m[2]}Z` : `${m[1]}T00:00:00Z`);
  return new Date(s);
}

/** Parse a query-string value into a safe integer clamped to [min, max], or `fallback` when invalid. */
export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function formatDate(iso: string | null | undefined, style: 'long' | 'short' | 'month' = 'long'): string {
  if (!iso) return '';
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = MONTHS[d.getUTCMonth()];
  if (style === 'month') return `${m} ${d.getUTCFullYear()}`;
  if (style === 'short') return `${m.slice(0, 3)} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  return `${m} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = parseDate(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return formatDate(iso, 'short');
}

export function formatDateTimeLocal(iso: string | null | undefined): string {
  // For <input type="datetime-local"> (local time, minute precision)
  if (!iso) return '';
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function cn(...parts: (string | number | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** Deterministic editorial placeholder photo for seeded content. */
export function photo(seed: string, w = 1200, h = 800): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export function isVideoFile(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

export function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1]! : null;
}

export function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1]! : null;
}

/** Visible text of an HTML body (tags removed, common entities decoded); stored as articles.body_text for search. */
export function htmlText(html: unknown): string {
  return String(html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
