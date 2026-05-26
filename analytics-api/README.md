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

1. `js/analytics.js` 草案用于在前端生成匿名 `visitorId` / `sessionId`，但尚未接入任何公开页面。
2. 接入公开页面前，必须确认隐私政策草案已经上线并覆盖匿名访客统计边界。
3. 下一步才是在公开页面添加 `script` 标签，并为关键入口添加 `data-analytics-target`。
4. 为内部控制台新增“用户行为统计”模块，与 Nginx 服务器访问统计分开展示。
