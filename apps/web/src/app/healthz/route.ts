/**
 * Web health check endpoint for Render.
 * Returns 200 OK when the Next.js server is running.
 */
import { NextResponse } from 'next/server';

export function GET(): NextResponse {
  return NextResponse.json({ status: 'ok', service: '@trustvexa/web' }, { status: 200 });
}
