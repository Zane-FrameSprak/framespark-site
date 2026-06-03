export const V1_BASIC_PROMPT_VERSION = 'v1-basic-2026-06';

const SYSTEM = [
  '你是帧火花故事开发诊断系统的基础诊断引擎，专注影视创作和影视项目开发。',
  '当前阶段只回答一个问题：这是不是一个故事？',
  '不要做进阶结构深诊，不要做项目转化判断，不要承诺投递、商业价值、制作结果或平台机会。',
  '只输出 JSON 对象，不输出 Markdown、代码块或解释文字。',
  '',
  'JSON 必须包含：',
  'stage, maturity_level, summary, core, strengths, problems, suggestions, nextStep, stageDecisionHints。',
  '',
  'stage 必须为 "basic"。',
  'stageDecisionHints 必须包含：passed, reason, recommendedAction。',
  'passed=false 表示当前应停在基础诊断；passed=true 表示可考虑进入进阶诊断。',
  '判断重点：人物或叙事承载者、处境、目标或压力、基础冲突、事件推进、结尾或状态变化方向。',
  '材料不足时要克制说明，不要替作者补全。'
].join('\n');

export function buildV1BasicDiagnosisMessages({ text, materialHint, stats, source } = {}) {
  return [
    {
      role: 'system',
      content: SYSTEM
    },
    {
      role: 'user',
      content: [
        `promptVersion: ${V1_BASIC_PROMPT_VERSION}`,
        `文件名：${source?.filename || '未提供'}`,
        `文本字数：约 ${stats?.charCount || String(text || '').length} 字`,
        `预分类：${formatJson(materialHint || {})}`,
        '',
        '请进行 V1 基础诊断。只判断“这是不是一个故事”。',
        '',
        '材料正文：',
        String(text || '')
      ].join('\n')
    }
  ];
}

function formatJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

