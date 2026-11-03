import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { UPLOAD_DIR } from './db';
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

/** Persists an uploaded File under data/uploads/YYYY/MM and records it in the media library. */
export async function saveUpload(file: File, userId: number | null, meta: { alt?: string; credit?: string } = {}): Promise<Media> {
  const ext = ALLOWED_UPLOADS[file.type];
  if (!ext) throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('File is larger than 25 MB');
  const now = new Date();
  const sub = path.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
  const dir = path.join(UPLOAD_DIR, sub);
  fs.mkdirSync(dir, { recursive: true });
  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'file';
  const filename = `${base}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  const rel = `${sub.split(path.sep).join('/')}/${filename}`;
  const url = `/media/${rel}`;
  const id = insertMedia({
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

export function removeUploadFile(rel: string) {
  const full = path.resolve(UPLOAD_DIR, rel);
  if (!full.startsWith(path.resolve(UPLOAD_DIR))) return;
  fs.rmSync(full, { force: true });
}
