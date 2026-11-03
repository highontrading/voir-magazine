import { recordView } from '@/lib/data/articles';
import { recordVideoView } from '@/lib/data/content';

export async function POST(req: Request) {
  try {
    const { id, kind } = (await req.json()) as { id: number; kind?: string };
    if (!Number.isInteger(id) || id <= 0) return Response.json({ ok: false }, { status: 400 });
    if (kind === 'video') recordVideoView(id);
    else recordView(id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
