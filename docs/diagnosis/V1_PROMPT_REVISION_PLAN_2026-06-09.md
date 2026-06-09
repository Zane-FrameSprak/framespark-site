# V1 Prompt / D0 修订计划 - 2026-06-09

用途：记录 3 个 V1 basic 样本人工评审后的修改方向。本文档只做计划，不修改代码、不修改 prompt 源码、不运行真实 AI。

## 当前人工评审结论

### Sample 01 - `2026-06-09-v1-basic-sample-01`

- 初判：基本看懂材料，但存在轻微过度解释风险。
- 主要问题：报告把故事核心解释为 “farewell / atonement / passing something on”，其中 “atonement / 赎罪” 可能超出样本材料支撑。
- 归类：不算 P0，但有 P1/P2 风险。
- 后续用途：不建议作为稳定通过样本；保留为“忠实材料约束”测试样本。

### Sample 02 - `2026-06-09-v1-basic-sample-02`

- 初判：三份样本中表现最好。
- 主要优点：能识别主角、目标、奇幻机制、事件链。
- 主要问题：建议偏泛，比如 character growth / plot structure / theme expression，需要更具体。
- 归类：无 P0；有 P2，可能有轻微 P1。
- 后续用途：可作为 advanced 小测候选，但不能代表 MVP 已可开放。

### Sample 03 - `2026-06-09-v1-basic-sample-03`

- 初判：最关键问题样本。
- 主要问题：材料成熟度不足，系统却返回 `stage=basic`。
- 正确方向：应退回 D0 / 补充材料阶段，而不是进入 basic。
- 归类：P1，暴露 D0 / basic 边界不够严格。
- 后续限制：不允许进入 advanced。
- 后续用途：作为 D0 gatekeeper / low-maturity regression 样本。

## P0 / P1 / P2 归类

P0：

- 本批未发现 P0。

P1：

- Sample 03 暴露 D0 / basic 边界不够严格。
- `nextStep` 缺失或不稳定，会影响人工判断和后续阶段路由。
- Sample 01 有轻微过度解释材料动机的风险，需要收紧约束。

P2：

- Sample 02 的建议偏泛，需要更具体。
- Sample 01 的情感铺垫建议还不够可操作。
- 输出摘要对人工评审有用，但阶段决策说明仍可更清楚。

## 为什么现在不能直接开放 MVP

- Sample 03 说明低成熟度材料可能被放进 basic，D0 / basic 边界还不稳。
- `nextStep` 字段为空或不稳定，无法支撑可靠的分阶段体验。
- basic 阶段仍可能给出泛泛建议，真实用户未必知道下一步怎么改。
- Sample 01 暴露了过度解释材料动机的风险，可能降低用户信任。
- 当前验证样本数量很少，只能说明链路可用，不能说明产品体验稳定。

## 候选修改区域

### 1. D0 gatekeeper / material maturity 判定

目标：

- 识别信息不足、主角不稳定、事件链缺失、材料成熟度过低的样本。
- 让 Sample 03 这类材料退回 D0 或明确要求补充材料。

风险：

- 规则过严会把可诊断的早期故事挡在 basic 外。
- 规则过松会继续让低成熟度概念进入 basic。

### 2. basic prompt

目标：

- 强化“只根据材料判断，不补不存在的动机、主题和结论”。
- 压缩泛泛建议，要求建议绑定样本里的具体问题。
- 明确 basic 阶段只回答“这是不是一个故事”，不做 advanced / final 内容。

风险：

- prompt 变长可能增加延迟或格式不稳定。
- 约束太硬可能让报告变得过短、过保守。

### 3. stage decision / nextStep 输出规则

目标：

- `nextStep` 必须稳定输出，不能留空。
- decision 和 nextStep 要说明为什么停留、为什么补材料、或者为什么进入下一阶段测试。
- 对 D0 / basic / advanced 的边界给出机器可读、人工也能看懂的理由。

风险：

- 如果规则和报告正文不一致，会造成评审混乱。
- 如果 nextStep 过模板化，可能降低具体指导价值。

### 4. JSON schema 稳定性

目标：

- 减少 JSON retry。
- 让 summary / core / suggestions / nextStep / diagnostics 等关键字段稳定存在。
- 对 retry 情况保留诊断记录，便于人工判断是否可信。

风险：

- 过度追求 schema 可能挤压内容质量。
- schema 修订会影响现有测试和 sample-run 存储字段。

## 回归测试计划

改动后先做无公网、非隐私、可控样本回归：

- Sample 03：应退回 D0 或明确要求补充材料，不能进入 advanced。
- Sample 01：不应过度解释“赎罪”等材料未充分支撑的动机。
- Sample 02：建议应更具体，不能只停留在人物、结构、主题这类大词。
- 再跑 3 个非隐私 basic 样本，覆盖成熟梗概、类型梗概、低成熟度概念。
- 记录 fallback、latency、JSON retry、stage、decision、nextStep。

## 执行边界

- 下一步必须先做代码级 Plan，确认要改哪些文件和测试，再允许修改 `diagnosis-api`。
- 当前不修改 prompt 源码，不修改 D0 gatekeeper，不修改 pipeline。
- 当前不运行真实 AI，不部署，不开放 `/api/diagnosis`，不恢复公开上传入口。
