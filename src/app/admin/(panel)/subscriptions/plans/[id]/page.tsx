import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getPlan } from '@/lib/data/site';
import { PageHeader } from '@/components/admin/ui';
import { ActionButton, ActionForm, FieldError, SubmitButton } from '@/components/admin/ActionForm';
import { Toggle } from '@/components/admin/Fields';
import { Icon } from '@/components/admin/Icon';
import { deletePlanAction, savePlanAction } from '../../actions';

export const metadata = { title: 'Edit plan' };

export default async function PlanEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('audience.manage');
  const { id } = await params;
  const p = id === 'new' ? null : await getPlan(Number(id));
  if (id !== 'new' && !p) notFound();
  let features: string[] = [];
  try {
    features = p ? (JSON.parse(p.features) as string[]) : [];
  } catch {
    features = [];
  }
  return (
    <>
      <PageHeader
        back={{ href: '/admin/subscriptions?tab=plans', label: 'Plans' }}
        title={p ? p.name : 'New plan'}
        actions={
          p && (
            <ActionButton action={deletePlanAction} fields={{ id: p.id }} className="adm-btn" danger confirm={`Delete the “${p.name}” plan?`}>
              <Icon name="trash" size={14} /> Delete
            </ActionButton>
          )
        }
      />
      <ActionForm action={savePlanAction} warnUnsaved>
        <input type="hidden" name="id" value={p?.id ?? ''} />
        <div className="adm-grid-2-1">
          <div className="adm-card adm-card-body adm-stack">
            <div className="adm-form-grid-3">
              <label className="adm-field">
                <span className="adm-label">
                  Name<em>*</em>
                </span>
                <input className="adm-input" name="name" required defaultValue={p?.name} placeholder="Digital + Print" />
                <FieldError name="name" />
              </label>
              <label className="adm-field">
                <span className="adm-label">
                  Price<em>*</em>
                </span>
                <input className="adm-input" name="price" required defaultValue={p?.price} placeholder="$49.99" />
                <FieldError name="price" />
              </label>
              <label className="adm-field">
                <span className="adm-label">Billing interval</span>
                <select className="adm-input" name="interval" defaultValue={p?.interval ?? 'year'}>
                  <option value="month">per month</option>
                  <option value="year">per year</option>
                  <option value="once">one-time</option>
                </select>
              </label>
            </div>
            <label className="adm-field">
              <span className="adm-label">Description</span>
              <textarea className="adm-input" name="description" rows={2} defaultValue={p?.description} />
            </label>
            <label className="adm-field">
              <span className="adm-label">Features</span>
              <textarea className="adm-input" name="features" rows={6} defaultValue={features.join('\n')} placeholder={'Unlimited digital access\n12 print issues a year\nThe complete archive'} />
              <span className="adm-hint">One feature per line.</span>
            </label>
          </div>
          <div className="adm-card adm-card-body adm-stack">
            <label className="adm-field">
              <span className="adm-label">Badge</span>
              <input className="adm-input" name="badge" defaultValue={p?.badge} placeholder="e.g. Best value" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Position</span>
              <input className="adm-input" type="number" name="position" defaultValue={p?.position ?? ''} placeholder="Auto" />
            </label>
            <Toggle name="highlighted" label="Highlighted" hint="Visually emphasised on the Subscribe page" defaultChecked={!!p?.highlighted} />
            <Toggle name="active" label="Active" hint="Offered to readers" defaultChecked={p ? !!p.active : true} />
          </div>
        </div>
        <div className="adm-sticky-actions">
          <SubmitButton>{p ? 'Save plan' : 'Create plan'}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
