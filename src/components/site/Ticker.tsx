import Link from 'next/link';

export function Ticker({ label, items }: { label: string; items: { text: string; url: string }[] }) {
  if (!items.length) return null;
  const loop = [...items, ...items];
  return (
    <div className="ticker" aria-label={label}>
      <div className="ticker__label">{label}</div>
      <div className="ticker__viewport">
        <div className="ticker__track">
          {loop.map((it, i) => (
            <Link key={i} href={it.url} className="ticker__item" aria-hidden={i >= items.length} tabIndex={i >= items.length ? -1 : 0}>
              {it.text}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
