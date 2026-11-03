import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listPodcasts } from '@/lib/data/content';
import { episodeCountsByPodcast } from '@/lib/data/admin';
import { EmptyState, PageHeader } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { ActionButton } from '@/components/admin/ActionForm';
import { deletePodcastAction, movePodcastAction } from './actions';

export const metadata = { title: 'Podcasts' };

export default async function PodcastsPage() {
  await requireUser('content.manage');
  const shows = listPodcasts(false);
  const totals = episodeCountsByPodcast();
  return (
    <>
      <PageHeader
        title="Podcasts"
        subtitle="Audio shows and their episodes."
        actions={
          <Link className="adm-btn adm-btn-primary" href="/admin/podcasts/new">
            <Icon name="plus" size={14} /> New show
          </Link>
        }
      />
      <div className="adm-card adm-table-card">
        {shows.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: 64 }}>Order</th>
                  <th>Show</th>
                  <th className="adm-hide-md">Host</th>
                  <th>Status</th>
                  <th className="is-num">Episodes</th>
                  <th className="is-actions" />
                </tr>
              </thead>
              <tbody>
                {shows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="adm-row-actions" style={{ justifyContent: 'flex-start' }}>
                        <ActionButton action={movePodcastAction} fields={{ id: p.id, dir: -1 }} className="adm-icon-btn adm-icon-btn-xs" title="Move up">
                          <Icon name="up" size={12} />
                        </ActionButton>
                        <ActionButton action={movePodcastAction} fields={{ id: p.id, dir: 1 }} className="adm-icon-btn adm-icon-btn-xs" title="Move down">
                          <Icon name="down" size={12} />
                        </ActionButton>
                      </div>
                    </td>
                    <td>
                      <div className="adm-story-cell">
                        <div className="adm-thumb" style={{ width: 44, height: 44 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {p.cover_image ? <img src={p.cover_image} alt="" /> : <Icon name="podcast" size={16} />}
                        </div>
                        <div>
                          <Link href={`/admin/podcasts/${p.id}`} className="adm-cell-title">
                            {p.title}
                          </Link>
                          <span className="adm-cell-sub">/podcasts/{p.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="adm-hide-md">{p.host || <span className="adm-muted">—</span>}</td>
                    <td>{p.active ? <span className="adm-pill is-active">Active</span> : <span className="adm-pill is-inactive">Hidden</span>}</td>
                    <td className="is-num">
                      {p.episode_count}
                      {totals[p.id] && totals[p.id] !== p.episode_count ? <span className="adm-muted adm-small"> / {totals[p.id]}</span> : null}
                    </td>
                    <td className="is-actions">
                      <div className="adm-row-actions">
                        <Link className="adm-btn adm-btn-sm" href={`/admin/podcasts/${p.id}`}>
                          Episodes
                        </Link>
                        <a className="adm-icon-btn" href={`/podcasts/${p.slug}`} target="_blank" rel="noreferrer" title="View on site">
                          <Icon name="external" size={15} />
                        </a>
                        <ActionButton action={deletePodcastAction} fields={{ id: p.id }} className="adm-icon-btn" danger title="Delete" confirm={`Delete “${p.title}” and all ${totals[p.id] ?? 0} of its episodes?`}>
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
          <EmptyState icon="podcast" title="No shows yet" action={<Link className="adm-btn adm-btn-primary" href="/admin/podcasts/new">New show</Link>} />
        )}
      </div>
    </>
  );
}
