import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getNewsletterById } from '@/lib/data/site';
import { PageHeader } from '@/components/admin/ui';
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { TitleSlugFields, Toggle } from '@/components/admin/Fields';
import { MediaField } from '@/components/admin/MediaField';
import { Icon } from '@/components/admin/Icon';
import { deleteNewsletterAction, saveNewsletterAction } from '../actions';

export const metadata = { title: 'Edit newsletter' };

export default async function NewsletterEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('audience.manage');
  const { id } = await params;
  const n = id === 'new' ? null : getNewsletterById(Number(id));
  if (id !== 'new' && !n) notFound();
  return (
    <>
      <PageHeader
        back={{ href: '/admin/newsletters', label: 'Newsletters' }}
        title={n ? n.name : 'New newsletter'}
        actions={
          n && (
            <ActionButton action={deleteNewsletterAction} fields={{ id: n.id }} className="adm-btn" danger confirm={`Delete “${n.name}” and its subscriber list?`}>
              <Icon name="trash" size={14} /> Delete
            </ActionButton>
          )
        }
      />
      <ActionForm action={saveNewsletterAction} warnUnsaved>
        <input type="hidden" name="id" value={n?.id ?? ''} />
        <div className="adm-grid-2-1">
          <div className="adm-card adm-card-body adm-stack">
            <TitleSlugFields titleName="name" titleLabel="Name" defaultTitle={n?.name} defaultSlug={n?.slug} prefix="#" />
            <label className="adm-field">
              <span className="adm-label">Description</span>
              <textarea className="adm-input" name="description" rows={3} defaultValue={n?.description} />
            </label>
            <div className="adm-form-grid">
              <label className="adm-field">
                <span className="adm-label">Frequency</span>
                <input className="adm-input" name="frequency" defaultValue={n?.frequency} placeholder="e.g. Every weekday" />
              </label>
              <label className="adm-field">
                <span className="adm-label">Position</span>
                <input className="adm-input" type="number" name="position" defaultValue={n?.position ?? ''} placeholder="Auto" />
              </label>
            </div>
            <Toggle name="active" label="Active" hint="Offered on the Newsletters page and sign-up forms" defaultChecked={n ? !!n.active : true} />
          </div>
          <div className="adm-card adm-card-body">
            <MediaField name="image" label="Image" defaultValue={n?.image} />
          </div>
        </div>
        <div className="adm-sticky-actions">
          <SubmitButton>{n ? 'Save newsletter' : 'Create newsletter'}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
