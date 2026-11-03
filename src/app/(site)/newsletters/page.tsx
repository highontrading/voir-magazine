import type { Metadata } from 'next';
import { listNewsletters } from '@/lib/data/site';
import { NewsletterPicker } from '@/components/site/Forms';

export const metadata: Metadata = { title: 'Newsletters', description: 'Sign up for Voirtales newsletters.' };

export default async function NewslettersPage() {
  const items = await listNewsletters();
  return (
    <div className="page-enter">
      <header className="page-head">
        <div className="wrap">
          <h1>Newsletters</h1>
          <p>The best of Voirtales, delivered. Choose as many as you like.</p>
        </div>
      </header>
      <div className="wrap">
        <NewsletterPicker items={items.map(({ id, name, description, frequency, image }) => ({ id, name, description, frequency, image }))} />
      </div>
    </div>
  );
}
