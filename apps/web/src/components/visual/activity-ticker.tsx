'use client';

import * as React from 'react';
import { ArrowUpRight, CheckCircle, Lock, Shield } from 'lucide-react';

const ACTIVITIES = [
  { icon: Lock,         color: 'text-primary',  text: 'Deal #TVX-9F2A funded · 8,500 USDT · Ethereum' },
  { icon: CheckCircle,  color: 'text-success',   text: 'Payout released · 12,500 USDT · TRON' },
  { icon: Shield,       color: 'text-accent',    text: 'Middleman resolved dispute · partial split' },
  { icon: Lock,         color: 'text-primary',  text: 'Deal #TVX-7C1B funded · 2.1 ETH · Ethereum' },
  { icon: CheckCircle,  color: 'text-success',   text: 'Deal #TVX-4A3D released · 320 SOL · Solana' },
  { icon: ArrowUpRight, color: 'text-warning',   text: 'Deal #TVX-2E8F created · 45,000 USDT · BNB Chain' },
  { icon: CheckCircle,  color: 'text-success',   text: 'Refund confirmed · 3,200 USDT · TRON' },
  { icon: Lock,         color: 'text-primary',  text: 'Deal #TVX-5B6C funded · 1,800 TRX · TRON' },
];

/**
 * Animated live-activity ticker that cycles through sample deal events.
 * Simulates a live feed of escrow activity on the platform.
 */
export function ActivityTicker() {
  const [index, setIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % ACTIVITIES.length);
        setVisible(true);
      }, 400);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const activity = ACTIVITIES[index]!;
  const Icon = activity.icon;

  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card/80 px-4 py-2 shadow-soft backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Live</span>
      <span
        className={`flex items-center gap-1.5 text-xs font-medium transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
        }`}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${activity.color}`} aria-hidden="true" />
        {activity.text}
      </span>
    </div>
  );
}
