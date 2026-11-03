import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getMessage } from '@/lib/data/site';
import { messagesPage, unreadMessageCount } from '@/lib/data/admin';
import { getSettings } from '@/lib/settings';
import { timeAgo } from '@/lib/utils';
import { EmptyState, PageHeader, Pagination, StatusPill, hrefWith, sp, type SearchParams } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { ActionButton } from '@/components/admin/ActionForm';
import { deleteMessageAction, markMessageAction } from './actions';
import { MarkRead } from './MarkRead';

export const metadata = { title: 'Messages' };

export default async function MessagesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser('audience.manage');
  const s = await searchParams;
  const params = { filter: sp(s.filter), q: sp(s.q), page: sp(s.page) };
  const openId = Number(sp(s.open)) || 0;
  const [data, open, unread, settings] = await Promise.all([
    messagesPage({ unread: params.filter === 'unread', q: params.q || undefined, page: Number(params.page) || 1, perPage: 25 }),
    openId ? getMessage(openId) : null,
    unreadMessageCount(),
    getSettings(),
  ]);
  const site = settings.siteName;
  const back = hrefWith('/admin/messages', params, {});
  return (
    <>
      <PageHeader title="Messages" subtitle="Letters and enquiries sent through the contact form." />
      <nav className="adm-tabs">
        <Link href={hrefWith('/admin/messages', { q: params.q }, {})} className={!params.filter ? 'is-active' : ''}>
          All
        </Link>
        <Link href={hrefWith('/admin/messages', { q: params.q }, { filter: 'unread' })} className={params.filter === 'unread' ? 'is-active' : ''}>
          Unread <span className="adm-tab-count">{unread}</span>
        </Link>
      </nav>
      <div className="adm-msg-layout">
        <div>
          <form className="adm-filters" method="get">
            {params.filter && <input type="hidden" name="filter" value={params.filter} />}
            <div className="adm-search">
              <Icon name="search" />
              <input type="search" name="q" defaultValue={params.q} placeholder="Search messages…" />
            </div>
          </form>
          <div className="adm-card">
            {data.items.length ? (
              <ul className="adm-msg-list">
                {data.items.map((m) => (
                  <li key={m.id}>
                    <Link href={hrefWith('/admin/messages', params, { open: m.id })} className={`${m.read ? '' : 'is-unread'} ${m.id === openId ? 'is-open' : ''}`} scroll={false}>
                      <span className="adm-msg-top">
                        <strong>{m.name}</strong>
                        <span className="adm-muted adm-small adm-nowrap">{timeAgo(m.created_at)}</span>
                      </span>
                      <span className="adm-msg-subj">{m.subject || '(no subject)'}</span>
                      <span className="adm-msg-snippet">{m.body}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="inbox" title={params.filter === 'unread' ? 'All caught up' : 'No messages'} text={params.filter === 'unread' ? 'There are no unread messages.' : undefined} />
            )}
          </div>
          <Pagination base="/admin/messages" params={params} page={data.page} pages={data.pages} total={data.total} noun="messages" />
        </div>
        <div className="adm-card">
          {open ? (
            <>
              {!open.read && <MarkRead id={open.id} />}
              <div className="adm-card-head">
                <h2>{open.subject || '(no subject)'}</h2>
                <div className="adm-card-actions">
                  <StatusPill status={open.topic || 'general'} label={open.topic || 'general'} />
                </div>
              </div>
              <div className="adm-card-body">
                <dl className="adm-kv">
                  <dt>From</dt>
                  <dd>
                    <strong>{open.name}</strong> &lt;{open.email}&gt;
                  </dd>
                  <dt>Received</dt>
                  <dd>{new Date(open.created_at.endsWith('Z') || open.created_at.includes('T') ? open.created_at : open.created_at.replace(' ', 'T') + 'Z').toUTCString()}</dd>
                </dl>
                <div className="adm-msg-body">{open.body}</div>
                <div className="adm-row" style={{ marginTop: 18 }}>
                  <a className="adm-btn adm-btn-primary" href={`mailto:${open.email}?subject=${encodeURIComponent('Re: ' + (open.subject || `Your message to ${site}`))}&body=${encodeURIComponent(`\n\n—\nOn ${open.created_at.slice(0, 10)}, ${open.name} wrote:\n> ${open.body.split('\n').join('\n> ')}`)}`}>
                    <Icon name="mail" size={14} /> Reply by email
                  </a>
                  <ActionButton action={markMessageAction} fields={{ id: open.id, read: 0, back }} className="adm-btn">
                    Mark as unread
                  </ActionButton>
                  <ActionButton action={deleteMessageAction} fields={{ id: open.id, back }} className="adm-btn" danger confirm="Delete this message permanently?">
                    <Icon name="trash" size={14} /> Delete
                  </ActionButton>
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon="mail" title="Select a message" text="Choose a message from the list to read and reply." />
          )}
        </div>
      </div>
    </>
  );
}
