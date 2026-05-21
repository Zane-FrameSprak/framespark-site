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

## 3. 创建测试批次

进入页面后，可以在左侧“测试批次”区域创建新批次。

可填写：

- 批次名称，可选
- 是否属于同一个故事 / 项目
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

## 4. 粘贴文本保存样本

选择或创建批次后，可以在“粘贴文本样本”区域填写：

- 样本名称
- 目标方向预期
- 材料形态预期
- 预期诊断深度
- 测试重点
- 样本文本

点击“保存为样本”后，样本文本会写入当前批次的：

```text
samples/<sampleId>-<safe-name>.txt
```

样本元数据会写入：

```text
samples-index.json
samples.md
```

## 5. 批量上传 TXT / DOCX

“批量上传 TXT / DOCX”区域支持：

- 拖拽多个文件
- 点击选择多个文件
- 支持 `.txt` / `.docx`
- 不支持 PDF

每个文件会保存为一个样本。

如果一次上传多个文件，页面会询问：

```text
这些文件是否属于同一个故事 / 项目？
```

如果选择“是”，可以填写故事 / 项目名称和文件关系说明。这些信息会写入：

```text
run-meta.json
```

## 6. 保存目录结构

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
- `samples-index.json`：样本元数据和相对路径，不保存完整正文
- `samples.md`：便于人工阅读的样本索引
- `results/`：第一版不写入，留给后续诊断结果归档
- `review-notes.md`：人工复盘记录

## 7. 什么不会发生

当前 v1 工作台不会：

- 不调用 AI
- 不调用 `/api/diagnosis`
- 不生成诊断报告
- 不写入 `diagnosis-api/logs/`
- 不读取真实用户诊断日志
- 不加入官网导航
- 不作为公开入口

## 8. 什么不会被提交

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

## 9. 安全提醒

这个工作台只适合本地开发阶段使用。线上环境不要开启：

```text
ENABLE_DEV_TOOLS=true
```

如需部署给多人协作使用，必须先补权限、登录、访问控制和更严格的素材隐私策略。
