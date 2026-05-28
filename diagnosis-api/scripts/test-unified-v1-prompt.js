/**
 * unifiedDiagnosisV1 prompt boundary tests.
 *
 * These tests do not call real AI. They verify that the V1 prompt contains
 * the classification boundary rules needed for material type judgment.
 */

import { buildUnifiedDiagnosisV1Messages } from '../src/prompts/unifiedDiagnosisV1.js';

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  bold: '\x1b[1m'
};
const ok = `${c.green}✓${c.reset}`;
const fail = `${c.red}✗${c.reset}`;

const promptText = buildUnifiedDiagnosisV1Messages({
  text: '一个剪辑师回到海边小城，寻找父亲未完成电影的真相。',
  targetFormat: 'unknown',
  materialForm: 'unknown',
  materialRouting: {
    reason: '测试路由'
  },
  stats: {
    charCount: 28
  },
  source: {
    filename: 'prompt-boundary-test.txt'
  }
}).map((message) => message.content).join('\n');

const cases = [
  {
    name: 'idea_concept does not cover materials with story direction',
    snippets: [
      'idea_concept 只用于一句话或少量设定',
      '缺少完整起因、过程、结果',
      '缺少清晰人物行动链',
      '不要把已经具备故事走向的材料判成 idea_concept'
    ]
  },
  {
    name: 'synopsis is preferred when cause conflict development or ending tendency exist',
    snippets: [
      'synopsis 指已经概述一个故事走向的材料',
      '主要人物、目标或困境',
      '起因、冲突、发展或结局倾向',
      '应优先判为 synopsis，而不是 idea_concept'
    ]
  },
  {
    name: 'prose_fiction is direct story presentation rather than story summary',
    snippets: [
      'prose_fiction 指以小说或散文叙事方式呈现的材料',
      '场景描写、心理描写、文学化叙述和段落化叙事',
      '不是在概括故事，而是在直接呈现故事片段',
      '不要轻易判为 synopsis'
    ]
  },
  {
    name: 'synopsis vs prose_fiction distinction is explicit',
    snippets: [
      'synopsis vs prose_fiction 的核心区别',
      'synopsis 是“讲这个故事大概发生什么”',
      'prose_fiction 是“直接写出一段故事正在发生”'
    ]
  }
];

let failed = 0;

for (const testCase of cases) {
  const missing = testCase.snippets.filter((snippet) => !promptText.includes(snippet));
  if (missing.length > 0) {
    failed += 1;
    console.log(`${fail} ${c.bold}${testCase.name}${c.reset}`);
    console.log(`   Missing: ${missing.join(' | ')}`);
  } else {
    console.log(`${ok} ${c.bold}${testCase.name}${c.reset}`);
  }
}

if (failed > 0) {
  console.log(`\n${fail} unified V1 prompt tests failed: ${failed}/${cases.length}\n`);
  process.exit(1);
}

console.log(`\n${ok} unified V1 prompt tests passed: ${cases.length}/${cases.length}\n`);
