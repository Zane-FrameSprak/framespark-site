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

第一版默认使用本地 mock 摘要数据，图表用于占位展示结构，不代表真实线上访问量。页面会明确标注：

```text
当前为本地 mock 摘要，尚未接入真实服务器 Nginx 日志
```

如果今日提醒中出现 404、5xx 或访问趋势提醒，且数据来源仍是 mock，也会标注“模拟数据”。

真实服务器日志路径为：

```text
/www/wwwlogs/framespark.cn.log
/www/wwwlogs/framespark.cn.error.log
```

后续可以新增 Nginx 日志聚合脚本，将日志解析为本地 summary JSON，再由控制台读取。

当前 v1 尚未接入真实服务器 Nginx 日志。不要用 v1 图表判断真实线上流量。

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
- diagnosis-api 未上线前，只能统计诊断页访问，不能统计真实诊断提交次数

## 后续扩展方向

- 接入真实 Nginx 日志摘要
- 增加公安备案、SSL、服务器续费的真实到期日期
- 增加腾讯云部署同步状态
- 增加诊断系统线上 API 健康状态
- 增加 review queue 快速筛选
