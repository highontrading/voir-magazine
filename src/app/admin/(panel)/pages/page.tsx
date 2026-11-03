import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listPages } from '@/lib/data/content';
import { timeAgo } from '@/lib/utils';
import { EmptyState, PageHeader, StatusPill } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { ActionButton } from '@/components/admin/ActionForm';
import { deletePageAction } from './actions';

export const metadata = { title: 'Pages' };

export default async function PagesPage() {
  await requireUser('content.manage');
  const pages = await listPages();
  return (
    <>
      <PageHeader
        title="Pages"
        subtitle="Static pages such as About, Contact, Privacy Policy and Terms. Each lives at /{slug}."
        actions={
          <Link className="adm-btn adm-btn-primary" href="/admin/pages/new">
            <Icon name="plus" size={14} /> New page
          </Link>
        }
      />
      <div className="adm-card adm-table-card">
        {pages.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Status</th>
                  <th className="adm-hide-sm">Updated</th>
                  <th className="is-actions" />
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/pages/${p.id}`} className="adm-cell-title">
                        {p.title}
                      </Link>
                      <span className="adm-cell-sub">/{p.slug}</span>
                    </td>
                    <td>
                      <StatusPill status={p.status} />
                    </td>
                    <td className="adm-hide-sm adm-muted">{timeAgo(p.updated_at)}</td>
                    <td className="is-actions">
                      <div className="adm-row-actions">
                        <a className="adm-icon-btn" href={`/${p.slug}`} target="_blank" rel="noreferrer" title="View on site">
                          <Icon name="external" size={15} />
                        </a>
                        <Link className="adm-icon-btn" href={`/admin/pages/${p.id}`} title="Edit">
                          <Icon name="edit" size={15} />
                        </Link>
                        <ActionButton action={deletePageAction} fields={{ id: p.id }} className="adm-icon-btn" danger title="Delete" confirm={`Delete the page “${p.title}”? Links to /${p.slug} will stop working.`}>
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
          <EmptyState icon="pages" title="No pages yet" action={<Link className="adm-btn adm-btn-primary" href="/admin/pages/new">New page</Link>} />
        )}
      </div>
    </>
  );
}
