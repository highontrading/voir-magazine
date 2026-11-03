import { currentUser } from '@/lib/auth';
import { mediaPage } from '@/lib/data/admin';

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const u = new URL(req.url);
  const page = Math.max(1, parseInt(u.searchParams.get('page') || '1', 10) || 1);
  const data = await mediaPage({ q: u.searchParams.get('q') || undefined, kind: u.searchParams.get('kind') || undefined, page, perPage: 48 });
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
