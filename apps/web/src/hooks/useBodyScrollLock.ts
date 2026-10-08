'use client';

import { useEffect } from 'react';

/**
 * Locks body scrolling while `enabled` is true, so the page behind a modal
 * can't scroll. Restores the previous overflow style on cleanup.
 */
export function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [enabled]);
}
