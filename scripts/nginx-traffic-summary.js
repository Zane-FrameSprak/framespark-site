#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TIMEZONE = 'Asia/Shanghai';
const MONTHS = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11
};

const STATIC_EXTENSIONS = new Set([
  '.css',
  '.js',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.woff',
  '.woff2',
  '.map',
  '.txt',
  '.xml',
  '.webmanifest'
]);

const NORMAL_PAGE_METHODS = new Set(['GET', 'HEAD']);
const NORMAL_METHODS = new Set(['GET', 'POST', 'HEAD', 'OPTIONS']);
const SUSPICIOUS_PATH_PARTS = [
  '/.',
  '/wp-admin',
  '/wp-login',
  '/phpmyadmin',
  '/version',
  '/v1',
  '/grpc',
  'mstshash',
  'credentials',
  'token',
  'config.yml',
  'accesstokens',
  'azureprofile',
  'application_default_credentials'
];
const SUSPICIOUS_UA_PARTS = [
  'palo alto',
  'go-http-client',
  'masscan',
  'zgrab',
  'curl',
  'python-requests',
  'bot',
  'spider',
  'crawler'
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--self-test') {
      args.selfTest = true;
      continue;
    }
    if (!token.startsWith('--')) {
      throw new Error(`未知参数：${token}`);
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`参数 ${token} 缺少取值`);
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

function getShanghaiDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

function addDays(dateKey, offset) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function eachDate(startDate, endDate) {
  const dates = [];
  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

function resolveRange(args) {
  if (args.date && args.range) {
    throw new Error('不能同时使用 --date 和 --range');
  }
  if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new Error('--date 必须使用 YYYY-MM-DD 格式');
  }

  const today = getShanghaiDateKey();
  if (args.date) {
    return {
      type: 'date',
      startDate: args.date,
      endDate: args.date,
      expectedDates: [args.date]
    };
  }

  const range = args.range || 'today';
  if (range === 'today') {
    return {
      type: 'today',
      startDate: today,
      endDate: today,
      expectedDates: [today]
    };
  }
  if (range === 'yesterday') {
    const yesterday = addDays(today, -1);
    return {
      type: 'yesterday',
      startDate: yesterday,
      endDate: yesterday,
      expectedDates: [yesterday]
    };
  }
  if (range === 'last7') {
    const startDate = addDays(today, -6);
    return {
      type: 'last7',
      startDate,
      endDate: today,
      expectedDates: eachDate(startDate, today)
    };
  }
  if (range === 'last30') {
    const startDate = addDays(today, -29);
    return {
      type: 'last30',
      startDate,
      endDate: today,
      expectedDates: eachDate(startDate, today)
    };
  }
  throw new Error('--range 只支持 today、yesterday、last7、last30');
}

function parseNginxDate(value) {
  const match = /^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText, hourText, minuteText, secondText, sign, offsetHourText, offsetMinuteText] = match;
  if (!(monthText in MONTHS)) {
    return null;
  }

  const year = Number(yearText);
  const month = MONTHS[monthText];
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetMinutes = Number(offsetHourText) * 60 + Number(offsetMinuteText);
  const signedOffset = sign === '+' ? offsetMinutes : -offsetMinutes;
  const utcMillis = Date.UTC(year, month, day, hour, minute, second) - signedOffset * 60 * 1000;
  const date = new Date(utcMillis);

  return {
    date,
    dateKey: getShanghaiDateKey(date),
    localTime: getShanghaiDateTimeText(date),
    hour: normalizeHour(new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      hour12: false,
      hourCycle: 'h23'
    }).format(date))
  };
}

function normalizeHour(value) {
  const hour = Number(value);
  if (!Number.isFinite(hour)) {
    return 0;
  }
  return hour === 24 ? 0 : Math.max(0, Math.min(23, hour));
}

function getShanghaiDateTimeText(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  const values = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second} +0800`;
}

function parseRequestLine(requestLine) {
  const parts = requestLine.trim().split(/\s+/);
  if (parts.length < 3) {
    return {
      method: parts[0] || '',
      path: parts[1] || '',
      protocol: '',
      malformedRequest: true
    };
  }
  return {
    method: parts[0],
    path: parts.slice(1, -1).join(' '),
    protocol: parts[parts.length - 1],
    malformedRequest: false
  };
}

function parseAccessLine(line) {
  const match = /^(\S+) \S+ \S+ \[([^\]]+)\] "([^"]*)" (\d{3}) (\S+) "([^"]*)" "([^"]*)"/.exec(line);
  if (!match) {
    return {
      parseFailed: true,
      raw: line
    };
  }

  const [, ip, datetimeText, requestLine, statusText, bytesText, referer, userAgent] = match;
  const parsedDate = parseNginxDate(datetimeText);
  const request = parseRequestLine(requestLine);

  if (!parsedDate) {
    return {
      parseFailed: true,
      raw: line
    };
  }

  return {
    ip,
    datetime: parsedDate.date.toISOString(),
    localTime: parsedDate.localTime,
    dateKey: parsedDate.dateKey,
    hour: parsedDate.hour,
    method: request.method,
    path: request.path,
    protocol: request.protocol,
    status: Number(statusText),
    bytes: bytesText === '-' ? 0 : Number(bytesText),
    referer: referer === '-' ? '' : referer,
    userAgent: userAgent === '-' ? '' : userAgent,
    malformedRequest: request.malformedRequest,
    parseFailed: false
  };
}

function getPathname(requestPath) {
  if (!requestPath) {
    return '';
  }
  try {
    return new URL(requestPath, 'https://framespark.cn').pathname;
  } catch (error) {
    return requestPath.split('?')[0] || requestPath;
  }
}

function isStaticAsset(requestPath) {
  const pathname = getPathname(requestPath).toLowerCase();
  return STATIC_EXTENSIONS.has(path.extname(pathname));
}

function getRouteGroup(requestPath) {
  const pathname = getPathname(requestPath);
  if (pathname === '/' || pathname === '/index.html') {
    return 'home';
  }
  if (pathname === '/diagnosis' || pathname.startsWith('/diagnosis/')) {
    return 'diagnosis';
  }
  if (pathname === '/talent' || pathname.startsWith('/talent/')) {
    return 'talent';
  }
  if (pathname.startsWith('/projects/')) {
    return 'project';
  }
  return 'other';
}

function isKnownSitePage(requestPath) {
  const pathname = getPathname(requestPath);
  if (pathname === '/' || pathname === '/index.html') {
    return true;
  }
  if (pathname === '/diagnosis' || pathname === '/diagnosis/') {
    return true;
  }
  if (pathname === '/talent' || pathname === '/talent/') {
    return true;
  }
  if (pathname === '/projects/' || pathname.startsWith('/projects/')) {
    return true;
  }
  if (pathname === '/about' || pathname === '/about/') {
    return true;
  }
  if (pathname === '/contact' || pathname === '/contact/') {
    return true;
  }
  return false;
}

function isRandomShortPath(pathname) {
  return /^\/[A-Za-z0-9]{3,8}\/?$/.test(pathname) && !isKnownSitePage(pathname);
}

function isConnectTarget(requestPath) {
  const value = String(requestPath || '').trim();
  return /^\d{2,5}$/.test(value) || /^[A-Za-z0-9.-]+:\d{2,5}$/.test(value);
}

function classifySuspicious(entry) {
  const reasons = [];
  const pathname = getPathname(entry.path).toLowerCase();
  const rawPath = String(entry.path || '').toLowerCase();
  const userAgent = String(entry.userAgent || '').toLowerCase();

  if (entry.malformedRequest) {
    reasons.push('请求行异常');
  }
  if (!NORMAL_METHODS.has(entry.method)) {
    reasons.push(`异常方法 ${entry.method || '(empty)'}`);
  }
  if (!pathname) {
    reasons.push('空路径');
  }
  if (rawPath.startsWith('mailto:') || pathname.startsWith('/mailto:')) {
    reasons.push('mailto 路径');
  }
  if (isRandomShortPath(pathname)) {
    reasons.push('随机短路径');
  }
  if (entry.method === 'CONNECT' || isConnectTarget(entry.path)) {
    reasons.push('CONNECT 类目标');
  }
  for (const marker of SUSPICIOUS_PATH_PARTS) {
    if (pathname.includes(marker) || rawPath.includes(marker)) {
      reasons.push(`异常路径 ${marker}`);
      break;
    }
  }
  for (const marker of SUSPICIOUS_UA_PARTS) {
    if (userAgent.includes(marker)) {
      reasons.push(`异常 UA ${marker}`);
      break;
    }
  }

  return reasons;
}

function createCounter() {
  return {
    allRequests: 0,
    uniqueIps: 0,
    staticAssetRequests: 0,
    pageViews: 0,
    validPageViews: 0,
    suspiciousRequests: 0,
    homeViews: 0,
    diagnosisViews: 0,
    talentViews: 0,
    projectViews: 0,
    notFound: 0,
    badRequests: 0,
    methodNotAllowed: 0,
    serverErrors: 0,
    parseFailed: 0
  };
}

function createHourBucket(hour) {
  return {
    hour,
    allRequests: 0,
    pageViews: 0,
    validPageViews: 0,
    uniqueIps: 0,
    homeViews: 0,
    diagnosisViews: 0,
    talentViews: 0,
    projectViews: 0,
    notFound: 0,
    badRequests: 0,
    methodNotAllowed: 0,
    serverErrors: 0,
    suspiciousRequests: 0,
    _ipSet: new Set()
  };
}

function createDayBucket(date) {
  return {
    date,
    allRequests: 0,
    pageViews: 0,
    validPageViews: 0,
    uniqueIps: 0,
    homeViews: 0,
    diagnosisViews: 0,
    talentViews: 0,
    projectViews: 0,
    notFound: 0,
    badRequests: 0,
    methodNotAllowed: 0,
    serverErrors: 0,
    suspiciousRequests: 0,
    _ipSet: new Set()
  };
}

function incrementMap(map, key) {
  if (!key) {
    return;
  }
  map.set(key, (map.get(key) || 0) + 1);
}

function topEntries(map, limit = 20) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function maskIp(ip) {
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(ip);
  if (ipv4) {
    return `${ipv4[1]}.${ipv4[2]}.xxx.xxx`;
  }
  const parts = String(ip).split(':');
  if (parts.length > 2) {
    return `${parts.slice(0, 2).join(':')}:xxxx:xxxx`;
  }
  return '(unknown)';
}

function truncateText(value, maxLength = 120) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function createStats(range) {
  return {
    range,
    summary: createCounter(),
    summaryIps: new Set(),
    hourly: Array.from({ length: 24 }, (_, hour) => createHourBucket(hour)),
    daily: new Map(),
    topPaths: new Map(),
    topValidPaths: new Map(),
    statusCodes: new Map(),
    methods: new Map(),
    suspiciousSamples: [],
    seenDates: new Set()
  };
}

function countStatus(counter, status) {
  if (status === 404) {
    counter.notFound += 1;
  }
  if (status === 400) {
    counter.badRequests += 1;
  }
  if (status === 405) {
    counter.methodNotAllowed += 1;
  }
  if (status >= 500 && status <= 599) {
    counter.serverErrors += 1;
  }
}

function countRoute(counter, routeGroup) {
  if (routeGroup === 'home') {
    counter.homeViews += 1;
  }
  if (routeGroup === 'diagnosis') {
    counter.diagnosisViews += 1;
  }
  if (routeGroup === 'talent') {
    counter.talentViews += 1;
  }
  if (routeGroup === 'project') {
    counter.projectViews += 1;
  }
}

function addEntry(stats, entry) {
  if (entry.parseFailed) {
    stats.summary.parseFailed += 1;
    if (stats.suspiciousSamples.length < 10) {
      stats.suspiciousSamples.push({
        ip: '(unparsed)',
        date: '',
        localTime: '',
        method: '',
        path: '',
        status: 0,
        reason: '日志行解析失败',
        userAgent: ''
      });
    }
    return;
  }

  if (entry.dateKey < stats.range.startDate || entry.dateKey > stats.range.endDate) {
    return;
  }

  const summary = stats.summary;
  const hourBucket = stats.hourly[entry.hour];
  let dayBucket = stats.daily.get(entry.dateKey);
  if (!dayBucket) {
    dayBucket = createDayBucket(entry.dateKey);
    stats.daily.set(entry.dateKey, dayBucket);
  }

  const pathname = getPathname(entry.path);
  const routeGroup = getRouteGroup(entry.path);
  const staticAsset = isStaticAsset(entry.path);
  const pageView = NORMAL_PAGE_METHODS.has(entry.method) && !staticAsset;
  const suspiciousReasons = classifySuspicious(entry);
  const suspicious = suspiciousReasons.length > 0;
  const validPageView = pageView && !suspicious && isKnownSitePage(entry.path);

  stats.seenDates.add(entry.dateKey);
  summary.allRequests += 1;
  stats.summaryIps.add(entry.ip);
  hourBucket.allRequests += 1;
  hourBucket._ipSet.add(entry.ip);
  dayBucket.allRequests += 1;
  dayBucket._ipSet.add(entry.ip);

  incrementMap(stats.topPaths, pathname || '(empty)');
  incrementMap(stats.statusCodes, String(entry.status));
  incrementMap(stats.methods, entry.method || '(empty)');

  if (staticAsset) {
    summary.staticAssetRequests += 1;
  }
  if (pageView) {
    summary.pageViews += 1;
    hourBucket.pageViews += 1;
    dayBucket.pageViews += 1;
    countRoute(summary, routeGroup);
    countRoute(hourBucket, routeGroup);
    countRoute(dayBucket, routeGroup);
  }
  if (validPageView) {
    summary.validPageViews += 1;
    hourBucket.validPageViews += 1;
    dayBucket.validPageViews += 1;
    incrementMap(stats.topValidPaths, pathname || '(empty)');
  }
  if (suspicious) {
    summary.suspiciousRequests += 1;
    hourBucket.suspiciousRequests += 1;
    dayBucket.suspiciousRequests += 1;
    if (stats.suspiciousSamples.length < 10) {
      stats.suspiciousSamples.push({
        ip: maskIp(entry.ip),
        date: entry.datetime,
        localTime: entry.localTime,
        method: entry.method,
        path: truncateText(entry.path, 100),
        status: entry.status,
        reason: suspiciousReasons.join('；'),
        userAgent: truncateText(entry.userAgent, 120)
      });
    }
  }

  countStatus(summary, entry.status);
  countStatus(hourBucket, entry.status);
  countStatus(dayBucket, entry.status);
}

function finalizeStats(stats) {
  stats.summary.uniqueIps = stats.summaryIps.size;

  const hourly = stats.hourly.map((bucket) => {
    const finalized = { ...bucket, uniqueIps: bucket._ipSet.size };
    delete finalized._ipSet;
    return finalized;
  });

  const daily = Array.from(stats.daily.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((bucket) => {
      const finalized = { ...bucket, uniqueIps: bucket._ipSet.size };
      delete finalized._ipSet;
      return finalized;
    });

  const isMultiDayRange = stats.range.type === 'last7' || stats.range.type === 'last30';
  const missingDates = stats.range.expectedDates.filter((date) => !stats.seenDates.has(date));
  const partial = isMultiDayRange && missingDates.length > 0;
  const notes = [];
  if (partial) {
    notes.push(`当前日志文件缺少 ${missingDates.length} 个日期的数据，统计为部分结果。`);
  }
  if (stats.summary.allRequests === 0) {
    notes.push('指定日期范围内未发现可解析请求。');
  }

  return {
    meta: {
      isRealData: true,
      usesMockData: false,
      partial,
      notes
    },
    summary: stats.summary,
    hourly,
    daily: isMultiDayRange ? daily : [],
    topPaths: topEntries(stats.topPaths),
    topValidPaths: topEntries(stats.topValidPaths),
    statusCodes: topEntries(stats.statusCodes).map((item) => ({
      status: Number(item.value),
      count: item.count
    })),
    methods: topEntries(stats.methods).map((item) => ({
      method: item.value,
      count: item.count
    })),
    suspiciousSamples: stats.suspiciousSamples
  };
}

async function parseLogStream(stream, stats) {
  const reader = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  for await (const line of reader) {
    if (!line.trim()) {
      continue;
    }
    addEntry(stats, parseAccessLine(line));
  }
}

async function parseAccessLog(accessLog, range) {
  const stats = createStats(range);
  await parseLogStream(fs.createReadStream(accessLog, { encoding: 'utf8' }), stats);
  return finalizeStats(stats);
}

function buildOutput({ args, range, parsed }) {
  return {
    generatedAt: new Date().toISOString(),
    source: {
      accessLog: args['access-log'] || '(self-test)',
      errorLog: args['error-log'] || ''
    },
    range: {
      type: range.type,
      startDate: range.startDate,
      endDate: range.endDate,
      timezone: TIMEZONE
    },
    meta: parsed.meta,
    summary: parsed.summary,
    hourly: parsed.hourly,
    daily: parsed.daily,
    topPaths: parsed.topPaths,
    topValidPaths: parsed.topValidPaths,
    statusCodes: parsed.statusCodes,
    methods: parsed.methods,
    suspiciousSamples: parsed.suspiciousSamples
  };
}

async function parseSelfTest(range) {
  const fakeLines = [
    '123.123.45.67 - - [25/May/2026:00:05:01 +0800] "GET / HTTP/1.1" 200 1800 "-" "Mozilla/5.0"',
    '123.123.45.67 - - [25/May/2026:00:06:01 +0800] "GET /css/style.css HTTP/1.1" 200 200 "-" "Mozilla/5.0"',
    '111.222.33.44 - - [25/May/2026:01:10:01 +0800] "GET /diagnosis/ HTTP/1.1" 200 2500 "-" "Mozilla/5.0"',
    '111.222.33.45 - - [25/May/2026:01:20:01 +0800] "GET /talent/ HTTP/1.1" 200 1900 "-" "Mozilla/5.0"',
    '8.8.4.4 - - [25/May/2026:01:30:01 +0800] "GET /.aws/credentials HTTP/1.1" 404 120 "-" "Mozilla/5.0"',
    '8.8.4.5 - - [25/May/2026:01:35:01 +0800] "GET /aab9 HTTP/1.1" 404 120 "-" "Mozilla/5.0"',
    '8.8.4.6 - - [25/May/2026:01:40:01 +0800] "GET /mailto:script@framespark.cn HTTP/1.1" 404 120 "-" "Mozilla/5.0"',
    '8.8.8.8 - - [25/May/2026:02:20:01 +0800] "GET /.env HTTP/1.1" 404 120 "-" "curl/8.0"',
    '9.9.9.9 - - [25/May/2026:03:20:01 +0800] "PROPFIND / HTTP/1.1" 405 80 "-" "Go-http-client/1.1"',
    '7.7.7.7 - - [25/May/2026:04:20:01 +0800] "CONNECT 443 HTTP/1.1" 400 80 "-" "Mozilla/5.0"',
    'bad line without nginx format'
  ];
  const stats = createStats(range);
  for (const line of fakeLines) {
    addEntry(stats, parseAccessLine(line));
  }
  return finalizeStats(stats);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const range = args.selfTest
    ? {
        type: 'date',
        startDate: '2026-05-25',
        endDate: '2026-05-25',
        expectedDates: ['2026-05-25']
      }
    : resolveRange(args);

  if (!args.selfTest) {
    const accessLog = args['access-log'];
    if (!accessLog) {
      throw new Error('缺少 --access-log');
    }
    if (!fs.existsSync(accessLog)) {
      throw new Error(`访问日志不存在：${accessLog}`);
    }
    if (args['error-log'] && !fs.existsSync(args['error-log'])) {
      throw new Error(`错误日志不存在：${args['error-log']}`);
    }
  }

  const parsed = args.selfTest
    ? await parseSelfTest(range)
    : await parseAccessLog(args['access-log'], range);
  const output = buildOutput({ args, range, parsed });
  const json = `${JSON.stringify(output, null, 2)}\n`;

  if (args.output) {
    const outputDir = path.dirname(path.resolve(args.output));
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(args.output, json, 'utf8');
    return;
  }
  process.stdout.write(json);
}

main().catch((error) => {
  console.error(`nginx-traffic-summary: ${error.message}`);
  process.exitCode = 1;
});
