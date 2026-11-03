'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { listNav, logActivity, replaceMenu } from '@/lib/data/site';
import { fail, isUrlish, ok, type ActionResult } from '@/lib/admin/form';
import type { MenuName } from '@/lib/types';

const MENUS: MenuName[] = ['header', 'hamburger', 'footer', 'footer_legal', 'social'];

export async function saveMenuAction(menu: MenuName, items: { label: string; url: string; new_tab: boolean }[]): Promise<ActionResult> {
  const user = await requireUser('site.layout');
  if (!MENUS.includes(menu)) return fail('Unknown menu.');
  if (!Array.isArray(items) || items.length > 60) return fail('Too many items.');
  const clean = items.map((i) => ({ label: String(i.label ?? '').trim().slice(0, 80), url: String(i.url ?? '').trim().slice(0, 500), new_tab: !!i.new_tab }));
  const bad = clean.findIndex((i) => (i.label && !i.url) || (!i.label && i.url));
  if (bad >= 0) return fail(`Item ${bad + 1} needs both a label and a link.`);
  const badUrl = clean.find((i) => i.url && !isUrlish(i.url));
  if (badUrl) return fail(`“${badUrl.url}” isn’t a valid link. Use /path or https://…`);
  await replaceMenu(menu, clean.filter((i) => i.label && i.url));
  await logActivity(user.id, 'updated', 'menu', null, menu);
  revalidatePath('/', 'layout');
  return ok('Menu saved.', { data: { items: (await listNav(menu)).map((n) => ({ label: n.label, url: n.url, new_tab: !!n.new_tab })) } });
}
