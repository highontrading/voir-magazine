import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getAuthorById } from '@/lib/data/taxonomy';
import { PageHeader } from '@/components/admin/ui';
import { ActionButton, ActionForm, FieldError, SubmitButton } from '@/components/admin/ActionForm';
import { TitleSlugFields, Toggle } from '@/components/admin/Fields';
import { MediaField } from '@/components/admin/MediaField';
import { Icon } from '@/components/admin/Icon';
import { deleteAuthorAction, saveAuthorAction } from '../actions';

export const metadata = { title: 'Edit contributor' };

export default async function AuthorEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('content.manage');
  const { id } = await params;
  const a = id === 'new' ? null : await getAuthorById(Number(id));
  if (id !== 'new' && !a) notFound();
  return (
    <>
      <PageHeader
        back={{ href: '/admin/authors', label: 'Authors' }}
        title={a ? a.name : 'New contributor'}
        actions={
          a && (
            <>
              <a className="adm-btn" href={`/contributor/${a.slug}`} target="_blank" rel="noreferrer">
                <Icon name="external" size={14} /> View profile
              </a>
              <ActionButton action={deleteAuthorAction} fields={{ id: a.id }} className="adm-btn" danger confirm={`Remove ${a.name}?`}>
                <Icon name="trash" size={14} /> Delete
              </ActionButton>
            </>
          )
        }
      />
      <ActionForm action={saveAuthorAction} warnUnsaved>
        <input type="hidden" name="id" value={a?.id ?? ''} />
        <div className="adm-grid-2-1">
          <div className="adm-stack">
            <div className="adm-card adm-card-body adm-stack">
              <TitleSlugFields titleName="name" titleLabel="Full name" defaultTitle={a?.name} defaultSlug={a?.slug} prefix="/contributor/" />
              <label className="adm-field">
                <span className="adm-label">Title</span>
                <input className="adm-input" name="title" defaultValue={a?.title} placeholder="e.g. Contributing Editor" />
              </label>
              <label className="adm-field">
                <span className="adm-label">Biography</span>
                <textarea className="adm-input" name="bio" rows={5} defaultValue={a?.bio} />
              </label>
            </div>
            <div className="adm-card">
              <div className="adm-card-head">
                <h2>Contact & social</h2>
              </div>
              <div className="adm-card-body adm-form-grid">
                <label className="adm-field">
                  <span className="adm-label">Email</span>
                  <input className="adm-input" type="email" name="email" defaultValue={a?.email} />
                  <FieldError name="email" />
                </label>
                <label className="adm-field">
                  <span className="adm-label">Website</span>
                  <input className="adm-input" name="website" defaultValue={a?.website} placeholder="https://" />
                  <FieldError name="website" />
                </label>
                <label className="adm-field">
                  <span className="adm-label">X (Twitter) handle</span>
                  <div className="adm-input-group">
                    <span className="adm-input-addon">@</span>
                    <input className="adm-input" name="twitter" defaultValue={a?.twitter} />
                  </div>
                </label>
                <label className="adm-field">
                  <span className="adm-label">Instagram handle</span>
                  <div className="adm-input-group">
                    <span className="adm-input-addon">@</span>
                    <input className="adm-input" name="instagram" defaultValue={a?.instagram} />
                  </div>
                </label>
              </div>
            </div>
          </div>
          <div className="adm-stack">
            <div className="adm-card adm-card-body">
              <MediaField name="photo" label="Photo" defaultValue={a?.photo} aspect="square" />
            </div>
            <div className="adm-card adm-card-body adm-stack">
              <Toggle name="on_masthead" label="Show on masthead" hint="Listed on the About / Masthead page" defaultChecked={a ? !!a.on_masthead : true} />
              <label className="adm-field">
                <span className="adm-label">Position</span>
                <input className="adm-input" type="number" name="position" defaultValue={a?.position ?? ''} placeholder="Auto" />
              </label>
            </div>
          </div>
        </div>
        <div className="adm-sticky-actions">
          <SubmitButton>{a ? 'Save contributor' : 'Add contributor'}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
