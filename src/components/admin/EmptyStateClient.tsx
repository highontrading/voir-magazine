'use client';

import { Icon } from './Icon';

export function EmptyStateClient({ icon = 'dot', title, text, action }: { icon?: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="adm-empty">
      <div className="adm-empty-icon">
        <Icon name={icon} size={24} />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
