/**
 * 第零层材料形态路由测试
 *
 * 不调用真实 AI，不写入日志，只验证 materialRouter + guard。
 */

import { routeMaterial } from '../src/services/materialRouter.js';
import { validateScriptText } from '../src/services/guard.js';
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

const shortFullScript = `
《雨停之前》

1. 内 景 小餐馆 夜
雨声很重。阿宁坐在靠窗位置，桌上放着一份没有打开的录取通知。
阿宁：你来晚了。
母亲：车坏在桥上。
阿宁：每次都是桥上。
母亲没有坐下，只把伞靠在门边。

2. 外 景 小餐馆门口 夜
两人站在雨棚下。街道积水，车灯从水面划过。
母亲：你爸那边我去说。
阿宁：不用了，我已经决定不去了。
母亲：你怕他，还是怕自己走出去？
阿宁没有回答，把通知书塞进包里。

3. 内 景 公交车 夜
车里只有三个人。阿宁坐在后排，母亲站在车门边。
广播：下一站，旧码头。
母亲：我年轻的时候，也想走。
阿宁：那你为什么没走？
母亲：因为没人告诉我，不走也会后悔。

4. 外 景 旧码头 清晨
雨停了。阿宁站在码头边，看见第一班船开过来。
母亲把那把旧伞递给她。
阿宁：我不知道会不会回来。
母亲：知道怎么走就行。
阿宁上船。船离岸时，她回头，看见母亲还站在原地。天色一点点亮起来。
`.repeat(3);

const featureFullScript = `
《沉默档案》

1. 内 景 档案室 夜
退休警察周岚打开封存二十年的卷宗。照片背面写着一个陌生地址。
周岚：这不是当年的现场。
年轻警员：卷宗已经结案了。
周岚：结案不等于真相。

2. 外 景 老城区 日
周岚找到当年的证人。证人开门后立刻关门。
证人：别再问了，他们还在。
周岚：谁还在？
证人从门缝塞出一张车票，上面是二十年前案发当晚的日期。

3. 内 景 医院 走廊 夜
周岚的旧搭档劝她停止调查。
搭档：你继续查，先毁掉的是你自己。
周岚：我已经被这个案子毁过一次。
搭档沉默，递给她一份丢失的验尸记录。

4. 外 景 废弃工厂 夜
周岚追踪车票线索来到工厂。她发现真正死者身份被调换，所谓凶手只是替罪羊。
枪声响起。周岚躲进暗处，录音笔还在工作。

5. 内 景 听证会 日
周岚公开录音和验尸记录。旧案重启。她走出会场，看见替罪羊的女儿站在人群外。
女孩：我爸能回来吗？
周岚：我不知道。但这次他们必须回答。
`.repeat(3);

const noAiClassifier = async () => {
  throw new Error('mock classifier disabled for local material-router test');
};

const cases = [
  {
    name: 'feature + 长片梗概',
    userSelectedType: 'feature',
    text: `长片梗概：《逆光档案》

主角林澈是一名纪录片导演，十年前拍摄矿难事故时因为接受资方施压，删除了关键影像。如今矿难幸存者的女儿找到他，希望他公开当年的素材，证明事故并非天灾。

开场时，林澈正在拍一部企业宣传片，生活稳定却长期失眠。女孩带来父亲留下的旧磁带，里面记录了矿井坍塌前的异常爆破声。林澈起初拒绝介入，因为公开素材会毁掉他现在的工作和家庭关系。

随后，他发现当年删掉的不只是一段影像，而是一串可以指向责任人的时间线。资方开始威胁他，旧同事也劝他不要把所有人拖下水。林澈一边重新寻找原始素材，一边面对自己当年的懦弱。

转折发生在女孩母亲病重之后。林澈意识到这不是补偿一个家庭，而是承认自己曾经参与掩盖真相。最终，他在新片首映现场公开原始影像，让旧案重启，也失去原本的职业安全区。结尾，他独自回到矿区，第一次把镜头对准自己。`,
    expect: { materialForm: 'synopsis', effectiveDiagnosisType: 'other', targetFormat: 'feature', guardPass: true }
  },
  {
    name: 'short + 一句话概念',
    userSelectedType: 'short',
    text: '如果一个外卖员每送出一份订单，就会失去一段关于家人的记忆，他必须在最后一单和保留母亲临终声音之间做选择。这是一个关于劳动、亲情和记忆交换的短片概念，核心矛盾是他越努力工作，越接近彻底忘记自己为什么工作。',
    expect: { materialForm: 'concept', effectiveDiagnosisType: 'other', targetFormat: 'short', guardPass: true }
  },
  {
    name: 'short + 过短概念打回',
    userSelectedType: 'short',
    text: '如果一个人每天醒来都忘记昨天，会怎样？',
    expect: { materialForm: 'concept', effectiveDiagnosisType: 'other', targetFormat: 'short', guardPass: false, errorCode: 'FILE_TOO_SHORT' }
  },
  {
    name: 'short + 极短故事前提（最后的烤冷面）',
    userSelectedType: 'short',
    text: `拆迁区最后一夜，卖烤冷面的老周遇到一个离家出走的女孩。女孩说，只要他帮她躲过来找人的父亲，她就告诉他一个关于老街的秘密。老周知道，帮她会错过搬家货车，也可能被误解；不帮她，女孩会被带走。天亮前，女孩消失了，只在摊车上留下一幅画。老周推着空车驶向新城区。`,
    expect: { materialForm: 'concept', effectiveDiagnosisType: 'other', targetFormat: 'short', guardPass: true }
  },
  {
    name: 'short + 完整短片剧本',
    userSelectedType: 'short',
    text: shortFullScript,
    expect: { materialForm: 'full_script', effectiveDiagnosisType: 'short', targetFormat: 'short', guardPass: true, classificationSource: 'local' }
  },
  {
    name: 'feature + 完整长片材料',
    userSelectedType: 'feature',
    text: featureFullScript,
    expect: { materialForm: 'full_script', effectiveDiagnosisType: 'feature', targetFormat: 'feature', guardPass: true }
  },
  {
    name: '世界观设定',
    userSelectedType: 'other',
    text: `世界观设定：《记忆市场》

背景设定：近未来城市中，记忆可以被提取、封存、转让和拍卖。所有合法交易都由留痕公司垄断，地下市场则流通被禁止的犯罪记忆和隐私记忆。

技术规则：出售记忆是不可逆的。体验模式只会短暂感受他人的经历，植入模式会永久改变购买者的自我认知。每个人每年只能出售三段记忆，超过上限会出现身份瓦解。

制度规则：底层人群大量出售童年记忆换取生活费，富裕阶层购买痛苦记忆作为情感消费。政府用公益名义收集重大灾难幸存者记忆，形成新的档案权力。

组织设定：留痕公司、地下剪辑师、记忆清洁员和失忆者互助会构成主要力量。当前尚未确定具体主角和故事线。`,
    expect: { materialForm: 'worldbuilding', effectiveDiagnosisType: 'other', targetFormat: 'unknown', guardPass: true, classificationSource: 'local' }
  },
  {
    name: '片段文本',
    userSelectedType: 'short',
    text: `1. 内 景 楼道 夜
声控灯忽明忽暗。小雅抱着纸箱站在门口，钥匙插不进去。
小雅：你换锁了？
屋内没有回应。
小雅：我只是回来拿护照。
父亲：护照不在这。
小雅：那你开门。
父亲：你先把箱子放下。
小雅沉默，把纸箱放在地上。箱子里露出一双旧舞鞋。
父亲：你妈说，别再跳了。
小雅：她已经走了三年。
父亲没有回答。楼道灯灭了，只剩门缝里一点光。
小雅重新抱起纸箱，转身下楼。走到半层时，她听见门锁轻轻响了一下，但门没有打开。
她停了几秒，继续往下走。楼上的光再次熄灭。
楼下传来电动车驶过的声音。小雅走到单元门口，雨已经停了。她从箱子里拿出那双旧舞鞋，放进垃圾桶，又在手松开前把它拿回来。
手机响起，是陌生号码。她看了一眼，没有接。楼道里父亲咳嗽了一声，声音很轻。`,
    expect: { materialForm: 'fragment', effectiveDiagnosisType: 'other', targetFormat: 'short', guardPass: true }
  },
  {
    name: 'short + 局部剧本片段（天台上的宇航员）',
    userSelectedType: 'short',
    text: `1. 外 景 天台 夜
城市的霓虹在远处闪。阿澈穿着旧宇航服坐在水箱旁，头盔放在脚边。
小满推开铁门，手里拿着一只坏掉的录音笔。
小满：你又在这里。
阿澈：这里离月亮近一点。
小满：你明天就要搬走了。
阿澈：所以今晚要完成发射。
小满把录音笔递给他。
小满：这是你妈留下的。
阿澈没有接。
阿澈：她说过，宇航员不能回头。
小满：她还说过，你不是宇航员。
风吹动塑料旗。楼下传来搬家公司关门的声音。
阿澈终于按下录音笔，里面只有一段很长的杂音，像海浪。
小满：你听见了吗？
阿澈：听见了。
小满：是什么？
阿澈抬头看月亮。
阿澈：倒计时。
他戴上头盔，站到天台边缘。小满抓住他的袖子，没有说话。
远处烟花响起，录音笔里的杂音被盖过去。
小满慢慢松开手，把那只录音笔放进他的口袋。
小满：明天你还会来吗？
阿澈：宇航员不会回答地面问题。
铁门被风吹得来回撞。两个人都没有再往前一步，只是站在天台边，看着烟花一点点熄灭。`,
    expect: { materialForm: 'fragment', effectiveDiagnosisType: 'other', targetFormat: 'short', guardPass: true }
  },
  {
    name: '无关简历材料',
    userSelectedType: 'feature',
    text: `个人简历
姓名：张三
求职意向：产品经理
教育经历：某大学工商管理专业
工作经历：负责产品需求文档、竞品分析和项目排期
项目经验：电商后台管理系统、会员积分系统
自我评价：沟通能力强，执行力强，熟悉产品说明、用户调研和数据分析。`,
    expect: { materialForm: 'reject', effectiveDiagnosisType: 'reject', targetFormat: 'feature', guardPass: false, errorCode: 'MATERIAL_REJECTED', classificationSource: 'local' }
  }
];

let failed = 0;

for (const testCase of cases) {
  const routing = await routeMaterial({
    userSelectedType: testCase.userSelectedType,
    text: testCase.text,
    originalFileName: `${testCase.name}.txt`,
    classifier: noAiClassifier
  });
  const errors = [];

  for (const field of ['materialForm', 'effectiveDiagnosisType', 'targetFormat']) {
    if (routing[field] !== testCase.expect[field]) {
      errors.push(`${field} expected ${testCase.expect[field]}, got ${routing[field]}`);
    }
  }
  if (testCase.expect.classificationSource && routing.classificationSource !== testCase.expect.classificationSource) {
    errors.push(`classificationSource expected ${testCase.expect.classificationSource}, got ${routing.classificationSource}`);
  }

  const guardResult = runGuard(testCase.text, routing);
  if (guardResult.passed !== testCase.expect.guardPass) {
    errors.push(`guardPass expected ${testCase.expect.guardPass}, got ${guardResult.passed}`);
  }
  if (testCase.expect.errorCode && guardResult.errorCode !== testCase.expect.errorCode) {
    errors.push(`errorCode expected ${testCase.expect.errorCode}, got ${guardResult.errorCode}`);
  }

  if (errors.length > 0) {
    failed += 1;
    console.log(`${fail} ${c.bold}${testCase.name}${c.reset}`);
    for (const error of errors) console.log(`   ${c.red}${error}${c.reset}`);
    console.log(`   ${c.gray}${JSON.stringify(routing)}${c.reset}`);
  } else {
    console.log(
      `${ok} ${c.bold}${testCase.name}${c.reset} ` +
      `${c.gray}form=${routing.materialForm} effective=${routing.effectiveDiagnosisType} target=${routing.targetFormat}${c.reset}`
    );
  }
}

const aiCases = [
  {
    name: 'AI 合法返回 materialForm 采用 AI 结果',
    userSelectedType: 'feature',
    text: `长片梗概：《回声档案》

主角是一名声音修复师，她接到一盘二十年前的事故录音。录音里有父亲失踪前最后一句话，也有一个被当年调查忽略的爆炸声。她起初只想修复声音交给委托人，却发现每一段杂音都能对应到旧案现场的一个细节。

随着她重新走访当年的工厂、医院和幸存者，她发现父亲并不是事故受害者，而是知道真相后主动消失的人。最终，她必须决定公开录音，让母亲多年维持的平静被打破，还是继续让旧案留在沉默里。结尾，她在公开听证会上播放修复后的完整录音。`,
    classifier: async () => ({
      materialForm: 'synopsis',
      reason: '文本概括完整故事走向，属于梗概。'
    }),
    expect: {
      materialForm: 'synopsis',
      aiMaterialForm: 'synopsis',
      classificationSource: 'ai',
      effectiveDiagnosisType: 'other',
      targetFormat: 'feature'
    }
  }
];

for (const testCase of aiCases) {
  const routing = await routeMaterial({
    userSelectedType: testCase.userSelectedType,
    text: testCase.text,
    originalFileName: `${testCase.name}.txt`,
    classifier: testCase.classifier
  });
  const errors = [];

  for (const field of ['materialForm', 'aiMaterialForm', 'classificationSource', 'effectiveDiagnosisType', 'targetFormat']) {
    if (routing[field] !== testCase.expect[field]) {
      errors.push(`${field} expected ${testCase.expect[field]}, got ${routing[field]}`);
    }
  }

  if (errors.length > 0) {
    failed += 1;
    console.log(`${fail} ${c.bold}${testCase.name}${c.reset}`);
    for (const error of errors) console.log(`   ${c.red}${error}${c.reset}`);
    console.log(`   ${c.gray}${JSON.stringify(routing)}${c.reset}`);
  } else {
    console.log(
      `${ok} ${c.bold}${testCase.name}${c.reset} ` +
      `${c.gray}form=${routing.materialForm} ai=${routing.aiMaterialForm} source=${routing.classificationSource}${c.reset}`
    );
  }
}

const fallbackCases = [
  {
    name: 'AI 返回非法 materialForm 回退本地规则',
    userSelectedType: 'short',
    text: '如果一个外卖员每送出一份订单，就会失去一段关于家人的记忆，他必须在最后一单和保留母亲临终声音之间做选择。这是一个关于劳动、亲情和记忆交换的短片概念，核心矛盾是他越努力工作，越接近彻底忘记自己为什么工作。',
    classifier: async () => ({ materialForm: 'bad_form', reason: '非法枚举。' }),
    expect: { materialForm: 'concept', classificationSource: 'fallback', requireEffectiveDiagnosisType: true }
  },
  {
    name: 'AI 调用失败回退本地规则',
    userSelectedType: 'short',
    text: '如果一名保安每天夜里都在同一部坏掉的电梯里听见不同住户的秘密，他必须判断这些声音是求救、幻听，还是整栋楼正在隐藏一场事故。这是一个短片故事概念，暂时只有前提和人物处境。',
    classifier: async () => {
      throw new Error('mock classifier failed');
    },
    expect: { materialForm: 'concept', effectiveDiagnosisType: 'other', classificationSource: 'fallback' }
  }
];

for (const testCase of fallbackCases) {
  const routing = await routeMaterial({
    userSelectedType: testCase.userSelectedType,
    text: testCase.text,
    originalFileName: `${testCase.name}.txt`,
    classifier: testCase.classifier
  });
  const errors = [];

  for (const field of ['materialForm', 'effectiveDiagnosisType', 'classificationSource']) {
    if (field === 'effectiveDiagnosisType' && testCase.expect.requireEffectiveDiagnosisType) {
      if (!routing.effectiveDiagnosisType) {
        errors.push('effectiveDiagnosisType expected non-empty value');
      }
      continue;
    }
    if (routing[field] !== testCase.expect[field]) {
      errors.push(`${field} expected ${testCase.expect[field]}, got ${routing[field]}`);
    }
  }

  if (errors.length > 0) {
    failed += 1;
    console.log(`${fail} ${c.bold}${testCase.name}${c.reset}`);
    for (const error of errors) console.log(`   ${c.red}${error}${c.reset}`);
    console.log(`   ${c.gray}${JSON.stringify(routing)}${c.reset}`);
  } else {
    console.log(
      `${ok} ${c.bold}${testCase.name}${c.reset} ` +
      `${c.gray}form=${routing.materialForm} effective=${routing.effectiveDiagnosisType} source=${routing.classificationSource}${c.reset}`
    );
  }
}

if (failed > 0) {
  console.log(`\n${fail} materialRouter 测试失败：${failed}/${cases.length + aiCases.length + fallbackCases.length}\n`);
  process.exit(1);
}

console.log(`\n${ok} materialRouter 测试通过：${cases.length + aiCases.length + fallbackCases.length}/${cases.length + aiCases.length + fallbackCases.length}\n`);

function runGuard(text, routing) {
  try {
    validateScriptText(text, routing);
    return { passed: true, errorCode: null };
  } catch (err) {
    if (err instanceof ApiError) {
      return { passed: false, errorCode: err.code };
    }
    throw err;
  }
}
