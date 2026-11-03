'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Media } from '@/lib/types';
import { formatBytes, timeAgo } from '@/lib/utils';
import { ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { MediaThumb } from '@/components/admin/MediaPicker';
import { Icon } from '@/components/admin/Icon';
import { useConfirm, useToast } from '@/components/admin/Feedback';
import { ACCEPT, uploadFile } from '@/components/admin/upload';
import { deleteMediaAction, mediaUsageAction, updateMediaAction } from './actions';
import { EmptyStateClient } from '@/components/admin/EmptyStateClient';

export function MediaLibrary({ items, userId, canManageAll, filtered }: { items: Media[]; userId: number; canManageAll: boolean; filtered: boolean }) {
  const [sel, setSel] = useState<Media | null>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  useEffect(() => {
    setSel((s) => (s ? (items.find((m) => m.id === s.id) ?? null) : null));
  }, [items]);

  // page-wide drag & drop
  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      depth++;
      setDrag(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDrag(false);
    };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setDrag(false);
      if (e.dataTransfer?.files.length && !document.querySelector('.adm-modal')) void upload(e.dataTransfer.files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, []);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setProgress({ done: 0, total: list.length });
    let okCount = 0;
    let last: Media | null = null;
    for (const f of list) {
      try {
        last = await uploadFile(f);
        okCount++;
      } catch (e) {
        toast(`${f.name}: ${e instanceof Error ? e.message : 'failed'}`, 'error');
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    setProgress(null);
    if (okCount) {
      toast(`${okCount} file${okCount === 1 ? '' : 's'} uploaded`);
      router.refresh();
      if (last) setSel(last);
    }
  }

  async function copy(url: string) {
    const full = new URL(url, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(full);
      toast('URL copied to clipboard');
    } catch {
      window.prompt('Copy this URL', full);
    }
  }

  const canEdit = (m: Media) => canManageAll || m.uploaded_by === userId;

  return (
    <>
      <div
        className={`adm-dropzone ${drag ? 'is-drag' : ''}`}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
      >
        <Icon name="upload" size={24} />
        {progress ? (
          <>
            <strong>
              Uploading {progress.done + 1 > progress.total ? progress.total : progress.done + 1} of {progress.total}…
            </strong>
            <div className="adm-progress">
              <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          </>
        ) : (
          <div>
            <strong>Drop files anywhere on this page</strong> or click to browse
            <div className="adm-small">JPG, PNG, WebP, GIF, AVIF, SVG, MP4, WebM, MP3, M4A, PDF · max 25 MB each · multiple files OK</div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          accept={ACCEPT.any}
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="adm-media-layout">
        <div>
          {items.length ? (
            <div className="adm-media-grid">
              {items.map((m) => (
                <button type="button" key={m.id} className={`adm-media-tile ${sel?.id === m.id ? 'is-selected' : ''}`} onClick={() => setSel(sel?.id === m.id ? null : m)} title={m.original_name}>
                  <MediaThumb m={m} />
                  <span className="adm-media-name">{m.original_name || m.filename}</span>
                  {sel?.id === m.id && (
                    <span className="adm-media-check">
                      <Icon name="check" size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="adm-card">
              <EmptyStateClient icon="media" title={filtered ? 'No files match' : 'Your library is empty'} text={filtered ? 'Try a different search or filter.' : 'Drop images, video or audio here to get started.'} />
            </div>
          )}
        </div>
        <aside className="adm-media-detail">
          {sel ? (
            <div className="adm-card" key={sel.id}>
              <div className="adm-media-detail-preview">
                <MediaThumb m={sel} large />
              </div>
              <div className="adm-card-body adm-stack">
                <dl className="adm-meta-list">
                  <dt>File</dt>
                  <dd>{sel.original_name}</dd>
                  <dt>Type</dt>
                  <dd>{sel.mime}</dd>
                  <dt>Size</dt>
                  <dd>{formatBytes(sel.size)}</dd>
                  <dt>Added</dt>
                  <dd suppressHydrationWarning>{timeAgo(sel.created_at)}</dd>
                  <dt>URL</dt>
                  <dd className="adm-mono adm-small">{sel.url}</dd>
                </dl>
                <div className="adm-row">
                  <button type="button" className="adm-btn adm-btn-sm" onClick={() => copy(sel.url)}>
                    <Icon name="copy" size={13} /> Copy URL
                  </button>
                  <a className="adm-btn adm-btn-sm" href={sel.url} target="_blank" rel="noreferrer">
                    <Icon name="external" size={13} /> Open
                  </a>
                </div>
                {canEdit(sel) ? (
                  <>
                    <ActionForm action={updateMediaAction} className="adm-stack-sm">
                      <input type="hidden" name="id" value={sel.id} />
                      <label className="adm-field">
                        <span className="adm-label">Alt text</span>
                        <textarea className="adm-input" name="alt" rows={2} defaultValue={sel.alt} placeholder="Describe the image for screen readers" />
                      </label>
                      <label className="adm-field">
                        <span className="adm-label">Credit</span>
                        <input className="adm-input" name="credit" defaultValue={sel.credit} placeholder="Photograph by …" />
                      </label>
                      <SubmitButton className="adm-btn adm-btn-primary adm-btn-sm">Save details</SubmitButton>
                    </ActionForm>
                    <hr className="adm-divider" />
                    <button
                      type="button"
                      className="adm-btn adm-btn-sm is-danger"
                      onClick={async () => {
                        const uses = await mediaUsageAction(sel.id);
                        const yes = await confirm({
                          title: 'Delete this file?',
                          message: uses
                            ? `It is used in ${uses} place${uses === 1 ? '' : 's'} (stories, covers, authors or videos), which will show a broken image. The file is removed from disk.`
                            : 'The file is permanently removed from the library and from disk.',
                        });
                        if (!yes) return;
                        const fd = new FormData();
                        fd.set('id', String(sel.id));
                        const r = await deleteMediaAction(null, fd);
                        toast(r.message ?? '', r.ok ? 'success' : 'error');
                        if (r.ok) {
                          setSel(null);
                          router.refresh();
                        }
                      }}
                    >
                      <Icon name="trash" size={13} /> Delete file
                    </button>
                  </>
                ) : (
                  <p className="adm-hint">Only editors can change files uploaded by others.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="adm-card adm-card-body adm-muted adm-small">Select a file to edit its alt text and credit, copy its URL or delete it.</div>
          )}
        </aside>
      </div>
    </>
  );
}
