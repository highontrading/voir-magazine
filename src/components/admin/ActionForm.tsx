'use client';

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/lib/admin/form';
import { useConfirm, useToast } from './Feedback';
import { useUnsavedGuard } from './useUnsavedGuard';

export type FormAction = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

interface FormState {
  pending: boolean;
  errors: Record<string, string>;
}
const FormCtx = createContext<FormState>({ pending: false, errors: {} });

export function useFormState() {
  return useContext(FormCtx);
}

interface Props extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'action' | 'onSubmit'> {
  action: FormAction;
  /** Ask for confirmation before submitting. A submit button's data-confirm overrides it. */
  confirm?: string;
  confirmLabel?: string;
  resetOnSuccess?: boolean;
  /** Warn before leaving the page with unsaved edits. */
  warnUnsaved?: boolean;
  onResult?: (r: ActionResult) => void;
  silent?: boolean;
}

/**
 * Wraps a server action with useActionState, toasts the result, follows `redirect`,
 * supports confirm-before-submit and keeps field values on validation errors.
 */
export function ActionForm({ action, confirm, confirmLabel, resetOnSuccess, warnUnsaved, onResult, silent, children, ...rest }: Props) {
  const [state, dispatch, pending] = useActionState<ActionResult | null, FormData>(action, null);
  const toast = useToast();
  const ask = useConfirm();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const lastAt = useRef<number | undefined>(undefined);
  useUnsavedGuard(!!warnUnsaved && dirty);

  useEffect(() => {
    if (!state || state.at === lastAt.current) return;
    lastAt.current = state.at;
    if (state.message && !silent) toast(state.message, state.ok ? 'success' : 'error');
    if (state.ok) {
      setDirty(false);
      if (resetOnSuccess) formRef.current?.reset();
      if (state.redirect) router.push(state.redirect);
    }
    onResult?.(state);
  }, [state, toast, router, resetOnSuccess, onResult, silent]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const msg = submitter?.dataset.confirm ?? confirm;
    if (msg) {
      const yes = await ask({ message: msg, confirmLabel: submitter?.dataset.confirmLabel ?? confirmLabel, danger: submitter?.dataset.danger !== '0' });
      if (!yes) return;
    }
    const fd = submitter && submitter.form === form ? new FormData(form, submitter) : new FormData(form);
    startTransition(() => dispatch(fd));
  }

  return (
    <FormCtx.Provider value={{ pending, errors: state && !state.ok ? (state.errors ?? {}) : {} }}>
      <form ref={formRef} {...rest} onSubmit={onSubmit} onInput={warnUnsaved ? () => setDirty(true) : undefined} aria-busy={pending}>
        {children}
      </form>
    </FormCtx.Provider>
  );
}

export function SubmitButton({
  children,
  className = 'adm-btn adm-btn-primary',
  pendingText,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormState();
  return (
    <button type="submit" className={className} disabled={pending || rest.disabled} {...rest}>
      {pending && <span className="adm-spinner" aria-hidden="true" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function FieldError({ name }: { name: string }) {
  const { errors } = useFormState();
  return errors[name] ? <p className="adm-field-error">{errors[name]}</p> : null;
}

/** A one-button form: hidden fields + a submit button (row actions, deletes, toggles). */
export function ActionButton({
  action,
  fields,
  confirm,
  confirmLabel,
  className = 'adm-btn adm-btn-sm',
  title,
  children,
  danger,
}: {
  action: FormAction;
  fields: Record<string, string | number>;
  confirm?: string;
  confirmLabel?: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <ActionForm action={action} confirm={confirm} confirmLabel={confirmLabel} className="adm-inline-form">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={String(v)} />
      ))}
      <SubmitButton className={danger ? `${className} is-danger` : className} title={title} aria-label={title}>
        {children}
      </SubmitButton>
    </ActionForm>
  );
}
