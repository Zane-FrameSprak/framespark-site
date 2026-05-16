# FrameSpark Diagnosis API

帧火花剧本诊断系统的第一版 MVP 后端骨架。

当前阶段只实现：

- 健康检查接口
- `.txt` / `.docx` 上传
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

如果要启用真实 AI 诊断，在 `.env` 中填写：

```env
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
AI_TIMEOUT_MS=90000
```

健康检查：

```bash
curl http://127.0.0.1:8787/health
```

上传测试：

```bash
curl -F "materialType=simple" -F "file=@sample.txt" http://127.0.0.1:8787/api/diagnosis
```

## 接口

### `GET /health`

返回 API 状态。

### `POST /api/diagnosis`

请求：

```text
multipart/form-data
file: .txt 或 .docx
materialType: simple | full
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
