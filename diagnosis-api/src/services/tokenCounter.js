import { get_encoding } from 'tiktoken';
import { config } from '../config.js';
import { ApiError } from '../utils/errors.js';

const encoding = get_encoding('cl100k_base');

export function countInputTokens(text) {
  return encoding.encode(String(text || '')).length;
}

export function validateInputTokenLimit(text, options = {}) {
  const maxInputTokens = Number.isFinite(options.maxInputTokens) && options.maxInputTokens > 0
    ? options.maxInputTokens
    : config.maxInputTokens;
  const tokenCount = countInputTokens(text);

  if (tokenCount > maxInputTokens) {
    throw new ApiError(
      413,
      'TEXT_TOO_LONG',
      `当前材料约 ${tokenCount} tokens，超过当前公测支持的 ${maxInputTokens} tokens 上限，请删减或拆分后再提交。`
    );
  }

  return { tokenCount, maxInputTokens };
}
