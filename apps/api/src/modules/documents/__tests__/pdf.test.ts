import { describe, expect, it } from 'vitest';

import { renderPdf } from '../pdf.js';

describe('renderPdf', () => {
  it('produces a valid, parseable PDF document', () => {
    const pdf = renderPdf({ title: 'TrustVexa — Receipt', lines: ['Line one', 'Line two'] });
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.includes('/Type /Catalog')).toBe(true);
    expect(text.includes('startxref')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('is deterministic for identical input', () => {
    const a = renderPdf({ title: 'Decision', lines: ['x'] });
    const b = renderPdf({ title: 'Decision', lines: ['x'] });
    expect(a.equals(b)).toBe(true);
  });

  it('escapes parentheses and backslashes so the stream stays valid', () => {
    const pdf = renderPdf({ title: 'A (b) \\ c', lines: [] });
    const text = pdf.toString('latin1');
    expect(text.includes('(A \\(b\\) \\\\ c)')).toBe(true);
  });

  it('declares a content stream length matching the stream bytes', () => {
    const pdf = renderPdf({ title: 'Len', lines: ['one', 'two', 'three'] });
    const text = pdf.toString('latin1');
    const match = /\/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/.exec(text);
    expect(match).not.toBeNull();
    const declared = Number.parseInt(match![1]!, 10);
    expect(Buffer.byteLength(match![2]!, 'latin1')).toBe(declared);
  });
});
