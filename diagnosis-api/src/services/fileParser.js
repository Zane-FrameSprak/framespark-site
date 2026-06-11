import mammoth from 'mammoth';
import { TextDecoder } from 'util';
import { config } from '../config.js';
import { ApiError } from '../utils/errors.js';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const TXT_MIMES = new Set(['text/plain', 'application/octet-stream']);
const DOCX_MIMES = new Set([DOCX_MIME, 'application/octet-stream']);
const ZIP_SIGNATURES = new Set([0x04034b50, 0x06054b50, 0x08074b50]);
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

export async function parseUploadedFile(file) {
  const originalName = file.originalname || '';
  const lowerName = originalName.toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();

  if (lowerName.endsWith('.txt')) {
    if (!TXT_MIMES.has(mime)) {
      throw new ApiError(400, 'FILE_TYPE_MISMATCH', 'TXT 文件扩展名与浏览器报告的文件类型不一致。');
    }
    const text = decodeUtf8(file.buffer);
    if (looksBinary(text)) {
      throw new ApiError(400, 'FILE_CONTENT_INVALID', 'TXT 文件包含无法安全识别的二进制内容。');
    }
    return {
      source: {
        type: 'txt'
      },
      text: normalizeText(text)
    };
  }

  if (lowerName.endsWith('.docx')) {
    if (!DOCX_MIMES.has(mime)) {
      throw new ApiError(400, 'FILE_TYPE_MISMATCH', 'DOCX 文件扩展名与浏览器报告的文件类型不一致。');
    }
    validateDocxArchive(file.buffer);
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      const text = normalizeText(result.value || '');
      if (text.replace(/\s/g, '').length > config.maxTextChars) {
        throw new ApiError(413, 'TEXT_TOO_LONG', `材料最多支持 ${config.maxTextChars} 字。`);
      }
      return {
        source: {
          type: 'docx'
        },
        text
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(400, 'FILE_PARSE_FAILED', '无法读取 Word 文件内容，请确认文件未损坏。');
    }
  }

  throw new ApiError(400, 'UNSUPPORTED_FILE_TYPE', '当前 MVP 仅支持 .txt 和 .docx 文件。');
}

function decodeUtf8(buffer) {
  try {
    return UTF8_DECODER.decode(buffer);
  } catch {
    throw new ApiError(400, 'FILE_ENCODING_INVALID', 'TXT 文件必须使用 UTF-8 编码。');
  }
}

function looksBinary(text) {
  if (text.includes('\u0000')) return true;
  const sample = text.slice(0, 4096);
  if (!sample) return false;
  let controls = 0;
  for (const char of sample) {
    const code = char.charCodeAt(0);
    if (code < 32 && !['\n', '\r', '\t'].includes(char)) controls += 1;
  }
  return controls / sample.length > 0.02;
}

function validateDocxArchive(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4 || !ZIP_SIGNATURES.has(buffer.readUInt32LE(0))) {
    throw new ApiError(400, 'FILE_CONTENT_INVALID', 'DOCX 文件不是有效的 Office 文档。');
  }

  let offset = 0;
  let entries = 0;
  let expandedBytes = 0;
  while (offset + 46 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x02014b50) {
      offset += 1;
      continue;
    }

    const flags = buffer.readUInt16LE(offset + 8);
    if ((flags & 0x1) !== 0) {
      throw new ApiError(400, 'FILE_CONTENT_INVALID', '不支持加密 DOCX 文件。');
    }

    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    entries += 1;
    expandedBytes += uncompressedSize;
    if (entries > 1000 || expandedBytes > config.maxDocxExpandedBytes) {
      throw new ApiError(413, 'DOCX_EXPANSION_LIMIT', 'DOCX 文件解压后内容过大。');
    }
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  if (entries === 0) {
    throw new ApiError(400, 'FILE_CONTENT_INVALID', 'DOCX 文件目录结构无效。');
  }
}

function normalizeText(text) {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}
