import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { ApiError } from '../utils/errors.js';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_MIME = 'application/pdf';
const TEXT_MIME_PREFIX = 'text/';
const MIN_PDF_TEXT_CHARS = 20;

export async function parseDevUploadedFile(file) {
  const originalName = file.originalname || '';
  const lowerName = originalName.toLowerCase();

  if (lowerName.endsWith('.txt') || file.mimetype.startsWith(TEXT_MIME_PREFIX)) {
    const text = normalizeText(file.buffer.toString('utf8'));
    return {
      source: {
        filename: originalName,
        type: 'txt',
        extractedTextLength: text.length
      },
      text
    };
  }

  if (lowerName.endsWith('.docx') || file.mimetype === DOCX_MIME) {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      const text = normalizeText(result.value || '');
      return {
        source: {
          filename: originalName,
          type: 'docx',
          extractedTextLength: text.length
        },
        text
      };
    } catch (err) {
      throw new ApiError(400, 'FILE_PARSE_FAILED', '无法读取 Word 文件内容，请确认文件未损坏。');
    }
  }

  if (lowerName.endsWith('.pdf') || file.mimetype === PDF_MIME) {
    return parsePdfFile(file);
  }

  throw new ApiError(400, 'UNSUPPORTED_FILE_TYPE', '当前内部评测工具仅支持 .txt、.docx 和文本型 .pdf 文件。');
}

async function parsePdfFile(file) {
  let parser;
  try {
    parser = new PDFParse({ data: file.buffer });
    const result = await parser.getText();
    const text = normalizeText(result.text || '');
    if (text.length < MIN_PDF_TEXT_CHARS) {
      throw new ApiError(400, 'PDF_TEXT_EMPTY', '该 PDF 可能是扫描版或图片版，当前内部评测工具暂不支持 OCR。');
    }
    return {
      source: {
        filename: file.originalname || '',
        type: 'pdf',
        extractedTextLength: text.length
      },
      text
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, 'PDF_PARSE_FAILED', 'PDF 解析失败，请确认文件为可复制文字的文本型 PDF。');
  } finally {
    await parser?.destroy();
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
