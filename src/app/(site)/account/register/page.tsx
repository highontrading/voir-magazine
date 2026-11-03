import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentReader } from '@/lib/auth';
import { RegisterForm } from '@/components/site/Forms';

export const metadata: Metadata = { title: 'Create an account', robots: { index: false } };

export default async function RegisterPage() {
  if (await currentReader()) redirect('/account');
  return (
    <div className="wrap page-enter">
      <div className="auth-card">
        <h1>Join Voirtales</h1>
        <p>A free account lets you save stories and choose your newsletters.</p>
        <RegisterForm />
        <p className="auth-switch">
          Already have an account? <Link href="/account/sign-in">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
