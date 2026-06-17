import Link from 'next/link';
import { CheckCircle2, EyeOff, Lock, Quote, ShieldCheck } from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/visual/brand-logo';

const PERKS = [
  'Funds held in escrow until both sides deliver',
  'Neutral middleman ready to mediate any dispute',
  'On-chain verified funding across 4 networks',
  'Transparent fees with no hidden charges',
  'No ID or personal information required — trade privately and securely',
];

// Auth route group (login / register / recovery). Premium split-screen: a branded
// showcase panel on the left, the form on the right.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="absolute right-6 top-6 z-20">
        <ThemeToggle />
      </div>

      {/* Showcase panel */}
      <aside className="relative hidden overflow-hidden bg-brand-gradient p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        <Link href="/" className="relative z-10">
          <BrandLogo textClassName="text-white [&_.text-gradient]:text-white/80" />
        </Link>

        <div className="relative z-10 space-y-6">
          <h2 className="font-display text-4xl font-bold leading-tight">
            The safest way to trade digital goods with crypto.
          </h2>
          <ul className="space-y-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-white/90">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>

          {/* Mini stat row */}
          <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
            {[
              { value: '5 coins', label: 'USDT · ETH · BNB · SOL · TRX' },
              { value: '4 chains', label: 'On-chain verified' },
              { value: '$400–50k', label: 'Deal range' },
            ].map((s) => (
              <div key={s.value}>
                <p className="font-display text-xl font-bold">{s.value}</p>
                <p className="mt-0.5 text-xs text-white/70">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <figure className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <Quote className="h-5 w-5 text-white/70" aria-hidden="true" />
            <blockquote className="mt-2 text-sm leading-relaxed text-white/90">
              Funds were locked the moment I sent them and released the second I confirmed delivery.
              This is how crypto escrow should work.
            </blockquote>
            <figcaption className="mt-3 text-xs text-white/70">
              Marcus T. · Digital reseller
            </figcaption>
          </figure>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-sm text-white/80">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Bank-grade security
          </span>
          <span className="inline-flex items-center gap-2">
            <Lock className="h-4 w-4" aria-hidden="true" /> Encrypted by default
          </span>
          <span className="inline-flex items-center gap-2">
            <EyeOff className="h-4 w-4" aria-hidden="true" /> No personal info needed
          </span>
        </div>
      </aside>

      {/* Form panel */}
      <div className="relative flex items-center justify-center px-4 py-12">
        <div className="absolute right-0 top-0 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl lg:hidden" />
        {children}
      </div>
    </div>
  );
}
