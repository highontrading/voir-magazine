'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

/* ---------------- toasts ---------------- */

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface FeedbackApi {
  toast: (text: string, kind?: ToastKind) => void;
  confirm: (opts: ConfirmOptions | string) => Promise<boolean>;
}

const Ctx = createContext<FeedbackApi>({
  toast: () => {},
  confirm: async (o) => window.confirm(typeof o === 'string' ? o : o.message),
});

export function useToast() {
  return useContext(Ctx).toast;
}

export function useConfirm() {
  return useContext(Ctx).confirm;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const seq = useRef(0);

  const toast = useCallback((text: string, kind: ToastKind = 'success') => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3500);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions | string) =>
      new Promise<boolean>((resolve) => {
        const o = typeof opts === 'string' ? { message: opts } : opts;
        setDialog({ ...o, resolve });
      }),
    [],
  );

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="adm-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`adm-toast is-${t.kind}`}>
            <Icon name={t.kind === 'error' ? 'alert' : t.kind === 'info' ? 'dot' : 'check'} size={16} />
            <span>{t.text}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
      {dialog && <ConfirmDialog {...dialog} onClose={close} />}
    </Ctx.Provider>
  );
}

function ConfirmDialog({ title, message, confirmLabel, danger = true, onClose }: ConfirmOptions & { onClose: (v: boolean) => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="adm-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="adm-modal adm-confirm" role="alertdialog" aria-modal="true" aria-labelledby="adm-confirm-title">
        <div className="adm-modal-body">
          <div className={`adm-confirm-icon ${danger ? 'is-danger' : ''}`}>
            <Icon name={danger ? 'alert' : 'check'} size={20} />
          </div>
          <div>
            <h2 id="adm-confirm-title">{title ?? (danger ? 'Are you sure?' : 'Please confirm')}</h2>
            <p>{message}</p>
          </div>
        </div>
        <div className="adm-modal-foot">
          <button type="button" className="adm-btn" onClick={() => onClose(false)}>
            Cancel
          </button>
          <button ref={btn} type="button" className={`adm-btn ${danger ? 'adm-btn-danger' : 'adm-btn-primary'}`} onClick={() => onClose(true)}>
            {confirmLabel ?? (danger ? 'Delete' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Shows a toast once on mount (used for server-rendered notices like ?denied=1). */
export function MountToast({ text, kind = 'info' }: { text: string; kind?: ToastKind }) {
  const toast = useToast();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    toast(text, kind);
  }, [text, kind, toast]);
  return null;
}
