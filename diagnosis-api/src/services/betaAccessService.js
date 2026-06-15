import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../utils/errors.js';

export const PAGE_COOKIE = '__Secure-fs_beta_page';
export const API_COOKIE = '__Secure-fs_beta_api';
export const BETA_IDENTITY_HEADER = 'X-Framespark-Beta-User';

export function createBetaAccessService(options) {
  const store = options.store;
  const settings = options.settings;
  const now = options.now || (() => new Date());
  const random = options.randomBytes || randomBytes;
  assertKey(settings.codeHmacKey, 'BETA_ACCESS_CODE_HMAC_KEY');
  assertKey(settings.sessionHmacKey, 'BETA_ACCESS_SESSION_HMAC_KEY');
  if (safeEqual(settings.codeHmacKey, settings.sessionHmacKey)) {
    throw new Error('BETA_ACCESS_HMAC_KEYS_MUST_DIFFER');
  }

  return {
    async verifyCode(input) {
      const rawCode = typeof input.code === 'string' ? input.code : '';
      const normalized = rawCode.trim();
      const ipHash = consumeVerificationAttempt(store, settings, input.clientIp, now());

      if (!normalized || normalized.length > settings.maxCodeChars) {
        recordInvalid(store, ipHash, settings.verifyLimits.cooldownMs);
        throw invalidAccessError();
      }

      const pageToken = random(32).toString('base64url');
      const apiToken = random(32).toString('base64url');
      const issuedAt = now();
      const expiresAt = new Date(issuedAt.getTime() + settings.sessionTtlMs);
      const result = store.issueSessions({
        codeHash: hmac(settings.codeHmacKey, `code:${normalized}`),
        now: issuedAt,
        sessions: [
          { scope: 'page', tokenHash: hmac(settings.sessionHmacKey, `session:${pageToken}`), expiresAt },
          { scope: 'api', tokenHash: hmac(settings.sessionHmacKey, `session:${apiToken}`), expiresAt }
        ]
      });

      if (!result.ok) {
        recordInvalid(store, ipHash, settings.verifyLimits.cooldownMs);
        throw invalidAccessError();
      }

      store.clearVerificationCooldown(ipHash);
      store.recordAudit({
        identityId: result.identityId,
        subjectHash: ipHash,
        event: 'session_issued',
        status: 'success',
        createdAt: issuedAt
      });
      return {
        identityId: result.identityId,
        expiresAt,
        cookies: [
          serializeCookie(PAGE_COOKIE, pageToken, '/diagnosis/beta/', expiresAt, settings.sessionTtlMs, settings.cookieSecure),
          serializeCookie(API_COOKIE, apiToken, '/api/diagnosis/', expiresAt, settings.sessionTtlMs, settings.cookieSecure)
        ]
      };
    },

    rejectInvalidInput(clientIp) {
      const ipHash = consumeVerificationAttempt(store, settings, clientIp, now());
      recordInvalid(store, ipHash, settings.verifyLimits.cooldownMs);
      throw invalidAccessError();
    },

    validateRequest(input) {
      const route = classifyProtectedUri(input.originalUri);
      if (!route) return null;
      const cookies = parseCookies(input.cookieHeader);
      const token = cookies[route.cookieName];
      if (!token || token.length > 128) return null;
      return store.validateSession({
        tokenHash: hmac(settings.sessionHmacKey, `session:${token}`),
        scope: route.scope,
        now: now()
      });
    },

    createCodes(input = {}) {
      const count = positiveInteger(input.count || 1, 'count');
      if (count > 100) throw new Error('BETA_ACCESS_CREATE_COUNT_TOO_LARGE');
      const expiresDays = positiveInteger(input.expiresDays || settings.defaultExpiresDays, 'expiresDays');
      const maxUses = positiveInteger(input.maxUses || settings.defaultMaxUses, 'maxUses');
      const createdAt = now();
      const expiresAt = new Date(createdAt.getTime() + expiresDays * 24 * 60 * 60 * 1000);
      const output = [];
      for (let index = 0; index < count; index += 1) {
        const code = `fsb_${random(24).toString('base64url')}`;
        const record = store.createCode({
          id: randomUUID(),
          codeHash: hmac(settings.codeHmacKey, `code:${code}`),
          label: input.labelPrefix ? `${input.labelPrefix}-${String(index + 1).padStart(3, '0')}` : null,
          expiresAt,
          maxUses,
          createdAt
        });
        output.push({ code, record });
      }
      return output;
    },

    hashCode(code) {
      return hmac(settings.codeHmacKey, `code:${String(code).trim()}`);
    }
  };
}

function consumeVerificationAttempt(store, settings, clientIp, timestamp) {
  const ipHash = hmac(settings.codeHmacKey, `ip:${clientIp || 'unknown'}`);
  const permit = store.acquireVerificationPermit({
    ipHash,
    limits: settings.verifyLimits,
    now: timestamp
  });
  if (!permit.allowed) throw new ApiError(429, 'BETA_ACCESS_RATE_LIMITED', 'verification limited');
  return ipHash;
}

export function betaIdentityForCode(identityId) {
  return `beta-code-${identityId}`;
}

function recordInvalid(store, ipHash, cooldownMs) {
  store.recordVerificationFailure(ipHash, cooldownMs);
  store.recordAudit({ subjectHash: ipHash, event: 'verify_failed', status: 'invalid' });
}

function classifyProtectedUri(uri) {
  const value = String(uri || '').split('?')[0];
  if (value === '/diagnosis/beta/' || value === '/diagnosis/beta/app.js' || value === '/diagnosis/beta/beta.css') {
    return { scope: 'page', cookieName: PAGE_COOKIE };
  }
  if (value === '/api/diagnosis/') return { scope: 'api', cookieName: API_COOKIE };
  return null;
}

function serializeCookie(name, value, cookiePath, expiresAt, ttlMs, secure) {
  const fields = [
    `${name}=${value}`,
    `Path=${cookiePath}`,
    `Max-Age=${Math.floor(ttlMs / 1000)}`,
    `Expires=${expiresAt.toUTCString()}`,
    'HttpOnly',
    'SameSite=Strict'
  ];
  if (secure) fields.push('Secure');
  return fields.join('; ');
}

function parseCookies(header) {
  const result = Object.create(null);
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name && value) result[name] = value;
  }
  return result;
}

function hmac(key, value) {
  return createHmac('sha256', key).update(value).digest('hex');
}

function assertKey(value, name) {
  if (Buffer.byteLength(String(value || ''), 'utf8') < 32) throw new Error(`${name}_TOO_SHORT`);
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function positiveInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`BETA_ACCESS_INVALID_${name.toUpperCase()}`);
  return number;
}

function invalidAccessError() {
  return new ApiError(401, 'BETA_ACCESS_INVALID', 'invalid beta access code');
}
