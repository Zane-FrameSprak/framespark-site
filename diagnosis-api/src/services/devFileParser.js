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

export function evaluateTextQuality(text) {
  const value = String(text || '');
  const charCount = value.length;
  const lines = value.split('\n').map(line => line.trim()).filter(Boolean);
  const lineCount = lines.length;
  const chineseChars = (value.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinChars = (value.match(/[A-Za-z]/g) || []).length;
  const digits = (value.match(/\d/g) || []).length;
  const punctuationChars = (value.match(/[^\u4e00-\u9fffA-Za-z0-9\s]/g) || []).length;
  const punctuationOnlyLines = lines.filter(line => {
    const compact = line.replace(/\s/g, '');
    return compact && /^[^\u4e00-\u9fffA-Za-z0-9]+$/.test(compact);
  }).length;
  const shortLines = lines.filter(line => line.length > 0 && line.length <= 3).length;
  const repeatedLineRatio = calculateRepeatedLineRatio(lines);
  const effectiveCharRatio = charCount ? roundRatio((chineseChars + latinChars + digits) / charCount) : 0;
  const punctuationRatio = charCount ? roundRatio(punctuationChars / charCount) : 0;
  const shortLineRatio = lineCount ? roundRatio(shortLines / lineCount) : 0;
  const punctuationOnlyLineRatio = lineCount ? roundRatio(punctuationOnlyLines / lineCount) : 0;
  const metrics = {
    charCount,
    chineseCharRatio: charCount ? roundRatio(chineseChars / charCount) : 0,
    latinCharRatio: charCount ? roundRatio(latinChars / charCount) : 0,
    punctuationRatio,
    lineCount,
    shortLineRatio
  };
  const warnings = [];

  if (charCount < 80) {
    warnings.push('提取文本长度过短。');
  }
  if (punctuationRatio >= 0.45) {
    warnings.push('标点或符号比例过高。');
  }
  if (effectiveCharRatio < 0.35) {
    warnings.push('中文、英文和数字等有效字符比例过低。');
  }
  if (repeatedLineRatio >= 0.35 && lineCount >= 8) {
    warnings.push('疑似存在较多重复页眉页脚。');
  }
  if (punctuationOnlyLineRatio >= 0.25 && lineCount >= 6) {
    warnings.push('存在较多只有标点或符号的行。');
  }
  if (shortLineRatio >= 0.65 && lineCount >= 12) {
    warnings.push('短行比例过高，可能是页码、页眉页脚或断裂文本。');
  }

  let qualityStatus = 'ok';
  if (charCount < 40 || effectiveCharRatio < 0.2 || punctuationRatio >= 0.65 || punctuationOnlyLineRatio >= 0.45) {
    qualityStatus = 'failed';
  } else if (warnings.length > 0) {
    qualityStatus = 'warning';
  }

  return {
    qualityStatus,
    qualityWarnings: warnings,
    qualityMetrics: metrics
  };
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
        extractedTextLength: text.length,
        textQuality: evaluateTextQuality(text)
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

function calculateRepeatedLineRatio(lines) {
  if (!lines.length) return 0;
  const counts = new Map();
  for (const line of lines) {
    const normalized = line.replace(/\d+/g, '#').trim();
    if (normalized.length < 4) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }
  const repeated = Array.from(counts.values()).reduce((total, count) => total + (count > 1 ? count : 0), 0);
  return roundRatio(repeated / lines.length);
}

function roundRatio(value) {
  return Math.round(value * 1000) / 1000;
}

function normalizeText(text) {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}
