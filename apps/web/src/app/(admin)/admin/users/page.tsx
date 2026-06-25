'use client';

/**
 * Middleman User Management panel.
 *
 * Allows the middleman to:
 *   - Search / list all users with filters (status, account label)
 *   - View user detail (deal count, trust level, account status)
 *   - Block / unblock users with a required reason
 *   - Apply account labels (new_user, good_standing, trusted, high_risk)
 *   - Downgrade trust with a reason
 *   - See user's active deals inline
 */
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  CheckCircle2,
  Search,
  ShieldCheck,
  Trash2,
  TrendingDown,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError, apiRequest, newIdempotencyKey } from '@/lib/api/client';

interface UserSearchResult {
  id: string;
  username: string;
  accountStatus: string;
  accountLabel: string;
  trustLevel: number;
  dealsCount: number;
  createdAt: string;
}

interface AdminSearchResponse {
  users: UserSearchResult[];
  total: number;
}

const STATUS_BADGE: Record<string, 'default' | 'destructive' | 'warning' | 'success' | 'secondary' | 'outline'> = {
  active: 'success',
  blocked: 'destructive',
  deleted: 'destructive',
  suspended: 'warning',
};

const ACCOUNT_LABELS = [
  'new_user',
  'good_standing',
  'trusted',
  'high_risk',
  'middleman_verified',
] as const;

type EnforceAction = 'block' | 'unblock' | 'label' | 'trust-downgrade' | 'delete';

interface EnforceDialog {
  userId: string;
  username: string;
  action: EnforceAction;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [dialog, setDialog] = React.useState<EnforceDialog | null>(null);
  const [reason, setReason] = React.useState('');
  const [label, setLabel] = React.useState<string>('good_standing');
  const [trustAmount, setTrustAmount] = React.useState(1);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['admin-users', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      return apiRequest<AdminSearchResponse>(`/admin/users?${params.toString()}`);
    },
  });

  const enforceMutation = useMutation({
    mutationFn: async (input: { userId: string; action: EnforceAction }) => {
      const body: Record<string, unknown> = { reason };
      if (input.action === 'label') body.label = label;
      if (input.action === 'trust-downgrade') body.amount = trustAmount;
      // Delete uses HTTP DELETE; everything else uses POST
      if (input.action === 'delete') {
        return apiRequest(`/admin/users/${input.userId}`, {
          method: 'DELETE',
          body,
          idempotencyKey: newIdempotencyKey(),
        });
      }
      return apiRequest(`/admin/users/${input.userId}/${input.action}`, {
        method: 'POST',
        body,
        idempotencyKey: newIdempotencyKey(),
      });
    },
    onSuccess: () => {
      setDialog(null);
      setReason('');
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e) => setActionError(e instanceof ApiError ? e.message : 'Action failed'),
  });

  const users = usersQuery.data?.users ?? [];
  const total = usersQuery.data?.total ?? 0;

  const openDialog = (user: UserSearchResult, action: EnforceAction) => {
    setReason('');
    setActionError(null);
    setDialog({ userId: user.id, username: user.username, action });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search, review, and take enforcement actions on platform accounts.
        </p>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] space-y-1">
            <Label htmlFor="user-search" className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="user-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Username or user ID…"
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="w-full sm:w-auto space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-full sm:w-32">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">All statuses</SelectItem>
                <SelectItem value="active" className="text-xs">Active</SelectItem>
                <SelectItem value="blocked" className="text-xs">Blocked</SelectItem>
                <SelectItem value="suspended" className="text-xs">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground ml-auto self-end">
            {total} user{total !== 1 ? 's' : ''} found
          </p>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card className="rounded-2xl shadow-soft overflow-hidden">
        <CardContent className="p-0">
          {usersQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : usersQuery.isError ? (
            <p className="p-4 text-sm text-destructive">Failed to load users.</p>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="h-7 w-7 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No users match the search.</p>
            </div>
          ) : (
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Trust</TableHead>
                  <TableHead>Deals</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{user.username}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{user.id.slice(0, 12)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[user.accountStatus] ?? 'secondary'}>
                        {user.accountStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{user.accountLabel.replace(/_/g, ' ')}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 w-3 rounded-full ${i < user.trustLevel ? 'bg-primary' : 'bg-muted'}`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">{user.trustLevel}/5</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.dealsCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.accountStatus === 'deleted' ? (
                        <span className="text-xs text-muted-foreground italic">deleted · permanent</span>
                      ) : (
                      <div className="flex justify-end gap-1">
                        {user.accountStatus === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openDialog(user, 'block')}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            onClick={() => openDialog(user, 'unblock')}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => openDialog(user, 'label')}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                          onClick={() => openDialog(user, 'trust-downgrade')}
                        >
                          <TrendingDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive hover:bg-destructive/10"
                          title="Delete account"
                          onClick={() => openDialog(user, 'delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action dialog */}
      <Dialog open={dialog !== null} onOpenChange={(open: boolean) => { if (!open) { setDialog(null); setActionError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialog?.action === 'block' && <><UserX className="h-4 w-4 text-destructive" /> Block user</>}
              {dialog?.action === 'unblock' && <><UserCheck className="h-4 w-4 text-emerald-500" /> Unblock user</>}
              {dialog?.action === 'label' && <><ShieldCheck className="h-4 w-4 text-primary" /> Set account label</>}
              {dialog?.action === 'trust-downgrade' && <><TrendingDown className="h-4 w-4 text-amber-500" /> Downgrade trust</>}
              {dialog?.action === 'delete' && <><Trash2 className="h-4 w-4 text-destructive" /> Delete account</>}
            </DialogTitle>
            <DialogDescription>
              Action on <strong>@{dialog?.username}</strong>. A reason is required for all enforcement actions.
              {dialog?.action === 'delete' && (
                <span className="block mt-1 text-destructive font-medium">
                  ⚠ This permanently marks the account as deleted. This cannot be undone.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {actionError && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{actionError}</AlertDescription>
              </Alert>
            )}

            {dialog?.action === 'label' && (
              <div className="space-y-1.5">
                <Label className="text-sm">Account label</Label>
                <Select value={label} onValueChange={setLabel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_LABELS.map((l) => (
                      <SelectItem key={l} value={l}>{l.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dialog?.action === 'trust-downgrade' && (
              <div className="space-y-1.5">
                <Label className="text-sm">Downgrade amount (1–5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={trustAmount}
                  onChange={(e) => setTrustAmount(Number(e.target.value))}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="enforcement-reason" className="text-sm">
                Reason <span className="text-muted-foreground">(required)</span>
              </Label>
              <Textarea
                id="enforcement-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a clear reason for this action…"
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button
                variant={dialog?.action === 'block' || dialog?.action === 'delete' ? 'destructive' : 'default'}
                disabled={!reason.trim() || enforceMutation.isPending}
                onClick={() => {
                  if (dialog) enforceMutation.mutate({ userId: dialog.userId, action: dialog.action });
                }}
              >
                {enforceMutation.isPending ? 'Applying…' : dialog?.action === 'delete' ? '⚠ Delete permanently' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
