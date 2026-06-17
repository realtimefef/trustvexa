// Supported UI locales (Requirement 49.2 — multiple languages via next-intl).
// Additional catalogs are added under apps/web/messages/<locale>.json in later tasks.
export const locales = ['en', 'es'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}
