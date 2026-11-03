import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getVideoById } from '@/lib/data/content';
import { listSections } from '@/lib/data/taxonomy';
import { all } from '@/lib/db';
import { PageHeader } from '@/components/admin/ui';
import { ActionButton, ActionForm, FieldError, SubmitButton } from '@/components/admin/ActionForm';
import { DateTimeField, TitleSlugFields, Toggle } from '@/components/admin/Fields';
import { MediaField } from '@/components/admin/MediaField';
import { PlayerField } from '@/components/admin/PlayerField';
import { Icon } from '@/components/admin/Icon';
import { deleteVideoAction, saveVideoAction } from '../actions';

export const metadata = { title: 'Edit video' };

export default async function VideoEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('content.manage');
  const { id } = await params;
  const v = id === 'new' ? null : getVideoById(Number(id));
  if (id !== 'new' && !v) notFound();
  const sections = listSections();
  const series = all<{ series: string }>("SELECT DISTINCT series FROM videos WHERE series != '' ORDER BY series").map((r) => r.series);
  return (
    <>
      <PageHeader
        back={{ href: '/admin/videos', label: 'Videos' }}
        title={v ? v.title : 'New video'}
        actions={
          v && (
            <>
              <a className="adm-btn" href={`/video/${v.slug}`} target="_blank" rel="noreferrer">
                <Icon name="external" size={14} /> View
              </a>
              <ActionButton action={deleteVideoAction} fields={{ id: v.id }} className="adm-btn" danger confirm={`Delete “${v.title}”?`}>
                <Icon name="trash" size={14} /> Delete
              </ActionButton>
            </>
          )
        }
      />
      <ActionForm action={saveVideoAction} warnUnsaved>
        <input type="hidden" name="id" value={v?.id ?? ''} />
        <div className="adm-grid-2-1">
          <div className="adm-stack">
            <div className="adm-card adm-card-body adm-stack">
              <PlayerField name="video_url" label="Video" kind="video" defaultValue={v?.video_url} />
              <FieldError name="video_url" />
            </div>
            <div className="adm-card adm-card-body adm-stack">
              <TitleSlugFields defaultTitle={v?.title} defaultSlug={v?.slug} prefix="/video/" />
              <label className="adm-field">
                <span className="adm-label">Description</span>
                <textarea className="adm-input" name="description" rows={4} defaultValue={v?.description} />
              </label>
              <div className="adm-form-grid-3">
                <label className="adm-field">
                  <span className="adm-label">Series</span>
                  <input className="adm-input" name="series" list="video-series" defaultValue={v?.series} placeholder="e.g. Notes on a Scene" />
                  <datalist id="video-series">
                    {series.map((x) => (
                      <option key={x} value={x} />
                    ))}
                  </datalist>
                </label>
                <label className="adm-field">
                  <span className="adm-label">Section</span>
                  <select className="adm-input" name="section_id" defaultValue={v?.section_id ?? ''}>
                    <option value="">— None —</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="adm-field">
                  <span className="adm-label">Duration</span>
                  <input className="adm-input" name="duration" defaultValue={v?.duration} placeholder="12:04" />
                  <FieldError name="duration" />
                </label>
              </div>
            </div>
          </div>
          <div className="adm-stack">
            <div className="adm-card adm-card-body adm-stack">
              <label className="adm-field">
                <span className="adm-label">Status</span>
                <select className="adm-input" name="status" defaultValue={v?.status ?? 'published'}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              <DateTimeField name="published_at" label="Publish date" defaultValue={v?.published_at ?? null} hint="Empty = now. A future date schedules it." />
              <Toggle name="featured" label="Featured" hint="Leads the video band and Watch page" defaultChecked={!!v?.featured} />
            </div>
            <div className="adm-card adm-card-body">
              <MediaField name="thumbnail" label="Thumbnail" defaultValue={v?.thumbnail} />
            </div>
          </div>
        </div>
        <div className="adm-sticky-actions">
          <SubmitButton>{v ? 'Save video' : 'Add video'}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
