import { requireUser } from '@/lib/auth';
import { adminTags } from '@/lib/data/admin';
import { PageHeader, Pagination, sp, type SearchParams } from '@/components/admin/ui';
import { ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { Icon } from '@/components/admin/Icon';
import { saveTagAction } from './actions';
import { TagsTable } from './TagsTable';

export const metadata = { title: 'Tags' };
const PER = 40;

export default async function TagsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser('content.manage');
  const s = await searchParams;
  const q = sp(s.q);
  const page = Math.max(1, Number(sp(s.page)) || 1);
  const all = await adminTags(q || undefined);
  const pages = Math.max(1, Math.ceil(all.length / PER));
  const rows = all.slice((page - 1) * PER, page * PER);
  const options = (q ? await adminTags() : all).map((t) => ({ id: t.id, name: t.name }));
  return (
    <>
      <PageHeader title="Tags" subtitle="Topics that connect stories across sections. Merge duplicates to keep tag pages tidy." />
      <div className="adm-grid-1-2">
        <div className="adm-card">
          <div className="adm-card-head">
            <h2>Add a tag</h2>
          </div>
          <ActionForm action={saveTagAction} resetOnSuccess className="adm-card-body adm-stack">
            <label className="adm-field">
              <span className="adm-label">
                Name<em>*</em>
              </span>
              <input className="adm-input" name="name" required maxLength={80} placeholder="e.g. Awards Season" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Slug</span>
              <input className="adm-input" name="slug" placeholder="auto-generated" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Description</span>
              <textarea className="adm-input" name="description" rows={2} />
            </label>
            <div className="adm-form-actions">
              <SubmitButton>
                <Icon name="plus" size={14} /> Add tag
              </SubmitButton>
            </div>
          </ActionForm>
        </div>
        <div>
          <form className="adm-filters" method="get">
            <div className="adm-search">
              <Icon name="search" />
              <input type="search" name="q" defaultValue={q} placeholder={`Search ${all.length} tags…`} />
            </div>
            <button className="adm-btn" type="submit">
              Search
            </button>
          </form>
          <TagsTable rows={rows.map((t) => ({ id: t.id, name: t.name, slug: t.slug, description: t.description, live: t.article_count ?? 0, total: t.total_count }))} options={options} q={q} />
          <Pagination base="/admin/tags" params={{ q }} page={page} pages={pages} total={all.length} noun="tags" />
        </div>
      </div>
    </>
  );
}
