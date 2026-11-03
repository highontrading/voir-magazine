'use client';

import { useState } from 'react';
import { Card, type CardData } from './Card';

/** "More Stories" button that fetches further cards from /api/articles. */
export function LoadMore({ query, start, total, pageSize = 12 }: { query: Record<string, string>; start: number; total: number; pageSize?: number }) {
  const [items, setItems] = useState<CardData[]>([]);
  const [offset, setOffset] = useState(start);
  const [loading, setLoading] = useState(false);
  const more = async () => {
    setLoading(true);
    const qs = new URLSearchParams({ ...query, offset: String(offset), limit: String(pageSize) });
    const res = await fetch(`/api/articles?${qs}`).then((r) => r.json()).catch(() => ({ items: [] }));
    setItems((x) => [...x, ...(res.items as CardData[])]);
    setOffset((o) => o + pageSize);
    setLoading(false);
  };
  return (
    <>
      {items.length > 0 ? (
        <div className="grid grid--4" style={{ marginTop: 32 }}>
          {items.map((a) => (
            <Card key={a.id} a={a} variant="medium" />
          ))}
        </div>
      ) : null}
      {offset < total ? (
        <div className="load-more">
          <button className="btn btn--ghost" onClick={more} disabled={loading}>
            {loading ? 'Loading…' : 'More stories'}
          </button>
        </div>
      ) : null}
    </>
  );
}
