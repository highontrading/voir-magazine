'use client';

import { useRef, useState } from 'react';
import type { Media } from '@/lib/types';
import { Icon } from './Icon';
import { MediaPicker } from './MediaPicker';
import { useToast } from './Feedback';
import { ACCEPT, isImage, uploadFile, type MediaKind } from './upload';

interface Props {
  name?: string;
  label?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (url: string, media?: Media) => void;
  kind?: MediaKind;
  hint?: string;
  aspect?: 'wide' | 'square' | 'portrait';
  compact?: boolean;
  hidePreview?: boolean;
}

/**
 * URL field with preview + "Upload" + "Library" (MediaPicker). Works controlled (value/onChange)
 * or uncontrolled inside a form (name/defaultValue).
 */
export function MediaField({ name, label, defaultValue = '', value, onChange, kind = 'image', hint, aspect = 'wide', compact, hidePreview }: Props) {
  const [inner, setInner] = useState(defaultValue);
  const url = value ?? inner;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const set = (v: string, m?: Media) => {
    if (value === undefined) setInner(v);
    onChange?.(v, m);
    // let ActionForm's unsaved-changes tracking notice programmatic changes
    fileRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
  };

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      const m = await uploadFile(f);
      set(m.url, m);
      toast('Uploaded');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className={`adm-mediafield ${compact ? 'is-compact' : ''}`}>
      {label && <span className="adm-label">{label}</span>}
      {!hidePreview && <div
        className={`adm-mediafield-preview is-${aspect} ${url ? '' : 'is-empty'}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void onFile(e.dataTransfer.files[0]);
        }}
      >
        {url ? (
          kind === 'video' && !isImage(url) ? (
            /\.(mp4|webm)(\?|$)/i.test(url) ? <video src={url} controls preload="metadata" /> : <span className="adm-muted adm-small">{url}</span>
          ) : kind === 'audio' ? (
            <audio src={url} controls preload="none" />
          ) : (
            <img src={url} alt="" />
          )
        ) : (
          <button type="button" className="adm-mediafield-empty" onClick={() => setOpen(true)}>
            <Icon name={kind === 'audio' ? 'music' : kind === 'video' ? 'video' : 'image'} size={22} />
            <span>{busy ? 'Uploading…' : 'Choose from library or drop a file'}</span>
          </button>
        )}
        {busy && <div className="adm-mediafield-busy"><span className="adm-spinner" /></div>}
      </div>}
      <div className="adm-mediafield-row">
        <input className="adm-input" type="text" name={name} value={url} placeholder="https://… or /media/…" onChange={(e) => set(e.target.value)} />
      </div>
      <div className="adm-mediafield-actions">
        <button type="button" className="adm-btn adm-btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <span className="adm-spinner" /> : <Icon name="upload" size={14} />} {busy ? 'Uploading…' : 'Upload'}
        </button>
        <button type="button" className="adm-btn adm-btn-sm" onClick={() => setOpen(true)}>
          <Icon name="media" size={14} /> Library
        </button>
        {url && (
          <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => set('')}>
            Remove
          </button>
        )}
      </div>
      {hint && <p className="adm-hint">{hint}</p>}
      <input ref={fileRef} type="file" hidden accept={ACCEPT[kind]} onChange={(e) => onFile(e.target.files?.[0])} />
      <MediaPicker open={open} kind={kind} onClose={() => setOpen(false)} onSelect={(m) => set(m.url, m)} />
    </div>
  );
}
