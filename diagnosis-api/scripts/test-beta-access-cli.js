import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runBetaAccessCli } from './manage-beta-access.js';
import { createBetaAccessService } from '../src/services/betaAccessService.js';
import { createBetaAccessStore } from '../src/services/betaAccessStore.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'framespark-beta-cli-'));
const dbPath = path.join(root, 'beta.sqlite');
const settings = {
  dbPath,
  codeHmacKey: 'cli-code-key-0123456789abcdef-0123456789abcdef',
  sessionHmacKey: 'cli-session-key-0123456789abcdef-0123456789abcdef',
  sessionTtlMs: 86400000,
  defaultExpiresDays: 7,
  defaultMaxUses: 5,
  maxCodeChars: 256,
  cookieSecure: true,
  verifyLimits: { windowMs: 900000, ipWindowLimit: 5, ipDailyLimit: 20, globalWindowLimit: 30, globalDailyLimit: 100, cooldownMs: 2000 }
};
const store = createBetaAccessStore({ dbPath });
const service = createBetaAccessService({ store, settings });

try {
  const createOutput = capture(true);
  await runBetaAccessCli(['create', '--count', '5'], {
    store, service, settings, output: createOutput, errorOutput: capture(false), allowNonTtyCreate: true
  });
  assert.equal(store.listCodes().length, 5);
  assert.equal((createOutput.value.match(/fsb_/g) || []).length, 5);

  const listOutput = capture(false);
  await runBetaAccessCli(['list'], { store, service, settings, output: listOutput, errorOutput: capture(false) });
  assert.equal(listOutput.value.includes('fsb_'), false);
  assert.equal(listOutput.value.includes('code_hash'), false);
  assert.equal(listOutput.value.includes('token_hash'), false);

  const id = store.listCodes()[0].id;
  await runBetaAccessCli(['disable', '--id', id], { store, service, settings, output: capture(false), errorOutput: capture(false) });
  assert.equal(store.listCodes()[0].enabled, false);
  await runBetaAccessCli(['enable', '--id', id], { store, service, settings, output: capture(false), errorOutput: capture(false) });
  assert.equal(store.listCodes()[0].enabled, true);
  await runBetaAccessCli(['update', '--id', id, '--max-uses', '8'], { store, service, settings, output: capture(false), errorOutput: capture(false) });
  assert.equal(store.listCodes()[0].maxUses, 8);
  await runBetaAccessCli(['revoke', '--id', id], { store, service, settings, output: capture(false), errorOutput: capture(false) });
  assert.notEqual(store.listCodes()[0].revokedAt, null);

  const backup = path.join(root, 'backup.sqlite');
  await runBetaAccessCli(['backup', '--output', backup], { store, service, settings, output: capture(false), errorOutput: capture(false) });
  assert.equal((await fs.stat(backup)).mode & 0o777, 0o600);

  console.log('Beta access CLI tests passed: five-code creation, redacted list, lifecycle commands, secure backup');
} finally {
  store.close();
  await fs.rm(root, { recursive: true, force: true });
}

function capture(isTTY) {
  return {
    isTTY,
    value: '',
    write(chunk) { this.value += String(chunk); }
  };
}
