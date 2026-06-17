'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Lock, ShieldCheck, XCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/visual/brand-logo';
import { ApiError, apiRequest } from '@/lib/api/client';

const schema = z
  .object({
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters long')
      .max(128, 'Password cannot exceed 128 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [success, setSuccess] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (!token) {
      setFormError('Reset token is missing. Please request a new password reset link.');
    }
  }, [token]);

  const onSubmit = handleSubmit(async (values) => {
    if (!token) return;
    setFormError(null);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: { token, password: values.password },
      });
      setSuccess(true);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Could not reset password. The link may have expired.',
      );
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
            {success ? (
              <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
            ) : (
              <Lock className="h-7 w-7" aria-hidden="true" />
            )}
          </span>
          <CardTitle className="font-display text-2xl">
            {success ? 'Password updated' : 'Choose a new password'}
          </CardTitle>
          <CardDescription>
            {success
              ? 'Your password has been successfully reset. You can now log in.'
              : 'Enter your new password below. It must be at least 12 characters.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">What happens next?</p>
                <p>
                  All of your other active sessions have been signed out to protect your account
                  security.
                </p>
              </div>
              <Button asChild variant="gradient" className="w-full">
                <Link href="/login">Go to login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {formError ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    disabled={!token || isSubmitting}
                    {...register('password')}
                  />
                </div>
                {errors.password ? (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    disabled={!token || isSubmitting}
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword ? (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                ) : null}
              </div>

              <Button
                type="submit"
                variant="gradient"
                className="w-full"
                disabled={!token || isSubmitting}
              >
                {isSubmitting ? 'Updating…' : 'Reset password'}
              </Button>

              <div className="mt-2 flex flex-col gap-1.5">
                {[
                  { icon: ShieldCheck, text: 'Must be at least 12 characters long' },
                  { icon: Lock, text: 'Changes password instantly and signs out other devices' },
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

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="w-full max-w-md">
          <Card className="w-full border-border/60 shadow-soft">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="font-display text-2xl">Resetting your password</CardTitle>
              <CardDescription>Preparing the password reset form…</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <ResetPasswordContent />
    </React.Suspense>
  );
}
