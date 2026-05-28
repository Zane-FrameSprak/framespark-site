import { config } from '../config.js';
import { generateDiagnosisReport, generateAdvancedReport, generateUnifiedDiagnosisV1 } from './aiClient.js';
import { reportV1ToLegacyReport } from './reportV1Compat.js';
import { buildFallbackReportV1 } from './reportV1Parser.js';

const ADVANCE_PREFIX = '可进入进阶诊断';
const ADVANCED_TYPES = new Set(['short', 'feature', 'other']);

export async function runDiagnosisPipeline(payload) {
  return runDiagnosisPipelineWithEngines(payload, {
    generateBasic: generateDiagnosisReport,
    generateAdvanced: generateAdvancedReport,
    generateV1: generateUnifiedDiagnosisV1
  }, {
    enableDiagnosisV1: config.enableDiagnosisV1
  });
}

export async function runDiagnosisPipelineWithEngines(payload, engines, options = {}) {
  if (!options.enableDiagnosisV1) {
    return runLegacyDiagnosisPipeline(payload, engines);
  }

  try {
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
    const legacyResult = await runLegacyDiagnosisPipeline(payload, engines);
    return {
      ...legacyResult,
      diagnosisEngine: 'legacy-fallback',
      reportV1: buildFallbackReportV1(payload, legacyResult.finalReport, err)
    };
  }
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
