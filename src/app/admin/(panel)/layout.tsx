import { requireUser, can } from '@/lib/auth';
import { ADMIN_NAV } from '@/lib/admin/nav';
import { unreadMessageCount } from '@/lib/data/admin';
import { getSettings } from '@/lib/settings';
import { STORAGE_MODE } from '@/lib/db';
import { BLOB_UPLOADS } from '@/lib/uploads';
import { AdminShell } from '@/components/admin/Shell';
import { FeedbackProvider } from '@/components/admin/Feedback';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [settings, unread] = await Promise.all([getSettings(), can(user, 'audience.manage') ? unreadMessageCount() : 0]);
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
        {STORAGE_MODE === 'ephemeral' ? (
          <div className="adm-alert is-warn" role="alert">
            <strong>Demo storage.</strong>&nbsp;No database is connected, so this server uses a temporary copy: changes, uploads and
            logins are lost when the instance restarts and are not shared between instances. Connect Turso
            (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN) and a Vercel Blob store, then redeploy.
          </div>
        ) : STORAGE_MODE === 'remote' && !BLOB_UPLOADS && process.env.VERCEL ? (
          <div className="adm-alert is-warn" role="alert">
            <strong>Uploads disabled.</strong>&nbsp;Connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN) to upload images and media.
          </div>
        ) : null}
        {children}
      </AdminShell>
    </FeedbackProvider>
  );
}
