import { app } from './app.js';
import { env } from './config/env.js';
import { pool, db } from './db/client.js';
import { logger } from './middleware/logger.js';
import { sql } from 'drizzle-orm';

async function startServer() {
  // Startup check: verify database connection
  try {
    await db.execute(sql`SELECT 1`);
    logger.info('Database connection established successfully.');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database during startup.');
    process.exit(1);
  }

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(
      {
        port: env.PORT,
        nodeEnv: env.NODE_ENV,
      },
      `Server listening on 0.0.0.0:${env.PORT}`
    );
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await pool.end();
        logger.info('Database pool drained.');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during database pool shutdown.');
        process.exit(1);
      }
    });

    // Force close if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
