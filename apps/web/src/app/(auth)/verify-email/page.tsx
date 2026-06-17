'use client';

/**
 * Email verification (Project Plan §12). Reads the `?token=` query parameter and
 * confirms it against `POST /auth/verify-email` on mount, surfacing success /
 * expired / error states. Also offers "Resend verification email" via
 * `POST /auth/request-email-verification`, which requires an authenticated
 * session — anonymous visitors are prompted to log in first. Mirrors the
 * `(auth)` route group visual style (forgot-password / login).
 */
import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, MailCheck, ShieldCheck, XCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLogo } from '@/components/visual/brand-logo';
import { ApiError, apiRequest } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

type VerifyState = 'verifying' | 'success' | 'expired' | 'missing' | 'error';

function isExpired(err: ApiError): boolean {
  const code = err.code.toLowerCase();
  return (
    code.includes('expired') || err.status === 410 || err.message.toLowerCase().includes('expired')
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { status } = useAuth();

  const [state, setState] = React.useState<VerifyState>(token ? 'verifying' : 'missing');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Resend verification email state (requires an authenticated session).
  const [resending, setResending] = React.useState(false);
  const [resent, setResent] = React.useState(false);
  const [resendError, setResendError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setState('missing');
      return;
    }
    let cancelled = false;
    setState('verifying');
    void (async () => {
      try {
        await apiRequest('/auth/verify-email', { method: 'POST', body: { token } });
        if (!cancelled) {
          setState('success');
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (isExpired(err)) {
            setState('expired');
          } else {
            setErrorMessage(err.message);
            setState('error');
          }
        } else {
          setErrorMessage('We could not verify your email. The link may be invalid.');
          setState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const resend = async () => {
    setResendError(null);
    setResending(true);
    try {
      await apiRequest('/auth/request-email-verification', { method: 'POST', body: {} });
      setResent(true);
    } catch (err) {
      setResent(false);
      setResendError(
        err instanceof ApiError ? err.message : 'Could not send a new verification email.',
      );
    } finally {
      setResending(false);
    }
  };

  const heading: Record<VerifyState, string> = {
    verifying: 'Verifying your email',
    success: 'Email verified',
    expired: 'Link expired',
    missing: 'Verification link needed',
    error: 'Verification failed',
  };

  const description: Record<VerifyState, string> = {
    verifying: 'Hang tight while we confirm your verification link.',
    success: 'Your email address is confirmed. You now have full access to your account.',
    expired: 'This verification link has expired. Request a fresh one below.',
    missing: 'This page needs a verification link. Open the link from your verification email.',
    error:
      errorMessage ?? 'We could not verify your email. The link may be invalid or already used.',
  };

  const Icon =
    state === 'success'
      ? CheckCircle2
      : state === 'expired'
        ? Clock
        : state === 'error' || state === 'missing'
          ? XCircle
          : MailCheck;

  const iconClass =
    state === 'success'
      ? 'text-success'
      : state === 'error' || state === 'missing'
        ? 'text-destructive'
        : state === 'expired'
          ? 'text-warning'
          : 'text-primary';

  const showResend = state === 'expired' || state === 'error' || state === 'missing';

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex justify-center lg:hidden">
        <Link href="/">
          <BrandLogo />
        </Link>
      </div>

      <Card className="w-full border-border/60 shadow-soft">
        <CardHeader className="space-y-1 text-center">
          <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Icon className={`h-7 w-7 ${iconClass}`} aria-hidden="true" />
          </span>
          <CardTitle className="font-display text-2xl">{heading[state]}</CardTitle>
          <CardDescription>{description[state]}</CardDescription>
        </CardHeader>
        <CardContent>
          {state === 'verifying' ? (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              Verifying…
            </div>
          ) : null}

          {state === 'success' ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-1.5">
                {[
                  { icon: ShieldCheck, text: 'Your account email is now confirmed' },
                  { icon: MailCheck, text: "You'll receive important deal updates by email" },
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
              <Button asChild variant="gradient" className="w-full">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          ) : null}

          {showResend ? (
            <div className="space-y-4">
              {resendError ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{resendError}</AlertDescription>
                </Alert>
              ) : null}

              {resent ? (
                <Alert>
                  <AlertTitle className="text-sm">Verification email sent</AlertTitle>
                  <AlertDescription className="text-xs">
                    Check your inbox for a new verification link. It may take a minute to arrive.
                  </AlertDescription>
                </Alert>
              ) : status === 'authenticated' ? (
                <Button
                  variant="gradient"
                  className="w-full"
                  disabled={resending}
                  onClick={() => void resend()}
                >
                  {resending ? 'Sending…' : 'Resend verification email'}
                </Button>
              ) : (
                <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Log in to resend</p>
                  <p className="mt-1 text-xs">
                    To get a new verification email, log in to your account first.
                  </p>
                  <Button asChild variant="gradient" className="mt-3 w-full">
                    <Link href="/login?next=/verify-email">Log in to continue</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : null}

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

export default function VerifyEmailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="w-full max-w-md">
          <Card className="w-full border-border/60 shadow-soft">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="font-display text-2xl">Verifying your email</CardTitle>
              <CardDescription>Hang tight while we confirm your verification link.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <VerifyEmailContent />
    </React.Suspense>
  );
}
