import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getIssueById } from '@/lib/data/content';
import { articleOptions } from '@/lib/data/articles';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/admin/ui';
import { ActionButton, ActionForm, FieldError, SubmitButton } from '@/components/admin/ActionForm';
import { SearchSelect, TitleSlugFields, Toggle } from '@/components/admin/Fields';
import { MediaField } from '@/components/admin/MediaField';
import { Icon } from '@/components/admin/Icon';
import { deleteIssueAction, saveIssueAction } from '../actions';

export const metadata = { title: 'Edit issue' };

export default async function IssueEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('content.manage');
  const { id } = await params;
  const i = id === 'new' ? null : getIssueById(Number(id));
  if (id !== 'new' && !i) notFound();
  const options = articleOptions().map((a) => ({ value: String(a.id), label: a.title, meta: [a.section_name, a.status !== 'published' ? a.status : formatDate(a.published_at, 'short')].filter(Boolean).join(' · ') }));
  const nextMonth = new Date();
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  return (
    <>
      <PageHeader
        back={{ href: '/admin/issues', label: 'Magazine issues' }}
        title={i ? i.title : 'New issue'}
        subtitle={i ? formatDate(i.issue_date, 'month') : undefined}
        actions={
          i && (
            <>
              <a className="adm-btn" href={`/magazine/${i.slug}`} target="_blank" rel="noreferrer">
                <Icon name="external" size={14} /> View
              </a>
              <ActionButton action={deleteIssueAction} fields={{ id: i.id }} className="adm-btn" danger confirm={`Delete “${i.title}”? Stories in it will be kept.`}>
                <Icon name="trash" size={14} /> Delete
              </ActionButton>
            </>
          )
        }
      />
      <ActionForm action={saveIssueAction} warnUnsaved>
        <input type="hidden" name="id" value={i?.id ?? ''} />
        <div className="adm-grid-2-1">
          <div className="adm-card adm-card-body adm-stack">
            <TitleSlugFields defaultTitle={i?.title} defaultSlug={i?.slug} prefix="/magazine/" titleLabel="Issue title" />
            <div className="adm-form-grid">
              <label className="adm-field">
                <span className="adm-label">
                  Issue month<em>*</em>
                </span>
                <input className="adm-input" type="month" name="issue_month" required defaultValue={(i?.issue_date ?? nextMonth.toISOString()).slice(0, 7)} />
                <FieldError name="issue_month" />
              </label>
              <div className="adm-field">
                <span className="adm-label">Cover story</span>
                <SearchSelect name="cover_story_id" options={options} defaultValue={i?.cover_story_id ? String(i.cover_story_id) : ''} emptyLabel="No cover story" placeholder="Search stories…" />
              </div>
            </div>
            <label className="adm-field">
              <span className="adm-label">Cover line</span>
              <input className="adm-input" name="cover_line" defaultValue={i?.cover_line} placeholder="The headline on the cover" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Description</span>
              <textarea className="adm-input" name="description" rows={4} defaultValue={i?.description} />
            </label>
            <Toggle name="published" label="Published" hint="Visible in the magazine archive; the newest published issue is the current issue" defaultChecked={i ? !!i.published : true} />
          </div>
          <div className="adm-card adm-card-body">
            <MediaField name="cover_image" label="Cover image" defaultValue={i?.cover_image} aspect="portrait" />
          </div>
        </div>
        <div className="adm-sticky-actions">
          <SubmitButton>{i ? 'Save issue' : 'Create issue'}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
