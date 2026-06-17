import { ShieldCheck } from 'lucide-react';

const COINS = ['USDT', 'ETH', 'BNB', 'SOL', 'TRX'];

/**
 * Decorative animated orbital system: supported coins revolve around a central
 * escrow shield. Pure CSS, aria-hidden. Coins keep their labels upright via a
 * counter-rotating inner span.
 */
export function CoinOrbit() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm" aria-hidden="true">
      <div className="absolute inset-[20%] rounded-full bg-brand-gradient opacity-20 blur-3xl" />
      <div className="absolute inset-[6%] rounded-full border border-border/70" />
      <div className="absolute inset-[26%] rounded-full border border-dashed border-border/60" />
      <div className="absolute inset-[46%] rounded-full border border-border/50" />

      {/* center shield */}
      <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-3xl bg-brand-gradient text-white shadow-glow-lg">
        <ShieldCheck className="h-9 w-9" />
        <span className="absolute inset-0 animate-pulse-ring rounded-3xl bg-primary/30" />
      </div>

      {/* rotating ring of coins */}
      <div className="absolute inset-0 animate-spin-slow">
        {COINS.map((coin, i) => {
          const angle = (i / COINS.length) * 360;
          return (
            <span
              key={coin}
              className="absolute left-1/2 top-1/2 -ml-6 -mt-6"
              style={{ transform: `rotate(${angle}deg) translateY(-9rem)` }}
            >
              <span className="flex h-12 w-12 animate-spin-slow items-center justify-center rounded-2xl border border-border bg-card/90 font-mono text-xs font-bold shadow-card backdrop-blur [animation-direction:reverse]">
                {coin}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
