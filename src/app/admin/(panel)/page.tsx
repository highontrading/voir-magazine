import Link from 'next/link';
import { requireUser, can } from '@/lib/auth';
import { dashboardStats, listMessages, recentActivity } from '@/lib/data/site';
import { viewsByDay, statusCounts } from '@/lib/data/articles';
import { articleQueue, scheduledArticles, topArticles } from '@/lib/data/admin';
import { formatDate, timeAgo } from '@/lib/utils';
import { Card, EmptyState, PageHeader, StatusPill, sp, type SearchParams } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { ViewsChart } from '@/components/admin/ViewsChart';
import { MountToast } from '@/components/admin/Feedback';

export const metadata = { title: 'Dashboard' };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const denied = sp((await searchParams).denied) === '1';
  const isWriter = !can(user, 'articles.all');
  const [stats, mine, views, queue, scheduled, top, messages, activity] = await Promise.all([
    dashboardStats(),
    statusCounts(isWriter ? user.id : undefined),
    viewsByDay(30),
    articleQueue(['review', 'draft'], 8, isWriter ? user.id : undefined),
    isWriter ? [] : scheduledArticles(6),
    topArticles(8),
    can(user, 'audience.manage') ? listMessages().then((m) => m.slice(0, 5)) : [],
    can(user, 'content.manage') ? recentActivity(10) : [],
  ]);
  const views30 = views.reduce((s, d) => s + d.views, 0);
  const prev7 = views.slice(-14, -7).reduce((s, d) => s + d.views, 0);
  const last7 = views.slice(-7).reduce((s, d) => s + d.views, 0);
  const trend = prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;

  const cards = isWriter
    ? [
        { label: 'My drafts', value: mine.draft, icon: 'edit', href: '/admin/articles?status=draft' },
        { label: 'In review', value: mine.review, icon: 'clock', href: '/admin/articles?status=review' },
        { label: 'My published stories', value: mine.published + mine.scheduled, icon: 'articles', href: '/admin/articles?status=published' },
        { label: 'Views (7 days, site)', value: stats.views7, icon: 'eye', trend },
      ]
    : [
        { label: 'Published stories', value: stats.published, icon: 'articles', href: '/admin/articles?status=published' },
        { label: 'Views (7 days)', value: stats.views7, icon: 'eye', trend },
        { label: 'In review', value: stats.inReview, icon: 'clock', href: '/admin/articles?status=review' },
        { label: 'Drafts', value: stats.drafts, icon: 'edit', href: '/admin/articles?status=draft' },
        { label: 'Newsletter subscribers', value: stats.subscribers, icon: 'mail', href: '/admin/newsletters?tab=subscribers' },
        { label: 'Active subscriptions', value: stats.subscriptions, icon: 'card', href: '/admin/subscriptions', sub: stats.pendingSubscriptions ? `${stats.pendingSubscriptions} pending` : undefined },
        { label: 'Reader accounts', value: stats.readers, icon: 'readers', href: '/admin/readers' },
        { label: 'Unread messages', value: stats.unreadMessages, icon: 'inbox', href: '/admin/messages?filter=unread' },
      ];

  return (
    <>
      {denied && <MountToast text="You don't have permission to open that page." kind="error" />}
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        subtitle={`Here's what's happening at the magazine · ${formatDate(new Date().toISOString())}`}
        actions={
          <>
            <a className="adm-btn" href="/" target="_blank" rel="noreferrer">
              <Icon name="external" size={14} /> View site
            </a>
            <Link className="adm-btn adm-btn-primary" href="/admin/articles/new">
              <Icon name="plus" size={14} /> New story
            </Link>
          </>
        }
      />

      <div className="adm-stats">
        {cards.map((c) => {
          const inner = (
            <>
              <div className="adm-stat-top">
                <span className="adm-stat-label">{c.label}</span>
                <span className="adm-stat-icon">
                  <Icon name={c.icon} size={15} />
                </span>
              </div>
              <div className="adm-stat-value">{c.value.toLocaleString()}</div>
              {'trend' in c && c.trend !== undefined ? (
                <div className={`adm-stat-sub ${c.trend >= 0 ? 'is-up' : 'is-down'}`}>
                  {c.trend >= 0 ? '▲' : '▼'} {Math.abs(c.trend)}% vs previous week
                </div>
              ) : 'sub' in c && c.sub ? (
                <div className="adm-stat-sub">{c.sub}</div>
              ) : null}
            </>
          );
          return 'href' in c && c.href ? (
            <Link key={c.label} href={c.href} className="adm-stat">
              {inner}
            </Link>
          ) : (
            <div key={c.label} className="adm-stat">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="adm-grid-2-1">
        <Card title="Page views · last 30 days" actions={<span className="adm-muted adm-small">{views30.toLocaleString()} total</span>}>
          <ViewsChart data={views} />
        </Card>
        <Card title="Quick actions">
          <div className="adm-quick">
            <Link href="/admin/articles/new">
              <Icon name="edit" /> Write a story
            </Link>
            <Link href="/admin/media">
              <Icon name="upload" /> Upload media
            </Link>
            {can(user, 'site.layout') && (
              <Link href="/admin/homepage">
                <Icon name="home" /> Arrange homepage
              </Link>
            )}
            {can(user, 'content.manage') && (
              <Link href="/admin/issues/new">
                <Icon name="issues" /> New magazine issue
              </Link>
            )}
            {can(user, 'content.manage') && (
              <Link href="/admin/videos/new">
                <Icon name="video" /> Add a video
              </Link>
            )}
            {can(user, 'settings.manage') && (
              <Link href="/admin/settings">
                <Icon name="settings" /> Site settings
              </Link>
            )}
            <Link href="/admin/profile">
              <Icon name="user" /> My profile
            </Link>
          </div>
        </Card>
      </div>

      <div className="adm-grid-2">
        <Card title={isWriter ? 'My drafts & submissions' : 'Editorial queue'} actions={<Link href="/admin/articles?status=review" className="adm-link">View all</Link>} pad={false}>
          {queue.length ? (
            <ul className="adm-list">
              {queue.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/articles/${a.id}`} className="adm-list-main">
                    <strong>{a.title}</strong>
                    <span className="adm-muted">
                      {a.section_name ?? 'No section'} · {a.creator_name ?? 'Unknown'} · updated {timeAgo(a.updated_at)}
                    </span>
                  </Link>
                  <StatusPill status={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="check" title="Queue is clear" text="No drafts or stories awaiting review." />
          )}
        </Card>
        <Card title="Top stories · 30 days" actions={<Link href="/admin/articles?sort=views" className="adm-link">All by views</Link>} pad={false}>
          {top.length ? (
            <ol className="adm-list adm-list-ranked">
              {top.map((a, i) => (
                <li key={a.id}>
                  <span className="adm-rank">{i + 1}</span>
                  <Link href={`/admin/articles/${a.id}`} className="adm-list-main">
                    <strong>{a.title}</strong>
                    <span className="adm-muted">{a.section_name ?? '—'} · {formatDate(a.published_at, 'short')}</span>
                  </Link>
                  <span className="adm-num">
                    {(a.recent || a.views).toLocaleString()}
                    <small>{a.recent ? 'recent' : 'total'}</small>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon="eye" title="No readership yet" />
          )}
        </Card>
      </div>

      <div className={isWriter ? '' : 'adm-grid-3'}>
        {!isWriter && (
          <Card title="Scheduled" actions={<Link href="/admin/articles?status=scheduled" className="adm-link">View all</Link>} pad={false}>
            {scheduled.length ? (
              <ul className="adm-list">
                {scheduled.map((a) => (
                  <li key={a.id}>
                    <Link href={`/admin/articles/${a.id}`} className="adm-list-main">
                      <strong>{a.title}</strong>
                      <span className="adm-muted">
                        <Icon name="calendar" size={12} /> {a.published_at ? new Date(a.published_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="calendar" title="Nothing scheduled" text="Set a future publish date on a story to schedule it." />
            )}
          </Card>
        )}
        {messages.length > 0 || can(user, 'audience.manage') ? (
          <Card title="Latest messages" actions={<Link href="/admin/messages" className="adm-link">Inbox</Link>} pad={false}>
            {messages.length ? (
              <ul className="adm-list">
                {messages.map((m) => (
                  <li key={m.id} className={m.read ? '' : 'is-unread'}>
                    <Link href={`/admin/messages?open=${m.id}`} className="adm-list-main">
                      <strong>{m.subject || '(no subject)'}</strong>
                      <span className="adm-muted">
                        {m.name} · {timeAgo(m.created_at)}
                      </span>
                    </Link>
                    {!m.read && <span className="adm-dot" aria-label="Unread" />}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="inbox" title="Inbox zero" />
            )}
          </Card>
        ) : null}
        {activity.length > 0 && (
          <Card title="Recent activity" actions={<Link href="/admin/activity" className="adm-link">Full log</Link>} pad={false}>
            <ul className="adm-feed">
              {activity.map((a) => (
                <li key={a.id}>
                  <span className="adm-feed-dot" />
                  <div>
                    <strong>{a.user_name ?? 'System'}</strong> {a.action} {a.entity}
                    {a.label && <em> “{a.label}”</em>}
                    <span className="adm-muted adm-small"> · {timeAgo(a.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
