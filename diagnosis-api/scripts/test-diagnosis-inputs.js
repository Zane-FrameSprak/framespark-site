/**
 * 诊断输入方式测试
 *
 * 不启动服务，不调用真实 AI，只验证 route 输入解析和粘贴文本进入 materialRouter。
 */

import { resolveDiagnosisInput } from '../src/routes/diagnosis.js';
import { routeMaterial } from '../src/services/materialRouter.js';
import { validateScriptText } from '../src/services/guard.js';
import { validateInputTokenLimit } from '../src/services/tokenCounter.js';
import { ApiError } from '../src/utils/errors.js';

const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  gray:   '\x1b[90m',
  bold:   '\x1b[1m'
};
const ok = `${c.green}✓${c.reset}`;
const fail = `${c.red}✗${c.reset}`;

const featureSynopsis = `长片梗概：《逆光档案》

主角林澈是一名纪录片导演，十年前拍摄矿难事故时因为接受资方施压，删除了关键影像。如今矿难幸存者的女儿找到他，希望他公开当年的素材，证明事故并非天灾。

开场时，林澈正在拍一部企业宣传片，生活稳定却长期失眠。女孩带来父亲留下的旧磁带，里面记录了矿井坍塌前的异常爆破声。林澈起初拒绝介入，因为公开素材会毁掉他现在的工作和家庭关系。

随后，他发现当年删掉的不只是一段影像，而是一串可以指向责任人的时间线。资方开始威胁他，旧同事也劝他不要把所有人拖下水。林澈一边重新寻找原始素材，一边面对自己当年的懦弱。

转折发生在女孩母亲病重之后。林澈意识到这不是补偿一个家庭，而是承认自己曾经参与掩盖真相。最终，他在新片首映现场公开原始影像，让旧案重启，也失去原本的职业安全区。结尾，他独自回到矿区，第一次把镜头对准自己。`;

const cases = [
  {
    name: '文件上传模式仍兼容',
    async run() {
      const input = await resolveDiagnosisInput({
        file: {
          originalname: 'sample.txt',
          mimetype: 'text/plain',
          buffer: Buffer.from(featureSynopsis, 'utf8')
        },
        body: { inputMode: 'file_upload', text: '' }
      });
      assertEqual(input.inputMode, 'file_upload', 'inputMode');
      assertEqual(input.parsed.source.filename, undefined, 'filename is not retained');
      assertEqual(input.parsed.source.type, 'txt', 'source.type');
      assertTruthy(input.parsed.text.includes('逆光档案'), 'parsed.text');
    }
  },
  {
    name: '有文件时优先按文件处理',
    async run() {
      const input = await resolveDiagnosisInput({
        file: {
          originalname: 'priority.txt',
          mimetype: 'text/plain',
          buffer: Buffer.from('文件内容优先。'.repeat(80), 'utf8')
        },
        body: { inputMode: 'pasted_text', text: featureSynopsis }
      });
      assertEqual(input.inputMode, 'file_upload', 'inputMode');
      assertEqual(input.parsed.source.filename, undefined, 'filename is not retained');
      assertTruthy(input.parsed.text.includes('文件内容优先'), 'file text wins');
    }
  },
  {
    name: '粘贴文本模式可以进入 materialRouter',
    async run() {
      const input = await resolveDiagnosisInput({
        body: { inputMode: 'pasted_text', text: featureSynopsis }
      });
      assertEqual(input.inputMode, 'pasted_text', 'inputMode');
      assertEqual(input.parsed.source.filename, undefined, 'filename is not retained');
      assertEqual(input.parsed.source.type, 'pasted_text', 'source.type');

      const routing = await routeMaterial({
        userSelectedType: 'feature',
        text: input.parsed.text,
        originalFileName: input.parsed.source.filename,
        classifier: async () => ({
          materialForm: 'synopsis',
          reason: '文本概括完整故事走向，属于梗概。'
        })
      });
      assertEqual(routing.targetFormat, 'feature', 'targetFormat');
      assertEqual(routing.materialForm, 'synopsis', 'materialForm');
      assertEqual(routing.effectiveDiagnosisType, 'other', 'effectiveDiagnosisType');
      validateScriptText(input.parsed.text, routing);
    }
  },
  {
    name: '粘贴文本为空会被打回',
    async run() {
      let error = null;
      try {
        await resolveDiagnosisInput({
          body: { inputMode: 'pasted_text', text: '   \n\t  ' }
        });
      } catch (err) {
        error = err;
      }
      assertTruthy(error instanceof ApiError, 'ApiError');
      assertEqual(error?.code, 'TEXT_REQUIRED', 'error.code');
    }
  },
  {
    name: 'token 超限会在 provider 前被打回',
    run() {
      let error = null;
      try {
        validateInputTokenLimit('token '.repeat(40), { maxInputTokens: 10 });
      } catch (err) {
        error = err;
      }
      assertTruthy(error instanceof ApiError, 'ApiError');
      assertEqual(error?.code, 'TEXT_TOO_LONG', 'error.code');
    }
  }
];

let failed = 0;

for (const testCase of cases) {
  try {
    await testCase.run();
    console.log(`${ok} ${c.bold}${testCase.name}${c.reset}`);
  } catch (err) {
    failed += 1;
    console.log(`${fail} ${c.bold}${testCase.name}${c.reset}`);
    console.log(`   ${c.red}${err.message}${c.reset}`);
  }
}

if (failed > 0) {
  console.log(`\n${fail} diagnosis input 测试失败：${failed}/${cases.length}\n`);
  process.exit(1);
}

console.log(`\n${ok} diagnosis input 测试通过：${cases.length}/${cases.length}\n`);

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
