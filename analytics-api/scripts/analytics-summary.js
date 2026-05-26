#!/usr/bin/env node
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const DEFAULT_INPUT_DIR = '/home/ubuntu/framespark-analytics';
const DEFAULT_OUTPUT_DIR = '/home/ubuntu/framespark-analytics-summaries';
const TIMEZONE = 'Asia/Shanghai';
const PAGE_TYPES = ['home', 'diagnosis', 'talent', 'project', 'legal'];
const SUMMARY_KEYS = [
  'events',
  'pageViews',
  'clicks',
  'anonymousVisitors',
  'newVisitors',
  'returningVisitors',
  'sessions',
  'homeVisitors',
  'diagnosisVisitors',
  'talentVisitors',
  'projectVisitors',
  'legalVisitors',
  'homePageViews',
  'diagnosisPageViews',
  'talentPageViews',
  'projectPageViews',
  'diagnosisEntryClicks',
  'talentEntryClicks',
  'projectCardClicks',
  'homeToDiagnosisVisitors'
];

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.selfTest) {
    await runSelfTest();
    return;
  }

  const inputDir = args.inputDir || DEFAULT_INPUT_DIR;
  const outputDir = args.outputDir || DEFAULT_OUTPUT_DIR;
  const range = resolveRange(args);
  const result = await buildSummary({ inputDir, range });
  const output = JSON.stringify(result, null, 2);

  if (args.output) {
    await fs.mkdir(path.dirname(args.output), { recursive: true });
    await fs.writeFile(args.output, `${output}\n`, 'utf8');
  } else {
    process.stdout.write(`${output}\n`);
  }
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--self-test') {
      result.selfTest = true;
    } else if (arg === '--input-dir') {
      result.inputDir = argv[++index];
    } else if (arg === '--output-dir') {
      result.outputDir = argv[++index];
    } else if (arg === '--date') {
      result.date = argv[++index];
    } else if (arg === '--range') {
      result.rangeType = argv[++index];
    } else if (arg === '--output') {
      result.output = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return result;
}

function resolveRange(args) {
  if (args.date) {
    assertDate(args.date, '--date');
    return {
      type: 'date',
      startDate: args.date,
      endDate: args.date,
      dates: [args.date],
      bucketType: 'hourly'
    };
  }

  const type = args.rangeType || 'today';
  const today = shanghaiDateKey(new Date());

  if (type === 'today') {
    return { type, startDate: today, endDate: today, dates: [today], bucketType: 'hourly' };
  }

  if (type === 'yesterday') {
    const date = addDays(today, -1);
    return { type, startDate: date, endDate: date, dates: [date], bucketType: 'hourly' };
  }

  if (type === 'last7' || type === 'last30') {
    const days = type === 'last7' ? 7 : 30;
    const startDate = addDays(today, -(days - 1));
    return {
      type,
      startDate,
      endDate: today,
      dates: rangeDates(startDate, today),
      bucketType: 'daily'
    };
  }

  throw new Error(`Unsupported range: ${type}`);
}

function assertDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
}

async function buildSummary({ inputDir, range }) {
  const availableDates = await listAvailableDates(inputDir);
  const notes = [];
  const events = [];
  const priorVisitorIds = new Set();
  let parseFailed = 0;

  for (const date of availableDates) {
    if (date < range.startDate) {
      const loaded = await readEventsForDate(inputDir, date);
      parseFailed += loaded.parseFailed;
      loaded.events.forEach((event) => {
        if (event.visitorId) priorVisitorIds.add(event.visitorId);
      });
    }
  }

  if (!availableDates.some((date) => date < range.startDate)) {
    notes.push('No earlier event files were found; newVisitors is based on available history only.');
  }

  for (const date of range.dates) {
    if (!availableDates.includes(date)) {
      notes.push(`Missing event file for ${date}.`);
      continue;
    }
    const loaded = await readEventsForDate(inputDir, date);
    parseFailed += loaded.parseFailed;
    events.push(...loaded.events);
  }

  const partial = range.dates.some((date) => !availableDates.includes(date));
  const aggregate = aggregateEvents({ events, range, priorVisitorIds });
  if (parseFailed > 0) {
    notes.push(`Skipped ${parseFailed} invalid JSONL line(s).`);
  }

  return {
    generatedAt: new Date().toISOString(),
    source: 'analytics-jsonl',
    range: {
      type: range.type,
      startDate: range.startDate,
      endDate: range.endDate,
      timezone: TIMEZONE
    },
    meta: {
      isRealData: true,
      usesMockData: false,
      partial,
      notes
    },
    summary: aggregate.summary,
    daily: aggregate.daily,
    hourly: aggregate.hourly,
    topTargets: aggregate.topTargets,
    topPaths: aggregate.topPaths,
    funnels: aggregate.funnels
  };
}

async function listAvailableDates(inputDir) {
  try {
    const entries = await fs.readdir(inputDir);
    return entries
      .map((entry) => {
        const match = entry.match(/^events-(\d{4}-\d{2}-\d{2})\.jsonl$/);
        return match ? match[1] : '';
      })
      .filter(Boolean)
      .sort();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function readEventsForDate(inputDir, date) {
  const filePath = path.join(inputDir, `events-${date}.jsonl`);
  let content = '';
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return { events: [], parseFailed: 0 };
    throw error;
  }

  const events = [];
  let parseFailed = 0;
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event && typeof event === 'object' && !Array.isArray(event)) {
        events.push(event);
      } else {
        parseFailed += 1;
      }
    } catch {
      parseFailed += 1;
    }
  }
  return { events, parseFailed };
}

function aggregateEvents({ events, range, priorVisitorIds }) {
  const summaryState = createMetricState();
  const hourlyStates = Array.from({ length: 24 }, (_, hour) => createMetricState({ hour }));
  const dailyStates = range.dates.map((date) => createMetricState({ date }));
  const dailyByDate = new Map(dailyStates.map((state) => [state.date, state]));
  const pathCounts = new Map();
  const targetCounts = new Map();
  const visitorJourney = new Map();

  for (const event of events) {
    const timestamp = event.receivedAt || event.timestamp;
    const local = getShanghaiParts(timestamp);
    if (!local || local.date < range.startDate || local.date > range.endDate) continue;

    updateMetricState(summaryState, event, priorVisitorIds, visitorJourney);
    if (event.eventType === 'page_view') incrementMap(pathCounts, sanitizeOutputString(event.path || '/', 512));
    if (event.eventType === 'click' && event.targetId) incrementMap(targetCounts, sanitizeOutputString(event.targetId, 128));

    if (range.bucketType === 'hourly') {
      updateMetricState(hourlyStates[local.hour], event, priorVisitorIds);
    } else {
      const state = dailyByDate.get(local.date);
      if (state) updateMetricState(state, event, priorVisitorIds);
    }
  }

  return {
    summary: finalizeMetricState(summaryState, priorVisitorIds, visitorJourney),
    hourly: range.bucketType === 'hourly'
      ? hourlyStates.map((state) => finalizeMetricState(state, priorVisitorIds))
      : [],
    daily: range.bucketType === 'daily'
      ? dailyStates.map((state) => finalizeMetricState(state, priorVisitorIds))
      : [],
    topTargets: toTopList(targetCounts, 'targetId'),
    topPaths: toTopList(pathCounts, 'path'),
    funnels: {
      homeToDiagnosis: {
        visitors: countHomeToDiagnosisVisitors(visitorJourney),
        clicks: summaryState.diagnosisEntryClicks
      }
    }
  };
}

function createMetricState(extra = {}) {
  return {
    ...extra,
    events: 0,
    pageViews: 0,
    clicks: 0,
    anonymousVisitorsSet: new Set(),
    sessionsSet: new Set(),
    pageVisitors: {
      home: new Set(),
      diagnosis: new Set(),
      talent: new Set(),
      project: new Set(),
      legal: new Set()
    },
    pageViewsByType: {
      home: 0,
      diagnosis: 0,
      talent: 0,
      project: 0
    },
    diagnosisEntryClicks: 0,
    talentEntryClicks: 0,
    projectCardClicks: 0,
    homeToDiagnosisVisitors: 0
  };
}

function updateMetricState(state, event, priorVisitorIds, journey) {
  state.events += 1;
  if (event.visitorId) state.anonymousVisitorsSet.add(event.visitorId);
  if (event.sessionId) state.sessionsSet.add(event.sessionId);

  if (event.eventType === 'page_view') {
    state.pageViews += 1;
    if (PAGE_TYPES.includes(event.pageType) && event.visitorId) {
      state.pageVisitors[event.pageType].add(event.visitorId);
    }
    if (Object.prototype.hasOwnProperty.call(state.pageViewsByType, event.pageType)) {
      state.pageViewsByType[event.pageType] += 1;
    }
    if (journey && event.visitorId) {
      const current = getJourney(journey, event.visitorId);
      if (event.pageType === 'home') current.home = true;
      if (event.pageType === 'diagnosis') current.diagnosis = true;
    }
  }

  if (event.eventType === 'click') {
    state.clicks += 1;
    if (event.targetId === 'home_to_diagnosis' || event.targetId === 'diagnosis_primary_action') {
      state.diagnosisEntryClicks += 1;
      if (journey && event.visitorId && event.targetId === 'home_to_diagnosis') {
        getJourney(journey, event.visitorId).homeToDiagnosisClick = true;
      }
    }
    if (event.targetId === 'home_to_talent' || event.targetId === 'talent_primary_action') {
      state.talentEntryClicks += 1;
    }
    if (event.targetId === 'home_project_card') {
      state.projectCardClicks += 1;
    }
  }
}

function finalizeMetricState(state, priorVisitorIds, journey) {
  const anonymousVisitors = state.anonymousVisitorsSet.size;
  let returningVisitors = 0;
  state.anonymousVisitorsSet.forEach((visitorId) => {
    if (priorVisitorIds.has(visitorId)) returningVisitors += 1;
  });

  const output = {
    events: state.events,
    pageViews: state.pageViews,
    clicks: state.clicks,
    anonymousVisitors,
    newVisitors: Math.max(anonymousVisitors - returningVisitors, 0),
    returningVisitors,
    sessions: state.sessionsSet.size,
    homeVisitors: state.pageVisitors.home.size,
    diagnosisVisitors: state.pageVisitors.diagnosis.size,
    talentVisitors: state.pageVisitors.talent.size,
    projectVisitors: state.pageVisitors.project.size,
    legalVisitors: state.pageVisitors.legal.size,
    homePageViews: state.pageViewsByType.home,
    diagnosisPageViews: state.pageViewsByType.diagnosis,
    talentPageViews: state.pageViewsByType.talent,
    projectPageViews: state.pageViewsByType.project,
    diagnosisEntryClicks: state.diagnosisEntryClicks,
    talentEntryClicks: state.talentEntryClicks,
    projectCardClicks: state.projectCardClicks,
    homeToDiagnosisVisitors: journey ? countHomeToDiagnosisVisitors(journey) : state.homeToDiagnosisVisitors
  };

  if (Object.prototype.hasOwnProperty.call(state, 'hour')) {
    return { hour: state.hour, ...output };
  }
  if (Object.prototype.hasOwnProperty.call(state, 'date')) {
    return { date: state.date, ...output };
  }
  return output;
}

function getJourney(journey, visitorId) {
  if (!journey.has(visitorId)) {
    journey.set(visitorId, { home: false, diagnosis: false, homeToDiagnosisClick: false });
  }
  return journey.get(visitorId);
}

function countHomeToDiagnosisVisitors(journey) {
  let count = 0;
  journey.forEach((value) => {
    if (value.home && (value.diagnosis || value.homeToDiagnosisClick)) {
      count += 1;
    }
  });
  return count;
}

function incrementMap(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function toTopList(map, keyName) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([value, count]) => ({ [keyName]: value, count }));
}

function sanitizeOutputString(value, limit) {
  return String(value || '').replace(/[\r\n\t]/g, ' ').slice(0, limit);
}

function getShanghaiParts(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour)
  };
}

function shanghaiDateKey(date) {
  return getShanghaiParts(date.toISOString()).date;
}

function addDays(dateKey, delta) {
  const date = new Date(`${dateKey}T00:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + delta);
  return shanghaiDateKey(date);
}

function rangeDates(startDate, endDate) {
  const dates = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

async function runSelfTest() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'framespark-analytics-summary-'));
  try {
    const previous = '2026-05-25';
    const date = '2026-05-26';
    const previousEvents = [
      createTestEvent({ visitorId: 'fs_visitor_returning_001', sessionId: 'fs_session_old_001', pageType: 'home', path: '/', receivedAt: `${previous}T08:00:00+08:00` })
    ];
    const rangeEvents = [
      createTestEvent({ visitorId: 'fs_visitor_new_001', sessionId: 'fs_session_001', pageType: 'home', path: '/', receivedAt: `${date}T09:00:00+08:00` }),
      createTestEvent({ visitorId: 'fs_visitor_new_001', sessionId: 'fs_session_001', eventType: 'click', targetId: 'home_to_diagnosis', receivedAt: `${date}T09:01:00+08:00` }),
      createTestEvent({ visitorId: 'fs_visitor_new_001', sessionId: 'fs_session_001', pageType: 'diagnosis', path: '/diagnosis/', receivedAt: `${date}T09:02:00+08:00` }),
      createTestEvent({ visitorId: 'fs_visitor_returning_001', sessionId: 'fs_session_002', pageType: 'talent', path: '/talent/', receivedAt: `${date}T10:00:00+08:00` }),
      createTestEvent({ visitorId: 'fs_visitor_returning_001', sessionId: 'fs_session_002', eventType: 'click', targetId: 'talent_primary_action', pageType: 'talent', path: '/talent/', receivedAt: `${date}T10:02:00+08:00` })
    ];
    await fs.writeFile(path.join(tempDir, `events-${previous}.jsonl`), previousEvents.map((event) => JSON.stringify(event)).join('\n') + '\n', 'utf8');
    await fs.writeFile(path.join(tempDir, `events-${date}.jsonl`), rangeEvents.map((event) => JSON.stringify(event)).join('\n') + '\n', 'utf8');

    const summary = await buildSummary({
      inputDir: tempDir,
      range: {
        type: 'date',
        startDate: date,
        endDate: date,
        dates: [date],
        bucketType: 'hourly'
      }
    });

    assertEqual(summary.summary.anonymousVisitors, 2, 'anonymousVisitors');
    assertEqual(summary.summary.newVisitors, 1, 'newVisitors');
    assertEqual(summary.summary.returningVisitors, 1, 'returningVisitors');
    assertEqual(summary.summary.homeVisitors, 1, 'homeVisitors');
    assertEqual(summary.summary.diagnosisVisitors, 1, 'diagnosisVisitors');
    assertEqual(summary.summary.talentVisitors, 1, 'talentVisitors');
    assertEqual(summary.summary.diagnosisEntryClicks, 1, 'diagnosisEntryClicks');
    assertEqual(summary.summary.talentEntryClicks, 1, 'talentEntryClicks');
    assertEqual(summary.summary.homeToDiagnosisVisitors, 1, 'homeToDiagnosisVisitors');
    assertEqual(summary.hourly[9].pageViews, 2, 'hourly pageViews');

    const serialized = JSON.stringify(summary);
    if (serialized.includes('fs_visitor_new_001') || serialized.includes('fs_session_001')) {
      throw new Error('summary leaked visitorId or sessionId');
    }

    console.log('analytics-summary self-test passed');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function createTestEvent(overrides) {
  return {
    eventId: `event_${Math.random().toString(16).slice(2)}`,
    visitorId: overrides.visitorId,
    sessionId: overrides.sessionId,
    eventType: overrides.eventType || 'page_view',
    path: overrides.path || '/',
    pageType: overrides.pageType || 'home',
    targetId: overrides.targetId || '',
    receivedAt: overrides.receivedAt,
    source: 'analytics-api'
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
