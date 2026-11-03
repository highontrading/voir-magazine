'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Renders children at the admin root (outside any <form>, still inside the `.adm` style scope). */
export function Portal({ children }: { children: React.ReactNode }) {
  const [el, setEl] = useState<Element | null>(null);
  useEffect(() => setEl(document.querySelector('.adm') ?? document.body), []);
  return el ? createPortal(children, el) : null;
}
