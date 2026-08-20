import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket Auth & Tenant Room Join Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_enterprise_whatsapp_saas_2026_production_grade');
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const orgId = socket.user?.organizationId;
    if (orgId) {
      const orgRoom = `org:${orgId}`;
      socket.join(orgRoom);
      console.log(`[Socket] Client ${socket.id} joined room ${orgRoom}`);
    }

    socket.on('disconnect', () => {
      // Disconnected cleanup
    });
  });

  return io;
}

export function emitToOrganization(organizationId, event, data) {
  if (!io) return;
  const orgRoom = `org:${organizationId}`;
  io.to(orgRoom).emit(event, data);
}

export function getIO() {
  return io;
}

export default {
  initSocketServer,
  emitToOrganization,
  getIO
};
