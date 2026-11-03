import Link from 'next/link';
import { requireUser, can } from '@/lib/auth';
import { mediaPage } from '@/lib/data/admin';
import { dashboardStats } from '@/lib/data/site';
import { PageHeader, Pagination, hrefWith, sp, type SearchParams } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { MediaLibrary } from './MediaLibrary';

export const metadata = { title: 'Media library' };

const KINDS = [
  ['', 'All files'],
  ['image', 'Images'],
  ['video', 'Video'],
  ['audio', 'Audio'],
  ['document', 'Documents'],
] as const;

export default async function MediaPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const s = await searchParams;
  const params = { q: sp(s.q), kind: sp(s.kind), page: sp(s.page) };
  const data = mediaPage({ q: params.q || undefined, kind: params.kind || undefined, page: Number(params.page) || 1, perPage: 48 });
  const total = dashboardStats().media;
  return (
    <>
      <PageHeader title="Media library" subtitle={`${total.toLocaleString()} files · images, video, audio and PDFs up to 25 MB.`} />
      <nav className="adm-tabs">
        {KINDS.map(([k, l]) => (
          <Link key={k || 'all'} href={hrefWith('/admin/media', { q: params.q }, { kind: k })} className={params.kind === k ? 'is-active' : ''}>
            {l}
          </Link>
        ))}
      </nav>
      <form className="adm-filters" method="get">
        {params.kind && <input type="hidden" name="kind" value={params.kind} />}
        <div className="adm-search">
          <Icon name="search" />
          <input type="search" name="q" defaultValue={params.q} placeholder="Search by file name, alt text or credit…" />
        </div>
        <button className="adm-btn" type="submit">
          Search
        </button>
      </form>
      <MediaLibrary items={data.items} userId={user.id} canManageAll={can(user, 'content.manage')} filtered={!!(params.q || params.kind)} />
      <Pagination base="/admin/media" params={params} page={data.page} pages={data.pages} total={data.total} noun="files" />
    </>
  );
}
