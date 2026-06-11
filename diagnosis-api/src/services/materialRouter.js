import { classifyMaterialForm } from './aiClient.js';

const VALID_USER_TYPES = new Set(['short', 'feature', 'other']);
const FORM_TYPES = new Set([
  'full_script',
  'outline',
  'synopsis',
  'concept',
  'character_bio',
  'worldbuilding',
  'fragment',
  'unknown',
  'reject'
]);
const CLEAR_LOCAL_FORMS = new Set(['reject', 'full_script', 'worldbuilding', 'character_bio']);

export async function routeMaterial({
  userSelectedType,
  text,
  originalFileName = '',
  signal,
  providerBudget,
  useAiClassification = true,
  classifier = classifyMaterialForm
}) {
  const normalizedUserType = normalizeUserSelectedType(userSelectedType);
  const targetFormat = detectTargetFormat(normalizedUserType, text, originalFileName);
  const localAnalysis = detectMaterialFormByRules(text);

  if (!useAiClassification || !shouldUseAiClassification({ localAnalysis, text, userSelectedType: normalizedUserType, targetFormat })) {
    return buildRoutingResult({
      userSelectedType: normalizedUserType,
      targetFormat,
      materialForm: localAnalysis.materialForm,
      reason: localAnalysis.reason,
      localAnalysis,
      classificationSource: 'local',
      classificationReason: useAiClassification
        ? localAnalysis.reason
        : `V1 staged production uses local pre-classification: ${localAnalysis.reason}`
    });
  }

  try {
    const aiAnalysis = await classifier({
      text,
      userSelectedType: normalizedUserType,
      targetFormat,
      localMaterialForm: localAnalysis.materialForm,
      signal,
      providerBudget
    });
    const aiMaterialForm = normalizeMaterialForm(aiAnalysis?.materialForm);
    if (!aiMaterialForm) {
      throw new Error('AI materialForm is invalid.');
    }
    const guardedAiAnalysis = guardAiMaterialForm({
      text,
      aiMaterialForm,
      aiReason: String(aiAnalysis.reason || '').trim(),
      localAnalysis
    });

    return buildRoutingResult({
      userSelectedType: normalizedUserType,
      targetFormat,
      materialForm: guardedAiAnalysis.materialForm,
      reason: guardedAiAnalysis.reason,
      localAnalysis,
      aiMaterialForm,
      classificationSource: guardedAiAnalysis.classificationSource,
      classificationReason: guardedAiAnalysis.classificationReason
    });
  } catch (err) {
    return buildRoutingResult({
      userSelectedType: normalizedUserType,
      targetFormat,
      materialForm: localAnalysis.materialForm,
      reason: localAnalysis.reason,
      localAnalysis,
      aiError: err,
      classificationSource: 'fallback',
      classificationReason: `轻量 AI 分类失败，已回退本地规则：${err.message}`
    });
  }
}

function guardAiMaterialForm({ text, aiMaterialForm, aiReason, localAnalysis }) {
  const normalized = normalizeText(text);
  const charCount = normalized.replace(/\s/g, '').length;
  const hasShortPremise = isShortStoryPremise(normalized.slice(0, 5000), charCount);

  if (aiMaterialForm === 'synopsis' && charCount < 300) {
    if (localAnalysis.materialForm === 'concept') {
      return {
        materialForm: 'concept',
        reason: localAnalysis.reason,
        classificationSource: 'guarded_ai',
        classificationReason: `AI 返回 synopsis，但文本少于 300 字且本地已识别为 concept，已按短概念边界保留 concept。AI 理由：${aiReason || '未提供'}`
      };
    }

    if (localAnalysis.materialForm === 'unknown' && hasShortPremise) {
      return {
        materialForm: 'concept',
        reason: '文本少于 300 字，但已具备人物/主体、处境/设定、压力/冲突/代价或事件方向等最小故事前提，按概念处理。',
        classificationSource: 'guarded_ai',
        classificationReason: `AI 返回 synopsis，但文本少于 300 字且具备短概念前提信号，已降级为 concept。AI 理由：${aiReason || '未提供'}`
      };
    }

    return {
      materialForm: localAnalysis.materialForm,
      reason: localAnalysis.reason,
      classificationSource: 'guarded_ai',
      classificationReason: `AI 返回 synopsis，但文本少于 300 字，已回退本地 ${localAnalysis.materialForm}，由 guard 继续判断准入。AI 理由：${aiReason || '未提供'}`
    };
  }

  return {
    materialForm: aiMaterialForm,
    reason: aiReason || localAnalysis.reason,
    classificationSource: 'ai',
    classificationReason: aiReason || 'AI 完成材料形态识别。'
  };
}

function buildRoutingResult({
  userSelectedType,
  targetFormat,
  materialForm,
  reason,
  localAnalysis,
  aiMaterialForm = null,
  aiError = null,
  classificationSource,
  classificationReason
}) {
  const normalizedForm = normalizeMaterialForm(materialForm) || 'unknown';
  const effectiveDiagnosisType = getEffectiveDiagnosisType(normalizedForm, targetFormat);

  return {
    userSelectedType,
    targetFormat,
    materialForm: normalizedForm,
    effectiveDiagnosisType,
    reason,
    notice: buildNotice({ normalizedUserType: userSelectedType, targetFormat, materialForm: normalizedForm, effectiveDiagnosisType }),
    classificationSource,
    localMaterialForm: localAnalysis.materialForm,
    aiMaterialForm,
    classificationReason,
    ...(aiError ? { classificationError: aiError.message } : {})
  };
}

function normalizeUserSelectedType(value) {
  return VALID_USER_TYPES.has(value) ? value : 'other';
}

function detectTargetFormat(userSelectedType, text, originalFileName) {
  if (userSelectedType === 'short') return 'short';
  if (userSelectedType === 'feature') return 'feature';

  const sample = `${originalFileName}\n${text}`.slice(0, 2000);
  if (/(短片|短剧本|微电影|short film|short script)/i.test(sample)) return 'short';
  if (/(长片|院线电影|网络电影|电影剧本|剧集|series|feature film|feature script)/i.test(sample)) return 'feature';
  return 'unknown';
}

export function detectMaterialFormByRules(text) {
  const normalized = normalizeText(text);
  const compact = normalized.replace(/\s/g, '');
  const charCount = compact.length;
  const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
  const firstPart = normalized.slice(0, 5000);

  if (!charCount) {
    return { materialForm: 'reject', reason: '文本为空，无法识别为影视创意材料。' };
  }
  if (isLowSignalText(compact)) {
    return { materialForm: 'reject', reason: '文本存在明显重复或无意义字符，无法形成有效诊断。' };
  }

  const scriptScore = getScriptFormatScore(lines, normalized);
  const sceneCount = countSceneHeadings(lines);
  const dialogueCount = countDialogueLines(lines);
  const hasScriptFormat = scriptScore >= 4 || sceneCount >= 2 || dialogueCount >= 6;
  const hasCreativeMaterialSignal = hasScriptFormat || looksLikeCreativeMaterial(firstPart);

  if (isClearlyUnrelated(firstPart) && !hasCreativeMaterialSignal) {
    return { materialForm: 'reject', reason: '文本更接近简历、合同、论文、产品说明或聊天记录，不适合按影视创意材料诊断。' };
  }

  if (hasScriptFormat && isLikelyFullScript({ text: firstPart, sceneCount, dialogueCount, charCount })) {
    return { materialForm: 'full_script', reason: '文本包含明显剧本格式，并呈现多场推进、故事阶段或结尾方向，按完整剧本材料处理。' };
  }
  if (hasScriptFormat) {
    return { materialForm: 'fragment', reason: '文本包含剧本格式或对白场景，但只呈现局部段落，未显示完整故事走向。' };
  }

  const outlineScore = countMatches(firstPart, [
    /第一幕|第二幕|第三幕|第四幕/g,
    /第[一二三四五六七八九十]+章/g,
    /开端|发展|高潮|结局|起承转合/g,
    /主线|副线|A线|B线|支线/g,
    /阶段[一二三四五六七八九十]|第一阶段|第二阶段|第三阶段/g,
    /人物弧线|结构|转折点/g
  ]);
  if (outlineScore >= 2) {
    return { materialForm: 'outline', reason: '文本具有分幕、阶段、章节、主线副线或起承转合等结构标记，按大纲处理。' };
  }

  const worldbuildingScore = countMatches(firstPart, [
    /世界观|背景设定|时代背景|近未来|架空|规则|制度|体系/g,
    /组织|公司|阶层|能力|技术|协议|市场|城市/g,
    /规则[:：]|技术规则|社会现象|设定[:：]/g
  ]);
  const characterScore = countMatches(firstPart, [
    /人物小传|人物设定|角色小传|角色设定/g,
    /性格|经历|童年|成长|家庭背景|人物关系|内心|创伤/g,
    /年龄|职业|身份|外貌|动机/g
  ]);

  if (worldbuildingScore >= 3 && worldbuildingScore >= characterScore) {
    return { materialForm: 'worldbuilding', reason: '文本主要围绕世界规则、制度、技术、组织或时代背景展开，按世界观设定处理。' };
  }
  if (characterScore >= 4 && characterScore > worldbuildingScore) {
    return { materialForm: 'character_bio', reason: '文本主要围绕人物背景、性格、经历和关系展开，按人物小传处理。' };
  }

  if (isConcept(firstPart, charCount) || isShortStoryPremise(firstPart, charCount)) {
    return { materialForm: 'concept', reason: '文本更接近一句话点子或高概念前提，尚未形成完整故事材料。' };
  }

  const synopsisScore = countMatches(firstPart, [
    /故事梗概|剧情梗概|故事简介|剧情简介|故事概述/g,
    /主角|主人公|他|她/g,
    /目标|处境|阻碍|冲突|危机|转折|真相/g,
    /最终|结尾|最后|结果|走向|选择/g,
    /开场|随后|之后|与此同时|直到|当.+时/g
  ]);
  const hasBeginningAndEnd = /(开场|一开始|故事开始|起初|最初)/.test(firstPart) &&
    /(最终|结尾|最后|结果|走向|选择|真相)/.test(firstPart);
  if (charCount >= 300 && (synopsisScore >= 4 || hasBeginningAndEnd)) {
    return { materialForm: 'synopsis', reason: '文本以概括方式呈现人物、冲突和故事走向，按梗概处理。' };
  }

  if (looksLikeCreativeMaterial(firstPart)) {
    return { materialForm: 'unknown', reason: '文本像影视创意材料，但结构信号不足，暂按其他创意材料处理。' };
  }

  return { materialForm: 'reject', reason: '文本缺少影视故事、人物、场景、设定或创意材料信号，无法进入诊断。' };
}

function shouldUseAiClassification({ localAnalysis, text, userSelectedType, targetFormat }) {
  if (CLEAR_LOCAL_FORMS.has(localAnalysis.materialForm)) return false;

  const charCount = String(text || '').replace(/\s/g, '').length;
  if (localAnalysis.materialForm === 'unknown') return true;

  if (charCount >= 80 && charCount <= 800) {
    if (['synopsis', 'outline', 'fragment', 'concept', 'unknown'].includes(localAnalysis.materialForm)) {
      return true;
    }
  }

  if (
    userSelectedType === 'feature' &&
    targetFormat === 'feature' &&
    ['synopsis', 'outline', 'fragment', 'unknown'].includes(localAnalysis.materialForm)
  ) {
    return true;
  }

  if (
    userSelectedType === 'short' &&
    targetFormat === 'short' &&
    ['concept', 'synopsis', 'fragment', 'unknown'].includes(localAnalysis.materialForm)
  ) {
    return true;
  }

  return false;
}

function normalizeMaterialForm(value) {
  return FORM_TYPES.has(value) ? value : '';
}

function getEffectiveDiagnosisType(materialForm, targetFormat) {
  if (materialForm === 'reject') return 'reject';
  if (materialForm === 'full_script' && targetFormat === 'short') return 'short';
  if (materialForm === 'full_script' && targetFormat === 'feature') return 'feature';
  return 'other';
}

function buildNotice({ normalizedUserType, targetFormat, materialForm, effectiveDiagnosisType }) {
  if (effectiveDiagnosisType === 'reject') {
    return '材料未通过第零层准入，无法生成诊断报告。';
  }
  if (normalizedUserType !== effectiveDiagnosisType && effectiveDiagnosisType === 'other') {
    if (materialForm === 'full_script') {
      return '系统未能确认目标作品类型，已按创意材料诊断。';
    }
    return `系统识别到上传内容更接近${getMaterialFormLabel(materialForm)}，将按创意材料诊断，并保留目标方向 ${targetFormat}。`;
  }
  return '系统已根据材料形态选择当前适合的诊断方式。';
}

function getMaterialFormLabel(materialForm) {
  const labels = {
    full_script: '完整剧本',
    outline: '大纲',
    synopsis: '梗概',
    concept: '概念',
    character_bio: '人物小传',
    worldbuilding: '世界观设定',
    fragment: '片段文本',
    unknown: '未明确形态的创意材料'
  };
  return labels[materialForm] || materialForm;
}

function normalizeText(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function isLowSignalText(compact) {
  if (compact.length < 20) return false;
  const uniqueRatio = new Set([...compact]).size / compact.length;
  if (compact.length >= 80 && uniqueRatio < 0.08) return true;
  return /(.)\1{40,}/.test(compact);
}

function isClearlyUnrelated(text) {
  const groups = [
    [/个人简历|求职意向|工作经历|教育经历|项目经验|自我评价/g, 2],
    [/合同|协议|甲方|乙方|违约责任|付款方式|签订日期/g, 3],
    [/摘要|关键词|参考文献|论文|研究方法|文献综述|实验结果/g, 3],
    [/产品说明|使用说明|参数|规格|售后|保修|安装步骤/g, 3],
    [/招聘|岗位职责|任职要求|薪资|福利|职位描述|JD/g, 3],
    [/聊天记录|微信|群聊|转账|表情|哈哈哈|在吗/g, 3]
  ];
  return groups.some(([pattern, threshold]) => countMatches(text, [pattern]) >= threshold);
}

function getScriptFormatScore(lines, text) {
  let score = 0;
  score += Math.min(countSceneHeadings(lines), 6);
  score += Math.min(countDialogueLines(lines), 10) >= 4 ? 2 : 0;
  if (/（[^）]{0,12}）|【[^】]{0,12}】/.test(text)) score += 1;
  if (/淡入|淡出|切至|转场|画面|镜头|旁白|字幕/.test(text)) score += 1;
  return score;
}

function countSceneHeadings(lines) {
  const scenePattern = /^(\d+[.、]?\s*)?(((内|外)(\s*景)?|内\/外|外\/内)|场景|第[一二三四五六七八九十\d]+场|INT\.|EXT\.)/i;
  return lines.filter(line => scenePattern.test(line)).length;
}

function countDialogueLines(lines) {
  const dialoguePattern = /^([\u4e00-\u9fa5A-Za-z0-9·]{1,12})(（[^）]{0,16}）)?[：:]/;
  return lines.filter(line => dialoguePattern.test(line) && !/^(标题|类型|主题|人物|背景|设定|规则|目标|阻碍|核心|简介|梗概|大纲|姓名|求职意向|教育经历|工作经历|项目经验|自我评价)[：:]/.test(line)).length;
}

function isLikelyFullScript({ text, sceneCount, dialogueCount, charCount }) {
  const storyStageScore = countMatches(text, [
    /开场|一开始|故事开始|起初|最初/g,
    /随后|之后|接着|与此同时|直到|转折|危机|中段/g,
    /最终|结尾|最后|结果|真相|决定|选择/g
  ]);
  const hasBeginningSignal = /(开场|一开始|故事开始|起初|最初|第[一1]场|1[.、\s])/.test(text);
  const hasEndingSignal = /(最终|结尾|最后|结果|真相|决定|选择|离开|消失|留下|走向|上船|重启|公开|天色.*亮|雨停)/.test(text);
  const hasSubstantialSceneChain = sceneCount >= 5 && charCount >= 1800;
  const hasMultipleScenesAndEnding = sceneCount >= 3 && hasEndingSignal;
  const hasStoryStages = sceneCount >= 3 && storyStageScore >= 2;
  const hasLongStoryChain = charCount >= 3000 && sceneCount >= 4 && (storyStageScore >= 1 || dialogueCount >= 12);

  return (hasBeginningSignal && hasMultipleScenesAndEnding) ||
    hasStoryStages ||
    hasSubstantialSceneChain ||
    hasLongStoryChain;
}

function countMatches(text, patterns) {
  return patterns.reduce((total, pattern) => {
    const matches = text.match(pattern);
    return total + (matches ? matches.length : 0);
  }, 0);
}

function isConcept(text, charCount) {
  if (charCount <= 220 && /(如果|假如|一个|讲述|关于|高概念|点子|概念|会怎样|怎么办)/.test(text)) {
    return true;
  }
  return /一句话概念|故事概念|核心概念|创意点子|高概念/.test(text) && charCount <= 600;
}

function isShortStoryPremise(text, charCount) {
  if (charCount < 80 || charCount > 300) return false;

  const signalChecks = [
    /(主角|主人公|男孩|女孩|老人|年轻人|外卖员|保安|父亲|母亲|[一-龥]{1,4}(是一名|是个|在|发现|遇到|必须|不得不))/,
    /(处境|设定|拆迁|最后一夜|城市|老家|医院|学校|餐馆|天台|如果|假如|当.+时|在.+(中|里|时))/,
    /(冲突|压力|代价|阻碍|危机|必须|不得不|否则|但|却|会错过|被误解|被带走|选择)/,
    /(最终|最后|结尾|结果|方向|消失|留下|走向|驶向|决定|选择)/
  ];
  const signalCount = signalChecks.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0);

  return signalCount >= 3;
}

function looksLikeCreativeMaterial(text) {
  return /(故事|剧本|短片|长片|电影|角色|人物|主角|剧情|场景|冲突|设定|世界观|大纲|梗概|概念|片段|对白)/.test(text);
}
