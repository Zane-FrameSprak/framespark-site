const PUBLIC_ERRORS = Object.freeze({
  MATERIAL_REQUIRED: [400, '请粘贴文本，或上传 TXT / DOCX 文件。'],
  TEXT_REQUIRED: [400, '请先粘贴需要诊断的文本。'],
  UNSUPPORTED_FILE_TYPE: [400, '当前仅支持 TXT 和 DOCX 文件。'],
  FILE_TYPE_MISMATCH: [400, '文件类型与扩展名不一致，请重新选择 TXT 或 DOCX 文件。'],
  FILE_CONTENT_INVALID: [400, '文件内容无法安全读取，请重新导出后再试。'],
  FILE_EMPTY: [400, '文件中没有可用文本，请重新选择。'],
  FILE_ENCODING_INVALID: [400, 'TXT 文件必须使用 UTF-8 编码。'],
  FILE_PARSE_FAILED: [400, '文件解析失败，请确认文件未损坏。'],
  FILE_TOO_SHORT: [400, '材料信息不足，请补充后再试。'],
  TEXT_TOO_LONG: [413, '材料超过当前公测支持的 token 长度，请删减或拆分后再提交。'],
  FILE_TOO_LARGE: [413, '文件超过当前公测支持的大小。'],
  DOCX_EXPANSION_LIMIT: [413, 'DOCX 解压后内容过大，请移除图片或改用文本。'],
  MATERIAL_REJECTED: [400, '当前材料不适合进入故事诊断，请补充故事相关内容。'],
  AI_REQUEST_TIMEOUT: [504, '诊断处理超时，本次未生成报告，请稍后再试。'],
  AI_REQUEST_FAILED: [502, '诊断服务暂时不可用，本次未生成报告。'],
  V1_FINAL_OUTPUT_UNSAFE: [503, '本次报告未通过安全校验，请稍后再试。'],
  V1_DIAGNOSIS_FAILED: [503, '本次报告未能安全生成，请稍后再试。'],
  AI_CALL_BUDGET_EXCEEDED: [503, '本次诊断处理已停止，请稍后再试。'],
  PROVIDER_DAILY_LIMIT_EXCEEDED: [503, '今日公测调用额度已达上限。'],
  USAGE_STORE_UNAVAILABLE: [503, '诊断服务暂时无法确认调用额度。'],
  AI_NOT_CONFIGURED: [503, '诊断服务尚未就绪。'],
  V1_REAL_PROMPTS_NOT_CONFIGURED: [503, '诊断服务尚未就绪。'],
  SERVICE_BUSY: [503, '当前公测请求较多，请稍后再试。'],
  RATE_LIMIT_EXCEEDED: [429, '今日公测次数已达上限。'],
  FEEDBACK_RATE_LIMIT_EXCEEDED: [429, '今日反馈提交次数已达上限。'],
  FEEDBACK_EMPTY: [400, '请至少勾选一项或填写补充说明。'],
  INVALID_FEEDBACK_TYPE: [400, '未支持的反馈类型，请稍后再试。'],
  BETA_ACCESS_REQUIRED: [401, '公测访问凭证已失效，请从首页重新进入。'],
  BETA_ACCESS_INVALID: [401, '访问凭证无效或已失效'],
  BETA_ACCESS_RATE_LIMITED: [429, '尝试次数过多，请稍后再试。'],
  ORIGIN_NOT_ALLOWED: [403, '当前请求来源不允许使用诊断公测。']
});

export function getPublicError(error) {
  const code = String(error?.code || 'INTERNAL_ERROR');
  const [status, message] = PUBLIC_ERRORS[code] || [500, '系统暂时无法完成诊断，请稍后再试。'];
  return { status, code, message };
}
