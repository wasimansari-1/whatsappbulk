import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { PRIVACY_POLICY_HTML, TERMS_OF_SERVICE_HTML, handleDataDeletion } from './routes/metaCompliance.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Security Headers (Configured to allow public compliance pages)
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

  // CORS
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id']
    })
  );

  // Structured Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
  }

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // General Rate Limiter (skip Meta webhooks)
  app.use('/api/', (req, res, next) => {
    if (req.path.includes('webhook')) {
      return next();
    }
    return apiLimiter(req, res, next);
  });

  // Public Compliance & Privacy Webpages (Accessible directly without auth)
  app.get('/privacy-policy', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(PRIVACY_POLICY_HTML);
  });
  app.get(['/terms', '/terms-of-service'], (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(TERMS_OF_SERVICE_HTML);
  });
  app.all('/data-deletion', handleDataDeletion);

  // Mount API (including /api/whatsapp/webhook and /api/v1/...)
  app.use('/api', apiRouter);

  // Static Uploads Serving for Media & Documents
  const uploadDir = path.resolve(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadDir));

  // Direct root fallback for webhooks (e.g. /whatsapp/webhook)
  app.use('/whatsapp/webhook', apiRouter);


  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

export default createApp;
