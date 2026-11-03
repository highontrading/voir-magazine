import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await currentUser()) redirect('/admin');
  const { next } = await searchParams;
  const s = await getSettings();
  return (
    <div className="adm-login">
      <div className="adm-login-art" aria-hidden="true">
        <div className="adm-login-art-inner">
          <span className="adm-login-kicker">The Newsroom</span>
          <p className="adm-login-quote">“Every great story begins with an editor who cared.”</p>
          <span className="adm-login-mark">{s.logoText || 'VOIRTALES'}</span>
        </div>
      </div>
      <div className="adm-login-panel">
        <div className="adm-login-box">
          <div className="adm-wordmark adm-wordmark-dark">{s.logoText || 'VOIRTALES'}</div>
          <h1>Sign in to the newsroom</h1>
          <p className="adm-muted">Manage stories, issues and everything on {s.siteName}.</p>
          <LoginForm next={typeof next === 'string' ? next : ''} />
          <div className="adm-login-hint">
            <strong>Demo access</strong>
            <span>
              Admin · <code>admin@voirtales.com</code> / <code>admin123</code>
            </span>
            <span>
              Editor · <code>editor@voirtales.com</code> / <code>editor123</code>
            </span>
            <span>
              Writer · <code>writer@voirtales.com</code> / <code>writer123</code>
            </span>
          </div>
          <a href="/" className="adm-login-back">
            ← Back to {s.siteName}
          </a>
        </div>
      </div>
    </div>
  );
}
