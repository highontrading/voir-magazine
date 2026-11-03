'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '@/lib/settings';
import { logActivity } from '@/lib/data/site';
import { EMAIL_RE, fail, isUrlish, ok, type ActionResult } from '@/lib/admin/form';
import type { SiteSettings } from '@/lib/types';

export type EditableSettings = Omit<SiteSettings, 'homepage'>;

const HEX = /^#[0-9a-f]{6}$/i;
const t = (v: unknown, max = 2000) => String(v ?? '').trim().slice(0, max);

export async function saveSettingsAction(input: EditableSettings): Promise<ActionResult> {
  const user = await requireUser('settings.manage');
  const errors: Record<string, string> = {};
  if (!t(input.siteName)) errors.siteName = 'Site name is required.';
  for (const k of ['accentColor', 'inkColor', 'paperColor'] as const) if (!HEX.test(input[k])) errors[k] = 'Use a 6-digit hex colour, e.g. #c8102e.';
  if (input.contactEmail && !EMAIL_RE.test(input.contactEmail)) errors.contactEmail = 'Enter a valid email address.';
  if (!isUrlish(t(input.announcement.link))) errors['announcement.link'] = 'Links must start with / or https://';
  for (const [k, v] of Object.entries(input.social)) if (!isUrlish(t(v))) errors[`social.${k}`] = 'Use a full https:// URL.';
  input.ticker.items.forEach((it, i) => {
    if (it.url && !isUrlish(t(it.url))) errors[`ticker.${i}`] = `Ticker item ${i + 1}: link must start with / or https://`;
  });
  if (Object.keys(errors).length) return fail(Object.values(errors)[0]!, errors);

  const d = DEFAULT_SETTINGS;
  const clean: EditableSettings = {
    siteName: t(input.siteName, 80),
    tagline: t(input.tagline, 160),
    description: t(input.description, 600),
    logoText: t(input.logoText, 40) || t(input.siteName, 40).toUpperCase(),
    logoImage: t(input.logoImage, 1000),
    accentColor: input.accentColor.toLowerCase(),
    inkColor: input.inkColor.toLowerCase(),
    paperColor: input.paperColor.toLowerCase(),
    announcement: { enabled: !!input.announcement.enabled, text: t(input.announcement.text, 300), link: t(input.announcement.link, 500), linkLabel: t(input.announcement.linkLabel, 60) },
    subscribe: { headline: t(input.subscribe.headline, 200), text: t(input.subscribe.text, 800), cta: t(input.subscribe.cta, 40) || d.subscribe.cta, offer: t(input.subscribe.offer, 200) },
    newsletterPromo: { headline: t(input.newsletterPromo.headline, 200), text: t(input.newsletterPromo.text, 800) },
    footer: { about: t(input.footer.about, 1000), copyright: t(input.footer.copyright, 400) },
    social: Object.fromEntries(Object.keys(d.social).map((k) => [k, t((input.social as Record<string, string>)[k], 500)])) as SiteSettings['social'],
    seo: { defaultTitle: t(input.seo.defaultTitle, 120), defaultDescription: t(input.seo.defaultDescription, 400), ogImage: t(input.seo.ogImage, 1000) },
    cookieBanner: { enabled: !!input.cookieBanner.enabled, text: t(input.cookieBanner.text, 600) },
    features: Object.fromEntries(Object.keys(d.features).map((k) => [k, !!(input.features as Record<string, boolean>)[k]])) as SiteSettings['features'],
    ticker: {
      label: t(input.ticker.label, 40),
      items: input.ticker.items
        .map((i) => ({ text: t(i.text, 200), url: t(i.url, 500) }))
        .filter((i) => i.text)
        .slice(0, 20),
    },
    contactEmail: t(input.contactEmail, 200),
    address: t(input.address, 300),
  };
  await saveSettings(clean);
  await logActivity(user.id, 'updated', 'settings', null, 'site settings');
  revalidatePath('/', 'layout');
  const { homepage: _h, ...rest } = await getSettings();
  return ok('Settings saved.', { data: { settings: rest } });
}
