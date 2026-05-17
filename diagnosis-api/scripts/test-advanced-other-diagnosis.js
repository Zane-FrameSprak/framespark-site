/**
 * 其他创意材料进阶诊断输出稳定性测试
 *
 * 用法：
 *   node scripts/test-advanced-other-diagnosis.js          # 完整测试（需配置 DEEPSEEK_API_KEY）
 *   node scripts/test-advanced-other-diagnosis.js --no-ai  # 仅验证 prompt 结构，不调用 AI
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dir = path.dirname(__filename);
const ROOT = path.join(__dir, '..');

const NO_AI = process.argv.includes('--no-ai');
const CALL_DELAY_MS = 800;

const REQUIRED_FIELDS = ['summary', 'core', 'strengths', 'problems', 'suggestions', 'nextStep'];
const ARRAY_FIELDS = ['strengths', 'problems', 'suggestions'];
const ALLOWED_PREFIXES = ['建议补充材料', '建议继续打磨', '需要重新开发', '可进入下一阶段评估', '暂不适合继续深化'];
// 其他创意材料进阶允许简要提示风险信号，但以下绝对禁止出现
const FORBIDDEN_TERMS = ['没有市场', '拍不出来', '没人投资', '不适合投递'];

const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  gray:   '\x1b[90m',
  bold:   '\x1b[1m'
};
const ok   = `${c.green}✓${c.reset}`;
const fail = `${c.red}✗${c.reset}`;
const skip = `${c.yellow}–${c.reset}`;

// ── 加载模块 ────────────────────────────────────────────────────
const { ADVANCED_OTHER_CASES } = await import('../tests/fixtures/advanced-other-cases.js');
const { buildAdvancedOtherDiagnosisMessages } = await import('../src/prompts/advancedOtherDiagnosis.js');
const { extractJson, normalizeReport } = await import('../src/services/reportParser.js');
const { config } = await import('../src/config.js');

const aiAvailable = !NO_AI && Boolean(config.deepseekApiKey);

// ── 工具函数 ─────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function makeStats(text) {
  return { charCount: text.length, lineCount: text.split('\n').length };
}

// ── prompt 结构验证 ──────────────────────────────────────────────
function validatePromptStructure(messages) {
  const errors = [];
  if (!Array.isArray(messages) || messages.length !== 2) {
    errors.push('messages 应为长度为 2 的数组');
    return errors;
  }
  const [sys, user] = messages;
  if (sys.role !== 'system' || !sys.content.trim())   errors.push('messages[0] 应为非空 system 消息');
  if (user.role !== 'user'  || !user.content.trim())  errors.push('messages[1] 应为非空 user 消息');
  if (!user.content.includes('进阶诊断'))              errors.push('user 消息缺少进阶诊断标注');
  if (!user.content.includes('nextStep'))              errors.push('user 消息缺少 nextStep 字段说明');
  return errors;
}

// ── AI 响应验证 ──────────────────────────────────────────────────
function validateAiResponse(report, testCase) {
  const errors = [];
  const warnings = [];
  const { expectedNextStepPrefixes, shouldMention, shouldNotMention } = testCase;

  for (const field of REQUIRED_FIELDS) {
    if (!(field in report)) errors.push(`缺少字段：${field}`);
  }
  for (const field of ARRAY_FIELDS) {
    if (field in report && !Array.isArray(report[field])) {
      errors.push(`${field} 应为数组，实际类型：${typeof report[field]}`);
    }
  }

  const nextStep = typeof report.nextStep === 'string' ? report.nextStep : '';
  const hasValidPrefix = ALLOWED_PREFIXES.some(p => nextStep.startsWith(p));
  if (!hasValidPrefix) {
    errors.push(`nextStep 前缀不在允许列表内。\n  允许：${ALLOWED_PREFIXES.join(' / ')}\n  实际：${nextStep.slice(0, 50)}`);
  }

  if (expectedNextStepPrefixes?.length > 0) {
    const matchesExpected = expectedNextStepPrefixes.some(p => nextStep.startsWith(p));
    if (!matchesExpected) {
      warnings.push(`nextStep 期望前缀为 [${expectedNextStepPrefixes.join('/')}]，实际：${nextStep.slice(0, 60)}`);
    }
  }

  const fullText = JSON.stringify(report);
  for (const term of [...FORBIDDEN_TERMS, ...(shouldNotMention || [])]) {
    if (fullText.includes(term)) errors.push(`出现禁用词：「${term}」`);
  }
  for (const term of (shouldMention || [])) {
    if (!fullText.includes(term)) warnings.push(`期望出现但未找到：「${term}」`);
  }

  return { errors, warnings };
}

// ── AI 调用（不挂入正式流程，测试专用）──────────────────────────
async function callAdvancedOtherDiagnosis(text) {
  const stats = makeStats(text);
  const messages = buildAdvancedOtherDiagnosisMessages({ text, stats, source: { filename: 'test' } });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.aiTimeoutMs);

  try {
    const response = await fetch(
      String(config.deepseekBaseUrl).replace(/\/+$/, '') + '/chat/completions',
      {
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
      }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error?.message || 'AI 请求失败');
    const content = data?.choices?.[0]?.message?.content || '';
    const raw = extractJson(content);
    return normalizeReport(raw, null);
  } finally {
    clearTimeout(timeout);
  }
}

// ── 单个用例运行 ─────────────────────────────────────────────────
async function runCase(testCase, index, total) {
  const { caseName, inputText } = testCase;
  const label = `[${index + 1}/${total}] ${caseName}`;
  const result = {
    caseName,
    promptCheck: { passed: false, errors: [] },
    aiCheck: { skipped: true, passed: false, errors: [], warnings: [], report: null }
  };

  // Phase 1: prompt 结构
  try {
    const stats = makeStats(inputText);
    const messages = buildAdvancedOtherDiagnosisMessages({ text: inputText, stats, source: { filename: 'test' } });
    const promptErrors = validatePromptStructure(messages);
    result.promptCheck.errors = promptErrors;
    result.promptCheck.passed = promptErrors.length === 0;
  } catch (err) {
    result.promptCheck.errors = [`buildAdvancedOtherDiagnosisMessages 抛出异常：${err.message}`];
  }

  const promptStatus = result.promptCheck.passed ? ok : fail;
  process.stdout.write(`${promptStatus} ${c.bold}${label}${c.reset} prompt${result.promptCheck.errors[0] ? ': ' + result.promptCheck.errors[0] : ''}\n`);

  // Phase 2: AI 验证
  if (NO_AI) {
    process.stdout.write(`   ${skip} ${c.gray}--no-ai，跳过 AI 调用${c.reset}\n`);
    return result;
  }
  if (!aiAvailable) {
    process.stdout.write(`   ${skip} ${c.gray}未配置 DEEPSEEK_API_KEY，跳过 AI 调用${c.reset}\n`);
    return result;
  }

  result.aiCheck.skipped = false;
  try {
    const report = await callAdvancedOtherDiagnosis(inputText);
    result.aiCheck.report = report;
    const { errors, warnings } = validateAiResponse(report, testCase);
    result.aiCheck.errors = errors;
    result.aiCheck.warnings = warnings;
    result.aiCheck.passed = errors.length === 0;
    const aiStatus = result.aiCheck.passed ? ok : fail;
    process.stdout.write(`   ${aiStatus} AI 响应验证${errors[0] ? ': ' + errors[0] : ''}\n`);
    for (const w of warnings) {
      process.stdout.write(`   ${c.yellow}⚠${c.reset} ${c.gray}${w}${c.reset}\n`);
    }
  } catch (err) {
    result.aiCheck.errors = [`AI 调用失败：${err.message}`];
    result.aiCheck.passed = false;
    process.stdout.write(`   ${fail} ${c.red}AI 调用失败：${err.message}${c.reset}\n`);
  }

  return result;
}

// ── 主流程 ───────────────────────────────────────────────────────
async function main() {
  const total = ADVANCED_OTHER_CASES.length;
  const startTime = Date.now();

  console.log(`\n${c.bold}帧火花其他创意材料进阶诊断稳定性测试${c.reset}`);
  console.log(`用例总数：${total}  AI 调用：${NO_AI ? '关闭（--no-ai）' : aiAvailable ? '开启' : '未配置（跳过）'}`);
  console.log('─'.repeat(52));

  const results = [];
  for (let i = 0; i < ADVANCED_OTHER_CASES.length; i++) {
    const result = await runCase(ADVANCED_OTHER_CASES[i], i, total);
    results.push(result);
    if (aiAvailable && i < ADVANCED_OTHER_CASES.length - 1) await sleep(CALL_DELAY_MS);
  }

  const promptFailed = results.filter(r => !r.promptCheck.passed);
  const aiFailed     = results.filter(r => !r.aiCheck.skipped && !r.aiCheck.passed);
  const aiRan        = results.filter(r => !r.aiCheck.skipped);
  const elapsed      = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('─'.repeat(52));
  console.log(`\n${c.bold}测试结果${c.reset}`);
  console.log(`Prompt 结构：${total - promptFailed.length}/${total} 通过${promptFailed.length ? '  失败：' + promptFailed.map(r => r.caseName).join(', ') : ''}`);
  if (aiRan.length > 0) {
    console.log(`AI 响应验证：${aiRan.length - aiFailed.length}/${aiRan.length} 通过${aiFailed.length ? '  失败：' + aiFailed.map(r => r.caseName).join(', ') : ''}`);
  } else {
    console.log('AI 响应验证：已跳过');
  }
  console.log(`总耗时：${elapsed}s\n`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir  = path.join(ROOT, '..', 'test-results', 'advanced-other');
  const outFile = path.join(outDir, `${timestamp}.json`);
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalCases: total,
      promptPassed: total - promptFailed.length,
      aiRan: aiRan.length,
      aiPassed: aiRan.length - aiFailed.length,
      elapsedSeconds: parseFloat(elapsed),
      cases: results
    }, null, 2), 'utf8');
    console.log(`${c.gray}结果已保存至：test-results/advanced-other/${timestamp}.json${c.reset}\n`);
  } catch (err) {
    console.log(`${c.yellow}结果保存失败：${err.message}${c.reset}\n`);
  }

  if (promptFailed.length > 0 || aiFailed.length > 0) process.exit(1);
}

main().catch(err => {
  console.error(`${c.red}测试运行异常：${err.message}${c.reset}`);
  process.exit(1);
});
