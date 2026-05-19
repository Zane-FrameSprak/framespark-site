import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { diagnosisRouter } from './routes/diagnosis.js';
import { feedbackRouter } from './routes/feedback.js';
import { hasAiProvider } from './services/aiClient.js';
import { ApiError } from './utils/errors.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'framespark-diagnosis-api',
    mode: hasAiProvider() ? 'ai' : 'mock',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/diagnosis', diagnosisRouter);
app.use('/api/diagnosis-feedback', feedbackRouter);

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
  if (err instanceof ApiError) {
    res.status(err.status).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message
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

  console.error(err);
  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '系统暂时无法完成诊断，请稍后再试。'
    }
  });
});

app.listen(config.port, config.host, () => {
  console.log(`FrameSpark diagnosis API listening on http://${config.host}:${config.port}`);
});
