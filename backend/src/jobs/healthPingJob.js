import cron from 'node-cron';
import { logger } from '../middleware/logger.js';
import { env } from '../config/env.js';

export function getHealthPingUrl() {
  if (process.env.HEALTH_PING_URL) {
    return process.env.HEALTH_PING_URL;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return `${process.env.RENDER_EXTERNAL_URL}/healthz`;
  }
  return `http://127.0.0.1:${env.PORT}/healthz`;
}

export async function pingHealthEndpoint(targetUrl = getHealthPingUrl()) {
  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Render-Health-Pinger/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      logger.info({ status: res.status, url: targetUrl }, 'Keep-alive health ping successful');
      return true;
    } else {
      logger.warn({ status: res.status, url: targetUrl }, 'Keep-alive health ping returned non-200');
      return false;
    }
  } catch (err) {
    logger.warn({ err: err.message, url: targetUrl }, 'Keep-alive health ping request failed');
    return false;
  }
}

export function startHealthPingJob(cronExpression = '*/14 * * * *') {
  const targetUrl = getHealthPingUrl();
  logger.info({ schedule: cronExpression, targetUrl }, 'Initializing 14-minute health check keep-alive cron job');

  const task = cron.schedule(cronExpression, async () => {
    await pingHealthEndpoint(targetUrl);
  });

  return {
    task,
    stop: () => {
      task.stop();
      logger.info('Keep-alive health ping cron job stopped');
    },
  };
}
