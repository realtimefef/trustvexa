'use client';

import * as React from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api/client';
import type { ConsentChoices, CookieConsentRequest, CookieConsentResponse } from '@/lib/api/types';

const STORAGE_KEY = 'trustvexa.cookie-consent';
const VISITOR_KEY = 'trustvexa.visitor-id';
type Choice = 'accepted' | 'declined';

function getVisitorId(): string | undefined {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

/**
 * Cookie-consent banner (Requirement 8.3 / 42.8). Essential cookies are always
 * required to run the Service; this banner records the visitor's choice for
 * non-essential (functional/analytics) cookies. The choice is stored in
 * localStorage so the banner shows only once, and also sent to the API
 * (`POST /consent/cookie`) on a best-effort basis. It renders nothing until
 * mounted to avoid an SSR hydration mismatch.
 */
export function CookieConsent() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== 'accepted' && stored !== 'declined') {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (e.g. privacy mode) — show the banner.
      setVisible(true);
    }
  }, []);

  function record(choice: Choice) {
    const enabled = choice === 'accepted';
    const choices: ConsentChoices = {
      essential: true,
      functional: enabled,
      analytics: enabled,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Ignore persistence failures; the banner simply reappears next time.
    }
    setVisible(false);

    const body: CookieConsentRequest = { choices };
    const visitorId = getVisitorId();
    if (visitorId) body.visitorId = visitorId;
    // Fire-and-forget: never block the UI on the consent log.
    void apiRequest<CookieConsentResponse>('/consent/cookie', { method: 'POST', body }).catch(
      () => {
        /* best-effort */
      },
    );
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="container flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use essential cookies to run TrustVexa and optional functional cookies to remember your
          preferences. See our{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => record('declined')}>
            Decline
          </Button>
          <Button size="sm" onClick={() => record('accepted')}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
