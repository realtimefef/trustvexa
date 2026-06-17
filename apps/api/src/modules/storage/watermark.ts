import sharp from 'sharp';

export async function applyWatermark(
  imageBuffer: Buffer,
  text: string, // e.g. "TrustVexa · Preview Only · Deal #1234"
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 800;
  const fontSize = Math.max(16, Math.floor(width / 30));
  const svgText = `
    <svg width="${width}" height="${fontSize * 2}">
      <text x="50%" y="75%" text-anchor="middle"
            font-size="${fontSize}" fill="rgba(255,255,255,0.55)"
            font-family="sans-serif">${text}</text>
    </svg>`;
  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svgText), gravity: 'south' }])
    .toBuffer();
}
