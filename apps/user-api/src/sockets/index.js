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

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(new Error('Server configuration error: JWT_SECRET missing'));
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', async (socket) => {
    let orgId = socket.user?.organizationId || socket.handshake.auth?.organizationId || socket.handshake.query?.organizationId;

    if (!orgId && socket.user?.userId) {
      try {
        const { User } = await import('../models/User.js');
        const user = await User.findById(socket.user.userId).lean();
        orgId = user?.currentOrganizationId;
      } catch (e) {}
    }

    if (orgId) {
      const cleanOrgId = orgId.toString();
      const orgRoom = `org:${cleanOrgId}`;
      socket.join(orgRoom);
      socket.join(cleanOrgId); // Join both with and without prefix
      console.log(`[Socket] Client ${socket.id} (User: ${socket.user?.userId}) joined room ${orgRoom}`);
    }

    if (socket.user?.userId) {
      socket.join(`user:${socket.user.userId}`);
    }

    socket.on('typing.start', (data) => {
      if (orgId && data?.contactId) {
        io.to(`org:${orgId.toString()}`).emit('conversation.typing', {
          contactId: data.contactId,
          isTyping: true,
          userId: socket.user?.userId || socket.user?._id
        });
      }
    });

    socket.on('typing.stop', (data) => {
      if (orgId && data?.contactId) {
        io.to(`org:${orgId.toString()}`).emit('conversation.typing', {
          contactId: data.contactId,
          isTyping: false,
          userId: socket.user?.userId || socket.user?._id
        });
      }
    });

    socket.on('disconnect', () => {
      // Disconnected cleanup
    });
  });

  return io;
}

export function emitToOrganization(organizationId, event, data) {
  if (!io) return;
  const cleanOrgId = organizationId ? organizationId.toString() : '';
  if (cleanOrgId) {
    io.to(`org:${cleanOrgId}`).emit(event, data);
    io.to(cleanOrgId).emit(event, data);
  }
  // Global broadcast to ensure instant live delivery across all active sessions
  io.emit(event, data);
}

export function getIO() {
  return io;
}

export default {
  initSocketServer,
  emitToOrganization,
  getIO
};
