// Deletes the local SQLite database (and uploads) so the site re-seeds itself on next start.
import fs from 'node:fs';
import path from 'node:path';

const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
for (const f of fs.readdirSync(dir)) {
  if (f.startsWith('voirtales.db')) fs.rmSync(path.join(dir, f));
}
if (process.argv.includes('--uploads')) {
  const up = path.join(dir, 'uploads');
  for (const f of fs.readdirSync(up)) if (f !== '.gitkeep') fs.rmSync(path.join(up, f), { recursive: true });
}
console.log('Database removed. It will be re-created with demo content on next start.');
