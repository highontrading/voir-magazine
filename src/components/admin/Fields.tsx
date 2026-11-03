'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { slugify } from '@/lib/utils';
import { Icon } from './Icon';
import { FieldError } from './ActionForm';

/* ---------- Title + slug pair (slug follows the title until edited by hand) ---------- */

export function TitleSlugFields({
  titleName = 'title',
  slugName = 'slug',
  titleLabel = 'Title',
  defaultTitle = '',
  defaultSlug = '',
  prefix = '/',
  required = true,
  large,
}: {
  titleName?: string;
  slugName?: string;
  titleLabel?: string;
  defaultTitle?: string;
  defaultSlug?: string;
  prefix?: string;
  required?: boolean;
  large?: boolean;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [slug, setSlug] = useState(defaultSlug);
  const [touched, setTouched] = useState(!!defaultSlug);
  return (
    <>
      <label className="adm-field">
        <span className="adm-label">
          {titleLabel}
          {required && <em>*</em>}
        </span>
        <input
          className={`adm-input ${large ? 'adm-input-lg' : ''}`}
          name={titleName}
          value={title}
          required={required}
          maxLength={300}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!touched) setSlug(slugify(e.target.value));
          }}
        />
        <FieldError name={titleName} />
      </label>
      <SlugInput name={slugName} value={slug} prefix={prefix} onChange={(v) => { setSlug(v); setTouched(true); }} onReset={() => { setSlug(slugify(title)); setTouched(false); }} />
    </>
  );
}

export function SlugInput({ name = 'slug', value, onChange, prefix = '/', onReset }: { name?: string; value: string; onChange: (v: string) => void; prefix?: string; onReset?: () => void }) {
  return (
    <label className="adm-field">
      <span className="adm-label">Slug</span>
      <div className="adm-input-group">
        <span className="adm-input-addon">{prefix}</span>
        <input className="adm-input" name={name} value={value} onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))} onBlur={(e) => onChange(slugify(e.target.value))} placeholder="auto-generated" />
        {onReset && (
          <button type="button" className="adm-input-addon adm-input-btn" onClick={onReset} title="Regenerate from title">
            ↺
          </button>
        )}
      </div>
      <FieldError name={name} />
    </label>
  );
}

/* ---------- datetime-local that submits an ISO string in a hidden input ---------- */

function toLocal(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DateTimeField({ name, label, defaultValue, hint, value, onChange }: { name?: string; label?: string; defaultValue?: string | null; hint?: string; value?: string | null; onChange?: (iso: string | null) => void }) {
  const [iso, setIso] = useState<string | null>(value !== undefined ? value : defaultValue ?? null);
  const [local, setLocal] = useState('');
  const current = value !== undefined ? value : iso;
  // Compute local time only on the client to avoid server/browser timezone mismatches.
  useEffect(() => setLocal(toLocal(current)), [current]);
  return (
    <label className="adm-field">
      {label && <span className="adm-label">{label}</span>}
      <div className="adm-input-group">
        <input
          className="adm-input"
          type="datetime-local"
          value={local}
          onChange={(e) => {
            setLocal(e.target.value);
            const d = e.target.value ? new Date(e.target.value) : null;
            const next = d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
            setIso(next);
            onChange?.(next);
          }}
        />
        <button
          type="button"
          className="adm-input-addon adm-input-btn"
          title="Set to now"
          onClick={() => {
            const n = new Date().toISOString();
            setIso(n);
            setLocal(toLocal(n));
            onChange?.(n);
          }}
        >
          Now
        </button>
      </div>
      {name && <input type="hidden" name={name} value={current ?? ''} />}
      {hint && <span className="adm-hint">{hint}</span>}
    </label>
  );
}

/* ---------- Searchable single select ---------- */

export interface Option {
  value: string;
  label: string;
  meta?: string;
}

export function SearchSelect({
  name,
  options,
  value,
  defaultValue = '',
  onChange,
  placeholder = 'Search…',
  emptyLabel = 'None',
  allowEmpty = true,
}: {
  name?: string;
  options: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  allowEmpty?: boolean;
}) {
  const [inner, setInner] = useState(defaultValue);
  const v = value ?? inner;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const selected = options.find((o) => o.value === v);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t ? options.filter((o) => o.label.toLowerCase().includes(t) || o.meta?.toLowerCase().includes(t)) : options;
    return list.slice(0, 80);
  }, [q, options]);

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open]);

  const pick = (val: string) => {
    if (value === undefined) setInner(val);
    onChange?.(val);
    setOpen(false);
    setQ('');
    box.current?.dispatchEvent(new Event('input', { bubbles: true }));
  };

  return (
    <div className="adm-combo" ref={box}>
      {name && <input type="hidden" name={name} value={v} />}
      <button type="button" className="adm-input adm-combo-btn" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span className={selected ? '' : 'adm-muted'}>{selected ? selected.label : emptyLabel}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className="adm-combo-pop">
          <input
            className="adm-input"
            autoFocus
            placeholder={placeholder}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setHi(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHi((h) => Math.min(h + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHi((h) => Math.max(h - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filtered[hi]) pick(filtered[hi].value);
              } else if (e.key === 'Escape') setOpen(false);
            }}
          />
          <ul role="listbox" id={id}>
            {allowEmpty && (
              <li>
                <button type="button" className={!v ? 'is-active' : ''} onClick={() => pick('')}>
                  <span className="adm-muted">{emptyLabel}</span>
                </button>
              </li>
            )}
            {filtered.map((o, i) => (
              <li key={o.value}>
                <button type="button" className={`${o.value === v ? 'is-active' : ''} ${i === hi ? 'is-hi' : ''}`} onClick={() => pick(o.value)} onMouseEnter={() => setHi(i)}>
                  <span>{o.label}</span>
                  {o.meta && <small>{o.meta}</small>}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="adm-combo-none">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------- Chip input (tags) ---------- */

export function ChipInput({ value, onChange, suggestions = [], placeholder = 'Add…', name }: { value: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string; name?: string }) {
  const [text, setText] = useState('');
  const listId = useId();
  const add = (raw: string) => {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next);
    setText('');
  };
  return (
    <div className="adm-chips">
      {value.map((t) => (
        <span key={t} className="adm-chip">
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>
            <Icon name="close" size={11} />
          </button>
        </span>
      ))}
      <input
        list={listId}
        value={text}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(',')) add(v);
          else setText(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(text);
          } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => add(text)}
      />
      <datalist id={listId}>
        {suggestions.filter((s) => !value.includes(s)).slice(0, 200).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {name && <input type="hidden" name={name} value={value.join(',')} />}
    </div>
  );
}

/* ---------- Color input with hex text + swatch ---------- */

export function ColorField({ name, label, value, defaultValue = '#000000', onChange, hint }: { name?: string; label: string; value?: string; defaultValue?: string; onChange?: (v: string) => void; hint?: string }) {
  const [inner, setInner] = useState(defaultValue);
  const v = value ?? inner;
  const set = (x: string) => {
    if (value === undefined) setInner(x);
    onChange?.(x);
  };
  const valid = /^#[0-9a-f]{6}$/i.test(v);
  return (
    <label className="adm-field">
      <span className="adm-label">{label}</span>
      <div className="adm-color">
        <input type="color" value={valid ? v : '#000000'} onChange={(e) => set(e.target.value)} aria-label={`${label} picker`} />
        <input className="adm-input adm-mono" name={name} value={v} onChange={(e) => set(e.target.value)} maxLength={7} placeholder="#000000" />
      </div>
      {hint && <span className="adm-hint">{hint}</span>}
    </label>
  );
}

/* ---------- Checkbox toggle ---------- */

export function Toggle({ name, label, defaultChecked, checked, onChange, hint, disabled }: { name?: string; label: React.ReactNode; defaultChecked?: boolean; checked?: boolean; onChange?: (v: boolean) => void; hint?: string; disabled?: boolean }) {
  return (
    <label className={`adm-toggle ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" name={name} defaultChecked={checked === undefined ? defaultChecked : undefined} checked={checked} onChange={onChange ? (e) => onChange(e.target.checked) : undefined} disabled={disabled} />
      <span className="adm-toggle-track" aria-hidden="true">
        <span />
      </span>
      <span className="adm-toggle-text">
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

/* ---------- Character counter textarea/input ---------- */

export function CountedInput({ name, label, defaultValue = '', max, textarea, rows = 3, placeholder, hint }: { name: string; label: string; defaultValue?: string; max: number; textarea?: boolean; rows?: number; placeholder?: string; hint?: string }) {
  const [v, setV] = useState(defaultValue);
  return (
    <label className="adm-field">
      <span className="adm-label">
        {label}
        <span className={`adm-count ${v.length > max ? 'is-over' : ''}`}>
          {v.length}/{max}
        </span>
      </span>
      {textarea ? (
        <textarea className="adm-input" name={name} rows={rows} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className="adm-input" name={name} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} />
      )}
      {hint && <span className="adm-hint">{hint}</span>}
    </label>
  );
}
