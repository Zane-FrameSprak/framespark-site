/**
 * 基础诊断输出稳定性测试
 *
 * 用法：
 *   node scripts/test-basic-diagnosis.js          # 完整测试（需配置 DEEPSEEK_API_KEY）
 *   node scripts/test-basic-diagnosis.js --no-ai  # 仅验证 prompt 结构，不调用 AI
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dir = path.dirname(__filename);
const ROOT = path.join(__dir, '..');

// ── 配置 ────────────────────────────────────────────────────
const NO_AI = process.argv.includes('--no-ai');
const CALL_DELAY_MS = 800; // AI 调用间隔，避免触发速率限制

const REQUIRED_FIELDS = ['summary', 'core', 'strengths', 'problems', 'suggestions', 'nextStep'];
const ARRAY_FIELDS = ['strengths', 'problems', 'suggestions'];
const FORBIDDEN_TERMS = ['市场价值', '制作可行性', '投资潜力', '制作难度', '演员适配', '平台投递价值'];

const ALLOWED_PREFIXES = {
  short:   ['建议继续打磨', '需要大改', '可进入进阶诊断'],
  feature: ['建议继续打磨', '需要大改', '可进入进阶诊断', '不适合按长片诊断'],
  other:   ['建议补充材料', '需要大改', '建议继续打磨', '可进入进阶诊断', '不适合按创意材料诊断']
};

// ── 颜色输出 ────────────────────────────────────────────────
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

// ── 加载测试样本 ────────────────────────────────────────────
const { BASIC_DIAGNOSIS_CASES } = await import('../tests/fixtures/basic-diagnosis-cases.js');

// ── 加载诊断模块 ────────────────────────────────────────────
const { buildBasicDiagnosisMessages } = await import('../src/prompts/basicDiagnosis.js');
const { generateDiagnosisReport, hasAiProvider } = await import('../src/services/aiClient.js');
const { extractJson, normalizeReport } = await import('../src/services/reportParser.js');

const aiAvailable = !NO_AI && hasAiProvider();

// ── 工具函数 ─────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeStats(text) {
  return {
    charCount: text.length,
    lineCount: text.split('\n').length
  };
}

// ── 验证 prompt 结构 ─────────────────────────────────────────
function validatePromptStructure(messages, caseName) {
  const errors = [];

  if (!Array.isArray(messages) || messages.length !== 2) {
    errors.push('messages 应为长度为 2 的数组');
    return errors;
  }

  const [systemMsg, userMsg] = messages;

  if (systemMsg.role !== 'system' || typeof systemMsg.content !== 'string' || !systemMsg.content.trim()) {
    errors.push('messages[0] 应为非空 system 消息');
  }
  if (userMsg.role !== 'user' || typeof userMsg.content !== 'string' || !userMsg.content.trim()) {
    errors.push('messages[1] 应为非空 user 消息');
  }
  if (userMsg.content && !userMsg.content.includes('材料类型')) {
    errors.push('user 消息缺少材料类型标注');
  }
  if (userMsg.content && !userMsg.content.includes('nextStep')) {
    errors.push('user 消息缺少 nextStep 字段说明');
  }

  return errors;
}

// ── 验证 AI 响应 ─────────────────────────────────────────────
function validateAiResponse(report, testCase) {
  const errors = [];
  const { materialType, expectedNextStepPrefixes, shouldMention, shouldNotMention } = testCase;

  // 六个必要字段
  for (const field of REQUIRED_FIELDS) {
    if (!(field in report)) {
      errors.push(`缺少字段：${field}`);
    }
  }

  // 数组字段类型检查
  for (const field of ARRAY_FIELDS) {
    if (field in report && !Array.isArray(report[field])) {
      errors.push(`${field} 应为数组，实际类型：${typeof report[field]}`);
    }
  }

  // nextStep 前缀检查
  const nextStep = typeof report.nextStep === 'string' ? report.nextStep : '';
  const allowed = ALLOWED_PREFIXES[materialType] || [];
  const hasValidPrefix = allowed.some(prefix => nextStep.startsWith(prefix));
  if (!hasValidPrefix) {
    errors.push(`nextStep 前缀不在允许列表内。\n  允许：${allowed.join(' / ')}\n  实际：${nextStep.slice(0, 40)}`);
  }

  // expectedNextStepPrefixes 期望检查（软检查，记录但不计入失败）
  const warnings = [];
  if (expectedNextStepPrefixes && expectedNextStepPrefixes.length > 0) {
    const matchesExpected = expectedNextStepPrefixes.some(p => nextStep.startsWith(p));
    if (!matchesExpected) {
      warnings.push(`nextStep 期望前缀为 [${expectedNextStepPrefixes.join('/')}]，实际：${nextStep.slice(0, 40)}`);
    }
  }

  // 禁用词检查（全文搜索）
  const fullText = JSON.stringify(report);
  for (const term of [...FORBIDDEN_TERMS, ...(shouldNotMention || [])]) {
    if (fullText.includes(term)) {
      errors.push(`出现禁用词：「${term}」`);
    }
  }

  // shouldMention 软检查
  for (const term of (shouldMention || [])) {
    if (!fullText.includes(term)) {
      warnings.push(`期望出现但未找到：「${term}」`);
    }
  }

  return { errors, warnings };
}

// ── 单个用例运行 ─────────────────────────────────────────────
async function runCase(testCase, index, total) {
  const { caseName, materialType, inputText } = testCase;
  const label = `[${index + 1}/${total}] ${caseName}`;
  const result = {
    caseName,
    materialType,
    promptCheck: { passed: false, errors: [] },
    aiCheck: { skipped: true, passed: false, errors: [], warnings: [], report: null }
  };

  // Phase 1: prompt 结构验证
  let messages;
  try {
    const stats = makeStats(inputText);
    messages = buildBasicDiagnosisMessages({ text: inputText, materialType, stats, source: { filename: 'test' } });
    const promptErrors = validatePromptStructure(messages, caseName);
    result.promptCheck.errors = promptErrors;
    result.promptCheck.passed = promptErrors.length === 0;
  } catch (err) {
    result.promptCheck.errors = [`buildBasicDiagnosisMessages 抛出异常：${err.message}`];
    result.promptCheck.passed = false;
  }

  const promptStatus = result.promptCheck.passed ? ok : fail;
  process.stdout.write(`${promptStatus} ${c.bold}${label}${c.reset} prompt${result.promptCheck.errors.length ? ': ' + result.promptCheck.errors[0] : ''}\n`);

  // Phase 2: AI 响应验证
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
    const stats = makeStats(inputText);
    const report = await generateDiagnosisReport({ text: inputText, materialType, stats, source: { filename: 'test' } });
    result.aiCheck.report = report;

    const { errors, warnings } = validateAiResponse(report, testCase);
    result.aiCheck.errors = errors;
    result.aiCheck.warnings = warnings;
    result.aiCheck.passed = errors.length === 0;

    const aiStatus = result.aiCheck.passed ? ok : fail;
    process.stdout.write(`   ${aiStatus} AI 响应验证${errors.length ? ': ' + errors[0] : ''}\n`);

    if (warnings.length > 0) {
      for (const w of warnings) {
        process.stdout.write(`   ${c.yellow}⚠${c.reset} ${c.gray}${w}${c.reset}\n`);
      }
    }
  } catch (err) {
    result.aiCheck.errors = [`AI 调用失败：${err.message}`];
    result.aiCheck.passed = false;
    process.stdout.write(`   ${fail} ${c.red}AI 调用失败：${err.message}${c.reset}\n`);
  }

  return result;
}

// ── Phase 0: 解析容错单元测试 ────────────────────────────────
const PARSER_CASES = [
  {
    name: 'JSON 外包说明文字',
    run() {
      const raw = extractJson('以下是诊断结果：{"summary":"好","core":"强","strengths":[],"problems":[],"suggestions":[],"nextStep":"建议继续打磨"}');
      if (raw.summary !== '好') throw new Error('summary 解析错误');
    }
  },
  {
    name: '多 JSON 块取第一个',
    run() {
      const raw = extractJson('{"summary":"第一","core":"A","strengths":[],"problems":[],"suggestions":[],"nextStep":"建议继续打磨"} 说明 {"summary":"第二","core":"B","strengths":[],"problems":[],"suggestions":[],"nextStep":"需要大改"}');
      if (raw.summary !== '第一') throw new Error('应取第一个 JSON 块，实际取到：' + raw.summary);
    }
  },
  {
    name: '数组含空字符串过滤为 []',
    run() {
      const raw = { summary: '好', core: '强', strengths: [''], problems: [''], suggestions: [''], nextStep: '建议继续打磨' };
      const report = normalizeReport(raw, 'short');
      if (report.strengths.length !== 0) throw new Error('空字符串数组应过滤为 []');
    }
  },
  {
    name: 'JSON 被 ```json 包裹',
    run() {
      const raw = extractJson('```json\n{"summary":"好","core":"强","strengths":[],"problems":[],"suggestions":[],"nextStep":"建议继续打磨"}\n```');
      if (raw.core !== '强') throw new Error('core 解析错误');
    }
  },
  {
    name: 'problems 返回字符串而非数组',
    run() {
      const raw = { summary: '好', core: '强', strengths: [], problems: '有一个问题', suggestions: [], nextStep: '建议继续打磨' };
      const report = normalizeReport(raw, 'short');
      if (!Array.isArray(report.problems) || report.problems[0] !== '有一个问题') throw new Error('problems 未强制转为数组');
    }
  },
  {
    name: '缺失 strengths 字段',
    run() {
      const raw = { summary: '好', core: '强', problems: [], suggestions: [], nextStep: '建议继续打磨' };
      const report = normalizeReport(raw, 'short');
      if (!Array.isArray(report.strengths)) throw new Error('strengths 缺失时应填充空数组');
    }
  },
  {
    name: 'nextStep 前缀不合规（短片）',
    run() {
      const raw = { summary: '好', core: '强', strengths: [], problems: [], suggestions: [], nextStep: '市场潜力巨大，建议投资' };
      const report = normalizeReport(raw, 'short');
      if (!report._warnings || !report._warnings.some(w => w.includes('前缀'))) {
        throw new Error('不合规前缀应触发警告');
      }
    }
  }
];

async function runParserTests() {
  console.log(`\n${c.bold}Phase 0：解析容错单元测试${c.reset}`);
  console.log('─'.repeat(52));
  let passed = 0;
  for (const tc of PARSER_CASES) {
    try {
      tc.run();
      console.log(`${ok} ${tc.name}`);
      passed++;
    } catch (err) {
      console.log(`${fail} ${tc.name}：${err.message}`);
    }
  }
  console.log(`─`.repeat(52));
  console.log(`解析测试：${passed}/${PARSER_CASES.length} 通过\n`);
  return passed === PARSER_CASES.length;
}

// ── 主流程 ───────────────────────────────────────────────────
async function main() {
  const total = BASIC_DIAGNOSIS_CASES.length;
  const startTime = Date.now();

  console.log(`\n${c.bold}帧火花基础诊断稳定性测试${c.reset}`);
  console.log(`用例总数：${total}  AI 调用：${NO_AI ? '关闭（--no-ai）' : aiAvailable ? '开启' : '未配置（跳过）'}`);
  console.log('─'.repeat(52));

  const parserOk = await runParserTests();

  const results = [];

  for (let i = 0; i < BASIC_DIAGNOSIS_CASES.length; i++) {
    const testCase = BASIC_DIAGNOSIS_CASES[i];
    const result = await runCase(testCase, i, total);
    results.push(result);
    if (aiAvailable && i < BASIC_DIAGNOSIS_CASES.length - 1) {
      await sleep(CALL_DELAY_MS);
    }
  }

  // ── 统计 ─────────────────────────────────────────────────
  const promptFailed  = results.filter(r => !r.promptCheck.passed);
  const aiFailed      = results.filter(r => !r.aiCheck.skipped && !r.aiCheck.passed);
  const aiRan         = results.filter(r => !r.aiCheck.skipped);
  const elapsed       = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('─'.repeat(52));
  console.log(`\n${c.bold}测试结果${c.reset}`);
  console.log(`Prompt 结构：${total - promptFailed.length}/${total} 通过${promptFailed.length ? `  失败：${promptFailed.map(r => r.caseName).join(', ')}` : ''}`);

  if (aiRan.length > 0) {
    console.log(`AI 响应验证：${aiRan.length - aiFailed.length}/${aiRan.length} 通过${aiFailed.length ? `  失败：${aiFailed.map(r => r.caseName).join(', ')}` : ''}`);
  } else {
    console.log(`AI 响应验证：已跳过`);
  }

  console.log(`总耗时：${elapsed}s\n`);

  // ── 保存测试结果 ──────────────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(ROOT, '..', 'test-results', 'basic-diagnosis');
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
    console.log(`${c.gray}结果已保存至：test-results/basic-diagnosis/${timestamp}.json${c.reset}\n`);
  } catch (err) {
    console.log(`${c.yellow}结果保存失败：${err.message}${c.reset}\n`);
  }

  // 有失败则以非零退出码退出
  if (!parserOk || promptFailed.length > 0 || aiFailed.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`${c.red}测试运行异常：${err.message}${c.reset}`);
  process.exit(1);
});
