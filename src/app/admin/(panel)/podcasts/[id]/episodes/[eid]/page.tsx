import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getEpisodeById, getPodcastById } from '@/lib/data/content';
import { PageHeader } from '@/components/admin/ui';
import { ActionButton, ActionForm, FieldError, SubmitButton } from '@/components/admin/ActionForm';
import { DateTimeField, TitleSlugFields } from '@/components/admin/Fields';
import { MediaField } from '@/components/admin/MediaField';
import { PlayerField } from '@/components/admin/PlayerField';
import { Icon } from '@/components/admin/Icon';
import { deleteEpisodeAction, saveEpisodeAction } from '../../../actions';

export const metadata = { title: 'Edit episode' };

export default async function EpisodeEdit({ params }: { params: Promise<{ id: string; eid: string }> }) {
  await requireUser('content.manage');
  const { id, eid } = await params;
  const [p, e] = await Promise.all([getPodcastById(Number(id)), eid === 'new' ? null : getEpisodeById(Number(eid))]);
  if (!p) notFound();
  if ((eid !== 'new' && !e) || (e && e.podcast_id !== p.id)) notFound();
  return (
    <>
      <PageHeader
        back={{ href: `/admin/podcasts/${p.id}`, label: p.title }}
        title={e ? e.title : 'New episode'}
        actions={
          e && (
            <>
              <a className="adm-btn" href={`/podcasts/${p.slug}/${e.slug}`} target="_blank" rel="noreferrer">
                <Icon name="external" size={14} /> View
              </a>
              <ActionButton action={deleteEpisodeAction} fields={{ id: e.id }} className="adm-btn" danger confirm={`Delete “${e.title}”?`}>
                <Icon name="trash" size={14} /> Delete
              </ActionButton>
            </>
          )
        }
      />
      <ActionForm action={saveEpisodeAction} warnUnsaved>
        <input type="hidden" name="id" value={e?.id ?? ''} />
        <input type="hidden" name="podcast_id" value={p.id} />
        <div className="adm-grid-2-1">
          <div className="adm-stack">
            <div className="adm-card adm-card-body adm-stack">
              <PlayerField name="audio_url" label="Audio" kind="audio" defaultValue={e?.audio_url} />
              <FieldError name="audio_url" />
            </div>
            <div className="adm-card adm-card-body adm-stack">
              <TitleSlugFields defaultTitle={e?.title} defaultSlug={e?.slug} prefix={`/podcasts/${p.slug}/`} titleLabel="Episode title" />
              <label className="adm-field">
                <span className="adm-label">Description / show notes</span>
                <textarea className="adm-input" name="description" rows={6} defaultValue={e?.description} />
              </label>
            </div>
          </div>
          <div className="adm-stack">
            <div className="adm-card adm-card-body adm-stack">
              <label className="adm-field">
                <span className="adm-label">Status</span>
                <select className="adm-input" name="status" defaultValue={e?.status ?? 'published'}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              <DateTimeField name="published_at" label="Publish date" defaultValue={e?.published_at ?? null} hint="Empty = now. A future date schedules it." />
              <label className="adm-field">
                <span className="adm-label">Duration</span>
                <input className="adm-input" name="duration" defaultValue={e?.duration} placeholder="48:12" />
                <FieldError name="duration" />
              </label>
            </div>
            <div className="adm-card adm-card-body">
              <MediaField name="image" label="Episode image" defaultValue={e?.image} aspect="square" hint="Falls back to the show's cover art." />
            </div>
          </div>
        </div>
        <div className="adm-sticky-actions">
          <SubmitButton>{e ? 'Save episode' : 'Add episode'}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
