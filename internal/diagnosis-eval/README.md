# 诊断系统测试区使用说明

这是 FrameSpark 故事开发诊断系统的内部评测工具，用于本地录入、上传、整理真实样本测试材料。

它属于 FrameSpark 内部控制台体系，不是官网功能，不进入官网导航，不面向公开用户。

V1 报告质量评测使用 `docs/diagnosis/V1_EVAL_STANDARD.md`。不要仅凭 smoke 成功判断报告可用性。

## 1. 启动后端 dev API（终端 1）

工作台依赖后端 dev-only API。默认情况下该 API 关闭，必须显式开启：

```bash
cd /Users/chenzuhuanhuan/framespark-site/diagnosis-api
ENABLE_DEV_TOOLS=true npm start
```

后端默认地址：

```text
http://127.0.0.1:8787
```

如果没有设置 `ENABLE_DEV_TOOLS=true`，`/api/dev/sample-runs` 不会挂载，页面会提示 dev API 不可用。

## 2. 启动内部控制台（终端 2）

在项目根目录启动本地内部控制台：

```bash
cd /Users/chenzuhuanhuan/framespark-site
node scripts/start-internal-console.js --open
```

然后打开：

```text
http://127.0.0.1:8130/internal/diagnosis-eval/
```

内部页面默认请求：

```text
http://127.0.0.1:8787/api/dev/sample-runs
```

如果后端端口不是 `8787`，可以在页面加载前配置：

```html
<script>
  window.__FRAMESPARK_DEV_API_BASE__ = 'http://127.0.0.1:你的端口';
</script>
```

或者临时修改 `internal/diagnosis-eval/app.js` 顶部的本地 `DEV_API_BASE` 默认值。

## 3. 默认使用流程

当前页面优先支持快速测试流程：

1. 打开页面，系统自动准备今日快速测试批次
2. 直接拖入 TXT / DOCX / PDF 文件，或在大文本框粘贴一段文本
3. 点击“保存为测试样本”
4. 勾选需要测试的样本
5. 点击“运行诊断测试”

目标方向预期、材料形态预期、预期诊断深度和测试重点都属于可选信息，默认会保存为：

```json
{
  "targetFormatExpected": "unknown",
  "materialFormExpected": "unknown",
  "expectedDiagnosisDepth": "unknown",
  "testFocus": ""
}
```

这些字段主要用于后续精细复盘，不是保存样本的必填项。

保存样本不会调用 AI。只有点击“运行诊断测试”时，页面才会调用本地 diagnosis-api 的内部测试接口，并使用当前后端配置执行诊断流程。

## 4. 今日快速测试批次

页面加载后会自动查找当天的 quick 批次：

```text
YYYY-MM-DD-quick-001
```

如果当天已经存在 quick 批次，页面会自动选中；如果不存在，页面会自动创建。

因此，日常快速测试不需要手动新建批次。直接拖入文件或粘贴文本保存即可。

如果保存时当前没有批次，页面也会先自动准备今日 quick 批次，再继续保存样本。

手动批次仍然保留，用于需要分组复盘的测试，例如：

```text
2026-05-21-short-concept-test
2026-05-21-feature-outline-review
```

## 5. 创建测试批次

日常测试不需要手动创建批次。进入页面后，可以在底部展开“更换 / 新建测试批次”创建新批次。

默认只需要填写：

- 批次名称，可选
- 是否属于同一个故事 / 项目

高级设置默认折叠，可选填写：

- 故事 / 项目名称，可选
- 文件关系说明，可选，例如“概念 + 梗概 + 人物小传”
- 本轮测试目的 / 备注

创建后，系统会在以下目录生成一个新的测试批次：

```text
diagnosis-api/test-runs/sample-diagnosis/<runId>/
```

`runId` 示例：

```text
2026-05-21-manual-001
2026-05-21-short-concept-test
2026-05-21-short-concept-test-002
```

## 6. 粘贴文本保存样本

页面会自动准备今日 quick 批次，也可以手动选择其他批次。之后在“快速保存测试样本”区域填写：

- 样本名称，可选
- 样本文本

以下字段在高级设置中，可选填写：

- 目标方向预期
- 材料形态预期
- 预期诊断深度
- 测试重点

点击“保存为测试样本”后，样本文本会写入当前批次的：

```text
samples/<sampleId>-<safe-name>.txt
```

样本元数据会写入：

```text
samples-index.json
samples.md
```

## 7. 批量上传 TXT / DOCX / PDF

“批量上传 TXT / DOCX / PDF”区域支持：

- 拖拽多个文件
- 点击选择多个文件
- 支持 `.txt` / `.docx` / `.pdf`
- PDF 仅支持可复制文字的文本型 PDF
- 不支持扫描版 PDF / 图片版 PDF，不做 OCR
- PDF 即使保存成功，也需要查看文本质量状态；低质量提取结果不建议直接用于诊断

每个文件会保存为一个样本。文件列表会显示在大输入区下方。

批量上传默认不要求逐个填写字段。每个文件会自动生成：

- `sampleId`
- `name`：原文件名去扩展名
- `originalFileName`：原文件名
- `targetFormatExpected: "unknown"`
- `materialFormExpected: "unknown"`
- `expectedDiagnosisDepth: "unknown"`
- `testFocus: ""`

如果需要，可以展开“批量高级设置”，把同一组预期字段统一应用到本批文件。

如果一次上传多个文件，页面会在保存前显示轻量确认：

```text
这些文件是否属于同一个故事 / 项目？
```

如果选择“是”，可以填写故事 / 项目名称和文件关系说明。这些信息会写入：

```text
run-meta.json
```

如果不选择，默认按“否，它们是彼此独立的测试样本”处理。

保存时页面会显示明确状态：

- 保存中
- 保存成功：已保存 X 个样本
- 部分失败：成功 X 个，失败 Y 个，并列出失败文件和原因
- 保存失败：显示后端返回的错误信息
- 没有文本或文件时提示先粘贴文本或拖入文件
- dev API 未开启时提示确认 `ENABLE_DEV_TOOLS=true`

## 8. 保存目录结构

每个测试批次目录大致如下：

```text
diagnosis-api/test-runs/sample-diagnosis/<runId>/
  run-meta.json
  run-notes.md
  samples/
    sample-001-name.txt
  samples-index.json
  samples.md
  results/
    result-001-name.json
  results-index.json
  results.md
  review-notes.md
```

说明：

- `run-meta.json`：批次信息，包含 `sameStory`、`storyName`、`storyRelation`、`notes`
- `samples/`：样本文本
- `samples-index.json`：样本元数据和相对路径，不保存完整正文；PDF 样本会记录 `fileType: "pdf"` 和 `extractedTextLength`
- `textQualityStatus`：文本质量状态，可能为 `ok`、`warning`、`failed`
- `textQualityWarnings`：文本质量提示，例如标点比例过高、有效字符比例过低、疑似重复页眉页脚
- `textQualityMetrics`：文本质量指标，包括字数、中文比例、英文比例、标点比例、行数和短行比例
- `samples.md`：便于人工阅读的样本索引
- `results/`：诊断测试完整结果 JSON，不保存样本正文
- `results-index.json`：诊断测试结果索引，保存 summary、core、nextStep、识别形态、诊断深度和结果路径
- `results.md`：便于人工阅读的诊断测试结果摘要
- `review-notes.md`：人工复盘记录

## 9. 诊断测试边界

运行诊断测试会调用本地后端诊断流程。需要注意：

- 只有点击“运行诊断测试”时才会触发。
- 如果本地后端配置了 AI key，会产生真实 AI 调用。
- 如果没有 AI key，会使用 mock 模式。
- 结果保存到当前批次 `results/`，同时更新 `results-index.json` 和 `results.md`。
- 该功能仍是内部工具，不进入官网导航，不作为公开入口。

## 10. 什么不会发生

当前 v1 工作台不会：

- 保存样本时不会调用 AI
- 不自动运行诊断
- 不读取真实用户诊断日志
- 不加入官网导航
- 不作为公开入口

## 11. 什么不会被提交

真实日期测试批次默认被 `.gitignore` 忽略：

```gitignore
diagnosis-api/test-runs/sample-diagnosis/20*/
```

也就是说，类似下面的目录不会默认进入 Git：

```text
diagnosis-api/test-runs/sample-diagnosis/2026-05-21-manual-001/
```

可以提交的是：

- 工作台代码
- README
- 空模板
- 不包含真实素材的说明文件

不应默认提交：

- 真实用户素材
- 未确认授权的剧本文本
- 批量测试产生的日期运行目录

## 11. 安全提醒

这个工作台只适合本地开发阶段使用。线上环境不要开启：

```text
ENABLE_DEV_TOOLS=true
```

如需部署给多人协作使用，必须先补权限、登录、访问控制和更严格的素材隐私策略。
