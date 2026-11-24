import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Returns the existing socket or creates a new one connected with the
 * current auth token from the Zustand store.
 */
export function getSocket(): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  const { accessToken } = useAuthStore.getState();

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: {
      token: accessToken,
    },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  return socket;
}

/**
 * Disconnects and destroys the current socket instance.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket] Disconnected and cleared.');
  }
}

/**
 * Join a named room on the server.
 */
export function joinRoom(room: string): void {
  const s = getSocket();
  s.emit('join_room', { room });
  console.log('[Socket] Joined room:', room);
}

/**
 * Leave a named room on the server.
 */
export function leaveRoom(room: string): void {
  if (socket) {
    socket.emit('leave_room', { room });
    console.log('[Socket] Left room:', room);
  }
}
