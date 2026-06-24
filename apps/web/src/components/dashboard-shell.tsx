'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Gavel,
  Handshake,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  Settings,
  Shield,
  Star,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';

import { BrandLogo } from '@/components/visual/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { NotificationBell } from '@/components/notification-bell';
import { LanguageToggle } from '@/components/language-toggle';
import { SessionTimeoutWarning } from '@/components/session-timeout-warning';

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: ReadonlyArray<{ section: string; items: NavItem[] }> = [
  {
    section: 'Main',
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { href: '/connect', label: 'Connect & Chat', icon: Handshake },
      { href: '/deals', label: 'Deals', icon: Star },
      { href: '/wallet', label: 'Wallet', icon: Wallet },
      { href: '/disputes', label: 'Disputes', icon: Gavel },
    ],
  },
  {
    section: 'Account',
    items: [
      { href: '/profile', label: 'Profile', icon: UserRound },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isMiddleman = user?.role === 'middleman';
  const handleNavigate = onNavigate ?? (() => {});
  return (
    <nav className="flex flex-1 flex-col gap-6 px-3 py-4" aria-label="Dashboard">
      {NAV.map((group) => (
        <div key={group.section}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {group.section}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleNavigate}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                      active
                        ? 'bg-brand-gradient text-white shadow-glow'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-[18px] w-[18px]',
                        !active && 'text-muted-foreground group-hover:text-foreground',
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                </li>
              );
            })}
            {/* Middleman-only nav item */}
            {group.section === 'Main' && isMiddleman && (() => {
              const href = '/middleman';
              const active = pathname.startsWith(href);
              return (
                <li key="middleman-dash">
                  <Link href={href} onClick={handleNavigate}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                      active ? 'bg-brand-gradient text-white shadow-glow' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}>
                    <Shield className={cn('h-[18px] w-[18px]', !active && 'text-muted-foreground group-hover:text-foreground')} aria-hidden="true" />
                    <span className="flex-1">Middleman</span>
                  </Link>
                </li>
              );
            })()}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = React.useState(false);

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'TV';

  return (
    <div className="min-h-screen bg-muted/20">
      <SessionTimeoutWarning />
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card/60 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Link href="/">
            <BrandLogo />
          </Link>
        </div>
        <NavLinks />
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.username ?? 'Account'}</p>
              <p className="truncate text-xs text-muted-foreground">
                {typeof user?.email === 'string' ? user.email : ''}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={() => {
              void logout();
            }}
          >
            Log out
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
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
        </div>
      ) : null}

      {/* Main column */}
      <div className="lg:pl-64">
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
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <LanguageToggle />
            <ThemeToggle />
            <Button asChild variant="gradient" size="sm" className="hidden sm:inline-flex">
              <Link href="/connect">
                <Handshake className="h-4 w-4" /> Connect &amp; Chat
              </Link>
            </Button>
          </div>
        </header>
        <main className="px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
