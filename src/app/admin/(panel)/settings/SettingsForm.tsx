'use client';

import { useState, useTransition } from 'react';
import { ColorField, Toggle } from '@/components/admin/Fields';
import { MediaField } from '@/components/admin/MediaField';
import { Icon } from '@/components/admin/Icon';
import { useToast } from '@/components/admin/Feedback';
import { useUnsavedGuard } from '@/components/admin/useUnsavedGuard';
import { saveSettingsAction, type EditableSettings } from './actions';

const TABS = [
  ['general', 'General', 'settings'],
  ['theme', 'Theme', 'star'],
  ['announcement', 'Announcement bar', 'bolt'],
  ['ticker', 'Ticker', 'activity'],
  ['subscribe', 'Subscribe promo', 'card'],
  ['newsletter', 'Newsletter promo', 'mail'],
  ['footer', 'Footer', 'nav'],
  ['social', 'Social links', 'globe'],
  ['seo', 'SEO defaults', 'search'],
  ['cookies', 'Cookie banner', 'alert'],
  ['features', 'Features', 'check'],
] as const;
type Tab = (typeof TABS)[number][0];

const FEATURES: { key: keyof EditableSettings['features']; label: string; hint: string }[] = [
  { key: 'readingProgress', label: 'Reading progress bar', hint: 'Thin bar at the top of stories showing how far you have read' },
  { key: 'scrollAnimations', label: 'Scroll animations', hint: 'Subtle reveal animations as content enters the screen' },
  { key: 'breakingTicker', label: 'Breaking ticker', hint: 'Scrolling headline ticker under the header (see Ticker)' },
  { key: 'readerAccounts', label: 'Reader accounts', hint: 'Let readers register, sign in and save stories' },
  { key: 'paywallTeaser', label: 'Paywall teaser', hint: 'Fade long stories after a few paragraphs with a subscribe prompt' },
  { key: 'backToTop', label: 'Back-to-top button', hint: 'Floating button on long pages' },
  { key: 'darkVideoBand', label: 'Dark video band', hint: 'Render the homepage video block on a dark background' },
];

const SOCIAL: { key: keyof EditableSettings['social']; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'x', label: 'X (Twitter)' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'pinterest', label: 'Pinterest' },
];

const PRESETS = [
  { name: 'Voirtales red', accent: '#c8102e', ink: '#111111', paper: '#ffffff' },
  { name: 'Noir', accent: '#111111', ink: '#0a0a0a', paper: '#ffffff' },
  { name: 'Royal', accent: '#1f3a8a', ink: '#111827', paper: '#fdfcf9' },
  { name: 'Emerald', accent: '#0f766e', ink: '#0b1f1c', paper: '#fbfaf6' },
  { name: 'Plum', accent: '#7e22ce', ink: '#1a1023', paper: '#fffdfb' },
];

export function SettingsForm({ initial }: { initial: EditableSettings }) {
  const [s, setS] = useState<EditableSettings>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [tab, setTab] = useState<Tab>('general');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const toast = useToast();
  const dirty = JSON.stringify(s) !== saved;
  useUnsavedGuard(dirty);

  const set = <K extends keyof EditableSettings>(k: K, v: EditableSettings[K]) => setS((p) => ({ ...p, [k]: v }));
  const sub = <K extends 'announcement' | 'subscribe' | 'newsletterPromo' | 'footer' | 'social' | 'seo' | 'cookieBanner' | 'features' | 'ticker'>(k: K, patch: Partial<EditableSettings[K]>) =>
    setS((p) => ({ ...p, [k]: { ...p[k], ...patch } }));
  const err = (k: string) => (errors[k] ? <p className="adm-field-error">{errors[k]}</p> : null);

  function save() {
    start(async () => {
      const r = await saveSettingsAction(s);
      if (!r.ok) {
        setErrors(r.errors ?? {});
        toast(r.message ?? 'Could not save.', 'error');
        const first = Object.keys(r.errors ?? {})[0] ?? '';
        const map: Record<string, Tab> = { siteName: 'general', contactEmail: 'general', accentColor: 'theme', inkColor: 'theme', paperColor: 'theme', announcement: 'announcement', social: 'social', ticker: 'ticker' };
        const t = map[first.split('.')[0]!];
        if (t) setTab(t);
        return;
      }
      setErrors({});
      const next = (r.data?.settings as EditableSettings) ?? s;
      setS(next);
      setSaved(JSON.stringify(next));
      toast(r.message ?? 'Saved.');
    });
  }

  const field = (label: string, value: string, onChange: (v: string) => void, opts: { textarea?: boolean; rows?: number; placeholder?: string; hint?: string; error?: string; type?: string } = {}) => (
    <label className="adm-field">
      <span className="adm-label">{label}</span>
      {opts.textarea ? (
        <textarea className="adm-input" rows={opts.rows ?? 3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={opts.placeholder} />
      ) : (
        <input className="adm-input" type={opts.type ?? 'text'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={opts.placeholder} />
      )}
      {opts.hint && <span className="adm-hint">{opts.hint}</span>}
      {opts.error && err(opts.error)}
    </label>
  );

  return (
    <div className="adm-settings">
      <nav className="adm-settings-nav" aria-label="Settings sections">
        {TABS.map(([k, l, icon]) => (
          <button key={k} type="button" className={tab === k ? 'is-active' : ''} onClick={() => setTab(k)}>
            <Icon name={icon} size={15} /> {l}
          </button>
        ))}
      </nav>
      <div className="adm-stack">
        {tab === 'general' && (
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>General</h2>
            </div>
            <div className="adm-card-body adm-stack">
              <div className="adm-form-grid">
                {field('Site name', s.siteName, (v) => set('siteName', v), { error: 'siteName' })}
                {field('Tagline', s.tagline, (v) => set('tagline', v))}
              </div>
              {field('Description', s.description, (v) => set('description', v), { textarea: true, hint: 'Fallback meta description and RSS feed description (the footer text is set under Footer).' })}
              <div className="adm-form-grid">
                {field('Logo text', s.logoText, (v) => set('logoText', v), { hint: 'The wordmark set in the display typeface.' })}
                <div className="adm-field">
                  <span className="adm-label">Wordmark preview</span>
                  <div className="adm-theme-preview">
                    <div className="adm-theme-preview-bar" style={{ background: s.paperColor, color: s.inkColor, justifyContent: 'center', fontSize: 22 }}>
                      {s.logoImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logoImage} alt="" style={{ maxHeight: 32 }} />
                      ) : (
                        s.logoText || s.siteName.toUpperCase()
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <MediaField label="Logo image (optional)" value={s.logoImage} onChange={(v) => set('logoImage', v)} hint="Replaces the text wordmark when set. SVG or transparent PNG works best." compact />
              <div className="adm-form-grid">
                {field('Contact email', s.contactEmail, (v) => set('contactEmail', v), { type: 'email', error: 'contactEmail' })}
                {field('Address', s.address, (v) => set('address', v))}
              </div>
            </div>
          </section>
        )}

        {tab === 'theme' && (
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Theme</h2>
            </div>
            <div className="adm-card-body adm-stack">
              <div className="adm-form-grid-3">
                <div>
                  <ColorField label="Accent" value={s.accentColor} onChange={(v) => set('accentColor', v)} hint="Links, buttons, kickers" />
                  {err('accentColor')}
                </div>
                <div>
                  <ColorField label="Ink" value={s.inkColor} onChange={(v) => set('inkColor', v)} hint="Body text & dark surfaces" />
                  {err('inkColor')}
                </div>
                <div>
                  <ColorField label="Paper" value={s.paperColor} onChange={(v) => set('paperColor', v)} hint="Page background" />
                  {err('paperColor')}
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-label">Presets</span>
                <div className="adm-add-block">
                  {PRESETS.map((p) => (
                    <button key={p.name} type="button" className="adm-btn adm-btn-sm" onClick={() => setS((x) => ({ ...x, accentColor: p.accent, inkColor: p.ink, paperColor: p.paper }))}>
                      <span className="adm-swatch" style={{ background: p.accent }} />
                      <span className="adm-swatch" style={{ background: p.paper }} /> {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-label">Live preview</span>
                <div className="adm-theme-preview" style={{ background: s.paperColor, color: s.inkColor }}>
                  <div className="adm-theme-preview-bar" style={{ borderBottom: `1px solid ${s.inkColor}22` }}>
                    <span>{s.logoText || s.siteName}</span>
                    <span className="adm-theme-preview-btn" style={{ background: s.accentColor, marginTop: 0 }}>
                      {s.subscribe.cta || 'Subscribe'}
                    </span>
                  </div>
                  <div className="adm-theme-preview-body">
                    <span className="adm-theme-preview-kicker" style={{ color: s.accentColor }}>
                      Cover story
                    </span>
                    <h4>The headline sets the tone for everything that follows</h4>
                    <p style={{ fontSize: 14, opacity: 0.85 }}>
                      Body copy is set in the serif face. <a style={{ color: s.accentColor, textDecoration: 'underline' }}>Links use the accent colour</a>, and the paper colour fills the page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'announcement' && (
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Announcement bar</h2>
            </div>
            <div className="adm-card-body adm-stack">
              <Toggle label="Show the announcement bar" checked={s.announcement.enabled} onChange={(v) => sub('announcement', { enabled: v })} />
              {field('Text', s.announcement.text, (v) => sub('announcement', { text: v }))}
              <div className="adm-form-grid">
                {field('Link URL', s.announcement.link, (v) => sub('announcement', { link: v }), { placeholder: '/magazine', error: 'announcement.link' })}
                {field('Link label', s.announcement.linkLabel, (v) => sub('announcement', { linkLabel: v }))}
              </div>
              <div className="adm-field">
                <span className="adm-label">Preview</span>
                <div className="adm-announce-preview" style={{ background: s.inkColor, color: s.paperColor, opacity: s.announcement.enabled ? 1 : 0.4 }}>
                  {s.announcement.text}
                  {s.announcement.linkLabel && <a>{s.announcement.linkLabel} →</a>}
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'ticker' && (
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Breaking ticker</h2>
              {!s.features.breakingTicker && <span className="adm-pill is-inactive">Disabled in Features</span>}
            </div>
            <div className="adm-card-body adm-stack">
              {field('Label', s.ticker.label, (v) => sub('ticker', { label: v }), { placeholder: 'Trending' })}
              <div className="adm-field">
                <span className="adm-label">Items</span>
                {s.ticker.items.length === 0 && <p className="adm-hint">No custom items — the site falls back to the latest headlines.</p>}
                <div className="adm-stack-sm">
                  {s.ticker.items.map((it, i) => (
                    <div key={i}>
                      <div className="adm-ticker-row">
                        <input className="adm-input" placeholder="Headline text" value={it.text} onChange={(e) => sub('ticker', { items: s.ticker.items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                        <input className="adm-input" placeholder="/story/slug or https://…" value={it.url} onChange={(e) => sub('ticker', { items: s.ticker.items.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                        <span className="adm-row-actions">
                          <button type="button" className="adm-icon-btn adm-icon-btn-xs" disabled={i === 0} aria-label="Move up" onClick={() => sub('ticker', { items: swap(s.ticker.items, i, i - 1) })}>
                            <Icon name="up" size={12} />
                          </button>
                          <button type="button" className="adm-icon-btn adm-icon-btn-xs is-danger" aria-label="Remove" onClick={() => sub('ticker', { items: s.ticker.items.filter((_, j) => j !== i) })}>
                            <Icon name="close" size={12} />
                          </button>
                        </span>
                      </div>
                      {err(`ticker.${i}`)}
                    </div>
                  ))}
                </div>
                <div>
                  <button type="button" className="adm-btn adm-btn-sm" style={{ marginTop: 8 }} onClick={() => sub('ticker', { items: [...s.ticker.items, { text: '', url: '' }] })}>
                    <Icon name="plus" size={12} /> Add item
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'subscribe' && (
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Subscribe promo</h2>
            </div>
            <div className="adm-card-body adm-stack">
              {field('Headline', s.subscribe.headline, (v) => sub('subscribe', { headline: v }))}
              {field('Text', s.subscribe.text, (v) => sub('subscribe', { text: v }), { textarea: true })}
              <div className="adm-form-grid">
                {field('Button label', s.subscribe.cta, (v) => sub('subscribe', { cta: v }))}
                {field('Offer line', s.subscribe.offer, (v) => sub('subscribe', { offer: v }), { placeholder: 'Just $1 a month for your first year' })}
              </div>
            </div>
          </section>
        )}

        {tab === 'newsletter' && (
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Newsletter promo</h2>
            </div>
            <div className="adm-card-body adm-stack">
              {field('Headline', s.newsletterPromo.headline, (v) => sub('newsletterPromo', { headline: v }))}
              {field('Text', s.newsletterPromo.text, (v) => sub('newsletterPromo', { text: v }), { textarea: true })}
            </div>
          </section>
        )}

        {tab === 'footer' && (
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Footer</h2>
            </div>
            <div className="adm-card-body adm-stack">
              {field('About text', s.footer.about, (v) => sub('footer', { about: v }), { textarea: true, rows: 4 })}
              {field('Copyright line', s.footer.copyright, (v) => sub('footer', { copyright: v }), { textarea: true, rows: 2, hint: '{year} is replaced with the current year.' })}
              <p className="adm-hint">
                Footer links are managed in <a className="adm-link" href="/admin/navigation">Navigation</a>.
              </p>
            </div>
          </section>
        )}

        {tab === 'social' && (
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Social links</h2>
            </div>
            <div className="adm-card-body adm-form-grid">
              {SOCIAL.map(({ key, label }) => (
                <div key={key}>{field(label, s.social[key], (v) => sub('social', { [key]: v } as Partial<EditableSettings['social']>), { placeholder: 'https://', error: `social.${key}` })}</div>
              ))}
              <p className="adm-hint is-full">Leave a field empty to hide that network.</p>
            </div>
          </section>
        )}

        {tab === 'seo' && (
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>SEO defaults</h2>
            </div>
            <div className="adm-card-body adm-stack">
              {field('Default title', s.seo.defaultTitle, (v) => sub('seo', { defaultTitle: v }), { hint: 'Used on the homepage and pages without their own title.' })}
              {field('Default description', s.seo.defaultDescription, (v) => sub('seo', { defaultDescription: v }), { textarea: true })}
              <div className="adm-serp">
                <div className="adm-serp-url">voirtales.com</div>
                <div className="adm-serp-title">{s.seo.defaultTitle || s.siteName}</div>
                <div className="adm-serp-desc">{s.seo.defaultDescription}</div>
              </div>
              <MediaField label="Default social share image (og:image)" value={s.seo.ogImage} onChange={(v) => sub('seo', { ogImage: v })} hint="1200 × 630 recommended. Stories use their own hero image." compact />
            </div>
          </section>
        )}

        {tab === 'cookies' && (
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Cookie banner</h2>
            </div>
            <div className="adm-card-body adm-stack">
              <Toggle label="Show the cookie consent banner" checked={s.cookieBanner.enabled} onChange={(v) => sub('cookieBanner', { enabled: v })} />
              {field('Banner text', s.cookieBanner.text, (v) => sub('cookieBanner', { text: v }), { textarea: true })}
            </div>
          </section>
        )}

        {tab === 'features' && (
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Feature switches</h2>
            </div>
            <div className="adm-card-body adm-stack">
              {FEATURES.map((f) => (
                <Toggle key={f.key} label={f.label} hint={f.hint} checked={s.features[f.key]} onChange={(v) => sub('features', { [f.key]: v } as Partial<EditableSettings['features']>)} />
              ))}
            </div>
          </section>
        )}

        <div className="adm-sticky-actions">
          {dirty && <span className="adm-unsaved adm-small">● Unsaved changes</span>}
          <span style={{ flex: 1 }} />
          <button type="button" className="adm-btn" disabled={!dirty || pending} onClick={() => setS(JSON.parse(saved))}>
            Discard
          </button>
          <button type="button" className="adm-btn adm-btn-primary" disabled={pending} onClick={save}>
            {pending && <span className="adm-spinner" />} Save settings
          </button>
        </div>
      </div>
    </div>
  );
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  if (j < 0 || j >= arr.length) return arr;
  const n = [...arr];
  [n[i], n[j]] = [n[j]!, n[i]!];
  return n;
}
