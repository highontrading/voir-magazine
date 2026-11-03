import 'server-only';
import { all, run } from './db';
import type { SiteSettings } from './types';

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'Voirtales',
  tagline: 'Culture, Power & Style',
  description:
    'Voirtales is the definitive magazine of culture, celebrity, style, royals, politics and power — with longform storytelling, iconic photography and the conversations that define the moment.',
  logoText: 'VOIRTALES',
  logoImage: '',
  accentColor: '#c8102e',
  inkColor: '#111111',
  paperColor: '#ffffff',
  announcement: {
    enabled: true,
    text: 'The November Hollywood Issue is here.',
    link: '/magazine',
    linkLabel: 'Read it now',
  },
  subscribe: {
    headline: 'Get Voirtales in print and online.',
    text: 'Unlimited access to every story, the iconic print magazine delivered to your door, and over a century of archives.',
    cta: 'Subscribe',
    offer: 'Just $1 a month for your first year',
  },
  newsletterPromo: {
    headline: 'Sign up for the Voirtales Daily',
    text: 'The stories everyone is talking about — Hollywood, royals, style and power — delivered every morning.',
  },
  footer: {
    about:
      'Voirtales is a global media brand known for its sharp storytelling, cinematic photography and fearless reporting on the people and ideas shaping culture.',
    copyright: '© {year} Voirtales Media. All rights reserved. Use of this site constitutes acceptance of our User Agreement and Privacy Policy.',
  },
  social: {
    instagram: 'https://instagram.com/',
    x: 'https://x.com/',
    facebook: 'https://facebook.com/',
    youtube: 'https://youtube.com/',
    tiktok: 'https://tiktok.com/',
    pinterest: 'https://pinterest.com/',
  },
  seo: {
    defaultTitle: 'Voirtales | Culture, Power & Style',
    defaultDescription:
      'Hollywood, royals, style, culture, politics and business — the stories behind the headlines, from the editors of Voirtales.',
    ogImage: '',
  },
  cookieBanner: {
    enabled: true,
    text: 'We use cookies to personalise content, measure readership and improve your experience. You can change your preferences at any time.',
  },
  features: {
    readingProgress: true,
    scrollAnimations: true,
    breakingTicker: true,
    readerAccounts: true,
    paywallTeaser: false,
    backToTop: true,
    darkVideoBand: true,
  },
  ticker: { label: 'Trending', items: [] },
  homepage: {
    heroArticleId: null,
    topStoryIds: [],
    blocks: [
      { id: 'hero', type: 'hero', enabled: true },
      { id: 'latest', type: 'latest', enabled: true, title: 'The Latest', limit: 8 },
      { id: 's-hollywood', type: 'section', enabled: true, ref: 'hollywood', layout: 'feature', title: 'Hollywood' },
      { id: 'magazine', type: 'magazine', enabled: true, title: 'The Magazine' },
      { id: 's-style', type: 'section', enabled: true, ref: 'style', layout: 'grid', title: 'Style' },
      { id: 'video', type: 'video', enabled: true, title: 'Watch' },
      { id: 's-royals', type: 'section', enabled: true, ref: 'royals', layout: 'mosaic', title: 'Royals' },
      { id: 'popular', type: 'popular', enabled: true, title: 'Most Popular' },
      { id: 's-culture', type: 'section', enabled: true, ref: 'culture', layout: 'list', title: 'Culture' },
      { id: 'newsletter', type: 'newsletter', enabled: true },
      { id: 's-politics', type: 'section', enabled: true, ref: 'politics', layout: 'grid', title: 'Politics' },
      { id: 'editors-picks', type: 'editors-picks', enabled: true, title: 'Editors’ Picks' },
      { id: 's-business', type: 'section', enabled: true, ref: 'business', layout: 'feature', title: 'Business' },
      { id: 'podcasts', type: 'podcasts', enabled: true, title: 'Listen' },
    ],
  },
  contactEmail: 'letters@voirtales.com',
  address: '1 World Trade Center, New York, NY 10007',
};

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Deep-merge stored values over defaults so new settings keys always have a value. */
function merge<T>(base: T, over: unknown): T {
  if (!isObj(base) || !isObj(over)) return (over === undefined ? base : (over as T));
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over)) {
    out[k] = k in out ? merge(out[k], v) : v;
  }
  return out as T;
}

export function getSettings(): SiteSettings {
  const rows = all<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      stored[r.key] = JSON.parse(r.value);
    } catch {
      /* ignore corrupt values */
    }
  }
  return merge(DEFAULT_SETTINGS, stored);
}

export function saveSettings(patch: Partial<SiteSettings>) {
  for (const [k, v] of Object.entries(patch)) {
    run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      k,
      JSON.stringify(v),
    );
  }
}
