import express from 'express';
import { pathToFileURL } from 'url';
import { config } from './config.js';
import { createMinuteRateLimit } from './middleware/rateLimit.js';
import { eventsRouter } from './routes/events.js';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: config.jsonBodyLimit, strict: true }));

  app.get('/health', (req, res) => {
    res.json({
      ok: true,
      service: 'analytics-api',
      timestamp: new Date().toISOString()
    });
  });

  app.use(
    '/api/analytics',
    createMinuteRateLimit({ limit: config.rateLimitPerMinute }),
    eventsRouter
  );

  app.use((req, res) => {
    res.status(404).json({
      ok: false,
      error: 'NOT_FOUND',
      message: '接口不存在。'
    });
  });

  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') {
      res.status(413).json({
        ok: false,
        error: 'BODY_TOO_LARGE',
        message: '请求体过大。'
      });
      return;
    }

    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({
        ok: false,
        error: 'INVALID_JSON',
        message: '请求体不是合法 JSON。'
      });
      return;
    }

    console.error(err);
    res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: '访问事件暂时无法保存。'
    });
  });

  return app;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = createApp();
  app.listen(config.port, config.host, () => {
    console.log(`FrameSpark analytics API listening on http://${config.host}:${config.port}`);
  });
}
