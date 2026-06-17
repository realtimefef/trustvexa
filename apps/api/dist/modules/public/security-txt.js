// RFC 9116 security.txt generator (task 8.2, Requirement 42.6). Pure: produces
// the canonical text served at /.well-known/security.txt.
export function buildSecurityTxt(config) {
    if (!config.contactEmail.includes('@'))
        throw new Error('contactEmail must be an email');
    const lines = [
        `Contact: mailto:${config.contactEmail}`,
        `Expires: ${config.expires}`,
        `Policy: ${config.policyUrl}`,
        `Canonical: ${config.canonicalUrl}`,
    ];
    if (config.encryptionUrl)
        lines.push(`Encryption: ${config.encryptionUrl}`);
    if (config.preferredLanguages)
        lines.push(`Preferred-Languages: ${config.preferredLanguages}`);
    return lines.join('\n') + '\n';
}
export const SECURITY_TXT_PATH = '/.well-known/security.txt';
//# sourceMappingURL=security-txt.js.map