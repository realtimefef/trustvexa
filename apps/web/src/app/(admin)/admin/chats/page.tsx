'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MessageSquare,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  Calendar,
  Layers,
  User,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

interface AdminChat {
  id: string;
  dealId: string;
  type: string;
  status: string;
  createdAt: string;
  buyerId: string | null;
  sellerId: string | null;
  middlemanId: string | null;
}

interface ChatListResponse {
  chats: AdminChat[];
}

export default function AdminChatsPage() {
  const router = useRouter();
  const { status } = useAuth();
  const queryClient = useQueryClient();

  // Moderation state
  const [selectedChat, setSelectedChat] = React.useState<AdminChat | null>(null);
  const [deleteReason, setDeleteReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login?next=/admin/chats');
    }
  }, [status, router]);

  // Fetch chats for moderation
  const chatsQuery = useQuery({
    queryKey: ['admin-chats'],
    enabled: status === 'authenticated',
    queryFn: async () => {
      const res = await apiRequest<ChatListResponse>('/admin/chats');
      return res.chats;
    },
  });

  const handleDeleteOpen = (chat: AdminChat) => {
    setSelectedChat(chat);
    setDeleteReason('');
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !deleteReason.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const key = `delete-chat-${selectedChat.id}-${Date.now()}`;

    try {
      await apiRequest(`/admin/chats/${selectedChat.id}`, {
        method: 'DELETE',
        idempotencyKey: key,
        body: {
          reason: deleteReason,
        },
      });

      setSelectedChat(null);
      setDeleteReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
    } catch (err) {
      console.error('Failed to delete chat:', err);
      alert('Failed to delete the chat. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const chats = chatsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin" className="hover:underline flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Console
          </Link>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
          <ShieldAlert className="h-7 w-7 text-primary" /> Chat Moderation
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor active conversations, inspect participant details, and disable/delete chats.
        </p>
      </header>

      <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-soft overflow-hidden">
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Active Chats List
          </CardTitle>
          <CardDescription>
            Audit all deal chats registered on the platform. All modifications are ledger-logged.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {chatsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : chatsQuery.isError ? (
            <div className="text-center py-10 space-y-2">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm font-semibold">Failed to load chats</p>
              <p className="text-xs text-muted-foreground">Please check your permissions and try again.</p>
            </div>
          ) : chats.length === 0 ? (
            <p className="text-center py-12 text-sm text-muted-foreground">No active chats found.</p>
          ) : (
            <div className="space-y-4">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`p-5 border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                    chat.status === 'deleted_by_admin'
                      ? 'bg-destructive/[0.02] border-destructive/20'
                      : 'bg-card/40 hover:bg-card/80 border-border/40'
                  }`}
                >
                  <div className="space-y-3 flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground break-all min-w-0">
                        Chat: {chat.id}
                      </span>
                      <Badge variant={chat.status === 'deleted_by_admin' ? 'destructive' : 'success'} className="text-[10px]">
                        {chat.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {chat.type.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate min-w-0">
                        <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        <span className="font-mono truncate">Deal ID: {chat.dealId}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate min-w-0">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        <span>Created: {new Date(chat.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate min-w-0">
                        <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        <span className="truncate">
                          Parties: B({chat.buyerId?.slice(0, 4) || '—'}) / S({chat.sellerId?.slice(0, 4) || '—'})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {chat.status !== 'deleted_by_admin' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteOpen(chat)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete / Block
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete/Moderation Confirmation Modal */}
      {selectedChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-glow animate-fadeIn">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" /> Delete & Block Chat Room
              </CardTitle>
              <CardDescription>
                This action is irreversible and blocks all future messages. Provide the operational reason.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-lg border text-xs text-muted-foreground space-y-1">
                <p>
                  <span className="font-semibold text-foreground">Chat ID:</span> {selectedChat.id}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Deal ID:</span> {selectedChat.dealId}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Moderation reason
                </label>
                <Textarea
                  placeholder="Explain the reasoning (e.g. fraudulent activities, compromise, harassment)..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="text-xs min-h-[100px]"
                  required
                />
                <p className="text-[10px] text-muted-foreground leading-normal">
                  All moderation events are securely hash-chained and logged to the compliance ledger.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedChat(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={isSubmitting || !deleteReason.trim()}
                >
                  {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
