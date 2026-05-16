import express from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { parseUploadedFile } from '../services/fileParser.js';
import { validateScriptText } from '../services/guard.js';
import { generateDiagnosisReport, hasAiProvider } from '../services/aiClient.js';
import { buildMockDiagnosisReport } from '../services/mockDiagnosis.js';
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
    if (!req.file) {
      throw new ApiError(400, 'FILE_REQUIRED', '请先上传剧本或故事材料。');
    }

    const materialType = normalizeMaterialType(req.body.materialType);
    const scriptDuration = normalizeScriptDuration(req.body.scriptDuration, materialType);
    const parsed = await parseUploadedFile(req.file);
    const guard = validateScriptText(parsed.text, materialType);
    const payload = {
      text: parsed.text,
      materialType,
      scriptDuration,
      stats: guard.stats,
      source: parsed.source
    };
    const mode = hasAiProvider() ? 'ai' : 'mock';
    const report = mode === 'ai'
      ? await generateDiagnosisReport(payload)
      : buildMockDiagnosisReport(payload);

    res.json({
      ok: true,
      mode,
      materialType,
      scriptDuration,
      source: parsed.source,
      stats: guard.stats,
      report
    });
  } catch (err) {
    next(err);
  }
});

function normalizeMaterialType(value) {
  if (value === 'full' || value === 'simple') {
    return value;
  }

  return 'simple';
}

function normalizeScriptDuration(value, materialType) {
  // 简单材料不需要时长字段
  if (materialType !== 'full') return null;

  const valid = ['short', 'mid', 'feature', 'episode'];
  return valid.includes(value) ? value : 'feature';
}
