import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listIssues } from '@/lib/data/content';
import { all } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import { EmptyState, PageHeader } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';

export const metadata = { title: 'Magazine issues' };

export default async function IssuesPage() {
  await requireUser('content.manage');
  const [issues, countRows] = await Promise.all([
    listIssues(false),
    all<{ issue_id: number; n: number }>('SELECT issue_id, COUNT(*) AS n FROM articles WHERE issue_id IS NOT NULL GROUP BY issue_id'),
  ]);
  const counts = Object.fromEntries(countRows.map((r) => [r.issue_id, r.n]));
  return (
    <>
      <PageHeader
        title="Magazine issues"
        subtitle="Print editions, their covers and cover stories. The newest published issue is promoted on the site."
        actions={
          <Link className="adm-btn adm-btn-primary" href="/admin/issues/new">
            <Icon name="plus" size={14} /> New issue
          </Link>
        }
      />
      {issues.length ? (
        <div className="adm-cover-grid">
          {issues.map((i, idx) => (
            <Link key={i.id} href={`/admin/issues/${i.id}`} className="adm-cover">
              <div className="adm-cover-img">
                {i.cover_image ? <img src={i.cover_image} alt="" loading="lazy" /> : <Icon name="issues" size={28} />}
              </div>
              <div>
                <div className="adm-row" style={{ gap: 6 }}>
                  <span className="adm-muted adm-small">{formatDate(i.issue_date, 'month')}</span>
                  {!i.published ? <span className="adm-pill is-draft">Draft</span> : idx === issues.findIndex((x) => x.published) ? <span className="adm-pill is-published">Current</span> : null}
                </div>
                <strong>{i.title}</strong>
                <div className="adm-muted adm-small">{counts[i.id] ?? 0} stories</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="adm-card">
          <EmptyState icon="issues" title="No issues yet" text="Create the first print issue and choose its cover story." action={<Link className="adm-btn adm-btn-primary" href="/admin/issues/new">New issue</Link>} />
        </div>
      )}
    </>
  );
}
