import type { Permission } from '../auth';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  perm?: Permission;
  badge?: 'messages';
}

export const ADMIN_NAV: { group: string; items: AdminNavItem[] }[] = [
  {
    group: 'Content',
    items: [
      { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
      { href: '/admin/articles', label: 'Articles', icon: 'articles' },
      { href: '/admin/sections', label: 'Sections', icon: 'sections', perm: 'content.manage' },
      { href: '/admin/tags', label: 'Tags', icon: 'tags', perm: 'content.manage' },
      { href: '/admin/authors', label: 'Authors', icon: 'authors', perm: 'content.manage' },
      { href: '/admin/issues', label: 'Magazine issues', icon: 'issues', perm: 'content.manage' },
      { href: '/admin/videos', label: 'Videos', icon: 'video', perm: 'content.manage' },
      { href: '/admin/podcasts', label: 'Podcasts', icon: 'podcast', perm: 'content.manage' },
      { href: '/admin/pages', label: 'Pages', icon: 'pages', perm: 'content.manage' },
      { href: '/admin/media', label: 'Media library', icon: 'media' },
    ],
  },
  {
    group: 'Site',
    items: [
      { href: '/admin/homepage', label: 'Homepage', icon: 'home', perm: 'site.layout' },
      { href: '/admin/navigation', label: 'Navigation', icon: 'nav', perm: 'site.layout' },
      { href: '/admin/settings', label: 'Settings', icon: 'settings', perm: 'settings.manage' },
    ],
  },
  {
    group: 'Audience',
    items: [
      { href: '/admin/newsletters', label: 'Newsletters', icon: 'mail', perm: 'audience.manage' },
      { href: '/admin/subscriptions', label: 'Subscriptions', icon: 'card', perm: 'audience.manage' },
      { href: '/admin/readers', label: 'Readers', icon: 'readers', perm: 'audience.manage' },
      { href: '/admin/messages', label: 'Messages', icon: 'inbox', perm: 'audience.manage', badge: 'messages' },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/admin/users', label: 'Users', icon: 'users', perm: 'users.manage' },
      { href: '/admin/activity', label: 'Activity log', icon: 'activity', perm: 'content.manage' },
      { href: '/admin/profile', label: 'My profile', icon: 'user' },
    ],
  },
];
