import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requireWaslaUser } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import businessRoutes from './routes/business.routes.js';

export function createApp() {
  const app = express();

  // Render بينهي TLS ويبعت http للسيرفر
  if (env.trustProxy) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(express.json());
  app.use('/api', cors({ origin: env.clientOrigins }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/businesses', requireWaslaUser, businessRoutes);

  app.use(errorHandler);

  return app;
}
