import express from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { parseDevUploadedFile } from '../services/devFileParser.js';
import { validateScriptText } from '../services/guard.js';
import { routeMaterial } from '../services/materialRouter.js';
import { hasAiProvider } from '../services/aiClient.js';
import { runDiagnosisPipeline } from '../services/diagnosisPipeline.js';
import { buildMockDiagnosisReport } from '../services/mockDiagnosis.js';
import { logDiagnosisResult } from '../services/diagnosisLogger.js';
import { getDiagnosisDepth } from './diagnosis.js';
import {
  appendDiagnosisResults,
  appendSamples,
  createSampleRun,
  listSampleRuns,
  readSampleRun,
  readSampleText,
  updateSampleRunMeta
} from '../services/sampleRunStore.js';
import { ApiError } from '../utils/errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadBytes,
    files: 50
  }
});

export const devSampleRunsRouter = express.Router();

devSampleRunsRouter.get('/', async (req, res, next) => {
  try {
    const runs = await listSampleRuns();
    res.json({ ok: true, runs });
  } catch (err) {
    next(err);
  }
});

devSampleRunsRouter.post('/', async (req, res, next) => {
  try {
    const run = await createSampleRun(req.body || {});
    res.status(201).json({ ok: true, run });
  } catch (err) {
    next(err);
  }
});

devSampleRunsRouter.get('/:runId', async (req, res, next) => {
  try {
    const run = await readSampleRun(req.params.runId);
    res.json({ ok: true, run });
  } catch (err) {
    next(err);
  }
});

devSampleRunsRouter.patch('/:runId', async (req, res, next) => {
  try {
    const run = await updateSampleRunMeta(req.params.runId, req.body || {});
    res.json({ ok: true, run });
  } catch (err) {
    next(err);
  }
});

devSampleRunsRouter.post('/:runId/samples', upload.array('files', 50), async (req, res, next) => {
  try {
    const { samples, errors } = await resolveSamples(req);
    if (samples.length === 0) {
      throw new ApiError(400, 'NO_VALID_SAMPLES', errors[0]?.message || '没有可保存的有效样本。');
    }
    const result = await appendSamples(req.params.runId, samples);
    res.status(201).json({ ok: true, ...result, errors });
  } catch (err) {
    next(err);
  }
});

devSampleRunsRouter.post('/:runId/diagnosis-tests', async (req, res, next) => {
  try {
    const sampleIds = normalizeSampleIds(req.body?.sampleIds);
    if (!sampleIds.length) {
      throw new ApiError(400, 'SAMPLE_IDS_REQUIRED', '请选择需要运行诊断测试的样本。');
    }
    if (sampleIds.length > 10) {
      throw new ApiError(413, 'TOO_MANY_DIAGNOSIS_TESTS', '单次最多运行 10 个样本。');
    }

    const requestedType = normalizeMaterialType(req.body?.materialType);
    const savedResults = [];
    const errors = [];

    for (const sampleId of sampleIds) {
      try {
        const sampleResult = await runSampleDiagnosisTest(req.params.runId, sampleId, requestedType);
        savedResults.push(sampleResult);
      } catch (err) {
        errors.push({
          sampleId,
          code: err.code || 'DIAGNOSIS_TEST_FAILED',
          message: err.message || '诊断测试失败。'
        });
      }
    }

    const saved = await appendDiagnosisResults(req.params.runId, savedResults);
    const run = await readSampleRun(req.params.runId);
    res.status(errors.length ? 207 : 201).json({
      ok: true,
      run,
      savedCount: saved.savedCount,
      results: saved.saved,
      errors
    });
  } catch (err) {
    next(err);
  }
});

async function resolveSamples(req) {
  if (Array.isArray(req.files) && req.files.length > 0) {
    const metadata = parseMetadata(req.body?.metadata);
    const samples = [];
    const errors = [];
    for (let index = 0; index < req.files.length; index += 1) {
      const file = req.files[index];
      try {
        const parsed = await parseDevUploadedFile(file);
        const item = metadata[index] || {};
        samples.push({
          ...item,
          name: item.name || stripExtension(file.originalname || `sample-${index + 1}`),
          sourceType: 'uploaded-file',
          originalFileName: file.originalname || '',
          fileType: parsed.source.type,
          extractedTextLength: parsed.source.extractedTextLength,
          textQualityStatus: parsed.source.textQuality?.qualityStatus,
          textQualityWarnings: parsed.source.textQuality?.qualityWarnings,
          textQualityMetrics: parsed.source.textQuality?.qualityMetrics,
          text: parsed.text
        });
      } catch (err) {
        errors.push({
          originalFileName: file.originalname || '',
          code: err.code || 'FILE_PARSE_FAILED',
          message: err.message || '文件解析失败。'
        });
      }
    }
    return { samples, errors };
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (Array.isArray(body.samples)) {
    return {
      samples: body.samples.map(item => ({
        ...item,
        sourceType: item?.sourceType || 'pasted-text',
        fileType: item?.fileType || 'pasted_text'
      })),
      errors: []
    };
  }

  throw new ApiError(400, 'SAMPLES_REQUIRED', '请提供需要保存的测试样本。');
}

function parseMetadata(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    throw new ApiError(400, 'INVALID_METADATA', '上传样本元数据格式不正确。');
  }
}

function stripExtension(filename) {
  return String(filename || '').replace(/\.[^.]+$/, '');
}

function normalizeSampleIds(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item || '').trim()).filter(Boolean);
}

function normalizeMaterialType(value) {
  return ['short', 'feature', 'other', 'auto'].includes(value) ? value : 'auto';
}

function resolveMaterialTypeForSample(sample, requestedType) {
  if (requestedType && requestedType !== 'auto') return requestedType;
  if (['short', 'feature', 'other'].includes(sample.targetFormatExpected)) {
    return sample.targetFormatExpected;
  }
  return 'other';
}

async function runSampleDiagnosisTest(runId, sampleId, requestedType) {
  const { sample, text } = await readSampleText(runId, sampleId);
  const userSelectedType = resolveMaterialTypeForSample(sample, requestedType);
  const parsed = {
    source: {
      filename: sample.originalFileName || sample.name || sample.sampleId,
      type: sample.fileType || sample.sourceType || 'sample_text'
    },
    text
  };
  const materialRouting = await routeMaterial({
    userSelectedType,
    text,
    originalFileName: parsed.source.filename
  });

  if (materialRouting.effectiveDiagnosisType === 'reject') {
    throw new ApiError(400, 'MATERIAL_REJECTED', materialRouting.reason);
  }

  const guard = validateScriptText(text, materialRouting);
  const materialType = materialRouting.effectiveDiagnosisType;
  const payload = {
    text,
    materialType,
    userSelectedType,
    targetFormat: materialRouting.targetFormat,
    materialForm: materialRouting.materialForm,
    materialRouting,
    inputMode: sample.sourceType === 'uploaded-file' ? 'file_upload' : 'pasted_text',
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
    inputMode: payload.inputMode,
    parsed,
    stats: guard.stats,
    result
  });

  const report = result.finalReport || {};
  return {
    resultId: `${sample.sampleId}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    sampleId: sample.sampleId,
    sampleName: sample.name,
    createdAt: new Date().toISOString(),
    mode,
    materialType,
    targetFormat: materialRouting.targetFormat,
    materialForm: materialRouting.materialForm,
    effectiveDiagnosisType: materialRouting.effectiveDiagnosisType,
    diagnosisDepth: getDiagnosisDepth(result),
    diagnosisId: logEntry?.id || '',
    summary: report.summary || '',
    core: report.core || '',
    nextStep: report.nextStep || '',
    report,
    materialRouting,
    stats: guard.stats,
    source: parsed.source
  };
}
