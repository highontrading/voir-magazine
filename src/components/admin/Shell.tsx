'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { logoutAction } from '@/app/admin/actions';
import { Icon } from './Icon';

interface NavGroup {
  group: string;
  items: { href: string; label: string; icon: string; badge?: number }[];
}

interface ShellUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
}

export function AdminShell({ groups, user, brand, children }: { groups: NavGroup[]; user: ShellUser; brand: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!menu) return;
    const off = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [menu]);

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/'));
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className={`adm-shell ${open ? 'is-drawer-open' : ''}`}>
      <aside className="adm-sidebar" aria-label="Admin navigation">
        <div className="adm-sidebar-head">
          <Link href="/admin" className="adm-wordmark">
            {brand}
          </Link>
          <span className="adm-sidebar-tag">CMS</span>
          <button type="button" className="adm-icon-btn adm-sidebar-close" aria-label="Close menu" onClick={() => setOpen(false)}>
            <Icon name="close" />
          </button>
        </div>
        <Link href="/admin/articles/new" className="adm-sidebar-cta">
          <Icon name="plus" size={15} /> New story
        </Link>
        <nav className="adm-sidebar-nav">
          {groups.map((g) => (
            <div key={g.group} className="adm-nav-group">
              <div className="adm-nav-title">{g.group}</div>
              {g.items.map((i) => (
                <Link key={i.href} href={i.href} className={`adm-nav-link ${isActive(i.href) ? 'is-active' : ''}`} aria-current={isActive(i.href) ? 'page' : undefined}>
                  <Icon name={i.icon} size={16} />
                  <span>{i.label}</span>
                  {i.badge ? <span className="adm-nav-badge">{i.badge}</span> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="adm-sidebar-foot">
          <span className="adm-avatar adm-avatar-sm">
            {user.avatar ? <img src={user.avatar} alt="" /> : initials}
          </span>
          <div>
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>
        </div>
      </aside>
      <div className="adm-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="adm-main">
        <header className="adm-topbar">
          <button type="button" className="adm-icon-btn adm-menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <Link href="/admin" className="adm-topbar-brand">
            {brand}
          </Link>
          <div className="adm-topbar-spacer" />
          <a href="/" target="_blank" rel="noreferrer" className="adm-btn adm-btn-ghost adm-btn-sm">
            <Icon name="external" size={14} /> <span className="adm-hide-sm">View site</span>
          </a>
          <div className="adm-usermenu" ref={menuRef}>
            <button type="button" className="adm-usermenu-btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <span className="adm-avatar adm-avatar-sm">
                {user.avatar ? <img src={user.avatar} alt="" /> : initials}
              </span>
              <span className="adm-hide-sm">{user.name}</span>
              <Icon name="chevronDown" size={14} />
            </button>
            {menu && (
              <div className="adm-dropdown" role="menu">
                <div className="adm-dropdown-head">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                  <span className={`adm-pill is-${user.role}`}>{user.role}</span>
                </div>
                <Link href="/admin/profile" role="menuitem">
                  <Icon name="user" size={15} /> My profile
                </Link>
                <a href="/" target="_blank" rel="noreferrer" role="menuitem">
                  <Icon name="globe" size={15} /> Open website
                </a>
                <form action={logoutAction}>
                  <button type="submit" role="menuitem">
                    <Icon name="logout" size={15} /> Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="adm-content">{children}</main>
      </div>
    </div>
  );
}
