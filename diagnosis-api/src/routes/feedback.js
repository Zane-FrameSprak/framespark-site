import express from 'express';
import {
  logDiagnosisFeedback,
  validateFeedbackPayload
} from '../services/diagnosisFeedbackLogger.js';
import { ApiError } from '../utils/errors.js';

export const feedbackRouter = express.Router();

feedbackRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const validation = validateFeedbackPayload(body);
    if (!validation.ok) {
      throw new ApiError(400, validation.code, validation.message);
    }

    let logResult = null;
    try {
      logResult = await logDiagnosisFeedback(body);
    } catch (err) {
      console.warn('[diagnosis-feedback] failed to write feedback log:', err.code || err.name || 'UNKNOWN');
    }

    res.json({
      ok: true,
      feedbackId: logResult?.id || null,
      saved: Boolean(logResult)
    });
  } catch (err) {
    next(err);
  }
});
