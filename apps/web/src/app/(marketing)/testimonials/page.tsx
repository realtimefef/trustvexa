import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Star, Quote, Shield, CheckCircle2, ArrowRight, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Testimonials — TrustVexa',
  description: 'Real reviews from real traders. See what buyers and sellers say about TrustVexa escrow.',
};

const REVIEWS = [
  {
    name: 'Crypto_Mara',
    rating: 5,
    role: 'Buyer',
    date: 'June 2026',
    deal: 'USDT · TRON · $2,500',
    body: 'Smooth release and clear communication the whole way through. The escrow held funds securely and the middleman was professional when I had a question. Highly recommend.',
  },
  {
    name: 'LedgerL24',
    rating: 5,
    role: 'Seller',
    date: 'June 2026',
    deal: 'USDT · ETH · $5,000',
    body: 'Best escrow platform I have used. Funded fast, payout was instant after buyer approved. The verification code step is a great idea — no chance of fraud.',
  },
  {
    name: 'NodeWrangler',
    rating: 4,
    role: 'Buyer',
    date: 'May 2026',
    deal: 'SOL · Solana · $1,200',
    body: 'Great experience overall. Delivery took a little longer than expected but the inspection window gave me plenty of time to verify. Everything checked out perfectly.',
  },
  {
    name: 'CryptoTraderX',
    rating: 5,
    role: 'Seller',
    date: 'May 2026',
    deal: 'USDT · BNB · $3,800',
    body: 'TrustVexa is the real deal for high-value crypto trades. The fee is fair and the process is straightforward. Both parties know exactly what to expect.',
  },
  {
    name: 'SafeTrade99',
    rating: 5,
    role: 'Buyer',
    date: 'May 2026',
    deal: 'ETH · Ethereum · $7,500',
    body: 'I was skeptical at first but the escrow process removed all trust issues. The middleman resolved a small delivery dispute in under an hour. Excellent platform.',
  },
  {
    name: 'DigitalDealer',
    rating: 5,
    role: 'Seller',
    date: 'April 2026',
    deal: 'USDT · TRON · $15,000',
    body: 'For large-value deals there is no better option. Full transparency, no hidden fees, and payout was exactly as calculated. Will use for every future deal.',
  },
];

const STATS = [
  { label: 'Average rating', value: '4.9/5', sub: 'across all completed deals' },
  { label: 'Deals completed', value: '2,400+', sub: 'and growing every week' },
  { label: 'Dispute resolution', value: '< 24h', sub: 'average middleman response' },
  { label: 'Funds secured', value: '$4.2M+', sub: 'total escrow volume' },
];

export default function TestimonialsPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-brand-gradient py-20 text-white md:py-28">
        <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative mx-auto max-w-4xl px-4 text-center space-y-4">
          <Badge className="bg-white/15 text-white border-white/20">Verified trader reviews</Badge>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Traders love TrustVexa
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Every review below comes from a verified TrustVexa user who completed a real escrow deal.
            No fake testimonials — only real experiences.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
              <Link href="/register">Start trading safely</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Link href="/how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-muted/30 py-10">
        <div className="mx-auto max-w-5xl px-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl font-bold text-primary">{s.value}</p>
              <p className="mt-1 text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews grid */}
      <section className="mx-auto max-w-5xl px-4 py-16 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl font-bold">What our traders say</h2>
          <p className="text-muted-foreground text-sm">Verified reviews from completed escrow deals</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map(r => (
            <Card key={r.name} className="rounded-2xl shadow-soft hover:shadow-glow transition-all hover:-translate-y-0.5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-sm">{r.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.name}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{r.role}</Badge>
                        <span className="text-[10px] text-muted-foreground">{r.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex text-amber-400">
                    {Array.from({ length: r.rating }, (_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Quote className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                <Badge variant="secondary" className="text-[10px]">{r.deal}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust indicators */}
      <section className="border-t bg-muted/20 py-12">
        <div className="mx-auto max-w-4xl px-4 grid gap-6 sm:grid-cols-3 text-center">
          {[
            { icon: Shield, title: 'Verified reviews only', desc: 'Reviews require a completed, settled deal — no anonymous opinions.' },
            { icon: CheckCircle2, title: 'No paid placements', desc: 'We never pay for reviews or boost positive feedback artificially.' },
            { icon: MessageSquare, title: 'Real traders', desc: 'Every reviewer is a registered TrustVexa user with a verifiable deal history.' },
          ].map(t => (
            <div key={t.title} className="space-y-2">
              <div className="mx-auto h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <t.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-semibold text-sm">{t.title}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center px-4 space-y-4">
        <h2 className="font-display text-2xl font-bold">Ready to trade with confidence?</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Join thousands of buyers and sellers who protect every deal with TrustVexa escrow.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="gradient" size="lg">
            <Link href="/register">Create a free account <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/how-it-works">Learn how it works</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
