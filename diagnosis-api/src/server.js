import cors from 'cors';
import express from 'express';
import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { pathToFileURL } from 'url';
import { config } from './config.js';
import { createOriginGuard, requireBetaIdentity } from './middleware/betaAccess.js';
import {
  createConcurrencyLimit,
  createDailyRateLimit,
  getBetaIdentityKey,
  getClientIpKey,
  getGlobalKey
} from './middleware/rateLimit.js';
import { createRequestDeadline } from './middleware/requestDeadline.js';
import { diagnosisRouter } from './routes/diagnosis.js';
import { devSampleRunsRouter } from './routes/devSampleRuns.js';
import { feedbackRouter } from './routes/feedback.js';
import { createBetaAccessRouters } from './routes/betaAccess.js';
import { hasAiProvider } from './services/aiClient.js';
import { cleanupExpiredFeedback } from './services/diagnosisFeedbackLogger.js';
import { cleanupExpiredDiagnosisData } from './services/diagnosisLogger.js';
import { getPublicError } from './services/publicErrors.js';
import { createBetaAccessService } from './services/betaAccessService.js';
import { createBetaAccessStore } from './services/betaAccessStore.js';
import { assertProductionReady, getProductionReadiness } from './services/productionReadiness.js';
import { ApiError } from './utils/errors.js';

export function createApp(options = {}) {
  const app = express();
  const originGuard = createOriginGuard();

  app.set('trust proxy', config.trustedProxy);
  app.disable('x-powered-by');
  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || config.allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS']
  }));
  if (config.enableBetaCodeAccess || options.betaAccessService) {
    const store = options.betaAccessStore || (options.betaAccessService ? null : createBetaAccessStore({ dbPath: config.betaAccess.dbPath }));
    store?.cleanup({ auditRetentionDays: config.betaAccess.auditRetentionDays });
    const service = options.betaAccessService || createBetaAccessService({ store, settings: config.betaAccess });
    const routers = createBetaAccessRouters({
      service,
      settings: config.betaAccess,
      allowedOrigins: config.allowedOrigins
    });
    app.use('/api/beta-access', routers.verifyRouter);
    app.use('/internal/beta-session', routers.internalRouter);
  }

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (req, res) => {
    res.json({
      ok: true,
      service: 'framespark-diagnosis-api'
    });
  });

  app.get('/ready', async (req, res) => {
    const readiness = config.isProduction
      ? getProductionReadiness()
      : { ok: hasAiProvider() || !config.isProduction, errors: [] };
    if (readiness.ok && config.isProduction) {
      try {
        await fs.access(config.dataDir, fsConstants.R_OK | fsConstants.W_OK);
      } catch {
        readiness.ok = false;
        readiness.errors.push('DATA_DIR_NOT_ACCESSIBLE');
      }
    }
    res.status(readiness.ok ? 200 : 503).json({
      ok: readiness.ok,
      service: 'framespark-diagnosis-api',
      checks: readiness.ok ? [] : readiness.errors
    });
  });

  app.use(
    '/api/diagnosis',
    originGuard,
    requireBetaIdentity,
    createRequestDeadline(config.requestTimeoutMs),
    createDailyRateLimit({
      limit: config.rateLimits.globalDailyLimit,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: '今日内测总次数已达上限。',
      keyFn: getGlobalKey
    }),
    createDailyRateLimit({
      limit: config.rateLimits.accountDailyLimit,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: '当前内测账号今日次数已达上限。',
      keyFn: getBetaIdentityKey
    }),
    createDailyRateLimit({
      limit: config.rateLimits.ipDailyLimit,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: '当前网络今日次数已达上限。',
      keyFn: getClientIpKey
    }),
    createConcurrencyLimit({ limit: config.rateLimits.concurrencyLimit }),
    diagnosisRouter
  );
  app.use(
    '/api/diagnosis-feedback',
    originGuard,
    requireBetaIdentity,
    createDailyRateLimit({
      limit: config.rateLimits.feedbackDailyLimit,
      errorCode: 'FEEDBACK_RATE_LIMIT_EXCEEDED',
      message: '今日反馈提交次数已达上限，请稍后再试。',
      keyFn: getBetaIdentityKey
    }),
    feedbackRouter
  );

  if (config.enableDevTools) {
    app.use('/api/dev/sample-runs', devSampleRunsRouter);
  }

  app.use((req, res) => {
    res.status(404).json({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: '接口不存在'
      }
    });
  });

  app.use((err, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    if (err instanceof ApiError) {
      const publicError = getPublicError(err);
      res.status(publicError.status).json({
        ok: false,
        error: {
          code: publicError.code,
          message: publicError.message
        }
      });
      return;
    }

    if (err && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        ok: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: '文件过大，请上传更小的文本材料。'
        }
      });
      return;
    }

    if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        ok: false,
        error: {
          code: 'UNSUPPORTED_FILE_TYPE',
          message: '当前仅支持单个 TXT 或 DOCX 文件。'
        }
      });
      return;
    }

    console.error('[diagnosis-api] unhandled error:', err?.code || err?.name || 'UNKNOWN');
    res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '系统暂时无法完成诊断，请稍后再试。'
      }
    });
  });

  return app;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const runRetentionCleanup = async () => {
    await Promise.all([
      cleanupExpiredDiagnosisData(),
      cleanupExpiredFeedback()
    ]);
  };
  const start = async () => {
    if (config.isProduction) assertProductionReady();
    await fs.mkdir(config.dataDir, { recursive: true, mode: 0o700 });
    await fs.access(config.dataDir, fsConstants.R_OK | fsConstants.W_OK);
    await runRetentionCleanup();
    setInterval(() => {
      runRetentionCleanup().catch(error => {
        console.warn('[diagnosis-api] retention cleanup failed:', error.code || error.name || 'UNKNOWN');
      });
    }, 24 * 60 * 60 * 1000).unref();
    const app = createApp();
    app.listen(config.port, config.host, () => {
      console.log(`FrameSpark diagnosis API listening on http://${config.host}:${config.port}`);
    });
  };

  start().catch(error => {
    console.error('[diagnosis-api] startup failed:', error.code || error.name || 'UNKNOWN');
    process.exitCode = 1;
  });
}
