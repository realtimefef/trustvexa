import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: unknown;
    if (contentType.includes('application/csp-report') || contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }

    console.warn('CSP Violation:', JSON.stringify(body));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to parse CSP report:', error);
    return NextResponse.json({ error: 'Failed to process report' }, { status: 400 });
  }
}
