import * as React from 'react';
import { useSocket } from '@/lib/socket/socket-context';

export function useDealRoom(dealId: string) {
  const { socket, isConnected } = useSocket();

  React.useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('deal:join', { dealId });

    return () => {
      socket.emit('deal:leave', { dealId });
    };
  }, [socket, isConnected, dealId]);

  return { socket, isConnected };
}
