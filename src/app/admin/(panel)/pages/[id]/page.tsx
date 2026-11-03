import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getPageById } from '@/lib/data/content';
import { PageHeader } from '@/components/admin/ui';
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { CountedInput, TitleSlugFields } from '@/components/admin/Fields';
import { RichEditor } from '@/components/admin/editor/RichEditor';
import { Icon } from '@/components/admin/Icon';
import { deletePageAction, savePageAction } from '../actions';

export const metadata = { title: 'Edit page' };

export default async function PageEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('content.manage');
  const { id } = await params;
  const p = id === 'new' ? null : await getPageById(Number(id));
  if (id !== 'new' && !p) notFound();
  return (
    <>
      <PageHeader
        back={{ href: '/admin/pages', label: 'Pages' }}
        title={p ? p.title : 'New page'}
        actions={
          p && (
            <>
              <a className="adm-btn" href={`/${p.slug}`} target="_blank" rel="noreferrer">
                <Icon name="external" size={14} /> View
              </a>
              <ActionButton action={deletePageAction} fields={{ id: p.id }} className="adm-btn" danger confirm={`Delete “${p.title}”?`}>
                <Icon name="trash" size={14} /> Delete
              </ActionButton>
            </>
          )
        }
      />
      <ActionForm action={savePageAction} warnUnsaved>
        <input type="hidden" name="id" value={p?.id ?? ''} />
        <div className="adm-editor-layout">
          <div className="adm-stack">
            <div className="adm-card adm-card-body adm-stack">
              <TitleSlugFields defaultTitle={p?.title} defaultSlug={p?.slug} prefix="/" large />
              <label className="adm-field">
                <span className="adm-label">Intro</span>
                <textarea className="adm-input adm-input-dek" name="intro" rows={2} defaultValue={p?.intro} placeholder="A short introduction shown under the title" />
              </label>
            </div>
            <RichEditor name="body" defaultValue={p?.body ?? ''} placeholder="Write the page…" minHeight={360} />
          </div>
          <div className="adm-stack">
            <div className="adm-card adm-card-body adm-stack">
              <label className="adm-field">
                <span className="adm-label">Status</span>
                <select className="adm-input" name="status" defaultValue={p?.status ?? 'published'}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              <CountedInput name="seo_description" label="SEO description" max={160} textarea defaultValue={p?.seo_description} />
              <SubmitButton className="adm-btn adm-btn-primary adm-btn-block">{p ? 'Save page' : 'Create page'}</SubmitButton>
            </div>
          </div>
        </div>
      </ActionForm>
    </>
  );
}
