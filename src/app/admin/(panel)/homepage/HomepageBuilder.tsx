'use client';

import { useMemo, useState, useTransition } from 'react';
import type { HomeBlock, HomeBlockType, SiteSettings } from '@/lib/types';
import { SearchSelect, Toggle, type Option } from '@/components/admin/Fields';
import { Icon } from '@/components/admin/Icon';
import { useConfirm, useToast } from '@/components/admin/Feedback';
import { useUnsavedGuard } from '@/components/admin/useUnsavedGuard';
import { resetHomepageAction, saveHomepageAction } from './actions';

type Homepage = SiteSettings['homepage'];

const META: Record<HomeBlockType, { label: string; desc: string; limit?: boolean; title?: boolean }> = {
  hero: { label: 'Lead & Top Stories', desc: 'The lead story with the Top Stories rail', title: false },
  latest: { label: 'The Latest', desc: 'Most recent stories', limit: true, title: true },
  section: { label: 'Section', desc: 'Showcase of one section', limit: true, title: true },
  popular: { label: 'Most Popular', desc: 'Numbered list of the most read', limit: true, title: true },
  video: { label: 'Video band', desc: 'Dark band with the latest videos', title: true },
  magazine: { label: 'Magazine', desc: 'Current issue + subscribe promo', title: true },
  newsletter: { label: 'Newsletter', desc: 'Newsletter sign-up band', title: true },
  podcasts: { label: 'Podcasts', desc: 'Podcast shows', title: true },
  'editors-picks': { label: 'Editors’ Picks', desc: 'Carousel of editors’ picks', limit: true, title: true },
  tag: { label: 'Tag', desc: 'Stories with a given tag', limit: true, title: true },
};
const LAYOUTS = [
  ['grid', 'Grid'],
  ['feature', 'Feature'],
  ['list', 'List'],
  ['mosaic', 'Mosaic'],
];

export function HomepageBuilder({ initial, articles, sections, tags, autoHero, autoTop }: { initial: Homepage; articles: Option[]; sections: Option[]; tags: Option[]; autoHero: string | null; autoTop: string[] }) {
  const [hp, setHp] = useState<Homepage>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();
  const dirty = JSON.stringify(hp) !== saved;
  useUnsavedGuard(dirty);
  const titleOf = useMemo(() => Object.fromEntries(articles.map((a) => [a.value, a.label])), [articles]);

  const setBlocks = (fn: (b: HomeBlock[]) => HomeBlock[]) => setHp((p) => ({ ...p, blocks: fn(p.blocks) }));
  const update = (i: number, patch: Partial<HomeBlock>) => setBlocks((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (from: number, to: number) =>
    setBlocks((b) => {
      if (to < 0 || to >= b.length || from === to) return b;
      const next = [...b];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it!);
      return next;
    });
  const add = (type: HomeBlockType) => {
    const id = `${type}-${Math.random().toString(36).slice(2, 7)}`;
    const block: HomeBlock = { id, type, enabled: true, title: type === 'hero' ? undefined : META[type].label };
    if (type === 'section') Object.assign(block, { ref: sections[0]?.value, title: sections[0]?.label, layout: 'grid', limit: 4 });
    if (type === 'tag') Object.assign(block, { ref: '', layout: 'grid', limit: 4 });
    setBlocks((b) => [...b, block]);
    setOpen(id);
  };

  function save() {
    start(async () => {
      const r = await saveHomepageAction(hp);
      toast(r.message ?? '', r.ok ? 'success' : 'error');
      if (r.ok && r.data?.homepage) {
        const h = r.data.homepage as Homepage;
        setHp(h);
        setSaved(JSON.stringify(h));
      }
    });
  }

  const tops = hp.topStoryIds;

  return (
    <div className="adm-stack">
      <div className="adm-grid-2">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Lead story</h2>
          </div>
          <div className="adm-card-body adm-stack-sm">
            <SearchSelect
              options={articles}
              value={hp.heroArticleId ? String(hp.heroArticleId) : ''}
              onChange={(v) => setHp((p) => ({ ...p, heroArticleId: v ? Number(v) : null }))}
              emptyLabel="Automatic — latest featured story"
              placeholder="Search published stories…"
            />
            <p className="adm-hint">
              {hp.heroArticleId ? (
                'Pinned. Clear it to fall back to the latest story marked “Featured”.'
              ) : autoHero ? (
                <>
                  Currently showing: <strong>{autoHero}</strong>
                </>
              ) : (
                'No featured story yet — mark a story as Featured in the editor.'
              )}
            </p>
          </div>
        </section>
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Top Stories</h2>
            <span className="adm-muted adm-small">{tops.length}/6</span>
          </div>
          <div className="adm-card-body adm-stack-sm">
            {tops.length > 0 ? (
              <ul className="adm-orderlist">
                {tops.map((id, i) => (
                  <li key={id}>
                    <span>
                      <strong>
                        {i + 1}. {titleOf[String(id)] ?? `Story #${id} (not published)`}
                      </strong>
                    </span>
                    <span className="adm-orderlist-actions">
                      <button type="button" className="adm-icon-btn adm-icon-btn-xs" disabled={i === 0} aria-label="Move up" onClick={() => setHp((p) => ({ ...p, topStoryIds: swap(p.topStoryIds, i, i - 1) }))}>
                        <Icon name="up" size={12} />
                      </button>
                      <button type="button" className="adm-icon-btn adm-icon-btn-xs" disabled={i === tops.length - 1} aria-label="Move down" onClick={() => setHp((p) => ({ ...p, topStoryIds: swap(p.topStoryIds, i, i + 1) }))}>
                        <Icon name="down" size={12} />
                      </button>
                      <button type="button" className="adm-icon-btn adm-icon-btn-xs" aria-label="Remove" onClick={() => setHp((p) => ({ ...p, topStoryIds: p.topStoryIds.filter((x) => x !== id) }))}>
                        <Icon name="close" size={12} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-hint">
                Automatic — stories marked “Top story”{autoTop.length ? `: ${autoTop.slice(0, 3).join(' · ')}${autoTop.length > 3 ? '…' : ''}` : '.'}
              </p>
            )}
            {tops.length < 6 && (
              <SearchSelect
                value=""
                options={articles.filter((a) => !tops.includes(Number(a.value)) && Number(a.value) !== hp.heroArticleId)}
                onChange={(v) => v && setHp((p) => ({ ...p, topStoryIds: [...p.topStoryIds, Number(v)].slice(0, 6) }))}
                emptyLabel="Add a story…"
                allowEmpty={false}
                placeholder="Search published stories…"
              />
            )}
          </div>
        </section>
      </div>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Page blocks</h2>
          <span className="adm-muted adm-small">Drag to reorder · {hp.blocks.filter((b) => b.enabled).length} of {hp.blocks.length} enabled</span>
        </div>
        <div className="adm-card-body adm-stack">
          <ol className="adm-blocks">
            {hp.blocks.map((b, i) => {
              const m = META[b.type];
              const isOpen = open === b.id;
              const refLabel = b.type === 'section' ? sections.find((s) => s.value === b.ref)?.label : b.type === 'tag' ? tags.find((t) => t.value === b.ref)?.label : null;
              return (
                <li
                  key={b.id}
                  className={`adm-block ${b.enabled ? '' : 'is-disabled'} ${dragIdx === i ? 'is-dragging' : ''} ${overIdx === i && dragIdx !== i ? 'is-over' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    if ((e.target as HTMLElement).closest('input,select,textarea,.adm-combo')) return e.preventDefault();
                    setDragIdx(i);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    if (dragIdx === null) return;
                    e.preventDefault();
                    setOverIdx(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIdx !== null) move(dragIdx, i);
                    setDragIdx(null);
                    setOverIdx(null);
                  }}
                  onDragEnd={() => {
                    setDragIdx(null);
                    setOverIdx(null);
                  }}
                >
                  <div className="adm-block-head">
                    <span className="adm-block-grip" title="Drag to reorder" aria-hidden="true">
                      <Icon name="grip" size={16} strokeWidth={3} />
                    </span>
                    <span className="adm-block-type">{m.label}</span>
                    <span className="adm-block-title">
                      {b.title || m.desc}
                      {refLabel && refLabel !== b.title && <small>· {refLabel}</small>}
                      {(b.type === 'section' || b.type === 'tag') && !b.ref && <small style={{ color: 'var(--adm-red)' }}>· choose a {b.type}</small>}
                      {b.layout && <small>· {b.layout}</small>}
                    </span>
                    <div className="adm-block-actions">
                      <Toggle label={<span className="sr-only">Enabled</span>} checked={b.enabled} onChange={(v) => update(i, { enabled: v })} />
                      <button type="button" className="adm-icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                        <Icon name="up" size={14} />
                      </button>
                      <button type="button" className="adm-icon-btn" aria-label="Move down" disabled={i === hp.blocks.length - 1} onClick={() => move(i, i + 1)}>
                        <Icon name="down" size={14} />
                      </button>
                      <button type="button" className={`adm-icon-btn ${isOpen ? 'is-active' : ''}`} aria-label="Edit block" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : b.id)}>
                        <Icon name="settings" size={14} />
                      </button>
                      <button
                        type="button"
                        className="adm-icon-btn is-danger"
                        aria-label="Remove block"
                        onClick={async () => (await confirm({ message: `Remove the “${b.title || m.label}” block from the homepage?`, confirmLabel: 'Remove' })) && setBlocks((x) => x.filter((_, j) => j !== i))}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="adm-block-body">
                      {m.title !== false && (
                        <label className="adm-field">
                          <span className="adm-label">Heading</span>
                          <input className="adm-input" value={b.title ?? ''} onChange={(e) => update(i, { title: e.target.value })} placeholder={m.label} />
                        </label>
                      )}
                      {b.type === 'section' && (
                        <label className="adm-field">
                          <span className="adm-label">Section</span>
                          <select
                            className="adm-input"
                            value={b.ref ?? ''}
                            onChange={(e) => {
                              const old = sections.find((s) => s.value === b.ref)?.label;
                              const lbl = sections.find((s) => s.value === e.target.value)?.label;
                              update(i, { ref: e.target.value, title: !b.title || b.title === old ? lbl : b.title });
                            }}
                          >
                            <option value="">Choose…</option>
                            {sections.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {b.type === 'tag' && (
                        <div className="adm-field">
                          <span className="adm-label">Tag</span>
                          <SearchSelect options={tags} value={b.ref ?? ''} onChange={(v) => update(i, { ref: v, title: !b.title || b.title === META.tag.label ? tags.find((t) => t.value === v)?.label : b.title })} emptyLabel="Choose a tag…" allowEmpty={false} />
                        </div>
                      )}
                      {(b.type === 'section' || b.type === 'tag') && (
                        <label className="adm-field">
                          <span className="adm-label">Layout</span>
                          <select className="adm-input" value={b.layout ?? 'grid'} onChange={(e) => update(i, { layout: e.target.value })}>
                            {LAYOUTS.map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {m.limit && (
                        <label className="adm-field">
                          <span className="adm-label">Number of stories</span>
                          <input className="adm-input" type="number" min={1} max={24} value={b.limit ?? ''} placeholder="Default" onChange={(e) => update(i, { limit: e.target.value ? Number(e.target.value) : undefined })} />
                        </label>
                      )}
                      {m.title === false && !m.limit && <p className="adm-hint">This block is configured by the Lead story and Top Stories settings above.</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {hp.blocks.length === 0 && <p className="adm-hint">No blocks — add some below.</p>}
          <div>
            <span className="adm-label" style={{ marginBottom: 8 }}>
              Add a block
            </span>
            <div className="adm-add-block">
              {(Object.keys(META) as HomeBlockType[]).map((t) => (
                <button key={t} type="button" className="adm-btn adm-btn-sm" onClick={() => add(t)} title={META[t].desc}>
                  <Icon name="plus" size={12} /> {META[t].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="adm-sticky-actions">
        {dirty && <span className="adm-unsaved adm-small">● Unsaved changes</span>}
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="adm-btn adm-btn-ghost"
          disabled={pending}
          onClick={async () => {
            if (!(await confirm({ message: 'Replace the current homepage layout with the default layout?', confirmLabel: 'Reset' }))) return;
            start(async () => {
              const r = await resetHomepageAction();
              toast(r.message ?? '', r.ok ? 'success' : 'error');
              if (r.ok && r.data?.homepage) {
                setHp(r.data.homepage as Homepage);
                setSaved(JSON.stringify(r.data.homepage));
              }
            });
          }}
        >
          Reset to default
        </button>
        <button type="button" className="adm-btn" disabled={!dirty || pending} onClick={() => setHp(JSON.parse(saved))}>
          Discard
        </button>
        <button type="button" className="adm-btn adm-btn-primary" disabled={pending} onClick={save}>
          {pending && <span className="adm-spinner" />} Save homepage
        </button>
      </div>
    </div>
  );
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  if (j < 0 || j >= arr.length) return arr;
  const n = [...arr];
  [n[i], n[j]] = [n[j]!, n[i]!];
  return n;
}
