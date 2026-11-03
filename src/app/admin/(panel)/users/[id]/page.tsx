import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getUser } from '@/lib/data/site';
import { PageHeader } from '@/components/admin/ui';
import { ActionButton, ActionForm, FieldError, SubmitButton } from '@/components/admin/ActionForm';
import { Toggle } from '@/components/admin/Fields';
import { MediaField } from '@/components/admin/MediaField';
import { Icon } from '@/components/admin/Icon';
import { deleteUserAction, saveUserAction } from '../actions';

export const metadata = { title: 'Edit user' };

const ROLES = [
  ['admin', 'Admin', 'Everything, including settings and users'],
  ['editor', 'Editor', 'Publish, schedule and feature; manage all content, site layout and audience'],
  ['writer', 'Writer', 'Write and edit their own drafts and submit them for review'],
] as const;

export default async function UserEdit({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser('users.manage');
  const { id } = await params;
  if (Number(id) === me.id) redirect('/admin/profile');
  const u = id === 'new' ? null : await getUser(Number(id));
  if (id !== 'new' && !u) notFound();
  return (
    <>
      <PageHeader
        back={{ href: '/admin/users', label: 'Users' }}
        title={u ? u.name : 'Add user'}
        actions={
          u && (
            <ActionButton action={deleteUserAction} fields={{ id: u.id }} className="adm-btn" danger confirm={`Delete ${u.name}?`}>
              <Icon name="trash" size={14} /> Delete
            </ActionButton>
          )
        }
      />
      <ActionForm action={saveUserAction} warnUnsaved>
        <input type="hidden" name="id" value={u?.id ?? ''} />
        <div className="adm-grid-2-1">
          <div className="adm-card adm-card-body adm-stack">
            <div className="adm-form-grid">
              <label className="adm-field">
                <span className="adm-label">
                  Name<em>*</em>
                </span>
                <input className="adm-input" name="name" required defaultValue={u?.name} />
                <FieldError name="name" />
              </label>
              <label className="adm-field">
                <span className="adm-label">
                  Email<em>*</em>
                </span>
                <input className="adm-input" type="email" name="email" required defaultValue={u?.email} autoComplete="off" />
                <FieldError name="email" />
              </label>
            </div>
            <div className="adm-field">
              <span className="adm-label">Role</span>
              <div className="adm-stack-sm">
                {ROLES.map(([v, l, d]) => (
                  <label key={v} className="adm-check" style={{ alignItems: 'flex-start' }}>
                    <input type="radio" name="role" value={v} defaultChecked={(u?.role ?? 'writer') === v} style={{ marginTop: 3 }} />
                    <span>
                      <strong>{l}</strong>
                      <span className="adm-muted"> — {d}</span>
                    </span>
                  </label>
                ))}
              </div>
              <FieldError name="role" />
            </div>
            <label className="adm-field">
              <span className="adm-label">{u ? 'Set a new password' : 'Password'}{!u && <em>*</em>}</span>
              <input className="adm-input" type="password" name="password" minLength={8} autoComplete="new-password" placeholder={u ? 'Leave empty to keep the current password' : 'At least 8 characters'} />
              <FieldError name="password" />
            </label>
            <Toggle name="active" label="Active" hint="Disabled users can’t sign in" defaultChecked={u ? !!u.active : true} />
          </div>
          <div className="adm-card adm-card-body">
            <MediaField name="avatar" label="Avatar" defaultValue={u?.avatar ?? ''} aspect="square" />
          </div>
        </div>
        <div className="adm-sticky-actions">
          <SubmitButton>{u ? 'Save user' : 'Add user'}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
