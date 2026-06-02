# FrameSpark Diagnosis API

帧火花剧本诊断系统的第一版 MVP 后端骨架。

当前阶段只实现：

- 健康检查接口
- `.txt` / `.docx` 上传
- 粘贴文本提交
- 文本解析
- 基础字数守门
- mock 诊断报告
- DeepSeek / OpenAI 兼容 AI 调用模块骨架

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

如果 `.env` 中没有 `DEEPSEEK_API_KEY`，系统会自动返回 mock 报告。

当前 `.env.example` 使用 `PORT=8788`，用于避开线上 analytics-api 已占用的 `8787`。本地如需使用其他端口，可在 `.env` 中覆盖。

如果要启用真实 AI 诊断，在 `.env` 中填写：

```env
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
AI_TIMEOUT_MS=90000
```

生产环境必须设置 `DEEPSEEK_API_KEY`。`ENABLE_DIAGNOSIS_V1` 默认保持 `false`，不要在未完成回归前擅自开启。

健康检查：

```bash
curl http://127.0.0.1:8788/health
```

上传测试：

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

响应：

```json
{
  "ok": true,
  "report": {
    "summary": "一句话判断",
    "core": "故事核心判断",
    "strengths": ["亮点"],
    "problems": ["问题"],
    "suggestions": ["建议"],
    "nextStep": "下一步判断"
  }
}
```

## 安全原则

- 第一版使用内存上传，不把原始文件落盘。
- 后续接入 DeepSeek / OpenAI 兼容接口时，API Key 只能放在后端环境变量中。
- 不允许在静态官网前端暴露 AI API Key。
- `.env` 不提交到 GitHub。
- 当前公开解析器支持 TXT / DOCX / 粘贴文本，不要提前承诺 PDF 支持。
- 内部评测解析器可能支持文本型 PDF，但这不等于公网诊断链路支持 PDF。
- 如后续支持 PDF，需要单独迁移解析逻辑、补测试和错误提示；扫描版 PDF / OCR 不在当前范围。
- 正式站接入计划见 `DEPLOYMENT.md`。
