'use client';

/**
 * Renders the current published version of a legal/policy document (task 8.2).
 * Fetches `/public/policy-versions` and shows the version, publish date, and a
 * short content-hash fingerprint for the given `docType`. The badge is
 * best-effort: if the API is unavailable it renders nothing, so legal pages
 * still work without the version service.
 */
import * as React from 'react';

import { apiRequest } from '@/lib/api/client';
import type { PolicyVersion, PolicyVersionsResponse } from '@/lib/api/types';

export function PolicyVersionBadge({ docType }: { docType: string }) {
  const [version, setVersion] = React.useState<PolicyVersion | null>(null);

  React.useEffect(() => {
    let active = true;
    apiRequest<PolicyVersionsResponse>('/public/policy-versions')
      .then((res) => {
        if (!active) return;
        setVersion(res.versions.find((v) => v.docType === docType) ?? null);
      })
      .catch(() => {
        /* version badge is best-effort; hide on failure */
      });
    return () => {
      active = false;
    };
  }, [docType]);

  if (!version) return null;

  const published = version.publishedAt ? new Date(version.publishedAt) : null;
  const publishedLabel =
    published && !Number.isNaN(published.getTime()) ? published.toLocaleDateString() : null;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">v{version.version}</span>
      {publishedLabel ? <span>Published {publishedLabel}</span> : null}
      {version.contentHash ? (
        <span className="font-mono">#{version.contentHash.slice(0, 8)}</span>
      ) : null}
    </span>
  );
}
