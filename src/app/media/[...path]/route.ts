import fs from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR } from '@/lib/db';
import { ALLOWED_UPLOADS } from '@/lib/uploads';

const TYPES = Object.fromEntries(Object.entries(ALLOWED_UPLOADS).map(([mime, ext]) => [ext, mime]));

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const root = path.resolve(UPLOAD_DIR);
  const full = path.resolve(root, ...parts);
  if (!full.startsWith(root + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
    return new Response('Not found', { status: 404 });
  }
  const ext = path.extname(full).toLowerCase();
  const type = TYPES[ext === '.jpeg' ? '.jpg' : ext] ?? 'application/octet-stream';
  const data = fs.readFileSync(full);
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ...(ext === '.svg' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } : {}),
    },
  });
}
