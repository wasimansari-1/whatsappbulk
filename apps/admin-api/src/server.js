import http from 'http';
import dotenv from 'dotenv';
import { createApp } from './app.js';
import { db } from '../../user-api/src/config/database.js';

dotenv.config();

const port = process.env.ADMIN_API_PORT || 5002;

async function bootstrap() {
  await db.connect();
  const app = createApp();
  const server = http.createServer(app);

  server.listen(port, () => {
    console.log(`🛡️ [Admin API] Server running on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Admin Server] Startup error:', err);
});
