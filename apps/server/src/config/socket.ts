import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

export let io: SocketIOServer;

interface AccessTokenPayload {
  userId: string;
  role: string;
  societyId: string;
}

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      return next(new Error('Server misconfiguration'));
    }

    try {
      const payload = jwt.verify(token, secret) as AccessTokenPayload;
      socket.data.userId = payload.userId;
      socket.data.societyId = payload.societyId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, societyId } = socket.data as { userId: string; societyId: string };

    socket.join(`society:${societyId}`);
    socket.join(`user:${userId}`);

    console.info(`[SOCKET] User ${userId} connected (society: ${societyId})`);

    socket.on('disconnect', (reason) => {
      console.info(`[SOCKET] User ${userId} disconnected: ${reason}`);
    });
  });

  return io;
}
