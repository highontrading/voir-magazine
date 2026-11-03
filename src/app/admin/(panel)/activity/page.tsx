import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { activityEntities, activityPage } from '@/lib/data/admin';
import { listUsers } from '@/lib/data/site';
import { timeAgo } from '@/lib/utils';
import { Avatar, EmptyState, PageHeader, Pagination, sp, type SearchParams } from '@/components/admin/ui';

export const metadata = { title: 'Activity log' };

const LINKS: Record<string, (id: number) => string> = {
  article: (id) => `/admin/articles/${id}`,
  section: (id) => `/admin/sections/${id}`,
  author: (id) => `/admin/authors/${id}`,
  issue: (id) => `/admin/issues/${id}`,
  video: (id) => `/admin/videos/${id}`,
  podcast: (id) => `/admin/podcasts/${id}`,
  page: (id) => `/admin/pages/${id}`,
  newsletter: (id) => `/admin/newsletters/${id}`,
  plan: (id) => `/admin/subscriptions/plans/${id}`,
  user: (id) => `/admin/users/${id}`,
};

function when(iso: string) {
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

export default async function ActivityPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser('content.manage');
  const s = await searchParams;
  const params = { entity: sp(s.entity), user: sp(s.user), page: sp(s.page) };
  const data = activityPage(Number(params.page) || 1, 40, { entity: params.entity || undefined, userId: Number(params.user) || undefined });
  const users = listUsers();
  return (
    <>
      <PageHeader title="Activity log" subtitle="An audit trail of changes made in the admin." />
      <form className="adm-filters" method="get">
        <select className="adm-input" name="entity" defaultValue={params.entity} aria-label="Type">
          <option value="">Everything</option>
          {activityEntities().map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select className="adm-input" name="user" defaultValue={params.user} aria-label="User">
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button className="adm-btn" type="submit">
          Filter
        </button>
        {(params.entity || params.user) && (
          <Link className="adm-btn adm-btn-ghost" href="/admin/activity">
            Clear
          </Link>
        )}
      </form>
      <div className="adm-card adm-table-card">
        {data.items.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Who</th>
                  <th>What</th>
                  <th className="adm-hide-sm">When</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => {
                  const link = a.entity_id && LINKS[a.entity] ? LINKS[a.entity]!(a.entity_id) : null;
                  return (
                    <tr key={a.id}>
                      <td className="adm-nowrap">
                        <span className="adm-row" style={{ gap: 8 }}>
                          <Avatar name={a.user_name ?? 'System'} size={26} />
                          {a.user_name ?? <span className="adm-muted">System</span>}
                        </span>
                      </td>
                      <td>
                        {a.action} <span className="adm-block-type">{a.entity}</span>{' '}
                        {a.label && (link ? <Link className="adm-link" href={link}>{a.label}</Link> : <em>{a.label}</em>)}
                      </td>
                      <td className="adm-hide-sm adm-nowrap adm-muted" title={when(a.created_at)}>
                        {timeAgo(a.created_at.includes('T') ? a.created_at : a.created_at.replace(' ', 'T') + 'Z')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="activity" title="No activity recorded" />
        )}
      </div>
      <Pagination base="/admin/activity" params={params} page={data.page} pages={data.pages} total={data.total} noun="events" />
    </>
  );
}
