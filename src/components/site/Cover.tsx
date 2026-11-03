import { formatDate } from '@/lib/utils';
import type { Issue } from '@/lib/types';

/** Magazine cover rendered from the issue photo + typographic overlay. */
export function Cover({ issue, logo = 'VOIRTALES' }: { issue: Pick<Issue, 'cover_image' | 'cover_line' | 'issue_date' | 'title'>; logo?: string }) {
  return (
    <span className="cover">
      {issue.cover_image ? <img src={issue.cover_image} alt={`${issue.title} cover`} loading="lazy" /> : null}
      <span className="cover__logo">{logo}</span>
      <span className="cover__date">{formatDate(issue.issue_date, 'month')}</span>
      <span className="cover__line">
        <small>{issue.title}</small>
        {issue.cover_line}
      </span>
    </span>
  );
}
