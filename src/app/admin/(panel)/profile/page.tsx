import { requireUser } from '@/lib/auth';
import { activityPage } from '@/lib/data/admin';
import { timeAgo } from '@/lib/utils';
import { Card, PageHeader, StatusPill } from '@/components/admin/ui';
import { ActionForm, FieldError, SubmitButton } from '@/components/admin/ActionForm';
import { MediaField } from '@/components/admin/MediaField';
import { changePasswordAction, saveProfileAction } from './actions';

export const metadata = { title: 'My profile' };

export default async function ProfilePage() {
  const me = await requireUser();
  const recent = (await activityPage(1, 8, { userId: me.id })).items;
  return (
    <>
      <PageHeader title="My profile" subtitle={<>Signed in as {me.email} · <StatusPill status={me.role} /></>} />
      <div className="adm-grid-2">
        <Card title="Profile">
          <ActionForm action={saveProfileAction} className="adm-stack">
            <label className="adm-field">
              <span className="adm-label">Name</span>
              <input className="adm-input" name="name" required defaultValue={me.name} />
              <FieldError name="name" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Email</span>
              <input className="adm-input" type="email" name="email" required defaultValue={me.email} />
              <FieldError name="email" />
            </label>
            <MediaField name="avatar" label="Avatar" defaultValue={me.avatar ?? ''} aspect="square" />
            <div className="adm-form-actions">
              <SubmitButton>Save profile</SubmitButton>
            </div>
          </ActionForm>
        </Card>
        <div className="adm-stack">
          <Card title="Change password">
            <ActionForm action={changePasswordAction} resetOnSuccess className="adm-stack">
              <input type="text" name="username" autoComplete="username" defaultValue={me.email} hidden readOnly />
              <label className="adm-field">
                <span className="adm-label">Current password</span>
                <input className="adm-input" type="password" name="current" required autoComplete="current-password" />
                <FieldError name="current" />
              </label>
              <label className="adm-field">
                <span className="adm-label">New password</span>
                <input className="adm-input" type="password" name="next" required minLength={8} autoComplete="new-password" />
                <FieldError name="next" />
              </label>
              <label className="adm-field">
                <span className="adm-label">Confirm new password</span>
                <input className="adm-input" type="password" name="confirm" required minLength={8} autoComplete="new-password" />
                <FieldError name="confirm" />
              </label>
              <div className="adm-form-actions">
                <SubmitButton>Change password</SubmitButton>
              </div>
            </ActionForm>
          </Card>
          <Card title="My recent activity" pad={false}>
            {recent.length ? (
              <ul className="adm-feed">
                {recent.map((a) => (
                  <li key={a.id}>
                    <span className="adm-feed-dot" />
                    <div>
                      {a.action} {a.entity}
                      {a.label && <em> “{a.label}”</em>}
                      <span className="adm-muted adm-small"> · {timeAgo(a.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-card-body adm-muted">No activity yet.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
