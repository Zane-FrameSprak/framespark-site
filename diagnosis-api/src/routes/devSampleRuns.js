import express from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { parseDevUploadedFile } from '../services/devFileParser.js';
import {
  appendSamples,
  createSampleRun,
  listSampleRuns,
  readSampleRun,
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
