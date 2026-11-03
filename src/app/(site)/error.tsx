'use client';

import Link from 'next/link';

export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap">
      <div className="notfound">
        <div className="notfound__code" style={{ fontSize: 'clamp(80px, 14vw, 180px)' }}>Oops.</div>
        <h1>Something went wrong on our end.</h1>
        <p>Please try again in a moment.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn" onClick={() => reset()}>Try again</button>
          <Link href="/" className="btn btn--ghost">Homepage</Link>
        </div>
      </div>
    </div>
  );
}
