import Link from 'next/link';
import { requireUser, can } from '@/lib/auth';
import { adminListArticles, statusCounts } from '@/lib/data/articles';
import { listSections, listAuthors } from '@/lib/data/taxonomy';
import { EmptyState, PageHeader, Pagination, hrefWith, sp, type SearchParams } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { ArticlesTable, type ArticleRowLite } from './ArticlesTable';

export const metadata = { title: 'Articles' };

const TABS = [
  ['', 'All'],
  ['published', 'Published'],
  ['scheduled', 'Scheduled'],
  ['review', 'In review'],
  ['draft', 'Drafts'],
  ['archived', 'Archived'],
] as const;

export default async function ArticlesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const s = await searchParams;
  const all = can(user, 'articles.all');
  const params = {
    q: sp(s.q),
    status: sp(s.status),
    section: sp(s.section),
    author: sp(s.author),
    sort: sp(s.sort),
    page: sp(s.page),
  };
  const sort = (['updated', 'published', 'views', 'title'] as const).find((x) => x === params.sort) ?? 'updated';
  const result = adminListArticles({
    q: params.q || undefined,
    status: params.status || undefined,
    section: Number(params.section) || undefined,
    author: all ? Number(params.author) || undefined : undefined,
    createdBy: all ? undefined : user.id,
    page: Number(params.page) || 1,
    perPage: 20,
    sort,
  });
  const counts = statusCounts(all ? undefined : user.id);
  const sections = listSections();
  const authors = all ? listAuthors() : [];
  const now = Date.now();
  const rows: ArticleRowLite[] = result.items.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    status: a.status,
    published_at: a.published_at,
    updated_at: a.updated_at,
    views: a.views,
    section_name: a.section_name,
    section_color: sections.find((x) => x.id === a.section_id)?.color ?? '',
    authors: a.authors.map((x) => x.name),
    hero_image: a.hero_image,
    featured: !!a.featured,
    top_story: !!a.top_story,
    editors_pick: !!a.editors_pick,
    live: (a.status === 'published' || a.status === 'scheduled') && !!a.published_at && new Date(a.published_at).getTime() <= now,
    editable: all || (a.created_by === user.id && !['published', 'scheduled', 'archived'].includes(a.status)),
  }));
  const filtered = params.q || params.section || params.author;

  return (
    <>
      <PageHeader
        title="Articles"
        subtitle={all ? 'Every story across the magazine.' : 'Stories you have created. Submit drafts for review when they are ready.'}
        actions={
          <Link className="adm-btn adm-btn-primary" href="/admin/articles/new">
            <Icon name="plus" size={14} /> New story
          </Link>
        }
      />
      <nav className="adm-tabs" aria-label="Filter by status">
        {TABS.map(([key, label]) => (
          <Link key={key || 'all'} href={hrefWith('/admin/articles', params, { status: key, page: '' })} className={params.status === key ? 'is-active' : ''}>
            {label}
            <span className="adm-tab-count">{counts[(key || 'all') as keyof typeof counts]}</span>
          </Link>
        ))}
      </nav>
      <form className="adm-filters" method="get" action="/admin/articles">
        {params.status && <input type="hidden" name="status" value={params.status} />}
        <div className="adm-search">
          <Icon name="search" />
          <input type="search" name="q" defaultValue={params.q} placeholder="Search headlines, slugs, deks…" />
        </div>
        <select className="adm-input" name="section" defaultValue={params.section} aria-label="Section">
          <option value="">All sections</option>
          {sections.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        {all && (
          <select className="adm-input" name="author" defaultValue={params.author} aria-label="Author">
            <option value="">All authors</option>
            {authors.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        )}
        <select className="adm-input" name="sort" defaultValue={sort} aria-label="Sort">
          <option value="updated">Last updated</option>
          <option value="published">Publish date</option>
          <option value="views">Most viewed</option>
          <option value="title">Title A–Z</option>
        </select>
        <button className="adm-btn" type="submit">
          Apply
        </button>
        {filtered && (
          <Link className="adm-btn adm-btn-ghost" href={hrefWith('/admin/articles', { status: params.status }, {})}>
            Clear
          </Link>
        )}
      </form>
      {rows.length ? (
        <>
          <ArticlesTable rows={rows} canPublish={can(user, 'articles.publish')} />
          <Pagination base="/admin/articles" params={params} page={result.page} pages={result.pages} total={result.total} noun="stories" />
        </>
      ) : (
        <div className="adm-card">
          <EmptyState
            icon="articles"
            title={filtered || params.status ? 'No stories match these filters' : 'No stories yet'}
            text={filtered || params.status ? 'Try a different search or status.' : 'Write the first story for the magazine.'}
            action={
              <Link className="adm-btn adm-btn-primary" href="/admin/articles/new">
                <Icon name="plus" size={14} /> New story
              </Link>
            }
          />
        </div>
      )}
    </>
  );
}
