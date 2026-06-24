'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  DollarSign,
  Handshake,
  Landmark,
  LayoutGrid,
  type LucideIcon,
  Menu,
  ShieldCheck,
  TicketCheck,
  Users,
  X,
} from 'lucide-react';

import { BrandLogo } from '@/components/visual/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV: ReadonlyArray<NavItem> = [
  { href: '/admin', label: 'Work queue', icon: LayoutGrid, exact: true },
  { href: '/admin/payouts', label: 'Payouts', icon: DollarSign },
  { href: '/admin/operations', label: 'Operations', icon: Activity },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/support', label: 'Support & Cases', icon: TicketCheck },
  { href: '/admin/reviews', label: 'Reviews', icon: ShieldCheck },
  { href: '/treasury', label: 'Treasury', icon: Landmark },
  { href: '/connect', label: 'Chats', icon: Handshake },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const handleNavigate = onNavigate ?? (() => {});
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Admin">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavigate}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              active
                ? 'bg-brand-gradient text-white shadow-glow'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-muted/20">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-card/60 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <Link href="/">
            <BrandLogo showText={false} />
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Middleman
          </span>
        </div>
        <NavLinks />
        <div className="border-t p-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              void logout();
            }}
          >
            Log out
          </Button>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r bg-card shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b px-5">
              <BrandLogo />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display text-sm font-semibold text-muted-foreground">
              Middleman console
            </span>
          </div>
          <ThemeToggle />
        </header>
        <main className="px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
