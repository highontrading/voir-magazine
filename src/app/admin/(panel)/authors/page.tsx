import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listAuthors } from '@/lib/data/taxonomy';
import { authorArticleTotals } from '@/lib/data/admin';
import { Avatar, EmptyState, PageHeader, sp, type SearchParams } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { ActionButton } from '@/components/admin/ActionForm';
import { deleteAuthorAction, moveAuthorAction } from './actions';

export const metadata = { title: 'Authors' };

export default async function AuthorsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser('content.manage');
  const q = sp((await searchParams).q).toLowerCase();
  const all = listAuthors();
  const authors = q ? all.filter((a) => `${a.name} ${a.title} ${a.email}`.toLowerCase().includes(q)) : all;
  const totals = authorArticleTotals();
  return (
    <>
      <PageHeader
        title="Authors"
        subtitle="Writers, editors and contributors who appear in bylines and on the masthead."
        actions={
          <Link className="adm-btn adm-btn-primary" href="/admin/authors/new">
            <Icon name="plus" size={14} /> New contributor
          </Link>
        }
      />
      <form className="adm-filters" method="get">
        <div className="adm-search">
          <Icon name="search" />
          <input type="search" name="q" defaultValue={q} placeholder="Search contributors…" />
        </div>
        <button className="adm-btn" type="submit">
          Search
        </button>
      </form>
      <div className="adm-card adm-table-card">
        {authors.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  {!q && <th style={{ width: 64 }}>Order</th>}
                  <th>Contributor</th>
                  <th className="adm-hide-md">Contact</th>
                  <th>Masthead</th>
                  <th className="is-num">Stories</th>
                  <th className="is-actions" />
                </tr>
              </thead>
              <tbody>
                {authors.map((a) => (
                  <tr key={a.id}>
                    {!q && (
                      <td>
                        <div className="adm-row-actions" style={{ justifyContent: 'flex-start' }}>
                          <ActionButton action={moveAuthorAction} fields={{ id: a.id, dir: -1 }} className="adm-icon-btn adm-icon-btn-xs" title="Move up">
                            <Icon name="up" size={12} />
                          </ActionButton>
                          <ActionButton action={moveAuthorAction} fields={{ id: a.id, dir: 1 }} className="adm-icon-btn adm-icon-btn-xs" title="Move down">
                            <Icon name="down" size={12} />
                          </ActionButton>
                        </div>
                      </td>
                    )}
                    <td>
                      <div className="adm-story-cell" style={{ minWidth: 220 }}>
                        <Avatar name={a.name} src={a.photo} size={38} />
                        <div>
                          <Link href={`/admin/authors/${a.id}`} className="adm-cell-title">
                            {a.name}
                          </Link>
                          <span className="adm-cell-sub">{a.title || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="adm-hide-md adm-muted adm-small">
                      {a.email || '—'}
                      {a.twitter && <div>x.com/{a.twitter}</div>}
                    </td>
                    <td>{a.on_masthead ? <span className="adm-pill is-active">Listed</span> : <span className="adm-pill is-inactive">Hidden</span>}</td>
                    <td className="is-num">
                      {a.article_count}
                      {totals[a.id] && totals[a.id] !== a.article_count ? <span className="adm-muted adm-small"> / {totals[a.id]}</span> : null}
                    </td>
                    <td className="is-actions">
                      <div className="adm-row-actions">
                        <a className="adm-icon-btn" href={`/contributor/${a.slug}`} target="_blank" rel="noreferrer" title="View on site">
                          <Icon name="external" size={15} />
                        </a>
                        <Link className="adm-icon-btn" href={`/admin/authors/${a.id}`} title="Edit">
                          <Icon name="edit" size={15} />
                        </Link>
                        <ActionButton action={deleteAuthorAction} fields={{ id: a.id }} className="adm-icon-btn" danger title="Delete" confirm={`Remove ${a.name}? Their byline will be removed from ${totals[a.id] ?? 0} stories.`}>
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
          <EmptyState icon="authors" title={q ? 'No contributors match' : 'No contributors yet'} action={!q && <Link className="adm-btn adm-btn-primary" href="/admin/authors/new">Add contributor</Link>} />
        )}
      </div>
    </>
  );
}
