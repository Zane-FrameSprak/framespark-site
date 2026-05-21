// 当前为单进程内存限流：服务重启后计数会清空。
// 多实例部署时需要替换为 Redis 或其他共享存储，避免实例之间计数不一致。
export function createDailyRateLimit(options) {
  const {
    limit,
    errorCode,
    message,
    store = new Map(),
    now = () => new Date()
  } = options;

  return function dailyRateLimit(req, res, next) {
    const clientKey = getClientKey(req);
    const dateKey = now().toISOString().slice(0, 10);
    const key = `${dateKey}:${clientKey}`;
    const currentCount = store.get(key) || 0;

    if (currentCount >= limit) {
      res.status(429).json({
        ok: false,
        error: errorCode,
        message
      });
      return;
    }

    store.set(key, currentCount + 1);
    next();
  };
}

function getClientKey(req) {
  const forwardedFor = String(req.headers?.['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';
}
