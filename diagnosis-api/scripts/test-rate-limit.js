/**
 * 诊断接口限流中间件测试
 *
 * 不启动服务，不调用真实 AI，只验证内存限流行为和 server 挂载顺序。
 */

import fs from 'fs';
import { createDailyRateLimit } from '../src/middleware/rateLimit.js';

const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  bold:   '\x1b[1m'
};
const ok = `${c.green}✓${c.reset}`;
const fail = `${c.red}✗${c.reset}`;

const cases = [
  {
    name: '/api/diagnosis 超限后返回 429',
    run() {
      const middleware = createDailyRateLimit({
        limit: 2,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: '今日诊断次数已达上限，请明天再试。',
        now: () => new Date('2026-05-21T00:00:00.000Z')
      });

      const first = callMiddleware(middleware);
      const second = callMiddleware(middleware);
      const third = callMiddleware(middleware);

      assertEqual(first.nextCalled, true, 'first.nextCalled');
      assertEqual(second.nextCalled, true, 'second.nextCalled');
      assertEqual(third.statusCode, 429, 'third.statusCode');
      assertEqual(third.body.error, 'RATE_LIMIT_EXCEEDED', 'third.body.error');
      assertEqual(third.body.message, '今日诊断次数已达上限，请明天再试。', 'third.body.message');
    }
  },
  {
    name: '/api/diagnosis-feedback 超限后返回 429',
    run() {
      const middleware = createDailyRateLimit({
        limit: 1,
        errorCode: 'FEEDBACK_RATE_LIMIT_EXCEEDED',
        message: '今日反馈提交次数已达上限，请稍后再试。',
        now: () => new Date('2026-05-21T00:00:00.000Z')
      });

      const first = callMiddleware(middleware);
      const second = callMiddleware(middleware);

      assertEqual(first.nextCalled, true, 'first.nextCalled');
      assertEqual(second.statusCode, 429, 'second.statusCode');
      assertEqual(second.body.error, 'FEEDBACK_RATE_LIMIT_EXCEEDED', 'second.body.error');
      assertEqual(second.body.message, '今日反馈提交次数已达上限，请稍后再试。', 'second.body.message');
    }
  },
  {
    name: '不同 IP 分开计数',
    run() {
      const middleware = createDailyRateLimit({
        limit: 1,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: '今日诊断次数已达上限，请明天再试。',
        now: () => new Date('2026-05-21T00:00:00.000Z')
      });

      const first = callMiddleware(middleware, { ip: '127.0.0.1' });
      const second = callMiddleware(middleware, { ip: '127.0.0.2' });

      assertEqual(first.nextCalled, true, 'first.nextCalled');
      assertEqual(second.nextCalled, true, 'second.nextCalled');
    }
  },
  {
    name: '跨日期自动重新计数',
    run() {
      let currentDate = '2026-05-21T00:00:00.000Z';
      const middleware = createDailyRateLimit({
        limit: 1,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: '今日诊断次数已达上限，请明天再试。',
        now: () => new Date(currentDate)
      });

      const first = callMiddleware(middleware);
      const blocked = callMiddleware(middleware);
      currentDate = '2026-05-22T00:00:00.000Z';
      const nextDay = callMiddleware(middleware);

      assertEqual(first.nextCalled, true, 'first.nextCalled');
      assertEqual(blocked.statusCode, 429, 'blocked.statusCode');
      assertEqual(nextDay.nextCalled, true, 'nextDay.nextCalled');
    }
  },
  {
    name: 'health check 不受限流影响',
    run() {
      const serverSource = fs.readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
      const healthIndex = serverSource.indexOf("app.get('/health'");
      const diagnosisLimitIndex = serverSource.indexOf("app.use(\n  '/api/diagnosis'");
      assertTruthy(healthIndex >= 0, 'health route exists');
      assertTruthy(diagnosisLimitIndex >= 0, 'diagnosis route exists');
      assertTruthy(healthIndex < diagnosisLimitIndex, 'health route registered before diagnosis rate limit');
    }
  }
];

let failed = 0;

for (const testCase of cases) {
  try {
    testCase.run();
    console.log(`${ok} ${c.bold}${testCase.name}${c.reset}`);
  } catch (err) {
    failed += 1;
    console.log(`${fail} ${c.bold}${testCase.name}${c.reset}`);
    console.log(`   ${c.red}${err.message}${c.reset}`);
  }
}

if (failed > 0) {
  console.log(`\n${fail} rate limit 测试失败：${failed}/${cases.length}\n`);
  process.exit(1);
}

console.log(`\n${ok} rate limit 测试通过：${cases.length}/${cases.length}\n`);

function callMiddleware(middleware, overrides = {}) {
  const result = {
    nextCalled: false,
    statusCode: null,
    body: null
  };
  const req = {
    headers: overrides.headers || {},
    ip: overrides.ip || '127.0.0.1',
    socket: { remoteAddress: overrides.remoteAddress || '127.0.0.1' }
  };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    }
  };
  middleware(req, res, function next() {
    result.nextCalled = true;
  });
  return result;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`);
  }
}

function assertTruthy(value, label) {
  if (!value) {
    throw new Error(`${label} expected truthy value`);
  }
}
