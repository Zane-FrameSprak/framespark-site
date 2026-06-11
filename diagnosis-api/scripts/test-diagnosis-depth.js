import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDiagnosisDepth } from '../src/routes/diagnosis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}

assertEqual(getDiagnosisDepth({ internalStage: 'basic' }), 'basic', 'basic internalStage');
assertEqual(getDiagnosisDepth({ internalStage: 'advanced' }), 'advanced', 'advanced internalStage');
assertEqual(getDiagnosisDepth({ diagnosisDepth: 'basic', internalStage: 'advanced' }), 'advanced', 'advanced internalStage precedence');
assertEqual(getDiagnosisDepth({ diagnosisDepth: 'advanced', internalStage: 'basic' }), 'advanced', 'advanced diagnosisDepth');
assertEqual(getDiagnosisDepth({ internalStage: 'mock' }), 'basic', 'mock defaults to basic');
assertEqual(getDiagnosisDepth(null), 'basic', 'missing result defaults to basic');

const pipelineSource = fs.readFileSync(path.join(ROOT, 'diagnosis-api/src/services/diagnosisPipeline.js'), 'utf8');
assertIncludes(pipelineSource, "diagnosisDepth: 'basic'", 'pipeline basic depth');
assertIncludes(pipelineSource, "diagnosisDepth: 'advanced'", 'pipeline advanced depth');

const publicDiagnosisSource = fs.readFileSync(path.join(ROOT, 'diagnosis/index.html'), 'utf8');
assertEqual(publicDiagnosisSource.includes('type="file"'), false, 'public diagnosis upload control');
assertEqual(publicDiagnosisSource.includes('diagnosis/app.js'), false, 'retired public diagnosis client');
assertEqual(publicDiagnosisSource.includes('/api/diagnosis'), false, 'public diagnosis API reference');

const betaAppSource = fs.readFileSync(path.join(ROOT, 'diagnosis-api/beta-site/app.js'), 'utf8');
assertIncludes(betaAppSource, "fetch('/api/diagnosis/'", 'protected beta API client');

console.log('diagnosis depth checks passed');
