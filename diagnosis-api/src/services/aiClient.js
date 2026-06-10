import { config } from '../config.js';
import { buildBasicDiagnosisMessages } from '../prompts/basicDiagnosis.js';
import { buildAdvancedShortDiagnosisMessages } from '../prompts/advancedShortDiagnosis.js';
import { buildAdvancedFeatureDiagnosisMessages } from '../prompts/advancedFeatureDiagnosis.js';
import { buildAdvancedOtherDiagnosisMessages } from '../prompts/advancedOtherDiagnosis.js';
import { buildUnifiedDiagnosisV1Messages } from '../prompts/unifiedDiagnosisV1.js';
import { ApiError } from '../utils/errors.js';
import { extractJson, isCriticallyMissing, normalizeReport, validateFields } from './reportParser.js';
import { normalizeReportV1 } from './reportV1Parser.js';
import {
  isFinalOutputValidationError,
  normalizeV1FinalAssessment
} from './v1FinalAssessment.js';

const ADVANCED_BUILDERS = {
  short:   buildAdvancedShortDiagnosisMessages,
  feature: buildAdvancedFeatureDiagnosisMessages,
  other:   buildAdvancedOtherDiagnosisMessages
};

const MATERIAL_FORMS = new Set([
  'full_script',
  'outline',
  'synopsis',
  'concept',
  'character_bio',
  'worldbuilding',
  'fragment',
  'unknown',
  'reject'
]);

const V1_STAGES = new Set(['basic', 'advanced', 'final']);

export function hasAiProvider() {
  return Boolean(config.deepseekApiKey);
}

export async function generateDiagnosisReport(payload) {
  if (!hasAiProvider()) {
    throw new ApiError(500, 'AI_NOT_CONFIGURED', 'AI 服务尚未配置。');
  }
  return generateReport(payload, buildBasicDiagnosisMessages);
}

export async function generateAdvancedReport(payload) {
  if (!hasAiProvider()) {
    throw new ApiError(500, 'AI_NOT_CONFIGURED', 'AI 服务尚未配置。');
  }
  const buildMessages = ADVANCED_BUILDERS[payload.materialType];
  if (!buildMessages) {
    throw new ApiError(400, 'UNSUPPORTED_MATERIAL_TYPE', `不支持进阶诊断的材料类型：${payload.materialType}`);
  }
  return generateReport(payload, buildMessages);
}

export async function generateUnifiedDiagnosisV1(payload) {
  if (!hasAiProvider()) {
    throw new ApiError(500, 'AI_NOT_CONFIGURED', 'AI 服务尚未配置。');
  }
  return generateReportV1(payload, buildUnifiedDiagnosisV1Messages);
}

export async function generateV1StageReport({
  stage,
  messages,
  promptVersion = '',
  payload = {},
  metadata = {},
  context = {},
  requestFn
} = {}) {
  const normalizedStage = normalizeV1Stage(stage);
  if (!normalizedStage) {
    throw new ApiError(400, 'V1_STAGE_INVALID', '不支持的 V1 诊断阶段。');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ApiError(400, 'V1_STAGE_MESSAGES_REQUIRED', 'V1 阶段诊断缺少 messages。');
  }
  if (!requestFn && !hasAiProvider()) {
    throw new ApiError(500, 'AI_NOT_CONFIGURED', 'AI 服务尚未配置。');
  }

  const request = requestFn || makeRequest;
  const requestPayload = { ...payload, stage: normalizedStage, promptVersion, metadata, context };

  if (normalizedStage === 'final') {
    return generateV1FinalStageReport({
      messages,
      promptVersion,
      requestPayload,
      request
    });
  }

  let raw;
  try {
    const content = await request(messages, { temperature: 0.2 });
    raw = extractJson(content);
    return normalizeReportV1(normalizeV1StageRaw(raw, requestPayload), requestPayload);
  } catch (err) {
    if (err instanceof ApiError && err.code === 'AI_REQUEST_TIMEOUT') {
      throw err;
    }
    const retryMessages = buildV1StageRetryMessages(messages, normalizedStage);
    const content = await request(retryMessages, { temperature: 0.1 });
    raw = extractJson(content);
    return normalizeReportV1(normalizeV1StageRaw(raw, requestPayload), requestPayload);
  }
}

async function generateV1FinalStageReport({ messages, promptVersion, requestPayload, request }) {
  let activeMessages = messages;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const content = await request(activeMessages, { temperature: attempt === 0 ? 0.1 : 0 });
      const raw = extractJson(content);
      const report = normalizeReportV1(normalizeV1StageRaw(raw, requestPayload), requestPayload);
      report.diagnostics = {
        ...report.diagnostics,
        stage: 'final',
        promptVersion,
        model: config.deepseekModel,
        finalRetryCount: attempt,
        jsonRetry: attempt > 0,
        fallback: false
      };
      return report;
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AI_REQUEST_TIMEOUT') {
        throw error;
      }
      if (!isRepairableFinalError(error)) {
        throw error;
      }
      if (attempt === 1) {
        throw new ApiError(
          422,
          'V1_FINAL_OUTPUT_UNSAFE',
          'V1 final 输出在一次修复后仍未通过结构或安全校验。'
        );
      }
      activeMessages = buildV1FinalRepairMessages(messages, error.code);
    }
  }

  throw new ApiError(422, 'V1_FINAL_OUTPUT_UNSAFE', 'V1 final 输出未通过结构或安全校验。');
}

export async function classifyMaterialForm(input) {
  if (!hasAiProvider()) {
    throw new ApiError(500, 'AI_NOT_CONFIGURED', 'AI 服务尚未配置。');
  }

  const content = await makeRequest(buildMaterialClassificationMessages(input), {
    temperature: 0.1,
    maxTokens: 240
  });
  const raw = extractJson(content);
  const keys = Object.keys(raw || {});
  const materialForm = String(raw.materialForm || '').trim();
  const reason = String(raw.reason || '').trim();

  if (keys.some(key => !['materialForm', 'reason'].includes(key))) {
    throw new ApiError(422, 'AI_CLASSIFICATION_INVALID', 'AI 材料形态分类返回了不允许的字段。');
  }
  if (!MATERIAL_FORMS.has(materialForm)) {
    throw new ApiError(422, 'AI_CLASSIFICATION_INVALID', 'AI 材料形态分类返回了不支持的 materialForm。');
  }
  if (!reason) {
    throw new ApiError(422, 'AI_CLASSIFICATION_INVALID', 'AI 材料形态分类缺少 reason。');
  }

  return { materialForm, reason };
}

async function generateReport(payload, buildMessagesFn) {
  const { materialType } = payload;
  const messages = buildMessagesFn(payload);

  let raw;
  try {
    const content = await makeRequest(messages);
    raw = extractJson(content);
  } catch (err) {
    if (err instanceof ApiError && err.code !== 'AI_REQUEST_TIMEOUT') {
      // Parse failed — retry once with explicit JSON instruction
      const retryMessages = buildRetryMessages(messages);
      const content = await makeRequest(retryMessages);
      raw = extractJson(content);
    } else {
      throw err;
    }
  }

  // If parse succeeded but critical fields are missing, retry once
  if (isCriticallyMissing(raw)) {
    const retryMessages = buildRetryMessages(messages);
    const content = await makeRequest(retryMessages);
    raw = extractJson(content);
  }

  const missing = validateFields(raw);
  if (missing.length > 0) {
    // Non-fatal: normalizeReport will fill gaps; just continue
  }

  return normalizeReport(raw, materialType);
}

async function generateReportV1(payload, buildMessagesFn) {
  const messages = buildMessagesFn(payload);

  let raw;
  try {
    const content = await makeRequest(messages);
    raw = extractJson(content);
    return normalizeReportV1(raw, payload);
  } catch (err) {
    if (err instanceof ApiError && err.code === 'AI_REQUEST_TIMEOUT') {
      throw err;
    }
    const retryMessages = buildV1RetryMessages(messages);
    const content = await makeRequest(retryMessages);
    raw = extractJson(content);
    return normalizeReportV1(raw, payload);
  }
}

async function makeRequest(messages, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(function () {
    controller.abort();
  }, config.aiTimeoutMs);

  try {
    const response = await fetch(joinUrl(config.deepseekBaseUrl, '/chat/completions'), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.deepseekApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.deepseekModel,
        messages,
        temperature: options.temperature ?? 0.2,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json().catch(function () {
      return null;
    });

    if (!response.ok) {
      const message = data && data.error && data.error.message
        ? data.error.message
        : 'AI 诊断请求失败。';
      throw new ApiError(response.status, 'AI_REQUEST_FAILED', message);
    }

    return data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(504, 'AI_REQUEST_TIMEOUT', 'AI 诊断超时，请稍后再试。');
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, 'AI_REQUEST_FAILED', 'AI 诊断请求失败，请稍后再试。');
  } finally {
    clearTimeout(timeout);
  }
}

function buildRetryMessages(originalMessages) {
  return [
    ...originalMessages,
    {
      role: 'assistant',
      content: '抱歉，我需要重新输出。'
    },
    {
      role: 'user',
      content: '请严格只输出合法 JSON 对象，不要包含任何说明文字、markdown 代码块或其他格式。必须包含以下六个字段：summary、core、strengths、problems、suggestions、nextStep。'
    }
  ];
}

function buildV1RetryMessages(originalMessages) {
  return [
    ...originalMessages,
    {
      role: 'assistant',
      content: '抱歉，我需要重新输出。'
    },
    {
      role: 'user',
      content: [
        '请严格只输出合法 JSON 对象，不要包含任何说明文字、markdown 代码块或其他格式。',
        '必须包含 V1 字段：schema_version、material_type、primary_material_type、maturity_level、material_summary、story_core、strengths、main_problems、priority_revisions、next_step、conversion_advice、rejection_reason。',
        'material_type 和 primary_material_type 必须使用允许枚举；maturity_level 必须使用 S/A/B/C/D0。'
      ].join('\n')
    }
  ];
}

function buildV1StageRetryMessages(originalMessages, stage) {
  return [
    ...originalMessages,
    {
      role: 'assistant',
      content: '抱歉，我需要重新输出。'
    },
    {
      role: 'user',
      content: [
        '请严格只输出合法 JSON 对象，不要包含任何说明文字、markdown 代码块或其他格式。',
        `stage 必须为 ${stage}。`,
        '必须包含字段：stage、maturity_level、summary、core、strengths、problems、suggestions、nextStep、stageDecisionHints。'
      ].join('\n')
    }
  ];
}

function buildV1FinalRepairMessages(originalMessages, errorCode) {
  return [
    ...originalMessages,
    {
      role: 'assistant',
      content: '上一次输出未通过服务端校验。'
    },
    {
      role: 'user',
      content: [
        `校验错误代码：${String(errorCode || 'V1_FINAL_STRUCTURE_INVALID')}`,
        '请重新生成一次，并严格只输出合法 JSON 对象。',
        '顶层只能包含 stage、maturity_level、final_assessment。',
        'final_assessment 必须使用 v1-final-structure-1 的严格字段与允许枚举。',
        'evidence_from_material 必须逐字来自材料正文。',
        '不得输出 suggestions 或任何具体桥段、场景、台词、结局、动机、背景、规则答案。',
        '这是唯一一次修复机会。'
      ].join('\n')
    }
  ];
}

function normalizeV1StageRaw(raw, payload = {}) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const stage = normalizeV1Stage(input.stage || payload.stage) || 'basic';
  if (stage === 'final') {
    return normalizeV1FinalAssessment(input, {
      sourceText: payload.context?.sourceText || payload.text || '',
      basicReport: payload.context?.basicReport,
      advancedReport: payload.context?.advancedReport,
      materialType: payload.metadata?.primary_material_type || payload.material_type
    });
  }
  const materialType = input.primary_material_type ||
    input.material_type ||
    payload.metadata?.primary_material_type ||
    payload.materialRouting?.primary_material_type ||
    payload.material_type ||
    'synopsis';

  return {
    schema_version: 'diagnosis-report-v1',
    stage,
    material_type: materialType,
    primary_material_type: materialType,
    secondary_material_types: Array.isArray(input.secondary_material_types) ? input.secondary_material_types : [],
    is_mixed_material: typeof input.is_mixed_material === 'boolean' ? input.is_mixed_material : false,
    material_components: Array.isArray(input.material_components) ? input.material_components : [],
    format_hint: input.format_hint || 'unknown',
    maturity_level: input.maturity_level || 'C',
    material_summary: input.material_summary || input.summary || '已完成当前阶段诊断。',
    story_core: input.story_core || input.core || '',
    strengths: input.strengths || [],
    main_problems: input.main_problems || input.problems || [],
    priority_revisions: input.priority_revisions || input.suggestions || [],
    next_step: input.next_step || input.nextStep || '建议继续补充和修订材料。',
    conversion_advice: input.conversion_advice || { status: 'not_applicable', summary: '', recommended_action: '' },
    rejection_reason: input.rejection_reason || { code: 'OTHER', message: '' },
    diagnostics: {
      ...(input.diagnostics && typeof input.diagnostics === 'object' ? input.diagnostics : {}),
      stage,
      promptVersion: payload.promptVersion || '',
      stageDecisionHints: input.stageDecisionHints || null
    }
  };
}

function isRepairableFinalError(error) {
  return isFinalOutputValidationError(error) || (
    error instanceof ApiError && error.code === 'AI_RESPONSE_INVALID'
  );
}

function normalizeV1Stage(value) {
  const stage = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return V1_STAGES.has(stage) ? stage : '';
}

function buildMaterialClassificationMessages({ text, userSelectedType, targetFormat }) {
  return [
    {
      role: 'system',
      content: [
        '你是帧火花剧本诊断系统的第零层材料形态分类器。',
        '你只做材料形态分类，不做诊断，不评价优劣，不给修改建议。',
        '只输出 JSON 对象，不输出 Markdown、代码块或解释文字。',
        'JSON 必须且只能包含 materialForm 和 reason 两个字段。',
        '',
        'materialForm 只能是以下枚举之一：',
        'full_script, outline, synopsis, concept, character_bio, worldbuilding, fragment, unknown, reject',
        '',
        '分类规则：',
        '- full_script：完整或较完整剧本，具有多个连续场景、对白、动作描写或明显剧本格式',
        '- outline：有分幕、阶段、章节、主线副线、事件链结构，但不是逐场剧本',
        '- synopsis：概括完整故事走向，有开端、发展、转折、结尾方向，通常没有完整场景对白',
        '- concept：一句话或少量段落，只说明设定、前提、主题或人物处境，缺少完整事件链',
        '- character_bio：以人物背景、经历、性格、人物关系为主',
        '- worldbuilding：以世界规则、制度、时代背景、技术设定、组织、能力体系为主',
        '- fragment：局部场景、对白或段落，看不到完整故事全貌',
        '- unknown：像影视创意材料，但结构信号不足，无法稳定判断',
        '- reject：明显非影视创作材料，例如简历、合同、论文、产品说明、招聘 JD、聊天记录、乱码、无意义重复文本',
        '',
        '特别注意：synopsis 是概括完整故事走向；fragment 是呈现局部场景或片段。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `用户选择类型：${userSelectedType || 'other'}`,
        `目标作品方向：${targetFormat || 'unknown'}`,
        '',
        '请判断下面文本的 materialForm。只返回 JSON：',
        '{"materialForm":"synopsis","reason":"文本以概述性叙述呈现完整故事走向，没有分场对白，属于梗概。"}',
        '',
        '材料正文：',
        String(text || '').slice(0, 6000)
      ].join('\n')
    }
  ];
}

function joinUrl(baseUrl, path) {
  return String(baseUrl).replace(/\/+$/, '') + path;
}
