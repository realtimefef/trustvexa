'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, UserRound } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/visual/brand-logo';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, underscores, and hyphens'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(10, 'Password must be at least 10 characters'),
  isAdult: z.literal(true, { errorMap: () => ({ message: 'You must confirm you are 18 or older' }) }),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the Terms of Service' }) }),
  acceptPrivacy: z.literal(true, { errorMap: () => ({ message: 'You must accept the Privacy Policy' }) }),
});

type RegisterValues = z.infer<typeof registerSchema>;

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 10) score++;
  if (pw.length >= 16) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak', color: 'bg-destructive' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-warning' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-accent' };
  return { score, label: 'Strong', color: 'bg-success' };
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerAccount } = useAuth();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [emailTaken, setEmailTaken] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [passwordValue, setPasswordValue] = React.useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const watchedPassword = watch('password', '');
  React.useEffect(() => { setPasswordValue(watchedPassword ?? ''); }, [watchedPassword]);

  const strength = getPasswordStrength(passwordValue);
  const strengthWidth = strength.score === 0 ? '0%' : strength.score === 1 ? '20%' : strength.score === 2 ? '40%' : strength.score === 3 ? '65%' : strength.score === 4 ? '85%' : '100%';

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setEmailTaken(false);
    try {
      await registerAccount({ ...values, rememberMe: true });
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'email_already_exists' || err.code === 'duplicate_email' || err.code === 'email_unavailable' || err.status === 409) {
          setEmailTaken(true);
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError('Unable to create your account. Please try again.');
      }
    }
  });

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex justify-center lg:hidden">
        <Link href="/"><BrandLogo /></Link>
      </div>

      <Card className="w-full border-border/60 shadow-soft">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="font-display text-2xl">Create your account</CardTitle>
          <CardDescription>Start trading safely with crypto escrow — no email verification required</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {formError && (
              <Alert variant="destructive">
                <AlertTitle>Registration failed</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            {emailTaken && (
              <Alert>
                <AlertTitle className="text-sm">Email already registered</AlertTitle>
                <AlertDescription className="text-xs">
                  An account with this email already exists.{' '}
                  <Link href="/login" className="font-medium underline-offset-4 hover:underline">Log in instead</Link>{' '}
                  or{' '}
                  <Link href="/forgot-password" className="font-medium underline-offset-4 hover:underline">reset your password</Link>.
                </AlertDescription>
              </Alert>
            )}

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="username" autoComplete="username" className="pl-9" {...register('username')} />
              </div>
              {errors.username ? (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">3–32 characters. Shown to counterparties.</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="email" type="email" autoComplete="email" className="pl-9" {...register('email')} />
              </div>
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Used for deal alerts and account recovery only. No verification email sent.</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="pl-9 pr-10" {...register('password')} />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {passwordValue.length > 0 && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full transition-all duration-300', strength.color)} style={{ width: strengthWidth }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Password strength</span>
                    <span className={cn('font-medium', strength.label === 'Weak' && 'text-destructive', strength.label === 'Fair' && 'text-warning', strength.label === 'Good' && 'text-accent', strength.label === 'Strong' && 'text-success')}>{strength.label}</span>
                  </div>
                </div>
              )}

              <ul className="space-y-1 text-xs">
                {[
                  { label: 'At least 10 characters', met: passwordValue.length >= 10 },
                  { label: 'One uppercase letter', met: /[A-Z]/.test(passwordValue) },
                  { label: 'One number', met: /[0-9]/.test(passwordValue) },
                  { label: 'One special character', met: /[^A-Za-z0-9]/.test(passwordValue) },
                ].map(req => (
                  <li key={req.label} className={cn('flex items-center gap-1.5', passwordValue.length > 0 ? req.met ? 'text-success' : 'text-muted-foreground' : 'text-muted-foreground')}>
                    <CheckCircle2 className={cn('h-3 w-3 shrink-0', passwordValue.length > 0 && req.met ? 'text-success' : 'text-muted-foreground/40')} aria-hidden="true" />
                    {req.label}
                  </li>
                ))}
              </ul>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {/* Consent */}
            <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4" {...register('isAdult')} />
                <span className="text-muted-foreground">I confirm I am <span className="font-medium text-foreground">18 years or older</span>.</span>
              </label>
              {errors.isAdult && <p className="text-xs text-destructive">{errors.isAdult.message}</p>}

              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4" {...register('acceptTerms')} />
                <span className="text-muted-foreground">I accept the <Link href="/terms" className="font-medium text-foreground underline underline-offset-4">Terms of Service</Link>.</span>
              </label>
              {errors.acceptTerms && <p className="text-xs text-destructive">{errors.acceptTerms.message}</p>}

              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4" {...register('acceptPrivacy')} />
                <span className="text-muted-foreground">I accept the <Link href="/privacy" className="font-medium text-foreground underline underline-offset-4">Privacy Policy</Link>.</span>
              </label>
              {errors.acceptPrivacy && <p className="text-xs text-destructive">{errors.acceptPrivacy.message}</p>}
            </div>

            <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Create free account'}
            </Button>
          </form>

          <div className="mt-5 flex flex-col gap-2 border-t pt-5">
            {[
              { icon: ShieldCheck, text: 'Passwords are hashed — we can never read yours' },
              { icon: KeyRound, text: 'Email encrypted at rest and never shown to other users' },
              { icon: Lock, text: 'No KYC or email verification required' },
            ].map(p => (
              <div key={p.text} className="flex items-center gap-2 text-xs text-muted-foreground">
                <p.icon className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                {p.text}
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
