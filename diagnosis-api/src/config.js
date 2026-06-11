import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function readNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readBoolean(name, fallback = false) {
  const value = process.env[name];
  if (value == null || value === '') return fallback;
  return value === 'true';
}

function readList(name, fallback = []) {
  const value = String(process.env[name] || '').trim();
  if (!value) return fallback;
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const defaultDataDir = path.resolve(process.cwd(), 'logs');

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: readNumber('PORT', 8788),
  host: process.env.HOST || '127.0.0.1',
  maxUploadBytes: readNumber('MAX_UPLOAD_MB', 5) * 1024 * 1024,
  maxDocxExpandedBytes: readNumber('MAX_DOCX_EXPANDED_MB', 20) * 1024 * 1024,
  minTextChars: readNumber('MIN_TEXT_CHARS', 80),
  maxTextChars: readNumber('MAX_TEXT_CHARS', 20000),
  dataDir: path.resolve(process.env.DIAGNOSIS_DATA_DIR || defaultDataDir),
  metadataRetentionDays: readNumber('DIAGNOSIS_METADATA_RETENTION_DAYS', 30),
  reviewRetentionDays: readNumber('DIAGNOSIS_REVIEW_RETENTION_DAYS', 14),
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  aiTimeoutMs: readNumber('AI_TIMEOUT_MS', 90000),
  requestTimeoutMs: readNumber('REQUEST_TIMEOUT_MS', 210000),
  enableDiagnosisV1: readBoolean('ENABLE_DIAGNOSIS_V1'),
  enableV1StagedRunner: readBoolean('ENABLE_V1_STAGED_RUNNER'),
  enableV1RealPrompts: readBoolean('ENABLE_V1_REAL_PROMPTS'),
  enableDevTools: readBoolean('ENABLE_DEV_TOOLS'),
  failClosedOnV1Error: readBoolean('FAIL_CLOSED_ON_V1_ERROR'),
  requireBetaIdentity: readBoolean('REQUIRE_BETA_IDENTITY'),
  trustedProxy: process.env.TRUST_PROXY || 'loopback',
  allowedOrigins: readList('ALLOWED_ORIGINS', ['https://framespark.cn']),
  providerCallLimitPerDiagnosis: readNumber('PROVIDER_CALL_LIMIT_PER_DIAGNOSIS', 5),
  rateLimits: {
    accountDailyLimit: readNumber('DIAGNOSIS_ACCOUNT_DAILY_LIMIT', 3),
    ipDailyLimit: readNumber('DIAGNOSIS_IP_DAILY_LIMIT', 6),
    globalDailyLimit: readNumber('DIAGNOSIS_GLOBAL_DAILY_LIMIT', 20),
    providerGlobalDailyLimit: readNumber('PROVIDER_GLOBAL_DAILY_LIMIT', 100),
    concurrencyLimit: readNumber('DIAGNOSIS_CONCURRENCY_LIMIT', 2),
    feedbackDailyLimit: readNumber('DIAGNOSIS_FEEDBACK_DAILY_LIMIT', 10)
  }
};
