# V1 Final Patch 4b Real Regression - 2026-06-10

用途：验证 `d207e36` 是否在真实 DeepSeek V4-flash 输出中限制住 final 阶段的具体情节代写倾向。

边界：

- 只复测 Sample 01 / Sample 02 的 final 阶段。
- Sample 03 不调用 AI，只复核 V1 gatekeeper。
- 不包含完整样本文本、完整 `reportV1`、原始模型响应或 API key。
- 不判断 MVP、公网上传或生产 `/api/diagnosis` 是否可开放。

## 调用概览

- 总计 6 次 DeepSeek V4-flash 调用。
- Sample 01：3 次；Sample 02：3 次。
- 六次均为单次请求成功，没有 JSON retry，没有 fallback。
- Prompt version：`v1-final-2026-06-patch4`。

| 样本 | 轮次 | stageReached | decision | maturity | conversion | latency | JSON retry | fallback |
| --- | ---: | --- | --- | --- | --- | ---: | ---: | --- |
| Sample 01 | 1 | final | complete_final | C | not_recommended | 22881ms | 0 | false |
| Sample 01 | 2 | final | complete_final | C | possible_after_revision | 16509ms | 0 | false |
| Sample 01 | 3 | final | complete_final | C | possible_after_revision | 26117ms | 0 | false |
| Sample 02 | 1 | final | complete_final | C | possible_after_revision | 22124ms | 0 | false |
| Sample 02 | 2 | final | complete_final | C | possible_after_revision | 20159ms | 0 | false |
| Sample 02 | 3 | final | complete_final | C | not_recommended | 12622ms | 0 | false |

## 共同结果

- 六轮 suggestions 均完整包含“问题 / 影响 / 修改方向 / 需要补充的材料”。
- 六轮均为 `complete_final`，没有 `continue_final`。
- 六轮 nextStep 均指向修改后再评估或补强材料。
- 六轮均未出现“赎罪 / 救赎 / atonement / redemption”。
- 六轮均未检测到拍摄、商业化、融资、投递、入选、签约或发行承诺。
- 六轮未发现把新增内容伪装成材料既有事实的明显乱编；问题主要发生在建议段替作者提出具体内容方案。
- 六轮建议均有明确问题对象和修改方向，未出现只有“加强人物 / 优化结构”一类的空泛建议。
- conversion status 在两个样本中均有 `not_recommended` 与 `possible_after_revision` 的差异。

## Sample 01

- 三轮都保持了四段诊断格式，项目整理未成为核心建议。
- 第一轮主要要求补足旧车票意义、人物反应和行为依据，整体较接近诊断式材料清单，但仍要求具体过去事件、心理活动或行为表现。
- 第二轮明确提出具体过往经历、前置伏笔、内心独白或行为选择等可执行内容方向，代写倾向明显。
- 第三轮提出具体回忆片段、铺垫撒谎动机或设计揭露方式，仍越过纯诊断边界。
- 三轮的具体程度不同，但均保留了替作者指定内容或表达手段的倾向；不能认定该问题已稳定修住。

稳定性：四段格式、阶段收束、nextStep、强解释词和承诺限制稳定；代写边界不稳定，且三轮均有不同程度残留。

## Sample 02

- 三轮核心问题均聚焦石鸡规则、烧信转折、人物选择依据和相关因果铺垫。
- “整理项目档案”在前两轮为第三项低优先级建议，第三轮未出现，未成为核心建议或 nextStep。
- 第一轮要求明确石鸡各次鸣叫作用、妹妹病症和来信具体线索，开始替作者指定设定内容。
- 第二轮给出切断预言链条、制造标记等具体机制示例，并指定人物关系和信件内容方向，代写倾向明显。
- 第三轮提出灰烬与路径或预言力量的具体功能联系、疾病类型和父亲背景关联，仍属于具体设定方案。
- 三轮均出现不同程度的具体规则、情节机制或人物背景补完，不能认定该问题已修住。

稳定性：故事诊断焦点、四段格式、阶段收束、nextStep 和项目整理优先级稳定；具体内容代写倾向连续存在。

## Sample 03 D0 复核

- 未调用 AI。
- V1 gatekeeper 结果仍为 `stop_d0 / LOW_INFORMATION`。
- `usesAi=false`，D0 边界未受 Patch 4 影响。

## 回归结论

- Patch 4 成功稳定了 final 建议的四段诊断格式，并保留了 Patch 3 的阶段收束、强解释词、nextStep、项目整理优先级和承诺限制。
- Patch 4 没有稳定限制住具体情节代写：Sample 01 / 02 连续三轮仍出现具体经历、伏笔、场景表达、规则答案、情节机制或人物背景方案。
- 已达到每个样本 3 次、总计 6 次的调用上限；按停止条件不继续重试，不挑选最好的一次作为结论。
- 本轮不改代码或 prompt，不部署，不开放公网入口。下一步如需继续，应先单独设计如何从结构化输出层约束“诊断方向”和“内容生成”的边界。
