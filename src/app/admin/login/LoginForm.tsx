'use client';

import { useActionState, useState } from 'react';
import { loginAction } from '../actions';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  return (
    <form action={action} className="adm-login-form">
      <input type="hidden" name="next" value={next} />
      {state && !state.ok && <div className="adm-alert is-error">{state.message}</div>}
      <label className="adm-field">
        <span className="adm-label">Email</span>
        <input className="adm-input adm-input-lg" type="email" name="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@voirtales.com" />
      </label>
      <label className="adm-field">
        <span className="adm-label">Password</span>
        <div className="adm-input-group">
          <input className="adm-input adm-input-lg" type={show ? 'text' : 'password'} name="password" autoComplete="current-password" required placeholder="••••••••" />
          <button type="button" className="adm-input-addon adm-input-btn" onClick={() => setShow((s) => !s)}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>
      <button type="submit" className="adm-btn adm-btn-primary adm-btn-lg adm-btn-block" disabled={pending}>
        {pending && <span className="adm-spinner" />}
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
