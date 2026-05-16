import { config } from '../config.js';
import { buildBasicDiagnosisMessages } from '../prompts/basicDiagnosis.js';
import { ApiError } from '../utils/errors.js';

export function hasAiProvider() {
  return Boolean(config.deepseekApiKey);
}

export async function generateDiagnosisReport(payload) {
  if (!hasAiProvider()) {
    throw new ApiError(500, 'AI_NOT_CONFIGURED', 'AI 服务尚未配置。');
  }

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
        messages: buildBasicDiagnosisMessages(payload),
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

    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';

    return normalizeReport(parseReportJson(content));
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(504, 'AI_REQUEST_TIMEOUT', 'AI 诊断超时，请稍后再试。');
    }

    if (err instanceof ApiError) {
      throw err;
    }

    throw new ApiError(502, 'AI_REQUEST_FAILED', 'AI 诊断请求失败，请稍后再试。');
  } finally {
    clearTimeout(timeout);
  }
}

function parseReportJson(content) {
  if (!content) {
    throw new ApiError(502, 'AI_RESPONSE_INVALID', 'AI 返回内容为空。');
  }

  try {
    return JSON.parse(content);
  } catch (err) {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new ApiError(502, 'AI_RESPONSE_INVALID', 'AI 返回格式无法解析。');
    }

    try {
      return JSON.parse(match[0]);
    } catch (innerErr) {
      throw new ApiError(502, 'AI_RESPONSE_INVALID', 'AI 返回 JSON 格式无效。');
    }
  }
}

function normalizeReport(report) {
  return {
    summary: stringOrFallback(report.summary, '已生成基础诊断。'),
    core: stringOrFallback(report.core, '暂未形成故事核心判断。'),
    strengths: arrayOfStrings(report.strengths),
    problems: arrayOfStrings(report.problems),
    suggestions: arrayOfStrings(report.suggestions),
    nextStep: stringOrFallback(report.nextStep, '建议继续补充材料并打磨文本。')
  };
}

function arrayOfStrings(value) {
  if (!Array.isArray(value)) return [];
  return value.map(function (item) {
    return String(item || '').trim();
  }).filter(Boolean);
}

function stringOrFallback(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function joinUrl(baseUrl, path) {
  return String(baseUrl).replace(/\/+$/, '') + path;
}
