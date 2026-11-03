'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { useState } from 'react';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      /** `caption` is plain text; it is stored HTML-escaped. */
      setFigure: (attrs: { src: string; alt?: string; caption?: string }) => ReturnType;
    };
  }
}

/* The `caption` attribute holds the figcaption's inner HTML so inline markup (<em> titles, <strong> lead-ins,
   <span> photo credits, links) survives a round trip through the editor. */

const CAPTION_ATTRS: Record<string, string[]> = {
  em: [], i: [], strong: [], b: [], u: [], s: [], sub: [], sup: [], small: [], code: [], br: [],
  span: ['class'],
  a: ['href', 'title', 'target', 'rel'],
};
const CAPTION_DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'img', 'svg', 'math']);

function scrubCaption(parent: ParentNode) {
  for (const n of Array.from(parent.childNodes)) {
    if (n.nodeType === 3) continue; // text
    if (n.nodeType !== 1) {
      n.remove();
      continue;
    }
    const el = n as Element;
    const tag = el.tagName.toLowerCase();
    if (CAPTION_DROP.has(tag)) {
      el.remove();
      continue;
    }
    scrubCaption(el);
    const allowed = CAPTION_ATTRS[tag];
    if (!allowed) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }
    for (const a of Array.from(el.attributes)) if (!allowed.includes(a.name)) el.removeAttribute(a.name);
    if (tag === 'a' && !/^(https?:|mailto:|\/|#)/i.test((el.getAttribute('href') ?? '').trim())) el.removeAttribute('href');
  }
}

/** Keeps only inline caption markup (em/strong/a/span…); everything else is unwrapped to its text. */
export function sanitizeCaption(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '').trim();
  const t = document.createElement('template');
  t.innerHTML = html;
  scrubCaption(t.content);
  return t.innerHTML.trim();
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hasMarkup = (html: string) => /<[a-z/]/i.test(html);

function captionText(html: string): string {
  if (typeof document === 'undefined') return html;
  const t = document.createElement('template');
  t.innerHTML = html;
  return t.content.textContent ?? '';
}

function FigureView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const { src, alt, caption } = node.attrs as { src: string; alt: string; caption: string };
  // Captions that already carry markup are edited as HTML so the markup is kept; plain ones as text.
  const [htmlMode] = useState(() => hasMarkup(caption ?? ''));
  return (
    <NodeViewWrapper as="figure" className={`adm-figure ${selected ? 'is-selected' : ''}`} data-drag-handle="">
      <img src={src} alt={alt} draggable={false} />
      <div className="adm-figure-fields" contentEditable={false}>
        {htmlMode ? (
          <>
            <input
              className="adm-figure-caption"
              value={caption}
              placeholder="Write a caption (optional)…"
              title="Caption HTML — <em>, <strong>, <a> and <span> (photo credit) are kept"
              spellCheck={false}
              onChange={(e) => updateAttributes({ caption: e.target.value })}
            />
            {caption ? (
              <div className="adm-figure-caption adm-muted" style={{ fontSize: 12 }} aria-label="Caption preview" dangerouslySetInnerHTML={{ __html: sanitizeCaption(caption) }} />
            ) : null}
          </>
        ) : (
          <input
            className="adm-figure-caption"
            value={captionText(caption ?? '')}
            placeholder="Write a caption (optional)…"
            onChange={(e) => updateAttributes({ caption: escapeHtml(e.target.value) })}
          />
        )}
        <div className="adm-figure-row">
          <input className="adm-figure-alt" value={alt} placeholder="Alt text for screen readers" onChange={(e) => updateAttributes({ alt: e.target.value })} />
          <button type="button" className="adm-figure-remove" onClick={() => deleteNode()}>
            Remove
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

/** Block image with caption → <figure><img src alt><figcaption>…</figcaption></figure> */
export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      caption: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs: (el) => {
          const img = (el as HTMLElement).querySelector('img');
          if (!img) return false;
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt') ?? '',
            caption: sanitizeCaption((el as HTMLElement).querySelector('figcaption')?.innerHTML ?? ''),
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, caption } = node.attrs as { src: string; alt: string; caption: string };
    const img = ['img', { src, alt: alt ?? '' }] as const;
    const html = sanitizeCaption(caption ?? '');
    if (!html) return ['figure', mergeAttributes({}), img];
    if (typeof document === 'undefined') return ['figure', mergeAttributes({}), img, ['figcaption', {}, html]];
    const figcaption = document.createElement('figcaption');
    figcaption.innerHTML = html;
    return ['figure', mergeAttributes({}), img, figcaption];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureView);
  },

  addCommands() {
    return {
      setFigure:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { ...attrs, caption: escapeHtml(attrs.caption ?? '') } }),
    };
  },
});
