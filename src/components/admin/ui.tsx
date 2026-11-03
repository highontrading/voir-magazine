import Link from 'next/link';
import { Icon } from './Icon';

export function PageHeader({ title, subtitle, actions, back }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="adm-page-head">
      <div>
        {back && (
          <Link href={back.href} className="adm-back">
            ← {back.label}
          </Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="adm-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="adm-page-actions">{actions}</div>}
    </header>
  );
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  review: 'In review',
  published: 'Published',
  scheduled: 'Scheduled',
  archived: 'Archived',
  pending: 'Pending',
  active: 'Active',
  cancelled: 'Cancelled',
  inactive: 'Inactive',
  unread: 'Unread',
  read: 'Read',
  admin: 'Admin',
  editor: 'Editor',
  writer: 'Writer',
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return <span className={`adm-pill is-${status}`}>{label ?? STATUS_LABEL[status] ?? status}</span>;
}

export function EmptyState({ icon = 'dot', title, text, action }: { icon?: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="adm-empty">
      <div className="adm-empty-icon">
        <Icon name={icon} size={24} />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/** Builds hrefs preserving existing query params. */
export function hrefWith(base: string, params: Record<string, string | number | undefined | null>, patch: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...patch })) if (v !== undefined && v !== null && v !== '' && !(k === 'page' && String(v) === '1')) sp.set(k, String(v));
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export function Pagination({ base, params, page, pages, total, noun = 'items' }: { base: string; params: Record<string, string | undefined>; page: number; pages: number; total?: number; noun?: string }) {
  if (pages <= 1) return total !== undefined ? <div className="adm-pager"><span className="adm-muted">{total.toLocaleString()} {noun}</span></div> : null;
  const nums: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <nav className="adm-pager" aria-label="Pagination">
      {total !== undefined && (
        <span className="adm-muted">
          {total.toLocaleString()} {noun} · page {page} of {pages}
        </span>
      )}
      <div className="adm-pager-links">
        {page > 1 ? <Link href={hrefWith(base, params, { page: page - 1 })}>‹ Prev</Link> : <span className="is-disabled">‹ Prev</span>}
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="adm-pager-gap">
              …
            </span>
          ) : (
            <Link key={n} href={hrefWith(base, params, { page: n })} className={n === page ? 'is-current' : ''} aria-current={n === page ? 'page' : undefined}>
              {n}
            </Link>
          ),
        )}
        {page < pages ? <Link href={hrefWith(base, params, { page: page + 1 })}>Next ›</Link> : <span className="is-disabled">Next ›</span>}
      </div>
    </nav>
  );
}

export function Card({ title, actions, children, className, pad = true }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`adm-card ${className ?? ''}`}>
      {(title || actions) && (
        <div className="adm-card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="adm-card-actions">{actions}</div>}
        </div>
      )}
      <div className={pad ? 'adm-card-body' : ''}>{children}</div>
    </section>
  );
}

export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  const ini = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  return (
    <span className="adm-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" /> : ini}
    </span>
  );
}

export function sp(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
