'use client';

/**
 * The middleman dashboard has been merged into the single operator console at
 * /admin (admin == middleman — same neutral operator account). This route now
 * just redirects there so any old links / bookmarks keep working.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';

export default function MiddlemanRedirectPage() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace('/admin');
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Opening the operator console…
    </div>
  );
}
