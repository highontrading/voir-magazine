import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getSectionById } from '@/lib/data/taxonomy';
import { PageHeader } from '@/components/admin/ui';
import { ActionButton, ActionForm, FieldError, SubmitButton } from '@/components/admin/ActionForm';
import { ColorField, CountedInput, TitleSlugFields, Toggle } from '@/components/admin/Fields';
import { MediaField } from '@/components/admin/MediaField';
import { Icon } from '@/components/admin/Icon';
import { deleteSectionAction, saveSectionAction } from '../actions';

export const metadata = { title: 'Edit section' };

export default async function SectionEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('content.manage');
  const { id } = await params;
  const s = id === 'new' ? null : await getSectionById(Number(id));
  if (id !== 'new' && !s) notFound();
  return (
    <>
      <PageHeader
        back={{ href: '/admin/sections', label: 'Sections' }}
        title={s ? s.name : 'New section'}
        actions={
          s && (
            <>
              <a className="adm-btn" href={`/${s.slug}`} target="_blank" rel="noreferrer">
                <Icon name="external" size={14} /> View
              </a>
              <ActionButton action={deleteSectionAction} fields={{ id: s.id }} className="adm-btn" danger confirm={`Delete the “${s.name}” section? Menu links to /${s.slug} and its homepage blocks are removed too.`}>
                <Icon name="trash" size={14} /> Delete
              </ActionButton>
            </>
          )
        }
      />
      <ActionForm action={saveSectionAction} warnUnsaved>
        <input type="hidden" name="id" value={s?.id ?? ''} />
        <div className="adm-grid-2-1">
          <div className="adm-card adm-card-body adm-stack">
            <TitleSlugFields titleName="name" titleLabel="Name" defaultTitle={s?.name} defaultSlug={s?.slug} prefix="/" />
            <label className="adm-field">
              <span className="adm-label">Description</span>
              <textarea className="adm-input" name="description" rows={3} defaultValue={s?.description} />
            </label>
            <div className="adm-form-grid">
              <div>
                <ColorField name="color" label="Accent colour" defaultValue={s?.color || '#c8102e'} />
                <FieldError name="color" />
              </div>
              <label className="adm-field">
                <span className="adm-label">Position</span>
                <input className="adm-input" type="number" name="position" defaultValue={s?.position ?? ''} placeholder="Auto" />
              </label>
            </div>
            <Toggle name="in_nav" label="Show in navigation" hint="Lists this section in the slide-out menu and the footer’s Sections column. Header bar links are managed under Navigation." defaultChecked={s ? !!s.in_nav : true} />
            <hr className="adm-divider" />
            <CountedInput name="seo_title" label="SEO title" max={60} defaultValue={s?.seo_title} placeholder="Defaults to the section name" />
            <CountedInput name="seo_description" label="SEO description" max={160} textarea defaultValue={s?.seo_description} placeholder="Defaults to the description" />
          </div>
          <div className="adm-card adm-card-body">
            <MediaField name="hero_image" label="Hero image" defaultValue={s?.hero_image} hint="Shown at the top of the section page." />
          </div>
        </div>
        <div className="adm-sticky-actions">
          <SubmitButton>{s ? 'Save section' : 'Create section'}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
