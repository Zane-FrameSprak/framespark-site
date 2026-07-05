# FrameSpark 内部控制台

这是 FrameSpark 本机只读内部控制台，用于快速查看官网运营风险、诊断日志概览、内部样本测试记录和常用本地入口。

它不是正式后台系统，不是桌面 App，也不部署公网。

## 启动方式

在项目根目录运行：

```bash
node scripts/create-desktop-launcher.js
```

该命令会在 macOS 桌面生成：

```text
FrameSpark控制台.command
```

之后双击该文件即可：

1. 进入 `/Users/chenzuhuanhuan/framespark-site`
2. 启动本地控制台服务
3. 自动打开浏览器访问：

```text
http://127.0.0.1:8130/internal/admin-console/
```

## 为什么只监听 127.0.0.1

控制台会读取本机项目目录中的日志、样本索引和状态文件。它只供 Zane 本机使用，因此服务只监听 `127.0.0.1`。

不要把它部署到公网，不要改成监听 `0.0.0.0`。

## 当前能做什么

- 在左侧项目状态栏查看到期提醒、当前状态和操作风险
- 查看公测运营总览：入口、Cookie 边界、后端版本、每日预算、真实 smoke 和 B4 状态
- 打开正式官网、本地项目目录、项目状态文档
- 打开诊断系统测试区、样本测试目录、诊断日志目录、review queue 目录
- 查看网站访问趋势图
- 查看用户行为统计：匿名访客、会话、页面访客和关键入口点击
- 查看本地诊断日志、review queue、样本测试批次的今日 / 本周概览
- 查看 PDF 文本质量 warning / failed 样本数量
- 查看今日高价值提醒

## 当前状态口径

截至 2026-07-05，控制台状态栏已同步到当前生产阶段：

- Diagnosis 公测入口已上线，普通用户从首页“进入公测”获得 24 小时匿名 session。
- `/diagnosis/beta/` 与 `/api/diagnosis/` 仍受后端 Cookie session 边界保护。
- 当前后端支持 `tiktoken` 输入计数：单次 50,000 tokens，provider 全局 5,000,000 tokens/日。
- Nginx `site_total` 不再写入 Cookie；如改 Nginx 或面板保存配置，需要复查日志格式。
- 2026-06-30 已完成一次虚构材料真实 smoke：HTTP 200、final、4 次 provider 调用、13,095 tokens。
- B4 72 小时观测尚未启动；真实诊断扩量、DeepSeek 调用和费用观察仍需要单独确认。
- 官网备案 footer 已上线：ICP 与公安备案均可点击，公安备案使用本地图标资源。
- analytics 服务异常是独立问题，不纳入 Diagnosis 公测部署和控制台状态判断。

这些是手动维护的项目状态卡，不等于实时从生产数据库读取。访问趋势和用户行为统计才是通过本机接口读取服务器摘要 JSON。

## 当前不能做什么

- 不调用 AI
- 不调用 `/api/diagnosis`
- 不读取 `.env`
- 不显示 API Key、私钥或任何密钥
- 不展示用户原文全文
- 不展示完整诊断报告全文
- 不删除文件
- 不修改文件
- 不重启服务
- 不部署服务器
- 不清空日志
- 不执行任意 shell 命令

## 路径白名单

本机文件夹 / 文件打开必须通过后端白名单。

前端只提交 `targetId`，不能提交任意路径。白名单配置在：

```text
scripts/start-internal-console.js
```

主要配置：

- `allowedOpenTargets`
- `dashboardConfig`
- `deadlineConfig`
- `localPaths`
- `serverPort`

日志与记录概览中的“点击查看”卡片也复用同一套白名单 `targetId`：

- 用户反馈：当前先打开 `reviewQueue`。后续如需要，可单独增加固定的 `userFeedback` 白名单入口。
- review queue 待复查：打开 `reviewQueue`
- PDF 文本质量 warning / failed：打开 `sampleRuns`
- 测试批次：打开 `sampleRuns`
- 诊断日志：打开 `diagnosisLogs`

控制台不支持前端传入任意路径，也不支持通过 query 或 body 指定自定义 path。

## 如何新增快捷入口

在 `scripts/start-internal-console.js` 的 `allowedOpenTargets` 中增加一项：

```js
someTarget: {
  label: '显示名称',
  type: 'path',
  value: path.join(REPO_ROOT, '相对路径')
}
```

如果是网页地址，`type` 使用 `url`。

## 如何新增期限提醒

在 `deadlineConfig` 中增加一项：

```js
{
  id: 'domain',
  label: '域名 framespark.cn 到期时间',
  value: '2026-12-31T23:59:59+08:00'
}
```

如果时间未知，`value` 留空，页面会显示“待填写”。

剩余天数小于 30 天会标记为需关注，小于 7 天会标记为紧急。

当前 v1 中，域名到期时间、腾讯云服务器到期时间等字段采用手动维护。SSL 证书到期时间后续可以通过服务器证书文件自动读取。腾讯云资源到期时间如果要自动读取，需要接入腾讯云 API，并配置最小权限密钥；v1 暂不接入腾讯云 API，不读取腾讯云 SecretId / SecretKey。

## 访问趋势图

控制台默认数据必须来自真实来源。当前趋势图分为两个数据源 Tab：

- 用户行为趋势：默认选中，读取 analytics 匿名访客摘要，更适合判断访问与转化。
- 服务器访问趋势：读取 Nginx 摘要，主要用于观察请求量、错误、扫描和服务器异常。

读取失败或数据缺失时，趋势图和数据汇总显示失败 / 空状态，不展示 mock 曲线、mock 折点或 mock 汇总数字。未接入数据源时使用 “— / 待接入真实日志”，不能用 mock 或 0 代替。0 只表示真实数据源已经接入且统计结果为 0。

### 服务器访问趋势

服务器访问趋势通过 SSH 读取服务器侧已生成的 Nginx 摘要 JSON。页面会明确标注：

```text
已读取服务器真实访问摘要，数据来自 Nginx 日志摘要 JSON
```

真实服务器日志路径为：

```text
/www/wwwlogs/framespark.cn.log
/www/wwwlogs/framespark.cn.error.log
```

真实访问统计使用 `scripts/nginx-traffic-summary.js` 生成摘要 JSON，默认不使用 mock；接入方案见 `docs/内部控制台真实访问统计接入说明.md`。
该摘要脚本会区分 `pageViews` 和更保守的 `validPageViews`：`validPageViews` 只统计已知站内页面，扫描路径、随机路径和 `/mailto:` 等异常请求不会进入有效页面访问。
服务器上的真实访问统计摘要由 `scripts/run-nginx-traffic-summary.sh` 生成，默认存放在 `/home/ubuntu/framespark-reports/`。控制台通过本机接口 `/api/console/traffic-summary` 使用 SSH 只读读取该目录中的 JSON。
服务器端手动运行和安装 cron 均应使用 `sudo`，因为 Nginx 日志通常归 `www` 用户 / 用户组管理，普通 `ubuntu` 用户没有读取权限；不要通过修改日志权限解决。
服务器上的 cron 不得依赖 `/tmp/framespark-site`。2026-07-05 已将摘要工具收敛到稳定目录 `/opt/framespark-summary-tools`；`/tmp` 会在重启后丢失，曾导致近 7 日 / 近 30 日趋势停留在 2026-06-16。
控制台会根据 summary JSON 的 `generatedAt` 判断新鲜度。摘要超过 2 小时未刷新时，页面显示“数据过期”，不再把旧数据当作正常趋势。

控制台读取的固定文件为：

```text
/home/ubuntu/framespark-reports/traffic-summary-today.json
/home/ubuntu/framespark-reports/traffic-summary-yesterday.json
/home/ubuntu/framespark-reports/traffic-summary-last7.json
/home/ubuntu/framespark-reports/traffic-summary-last30.json
```

读取前需要 Mac 本机已配置到 `ubuntu@124.221.146.10` 的 SSH 免密。控制台不会读取 Nginx 原始日志，不允许前端传服务器地址、文件路径或 shell 命令；如果 SSH 或 JSON 读取失败，页面显示读取失败，不使用 mock 数据。

如果后续为了 UI 调试保留 mock 数据，必须默认关闭，只能通过代码中的明确开发开关启用；mock 不得作为默认看板数据，也不得用于运营判断。

v1 暂不做复杂 X / Y 轴滑块。当日图的 X 轴固定为 0–24 小时，滑移价值有限。后续接入真实多日数据后，可以再做缩放、平移或时间范围选择。

服务器访问趋势周期入口的规则：

- 当日趋势：读取 `traffic-summary-today.json`，使用 `hourly` 数据。
- 昨日趋势：读取 `traffic-summary-yesterday.json`，使用 `hourly` 数据。
- 近 7 日趋势：读取 `traffic-summary-last7.json`，使用 `daily` 数据。
- 近 30 日趋势：读取 `traffic-summary-last30.json`，使用 `daily` 数据。
- 数据汇总表按当日 / 昨日 / 近 7 日 / 近 30 日四行展示。读取失败或缺失时显示“— / 读取失败 / 暂无数据”，不显示假 0。

真实日志接入后，访问数据需要区分以下口径：

- 全部请求：服务器收到的全部请求，包含静态资源、扫描与异常请求。
- 有效页面访问：命中首页、诊断页、人才页、项目页等已知站内页面的请求，不等于独立用户。
- 外部访客：排除内部测试和已知爬虫后的估算，当前 v1 暂未实现。
- 内部测试：Zane、Codex、本地测试或测试脚本产生的数据，当前 v1 暂未拆分。

未来可以在日志聚合层预留 `allTraffic`、`externalTraffic`、`internalTraffic`、`botTraffic` 等字段。本控制台 v1 不实现真实过滤逻辑，不读取真实 IP，不配置 IP 白名单。

服务器访问趋势指标：

- 全部请求
- 有效页面访问
- 首页访问
- 诊断页访问
- 人才页访问
- 项目页访问
- 404
- 5xx
- 疑似扫描

注意：

- 当前 Nginx 数据是服务器层访问统计，不等于真实用户数
- 独立 IP（非人数）只能作为粗略技术指标，不等于真实人数
- 同一人使用手机流量和电脑 Wi-Fi，可能被统计为多个 IP
- 多人共用同一网络，也可能只统计为一个 IP
- diagnosis-api 未上线前，只能统计诊断页访问，不能统计真实诊断提交次数

## 用户行为统计

用户行为统计来自 analytics-api 产生的匿名访客事件摘要，与 Nginx 服务器请求统计分开展示。

控制台通过本机接口 `/api/console/analytics-summary` 使用 SSH 只读读取服务器上的固定摘要 JSON：

```text
/home/ubuntu/framespark-analytics-summaries/analytics-summary-today.json
/home/ubuntu/framespark-analytics-summaries/analytics-summary-yesterday.json
/home/ubuntu/framespark-analytics-summaries/analytics-summary-last7.json
/home/ubuntu/framespark-analytics-summaries/analytics-summary-last30.json
```

这些摘要由服务器上的 `analytics-api/scripts/run-analytics-summary.sh` 生成，默认每 5 分钟由 cron 刷新一次。

控制台只读取聚合摘要，不读取原始 JSONL，不输出 `visitorId`、`sessionId`、`ipHash` 明细，也不读取剧本材料、上传文件、邮箱、姓名或手机号。

口径说明：

- 匿名独立访客基于浏览器随机 `visitorId` 去重，不等于真实自然人。
- 同一人多设备、清缓存、无痕模式会导致重复计数。
- 新访客 / 回访访客基于服务器可用事件历史判断，不是绝对新用户。
- 用户行为统计更接近浏览器行为；服务器访问统计更适合观察请求量、错误和扫描。

如果 SSH、summary 文件或 cron 异常，模块会显示读取失败；如果 summary 文件长时间未刷新，模块会显示“数据过期”。两种情况都不使用 mock 数据兜底。

用户行为趋势默认显示：

- 匿名独立访客
- 页面浏览
- 诊断入口点击
- 首页→诊断页

其他曲线（点击、诊断页访客、人才页访客、项目页访客）可通过图例打开。匿名独立访客不等于真实自然人，不应命名为真实用户数。

## 后续扩展方向

- 接入真实 Nginx 日志摘要
- 接入匿名访客统计摘要到更多控制台图表
- 增加公安备案、SSL、服务器续费的真实到期日期
- 增加腾讯云部署同步状态
- 增加诊断系统线上 API 健康状态与 provider token 用量摘要
- 单独修复 analytics 服务稳定部署后，恢复用户行为摘要刷新
- 增加 review queue 快速筛选
