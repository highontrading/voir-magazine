'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '@/lib/settings';
import { logActivity } from '@/lib/data/site';
import { fail, ok, type ActionResult } from '@/lib/admin/form';
import type { HomeBlock, HomeBlockType, SiteSettings } from '@/lib/types';

const TYPES: HomeBlockType[] = ['hero', 'latest', 'section', 'popular', 'video', 'magazine', 'newsletter', 'podcasts', 'editors-picks', 'tag'];
const LAYOUTS = ['grid', 'feature', 'list', 'mosaic'];

export async function saveHomepageAction(input: SiteSettings['homepage']): Promise<ActionResult> {
  const user = await requireUser('site.layout');
  if (!input || !Array.isArray(input.blocks)) return fail('Invalid homepage data.');
  const seen = new Set<string>();
  const blocks: HomeBlock[] = [];
  for (const b of input.blocks) {
    if (!TYPES.includes(b.type)) return fail(`Unknown block type “${String(b.type)}”.`);
    let id = String(b.id || `${b.type}-${blocks.length}`).replace(/[^\w-]/g, '').slice(0, 40) || `${b.type}-${blocks.length}`;
    while (seen.has(id)) id += '-x';
    seen.add(id);
    if ((b.type === 'section' || b.type === 'tag') && !b.ref) return fail(`Choose a ${b.type} for the “${b.title || b.type}” block.`);
    const out: HomeBlock = { id, type: b.type, enabled: !!b.enabled };
    if (b.title?.trim()) out.title = b.title.trim().slice(0, 80);
    if (b.ref) out.ref = String(b.ref).slice(0, 90);
    if (b.layout && LAYOUTS.includes(b.layout)) out.layout = b.layout;
    if (b.limit) out.limit = Math.min(24, Math.max(1, Math.round(Number(b.limit)) || 0)) || undefined;
    blocks.push(out);
  }
  const top = [...new Set((input.topStoryIds ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 6);
  const hero = input.heroArticleId ? Number(input.heroArticleId) || null : null;
  const homepage = { heroArticleId: hero, topStoryIds: top, blocks };
  await saveSettings({ homepage });
  await logActivity(user.id, 'updated', 'homepage', null, `${blocks.filter((b) => b.enabled).length} blocks`);
  revalidatePath('/', 'layout');
  return ok('Homepage saved.', { data: { homepage } });
}

export async function resetHomepageAction(): Promise<ActionResult> {
  const user = await requireUser('site.layout');
  await saveSettings({ homepage: DEFAULT_SETTINGS.homepage });
  await logActivity(user.id, 'reset', 'homepage', null, 'default layout');
  revalidatePath('/', 'layout');
  return ok('Homepage reset to the default layout.', { data: { homepage: (await getSettings()).homepage } });
}
