# Diagnosis MVP Beta 人工确认与部署前清单

日期：2026-06-11
状态：待人工逐项确认，不构成部署或开放授权
适用范围：邀请制 `/diagnosis/beta/`、受保护的诊断/反馈 API、`framespark-diagnosis.service`

## 使用规则

- 每个勾选项必须填写负责人、证据位置和确认日期；口头确认不算完成。
- 每次执行前重新 `git fetch origin main`，要求工作区 clean、`HEAD == origin/main`，并记录完整 40 位部署候选 SHA。
- 密钥、Basic Auth 凭证、完整材料、完整报告和原始模型响应不得写入本清单、Git、handoff 或部署日志。
- “部署”“真实 AI smoke”“向内测用户发放访问”是三个独立审批门槛，不得互相替代。
- 本清单未全部满足前，公开 `/diagnosis/` 继续冻结，任何 Beta/API location 均不得开放。

记录字段：负责人 `________`　证据/工单 `________`　确认日期 `________`

## A. 法律与隐私确认

- [ ] 隐私政策和用户协议已由指定人工完整阅读，不再仅依赖技术人员自审。
- [ ] 已接受并明确披露提交内容会发送给外部 AI 服务处理。
- [ ] 已确认默认不保存完整材料、原文件名或完整报告，仅保存脱敏运行元数据，最长 30 天。
- [ ] 已确认只有用户单独授权人工复核时，完整材料和报告才可保存，最长 14 天，并有到期清理机制。
- [ ] 已明确禁止上传敏感个人信息、商业秘密、违法内容或用户无权处理的材料。
- [ ] 已确认内测不承诺完整长篇剧本评估，不支持 PDF、扫描件或图片 OCR。
- [ ] 已确认删除/撤回授权渠道为 `law@framespark.cn`，故事材料问题渠道为 `script@framespark.cn`，并确认邮箱可用及负责人。
- [ ] 已确认结果仅为 AI 辅助意见，不保证入选、融资、拍摄、发行或合作。

法律/隐私负责人 `________`　证据/版本 `________`　签字日期 `________`

## B. 访问控制确认

- [ ] Beta 继续采用邀请制，不转为弱公开或完全公开。
- [ ] Basic Auth 凭证负责人、发放范围、撤销流程和遗失处理已书面确认。
- [ ] 使用独立内测账号，不复用管理员账号、个人常用账号或个人常用密码。
- [ ] htpasswd 文件目标路径确认是 `/etc/nginx/framespark-diagnosis-beta.htpasswd`，位于 webroot 外。
- [ ] htpasswd 来源和目标均为非空普通文件、非软链接；目标 owner 为 root，group 为确认后的 Nginx worker group，目标 mode 为 `0640`。
- [ ] 验证过程只检查存在性、类型、owner/group/mode，不读取或打印 htpasswd 内容。
- [ ] `/diagnosis/beta/`、`/api/diagnosis/`、`/api/diagnosis-feedback/` 使用同一 Basic Auth 边界。
- [ ] 页面和 API 的匿名访问均返回认证挑战；认证页面不能访问未认证 API，API 也不能绕过页面认证。
- [ ] 受信用户名只由 Nginx `$remote_user` 覆盖传递，客户端伪造身份头无效。

访问控制负责人 `________`　账号/撤销工单 `________`　签字日期 `________`

## C. AI 与成本确认

- [ ] 生产 DeepSeek key 已通过安全渠道准备；本清单、Git、终端输出和工单中均不记录其值。
- [ ] env 检查会拒绝缺失、空值和已知占位值，但不会打印 key。
- [ ] 首次生产真实 AI smoke 获得单独书面授权，且最多只运行 1 次。
- [ ] smoke 只使用虚构、非隐私、短材料，不使用真实用户材料、PDF 或长篇剧本。
- [ ] 已确认单次诊断 provider 调用上限为 5；首次生产 smoke 前另行确认总调用预算。
- [ ] 已确认邀请内测初始上限：账号 3 次/日、IP 6 次/日、全局 20 次诊断/日、100 次 provider 调用/日、并发 2。
- [ ] 已确认请求 deadline、provider timeout 和 Nginx timeout 的边界；timeout 不自动重试。
- [ ] 已确认普通 JSON 修复和 final 安全修复遵循既定上限，不进行无限重试。
- [ ] 已确认 `V1_FINAL_OUTPUT_UNSAFE`、provider 失败、预算耗尽和任何 V1 fallback 都按受控失败展示，不作为成功报告返回。
- [ ] smoke 日志仅记录调用数、错误码、阶段和延迟等脱敏摘要，不记录完整材料、报告或原始响应。

AI/成本负责人 `________`　预算/授权工单 `________`　签字日期 `________`

## D. 服务器执行确认

- [ ] 已确认维护窗口、执行人、复核人、回滚人和沟通渠道；执行人与复核人不得为同一无人监督流程。
- [ ] 执行前 fresh fetch 后记录完整部署候选 SHA：`________________________________________`。
- [ ] 已审核 approved-base 到 candidate 的完整 commit 列表、diff、`git diff --check` 和 release checksum。
- [ ] 已再次只读确认 `127.0.0.1:8788` 空闲且无公网 `8788` 监听，analytics 仍监听 `127.0.0.1:8787`。
- [ ] 已再次确认 Node `/usr/bin/node` 与 npm `/usr/bin/npm` 的实际路径和版本满足审核基线。
- [ ] 已确认专用无登录用户/组 `framespark-diagnosis` 的 UID/GID、shell 和 home 策略。
- [ ] 已确认 release 使用 `/srv/framespark/diagnosis-api/releases/<full-sha>`，`current` 只解析到该 releases 目录内。
- [ ] 已确认 release 最终为 root owner、service group 可读/可遍历、运行身份不可写。
- [ ] 已确认 env 为 `/etc/framespark/diagnosis-api.env`，普通非软链接文件，`root:root`、mode `0600`，不在 release/Git/webroot。
- [ ] 已确认 data 为 `/var/lib/framespark-diagnosis/`，非软链接目录，专用用户/组所有、mode `0700`，不在 webroot。
- [ ] 依赖安装和 no-AI 测试只以非 root 专用身份执行；虚构测试数据使用隔离目录并在 promotion 前清理。
- [ ] systemd 安装/启动、Nginx 合并/reload 均有独立人工确认点，不通过单个脚本无监督连续执行。

服务器执行负责人 `________`　候选 SHA/校验和证据 `________`　签字日期 `________`

## E. Nginx / systemd 人工审核确认

- [ ] 已通过活动配置输出审核完整 `framespark.cn` server block 和 location 顺序，不仅依赖文本替换或片段 grep。
- [ ] `location ^~ /diagnosis/beta/` 优先于静态资源正则，且仅提供所需 GET/HEAD 行为。
- [ ] Beta 静态 alias 禁止目录列表、隐藏文件/隐藏目录、越界路径和未审核软链接访问。
- [ ] `/diagnosis/beta` 无尾斜杠路径采用已审核的认证后行为，不产生未认证 alias。
- [ ] `/api/diagnosis/` 和 `/api/diagnosis-feedback/` 均受同一 Basic Auth 保护，并仅允许 POST。
- [ ] `/api/diagnosis/` body 上限 `5m`，read/send timeout `240s`；应用 deadline 保持 `210s`。
- [ ] 正式 `/diagnosis/` 仍是冻结预告页，不被 alias、proxy 或重定向覆盖。
- [ ] 现有 `/api/analytics/` location 和 `127.0.0.1:8787` upstream 不变且无位置冲突。
- [ ] `/health`、`/ready`、dev 路由、release、env、data 和日志均不暴露公网。
- [ ] Origin 仅允许 `https://framespark.cn`；trusted proxy 仅信任 loopback，不添加通配 CORS。
- [ ] systemd unit 已用 `systemd-analyze verify` 检查，并在目标机验证 Node 可读 `current`/env/data。
- [ ] hardening 先按审核草案启用；若阻断运行，只移除经证明确实不兼容的单项并重新评审，不整体取消 hardening。
- [ ] Nginx 合并前命令硬停止仍生效；只有单独批准后才允许 `nginx -t` 和 reload。

Nginx/systemd 复核人 `________`　活动配置/verify 证据 `________`　签字日期 `________`

## F. 回滚确认

- [ ] previous release 完整 SHA、目录、依赖兼容性和可读性已记录：`________________________________________`。
- [ ] 当前活动 Nginx 配置、pre-Beta 配置和 post-Beta 配置的路径及 SHA-256 已记录。
- [ ] Nginx 配置备份路径位于受控的 webroot 外位置，文件为普通非软链接且权限已审核。
- [ ] 已确认回滚顺序：先关闭/恢复三个 Beta locations，再 `nginx -t`，通过后 reload。
- [ ] 已确认 Nginx test 或 reload 失败时立即恢复原活动配置，不进入半回滚状态。
- [ ] Beta 路由安全关闭后，才允许切回 previous release、restart service 并检查本地 `/ready`。
- [ ] analytics 验证同时检查 `127.0.0.1:8787` listener 和活动 `/api/analytics/` proxy target。
- [ ] 正式官网验证覆盖首页、冻结的 `/diagnosis/` 和关键静态资源，且不调用真实诊断接口。
- [ ] 回滚负责人、复核人、执行窗口和停止条件已确认。
- [ ] 回滚日志只保留必要元数据，不导出完整材料、报告、provider 响应、env 或认证内容。

回滚负责人 `________`　备份/previous 证据 `________`　签字日期 `________`

## G. 上线后观察确认

- [ ] 首批只发放给少量明确身份的受邀测试者；名单、凭证负责人和撤销时间已记录在非 Git 安全位置。
- [ ] 首日诊断与 provider 调用上限不高于已审核初始预算，并设置人工观察负责人。
- [ ] 观察材料过短、格式错误、超时、服务繁忙、unsafe/fallback、网络错误等失败状态是否为受控用户提示。
- [ ] 首次 smoke 和首批请求后检查 journald/元数据，只验证错误码、阶段、调用数和延迟等脱敏字段。
- [ ] 已用虚构标记验证默认记录不含完整材料、原文件名、完整报告或 provider 原始响应。
- [ ] 授权人工复核记录可识别 consent 状态、最长 14 天留存和清理时间，不与默认元数据混淆。
- [ ] 用户反馈只通过已审核反馈 API 或指定联系邮箱收集，不要求用户在普通聊天/工单中粘贴完整材料。
- [ ] 已定义暂停条件：异常成本、连续超时、认证泄露、日志正文泄露、unsafe 被当成功、analytics/官网受影响。

观察负责人 `________`　首日上限/反馈渠道 `________`　签字日期 `________`

## H. Go / No-Go 决策

### 部署 Go 条件

- [ ] A-F 全部关键项已勾选，且负责人、证据和日期完整。
- [ ] fresh fetch 后的 candidate 未变化；如变化，已重新审查完整范围。
- [ ] 全部 no-AI、安全、上传、限流、调用预算、fail-closed、公共 DTO 和 retention 测试通过。
- [ ] env、auth、data、release、systemd、Nginx 和 rollback 草案均已由执行人之外的复核人签字。
- [ ] 部署窗口和回滚窗口均有效，正式官网与 analytics 验收方法已准备。

**以上任一项未勾选：No-Go，禁止部署。**

### 真实 AI smoke Go 条件

- [ ] 部署已完成但三个公网 Beta location 尚未向内测用户发放凭证。
- [ ] 本地 health/readiness、认证、无 AI API、安全失败、限流、日志脱敏和调用预算检查均通过。
- [ ] C 节全部勾选，并有单次真实 AI 调用的明确书面授权。
- [ ] 只使用已审核的虚构短材料；执行命令保证最多一次真实 provider 调用且失败不自动重试。

**以上任一项未勾选：No-Go，禁止运行真实 AI smoke。**

### 邀请内测发放 Go 条件

- [ ] 真实 AI smoke 成功且没有 fallback、unsafe 成功展示、内部字段泄露或正文日志泄露。
- [ ] Nginx 三个 location 的匿名/认证行为、方法限制、Origin、body/timeout 和隐藏路径测试通过。
- [ ] 回滚演练完成，正式官网和 analytics 在演练后均正常。
- [ ] A-H 所有适用项已签字，G 节观察负责人、首日上限和暂停条件已确认。
- [ ] 法律人工复核、凭证发放/撤销流程和用户反馈渠道均已完成。

**以上任一项未勾选：No-Go，禁止向内测用户发放访问。**

## 最终签字

- 部署决策：`[ ] Go`　`[ ] No-Go`
- 真实 AI smoke 决策：`[ ] Go`　`[ ] No-Go`
- 邀请内测发放决策：`[ ] Go`　`[ ] No-Go`
- 产品负责人 `________`　技术执行人 `________`　独立复核人 `________`　法律复核人 `________`
- 决策日期 `________`　候选完整 SHA `________________________________________`

默认状态为 **No-Go**。空白、缺失证据、候选变化或任何高风险异常都必须停止，不得以“先上线再补”替代确认。
