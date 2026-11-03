import { recordView } from '@/lib/data/articles';
import { recordVideoView } from '@/lib/data/content';
import { get, nowIso } from '@/lib/db';

// Light in-memory throttle: one counted view per client IP + item per window, plus a
// per-item ceiling per window that holds even when the client address is spoofed.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_KEYS = 20_000;
const MAX_PER_ITEM = 120;
type G = typeof globalThis & { __voirViewHits?: Map<string, number>; __voirViewCaps?: Map<string, { start: number; n: number }> };
const hits = ((globalThis as G).__voirViewHits ??= new Map<string, number>());
const caps = ((globalThis as G).__voirViewCaps ??= new Map<string, { start: number; n: number }>());

/**
 * The client's address as seen by the nearest hop. Next only fills X-Forwarded-For from the
 * socket when the header is absent, so the leftmost entry is whatever the client typed; the
 * rightmost entry is the one a fronting proxy appended (or the socket address when there is none).
 */
function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  const last = xff?.split(',').map((s) => s.trim()).filter(Boolean).pop();
  return last || req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function throttled(key: string): boolean {
  const now = Date.now();
  const last = hits.get(key);
  if (last !== undefined && now - last < WINDOW_MS) return true;
  if (hits.size >= MAX_KEYS) {
    for (const [k, t] of hits) if (now - t >= WINDOW_MS) hits.delete(k);
    if (hits.size >= MAX_KEYS) hits.clear();
  }
  hits.set(key, now);
  return false;
}

/** Fixed-window ceiling on counted views per item, independent of the (spoofable) client address. */
function overItemCap(key: string): boolean {
  const now = Date.now();
  let c = caps.get(key);
  if (!c || now - c.start >= WINDOW_MS) {
    if (!c && caps.size >= MAX_KEYS) {
      for (const [k, v] of caps) if (now - v.start >= WINDOW_MS) caps.delete(k);
      if (caps.size >= MAX_KEYS) caps.clear();
    }
    c = { start: now, n: 0 };
    caps.set(key, c);
  }
  if (c.n >= MAX_PER_ITEM) return true;
  c.n++;
  return false;
}

async function isPublicArticle(id: number): Promise<boolean> {
  return !!(await get<{ id: number }>(
    "SELECT id FROM articles WHERE id = ? AND status IN ('published','scheduled') AND published_at IS NOT NULL AND published_at <= ?",
    id,
    nowIso(),
  ));
}

async function isPublicVideo(id: number): Promise<boolean> {
  return !!(await get<{ id: number }>(
    "SELECT id FROM videos WHERE id = ? AND status = 'published' AND published_at IS NOT NULL AND published_at <= ?",
    id,
    nowIso(),
  ));
}

export async function POST(req: Request) {
  try {
    const { id, kind } = (await req.json()) as { id: number; kind?: string };
    if (!Number.isSafeInteger(id) || id <= 0) return Response.json({ ok: false }, { status: 400 });
    const isVideo = kind === 'video';
    const item = `${isVideo ? 'v' : 'a'}:${id}`;
    if (throttled(`${clientIp(req)}:${item}`)) return Response.json({ ok: true });
    if (isVideo) {
      if ((await isPublicVideo(id)) && !overItemCap(item)) await recordVideoView(id);
    } else if ((await isPublicArticle(id)) && !overItemCap(item)) {
      await recordView(id);
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
