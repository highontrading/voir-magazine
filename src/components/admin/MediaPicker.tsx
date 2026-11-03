'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Media } from '@/lib/types';
import { formatBytes } from '@/lib/utils';
import { Icon } from './Icon';
import { useToast } from './Feedback';
import { ACCEPT, uploadFile, type MediaKind } from './upload';
import { Portal } from './Portal';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (m: Media) => void;
  kind?: MediaKind;
  title?: string;
}

/** Modal media library: browse, search, upload (button or drop) and pick a file. */
export function MediaPicker({ open, onClose, onSelect, kind = 'image', title }: Props) {
  const [items, setItems] = useState<Media[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [selected, setSelected] = useState<Media | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const load = useCallback(
    async (query: string, p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query, page: String(p) });
        if (kind !== 'any') params.set('kind', kind);
        const res = await fetch(`/api/admin/media?${params}`, { cache: 'no-store' });
        const data = await res.json();
        setItems((prev) => (p === 1 ? data.items : [...prev, ...data.items]));
        setPages(data.pages ?? 1);
      } catch {
        toast('Could not load the media library.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [kind, toast],
  );

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setPage(1);
    const t = setTimeout(() => load(q, 1), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [open, q, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading((n) => n + list.length);
    let last: Media | null = null;
    for (const f of list) {
      try {
        const m = await uploadFile(f);
        last = m;
        setItems((prev) => [m, ...prev]);
      } catch (e) {
        toast(`${f.name}: ${e instanceof Error ? e.message : 'upload failed'}`, 'error');
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (last) {
      setSelected(last);
      toast(list.length > 1 ? `${list.length} files uploaded` : 'File uploaded');
    }
  }

  if (!open) return null;

  return (
    <Portal>
    <div className="adm-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`adm-modal adm-modal-xl adm-picker ${drag ? 'is-drag' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Media library'}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDrag(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="adm-modal-head">
          <h2>{title ?? 'Media library'}</h2>
          <div className="adm-picker-tools">
            <div className="adm-search">
              <Icon name="search" />
              <input type="search" placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            </div>
            <button type="button" className="adm-btn adm-btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading > 0}>
              {uploading > 0 ? <span className="adm-spinner" /> : <Icon name="upload" />}
              {uploading > 0 ? `Uploading ${uploading}…` : 'Upload'}
            </button>
            <input ref={fileRef} type="file" hidden multiple accept={ACCEPT[kind]} onChange={(e) => e.target.files && handleFiles(e.target.files).then(() => (e.target.value = ''))} />
            <button type="button" className="adm-icon-btn" aria-label="Close" onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>
        </div>
        <div className="adm-picker-body">
          <div className="adm-picker-grid-wrap">
            {items.length === 0 && !loading ? (
              <div className="adm-empty adm-empty-sm">
                <Icon name="media" size={28} />
                <p>{q ? 'No files match your search.' : 'No files yet. Drop files here or click Upload.'}</p>
              </div>
            ) : (
              <div className="adm-media-grid is-compact">
                {items.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    className={`adm-media-tile ${selected?.id === m.id ? 'is-selected' : ''}`}
                    onClick={() => setSelected(m)}
                    onDoubleClick={() => {
                      onSelect(m);
                      onClose();
                    }}
                    title={m.original_name}
                  >
                    <MediaThumb m={m} />
                    <span className="adm-media-name">{m.original_name || m.filename}</span>
                  </button>
                ))}
              </div>
            )}
            {page < pages && (
              <div className="adm-center adm-mt">
                <button
                  type="button"
                  className="adm-btn"
                  disabled={loading}
                  onClick={() => {
                    const p = page + 1;
                    setPage(p);
                    load(q, p);
                  }}
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
            {loading && page === 1 && <div className="adm-center adm-muted adm-mt">Loading…</div>}
          </div>
          <aside className="adm-picker-side">
            {selected ? (
              <>
                <div className="adm-picker-preview">
                  <MediaThumb m={selected} large />
                </div>
                <dl className="adm-meta-list">
                  <dt>File</dt>
                  <dd>{selected.original_name}</dd>
                  <dt>Type</dt>
                  <dd>{selected.mime}</dd>
                  <dt>Size</dt>
                  <dd>{formatBytes(selected.size)}</dd>
                  {selected.alt && (
                    <>
                      <dt>Alt text</dt>
                      <dd>{selected.alt}</dd>
                    </>
                  )}
                  {selected.credit && (
                    <>
                      <dt>Credit</dt>
                      <dd>{selected.credit}</dd>
                    </>
                  )}
                </dl>
              </>
            ) : (
              <p className="adm-muted adm-small">Select a file to see its details. Double-click to insert instantly. You can also drag files from your desktop into this window.</p>
            )}
          </aside>
        </div>
        <div className="adm-modal-foot">
          <button type="button" className="adm-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            disabled={!selected}
            onClick={() => {
              if (selected) onSelect(selected);
              onClose();
            }}
          >
            Use selected
          </button>
        </div>
        {drag && <div className="adm-drop-overlay">Drop files to upload</div>}
      </div>
    </div>
    </Portal>
  );
}

export function MediaThumb({ m, large }: { m: Pick<Media, 'url' | 'mime' | 'alt' | 'original_name'>; large?: boolean }) {
  if (m.mime.startsWith('image/')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={m.url} alt={m.alt || ''} loading="lazy" />;
  }
  if (m.mime.startsWith('video/')) {
    return large ? <video src={m.url} controls preload="metadata" /> : <span className="adm-file-icon"><Icon name="video" size={28} /></span>;
  }
  if (m.mime.startsWith('audio/')) {
    return large ? <audio src={m.url} controls preload="none" /> : <span className="adm-file-icon"><Icon name="music" size={28} /></span>;
  }
  return (
    <span className="adm-file-icon">
      <Icon name="pages" size={28} />
    </span>
  );
}
