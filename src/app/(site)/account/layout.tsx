import { notFound } from 'next/navigation';
import { getSettings } from '@/lib/settings';

/** Reader accounts can be switched off in Admin → Settings → Features. */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  if (!getSettings().features.readerAccounts) notFound();
  return children;
}
