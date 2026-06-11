import { config } from '../config.js';

const BETA_HEADER = 'x-framespark-beta-user';

export const requireBetaIdentity = createBetaIdentityGuard();

export function createBetaIdentityGuard(required = config.requireBetaIdentity) {
  return function betaIdentityGuard(req, res, next) {
    if (!required) {
      req.betaIdentity = 'local-development';
      next();
      return;
    }

    const identity = sanitizeIdentity(req.get(BETA_HEADER));
    if (!identity) {
      res.status(401).json({
        ok: false,
        error: {
          code: 'BETA_ACCESS_REQUIRED',
          message: '当前诊断仅对受邀内测用户开放。'
        }
      });
      return;
    }

    req.betaIdentity = identity;
    next();
  };
}

export function createOriginGuard(allowedOrigins = config.allowedOrigins) {
  const allowed = new Set(allowedOrigins);

  return function originGuard(req, res, next) {
    const origin = String(req.get('origin') || '').trim();
    if (!origin || allowed.has(origin)) {
      next();
      return;
    }

    res.status(403).json({
      ok: false,
      error: {
        code: 'ORIGIN_NOT_ALLOWED',
        message: '当前请求来源不允许使用诊断内测。'
      }
    });
  };
}

function sanitizeIdentity(value) {
  const identity = String(value || '').trim();
  if (!identity || identity.length > 80) return '';
  if (!/^[A-Za-z0-9._@-]+$/.test(identity)) return '';
  return identity;
}
