'use client';

import * as React from 'react';
import QRCode from 'react-qr-code';
import { Check, Copy, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WalletInputProps {
  address: string;
  coin: string;
  network: string;
  amountText?: string;
  explorerUrl?: string | undefined;
  className?: string;
}

export function WalletInput({
  address,
  coin,
  network,
  amountText,
  explorerUrl,
  className,
}: WalletInputProps) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className={`space-y-6 rounded-2xl border bg-card p-6 shadow-soft ${className}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Wallet className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Escrow Payment Address</h3>
          <p className="text-xs text-muted-foreground">
            Send exactly {amountText ? amountText : 'the deal amount'} in {coin} via the {network}{' '}
            network.
          </p>
        </div>
      </div>

      {/* QR Code section */}
      <div className="flex flex-col items-center justify-center py-4 rounded-xl border bg-muted/20">
        <div className="bg-white p-4 rounded-2xl shadow-soft">
          <QRCode
            value={address}
            size={160}
            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 uppercase tracking-wider">
          Scan to pay with mobile wallet
        </p>
      </div>

      {/* Address text input + copy button */}
      <div className="space-y-1.5">
        <label htmlFor="escrow-address" className="text-xs font-semibold text-muted-foreground">
          Escrow Wallet Address
        </label>
        <div className="flex gap-2">
          <Input
            id="escrow-address"
            type="text"
            readOnly
            value={address}
            className="flex-1 font-mono text-xs select-all bg-muted/40 cursor-text"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copyToClipboard}
            title="Copy address"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {explorerUrl && (
        <div className="text-center pt-2 border-t">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1"
          >
            View on Blockchain Explorer
          </a>
        </div>
      )}
    </div>
  );
}
