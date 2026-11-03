import Link from 'next/link';
import type { NavItem, Section, SiteSettings } from '@/lib/types';
import { NewsletterForm } from './Forms';
import { SocialLinks } from './Social';

export function Footer({ s, sections, footer, legal }: { s: SiteSettings; sections: Section[]; footer: NavItem[]; legal: NavItem[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top">
          <div>
            <Link href="/" className="logo">
              {s.logoImage ? <img src={s.logoImage} alt={s.siteName} style={{ filter: 'invert(1)' }} /> : s.logoText}
            </Link>
            <p className="footer__about">{s.footer.about}</p>
            <p className="eyebrow" style={{ fontSize: 11, marginBottom: 12, color: 'rgba(255,255,255,.6)' }}>
              {s.newsletterPromo.headline}
            </p>
            <NewsletterForm source="footer" legal={false} dark />
            <div style={{ marginTop: 24 }}>
              <SocialLinks social={s.social} />
            </div>
          </div>
          <div className="footer__cols">
            <div>
              <h4>Sections</h4>
              <ul>
                {sections.map((x) => (
                  <li key={x.id}>
                    <Link href={`/${x.slug}`}>{x.name}</Link>
                  </li>
                ))}
                <li><Link href="/video">Video</Link></li>
                <li><Link href="/podcasts">Podcasts</Link></li>
                <li><Link href="/magazine">The Magazine</Link></li>
              </ul>
            </div>
            <div>
              <h4>{s.siteName}</h4>
              <ul>
                {footer.map((n) => (
                  <li key={n.id}>
                    <Link href={n.url} target={n.new_tab ? '_blank' : undefined}>{n.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Legal</h4>
              <ul>
                {legal.map((n) => (
                  <li key={n.id}>
                    <Link href={n.url} target={n.new_tab ? '_blank' : undefined}>{n.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="footer__bottom">
          <p>{s.footer.copyright.replace('{year}', String(year))}</p>
          <p>
            {s.siteName} may earn a portion of sales from products that are purchased through our site as part of our affiliate partnerships with
            retailers. The material on this site may not be reproduced, distributed, transmitted, cached or otherwise used, except with the prior
            written permission of {s.siteName}. {s.address}
          </p>
        </div>
      </div>
    </footer>
  );
}
