import http from 'http';
import dotenv from 'dotenv';
import { createApp } from './app.js';
import { db } from './config/database.js';
import { initSocketServer } from './sockets/index.js';
import { startWorkers } from './workers/index.js';

dotenv.config();

const port = process.env.USER_API_PORT || 5001;

async function bootstrap() {
  // 1. Connect to MongoDB
  await db.connect();

  // 2. Create Express app & HTTP server
  const app = createApp();
  const server = http.createServer(app);

  // 3. Initialize Socket.IO
  initSocketServer(server);

  // 4. Start BullMQ background workers
  try {
    startWorkers();
  } catch (workerErr) {
    console.warn('[Workers] Worker startup warning (Redis might be offline locally):', workerErr.message);
  }

  // 5. Start listening
  server.listen(port, () => {
    console.log(`🚀 [User API] Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${port}`);
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('[Server] Gracefully shutting down...');
    server.close(async () => {
      await db.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
});
