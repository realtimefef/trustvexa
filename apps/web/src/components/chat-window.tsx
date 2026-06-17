'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Send, X, MessageSquare, ImagePlus, Loader2, Lock } from 'lucide-react';
import { useSocket, MessageNewEvent, TypingEvent, parseMessageNewEvent, parseTypingEvent } from '@/lib/socket/socket-context';
import { useAuth } from '@/lib/auth/auth-context';
import { apiRequest, getAccessToken, newIdempotencyKey } from '@/lib/api/client';
import { MessageBubble, ChatMessage } from '@/components/message-bubble';
import { PresenceDot } from '@/components/presence-dot';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ChatWindowProps {
  chatId: string;
  dealId: string;
  chatType: string;
  opponentId: string | null;
  opponentName?: string;
  className?: string;
}

export function ChatWindow({
  chatId,
  dealId: _dealId,
  chatType: _chatType,
  opponentId,
  opponentName = 'Counterparty',
  className,
}: ChatWindowProps) {
  const { user } = useAuth();
  const { socket, joinChat, sendMessage, startTyping, stopTyping, markRead } = useSocket();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSearch, setShowSearch] = React.useState(false);

  const [inputVal, setInputVal] = React.useState('');
  const [replyTo, setReplyTo] = React.useState<ChatMessage | null>(null);

  // Mention autocomplete
  const [showMentions, setShowMentions] = React.useState(false);
  const mentionsList = ['@buyer', '@seller', '@middleman'];

  // Fetch initial messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat-messages', chatId],
    queryFn: async () => {
      const res = await apiRequest<{ messages: ChatMessage[] }>(`/chats/${chatId}/messages?limit=50`);
      return res.messages;
    },
    refetchOnWindowFocus: false,
  });

  const [hasMore, setHasMore] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  React.useEffect(() => {
    setHasMore(true);
  }, [chatId]);

  const loadEarlierMessages = async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;
    setIsLoadingMore(true);
    const oldestMsg = messages[0];
    if (!oldestMsg) {
      setIsLoadingMore(false);
      return;
    }
    try {
      const res = await apiRequest<{ messages: ChatMessage[] }>(
        `/chats/${chatId}/messages?limit=50&before=${encodeURIComponent(oldestMsg.createdAt)}`
      );
      if (res.messages.length < 50) {
        setHasMore(false);
      }
      queryClient.setQueryData<ChatMessage[]>(['chat-messages', chatId], (old = []) => {
        const filteredNew = res.messages.filter((newM) => !old.some((m) => m.id === newM.id));
        return [...filteredNew, ...old];
      });
    } catch (err) {
      console.error('Failed to load earlier messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch pinned messages
  const { data: pinnedMessages = [] } = useQuery({
    queryKey: ['chat-pins', chatId],
    queryFn: async () => {
      const res = await apiRequest<{ messages: ChatMessage[] }>(`/chats/${chatId}/pins`);
      return res.messages;
    },
    refetchOnWindowFocus: false,
  });

  // Fetch active chats for message forwarding picker
  const { data: activeChats = [] } = useQuery({
    queryKey: ['chats-list'],
    queryFn: async () => {
      const res = await apiRequest<{ chats: { id: string; dealId: string; chatType: string }[] }>('/chats');
      return res.chats;
    },
    refetchOnWindowFocus: false,
  });

  // Forwarding state
  const [forwardingMessage, setForwardingMessage] = React.useState<ChatMessage | null>(null);

  const realOpponentId = React.useMemo(() => {
    if (opponentId && opponentId.length > 8) return opponentId;
    const found = messages.find((m) => m.senderId && m.senderId !== user?.id);
    return found?.senderId || null;
  }, [opponentId, messages, user?.id]);

  // Typing state
  const [typingUsers, setTypingUsers] = React.useState<string[]>([]);
  const typingTimeoutRef = React.useRef<Record<string, NodeJS.Timeout>>({});

  // Composer state: closed-chat guard + attachment upload
  const [chatClosed, setChatClosed] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Proactively detect if the chat is already closed so the composer shows
  // read-only before the user tries to send and hits a 409.
  const { data: chatMeta } = useQuery({
    queryKey: ['chat-meta', chatId],
    queryFn: async () => {
      const res = await apiRequest<{ chats: Array<{ id: string; status: string }> }>('/chats');
      return res.chats.find((c) => c.id === chatId) ?? null;
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
  React.useEffect(() => {
    if (chatMeta?.status === 'closed') {
      setChatClosed(true);
    }
  }, [chatMeta?.status]);

  const listRef = React.useRef<HTMLOListElement>(null);

  // Join Socket.IO room on mount / chatId change
  React.useEffect(() => {
    let active = true;
    void (async () => {
      if (socket) {
        const ok = await joinChat(chatId);
        if (ok && active) {
          // Joined successfully
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [chatId, socket, joinChat]);

  // Load draft autosave
  React.useEffect(() => {
    const saved = localStorage.getItem(`chat_draft_${chatId}`);
    if (saved) {
      setInputVal(saved);
    } else {
      setInputVal('');
    }
  }, [chatId]);

  // Save draft autosave
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    localStorage.setItem(`chat_draft_${chatId}`, val);

    // Emit typing indicator
    if (val.trim()) {
      startTyping(chatId);
    } else {
      stopTyping(chatId);
    }

    // Check for @ mention trigger
    const words = val.split(' ');
    const lastWord = words[words.length - 1];
    if (lastWord?.startsWith('@')) {
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // Listen to live realtime socket events
  React.useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (event: MessageNewEvent) => {
      const payload = parseMessageNewEvent(event);
      if (!payload) return; // drop malformed payloads
      if (payload.chatId === chatId) {
        // Optimistically update query client cache
        queryClient.setQueryData<ChatMessage[]>(['chat-messages', chatId], (old = []) => {
          // Prevent duplicates
          if (old.some((m) => m.id === payload.at.toString())) return old;
          const newMsg: ChatMessage = {
            id: payload.at.toString(),
            senderId: payload.senderId,
            senderName: payload.senderId === realOpponentId ? opponentName : 'You',
            body: payload.body,
            isEdited: false,
            deletedForUsers: false,
            createdAt: new Date(payload.at).toISOString(),
          };
          return [...old, newMsg];
        });

        // Mark read receipt
        markRead(chatId, payload.at.toString());
      }
    };

    const handleTyping = (event: TypingEvent) => {
      const typingPayload = parseTypingEvent(event);
      if (!typingPayload) return; // drop malformed payloads
      if (typingPayload.chatId === chatId) {
        const typistId = typingPayload.userId;
        if (typingPayload.typing) {
          setTypingUsers((prev) => (prev.includes(typistId) ? prev : [...prev, typistId]));
          // Auto clear after 4s idle
          if (typingTimeoutRef.current[typistId]) {
            clearTimeout(typingTimeoutRef.current[typistId]);
          }
          typingTimeoutRef.current[typistId] = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((id) => id !== typistId));
          }, 4000);
        } else {
          setTypingUsers((prev) => prev.filter((id) => id !== typistId));
          if (typingTimeoutRef.current[typistId]) {
            clearTimeout(typingTimeoutRef.current[typistId]);
          }
        }
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing', handleTyping);
    };
  }, [socket, chatId, queryClient, opponentId, opponentName, markRead]);

  // Send message handler
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputVal.trim() && !replyTo) return;

    const body = inputVal;
    setInputVal('');
    localStorage.removeItem(`chat_draft_${chatId}`);
    stopTyping(chatId);
    setReplyTo(null);

    // Save temporary local message in query cache
    const tempId = Date.now().toString();
    const newMsg: ChatMessage = {
      id: tempId,
      senderId: user?.id ?? null,
      senderName: 'You',
      body,
      isEdited: false,
      deletedForUsers: false,
      createdAt: new Date().toISOString(),
      replyToBody: replyTo?.body ?? null,
    };

    queryClient.setQueryData<ChatMessage[]>(['chat-messages', chatId], (old = []) => [
      ...old,
      newMsg,
    ]);

    try {
      // API request to persist it
      await apiRequest(`/chats/${chatId}/messages`, {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
        body: {
          body,
          reply_to: replyTo?.id ?? null,
        },
      });

      // WebSocket message:send (CLIENT_EVENTS.sendMessage)
      await sendMessage(chatId, body);
    } catch (err) {
      // Roll back the optimistic message and surface the error to the user.
      queryClient.setQueryData<ChatMessage[]>(['chat-messages', chatId], (old = []) =>
        old.filter((m) => m.id !== tempId),
      );
      const msg = err instanceof Error ? err.message : String(err);
      if (/not open|closed|read-only|read only/i.test(msg)) {
        // Chat was closed/archived — switch composer to read-only and restore the draft.
        setChatClosed(true);
        setInputVal(body);
      }
      console.error('Failed to send message:', err);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    // Optimistically update emoji in UI cache
    queryClient.setQueryData<ChatMessage[]>(['chat-messages', chatId], (old = []) => {
      return old.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = m.reactions || [];
        const hitIdx = reactions.findIndex((r) => r.emoji === emoji);
        const myId = user?.id ?? 'me';

        let nextReactions = [...reactions];
        if (hitIdx >= 0) {
          const r = reactions[hitIdx];
          if (r) {
            const hasUser = r.users.includes(myId);
            if (hasUser) {
              // Remove user reaction
              const nextUsers = r.users.filter((u) => u !== myId);
              if (nextUsers.length === 0) {
                nextReactions = reactions.filter((r) => r.emoji !== emoji);
              } else {
                nextReactions[hitIdx] = { emoji: r.emoji, count: r.count - 1, users: nextUsers };
              }
            } else {
              // Add user reaction
              nextReactions[hitIdx] = {
                emoji: r.emoji,
                count: r.count + 1,
                users: [...r.users, myId],
              };
            }
          }
        } else {
          // Create new emoji reaction
          nextReactions.push({ emoji, count: 1, users: [myId] });
        }
        return { ...m, reactions: nextReactions };
      });
    });

    try {
      await apiRequest(`/chats/${chatId}/react/${messageId}`, {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
        body: { emoji },
      });
    } catch (err) {
      console.error('Failed to save reaction:', err);
      // Roll back the optimistic reaction by re-fetching
      void queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
    }
  };

  const handleEdit = async (messageId: string, newBody: string) => {
    queryClient.setQueryData<ChatMessage[]>(['chat-messages', chatId], (old = []) => {
      return old.map((m) => (m.id === messageId ? { ...m, body: newBody, isEdited: true } : m));
    });
    try {
      await apiRequest(`/chats/${chatId}/messages/${messageId}`, {
        method: 'PATCH',
        body: { body: newBody },
      });
    } catch (err) {
      console.error('Failed to save edit:', err);
      void queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
    }
  };

  const handleDelete = async (messageId: string) => {
    queryClient.setQueryData<ChatMessage[]>(['chat-messages', chatId], (old = []) => {
      return old.map((m) => (m.id === messageId ? { ...m, deletedForUsers: true } : m));
    });
    try {
      await apiRequest(`/chats/${chatId}/messages/${messageId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete message:', err);
      void queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
    }
  };

  // Autocomplete mention select
  const selectMention = (mention: string) => {
    const words = inputVal.split(' ');
    words[words.length - 1] = mention + ' ';
    setInputVal(words.join(' '));
    setShowMentions(false);
  };

  // Image / short-video attachment upload
  const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB cap for images / short clips

  const handleFilePick = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again re-triggers change.
    e.target.value = '';
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setUploadError('Only images and short videos can be sent.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('File is too large (max 25MB).');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/storage/upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': file.type,
            Authorization: `Bearer ${getAccessToken()}`,
          },
          body: file,
        },
      );

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const data = (await uploadRes.json()) as {
        file_key: string;
        size_bytes: number;
        mime_type: string;
      };

      await apiRequest(`/chats/${chatId}/messages`, {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
        body: {
          body: null,
          attachments: [
            {
              kind: isVideo ? 'video' : 'image',
              file_key: data.file_key,
              mime_type: data.mime_type,
              size_bytes: data.size_bytes,
            },
          ],
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
      await sendMessage(chatId, isVideo ? '[📹 Video]' : '[🖼️ Image]');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/not open|closed|read-only|read only/i.test(msg)) {
        setChatClosed(true);
      }
      setUploadError('Could not send attachment. Please try again.');
      console.error('Failed to upload or send attachment:', err);
    } finally {
      setUploading(false);
    }
  };

  // Search filtering
  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    return m.body?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div
      className={`flex flex-col h-[32rem] rounded-2xl border bg-card/60 backdrop-blur-xl shadow-glow overflow-hidden ${className}`}
    >
      {/* Chat Header */}
      <header className="flex items-center justify-between px-5 py-3.5 border-b bg-card/40 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">{opponentName}</h3>
            {realOpponentId && <PresenceDot userId={realOpponentId} initialOnline={false} />}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Inline Search Bar */}
      {showSearch && (
        <div className="px-5 py-2 border-b bg-muted/20 flex gap-2 items-center">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 h-8 text-xs bg-transparent border-none focus-visible:ring-0 px-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && (
        <div className="bg-primary/5 border-b border-primary/10 px-5 py-2 flex items-center justify-between gap-3 text-xs animate-fadeIn shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold text-primary uppercase shrink-0 font-display">
              📌 Pinned:
            </span>
            <span className="text-muted-foreground truncate">
              {pinnedMessages[0]?.body || 'Attachment'}
            </span>
          </div>
          {pinnedMessages.length > 1 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0 font-medium">
              +{pinnedMessages.length - 1} more
            </span>
          )}
        </div>
      )}

      {/* Message Timeline */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-muted-foreground">Loading message history…</span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              {searchQuery ? 'No messages match search.' : 'No messages in this chat yet.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {hasMore && (
              <div className="flex justify-center pb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoadingMore}
                  onClick={loadEarlierMessages}
                  className="text-[10px] h-7 px-3 border-border/40 hover:bg-muted text-muted-foreground"
                >
                  {isLoadingMore ? 'Loading earlier messages...' : 'Load earlier messages'}
                </Button>
              </div>
            )}
            <ol className="flex flex-col gap-3" ref={listRef}>
              {filteredMessages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onReact={handleReact}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReply={(m) => setReplyTo(m)}
                  onForward={(m) => setForwardingMessage(m)}
                />
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Typists indicators */}
      {typingUsers.length > 0 && (
        <div className="px-5 py-1 text-[10px] text-muted-foreground italic bg-muted/10">
          Someone is typing…
        </div>
      )}

      {/* Autocomplete mention dropdown */}
      {showMentions && (
        <div className="mx-5 mb-2 bg-card border rounded-xl shadow-md p-1.5 flex flex-col gap-1 z-20">
          {mentionsList.map((m) => (
            <button
              key={m}
              onClick={() => selectMention(m)}
              className="text-left text-xs font-semibold px-2 py-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Reply quotation banner */}
      {replyTo && (
        <div className="mx-5 mb-2 bg-primary/[0.04] border border-primary/20 rounded-xl p-3 flex justify-between gap-3 items-start animate-fade-up">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] font-bold text-primary">Replying to message</p>
            <p className="text-xs text-muted-foreground truncate leading-normal">{replyTo.body}</p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-muted-foreground/50 hover:text-foreground shrink-0 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload error toast */}
      {uploadError && (
        <div className="mx-5 mb-2 flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="shrink-0 hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Chat Input form OR read-only closed banner */}
      {chatClosed ? (
        <div className="p-4 border-t bg-muted/30 backdrop-blur-md flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          This conversation is closed. It is now read-only.
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className="p-4 border-t bg-card/40 backdrop-blur-md flex gap-2 items-center"
        >
          {/* Hidden file input for image / short video */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,video/mp4"
            onChange={handleFileChange}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleFilePick}
            disabled={uploading}
            className="h-9 w-9 shrink-0 hover:bg-muted border-border/40"
            title="Send an image or short video"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </Button>

          <Input
            type="text"
            placeholder="Type a secure message..."
            value={inputVal}
            onChange={handleInputChange}
            className="flex-1 h-9 text-xs bg-muted/40 border-border/40 focus-visible:ring-primary/20"
          />

          <Button
            type="submit"
            variant="gradient"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={!inputVal.trim() && !replyTo}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}

      {/* Forward Chat Picker Modal */}
      {forwardingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-glow animate-fadeIn">
            <h3 className="font-display text-base font-bold text-foreground mb-1">
              Forward Message
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Select a conversation to forward this message to.
            </p>

            <div className="max-h-60 overflow-y-auto divide-y border rounded-xl bg-muted/15">
              {activeChats.filter((c) => c.id !== chatId).length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No other active chats found.
                </div>
              ) : (
                activeChats
                  .filter((c) => c.id !== chatId)
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={async () => {
                        try {
                          await apiRequest(`/chats/${c.id}/forward/${forwardingMessage.id}`, {
                            method: 'POST',
                            idempotencyKey: newIdempotencyKey(),
                            body: { sourceChatId: chatId },
                          });
                          setForwardingMessage(null);
                        } catch (err) {
                          console.error('Failed to forward message:', err);
                        }
                      }}
                      className="w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold block text-foreground">
                          {c.chatType
                            ? c.chatType.replace(/_/g, ' ').toUpperCase()
                            : 'Conversation'}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Deal ID: {c.dealId.slice(0, 8)}...
                        </span>
                      </div>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        Select
                      </span>
                    </button>
                  ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setForwardingMessage(null)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
