import express from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { parseUploadedFile } from '../services/fileParser.js';
import { validateScriptText } from '../services/guard.js';
import { routeMaterial } from '../services/materialRouter.js';
import { hasAiProvider } from '../services/aiClient.js';
import { runDiagnosisPipeline } from '../services/diagnosisPipeline.js';
import { buildMockDiagnosisReport } from '../services/mockDiagnosis.js';
import { logDiagnosisResult } from '../services/diagnosisLogger.js';
import { ApiError } from '../utils/errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadBytes,
    files: 1
  }
});

export const diagnosisRouter = express.Router();

diagnosisRouter.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const userSelectedType = normalizeMaterialType(req.body.materialType);
    const input = await resolveDiagnosisInput(req);
    const { parsed, inputMode } = input;
    const materialRouting = await routeMaterial({
      userSelectedType,
      text: parsed.text,
      originalFileName: parsed.source?.filename
    });

    if (materialRouting.effectiveDiagnosisType === 'reject') {
      throw new ApiError(400, 'MATERIAL_REJECTED', materialRouting.reason);
    }

    const guard = validateScriptText(parsed.text, materialRouting);
    const materialType = materialRouting.effectiveDiagnosisType;
    const payload = {
      text: parsed.text,
      materialType,
      userSelectedType,
      targetFormat: materialRouting.targetFormat,
      materialForm: materialRouting.materialForm,
      materialRouting,
      inputMode,
      stats: guard.stats,
      source: parsed.source
    };

    const mode = hasAiProvider() ? 'ai' : 'mock';
    let result;
    if (mode === 'ai') {
      result = await runDiagnosisPipeline(payload);
    } else {
      const mockReport = buildMockDiagnosisReport(payload);
      result = {
        internalStage: 'mock',
        diagnosisDepth: 'basic',
        basicReport: mockReport,
        finalReport: mockReport
      };
    }

    const logEntry = await logDiagnosisResult({
      mode,
      materialType,
      materialRouting,
      inputMode,
      parsed,
      stats: guard.stats,
      result
    });

    res.json({
      ok: true,
      mode,
      diagnosisId: logEntry?.id || null,
      internalStage: result.internalStage,
      diagnosisDepth: getDiagnosisDepth(result),
      diagnosisEngine: result.diagnosisEngine || null,
      materialType,
      userSelectedType,
      targetFormat: materialRouting.targetFormat,
      materialForm: materialRouting.materialForm,
      effectiveDiagnosisType: materialRouting.effectiveDiagnosisType,
      inputMode,
      materialRouting,
      source: parsed.source,
      stats: guard.stats,
      reportV1: result.reportV1 || null,
      basicReport: result.basicReport,
      finalReport: result.finalReport,
      report: result.finalReport  // backward compat for existing frontend
    });
  } catch (err) {
    next(err);
  }
});

export function getDiagnosisDepth(result) {
  if (result?.diagnosisDepth === 'advanced' || result?.internalStage === 'advanced') {
    return 'advanced';
  }
  return 'basic';
}

function normalizeMaterialType(value) {
  const valid = ['short', 'feature', 'other'];
  return valid.includes(value) ? value : 'other';
}

export async function resolveDiagnosisInput(req) {
  if (req.file) {
    return {
      inputMode: 'file_upload',
      parsed: await parseUploadedFile(req.file)
    };
  }

  const text = normalizePastedText(req.body?.text);
  if (text) {
    return {
      inputMode: 'pasted_text',
      parsed: {
        source: {
          filename: 'pasted-text',
          type: 'pasted_text'
        },
        text
      }
    };
  }

  const requestedMode = req.body?.inputMode === 'pasted_text' ? 'pasted_text' : 'file_upload';
  if (requestedMode === 'pasted_text') {
    throw new ApiError(400, 'TEXT_REQUIRED', '请先粘贴需要诊断的文本。');
  }
  throw new ApiError(400, 'MATERIAL_REQUIRED', '请上传 TXT / DOCX 文件，或直接粘贴需要诊断的文本。');
}

function normalizePastedText(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}
