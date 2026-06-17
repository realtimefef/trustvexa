'use client';

import * as React from 'react';
import { TrendingUp, Shield, Zap, Users } from 'lucide-react';

/** Floating platform feature cards that bob up and down independently. */
export function FloatingMetrics() {
  return (
    <div className="relative mx-auto h-[340px] w-full max-w-[420px] select-none">
      {/* Central glow */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[60px]"
      />

      {/* Card: Escrow */}
      <div className="absolute left-0 top-[30px] animate-[card-float-a_7s_ease-in-out_infinite] rounded-2xl border border-border bg-card/90 p-4 shadow-glow backdrop-blur-xl"
        style={{ minWidth: 160 }}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5 text-success" />
          Escrow
        </div>
        <p className="mt-1.5 font-display text-xl font-bold tracking-tight leading-tight">On-chain<br />Protected</p>
        <p className="text-[10px] text-success mt-0.5">Funds locked until delivery</p>
      </div>

      {/* Card: Security */}
      <div className="absolute right-0 top-[10px] animate-[card-float-b_9s_ease-in-out_infinite] rounded-2xl border border-border bg-card/90 p-4 shadow-glow backdrop-blur-xl"
        style={{ minWidth: 150 }}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-primary" />
          Security
        </div>
        <p className="mt-1.5 font-display text-xl font-bold tracking-tight leading-tight text-gradient">End-to-end<br />Encrypted</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">AES-256-GCM</p>
      </div>

      {/* Card: Multi-chain */}
      <div className="absolute bottom-[60px] left-[10%] animate-[card-float-c_11s_ease-in-out_infinite] rounded-2xl border border-border bg-card/90 p-4 shadow-soft backdrop-blur-xl"
        style={{ minWidth: 155 }}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-warning" />
          Multi-chain
        </div>
        <p className="mt-1.5 font-display text-xl font-bold tracking-tight leading-tight">4 Networks<br />5 Coins</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">ETH · BNB · SOL · TRX</p>
      </div>

      {/* Card: Dispute */}
      <div className="absolute bottom-[55px] right-[5%] animate-[card-float-a_8s_1s_ease-in-out_infinite] rounded-2xl border border-border bg-card/90 p-4 shadow-soft backdrop-blur-xl"
        style={{ minWidth: 145 }}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 text-accent" />
          Disputes
        </div>
        <p className="mt-1.5 font-display text-xl font-bold tracking-tight leading-tight">Neutral<br />Middleman</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Human-reviewed</p>
      </div>

      {/* SVG lines connecting cards to center */}
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full pointer-events-none opacity-30" viewBox="0 0 420 340" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(250,85%,67%)" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(250,85%,67%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(250,85%,67%)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="160" y1="70" x2="210" y2="170" stroke="url(#lg1)" strokeWidth="1.5" strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="0" to="16" dur="2s" repeatCount="indefinite" />
        </line>
        <line x1="290" y1="50" x2="210" y2="170" stroke="url(#lg1)" strokeWidth="1.5" strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="16" to="0" dur="2.5s" repeatCount="indefinite" />
        </line>
        <line x1="80" y1="265" x2="210" y2="170" stroke="url(#lg1)" strokeWidth="1.5" strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="0" to="16" dur="3s" repeatCount="indefinite" />
        </line>
        <line x1="330" y1="265" x2="210" y2="170" stroke="url(#lg1)" strokeWidth="1.5" strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="16" to="0" dur="2s" repeatCount="indefinite" />
        </line>
        {/* Center pulse dot */}
        <circle cx="210" cy="170" r="4" fill="hsl(250,85%,67%)" opacity="0.8">
          <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
