import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { sql } from 'drizzle-orm';
import { env } from './config/env.js';
import { db } from './db/client.js';
import { httpLogger } from './middleware/logger.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { providerRouter } from './modules/provider/provider.routes.js';
import { publicRouter } from './modules/public/public.routes.js';
import { leadsRouter } from './modules/leads/leads.routes.js';
import { customerRouter } from './modules/customer/customer.routes.js';

export const app = express();

// Trust proxy setup for Render / load balancers
app.set('trust proxy', env.TRUST_PROXY_HOPS);

// Security Headers
app.use(helmet());

// CORS Configuration
const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) or if origin is in allowlist
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new AppError(403, 'CORS_ERROR', 'Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Request parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Pino HTTP request logging with request ID and redaction
app.use(httpLogger);

// Health check endpoint (Render healthz)
// Trivial SELECT 1, no secrets or leaked internals
app.get('/healthz', async (req, res, next) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: 'ok' });
  } catch (_err) {
    next(new AppError(503, 'SERVICE_UNAVAILABLE', 'Database connectivity check failed'));
  }
});

// API Routers
app.use('/api', publicRouter);
app.use('/api', customerRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/provider', providerRouter);
app.use('/api/leads', leadsRouter);

// Fallback 404 handler
app.use((req, res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
});

// Centralized error handler
app.use(errorHandler);
