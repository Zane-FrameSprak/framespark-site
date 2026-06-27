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
import { buildPublicDiagnosisResponse } from '../services/publicDiagnosisResponse.js';
import { createProviderCallBudget } from '../services/providerCallBudget.js';
import { validateInputTokenLimit } from '../services/tokenCounter.js';
import { assertGlobalProviderTokenBudget } from '../services/providerUsageStore.js';
import {
  consumeDailyLimit,
  getBetaIdentityKey,
  getClientIpKey,
  getGlobalKey
} from '../middleware/rateLimit.js';
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
    const reviewConsent = req.body.reviewConsent === 'true';
    const input = await resolveDiagnosisInput(req);
    const { parsed, inputMode } = input;
    const tokenStats = validateInputTokenLimit(parsed.text);
    if (hasAiProvider()) await assertGlobalProviderTokenBudget();
    consumeDiagnosisDailyLimits(req);
    const providerBudget = createProviderCallBudget({
      maxCalls: config.providerCallLimitPerDiagnosis,
      maxGeneralRepairs: 1
    });
    const allowV1D0 = config.enableDiagnosisV1 && config.enableV1StagedRunner;
    const materialRouting = await routeMaterial({
      userSelectedType,
      text: parsed.text,
      originalFileName: parsed.source?.filename,
      signal: req.diagnosisSignal,
      providerBudget,
      useAiClassification: !allowV1D0
    });

    if (materialRouting.effectiveDiagnosisType === 'reject' && !allowV1D0) {
      throw new ApiError(400, 'MATERIAL_REJECTED', materialRouting.reason);
    }

    const guard = validateScriptText(parsed.text, materialRouting, { allowD0: allowV1D0 });
    const materialType = materialRouting.effectiveDiagnosisType === 'reject'
      ? 'other'
      : materialRouting.effectiveDiagnosisType;
    const payload = {
      text: parsed.text,
      materialType,
      userSelectedType,
      targetFormat: materialRouting.targetFormat,
      materialForm: materialRouting.materialForm,
      materialRouting,
      materialHint: buildMaterialHint(materialRouting),
      inputMode,
      stats: {
        ...guard.stats,
        tokenCount: tokenStats.tokenCount
      },
      source: parsed.source,
      signal: req.diagnosisSignal,
      providerBudget
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
      betaIdentity: req.betaIdentity,
      materialType,
      materialRouting,
      inputMode,
      parsed,
      stats: {
        ...guard.stats,
        tokenCount: tokenStats.tokenCount
      },
      result,
      reviewConsent
    });

    res.json(buildPublicDiagnosisResponse({
      diagnosisId: logEntry?.id || null,
      inputMode,
      stats: guard.stats,
      result
    }));
  } catch (err) {
    next(err);
  }
});

const dailyLimitStores = {
  global: new Map(),
  account: new Map(),
  ip: new Map()
};

function consumeDiagnosisDailyLimits(req) {
  consumeDiagnosisDailyLimit({
    req,
    store: dailyLimitStores.global,
    limit: config.rateLimits.globalDailyLimit,
    errorCode: 'RATE_LIMIT_EXCEEDED',
    message: '今日公测总次数已达上限。',
    keyFn: getGlobalKey
  });
  consumeDiagnosisDailyLimit({
    req,
    store: dailyLimitStores.account,
    limit: config.rateLimits.accountDailyLimit,
    errorCode: 'RATE_LIMIT_EXCEEDED',
    message: '当前公测访问凭证今日次数已达上限。',
    keyFn: getBetaIdentityKey
  });
  consumeDiagnosisDailyLimit({
    req,
    store: dailyLimitStores.ip,
    limit: config.rateLimits.ipDailyLimit,
    errorCode: 'RATE_LIMIT_EXCEEDED',
    message: '当前网络今日次数已达上限。',
    keyFn: getClientIpKey
  });
}

function consumeDiagnosisDailyLimit(options) {
  const result = consumeDailyLimit(options);
  if (!result.ok) {
    throw new ApiError(429, options.errorCode, options.message);
  }
}

export function getDiagnosisDepth(result) {
  if (result?.diagnosisDepth === 'advanced' || result?.internalStage === 'advanced') {
    return 'advanced';
  }
  return 'basic';
}

function buildMaterialHint(materialRouting) {
  const rejected = materialRouting.effectiveDiagnosisType === 'reject';
  const materialType = rejected ? 'non_story_material' : materialRouting.materialForm;
  return {
    material_type: materialType,
    primary_material_type: materialType,
    secondary_material_types: [],
    is_mixed_material: false,
    material_components: []
  };
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
