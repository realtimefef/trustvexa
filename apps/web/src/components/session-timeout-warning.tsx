'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAccessToken, setAccessToken, apiRequest } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

function decodeJwt(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload) as { exp?: number };
  } catch {
    return null;
  }
}

export function SessionTimeoutWarning() {
  const router = useRouter();
  const { logout } = useAuth();
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null);
  const [showWarning, setShowWarning] = React.useState(false);
  const [extending, setExtending] = React.useState(false);

  React.useEffect(() => {
    const checkExpiry = () => {
      const token = getAccessToken();
      if (!token) {
        setTimeLeft(null);
        setShowWarning(false);
        return;
      }

      const decoded = decodeJwt(token);
      if (!decoded || !decoded.exp) {
        return;
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      const remaining = decoded.exp - nowSeconds;

      setTimeLeft(remaining);

      // Warning thresholds: warn when < 5 minutes (300s) left
      if (remaining <= 300 && remaining > 0) {
        setShowWarning(true);
      } else if (remaining <= 0) {
        // Expired! Log out
        setShowWarning(false);
        void logout().then(() => {
          router.push('/login?expired=1');
        });
      } else {
        setShowWarning(false);
      }
    };

    // Check immediately, then check every 10 seconds
    checkExpiry();
    const interval = setInterval(checkExpiry, 10000);
    return () => clearInterval(interval);
  }, [logout, router]);

  const handleExtend = async () => {
    setExtending(true);
    try {
      // Persist the freshly minted access token into the in-memory client.
      // Without this, the warning would re-appear on the next interval tick
      // because the component still holds the old (near-expiry) token.
      // (Re-audit FIX — session extend did not store the new token)
      const res = await apiRequest<{ access_token?: string }>('/auth/refresh', {
        method: 'POST',
        body: {},
      });
      if (res?.access_token) {
        setAccessToken(res.access_token);
      }
      setShowWarning(false);
    } catch (err) {
      console.error('Failed to extend session:', err);
    } finally {
      setExtending(false);
    }
  };

  if (!showWarning || timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-glow text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
          <Clock className="h-6 w-6 animate-pulse" />
        </div>
        <h3 className="font-display text-lg font-bold text-foreground">Session Expiring Soon</h3>
        <p className="text-xs text-muted-foreground">
          Your session will expire in{' '}
          <span className="font-semibold text-foreground">{formattedTime}</span> due to inactivity.
          Would you like to extend your session?
        </p>
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={async () => {
              setShowWarning(false);
              await logout();
              router.push('/login');
            }}
            className="flex-1"
          >
            Log out
          </Button>
          <Button variant="gradient" onClick={handleExtend} disabled={extending} className="flex-1">
            {extending ? 'Extending...' : 'Extend Session'}
          </Button>
        </div>
      </div>
    </div>
  );
}
