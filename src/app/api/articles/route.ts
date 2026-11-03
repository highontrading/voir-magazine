import { listPublished } from '@/lib/data/articles';
import { toCard } from '@/components/site/Card';

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const limit = Math.min(48, Math.max(1, Number(p.get('limit')) || 12));
  const offset = Math.max(0, Number(p.get('offset')) || 0);
  const items = listPublished({
    section: p.get('section') || undefined,
    tag: p.get('tag') || undefined,
    author: p.get('author') || undefined,
    type: p.get('type') || undefined,
    limit,
    offset,
  });
  return Response.json({ items: items.map(toCard) });
}
