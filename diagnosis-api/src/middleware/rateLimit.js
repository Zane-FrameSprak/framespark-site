// 当前为单进程内存限流：服务重启后计数会清空。
// 多实例部署时需要替换为 Redis 或其他共享存储，避免实例之间计数不一致。
export function createDailyRateLimit(options) {
  const {
    limit,
    errorCode,
    message,
    store = new Map(),
    now = () => new Date(),
    keyFn = getClientIpKey
  } = options;

  return function dailyRateLimit(req, res, next) {
    const clientKey = keyFn(req);
    const dateKey = now().toISOString().slice(0, 10);
    const key = `${dateKey}:${clientKey}`;
    const currentCount = store.get(key) || 0;

    if (currentCount >= limit) {
      res.status(429).json({
        ok: false,
        error: {
          code: errorCode,
          message
        }
      });
      return;
    }

    store.set(key, currentCount + 1);
    next();
  };
}

export function createConcurrencyLimit(options = {}) {
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? options.limit : 2;
  let active = 0;

  return function concurrencyLimit(req, res, next) {
    if (active >= limit) {
      res.status(503).json({
        ok: false,
        error: {
          code: 'SERVICE_BUSY',
          message: '当前公测请求较多，请稍后再试。'
        }
      });
      return;
    }

    active += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active = Math.max(0, active - 1);
    };
    res.once('finish', release);
    res.once('close', release);
    next();
  };
}

export function getClientIpKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function getBetaIdentityKey(req) {
  return req.betaIdentity || 'anonymous';
}

export function getGlobalKey() {
  return 'global';
}
