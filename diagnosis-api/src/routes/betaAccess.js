import express from 'express';
import { BETA_IDENTITY_HEADER, betaIdentityForSession } from '../services/betaAccessService.js';

export function createBetaAccessRouters(options) {
  const service = options.service;
  const settings = options.settings;
  const allowedOrigins = new Set(options.allowedOrigins || []);
  const enableCodeVerify = options.enableCodeVerify !== false;
  const enablePublicSession = options.enablePublicSession === true;
  const verifyRouter = express.Router();
  const internalRouter = express.Router();
  const jsonParser = express.json({ limit: '4kb', strict: true });
  const publicJsonParser = express.json({ limit: '1kb', strict: true });

  if (enableCodeVerify) {
    verifyRouter.post('/verify', strictOrigin(allowedOrigins), parseVerifyJson(jsonParser, service), async (req, res, next) => {
      try {
        const result = await service.verifyCode({ code: req.body?.code, clientIp: req.ip });
        for (const cookie of result.cookies) res.append('Set-Cookie', cookie);
        res.status(200).json({ ok: true, redirectTo: '/diagnosis/beta/' });
      } catch (error) {
        next(error);
      }
    });
  }

  if (enablePublicSession) {
    verifyRouter.post('/public-session', strictOrigin(allowedOrigins), parseVerifyJson(publicJsonParser, service), async (req, res, next) => {
      try {
        const result = await service.issuePublicSession({
          clientIp: req.ip,
          userAgent: req.get('user-agent')
        });
        for (const cookie of result.cookies) res.append('Set-Cookie', cookie);
        res.status(200).json({ ok: true, redirectTo: '/diagnosis/beta/' });
      } catch (error) {
        next(error);
      }
    });
  }

  internalRouter.get('/validate', (req, res) => {
    if (!isLoopback(req.socket?.remoteAddress)) {
      res.status(404).end();
      return;
    }
    const originalUri = req.get(settings.originalUriHeader);
    const session = service.validateRequest({
      originalUri,
      cookieHeader: req.get('cookie')
    });
    if (!session) {
      res.status(401).end();
      return;
    }
    res.set(BETA_IDENTITY_HEADER, betaIdentityForSession(session.identityId));
    res.status(204).end();
  });

  return { verifyRouter, internalRouter };
}

function strictOrigin(allowedOrigins) {
  return function betaAccessOriginGuard(req, res, next) {
    const origin = String(req.get('origin') || '').trim();
    if (origin && allowedOrigins.has(origin)) {
      next();
      return;
    }
    res.status(403).json({
      ok: false,
      error: { code: 'ORIGIN_NOT_ALLOWED', message: '当前请求来源不允许使用诊断公测。' }
    });
  };
}

function parseVerifyJson(parser, service) {
  return function betaAccessJsonParser(req, res, next) {
    parser(req, res, error => {
      if (!error) {
        next();
        return;
      }
      try {
        service.rejectInvalidInput(req.ip);
      } catch (accessError) {
        next(accessError);
      }
    });
  };
}

function isLoopback(value) {
  const address = String(value || '');
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}
