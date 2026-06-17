'use client';

import * as React from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function LanguageToggle() {
  const router = useRouter();
  const [locale, setLocale] = React.useState('en');

  React.useEffect(() => {
    const match = document.cookie.match(/(?:^|; )LOCALE=([^;]*)/);
    if (match && match[1]) {
      setLocale(match[1]);
    }
  }, []);

  const toggleLanguage = () => {
    const nextLocale = locale === 'en' ? 'es' : 'en';
    document.cookie = `LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    setLocale(nextLocale);
    router.refresh();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      aria-label="Toggle language"
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-2.5 h-9"
    >
      <Languages className="h-4 w-4" aria-hidden />
      <span className="text-xs font-semibold uppercase">{locale}</span>
    </Button>
  );
}
