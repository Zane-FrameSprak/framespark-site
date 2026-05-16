import mammoth from 'mammoth';
import { ApiError } from '../utils/errors.js';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const TEXT_MIME_PREFIX = 'text/';

export async function parseUploadedFile(file) {
  const originalName = file.originalname || '';
  const lowerName = originalName.toLowerCase();

  if (lowerName.endsWith('.txt') || file.mimetype.startsWith(TEXT_MIME_PREFIX)) {
    return {
      source: {
        filename: originalName,
        type: 'txt'
      },
      text: normalizeText(file.buffer.toString('utf8'))
    };
  }

  if (lowerName.endsWith('.docx') || file.mimetype === DOCX_MIME) {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return {
        source: {
          filename: originalName,
          type: 'docx'
        },
        text: normalizeText(result.value || '')
      };
    } catch (err) {
      throw new ApiError(400, 'FILE_PARSE_FAILED', '无法读取 Word 文件内容，请确认文件未损坏。');
    }
  }

  throw new ApiError(400, 'UNSUPPORTED_FILE_TYPE', '当前 MVP 仅支持 .txt 和 .docx 文件。');
}

function normalizeText(text) {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}
