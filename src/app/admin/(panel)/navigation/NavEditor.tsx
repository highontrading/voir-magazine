'use client';

import { useState, useTransition } from 'react';
import type { MenuName } from '@/lib/types';
import { Icon } from '@/components/admin/Icon';
import { useToast } from '@/components/admin/Feedback';
import { useUnsavedGuard } from '@/components/admin/useUnsavedGuard';
import { saveMenuAction } from './actions';

interface Item {
  key: string;
  label: string;
  url: string;
  new_tab: boolean;
}
type Plain = Omit<Item, 'key'>;
type Menus = Record<'header' | 'hamburger' | 'footer' | 'footer_legal', Plain[]>;

const INFO: Record<keyof Menus, { label: string; desc: string }> = {
  header: { label: 'Header', desc: 'The main links across the top of every page.' },
  hamburger: { label: 'Slide-out menu', desc: 'The full menu opened from the ☰ button.' },
  footer: { label: 'Footer', desc: 'Links in the footer columns.' },
  footer_legal: { label: 'Footer legal', desc: 'Small print links at the very bottom (privacy, terms…).' },
};

let seq = 0;
const withKeys = (list: Plain[]): Item[] => list.map((i) => ({ ...i, key: `k${++seq}` }));
const strip = (list: Item[]): Plain[] => list.map(({ label, url, new_tab }) => ({ label, url, new_tab }));

export function NavEditor({ menus, suggestions }: { menus: Menus; suggestions: { group: string; items: { label: string; url: string }[] }[] }) {
  const [tab, setTab] = useState<keyof Menus>('header');
  const [state, setState] = useState<Record<keyof Menus, Item[]>>(() => ({
    header: withKeys(menus.header),
    hamburger: withKeys(menus.hamburger),
    footer: withKeys(menus.footer),
    footer_legal: withKeys(menus.footer_legal),
  }));
  const [saved, setSaved] = useState(() => JSON.stringify(menus));
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const items = state[tab];
  const savedObj = JSON.parse(saved) as Menus;
  const dirtyMenus = (Object.keys(state) as (keyof Menus)[]).filter((m) => JSON.stringify(strip(state[m])) !== JSON.stringify(savedObj[m]));
  useUnsavedGuard(dirtyMenus.length > 0);

  const set = (fn: (l: Item[]) => Item[]) => setState((s) => ({ ...s, [tab]: fn(s[tab]) }));
  const move = (from: number, to: number) =>
    set((l) => {
      if (to < 0 || to >= l.length) return l;
      const n = [...l];
      const [x] = n.splice(from, 1);
      n.splice(to, 0, x!);
      return n;
    });

  function save() {
    const menu = tab;
    start(async () => {
      const r = await saveMenuAction(menu as MenuName, strip(state[menu]));
      toast(r.message ?? '', r.ok ? 'success' : 'error');
      if (r.ok) {
        const clean = (r.data?.items as Plain[]) ?? strip(state[menu]);
        setState((s) => ({ ...s, [menu]: withKeys(clean) }));
        setSaved((prev) => JSON.stringify({ ...(JSON.parse(prev) as Menus), [menu]: clean }));
      }
    });
  }

  return (
    <div className="adm-grid-2-1">
      <section className="adm-card">
        <nav className="adm-tabs" style={{ padding: '0 12px', marginBottom: 0 }}>
          {(Object.keys(INFO) as (keyof Menus)[]).map((m) => (
            <button key={m} type="button" className={tab === m ? 'is-active' : ''} onClick={() => setTab(m)}>
              {INFO[m].label}
              <span className="adm-tab-count">{state[m].length}</span>
              {dirtyMenus.includes(m) && <span className="adm-unsaved">●</span>}
            </button>
          ))}
        </nav>
        <div className="adm-card-body adm-stack">
          <p className="adm-section-note" style={{ margin: 0 }}>
            {INFO[tab].desc}
          </p>
          {items.length ? (
            <ol className="adm-navitems">
              {items.map((it, i) => (
                <li
                  key={it.key}
                  className={`adm-navitem ${over === i && drag !== i ? 'is-over' : ''}`}
                  onDragOver={(e) => {
                    if (drag === null) return;
                    e.preventDefault();
                    setOver(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (drag !== null) move(drag, i);
                    setDrag(null);
                    setOver(null);
                  }}
                >
                  <span
                    className="adm-block-grip"
                    draggable
                    onDragStart={(e) => {
                      setDrag(i);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      setDrag(null);
                      setOver(null);
                    }}
                    title="Drag to reorder"
                  >
                    <Icon name="grip" size={16} strokeWidth={3} />
                  </span>
                  <input className="adm-input" aria-label="Label" placeholder="Label" value={it.label} onChange={(e) => set((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input className="adm-input adm-navitem-url" aria-label="URL" placeholder="/path or https://…" value={it.url} onChange={(e) => set((l) => l.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                  <label className="adm-check adm-small" title="Open in a new tab">
                    <input type="checkbox" checked={it.new_tab} onChange={(e) => set((l) => l.map((x, j) => (j === i ? { ...x, new_tab: e.target.checked } : x)))} />
                    <span className="adm-hide-sm">New tab</span>
                  </label>
                  <span className="adm-row-actions">
                    <button type="button" className="adm-icon-btn adm-icon-btn-xs" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up">
                      <Icon name="up" size={12} />
                    </button>
                    <button type="button" className="adm-icon-btn adm-icon-btn-xs" disabled={i === items.length - 1} onClick={() => move(i, i + 1)} aria-label="Move down">
                      <Icon name="down" size={12} />
                    </button>
                    <button type="button" className="adm-icon-btn adm-icon-btn-xs is-danger" onClick={() => set((l) => l.filter((_, j) => j !== i))} aria-label="Remove">
                      <Icon name="close" size={12} />
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="adm-hint">This menu is empty.</p>
          )}
          <div className="adm-row-between">
            <button type="button" className="adm-btn adm-btn-sm" onClick={() => set((l) => [...l, { key: `k${++seq}`, label: '', url: '', new_tab: false }])}>
              <Icon name="plus" size={12} /> Add custom link
            </button>
            <div className="adm-row">
              <button type="button" className="adm-btn" disabled={!dirtyMenus.includes(tab) || pending} onClick={() => setState((s) => ({ ...s, [tab]: withKeys(savedObj[tab]) }))}>
                Discard
              </button>
              <button type="button" className="adm-btn adm-btn-primary" disabled={pending} onClick={save}>
                {pending && <span className="adm-spinner" />} Save {INFO[tab].label.toLowerCase()} menu
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Quick add</h2>
        </div>
        <div className="adm-card-body adm-stack">
          {suggestions.map((g) => (
            <div key={g.group}>
              <span className="adm-label" style={{ marginBottom: 6 }}>
                {g.group}
              </span>
              <div className="adm-add-block">
                {g.items.map((s) => {
                  const has = items.some((x) => x.url === s.url);
                  return (
                    <button key={s.url} type="button" className="adm-btn adm-btn-sm" disabled={has} title={s.url} onClick={() => set((l) => [...l, { key: `k${++seq}`, label: s.label, url: s.url, new_tab: false }])}>
                      {has ? <Icon name="check" size={12} /> : <Icon name="plus" size={12} />} {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
