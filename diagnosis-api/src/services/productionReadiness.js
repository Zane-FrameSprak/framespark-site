import path from 'path';
import { config } from '../config.js';
import { ApiError } from '../utils/errors.js';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

export function getProductionReadiness(current = config) {
  const errors = [];

  if (!current.deepseekApiKey) errors.push('DEEPSEEK_API_KEY_MISSING');
  if (!current.enableDiagnosisV1) errors.push('ENABLE_DIAGNOSIS_V1_REQUIRED');
  if (!current.enableV1StagedRunner) errors.push('ENABLE_V1_STAGED_RUNNER_REQUIRED');
  if (!current.enableV1RealPrompts) errors.push('ENABLE_V1_REAL_PROMPTS_REQUIRED');
  if (current.enableDevTools) errors.push('ENABLE_DEV_TOOLS_MUST_BE_FALSE');
  if (!current.failClosedOnV1Error) errors.push('FAIL_CLOSED_ON_V1_ERROR_REQUIRED');
  if (!current.requireBetaIdentity) errors.push('REQUIRE_BETA_IDENTITY_REQUIRED');
  if (!LOOPBACK_HOSTS.has(current.host)) errors.push('HOST_MUST_BE_LOOPBACK');
  if (Number(current.port) !== 8788) errors.push('PORT_MUST_BE_8788');
  if (current.trustedProxy !== 'loopback') errors.push('TRUST_PROXY_MUST_BE_LOOPBACK');
  if (!path.isAbsolute(current.dataDir)) errors.push('DATA_DIR_MUST_BE_ABSOLUTE');
  if (current.dataDir === '/tmp' || current.dataDir.includes(`${path.sep}tmp${path.sep}`)) {
    errors.push('DATA_DIR_MUST_NOT_USE_TMP');
  }
  if (current.dataDir !== '/var/lib/framespark-diagnosis') {
    errors.push('DATA_DIR_MUST_USE_PRODUCTION_PATH');
  }
  if (Number(current.maxUploadBytes) > 5 * 1024 * 1024) errors.push('MAX_UPLOAD_MUST_NOT_EXCEED_5MB');
  if (Number(current.maxTextChars) > 20000) errors.push('MAX_TEXT_CHARS_MUST_NOT_EXCEED_20000');
  if (Number(current.metadataRetentionDays) > 30) errors.push('METADATA_RETENTION_MUST_NOT_EXCEED_30_DAYS');
  if (Number(current.reviewRetentionDays) > 14) errors.push('REVIEW_RETENTION_MUST_NOT_EXCEED_14_DAYS');
  if (Number(current.requestTimeoutMs) > 210000) errors.push('REQUEST_TIMEOUT_MUST_NOT_EXCEED_210_SECONDS');
  if (Number(current.providerCallLimitPerDiagnosis) > 5) errors.push('PROVIDER_CALL_LIMIT_MUST_NOT_EXCEED_5');
  if (Number(current.rateLimits?.concurrencyLimit) > 2) errors.push('CONCURRENCY_LIMIT_MUST_NOT_EXCEED_2');
  if (
    !Array.isArray(current.allowedOrigins) ||
    current.allowedOrigins.length !== 1 ||
    current.allowedOrigins[0] !== 'https://framespark.cn'
  ) {
    errors.push('FRAMESPARK_ORIGIN_REQUIRED');
  }

  if (current.enableBetaCodeAccess) {
    const beta = current.betaAccess || {};
    if (!path.isAbsolute(beta.dbPath || '')) errors.push('BETA_ACCESS_DB_PATH_MUST_BE_ABSOLUTE');
    if (!String(beta.dbPath || '').startsWith(`${current.dataDir}${path.sep}`)) {
      errors.push('BETA_ACCESS_DB_PATH_MUST_BE_INSIDE_DATA_DIR');
    }
    if (Buffer.byteLength(String(beta.codeHmacKey || ''), 'utf8') < 32) {
      errors.push('BETA_ACCESS_CODE_HMAC_KEY_TOO_SHORT');
    }
    if (Buffer.byteLength(String(beta.sessionHmacKey || ''), 'utf8') < 32) {
      errors.push('BETA_ACCESS_SESSION_HMAC_KEY_TOO_SHORT');
    }
    if (beta.codeHmacKey && beta.codeHmacKey === beta.sessionHmacKey) {
      errors.push('BETA_ACCESS_HMAC_KEYS_MUST_DIFFER');
    }
    if (beta.cookieSecure !== true) errors.push('BETA_ACCESS_COOKIE_MUST_BE_SECURE');
    if (Number(beta.sessionTtlMs) !== 24 * 60 * 60 * 1000) {
      errors.push('BETA_ACCESS_SESSION_TTL_MUST_BE_24_HOURS');
    }
    if (Number(beta.defaultExpiresDays) <= 0 || Number(beta.defaultExpiresDays) > 7) {
      errors.push('BETA_ACCESS_DEFAULT_EXPIRY_MUST_NOT_EXCEED_7_DAYS');
    }
    if (Number(beta.defaultMaxUses) <= 0 || Number(beta.defaultMaxUses) > 5) {
      errors.push('BETA_ACCESS_DEFAULT_MAX_USES_MUST_NOT_EXCEED_5');
    }
    if (Number(beta.maxCodeChars) <= 0 || Number(beta.maxCodeChars) > 256) {
      errors.push('BETA_ACCESS_CODE_MAX_CHARS_MUST_NOT_EXCEED_256');
    }
    if (String(beta.originalUriHeader || '').toLowerCase() !== 'x-framespark-original-uri') {
      errors.push('BETA_ACCESS_ORIGINAL_URI_HEADER_INVALID');
    }
    if (Number(beta.auditRetentionDays) <= 0 || Number(beta.auditRetentionDays) > 30) {
      errors.push('BETA_ACCESS_AUDIT_RETENTION_MUST_NOT_EXCEED_30_DAYS');
    }
    const limits = beta.verifyLimits || {};
    if (!positiveAtMost(limits.windowMs, 15 * 60 * 1000)) errors.push('BETA_ACCESS_VERIFY_WINDOW_MUST_NOT_EXCEED_15_MINUTES');
    if (!positiveAtMost(limits.ipWindowLimit, 5)) errors.push('BETA_ACCESS_IP_WINDOW_LIMIT_MUST_NOT_EXCEED_5');
    if (!positiveAtMost(limits.ipDailyLimit, 20)) errors.push('BETA_ACCESS_IP_DAILY_LIMIT_MUST_NOT_EXCEED_20');
    if (!positiveAtMost(limits.globalWindowLimit, 30)) errors.push('BETA_ACCESS_GLOBAL_WINDOW_LIMIT_MUST_NOT_EXCEED_30');
    if (!positiveAtMost(limits.globalDailyLimit, 100)) errors.push('BETA_ACCESS_GLOBAL_DAILY_LIMIT_MUST_NOT_EXCEED_100');
    if (!Number.isFinite(Number(limits.cooldownMs)) || Number(limits.cooldownMs) < 2000) {
      errors.push('BETA_ACCESS_COOLDOWN_MUST_BE_AT_LEAST_2_SECONDS');
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

function positiveAtMost(value, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= maximum;
}

export function assertProductionReady(current = config) {
  const readiness = getProductionReadiness(current);
  if (!readiness.ok) {
    throw new ApiError(
      503,
      'PRODUCTION_CONFIG_INVALID',
      `Diagnosis API production config is invalid: ${readiness.errors.join(', ')}`
    );
  }
  return readiness;
}
