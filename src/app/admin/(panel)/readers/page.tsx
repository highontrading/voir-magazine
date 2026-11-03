import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listReaders } from '@/lib/data/site';
import { formatDate } from '@/lib/utils';
import { Avatar, EmptyState, PageHeader, Pagination, hrefWith, sp, type SearchParams } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { ActionButton } from '@/components/admin/ActionForm';
import { deleteReaderAction, setReaderActiveAction } from './actions';

export const metadata = { title: 'Readers' };
const PER = 30;

export default async function ReadersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser('audience.manage');
  const s = await searchParams;
  const q = sp(s.q);
  const filter = sp(s.filter);
  const page = Math.max(1, Number(sp(s.page)) || 1);
  const everyone = listReaders(q || undefined);
  const list = filter === 'inactive' ? everyone.filter((r) => !r.active) : filter === 'active' ? everyone.filter((r) => r.active) : everyone;
  const rows = list.slice((page - 1) * PER, page * PER);
  return (
    <>
      <PageHeader title="Readers" subtitle="Public reader accounts used to save stories and manage newsletters." />
      <nav className="adm-tabs">
        {[
          ['', 'All', everyone.length],
          ['active', 'Active', everyone.filter((r) => r.active).length],
          ['inactive', 'Deactivated', everyone.filter((r) => !r.active).length],
        ].map(([k, l, n]) => (
          <Link key={String(k)} href={hrefWith('/admin/readers', { q }, { filter: String(k) })} className={filter === k ? 'is-active' : ''}>
            {l} <span className="adm-tab-count">{n}</span>
          </Link>
        ))}
      </nav>
      <form className="adm-filters" method="get">
        {filter && <input type="hidden" name="filter" value={filter} />}
        <div className="adm-search">
          <Icon name="search" />
          <input type="search" name="q" defaultValue={q} placeholder="Search by name or email…" />
        </div>
        <button className="adm-btn" type="submit">
          Search
        </button>
      </form>
      <div className="adm-card adm-table-card">
        {rows.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Reader</th>
                  <th className="is-num">Saved</th>
                  <th className="adm-hide-sm">Joined</th>
                  <th>Status</th>
                  <th className="is-actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="adm-story-cell" style={{ minWidth: 200 }}>
                        <Avatar name={r.name} size={34} />
                        <div>
                          <span className="adm-cell-title">{r.name}</span>
                          <a className="adm-cell-sub" href={`mailto:${r.email}`}>
                            {r.email}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="is-num">{r.saved_count ?? 0}</td>
                    <td className="adm-hide-sm adm-nowrap">{formatDate(r.created_at, 'short')}</td>
                    <td>{r.active ? <span className="adm-pill is-active">Active</span> : <span className="adm-pill is-inactive">Deactivated</span>}</td>
                    <td className="is-actions">
                      <div className="adm-row-actions">
                        {r.active ? (
                          <ActionButton action={setReaderActiveAction} fields={{ id: r.id, active: 0 }} className="adm-btn adm-btn-sm" confirm={`Deactivate ${r.email}? They will be signed out and unable to sign in.`} confirmLabel="Deactivate">
                            Deactivate
                          </ActionButton>
                        ) : (
                          <ActionButton action={setReaderActiveAction} fields={{ id: r.id, active: 1 }} className="adm-btn adm-btn-sm">
                            Activate
                          </ActionButton>
                        )}
                        <ActionButton action={deleteReaderAction} fields={{ id: r.id }} className="adm-icon-btn" danger title="Delete" confirm={`Permanently delete the account for ${r.email}, including their saved stories?`}>
                          <Icon name="trash" size={15} />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="readers" title={q || filter ? 'No readers match' : 'No reader accounts yet'} text="Readers sign up on the public site to save stories." />
        )}
      </div>
      <Pagination base="/admin/readers" params={{ q, filter }} page={page} pages={Math.max(1, Math.ceil(list.length / PER))} total={list.length} noun="readers" />
    </>
  );
}
