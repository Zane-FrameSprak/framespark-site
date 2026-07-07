# FrameSpark Agent Operating Rules

本文件是 FrameSpark 项目的项目级 Codex / Agent 工作规则。后续单次任务优先只写目标、范围和验收标准；通用边界以本文为准。

适用对象：Codex、Claude Code、ChatGPT、其他 AI coding agent。

## 当前项目状态

- 官网当前定位：品牌展示站 + 受限公测入口。
- 诊断系统已进入低额度公开 Beta；普通用户从首页 `进入公测` 获取 24 小时匿名 Cookie session 后进入 `/diagnosis/beta/`。
- 正式 `/diagnosis/` 仍是介绍页，不是上传表单；实际公测表单在 `/diagnosis/beta/`。
- 生产 `POST /api/diagnosis/` 是 live API，但必须受后端 Cookie session、Origin、文件大小、token、每日次数、provider 调用和每日 provider token 预算保护；不得恢复无限制匿名 POST。
- 人才平台和项目详情仍不是普通用户产品流。
- analytics-api 与 diagnosis-api 都有生产后端；两者仍按独立服务和独立部署处理。
- V1 诊断处于内部评测和方案阶段；诊断质量由评审助手判断，Codex 不自行定性。
- Tencent Cloud 正式站通过本地 sudo rsync 同步，不等同于 GitHub push。

## 先读哪些文件

普通任务先读：

- `docs/ai-handoff/PROJECT_CONTEXT.md`
- `docs/ai-handoff/WORKING_RULES.md`
- `docs/ai-handoff/PROJECT_STATE.md`
- `docs/ai-handoff/NEXT_TASKS.md`

高风险任务还要读：

- `docs/ai-handoff/ARCHITECTURE.md`
- `docs/ai-handoff/DECISIONS.md`
- `docs/ai-handoff/CHANGELOG_AI.md`

所有任务开始前先跑或确认：

- `git status -sb`

## 风险分级

### 低风险：可自动闭环

满足用户给定范围时，可以直接检查、修复、commit；如果用户允许 push，也可以 push。

- docs / handoff 小修。
- 静态官网小文案、小 meta、小资源版本号、小 footer 或数据项更新。
- `js/site-data.js` 数据更新，不改变渲染行为。
- 只读检查、状态审计、报告整理。
- internal / docs / eval 的非公网文档或评审材料整理。

### 中风险：小步执行，检查充分

需要保持提交小、范围清楚，运行相关检查。若出现跨边界影响，停止。

- 小测试脚本。
- internal 工具轻量 UI 或只读展示调整。
- sample run 摘要字段、评审文档、内部工作流说明。
- public CSS/JS 小修，但不得绕过或扩大现有公测入口边界。

### 高风险：必须先 Plan，评审/用户确认后再改

不得顺手实现。

- `diagnosis-api/src/routes/diagnosis.js`
- `diagnosis-api/src/services/guard.js`
- `diagnosis-api/src/services/materialRouter.js`
- `diagnosis-api/src/services/diagnosisPipeline.js`
- V1 prompt 源码、D0 gatekeeper、stage decision、runner 接生产链路。
- `ENABLE_DIAGNOSIS_V1`、`ENABLE_V1_STAGED_RUNNER`、`ENABLE_V1_REAL_PROMPTS` 默认值。
- Nginx / SSL / systemd / 数据库 / 密钥 / 服务器配置。
- 用户系统、登录注册、权限、人才平台真实功能。
- 公开诊断入口、生产 `/api/diagnosis` 认证/限额/预算边界。

## 目标模式使用规则

- 用户目标清楚且范围落在低风险：使用目标模式自动推进到检查、commit、必要时 push。
- 任务给了明确提交规则：按规则提交。
- 任务给了明确 push 权限：push。
- 任务未给 deploy 权限：不部署。
- 遇到高风险文件、真实 AI 调用、服务器配置、后端部署、用户系统、公开入口，停止并输出 Plan 或风险说明。
- 不用长篇解释，不重复项目背景；最终报告按用户给的行数限制。

## 允许自动闭环的任务

- 静态官网 P0/P1 小修：可检查、修复、commit、push；如用户明确要求部署，可先 dry-run 再部署。
- docs / handoff / diagnosis 评审文档：可检查、commit、push；不部署。
- internal 只读评审材料、sample-run 摘要文档：可检查、commit、push；不启动服务、不跑真实 AI。
- 已提交 commit 的 push 任务：只跑指定 git 命令，不改文件、不新增 commit。

## 必须停止等待用户或评审助手

- 需要修改 diagnosis-api 高风险链路。
- 需要修改 prompt 源码或 D0 gatekeeper。
- 需要运行真实 AI，而用户未明确允许。
- 真实 AI 调用预计超过本任务上限。
- 需要改 Nginx / SSL / systemd / 数据库 / 密钥。
- 需要部署后端或接生产 `/api/diagnosis`。
- 需要放宽公开诊断入口、提高限额、恢复无保护上传、开放人才申请、用户登录注册。
- 需要判断 V1 诊断质量是否足够，或是否可作为产品结论。
- 需要删除旧规则、旧文档、旧数据或样本原始记录。
- 检查连续失败且原因不清。

## 目录边界

### 常见允许目录

按任务范围允许时可改：

- `docs/`
- `docs/ai-handoff/`
- `docs/diagnosis/`
- `AGENTS.md`
- `.agents/skills/`
- 静态官网文件：`index.html`、`diagnosis/`、`talent/`、`projects/`、`legal/`、`404.html`、`css/`、`js/`、`assets/brand/`

### 默认禁止目录

除非用户明确授权且风险规则允许，否则不改：

- `diagnosis-api/`
- `analytics-api/`
- `internal/`
- `scripts/`
- `.github/`
- `.claude/`
- `.env` 或任何 env 文件。
- 服务器、Nginx、SSL、systemd、数据库、密钥。

## 真实 AI 调用规则

- 默认不运行真实 AI。
- 用户明确允许时，才可运行。
- 一般每个任务最多 2 到 6 次真实 AI 调用；超过上限必须停。
- 不使用真实用户材料，除非用户明确说明材料可用于测试。
- 不输出 API key、完整样本文本、完整 AI 原始响应、完整 reportV1 正文。
- 真实 AI smoke 只证明链路，不证明诊断质量。
- Codex 不负责最终诊断质量判断；由评审助手或用户判断。

## Commit / Push / Deploy 规则

- 每次编辑前确认 `git status -sb`。
- 一个任务一个清晰 commit。
- 只 stage 当前任务相关文件。
- 不提交无关改动。
- 用户未允许 push 时，不 push。
- 用户允许 push 时，push 到当前 main / origin main。
- GitHub push 不等于腾讯云生产部署。
- 用户未明确要求 deploy 时，不部署。
- 静态站部署必须使用既有 sudo rsync dry-run；dry-run 安全后才能正式 rsync。
- 部署不得同步 `.git`、`.github`、`.agents`、`.claude`、`docs`、`diagnosis-api`、`analytics-api`、`internal`、`scripts`、`node_modules`、`test-results`、`CLAUDE.md`、`README.md` 等非公开内容。
- `.user.ini` 必须保留。
- 默认不重启 Nginx，不改 Nginx/SSL。

## 官网上线边界

- 官网可以做静态内容、视觉密度、邮箱、SEO、favicon、OG、manifest、robots、sitemap 小修。
- 不让人才和项目详情看起来已经成为开放产品流。
- 正式 `/diagnosis/` 保持介绍/入口页；不得在该页直接恢复旧上传控件或旧诊断脚本。公测上传表单只允许在受 Cookie/session 保护的 `/diagnosis/beta/`。
- 人才页保持筹备/未开放状态。
- 项目详情页如为开发中内容，保持 noindex 且不进 sitemap。
- 视觉任务必须检查智能引号污染和资源版本号。

## diagnosis-api / V1 边界

- `ENABLE_DIAGNOSIS_V1` 默认 false。
- legacy 字段 `basicReport`、`finalReport`、`report` 必须保留，除非有迁移计划。
- V1 当前重点是 D0 / basic 边界、nextStep 稳定性、basic prompt 忠实材料约束、建议具体化。
- Sample 03 类低成熟度材料是 D0 gatekeeper 回归重点。
- 修改 diagnosis-api 或 prompt 前必须先有 Plan。
- 修改后先跑 no-AI 测试，再按用户确认决定是否真实 AI 回归。
- 不自称 V1 MVP 已可对外，除非评审助手明确批准。

## 内部工具边界

- `internal/` 是本地内部工作台，不部署到公网 webroot。
- internal / eval 工作优先读取 sample-run 摘要，不展示完整用户材料。
- 不从 internal 页面触发真实 AI，除非用户明确确认。
- internal 相关改动可以 commit+push，但不部署官网。

## 安全和隐私

- 不读取或输出密钥。
- 不输出完整用户材料、完整 AI 报告、完整原始响应。
- 不把 docs、internal、backend、scripts、node_modules、test-results 同步到生产 webroot。
- 只做被动安全检查，不做攻击性扫描、爆破、fuzz、压力测试或漏洞利用。
- 发现敏感目录或旧脚本暴露时，按用户授权做最小清理；不顺手删除其他文件。

## 检查习惯

按任务选择最小检查集：

- `git diff --check`
- `node --check js/main.js`
- `node --check js/site-data.js`
- `node --check js/analytics.js`
- `node --check diagnosis-api/...`，仅在 diagnosis-api 任务中使用。
- grep 禁止词、敏感词、本地地址、旧入口、未开放 CTA。
- 静态站部署后用 `curl` 验证关键页面和资源。

## 最终报告格式

- 遵守用户给的行数限制。
- 默认 10 行以内。
- 只报：做了什么、改了哪些文件、检查结果、commit hash、push/deploy 状态、下一步。
- 失败时贴关键错误，不贴长日志。
- 不输出完整 diff。

## 任务完成后必须更新同步文档

每次有实质改动（改代码、改配置、改文档、部署）的任务完成后，**必须**更新以下文件，不得跳过：

- `docs/ai-handoff/PROJECT_STATE.md` — 状态变化（开关、部署版本、已知问题）
- `docs/ai-handoff/NEXT_TASKS.md` — 任务完成/新增/阻塞状态
- `docs/ai-handoff/CHANGELOG_AI.md` — 操作记录，格式 `YYYY-MM-DD (Agent): summary`（详见 `WORKING_RULES.md`）

如果改动涉及架构或重大决策，同时更新 `ARCHITECTURE.md` 和 `DECISIONS.md`。
