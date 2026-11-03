'use client';

import { EmptyStateClient } from '@/components/admin/EmptyStateClient';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="adm-card">
      <EmptyStateClient
        icon="alert"
        title="Something went wrong"
        text={process.env.NODE_ENV !== 'production' ? error.message : 'The page failed to load. Try again, or go back to the dashboard.'}
        action={
          <div className="adm-row" style={{ justifyContent: 'center' }}>
            <button type="button" className="adm-btn adm-btn-primary" onClick={reset}>
              Try again
            </button>
            <a className="adm-btn" href="/admin">
              Dashboard
            </a>
          </div>
        }
      />
    </div>
  );
}
