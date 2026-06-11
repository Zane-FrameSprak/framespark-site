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

  return {
    ok: errors.length === 0,
    errors
  };
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
