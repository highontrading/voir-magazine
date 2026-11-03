import Link from 'next/link';

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <nav className="pager" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)}>‹ Prev</Link> : null}
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`e${i}`}>…</span>
        ) : n === page ? (
          <span key={n} className="is-current" aria-current="page">
            {n}
          </span>
        ) : (
          <Link key={n} href={href(n)}>
            {n}
          </Link>
        ),
      )}
      {page < pages ? <Link href={href(page + 1)}>Next ›</Link> : null}
    </nav>
  );
}
