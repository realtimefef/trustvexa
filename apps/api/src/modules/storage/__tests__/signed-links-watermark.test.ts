import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import { generateSignedLink, verifySignedToken } from '../signed-links.js';
import { applyWatermark } from '../watermark.js';

describe('Signed links', () => {
  const fileId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '110e8400-e29b-41d4-a716-446655440000';

  beforeAll(() => {
    process.env.FILE_LINK_SECRET = 'test_secret_for_signed_links_signature';
    process.env.API_BASE_URL = 'http://test-api.trustvexa.com';
  });

  afterAll(() => {
    delete process.env.FILE_LINK_SECRET;
    delete process.env.API_BASE_URL;
  });

  it('generates a signed link with the correct URL structure and signature token', () => {
    const { url, token, expiresAt } = generateSignedLink(fileId, userId, 60);
    expect(url).toContain('http://test-api.trustvexa.com/api/v1/storage/files/');
    expect(url).toContain(`/view?token=${token}`);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('successfully verifies a valid signed token', () => {
    const { token } = generateSignedLink(fileId, userId, 60);
    const verified = verifySignedToken(token);
    expect(verified).not.toBeNull();
    expect(verified!.fileId).toBe(fileId);
    expect(verified!.userId).toBe(userId);
  });

  it('fails verification if the signature is altered', () => {
    const { token } = generateSignedLink(fileId, userId, 60);
    const invalidToken = token.slice(0, -5) + 'abcde';
    const verified = verifySignedToken(invalidToken);
    expect(verified).toBeNull();
  });

  it('fails verification if the link is expired', () => {
    // Generate a link that expired 1 second ago (ttl = -1)
    const { token } = generateSignedLink(fileId, userId, -1);
    const verified = verifySignedToken(token);
    expect(verified).toBeNull();
  });
});

describe('Watermarking', () => {
  it('applies an SVG overlay watermark to an image buffer', async () => {
    // 1. Generate a small test image (100x100 green square)
    const testImage = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .png()
      .toBuffer();

    // 2. Apply the watermark
    const watermarked = await applyWatermark(testImage, 'Test Watermark Text');
    expect(watermarked).toBeInstanceOf(Buffer);
    expect(watermarked.length).toBeGreaterThan(0);

    // 3. Inspect metadata to confirm it is still a valid image with correct dimensions
    const meta = await sharp(watermarked).metadata();
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);
    expect(meta.format).toBe('png');
  });
});
