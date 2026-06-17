'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth/auth-context';

interface ScreenshotDeterrentProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export function ScreenshotDeterrent({ children, enabled = true }: ScreenshotDeterrentProps) {
  const { user } = useAuth();
  const [isFocused, setIsFocused] = React.useState(true);

  // If middleman role, screenshot deterrents are bypassed for investigation purposes.
  const shouldDeter = enabled && user && user.role !== 'middleman';

  React.useEffect(() => {
    if (!shouldDeter) return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Block copy and print commands
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl+C or Cmd+C (Copy)
      if (cmdOrCtrl && e.key.toLowerCase() === 'c') {
        e.preventDefault();
      }

      // Ctrl+P or Cmd+P (Print)
      if (cmdOrCtrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('copy', handleCopy);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('copy', handleCopy);
    };
  }, [shouldDeter]);

  if (!shouldDeter) {
    return <>{children}</>;
  }

  const dateString = new Date().toLocaleDateString();
  const watermarkText = `TrustVexa ${user?.username ?? 'user'} | ${dateString} | STRICTLY CONFIDENTIAL`;

  return (
    <div className="relative min-h-screen">
      {/* Visual blur on focus loss */}
      <div
        className={`transition-all duration-300 ${
          isFocused ? 'blur-none' : 'blur-md select-none pointer-events-none'
        }`}
      >
        {children}
      </div>

      {/* Repeating background diagonal watermark — visible enough to appear in screenshots */}
      <div
        className="pointer-events-none absolute inset-0 z-50 overflow-hidden opacity-[0.08] select-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='150' viewBox='0 0 300 150'><text fill='black' font-size='10' font-family='monospace' x='20' y='80' transform='rotate(-25, 20, 80)'>${encodeURIComponent(watermarkText)}</text></svg>")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  );
}
