import express from 'express';
import { appendAnalyticsEvent, validateEventPayload } from '../services/eventStore.js';

export const eventsRouter = express.Router();

eventsRouter.post('/event', async (req, res, next) => {
  try {
    const validation = validateEventPayload(req.body);
    if (!validation.ok) {
      res.status(400).json({
        ok: false,
        error: validation.error,
        message: validation.message
      });
      return;
    }

    const saved = await appendAnalyticsEvent(validation.event, req);
    res.json({
      ok: true,
      eventId: saved.eventId
    });
  } catch (err) {
    next(err);
  }
});
