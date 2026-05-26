import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { cleanString, getDateKey } from '../utils/sanitize.js';

const ALLOWED_EVENT_TYPES = new Set(['page_view', 'click']);
const ALLOWED_PAGE_TYPES = new Set(['home', 'diagnosis', 'talent', 'project', 'legal', 'error', 'other']);
const ALLOWED_KEYS = new Set([
  'eventId',
  'visitorId',
  'sessionId',
  'eventType',
  'path',
  'pageType',
  'targetId',
  'timestamp',
  'referrer',
  'userAgentHash',
  'screen',
  'language'
]);

export function validateEventPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: 'INVALID_BODY', message: '请求体必须是 JSON 对象。' };
  }

  const rawSize = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  if (rawSize > config.eventSizeLimitBytes) {
    return { ok: false, error: 'EVENT_TOO_LARGE', message: '事件内容过大。' };
  }

  const nestedError = findNestedValue(payload);
  if (nestedError) {
    return { ok: false, error: 'INVALID_FIELD', message: nestedError };
  }

  const eventType = cleanString(payload.eventType, 32);
  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    return { ok: false, error: 'INVALID_EVENT_TYPE', message: '不支持的事件类型。' };
  }

  const pageType = cleanString(payload.pageType || 'other', 32);
  if (!ALLOWED_PAGE_TYPES.has(pageType)) {
    return { ok: false, error: 'INVALID_PAGE_TYPE', message: '不支持的页面类型。' };
  }

  const visitorId = cleanString(payload.visitorId, 128);
  if (!isReasonableId(visitorId)) {
    return { ok: false, error: 'INVALID_VISITOR_ID', message: 'visitorId 格式不正确。' };
  }

  const sessionId = cleanString(payload.sessionId, 128);
  if (!isReasonableId(sessionId)) {
    return { ok: false, error: 'INVALID_SESSION_ID', message: 'sessionId 格式不正确。' };
  }

  const requestPath = cleanString(payload.path, 512);
  if (!requestPath.startsWith('/')) {
    return { ok: false, error: 'INVALID_PATH', message: 'path 必须以 / 开头。' };
  }

  return {
    ok: true,
    event: {
      eventId: cleanString(payload.eventId, 128) || crypto.randomUUID(),
      visitorId,
      sessionId,
      eventType,
      path: requestPath,
      pageType,
      targetId: cleanString(payload.targetId || '', 128),
      timestamp: cleanString(payload.timestamp || '', 64),
      referrer: cleanString(payload.referrer || '', 512),
      userAgentHash: cleanString(payload.userAgentHash || '', 128),
      screen: cleanString(payload.screen || '', 64),
      language: cleanString(payload.language || '', 64)
    }
  };
}

export async function appendAnalyticsEvent(event, req) {
  const receivedAt = new Date();
  const entry = {
    ...event,
    receivedAt: receivedAt.toISOString(),
    ipHash: hashIp(getClientIp(req)),
    source: 'analytics-api'
  };

  const dateKey = getDateKey(receivedAt);
  const filePath = path.join(config.dataDir, `events-${dateKey}.jsonl`);
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, 'utf8');
  return { eventId: entry.eventId, file: filePath };
}

export function hashIp(ip) {
  const normalized = String(ip || 'unknown').trim() || 'unknown';
  return crypto.createHash('sha256').update(`framespark-analytics-v1:${normalized}`).digest('hex').slice(0, 24);
}

function findNestedValue(payload) {
  for (const [key, value] of Object.entries(payload)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (Array.isArray(value) || (value && typeof value === 'object')) {
      return `${key} 不能是数组或对象。`;
    }
  }
  return '';
}

function isReasonableId(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128 && /^[a-zA-Z0-9._:-]+$/.test(value);
}

function getClientIp(req) {
  const forwardedFor = String(req.headers?.['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';
}
