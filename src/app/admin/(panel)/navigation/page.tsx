import { requireUser } from '@/lib/auth';
import { allNav } from '@/lib/data/site';
import { listSections } from '@/lib/data/taxonomy';
import { listPages } from '@/lib/data/content';
import { PageHeader } from '@/components/admin/ui';
import { NavEditor } from './NavEditor';

export const metadata = { title: 'Navigation' };

export default async function NavigationPage() {
  await requireUser('site.layout');
  const nav = allNav();
  const pick = (m: string) => nav.filter((n) => n.menu === m).map((n) => ({ label: n.label, url: n.url, new_tab: !!n.new_tab }));
  const suggestions = [
    { group: 'Sections', items: listSections().map((s) => ({ label: s.name, url: `/${s.slug}` })) },
    { group: 'Pages', items: listPages().map((p) => ({ label: p.title, url: `/${p.slug}` })) },
    {
      group: 'Site',
      items: [
        { label: 'Home', url: '/' },
        { label: 'Video', url: '/video' },
        { label: 'Podcasts', url: '/podcasts' },
        { label: 'The Magazine', url: '/magazine' },
        { label: 'Newsletters', url: '/newsletters' },
        { label: 'Subscribe', url: '/subscribe' },
        { label: 'Masthead', url: '/masthead' },
        { label: 'Contact', url: '/contact' },
        { label: 'Archive', url: '/archive' },
        { label: 'Sitemap', url: '/sitemap' },
        { label: 'Search', url: '/search' },
        { label: 'My account', url: '/account' },
      ],
    },
  ];
  return (
    <>
      <PageHeader title="Navigation" subtitle="Menus in the site header, the slide-out menu and the footer." />
      <NavEditor
        menus={{ header: pick('header'), hamburger: pick('hamburger'), footer: pick('footer'), footer_legal: pick('footer_legal') }}
        suggestions={suggestions}
      />
    </>
  );
}
