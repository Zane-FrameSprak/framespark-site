# FrameSpark 内部诊断评测工作台使用说明

这是 FrameSpark 故事开发诊断系统的内部评测工具，用于本地录入、上传、整理真实样本测试材料。

它不是官网功能，不进入官网导航，不面向公开用户。

## 1. 启动后端 dev API

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

## 2. 启动静态前端

在项目根目录启动静态服务：

```bash
cd /Users/chenzuhuanhuan/framespark-site
python3 -m http.server 8123
```

然后在浏览器打开：

```text
http://127.0.0.1:8123/internal/diagnosis-eval/
```

## 3. 默认使用流程

当前页面优先支持快速测试流程：

1. 打开页面，系统自动准备今日快速测试批次
2. 直接拖入 TXT / DOCX / PDF 文件，或粘贴一段文本
3. 点击保存为样本

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

进入页面后，可以展开“更换 / 新建测试批次”创建新批次。

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

页面会自动准备今日 quick 批次，也可以手动选择其他批次。之后在“粘贴文本样本”区域填写：

- 样本名称，可选
- 样本文本

以下字段在高级设置中，可选填写：

- 目标方向预期
- 材料形态预期
- 预期诊断深度
- 测试重点

点击“保存为样本”后，样本文本会写入当前批次的：

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

每个文件会保存为一个样本。

批量上传默认不要求逐个填写字段。每个文件会自动生成：

- `sampleId`
- `name`：原文件名去扩展名
- `originalFileName`：原文件名
- `targetFormatExpected: "unknown"`
- `materialFormExpected: "unknown"`
- `expectedDiagnosisDepth: "unknown"`
- `testFocus: ""`

如果需要，可以展开“批量高级设置”，把同一组预期字段统一应用到本批文件。

如果一次上传多个文件，页面会询问：

```text
这些文件是否属于同一个故事 / 项目？
```

如果选择“是”，可以填写故事 / 项目名称和文件关系说明。这些信息会写入：

```text
run-meta.json
```

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
  review-notes.md
```

说明：

- `run-meta.json`：批次信息，包含 `sameStory`、`storyName`、`storyRelation`、`notes`
- `samples/`：样本文本
- `samples-index.json`：样本元数据和相对路径，不保存完整正文；PDF 样本会记录 `fileType: "pdf"` 和 `extractedTextLength`
- `samples.md`：便于人工阅读的样本索引
- `results/`：第一版不写入，留给后续诊断结果归档
- `review-notes.md`：人工复盘记录

## 9. 什么不会发生

当前 v1 工作台不会：

- 不调用 AI
- 不调用 `/api/diagnosis`
- 不生成诊断报告
- 不写入 `diagnosis-api/logs/`
- 不读取真实用户诊断日志
- 不加入官网导航
- 不作为公开入口

## 10. 什么不会被提交

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
