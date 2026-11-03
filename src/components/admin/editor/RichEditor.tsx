'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Figure } from './Figure';
import { Icon } from '../Icon';
import { MediaField } from '../MediaField';
import { Portal } from '../Portal';

export interface EditorStats {
  words: number;
  minutes: number;
}

interface Props {
  /** When set, the HTML is mirrored into a hidden input for plain <form> submission. */
  name?: string;
  defaultValue?: string;
  onChange?: (html: string) => void;
  onStats?: (s: EditorStats) => void;
  placeholder?: string;
  minHeight?: number;
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

export function RichEditor({ name, defaultValue = '', onChange, onStats, placeholder = 'Start writing your story…', minHeight = 420 }: Props) {
  const [html, setHtml] = useState(defaultValue);
  const hidden = useRef<HTMLInputElement>(null);
  const cb = useRef({ onChange, onStats });
  useEffect(() => {
    cb.current = { onChange, onStats };
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener noreferrer', target: null } },
      }),
      Figure,
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: defaultValue,
    editorProps: { attributes: { class: 'adm-prose', spellcheck: 'true' } },
    onCreate: ({ editor }) => {
      const words = countWords(editor.getText());
      cb.current.onStats?.({ words, minutes: Math.max(1, Math.round(words / 230)) });
    },
    onUpdate: ({ editor }) => {
      const out = editor.isEmpty ? '' : editor.getHTML();
      setHtml(out);
      cb.current.onChange?.(out);
      const words = countWords(editor.getText());
      cb.current.onStats?.({ words, minutes: Math.max(1, Math.round(words / 230)) });
      // notify an enclosing ActionForm (unsaved-changes tracking)
      hidden.current?.dispatchEvent(new Event('input', { bubbles: true }));
    },
  });

  return (
    <div className="adm-editor" style={{ ['--editor-min' as string]: `${minHeight}px` }}>
      {editor ? <Toolbar editor={editor} /> : <div className="adm-editor-toolbar is-loading" />}
      <EditorContent editor={editor} className="adm-editor-content" />
      {editor && <StatusBar editor={editor} />}
      <input ref={hidden} type="hidden" name={name} value={html} />
    </div>
  );
}

function StatusBar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const text = e.getText();
      return { words: countWords(text), chars: text.length };
    },
  });
  return (
    <div className="adm-editor-status">
      <span>{s.words.toLocaleString()} words</span>
      <span>{s.chars.toLocaleString()} characters</span>
      <span>{Math.max(1, Math.round(s.words / 230))} min read</span>
    </div>
  );
}

function Btn({ on, active, disabled, title, children }: { on: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`adm-tb-btn ${active ? 'is-active' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : 'p',
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      link: e.isActive('link'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      href: (e.getAttributes('link').href as string | undefined) ?? '',
    }),
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState('');
  const [imgOpen, setImgOpen] = useState(false);

  useEffect(() => {
    if (linkOpen) setHref(st.href);
  }, [linkOpen, st.href]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && editor.isFocused) {
        e.preventDefault();
        setLinkOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor]);

  const applyLink = () => {
    const url = href.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!url) chain.unsetLink().run();
    else {
      const external = /^https?:\/\//i.test(url) && !url.includes(window.location.host);
      chain.setLink({ href: url, target: external ? '_blank' : null }).run();
    }
    setLinkOpen(false);
  };

  return (
    <>
      <div className="adm-editor-toolbar" role="toolbar" aria-label="Formatting">
        <select
          className="adm-tb-select"
          value={st.block}
          onChange={(e) => {
            const v = e.target.value;
            const c = editor.chain().focus();
            if (v === 'p') c.setParagraph().run();
            else c.setHeading({ level: v === 'h2' ? 2 : 3 }).run();
          }}
          aria-label="Text style"
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <span className="adm-tb-sep" />
        <Btn title="Bold (Ctrl/⌘+B)" active={st.bold} on={() => editor.chain().focus().toggleBold().run()}>
          <b>B</b>
        </Btn>
        <Btn title="Italic (Ctrl/⌘+I)" active={st.italic} on={() => editor.chain().focus().toggleItalic().run()}>
          <i>I</i>
        </Btn>
        <Btn title="Underline (Ctrl/⌘+U)" active={st.underline} on={() => editor.chain().focus().toggleUnderline().run()}>
          <u>U</u>
        </Btn>
        <Btn title="Strikethrough" active={st.strike} on={() => editor.chain().focus().toggleStrike().run()}>
          <s>S</s>
        </Btn>
        <Btn title="Link (Ctrl/⌘+K)" active={st.link || linkOpen} on={() => setLinkOpen((o) => !o)}>
          <Icon name="link" size={15} />
        </Btn>
        <span className="adm-tb-sep" />
        <Btn title="Bulleted list" active={st.bullet} on={() => editor.chain().focus().toggleBulletList().run()}>
          <Icon name="listBullet" size={15} />
        </Btn>
        <Btn title="Numbered list" active={st.ordered} on={() => editor.chain().focus().toggleOrderedList().run()}>
          <Icon name="listOrdered" size={15} />
        </Btn>
        <Btn title="Pull quote (blockquote)" active={st.quote} on={() => editor.chain().focus().toggleBlockquote().run()}>
          <Icon name="quote" size={15} />
        </Btn>
        <Btn title="Divider" on={() => editor.chain().focus().setHorizontalRule().run()}>
          <Icon name="hr" size={15} />
        </Btn>
        <Btn title="Insert image" active={imgOpen} on={() => setImgOpen(true)}>
          <Icon name="image" size={15} />
        </Btn>
        <span className="adm-tb-sep" />
        <Btn title="Undo (Ctrl/⌘+Z)" disabled={!st.canUndo} on={() => editor.chain().focus().undo().run()}>
          <Icon name="undo" size={15} />
        </Btn>
        <Btn title="Redo (Ctrl/⌘+Shift+Z)" disabled={!st.canRedo} on={() => editor.chain().focus().redo().run()}>
          <Icon name="redo" size={15} />
        </Btn>
      </div>
      {linkOpen && (
        <div className="adm-editor-linkbar">
          <Icon name="link" size={14} />
          <input
            autoFocus
            className="adm-input"
            placeholder="Paste a URL, e.g. https://… or /story/slug"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              } else if (e.key === 'Escape') setLinkOpen(false);
            }}
          />
          <button type="button" className="adm-btn adm-btn-sm adm-btn-primary" onClick={applyLink}>
            Apply
          </button>
          {st.link && (
            <button
              type="button"
              className="adm-btn adm-btn-sm"
              onClick={() => {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
                setLinkOpen(false);
              }}
            >
              Remove link
            </button>
          )}
          <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => setLinkOpen(false)}>
            Cancel
          </button>
        </div>
      )}
      {imgOpen && (
        <ImageDialog
          onClose={() => setImgOpen(false)}
          onInsert={(a) => {
            editor.chain().focus().setFigure(a).run();
            setImgOpen(false);
          }}
        />
      )}
    </>
  );
}

function ImageDialog({ onClose, onInsert }: { onClose: () => void; onInsert: (a: { src: string; alt: string; caption: string }) => void }) {
  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  return (
    <Portal>
    <div className="adm-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" role="dialog" aria-modal="true" aria-label="Insert image">
        <div className="adm-modal-head">
          <h2>Insert image</h2>
          <button type="button" className="adm-icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="adm-modal-pad adm-stack">
          <MediaField
            value={src}
            onChange={(url, m) => {
              setSrc(url);
              if (m?.alt && !alt) setAlt(m.alt);
              if (m?.credit && !caption) setCaption(m.credit);
            }}
            kind="image"
          />
          <label className="adm-field">
            <span className="adm-label">Caption</span>
            <input className="adm-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Shown under the image" />
          </label>
          <label className="adm-field">
            <span className="adm-label">Alt text</span>
            <input className="adm-input" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image for screen readers" />
          </label>
        </div>
        <div className="adm-modal-foot">
          <button type="button" className="adm-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="adm-btn adm-btn-primary" disabled={!src.trim()} onClick={() => onInsert({ src: src.trim(), alt: alt.trim(), caption: caption.trim() })}>
            Insert image
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
