import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getPodcastById, listEpisodes } from '@/lib/data/content';
import { formatDate } from '@/lib/utils';
import { Card, EmptyState, PageHeader, StatusPill } from '@/components/admin/ui';
import { ActionButton, ActionForm, FieldError, SubmitButton } from '@/components/admin/ActionForm';
import { TitleSlugFields, Toggle } from '@/components/admin/Fields';
import { MediaField } from '@/components/admin/MediaField';
import { Icon } from '@/components/admin/Icon';
import { deleteEpisodeAction, deletePodcastAction, savePodcastAction } from '../actions';

export const metadata = { title: 'Podcast' };

export default async function PodcastEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('content.manage');
  const { id } = await params;
  const p = id === 'new' ? null : await getPodcastById(Number(id));
  if (id !== 'new' && !p) notFound();
  const episodes = p ? await listEpisodes(p.id, false, 1000) : [];
  const now = new Date().toISOString();
  return (
    <>
      <PageHeader
        back={{ href: '/admin/podcasts', label: 'Podcasts' }}
        title={p ? p.title : 'New show'}
        subtitle={p ? `${episodes.length} episodes` : undefined}
        actions={
          p && (
            <>
              <a className="adm-btn" href={`/podcasts/${p.slug}`} target="_blank" rel="noreferrer">
                <Icon name="external" size={14} /> View
              </a>
              <ActionButton action={deletePodcastAction} fields={{ id: p.id }} className="adm-btn" danger confirm={`Delete “${p.title}” and all of its episodes?`}>
                <Icon name="trash" size={14} /> Delete show
              </ActionButton>
            </>
          )
        }
      />
      {p && (
        <Card
          title="Episodes"
          pad={false}
          className="adm-table-card"
          actions={
            <Link className="adm-btn adm-btn-sm adm-btn-primary" href={`/admin/podcasts/${p.id}/episodes/new`}>
              <Icon name="plus" size={13} /> New episode
            </Link>
          }
        >
          {episodes.length ? (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Episode</th>
                    <th>Status</th>
                    <th className="adm-hide-sm">Duration</th>
                    <th className="adm-hide-md">Published</th>
                    <th className="is-actions" />
                  </tr>
                </thead>
                <tbody>
                  {episodes.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <Link href={`/admin/podcasts/${p.id}/episodes/${e.id}`} className="adm-cell-title">
                          {e.title}
                        </Link>
                        <span className="adm-cell-sub">/podcasts/{p.slug}/{e.slug}</span>
                      </td>
                      <td>{e.status === 'published' && e.published_at && e.published_at > now ? <StatusPill status="scheduled" /> : <StatusPill status={e.status} />}</td>
                      <td className="adm-hide-sm">{e.duration || '—'}</td>
                      <td className="adm-hide-md adm-nowrap">{formatDate(e.published_at, 'short')}</td>
                      <td className="is-actions">
                        <div className="adm-row-actions">
                          <Link className="adm-icon-btn" href={`/admin/podcasts/${p.id}/episodes/${e.id}`} title="Edit">
                            <Icon name="edit" size={15} />
                          </Link>
                          <ActionButton action={deleteEpisodeAction} fields={{ id: e.id }} className="adm-icon-btn" danger title="Delete" confirm={`Delete the episode “${e.title}”?`}>
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
            <EmptyState icon="music" title="No episodes yet" action={<Link className="adm-btn adm-btn-primary" href={`/admin/podcasts/${p.id}/episodes/new`}>Add the first episode</Link>} />
          )}
        </Card>
      )}
      <div style={{ height: 18 }} />
      <ActionForm action={savePodcastAction} warnUnsaved>
        <input type="hidden" name="id" value={p?.id ?? ''} />
        <div className="adm-grid-2-1">
          <div className="adm-card">
            <div className="adm-card-head">
              <h2>Show details</h2>
            </div>
            <div className="adm-card-body adm-stack">
              <TitleSlugFields defaultTitle={p?.title} defaultSlug={p?.slug} prefix="/podcasts/" titleLabel="Show title" />
              <label className="adm-field">
                <span className="adm-label">Host(s)</span>
                <input className="adm-input" name="host" defaultValue={p?.host} />
              </label>
              <label className="adm-field">
                <span className="adm-label">Description</span>
                <textarea className="adm-input" name="description" rows={4} defaultValue={p?.description} />
              </label>
              <div className="adm-form-grid">
                <label className="adm-field">
                  <span className="adm-label">Apple Podcasts URL</span>
                  <input className="adm-input" name="apple_url" defaultValue={p?.apple_url} placeholder="https://podcasts.apple.com/…" />
                  <FieldError name="apple_url" />
                </label>
                <label className="adm-field">
                  <span className="adm-label">Spotify URL</span>
                  <input className="adm-input" name="spotify_url" defaultValue={p?.spotify_url} placeholder="https://open.spotify.com/…" />
                  <FieldError name="spotify_url" />
                </label>
              </div>
              <div className="adm-form-grid">
                <label className="adm-field">
                  <span className="adm-label">Position</span>
                  <input className="adm-input" type="number" name="position" defaultValue={p?.position ?? ''} placeholder="Auto" />
                </label>
                <div className="adm-field" style={{ justifyContent: 'flex-end' }}>
                  <Toggle name="active" label="Active" hint="Shown on the Listen page" defaultChecked={p ? !!p.active : true} />
                </div>
              </div>
            </div>
          </div>
          <div className="adm-card adm-card-body">
            <MediaField name="cover_image" label="Cover art" defaultValue={p?.cover_image} aspect="square" />
          </div>
        </div>
        <div className="adm-sticky-actions">
          <SubmitButton>{p ? 'Save show' : 'Create show'}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
