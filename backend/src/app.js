import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
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
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Serve static assets from frontend build BEFORE api cors/auth middleware
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// CORS Configuration with Same-Origin & Render domain awareness
const configuredOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);

const isAllowedOrigin = (origin, req) => {
  if (!origin) return true;
  if (configuredOrigins.includes('*') || configuredOrigins.includes(origin)) return true;

  // Same-origin check: requests originating from the app itself
  if (req && req.headers?.host) {
    try {
      const parsed = new URL(origin);
      if (parsed.host === req.headers.host) {
        return true;
      }
    } catch {}
  }

  // Also check RENDER_EXTERNAL_URL if set
  if (process.env.RENDER_EXTERNAL_URL) {
    try {
      const renderHost = new URL(process.env.RENDER_EXTERNAL_URL).host;
      const parsed = new URL(origin);
      if (parsed.host === renderHost) {
        return true;
      }
    } catch {}
  }

  return false;
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin, req)) {
    return cors({
      origin: origin || true,
      credentials: true,
    })(req, res, next);
  }
  return next(new AppError(403, 'CORS_ERROR', 'Not allowed by CORS'));
});

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

// SPA client-side routing fallback for non-API GET requests
if (fs.existsSync(frontendDistPath)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/healthz') {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Fallback 404 handler
app.use((req, res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
});

// Centralized error handler
app.use(errorHandler);
