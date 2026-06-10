# V1 Final Patch 3b Real Regression - 2026-06-10

用途：验证 `ea5d593` 的 final prompt 硬约束是否在真实 DeepSeek V4-flash 输出中生效。

边界：

- 只复测 Sample 01 / Sample 02 的 final 阶段。
- Sample 03 不调用 AI，只复核 V1 gatekeeper。
- 不包含完整样本文本、完整 `reportV1`、原始模型响应或密钥。
- 不判断 MVP、公网上传或生产 `/api/diagnosis` 是否可开放。

## 调用概览

- 总计 6 次 DeepSeek V4-flash 调用。
- Sample 01：3 次；Sample 02：3 次。
- 六次均为单次请求成功，没有 JSON retry，没有 fallback。
- Prompt version：`v1-final-2026-06-patch3b`。

| 样本 | 轮次 | stageReached | decision | maturity | conversion | latency | JSON retry | fallback |
| --- | ---: | --- | --- | --- | --- | ---: | ---: | --- |
| Sample 01 | 1 | final | complete_final | C | possible_after_revision | 11741ms | 0 | false |
| Sample 01 | 2 | final | complete_final | C | possible_after_revision | 11492ms | 0 | false |
| Sample 01 | 3 | final | complete_final | C | possible_after_revision | 17781ms | 0 | false |
| Sample 02 | 1 | final | complete_final | C | not_recommended | 18041ms | 0 | false |
| Sample 02 | 2 | final | complete_final | C | possible_after_revision | 17659ms | 0 | false |
| Sample 02 | 3 | final | complete_final | C | possible_after_revision | 18228ms | 0 | false |

## Sample 01

- 三轮均未出现“赎罪”“救赎”“atonement”或“redemption”。
- 三轮均为 `complete_final`，未出现 `continue_final`。
- 三轮 `nextStep` 均明确指向修改后再评估或补强材料。
- 项目整理均为最低优先级辅助项，未成为核心下一步。
- 未检测到拍摄、商业化、融资、投递、入选、签约或发行承诺。
- 三轮仍连续出现具体情节代写倾向，例如建议补写具体过往、具体物件信息、回忆节点或额外阻碍。Patch 3b 的禁止具体替作者填空约束尚未稳定生效。

稳定性：禁用高解释词、阶段收束、nextStep 和项目整理优先级稳定；具体情节代写问题也连续出现。

## Sample 02

- 三轮核心建议均聚焦石鸡规则、烧信转折、预言机制或相关因果铺垫。
- 三轮均为 `complete_final`，`nextStep` 均指向修改后再评估或补强材料。
- “整理项目档案”未成为核心建议：前两轮为最低优先级，第三轮未出现项目整理建议。
- 未检测到拍摄、商业化、融资、投递、入选、签约或发行承诺。
- conversion status 第一轮为 `not_recommended`，后两轮为 `possible_after_revision`；核心修改方向稳定，但转化状态存在一次差异。
- 三轮仍连续出现具体内容代写倾向，主要涉及要求补写父亲来信具体内容、人物关系细节或循环中的具体行为变化。

稳定性：故事问题焦点、阶段收束、nextStep 和项目整理优先级稳定；conversion status 不完全一致，具体内容代写问题连续出现。

## Sample 03 D0 复核

- 未调用 AI。
- V1 gatekeeper 结果仍为 `stop_d0 / LOW_INFORMATION`。
- `usesAi=false`，D0 边界未受 Patch 3b 影响。

## 回归结论

- `ea5d593` 已在本批真实复测中稳定修住 Sample 01 的高解释主题词、`continue_final`、nextStep 不清晰和项目整理优先级问题。
- Sample 02 的项目整理建议已稳定降级，核心建议仍聚焦石鸡规则和烧信转折。
- 两个样本仍连续出现具体情节或内容代写倾向，因此不能把 Patch 3b 记录为已完全解决 final prompt grounding 问题。
- 不继续调用 AI，不改 prompt，不部署，不开放公网入口；后续是否调整该约束应单独 Plan。
