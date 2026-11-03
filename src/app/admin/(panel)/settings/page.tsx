import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { PageHeader } from '@/components/admin/ui';
import { SettingsForm } from './SettingsForm';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  await requireUser('settings.manage');
  const { homepage: _h, ...settings } = getSettings();
  return (
    <>
      <PageHeader title="Settings" subtitle="Brand, theme, site-wide promos, footer, SEO defaults and feature switches." />
      <SettingsForm initial={settings} />
    </>
  );
}
