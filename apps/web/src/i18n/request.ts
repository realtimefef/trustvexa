import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale } from './locales';

// next-intl request config (no URL-based i18n routing). The active locale is read
// from a `LOCALE` cookie and falls back to the default. Messages are loaded from
// the per-locale catalog under apps/web/messages. (Requirement 49.2)
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const candidate = cookieStore.get('LOCALE')?.value;
  const locale = isLocale(candidate) ? candidate : defaultLocale;

  return {
    locale,
    timeZone: 'UTC',
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
