import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { ApiError } from '../utils/errors.js';

let queue = Promise.resolve();

export function consumeGlobalProviderCall(options = {}) {
  const task = queue.then(() => consumeCall(options));
  queue = task.catch(() => {});
  return task;
}

export function assertGlobalProviderTokenBudget(options = {}) {
  const task = queue.then(() => assertTokenBudget(options));
  queue = task.catch(() => {});
  return task;
}

export function recordGlobalProviderTokens(tokenCount, options = {}) {
  const task = queue.then(() => recordTokens(tokenCount, options));
  queue = task.catch(() => {});
  return task;
}

export function readGlobalProviderUsage(options = {}) {
  const task = queue.then(async () => {
    const { file, date } = await getUsageFile(options);
    return readUsage(file, date);
  });
  queue = task.catch(() => {});
  return task;
}

async function consumeCall({
  now = new Date(),
  limit = config.rateLimits.providerGlobalDailyLimit,
  tokenLimit = config.rateLimits.providerGlobalDailyTokenLimit,
  dataDir = config.dataDir
} = {}) {
  const { file, date } = await getUsageFile({ now, dataDir });
  const current = await readUsage(file, date);
  assertTokenLimitAvailable(current, tokenLimit);
  if (current.count >= limit) {
    throw new ApiError(503, 'AI_CALL_BUDGET_EXCEEDED', 'Global provider call budget exceeded.');
  }

  const next = { ...current, count: current.count + 1 };
  await writeUsage(file, next);
  return next.count;
}

async function assertTokenBudget({
  now = new Date(),
  tokenLimit = config.rateLimits.providerGlobalDailyTokenLimit,
  dataDir = config.dataDir
} = {}) {
  const { file, date } = await getUsageFile({ now, dataDir });
  const current = await readUsage(file, date);
  assertTokenLimitAvailable(current, tokenLimit);
  return current;
}

async function recordTokens(tokenCount, {
  now = new Date(),
  dataDir = config.dataDir
} = {}) {
  const safeTokenCount = normalizeNonNegativeInteger(tokenCount);
  const { file, date } = await getUsageFile({ now, dataDir });
  const current = await readUsage(file, date);
  if (safeTokenCount === 0) return current;

  const next = {
    ...current,
    totalTokens: current.totalTokens + safeTokenCount
  };
  await writeUsage(file, next);
  return next;
}

async function getUsageFile({ now = new Date(), dataDir = config.dataDir } = {}) {
  const date = now.toISOString().slice(0, 10);
  const dir = path.join(dataDir, 'usage');
  const file = path.join(dir, `provider-${date}.json`);
  await fs.mkdir(dir, { recursive: true });
  return { date, file };
}

function assertTokenLimitAvailable(current, tokenLimit) {
  if (current.totalTokens >= tokenLimit) {
    throw new ApiError(503, 'PROVIDER_TOKEN_BUDGET_EXCEEDED', 'Global provider token budget exceeded.');
  }
}

async function readUsage(file, date) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      date: parsed.date || date,
      count: normalizeNonNegativeInteger(parsed.count),
      totalTokens: normalizeNonNegativeInteger(parsed.totalTokens)
    };
  } catch (error) {
    if (error.code === 'ENOENT') return { date, count: 0, totalTokens: 0 };
    throw new ApiError(503, 'USAGE_STORE_UNAVAILABLE', 'Provider usage store unavailable.');
  }
}

async function writeUsage(file, usage) {
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(usage), { encoding: 'utf8', mode: 0o600 });
  await fs.rename(temp, file);
}

function normalizeNonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}
