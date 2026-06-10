# V1 Final Patch 3 Regression - 2026-06-10

用途：记录 final prompt 收束质量修正、无 AI 测试和小范围真实回归结果。

边界：

- 不包含完整样本文本、完整 `reportV1`、原始模型响应或 API key。
- 不给 final prompt “通过 / 不通过”的最终评审结论。
- 不代表可以开放公网、部署 `/api/diagnosis` 或进入产品化。
- 本任务总计使用 4 次 DeepSeek V4-flash 请求，已达到调用上限。

## Patch 3 修改

- Final 判断必须有材料中的人物、行为、事件、道具、规则或结尾方向支撑。
- 禁止把材料未充分支撑的主题、动机、结局含义或成熟度写成确定结论。
- Final 阶段动作固定收束为 `complete_final`，禁止 `continue_final`。
- 成熟度 B / C 的 `nextStep` 必须是“修改后再评估”或“补强具体材料”。
- 建议按“故事核心修改 / 材料补充 / 项目整理”排序；项目整理只能是最低优先级辅助项。
- 禁止承诺可拍摄、可商业化、可融资、可投递、入选、签约或发行结果。
- 禁止用具体虚构情节替作者填补过去经历、隐藏动机、人物关系、信件内容或结局动作。

## 无 AI 检查

- `npm run test:v1-stage-prompts`：通过，3 / 3。
- `node scripts/test-v1-final-patch3.js`：通过。
- `npm run check`：通过。
- `npm run test:v1-gatekeeper-decision`：通过，11 / 11。
- `npm run test:v1-staged-runner`：通过，9 / 9。
- Sample 03 仍为 `stop_d0 / LOW_INFORMATION`。

## 真实回归概览

| 轮次 | 样本 | 请求 | stage | decision | maturity | conversion | JSON retry | fallback |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 第一轮 | Sample 01 | 1 | final | complete_final | C | possible_after_revision | 无 | false |
| 第一轮 | Sample 02 | 1 | final | complete_final | B | possible_after_revision | 无 | false |
| 第二轮 | Sample 01 | 1 | final | complete_final | B | possible_after_revision | 无 | false |
| 第二轮 | Sample 02 | 1 | final | complete_final | B | possible_after_revision | 无 | false |

总请求数：4。没有 JSON retry，没有 fallback。

## 已确认改善

- Sample 01 / 02 均不再返回 `continue_final`，阶段动作收束为 `complete_final`。
- Sample 01 / 02 的 nextStep 均指向修改后再评估，不再把整理项目档案作为核心下一步。
- Sample 02 第二轮建议继续聚焦石鸡规则、烧信转折、信件信息和山路循环。
- 项目整理在第二轮中位于最低优先级；Sample 01 为第 5 项，Sample 02 为第 3 项。
- 两个样本均未检测到可拍摄、可商业化、可融资、可投递或已成熟等承诺信号。
- 建议分类在第二轮可以稳定识别为故事核心修改、材料补充和项目整理。

## 仍需处理和验证

- Sample 01 第二轮仍出现一次“赎罪”词，说明软性限制不足。
- Sample 01 / 02 的部分建议仍用具体新增情节为作者填空，例如新增过去关系或信件内容；这可能超出诊断建议边界。
- 因此 prompt 已进一步收紧为 `v1-final-2026-06-patch3b`：如果材料正文没有原样出现“救赎 / 赎罪 / atonement / redemption”，任何输出字段都不得使用这些词。
- `patch3b` 同时禁止用具体虚构情节替作者填空，只允许指出缺少的叙事功能、影响和待作者自行决定的内容。
- `patch3b` 本地静态测试已通过，但因本任务 4 次真实 AI 调用额度已用完，尚未进行第三轮真实回归。

## 下一步

- 评审助手先检查本文件和 `V1_FINAL_SAMPLE_REVIEW_2026-06-10.md`。
- 如允许继续，应单独授权最多 2 次真实 AI，只复测 Sample 01 / 02 的 `patch3b` final 输出。
- 在 `patch3b` 真实回归完成前，不把本次修改视为 final prompt 质量结论。
- 不开放公网，不部署 diagnosis-api，不改变 Sample 03 的 D0 边界。
