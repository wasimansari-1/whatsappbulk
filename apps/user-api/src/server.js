import http from 'http';
import dotenv from 'dotenv';
import { createApp } from './app.js';
import { db } from './config/database.js';
import { initSocketServer } from './sockets/index.js';
import { startWorkers } from './workers/index.js';
import { backupScheduler } from './services/BackupScheduler.js';

dotenv.config();

/**
 * Validates critical security configuration before server startup
 */
function validateSecurityConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = [];

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
    errors.push('JWT_SECRET is missing or less than 32 characters in length.');
  }

  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.trim().length < 32) {
    errors.push('JWT_REFRESH_SECRET is missing or less than 32 characters in length.');
  }

  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.trim().length < 32) {
    errors.push('ENCRYPTION_KEY is missing or less than 32 characters in length.');
  }

  if (isProduction) {
    const provider = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase().trim();
    if (provider !== 'meta' && provider !== 'cloud_api') {
      errors.push(`In production (NODE_ENV=production), WHATSAPP_PROVIDER must be 'meta'. '${provider}' is forbidden.`);
    }
  }

  if (errors.length > 0) {
    console.error('================================================================');
    console.error('⛔ FATAL SECURITY CONFIGURATION ERRORS DETECTED ON STARTUP:');
    errors.forEach((err, idx) => console.error(`   ${idx + 1}. ${err}`));
    console.error('================================================================');
    throw new Error(`Fatal security startup error: ${errors.join('; ')}`);
  }
}

const port = process.env.USER_API_PORT || 5001;

async function bootstrap() {
  // 0. Strict security configuration validation
  validateSecurityConfig();

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

  // 5. Start automated database backup daemon
  try {
    backupScheduler.start();
  } catch (backupErr) {
    console.warn('[BackupScheduler] Startup warning:', backupErr.message);
  }

  // 6. Start listening
  server.listen(port, () => {
    console.log(`🚀 [User API] Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${port}`);
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('[Server] Gracefully shutting down...');
    backupScheduler.stop();
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
  process.exit(1);
});
