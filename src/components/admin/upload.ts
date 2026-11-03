'use client';

import type { Media } from '@/lib/types';

export const ACCEPT = {
  image: 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml',
  video: 'video/mp4,video/webm',
  audio: 'audio/mpeg,audio/mp4',
  any: 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml,video/mp4,video/webm,audio/mpeg,audio/mp4,application/pdf',
} as const;

export type MediaKind = keyof typeof ACCEPT;

export async function uploadFile(file: File, meta: { alt?: string; credit?: string } = {}): Promise<Media> {
  const fd = new FormData();
  fd.append('file', file);
  if (meta.alt) fd.append('alt', meta.alt);
  if (meta.credit) fd.append('credit', meta.credit);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
  const json = await res.json().catch(() => ({ error: `Upload failed (${res.status})` }));
  if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`);
  return json as Media;
}

export function isImage(url: string, mime?: string) {
  return mime ? mime.startsWith('image/') : /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(url) || /picsum\.photos|images\.unsplash/.test(url);
}
