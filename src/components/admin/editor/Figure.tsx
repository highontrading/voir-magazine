'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      setFigure: (attrs: { src: string; alt?: string; caption?: string }) => ReturnType;
    };
  }
}

function FigureView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const { src, alt, caption } = node.attrs as { src: string; alt: string; caption: string };
  return (
    <NodeViewWrapper as="figure" className={`adm-figure ${selected ? 'is-selected' : ''}`} data-drag-handle="">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} />
      <div className="adm-figure-fields" contentEditable={false}>
        <input className="adm-figure-caption" value={caption} placeholder="Write a caption (optional)…" onChange={(e) => updateAttributes({ caption: e.target.value })} />
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
            caption: (el as HTMLElement).querySelector('figcaption')?.textContent?.trim() ?? '',
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, caption } = node.attrs as { src: string; alt: string; caption: string };
    const img = ['img', { src, alt: alt ?? '' }] as const;
    return caption ? ['figure', mergeAttributes({}), img, ['figcaption', {}, caption]] : ['figure', mergeAttributes({}), img];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureView);
  },

  addCommands() {
    return {
      setFigure:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
