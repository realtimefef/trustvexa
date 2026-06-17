'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { coinSchema, SUPPORTED_COINS } from '@trustvexa/shared/client';
import { Button } from '@/components/ui/button';

// Scaffold-only component: verifies React Hook Form + Zod resolver wiring and that
// schemas from @trustvexa/shared resolve in the client bundle. Not a business form.
const formSchema = z.object({
  coin: coinSchema,
});

type FormValues = z.infer<typeof formSchema>;

export function ProviderCheckForm() {
  const t = useTranslations('scaffoldForm');
  const [result, setResult] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { coin: SUPPORTED_COINS[0] },
  });

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-border p-4"
      onSubmit={handleSubmit(() => setResult(t('valid')))}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t('legend')}</legend>
        <label className="text-sm" htmlFor="coin">
          {t('coinLabel')}
        </label>
        <select
          id="coin"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          {...register('coin')}
        >
          {SUPPORTED_COINS.map((coin) => (
            <option key={coin} value={coin}>
              {coin}
            </option>
          ))}
        </select>
        {errors.coin ? <p className="text-sm text-destructive">{t('invalid')}</p> : null}
      </fieldset>
      <Button type="submit" size="sm" className="self-start">
        {t('submit')}
      </Button>
      {result ? <p className="text-sm text-muted-foreground">{result}</p> : null}
    </form>
  );
}
