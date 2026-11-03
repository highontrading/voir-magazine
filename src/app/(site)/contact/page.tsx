import type { Metadata } from 'next';
import { getPage } from '@/lib/data/content';
import { getSettings } from '@/lib/settings';
import { cleanHtml } from '@/lib/html';
import { ContactForm } from '@/components/site/Forms';

export const metadata: Metadata = { title: 'Contact Us' };

export default function ContactPage() {
  const page = getPage('contact');
  const s = getSettings();
  return (
    <div className="page-enter">
      <header className="page-head">
        <div className="wrap">
          <h1 style={{ fontSize: 'clamp(44px, 7vw, 96px)' }}>{page?.title ?? 'Contact Us'}</h1>
          <p>{page?.intro ?? 'We would love to hear from you.'}</p>
        </div>
      </header>
      <div className="wrap wrap--mid contact-grid">
        <div>
          {page ? <div className="prose" style={{ fontSize: 17 }} dangerouslySetInnerHTML={{ __html: cleanHtml(page.body) }} /> : null}
          <div className="prose" style={{ fontSize: 17, marginTop: 24 }}>
            <p>
              <strong>Address</strong>
              <br />
              {s.address}
            </p>
            <p>
              <strong>Email</strong>
              <br />
              <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>
            </p>
          </div>
        </div>
        <ContactForm
          topics={[
            ['general', 'General inquiry'],
            ['letters', 'Letters to the Editor'],
            ['tips', 'Story tip'],
            ['corrections', 'Correction'],
            ['subscriptions', 'Subscriptions'],
            ['press', 'Press'],
            ['advertising', 'Advertising'],
          ]}
        />
      </div>
    </div>
  );
}
