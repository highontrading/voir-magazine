import type { Metadata } from 'next';
import Link from 'next/link';
import { getPage } from '@/lib/data/content';
import { listAuthors } from '@/lib/data/taxonomy';
import { cleanHtml } from '@/lib/html';
import { Avatar } from '@/components/site/Media';

export function generateMetadata(): Metadata {
  const page = getPage('masthead');
  return { title: page?.title || 'Masthead', description: page?.seo_description || page?.intro || undefined };
}

export default function MastheadPage() {
  const page = getPage('masthead');
  const people = listAuthors().filter((a) => a.on_masthead);
  return (
    <div className="page-enter">
      <header className="page-head">
        <div className="wrap">
          <h1>{page?.title || 'Masthead'}</h1>
          <p>{page?.intro ?? 'The people who make Voirtales.'}</p>
        </div>
      </header>
      <div className="wrap wrap--mid">
        <div className="masthead-list">
          {people.map((p) => (
            <Link key={p.id} href={`/contributor/${p.slug}`} className="masthead-person" data-reveal>
              <Avatar name={p.name} src={p.photo} size={56} />
              <span>
                <span className="eyebrow" style={{ fontSize: 10, color: 'var(--muted)' }}>{p.title}</span>
                <h3>{p.name}</h3>
              </span>
            </Link>
          ))}
        </div>
        {page ? <div className="prose" style={{ marginTop: 48, fontSize: 16 }} dangerouslySetInnerHTML={{ __html: cleanHtml(page.body) }} /> : null}
      </div>
    </div>
  );
}
