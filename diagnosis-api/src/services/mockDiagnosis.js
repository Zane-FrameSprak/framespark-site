export function buildMockDiagnosisReport({ text, materialType, stats, source }) {
  const title = extractLikelyTitle(text) || source.filename || '未命名材料';
  const materialLabel = materialType === 'full' ? '完整剧本' : '简单材料';

  return {
    summary: `已读取《${title}》，当前以 ${materialLabel} 方式生成基础诊断样例。`,
    core: '这是 mock 报告：系统已完成上传、解析和基础守门。后续接入 AI 后，这里会判断故事核心是否清晰、主角目标是否明确、冲突是否成立。',
    strengths: [
      '材料已成功解析为纯文本，具备进入自动诊断流程的基础条件。',
      `当前文本约 ${stats.charCount} 字，行数约 ${stats.lineCount} 行，可用于验证诊断接口闭环。`
    ],
    problems: [
      '当前版本尚未接入真实 AI，因此不会对故事结构、人物、对白或类型完成度做真实判断。',
      '第一版 MVP 暂不保存历史报告，也不生成 Word/PDF 下载文件。'
    ],
    suggestions: [
      '下一步接入 DeepSeek / OpenAI 兼容接口，替换 mock 报告生成模块。',
      '在真实 AI 接入前，先固定基础报告 JSON 结构，避免前端展示反复返工。',
      '正式开放上传前，需要补充用户声明、频率限制和原始文件删除提示。'
    ],
    nextStep: '建议继续开发真实 AI 诊断模块，并保持上传解析、守门、报告生成三个模块相互独立。'
  };
}

function extractLikelyTitle(text) {
  const firstLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  const titleLine = firstLines.find((line) => line.length >= 2 && line.length <= 40);
  if (!titleLine) return '';

  return titleLine.replace(/[《》]/g, '');
}
