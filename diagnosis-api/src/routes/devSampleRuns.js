import express from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { parseUploadedFile } from '../services/fileParser.js';
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
    const samples = await resolveSamples(req);
    const result = await appendSamples(req.params.runId, samples);
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

async function resolveSamples(req) {
  if (Array.isArray(req.files) && req.files.length > 0) {
    const metadata = parseMetadata(req.body?.metadata);
    return Promise.all(req.files.map(async (file, index) => {
      const parsed = await parseUploadedFile(file);
      const item = metadata[index] || {};
      return {
        ...item,
        name: item.name || stripExtension(file.originalname || `sample-${index + 1}`),
        sourceType: 'uploaded-file',
        originalFileName: file.originalname || '',
        text: parsed.text
      };
    }));
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (Array.isArray(body.samples)) {
    return body.samples.map(item => ({
      ...item,
      sourceType: item?.sourceType || 'pasted-text'
    }));
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
