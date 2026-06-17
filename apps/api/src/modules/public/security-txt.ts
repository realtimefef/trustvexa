// RFC 9116 security.txt generator (task 8.2, Requirement 42.6). Pure: produces
// the canonical text served at /.well-known/security.txt.

export interface SecurityTxtConfig {
  contactEmail: string;
  /** ISO-8601 expiry timestamp (RFC 9116 requires a future Expires). */
  expires: string;
  encryptionUrl?: string;
  policyUrl: string;
  canonicalUrl: string;
  preferredLanguages?: string;
}

export function buildSecurityTxt(config: SecurityTxtConfig): string {
  if (!config.contactEmail.includes('@')) throw new Error('contactEmail must be an email');
  const lines: string[] = [
    `Contact: mailto:${config.contactEmail}`,
    `Expires: ${config.expires}`,
    `Policy: ${config.policyUrl}`,
    `Canonical: ${config.canonicalUrl}`,
  ];
  if (config.encryptionUrl) lines.push(`Encryption: ${config.encryptionUrl}`);
  if (config.preferredLanguages) lines.push(`Preferred-Languages: ${config.preferredLanguages}`);
  return lines.join('\n') + '\n';
}

export const SECURITY_TXT_PATH = '/.well-known/security.txt';
