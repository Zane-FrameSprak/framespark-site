import { config } from '../config.js';
import { buildBasicDiagnosisMessages } from '../prompts/basicDiagnosis.js';
import { buildAdvancedShortDiagnosisMessages } from '../prompts/advancedShortDiagnosis.js';
import { buildAdvancedFeatureDiagnosisMessages } from '../prompts/advancedFeatureDiagnosis.js';
import { buildAdvancedOtherDiagnosisMessages } from '../prompts/advancedOtherDiagnosis.js';
import { ApiError } from '../utils/errors.js';
import { extractJson, isCriticallyMissing, normalizeReport, validateFields } from './reportParser.js';

const ADVANCED_BUILDERS = {
  short:   buildAdvancedShortDiagnosisMessages,
  feature: buildAdvancedFeatureDiagnosisMessages,
  other:   buildAdvancedOtherDiagnosisMessages
};

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

async function makeRequest(messages) {
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
        temperature: 0.2,
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

function joinUrl(baseUrl, path) {
  return String(baseUrl).replace(/\/+$/, '') + path;
}
