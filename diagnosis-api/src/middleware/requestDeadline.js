export function createRequestDeadline(timeoutMs) {
  return function requestDeadline(req, res, next) {
    const controller = new AbortController();
    req.diagnosisSignal = controller.signal;

    const timer = setTimeout(() => {
      controller.abort();
      if (!res.headersSent) {
        res.status(504).json({
          ok: false,
          error: {
            code: 'AI_REQUEST_TIMEOUT',
            message: '诊断处理超时，本次未生成报告，请稍后再试。'
          }
        });
      }
    }, timeoutMs);

    const cleanup = () => clearTimeout(timer);
    res.once('finish', cleanup);
    res.once('close', cleanup);
    next();
  };
}
