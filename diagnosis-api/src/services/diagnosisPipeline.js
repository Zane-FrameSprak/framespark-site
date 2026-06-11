import { config } from '../config.js';
import {
  generateDiagnosisReport,
  generateAdvancedReport,
  generateUnifiedDiagnosisV1,
  generateV1StageReport
} from './aiClient.js';
import { reportV1ToLegacyReport } from './reportV1Compat.js';
import { buildFallbackReportV1 } from './reportV1Parser.js';
import { createProviderCallBudget } from './providerCallBudget.js';
import { runV1StagedDiagnosis } from './v1StageRunner.js';
import { ApiError } from '../utils/errors.js';

const ADVANCE_PREFIX = '可进入进阶诊断';
const ADVANCED_TYPES = new Set(['short', 'feature', 'other']);

export async function runDiagnosisPipeline(payload) {
  const providerBudget = payload.providerBudget || createProviderCallBudget({
    maxCalls: config.providerCallLimitPerDiagnosis,
    maxGeneralRepairs: 1
  });

  return runDiagnosisPipelineWithEngines(payload, {
    generateBasic: generateDiagnosisReport,
    generateAdvanced: generateAdvancedReport,
    generateV1: generateUnifiedDiagnosisV1,
    runStagedV1: async stagedPayload => {
      const stagedResult = await runV1StagedDiagnosis(stagedPayload, {
        enableV1RealPrompts: config.enableV1RealPrompts,
        generateV1StageReport: args => generateV1StageReport({ ...args, providerBudget })
      });
      stagedResult.diagnostics = {
        ...stagedResult.diagnostics,
        providerCalls: providerBudget.snapshot().calls
      };
      return stagedResult;
    }
  }, {
    enableDiagnosisV1: config.enableDiagnosisV1,
    enableV1StagedRunner: config.enableV1StagedRunner,
    failClosedOnV1Error: config.failClosedOnV1Error
  });
}

export async function runDiagnosisPipelineWithEngines(payload, engines, options = {}) {
  if (!options.enableDiagnosisV1) {
    return runLegacyDiagnosisPipeline(payload, engines);
  }

  try {
    if (options.enableV1StagedRunner) {
      return await runStagedV1Pipeline(payload, engines);
    }

    const reportV1 = await engines.generateV1(payload);
    const legacyReport = reportV1ToLegacyReport(reportV1);
    return {
      internalStage: 'basic',
      diagnosisDepth: 'basic',
      diagnosisEngine: 'v1',
      reportV1,
      basicReport: legacyReport,
      finalReport: legacyReport
    };
  } catch (err) {
    if (options.failClosedOnV1Error) {
      throw new ApiError(503, 'V1_DIAGNOSIS_FAILED', 'V1 diagnosis did not produce a safe public result.');
    }
    const legacyResult = await runLegacyDiagnosisPipeline(payload, engines);
    return {
      ...legacyResult,
      diagnosisEngine: 'legacy-fallback',
      reportV1: buildFallbackReportV1(payload, legacyResult.finalReport, err)
    };
  }
}

async function runStagedV1Pipeline(payload, engines) {
  const stagedResult = await engines.runStagedV1(payload);
  const reportV1 = stagedResult?.reportV1 || {};
  const legacyReport = reportV1ToLegacyReport(reportV1);

  return {
    internalStage: stagedResult?.diagnostics?.stageReached || reportV1.stage || 'basic',
    diagnosisDepth: 'basic',
    diagnosisEngine: 'v1-staged',
    reportV1,
    diagnostics: stagedResult?.diagnostics || null,
    basicReport: legacyReport,
    finalReport: legacyReport
  };
}

async function runLegacyDiagnosisPipeline(payload, engines) {
  const { materialType } = payload;

  const basicReport = await engines.generateBasic(payload);

  const shouldAdvance =
    typeof basicReport.nextStep === 'string' &&
    basicReport.nextStep.startsWith(ADVANCE_PREFIX) &&
    ADVANCED_TYPES.has(materialType);

  if (!shouldAdvance) {
    return {
      internalStage: 'basic',
      diagnosisDepth: 'basic',
      basicReport,
      finalReport: basicReport
    };
  }

  const advancedReport = await engines.generateAdvanced(buildAdvancedPayload(payload, basicReport));
  return {
    internalStage: 'advanced',
    diagnosisDepth: 'advanced',
    basicReport,
    finalReport: advancedReport
  };
}

export function buildAdvancedPayload(payload, basicReport) {
  return {
    ...payload,
    basicSummary: basicReport?.summary || '',
    basicCore: basicReport?.core || '',
    basicNextStep: basicReport?.nextStep || ''
  };
}
