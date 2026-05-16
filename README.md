# FrameSpark 帧火花官网

帧火花官网当前是一个可扩展静态站点骨架，用于承载品牌首页、项目展示、剧本诊断系统入口、人才平台入口、法律页面和后续项目详情页。

## 当前结构

```text
framespark/
├─ index.html
├─ 404.html
├─ robots.txt
├─ sitemap.xml
├─ site.webmanifest
├─ assets/
│  ├─ brand/
│  └─ projects/
├─ css/
│  └─ style.css
├─ js/
│  ├─ site-data.js
│  └─ main.js
├─ projects/
│  └─ template.html
├─ diagnosis/
│  └─ index.html
├─ talent/
│  └─ index.html
├─ legal/
│  ├─ privacy.html
│  └─ terms.html
└─ docs/
```

## 本地预览

这是纯静态站点，可以直接用任意静态服务器预览。

如果电脑安装了 Node.js，可在项目根目录启动临时服务器：

```bash
npx serve .
```

或使用任何 Nginx / 宝塔 / 静态托管平台部署整个目录。

## 内容维护

首页主要内容集中在：

```text
js/site-data.js
```

包括：

- 项目展示：`FrameSparkData.projects`
- 系统与平台：`FrameSparkData.platforms`
- 创作生态：`FrameSparkData.ecosystem`

详细维护规则见：

```text
docs/内容维护说明.md
```

## 当前阶段

- 首页主体已完成。
- 项目展示已改为数据驱动跑马灯。
- 剧本诊断系统、人才平台、法律页面已有占位入口。
- SEO、favicon、manifest、robots、sitemap 已补齐。

## 后续重点

- 手机端和桌面端完整视觉 QA。
- 正式备案号和公安备案信息补充。
- 项目详情页从模板落地为真实页面。
- 剧本诊断系统 MVP 单独进入功能开发阶段。
- 人才平台/小程序单独进入功能开发阶段。
