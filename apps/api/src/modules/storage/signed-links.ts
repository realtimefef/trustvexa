import crypto from 'node:crypto';

function getSecret(): string {
  const secret = process.env.FILE_LINK_SECRET;
  if (!secret) {
    throw new Error('FILE_LINK_SECRET is not configured');
  }
  return secret;
}

export function generateSignedLink(
  fileId: string,
  userId: string,
  ttlSeconds = 3600,
): { url: string; expiresAt: Date; token: string } {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const payload = `${fileId}:${userId}:${expiresAt.getTime()}`;
  const signature = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');

  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  return {
    url: `${apiBaseUrl}/api/v1/storage/files/${fileId}/view?token=${token}`,
    expiresAt,
    token,
  };
}

export function verifySignedToken(token: string): { fileId: string; userId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    const signature = parts.pop()!;
    const [fileId, userId, expiryMs] = parts;
    if (!fileId || !userId) return null;
    if (Date.now() > Number(expiryMs)) return null;
    const expected = crypto.createHmac('sha256', getSecret()).update(parts.join(':')).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    return { fileId, userId };
  } catch {
    return null;
  }
}
