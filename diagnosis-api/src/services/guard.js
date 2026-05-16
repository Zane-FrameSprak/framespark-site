import { config } from '../config.js';
import { ApiError } from '../utils/errors.js';

export function validateScriptText(text, materialType) {
  const stats = getTextStats(text);

  if (!stats.charCount) {
    throw new ApiError(400, 'FILE_EMPTY', '文件内容为空，请上传可读取的剧本或故事材料。');
  }

  if (stats.charCount < config.minTextChars) {
    throw new ApiError(
      400,
      'FILE_TOO_SHORT',
      `当前文本约 ${stats.charCount} 字，内容过短，暂时无法形成有效诊断。`
    );
  }

  if (stats.charCount > config.maxTextChars) {
    throw new ApiError(
      400,
      'FILE_TOO_LONG',
      `当前文本约 ${stats.charCount} 字，超过第一版 MVP 支持范围，请先拆分材料。`
    );
  }

  return {
    materialType,
    stats
  };
}

function getTextStats(text) {
  const withoutWhitespace = text.replace(/\s/g, '');
  const lines = text.split('\n').filter((line) => line.trim());

  return {
    charCount: withoutWhitespace.length,
    lineCount: lines.length
  };
}
