'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ArticleStatus } from '@/lib/types';
import type { ArticlePayload } from '@/lib/admin/article';
import { ARTICLE_TYPES, HERO_LAYOUTS } from '@/lib/admin/article';
import { slugify, timeAgo } from '@/lib/utils';
import { saveArticleAction, deleteArticleAction } from '@/app/admin/(panel)/articles/actions';
import { RichEditor, type EditorStats } from './editor/RichEditor';
import { MediaField } from './MediaField';
import { ChipInput, DateTimeField, SearchSelect, Toggle } from './Fields';
import { Icon } from './Icon';
import { useConfirm, useToast } from './Feedback';
import { useUnsavedGuard } from './useUnsavedGuard';

interface Props {
  initial: ArticlePayload;
  meta: { updated_at: string | null; created_at: string | null; views: number; reading_time: number };
  sections: { id: number; name: string; color: string }[];
  authors: { id: number; name: string; title: string }[];
  issues: { id: number; title: string; issue_date: string }[];
  tagSuggestions: string[];
  canPublish: boolean;
  locked: boolean;
  siteName: string;
}

const STATUS_LABEL: Record<ArticleStatus, string> = { draft: 'Draft', review: 'In review', published: 'Published', scheduled: 'Scheduled', archived: 'Archived' };
const TYPE_LABEL: Record<string, string> = { story: 'Story', feature: 'Feature', gallery: 'Gallery', review: 'Review', interview: 'Interview' };
const LAYOUT_LABEL: Record<string, string> = { standard: 'Standard', full: 'Full-bleed', split: 'Split' };

export function ArticleEditor({ initial, meta, sections, authors, issues, tagSuggestions, canPublish, locked, siteName }: Props) {
  const [a, setA] = useState<ArticlePayload>(initial);
  const [saved, setSaved] = useState<string>(() => JSON.stringify(initial));
  const [savedStatus, setSavedStatus] = useState<ArticleStatus>(initial.status);
  const [updatedAt, setUpdatedAt] = useState(meta.updated_at);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<EditorStats>({ words: 0, minutes: meta.reading_time || 1 });
  const [pending, start] = useTransition();
  const [, tick] = useState(0);
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const previewWin = useRef<Window | null>(null);
  const [origin, setOrigin] = useState('voirtales.com');
  useEffect(() => setOrigin(window.location.host), []);

  const dirty = useMemo(() => JSON.stringify(a) !== saved, [a, saved]);
  useUnsavedGuard(dirty && !locked);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const set = useCallback(<K extends keyof ArticlePayload>(k: K, v: ArticlePayload[K]) => setA((p) => ({ ...p, [k]: v })), []);

  const isLive = savedStatus === 'published' || savedStatus === 'scheduled';
  const future = !!a.published_at && new Date(a.published_at).getTime() > Date.now() + 30_000;

  const save = useCallback(
    (statusOverride?: ArticleStatus, after?: (slug: string) => void) => {
      if (locked) return;
      const payload = { ...a, status: statusOverride ?? a.status };
      start(async () => {
        const r = await saveArticleAction(payload);
        if (!r.ok) {
          setErrors(r.errors ?? {});
          toast(r.message ?? 'Could not save.', 'error');
          if (previewWin.current) {
            previewWin.current.close();
            previewWin.current = null;
          }
          return;
        }
        setErrors({});
        const d = r.data as { id: number; slug: string; status: ArticleStatus; published_at: string | null; updated_at: string };
        const next = { ...payload, id: d.id, slug: d.slug, status: d.status, published_at: d.published_at };
        setA(next);
        setSaved(JSON.stringify(next));
        setSavedStatus(d.status);
        setUpdatedAt(d.updated_at);
        setSlugTouched(true);
        toast(r.message ?? 'Saved.');
        after?.(d.slug);
        if (!initial.id) router.replace(`/admin/articles/${d.id}`);
        else router.refresh();
      });
    },
    [a, locked, toast, router, initial.id],
  );

  // Ctrl/Cmd+S saves with the current status
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!pending) save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, pending]);

  function preview() {
    if (!a.id && !dirty) return;
    if (!dirty && a.slug) {
      window.open(`/story/${a.slug}?preview=1`, '_blank');
      return;
    }
    // open synchronously (popup blockers), then point it at the freshly saved story
    const w = window.open('about:blank', '_blank');
    previewWin.current = w;
    save(undefined, (slug) => {
      if (w) w.location.href = `/story/${slug}?preview=1`;
      previewWin.current = null;
    });
  }

  async function remove() {
    if (!a.id) return;
    const yes = await confirm({ message: `Delete “${a.title || 'Untitled'}”? This cannot be undone.`, title: 'Delete this story?' });
    if (!yes) return;
    const fd = new FormData();
    fd.set('id', String(a.id));
    start(async () => {
      const r = await deleteArticleAction(null, fd);
      if (!r.ok) return toast(r.message ?? 'Could not delete.', 'error');
      setSaved(JSON.stringify(a)); // clear dirty so navigation isn't blocked
      toast('Story deleted.');
      router.push('/admin/articles');
    });
  }

  const primaryLabel = !canPublish
    ? ''
    : isLive && (a.status === 'published' || a.status === 'scheduled')
      ? future
        ? savedStatus === 'scheduled'
          ? 'Update schedule'
          : 'Schedule'
        : savedStatus === 'scheduled'
          ? 'Publish now'
          : 'Update'
      : future
        ? 'Schedule'
        : 'Publish';

  const seoTitle = a.seo_title || (a.title ? `${a.title} | ${siteName}` : `Headline | ${siteName}`);
  const seoDesc = a.seo_description || a.dek || 'Add a dek or SEO description — it is what readers see in search results.';

  const selectedAuthors = a.authorIds.map((id) => authors.find((x) => x.id === id)).filter(Boolean) as Props['authors'];
  const err = (k: string) => (errors[k] ? <p className="adm-field-error">{errors[k]}</p> : null);

  return (
    <div className="adm-editor-page">
      <div className="adm-editor-bar">
        <Link href="/admin/articles" className="adm-back">
          ← Articles
        </Link>
        <span className={`adm-pill is-${savedStatus}`}>{STATUS_LABEL[savedStatus]}</span>
        <span className="adm-editor-saved">
          {pending ? (
            <>
              <span className="adm-spinner" /> Saving…
            </>
          ) : dirty ? (
            <span className="adm-unsaved">● Unsaved changes</span>
          ) : updatedAt ? (
            `Saved ${timeAgo(updatedAt).toLowerCase()}`
          ) : (
            'Not saved yet'
          )}
        </span>
        <div className="adm-editor-bar-actions">
          <button type="button" className="adm-btn adm-btn-ghost" onClick={preview} disabled={pending || (!a.id && !a.title)} title="Opens the story on the site in a new tab">
            <Icon name="eye" size={14} /> Preview
          </button>
          {!locked && (
            <>
              {(!isLive || !canPublish) && (
                <button type="button" className="adm-btn" disabled={pending} onClick={() => save('draft')}>
                  Save draft
                </button>
              )}
              {canPublish && isLive && (
                <button type="button" className="adm-btn" disabled={pending} onClick={async () => (await confirm({ message: 'Unpublish this story and move it back to drafts?', confirmLabel: 'Unpublish', danger: true })) && save('draft')}>
                  Unpublish
                </button>
              )}
              {!canPublish && (
                <button type="button" className="adm-btn adm-btn-primary" disabled={pending} onClick={() => save('review')}>
                  Submit for review
                </button>
              )}
              {canPublish && (a.status === 'review' || a.status === 'archived') && !isLive && (
                <button type="button" className="adm-btn" disabled={pending} onClick={() => save()}>
                  Save
                </button>
              )}
              {canPublish && (
                <button type="button" className="adm-btn adm-btn-primary" disabled={pending} onClick={() => save(future ? 'scheduled' : 'published')}>
                  <Icon name={future ? 'calendar' : 'bolt'} size={14} /> {primaryLabel}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {locked && (
        <div className="adm-alert is-info">
          <Icon name="alert" size={16} /> This story is {STATUS_LABEL[savedStatus].toLowerCase()}. Only editors can change live stories — ask an editor if something needs fixing.
        </div>
      )}

      <div className="adm-editor-layout">
        <div className="adm-editor-main">
          <fieldset disabled={locked} className="adm-fieldset">
            <div className="adm-card adm-card-body adm-stack">
              <label className="adm-field">
                <span className="adm-label">Rubric</span>
                <input className="adm-input adm-input-rubric" value={a.rubric} onChange={(e) => set('rubric', e.target.value)} placeholder="Kicker, e.g. Cover Story, Exclusive, Review" maxLength={80} />
              </label>
              <label className="adm-field">
                <span className="adm-label">
                  Headline<em>*</em>
                </span>
                <textarea
                  className="adm-input adm-input-headline"
                  rows={2}
                  value={a.title}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\n/g, ' ');
                    setA((p) => ({ ...p, title: v, slug: slugTouched ? p.slug : slugify(v) }));
                  }}
                  placeholder="Write a headline that sings"
                  maxLength={300}
                />
                {err('title')}
              </label>
              <label className="adm-field">
                <span className="adm-label">Slug</span>
                <div className="adm-input-group">
                  <span className="adm-input-addon">/story/</span>
                  <input
                    className="adm-input"
                    value={a.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
                    }}
                    onBlur={(e) => set('slug', slugify(e.target.value))}
                    placeholder="auto-generated-from-headline"
                  />
                  <button type="button" className="adm-input-addon adm-input-btn" title="Regenerate from headline" onClick={() => { setSlugTouched(false); set('slug', slugify(a.title)); }}>
                    ↺
                  </button>
                </div>
                {isLive && a.slug !== initial.slug && <p className="adm-hint is-warn">Changing the slug of a live story breaks existing links.</p>}
                {err('slug')}
              </label>
              <label className="adm-field">
                <span className="adm-label">Dek</span>
                <textarea className="adm-input adm-input-dek" rows={2} value={a.dek} onChange={(e) => set('dek', e.target.value)} placeholder="The standfirst: one or two sentences that make readers stay." maxLength={600} />
              </label>
            </div>
            <RichEditor defaultValue={initial.body} onChange={(html) => set('body', html)} onStats={setStats} />
          </fieldset>
        </div>

        <aside className="adm-editor-side">
          <fieldset disabled={locked} className="adm-fieldset adm-stack">
            <section className="adm-card">
              <div className="adm-card-head">
                <h2>Publishing</h2>
              </div>
              <div className="adm-card-body adm-stack">
                <label className="adm-field">
                  <span className="adm-label">Status</span>
                  <select className="adm-input" value={a.status} onChange={(e) => set('status', e.target.value as ArticleStatus)}>
                    {(canPublish ? (['draft', 'review', 'published', 'scheduled', 'archived'] as ArticleStatus[]) : (['draft', 'review'] as ArticleStatus[])).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                    {!canPublish && !['draft', 'review'].includes(a.status) && <option value={a.status}>{STATUS_LABEL[a.status]}</option>}
                  </select>
                  {err('status')}
                </label>
                {canPublish ? (
                  <>
                    <DateTimeField label="Publish date & time" value={a.published_at} onChange={(v) => set('published_at', v)} hint={future ? 'In the future — the story will go live automatically.' : 'Leave empty to use the moment you publish.'} />
                    {err('published_at')}
                  </>
                ) : (
                  <p className="adm-hint">An editor will schedule and publish your story after review.</p>
                )}
                <dl className="adm-meta-list adm-meta-inline">
                  <dt>Reading time</dt>
                  <dd>{stats.minutes} min</dd>
                  {initial.id && (
                    <>
                      <dt>Views</dt>
                      <dd>{meta.views.toLocaleString()}</dd>
                      <dt>Created</dt>
                      <dd>{meta.created_at ? timeAgo(meta.created_at) : '—'}</dd>
                    </>
                  )}
                </dl>
              </div>
            </section>

            <section className="adm-card">
              <div className="adm-card-head">
                <h2>Organize</h2>
              </div>
              <div className="adm-card-body adm-stack">
                <label className="adm-field">
                  <span className="adm-label">Section</span>
                  <select className="adm-input" value={a.section_id ?? ''} onChange={(e) => set('section_id', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— No section —</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="adm-field">
                  <span className="adm-label">Type</span>
                  <div className="adm-segmented">
                    {ARTICLE_TYPES.map((t) => (
                      <button type="button" key={t} className={a.type === t ? 'is-active' : ''} onClick={() => set('type', t)}>
                        {TYPE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="adm-field">
                  <span className="adm-label">Authors</span>
                  {selectedAuthors.length > 0 && (
                    <ul className="adm-orderlist">
                      {selectedAuthors.map((au, i) => (
                        <li key={au.id}>
                          <span>
                            <strong>{au.name}</strong>
                            {au.title && <small>{au.title}</small>}
                          </span>
                          <span className="adm-orderlist-actions">
                            <button type="button" className="adm-icon-btn adm-icon-btn-xs" disabled={i === 0} aria-label="Move up" onClick={() => set('authorIds', move(a.authorIds, i, -1))}>
                              <Icon name="up" size={12} />
                            </button>
                            <button type="button" className="adm-icon-btn adm-icon-btn-xs" aria-label={`Remove ${au.name}`} onClick={() => set('authorIds', a.authorIds.filter((x) => x !== au.id))}>
                              <Icon name="close" size={12} />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <SearchSelect
                    value=""
                    options={authors.filter((x) => !a.authorIds.includes(x.id)).map((x) => ({ value: String(x.id), label: x.name, meta: x.title }))}
                    onChange={(v) => v && set('authorIds', [...a.authorIds, Number(v)])}
                    emptyLabel="Add an author…"
                    allowEmpty={false}
                  />
                </div>
                <div className="adm-field">
                  <span className="adm-label">Tags</span>
                  <ChipInput value={a.tags} onChange={(v) => set('tags', v)} suggestions={tagSuggestions} placeholder="Type and press Enter or comma" />
                  <span className="adm-hint">New tags are created automatically.</span>
                </div>
                <label className="adm-field">
                  <span className="adm-label">Magazine issue</span>
                  <select className="adm-input" value={a.issue_id ?? ''} onChange={(e) => set('issue_id', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— Web only —</option>
                    {issues.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.title} ({i.issue_date.slice(0, 7)})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="adm-card">
              <div className="adm-card-head">
                <h2>Hero image</h2>
              </div>
              <div className="adm-card-body adm-stack">
                <MediaField
                  value={a.hero_image}
                  onChange={(url, m) => {
                    setA((p) => ({ ...p, hero_image: url, hero_credit: m?.credit && !p.hero_credit ? m.credit : p.hero_credit }));
                  }}
                />
                <label className="adm-field">
                  <span className="adm-label">Caption</span>
                  <input className="adm-input" value={a.hero_caption} onChange={(e) => set('hero_caption', e.target.value)} />
                </label>
                <label className="adm-field">
                  <span className="adm-label">Credit</span>
                  <input className="adm-input" value={a.hero_credit} onChange={(e) => set('hero_credit', e.target.value)} placeholder="Photograph by …" />
                </label>
                <div className="adm-field">
                  <span className="adm-label">Layout</span>
                  <div className="adm-layout-pick">
                    {HERO_LAYOUTS.map((l) => (
                      <button type="button" key={l} className={a.hero_layout === l ? 'is-active' : ''} onClick={() => set('hero_layout', l)}>
                        <span className={`adm-layout-icon is-${l}`}>
                          <i />
                          <b />
                        </span>
                        {LAYOUT_LABEL[l]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="adm-card">
              <div className="adm-card-head">
                <h2>Promotion</h2>
              </div>
              <div className="adm-card-body adm-stack-sm">
                {!canPublish && <p className="adm-hint">Only editors can feature stories.</p>}
                <Toggle label="Featured" hint="Candidate for the homepage hero" checked={a.featured} onChange={(v) => set('featured', v)} disabled={!canPublish} />
                <Toggle label="Top story" hint="Shown in the Top Stories rail" checked={a.top_story} onChange={(v) => set('top_story', v)} disabled={!canPublish} />
                <Toggle label="Editors’ pick" hint="Appears in the Editors’ Picks carousel" checked={a.editors_pick} onChange={(v) => set('editors_pick', v)} disabled={!canPublish} />
              </div>
            </section>

            <section className="adm-card">
              <div className="adm-card-head">
                <h2>Search & social</h2>
              </div>
              <div className="adm-card-body adm-stack">
                <div className="adm-serp" aria-label="Search result preview">
                  <div className="adm-serp-url">
                    {origin} › story › {a.slug || 'slug'}
                  </div>
                  <div className="adm-serp-title">{seoTitle.length > 62 ? seoTitle.slice(0, 60) + '…' : seoTitle}</div>
                  <div className="adm-serp-desc">{seoDesc.length > 160 ? seoDesc.slice(0, 157) + '…' : seoDesc}</div>
                </div>
                <label className="adm-field">
                  <span className="adm-label">
                    SEO title <span className={`adm-count ${a.seo_title.length > 60 ? 'is-over' : ''}`}>{a.seo_title.length}/60</span>
                  </span>
                  <input className="adm-input" value={a.seo_title} onChange={(e) => set('seo_title', e.target.value)} placeholder={a.title || 'Defaults to the headline'} />
                </label>
                <label className="adm-field">
                  <span className="adm-label">
                    Meta description <span className={`adm-count ${a.seo_description.length > 160 ? 'is-over' : ''}`}>{a.seo_description.length}/160</span>
                  </span>
                  <textarea className="adm-input" rows={3} value={a.seo_description} onChange={(e) => set('seo_description', e.target.value)} placeholder="Defaults to the dek" />
                  {err('seo_description')}
                </label>
                <Toggle label="Allow search engines to index" checked={a.allow_index} onChange={(v) => set('allow_index', v)} />
              </div>
            </section>

            {a.id && (!isLive || canPublish) && (
              <section className="adm-card adm-card-danger">
                <div className="adm-card-body adm-row-between">
                  <div>
                    <strong>Delete story</strong>
                    <p className="adm-hint">Permanently removes it and its stats.</p>
                  </div>
                  <button type="button" className="adm-btn is-danger" onClick={remove} disabled={pending}>
                    <Icon name="trash" size={14} /> Delete
                  </button>
                </div>
              </section>
            )}
          </fieldset>
        </aside>
      </div>
    </div>
  );
}

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}
