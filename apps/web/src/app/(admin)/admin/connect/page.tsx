'use client';

/**
 * Operator chat — the same Connect & Chat experience, rendered inside the admin
 * shell so the operator (admin == middleman) stays in the admin console. The
 * underlying page orders channels middleman↔buyer, middleman↔seller, then the
 * observed buyer↔seller channel for the operator role.
 */
export { default } from '@/app/(app)/connect/page';
