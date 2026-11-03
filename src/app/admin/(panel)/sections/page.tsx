import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listSections } from '@/lib/data/taxonomy';
import { sectionArticleTotals } from '@/lib/data/admin';
import { EmptyState, PageHeader } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { ActionButton } from '@/components/admin/ActionForm';
import { deleteSectionAction, moveSectionAction } from './actions';

export const metadata = { title: 'Sections' };

export default async function SectionsPage() {
  await requireUser('content.manage');
  const sections = listSections();
  const totals = sectionArticleTotals();
  return (
    <>
      <PageHeader
        title="Sections"
        subtitle="The magazine's departments. Order here sets the order in the site navigation."
        actions={
          <Link className="adm-btn adm-btn-primary" href="/admin/sections/new">
            <Icon name="plus" size={14} /> New section
          </Link>
        }
      />
      <div className="adm-card adm-table-card">
        {sections.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Order</th>
                  <th>Section</th>
                  <th className="adm-hide-md">Description</th>
                  <th>In nav</th>
                  <th className="is-num">Stories</th>
                  <th className="is-actions" />
                </tr>
              </thead>
              <tbody>
                {sections.map((s, i) => (
                  <tr key={s.id}>
                    <td>
                      <div className="adm-row-actions" style={{ justifyContent: 'flex-start' }}>
                        <ActionButton action={moveSectionAction} fields={{ id: s.id, dir: -1 }} className="adm-icon-btn adm-icon-btn-xs" title="Move up">
                          <Icon name="up" size={12} />
                        </ActionButton>
                        <ActionButton action={moveSectionAction} fields={{ id: s.id, dir: 1 }} className="adm-icon-btn adm-icon-btn-xs" title="Move down">
                          <Icon name="down" size={12} />
                        </ActionButton>
                        <span className="adm-muted adm-small">{i + 1}</span>
                      </div>
                    </td>
                    <td>
                      <Link href={`/admin/sections/${s.id}`} className="adm-cell-title">
                        <span className="adm-color-dot" style={{ background: s.color || '#ccc' }} />
                        {s.name}
                      </Link>
                      <span className="adm-cell-sub">/{s.slug}</span>
                    </td>
                    <td className="adm-hide-md adm-muted" style={{ maxWidth: 380 }}>
                      {s.description}
                    </td>
                    <td>{s.in_nav ? <span className="adm-pill is-active">Shown</span> : <span className="adm-pill is-inactive">Hidden</span>}</td>
                    <td className="is-num">
                      {s.article_count}
                      {totals[s.id] && totals[s.id] !== s.article_count ? <span className="adm-muted adm-small"> / {totals[s.id]}</span> : null}
                    </td>
                    <td className="is-actions">
                      <div className="adm-row-actions">
                        <a className="adm-icon-btn" href={`/${s.slug}`} target="_blank" rel="noreferrer" title="View on site">
                          <Icon name="external" size={15} />
                        </a>
                        <Link className="adm-icon-btn" href={`/admin/sections/${s.id}`} title="Edit">
                          <Icon name="edit" size={15} />
                        </Link>
                        <ActionButton action={deleteSectionAction} fields={{ id: s.id }} className="adm-icon-btn" danger title="Delete" confirm={`Delete the “${s.name}” section? Its ${totals[s.id] ?? 0} stories will become unsectioned.`}>
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
          <EmptyState icon="sections" title="No sections yet" text="Create sections like Hollywood, Style or Politics to organise stories." action={<Link className="adm-btn adm-btn-primary" href="/admin/sections/new">New section</Link>} />
        )}
      </div>
    </>
  );
}
