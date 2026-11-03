'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { Icon } from '@/components/admin/Icon';
import { timeAgo, formatDate } from '@/lib/utils';
import type { ActionResult } from '@/lib/admin/form';
import { bulkArticlesAction, deleteArticleAction, duplicateArticleAction } from './actions';

export interface ArticleRowLite {
  id: number;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  updated_at: string;
  views: number;
  section_name: string | null;
  section_color: string;
  authors: string[];
  hero_image: string;
  featured: boolean;
  top_story: boolean;
  editors_pick: boolean;
  live: boolean;
  editable: boolean;
}

const LABEL: Record<string, string> = { draft: 'Draft', review: 'In review', published: 'Published', scheduled: 'Scheduled', archived: 'Archived' };

export function ArticlesTable({ rows, canPublish }: { rows: ArticleRowLite[]; canPublish: boolean }) {
  const [sel, setSel] = useState<number[]>([]);
  const ids = rows.filter((r) => r.editable).map((r) => r.id);
  const allOn = ids.length > 0 && ids.every((id) => sel.includes(id));
  useEffect(() => setSel((s) => s.filter((id) => rows.some((r) => r.id === id))), [rows]);

  const onResult = (r: ActionResult) => {
    if (r.ok) setSel([]);
  };

  return (
    <div className="adm-card adm-table-card">
      {sel.length > 0 && (
        <ActionForm action={bulkArticlesAction} className="adm-bulkbar" onResult={onResult}>
          {sel.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <strong>{sel.length} selected</strong>
          <div className="adm-bulkbar-actions">
            {canPublish && (
              <SubmitButton className="adm-btn adm-btn-sm" name="intent" value="publish" data-confirm={`Publish ${sel.length} selected stories now?`} data-danger="0" data-confirm-label="Publish">
                <Icon name="bolt" size={14} /> Publish
              </SubmitButton>
            )}
            <SubmitButton className="adm-btn adm-btn-sm" name="intent" value="draft">
              <Icon name="edit" size={14} /> Move to draft
            </SubmitButton>
            {!canPublish && (
              <SubmitButton className="adm-btn adm-btn-sm" name="intent" value="review">
                <Icon name="clock" size={14} /> Submit for review
              </SubmitButton>
            )}
            {canPublish && (
              <SubmitButton className="adm-btn adm-btn-sm" name="intent" value="archive">
                <Icon name="archive" size={14} /> Archive
              </SubmitButton>
            )}
            <SubmitButton className="adm-btn adm-btn-sm is-danger" name="intent" value="delete" data-confirm={`Permanently delete ${sel.length} selected stories? This cannot be undone.`}>
              <Icon name="trash" size={14} /> Delete
            </SubmitButton>
            <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => setSel([])}>
              Clear
            </button>
          </div>
        </ActionForm>
      )}
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th className="is-check">
                <input type="checkbox" aria-label="Select all" checked={allOn} disabled={!ids.length} onChange={(e) => setSel(e.target.checked ? ids : [])} />
              </th>
              <th>Story</th>
              <th>Status</th>
              <th className="adm-hide-md">Section</th>
              <th className="adm-hide-md">Date</th>
              <th className="is-num adm-hide-sm">Views</th>
              <th className="is-actions">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={sel.includes(r.id) ? 'is-selected' : ''}>
                <td className="is-check">
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.title}`}
                    disabled={!r.editable}
                    checked={sel.includes(r.id)}
                    onChange={(e) => setSel((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))}
                  />
                </td>
                <td>
                  <div className="adm-story-cell">
                    <div className="adm-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {r.hero_image ? <img src={r.hero_image} alt="" loading="lazy" /> : <Icon name="image" size={16} />}
                    </div>
                    <div>
                      <Link href={`/admin/articles/${r.id}`} className="adm-story-title">
                        {r.title}
                      </Link>
                      <div className="adm-story-meta">
                        {r.authors.length ? r.authors.join(', ') : <span className="adm-muted">No byline</span>}
                        {r.featured && <span className="adm-flag" title="Featured (homepage hero candidate)">★ Featured</span>}
                        {r.top_story && <span className="adm-flag">Top story</span>}
                        {r.editors_pick && <span className="adm-flag">Editors’ pick</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`adm-pill is-${r.status}`}>{LABEL[r.status] ?? r.status}</span>
                </td>
                <td className="adm-hide-md">
                  {r.section_name ? (
                    <span className="adm-section-tag">
                      <i style={{ background: r.section_color || 'var(--adm-muted)' }} />
                      {r.section_name}
                    </span>
                  ) : (
                    <span className="adm-muted">—</span>
                  )}
                </td>
                <td className="adm-hide-md adm-nowrap">
                  {r.status === 'published' || r.status === 'scheduled' ? (
                    <span title={r.published_at ?? ''}>{formatDate(r.published_at, 'short')}</span>
                  ) : (
                    <span className="adm-muted" title={r.updated_at} suppressHydrationWarning>
                      Edited {timeAgo(r.updated_at)}
                    </span>
                  )}
                </td>
                <td className="is-num adm-hide-sm">{r.views.toLocaleString()}</td>
                <td className="is-actions">
                  <div className="adm-row-actions">
                    <Link className="adm-icon-btn" href={`/admin/articles/${r.id}`} title={r.editable ? 'Edit' : 'Open'} aria-label="Edit">
                      <Icon name="edit" size={15} />
                    </Link>
                    {r.live ? (
                      <a className="adm-icon-btn" href={`/story/${r.slug}`} target="_blank" rel="noreferrer" title="View on site" aria-label="View on site">
                        <Icon name="external" size={15} />
                      </a>
                    ) : (
                      <a className="adm-icon-btn" href={`/story/${r.slug}?preview=1`} target="_blank" rel="noreferrer" title="Preview" aria-label="Preview">
                        <Icon name="eye" size={15} />
                      </a>
                    )}
                    <ActionButton action={duplicateArticleAction} fields={{ id: r.id }} className="adm-icon-btn" title="Duplicate">
                      <Icon name="duplicate" size={15} />
                    </ActionButton>
                    {r.editable && (
                      <ActionButton action={deleteArticleAction} fields={{ id: r.id }} className="adm-icon-btn" title="Delete" danger confirm={`Delete “${r.title}”? This cannot be undone.`}>
                        <Icon name="trash" size={15} />
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
