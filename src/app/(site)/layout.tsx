import { Chrome } from '@/components/site/Chrome';
import './site.css';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <Chrome>{children}</Chrome>;
}
