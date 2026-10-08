'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker. Only runs in production (or localhost
 * where `next build` output is served), and only when the browser supports it.
 * This makes the app installable from Safari/Chrome and enables the offline
 * app shell.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* ignore — PWA is progressive enhancement */
      });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
