import { requireUser, can } from '@/lib/auth';
import { ADMIN_NAV } from '@/lib/admin/nav';
import { unreadMessageCount } from '@/lib/data/admin';
import { getSettings } from '@/lib/settings';
import { AdminShell } from '@/components/admin/Shell';
import { FeedbackProvider } from '@/components/admin/Feedback';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = getSettings();
  const unread = can(user, 'audience.manage') ? unreadMessageCount() : 0;
  const groups = ADMIN_NAV.map((g) => ({
    group: g.group,
    items: g.items
      .filter((i) => !i.perm || can(user, i.perm))
      .map((i) => ({ href: i.href, label: i.label, icon: i.icon, badge: i.badge === 'messages' && unread > 0 ? unread : undefined })),
  })).filter((g) => g.items.length);
  return (
    <FeedbackProvider>
      <AdminShell
        groups={groups}
        user={{ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }}
        brand={settings.logoText || 'VOIRTALES'}
      >
        {children}
      </AdminShell>
    </FeedbackProvider>
  );
}
