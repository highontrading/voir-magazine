import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { READ_ONLY_FS, UPLOAD_DIR } from './db';
import { insertMedia } from './data/site';
import { slugify } from './utils';
import type { Media } from './types';

export const ALLOWED_UPLOADS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'application/pdf': '.pdf',
};

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** True when uploads go to Vercel Blob (durable, works on serverless hosts). */
export const BLOB_UPLOADS = !!process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Persists an uploaded File and records it in the media library.
 * - With BLOB_READ_WRITE_TOKEN set: stored in Vercel Blob (public URL).
 * - Otherwise: written to $DATA_DIR/uploads/YYYY/MM and served from /media/….
 */
export async function saveUpload(file: File, userId: number | null, meta: { alt?: string; credit?: string } = {}): Promise<Media> {
  const ext = ALLOWED_UPLOADS[file.type];
  if (!ext) throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('File is larger than 25 MB');
  const now = new Date();
  const sub = path.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'file';
  const filename = `${base}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  const rel = `${sub.split(path.sep).join('/')}/${filename}`;
  let url: string;
  if (BLOB_UPLOADS) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`uploads/${rel}`, file, { access: 'public', contentType: file.type, addRandomSuffix: false });
    url = blob.url;
  } else {
    if (READ_ONLY_FS) {
      throw new Error('Uploads need persistent storage on this host: connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN) and redeploy.');
    }
    const dir = path.join(UPLOAD_DIR, sub);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    url = `/media/${rel}`;
  }
  const id = await insertMedia({
    filename: rel,
    url,
    original_name: file.name,
    mime: file.type,
    size: file.size,
    alt: meta.alt ?? '',
    credit: meta.credit ?? '',
    uploaded_by: userId,
  });
  return { id, filename: rel, url, original_name: file.name, mime: file.type, size: file.size, alt: meta.alt ?? '', credit: meta.credit ?? '', uploaded_by: userId, created_at: now.toISOString() };
}

/** Removes a stored upload. Pass the media row's url (Blob) or filename (local). */
export async function removeUploadFile(relOrUrl: string): Promise<void> {
  if (/^https?:\/\//.test(relOrUrl)) {
    // Only files in our own Blob store are deleted; other absolute URLs are external references.
    if (BLOB_UPLOADS && /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(relOrUrl)) {
      const { del } = await import('@vercel/blob');
      await del(relOrUrl).catch(() => {});
    }
    return;
  }
  const rel = relOrUrl.replace(/^\/media\//, '');
  const full = path.resolve(UPLOAD_DIR, rel);
  if (!full.startsWith(path.resolve(UPLOAD_DIR))) return;
  fs.rmSync(full, { force: true });
}
