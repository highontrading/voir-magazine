import Link from 'next/link';
import { listPublished } from '@/lib/data/articles';
import { Card, toCard } from './Card';

export async function NotFoundBody() {
  const latest = await listPublished({ limit: 4 });
  return (
    <div className="wrap page-enter">
      <div className="notfound">
        <div className="notfound__code">404</div>
        <h1>This story has gone off the record.</h1>
        <p>The page you’re looking for may have moved or never existed.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn">Back to the homepage</Link>
          <Link href="/search" className="btn btn--ghost">Search Voirtales</Link>
        </div>
      </div>
      {latest.length ? (
        <div className="grid grid--4" style={{ marginTop: 40 }}>
          {latest.map((a) => (
            <Card key={a.id} a={toCard(a)} variant="medium" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
