import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { articleOptions, listPublished } from '@/lib/data/articles';
import { listSections } from '@/lib/data/taxonomy';
import { adminTags } from '@/lib/data/admin';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/admin/ui';
import { Icon } from '@/components/admin/Icon';
import { HomepageBuilder } from './HomepageBuilder';

export const metadata = { title: 'Homepage' };

export default async function HomepagePage() {
  await requireUser('site.layout');
  const [s, options, heroList, autoTop, sections, tags] = await Promise.all([
    getSettings(),
    articleOptions(true),
    listPublished({ flag: 'featured', limit: 1 }),
    listPublished({ flag: 'top_story', limit: 6 }),
    listSections(),
    adminTags(),
  ]);
  const articles = options.map((a) => ({ value: String(a.id), label: a.title, meta: [a.section_name, formatDate(a.published_at, 'short')].filter(Boolean).join(' · ') }));
  const autoHero = heroList[0];
  return (
    <>
      <PageHeader
        title="Homepage"
        subtitle="Pick the lead story, curate Top Stories and arrange the sections of the front page."
        actions={
          <a className="adm-btn" href="/" target="_blank" rel="noreferrer">
            <Icon name="external" size={14} /> View homepage
          </a>
        }
      />
      <HomepageBuilder
        initial={s.homepage}
        articles={articles}
        sections={sections.map((x) => ({ value: x.slug, label: x.name }))}
        tags={tags.map((t) => ({ value: t.slug, label: t.name, meta: `${t.article_count ?? 0} stories` }))}
        autoHero={autoHero ? autoHero.title : null}
        autoTop={autoTop.map((a) => a.title)}
      />
    </>
  );
}
