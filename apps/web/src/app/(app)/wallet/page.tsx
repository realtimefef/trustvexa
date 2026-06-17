'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Copy,
  FilePlus2,
  HelpCircle,
  Network,
  Plus,
  ShieldCheck,
  Wallet as WalletIcon,
  Trash2,
  Send,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { StatCard } from '@/components/visual/stat-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest, newIdempotencyKey } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { useSocket } from '@/lib/socket/socket-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const WITHDRAWAL_STEPS = [
  {
    icon: FilePlus2,
    title: 'Add a withdrawal address',
    body: 'Register and verify the destination address for the exact network you want to settle on. Saved addresses speed up every future payout.',
  },
  {
    icon: ShieldCheck,
    title: 'Confirm with security checks',
    body: 'Each withdrawal is verified against your account safeguards before it is queued, so funds only ever leave to addresses you control.',
  },
  {
    icon: Banknote,
    title: 'Funds settle on-chain',
    body: 'Once approved, the payout is broadcast to the network and you can track it to completion from your transaction history.',
  },
];

const SAFETY_TIPS = [
  {
    icon: Network,
    title: 'Match the network exactly',
    body: 'A USDT balance on TRON can only be sent to a TRON address. Sending to a different network is irreversible.',
  },
  {
    icon: Copy,
    title: 'Always copy, never type',
    body: 'Use the copy button for deposit addresses. Manually typing even one character wrong can send funds to the void.',
  },
  {
    icon: AlertTriangle,
    title: 'Verify before you send',
    body: 'Double-check the first and last characters of any address against the source before confirming a large transfer.',
  },
];

const WALLET_FAQS = [
  {
    q: 'How long do deposits take to appear?',
    a: 'Deposits credit your balance after the network reaches the required confirmations. Faster networks like TRON and Solana usually clear within minutes.',
  },
  {
    q: 'How long does a withdrawal take?',
    a: 'After approval, withdrawals are broadcast to the chain immediately. On-chain settlement time then depends on the network you selected.',
  },
  {
    q: 'I sent funds on the wrong network. What now?',
    a: 'Cross-network transfers cannot be reversed once broadcast. Always confirm the network matches the asset before sending, and use a small test amount when unsure.',
  },
];

interface WalletInfoResponse {
  balances: Array<{
    coin: string;
    network: string;
    amount: string;
    usd: string;
    status: 'Available' | 'Pending' | 'Unavailable';
    balanceUnavailable?: boolean;
  }>;
  addresses: Array<{
    network: string;
    address: string;
  }>;
  addressBook: Array<{
    id: string;
    label: string | null;
    coin: string | null;
    network: string | null;
    address: string;
    validationStatus: string | null;
  }>;
}

function getEstimatedFee(coin: string, network: string): { amount: string; currency: string } {
  const net = network.toUpperCase();
  const c = coin.toUpperCase();

  if (net === 'ETH' || net === 'ETHEREUM') {
    return c === 'USDT' ? { amount: '2.50', currency: 'USDT' } : { amount: '0.0015', currency: 'ETH' };
  } else if (net === 'BNB' || net === 'BNB CHAIN (BSC)' || net === 'BSC' || net === 'BNB') {
    return c === 'USDT' ? { amount: '0.15', currency: 'USDT' } : { amount: '0.0003', currency: 'BNB' };
  } else if (net === 'SOLANA' || net === 'SOL') {
    return c === 'USDT' ? { amount: '0.01', currency: 'USDT' } : { amount: '0.0001', currency: 'SOL' };
  } else if (net === 'TRON') {
    return c === 'USDT' ? { amount: '0.75', currency: 'USDT' } : { amount: '5.0', currency: 'TRX' };
  }
  return { amount: '0.00', currency: c };
}

export default function WalletPage() {
  const { status } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [copied, setCopied] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!socket) return;
    const handleBalanceUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: ['wallet-info'] });
    };
    socket.on('wallet:balance_updated', handleBalanceUpdated);
    return () => {
      socket.off('wallet:balance_updated', handleBalanceUpdated);
    };
  }, [socket, queryClient]);

  // Modals & form state
  const [showAddAddress, setShowAddAddress] = React.useState(false);
  const [showWithdraw, setShowWithdraw] = React.useState(false);

  // Add Address Form State
  const [newLabel, setNewLabel] = React.useState('');
  const [newCoin, setNewCoin] = React.useState('USDT');
  const [newNetwork, setNewNetwork] = React.useState('TRON');
  const [newAddress, setNewAddress] = React.useState('');
  const [addAddressError, setAddAddressError] = React.useState<string | null>(null);

  // Withdraw Form State
  const [withdrawCoin, setWithdrawCoin] = React.useState('USDT');
  const [withdrawNetwork, setWithdrawNetwork] = React.useState('TRON');
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [withdrawAddress, setWithdrawAddress] = React.useState('');
  const [withdrawError, setWithdrawError] = React.useState<string | null>(null);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = React.useState<string | null>(null);
  const [withdrawTxHash, setWithdrawTxHash] = React.useState<string | null>(null);

  const estimatedFee = React.useMemo(() => {
    return getEstimatedFee(withdrawCoin, withdrawNetwork);
  }, [withdrawCoin, withdrawNetwork]);

  const { data: walletData, isLoading } = useQuery<WalletInfoResponse>({
    queryKey: ['wallet-info'],
    enabled: status === 'authenticated',
    queryFn: async () => apiRequest<WalletInfoResponse>('/wallets'),
  });

  const addAddressMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      apiRequest('/wallets/address-book', {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
        body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wallet-info'] });
      setShowAddAddress(false);
      setNewLabel('');
      setNewAddress('');
      setAddAddressError(null);
    },
    onError: (err: Error) => {
      setAddAddressError(err.message || 'Failed to save address.');
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/wallets/address-book/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wallet-info'] });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      apiRequest<{ success: boolean; message: string; txHash?: string }>('/wallets/withdraw', {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
        body,
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['wallet-info'] });
      setWithdrawSuccessMsg(res.message);
      if (res.txHash) setWithdrawTxHash(res.txHash);
      setWithdrawAmount('');
      setWithdrawAddress('');
      setWithdrawError(null);
    },
    onError: (err: Error) => {
      setWithdrawError(err.message || 'Withdrawal failed.');
    },
  });

  const copy = (value: string) => {
    void navigator.clipboard?.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 1500);
  };

  const balances = walletData?.balances ?? [];
  const addresses = walletData?.addresses ?? [];
  const addressBook = walletData?.addressBook ?? [];

  // Calculate totals
  const totalBalanceUsd = React.useMemo(() => {
    return balances.reduce((sum, b) => {
      if (b.balanceUnavailable) return sum;
      const amtStr = b.usd.replace('$', '').replace(',', '');
      return sum + (Number(amtStr) || 0);
    }, 0);
  }, [balances]);

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-12 w-1/4" />
        <div className="grid gap-5 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <DashboardPageHeader
        title="Wallet"
        description="Manage your settlement balances, deposit addresses, and saved withdrawal wallets."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setWithdrawSuccessMsg(null);
                setWithdrawTxHash(null);
                setWithdrawError(null);
                setShowWithdraw(true);
              }}
            >
              <Send className="h-4 w-4 mr-2" /> Withdraw
            </Button>
            <Button
              variant="gradient"
              onClick={() => {
                setAddAddressError(null);
                setShowAddAddress(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Add address
            </Button>
          </div>
        }
      />

      {balances.some((b) => b.balanceUnavailable) && (
        <Alert
          variant="destructive"
          className="rounded-2xl border bg-destructive/15 text-destructive dark:bg-destructive/5 dark:border-destructive/20 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <AlertTitle className="font-semibold">RPC Node Offline or Unconfigured</AlertTitle>
            <AlertDescription>
              One or more blockchain RPC nodes are currently unconfigured or unreachable. Settlement
              balances for these networks are temporarily unavailable.
            </AlertDescription>
          </div>
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={WalletIcon}
          label="Total balance"
          value={`$${totalBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          hint="Across all supported assets"
          accent="primary"
        />
        <StatCard
          icon={ArrowDownLeft}
          label="In escrow"
          value="$0.00"
          hint="Active deal escrow balances"
          accent="accent"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Available"
          value={`$${totalBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          hint="Unlocked and ready to withdraw"
          accent="success"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Balances list */}
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle>Balances by coin</CardTitle>
            <CardDescription>Settlement balances held in your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : (
              balances.map((b) => (
                <div
                  key={`${b.coin}-${b.network}`}
                  className="flex items-center justify-between rounded-xl border bg-muted/30 p-4 transition-all hover:shadow-glow"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white">
                      {b.coin}
                    </span>
                    <div>
                      <p className="font-semibold text-sm sm:text-base">
                        {b.amount} {b.coin}
                      </p>
                      <p className="text-xs text-muted-foreground">{b.network}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{b.usd}</p>
                    <Badge
                      variant={
                        b.status === 'Available'
                          ? 'success'
                          : b.status === 'Pending'
                            ? 'warning'
                            : 'destructive'
                      }
                      className="mt-1 text-[10px] py-0"
                    >
                      {b.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Deposit addresses */}
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle>Platform deposit wallets</CardTitle>
            <CardDescription>
              Use these personal deposit addresses to credit your available balance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : (
              addresses.map((a) => (
                <div
                  key={a.network}
                  className="flex items-center justify-between gap-4 rounded-xl border p-4 bg-card"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase text-primary tracking-wider">
                      {a.network}
                    </p>
                    <p className="font-mono text-sm text-muted-foreground truncate select-all">
                      {a.address}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copy(a.address)}>
                    <Copy className="h-4 w-4" />
                    {copied === a.address ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Address book */}
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle>Saved withdrawal addresses</CardTitle>
          <CardDescription>Your registered external wallet destinations.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : addressBook.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No saved addresses. Add one to speed up withdrawals.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="p-4 font-semibold">Label</th>
                    <th className="p-4 font-semibold">Coin / Network</th>
                    <th className="p-4 font-semibold">Address</th>
                    <th className="p-4 font-semibold">Verification</th>
                    <th className="p-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {addressBook.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/10">
                      <td className="p-4 font-medium">{entry.label}</td>
                      <td className="p-4">
                        <span className="font-semibold text-xs bg-muted px-1.5 py-0.5 rounded">
                          {entry.coin}
                        </span>
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {entry.network}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-muted-foreground select-all">
                        {entry.address}
                      </td>
                      <td className="p-4">
                        <Badge variant={entry.validationStatus === 'valid' ? 'success' : 'warning'}>
                          {entry.validationStatus || 'Pending'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm('Delete this saved address?')) {
                              deleteAddressMutation.mutate(entry.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Address Modal Dialog */}
      {showAddAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border rounded-2xl shadow-glow overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="font-display text-lg font-bold">Add withdrawal address</h3>
              <p className="text-xs text-muted-foreground">Save a verified destination address.</p>
            </div>
            <div className="p-6 space-y-4">
              {addAddressError && (
                <div className="p-3 text-xs bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                  {addAddressError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="label">Label (e.g. My Ledger, Binance)</Label>
                <Input
                  id="label"
                  placeholder="Enter label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="coin">Coin</Label>
                  <select
                    id="coin"
                    value={newCoin}
                    onChange={(e) => setNewCoin(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="USDT">USDT</option>
                    <option value="ETH">ETH</option>
                    <option value="BNB">BNB</option>
                    <option value="SOL">SOL</option>
                    <option value="TRX">TRX</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="network">Network</Label>
                  <select
                    id="network"
                    value={newNetwork}
                    onChange={(e) => setNewNetwork(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="TRON">TRON</option>
                    <option value="ETH">Ethereum (EVM)</option>
                    <option value="BNB">BNB Chain (BSC)</option>
                    <option value="SOLANA">Solana</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Destination Address</Label>
                <Input
                  id="address"
                  placeholder="Paste destination address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2 bg-muted/20">
              <Button variant="outline" size="sm" onClick={() => setShowAddAddress(false)}>
                Cancel
              </Button>
              <Button
                variant="gradient"
                size="sm"
                disabled={addAddressMutation.isPending || !newLabel || !newAddress}
                onClick={() =>
                  addAddressMutation.mutate({
                    label: newLabel,
                    coin: newCoin,
                    network: newNetwork,
                    address: newAddress,
                  })
                }
              >
                {addAddressMutation.isPending ? 'Saving...' : 'Save address'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal Dialog */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border rounded-2xl shadow-glow overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="font-display text-lg font-bold">Request Withdrawal</h3>
              <p className="text-xs text-muted-foreground">
                Withdraw your available balance to an external wallet.
              </p>
            </div>
            <div className="p-6 space-y-4">
              {withdrawSuccessMsg ? (
                <div className="space-y-4 text-center py-4">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-success">
                    <CheckCircle2 className="h-6 w-6" />
                  </span>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-foreground">Withdrawal Submitted</p>
                    <p className="text-xs text-muted-foreground">{withdrawSuccessMsg}</p>
                  </div>
                  {withdrawTxHash && (
                    <div className="p-3 bg-muted/40 rounded-lg text-xs font-mono select-all text-muted-foreground border">
                      Tx: {withdrawTxHash}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setShowWithdraw(false)}
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  {withdrawError && (
                    <div className="p-3 text-xs bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                      {withdrawError}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="wcoin">Coin</Label>
                      <select
                        id="wcoin"
                        value={withdrawCoin}
                        onChange={(e) => setWithdrawCoin(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="USDT">USDT</option>
                        <option value="ETH">ETH</option>
                        <option value="BNB">BNB</option>
                        <option value="SOL">SOL</option>
                        <option value="TRX">TRX</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="wnetwork">Network</Label>
                      <select
                        id="wnetwork"
                        value={withdrawNetwork}
                        onChange={(e) => setWithdrawNetwork(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="TRON">TRON</option>
                        <option value="ETH">Ethereum (EVM)</option>
                        <option value="BNB">BNB Chain (BSC)</option>
                        <option value="SOLANA">Solana</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wamount">Amount</Label>
                    <Input
                      id="wamount"
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-0.5">
                      <span>Estimated Network Fee:</span>
                      <span className="font-semibold text-foreground">{estimatedFee.amount} {estimatedFee.currency}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex justify-between items-center">
                      <span>Destination Address</span>
                      {addressBook.length > 0 && (
                        <select
                          className="bg-transparent border-0 text-xs text-primary font-semibold focus:ring-0 cursor-pointer"
                          onChange={(e) => {
                            if (e.target.value) {
                              // Find matching saved address
                              const saved = addressBook.find((a) => a.id === e.target.value);
                              if (saved) {
                                // Since address is masked, we prompt to use address book validation
                                // Let's set the text input directly
                                alert(
                                  `Address book entry selected. Please confirm your destination address matches the saved wallet.`,
                                );
                              }
                            }
                          }}
                        >
                          <option value="">Use saved...</option>
                          {addressBook
                            .filter((a) => a.coin === withdrawCoin && a.network === withdrawNetwork)
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.label} ({a.address})
                              </option>
                            ))}
                        </select>
                      )}
                    </Label>
                    <Input
                      id="waddress"
                      placeholder="Paste destination address"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
            {!withdrawSuccessMsg && (
              <div className="p-6 border-t flex justify-end gap-2 bg-muted/20">
                <Button variant="outline" size="sm" onClick={() => setShowWithdraw(false)}>
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  disabled={withdrawMutation.isPending || !withdrawAmount || !withdrawAddress}
                  onClick={() =>
                    withdrawMutation.mutate({
                      coin: withdrawCoin,
                      network: withdrawNetwork,
                      amount: withdrawAmount,
                      address: withdrawAddress,
                    })
                  }
                >
                  {withdrawMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing
                    </>
                  ) : (
                    'Confirm withdrawal'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Steps */}
      <Reveal>
        <section className="space-y-6">
          <SectionHeading
            align="left"
            eyebrow="How it works"
            title="How withdrawals work"
            subtitle="Three simple steps move your available balance from escrow to your own address."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {WITHDRAWAL_STEPS.map((step, i) => (
              <Card
                key={step.title}
                className="rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-2xl font-bold text-muted-foreground/40">
                      0{i + 1}
                    </span>
                  </div>
                  <CardTitle className="mt-3 font-display text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Safety */}
      <Reveal delay={80}>
        <section className="space-y-6">
          <SectionHeading
            align="left"
            eyebrow="Stay safe"
            title="Network & address safety"
            subtitle="A few habits keep every transfer secure on irreversible blockchains."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {SAFETY_TIPS.map((tip) => (
              <Card
                key={tip.title}
                className="card-glow rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
              >
                <CardContent className="space-y-3 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <tip.icon className="h-5 w-5" />
                  </span>
                  <p className="font-display font-semibold">{tip.title}</p>
                  <p className="text-sm text-muted-foreground">{tip.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>

      {/* FAQs */}
      <Reveal delay={140}>
        <section className="space-y-6">
          <SectionHeading
            align="left"
            eyebrow="FAQ"
            title="Common wallet questions"
            subtitle="Quick answers to the things people ask most before moving funds."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {WALLET_FAQS.map((item) => (
              <Card key={item.q} className="rounded-2xl border bg-card shadow-soft">
                <CardContent className="space-y-2 p-6">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="font-medium">{item.q}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
