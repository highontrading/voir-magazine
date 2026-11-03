import { listPublished } from '@/lib/data/articles';
import { toCard } from '@/components/site/Card';
import { clampInt } from '@/lib/utils';

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const limit = clampInt(p.get('limit'), 12, 1, 48);
  const offset = clampInt(p.get('offset'), 0, 0, 1_000_000);
  const items = await listPublished({
    section: p.get('section') || undefined,
    tag: p.get('tag') || undefined,
    author: p.get('author') || undefined,
    type: p.get('type') || undefined,
    limit,
    offset,
  });
  return Response.json({ items: items.map(toCard) });
}
