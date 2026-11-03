'use client';

import { useState } from 'react';
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { EmptyStateClient } from '@/components/admin/EmptyStateClient';
import { Icon } from '@/components/admin/Icon';
import { deleteTagAction, mergeTagAction, saveTagAction } from './actions';

interface Row {
  id: number;
  name: string;
  slug: string;
  description: string;
  live: number;
  total: number;
}

export function TagsTable({ rows, options, q }: { rows: Row[]; options: { id: number; name: string }[]; q: string }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [merging, setMerging] = useState<number | null>(null);
  if (!rows.length) return <div className="adm-card"><EmptyStateClient icon="tags" title={q ? 'No tags match' : 'No tags yet'} text={q ? 'Try another search.' : 'Tags are also created automatically when you tag a story.'} /></div>;
  return (
    <div className="adm-card adm-table-card">
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th className="is-num">Live stories</th>
              <th className="is-num adm-hide-sm">All</th>
              <th className="is-actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) =>
              editing === t.id ? (
                <tr key={t.id}>
                  <td colSpan={4}>
                    <ActionForm action={saveTagAction} onResult={(r) => r.ok && setEditing(null)} className="adm-row" style={{ alignItems: 'flex-end' }}>
                      <input type="hidden" name="id" value={t.id} />
                      <label className="adm-field" style={{ flex: '1 1 160px' }}>
                        <span className="adm-label">Name</span>
                        <input className="adm-input" name="name" defaultValue={t.name} autoFocus required />
                      </label>
                      <label className="adm-field" style={{ flex: '1 1 160px' }}>
                        <span className="adm-label">Slug</span>
                        <input className="adm-input" name="slug" defaultValue={t.slug} />
                      </label>
                      <label className="adm-field" style={{ flex: '2 1 220px' }}>
                        <span className="adm-label">Description</span>
                        <input className="adm-input" name="description" defaultValue={t.description} />
                      </label>
                      <SubmitButton className="adm-btn adm-btn-primary">Save</SubmitButton>
                      <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </ActionForm>
                  </td>
                </tr>
              ) : (
                <tr key={t.id}>
                  <td>
                    <span className="adm-cell-title">{t.name}</span>
                    <span className="adm-cell-sub">/tag/{t.slug}</span>
                  </td>
                  <td className="is-num">{t.live}</td>
                  <td className="is-num adm-hide-sm adm-muted">{t.total}</td>
                  <td className="is-actions">
                    {merging === t.id ? (
                      <ActionForm action={mergeTagAction} className="adm-merge" onResult={(r) => r.ok && setMerging(null)} confirm={`Merge “${t.name}” into the selected tag? “${t.name}” will be deleted.`} confirmLabel="Merge">
                        <input type="hidden" name="id" value={t.id} />
                        <select className="adm-input" name="into" defaultValue="" required aria-label="Merge into">
                          <option value="" disabled>
                            Merge into…
                          </option>
                          {options
                            .filter((o) => o.id !== t.id)
                            .map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.name}
                              </option>
                            ))}
                        </select>
                        <SubmitButton className="adm-btn adm-btn-sm adm-btn-primary">Merge</SubmitButton>
                        <button type="button" className="adm-icon-btn" onClick={() => setMerging(null)} aria-label="Cancel">
                          <Icon name="close" size={14} />
                        </button>
                      </ActionForm>
                    ) : (
                      <div className="adm-row-actions">
                        <a className="adm-icon-btn" href={`/tag/${t.slug}`} target="_blank" rel="noreferrer" title="View on site">
                          <Icon name="external" size={15} />
                        </a>
                        <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => setEditing(t.id)}>
                          Rename
                        </button>
                        <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => setMerging(t.id)}>
                          Merge
                        </button>
                        <ActionButton action={deleteTagAction} fields={{ id: t.id }} className="adm-icon-btn" danger title="Delete" confirm={`Delete the tag “${t.name}”? It will be removed from ${t.total} stories.`}>
                          <Icon name="trash" size={15} />
                        </ActionButton>
                      </div>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
