import { HomePage } from '@/components/site/HomeBlocks';
import { getSettings } from '@/lib/settings';

export default async function Home() {
  const s = await getSettings();
  return (
    <>
      <h1 className="sr-only">{s.siteName} — {s.tagline}</h1>
      <HomePage s={s} />
    </>
  );
}
