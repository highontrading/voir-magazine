import type { Metadata } from 'next';
import { currentReader } from '@/lib/auth';
import { listIssues } from '@/lib/data/content';
import { listPlans } from '@/lib/data/site';
import { getSettings } from '@/lib/settings';
import { Cover } from '@/components/site/Cover';
import { SubscribeFlow } from '@/components/site/Forms';

export const metadata: Metadata = { title: 'Subscribe', description: 'Subscribe to Voirtales — print and digital.' };

const FAQ: [string, string][] = [
  ['What do I get with a subscription?', 'Unlimited access to every story on the site and app, subscriber-only newsletters, the full archive and — with Print + Digital — the magazine delivered to your door.'],
  ['Can I cancel anytime?', 'Yes. You can cancel at any time and you will keep access until the end of your billing period.'],
  ['How many print issues are there a year?', 'Voirtales publishes ten print issues a year, including our special Hollywood and Style issues.'],
  ['Can I give Voirtales as a gift?', 'Absolutely — choose the Gift plan and we will send a personalized card to your recipient.'],
];

export default async function SubscribePage() {
  const [s, plans, issues, reader] = await Promise.all([getSettings(), listPlans(), listIssues(), currentReader()]);
  const covers = issues.slice(0, 3);
  return (
    <div className="page-enter">
      <section className="sub-hero">
        <div className="wrap sub-hero__inner">
          <div>
            <span className="rubric" style={{ color: '#ff8a98' }}>{s.subscribe.offer}</span>
            <h1 style={{ marginTop: 16 }}>{s.subscribe.headline}</h1>
            <p>{s.subscribe.text}</p>
          </div>
          <div className="sub-covers" aria-hidden>
            {covers.map((c) => (
              <Cover key={c.id} issue={c} logo={s.logoText} />
            ))}
          </div>
        </div>
      </section>
      <div className="wrap">
        <SubscribeFlow
          plans={plans.map((p) => ({ ...p, features: JSON.parse(p.features || '[]') as string[] }))}
          defaultEmail={reader?.email}
          defaultName={reader?.name}
        />
        <section className="block wrap--narrow" style={{ margin: '0 auto' }}>
          <h2 className="block-head__title" style={{ textAlign: 'center', marginBottom: 24 }}>Questions</h2>
          <div className="accordion">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <div>{a}</div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
