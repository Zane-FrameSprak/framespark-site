# FrameSpark 诊断系统 MVP 开放计划

日期：2026-06-10

## 开放范围

首发只采用邀请制内测。公开 `/diagnosis/` 继续作为预告页，不提供上传；受邀用户通过 Nginx Basic Auth 进入 `/diagnosis/beta/`。弱公开和完全公开必须重新评审限流、留存、法律文本、成本与质量，不由本计划自动授权。

Beta 页面源文件位于 `diagnosis-api/beta-site/`，不进入现有静态官网 rsync 范围。未来仅由受保护的 Nginx `alias` 映射到 `/diagnosis/beta/`，防止在认证配置完成前被普通静态部署公开。

## 用户能力

- 支持粘贴文本、UTF-8 TXT、DOCX。
- 暂不支持 PDF、扫描件、图片 OCR，不承诺完整长篇剧本评估。
- 文件上限 5 MB，DOCX 解压上限 20 MB，文本上限 20,000 字。
- 短文本、信息不足或非故事材料优先返回 D0 补充说明；危险文件、空材料和无法解析内容直接拒绝。
- 页面持续标明邀请制内测、结果可能不稳定、AI 辅助不替代人工判断。

## 公共结果契约

用户仅看到当前材料阶段、核心问题、材料依据、影响、修改方向、待补材料、已有基础和下一步。公共响应不得包含内部 stage code、prompt version、model、fallback、latency、JSON retry、原始 `reportV1`、路由结果或 provider 原始响应。

`V1_FINAL_OUTPUT_UNSAFE`、provider 调用预算耗尽或任何 V1 失败都返回受控失败，不将 legacy fallback 伪装为成功报告。

## 后端生产边界

- `diagnosis-api` 使用 `127.0.0.1:8788`，独立于 analytics 的 `8787`。
- 生产启动必须同时满足三个 V1 开关、真实 AI key、fail-closed、Beta 身份校验、关闭 dev tools、可信代理和外置数据目录。
- staged pipeline 注入真实 stage runner；开发默认开关仍为 false，不静默切到 mock。
- 单次诊断最多五次 provider 调用：basic/advanced/final 各一次、一次共享普通修复、一次 final 安全修复；timeout 不重试。
- 请求整体截止 210 秒，Nginx read timeout 240 秒。

## 安全与滥用控制

- Nginx Basic Auth 保护 Beta 页面、诊断和反馈 API，并覆盖写入受信用户名请求头。
- API 只信任 loopback Nginx 代理提供的身份和 `req.ip`，限制 Origin 为 `https://framespark.cn`。
- 初始限制：账号 3 次/日、IP 6 次/日、全局 20 次诊断/日、100 次 provider 调用/日、并发 2。
- TXT 校验 UTF-8 与二进制控制字符；DOCX 校验扩展名、MIME、ZIP 特征、加密状态、条目数及解压大小。
- 上传在内存中处理；默认日志不保存原文件名、完整材料或完整报告。

## 隐私与留存

- 提交前必须确认拥有处理授权，并同意材料发送到第三方 AI 服务。
- 默认仅保留脱敏运行元数据 30 天。
- 用户单独勾选人工复核后，完整材料与报告最多保存 14 天，数据位于 webroot 外。
- 页面明确禁止提交隐私、商业秘密或未授权材料，并提供 `law@framespark.cn` 删除联系渠道。
- 扩大开放前必须完成人工法律复核。

## 失败状态

产品化提示必须覆盖：材料为空或过短、格式/MIME 不支持、文件损坏或过大、文本过长、上传失败、来源或邀请身份无效、次数/并发超限、AI 超时、AI 服务失败、输出安全校验失败和网络错误。所有失败均不得返回 provider 原始消息或内部 diagnostics。

## 部署与回滚

- Release 位于 `/srv/framespark/diagnosis-api/releases/<commit>`，`current` 软链接指向当前版本。
- 使用无登录独立用户、`/etc/framespark/diagnosis-api.env` 和 `/var/lib/framespark-diagnosis`。
- systemd 使用最小权限和 readiness 检查；Nginx 配置必须人工审查并通过配置测试。
- 回滚先关闭 Beta location，再切换上一 release、重启服务并检查 readiness；公开预告页不受影响。

## 发布验收

1. 全部 no-AI、V1、final validator、调用预算、文件解析、公共 DTO、日志脱敏、限流与 fail-closed 测试通过。
2. 本地 mock 和 production-config readiness 通过。
3. Nginx 匿名/认证访问、方法限制、body/timeout 和 analytics 隔离通过。
4. API 只返回 JSON；webroot 不暴露后端、env、日志或 internal。
5. 用虚构材料执行 1-3 次获批生产 smoke，核对调用数、错误码和脱敏日志。
6. 隐私文案、条款、人工复核授权和删除渠道完成法律人工复核。
7. 回滚演练通过后，才允许给受邀用户发放访问凭证。

## 不能开放的阻止项

真实 runner 未接入、生产配置不能 fail-closed、公共响应暴露内部字段、默认日志保存正文、访问未隔离、配额不可用、上传校验不完整、隐私与条款未复核、Nginx/systemd 未验证、生产 smoke 或回滚未通过时，均不得开放 MVP。完成代码并不等于通过开放审批。
