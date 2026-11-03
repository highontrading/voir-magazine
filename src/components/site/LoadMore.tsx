'use client';

import { useState } from 'react';
import { Card, type CardData } from './Card';

/** Display options forwarded to each loaded Card, so they match the server-rendered cards above. */
export type LoadMoreCardOptions = { showByline?: boolean; showTime?: boolean; showDek?: boolean };

/** "More Stories" button that fetches further cards from /api/articles. */
export function LoadMore({
  query,
  start,
  total,
  pageSize = 12,
  card,
}: {
  query: Record<string, string>;
  start: number;
  total: number;
  pageSize?: number;
  card?: LoadMoreCardOptions;
}) {
  const [items, setItems] = useState<CardData[]>([]);
  const [offset, setOffset] = useState(start);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const more = async () => {
    setLoading(true);
    setFailed(false);
    const qs = new URLSearchParams({ ...query, offset: String(offset), limit: String(pageSize) });
    try {
      const r = await fetch(`/api/articles?${qs}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const res = (await r.json()) as { items?: unknown };
      if (!Array.isArray(res.items)) throw new Error('Bad response');
      setItems((x) => [...x, ...(res.items as CardData[])]);
      // Only advance once the page has actually loaded, so a failed request can be retried.
      setOffset((o) => o + pageSize);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      {items.length > 0 ? (
        <div className="grid grid--4" style={{ marginTop: 32 }}>
          {items.map((a) => (
            <Card key={a.id} a={a} variant="medium" {...card} />
          ))}
        </div>
      ) : null}
      {offset < total ? (
        <div className="load-more" style={failed ? { flexDirection: 'column', alignItems: 'center' } : undefined}>
          {failed ? (
            <p className="form-msg form-msg--err" role="alert">
              We couldn’t load more stories. Please try again.
            </p>
          ) : null}
          <button className="btn btn--ghost" onClick={more} disabled={loading}>
            {loading ? 'Loading…' : failed ? 'Try again' : 'More stories'}
          </button>
        </div>
      ) : null}
    </>
  );
}
