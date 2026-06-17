'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Lock, Mail, ShieldCheck } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/visual/brand-logo';
import { apiRequest } from '@/lib/api/client';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await apiRequest('/auth/password-reset/request', {
        method: 'POST',
        body: { email: values.email },
      });
      setSubmittedEmail(values.email);
      setSent(true);
    } catch {
      // Always show the success state to prevent email enumeration.
      setSubmittedEmail(values.email);
      setSent(true);
    }
  });

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex justify-center lg:hidden">
        <Link href="/">
          <BrandLogo />
        </Link>
      </div>

      <Card className="w-full border-border/60 shadow-soft">
        <CardHeader className="space-y-1 text-center">
          <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {sent ? (
              <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
            ) : (
              <Lock className="h-7 w-7" aria-hidden="true" />
            )}
          </span>
          <CardTitle className="font-display text-2xl">
            {sent ? 'Check your inbox' : 'Reset your password'}
          </CardTitle>
          <CardDescription>
            {sent
              ? `We sent a password-reset link to ${submittedEmail}. The link expires in 15 minutes.`
              : "Enter your account email and we'll send you a secure reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-5">
              <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">What happens next?</p>
                <ol className="mt-2 space-y-1 text-xs">
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">1.</span> Open the email from
                    no-reply@trustvexa.com.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">2.</span> Click the link — it is valid
                    for 15 minutes and single-use.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">3.</span> Choose a new password of at
                    least 12 characters.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">4.</span> All active sessions are
                    signed out when you complete the reset.
                  </li>
                </ol>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Didn't receive it? Check your spam folder, or{' '}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  try again
                </button>
                .
              </p>
              <Button asChild variant="gradient" className="w-full">
                <Link href="/login">Back to login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {formError ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="pl-9"
                    {...register('email')}
                  />
                </div>
                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                ) : null}
              </div>

              <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>

              {/* Security note */}
              <div className="mt-2 flex flex-col gap-1.5">
                {[
                  { icon: ShieldCheck, text: 'Link expires in 15 minutes and is single-use' },
                  { icon: Lock, text: 'All sessions are signed out on password reset' },
                ].map((p) => (
                  <div
                    key={p.text}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <p.icon className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                    {p.text}
                  </div>
                ))}
              </div>
            </form>
          )}

          <p className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <Link
              href="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
