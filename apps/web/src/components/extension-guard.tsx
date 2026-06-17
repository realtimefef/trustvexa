'use client';

import { useEffect } from 'react';

/**
 * Registers a capturing error listener that swallows TypeError noise
 * originating from browser extension content scripts (e.g. crypto wallet
 * extensions that inject inpage.js and crash when inspecting the page's
 * module registry). The listener runs after hydration so it never interferes
 * with Next.js / webpack bootstrapping.
 */
export function ExtensionGuard() {
  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      if (e.filename && e.filename.startsWith('chrome-extension://')) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
    // Capturing phase so we intercept before the default console handler.
    window.addEventListener('error', handler, true);
    return () => window.removeEventListener('error', handler, true);
  }, []);

  return null;
}
