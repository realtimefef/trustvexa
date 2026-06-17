'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, ExternalLink, MailOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api/client';
import { useSocket } from '@/lib/socket/socket-context';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [open, setOpen] = React.useState(false);

  // Fetch notifications using react-query
  const { data: list = [] } = useQuery({
    queryKey: ['notifications-brief'],
    queryFn: async () => {
      const res = await apiRequest<NotificationsResponse>('/notifications');
      return res.notifications || [];
    },
  });

  const unreadCount = list.filter((n) => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/notifications/${id}/read`, { method: 'POST', body: {} }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications-brief'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => apiRequest('/notifications/read-all', { method: 'POST', body: {} }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications-brief'] });
    },
  });

  // Listen to live notifications via Socket.IO
  React.useEffect(() => {
    if (!socket) return;

    const handleNotification = () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications-brief'] });
    };

    socket.on('notification', handleNotification);
    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('notification:new', handleNotification);
    };
  }, [socket, queryClient]);

  // Handle outside click to close dropdown
  const bellRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="relative" ref={bellRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative hover:bg-muted"
        aria-label="Toggle notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 z-50 w-80 scale-95 origin-top-right animate-fade-up rounded-2xl border bg-card p-4 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between border-b pb-2 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Notifications ({unreadCount})
            </h4>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-[10px] font-semibold text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {list.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
              <MailOpen className="h-5 w-5 text-muted-foreground/40" />
              <span>All caught up!</span>
            </div>
          ) : (
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {list.slice(0, 5).map((n) => (
                <li
                  key={n.id}
                  className={`p-2 rounded-xl border transition-colors flex items-start gap-2 ${
                    n.read ? 'bg-card/40 border-border/40' : 'bg-primary/[0.03] border-primary/20'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {n.title || 'Notification'}
                    </p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-normal">
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markReadMutation.mutate(n.id)}
                      className="text-primary hover:text-foreground p-0.5 rounded-md hover:bg-muted"
                      title="Mark read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="border-t pt-2 mt-3 flex justify-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              See all notifications <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
