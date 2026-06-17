'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/visual/brand-logo';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
  rememberMe: z.boolean().optional(),
});
type LoginValues = z.infer<typeof loginSchema>;

const SECURITY_POINTS = [
  { icon: Lock, text: 'End-to-end encrypted escrow' },
  { icon: ShieldCheck, text: 'Funds confirmed on-chain before release' },
  { icon: KeyRound, text: 'Session secured with signed JWT tokens' },
];

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { login, verifyTotp, status } = useAuth();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showTotpStep, setShowTotpStep] = React.useState(false);
  const [totpCode, setTotpCode] = React.useState('');
  const [totpSubmitting, setTotpSubmitting] = React.useState(false);

  // If the user is already authenticated (e.g. refreshed the /login page),
  // redirect them to the dashboard immediately without showing the form.
  React.useEffect(() => {
    if (status === 'authenticated') {
      const next = searchParams.get('next');
      const dest = next && next.startsWith('/') ? next : '/dashboard';
      // Full navigation so the page and auth context initialise fresh.
      window.location.replace(dest);
    }
  }, [status, searchParams]);

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await login({ ...values, rememberMe: values.rememberMe ?? true });
      if (res.totp_required) { setShowTotpStep(true); return; }
      const next = searchParams.get('next');
      const dest = next && next.startsWith('/') ? next : '/dashboard';
      // Use a full page navigation instead of router.push so the browser
      // sends the cookie in the next request (avoids cross-domain loop).
      window.location.href = dest;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'account_locked' || err.status === 423) {
          setFormError('This account has been temporarily locked. Please try again in 15 minutes or reset your password.');
        } else if (err.code === 'email_not_found' || err.status === 404) {
          setFormError('No account found for that email. Check for a typo or create a new account.');
        } else if (err.code === 'invalid_credentials' || err.status === 401) {
          setFormError('Incorrect password. Check your password or use "Forgot password" to reset it.');
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError('Unable to log in. Please try again.');
      }
    }
  });

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setTotpSubmitting(true);
    try {
      const values = getValues();
      await verifyTotp({ email: values.email, password: values.password, code: totpCode, rememberMe: values.rememberMe ?? true });
      const next = searchParams.get('next');
      const dest = next && next.startsWith('/') ? next : '/dashboard';
      window.location.href = dest;
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to verify 2FA code.');
    } finally { setTotpSubmitting(false); }
  };

  const emailValue = getValues('email');

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex justify-center lg:hidden">
        <Link href="/"><BrandLogo /></Link>
      </div>

      <Card className="w-full border-border/60 shadow-soft">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
          <CardDescription>Log in to your TrustVexa account</CardDescription>
        </CardHeader>
        <CardContent>
          {showTotpStep ? (
            <form onSubmit={handleTotpSubmit} className="space-y-4">
              {formError && <Alert variant="destructive"><AlertTitle>Verification failed</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}
              <div className="space-y-2 text-center">
                <ShieldCheck className="mx-auto h-12 w-12 text-primary animate-pulse" />
                <h3 className="font-display text-lg font-semibold">Two-Factor Authentication</h3>
                <p className="text-xs text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="totpCode">Security code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="totpCode" type="text" inputMode="numeric" maxLength={8} className="pl-9 text-center font-mono text-lg tracking-widest" placeholder="000000" value={totpCode} onChange={e => setTotpCode(e.target.value.trim())} required autoFocus />
                </div>
              </div>
              <Button type="submit" variant="gradient" className="w-full" disabled={totpSubmitting || totpCode.length < 6}>{totpSubmitting ? 'Verifying...' : 'Verify & Log in'}</Button>
              <button type="button" className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline underline-offset-4" onClick={() => { setShowTotpStep(false); setTotpCode(''); setFormError(null); }}>Back to credentials</button>
            </form>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {formError && <Alert variant="destructive"><AlertTitle>Login failed</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" autoComplete="email" className="pl-9" {...register('email')} />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="pl-9 pr-10" {...register('password')} />
                  <button type="button" aria-label={showPassword ? 'Hide' : 'Show'} onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="h-4 w-4" {...register('rememberMe')} />
                Keep me signed in on this device
              </label>

              <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Logging in…' : 'Log in'}</Button>
            </form>
          )}

          <div className="mt-6 space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              New to TrustVexa?{' '}
              <Link href={emailValue ? `/register?email=${encodeURIComponent(emailValue)}` : '/register'} className="font-medium text-foreground underline-offset-4 hover:underline">Create a free account</Link>
            </p>
            <p className="text-center text-xs text-muted-foreground border rounded-lg px-3 py-2 bg-muted/20">
              ⚖️ <span className="font-medium text-foreground">Middleman accounts</span> are operator-provisioned — not self-registered. Log in with your given credentials.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t pt-5">
            {SECURITY_POINTS.map(p => (
              <div key={p.text} className="flex items-center gap-2 text-xs text-muted-foreground">
                <p.icon className="h-3.5 w-3.5 shrink-0 text-success" />
                {p.text}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="mt-5 px-2 text-center text-xs text-muted-foreground">
        By logging in you confirm you are 18 or older and agree to our{' '}
        <Link href="/terms" className="underline underline-offset-4">Terms</Link>{' '}and{' '}
        <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.
      </p>
    </div>
  );
}
