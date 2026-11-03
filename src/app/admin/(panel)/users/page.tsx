import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listUsers } from '@/lib/data/site';
import { all } from '@/lib/db';
import { timeAgo } from '@/lib/utils';
import { Avatar, PageHeader, StatusPill } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { ActionButton } from '@/components/admin/ActionForm';
import { deleteUserAction } from './actions';

export const metadata = { title: 'Users' };

export default async function UsersPage() {
  const me = await requireUser('users.manage');
  const [users, totals] = await Promise.all([
    listUsers(),
    all<{ created_by: number; n: number }>('SELECT created_by, COUNT(*) AS n FROM articles WHERE created_by IS NOT NULL GROUP BY created_by'),
  ]);
  const counts = Object.fromEntries(totals.map((r) => [r.created_by, r.n]));
  return (
    <>
      <PageHeader
        title="Users"
        subtitle="People who can sign in to this admin. Admins manage everything; editors publish and manage content; writers draft their own stories."
        actions={
          <Link className="adm-btn adm-btn-primary" href="/admin/users/new">
            <Icon name="plus" size={14} /> Add user
          </Link>
        }
      />
      <div className="adm-card adm-table-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th className="adm-hide-sm is-num">Stories</th>
                <th className="adm-hide-md">Last sign-in</th>
                <th className="is-actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="adm-story-cell" style={{ minWidth: 220 }}>
                      <Avatar name={u.name} src={u.avatar} size={34} />
                      <div>
                        <Link href={`/admin/users/${u.id}`} className="adm-cell-title">
                          {u.name} {u.id === me.id && <span className="adm-muted adm-small">(you)</span>}
                        </Link>
                        <span className="adm-cell-sub">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <StatusPill status={u.role} />
                  </td>
                  <td>{u.active ? <span className="adm-pill is-active">Active</span> : <span className="adm-pill is-inactive">Disabled</span>}</td>
                  <td className="adm-hide-sm is-num">{counts[u.id] ?? 0}</td>
                  <td className="adm-hide-md adm-muted">{u.last_login ? timeAgo(u.last_login) : 'Never'}</td>
                  <td className="is-actions">
                    <div className="adm-row-actions">
                      <Link className="adm-icon-btn" href={u.id === me.id ? '/admin/profile' : `/admin/users/${u.id}`} title="Edit">
                        <Icon name="edit" size={15} />
                      </Link>
                      {u.id !== me.id && (
                        <ActionButton action={deleteUserAction} fields={{ id: u.id }} className="adm-icon-btn" danger title="Delete" confirm={`Delete ${u.name}? They will lose access immediately; their stories are kept.`}>
                          <Icon name="trash" size={15} />
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
