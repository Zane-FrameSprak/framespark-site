import { generateDiagnosisReport, generateAdvancedReport } from './aiClient.js';

const ADVANCE_PREFIX = '可进入进阶诊断';
const ADVANCED_TYPES = new Set(['short', 'feature', 'other']);

export async function runDiagnosisPipeline(payload) {
  const { materialType } = payload;

  const basicReport = await generateDiagnosisReport(payload);

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

  const advancedReport = await generateAdvancedReport(buildAdvancedPayload(payload, basicReport));
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
