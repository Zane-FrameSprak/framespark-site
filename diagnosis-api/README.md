# FrameSpark Diagnosis API

帧火花故事开发诊断系统的邀请制 MVP 后端。

当前实现包括：

- 健康检查接口
- `.txt` / `.docx` 上传
- 粘贴文本提交
- 文本解析
- D0 / basic / advanced / final 分阶段诊断
- final 结构校验和单次安全修复
- 公共结果 DTO 与受控错误映射
- 邀请身份、Origin、限流、调用预算和脱敏日志
- 本地 mock 与注入式 DeepSeek 兼容调用

暂不实现：

- 登录
- 历史报告
- Word / PDF 下载
- PDF 解析
- 多轮深度诊断

## 本地运行

```bash
cd diagnosis-api
npm install
cp .env.example .env
npm run dev
```

本地开发在没有 `DEEPSEEK_API_KEY` 时可以返回 mock 报告。生产环境会执行 fail-closed readiness 校验，不能缺 key、不能使用 mock、不能开启 dev tools。

当前 `.env.example` 使用 `PORT=8788`，用于避开线上 analytics-api 已占用的 `8787`。本地如需使用其他端口，可在 `.env` 中覆盖。

如果要启用真实 AI 诊断，在 `.env` 中填写：

```env
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
AI_TIMEOUT_MS=90000
```

`DEEPSEEK_API_KEY` 必须只写入仓库外的生产 env 或本地未提交 `.env`，不要在文档、日志或 Git 中填写真实值。

三个 V1 开关在示例文件中继续默认 `false`。生产邀请 Beta 只有在独立审批后才临时设为 `true`，并同时要求 `FAIL_CLOSED_ON_V1_ERROR=true`、`REQUIRE_BETA_IDENTITY=true` 和 `ENABLE_DEV_TOOLS=false`。

健康检查：

```bash
curl http://127.0.0.1:8788/health
```

本地开发上传测试：

```bash
curl -F "materialType=other" -F "file=@sample.txt" http://127.0.0.1:8788/api/diagnosis
```

## 接口

### `GET /health`

返回 API 状态。

### `POST /api/diagnosis`

请求：

```text
multipart/form-data
file: .txt 或 .docx
materialType: short | feature | other
```

公共成功响应只包含用户需要的字段，例如：

```json
{
  "ok": true,
  "diagnosisId": "...",
  "material": {
    "inputMode": "粘贴文本",
    "charCount": 1200
  },
  "result": {
    "currentStage": { "label": "基础诊断", "summary": "..." },
    "coreIssues": [],
    "revisionDirections": [],
    "missingMaterials": [],
    "strengths": [],
    "nextStep": { "label": "下一步", "detail": "..." }
  }
}
```

公共响应不返回 raw `reportV1`、stage code、prompt version、model、fallback、latency、JSON retry 或内部路由信息。

## 安全原则

- 第一版使用内存上传，不把原始文件落盘。
- 默认只保存 30 天脱敏运行元数据；只有用户单独同意人工复核时，完整材料和报告才最多保留 14 天。
- 生产数据必须位于 `/var/lib/framespark-diagnosis`，不得放入 webroot 或 `/tmp`。
- 后续接入 DeepSeek / OpenAI 兼容接口时，API Key 只能放在后端环境变量中。
- 不允许在静态官网前端暴露 AI API Key。
- `.env` 不提交到 GitHub。
- 当前公开解析器支持 TXT / DOCX / 粘贴文本，不要提前承诺 PDF 支持。
- 内部评测解析器可能支持文本型 PDF，但这不等于公网诊断链路支持 PDF。
- 如后续支持 PDF，需要单独迁移解析逻辑、补测试和错误提示；扫描版 PDF / OCR 不在当前范围。
- 邀请 Beta 源文件位于 `beta-site/`，不进入静态官网部署；未来仅由受保护的 Nginx alias 映射。
- 正式站接入计划见 `DEPLOYMENT.md` 和 `DEPLOYMENT_RUNBOOK.md`。
