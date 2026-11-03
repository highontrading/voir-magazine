import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listVideos } from '@/lib/data/content';
import { formatDate } from '@/lib/utils';
import { EmptyState, PageHeader, Pagination, StatusPill, hrefWith, sp, type SearchParams } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { ActionButton } from '@/components/admin/ActionForm';
import { deleteVideoAction } from './actions';

export const metadata = { title: 'Videos' };
const PER = 20;

export default async function VideosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser('content.manage');
  const s = await searchParams;
  const q = sp(s.q).toLowerCase();
  const status = sp(s.status);
  const page = Math.max(1, Number(sp(s.page)) || 1);
  const everything = (await listVideos({ all: true, limit: 5000 })).sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
  const filtered = everything.filter((v) => (!status || v.status === status) && (!q || `${v.title} ${v.series}`.toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const rows = filtered.slice((page - 1) * PER, page * PER);
  const now = new Date().toISOString();
  return (
    <>
      <PageHeader
        title="Videos"
        subtitle="Video series and clips for the Watch section and the homepage video band."
        actions={
          <Link className="adm-btn adm-btn-primary" href="/admin/videos/new">
            <Icon name="plus" size={14} /> New video
          </Link>
        }
      />
      <nav className="adm-tabs">
        {[
          ['', 'All', everything.length],
          ['published', 'Published', everything.filter((v) => v.status === 'published').length],
          ['draft', 'Drafts', everything.filter((v) => v.status === 'draft').length],
        ].map(([k, l, n]) => (
          <Link key={String(k)} href={hrefWith('/admin/videos', { q }, { status: String(k) })} className={status === k ? 'is-active' : ''}>
            {l} <span className="adm-tab-count">{n}</span>
          </Link>
        ))}
      </nav>
      <form className="adm-filters" method="get">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="adm-search">
          <Icon name="search" />
          <input type="search" name="q" defaultValue={q} placeholder="Search titles and series…" />
        </div>
        <button className="adm-btn" type="submit">
          Search
        </button>
      </form>
      <div className="adm-card adm-table-card">
        {rows.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Video</th>
                  <th>Status</th>
                  <th className="adm-hide-md">Section</th>
                  <th className="adm-hide-md">Published</th>
                  <th className="is-num adm-hide-sm">Views</th>
                  <th className="is-actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div className="adm-story-cell">
                        <div className="adm-thumb">
                          {v.thumbnail ? <img src={v.thumbnail} alt="" loading="lazy" /> : <Icon name="play" size={14} />}
                        </div>
                        <div>
                          <Link href={`/admin/videos/${v.id}`} className="adm-story-title">
                            {v.title}
                          </Link>
                          <div className="adm-story-meta">
                            {v.series || 'No series'}
                            {v.duration && <span>· {v.duration}</span>}
                            {!!v.featured && <span className="adm-flag">★ Featured</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{v.status === 'published' && v.published_at && v.published_at > now ? <StatusPill status="scheduled" /> : <StatusPill status={v.status} />}</td>
                    <td className="adm-hide-md">{v.section_name ?? <span className="adm-muted">—</span>}</td>
                    <td className="adm-hide-md adm-nowrap">{formatDate(v.published_at, 'short')}</td>
                    <td className="is-num adm-hide-sm">{v.views.toLocaleString()}</td>
                    <td className="is-actions">
                      <div className="adm-row-actions">
                        <a className="adm-icon-btn" href={`/video/${v.slug}`} target="_blank" rel="noreferrer" title="View on site">
                          <Icon name="external" size={15} />
                        </a>
                        <Link className="adm-icon-btn" href={`/admin/videos/${v.id}`} title="Edit">
                          <Icon name="edit" size={15} />
                        </Link>
                        <ActionButton action={deleteVideoAction} fields={{ id: v.id }} className="adm-icon-btn" danger title="Delete" confirm={`Delete the video “${v.title}”?`}>
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
          <EmptyState icon="video" title={q || status ? 'No videos match' : 'No videos yet'} action={<Link className="adm-btn adm-btn-primary" href="/admin/videos/new">New video</Link>} />
        )}
      </div>
      <Pagination base="/admin/videos" params={{ q, status }} page={page} pages={pages} total={filtered.length} noun="videos" />
    </>
  );
}
