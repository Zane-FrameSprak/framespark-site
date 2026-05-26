function readNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const config = {
  host: process.env.ANALYTICS_HOST || '127.0.0.1',
  port: readNumber('ANALYTICS_PORT', 8787),
  dataDir: process.env.ANALYTICS_DATA_DIR || '/home/ubuntu/framespark-analytics',
  jsonBodyLimit: process.env.ANALYTICS_BODY_LIMIT || '20kb',
  eventSizeLimitBytes: readNumber('ANALYTICS_EVENT_SIZE_BYTES', 20 * 1024),
  rateLimitPerMinute: readNumber('ANALYTICS_RATE_LIMIT_PER_MINUTE', 120)
};
