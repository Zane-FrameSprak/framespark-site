import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createBetaAccessService } from '../src/services/betaAccessService.js';
import { createBetaAccessStore } from '../src/services/betaAccessStore.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'framespark-beta-http-'));
const dbPath = path.join(root, 'access', 'beta.sqlite');
const codeKey = 'http-code-key-0123456789abcdef-0123456789abcdef';
const sessionKey = 'http-session-key-0123456789abcdef-0123456789abcdef';
const settings = makeSettings(codeKey, sessionKey);
const setupStore = createBetaAccessStore({ dbPath });
const setupService = createBetaAccessService({ store: setupStore, settings });
const code = setupService.createCodes({ count: 1 })[0];
setupStore.close();

let providerRequests = 0;
const provider = http.createServer((req, res) => {
  providerRequests += 1;
  req.resume();
  res.writeHead(500).end();
});
await listen(provider, 0);
const port = await reservePort();
const child = spawn(process.execPath, ['src/server.js'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: String(port),
    DIAGNOSIS_DATA_DIR: root,
    ENABLE_BETA_CODE_ACCESS: 'true',
    BETA_ACCESS_DB_PATH: dbPath,
    BETA_ACCESS_CODE_HMAC_KEY: codeKey,
    BETA_ACCESS_SESSION_HMAC_KEY: sessionKey,
    BETA_ACCESS_VERIFY_COOLDOWN_SECONDS: '2',
    ALLOWED_ORIGINS: 'https://framespark.cn',
    DEEPSEEK_API_KEY: 'test-only',
    DEEPSEEK_BASE_URL: `http://127.0.0.1:${provider.address().port}`
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });

try {
  await waitForServer(child, port);

  const missingOrigin = await postJson(port, '/api/beta-access/verify', { code: code.code }, {});
  assert.equal(missingOrigin.status, 403);

  const valid = await postJson(port, '/api/beta-access/verify', { code: `  ${code.code}  ` }, headers('10.0.0.1'));
  assert.equal(valid.status, 200);
  assert.deepEqual(valid.body, { ok: true, redirectTo: '/diagnosis/beta/' });
  assert.equal(JSON.stringify(valid.body).includes(code.code), false);
  assert.equal(valid.cookies.length, 2);
  for (const cookie of valid.cookies) {
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Max-Age=86400/);
  }

  const pageCookie = valid.cookies.find(value => value.startsWith('__Secure-fs_beta_page='));
  const apiCookie = valid.cookies.find(value => value.startsWith('__Secure-fs_beta_api='));
  const page = await get(port, '/internal/beta-session/validate', {
    Cookie: cookiePair(pageCookie),
    'X-Framespark-Original-URI': '/diagnosis/beta/'
  });
  assert.equal(page.status, 204);
  assert.match(page.headers['x-framespark-beta-user'], /^beta-code-[0-9a-f-]{36}$/);

  const api = await get(port, '/internal/beta-session/validate', {
    Cookie: cookiePair(apiCookie),
    'X-Framespark-Original-URI': '/api/diagnosis/'
  });
  assert.equal(api.status, 204);
  assert.equal(api.headers['x-framespark-beta-user'], page.headers['x-framespark-beta-user']);

  const spoofed = await get(port, '/internal/beta-session/validate', {
    'X-Framespark-Beta-User': page.headers['x-framespark-beta-user'],
    'X-Framespark-Original-URI': '/api/diagnosis/'
  });
  assert.equal(spoofed.status, 401);

  const invalid = await postJson(port, '/api/beta-access/verify', { code: 'invalid-code' }, headers('10.0.0.2'));
  assert.equal(invalid.status, 401);
  assert.equal(invalid.body.error.code, 'BETA_ACCESS_INVALID');

  const oversized = await postRaw(port, '/api/beta-access/verify', JSON.stringify({ code: 'x'.repeat(5000) }), headers('10.0.0.3'));
  assert.equal(oversized.status, 401);
  assert.equal(oversized.body.error.code, 'BETA_ACCESS_INVALID');

  const liveStore = createBetaAccessStore({ dbPath });
  liveStore.revokeCode(code.record.id);
  liveStore.close();
  const revoked = await get(port, '/internal/beta-session/validate', {
    Cookie: cookiePair(apiCookie),
    'X-Framespark-Original-URI': '/api/diagnosis/'
  });
  assert.equal(revoked.status, 401);
  assert.equal(providerRequests, 0);
  assert.equal(output.includes(code.code), false);

  console.log('Beta access HTTP tests passed: strict origin, cookies, scoped validation, generic errors, revocation, zero provider calls');
} finally {
  child.kill('SIGTERM');
  await Promise.race([onceExit(child), delay(1000)]);
  provider.close();
  await fs.rm(root, { recursive: true, force: true });
}

function makeSettings(codeHmacKey, sessionHmacKey) {
  return {
    codeHmacKey,
    sessionHmacKey,
    sessionTtlMs: 24 * 60 * 60 * 1000,
    defaultExpiresDays: 7,
    defaultMaxUses: 5,
    maxCodeChars: 256,
    cookieSecure: true,
    originalUriHeader: 'x-framespark-original-uri',
    auditRetentionDays: 30,
    verifyLimits: { windowMs: 900000, ipWindowLimit: 5, ipDailyLimit: 20, globalWindowLimit: 30, globalDailyLimit: 100, cooldownMs: 2000 }
  };
}

function headers(ip) {
  return { Origin: 'https://framespark.cn', 'X-Forwarded-For': ip };
}

function postJson(port, pathname, body, extraHeaders) {
  return postRaw(port, pathname, JSON.stringify(body), extraHeaders);
}

function postRaw(port, pathname, raw, extraHeaders) {
  const payload = Buffer.from(raw);
  return request(port, pathname, 'POST', payload, {
    ...extraHeaders,
    'Content-Type': 'application/json',
    'Content-Length': String(payload.length)
  });
}

function get(port, pathname, requestHeaders) {
  return request(port, pathname, 'GET', null, requestHeaders);
}

function request(port, pathname, method, payload, requestHeaders) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathname, method, headers: requestHeaders }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let body = null;
        if (raw) {
          try { body = JSON.parse(raw); } catch { body = { raw }; }
        }
        resolve({ status: res.statusCode, body, headers: res.headers, cookies: res.headers['set-cookie'] || [] });
      });
    });
    req.on('error', reject);
    req.end(payload || undefined);
  });
}

function cookiePair(setCookie) {
  return setCookie.split(';')[0];
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
}

async function reservePort() {
  const server = http.createServer();
  await listen(server, 0);
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitForServer(processHandle, port) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (processHandle.exitCode !== null) throw new Error(`server exited: ${output}`);
    try {
      const response = await get(port, '/health', {});
      if (response.status === 200) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`server did not start: ${output}`);
}

function onceExit(processHandle) {
  if (processHandle.exitCode !== null) return Promise.resolve();
  return new Promise(resolve => processHandle.once('exit', resolve));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
