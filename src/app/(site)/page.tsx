import { HomePage } from '@/components/site/HomeBlocks';
import { getSettings } from '@/lib/settings';

export default function Home() {
  const s = getSettings();
  return (
    <>
      <h1 className="sr-only">{s.siteName} — {s.tagline}</h1>
      <HomePage s={s} />
    </>
  );
}
