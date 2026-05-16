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
  maxTextChars: readNumber('MAX_TEXT_CHARS', 80000)
};
