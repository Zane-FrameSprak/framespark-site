#!/usr/bin/env node
import fs from 'fs/promises';
import fsSync from 'fs';
import http from 'http';
import path from 'path';
import { execFile, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

const serverPort = 8130;
const serverHost = '127.0.0.1';
const consolePath = '/internal/admin-console/';
const evalConsolePath = '/internal/diagnosis-eval/';
const consoleUrl = `http://${serverHost}:${serverPort}${consolePath}`;

const localPaths = {
  projectRoot: REPO_ROOT,
  statusDoc: path.join(REPO_ROOT, 'docs', '当前项目状态总结.md'),
  projectState: path.join(REPO_ROOT, 'docs', 'ai-handoff', 'PROJECT_STATE.md'),
  nextTasks: path.join(REPO_ROOT, 'docs', 'ai-handoff', 'NEXT_TASKS.md'),
  publicBetaDeployDoc: path.join(REPO_ROOT, 'docs', 'diagnosis', 'DIAGNOSIS_PUBLIC_BETA_DEPLOY_2026-06-26.md'),
  evalConsole: `${consoleUrl.replace('/internal/admin-console/', '/internal/diagnosis-eval/')}`,
  sampleRuns: path.join(REPO_ROOT, 'diagnosis-api', 'test-runs', 'sample-diagnosis'),
  diagnosisLogs: path.join(REPO_ROOT, 'diagnosis-api', 'logs'),
  reviewQueue: path.join(REPO_ROOT, 'diagnosis-api', 'logs', 'diagnosis', 'review-queue')
};

const allowedOpenTargets = {
  officialSite: {
    label: '打开正式官网',
    type: 'url',
    value: 'https://framespark.cn/'
  },
  projectRoot: {
    label: '打开本地项目目录',
    type: 'path',
    value: localPaths.projectRoot
  },
  statusDoc: {
    label: '打开项目状态文档',
    type: 'path',
    value: localPaths.statusDoc
  },
  projectState: {
    label: '打开 AI 项目状态',
    type: 'path',
    value: localPaths.projectState
  },
  nextTasks: {
    label: '打开下一步任务',
    type: 'path',
    value: localPaths.nextTasks
  },
  publicBetaDeployDoc: {
    label: '打开公测部署记录',
    type: 'path',
    value: localPaths.publicBetaDeployDoc
  },
  evalConsole: {
    label: '打开内部评测工作台',
    type: 'url',
    value: localPaths.evalConsole
  },
  sampleRuns: {
    label: '打开样本测试目录',
    type: 'path',
    value: localPaths.sampleRuns
  },
  diagnosisLogs: {
    label: '打开 diagnosis-api/logs 目录',
    type: 'path',
    value: localPaths.diagnosisLogs
  },
  reviewQueue: {
    label: '打开 review queue 目录',
    type: 'path',
    value: localPaths.reviewQueue
  }
};

const optionalBrandTargets = [
  {
    id: 'brandPositioningSheet',
    label: '打开官号与个人号定位表',
    type: 'path',
    value: path.join(REPO_ROOT, 'docs', '官号与个人号定位表.md')
  }
];

const deadlineConfig = [
  {
    id: 'domain',
    label: '域名 framespark.cn 到期时间',
    value: '',
    unknownLabel: '待填写'
  },
  {
    id: 'ssl',
    label: 'SSL 证书到期时间',
    value: '2026-08-13T07:59:59+08:00'
  },
  {
    id: 'server',
    label: '腾讯云服务器到期时间',
    value: '',
    unknownLabel: '待填写'
  },
  {
    id: 'policeFiling',
    label: '公安备案状态',
    statusText: '已通过，页脚图标与链接已上线',
    severity: 'normal'
  },
  {
    id: 'diagnosisApi',
    label: 'diagnosis-api',
    statusText: '公测已上线：匿名 session + Cookie API 边界',
    severity: 'normal'
  },
  {
    id: 'publicDiagnosis',
    label: '公开诊断页',
    statusText: '首页单入口进入公测；/diagnosis/ 为说明页',
    severity: 'normal'
  },
  {
    id: 'betaInviteCodes',
    label: '旧内测码',
    statusText: '不再是普通入口；仅保留历史/回滚记录',
    severity: 'normal'
  },
  {
    id: 'tokenBudget',
    label: 'AI token 预算',
    statusText: '单次 50,000 tokens；全局 5,000,000 tokens/日',
    severity: 'attention'
  },
  {
    id: 'cookieLogging',
    label: 'Cookie 日志',
    statusText: '已关闭写入；site_total cookie 字段为空',
    severity: 'normal'
  },
  {
    id: 'b4Observation',
    label: 'B4 72 小时观测',
    statusText: '未启动；扩量观察期需单独确认',
    severity: 'attention'
  },
  {
    id: 'serverSync',
    label: 'GitHub push 后不会自动同步腾讯云正式站',
    statusText: '仍需手动 sudo rsync；近期官网多次静态部署',
    severity: 'warning'
  }
];

const publicBetaOps = {
  updatedAt: '2026-07-05',
  summaryCards: [
    {
      label: '用户入口',
      value: '首页进入公测',
      note: '不再要求内测码；24 小时匿名 session。',
      state: 'ready'
    },
    {
      label: '诊断页边界',
      value: 'Cookie 保护',
      note: '无有效 Cookie 会回到首页入口。',
      state: 'ready'
    },
    {
      label: '后端版本',
      value: '0104cfe',
      note: '已包含 tiktoken、50,000 token 输入上限。',
      state: 'ready'
    },
    {
      label: '每日预算',
      value: '500 万 tokens',
      note: '触顶后统一提示今日名额已满。',
      state: 'attention'
    },
    {
      label: '真实 smoke',
      value: '2026-06-30 通过',
      note: '1 次虚构材料，4 次 provider 调用。',
      state: 'ready'
    },
    {
      label: '观察窗口',
      value: 'B4 T0 未启动',
      note: '扩量和新真实 AI 调用需单独确认。',
      state: 'attention'
    },
    {
      label: 'analytics',
      value: '独立异常',
      note: '服务工作目录问题，和 Diagnosis 分开处理。',
      state: 'warning'
    },
    {
      label: '安全日志',
      value: 'Cookie 不入日志',
      note: 'site_total 保留空 cookie 字段。',
      state: 'ready'
    }
  ],
  flowSteps: [
    { label: '官网首页', detail: '用户点击进入公测。', state: 'ready' },
    { label: 'public-session', detail: '签发 24 小时页面/API Cookie。', state: 'ready' },
    { label: 'Beta 表单', detail: '粘贴文本、TXT、DOCX。', state: 'ready' },
    { label: '文件大小', detail: '先拦截超 5MB。', state: 'ready' },
    { label: 'token 数', detail: 'cl100k_base，50,000 tokens 上限。', state: 'ready' },
    { label: '每日次数', detail: 'session/IP/global/concurrency 限额。', state: 'attention' },
    { label: 'AI 预算', detail: 'provider 次数与 token 总预算。', state: 'attention' },
    { label: '人工复盘', detail: '观察成本、错误、日志和用户反馈。', state: 'pending' }
  ]
};

const dashboardConfig = {
  title: 'FrameSpark 内部控制台',
  subtitle: '公测运营只读工具',
  badges: ['只监听 127.0.0.1', '不部署公网', '只读扫描', '不触发 AI'],
  nginxLogPaths: [
    '/www/wwwlogs/framespark.cn.log',
    '/www/wwwlogs/framespark.cn.error.log'
  ],
  defaultVisibleSeries: ['pv', 'uniqueIp', 'diagnosis']
};

const trafficSummaryConfig = {
  server: 'ubuntu@124.221.146.10',
  sshTimeoutMs: 8000,
  reports: {
    today: '/home/ubuntu/framespark-reports/traffic-summary-today.json',
    yesterday: '/home/ubuntu/framespark-reports/traffic-summary-yesterday.json',
    last7: '/home/ubuntu/framespark-reports/traffic-summary-last7.json',
    last30: '/home/ubuntu/framespark-reports/traffic-summary-last30.json'
  }
};

const analyticsSummaryConfig = {
  server: 'ubuntu@124.221.146.10',
  sshTimeoutMs: 8000,
  reports: {
    today: '/home/ubuntu/framespark-analytics-summaries/analytics-summary-today.json',
    yesterday: '/home/ubuntu/framespark-analytics-summaries/analytics-summary-yesterday.json',
    last7: '/home/ubuntu/framespark-analytics-summaries/analytics-summary-last7.json',
    last30: '/home/ubuntu/framespark-analytics-summaries/analytics-summary-last30.json'
  }
};

const staticRoot = path.join(REPO_ROOT, 'internal');
const allowedStaticPrefixes = [consolePath, evalConsolePath];
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const args = new Set(process.argv.slice(2));

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: 'INTERNAL_CONSOLE_ERROR',
      message: err.message || '内部控制台暂时不可用。'
    });
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${serverPort} 已被占用。请先关闭占用该端口的本地服务后再启动 FrameSpark 内部控制台。`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

server.listen(serverPort, serverHost, () => {
  console.log(`FrameSpark 内部控制台已启动：${consoleUrl}`);
  console.log('本地服务只监听 127.0.0.1，不对公网开放。');
  if (args.has('--open')) {
    openWithMac(consoleUrl);
  }
});

async function handleRequest(req, res) {
  const url = new URL(req.url, consoleUrl);

  if (req.method === 'GET' && url.pathname === '/api/console/config') {
    sendJson(res, 200, {
      ok: true,
      config: await buildPublicConfig()
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/console/summary') {
    sendJson(res, 200, {
      ok: true,
      summary: await buildSummary()
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/console/traffic-summary') {
    const result = await readServerTrafficReports();
    sendJson(res, result.ok ? 200 : 502, result);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/console/analytics-summary') {
    const result = await readServerAnalyticsReports();
    sendJson(res, result.ok ? 200 : 502, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/console/open-target') {
    const body = await readJsonBody(req, 4096);
    const result = await openAllowedTarget(body.targetId);
    sendJson(res, result.ok ? 200 : result.status, result);
    return;
  }

  if (req.method === 'GET') {
    await serveStatic(url.pathname, res);
    return;
  }

  sendJson(res, 405, {
    ok: false,
    error: 'METHOD_NOT_ALLOWED',
    message: '不支持的请求方式。'
  });
}

async function buildPublicConfig() {
  const targets = { ...allowedOpenTargets };
  for (const target of optionalBrandTargets) {
    if (target.type === 'path' && await pathExists(target.value)) {
      targets[target.id] = target;
    }
  }

  return {
    server: {
      host: serverHost,
      port: serverPort,
      url: consoleUrl
    },
    dashboard: dashboardConfig,
    publicBetaOps,
    deadlines: deadlineConfig.map(formatDeadline),
    openTargets: Object.entries(targets).map(([id, target]) => ({
      id,
      label: target.label,
      group: getTargetGroup(id),
      available: target.type === 'url' ? true : fsSync.existsSync(target.value),
      missingLabel: target.type === 'path' && !fsSync.existsSync(target.value) ? '路径不存在' : ''
    }))
  };
}

function formatDeadline(item) {
  if (item.statusText) {
    return {
      id: item.id,
      category: getDeadlineCategory(item.id),
      label: item.label,
      value: item.statusText,
      severity: item.severity || 'normal',
      daysLeft: null
    };
  }

  if (!item.value) {
    return {
      id: item.id,
      category: getDeadlineCategory(item.id),
      label: item.label,
      value: item.unknownLabel || '待填写',
      severity: 'unknown',
      daysLeft: null
    };
  }

  const due = new Date(item.value);
  const now = new Date();
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  let severity = 'normal';
  if (daysLeft < 7) severity = 'urgent';
  else if (daysLeft < 30) severity = 'attention';

  return {
    id: item.id,
    category: getDeadlineCategory(item.id),
    label: item.label,
    value: formatDateTime(due),
    severity,
    daysLeft
  };
}

async function buildSummary() {
  const [diagnosisLogs, reviewQueue, sampleRuns, traffic] = await Promise.all([
    countDiagnosisLogs(),
    countReviewQueue(),
    countSampleRuns(),
    readTrafficSummary()
  ]);

  const pdfQuality = await countPdfQualityIssues();
  const reminders = buildReminders({ diagnosisLogs, reviewQueue, sampleRuns, pdfQuality, traffic });

  return {
    refreshedAt: new Date().toISOString(),
    traffic,
    counts: {
      diagnosisLogs,
      reviewQueue,
      sampleRuns,
      pdfQuality
    },
    reminders
  };
}

async function readServerTrafficReports() {
  try {
    const entries = await Promise.all(Object.entries(trafficSummaryConfig.reports).map(async ([key, reportPath]) => {
      const json = await readRemoteJson(trafficSummaryConfig, reportPath);
      return [key, json];
    }));

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      source: 'server-ssh',
      server: trafficSummaryConfig.server,
      reports: Object.fromEntries(entries)
    };
  } catch (err) {
    return {
      ok: false,
      error: 'TRAFFIC_SUMMARY_READ_FAILED',
      message: err.message || '读取服务器访问摘要失败。'
    };
  }
}

async function readServerAnalyticsReports() {
  try {
    const entries = await Promise.all(Object.entries(analyticsSummaryConfig.reports).map(async ([key, reportPath]) => {
      const json = await readRemoteJson(analyticsSummaryConfig, reportPath);
      return [key, json];
    }));

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      source: 'server-ssh',
      server: analyticsSummaryConfig.server,
      reports: Object.fromEntries(entries)
    };
  } catch (err) {
    return {
      ok: false,
      error: 'ANALYTICS_SUMMARY_READ_FAILED',
      message: err.message || '读取匿名访客统计摘要失败。'
    };
  }
}

function readRemoteJson(config, reportPath) {
  return new Promise((resolve, reject) => {
    execFile('ssh', [
      '-o', 'BatchMode=yes',
      '-o', `ConnectTimeout=${Math.ceil(config.sshTimeoutMs / 1000)}`,
      config.server,
      'cat',
      reportPath
    ], {
      timeout: config.sshTimeoutMs,
      maxBuffer: 1024 * 1024 * 4
    }, (error, stdout, stderr) => {
      if (error) {
        const detail = String(stderr || error.message || '').trim();
        reject(new Error(`读取 ${reportPath} 失败：${detail || error.code || 'SSH 读取失败'}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (parseError) {
        reject(new Error(`解析 ${reportPath} JSON 失败：${parseError.message}`));
      }
    });
  });
}

async function countDiagnosisLogs() {
  const files = await listFilesSafe(path.join(REPO_ROOT, 'diagnosis-api', 'logs', 'diagnosis', 'by-date'));
  return countByDate(files.filter(file => file.endsWith('.json')));
}

async function countReviewQueue() {
  const files = await listFilesSafe(path.join(REPO_ROOT, 'diagnosis-api', 'logs', 'diagnosis', 'review-queue'));
  return countByDate(files.filter(file => file.endsWith('.md') || file.endsWith('.json')));
}

async function countSampleRuns() {
  const base = path.join(REPO_ROOT, 'diagnosis-api', 'test-runs', 'sample-diagnosis');
  const entries = await readdirSafe(base);
  const runDirs = [];
  for (const entry of entries) {
    if (!/^20\d{2}-\d{2}-\d{2}-/.test(entry.name)) continue;
    if (entry.isDirectory()) runDirs.push(path.join(base, entry.name));
  }
  return countByDate(runDirs);
}

async function countPdfQualityIssues() {
  const base = path.join(REPO_ROOT, 'diagnosis-api', 'test-runs', 'sample-diagnosis');
  const entries = await readdirSafe(base);
  let warning = 0;
  let failed = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^20\d{2}-\d{2}-\d{2}-/.test(entry.name)) continue;
    const indexPath = path.join(base, entry.name, 'samples-index.json');
    const samples = await readJsonSafe(indexPath, []);
    if (!Array.isArray(samples)) continue;
    for (const sample of samples) {
      if (sample.textQualityStatus === 'warning') warning += 1;
      if (sample.textQualityStatus === 'failed') failed += 1;
    }
  }
  return { warning, failed };
}

async function readTrafficSummary() {
  return normalizeTraffic({
    source: 'server-summary-pending',
    isMock: false,
    note: '真实访问统计由 /api/console/traffic-summary 读取服务器摘要 JSON。',
    hours: []
  });
}

function normalizeTraffic(raw) {
  const rawHours = Array.isArray(raw.hours) ? raw.hours : [];
  const hours = Array.from({ length: rawHours.length ? 24 : 0 }, (_, hour) => {
    const found = rawHours.find(item => Number(item.hour) === hour) || {};
    return {
      hour,
      pv: toSafeNumber(found.pv),
      uniqueIp: toSafeNumber(found.uniqueIp),
      home: toSafeNumber(found.home),
      diagnosis: toSafeNumber(found.diagnosis),
      talent: toSafeNumber(found.talent),
      notFound: toSafeNumber(found.notFound),
      serverError: toSafeNumber(found.serverError)
    };
  });
  return {
    source: raw.source || 'local-mock-summary',
    isMock: raw.isMock !== false && String(raw.source || 'local-mock-summary').includes('mock'),
    note: raw.note || '',
    nginxLogPaths: dashboardConfig.nginxLogPaths,
    series: [
      { key: 'pv', label: '全站 PV', color: '#2563eb', defaultVisible: true },
      { key: 'uniqueIp', label: '独立 IP', color: '#16a34a', defaultVisible: true },
      { key: 'home', label: '首页访问', color: '#f59e0b', defaultVisible: false },
      { key: 'diagnosis', label: '诊断页访问', color: '#dc2626', defaultVisible: true },
      { key: 'talent', label: '人才页访问', color: '#7c3aed', defaultVisible: false },
      { key: 'notFound', label: '404', color: '#64748b', defaultVisible: false },
      { key: 'serverError', label: '5xx', color: '#111827', defaultVisible: false }
    ],
    hours
  };
}

function buildReminders({ reviewQueue, pdfQuality, traffic }) {
  const reminders = [];
  const serverErrors = traffic.hours.reduce((sum, item) => sum + item.serverError, 0);
  const notFound = traffic.hours.reduce((sum, item) => sum + item.notFound, 0);
  const diagnosisVisits = traffic.hours.reduce((sum, item) => sum + item.diagnosis, 0);
  const trafficLabel = traffic.isMock ? '（模拟数据）' : '';

  if (serverErrors > 0) reminders.push({ level: 'urgent', text: `今日趋势中出现 ${serverErrors} 次 5xx${trafficLabel}，需要排查。` });
  if (notFound > 0) reminders.push({ level: 'attention', text: `今日趋势中出现 ${notFound} 次 404${trafficLabel}，可检查入口链接。` });
  if (reviewQueue.today > 0) reminders.push({ level: 'attention', text: `今日新增 ${reviewQueue.today} 条 review queue 待复查。` });
  if (reviewQueue.userFeedbackToday > 0) reminders.push({ level: 'attention', text: `今日新增 ${reviewQueue.userFeedbackToday} 条用户反馈。` });
  if (pdfQuality.warning + pdfQuality.failed > 0) {
    reminders.push({ level: 'attention', text: `PDF 文本质量需复查：warning ${pdfQuality.warning}，failed ${pdfQuality.failed}。` });
  }
  if (diagnosisVisits >= 20) {
    reminders.push({ level: 'attention', text: `诊断页访问较多${trafficLabel}，请结合 provider 调用、metadata 和费用判断真实诊断提交。` });
  }
  reminders.push({ level: 'normal', text: 'Diagnosis 公测入口已上线；首页按钮签发匿名 session，/diagnosis/beta/ 仍由 Cookie 边界保护。' });
  reminders.push({ level: 'attention', text: '公测费用闸门已上线：单次 50,000 tokens，全局 5,000,000 tokens/日。扩量前先看 provider tokens。' });
  reminders.push({ level: 'normal', text: 'Nginx site_total 已停止写入 Cookie；如面板保存或改 Nginx，需复查日志格式。' });
  reminders.push({ level: 'attention', text: 'B4 T0 尚未启动；下一次真实 AI 调用或观察窗口仍需单独确认。' });
  if (!reminders.length) reminders.push({ level: 'normal', text: '当前没有高优先级提醒。' });
  return reminders;
}

async function openAllowedTarget(targetId) {
  const target = { ...allowedOpenTargets, ...Object.fromEntries(optionalBrandTargets.map(target => [target.id, target])) }[targetId];
  if (!target) {
    return { ok: false, status: 400, error: 'TARGET_NOT_ALLOWED', message: '不允许打开该目标。' };
  }

  if (target.type === 'path' && !await pathExists(target.value)) {
    return { ok: false, status: 404, error: 'PATH_NOT_FOUND', message: '路径不存在。' };
  }

  openWithMac(target.value);
  return { ok: true, targetId, message: '已发送打开请求。' };
}

function openWithMac(value) {
  const child = spawn('open', [value], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
}

async function serveStatic(pathname, res) {
  const normalized = pathname === '/' ? `${consolePath}index.html` : pathname;
  const matchedPrefix = allowedStaticPrefixes.find(prefix => normalized.startsWith(prefix));
  if (!matchedPrefix) {
    sendText(res, 404, 'Not found');
    return;
  }

  let relative = normalized.slice('/internal/'.length) || 'admin-console/index.html';
  if (relative.endsWith('/')) relative += 'index.html';
  const safeRelative = path.normalize(relative).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.resolve(staticRoot, safeRelative);
  if (!filePath.startsWith(staticRoot + path.sep) && filePath !== staticRoot) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  const stat = await statSafe(filePath);
  if (!stat || !stat.isFile()) {
    sendText(res, 404, 'Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': contentTypes[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  fsSync.createReadStream(filePath).pipe(res);
}

function countByDate(paths) {
  const todayKey = getDateKey(new Date());
  const weekStart = startOfLocalDay(new Date());
  weekStart.setDate(weekStart.getDate() - 6);

  let today = 0;
  let week = 0;
  for (const filePath of paths) {
    const date = extractDateFromPath(filePath) || getDateKeyFromMtime(filePath);
    if (!date) continue;
    if (date === todayKey) today += 1;
    if (date >= getDateKey(weekStart)) week += 1;
  }

  const userFeedbackToday = paths.filter(filePath => filePath.includes(`${path.sep}user-feedback${path.sep}`))
    .filter(filePath => (extractDateFromPath(filePath) || getDateKeyFromMtime(filePath)) === todayKey)
    .length;

  return { today, week, userFeedbackToday };
}

function extractDateFromPath(filePath) {
  const match = filePath.match(/(20\d{2}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function getDateKeyFromMtime(filePath) {
  try {
    return getDateKey(fsSync.statSync(filePath).mtime);
  } catch (_) {
    return '';
  }
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateTime(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function listFilesSafe(root) {
  const out = [];
  const entries = await readdirSafe(root);
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...await listFilesSafe(fullPath));
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

async function readdirSafe(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

async function statSafe(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (_) {
    return null;
  }
}

async function pathExists(filePath) {
  return Boolean(await statSafe(filePath));
}

function toSafeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

async function readJsonBody(req, maxBytes) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > maxBytes) {
      throw new Error('请求体过大。');
    }
  }
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(text);
}

function getTargetGroup(id) {
  if (['officialSite', 'projectRoot', 'statusDoc', 'projectState', 'nextTasks'].includes(id)) return '网站与项目';
  if (['publicBetaDeployDoc'].includes(id)) return '公测运营';
  if (['evalConsole', 'sampleRuns', 'diagnosisLogs', 'reviewQueue'].includes(id)) return '诊断与测试';
  return '品牌与运营';
}

function getDeadlineCategory(id) {
  if (['domain', 'ssl', 'server'].includes(id)) return '到期类';
  if (['policeFiling', 'diagnosisApi', 'publicDiagnosis', 'betaInviteCodes', 'tokenBudget', 'cookieLogging', 'b4Observation'].includes(id)) return '状态类';
  return '操作风险类';
}
