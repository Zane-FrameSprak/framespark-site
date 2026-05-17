/**
 * 端到端流水线测试
 *
 * 验证自动分流逻辑：基础诊断 → 是否触发进阶诊断
 * 直接调用 runDiagnosisPipeline，不经过 HTTP 层。
 *
 * 用法：
 *   node scripts/test-e2e-pipeline.js            # 完整测试（需配置 DEEPSEEK_API_KEY）
 *   node scripts/test-e2e-pipeline.js --dry-run  # 验证模块可导入和测试配置，不调用 AI
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dir = path.dirname(__filename);
const ROOT = path.join(__dir, '..');

const DRY_RUN = process.argv.includes('--dry-run');
const CALL_DELAY_MS = 1500; // 每个用例最多 2 次 AI 调用，间距稍长

const REQUIRED_FIELDS = ['summary', 'core', 'strengths', 'problems', 'suggestions', 'nextStep'];
const ARRAY_FIELDS    = ['strengths', 'problems', 'suggestions'];

const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  gray:   '\x1b[90m',
  bold:   '\x1b[1m'
};
const okMark   = `${c.green}✓${c.reset}`;
const failMark = `${c.red}✗${c.reset}`;
const warnMark = `${c.yellow}⚠${c.reset}`;
const skipMark = `${c.yellow}–${c.reset}`;

// ── 测试用例 ─────────────────────────────────────────────────────

const E2E_CASES = [

  // ── 用例 1：基础停止样本（短片内容薄弱，基础诊断不触发进阶） ──
  {
    caseName: 'e2e-basic-stop-漂',
    description: '基础停止样本（短片薄弱，基础诊断不应触发进阶）',
    materialType: 'short',
    expectedInternalStage: 'basic',
    expectedBasicNextStepPrefixes: ['需要大改', '建议继续打磨'],
    inputText: `短片《漂》

城市上班族李明，三十岁，感觉生活没有意义。

第一场：便利店。李明买了一碗泡面，站在收银台前等找零，看着其他顾客。

第二场：地铁。李明靠着车门，看窗外黑暗隧道里自己的倒影。

第三场：公园。他坐在长椅上喂鸽子，鸽子飞走了，他继续坐着。

第四场：宿舍。他拨了妈妈的电话，没人接。他把手机放下。

第五场：宿舍，夜晚。李明关灯，躺下，睁眼看天花板。

片尾字幕：生活还在继续。`
  },

  // ── 用例 2：短片进入进阶样本（夜单，边界样本，basic/advanced 均接受） ──
  {
    caseName: 'e2e-adv-short-夜单',
    description: '短片进入进阶样本（边界样本：basic 或 advanced 均可接受）',
    materialType: 'short',
    expectedInternalStage: ['basic', 'advanced'],
    expectedBasicNextStepPrefixes: ['可进入进阶诊断', '建议继续打磨'],
    inputText: `短片梗概：《夜单》

主角：陈光，二十八岁，外卖员，雨夜接到最后一单。

目标与处境：把一份定制生日蛋糕从城西蛋糕店送到市一医院五楼儿科病房，距离约三公里，距离订单承诺送达时间还有十七分钟。平台规则：超时自动扣除当日全部配送费，共二百三十元。

阻碍：暴雨来袭，路面积水严重，电动车无法通行；蛋糕盒防水袋已有裂缝，徒步有损坏风险。

开场：陈光在蛋糕店取货时，店员说订单备注里写着"麻烦快点，孩子已经等了两个小时"。蛋糕盒里有一张贺卡，封面印着"爸爸送给小宝的八岁生日快乐"。陈光把蛋糕装好，骑车出发。路上暴雨来袭，积水漫上路面，电动车熄火。他打开平台申请延时，系统自动驳回。他拨打下单人电话，电话转入语音信箱——是个男人的声音，录音只有"喂，这里是"四个字，然后中断了。

行动：陈光脱下外套把蛋糕盒裹住，开始徒步。积水齐踝，他穿过两条小巷，中途踩入深坑，差点摔倒，用双手护住蛋糕盒继续跑。到医院门口时超时十二分钟，扣款通知到账。他经过急诊入口，急诊室灯还亮着，走廊上有几个人低头坐着等。

转折：电梯排队，陈光走楼梯上五楼，推开儿科病房的门，找到房间号。女孩大约八岁，一个人坐在床上，桌上有一张手写便条：小宝等我，爸爸今晚一定到。护士低声说：她爸爸昨晚出了事故，家里人还没决定怎么告诉她，她以为爸爸只是堵车。

结尾：陈光把蛋糕盒放到桌上，打开。蛋糕被颠坏了，奶油歪在一边，但蜡烛还在。他向护士借了打火机，把蜡烛一根根点上。女孩看着蜡烛，没有说话。陈光在门口站了一下，说：许个愿吧，生日快乐。然后转身走出去。走廊里，他在楼梯口停了片刻，下楼，骑上车，接了下一单。`
  },

  // ── 用例 3：长片进入进阶样本（冰封档案，边界样本，basic/advanced 均接受） ──
  {
    caseName: 'e2e-adv-feature-冰封档案',
    description: '长片进入进阶样本（边界样本：basic 或 advanced 均可接受）',
    materialType: 'feature',
    expectedInternalStage: ['basic', 'advanced'],
    expectedBasicNextStepPrefixes: ['可进入进阶诊断', '建议继续打磨'],
    inputText: `长片梗概：《冰封档案》

核心架构：双线并行。主线——姜河重查旧案，用职业信用赌一次良知的代价。副线——林小月在父亲案子的阴影下长大，第一次遇到体制内的人主动接触她，必须决定信还是不信，以及这场仗究竟是为谁而打。

主角：姜河，五十二岁，前刑侦队长，因身体原因提前内退，现在在街边修自行车。

第一幕：姜河在旧物里发现十八年前主导的一起灭门案卷宗存在问题——现场指纹比对数据和实际笔录对不上，当年因为上面压力草草结案，林建国（真凶候选人的替代者）被关押至今，还有两年刑满。林建国的女儿林小月（十八岁）一直在申诉，所有渠道都被堵死。姜河主动找到林小月，说：我来重查。林小月拒绝：她父亲的案子就是被他这样的人搞坏的，她不信任任何来自体制内部的人。姜河拿出他私自保留的当年卷宗复印件，说：这份东西我本不该有。林小月看了很久，才答应配合。目标建立：在林建国释放前找到真相，还他清白。

林小月的处境与弧线：她一边打零工维持生活，一边五年来自己整理申诉材料和证人线索。她和父亲几乎没有相处记忆，她不确定自己为他奔走，是为了他，还是为了夺回那段被偷走的时间。这个问题将贯穿她的全片弧线。

第二幕前半：两人分头行动。真正的嫌疑指向当年的地产商魏宏，灭门动机是截走了一份土地出让合同。前任办案同事刘队长找到姜河，警告他：如果当年有问题，责任也会烧到他身上。姜河没有退缩。升级一：林小月按照她自己整理的线索，独立找到了目击证人徐大妈，但徐大妈已被人提前接触过，拒绝开口。因为林小月去找过徐大妈，姜河得以判断：有人一直在盯着这个案子的动向。

第二幕后半：姜河通过财务漏洞找到了魏宏公司的前员工老周，老周手上有当年被截合同的副本。升级二：魏宏得知姜河在查，买通前任局长向姜河施压，内退待遇被暂停，林小月被人在路上当面警告。姜河秘密约见刘队长，以合同副本为筹码试图打开内部渠道——并将会面安排告知了刘队长。老周完成转交三天后在家中意外死亡。关键转折：合同副本在林小月按计划转移途中被劫走，劫走的人准确掌握了时间、地点和接手人——这些信息只有刘队长知道。截获本身就是证明：刘队长是魏宏的人。这一刻，所有内部渠道同时关闭。姜河手上只剩下自己的证词，让证词成为证据的唯一方式，是在任何人再次出手之前用职业信用公开举报。姜河把判断告诉林小月，说：这次只能我去，你退出，你还年轻。林小月沉默了一会，把她整理了五年的申诉材料拿出来：我陪你去。

第三幕：姜河和林小月同时公开举报。刘队长在压力下配合核查，承认当年办案存在程序问题。魏宏被立案，林建国案进入再审程序。

结尾：宣判当天，林建国无罪释放。十八年后，父女在监狱门口第一次真正相见，没有拥抱，只是站着。姜河站在人群外，看了一眼，转身推着自行车离开。路过一个修车摊，停下来，继续干活。`
  },

  // ── 用例 4：其他创意材料进入进阶样本（底片，梗概类，应触发进阶诊断） ─
  {
    caseName: 'e2e-adv-other-底片',
    description: '其他创意材料进入进阶样本（梗概有完整事件链和走向，应触发进阶诊断）',
    materialType: 'other',
    expectedInternalStage: 'advanced',
    expectedBasicNextStepPrefixes: ['可进入进阶诊断'],
    inputText: `故事梗概：《底片》

形态：故事梗概

主角：江谦，三十四岁，婚礼摄影师，半年前因拍摄事故引发纠纷后离职，现在靠做散工还债。

核心前提：江谦决定出售存有十年存档的旧硬盘以还清债务。在整理过程中，他发现五年前拍摄的一场婚礼照片里，有一张被他当时忽视的画面——背景角落里，失踪人口陈子明出现在镜头里，时间戳正是他失踪当晚。陈子明的案子从未破获，他的妹妹陈念还在找他。

目标与阻碍：陈念通过元数据痕迹找到江谦，请求他提供当晚的全部原始照片——这是五年来第一条实际线索。江谦面临的阻碍有三：一，那场婚礼的委托方是他现在债主之一，配合调查意味着关系破裂；二，他开始重新翻看照片时发现婚礼现场有多处细节被他当时主动忽略，有人在拍摄结束前消失了四十分钟，伴郎和陈子明在画面里明显回避彼此；三，随着他开始走访当年宾客，越来越多的人选择沉默，甚至有人明确警告他不要再问。

核心冲突：江谦越查越发现，他当年对那处异常的忽略不只是疏忽——他是察觉了、然后主动选择不追问的。委托方说过一句话，他觉得多管闲事会惹麻烦，就放下了。如果他当时追问，案子或许走向不同。继续查下去，不只是帮陈念，也是逼自己面对那次选择。

走向：江谦整理出关键照片序列，确认有人在婚礼现场对陈子明的行动做出了安排，并找到了一名愿意开口的宾客。他面临最终选择：公开这批照片，意味着他当年的道德逃避也将一并曝光；不公开，陈念五年的寻找到此为止。他选择公开。

适合开发为长片或中等体量网络电影。`
  },

  // ── 用例 5：基础诊断返回「建议补充材料」的样本（停止，不进阶） ──
  {
    caseName: 'e2e-basic-supplement-记忆市场',
    description: '基础停止样本（世界观设定无人物故事，基础诊断应返回「建议补充材料」）',
    materialType: 'other',
    expectedInternalStage: 'basic',
    expectedBasicNextStepPrefixes: ['建议补充材料'],
    inputText: `世界观设定：《记忆市场》

形态：世界观设定

背景：近未来城市，记忆已经可以被提取、存储和交易。人们可以出售自己的记忆，也可以购买他人的记忆来体验。这一技术被称为"印记"，由一家叫做"留痕公司"的企业垄断运营。

技术规则：
- 记忆提取是永久性的。出售之后，原持有人将永远失去那段记忆，但可以获得一笔报酬。
- 购买记忆的人可以选择"体验模式"（如看电影）或"植入模式"（永久植入，如同自己的记忆，但有轻微排异感）。
- 每个人终身可以出售的记忆有上限，超过上限后，人的自我认同感会开始瓦解。
- 记忆有价格分级：情感浓度越高的记忆价格越高，童年创伤类记忆是市场上最贵的品类之一。

社会现象：
- 底层人口大量出售童年记忆来支付生活费，形成了"记忆贫困"现象——他们忘记了自己的来路。
- 富裕阶层购买他人的痛苦记忆作为一种情感消费，"悲剧体验套餐"是高端市场热销品。
- 有一个地下市场专门交易"禁忌记忆"——涉及他人隐私、犯罪或国家机密的记忆。

当前尚未确定的要素：尚未设计具体主角和故事线。`
  }

];

// ── 工具函数 ─────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function makeStats(text) {
  return { charCount: text.length, lineCount: text.split('\n').length };
}

function validateReport(report, label) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (!(field in report)) errors.push(`${label} 缺少字段：${field}`);
  }
  for (const field of ARRAY_FIELDS) {
    if (field in report && !Array.isArray(report[field])) {
      errors.push(`${label}.${field} 应为数组，实际类型：${typeof report[field]}`);
    }
  }
  return errors;
}

// ── 结构验证 ─────────────────────────────────────────────────────
function validatePipelineResult(result, testCase) {
  const errors   = [];
  const warnings = [];

  // 结构完整性：三个必要字段
  if (!result || typeof result !== 'object') {
    errors.push('pipeline 返回值不是对象');
    return { errors, warnings };
  }
  if (!('internalStage' in result)) errors.push('缺少字段：internalStage');
  if (!('basicReport'   in result)) errors.push('缺少字段：basicReport');
  if (!('finalReport'   in result)) errors.push('缺少字段：finalReport');
  if (errors.length > 0) return { errors, warnings };

  // basicReport 字段完整性
  errors.push(...validateReport(result.basicReport,  'basicReport'));

  // finalReport 字段完整性
  errors.push(...validateReport(result.finalReport, 'finalReport'));

  // 软性验证：internalStage 是否符合预期（支持字符串或数组，AI 非确定性）
  const { expectedInternalStage, expectedBasicNextStepPrefixes } = testCase;
  if (expectedInternalStage) {
    const allowed = Array.isArray(expectedInternalStage) ? expectedInternalStage : [expectedInternalStage];
    if (!allowed.includes(result.internalStage)) {
      warnings.push(`internalStage 期望「${allowed.join('/')}」，实际「${result.internalStage}」`);
    }
  }

  // 软性验证：basicReport.nextStep 是否符合预期
  const basicNextStep = typeof result.basicReport.nextStep === 'string'
    ? result.basicReport.nextStep : '';
  if (expectedBasicNextStepPrefixes?.length > 0) {
    const matchesExpected = expectedBasicNextStepPrefixes.some(p => basicNextStep.startsWith(p));
    if (!matchesExpected) {
      warnings.push(
        `basicReport.nextStep 期望前缀 [${expectedBasicNextStepPrefixes.join('/')}]，` +
        `实际：${basicNextStep.slice(0, 60)}`
      );
    }
  }

  return { errors, warnings };
}

// ── 单个用例运行 ─────────────────────────────────────────────────
async function runCase(testCase, runDiagnosisPipeline, index, total) {
  const { caseName, description, materialType, inputText } = testCase;
  const label = `[${index + 1}/${total}] ${caseName}`;

  const result = {
    caseName,
    description,
    configCheck: { passed: false, errors: [] },
    pipelineCheck: { skipped: true, passed: false, errors: [], warnings: [], result: null }
  };

  // Phase 1: 配置检查（测试用例结构）
  const configErrors = [];
  if (!materialType) configErrors.push('缺少 materialType');
  if (!inputText?.trim()) configErrors.push('缺少 inputText');
  if (!testCase.expectedInternalStage) configErrors.push('缺少 expectedInternalStage');
  result.configCheck.errors = configErrors;
  result.configCheck.passed = configErrors.length === 0;

  const configStatus = result.configCheck.passed ? okMark : failMark;
  process.stdout.write(
    `${configStatus} ${c.bold}${label}${c.reset}  ${c.gray}${description}${c.reset}` +
    (configErrors[0] ? `\n   ${failMark} 配置错误：${configErrors[0]}` : '') +
    '\n'
  );

  if (DRY_RUN) {
    process.stdout.write(`   ${skipMark} ${c.gray}--dry-run，跳过 AI 调用${c.reset}\n`);
    return result;
  }

  // Phase 2: 流水线调用
  result.pipelineCheck.skipped = false;
  try {
    const stats   = makeStats(inputText);
    const payload = { text: inputText, materialType, stats, source: { filename: 'e2e-test' } };
    const pipelineResult = await runDiagnosisPipeline(payload);
    result.pipelineCheck.result = pipelineResult;

    const { errors, warnings } = validatePipelineResult(pipelineResult, testCase);
    result.pipelineCheck.errors   = errors;
    result.pipelineCheck.warnings = warnings;
    result.pipelineCheck.passed   = errors.length === 0;

    const pStatus = result.pipelineCheck.passed ? okMark : failMark;
    const stage   = pipelineResult?.internalStage ?? '?';
    const ns      = pipelineResult?.basicReport?.nextStep?.slice(0, 40) ?? '';
    process.stdout.write(`   ${pStatus} internalStage=${stage}  basicNextStep: ${ns}\n`);
    for (const e of errors)   process.stdout.write(`   ${failMark} ${c.red}${e}${c.reset}\n`);
    for (const w of warnings) process.stdout.write(`   ${warnMark} ${c.gray}${w}${c.reset}\n`);
  } catch (err) {
    result.pipelineCheck.errors = [`流水线调用失败：${err.message}`];
    result.pipelineCheck.passed = false;
    process.stdout.write(`   ${failMark} ${c.red}流水线调用失败：${err.message}${c.reset}\n`);
  }

  return result;
}

// ── 主流程 ───────────────────────────────────────────────────────
async function main() {
  // 动态加载（需要 dotenv 已在 config.js 中初始化）
  const { runDiagnosisPipeline } = await import('../src/services/diagnosisPipeline.js');
  const { hasAiProvider }        = await import('../src/services/aiClient.js');

  const total     = E2E_CASES.length;
  const aiActive  = !DRY_RUN && hasAiProvider();
  const startTime = Date.now();

  console.log(`\n${c.bold}帧火花端到端流水线测试${c.reset}`);
  console.log(`用例总数：${total}  AI 调用：${DRY_RUN ? '关闭（--dry-run）' : aiActive ? '开启' : '未配置（请设置 DEEPSEEK_API_KEY）'}`);
  console.log('─'.repeat(56));

  if (!DRY_RUN && !aiActive) {
    console.log(`${c.yellow}未配置 DEEPSEEK_API_KEY，无法运行端到端测试。${c.reset}`);
    console.log(`提示：使用 --dry-run 仅验证配置结构。\n`);
    process.exit(1);
  }

  const results = [];
  for (let i = 0; i < E2E_CASES.length; i++) {
    const result = await runCase(E2E_CASES[i], runDiagnosisPipeline, i, total);
    results.push(result);
    if (aiActive && i < E2E_CASES.length - 1) await sleep(CALL_DELAY_MS);
  }

  const configFailed   = results.filter(r => !r.configCheck.passed);
  const pipelineFailed = results.filter(r => !r.pipelineCheck.skipped && !r.pipelineCheck.passed);
  const pipelineRan    = results.filter(r => !r.pipelineCheck.skipped);
  const elapsed        = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('─'.repeat(56));
  console.log(`\n${c.bold}测试结果${c.reset}`);
  console.log(`配置检查：${total - configFailed.length}/${total} 通过` +
    (configFailed.length ? `  失败：${configFailed.map(r => r.caseName).join(', ')}` : ''));
  if (pipelineRan.length > 0) {
    console.log(`流水线验证：${pipelineRan.length - pipelineFailed.length}/${pipelineRan.length} 通过` +
      (pipelineFailed.length ? `  失败：${pipelineFailed.map(r => r.caseName).join(', ')}` : ''));
  } else {
    console.log('流水线验证：已跳过');
  }
  console.log(`总耗时：${elapsed}s\n`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir    = path.join(ROOT, '..', 'test-results', 'e2e-pipeline');
  const outFile   = path.join(outDir, `${timestamp}.json`);
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      dryRun: DRY_RUN,
      totalCases: total,
      configPassed: total - configFailed.length,
      pipelineRan: pipelineRan.length,
      pipelinePassed: pipelineRan.length - pipelineFailed.length,
      elapsedSeconds: parseFloat(elapsed),
      cases: results
    }, null, 2), 'utf8');
    console.log(`${c.gray}结果已保存至：test-results/e2e-pipeline/${timestamp}.json${c.reset}\n`);
  } catch (err) {
    console.log(`${c.yellow}结果保存失败：${err.message}${c.reset}\n`);
  }

  if (configFailed.length > 0 || pipelineFailed.length > 0) process.exit(1);
}

main().catch(err => {
  console.error(`${c.red}测试运行异常：${err.message}${c.reset}`);
  process.exit(1);
});
