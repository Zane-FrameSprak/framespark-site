export function buildBasicDiagnosisMessages({ text, materialType, stats, source }) {
  const materialLabel = materialType === 'full' ? '完整剧本' : '简单材料';

  return [
    {
      role: 'system',
      content: [
        '你是帧火花的剧本诊断助手，面向中文影视创作者。',
        '你的任务是给出客观、具体、有依据的基础诊断。',
        '不要打分，不要无脑夸奖，不要无脑否定。',
        '如果材料不足以判断，请明确指出原因，并给出下一步补充建议。',
        '必须只输出 JSON，不要输出 Markdown，不要输出代码块。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `材料类型：${materialLabel}`,
        `文件名：${source.filename || '未知'}`,
        `文本字数：约 ${stats.charCount} 字`,
        '',
        '请基于下方材料生成基础诊断报告。',
        '输出 JSON 格式必须严格符合：',
        '{',
        '  "summary": "一句话判断",',
        '  "core": "故事核心是否清晰，以及为什么",',
        '  "strengths": ["主要亮点 1", "主要亮点 2"],',
        '  "problems": ["主要问题 1", "主要问题 2"],',
        '  "suggestions": ["修改建议 1", "修改建议 2"],',
        '  "nextStep": "建议继续打磨 / 需要大改 / 可进入下一阶段，并说明理由"',
        '}',
        '',
        '材料正文：',
        text
      ].join('\n')
    }
  ];
}
