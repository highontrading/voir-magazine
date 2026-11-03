import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listPlans, listSubscriptions } from '@/lib/data/site';
import { subscriptionCounts } from '@/lib/data/admin';
import { formatDate } from '@/lib/utils';
import { EmptyState, PageHeader, Pagination, StatusPill, sp, type SearchParams } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { deleteOrderAction, deletePlanAction, movePlanAction, updateOrderAction } from './actions';

export const metadata = { title: 'Subscriptions' };
const PER = 25;

function features(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export default async function SubscriptionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser('audience.manage');
  const s = await searchParams;
  const tab = sp(s.tab) === 'plans' ? 'plans' : 'orders';
  const status = sp(s.status);
  const q = sp(s.q).toLowerCase();
  const page = Math.max(1, Number(sp(s.page)) || 1);
  const counts = subscriptionCounts();
  const plans = listPlans(false);
  const orders = tab === 'orders' ? listSubscriptions(status || undefined).filter((o) => !q || `${o.name} ${o.email} ${o.city} ${o.country}`.toLowerCase().includes(q)) : [];
  const pages = Math.max(1, Math.ceil(orders.length / PER));
  const rows = orders.slice((page - 1) * PER, page * PER);

  return (
    <>
      <PageHeader
        title="Subscriptions"
        subtitle="Print + digital subscription plans and the orders readers place."
        actions={
          tab === 'plans' && (
            <Link className="adm-btn adm-btn-primary" href="/admin/subscriptions/plans/new">
              <Icon name="plus" size={14} /> New plan
            </Link>
          )
        }
      />
      <nav className="adm-tabs">
        <Link href="/admin/subscriptions" className={tab === 'orders' && !status ? 'is-active' : ''}>
          All orders <span className="adm-tab-count">{counts.all}</span>
        </Link>
        {(['pending', 'active', 'cancelled'] as const).map((st) => (
          <Link key={st} href={`/admin/subscriptions?status=${st}`} className={tab === 'orders' && status === st ? 'is-active' : ''}>
            {st[0]!.toUpperCase() + st.slice(1)} <span className="adm-tab-count">{counts[st]}</span>
          </Link>
        ))}
        <Link href="/admin/subscriptions?tab=plans" className={tab === 'plans' ? 'is-active' : ''}>
          Plans <span className="adm-tab-count">{plans.length}</span>
        </Link>
      </nav>

      {tab === 'plans' ? (
        plans.length ? (
          <div className="adm-grid-3">
            {plans.map((p, i) => (
              <div key={p.id} className={`adm-card adm-plan-card ${p.highlighted ? 'is-highlight' : ''}`}>
                <div className="adm-card-head">
                  <h2>
                    {p.name} {p.badge && <span className="adm-pill is-review">{p.badge}</span>}
                  </h2>
                  {p.active ? <span className="adm-pill is-active">Active</span> : <span className="adm-pill is-inactive">Hidden</span>}
                </div>
                <div className="adm-card-body adm-stack-sm">
                  <div className="adm-plan-price">
                    {p.price} <small>/ {p.interval}</small>
                  </div>
                  <p className="adm-muted adm-small">{p.description}</p>
                  <ul className="adm-plan-features">
                    {features(p.features).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <div className="adm-row-between" style={{ marginTop: 8 }}>
                    <div className="adm-row-actions">
                      <ActionButton action={movePlanAction} fields={{ id: p.id, dir: -1 }} className="adm-icon-btn" title="Move left">
                        <Icon name="up" size={14} />
                      </ActionButton>
                      <ActionButton action={movePlanAction} fields={{ id: p.id, dir: 1 }} className="adm-icon-btn" title="Move right">
                        <Icon name="down" size={14} />
                      </ActionButton>
                      <span className="adm-muted adm-small">#{i + 1}</span>
                    </div>
                    <div className="adm-row-actions">
                      <Link className="adm-btn adm-btn-sm" href={`/admin/subscriptions/plans/${p.id}`}>
                        <Icon name="edit" size={13} /> Edit
                      </Link>
                      <ActionButton action={deletePlanAction} fields={{ id: p.id }} className="adm-icon-btn" danger title="Delete" confirm={`Delete the “${p.name}” plan? Existing orders keep their details.`}>
                        <Icon name="trash" size={15} />
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="adm-card">
            <EmptyState icon="card" title="No plans yet" action={<Link className="adm-btn adm-btn-primary" href="/admin/subscriptions/plans/new">New plan</Link>} />
          </div>
        )
      ) : (
        <>
          <form className="adm-filters" method="get">
            {status && <input type="hidden" name="status" value={status} />}
            <div className="adm-search">
              <Icon name="search" />
              <input type="search" name="q" defaultValue={q} placeholder="Search name, email, city…" />
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
                      <th>Subscriber</th>
                      <th>Plan</th>
                      <th className="adm-hide-md">Address</th>
                      <th className="adm-hide-sm">Ordered</th>
                      <th>Status</th>
                      <th className="is-actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <span className="adm-cell-title">{o.name}</span>
                          <a className="adm-cell-sub" href={`mailto:${o.email}`}>
                            {o.email}
                          </a>
                        </td>
                        <td>{o.plan_name ?? <span className="adm-muted">Deleted plan</span>}</td>
                        <td className="adm-hide-md adm-small">
                          {[o.address, o.city, o.postal_code, o.country].filter(Boolean).join(', ') || <span className="adm-muted">Digital only</span>}
                        </td>
                        <td className="adm-hide-sm adm-nowrap">{formatDate(o.created_at, 'short')}</td>
                        <td>
                          <StatusPill status={o.status} />
                        </td>
                        <td className="is-actions">
                          <details className="adm-order-details">
                            <summary className="adm-btn adm-btn-sm">Manage</summary>
                            <div className="adm-order-pop">
                              <ActionForm action={updateOrderAction} className="adm-stack-sm">
                                <input type="hidden" name="id" value={o.id} />
                                <label className="adm-field">
                                  <span className="adm-label">Status</span>
                                  <select className="adm-input" name="status" defaultValue={o.status}>
                                    <option value="pending">Pending</option>
                                    <option value="active">Active</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </label>
                                <label className="adm-field">
                                  <span className="adm-label">Internal notes</span>
                                  <textarea className="adm-input" name="notes" rows={3} defaultValue={o.notes} placeholder="Payment reference, delivery notes…" />
                                </label>
                                <SubmitButton className="adm-btn adm-btn-primary adm-btn-sm">Save</SubmitButton>
                              </ActionForm>
                              <hr className="adm-divider" />
                              <ActionButton action={deleteOrderAction} fields={{ id: o.id }} className="adm-btn adm-btn-sm" danger confirm={`Delete the subscription order from ${o.name}?`}>
                                <Icon name="trash" size={13} /> Delete order
                              </ActionButton>
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="card" title={q || status ? 'No orders match' : 'No subscription orders yet'} text="Orders placed on the Subscribe page appear here." />
            )}
          </div>
          <Pagination base="/admin/subscriptions" params={{ status, q }} page={page} pages={pages} total={orders.length} noun="orders" />
        </>
      )}
    </>
  );
}
