import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentReader } from '@/lib/auth';
import { SignInForm } from '@/components/site/Forms';

export const metadata: Metadata = { title: 'Sign In', robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentReader()) redirect('/account');
  const { next } = await searchParams;
  return (
    <div className="wrap page-enter">
      <div className="auth-card">
        <h1>Sign in</h1>
        <p>Save stories, manage newsletters and your subscription.</p>
        <SignInForm next={next} />
        <p className="auth-switch">
          New to Voirtales? <Link href="/account/register">Create a free account</Link>
        </p>
        <p className="auth-switch muted" style={{ fontSize: 12 }}>Demo reader: reader@voirtales.com / reader123</p>
      </div>
    </div>
  );
}
