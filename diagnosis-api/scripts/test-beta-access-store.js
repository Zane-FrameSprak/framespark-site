import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { createBetaAccessService } from '../src/services/betaAccessService.js';
import { createBetaAccessStore } from '../src/services/betaAccessStore.js';

const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'framespark-beta-store-'));
const dbPath = path.join(root, 'access', 'beta-access.sqlite');
let clock = new Date('2026-06-15T00:00:00.000Z');
const settings = makeSettings();
const store = createBetaAccessStore({ dbPath, now: () => clock });
const service = createBetaAccessService({ store, settings, now: () => clock });

try {
  assert.equal(store.getSchemaVersion(), 1);
  assert.equal(fs.statSync(dbPath).mode & 0o777, 0o600);

  const firstBatch = service.createCodes({ count: 5 });
  assert.equal(firstBatch.length, 5);
  assert.equal(firstBatch.every(item => item.record.maxUses === 5), true);
  assert.equal(firstBatch.every(item => item.record.expiresAt === '2026-06-22T00:00:00.000Z'), true);
  const databaseFiles = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`].filter(candidate => fs.existsSync(candidate));
  for (const databaseFile of databaseFiles) {
    assert.equal(fs.statSync(databaseFile).mode & 0o777, 0o600);
    const content = await fsp.readFile(databaseFile);
    for (const item of firstBatch) assert.equal(content.includes(Buffer.from(item.code)), false);
  }

  const sessionExpiry = new Date(clock.getTime() + settings.sessionTtlMs);
  const issued = store.issueSessions({
    codeHash: service.hashCode(firstBatch[0].code),
    sessions: sessionRows('first', sessionExpiry)
  });
  assert.equal(issued.ok, true);
  assert.equal(store.validateSession({ tokenHash: 'first-page', scope: 'page' })?.identityId, firstBatch[0].record.id);
  assert.equal(store.validateSession({ tokenHash: 'first-api', scope: 'api' })?.identityId, firstBatch[0].record.id);
  assert.equal(store.validateSession({ tokenHash: 'first-page', scope: 'api' }), null);

  const disabled = store.setEnabled(firstBatch[0].record.id, false);
  assert.equal(disabled.sessionVersion, 2);
  assert.equal(store.validateSession({ tokenHash: 'first-page', scope: 'page' }), null);
  store.setEnabled(firstBatch[0].record.id, true);
  assert.equal(store.validateSession({ tokenHash: 'first-page', scope: 'page' }), null);

  const revocable = firstBatch[1];
  const revocableSession = store.issueSessions({
    codeHash: service.hashCode(revocable.code),
    sessions: sessionRows('revoke', sessionExpiry)
  });
  assert.equal(revocableSession.ok, true);
  store.revokeCode(revocable.record.id);
  assert.equal(store.validateSession({ tokenHash: 'revoke-api', scope: 'api' }), null);
  assert.equal(store.setEnabled(revocable.record.id, true), null);

  const expiring = service.createCodes({ count: 1, expiresDays: 1 })[0];
  clock = new Date('2026-06-16T00:00:01.000Z');
  const expired = store.issueSessions({
    codeHash: service.hashCode(expiring.code),
    sessions: sessionRows('expired', new Date(clock.getTime() + settings.sessionTtlMs))
  });
  assert.equal(expired.ok, false);
  assert.equal(expired.reason, 'expired');

  clock = new Date('2026-06-15T01:00:00.000Z');
  const contested = service.createCodes({ count: 1, maxUses: 1, expiresDays: 3650 })[0];
  const contestedSessionExpiry = new Date('2036-06-15T01:00:00.000Z');
  const results = await consumeConcurrently(dbPath, service.hashCode(contested.code), contestedSessionExpiry);
  assert.deepEqual(results.map(result => result.ok).sort(), [false, true]);
  assert.equal(store.listCodes().find(code => code.id === contested.record.id).usedCount, 1);

  const limits = settings.verifyLimits;
  for (let index = 0; index < limits.ipWindowLimit; index += 1) {
    assert.equal(store.acquireVerificationPermit({ ipHash: 'ip-persist', limits }).allowed, true);
  }
  store.close();
  const reopened = createBetaAccessStore({ dbPath, now: () => clock });
  assert.equal(reopened.acquireVerificationPermit({ ipHash: 'ip-persist', limits }).allowed, false);
  reopened.close();

  const symlinkPath = path.join(root, 'symlink.sqlite');
  await fsp.symlink(dbPath, symlinkPath);
  assert.throws(() => createBetaAccessStore({ dbPath: symlinkPath }), /BETA_ACCESS_DB_MUST_BE_REGULAR_FILE/);

  console.log('Beta access store tests passed: schema, hash-only codes, sessions, revocation, expiry, concurrency, persistent limits');
} finally {
  try { store.close(); } catch {}
  await fsp.rm(root, { recursive: true, force: true });
}

function makeSettings() {
  return {
    codeHmacKey: 'code-key-0123456789abcdef-0123456789abcdef',
    sessionHmacKey: 'session-key-0123456789abcdef-0123456789abcdef',
    sessionTtlMs: 24 * 60 * 60 * 1000,
    defaultExpiresDays: 7,
    defaultMaxUses: 5,
    maxCodeChars: 256,
    cookieSecure: true,
    auditRetentionDays: 30,
    verifyLimits: {
      windowMs: 15 * 60 * 1000,
      ipWindowLimit: 5,
      ipDailyLimit: 20,
      globalWindowLimit: 30,
      globalDailyLimit: 100,
      cooldownMs: 2000
    }
  };
}

function sessionRows(prefix, expiresAt) {
  return [
    { scope: 'page', tokenHash: `${prefix}-page`, expiresAt },
    { scope: 'api', tokenHash: `${prefix}-api`, expiresAt }
  ];
}

async function consumeConcurrently(sharedDbPath, codeHash, expiresAt) {
  const buffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2);
  const barrier = new Int32Array(buffer);
  const workers = ['a', 'b'].map(name => new Worker(
    new URL('./helpers/beta-access-consume-worker.js', import.meta.url),
    { workerData: { dbPath: sharedDbPath, codeHash, expiresAt, name, barrier } }
  ));
  while (Atomics.load(barrier, 0) < workers.length) await new Promise(resolve => setTimeout(resolve, 5));
  Atomics.store(barrier, 1, 1);
  Atomics.notify(barrier, 1, workers.length);
  return Promise.all(workers.map(worker => new Promise((resolve, reject) => {
    worker.once('message', resolve);
    worker.once('error', reject);
  })));
}
