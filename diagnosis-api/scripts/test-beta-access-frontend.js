import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const homeScriptPath = path.join(repoRoot, 'js', 'beta-access.js');
const betaScriptPath = path.join(repoRoot, 'diagnosis-api', 'beta-site', 'app.js');
const homeHtmlPath = path.join(repoRoot, 'index.html');

await assertRepositoryRootFiles();

const homeSource = await fs.readFile(homeScriptPath, 'utf8');
const betaSource = await fs.readFile(betaScriptPath, 'utf8');
const homeHtml = await fs.readFile(homeHtmlPath, 'utf8');

const homeSandbox = {};
homeSandbox.globalThis = homeSandbox;
vm.runInNewContext(homeSource, homeSandbox, { filename: homeScriptPath });
const homeClient = homeSandbox.FrameSparkBetaAccess;
assert.ok(homeClient);

await testPublicSessionRequest(homeClient);
await testRateLimitMessage(homeClient);
await testSubmissionLock(homeClient);
await testSuccessfulFixedNavigation(homeClient);
await testUnsafeSuccessAndNetworkFailure(homeClient);
testStaticPrivacyBoundaries();
testBetaSessionExpiryBehavior();

console.log('Beta access frontend tests passed: state machine, fixed navigation, session expiry, privacy boundaries, zero provider calls');

async function assertRepositoryRootFiles() {
  const requiredFiles = [homeScriptPath, betaScriptPath, homeHtmlPath];
  try {
    await Promise.all(requiredFiles.map(file => fs.access(file)));
  } catch {
    console.error('frontend test requires repository root; skip in diagnosis-api-only release');
    process.exit(1);
  }
}

async function testPublicSessionRequest(client) {
  const calls = [];
  const fixture = createFixture({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response(200, { ok: true, redirectTo: '/diagnosis/beta/' });
    }
  });
  client.createController(fixture.options);
  assert.equal(fixture.button.attributes['aria-disabled'], 'false');
  await fixture.form.emit('submit');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/beta-access/public-session');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.deepEqual(JSON.parse(calls[0].options.body), {});
  assert.deepEqual(fixture.navigations, ['/diagnosis/beta/']);
}

async function testRateLimitMessage(client) {
  const rateFixture = createFixture({
    fetchImpl: async () => response(429, { ok: false, error: { code: 'BETA_ACCESS_RATE_LIMITED' } })
  });
  const rateController = client.createController(rateFixture.options);
  await rateController.submit(event());
  assert.equal(rateFixture.status.textContent, '今日公测名额已满，请明天再试');
}

async function testSubmissionLock(client) {
  let fetchCount = 0;
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const fixture = createFixture({
    fetchImpl: async () => {
      fetchCount += 1;
      return pending;
    }
  });
  const controller = client.createController(fixture.options);
  const first = controller.submit(event());
  const duplicate = controller.submit(event());
  assert.equal(fetchCount, 1);
  assert.equal(fixture.button.textContent, '进入中...');
  release(response(401, { ok: false, error: { code: 'BETA_ACCESS_INVALID' } }));
  await Promise.all([first, duplicate]);
  assert.equal(fetchCount, 1);
}

async function testSuccessfulFixedNavigation(client) {
  const fixture = createFixture({
    fetchImpl: async () => response(200, { ok: true, redirectTo: '/diagnosis/beta/' })
  });
  const controller = client.createController(fixture.options);
  await controller.submit(event());
  assert.deepEqual(fixture.navigations, ['/diagnosis/beta/']);
  assert.equal(fixture.button.dataset.state, 'navigating');
  assert.equal(controller.isSubmitting(), true);
}

async function testUnsafeSuccessAndNetworkFailure(client) {
  const unsafe = createFixture({
    fetchImpl: async () => response(200, { ok: true, redirectTo: 'https://example.invalid/' })
  });
  await client.createController(unsafe.options).submit(event());
  assert.equal(unsafe.navigations.length, 0);
  assert.equal(unsafe.status.textContent, '暂时无法验证，请稍后重试');

  const network = createFixture({
    fetchImpl: async () => { throw new Error('network'); }
  });
  await client.createController(network.options).submit(event());
  assert.equal(network.status.textContent, '暂时无法验证，请稍后重试');
  assert.equal(network.navigations.length, 0);
}

function testStaticPrivacyBoundaries() {
  assert.match(homeHtml, /id="diagnosis-beta-entry"/);
  assert.match(homeHtml, /公测入口/);
  assert.match(homeHtml, /进入公测/);
  assert.doesNotMatch(homeHtml, /diagnosisBetaCode/);
  assert.doesNotMatch(homeHtml, /邀请码|内测码/);
  assert.doesNotMatch(homeHtml, /<button type="submit"[^>]*\sdisabled(?:\s|=|>)/i);
  for (const forbidden of ['localStorage', 'sessionStorage', 'document.cookie', 'FrameSparkAnalytics', 'console.']) {
    assert.equal(homeSource.includes(forbidden), false, `frontend source contains ${forbidden}`);
  }
  assert.equal(homeSource.includes("JSON.stringify({ code: code })"), false);
  assert.equal(homeSource.includes('/api/beta-access/public-session'), true);
  assert.equal(homeSource.includes('location.assign(path)'), true);
}

function testBetaSessionExpiryBehavior() {
  const betaSandbox = {
    window: {
      document: { getElementById() { return null; } }
    }
  };
  vm.runInNewContext(betaSource, betaSandbox, { filename: betaScriptPath });
  const betaClient = betaSandbox.window.FrameSparkDiagnosisBetaClient;
  assert.equal(betaClient.isAccessExpiredResponse(
    { status: 401 },
    { error: { code: 'BETA_ACCESS_REQUIRED' } }
  ), true);
  assert.equal(betaClient.isAccessExpiredResponse(
    { status: 401 },
    { error: { code: 'BETA_ACCESS_INVALID' } }
  ), false);
  assert.equal(betaClient.isAccessExpiredResponse(
    { status: 429 },
    { error: { code: 'RATE_LIMIT_EXCEEDED' } }
  ), false);
  assert.equal(betaClient.isAccessExpiredResponse({ status: 401 }, null), false);

  const state = {
    form: { resetCalled: false, reset() { this.resetCalled = true; } },
    textInput: { value: 'temporary text' },
    fileInput: { value: 'temporary-file' },
    fileName: { textContent: 'sample.txt' },
    progress: { hidden: false },
    status: { textContent: 'working', dataset: { state: 'loading' } },
    result: { innerHTML: '<p>temporary result</p>' },
    emptyResultHtml: '<p>empty</p>',
    location: { target: '', replace(value) { this.target = value; } }
  };
  betaClient.clearExpiredAccess(state);
  assert.equal(state.form.resetCalled, true);
  assert.equal(state.textInput.value, '');
  assert.equal(state.fileInput.value, '');
  assert.equal(state.fileName.textContent, '未选择文件');
  assert.equal(state.progress.hidden, true);
  assert.equal(state.status.textContent, '');
  assert.equal(state.result.innerHTML, '<p>empty</p>');
  assert.equal(state.location.target, '/#diagnosis-beta-entry');
}

function createFixture({ fetchImpl }) {
  const form = element();
  const button = element();
  const status = element();
  button.textContent = '进入公测';
  const navigations = [];
  return {
    form,
    button,
    status,
    navigations,
    options: {
      form,
      button,
      status,
      fetchImpl,
      navigate(pathname) { navigations.push(pathname); }
    }
  };
}

function element() {
  const listeners = new Map();
  return {
    value: '',
    textContent: '',
    readOnly: false,
    dataset: {},
    attributes: {},
    addEventListener(type, handler) { listeners.set(type, handler); },
    emit(type, eventValue = event()) { return listeners.get(type)?.(eventValue); },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name]; }
  };
}

function response(status, payload) {
  return {
    status,
    async json() { return payload; }
  };
}

function event() {
  return { preventDefault() {} };
}
