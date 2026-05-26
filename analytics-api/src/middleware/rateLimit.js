// v1 单进程内存限流：服务重启后计数会清空。
// 多实例部署时应替换为 Redis、Nginx limit_req 或其他共享限流。
export function createMinuteRateLimit(options) {
  const {
    limit,
    store = new Map(),
    now = () => new Date()
  } = options;

  return function minuteRateLimit(req, res, next) {
    const clientKey = getClientKey(req);
    const minuteKey = now().toISOString().slice(0, 16);
    const key = `${minuteKey}:${clientKey}`;
    const current = store.get(key) || 0;

    if (current >= limit) {
      res.status(429).json({
        ok: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: '访问事件提交过于频繁，请稍后再试。'
      });
      return;
    }

    store.set(key, current + 1);
    next();
  };
}

function getClientKey(req) {
  const forwardedFor = String(req.headers?.['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';
}
