import { currentUser, can } from '@/lib/auth';
import { allSubscribers } from '@/lib/data/admin';

function csvCell(v: string | number) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return new Response('Not signed in', { status: 401 });
  if (!can(user, 'audience.manage')) return new Response('Forbidden', { status: 403 });
  const u = new URL(req.url);
  const list = parseInt(u.searchParams.get('list') || '', 10);
  const rows = await allSubscribers(Number.isFinite(list) && list > 0 ? list : undefined, u.searchParams.get('q') || undefined);
  const lines = [['email', 'newsletter', 'source', 'subscribed_at'].join(',')];
  for (const r of rows) lines.push([r.email, r.newsletter_name ?? '', r.source, r.created_at].map(csvCell).join(','));
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(lines.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="voirtales-subscribers-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
