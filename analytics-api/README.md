# FrameSpark Analytics API

这是 FrameSpark 的匿名访客统计服务 v1，用于接收官网前端上报的匿名 `page_view` / `click` 事件。

它独立于 `diagnosis-api`，不调用 AI，不接收剧本材料，不处理诊断报告，也不影响公开诊断页的开放策略。

## 统计口径

本服务统计的是基于浏览器匿名 `visitorId` 的访问行为：

- 它比 Nginx 请求数、独立 IP 更接近真实用户行为。
- 它不是实名用户统计，也不等于真实自然人数量。
- 同一人使用多设备会被计为多个访客。
- 清除浏览器缓存、无痕模式或更换浏览器会重新计数。

后续前端会通过 `localStorage` 保存 `fs_visitor_id`，通过 `sessionStorage` 保存 `fs_session_id`。

## 当前接口

### GET /health

```json
{
  "ok": true,
  "service": "analytics-api"
}
```

### POST /api/analytics/event

只接收 JSON。

允许字段：

```json
{
  "eventId": "optional-event-id",
  "visitorId": "fs_visitor_xxx",
  "sessionId": "fs_session_xxx",
  "eventType": "page_view",
  "path": "/diagnosis/",
  "pageType": "diagnosis",
  "targetId": "diagnosis-entry",
  "timestamp": "2026-05-26T12:00:00.000Z",
  "referrer": "https://framespark.cn/",
  "userAgentHash": "sha256-short-value",
  "screen": "1440x900",
  "language": "zh-CN"
}
```

白名单：

- `eventType`: `page_view` / `click`
- `pageType`: `home` / `diagnosis` / `talent` / `project` / `legal` / `error` / `other`

服务端会补充：

- `receivedAt`
- `ipHash`
- `source: "analytics-api"`

服务端不会保存完整 IP。

## 数据存储

默认写入：

```text
/home/ubuntu/framespark-analytics/events-YYYY-MM-DD.jsonl
```

每行一个 JSON 事件。

本地开发可指定：

```bash
ANALYTICS_DATA_DIR=analytics-api/data
```

`analytics-api/data/` 已加入 `.gitignore`，不要提交真实事件数据。

## 匿名访客统计摘要

analytics-api 原始事件是 JSONL，内部控制台后续不会直接读取原始事件，而是读取聚合后的摘要 JSON。

手动生成摘要：

```bash
cd /tmp/framespark-site
bash analytics-api/scripts/run-analytics-summary.sh
```

默认读取：

```text
/home/ubuntu/framespark-analytics
```

默认输出：

```text
/home/ubuntu/framespark-analytics-summaries/analytics-summary-today.json
/home/ubuntu/framespark-analytics-summaries/analytics-summary-yesterday.json
/home/ubuntu/framespark-analytics-summaries/analytics-summary-last7.json
/home/ubuntu/framespark-analytics-summaries/analytics-summary-last30.json
```

安装定时任务：

```bash
cd /tmp/framespark-site
sudo bash analytics-api/scripts/install-analytics-summary-cron.sh
```

cron 每 5 分钟运行一次，日志写入：

```text
/home/ubuntu/framespark-analytics-summaries/analytics-summary-cron.log
```

摘要包含：

- 匿名访客数、会话数、页面浏览数、点击数
- 首页 / 诊断页 / 人才页 / 项目页访客与浏览
- 诊断入口、人才入口、项目卡片点击
- 首页到诊断页的轻量漏斗
- today / yesterday 的按小时统计
- last7 / last30 的按天统计

摘要只输出聚合数量，不输出 `visitorId`、`sessionId`、`ipHash` 明细，不输出原始事件，不保存邮箱、姓名、剧本正文或上传材料。

匿名访客数不等于真实自然人数量：同一人多设备、清缓存、无痕模式会造成误差。该数据用于观察匿名浏览器行为趋势，不用于实名用户判断。

## 本地启动

安装依赖后：

```bash
cd /Users/chenzuhuanhuan/framespark-site/analytics-api
npm install
ANALYTICS_DATA_DIR=data ANALYTICS_PORT=8788 npm start
```

本地健康检查：

```bash
curl http://127.0.0.1:8788/health
```

本地事件测试：

```bash
curl -X POST http://127.0.0.1:8788/api/analytics/event \
  -H 'Content-Type: application/json' \
  -d '{
    "visitorId": "fs_visitor_test_001",
    "sessionId": "fs_session_test_001",
    "eventType": "page_view",
    "path": "/",
    "pageType": "home"
  }'
```

## 服务器部署

analytics-api 在服务器上应作为 systemd 后台服务运行，只监听 `127.0.0.1:8787`。它不直接对公网开放；后续需要 Nginx 反代 `/api/analytics/` 才能被官网页面访问。

1. 更新服务器代码：

```bash
cd /tmp/framespark-site
git pull
```

2. 安装依赖：

```bash
cd /tmp/framespark-site/analytics-api
npm install --omit=dev
```

3. 临时测试：

```bash
ANALYTICS_HOST=127.0.0.1 \
ANALYTICS_PORT=8787 \
ANALYTICS_DATA_DIR=/home/ubuntu/framespark-analytics \
npm start
```

4. 安装 systemd 服务：

```bash
cd /tmp/framespark-site
sudo bash analytics-api/scripts/install-systemd-service.sh
```

安装脚本会创建：

```text
framespark-analytics.service
```

服务配置：

- 运行用户：`ubuntu`
- 工作目录：`/tmp/framespark-site/analytics-api`
- 启动命令：`/usr/bin/npm start`
- 监听地址：`127.0.0.1:8787`
- 数据目录：`/home/ubuntu/framespark-analytics`
- 自动重启：`Restart=always`

5. 查看状态：

```bash
sudo systemctl status framespark-analytics.service --no-pager
curl -s http://127.0.0.1:8787/health
```

6. 查看日志：

```bash
journalctl -u framespark-analytics.service -n 80 --no-pager
```

7. 卸载服务：

```bash
sudo bash analytics-api/scripts/uninstall-systemd-service.sh
```

卸载脚本只停止并移除 systemd 服务，不删除数据目录：

```text
/home/ubuntu/framespark-analytics
```

analytics 日志只应保存在该目录，不应写入 `/www/wwwroot/framespark.cn/` 等公网目录。

## Nginx 反代

analytics-api 服务只监听 `127.0.0.1:8787`。公网访问需要 Nginx 只暴露 `/api/analytics/`，不要暴露 `/health`、数据目录或其他内部路径。

1. 确认本机服务：

```bash
curl -s http://127.0.0.1:8787/health
```

2. 安装 Nginx 反代：

```bash
cd /tmp/framespark-site
sudo bash analytics-api/scripts/install-nginx-proxy.sh
```

该脚本只会在 `/www/server/panel/vhost/nginx/framespark.cn.conf` 的 HTTPS server 块中插入带标记的 `/api/analytics/` location。脚本会先备份配置，执行 `nginx -t`，失败时自动恢复备份；成功后 reload Nginx。

3. 公网 HTTPS 测试：

当前 analytics-api 只有本机 `/health`，没有公网 `/api/analytics/health`。公网应使用事件接口测试：

```bash
curl -s -X POST https://framespark.cn/api/analytics/event \
  -H 'Content-Type: application/json' \
  -d '{
    "visitorId": "fs_test_visitor_001",
    "sessionId": "fs_test_session_001",
    "eventType": "page_view",
    "path": "/",
    "pageType": "home"
  }'
```

预期返回：

```json
{"ok":true}
```

4. 卸载 Nginx 反代：

```bash
sudo bash analytics-api/scripts/uninstall-nginx-proxy.sh
```

卸载脚本只删除 `# FrameSpark analytics proxy start` 到 `# FrameSpark analytics proxy end` 之间的 block，不删除 analytics-api 服务，也不删除 `/home/ubuntu/framespark-analytics` 数据目录。

说明：

- Nginx 只暴露 `/api/analytics/`
- analytics-api 仍只监听 `127.0.0.1`
- 不暴露 `/health` 到公网
- 不影响静态官网页面
- 不影响 `diagnosis-api`
- 不暴露 analytics 日志目录

## 环境变量

- `ANALYTICS_HOST`：默认 `127.0.0.1`
- `ANALYTICS_PORT`：默认 `8787`
- `ANALYTICS_DATA_DIR`：默认 `/home/ubuntu/framespark-analytics`
- `ANALYTICS_BODY_LIMIT`：默认 `20kb`
- `ANALYTICS_EVENT_SIZE_BYTES`：默认 `20480`
- `ANALYTICS_RATE_LIMIT_PER_MINUTE`：默认 `120`

本服务不读取主项目 `.env`，也不需要密钥。

## 安全边界

当前 v1 必须遵守：

- 不保存剧本正文
- 不保存上传材料
- 不保存邮箱、姓名、手机号
- 不采集精确地理位置
- 不使用浏览器指纹
- 不允许前端控制文件路径
- 不写入公网目录
- 不写入仓库 `logs/`
- 不依赖 `diagnosis-api`
- 不调用 `/api/diagnosis`
- 不调用 AI

v1 使用单进程内存限流，每 IP 每分钟 120 次。服务重启后计数会清空，多实例部署时应换成 Redis、Nginx 限流或其他共享限流。

## 后续步骤

1. 公开页面已接入 `js/analytics.js`，并为关键入口添加 `data-analytics-target`。
2. 隐私政策草案已覆盖匿名访客统计边界，正式长期使用前仍应经过法律审核。
3. 下一步是让服务器定时生成 analytics summary JSON。
4. 为内部控制台新增“用户行为统计”模块，与 Nginx 服务器访问统计分开展示。
