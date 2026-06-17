'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

interface Props {
  requiredRole: 'user' | 'middleman';
  children: React.ReactNode;
}

export function ClientRoleGuard({ requiredRole, children }: Props) {
  const { status, user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (status === 'authenticated' && user?.role !== requiredRole) {
      // Authenticated but wrong role — redirect to their correct home.
      router.replace('/dashboard');
    }
  }, [status, user, requiredRole, router]);

  if (status === 'loading') return null;
  if (status === 'anonymous') return null; // ClientAuthGuard handles this
  if (user?.role !== requiredRole) return null;

  return <>{children}</>;
}
