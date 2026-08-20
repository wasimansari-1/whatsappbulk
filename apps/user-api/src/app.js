import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

export function createApp() {
  const app = express();

  // Security Headers
  app.use(helmet());

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

  // General Rate Limiter
  app.use('/api/', apiLimiter);

  // Mount API
  app.use('/api', apiRouter);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

export default createApp;
