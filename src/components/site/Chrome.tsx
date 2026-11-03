import { currentReader } from '@/lib/auth';
import { listPublished } from '@/lib/data/articles';
import { listNav } from '@/lib/data/site';
import { listSections, popularTags } from '@/lib/data/taxonomy';
import { getSettings } from '@/lib/settings';
import { Announcement, CookieBanner, Effects } from './Effects';
import { Footer } from './Footer';
import { Header } from './Header';
import { Ticker } from './Ticker';

/** Full public-site chrome (announcement, header, ticker, footer and global effects). */
export async function Chrome({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const [reader, sections, topStories, headerNav, hamburgerNav, footerNav, legalNav, trending] = await Promise.all([
    s.features.readerAccounts ? currentReader() : null,
    listSections(true),
    s.ticker.items.length ? null : listPublished({ flag: 'top_story', limit: 8 }),
    listNav('header'),
    listNav('hamburger'),
    listNav('footer'),
    listNav('footer_legal'),
    popularTags(12),
  ]);
  const tickerItems = topStories ? topStories.map((a) => ({ text: a.title, url: `/story/${a.slug}` })) : s.ticker.items;
  return (
    <div className="vt">
      <a href="#main" className="sr-only skip-link">Skip to content</a>
      {s.announcement.enabled && s.announcement.text ? (
        <Announcement text={s.announcement.text} link={s.announcement.link} linkLabel={s.announcement.linkLabel} />
      ) : null}
      <Header
        logoText={s.logoText}
        logoImage={s.logoImage}
        tagline={s.tagline}
        nav={headerNav}
        extra={hamburgerNav}
        sections={sections.map((x) => ({ name: x.name, slug: x.slug }))}
        social={s.social}
        subscribeCta={s.subscribe.cta}
        readerName={reader?.name ?? null}
        accounts={s.features.readerAccounts}
        progress={s.features.readingProgress}
        trending={trending.map((t) => ({ name: t.name, slug: t.slug }))}
      />
      {s.features.breakingTicker ? <Ticker label={s.ticker.label} items={tickerItems} /> : null}
      <main id="main">{children}</main>
      <Footer s={s} sections={sections} footer={footerNav} legal={legalNav} />
      {s.cookieBanner.enabled ? <CookieBanner text={s.cookieBanner.text} /> : null}
      <Effects reveal={s.features.scrollAnimations} backToTop={s.features.backToTop} />
    </div>
  );
}
