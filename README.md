# FrameSpark 帧火花官网

帧火花官网当前是一个可扩展的静态站点骨架，用于承载品牌首页、项目展示、剧本诊断系统入口、人才平台入口、法律页面和后续项目详情页。

## 当前结构

```text
framespark/
├─ index.html
├─ 404.html
├─ robots.txt
├─ sitemap.xml
├─ site.webmanifest
├─ .nojekyll
├─ .github/
│  └─ workflows/
│     └─ pages.yml
├─ assets/
│  ├─ brand/
│  └─ projects/
├─ css/
│  └─ style.css
├─ js/
│  ├─ site-data.js
│  └─ main.js
├─ diagnosis-api/
│  └─ src/
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

也可以使用 Nginx、宝塔、GitHub Pages、Cloudflare Pages、Vercel、Netlify 等静态托管平台部署整个目录。

## GitHub Pages 部署

项目已内置 GitHub Pages 自动部署流程：

```text
.github/workflows/pages.yml
```

推送到 `main` 分支后，GitHub Actions 会自动发布整站静态文件。

如果是第一次启用，需要在 GitHub 仓库 `Settings -> Pages` 中把构建来源设置为 `GitHub Actions`。

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
- 剧本诊断系统已进入低额度公开 Beta：用户从首页 `进入公测` 获取短期匿名访问凭证后进入 `/diagnosis/beta/`。
- 正式 `/diagnosis/` 仍是介绍页；实际上传和诊断表单在受保护的 Beta 页面。
- 诊断后端已独立部署，支持粘贴文本、`.txt`、`.docx`，并受文件大小、token、每日次数、provider 调用和每日 provider token 预算限制。
- 人才平台仍是筹备入口，不是开放的真实匹配或招聘系统。
- 法律页面已上线并跟随公测隐私边界维护。
- SEO、favicon、manifest、robots、sitemap 已补齐。
- GitHub Pages 自动部署流程已补齐；腾讯云正式站仍按单独的 rsync/服务器流程同步。

## 后续重点

- 手机端和桌面端完整视觉 QA。
- 项目详情页从模板落地为真实页面。
- 剧本诊断系统公测观察、质量评估和成本控制。
- 人才平台/小程序单独进入功能开发阶段。
