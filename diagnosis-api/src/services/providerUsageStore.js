import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { ApiError } from '../utils/errors.js';

let queue = Promise.resolve();

export function consumeGlobalProviderCall(options = {}) {
  const task = queue.then(() => consume(options));
  queue = task.catch(() => {});
  return task;
}

async function consume({ now = new Date(), limit = config.rateLimits.providerGlobalDailyLimit } = {}) {
  const date = now.toISOString().slice(0, 10);
  const dir = path.join(config.dataDir, 'usage');
  const file = path.join(dir, `provider-${date}.json`);
  await fs.mkdir(dir, { recursive: true });

  const current = await readCount(file);
  if (current >= limit) {
    throw new ApiError(503, 'AI_CALL_BUDGET_EXCEEDED', 'Global provider call budget exceeded.');
  }

  const next = current + 1;
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify({ date, count: next }), { encoding: 'utf8', mode: 0o600 });
  await fs.rename(temp, file);
  return next;
}

async function readCount(file) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    return Number.isInteger(parsed.count) && parsed.count >= 0 ? parsed.count : 0;
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw new ApiError(503, 'USAGE_STORE_UNAVAILABLE', 'Provider usage store unavailable.');
  }
}
