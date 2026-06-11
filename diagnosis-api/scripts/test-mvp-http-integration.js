import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'framespark-http-'));
const provider = http.createServer((req, res) => {
  req.resume();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ choices: [{ message: { content: 'not valid JSON' } }] }));
});
await listen(provider, 0);

const providerPort = provider.address().port;
const appPort = await reservePort();
const child = spawn(process.execPath, ['src/server.js'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: String(appPort),
    DIAGNOSIS_DATA_DIR: dataDir,
    DEEPSEEK_API_KEY: 'test-only-placeholder',
    DEEPSEEK_BASE_URL: `http://127.0.0.1:${providerPort}`,
    ENABLE_DIAGNOSIS_V1: 'true',
    ENABLE_V1_STAGED_RUNNER: 'true',
    ENABLE_V1_REAL_PROMPTS: 'true',
    FAIL_CLOSED_ON_V1_ERROR: 'true',
    REQUIRE_BETA_IDENTITY: 'true',
    ENABLE_DEV_TOOLS: 'false',
    ALLOWED_ORIGINS: 'https://framespark.cn',
    DIAGNOSIS_ACCOUNT_DAILY_LIMIT: '1',
    DIAGNOSIS_IP_DAILY_LIMIT: '20',
    DIAGNOSIS_GLOBAL_DAILY_LIMIT: '20',
    PROVIDER_GLOBAL_DAILY_LIMIT: '20',
    DIAGNOSIS_CONCURRENCY_LIMIT: '2',
    AI_TIMEOUT_MS: '2000',
    REQUEST_TIMEOUT_MS: '5000'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let childOutput = '';
child.stdout.on('data', chunk => { childOutput += chunk; });
child.stderr.on('data', chunk => { childOutput += chunk; });

try {
  await waitForServer(child, appPort);

  const missingIdentity = await jsonRequest(appPort, '/api/diagnosis/', makeJsonBody(nonStoryText()), {
    Origin: 'https://framespark.cn'
  });
  assert.equal(missingIdentity.status, 401);
  assert.equal(missingIdentity.body.error.code, 'BETA_ACCESS_REQUIRED');

  const badOrigin = await jsonRequest(appPort, '/api/diagnosis/', makeJsonBody(nonStoryText()), {
    Origin: 'https://example.invalid',
    'X-Framespark-Beta-User': 'origin-test'
  });
  assert.equal(badOrigin.status, 403);
  assert.equal(badOrigin.body.error.code, 'ORIGIN_NOT_ALLOWED');

  const success = await jsonRequest(appPort, '/api/diagnosis/', makeJsonBody(nonStoryText()), betaHeaders('dto-test'));
  assert.equal(success.status, 200);
  assert.equal(success.body.ok, true);
  const publicJson = JSON.stringify(success.body);
  for (const field of ['stageReached', 'promptVersion', 'model', 'fallback', 'latency', 'jsonRetry', 'reportV1', 'diagnosisEngine']) {
    assert.equal(publicJson.includes(field), false, `public DTO leaked ${field}`);
  }

  const limited = await jsonRequest(appPort, '/api/diagnosis/', makeJsonBody(nonStoryText()), betaHeaders('dto-test'));
  assert.equal(limited.status, 429);
  assert.equal(limited.body.error.code, 'RATE_LIMIT_EXCEEDED');

  const invalidUpload = await multipartRequest(appPort, betaHeaders('upload-test'));
  assert.equal(invalidUpload.status, 400);
  assert.equal(invalidUpload.body.error.code, 'FILE_TYPE_MISMATCH');

  const failClosed = await jsonRequest(appPort, '/api/diagnosis/', makeJsonBody(storyText()), betaHeaders('fail-closed-test'));
  assert.equal(failClosed.status, 503);
  assert.equal(failClosed.body.error.code, 'V1_DIAGNOSIS_FAILED');
  assert.equal(JSON.stringify(failClosed.body).includes('legacy'), false);

  console.log('MVP HTTP integration tests passed: auth/origin, public DTO, rate limit, upload validation, fail-closed');
} finally {
  child.kill('SIGTERM');
  await Promise.race([onceExit(child), delay(1000)]);
  provider.close();
  await fs.rm(dataDir, { recursive: true, force: true });
}

function makeJsonBody(text) {
  return { materialType: 'other', inputMode: 'pasted_text', text };
}

function betaHeaders(identity) {
  return { Origin: 'https://framespark.cn', 'X-Framespark-Beta-User': identity };
}

function nonStoryText() {
  return '产品价格清单、付款周期、发票说明和服务条款。'.repeat(12);
}

function storyText() {
  return '一个年轻导演回到故乡寻找母亲留下的旧胶片。她发现旧剧组隐瞒了事故真相，必须决定是否公开影像，并承担家庭关系破裂的代价。'.repeat(8);
}

async function jsonRequest(port, pathname, body, headers = {}) {
  const payload = Buffer.from(JSON.stringify(body));
  return request(port, pathname, payload, {
    ...headers,
    'Content-Type': 'application/json',
    'Content-Length': String(payload.length)
  });
}

async function multipartRequest(port, headers) {
  const boundary = '----framespark-mvp-test';
  const payload = Buffer.from([
    `--${boundary}\r\nContent-Disposition: form-data; name="materialType"\r\n\r\nother\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="story.docx"\r\nContent-Type: application/pdf\r\n\r\n`,
    'not-a-docx\r\n',
    `--${boundary}--\r\n`
  ].join(''));
  return request(port, '/api/diagnosis/', payload, {
    ...headers,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': String(payload.length)
  });
}

function request(port, pathname, payload, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathname, method: 'POST', headers }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let body;
        try { body = JSON.parse(raw); } catch { body = { raw }; }
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
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
    if (processHandle.exitCode !== null) throw new Error(`diagnosis server exited early: ${childOutput}`);
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get({ host: '127.0.0.1', port, path: '/health' }, resolve);
        req.on('error', reject);
      });
      response.resume();
      if (response.statusCode === 200) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`diagnosis server did not start: ${childOutput}`);
}

function onceExit(processHandle) {
  if (processHandle.exitCode !== null) return Promise.resolve();
  return new Promise(resolve => processHandle.once('exit', resolve));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
