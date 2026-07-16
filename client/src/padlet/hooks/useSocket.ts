import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function useSocket(boardId: string | undefined, handlers: Record<string, (...args: unknown[]) => void>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const { username } = useAuth();

  useEffect(() => {
    if (!boardId) return;
    const s = getSocket();
    s.emit('board:join', { boardId, username });

    const entries = Object.entries(handlersRef.current);
    entries.forEach(([event, handler]) => s.on(event, handler));

    return () => {
      s.emit('board:leave', boardId);
      entries.forEach(([event, handler]) => s.off(event, handler));
    };
  }, [boardId, username]);
}

export function useUserNotifications(
  username: string | null,
  onNotification: (n: unknown) => void
) {
  const cbRef = useRef(onNotification);
  cbRef.current = onNotification;

  useEffect(() => {
    if (!username) return;
    const s = getSocket();
    s.emit('user:join', username);
    const handler = (n: unknown) => cbRef.current(n);
    s.on('notification:new', handler);
    return () => { s.off('notification:new', handler); };
  }, [username]);
}
