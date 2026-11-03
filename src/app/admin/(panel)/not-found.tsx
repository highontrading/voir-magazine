import Link from 'next/link';
import { EmptyState } from '@/components/admin/ui';

export default function AdminNotFound() {
  return (
    <div className="adm-card">
      <EmptyState
        icon="alert"
        title="Not found"
        text="This item doesn’t exist or has been deleted."
        action={
          <Link className="adm-btn" href="/admin">
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
