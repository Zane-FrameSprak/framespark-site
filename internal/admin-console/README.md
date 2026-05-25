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
- 打开正式官网、本地项目目录、项目状态文档
- 打开诊断系统测试区、样本测试目录、诊断日志目录、review queue 目录
- 查看网站访问趋势图
- 查看本地诊断日志、review queue、样本测试批次的今日 / 本周概览
- 查看 PDF 文本质量 warning / failed 样本数量
- 查看今日高价值提醒

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

## 网站访问趋势图

控制台默认数据必须来自真实来源。当前 v1 尚未接入真实服务器 Nginx 日志，因此访问趋势图和数据汇总默认显示空状态，不展示 mock 曲线、mock 折点或 mock 汇总数字。页面会明确标注：

```text
当前未接入真实 Nginx 日志，访问趋势与汇总暂不可用于运营判断
```

未接入数据源时使用 “— / 待接入真实日志”，不能用 mock 或 0 代替。0 只表示真实数据源已经接入且统计结果为 0。

真实服务器日志路径为：

```text
/www/wwwlogs/framespark.cn.log
/www/wwwlogs/framespark.cn.error.log
```

后续真实访问统计接入 `scripts/nginx-traffic-summary.js` 生成的真实摘要 JSON，默认不使用 mock；接入方案见 `docs/内部控制台真实访问统计接入说明.md`。
该摘要脚本会区分 `pageViews` 和更保守的 `validPageViews`：`validPageViews` 只统计已知站内页面，扫描路径、随机路径和 `/mailto:` 等异常请求不会进入有效访问。
服务器上的真实访问统计摘要由 `scripts/run-nginx-traffic-summary.sh` 生成，默认存放在 `/home/ubuntu/framespark-reports/`，控制台后续读取该目录中的 JSON。

当前 v1 尚未接入真实服务器 Nginx 日志。不要用 v1 图表判断真实线上流量。

如果后续为了 UI 调试保留 mock 数据，必须默认关闭，只能通过代码中的明确开发开关启用；mock 不得作为默认看板数据，也不得用于运营判断。

v1 暂不做复杂 X / Y 轴滑块。当日图的 X 轴固定为 0–24 小时，滑移价值有限。后续接入真实多日数据后，可以再做缩放、平移或时间范围选择。

当前周期入口的规则：

- 当日趋势：待接入真实 Nginx 日志后启用；未接入前不绘制曲线。
- 昨日趋势：待接入真实 Nginx 日志后启用。
- 近 7 日趋势 / 近 30 日趋势：需要接入真实 Nginx 日志聚合后启用。
- 数据汇总表按当日 / 昨日 / 近 7 日 / 近 30 日四行展示。未接入真实日志时全部显示“—”和“待接入真实日志”，不显示假 0。

真实日志接入后，访问数据需要区分以下口径：

- 全部访问：包含自己访问、测试请求、爬虫和外部用户。
- 外部访客：排除内部测试和已知爬虫后的估算。
- 内部测试：Zane、Codex、本地测试或测试脚本产生的数据。

未来可以在日志聚合层预留 `allTraffic`、`externalTraffic`、`internalTraffic`、`botTraffic` 等字段。本控制台 v1 不实现真实过滤逻辑，不读取真实 IP，不配置 IP 白名单。

当前图表指标：

- 全站 PV
- 独立 IP
- 首页访问
- 诊断页访问
- 人才页访问
- 404
- 5xx

注意：

- PV 是访问次数，不等于用户数
- 独立 IP 不等于真实人数
- 同一人使用手机流量和电脑 Wi-Fi，可能被统计为多个 IP
- 多人共用同一网络，也可能只统计为一个 IP
- diagnosis-api 未上线前，只能统计诊断页访问，不能统计真实诊断提交次数

## 后续扩展方向

- 接入真实 Nginx 日志摘要
- 增加公安备案、SSL、服务器续费的真实到期日期
- 增加腾讯云部署同步状态
- 增加诊断系统线上 API 健康状态
- 增加 review queue 快速筛选
