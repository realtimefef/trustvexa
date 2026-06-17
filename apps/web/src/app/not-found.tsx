import Link from 'next/link';
import {
  ArrowRight,
  Compass,
  HelpCircle,
  Home,
  LayoutDashboard,
  LifeBuoy,
  Search,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AuroraBackground } from '@/components/visual/aurora-background';
import { BrandLogo } from '@/components/visual/brand-logo';

const LINKS = [
  { href: '/', label: 'Home', desc: 'Back to the start', icon: Home },
  { href: '/how-it-works', label: 'How it works', desc: 'The escrow flow', icon: Compass },
  { href: '/dashboard', label: 'Dashboard', desc: 'Your deals', icon: LayoutDashboard },
  { href: '/faq', label: 'Help center', desc: 'Search the FAQ', icon: HelpCircle },
];

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <AuroraBackground />

      <Link href="/" className="mb-10">
        <BrandLogo />
      </Link>

      {/* Big 404 SVG-ish mark */}
      <div className="relative">
        <p
          className="select-none font-display text-[7rem] font-bold leading-none tracking-tighter text-transparent sm:text-[10rem]"
          style={{
            backgroundImage:
              'linear-gradient(120deg, hsl(var(--brand-1)), hsl(var(--brand-2)), hsl(var(--brand-3)))',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
          }}
        >
          404
        </p>
        <span className="absolute left-1/2 top-1/2 -z-10 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
      </div>

      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        This page took a wrong turn
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The page you’re looking for doesn’t exist or may have moved. Let’s get you back to safety.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" variant="gradient">
          <Link href="/">
            <Home className="h-4 w-4" /> Back home
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/contact">
            <LifeBuoy className="h-4 w-4" /> Contact support
          </Link>
        </Button>
      </div>

      <div className="mt-12 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-center gap-3 rounded-2xl border bg-card/60 p-4 text-left shadow-soft backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-glow"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <l.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium">{l.label}</span>
              <span className="block text-xs text-muted-foreground">{l.desc}</span>
            </span>
            <ArrowRight
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>

      <p className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
        <Search className="h-3.5 w-3.5" aria-hidden="true" /> Tip: most answers live in the{' '}
        <Link
          href="/faq"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          help center
        </Link>
        .
      </p>
    </main>
  );
}
