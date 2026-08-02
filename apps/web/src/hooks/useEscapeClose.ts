'use client';

import { useEffect, useRef } from 'react';

/**
 * Closes the modal when the Escape key is pressed while `enabled` is true.
 * The listener is attached to window so it works even when focus is inside
 * an input/select within the modal.
 */
export function useEscapeClose(onClose: () => void, enabled: boolean) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}
