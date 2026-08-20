import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRouter from './routes/index.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    })
  );

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', apiRouter);

  return app;
}

export default createApp;
