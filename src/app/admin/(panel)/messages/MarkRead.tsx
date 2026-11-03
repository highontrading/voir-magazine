'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { markMessageAction } from './actions';

/** Marks an opened unread message as read, then refreshes so the sidebar badge updates. */
export function MarkRead({ id }: { id: number }) {
  const router = useRouter();
  const done = useRef(0);
  useEffect(() => {
    if (done.current === id) return;
    done.current = id;
    const fd = new FormData();
    fd.set('id', String(id));
    fd.set('read', '1');
    fd.set('silent', '1');
    markMessageAction(null, fd).then(() => router.refresh());
  }, [id, router]);
  return null;
}
