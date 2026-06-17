'use client';

import * as React from 'react';
import { Smile, Trash2, Edit3, Reply, Forward } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ChatAttachment {
  id: string;
  kind: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  senderId: string | null;
  senderName?: string;
  body: string | null;
  isEdited: boolean;
  deletedForUsers: boolean;
  createdAt: string;
  replyToId?: string | null;
  replyToBody?: string | null;
  reactions?: Reaction[];
  attachments?: ChatAttachment[];
}

interface MessageBubbleProps {
  message: ChatMessage;
  onReact?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, newBody: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: ChatMessage) => void;
  onForward?: (message: ChatMessage) => void;
  className?: string;
}

const EMOJIS = ['👍', '❤️', '🔥', '👏', '😮', '😢'];

export function MessageBubble({
  message,
  onReact,
  onEdit,
  onDelete,
  onReply,
  onForward,
  className,
}: MessageBubbleProps) {
  const { user } = useAuth();
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editBody, setEditBody] = React.useState(message.body ?? '');

  const isMine = message.senderId !== null && message.senderId === user?.id;

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editBody.trim() && editBody !== message.body) {
      onEdit?.(message.id, editBody);
    }
    setIsEditing(false);
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={cn(
        'group relative flex flex-col max-w-[75%] space-y-1',
        isMine ? 'self-end items-end' : 'self-start items-start',
        className,
      )}
    >
      {/* Sender Header */}
      {!isMine && (
        <span className="text-[10px] font-semibold text-muted-foreground ml-1">
          {message.senderName ??
            (message.senderId ? `User ${message.senderId.slice(0, 6)}` : 'System')}
        </span>
      )}

      {/* Quote Context */}
      {message.replyToBody && (
        <div
          className={cn(
            'rounded-t-2xl border-l-4 border-primary/40 bg-muted/40 p-2 text-xs text-muted-foreground select-none max-w-full truncate',
            isMine ? 'rounded-r-2xl' : 'rounded-l-2xl',
          )}
        >
          <span className="font-semibold block text-[10px]">Replying to:</span>
          {message.replyToBody}
        </div>
      )}

      {/* Message Bubble Container */}
      <div
        className={cn(
          'relative rounded-2xl border px-4 py-2.5 text-sm shadow-soft transition-all duration-300',
          message.replyToBody ? 'rounded-t-none' : '',
          isMine
            ? 'bg-brand-gradient text-white border-transparent rounded-tr-none'
            : 'bg-card text-foreground border-border/60 rounded-tl-none',
        )}
      >
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="flex gap-2 min-w-[15rem]">
            <input
              type="text"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="flex-1 bg-transparent border-b border-white/50 text-inherit focus:outline-none focus:border-white text-sm"
              autoFocus
            />
            <button type="submit" className="text-xs font-bold hover:underline">
              Save
            </button>
            <button
              type="button"
              className="text-xs opacity-70 hover:underline"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          </form>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed select-text">
            {message.deletedForUsers
              ? 'This message was deleted by a user'
              : (message.body ?? '\u2014')}
          </p>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2.5 space-y-2">
            {message.attachments.map((att) => {
              if (att.kind === 'voice') {
                return (
                  <div
                    key={att.id}
                    className="rounded-xl bg-muted/30 p-2 border border-border/20 flex flex-col gap-1.5 min-w-[14rem]"
                  >
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      🎙️ Voice Note
                    </span>
                    <audio src={att.url} controls className="w-full h-8 outline-none" />
                  </div>
                );
              }
              if (att.kind === 'image') {
                return (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block max-w-[16rem] overflow-hidden rounded-xl border border-border/20"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.url}
                      alt="Shared image"
                      className="h-auto w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                );
              }
              if (att.kind === 'video') {
                return (
                  <video
                    key={att.id}
                    src={att.url}
                    controls
                    className="max-w-[18rem] rounded-xl border border-border/20 outline-none"
                  />
                );
              }
              return (
                <div key={att.id} className="text-xs">
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-primary hover:text-primary/80 font-medium"
                  >
                    View attachment ({att.kind})
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {/* Message Footer inside Bubble */}
        <div
          className={cn(
            'flex items-center gap-1.5 mt-1.5 text-[9px]',
            isMine ? 'text-white/60 justify-end' : 'text-muted-foreground justify-start',
          )}
        >
          <span>{formattedTime}</span>
          {message.isEdited && <span>· Edited</span>}
          {message.deletedForUsers && <span className="text-red-500 font-semibold">· Deleted</span>}
        </div>

        {/* Message Actions Menu (appears on hover) */}
        {!message.deletedForUsers && !isEditing && (
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1 items-center bg-card/90 border border-border/40 backdrop-blur rounded-lg p-1 shadow transition-all duration-200 z-10',
              isMine ? 'right-full mr-2' : 'left-full ml-2',
            )}
          >
            {onReply && (
              <button
                onClick={() => onReply(message)}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                title="Reply"
              >
                <Reply className="h-3.5 w-3.5" />
              </button>
            )}
            {onForward && (
              <button
                onClick={() => onForward(message)}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                title="Forward message"
              >
                <Forward className="h-3.5 w-3.5" />
              </button>
            )}
            {onReact && (
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                  title="React"
                >
                  <Smile className="h-3.5 w-3.5" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full mb-1 z-50 flex gap-1 bg-card border border-border/40 p-1.5 rounded-lg shadow-md animate-fade-up">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onReact(message.id, emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="hover:scale-125 transition-transform text-sm"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {isMine && onEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                title="Edit message"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}
            {isMine && onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-destructive rounded"
                title="Delete message"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Render Active Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {message.reactions.map((r, i) => (
            <button
              key={i}
              onClick={() => onReact?.(message.id, r.emoji)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] border transition-colors',
                user && r.users.includes(user.id)
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'bg-muted/40 border-border/40 text-muted-foreground',
              )}
            >
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
