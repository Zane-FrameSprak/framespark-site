/**
 * 诊断日志版本字段测试
 *
 * 不调用真实 AI，只验证 logDiagnosisResult 写出的 JSON 包含 versions 字段。
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logDiagnosisResult } from '../src/services/diagnosisLogger.js';
import { diagnosisVersions } from '../src/config/diagnosisVersion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.join(__dirname, '..');

const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  bold:   '\x1b[1m'
};
const ok = `${c.green}✓${c.reset}`;
const fail = `${c.red}✗${c.reset}`;

let failed = 0;

try {
  const entry = await logDiagnosisResult({
    mode: 'mock',
    materialType: 'other',
    materialRouting: {
      userSelectedType: 'other',
      targetFormat: 'unknown',
      materialForm: 'concept',
      effectiveDiagnosisType: 'other',
      reason: '测试材料',
      notice: '',
      classificationSource: 'local',
      localMaterialForm: 'concept',
      aiMaterialForm: null,
      classificationReason: '测试材料'
    },
    inputMode: 'pasted_text',
    parsed: {
      source: {
        filename: 'version-test',
        type: 'pasted_text'
      },
      text: '测试文本'
    },
    stats: {
      charCount: 120,
      lineCount: 1
    },
    result: {
      internalStage: 'basic',
      basicReport: makeReport(),
      finalReport: makeReport()
    }
  });

  assertTruthy(entry, 'entry');
  assertTruthy(entry.id, 'entry.id');
  assertEqual(entry.model, 'mock', 'entry.model');
  assertEqual(entry.materialForm, 'concept', 'entry.materialForm');
  assertTruthy(entry.versions, 'entry.versions');
  assertEqual(entry.versions.diagnosisSystemVersion, diagnosisVersions.diagnosisSystemVersion, 'diagnosisSystemVersion');
  assertEqual(entry.versions.promptVersion, diagnosisVersions.promptVersion, 'promptVersion');
  assertEqual(entry.versions.routerVersion, diagnosisVersions.routerVersion, 'routerVersion');
  assertEqual(entry.versions.reportParserVersion, diagnosisVersions.reportParserVersion, 'reportParserVersion');
  const logPath = path.join(API_ROOT, 'logs', 'diagnosis', 'metadata', 'by-date', entry.createdAt.slice(0, 10), `${entry.id}.json`);
  const saved = JSON.parse(await fs.readFile(logPath, 'utf8'));
  assertEqual(saved.model, 'mock', 'saved.model');
  assertEqual(saved.finalReport, undefined, 'saved.finalReport');
  assertEqual(saved.originalFileName, undefined, 'saved.originalFileName');

  console.log(`${ok} ${c.bold}诊断日志仅保存脱敏元数据和 versions 字段${c.reset}`);
} catch (err) {
  failed += 1;
  console.log(`${fail} ${c.bold}诊断日志版本字段测试失败${c.reset}`);
  console.log(`   ${c.red}${err.message}${c.reset}`);
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${ok} diagnosis log version 测试通过\n`);

function makeReport() {
  return {
    summary: 'summary',
    core: 'core',
    strengths: ['strength'],
    problems: ['problem'],
    suggestions: ['suggestion'],
    nextStep: '建议继续打磨：测试。'
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`);
  }
}

function assertTruthy(value, label) {
  if (!value) {
    throw new Error(`${label} expected truthy value`);
  }
}
