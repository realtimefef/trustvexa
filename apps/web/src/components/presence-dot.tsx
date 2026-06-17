'use client';

import * as React from 'react';
import { useSocket } from '@/lib/socket/socket-context';
import { cn } from '@/lib/utils';

interface PresenceDotProps {
  userId: string;
  initialOnline?: boolean;
  initialLastSeen?: string;
  hideText?: boolean;
  className?: string;
}

export function PresenceDot({
  userId,
  initialOnline = false,
  initialLastSeen,
  hideText = false,
  className,
}: PresenceDotProps) {
  const { socket } = useSocket();
  const [isOnline, setIsOnline] = React.useState(initialOnline);
  const [lastSeen, setLastSeen] = React.useState<string | undefined>(initialLastSeen);

  React.useEffect(() => {
    setIsOnline(initialOnline);
    setLastSeen(initialLastSeen);
  }, [initialOnline, initialLastSeen]);

  React.useEffect(() => {
    if (!socket) return;

    const handlePresence = (data: { userId: string; online: boolean; lastSeenAt?: string }) => {
      if (data.userId === userId) {
        setIsOnline(data.online);
        if (data.lastSeenAt) {
          setLastSeen(data.lastSeenAt);
        }
      }
    };

    socket.on('presence', handlePresence);
    socket.on('presence:update', handlePresence);

    return () => {
      socket.off('presence', handlePresence);
      socket.off('presence:update', handlePresence);
    };
  }, [socket, userId]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="relative flex h-2.5 w-2.5">
        {isOnline && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full h-2.5 w-2.5 transition-colors',
            isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/35',
          )}
        />
      </span>
      {!hideText && (
        <span className="text-[10px] text-muted-foreground font-semibold">
          {isOnline
            ? 'Online'
            : lastSeen
              ? `Last seen ${new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Offline'}
        </span>
      )}
    </div>
  );
}
