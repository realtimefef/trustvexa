import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',
]);
function isPrivateIpv4(hostname) {
    const octets = hostname.split('.').map(Number);
    if (octets.length !== 4 ||
        octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
        return false;
    }
    const a = octets[0];
    const b = octets[1];
    return (a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        a >= 224);
}
function isPrivateIpv6(hostname) {
    const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return (normalized === '::' ||
        normalized === '::1' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe8') ||
        normalized.startsWith('fe9') ||
        normalized.startsWith('fea') ||
        normalized.startsWith('feb'));
}
export function isSafeWebhookUrl(value) {
    let url;
    try {
        url = new URL(value);
    }
    catch {
        return false;
    }
    if (url.protocol !== 'https:' || url.username || url.password)
        return false;
    const hostname = url.hostname
        .toLowerCase()
        .replace(/^\[|\]$/g, '')
        .replace(/\.$/, '');
    if (!hostname || BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost'))
        return false;
    const version = isIP(hostname);
    if (version === 4 && isPrivateIpv4(hostname))
        return false;
    if (version === 6 && isPrivateIpv6(hostname))
        return false;
    return true;
}
export async function assertSafeWebhookTarget(value) {
    if (!isSafeWebhookUrl(value))
        throw new Error('unsafe_webhook_url');
    const hostname = new URL(value).hostname;
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (addresses.length === 0 ||
        addresses.some(({ address, family }) => family === 4 ? isPrivateIpv4(address) : isPrivateIpv6(address))) {
        throw new Error('unsafe_webhook_target');
    }
}
//# sourceMappingURL=webhook-url.js.map