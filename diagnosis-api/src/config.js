import dotenv from 'dotenv';

dotenv.config();

function readNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const config = {
  port: readNumber('PORT', 8787),
  host: process.env.HOST || '127.0.0.1',
  maxUploadBytes: readNumber('MAX_UPLOAD_MB', 10) * 1024 * 1024,
  minTextChars: readNumber('MIN_TEXT_CHARS', 800),
  maxTextChars: readNumber('MAX_TEXT_CHARS', 80000),
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  aiTimeoutMs: readNumber('AI_TIMEOUT_MS', 90000),
  enableDiagnosisV1: process.env.ENABLE_DIAGNOSIS_V1 === 'true',
  enableDevTools: process.env.ENABLE_DEV_TOOLS === 'true',
  rateLimits: {
    diagnosisDailyLimit: readNumber('DIAGNOSIS_DAILY_LIMIT', 10),
    feedbackDailyLimit: readNumber('DIAGNOSIS_FEEDBACK_DAILY_LIMIT', 30)
  }
};
