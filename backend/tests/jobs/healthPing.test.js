import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getHealthPingUrl, pingHealthEndpoint, startHealthPingJob } from '../../src/jobs/healthPingJob.js';

describe('Keep-Alive Health Check Cron Job', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('URL Resolution', () => {
    it('uses HEALTH_PING_URL when explicitly set', () => {
      process.env.HEALTH_PING_URL = 'https://custom-health-ping.com/healthz';
      process.env.RENDER_EXTERNAL_URL = 'https://my-app.onrender.com';

      expect(getHealthPingUrl()).toBe('https://custom-health-ping.com/healthz');
    });

    it('uses RENDER_EXTERNAL_URL/healthz when on Render', () => {
      delete process.env.HEALTH_PING_URL;
      process.env.RENDER_EXTERNAL_URL = 'https://my-app.onrender.com';

      expect(getHealthPingUrl()).toBe('https://my-app.onrender.com/healthz');
    });

    it('falls back to local port /healthz in local environment', () => {
      delete process.env.HEALTH_PING_URL;
      delete process.env.RENDER_EXTERNAL_URL;

      expect(getHealthPingUrl()).toMatch(/http:\/\/127\.0\.0\.1:\d+\/healthz/);
    });
  });

  describe('Ping Execution', () => {
    it('returns true on HTTP 200 response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await pingHealthEndpoint('https://test-ping.com/healthz');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-ping.com/healthz',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': 'Render-Health-Pinger/1.0',
          }),
        })
      );
    });

    it('returns false and does not throw on HTTP 500 error response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await pingHealthEndpoint('https://test-ping.com/healthz');

      expect(result).toBe(false);
    });

    it('returns false and catches network timeout errors without unhandled rejection', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection timed out'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await pingHealthEndpoint('https://test-ping.com/healthz');

      expect(result).toBe(false);
    });
  });

  describe('Job Lifecycle', () => {
    it('starts and stops cleanly without hanging the event loop', () => {
      const job = startHealthPingJob('*/14 * * * *');

      expect(job).toBeDefined();
      expect(typeof job.stop).toBe('function');

      // Stop the task to ensure no running interval
      job.stop();
    });
  });
});
