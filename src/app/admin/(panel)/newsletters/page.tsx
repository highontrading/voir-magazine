import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listNewsletters, listSubscribers } from '@/lib/data/site';
import { timeAgo } from '@/lib/utils';
import { EmptyState, PageHeader, Pagination, hrefWith, sp, type SearchParams } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { addSubscriberAction, deleteNewsletterAction, deleteSubscriberAction, moveNewsletterAction } from './actions';

export const metadata = { title: 'Newsletters' };
const PER = 50;

export default async function NewslettersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser('audience.manage');
  const s = await searchParams;
  const tab = sp(s.tab) === 'subscribers' ? 'subscribers' : 'lists';
  const params = { tab, q: sp(s.q), list: sp(s.list), page: sp(s.page) };
  const page = Math.max(1, Number(params.page) || 1);
  const [lists, subs] = await Promise.all([
    listNewsletters(false),
    tab === 'subscribers' ? listSubscribers({ q: params.q || undefined, newsletterId: Number(params.list) || undefined, limit: PER, offset: (page - 1) * PER }) : null,
  ]);
  const totalSubs = lists.reduce((n, l) => n + (l.subscriber_count ?? 0), 0);
  const exportHref = `/api/admin/export/subscribers?${new URLSearchParams({ ...(params.list ? { list: params.list } : {}), ...(params.q ? { q: params.q } : {}) })}`;

  return (
    <>
      <PageHeader
        title="Newsletters"
        subtitle="Email lists readers can sign up to, and everyone who has."
        actions={
          tab === 'lists' ? (
            <Link className="adm-btn adm-btn-primary" href="/admin/newsletters/new">
              <Icon name="plus" size={14} /> New newsletter
            </Link>
          ) : (
            <a className="adm-btn" href={exportHref}>
              <Icon name="download" size={14} /> Export CSV
            </a>
          )
        }
      />
      <nav className="adm-tabs">
        <Link href="/admin/newsletters" className={tab === 'lists' ? 'is-active' : ''}>
          Lists <span className="adm-tab-count">{lists.length}</span>
        </Link>
        <Link href="/admin/newsletters?tab=subscribers" className={tab === 'subscribers' ? 'is-active' : ''}>
          Subscribers <span className="adm-tab-count">{totalSubs}</span>
        </Link>
      </nav>

      {tab === 'lists' ? (
        <div className="adm-card adm-table-card">
          {lists.length ? (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>Order</th>
                    <th>Newsletter</th>
                    <th className="adm-hide-md">Frequency</th>
                    <th>Status</th>
                    <th className="is-num">Subscribers</th>
                    <th className="is-actions" />
                  </tr>
                </thead>
                <tbody>
                  {lists.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <div className="adm-row-actions" style={{ justifyContent: 'flex-start' }}>
                          <ActionButton action={moveNewsletterAction} fields={{ id: n.id, dir: -1 }} className="adm-icon-btn adm-icon-btn-xs" title="Move up">
                            <Icon name="up" size={12} />
                          </ActionButton>
                          <ActionButton action={moveNewsletterAction} fields={{ id: n.id, dir: 1 }} className="adm-icon-btn adm-icon-btn-xs" title="Move down">
                            <Icon name="down" size={12} />
                          </ActionButton>
                        </div>
                      </td>
                      <td>
                        <Link href={`/admin/newsletters/${n.id}`} className="adm-cell-title">
                          {n.name}
                        </Link>
                        <span className="adm-cell-sub" style={{ maxWidth: 420 }}>
                          {n.description}
                        </span>
                      </td>
                      <td className="adm-hide-md">{n.frequency || '—'}</td>
                      <td>{n.active ? <span className="adm-pill is-active">Active</span> : <span className="adm-pill is-inactive">Paused</span>}</td>
                      <td className="is-num">
                        <Link href={`/admin/newsletters?tab=subscribers&list=${n.id}`} className="adm-link">
                          {n.subscriber_count}
                        </Link>
                      </td>
                      <td className="is-actions">
                        <div className="adm-row-actions">
                          <Link className="adm-icon-btn" href={`/admin/newsletters/${n.id}`} title="Edit">
                            <Icon name="edit" size={15} />
                          </Link>
                          <ActionButton action={deleteNewsletterAction} fields={{ id: n.id }} className="adm-icon-btn" danger title="Delete" confirm={`Delete “${n.name}”? Its ${n.subscriber_count} subscribers will be removed from this list.`}>
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
            <EmptyState icon="mail" title="No newsletters yet" action={<Link className="adm-btn adm-btn-primary" href="/admin/newsletters/new">New newsletter</Link>} />
          )}
        </div>
      ) : (
        <div className="adm-grid-2-1">
          <div>
            <form className="adm-filters" method="get">
              <input type="hidden" name="tab" value="subscribers" />
              <div className="adm-search">
                <Icon name="search" />
                <input type="search" name="q" defaultValue={params.q} placeholder="Search by email…" />
              </div>
              <select className="adm-input" name="list" defaultValue={params.list} aria-label="Newsletter">
                <option value="">All lists</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <button className="adm-btn" type="submit">
                Filter
              </button>
              {(params.q || params.list) && (
                <Link href="/admin/newsletters?tab=subscribers" className="adm-btn adm-btn-ghost">
                  Clear
                </Link>
              )}
            </form>
            <div className="adm-card adm-table-card">
              {subs && subs.items.length ? (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Newsletter</th>
                        <th className="adm-hide-sm">Source</th>
                        <th className="adm-hide-md">Subscribed</th>
                        <th className="is-actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {subs.items.map((r) => (
                        <tr key={r.id}>
                          <td className="adm-cell-title">{r.email}</td>
                          <td>{r.newsletter_name}</td>
                          <td className="adm-hide-sm adm-muted">{r.source || '—'}</td>
                          <td className="adm-hide-md adm-muted adm-nowrap">{timeAgo(r.created_at)}</td>
                          <td className="is-actions">
                            <ActionButton action={deleteSubscriberAction} fields={{ id: r.id }} className="adm-icon-btn" danger title="Remove" confirm={`Remove ${r.email} from ${r.newsletter_name}?`} confirmLabel="Remove">
                              <Icon name="trash" size={15} />
                            </ActionButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon="mail" title={params.q || params.list ? 'No subscribers match' : 'No subscribers yet'} />
              )}
            </div>
            {subs && <Pagination base="/admin/newsletters" params={params} page={page} pages={Math.max(1, Math.ceil(subs.total / PER))} total={subs.total} noun="subscriptions" />}
          </div>
          <div className="adm-card">
            <div className="adm-card-head">
              <h2>Add subscriber</h2>
            </div>
            <ActionForm action={addSubscriberAction} resetOnSuccess className="adm-card-body adm-stack">
              <label className="adm-field">
                <span className="adm-label">
                  Email<em>*</em>
                </span>
                <input className="adm-input" type="email" name="email" required placeholder="reader@example.com" />
              </label>
              <div className="adm-field">
                <span className="adm-label">Newsletters</span>
                <div className="adm-stack-sm">
                  {lists.map((l, i) => (
                    <label key={l.id} className="adm-check">
                      <input type="checkbox" name="lists" value={l.id} defaultChecked={params.list ? String(l.id) === params.list : i === 0} />
                      {l.name}
                    </label>
                  ))}
                </div>
              </div>
              <SubmitButton>
                <Icon name="plus" size={14} /> Subscribe
              </SubmitButton>
              <a href={hrefWith('/api/admin/export/subscribers', {}, {})} className="adm-link adm-small">
                Download all {totalSubs} subscriptions as CSV
              </a>
            </ActionForm>
          </div>
        </div>
      )}
    </>
  );
}
