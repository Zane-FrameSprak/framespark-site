# V1 Prompt / D0 Gatekeeper Implementation Plan - 2026-06-09

用途：基于 `V1_PROMPT_REVISION_PLAN_2026-06-09.md`，把下一步可能要改的 V1 prompt、D0 gatekeeper、stage decision、nextStep 和 schema 稳定性工作拆成可执行技术计划。

本计划只来自只读代码审查。本轮不修改 `diagnosis-api`，不修改 prompt 源码，不运行真实 AI，不部署，不开放公网入口。

## A. 当前问题归因

### Sample 03：D0 / basic 边界问题

现状归因：

- `v1Gatekeeper.js` 当前主要挡空文本、过短文本、明显非故事材料、合同/简历/技术说明等非故事文本。
- 它没有足够判断“低成熟度故事概念”的规则，例如主角身份不稳定、事件链缺失、只有世界观符号或设定碎片。
- `materialRouter.js` 能把短概念识别为 `concept`，但 concept 仍可能进入 V1 gatekeeper 后被放行到 basic。
- `v1StageDecision.js` 默认只看 stage、passed、score、flags；如果 AI basic 返回 passed=true，就会继续给出 advanced 路径。

结论：

- Sample 03 暴露的是“低成熟度故事概念不应硬进 basic”的边界问题。
- 第一优先级应在 V1 gatekeeper / maturity 判定层处理，而不是先动公网 route 或 guard。

### Sample 01：忠实材料约束问题

现状归因：

- `v1BasicDiagnosis.js` 已写“材料不足时要克制说明，不要替作者补全”，但还不够具体。
- prompt 没有明确要求每个核心判断必须绑定材料依据。
- prompt 没有明确禁止把“可能主题”写成确定主题。
- 因此模型可能把材料里的情绪方向放大成 “atonement / 赎罪” 这类更强判断。

结论：

- Sample 01 应用于测试“忠实材料约束”。
- basic prompt 需要更硬地约束动机、主题、情绪解释，不允许把推测写成确定判断。

### Sample 02：建议泛化问题

现状归因：

- `v1BasicDiagnosis.js` 要求输出 suggestions，但没有要求每条建议绑定具体材料断点。
- `stageDecisionHints` 只要求 passed、reason、recommendedAction，没有规定 recommendedAction 的具体度。
- 因此模型容易输出 character growth / plot structure / theme expression 这种大方向，而不是可执行修改点。

结论：

- Sample 02 可作为“建议具体化”回归样本。
- basic prompt 应要求建议指向具体人物、目标、冲突、机制、事件链或结尾方向。

### JSON retry 是否本轮处理

判断：

- Sample 03 出现 1 次 JSON retry，但最终返回可解析结构，且本批主要问题不是 JSON 解析失败。
- `aiClient.js` 已有 `buildV1StageRetryMessages`，`reportV1Parser.js` 也会 normalize V1 stage raw output。
- 本轮建议先不做深层 schema 重构，只把 nextStep 必填和低成熟度 D0 输出纳入测试。

结论：

- JSON retry 作为 Patch 3 的测试/观察项，不作为 Patch 1 的主改动。

## B. 候选修改文件清单

| 文件 | 当前职责 | 建议修改内容 | 修改风险 | 本轮必须改 | 需要回归测试 |
| --- | --- | --- | --- | --- | --- |
| `diagnosis-api/src/services/v1Gatekeeper.js` | 无 AI D0 gatekeeper；挡空文本、过短、非故事材料 | 增加 low-maturity / concept-fragment 判定；识别主角不稳定、事件链缺失、只有设定符号等情况；返回 D0 reportV1-like 结果 | 规则过严会误挡早期但可诊断故事；规则过松会继续放过 Sample 03 | Patch 1 必须 | 是 |
| `diagnosis-api/src/services/v1StageDecision.js` | 根据 stage result / hints 决定 stop 或 continue | 增加基于 maturity_level、recommendedAction、nextStep 的保守规则；D0 和 low-maturity 不允许进入 advanced | 可能改变现有 staged runner 测试预期；需要保持 legacy 默认不变 | Patch 1 建议 | 是 |
| `diagnosis-api/src/services/v1StageRunner.js` | 串联 gatekeeper、stage prompt、stage decision；输出 diagnostics | 确保 D0 / basic 的 nextStep 和 diagnostics 一致；真实 prompt 路径失败仍由 pipeline fallback；保留 mock/no-AI 测试路径 | 接入点靠近 pipeline，需避免影响默认 legacy | Patch 1 建议 | 是 |
| `diagnosis-api/src/prompts/v1BasicDiagnosis.js` | V1 basic stage prompt builder | 加强忠实材料约束；要求核心判断绑定材料依据；禁止把可能主题写成确定主题；建议必须具体 | prompt 变长可能影响延迟或 JSON 稳定性 | Patch 2 必须 | 是 |
| `diagnosis-api/src/prompts/v1AdvancedDiagnosis.js` | V1 advanced prompt builder | 本轮只读确认；暂不作为第一批修改对象 | 如果同步修改会扩大范围 | 否 | 否 |
| `diagnosis-api/src/prompts/v1FinalDiagnosis.js` | V1 final prompt builder | 本轮只读确认；暂不作为第一批修改对象 | 如果同步修改会扩大范围 | 否 | 否 |
| `diagnosis-api/src/services/reportV1Parser.js` | V1 JSON normalize、fallback、next_step normalize | 确认 `next_step` fallback 是否足够；必要时要求 normalized 结果能稳定映射到 `nextStep` 摘要 | 变更会影响 sample-run 保存字段和兼容输出 | Patch 3 视情况 | 是 |
| `diagnosis-api/src/services/reportV1Schema.js` | V1 enum / schema constants | 视情况新增 low-maturity rejection code；避免不必要扩 enum | schema 变更影响 parser 和 tests | Patch 3 视情况 | 是 |
| `diagnosis-api/src/services/aiClient.js` | DeepSeek 调用、JSON parse、retry、V1 stage wrapper | 本轮不优先改；仅在 retry 仍不稳时调整 V1 stage retry instruction | 调整 AI 调用层风险较大 | 否 | 是 |
| `diagnosis-api/src/services/materialRouter.js` | route 前材料形态识别和 AI/local classification | 不建议 Patch 1 先改；Sample 03 不是公网 route 拒绝问题，而是 V1 D0/basic 边界问题 | 动 route 会影响用户能提交什么材料 | 否 | 是，如后续动 |
| `diagnosis-api/src/services/guard.js` | 硬拒绝：空、过短、reject、过长 | 不建议 Patch 1 改；guard 应保持硬拒绝，不承担 D0 文案生成 | 动 guard 会改变公开输入准入 | 否 | 是，如后续动 |
| `diagnosis-api/scripts/test-v1-gatekeeper-decision.js` | no-AI gatekeeper / decision 单测 | 增加 Sample 03 类低成熟度概念应 stop_d0 | 需要样本文本脱敏摘要，不放完整真实用户材料 | Patch 1 必须 | 是 |
| `diagnosis-api/scripts/test-v1-staged-runner.js` | no-AI staged runner 测试 | 增加 low-maturity D0、nextStep 非空、basic stop/continue 检查 | 可能需要更新 mock 预期 | Patch 1 建议 | 是 |
| `diagnosis-api/scripts/smoke-v1-staged-real.js` | 受保护 smoke；默认 mock | 修改后用于受控回归，但不在 Patch 1/2 里先改 | 真实调用需单独确认 | 否 | 后续 |

## C. D0 / basic 边界修改方案

必须退回 D0 的材料：

- 空文本、严重乱码、明显非故事材料。
- 字数虽够，但只是一组设定词、象征物、世界观规则，没有稳定主角。
- 主角身份在多个可能选项之间摇摆，且没有明确事件链。
- 只有氛围、主题、社会隐喻、标题或高概念前提，没有目标、阻碍、选择、结果方向。
- 材料主要是世界观设定或符号设定，缺少人物行动。

允许进入 basic 的材料：

- 有相对稳定的主角或叙事承载者。
- 有目标、压力或冲突。
- 至少有一个事件推进或关键选择。
- 有结尾、状态变化或下一步变化方向。
- 即使文本短，也能判断“这是不是一个故事”。

概念碎片的返回方式：

- 返回 D0，不做硬诊断。
- `rejection_reason.code` 可使用现有 `LOW_INFORMATION`，除非后续单独决定扩展 enum。
- `nextStep` 应要求补充：
  - 主角是谁
  - 主角想要什么
  - 主要阻碍是什么
  - 至少 3 个关键事件
  - 结尾或状态变化方向

Sample 03 修改后预期：

- 应进入 D0 或明确的补充材料状态。
- 不应返回 `stage=basic`。
- 不应进入 advanced。
- diagnostics 应能说明 low-maturity / insufficient story chain。

## D. basic prompt 修改方案

忠实材料约束：

- 禁止补完材料里没有的人物动机。
- 禁止把“可能主题”写成确定主题。
- 如果是推测，必须写成“可能”“看起来像”“需要确认”，不能写成事实。
- 每个核心判断必须尽量绑定材料依据，例如人物、行为、道具、事件或结尾方向。

建议具体化：

- 少用“人物成长”“结构”“主题表达”这类空泛词。
- 每条建议应指向一个具体断点：
  - 主角目标不清
  - 阻碍来源不清
  - 奇幻规则和人物选择没有绑定
  - 关键事件缺少因果
  - 结尾变化不明确
- suggestions 或 nextStep 至少给出 1 个优先修订动作。

Sample 01 修改后预期：

- 不应强行说“赎罪”。
- 如果提到赎罪或类似心理动机，必须标记为待确认推测。
- 更稳妥的表达应回到“告别”“规则与人情冲突”“人物选择”这类材料可支撑内容。

Sample 02 修改后预期：

- 建议应更具体，例如检查预言机制如何推动阿青选择，妹妹目标如何影响行动，石鸡陷阱和离村结尾之间的因果是否清楚。
- 不应只列 character growth / plot structure / theme expression。

## E. nextStep 输出规则

通用规则：

- 每个阶段都必须有 `nextStep`。
- `nextStep` 不能只写“继续完善材料”。
- `nextStep` 必须说明当前状态和下一步动作。

D0 nextStep：

- 明确要求补充主角、目标、阻碍、关键事件、结尾方向。
- 不得给 advanced 或 final 建议。
- 不得评价项目转化。

basic nextStep：

- 如果材料可进入 advanced：说明进入 advanced 前最应检查的一个具体问题。
- 如果材料不应进入 advanced：说明先补哪类材料，再回来做 basic。
- 如果只是 concept：不能只说进入 advanced，应要求先补故事链。

fallback nextStep：

- 明确说明本次为 fallback 或兼容结果。
- 建议重新生成或补材料。
- 不得伪装成正常 V1 阶段结果。

## F. JSON / schema 稳定性判断

本批情况：

- Sample 03 出现 1 次 JSON retry，但最终生成可解析结果。
- 当前最核心风险不是 JSON 失败，而是 D0/basic 边界和 nextStep 质量。

本轮建议：

- Patch 1 / Patch 2 不优先改 `aiClient.js` retry 流程。
- Patch 1 需要增加 no-AI tests，验证 D0 nextStep 不为空。
- Patch 2 修改 prompt 后，如果真实样本回归仍出现 retry，再考虑 Patch 3 改 retry instruction 或 schema normalization。

可能后续改动点：

- `aiClient.js`: `buildV1StageRetryMessages` 可加入更明确的 nextStep / stageDecisionHints 约束。
- `reportV1Parser.js`: 确保 normalized `next_step` 能稳定保存到 sample-run 摘要。
- `reportV1Schema.js`: 如需更细 low-maturity 原因码，再新增 enum；当前可先用 `LOW_INFORMATION`。

## G. 回归测试计划

约束：

- 不跑公网。
- 不输出完整 `reportV1` 正文。
- 不输出完整样本文本。
- 最多 6 次 DeepSeek V4-flash 调用。
- 如果超过调用上限则停止。

必须回归：

- Sample 01：不应过度解释“赎罪”；核心判断应绑定材料依据。
- Sample 02：建议应更具体，至少有 1 条绑定奇幻机制或事件链。
- Sample 03：应退回 D0 或明确要求补充材料，不能进入 advanced。

建议顺序：

1. 先跑 no-AI 单测：
   - `npm run test:v1-gatekeeper-decision`
   - `npm run test:v1-staged-runner`
   - 相关 pipeline switch / integration no-AI tests
2. 再人工确认是否允许真实回归。
3. 如允许，最多跑 3 个原样本 basic 回归。
4. 若仍有调用预算，再跑 3 个非隐私 basic 样本。
5. 记录 fallback、latency、JSON retry、stage、decision、nextStep。

## H. 执行阶段建议

### Patch 1：D0/basic 边界 + nextStep

建议修改：

- `v1Gatekeeper.js`
- `v1StageDecision.js`
- `v1StageRunner.js` 视 nextStep / diagnostics 需要最小调整
- `test-v1-gatekeeper-decision.js`
- `test-v1-staged-runner.js`

目标：

- Sample 03 类低成熟度概念应停在 D0。
- D0 / basic 的 nextStep 不为空，并且能说明补什么。
- 默认 legacy 行为不变。

是否建议合并执行：

- 建议单独一个 patch。它是最高优先级，且不需要真实 AI。

### Patch 2：basic prompt 忠实材料 + 建议具体化

建议修改：

- `v1BasicDiagnosis.js`
- `test-v1-stage-prompts.js`
- 可能补充 docs/handoff

目标：

- Sample 01 不强行写“赎罪”。
- Sample 02 建议更具体。
- basic 不越界到 advanced / final。

是否建议合并执行：

- 建议在 Patch 1 之后单独执行。prompt 修改会影响真实 AI 行为，回归时更容易定位问题。

### Patch 3：必要测试 / 文档 / schema 观察

建议修改：

- 测试脚本和文档优先。
- 只有 JSON retry 仍反复出现时，才考虑 `aiClient.js`、`reportV1Parser.js`、`reportV1Schema.js`。

目标：

- 固化回归样本。
- 记录调用预算和失败停止条件。
- 避免在边界和 prompt 还没稳定时过早重构 schema。

是否建议合并执行：

- 不建议和 Patch 1/2 混在一起。先观察，再决定是否需要 schema 级改动。

## 执行门槛

- Patch 1 has been implemented after target-mode approval: D0/basic boundary tightening plus stable `nextStep` fallback.
- Patch 1 did not modify advanced or final prompts.
- Patch 1 did not run real AI; verification used no-AI unit/script checks and local sample-file gatekeeper regression.
- Real AI regression must still be separately confirmed before any new DeepSeek calls.
- 公开上传入口、生产 `/api/diagnosis`、Nginx、SSL、systemd、用户系统、人才平台都不在本计划执行范围内。

## I. Patch 1 Result - 2026-06-09

Changed areas:

- `v1Gatekeeper.js`: added low-maturity concept-fragment detection for materials with unstable protagonist, unformed concept language, or missing story-chain signals.
- `v1StageDecision.js`: prevents `D0`, low-maturity, or "supplement material first" basic outputs from continuing into advanced.
- `v1StageRunner.js`: ensures mock stage reports include both `next_step` and `nextStep`, and passes report maturity / next-step hints into stage decision.
- `reportV1Parser.js`: normalizes `next_step` into stable `detail`, `summary`, `action`, and `nextStep` fields.
- V1 no-AI tests now cover low-maturity D0 and nextStep presence.

Local sample regression, no real AI:

- Sample 01: gatekeeper still returns `allow_basic`.
- Sample 02: gatekeeper still returns `allow_basic`.
- Sample 03: gatekeeper returns `stop_d0` with `LOW_INFORMATION` and supplement-material `nextStep`.

Patch 1 does not judge report quality and does not replace manual review. Patch 2 remains the place for basic prompt fidelity and suggestion specificity.
