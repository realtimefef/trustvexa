'use client';

import * as React from 'react';

/**
 * Registers the PWA service worker (/sw.js) safely.
 *
 * We do this ourselves instead of letting next-pwa auto-register so the
 * registration promise is ALWAYS caught. Some environments reject
 * `serviceWorker.register()` — most notably Google Search Console's
 * URL-inspection sandbox, which blocks service workers — and an uncaught
 * rejection there shows up as a scary console error. The service worker is a
 * progressive enhancement (offline shell), so a failed registration is a no-op,
 * never a crash.
 */
export function ServiceWorkerRegister(): null {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Service workers require a secure context (https or localhost). Skip
    // otherwise rather than letting register() throw.
    if (!window.isSecureContext) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
        // Swallow: registration can be blocked (sandbox/policy) and must not
        // surface as an unhandled rejection.
        console.warn(
          'Service worker registration skipped:',
          err instanceof Error ? err.message : String(err),
        );
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
